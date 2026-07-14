// scripts/build-macos.mjs — gera o bundle WEB que vai DENTRO do Cátedra.app
// (nativo macOS). Espelha o scripts/build.mjs, mas com três diferenças, porque
// aqui o app roda em um WKWebView carregando de file:// (não é PWA na Vercel):
//
//   1. NÃO injeta o service worker (não funciona em file:// e causaria reloads).
//   2. NÃO injeta o shim window.claude → /api/complete. No app nativo a IA é
//      feita pela PONTE NATIVA (o Swift define window.claude e faz o POST via
//      URLSession — sem esbarrar em CORS de file://). Ver mac/Sources/main.swift.
//   3. Tenta VENDORAR o supabase-js localmente (web/vendor/supabase.js) para o
//      app não depender do CDN só para carregar a biblioteca. Se estiver offline
//      no build, cai no <script> do CDN (o login precisa de internet de todo jeito).
//
// O Catedra.dc.html permanece intocado — este script só o lê.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'mac', 'build', 'web');
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

// Config pública do Supabase (mesma do build web — publishable key é pública por design).
const SUPABASE_URL = 'https://frcnfqxniwzdyykvgqqu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nCm4a-RzzY8e8jVC9O6Gfg_4V6EOrI2';
const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
// React/ReactDOM UMD: o support.js baixaria do unpkg em runtime; vendorando aqui e
// carregando ANTES do support.js, o loadReactUmd() detecta window.React e NÃO busca
// na rede (app abre offline e imune a rate-limit do CDN). Versões casam com o support.js.
const REACT_CDN = 'https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js';
const REACTDOM_CDN = 'https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js';

// limpa e recria a saída
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

mkdirSync(join(OUT, 'vendor'), { recursive: true });

// Baixa uma lib para web/vendor/<file>; devolve a <script> local, ou (fallback,
// se estiver offline no build) a <script> do CDN — que ainda funciona online.
async function vendor(url, file, minLen = 1000) {
  try {
    const r = await fetch(url, { redirect: 'follow' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const js = await r.text();
    if (!js || js.length < minLen) throw new Error('corpo suspeito');
    writeFileSync(join(OUT, 'vendor', file), js);
    console.log('  · ' + file + ' vendorado localmente (' + js.length + ' bytes)');
    return `<script src="./vendor/${file}"></script>`;
  } catch (e) {
    console.log('  · ' + file + ' via CDN (não deu para vendorar: ' + e.message + ')');
    return `<script src="${url}"></script>`;
  }
}

// React deve vir ANTES de ReactDOM (que usa o global React) e ambos ANTES do support.js.
const reactTag    = await vendor(REACT_CDN, 'react.js');
const reactDomTag = await vendor(REACTDOM_CDN, 'react-dom.js');
const supabaseTag = await vendor(SUPABASE_CDN, 'supabase.js');

const INJECT = `
<!-- ▼ injetado pelo build NATIVO macOS — não existe no Catedra.dc.html original ▼ -->
<meta name="color-scheme" content="dark light">
<!-- Visual de abertura padrão: tema Clean + modo escuro + accent magenta. Só semeia
     se AINDA não houver preferência salva; roda ANTES do auth.js (setItem cru, sem
     disparar sync) e ANTES do support.js (que lê no construtor). Numa conta logada
     as prefs sincronizadas do Supabase prevalecem. -->
<script>
(function(){ try{ var s=localStorage;
  if(s.getItem('catedra:dir')==null)    s.setItem('catedra:dir','clean');
  if(s.getItem('catedra:dark')==null)   s.setItem('catedra:dark','1');
  if(s.getItem('catedra:accent')==null) s.setItem('catedra:accent','"#e718ba"');
}catch(e){} })();
</script>
<!-- React/ReactDOM locais: o support.js os detecta e NÃO busca no unpkg (abre offline). -->
${reactTag}
${reactDomTag}
<!-- login real + sincronização (Supabase). window.claude é definido pela PONTE NATIVA (Swift). -->
<script>window.CATEDRA_SUPABASE = { url: ${JSON.stringify(SUPABASE_URL)}, key: ${JSON.stringify(SUPABASE_KEY)} };</script>
${supabaseTag}
<script src="./auth.js"></script>
<!-- ▲ fim do trecho injetado ▲ -->
`;

const src = read('Catedra.dc.html');
const out = src.replace('<head>', '<head>' + INJECT);
writeFileSync(join(OUT, 'index.html'), out);

// copia os assets que o app referencia por caminho relativo
for (const f of ['support.js', 'auth.js', 'icon.svg', 'icon-180.png']) {
  if (existsSync(join(ROOT, f))) copyFileSync(join(ROOT, f), join(OUT, f));
}

console.log('✓ bundle web → mac/build/web/ (index.html + support.js + auth.js + supabase + ícones)');
