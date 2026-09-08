// scripts/verificar-cores-texto.mjs — trava de design dos builds (P16).
//
// Cor-identidade ≠ cor-texto (DESIGN.md). A paleta de ramos (CT_CORES_RAMO no host) pinta barra,
// ponto e borda — precisa de 3:1 sobre a superfície. Quando ela vira TEXTO, o host a escurece
// (clareia no escuro) em passos de 3% até 4,5:1 (_corTx). Esta checagem repete o mesmo cálculo
// para cada família, nos dois modos, e ABORTA se alguma cor não atingir 3:1 como identidade ou
// não chegar a 4,5:1 como texto dentro do teto de escurecimento (85%).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SUP = { claro: '#fffdf8', escuro: '#201d17' };   // --surface da direção sutil (DESIGN.md)

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (r, g, b) => '#' + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
const lum = (h) => { const c = rgb(h).map((v) => v / 255).map((v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
export const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const darken = (h, f) => { const [r, g, b] = rgb(h); return hex(r * (1 - f), g * (1 - f), b * (1 - f)); };
const lighten = (h, f) => { const [r, g, b] = rgb(h); return hex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f); };
/** O mesmo passo do host (_corTx): escurece/clareia em 3% até 4,5:1, teto 85%. */
export function corTexto(c, escuro) { let f = 0, out = c; while (f < 0.85 && ratio(out, escuro ? SUP.escuro : SUP.claro) < 4.5) { f += 0.03; out = escuro ? lighten(c, f) : darken(c, f); } return out; }

const src = readFileSync(join(ROOT, 'Catedra.dc.html'), 'utf8');
const m = src.match(/const CT_CORES_RAMO = \{[\s\S]*?\n\};/);
if (!m) throw new Error('CT_CORES_RAMO não encontrado em Catedra.dc.html');
const falhas = [];
let n = 0;
for (const [, k, c, d] of m[0].matchAll(/'([a-z\- ]+)':\s*\{c:'(#[0-9A-Fa-f]{6})',\s*d:'(#[0-9A-Fa-f]{6})'\}/g)) {
  n++;
  for (const [modo, cor, sup] of [['claro', c, SUP.claro], ['escuro', d, SUP.escuro]]) {
    const ident = ratio(cor, sup), tx = corTexto(cor, modo === 'escuro'), txr = ratio(tx, sup);
    if (ident < 3) falhas.push(`${k} (${modo}): identidade ${cor} tem ${ident.toFixed(2)}:1 sobre ${sup} (mínimo 3:1)`);
    if (txr < 4.5) falhas.push(`${k} (${modo}): texto ${tx} chega só a ${txr.toFixed(2)}:1 sobre ${sup} (mínimo 4,5:1)`);
  }
}
if (!n) throw new Error('nenhuma família lida de CT_CORES_RAMO');
if (falhas.length) { console.error('\n✗ BUILD ABORTADO — cor de ramo ilegível:\n  ' + falhas.join('\n  ') + '\n'); process.exit(1); }
console.log(`  ✓ paleta de ramos legível: ${n} famílias × 2 modos — identidade ≥ 3:1 e texto escurecido ≥ 4,5:1`);
