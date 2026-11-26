/* TEMA · O ATELIÊ COMO OPÇÃO FUTURA DO CATÁLOGO (25/11/2026)
   Pedido da dona: manter o tema atual (verde, papel, Spectral e Inter), nenhum redesign; o
   Ateliê fica só como opção futura no catálogo de temas de Ajustes.
   Parte 1 (Node, sem navegador): o Ateliê NÃO existe como direção — fora de CT_DIRS, THEMES(),
   do enum direction do data-props, do CSS [data-dir], de abertura-temas.js e do ACENTO_DIR do
   auth.js — e o cartão existe no template, com aria-disabled, sem data-dir e sem onclick, no
   fim da grade.
   Parte 2 (navegador): clicar, tocar ou apertar Enter/Espaço não muda o tema nem catedra:dir;
   a caixa é a dos irmãos e o Ateliê não estica nenhum deles, nem com texto grande; o título
   fica na fonte do corpo; o texto passa de 4,5:1 como pinta (opacidade inclusa) nas oito
   direções, em claro e escuro; e a árvore de acessibilidade entrega um botão desabilitado.
   Roda sozinho: node tests/tema-atelie-futuro.mjs (só a parte 1). */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
// as oito direções de hoje; o Ateliê não pode entrar em nenhuma cópia desta lista
const OITO = ['sutil', 'premium', 'clean', 'moderno', 'aurora', 'solar', 'terminal', 'holo'];
const mesmas = (a, b) => [...a].sort().join() === [...b].sort().join();
const SEL = '[data-tema-futuro="atelie"]';

/** O botão do Ateliê no template: de `<button` até o `</button>` dele. */
export function cartaoAtelie(fonte) {
  const i = fonte.indexOf('data-tema-futuro="atelie"');
  if (i < 0) return null;
  const ini = fonte.lastIndexOf('<button', i), fim = fonte.indexOf('</button>', i);
  if (ini < 0 || fim < 0) return null;
  const html = fonte.slice(ini, fim + '</button>'.length);
  return { ini, fim, html, abertura: html.slice(0, html.indexOf('>') + 1) };
}

export function testarTemaAtelieFuturoEstatico(ok) {
  const R = 'ATELIÊ ';
  const host = ler('Catedra.dc.html');

  // 1. a lista canônica das direções
  const mD = host.match(/const CT_DIRS = (\[[^\]]*\]);/);
  const dirs = mD ? JSON.parse(mD[1].replace(/'/g, '"')) : [];
  ok(dirs.join() === OITO.join(), R + 'CT_DIRS segue com as oito direções, sem o Ateliê (' + (dirs.join(', ') || 'lista não achada') + ')');
  // o enum direction do data-props do componente é mais uma cópia da lista
  let enumDir = null;
  try { enumDir = JSON.parse(host.match(/&quot;direction&quot;:(\{[^}]*\})/)[1].replace(/&quot;/g, '"')); } catch (_) {}
  ok(!!enumDir && (enumDir.options || []).join() === OITO.join() && enumDir.default === 'sutil' && !/atelie/i.test(JSON.stringify(enumDir)),
    R + 'o enum direction do data-props segue com as oito e o padrão sutil (' + (enumDir ? (enumDir.options || []).join(', ') : 'não achado') + ')');

  // 2. THEMES(): avaliado de verdade, não por regex — o Ateliê não tem paleta
  let temas = null;
  try {
    const iT = host.indexOf('  THEMES(){ return {'), fT = host.indexOf('};}', iT);
    temas = vm.runInNewContext('(' + host.slice(host.indexOf('{', host.indexOf('return', iT)), fT + 1) + ')');
  } catch (_) {}
  ok(!!temas && Object.keys(temas).join() === OITO.join(), R + 'THEMES() tem só as oito direções: o Ateliê não tem paleta (' + (temas ? Object.keys(temas).join(', ') : 'não avaliou') + ')');

  // 3. nenhuma regra [data-dir="atelie"] no host, no sistema visual nem nos satélites
  const comCss = fs.readdirSync(RAIZ).filter(f => /\.(css|html)$/.test(f)).concat(['tema-satelite.js']);
  const comRegra = comCss.filter(f => /\[data-dir=["']?atelie/i.test(ler(f)));
  ok(comCss.includes('catedra-ui.css') && comCss.includes('Catedra.dc.html') && comRegra.length === 0,
    R + 'nenhuma regra [data-dir="atelie"] em ' + comCss.length + ' arquivos de estilo e páginas (' + (comRegra.join(', ') || 'nenhuma') + ')');

  // 4. a abertura (gerada de THEMES) e o portão do auth.js não conhecem o Ateliê
  const caixa = { window: {} };
  try { vm.runInNewContext(ler('abertura-temas.js'), caixa); } catch (_) {}
  const abertura = Object.keys(caixa.window.CT_ABERTURA_TEMAS || {});
  ok(mesmas(abertura, OITO), R + 'abertura-temas.js segue com as oito direções (' + abertura.join(', ') + ')');
  const auth = ler('auth.js');
  let acento = null;
  try { acento = vm.runInNewContext('(' + auth.match(/var ACENTO_DIR = (\{[\s\S]*?\});/)[1] + ')'); } catch (_) {}
  ok(!!acento && mesmas(Object.keys(acento), OITO) && !/atelie/i.test(auth), R + 'o ACENTO_DIR do portão (auth.js) segue com as oito e o auth.js não cita o Ateliê');

  // 5. o cartão: botão com aria-disabled, sem caminho até o onDir, sem paleta
  const c = cartaoAtelie(host);
  ok(!!c && (host.match(/data-tema-futuro="atelie"/g) || []).length === 1, R + 'um cartão do Ateliê no template');
  if (!c) return;
  const visivel = c.html.replace(/<!--[\s\S]*?-->/g, '');
  ok(/aria-disabled="true"/.test(c.abertura), R + 'o cartão é um <button> com aria-disabled="true"');
  ok(!/\sdisabled(?=[\s=>])/.test(c.abertura), R + 'sem o atributo disabled: escrito fixo, ele não sobrevive ao runtime (vira texto vazio e o React o descarta), e tiraria o cartão do Tab');
  ok(!/onclick=/.test(c.html) && !/\bdata-dir=/.test(c.html), R + 'sem onclick e sem data-dir: nada no cartão chega ao onDir nem ao catedra:dir');
  ok(/>Ateliê</.test(visivel) && />em breve</.test(visivel) && />Opção futura — ainda não disponível\.</.test(visivel),
    R + 'traz o nome, o rótulo "em breve" e a linha curta de opção futura');
  ok(/<div style="font-family:inherit;[^"]*">Ateliê<\/div>/.test(visivel) && !/var\(--display\)/.test(visivel),
    R + 'o título usa a fonte do corpo (inherit), não a de exibição do tema ativo: o Ateliê ainda não tem tipografia');
  ok(!/#[0-9a-f]{3,6}\b/i.test(c.html) && !/<i[\s>]/.test(c.html), R + 'sem paleta: nenhuma amostra de cor nem hex no cartão');
  ok(!/px/.test(visivel), R + 'o template do cartão não acrescenta px (espaços por token; a caixa vem do dirCard dos irmãos)');

  // 6. o último da grade da Direção visual, logo depois do Holo
  const iHolo = host.indexOf('data-dir="holo" onclick');
  const fimHolo = host.indexOf('</button>', iHolo) + '</button>'.length;
  const entre = host.slice(fimHolo, c.ini).replace(/<!--[\s\S]*?-->/g, '').trim();
  ok(iHolo > 0 && c.ini > iHolo && entre === '' && host.slice(c.fim + '</button>'.length).trimStart().startsWith('</div>'),
    R + 'o cartão é o último da grade da Direção visual, logo depois do Holo');
  const iGrade = host.lastIndexOf('<div style="display:grid;', host.indexOf('data-dir="sutil" onclick'));
  const grade = host.slice(iGrade, host.indexOf('>', iGrade));
  ok(/grid-auto-rows:1fr/.test(grade), R + 'a grade iguala as linhas (grid-auto-rows:1fr): o cartão tem a caixa dos irmãos mesmo sozinho na linha');

  // 7. o estilo nasce do dirCard dos irmãos e só muda o que diz "indisponível"
  const mR = host.match(/dirCardAtelie:dirCard\('atelie'\)\+'([^']*)'/);
  const extra = mR ? mR[1] : '';
  ok(/border-style:dashed/.test(extra) && /background:var\(--surface2\)/.test(extra) && /cursor:not-allowed/.test(extra) && /opacity:1;/.test(extra),
    R + 'estilo = dirCard dos irmãos + borda tracejada, fundo recuado, cursor de bloqueio e opacidade 1 (' + (extra || 'não achado') + ')');
  ok(!!mR && !/#[0-9a-f]{3,6}/i.test(extra) && !/\d+px/.test(extra), R + 'o acréscimo de estilo só usa tokens');

  // 8. a regra do teste TEMA da suíte continua valendo: toda direção na tela está em CT_DIRS
  const naTela = [...new Set([...host.matchAll(/data-dir="([a-z]+)"/g)].map(x => x[1]))];
  ok(naTela.length >= 8 && naTela.every(d => dirs.includes(d)) && !naTela.includes('atelie'), R + 'toda direção oferecida na tela continua em CT_DIRS (' + naTela.join(', ') + ')');

  // 9. DESIGN.md: uma linha, como opção futura, sem paleta
  const design = ler('DESIGN.md');
  const linhas = design.split('\n').filter(l => /Ateliê/.test(l));
  ok(linhas.length === 1 && /opção futura/i.test(linhas[0]) && /não tem paleta/.test(linhas[0]) && !/#[0-9a-f]{3,6}\b/i.test(linhas[0]),
    R + 'DESIGN.md registra o Ateliê numa linha, como opção futura e sem paleta');
  ok(/oito direções visuais/.test(design), R + 'DESIGN.md continua com oito direções visuais');
}

/* ---- Parte 2: navegador ---- */
const lum = (c) => { const m = String(c).match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

async function abrirAjustes(browser, base, { viewport, toque, dir, escuro, arquivo }) {
  const ctx = await browser.newContext({ viewport, hasTouch: !!toque });
  try {
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
    // semente ANTES de o app abrir: semear com o app aberto é corrida com o autosave (500 ms)
    await page.goto(base + '/__semente');
    await page.evaluate(({ dir, escuro }) => {
      localStorage.clear();
      ['auth', 'onboarded'].forEach(k => localStorage.setItem('catedra:' + k, '1'));
      localStorage.setItem('catedra:areaEstudo', 'juridica');
      localStorage.setItem('catedra:dir', dir);             // string crua, como o onDir grava
      localStorage.setItem('catedra:dark', escuro ? '1' : '0');
    }, { dir, escuro });
    await page.goto(base + '/' + (arquivo || 'Catedra.dc.html'));
    await page.waitForFunction(() => !!window.__catedraApp && typeof window.__catedraGoView === 'function', null, { timeout: 60000 });
    await page.evaluate(() => new Promise(r => window.__catedraApp.setState({ ajSec: 'aparencia' }, () => { window.__catedraGoView('ajustes'); r(); })));
    await page.waitForSelector(SEL, { timeout: 20000 });
    // a troca de tela pode estar no meio de um fade: espera a opacidade efetiva assentar (sem
    // lançar — se o cartão ficar apagado de verdade, a medição abaixo é que acusa)
    await page.waitForFunction(s => { let o = 1; for (let e = document.querySelector(s); e; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o === 1; }, SEL, { timeout: 5000 }).catch(() => {});
    return { ctx, page };
  } catch (e) {
    // abertura que falha não deixa contexto vivo: página esquecida na frente rebaixa a da
    // suíte no Chrome do Mac (PRI 4) e, sob carga, trava os blocos seguintes
    await ctx.close().catch(() => {});
    throw e;
  }
}

// o tema como está agora: no estado, no disco e no nó raiz (o único com data-dark)
const temaAgora = (page) => page.evaluate(() => {
  const raiz = document.querySelector('[data-dark][data-dir]');
  return { estado: window.__catedraApp.state.dir, disco: localStorage.getItem('catedra:dir'),
    raiz: raiz && raiz.getAttribute('data-dir'), escuro: raiz && raiz.getAttribute('data-dark') };
});

// rola o cartão para o meio e devolve o centro, conferindo que o ponto cai NELE
async function centroDoCartao(page) {
  await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), SEL);
  await page.waitForTimeout(400);
  return page.evaluate(s => {
    const e = document.querySelector(s), r = e.getBoundingClientRect();
    const x = r.x + r.width / 2, y = r.y + r.height / 2, alvo = document.elementFromPoint(x, y);
    return { x, y, chega: !!alvo && e.contains(alvo) };
  }, SEL);
}

// texto e fundo COMO PINTAM: fundos sólidos compostos e a opacidade efetiva misturada com o
// que está atrás do cartão (o .55 do aria-disabled apagaria texto e fundo juntos); e caixas
function medirCartao(s) {
  const card = document.querySelector(s);
  const raiz = document.querySelector('[data-dark][data-dir]');
  const rgba = c => { const m = String(c).match(/[\d.]+/g); return m && m.length >= 3 ? { r: +m[0], g: +m[1], b: +m[2], a: m.length > 3 ? +m[3] : 1 } : null; };
  const sobre = (f, t) => ({ r: f.r * f.a + t.r * (1 - f.a), g: f.g * f.a + t.g * (1 - f.a), b: f.b * f.a + t.b * (1 - f.a), a: 1 });
  const cadeia = el => { const c = []; for (let e = el; e; e = e.parentElement) c.push(e); return c; };
  const fundo = el => cadeia(el).reverse().reduce((cor, e) => { const c = rgba(getComputedStyle(e).backgroundColor); return c && c.a > 0 ? sobre(c, cor) : cor; }, { r: 255, g: 255, b: 255, a: 1 });
  const css = c => 'rgb(' + Math.round(c.r) + ', ' + Math.round(c.g) + ', ' + Math.round(c.b) + ')';
  const textos = [...card.querySelectorAll('*')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
  const caixa = e => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; };
  const irmao = document.querySelector('button[data-dir="sutil"]');
  const cs = getComputedStyle(card), atras = fundo(card.parentElement);
  return {
    textos: textos.map(e => {
      const bg = fundo(e), ate = cadeia(e).slice(0, cadeia(e).indexOf(card) + 1);
      const opac = cadeia(e).reduce((o, x) => o * parseFloat(getComputedStyle(x).opacity), 1);
      const pinta = c => sobre({ ...c, a: opac }, atras);
      return { t: e.textContent.trim(), fg: css(pinta(sobre(rgba(getComputedStyle(e).color), bg))), bg: css(pinta(bg)), opac,
        semImagem: ate.every(x => getComputedStyle(x).backgroundImage === 'none'), ...caixa(e) };
    }),
    caixa: caixa(card), irmaos: [...card.parentElement.children].filter(b => b !== card).map(caixa),
    borda: cs.borderTopStyle, cursor: cs.cursor, fundo: cs.backgroundColor, fundoIrmao: getComputedStyle(irmao).backgroundColor,
    amostras: card.querySelectorAll('i').length,
    // o título na fonte do corpo (a do nó raiz), não na de exibição do tema ativo
    fonteTitulo: getComputedStyle(card.children[0]).fontFamily, fonteCorpo: getComputedStyle(raiz).fontFamily,
    tamCorpo: getComputedStyle(raiz).fontSize,
    escuro: raiz.getAttribute('data-dark'), dir: raiz.getAttribute('data-dir'),
  };
}

// o Ateliê não pode esticar os irmãos: as caixas deles com e sem o Ateliê na grade
// (getBoundingClientRect força o layout na hora; o cartão volta como estava)
function efeitoNosIrmaos(s) {
  const card = document.querySelector(s);
  const irmaos = [...card.parentElement.children].filter(b => b !== card);
  const caixas = () => irmaos.map(b => { const r = b.getBoundingClientRect(); return { w: r.width, h: r.height }; });
  const com = caixas(), antes = card.style.display;
  card.style.display = 'none';
  const sem = caixas();
  card.style.display = antes;
  return { com, sem };
}

const igual = (a, b) => Math.abs(a - b) <= 0.5;
const mesmaCaixa = (m) => m.irmaos.length === 8 && m.irmaos.every(i => igual(i.w, m.caixa.w) && igual(i.h, m.caixa.h));
const semEfeito = (e) => e.com.length === 8 && e.com.every((c, i) => igual(c.w, e.sem[i].w) && igual(c.h, e.sem[i].h));
const px = (c) => Math.round(c.w) + '×' + Math.round(c.h);
const caixas = (m) => 'Ateliê ' + px(m.caixa) + ', irmãos ' + [...new Set(m.irmaos.map(px))].join('/');
const alturas = (lista) => [...new Set(lista.map(c => Math.round(c.h)))].join('/');
const efeito = (e) => 'irmãos ' + alturas(e.sem) + ' sem ele, ' + alturas(e.com) + ' com ele';
// aplica estado e espera dois quadros (o runtime pinta no commit do React); grande: true liga o
// texto grande das preferências, como o botão "Grande" da Aparência
const aplicar = (page, patch) => page.evaluate(p => new Promise(r => {
  const app = window.__catedraApp, novo = Object.assign({}, p);
  if (novo.grande) novo.prefs = Object.assign({}, app.state.prefs, { fontScale: 'grande' });
  delete novo.grande;
  app.setState(novo, () => requestAnimationFrame(() => requestAnimationFrame(r)));
}), patch);

export async function testarTemaAtelieFuturo(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const R = 'ATELIÊ [' + motor + '] ';
  const browser = pageDaSuite.context().browser();
  let ctx = null, page = null;

  /* (A) mesa, mouse e teclado — começa no Tribunal, que não é o padrão: um clique que
     "resetasse" o tema também apareceria aqui. Cada parte abre e fecha o próprio contexto
     dentro do try: a (B) roda mesmo se a (A) cair. */
  try {
    ({ ctx, page } = await abrirAjustes(browser, base, { viewport: { width: 1280, height: 900 }, dir: 'premium', escuro: false, arquivo: opcoes.arquivo }));
    const card = page.locator(SEL);
    const attrs = await card.evaluate(e => ({ tag: e.tagName, ad: e.getAttribute('aria-disabled'), dis: e.hasAttribute('disabled'), tab: e.tabIndex,
      naGrade: e.parentElement === document.querySelector('button[data-dir="sutil"]').parentElement, ultimo: !e.nextElementSibling }));
    ok(attrs.tag === 'BUTTON' && attrs.ad === 'true' && !attrs.dis && attrs.tab === 0, R + 'pinta como <button aria-disabled="true">, sem disabled e alcançável pelo Tab (tabIndex ' + attrs.tab + ')');
    ok(attrs.naGrade && attrs.ultimo, R + 'está na grade da Direção visual, depois das oito direções');

    // o leitor de tela: botão desabilitado com o nome e o "em breve"
    ok(await page.getByRole('button', { name: /Ateliê/, disabled: true }).count() === 1
      && await page.getByRole('button', { name: /Ateliê/, disabled: false }).count() === 0, R + 'a semântica ARIA entrega um botão desabilitado (getByRole)');
    const snap = await card.ariaSnapshot();
    ok(/button "Ateliê[^"]*em breve"/.test(snap) && /\[disabled\]/.test(snap), R + 'o snapshot de acessibilidade lê "Ateliê … em breve" [disabled] (' + snap.trim().slice(0, 110) + ')');
    if (motor === 'chromium') {
      // a árvore de acessibilidade do PRÓPRIO navegador (a que o leitor de tela consome)
      const cdp = await page.context().newCDPSession(page);
      const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: SEL });
      const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      const no = nodes.find(n => !n.ignored) || {};
      const props = Object.fromEntries((no.properties || []).map(p => [p.name, p.value && p.value.value]));
      ok(no.role && no.role.value === 'button' && props.disabled === true && /Ateliê/.test(no.name && no.name.value) && props.focusable === true,
        R + 'a árvore de acessibilidade do Chromium: botão, desabilitado, focável, nome "' + String(no.name && no.name.value).slice(0, 60) + '"');
      await cdp.detach();
    }

    // clique de mouse de verdade, no centro do cartão
    const antes = await temaAgora(page);
    ok(antes.estado === 'premium' && antes.disco === 'premium' && antes.raiz === 'premium', R + 'começa no Tribunal (estado, disco e raiz)');
    const c = await centroDoCartao(page);
    ok(c.chega, R + 'o ponto do clique cai no cartão (nada por cima)');
    await page.mouse.click(c.x, c.y);
    await page.waitForTimeout(1400);   // autosave (500 ms) + folga
    const depoisClique = await temaAgora(page);
    ok(JSON.stringify(depoisClique) === JSON.stringify(antes), R + 'clicar não muda o tema nem catedra:dir (' + JSON.stringify(depoisClique) + ')');

    // teclado: foco no cartão, Enter e Espaço
    await card.evaluate(e => e.focus());
    ok(await card.evaluate(e => document.activeElement === e), R + 'o cartão recebe foco (o leitor de tela chega nele)');
    await page.keyboard.press('Enter');
    await page.keyboard.press(' ');
    await page.waitForTimeout(1400);
    const depoisTecla = await temaAgora(page);
    ok(JSON.stringify(depoisTecla) === JSON.stringify(antes), R + 'Enter e Espaço não mudam o tema nem catedra:dir');

    // as oito direções, em claro e escuro: caixa dos irmãos e texto ≥ 4,5:1, opacidade 1
    const falhasContraste = [], falhasCaixa = [], falhasVisual = [], falhasFonte = [], falhasEfeito = [];
    let piorContraste = 99, medidos = 0, aplicados = 0;
    for (const dir of OITO) for (const escuro of [false, true]) {
      await aplicar(page, { dir, darkMode: escuro });
      const m = await page.evaluate(medirCartao, SEL);
      const nome = dir + (escuro ? ' escuro' : ' claro');
      if (m.dir === dir && m.escuro === (escuro ? '1' : '0')) aplicados++;
      if (m.textos.length !== 3 || m.textos.some(t => !(t.w > 0 && t.h > 0))) falhasVisual.push(nome + ': ' + m.textos.length + ' textos pintados');
      for (const t of m.textos) {
        const k = contraste(t.fg, t.bg); medidos++;
        piorContraste = Math.min(piorContraste, k);
        if (k < 4.5 || !t.semImagem) falhasContraste.push(nome + ' "' + t.t.slice(0, 12) + '" ' + k.toFixed(2) + ':1 (opacidade ' + +t.opac.toFixed(2) + ')');
      }
      if (!mesmaCaixa(m)) falhasCaixa.push(nome + ': ' + caixas(m));
      if (m.borda !== 'dashed' || m.cursor !== 'not-allowed' || m.fundo === m.fundoIrmao || m.amostras !== 0) falhasVisual.push(nome + ': borda ' + m.borda + ', cursor ' + m.cursor + ', fundo ' + m.fundo + ' × ' + m.fundoIrmao + ', amostras ' + m.amostras);
      if (m.fonteTitulo !== m.fonteCorpo) falhasFonte.push(nome + ': ' + m.fonteTitulo.slice(0, 28));
      const ef = await page.evaluate(efeitoNosIrmaos, SEL);
      if (!semEfeito(ef)) falhasEfeito.push(nome + ': ' + efeito(ef));
    }
    ok(aplicados === 16, R + 'as 16 combinações (oito direções × claro/escuro) chegaram ao nó raiz (' + aplicados + ')');
    ok(medidos === 48 && falhasContraste.length === 0, R + 'título, linha e selo passam de 4,5:1 como pintam (opacidade inclusa) nas 16 combinações (pior ' + piorContraste.toFixed(2) + ':1' + (falhasContraste.length ? '; ' + falhasContraste.slice(0, 3).join('; ') : '') + ')');
    ok(falhasCaixa.length === 0, R + 'a caixa é a mesma dos oito irmãos nas 16 combinações' + (falhasCaixa.length ? ' (' + falhasCaixa.slice(0, 3).join('; ') + ')' : ''));
    ok(falhasVisual.length === 0, R + 'visivelmente indisponível nas 16: borda tracejada, cursor de bloqueio, fundo recuado e sem amostras de cor' + (falhasVisual.length ? ' (' + falhasVisual.slice(0, 2).join('; ') + ')' : ''));
    ok(falhasFonte.length === 0, R + 'o título fica na fonte do corpo nas 16 combinações, sem a tipografia do tema ativo' + (falhasFonte.length ? ' (' + falhasFonte.slice(0, 3).join('; ') + ')' : ''));
    ok(falhasEfeito.length === 0, R + 'o Ateliê não estica nenhum dos oito irmãos nas 16 combinações (caixas com e sem ele)' + (falhasEfeito.length ? ' (' + falhasEfeito.slice(0, 3).join('; ') + ')' : ''));

    // texto grande: é aí que uma linha comprida faria do cartão sem função o mais alto da
    // grade — e, com as linhas iguais, ele esticaria os oito cartões de verdade
    const falhasGrande = [];
    let grandes = 0;
    for (const dir of OITO) {
      await aplicar(page, { dir, darkMode: false, grande: true });
      const m = await page.evaluate(medirCartao, SEL), ef = await page.evaluate(efeitoNosIrmaos, SEL);
      if (m.tamCorpo === '16.5px' && m.dir === dir) grandes++;
      if (!mesmaCaixa(m) || !semEfeito(ef)) falhasGrande.push(dir + ': ' + caixas(m) + '; ' + efeito(ef));
    }
    ok(grandes === 8 && falhasGrande.length === 0, R + 'com texto grande, nas oito direções: o Ateliê tem a caixa dos irmãos e não estica nenhum (' + grandes + ' de 8 em 16,5 px' + (falhasGrande.length ? '; ' + falhasGrande.slice(0, 2).join('; ') : '') + ')');
  } catch (e) { ok(false, R + 'mesa: exceção ' + String(e && e.message || e).split('\n')[0].slice(0, 160)); }
  finally { if (ctx) await ctx.close().catch(() => {}); ctx = null; }

  /* (B) iPad, no toque, começando no escuro: o toque não muda nada e a caixa é ≥ 44 px */
  try {
    ({ ctx, page } = await abrirAjustes(browser, base, { viewport: { width: 820, height: 1180 }, toque: true, dir: 'sutil', escuro: true, arquivo: opcoes.arquivo }));
    const antes = await temaAgora(page);
    ok(antes.disco === 'sutil' && antes.escuro === '1', R + 'iPad: começa na Planilha, no escuro');
    for (const escuro of [true, false]) {
      if (!escuro) await aplicar(page, { darkMode: false });
      const m = await page.evaluate(medirCartao, SEL), ef = await page.evaluate(efeitoNosIrmaos, SEL);
      const nome = 'iPad ' + (escuro ? 'escuro' : 'claro');
      ok(m.escuro === (escuro ? '1' : '0') && m.caixa.w >= 44 && m.caixa.h >= 44 && mesmaCaixa(m) && semEfeito(ef),
        R + nome + ': caixa ≥ 44 px no toque, igual à dos irmãos e sem esticar nenhum (' + caixas(m) + '; ' + efeito(ef) + ')');
      const ks = m.textos.map(t => contraste(t.fg, t.bg));
      ok(m.textos.length === 3 && ks.every(k => k >= 4.5), R + nome + ': texto ≥ 4,5:1 como pinta (' + ks.map(k => k.toFixed(2)).join(', ') + ')');
    }
    await aplicar(page, { darkMode: true });
    await page.waitForTimeout(1400);
    const base2 = await temaAgora(page);
    const c = await centroDoCartao(page);
    ok(c.chega, R + 'iPad: o ponto do toque cai no cartão');
    await page.touchscreen.tap(c.x, c.y);
    await page.waitForTimeout(1400);
    const depois = await temaAgora(page);
    ok(JSON.stringify(depois) === JSON.stringify(base2) && depois.disco === 'sutil', R + 'iPad: tocar não muda o tema nem catedra:dir (' + JSON.stringify(depois) + ')');
    // texto grande também no iPad (a medida do aparelho da dona)
    await aplicar(page, { grande: true });
    const mg = await page.evaluate(medirCartao, SEL), efg = await page.evaluate(efeitoNosIrmaos, SEL);
    ok(mg.tamCorpo === '16.5px' && mesmaCaixa(mg) && semEfeito(efg), R + 'iPad, texto grande: caixa dos irmãos e nenhum irmão esticado (' + caixas(mg) + '; ' + efeito(efg) + ')');
  } catch (e) { ok(false, R + 'iPad: exceção ' + String(e && e.message || e).split('\n')[0].slice(0, 160)); }
  finally { if (ctx) await ctx.close().catch(() => {}); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let falhas = 0, total = 0;
  testarTemaAtelieFuturoEstatico((c, m) => { total++; if (!c) { falhas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); });
  console.log(falhas ? ('\nFALHAS: ' + falhas + ' de ' + total) : ('\n' + total + ' verificações passaram'));
  process.exit(falhas ? 1 : 0);
}
