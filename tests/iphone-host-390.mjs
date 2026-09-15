/* IPHONE — O HOST (Catedra.dc.html) A 390 × 844, NO TOQUE (F0 e F4 do plano do iPhone, 11/09/2026)

   O app virou universal (UIDeviceFamily 1 e 2) e no iPhone a WKWebView abre o mesmo
   Catedra.dc.html que o iPad, só que com 390 pt de largura — o layout de "celular" que a
   web já tinha desde os 900 px.

   A F0 deixou aqui o primeiro caso, que MEDE a barra inferior. A F4 acrescenta os seus, e
   todos medem caixa, estilo computado ou classe — presença no DOM não prova que pinta:

   · (a) nenhuma das seis telas rola de lado, e nada passa da borda direita SEM um pai que o
         corte de propósito (sem esse filtro a medida acusaria os círculos decorativos dos
         heros em nove telas e todo texto com ellipsis — falso vermelho que a auditoria previu);
   · (b) a barra inferior tem cinco alvos de 44 × 44 medidos (o caso da F0);
   · (c) a tabela "Painel por disciplina" do Início cabe no cartão — era o único ponto que
         fazia o .ct-scroll do Início rolar de lado (22 px medidos na auditoria);
   · (d) com o teclado aberto a barra inferior sai e a reserva de 84 px cai, senão o campo e o
         botão Salvar do modal de registro ficam atrás do teclado. O teclado é FINGIDO
         encolhendo o visualViewport e chamando o tratador: nem o Playwright nem o WebKit de
         teste levantam teclado de verdade, e o que interessa é o efeito, não o gesto;
   · (e) o meta viewport traz viewport-fit=cover — sem ele env(safe-area-inset-bottom) vale 0
         e a barra cai sobre o indicador de Início, que é o primeiro furo a aparecer no aparelho;
   · (g) a faixa do Início aguenta conteúdo comprido: com a ficha do simulado, uma palavra sem
         espaço e o subtítulo esticado, nada dela passa da janela — era o corte que aparecia no
         iPhone da dona ("Sexta-feira, 11 de setembro · Ta…") e que a conta de teste não produz;
   · (f) a 1024 e a 1280 px NADA disso se aplica: a topbar mantém as duas faixas com subtítulo,
         a tabela volta a table-layout:auto com as seis colunas e o Histórico continua tabela.
         É o caso que protege o desktop de um conserto de celular.

   Contexto PRÓPRIO por largura, com isMobile + hasTouch, fechado no finally; semente pela
   /__semente (404 na mesma origem) ANTES de abrir o app, para não correr contra o autosave
   de 500 ms. Rótulos "IPHONE/host 390 …". */

export async function testarIphoneHost390(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const origem = opcoes.origem || (String(base).startsWith('file:') ? 'file' : 'http');
  const arquivo = opcoes.arquivo || 'Catedra.dc.html';
  const R = 'IPHONE/host 390 [' + motor + '] [' + origem + '] ';
  const browser = pageDaSuite.context().browser();

  /* Uma sessão por disciplina e um edital pequeno: sem dado o Histórico e o Painel do Início
     nem chegam a renderizar, e os casos (a) e (c) passariam medindo uma tela vazia. */
  const ymd = t => { const d = new Date(t), p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
  const DISCS = ['Direito Civil', 'Direito Penal', 'Direito Constitucional', 'Direito Processual Civil'];
  const SESSOES = Array.from({ length: 12 }, (_, i) => {
    const ts = Date.now() - i * 86400000;
    return { id: 's' + i, ts, date: ymd(ts), disc: DISCS[i % DISCS.length],
      topico: 'Prescrição e decadência nos contratos de prestação de serviços',
      categoria: 'Teoria', categorias: ['Teoria'], min: 45, questoes: 20, acertos: 14,
      erradas: 6, brancos: 0, liquido: 8, foco: 4, nota: '', discPct: null,
      materialId: null, countMeta: true };
  });

  async function abrir(viewport) {
    const ctx = await browser.newContext({ viewport, isMobile: viewport.width < 900,
      hasTouch: viewport.width < 900, deviceScaleFactor: viewport.width < 900 ? 3 : 1 });
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', e => erros.push(String(e && e.message || e)));
    await page.goto(base + '/__semente');
    await page.evaluate((ses) => {
      localStorage.clear();
      const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
      set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
      set('aceite', { termos: 1, privacidade: 1, ts: Date.now() });
      set('edital', [{ disc: 'Direito Civil', peso: 2, questoes: 15, color: '#2563eb',
        topics: [{ name: 'Obrigações', done: false, subs: [] }] }]);
      set('sessions', ses); set('reviews', []); set('errors', []);
    }, SESSOES);
    await page.goto(base + '/' + arquivo);
    await page.waitForFunction(() => !!window.__catedraApp, null, { timeout: 25000 });
    await page.waitForTimeout(1800);
    return { ctx, page, erros };
  }
  const ir = (page, v) => page.evaluate(v => { window.__catedraApp._irPara(v); }, v);

  /* ---------- (b) a barra inferior: o caso que a F0 deixou ---------- */
  {
    const { ctx, page } = await abrir({ width: 390, height: 844 });
    try {
      await ir(page, 'inicio'); await page.waitForTimeout(700);
      const m = await page.evaluate(() => {
        const nav = document.querySelector('nav[aria-label="Navegação rápida"]');
        if (!nav) return { existe: false };
        const cs = getComputedStyle(nav), nb = nav.getBoundingClientRect();
        const caixas = [...nav.querySelectorAll('button')].map(b => {
          const r = b.getBoundingClientRect();
          return { rot: b.getAttribute('aria-label') || '', w: r.width, h: r.height };
        });
        return { existe: true, larguraJanela: innerWidth,
          fixaNoRodape: cs.position === 'fixed' && Math.abs(nb.bottom - innerHeight) <= 1,
          dentroDaJanela: nb.left >= -0.5 && nb.right <= innerWidth + 0.5,
          botoes: caixas,
          temInicioEMenu: caixas.some(c => c.rot === 'Início') && caixas.some(c => /menu/i.test(c.rot)),
          semRolagemLateral: document.documentElement.scrollWidth <= innerWidth };
      });
      ok(m.existe, R + '(b) a barra inferior de navegação rápida existe na tela "inicio"');
      if (m.existe) {
        ok(m.larguraJanela === 390, R + '(b) a janela mede 390 px (' + m.larguraJanela + ')');
        ok(m.fixaNoRodape, R + '(b) a barra é fixa e encostada no rodapé da janela');
        ok(m.dentroDaJanela, R + '(b) a barra cabe na largura da janela');
        ok(m.temInicioEMenu, R + '(b) a barra tem os botões Início e Abrir menu completo');
        ok(m.botoes.length >= 4, R + '(b) a barra tem pelo menos 4 botões (' + m.botoes.length + ')');
        const miudos = m.botoes.filter(c => c.w < 44 || c.h < 44);
        ok(miudos.length === 0, R + '(b) cada botão da barra mede ≥ 44 × 44 px' + (miudos.length
          ? ' (miúdos: ' + miudos.map(c => c.rot + ' ' + Math.round(c.w) + '×' + Math.round(c.h)).join(', ') + ')'
          : ' (' + m.botoes.map(c => Math.round(c.w) + '×' + Math.round(c.h)).join(', ') + ')'));
        ok(m.semRolagemLateral, R + '(b) a tela "inicio" não rola de lado');
      }
    } finally { await ctx.close(); }
  }

  /* ---------- (a) seis telas · (c) a tabela do Início · (e) o meta viewport ---------- */
  {
    const { ctx, page, erros } = await abrir({ width: 390, height: 844 });
    try {
      const viewport = await page.evaluate(() => {
        const m = document.querySelector('meta[name="viewport"]');
        return m ? m.getAttribute('content') : '';
      });
      ok(/viewport-fit\s*=\s*cover/.test(viewport), R + '(e) o meta viewport traz viewport-fit=cover (' + viewport + ')');

      const TELAS = ['inicio', 'historico', 'redacao', 'analise', 'ajustes', 'calendario'];
      for (const v of TELAS) {
        await ir(page, v); await page.waitForTimeout(1400);
        const m = await page.evaluate(() => {
          /* "passa da borda" só conta quando NADA corta o elemento no caminho até a raiz: um pai
             com overflow-x diferente de visible, ou com text-overflow:ellipsis, é corte de
             propósito. Sem este filtro a medida acusa os círculos decorativos dos heros e todo
             texto truncado — a auditoria mediu 9 telas de falso vermelho por causa disso. */
          const contido = el => {
            for (let p = el.parentElement; p; p = p.parentElement) {
              const cs = getComputedStyle(p);
              if (cs.overflowX !== 'visible' || cs.textOverflow === 'ellipsis') return true;
            }
            return false;
          };
          const fora = [...document.querySelectorAll('main *')].filter(el => {
            const cs = getComputedStyle(el);
            if (cs.pointerEvents === 'none' || cs.position === 'absolute') return false;
            const b = el.getBoundingClientRect();
            if (!(b.width > 0 && b.right > innerWidth + 1)) return false;
            return !contido(el);
          });
          const sc = document.querySelector('main .ct-scroll');
          const tb = document.querySelector('.ct-topbar');
          return {
            docRola: document.documentElement.scrollWidth - innerWidth,
            scRola: sc ? sc.scrollWidth - sc.clientWidth : 0,
            topbar: tb ? tb.getBoundingClientRect().height : 0,
            fora: fora.slice(0, 3).map(el => el.tagName + '.' + String(el.className).slice(0, 18)
              + ' r=' + Math.round(el.getBoundingClientRect().right)),
          };
        });
        ok(m.docRola <= 0, R + '(a) ' + v + ': o documento não rola de lado (' + m.docRola + ' px)');
        ok(m.scRola <= 0, R + '(a) ' + v + ': o contêiner de rolagem não rola de lado (' + m.scRola + ' px)');
        ok(m.fora.length === 0, R + '(a) ' + v + ': nada passa da borda direita sem ser cortado de propósito'
          + (m.fora.length ? ' (' + m.fora.join(' | ') + ')' : ''));
        /* O aceite numérico do plano: UMA faixa de no máximo 64 pt. Antes eram duas de 44 —
           123 px que, com a barra inferior, comiam 22% da tela (28% num iPhone SE). */
        ok(m.topbar > 0 && m.topbar <= 64, R + '(a) ' + v + ': a topbar é uma faixa de ≤ 64 px ('
          + Math.round(m.topbar) + ')');
      }

      await ir(page, 'inicio'); await page.waitForTimeout(1400);
      const t = await page.evaluate(() => {
        const tb = document.querySelector('.cth-tbl');
        if (!tb) return { achou: false };
        const cartao = tb.closest('.cth-card');
        return { achou: true, layout: getComputedStyle(tb).tableLayout,
          largura: tb.getBoundingClientRect().width,
          cartaoLargura: cartao ? cartao.getBoundingClientRect().width : 0,
          colunas: [...tb.querySelectorAll('thead th')].filter(e => e.offsetParent).length };
      });
      ok(t.achou, R + '(c) o "Painel por disciplina" do Início está na tela');
      if (t.achou) {
        ok(t.largura <= t.cartaoLargura + 0.5, R + '(c) a tabela cabe no cartão ('
          + Math.round(t.largura) + ' ≤ ' + Math.round(t.cartaoLargura) + ')');
        ok(t.layout === 'fixed', R + '(c) a 390 px a tabela usa table-layout:fixed (' + t.layout + ')');
        ok(t.colunas === 3, R + '(c) restam as três colunas que se lê — Matéria, Tempo e Líquido ('
          + t.colunas + ')');
      }
      ok(!erros.length, R + '(a) sem erro de página ('
        + erros.slice(0, 2).join(' | ').slice(0, 160) + ')');
    } finally { await ctx.close(); }
  }

  /* ---------- (d) o teclado não pode esconder o campo ---------- */
  {
    const { ctx, page } = await abrir({ width: 390, height: 844 });
    try {
      const m = await page.evaluate(async () => {
        const w = ms => new Promise(res => setTimeout(res, ms));
        const a = window.__catedraApp;
        const bar = () => document.querySelector('nav[aria-label="Navegação rápida"]');
        const sc = () => document.querySelector('main .ct-scroll');
        const r = {};
        r.temTratador = typeof a._ajustarTeclado === 'function';
        if (!r.temTratador) return r;
        a.setState({ sessionModalOpen: true }); await w(900);
        const campos = [...document.querySelectorAll('input, select, textarea')]
          .filter(e => e.offsetParent && e.getBoundingClientRect().height > 0);
        r.modalAbriu = campos.length > 0;
        r.barraAntes = !!bar() && getComputedStyle(bar()).display !== 'none';
        r.reservaAntes = sc() ? parseFloat(getComputedStyle(sc()).paddingBottom) : 0;
        /* O teclado do iPhone encolhe o visualViewport e NÃO mexe em innerHeight. Nem o
           Playwright nem o WebKit de teste levantam teclado, então o encolhimento é fingido
           aqui e o tratador é chamado na mão — o que se mede é o efeito. */
        Object.defineProperty(window.visualViewport, 'height',
          { value: window.innerHeight - 320, configurable: true });
        a._ajustarTeclado(); await w(300);
        r.classe = document.documentElement.classList.contains('ct-teclado');
        r.barraDepois = !!bar() && getComputedStyle(bar()).display !== 'none';
        r.reservaDepois = sc() ? parseFloat(getComputedStyle(sc()).paddingBottom) : 0;
        Object.defineProperty(window.visualViewport, 'height',
          { value: window.innerHeight, configurable: true });
        a._ajustarTeclado(); await w(300);
        r.classeFim = document.documentElement.classList.contains('ct-teclado');
        r.barraFim = !!bar() && getComputedStyle(bar()).display !== 'none';
        r.reservaFim = sc() ? parseFloat(getComputedStyle(sc()).paddingBottom) : 0;
        a.setState({ sessionModalOpen: false });
        return r;
      });
      ok(m.temTratador, R + '(d) o host expõe _ajustarTeclado');
      if (m.temTratador) {
        ok(m.modalAbriu, R + '(d) o modal de registro abriu com campos na tela');
        ok(m.barraAntes && m.reservaAntes >= 80, R + '(d) antes: a barra está na tela e o .ct-scroll reserva '
          + Math.round(m.reservaAntes) + ' px para ela');
        ok(m.classe, R + '(d) com o visualViewport encolhido, o <html> ganha a classe ct-teclado');
        ok(!m.barraDepois, R + '(d) …a barra inferior sai da frente do teclado');
        ok(m.reservaDepois < 40, R + '(d) …e a reserva de 84 px cai para ' + Math.round(m.reservaDepois)
          + ' px, para o modal rolar inteiro');
        ok(!m.classeFim && m.barraFim && m.reservaFim >= 80, R + '(d) teclado fechado: classe cai, barra volta'
          + ' e a reserva volta a ' + Math.round(m.reservaFim) + ' px');
      }
    } finally { await ctx.close(); }
  }

  /* ---------- (f) o desktop não muda ---------- */
  for (const largura of [1024, 1280]) {
    const { ctx, page } = await abrir({ width: largura, height: 900 });
    try {
      await ir(page, 'historico'); await page.waitForTimeout(1400);
      const m = await page.evaluate(() => {
        const tb = document.querySelector('.ct-topbar');
        const sub = document.querySelector('.ct-tb-titulo p');
        const lin = document.querySelector('.ct-hist-linha');
        const tab = document.querySelector('.ct-hist-tab');
        return {
          topbar: tb ? tb.getBoundingClientRect().height : 0,
          subtitulo: sub ? getComputedStyle(sub).display : 'sem',
          histDisplay: lin ? getComputedStyle(lin).display : 'sem',
          histMinWidth: tab ? getComputedStyle(tab).minWidth : 'sem',
          docRola: document.documentElement.scrollWidth - innerWidth,
        };
      });
      await ir(page, 'inicio'); await page.waitForTimeout(1400);
      const t = await page.evaluate(() => {
        const tb = document.querySelector('.cth-tbl');
        return tb ? { layout: getComputedStyle(tb).tableLayout,
          colunas: [...tb.querySelectorAll('thead th')].filter(e => e.offsetParent).length } : null;
      });
      ok(m.subtitulo === 'block', R + '(f) ' + largura + ': o subtítulo da topbar continua visível ('
        + m.subtitulo + ')');
      ok(m.topbar > 64, R + '(f) ' + largura + ': a topbar mantém a altura de hoje ('
        + Math.round(m.topbar) + ' px, e não a faixa de ≤64 do celular)');
      ok(m.histDisplay === 'grid', R + '(f) ' + largura + ': o Histórico continua tabela, não cartão ('
        + m.histDisplay + ')');
      ok(m.histMinWidth === '560px', R + '(f) ' + largura + ': a tabela do Histórico mantém min-width:560px ('
        + m.histMinWidth + ')');
      ok(!!t && t.layout === 'auto', R + '(f) ' + largura
        + ': o Painel do Início volta a table-layout:auto (' + (t ? t.layout : 'sem tabela') + ')');
      ok(!!t && t.colunas === 6, R + '(f) ' + largura + ': …com as seis colunas de sempre ('
        + (t ? t.colunas : 0) + ')');
      ok(m.docRola <= 0, R + '(f) ' + largura + ': o documento não rola de lado (' + m.docRola + ' px)');
    } finally { await ctx.close(); }
  }

  /* ---------- (g) a faixa do Início aguenta conteúdo comprido ---------- */
  {
    const { ctx, page } = await abrir({ width: 390, height: 844 });
    try {
      await ir(page, 'inicio'); await page.waitForTimeout(1400);
      const m = await page.evaluate(() => {
        /* O defeito visto no iPhone da dona: a ficha comprida do simulado e a linha do
           cronômetro esticavam o bloco além da tela, e a faixa (overflow:hidden) comia o fim
           do subtítulo e das fichas. Aqui o conteúdo comprido é POSTO À MÃO — a conta de
           teste não tem simulado nem data de prova — e a medida exige que nada saia. */
        const chips = document.querySelector('.cth-chips'), sub = document.querySelector('.cth-sub');
        if (!chips || !sub) return { faltou: true };
        const ficha = document.createElement('span');
        ficha.className = 'cth-chip';
        ficha.textContent = 'Nenhum simulado ainda — fazer o primeiro agora mesmo';
        chips.appendChild(ficha);
        const palavra = document.createElement('span');
        palavra.className = 'cth-chip';
        palavra.textContent = 'Lei' + 'X'.repeat(60);   // palavra sem espaço: URL, número de lei
        chips.appendChild(palavra);
        sub.textContent += ' · Tabela Dia 12 · Roteiro ' + 'Y'.repeat(50);
        const grid = document.querySelector('.cth-hero-grid');
        const fora = [...document.querySelectorAll('.cth-hero-grid, .cth-hero-grid *')]
          .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); })
          .map(e => e.tagName.toLowerCase() + '.' + [...e.classList].slice(0, 2).join('.'));
        return { faltou: false, fora, alturaFicha: Math.round(ficha.getBoundingClientRect().height),
          gridLargura: grid ? Math.round(grid.getBoundingClientRect().width) : 0,
          docRola: document.documentElement.scrollWidth - innerWidth };
      });
      ok(!m.faltou, R + '(g) a faixa do Início tem subtítulo e fichas para medir');
      if (!m.faltou) {
        ok(m.fora.length === 0, R + '(g) com ficha comprida, palavra sem espaço e subtítulo esticado, '
          + 'nada da faixa passa da janela' + (m.fora.length ? ' (fora: ' + m.fora.slice(0, 5).join(', ') + ')' : ''));
        ok(m.gridLargura <= 390, R + '(g) a grade da faixa cabe na tela (' + m.gridLargura + ' px)');
        ok(m.alturaFicha > 40, R + '(g) a ficha comprida QUEBRA em mais de uma linha em vez de ser cortada ('
          + m.alturaFicha + ' px de altura)');
        ok(m.docRola <= 0, R + '(g) a tela "inicio" não passa a rolar de lado (' + m.docRola + ' px)');
      }
    } finally { await ctx.close(); }
  }
}
