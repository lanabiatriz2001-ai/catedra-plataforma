// scripts/build-incidencia.mjs — mapa de incidência por artigo.
//
// Para cada diploma, quantas vezes CADA artigo é citado no acervo de jurisprudência do
// app (25 mil verbetes: STF, STJ, TSE, TJRO e os tribunais de contas). Saída:
// incidencia.js, lido pelo CátedraLEGIS.
//
// O QUE ISTO MEDE, e o que NÃO mede: mede citação em JULGADO, não frequência em PROVA.
// São sinais diferentes — o de prova viria de banco de questões, que o app não tem. Para
// magistratura o de julgado é defensável e, melhor ainda, é verificável: cada contagem
// aponta para verbetes que existem no acervo e podem ser abertos. A tela diz isso com
// todas as letras; não é para a pessoa achar que é estatística de banca.
//
// Como atribui: procura "art. N" e, na MESMA frase e a até 80 caracteres de distância, a
// identificação do diploma (sigla ou "Lei n. X/AAAA"). Sem diploma identificado, o artigo
// é descartado — "art. 5º" solto não serve para nada.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = globalThis.window || {};
const carrega = (f) => { try { new Function('window', readFileSync(join(ROOT, f), 'utf8'))(globalThis.window); return true; } catch (e) { return false; } };

carrega('juris-text.js');
carrega('contas-text.js');
const FONTES = [globalThis.window.__JURIS_TXT__, globalThis.window.__CONTAS_TXT__].filter(Boolean);
// Índices (id → título, tribunal, ramo, tema, data): servem para o SEGUNDO produto deste
// script, a lista de verbetes por artigo que o LEGIS mostra em "Jurisprudência deste
// artigo" — automática, do nosso acervo, em vez de vínculo manual.
carrega('juris-index.js'); carrega('contas-index.js');
const META_ID = {};
for (const r of [...(globalThis.window.__JURIS_IDX__ || []), ...(globalThis.window.__CONTAS_IDX__ || [])]) {
  META_ID[r[0]] = { t: r[4] || r[0], trib: r[1] || '', ramo: r[5] || '', tema: r[6] || '', data: r[7] || '' };
}
if (!FONTES.length) throw new Error('nenhum acervo de texto encontrado');

// Os diplomas NÃO são mais uma lista à mão: vêm do catálogo do CátedraLEGIS (const CAT
// em legis-web.html, 268 normas) e o padrão de reconhecimento é derivado da própria
// referência oficial de cada uma ("Lei nº 8.429, de 2 de junho de 1992" → 8.429 e 1992).
// Assim, norma acrescentada ao catálogo entra na incidência sozinha.
//
// As siglas continuam à mão porque não dá para derivá-las da referência: ninguém escreve
// "Lei nº 13.105" no meio de um acórdão, escreve "CPC".
// Apelidos como TEXTO LITERAL — nunca como regex escrita à mão. A primeira versão
// escrevia 'C\\.P\\.' e o escape colapsou para C.P., em que o ponto vale QUALQUER
// caractere: isso casava com "CPP," e jogou 377 citações do Código de PROCESSO Penal
// para dentro do Código Penal (o art. 226, do reconhecimento pessoal, virou campeão do CP).
// Aqui tudo é escapado pelo esc() e cercado por \b, então CP não casa com CPP.
const APELIDOS = {
  '13105/2015': ['CPC', 'Código de Processo Civil'],
  '3689/1941': ['CPP', 'Código de Processo Penal'],
  '2848/1940': ['CP', 'Código Penal'],
  '10406/2002': ['CC', 'Código Civil'],
  '8078/1990': ['CDC', 'Código de Defesa do Consumidor'],
  '5172/1966': ['CTN', 'Código Tributário Nacional'],
  '5452/1943': ['CLT', 'Consolidação das Leis do Trabalho'],
  '8069/1990': ['ECA', 'Estatuto da Criança'],
  '7210/1984': ['LEP', 'Lei de Execução Penal'],
  '6830/1980': ['LEF', 'Lei de Execução Fiscal'],
  '4657/1942': ['LINDB'],
  '8429/1992': ['LIA', 'Improbidade Administrativa'],
  '14133/2021': ['Nova Lei de Licitações'],
  '11340/2006': ['Maria da Penha'],
  '11343/2006': ['Lei de Drogas'],
  '101/2000': ['LRF', 'Lei de Responsabilidade Fiscal'],
  '12527/2011': ['LAI', 'Lei de Acesso à Informação'],
  '13709/2018': ['LGPD'],
  '9503/1997': ['CTB', 'Código de Trânsito'],
  '13146/2015': ['Estatuto da Pessoa com Deficiência'],
  '10741/2003': ['Estatuto do Idoso'],
  '11101/2005': ['Lei de Recuperação'],
  '6404/1976': ['Lei das Sociedades Anônimas'],
  '12651/2012': ['Código Florestal'],
  '9605/1998': ['Lei de Crimes Ambientais'],
  '12305/2010': ['Política Nacional de Resíduos'],
};

function catalogoLegis() {
  const html = readFileSync(join(ROOT, 'legis-web.html'), 'utf8');
  const i = html.indexOf('const CAT=') + 'const CAT='.length;
  let d = 0, j = i;
  for (; j < html.length; j++) { const c = html[j]; if (c === '{') d++; else if (c === '}') { d--; if (!d) { j++; break; } } }
  return JSON.parse(html.slice(i, j)).laws || [];
}

const esc = (t) => String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// "Lei nº 8.429, de 2 de junho de 1992" → {num:'8429', ano:'1992', tipo:'LEI'}
function identidade(ref) {
  if (!ref) return null;
  const tipo = /decreto[- ]lei/i.test(ref) ? 'DL'
    : /lei complementar/i.test(ref) ? 'LC'
    : /^\s*decreto\b/i.test(ref) ? 'DEC'
    : /emenda constitucional/i.test(ref) ? 'EC' : 'LEI';
  const mn = /n[ºo°]\s*([\d.]+)/i.exec(ref);
  const anos = ref.match(/\b(1[89]\d{2}|20\d{2})\b/g);
  if (!mn || !anos) return null;
  return { tipo, num: mn[1].replace(/\./g, ''), ano: anos[anos.length - 1] };
}

// Número com e sem ponto de milhar: no texto dos julgados aparece das duas formas.
function formasDoNumero(n) {
  const formas = new Set([n]);
  if (n.length > 3) formas.add(n.slice(0, n.length - 3) + '.' + n.slice(n.length - 3));
  return [...formas].map(esc);
}

const DIPLOMAS = [];
{
  const vistos = new Set();
  // A Constituição não tem "Lei nº": entra à mão, e é a mais citada de todas.
  DIPLOMAS.push({ k: 'cf', nome: 'Constituição Federal',
    re: /\b(CF|C\.F\.|CR\/88|CF\/88|Constituição Federal|Constituição da República)\b/i });
  for (const l of catalogoLegis()) {
    const id = identidade(l.r);
    if (!id) continue;
    const chave = id.num + '/' + id.ano;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    const nums = formasDoNumero(id.num).join('|');
    const rotulo = id.tipo === 'LC' ? '(?:LC|Lei\\s+Complementar)'
      : id.tipo === 'DL' ? '(?:DL|Decreto[-\\s]Lei)'
      : id.tipo === 'DEC' ? 'Decreto'
      : id.tipo === 'EC' ? '(?:EC|Emenda\\s+Constitucional)'
      : 'Lei';
    const apelidos = (APELIDOS[chave] || []).map((a) => esc(a));
    const partes = [
      rotulo + '\\s+n?[º°.]?\\s*(?:' + nums + ')\\b',
      '(?:' + nums + ')\\s*\\/\\s*' + id.ano.slice(-4),
      ...apelidos,
    ];
    DIPLOMAS.push({ k: 'l' + id.num + '_' + id.ano, nome: l.t,
      re: new RegExp('\\b(?:' + partes.join('|') + ')\\b', 'i') });
  }
}

// "art. 489", "arts. 5º e 6º", "artigo 1.015"
const RE_ART = /\bart(?:igo)?s?\.?\s*([\d][\d.]{0,5})\s*([º°ª]?)\s*(?:-\s*([A-Z]))?/gi;
const JANELA = 90;   // caracteres à frente onde procurar o diploma

const conta = {};    // k -> { artigo -> n }
const quem = {};     // k -> { artigo -> Set(ids) }  (quais verbetes citam)
let citacoes = 0, descartadas = 0;

for (const T of FONTES) {
  for (const id of Object.keys(T)) {
    const o = T[id] || {};
    const texto = [o.en, o.co, o.ob].filter(Boolean).join('\n');
    if (!texto) continue;
    let m;
    RE_ART.lastIndex = 0;
    while ((m = RE_ART.exec(texto))) {
      const numero = m[1].replace(/\.$/, '');
      const letra = m[3] ? '-' + m[3] : '';
      const janela = texto.slice(m.index, m.index + JANELA);
      const d = DIPLOMAS.find((x) => x.re.test(janela));
      if (!d) { descartadas++; continue; }
      const art = numero + letra;
      (conta[d.k] = conta[d.k] || {});
      conta[d.k][art] = (conta[d.k][art] || 0) + 1;
      ((quem[d.k] = quem[d.k] || {})[art] = quem[d.k][art] || new Set()).add(id);
      citacoes++;
    }
  }
}

// Faixas por diploma, por POSIÇÃO no ranking: os 20% mais citados são "alta", os 35%
// seguintes "média", o resto "baixa". A primeira versão cortava por massa de citações
// (terço superior do TOTAL) e ficou inútil: a Constituição tem o art. 37 com um sexto
// de todas as citações, então o terço superior se esgotava em 3 artigos e 141 dos 163
// caíam em "baixa". Mapa de calor serve para guiar a leitura, não para premiar campeão.
const saida = {};
for (const d of DIPLOMAS) {
  const arts = conta[d.k];
  if (!arts) continue;
  const pares = Object.entries(arts).sort((a, b) => b[1] - a[1]);
  const total = pares.reduce((s, [, n]) => s + n, 0);
  const corte1 = pares[Math.min(pares.length - 1, Math.max(0, Math.floor(pares.length * 0.20) - 1))][1];
  const corte2 = pares[Math.min(pares.length - 1, Math.max(0, Math.floor(pares.length * 0.55) - 1))][1];
  saida[d.k] = {
    nome: d.nome,
    total,
    artigos: pares.length,
    corte: [corte1 || 1, corte2 || 1],
    lista: pares.map(([a, n]) => [a, n]),
  };
}

const META = { gerado: new Date().toISOString().slice(0, 10), citacoes, descartadas, diplomas: Object.keys(saida).length };
writeFileSync(join(ROOT, 'incidencia.js'),
  '// Gerado por scripts/build-incidencia.mjs. Não editar à mão.\n' +
  '// Citações de artigo no acervo de jurisprudência do app — NÃO é frequência em prova.\n' +
  'window.__INCIDENCIA__=' + JSON.stringify(saida) + ';\n' +
  'window.__INCIDENCIA_META__=' + JSON.stringify(META) + ';\n');

console.log(`✓ incidencia.js — ${META.diplomas} diplomas, ${citacoes.toLocaleString('pt-BR')} citações atribuídas`);
console.log(`  ${descartadas.toLocaleString('pt-BR')} citações descartadas (artigo sem diploma identificável perto)`);
for (const k of Object.keys(saida).sort((a, b) => saida[b].total - saida[a].total).slice(0, 8)) {
  const s = saida[k];
  console.log(`  ${s.nome}: ${s.total} citações em ${s.artigos} artigos · campeão art. ${s.lista[0][0]} (${s.lista[0][1]}x)`);
}

// O módulo LEGIS nativo (Swift) não roda JS: além do incidencia.js do web, gravamos o
// MESMO conteúdo como JSON puro, que é o que o bundle do app carrega.
writeFileSync(join(ROOT, 'incidencia.json'), JSON.stringify({ meta: META, diplomas: saida }));
console.log('✓ incidencia.json — mesma coisa, para o módulo nativo');

// Produto 2: verbetes por artigo. Não vai para o incidencia.js do web (ficaria enorme e
// a web já tem o JURIS ao lado); vai como JSON próprio para o LEGIS nativo, que mostra
// até 40 por artigo, os mais recentes primeiro. Só o essencial: id, título, tribunal,
// ramo, tema, data — o texto fica no corpus do JURIS, que é quem abre o verbete.
const dataNum = (d) => { const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(d || ''); return m ? +(m[3] + m[2] + m[1]) : 0; };
const porArtigo = {};
let pares = 0;
for (const k of Object.keys(quem)) {
  porArtigo[k] = { nome: (saida[k] || {}).nome || k, artigos: {} };
  for (const art of Object.keys(quem[k])) {
    const lista = [...quem[k][art]].map((id) => ({ id, ...(META_ID[id] || { t: id, trib: '', ramo: '', tema: '', data: '' }) }))
      .sort((a, b) => dataNum(b.data) - dataNum(a.data)).slice(0, 40);
    porArtigo[k].artigos[art] = lista;
    pares += lista.length;
  }
}
writeFileSync(join(ROOT, 'incidencia-verbetes.json'), JSON.stringify({ meta: META, diplomas: porArtigo }));
console.log(`✓ incidencia-verbetes.json — ${pares.toLocaleString('pt-BR')} pares artigo→verbete (até 40 por artigo)`);

// Produto 3: INCIDÊNCIA EM PROVA (2ª fase) — dos espelhos oficiais do banco de discursivas
// (discursivas.js): para cada dispositivo que a banca EXIGIU num quesito, em que prova
// (carreira, tribunal/órgão, banca, ano). É pequeno e verificável: cada contagem aponta
// para uma prova real com link. Não é estatística de questões objetivas — isso não temos
// (e não copiamos de serviço pago).
carrega('discursivas.js');
const DISC = globalThis.window.CT_DISCURSIVAS || [];
const provas = {};   // k -> { nome, artigos: { art -> { total, carreiras:{c:n}, orgaos:{o:n}, provas:[{id,orgao,ano,carreira}] } } }
let citProva = 0;
for (const q of DISC) {
  const carreira = q.carreira || 'Magistratura';
  for (const e of (q.espelho || [])) {
    for (const disp of (e.dispositivos || [])) {
      // "Lei 8.112/1990 art. 98, par. 2o e 3o" / "CPC art. 55" / "CF art. 37" → diploma + artigos
      const d = DIPLOMAS.find((x) => x.re.test(disp)); if (!d) continue;
      const arts = [...String(disp).matchAll(/\bart(?:igo)?s?\.?\s*([\d][\d.]{0,5})\s*[º°ª]?\s*(?:-\s*([A-Z]))?/gi)]
        .map((m) => m[1].replace(/\.$/, '').replace(/\./g, '') + (m[2] ? '-' + m[2] : ''));
      for (const art of new Set(arts)) {
        const P = (provas[d.k] = provas[d.k] || { nome: d.nome, artigos: {} });
        const A = (P.artigos[art] = P.artigos[art] || { total: 0, carreiras: {}, orgaos: {}, provas: [] });
        A.total++; citProva++;
        A.carreiras[carreira] = (A.carreiras[carreira] || 0) + 1;
        A.orgaos[q.orgao] = (A.orgaos[q.orgao] || 0) + 1;
        if (!A.provas.some((p) => p.id === q.id)) A.provas.push({ id: q.id, orgao: q.orgao, ano: q.ano, carreira, banca: q.banca || '' });
      }
    }
  }
}
const J = JSON.parse(readFileSync(join(ROOT, 'incidencia.json'), 'utf8'));
J.provas = provas;
J.meta.provas = { citacoes: citProva, diplomas: Object.keys(provas).length, fontes: DISC.length };
writeFileSync(join(ROOT, 'incidencia.json'), JSON.stringify(J));
console.log(`✓ incidência em PROVA (2ª fase): ${citProva} exigências de dispositivo em ${Object.keys(provas).length} diplomas, de ${DISC.length} provas oficiais`);
