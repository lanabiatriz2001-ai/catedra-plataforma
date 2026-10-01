/* Infraestrutura comum dos runners de teste (tests/run.mjs e tests/run-webkit.mjs):
   o servidor estático da raiz do repositório e a escolha do navegador.
   Vive num arquivo próprio porque o WebKit ganhou um runner separado — e duplicar o
   servidor (com a tabela MIME abaixo, que já custou um falso verde) era convite a
   divergência entre as duas suítes. O `_` no nome diz que isto não é um teste: é apoio. */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium, webkit } from 'playwright-core';
import { instalarRedeLocal } from './rede-externa.mjs';

// '.css' faltava aqui, e o custo foi alto: o servidor entregava satellite-base.css como
// application/octet-stream, o Chrome recusava a folha em modo padrão (cssRules.length = 0)
// e TODA a verificação da TASK9 rodou num navegador onde a base não existia — verde por
// acidente, porque as asserções mediam o que o CSS da própria página já garantia.
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

/** Sobe o servidor estático da RAIZ na porta pedida. Devolve { srv, url } — `url` é a
 *  origem (http://localhost:PORTA) que os testes concatenam com o caminho do arquivo. */
export async function iniciarServidor(RAIZ, porta) {
  const srv = http.createServer((req, res) => {
    try {
      const u = new URL(req.url, 'http://x');
      const p = path.join(RAIZ, decodeURIComponent(u.pathname).slice(1));
      if (!p.startsWith(RAIZ)) { res.writeHead(403); res.end(); return; }
      const data = fs.readFileSync(p);
      res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
      res.end(data);
    } catch (e) { res.writeHead(404); res.end('nao encontrado'); }
  });
  await new Promise(r => srv.listen(porta, r));
  return { srv, url: 'http://localhost:' + porta };
}

const CHROMES = [process.env.CT_CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',   // Mac da Lana
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser', '/usr/bin/chromium'].filter(Boolean);

/** Lança o navegador do motor pedido e devolve { browser, motor }.
 *  `motor` vem de CT_BROWSER (padrão 'chromium'):
 *  · chromium — o Chrome/Chromium da máquina (CT_CHROME ou os caminhos usuais);
 *  · webkit   — o motor do Safari e do WKWebView do iPad, na build que o Playwright
 *               baixa com `npx playwright-core install webkit`. É o mais perto que a CI
 *               chega do aparelho onde a Prova oral abria sem lista de leis. */
export async function lancarNavegador(motor = process.env.CT_BROWSER || 'chromium') {
  if (motor === 'webkit') {
    try { return { browser: semRede(await webkit.launch()), motor }; }
    catch (e) {
      // A mensagem do Playwright vem em várias linhas (a caixa com as bibliotecas que faltam,
      // ou o executável ausente) — a primeira, sozinha, é só "browserType.launch:".
      const msg = String(e && e.message || e).split('\n').filter(l => l.trim()).slice(0, 12).join('\n');
      console.error('WebKit do Playwright não abriu:\n' + msg);
      console.error('\nInstale com:  npx playwright-core install webkit   (na CI: --with-deps webkit, que traz as bibliotecas de sistema)');
      process.exit(2);
    }
  }
  if (motor !== 'chromium') {
    console.error('CT_BROWSER desconhecido: "' + motor + '" — use chromium (padrão) ou webkit');
    process.exit(2);
  }
  const exe = CHROMES.find(p => { try { return fs.existsSync(p); } catch (_) { return false; } });
  if (!exe) { console.error('Nenhum Chrome/Chromium encontrado. Defina CT_CHROME=/caminho/do/chrome'); process.exit(2); }
  return { browser: semRede(await chromium.launch({ executablePath: exe })), motor };
}

/* A SUÍTE NÃO USA REDE. Todo contexto que um teste abre (browser.newContext, e o contexto
   implícito de browser.newPage) nasce com a rota de tests/rede-externa.mjs: o React/ReactDOM que
   o support.js pede ao unpkg quando o Catedra.dc.html cru abre (origens http e file) é servido
   dos bytes de vendor/ — o SRI do support.js confere —, e todo o resto que sai para fora é
   abortado e contado (o runner imprime o resumo no fim). Antes, cada carga do host cru baixava o
   React do unpkg: sem internet, a suíte inteira caía. CT_REDE=livre deixa o resto passar (só
   para depurar). Rota registrada pelo próprio teste depois desta tem precedência. */
function semRede(browser) {
  const comRota = new WeakSet();
  const garantir = async (ctx) => { if (!comRota.has(ctx)) { comRota.add(ctx); await instalarRedeLocal(ctx); } return ctx; };
  const novoContexto = browser.newContext.bind(browser);
  browser.newContext = async (...a) => garantir(await novoContexto(...a));
  const novaPagina = browser.newPage.bind(browser);
  browser.newPage = async (...a) => { const p = await novaPagina(...a); await garantir(p.context()); return p; };
  return browser;
}
