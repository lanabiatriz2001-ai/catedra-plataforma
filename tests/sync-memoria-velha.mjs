/* A MEMÓRIA VELHA NÃO PODE VOLTAR POR CIMA DA NUVEM (01/10/2026).

   O incidente: o iPad saiu do modo "Usar sem conta" (#179) com um caderno antigo na memória
   (backup importado em 25/09). A hidratação do auth.js juntou certo — 29 sessões, o edital e o
   ciclo da nuvem — e disparou 'catedra:synced'. O _rehydrateFromLocal viu a área "mudar" de
   "juridica" para "" (o mesmo caderno para o _chave) e, para "fechar o caderno da área
   anterior", chamou o _salvarAgora, que regravava TODAS as chaves e as sessões a partir da
   memória. Cada setItem passa pelo auth.js, que carimba a hora de agora: o caderno de 25/09
   virou o "mais novo" e subiu para a nuvem — edital, ciclo, banca, horas, roteiro, redação, e
   uma sessão de 28/09 que só a nuvem tinha.

   O _salvarAgora existe para gravar o que a pessoa mudou e o debounce ainda não salvou. O que
   a memória tem igual ao último salvamento já está no disco; regravar isso só serve para pôr
   memória velha por cima do que o sync acabou de trazer. Sessões, lixeira e flashcards gravam
   na hora de cada mudança (_saveSessions/_saveLixeira/_saveFC), e o _salvarAgora não as toca.

   Casos (o que o pull da nuvem faz: grava as chaves e avisa o app):
   (a) a área e o concurso chegam numa forma equivalente ("juridica" → "", "ed-principal" → "")
       junto com edital, ciclo e sessões mais novos: nada disso é regravado com a memória velha;
   (b) troca de área DE VERDADE com uma edição ainda no debounce: a edição vai para o caderno de
       saída (o _salvarAgora continua fazendo o seu trabalho), e o caderno que chegou fica intacto. */
export async function testarSyncMemoriaVelha(browser, base, ok, motor = '') {
  const R = 'SYNC MEMÓRIA VELHA' + (motor ? ' [' + motor + ']' : '') + ' ';
  const w = ms => new Promise(r => setTimeout(r, ms));

  // (a) o caso do iPad
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const pg = await ctx.newPage();
    await pg.addInitScript(() => {
      if (sessionStorage.getItem('__semeado')) return;
      sessionStorage.setItem('__semeado', '1');
      try {
        localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
        localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
        localStorage.setItem('catedra:editalAtivo', JSON.stringify('ed-principal'));
        localStorage.setItem('catedra:edital', JSON.stringify([{ id: 'velho', up: 1, disc: 'Direito Penal (backup antigo)', peso: 1, color: '#2563EB', topics: [] }]));
        localStorage.setItem('catedra:planHoras', JSON.stringify(24));
        localStorage.setItem('catedra:sessions', JSON.stringify([{ id: 's-ipad', ts: 1, date: '2026-09-09', disc: 'Direito Penal', min: 500 }]));
        localStorage.setItem('catedra:sessionsLixeira', JSON.stringify([]));
      } catch (_) {}
    });
    await pg.goto(base + '/Catedra.dc.html');
    await pg.waitForFunction(() => !!window.__catedraApp, null, { timeout: 30000 });
    await pg.waitForTimeout(1200);
    const r = await pg.evaluate(async () => {
      const w = ms => new Promise(res => setTimeout(res, ms));
      const g = k => localStorage.getItem(k);
      // o pull da nuvem: a área e o concurso na forma vazia, e um caderno mais novo
      localStorage.setItem('catedra:areaEstudo', JSON.stringify(''));
      localStorage.setItem('catedra:editalAtivo', JSON.stringify(''));
      localStorage.setItem('catedra:edital', JSON.stringify([{ id: 'novo', up: 9, disc: 'Direito Civil (nuvem)', peso: 3, color: '#0EA5E9', topics: [] }]));
      localStorage.setItem('catedra:planHoras', JSON.stringify(29));
      localStorage.setItem('catedra:sessions', JSON.stringify([
        { id: 's-ipad', ts: 1, date: '2026-09-09', disc: 'Direito Penal', min: 500 },
        { id: 's-nuvem', ts: 2, date: '2026-09-28', disc: 'Direito Penal', min: 297 }]));
      localStorage.setItem('catedra:sessionsLixeira', JSON.stringify([{ id: 's-lixo', ts: 3, _delAt: 4 }]));
      window.dispatchEvent(new CustomEvent('catedra:synced'));
      await w(2500);                       // muito além dos 500 ms do autosave
      const ids = k => { try { return (JSON.parse(g(k) || '[]') || []).map(x => x.id).sort().join(','); } catch (_) { return 'ILEGÍVEL'; } };
      const app = window.__catedraApp;
      return { edital: ids('catedra:edital'), horas: g('catedra:planHoras'), sessoes: ids('catedra:sessions'), lixeira: ids('catedra:sessionsLixeira'),
        telaEdital: (app.state.edital || []).map(x => x.id).join(','), telaSessoes: (app.state.sessions || []).map(x => x.id).sort().join(',') };
    });
    ok(r.edital === 'novo', R + '(a) o edital que a nuvem trouxe não é regravado com o da memória (edital=' + r.edital + ')');
    ok(r.horas === '29', R + '(a) as horas do plano que chegaram ficam (planHoras=' + r.horas + ')');
    ok(r.sessoes === 's-ipad,s-nuvem', R + '(a) a sessão que só a nuvem tinha fica no aparelho (sessions=' + r.sessoes + ')');
    ok(r.lixeira === 's-lixo', R + '(a) a lixeira que chegou fica (sessionsLixeira=' + r.lixeira + ')');
    ok(r.telaEdital === 'novo' && r.telaSessoes === 's-ipad,s-nuvem',
      R + '(a) a tela adota o que chegou (edital=' + r.telaEdital + ', sessões=' + r.telaSessoes + ')');
    await ctx.close();
  }

  // (b) troca de área de verdade, com uma edição ainda no debounce
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const pg = await ctx.newPage();
    await pg.addInitScript(() => {
      if (sessionStorage.getItem('__semeado')) return;
      sessionStorage.setItem('__semeado', '1');
      try {
        localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
        localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
        localStorage.setItem('catedra:edital', JSON.stringify([{ id: 'jur1', up: 1, disc: 'Direito Civil', peso: 3, color: '#2563EB', topics: [] }]));
        localStorage.setItem('catedra:edital@saude', JSON.stringify([{ id: 'sau1', up: 9, disc: 'Clínica Médica', peso: 4, color: '#0EA5E9', topics: [] }]));
      } catch (_) {}
    });
    await pg.goto(base + '/Catedra.dc.html');
    await pg.waitForFunction(() => !!window.__catedraApp, null, { timeout: 30000 });
    await pg.waitForTimeout(1200);
    const r = await pg.evaluate(async () => {
      const w = ms => new Promise(res => setTimeout(res, ms));
      const g = k => localStorage.getItem(k);
      const app = window.__catedraApp;
      // edição feita agora: ainda no debounce de 500 ms, só na memória
      app.setState({ edital: [...(app.state.edital || []), { id: 'jur2', up: 5, disc: 'Direito Penal', peso: 2, color: '#DC2626', topics: [] }] });
      localStorage.setItem('catedra:areaEstudo', JSON.stringify('saude'));
      window.dispatchEvent(new CustomEvent('catedra:synced'));
      await w(2500);
      const ids = k => { try { return (JSON.parse(g(k) || '[]') || []).map(x => x.id).sort().join(','); } catch (_) { return 'ILEGÍVEL'; } };
      return { jur: ids('catedra:edital'), sau: ids('catedra:edital@saude') };
    });
    ok(r.jur === 'jur1,jur2', R + '(b) a edição ainda no debounce vai para o caderno de saída (edital=' + r.jur + ')');
    ok(r.sau === 'sau1', R + '(b) o caderno da área que chegou fica intacto (edital@saude=' + r.sau + ')');
    await ctx.close();
  }
}
