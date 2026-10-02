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
  await publicacao(browser, base, ok, R);
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

const FIX = '/tests/auth-ipad-fixture.html';
const U1 = { id: 'u1', email: 'lana@exemplo.com' };
const UPD = '2026-09-30T12:00:00.000Z';
const linha = (data, upd = UPD) => ({ data: { data, updated_at: upd }, error: null });

async function casoAuth(browser, base, { ct = {}, local = {}, stub = true, semSessao = false, webkit = false }, corpo) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA (widget-publicacao):', e.message));
  try {
    if (stub) await ctx.addInitScript(() => { window.catedraWidgetResumo = () => ({ v: 1, sessao: 'conta', marca: 'resumo-de-teste' }); });
    if (webkit) await ctx.addInitScript(() => { window.webkit = { messageHandlers: { catedraWidget: { postMessage: (m) => {
      try { const l = JSON.parse(localStorage.getItem('__ct:avisos') || '[]'); l.push(m); localStorage.setItem('__ct:avisos', JSON.stringify(l)); } catch (_) {} } } } }; });
    await page.clock.install({ time: RELOGIO() });
    await page.goto(base + '/__semente');
    await page.evaluate(({ U1, ct, local, semSessao }) => {
      localStorage.clear(); sessionStorage.clear();
      if (!semSessao) localStorage.setItem('__ct:sessao', JSON.stringify(U1));
      localStorage.setItem('__ct:online', '1'); localStorage.setItem('__ct:chamadas', '[]');
      for (const [k, v] of Object.entries(ct)) localStorage.setItem('__ct:' + k, typeof v === 'string' ? v : JSON.stringify(v));
      if (!semSessao) { localStorage.setItem('catedra:_owner', U1.id); localStorage.setItem('catedra:auth', '1'); sessionStorage.setItem('catedra:hydrated', '1'); }
      for (const [k, v] of Object.entries(local)) localStorage.setItem(k, v);
    }, { U1, ct, local, semSessao });
    await page.goto(base + FIX);
    const chamadas = () => page.evaluate(() => JSON.parse(localStorage.getItem('__ct:chamadas') || '[]'));
    await corpo(page, chamadas);
  } finally { await ctx.close(); }
}
const rpcs = (lista, n) => lista.filter(c => c.nome === 'rpc' && c.arg && c.arg.n === n);

async function publicacao(browser, base, ok, R) {
  // P1: depois da leitura da nuvem, publica uma vez, com o updated_at lido como carimbo
  await casoAuth(browser, base, { ct: { select: linha({ 'catedra:prova': '2026-10-31' }) } }, async (page, chamadas) => {
    await page.waitForTimeout(4500);
    const pubs = rpcs(await chamadas(), 'widget_publicar');
    ok(pubs.length === 1, R + 'depois da leitura da nuvem o resumo é publicado UMA vez (' + pubs.length + ')');
    const a = pubs[0] && pubs[0].arg.a;
    ok(!!a && a.p_carimbo === Date.parse(UPD), R + 'o carimbo publicado é o updated_at lido do user_data');
    ok(!!a && a.p_resumo && a.p_resumo.marca === 'resumo-de-teste' && a.p_resumo.conta === 'u1' && a.p_resumo.carimbo === a.p_carimbo,
      R + 'o resumo vai com a conta e com o mesmo carimbo dentro');
    const c = await page.evaluate(() => window.CatedraSync && window.CatedraSync.carimbo);
    ok(c === Date.parse(UPD), R + 'CatedraSync.carimbo devolve o carimbo do último acerto com a nuvem (' + c + ')');
  });
  // P2: com o aparelho sujo, o envio publica com o updated_at do upsert; o passe local nunca sobe
  await casoAuth(browser, base, {
    ct: { select: linha({ 'catedra:prova': '2026-10-31' }) },
    local: { 'catedra:_dirty': '1', 'catedra:_lastSrv': UPD, 'catedra:prova': '2026-11-01', 'catedra:_widgetPasse': 'passe-local-nao-sobe' } }, async (page, chamadas) => {
    await page.waitForTimeout(4500);
    const l = await chamadas();
    const up = l.filter(c => c.nome === 'upsert').pop();
    const pub = rpcs(l, 'widget_publicar').pop();
    ok(!!up && !!pub && pub.arg.a.p_carimbo === Date.parse(up.arg.updated_at), R + 'depois de subir, o carimbo publicado é o updated_at do upsert');
    ok(!!up && !('catedra:_widgetPasse' in (up.arg.data || {})), R + 'o passe do widget deste aparelho nunca sobe para a nuvem');
  });
  // P3: sem a função do app (página sem o Catedra), não publica nada
  await casoAuth(browser, base, { stub: false, ct: { select: linha({ 'catedra:prova': '2026-10-31' }) } }, async (page, chamadas) => {
    await page.waitForTimeout(4500);
    ok(rpcs(await chamadas(), 'widget_publicar').length === 0, R + 'sem window.catedraWidgetResumo, nada é publicado');
  });
  // P4: modo local (sem conta) não publica
  await casoAuth(browser, base, { semSessao: true, local: { 'catedra:_modoLocal': '1', 'catedra:auth': '1' } }, async (page, chamadas) => {
    await page.waitForTimeout(4500);
    ok(rpcs(await chamadas(), 'widget_publicar').length === 0, R + 'no modo local (sem conta) nada é publicado');
  });
  // P5: falha da publicação não derruba a sincronização e vai para a fila de erros
  await casoAuth(browser, base, { ct: { select: linha({ 'catedra:prova': '2026-10-31' }), rpc_widget_publicar: { data: null, error: { message: 'boom' } } } }, async (page) => {
    await page.waitForTimeout(4500);
    const st = await page.evaluate(() => window.CatedraSync.status);
    const fila = await page.evaluate(() => localStorage.getItem('catedra:_errFila') || '');
    ok(st === 'salvo', R + 'a publicação que falha não muda o estado da sincronização (' + st + ')');
    ok(/widget_publicar/.test(fila), R + 'e o erro vai para a fila de erros, calado');
  });
  // P6: o passe
  await casoAuth(browser, base, { ct: { select: linha({}), rpc_widget_passe_emitir: { data: 'passe-de-teste-0123456789abcdef', error: null } } }, async (page, chamadas) => {
    await page.waitForTimeout(1500);
    const s = await page.evaluate(() => window.catedraWidgetPasse('Mac de teste'));
    let p = null; try { p = JSON.parse(s); } catch (_) {}
    ok(!!p && p.passe === 'passe-de-teste-0123456789abcdef' && p.conta === 'u1', R + 'catedraWidgetPasse devolve {passe, conta} em JSON (' + s + ')');
    const e = rpcs(await chamadas(), 'widget_passe_emitir').pop();
    ok(!!e && e.arg.a.p_aparelho === 'Mac de teste', R + 'o passe é pedido com o nome do aparelho');
    const guardado = await page.evaluate(() => localStorage.getItem('catedra:_widgetPasse'));
    ok(guardado === 'passe-de-teste-0123456789abcdef', R + 'a web lembra o passe deste aparelho para revogar ao sair');
  });
  await casoAuth(browser, base, { semSessao: true, local: { 'catedra:_modoLocal': '1', 'catedra:auth': '1' } }, async (page) => {
    await page.waitForTimeout(1500);
    const s = await page.evaluate(() => window.catedraWidgetPasse ? window.catedraWidgetPasse('x') : 'sem-funcao');
    ok(s === null, R + 'sem conta, catedraWidgetPasse devolve null (' + s + ')');
  });
  // P7: sair revoga o passe ANTES do signOut e avisa o app nativo
  await casoAuth(browser, base, { webkit: true, ct: { select: linha({}) }, local: { 'catedra:_widgetPasse': 'passe-x-0123456789abcdef0000' } }, async (page, chamadas) => {
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.CatedraAuth.logout());
    await page.waitForTimeout(3000);
    const l = await chamadas();
    const iRev = l.findIndex(c => c.nome === 'rpc' && c.arg && c.arg.n === 'widget_passe_revogar' && c.arg.a && c.arg.a.p_passe === 'passe-x-0123456789abcdef0000');
    const iOut = l.findIndex(c => c.nome === 'signOut');
    ok(iRev >= 0 && iOut > iRev, R + 'sair revoga o passe deste aparelho antes de encerrar a sessão (' + iRev + ' < ' + iOut + ')');
    const av = await page.evaluate(() => JSON.parse(localStorage.getItem('__ct:avisos') || '[]'));
    ok(av.some(m => m && m.saiu === true), R + 'sair avisa o app nativo ({saiu:true}) para o widget esquecer a conta');
    const resto = await page.evaluate(() => localStorage.getItem('catedra:_widgetPasse'));
    ok(resto === null, R + 'depois de sair, o passe some deste aparelho');
  });
}
