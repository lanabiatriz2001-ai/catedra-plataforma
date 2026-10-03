// Roda só o módulo de nível e estratégia do ciclo: node tests/ciclo-nivel-estrategia-so.mjs
// (CT_BROWSER=webkit para o WebKit; CT_SO_NIVEL=1 corta antes da estratégia;
//  CT_GRAVAR_FIXTURE=1 regrava tests/fixtures/volta-fabrica.json — só faz sentido com o gerador ANTIGO)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { iniciarServidor, lancarNavegador } from './_infra.mjs';
import { testarCicloNivelEstrategia, prepararCiclo, voltaDeFabrica } from './ciclo-nivel-estrategia.mjs';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const FIX = path.join(AQUI, 'fixtures', 'volta-fabrica.json');
const { srv, url } = await iniciarServidor(RAIZ, 8000 + Math.floor(Math.random() * 900));
const { browser, motor } = await lancarNavegador();
const falhas = [];
const ok = (c, l) => { console.log((c ? '  ok  ' : '  X   ') + l); if (!c) falhas.push(l); };
if (process.env.CT_GRAVAR_FIXTURE) {
  const { ctx, page } = await prepararCiclo(browser, url);
  const v = await voltaDeFabrica(page); await ctx.close();
  fs.writeFileSync(FIX, JSON.stringify(v, null, 1) + '\n'); console.log('fixture gravada: ' + v.length + ' blocos');
} else {
  const page = await browser.newPage();
  try { await testarCicloNivelEstrategia(page, url, ok, { motor, origem: 'http', soNivel: !!process.env.CT_SO_NIVEL, voltaDeReferencia: JSON.parse(fs.readFileSync(FIX, 'utf8')) }); }
  catch (e) { ok(false, 'CICLO-NÍVEL exceção: ' + String(e && e.message || e).split('\n')[0]); }
}
await browser.close(); srv.close();
console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\ntudo verde');
process.exit(falhas.length ? 1 : 0);
