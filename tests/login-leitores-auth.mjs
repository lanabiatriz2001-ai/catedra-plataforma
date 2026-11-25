// Estado dos leitores diante de respostas da autenticação. Esta fixture não acessa a rede.
export async function testarLoginLeitoresAuth(browser, base, ok) {
  const id = 'a21a850d-f6ec-4d03-a3ac-ea70fd5fd522';
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    await page.goto(base + '/__semente');
    await page.evaluate((id) => {
      localStorage.setItem('catedra:_owner', id);
      localStorage.setItem('catedra:auth', '1');
      localStorage.setItem('catedra:sessions', '[{"id":"estudo"}]');
      localStorage.setItem('__ct:online', '0');
      sessionStorage.setItem('catedra:hydrated', '1');
    }, id);
    await page.goto(base + '/tests/auth-ipad-fixture.html');
    await page.waitForFunction(() => window.CatedraAuth?.contaLocal);
    ok(await page.evaluate(() => window.CatedraAuth.contaLeitor === ''), 'LEITORES: dono local com estudos offline aguarda login');

    await page.goto(base + '/tests/auth-ipad-fixture.html?leitor=legis');
    await page.locator('#catedra-auth-gate #ctf').waitFor();
    ok(await page.evaluate(() => !window.CatedraAuth.contaLeitor && !!localStorage.getItem('catedra:sessions')),
      'LEITORES: abertura avulsa offline pede login e preserva o estudo');

    const inicio = Date.now();
    await page.clock.install({ time: inicio });
    await page.evaluate(({ id, inicio }) => {
      localStorage.setItem('__ct:online', '1');
      localStorage.setItem('__ct:sessao', JSON.stringify({ id }));
      localStorage.setItem('__ct:leitorClaims', JSON.stringify({
        sub: id, iss: 'https://exemplo.invalido/auth/v1', aud: 'authenticated', role: 'authenticated', exp: Math.floor(inicio / 1000) + 90
      }));
      sessionStorage.setItem('catedra:hydrated', '1');
    }, { id, inicio });
    await page.reload();
    await page.waitForFunction(id => window.CatedraAuth?.contaLeitor === id, id);
    ok(true, 'LEITORES: credencial válida abre os leitores do titular');
    await page.evaluate(() => {
      const claims = JSON.parse(localStorage.getItem('__ct:leitorClaims'));
      window.__ctAuthCb('TOKEN_REFRESHED', { user: { id: claims.sub }, access_token: 'recusado-pela-fixture' });
    });
    await page.waitForFunction(() => !window.CatedraAuth.contaLeitor);
    ok(await page.evaluate(() => !!window.CatedraAuth.user && !window.CatedraAuth.contaLeitor),
      'LEITORES: metadados de conta sem credencial aprovada não autorizam');
    await page.reload();
    await page.waitForFunction(id => window.CatedraAuth?.contaLeitor === id, id);
    await page.clock.fastForward(95000);
    ok(await page.evaluate(() => window.CatedraAuth.contaLeitor === ''), 'LEITORES: credencial vencida fecha o acesso');

    await page.evaluate(() => {
      sessionStorage.setItem('catedra:hydrated', '1');
      localStorage.setItem('__ct:aguardarClaims', 'true');
      const c = JSON.parse(localStorage.getItem('__ct:leitorClaims'));
      c.exp = Math.floor(Date.now() / 1000) + 300;
      localStorage.setItem('__ct:leitorClaims', JSON.stringify(c));
    });
    await page.reload();
    await page.waitForFunction(() => !!window.__resolverClaims && !!window.CatedraAuth?.user);
    ok(await page.evaluate(() => !window.CatedraAuth.contaLeitor), 'LEITORES: sessão aguarda a verificação da credencial');
    await page.evaluate(async () => {
      window.__ctAuthCb('SIGNED_OUT', null);
      window.__resolverClaims();
      await Promise.resolve();
    });
    ok(await page.evaluate(() => !window.CatedraAuth.contaLeitor && !window.CatedraAuth.user),
      'LEITORES: resposta atrasada depois da saída mantém os leitores fechados');
  } finally { await ctx.close(); }
  await testarChaveDoProjeto(browser, base, id, ok);
  await testarRetornosDoLogin(browser, base, ok);
}

async function testarChaveDoProjeto(browser, base, id, ok) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const emissor = 'https://frcnfqxniwzdyykvgqqu.supabase.co';
  const kid = 'b4d303e2-c7fe-442c-ba0f-cdecd2d9c750';
  try {
    await page.goto(base + '/__semente');
    await page.evaluate(({ emissor, id }) => {
      localStorage.setItem('__ct:emissorLeitor', JSON.stringify(emissor));
      localStorage.setItem('__ct:sessao', JSON.stringify({ id }));
      localStorage.setItem('__ct:leitorClaims', JSON.stringify({
        sub: id, iss: emissor + '/auth/v1', aud: 'authenticated', role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 600
      }));
      localStorage.setItem('catedra:_owner', id);
      sessionStorage.setItem('catedra:hydrated', '1');
    }, { emissor, id });
    const casos = [
      { nome: 'sem rede usa diretamente a chave do projeto', online: false, chamadas: [kid] },
      { nome: 'falha de transporte na rede ativa usa a chave do projeto', online: true,
        erro: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' }, chamadas: [null, kid] },
      { nome: 'uma recusa explícita do provedor continua definitiva', online: true,
        erro: { name: 'AuthApiError', status: 403, message: 'Network policy denied' }, chamadas: [null], recusado: true },
    ];
    for (const caso of casos) {
      await page.evaluate(c => {
        localStorage.setItem('__ct:online', c.online ? '1' : '0');
        localStorage.setItem('__ct:erroClaimsRemoto', JSON.stringify(c.erro || null));
        localStorage.removeItem('__ct:chamadas');
      }, caso);
      await page.goto(base + '/tests/auth-ipad-fixture.html');
      await page.waitForFunction(() => window.CatedraAuth?.user && window.__ctChamadas().some(c => c.nome === 'getClaims'));
      if (!caso.recusado) await page.waitForFunction(id => window.CatedraAuth.contaLeitor === id, id);
      const resultado = await page.evaluate(() => ({
        conta: window.CatedraAuth.contaLeitor,
        chaves: window.__ctChamadas().filter(c => c.nome === 'getClaims').map(c => c.arg)
      }));
      ok(resultado.conta === (caso.recusado ? '' : id) && JSON.stringify(resultado.chaves) === JSON.stringify(caso.chamadas),
        'LEITORES: ' + caso.nome);
    }
  } finally { await ctx.close(); }
}

async function testarRetornosDoLogin(browser, base, ok) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const formulario = base + '/tests/auth-ipad-fixture.html';
  try {
    await page.goto(base + '/__semente');
    await page.evaluate(() => localStorage.setItem('__ct:provedores', '["google"]'));
    await page.goto(formulario + '?leitor=juris&q=busca-privada&outra=reserva-de-teste#fragmento');
    await page.locator('#cte').fill('estudo@example.test');
    await page.locator('#ctmagic').click();
    await page.locator('[data-oauth="google"]').click();
    await page.locator('#ctesq').click();
    await page.locator('#ctseg-signup').click();
    await page.locator('#cte').fill('estudo@example.test');
    await page.locator('#ctp').fill('Senha fictícia 42');
    await page.locator('#cts').click();
    const retornos = await page.evaluate(() => Object.fromEntries(window.__ctChamadas().map(c => [c.nome, c.arg])));
    const esperado = formulario + '?leitor=juris';
    ok(retornos.signInWithOtp === esperado && retornos.signInWithOAuth === esperado,
      'LEITORES: link mágico e OAuth transportam apenas o leitor');
    ok(retornos.resetPasswordForEmail?.retorno === esperado && retornos.signUp?.retorno === esperado,
      'LEITORES: recuperação e confirmação de cadastro transportam apenas o leitor');

    await page.goto(formulario + '?leitor=legis&type=recovery&q=busca-privada#fragmento');
    await page.locator('#ctnp').fill('Nova senha fictícia 42');
    await page.locator('#ctnb').click();
    await page.waitForURL(formulario + '?leitor=legis');
    await page.locator('#cte').waitFor();
    ok(page.url() === formulario + '?leitor=legis', 'LEITORES: concluir a redefinição descarta os detalhes do link e preserva o destino');

    await page.goto(formulario + '?leitor=desconhecido&q=busca-privada');
    await page.locator('#cte').fill('estudo@example.test');
    await page.locator('#ctmagic').click();
    const ultimo = await page.evaluate(() => window.__ctChamadas().filter(c => c.nome === 'signInWithOtp').pop().arg);
    ok(ultimo === formulario, 'LEITORES: destino desconhecido usa a entrada padrão do Cátedra');
  } finally { await ctx.close(); }
}
