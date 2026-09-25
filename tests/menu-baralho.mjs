/* O Baralho no menu lateral pinta como os irmãos — medido, não presumido.
   O botão entrou (38a442d, 15/09) com style="{{ navStyle.flashcards }}", mas o objeto
   navStyle do render() nunca ganhou a chave: o runtime deixava o atributo vazio e o item saía
   com a cara crua do navegador (fundo cinza, texto preto, borda outset, 27 px de altura) em
   todas as telas. O caso de integração só perguntava se o botão EXISTIA no DOM — e existia.
   Aqui:
   · (a) estático: todo {{ navStyle.X }} do template tem a chave X no objeto do render() —
         pega o próximo item que nascer do mesmo jeito;
   · (b) mouse 1280: o Baralho, parado e ativo, tem o MESMO getComputedStyle de Revisões
         (display, padding, fundo, gradiente, cor, borda, raio, fonte, peso, sombra, altura),
         com o contraste do texto calculado (≥ 4,5:1) contra o fundo da barra e contra as
         duas pontas do gradiente do item ativo; e nenhum item visível do menu fica sem estilo;
   · (c) toque: no iPad em retrato (820, gaveta) e em paisagem (1180, barra fixa) o Baralho
         mede ≥ 44 px e a mesma altura dos irmãos. Em paisagem o menu inteiro ficava em 40:
         a regra de 44 px da barra só valia por largura (≤ 900), e o [data-toque] não a alcançava.
         E a regra nova é só da barra: um <aside> dentro do conteúdo (o cartão de respostas do
         ENAM) não estica o quadradinho .ct-miudo.
   Semeia por base+'/__semente' (404 na mesma origem): com o app aberto, semear é corrida com o
   autosave. Por isso só na origem http. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// propriedades que fazem o item "parecer item do menu"; a largura fica de fora porque o
// ativo anda 2 px (translateX) e a caixa medida é a mesma de qualquer jeito
const PROPS = ['display', 'alignItems', 'columnGap', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopStyle', 'borderTopWidth', 'borderTopLeftRadius', 'backgroundColor', 'backgroundImage', 'color',
  'fontSize', 'fontWeight', 'fontFamily', 'textAlign', 'cursor', 'boxShadow', 'transform'];

/**
 * @param pageDaSuite  página do Playwright (serve para chegar ao browser: cada caso abre
 *                     contexto próprio, com viewport e toque do cenário)
 * @param base         'http://localhost:PORTA' — sem barra final
 * @param ok           coletor: ok(cond, rótulo)
 * @param ctx          { motor, origem } — só para o rótulo
 */
export async function testarMenuBaralho(pageDaSuite, base, ok, ctx = {}) {
  const motor = ctx.motor || 'chromium';
  const origem = ctx.origem || 'http';
  const R = 'MENU/BARALHO [' + motor + '] [' + origem + '] ';
  const browser = pageDaSuite.context().browser();

  /* ---------- (a) cada navStyle.X do template existe no render() ---------- */
  {
    const src = fs.readFileSync(path.join(RAIZ, 'Catedra.dc.html'), 'utf8');
    const usadas = [...new Set([...src.matchAll(/\{\{\s*navStyle\.(\w+)\s*\}\}/g)].map(m => m[1]))];
    const obj = /\bnavStyle:\{([^}]*)\}/.exec(src);
    const chaves = obj ? [...obj[1].matchAll(/(\w+):navStyle\(/g)].map(m => m[1]) : [];
    const faltam = usadas.filter(k => !chaves.includes(k));
    ok(!!obj && usadas.includes('flashcards'), R + '(a) o template usa navStyle.flashcards e o render() monta o objeto navStyle');
    ok(faltam.length === 0, R + '(a) todo {{ navStyle.X }} do template tem a chave no render() (faltam: ' + (faltam.join(', ') || 'nenhuma') + ')');
  }

  async function abrir(viewport, toque) {
    const c = await browser.newContext({ viewport, hasTouch: toque, isMobile: false });
    const page = await c.newPage();
    const erros = [];
    page.on('pageerror', e => erros.push(String(e && e.message || e)));
    await page.goto(base + '/__semente');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('catedra:auth', '1');
      localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:aceite', JSON.stringify({ termos: 1, privacidade: 1, ts: Date.now() }));
    });
    await page.goto(base + '/Catedra.dc.html');
    await page.waitForFunction(() => !!window.__catedraApp && !!document.querySelector('aside button[data-view="revisoes"]'), null, { timeout: 30000 });
    if (toque) {
      // o atributo de toque é o que as regras de CSS leem; sem ele o caso mediria a versão de mouse
      await page.waitForFunction(() => !!document.querySelector('[data-toque]'), null, { timeout: 20000 });
      await page.evaluate(() => { const a = window.__catedraApp; if (!a._toque) { a._toque = true; a.setState({}); } });
    }
    await page.waitForTimeout(900);
    return { c, page, erros };
  }

  /* ---------- (b) mouse: parado e ativo, igual a Revisões; contraste calculado ---------- */
  {
    const { c, page, erros } = await abrir({ width: 1280, height: 900 }, false);
    try {
      const r = await page.evaluate(async (PROPS) => {
        const w = ms => new Promise(res => setTimeout(res, ms));
        const rgb = s => { const m = /rgba?\(([^)]+)\)/.exec(s || ''); if (!m) return null;
          const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
        const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const contraste = (x, y) => { const a = lum(x), b = lum(y); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
        const btn = v => document.querySelector('aside button[data-view="' + v + '"]');
        const med = v => { const b = btn(v); const cs = getComputedStyle(b); const o = {};
          PROPS.forEach(p => { o[p] = cs[p]; }); o.altura = Math.round(b.getBoundingClientRect().height);
          o.temStyle = (b.getAttribute('style') || '').length > 0; o.cur = b.getAttribute('aria-current') || ''; return o; };
        const difs = (x, y) => Object.keys(x).filter(k => k !== 'cur' && x[k] !== y[k]).map(k => k + ': ' + x[k] + ' ≠ ' + y[k]);

        const out = {};
        const fundo = rgb(getComputedStyle(document.querySelector('aside')).backgroundColor);
        window.__catedraGoView('inicio'); await w(600);
        const fc = med('flashcards'), rv = med('revisoes');
        out.paradoDifs = difs(fc, rv);
        out.paradoTemStyle = fc.temStyle;
        out.paradoContraste = fundo && fundo.a === 1 ? +contraste(rgb(fc.color), fundo).toFixed(2) : null;
        // nenhum item VISÍVEL do menu fica sem estilo (legis/juris somem nos apps nativos, por desenho)
        out.semEstilo = [...document.querySelectorAll('aside button[data-view]')]
          .filter(b => getComputedStyle(b).display !== 'none')
          .filter(b => !(b.getAttribute('style') || '').length || getComputedStyle(b).display !== 'flex')
          .map(b => b.dataset.view);

        window.__catedraGoView('revisoes'); await w(700);
        const rvAtivo = med('revisoes');
        window.__catedraGoView('flashcards'); await w(700);
        const fcAtivo = med('flashcards');
        out.view = window.__catedraApp.state.view;
        out.ativoCur = fcAtivo.cur;
        out.ativoDifs = difs(fcAtivo, rvAtivo);
        const pontas = (fcAtivo.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(rgb);
        out.ativoGradiente = pontas.length >= 2;
        out.ativoContraste = pontas.length ? +Math.min(...pontas.map(p => contraste(rgb(fcAtivo.color), p))).toFixed(2) : null;
        out.paradoFundo = fc.backgroundColor; out.paradoCor = fc.color; out.paradoAltura = fc.altura;
        return out;
      }, PROPS);
      ok(r.paradoTemStyle, R + '(b) o Baralho recebe o atributo style do render() (vinha vazio)');
      ok(r.paradoDifs.length === 0, R + '(b) parado, o Baralho pinta igual a Revisões (' + (r.paradoDifs.slice(0, 3).join(' | ') || 'fundo ' + r.paradoFundo + ', cor ' + r.paradoCor + ', ' + r.paradoAltura + ' px') + ')');
      ok(r.paradoContraste !== null && r.paradoContraste >= 4.5, R + '(b) parado, o texto tem contraste ≥ 4,5:1 com o fundo da barra (' + r.paradoContraste + ')');
      ok(r.semEstilo.length === 0, R + '(b) nenhum item visível do menu fica sem estilo (' + (r.semEstilo.join(', ') || 'todos com estilo') + ')');
      ok(r.view === 'flashcards' && r.ativoCur === 'page', R + '(b) na tela do baralho o item é o atual (aria-current=' + (r.ativoCur || 'vazio') + ')');
      ok(r.ativoGradiente && r.ativoDifs.length === 0, R + '(b) ativo, o Baralho pinta igual a Revisões ativa — o mesmo gradiente do destaque (' + (r.ativoDifs.slice(0, 3).join(' | ') || 'igual') + ')');
      ok(r.ativoContraste !== null && r.ativoContraste >= 4.5, R + '(b) ativo, o texto tem contraste ≥ 4,5:1 com as duas pontas do gradiente (' + r.ativoContraste + ')');
      ok(!erros.length, R + '(b) sem erro de página (' + erros.slice(0, 2).join(' | ').slice(0, 160) + ')');
    } finally { await c.close(); }
  }

  /* ---------- (c) toque: ≥ 44 px no iPad em retrato e em paisagem ---------- */
  for (const [nome, viewport] of [['retrato 820', { width: 820, height: 1180 }], ['paisagem 1180', { width: 1180, height: 820 }]]) {
    const { c, page } = await abrir(viewport, true);
    try {
      const r = await page.evaluate(async () => {
        const w = ms => new Promise(res => setTimeout(res, ms));
        const a = window.__catedraApp;
        // a gaveta abre com transição de .28s: sob carga a espera precisa de folga
        if (a.state.isMobile) { a.setState({ menuOpen: true }); await w(1000); }
        const alt = v => { const b = document.querySelector('aside button[data-view="' + v + '"]'); return b ? Math.round(b.getBoundingClientRect().height * 10) / 10 : 0; };
        // outro <aside> dentro do conteúdo (o "Cartão de respostas" do ENAM é um): o quadradinho
        // .ct-miudo dele fica com o desenho — a regra de 44 px é só da barra lateral
        const main = document.querySelector('#ct-main') || document.querySelector('main');
        const outro = document.createElement('aside');
        outro.innerHTML = '<button type="button" class="ct-miudo" style="width:20px;height:20px;padding:0;">1</button>';
        main.appendChild(outro);
        const miudo = Math.round(outro.firstChild.getBoundingClientRect().height);
        outro.remove();
        return { gaveta: !!a.state.isMobile, toque: (document.querySelector('[data-toque]') || { getAttribute: () => '' }).getAttribute('data-toque'),
          fc: alt('flashcards'), rv: alt('revisoes'), cal: alt('calendario'), miudo,
          disp: getComputedStyle(document.querySelector('aside button[data-view="flashcards"]')).display };
      });
      ok(r.toque === '1', R + '(c) ' + nome + ': o host está em modo de toque (data-toque=' + r.toque + ')');
      ok(r.fc >= 44 && r.disp === 'flex', R + '(c) ' + nome + (r.gaveta ? ' (gaveta)' : ' (barra fixa)') + ': o Baralho tem alvo ≥ 44 px e o estilo do menu (' + r.fc + ' px, ' + r.disp + ')');
      ok(r.fc === r.rv && r.fc === r.cal, R + '(c) ' + nome + ': mesma altura dos irmãos (Baralho ' + r.fc + ', Revisões ' + r.rv + ', Calendário ' + r.cal + ')');
      if (!r.gaveta) ok(r.miudo === 20, R + '(c) ' + nome + ': um <aside> dentro do conteúdo não herda os 44 px — o quadradinho segue com 20 (' + r.miudo + ' px)');
    } finally { await c.close(); }
  }
}
