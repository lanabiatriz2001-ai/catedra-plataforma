// scripts/lib/colecoes.mjs — peças comuns das COLEÇÕES do sentinela (Fase 2, 01/10/2026):
// repercussão geral do STF, recursos repetitivos do STJ e súmulas dos dois tribunais.
//
// O que mora aqui, e por quê num lugar só:
//  • normalização — a mesma régua para guardar (normLeve) e para comparar tese (normForte),
//    medida contra o banco oficial: "tirar todo espaço" casa 769 de 769 teses repgeral do STF
//    (no texto literal, 739) e as 1.011 linhas repgeral do STJ;
//  • o item de coleção, com id determinístico e a pendência por extenso;
//  • a base do acervo (juris-index.js e, quando existe, juris-text.js) e a regra de baixa;
//  • a LINHA DE BASE (sentinela/retratos.json): a última leitura oficial registrada de cada
//    coleção. A detecção compara a fonte de hoje com ela, não com o acervo — com o acervo como
//    única base, o STF daria 33 "temas novos" falsos (1452 a 1485) e calaria as 7 mudanças
//    reais da semana, e o STJ daria 53 "tema afetado" falsos (1422 a 1474). Medido em
//    01/10/2026; ver docs/fontes-oficiais-sentinela.md;
//  • a etiqueta de rede: pausa de 3 s entre pedidos da mesma coleção, teto por pedido e, na
//    rotina, novas tentativas curtas. Nada de martelar os tribunais.
//
// Só importa módulos node: — roda na rotina (GitHub Actions) e na função serverless.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ARQ_RETRATOS = join(RAIZ, 'sentinela', 'retratos.json');

// ── Normalização ────────────────────────────────────────────────────────────
// "¿" aparece no lugar de espaço na tese do Tema 1234 do STF; o NBSP vem das células.
export const normLeve = (s) => String(s ?? '').normalize('NFC').replace(/[¿ ]/g, ' ').replace(/\s+/g, ' ').trim();
export const normForte = (s) => normLeve(s).normalize('NFKC').replace(/[“”"″‘’´`']/g, '').replace(/[–—−]/g, '-').toLowerCase().replace(/\s+/g, '');
export const dataBR = (s) => { const m = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(String(s || '')); return m ? `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}` : null; };
export const sha8 = (s) => createHash('sha1').update(String(s)).digest('hex').slice(0, 8);
/** dd/mm/aaaa de um ISO (a data da linha de base, para o detalhe). */
export const dataDeISO = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? `${m[3]}/${m[2]}/${m[1]}` : '?'; };
const cmpBR = (a, b) => { const k = (s) => String(s).split('/').reverse().join(''); return k(a) < k(b) ? -1 : k(a) > k(b) ? 1 : 0; };
export const maisRecente = (a, b) => (!a ? b : !b ? a : (cmpBR(a, b) >= 0 ? a : b));

// ── Resultado: o pior das coleções que rodaram ──────────────────────────────
// Falha nunca vira "sem novidade": ela vence tudo. Parcial vence "novidades".
export const PIOR = ['falha', 'parcial', 'novidades', 'sem-novidade'];
export const pior = (...estados) => estados.flat().filter((e) => PIOR.includes(e))
  .sort((a, b) => PIOR.indexOf(a) - PIOR.indexOf(b))[0] || null;

// Trava de volume (toda coleção): mais que isto numa rodada é sinal de linha de base errada.
export const VOLUME_MAX = 50;
export const LIMIARES = { minLinhasRG: 1400, volumeMax: VOLUME_MAX, sumidosMax: 5 };
export function travaDeVolume(n, lidoEm, max = VOLUME_MAX) {
  if (n <= max) return null;
  // Súmulas comparam com o acervo, não com um retrato (lidoEm nulo).
  return lidoEm
    ? `volume atípico: ${n} itens numa rodada contra a linha de base de ${dataDeISO(lidoEm)} — confira se a linha de base está certa`
    : `volume atípico: ${n} itens numa rodada contra o acervo do CátedraJURIS — confira se a lista oficial e o acervo estão certos`;
}

// ── Etiqueta de rede ────────────────────────────────────────────────────────
export const PAUSA_MS = 3000;
export const ESPERAS_MS = [8000, 16000];
const FOLGA_MS = 3000;
export const semTempo = (prazo) => !!prazo && prazo - Date.now() < FOLGA_MS;
export const esperarPadrao = (ms) => new Promise((r) => setTimeout(r, ms));

/** Uma sessão de pedidos de UMA coleção: os pedidos são sequenciais, com pausa de ≥ 3 s entre
 *  dois deles (ctx.busca.esperar — os testes trocam por uma função que só registra), teto por
 *  pedido (`teto` ms, sem passar do prazo da coleção) e, na rotina, até 3 tentativas (8 s e
 *  16 s de espera) para exceção de rede, HTTP 5xx ou formato não reconhecido (`ler` lança).
 *  404 e 304 não se repetem. Devolve { r, valor }; a última tentativa com 5xx devolve o `r`
 *  (quem chama diz "HTTP 503"); a última exceção é relançada. */
export function novaSessao(ctx) {
  let pedidos = 0;
  const esperar = (ctx.busca && ctx.busca.esperar) || esperarPadrao;
  return async function pedir(url, { teto = 30000, codificacao = 'utf8', cabecalhos, ler, repetir = true } = {}) {
    const max = ctx.modo !== 'ao-vivo' && repetir ? 3 : 1;
    let erro = null;
    for (let t = 1; t <= max; t++) {
      if (pedidos > 0) await esperar(t === 1 ? PAUSA_MS : ESPERAS_MS[t - 2]);
      if (semTempo(ctx.prazo)) throw new Error('tempo da consulta esgotado antes de ler ' + url.replace(/^https:\/\//, '').slice(0, 80));
      pedidos++;
      const prazo = Math.min(ctx.prazo || Infinity, Date.now() + teto);
      let r;
      try {
        r = await ctx.busca.buscar(url, { prazo, codificacao, ...(cabecalhos ? { cabecalhos } : {}) });
      } catch (e) { erro = e; continue; }
      if (r.status >= 500 && t < max) { erro = new Error(`HTTP ${r.status}`); continue; }
      if (!ler || r.status !== 200) return { r };
      try { return { r, valor: await ler(r) }; } catch (e) { erro = e; }
    }
    throw erro || new Error('a fonte não respondeu');
  };
}

// ── Item de coleção ─────────────────────────────────────────────────────────
const PREFIXO = { rg: 'STF-RG', repetitivos: 'STJ-REP' };
function prefixo(fonte, colecao, vinculante) {
  if (colecao === 'sumulas') return fonte === 'stj' ? 'STJ-SUM' : (vinculante ? 'STF-SV' : 'STF-SUM');
  return PREFIXO[colecao] || `${fonte.toUpperCase()}-${colecao.toUpperCase()}`;
}
export function tituloColecao(fonte, colecao, numero, vinculante) {
  if (colecao === 'sumulas') return vinculante ? `Súmula Vinculante ${numero} — STF` : `Súmula ${numero} — ${fonte.toUpperCase()}`;
  return `Tema ${numero} — ${fonte.toUpperCase()}`;
}
const corta600 = (s) => { if (s == null || s === '') return null; const t = normLeve(s); return t.length > 600 ? t.slice(0, 600) + '…' : t; };

/** A pendência do item, por extenso e determinística: é ela que volta quando uma baixa é
 *  desfeita. Decisão mais recente não significa, sozinha, superação (pedido da dona). */
export function pendenciaColecao(it) {
  const base = it.acompanhado
    ? 'mudança detectada na fonte oficial; o CátedraJURIS ainda mostra o estado anterior — confira na fonte antes de usar'
    : 'fora do CátedraJURIS: registrado aqui para você conferir na fonte; não entra no acervo sem revisão';
  const mais = [
    ...(it.tipo === 'julgamento' || it.tipo === 'tese-fixada' ? ['Decisão mais recente não significa, sozinha, superação do entendimento anterior.'] : []),
    ...(it.tipo === 'modulacao' ? ['A modulação foi registrada pelo STJ nas anotações do tema; confira o alcance na decisão.'] : []),
  ];
  return mais.length ? `${base}. ${mais.join(' ')}` : base;
}

/** O item completo de uma coleção. `comparavel` é sempre o estado NOVO (nunca o antigo): a api,
 *  que compara com o retrato da main, e a rotina, que compara com o do PR, dão o mesmo id.
 *  Os rótulos (fonteRotulo, colecaoRotulo, normaNome) são preenchidos pelo motor, que é dono
 *  da COBERTURA. */
export function itemColecao(o) {
  const titulo = tituloColecao(o.fonte, o.colecao, o.numero, o.vinculante);
  const it = {
    id: `${prefixo(o.fonte, o.colecao, o.vinculante)}-${o.numero}-${o.tipo}-${sha8(o.comparavel)}`,
    fonte: o.fonte, fonteRotulo: null, colecao: o.colecao, colecaoRotulo: null,
    tipo: o.tipo, numero: o.numero,
    ...(o.fonte === 'stf' && o.colecao === 'sumulas' ? { vinculante: !!o.vinculante } : {}),
    titulo, disp: titulo, norma: o.fonte.toUpperCase(), normaNome: null,
    antes: o.antes ?? null, depois: o.depois ?? null,
    situacao: o.situacao ?? null, observacao: corta600(o.observacao),
    afetadoEm: dataBR(o.afetadoEm), julgadoEm: dataBR(o.julgadoEm), publicadoEm: dataBR(o.publicadoEm),
    transitadoEm: dataBR(o.transitadoEm), aprovadaEm: dataBR(o.aprovadaEm), canceladaEm: dataBR(o.canceladaEm),
    acompanhado: !!o.acompanhado, termoJuris: o.termoJuris || null,
    // Vigência não se aplica a tese nem a súmula: os campos do Planalto vão nulos.
    modificadora: null, modificadoras: [], vigencia: null, vigenciaEm: null, vigenciaMotivo: null, efeitos: null, efeitosEm: null,
    parcial: !!o.parcial, ...(o.parcial && o.parcialMotivo ? { parcialMotivo: o.parcialMotivo } : {}),
    revisar: true, pendencia: '',
    urlOficial: o.urlOficial, detectadoEm: o.quando, lido: false,
  };
  it.pendencia = pendenciaColecao(it);
  return it;
}
export const CAMPOS_DATA = ['afetadoEm', 'julgadoEm', 'publicadoEm', 'transitadoEm', 'aprovadaEm', 'canceladaEm'];

// ── Base do acervo ──────────────────────────────────────────────────────────
// Linha do índice: [id, tribunal, base, número, título, ramo, assunto, data, situação, …].
// O casamento é SEMPRE pelo número da linha (r[3]), nunca pelo id: "repgeral-repercussao_geral-
// STJ-x1653" é o Tema 69 do STF e "repgeral-repetitivo-STJ-1300" é o Tema 130.
export function baseDaColecao(fonte, colecao, vinculante) {
  if (colecao === 'rg') return { trib: 'STF', base: 'repercussao_geral' };
  if (colecao === 'repetitivos') return { trib: 'STJ', base: 'repetitivo' };
  if (colecao === 'sumulas') return fonte === 'stj' ? { trib: 'STJ', base: 'sumula_stj' } : { trib: 'STF', base: vinculante ? 'sumula_vinculante' : 'sumula_stf' };
  return null;
}
function indicePorBase(J) {
  if (J._porBase) return J._porBase;
  const m = new Map();
  for (const r of J.idx || []) {
    const k = r[1] + '|' + r[2];
    if (!m.has(k)) m.set(k, new Map());
    const porNum = m.get(k);
    if (!porNum.has(r[3])) porNum.set(r[3], []);
    porNum.get(r[3]).push(r);
  }
  Object.defineProperty(J, '_porBase', { value: m, enumerable: false });
  return m;
}
export function linhasDoAcervo(J, fonte, colecao, numero, vinculante) {
  const b = baseDaColecao(fonte, colecao, vinculante);
  if (!b || !J) return [];
  const porNum = indicePorBase(J).get(b.trib + '|' + b.base);
  return (porNum && porNum.get(numero)) || [];
}
/** Todas as linhas de uma coleção do acervo, por número (para as listas de súmulas). */
export function acervoDaColecao(J, fonte, colecao, vinculante) {
  const b = baseDaColecao(fonte, colecao, vinculante);
  const porNum = b && J ? indicePorBase(J).get(b.trib + '|' + b.base) : null;
  return porNum || new Map();
}
/** `acompanhado` (o acervo tem verbete com esse número nessa coleção) e o título exato do
 *  verbete, que é o termo do "Abrir no JURIS": 'Tema 457 (RG)', 'Súmula Vinculante 63'. */
export function acompanhamento(J, fonte, colecao, numero, vinculante) {
  const L = linhasDoAcervo(J, fonte, colecao, numero, vinculante);
  if (!L.length) return { acompanhado: false, termoJuris: null };
  const r = L.find((x) => x[8] != null) || L[0];
  return { acompanhado: true, termoJuris: r[4] || null };
}

/** O acervo já mostra o estado que o item aponta? true = baixa ("No acervo · já no JURIS");
 *  false = não; null = não dá para afirmar (sem o texto do acervo, ou campo que o acervo não
 *  tem) — e então nada muda, nem baixa nem baixa desfeita. Comparação parcial nunca chega
 *  aqui (mesclarNovidades não pergunta). */
export function colecaoNoAcervo(it, J) {
  if (!it || !J) return null;
  const L = linhasDoAcervo(J, it.fonte, it.colecao, it.numero, it.vinculante);
  const situacaoIgual = () => L.some((r) => r[8] != null && normLeve(r[8]) === normLeve(it.depois));
  switch (it.tipo) {
    case 'tema-afetado': case 'sumula-nova': return L.length > 0;
    case 'julgamento': case 'acordao-publicado': return situacaoIgual();
    case 'situacao': return it.colecao === 'sumulas' ? null : situacaoIgual();
    case 'tese-fixada': {
      if (!J.temTexto) return null;
      const b = normForte(it.depois);
      if (!b) return false;
      return L.some((r) => { const en = J.texto(r[0]); if (!en) return false; const a = normForte(en); return a === b || a.includes(b); });
    }
    case 'modulacao': return null;
    case 'sumula-cancelada': return L.some((r) => r[8] === 'Cancelada' || r[8] === 'Revogada');
    case 'sumula-revisada': return L.some((r) => r[8] === 'Alterada' && dataBR(r[7]) === it.julgadoEm);
    default: return null;
  }
}

let _J = null;
/** O acervo do JURIS, carregado uma vez por processo. juris-text.js (10 MB) só se existir no
 *  disco: na rotina existe; na função da Vercel não vai junto, e aí `temTexto` é falso (a baixa
 *  de tese fica com a rotina). */
export function baseJuris() {
  if (_J) return _J;
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(join(RAIZ, 'juris-index.js'), 'utf8'), ctx);
  const idx = ctx.window.__JURIS_IDX__;
  if (!Array.isArray(idx) || !idx.length) throw new Error('juris-index.js não define window.__JURIS_IDX__ com verbetes');
  let TXT = null;
  const pTxt = join(RAIZ, 'juris-text.js');
  if (existsSync(pTxt)) {
    const c2 = { window: {} };
    vm.createContext(c2);
    vm.runInContext(readFileSync(pTxt, 'utf8'), c2);
    TXT = c2.window.__JURIS_TXT__ || null;
  }
  _J = { idx, temTexto: !!TXT, texto: (id) => (TXT && TXT[id] ? TXT[id].en : undefined), ur: (id) => (TXT && TXT[id] ? TXT[id].ur : undefined) };
  return _J;
}

// ── Linha de base: sentinela/retratos.json ──────────────────────────────────
export function lerRetratos(arq = ARQ_RETRATOS) {
  if (!existsSync(arq)) return {};
  // Arquivo ilegível vale como ausente: a coleção vira falha ("sem linha de base"), nunca
  // 1.479 temas afetados.
  try { const R = JSON.parse(readFileSync(arq, 'utf8')); return R && typeof R === 'object' ? R : {}; } catch (_) { return {}; }
}
const ORDEM_CHAVES = ['stf.rg', 'stj.repetitivos', 'stj.sumulas'];
const ORDEM_TEMA = {
  'stf.rg': ['s', 'h', 't', 'tc', 'dt', 'ob'],
  'stj.repetitivos': ['s', 't', 'm', 'af', 'jg', 'pb', 'tj', 'md', 'ea'],
};
const ordenado = (o, chaves) => { const x = {}; for (const k of chaves) if (k in o) x[k] = o[k]; for (const k of Object.keys(o)) if (!(k in x)) x[k] = o[k]; return x; };
/** O texto do retratos.json: UM tema por linha, chaves numa ordem fixa e temas em ordem
 *  numérica — o diff diário do PR mostra só os temas que mudaram. JSON.parse dele é igual a R. */
export function conteudoRetratos(R) {
  const chaves = [...ORDEM_CHAVES.filter((k) => k in R), ...Object.keys(R).filter((k) => k !== 'versao' && !ORDEM_CHAVES.includes(k)).sort()];
  const partes = [`"versao": ${JSON.stringify(R.versao ?? 1)}`];
  for (const k of chaves) {
    const e = R[k];
    if (!e || typeof e !== 'object' || !e.temas || typeof e.temas !== 'object') { partes.push(`${JSON.stringify(k)}: ${JSON.stringify(e)}`); continue; }
    const { temas, ...cab } = e;
    const cabJson = JSON.stringify(cab);
    const abre = cabJson === '{}' ? '{"temas": {' : cabJson.slice(0, -1) + ',"temas": {';
    const nums = Object.keys(temas).sort((a, b) => Number(a) - Number(b));
    const linhas = nums.map((n) => `${JSON.stringify(n)}: ${JSON.stringify(ordenado(temas[n], ORDEM_TEMA[k] || []))}`);
    partes.push(`${JSON.stringify(k)}: ${abre}${linhas.length ? '\n' + linhas.join(',\n') + '\n' : '\n'}}}`);
  }
  return '{\n' + partes.join(',\n') + '\n}\n';
}
/** Erro padrão da coleção sem linha de base: falha, nunca uma enxurrada de "tema afetado". */
export const semLinhaDeBase = (chave) => `sem linha de base (sentinela/retratos.json, chave ${chave}): rode node scripts/sentinela.mjs --semear-retrato`;

// ── Texto de HTML ───────────────────────────────────────────────────────────
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export const desentidade = (s) => String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const c = /^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(c) ? String.fromCodePoint(c) : m; }
  return ENT[e.toLowerCase()] ?? m;
});
