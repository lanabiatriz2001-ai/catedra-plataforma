// scripts/verificar-cores-ramo.mjs — trava de design dos builds.
//
// POR QUE ISTO EXISTE: a cor por ramo vive em DOIS lugares — CT_CORES_RAMO na web
// (Catedra.dc.html) e ios/vendor/design/CoresAcervo.swift no nativo (Mac e iPad, LEGIS e
// JURIS; tabela única desde 25/09/2026). Já divergiu uma vez (a web ficou meses fora da
// paleta "vitrine" aprovada); esta checagem roda no build e ABORTA se alguém mudar um lado
// e esquecer o outro — ou se um Theme.swift/JurisTheme.swift voltar a ter tabela própria.
//
// O que compara: as famílias da paleta vitrine (constitucional, penal, civil, trabalho,
// previdenciário, tributário, empresarial, administrativo, consumidor, ambiental,
// digital, internacional) — o valor CLARO/base de cada uma nas duas fontes.
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

// Nativo: UMA tabela (ios/vendor/design/CoresAcervo.swift), compilada pelo Mac e pelo iPad.
const tabela = {};
const mTab = ler('ios/vendor/design/CoresAcervo.swift').match(/var identidade: UInt32 \{[\s\S]*?\n    \}/);
if (!mTab) throw new Error('bloco var identidade não encontrado em ios/vendor/design/CoresAcervo.swift');
for (const [, caso, hex] of mTab[0].matchAll(/case \.(\w+):\s*return 0x([0-9A-Fa-f]{6})/g)) tabela[caso] = '#' + hex.toUpperCase();

// Trava: nenhum Theme.swift / JurisTheme.swift volta a ter tabela própria de ramo.
const paralelas = [];
for (const lado of ['mac', 'ios']) {
  const legis = ler(`${lado}/vendor/legis/Theme.swift`).match(/var color: Color \{[\s\S]*?\n    \}/);
  if (legis && /Color\(hex: 0x/.test(legis[0])) paralelas.push(`${lado}/vendor/legis/Theme.swift (LawCategory.color)`);
  if (/if hit\([^)]*\)\s*\{ return \[Color\(hex: "#/.test(ler(`${lado}/vendor/juris/Design/JurisTheme.swift`)))
    paralelas.push(`${lado}/vendor/juris/Design/JurisTheme.swift (RamoStyle.stops)`);
}

const erros = paralelas.map((p) => `tabela de ramo paralela reapareceu em ${p} — use ios/vendor/design/CoresAcervo.swift`);
for (const f of FAMILIAS) {
  const w = web[f], n = tabela[f];
  if (!w || !n) { erros.push(`${f}: ausente em ${[!w && 'web', !n && 'tabela nativa'].filter(Boolean).join(', ')}`); continue; }
  if (w !== n) erros.push(`${f}: web ${w} · nativo ${n}`);
}
if (erros.length) {
  throw new Error('\n✗ BUILD ABORTADO — paleta de ramos divergiu entre web e nativo:\n    '
    + erros.join('\n    ')
    + '\n  Alinhe CT_CORES_RAMO (Catedra.dc.html) e ios/vendor/design/CoresAcervo.swift e rode de novo.');
}
console.log(`✓ paleta vitrine consistente — web × tabela nativa única (${FAMILIAS.length} famílias)`);
