// scripts/lib/sumulas.mjs — coleções "súmulas" do STJ e do STF no sentinela (Fase 2).
//
// STJ — duas rotas oficiais, sem pedido a mais do que o necessário:
//  • a lista "Enunciados das Súmulas do STJ" (PDF do portal, VerbetesSTJ_asc.pdf; 417.469 B,
//    0,3 s, cache da Cloudflare). No botão, só um GET CONDICIONAL (304 = nada mudou); na rotina,
//    o PDF é lido inteiro com o PDF.js que já está em vendor/pdfjs. No PDF inteiro de 05/12/2025:
//    676 súmulas, de 1 a 676, com 29 CANCELADA, 5 ALTERADA e 1 REVOGADA;
//  • o bloco "SÚMULAS" das edições NOVAS do Informativo, que a coleção do Informativo acabou de
//    ler — sem pedido extra. O STJ atualiza o PDF com atraso, e o Informativo não publica todas
//    as súmulas (643 a 645, 663 e 664 nunca saíram nele): as duas rotas se completam.
//  O SCON segue bloqueado (403, desafio da Cloudflare) e a BDJur não tem um item por súmula.
//
// STF — as duas listas do portal ("Aplicação das Súmulas no STF": base=26 vinculantes, 63 itens;
// base=30 comuns, 736) e a página de detalhe de cada súmula NOVA.
//
// A base aqui é o ACERVO (juris-index.js), não um retrato: número fora do acervo é súmula nova, e
// a marca oficial (cancelada, revogada, alterada, superada) é comparada com a situação do
// acervo num sentido só — o acervo anota "Superada" por conta própria (303 no STF, 48 no STJ), e
// isso não é divergência. O TEXTO nunca é comparado: 21 das 63 vinculantes diferem do acervo só
// na forma, e o Informativo transcreve com erro (651 "judicial", 669 "alcóolica").
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  dataBR, dataDeISO, itemColecao, acompanhamento, acervoDaColecao, novaSessao, travaDeVolume, LIMIARES, CAMPOS_DATA,
} from './colecoes.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const URL_VERBETES_STJ = 'https://www.stj.jus.br/docs_internet/jurisprudencia/tematica/download/SU/Verbetes/VerbetesSTJ_asc.pdf';
export const urlListaSTF = (base) => `https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=${base}`;
export const urlDetalheSTF = (base, id) => `https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=${base}&sumula=${id}`;
export const urlNotaSTJ = (cnot) => `https://processo.stj.jus.br/jurisprudencia/externo/informativo/?livre=@CNOT=${cnot}`;

// ── PDF ─────────────────────────────────────────────────────────────────────
let _pdfjs = null;
/** O PDF.js de vendor/pdfjs (3.11.174), carregado SÓ quando o PDF é lido (a função serverless
 *  nunca o carrega). O worker vem antes: ele define globalThis.pdfjsWorker, e o Node não tem
 *  document para um worker de verdade; o UMD publica a biblioteca em globalThis.pdfjsLib. */
function pdfjs() {
  if (_pdfjs) return _pdfjs;
  const req = createRequire(import.meta.url);
  req(join(RAIZ, 'vendor/pdfjs/pdf.worker.min.js'));
  req(join(RAIZ, 'vendor/pdfjs/pdf.min.js'));
  _pdfjs = globalThis.pdfjsLib;
  if (!_pdfjs || !_pdfjs.getDocument) throw new Error('o PDF.js de vendor/pdfjs não carregou');
  return _pdfjs;
}
/** O texto do PDF, linha a linha (93 páginas em 0,35 a 4,1 s). */
export async function textoDoPdf(buf) {
  const doc = await pdfjs().getDocument({ data: new Uint8Array(buf), isEvalSupported: false, disableFontFace: true, verbosity: 0 }).promise;
  const pags = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent();
    let linha = '', y = null;
    const ls = [];
    for (const it of tc.items) {
      const yy = Math.round(it.transform[5]);
      if (y !== null && Math.abs(yy - y) > 2) { ls.push(linha); linha = ''; }
      linha += it.str;
      y = yy;
      if (it.hasEOL) { ls.push(linha); linha = ''; y = null; }
    }
    ls.push(linha);
    pags.push(ls.join('\n'));
  }
  await doc.destroy();
  return pags.join('\n');
}

const RE_CAB_VERBETE = /S\S{1,2}MULA\s+(\d+)\s*(?:\(S\S{1,2}MULA\s+(CANCELADA|ALTERADA|REVOGADA)\))?\s*VEJA MAIS/g;
const RE_CITACAO = /\((?:S\S{1,2}MULA \d+, )?(CORTE ESPECIAL|PRIMEIRA SE|SEGUNDA SE|TERCEIRA SE)/i;
/** Os verbetes do texto do PDF: [{ numero, marca, julgadoEm, enunciado }]. O enunciado é só
 *  para mostrar (nunca entra na comparação). */
export function listaVerbetesSTJ(texto) {
  const t = String(texto || '');
  const cabs = [...t.matchAll(RE_CAB_VERBETE)];
  return cabs.map((m, i) => {
    const corpo = t.slice(m.index + m[0].length, i + 1 < cabs.length ? cabs[i + 1].index : t.length)
      .replace(/scon\.stj\.jus\.br\/SCON\/sumstj\/\s*\d*/g, ' ').replace(/\s+/g, ' ').trim();
    const j = /julgad[oa] em\s+(\d{1,2}\/\d{1,2}\/\d{4})/i.exec(corpo);
    const c = RE_CITACAO.exec(corpo);
    const enunciado = (c ? corpo.slice(0, c.index) : corpo).replace(/(\p{L})- (\p{Ll})/gu, '$1-$2').trim();
    return { numero: +m[1], marca: m[2] ? m[2].toLowerCase() : null, julgadoEm: j ? dataBR(j[1]) : null, enunciado: enunciado || null };
  });
}

// ── Bloco "SÚMULAS" do Informativo do STJ (página lida em latin1) ───────────
const entInf = (s) => s.replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const limpaInf = (s) => entInf(String(s).replace(/<[^>]+>/g, ' ')).replace(/​/g, '').replace(/\s+/g, ' ').trim();
/** As notas do bloco SÚMULAS: [{ numero, marca: 'nova'|'cancelada'|'revisada', enunciado, orgao,
 *  aprovadaEm, canceladaEm, dje, cnot }] ou { falha } por nota ilegível. O rodapé mudou de
 *  formato com o tempo (edições 619 a 862 conferidas). */
export function sumulasDoInformativo(html) {
  const t = String(html || '');
  const marcos = [];
  for (const m of t.matchAll(/class="clsInformativoOrgaojulgador">([\s\S]*?)<\/span>/g)) marcos.push({ pos: m.index, orgao: limpaInf(m[1]) });
  const notas = [];
  const posNotas = [...t.matchAll(/<div id="temaNota(\d+)">([\s\S]*?)<\/div>/g)].map((m) => ({ pos: m.index, i: +m[1], tema: limpaInf(m[2]) }));
  for (let k = 0; k < posNotas.length; k++) {
    const n = posNotas[k];
    const orgao = (marcos.filter((x) => x.pos < n.pos).pop() || {}).orgao || '';
    if (!/^S\S{1,2}MULAS$/i.test(orgao)) continue;
    const trecho = t.slice(n.pos, k + 1 < posNotas.length ? posNotas[k + 1].pos : t.length);
    const tit = /S\S{1,2}MULA\s+(?:N\.?\s*)?(\d+)\s*(\(CANCELADA\)|\(?REVISADA\)?)?/i.exec(n.tema);
    if (!tit) { notas.push({ falha: `nota ${n.i} do bloco SÚMULAS sem número legível: ${n.tema.slice(-60)}` }); continue; }
    const cnot = (/@CNOT=(\d+)/.exec(t.slice(Math.max(0, n.pos - 400), n.pos)) || [])[1] || null;
    const corpoM = /<div class="clsInformativoTexto">([\s\S]*?)<\/div>/.exec(trecho);
    const corpo = corpoM ? limpaInf(corpoM[1]) : '';
    const marca = !tit[2] ? 'nova' : /CANCEL/i.test(tit[2]) ? 'cancelada' : 'revisada';
    let enunciado = corpo, orgao2 = null, aprovadaEm = null, canceladaEm = null, dje = null;
    const RE_ORG = '(Corte Especial|Primeira Se\\S{2,3}o|Segunda Se\\S{2,3}o|Terceira Se\\S{2,3}o)';
    const rod = new RegExp('\\s*\\(?\\s*(?:S\\S{1,2}mula\\s+\\d+\\s*,\\s*)?' + RE_ORG + '\\s*[.,][^]*?$', 'i').exec(corpo);
    if (rod && /\d{1,2}\/\d{1,2}\/\d{4}/.test(rod[0])) {
      const cauda = rod[0];
      enunciado = corpo.slice(0, rod.index).trim();
      orgao2 = rod[1];
      const ap = /(?:aprovad[ao]|julgad[ao])\s+em\s+(\d{1,2}\/\d{1,2}\/\d{4})/i.exec(cauda); if (ap) aprovadaEm = ap[1];
      const ca = /cancelad[ao]\s+em\s+(\d{1,2}\/\d{1,2}\/\d{4})/i.exec(cauda); if (ca) canceladaEm = ca[1];
      const dj = /DJe\s+(?:de\s+)?(\d{1,2}\/\d{1,2}\/\d{4})/i.exec(cauda); if (dj) dje = dj[1];
    }
    if (marca === 'revisada') {
      const r = /S\S{1,2}mula\s+(?:n\.\s*)?\d+\s*:\s*([\s\S]+)$/i.exec(corpo);
      enunciado = r ? r[1].trim() : null;
      const d = /no dia\s+(\d{1,2}\/\d{1,2}\/\d{4})/i.exec(corpo); if (d) aprovadaEm = d[1];
    }
    notas.push({ numero: +tit[1], marca, enunciado, orgao: orgao2, aprovadaEm, canceladaEm, dje, cnot });
  }
  return notas;
}

// ── Listas do STF (portal.stf.jus.br, UTF-8) ────────────────────────────────
const entSTF = (s) => String(s).replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).replace(/&quot;/g, '"').replace(/&amp;/g, '&');
// O portal põe um espaço de largura zero (&#8203;) DENTRO da marca: "cance​lada".
const limpaSTF = (s) => entSTF(String(s).replace(/<[^>]+>/g, ' ')).replace(/[​­]/g, '').replace(/\s+/g, ' ').trim();
/** A lista (base=30 ou 26): [{ numero, marca, id }] ou { falha } por item ilegível. */
export function listaSumulasSTF(html) {
  const out = [];
  for (const m of String(html || '').matchAll(/<div class="sumula-item">\s*<a[^>]*href="[^"]*[?&]sumula=(\d+)"[^>]*>([\s\S]*?)<\/a>\s*<\/div>/g)) {
    const txt = limpaSTF(m[2]);
    const r = /^S\S{1,2}mula\s+(?:Vinculante\s+)?(\d+)\s*(?:\(([^)]+)\))?$/i.exec(txt);
    if (!r) { out.push({ falha: `item ilegível: ${txt.slice(0, 60)}` }); continue; }
    out.push({ numero: +r[1], marca: r[2] ? r[2].toLowerCase() : null, id: m[1] });
  }
  return out;
}
/** O detalhe de uma súmula: { numero, vinculante, marca, enunciado, observacao, publicadoEm }.
 *  O STF repete a marca no fim de alguns enunciados ("… necessários. (alterada)"): sai. A SV 30
 *  ("pendente de publicação") vem com o enunciado nulo, sem lançar. */
export function detalheSumulaSTF(html) {
  const secs = String(html || '').split(/(?=<div class="titulo">)/).slice(1).map((s) => {
    const tit = /<div class="titulo">([\s\S]*?)<\/div>/.exec(s);
    const par = /<div class="parCOM">([\s\S]*)$/.exec(s);
    return { titulo: tit ? limpaSTF(tit[1]) : '', texto: par ? limpaSTF(par[1]) : '' };
  });
  if (!secs.length) return null;
  const c = /^S\S{1,2}mula\s+(Vinculante\s+)?(\d+)\s*(?:\(([^)]+)\))?$/i.exec(secs[0].titulo);
  if (!c) return null;
  const obs = secs.find((s) => /^Observa/i.test(s.titulo));
  const pub = obs && /Data de (?:publica|aprova)\S{2,3}o do enunciado:\s*([^.]*?\d{1,2}-\d{1,2}-\d{4})/i.exec(obs.texto);
  const enunciado = secs[0].texto.replace(/\s*\((?:cancelada|revogada|superada|alterada)\)\s*$/i, '');
  return {
    numero: +c[2], vinculante: !!c[1], marca: c[3] ? c[3].toLowerCase() : null,
    enunciado: !enunciado || /pendente de publica/i.test(enunciado) ? null : enunciado,
    observacao: obs ? obs.texto : null,
    publicadoEm: pub ? dataBR(pub[1]) : null,
  };
}

// ── Regras (puras) ──────────────────────────────────────────────────────────
// A situação do acervo que já "contém" a marca oficial. A recíproca não vale.
const COMPATIVEL = {
  cancelada: ['Cancelada', 'Revogada'], revogada: ['Revogada', 'Cancelada'],
  alterada: ['Alterada'], superada: ['Superada', 'Cancelada', 'Revogada'],
};
const linhaDe = (acervo, n) => { const L = acervo.get(n); return L && L.length ? { data: L[0][7], situacao: L[0][8] } : null; };

/** Lista oficial COMPLETA × acervo. `oficial` = [{ numero, marca, julgadoEm?, enunciado?, id? }].
 *  Âncora: a lista tem de trazer a maior súmula do acervo e ao menos tantos itens quanto ele.
 *  opc = { fonte, vinculante, comData (STJ: a data da alteração conta), urlDe(o), acomp(n),
 *  quando, oque ('o arquivo' | 'a página') }. Devolve { estado, erro, itens }. */
export function compararLista(oficial, acervo, opc) {
  const { fonte, vinculante = false, comData = false, urlDe, acomp, quando, oque = 'o arquivo' } = opc;
  const ileg = oficial.find((o) => o.falha);
  if (ileg) return { estado: 'falha', erro: `a lista oficial tem ${ileg.falha} — o formato mudou`, itens: [] };
  const nums = new Set(oficial.map((o) => o.numero));
  const maxAcv = acervo.size ? Math.max(...acervo.keys()) : 0;
  if (!nums.has(maxAcv) || oficial.length < acervo.size) {
    return { estado: 'falha', erro: `a lista oficial não traz a súmula ${maxAcv} (última do acervo) ou tem menos itens (${oficial.length}) que o acervo (${acervo.size}): ${oque} mudou de formato`, itens: [] };
  }
  const itens = [];
  for (const o of oficial) {
    const a = linhaDe(acervo, o.numero);
    const base = { fonte, colecao: 'sumulas', vinculante, numero: o.numero, situacao: o.marca || null, urlOficial: urlDe(o), quando, ...(acomp ? acomp(o.numero) : {}) };
    const add = (tipo, comparavel, campos) => itens.push({ ...itemColecao({ ...base, tipo, comparavel, ...campos }), _origem: 'lista' });
    if (!a) { add('sumula-nova', 'nova', { depois: o.enunciado || null, aprovadaEm: o.julgadoEm || null }); continue; }
    if (!o.marca) continue;
    const compat = (COMPATIVEL[o.marca] || []).includes(a.situacao);
    if (o.marca === 'cancelada' || o.marca === 'revogada') {
      if (!compat) add('sumula-cancelada', 'cancelada', { antes: a.situacao || 'vigente no acervo', depois: o.marca });
    } else if (o.marca === 'alterada') {
      const dataDifere = comData && o.julgadoEm && dataBR(o.julgadoEm) !== dataBR(a.data);
      if (!compat || dataDifere) {
        add('sumula-revisada', dataBR(o.julgadoEm) || 'alterada', compat
          ? { antes: `${a.situacao} em ${dataBR(a.data) || 'data não registrada'}`, depois: `alterada em ${dataBR(o.julgadoEm)}`, julgadoEm: o.julgadoEm }
          : { antes: a.situacao || 'sem marca no acervo', depois: o.marca, julgadoEm: o.julgadoEm || null });
      }
    } else if (o.marca === 'superada') {
      if (!compat) add('situacao', 'superada', { antes: a.situacao || 'sem marca no acervo', depois: 'superada' });
    } else {
      // Marca que o portal ainda não usa: vai para conferência, nunca é ignorada nem chutada.
      add('situacao', o.marca, { antes: a.situacao || 'sem marca no acervo', depois: o.marca, observacao: 'marca fora do vocabulário conhecido: ' + o.marca });
    }
  }
  return { estado: itens.length ? 'novidades' : 'sem-novidade', erro: null, itens };
}

/** Notas do bloco SÚMULAS × acervo (parcial por natureza: só as edições novas). Nota "nova"
 *  com o número já no acervo não gera nada (os erros de transcrição do Informativo nunca viram
 *  item). Devolve { itens, falhas }. */
export function compararInformativo(notas, acervo, { urlEdicao, acomp, quando } = {}) {
  const itens = [], falhas = [];
  for (const n of notas) {
    if (n.falha) { falhas.push(n.falha); continue; }
    const a = linhaDe(acervo, n.numero);
    const base = { fonte: 'stj', colecao: 'sumulas', numero: n.numero, situacao: n.marca === 'nova' ? null : n.marca,
      urlOficial: n.cnot ? urlNotaSTJ(n.cnot) : urlEdicao, quando, ...(acomp ? acomp(n.numero) : {}) };
    const add = (tipo, comparavel, campos) => itens.push({ ...itemColecao({ ...base, tipo, comparavel, ...campos }), _origem: 'informativo' });
    if (n.marca === 'nova') {
      if (!a) add('sumula-nova', 'nova', { depois: n.enunciado, aprovadaEm: n.aprovadaEm, publicadoEm: n.dje });
    } else if (n.marca === 'cancelada') {
      if (!a || !COMPATIVEL.cancelada.includes(a.situacao)) {
        add('sumula-cancelada', 'cancelada', { antes: a ? (a.situacao || 'vigente no acervo') : null, depois: 'cancelada', canceladaEm: n.canceladaEm, publicadoEm: n.dje });
      }
    } else if (n.marca === 'revisada') {
      if (!a || a.situacao !== 'Alterada' || dataBR(a.data) !== dataBR(n.aprovadaEm)) {
        add('sumula-revisada', dataBR(n.aprovadaEm) || 'alterada', { antes: a ? (a.situacao || 'sem marca no acervo') : null, depois: n.enunciado, julgadoEm: n.aprovadaEm });
      }
    }
  }
  return { itens, falhas };
}

/** A mesma súmula achada pela lista e pelo Informativo vira UM item: o texto da lista oficial,
 *  as datas que existirem (primeiro as do Informativo) e o link da nota (@CNOT). */
export function juntarPorId(itens) {
  const porId = new Map();
  for (const it of itens) {
    const v = porId.get(it.id);
    if (!v) { porId.set(it.id, it); continue; }
    const [lista, inf] = v._origem === 'lista' ? [v, it] : [it, v];
    const x = { ...lista };
    if (lista.depois == null) x.depois = inf.depois;
    for (const c of CAMPOS_DATA) x[c] = inf[c] ?? lista[c] ?? null;
    if (inf._origem === 'informativo' && inf.urlOficial) x.urlOficial = inf.urlOficial;
    x._origem = 'lista';
    porId.set(it.id, x);
  }
  return [...porId.values()].map(({ _origem, ...it }) => it);
}

// ── Consultas ───────────────────────────────────────────────────────────────
const dataDoCabecalho = (lm) => { const d = new Date(lm); return Number.isNaN(+d) ? lm : dataDeISO(d.toISOString()); };
const avisoInfNaoLido = 'bloco "Súmulas" do Informativo não lido: a coleção do Informativo não rodou ou falhou';

/** Súmulas do STJ. `infPromessa` = a promessa do resultado da coleção do Informativo desta
 *  rodada (null se ela não rodou; falha vira null antes de chegar aqui). O PDF começa já; o
 *  bloco espera o Informativo. */
export async function consultarSumulasSTJ(ctx, infPromessa) {
  const R = (ctx.retratos || {})['stj.sumulas'];
  let J;
  try { J = ctx.J(); } catch (e) { return { estado: 'falha', erro: `não foi possível ler o acervo do CátedraJURIS (juris-index.js): ${e.message}`, detalhe: '', itens: [] }; }
  const acervo = acervoDaColecao(J, 'stj', 'sumulas');
  const acomp = (n) => acompanhamento(J, 'stj', 'sumulas', n);
  const quando = ctx.quando || new Date().toISOString();
  const lerPdf = (ctx.busca && ctx.busca.lerPdf) || textoDoPdf;

  const partePdf = (async () => {
    const pedir = novaSessao(ctx);
    if (ctx.modo === 'ao-vivo') {
      if (!R || !R.pdf || !R.pdf.lastModified) return { estado: 'parcial', erro: 'lista oficial: sem leitura de referência (sentinela/retratos.json, chave stj.sumulas); a leitura completa fica para a rotina diária', detalhe: '', itens: [] };
      let p;
      try { p = await pedir(URL_VERBETES_STJ, { teto: 10000, codificacao: 'binario', cabecalhos: { 'if-modified-since': R.pdf.lastModified } }); } catch (e) {
        return { estado: 'falha', erro: `a lista oficial de súmulas não respondeu: ${e.message}`, detalhe: '', itens: [] };
      }
      if (p.r.status === 304) return { estado: 'ok', detalhe: `lista oficial sem alteração desde ${dataDoCabecalho(R.pdf.lastModified)}`, itens: [] };
      if (p.r.status === 200) {
        const lm = (p.r.cabecalhos || {})['last-modified'];
        return { estado: 'parcial', erro: `a lista oficial mudou desde a leitura de referência (Last-Modified ${R.pdf.lastModified}${lm ? ' → ' + lm : ''}); a leitura completa fica para a rotina diária`, detalhe: '', itens: [] };
      }
      return { estado: 'falha', erro: `a lista oficial de súmulas respondeu HTTP ${p.r.status}`, detalhe: '', itens: [] };
    }
    let p;
    try {
      p = await pedir(URL_VERBETES_STJ, { teto: 60000, codificacao: 'binario', ler: async (r) => {
        if (!r.buffer || !r.buffer.length) throw new Error('resposta sem corpo binário');
        const lista = listaVerbetesSTJ(await lerPdf(r.buffer));
        if (!lista.length) throw new Error('nenhuma súmula reconhecida no PDF');
        return lista;
      } });
    } catch (e) { return { estado: 'falha', erro: `a lista oficial de súmulas não pôde ser lida: ${e.message}`, detalhe: '', itens: [] }; }
    if (p.r.status !== 200) return { estado: 'falha', erro: `a lista oficial de súmulas respondeu HTTP ${p.r.status}`, detalhe: '', itens: [] };
    const lista = p.valor;
    const c = compararLista(lista, acervo, { fonte: 'stj', comData: true, urlDe: () => URL_VERBETES_STJ, acomp, quando, oque: 'o arquivo' });
    if (c.estado === 'falha') return { estado: 'falha', erro: c.erro, detalhe: '', itens: [] };
    const cab = p.r.cabecalhos || {};
    const lm = cab['last-modified'] || null;
    return {
      estado: 'ok', itens: c.itens,
      detalhe: `lista oficial lida: ${lista.length} súmulas${lm ? ` (versão de ${dataDoCabecalho(lm)})` : ''}`,
      retrato: { lidoEm: quando, origem: 'Enunciados das Súmulas do STJ (VerbetesSTJ_asc.pdf, portal do STJ)',
        pdf: { lastModified: lm, etag: cab.etag || null, bytes: p.r.buffer.length, verbetes: lista.length, maior: Math.max(...lista.map((x) => x.numero)) } },
    };
  })();

  const parteInf = (async () => {
    const inf = infPromessa ? await infPromessa : null;
    if (!inf || inf.estado === 'falha') return { estado: 'parcial', erro: avisoInfNaoLido, detalhe: '', itens: [] };
    const paginas = inf.paginas || [];
    const itens = [], falhas = [];
    for (const pg of paginas) {
      const r = compararInformativo(sumulasDoInformativo(pg.texto), acervo, { urlEdicao: pg.url, acomp, quando });
      itens.push(...r.itens);
      falhas.push(...r.falhas.map((f) => `Informativo ${pg.extra ? 'extraordinário ' : ''}${pg.n}: ${f}`));
    }
    const erros = [...falhas];
    if (inf.estado === 'parcial') erros.push('bloco "Súmulas" lido só nas edições do Informativo que responderam');
    return { estado: erros.length ? 'parcial' : 'ok', erro: erros.length ? erros.join('; ') : null,
      detalhe: `bloco "Súmulas" de ${paginas.length} edição(ões) nova(s) do Informativo`, itens };
  })();

  const [pdf, blo] = await Promise.all([partePdf, parteInf]);
  const itens = juntarPorId([...pdf.itens, ...blo.itens]);
  const erros = [pdf, blo].filter((x) => x.erro).map((x) => x.erro);
  const vol = travaDeVolume(itens.length, null, (ctx.limiares || LIMIARES).volumeMax || LIMIARES.volumeMax);
  if (vol) erros.push(vol);
  const falhas = [pdf, blo].filter((x) => x.estado === 'falha').length;
  const estado = falhas === 2 ? 'falha'
    : (falhas || pdf.estado === 'parcial' || blo.estado === 'parcial' || vol) ? 'parcial'
      : (itens.length ? 'novidades' : 'sem-novidade');
  return {
    estado, erro: erros.length ? erros.join('; ') : null,
    detalhe: [pdf.detalhe, blo.detalhe].filter(Boolean).join(' · '),
    itens: estado === 'falha' ? [] : itens,
    ...(pdf.retrato ? { retrato: pdf.retrato } : {}),
  };
}

/** Súmulas do STF: as duas listas (pausa de 3 s entre elas) e o detalhe de cada súmula nova
 *  (ao vivo, no máximo 3; na rotina, todas). Falha do detalhe não muda o resultado. */
export async function consultarSumulasSTF(ctx) {
  let J;
  try { J = ctx.J(); } catch (e) { return { estado: 'falha', erro: `não foi possível ler o acervo do CátedraJURIS (juris-index.js): ${e.message}`, detalhe: '', itens: [] }; }
  const aoVivo = ctx.modo === 'ao-vivo';
  const quando = ctx.quando || new Date().toISOString();
  const pedir = novaSessao(ctx);
  const LISTAS = [{ base: 26, vinculante: true, nome: 'vinculantes' }, { base: 30, vinculante: false, nome: 'súmulas' }];
  const res = [];
  for (const L of LISTAS) {
    try {
      const p = await pedir(urlListaSTF(L.base), { teto: aoVivo ? 10000 : 30000, codificacao: 'utf8',
        ler: (r) => { const l = listaSumulasSTF(r.texto); if (!l.length) throw new Error('a página não trouxe nenhuma súmula reconhecível'); return l; } });
      if (p.r.status !== 200) throw new Error(`HTTP ${p.r.status}`);
      const acervo = acervoDaColecao(J, 'stf', 'sumulas', L.vinculante);
      const c = compararLista(p.valor, acervo, { fonte: 'stf', vinculante: L.vinculante, urlDe: (o) => urlDetalheSTF(L.base, o.id),
        acomp: (n) => acompanhamento(J, 'stf', 'sumulas', n, L.vinculante), quando, oque: 'a página' });
      if (c.estado === 'falha') throw new Error(c.erro);
      res.push({ ...L, ok: true, lista: p.valor, itens: c.itens });
    } catch (e) { res.push({ ...L, ok: false, erro: `${L.nome === 'vinculantes' ? 'súmulas vinculantes' : 'súmulas'}: ${e.message}` }); }
  }
  // O detalhe de cada súmula nova: o enunciado e a data de publicação.
  let lidos = 0;
  const teto = aoVivo ? 3 : Infinity;
  for (const L of res.filter((x) => x.ok)) {
    for (const it of L.itens.filter((i) => i.tipo === 'sumula-nova')) {
      const o = L.lista.find((x) => x.numero === it.numero);
      let d = null;
      if (lidos < teto) {
        lidos++;
        try {
          const p = await pedir(urlDetalheSTF(L.base, o.id), { teto: aoVivo ? 5000 : 30000, codificacao: 'utf8',
            ler: (r) => { const x = detalheSumulaSTF(r.texto); if (!x) throw new Error('detalhe sem o título da súmula'); return x; } });
          if (p.r.status === 200) d = p.valor;
        } catch (_) { d = null; }
      }
      if (d) { it.depois = d.enunciado; if (d.publicadoEm) it.publicadoEm = d.publicadoEm; }
      else it.observacao = 'enunciado não lido; confira na fonte';
    }
  }
  const okL = res.filter((x) => x.ok);
  const itens = okL.flatMap((x) => x.itens).map(({ _origem, ...it }) => it);
  const erros = res.filter((x) => !x.ok).map((x) => x.erro);
  const vol = travaDeVolume(itens.length, null, (ctx.limiares || LIMIARES).volumeMax || LIMIARES.volumeMax);
  if (vol) erros.push(vol);
  const n30 = res.find((x) => x.base === 30), n26 = res.find((x) => x.base === 26);
  const detalhe = [n30.ok ? `${n30.lista.length} súmulas` : null, n26.ok ? `${n26.lista.length} vinculantes` : null].filter(Boolean).join(' e ')
    + (okL.length ? ` conferidas nas listas oficiais` : '');
  const estado = !okL.length ? 'falha' : (okL.length < 2 || vol) ? 'parcial' : (itens.length ? 'novidades' : 'sem-novidade');
  return { estado, erro: erros.length ? erros.join('; ') : null, detalhe: estado === 'falha' ? '' : detalhe, itens: estado === 'falha' ? [] : itens };
}

