/* PDF.JS LOCAL — importar PDF sem internet (25/09/2026).

   O leitor de PDF (window.ctPdfLib, usado por _extractEditalPdf) baixava o PDF.js 3.11.174 do
   cdnjs.cloudflare.com, sem SRI. Offline — no avião, no app do Mac/iPad em file:// sem rede —
   a importação morria em "pdfjs unavailable", e o service worker não guarda nada de outra
   origem. Agora os dois arquivos (pdf.min.js e pdf.worker.min.js) moram em vendor/pdfjs/,
   congelados na MESMA versão e conferidos pelo sha256 de vendor/manifesto.json, e o app os
   pede por './vendor/pdfjs/'.

   O que se prova aqui, por origem (http como o site, file:// como o app nativo, e o bundle
   mac/build/web quando existir):
   · o app extrai o texto de tests/enam-amostra.pdf pelo MESMO caminho da tela
     (__catedraApp._extractEditalPdf → _pdfLib → ctPdfLib), com TODA origem externa
     bloqueada por route — e nenhum pedido sai para fora da origem da página;
   · o PDF.js que carregou é o de ./vendor/pdfjs/ e é o 3.11.174;
   · em file:// o Worker de verdade pode não subir (origem opaca; no WKWebView depende da
     configuração): aí o PDF.js cai no "worker falso" na thread principal, carregando o
     pdf.worker.min.js por <script>. O caso registra qual caminho foi usado e exige que o
     texto saia de qualquer jeito — mais lento, mas funciona.

   Nas origens http e file o host é o Catedra.dc.html cru, que não traz React: o support.js o
   buscaria no unpkg. Para "nenhum pedido para fora" valer também para o boot, o React e o
   ReactDOM de vendor/ (os mesmos bytes que o build injeta) entram por addInitScript, só no
   documento principal. O bundle já os carrega de ./vendor/. */

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PDFJS = ['pdfjs/pdf.min.js', 'pdfjs/pdf.worker.min.js'];
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** Casos estáticos: o host não fala mais com o cdnjs, os arquivos estão em vendor/ com o
 *  hash do manifesto, e os dois builds os copiam conferindo (lerVendor). */
function casosEstaticos(ok, R) {
  const host = fs.readFileSync(path.join(RAIZ, 'Catedra.dc.html'), 'utf8');
  ok(!/cdnjs\.cloudflare\.com/.test(host), R + 'o Catedra.dc.html não cita mais o cdnjs');
  const bloco = (host.match(/window\.ctPdfLib = \(function\(\)\{[\s\S]*?\}\)\(\);/) || [''])[0];
  ok(/['"]\.\/vendor\/pdfjs\/['"]/.test(bloco) && !/https?:\/\//.test(bloco),
    R + 'ctPdfLib aponta para ./vendor/pdfjs/ e não tem URL absoluta nenhuma');

  let manifesto = { arquivos: [] };
  try { manifesto = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vendor', 'manifesto.json'), 'utf8')); } catch (_) {}
  const confere = PDFJS.map((f) => {
    const ent = (manifesto.arquivos || []).find((a) => a.arquivo === f);
    const p = path.join(RAIZ, 'vendor', f);
    const existe = fs.existsSync(p);
    return { f, ent, ok: !!ent && existe && sha256(fs.readFileSync(p)) === ent.sha256 && ent.versao === '3.11.174' && ent.pacote === 'pdfjs-dist' };
  });
  ok(confere.every((c) => c.ok),
    R + 'vendor/pdfjs/pdf.min.js e pdf.worker.min.js existem, constam do manifesto como pdfjs-dist@3.11.174 e batem o sha256 ('
    + confere.map((c) => c.f + (c.ok ? ' ok' : ' FALHA')).join(', ') + ')');
  // O arquivo diz a própria versão (a constante do build do PDF.js): nada de troca silenciosa.
  const lib = path.join(RAIZ, 'vendor', 'pdfjs', 'pdf.min.js');
  const wrk = path.join(RAIZ, 'vendor', 'pdfjs', 'pdf.worker.min.js');
  ok(fs.existsSync(lib) && fs.existsSync(wrk)
    && /"3\.11\.174"/.test(fs.readFileSync(lib, 'utf8')) && /"3\.11\.174"/.test(fs.readFileSync(wrk, 'utf8')),
    R + 'os dois arquivos vendorados são a versão 3.11.174 (a mesma que o app já usava)');

  for (const b of ['build.mjs', 'build-macos.mjs']) {
    const src = fs.readFileSync(path.join(RAIZ, 'scripts', b), 'utf8');
    ok(/lerVendor\(ROOT,\s*PDFJS\)/.test(src) && /vendor['"],\s*['"]pdfjs['"]|vendor\/pdfjs/.test(src),
      R + b + ' copia o PDF.js de vendor/ por lerVendor (sha256 conferido) para vendor/pdfjs/');
  }
  const libs = fs.readFileSync(path.join(RAIZ, 'scripts', 'vendor-libs.mjs'), 'utf8');
  ok(/export const PDFJS = \[\s*'pdfjs\/pdf\.min\.js',\s*'pdfjs\/pdf\.worker\.min\.js'\s*\]/.test(libs),
    R + 'vendor-libs.mjs declara a lista PDFJS (fora de LIBS: não vira <script> no boot)');
  const atu = fs.readFileSync(path.join(RAIZ, 'scripts', 'atualizar-vendor.mjs'), 'utf8');
  ok(/'pdfjs\/pdf\.min\.js':/.test(atu) && /'pdfjs\/pdf\.worker\.min\.js':/.test(atu),
    R + 'atualizar-vendor.mjs sabe conferir e trocar os dois arquivos do PDF.js');
}

/** Um roteiro por origem, em contexto próprio. */
async function porOrigem(browser, ok, { base, origem, arquivo, motor }) {
  const R = 'PDFJS LOCAL [' + motor + '] [' + origem + '] ';
  const host = base + '/' + arquivo;
  const pagina = new URL(host);
  const mesmaOrigem = (u) => {
    try {
      const x = new URL(u);
      if (x.protocol === 'file:' || x.protocol === 'blob:' || x.protocol === 'data:' || x.protocol === 'about:') return true;
      return pagina.protocol !== 'file:' && x.origin === pagina.origin;
    } catch (_) { return false; }
  };
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const externos = [], pedidosPdf = [], avisos = [];
  try {
    // TODA origem que não é a da página é abortada — e anotada. file:// não passa por route.
    await ctx.route('**/*', (rota) => {
      const u = rota.request().url();
      if (mesmaOrigem(u)) return rota.continue();
      externos.push(u);
      return rota.abort('blockedbyclient');
    });
    ctx.on('request', (req) => {
      const u = req.url();
      if (!mesmaOrigem(u) && !externos.includes(u)) externos.push(u);
      if (/pdf(\.worker)?\.min\.js/.test(u)) pedidosPdf.push(u);
    });
    if (origem !== 'bundle') {
      const react = fs.readFileSync(path.join(RAIZ, 'vendor', 'react.js'), 'utf8');
      const reactDom = fs.readFileSync(path.join(RAIZ, 'vendor', 'react-dom.js'), 'utf8');
      await ctx.addInitScript({ content: '(function(){ if (window.top !== window) return;\n' + react + '\n;\n' + reactDom + '\n}).call(window);' });
    }
    const page = await ctx.newPage();
    page.on('console', (m) => { const t = m.text(); if (/fake worker|worker has been disabled/i.test(t)) avisos.push(t); });
    await page.goto(host);
    await page.evaluate(() => {
      localStorage.setItem('catedra:auth', '1');
      localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
    });
    await page.goto(host);
    await page.waitForFunction(() => !!window.__catedraApp && typeof window.ctPdfLib === 'function', null, { timeout: 30000 });
    ok(await page.evaluate(() => !window.pdfjsLib),
      R + 'o PDF.js não entra no boot (só carrega quando o PDF é pedido)');

    const b64 = fs.readFileSync(path.join(RAIZ, 'tests', 'enam-amostra.pdf')).toString('base64');
    const r = await page.evaluate(async (b64) => {
      const bin = atob(b64), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const f = new File([u8], 'enam-amostra.pdf', { type: 'application/pdf' });
      const t0 = performance.now();
      try {
        const texto = await window.__catedraApp._extractEditalPdf(f);
        const lib = window.pdfjsLib;
        const src = (lib && lib.GlobalWorkerOptions && lib.GlobalWorkerOptions.workerSrc) || '';
        const scripts = [...document.querySelectorAll('script[src]')].map((s) => s.src).filter((s) => /\/pdf(\.worker)?\.min\.js$/.test(s));
        return { texto, ms: Math.round(performance.now() - t0), versao: lib && lib.version, workerSrc: src,
          scripts, workerFalso: !!window.pdfjsWorker };
      } catch (e) { return { erro: String(e && e.message || e), ms: Math.round(performance.now() - t0) }; }
    }, b64);

    ok(!r.erro && typeof r.texto === 'string' && r.texto.length > 200,
      R + 'o app extrai o texto do PDF pelo caminho da tela (_extractEditalPdf → ctPdfLib) ('
      + (r.erro ? 'erro: ' + r.erro : (r.texto || '').length + ' caracteres em ' + r.ms + ' ms') + ')');
    const plano = String(r.texto || '').replace(/\s+/g, ' ');
    ok(/DIREITO CONSTITUCIONAL/.test(plano) && /Súmula Vinculante 13/.test(plano) && /ENFAM/.test(plano),
      R + 'o texto extraído é o do PDF de amostra (DIREITO CONSTITUCIONAL, Súmula Vinculante 13, ENFAM)');
    ok(r.versao === '3.11.174', R + 'a versão carregada é a 3.11.174 (' + r.versao + ')');
    const esperadoLib = new URL('./vendor/pdfjs/pdf.min.js', host).href;
    const esperadoWorker = new URL('./vendor/pdfjs/pdf.worker.min.js', host).href;
    ok((r.scripts || []).includes(esperadoLib) && r.workerSrc === esperadoWorker,
      R + 'a lib e o worker vêm de ./vendor/pdfjs/ ao lado da página (' + JSON.stringify({ scripts: r.scripts, workerSrc: r.workerSrc }) + ')');
    // O bundle nativo carrega o auth.js, que chama o Supabase do login e da sincronização
    // (is_admin, app_avisos). Esses pedidos também são BLOQUEADOS aqui — é o aparelho offline —
    // e não têm nada com o PDF; qualquer outro pedido para fora reprova. Nas origens http e
    // file (o host cru, sem auth.js) a conta tem de ser zero, sem exceção.
    const SUPABASE = /^https:\/\/frcnfqxniwzdyykvgqqu\.supabase\.co\//;
    const foraDoLogin = externos.filter((u) => !(origem === 'bundle' && SUPABASE.test(u)));
    ok(foraDoLogin.length === 0 && !externos.some((u) => /pdf|cdnjs/i.test(u)),
      R + 'nenhum pedido para fora da origem da página, do boot à extração, com toda origem externa bloqueada ('
      + (foraDoLogin.length ? foraDoLogin.slice(0, 4).join(' | ') : 'zero'
        + (externos.length ? '; ' + externos.length + ' do login ao Supabase, bloqueados' : '')) + ')');
    // Em file:// o Worker pode não subir: o PDF.js cai no worker falso (pdf.worker.min.js por
    // <script>, na thread principal) e o texto sai do mesmo jeito. Registra qual foi.
    const caminho = r.workerFalso ? 'worker falso na thread principal' : 'Web Worker';
    if (origem === 'http') {
      ok(!r.erro && !r.workerFalso, R + 'na origem http o PDF.js roda num Web Worker de verdade (' + caminho + ')');
    } else {
      ok(!r.erro && plano.length > 200,
        R + 'em file:// a extração funciona pelo caminho disponível: ' + caminho + ' (' + r.ms + ' ms'
        + (avisos.length ? '; ' + avisos.slice(0, 2).join(' / ').slice(0, 140) : '') + ')');
    }
    // Segunda extração na mesma página: a lib é reaproveitada (uma carga só), sem novo pedido.
    const antes = pedidosPdf.filter((u) => /pdf\.min\.js$/.test(u)).length;
    const r2 = await page.evaluate(async (b64) => {
      const bin = atob(b64), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      try { return { n: (await window.__catedraApp._extractEditalPdf(new File([u8], 'b.pdf', { type: 'application/pdf' }))).length }; }
      catch (e) { return { erro: String(e && e.message || e) }; }
    }, b64);
    const depois = pedidosPdf.filter((u) => /pdf\.min\.js$/.test(u)).length;
    ok(!r2.erro && r2.n > 200 && depois === antes,
      R + 'a segunda importação reaproveita a lib já carregada (' + (r2.erro || r2.n + ' caracteres') + ', pdf.min.js pedido ' + depois + 'x)');
  } finally { await ctx.close(); }
}

/** origens: [[base, origem, arquivo], ...] — a mesma forma do ORIGENS do run-webkit.mjs. */
export async function testarPdfjsLocal(browser, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  casosEstaticos(ok, 'PDFJS LOCAL [' + motor + '] ');
  for (const [base, origem, arquivo] of (opcoes.origens || [])) {
    try { await porOrigem(browser, ok, { base, origem, arquivo, motor }); }
    catch (e) {
      ok(false, 'PDFJS LOCAL [' + motor + '] [' + origem + '] o roteiro correu sem exceção ('
        + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
    }
  }
}
