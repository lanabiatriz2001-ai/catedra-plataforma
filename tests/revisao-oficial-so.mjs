// Roda só o módulo da revisão oficial: CT_BROWSER=webkit node tests/revisao-oficial-so.mjs
import path from 'path';
import { fileURLToPath } from 'url';
import { iniciarServidor, lancarNavegador } from './_infra.mjs';
import { testarRevisaoOficial } from './revisao-oficial.mjs';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { srv, url } = await iniciarServidor(RAIZ, 8000 + Math.floor(Math.random() * 900));
const { browser, motor } = await lancarNavegador();
const falhas = [];
const ok = (c, l) => { console.log((c ? '  ok  ' : '  X   ') + l); if (!c) falhas.push(l); };
try { await testarRevisaoOficial(browser, url, ok, { motor }); } catch (e) { ok(false, 'OFICIAL exceção: ' + String(e && e.message || e).split('\n')[0]); }
await browser.close(); srv.close();
console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\ntudo verde');
process.exit(falhas.length ? 1 : 0);
