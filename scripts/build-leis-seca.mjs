// scripts/build-leis-seca.mjs — texto das leis mais cobradas, em artigos, para o treino.
//
// Por que existe: a prova oral e o simulado de LEI SECA rodam dentro do Cátedra (web), e o
// texto da lei vinha do proxy /api/law — que só existe no deploy. No app (Mac e iPad) a
// página roda em file:// e o proxy não responde: a tela ficava vazia. Aqui o texto entra no
// bundle, já quebrado em artigos, e o treino funciona off-line nos três lugares.
//
// Fonte: planalto.gov.br (texto compilado oficial). Guardamos só o que a lei diz — é
// domínio público, e o mesmo texto que o CátedraLEGIS já lê.
//
// Saída: leis-seca.js → window.CT_LEIS = [{sigla, nome, url, artigos:[{rot, txt}]}]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const ALVOS = [
  ['CF', 'Constituição Federal'], ['CC', 'Código Civil'], ['CPC', 'Código de Processo Civil'],
  ['CP', 'Código Penal'], ['CPP', 'Código de Processo Penal'], ['CDC', 'Código de Defesa do Consumidor'],
  ['CTN', 'Código Tributário Nacional'], ['CLT', 'Consolidação das Leis do Trabalho'],
  ['LIA', 'Lei de Improbidade Administrativa'], ['Lei 14.133/2021', 'Lei de Licitações e Contratos'],
  ['ECA', 'Estatuto da Criança e do Adolescente'], ['LEP', 'Lei de Execução Penal'],
  ['Maria da Penha', 'Lei Maria da Penha'], ['Lei de Drogas', 'Lei de Drogas'],
];

function catalogo() {
  const html = readFileSync(join(ROOT, 'legis-web.html'), 'utf8');
  const i = html.indexOf('const CAT=') + 'const CAT='.length;
  let d = 0, j = i;
  for (; j < html.length; j++) { const c = html[j]; if (c === '{') d++; else if (c === '}') { d--; if (!d) { j++; break; } } }
  return JSON.parse(html.slice(i, j)).laws || [];
}

const NAMED = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ordf: 'ª', ordm: 'º', deg: 'º', sect: '§', mdash: '—', ndash: '–', hellip: '…', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', bull: '•' };
function limparHTML(buf) {
  // O Planalto NÃO é uniforme: a maioria das páginas vem em windows-1252, mas algumas
  // (Maria da Penha, por exemplo) vêm em UTF-16 com BOM. Decodificar tudo como 1252
  // devolvia texto com \u0000 entre as letras — e o parser não achava nenhum artigo.
  const b = new Uint8Array(buf);
  let enc = 'windows-1252';
  if (b[0] === 0xFF && b[1] === 0xFE) enc = 'utf-16le';
  else if (b[0] === 0xFE && b[1] === 0xFF) enc = 'utf-16be';
  else if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) enc = 'utf-8';
  let s = new TextDecoder(enc).decode(buf);
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
       .replace(/<\/(p|div|tr|h[1-6]|li|br)>/gi, '\n')
       .replace(/<br\s*\/?>/gi, '\n')
       .replace(/<[^>]+>/g, ' ')
       .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
       .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
       .replace(/&([a-z]+);/gi, (_, n) => NAMED[n] ?? NAMED[n.toLowerCase()] ?? ' ');
  return s.replace(/[ \t ]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
}

/** Quebra o texto corrido em artigos, preservando incisos e parágrafos de cada um. */
function artigos(texto) {
  const linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean);
  const out = [];
  let atual = null;
  for (const l of linhas) {
    const m = /^(Art(?:igo)?\.?\s*\d+[\dºª°.\-A-Z]*)\s*[.\-–—]?\s*(.*)$/i.exec(l);
    if (m && m[1].length <= 26) {
      if (atual && atual.txt.length > 30) out.push(atual);
      atual = { rot: m[1].replace(/\.$/, '').replace(/\s+/g, ' '), txt: m[2] ? m[1] + ' ' + m[2] : m[1] };
    } else if (atual) {
      if (atual.txt.length < 4000) atual.txt += '\n' + l;
    }
  }
  if (atual && atual.txt.length > 30) out.push(atual);
  // descarta índice/sumário: artigo cujo corpo é só o rótulo
  return out.filter((a) => a.txt.length > a.rot.length + 40);
}

/** Segundo parser, para páginas em que o rótulo e o corpo caem em linhas/células
 *  diferentes (a Lei 14.133 é assim: só 32 das 194 linhas começam com "Art."). Aqui o
 *  texto é tratado como corrido e cortado nas ocorrências de "Art. N" que iniciam frase. */
function artigosCorrido(texto) {
  const t = texto.replace(/\n+/g, ' ').replace(/\s+/g, ' ');
  const re = /(?:^|[.;:!?]\s+|\s{2,})(Art(?:igo)?\.?\s*\d+[ºª°]?(?:-[A-Z])?)\s*[.\-–—]?\s+(?=[A-ZÀ-Ú§])/g;
  const cortes = [];
  let m;
  while ((m = re.exec(t))) cortes.push({ i: m.index + m[0].indexOf(m[1]), rot: m[1].replace(/\.$/, '').replace(/\s+/g, ' ') });
  const out = [];
  for (let k = 0; k < cortes.length; k++) {
    const ini = cortes[k].i, fim = k + 1 < cortes.length ? cortes[k + 1].i : t.length;
    const txt = t.slice(ini, Math.min(fim, ini + 4000)).trim();
    if (txt.length > cortes[k].rot.length + 40) out.push({ rot: cortes[k].rot, txt });
  }
  // dedup por rótulo, ficando com a ocorrência mais longa (a do corpo, não a da remissão)
  const melhor = new Map();
  for (const a of out) {
    const k = a.rot.toLowerCase().replace(/\s+/g, '');
    if (!melhor.has(k) || melhor.get(k).txt.length < a.txt.length) melhor.set(k, a);
  }
  return [...melhor.values()];
}

const CAT = catalogo();
const saida = [];
for (const [sigla, nome] of ALVOS) {
  // Casamento pelo título INTEIRO normalizado. Comparar só o começo fazia "Código de
  // Processo Civil" e "Código de Processo Penal" caírem no mesmo prefixo ("Código de
  // Processo") — e o CPP saía com o texto do CPC, com 1227 artigos idênticos.
  const chave = (x) => String(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const alvo = chave(nome);
  const lei = CAT.find((l) => chave(l.t) === alvo)
           || CAT.find((l) => chave(l.t).startsWith(alvo))
           || CAT.find((l) => chave(l.t).includes(alvo));
  if (!lei) { console.log(`  ✗ ${nome}: não está no catálogo`); continue; }
  try {
    const r = await fetch(lei.u, { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const texto = limparHTML(await r.arrayBuffer());
    let arts = artigos(texto);
    const alt = artigosCorrido(texto);
    // fica com o parser que achou mais artigos: nenhuma lei da lista tem menos de 30
    if (alt.length > arts.length * 1.3) arts = alt;
    if (arts.length < 20) throw new Error('só ' + arts.length + ' artigos — parse suspeito');
    saida.push({ sigla, nome: lei.t, url: lei.u, artigos: arts });
    console.log(`  ✓ ${sigla.padEnd(16)} ${String(arts.length).padStart(4)} artigos`);
  } catch (e) {
    console.log(`  ✗ ${sigla}: ${e.message}`);
  }
}

const cab = `/* Cátedra — TEXTO DAS LEIS MAIS COBRADAS, em artigos.
 *
 * Gerado por scripts/build-leis-seca.mjs a partir do texto compilado do Planalto.
 * Alimenta a prova oral e o simulado de LEI SECA dentro do Cátedra — que antes dependiam
 * do proxy /api/law e por isso não funcionavam no app (file://).
 *
 * Não editar à mão: rode o script para atualizar quando a lei mudar.
 */
`;
writeFileSync(join(ROOT, 'leis-seca.js'), cab + 'window.CT_LEIS = ' + JSON.stringify(saida) + ';\n');
const tot = saida.reduce((s, l) => s + l.artigos.length, 0);
console.log(`\nleis-seca.js: ${saida.length} leis, ${tot.toLocaleString('pt-BR')} artigos`);
