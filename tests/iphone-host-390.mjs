/* IPHONE — O HOST (Catedra.dc.html) A 390 × 844, NO TOQUE (F0 do plano do iPhone, 11/09/2026)

   O app virou universal (UIDeviceFamily 1 e 2) e no iPhone a WKWebView abre o mesmo
   Catedra.dc.html que o iPad, só que com 390 pt de largura — o layout de "celular" que a
   web já tinha desde os 900 px. Este módulo é a casa dos casos de aceite das frentes F4
   (host web no compacto) e F5; a F0 deixa aqui UM caso real, que já passa hoje e MEDE:

   · a 390 px, na tela "inicio", a barra inferior de navegação rápida existe, está presa ao
     rodapé dentro da janela, e cada um dos seus botões tem caixa ≥ 44 × 44 px (regra da
     casa: alvo de toque ≥ 44 px; presença no DOM não prova nada, a caixa é medida).

   Contexto PRÓPRIO 390×844 com isMobile + hasTouch (padrão de ciclo-inteligente.mjs), fechado
   no finally; semente pela /__semente (404 na mesma origem) ANTES de abrir o app, para não
   correr contra o autosave. Rótulos "IPHONE/host 390 …". */

export async function testarIphoneHost390(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const origem = opcoes.origem || (String(base).startsWith('file:') ? 'file' : 'http');
  const arquivo = opcoes.arquivo || 'Catedra.dc.html';
  const R = 'IPHONE/host 390 [' + motor + '] [' + origem + '] ';

  const ctx = await pageDaSuite.context().browser().newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  try {
    await page.goto(base + '/__semente');
    await page.evaluate(() => {
      localStorage.clear();
      const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
      set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
      set('edital', [{ disc: 'Direito Civil', peso: 2, questoes: 15, topics: [{ name: 'Obrigações', done: false, subs: [] }] }]);
      set('sessions', []); set('reviews', []); set('errors', []);
    });
    await page.goto(base + '/' + arquivo); await page.waitForTimeout(1800);

    const m = await page.evaluate(async () => {
      const w = ms => new Promise(res => setTimeout(res, ms));
      window.__catedraGoView && window.__catedraGoView('inicio'); await w(700);
      const nav = document.querySelector('nav[aria-label="Navegação rápida"]');
      if (!nav) return { existe: false };
      const cs = getComputedStyle(nav), nb = nav.getBoundingClientRect();
      const botoes = [...nav.querySelectorAll('button')];
      const caixas = botoes.map(b => { const r = b.getBoundingClientRect(); return { rot: b.getAttribute('aria-label') || '', w: r.width, h: r.height }; });
      return {
        existe: true, larguraJanela: innerWidth,
        fixaNoRodape: cs.position === 'fixed' && Math.abs(nb.bottom - innerHeight) <= 1,
        dentroDaJanela: nb.left >= -0.5 && nb.right <= innerWidth + 0.5,
        botoes: caixas,
        temInicioEMenu: caixas.some(c => c.rot === 'Início') && caixas.some(c => /menu/i.test(c.rot)),
        semRolagemLateral: document.documentElement.scrollWidth <= innerWidth,
      };
    });
    ok(m.existe, R + 'a barra inferior de navegação rápida existe na tela "inicio"');
    if (m.existe) {
      ok(m.larguraJanela === 390, R + 'a janela mede 390 px (' + m.larguraJanela + ')');
      ok(m.fixaNoRodape, R + 'a barra é fixa e encostada no rodapé da janela');
      ok(m.dentroDaJanela, R + 'a barra cabe na largura da janela');
      ok(m.temInicioEMenu, R + 'a barra tem os botões Início e Abrir menu completo');
      ok(m.botoes.length >= 4, R + 'a barra tem pelo menos 4 botões (' + m.botoes.length + ')');
      const miudos = m.botoes.filter(c => c.w < 44 || c.h < 44);
      ok(miudos.length === 0, R + 'cada botão da barra mede ≥ 44 × 44 px' + (miudos.length
        ? ' (miúdos: ' + miudos.map(c => c.rot + ' ' + Math.round(c.w) + '×' + Math.round(c.h)).join(', ') + ')'
        : ' (' + m.botoes.map(c => Math.round(c.w) + '×' + Math.round(c.h)).join(', ') + ')'));
      ok(m.semRolagemLateral, R + 'a tela "inicio" não rola de lado');
    }
  } finally { await ctx.close(); }
}
