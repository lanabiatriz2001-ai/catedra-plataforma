export async function testarCarregamentoInicial(page, base, ok) {
  const browser = page.context().browser();
  for (const [dir, dark, largura] of [['sutil', false, 1280], ['sutil', true, 390], ['aurora', false, 390], ['aurora', true, 1280]]) {
    const baixa = dir === 'aurora' && dark;
    const ctx = await browser.newContext({ viewport: { width: largura, height: 900 }, reducedMotion: baixa ? 'no-preference' : 'reduce' });
    const p = await ctx.newPage();
    await p.route('**/support.js', route => route.fulfill({ contentType: 'text/javascript', body: '/* runtime ainda indisponível neste teste */' }));
    try {
      await p.goto(base + '/__semente');
      await p.evaluate(({dir, dark, baixa}) => { localStorage.setItem('catedra:dir', dir); localStorage.setItem('catedra:dark', dark ? '1' : '0'); localStorage.setItem('catedra:prefs', JSON.stringify({baixaEstimulacao:baixa})); }, {dir, dark, baixa});
      const guardado = await p.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
      await p.goto(base + '/Catedra.dc.html');
      const painel = p.locator('#ct-carregamento');
      const visivel = await painel.waitFor({ state: 'visible', timeout: 3000 }).then(() => true, () => false);
      const rot = 'ABERTURA VISUAL ' + dir + '/' + dark + '/' + largura + ': ';
      ok(visivel, rot + 'pinta antes de carregar o runtime');
      if (!visivel) continue;
      const medidas = await painel.evaluate(el => {
        const s = getComputedStyle(el), r = el.getBoundingClientRect();
        const lum = cor => { const v = cor.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126*v[0]+.7152*v[1]+.0722*v[2]; };
        const a = lum(s.color), b = lum(s.backgroundColor);
        return { contraste: (Math.max(a,b)+.05)/(Math.min(a,b)+.05), cabe: r.width <= innerWidth && document.documentElement.scrollWidth <= innerWidth,
          vivo: !!el.querySelector('[role="status"]'), movimento: [...el.querySelectorAll('*')].every(n => getComputedStyle(n).animationName === 'none') };
      });
      ok(medidas.contraste >= 4.5, rot + 'texto medido ≥ 4,5:1 (' + medidas.contraste.toFixed(2) + ')');
      ok(medidas.cabe && medidas.vivo && medidas.movimento, rot + 'cabe, anuncia e respeita movimento reduzido');
      ok(guardado === await p.evaluate(() => JSON.stringify(Object.entries(localStorage).sort())), rot + 'não modifica dados ou preferências');
      if (process.env.CT_CAPTURAS_ABERTURA) await p.screenshot({ path: process.env.CT_CAPTURAS_ABERTURA + '/' + dir + '-' + dark + '.png' });
      await p.evaluate(() => window.dispatchEvent(new Event('unhandledrejection')));
      const retentar = painel.getByRole('button', { name: 'Tentar novamente' });
      ok(await retentar.isVisible() && (await retentar.boundingBox()).height >= 44, rot + 'falha oferece recuperação com alvo ≥ 44');
      await p.addScriptTag({ url: base + '/support.js?retomar=1' });
      await p.waitForSelector('#ct-main', { timeout: 20000 });
      await p.waitForFunction(() => !document.getElementById('ct-carregamento'));
      ok(true, rot + 'só sai quando o conteúdo real monta');
    } finally { await ctx.close(); }
  }
}
