/* IPAD — OS SATÉLITES NO TOQUE, EM LARGURA DE TABLET (16/09/2026)

   POR QUE ESTE MÓDULO EXISTE, e por que ele não é o iphone-satelites-390.mjs de novo:

   o alvo de toque dos sete satélites morava inteiro dentro de `@media (max-width:640px)` —
   uma consulta por LARGURA. O iPad tem 768 a 1024+ e é um aparelho onde o dedo é o único
   ponteiro. Medido com ponteiro grosso de verdade, o mesmo código dava:

       390 px  → 0 controles abaixo de 44
      1024 px  → 1307 controles abaixo de 44   (LEGIS 1075, JURIS 176, 2ª fase 47)

   Mesmo ponteiro, mesmo CSS: só muda a largura. As abas do JURIS ficavam 71×31 e os chips
   de tribunal 100×29 — no aparelho em que a dona estuda todo dia.

   É a MESMA lição que o host já tinha aprendido e escrito no catedra-ui.css ("sob
   [data-toque] vale em QUALQUER largura — inclusive no iPad em paisagem, onde a tela passa
   de 900 e a regra por largura não alcança"); os satélites não tinham recebido.

   O módulo do iPhone não pegava isto por desenho: o `comLargura` dele liga
   `isMobile`/`hasTouch` só quando `largura < 900`, então a 1024 o contexto nunca era de
   toque e a medida nunca acontecia. Aqui o contexto é de toque NA LARGURA DE TABLET, que é
   a combinação que faltava.

   Casos:
   · (a) o contexto é mesmo de ponteiro grosso — sem isto o resto passaria por vacuidade,
         que é o falso verde que este arquivo existe para não repetir;
   · (b) os sete, a 1024×768 no toque: nenhum controle abaixo de 44 px sem área
         compensatória (o ::after ancorado de .ct-alvo, que deixa o desenho pequeno);
   · (c) os sete: todo campo visível (select e input) tem nome acessível — a 2ª fase tinha
         21 selects sem nome nenhum (os dois filtros e o seletor de horas de cada prova),
         e a varredura de selects do run.mjs só olha o documento do HOST, nunca o iframe;
   · (d) a 1280 px com ponteiro FINO a regra de toque NÃO se aplica. Prova que ela é por
         ponteiro e não vazou para o desktop: se alguém trocar o `(pointer:coarse)` por
         largura outra vez, (b) continua verde e (d) fica vermelho.
         O que se mede é o `min-height` COMPUTADO, não a altura em pixels. A primeira versão
         deste caso cravava a altura que eu tinha medido no Chromium (31, 32, 38, 43, 38) e
         quebrou nos cinco no WebKit, que dá 35, 36, 46, 51, 46 para os mesmos controles: são
         métricas de fonte de cada motor, não vazamento — vazamento daria 44 cravado. Pior, o
         .sel de peças nasce com 51 px no WebKit, acima de 44, então nem "altura < 44" serviria.
         O `min-height` responde a pergunta certa em qualquer motor: valendo a regra ele é
         44px; sem ela é o que a folha do satélite disser.

   Rótulos "IPAD/satélites toque …". */

const SATELITES = ['legis-web.html', 'juris-web.html', 'ritos-web.html', 'pecas-web.html',
  'area-web.html', 'prioridade-web.html', 'segunda-fase-web.html'];

/* (d) um controle por satélite que o bloco @media (pointer:coarse) leva a min-height:44px.
   No toque o computado tem de ser 44px; com mouse, qualquer coisa MENOS 44px — é assim que
   se vê se a regra vazou, sem depender da métrica de fonte do motor. `area-web.html` fica de
   fora porque resolve por ::after, não por min-height, e não tem o que vigiar aqui. */
const DESKTOP = [
  ['juris-web.html', '.tab'],
  ['legis-web.html', '.lt'],
  ['ritos-web.html', '.modos button'],
  ['pecas-web.html', '.sel'],
  ['prioridade-web.html', '.sel'],
  ['segunda-fase-web.html', '.sel'],
];

export async function testarIpadToqueSatelites(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const origem = opcoes.origem || (String(base).startsWith('file:') ? 'file' : 'http');
  const R = 'IPAD/satélites toque [' + motor + '] [' + origem + '] ';
  const browser = pageDaSuite.context().browser();

  /* `isMobile` é o que faz o motor declarar `pointer: coarse`; o Firefox não tem, mas a
     casa só roda Chromium e WebKit. A largura de tablet vem junto de propósito: é a
     combinação (toque + largura grande) que nenhum módulo exercitava. */
  async function comContexto(largura, altura, toque, corpo) {
    const ctx = await browser.newContext({ viewport: { width: largura, height: altura },
      isMobile: toque, hasTouch: toque, deviceScaleFactor: toque ? 2 : 1 });
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

  /* ---------- (a) (b) (c) os sete, a 1024×768 NO TOQUE ---------- */
  await comContexto(1024, 768, true, async (ctx) => {
    let conferiuPonteiro = false;
    for (const arquivo of SATELITES) {
      const { page, erros } = await abrir(ctx, arquivo);
      const m = await page.evaluate(() => {
        /* O ::after só entrega área de toque se o elemento ANCORA o pseudo-elemento; sem
           position:relative ele se prende ao primeiro ancestral posicionado e os 44 px
           acontecem noutro lugar da tela. É a mesma cobrança do run.mjs no host. */
        const miudos = [...document.querySelectorAll('button, a[href], select, summary, [role="button"]')].filter(el => {
          if (!el.offsetParent) return false;
          const b = el.getBoundingClientRect();
          if (!(b.width > 0 && b.height > 0)) return false;
          if (b.width >= 44 && b.height >= 44) return false;
          const af = getComputedStyle(el, '::after'), cs = getComputedStyle(el);
          return !(parseFloat(af.height) >= 44 && parseFloat(af.width) >= 44 && cs.position === 'relative');
        });
        /* Nome acessível: aria-label, aria-labelledby, <label> em volta ou <label for>. O
           `title` NÃO conta — é dica de mouse, não chega ao leitor de tela no toque. */
        const nomeado = (el) => !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')
          || el.closest('label') || (el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]')));
        const campos = [...document.querySelectorAll('select, input:not([type="hidden"])')].filter(el => {
          const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0;
        });
        const semNome = campos.filter(el => !nomeado(el));
        const desc = el => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
          + (el.className ? '.' + String(el.className).split(' ')[0] : '')).slice(0, 26);
        return {
          coarse: matchMedia('(pointer: coarse)').matches,
          largura: innerWidth,
          nMiudos: miudos.length,
          miudos: miudos.slice(0, 3).map(el => desc(el) + ' ' + Math.round(el.getBoundingClientRect().width)
            + '×' + Math.round(el.getBoundingClientRect().height)),
          nCampos: campos.length,
          nSemNome: semNome.length,
          semNome: semNome.slice(0, 3).map(desc),
        };
      });
      if (!conferiuPonteiro) {
        ok(m.coarse && m.largura >= 1000, R + '(a) o contexto é de ponteiro GROSSO em largura de tablet ('
          + m.largura + ' px, coarse ' + m.coarse + ') — sem isto (b) passaria por vacuidade');
        conferiuPonteiro = true;
      }
      ok(m.nMiudos === 0, R + '(b) ' + arquivo + ': nenhum controle abaixo de 44 px sem área de toque ancorada'
        + (m.nMiudos ? ' (' + m.nMiudos + ': ' + m.miudos.join(', ') + ')' : ''));
      ok(m.nSemNome === 0, R + '(c) ' + arquivo + ': os ' + m.nCampos + ' campos visíveis têm nome acessível'
        + (m.nSemNome ? ' (' + m.nSemNome + ' sem: ' + m.semNome.join(', ') + ')' : ''));
      ok(!erros.length, R + '(b) ' + arquivo + ': sem erro de página ('
        + erros.slice(0, 1).join('').slice(0, 120) + ')');
      await page.close();
    }
  });

  /* ---------- (d) a 1280 com ponteiro FINO, a regra de toque não se aplica ---------- */
  /* Primeiro reconfere, no toque, que estes mesmos controles ESTÃO com a regra: sem este
     lado o caso vira "não é 44px", que um seletor errado (que não acha nada) satisfaz de
     graça. Os dois lados juntos é que dizem "vale com o dedo e não vale com o mouse". */
  const noToque = new Map();
  await comContexto(1024, 768, true, async (ctx) => {
    for (const [arquivo, seletor] of DESKTOP) {
      const { page } = await abrir(ctx, arquivo);
      noToque.set(arquivo + '|' + seletor, await page.evaluate((sel) => {
        const el = [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().height > 0);
        return el ? { mh: getComputedStyle(el).minHeight, alt: Math.round(el.getBoundingClientRect().height) } : null;
      }, seletor));
      await page.close();
    }
  });
  await comContexto(1280, 900, false, async (ctx) => {
    let conferiuPonteiro = false;
    for (const [arquivo, seletor] of DESKTOP) {
      const { page } = await abrir(ctx, arquivo);
      const m = await page.evaluate((sel) => {
        const el = [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().height > 0);
        return { coarse: matchMedia('(pointer: coarse)').matches, achou: !!el,
          mh: el ? getComputedStyle(el).minHeight : '',
          alt: el ? Math.round(el.getBoundingClientRect().height) : -1 };
      }, seletor);
      const tq = noToque.get(arquivo + '|' + seletor);
      if (!conferiuPonteiro) {
        ok(!m.coarse, R + '(d) a 1280 o ponteiro é FINO (coarse ' + m.coarse + ')');
        conferiuPonteiro = true;
      }
      ok(m.achou && !!tq, R + '(d) ' + arquivo + ': achei ' + seletor + ' nos dois contextos');
      ok(!!tq && tq.mh === '44px', R + '(d) ' + arquivo + ' ' + seletor
        + ': NO TOQUE a regra vale (min-height ' + (tq ? tq.mh : '—') + ', altura ' + (tq ? tq.alt : '—') + ' px)');
      /* A altura em pixels NÃO entra na asserção: ela é métrica de fonte do motor (o mesmo
         controle dá 31 no Chromium e 35 no WebKit) e já me custou cinco falsos vermelhos.
         Vai na mensagem só para quem for depurar. */
      ok(m.mh !== '44px', R + '(d) ' + arquivo + ' ' + seletor
        + ': COM MOUSE a regra não vale (min-height ' + m.mh + ', altura ' + m.alt
        + ' px) — não vazou para o desktop');
      await page.close();
    }
  });
}
