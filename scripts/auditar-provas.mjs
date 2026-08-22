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

/* ---------- as heurísticas: cada uma detecta um jeito de o texto estar errado ---------- */

// A capa/instruções do caderno entrou como se fosse o enunciado.
const RE_INSTRUCOES = /N[ÃA]O\s+SER[ÁA]\s+PERMITIDO|INFORMA[ÇC][ÕO]ES\s+GERAIS|SUA\s+PROVA\b|retirar-?se\s+da\s+sala|ser[áa]\s+eliminado\s+do\s+concurso|fiscal\s+de\s+sala|caderno\s+de\s+(?:provas?|quest[õo]es)\s+e\s+a\s+folha/i;
function temInstrucoesDeCaderno(txt) {
  // só conta quando aparece no PRIMEIRO terço — instruções no fim são anexo legítimo raro
  const cabeca = txt.slice(0, Math.max(1200, Math.floor(txt.length / 3)));
  return RE_INSTRUCOES.test(cabeca);
}

// Cabeçalho/rodapé de página vazando: a mesma linha longa repetida várias vezes.
function temCabecalhoRepetido(txt) {
  const cont = {};
  for (const l of txt.split('\n')) {
    const s = l.trim();
    if (s.length < 20) continue;
    cont[s] = (cont[s] || 0) + 1;
    if (cont[s] >= 4) return true;
  }
  return false;
}

// Extração falhou ou PDF é imagem: sobrou texto de menos para ser uma prova real.
const CURTO_MIN = 300;

// Lixo de codificação: proporção alta de caracteres fora do esperado em português.
function proporcaoLixo(txt) {
  if (!txt.length) return 0;
  const lixo = (txt.match(/[^\x20-\x7EÀ-ÿ§ºª°–—‘’“”…\n\r\t•·]/g) || []).length;
  return lixo / txt.length;
}

function audita(txt) {
  const t = String(txt || '');
  const problemas = [];
  if (t.length < CURTO_MIN) problemas.push('curto');
  else {
    if (temInstrucoesDeCaderno(t)) problemas.push('instrucoes-de-caderno');
    if (temCabecalhoRepetido(t)) problemas.push('cabecalho-repetido');
    if (proporcaoLixo(t) > 0.02) problemas.push('lixo-encoding');
  }
  return problemas;
}

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

for (const [id, item] of Object.entries(TEXTOS)) {
  totalEn++;
  const p = audita(item.en);
  if (p.length) { reprovadosEn++; idsReprovados.add(id); marca(p, id, 'enunciado'); }
}
const lista = Array.isArray(DISC) ? DISC : Object.values(DISC);
let semEspelho = 0;
for (const item of lista) {
  const bruto = item.espelho ?? item.esp;
  const esp = String(bruto == null ? '' : (Array.isArray(bruto) ? bruto.join('\n') : bruto)).trim();
  // Espelho AUSENTE é outra doença (falta extrair/publicar) — conta à parte, não
  // como deformação. Deformação é texto presente e errado.
  if (!esp) { semEspelho++; continue; }
  totalEsp++;
  const p = audita(esp);
  if (p.length) { reprovadosEsp++; idsReprovados.add(item.id); marca(p, item.id, 'espelho'); }
}

/* ---------- saída ---------- */

console.log(`Enunciados extraídos: ${totalEn} · reprovados: ${reprovadosEn}`);
console.log(`Espelhos embutidos:   ${totalEsp} · reprovados: ${reprovadosEsp} · sem espelho: ${semEspelho}`);
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
  linhas.push(`- Enunciados extraídos: **${totalEn}**, reprovados: **${reprovadosEn}**`);
  linhas.push(`- Espelhos embutidos: **${totalEsp}**, reprovados: **${reprovadosEsp}**`);
  linhas.push(`- Provas **sem espelho nenhum**: **${semEspelho}** — doença separada: falta extrair`);
  linhas.push('  dos PDFs de espelho (ou a banca não publicou; nesse caso, dizer isso na tela).');
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
  linhas.push('5. **Portão de qualidade**: rodar `auditar-provas.mjs --portao` no fim do build —');
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
