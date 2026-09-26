/* FAIXA LATERAL DO JURIS E ALVOS DO MAPA PROCESSUAL (25/09/2026)

   Dois defeitos do mesmo passe de acabamento, cada um MEDIDO na página real:

   · (a) A FAIXA LATERAL DO CARTÃO DO JURIS. O cartão de verbete (.vcard) e o cartão de
         tribunal da Central de Contas (.tccard) desenhavam a cor do ramo/região num
         ::before de 4 px encostado na borda esquerda, da altura inteira do cartão — o
         carimbo que o DESIGN.md proíbe ("Faixa colorida de 3–4px na lateral de cartão").
         A varredura percorre o cartão e TODOS os descendentes, com ::before e ::after, e
         acusa: borda esquerda/direita ≥ 3 px com cor e mais grossa que a de cima; sombra
         inset com deslocamento lateral; e pseudo-elemento (ou filho posicionado) estreito
         (≤ 8 px), alto (≥ metade do cartão) e pintado. Presença no DOM não prova nada: o que
         se mede é o getComputedStyle e a caixa.
   · (b) A IDENTIDADE CONTINUA. Tirar a faixa sem pôr nada no lugar empalideceria a vitrine.
         O substituto é o do item colorido da casa (.ct-item): borda inteira tingida pela cor
         do ramo e lavagem curta da esquerda para a direita. Medido: a borda está mais perto da
         cor do ramo do que a borda neutra, a lavagem é da cor do ramo (a parada do gradiente,
         desfeito o alfa) e, composta sobre a superfície, se afasta dela o bastante para ser
         vista — nas 16 paletas do host (8 temas, claro e escuro), mandadas pelo mesmo ctTheme
         que o app usa. E o texto por cima da lavagem continua ≥ 4,5:1 no pior ponto.
   · (c) OS ALVOS DO MAPA PROCESSUAL. O painel da etapa e o da peça são anexados ao <body>,
         FORA do <main>, e por isso não recebiam o `main button` de toque do catedra-ui.css que
         já levava os controles do mapa a 44 px: os botões de referência (lei, julgado, peça)
         tinham 34 px de altura com o dedo. Com ponteiro grosso (isMobile + hasTouch, a
         1024×768 — o iPad) todo alvo do painel da etapa, do painel da peça e do mapa (barra,
         filtros, chip do artigo, da peça, de recolher e a estrela) mede ≥ 44 px, e a caixa de
         44 não é cortada pelo cartão de altura fixa: elementFromPoint perto das bordas de cima
         e de baixo, já com o zoom do palco, devolve o próprio botão. A estrela de 44×44 não
         cobre o texto do cartão: a caixa dela não cruza a do "À FRENTE" nem a do título.
         E o selo do número da etapa ("01") PINTA: o fundo era `currentColor`, que no selo é a
         própria cor do texto — número escuro em quadrado escuro. Agora ≥ 4,5:1.
   · (d) NO DESKTOP NADA MUDA. Com mouse a 1280, o min-height computado das referências
         continua 34 px, o dos chips 36, o do cartão 28, a estrela 26×26 e o topo e o título do
         cartão com o recuo de sempre — a regra é por ponteiro, não por largura, e não vazou.

   Capturas (opcional): opcoes.capturas = { dir, prefixo } grava o cartão do JURIS claro e
   escuro, a Central de Contas e o painel do mapa. Só em http. */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function testarFaixaMapaAlvos(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const R = 'FAIXA/ALVOS [' + motor + '] ';
  const browser = pageDaSuite.context().browser();
  const cap = opcoes.capturas || null;
  const w = ms => new Promise(r => setTimeout(r, ms));
  async function capturar(page, nome, clip) {
    if (!cap) return;
    try { fs.mkdirSync(cap.dir, { recursive: true });
      await page.screenshot({ path: path.join(cap.dir, (cap.prefixo ? cap.prefixo + '-' : '') + motor + '-' + nome + '.png'), clip });
    } catch (_) {}
  }

  /* As 16 paletas do host, lidas da fonte (o mesmo recorte de tests/ipad-toque-satelites.mjs). */
  const src = fs.readFileSync(path.join(RAIZ, 'Catedra.dc.html'), 'utf8');
  const ini = src.indexOf('THEMES(){ return {');
  const blocoTemas = ini >= 0 ? src.slice(ini, src.indexOf('};}', ini)) : '';
  const kv = (s) => Object.fromEntries([...s.matchAll(/(\w+):'([^']*)'/g)].map(x => [x[1], x[2]]));
  const paletas = [];
  for (const m of blocoTemas.matchAll(/(\w+):\{ label:'[^']*'[\s\S]*?\blight:\{([^}]*)\}[\s\S]*?\bdark:\{([^}]*)\}/g)) {
    for (const [modo, corpo] of [['claro', m[2]], ['escuro', m[3]]]) {
      const p = kv(corpo), tokens = {};
      for (const k of ['bg', 'surface', 'surface2', 'border', 'ink', 'text', 'text2', 'text3', 'accent']) if (p[k]) tokens['--' + k] = p[k];
      tokens.__dark = modo === 'escuro';
      paletas.push({ nome: m[1] + ' ' + modo, modo, tokens });
    }
  }
  ok(paletas.length >= 16 && paletas.every(p => p.tokens['--surface'] && p.tokens['--border']),
    R + '(b) li as paletas do host no THEMES() (' + paletas.length + ', cada uma com --surface e --border)');

  async function aplicarTema(page, p) {
    await page.evaluate((t) => window.dispatchEvent(new MessageEvent('message', {
      source: window.parent, origin: location.origin, data: { type: 'ctTheme', tokens: t } })), p.tokens);
    return page.waitForFunction((s) => document.documentElement.style.getPropertyValue('--surface') === s,
      p.tokens['--surface'], { timeout: 3000 }).then(() => true, () => false);
  }

  /* ================= (a) (b) JURIS: o cartão de verbete e o de tribunal ================= */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', e => erros.push(String(e && e.message || e)));
    try {
      await page.goto(base + '/__semente');
      await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
      await page.goto(base + '/juris-web.html');
      const pronto = await page.waitForFunction(() => document.querySelectorAll('#list .vcard').length >= 3, null, { timeout: 25000 }).then(() => true, () => false);
      ok(pronto, R + '(a) o JURIS desenhou os cartões do acervo');
      if (pronto) {
        await w(400);
        // avulsa (sem host): a cor com que a página nasceu
        const av = await page.evaluate(medirCartoes, '#list .vcard');
        ok(av.n >= 3 && !av.faixas.length, R + '(a) acervo avulso: nenhuma faixa lateral colorida nos ' + av.n + ' cartões de verbete'
          + (av.faixas.length ? ' (achei ' + av.faixas.length + ': ' + av.faixas.slice(0, 3).join(' · ') + ')' : ''));
        const tintaFalha = [], faixaFalha = [], textoFalha = [];
        for (const p of paletas) {
          if (!(await aplicarTema(page, p))) { tintaFalha.push(p.nome + ' (o ctTheme não chegou)'); continue; }
          await w(60);
          const m = await page.evaluate(medirCartoes, '#list .vcard');
          if (m.faixas.length) faixaFalha.push(p.nome + ': ' + m.faixas[0]);
          for (const c of m.cartoes) {
            if (!(c.bordaTinta && c.lavagemDaCor && c.lavagemVisivel >= 18))
              tintaFalha.push(p.nome + ' ' + c.rc + ' (borda ' + c.bordaTinta + ' [' + c.dBorda + ' vs neutra ' + c.dNeutra + '], lavagem da cor ' + c.lavagemDaCor + ', Δ superfície ' + c.lavagemVisivel + ')');
            if (c.contraste < 4.5) textoFalha.push(p.nome + ' ' + c.rc + ' .' + c.pior + ' ' + c.contraste + ':1');
          }
          if (cap && (p === paletas[0] || p === paletas[1])) {
            const clip = await page.evaluate(() => { const cs = [...document.querySelectorAll('#list .vcard')].slice(0, 3);
              const a = cs[0].getBoundingClientRect(), b = cs[cs.length - 1].getBoundingClientRect();
              return { x: Math.max(0, a.left - 12), y: Math.max(0, a.top - 12), width: a.width + 24, height: b.bottom - a.top + 24 }; });
            await capturar(page, 'juris-acervo-' + p.modo, clip);
          }
        }
        ok(!faixaFalha.length, R + '(a) acervo nas ' + paletas.length + ' paletas: nenhuma faixa lateral colorida'
          + (faixaFalha.length ? ' (' + faixaFalha.slice(0, 3).join(' · ') + ')' : ''));
        ok(!tintaFalha.length, R + '(b) acervo nas ' + paletas.length + ' paletas: a cor do ramo continua no cartão — borda tingida e lavagem que pinta (Δ ≥ 18 da superfície)'
          + (tintaFalha.length ? ' (falha: ' + tintaFalha.slice(0, 3).join(' · ') + ')' : ''));
        ok(!textoFalha.length, R + '(b) acervo nas ' + paletas.length + ' paletas: o texto do cartão (título, número, tema, pílula do ramo) ≥ 4,5:1 sobre a lavagem'
          + (textoFalha.length ? ' (falha: ' + textoFalha.slice(0, 3).join(' · ') + ')' : ''));

        // Central de Contas: o cartão de tribunal
        await aplicarTema(page, paletas[0]);
        await page.evaluate(() => { const t = document.querySelector('#tabs .tab[data-pane="tribunais"]'); if (t) t.click(); });
        const temTc = await page.waitForFunction(() => document.querySelectorAll('#tcList .tccard').length >= 3, null, { timeout: 8000 }).then(() => true, () => false);
        ok(temTc, R + '(a) a Central de Contas desenhou os cartões de tribunal');
        if (temTc) {
          const tcFaixa = [], tcTinta = [], tcTexto = [];
          for (const p of paletas) {
            if (!(await aplicarTema(page, p))) { tcTinta.push(p.nome + ' (o ctTheme não chegou)'); continue; }
            await w(60);
            const m = await page.evaluate(medirCartoes, '#tcList .tccard');
            if (m.faixas.length) tcFaixa.push(p.nome + ': ' + m.faixas[0]);
            for (const c of m.cartoes) {
              if (!(c.bordaTinta && c.lavagemDaCor && c.lavagemVisivel >= 18))
                tcTinta.push(p.nome + ' ' + c.rc + ' (borda ' + c.bordaTinta + ', lavagem da cor ' + c.lavagemDaCor + ', Δ ' + c.lavagemVisivel + ')');
              if (c.contraste < 4.5) tcTexto.push(p.nome + ' ' + c.rc + ' .' + c.pior + ' ' + c.contraste + ':1');
            }
            if (cap && (p === paletas[0] || p === paletas[1])) {
              const clip = await page.evaluate(() => { const g = document.querySelector('#tcList .tcgrid'); const b = g.getBoundingClientRect();
                return { x: Math.max(0, b.left - 12), y: Math.max(0, b.top - 12), width: b.width + 24, height: Math.min(b.height, 380) + 24 }; });
              await capturar(page, 'juris-tribunais-' + p.modo, clip);
            }
          }
          ok(!tcFaixa.length, R + '(a) Central de Contas nas ' + paletas.length + ' paletas: nenhuma faixa lateral colorida no cartão de tribunal'
            + (tcFaixa.length ? ' (' + tcFaixa.slice(0, 3).join(' · ') + ')' : ''));
          ok(!tcTinta.length, R + '(b) Central de Contas nas ' + paletas.length + ' paletas: a cor da região continua no cartão (borda tingida e lavagem que pinta)'
            + (tcTinta.length ? ' (falha: ' + tcTinta.slice(0, 3).join(' · ') + ')' : ''));
          ok(!tcTexto.length, R + '(b) Central de Contas nas ' + paletas.length + ' paletas: o texto do cartão (sigla, UF, nome, links, acervo) ≥ 4,5:1 sobre a lavagem'
            + (tcTexto.length ? ' (falha: ' + tcTexto.slice(0, 3).join(' · ') + ')' : ''));
        }
      }
      ok(!erros.length, R + '(a) o JURIS abriu sem erro de página' + (erros.length ? ' (' + erros[0].slice(0, 120) + ')' : ''));
    } finally { await ctx.close(); }
  }

  /* ================= (c) (d) o mapa processual: painel e cartões ================= */
  async function abrirMapa(toque) {
    const ctx = await browser.newContext(toque
      ? { viewport: { width: 1024, height: 768 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
      : { viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', e => erros.push(String(e && e.message || e)));
    await page.goto(base + '/__semente');
    await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto(base + '/ritos-web.html');
    await page.waitForFunction(() => !!document.getElementById('mMapa'), null, { timeout: 15000 });
    await w(500);
    // um nó com referência de lei ou julgado, para o painel ter os botões de referência
    const achou = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms)), d = document;
      d.getElementById('mMapa').click();
      for (let i = 0; i < 40 && !d.querySelector('#mapaHold [data-abrir]'); i++) await w(250);
      const ORDEM = window.eval('ORDEM');
      for (const r of ORDEM) {
        if (window.ctAbrirPonto) { window.ctAbrirPonto(r); await w(300); }
        if (!d.querySelector('#mapaHold .mp-rod button')) continue;
        for (const b of d.querySelectorAll('#mapaHold [data-abrir]')) { b.click(); await w(60);
          const p = d.querySelector('.mp-painel');
          if (p && p.querySelectorAll('.mp-refs button').length >= 1) return true; }
      }
      return false;
    });
    return { ctx, page, erros, achou };
  }

  /* O enquadrar deixa o rito inteiro a ~26 %, e a essa escala quase todo cartão fica sob a
     legenda, o minimapa ou fora da tela — elementFromPoint não teria o que conferir. Para medir
     o corte (e para a foto) o mundo é posto em escala 1 com um cartão de artigo + peça à vista. */
  async function mundoA100(page) {
    return page.evaluate(async () => {
      const d = document, arts = [...d.querySelectorAll('#mapaHold article.mp-no')];
      const art = arts.find(a => a.querySelector('.mp-pc') && a.querySelector('.mp-art')) || arts[0];
      const palco = d.querySelector('#mapaHold .mp-palco'); palco.scrollIntoView({ block: 'start' });
      const m = d.querySelector('#mapaHold .mp-mundo'), p = palco.getBoundingClientRect();
      m.style.transform = 'translate(' + (-parseFloat(art.style.left) + 300) + 'px,' + (-parseFloat(art.style.top) + 90) + 'px) scale(1)';
      await new Promise(r => setTimeout(r, 200));
      const b = art.getBoundingClientRect();
      return { x: Math.max(p.left, b.left - 290), y: Math.max(p.top, b.top - 80), width: Math.min(620, p.width), height: Math.min(360, p.height) };
    });
  }
  async function capturarCartoes(page, nome) { if (cap) await capturar(page, nome, await mundoA100(page)); }

  /* toque */
  {
    const { ctx, page, erros, achou } = await abrirMapa(true);
    try {
      const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
      ok(coarse, R + '(c) o contexto do mapa é de ponteiro GROSSO a 1024 (sem isto o resto passaria por vacuidade)');
      ok(achou, R + '(c) abri o painel de uma etapa com botões de referência');
      if (achou) {
        await w(300);
        const pn = await page.evaluate(medirAlvos, { raiz: '.mp-painel', sel: 'button, textarea' });
        const refs = pn.itens.filter(x => /mp-refs/.test(x.onde));
        ok(refs.length >= 1 && refs.every(x => x.h >= 44), R + '(c) painel da etapa: os ' + refs.length + ' botões de referência medem ≥ 44 px no toque ('
          + refs.map(x => x.h).join(', ') + ')');
        ok(pn.itens.length >= 6 && !pn.miudos.length, R + '(c) painel da etapa: nenhum dos ' + pn.itens.length + ' alvos abaixo de 44 px no toque'
          + (pn.miudos.length ? ' (' + pn.miudos.slice(0, 4).join(' · ') + ')' : ''));
        await capturar(page, 'mapa-painel-toque', await page.evaluate(() => { const b = document.querySelector('.mp-painel').getBoundingClientRect();
          return { x: b.left, y: b.top, width: b.width, height: b.height }; }));
        // o painel da PEÇA: a fundamentação é uma fileira de referências
        await page.evaluate(() => { const x = document.querySelector('.mp-painel [data-p=x]'); if (x) x.click(); });
        await w(250);
        const temPeca = await page.evaluate(async () => { const w = ms => new Promise(r => setTimeout(r, ms));
          for (const b of document.querySelectorAll('#mapaHold .mp-pc')) { b.click(); await w(120);
            const p = document.querySelector('.mp-painel'); if (p && p.querySelectorAll('.mp-refs button').length >= 2) return true;
            const x = document.querySelector('.mp-painel [data-p=x]'); if (x) x.click(); await w(60); }
          return false; });
        if (temPeca) {
          const pp = await page.evaluate(medirAlvos, { raiz: '.mp-painel', sel: 'button, textarea' });
          const rp = pp.itens.filter(x => /mp-refs/.test(x.onde));
          ok(rp.length >= 2 && !pp.miudos.length, R + '(c) painel da peça: as ' + rp.length + ' referências da fundamentação e os '
            + pp.itens.length + ' alvos medem ≥ 44 px no toque' + (pp.miudos.length ? ' (' + pp.miudos.slice(0, 4).join(' · ') + ')' : ''));
          await capturar(page, 'mapa-painel-peca-toque', await page.evaluate(() => { const b = document.querySelector('.mp-painel').getBoundingClientRect();
            return { x: b.left, y: b.top, width: b.width, height: b.height }; }));
          await page.evaluate(() => { const x = document.querySelector('.mp-painel [data-p=x]'); if (x) x.click(); });
          await w(250);
        } else ok(false, R + '(c) abri o painel de uma peça com referências de fundamentação');
        // o mapa: chips de filtro e os controles dos cartões
        await page.evaluate(() => { const f = document.querySelector('#mapaHold [data-r=ferr]'); if (f && f.getAttribute('aria-pressed') !== 'true') f.click(); });
        await w(250);
        await mundoA100(page);
        const mp = await page.evaluate(medirAlvos, { raiz: '#mapaHold', sel: 'button, input' });
        const rod = mp.itens.filter(x => /mp-(art|pc|ram|fav)/.test(x.onde));
        ok(rod.length >= 3, R + '(c) mapa: medi ' + rod.length + ' controles de cartão (artigo, peça, recolher, estrela)');
        ok(mp.itens.length >= 12 && !mp.miudos.length, R + '(c) mapa: nenhum dos ' + mp.itens.length + ' alvos (barra, filtros, cartões) abaixo de 44 px no toque'
          + (mp.miudos.length ? ' (' + mp.miudos.slice(0, 4).join(' · ') + ')' : ''));
        ok(mp.conferidos >= 3 && !mp.cortados.length, R + '(c) mapa: a caixa de toque dos ' + mp.conferidos + ' controles de cartão à vista não é cortada pelo cartão (elementFromPoint nas bordas)'
          + (mp.cortados.length ? ' (' + mp.cortados.slice(0, 4).join(' · ') + ')' : ''));
        const cart = await page.evaluate(medirCartaoMapa);
        ok(cart.n >= 5 && !cart.cobre.length, R + '(c) mapa: nos ' + cart.n + ' cartões, a estrela de 44×44 não cobre o "À FRENTE" nem o título'
          + (cart.cobre.length ? ' (' + cart.cobre.slice(0, 3).join(' · ') + ')' : ''));
        ok(cart.n >= 5 && cart.selo >= 4.5, R + '(c) mapa: o número da etapa pinta — pior contraste do selo ' + cart.selo + ':1 (≥ 4,5)');
        await capturarCartoes(page, 'mapa-cartoes-toque');
      }
      ok(!erros.length, R + '(c) o mapa abriu sem erro de página' + (erros.length ? ' (' + erros[0].slice(0, 120) + ')' : ''));
    } finally { await ctx.close(); }
  }

  /* desktop, mouse */
  {
    const { ctx, page, erros, achou } = await abrirMapa(false);
    try {
      const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
      ok(!coarse && achou, R + '(d) a 1280 com mouse o ponteiro é FINO e o painel abriu (coarse ' + coarse + ', painel ' + achou + ')');
      if (achou) {
        await w(300);
        const d = await page.evaluate(() => {
          const cs = s => { const el = document.querySelector(s); return el ? getComputedStyle(el) : null; };
          const mh = s => { const c = cs(s); return c ? c.minHeight : 'ausente'; };
          const fav = document.querySelector('#mapaHold .mp-fav');
          return { refs: mh('.mp-painel .mp-refs button'), rod: mh('#mapaHold .mp-rod button'), chip: mh('#mapaHold .mp-chip'),
            fav: fav ? [fav.offsetWidth, fav.offsetHeight].join('×') : 'ausente',
            topo: (cs('#mapaHold .mp-topo') || {}).paddingRight, tit: (cs('#mapaHold .mp-abrir strong') || {}).paddingRight };
        });
        ok(d.refs === '34px' && d.rod === '28px' && d.chip === '36px' && d.fav === '26×26' && d.topo === '26px' && d.tit === '0px',
          R + '(d) desktop: o desenho do mapa fica como era — referências ' + d.refs + ', cartão ' + d.rod + ', chips ' + d.chip + ', estrela ' + d.fav
          + ', recuo do topo ' + d.topo + ' e do título ' + d.tit);
        const cart = await page.evaluate(medirCartaoMapa);
        // a estrela de 26 px já encostava na ponta de título longo no desktop (antes desta mudança,
        // 6 px); o recuo do título de mouse é o de sempre, de propósito — só o selo se mede aqui
        ok(cart.n >= 5 && cart.selo >= 4.5, R + '(d) desktop: o número da etapa pinta nos ' + cart.n + ' cartões (' + cart.selo + ':1)');
        await capturarCartoes(page, 'mapa-cartoes-desktop');
        await capturar(page, 'mapa-painel-desktop', await page.evaluate(() => { const b = document.querySelector('.mp-painel').getBoundingClientRect();
          return { x: b.left, y: b.top, width: b.width, height: b.height }; }));
      }
      ok(!erros.length, R + '(d) o mapa abriu sem erro de página no desktop' + (erros.length ? ' (' + erros[0].slice(0, 120) + ')' : ''));
    } finally { await ctx.close(); }
  }
}

/* ---------- no navegador ---------- */

/* O cartão e tudo dentro dele, com ::before e ::after: acusa faixa lateral e mede a identidade. */
function medirCartoes(sel) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgb = s => { if (!s || s === 'transparent' || s === 'none') return null; cx.clearRect(0, 0, 1, 1); cx.fillStyle = 'rgba(0,0,0,0)'; cx.fillStyle = s;
    cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const dist = (a, b) => Math.round(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
  const compor = (c, base) => c[3] >= 0.99 ? c.slice(0, 3) : [0, 1, 2].map(i => c[i] * c[3] + base[i] * (1 - c[3]));
  const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const cr = (x, y) => { const a = lum(x), b = lum(y); return Math.round((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) * 100) / 100; };
  const pintado = cs => { const b = rgb(cs.backgroundColor); return (b && b[3] > 0.1) || (cs.backgroundImage && cs.backgroundImage !== 'none'); };
  const px = v => { const n = parseFloat(v); return isFinite(n) ? n : null; };
  const raiz = getComputedStyle(document.documentElement);
  const neutra = rgb(raiz.getPropertyValue('--border').trim() || '#e6e1d4');
  const cards = [...document.querySelectorAll(sel)].filter(c => c.getClientRects().length).slice(0, 8);
  const faixas = [], cartoes = [];
  for (const card of cards) {
    const cb = card.getBoundingClientRect();
    const nome = (card.className + ' ' + (card.style.getPropertyValue('--rc') || '')).trim();
    for (const el of [card, ...card.querySelectorAll('*')]) {
      if (el !== card && !el.getClientRects().length) continue;
      for (const ps of [null, '::before', '::after']) {
        const cs = getComputedStyle(el, ps);
        if (ps && (!cs.content || cs.content === 'none' || cs.content === 'normal')) continue;
        if (!ps && cs.display === 'none') continue;
        const onde = (el === card ? 'cartão' : el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]) + (ps || '') + ' [' + nome + ']';
        for (const lado of ['Left', 'Right']) {
          const lw = px(cs['border' + lado + 'Width']) || 0, tw = px(cs.borderTopWidth) || 0, c = rgb(cs['border' + lado + 'Color']);
          if (cs['border' + lado + 'Style'] !== 'none' && lw >= 3 && lw > tw + 0.5 && c && c[3] > 0.1)
            faixas.push(onde + ' borda-' + (lado === 'Left' ? 'esquerda' : 'direita') + ' ' + lw + 'px');
        }
        if (/inset/.test(cs.boxShadow || '')) {
          for (const s of cs.boxShadow.split(/,(?![^(]*\))/)) if (/inset/.test(s)) {
            const n = (s.replace(/(rgba?|color|oklab|oklch)\([^)]*\)/g, '').match(/-?[\d.]+px/g) || []).map(parseFloat);
            if (n.length >= 2 && Math.abs(n[0]) >= 2 && Math.abs(n[1]) < 1) faixas.push(onde + ' sombra inset lateral ' + n[0] + 'px');
          }
        }
        // estreito, alto e pintado: o pseudo (medido pela folha) ou o filho posicionado (pela caixa)
        let lw = null, lh = null;
        if (ps) {
          if (cs.position !== 'absolute' && cs.position !== 'fixed') continue;
          lw = px(cs.width); lh = px(cs.height);
          const L = px(cs.left), Rr = px(cs.right), T = px(cs.top), B = px(cs.bottom);
          if (lw == null && L != null && Rr != null) lw = cb.width - L - Rr;
          if (lh == null && T != null && B != null) lh = cb.height - T - B;
        } else if (el !== card && (cs.position === 'absolute' || cs.position === 'fixed')) {
          const b = el.getBoundingClientRect(); lw = b.width; lh = b.height;
        }
        if (lw != null && lh != null && lw > 0 && lw <= 8 && lh >= cb.height * 0.5 && pintado(cs))
          faixas.push(onde + ' pseudo/filho vertical ' + Math.round(lw) + '×' + Math.round(lh) + 'px pintado');
      }
    }
    // identidade: borda e lavagem da cor do ramo
    const cs = getComputedStyle(card);
    const rcS = card.style.getPropertyValue('--rc').trim() || getComputedStyle(card).getPropertyValue('--rc').trim();
    const rc = rgb(rcS);
    const sup = rgb(raiz.getPropertyValue('--surface').trim() || '#fffdf8');
    const borda = rgb(cs.borderLeftColor), bordaTop = rgb(cs.borderTopColor);
    const dB = rc && borda ? dist(borda, rc) : 999, dN = rc && neutra ? dist(neutra, rc) : 0;
    const paradas = (cs.backgroundImage || '').match(/(rgba?\([^)]*\)|color\([^)]*\)|oklab\([^)]*\)|oklch\([^)]*\)|#[0-9a-f]{3,8})/gi) || [];
    const p0 = paradas.length ? rgb(paradas[0]) : null;
    const baseSup = (() => { const b = rgb(cs.backgroundColor); return b && b[3] > 0.99 ? b.slice(0, 3) : sup.slice(0, 3); })();
    const lavada = p0 && p0[3] > 0.02 ? compor(p0, baseSup) : baseSup;
    // o matiz da parada: o canvas entrega o pixel já sem pré-multiplicar (getImageData é não
    // pré-multiplicado), então p0[0..2] é a cor da parada e p0[3] o alfa
    const daCor = !!(rc && p0 && p0[3] > 0.05 && dist(p0, rc) <= 24);
    // o texto do cartão sobre a lavagem: título, número, tema e os selos tingidos pela cor do ramo
    // (a pílula do ramo, a UF, os links e o botão do acervo), com o fundo PRÓPRIO do selo composto
    // sobre o pior ponto da lavagem e sobre a superfície
    const fundos = [lavada, baseSup], textos = [];
    for (const t of card.querySelectorAll('.vtit, .num, .tema, .rtag, .sg, .uf, .nm, .lks a, .acv, .semacv')) {
      if (!t.getClientRects().length) continue;
      const tc = getComputedStyle(t), c = rgb(tc.color); if (!c) continue;
      const bg = rgb(tc.backgroundColor);
      const fs = fundos.map(f => bg && bg[3] > 0.01 ? compor(bg, f) : f);
      textos.push({ el: String(t.className).split(' ')[0] || t.tagName.toLowerCase(), c: Math.min(...fs.map(f => cr(compor(c, f), f))) });
    }
    const pior = textos.reduce((a, b) => (!a || b.c < a.c ? b : a), null);
    const contr = textos.map(x => x.c);
    cartoes.push({ rc: rcS, bordaTinta: !!(borda && bordaTop && dist(borda, bordaTop) < 3 && dB < dN - 8), dBorda: dB, dNeutra: dN,
      lavagemDaCor: daCor, lavagemVisivel: dist(lavada, baseSup), contraste: contr.length ? Math.min(...contr) : 0, pior: pior ? pior.el : '' });
  }
  return { n: cards.length, faixas, cartoes };
}

/* Alvos de toque dentro de uma raiz: a caixa (layout, antes do zoom do palco) ou o ::after
   ancorado; e a caixa do controle de cartão não pode ser cortada — elementFromPoint nas bordas. */
function medirAlvos({ raiz, sel }) {
  const R = document.querySelector(raiz); if (!R) return { itens: [], miudos: ['sem ' + raiz], cortados: [], conferidos: 0 };
  const vis = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const itens = [], miudos = [], cortados = []; let conferidos = 0;
  const vw = innerWidth, vh = innerHeight;
  for (const el of R.querySelectorAll(sel)) {
    if (!vis(el) || el.closest('[hidden]')) continue;
    if (el.tagName === 'INPUT' && el.type === 'hidden') continue;
    const cs = getComputedStyle(el), af = getComputedStyle(el, '::after');
    const w = el.offsetWidth, h = el.offsetHeight;
    const temAf = af.content && af.content !== 'none' && af.content !== 'normal';
    const afH = temAf ? parseFloat(af.height) : 0, afW = temAf ? parseFloat(af.width) : 0;
    const ancorado = cs.position !== 'static';
    const onde = el.tagName.toLowerCase() + '.' + (String(el.className).split(' ')[0] || '')
      + (el.parentElement && el.parentElement.className ? ' em .' + String(el.parentElement.className).split(' ')[0] : '');
    const altura = Math.max(h, temAf && ancorado ? afH : 0), largura = Math.max(w, temAf && ancorado ? afW : 0);
    itens.push({ onde, h: altura, w: largura });
    if (altura < 44 || largura < 44) miudos.push(onde + ' ' + w + '×' + h + (temAf ? ' (::after ' + afW + '×' + afH + (ancorado ? '' : ', solto') + ')' : ''));
    // a caixa de toque do controle de cartão não é cortada pelo cartão de altura fixa: perto das
    // bordas de cima e de baixo (já com o zoom do palco), o ponto ainda cai no próprio botão
    if (el.closest('.mp-no') && el.tagName === 'BUTTON' && !el.classList.contains('mp-abrir')) {
      const b = el.getBoundingClientRect(), z = b.height / (h || 1), alto = Math.max(h, temAf && ancorado ? afH : 0);
      const cxp = b.left + b.width / 2, cyp = b.top + b.height / 2;
      if (cxp > 0 && cxp < vw && cyp > 0 && cyp < vh) {
        const centro = document.elementFromPoint(cxp, cyp);
        if (centro && (centro === el || el.contains(centro))) {   // só o que não está coberto por sobreposição
          conferidos++;
          for (const dy of [-(alto / 2 - 3), alto / 2 - 3]) {
            const y = cyp + dy * z; if (y <= 0 || y >= vh) continue;
            const e = document.elementFromPoint(cxp, y);
            if (!(e && (e === el || el.contains(e)))) cortados.push(onde + ' em ' + (dy < 0 ? 'cima' : 'baixo') + ' → ' + (e ? e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0] : 'nada'));
          }
        }
      }
    }
  }
  return { itens, miudos, cortados, conferidos };
}

/* O cartão do mapa: a estrela não cobre o texto (caixa × caixa, em coordenadas do cartão) e o
   selo do número pinta (contraste da cor do texto sobre o fundo dele). */
function medirCartaoMapa() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgb = s => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = 'rgba(0,0,0,0)'; cx.fillStyle = s; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const cr = (x, y) => { const a = lum(x), b = lum(y); return Math.round((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) * 100) / 100; };
  const cruza = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
  const cobre = []; let n = 0, selo = 99;
  for (const art of document.querySelectorAll('#mapaHold article.mp-no')) {
    if (!art.getClientRects().length) continue;
    n++;
    const fav = art.querySelector('.mp-fav'), est = art.querySelector('.mp-topo .est'), tit = art.querySelector('.mp-abrir strong');
    const num = art.querySelector('.mp-topo .num');
    if (num) { const cs = getComputedStyle(num), bg = rgb(cs.backgroundColor), fg = rgb(cs.color);
      selo = Math.min(selo, bg[3] < 0.5 ? 1 : cr(fg, bg)); }
    if (!fav) continue;
    const fb = fav.getBoundingClientRect();
    if (est && est.textContent.trim() && cruza(fb, est.getBoundingClientRect())) cobre.push('«' + est.textContent.trim() + '» sob a estrela');
    // o título: a caixa das LINHAS de texto (Range), não a do bloco, que ocupa a largura toda
    if (tit) { const r = document.createRange(); r.selectNodeContents(tit);
      for (const q of r.getClientRects()) if (cruza(fb, q)) { cobre.push('título «' + tit.textContent.trim().slice(0, 30) + '» sob a estrela'); break; } }
  }
  return { n, cobre, selo: selo === 99 ? 0 : selo };
}
