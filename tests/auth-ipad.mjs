/* auth.js no iPad — os consertos do portão de login e da sessão (branch ipad-consertos):
   (a) Termos/Política/Conhecer abrem POR CIMA do portão, visíveis e não inertes, e Fechar
       devolve o foco; em file:// o "Entrar" do sobre.html embutido fecha a sobreposição;
   (b) e-mail e senha carregam os atributos do teclado do iPad — e o "mostrar" os preserva;
   (c) abas Entrar/Criar conta e o olho da senha medem ≥ 44 px (760, 1024 e 1366 px);
   (d) pullAndMerge com res.error não prende o selo em "sincronizando" e agenda retentativa;
   (e) SIGNED_OUT externo (e 401 no push) mostram o login SEM apagar catedra:*; reentrar na
       mesma conta mescla; "Sair" avisa mesmo sem token;
   (f) abrir SEM rede com dono e dado local não mostra o formulário; a rede voltando retoma.
   Roda com tests/auth-ipad-fixture.html — auth.js de verdade, Supabase falso controlado por
   chaves `__ct:*` do localStorage (sobrevivem aos reloads que o próprio auth.js faz).
   É uma função, como tests/legis-guiado.mjs: mesmo roteiro em Chromium/WebKit, http/file. */

const FIX = '/tests/auth-ipad-fixture.html';
const U1 = { id: 'u1', email: 'lana@exemplo.com' };
const w = ms => new Promise(r => setTimeout(r, ms));

/**
 * @param page   página do Playwright (a suíte) — só usada para chegar ao browser
 * @param base   'http://localhost:PORTA' ou 'file:///…' — sem barra final
 * @param ok     coletor: ok(cond, rótulo)
 * @param opcoes { motor, origem } — só para o rótulo
 */
export async function testarAuthIpad(page, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const origem = opcoes.origem || (String(base).startsWith('file:') ? 'file' : 'http');
  const R = 'AUTH iPad [' + motor + '] [' + origem + '] ';
  const browser = page.context().browser();
  await portao(browser, base, ok, R, origem);
  await sessao(browser, base, ok, R);
}

// contexto próprio por parte: localStorage/sessionStorage nossos não vazam para a suíte
async function novaPagina(browser, viewport, relogio) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA (auth-ipad):', e.message));
  if (relogio) await page.clock.install({ time: new Date() });
  return { ctx, page };
}

const esperaGate = page => page.waitForFunction(() => {
  const g = document.getElementById('catedra-auth-gate');
  return !!g && !!window.CatedraAuth && (g.style.display === 'none' || !!g.querySelector('#ctf, #ctacok, #ctnf'));
}, null, { timeout: 15000 });

/* ===== (a) (b) (c) — o portão de login ===== */
async function portao(browser, base, ok, R, origem) {
  const { ctx, page } = await novaPagina(browser, { width: 1280, height: 900 });
  try {
    await page.goto(base + FIX);
    await esperaGate(page);

    // (a) documento aberto com o portão aberto: DENTRO dele, visível, não inerte, foco no Fechar
    const a = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const el = document.getElementById('catedra-auth-gate');
      const link = el.querySelector('a[data-doc="termos.html"]');
      link.focus(); link.click(); await w(150);
      const box = document.getElementById('ctdoc');
      const r = { abriu: !!box };
      if (!box) return r;
      const alvo = document.elementFromPoint(Math.round(innerWidth / 2), Math.round(innerHeight / 2));
      r.dentroDoPortao = el.contains(box);
      r.visivelNoCentro = !!alvo && !!alvo.closest('#ctdoc');
      r.naoInerte = box.inert !== true && !box.closest('[inert]');
      r.pintaPorCima = getComputedStyle(box).display !== 'none' && +getComputedStyle(box).zIndex > 0;
      r.ehDialogoComNome = box.getAttribute('role') === 'dialog' && box.getAttribute('aria-modal') === 'true' && /Termos/.test(box.getAttribute('aria-label') || '');
      r.focoNoFechar = document.activeElement && document.activeElement.textContent === 'Fechar' && box.contains(document.activeElement);
      r.formularioAtrasFicaInerte = !!el.querySelector('#ctf').closest('[inert]');
      // Tab circula dentro do documento: no Fechar, Tab não vai parar no formulário atrás
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })); await w(60);
      r.tabNaoEscapaParaOForm = !el.querySelector('#ctf').contains(document.activeElement);
      // Fechar devolve o foco ao link que abriu, e o formulário volta a ser alcançável
      box.querySelector('button').click(); await w(120);
      r.fechou = !document.getElementById('ctdoc');
      r.focoVoltouAoLink = document.activeElement === el.querySelector('a[data-doc="termos.html"]');
      r.formularioVoltou = !el.querySelector('#ctf').closest('[inert]') && el.querySelector('#ctf').getAttribute('aria-hidden') !== 'true';
      // Esc fecha só o documento; o portão continua (o login é obrigatório)
      el.querySelector('a[data-doc="privacidade.html"]').click(); await w(100);
      const box2 = document.getElementById('ctdoc');
      r.politicaTemNome = !!box2 && /Política/.test(box2.getAttribute('aria-label') || '');
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await w(100);
      r.escFechaODocumento = !document.getElementById('ctdoc');
      r.escNaoFechaOPortao = getComputedStyle(el).display !== 'none';
      // a mensagem ctFecharDoc (o "Voltar ao app" de termos.html/privacidade.html) também fecha
      el.querySelector('a[data-doc="termos.html"]').click(); await w(100);
      window.postMessage({ type: 'ctFecharDoc' }, '*'); await w(150);
      r.mensagemFecha = !document.getElementById('ctdoc');
      return r;
    });
    for (const [k, v] of Object.entries(a)) ok(v, R + '(a) ' + k);

    // (a) "Conhecer a Cátedra" embutido: o "Entrar" do sobre.html fecha a sobreposição em vez de navegar
    {
      await page.evaluate(() => window.CatedraAuth.abrirDoc('sobre.html'));
      const fr = await esperaFrame(page, /sobre\.html$/);
      ok(!!fr, R + '(a) a sobreposição carrega o sobre.html real');
      if (fr) {
        await fr.waitForSelector('a.botao[href="./"]', { timeout: 10000 });
        await fr.click('a.botao[href="./"]');
        await w(300);
        const depois = await page.evaluate(() => ({
          fechou: !document.getElementById('ctdoc'),
          portaoIntacto: getComputedStyle(document.getElementById('catedra-auth-gate')).display !== 'none' && !!document.querySelector('#catedra-auth-gate #ctf'),
          frameNaoVirouDiretorio: [...document.querySelectorAll('iframe')].every(f => !/\/$/.test(f.src)),
        }));
        for (const [k, v] of Object.entries(depois)) ok(v, R + '(a) sobre.html embutido: ' + k);
      }
      if (origem === 'file') {
        // no app nativo (file://) o próprio link do portão abre a sobreposição (na web ele navega)
        const nativo = await page.evaluate(async () => {
          const w = ms => new Promise(r => setTimeout(r, ms));
          document.querySelector('#catedra-auth-gate #ctsobre').click(); await w(150);
          const box = document.getElementById('ctdoc');
          const r = { linkAbreSobreposicao: !!box && /Conhecer/.test(box.getAttribute('aria-label') || '') };
          if (box) box.querySelector('button').click();
          return r;
        });
        for (const [k, v] of Object.entries(nativo)) ok(v, R + '(a) file: ' + k);
      }
    }

    // (a) na tela "Antes de continuar" (aceite), os documentos também abrem por cima
    {
      await page.evaluate(() => {
        window.CT_JURIDICO = { versao: '1', aceiteVigente: function (v) { return !!v; } };
        localStorage.setItem('__ct:signIn', JSON.stringify({ id: 'u1', email: 'lana@exemplo.com' }));
        localStorage.setItem('__ct:select', JSON.stringify({ data: null, error: null }));
        document.querySelector('#cte').value = 'lana@exemplo.com';
        document.querySelector('#ctp').value = 'senha-forte-1';
        document.querySelector('#cts').click();
      });
      await page.waitForSelector('#catedra-auth-gate #ctacok', { timeout: 10000 });
      const ac = await page.evaluate(async () => {
        const w = ms => new Promise(r => setTimeout(r, ms));
        const el = document.getElementById('catedra-auth-gate');
        const bt = el.querySelector('button[data-doc="termos.html"]');
        bt.focus(); bt.click(); await w(150);
        const box = document.getElementById('ctdoc');
        const alvo = document.elementFromPoint(Math.round(innerWidth / 2), Math.round(innerHeight / 2));
        const r = { aceiteAbreOsTermos: !!box && el.contains(box) && !!alvo && !!alvo.closest('#ctdoc') && !box.closest('[inert]') };
        if (box) { box.querySelector('button').click(); await w(100); }
        r.fecharVoltaAoBotao = document.activeElement === el.querySelector('button[data-doc="termos.html"]');
        r.aceitarSegueDesligado = el.querySelector('#ctacok').disabled === true;
        return r;
      });
      for (const [k, v] of Object.entries(ac)) ok(v, R + '(a) aceite: ' + k);
      // volta ao formulário limpo para (b) e (c)
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
      await page.goto(base + FIX);
      await esperaGate(page);
    }

    // (b) atributos do teclado do iPad — e o "mostrar" não os perde
    const b = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const el = document.getElementById('catedra-auth-gate');
      const at = (n, a) => (n.getAttribute(a) || '').toLowerCase();
      const senhaOk = n => at(n, 'autocapitalize') === 'none' && at(n, 'autocorrect') === 'off' && at(n, 'spellcheck') === 'false';
      const e = el.querySelector('#cte'), p = el.querySelector('#ctp');
      const r = {
        emailTeclado: at(e, 'autocapitalize') === 'none' && at(e, 'autocorrect') === 'off' && at(e, 'inputmode') === 'email' && at(e, 'autocomplete') === 'username',
        senhaTeclado: senhaOk(p) && at(p, 'autocomplete') === 'current-password',
      };
      el.querySelector('[data-olho="ctp"]').click(); await w(80);
      r.mostrarViraTexto = p.type === 'text';
      r.mostrarPreservaOsAtributos = senhaOk(p) && at(p, 'autocomplete') === 'current-password';
      el.querySelector('[data-olho="ctp"]').click(); await w(80);
      r.ocultarVoltaASenha = p.type === 'password';
      el.querySelector('#ctseg-signup').click(); await w(250);
      const p2 = el.querySelector('#ctp'), e2 = el.querySelector('#cte');
      r.criarContaNovaSenha = senhaOk(p2) && at(p2, 'autocomplete') === 'new-password' && at(e2, 'autocomplete') === 'username';
      el.querySelector('#ctseg-login').click(); await w(250);
      // a tela de nova senha (link de recuperação) também
      window.__ctAuthCb('PASSWORD_RECOVERY', null); await w(200);
      const np = el.querySelector('#ctnp');
      r.novaSenhaTeclado = !!np && senhaOk(np) && at(np, 'autocomplete') === 'new-password';
      return r;
    });
    for (const [k, v] of Object.entries(b)) ok(v, R + '(b) ' + k);

    // (c) alvos de toque: abas e olho ≥ 44 px, sem quebrar o layout em 760 / 1024 / 1366
    for (const largura of [760, 1024, 1366]) {
      await page.setViewportSize({ width: largura, height: 900 });
      await page.goto(base + FIX);
      await esperaGate(page);
      const c = await page.evaluate(() => {
        const el = document.getElementById('catedra-auth-gate');
        const rc = n => n.getBoundingClientRect();
        const a1 = rc(el.querySelector('#ctseg-login')), a2 = rc(el.querySelector('#ctseg-signup'));
        const olho = rc(el.querySelector('[data-olho="ctp"]')), inp = rc(el.querySelector('#ctp'));
        return {
          abasMedem44: a1.height >= 44 && a2.height >= 44 && a1.width >= 44 && a2.width >= 44,
          abasLadoALado: Math.abs(a1.top - a2.top) < 1 && a2.left >= a1.right - 1,
          olhoMede44: olho.height >= 44 && olho.width >= 44,
          olhoDentroDoCampo: olho.right <= inp.right + 1 && olho.left >= inp.left + inp.width / 2 && olho.top >= inp.top - 2 && olho.bottom <= inp.bottom + 2,
          semRolagemHorizontal: document.documentElement.scrollWidth <= innerWidth + 1 && el.scrollWidth <= innerWidth + 1,
          formularioCabe: rc(el.querySelector('#cts')).right <= innerWidth,
        };
      });
      for (const [k, v] of Object.entries(c)) ok(v, R + '(c) ' + largura + 'px ' + k);
    }

    // (7) no app nativo (file://), "Esqueci minha senha" e a confirmação avisam que o link abre o site
    {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(base + FIX);
      await esperaGate(page);
      const sete = await page.evaluate(async () => {
        const w = ms => new Promise(r => setTimeout(r, ms));
        const el = document.getElementById('catedra-auth-gate');
        el.querySelector('#cte').value = 'lana@exemplo.com';
        el.querySelector('#ctesq').click(); await w(200);
        const esq = el.querySelector('#cterr').textContent;
        el.querySelector('#ctseg-signup').click(); await w(250);
        const dica = el.querySelector('#ctf').textContent;
        el.querySelector('#cte').value = 'lana@exemplo.com'; el.querySelector('#ctp').value = 'senha-forte-1';
        el.querySelector('#cts').click(); await w(300);
        return { esq, dica, criada: el.querySelector('#cterr').textContent };
      });
      const avisa = s => /abre o site da Cátedra (no Safari|no navegador); depois/.test(s);
      if (origem === 'file') {
        ok(/link de redefinição/.test(sete.esq) && avisa(sete.esq), R + '(7) file: "Esqueci minha senha" avisa que o link abre o site');
        ok(avisa(sete.dica), R + '(7) file: a dica do cadastro avisa que o link abre o site');
        ok(/Conta criada/.test(sete.criada) && avisa(sete.criada), R + '(7) file: a confirmação do cadastro avisa que o link abre o site');
      } else {
        ok(/link de redefinição/.test(sete.esq) && !avisa(sete.esq), R + '(7) http: no site o aviso do Safari não aparece');
        ok(/Conta criada/.test(sete.criada) && !avisa(sete.criada), R + '(7) http: a confirmação do cadastro segue sem o aviso');
      }
    }
  } finally { await ctx.close(); }
}

async function esperaFrame(page, re) {
  for (let i = 0; i < 40; i++) {
    const fr = page.frames().find(f => re.test(f.url()));
    if (fr) return fr;
    await w(150);
  }
  return null;
}

/* ===== (d) (e) (f) — sessão, sync e o aparelho sem rede ===== */
async function sessao(browser, base, ok, R) {
  // relógio do Playwright: a retentativa de 30 s é provada avançando o tempo, não esperando
  const { ctx, page } = await novaPagina(browser, { width: 1280, height: 900 }, true);
  const S1 = { id: 's1', up: 1000, t: 'local' }, S9 = { id: 's9', up: 2000, t: 'nuvem' };
  const linha = { data: { data: { 'catedra:sessions': JSON.stringify([S9]) }, updated_at: '2026-01-01T00:00:00.000Z' }, error: null };
  const ls = (page, k) => page.evaluate(k => localStorage.getItem(k), k);
  const sessoes = async page => { try { return JSON.parse(await ls(page, 'catedra:sessions')) || []; } catch (_) { return []; } };
  const gateOculto = page => page.evaluate(() => getComputedStyle(document.getElementById('catedra-auth-gate')).display === 'none');
  const chamadas = (page, nome) => page.evaluate(n => window.__ctChamadas().filter(c => c.nome === n), nome);
  try {
    await page.goto(base + FIX);
    await esperaGate(page);
    // aparelho já logado e hidratado nesta sessão: dono u1, uma sessão local por subir, nuvem com outra
    await page.evaluate(({ U1, S1, linha }) => {
      localStorage.clear(); sessionStorage.clear();
      localStorage.setItem('__ct:sessao', JSON.stringify(U1));
      localStorage.setItem('__ct:select', JSON.stringify(linha));
      localStorage.setItem('__ct:online', '1');
      localStorage.setItem('catedra:_owner', U1.id);
      localStorage.setItem('catedra:auth', '1');
      localStorage.setItem('catedra:sessions', JSON.stringify([S1]));
      sessionStorage.setItem('catedra:hydrated', '1');
    }, { U1, S1, linha });
    await page.reload();
    await esperaGate(page);
    await w(600);
    ok(await gateOculto(page), R + '(d) com sessão válida o app abre (portão oculto)');
    const s0 = await sessoes(page);
    ok(s0.some(x => x.id === 's1') && s0.some(x => x.id === 's9'), R + '(d) o pull mescla nuvem e local por id');

    // (g) o gancho do localStorage existe NESTE motor: no WebKit a definição na instância vira
    // um item "setItem" e o método segue nativo — sem o gancho no protótipo, nada carimbava
    // (_kts), apagar não deixava lápide e a escrita crua não marcava sujo
    const g = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      localStorage.setItem('__ct:upsert', JSON.stringify({ data: null, error: null }));
      localStorage.setItem('catedra:prova', '"2026-12-01"'); await w(50);
      const r = { escritaCruaMarcaSujo: localStorage.getItem('catedra:_dirty') === '1' };
      r.escritaCruaCarimba = (JSON.parse(localStorage.getItem('catedra:_kts') || '{}')['catedra:prova'] || 0) > Date.now() - 5000;
      r.semItemSombra = localStorage.getItem('setItem') == null && localStorage.getItem('removeItem') == null;
      sessionStorage.setItem('catedra:prova', 'x');
      r.sessionStorageNaoEntra = !(JSON.parse(localStorage.getItem('catedra:_tomb') || '{}').keys || {})['catedra:prova'];
      sessionStorage.removeItem('catedra:prova');
      localStorage.removeItem('catedra:prova'); await w(50);
      r.apagarDeixaLapide = !!(JSON.parse(localStorage.getItem('catedra:_tomb') || '{}').keys || {})['catedra:prova'];
      await w(1200);   // o push (700 ms) sobe e limpa o sujo
      r.pushSubiuEDesmarcou = window.__ctChamadas().some(c => c.nome === 'upsert') && localStorage.getItem('catedra:_dirty') == null;
      return r;
    });
    for (const [k, v] of Object.entries(g)) ok(v, R + '(g) gancho do localStorage: ' + k);

    // (d) reconectar com leitura falhando: nada de "enviando" preso; selo em erro; retentativa em 30 s
    const d = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      localStorage.setItem('__ct:select', JSON.stringify({ data: null, error: { message: 'TypeError: Failed to fetch', code: '' } }));
      const antes = window.__ctStatus.length, sel0 = window.__ctChamadas().filter(c => c.nome === 'select').length;
      window.dispatchEvent(new Event('online')); await w(300);
      const seq = window.__ctStatus.slice(antes);
      return { seq, ultimo: window.CatedraSync.status, sel0 };
    });
    ok(!d.seq.includes('enviando') && d.ultimo === 'erro', R + '(d) pull com res.error: sem "enviando" quando limpo, selo em erro (' + d.seq.join('→') + ')');
    await page.clock.runFor(31000);
    await w(200);
    const sel1 = (await chamadas(page, 'select')).length;
    ok(sel1 > d.sel0 + 1, R + '(d) a leitura que falhou é tentada de novo em 30 s (' + d.sel0 + ' → ' + sel1 + ')');
    // com dado por subir, "enviando" aparece — e a falha do pull o substitui por erro (não prende)
    const d2 = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      localStorage.setItem('catedra:_dirty', '1');
      const antes = window.__ctStatus.length;
      window.dispatchEvent(new Event('online')); await w(300);
      return { seq: window.__ctStatus.slice(antes), ultimo: window.CatedraSync.status };
    });
    ok(d2.seq[0] === 'enviando' && d2.ultimo === 'erro', R + '(d) sujo: "enviando" ao reconectar, e o pull que falha leva a erro (' + d2.seq.join('→') + ')');
    // offline, o mesmo caminho marca offline (não erro)
    const d3 = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      localStorage.setItem('__ct:online', '0');
      window.dispatchEvent(new Event('visibilitychange'));
      document.dispatchEvent(new Event('visibilitychange')); await w(300);
      const st = window.CatedraSync.status; localStorage.setItem('__ct:online', '1'); localStorage.removeItem('catedra:_dirty');
      return st;
    });
    ok(d3 === 'offline', R + '(d) sem rede, a leitura que falha marca offline, não erro (' + d3 + ')');

    // (e) SIGNED_OUT que não veio do Sair: formulário com aviso, nada apagado
    const e = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      localStorage.setItem('__ct:select', localStorage.getItem('__ct:select0') || JSON.stringify({ data: null, error: null }));
      window.__ctAuthCb('SIGNED_OUT', null); await w(300);
      const el = document.getElementById('catedra-auth-gate');
      return {
        formularioNaTela: getComputedStyle(el).display !== 'none' && !!el.querySelector('#ctf'),
        avisaQueExpirou: /sessão expirou/i.test((el.querySelector('#cterr') || {}).textContent || ''),
        emailPoupado: (el.querySelector('#cte') || {}).value === 'lana@exemplo.com',
        dadoLocalIntacto: /"s1"/.test(localStorage.getItem('catedra:sessions') || '') && localStorage.getItem('catedra:_owner') === 'u1',
        deslogouNoApp: !(window.CatedraAuth && window.CatedraAuth.user) && localStorage.getItem('catedra:auth') == null,
        seloEmErro: window.CatedraSync.status === 'erro',
      };
    });
    for (const [k, v] of Object.entries(e)) ok(v, R + '(e) SIGNED_OUT externo: ' + k);

    // (e) "Sair" com dado por subir e sem token: avisa que não há como subir, e não apaga se a pessoa desiste
    let dialogo = '';
    page.once('dialog', async dl => { dialogo = dl.message(); await dl.dismiss(); });
    await page.evaluate(() => { localStorage.setItem('catedra:_dirty', '1'); window.CatedraAuth.logout(); });
    await w(400);
    ok(/não há como subir/.test(dialogo) && /sessão expirou/.test(dialogo), R + '(e) Sair sem token avisa que não há como subir (' + dialogo.slice(0, 60) + '…)');
    ok(/"s1"/.test(await ls(page, 'catedra:sessions') || ''), R + '(e) desistir de sair não apaga nada');
    ok((await chamadas(page, 'signOut')).length === 0, R + '(e) desistir de sair não chama signOut');
    await page.evaluate(() => localStorage.removeItem('catedra:_dirty'));

    // (e) reentrar na MESMA conta: o local é mesclado, não apagado (trocouDeDono falso)
    await page.evaluate(({ U1, linha }) => {
      localStorage.setItem('__ct:signIn', JSON.stringify(U1));
      localStorage.setItem('__ct:select', JSON.stringify(linha));
      localStorage.setItem('__ct:chamadas', '[]');
      const el = document.getElementById('catedra-auth-gate');
      el.querySelector('#ctp').value = 'senha-forte-1';
      el.querySelector('#cts').click();
    }, { U1, linha });
    await w(1500);
    await esperaGate(page);
    await w(600);
    const e2 = await page.evaluate(() => {
      const up = window.__ctChamadas().filter(c => c.nome === 'upsert');
      const subiu = up.length && JSON.stringify(up[0].arg && up[0].arg.data && up[0].arg.data['catedra:sessions'] || '');
      return {
        appAbriu: getComputedStyle(document.getElementById('catedra-auth-gate')).display === 'none',
        localPreservadoEMesclado: /"s1"/.test(localStorage.getItem('catedra:sessions') || '') && /"s9"/.test(localStorage.getItem('catedra:sessions') || ''),
        oLocalSubiuNaMescla: /s1/.test(subiu || ''),
        logadoDeNovo: !!(window.CatedraAuth.user && window.CatedraAuth.user.id === 'u1'),
      };
    });
    for (const [k, v] of Object.entries(e2)) ok(v, R + '(e) reentrar na mesma conta: ' + k);

    // (e) 401/PGRST301 no push: sessão derrubada → login, sem apagar o que acabou de ser escrito
    await page.evaluate(() => {
      localStorage.setItem('__ct:select', JSON.stringify({ data: null, error: { code: 'PGRST301', message: 'JWT expired' }, status: 401 }));
      localStorage.setItem('catedra:sessions', JSON.stringify([{ id: 's1', up: 1000 }, { id: 's9', up: 2000 }, { id: 's2', up: 3000, t: 'novo' }]));
    });
    await w(1400);
    const e3 = await page.evaluate(() => {
      const el = document.getElementById('catedra-auth-gate');
      return {
        loginNaTela: getComputedStyle(el).display !== 'none' && !!el.querySelector('#ctf') && /sessão expirou/i.test(el.querySelector('#cterr').textContent),
        escritaPreservada: /"s2"/.test(localStorage.getItem('catedra:sessions') || ''),
        sujoContinuaMarcado: localStorage.getItem('catedra:_dirty') === '1',
      };
    });
    for (const [k, v] of Object.entries(e3)) ok(v, R + '(e) 401 no push: ' + k);

    // (f) abrir SEM rede com a sessão vencida (refresh não chega ao servidor): o app abre offline
    await page.evaluate(({ U1 }) => {
      localStorage.setItem('__ct:sessao', JSON.stringify(U1));
      localStorage.setItem('__ct:sessaoErro', JSON.stringify({ name: 'AuthRetryableFetchError', message: 'Load failed', status: 0 }));
      localStorage.setItem('__ct:online', '0');
      localStorage.setItem('__ct:chamadas', '[]');
      localStorage.setItem('catedra:auth', '1'); localStorage.removeItem('catedra:_dirty');
      sessionStorage.clear();
    }, { U1 });
    await page.reload();
    await esperaGate(page);
    await w(500);
    const f = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const r = {
        semFormulario: getComputedStyle(document.getElementById('catedra-auth-gate')).display === 'none',
        seloOffline: window.CatedraSync.status === 'offline',
        dadoIntacto: /"s1"/.test(localStorage.getItem('catedra:sessions') || '') && /"s2"/.test(localStorage.getItem('catedra:sessions') || '') && localStorage.getItem('catedra:_owner') === 'u1',
        nadaSubiu: window.__ctChamadas().filter(c => c.nome === 'upsert' || c.nome === 'select').length === 0,
      };
      // estudar offline marca sujo, mas não tenta subir
      localStorage.setItem('catedra:sessions', JSON.stringify([{ id: 's1', up: 1000 }, { id: 's9', up: 2000 }, { id: 's2', up: 3000 }, { id: 's3', up: 4000, t: 'offline' }]));
      await w(1200);
      r.escritaOfflineMarcaSujo = localStorage.getItem('catedra:_dirty') === '1';
      r.escritaOfflineNaoSobe = window.__ctChamadas().filter(c => c.nome === 'upsert' || c.nome === 'select').length === 0;
      return r;
    });
    for (const [k, v] of Object.entries(f)) ok(v, R + '(f) boot offline: ' + k);

    // (f) a rede volta com a sessão do MESMO dono: segue o onLogin normal (mescla e sobe o que ficou)
    await page.evaluate(({ linha }) => {
      localStorage.removeItem('__ct:sessaoErro'); localStorage.setItem('__ct:online', '1');
      localStorage.setItem('__ct:select', JSON.stringify(linha));
      window.dispatchEvent(new Event('online'));
    }, { linha });
    await w(2500);
    await esperaGate(page);
    await w(800);
    const f2 = await page.evaluate(() => {
      const up = window.__ctChamadas().filter(c => c.nome === 'upsert');
      const subiu = up.map(c => JSON.stringify(c.arg && c.arg.data && c.arg.data['catedra:sessions'] || '')).join('|');
      return {
        appAberto: getComputedStyle(document.getElementById('catedra-auth-gate')).display === 'none',
        logado: !!(window.CatedraAuth.user && window.CatedraAuth.user.id === 'u1'),
        mesclouSemApagar: ['s1', 's2', 's3', 's9'].every(id => new RegExp('"' + id + '"').test(localStorage.getItem('catedra:sessions') || '')),
        oEstudoOfflineSubiu: /s3/.test(subiu),
      };
    });
    for (const [k, v] of Object.entries(f2)) ok(v, R + '(f) rede de volta: ' + k);

    // (f) sem rede, mas a sessão é INVÁLIDA de verdade (erro de auth): aí sim o login — sem apagar
    await page.evaluate(() => {
      localStorage.setItem('__ct:sessao', 'null');
      localStorage.setItem('__ct:sessaoErro', JSON.stringify({ name: 'AuthApiError', message: 'Invalid Refresh Token: Refresh Token Not Found', status: 400 }));
      localStorage.setItem('__ct:online', '1'); sessionStorage.clear();
    });
    await page.reload();
    await esperaGate(page);
    const f3 = await page.evaluate(() => {
      const el = document.getElementById('catedra-auth-gate');
      return {
        loginNaTela: getComputedStyle(el).display !== 'none' && !!el.querySelector('#ctf') && /sessão expirou/i.test(el.querySelector('#cterr').textContent),
        dadoIntacto: /"s3"/.test(localStorage.getItem('catedra:sessions') || '') && localStorage.getItem('catedra:_owner') === 'u1',
      };
    });
    for (const [k, v] of Object.entries(f3)) ok(v, R + '(f) sessão inválida com rede: ' + k);

    // (f) offline depois de a sessão ter caído (catedra:auth ausente, app já montado): abre offline
    // do mesmo jeito — recarrega UMA vez para o app ler catedra:auth, e não fica em laço
    await page.evaluate(({ U1 }) => {
      localStorage.setItem('__ct:sessao', JSON.stringify(U1));
      localStorage.setItem('__ct:sessaoErro', JSON.stringify({ name: 'AuthRetryableFetchError', message: 'Load failed', status: 0 }));
      localStorage.setItem('__ct:online', '0'); localStorage.setItem('__ct:chamadas', '[]');
      localStorage.removeItem('catedra:auth'); sessionStorage.clear();
    }, { U1 });
    await page.reload();
    await w(2500);
    await esperaGate(page);
    await w(400);
    const f4 = await page.evaluate(() => ({
      appAbertoOffline: getComputedStyle(document.getElementById('catedra-auth-gate')).display === 'none' && window.CatedraSync.status === 'offline',
      authRestaurado: localStorage.getItem('catedra:auth') === '1',
      recarregouUmaVez: sessionStorage.getItem('catedra:_pend') === '1' && window.__ctChamadas().filter(c => c.nome === 'getSession').length === 2,
      dadoIntacto: /"s3"/.test(localStorage.getItem('catedra:sessions') || ''),
    }));
    for (const [k, v] of Object.entries(f4)) ok(v, R + '(f) offline sem catedra:auth: ' + k);
  } finally { await ctx.close(); }
}
