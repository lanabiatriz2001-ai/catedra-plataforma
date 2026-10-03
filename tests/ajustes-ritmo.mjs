/* AJUSTES · RITMO E METAS (03/10/2026). A aba foi refeita: perfis prontos, régua única de
   metas e energia de hoje × energia base. Aqui se prova a LÓGICA pelo componente
   (window.__catedraApp) e, mais abaixo, a aparência medida. */

const semear = async (page, base, orient) => {
  await page.goto(base + '/__semente');
  await page.evaluate((o) => {
    localStorage.clear();
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
    set('edital', [
      { disc: 'Direito Civil', peso: 3, questoes: 15, topics: [{ name: 'Obrigações', done: false, subs: [] }, { name: 'Contratos', done: false, subs: [] }] },
      { disc: 'Direito Penal', peso: 2, questoes: 10, topics: [{ name: 'Teoria do crime', done: false, subs: [] }] },
      { disc: 'Direito Constitucional', peso: 2, questoes: 10, topics: [{ name: 'Controle', done: false, subs: [] }] }]);
    set('sessions', []); set('reviews', []); set('errors', []);
    if (o) set('orient', o);
  }, orient || null);
};
const abrir = async (page, base, arquivo) => {
  await page.goto(base + '/' + arquivo);
  await page.waitForFunction(() => !!window.__catedraApp && !!document.querySelector('#ct-main'), null, { timeout: 20000 });
  await page.evaluate(() => window.__catedraApp.setState({ view: 'ajustes', ajSec: 'ritmo' }));
  await page.waitForTimeout(400);
};
const orientSalvo = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('catedra:orient') || '{}'));

export async function testarAjustesRitmo(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const arquivo = opcoes.arquivo || 'Catedra.dc.html';
  const R = 'RITMO [' + motor + '] ';
  const browser = pageDaSuite.context().browser();

  // ── perfis e régua ─────────────────────────────────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
    try {
      await semear(page, base); await abrir(page, base, arquivo);
      ok(await page.evaluate(() => window.__catedraApp._rmPerfilAtual()) === 'equilibrio', R + 'fábrica é o perfil Equilíbrio');

      await page.evaluate(() => window.__catedraApp.rmAplicarPerfil({ currentTarget: { dataset: { v: 'intensivo' } } }));
      await page.waitForTimeout(1400);
      let o = await orientSalvo(page);
      ok(o.metaMin === '120' && o.metaIdeal === '300' && o.metaForte === '420' && o.blocoPadrao === '60' && o.cobranca === 'rigido',
        R + 'Intensivo grava os cinco valores (' + JSON.stringify([o.metaMin, o.metaIdeal, o.metaForte, o.blocoPadrao, o.cobranca]) + ')');
      ok(o.tempoDia === '300', R + 'tempoDia espelha a meta ideal');
      ok(await page.evaluate(() => window.__catedraApp.state.prefs.metaDiaria) === 5, R + 'prefs.metaDiaria espelha a meta ideal em horas');
      ok(await page.evaluate(() => window.__catedraApp._rmPerfilAtual()) === 'intensivo', R + 'perfil em uso passa a ser Intensivo');

      await page.evaluate(() => window.__catedraApp.rmDesfazerPerfil());
      await page.waitForTimeout(1400);
      o = await orientSalvo(page);
      ok(o.metaIdeal === '180' && o.blocoPadrao === '50' && o.cobranca === 'equilibrado', R + 'Desfazer devolve os valores de antes');

      // régua: + na mínima empurra ideal e forte; nunca mínimo > ideal > forte
      await page.evaluate(() => { const a = window.__catedraApp; for (let i = 0; i < 20; i++) a.rmPasso({ currentTarget: { dataset: { k: 'metaMin', d: '15' } } }); });
      await page.waitForTimeout(1400);
      o = await orientSalvo(page);
      ok(+o.metaMin === 360 && +o.metaIdeal === 360 && +o.metaForte === 360, R + 'régua empurra as vizinhas (' + [o.metaMin, o.metaIdeal, o.metaForte] + ')');
      ok(await page.evaluate(() => window.__catedraApp._rmPerfilAtual()) === '', R + 'valores fora da tabela = Personalizado');

      // digitado fora de ordem e campo vazio
      await page.evaluate(() => { const a = window.__catedraApp;
        a.setState(s => ({ orient: { ...s.orient, metaMin: '300', metaIdeal: '120', metaForte: '' } }));
        a.rmOrdenarMetas({ currentTarget: { dataset: { k: 'metaMin' } } }); });
      await page.waitForTimeout(1400);
      o = await orientSalvo(page);
      // o forte ficou vazio: volta o último gravado (360) e a ordem se conserta em volta do mínimo editado
      ok(+o.metaMin === 300 && +o.metaIdeal === 300 && +o.metaForte === 360, R + 'ordenar preserva o campo editado, conserta o ideal e devolve o forte vazio ao último gravado (' + [o.metaMin, o.metaIdeal, o.metaForte] + ')');
      ok([o.metaMin, o.metaIdeal, o.metaForte, o.tempoDia].every(v => /^\d+$/.test(String(v))), R + 'nenhum NaN nem vazio no storage');
    } finally { await ctx.close(); }
  }

  // ── energia de hoje × base, com relógio fixo ───────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
    const t = new Date(); t.setHours(14, 0, 0, 0);
    await page.clock.install({ time: t });
    try {
      // legado: energiaPlano 'baixa' sem energiaDia → vira a base (ninguém muda de ritmo sem pedir)
      await semear(page, base, { energia: 'normal', energiaPlano: 'baixa' }); await abrir(page, base, arquivo);
      ok(await page.evaluate(() => window.__catedraApp._enHoje()) === 'baixa', R + 'migração: energia antiga vira a base');
      ok(await page.evaluate(() => window.__catedraApp.state.orient.energia) === 'baixa', R + 'migração grava orient.energia');

      await page.evaluate(() => window.__catedraApp.setOrientRadio({ currentTarget: { dataset: { v: 'alta' } } }));
      await page.waitForTimeout(1400);
      ok(await page.evaluate(() => window.__catedraApp._enHoje()) === 'alta', R + 'energia de hoje vale hoje');
      const o = await orientSalvo(page);
      ok(/^\d{4}-\d{2}-\d{2}$/.test(o.energiaDia), R + 'energiaDia carimbado com o dia de estudo');

      // migração idempotente: reaplicar não troca a base
      ok(await page.evaluate(() => { const a = window.__catedraApp; return a._rmMigrarEnergia({ ...a.state.orient }).energia; }) === 'baixa', R + 'migração não roda duas vezes');

      await page.clock.fastForward(26 * 60 * 60 * 1000);
      ok(await page.evaluate(() => window.__catedraApp._enHoje()) === 'baixa', R + 'no dia seguinte volta à base');
    } finally { await ctx.close(); }
  }

  // ── aparência medida ───────────────────────────────────────────────────────────
  const medir = () => {
    // cor computada → [r,g,b,a] em 0–255 (aceita rgb(), rgba() e color(srgb …), que é o que color-mix devolve)
    const cor = (c) => { const m = (c.match(/-?[\d.]+(e-?\d+)?/g) || []).map(Number); const k = /^color\(/.test(c) ? 255 : 1;
      return [m[0] * k, m[1] * k, m[2] * k, m.length > 3 ? m[3] : 1]; };
    const lum = (c) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
    const sobre = (a, b) => [0, 1, 2].map(i => a[i] * a[3] + b[i] * (1 - a[3])).concat(1);
    // fundo efetivo: compõe as camadas translúcidas de baixo para cima
    const fundoDe = (el) => { const pilha = []; for (let n = el; n; n = n.parentElement) { const b = cor(getComputedStyle(n).backgroundColor); if (b[3] > 0) { pilha.push(b); if (b[3] >= 1) break; } }
      let f = [255, 255, 255, 1]; for (let i = pilha.length - 1; i >= 0; i--) f = sobre(pilha[i], f); return f; };
    const razao = (el) => { const fd = fundoDe(el); const tx = sobre(cor(getComputedStyle(el).color), fd); const A = lum(tx), B = lum(fd); return (Math.max(A, B) + .05) / (Math.min(A, B) + .05); };
    const r = {};
    window.scrollTo(0, document.documentElement.scrollHeight); const sc = document.querySelector('#ct-main'); if (sc) sc.scrollTop = sc.scrollHeight;
    r.rolou = (window.scrollY || 0) + (sc ? sc.scrollTop : 0);
    const pv = document.querySelector('[data-rm="previa"]').getBoundingClientRect();
    const tb = document.querySelector('.ct-topbar').getBoundingClientRect();
    r.previa = { top: Math.round(pv.top), bottom: Math.round(pv.bottom), h: Math.round(pv.height), topbar: Math.round(tb.bottom) };
    // visível de verdade: dentro da janela e não escondida atrás da barra superior
    // visível de verdade: dentro da janela, abaixo da barra superior e SEM nada por cima —
    // o ponto do meio do título e o do número pertencem à prévia (presença na janela não bastava:
    // o cabeçalho fixo dos Ajustes já a cobriu inteira e a medida de caixa dizia "visível")
    const pvEl = document.querySelector('[data-rm="previa"]');
    const naFrente = ['.ct-rm-previa-eb', '.ct-rm-previa-num'].every(q => { const b = pvEl.querySelector(q).getBoundingClientRect();
      const alvo = document.elementFromPoint(b.left + Math.min(b.width / 2, 40), b.top + b.height / 2); return !!alvo && pvEl.contains(alvo); });
    r.previa.naFrente = naFrente;
    r.previaVisivel = pv.height > 60 && pv.top >= tb.bottom - 1 && pv.top < innerHeight * .6 && naFrente;
    r.semRolagemLateral = document.documentElement.scrollWidth <= innerWidth + 1;
    window.scrollTo(0, 0); if (sc) sc.scrollTop = 0;
    r.contraste = [...document.querySelectorAll('.ct-rm-perfil-nome, .ct-rm-perfil-desc, .ct-rm-perfil-resumo, .ct-rm-opc b, .ct-rm-opc span, .ct-rm-hm, .ct-rm-sub, .ct-rm-h, .ct-rm-recolhe > summary')]
      .map(el => ({ t: el.textContent.trim().slice(0, 24), c: +razao(el).toFixed(2) })).filter(x => x.c < 4.5);
    r.alvos = [...document.querySelectorAll('.ct-rm button, .ct-rm summary')].filter(b => b.offsetParent)
      .map(b => { const q = b.getBoundingClientRect(); return { t: (b.getAttribute('aria-label') || b.textContent).trim().slice(0, 24), w: Math.round(q.width), h: Math.round(q.height) }; })
      .filter(x => x.w < 44 || x.h < 44);
    r.perfis = document.querySelectorAll('[data-rm="perfil"]').length;
    r.marcado = document.querySelectorAll('[data-rm="perfil"][aria-pressed="true"]').length;
    r.segmentos = document.querySelectorAll('[data-rm="barra"] i').length;
    r.emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(document.querySelector('.ct-rm').textContent);
    r.colunas = getComputedStyle(document.querySelector('[data-rm="colunas"]')).display === 'grid' ? 2 : 1;
    return r;
  };
  for (const [w, h, toque] of [[1280, 900, false], [768, 1024, true], [390, 844, true]]) {
    for (const escuro of [false, true]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: toque });
      const page = await ctx.newPage();
      page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
      try {
        await semear(page, base); await abrir(page, base, arquivo);
        await page.evaluate((d) => window.__catedraApp.setState({ darkMode: d }), escuro); await page.waitForTimeout(400);
        const r = await page.evaluate(medir); const T = R + w + 'px ' + (escuro ? 'escuro' : 'claro') + ': ';
        ok(r.rolou > 200, T + 'a página rolou de fato (' + r.rolou + ' px)');
        ok(r.previaVisivel, T + 'prévia continua à vista depois de rolar até o fim (' + JSON.stringify(r.previa) + ')');
        ok(r.semRolagemLateral, T + 'sem rolagem lateral');
        ok(r.contraste.length === 0, T + 'textos ≥ 4,5:1 (' + JSON.stringify(r.contraste) + ')');
        if (toque) ok(r.alvos.length === 0, T + 'alvos ≥ 44 px (' + JSON.stringify(r.alvos) + ')');
        ok(r.perfis === 3 && r.marcado === 1, T + 'três perfis, um marcado (fábrica = Equilíbrio)');
        ok(r.segmentos > 0, T + 'barra do dia tem segmentos (' + r.segmentos + ')');
        ok(!r.emoji, T + 'nenhum emoji como ícone');
        ok(r.colunas === (w >= 1280 ? 2 : 1), T + (w >= 1280 ? 'duas colunas' : 'uma coluna') + ' (' + r.colunas + ')');
        if (opcoes.capturas) await page.locator('.ct-rm-caixa').screenshot({ path: opcoes.capturas + '/ritmo-' + motor + '-' + w + (escuro ? '-escuro' : '') + '.png' });
      } finally { await ctx.close(); }
    }
  }

  // ── a prévia branca sobre o gradiente: gradiente não tem "cor de fundo", então o texto
  //    branco é medido contra CADA cor do --heroGrad (a mais clara é a que decide) ──
  for (const escuro of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    try {
      await semear(page, base); await abrir(page, base, arquivo);
      await page.evaluate((d) => window.__catedraApp.setState({ darkMode: d }), escuro); await page.waitForTimeout(400);
      const pior = await page.evaluate(() => {
        const el = document.querySelector('[data-rm="previa"]'); const g = getComputedStyle(el).backgroundImage;
        // camadas do fundo: a 1ª é o véu (cor única translúcida), a última é o gradiente do tema
        const camadas = g.split(/,\s*(?=(?:linear|radial)-gradient\()/);
        const num = (c) => { const m = c.match(/-?[\d.]+(e-?\d+)?/g).map(Number); const k = /^color\(/.test(c) ? 255 : 1; return [m[0] * k, m[1] * k, m[2] * k, m.length > 3 ? m[3] : 1]; };
        const pega = (t) => (t.match(/(rgba?|color)\([^)]+\)/g) || []).map(num);
        const veu = camadas.length > 1 ? pega(camadas[0])[0] : [0, 0, 0, 0];
        const cores = pega(camadas[camadas.length - 1]).map(c => [0, 1, 2].map(i => veu[i] * veu[3] + c[i] * (1 - veu[3])));
        const lum = (c) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
        return { n: cores.length, veu: veu[3], min: cores.length ? Math.min(...cores.map(c => 1.05 / (lum(c) + .05))) : 0, txt: getComputedStyle(el).color };
      });
      ok(pior.n >= 2 && pior.min >= 4.5, R + (escuro ? 'escuro' : 'claro') + ': texto branco da prévia ≥ 4,5:1 em todas as cores do gradiente (' + pior.min.toFixed(2) + ', ' + pior.n + ' cores)');
    } finally { await ctx.close(); }
  }

  // ── interação pela tela + zero dias ─────────────────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
    try {
      await semear(page, base); await abrir(page, base, arquivo);
      const antes = await page.locator('[data-rm="previa"] .ct-rm-previa-num').innerText();
      await page.click('[data-rm="perfil"][data-v="constancia"]'); await page.waitForTimeout(1400);
      ok((await orientSalvo(page)).metaIdeal === '120', R + 'clicar em Constância grava a meta de 2h');
      const depois = await page.locator('[data-rm="previa"] .ct-rm-previa-num').innerText();
      ok(antes !== depois && /2h/.test(depois), R + 'a prévia muda na hora (' + antes.replace(/\s+/g, ' ') + ' → ' + depois.replace(/\s+/g, ' ') + ')');
      ok(await page.locator('[data-rm="desfazer"]').isVisible(), R + 'Desfazer aparece depois de aplicar');
      await page.click('[data-rm="desfazer"]'); await page.waitForTimeout(1400);
      ok((await orientSalvo(page)).metaIdeal === '180', R + 'Desfazer pela tela restaura');
      await page.click('button[data-k="metaIdeal"][data-d="15"]'); await page.waitForTimeout(500);
      ok(await page.locator('[data-rm="personalizado"]').isVisible(), R + 'mexer num valor mostra "Personalizado"');
      ok(await page.locator('#aj-f-metaIdeal').inputValue() === '195', R + 'o campo da meta ideal acompanha o passo (195)');
      const minAntes = await page.evaluate(() => [...document.querySelectorAll('.ct-rm-previa-linha span:last-child')].map(x => x.textContent).join(','));
      await page.click('[data-rm="energia-hoje"][data-v="baixa"]'); await page.waitForTimeout(500);
      const minDepois = await page.evaluate(() => [...document.querySelectorAll('.ct-rm-previa-linha span:last-child')].map(x => x.textContent).join(','));
      ok(minAntes !== minDepois, R + 'energia de hoje baixa encurta os blocos da prévia (' + minAntes + ' → ' + minDepois + ')');
      await page.evaluate(() => window.__catedraApp.setState(s => ({ orient: { ...s.orient, dias: '' } }))); await page.waitForTimeout(400);
      const txt = await page.locator('[data-rm="previa"]').innerText();
      ok(/nenhum dia marcado/i.test(txt) && !/NaN|Infinity/.test(txt), R + 'zero dias: a prévia avisa, sem NaN');
    } finally { await ctx.close(); }
  }

  // ── achados da revisão independente (03/10/2026) ───────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
    const t = new Date(); t.setHours(14, 0, 0, 0); await page.clock.install({ time: t });
    try {
      await semear(page, base); await abrir(page, base, arquivo);
      // I1 — aparelho na versão ANTIGA sobe o orient inteiro sem energiaDia: a energia base e a
      // de hoje deste aparelho não podem mudar por causa disso (a migração é do legado LOCAL)
      await page.evaluate(() => { const a = window.__catedraApp;
        a.setOrientVal({ currentTarget: { dataset: { k: 'energia', v: 'baixa' } } });
        a.setOrientRadio({ currentTarget: { dataset: { v: 'alta' } } }); });
      await page.waitForTimeout(1400);
      const r1 = await page.evaluate(() => { const a = window.__catedraApp;
        const velho = JSON.parse(localStorage.getItem('catedra:orient')); delete velho.energiaDia; velho.energia = 'normal'; velho.energiaPlano = 'normal'; velho.aoAbrir = 'ciclo';
        localStorage.setItem('catedra:orient', JSON.stringify(velho)); a._rehydrateFromLocal();
        return new Promise(res => setTimeout(() => res({ base: a.state.orient.energia, hoje: a._enHoje(), dia: a.state.orient.energiaDia, veio: a.state.orient.aoAbrir }), 300)); });
      ok(r1.veio === 'ciclo', R + 'reidratação: os outros ajustes do aparelho antigo chegam (' + r1.veio + ')');
      ok(r1.base === 'baixa' && r1.hoje === 'alta' && /^\d{4}-/.test(r1.dia), R + 'reidratação de orient sem energiaDia não mexe na energia base nem na de hoje (' + JSON.stringify(r1) + ')');

      // I2 — apagar o número para digitar outro não grava vazio nem zera tempoDia
      await page.evaluate(() => { const a = window.__catedraApp; a.setOrient({ currentTarget: { dataset: { k: 'metaIdeal' }, value: '' } }); });
      await page.waitForTimeout(1400);
      let o = await orientSalvo(page);
      ok(/^\d+$/.test(String(o.metaIdeal)) && +o.metaIdeal > 0 && o.tempoDia !== '0', R + 'campo de meta vazio não chega ao storage (metaIdeal ' + JSON.stringify(o.metaIdeal) + ', tempoDia ' + JSON.stringify(o.tempoDia) + ')');
      ok(await page.evaluate(() => window.__catedraApp.state.orient.metaIdeal) === '', R + 'o campo continua vazio na tela enquanto a pessoa digita');
      await page.evaluate(() => { const a = window.__catedraApp; a.setOrient({ currentTarget: { dataset: { k: 'metaIdeal' }, value: '240' } }); });
      await page.waitForTimeout(1400);
      o = await orientSalvo(page);
      ok(o.metaIdeal === '240' && o.tempoDia === '240', R + 'valor válido digitado é gravado (240)');
      // saiu do campo vazio: volta ao último valor gravado, não vira "sem meta"
      const r2 = await page.evaluate(() => { const a = window.__catedraApp; a.setOrient({ currentTarget: { dataset: { k: 'metaIdeal' }, value: '' } });
        a.rmOrdenarMetas({ currentTarget: { dataset: { k: 'metaIdeal' } } }); return new Promise(res => setTimeout(() => res(a.state.orient.metaIdeal), 200)); });
      ok(r2 === '240', R + 'sair do campo vazio devolve o último valor gravado (' + r2 + ')');
    } finally { await ctx.close(); }
  }
}
