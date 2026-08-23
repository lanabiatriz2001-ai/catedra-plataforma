/* ==========================================================================
   capturar-ui.mjs — capturas de referência da interface, para comparar antes
   e depois de uma mudança visual.

   Uso:  node scripts/capturar-ui.mjs <pasta-de-saida> [porta]
   Ex.:  node scripts/capturar-ui.mjs artifacts/ui-audit/before

   Sobe o mesmo servidor estático da suíte e visita cada tela em três
   ambientes: desktop claro, celular claro e desktop escuro. As telas de
   login e onboarding exigem limpar as chaves que as escondem, então elas
   vêm primeiro e o resto roda com a sessão já iniciada.
   ========================================================================== */
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = path.resolve(RAIZ, process.argv[2] || 'artifacts/ui-audit/before');
const PORTA = +(process.argv[3] || 8321);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.css': 'text/css', '.webmanifest': 'application/manifest+json' };

const CHROMES = [process.env.CT_CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = CHROMES.find(p => { try { return fs.existsSync(p); } catch (_) { return false; } });
if (!exe) { console.error('Nenhum Chrome. Defina CT_CHROME.'); process.exit(2); }

const srv = http.createServer((req, res) => {
  let dados = null, tipo = 'application/octet-stream';
  try {
    const u = new URL(req.url, 'http://x');
    const p = path.join(RAIZ, decodeURIComponent(u.pathname).slice(1));
    if (!p.startsWith(RAIZ)) { res.writeHead(403); res.end(); return; }
    dados = fs.readFileSync(p); tipo = MIME[path.extname(p)] || tipo;
  } catch (e) { res.writeHead(404); res.end('nao encontrado'); return; }
  res.writeHead(200, { 'content-type': tipo }); res.end(dados);
});
await new Promise(r => srv.listen(PORTA, r));
const URL0 = 'http://localhost:' + PORTA;

fs.mkdirSync(SAIDA, { recursive: true });
const navegador = await chromium.launch({ executablePath: exe });

const AMBIENTES = [
  { nome: 'desktop-claro',  largura: 1365, altura: 936, escuro: false },
  { nome: 'mobile-claro',   largura: 390,  altura: 844, escuro: false },
  { nome: 'desktop-escuro', largura: 1365, altura: 936, escuro: true },
];

// Telas alcançadas por navegação normal, já com sessão iniciada.
const TELAS = [
  { id: 'dashboard',    view: 'inicio' },
  { id: 'ciclo',        view: 'ciclo' },
  { id: 'revisoes',     view: 'revisoes' },
  { id: 'legis',        view: 'legis',       espera: 4000 },
  { id: 'juris',        view: 'juris',       espera: 4000 },
  { id: 'segunda-fase', view: 'segundafase', espera: 4000 },
  { id: 'prova-oral',   view: 'oral',        espera: 2500 },
  { id: 'prioridade',   view: 'prioridade',  espera: 4000 },
  { id: 'simulados',    view: 'simulados' },
  { id: 'ajustes',      view: 'ajustes' },
];

const esperar = ms => new Promise(r => setTimeout(r, ms));
let feitas = 0;

for (const amb of AMBIENTES) {
  const ctx = await navegador.newContext({
    viewport: { width: amb.largura, height: amb.altura },
    deviceScaleFactor: 1,
    colorScheme: amb.escuro ? 'dark' : 'light',
  });
  const pg = await ctx.newPage();

  const tirar = async (id) => {
    const arq = path.join(SAIDA, `${id}__${amb.nome}.png`);
    await pg.screenshot({ path: arq, fullPage: false });
    feitas++;
  };

  // 1) LOGIN — sem sessão. `catedra:auth` ausente faz o gate aparecer.
  await pg.goto(URL0 + '/Catedra.dc.html');
  await pg.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
  await pg.goto(URL0 + '/Catedra.dc.html');
  await esperar(2200);
  await tirar('login');

  // 2) ONBOARDING — entra como visitante e chega ao passo da escolha.
  await pg.evaluate(() => { try { localStorage.setItem('catedra:auth', '1'); localStorage.removeItem('catedra:onboarded'); } catch (_) {} });
  await pg.goto(URL0 + '/Catedra.dc.html');
  await esperar(2200);
  await tirar('onboarding');

  // 3) Demais telas, com onboarding concluído e tema conforme o ambiente.
  await pg.evaluate((escuro) => {
    try {
      localStorage.setItem('catedra:auth', '1');
      localStorage.setItem('catedra:onboarded', '1');
      const prefs = JSON.parse(localStorage.getItem('catedra:prefs') || '{}');
      prefs.dark = !!escuro; prefs.temaAuto = false;
      localStorage.setItem('catedra:prefs', JSON.stringify(prefs));
    } catch (_) {}
  }, amb.escuro);
  await pg.goto(URL0 + '/Catedra.dc.html');
  await esperar(2600);

  for (const t of TELAS) {
    try {
      const foi = await pg.evaluate((v) => {
        const abrir = document.querySelector('button[aria-label="Mostrar mais opções"]');
        if (abrir) abrir.click();
        const b = document.querySelector('button[data-view="' + v + '"]');
        if (!b) return false;
        b.click(); return true;
      }, t.view);
      if (!foi) { console.log(`  · ${t.id} (${amb.nome}): sem botão data-view="${t.view}" — pulada`); continue; }
      await esperar(t.espera || 1500);
      await tirar(t.id);
    } catch (e) { console.log(`  · ${t.id} (${amb.nome}): ${String(e).slice(0, 80)}`); }
  }

  // 4) BUSCA — a paleta do ⌘K, por cima da tela atual.
  try {
    await pg.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })));
    await esperar(900);
    await tirar('busca');
    await pg.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  } catch (e) { console.log('  · busca:', String(e).slice(0, 80)); }

  await ctx.close();
  console.log(`✓ ${amb.nome}`);
}

await navegador.close();
srv.close();
console.log(`\n${feitas} capturas em ${path.relative(RAIZ, SAIDA)}/`);
