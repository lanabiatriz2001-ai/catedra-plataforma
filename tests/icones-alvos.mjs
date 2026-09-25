/* ÍCONES, ALVOS DE TOQUE E A NOTA DA ORAL — o banner do Início e o que mora em volta (25/09/2026)

   Três defeitos do mesmo passe de acabamento, cada um MEDIDO no Catedra.dc.html real:

   · (a) EMOJI COMO ÍCONE. O banner do Início desenhava 🎯 (objetivo), 🔥 (ofensiva), 🛡️
         (escudos) e 📅 (dias para a prova) — e o resto do Início, a barra lateral e o painel de
         notificações da barra de cima também (↩️, 📕, ⚖️, 🔍, ⏰, 🔁…). O DESIGN.md proíbe: ícone é
         SVG Lucide de 16 px, stroke currentColor e aria-hidden. A varredura percorre os NÓS DE
         TEXTO visíveis do Início, da barra lateral, da barra de cima e do painel de notificações
         e acusa qualquer caractere que pinte como emoji colorido (Emoji_Presentation, ou
         pictográfico seguido de U+FE0F). Nessas superfícies não há texto livre da pessoa além do
         que a semente controla — então todo emoji ali é ícone. Os SVGs que entraram no lugar
         (marcados com data-ico, o nome Lucide) são medidos: caixa de 16×16, aria-hidden="true" e
         stroke="currentColor". E o nome acessível não piora: a ficha da ofensiva, que só tinha o
         número, ganha o rótulo.
   · (b) ALVOS DE TOQUE DO CRONÔMETRO. Os ritmos (Livre, 25·5, 50·10, 90·15) e Iniciar/Zerar
         tinham 28–40 px de altura no toque. Com ponteiro grosso (hasTouch + o atributo
         data-toque="1" que o app acende em _toque, como os testes do iPad fazem) todo alvo do
         cronômetro — e todo controle visível do Início — mede ≥ 44×44 (a caixa, ou a área do
         ::after de .ct-alvo quando o desenho é pequeno de propósito). No desktop, com mouse, o
         desenho continua o mesmo: nenhum min-height vaza, o padding é o de sempre.
   · (c) A NOTA DA PROVA ORAL. O fundo era 'var(--ok)'+'1f' — hex com alfa colado num var(), que
         não é cor nenhuma: o navegador descarta a declaração e a pílula não tinha fundo. Agora o
         fundo PINTA (getComputedStyle não transparente) nas três notas e nos dois modos, e o
         texto sobre ele passa de 4,5:1.

   Contexto próprio por caso; semente por base+'/__semente' (404 na mesma origem) antes de o app
   abrir, para não correr contra o autosave de 500 ms. Só em http. */

const EMOJI = /\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u;
const ALVO = 44;

export async function testarIconesAlvos(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const R = 'ÍCONES/ALVOS [' + motor + '] ';
  const browser = pageDaSuite.context().browser();
  const w = ms => new Promise(r => setTimeout(r, ms));

  async function abrir(viewport, toque, escuro = false, extra = {}) {
    const ctx = await browser.newContext({ viewport, hasTouch: !!toque, isMobile: !!toque && viewport.width < 900 && motor !== 'firefox' });
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', e => erros.push(String(e && e.message || e)));
    await page.goto(base + '/__semente');
    await page.evaluate(semear);
    await page.goto(base + '/Catedra.dc.html');
    await page.waitForFunction(() => !!window.__catedraApp && typeof window.__catedraGoView === 'function' && !!document.querySelector('[data-toque]'), null, { timeout: 30000 });
    await page.evaluate(({ toque, escuro, extra }) => new Promise(r => { const a = window.__catedraApp;
      a._toque = !!toque;
      const prova = new Date(Date.now() + 120 * 864e5).toISOString().slice(0, 10);
      // "Continuar de onde parei" aparece quando há um ponto recente em outra tela
      const ponto = { rotulo: 'Lei 8.112/1990 · art. 5º', view: 'legis', ts: Date.now() - 36e5 };
      a.setState({ dir: 'sutil', accent: null, darkMode: !!escuro, escudos: 2, provaData: prova, notifOpen: false, lastPonto: ponto,
        ...(extra.estado || {}),
        prefs: { ...a.state.prefs, objetivo: 'Magistratura TJSP', ...(extra.prefs || {}) } }, () => { try { a._temaBroadcast(); } catch (_) {}
        window.__catedraGoView('inicio'); r(); }); }), { toque, escuro, extra });
    await page.waitForFunction(() => { const h = document.querySelector('.cth-hero'); return !!h && h.getBoundingClientRect().width > 0; }, null, { timeout: 10000 });
    await w(900);
    return { ctx, page, erros };
  }

  /* ---------------- (a) emoji como ícone: desktop, claro ---------------- */
  {
    const { ctx, page, erros } = await abrir({ width: 1280, height: 1000 }, false);
    try {
      const r = await page.evaluate(varrerIcones);
      ok(r.chips.objetivo && r.chips.ofensiva && r.chips.escudos && r.chips.prova,
        R + '(a) o banner mostra as quatro fichas medidas (objetivo ' + r.chips.objetivo + ', ofensiva ' + r.chips.ofensiva + ', escudos ' + r.chips.escudos + ', prova ' + r.chips.prova + ')');
      ok(r.emojis.length === 0, R + '(a) nenhum emoji como ícone no Início, na barra lateral e na barra de cima (' + r.nos + ' nós de texto varridos; achados: ' + (r.emojis.join(' | ') || 'nenhum') + ')');
      for (const [k, nome] of [['objetivo', 'target'], ['ofensiva', 'flame'], ['escudos', 'shield'], ['prova', 'calendar-days'], ['cronometro', 'play']]) {
        const s = r.banner[k];
        ok(!!s && s.ico === nome && s.oculto && s.w === 16 && s.h === 16 && s.stroke === 'currentColor',
          R + '(a) banner · ' + k + ': SVG Lucide "' + nome + '" de 16×16, aria-hidden e stroke currentColor (' + (s ? s.ico + ' ' + s.w + '×' + s.h + ' aria-hidden=' + s.ariaHidden + ' stroke=' + s.stroke : 'sem SVG') + ')');
      }
      ok(r.svgs.length >= 8 && r.svgsRuins.length === 0,
        R + '(a) todo SVG novo (data-ico) visível é 16×16, aria-hidden e currentColor (' + r.svgs.length + ' medidos: ' + r.svgs.join(', ') + (r.svgsRuins.length ? '; fora: ' + r.svgsRuins.join(' / ') : '') + ')');
      ok(/ofensiva/i.test(r.nomeOfensiva) && /\d/.test(r.nomeOfensiva), R + '(a) a ficha da ofensiva tem nome acessível com a palavra e o número («' + r.nomeOfensiva + '»)');
      ok(r.textoEscudos === '2 escudos' && r.textoProva === '120 dias p/ prova' && r.textoIniciar === 'Iniciar',
        R + '(a) o texto das fichas e do botão continua («' + r.textoEscudos + '», «' + r.textoProva + '», «' + r.textoIniciar + '»)');
      // o painel de notificações da barra de cima
      await page.evaluate(() => new Promise(r => window.__catedraApp.setState({ notifOpen: true }, r)));
      await w(400);
      const n = await page.evaluate(varrerNotificacoes);
      ok(n.itens >= 3 && n.emojis.length === 0 && n.semSvg === 0,
        R + '(a) painel de notificações: ' + n.itens + ' avisos, cada um com SVG e nenhum emoji (' + (n.emojis.join(' | ') || 'nenhum') + '; ícones: ' + n.icos.join(', ') + ')');
      // a busca da barra de cima (⌘K): o ícone de cada resultado de conteúdo (lei, verbete, peça, rito)
      await page.evaluate(() => new Promise(r => { const a = window.__catedraApp; a.setState({ notifOpen: false }, () => { a.openPalette(); a.setState({ paletteQuery: 'prescrição' }, r); }); }));
      // o índice dos acervos carrega sob demanda (leis, verbetes, peças, ritos por <script>)
      await page.waitForFunction(() => window.__catedraApp.state.palBuscaPronta === true, null, { timeout: 30000 }).catch(() => {});
      await page.evaluate(() => new Promise(r => window.__catedraApp.setState({ paletteQuery: 'prescrição ' }, r)));
      await w(600);
      const p = await page.evaluate(varrerPaleta);
      ok(p.icos.length >= 2 && p.emojis.length === 0 && p.ruins.length === 0,
        R + '(a) busca da barra de cima: ' + p.icos.length + ' resultados com SVG 16×16 aria-hidden e nenhum emoji (ícones: ' + [...new Set(p.icos)].join(', ') + (p.emojis.length ? '; emojis: ' + p.emojis.join(' | ') : '') + (p.ruins.length ? '; fora: ' + p.ruins.join(' / ') : '') + ')');
      ok(!erros.length, R + '(a) sem erro de página (' + (erros[0] || 'nenhum') + ')');
    } finally { await ctx.close(); }
  }

  /* ---------------- (b) alvos de toque: iPad em retrato e iPhone ---------------- */
  for (const vp of [{ width: 820, height: 1180 }, { width: 390, height: 844 }]) {
    const { ctx, page } = await abrir(vp, true, false, { estado: { timerRunning: true }, prefs: { focoBloco: 45, focoPausa: 10 } });
    try {
      const r = await page.evaluate(medirAlvos);
      const rot = R + '(b) ' + vp.width + 'px no toque';
      ok(r.toque, rot + ': o atributo data-toque="1" está aceso');
      ok(r.ritmos.length >= 5 && r.ritmos.every(b => b.w >= ALVO && b.h >= ALVO),
        rot + ': ritmos do cronômetro ≥ 44×44 (' + r.ritmos.map(b => b.t + ' ' + b.w + '×' + b.h).join(', ') + ')');
      ok(r.acoes.length >= 3 && r.acoes.every(b => b.w >= ALVO && b.h >= ALVO),
        rot + ': Iniciar/Zerar/Registrar ≥ 44×44 (' + r.acoes.map(b => b.t + ' ' + b.w + '×' + b.h).join(', ') + ')');
      ok(r.total >= 15 && r.pequenos.length === 0,
        rot + ': todo controle visível do Início tem alvo ≥ 44×44 (' + r.total + ' medidos; abaixo: ' + (r.pequenos.join(' / ') || 'nenhum') + ')');
    } finally { await ctx.close(); }
  }
  /* ---------------- (b) desktop: o desenho não muda ---------------- */
  {
    const { ctx, page } = await abrir({ width: 1280, height: 1000 }, false);
    try {
      const r = await page.evaluate(medirAlvos);
      ok(!r.toque, R + '(b) desktop: sem data-toque (mouse)');
      ok(r.ritmos.length >= 4 && r.ritmos.every(b => b.h < 36 && b.pad === '6px 13px' && (b.minH === '0px' || b.minH === 'auto')),
        R + '(b) desktop: os ritmos seguem pílulas baixas, sem min-height (' + r.ritmos.map(b => b.t + ' ' + b.w + '×' + b.h + ' pad ' + b.pad + ' min ' + b.minH).join(', ') + ')');
      ok(r.acoes.length >= 3 && r.acoes.filter(b => b.cls === 'cth-bghost').every(b => b.h < ALVO && b.pad === '10px 16px' && (b.minH === '0px' || b.minH === 'auto')),
        R + '(b) desktop: Iniciar/Zerar com o padding de sempre e sem min-height (' + r.acoes.map(b => b.t + ' ' + b.w + '×' + b.h + ' pad ' + b.pad + ' min ' + b.minH).join(', ') + ')');
    } finally { await ctx.close(); }
  }

  /* ---------------- (c) a nota da prova oral pinta ---------------- */
  for (const escuro of [false, true]) {
    const { ctx, page, erros } = await abrir({ width: 1280, height: 1000 }, false, escuro);
    try {
      const modo = escuro ? 'no escuro' : 'no claro';
      for (const nota of ['boa', 'media', 'fraca']) {
        const m = await page.evaluate(medirNotaOral, nota);
        if (!m.achou) { ok(false, R + '(c) nota da oral «' + nota + '» ' + modo + ': a pílula apareceu (' + m.motivo + ')'); continue; }
        ok(m.alfa > 0.05 && m.pinta, R + '(c) nota da oral «' + m.txt + '» ' + modo + ': o fundo pinta (' + m.fundo + ', alfa ' + m.alfa + ')');
        ok(m.contraste >= 4.5, R + '(c) nota da oral «' + m.txt + '» ' + modo + ': texto ' + m.contraste + ':1 (' + m.cor + ' sobre ' + m.composto + ')');
      }
      ok(!erros.length, R + '(c) sem erro de página ' + modo + ' (' + (erros[0] || 'nenhum') + ')');
    } finally { await ctx.close(); }
  }
}

function semear() {
  const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
  localStorage.clear();
  set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
  set('aceite', { termos: 1, privacidade: 1, ts: Date.now() });
  set('cycleMode', 'manual'); set('blocks', []); set('agendaFeitas', {});
  set('edital', [{ disc: 'Direito Civil', peso: 3, questoes: 20, color: '#2563eb',
    topics: [{ name: 'Obrigações', done: false, subs: [{ name: 'Adimplemento' }] }] }]);
  const ymd = t => { const d = new Date(t), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
  // sessões nos três dias anteriores: a ofensiva tem número, o gráfico tem barra
  set('sessions', [1, 2, 3].map(i => { const ts = Date.now() - i * 864e5;
    return { id: 's' + i, ts, date: ymd(ts), disc: 'Direito Civil', topico: 'Obrigações', categoria: 'Teoria', categorias: ['Teoria'],
      min: 50, questoes: 10, acertos: 7, erradas: 3, brancos: 0, liquido: 4, foco: 4, nota: '', discPct: null, materialId: null, countMeta: true }; }));
  set('errors', []); set('fc', []); set('leituras', []);
  const ontem = ymd(Date.now() - 864e5);
  set('reviews', [{ id: 'r1', disc: 'Direito Civil', topic: 'Obrigações', due: ontem, date: ontem, stage: 1, up: Date.now() }]);
  const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  set('manualFixed', [{ id: 'ag-civil', disc: 'Direito Civil', kind: 'Teoria', min: 90, dia: DIAS[new Date().getDay()],
    roteiro: '', discEdital: 'Direito Civil', topico: 'Obrigações', subtopico: 'Adimplemento' }]);
}

/* ---------- no navegador ---------- */
function varrerIcones() {
  const EMO = /\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u;
  const vis = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility === 'visible';
  const raizes = [document.querySelector('main'), document.querySelector('[data-dir] > aside'), document.querySelector('.ct-bnav')].filter(Boolean);
  const emojis = []; let nos = 0;
  for (const raiz of raizes) {
    const tw = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement; if (!vis(el)) continue;
      nos++;
      const m = n.textContent.match(EMO);
      if (m) emojis.push(m[0] + ' em <' + el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') + '> «' + n.textContent.trim().slice(0, 40) + '»');
    }
  }
  const svgInfo = s => { if (!s) return null; const b = s.getBoundingClientRect();
    return { ico: s.getAttribute('data-ico'), w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10,
      ariaHidden: s.getAttribute('aria-hidden'), oculto: s.getAttribute('aria-hidden') === 'true', stroke: s.getAttribute('stroke') }; };
  const chips = [...document.querySelectorAll('.cth-hero .cth-chip')];
  const porTexto = re => chips.find(c => re.test(c.textContent));
  const kicker = document.querySelector('.cth-hero .cth-kicker');
  const ofensiva = document.querySelector('.cth-hero .cth-chip.ct-gam');
  const escudos = porTexto(/escudos/), prova = porTexto(/dias p\/ prova/);
  const banner = { objetivo: svgInfo(kicker && kicker.querySelector('svg')), ofensiva: svgInfo(ofensiva && ofensiva.querySelector('svg')),
    escudos: svgInfo(escudos && escudos.querySelector('svg')), prova: svgInfo(prova && prova.querySelector('svg')),
    cronometro: svgInfo(document.querySelector('.cth-hero .cth-timer-actions .cth-bghost svg')) };
  const svgs = [], svgsRuins = [];
  for (const raiz of raizes) for (const s of raiz.querySelectorAll('svg[data-ico]')) {
    if (!vis(s)) continue; const i = svgInfo(s);
    svgs.push(i.ico);
    if (!(i.oculto && i.w === 16 && i.h === 16 && i.stroke === 'currentColor')) svgsRuins.push(i.ico + ' ' + i.w + '×' + i.h + ' aria-hidden=' + i.ariaHidden + ' stroke=' + i.stroke);
  }
  const nome = el => !el ? '' : (el.getAttribute('aria-label') || el.textContent).replace(/\s+/g, ' ').trim();
  return { emojis, nos, banner, svgs, svgsRuins,
    chips: { objetivo: !!kicker, ofensiva: !!ofensiva, escudos: !!escudos, prova: !!prova },
    nomeOfensiva: nome(ofensiva), textoEscudos: escudos ? escudos.textContent.replace(/\s+/g, ' ').trim() : '',
    textoProva: prova ? prova.textContent.replace(/\s+/g, ' ').trim() : '',
    textoIniciar: (() => { const b = document.querySelector('.cth-hero .cth-timer-actions .cth-bghost'); return b ? b.textContent.replace(/\s+/g, ' ').trim() : ''; })() };
}

function varrerNotificacoes() {
  const EMO = /\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u;
  const bts = [...document.querySelectorAll('button[data-id][onclick], button[data-id]')].filter(b => b.closest('.ct-scroll') && b.getAttribute('data-view') !== null && b.getClientRects().length);
  const emojis = [], icos = []; let semSvg = 0;
  for (const b of bts) {
    const m = b.textContent.match(EMO); if (m) emojis.push(m[0] + ' «' + b.textContent.trim().slice(0, 30) + '»');
    const s = b.querySelector('svg[data-ico]');
    if (!s) semSvg++; else icos.push(s.getAttribute('data-ico'));
  }
  return { itens: bts.length, emojis, semSvg, icos };
}

function varrerPaleta() {
  const EMO = /\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F/u;
  const icos = [], emojis = [], ruins = [];
  // os itens da paleta: botões com a pastilha de ícone; só os de conteúdo têm data-ico
  for (const s of document.querySelectorAll('svg[data-ico="scale"], svg[data-ico="landmark"], svg[data-ico="pen-line"], svg[data-ico="compass"]')) {
    if (!s.getClientRects().length || s.closest('main > div > .cth-hero') || s.closest('.cth-lawsep')) continue;
    const b = s.getBoundingClientRect(); icos.push(s.getAttribute('data-ico'));
    if (!(s.getAttribute('aria-hidden') === 'true' && Math.round(b.width) === 16 && Math.round(b.height) === 16)) ruins.push(s.getAttribute('data-ico') + ' ' + b.width + '×' + b.height);
    const item = s.closest('button, [role="option"], li') || s.parentElement;
    const m = (item.textContent || '').match(EMO); if (m) emojis.push(m[0]);
  }
  return { icos, emojis, ruins };
}

function medirAlvos() {
  const q = s => [...document.querySelectorAll(s)].filter(e => e.getClientRects().length);
  const caixa = (el) => { const b = el.getBoundingClientRect(), cs = getComputedStyle(el);
    let w = b.width, h = b.height;
    // o desenho pequeno de propósito (.ct-alvo) ganha a área do dedo pelo ::after
    if (el.matches('.ct-alvo')) { const af = getComputedStyle(el, '::after');
      if (af.content && af.content !== 'none' && af.position === 'absolute') { w = Math.max(w, parseFloat(af.width) || 0); h = Math.max(h, parseFloat(af.height) || 0); } }
    return { t: (el.getAttribute('aria-label') || el.textContent || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 22),
      w: Math.round(w * 10) / 10, h: Math.round(h * 10) / 10, pad: cs.padding, minH: cs.minHeight, cls: String(el.className || '') }; };
  const ritmos = q('.cth-ritmos button').map(caixa);
  const acoes = q('.cth-timer-actions button').map(caixa);
  // todo controle visível do Início (a área de conteúdo e a barra de cima)
  const main = document.querySelector('main');
  const ctrls = [...main.querySelectorAll('button, a[href], [role="button"], input:not([type="hidden"]), select, textarea, summary')]
    .filter(e => e.getClientRects().length && getComputedStyle(e).visibility === 'visible' && !e.closest('[aria-hidden="true"]'));
  const pequenos = [];
  for (const e of ctrls) { const c = caixa(e); if (c.w < 43.5 || c.h < 43.5) pequenos.push('«' + c.t + '» ' + c.w + '×' + c.h); }
  return { toque: !!document.querySelector('[data-toque="1"]'), ritmos, acoes, total: ctrls.length, pequenos };
}

async function medirNotaOral(nota) {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const app = window.__catedraApp;
  if (app.state.view !== 'oral') { window.__catedraGoView('oral'); await w(500); }
  await new Promise(r => app.setState({ oralModo: 'juris', oralPronto: true,
    oralAlvo: { titulo: 'Súmula 1', tribunal: 'STF', ramo: 'Constitucional', texto: 'Tese de teste.' },
    oralPergunta: 'Explique a tese.', oralResposta: 'Resposta.',
    oralCorrecao: { nota, cobertura: 60, acertou: ['tese'], faltou: ['ressalva'], fundCitados: ['art. 5º'], fundAusentes: ['art. 6º'] } }, r));
  await w(350);
  // o texto vem em pedaços interpolados (<span>): a pílula é o <div> sem <div> dentro
  const el = [...document.querySelectorAll('main div')].find(d => /^Resposta (consistente|parcial|insuficiente) ·/.test((d.textContent || '').trim()) && !d.querySelector('div'));
  if (!el) return { achou: false, motivo: 'não achei a pílula da nota' };
  el.style.transition = 'none';
  const sonda = document.createElement('i'); sonda.style.display = 'none'; document.body.appendChild(sonda);
  const rgb = s => { sonda.style.color = ''; sonda.style.color = s; const c = getComputedStyle(sonda).color;
    let m = /rgba?\(([^)]+)\)/.exec(c); if (m) { const v = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return v.length > 3 ? v : v.concat([1]); }
    m = /color\(srgb\s+([^)]+)\)/.exec(c); if (m) { const v = m[1].split(/[\s/]+/).filter(Boolean).map(Number); return [v[0] * 255, v[1] * 255, v[2] * 255, v.length > 3 ? v[3] : 1]; }
    return null; };
  const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const cs = getComputedStyle(el);
  const bg = rgb(cs.backgroundColor) || [0, 0, 0, 0];
  // o que está atrás: o primeiro ancestral com fundo opaco (o cartão)
  let atras = null; for (let p = el.parentElement; p && !atras; p = p.parentElement) { const c = rgb(getComputedStyle(p).backgroundColor); if (c && c[3] > 0.99) atras = c; }
  atras = atras || [255, 255, 255, 1];
  const comp = [0, 1, 2].map(i => bg[i] * bg[3] + atras[i] * (1 - bg[3]));
  const fg = rgb(cs.color);
  const cont = cr(fg, comp);
  sonda.remove();
  const t = v => 'rgb(' + v.slice(0, 3).map(Math.round).join(',') + ')';
  return { achou: true, txt: el.textContent.trim().split(' ·')[0], fundo: cs.backgroundColor, alfa: Math.round(bg[3] * 1000) / 1000,
    pinta: cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent',
    cor: t(fg), composto: t(comp), contraste: Math.round(cont * 100) / 100 };
}
