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
  const blocos = [arranjo, papel, folha, espelho, conferencia, acessivel, revisao];
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
    // Review Focus 1: fechar com o cronômetro andando não perde o que passou — e sem gravar a cada tique
    await page.click('[data-red="crono-btn"]'); await page.clock.runFor(40000);
    ok(Math.abs((await lerStore(page, 'redTempoMs')) - 65000) < 3000, R + 'cronômetro andando não regrava o tempo salvo (não acorda a sincronização)');
    ok(+(await page.evaluate(() => localStorage.getItem('catedra:_redCronoDesde'))) > 0, R + 'o início do trecho em curso fica numa chave local');
    // à mão, a tela apaga enquanto se escreve no papel: o relógio é de parede e não pausa
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.clock.runFor(60000);
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.clock.runFor(1500);
    const sg = t => t.split(':').reduce((x, y) => x * 60 + (+y), 0);
    const apagada = (await page.textContent('[data-red="crono"]')).trim();
    ok(sg(apagada) >= 165 && sg(apagada) <= 180, R + 'à mão, tela apagada não para o cronômetro (' + apagada + ')');
    // fechar sem aviso (sem visibilitychange) e reabrir: o trecho em curso é recuperado
    await abrirRedacao(page, base);
    // relógio de parede: recarregar leva tempo real (mais sob carga), e esse tempo conta
    const voltou = (await page.textContent('[data-red="crono"]')).trim();
    ok(sg(voltou) >= sg(apagada) && sg(voltou) <= sg(apagada) + 90, R + 'tempo em curso volta depois de recarregar (' + apagada + ' → ' + voltou + ')');
    ok((await page.evaluate(() => localStorage.getItem('catedra:_redCronoDesde'))) === null, R + 'depois de recuperar, a chave do trecho em curso sai');
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
    await page.waitForTimeout(300);
    ok(/^\s*0 \/ 30 linhas/.test((await page.textContent('[data-red="linhas"]')).replace(/\s+/g, ' ')), R + 'contador de linhas acompanha o texto que some sem tecla (' + (await page.textContent('[data-red="linhas"]')).replace(/\s+/g, ' ').trim() + ')');
  } finally { await ctx.close(); }
}

async function folha(pageDaSuite, base, ok, R) {
  const linha = 'uma linha de prova com onze palavras bem curtas aqui sim';   // 11 palavras, cabe na medida de 62ch
  const texto = n => Array.from({ length: n }, () => linha).join('\n');
  const { ctx, page } = await novoContexto(pageDaSuite);
  try {
    await semear(page, base, { redText: texto(5), redTextTs: Date.now() - 60e3 }); await abrirRedacao(page, base);
    await page.waitForSelector('[data-red="pauta"]', { timeout: 4000 }).catch(() => {});   // a medição vem depois da pintura
    const m = await page.evaluate(() => { const t = document.querySelector('[data-red="folha"] textarea'); const cs = getComputedStyle(t);
      const passo = /(\d+(?:\.\d+)?)px\)?\s*$/.exec(cs.backgroundSize) || /(\d+(?:\.\d+)?)px/.exec(cs.backgroundSize.split(' ').pop());
      return { lh: parseFloat(cs.lineHeight), bg: cs.backgroundImage, passo: passo ? parseFloat(passo[1]) : null }; });
    ok(/gradient/.test(m.bg) && m.passo != null && Math.abs(m.passo - m.lh) < 0.6, R + 'pauta desenhada no passo exato da linha do texto');
    const lt = (await page.textContent('[data-red="linhas"]')).replace(/\s+/g, ' ');
    ok(lt.includes('5 / 30 linhas'), R + 'contador mostra as linhas escritas contra o limite (' + lt.trim() + ')');
    ok(await page.locator('[data-red="pauta"] > *').count() >= 30, R + 'numeração cobre pelo menos o limite da banca');
    await page.screenshot({ path: 'tests/_capturas/mesa-folha.png', fullPage: true }).catch(() => {});
    const cor = () => page.evaluate(() => getComputedStyle(document.querySelector('[data-red="barra"] > div')).backgroundColor);
    const tok = n => page.evaluate(n => { const d = document.createElement('div'); d.style.background = 'var(' + n + ')'; document.querySelector('[data-red="folha"]').appendChild(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c; }, n);
    ok(await cor() === await tok('--accent'), R + 'barra na cor do tema dentro do limite');
    await page.fill('[data-red="folha"] textarea', texto(28)); await page.waitForTimeout(300);
    ok(await cor() === await tok('--warn') && /faltam 2/.test(await page.textContent('[data-red="linhas"]')), R + 'perto do limite a barra avisa e o rótulo diz quantas faltam');
    await page.fill('[data-red="folha"] textarea', texto(32)); await page.waitForTimeout(300);
    ok(await cor() === await tok('--danger') && /passou 2/.test(await page.textContent('[data-red="linhas"]')), R + 'acima do limite a barra e o rótulo dizem quanto passou');
    ok(/Salvo às \d{2}:\d{2}/.test(await page.textContent('[data-red="salvo"]')), R + 'a folha diz a hora em que salvou');
    // modo foco
    const nav = () => page.evaluate(() => { const a = document.querySelector('aside'); const r = a.getBoundingClientRect(); return r.width * r.height; });
    ok(await nav() > 0, R + 'navegação visível fora do foco');
    await page.click('[data-red="foco"]'); await page.waitForTimeout(200);
    ok(await nav() === 0 && await page.locator('[data-red="questao"]').isVisible() && await page.locator('[data-red="folha"]').isVisible(), R + 'foco esconde a navegação e mantém questão e folha');
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    ok(await nav() > 0, R + 'Esc sai do foco');
    // folha estreita: estimativa por palavras, sem numeração
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
    await page.fill('[data-red="folha"] textarea', texto(4)); await page.waitForTimeout(300);
    ok(/4 \/ 30 linhas/.test((await page.textContent('[data-red="linhas"]')).replace(/\s+/g, ' ')) && await page.locator('[data-red="pauta"]').count() === 0, R + 'em tela estreita vale a estimativa e a numeração some');
  } finally { await ctx.close(); }

  const s = await novoContexto(pageDaSuite);
  try {
    await semear(s.page, base, { redEnunciado: 'Disserte sobre tutela provisória.', redText: 'Um texto qualquer.', redTextTs: Date.now() });
    await abrirRedacao(s.page, base);
    ok(await s.page.locator('[data-red="barra"]').count() === 0 && /^\s*\d+ linhas?/.test(await s.page.textContent('[data-red="linhas"]')), R + 'sem limite no enunciado: sem barra e sem "/ L"');
  } finally { await s.ctx.close(); }
}

async function espelho(pageDaSuite, base, ok, R) {
  const { ctx, page } = await novoContexto(pageDaSuite);
  try {
    await semear(page, base, { redText: 'Texto digitado.', redTextTs: Date.now() }); await abrirRedacao(page, base);
    await page.evaluate(() => { const c = window.__catedraApp; c.setState({ redEspelhoOculto: true }); }); await page.waitForTimeout(200);
    const est = (await page.textContent('[data-red="gab-estado"]')).replace(/\s+/g, ' ');
    ok(/3 quesitos/.test(est) && /1,00 ponto/.test(est) && /pronto para corrigir/.test(est), R + 'espelho guardado diz quantos quesitos e pontos reconheceu');
    ok(!/estabilização/.test(await page.textContent('[data-red="espelho"]')), R + 'espelho guardado não entrega o conteúdo dos quesitos');
    page.once('dialog', d => d.accept());
    await page.click('button:has-text("Ver mesmo assim")'); await page.waitForTimeout(200);
    ok(await page.getAttribute('[data-red="gab-vista-quesitos"]', 'aria-pressed') === 'true' && await page.locator('[data-red="gab-quesito"]').count() === 3, R + 'aberto, o espelho lista os 3 quesitos');
    ok(/0,30/.test(await page.textContent('[data-red="gab-quesito"] >> nth=0')) && /0,40/.test(await page.textContent('[data-red="gab-quesito"] >> nth=2')), R + 'cada quesito mostra a pontuação máxima');
    await page.click('[data-red="gab-vista-texto"]');
    ok(await page.locator('[data-red="espelho"] textarea').count() === 1, R + 'vista Texto mostra o espelho editável');
    await page.fill('[data-red="espelho"] textarea', 'A resposta deve reconhecer a estabilização da tutela e afastar a coisa julgada.'); await page.waitForTimeout(200);
    ok(/prosa/i.test(await page.textContent('[data-red="gab-estado"]')) && await page.locator('[data-red="gab-vista-quesitos"]').count() === 0, R + 'espelho em prosa avisa e fica só na vista Texto');
    await page.fill('[data-red="espelho"] textarea', ''); await page.waitForTimeout(200);
    ok(/Falta o espelho/.test(await page.textContent('[data-red="gab-estado"]')), R + 'sem espelho, a faixa diz que falta');
    // importação: erro fica na faixa, com role=alert
    const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('button:has-text("Importar PDF/TXT")')]);
    await fc.setFiles({ name: 'espelho.pdf', mimeType: 'application/pdf', buffer: Buffer.from('isto não é um pdf') });
    await page.waitForSelector('[data-red="espelho"] [role="alert"]', { timeout: 8000 });
    ok(/Não consegui ler espelho\.pdf/.test(await page.textContent('[data-red="espelho"] [role="alert"]')), R + 'falha de importação aparece na faixa do espelho');
    const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.click('button:has-text("Importar PDF/TXT")')]);
    await fc2.setFiles({ name: 'espelho.txt', mimeType: 'text/plain', buffer: Buffer.from('1. Reconhece a estabilização da tutela (0,50 ponto)\n2. Afasta a coisa julgada material (0,50 ponto)') });
    await page.waitForFunction(() => /espelho\.txt importado/.test((document.querySelector('[data-red="espelho"]') || {}).textContent || ''), null, { timeout: 8000 });
    ok(/2 quesitos/.test(await page.textContent('[data-red="gab-estado"]')), R + 'importação diz o arquivo e atualiza a contagem');
  } finally { await ctx.close(); }
}

async function conferencia(pageDaSuite, base, ok, R) {
  let { ctx, page } = await novoContexto(pageDaSuite);
  try {
    await semear(page, base); await abrirRedacao(page, base);
    await page.evaluate(() => window.__catedraApp.setState({ redEspelhoOculto: true }));
    await page.click('[data-red="crono-btn"]'); await page.clock.runFor(600000);
    await page.click('[data-red="terminei"]'); await page.waitForSelector('[data-red="conf-item"]');
    await page.clock.runFor(30000);
    ok((await page.textContent('[data-red="crono"]')).trim() === '10:00', R + '"Terminei" congela o tempo');
    ok(await page.locator('[data-red="conf-item"]').count() === 3, R + 'conferência abre um item por quesito');
    const ops = await page.locator('[data-red="conf-item"] >> nth=0').locator('[data-red="conf-opcao"]').allTextContents();
    ok(ops.map(s => s.trim()).join('|') === '0,00|0,10|0,20|0,30', R + 'quesito com escala só oferece os degraus da banca');
    const ops3 = await page.locator('[data-red="conf-item"] >> nth=2').locator('[data-red="conf-opcao"]').allTextContents();
    ok(ops3.map(s => s.trim()).join('|') === '0,00|0,20|0,40', R + 'quesito sem escala oferece zero, metade e cheio');
    ok(await page.isDisabled('[data-red="conf-registrar"]'), R + 'registrar fica desabilitado enquanto falta quesito');
    const marcar = (i, txt) => page.locator('[data-red="conf-item"] >> nth=' + i).locator('[data-red="conf-opcao"]', { hasText: txt }).click();
    await marcar(0, '0,30'); await marcar(1, '0,10');
    ok(/0,40 \/ 1,00/.test(await page.textContent('[data-red="conf-soma"]')) && /falta 1/.test(await page.textContent('[data-red="conf-soma"]')), R + 'soma acompanha e diz quantos faltam');
    await marcar(2, '0,40');
    await page.screenshot({ path: 'tests/_capturas/mesa-conferencia.png', fullPage: true }).catch(() => {});
    await page.fill('[data-red="linhas-mao"]', '33');
    ok(/passou 3 linhas/.test(await page.textContent('[data-red="linhas-mao-msg"]')), R + 'linhas informadas acima do limite avisam quanto passou');
    await page.fill('[data-red="linhas-mao"]', '28');
    ok(/dentro do limite/.test(await page.textContent('[data-red="linhas-mao-msg"]')), R + 'linhas dentro do limite são confirmadas');
    ok(!(await page.isDisabled('[data-red="conf-registrar"]')), R + 'com tudo marcado, registrar habilita');
    await page.click('[data-red="conf-registrar"]'); await page.waitForTimeout(400);
    ok(/8[.,]0/.test(await page.textContent('.ct-hero')), R + 'etapa 3 abre com a nota proporcional (0,80 de 1,00 → 8,0)');
    ok(/Conferência própria/i.test(await page.textContent('.ct-hero')), R + 'o resultado diz que é conferência própria');
    const corpo = await page.textContent('main');
    ok(!/Critérios/.test(corpo) && !/Pontos fortes/.test(corpo) && !/A melhorar/.test(corpo), R + 'blocos que dependem de IA não aparecem');
    await page.clock.runFor(1500);
    const h = await page.evaluate(() => JSON.parse(localStorage.getItem('catedra:red') || '[]')[0]);
    ok(!!h && h.origem === 'conferencia-propria' && h.nota === 8 && Math.abs(h.tempoMs - 600000) < 2000 && h.linhas === 28 && h.texto === '', R + 'histórico guarda nota, tempo e linhas da conferência');
    const ev = await lerStore(page, 'redHist');
    ok(Array.isArray(ev) && ev.length === 1 && ev[0].quesitos.length === 3 && ev[0].quesitos[1].nota === 0.1, R + 'a evolução recebe a nota por quesito');
    ok((await lerStore(page, 'redTempoMs')) === 0, R + 'depois de registrar, o cronômetro zera');
    await page.screenshot({ path: 'tests/_capturas/mesa-resultado-proprio.png', fullPage: true }).catch(() => {});
    page.once('dialog', d => d.accept());
    await page.click('button:has-text("Nova prova")'); await page.waitForTimeout(300);
    const rot = (await page.locator('[data-id^="rd"]').first().textContent()).replace(/\s+/g, ' ');
    ok(/à mão/.test(rot) && /28 linhas/.test(rot) && !/0 palavras/.test(rot), R + 'no histórico, a conferência aparece como feita à mão, com linhas e tempo (' + rot.trim().slice(0, 90) + ')');
    await page.locator('[data-id^="rd"]').first().click(); await page.waitForTimeout(300);
    ok(/Conferência própria/i.test(await page.textContent('.ct-hero')), R + 'conferência reabre pelo histórico');
  } finally { await ctx.close(); }

  // Review Focus 2 e 4: números repetidos; espelho trocado no meio
  ({ ctx, page } = await novoContexto(pageDaSuite));
  try {
    await semear(page, base, { redGabarito: '1. Reconhece a estabilização da tutela antecipada (0,50 ponto)\n1. Afasta a formação de coisa julgada (0,50 ponto)' });
    await abrirRedacao(page, base);
    await page.click('[data-red="terminei"]'); await page.waitForSelector('[data-red="conf-item"]');
    await page.locator('[data-red="conf-item"] >> nth=0').locator('[data-red="conf-opcao"]', { hasText: '0,50' }).click();
    ok(await page.locator('[data-red="conf-item"] >> nth=1').locator('[data-red="conf-opcao"][aria-pressed="true"]').count() === 0, R + 'quesitos com o mesmo número não se marcam juntos');
    await page.click('[data-red="gab-vista-texto"]');
    await page.fill('[data-red="espelho"] textarea', '1. Quesito novo com outro conteúdo qualquer (1,00 ponto)'); await page.waitForTimeout(200);
    await page.click('[data-red="gab-vista-quesitos"]');
    ok(await page.locator('[data-red="conf-opcao"][aria-pressed="true"]').count() === 0 && await page.isDisabled('[data-red="conf-registrar"]'), R + 'trocar o espelho descarta as notas marcadas');
  } finally { await ctx.close(); }

  // Review Focus 5: espelho em prosa, nota única
  ({ ctx, page } = await novoContexto(pageDaSuite));
  try {
    await semear(page, base, { redGabarito: 'A resposta deve reconhecer a estabilização da tutela e afastar a coisa julgada.' });
    await abrirRedacao(page, base);
    await page.click('[data-red="terminei"]'); await page.waitForSelector('[data-red="conf-unica"]');
    ok(await page.isDisabled('[data-red="conf-registrar"]'), R + 'nota única vazia não registra');
    await page.fill('[data-red="conf-unica"]', '12'); ok(await page.isDisabled('[data-red="conf-registrar"]'), R + 'nota única fora de 0 a 10 não registra');
    await page.fill('[data-red="conf-unica"]', '7,5'); ok(!(await page.isDisabled('[data-red="conf-registrar"]')), R + 'nota única aceita vírgula');
    await page.click('[data-red="conf-registrar"]'); await page.waitForTimeout(400);
    ok(/7[.,]5/.test(await page.textContent('.ct-hero')), R + 'nota única vira a nota do resultado');
  } finally { await ctx.close(); }

  // sem espelho: não há o que conferir
  ({ ctx, page } = await novoContexto(pageDaSuite));
  try {
    await semear(page, base, { redGabarito: '' }); await abrirRedacao(page, base);
    ok(/Colar ou importar o padrão/.test(await page.textContent('[data-red="terminei"]')), R + 'sem espelho, o botão pede o padrão antes de conferir');
    await page.click('[data-red="terminei"]'); await page.waitForTimeout(200);
    ok(await page.locator('[data-red="espelho"] textarea').count() === 1 && await page.locator('[data-red="conf-registrar"]').count() === 0, R + 'sem espelho, abre o campo para colar e não a conferência');
  } finally { await ctx.close(); }
}

async function acessivel(pageDaSuite, base, ok, R) {
  const medir = () => page.evaluate(() => {
    // cor em rgb(...) ou color(srgb r g b) (é como o navegador serializa color-mix) → [r,g,b] 0–255
    const rgb = c => { const m = c.match(/[\d.]+/g).map(Number); return /color\(srgb/.test(c) ? m.slice(0, 3).map(v => v * 255) : m.slice(0, 3); };
    const lum = c => { const m = rgb(c); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const fundo = el => { let e = el; while (e) { const cs = getComputedStyle(e);
      // fundo em gradiente (botão primário, herói): devolve TODAS as paradas — o contraste que vale é o pior
      if (/gradient/.test(cs.backgroundImage)) { const cores = cs.backgroundImage.match(/rgba?\([^)]*\)|color\(srgb[^)]*\)/g) || []; if (cores.length) return cores; }
      const b = cs.backgroundColor; const m = b.match(/[\d.]+/g); if (m && (m.length < 4 || +m[3] >= 0.99)) return b; e = e.parentElement; } return 'rgb(255,255,255)'; };
    const sels = ['[data-red="crono-btn"]', '[data-red="crono"]', '[data-red="modo-mao"]', '[data-red="modo-digitar"]', '[data-red="gab-estado"]', '[data-red="terminei"]', '.ct-folha-mao .ct-nota', '[data-red="marcas-toggle"]', '[data-red="chip-limite"]'];
    return sels.map(s => { const el = document.querySelector(s); if (!el) return { s, falta: true };
      const a = lum(getComputedStyle(el).color); const fs = [].concat(fundo(el)); const r = Math.min(...fs.map(f => { const b = lum(f); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }));
      const bx = el.getBoundingClientRect(); return { s, r: Math.round(r * 100) / 100, h: Math.round(bx.height), w: Math.round(bx.width) }; });
  });
  let page;
  for (const esquema of ['light', 'dark']) {
    const ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true, colorScheme: esquema });
    page = await ctx.newPage(); const t = new Date(); t.setHours(14, 0, 0, 0); await page.clock.install({ time: t });
    try {
      await semear(page, base);
      if (esquema === 'dark') await page.evaluate(() => localStorage.setItem('catedra:dark', '1'));   // o app guarda o escuro nesta chave
      await abrirRedacao(page, base);
      const m = await medir();
      for (const x of m) {
        ok(!x.falta && x.r >= 4.5, R + esquema + ': contraste de ' + x.s + ' ≥ 4,5:1 (mediu ' + (x.falta ? 'ausente' : x.r) + ')');
      }
      for (const x of m.filter(x => /modo-|terminei|marcas-toggle|crono-btn/.test(x.s))) ok(x.h >= 44, R + esquema + ': alvo de ' + x.s + ' ≥ 44 px (mediu ' + x.h + ')');
      await page.click('[data-red="terminei"]'); await page.waitForSelector('[data-red="conf-opcao"]');
      await page.locator('[data-red="conf-opcao"]').first().click();
      const marcado = await page.evaluate(() => { const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const v3 = /color\(srgb/.test(c) ? m.slice(0, 3).map(v => v * 255) : m.slice(0, 3); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(v3[0]) + 0.7152 * f(v3[1]) + 0.0722 * f(v3[2]); };
        const b = document.querySelector('[data-red="conf-opcao"][aria-pressed="true"]'); const cs = getComputedStyle(b); const x = lum(cs.color), y = lum(cs.backgroundColor); return Math.round((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) * 100) / 100; });
      ok(marcado >= 4.5, R + esquema + ': degrau marcado da conferência ≥ 4,5:1 (mediu ' + marcado + ')');
      const alvos = await page.evaluate(() => [...document.querySelectorAll('[data-red="conf-opcao"], [data-red="gab-vista-quesitos"], [data-red="gab-vista-texto"], [data-red="linhas-mao"]')].map(b => Math.round(b.getBoundingClientRect().height)));
      ok(alvos.every(h => h >= 44), R + esquema + ': degraus da conferência ≥ 44 px (mínimo ' + Math.min(...alvos) + ')');
      ok(await page.evaluate(() => [...document.querySelectorAll('[data-red="mesa"] button, [data-red="espelho"] button, [data-red="mesa"] input, [data-red="mesa"] textarea, [data-red="espelho"] input')].every(e => (e.textContent || '').trim() || e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || (e.id && document.querySelector('label[for="' + e.id + '"]')))), R + esquema + ': todo controle da mesa tem nome');
      ok(await page.evaluate(() => !/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(document.querySelector('[data-red="mesa"]').textContent + document.querySelector('[data-red="espelho"]').textContent)), R + esquema + ': nenhum emoji como ícone');
    } finally { await ctx.close(); }
  }
  // movimento reduzido: a barra de linhas não anima
  const ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  page = await ctx.newPage();
  try {
    await semear(page, base, { redText: 'Um texto digitado para a barra existir.', redTextTs: Date.now() }); await abrirRedacao(page, base);
    await page.waitForSelector('[data-red="barra"]');
    ok(await page.evaluate(() => { const b = document.querySelector('[data-red="barra"] > div'); return getComputedStyle(b).transitionDuration.split(',').every(d => parseFloat(d) < 0.01); }), R + 'movimento reduzido: a barra não anima');
  } finally { await ctx.close(); }
}

// Achados da revisão final do ramo (03/10/2026)
async function revisao(pageDaSuite, base, ok, R) {
  // questão maior que a janela, lado a lado: a coluna rola por dentro e nada fica inalcançável
  let { ctx, page } = await novoContexto(pageDaSuite);
  try {
    const longo = ENUN + '\n\n' + Array.from({ length: 60 }, (_, i) => 'Parágrafo ' + (i + 1) + ' da situação hipotética, com fatos suficientes para ocupar mais de uma linha na coluna da questão.').join('\n\n');
    await semear(page, base, { redEnunciado: longo }); await abrirRedacao(page, base);
    const q = await page.evaluate(() => { const e = document.querySelector('[data-red="questao"]'); return { oy: getComputedStyle(e).overflowY, sh: e.scrollHeight, ch: e.clientHeight, vh: window.innerHeight }; });
    ok(q.oy === 'auto' && q.sh > q.ch && q.ch <= q.vh, R + 'questão longa rola dentro da coluna (overflow ' + q.oy + ', ' + q.sh + ' > ' + q.ch + ')');
    await page.locator('#red-disciplina').scrollIntoViewIfNeeded();
    ok(await page.evaluate(() => { const r = document.querySelector('#red-disciplina').getBoundingClientRect(); const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!el && (el.id === 'red-disciplina' || !!el.closest('#red-disciplina')); }), R + 'com questão longa, o seletor de disciplina continua alcançável');
  } finally { await ctx.close(); }

  // a única mudança no submitRed: a entrada do histórico leva o tempo da resposta
  ({ ctx, page } = await novoContexto(pageDaSuite));
  try {
    const resp = Array.from({ length: 12 }, () => 'A tutela antecipada antecedente estabiliza-se quando não há recurso, nos termos do art. 304 do CPC.').join(' ');
    await semear(page, base, { redText: resp, redTextTs: Date.now() - 1000, redTempoMs: 300000 }); await abrirRedacao(page, base);
    await page.click('[data-red="folha"] .ct-folha-rodape .ct-btn');
    await page.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('catedra:red') || '[]').length > 0; } catch (_) { return false; } }, null, { timeout: 60000 });
    const h = await page.evaluate(() => JSON.parse(localStorage.getItem('catedra:red'))[0]);
    ok(Math.abs(h.tempoMs - 300000) < 3000 && h.origem !== 'conferencia-propria' && h.words > 40, R + 'correção digitada grava o tempo da resposta no histórico (' + h.tempoMs + ' ms)');
  } finally { await ctx.close(); }
}
