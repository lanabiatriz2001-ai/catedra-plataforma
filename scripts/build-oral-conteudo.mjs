// scripts/build-oral-conteudo.mjs — extrai o CONTEÚDO dos PDFs de prova oral.
//
// O oral.js guarda o catálogo (quem, quando, onde está o PDF). Aqui vai o que a banca
// realmente escreveu: a PERGUNTA que ela formulou e o PADRÃO DE RESPOSTA que ela publicou —
// cadastrados na plataforma, para treinar sem sair do app.
//
// Fonte: os próprios PDFs oficiais do CEBRASPE, baixados dos endereços do acervo. São
// documentos públicos de concurso; o texto entra com a referência da prova de origem.
//
// Uso:  node scripts/build-oral-conteudo.mjs <pasta-dos-pdfs>
// Saída: oral-conteudo.js → window.CT_ORAL_Q = [{id, orgao, ano, cargo, banca, carreira,
//        ponto, disciplina, questao, enunciado, padrao, topicos, url}]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = process.argv[2];
if (!PASTA || !existsSync(PASTA)) { console.error('uso: node scripts/build-oral-conteudo.mjs <pasta-dos-pdfs>'); process.exit(1); }

// catálogo (oral.js) → metadados de cada PDF
globalThis.window = {};
new Function('window', readFileSync(join(ROOT, 'oral.js'), 'utf8'))(globalThis.window);
const CONC = globalThis.window.CT_ORAL || [];
const meta = new Map();
for (const c of CONC) {
  for (const m of c.materiais) {
    if (m.tipo !== 'padrao_resposta_oral' && m.tipo !== 'questoes_formuladas') continue;
    meta.set(m.url, { orgao: c.orgao, ano: c.ano, cargo: c.cargo, banca: c.banca, carreira: c.subarea || c.area, titulo: m.titulo, tipo: m.tipo, url: m.url });
  }
}

const md5 = (s) => createHash('md5').update(s).digest('hex').slice(0, 16);
const texto = (arquivo) => execFileSync('python3', ['-c',
  'import sys,fitz;print("\\n".join(p.get_text() for p in fitz.open(sys.argv[1])))', arquivo],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const limpa = (s) => String(s || '')
  .replace(/CEBRASPE[^\n]*\d+\/\d+\s*/g, ' ')          // rodapé de página
  .replace(/­/g, '').replace(/[ \t]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n').trim();

/** Reparte o PDF por PONTO e por QUESTÃO, casando cada questão ao seu padrão de resposta. */
function extrair(t, m) {
  const T = limpa(t);
  const out = [];
  // blocos de ponto: "PONTO 6 – DIREITO ADMINISTRATIVO"
  const rePonto = /PONTO\s+(\d+)\s*[–\-—:]?\s*([^\n]{0,80})/gi;
  const pontos = [];
  let p;
  while ((p = rePonto.exec(T))) pontos.push({ n: p[1], disc: p[2].trim(), i: p.index });
  const doPonto = (i) => { let a = null; for (const q of pontos) { if (q.i <= i) a = q; } return a; };

  // questões: "QUESTÃO 1" … até a próxima QUESTÃO ou fim
  const reQ = /QUEST[ÃA]O\s+(\d+)/gi;
  const marcas = [];
  let q;
  while ((q = reQ.exec(T))) marcas.push({ n: q[1], i: q.index, fim: q.index + q[0].length });
  for (let k = 0; k < marcas.length; k++) {
    const ini = marcas[k].fim;
    const fim = k + 1 < marcas.length ? marcas[k + 1].i : T.length;
    const bloco = T.slice(ini, fim);
    // dentro do bloco: enunciado, tópicos avaliados e padrão de resposta
    const iPadrao = bloco.search(/PADR[ÃA]O\s+DE\s+RESPOSTA|RESPOSTA\s+ESPERADA/i);
    const iTop = bloco.search(/T[ÓO]PICOS\s+DOS\s+OBJETOS/i);
    let enun = bloco.slice(0, Math.min(...[iPadrao, iTop].filter((x) => x > 0).concat([bloco.length])));
    let padrao = iPadrao >= 0 ? bloco.slice(iPadrao).replace(/^[^\n]*\n/, '') : '';
    let topicos = '';
    if (iTop >= 0) {
      const t2 = bloco.slice(iTop).replace(/^[^\n]*\n/, '');
      topicos = (iPadrao > iTop ? t2.slice(0, bloco.slice(iTop).search(/PADR[ÃA]O\s+DE\s+RESPOSTA|RESPOSTA\s+ESPERADA/i)) : t2).trim();
    }
    enun = enun.trim(); padrao = padrao.trim(); topicos = topicos.trim();
    if (enun.length < 60) continue;                 // marca de questão sem enunciado útil
    const pt = doPonto(marcas[k].i);
    // Nem todo PDF traz "PONTO N – DISCIPLINA" (630 de 999 ficavam sem). Quando falta,
    // inferimos pela matéria dominante no enunciado + tópicos: é o que permite filtrar.
    const disc = (pt && pt.disc && pt.disc.length > 4) ? pt.disc : inferirDisciplina(enun + ' ' + topicos);
    out.push({
      id: md5(m.url + '#' + marcas[k].n),
      orgao: m.orgao, ano: m.ano, cargo: m.cargo, banca: m.banca, carreira: m.carreira,
      ponto: pt ? pt.n : '', disciplina: disc,
      questao: marcas[k].n,
      enunciado: enun.slice(0, 2600),
      padrao: padrao.slice(0, 9000),
      topicos: topicos.slice(0, 1800),
      fonte: m.titulo || '', url: m.url,
    });
  }
  return out;
}

/** Matéria dominante de um texto, por termos característicos. Só decide quando um ramo
 *  se destaca dos demais — empate devolve vazio, e melhor vazio do que rótulo errado. */
const TERMOS = {
  'DIREITO CONSTITUCIONAL': ['constituição', 'constitucional', 'controle de constitucionalidade', 'adi', 'adpf', 'direitos fundamentais', 'federalismo', 'competência legislativa', 'remédios constitucionais'],
  'DIREITO ADMINISTRATIVO': ['administração pública', 'ato administrativo', 'licitação', 'servidor público', 'improbidade', 'concessão', 'poder de polícia', 'processo administrativo', 'agente público'],
  'DIREITO CIVIL': ['código civil', 'contrato', 'responsabilidade civil', 'posse', 'propriedade', 'usucapião', 'obrigações', 'prescrição', 'sucessão', 'família', 'casamento'],
  'DIREITO PROCESSUAL CIVIL': ['petição inicial', 'cpc', 'processo civil', 'tutela provisória', 'coisa julgada', 'recurso', 'execução', 'cumprimento de sentença', 'litisconsórcio', 'competência'],
  'DIREITO PENAL': ['código penal', 'crime', 'pena', 'dolo', 'culpa', 'tipicidade', 'concurso de crimes', 'dosimetria', 'imputabilidade'],
  'DIREITO PROCESSUAL PENAL': ['inquérito', 'denúncia', 'prisão preventiva', 'processo penal', 'júri', 'cpp', 'ação penal', 'prova ilícita', 'habeas corpus'],
  'DIREITO TRIBUTÁRIO': ['tributo', 'imposto', 'ctn', 'lançamento', 'crédito tributário', 'icms', 'iss', 'contribuição', 'imunidade tributária'],
  'DIREITO DO TRABALHO': ['clt', 'empregado', 'empregador', 'contrato de trabalho', 'jornada', 'rescisão', 'sindicato'],
  'DIREITO EMPRESARIAL': ['sociedade empresária', 'falência', 'recuperação judicial', 'título de crédito', 'empresário'],
  'DIREITO AMBIENTAL': ['meio ambiente', 'licenciamento ambiental', 'área de preservação', 'dano ambiental'],
  'DIREITO PREVIDENCIÁRIO': ['previdenciário', 'benefício', 'aposentadoria', 'rgps', 'segurado'],
  'DIREITOS HUMANOS': ['direitos humanos', 'convenção americana', 'pacto de são josé', 'corte interamericana'],
  'DIREITO DA CRIANÇA E DO ADOLESCENTE': ['eca', 'criança e adolescente', 'ato infracional', 'medida socioeducativa'],
  'DIREITO ELEITORAL': ['eleitoral', 'inelegibilidade', 'partido político', 'campanha eleitoral'],
};
function inferirDisciplina(txt) {
  const t = String(txt || '').toLowerCase();
  let melhor = '', pontos = 0, segundo = 0;
  for (const [nome, chaves] of Object.entries(TERMOS)) {
    let n = 0;
    for (const c of chaves) if (t.includes(c)) n++;
    if (n > pontos) { segundo = pontos; pontos = n; melhor = nome; }
    else if (n > segundo) segundo = n;
  }
  return (pontos >= 2 && pontos > segundo) ? melhor : '';
}

const itens = [];
let lidos = 0, semQuestao = 0;
for (const [url, m] of meta) {
  const f = join(PASTA, md5(url) + '.pdf');
  if (!existsSync(f)) continue;
  lidos++;
  let achados = [];
  try { achados = extrair(texto(f), m); } catch (e) { continue; }
  if (!achados.length) { semQuestao++; continue; }
  itens.push(...achados);
}

// dedup por enunciado (o mesmo malote aparece em arquivos diferentes)
const vistos = new Set();
const finais = itens.filter((x) => {
  const k = md5(x.enunciado.slice(0, 300).toLowerCase().replace(/\W+/g, ''));
  if (vistos.has(k)) return false;
  vistos.add(k); return true;
});

const cab = `/* Cátedra — PERGUNTAS E PADRÕES DE RESPOSTA DE PROVA ORAL.
 *
 * O que as bancas efetivamente perguntaram na arguição e o que publicaram como padrão de
 * resposta, extraído dos PDFs oficiais (CEBRASPE) listados em oral.js. Cada item guarda o
 * concurso, o ponto sorteado, a disciplina e o link do documento de origem — é conferível.
 *
 * Gerado por scripts/build-oral-conteudo.mjs. Não editar à mão.
 */
`;
writeFileSync(join(ROOT, 'oral-conteudo.js'), cab + 'window.CT_ORAL_Q = ' + JSON.stringify(finais) + ';\n');
writeFileSync(join(ROOT, 'oral-conteudo.json'), JSON.stringify(finais));
const comPadrao = finais.filter((x) => x.padrao.length > 200).length;
console.log(`PDFs lidos: ${lidos} · sem questão identificada: ${semQuestao}`);
console.log(`oral-conteudo: ${finais.length} perguntas (${comPadrao} com padrão de resposta)`);
const porCarr = {};
for (const x of finais) porCarr[x.carreira || '—'] = (porCarr[x.carreira || '—'] || 0) + 1;
console.log('carreiras:', Object.entries(porCarr).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
