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
//  5. Ajusta o sw.js: entrada em index.html (e não Catedra.dc.html) e as três
//     listas de precache do U10 (casca, acervo e "baixar tudo") já MEDIDAS em bytes.

import { cpSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';
import { verificarPII } from './verificar-pii.mjs';
import './verificar-cores-ramo.mjs';   // trava: paleta de ramos igual nas 3 fontes

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

const src = read('Catedra.dc.html');

// Supabase (login real + sincronização). URL e chave PUBLISHABLE são PÚBLICAS
// por design — podem ficar no código do navegador. (A secreta, sb_secret_*,
// nunca vai aqui.)
const SUPABASE_URL = 'https://frcnfqxniwzdyykvgqqu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nCm4a-RzzY8e8jVC9O6Gfg_4V6EOrI2';

// ── libs de terceiros: baixadas AGORA, servidas do nosso domínio ─────────────
// Antes, React/ReactDOM (o support.js os buscava no unpkg em runtime) e o
// supabase-js vinham de CDN a cada carregamento: CDN fora do ar ou bloqueado =
// tela branca, e nada disso sobrevivia offline no PWA. Vendorando em public/vendor/
// o app depende só do próprio deploy. Versões casam com as do support.js.
const REACT_CDN = 'https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js';
const REACTDOM_CDN = 'https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js';
const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

const pub = join(ROOT, 'public');
mkdirSync(join(pub, 'vendor'), { recursive: true });

// D9: vendoring que falha FAZ O BUILD FALHAR. Antes caía para o CDN, e aí o site
// publicado dependia de cdn.jsdelivr.net/unpkg em runtime — numa rede que bloqueia CDN
// (faculdade, tribunal, sandbox) o app simplesmente não abria. Foi exatamente o que
// aconteceu no ambiente de teste. Degradar em silêncio é pior que não publicar.
//
// Escape hatch consciente: CT_PERMITE_CDN=1 volta ao comportamento antigo, para depurar.
// Não use em deploy — o aviso abaixo diz isso em voz alta.
const PERMITE_CDN = process.env.CT_PERMITE_CDN === '1';
const vendorados = [];
async function baixar(url, minLen) {
  // uma tentativa e mais duas: rede treme, e falhar o build por soluço seria pior
  let ultimo;
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      const r = await fetch(url, { redirect: 'follow' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const txt = await r.text();
      if (!txt || txt.length < minLen) throw new Error('corpo suspeito (' + (txt ? txt.length : 0) + ' bytes)');
      return txt;
    } catch (e) {
      ultimo = e;
      if (tentativa < 3) await new Promise((r) => setTimeout(r, 400 * tentativa));
    }
  }
  throw ultimo;
}
function abortar(oque, url, e) {
  console.error('\n✗ BUILD ABORTADO: não consegui vendorar ' + oque + '.');
  console.error('  fonte: ' + url);
  console.error('  erro:  ' + (e && e.message ? e.message : e));
  console.error('\n  Publicar assim deixaria o site dependendo de um CDN em runtime — e em');
  console.error('  rede que bloqueia CDN o app não abre. Conserte a rede do build, ou rode');
  console.error('  com CT_PERMITE_CDN=1 se for DEBUG (nunca para deploy).\n');
  process.exit(1);
}
async function vendor(url, file, minLen = 1000) {
  try {
    const js = await baixar(url, minLen);
    writeFileSync(join(pub, 'vendor', file), js);
    console.log('  · ' + file + ' vendorado (' + js.length + ' bytes)');
    vendorados.push('./vendor/' + file);
    return `<script src="./vendor/${file}"></script>`;
  } catch (e) {
    if (!PERMITE_CDN) abortar(file, url, e);
    console.log('  ⚠ ' + file + ' via CDN (CT_PERMITE_CDN=1 — deploy NÃO deve sair assim): ' + e.message);
    return `<script src="${url}"></script>`;
  }
}

// ── fontes: mesmo tratamento (resolve o offline junto) ──────────────────────
// O CSS do Google Fonts é o mesmo arquivo com URLs .woff2 dentro. Baixamos o CSS,
// puxamos cada .woff2 e reescrevemos as URLs para o nosso domínio. font-display:swap
// já vem do parâmetro &display=swap da própria URL.
const FONTS_CSS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700'
  + '&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600'
  + '&family=Space+Grotesk:wght@400;500;600;700&family=Spectral:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap';
async function vendorarFontes() {
  mkdirSync(join(pub, 'fonts'), { recursive: true });
  let css;
  try {
    // UA de navegador moderno: sem isso o Google devolve .ttf em vez de .woff2
    const r = await fetch(FONTS_CSS, { redirect: 'follow', headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    css = await r.text();
    if (!css || css.length < 500) throw new Error('CSS suspeito');
  } catch (e) {
    if (!PERMITE_CDN) abortar('as fontes (Google Fonts)', FONTS_CSS, e);
    console.log('  ⚠ fontes via Google (CT_PERMITE_CDN=1): ' + e.message);
    return null;
  }
  const urls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]))];
  let n = 0;
  for (const u of urls) {
    const nome = u.split('/').slice(-2).join('-').replace(/[^\w.-]/g, '_');
    try {
      const r = await fetch(u, { redirect: 'follow' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      writeFileSync(join(pub, 'fonts', nome), Buffer.from(await r.arrayBuffer()));
      css = css.split(u).join('./fonts/' + nome);
      n++;
    } catch (e) {
      if (!PERMITE_CDN) abortar('o arquivo de fonte ' + nome, u, e);
    }
  }
  writeFileSync(join(pub, 'fonts.css'), css);
  console.log('  · fontes vendoradas (' + n + ' arquivos, css ' + css.length + ' bytes)');
  return './fonts.css';
}

// React antes de ReactDOM (que usa o global React), ambos antes do support.js.
const reactTag = await vendor(REACT_CDN, 'react.js');
const reactDomTag = await vendor(REACTDOM_CDN, 'react-dom.js');
const supabaseTag = await vendor(SUPABASE_CDN, 'supabase.js');
const fontsHref = await vendorarFontes();

// Carimbo do build. Sem ele, um relato de bug de testador chega sem dizer QUAL versão
// quebrou — e aí não dá para saber se já foi corrigido. Na Vercel o sha vem do ambiente.
function carimbo() {
  const sha = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7);
  if (sha) return sha;
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
  } catch (_) {
    return 'local';
  }
}
const BUILD = { versao: carimbo(), data: new Date().toISOString().slice(0, 10), alvo: 'web' };
console.log('  · build ' + BUILD.versao + ' (' + BUILD.data + ')');

const INJECT = `
<!-- ▼ injetado pelo build de produção — NÃO existe no Catedra.dc.html original ▼ -->
<script>window.CATEDRA_BUILD = ${JSON.stringify(BUILD)}; window.CATEDRA_API_BASE = "";</script>
<link rel="manifest" href="./manifest.webmanifest">
<meta name="theme-color" content="#0f7a57">
<!-- PWA instalável no iPhone (Adicionar à Tela de Início) -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Cátedra">
<link rel="apple-touch-icon" href="./icon-180.png">
<!-- React/ReactDOM locais: o support.js os detecta e NÃO busca no unpkg. -->
${reactTag}
${reactDomTag}
<!-- login real + sincronização na nuvem (Supabase) — carregado ANTES do support.js -->
<script>window.CATEDRA_SUPABASE = { url: ${JSON.stringify(SUPABASE_URL)}, key: ${JSON.stringify(SUPABASE_KEY)} };</script>
<!-- Login social e Google Drive: só entram quando configurados no deploy (GOOGLE_CLIENT_ID, OAUTH_PROVIDERS=google,apple). -->
<script>window.CATEDRA_GOOGLE = { clientId: ${JSON.stringify(process.env.GOOGLE_CLIENT_ID || '')} }; window.CATEDRA_OAUTH = ${JSON.stringify((process.env.OAUTH_PROVIDERS || '').split(',').map((s) => s.trim()).filter(Boolean))};</script>
${supabaseTag}
<script src="./auth.js"></script>
<script>
/* Provedor de IA em produção: encaminha o prompt para a função serverless
   (Google Gemini via Vercel). A chave da API fica só no servidor
   (GEMINI_API_KEY) e nunca chega ao navegador do aluno. Com isso, Mentor IA e a
   correção de redação passam a usar a IA de verdade — não o fallback local. */
window.claude = {
  complete: async function (prompt) {
    // A função serverless só atende quem está logado (senão era IA grátis para a
    // internet inteira, na conta da dona do app). Manda o access_token da sessão.
    var token = null;
    try {
      var s = await window.CatedraAuth.client.auth.getSession();
      token = s && s.data && s.data.session && s.data.session.access_token;
    } catch (_) {}
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const r = await fetch('/api/complete', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ prompt: prompt })
    });
    if (r.status === 401 || r.status === 403) {
      var j401 = await r.json().catch(function () { return {}; });
      throw new Error(j401.error || 'Entre na sua conta para usar a IA.');
    }
    if (!r.ok) throw new Error('IA HTTP ' + r.status);
    const j = await r.json();
    return j.completion || j.text || '';
  }
};
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
}
/* U10 — ponte de instalação e de acervo offline para os Ajustes do host.
   Por que aqui e não lá dentro: o navegador dispara 'beforeinstallprompt' UMA vez,
   antes de a interface existir. Quem não segurar o evento neste ponto perde o
   direito de chamar prompt() depois — e o item "Instalar no aparelho" viraria um
   botão que não faz nada. O host só lê window.__catedraInstall / __catedraOffline;
   fora do deploy web (preview local, app do Mac/iPad) eles não existem, e o item
   deve simplesmente não aparecer. */
window.__catedraInstall = (function () {
  var ev = null, ouvintes = [];
  var ua = navigator.userAgent || '';
  var iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  function jaInstalado() {
    try { if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true; } catch (_) {}
    return navigator.standalone === true;
  }
  var api = {
    plataforma: iOS ? 'ios' : 'outros',
    instalado: jaInstalado(),
    // No iOS não existe prompt nenhum: o caminho é manual, e a instrução abaixo é
    // a única coisa honesta a mostrar.
    promptDisponivel: false,
    instrucao: iOS
      ? 'No Safari, toque em Compartilhar e escolha "Adicionar à Tela de Início".'
      : 'No menu do navegador, escolha "Instalar aplicativo".',
    aoMudar: function (fn) { if (typeof fn === 'function') ouvintes.push(fn); },
    instalar: function () {
      if (!ev) return Promise.resolve('indisponivel');
      var p = ev; ev = null; api.promptDisponivel = false; avisa();
      try { p.prompt(); } catch (_) { return Promise.resolve('indisponivel'); }
      return Promise.resolve(p.userChoice).then(function (r) {
        return (r && r.outcome === 'accepted') ? 'aceito' : 'recusado';
      }).catch(function () { return 'indisponivel'; });
    }
  };
  function avisa() { ouvintes.forEach(function (f) { try { f(api); } catch (_) {} }); }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); ev = e; api.promptDisponivel = true; avisa();
  });
  window.addEventListener('appinstalled', function () {
    api.instalado = true; api.promptDisponivel = false; ev = null; avisa();
  });
  return api;
})();
/* Quanto do acervo já está guardado neste aparelho, e o botão de baixar o resto.
   O worker traz sozinho os ~11 MB do estudo do dia; baixar() acrescenta os ~18 MB
   pesados (texto do JURIS para o simulado de súmulas, perguntas da arguição oral,
   leis das outras áreas), que só descem quando ela manda. estado() devolve
   { prontos, total, bytes, totalBytes, auto:{...} } — o campo "auto" é a parte
   automática, para o Ajuste poder dizer "o dia a dia está pronto" sem uma barra
   eternamente pela metade. baixar() também é o único caminho para quem está com
   "economizar dados" ligado, porque aí o aquecimento automático não roda. */
window.__catedraOffline = (function () {
  function fala(msg) {
    return new Promise(function (ok, falha) {
      var sw = navigator.serviceWorker;
      if (!sw) return falha(new Error('sem service worker'));
      sw.ready.then(function (reg) {
        var alvo = reg.active || sw.controller;
        if (!alvo) return falha(new Error('worker não ativo'));
        var canal = new MessageChannel();
        var t = setTimeout(function () { falha(new Error('sem resposta do worker')); }, 20000);
        canal.port1.onmessage = function (e) { clearTimeout(t); ok(e.data); };
        alvo.postMessage(msg, [canal.port2]);
      }).catch(falha);
    });
  }
  return {
    estado: function () { return fala({ type: 'ctEstadoOffline' }).then(function (r) { return (r && r.estado) || null; }); },
    baixar: function () { return fala({ type: 'ctAquecerAcervos' }).then(function (r) { return (r && r.resultado) || null; }); }
  };
})();
</script>
<!-- ▲ fim do trecho injetado ▲ -->
`;

// D9: as fontes passam a ser servidas do próprio domínio. O <link> do Google e os dois
// preconnect saem — senão o navegador ainda bate lá, e numa rede que bloqueia o Google
// a página trava esperando o CSS.
let out = src.replace('<head>', '<head>' + INJECT);
if (fontsHref) {
  out = out
    .replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*/g, '')
    .replace(/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com"[^>]*>\s*/g, '')
    .replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]*" rel="stylesheet">/g,
             '<link href="' + fontsHref + '" rel="stylesheet">');
}

writeFileSync(join(pub, 'index.html'), out);

for (const f of ['support.js', 'icon.svg', 'auth.js', 'icon-180.png', 'legis-web.html', 'juris-web.html', 'juris-mapas-sv.html', 'juris-index.js', 'juris-text.js', 'contas-index.js', 'contas-text.js', 'modelos-edital.js', 'discursivas.js', 'discursivas-textos.js', 'espelhos.js', 'segunda-fase-web.html', 'prioridade-dados.js', 'prioridade-web.html', 'oral.js', 'oral-conteudo.js', 'treino.js', 'tema-satelite.js', 'satellite-base.css', 'leis-catalogo.js', 'busca-unica.js', 'prioridade-calc.js', 'ct-dados.js', 'leis-seca.js', 'leis-seca-areas.js', 'questoes-prova.js', 'area-web.html', 'ritos.js', 'pecas.js', 'fluxos.js', 'peca-roteiro.js', 'ritos-web.html', 'pecas-web.html', 'incidencia.js', 'area-modulos.js', 'semana-juris.js', 'plataformas-questoes.js', 'espelho-sugerido.js']) {
  if (existsSync(join(ROOT, f))) copyFileSync(join(ROOT, f), join(pub, f));
}
// fatias dos acervos (ct-dados/sw): pasta inteira, nomes com hash
cpSync(join(ROOT, 'dados'), join(pub, 'dados'), { recursive: true });

// manifest: no deploy o start_url é index.html (não Catedra.dc.html) + ícone PNG p/ iOS
{
  const mani = JSON.parse(read('manifest.webmanifest'));
  mani.start_url = './index.html';
  mani.scope = './';
  mani.icons = [
    { src: './icon-180.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    { src: './icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    { src: './icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
  ];
  writeFileSync(join(pub, 'manifest.webmanifest'), JSON.stringify(mani, null, 2));
}

// ── U10: precache MEDIDO ─────────────────────────────────────────────────────
// O sw.js não chuta tamanho de arquivo nenhum: as listas saem daqui já com o byte
// real de cada arquivo, para que o orçamento de cota lá dentro seja aritmética.
const bytesDe = (rel) => { try { return statSync(join(pub, rel)).size; } catch (_) { return 0; } };
const pastasDeDados = () => {
  try {
    return readdirSync(join(pub, 'dados'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch (_) { return []; }
};

/* CAMADA 1 — a casca, precache bloqueante do install. Só o que o app precisa para
   ABRIR. Antes, os três <script> do <head> e as fontes só entravam no cache DEPOIS
   da primeira navegação — quem instalasse e entrasse no avião em seguida abria o
   app sem eles. */
const casca = [...vendorados, './prioridade-calc.js', './busca-unica.js', './semana-juris.js',
  // C2 e C3 tambem sao <script> do <head>: fora da casca, o app instalado abriria sem
  // o mapa das plataformas e sem o miolo do espelho sugerido.
  './plataformas-questoes.js', './espelho-sugerido.js', './icon-180.png'];
if (fontsHref) {
  casca.push('./fonts.css');
  // Só os subconjuntos latinos. O Google fatia cada família por unicode-range e o
  // build vendorou os 48 arquivos (860 KB); precachear cirílico, grego e vietnamita
  // num app de direito brasileiro seria pagar install mais lento e cota do aparelho
  // por bytes que ninguém vai renderizar. Os outros continuam publicados e entram no
  // cache pela rede se algum dia forem pedidos.
  try {
    const css = readFileSync(join(pub, 'fonts.css'), 'utf8');
    const re = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{[^}]*?url\(\.\/fonts\/([^)]+)\)/g;
    const latinos = new Set();
    for (let m; (m = re.exec(css));) if (m[1] === 'latin' || m[1] === 'latin-ext') latinos.add(m[2]);
    for (const f of latinos) casca.push('./fonts/' + f);
  } catch (_) {}
}
// Manifestos dos acervos fatiados: 3 arquivos de ~1 KB cada. Sem eles guardados, no
// primeiro voo offline o CTDados nem descobre que os blocos existem, dá o acervo por
// indisponível e cai no monolito de 4 MB — que também não está lá. É o arquivo com a
// melhor relação tamanho/estrago do deploy inteiro.
for (const nome of pastasDeDados()) {
  const rel = './dados/' + nome + '/manifesto.json';
  if (bytesDe(rel)) casca.push(rel);
}

/* CAMADA 2 — os acervos, aquecidos DEPOIS de ativar, em ordem de prioridade.
   A ordem é o que se perde primeiro quando a cota do aparelho é apertada:
   quem não couber no orçamento do sw.js é cortado do fim para o começo. */
const acervoOffline = [
  // 1. as telas satélite — sem elas, abrir LEGIS/JURIS/roteiros offline dá tela branca
  './tema-satelite.js', './satellite-base.css', './ritos-web.html', './pecas-web.html', './area-web.html',
  './legis-web.html', './juris-web.html', './segunda-fase-web.html', './prioridade-web.html',
  // 2. os scripts que cada satélite carrega
  './ritos.js', './pecas.js', './fluxos.js', './peca-roteiro.js', './area-modulos.js',
  './treino.js', './leis-catalogo.js', './prioridade-dados.js', './incidencia.js',
  // 3. lei seca em blocos (4,3 MB): é o treino diário, e o acervoLeis() do treino.js
  //    pede o acervo INTEIRO — offline, bloco faltando vira lista de leis vazia,
  //    em silêncio. Vão para o cache de dados, não para o da casca.
  ...(() => {
    try {
      const m = JSON.parse(readFileSync(join(pub, 'dados', 'leis-seca', 'manifesto.json'), 'utf8'));
      return (m.arquivos || []).map((a) => './dados/leis-seca/' + a);
    } catch (_) { return []; }
  })(),
  // 4. os acervos do estudo do dia
  './questoes-prova.js', './espelhos.js', './oral.js', './modelos-edital.js', './discursivas.js',
  // 5. JURIS: o índice dos 14,6 mil verbetes (busca e navegação offline). O TEXTO
  //    fica de fora — são 10 MB, e é exatamente para isso que ele foi fatiado.
  './juris-index.js', './juris-mapas-sv.html',
];
/* CAMADA 3 — os pesados, baixados só quando ela pedir ("Baixar tudo" nos Ajustes,
   via window.__catedraOffline.baixar()). Cada um desbloqueia UMA tela offline e
   custa caro; trazer isso sozinho é que seria estourar a cota do aparelho. */
const acervoSobPedido = [
  './juris-text.js',        // Simulado de súmulas: treino.js monta os itens com __JURIS_TXT__ inteiro
  './oral-conteudo.js',     // as 999 perguntas de banca da arguição oral
  './leis-seca-areas.js',   // as 35 leis das áreas não jurídicas
];
const medir = (lista) => lista.map((p) => [p, bytesDe(p)]).filter(([p, b]) => {
  if (!b) console.log('  ⚠ acervo offline ausente do deploy, fora do precache: ' + p);
  return b > 0;
});
const acervos = medir(acervoOffline);
const sobPedido = medir(acervoSobPedido);
const somaAcervo = acervos.reduce((s, [, b]) => s + b, 0);
const somaSobPedido = sobPedido.reduce((s, [, b]) => s + b, 0);
const somaCasca = casca.reduce((s, p) => s + bytesDe(p), 0) + bytesDe('./index.html');
const mb = (n) => (n / 1048576).toFixed(1) + ' MB';
console.log('  · precache: casca ' + mb(somaCasca) + ' (' + (casca.length + 1) + ' arquivos) + acervo '
  + mb(somaAcervo) + ' (' + acervos.length + ' arquivos) + sob pedido ' + mb(somaSobPedido)
  + ' (' + sobPedido.length + ' arquivos)');
// Os tetos estão declarados no sw.js; estourá-los não quebra nada (a cauda é cortada
// em silêncio lá), mas passar por isso sem avisar seria perder um acervo sem saber.
const TETO_SW = 14 * 1024 * 1024;
const TETO_PEDIDO_SW = 34 * 1024 * 1024;
if (somaAcervo > TETO_SW) {
  console.log('  ⚠ o acervo offline (' + mb(somaAcervo) + ') passou do orçamento do sw.js ('
    + mb(TETO_SW) + '): a cauda da lista NÃO será baixada. Meça e reordene ACERVO_OFFLINE.');
}
if (somaAcervo + somaSobPedido > TETO_PEDIDO_SW) {
  console.log('  ⚠ acervo + sob pedido (' + mb(somaAcervo + somaSobPedido) + ') passou do orçamento de pedido do sw.js ('
    + mb(TETO_PEDIDO_SW) + '): "Baixar tudo" não trará a cauda.');
}

// sw.js: entrada é index.html (não Catedra.dc.html) e as libs vendoradas entram
// no precache — assim o app instalado abre offline sem depender de CDN nenhum.
if (existsSync(join(ROOT, 'sw.js'))) {
  const sw = read('sw.js')
    .replace(/\.\/Catedra\.dc\.html/g, './index.html')
    .replace('/*__EXTRA_ASSETS__*/', 'ASSETS = ASSETS.concat(' + JSON.stringify(casca) + ');')
    .replace('/*__ACERVOS__*/', 'ACERVOS = ' + JSON.stringify(acervos) + ';')
    .replace('/*__ACERVOS_SOB_PEDIDO__*/', 'ACERVOS_SOB_PEDIDO = ' + JSON.stringify(sobPedido) + ';');
  writeFileSync(join(pub, 'sw.js'), sw);
}

// Última porta antes da internet: public/ vai inteiro para a Vercel, sem autenticação.
// Se houver marca d'água de PDF (CPF/telefone/nome) em qualquer asset, o build morre aqui.
verificarPII(pub, { rotulo: 'public/' });

console.log('✓ build OK → public/ (index.html + support.js + sw.js + manifest + icon)');
