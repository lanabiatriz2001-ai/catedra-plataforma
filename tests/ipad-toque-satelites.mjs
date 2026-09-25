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
   · (e) o <select> dos três satélites que têm select (peças, prioridade, 2ª fase) recebe a
         folha da página, com dedo e com mouse. Este módulo entrou na main vermelho no WebKit
         (a CI estava parada e ninguém viu): o tema nativo do motor redesenhava o select e
         jogava fora padding (0 em vez de 12px), raio (5px em vez de 11px) e min-height (18px
         em vez de 44px) — 21 a 24 px de altura no toque. A régua é um <div class="sel"> posto
         ao lado: div não tem tema nativo, então o computado dele é exatamente o que a página
         pediu, e o select tem de bater com ele;
   · (f) a seta que substitui a nativa PINTA, e com contraste: captura da região do chevron,
         pixel a pixel, contra o fundo do próprio select — nas 16 paletas do host (8 temas,
         claro e escuro), tiradas do THEMES() do Catedra.dc.html e mandadas pelo mesmo
         `ctTheme` que o app usa. ≥ 3:1 é o piso de componente de interface (WCAG 1.4.11);
   · (g) em cores forçadas (alto contraste do Windows) o gradiente é apagado pelo navegador,
         então a aparência nativa volta. Só onde o motor emula `forced-colors` (o Chromium,
         onde é obrigatório emular — sem isto o caso passaria por vacuidade).

   Rótulos "IPAD/satélites toque …". */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

  /* ---------- (e) (f) (g) o select recebe a folha da página, e a seta pinta ---------- */
  const COM_SELECT = ['pecas-web.html', 'prioridade-web.html', 'segunda-fase-web.html'];

  /* As 16 paletas do host, lidas da fonte: um tema novo no app entra aqui sozinho. */
  const src = fs.readFileSync(path.join(RAIZ, 'Catedra.dc.html'), 'utf8');
  const ini = src.indexOf('THEMES(){ return {');
  const blocoTemas = ini >= 0 ? src.slice(ini, src.indexOf('};}', ini)) : '';
  const kv = (s) => Object.fromEntries([...s.matchAll(/(\w+):'([^']*)'/g)].map(x => [x[1], x[2]]));
  const paletas = [];
  for (const m of blocoTemas.matchAll(/(\w+):\{ label:'[^']*'[\s\S]*?\blight:\{([^}]*)\}[\s\S]*?\bdark:\{([^}]*)\}/g)) {
    for (const [modo, corpo] of [['claro', m[2]], ['escuro', m[3]]]) {
      const p = kv(corpo), tokens = {};
      for (const k of ['bg', 'surface', 'surface2', 'border', 'ink', 'text2', 'text3', 'accent']) {
        if (p[k]) tokens['--' + k] = p[k];
      }
      paletas.push({ nome: m[1] + ' ' + modo, tokens });
    }
  }
  ok(paletas.length >= 16 && paletas.every(p => p.tokens['--bg'] && p.tokens['--text2']),
    R + '(f) li as paletas do host no THEMES() (' + paletas.length + ', cada uma com --bg e --text2)'
    + ' — sem elas o contraste seria medido só na cor avulsa');

  /* O que o motor fez com o select × o que a página pediu (o div.sel ao lado). */
  const folhaDoSelect = (page) => page.evaluate(() => {
    const el = [...document.querySelectorAll('select.sel')].find(e => e.getBoundingClientRect().height > 0);
    if (!el) return null;
    const regua = document.createElement('div');
    regua.className = 'sel'; regua.textContent = 'x';
    el.parentElement.insertBefore(regua, el.nextSibling);
    const a = getComputedStyle(el), b = getComputedStyle(regua);
    const props = ['padding-top', 'padding-left', 'border-top-left-radius', 'min-height'];
    const dif = props.filter(p => a.getPropertyValue(p) !== b.getPropertyValue(p))
      .map(p => p + ' ' + a.getPropertyValue(p) + ' (pedido ' + b.getPropertyValue(p) + ')');
    regua.remove();
    return { id: el.id || el.getAttribute('data-h') || '', dif,
      alt: Math.round(el.getBoundingClientRect().height), mh: a.minHeight };
  });

  const conferirFolha = async (page, arquivo, toque) => {
    const f = await folhaDoSelect(page);
    ok(!!f && !f.dif.length, R + '(e) ' + arquivo + ' ' + (toque ? 'NO TOQUE' : 'COM MOUSE')
      + ': o select#' + (f ? f.id : '—') + ' recebe a folha da página, sem o tema nativo do motor por cima'
      + (f && f.dif.length ? ' (' + f.dif.join('; ') + ')' : '') + ' — altura ' + (f ? f.alt : '—') + ' px');
  };

  /* (f) Captura da região da seta (22×12 px CSS à direita, longe da borda e do texto, que
     termina 34 px antes da borda) e contagem, numa página em branco, dos pixels que
     contrastam ≥ 3:1 com o fundo do select. A 2× a seta tem dezenas deles; sem seta, zero.
     (e) e (f) dividem o contexto de toque, e (e) e (g) o de mouse: cada abertura de página
     custa uns 3 s no WebKit, e abrir de novo não mediria nada a mais. */
  await comContexto(1024, 768, true, async (ctx) => {
    const lab = await ctx.newPage();
    const medirSeta = async (page) => {
      const info = await page.evaluate(() => {
        const el = [...document.querySelectorAll('select.sel')].find(e => e.getBoundingClientRect().height > 0);
        const r = el.getBoundingClientRect();
        return { x: r.right - 30, y: r.top + r.height / 2 - 6, fundo: getComputedStyle(el).backgroundColor };
      });
      const png = await page.screenshot({ clip: { x: info.x, y: info.y, width: 22, height: 12 } });
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
        return { fortes, max: Math.round(max * 100) / 100 };
      }, { b64: png.toString('base64'), fundo: info.fundo });
    };

    for (const arquivo of COM_SELECT) {
      const { page } = await abrir(ctx, arquivo);
      await conferirFolha(page, arquivo, true);
      const avulsa = await medirSeta(page);
      ok(avulsa.fortes >= 12 && avulsa.max >= 3, R + '(f) ' + arquivo + ' avulso: a seta do select PINTA ('
        + avulsa.fortes + ' px ≥ 3:1, máximo ' + avulsa.max + ':1)');
      const fracas = [];
      for (const p of paletas) {
        await page.evaluate((t) => window.dispatchEvent(new MessageEvent('message', {
          source: window.parent, origin: location.origin,
          data: { type: 'ctTheme', tokens: t }
        })), p.tokens);
        /* tema que não chega é falha, não "mediu a cor avulsa de novo e passou" */
        const chegou = await page.waitForFunction((bg) => document.documentElement.style.getPropertyValue('--bg') === bg,
          p.tokens['--bg'], { timeout: 3000 }).then(() => true, () => false);
        if (!chegou) { fracas.push(p.nome + ' (o ctTheme não chegou)'); continue; }
        const s = await medirSeta(page);
        if (!(s.fortes >= 12 && s.max >= 3)) fracas.push(p.nome + ' ' + s.max + ':1 (' + s.fortes + ' px)');
      }
      ok(paletas.length && !fracas.length, R + '(f) ' + arquivo + ': a seta tem ≥ 3:1 contra o fundo do select nas '
        + paletas.length + ' paletas do host' + (fracas.length ? ' (falha: ' + fracas.slice(0, 4).join(', ') + ')' : ''));
      await page.close();
    }
    await lab.close();
  });

  /* (g) cores forçadas: o gradiente some por regra do navegador, então a seta nativa volta. */
  await comContexto(1280, 768, false, async (ctx) => {
    for (const arquivo of COM_SELECT) {
      const { page } = await abrir(ctx, arquivo);
      await conferirFolha(page, arquivo, false);
      let emula = false;
      try { await page.emulateMedia({ forcedColors: 'active' }); emula = await page.evaluate(() => matchMedia('(forced-colors: active)').matches); }
      catch (_) { emula = false; }
      if (motor === 'chromium') ok(emula, R + '(g) ' + arquivo + ': o Chromium emula forced-colors — sem isto (g) não mediria nada');
      if (emula) {
        const m = await page.evaluate(() => {
          const el = [...document.querySelectorAll('select.sel')].find(e => e.getBoundingClientRect().height > 0);
          const cs = getComputedStyle(el);
          return { ap: cs.appearance || cs.webkitAppearance, img: cs.backgroundImage };
        });
        ok(m.ap === 'auto', R + '(g) ' + arquivo + ': em cores forçadas o select volta à aparência nativa, com a seta do sistema'
          + ' (appearance ' + m.ap + ', imagem ' + String(m.img).slice(0, 30) + ')');
      }
      await page.close();
    }
  });
}
