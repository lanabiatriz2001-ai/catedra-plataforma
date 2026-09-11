/* IPHONE — OS SATÉLITES (legis-web, juris-web, …) A 390 × 844, NO TOQUE (F0 e F5, 11/09/2026)

   Os satélites são as páginas que o host embute em <iframe data-ct-frame> e que o app do
   iPhone também mostra dentro da WKWebView de 390 pt. A F0 deixou aqui o primeiro caso; a
   F5 acrescenta os seus, e todos MEDEM:

   · (a) os sete abrem a 390 px sem rolar de lado e sem nada passando da borda direita SEM um
         pai que o corte de propósito (o mesmo filtro do módulo do host: sem ele a medida
         acusaria todo texto com ellipsis e todo enfeite posicionado, que é falso vermelho);
   · (b) os sete trazem viewport-fit=cover no meta — nenhum tinha, e sem ele o
         env(safe-area-inset-bottom) vale 0 dentro da WKWebView;
   · (c) nenhum controle fica abaixo de 44 px sem uma área de toque compensatória (o ::after
         de .ct-alvo, que a própria satellite-base.css já dá);
   · (d) as três fileiras que rolam escondendo destino — LEGIS #tabsTopo (181 px), JURIS
         #tabs (245) e JURIS #trib (733, ou seja 6 dos 10 tribunais) — dizem que rolam: têm
         .ct-rolo com as quatro camadas e o background-attachment que faz as tampas andarem
         com o conteúdo;
   · (e) o texto dos chips de tribunal tem ≥ 4,5:1 sobre o fundo em que assenta, calculado,
         não presumido;
   · (f) a 1280 px as mesmas fileiras CABEM (não escondem nada), que é como se prova que a
         sombra some sozinha quando não há mais para onde rolar — e o desktop não muda.

   Contexto PRÓPRIO por largura, com isMobile + hasTouch, fechado no finally. As páginas não
   leem semente; mesmo assim passam pela /__semente para limpar o storage da origem.
   Rótulos "IPHONE/satélites 390 …". */

const SATELITES = ['legis-web.html', 'juris-web.html', 'ritos-web.html', 'pecas-web.html',
  'area-web.html', 'prioridade-web.html', 'segunda-fase-web.html'];

/* As três fileiras medidas na auditoria, com quanto cada uma escondia a 390 px. */
const FILEIRAS = [
  { arquivo: 'legis-web.html', sel: '#tabsTopo', escondia: 181 },
  { arquivo: 'juris-web.html', sel: '#tabs', escondia: 245 },
  { arquivo: 'juris-web.html', sel: '#trib', escondia: 733 },
];

export async function testarIphoneSatelites390(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const origem = opcoes.origem || (String(base).startsWith('file:') ? 'file' : 'http');
  const R = 'IPHONE/satélites 390 [' + motor + '] [' + origem + '] ';
  const browser = pageDaSuite.context().browser();

  async function comLargura(largura, altura, corpo) {
    const ctx = await browser.newContext({ viewport: { width: largura, height: altura },
      isMobile: largura < 900, hasTouch: largura < 900, deviceScaleFactor: largura < 900 ? 3 : 1 });
    try { await corpo(ctx); } finally { await ctx.close(); }
  }
  async function abrir(ctx, arquivo) {
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', e => erros.push(String(e && e.message || e)));
    await page.goto(base + '/__semente');
    await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto(base + '/' + arquivo);
    await page.waitForTimeout(2200);
    return { page, erros };
  }

  /* ---------- o caso que a F0 deixou: o LEGIS abre e cabe ---------- */
  await comLargura(390, 844, async (ctx) => {
    const { page } = await abrir(ctx, 'legis-web.html');
    const m = await page.evaluate(() => {
      const de = document.documentElement;
      const h1 = document.querySelector('h1');
      const hb = h1 ? h1.getBoundingClientRect() : null;
      return { larguraJanela: innerWidth, scrollWidth: de.scrollWidth,
        semRolagemLateral: de.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth,
        temTitulo: !!h1 && /LEGIS/i.test(h1.textContent || ''),
        tituloCabe: !!hb && hb.left >= -0.5 && hb.right <= innerWidth + 0.5 && hb.width > 0,
        temLeis: document.querySelectorAll('.lawrow').length > 0 };
    });
    ok(m.larguraJanela === 390, R + 'legis-web.html: a janela mede 390 px (' + m.larguraJanela + ')');
    ok(m.semRolagemLateral, R + 'legis-web.html: não rola de lado (scrollWidth ' + m.scrollWidth + ' ≤ ' + m.larguraJanela + ')');
    ok(m.temTitulo, R + 'legis-web.html: o título CátedraLEGIS está na página');
    ok(m.tituloCabe, R + 'legis-web.html: o título cabe dentro da janela');
    ok(m.temLeis, R + 'legis-web.html: o catálogo de leis carregou (há .lawrow)');
  });

  /* ---------- (a) (b) (c) os sete, a 390 ---------- */
  await comLargura(390, 844, async (ctx) => {
    for (const arquivo of SATELITES) {
      const { page, erros } = await abrir(ctx, arquivo);
      const m = await page.evaluate(() => {
        /* "passa da borda" só conta quando NADA corta o elemento até a raiz — um pai com
           overflow-x diferente de visible, ou com text-overflow:ellipsis, é corte de propósito. */
        const contido = el => {
          for (let p = el.parentElement; p; p = p.parentElement) {
            const cs = getComputedStyle(p);
            if (cs.overflowX !== 'visible' || cs.textOverflow === 'ellipsis') return true;
          }
          return false;
        };
        const fora = [...document.querySelectorAll('body *')].filter(el => {
          const cs = getComputedStyle(el);
          if (cs.pointerEvents === 'none' || cs.position === 'absolute' || cs.position === 'fixed') return false;
          const b = el.getBoundingClientRect();
          if (!(b.width > 0 && b.right > innerWidth + 1)) return false;
          return !contido(el);
        });
        /* Alvo pequeno só vale como defeito quando NÃO tem a área compensatória: o ::after de
           .ct-alvo deixa o desenho pequeno de propósito e dá 44 px ao dedo. */
        const miudos = [...document.querySelectorAll('button, a, select, [role="button"]')].filter(el => {
          if (!el.offsetParent) return false;
          const b = el.getBoundingClientRect();
          if (!(b.width > 0 && b.height > 0)) return false;
          const af = getComputedStyle(el, '::after');
          const temArea = parseFloat(af.height) >= 44 && parseFloat(af.width) >= 44;
          return (b.width < 44 || b.height < 44) && !temArea;
        });
        const meta = document.querySelector('meta[name="viewport"]');
        return {
          viewport: meta ? meta.getAttribute('content') : '',
          docRola: document.documentElement.scrollWidth - innerWidth,
          bodyRola: document.body.scrollWidth - innerWidth,
          fora: fora.slice(0, 3).map(el => (el.tagName + (el.id ? '#' + el.id : '.' + String(el.className).split(' ')[0]))
            .slice(0, 24) + ' r=' + Math.round(el.getBoundingClientRect().right)),
          miudos: miudos.slice(0, 3).map(el => (el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : ''))
            .slice(0, 20) + ' ' + Math.round(el.getBoundingClientRect().width) + '×'
            + Math.round(el.getBoundingClientRect().height)),
          nMiudos: miudos.length,
        };
      });
      ok(/viewport-fit\s*=\s*cover/.test(m.viewport), R + '(b) ' + arquivo
        + ': o meta viewport traz viewport-fit=cover (' + m.viewport + ')');
      ok(m.docRola <= 0 && m.bodyRola <= 0, R + '(a) ' + arquivo + ': não rola de lado (documento '
        + m.docRola + ', corpo ' + m.bodyRola + ')');
      ok(m.fora.length === 0, R + '(a) ' + arquivo + ': nada passa da borda direita sem ser cortado de propósito'
        + (m.fora.length ? ' (' + m.fora.join(' | ') + ')' : ''));
      ok(m.nMiudos === 0, R + '(c) ' + arquivo + ': nenhum controle abaixo de 44 px sem área de toque'
        + (m.nMiudos ? ' (' + m.miudos.join(', ') + ')' : ''));
      ok(!erros.length, R + '(a) ' + arquivo + ': sem erro de página ('
        + erros.slice(0, 1).join('').slice(0, 120) + ')');
      await page.close();
    }
  });

  /* ---------- (d) as fileiras dizem que rolam · (e) contraste dos chips ---------- */
  await comLargura(390, 844, async (ctx) => {
    for (const f of FILEIRAS) {
      const { page } = await abrir(ctx, f.arquivo);
      const m = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return { achou: false };
        const cs = getComputedStyle(el);
        return { achou: true,
          temClasse: el.classList.contains('ct-rolo'),
          esconde: el.scrollWidth - el.clientWidth,
          camadas: (cs.backgroundImage.match(/linear-gradient/g) || []).length,
          fixa: cs.backgroundAttachment,
          repete: cs.backgroundRepeat };
      }, f.sel);
      ok(m.achou, R + '(d) ' + f.arquivo + ' ' + f.sel + ': a fileira está na página');
      if (m.achou) {
        ok(m.temClasse, R + '(d) ' + f.arquivo + ' ' + f.sel + ': tem a classe .ct-rolo');
        ok(m.esconde > 50, R + '(d) ' + f.arquivo + ' ' + f.sel + ': ainda esconde destino a 390 px ('
          + m.esconde + ' px; a auditoria mediu ' + f.escondia + ')');
        ok(m.camadas === 4, R + '(d) ' + f.arquivo + ' ' + f.sel
          + ': a sombra de rolagem PINTA — quatro camadas no background-image (' + m.camadas + ')');
        /* É o `local` das duas primeiras camadas que faz a tampa andar com o conteúdo; sem ele
           a sombra ficaria acesa para sempre, inclusive com a fila cabendo. */
        ok(/^local,\s*local/.test(m.fixa), R + '(d) ' + f.arquivo + ' ' + f.sel
          + ': as tampas andam com o conteúdo (background-attachment ' + m.fixa + ')');
      }
      await page.close();
    }

    const { page } = await abrir(ctx, 'juris-web.html');
    const c = await page.evaluate(() => {
      const hex = (c) => {
        const n = (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
        const v = /^color\(srgb/.test(c) ? n.map(x => Math.round(x * 255)) : n;
        return '#' + v.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
      };
      const lum = (h) => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
        .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      /* O fundo efetivo: sobe até achar alguém que realmente pinte (os chips e a fileira são
         transparentes, e comparar texto com "transparent" daria um número inventado). */
      const fundo = (el) => {
        for (let p = el; p; p = p.parentElement) {
          const bg = getComputedStyle(p).backgroundColor;
          if (bg && !/rgba\(0,\s*0,\s*0,\s*0\)|transparent/.test(bg)) return hex(bg);
        }
        return hex(getComputedStyle(document.body).backgroundColor);
      };
      const chips = [...document.querySelectorAll('#trib > *, #tabs > *')].filter(e => e.offsetParent);
      const medidas = chips.map(e => ({ txt: (e.textContent || '').trim().slice(0, 14),
        r: ratio(hex(getComputedStyle(e).color), fundo(e)) }));
      const piores = medidas.filter(x => x.r < 4.5);
      return { n: medidas.length, piores: piores.slice(0, 3).map(x => x.txt + ' ' + x.r.toFixed(2)),
        menor: medidas.length ? Math.min(...medidas.map(x => x.r)).toFixed(2) : '0' };
    });
    ok(c.n >= 8, R + '(e) juris-web.html: os chips de aba e de tribunal estão na tela (' + c.n + ')');
    ok(c.piores.length === 0, R + '(e) juris-web.html: cada chip tem ≥ 4,5:1 de contraste, calculado (menor '
      + c.menor + (c.piores.length ? '; abaixo: ' + c.piores.join(', ') : '') + ')');
    await page.close();
  });

  /* ---------- (f) a 1280 px as fileiras cabem e o desktop não muda ---------- */
  await comLargura(1280, 900, async (ctx) => {
    for (const f of FILEIRAS) {
      const { page } = await abrir(ctx, f.arquivo);
      const m = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return { achou: false };
        return { achou: true, esconde: el.scrollWidth - el.clientWidth,
          docRola: document.documentElement.scrollWidth - innerWidth };
      }, f.sel);
      ok(m.achou && m.esconde <= 0, R + '(f) 1280: ' + f.arquivo + ' ' + f.sel
        + ' cabe inteira, então a sombra não tem o que anunciar (' + (m.achou ? m.esconde : 'sumiu') + ' px)');
      ok(m.achou && m.docRola <= 0, R + '(f) 1280: ' + f.arquivo + ' não rola de lado ('
        + (m.achou ? m.docRola : '?') + ')');
      await page.close();
    }
  });
}
