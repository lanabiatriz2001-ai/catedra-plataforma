/* IPHONE — OS SATÉLITES (legis-web, juris-web, …) A 390 × 844, NO TOQUE (F0, 11/09/2026)

   Os satélites são as páginas que o host embute em <iframe data-ct-frame> e que o app do
   iPhone também mostra dentro da WKWebView de 390 pt. Este módulo é a casa dos casos de
   aceite da frente F5; a F0 deixa aqui UM caso real, que já passa hoje e MEDE:

   · legis-web.html aberto DIRETO (sem o host) a 390 px não rola de lado —
     documentElement.scrollWidth ≤ innerWidth — e o cabeçalho (h1) cabe na janela.

   Contexto PRÓPRIO 390×844 com isMobile + hasTouch, fechado no finally. A página não lê
   semente nenhuma; mesmo assim passa pela /__semente para limpar o storage da origem.
   Rótulos "IPHONE/satélites 390 …". */

export async function testarIphoneSatelites390(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const origem = opcoes.origem || (String(base).startsWith('file:') ? 'file' : 'http');
  const R = 'IPHONE/satélites 390 [' + motor + '] [' + origem + '] ';

  const ctx = await pageDaSuite.context().browser().newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  try {
    await page.goto(base + '/__semente');
    await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto(base + '/legis-web.html'); await page.waitForTimeout(1200);
    const m = await page.evaluate(() => {
      const de = document.documentElement;
      const h1 = document.querySelector('h1');
      const hb = h1 ? h1.getBoundingClientRect() : null;
      return {
        larguraJanela: innerWidth, scrollWidth: de.scrollWidth,
        semRolagemLateral: de.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth,
        temTitulo: !!h1 && /LEGIS/i.test(h1.textContent || ''),
        tituloCabe: !!hb && hb.left >= -0.5 && hb.right <= innerWidth + 0.5 && hb.width > 0,
        temLeis: document.querySelectorAll('.lawrow').length > 0,
      };
    });
    ok(m.larguraJanela === 390, R + 'legis-web.html: a janela mede 390 px (' + m.larguraJanela + ')');
    ok(m.semRolagemLateral, R + 'legis-web.html: não rola de lado (scrollWidth ' + m.scrollWidth + ' ≤ ' + m.larguraJanela + ')');
    ok(m.temTitulo, R + 'legis-web.html: o título CátedraLEGIS está na página');
    ok(m.tituloCabe, R + 'legis-web.html: o título cabe dentro da janela');
    ok(m.temLeis, R + 'legis-web.html: o catálogo de leis carregou (há .lawrow)');
  } finally { await ctx.close(); }
}
