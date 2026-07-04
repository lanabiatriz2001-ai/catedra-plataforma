// scripts/build.mjs — gera a pasta public/ pronta para a Vercel a partir do
// Catedra.dc.html ORIGINAL (que permanece intocado, para não quebrar o
// visualizador desktop do dc-runtime).
//
// O que ele faz:
//  1. Lê Catedra.dc.html (a fonte pristina).
//  2. Injeta, logo após <head>: o shim window.claude.complete (que chama a
//     função serverless /api/complete), o <link rel="manifest"> e o registro
//     do service worker (PWA).
//  3. Escreve o resultado em public/index.html.
//  4. Copia support.js, sw.js, manifest.webmanifest e icon.svg para public/.
//  5. Ajusta o sw.js para cachear index.html (e não Catedra.dc.html).

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

const src = read('Catedra.dc.html');

// Supabase (login real + sincronização). URL e chave PUBLISHABLE são PÚBLICAS
// por design — podem ficar no código do navegador. (A secreta, sb_secret_*,
// nunca vai aqui.)
const SUPABASE_URL = 'https://frcnfqxniwzdyykvgqqu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nCm4a-RzzY8e8jVC9O6Gfg_4V6EOrI2';

const INJECT = `
<!-- ▼ injetado pelo build de produção — NÃO existe no Catedra.dc.html original ▼ -->
<link rel="manifest" href="./manifest.webmanifest">
<meta name="theme-color" content="#0f7a57">
<!-- login real + sincronização na nuvem (Supabase) — carregado ANTES do support.js -->
<script>window.CATEDRA_SUPABASE = { url: ${JSON.stringify(SUPABASE_URL)}, key: ${JSON.stringify(SUPABASE_KEY)} };</script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="./auth.js"></script>
<script>
/* Provedor de IA em produção: encaminha o prompt para a função serverless
   (Google Gemini via Vercel). A chave da API fica só no servidor
   (GEMINI_API_KEY) e nunca chega ao navegador do aluno. Com isso, Mentor IA e a
   correção de redação passam a usar a IA de verdade — não o fallback local. */
window.claude = {
  complete: async function (prompt) {
    const r = await fetch('/api/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt })
    });
    if (!r.ok) throw new Error('IA HTTP ' + r.status);
    const j = await r.json();
    return j.completion || j.text || '';
  }
};
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
}
</script>
<!-- ▲ fim do trecho injetado ▲ -->
`;

const out = src.replace('<head>', '<head>' + INJECT);

const pub = join(ROOT, 'public');
mkdirSync(pub, { recursive: true });
writeFileSync(join(pub, 'index.html'), out);

for (const f of ['support.js', 'manifest.webmanifest', 'icon.svg', 'auth.js']) {
  if (existsSync(join(ROOT, f))) copyFileSync(join(ROOT, f), join(pub, f));
}

// sw.js: o arquivo de entrada agora é index.html (não Catedra.dc.html)
if (existsSync(join(ROOT, 'sw.js'))) {
  const sw = read('sw.js').replace(/\.\/Catedra\.dc\.html/g, './index.html');
  writeFileSync(join(pub, 'sw.js'), sw);
}

console.log('✓ build OK → public/ (index.html + support.js + sw.js + manifest + icon)');
