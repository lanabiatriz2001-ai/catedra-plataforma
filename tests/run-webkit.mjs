/* Runner do WebKit — o proxy do Safari e do WKWebView do iPad na CI (`npm run test:webkit`).
   Enxuto de propósito: a suíte grande (tests/run.mjs) foi escrita para Chromium e leva
   minutos; aqui roda só o que precisa do motor da Apple para ter valor — a Prova oral →
   Lei seca, que no iPad abria sem lei nenhuma. Duas origens, com as mesmas asserções:
   · http://localhost — como o site;
   · file://          — como o app nativo, onde fetch de arquivo local falha e o acervo
                        tem de chegar por <script>. É o que mais se parece com o iPad.
   · [bundle]         — mac/build/web/index.html em file://, se existir (é o que
                        scripts/build-macos.mjs gera e o app do Mac/iPad empacota). O bundle
                        não leva a pasta dados/: o caminho testado é o fallback por <script>
                        para leis-seca.js, exatamente o que o iPad usa. Sem bundle na máquina
                        (a CI não o gera), a origem é pulada com aviso — nunca fingida.
   Precisa do WebKit do Playwright: `npx playwright-core install webkit` (CI: --with-deps).
   CT_BROWSER=chromium roda o mesmo roteiro no Chrome, para comparar os dois motores. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { iniciarServidor, lancarNavegador } from './_infra.mjs';
import { testarOralLeiSeca } from './oral-lei-seca.mjs';
import { testarLegisGuiado } from './legis-guiado.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// porta própria por padrão: run.mjs usa a 8123, e as duas suítes podem rodar lado a lado
const PORTA = +(process.env.CT_PORT || 8124);
const { srv, url: URL0 } = await iniciarServidor(RAIZ, PORTA);
const { browser, motor } = await lancarNavegador(process.env.CT_BROWSER || 'webkit');
console.log('[' + motor + '] Prova oral → Lei seca e LEGIS guiado em http://localhost:' + PORTA + ' e em file://');

const falhas = [];
const ok = (cond, label) => { console.log((cond ? '✓ ' : '✗ ') + label); if (!cond) falhas.push(label); };

// pathToFileURL não põe barra final; o teste concatena '/' + arquivo
const ORIGENS = [[URL0, 'http', 'Catedra.dc.html'], [pathToFileURL(RAIZ).href, 'file', 'Catedra.dc.html']];
const BUNDLE = path.join(RAIZ, 'mac', 'build', 'web');
if (fs.existsSync(path.join(BUNDLE, 'index.html'))) ORIGENS.push([pathToFileURL(BUNDLE).href, 'bundle', 'index.html']);
else console.log('[' + motor + '] sem mac/build/web/index.html — a origem [bundle] fica de fora (gere com: node scripts/build-macos.mjs)');
for (const [base, origem, arquivo] of ORIGENS) {
  // contexto novo por origem: localStorage e IndexedDB de uma não vazam para a outra
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  try { await testarOralLeiSeca(page, base, ok, { motor, origem, arquivo }); }
  catch (e) {
    ok(false, 'ORAL LEI SECA [' + motor + '] [' + origem + '] o roteiro correu sem exceção ('
      + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
  }
  // LA3: o modo guiado do LEGIS marcando por toque de palavra — o caminho do iPad
  try { await testarLegisGuiado(page, base, ok, { motor, origem }); }
  catch (e) {
    ok(false, 'LEGIS GUIADO [' + motor + '] [' + origem + '] o roteiro correu sem exceção ('
      + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
  }
  await ctx.close();
}

await browser.close();
srv.close();
console.log(falhas.length ? ('\nFALHAS: ' + falhas.length) : '\nTODOS OS TESTES PASSARAM');
process.exit(falhas.length ? 1 : 0);
