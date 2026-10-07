/* MODO ENAM (E3): abrir o preset, montar a prova e responder uma questão — a grade de 80
   quadradinhos sobre a tela cheia é o tipo de tela que quebra no WKWebView. É uma função,
   como tests/oral-lei-seca.mjs, para rodar em qualquer par motor × origem (Chromium/WebKit;
   http, file e bundle). Em file:// o banco oficial (questoes-enam.js) chega por <script>,
   exatamente como no iPad — se o carregarScript falhar, o painel tem de EXPLICAR, e o teste
   falha dizendo qual dos dois aconteceu. As asserções são as mesmas em todo canto; só o
   prefixo do rótulo diz onde rodou. */

/**
 * @param page   página do Playwright (o chamador é dono do contexto)
 * @param base   'http://localhost:PORTA' ou 'file:///caminho' — sem barra final
 * @param ok     coletor: ok(cond, rótulo)
 * @param opcoes { motor, origem, arquivo } — motor/origem só para o rótulo; `arquivo` é o HTML do host
 */
export async function testarEnamModo(page, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const origem = opcoes.origem || (String(base).startsWith('file:') ? 'file' : 'http');
  const arquivo = opcoes.arquivo || 'Catedra.dc.html';
  const emArquivo = origem === 'file' || origem === 'bundle';
  const R = 'ENAM MODO [' + motor + '] [' + origem + '] ';
  const errosPagina = [];
  const aoErro = e => {
    const m = String(e && e.message || e);
    const esperado = emArquivo && /access control checks|Cross origin requests|Access-Control/i.test(m);
    if (!esperado) errosPagina.push(m);
  };
  page.on('pageerror', aoErro);
  try {
    const host = base + '/' + arquivo;
    await page.goto(host);
    await page.evaluate(() => {
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
      ['ct_enam_prova', 'ct_prova', 'catedra:enamSim', 'catedra:_lastErr'].forEach(k => localStorage.removeItem(k));
    });
    await page.goto(host);
    await page.waitForFunction(() => !!window.__catedraApp && !!window.__catedraGoView, null, { timeout: 20000 });
    await page.waitForTimeout(800);
    const r = await page.evaluate(async () => {
      const w = ms => new Promise(res => setTimeout(res, ms));
      const r = {}, app = window.__catedraApp;
      window.__catedraGoView('simulados'); await w(700);
      for(let i=0;i<100&&!document.querySelector('main button[data-v="treino"]');i++)await w(50);
      document.querySelector('main button[data-v="treino"]').click();
      for(let i=0;i<100&&!document.querySelector('main button[data-v="enam"]');i++)await w(50);
      const chip = document.querySelector('main button[data-v="enam"]');
      r.chipExiste = !!chip && /Modo ENAM/.test(chip.textContent);
      if (!chip) return r;
      chip.click(); await w(250);
      r.chipLigado = chip.getAttribute('aria-pressed') === 'true' && chip.getBoundingClientRect().height >= 44;
      const abrir = [...document.querySelectorAll('main button')].find(b => /^(Começar|Fechar)$/.test(b.textContent.trim()));
      if (abrir && abrir.textContent.trim() === 'Começar') { abrir.click(); await w(500); }
      const painel = document.querySelector('main').textContent;
      r.painelExplicaAProva = /Modo ENAM — a prova como ela é/.test(painel) && /80 questões A–E/.test(painel) && /Constitucional\s*16/.test(painel) && /Penal\s*12/.test(painel);
      const ini = [...document.querySelectorAll('main button')].find(b => /Iniciar o simulado ENAM/.test(b.textContent));
      r.botaoIniciar = !!ini;
      if (!ini) return r;
      ini.click();
      for (let i = 0; i < 80 && !document.querySelector('.ct-enam') && !document.querySelector('main .ct-estado[role=alert]'); i++) await w(250);
      const alerta = document.querySelector('main .ct-estado[role=alert]');
      r.bancoCarregou = !alerta && !!document.querySelector('.ct-enam');
      r.semBancoExplicaria = alerta ? alerta.textContent.slice(0, 120) : '';
      if (!document.querySelector('.ct-enam')) return r;
      r.grade80 = document.querySelectorAll('.ct-gab-q').length === 80 && app.state.sjItens.length === 80;
      r.ordemDoEdital = app.state.sjItens.slice(0, 16).every(x => x.area === 'constitucional') && app.state.sjItens.slice(-12).every(x => x.area === 'penal');
      r.soBancoOficial = app.state.sjItens.every(x => x.alternativas && x.alternativas.length === 5 && (x.origem === 'enam' || x.foraDoEnam));
      r.relogioDe5h = app.state.provaDurationMin === 300 && app.state.provaRunning === true && /^0[45]:/.test(document.querySelector('.ct-enam-tempo').textContent);
      r.alvos44 = document.querySelector('.ct-gab-q').getBoundingClientRect().height >= 44 && document.querySelector('.ct-enam-alt').getBoundingClientRect().height >= 44;
      const b = document.querySelector('.ct-enam-alt[data-l="B"]'); b.click(); await w(300);
      const q1 = app.state.sjItens[0];
      r.respondeu = app.state.sjResp[q1.id] === 'B' && document.querySelector('.ct-enam-alt[data-l="B"]').getAttribute('aria-pressed') === 'true'
        && document.querySelector('.ct-gab-q[data-i="0"]').getAttribute('data-est') === 'resp';
      r.semGabaritoNaTela = !/GABARITO|Gabarito:/.test(document.querySelector('.ct-enam').textContent);
      let t = null; try { t = JSON.parse(localStorage.getItem('ct_enam_prova') || 'null'); } catch (_) {}
      r.guardouSoIds = !!t && Array.isArray(t.itensIds) && t.itensIds.length === 80 && t.resp[q1.id] === 'B' && !JSON.stringify(t).includes(q1.enunciado.slice(0, 40));
      app.exitProva(); await w(300);
      r.sairLimpa = !localStorage.getItem('ct_enam_prova') && !app.state.provaMode && !document.querySelector('.ct-enam');
      return r;
    });
    for (const [k, v] of Object.entries(r)) {
      if (k === 'semBancoExplicaria') { if (v) ok(false, R + 'o banco carregou (o painel explicou em vez disso: ' + v + ')'); continue; }
      ok(v === true, R + k);
    }
    ok(errosPagina.length === 0, R + 'sem erro de JS na página' + (errosPagina.length ? ' (' + errosPagina[0].slice(0, 120) + ')' : ''));
  } finally {
    page.off('pageerror', aoErro);
  }
}
