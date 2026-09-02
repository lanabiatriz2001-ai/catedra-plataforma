/* Runner do WebKit — o proxy do Safari e do WKWebView do iPad na CI (`npm run test:webkit`).
   Enxuto de propósito: a suíte grande (tests/run.mjs) foi escrita para Chromium e leva
   minutos; aqui roda só o que precisa do motor da Apple para ter valor — a Prova oral →
   Lei seca, que no iPad abria sem lei nenhuma. Duas origens, com as mesmas asserções:
   · http://localhost — como o site;
   · file://          — como o app nativo, onde fetch de arquivo local falha e o acervo
                        tem de chegar por <script>. É o que mais se parece com o iPad.
   Precisa do WebKit do Playwright: `npx playwright-core install webkit` (CI: --with-deps).
   CT_BROWSER=chromium roda o mesmo roteiro no Chrome, para comparar os dois motores. */
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { iniciarServidor, lancarNavegador } from './_infra.mjs';
import { testarOralLeiSeca } from './oral-lei-seca.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// porta própria por padrão: run.mjs usa a 8123, e as duas suítes podem rodar lado a lado
const PORTA = +(process.env.CT_PORT || 8124);
const { srv, url: URL0 } = await iniciarServidor(RAIZ, PORTA);
const { browser, motor } = await lancarNavegador(process.env.CT_BROWSER || 'webkit');
console.log('[' + motor + '] Prova oral → Lei seca em http://localhost:' + PORTA + ' e em file://');

const falhas = [];
const ok = (cond, label) => { console.log((cond ? '✓ ' : '✗ ') + label); if (!cond) falhas.push(label); };

// pathToFileURL não põe barra final; o teste concatena '/Catedra.dc.html'
const ORIGENS = [[URL0, 'http'], [pathToFileURL(RAIZ).href, 'file']];
for (const [base, origem] of ORIGENS) {
  // contexto novo por origem: localStorage e IndexedDB de uma não vazam para a outra
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  try { await testarOralLeiSeca(page, base, ok, { motor, origem }); }
  catch (e) {
    ok(false, 'ORAL LEI SECA [' + motor + '] [' + origem + '] o roteiro correu sem exceção ('
      + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
  }
  await ctx.close();
}

await browser.close();
srv.close();
console.log(falhas.length ? ('\nFALHAS: ' + falhas.length) : '\nTODOS OS TESTES PASSARAM');
process.exit(falhas.length ? 1 : 0);
