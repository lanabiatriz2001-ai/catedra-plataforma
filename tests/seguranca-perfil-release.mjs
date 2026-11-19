// Fronteiras da conta, do backup do Mac e do console administrativo. Só dados fictícios.
export async function testarSegurancaPerfilRelease(page, base, ok) {
  const ctx = await page.context().browser().newContext();
  const p = await ctx.newPage();
  try {
    await p.goto(base + '/__semente');
    await p.evaluate(() => {
      localStorage.setItem('catedra:auth', '1');
      localStorage.setItem('catedra:onboarded', '1');
    });
    await p.goto(base + '/Catedra.dc.html');
    await p.waitForFunction(() => !!window.__catedraApp);
    const resultado = await p.evaluate(async () => {
      const app = window.__catedraApp;
      window.CatedraAuth = { contaLocal: 'titular-A' };
      app._backupOnce();
      const snapshot = JSON.parse(localStorage.getItem('ct_bkpFase2'));
      localStorage.setItem('catedra:_widgetPasse', 'passe-ficticio');
      localStorage.setItem('catedra:meusGrupos', '[{"codigo":"convite-ficticio"}]');
      localStorage.setItem('catedra:segredoFuturo', 'credencial-ficticia');
      localStorage.setItem('catedra:sessions@oab', '[{"id":"estudo"}]');
      localStorage.setItem('catedra:lib', '[{"id":"livro","pdfB64":"volume"}]');
      const backup = JSON.parse(app._backupLocalMac('titular-A'));
      const errado = app._backupLocalMac('titular-B');
      const banco = window.CT_ENAM;
      let leituras = 0;
      app._enamAcervos = async () => { leituras++; };
      window.CT_ENAM = { ...banco, rehidratar: () => [{id:'q'}] };
      localStorage.setItem('ct_enam_prova', JSON.stringify({titular:'titular-A', itensIds:['q'], ini:Date.now(),resp:{q:'A'}}));
      app._restoreEnamProva();
      await new Promise(r => setTimeout(r, 120));
      const retomou = app.state.sjResp.q === 'A' && leituras === 1;
      const salvo = JSON.parse(localStorage.getItem('ct_enam_prova'));
      window.CatedraAuth.contaLocal = 'titular-B';
      app._restoreEnamProva();
      const isolado = leituras === 1 && localStorage.getItem('ct_enam_prova') === null;
      const chamadas = [];
      app._sb = () => ({rpc: async (nome, args) => {
        chamadas.push([nome, args]);
        if (nome === 'admin_visao_geral') throw new Error('indisponível');
        if (nome === 'admin_feedback') return {data:[{id:'f1'}]};
        if (nome === 'admin_config') return {data:{beta_aberto:false}};
        return {data:[]};
      }});
      await app._loadAdmin();
      await new Promise(r => setTimeout(r, 120));
      const parcial = !app.state.adminBusy && app.state.adminFeedback[0]?.id === 'f1'
        && app.state.adminErro.includes('visão geral');
      window.confirm = () => false;
      await app._admToggleBeta();
      const cancelou = !chamadas.some(([n]) => n === 'admin_config_set');
      window.confirm = () => true;
      await app._admToggleBeta();
      const abriu = chamadas.some(([n,a]) => n === 'admin_config_set' && a.p_chave === 'beta_aberto' && a.p_valor === true);
      return {snapshot, backup, errado, retomou, salvo, isolado, parcial, cancelou, abriu};
    });
    ok(resultado.snapshot.titular === 'titular-A' && resultado.retomou && resultado.salvo.titular === 'titular-A' && resultado.isolado,
      'PERFIL-01 a prova retoma para o titular e as duas cópias locais identificam a conta');
    ok(resultado.errado === null && resultado.backup['catedra:sessions@oab'] === '[{"id":"estudo"}]'
      && JSON.parse(resultado.backup['catedra:lib'])[0]._pdfLocal
      && !/volume|passe-ficticio|convite-ficticio|credencial-ficticia|catedra:auth/.test(JSON.stringify(resultado.backup)),
      'BACKUP-06 o coletor usado pelo Mac exporta os estudos, inclusive por área, sem passes ou chaves desconhecidas');
    ok(resultado.parcial, 'CONSOLE-05 uma falha na visão geral não esconde o feedback nem a configuração');
    ok(resultado.cancelou && resultado.abriu, 'BETA-07 abrir o beta exige confirmação e alteração explícita do modo');
    await p.goto(base + '/__semente');
    await p.evaluate(() => {
      localStorage.clear(); sessionStorage.clear();
      localStorage.setItem('catedra:_owner', 'titular-A');
      localStorage.setItem('ct_bkpFase2', '{"titular":"titular-A"}');
      localStorage.setItem('ct_enam_prova', '{"titular":"titular-A"}');
      localStorage.setItem('__ct:sessao', JSON.stringify({id:'titular-B',email:'b@example.test'}));
    });
    await p.goto(base + '/tests/auth-ipad-fixture.html');
    await p.waitForFunction(() => window.CatedraAuth?.contaLocal === 'titular-B' && sessionStorage.getItem('catedra:hydrated') === '1');
    await p.waitForTimeout(1400);
    ok(await p.evaluate(() => !localStorage.getItem('ct_bkpFase2') && !localStorage.getItem('ct_enam_prova')),
      'PERFIL-01 a troca de titular remove as cópias antigas e o reload não as recria');
  } finally { await ctx.close(); }
}
