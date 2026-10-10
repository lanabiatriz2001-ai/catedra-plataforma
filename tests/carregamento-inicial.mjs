export async function testarCarregamentoInicial(page, base, ok) {
  const browser = page.context().browser();
  for (const [dir, dark, largura] of ['sutil','premium','clean','moderno','aurora','solar','terminal','holo'].flatMap(dir => [[dir, false, 1280], [dir, true, 390]])) {
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

// Recurso sem resposta (não há error/rejection): o prazo nunca libera o app nem mexe em dados.
export async function testarAberturaPendente(browser, base, ok, {motor='chromium'}={}) {
  const ctx = await browser.newContext({viewport:{width:820,height:1180},reducedMotion:'reduce'});
  const p = await ctx.newPage();
  try {
    await p.goto(base+'/__semente');
    await p.evaluate(() => localStorage.setItem('catedra:edital', '[{"id":"preservar"}]'));
    await p.clock.install();
    await p.route('**/support.js', r => r.fulfill({contentType:'text/javascript',body:'/* recurso silenciosamente indisponível */'}));
    await p.goto(base+'/Catedra.dc.html');
    await p.evaluate(() => {const root=document.createElement('div');root.id='dc-root';root.innerHTML='<main id="ct-main"><button>Estudo protegido</button></main>';document.body.appendChild(root);window.CT_CSS_ESPERADO=true;window.CT_CSS_PRONTO=false;});
    await p.clock.runFor(21000);
    const rot='ABERTURA PENDENTE ['+motor+']: ';
    ok(await p.locator('#ct-carregamento').isVisible(),rot+'prazo conserva a proteção da tela');
    ok(await p.locator('#dc-root').getAttribute('inert') !== null,rot+'teclado não entra no conteúdo atrás da casca');
    const b=p.getByRole('button',{name:'Tentar novamente'});
    ok(await b.isVisible() && (await b.boundingBox()).height>=44,rot+'recuperação acionável após 20s');
    await b.focus();ok(await b.evaluate(e=>e===document.activeElement),rot+'recuperação recebe foco de teclado');
    ok(await p.evaluate(()=>localStorage.getItem('catedra:edital'))==='[{"id":"preservar"}]',rot+'dados intactos');
    if(process.env.CT_CAPTURAS_ABERTURA)await p.screenshot({path:process.env.CT_CAPTURAS_ABERTURA+'/pendente-'+motor+'.png'});
    await p.evaluate(()=>{window.CT_CSS_PRONTO=true;window.dispatchEvent(new Event('ct-css-pronto'));});
    await p.waitForFunction(()=>!document.getElementById('ct-carregamento'));
    ok(await p.locator('#dc-root').getAttribute('inert')===null,rot+'resposta tardia restaura interação');
    ok(await p.evaluate(()=>window.CT_ABERTURA_METRICAS.estado==='pronto' && window.CT_ABERTURA_METRICAS.duracao>=20000),rot+'mede duração sem dados pessoais');
    await p.clock.runFor(21000);
    ok(await p.locator('#ct-carregamento').count()===0,rot+'limpa prazo após sucesso');
    await p.reload(); await p.clock.runFor(21000);
    const navegou=p.waitForEvent('framenavigated', {predicate:f=>f===p.mainFrame()});
    await p.getByRole('button',{name:'Tentar novamente'}).click();await navegou;
    // framenavigated ocorre antes de o parser criar <body>; aguardar o DOM evita
    // introduzir a fixture P1 na página enquanto ela ainda está sendo recarregada.
    await p.waitForLoadState('domcontentloaded');
    await p.waitForFunction(() => !!document.body);
    ok(await p.evaluate(()=>localStorage.getItem('catedra:edital'))==='[{"id":"preservar"}]',rot+'botão recarrega de verdade sem apagar o estudo');

    // Regressão P1: a autenticação e a casca não podem disputar a propriedade de inert.
    // Portão e root são sintéticos; o teste exercita o contrato da casca sem conta real.
    await p.evaluate(() => {
      const gate = document.createElement('div'); gate.id='catedra-auth-gate'; gate.style.display='flex';
      document.body.appendChild(gate);
      const root = document.createElement('div'); root.id='dc-root';
      root.innerHTML='<main id="ct-main"><button id="ct-controle-estudo">Estudar</button></main>';
      document.body.appendChild(root);
      window.CT_CSS_ESPERADO=true; window.CT_CSS_PRONTO=false;
    });
    await p.clock.runFor(20);
    const originalAuth = await p.evaluate(() => {
      const root = document.getElementById('dc-root');
      const original = root.inert;
      root.inert = true; // auth.js passa a gerir o fundo
      return original;
    });
    ok(originalAuth === false, rot+'login captura inert original, sem lock antecipado da casca');
    await p.evaluate(() => {
      const gate = document.getElementById('catedra-auth-gate');
      gate.style.display='none'; // login concluiu antes do CSS
      document.getElementById('dc-root').inert=false;
      document.getElementById('ct-controle-estudo').focus();
    });
    ok(await p.evaluate(()=>document.activeElement?.id==='ct-carregamento'),
      rot+'casca intercepta foco enquanto CSS não ficou pronto');
    await p.evaluate(() => {
      document.getElementById('catedra-auth-gate').style.display='flex';
      document.getElementById('dc-root').inert=true; // autenticação reabriu
      window.CT_CSS_PRONTO=true;
      window.dispatchEvent(new Event('ct-css-pronto'));
    });
    await p.waitForFunction(()=>!document.getElementById('ct-carregamento'));
    ok(await p.evaluate(()=>document.getElementById('dc-root').inert),
      rot+'saída da casca não desfaz o inert do login ainda aberto');
    await p.evaluate(() => {
      document.getElementById('catedra-auth-gate').style.display='none';
      document.getElementById('dc-root').inert=false;
    });
    ok(await p.evaluate(()=>!document.getElementById('dc-root').inert),
      rot+'após o login, o aplicativo não fica permanentemente inerte');
  } finally {await ctx.close();}
}
