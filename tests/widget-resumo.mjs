/* WIDGETS — o resumo que o app publica (Catedra.dc.html → _widgetResumo), o aviso ao app nativo quando ele muda,
   a linha "Widgets" dos Ajustes e a publicação na nuvem pelo auth.js (widget_publicar, passe, revogação ao sair).
   Spec: docs/superpowers/specs/2026-10-01-widgets-design.md §5. Relógio fixo em contexto próprio (padrão de
   tests/registro-sessao.mjs): quinta-feira, 01/10/2026, 14:00 locais. */

const RELOGIO = () => new Date(2026, 9, 1, 14, 0, 0);

export async function testarWidgetResumo(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const R = 'WIDGET [' + motor + '] ';
  const browser = pageDaSuite.context().browser();
  await resumoDoApp(browser, base, ok, R);
  await avisoAoHost(browser, base, ok, R);
}

async function avisoAoHost(browser, base, ok, R) {
  const stub = () => { window.__avisos = []; window.webkit = { messageHandlers: { catedraWidget: { postMessage: (m) => { window.__avisos.push(m); } } } }; };
  const { ctx, page } = await abrirApp(browser, base, sementeBase, stub);
  try {
    await page.waitForTimeout(2600);
    await page.evaluate(() => { window.__avisos = []; });
    await page.evaluate(() => { const a = window.__catedraApp; a.setState({ provaData: '2026-12-01' }); setTimeout(() => a.setState({ provaData: '2026-12-02' }), 100); setTimeout(() => a.setState({ provaData: '2026-12-03' }), 200); });
    await page.waitForTimeout(2800);
    const av = await page.evaluate(() => window.__avisos.filter(m => m && m.resumo === 1).length);
    ok(av === 1, R + 'três mudanças seguidas viram UM aviso catedraWidget {resumo:1} ao app nativo (' + av + ')');
    await page.evaluate(() => { window.__avisos = []; window.__catedraApp.setState({ menuOpen: !window.__catedraApp.state.menuOpen }); });
    await page.waitForTimeout(2600);
    const nada = await page.evaluate(() => window.__avisos.length);
    ok(nada === 0, R + 'mudança de tela que não mexe no resumo não avisa o app nativo (' + nada + ')');
  } finally { await ctx.close(); }
}

async function abrirApp(browser, base, semente, initScript) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA (widget):', e.message));
  if (initScript) await ctx.addInitScript(initScript);
  await page.clock.install({ time: RELOGIO() });
  await page.goto(base + '/__semente');   // página SEM o app: semear com o app vivo é corrida com o autosave
  await page.evaluate(semente);
  await page.goto(base + '/Catedra.dc.html');
  await page.waitForFunction(() => !!window.__catedraApp && typeof window.catedraWidgetResumo === 'function', null, { timeout: 30000 });
  return { ctx, page };
}

function sementeBase() {
  const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
  localStorage.clear();
  set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
  set('prova', '2026-10-31');
  set('edital', [{ disc: 'Direito Constitucional', peso: 2, questoes: 10, topics: [] }]);
  set('reviews', [
    { id: 'r1', disc: 'Direito Civil', topic: 'a', due: -1, dueDate: '2026-09-30', up: 1 },
    { id: 'r2', disc: 'Direito Civil', topic: 'b', due: 0, dueDate: '2026-10-01', up: 1 },
    { id: 'r3', disc: 'Direito Civil', topic: 'c', due: 3, dueDate: '2026-10-04', up: 1 },
    { id: 'r4', disc: 'Direito Civil', topic: 'd', due: 40, dueDate: '2026-11-10', up: 1 }]);
  set('sessions', [
    { id: 's1', ts: 1, date: '2026-10-01', disc: 'Direito Civil', min: 30, countMeta: true },
    { id: 's2', ts: 2, date: '2026-10-01', disc: 'Direito Civil', min: 20, countMeta: false },
    { id: 's3', ts: 3, date: '2026-09-30', disc: 'Direito Penal', min: 60, countMeta: true },
    { id: 's4', ts: 4, date: '2026-09-22', disc: 'Direito Penal', min: 45, countMeta: true }]);
}

async function resumoDoApp(browser, base, ok, R) {
  const { ctx, page } = await abrirApp(browser, base, sementeBase);
  try {
    // ciclo, volta, meta e escudo entram por setState: o _reconcileCiclo e o autosave reescreveriam a semente
    await page.evaluate(() => window.__catedraApp.setState({
      blocks: [{ disc: 'Direito Civil', min: 50, done: true }, { disc: 'Direito Constitucional', min: 40, done: false }, { disc: 'Direito Penal', min: 30, done: false }],
      cicloVolta: { n: 3, blocos: [{ done: true }, { done: true }, { done: false }, { done: false }] },
      orient: { ...(window.__catedraApp.state.orient || {}), dias: 'seg,ter,qua,qui,sex', metaIdeal: '120' },
      escudos: 1 }));
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => window.catedraWidgetResumo());
    ok(!!r && r.v === 1, R + 'o app expõe window.catedraWidgetResumo() com a versão 1');
    ok(r && r.sessao === 'local' && r.conta === '' && r.carimbo === 0, R + 'sem auth.js (arquivo cru) o resumo é de sessão local, sem conta e sem carimbo');
    ok(r && r.prova && r.prova.data === '2026-10-31' && r.prova.nome === 'Meu concurso', R + 'a prova vai com a data e o nome do concurso ativo (' + JSON.stringify(r && r.prova) + ')');
    ok(r && r.revisoes.atrasadas === 1 && r.revisoes.porData['2026-10-01'] === 1 && r.revisoes.porData['2026-10-04'] === 1 && !('2026-11-10' in r.revisoes.porData),
      R + 'revisões contadas pelo dueDate: 1 atrasada, as dos próximos 30 dias por data, nada além (' + JSON.stringify(r && r.revisoes) + ')');
    ok(r && r.minPorDia['2026-10-01'] === 30 && r.minPorDia['2026-09-30'] === 60 && Object.keys(r.minPorDia).length === 8 && !('2026-09-22' in r.minPorDia),
      R + 'minutos por dia: 8 dias, só o que conta para a meta (' + JSON.stringify(r && r.minPorDia) + ')');
    ok(r && r.ofensiva.n === 2 && r.ofensiva.valeAte === '2026-10-03', R + 'a ofensiva vale até hoje + 1 dia + 1 escudo (' + JSON.stringify(r && r.ofensiva) + ')');
    ok(r && r.ciclo.feitos === 1 && r.ciclo.total === 3 && r.ciclo.proximos.length === 2, R + 'o ciclo de hoje: 1 de 3 feitos, 2 por fazer');
    const p0 = r && r.ciclo.proximos[0];
    ok(!!p0 && p0.disc === 'Direito Constitucional' && p0.min === 40 && p0.cor === '#2563eb' && p0.corD === '#38bdf8',
      R + 'o próximo bloco vem com a cor da matéria resolvida pela CT_CORES_RAMO (' + JSON.stringify(p0) + ')');
    ok(r && r.ciclo.volta && r.ciclo.volta.n === 3 && r.ciclo.volta.feitos === 2 && r.ciclo.volta.total === 4, R + 'a volta do ciclo: nº 3, 2 de 4');
    ok(r && r.metaDiariaMin === 120 && r.metaSemanaMin === 600 && r.diasAtivos.join(',') === 'seg,ter,qua,qui,sex', R + 'meta: 120 min por dia, 600 na semana de 5 dias');
    ok(r && r.area === 'juridica' && r.juridico === true, R + 'a área jurídica marca o resumo como jurídico');
    ok(r && /^#[0-9a-f]{6}$/.test(r.prefs.tema.accent) && r.prefs.tema.grad.length >= 1 && r.prefs.tema.grad.length <= 2 && r.prefs.tema.grad.every(c => /^#[0-9a-f]{6}$/.test(c)) && r.prefs.tema.escuro === false && r.prefs.baixa === false,
      R + 'o tema vai como hex resolvido (accent + até 2 paradas do gradiente) (' + JSON.stringify(r && r.prefs) + ')');

    // a cor própria da disciplina no edital vence a tabela
    await page.evaluate(() => window.__catedraApp.setState({ edital: [{ disc: 'Direito Constitucional', color: '#123456', peso: 2, questoes: 10, topics: [] }] }));
    const c2 = await page.evaluate(() => window.catedraWidgetResumo().ciclo.proximos[0].cor);
    ok(c2 === '#123456', R + 'a cor escolhida para a disciplina no edital vence a tabela de ramos (' + c2 + ')');

    // baixa estimulação, escuro e área não jurídica
    await page.evaluate(() => window.__catedraApp.setState({ prefs: { ...window.__catedraApp.state.prefs, baixaEstimulacao: true }, darkMode: true }));
    await page.waitForTimeout(300);
    const r3 = await page.evaluate(() => window.catedraWidgetResumo());
    ok(r3.prefs.baixa === true && r3.prefs.tema.escuro === true && /^#[0-9a-f]{6}$/.test(r3.prefs.tema.accent), R + 'baixa estimulação e modo escuro chegam ao resumo, com o accent do tema escuro');

    // teto de 64 KB com uma conta grande
    const tam = await page.evaluate(() => {
      const S = [], V = [];
      for (let i = 0; i < 3000; i++) S.push({ id: 'x' + i, ts: i, date: '2026-09-' + String(1 + (i % 30)).padStart(2, '0'), disc: 'Direito Civil', min: 30, countMeta: true });
      for (let i = 0; i < 2000; i++) V.push({ id: 'v' + i, disc: 'Direito Civil', topic: 't', dueDate: '2026-10-' + String(1 + (i % 30)).padStart(2, '0'), up: 1 });
      window.__catedraApp.setState({ sessions: S, reviews: V });
      return new Blob([JSON.stringify(window.catedraWidgetResumo())]).size;
    });
    ok(tam < 65536, R + 'o resumo de uma conta com 3.000 sessões e 2.000 revisões cabe em 64 KB (' + tam + ' bytes)');

    await page.evaluate(() => window.__catedraApp.setState({ areaEstudo: 'saude' }));
    await page.waitForTimeout(300);
    const jur = await page.evaluate(() => window.catedraWidgetResumo().juridico);
    ok(jur === false, R + 'na área da saúde o resumo deixa de ser jurídico (o "Do dia" avisa)');
  } finally { await ctx.close(); }
}
