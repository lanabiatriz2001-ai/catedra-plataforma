// scripts/lib/stf-planilha.mjs — a planilha oficial do Informativo do STF como CONFERÊNCIA CRUZADA.
//
// Fonte: Dados_InformativosSTF.xlsx, o link "dados" da página oficial do Informativo
// (portal.stf.jus.br/textos/verTexto.asp?servico=informativoSTF). Medido em 03/10/2026: 9,4 MB,
// edições 1 a 1230, uma linha por processo julgado, 24 colunas (Informativo, Classe, Número,
// Título, Tese Julgado, Tema RG…). Regravada cerca de 1 dia depois da edição; GET condicional
// (If-None-Match / If-Modified-Since) devolve 304 sem corpo quando nada mudou.
//
// Para que serve aqui: NÃO para descobrir edição nova (a sonda por número acha no mesmo dia,
// com 3 pedidos pequenos), e sim para conferir se o CátedraJURIS tem TODAS as notas de cada
// edição recente. Foi assim que apareceu a ADI 7236 (Informativo 1225), que o acervo não tinha.
// Uma mesma nota pode ocupar várias linhas (processos julgados juntos): conta-se por Título.
//
// Sem dependência nova: o xlsx é um zip; lê-se o diretório central e cada arquivo é inflado com
// node:zlib (inflateRawSync). Só o que precisa: xl/sharedStrings.xml e a primeira planilha.
import { inflateRawSync } from 'node:zlib';

export const URL_PLANILHA_INF = 'https://www.stf.jus.br/arquivo/cms/informativoSTF/anexo/Informativo_Dados/Dados_InformativosSTF.xlsx';
export const JANELA_EDICOES = 12;   // confere as 12 edições mais recentes que o acervo tem
export const MIN_LINHAS = 10000;    // planilha com menos linhas que isto = leitura suspeita

/** Os arquivos de um zip, por nome → Buffer descompactado. Lança se o formato não fechar. */
export function lerZip(buf, quero) {
  const b = Buffer.from(buf);
  let e = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (b.readUInt32LE(i) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('a planilha não é um xlsx válido (zip sem diretório central)');
  const total = b.readUInt16LE(e + 10);
  let p = b.readUInt32LE(e + 16);
  const out = {};
  for (let k = 0; k < total; k++) {
    if (b.readUInt32LE(p) !== 0x02014b50) throw new Error('diretório central do xlsx corrompido');
    const metodo = b.readUInt16LE(p + 10), tamC = b.readUInt32LE(p + 20);
    const nLen = b.readUInt16LE(p + 28), xLen = b.readUInt16LE(p + 30), cLen = b.readUInt16LE(p + 32);
    const local = b.readUInt32LE(p + 42);
    const nome = b.slice(p + 46, p + 46 + nLen).toString('utf8');
    if (quero.includes(nome)) {
      const ln = b.readUInt16LE(local + 26), lx = b.readUInt16LE(local + 28);
      const dados = b.slice(local + 30 + ln + lx, local + 30 + ln + lx + tamC);
      out[nome] = metodo === 0 ? dados : inflateRawSync(dados);
    }
    p += 46 + nLen + xLen + cLen;
  }
  return out;
}

const desxml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, '&');
const colunaDe = (ref) => String(ref).replace(/\d+$/, '');

/** Linhas da primeira planilha, como objetos {cabeçalho: valor}. */
export function linhasDaPlanilha(buf) {
  const z = lerZip(buf, ['xl/sharedStrings.xml', 'xl/worksheets/sheet1.xml']);
  if (!z['xl/worksheets/sheet1.xml']) throw new Error('a planilha não tem xl/worksheets/sheet1.xml');
  const ss = [];
  const sst = (z['xl/sharedStrings.xml'] || Buffer.alloc(0)).toString('utf8');
  for (const m of sst.matchAll(/<si>([\s\S]*?)<\/si>/g)) ss.push(desxml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
  const xml = z['xl/worksheets/sheet1.xml'].toString('utf8');
  const linhas = [];
  for (const m of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const l = {};
    for (const c of m[1].matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const tipo = (/t="(\w+)"/.exec(c[2]) || [])[1];
      const v = (/<v>([\s\S]*?)<\/v>/.exec(c[3] || '') || [])[1];
      const is = (/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/.exec(c[3] || '') || [])[1];
      l[colunaDe(c[1])] = tipo === 's' ? ss[+v] : (is != null ? desxml(is) : (v != null ? desxml(v) : ''));
    }
    linhas.push(l);
  }
  if (!linhas.length) throw new Error('a planilha veio sem linhas');
  const cab = linhas[0];
  return linhas.slice(1).map((l) => Object.fromEntries(Object.entries(cab).map(([col, nome]) => [String(nome).trim(), l[col] ?? ''])));
}

const normTitulo = (s) => String(s || '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();

/** Por edição: { n: quantidade de notas (títulos distintos), titulos: [...] }. */
export function notasPorEdicaoNaPlanilha(linhas) {
  const ed = new Map();
  for (const l of linhas) {
    const n = Number(String(l.Informativo ?? l.informativo ?? '').trim());
    if (!Number.isInteger(n) || n <= 0) continue;
    const t = String(l['Título'] ?? l.Titulo ?? '').trim();
    if (!ed.has(n)) ed.set(n, new Map());
    const k = normTitulo(t) || `#linha-${ed.get(n).size}`;
    if (!ed.get(n).has(k)) ed.get(n).set(k, t);
  }
  return Object.fromEntries([...ed].map(([n, m]) => [n, { n: m.size, titulos: [...m.values()] }]));
}

/** Por edição do STF no acervo (juris-index.js): quantidade de notas (ids INF<ano>-STF-<ed>-<nota>). */
export function notasPorEdicaoNoAcervo(IDX) {
  const ed = new Map();
  for (const r of IDX || []) {
    const m = /^INF\d{4}-STF-(\d+)-(\d+)/.exec(String(r && r[0]));
    if (!m) continue;
    const n = +m[1];
    if (!ed.has(n)) ed.set(n, new Set());
    ed.get(n).add(m[2]);
  }
  return Object.fromEntries([...ed].map(([n, s]) => [n, s.size]));
}

/** Itens "Conferir" para as edições recentes em que a planilha lista mais notas do que o acervo
 *  tem. Pura. `planilha` = notasPorEdicaoNaPlanilha; `acervo` = notasPorEdicaoNoAcervo. */
export function faltasNoAcervo(planilha, acervo, { janela = JANELA_EDICOES } = {}) {
  const noAcervo = Object.keys(acervo).map(Number).sort((a, b) => b - a).slice(0, janela);
  const faltas = [];
  for (const ed of noAcervo) {
    const p = planilha[ed];
    if (!p) continue;
    if (p.n > acervo[ed]) faltas.push({ edicao: ed, planilha: p.n, acervo: acervo[ed], titulos: p.titulos });
  }
  return faltas;
}

/** O item da Central para uma edição com nota faltando. */
export function itemFalta(f, { quando, rotuloColecao, rotuloFonte }) {
  const lista = f.titulos.slice(0, 6).map((t) => `“${t}”`).join('; ') + (f.titulos.length > 6 ? '…' : '');
  return {
    id: `INF-STF-PLAN-${f.edicao}`,
    fonte: 'stf',
    fonteRotulo: rotuloFonte,
    colecao: 'informativo',
    colecaoRotulo: rotuloColecao,
    tipo: 'informativo',
    norma: 'STF',
    normaNome: rotuloColecao,
    disp: `Informativo ${f.edicao} do STF`,
    titulo: `Informativo ${f.edicao} do STF — nota(s) faltando no acervo`,
    antes: null, depois: null, modificadora: null, modificadoras: [],
    vigencia: 'em-vigor', vigenciaEm: null, vigenciaMotivo: 'informativo publicado', efeitos: null, efeitosEm: null,
    edicao: f.edicao,
    notasPlanilha: f.planilha,
    notasAcervo: f.acervo,
    revisar: true,
    pendencia: `a planilha oficial do STF lista ${f.planilha} nota(s) nesta edição e o CátedraJURIS tem ${f.acervo}; conferir quais faltam entre: ${lista}`,
    urlOficial: `https://www.stf.jus.br/arquivo/informativo/documento/informativo${f.edicao}.htm`,
    detectadoEm: quando,
    lido: false,
  };
}
