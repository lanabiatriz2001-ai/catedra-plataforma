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
      await p.evaluate(() => { window.CT_CSS_ESPERADO = true; });
      await p.addScriptTag({ url: base + '/support.js?retomar=1' });
      await p.waitForSelector('#ct-main', { timeout: 20000 });
      ok(await painel.isVisible(), rot + 'não expõe o app real antes de o CSS completo ficar pronto');
      await p.evaluate(() => { window.CT_CSS_PRONTO = true; window.dispatchEvent(new Event('ct-css-pronto')); });
      await p.waitForFunction(() => !document.getElementById('ct-carregamento'));
      ok(true, rot + 'só sai quando conteúdo e CSS real estão prontos');
    } finally { await ctx.close(); }
  }
}

export async function testarAberturaEmbutida(ok) {
  const { readFileSync } = await import('node:fs');
  const { prepararAbertura } = await import('../scripts/build-abertura.mjs');
  const fonte = readFileSync(new URL('../Catedra.dc.html', import.meta.url), 'utf8');
  const saida = prepararAbertura(fonte);
  const antesDoRuntime = saida.slice(0, saida.indexOf('<!-- /ct-abertura -->'));
  ok(!/carregamento-inicial\.(?:css|js)|abertura-temas\.js/.test(antesDoRuntime), 'ABERTURA BUILD não depende de três arquivos antes do primeiro pixel');
  ok((antesDoRuntime.match(/<style data-ct-abertura>/g) || []).length === 1, 'ABERTURA BUILD embute o CSS uma vez');
  ok((antesDoRuntime.match(/<script data-ct-abertura/g) || []).length === 2, 'ABERTURA BUILD embute tema e comportamento uma vez');
  ok(antesDoRuntime.indexOf('window.CT_ABERTURA_TEMAS') < antesDoRuntime.indexOf('id = \'ct-carregamento\''), 'ABERTURA BUILD aplica os temas antes de criar a casca');
  const head = saida.slice(0, saida.indexOf('</head>'));
  const externos = head.match(/<script\b[^>]*\bsrc="[^"]+"[^>]*>/g) || [];
  ok(externos.length > 5 && externos.every(tag => /\bdefer\b/.test(tag)), 'ABERTURA BUILD baixa scripts do cabeçalho em paralelo e preserva a execução ordenada após o parse');
  ok(/<link rel="stylesheet" href="\.\/catedra-ui\.css" media="print" onload="[^"]*CT_CSS_PRONTO/.test(head), 'ABERTURA BUILD tira o CSS completo do caminho da primeira pintura e sinaliza quando ficou pronto');
  ok(/onerror="[^"]*ct-css-falhou/.test(head), 'ABERTURA BUILD mantém a recuperação visível se o CSS completo falhar');
  ok(/<noscript><link rel="stylesheet" href="\.\/catedra-ui\.css"><\/noscript>/.test(head), 'ABERTURA BUILD preserva o estilo completo sem JavaScript');
  ok(head.indexOf('CT_CSS_ESPERADO=true') < head.indexOf('id = \'ct-carregamento\''), 'ABERTURA BUILD avisa a casca que deve aguardar o CSS completo');
  ok(/<link rel="stylesheet" href="\.\/carregamento-inicial\.css">/.test(fonte), 'ABERTURA BUILD mantém a fonte editável com arquivos separados');
  ok(/<link rel="stylesheet" href="\.\/catedra-ui\.css">/.test(fonte), 'ABERTURA BUILD mantém o CSS bloqueante na fonte aberta diretamente');
}
