// Roda só o módulo da Central de novidades: node tests/novidades-central-so.mjs (CT_BROWSER=webkit para o WebKit)
import path from 'path';
import { fileURLToPath } from 'url';
import { iniciarServidor, lancarNavegador } from './_infra.mjs';
import { testarNovidadesCentral } from './novidades-central.mjs';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { srv, url } = await iniciarServidor(RAIZ, 8000 + Math.floor(Math.random() * 900));
const { browser, motor } = await lancarNavegador();
const falhas = [];
const ok = (c, l) => { console.log((c ? '  ok  ' : '  X   ') + l); if (!c) falhas.push(l); };
const page = await browser.newPage();
try { await testarNovidadesCentral(page, url, ok, { motor, origem: 'http' }); } catch (e) { ok(false, 'NOVIDADES exceção: ' + String(e && e.message || e).split('\n')[0]); }
await browser.close(); srv.close();
console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\ntudo verde');
process.exit(falhas.length ? 1 : 0);
