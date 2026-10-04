/* RESULTADO ANOTADO DA DISCURSIVA (fatia 3, 03/10/2026)
   A tela da nota marca no texto da pessoa o trecho que pontuou em cada quesito, desenha a nota por
   quesito e permite reescrever e comparar com a tentativa anterior.
   Parte 1 (Node): M.anotar / M.localizar. Parte 2 (navegador, IA simulada). */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { semear, abrirRedacao, novoContexto } from './redacao-mesa.mjs';
import { RESPOSTA, BOA, armarIA, hist, entregar, abrir, contraste } from './redacao-motor.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const motor = () => { const cx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(RAIZ, 'redacao-motor.js'), 'utf8'), cx); return cx.window.CT_REDACAO_MOTOR; };

export function testarRedacaoResultadoEstatico(ok) {
  const R = 'RESULTADO ';
  const M = motor();
  if (!M || typeof M.anotar !== 'function') { ok(false, R + 'redacao-motor.js publica anotar e localizar'); return; }
  const txt = 'A Tutela   antecipada\ntorna-se ESTÁVEL quando não há recurso. O prazo é de dois anos.';
  const a = M.anotar(txt, [
    { q: 2, status: 'parcial', trecho: 'o prazo é de dois anos' },
    { q: 1, status: 'coberto', trecho: '"tutela antecipada torna-se estável…"' },
    { q: 3, status: 'coberto', trecho: 'trecho que não existe' },
    { q: 4, status: 'coberto', trecho: 'estável quando não' } ]);
  ok(a.segs.map(s => s.t).join('') === txt, R + 'os segmentos remontam o texto da pessoa sem mudar um caractere');
  const marcas = a.segs.filter(s => s.q);
  ok(marcas.length === 2 && marcas[0].q === 1 && marcas[0].t === 'Tutela   antecipada\ntorna-se ESTÁVEL' && marcas[1].q === 2, R + 'a marca cai no trecho certo, na ordem do texto, com a caixa e os espaços originais');
  ok(!marcas.some(m => m.q === 3) && !marcas.some(m => m.q === 4), R + 'trecho que não existe não marca nada, e trecho que se sobrepõe a outro já marcado é deixado de fora');
  ok(M.localizar(txt, 'xx') === null && M.anotar('', []).segs.length === 0, R + 'trecho curto demais e texto vazio não quebram');
}

const BOA2 = JSON.stringify({ quesitos: [
  { i: 1, nota: 0.3, trecho: 'torna-se estável quando não há recurso', faltou: '' },
  { i: 2, nota: 0.3, trecho: 'o prazo da ação de revisão é de dois anos', faltou: '' },
  { i: 3, nota: 0.4, trecho: '', faltou: '' } ],
  forma: { portugues: { nota: 8, comentario: 'Sem desvios.' } }, prioridades: ['Manter'], geral: 'Completo.' });

export async function testarRedacaoResultado(pageDaSuite, base, ok, opcoes = {}) {
  const R = 'RESULTADO [' + (opcoes.motor || 'chromium') + '] ';
  for (const b of [anotado, reescrita, propria, medidas]) {
    try { await b(pageDaSuite, base, ok, R); } catch (e) { ok(false, R + b.name + ' exceção: ' + String(e.message).split('\n')[0]); }
  }
}

const corrigir = async (page, json) => { await armarIA(page, 'boa', json); await entregar(page); await page.waitForSelector('[data-red="quesito"]', { timeout: 15000 }); };

async function anotado(pageDaSuite, base, ok, R) {
  const { ctx, page } = await abrir(pageDaSuite, base);
  try {
    await corrigir(page, BOA);
    const an = await page.evaluate(() => { const c = document.querySelector('[data-red="anotada"]'); if (!c) return null;
      const m = [...c.querySelectorAll('mark')]; const cs = m[0] ? getComputedStyle(m[0]) : null;
      return { texto: c.querySelector('[data-red="anotada-texto"]').textContent, marcas: m.map(x => ({ t: x.textContent, q: x.getAttribute('data-q'), st: x.getAttribute('data-st') })),
        fundo: cs ? cs.backgroundColor : '', rotulo: m[0] ? getComputedStyle(m[0], '::after').content : '' }; });
    ok(!!an && an.texto === RESPOSTA, R + 'a resposta aparece inteira e idêntica, com as marcas por cima');
    ok(!!an && an.marcas.length === 1 && an.marcas[0].t === 'torna-se estável quando não há recurso' && an.marcas[0].q === 'Q1' && an.marcas[0].st === 'coberto', R + 'o trecho que pontuou no quesito 1 está marcado; o trecho inventado do quesito 2 não marca nada');
    ok(!!an && !/rgba?\(0, 0, 0, 0\)|transparent/.test(an.fundo) && /Q1/.test(an.rotulo), R + 'a marca pinta de verdade (fundo ' + (an && an.fundo) + ') e leva o rótulo do quesito');
    const qs = await page.evaluate(() => [...document.querySelectorAll('[data-red="quesito"]')].map(e => { const b = e.querySelector('[data-red="quesito-barra"]'), i = b.firstElementChild;
      return { txt: e.textContent.replace(/\s+/g, ' '), pct: Math.round(i.getBoundingClientRect().width / b.getBoundingClientRect().width * 100), st: e.getAttribute('data-st') }; }));
    ok(qs.length === 3 && /0,30 \/ 0,30/.test(qs[0].txt) && /0,10 \/ 0,30/.test(qs[1].txt) && /0,40 \/ 0,40/.test(qs[2].txt), R + 'cada quesito mostra a nota obtida sobre o máximo da banca');
    ok(qs.length === 3 && qs[0].pct >= 98 && Math.abs(qs[1].pct - 33) <= 3 && qs[1].st === 'parcial' && qs[0].st === 'coberto', R + 'a barra de cada quesito tem a largura da nota (mediu ' + qs.map(q => q.pct).join(', ') + '%)');
    ok(qs.length === 3 && /citar o § 5º do art\. 304/.test(qs[1].txt) && /torna-se estável quando não há recurso/.test(qs[0].txt), R + 'o quesito diz o que faltou e cita o trecho que pontuou');
    ok(await page.locator('.ct-q').count() === 0, R + 'a lista antiga de pontos não aparece junto com a nova');
    await page.locator('[data-red="anotada"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'tests/_capturas/resultado-anotado.png' }).catch(() => {});
  } finally { await ctx.close(); }
}

async function reescrita(pageDaSuite, base, ok, R) {
  const { ctx, page } = await abrir(pageDaSuite, base);
  try {
    await corrigir(page, BOA);
    ok(/Reescrever esta resposta/.test(await page.textContent('[data-red="reescrever"]')), R + 'a tela da nota oferece reescrever');
    await page.click('[data-red="reescrever"]'); await page.waitForSelector('[data-red="folha"] textarea', { timeout: 5000 });
    ok((await page.inputValue('[data-red="folha"] textarea')) === RESPOSTA, R + 'reescrever volta para a folha com o texto anterior, pronto para editar');
    ok(/8,0/.test(await page.textContent('[data-red="reescrita"]')), R + 'a folha lembra que é uma reescrita e qual foi a nota anterior');
    const esp = (await page.textContent('[data-red="espelho"]')).replace(/\s+/g, ' ');
    ok(/guardado/.test(esp) && !/estabilização da tutela/.test(esp), R + 'na reescrita o espelho volta a ficar guardado');
    await armarIA(page, 'boa', BOA2); await entregar(page);
    await page.waitForSelector('[data-red="comparacao"]', { timeout: 15000 });
    const cmp = (await page.textContent('[data-red="comparacao"]')).replace(/\s+/g, ' ');
    ok(/8,0/.test(cmp) && /10,0/.test(cmp) && /\+2,0/.test(cmp), R + 'a nova correção compara com a tentativa anterior (8,0 → 10,0, +2,0)');
    const linhas = await page.evaluate(() => [...document.querySelectorAll('[data-red="comparacao-linha"]')].map(e => ({ t: e.textContent.replace(/\s+/g, ' ').trim(), d: e.getAttribute('data-d') })));
    ok(linhas.length === 3 && /0,10/.test(linhas[1].t) && /0,30/.test(linhas[1].t) && linhas[1].d === 'subiu' && linhas[0].d === 'igual', R + 'a comparação mostra, quesito a quesito, o que subiu e o que ficou igual');
    await page.clock.runFor(1500);
    const h = await hist(page);
    ok(h.length === 2 && h[0].anteriorId === h[1].id && !h[1].anteriorId, R + 'o histórico liga a reescrita à tentativa anterior');
    await page.locator('[data-red="comparacao"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'tests/_capturas/resultado-comparacao.png' }).catch(() => {});
    // reabrir a tentativa antiga pelo histórico não mostra comparação
    page.once('dialog', d => d.accept());
    await page.click('button:has-text("Nova prova")'); await page.waitForTimeout(300);
    await page.locator('[data-id="' + h[1].id + '"]').click(); await page.waitForSelector('[data-red="quesito"]');
    ok(await page.locator('[data-red="comparacao"]').count() === 0, R + 'a primeira tentativa, reaberta, não mostra comparação');
  } finally { await ctx.close(); }
}

async function propria(pageDaSuite, base, ok, R) {
  const { ctx, page } = await novoContexto(pageDaSuite);
  try {
    await semear(page, base); await abrirRedacao(page, base);
    await page.click('[data-red="terminei"]'); await page.waitForSelector('[data-red="conf-item"]');
    const marcar = (i, txt) => page.locator('[data-red="conf-item"] >> nth=' + i).locator('[data-red="conf-opcao"]', { hasText: txt }).click();
    await marcar(0, '0,30'); await marcar(1, '0,10'); await marcar(2, '0,40');
    await page.click('[data-red="conf-registrar"]'); await page.waitForSelector('[data-red="quesito"]', { timeout: 8000 });
    ok(await page.locator('[data-red="quesito"]').count() === 3 && await page.locator('[data-red="anotada"]').count() === 0, R + 'conferência própria mostra a nota por quesito desenhada, sem texto anotado (não há texto digitado)');
    ok(/Refazer à mão/.test(await page.textContent('[data-red="reescrever"]')), R + 'na conferência própria o convite é refazer à mão');
    await page.click('[data-red="reescrever"]'); await page.waitForSelector('[data-red="modo-mao"]');
    ok(await page.getAttribute('[data-red="modo-mao"]', 'aria-pressed') === 'true' && /8,0/.test(await page.textContent('[data-red="reescrita"]')), R + 'refazer à mão volta para a folha no modo à mão, lembrando a nota anterior');
  } finally { await ctx.close(); }
}

async function medidas(pageDaSuite, base, ok, R) {
  for (const esquema of ['light', 'dark']) {
    const ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true });
    const page = await ctx.newPage(); const t = new Date(); t.setHours(14, 0, 0, 0); await page.clock.install({ time: t });
    try {
      await semear(page, base, { redText: RESPOSTA, redTextTs: Date.now() - 1000, iaConsentimento: { versao: '2026-09', ts: Date.now() - 1000 } });
      if (esquema === 'dark') await page.evaluate(() => localStorage.setItem('catedra:dark', '1'));
      const erros = []; page.on('pageerror', e => erros.push(String(e.message)));
      await abrirRedacao(page, base);
      // a folha remede quando muda de tamanho; isso não pode virar "Erro no app" na tela (ResizeObserver loop)
      await page.locator('[data-red="folha"] textarea').pressSequentially(' mais uma frase para a folha crescer.'); await page.waitForTimeout(600);
      await page.setViewportSize({ width: 700, height: 1180 }); await page.waitForTimeout(400); await page.setViewportSize({ width: 820, height: 1180 }); await page.waitForTimeout(400);
      ok(await page.locator(':text("Erro no app")').count() === 0 && !erros.some(e => /ResizeObserver/.test(e)), R + esquema + ': medir a folha não dispara erro na tela (' + (erros[0] || 'sem erro') + ')');
      await corrigir(page, BOA);
      const m = await contraste(page, ['[data-red="anotada"] mark', '[data-red="quesito"] [data-red="quesito-nota"]', '[data-red="quesito"] [data-red="quesito-falta"]', '[data-red="reescrever"]']);
      for (const x of m) ok(!x.falta && x.r >= 4.5, R + esquema + ': contraste de ' + x.s + ' ≥ 4,5:1 (mediu ' + (x.falta ? 'ausente' : x.r) + ')');
      ok(m[3] && m[3].h >= 44, R + esquema + ': alvo de "Reescrever" ≥ 44 px (mediu ' + (m[3] && m[3].h) + ')');
      ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), R + esquema + ': a tela da nota não estoura na horizontal');
      await page.locator('[data-red="quesitos"]').scrollIntoViewIfNeeded();
      await page.screenshot({ path: 'tests/_capturas/resultado-quesitos-' + esquema + '.png' }).catch(() => {});
    } finally { await ctx.close(); }
  }
}
