/* O <select> DO HOST RECEBE A FOLHA DA PÁGINA — TAMBÉM NO WEBKIT (18/09/2026)

   No WebKit (Safari e o WKWebView do Mac e do iPad) um <select> com borda ou fundo estilizados
   vira `menulist-button`, e o tema nativo do motor reescreve a folha. Medido no select.ct-campo do
   host, contexto 1024×768 com ponteiro grosso e a regra de 44 px casando: padding 0 (pedido
   10px 12px), raio 5px (pedido 11px), min-height 18px (pedido 44px) — 20 px de altura. Com mouse,
   no app do Mac, os mesmos 20 (pedido 38). O Chromium respeita a folha e dava 44, por isso só a
   suíte WebKit acusaria. O conserto (catedra-ui.css, "O SELECT DESENHADO PELA CASA") desliga o
   tema com appearance:none e redesenha a seta, como o select.sel dos satélites.

   O que se prova aqui, em cada motor:
   · (a) no TOQUE, em largura de iPad, cada select visível do host — Disciplina, Tópico,
         Subtópico, Qual lei e Qual fonte do Registrar sessão, e os do Ciclo, Edital, Redação,
         Simulados, Calendário, Ajustes, Histórico e Reta final — recebe a folha da página: a
         régua é um <div> com a MESMA classe e o MESMO style posto ao lado (div não tem tema
         nativo, então o computado dele é exatamente o que a página pediu), e padding, raio e
         min-height do select têm de bater com ela. Sem a classe .ct-campo a régua não casa com
         `main select`, e aí o pedido de min-height é o da regra: 44px. E mais: padding-right de
         34 px (é onde a seta mora — 15 destes selects trazem `padding:` inline), as duas camadas
         da seta no fundo (8 trazem `background:` inline, e o atalho zeraria a imagem) e altura
         ≥ 44 px;
   · (b) com MOUSE (o app do Mac), a mesma régua — ali o tema do WebKit dava 20 px no lugar de 38;
   · (c) a seta que substitui a nativa PINTA, com ≥ 3:1 contra o fundo do select, nas 16 paletas
         do host (8 direções do THEMES(), claro e escuro), trocadas pelo próprio estado do app
         (dir/darkMode): captura da região do chevron, pixel a pixel. Num select de classe (o
         Disciplina do modal) e num de estilo inline (o filtro do Histórico);
   · (d) em cores forçadas o gradiente é apagado pelo navegador, então a aparência nativa volta.
         Só onde o motor emula `forced-colors` (o Chromium, onde é obrigatório emular).

   Rótulos "SELECT/host …". */

const EDITAL = [
  { disc: 'Direito Civil', peso: 2, questoes: 15, color: '#2563eb', open: true,
    topics: [{ name: 'Obrigações', done: false, subs: ['Pagamento', 'Inadimplemento'] }, { name: 'Contratos', done: false, subs: [] }] },
  { disc: 'Direito Penal', peso: 2, questoes: 15, color: '#c0392f', open: true,
    topics: [{ name: 'Teoria do crime', done: false, subs: [] }] },
];

/* As telas que têm select, e o que precisa acontecer para ele aparecer. */
const TELAS = [
  ['ciclo', { cycleMode: 'manual' }],
  ['edital', {}],
  ['redacao', {}],
  ['simulados', {}],
  ['calendario', {}],
  ['ajustes', { ajSec: 'ritmo' }],
  ['historico', {}],
  ['reta-final', {}],
];

/* Os que o pedido nomeou e alguns de estilo inline: se algum não for medido, o caso não prova
   o que diz (uma varredura que não acha nada passaria de graça). */
const OBRIGATORIOS = ['Disciplina', 'Tópico', 'Subtópico', 'Qual lei', 'Qual fonte',
  'Disciplina do bloco', 'Filtrar por disciplina do edital', 'Carreira', 'Forma de análise',
  'Tipo do evento', 'aj-f-cobranca', 'Filtrar o histórico', 'Ativar reta final com'];

export async function testarSelectHost(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const origem = opcoes.origem || (String(base).startsWith('file:') ? 'file' : 'http');
  const R = 'SELECT/host [' + motor + '] [' + origem + '] ';
  const browser = pageDaSuite.context().browser();
  const w = ms => new Promise(r => setTimeout(r, ms));

  /* `isMobile` é o que faz o motor declarar `pointer: coarse` (e o host acender data-toque).
     A escala 2 é a do iPad: a seta de 1,5 px vira traço de 3 pixels na captura. */
  async function comContexto(largura, altura, toque, corpo) {
    const ctx = await browser.newContext({ viewport: { width: largura, height: altura },
      isMobile: toque, hasTouch: toque, deviceScaleFactor: toque ? 2 : 1 });
    try { await corpo(ctx); } finally { await ctx.close(); }
  }
  /* Semeia a partir de /__semente (404 na mesma origem): com o app vivo, semear é corrida com
     o autosave de 500 ms. */
  async function abrirApp(ctx) {
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', e => erros.push(String(e && e.message || e)));
    await page.goto(base + '/__semente');
    await page.evaluate((ed) => {
      localStorage.clear();
      const s = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
      s('auth', '1'); s('onboarded', '1'); s('areaEstudo', 'juridica');
      s('aceite', { termos: 1, privacidade: 1, ts: Date.now() });
      s('edital', ed); s('sessions', []); s('reviews', []); s('errors', []);
    }, EDITAL);
    await page.goto(base + '/Catedra.dc.html');
    await page.waitForFunction(() => !!window.__catedraApp && !!document.querySelector('#ct-main'), null, { timeout: 20000 });
    await w(1500);
    return { page, erros };
  }

  /* O Registrar sessão com os cinco selects do pedido à vista: Mais detalhes aberto, uma
     disciplina com tópico de subtópicos, e os tipos Lei seca e Jurisprudência ligados. */
  const abrirRegistro = (page) => page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const a = window.__catedraApp;
    a._irPara('inicio'); await w(600);
    [...document.querySelectorAll('button')].find(b => /registrar sess/i.test(b.textContent || '')).click(); await w(900);
    const dlg = document.querySelector('[role="dialog"][aria-label="Registrar sessão"]');
    if (!dlg) return false;
    const mais = [...dlg.querySelectorAll('button')].find(b => /Mais detalhes/.test(b.textContent || ''));
    if (mais && mais.getAttribute('aria-expanded') !== 'true') { mais.click(); await w(400); }
    const troca = async (l, v) => { const s = dlg.querySelector('select[aria-label="' + l + '"]'); if (!s) return;
      s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); await w(400); };
    await troca('Disciplina', 'Direito Civil');
    await troca('Tópico', 'Obrigações');
    for (const v of ['Lei seca', 'Jurisprudência']) {
      const c = [...dlg.querySelectorAll('.ct-reg-chip')].find(x => x.getAttribute('aria-label') === v);
      if (c && c.getAttribute('aria-pressed') !== 'true') { c.click(); await w(400); }
    }
    return true;
  });
  const fecharRegistro = (page) => page.evaluate(async () => {
    window.__catedraApp.closeSession(); await new Promise(r => setTimeout(r, 500));
    return !document.querySelector('[role="dialog"][aria-label="Registrar sessão"]');
  });
  const irPara = (page, tela, estado) => page.evaluate(async ({ tela, estado }) => {
    const a = window.__catedraApp;
    if (Object.keys(estado).length) a.setState(estado);
    a._irPara(tela); await new Promise(r => setTimeout(r, 1300));
  }, { tela, estado });

  /* A régua: o que o motor fez com cada select × o que a página pediu. */
  const medirTela = (page, tela, toque) => page.evaluate(({ tela, toque }) => {
    const vis = el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    const num = v => parseFloat(v) || 0;   // 'auto' e '0px' são o mesmo "nada pedido"
    return [...document.querySelectorAll('#ct-main select, select.ct-campo')].filter(vis).map(el => {
      const regua = document.createElement('div');
      regua.className = el.className;
      if (el.getAttribute('style')) regua.setAttribute('style', el.getAttribute('style'));
      regua.textContent = 'x';
      el.parentElement.insertBefore(regua, el.nextSibling);
      const a = getComputedStyle(el), b = getComputedStyle(regua);
      const dif = [];
      for (const p of ['padding-top', 'padding-bottom', 'padding-left', 'border-top-left-radius', 'border-bottom-right-radius']) {
        if (a.getPropertyValue(p) !== b.getPropertyValue(p)) dif.push(p + ' ' + a.getPropertyValue(p) + ' (pedido ' + b.getPropertyValue(p) + ')');
      }
      /* Com .ct-campo a régua casa com as mesmas regras de altura (main .ct-campo, .ct-ag-campo
         .ct-campo); sem a classe, quem pede é `main select` — 44px no toque, nada com mouse. */
      const pedidoMh = (!el.classList.contains('ct-campo') && toque) ? '44px' : b.minHeight;
      if (num(a.minHeight) !== num(pedidoMh)) dif.push('min-height ' + a.minHeight + ' (pedido ' + pedidoMh + ')');
      if (a.paddingRight !== '34px') dif.push('padding-right ' + a.paddingRight + ' (a seta mora em 34px)');
      const ap = a.appearance || a.webkitAppearance;
      if (ap !== 'none') dif.push('appearance ' + ap);
      if ((a.backgroundImage.match(/linear-gradient/g) || []).length !== 2) dif.push('fundo sem as duas camadas da seta (' + a.backgroundImage.slice(0, 24) + ')');
      const alt = Math.round(el.getBoundingClientRect().height * 10) / 10;
      if (toque && alt < 44) dif.push('altura ' + alt + ' px');
      regua.remove();
      return { tela, nome: el.getAttribute('aria-label') || el.id || el.dataset.field || '?', alt, dif };
    });
  }, { tela, toque });

  async function varrer(page, toque) {
    const medidos = [];
    const abriu = await abrirRegistro(page);
    ok(abriu, R + (toque ? 'NO TOQUE' : 'COM MOUSE') + ': o Registrar sessão abriu');
    medidos.push(...await medirTela(page, 'registro', toque));
    ok(await fecharRegistro(page), R + (toque ? 'NO TOQUE' : 'COM MOUSE') + ': o Registrar sessão fechou (senão ele mediria por cima das outras telas)');
    for (const [tela, estado] of TELAS) {
      await irPara(page, tela, estado);
      medidos.push(...await medirTela(page, tela, toque));
    }
    return medidos;
  }

  const relatar = (medidos, caso, rotulo) => {
    const nomes = new Set(medidos.map(m => m.nome));
    const faltam = OBRIGATORIOS.filter(n => !nomes.has(n));
    ok(!faltam.length, R + caso + ' ' + rotulo + ': medi ' + medidos.length + ' selects em ' + new Set(medidos.map(m => m.tela)).size
      + ' telas, entre eles os que o pedido nomeou' + (faltam.length ? ' (faltaram: ' + faltam.join(', ') + ')' : ''));
    const ruins = medidos.filter(m => m.dif.length);
    ok(medidos.length && !ruins.length, R + caso + ' ' + rotulo + ': cada select recebe a folha da página, sem o tema nativo do motor por cima'
      + ' (alturas ' + Math.min(...medidos.map(m => m.alt)) + '–' + Math.max(...medidos.map(m => m.alt)) + ' px)'
      + (ruins.length ? ' — ' + ruins.length + ' não: ' + ruins.slice(0, 4).map(m => m.tela + '/' + m.nome + ': ' + m.dif.join('; ')).join(' | ') : ''));
  };

  /* ---------- (a) no toque, em largura de iPad ---------- */
  /* ---------- (c) a seta pinta nas 16 paletas (mesmo contexto: abrir o app custa caro) ---------- */
  await comContexto(1024, 768, true, async (ctx) => {
    const { page, erros } = await abrirApp(ctx);
    const pont = await page.evaluate(() => ({ coarse: matchMedia('(pointer: coarse)').matches,
      toque: !!document.querySelector('[data-toque="1"]'), largura: innerWidth }));
    ok(pont.coarse && pont.toque && pont.largura >= 1000, R + '(a) o contexto é de ponteiro GROSSO em largura de iPad ('
      + pont.largura + ' px, coarse ' + pont.coarse + ', data-toque ' + pont.toque + ') — sem isto o caso passaria por vacuidade');
    relatar(await varrer(page, true), '(a)', 'NO TOQUE');

    const lab = await ctx.newPage();
    /* Captura da região da seta (22×12 px CSS à direita, longe da borda e do texto, que termina
       34 px antes da borda) e contagem, numa página em branco, dos pixels que contrastam ≥ 3:1
       com o fundo do select. A 2× a seta tem dezenas deles; sem seta, zero. */
    const medirSeta = async (seletor) => {
      const info = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        return { x: r.right - 30, y: r.top + r.height / 2 - 6, fundo: getComputedStyle(el).backgroundColor };
      }, seletor);
      if (!info) return { fortes: 0, max: 0, achou: false };
      let png = null;
      for (let t = 0; t < 2 && !png; t++) {
        try { png = await page.screenshot({ clip: { x: info.x, y: info.y, width: 22, height: 12 }, timeout: 15000 }); }
        catch (_) { await w(500); }
      }
      if (!png) return { fortes: 0, max: 0, achou: true, semCaptura: true };
      return lab.evaluate(async ({ b64, fundo }) => {
        const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        const [fr, fg, fb] = fundo.match(/[\d.]+/g).map(Number);
        const lin = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
        const L = (r, gg, b) => .2126 * lin(r) + .7152 * lin(gg) + .0722 * lin(b);
        const C = (x, y) => (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
        const lf = L(fr, fg, fb);
        let fortes = 0, max = 1;
        for (let i = 0; i < d.length; i += 4) {
          const k = C(L(d[i], d[i + 1], d[i + 2]), lf);
          if (k >= 3) fortes++;
          if (k > max) max = k;
        }
        return { fortes, max: Math.round(max * 100) / 100, achou: true };
      }, { b64: png.toString('base64'), fundo: info.fundo });
    };

    const paletas = await page.evaluate(() => {
      const T = window.__catedraApp.THEMES();
      return Object.keys(T).flatMap(k => [[k, false], [k, true]]);
    });
    ok(paletas.length >= 16, R + '(c) li as paletas do host no THEMES() (' + paletas.length + ' — 8 direções, claro e escuro)');
    const trocarPaleta = (dir, escuro) => page.evaluate(async ({ dir, escuro }) => {
      window.__catedraApp.setState({ dir, darkMode: escuro, accent: null });
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 100));
        const raiz = document.querySelector('[data-dir]');
        if (raiz && raiz.getAttribute('data-dir') === dir && raiz.getAttribute('data-dark') === (escuro ? '1' : '0')) {
          await new Promise(r => setTimeout(r, 250)); return true;
        }
      }
      return false;
    }, { dir, escuro });

    /* dois selects: um de classe (o do modal) e um de estilo inline com `background:` — é neste
       que o atalho zeraria a imagem se a regra não vencesse */
    const ALVOS = [
      ['Disciplina do Registrar sessão (select.ct-campo)', '[role="dialog"][aria-label="Registrar sessão"] select[aria-label="Disciplina"]',
        async () => { await abrirRegistro(page); }, async () => { await fecharRegistro(page); }],
      ['filtro do Histórico (estilo inline com background:)', '#ct-main select[aria-label="Filtrar o histórico"]',
        async () => { await irPara(page, 'historico', {}); }, async () => {}],
    ];
    for (const [nome, seletor, antes, depois] of ALVOS) {
      await antes();
      const fracas = [];
      let piorMax = 99, piorFortes = 1e9;
      for (const [dir, escuro] of paletas) {
        const nomeP = dir + (escuro ? ' escuro' : ' claro');
        if (!await trocarPaleta(dir, escuro)) { fracas.push(nomeP + ' (a paleta não chegou)'); continue; }
        const s = await medirSeta(seletor);
        if (!s.achou) { fracas.push(nomeP + ' (select sumiu)'); continue; }
        if (s.semCaptura) { fracas.push(nomeP + ' (captura falhou)'); continue; }
        piorMax = Math.min(piorMax, s.max); piorFortes = Math.min(piorFortes, s.fortes);
        if (!(s.fortes >= 12 && s.max >= 3)) fracas.push(nomeP + ' ' + s.max + ':1 (' + s.fortes + ' px)');
      }
      ok(paletas.length && !fracas.length, R + '(c) a seta do ' + nome + ' PINTA com ≥ 3:1 contra o fundo nas '
        + paletas.length + ' paletas (pior: ' + piorMax + ':1, ' + piorFortes + ' px fortes)'
        + (fracas.length ? ' — falha: ' + fracas.slice(0, 4).join(', ') : ''));
      await depois();
    }
    await trocarPaleta('sutil', false);
    await lab.close();
    ok(!erros.length, R + '(a) sem erro de página no toque (' + erros.slice(0, 1).join('').slice(0, 120) + ')');
    await page.close();
  });

  /* ---------- (b) com mouse: o app do Mac ---------- */
  /* ---------- (d) cores forçadas: o gradiente some por regra do navegador, a seta nativa volta ---------- */
  await comContexto(1280, 900, false, async (ctx) => {
    const { page, erros } = await abrirApp(ctx);
    const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
    ok(!coarse, R + '(b) a 1280 com mouse o ponteiro é FINO (coarse ' + coarse + ')');
    relatar(await varrer(page, false), '(b)', 'COM MOUSE');
    ok(!erros.length, R + '(b) sem erro de página com mouse (' + erros.slice(0, 1).join('').slice(0, 120) + ')');

    /* o modal põe cinco selects à vista (a tela onde a varredura parou tem um só) */
    await abrirRegistro(page);
    let emula = false;
    try { await page.emulateMedia({ forcedColors: 'active' }); emula = await page.evaluate(() => matchMedia('(forced-colors: active)').matches); }
    catch (_) { emula = false; }
    if (motor === 'chromium') ok(emula, R + '(d) o Chromium emula forced-colors — sem isto (d) não mediria nada');
    if (emula) {
      const m = await page.evaluate(() => [...document.querySelectorAll('#ct-main select, select.ct-campo')]
        .filter(el => el.getBoundingClientRect().height > 0).map(el => {
          const cs = getComputedStyle(el);
          return { nome: el.getAttribute('aria-label') || el.id || '?', ap: cs.appearance || cs.webkitAppearance, img: cs.backgroundImage };
        }));
      const ruins = m.filter(x => x.ap !== 'auto' || x.img !== 'none');
      ok(m.length >= 5 && !ruins.length, R + '(d) em cores forçadas os ' + m.length + ' selects voltam à aparência nativa, com a seta do sistema'
        + (ruins.length ? ' (não: ' + ruins.slice(0, 3).map(x => x.nome + ' ' + x.ap + ' ' + String(x.img).slice(0, 20)).join(', ') + ')' : ''));
      await page.emulateMedia({ forcedColors: 'none' });
    }
    await page.close();
  });
}
