// scripts/build-questoes-enam.mjs — o banco OFICIAL do ENAM: as provas anteriores (tipo 1)
// com o gabarito definitivo, viram questoes-enam.js (window.CT_QUESTOES_ENAM), carregado
// pelo simulado no formato da prova (E3) só quando o modo ENAM abre — <script>, não fetch,
// porque no bundle nativo (file://) fetch não funciona.
//
// Fonte primária, e só ela: os PDFs públicos da FGV Conhecimento/ENFAM listados em
// scripts/fontes/enam/FONTES.md, baixados uma vez e versionados. O texto vem dos .txt ao
// lado (scripts/extrair-enam.py, PyMuPDF); se um .txt faltar e houver python3 com fitz,
// a extração roda aqui; sem os dois, o build ABORTA em vez de publicar banco pela metade.
// Nenhum comentário de terceiros entra (Lei 9.610/1998, art. 7º): o que sai é o enunciado,
// as cinco alternativas, o gabarito e, quando o texto aponta, a referência normativa.
//
// Portão de qualidade (aborta): edição ≠ 80 questões, área com cota diferente do quadro
// 8.6, id duplicado, ≠ 5 alternativas, gabarito fora de A–E (salvo anulada), mojibake,
// enunciado < 40 caracteres, alternativa vazia, sequência 1..80 fora de ordem.
//
// Uso: node scripts/build-questoes-enam.mjs [--quieto]
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { temMojibake } from './qualidade-texto.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONTES = join(ROOT, 'scripts', 'fontes', 'enam');

// as edições, na ordem; a edição VI (29/11/2026) entra aqui quando a FGV publicar
export const EDICOES = [
  { id: '2024.1', numero: 'I',   data: '2024-04-14', prova: 'prova-2024.1-tipo1', gabarito: 'gabarito-2024.1',
    fonte: 'FGV/ENFAM — 1º ENAM (2024.1), prova tipo 1 de 14/04/2024, gabarito definitivo pós-anulação (28/05/2024)' },
  { id: '2024.2', numero: 'II',  data: '2024-10-20', prova: 'prova-2024.2-tipo1', gabarito: 'gabarito-2024.2',
    fonte: 'FGV/ENFAM — 2º ENAM (2024.2), prova tipo 1 de 20/10/2024, gabarito definitivo retificado (19/11/2024)' },
  { id: '2025.1', numero: 'III', data: '2025-05-18', prova: 'prova-2025.1-tipo1', gabarito: 'gabarito-2025.1',
    fonte: 'FGV/ENFAM — 3º ENAM (2025.1), prova tipo 1 de 18/05/2025, gabarito definitivo retificado (16/07/2025)' },
  { id: '2025.2', numero: 'IV',  data: '2025-10-26', prova: 'prova-2025.2-tipo1', gabarito: 'gabarito-2025.2',
    fonte: 'FGV/ENFAM — 4º ENAM (2025.2), prova tipo 1 de 26/10/2025, gabarito definitivo retificado (03/12/2025)' },
  { id: '2026.1', numero: 'V',   data: '2026-06-07', prova: 'prova-2026.1-tipo1', gabarito: 'gabarito-2026.1',
    fonte: 'FGV/ENFAM — 5º ENAM (2026.1), prova tipo 1 de 07/06/2026, gabarito definitivo' },
];

/** CT_ENAM.AREAS, lido do próprio enam.js (constante única: o build não a duplica). */
export function carregarAreas() {
  const ctx = { window: {} }; ctx.globalThis = ctx;
  vm.runInNewContext(readFileSync(join(ROOT, 'enam.js'), 'utf8'), ctx);
  return ctx.window.CT_ENAM.AREAS;
}

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

/** Linhas da moldura da FGV (cabeçalho/rodapé de página) e da capa: nunca são conteúdo. */
const RE_MOLDURA = /^(ESCOLA NACIONAL DE FORMA|FGV CONHECIMENTO|TIPO\s+\d?\s*(–|-|BRANCA)|\d+[ºO°]?\s*EXAME NACIONAL DA MAGISTRATURA|EXAME NACIONAL DA MAGISTRATURA|ENAM\s*[–-]\s*20\d\d)/i;

/**
 * parseProva(texto, areas) → { questoes:[{numero, area, enunciado, alternativas}], avisos:[] }
 * O caderno da FGV é regular: o cabeçalho da ÁREA em linha própria (caixa alta ou Title
 * Case, às vezes quebrado em duas linhas), o NÚMERO da questão sozinho na linha, o
 * enunciado, e as alternativas começando por "(A)"…"(E)". A área vem do cabeçalho — o
 * script não adivinha pelo texto.
 */
export function parseProva(texto, areas) {
  const linhas = String(texto || '').replace(/\f/g, '\n').split('\n').map((l) => l.replace(/ /g, ' ').trimEnd());
  const cab = new Map();   // cabeçalho normalizado → área
  for (const a of areas) for (const c of a.cabecalhos) cab.set(norm(c), a);
  const questoes = [], avisos = [];
  let areaAtual = null, q = null, alt = null, esperado = 1;
  const fechar = () => { if (q) { if (alt) q.alternativas.push(alt); questoes.push(q); } q = null; alt = null; };
  const ehMoldura = (l) => RE_MOLDURA.test(l) || /^P[ÁA]GINA\s+\d+/i.test(l);
  // a próxima linha de conteúdo (pula vazias e moldura), a partir de i+1
  const proxima = (i) => { for (let k = i + 1; k < linhas.length; k++) { const x = linhas[k].trim(); if (x && !ehMoldura(x)) return x; } return ''; };
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i].trim();
    if (!l) continue;
    if (ehMoldura(l)) continue;
    /* Cabeçalho de área: a linha inteira (ou ela + a seguinte, quando a FGV parte "NOÇÕES
       GERAIS DE DIREITO E" / "FORMAÇÃO HUMANÍSTICA" em duas) casa com um nome de área E o
       que vem depois é o número da próxima questão. A segunda condição é o que separa o
       cabeçalho de verdade de um enunciado que a extração quebrou palavra por palavra
       ("Direitos" / "Humanos" soltos no meio da questão 34 de 2025.1). */
    const n1 = norm(l), n2 = norm(l + ' ' + proxima(i));
    if (cab.has(n1) && proxima(i) === String(esperado)) { fechar(); areaAtual = cab.get(n1); continue; }
    if (cab.has(n2)) {
      let k = i + 1; while (k < linhas.length && (!linhas[k].trim() || ehMoldura(linhas[k].trim()))) k++;
      if (proxima(k) === String(esperado)) { fechar(); areaAtual = cab.get(n2); i = k; continue; }
    }
    // número da questão: só o esperado, sozinho na linha
    const mNum = /^(\d{1,2})$/.exec(l);
    if (mNum && +mNum[1] === esperado) {
      fechar(); q = { numero: esperado, area: areaAtual ? areaAtual.id : '', enunciado: '', alternativas: [] }; esperado++; continue;
    }
    if (!q) continue;                       // capa e instruções, antes da questão 1
    const mAlt = /^\(([A-E])\)\s*(.*)$/.exec(l);
    if (mAlt) { if (alt) q.alternativas.push(alt); alt = { letra: mAlt[1], texto: mAlt[2] }; continue; }
    if (alt) alt.texto = (alt.texto + ' ' + l).trim();
    else q.enunciado = (q.enunciado + ' ' + l).trim();
  }
  fechar();
  for (const x of questoes) {
    x.enunciado = limparTexto(x.enunciado);
    x.alternativas = x.alternativas.map((a) => ({ letra: a.letra, texto: limparTexto(a.texto) }));
  }
  return { questoes, avisos };
}

/** Tira o que a extração deixa: hífen de quebra de linha, espaços duplos, espaço antes de pontuação. */
export function limparTexto(s) {
  return String(s || '').replace(/(\p{Ll})- (\p{Ll})/gu, '$1$2').replace(/\s+/g, ' ').replace(/\s+([,.;:!?)])/g, '$1').replace(/\(\s+/g, '(').trim();
}

/**
 * parseGabarito(texto, tipo=1) → { respostas:{numero:'A'|…|'*'} }
 * Dois leiautes da FGV: 20 números seguidos de 20 letras (2024) ou número e letra
 * intercalados (2025+). Só o bloco do TIPO pedido conta; "*" é questão anulada.
 */
export function parseGabarito(texto, tipo = 1) {
  const t = String(texto || '').replace(/\f/g, '\n');
  const cabecalho = new RegExp('(PROVA\\s+TIPO\\s+' + tipo + '\\b|TIPO\\s+' + tipo + '\\b|Magistratura\\s*-\\s*' + tipo + '\\s*-|Prova\\s+Tipo\\s+' + tipo + '\\b)', 'i');
  // o bloco acaba no próximo tipo, na tabela de correspondência ou na legenda "(*) Questão anulada" —
  // sem a legenda como parada, o asterisco dela entrava como 81ª resposta (2025.1)
  const proximo = /(PROVA\s+TIPO\s+\d|ENAM\s*-\s*TIPO\s+\d|Magistratura\s*-\s*\d\s*-|Prova\s+Tipo\s+\d|TABELA DE CORRESPOND|\(?\*\)?\s*Quest[ãa]o\s+[Aa]nulada|Quest[ãa]o\s+[Aa]nulada)/i;
  const ini = t.search(cabecalho);
  if (ini < 0) return { respostas: {}, erro: 'bloco do tipo ' + tipo + ' não encontrado' };
  let bloco = t.slice(ini).replace(cabecalho, '');
  const fim = bloco.search(proximo);
  if (fim > 0) bloco = bloco.slice(0, fim);
  const nums = [], resp = [];
  for (const tok of bloco.split(/\s+/)) {
    if (/^\d{1,2}$/.test(tok)) nums.push(+tok);
    else if (/^[A-E]$/.test(tok) || tok === '*') resp.push(tok);
  }
  const respostas = {};
  if (nums.length !== resp.length) return { respostas, erro: 'gabarito do tipo ' + tipo + ' com ' + nums.length + ' números e ' + resp.length + ' respostas' };
  nums.forEach((n, i) => { respostas[n] = resp[i]; });
  return { respostas };
}

/** Referência normativa que o próprio texto aponta (art., Súmula, Tema) — sem inventar. */
export function referencias(txt) {
  const re = /\b(?:arts?\.?\s*\d+[\dºª°.\-A-Za-z]*(?:,?\s*(?:§\s*\d+[ºª°]?|par[áa]grafo\s+[úu]nico|inc(?:iso)?\.?\s*[IVXLC]+))*(?:\s+d[aoe]\s+(?:CF|CRFB|Constitui[çc][ãa]o|CPC|CPP|CP|CC|C[óo]digo\s+\w+|Lei\s+n?[ºo.]?\s*[\d.]+\/\d{2,4}|CDC|CLT|CTN|LINDB|ECA|LEP))?|s[úu]mula(?:\s+vinculante)?\s+n?[ºo.]?\s*\d+(?:\s+d[oe]\s+(?:STF|STJ|TST))?|tema\s+(?:repetitivo\s+)?n?[ºo.]?\s*\d+)/gi;
  const out = [], vis = new Set();
  let m;
  while ((m = re.exec(String(txt || '')))) { const k = m[0].replace(/\s+/g, ' ').trim(); const kk = k.toLowerCase(); if (!vis.has(kk)) { vis.add(kk); out.push(k); } }
  return out.slice(0, 6);
}

function lerTexto(nome) {
  const txt = join(FONTES, nome + '.txt'), pdf = join(FONTES, nome + '.pdf');
  if (!existsSync(txt)) {
    if (!existsSync(pdf)) throw new Error('fonte ausente: ' + nome + '.pdf (ver scripts/fontes/enam/FONTES.md)');
    try { execFileSync('python3', [join(ROOT, 'scripts', 'extrair-enam.py')], { stdio: 'pipe' }); }
    catch (e) { throw new Error(nome + '.txt não existe e a extração falhou (python3 + PyMuPDF): ' + String(e.message).slice(0, 200)); }
  }
  return readFileSync(txt, 'utf8');
}

/** Monta o banco inteiro e devolve { questoes, resumo, erros } — sem gravar nada. */
export function montar(opts = {}) {
  const areas = carregarAreas();
  const cotas = {}; for (const a of areas) cotas[a.id] = a.cota;
  const questoes = [], erros = [], resumo = [];
  const ids = new Set();
  for (const ed of EDICOES) {
    const ler = opts.ler || lerTexto;
    const prova = parseProva(ler(ed.prova), areas);
    const gab = parseGabarito(ler(ed.gabarito), 1);
    if (gab.erro) erros.push(ed.id + ': ' + gab.erro);
    const qs = prova.questoes;
    if (qs.length !== 80) erros.push(ed.id + ': ' + qs.length + ' questões lidas (esperava 80)');
    const porArea = {}; let anuladas = 0;
    qs.forEach((q, i) => {
      if (q.numero !== i + 1) erros.push(ed.id + ': numeração fora de ordem na posição ' + (i + 1));
      if (!q.area) erros.push(ed.id + ' q' + q.numero + ': sem cabeçalho de área');
      porArea[q.area] = (porArea[q.area] || 0) + 1;
      const resp = gab.respostas[q.numero];
      const anulada = resp === '*';
      if (anulada) anuladas++;
      if (!anulada && !/^[A-E]$/.test(String(resp || ''))) erros.push(ed.id + ' q' + q.numero + ': gabarito "' + resp + '" fora de A–E');
      if (q.alternativas.length !== 5) erros.push(ed.id + ' q' + q.numero + ': ' + q.alternativas.length + ' alternativas');
      if (q.alternativas.map((a) => a.letra).join('') !== 'ABCDE'.slice(0, q.alternativas.length)) erros.push(ed.id + ' q' + q.numero + ': letras fora de ordem');
      if (q.enunciado.length < 40) erros.push(ed.id + ' q' + q.numero + ': enunciado curto (' + q.enunciado.length + ')');
      for (const a of q.alternativas) if (!a.texto) erros.push(ed.id + ' q' + q.numero + ': alternativa ' + a.letra + ' vazia');
      const tudo = q.enunciado + ' ' + q.alternativas.map((a) => a.texto).join(' ');
      if (temMojibake(tudo)) erros.push(ed.id + ' q' + q.numero + ': mojibake');
      const area = areas.find((a) => a.id === q.area);
      const id = 'enam-' + ed.id + '-' + String(q.numero).padStart(3, '0');
      if (ids.has(id)) erros.push('id duplicado: ' + id); ids.add(id);
      questoes.push({ id, edicao: ed.id, numero: q.numero, area: q.area, disciplina: area ? area.nome : '',
        enunciado: q.enunciado, alternativas: q.alternativas, gabarito: anulada ? '' : String(resp), anulada,
        refs: referencias(tudo), fonte: ed.fonte });
    });
    for (const a of areas) if ((porArea[a.id] || 0) !== a.cota) erros.push(ed.id + ': área ' + a.id + ' com ' + (porArea[a.id] || 0) + ' questões (quadro 8.6 manda ' + a.cota + ')');
    resumo.push({ edicao: ed.id, questoes: qs.length, anuladas, porArea });
  }
  return { questoes, resumo, erros };
}

const ehPrincipal = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (ehPrincipal) {
  const { questoes, resumo, erros } = montar();
  for (const r of resumo) console.log('  · ENAM ' + r.edicao + ': ' + r.questoes + ' questões, ' + r.anuladas + ' anulada(s) — ' + Object.entries(r.porArea).map(([k, v]) => k + ' ' + v).join(' · '));
  if (erros.length) {
    console.error('\n✗ BUILD ABORTADO — o banco do ENAM não passou no portão de qualidade:\n    ' + erros.slice(0, 40).join('\n    ') + (erros.length > 40 ? '\n    … e mais ' + (erros.length - 40) : ''));
    process.exit(1);
  }
  const cab = `// questoes-enam.js — GERADO por scripts/build-questoes-enam.mjs. Não editar à mão.
// ${questoes.length} questões OFICIAIS do ENAM (prova tipo 1 + gabarito definitivo), FGV/ENFAM:
${EDICOES.map((e) => '//   ' + e.numero + ' · ' + e.id + ' — ' + e.fonte).join('\n')}
// Fontes e URLs: scripts/fontes/enam/FONTES.md. Questão anulada fica com anulada:true e
// nunca entra em simulado. Consumido pelo modo ENAM (window.CT_QUESTOES_ENAM).
`;
  writeFileSync(join(ROOT, 'questoes-enam.js'), cab + 'window.CT_QUESTOES_ENAM=' + JSON.stringify(questoes) + ';\n');
  const anuladas = questoes.filter((q) => q.anulada).length;
  console.log(`✓ questoes-enam.js: ${questoes.length} questões (${EDICOES.length} edições × 80), ${anuladas} anulada(s), ${questoes.filter((q) => q.refs.length).length} com referência normativa apontada`);
}
