/* AJUSTES · RITMO E METAS (03/10/2026). A aba foi refeita: perfis prontos, régua única de
   metas e energia de hoje × energia base. Aqui se prova a LÓGICA pelo componente
   (window.__catedraApp) e, mais abaixo, a aparência medida. */

const semear = async (page, base, orient) => {
  await page.goto(base + '/__semente');
  await page.evaluate((o) => {
    localStorage.clear();
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
    set('edital', [
      { disc: 'Direito Civil', peso: 3, questoes: 15, topics: [{ name: 'Obrigações', done: false, subs: [] }, { name: 'Contratos', done: false, subs: [] }] },
      { disc: 'Direito Penal', peso: 2, questoes: 10, topics: [{ name: 'Teoria do crime', done: false, subs: [] }] },
      { disc: 'Direito Constitucional', peso: 2, questoes: 10, topics: [{ name: 'Controle', done: false, subs: [] }] }]);
    set('sessions', []); set('reviews', []); set('errors', []);
    if (o) set('orient', o);
  }, orient || null);
};
const abrir = async (page, base, arquivo) => {
  await page.goto(base + '/' + arquivo);
  await page.waitForFunction(() => !!window.__catedraApp && !!document.querySelector('#ct-main'), null, { timeout: 20000 });
  await page.evaluate(() => window.__catedraApp.setState({ view: 'ajustes', ajSec: 'ritmo' }));
  await page.waitForTimeout(400);
};
const orientSalvo = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('catedra:orient') || '{}'));

export async function testarAjustesRitmo(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const arquivo = opcoes.arquivo || 'Catedra.dc.html';
  const R = 'RITMO [' + motor + '] ';
  const browser = pageDaSuite.context().browser();

  // ── perfis e régua ─────────────────────────────────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
    try {
      await semear(page, base); await abrir(page, base, arquivo);
      ok(await page.evaluate(() => window.__catedraApp._rmPerfilAtual()) === 'equilibrio', R + 'fábrica é o perfil Equilíbrio');

      await page.evaluate(() => window.__catedraApp.rmAplicarPerfil({ currentTarget: { dataset: { v: 'intensivo' } } }));
      await page.waitForTimeout(1400);
      let o = await orientSalvo(page);
      ok(o.metaMin === '120' && o.metaIdeal === '300' && o.metaForte === '420' && o.blocoPadrao === '60' && o.cobranca === 'rigido',
        R + 'Intensivo grava os cinco valores (' + JSON.stringify([o.metaMin, o.metaIdeal, o.metaForte, o.blocoPadrao, o.cobranca]) + ')');
      ok(o.tempoDia === '300', R + 'tempoDia espelha a meta ideal');
      ok(await page.evaluate(() => window.__catedraApp.state.prefs.metaDiaria) === 5, R + 'prefs.metaDiaria espelha a meta ideal em horas');
      ok(await page.evaluate(() => window.__catedraApp._rmPerfilAtual()) === 'intensivo', R + 'perfil em uso passa a ser Intensivo');

      await page.evaluate(() => window.__catedraApp.rmDesfazerPerfil());
      await page.waitForTimeout(1400);
      o = await orientSalvo(page);
      ok(o.metaIdeal === '180' && o.blocoPadrao === '50' && o.cobranca === 'equilibrado', R + 'Desfazer devolve os valores de antes');

      // régua: + na mínima empurra ideal e forte; nunca mínimo > ideal > forte
      await page.evaluate(() => { const a = window.__catedraApp; for (let i = 0; i < 20; i++) a.rmPasso({ currentTarget: { dataset: { k: 'metaMin', d: '15' } } }); });
      await page.waitForTimeout(1400);
      o = await orientSalvo(page);
      ok(+o.metaMin === 360 && +o.metaIdeal === 360 && +o.metaForte === 360, R + 'régua empurra as vizinhas (' + [o.metaMin, o.metaIdeal, o.metaForte] + ')');
      ok(await page.evaluate(() => window.__catedraApp._rmPerfilAtual()) === '', R + 'valores fora da tabela = Personalizado');

      // digitado fora de ordem e campo vazio
      await page.evaluate(() => { const a = window.__catedraApp;
        a.setState(s => ({ orient: { ...s.orient, metaMin: '300', metaIdeal: '120', metaForte: '' } }));
        a.rmOrdenarMetas({ currentTarget: { dataset: { k: 'metaMin' } } }); });
      await page.waitForTimeout(1400);
      o = await orientSalvo(page);
      ok(+o.metaMin === 300 && +o.metaIdeal === 300 && +o.metaForte === 300, R + 'ordenar preserva o campo editado e conserta os outros (' + [o.metaMin, o.metaIdeal, o.metaForte] + ')');
      ok([o.metaMin, o.metaIdeal, o.metaForte, o.tempoDia].every(v => /^\d+$/.test(String(v))), R + 'nenhum NaN nem vazio no storage');
    } finally { await ctx.close(); }
  }

  // ── energia de hoje × base, com relógio fixo ───────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
    const t = new Date(); t.setHours(14, 0, 0, 0);
    await page.clock.install({ time: t });
    try {
      // legado: energiaPlano 'baixa' sem energiaDia → vira a base (ninguém muda de ritmo sem pedir)
      await semear(page, base, { energia: 'normal', energiaPlano: 'baixa' }); await abrir(page, base, arquivo);
      ok(await page.evaluate(() => window.__catedraApp._enHoje()) === 'baixa', R + 'migração: energia antiga vira a base');
      ok(await page.evaluate(() => window.__catedraApp.state.orient.energia) === 'baixa', R + 'migração grava orient.energia');

      await page.evaluate(() => window.__catedraApp.setOrientRadio({ currentTarget: { dataset: { v: 'alta' } } }));
      await page.waitForTimeout(1400);
      ok(await page.evaluate(() => window.__catedraApp._enHoje()) === 'alta', R + 'energia de hoje vale hoje');
      const o = await orientSalvo(page);
      ok(/^\d{4}-\d{2}-\d{2}$/.test(o.energiaDia), R + 'energiaDia carimbado com o dia de estudo');

      // migração idempotente: reaplicar não troca a base
      ok(await page.evaluate(() => { const a = window.__catedraApp; return a._rmMigrarEnergia({ ...a.state.orient }).energia; }) === 'baixa', R + 'migração não roda duas vezes');

      await page.clock.fastForward(26 * 60 * 60 * 1000);
      ok(await page.evaluate(() => window.__catedraApp._enHoje()) === 'baixa', R + 'no dia seguinte volta à base');
    } finally { await ctx.close(); }
  }
}
