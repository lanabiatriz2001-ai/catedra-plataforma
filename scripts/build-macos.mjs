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

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync, readdirSync} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';
import { verificarPII } from './verificar-pii.mjs';
import './verificar-cores-ramo.mjs';   // trava: paleta de ramos igual nas 3 fontes

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

// Mesmo carimbo do build web: relato de bug precisa dizer QUAL versão quebrou.
let _sha = 'local';
try { _sha = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch (_) {}
const BUILD = { versao: _sha, data: new Date().toISOString().slice(0, 10), alvo: 'macOS' };

// Endereço absoluto das funções serverless. A página vem do bundle local (file://),
// então "/api/..." não resolve sozinho.
const API_BASE = 'https://catedra-plataforma.vercel.app';

const INJECT = `
<!-- ▼ injetado pelo build NATIVO macOS — não existe no Catedra.dc.html original ▼ -->
<script>window.CATEDRA_BUILD = ${JSON.stringify(BUILD)};
window.CATEDRA_API_BASE = ${JSON.stringify(API_BASE)};</script>
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
// O LEGIS e o JURIS são documentos SEPARADOS (entram por <iframe>), então o
// CATEDRA_API_BASE do index.html não chega até eles. Sem ele o leitor de lei ficava
// invisível no app nativo: o botão de ler só existe com body.online, e em file:// a
// página se declarava offline. Por isso os dois são carimbados na cópia.
const FRAMES = new Set(['legis-web.html', 'juris-web.html']);
const CARIMBO = `<script>window.CATEDRA_API_BASE = ${JSON.stringify(API_BASE)};</script>`;
for (const f of ['support.js', 'auth.js', 'icon.svg', 'icon-180.png', 'legis-web.html', 'juris-web.html', 'juris-mapas-sv.html', 'juris-index.js', 'juris-text.js', 'contas-index.js', 'contas-text.js', 'modelos-edital.js', 'discursivas.js', 'discursivas-textos.js', 'espelhos.js', 'segunda-fase-web.html', 'prioridade-dados.js', 'prioridade-web.html', 'oral.js', 'oral-conteudo.js', 'treino.js', 'tema-satelite.js', 'satellite-base.css', 'leis-catalogo.js', 'busca-unica.js', 'prioridade-calc.js', 'ct-dados.js', 'leis-seca.js', 'leis-seca-areas.js', 'questoes-prova.js', 'area-web.html', 'ritos.js', 'pecas.js', 'fluxos.js', 'peca-roteiro.js', 'mapa-grafo.js', 'mapa-processual.js', 'ritos-web.html', 'pecas-web.html', 'incidencia.js', 'area-modulos.js', 'semana-juris.js', 'plataformas-questoes.js', 'espelho-sugerido.js', 'area-registry.js', 'casos.js', 'catedra-ui.css']) {
  if (!existsSync(join(ROOT, f))) continue;
  if (FRAMES.has(f)) {
    const html = read(f);
    if (!html.includes('<head>')) throw new Error(f + ': sem <head> — o carimbo do API_BASE não teria onde entrar');
    writeFileSync(join(OUT, f), html.replace('<head>', '<head>' + CARIMBO));
  } else copyFileSync(join(ROOT, f), join(OUT, f));
}

// AS FONTES. Elas deixaram de vir do Google Fonts (o app abria sem tipografia em modo
// avião, justo no aparelho de estudo). Agora moram em ./fonts e são referenciadas pelo
// catedra-ui.css por caminho relativo — então a pasta precisa viajar dentro do bundle,
// senão o app nativo fica pior do que estava: sem CDN E sem arquivo local.
{
  const dirFontes = join(ROOT, 'fonts');
  if (existsSync(dirFontes)) {
    const destino = join(OUT, 'fonts');
    mkdirSync(destino, { recursive: true });
    let n = 0;
    for (const f of readdirSync(dirFontes)) {
      if (!f.endsWith('.woff2')) continue;
      copyFileSync(join(dirFontes, f), join(destino, f));
      n++;
    }
    if (!n) throw new Error('fonts/ existe mas está vazia — o app sairia sem tipografia');
    console.log(`  ✓ ${n} fontes empacotadas (sem CDN)`);
  }
}

// Mesma trava do build web: o .app é distribuído para os testadores, e marca d'água
// de PDF viajaria dentro dele.
verificarPII(OUT, { rotulo: 'mac/build/web/' });

console.log('✓ bundle web → mac/build/web/ (index.html + support.js + auth.js + supabase + ícones)');
