// Reproduz o refresh que não termina, sem consultar a conta real.
export async function testarAuthAbertura(page, base, ok) {
  const browser = page.context().browser();
  for (const caso of ['novo', 'dono', 'local', 'revogada', 'recuperacao']) {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    try {
      await p.goto(base + '/tests/auth-ipad-fixture.html');
      await p.evaluate(caso => {
        localStorage.clear(); sessionStorage.clear();
        localStorage.setItem('__ct:sessaoPendente', 'true');
        if (caso !== 'novo') {
          localStorage.setItem('catedra:edital', '[{"id":"preservar","disc":"Civil"}]');
          localStorage.setItem('catedra:auth', '1');
          localStorage.setItem('catedra:_dirty', '1');
        }
        if (caso === 'dono' || caso === 'revogada') localStorage.setItem('catedra:_owner', 'u1');
        if (caso === 'local') localStorage.setItem('catedra:_modoLocal', '1');
        if (caso === 'revogada') localStorage.setItem('__ct:online', '0');
      }, caso);
      await p.clock.install();
      await p.reload();
      if (caso === 'revogada') await p.evaluate(() => window.__ctAuthCb('SIGNED_OUT', null));
      if (caso === 'recuperacao') await p.evaluate(() => window.__ctAuthCb('PASSWORD_RECOVERY', { access_token: 'teste' }));
      await p.clock.runFor(12000);
      const antes = await p.evaluate(() => ({
        aberto: document.getElementById('catedra-auth-gate').style.display === 'none',
        aviso: document.querySelector('#cterr')?.textContent || '',
        local: !!document.getElementById('ctlocal') || [...document.querySelectorAll('button')].some(b => /sem conta/i.test(b.textContent)),
        marca: localStorage.getItem('catedra:_modoLocal'),
        recuperacao: !!document.getElementById('ctnf'),
        dados: localStorage.getItem('catedra:edital'),
        chamadas: window.__ctChamadas().map(c => c.nome),
        status: window.__ctStatus
      }));
      // O modo "Usar sem conta" saiu (01/10/2026): o 'novo' não o oferece mais, e o aparelho que
      // sobrou com a marca ('local') pede o login como qualquer aparelho sem dono — sem descartar.
      ok(caso === 'novo' ? /não respondeu/.test(antes.aviso) && !antes.local && !antes.aberto : caso === 'revogada' ? /sessão expirou/.test(antes.aviso) && !antes.aberto && !antes.local : caso === 'recuperacao' ? antes.recuperacao && !antes.aberto : caso === 'local' ? /não respondeu/.test(antes.aviso) && !antes.aberto && !antes.local : antes.aberto,
        'ABERTURA ' + caso + ': consulta pendente não deixa espera infinita');
      ok(!antes.chamadas.some(n => /upsert|select|signOut/.test(n)), 'ABERTURA ' + caso + ': não envia, baixa ou encerra sessão');
      if (caso !== 'novo') ok(antes.dados?.includes('preservar'), 'ABERTURA ' + caso + ': conserva o edital local');
      if (caso === 'dono') ok(antes.status.includes('offline'), 'ABERTURA dono: sinaliza offline, nunca salvo');
      if (caso === 'local') ok(antes.marca === null, 'ABERTURA local: a marca do modo removido some na abertura');
      if (caso === 'local') ok(antes.chamadas.includes('getSession'), 'ABERTURA local: consulta a sessão como qualquer aparelho');
      // A resposta atrasada de outra conta não pode limpar o edital nem abrir a conta.
      await p.evaluate(() => {
        if (window.__ctResolverSessao) window.__ctResolverSessao({ data: { session: { user: { id: 'outra' } } }, error: null });
      });
      await p.clock.runFor(1000);
      const depois = await p.evaluate(() => ({ dados: localStorage.getItem('catedra:edital'), dirty: localStorage.getItem('catedra:_dirty'), chamadas: window.__ctChamadas().map(c => c.nome) }));
      ok(depois.dados === antes.dados && !depois.chamadas.includes('upsert'), 'ABERTURA ' + caso + ': resposta expirada não altera dados');
      if (caso !== 'novo') ok(depois.dirty === '1', 'ABERTURA ' + caso + ': mantém trabalho ainda não sincronizado');
    } finally { await ctx.close(); }
  }
}
