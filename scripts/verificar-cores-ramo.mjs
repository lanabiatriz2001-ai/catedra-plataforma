// scripts/verificar-cores-ramo.mjs — trava de design dos builds.
//
// POR QUE ISTO EXISTE: a cor por ramo vive em TRÊS lugares — CT_CORES_RAMO na web
// (Catedra.dc.html), LawCategory.color no LEGIS (Theme.swift) e RamoStyle.stops no
// JURIS (JurisTheme.swift) — e já divergiu uma vez (a web ficou meses fora da paleta
// "vitrine" aprovada). Em 21/08/2026 os três foram alinhados por VALOR; esta checagem
// roda no build e ABORTA se alguém mudar um lado e esquecer os outros.
//
// O que compara: as famílias da paleta vitrine (constitucional, penal, civil, trabalho,
// previdenciário, tributário, empresarial, administrativo, consumidor, ambiental,
// digital, internacional) — o valor CLARO/base de cada uma nas três fontes.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => readFileSync(join(ROOT, p), 'utf8');

const FAMILIAS = ['constitucional', 'penal', 'civil', 'trabalho', 'previdenciario',
  'tributario', 'empresarial', 'administrativo', 'consumidor', 'ambiental', 'digital', 'internacional'];

// web: CT_CORES_RAMO — 'chave': {c:'#HEX', ...}
const web = {};
const mWeb = ler('Catedra.dc.html').match(/const CT_CORES_RAMO = \{[\s\S]*?\n\};/);
if (!mWeb) throw new Error('CT_CORES_RAMO não encontrado em Catedra.dc.html');
for (const [, k, c] of mWeb[0].matchAll(/'([a-z\- ]+)':\s*\{c:'(#[0-9A-Fa-f]{6})'/g)) web[k] = c.toUpperCase();

// LEGIS e JURIS: os DOIS lados (mac e ios são árvores gêmeas — cada uma pode divergir)
const fontes = { web };
for (const lado of ['mac', 'ios']) {
  const legis = {};
  const mLegis = ler(`${lado}/vendor/legis/Theme.swift`).match(/var color: Color \{[\s\S]*?\n    \}/);
  if (!mLegis) throw new Error(`bloco var color não encontrado em ${lado}/vendor/legis/Theme.swift`);
  for (const [, caso, hex] of mLegis[0].matchAll(/case \.(\w+):\s*return Color\(hex: 0x([0-9A-Fa-f]{6})\)/g)) legis[caso] = '#' + hex.toUpperCase();
  const juris = {};
  for (const [, gatilhos, hex] of ler(`${lado}/vendor/juris/Design/JurisTheme.swift`)
    .matchAll(/if hit\(([^)]*)\)\s*\{ return \[Color\(hex: "(#[0-9A-Fa-f]{6})"/g)) {
    for (const g of gatilhos.matchAll(/"([^"]+)"/g)) juris[g[1]] = hex.toUpperCase();
  }
  fontes[`legis-${lado}`] = legis; fontes[`juris-${lado}`] = juris;
}

// equivalência de chaves entre as fontes (a nomenclatura difere de propósito)
const CHAVE = {
  web: (f) => f,
  legis: (f) => ({ trabalho: 'trabalhista' }[f] || f),
  juris: (f) => ({ constitucional: 'constituc', trabalho: 'trabalh', previdenciario: 'previden',
    tributario: 'tribut', empresarial: 'empresar', administrativo: 'administr',
    consumidor: 'consum', ambiental: 'ambient', digital: 'digital', internacional: 'internacional',
    civil: 'civil', penal: 'penal' }[f] || f),
};

const erros = [];
for (const f of FAMILIAS) {
  const w = web[CHAVE.web(f)];
  const vals = { web: w,
    'legis-mac': fontes['legis-mac'][CHAVE.legis(f)], 'legis-ios': fontes['legis-ios'][CHAVE.legis(f)],
    'juris-mac': fontes['juris-mac'][CHAVE.juris(f)], 'juris-ios': fontes['juris-ios'][CHAVE.juris(f)] };
  const ausentes = Object.entries(vals).filter(([, v]) => !v).map(([k]) => k);
  if (ausentes.length) { erros.push(`${f}: ausente em ${ausentes.join(', ')}`); continue; }
  const distintos = new Set(Object.values(vals));
  if (distintos.size > 1) erros.push(`${f}: ` + Object.entries(vals).map(([k, v]) => `${k} ${v}`).join(' · '));
}
if (erros.length) {
  throw new Error('\n✗ BUILD ABORTADO — paleta de ramos divergiu entre web e nativo:\n    '
    + erros.join('\n    ')
    + '\n  Alinhe as três fontes (CT_CORES_RAMO, LawCategory.color, RamoStyle.stops) e rode de novo.');
}
console.log(`✓ paleta vitrine consistente nas 5 fontes — web + legis/juris × mac/ios (${FAMILIAS.length} famílias)`);
