// tests/sentinela-colecoes.mjs — régua da Fase 2 do sentinela: repercussão geral do STF,
// recursos repetitivos do STJ e súmulas (STJ e STF), casos S22 a S28.
//
// Sem rede. As fixtures são recortes LITERAIS das páginas oficiais (tests/fixtures/stf-rg,
// stj-repetitivos e sumulas, cada pasta com o manifesto da coleta). Onde um caso precisa de uma
// página que a fonte não serve pronta (uma faixa pequena e consistente, uma tese editada), a
// edição é SINTÉTICA e está dita no comentário do caso. Toda chamada de rodar() injeta a busca
// (rota por URL para a fixture), a espera (que só registra os milissegundos pedidos), a linha
// de base, o acervo e o modo.
//
// Chamada no fim de testarSentinela (tests/sentinela.mjs), então `node tests/sentinela.mjs` e a
// suíte Chromium (tests/run.mjs) rodam tudo.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { spawnSync } from 'node:child_process';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import {
  COBERTURA, COLECOES, carimbar, consultarJuris, estadoDeFalha, mesclarNovidades, rodar, semente, semearRetrato, ultimasEdicoes,
} from '../scripts/sentinela.mjs';
import {
  pior, conteudoRetratos, colecaoNoAcervo, acompanhamento, acervoDaColecao, pendenciaColecao, baseJuris, lerRetratos,
} from '../scripts/lib/colecoes.mjs';
import { hostPermitido, cabecalhosPermitidos } from '../scripts/lib/tls-fontes.mjs';
import {
  URL_EXPORT_RG, lerExportRG, retratoRG, compararRG, lerAndamentosRG, incidenteDaPaginaTema, consultarRG, PARCIAL_TESE_RG,
} from '../scripts/lib/stf-rg.mjs';
import {
  urlFaixaRep, parseBloco, parsePaginaRepetitivos, retratoTemaRep, trechoModulacao, compararRepetitivos, faixasDaVarredura,
  CSV_TEMAS_REP,
  consultarRepetitivos,
} from '../scripts/lib/stj-repetitivos.mjs';
import {
  URL_VERBETES_STJ, urlListaSTF, urlDetalheSTF, textoDoPdf, listaVerbetesSTJ, sumulasDoInformativo, listaSumulasSTF, detalheSumulaSTF,
  compararLista, compararInformativo, juntarPorId, consultarSumulasSTJ, consultarSumulasSTF,
} from '../scripts/lib/sumulas.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FX = path.join(RAIZ, 'tests/fixtures');
const ler = (f) => readFileSync(path.join(FX, f), 'utf8');
const lerL1 = (f) => readFileSync(path.join(FX, f)).toString('latin1');
const lanca = (fn, re) => { try { fn(); return false; } catch (e) { return re.test(e.message); } };
const QUANDO = '2026-10-01T22:00:00.000Z';
const ids = (itens) => itens.map((i) => i.id).sort();
const tipos = (itens) => itens.map((i) => `${i.numero}:${i.tipo}`).sort();

/** Contexto de coleção falso: a espera só registra; o prazo é zero (rotina) salvo pedido. */
function ctxDe({ modo = 'rotina', buscar, retratos = {}, J, limiares = {}, lerPdf, esperas = [] }) {
  return { modo, prazo: 0, busca: { buscar, esperar: async (ms) => { esperas.push(ms); }, lerPdf }, retratos, J: () => J,
    limiares: { minLinhasRG: 0, volumeMax: 50, sumidosMax: 5, ...limiares }, quando: QUANDO };
}

// ── Peças das fixtures de repercussão geral ─────────────────────────────────
const EXP25 = ler('stf-rg/export-2026-09-25.html');
const EXP01 = ler('stf-rg/export-2026-10-01.html');
const linhasRG = (html) => [...html.slice(html.indexOf('</thead>')).matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/gi)].map((m) => m[0]);
const numLinha = (tr) => Number(/<td[^>]*>\s*(\d+)\s*<\/td>/.exec(tr)[1]);
const semTemas = (html, nums) => linhasRG(html).filter((tr) => nums.includes(numLinha(tr))).reduce((h, tr) => h.replace(tr, ''), html);
const trocaCelula = (html, n, col, conteudo) => {
  const tr = linhasRG(html).find((t) => numLinha(t) === n);
  let k = -1;
  return html.replace(tr, tr.replace(/(<td[^>]*>)([\s\S]*?)(<\/td>)/gi, (m, a, b, c) => (++k === col ? a + conteudo + c : m)));
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const T25 = lerExportRG(EXP25, { minLinhas: 0 });
const T01 = lerExportRG(EXP01, { minLinhas: 0 });
const R25 = { lidoEm: '2026-09-25T22:44:00.000Z', origem: 'fixture de 25/09/2026', ...retratoRG(T25) };
const R01 = { lidoEm: '2026-10-01T21:55:00.000Z', origem: 'fixture de 01/10/2026', ...retratoRG(T01) };
// Acervo injetado com os verbetes reais da amostra (457, 474 e 912), no formato do índice.
const AM = JSON.parse(ler('stf-rg/acervo-amostra.json')).registros;
const J_AMOSTRA = { idx: AM.map((r) => [r.id, 'STF', 'repercussao_geral', r.numero, r.titulo, null, null, r.data, r.situacao, 0]), temTexto: true,
  texto: (id) => (AM.find((r) => r.id === id) || {}).en, ur: (id) => (AM.find((r) => r.id === id) || {}).ur };
const TESES = JSON.parse(ler('stf-rg/teses-com-2026-10-01.json'));
// tema.asp SINTÉTICA da 1113 e da 1253: só o link dos andamentos, montado com os incidentes
// REAIS do banco de teses (a página real tem 62 KB; o recorte real da 1485 prova o leitor).
const temaSintetico = (n) => { const t = TESES.find((x) => +x.numeroTema === n);
  return `<html><body><a href="verAndamentoProcesso.asp?incidente=${t.incidente}&numeroProcesso=${t.numeroProcesso}&classeProcesso=${t.siglaClasse}&numeroTema=${n}">${n}</a></body></html>`; };
function rotaRG(exp) {
  const urls = [];
  const fn = async (u) => {
    urls.push(u);
    if (u === URL_EXPORT_RG) return { status: 200, tam: exp.length, texto: exp };
    const mt = /tema\.asp\?num=(\d+)$/.exec(u);
    if (mt && [1113, 1253].includes(+mt[1])) return { status: 200, tam: 1, texto: temaSintetico(+mt[1]) };
    const ma = /verAndamentoProcesso\.asp\?.*numeroTema=(\d+)$/.exec(u);
    if (ma && [1113, 1253].includes(+ma[1])) return { status: 200, tam: 1, texto: ler(`stf-rg/andamentos-${ma[1]}.html`) };
    return { status: 404, tam: 0, texto: '' };
  };
  fn.urls = urls;
  return fn;
}

// ── Peças das fixtures de repetitivos ───────────────────────────────────────
const MAN_REP = JSON.parse(ler('stj-repetitivos/manifesto.json'));
const BLOCO = (n) => ler(`stj-repetitivos/tema-${n}.html`);
const T = Object.fromEntries([702, 1228, 1455, 1474].map((n) => [n, parseBloco(BLOCO(n))]));
const blocosDe = (html) => html.split('<div class="container containerDocumento">').slice(1).map(parseBloco).filter(Boolean);
const AMOSTRA_REP = blocosDe(lerL1('stj-repetitivos/amostra-126-1009-2026-09-25.html'));
const T126 = AMOSTRA_REP.find((t) => t.numero === 126), T1009 = AMOSTRA_REP.find((t) => t.numero === 1009);
// Página SINTÉTICA (a única forma de ter uma faixa pequena e consistente): o contador real da
// faixa 1451–1500 com "Temas (24)" → "Temas (2)" e "24 documentos" → "2 documentos", mais os
// blocos literais dos Temas 1455 e 1474.
const CAB = ler('stj-repetitivos/cabecalho-1451-1500.html');
const PAG_SINT = CAB.replace('Temas (24)', 'Temas (2)').replace('24 documentos', '2 documentos') + BLOCO(1455) + BLOCO(1474);
const VAZIA = lerL1('stj-repetitivos/vazia-2026-10-01.html');
const PADRAO_REP = { s: 'Afetado', t: '', m: 0, af: '', jg: '', pb: '', tj: '', md: '', ea: 0 };

// ── Peças das fixtures de súmulas ───────────────────────────────────────────
const IDX_STJ = ler('sumulas/stj-verbetes-indice.txt').split('\n').filter((l) => l && !l.startsWith('#'))
  .map((l) => { const [n, m, d] = l.split('|'); return { numero: +n, marca: m ? m.toLowerCase() : null, julgadoEm: d || null }; });
const IDX_30 = ler('sumulas/stf-sumarios-30-indice.txt').split('\n').filter((l) => l && !l.startsWith('#'))
  .map((l) => { const [n, m, id] = l.split('|'); return { numero: +n, marca: m || null, id }; });
const LISTA_26 = ler('sumulas/stf-sumarios-26.html');
// A lista base=30 inteira, montada do índice real (736 linhas número|marca|id) no formato real
// do portal (o recorte stf-sumarios-30-amostra.html mostra a marcação).
const pagina30 = (lista) => '<div class="sumarioSumulas">' + lista.map((o) => `<div class="sumula-item"><a target="_blank" href="sumariosumulas.asp?base=30&sumula=${o.id}">\n\tSúmula ${o.numero}${o.marca ? ` <em>(${o.marca})</em>` : ''}\n</a></div>`).join('') + '</div>';
// O texto que o PDF.js tiraria de um PDF com estas súmulas (formato das páginas reais).
const textoPdf = (lista, enunciado = (n) => `Enunciado da súmula ${n}.`) => lista.map((o) =>
  `l SÚMULA ${o.numero}${o.marca ? ` (SÚMULA ${o.marca.toUpperCase()})` : ''} VEJA MAIS\n\n${enunciado(o.numero)} (SÚMULA ${o.numero}, SEGUNDA\nSEÇÃO, julgado em ${o.julgadoEm || ''}, DJe 01/01/2000)\n`).join('\n');
const LM = 'Fri, 05 Dec 2025 14:13:46 GMT';
const R_SUM = { 'stj.sumulas': { lidoEm: '2026-10-02T01:00:00.000Z', origem: 'teste', pdf: { lastModified: LM, etag: 'W/"417469-1764944026035"', bytes: 417469, verbetes: 676, maior: 676 } } };

// ── Informativos (os títulos reais de 01/10/2026) ───────────────────────────
const MAN_INF = JSON.parse(ler('informativos/manifesto.json'));
const porUrlInf = new Map(MAN_INF.paginas.map((p) => [p.url, p]));
const pagInf = (p) => ({ status: p.status, tam: p.bytes, texto: p.titulo == null ? '' : `<html><head><title>${p.titulo}</title></head><body>…</body></html>` });
const rotaInfSTF = (u) => {
  const p = porUrlInf.get(u);
  if (p) return pagInf(p);
  const m = /informativo(\d+)\.htm$/.exec(u);
  if (m) return +m[1] >= 1226 && +m[1] <= 1229 ? pagInf({ status: 200, bytes: 1, titulo: `Brasília, ${+m[1] - 1205} de setembro de 2026 Nº ${m[1]}` }) : { status: 404, tam: 0, texto: '' };
  return null;
};

export async function testarColecoes(ok) {
  const JV = baseJuris();   // o acervo VIVO do JURIS (juris-index.js + juris-text.js)

  // ══ S22 — contrato e cobertura ═══════════════════════════════════════════
  {
    const esp = { stf: ['informativo', 'rg', 'sumulas'], stj: ['informativo', 'repetitivos', 'sumulas'] };
    ok(Object.entries(esp).every(([f, l]) => JSON.stringify(Object.keys(COLECOES[f])) === JSON.stringify(l))
      && Object.values(COLECOES).flatMap((c) => Object.values(c)).every((c) => c.rotulo && c.rotuloCurto && c.monitora && Array.isArray(c.limites) && c.limites.length > 0),
      'S22a o STF tem Informativo, repercussão geral e súmulas; o STJ, Informativo, repetitivos e súmulas — cada coleção com rótulo, o que monitora e limites');
    const tem = (f) => Object.values(COLECOES[f]).every((c) => c.limites.every((l) => COBERTURA[f].limites.includes(`${c.rotuloCurto}: ${l}`)))
      && COBERTURA[f].limites.some((l) => /não significa, sozinha, superação/.test(l));
    ok(tem('stf') && tem('stj') && !COBERTURA.planalto.colecoes && COBERTURA.planalto.limites.length === 5
      && /^só as \d+ normas/.test(COBERTURA.planalto.limites[0]) && COBERTURA.stf.colecoes === COLECOES.stf,
      'S22b os limites da fonte são DERIVADOS das coleções (com o rótulo curto na frente) mais o geral da superação; o Planalto fica como estava');
    const s = semente();
    const rg = s.fontes.stf.colecoes.rg;
    const todas = Object.values(s.fontes).flatMap((f) => Object.values(f.colecoes || {}));
    ok(rg.rotulo === COLECOES.stf.rg.rotulo && rg.rotuloCurto && rg.monitora && rg.limites.length
      && ['resultado', 'ultimaTentativa', 'ultimoSucesso', 'ultimaLeituraCompleta', 'erro', 'detalhe'].every((k) => k in rg && rg[k] === null)
      && todas.length === 6 && todas.every((c) => c.resultado != null || (c.ultimaTentativa == null && c.ultimoSucesso == null && c.ultimaLeituraCompleta == null)),
      'S22c a semente traz cada coleção "nunca consultada": a cobertura e resultado, datas, erro e detalhe nulos');

    ok(pior('sem-novidade', 'novidades') === 'novidades' && pior('novidades', 'parcial') === 'parcial'
      && pior(['parcial', 'falha', 'sem-novidade']) === 'falha' && pior() === null,
      'S22d1 pior(): falha > parcial > novidades > sem-novidade');
    const A = '2026-09-20T12:00:00.000Z', H = '2026-10-01T12:00:00.000Z';
    const ant = { ultimoSucesso: A, colecoes: {
      repetitivos: { resultado: 'sem-novidade', ultimaTentativa: A, ultimoSucesso: A, ultimaLeituraCompleta: A },
      sumulas: { resultado: 'novidades', ultimaTentativa: A, ultimoSucesso: A, ultimaLeituraCompleta: A, erro: null, detalhe: 'velho' },
      informativo: { resultado: 'sem-novidade', ultimaTentativa: A, ultimoSucesso: A, ultimaLeituraCompleta: A } } };
    const c = carimbar('stj', ant, { estado: 'falha', erro: 'x', detalhe: '', itens: [], colecoes: {
      repetitivos: { estado: 'parcial', erro: 'cauda', detalhe: 'd', itens: [] }, informativo: { estado: 'falha', erro: 'caiu', detalhe: '', itens: [] } } }, H);
    const cr = c.colecoes.repetitivos, ci = c.colecoes.informativo, cs = c.colecoes.sumulas;
    ok(cr.resultado === 'parcial' && cr.ultimoSucesso === H && cr.ultimaLeituraCompleta === A && cr.ultimaTentativa === H
      && ci.resultado === 'falha' && ci.ultimoSucesso === A && ci.ultimaLeituraCompleta === A
      && cs.resultado === 'novidades' && cs.ultimaTentativa === A && cs.detalhe === 'velho' && cs.rotulo === COLECOES.stj.sumulas.rotulo
      && c.ultimoSucesso === A,
      'S22d carimbar por coleção: parcial anda o último sucesso e NÃO a última leitura completa; falha preserva os dois; a coleção que não rodou herda o diário');

    const busca503 = async () => ({ status: 503, tam: 0, texto: '' });
    const ctx = (idsC) => ({ modo: 'ao-vivo', prazo: 0, busca: { buscar: busca503, esperar: async () => {} }, retratos: {}, J: () => JV, ult: null, ids: idsC, limiares: {} });
    const um = await consultarJuris('stf', ctx(['rg']));
    const dois = await consultarJuris('stf', ctx(['rg', 'sumulas']));
    ok(/^sem linha de base/.test(um.erro || '') && !/Repercussão geral:/.test(um.erro) && um.estado === 'falha'
      && /^Repercussão geral: sem linha de base/.test(dois.erro || '') && /; Súmulas: /.test(dois.erro || '') && dois.estado === 'falha',
      'S22e com UMA coleção, erro e detalhe da fonte são os dela, sem prefixo; com duas, cada um vem com o rótulo curto da coleção');

    // 03/10/2026: dadosabertos.web.stj.jus.br ENTRA (Temas.csv, filtro das faixas de repetitivos).
    ok(['portal.stf.jus.br', 'www.stf.jus.br', 'www.stj.jus.br', 'processo.stj.jus.br', 'dadosabertos.web.stj.jus.br'].every(hostPermitido)
      && !['scon.stj.jus.br', 'jurisprudencia.stf.jus.br', 'bdjur.stj.jus.br', 'portal.stf.jus.br.exemplo.com', 'evil.web.stj.jus.br', 'dadosabertos.web.stj.jus.br.exemplo.com'].some(hostPermitido)
      && JSON.stringify(cabecalhosPermitidos({ 'if-modified-since': 'x', cookie: 'y' })) === JSON.stringify({ 'if-modified-since': 'x' }),
      'S22f a lista de hosts aceita portal/www do STF, www/processo do STJ e o portal de dados abertos do STJ, e recusa SCON, jurisprudencia.stf, BDJur e imitação; só o cabeçalho condicional passa');

    const R = { versao: 1, 'stf.rg': { lidoEm: A, origem: 'o', ultimoTema: 10, total: 3, temas: { 10: { s: 'C', h: 'Há', t: '', tc: 0, dt: '', ob: '' }, 2: { s: 'B', h: 'Há', t: 'x', tc: 0, dt: '', ob: '' }, 1: { s: 'A', h: 'Não há', t: '', tc: 0, dt: '', ob: 'ab12cd34' } } },
      'stj.repetitivos': { lidoEm: A, origem: 'o', ultimoTema: 5, total: 1, temas: { 5: { s: 'Afetado', t: '', m: 0, af: '', jg: '', pb: '', tj: '', md: '', ea: 0 } } },
      'stj.sumulas': { lidoEm: A, origem: 'o', pdf: { lastModified: LM, etag: 'e', bytes: 1, verbetes: 676, maior: 676 } } };
    const txt = conteudoRetratos(R);
    const L = txt.split('\n');
    const pos = (n) => L.findIndex((l) => l.startsWith(`"${n}": {"s":`));
    ok(isDeepStrictEqual(JSON.parse(txt), R) && pos(1) > 0 && pos(2) === pos(1) + 1 && pos(10) === pos(2) + 1 && L[pos(1)].endsWith(',')
      && L.filter((l) => /^"\d+": \{"s":/.test(l)).length === 4,
      'S22g retratos.json: um tema por linha, em ordem numérica, e a ida e volta pelo JSON dá o mesmo objeto');
  }

  // ══ S23 — STF, repercussão geral ═════════════════════════════════════════
  {
    ok(T01.size === 14 && T01.get(1483).haRG === 'Há (com reafirmação de jurisprudência)' && T01.get(38).haRG === 'Não há'
      && T01.get(1234).tese.length >= 7800 && T01.get(1113).dataTese === '28/09/2026' && T01.has(38) && !T01.has('0038'),
      'S23a o export real de 01/10 lido: 14 temas, a coluna "Há Repercussão" sem a acentuação quebrada, a tese cortada da 1234, a Data da Tese da 1113 e o número sem zero à esquerda');
    const linha14 = (() => { const tr = linhasRG(EXP01)[0], i = tr.lastIndexOf('<td'), j = tr.indexOf('</td>', i) + 5; return EXP01.replace(tr, tr.slice(0, i) + tr.slice(j)); })();
    const duplicado = (() => { const tr = linhasRG(EXP01)[2]; return EXP01.replace(tr, tr + '\n' + tr); })();
    ok(lanca(() => lerExportRG(ler('stf-rg/soft404-intermitente.html')), /cabeçalho das 15 colunas/)
      && lanca(() => lerExportRG(linha14, { minLinhas: 0 }), /14 células em vez de 15/)
      && lanca(() => lerExportRG(EXP01), /trouxe 14 temas \(mínimo 1400\)/)
      && lanca(() => lerExportRG(duplicado, { minLinhas: 0 }), /repetido/),
      'S23b travas da lista: o "404 Desculpe" servido com HTTP 200, linha com 14 células (edição sintética), menos de 1.400 temas e tema repetido — todas lançam');
    const c = compararRG(R25.temas, T01);
    const esperado = ['1071:julgamento', '1113:julgamento', '1113:tese-fixada', '1253:acordao-publicado', '1470:situacao',
      '1483:julgamento', '1483:tema-afetado', '1483:tese-fixada', '1484:tema-afetado', '1485:tema-afetado'];
    ok(JSON.stringify(tipos(c.itens)) === JSON.stringify(esperado.sort()) && c.sumiram.length === 0
      && ['STF-RG-1113-tese-fixada-5c4f5d36', 'STF-RG-1253-acordao-publicado-ec833b88', 'STF-RG-1484-tema-afetado-158a6668'].every((id) => c.itens.some((i) => i.id === id))
      && ![38, 210, 457, 474, 912, 1234, 1451].some((n) => c.itens.some((i) => i.numero === n)),
      'S23c retrato de 25/09 × lista de 01/10: EXATAMENTE os 10 itens (1071, 1113 ×2, 1253, 1470, 1483 ×3, 1484, 1485), com os ids da especificação, e nada para 38, 210, 457, 474, 912, 1234 e 1451');
    const i1113 = c.itens.find((i) => i.id === 'STF-RG-1113-julgamento-d4fc0209');
    const t1113 = c.itens.find((i) => i.tipo === 'tese-fixada' && i.numero === 1113);
    ok(i1113 && i1113.julgadoEm === '28/09/2026' && i1113.antes === 'Acórdão de Repercussão Geral publicado' && t1113.antes === null && t1113.revisar === true
      && c.itens.every((i) => i.vigencia === null && i.revisar === true && /^https:\/\/portal\.stf\.jus\.br\/jurisprudenciaRepercussao\/tema\.asp\?num=\d+$/.test(i.urlOficial)),
      'S23c2 o julgamento da 1113 traz a data da tese (28/09/2026), não a da preliminar; a tese nova nasce sem "antes"; todo item vai para conferência, sem vigência, com o link do tema');
    ok(compararRG(R01.temas, T01).itens.length === 0, 'S23d a lista de 01/10 contra o próprio retrato não gera nada');

    const exp6 = semTemas(EXP01, [457, 474, 912, 1451, 210, 38]);
    const r6 = await consultarRG(ctxDe({ modo: 'ao-vivo', buscar: async () => ({ status: 200, texto: exp6 }), retratos: { 'stf.rg': R25 }, J: J_AMOSTRA }));
    const exp1 = semTemas(EXP01, [457]);
    const r1 = await consultarRG(ctxDe({ modo: 'ao-vivo', buscar: async () => ({ status: 200, texto: exp1 }), retratos: { 'stf.rg': R25 }, J: J_AMOSTRA }));
    ok(r6.estado === 'falha' && /6 temas da leitura anterior não vieram/.test(r6.erro) && r6.itens.length === 0
      && r1.estado === 'parcial' && /Tema 457 não veio na lista oficial; não é tratado como cancelamento/.test(r1.erro)
      && !r1.itens.some((i) => i.numero === 457) && isDeepStrictEqual(r1.retrato.temas[457], R25.temas[457]),
      'S23e seis temas sumidos da lista é leitura suspeita (falha); um só deixa a coleção parcial, sem item de cancelamento, e o retrato novo mantém a entrada dele');

    const semTese = lerExportRG(trocaCelula(EXP01, 1113, 12, '-'), { minLinhas: 0 });
    ok(compararRG(R01.temas, semTese).itens.length === 0 && retratoRG(semTese, R01.temas).temas[1113].t === R01.temas[1113].t && R01.temas[1113].t.length > 50,
      'S23f tese oficial vazia (edição sintética da 1113) não gera item nem apaga a tese registrada — vazio nunca apaga cheio');

    const t1234 = T01.get(1234).tese;
    const cauda = lerExportRG(trocaCelula(EXP01, 1234, 12, esc(t1234.slice(0, -30) + 'Z'.repeat(30))), { minLinhas: 0 });
    const comeco = lerExportRG(trocaCelula(EXP01, 1234, 12, esc(t1234.slice(0, 10) + 'XXXXXXXXXX' + t1234.slice(20))), { minLinhas: 0 });
    const ic = compararRG(R01.temas, comeco).itens;
    ok(compararRG(R01.temas, cauda).itens.length === 0 && ic.length === 1 && ic[0].tipo === 'tese-fixada' && ic[0].parcial === true
      && ic[0].parcialMotivo === PARCIAL_TESE_RG && !mesclarNovidades([], ic, null, () => true).itens[0].incorporado,
      'S23g tese cortada em 8.000 caracteres (1234): mudança só no fim não gera item; mudança no começo gera tese-fixada PARCIAL, com o motivo — e parcial nunca recebe baixa');

    const cancelada = lerExportRG(trocaCelula(trocaCelula(EXP01, 457, 11, 'Cancelado'), 457, 14, 'Motivo do cancelamento: edição sintética da régua.'), { minLinhas: 0 });
    const c457 = compararRG(R01.temas, cancelada, { acompanhamento: (n) => acompanhamento(J_AMOSTRA, 'stf', 'rg', n) }).itens;
    ok(!compararRG({ 38: { s: 'Cancelado', h: 'Não há', t: '', tc: 0, dt: '', ob: '' } }, new Map([[38, T01.get(38)]])).itens.length
      && c457.length === 1 && c457[0].tipo === 'situacao' && /^Motivo do cancelamento/.test(c457[0].observacao || '') && c457[0].antes === 'Trânsito em Julgado',
      'S23h tema cancelado: o motivo na coluna Tese (38) não vira tese; a 457 passada a "Cancelado" (sintético) dá mudança de situação com o motivo da fonte');

    const and1113 = lerAndamentosRG(ler('stf-rg/andamentos-1113.html')), and1253 = lerAndamentosRG(ler('stf-rg/andamentos-1253.html'));
    ok(and1113.julgadoEm === '28/09/2026' && and1113.publicadoEm === null && and1253.julgadoEm === '12/03/2026' && and1253.publicadoEm === '30/09/2026',
      'S23i andamentos reais: 1113 julgada em 28/09/2026 sem acórdão de mérito (a publicação de 2020 é da preliminar); 1253 com acórdão em 30/09/2026 — a linha RE-RG de 04/03/2024 não conta');

    ok(c457[0].acompanhado === true && c457[0].termoJuris === 'Tema 457 (RG)' && /CátedraJURIS ainda mostra o estado anterior/.test(c457[0].pendencia)
      && colecaoNoAcervo({ fonte: 'stf', colecao: 'rg', tipo: 'situacao', numero: 457, depois: 'Trânsito em Julgado' }, J_AMOSTRA) === true
      && colecaoNoAcervo({ fonte: 'stf', colecao: 'rg', tipo: 'situacao', numero: 457, depois: 'Cancelado' }, J_AMOSTRA) === false
      && colecaoNoAcervo({ fonte: 'stf', colecao: 'rg', tipo: 'tese-fixada', numero: 457, depois: AM[0].en }, J_AMOSTRA) === true
      && colecaoNoAcervo({ fonte: 'stf', colecao: 'rg', tipo: 'tese-fixada', numero: 457, depois: AM[0].en }, { ...J_AMOSTRA, temTexto: false }) === null,
      'S23j acervo injetado: item da 457 é acompanhado, com o título do verbete; a baixa vale quando a situação ou a tese do acervo é a mesma; sem o texto do acervo, a tese fica "não sei" (null)');

    const comData = lerExportRG(trocaCelula(EXP01, 1483, 13, '30/09/2026'), { minLinhas: 0 });
    ok(JSON.stringify(ids(compararRG(R25.temas, T01).itens)) === JSON.stringify(ids(c.itens))
      && !compararRG(R01.temas, comData).itens.some((i) => i.tipo === 'julgamento'),
      'S23k os mesmos insumos dão os mesmos ids; a 1483 já em "Mérito julgado" no retrato não ganha segundo julgamento quando a Data da Tese aparece');

    const esperas = [];
    const ra = rotaRG(EXP01);
    const vivo = await rodar({ fontes: ['stf'], colecoes: ['rg'], modo: 'ao-vivo', busca: { buscar: ra, esperar: async (ms) => { esperas.push(ms); } },
      retratos: { 'stf.rg': R25 }, juris: J_AMOSTRA, limiares: { minLinhasRG: 0 }, anterior: { fontes: {} }, atuais: [], silencioso: true });
    ok(vivo.estado.fontes.stf.colecoes.rg.resultado === 'novidades' && vivo.itens.length === 10 && JSON.stringify(ra.urls) === JSON.stringify([URL_EXPORT_RG])
      && /datas dos andamentos só na rotina diária/.test(vivo.estado.fontes.stf.detalhe) && vivo.estado.fontes.stf.colecoes.informativo.resultado === null,
      'S23l ao vivo: a coleção traz os 10 itens com UM pedido só (o export), e o detalhe avisa que as datas dos andamentos ficam para a rotina');
    const rr = rotaRG(EXP01);
    const esp2 = [];
    const rot = await rodar({ fontes: ['stf'], colecoes: ['rg'], modo: 'rotina', busca: { buscar: rr, esperar: async (ms) => { esp2.push(ms); } },
      retratos: { 'stf.rg': R25 }, juris: J_AMOSTRA, limiares: { minLinhasRG: 0 }, anterior: { fontes: {} }, atuais: [], silencioso: true });
    const de = (id) => rot.itens.find((i) => i.id === id) || {};
    const pedidosTema = rr.urls.filter((u) => /tema\.asp/.test(u)).map((u) => +/num=(\d+)/.exec(u)[1]).sort((a, b) => a - b);
    ok(de('STF-RG-1253-acordao-publicado-ec833b88').publicadoEm === '30/09/2026' && de('STF-RG-1253-acordao-publicado-ec833b88').julgadoEm === '12/03/2026'
      && de('STF-RG-1113-julgamento-d4fc0209').julgadoEm === '28/09/2026' && /datas oficiais lidas em 2 de 4 tema\(s\)/.test(rot.estado.fontes.stf.detalhe)
      && JSON.stringify(pedidosTema) === JSON.stringify([1071, 1113, 1253, 1483]) && esp2.length >= 5 && esp2.every((ms) => ms >= 3000)
      && rot.retratos['stf.rg'].ultimoTema === 1485 && rot.retratosMudados.includes('stf.rg'),
      'S23l2 rotina: datas dos andamentos para os 4 temas que mudaram de fase (1470 não, P→R não é trânsito) — 1253 publicada em 30/09/2026, 1113 julgada em 28/09/2026, "2 de 4"; pausa de 3 s entre pedidos; o retrato novo vai até o Tema 1485');
    ok(JSON.stringify(incidenteDaPaginaTema(ler('stf-rg/tema-1485-recorte.html'), 1485)) === JSON.stringify({ incidente: '7563417', numeroProcesso: '1600294', classe: 'ARE' })
      && incidenteDaPaginaTema(ler('stf-rg/tema-1485-recorte.html'), 148) === null,
      'S23l3 o incidente sai do link real de tema.asp (Tema 1485: 7563417, ARE 1600294), com o "&" cru, e só para o número pedido');

    const zero = rotaRG(EXP01);
    const semBase = await rodar({ fontes: ['stf'], colecoes: ['rg'], modo: 'ao-vivo', busca: { buscar: zero, esperar: async () => {} },
      retratos: {}, juris: J_AMOSTRA, anterior: { fontes: {} }, atuais: [], silencioso: true });
    ok(semBase.estado.fontes.stf.resultado === 'falha' && /sem linha de base \(sentinela\/retratos\.json, chave stf\.rg\)/.test(semBase.estado.fontes.stf.erro)
      && semBase.itens.length === 0 && zero.urls.length === 0,
      'S23m sem linha de base a coleção é falha, sem item nenhum e sem pedido nenhum — nunca 1.479 temas afetados');

    const tr1484 = linhasRG(EXP01).find((t) => numLinha(t) === 1484);
    const muitos = EXP01.replace('</tbody>', Array.from({ length: 51 }, (_, i) => tr1484.replace(/1484/, String(2001 + i))).join('\n') + '</tbody>');
    const vol = await consultarRG(ctxDe({ modo: 'ao-vivo', buscar: async () => ({ status: 200, texto: muitos }), retratos: { 'stf.rg': R01 }, J: J_AMOSTRA }));
    ok(vol.estado === 'parcial' && /volume atípico: 51 itens/.test(vol.erro || '') && vol.itens.length === 51,
      'S23n 51 itens numa rodada (51 temas novos sintéticos) deixam a coleção parcial com "volume atípico" — os itens saem, todos para conferência');
  }

  // ══ S24 — STJ, recursos repetitivos ══════════════════════════════════════
  {
    const campos = ['situacao', 'orgao', 'afetadoEm', 'julgadoEm', 'publicadoEm', 'transitadoEm', 'teseMarcador', 'tese'];
    ok([702, 1228, 1455, 1474].every((n) => campos.every((k) => T[n][k] === MAN_REP.amostras[n].esperado[k])),
      'S24a os blocos reais 702, 1228, 1455 e 1474 batem com o manifesto: situação, órgão, as quatro datas, o marcador e a tese');
    const md = trechoModulacao(T1009.anotacoes);
    ok(T126.situacao === 'Revisado' && !!T126.campos['Entendimento Anterior'] && /^Modulação de efeitos:\n\S/.test(md || '') && md.length > 60
      && T[1228].teseMarcador === true && trechoModulacao('Tese: não há necessidade de modulação dos efeitos.') === null,
      'S24b 126 Revisado com Entendimento Anterior; 1009 com o registro "Modulação de efeitos:" e o texto que vem depois; o marcador da 1228; menção solta à modulação não conta');
    const discord = PAG_SINT.replace('2 documentos', '3 documentos');
    const umBloco = CAB.replace('Temas (24)', 'Temas (2)').replace('24 documentos', '2 documentos') + BLOCO(1455);
    const semSit = PAG_SINT.replace(/(titulo_campo_processo">\s*)Situação/, '$1Xituação');
    ok(isDeepStrictEqual(parsePaginaRepetitivos(VAZIA), { total: 0, temas: [] }) && parsePaginaRepetitivos(PAG_SINT).temas.length === 2
      && lanca(() => parsePaginaRepetitivos(discord), /contadores discordam/) && lanca(() => parsePaginaRepetitivos(umBloco), /esperado 2/)
      && lanca(() => parsePaginaRepetitivos(semSit), /sem situação/),
      'S24c a página: vazia consistente é "nenhum tema"; a sintética lê 2; contadores discordantes, bloco faltando e ficha sem situação lançam');
    const cauda = blocosDe(lerL1('stj-repetitivos/cauda-2026-10-01.html'));
    ok(JSON.stringify(cauda.map((t) => t.numero)) === JSON.stringify([1470, 1474]) && cauda[0].orgao === 'PRIMEIRA SEÇÃO' && cauda[1].orgao === 'SEGUNDA SEÇÃO',
      'S24d a cauda real lida em latin1: Temas 1470 e 1474, com "PRIMEIRA SEÇÃO" e "SEGUNDA SEÇÃO" acentuados');

    const i1455 = compararRepetitivos({ 1455: PADRAO_REP }, [T[1455]]);
    const i1474 = compararRepetitivos({}, [T[1474]]);
    const i126 = compararRepetitivos({ 126: { ...retratoTemaRep(T126), s: 'Trânsito em Julgado', t: 'tese antiga' } }, [T126]);
    const i1009 = compararRepetitivos({ 1009: { ...retratoTemaRep(T1009), md: '' } }, [T1009]);
    const de = (l, t) => l.find((i) => i.tipo === t) || {};
    ok(JSON.stringify(tipos(i1455)) === JSON.stringify(['1455:acordao-publicado', '1455:julgamento', '1455:tese-fixada'])
      && de(i1455, 'julgamento').julgadoEm === '09/09/2026' && de(i1455, 'acordao-publicado').publicadoEm === '14/09/2026'
      && JSON.stringify(tipos(compararRepetitivos({ 1228: PADRAO_REP }, [T[1228]]))) === JSON.stringify(['1228:julgamento'])
      && compararRepetitivos({ 702: retratoTemaRep(T[702]) }, [T[702]]).length === 0
      && JSON.stringify(tipos(i1474)) === JSON.stringify(['1474:tema-afetado']) && i1474[0].afetadoEm === '16/09/2026'
      && JSON.stringify(tipos(i126)) === JSON.stringify(['126:situacao', '126:tese-fixada']) && de(i126, 'situacao').depois === 'Revisado' && de(i126, 'tese-fixada').antes === 'tese antiga'
      && JSON.stringify(tipos(i1009)) === JSON.stringify(['1009:modulacao']) && /^Modulação de efeitos/.test(i1009[0].depois)
      && /modulação foi registrada pelo STJ/.test(i1009[0].pendencia),
      'S24e regras: 1455 dá julgamento, tese e acórdão (sem repetir a situação); 1228 só julgamento (o marcador nunca é tese); 702 nada; 1474 tema afetado; 126 situação e tese com o "antes"; 1009 modulação');
    const j = compararRepetitivos({ 1474: retratoTemaRep(T[1474]) }, [{ ...T[1474], julgadoEm: '20/09/2026' }]);
    const tj = compararRepetitivos({ 1455: retratoTemaRep(T[1455]) }, [{ ...T[1455], transitadoEm: '30/09/2026' }]);
    ok(j.length === 1 && j[0].tipo === 'julgamento' && j[0].depois === 'Mérito Julgado' && /a ficha ainda diz "Afetado"/.test(j[0].observacao || '')
      && tj.length === 1 && tj[0].tipo === 'situacao' && tj[0].depois === 'Trânsito em Julgado' && tj[0].transitadoEm === '30/09/2026' && /ainda diz "Acórdão Publicado"/.test(tj[0].observacao || ''),
      'S24f a data manda, não a situação atrasada: data de julgamento com a ficha "Afetado" dá julgamento com aviso; trânsito com "Acórdão Publicado" dá "Trânsito em Julgado" com aviso');

    const RET1455 = { 'stj.repetitivos': { lidoEm: '2026-09-25T22:44:23.000Z', origem: 't', ultimoTema: 1455, total: 1, temas: { 1455: retratoTemaRep(T[1455]) } } };
    const pedidos = [];
    const vivo = await rodar({ fontes: ['stj'], colecoes: ['repetitivos'], modo: 'ao-vivo', busca: { buscar: async (u) => { pedidos.push(u); return { status: 200, texto: PAG_SINT }; }, esperar: async () => {} },
      retratos: RET1455, juris: JV, anterior: { fontes: {} }, atuais: [], silencioso: true });
    const ev = vivo.estado.fontes.stj;
    const vaz = await rodar({ fontes: ['stj'], colecoes: ['repetitivos'], modo: 'ao-vivo', busca: { buscar: async () => ({ status: 200, texto: VAZIA }), esperar: async () => {} },
      retratos: RET1455, juris: JV, anterior: { fontes: {} }, atuais: [], silencioso: true });
    ok(JSON.stringify(pedidos) === JSON.stringify([urlFaixaRep(1455, 1504)]) && /cod_tema_inicial=1455&cod_tema_final=1504/.test(pedidos[0])
      && JSON.stringify(tipos(vivo.itens)) === JSON.stringify(['1474:tema-afetado']) && ev.resultado === 'parcial' && ev.colecoes.repetitivos.resultado === 'parcial'
      && /varredura completa só na rotina diária/.test(ev.detalhe) && ev.colecoes.repetitivos.ultimaLeituraCompleta === null && !vivo.retratosMudados.length
      && vaz.estado.fontes.stj.resultado === 'falha' && /a âncora \(Tema 1455, último conhecido\) não voltou/.test(vaz.estado.fontes.stj.erro),
      'S24g ao vivo: UM pedido (a cauda a partir do último tema), o 1474 como tema afetado, coleção sempre parcial e sem retrato; a página vazia sem a âncora é falha');

    const RET2 = (extras = {}) => ({ 'stj.repetitivos': { lidoEm: '2026-09-25T22:44:23.000Z', origem: 't', ultimoTema: 1474, total: 2,
      temas: { 1455: retratoTemaRep(T[1455]), 1474: retratoTemaRep(T[1474]), ...extras } } });
    const varre = async (retratos, falhaEm = () => false) => {
      const urls = [], esp = [];
      const r = await rodar({ fontes: ['stj'], colecoes: ['repetitivos'], modo: 'rotina', retratos, juris: JV, anterior: { fontes: {} }, atuais: [], silencioso: true,
        busca: { esperar: async (ms) => { esp.push(ms); }, buscar: async (u) => { urls.push(u); if (falhaEm(u)) return { status: 503, texto: '' };
          return { status: 200, texto: u === urlFaixaRep(1451, 1500) ? PAG_SINT : VAZIA }; } } });
      return { r, urls, esp, e: r.estado.fontes.stj };
    };
    const ok1 = await varre(RET2());
    // 03/10/2026: antes das faixas vem UMA leitura do Temas.csv (filtro). Aqui o stub não serve o
    // CSV (devolve a página vazia), então a varredura é completa — falha do CSV nunca é ponto cego.
    const soFaixas = (urls) => urls.filter((u) => u !== CSV_TEMAS_REP);
    ok(ok1.urls.filter((u) => u === CSV_TEMAS_REP).length === 1 && ok1.urls[0] === CSV_TEMAS_REP
      && new Set(soFaixas(ok1.urls)).size === 31 && soFaixas(ok1.urls).length === 31 && ok1.urls.at(-1) === urlFaixaRep(1501, 1550) && ok1.e.resultado === 'sem-novidade'
      && ok1.esp.length === 30 && ok1.esp.every((ms) => ms >= 3000) && ok1.r.retratos['stj.repetitivos'].ultimoTema === 1474
      && ok1.e.colecoes.repetitivos.ultimaLeituraCompleta === ok1.e.ultimaTentativa && faixasDaVarredura(1474).length === 31,
      'S24h rotina: o CSV oficial é lido uma vez; sem ele, varredura completa em 31 faixas (até a 1501–1550), pausa de ≥ 3 s entre elas, sem novidade, retrato até o 1474 e a última leitura completa carimbada');
    // 03/10/2026: num dia comum, com o CSV oficial recente e sem mudança, só a cauda é lida — e a
    // leitura NÃO é marcada como completa (o carimbo só anda na varredura inteira).
    {
      const csvTxt = 'sequencialPrecedente,tipoPrecedente,numeroPrecedente,situacao\n'
        + Array.from({ length: 1474 }, (_, k) => `${k + 1},Tema,${k + 1},${k + 1 === 1455 ? T[1455].situacao : k + 1 === 1474 ? T[1474].situacao : 'Afetado'}`).join('\n') + '\n';
      const retr = RET2(Object.fromEntries(Array.from({ length: 1474 }, (_, k) => k + 1).filter((n) => n !== 1455 && n !== 1474).map((n) => [n, { s: 'Afetado' }])));
      const urls = [];
      const rf = await consultarRepetitivos({ modo: 'rotina', retratos: retr, J: () => JV, quando: '2026-10-01T13:00:00.000Z',
        busca: { esperar: async () => {}, buscar: async (u) => { urls.push(u);
          if (u === CSV_TEMAS_REP) return { status: 200, texto: csvTxt, cabecalhos: { 'last-modified': 'Thu, 01 Oct 2026 10:00:00 GMT' } };
          return { status: 200, texto: u === urlFaixaRep(1451, 1500) ? PAG_SINT : VAZIA }; } } });
      const est = carimbar('stj', {}, { estado: rf.estado, itens: rf.itens, colecoes: { repetitivos: { estado: rf.estado, itens: rf.itens, leituraCompleta: rf.leituraCompleta } } }, 'T');
      ok(urls[0] === CSV_TEMAS_REP && urls.length === 2 && urls[1] === urlFaixaRep(1501, 1550) && rf.leituraCompleta === false
        && /filtrada pelo CSV oficial/.test(rf.detalhe) && est.colecoes.repetitivos.ultimaLeituraCompleta === null && est.ultimaLeituraCompleta === null
        && est.colecoes.repetitivos.ultimoSucesso === 'T',
        'S24h1 dia comum com CSV recente e sem mudança: só a cauda é lida, e a última leitura COMPLETA não é carimbada (o último sucesso anda)');
    }
    const meio = await varre(RET2(), (u) => u === urlFaixaRep(701, 750));
    const tudo = await varre(RET2(), () => true);
    ok(meio.e.resultado === 'parcial' && /faixa 701–750: HTTP 503/.test(meio.e.erro || '') && meio.esp.includes(8000) && meio.esp.includes(16000)
      && tudo.e.resultado === 'falha' && /nenhuma faixa dos repetitivos pôde ser lida/.test(tudo.e.erro || ''),
      'S24h2 uma faixa com 503 (depois de 3 tentativas, 8 s e 16 s de espera) deixa a coleção parcial e nomeia a faixa; tudo com 503 é falha');
    const extra = (ns) => Object.fromEntries(ns.map((n) => [n, { ...retratoTemaRep(T[1474]), s: 'Afetado' }]));
    const cinco = await varre(RET2(extra([1456, 1457, 1458, 1459, 1460])));
    const seis = await varre(RET2(extra([1456, 1457, 1458, 1459, 1460, 1461])));
    ok(cinco.e.resultado === 'parcial' && /Temas 1456, 1457, 1458, 1459, 1460 da leitura anterior não vieram/.test(cinco.e.erro || '')
      && [1456, 1457, 1458, 1459, 1460].every((n) => cinco.r.retratos['stj.repetitivos'].temas[n])
      && seis.e.resultado === 'parcial' && /faixa 1451–1500: 6 temas da leitura anterior não vieram/.test(seis.e.erro || '')
      && isDeepStrictEqual(seis.r.retratos['stj.repetitivos'].temas, RET2(extra([1456, 1457, 1458, 1459, 1460, 1461]))['stj.repetitivos'].temas),
      'S24h3 até 5 temas sumidos da faixa: parcial com os números e as entradas mantidas; 6 sumidos: a faixa é falha (coleção parcial) e as entradas dela ficam como estavam');

    const anterior = retratoTemaRep(T[1455]);
    const hoje = retratoTemaRep({ ...T[1455], tese: null, julgadoEm: null, publicadoEm: null }, anterior);
    ok(hoje.t === anterior.t && hoje.jg === '09/09/2026' && hoje.pb === '14/09/2026' && anterior.t.length > 50,
      'S24i o retrato da rotina não apaga a tese nem as datas que vieram vazias');
    const Jcoord = { idx: [['COORD-REP-702', 'STJ', 'repetitivo', 702, 'Tema 702 (Repetitivo)', null, null, '11/12/2013', null, 0]], temTexto: true, texto: () => undefined };
    const Jrep = { idx: [['repgeral-repetitivo-STJ-702', 'STJ', 'repetitivo', 702, 'Tema 702 (Repetitivo)', null, null, '11/12/2013', 'Trânsito em Julgado', 0]], temTexto: true,
      texto: () => 'Tese firmada: ' + T[702].tese + ' (referência)' };
    ok(colecaoNoAcervo({ fonte: 'stj', colecao: 'repetitivos', tipo: 'situacao', numero: 702, depois: 'Trânsito em Julgado' }, Jcoord) === false
      && colecaoNoAcervo({ fonte: 'stj', colecao: 'repetitivos', tipo: 'tese-fixada', numero: 702, depois: T[702].tese }, Jrep) === true
      && acompanhamento(Jrep, 'stj', 'repetitivos', 702).termoJuris === 'Tema 702 (Repetitivo)' && acompanhamento(JV, 'stj', 'repetitivos', 702).termoJuris === 'Tema 702 (Repetitivo)',
      'S24j acervo: linha COORD-REP sem situação nunca dá baixa por situação; tese oficial contida no texto do acervo dá; o termo do JURIS é "Tema 702 (Repetitivo)"');
  }

  // ══ S25 — STJ, súmulas ═══════════════════════════════════════════════════
  {
    const doPdf = listaVerbetesSTJ(await textoDoPdf(readFileSync(path.join(FX, 'sumulas/stj-verbetes-p30-p73.pdf'))));
    const v = (n) => doPdf.find((x) => x.numero === n) || {};
    ok(JSON.stringify(doPdf.map((x) => x.numero)) === JSON.stringify([219, 220, 221, 222, 223, 224, 225, 541, 542, 543, 544, 545, 546])
      && v(222).marca === 'cancelada' && v(545).marca === 'alterada' && v(545).julgadoEm === '10/09/2025' && /^A confissão do autor/.test(v(545).enunciado || ''),
      'S25a o PDF real (2 páginas) lido com o PDF.js de vendor/pdfjs: 13 verbetes, a 222 cancelada e a 545 alterada em 10/09/2025');
    ok(isDeepStrictEqual(listaVerbetesSTJ(ler('sumulas/stj-verbetes-p30-p73.txt')), doPdf),
      'S25b o texto salvo do PDF.js dá exatamente a mesma lista');
    const AC = acervoDaColecao(JV, 'stj', 'sumulas');
    const cmp = (lista, ac) => compararLista(lista, ac, { fonte: 'stj', comData: true, urlDe: () => URL_VERBETES_STJ });
    ok(cmp(IDX_STJ, AC).estado === 'sem-novidade' && cmp(IDX_STJ, AC).itens.length === 0 && IDX_STJ.length === 676,
      'S25c a lista oficial inteira (676) contra o juris-index.js vivo: nenhum item — a base está limpa');
    const linhasSTJ = JV.idx.filter((r) => r[2] === 'sumula_stj').map((r) => r.slice());
    const acDe = (fn) => acervoDaColecao({ idx: fn(linhasSTJ.map((r) => r.slice())) }, 'stj', 'sumulas');
    const a675 = cmp(IDX_STJ, acDe((L) => L.filter((r) => r[3] !== 676))).itens;
    const a222 = cmp(IDX_STJ, acDe((L) => L.map((r) => (r[3] === 222 ? Object.assign(r, { 8: 'Superada' }) : r)))).itens;
    const a545 = cmp(IDX_STJ, acDe((L) => L.map((r) => (r[3] === 545 ? Object.assign(r, { 7: '14/10/2015' }) : r)))).itens;
    ok(JSON.stringify(tipos(a675)) === JSON.stringify(['676:sumula-nova']) && JSON.stringify(tipos(a222)) === JSON.stringify(['222:sumula-cancelada'])
      && a222[0].antes === 'Superada' && JSON.stringify(tipos(a545)) === JSON.stringify(['545:sumula-revisada']) && a545[0].julgadoEm === '10/09/2025'
      && cmp(IDX_STJ.slice(0, 600), AC).estado === 'falha' && /não traz a súmula 676/.test(cmp(IDX_STJ.filter((x) => x.numero !== 676), AC).erro || ''),
      'S25d acervo até a 675: súmula nova 676; 222 "Superada" no acervo: cancelada; 545 com outra data: revisada; lista cortada em 600 ou sem a 676: falha (âncora)');

    const bloco = (ed) => sumulasDoInformativo(lerL1(`sumulas/stj-inf-${ed}-sumulas.html`));
    const n835 = bloco('0835');
    const sem674 = compararInformativo(n835, acDe((L) => L.filter((r) => r[3] !== 674)), { urlEdicao: 'u', quando: QUANDO }).itens;
    const j = (ns) => JSON.stringify(ns.map((x) => [x.numero, x.marca]));
    ok(j(n835) === JSON.stringify([[674, 'nova'], [675, 'nova'], [222, 'cancelada']]) && compararInformativo(n835, AC).itens.length === 0
      && sem674.length === 1 && sem674[0].tipo === 'sumula-nova' && sem674[0].aprovadaEm === '13/11/2024' && sem674[0].publicadoEm === '25/11/2024'
      && /@CNOT=021170$/.test(sem674[0].urlOficial)
      && j(bloco('0862')) === JSON.stringify([[545, 'revisada'], [630, 'revisada']]) && compararInformativo(bloco('0862'), AC).itens.length === 0
      && j(bloco('0749')) === JSON.stringify([[212, 'cancelada'], [497, 'cancelada']]) && bloco('0749')[0].canceladaEm === '14/09/2022'
      && j(bloco('0720')) === JSON.stringify([[652, 'nova'], [653, 'nova']]) && bloco('0720')[0].aprovadaEm === '2/12/2021'
      && j(bloco('0692')) === JSON.stringify([[648, 'nova']]) && bloco('0692')[0].dje === '19/04/2021' && j(bloco('0837')) === JSON.stringify([[676, 'nova']]),
      'S25e blocos "Súmulas" reais do Informativo: 0835 (674, 675 e a 222 cancelada) e 0862 (revisadas) dão 0 item com o acervo vivo; sem a 674, súmula nova com datas e o @CNOT; os rodapés antigos (0749, 0720, 0692) são lidos');

    // Súmula nova pelas DUAS rotas (lista do PDF e Informativo 837) → um item só.
    const J675 = { ...JV, idx: JV.idx.filter((r) => !(r[2] === 'sumula_stj' && r[3] === 676)) };
    let lidas = 0;
    const st = await consultarSumulasSTJ(ctxDe({ modo: 'rotina', J: J675, retratos: R_SUM,
      buscar: async (u) => (u === URL_VERBETES_STJ ? { status: 200, buffer: Buffer.from('%PDF-1.4 sintético'), cabecalhos: { 'last-modified': LM, etag: 'W/"x"' } } : { status: 404 }),
      lerPdf: async () => { lidas++; return textoPdf(IDX_STJ, (n) => (n === 676 ? 'Enunciado da súmula 676 segundo o PDF.' : `Enunciado ${n}.`)); } }),
    Promise.resolve({ estado: 'novidades', paginas: [{ n: 837, extra: false, url: 'https://processo.stj.jus.br/inf-837', texto: lerL1('sumulas/stj-inf-0837-sumulas.html') }] }));
    ok(st.itens.length === 1 && st.itens[0].tipo === 'sumula-nova' && st.itens[0].depois === 'Enunciado da súmula 676 segundo o PDF.'
      && st.itens[0].aprovadaEm === '11/12/2024' && st.itens[0].publicadoEm === '17/12/2024' && /@CNOT=021208$/.test(st.itens[0].urlOficial)
      && st.estado === 'novidades' && lidas === 1 && st.retrato.pdf.verbetes === 676 && st.retrato.pdf.maior === 676 && st.retrato.pdf.lastModified === LM,
      'S25f a mesma súmula nova pela lista oficial e pelo Informativo vira UM item: o texto da lista, as datas e o link da nota do Informativo; o retrato do PDF anda');

    let pediu = null, leu = 0;
    const lerPdfEspiao = async () => { leu++; return ''; };
    const infVazio = Promise.resolve({ estado: 'sem-novidade', paginas: [] });
    const c304 = await consultarSumulasSTJ(ctxDe({ modo: 'ao-vivo', J: JV, retratos: R_SUM, lerPdf: lerPdfEspiao, buscar: async (u, o) => { pediu = o; return { status: 304, tam: 0, texto: null }; } }), infVazio);
    const c200 = await consultarSumulasSTJ(ctxDe({ modo: 'ao-vivo', J: JV, retratos: R_SUM, lerPdf: lerPdfEspiao, buscar: async () => ({ status: 200, buffer: Buffer.from('x'), cabecalhos: { 'last-modified': 'Mon, 01 Jun 2026 10:00:00 GMT' } }) }), infVazio);
    const cSem = await consultarSumulasSTJ(ctxDe({ modo: 'ao-vivo', J: JV, retratos: {}, lerPdf: lerPdfEspiao, buscar: async () => ({ status: 304 }) }), infVazio);
    const cInf = await consultarSumulasSTJ(ctxDe({ modo: 'ao-vivo', J: JV, retratos: R_SUM, lerPdf: lerPdfEspiao, buscar: async () => ({ status: 304 }) }), Promise.resolve(null));
    ok(pediu && pediu.cabecalhos && pediu.cabecalhos['if-modified-since'] === LM && pediu.codificacao === 'binario' && c304.estado === 'sem-novidade'
      && /lista oficial sem alteração desde 05\/12\/2025/.test(c304.detalhe) && leu === 0
      && c200.estado === 'parcial' && /a lista oficial mudou desde a leitura de referência/.test(c200.erro || '')
      && cSem.estado === 'parcial' && /sem leitura de referência/.test(cSem.erro || '')
      && cInf.estado === 'parcial' && /bloco "Súmulas" do Informativo não lido/.test(cInf.erro || ''),
      'S25g ao vivo: GET condicional com o Last-Modified da linha de base (304 = sem alteração), sem ler o PDF; 200 = parcial "a lista mudou"; sem linha de base ou sem o Informativo, parcial');
  }

  // ══ S26 — STF, súmulas ═══════════════════════════════════════════════════
  {
    const l26 = listaSumulasSTF(LISTA_26), am = listaSumulasSTF(ler('sumulas/stf-sumarios-30-amostra.html'));
    const marca = (l, n) => (l.find((x) => x.numero === n) || {}).marca;
    ok(l26.length === 63 && marca(l26, 9) === 'cancelada' && l26.filter((x) => x.marca).length === 1
      && marca(am, 3) === 'superada' && marca(am, 152) === 'revogada' && marca(am, 359) === 'alterada' && marca(am, 394) === 'cancelada' && marca(am, 619) === 'revogada',
      'S26a listas reais do portal: 63 vinculantes com a SV 9 "cancelada" (o espaço de largura zero sai); na amostra das comuns, superada, revogada, alterada e cancelada');
    const ac30 = acervoDaColecao(JV, 'stf', 'sumulas', false), ac26 = acervoDaColecao(JV, 'stf', 'sumulas', true);
    const c30 = compararLista(IDX_30, ac30, { fonte: 'stf', urlDe: (o) => urlDetalheSTF(30, o.id) });
    const c26 = compararLista(l26, ac26, { fonte: 'stf', vinculante: true, urlDe: (o) => urlDetalheSTF(26, o.id) });
    const superadas = [...ac30.values()].filter((L) => L[0][8] === 'Superada').length;
    ok(IDX_30.length === 736 && c30.itens.length === 0 && c26.itens.length === 0 && superadas > 300,
      `S26b as 736 súmulas e as 63 vinculantes contra o acervo vivo: nenhum item — e as ${superadas} "Superada" que só o acervo anota não viram nada`);

    const id63 = l26.find((x) => x.numero === 63).id;
    const J62 = { ...JV, idx: JV.idx.filter((r) => !(r[2] === 'sumula_vinculante' && r[3] === 63)) };
    const rotaSTF = (detalhe) => async (u) => {
      if (u === urlListaSTF(26)) return { status: 200, texto: LISTA_26 };
      if (u === urlListaSTF(30)) return { status: 200, texto: pagina30(IDX_30) };
      if (u === urlDetalheSTF(26, id63)) return detalhe();
      return { status: 404, texto: '' };
    };
    const esp = [];
    const nova = await consultarSumulasSTF(ctxDe({ modo: 'rotina', J: J62, esperas: esp, buscar: rotaSTF(() => ({ status: 200, texto: ler('sumulas/stf-sv-63.html') })) }));
    const semDet = await consultarSumulasSTF(ctxDe({ modo: 'rotina', J: J62, buscar: rotaSTF(() => ({ status: 503, texto: '' })) }));
    const it = nova.itens[0] || {};
    ok(nova.itens.length === 1 && it.tipo === 'sumula-nova' && it.vinculante === true && it.titulo === 'Súmula Vinculante 63 — STF' && /^STF-SV-63-sumula-nova-/.test(it.id)
      && /^O tráfico privilegiado/.test(it.depois || '') && it.publicadoEm === '22/10/2025' && it.urlOficial === urlDetalheSTF(26, id63)
      && nova.estado === 'novidades' && /736 súmulas e 63 vinculantes conferidas nas listas oficiais/.test(nova.detalhe) && esp.length >= 2 && esp.every((ms) => ms >= 3000)
      && semDet.itens.length === 1 && semDet.itens[0].depois === null && semDet.itens[0].observacao === 'enunciado não lido; confira na fonte' && semDet.estado === 'novidades',
      'S26c vinculante fora do acervo (SV 63): súmula nova com o enunciado e a data do detalhe oficial; com o detalhe em 503, o item sai mesmo assim, sem enunciado e com o aviso');
    const revisada = IDX_30.map((o) => (o.numero === 1 ? { ...o, marca: 'revisada' } : o));
    const cr = compararLista(revisada, ac30, { fonte: 'stf', urlDe: () => 'u' }).itens;
    ok(cr.length === 1 && cr[0].tipo === 'situacao' && cr[0].depois === 'revisada' && /fora do vocabulário/.test(cr[0].observacao || '')
      && detalheSumulaSTF(ler('sumulas/stf-sv-30.html')).enunciado === null
      && !/\(alterada\)\s*$/.test(detalheSumulaSTF(ler('sumulas/stf-sum-359.html')).enunciado) && /necessários\.$/.test(detalheSumulaSTF(ler('sumulas/stf-sum-359.html')).enunciado),
      'S26d marca desconhecida "(revisada)" (sintética) vai para conferência como situação; a SV 30 "pendente de publicação" vem sem enunciado; a 359 sem o "(alterada)" repetido no fim');
    const sem63 = LISTA_26.replace(/<div class="sumula-item"><a[^>]*sumula=\d+">\s*Súmula Vinculante(?:&nbsp;|\s)63\s*<\/a><\/div>/, '');
    const parc = await consultarSumulasSTF(ctxDe({ modo: 'ao-vivo', J: JV, buscar: async (u) => (u === urlListaSTF(26) ? { status: 200, texto: sem63 } : { status: 200, texto: pagina30(IDX_30) }) }));
    ok(sem63 !== LISTA_26 && parc.estado === 'parcial' && /súmulas vinculantes: a lista oficial não traz a súmula 63/.test(parc.erro || '')
      && compararLista([...l26, { falha: 'item ilegível: Coisa estranha' }], ac26, { fonte: 'stf', vinculante: true, urlDe: () => 'u' }).estado === 'falha',
      'S26e âncora: a lista de vinculantes sem a SV 63 é falha dela e a coleção fica parcial; item ilegível na lista é falha');
  }

  // ══ S27 — orquestração, baixa e linha de comando ═════════════════════════
  {
    const A = MAN_INF.acervoNaData;
    const rotaSTF = (rg = () => ({ status: 200, texto: EXP01 }), l26 = () => ({ status: 200, texto: LISTA_26 })) => async (u) => {
      const inf = rotaInfSTF(u);
      if (inf) return inf;
      if (u === URL_EXPORT_RG) return rg();
      if (u === urlListaSTF(26)) return l26();
      if (u === urlListaSTF(30)) return { status: 200, texto: pagina30(IDX_30) };
      return { status: 404, texto: '' };
    };
    const base = { fontes: ['stf'], modo: 'ao-vivo', ultimas: A, retratos: { 'stf.rg': R25 }, juris: JV, limiares: { minLinhasRG: 0 }, atuais: [], silencioso: true };
    const tudo = await rodar({ ...base, busca: { buscar: rotaSTF(undefined, () => ({ status: 503, texto: '' })), esperar: async () => {} }, anterior: { fontes: {} } });
    const e = tudo.estado.fontes.stf;
    ok(Object.keys(e.colecoes).length === 3 && e.colecoes.informativo.resultado === 'novidades' && e.colecoes.rg.resultado === 'novidades'
      && e.colecoes.sumulas.resultado === 'parcial' && e.resultado === 'parcial' && /^Súmulas: súmulas vinculantes: HTTP 503/.test(e.erro || '')
      && /Informativo: a partir da edição 1225/.test(e.detalhe) && /Repercussão geral: 14 temas lidos/.test(e.detalhe) && / · /.test(e.detalhe)
      && tudo.itens.length === 16 && tudo.itens.filter((i) => i.colecao === 'informativo').every((i) => i.colecaoRotulo === COLECOES.stf.informativo.rotulo)
      && tudo.itens.filter((i) => i.colecao === 'rg').every((i) => i.fonteRotulo === COBERTURA.stf.rotulo && i.colecaoRotulo === COLECOES.stf.rg.rotulo),
      'S27a STF com as três coleções: cada uma no diário, a fonte com o pior resultado (súmulas parcial → fonte parcial), erro e detalhe com o rótulo da coleção na frente');

    const ANT = '2026-09-28T12:00:00.000Z';
    const anterior = { fontes: { stf: { ultimoSucesso: ANT, colecoes: { rg: { resultado: 'novidades', ultimoSucesso: ANT, ultimaLeituraCompleta: ANT } } } } };
    const caiuRG = await rodar({ ...base, colecoes: ['informativo', 'rg'], busca: { buscar: rotaSTF(() => ({ status: 503, texto: '' })), esperar: async () => {} }, anterior });
    const ef = caiuRG.estado.fontes.stf;
    ok(ef.resultado === 'falha' && ef.ultimoSucesso === ANT && ef.colecoes.rg.resultado === 'falha' && ef.colecoes.rg.ultimoSucesso === ANT
      && ef.colecoes.rg.ultimaLeituraCompleta === ANT && ef.colecoes.informativo.ultimoSucesso === ef.ultimaTentativa
      && caiuRG.itens.length === 6 && caiuRG.itens.every((i) => i.colecao === 'informativo') && ef.colecoes.sumulas.resultado === null,
      'S27b RG com 503: a fonte é falha e guarda o último sucesso; os itens do Informativo continuam e o diário dele anda; o da RG fica onde estava');

    const ev = [];
    const lenta = rotaSTF();
    await rodar({ ...base, colecoes: ['informativo', 'rg'], anterior: { fontes: {} }, busca: { esperar: async () => {}, buscar: async (u) => {
      const q = u === URL_EXPORT_RG ? 'rg' : 'inf';
      ev.push('ini ' + q); await new Promise((r) => setTimeout(r, 2)); ev.push('fim ' + q); return lenta(u);
    } } });
    ok(ev.indexOf('ini rg') >= 0 && ev.indexOf('ini rg') < ev.lastIndexOf('fim inf'),
      'S27c as coleções de uma fonte rodam em paralelo: o export da RG começa antes de o Informativo terminar');

    const antStj = { ultimoSucesso: ANT, colecoes: { informativo: { ultimoSucesso: '2026-09-01T00:00:00.000Z' }, repetitivos: { ultimoSucesso: '2026-09-02T00:00:00.000Z', ultimaLeituraCompleta: '2026-09-02T00:00:00.000Z' } } };
    const ed = estadoDeFalha('stj', antStj, 'tempo esgotado', QUANDO);
    ok(ed.resultado === 'falha' && ed.ultimoSucesso === ANT && ed.doCache === false && Object.values(ed.colecoes).every((c) => c.resultado === 'falha' && c.erro === 'tempo esgotado')
      && ed.colecoes.informativo.ultimoSucesso === '2026-09-01T00:00:00.000Z' && ed.colecoes.repetitivos.ultimaLeituraCompleta === '2026-09-02T00:00:00.000Z'
      && ed.colecoes.sumulas.ultimoSucesso === null && estadoDeFalha('planalto', {}, 'x', QUANDO).normas.length > 0,
      'S27d estadoDeFalha: toda coleção falha, cada uma com o PRÓPRIO último sucesso; o Planalto leva a lista de normas mesmo sem diário');

    const it = compararRG(R25.temas, T01, { acompanhamento: () => ({ acompanhado: true, termoJuris: 'Tema 1253 (RG)' }) }).itens.find((i) => i.numero === 1253);
    const sim = mesclarNovidades([], [it], null, () => true).itens[0];
    const nao = mesclarNovidades([sim], [], null, () => false).itens[0];
    const naoSei = mesclarNovidades([sim], [], null, () => null).itens[0];
    const naoSeiPend = mesclarNovidades([it], [], null, () => null).itens[0];
    const comData = { ...it, publicadoEm: '30/09/2026', julgadoEm: '12/03/2026', detectadoEm: '2026-09-30T00:00:00.000Z' };
    const herda = mesclarNovidades([comData], [it], null, () => null).itens[0];
    const parcialIt = { ...it, parcial: true, parcialMotivo: 'x' };
    ok(sim.incorporado === true && sim.incorporadoTxt === 'já no JURIS' && sim.revisar === false && !('pendencia' in sim)
      && !nao.incorporado && !('incorporadoTxt' in nao) && nao.revisar === true && nao.pendencia === pendenciaColecao(nao)
      && naoSei.incorporado === true && !naoSeiPend.incorporado && naoSeiPend.revisar === true
      && herda.publicadoEm === '30/09/2026' && herda.julgadoEm === '12/03/2026' && herda.detectadoEm === '2026-09-30T00:00:00.000Z'
      && !mesclarNovidades([], [parcialIt], null, () => true).itens[0].incorporado,
      'S27e junção dos itens de tema: acervo com o estado = baixa "já no JURIS"; acervo sem = baixa desfeita com a pendência da coleção; "não sei" não muda nada; a data que a rotina leu fica; parcial nunca recebe baixa');

    // Linha de comando com a rede BLOQUEADA (toda conexão TCP lança). As esperas da etiqueta
    // (3, 8 e 16 s) são encurtadas SÓ no processo filho da régua — o motor não tem atalho.
    const dir = mkdtempSync(path.join(os.tmpdir(), 'sentinela-col-'));
    const bloqueio = path.join(dir, 'bloqueia-rede.cjs');
    writeFileSync(bloqueio, "require('node:net').Socket.prototype.connect = function () { throw new Error('rede bloqueada na régua'); };\n"
      + "const st = setTimeout; globalThis.setTimeout = (f, ms, ...a) => st(f, [3000, 8000, 16000].includes(ms) ? 0 : ms, ...a);\n");
    const cli = (args, env = {}) => spawnSync(process.execPath, ['-r', bloqueio, path.join(RAIZ, 'scripts/sentinela.mjs'), ...args],
      { cwd: RAIZ, encoding: 'utf8', timeout: 90000, env: { ...process.env, ...env } });
    try {
      const arqs = ['novidades.js', 'sentinela/retratos.json', 'sentinela/estado.json'].map((f) => { try { return readFileSync(path.join(RAIZ, f), 'utf8'); } catch (_) { return null; } });
      const curto = cli(['--semear-retrato', 'stf.rg', '--arquivo', 'tests/fixtures/stf-rg/export-2026-10-01.html', '--lido-em', '2026-10-01T00:00:00Z', '--dry-run']);
      const xyz = cli(['--semear-retrato', 'xyz', '--arquivo', 'tests/fixtures/stf-rg/export-2026-10-01.html', '--lido-em', '2026-10-01T00:00:00Z', '--dry-run']);
      const sem = await semearRetrato('stf.rg', [EXP01], { minLinhas: 0, lidoEm: '2026-10-01T00:00:00Z' });
      const saida = path.join(dir, 'github-output.txt');
      writeFileSync(saida, '');
      const consulta = cli(['--fonte', 'stf', '--colecoes', 'rg', '--dry-run', '--json'], { GITHUB_OUTPUT: saida });
      let rel = null;
      try { rel = JSON.parse(consulta.stdout); } catch (_) { rel = null; }
      const rg = rel && rel.fontes && rel.fontes.stf && rel.fontes.stf.colecoes && rel.fontes.stf.colecoes.rg;
      const depois = ['novidades.js', 'sentinela/retratos.json', 'sentinela/estado.json'].map((f) => { try { return readFileSync(path.join(RAIZ, f), 'utf8'); } catch (_) { return null; } });
      ok(curto.status === 2 && /trouxe 14 temas \(mínimo 1400\)/.test(curto.stderr) && xyz.status === 2 && /chave desconhecida: xyz/.test(xyz.stderr)
        && sem.ultimoTema === 1485 && sem.total === 14 && sem.lidoEm === '2026-10-01T00:00:00Z',
        'S27f --semear-retrato usa as mesmas travas da consulta (14 temas não semeiam: saída 2), recusa chave desconhecida, e semearRetrato devolve o retrato até o Tema 1485');
      ok(consulta.status === 0 && rg && rg.resultado === 'falha' && /rede bloqueada na régua/.test(rg.erro || '') && rel.fontes.stf.resultado === 'falha'
        && isDeepStrictEqual(arqs, depois),
        'S27f2 --fonte stf --colecoes rg com a rede bloqueada: a coleção sai falha com o erro de rede por extenso — nunca "sem novidade" — e nada é gravado');
      ok(/^falhasColecoes=stf\.rg$/m.test(readFileSync(saida, 'utf8')) && /^falhas=stf$/m.test(readFileSync(saida, 'utf8')),
        'S27g o GITHUB_OUTPUT do workflow traz a linha falhasColecoes com a coleção que falhou');
    } finally { rmSync(dir, { recursive: true, force: true }); }

    await testarApi(ok);
  }

  // ══ S28 — o termo do "Abrir no JURIS" acha o verbete ══════════════════════
  {
    // Réplica do applyFilter de juris-web.html: título, assunto, número, base e ramo, mais o
    // enunciado do texto; todos os termos contidos.
    const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const acha = (q, comTexto) => { const termos = norm(q).split(' ').filter(Boolean); return JV.idx.filter((r) => {
      let hay = norm((r[4] || '') + ' ' + (r[6] || '') + ' ' + (r[3] || '') + ' ' + (r[2] || '') + ' ' + (r[5] || ''));
      const en = comTexto && JV.texto(r[0]); if (en) hay += ' ' + norm(en);
      return termos.every((t) => hay.indexOf(t) >= 0); }); };
    const so = (l, base, n) => l.filter((r) => r[2] === base && r[3] === n).length === 1;
    // Medido em 01/10/2026: "Tema 457 (RG)" acha o 457 E o Tema 1196, cujo assunto cita a
    // "Lei 13.457/2017" (o "457" casa por dentro do número). O verbete certo vem na lista; a
    // pessoa escolhe — o mesmo limite aceito para "Súmula 676" (a do STJ e a do STF).
    const t457 = acha('Tema 457 (RG)'), t702 = acha('Tema 702 (Repetitivo)'), sv63 = acha('Súmula Vinculante 63');
    const t457t = acha('Tema 457 (RG)', true), t702t = acha('Tema 702 (Repetitivo)', true), sv63t = acha('Súmula Vinculante 63', true);
    ok(so(t457, 'repercussao_geral', 457) && t457.length <= 3 && t457.every((r) => r[1] === 'STF')
      && t702.length === 1 && t702[0][1] === 'STJ' && so(t702, 'repetitivo', 702) && so(sv63, 'sumula_vinculante', 63) && sv63.length === 1
      && so(t457t, 'repercussao_geral', 457) && so(t702t, 'repetitivo', 702) && so(sv63t, 'sumula_vinculante', 63),
      `S28 o termo do "Abrir no JURIS" acha o verbete: "Tema 702 (Repetitivo)" e "Súmula Vinculante 63" dão exatamente um; "Tema 457 (RG)" traz o 457 entre ${t457.length} resultado(s) (o Tema 1196 cita a Lei 13.457 no assunto)`);
  }
}

// ── S27h — a api no tempo esgotado ──────────────────────────────────────────
// Como em api/sentinela.js de verdade, sem rede: https.request (as fontes) e fetch (o Supabase)
// trocados, e o relógio deslocado. 1ª chamada: o STF inteiro responde (informativo pelo
// formato real do título, a lista de RG montada da PRÓPRIA linha de base versionada, as listas
// de súmulas) e fica no cache da instância. 2ª chamada, 11 min depois: a fonte não responde e
// o relógio passa do teto — a resposta é falha por coleção, com o último sucesso da 1ª.
async function testarApi(ok) {
  const orig = { request: https.request, fetch: globalThis.fetch, now: Date.now };
  const pendentes = [];
  let modo = 'responde', desloc = 0;
  const RG = lerRetratos()['stf.rg'];
  const ultStf = ultimasEdicoes().stf;
  const linha = (n, x) => `<tr>${[String(n).padStart(4, '0'), 'RE 1', 'MIN. X', 'Título ' + n, 'Descrição', 'Assunto', '-', '-', '-', x.h, '-', x.s, x.t ? esc(x.t) : '-', x.dt || '-', '-']
    .map((c) => `<td>${c}</td>`).join('')}</tr>`;
  const cab = EXP01.slice(0, EXP01.indexOf('</thead>') + '</thead>'.length);
  const exportDaBase = RG ? cab + '<tbody>' + Object.entries(RG.temas).map(([n, x]) => linha(n, x)).join('\n') + '</tbody></table></body></html>' : '';
  const servir = (u) => {
    const m = /informativo(\d+)\.htm$/.exec(u);
    if (m) return +m[1] <= ultStf ? { status: 200, body: `<title>Brasília, 1 de outubro de 2026 Nº ${m[1]}</title>` } : { status: 404, body: '' };
    if (u === URL_EXPORT_RG) return { status: 200, body: exportDaBase };
    if (u === urlListaSTF(26)) return { status: 200, body: LISTA_26 };
    if (u === urlListaSTF(30)) return { status: 200, body: pagina30(IDX_30) };
    return { status: 404, body: '' };
  };
  https.request = (u, _o, cb) => {
    const req = new EventEmitter();
    let morto = false;
    req.end = () => {
      if (modo === 'pendura') { desloc += 60 * 1000; pendentes.push(req); return; }
      setImmediate(() => {
        if (morto) return;
        const r = servir(String(u));
        const res = new EventEmitter();
        res.statusCode = r.status; res.headers = {}; res.resume = () => {};
        cb(res);
        setImmediate(() => { if (r.body.length) res.emit('data', Buffer.from(r.body, 'utf8')); res.emit('end'); });
      });
    };
    req.destroy = (e) => { morto = true; if (e) req.emit('error', e); };
    return req;
  };
  globalThis.fetch = async (url) => {
    const s = String(url);
    if (s.endsWith('/auth/v1/user')) return new Response(JSON.stringify({ id: 'u1', email: 'a@b.c' }), { status: 200 });
    if (s.endsWith('/rpc/meu_email_liberado')) return new Response('true', { status: 200 });
    if (s.endsWith('/rpc/meu_acesso_bloqueado')) return new Response('false', { status: 200 });
    return new Response('{}', { status: 404 });
  };
  Date.now = () => orig.now() + desloc;
  const log = console.log;
  let res = [false, false], erro = null;
  try {
    console.log = () => {};
    const { default: handler } = await import('../api/sentinela.js');
    const chamar = async () => {
      let code = 0, body = null;
      const res = { setHeader: () => {}, status: (c) => { code = c; return res; }, json: (b) => { body = b; return res; }, end: () => res };
      await handler({ method: 'GET', query: { fonte: 'stf' }, headers: { authorization: 'Bearer x' } }, res);
      return { code, body };
    };
    const r1 = await chamar();
    const c1 = r1.body && r1.body.fontes.stf;
    const T1 = c1 && c1.colecoes && c1.colecoes.rg && c1.colecoes.rg.ultimoSucesso;
    modo = 'pendura';
    desloc += 11 * 60 * 1000;   // passa a janela de 10 min do cache
    const r2 = await chamar();
    const e2 = r2.body && r2.body.fontes.stf;
    res = [!!RG && r1.code === 200 && c1.resultado === 'sem-novidade' && c1.colecoes.rg.resultado === 'sem-novidade' && c1.colecoes.sumulas.resultado === 'sem-novidade'
      && /1476 temas lidos na lista oficial/.test(c1.colecoes.rg.detalhe || '') && typeof T1 === 'string',
    r2.code === 200 && r2.body.ok === false && e2.resultado === 'falha' && /tempo esgotado/.test(e2.erro || '') && e2.colecoes.rg.resultado === 'falha'
      && e2.colecoes.rg.ultimoSucesso === T1 && e2.colecoes.informativo.ultimoSucesso === c1.colecoes.informativo.ultimoSucesso && e2.ultimoSucesso === c1.ultimoSucesso];
  } catch (e) { erro = e; } finally {
    https.request = orig.request;
    globalThis.fetch = orig.fetch;
    Date.now = orig.now;
    // A consulta pendurada termina aqui (e limpa o teto de tempo dela); o motor ainda escreve
    // no log ao fechar a rodada, então o silêncio dura mais um instante.
    for (const r of pendentes) r.emit('error', new Error('fim da régua'));
    await new Promise((r) => setTimeout(r, 50));
    console.log = log;
  }
  ok(!erro && res[0], 'S27h a api, ao vivo: a lista de RG montada da linha de base versionada (1.476 temas) contra ela mesma não dá item; o STF fica "sem novidade" e entra no cache' + (erro ? ` (${erro.message})` : ''));
  ok(!erro && res[1], 'S27h2 a api no tempo esgotado: falha em cada coleção, com o último sucesso de cada uma (o do cache da instância) preservado — nunca 504 mudo');
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const falhas = [];
  const ok = (c, l) => { console.log((c ? '  ok  ' : '  X   ') + l); if (!c) falhas.push(l); };
  await testarColecoes(ok);
  console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\ntudo verde');
  process.exit(falhas.length ? 1 : 0);
}
