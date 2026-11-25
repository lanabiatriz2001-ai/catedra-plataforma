// O site e o SDK empacotados exercitam o fluxo real. Só os serviços de conta
// do provedor local abaixo são simulados, com chave assimétrica efêmera por teste.
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';

export async function testarLoginLeitoresPublicados(browser, base, ok) {
  const provedor = base + '/provedor-local';
  const senha = 'Senha sintética 42';
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const kid = randomUUID();
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid, use:'sig', alg:'ES256' };
  const usuario = {id:randomUUID(), email:'estudante@example.test', aud:'authenticated', role:'authenticated',
    app_metadata:{provider:'email',providers:['email']}, user_metadata:{}, identities:[], created_at:new Date().toISOString()};
  const agora = Math.floor(Date.now()/1000);
  const codificar = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const corpo = codificar({alg:'ES256',kid,typ:'JWT'}) + '.' + codificar({sub:usuario.id,
    iss:provedor+'/auth/v1',aud:'authenticated',role:'authenticated',iat:agora,exp:agora+3600,
    email:usuario.email,is_anonymous:false,session_id:randomUUID()});
  const assinatura = sign('sha256', Buffer.from(corpo), { key:privateKey, dsaEncoding:'ieee-p1363' });
  const sessao = {access_token:corpo+'.'+assinatura.toString('base64url'), token_type:'bearer',
    expires_in:3600, expires_at:agora+3600, refresh_token:randomUUID(), user:usuario};

  const casos = [
    { tela: 'legis', lista: '.lawrow', campo: '#cq', termo: 'Constituição' },
    { tela: 'juris', lista: '.vcard', campo: '#q', termo: 'súmula' },
    { tela: 'legis', lista: '.lawrow', campo: '#cq', termo: '', interna: true },
  ];
  for (const { tela, lista, campo, termo, interna } of casos) {
    const ctx = await browser.newContext({ serviceWorkers:'block' });
    const pagina = await ctx.newPage();
    const pedidos = [];
    await ctx.addInitScript(url => {
      let cfg;
      Object.defineProperty(window, 'CATEDRA_SUPABASE', {
        get: () => cfg, set: configuracao => { cfg = { ...configuracao, url }; }
      });
    }, provedor);
    // Aceite e preferências reais da conta de teste passam pela hidratação habitual.
    let salvo = null;
    await ctx.route(provedor + '/**', async route => {
      const req = route.request();
      const caminho = new URL(req.url()).pathname.split('/provedor-local/').pop();
      pedidos.push(caminho);
      let resposta;
      if (caminho === 'auth/v1/token' && req.method() === 'POST') {
        const credenciais = req.postDataJSON();
        if (credenciais.email !== usuario.email || credenciais.password !== senha) {
          return route.fulfill({ status: 400, json: { error: 'invalid_grant' } });
        }
        resposta = sessao;
      }
      else if (caminho === 'auth/v1/.well-known/jwks.json') resposta = {keys:[jwk]};
      else if (caminho === 'auth/v1/user') resposta = usuario;
      else if (caminho === 'auth/v1/logout') return route.fulfill({status:204});
      else if (caminho === 'rest/v1/user_data' && req.method() === 'GET') resposta = salvo ? [salvo] : [];
      else if (caminho === 'rest/v1/user_data' && req.method() === 'POST') {
        salvo = req.postDataJSON();
        return route.fulfill({status:201,body:''});
      } else if (caminho.startsWith('rest/v1/rpc/')) resposta = null;
      else resposta = [];
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(resposta)});
    });
    try {
      if (interna) {
        await ctx.addInitScript(() => Object.defineProperty(navigator, 'onLine', {
          get: () => sessionStorage.getItem('__teste_sem_rede') !== '1'
        }));
        await pagina.goto(base + '/__semente');
        await pagina.evaluate(id => {
          localStorage.setItem('catedra:_owner', id);
          localStorage.setItem('catedra:auth', '1');
          localStorage.setItem('catedra:onboarded', '1');
          localStorage.setItem('catedra:tourVisto', '1');
          localStorage.setItem('catedra:sessions', '[{"id":"estudo-anterior"}]');
          sessionStorage.setItem('__teste_sem_rede', '1');
        }, usuario.id);
        await pagina.goto(base + '/public/index.html');
        await pagina.waitForFunction(() => window.__catedraApp && window.CatedraAuth?.contaLocal && !window.CatedraAuth.contaLeitor);
        await pagina.locator('button[data-view="legis"]:visible').first().click();
        await pagina.evaluate(() => sessionStorage.removeItem('__teste_sem_rede'));
      } else {
        await pagina.goto(base + '/public/' + tela + '-web.html?q=' + encodeURIComponent(termo));
      }
      await pagina.locator('#cte').waitFor();
      const urlLogin = new URL(pagina.url());
      ok(urlLogin.pathname === '/public/index.html' && urlLogin.searchParams.get('leitor') === tela,
        interna ? 'O leitor escolhido no menu offline pede login e preserva o destino na URL' : tela + ' publicado leva a URL direta ao formulário real');
      const versao = await pagina.evaluate(() => window.CT_JURIDICO.versao);
      salvo = {updated_at:new Date().toISOString(),data:{
        'catedra:aceite':JSON.stringify({versao,ts:Date.now()}), 'catedra:onboarded':'1',
        'catedra:areaEstudo':'"juridica"','catedra:tourVisto':'1'
      }};
      await pagina.locator('#cte').fill(usuario.email);
      await pagina.locator('#ctp').fill(senha);
      await pagina.locator('#cts').click();
      try {
        const iframe = pagina.frameLocator('iframe[data-ct-view="' + tela + '"]');
        await iframe.locator(lista).first().waitFor();
        // O JURIS exibe os cartões antes de consultar o índice e aplicar a busca recebida.
        await pagina.waitForFunction(({ tela, campo, termo }) => {
          const quadro = document.querySelector('iframe[data-ct-view="' + tela + '"]');
          return quadro?.contentDocument?.querySelector(campo)?.value === termo;
        }, { tela, campo, termo });
        const busca = await iframe.locator(campo).inputValue();
        ok(busca === termo && await pagina.evaluate(() => !!window.CatedraAuth.contaLeitor)
          && pedidos.includes('auth/v1/.well-known/jwks.json'),
          interna ? 'O leitor escolhido no menu reabre após o login e a recarga' : tela + ' publicado retoma o leitor e o termo depois do login, assinatura e hidratação');
      } catch (erro) {
        const estado = await pagina.evaluate(() => ({url:location.pathname+location.search,
          contaVerificada:!!window.CatedraAuth?.contaLeitor,view:window.__catedraApp?.state.view,
          pedido:window.__catedraApp?._pedidoLeitor?.view,hidratou:sessionStorage.getItem('catedra:hydrated'),
          erro:document.getElementById('cterr')?.textContent,frame:document.querySelector('iframe[data-ct-view="'+new URLSearchParams(location.search).get('leitor')+'"]')?.src}));
        throw new Error(tela + ': retorno ao leitor falhou ' + JSON.stringify({estado,servicos:[...new Set(pedidos)]}), {cause:erro});
      }
      if (interna) continue;
      // A saída em outra aba deve recolher imediatamente o catálogo que ficou aberto.
      const ajustes = await ctx.newPage();
      await ajustes.goto(base + '/public/index.html');
      await ajustes.waitForFunction(() => !!window.CatedraAuth?.contaLeitor);
      ajustes.on('dialog', dialog => dialog.accept());
      const maisOpcoes = ajustes.getByRole('button', { name: 'Mostrar mais opções' });
      await maisOpcoes.waitFor();
      if (await maisOpcoes.getAttribute('aria-expanded') === 'false') await maisOpcoes.click();
      await ajustes.locator('#ct-nav-mais button[data-view="ajustes"]').click();
      await ajustes.locator('button[data-s="conta"]').click();
      await ajustes.getByRole('button', { name: 'Sair da conta', exact: true }).click();
      await Promise.all([ajustes.locator('#cte').waitFor(), pagina.locator('#cte').waitFor()]);
      ok(pedidos.includes('auth/v1/logout') && await pagina.evaluate(() => !window.CatedraAuth.contaLeitor),
        tela + ' publicado fecha o leitor aberto após sair da conta nos Ajustes em outra aba');
    } finally { await ctx.close(); }
  }
}
