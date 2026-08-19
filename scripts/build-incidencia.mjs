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
if (!FONTES.length) throw new Error('nenhum acervo de texto encontrado');

// Siglas → chave canônica. A chave casa com o catálogo do CátedraLEGIS pelo nome longo.
const DIPLOMAS = [
  { k: 'cpc',   nome: 'Código de Processo Civil',       re: /\b(CPC|C\.P\.C\.|Código de Processo Civil|Lei n?\.?\s*13\.?105)\b/i },
  { k: 'cpp',   nome: 'Código de Processo Penal',       re: /\b(CPP|C\.P\.P\.|Código de Processo Penal|Decreto-Lei n?\.?\s*3\.?689)\b/i },
  { k: 'cp',    nome: 'Código Penal',                   re: /\b(CP|C\.P\.|Código Penal|Decreto-Lei n?\.?\s*2\.?848)\b/i },
  { k: 'cc',    nome: 'Código Civil',                   re: /\b(CC|C\.C\.|Código Civil|Lei n?\.?\s*10\.?406)\b/i },
  { k: 'cf',    nome: 'Constituição Federal',           re: /\b(CF|C\.F\.|CR\/88|Constituição Federal|Constituição da República)\b/i },
  { k: 'cdc',   nome: 'Código de Defesa do Consumidor', re: /\b(CDC|Código de Defesa do Consumidor|Lei n?\.?\s*8\.?078)\b/i },
  { k: 'ctn',   nome: 'Código Tributário Nacional',     re: /\b(CTN|Código Tributário Nacional|Lei n?\.?\s*5\.?172)\b/i },
  { k: 'clt',   nome: 'Consolidação das Leis do Trabalho', re: /\b(CLT|Consolidação das Leis do Trabalho|Decreto-Lei n?\.?\s*5\.?452)\b/i },
  { k: 'eca',   nome: 'Estatuto da Criança e do Adolescente', re: /\b(ECA|Estatuto da Criança|Lei n?\.?\s*8\.?069)\b/i },
  { k: 'lep',   nome: 'Lei de Execução Penal',          re: /\b(LEP|Lei de Execução Penal|Lei n?\.?\s*7\.?210)\b/i },
  { k: 'lia',   nome: 'Lei de Improbidade Administrativa', re: /\b(LIA|Lei n?\.?\s*8\.?429|Improbidade Administrativa)\b/i },
  { k: 'llc',   nome: 'Lei de Licitações e Contratos',  re: /\b(Lei n?\.?\s*14\.?133|Nova Lei de Licitações)\b/i },
  { k: 'l8666', nome: 'Lei 8.666/1993',                 re: /\bLei n?\.?\s*8\.?666\b/i },
  { k: 'l9099', nome: 'Lei dos Juizados Especiais',     re: /\bLei n?\.?\s*9\.?099\b/i },
  { k: 'l8112', nome: 'Estatuto dos Servidores Públicos Federais', re: /\bLei n?\.?\s*8\.?112\b/i },
  { k: 'l8213', nome: 'Lei nº 8.213/1991',              re: /\bLei n?\.?\s*8\.?213\b/i },
  { k: 'l6830', nome: 'Lei de Execução Fiscal',         re: /\b(LEF|Lei n?\.?\s*6\.?830)\b/i },
  { k: 'l9784', nome: 'Lei nº 9.784/1999',              re: /\bLei n?\.?\s*9\.?784\b/i },
  { k: 'l11340', nome: 'Lei Maria da Penha',            re: /\b(Maria da Penha|Lei n?\.?\s*11\.?340)\b/i },
  { k: 'l11343', nome: 'Lei de Drogas',                 re: /\b(Lei de Drogas|Lei n?\.?\s*11\.?343)\b/i },
  { k: 'l12016', nome: 'Lei do Mandado de Segurança',   re: /\bLei n?\.?\s*12\.?016\b/i },
  { k: 'l8443', nome: 'Lei Orgânica do TCU',            re: /\bLei n?\.?\s*8\.?443\b/i },
  { k: 'lc101', nome: 'Lei Complementar nº 101/2000',   re: /\b(LRF|Lei de Responsabilidade Fiscal|LC n?\.?\s*101|Lei Complementar n?\.?\s*101)\b/i },
  { k: 'lc64',  nome: 'Lei Complementar nº 64/1990',    re: /\b(LC n?\.?\s*64|Lei Complementar n?\.?\s*64)\b/i },
];

// "art. 489", "arts. 5º e 6º", "artigo 1.015"
const RE_ART = /\bart(?:igo)?s?\.?\s*([\d][\d.]{0,5})\s*([º°ª]?)\s*(?:-\s*([A-Z]))?/gi;
const JANELA = 90;   // caracteres à frente onde procurar o diploma

const conta = {};    // k -> { artigo -> n }
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
