// Roda só o módulo do Ciclo Magistratura: node tests/ciclo-magistratura-so.mjs (CT_BROWSER=webkit para o WebKit;
// CT_CAPTURAS=/caminho grava as capturas das três larguras)
import path from 'path';
import { fileURLToPath } from 'url';
import { iniciarServidor, lancarNavegador } from './_infra.mjs';
import { testarCicloMagistratura } from './ciclo-magistratura.mjs';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { srv, url } = await iniciarServidor(RAIZ, 8000 + Math.floor(Math.random() * 900));
const { browser, motor } = await lancarNavegador();
const falhas = [];
const ok = (c, l) => { console.log((c ? '  ok  ' : '  X   ') + l); if (!c) falhas.push(l); };
const page = await browser.newPage();
try { await testarCicloMagistratura(page, url, ok, { motor, origem: 'http', capturas: process.env.CT_CAPTURAS || '' }); } catch (e) { ok(false, 'MAGISTRATURA exceção: ' + String(e && e.message || e).split('\n')[0]); }
await browser.close(); srv.close();
console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\ntudo verde');
process.exit(falhas.length ? 1 : 0);
