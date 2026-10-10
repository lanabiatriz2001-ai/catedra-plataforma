/* Smoke test do Estúdio de Materiais: interface e ações reais em navegador.
 * Executa fora da suíte longa para ser um gate rápido no PR. */
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { iniciarServidor, lancarNavegador } from './_infra.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const porta = 8539;
const { srv, url } = await iniciarServidor(raiz, porta);
let browser;
try {
  const launch = await lancarNavegador();
  browser = launch.browser;
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url + '/estudio-materiais.html');
  await page.waitForFunction(() => !!window.pdfjsLib, null, { timeout: 10000 });
  assert.match(await page.title(), /Estúdio de Materiais/);
  assert.equal(await page.isEnabled('#prev'), false);
  assert.equal(await page.isEnabled('#next'), false);
  await page.click('#tab-ativo');
  await page.fill('#trecho', 'A lei penal deve ser anterior ao fato.');
  await page.fill('#termo', 'anterior');
  await page.click('#gerar');
  assert.match(await page.locator('#lacuna').textContent(), /\[ \.\.\. \]/);
  await page.click('#revelar');
  assert.match(await page.locator('#lacuna').textContent(), /\[anterior\]/);
  await page.fill('#termo', 'inexistente');
  await page.click('#gerar');
  assert.match(await page.locator('#lacuna').textContent(), /não foi encontrado/);
  await page.fill('#regra', 'Regra informada pela pessoa.');
  await page.fill('#excecao', 'Exceção informada pela pessoa.');
  await page.click('#comparar');
  assert.match(await page.locator('#mindmap').textContent(), /Exceção informada pela pessoa/);
  await page.click('#tab-qa');
  await page.fill('#requisitos', 'Abrir PDF\nRevisar texto');
  await page.fill('#entregue', 'Revisar texto');
  await page.click('#conferir');
  assert.match(await page.locator('#resultadoQA').textContent(), /Pendente: abrir pdf/);
  assert.match(await page.locator('#resultadoQA').textContent(), /Conferido: revisar texto/);
  assert.deepEqual(errors, []);
  console.log('✓ Estúdio de Materiais: fluxo de estudo ativo, conferência e PDF.js sem erros');
} finally {
  if (browser) await browser.close();
  srv.close();
}