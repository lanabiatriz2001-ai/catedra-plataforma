/* ==========================================================================
   auditar-provas.mjs — auditoria de qualidade dos textos extraídos das provas
   discursivas (enunciados e espelhos publicados em discursivas-completo.js e
   discursivas-textos.js).

   Por quê: a extração crua dos PDFs das bancas publica, em parte das provas,
   a página de INSTRUÇÕES do caderno no lugar do enunciado, cabeçalho/rodapé
   de página repetido no meio do texto, ou quase nada (PDF escaneado). Texto
   errado é pior que texto ausente: quem treina em cima confia nele.

   O que faz: aplica heurísticas de deformação a cada texto e imprime o
   resumo; com --md <arquivo> grava o relatório em markdown com os ids
   reprovados por sintoma (a lista de reprocessamento). Com --portao, sai
   com código 1 se houver QUALQUER reprovado — para o dia em que a extração
   for corrigida, o CI passa a barrar regressão de qualidade.

   Rode com:  node scripts/auditar-provas.mjs [--md docs/auditoria-provas.md] [--portao]
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { audita, juntaEspelho } from './qualidade-texto.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const MD = args.includes('--md') ? args[args.indexOf('--md') + 1] : null;
const PORTAO = args.includes('--portao');

// carrega um arquivo `window.X = {...}` sem navegador
function carregaGlobal(arquivo) {
  const src = fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');
  const w = {};
  new Function('window', src)(w);
  const nomes = Object.keys(w);
  if (!nomes.length) throw new Error(arquivo + ' não definiu nenhum global window.*');
  return w[nomes[0]];
}

/* ---------- as heurísticas moram em qualidade-texto.mjs ----------
   O build que PUBLICA o texto (build-provas-conteudo.mjs) usa o mesmo módulo, para que
   a régua de publicar e a régua de auditar não possam divergir. ------------------- */

/* ---------- roda sobre os dois acervos publicados ---------- */

const DISC = carregaGlobal(fs.existsSync(path.join(RAIZ, 'discursivas-completo.js'))
  ? 'discursivas-completo.js' : 'discursivas.js');
const TEXTOS = carregaGlobal('discursivas-textos.js');

const porSintoma = {};                      // sintoma -> [{id, campo}]
const marca = (sintomas, id, campo) => sintomas.forEach(s => {
  (porSintoma[s] = porSintoma[s] || []).push({ id, campo });
});

let totalEn = 0, totalEsp = 0, reprovadosEn = 0, reprovadosEsp = 0;
const idsReprovados = new Set();

const espelhoEmProsa = new Map();       // id -> padrão de resposta em prosa (campo `et`)
for (const [id, item] of Object.entries(TEXTOS)) {
  if (item.et) espelhoEmProsa.set(id, item.et);
  if (item.en == null) continue;        // registro só de espelho em prosa
  totalEn++;
  const p = audita(item.en);
  if (p.length) { reprovadosEn++; idsReprovados.add(id); marca(p, id, 'enunciado'); }
}
const lista = Array.isArray(DISC) ? DISC : Object.values(DISC);
let semEspelho = 0;
for (const item of lista) {
  // O espelho vive em três formas: quesitos estruturados, prosa no próprio registro
  // (espelhoTexto) ou prosa no arquivo de textões (`et`). As três são espelho.
  const esp = juntaEspelho(item.espelho ?? item.esp)
    || String(item.espelhoTexto || '').trim()
    || String(espelhoEmProsa.get(item.id) || '').trim();
  // Espelho AUSENTE é outra doença (falta extrair/publicar) — conta à parte, não
  // como deformação. Deformação é texto presente e errado.
  if (!esp) { semEspelho++; continue; }
  totalEsp++;
  const p = audita(esp);
  if (p.length) { reprovadosEsp++; idsReprovados.add(item.id); marca(p, item.id, 'espelho'); }
}

/* ---------- prova oral (999 perguntas + padrões de resposta) ---------- */

const ORAL = carregaGlobal('oral-conteudo.js');
let totalOralQ = 0, reprovadosOralQ = 0, totalOralP = 0, reprovadosOralP = 0, semPadrao = 0;
for (const item of Object.values(ORAL)) {
  totalOralQ++;
  // pergunta de oral é curta por natureza: o limiar de "curto" cai para 40
  const pq = audita(item.enunciado, { minChars: 40 });
  if (pq.length) { reprovadosOralQ++; idsReprovados.add('oral:' + item.id); marca(pq, 'oral:' + item.id, 'pergunta'); }
  const padrao = String(item.padrao || '').trim();
  if (!padrao) { semPadrao++; continue; }
  totalOralP++;
  const pp = audita(padrao, { minChars: 80 });
  if (pp.length) { reprovadosOralP++; idsReprovados.add('oral:' + item.id); marca(pp, 'oral:' + item.id, 'padrao-de-resposta'); }
}

/* ---------- simulado: questões objetivas de prova real ---------- */

const QUESTOES = carregaGlobal('questoes-prova.js');
const qLista = Array.isArray(QUESTOES) ? QUESTOES : Object.values(QUESTOES);
let totalQ = 0, reprovadosQ = 0;
for (const q of qLista) {
  totalQ++;
  // Em questão objetiva o enunciado pode ser um caule curto que as alternativas
  // completam ("É nulo o casamento contraído…") — o comprimento conta o conjunto.
  const alternativasTxt = (Array.isArray(q.alternativas) ? q.alternativas : [])
    .map(a => String(a.texto || '')).join('\n');
  const probs = audita(String(q.enunciado || '') + '\n' + alternativasTxt, { minChars: 60 });
  // estrutura da questão: sem isso a questão não é respondível, ainda que o texto pareça são
  const alts = Array.isArray(q.alternativas) ? q.alternativas : [];
  if (alts.length < 2) probs.push('sem-alternativas');
  else if (alts.some(a => !String(a.texto || '').trim())) probs.push('alternativa-vazia');
  const letras = alts.map(a => String(a.letra || '').toUpperCase());
  if (q.gabarito != null && String(q.gabarito).trim() && !letras.includes(String(q.gabarito).toUpperCase()))
    probs.push('gabarito-sem-alternativa');
  if (probs.length) { reprovadosQ++; idsReprovados.add('questao:' + q.id); marca(probs, 'questao:' + q.id, 'questao-objetiva'); }
}

/* ---------- saída ---------- */

console.log(`Discursivas — enunciados: ${totalEn} · reprovados: ${reprovadosEn}`);
console.log(`Discursivas — espelhos:   ${totalEsp} · reprovados: ${reprovadosEsp} · sem espelho: ${semEspelho}`);
console.log(`Prova oral — perguntas:   ${totalOralQ} · reprovadas: ${reprovadosOralQ}`);
console.log(`Prova oral — padrões:     ${totalOralP} · reprovados: ${reprovadosOralP} · sem padrão: ${semPadrao}`);
console.log(`Simulado — questões:      ${totalQ} · reprovadas: ${reprovadosQ}`);
for (const [s, itens] of Object.entries(porSintoma).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${s}: ${itens.length}`);
}

if (MD) {
  const linhas = [];
  linhas.push('# Auditoria dos textos de prova (discursivas e espelhos)');
  linhas.push('');
  linhas.push('Gerado por `node scripts/auditar-provas.mjs --md ' + MD + '`. Cada id abaixo tem');
  linhas.push('texto publicado com defeito detectável e precisa ser **reprocessado a partir do');
  linhas.push('PDF original** (ou rebaixado para "somente link" até lá — texto errado é pior');
  linhas.push('que ausente).');
  linhas.push('');
  linhas.push(`- Discursivas — enunciados: **${totalEn}**, reprovados: **${reprovadosEn}**`);
  linhas.push(`- Discursivas — espelhos: **${totalEsp}**, reprovados: **${reprovadosEsp}**`);
  linhas.push(`- Provas **sem espelho nenhum**: **${semEspelho}** — doença separada: falta extrair`);
  linhas.push('  dos PDFs de espelho (ou a banca não publicou; nesse caso, dizer isso na tela).');
  linhas.push(`- Prova oral — perguntas: **${totalOralQ}**, reprovadas: **${reprovadosOralQ}**`);
  linhas.push(`- Prova oral — padrões de resposta: **${totalOralP}**, reprovados: **${reprovadosOralP}**; **${semPadrao}** perguntas sem padrão`);
  linhas.push(`- Simulado — questões objetivas: **${totalQ}**, reprovadas: **${reprovadosQ}**`);
  linhas.push('');
  linhas.push('## Receita de correção (no build-provas-conteudo.mjs, onde estão os PDFs)');
  linhas.push('');
  linhas.push('1. **Cortar a capa/instruções**: descartar tudo antes do primeiro marcador real');
  linhas.push('   da prova (ex.: "Sentença", "QUESTÃO", "Considerando a situação hipotética"),');
  linhas.push('   e qualquer página que case com "NÃO SERÁ PERMITIDO / INFORMAÇÕES GERAIS".');
  linhas.push('2. **Remover cabeçalho/rodapé**: linha que se repete em 3+ páginas do mesmo PDF');
  linhas.push('   é moldura, não conteúdo — remover por frequência antes de juntar as páginas.');
  linhas.push('3. **Espelho em tabela**: extrair com `page.find_tables()` do PyMuPDF (e juntar');
  linhas.push('   célula a célula), nunca com `get_text()` cru.');
  linhas.push('4. **PDF escaneado** (texto < 300 chars): OCR (`fitz` + Tesseract) ou rebaixar a');
  linhas.push('   prova para "somente link", com aviso honesto na tela.');
  linhas.push('5. **Prova oral — marcador interno**: as perguntas extraídas trazem códigos do PDF');
  linhas.push('   da banca no meio do texto (ex.: `<<D01_dAdm_A0100422_...>>`). Remover na geração');
  linhas.push('   do oral-conteudo com `texto.replace(/<<[A-Za-z0-9_]+>>/g, "")` + trim.');
  linhas.push('6. **Portão de qualidade**: rodar `auditar-provas.mjs --portao` no fim do build —');
  linhas.push('   prova que reprovar NÃO publica texto.');
  linhas.push('');
  for (const [s, itens] of Object.entries(porSintoma).sort((a, b) => b[1].length - a[1].length)) {
    linhas.push(`## ${s} (${itens.length})`);
    linhas.push('');
    for (const { id, campo } of itens) linhas.push(`- \`${id}\` (${campo})`);
    linhas.push('');
  }
  fs.writeFileSync(path.join(RAIZ, MD), linhas.join('\n'));
  console.log('relatório gravado em ' + MD);
}

if (PORTAO && idsReprovados.size) {
  console.error(`PORTÃO: ${idsReprovados.size} prova(s) com texto reprovado — corrija antes de publicar.`);
  process.exit(1);
}
