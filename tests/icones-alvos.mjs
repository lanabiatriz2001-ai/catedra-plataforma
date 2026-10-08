/* ÍCONES, ALVOS DE TOQUE E A NOTA DA ORAL — o banner do Início e o que mora em volta (25/09/2026)

   Os defeitos do mesmo passe de acabamento, cada um MEDIDO no Catedra.dc.html real:

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

   · (d) O RESTO DO HOST (set/2026): Onboarding, Revisar agora, Treino, Revisões, 2ª fase,
         Calendário, Bem-estar, Comunidade, Relatório, Conquistas, Ajustes, Bancas, Edital,
         Histórico, Reta final e a arguição da Prova oral. Os ícones que vinham de TABELAS (área de
         estudo, categoria, hábito, humor, medalha, próximos passos) agora são NOMES Lucide
         desenhados por <use href="#ct-i-nome"> do sprite do template. Cada tela: nenhum emoji,
         os ícones esperados pelo nome, cada SVG medido (16×16, aria-hidden, currentColor, desenho
         não vazio), nome acessível sem emoji em todo controle com ícone, o traço do ladrilho
         ≥ 3:1 sobre a lavagem e ouro/prata/bronze distintos — nos dois modos onde há cor.
   · (e) SATÉLITES E PORTÃO: LEGIS, JURIS (cabeçalho e estado vazio), Ritos (e o painel do mapa
         do processo), Peças, Módulo da área e o portão de login do auth.js — outro documento,
         sem o sprite: cada um com a cópia pequena do ajudante ctIco() ou o SVG no HTML.

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
    const ctx = await browser.newContext({ viewport, hasTouch: !!toque, isMobile: !!toque && viewport.width < 900 && motor !== 'firefox',
      ...(extra.relogio ? { timezoneId: extra.relogio.fuso } : {}) });
    // relógio fixo ANTES da semente e do app (padrão de tests/registro-sessao.mjs); o tempo segue correndo
    if (extra.relogio) await ctx.clock.install({ time: extra.relogio.t });
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', e => erros.push(String(e && e.message || e)));
    await page.goto(base + '/__semente');
    await page.evaluate(semear);
    await page.goto(base + '/Catedra.dc.html');
    await page.waitForFunction(() => !!window.__catedraApp && typeof window.__catedraGoView === 'function' && !!document.querySelector('[data-toque]'), null, { timeout: 30000 });
    await page.evaluate(({ toque, escuro, extra }) => new Promise(r => { const a = window.__catedraApp;
      a._toque = !!toque;
      // hoje + 120 no calendário LOCAL, que é como o app conta (meia-noite local de provaData,
      // o _ymd do host). toISOString() é UTC: das 20h à meia-noite em UTC-4 já é amanhã, e dava 121.
      const d = new Date(); d.setDate(d.getDate() + 120);
      const p = n => String(n).padStart(2, '0');
      const prova = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
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
  /* ---------------- (a) a ficha da prova à noite em UTC-4 ---------------- */
  // Das 20h à meia-noite em Porto Velho o dia UTC já virou: com a data da prova montada por
  // toISOString(), a ficha dizia «121 dias» no Mac todas as noites, e a CI (em UTC) nunca via.
  // Fuso e relógio fixos no contexto (21:40 de hoje em Porto Velho) cobram a janela em qualquer
  // máquina e a qualquer hora; o caso confere que o relógio caiu mesmo nela.
  {
    const hojePV = new Date(Date.now() - 4 * 36e5).toISOString().slice(0, 10);   // UTC-4 fixo: Porto Velho não tem horário de verão
    const relogio = { fuso: 'America/Porto_Velho', t: new Date(hojePV + 'T21:40:00-04:00') };
    const { ctx, page } = await abrir({ width: 1280, height: 1000 }, false, false, { relogio });
    try {
      const r = await page.evaluate(varrerIcones);
      const j = await page.evaluate(() => { const d = new Date(); return { h: d.getHours(), virou: d.getDate() !== d.getUTCDate() }; });
      ok(j.h === 21 && j.virou && r.textoProva === '120 dias p/ prova',
        R + '(a) às 21:40 em Porto Velho, com o dia UTC já virado, a ficha continua «120 dias p/ prova» (' + j.h + 'h local, dia UTC ' + (j.virou ? 'virado' : 'igual') + '; «' + r.textoProva + '»)');
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
  /* ---------------- (b) desktop: controles do painel aprovado ---------------- */
  {
    const { ctx, page } = await abrir({ width: 1280, height: 1000 }, false);
    try {
      const r = await page.evaluate(medirAlvos);
      ok(!r.toque, R + '(b) desktop: sem data-toque (mouse)');
      ok(r.ritmos.length >= 4 && r.ritmos.every(b => b.h >= ALVO && b.w >= ALVO),
        R + '(b) desktop: os ritmos têm alvo ≥ 44×44 (' + r.ritmos.map(b => b.t + ' ' + b.w + '×' + b.h + ' pad ' + b.pad + ' min ' + b.minH).join(', ') + ')');
      ok(r.acoes.length >= 3 && r.acoes.every(b => b.h >= ALVO && b.w >= ALVO),
        R + '(b) desktop: Iniciar/Zerar/Registrar têm alvo ≥ 44×44 (' + r.acoes.map(b => b.t + ' ' + b.w + '×' + b.h + ' pad ' + b.pad + ' min ' + b.minH).join(', ') + ')');
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

  /* ---------------- (d) o resto do host: emoji-ícone por tela ----------------
     Cada tela é posta no estado que desenha o ícone (modal aberto, lista cheia, estado vazio) e a
     varredura de (a) roda na <main> e nos diálogos visíveis. Além de "nenhum emoji", cada tela
     tem os ícones ESPERADOS pelo nome (data-ico): sem isso, apagar o ícone junto com o emoji
     passaria. Todo SVG data-ico visível é medido (16×16, aria-hidden, stroke currentColor, e o
     desenho existe: a caixa do <use> ou dos traços não é vazia), e todo botão com ícone tem nome
     acessível sem emoji. O mural da Comunidade é conteúdo (fica fora, por pedido). */
  for (const escuro of [false, true]) {
    const { ctx, page, erros } = await abrir({ width: 1280, height: 1000 }, false, escuro);
    const modo = escuro ? ' · escuro' : '';
    try {
      for (const tela of TELAS) {
        if (escuro && !tela.escuro) continue;
        const prep = await page.evaluate(prepararTela, tela.id);
        await w(tela.espera || 700);
        const r = await page.evaluate(varrerTela, { raizes: tela.raizes || null, esperados: tela.icos, minimo: tela.minimo || 0 });
        const rot = R + '(d) ' + tela.nome + modo;
        if (prep && prep.erro) { ok(false, rot + ': a tela abriu (' + prep.erro + ')'); continue; }
        ok(r.raizes > 0 && r.nos > 0, rot + ': a tela está desenhada (' + r.raizes + ' raízes, ' + r.nos + ' nós de texto)');
        ok(r.emojis.length === 0, rot + ': nenhum emoji como ícone (achados: ' + (r.emojis.join(' | ') || 'nenhum') + ')');
        ok(r.faltam.length === 0 && r.svgs.length >= (tela.minimo || 1),
          rot + ': os ícones Lucide esperados estão lá (' + tela.icos.join(', ') + (r.faltam.length ? '; faltam: ' + r.faltam.join(', ') : '') + '; ' + r.svgs.length + ' SVGs data-ico)');
        ok(r.ruins.length === 0, rot + ': todo SVG data-ico visível é 16×16, aria-hidden, currentColor e pinta (' + (r.ruins.join(' / ') || r.svgs.length + ' ok') + ')');
        ok(r.semNome.length === 0, rot + ': todo controle com ícone tem nome acessível, sem emoji (' + (r.semNome.join(' / ') || 'ok') + ')');
        if (tela.extra) for (const [c, msg] of tela.extra(r)) ok(c, rot + ': ' + msg);
      }
      ok(!erros.length, R + '(d) sem erro de página nas telas' + modo + ' (' + (erros[0] || 'nenhum') + ')');
    } finally { await ctx.close(); }
  }

  /* ---------------- (e) satélites e portão de login ----------------
     Outro documento, sem o sprite do host: cada página tem a cópia pequena do ajudante (ctIco) ou
     o SVG escrito no HTML. A varredura é a mesma, na página inteira. No WebKit isto também prova
     que a sintaxe do ajudante roda no JavaScriptCore (sem ele o cabeçalho do módulo sai vazio). */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', e => erros.push(String(e && e.message || e)));
    try {
      for (const s of SATELITES) {
        await page.goto(base + '/' + s.url);
        await page.waitForFunction(s.pronto || (() => document.readyState === 'complete'), null, { timeout: 30000 }).catch(() => {});
        await w(s.espera || 900);
        if (s.acao) { const a = await page.evaluate(s.acao).catch(e => ({ erro: String(e && e.message || e) })); if (a && a.erro) { ok(false, R + '(e) ' + s.nome + ': ' + a.erro); continue; } await w(500); }
        const r = await page.evaluate(varrerTela, { raizes: s.raizes || ['body'], esperados: s.icos, minimo: 1 });
        const rot = R + '(e) ' + s.nome;
        ok(r.nos > 0, rot + ': a página está desenhada (' + r.nos + ' nós de texto)');
        ok(r.emojis.length === 0, rot + ': nenhum emoji como ícone (achados: ' + (r.emojis.join(' | ') || 'nenhum') + ')');
        ok(r.faltam.length === 0, rot + ': os ícones Lucide esperados estão lá (' + s.icos.join(', ') + (r.faltam.length ? '; faltam: ' + r.faltam.join(', ') : '') + ')');
        ok(r.ruins.length === 0, rot + ': todo SVG data-ico visível é 16×16, aria-hidden, currentColor e pinta (' + (r.ruins.join(' / ') || r.svgs.length + ' ok') + ')');
        ok(r.semNome.length === 0, rot + ': todo controle com ícone tem nome acessível, sem emoji (' + (r.semNome.join(' / ') || 'ok') + ')');
        if (s.extra) for (const [c, msg] of s.extra(r)) ok(c, rot + ': ' + msg);
      }
      ok(!erros.length, R + '(e) sem erro de página nos satélites e no portão (' + (erros[0] || 'nenhum') + ')');
    } finally { await ctx.close(); }
  }
}

/* As telas de (d): id (preparado no navegador por prepararTela), os ícones esperados por nome e,
   quando vale, o que mais medir. `escuro: true` = roda também no modo escuro. */
const TELAS = [
  { id: 'onb1', nome: 'Onboarding · passo 1', icos: ['hand'], raizes: ['[role="dialog"][aria-label="Configuração inicial"]'], escuro: true },
  // só a área jurídica é pública (area-registry.js): o cartão dela e o de quem já escolheu outra
  { id: 'onb2', nome: 'Onboarding · passo 2 (áreas)', icos: ['scale'], raizes: ['[role="dialog"][aria-label="Configuração inicial"]'],
    extra: r => { const cartoes = r.botoes.filter(b => b.dataA);
      return [[cartoes.length >= 1 && cartoes.length === r.cartoesArea && cartoes.every(b => /^Jurídica|^[A-ZÁÉÍÓÚ]/.test(b.nome)),
        'todo cartão de área tem o ícone da área e é nomeado pelo rótulo (' + cartoes.map(b => b.ico + ' «' + b.nome.slice(0, 26) + '»').join(', ') + ' de ' + r.cartoesArea + ')']]; } },
  { id: 'onb4', nome: 'Onboarding · passo 4', icos: ['target'], raizes: ['[role="dialog"][aria-label="Configuração inicial"]'] },
  { id: 'revAgora', nome: 'Revisar agora (sessão)', icos: ['repeat'], raizes: ['[role="dialog"][aria-label="Sessão de revisão"]'], escuro: true },
  { id: 'revFim', nome: 'Revisar agora (concluída)', icos: ['repeat', 'circle-check'], raizes: ['[role="dialog"][aria-label="Sessão de revisão"]'] },
  { id: 'treinoFim', nome: 'Treino concluído', icos: ['target'], raizes: ['[role="dialog"][aria-label="Treino de erros"]'] },
  { id: 'revisoes', nome: 'Revisões', icos: ['repeat', 'book-open', 'scale', 'circle-check'], escuro: true },
  { id: 'redacao', nome: '2ª fase (rascunho salvo)', icos: ['pen-line'] },
  { id: 'calendario', nome: 'Calendário (vazio)', icos: ['calendar'] },
  { id: 'bemestar', nome: 'Bem-estar', icos: ['laugh', 'smile', 'meh', 'annoyed', 'frown', 'bed', 'droplet', 'footprints', 'coffee', 'person-standing', 'sun', 'wind'], escuro: true,
    extra: r => { const humor = r.botoes.filter(b => b.dataK && ['laugh', 'smile', 'meh', 'annoyed', 'frown'].includes(b.ico));
      return [[humor.length === 5 && humor.map(b => b.nome).join('|') === 'Ótimo|Bem|Neutro|Cansado|Ansioso' && humor.every(b => b.pressed === 'false' || b.pressed === 'true'),
        'o humor tem 5 escolhas nomeadas pelo rótulo, sem o emoji no nome, e dizem se estão marcadas (' + humor.map(b => b.nome + '=' + b.pressed).join(', ') + ')'],
        [r.ladrilhos.length >= 12 && r.ladrilhos.every(l => l.pinta && l.contraste >= 3),
          'os ladrilhos tingidos pintam e o traço passa de 3:1 sobre a lavagem (' + r.ladrilhos.length + '; pior ' + Math.min(...r.ladrilhos.map(l => l.contraste)) + ':1)']]; } },
  { id: 'comunidade', nome: 'Comunidade', icos: ['flame', 'target', 'medal', 'triangle-alert'], escuro: true,
    extra: r => [[r.medalhas.length === 3 && new Set(r.medalhas.map(m => m.cor)).size === 3 && r.medalhas.every(m => m.contraste >= 3),
      'ouro, prata e bronze: três medalhas de cores distintas, traço ≥ 3:1 (' + r.medalhas.map(m => m.pos + ' ' + m.cor + ' ' + m.contraste + ':1').join(', ') + ')']] },
  { id: 'relatorio', nome: 'Relatório (Desempenho)', icos: ['flame'] },
  { id: 'conquistas', nome: 'Conquistas', icos: ['flame'] },
  { id: 'ajustes', nome: 'Ajustes (área de estudo)', icos: ['scale'], minimo: 2,
    extra: r => [[r.cartoesArea >= 1 && r.botoes.filter(b => b.dataA).length === r.cartoesArea, 'o seletor aberto: todo cartão de área com ícone (' + r.cartoesArea + ')']] },
  { id: 'bancas', nome: 'Bancas (área do concurso)', icos: ['scale', 'stethoscope', 'siren'] },
  { id: 'edital', nome: 'Edital (começar com um modelo)', icos: ['library'] },
  { id: 'historico', nome: 'Histórico (categorias e lixeira)', icos: ['book', 'trash-2'] },
  { id: 'histEdit', nome: 'Editar sessão (categorias)', icos: ['book', 'scale'], raizes: ['main', '[role="dialog"]'] },
  { id: 'ciclo', nome: 'Ciclo (filtro por tipo)', icos: ['book'] },
  { id: 'reta', nome: 'Reta final', icos: ['scale', 'landmark', 'book-x', 'alarm-clock', 'clipboard-list'] },
  { id: 'oral', nome: 'Prova oral · arguição (voz)', icos: ['volume-x'],
    extra: r => { const b = r.botoes.find(x => x.ico === 'volume-x' || x.ico === 'volume-2');
      return [[!!b && b.nome === 'ligar voz' && b.pressed === 'false', 'o botão da voz é nomeado pelo texto e diz o estado («' + (b && b.nome) + '», aria-pressed=' + (b && b.pressed) + ')']]; } },
];

const SATELITES = [
  { nome: 'LEGIS', url: 'legis-web.html', icos: ['book-open', 'search'] },
  { nome: 'JURIS', url: 'juris-web.html', icos: ['scale', 'search'] },
  { nome: 'JURIS (busca sem resultado)', url: 'juris-web.html', icos: ['scale'],
    acao: async () => { const q = document.getElementById('q'); if (!q) return { erro: 'sem campo de busca' };
      q.value = 'zzqqxxkkwwnada'; q.dispatchEvent(new Event('input', { bubbles: true })); await new Promise(r => setTimeout(r, 700));
      return document.querySelector('.empty .ei svg[data-ico="scale"]') ? {} : { erro: 'o estado vazio não desenhou a balança (' + ((document.querySelector('.empty') || {}).outerHTML || 'sem .empty').slice(0, 120) + ')' }; } },
  { nome: 'Ritos', url: 'ritos-web.html', icos: ['compass'] },
  // o palco do mapa é ampliado/reduzido por transform (enquadrar): mede-se o PAINEL, que não escala
  { nome: 'Ritos · mapa do processo (painel)', url: 'ritos-web.html', icos: ['scale'], raizes: ['.mp-painel'],
    acao: async () => { const w = ms => new Promise(r => setTimeout(r, ms)), d = document;
      const bm = d.getElementById('mMapa'); if (!bm) return { erro: 'sem o botão do modo Mapa' }; bm.click();
      for (let i = 0; i < 40 && !d.querySelector('#mapaHold [data-abrir]'); i++) await w(250);
      const ORDEM = window.eval('ORDEM');
      for (const r of ORDEM) { if (window.ctAbrirPonto) { window.ctAbrirPonto(r); await w(300); }
        for (const b of d.querySelectorAll('#mapaHold [data-abrir]')) { b.click(); await w(60);
          const p = d.querySelector('.mp-painel'); if (p && p.querySelector('[data-legis] svg[data-ico="scale"]')) return {}; } }
      return { erro: 'nenhum painel do mapa com referência de lei desenhada com o ícone' }; } },
  { nome: 'Peças', url: 'pecas-web.html', icos: ['pen-line', 'search'] },
  { nome: 'Módulo da área (saúde)', url: 'area-web.html?area=saude', icos: ['stethoscope', 'search'] },
  { nome: 'Módulo da área (contas)', url: 'area-web.html?area=contas', icos: ['landmark', 'search'] },
  { nome: 'Portão de login', url: 'tests/auth-gate-fixture.html', icos: ['scale', 'repeat', 'clipboard-list', 'mail'], raizes: ['#catedra-auth-gate'], espera: 1400,
    extra: r => { const b = r.botoes.find(x => x.ico === 'mail');
      return [[!!b && b.nome === 'Receber um link de acesso por e-mail', 'o botão do link por e-mail é nomeado pelo texto («' + (b && b.nome) + '»)']]; } },
];

/* no navegador: põe o app no estado que desenha a tela */
async function prepararTela(id) {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const a = window.__catedraApp, ir = v => window.__catedraGoView(v);
  const set = o => new Promise(r => a.setState(o, r));
  await set({ onboardStep: 0, revSession: null, treino: null, histLixeiraOpen: false, histEdit: null, notifOpen: false, areaSelOpen: false, argOn: false, comErro: '' });
  if (id === 'onb1' || id === 'onb2' || id === 'onb4') { await set({ loggedIn: true, onboardStep: +id.slice(3) }); return {}; }
  if (id === 'revAgora' || id === 'revFim') {
    const r1 = (a.state.reviews || [])[0]; if (!r1) return { erro: 'sem revisão semeada' };
    await set({ revSession: { queue: [r1.id], idx: id === 'revFim' ? 1 : 0, revealed: false, again: 0, hard: 0, good: id === 'revFim' ? 1 : 0, easy: 0, done: id === 'revFim' } }); return {}; }
  if (id === 'treinoFim') { await set({ treino: { queue: ['e1'], idx: 1, acertos: 2, erros: 1, wrongIds: [], done: true } }); return {}; }
  if (id === 'revisoes') { ir('revisoes'); await set({ nativeRev: { legis: { due: 3, deck: 20 }, juris: { due: 1, deck: 12 } } }); return {}; }
  if (id === 'redacao') { ir('redacao'); a._redBoot = 'Texto do rascunho salvo.';
    await set({ redEnunciado: 'Discorra sobre a prescrição.', redText: 'Texto do rascunho salvo.', redTextTs: Date.now() - 36e5, redResult: null, redRascunhoOculto: false }); return {}; }
  if (id === 'calendario') { ir('calendario'); await set({ reviews: [], manualFixed: [], provaData: '', eventos: [] }); return {}; }
  if (id === 'bemestar') { ir('bemestar'); return {}; }
  if (id === 'comunidade') { ir('comunidade');
    await set({ comMyUid: 'eu', comErro: 'Não consegui carregar os grupos agora.', meusGrupos: [{ id: 'g1', nome: 'Turma TJSP', codigo: 'ABC123', membros: [] }], comGrupoAtivo: 'g1',
      comRankRows: [{ user_id: 'a', nome: 'Ana', minutos: 900, ao_vivo: true, streak: 4, revisoes: 12 }, { user_id: 'eu', nome: 'Você', minutos: 600, streak: 0, revisoes: 3 },
        { user_id: 'b', nome: 'Bruno', minutos: 300, streak: 0, revisoes: 2 }, { user_id: 'c', nome: 'Caio', minutos: 120, streak: 0, revisoes: 1 }] }); return {}; }
  if (id === 'relatorio') { ir('analise'); await set({ anaTab: 'relatorio' }); return {}; }
  if (id === 'conquistas') { ir('conquistas'); return {}; }
  if (id === 'ajustes') { ir('ajustes'); await w(300); await set({ areaSelOpen: true }); return {}; }
  if (id === 'bancas') { ir('bancas'); return {}; }
  if (id === 'edital') { ir('edital'); return {}; }
  if (id === 'historico') { ir('historico'); await set({ histLixeiraOpen: true }); return {}; }
  if (id === 'histEdit') { ir('historico'); await w(300); const s = (a.state.sessions || [])[0]; if (!s) return { erro: 'sem sessão semeada' };
    if (typeof a.openHistEdit === 'function') a.openHistEdit({ currentTarget: { dataset: { id: s.id } }, target: { dataset: { id: s.id } } });
    await w(400); if (!a.state.histEdit) return { erro: 'o editor da sessão não abriu' }; return {}; }
  // uma revisão vencida (due < 0 dias) acende o "Zerar revisões vencidas" dos próximos passos
  if (id === 'ciclo') { ir('ciclo'); return {}; }
  if (id === 'reta') { ir('reta-final'); await set({ reviews: [{ id: 'rv', disc: 'Direito Civil', topic: 'Obrigações', due: -3, stage: 1, ef: 2.5, interval: 1, color: '#2563eb', up: Date.now() }] }); return {}; }
  if (id === 'oral') { ir('oral'); await w(400);
    await set({ oralModo: 'bancas', argOn: true, argFim: false, argRodando: true, argVoz: false, argIdx: 0, argSeg: 180, argRespostas: [],
      argFila: [{ id: 'q1', enunciado: 'Explique a prescrição intercorrente.', disciplina: 'Processo Civil', orgao: 'TJSP', ano: 2024 }] }); return {}; }
  return { erro: 'tela desconhecida: ' + id };
}

/* no navegador: a varredura de uma tela (host ou satélite) */
function varrerTela({ raizes, esperados, minimo }) {
  const EMO = /\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u;
  // o mural da Comunidade é conteúdo (a frase leva o emoji de propósito): fora da varredura
  const CONTEUDO = /ofensiva de \d+ dias|revisões na semana/;
  const vis = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility === 'visible';
  const sel = raizes || ['main', '[role="dialog"]'];
  const rs = []; for (const s of sel) for (const el of document.querySelectorAll(s)) if (vis(el) && !rs.some(x => x.contains(el))) rs.push(el);
  const emojis = []; let nos = 0;
  for (const raiz of rs) {
    const tw = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement; if (!vis(el) || el.closest('script,style')) continue;
      nos++;
      if (CONTEUDO.test(n.textContent)) continue;
      const m = n.textContent.match(EMO);
      if (m) emojis.push(m[0] + ' em <' + el.tagName.toLowerCase() + '> «' + n.textContent.trim().slice(0, 40) + '»');
    }
  }
  // cor → sRGB pelo PIXEL de um canvas 1×1: color-mix em oklab chega computado como oklab(),
  // que regex nenhuma converte; o canvas faz a conversão que o navegador faria ao pintar
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgb = s => { if (!s || s === 'transparent') return null; cx.clearRect(0, 0, 1, 1); cx.fillStyle = 'rgba(0,0,0,0)'; cx.fillStyle = s;
    cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const cr = (x, y) => { const a = lum(x), b = lum(y); return Math.round((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) * 100) / 100; };
  // o que está atrás de um elemento: as paradas do gradiente dele (o ladrilho) ou a primeira cor
  // opaca subindo a árvore; a parada translúcida é composta sobre o fundo de baixo. Devolve TODAS as
  // cores candidatas: o contraste medido é o pior entre elas.
  const opaco = el => { for (let p = el; p; p = p.parentElement) { const c = rgb(getComputedStyle(p).backgroundColor); if (c && c[3] > 0.99) return c; } return [255, 255, 255, 1]; };
  const compor = (c, base) => c[3] >= 0.99 ? c : [0, 1, 2].map(i => c[i] * c[3] + base[i] * (1 - c[3])).concat([1]);
  const fundos = el => { const cs = getComputedStyle(el), base = opaco(el.parentElement);
    const paradas = (cs.backgroundImage || '').match(/(rgba?\([^)]*\)|color\([^)]*\)|oklab\([^)]*\)|oklch\([^)]*\)|#[0-9a-f]{3,8})/gi) || [];
    const cores = paradas.map(rgb).filter(Boolean).map(c => compor(c, base));
    const bg = rgb(cs.backgroundColor); if (bg && bg[3] > 0.01) cores.push(compor(bg, base));
    return cores.length ? cores : [base]; };
  const piorContraste = (el, alvo) => { const c = rgb(getComputedStyle(alvo).color); if (!c) return 0; return Math.min(...fundos(el).map(f => cr(c, f))); };
  const svgs = [], ruins = [], ladrilhos = [];
  for (const raiz of rs) for (const s of raiz.querySelectorAll('svg[data-ico]')) {
    if (!vis(s)) continue;
    const b = s.getBoundingClientRect(), nome = s.getAttribute('data-ico');
    svgs.push(nome);
    // o desenho existe: a caixa dos traços (o <use> resolvido ou os filhos) não é vazia
    let caixa = 0; try { const bb = s.getBBox(); caixa = bb.width * bb.height; } catch (_) {}
    const w = Math.round(b.width * 10) / 10, h = Math.round(b.height * 10) / 10;
    if (!(s.getAttribute('aria-hidden') === 'true' && w === 16 && h === 16 && s.getAttribute('stroke') === 'currentColor' && caixa > 4 && nome && !/\{\{/.test(nome)))
      ruins.push(nome + ' ' + w + '×' + h + ' aria-hidden=' + s.getAttribute('aria-hidden') + ' stroke=' + s.getAttribute('stroke') + ' desenho=' + Math.round(caixa));
    const lad = s.parentElement && s.parentElement.classList.contains('ct-ladrilho') ? s.parentElement : null;
    if (lad) { const fs = fundos(lad), pinta = (getComputedStyle(lad).backgroundImage || 'none') !== 'none' || (rgb(getComputedStyle(lad).backgroundColor) || [0, 0, 0, 0])[3] > 0.05;
      ladrilhos.push({ ico: nome, pinta, contraste: piorContraste(lad, s), fundos: fs.length }); }
  }
  const faltam = (esperados || []).filter(n => !svgs.includes(n));
  const nomeDe = el => (el.getAttribute('aria-label') || [...el.childNodes].map(n => n.nodeType === 3 ? n.textContent : (n.nodeType === 1 && n.getAttribute('aria-hidden') !== 'true' && n.tagName !== 'svg' ? n.textContent : '')).join('')).replace(/\s+/g, ' ').trim();
  const botoes = [], semNome = [];
  for (const raiz of rs) for (const el of raiz.querySelectorAll('button, a[href], [role="button"]')) {
    if (!vis(el)) continue;
    const s = el.querySelector('svg[data-ico]'); if (!s) continue;
    const nome = nomeDe(el);
    botoes.push({ ico: s.getAttribute('data-ico'), nome, pressed: el.getAttribute('aria-pressed'), dataK: el.getAttribute('data-k'), dataA: el.getAttribute('data-a') });
    if (!nome || EMO.test(nome)) semNome.push('<' + el.tagName.toLowerCase() + '> ' + s.getAttribute('data-ico') + ' «' + nome + '»');
  }
  const medalhas = [...document.querySelectorAll('main .ct-ladrilho[class*="ct-medalha-"]')].filter(vis).map(m => {
    return { pos: (m.className.match(/ct-medalha-(\d)/) || [])[1], cor: String(rgb(getComputedStyle(m).color).slice(0, 3).map(Math.round)), contraste: piorContraste(m, m) }; });
  const cartoesArea = rs.reduce((n, r) => n + [...r.querySelectorAll('button[data-a]')].filter(vis).length, 0);
  return { raizes: rs.length, nos, emojis, svgs, faltam, ruins, botoes, semNome, ladrilhos, medalhas, cartoesArea };
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
  const chips = [...document.querySelectorAll('.cth-inicio .cth-chip')];
  const porTexto = re => chips.find(c => re.test(c.textContent));
  const kicker = document.querySelector('.cth-inicio .cth-kicker');
  const ofensiva = document.querySelector('.cth-inicio .cth-chip.ct-gam');
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
