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
  const blocos = [arranjo];
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
