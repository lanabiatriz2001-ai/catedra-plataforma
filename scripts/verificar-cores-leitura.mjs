// scripts/verificar-cores-leitura.mjs — trava de contraste da grade de leitura ativa.
//
// POR QUE ISTO EXISTE: a grade de 7 perguntas (LA2, docs/especificacao-leitura-ativa.md)
// tem 7 cores de IDENTIDADE (--la-quem … --la-proibicao) e 7 de TEXTO derivadas
// (--la-*-tx). DESIGN.md manda separar as duas: a identidade pinta marca e borda e precisa
// de 3:1 contra a superfície; o texto pinta o rótulo do chip e precisa de 4,5:1 — e uma
// cor que passa como preenchimento não passa como texto. Aqui a conta é feita no build,
// nos DOIS modos, nas OITO direções visuais do host e nas duas telas do leitor do LEGIS
// (que tem claro/escuro próprios). Abaixo do mínimo, o build ABORTA.
//
// Irmão de verificar-cores-ramo.mjs: mesma forma (lê as fontes, compara, lança erro).
// Também confere que os hexes escritos em catedra-ui.css e em legis-web.html (o leitor
// carrega os dois conjuntos, porque o seu escuro é independente do host) são IGUAIS.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => readFileSync(join(ROOT, p), 'utf8');

export const ELEMENTOS = ['quem', 'oque', 'quando', 'como', 'prazo', 'excecao', 'proibicao'];
const MIN_TEXTO = 4.5, MIN_IDENTIDADE = 3;
// a mesma receita do CSS: texto = identidade misturada com a tinta (72 % no claro, 70 % no
// escuro) em oklab; fundo do chip = identidade a 16 % na superfície
const MIX_TX = { light: 0.72, dark: 0.70 }, MIX_CHIP = 0.16;

// ---------- cor: sRGB ⇄ oklab, luminância, contraste (WCAG 2.1) ----------
const hex2rgb = (h) => { const c = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255); };
const rgb2hex = (rgb) => '#' + rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('');
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function rgb2oklab([r, g, b]) {
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function oklab2rgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gam(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)];
}
/** color-mix(in oklab, a p%, b) */
export function mixOklab(a, b, p) {
  const A = rgb2oklab(hex2rgb(a)), B = rgb2oklab(hex2rgb(b));
  return rgb2hex(oklab2rgb(A.map((v, i) => v * p + B[i] * (1 - p))));
}
const lum = (h) => { const [r, g, b] = hex2rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// ---------- as fontes ----------
/** Lê `--la-<el>: #hex` de um bloco de CSS. */
function tokensDe(bloco, rotulo) {
  const out = {};
  for (const el of ELEMENTOS) {
    const m = bloco.match(new RegExp('--la-' + el + '\\s*:\\s*(#[0-9a-fA-F]{6})'));
    if (!m) throw new Error(`--la-${el} não encontrado em ${rotulo}`);
    out[el] = m[1].toLowerCase();
  }
  return out;
}
const css = ler('catedra-ui.css');
const mClaro = css.match(/\/\* la-claro \*\/([\s\S]*?)\/\* \/la-claro \*\//);
const mEscuro = css.match(/\/\* la-escuro \*\/([\s\S]*?)\/\* \/la-escuro \*\//);
if (!mClaro || !mEscuro) throw new Error('catedra-ui.css: blocos /* la-claro */ e /* la-escuro */ não encontrados');
const ID = { light: tokensDe(mClaro[1], 'catedra-ui.css (claro)'), dark: tokensDe(mEscuro[1], 'catedra-ui.css (escuro)') };

const legis = ler('legis-web.html');
const lClaro = legis.match(/\/\* la-claro \*\/([\s\S]*?)\/\* \/la-claro \*\//);
const lEscuro = legis.match(/\/\* la-escuro \*\/([\s\S]*?)\/\* \/la-escuro \*\//);
if (!lClaro || !lEscuro) throw new Error('legis-web.html: blocos /* la-claro */ e /* la-escuro */ não encontrados');
const LEGIS = { light: tokensDe(lClaro[1], 'legis-web.html (claro)'), dark: tokensDe(lEscuro[1], 'legis-web.html (escuro)') };

// as oito direções do host: superfície e tinta de cada modo
const host = ler('Catedra.dc.html');
const iThemes = host.indexOf('THEMES(){ return {');
if (iThemes < 0) throw new Error('THEMES() não encontrado em Catedra.dc.html');
// a região vai até o fim do método (a primeira linha que fecha em duas colunas de recuo)
const fimThemes = host.indexOf('\n  }', iThemes + 20);
const mThemes = [null, host.slice(iThemes, fimThemes > 0 ? fimThemes : iThemes + 60000)];
const direcoes = [];
for (const m of mThemes[1].matchAll(/\n    (\w+):\{ label:'([^']*)'[\s\S]*?light:\{ bg:'(#[0-9a-fA-F]{6})', surface:'(#[0-9a-fA-F]{6})',[^\n]*ink:'(#[0-9a-fA-F]{6})'[\s\S]*?dark:\{ bg:'(#[0-9a-fA-F]{6})', surface:'(#[0-9a-fA-F]{6})',[^\n]*ink:'(#[0-9a-fA-F]{6})'/g)) {
  direcoes.push({ nome: m[1], light: { bg: m[3], surface: m[4], ink: m[5] }, dark: { bg: m[6], surface: m[7], ink: m[8] } });
}
if (direcoes.length < 8) throw new Error('esperava 8 direções em THEMES(), achei ' + direcoes.length + ' (' + direcoes.map((d) => d.nome).join(', ') + ')');

// as duas telas do leitor do LEGIS (claro/escuro próprios: --rcanA/--rcanB e --rink)
const rdr = legis.match(/\.rdr\{--rc:[\s\S]*?--rink:(#[0-9a-fA-F]{6});[\s\S]*?--rcanA:(#[0-9a-fA-F]{6});--rcanB:(#[0-9a-fA-F]{6})/);
const rdrDark = legis.match(/\.rdr\.dark\{--rink:(#[0-9a-fA-F]{6});[\s\S]*?--rcanA:(#[0-9a-fA-F]{6});--rcanB:(#[0-9a-fA-F]{6})/);
if (!rdr || !rdrDark) throw new Error('legis-web.html: --rink/--rcanA/--rcanB do leitor não encontrados');
const leitor = [
  { nome: 'leitor-claro', modo: 'light', ink: rdr[1], superficies: [rdr[2], rdr[3]] },
  { nome: 'leitor-escuro', modo: 'dark', ink: rdrDark[1], superficies: [rdrDark[2], rdrDark[3]] },
];

// ---------- as contas ----------
const erros = [];
const f = (x) => x.toFixed(2);
for (const modo of ['light', 'dark']) {
  for (const el of ELEMENTOS) {
    if (ID[modo][el] !== LEGIS[modo][el]) erros.push(`${el} (${modo}): catedra-ui.css ${ID[modo][el]} ≠ legis-web.html ${LEGIS[modo][el]}`);
  }
}
const cenarios = [
  ...direcoes.flatMap((d) => ['light', 'dark'].map((modo) => ({ nome: d.nome + '-' + (modo === 'light' ? 'claro' : 'escuro'), modo, ink: d[modo].ink, superficies: [d[modo].surface, d[modo].bg] }))),
  ...leitor,
];
let medidas = 0;
for (const c of cenarios) {
  for (const el of ELEMENTOS) {
    const id = ID[c.modo][el];
    const tx = mixOklab(id, c.ink, MIX_TX[c.modo]);
    for (const sup of c.superficies) {
      const chip = mixOklab(id, sup, MIX_CHIP);
      const ci = contraste(id, sup), ct = contraste(tx, sup), cc = contraste(tx, chip);
      medidas += 3;
      if (ci < MIN_IDENTIDADE) erros.push(`${c.nome} · ${el}: identidade ${id} sobre ${sup} = ${f(ci)}:1 (mínimo ${MIN_IDENTIDADE})`);
      if (ct < MIN_TEXTO) erros.push(`${c.nome} · ${el}: texto ${tx} sobre ${sup} = ${f(ct)}:1 (mínimo ${MIN_TEXTO})`);
      if (cc < MIN_TEXTO) erros.push(`${c.nome} · ${el}: texto ${tx} sobre o chip ${chip} = ${f(cc)}:1 (mínimo ${MIN_TEXTO})`);
    }
  }
}
if (erros.length) {
  throw new Error('\n✗ BUILD ABORTADO — a grade de leitura ativa não passa no contraste:\n    '
    + erros.join('\n    ')
    + '\n  Ajuste os tokens --la-* em catedra-ui.css (e a cópia em legis-web.html) e rode de novo.');
}
console.log(`✓ grade de leitura ativa legível — 7 cores × ${cenarios.length} cenários (8 direções × 2 modos + leitor claro/escuro), ${medidas} medidas ≥ ${MIN_TEXTO}:1 no texto e ≥ ${MIN_IDENTIDADE}:1 na identidade`);
