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
   · (d) a 1280 px com ponteiro FINO os tamanhos ORIGINAIS voltam. É o que prova que a
         regra é por ponteiro e não vazou para o desktop: se alguém trocar o
         `(pointer:coarse)` por largura outra vez, (b) continua verde e (d) fica vermelho.

   Rótulos "IPAD/satélites toque …". */

const SATELITES = ['legis-web.html', 'juris-web.html', 'ritos-web.html', 'pecas-web.html',
  'area-web.html', 'prioridade-web.html', 'segunda-fase-web.html'];

/* (d) um controle conhecido por satélite e a altura que ele TEM no desktop hoje. São as
   medidas de antes da mudança, conferidas com ponteiro fino a 1280: se qualquer uma subir
   para 44, a regra de toque vazou para quem usa mouse. `area-web.html` fica de fora porque
   já resolvia tudo por ::after e não tem controle abaixo de 44 para vigiar. */
const DESKTOP = [
  ['juris-web.html', '.tab', 31],
  ['legis-web.html', '.lt', 32],
  ['ritos-web.html', '.modos button', 38],
  ['pecas-web.html', '.sel', 43],
  ['prioridade-web.html', '.sel', 38],
  ['segunda-fase-web.html', '.sel', 38],
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

  /* ---------- (d) a 1280 com ponteiro FINO, o desktop não mudou ---------- */
  await comContexto(1280, 900, false, async (ctx) => {
    let conferiuPonteiro = false;
    for (const [arquivo, seletor, alturaEsperada] of DESKTOP) {
      const { page } = await abrir(ctx, arquivo);
      const m = await page.evaluate((sel) => {
        const el = [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().height > 0);
        const b = el ? el.getBoundingClientRect() : null;
        return { coarse: matchMedia('(pointer: coarse)').matches, achou: !!el,
          altura: b ? Math.round(b.height) : -1 };
      }, seletor);
      if (!conferiuPonteiro) {
        ok(!m.coarse, R + '(d) a 1280 o ponteiro é FINO (coarse ' + m.coarse + ')');
        conferiuPonteiro = true;
      }
      ok(m.achou, R + '(d) ' + arquivo + ': achei ' + seletor + ' para medir');
      /* Cobra a altura EXATA de antes da mudança, não "< 44": assim a asserção também pega
         quem encolher o controle por outro motivo, e diz o número quando quebra. */
      ok(m.altura === alturaEsperada, R + '(d) ' + arquivo + ' ' + seletor + ': o desktop segue em '
        + alturaEsperada + ' px (medido ' + m.altura + ') — a regra de toque não vazou para o mouse');
      await page.close();
    }
  });
}
