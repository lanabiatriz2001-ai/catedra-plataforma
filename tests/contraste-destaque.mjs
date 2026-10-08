/* CONTRASTE DO TEXTO SOBRE O DESTAQUE — --onAccent e --accentSolid (25/09/2026)

   O pedido: o --onAccent do app inteiro vinha de uma régua de luma com limiar 170 e ficava
   abaixo de 4,5:1 com destaques do seletor (#84cc16 1,98:1; #0d9488 3,74:1; #d6457f 4,19:1)
   e com o padrão de Aurora (3,68), Solar (3,56) e Holo (2,77) no claro — e, medindo, também
   com o padrão de Tribunal (4,12) e Fibra (4,31) no escuro, na ponta funda do gradiente.

   O desenho (Catedra.dc.html, perto do rootStyle): o texto é #fff ou o escuro do tema, o que
   tiver o maior contraste no PIOR ponto dos fundos em que pinta (destaque, --accentD, o meio
   do gradiente entre eles e a ponta de 82% com preto do .ct-btn). Quando nenhum passa, os
   componentes que carregam texto pintam --accentSolid/--accentSolidD — o destaque movido o
   mínimo — e o --accent de identidade (texto, anel, borda, barra) NÃO muda.

   Este módulo MEDE, no Catedra.dc.html real e no satélite do LEGIS: getComputedStyle do
   fundo (as paradas do gradiente, resolvidas numa sonda) e da cor do texto, contraste WCAG
   nas duas pontas e no meio, em direções e destaques que falhavam; e prova que o --accent
   do host é o escolhido (ou o do tema) e chega igual ao satélite. Contexto próprio; a semente
   entra por base+'/__semente' antes de o app abrir (armadilha do autosave). Só em http. */

const PONTOS_MIN = 4.5;

export async function testarContrasteDestaque(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const R = 'CONTRASTE/DESTAQUE [' + motor + '] ';
  const browser = pageDaSuite.context().browser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  try {
    await page.goto(base + '/__semente');
    await page.evaluate(semear);
    await page.goto(base + '/Catedra.dc.html');
    await page.waitForFunction(() => !!window.__catedraApp && typeof window.__catedraGoView === 'function', null, { timeout: 30000 });
    await page.waitForTimeout(1200);
    await page.evaluate(instalar);

    // casos: onde o texto falhava (e alguns que já passavam, para provar que não pioraram)
    const casos = [];
    for (const escuro of [false, true]) for (const acc of [null, '#84cc16', '#0d9488', '#d6457f']) casos.push({ dir: 'sutil', escuro, acc });
    for (const dir of ['aurora', 'solar', 'holo']) casos.push({ dir, escuro: false, acc: null });
    for (const dir of ['premium', 'clean']) casos.push({ dir, escuro: true, acc: null });
    casos.push({ dir: 'terminal', escuro: false, acc: '#84cc16' }, { dir: 'moderno', escuro: true, acc: '#0d9488' });

    const COMPONENTES = [
      // [view, rótulo, seletor]
      ['inicio', 'item ativo do menu (gradiente)', 'button[data-view="inicio"]'],
      ['inicio', 'contador de revisões no menu (sólido)', 'button[data-view="revisoes"] span[style*="margin-left"]'],
      ['inicio', 'botão Foco do Início (.cth-bfoco, gradiente)', '.cth-bfoco'],
      ['inicio', 'link "Pular para o conteúdo" (.ct-skip)', 'a.ct-skip'],
      ['ciclo', 'botão primário .ct-btn (gradiente até 82% com preto)', '.ct-bc-acao.ct-btn'],
      ['ciclo', 'aba segmentada selecionada', '#ct-cycle-tab-executar'],
    ];
    let medidos = 0, satMedidos = 0;
    const onDoCaso = {};
    for (const c of casos) {
      const nome = c.dir + ' · ' + (c.acc || 'destaque padrão') + (c.escuro ? ' no escuro' : ' no claro');
      await page.evaluate(c => new Promise(r => { const app = window.__catedraApp;
        app.setState({ dir: c.dir, accent: c.acc, darkMode: c.escuro }, () => { try { app._temaBroadcast(); } catch (_) {} r(); }); }), c);
      await page.waitForTimeout(150);
      const tok = await page.evaluate(() => window.__cd.tokens());
      onDoCaso[nome] = tok;
      // o --accent de identidade é o escolhido (ou o do tema), intacto
      ok(tok.accentOk, R + nome + ': --accent de identidade intacto (' + tok['--accent'] + ', esperado ' + tok.esperado + ')');
      ok(tok.solidOk, R + nome + ': --accentSolid/--accentSolidD/--onAccent são cores válidas (' + tok['--accentSolid'] + ' → ' + tok['--accentSolidD'] + ' com ' + tok['--onAccent'] + ')');
      for (const [view, rot, sel] of COMPONENTES) {
        const m = await page.evaluate(async ({ view, sel }) => window.__cd.medir(view, sel), { view, sel });
        if (!m || !m.achou) { ok(false, R + nome + ': ' + rot + ' — o componente existe e pinta na view ' + view + ' (' + (m && m.motivo) + ')'); continue; }
        medidos++;
        ok(m.pior >= PONTOS_MIN, R + nome + ': ' + rot + ' — texto ' + m.pior + ':1 no pior ponto (' + m.texto + ' sobre ' + m.fundos + ')');
        ok(m.fundoEhSolid, R + nome + ': ' + rot + ' — o fundo que carrega o texto é o --accentSolid medido, não o --accent cru (' + m.fundos + ' × solid ' + tok['--accentSolid'] + ')');
      }
    }
    ok(medidos === casos.length * COMPONENTES.length, R + 'todos os componentes foram medidos (' + medidos + '/' + (casos.length * COMPONENTES.length) + ')');

    // o que o pedido nomeou muda de fato: #84cc16 ganha texto escuro; Aurora/Solar no claro,
    // #0d9488 e #d6457f escurecem o fundo que carrega texto e mantêm o --accent
    const lima = onDoCaso['sutil · #84cc16 no claro'], aur = onDoCaso['aurora · destaque padrão no claro'],
      teal = onDoCaso['sutil · #0d9488 no claro'], holo = onDoCaso['holo · destaque padrão no claro'];
    ok(lima && lima.lumOn < 0.2 && lima.mesmoSolid, R + '#84cc16: o texto sobre o destaque vira o escuro do tema (' + (lima && lima['--onAccent']) + ') e o fundo continua o próprio lima (' + (lima && lima['--accentSolid']) + ')');
    ok(aur && !aur.mesmoSolid && aur['--onAccent'] === '#ffffff', R + 'Aurora no claro: o fundo com texto escurece (' + (aur && aur['--accentSolid']) + ') e o --accent fica ' + (aur && aur['--accent']));
    ok(teal && !teal.mesmoSolid, R + '#0d9488: o fundo com texto escurece (' + (teal && teal['--accentSolid']) + ') e o --accent fica ' + (teal && teal['--accent']));
    ok(holo && holo.lumOn < 0.2 && holo.mesmoSolid, R + 'Holo no claro: texto escuro sobre o azul do tema, sem mexer no fundo (' + (holo && holo['--onAccent']) + ' sobre ' + (holo && holo['--accentSolid']) + ')');

    // o satélite: tokens por cópia (tema-satelite.js) e a aba ativa do LEGIS medida lá dentro
    for (const c of [{ dir: 'sutil', escuro: false, acc: '#84cc16' }, { dir: 'aurora', escuro: false, acc: null }, { dir: 'sutil', escuro: true, acc: '#0d9488' }]) {
      const nome = c.dir + ' · ' + (c.acc || 'destaque padrão') + (c.escuro ? ' no escuro' : ' no claro');
      await page.evaluate(c => new Promise(r => { const app = window.__catedraApp;
        app.setState({ dir: c.dir, accent: c.acc, darkMode: c.escuro }, () => { try { app._temaBroadcast(); } catch (_) {} r(); }); }), c);
      const s = await page.evaluate(() => window.__cd.medirLegis());
      if (!s || !s.achou) { ok(false, R + 'LEGIS ' + nome + ': a aba ativa foi medida (' + (s && s.motivo) + ')'); continue; }
      satMedidos++;
      ok(s.copiados, R + 'LEGIS ' + nome + ': --accent, --accentSolid, --accentSolidD e --onAccent chegam iguais ao host (' + s.resumo + ')');
      ok(s.aba.pior >= PONTOS_MIN, R + 'LEGIS ' + nome + ': aba ativa "' + s.aba.rot + '" com texto ' + s.aba.pior + ':1 (' + s.aba.texto + ' sobre ' + s.aba.fundos + ')');
    }
    ok(satMedidos === 3, R + 'o LEGIS foi medido nos três casos (' + satMedidos + '/3)');

    /* ---- BANNER DO INÍCIO: todo texto ≥ 4,5:1 no pior pixel do fundo, nas 8 direções, nos
       dois modos e com duas cores personalizadas, na largura do Mac e na do iPhone ---- */
    const bannerCasos = [];
    for (const dir of HERO_DIRS) for (const escuro of [false, true]) bannerCasos.push({ dir, escuro, acc: null });
    for (const acc of ['#84cc16', '#d6457f']) for (const escuro of [false, true]) bannerCasos.push({ dir: 'sutil', escuro, acc });
    let bannerMedidos = 0;
    for (const c of bannerCasos) {
      const nome = c.dir + ' · ' + (c.acc || 'destaque padrão') + (c.escuro ? ' no escuro' : ' no claro');
      const larguras = [[1280, false], [390, false]];
      if (!c.acc && ['moderno', 'aurora', 'solar', 'holo'].includes(c.dir) && !c.escuro) larguras.push([1280, true]);
      for (const [w, rodando] of larguras) {
        const m = await medirBannerInicio(page, c, w, { rodando });
        const rot = R + 'BANNER ' + nome + ' ' + w + 'px' + (rodando ? ' (sessão em andamento)' : '');
        if (!m.achou) { ok(false, rot + ': o banner (.cth-hero) apareceu'); continue; }
        bannerMedidos++;
        const p = m.itens[0] || {};
        ok(m.itens.length >= 12 && m.pior >= PONTOS_MIN, rot + ': banner ' + m.caixa + ', ' + m.itens.length + ' textos, o pior com ' + m.pior + ':1 («' + p.txt + '» ' + p.cor + ' sobre ' + p.fundo + ')');
        ok(!m.cobertos.length, rot + ': nada cobre o texto medido (' + (m.cobertos.join(' / ') || 'nenhum') + ')');
      }
    }
    ok(bannerMedidos === bannerCasos.length * 2 + 4, R + 'BANNER: todos os casos foram medidos (' + bannerMedidos + '/' + (bannerCasos.length * 2 + 4) + ')');
    await page.setViewportSize({ width: 1280, height: 900 });

    /* ---- ALERTAS VISÍVEIS: sino no Início e selos do Desempenho, nos dois modos.
       O bloco semanal saiu do Início; não criar uma fixture de elementos removidos. ---- */
    for (const escuro of [false, true]) {
      const modo = escuro ? 'no escuro' : 'no claro';
      await page.evaluate(esc => new Promise(r => { const app = window.__catedraApp;
        app.setState({ dir: 'sutil', accent: null, darkMode: esc }, () => { try { app._temaBroadcast(); } catch (_) {} window.__catedraGoView('inicio'); r(); }); }), escuro);
      await page.waitForTimeout(500);
      const sel = await page.evaluate(() => window.__cd.selos());
      const sino = sel.find(y => y.sino);
      ok(!!sino && sino.pior >= PONTOS_MIN, R + 'SINO de notificação ' + modo + ': ' + (sino ? sino.pior + ':1 (' + sino.texto + ' sobre ' + sino.fundos + ')' : 'o contador não apareceu'));
      const ruins = sel.filter(y => y.pior < PONTOS_MIN);
      ok(sel.length >= 1 && !ruins.length, R + 'todo texto sobre --danger/--warn/--ok no Início ' + modo + ' passa (' + sel.length + ' medidos' + (ruins.length ? '; abaixo: ' + ruins.map(y => '«' + y.rot + '» ' + y.pior).join(', ') : '') + ')');
      // os selos de situação do Desempenho: "Risco/Atenção/Sólido" por disciplina e "Crítico/Alto/Médio"
      for (const tab of ['disciplina', 'risco']) {
        await page.evaluate(t => new Promise(r => window.__catedraApp.setState({ anaTab: t }, () => { window.__catedraGoView('analise'); r(); })), tab);
        await page.waitForTimeout(400);
        const sa = (await page.evaluate(() => window.__cd.selos())).filter(y => !y.sino);
        const ra = sa.filter(y => y.pior < PONTOS_MIN);
        ok(sa.length >= 1 && !ra.length, R + 'Desempenho › ' + tab + ' ' + modo + ': selos de situação ≥ 4,5:1 (' + sa.map(y => '«' + y.rot + '» ' + y.pior).join(', ') + ')');
      }
      // a cor de situação (identidade) não mudou: o fundo do selo é o --danger/--warn do modo
      const tk = await page.evaluate(() => { const cs = getComputedStyle(document.querySelector('[data-dark][data-dir]'));
        return ['--danger', '--warn', '--ok'].map(k => cs.getPropertyValue(k).trim().toLowerCase()); });
      ok(JSON.stringify(tk) === JSON.stringify(escuro ? ['#ff7b6e', '#f0a24a', '#3ddba0'] : ['#c0392f', '#a36306', '#0e7f58']), R + 'as cores de situação seguem as mesmas ' + modo + ' (' + tk.join(' ') + ')');
    }
    await page.evaluate(() => { window.CT_SEMANA = undefined; });

    /* ---- LEITURA NO NATIVO: a pílula do seletor de abas do iPad pinta o par dos botões ---- */
    const fonte = async f => { try { const r = await fetch(base + '/' + f); return r.ok ? await r.text() : ''; } catch (_) { return ''; } };
    const ios = await fonte('ios/Sources/main.swift'), mac = await fonte('mac/Sources/main.swift');
    ok(/accentSolid:g\('--accentSolid'\)/.test(ios) && /corPilula\s*=\s*col\("accentSolid"\)/.test(ios),
      R + 'iPad: a ponte de tema lê --accentSolid do app (' + (ios ? 'fonte lida' : 'fonte NÃO lida') + ')');
    ok(/let pilula = corPilula \?\? acento/.test(ios) && /aplicarCores\(fundo: [^,]+, acento: pilula,/.test(ios) && /corSobreAcento = col\("onAccent"\)/.test(ios),
      R + 'iPad: a pílula pinta --accentSolid (queda: --accent) com texto --onAccent');
    // o Mac usa o NSSegmentedControl do sistema (sem pílula do acento): se um dia ler o
    // --onAccent para pintar texto sobre o destaque, tem de ler o --accentSolid junto
    const macLeOn = /'--onAccent'/.test(mac), macLeSolid = /'--accentSolid'/.test(mac);
    ok(!!mac && (!macLeOn || macLeSolid), R + 'Mac: nada pinta texto sobre o destaque sem o --accentSolid (' + (macLeOn ? 'lê --onAccent e ' + (macLeSolid ? 'lê' : 'NÃO lê') + ' --accentSolid' : 'seletor do sistema, sem --onAccent') + ')');
  } finally { await ctx.close(); }

  /* ---- "VERMELHO" E "LARANJA" DO SELETOR SOBREVIVEM A RECARREGAR ----
     Eram var(--danger)/var(--warn) e o _accentGuardado só aceitava hex: a escolha virava
     "padrão do tema" no reload. Contexto novo, clique no botão real dos Ajustes, espera o
     autosave, recarrega e confere a cor pintada nos dois modos. */
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p2 = await ctx2.newPage();
  try {
    await p2.goto(base + '/__semente');
    await p2.evaluate(semear);
    for (const [cor, rot, claro, esc] of [['var(--danger)', 'vermelho', '#c0392f', '#ff7b6e'], ['var(--warn)', 'laranja', '#a36306', '#f0a24a']]) {
      await p2.goto(base + '/Catedra.dc.html');
      await p2.waitForFunction(() => !!window.__catedraApp && typeof window.__catedraGoView === 'function', null, { timeout: 30000 });
      await p2.evaluate(() => new Promise(r => window.__catedraApp.setState({ darkMode: false, dir: 'sutil', ajSec: 'aparencia' }, () => { window.__catedraGoView('ajustes'); r(); })));
      const botao = p2.locator('button[data-c="' + cor + '"]').first();
      let clicou = false;
      try { await botao.waitFor({ state: 'visible', timeout: 6000 }); await botao.click(); clicou = true; } catch (_) {}
      ok(clicou, R + 'COR ' + rot + ': o botão do seletor está nos Ajustes e aceita o clique');
      await p2.waitForTimeout(1400);   // autosave (500 ms) + folga
      const disco = await p2.evaluate(() => localStorage.getItem('catedra:accent'));
      await p2.reload();
      await p2.waitForFunction(() => !!window.__catedraApp, null, { timeout: 30000 });
      await p2.waitForTimeout(900);
      const depois = await p2.evaluate(() => { const app = window.__catedraApp, cs = getComputedStyle(document.querySelector('[data-dark][data-dir]'));
        return { st: app.state.accent, acc: cs.getPropertyValue('--accent').trim().toLowerCase(), dark: !!app.state.darkMode }; });
      ok(depois.st === cor && depois.acc === claro, R + 'COR ' + rot + ' sobrevive a recarregar (disco ' + disco + ' → estado ' + depois.st + ', --accent ' + depois.acc + ', esperado ' + claro + ')');
      // no escuro a mesma escolha acompanha o tom do modo, sem regravar outra coisa no disco
      await p2.evaluate(() => new Promise(r => window.__catedraApp.setState({ darkMode: true }, r)));
      await p2.waitForTimeout(200);
      const noEsc = await p2.evaluate(() => getComputedStyle(document.querySelector('[data-dark][data-dir]')).getPropertyValue('--accent').trim().toLowerCase());
      const disco2 = await p2.evaluate(() => localStorage.getItem('catedra:accent'));
      ok(noEsc === esc && disco2 === JSON.stringify(cor), R + 'COR ' + rot + ' no escuro vira o tom do modo (' + noEsc + ', esperado ' + esc + ') e o disco segue ' + disco2);
      // o portão de login (auth.js) lê a mesma chave: o tom certo, não o verde padrão
      const gate = await p2.evaluate(async (cor) => { const src = await (await fetch('/auth.js')).text();
        const m = /function _accent\(\) \{[\s\S]*?\n  \}/.exec(src); if (!m) return 'sem _accent';
        const f = new Function('localStorage', 'DARK', 'ACENTO_DIR', m[0] + '; return _accent();');
        const ls = { getItem: k => (k === 'catedra:accent' ? JSON.stringify(cor) : (k === 'catedra:dir' ? 'sutil' : null)) };
        return [f(ls, false, { sutil: ['#0f7a57', '#34b88a'] }), f(ls, true, { sutil: ['#0f7a57', '#34b88a'] })].join(' '); }, cor);
      ok(gate === claro + ' ' + esc, R + 'COR ' + rot + ': o portão de login pinta o mesmo tom (' + gate + ')');
      await p2.evaluate(() => new Promise(r => window.__catedraApp.setState({ darkMode: false }, r)));
      await p2.waitForTimeout(700);
    }
  } finally { await ctx2.close(); }
}

function semear() {
  const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
  localStorage.clear();
  set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
  set('cycleMode', 'manual'); set('blocks', []); set('agendaFeitas', {});
  set('edital', [{ disc: 'Direito Civil', peso: 3, questoes: 20, color: '#2563eb',
    topics: [{ name: 'Obrigações', done: false, subs: [{ name: 'Adimplemento' }] }] }]);
  const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  set('sessions', []); set('errors', []); set('fc', []); set('leituras', []);
  set('reviews', [{ id: 'r1', disc: 'Direito Civil', topic: 'Obrigações', due: ontem, date: ontem, stage: 1, up: Date.now() }]);
  const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  set('manualFixed', [{ id: 'ag-civil', disc: 'Direito Civil', kind: 'Teoria', min: 90, dia: DIAS[new Date().getDay()],
    roteiro: '', discEdital: 'Direito Civil', topico: 'Obrigações', subtopico: 'Adimplemento' }]);
}

/* roda na página do host */
function instalar() {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  /** resolve qualquer cor CSS (hex, rgb, color-mix, color(srgb…)) pela sonda do documento */
  const rgb = (doc, s) => { s = String(s || '').trim(); if (!s) return null;
    let p = doc.getElementById('__cd-sonda'); if (!p) { p = doc.createElement('i'); p.id = '__cd-sonda'; p.style.display = 'none'; doc.body.appendChild(p); }
    p.style.color = ''; p.style.color = s; const c = doc.defaultView.getComputedStyle(p).color;
    let m = /rgba?\(([^)]+)\)/.exec(c); if (m) { const v = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return v.length > 3 ? v : v.concat([1]); }
    m = /color\(srgb\s+([^)]+)\)/.exec(c); if (m) { const v = m[1].split(/[\s/]+/).filter(Boolean).map(Number); return [v[0] * 255, v[1] * 255, v[2] * 255, v.length > 3 ? v[3] : 1]; }
    return null; };
  const topo = s => { const o = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) { o.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) o.push(cur.trim()); return o; };
  const txt = c => 'rgb(' + c.slice(0, 3).map(Math.round).join(',') + ')';
  /** fundo pintado: cor sólida, ou as paradas do gradiente + o meio entre as pontas */
  const fundos = (doc, el) => { const cs = doc.defaultView.getComputedStyle(el), bi = cs.backgroundImage;
    if (bi && bi !== 'none') { const m = /^linear-gradient\((.*)\)$/s.exec(bi.trim()); if (m) {
      const st = topo(m[1]).filter(a => !/^(to |[-\d.]+(deg|turn|rad)|in )/.test(a)).map(a => rgb(doc, a.replace(/\s+[-\d.]+(%|px)(\s+[-\d.]+(%|px))?$/, ''))).filter(Boolean);
      if (st.length) { const a = st[0], b = st[st.length - 1]; return st.concat([[0, 1, 2].map(i => (a[i] + b[i]) / 2).concat([1])]); } } }
    const bc = rgb(doc, cs.backgroundColor); return bc && bc[3] > 0.99 ? [bc] : null; };
  const medirEl = (doc, el) => {
    const pts = fundos(doc, el); if (!pts) return { achou: false, motivo: 'sem fundo opaco' };
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return { achou: false, motivo: 'caixa vazia' };
    // o texto: a cor de quem tem nó de texto (ou do próprio elemento), já com a opacidade
    let alvo = el; const tw = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) if (n.textContent.trim()) { alvo = n.parentElement; break; }
    const fg = rgb(doc, doc.defaultView.getComputedStyle(alvo).color); if (!fg) return { achou: false, motivo: 'sem cor de texto' };
    const pior = Math.min(...pts.map(p => cr([0, 1, 2].map(i => fg[i] * fg[3] + p[i] * (1 - fg[3])), p)));
    return { achou: true, pior: Math.round(pior * 100) / 100, texto: txt(fg), fundos: pts.map(txt).join(' → '), pts };
  };
  const raiz = () => document.querySelector('[data-dark][data-dir]');
  const perto = (a, b) => !!a && !!b && [0, 1, 2].every(i => Math.abs(a[i] - b[i]) <= 1.5);
  window.__cd = {
    tokens() {
      const cs = getComputedStyle(raiz()), app = window.__catedraApp;
      const o = {}; ['--accent', '--accentD', '--onAccent', '--accentSolid', '--accentSolidD'].forEach(k => o[k] = cs.getPropertyValue(k).trim().toLowerCase());
      const D = app.THEMES()[app.state.dir], P = D[app.state.darkMode ? 'dark' : 'light'];
      o.esperado = String(app.state.accent || P.accent).toLowerCase();
      o.accentOk = perto(rgb(document, o['--accent']), rgb(document, o.esperado));
      const s = rgb(document, o['--accentSolid']), sd = rgb(document, o['--accentSolidD']), on = rgb(document, o['--onAccent']);
      o.solidOk = !!s && !!sd && !!on;
      o.lumOn = on ? lum(on) : 1;
      o.mesmoSolid = perto(s, rgb(document, o['--accent']));
      return o;
    },
    async medir(view, sel) {
      if (window.__catedraApp.state.view !== view) { window.__catedraGoView(view); }
      let el = null; const t0 = Date.now();
      while (Date.now() - t0 < 4000) { await w(80); el = document.querySelector(sel); if (el && el.getBoundingClientRect().width) break; }
      if (!el) return { achou: false, motivo: 'não achei ' + sel };
      // mede o estado final, sem a transição de .15–.18s que o setState dispara
      el.style.transition = 'none'; el.getBoundingClientRect();
      const m = medirEl(document, el);
      el.style.transition = '';
      if (m.achou) { const s = rgb(document, getComputedStyle(raiz()).getPropertyValue('--accentSolid')); m.fundoEhSolid = perto(m.pts[0], s); delete m.pts; }
      return m;
    },
    /** todo elemento visível com texto próprio cujo fundo inline é --danger/--warn/--ok */
    selos() {
      const out = [];
      // o runtime reescreve o style inline (espaços depois dos dois-pontos): regex, não seletor
      const sit = /background(-color)?:\s*var\(--(danger|warn|ok)\)/;
      for (const el of [...document.querySelectorAll('[style]')].filter(e => sit.test(e.getAttribute('style') || '')).concat([...document.querySelectorAll('.ct-selo-forte')])) {
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
        const t = [...el.childNodes].filter(n => n.nodeType === 3 || (n.nodeType === 1 && !n.matches('svg'))).map(n => n.textContent).join('').trim();
        if (!t) continue;
        el.style.transition = 'none';
        const m = medirEl(document, el); if (!m.achou) continue;
        out.push({ rot: t.slice(0, 40), pior: m.pior, texto: m.texto, fundos: m.fundos, sino: !!el.closest('.ct-sino-barra') });
      }
      return out;
    },
    async medirLegis() {
      if (window.__catedraApp.state.view !== 'legis') window.__catedraGoView('legis');
      const visivel = d => [...d.querySelectorAll('.tabs button.on')].find(b => b.getBoundingClientRect().width > 0);
      const f = () => document.querySelector('iframe[data-ct-view="legis"]') || [...document.querySelectorAll('iframe')].find(x => /legis-web/.test(x.getAttribute('src') || ''));
      const K = ['--accent', '--accentSolid', '--accentSolidD', '--onAccent'];
      const t0 = Date.now(); let fr, d, H, S;
      while (Date.now() - t0 < 12000) {
        await w(150); fr = f(); d = fr && fr.contentDocument;
        if (!d || !visivel(d)) continue;
        const hc = getComputedStyle(raiz()), sc = fr.contentWindow.getComputedStyle(d.documentElement);
        H = K.map(k => hc.getPropertyValue(k).trim().toLowerCase()); S = K.map(k => sc.getPropertyValue(k).trim().toLowerCase());
        if (H.every((v, i) => v && v === S[i])) break;
      }
      if (!d) return { achou: false, motivo: 'o iframe do LEGIS não abriu' };
      const aba = visivel(d);
      if (!aba) return { achou: false, motivo: 'sem .tabs button.on visível' };
      aba.style.transition = 'none';
      const a = medirEl(d, aba);
      return { achou: a.achou, motivo: a.motivo, copiados: !!H && H.every((v, j) => v && v === S[j]),
        resumo: K.map((k, j) => k + ' ' + (H && H[j]) + '/' + (S && S[j])).join(', '),
        aba: { ...a, rot: (aba.textContent || '').trim().slice(0, 20) } };
    }
  };
}

/* ===================================================================================
   BANNER DO INÍCIO (.cth-hero) — medido nos PIXELS que o motor pintou.
   O fundo do banner é o --heroGrad com dois realces radiais, a sombra de baixo (::after),
   o vidro das fichas e o painel desfocado do cronômetro: a conta pela cor da parada não
   enxerga metade disso. Então: some o texto (cor transparente, emoji escondido, sem sombra
   nem transição), fotografa o banner, devolve o texto e, para CADA nó de texto, compara a
   cor dele (com a opacidade) com cada pixel do fundo dentro das caixas do texto (passo de
   2 px). O pior pixel é o número. elementFromPoint no centro de cada caixa garante que
   nada cobre o texto (a foto seria de outra coisa). */
export const HERO_DIRS = ['sutil', 'premium', 'clean', 'moderno', 'aurora', 'solar', 'terminal', 'holo'];

function heroPreparar() {
  const h = document.querySelector('.cth-hero'); if (!h) return null;
  let s = h.parentElement; while (s) { if (s.scrollTop) s.scrollTop = 0; s = s.parentElement; } window.scrollTo(0, 0);
  let st = document.getElementById('__hero-sem-texto');
  if (!st) { st = document.createElement('style'); st.id = '__hero-sem-texto'; document.head.appendChild(st); }
  st.textContent = '.cth-hero,.cth-hero *{color:transparent!important;-webkit-text-fill-color:transparent!important;'
    + 'text-shadow:none!important;transition:none!important;animation:none!important;caret-color:transparent!important}'
    + '.cth-hero .ct-emo{visibility:hidden!important}';
  const r = h.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}

async function heroMedir({ b64, box }) {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
  const px = cx.getImageData(0, 0, cv.width, cv.height).data, esc = cv.width / box.width;
  const st = document.getElementById('__hero-sem-texto');
  st.textContent = '.cth-hero,.cth-hero *{transition:none!important;animation:none!important}';
  const h = document.querySelector('.cth-hero'), hr = h.getBoundingClientRect();
  const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const sonda = document.createElement('i'); sonda.style.display = 'none'; document.body.appendChild(sonda);
  const rgb = s => { sonda.style.color = ''; sonda.style.color = s; const c = getComputedStyle(sonda).color;
    let m = /rgba?\(([^)]+)\)/.exec(c); if (m) { const v = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return v.length > 3 ? v : v.concat([1]); }
    m = /color\(srgb\s+([^)]+)\)/.exec(c); if (m) { const v = m[1].split(/[\s/]+/).filter(Boolean).map(Number); return [v[0] * 255, v[1] * 255, v[2] * 255, v.length > 3 ? v[3] : 1]; }
    return null; };
  const itens = [], cobertos = [];
  const tw = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (!/[\p{L}\p{N}]/u.test(n.textContent)) continue;          // emoji e símbolo sozinho não são texto
    const el = n.parentElement, cs = getComputedStyle(el);
    if (cs.visibility !== 'visible' || el.closest('.ct-emo')) continue;
    const fg = rgb(cs.color); if (!fg) continue;
    let op = 1; for (let e = el; e && e !== h.parentElement; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    const a = fg[3] * op;
    const rg = document.createRange(); rg.selectNodeContents(n);
    let pior = Infinity, piorBg = null, amostras = 0;
    for (const r of rg.getClientRects()) {
      if (r.width < 2 || r.height < 2) continue;
      const topo = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!topo || !h.contains(topo)) cobertos.push(n.textContent.trim().slice(0, 30));
      for (let y = r.top + 1; y < r.bottom - 1; y += 2) for (let x = r.left + 1; x < r.right - 1; x += 2) {
        const X = Math.floor((x - hr.left) * esc), Y = Math.floor((y - hr.top) * esc);
        if (X < 0 || Y < 0 || X >= cv.width || Y >= cv.height) continue;
        const i = (Y * cv.width + X) * 4, bg = [px[i], px[i + 1], px[i + 2]];
        const c = cr([0, 1, 2].map(k => fg[k] * a + bg[k] * (1 - a)), bg); amostras++;
        if (c < pior) { pior = c; piorBg = bg; }
      }
    }
    if (!amostras) continue;
    itens.push({ txt: n.textContent.trim().slice(0, 34), cls: (el.className && String(el.className)) || el.tagName.toLowerCase(),
      cor: 'rgba(' + fg.slice(0, 3).map(Math.round).join(',') + ',' + (Math.round(a * 100) / 100) + ')',
      fundo: 'rgb(' + piorBg.join(',') + ')', pior: Math.round(pior * 100) / 100, amostras });
  }
  sonda.remove(); st.remove();
  itens.sort((x, y) => x.pior - y.pior);
  return { itens, cobertos, pior: itens.length ? itens[0].pior : 0 };
}

/** Mede o banner do Início num caso {dir, escuro, acc} e numa largura. `rodando` mostra o
 *  rótulo "Sessão em andamento" no lugar de "Cronômetro". Devolve também o PNG com o texto,
 *  para as capturas. */
export async function medirBannerInicio(page, caso, largura, opcoes = {}) {
  await page.setViewportSize({ width: largura, height: opcoes.altura || 1400 });
  await page.waitForFunction(w => window.innerWidth === w, largura, { timeout: 5000 });
  await page.evaluate(c => new Promise(r => { const app = window.__catedraApp;
    const prova = new Date(Date.now() + 120 * 864e5).toISOString().slice(0, 10);
    app.setState({ dir: c.dir, accent: c.acc || null, darkMode: !!c.escuro, provaData: prova, timerRunning: !!c.rodando,
      prefs: { ...app.state.prefs, objetivo: 'Magistratura TJSP' } }, () => { try { app._temaBroadcast(); } catch (_) {}
      if (app.state.view !== 'inicio') window.__catedraGoView('inicio'); r(); }); }), { ...caso, rodando: !!opcoes.rodando });
  await page.waitForFunction(() => { const h = document.querySelector('.cth-hero'); return !!h && h.getBoundingClientRect().width > 0; }, null, { timeout: 8000 });
  // a grade do banner muda de uma coluna para duas pela largura: espera a caixa caber na janela
  await page.waitForFunction(w => { const h = document.querySelector('.cth-hero'); return !!h && h.getBoundingClientRect().right <= w; }, largura, { timeout: 5000 });
  await page.waitForTimeout(350);
  const box = await page.evaluate(heroPreparar);
  if (!box) return { achou: false };
  await page.waitForTimeout(60);
  const semTexto = await page.screenshot({ clip: box, animations: 'disabled' });
  const m = await page.evaluate(heroMedir, { b64: semTexto.toString('base64'), box });
  let foto = null;
  if (opcoes.foto) { await page.waitForTimeout(80);
    foto = await page.screenshot({ clip: { x: 0, y: Math.max(0, box.y - 16), width: largura, height: Math.min(1400 - Math.max(0, box.y - 16), box.height + 150) }, animations: 'disabled' }); }
  if (opcoes.rodando) await page.evaluate(() => new Promise(r => window.__catedraApp.setState({ timerRunning: false }, r)));
  return { achou: true, ...m, foto, caixa: Math.round(box.width) + '×' + Math.round(box.height) };
}
