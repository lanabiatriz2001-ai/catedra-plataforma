// scripts/build-leis-catalogo.mjs — extrai o catálogo de normas do CátedraLEGIS para um
// .js leve que o host possa indexar na paleta ⌘K.
//
// Por que existe: o catálogo (268 normas com título, referência, área e URL) mora dentro
// de legis-web.html, que é a página do iframe — o host não consegue ler de lá. Duplicar a
// lista à mão criaria duas verdades que divergem na primeira atualização. Este script
// mantém UMA fonte (o legis-web.html) e gera a cópia legível pelo host.
//
// Uso: node scripts/build-leis-catalogo.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'legis-web.html'), 'utf8');

const marca = 'const CAT=';
const i = src.indexOf(marca);
if (i < 0) { console.error('legis-web.html: não achei "const CAT=" — o catálogo mudou de nome?'); process.exit(1); }

// O valor é um objeto JSON numa linha só, mas a declaração continua com outras
// constantes (`const CAT={…}, PLANO=[…]`): achar o `;` não serve. Fechamos pelo
// balanceamento de chaves, respeitando strings e escapes.
const inicio = src.indexOf('{', i);
let prof = 0, dentro = false, esc = false, fim = -1;
for (let k = inicio; k < src.length; k++) {
  const ch = src[k];
  if (esc) { esc = false; continue; }
  if (ch === '\\') { esc = true; continue; }
  if (ch === '"') { dentro = !dentro; continue; }
  if (dentro) continue;
  if (ch === '{') prof++;
  else if (ch === '}') { prof--; if (!prof) { fim = k + 1; break; } }
}
if (fim < 0) { console.error('legis-web.html: chaves do catálogo não fecham'); process.exit(1); }
const bruto = src.slice(inicio, fim);
let CAT;
try { CAT = JSON.parse(bruto); }
catch (e) { console.error('não consegui interpretar o catálogo como JSON:', e.message); process.exit(1); }

const laws = Array.isArray(CAT.laws) ? CAT.laws : [];
if (!laws.length) { console.error('catálogo vazio'); process.exit(1); }

// só o que a paleta precisa: título, referência (Lei nº …), área e URL
const saida = laws.map((l) => ({ t: String(l.t || '').trim(), r: String(l.r || '').trim(), c: String(l.c || '').trim(), u: String(l.u || '') }))
  .filter((l) => l.t);

writeFileSync(join(ROOT, 'leis-catalogo.js'),
  '// Gerado por scripts/build-leis-catalogo.mjs a partir de legis-web.html. Não editar à mão.\n'
  + '// Catálogo de normas do CátedraLEGIS — só título, referência, área e URL (a paleta ⌘K\n'
  + '// indexa isto; o texto dos artigos continua em leis-seca.js, que é pesado demais aqui).\n'
  + 'window.CT_LEIS_CAT = ' + JSON.stringify(saida) + ';\n');

const porArea = saida.reduce((a, l) => { a[l.c] = (a[l.c] || 0) + 1; return a; }, {});
console.log(`leis-catalogo.js: ${saida.length} normas · ${Object.keys(porArea).length} áreas`);
