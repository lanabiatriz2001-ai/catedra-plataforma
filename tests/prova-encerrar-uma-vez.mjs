/* ENCERRAR UMA VEZ SÓ. O relógio da prova é um setInterval que dá setState a cada segundo. Com o React
   concorrente (createRoot no support.js), o setState do tique entra na fila de prioridade normal e o do
   clique em "Encerrar" passa na frente: um tique que já estava na fila no instante do clique rodava DEPOIS
   do encerramento. No Modo ENAM o _enamFecha já tinha devolvido a duração da sala comum (240 min), e
   16920 s ≥ 240 × 60 disparava a correção automática de novo — segunda tentativa em catedra:enamSim,
   segundo lote de erros, aviso de "Tempo esgotado". Sob carga isso acontecia sozinho (4 de 5 rodadas do
   bloco ENAM — E4 com CPU 8×). Aqui o empate é forçado: o teste guarda o callback do intervalo da prova,
   dá um tique e clica no mesmo instante, sem esperar nada entre os dois.
   E o clique passa o evento como 1º argumento: `auto` virava o evento, e o encerramento à mão saía
   marcado como automático, com o aviso de tempo esgotado — no ENAM e na prova cronometrada comum.
   Só na origem http: semeia por base + '/__semente' (404 na mesma origem), com o app fechado. */

/**
 * @param page   página do Playwright (o chamador é dono do contexto)
 * @param base   'http://localhost:PORTA' — sem barra final
 * @param ok     coletor: ok(cond, rótulo)
 * @param opcoes { motor } — só para o rótulo
 */
export async function testarProvaEncerrarUmaVez(page, base, ok, opcoes = {}) {
  const R = 'PROVA ENCERRAR UMA VEZ [' + (opcoes.motor || 'chromium') + '] ';
  await page.goto(base + '/__semente');
  await page.evaluate(() => {
    localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
    localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
    // a duração da sala comum que o ENAM devolve ao fechar: 240 min, menos que os 16920 s da prova abaixo
    localStorage.setItem('catedra:provaDurationMin', '240');
    ['ct_enam_prova', 'ct_prova', 'catedra:enamSim', 'catedra:errors', 'catedra:fc', 'catedra:enam'].forEach(k => localStorage.removeItem(k));
  });
  await page.goto(base + '/Catedra.dc.html');
  await page.waitForFunction(() => !!window.__catedraApp && !!window.__catedraGoView, null, { timeout: 20000 });
  const r = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const r = {}, app = window.__catedraApp;
    // guarda o callback de cada setInterval criado daqui em diante — o da prova é o de app._provaT
    const intervalos = {}, setIntervalOrig = window.setInterval;
    window.setInterval = function (fn, ms, ...a) { const id = setIntervalOrig.call(window, fn, ms, ...a); intervalos[id] = fn; return id; };
    const toasts = () => [...document.querySelectorAll('div[role=status]')].map(d => d.textContent).join(' | ');
    // o setState do support.js grava o estado na hora; o callback é que espera o commit do React. Um setState
    // vazio entra na fila depois do tique e só volta quando o callback do tique já rodou — a sentinela da ausência
    const sentinela = () => new Promise(res => app.setState({}, res));
    try {
      // ── Modo ENAM ──
      window.__catedraGoView('simulados');
      for(let i=0;i<100&&!document.querySelector('main button[data-v="treino"]');i++)await w(50);
      document.querySelector('main button[data-v="treino"]').click();
      for(let i=0;i<100&&!document.querySelector('main button[data-v="enam"]');i++)await w(50);
      for (let i = 0; i < 160 && !document.querySelector('main button[data-v="enam"]'); i++) await w(50);
      const chip = document.querySelector('main button[data-v="enam"]');
      if (!chip) { r.enamAbriu = false; return r; }
      if (chip.getAttribute('aria-pressed') !== 'true') chip.click();
      for (let i = 0; i < 160 && !(app.state.sjModo === 'enam' && [...document.querySelectorAll('main button')].some(b => /^(Começar|Fechar)$/.test(b.textContent.trim()))); i++) await w(50);
      const abrir = [...document.querySelectorAll('main button')].find(b => /^(Começar|Fechar)$/.test(b.textContent.trim()));
      if (abrir && abrir.textContent.trim() === 'Começar') abrir.click();
      for (let i = 0; i < 160 && ![...document.querySelectorAll('main button')].some(b => /Iniciar o simulado ENAM/.test(b.textContent)); i++) await w(50);
      const ini = [...document.querySelectorAll('main button')].find(b => /Iniciar o simulado ENAM/.test(b.textContent));
      if (!ini) { r.enamAbriu = false; return r; }
      ini.click();
      for (let i = 0; i < 600 && !(document.querySelector('.ct-enam') && app._provaT && intervalos[app._provaT]); i++) await w(50);
      r.enamAbriu = !!document.querySelector('.ct-enam') && app.state.provaMode === true && app.state.provaDurationMin === 300;
      r.relogioDaProvaCapturado = !!(app._provaT && intervalos[app._provaT]);
      if (!r.enamAbriu || !r.relogioDaProvaCapturado) return r;
      // 3 certas e 2 erradas, 4 h 42 de prova — mais que os 240 min que voltam ao fechar
      const its = app.state.sjItens, resp = {};
      resp[its[0].id] = its[0].certo; resp[its[1].id] = its[1].certo; resp[its[2].id] = its[2].certo;
      resp[its[3].id] = its[3].certo === 'A' ? 'B' : 'A'; resp[its[4].id] = its[4].certo === 'A' ? 'B' : 'A';
      const encerrar = [...document.querySelectorAll('.ct-enam-acoes button')].find(b => /Encerrar e corrigir/.test(b.textContent));
      // o empate: um tique na fila e o clique no mesmo instante
      app.setState({ sjResp: resp, provaSeconds: 16920 });
      intervalos[app._provaT](); encerrar.click();
      await sentinela(); await sentinela();
      const sims = app.state.enamSim || [];
      r.enamUmaTentativaSo = sims.length === 1;
      r.enamTentativaManualNaoEAutomatica = sims.length >= 1 && sims[0].auto === false;
      r.enamAvisoDeEncerramentoManual = /Prova encerrada — veja o resultado e registre a sessão/.test(toasts()) && !/Tempo esgotado/.test(toasts());
      r.enamFechouACorrecao = app.state.provaMode === false && app.state.sjFim === true && app.state.provaDurationMin === 240 && app.state.sim.acertos === 3 && app.state.sim.erros === 2;
      app.closeSession(); await sentinela();
      // ── Prova cronometrada comum: o mesmo empate no último segundo, e o encerramento à mão ──
      app.setState({ sjModo: 'misto', sjItens: [], sjResp: {}, sjFim: false, provaDurationMin: 240 }); await sentinela();
      app.startProva();
      for (let i = 0; i < 160 && !(app.state.provaMode && app._provaT && intervalos[app._provaT]); i++) await w(50);
      r.comumAbriu = app.state.provaMode === true && app.state.sjModo !== 'enam' && !!(app._provaT && intervalos[app._provaT]);
      if (!r.comumAbriu) return r;
      for (let i = 0; i < 160 && ![...document.querySelectorAll('button')].some(b => /Encerrar e registrar/.test(b.textContent)); i++) await w(50);
      const registrar = [...document.querySelectorAll('button')].find(b => /Encerrar e registrar/.test(b.textContent));
      // o mesmo empate no último segundo: o tique leva a 240 min, o clique encerra antes do callback dele
      app.setState({ provaSeconds: 240 * 60 - 1 });
      intervalos[app._provaT](); registrar.click();
      await sentinela(); await sentinela();
      r.comumAvisoDeEncerramentoManual = /Prova encerrada — registre seu desempenho/.test(toasts()) && !/Tempo esgotado/.test(toasts());
      r.comumFechou = app.state.provaMode === false && app.state.sessionModalOpen === true;
      app.closeSession();
    } finally { window.setInterval = setIntervalOrig; }
    return r;
  }).catch(e => ({ __excecao: String(e && e.message || e).split('\n')[0].slice(0, 200) }));
  if (r.__excecao) ok(false, R + 'o roteiro correu sem exceção (' + r.__excecao + ')');
  else for (const [k, v] of Object.entries(r)) ok(v, R + k);
  await page.evaluate(() => { ['ct_enam_prova', 'ct_prova', 'catedra:enamSim', 'catedra:errors', 'catedra:fc'].forEach(k => localStorage.removeItem(k)); }).catch(() => {});
}
