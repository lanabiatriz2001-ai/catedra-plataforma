/* Verificação funcional do Estúdio: PDF real em memória, renderização, navegação,
 * texto extraído, lacunas, comparador, conferência e link no menu. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { iniciarServidor, lancarNavegador } from './_infra.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const porta = +(process.env.CT_PORT || 8539);

/* PDF textual mínimo gerado no teste, sem arquivo externo nem rede. */
function gerarPdf() {
  const stream = 'BT /F1 18 Tf 70 710 Td (TESTE PDF CATEDRA) Tj ET\n';
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length ' + Buffer.byteLength(stream, 'binary') + ' >>\nstream\n' + stream + 'endstream'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objetos.length; i++) {
    offsets.push(Buffer.byteLength(pdf, 'binary'));
    pdf += (i + 1) + ' 0 obj\n' + objetos[i] + '\nendobj\n';
  }
  const xref = Buffer.byteLength(pdf, 'binary');
  pdf += 'xref\n0 ' + (objetos.length + 1) + '\n0000000000 65535 f \n';
  for (const offset of offsets.slice(1)) pdf += String(offset).padStart(10, '0') + ' 00000 n \n';
  pdf += 'trailer\n<< /Size ' + (objetos.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(pdf, 'binary');
}

const { srv, url } = await iniciarServidor(raiz, porta);
let browser;
try {
  const { browser: b } = await lancarNavegador();
  browser = b;
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(url + '/estudio-materiais.html');
  await page.waitForFunction(() => !!window.pdfjsLib, null, { timeout: 10000 });
  assert.match(await page.title(), /Estúdio de Materiais/);
  assert.equal(await page.isEnabled('#prev'), false);
  assert.equal(await page.isEnabled('#next'), false);
  assert.equal(await page.locator('a[href="./index.html"]').count(), 1);
  assert.match(await page.evaluate(() => window.pdfjsLib.GlobalWorkerOptions.workerSrc), /vendor\/pdfjs\/pdf.worker.min.js/);

  // Prova a abertura de um arquivo verdadeiro: biblioteca e worker devem funcionar.
  await page.locator('#pdf').setInputFiles({ name: 'teste.pdf', mimeType: 'application/pdf', buffer: gerarPdf() });
  await page.waitForFunction(() => document.getElementById('sourceStatus').textContent.includes('Página carregada'), null, { timeout: 20000 });
  await page.locator('#paper canvas').waitFor({ timeout: 10000 });
  assert.equal(await page.locator('#pagina').textContent(), '1 / 1');
  assert.equal(await page.isEnabled('#next'), false);

  await page.click('#tab-audio');
  await page.click('#copiar');
  assert.match(await page.locator('#fala').inputValue(), /TESTE PDF CATEDRA/);

  await page.click('#tab-ativo');
  await page.click('#importar');
  assert.match(await page.locator('#trecho').inputValue(), /TESTE PDF CATEDRA/);
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

  // O launcher é inserido no menu real sem alterar o roteador do host.
  await page.goto(url + '/__semente');
  await page.setContent('<aside><button data-view="areamod">Módulos</button></aside>');
  await page.addScriptTag({ url: url + '/estudio-launcher.js' });
  await page.locator('#ct-estudio-materiais-entry').waitFor({ timeout: 10000 });
  assert.equal(await page.locator('#ct-estudio-materiais-entry').getAttribute('href'), './estudio-materiais.html');

  // No build, ambos os arquivos precisam estar presentes e o launcher injetado.
  const pub = path.join(raiz, 'public');
  if (existsSync(path.join(pub, 'index.html'))) {
    for (const file of ['estudio-materiais.html', 'estudio-launcher.js']) {
      assert.equal(existsSync(path.join(pub, file)), true, file + ' ausente no build');
    }
    const { readFileSync } = await import('node:fs');
    assert.match(readFileSync(path.join(pub, 'index.html'), 'utf8'), /estudio-launcher.js/);
  }
  console.log('✓ Estúdio: PDF real, worker local, texto, estudo ativo, conferência e menu');
} finally {
  if (browser) await browser.close();
  srv.close();
}