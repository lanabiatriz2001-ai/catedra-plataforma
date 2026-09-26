/* TRAVA GERAL — NENHUMA REDE EXTERNA (25/09/2026).

   Regra da casa (CLAUDE.md): nada de rede externa em tempo de execução, nada de CDN, nada de
   fonte externa; o app roda offline e em file://. O D9 do tests/run.mjs guardava a regra por
   amostra — alguns padrões (cdnjs, jsdelivr/unpkg, Google Fonts) em alguns arquivos. Um
   `<script src="https://…">` criado em tempo de execução, ou um host novo, passava calado:
   foi assim que o PDF.js ficou meses vindo do cdnjs. Este módulo troca a amostra pela regra.

   1. VARREDURA ESTÁTICA (varrerRedeExterna): todo arquivo de texto da saída de um build
      (public/ e mac/build/web/: .html .js .mjs .css .json .webmanifest) é procurado por URL
      absoluta http(s) — ou sem protocolo, `//host/…` — num lugar que a CARREGA: src=/srcset=/
      poster=, `<link rel=stylesheet|preload|preconnect|icon|manifest…>`, @import, url(),
      importScripts, new Worker(, fetch(, XMLHttpRequest.open, sendBeacon, EventSource/WebSocket,
      import()/import … from, setAttribute('src', …) — e ainda:
        · literal de URL de RECURSO (.js .mjs .css .woff .woff2 .ttf .otf .eot .wasm) guardado
          numa variável para ser carregado depois (é o caso do React no support.js: a URL mora
          numa constante e o `s.src = src` não tem literal nenhum);
        · qualquer URL de um host de CDN (unpkg, jsdelivr, cdnjs, Google Fonts…), mesmo em
          comentário (como já fazia o caso do cdnjs: citar o CDN num arquivo publicado já é
          convite a voltar a ele).
      Link de navegação `<a href="https://…">` NÃO acusa: ele não carrega nada, só leva a pessoa
      para fora quando ela clica (Planalto, STF, STJ…).
      Cada achado sai como arquivo:linha — regra — URL. O que está em EXCECOES passa, e o
      relatório diz quantas vezes cada exceção foi usada.

   2. EXECUÇÃO (testarRedeExternaExecucao): o app PUBLICADO (public/index.html pelo servidor da
      suíte) e o BUNDLE nativo (mac/build/web/index.html em file://) abrem num contexto em que
      toda origem que não é a do app é ABORTADA e anotada; a abertura, o LEGIS, o JURIS e a
      importação de um PDF rodam, e nenhum pedido externo fora das exceções pode ter saído.

   3. HARNESS SEM REDE (instalarRedeLocal, usado por tests/_infra.mjs em TODO contexto da suíte):
      o Catedra.dc.html cru (origens http e file da suíte) não traz React — o support.js o busca
      no unpkg, com SRI. A suíte baixava React do unpkg a cada carga. Agora o pedido ao unpkg é
      respondido com os bytes de vendor/ (os mesmos que o build publica, e que batem com o SRI
      do support.js — a integridade é conferida pelo próprio navegador), e todo o resto que sai
      para fora é ABORTADO e contado. A suíte inteira roda sem rede. CT_REDE=livre desliga o
      bloqueio (só para depurar; o React continua vindo de vendor/). */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ---------------------------------------------------------------------------------------
   EXCEÇÕES — a lista inteira do que PODE sair para a rede. Rede por natureza: sem ela a
   função não existe, e cada uma falha com aviso quando não há internet (nunca derruba o app).
   Mexer aqui é decisão, não conserto: cada entrada diz o porquê.
     url      — a URL absoluta (ou o começo dela) que pode ser carregada;
     arquivos — em quais arquivos da saída ela pode aparecer (caminho relativo à saída).
   --------------------------------------------------------------------------------------- */
export const EXCECOES = [
  { id: 'supabase',
    url: /^https:\/\/frcnfqxniwzdyykvgqqu\.supabase\.co(?:[/?#]|$)/,
    arquivos: /./,
    motivo: 'Supabase do projeto vivo (catedraplataforma): login e sincronização entre aparelhos — auth.js. Sem rede o app segue local.' },
  { id: 'google-identity',
    url: /^https:\/\/accounts\.google\.com\/gsi\/client$/,
    arquivos: /^index\.html$/,
    motivo: 'Google Identity Services: só quando a pessoa pede backup no Google Drive (_gdriveToken), nunca no boot.' },
  { id: 'google-drive',
    url: /^https:\/\/www\.googleapis\.com\/(?:upload\/)?drive\/v3\/files/,
    arquivos: /^index\.html$/,
    motivo: 'API do Google Drive: gravar e ler o catedra-backup.json da própria pessoa, só a pedido dela.' },
  { id: 'react-fallback-support',
    url: /^https:\/\/unpkg\.com\/react(?:-dom)?@18\.3\.1\/umd\/react(?:-dom)?\.production\.min\.js$/,
    arquivos: /^support\.js$/,
    motivo: 'Fallback do runtime (support.js, loadReactUmd): só dispara quando window.React NÃO existe. O site e o bundle '
      + 'carregam ./vendor/react.js e ./vendor/react-dom.js antes do support.js, então em produção nada sai; o SRI é o sha384 '
      + 'dos bytes de vendor/. Continua na lista porque o arquivo publicado ainda CITA a URL — o caso "sem esta exceção" prova que a varredura a acusa.' },
  { id: 'api-base-nativo',
    url: /^https:\/\/catedra-plataforma-fawn\.vercel\.app(?:[/?#]|$)/,
    arquivos: /./,
    motivo: 'API_BASE absoluto do bundle nativo (build-macos.mjs): IA e leitor de lei (/api/…) — em file:// não há mesma origem para o /api relativo da web.' },
];

/* Hosts de CDN: qualquer URL deles acusa, em qualquer lugar do arquivo (código ou comentário). */
const CDN = ['unpkg.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com',
  'esm.sh', 'cdn.skypack.dev', 'ajax.googleapis.com', 'code.jquery.com', 'cdn.tailwindcss.com',
  'use.fontawesome.com', 'kit.fontawesome.com', 'stackpath.bootstrapcdn.com', 'maxcdn.bootstrapcdn.com',
  'unpkg.io', 'jspm.dev', 'ga.jspm.io', 'polyfill.io'];
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// URL absoluta: http(s)://… ou //host/… (sem protocolo herda o da página: também é externa).
const U = '((?:https?:|wss?:)?\\/\\/[A-Za-z0-9][^"\'`\\s<>)\\\\]*)';
const Q = '["\'`]';
const REGRAS = [
  ['src=', new RegExp('\\b(?:src|srcset|poster)\\s*=\\s*' + Q + '?\\s*' + U, 'g')],
  ['setAttribute(src)', new RegExp('setAttribute\\(\\s*' + Q + '(?:src|srcset)' + Q + '\\s*,\\s*' + Q + U, 'g')],
  ['@import', new RegExp('@import\\s+(?:url\\(\\s*)?' + Q + '?' + U, 'g')],
  ['url()', new RegExp('\\burl\\(\\s*' + Q + '?' + U, 'g')],
  ['importScripts', new RegExp('importScripts\\(\\s*' + Q + U, 'g')],
  ['new Worker', new RegExp('new\\s+(?:Shared)?Worker\\(\\s*' + Q + U, 'g')],
  ['fetch(', new RegExp('\\bfetch\\(\\s*' + Q + U, 'g')],
  ['XMLHttpRequest.open', new RegExp('\\.open\\(\\s*' + Q + '[A-Za-z]+' + Q + '\\s*,\\s*' + Q + U, 'g')],
  ['sendBeacon', new RegExp('sendBeacon\\(\\s*' + Q + U, 'g')],
  ['EventSource/WebSocket', new RegExp('new\\s+(?:EventSource|WebSocket)\\(\\s*' + Q + U, 'g')],
  ['import()', new RegExp('\\bimport\\(\\s*' + Q + U, 'g')],
  ['import from', new RegExp('\\bimport\\b[^;\'"`]{0,200}?\\bfrom\\s*' + Q + U, 'g')],
  ['import "…"', new RegExp('\\bimport\\s*' + Q + U, 'g')],
  ['URL de recurso em literal', new RegExp(Q + '((?:https?:)?\\/\\/[A-Za-z0-9][^"\'`\\s<>]*?\\.(?:m?js|css|woff2?|ttf|otf|eot|wasm)(?:[?#][^"\'`\\s<>]*)?)' + Q, 'g')],
  ['host de CDN', new RegExp('((?:https?:)?\\/\\/(?:[A-Za-z0-9-]+\\.)*(?:' + CDN.map(reEsc).join('|') + ')(?:[/:?#][^"\'`\\s<>)]*)?)', 'g')],
];
// <link rel=…> que busca o recurso (ou abre conexão com o host) — os outros rel (canonical,
// alternate, author…) não carregam nada.
const REL_CARREGA = /\brel\s*=\s*["']?[^"'>]*\b(?:stylesheet|preload|modulepreload|prefetch|prerender|preconnect|dns-prefetch|icon|apple-touch-icon|mask-icon|manifest)\b/i;

const EXT_TEXTO = /\.(?:html?|m?js|css|json|webmanifest)$/i;

/** Varre um arquivo de texto (conteúdo já lido). Devolve [{linha, url, regras:[…]}]. */
export function varrerTexto(txt) {
  const inicios = [0];
  for (let i = 0; i < txt.length; i++) if (txt.charCodeAt(i) === 10) inicios.push(i + 1);
  const linhaDe = (idx) => { let lo = 0, hi = inicios.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (inicios[m] <= idx) lo = m; else hi = m - 1; } return lo + 1; };
  const porChave = new Map();
  const anota = (idx, url, regra) => {
    url = url.replace(/[.,;]+$/, '');
    const linha = linhaDe(idx), k = linha + '\0' + url;
    if (!porChave.has(k)) porChave.set(k, { linha, url, regras: [] });
    const a = porChave.get(k); if (!a.regras.includes(regra)) a.regras.push(regra);
  };
  for (const [nome, re] of REGRAS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(txt))) {
      const url = m[1], ini = m.index + m[0].lastIndexOf(url);
      if (nome === 'URL de recurso em literal') {
        // `<a href="https://…/x.js">` é navegação, não carga: fica de fora.
        const antes = txt.slice(Math.max(0, m.index - 400), m.index);
        if (/\bhref\s*=\s*$/i.test(antes)) {
          const tag = antes.slice(antes.lastIndexOf('<'));
          if (/^<a\b/i.test(tag)) continue;
        }
      }
      anota(ini, url, nome);
    }
  }
  const reLink = /<link\b[^>]*>/gi;
  let m;
  while ((m = reLink.exec(txt))) {
    const tag = m[0];
    if (!REL_CARREGA.test(tag)) continue;
    const h = tag.match(/\bhref\s*=\s*["']?\s*((?:https?:)?\/\/[^"'\s>]+)/i);
    if (h) anota(m.index + tag.indexOf(h[1]), h[1], '<link rel> que carrega');
  }
  return [...porChave.values()].sort((a, b) => a.linha - b.linha);
}

/** Varre uma saída de build. Devolve { achados: [{arquivo, linha, url, regras}], usadas: {id: n}, arquivos: n }.
 *  `achados` já vem sem o que está em EXCECOES. */
export function varrerRedeExterna(dir, excecoes = EXCECOES) {
  const achados = [], usadas = Object.fromEntries(excecoes.map((e) => [e.id, 0]));
  let arquivos = 0;
  const andar = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { andar(p); continue; }
      if (!EXT_TEXTO.test(e.name)) continue;
      arquivos++;
      const rel = path.relative(dir, p).split(path.sep).join('/');
      for (const a of varrerTexto(fs.readFileSync(p, 'utf8'))) {
        const exc = excecoes.find((x) => x.url.test(a.url) && x.arquivos.test(rel));
        if (exc) { usadas[exc.id]++; continue; }
        achados.push({ arquivo: rel, ...a });
      }
    }
  };
  if (fs.existsSync(dir)) andar(dir);
  return { achados, usadas, arquivos };
}

export const formatarAchado = (a) => a.arquivo + ':' + a.linha + ' — ' + a.regras.join(' + ') + ' — ' + a.url;

/** Casos da varredura estática sobre uma saída de build (public/ ou mac/build/web/).
 *  `rotulo` entra no nome do caso ('public' ou 'bundle'). Planta uma ISCA na saída para
 *  provar que a varredura acusa e nomeia arquivo:linha — e a tira logo depois. */
export function testarVarreduraRedeExterna(ok, dir, rotulo, { motor = 'node' } = {}) {
  const R = 'REDE EXTERNA [' + rotulo + '] ';
  if (!fs.existsSync(path.join(dir, 'index.html'))) {
    ok(false, R + 'a saída do build existe para ser varrida (' + path.relative(RAIZ, dir) + '/index.html não existe)');
    return;
  }
  const r = varrerRedeExterna(dir);
  ok(r.arquivos > 20 && r.achados.length === 0,
    R + 'nenhum dos ' + r.arquivos + ' arquivos de texto carrega URL externa fora das exceções ('
    + (r.achados.length ? r.achados.length + ' achado(s): ' + r.achados.slice(0, 6).map(formatarAchado).join(' | ') : 'zero')
    + '; exceções usadas: ' + Object.entries(r.usadas).filter(([, n]) => n).map(([k, n]) => k + '×' + n).join(', ') + ')');
  if (r.achados.length) for (const a of r.achados) console.log('    ' + R + formatarAchado(a));
  // A varredura acusa uma coisa REAL da saída: sem a exceção do fallback, o unpkg do support.js
  // aparece com arquivo:linha — é a exceção (e só ela) que o deixa passar.
  const semFallback = varrerRedeExterna(dir, EXCECOES.filter((x) => x.id !== 'react-fallback-support')).achados;
  ok(semFallback.length === 2 && semFallback.every((a) => a.arquivo === 'support.js' && /unpkg\.com\/react/.test(a.url)),
    R + 'sem a exceção do fallback, o unpkg do support.js é acusado (' + semFallback.map((a) => a.arquivo + ':' + a.linha).join(', ') + ')');

  // ISCA: um arquivo com uma carga de cada forma. Cada uma tem de ser acusada, na linha certa;
  // o link de navegação e a URL do Supabase (exceção) não.
  const nome = 'isca-rede-externa-' + process.pid + '.html';
  const isca = path.join(dir, nome);
  const linhas = [
    '<!doctype html><title>isca</title>',                                               // 1
    '<script src="https://cdn.exemplo-isca.dev/lib.js"></script>',                         // 2 src=
    '<link rel="stylesheet" href="https://estilos.exemplo-isca.dev/a.css">',               // 3 <link rel> (e literal .css)
    '<a href="https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm">CDC</a>',   // 4 navegação: NÃO acusa
    '<script>var U="https://unpkg.com/react@18.3.1/umd/react.production.min.js";',       // 5 literal .js + CDN
    'fetch("https://api.exemplo-isca.dev/dados");',                                        // 6 fetch(
    'new Worker("https://w.exemplo-isca.dev/w.js");',                                      // 7 new Worker
    'var s=document.createElement("script"); s.src = "https://x.exemplo-isca.dev/y";',     // 8 .src =
    'fetch("https://frcnfqxniwzdyykvgqqu.supabase.co/rest/v1/x");</script>',              // 9 exceção: NÃO acusa
    '<style>@import url("https://fonts.googleapis.com/css2?family=X");</style>',           // 10 @import + CDN
  ];
  fs.writeFileSync(isca, linhas.join('\n'));
  let pega;
  try { pega = varrerRedeExterna(dir).achados.filter((a) => a.arquivo === nome); }
  finally { fs.rmSync(isca, { force: true }); }
  const linhasPegas = [...new Set(pega.map((a) => a.linha))].sort((a, b) => a - b);
  ok(JSON.stringify(linhasPegas) === JSON.stringify([2, 3, 5, 6, 7, 8, 10]),
    R + 'a isca é acusada com arquivo:linha — src=, <link rel>, literal/CDN, fetch, Worker, .src =, @import — e o <a href> e o Supabase passam ('
    + pega.map((a) => a.linha + ':' + a.regras.join('+')).join(' | ') + ')');
  ok(pega.some((a) => a.linha === 5 && a.regras.includes('host de CDN') && a.regras.includes('URL de recurso em literal')),
    R + 'a URL do React no unpkg guardada numa variável (a forma do support.js) é acusada como literal de recurso e como CDN');
  ok(fs.readdirSync(dir).every((f) => !/^isca-rede-externa-/.test(f)), R + 'a isca sai da saída do build depois do caso');
}

/** O support.js não baixa mais o Babel (código morto: o Cátedra não tem <x-import> nenhum), e
 *  o fallback do React é a única URL externa que sobra nele — e só com a exceção declarada. */
export function testarSupportSemRede(ok, { motor = 'node' } = {}) {
  const R = 'REDE EXTERNA [' + motor + '] support.js ';
  const sup = fs.readFileSync(path.join(RAIZ, 'support.js'), 'utf8');
  ok(!/babel(?:\.min)?\.js|@babel\/standalone|BABEL_URL/i.test(sup) && /ensureBabel\(\) \{[\s\S]{0,200}Promise\.reject\(/.test(sup),
    R + 'não baixa mais o Babel: x-import de .jsx/.tsx falha com o motivo, sem pedir nada à rede');
  const urls = varrerTexto(sup).map((a) => a.url);
  ok(urls.length === 2 && urls.every((u) => EXCECOES.find((x) => x.id === 'react-fallback-support').url.test(u)),
    R + 'a única URL externa que sobra é o fallback do React/ReactDOM (' + urls.join(' | ') + ')');
  // Nenhuma tela usa <x-import>: se um dia usar, o .jsx precisaria do Babel — este caso avisa antes.
  const telas = ['Catedra.dc.html', 'legis-web.html', 'juris-web.html', 'ritos-web.html', 'pecas-web.html', 'area-web.html',
    'prioridade-web.html', 'segunda-fase-web.html'].filter((f) => fs.existsSync(path.join(RAIZ, f)));
  const comImport = telas.filter((f) => /<x-import\b/i.test(fs.readFileSync(path.join(RAIZ, f), 'utf8')));
  ok(telas.length >= 6 && comImport.length === 0,
    R + 'nenhuma tela do app usa <x-import> (' + telas.length + ' telas conferidas' + (comImport.length ? '; usam: ' + comImport.join(', ') : '') + ')');
}

/* ---------------------------------------------------------------------------------------
   HARNESS DE ROTA — a suíte sem rede.
   --------------------------------------------------------------------------------------- */
const UNPKG_VENDOR = {
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js': 'react.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js': 'react-dom.js',
};
const cacheVendor = new Map();
const lerVendor = (f) => { if (!cacheVendor.has(f)) cacheVendor.set(f, fs.readFileSync(path.join(RAIZ, 'vendor', f))); return cacheVendor.get(f); };
const ehLocal = (u) => {
  if (!/^(?:https?|wss?):/i.test(u)) return true;           // file:, data:, blob:, about:, chrome-…
  try { const h = new URL(u).hostname; return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1'; }
  catch (_) { return true; }
};
/** Registro do que a suíte inteira tentou mandar para fora (só leitura para o runner). */
export const REDE_SUITE = { servidosDoVendor: 0, barrados: [], liberados: [] };
const REDE_LIVRE = process.env.CT_REDE === 'livre';

/** Instala a rota num contexto do Playwright: unpkg React/ReactDOM → vendor/; o resto que sai
 *  para fora é abortado (ou, com CT_REDE=livre, liberado) e anotado em REDE_SUITE. Rotas
 *  registradas depois pelos próprios testes têm precedência (é a ordem do Playwright), e as que
 *  chamam route.fallback() caem aqui. */
export async function instalarRedeLocal(ctx) {
  await ctx.route((u) => !ehLocal(u.href), (rota) => {
    const u = rota.request().url();
    const f = UNPKG_VENDOR[u];
    if (f) {
      REDE_SUITE.servidosDoVendor++;
      return rota.fulfill({ status: 200, body: lerVendor(f),
        headers: { 'content-type': 'text/javascript; charset=utf-8', 'access-control-allow-origin': '*' } });
    }
    if (REDE_LIVRE) { REDE_SUITE.liberados.push(u); return rota.fallback(); }
    REDE_SUITE.barrados.push(u);
    return rota.abort('blockedbyclient');
  });
}

/** Resumo por host, para o fim do runner. */
export function resumoRedeSuite() {
  const porHost = (lista) => {
    const c = {};
    for (const u of lista) { let h; try { h = new URL(u).host; } catch (_) { h = u.slice(0, 40); } c[h] = (c[h] || 0) + 1; }
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([h, n]) => h + ' ×' + n).join(', ') || 'nenhum';
  };
  return 'REDE DA SUÍTE (' + (REDE_LIVRE ? 'CT_REDE=livre' : 'sem rede') + '): React/ReactDOM do unpkg servidos de vendor/ '
    + REDE_SUITE.servidosDoVendor + 'x; barrados ' + REDE_SUITE.barrados.length + ' (' + porHost(REDE_SUITE.barrados) + ')'
    + (REDE_LIVRE ? '; liberados ' + REDE_SUITE.liberados.length + ' (' + porHost(REDE_SUITE.liberados) + ')' : '');
}

/* ---------------------------------------------------------------------------------------
   EXECUÇÃO — o app publicado e o bundle, com toda origem de fora abortada.
   --------------------------------------------------------------------------------------- */
async function execucaoPorOrigem(browser, ok, { base, origem, arquivo, motor }) {
  const R = 'REDE EXTERNA [' + motor + '] [' + origem + '] ';
  const host = base + '/' + arquivo;
  const pagina = new URL(host);
  const daPagina = (u) => {
    try {
      const x = new URL(u);
      if (['file:', 'blob:', 'data:', 'about:'].includes(x.protocol)) return true;
      return pagina.protocol !== 'file:' && x.origin === pagina.origin;
    } catch (_) { return false; }
  };
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const externos = [];
  try {
    // Rota PRÓPRIA, registrada por último: vence a do harness e aborta TUDO de fora (inclusive
    // o unpkg — o app publicado e o bundle não podem precisar dele).
    await ctx.route((u) => !daPagina(u.href), (rota) => { externos.push(rota.request().url()); return rota.abort('blockedbyclient'); });
    // file:// não passa por rota; o evento de pedido pega o que escapar dela.
    ctx.on('request', (req) => { const u = req.url(); if (!daPagina(u) && !externos.includes(u)) externos.push(u); });
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(String(e && e.message || e).slice(0, 140)));
    await page.goto(host);
    await page.evaluate(() => {
      localStorage.setItem('catedra:auth', '1');
      localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
    });
    await page.goto(host);
    const abriu = await page.waitForFunction(() => !!window.__catedraApp && typeof window.__catedraGoView === 'function',
      null, { timeout: 45000 }).then(() => true, () => false);
    ok(abriu, R + 'o app abre com toda origem externa bloqueada (__catedraApp de pé' + (erros.length ? '; ' + erros.slice(0, 2).join(' / ') : '') + ')');
    if (!abriu) return;

    // LEGIS e JURIS: o iframe de cada acervo monta e carrega (dataset.ctLoad), e o acervo chega.
    const acervo = async (view, pronto) => {
      await page.evaluate((v) => window.__catedraGoView(v), view);
      const montou = await page.waitForFunction((v) => {
        const f = document.querySelector('iframe[data-ct-view="' + v + '"][data-ct-frame]');
        return !!(f && f.contentWindow && f.dataset.ctLoad === '1');
      }, view, { timeout: 30000 }).then(() => true, () => false);
      if (!montou) return { montou, n: 0 };
      const el = await page.$('iframe[data-ct-view="' + view + '"][data-ct-frame]');
      const fr = el && await el.contentFrame();
      const n = fr ? await fr.waitForFunction(pronto, null, { timeout: 30000 }).then((h) => h.jsonValue(), () => 0) : 0;
      return { montou, n };
    };
    // eslint-disable-next-line no-undef
    const legis = await acervo('legis', () => (typeof CAT !== 'undefined' && CAT.laws && CAT.laws.length && typeof window.openReader === 'function') ? CAT.laws.length : false);
    ok(legis.montou && legis.n > 50, R + 'o LEGIS monta com o catálogo de leis sem rede (' + JSON.stringify(legis) + ')');
    if (legis.montou) {
      // Abre o leitor do Código Civil: na web o /api/law é da própria origem; no bundle é o
      // API_BASE absoluto (exceção, bloqueado aqui) e o texto cai no espelho local.
      const el = await page.$('iframe[data-ct-view="legis"][data-ct-frame]');
      const fr = el && await el.contentFrame();
      // eslint-disable-next-line no-undef
      if (fr) await fr.evaluate(() => { const l = CAT.laws.find((x) => /l10406/.test(x.u)); if (l) window.openReader(l); }).catch(() => {});
      await page.waitForTimeout(2500);
    }
    const juris = await acervo('juris', () => (window.__JURIS_IDX__ || []).length || false);
    ok(juris.montou && juris.n > 1000, R + 'o JURIS monta com o índice de verbetes sem rede (' + JSON.stringify(juris) + ')');

    // PDF: a importação pelo caminho da tela (PDF.js de ./vendor/pdfjs/).
    const b64 = fs.readFileSync(path.join(RAIZ, 'tests', 'enam-amostra.pdf')).toString('base64');
    const pdf = await page.evaluate(async (b64) => {
      const bin = atob(b64), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      try { return { n: (await window.__catedraApp._extractEditalPdf(new File([u8], 'a.pdf', { type: 'application/pdf' }))).length }; }
      catch (e) { return { erro: String(e && e.message || e) }; }
    }, b64);
    ok(!pdf.erro && pdf.n > 200, R + 'a importação de PDF extrai o texto sem rede (' + (pdf.erro || pdf.n + ' caracteres') + ')');
    await page.waitForTimeout(1500);   // pedidos tardios (sync, avisos) entram na conta

    const fora = externos.filter((u) => !EXCECOES.some((x) => x.url.test(u)));
    const exc = externos.filter((u) => EXCECOES.some((x) => x.url.test(u)));
    ok(fora.length === 0,
      R + 'nenhum pedido para fora da origem do app além das exceções, do boot ao PDF ('
      + (fora.length ? fora.length + ': ' + [...new Set(fora)].slice(0, 5).join(' | ') : 'zero')
      + (exc.length ? '; ' + exc.length + ' da lista de exceções, bloqueados: ' + [...new Set(exc.map((u) => new URL(u).host))].join(', ') : '') + ')');
    ok(!externos.some((u) => /unpkg\.com|jsdelivr|cdnjs|fonts\.g(?:oogleapis|static)/i.test(u)),
      R + 'nada foi pedido a CDN nem ao Google Fonts (nem tentado)');
    // ISCA DE EXECUÇÃO: a trava enxerga o que sai em tempo de execução — um <script> criado na
    // hora e um fetch para fora são barrados e anotados, e acusariam o caso acima.
    const n0 = externos.length;
    await page.evaluate(() => {
      const s = document.createElement('script'); s.src = 'https://cdn.exemplo-isca.dev/x.js'; document.head.appendChild(s);
      fetch('https://api.exemplo-isca.dev/dados').catch(() => {});
    });
    await page.waitForTimeout(800);
    const novos = externos.slice(n0);
    ok(novos.some((u) => /cdn\.exemplo-isca\.dev\/x\.js/.test(u)) && novos.some((u) => /api\.exemplo-isca\.dev/.test(u))
      && novos.every((u) => !EXCECOES.some((x) => x.url.test(u))),
      R + 'a isca de execução (<script> criado na hora + fetch para fora) é barrada e anotada como fora das exceções (' + novos.join(' | ') + ')');
  } finally { await ctx.close(); }
}

/** O harness é o que deixa a suíte correr sem rede — e a dependência que ele tira era real: num
 *  contexto SEM a rota do harness e com tudo de fora abortado (um aparelho offline), o
 *  Catedra.dc.html cru não abre, porque o React vinha do unpkg; com o harness ele abre, e o
 *  unpkg é respondido com os bytes de vendor/ (o SRI do support.js confere). */
export async function testarHarnessSemRede(browser, ok, { motor = 'chromium', origens = [] } = {}) {
  for (const [base, origem] of origens) {
    const R = 'REDE DA SUÍTE [' + motor + '] [' + origem + '] ';
    const host = base + '/Catedra.dc.html';
    const antes = REDE_SUITE.servidosDoVendor;
    const c1 = await browser.newContext();
    let comHarness = false;
    try {
      const p = await c1.newPage();
      await p.goto(host);
      comHarness = await p.waitForFunction(() => !!window.__catedraApp && !!window.React, null, { timeout: 30000 }).then(() => true, () => false);
    } finally { await c1.close(); }
    ok(comHarness && REDE_SUITE.servidosDoVendor - antes === 2,
      R + 'com o harness o host cru abre e React/ReactDOM saem de vendor/, não do unpkg (' + (REDE_SUITE.servidosDoVendor - antes) + ' servidos)');
    const c2 = await browser.newContext();
    const fora = [];
    let semHarness = true;
    try {
      await c2.unrouteAll();
      await c2.route((u) => !ehLocal(u.href), (r) => { fora.push(r.request().url()); return r.abort('blockedbyclient'); });
      const p = await c2.newPage();
      await p.goto(host);
      semHarness = await p.waitForFunction(() => !!window.__catedraApp, null, { timeout: 12000 }).then(() => true, () => false);
    } finally { await c2.close(); }
    ok(!semHarness && fora.length === 2 && fora.every((u) => /^https:\/\/unpkg\.com\/react(?:-dom)?@18\.3\.1\//.test(u)),
      R + 'sem o harness e sem rede o host cru NÃO abre: pedia React e ReactDOM ao unpkg (' + fora.join(' | ') + ')');
  }
}

/** origens: [[base, origem, arquivo], …]. */
export async function testarRedeExternaExecucao(browser, ok, { motor = 'chromium', origens = [] } = {}) {
  for (const [base, origem, arquivo] of origens) {
    try { await execucaoPorOrigem(browser, ok, { base, origem, arquivo, motor }); }
    catch (e) {
      ok(false, 'REDE EXTERNA [' + motor + '] [' + origem + '] o roteiro correu sem exceção ('
        + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
    }
  }
}
