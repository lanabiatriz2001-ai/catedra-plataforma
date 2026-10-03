/* REDAÇÃO — MESA DE PROVA (03/10/2026)
   A etapa de responder discursiva: questão ao lado da folha, papel primeiro, folha pautada
   e espelho com quesitos. Spec: docs/superpowers/specs/2026-10-03-redacao-mesa-de-prova-design.md
   Cada bloco roda em contexto próprio (relógio fixo, storage isolado). */

export const ENUN = 'TJ-SP · Juiz Substituto · 2025 — VUNESP\n\nConsidere a seguinte situação hipotética: o autor obteve tutela antecipada antecedente e o réu não recorreu. Responda, em até 30 linhas:\n\na) Há estabilização da tutela?\nb) Qual o prazo da ação de revisão?\nc) Forma-se coisa julgada?';
export const GAB = 'Instruções gerais da banca.\n1. Reconhece a estabilização da tutela, art. 304 do CPC [escala: 0,00/0,10/0,20/0,30]\n2. Indica o prazo de dois anos, art. 304, § 5º, do CPC [escala: 0,00/0,10/0,20/0,30]\n3. Afasta a coisa julgada, art. 304, § 6º, do CPC (0,40 ponto)';

export async function novoContexto(pageDaSuite, viewport) {
  const ctx = await pageDaSuite.context().browser().newContext({ viewport: viewport || { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  const t = new Date(); t.setHours(14, 0, 0, 0);
  await page.clock.install({ time: t });
  return { ctx, page };
}

export async function semear(page, base, extra) {
  await page.goto(base + '/__semente');
  await page.evaluate(({ ENUN, GAB, extra }) => {
    localStorage.clear();
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
    set('edital', [{ disc: 'Direito Processual Civil', peso: 2, questoes: 10, topics: [{ name: 'Tutela provisória', done: false, subs: [] }] }]);
    set('redEnunciado', JSON.stringify(ENUN)); set('redGabarito', JSON.stringify(GAB));
    Object.keys(extra || {}).forEach(k => set(k, JSON.stringify(extra[k])));
  }, { ENUN, GAB, extra: extra || {} });
}

export async function abrirRedacao(page, base, arquivo) {
  await page.goto(base + '/' + (arquivo || 'Catedra.dc.html'));
  await page.waitForFunction(() => typeof window.__catedraGoView === 'function');
  await page.evaluate(() => window.__catedraGoView('redacao'));
  await page.waitForSelector('[data-red="mesa"]', { timeout: 8000 });
}

const caixa = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sel);

export async function testarRedacaoMesa(pageDaSuite, base, ok, opcoes = {}) {
  const R = 'MESA [' + (opcoes.motor || 'chromium') + '] ';
  const blocos = [arranjo, papel];
  for (const b of blocos) {
    try { await b(pageDaSuite, base, ok, R, opcoes); }
    catch (e) { ok(false, R + b.name + ' exceção: ' + e.message); }
  }
}

async function arranjo(pageDaSuite, base, ok, R) {
  const { ctx, page } = await novoContexto(pageDaSuite);
  try {
    await semear(page, base); await abrirRedacao(page, base);
    let q = await caixa(page, '[data-red="questao"]'), f = await caixa(page, '[data-red="folha"]'), e = await caixa(page, '[data-red="espelho"]');
    ok(!!q && !!f && Math.abs(q.y - f.y) < 4 && f.x > q.x + q.w - 2, R + '1280: questão e folha lado a lado, mesmo topo');
    ok(!!e && e.y >= Math.max(q.y + q.h, f.y + f.h) - 2 && e.w > q.w + f.w - 4, R + '1280: faixa do espelho abaixo, em largura total');
    ok((await page.textContent('[data-red="chip-limite"]')).includes('30 linhas'), R + 'chip do limite de linhas vem do enunciado');
    ok((await page.textContent('[data-red="chip-comandos"]')).includes('3 comandos'), R + 'chip conta os comandos do enunciado');
    ok(await page.evaluate(() => !!document.querySelector('[data-red="questao"] #red-disciplina')), R + 'seletor de disciplina mora na coluna da questão');
    ok(await page.locator('[data-red="editar-questao"]').count() === 1, R + 'questão colada pode ser editada');
    await page.click('[data-red="editar-questao"]');
    ok(await page.locator('[data-red="questao"] textarea').count() === 1, R + 'editar abre o enunciado num campo');
    await page.click('[data-red="editar-questao"]');
    await page.click('[data-red="marcas-toggle"]');
    ok(await page.locator('[data-red="questao"] :text("Nada marcado ainda")').count() === 1, R + 'marcações abrem dentro da coluna da questão');
    await page.screenshot({ path: 'tests/_capturas/mesa-1280.png', fullPage: true }).catch(() => {});

    await page.setViewportSize({ width: 768, height: 1024 }); await page.waitForTimeout(400);
    q = await caixa(page, '[data-red="questao"]'); f = await caixa(page, '[data-red="folha"]');
    ok(f.y >= q.y + q.h - 2 && Math.abs(f.x - q.x) < 4, R + '768: empilhado, questão acima da folha');
    await page.click('[data-red="questao-toggle"]'); await page.waitForTimeout(200);
    const q2 = await caixa(page, '[data-red="questao"]');
    ok(q2.h < q.h / 2, R + '768: questão recolhe e sobra só o cabeçalho');
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), R + '768: nada estoura na horizontal');
    await page.screenshot({ path: 'tests/_capturas/mesa-768.png', fullPage: true }).catch(() => {});
  } finally { await ctx.close(); }

  // questão do banco não é editável
  const b = await novoContexto(pageDaSuite);
  try {
    await semear(b.page, base, { redProvaId: 'x1' }); await abrirRedacao(b.page, base);
    await b.page.evaluate(() => { const c = window.__catedraApp; if (c) c.setState({ redModoProva: true }); });
    await b.page.waitForTimeout(200);
    ok(await b.page.locator('[data-red="editar-questao"]').count() === 0, R + 'questão do banco não mostra "Editar questão"');
  } finally { await b.ctx.close(); }
}

const lerStore = (page, k) => page.evaluate(k => { try { return JSON.parse(localStorage.getItem('catedra:' + k)); } catch (_) { return null; } }, k);

async function papel(pageDaSuite, base, ok, R) {
  let { ctx, page } = await novoContexto(pageDaSuite);
  try {
    await semear(page, base); await abrirRedacao(page, base);
    ok(await page.getAttribute('[data-red="modo-mao"]', 'aria-pressed') === 'true', R + 'questão nova abre em "À mão"');
    ok(await page.locator('[data-red="folha"] textarea').count() === 0, R + 'à mão não mostra campo de digitar');
    ok((await page.textContent('[data-red="crono"]')).trim() === '00:00', R + 'cronômetro parado em 00:00 antes de começar');
    await page.clock.runFor(5000);
    ok((await page.textContent('[data-red="crono"]')).trim() === '00:00', R + 'cronômetro à mão não anda sozinho');
    await page.click('[data-red="crono-btn"]'); await page.clock.runFor(65000);
    // o relógio instalado continua correndo em tempo real entre os passos: 01:05 ou 01:06
    ok(/^01:0[56]$/.test((await page.textContent('[data-red="crono"]')).trim()), R + '"Começar" faz o tempo andar com o relógio');
    await page.click('[data-red="crono-btn"]');
    const pausado = (await page.textContent('[data-red="crono"]')).trim();
    await page.clock.runFor(30000);
    ok((await page.textContent('[data-red="crono"]')).trim() === pausado, R + '"Pausar" congela o tempo');
    await page.clock.runFor(1500);
    ok(Math.abs((await lerStore(page, 'redTempoMs')) - 65000) < 3000, R + 'tempo pausado é salvo');
    // Review Focus 1: fechar com o cronômetro andando não perde o que passou
    await page.click('[data-red="crono-btn"]'); await page.clock.runFor(40000);
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.clock.runFor(1500);
    ok((await lerStore(page, 'redTempoMs')) >= 100000, R + 'tempo em curso é salvo quando a janela some');
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); });
    await abrirRedacao(page, base);
    ok(/^01:4\d$/.test((await page.textContent('[data-red="crono"]')).trim()), R + 'tempo volta depois de recarregar');
    // sair da view pausa
    await page.click('[data-red="crono-btn"]'); await page.clock.runFor(2000);
    const antes = (await page.textContent('[data-red="crono"]')).trim();
    await page.evaluate(() => window.__catedraGoView('inicio')); await page.clock.runFor(20000);
    await page.evaluate(() => window.__catedraGoView('redacao')); await page.waitForSelector('[data-red="crono"]');
    const seg = t => t.split(':').reduce((a, x) => a * 60 + (+x), 0);
    const depois = (await page.textContent('[data-red="crono"]')).trim();
    ok(seg(depois) - seg(antes) <= 2, R + 'sair da Redação pausa o cronômetro (' + antes + ' → ' + depois + ')');
  } finally { await ctx.close(); }

  ({ ctx, page } = await novoContexto(pageDaSuite));
  try {
    await semear(page, base, { redText: 'Rascunho digitado em outra sessão.', redTextTs: Date.now() - 3600e3, redTempoMs: 120000 });
    await abrirRedacao(page, base);
    ok(await page.getAttribute('[data-red="modo-digitar"]', 'aria-pressed') === 'true', R + 'com rascunho digitado abre em "Digitar"');
    ok(/manuscrita/i.test(await page.textContent('[data-red="sugestao-papel"]')), R + 'digitando, a tela sugere o papel');
    ok((await page.textContent('[data-red="crono"]')).trim() === '02:00', R + 'tempo do rascunho volta com ele');
    // Review Focus 3: trocar de modo não apaga nem envia o rascunho
    await page.click('[data-red="modo-mao"]'); await page.click('[data-red="modo-digitar"]');
    ok((await page.inputValue('[data-red="folha"] textarea')) === 'Rascunho digitado em outra sessão.', R + 'trocar de modo preserva o texto digitado');
    await page.clock.runFor(1500);
    ok((await lerStore(page, 'redText')) === 'Rascunho digitado em outra sessão.', R + 'trocar de modo não mexe no rascunho salvo');
    // digitando, o cronômetro começa na primeira tecla
    await page.locator('[data-red="folha"] textarea').pressSequentially(' x'); await page.clock.runFor(10000);
    ok((await page.textContent('[data-red="crono"]')).trim() !== '02:00' && /^02:1[012]$/.test((await page.textContent('[data-red="crono"]')).trim()), R + 'digitar a primeira tecla dispara o cronômetro');
  } finally { await ctx.close(); }

  // a faixa do rascunho só existe enquanto o texto é o que veio do disco: contexto próprio
  ({ ctx, page } = await novoContexto(pageDaSuite));
  try {
    await semear(page, base, { redText: 'Rascunho digitado em outra sessão.', redTextTs: Date.now() - 3600e3, redTempoMs: 120000 });
    await abrirRedacao(page, base);
    page.once('dialog', d => d.accept());
    await page.click('button:has-text("Começar do zero")'); await page.clock.runFor(1500);
    ok((await lerStore(page, 'redTempoMs')) === 0 && (await page.textContent('[data-red="crono"]')).trim() === '00:00', R + '"Começar do zero" zera o tempo junto com o rascunho');
  } finally { await ctx.close(); }
}
