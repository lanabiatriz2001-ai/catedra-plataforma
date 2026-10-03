/* MOTOR DA CORREÇÃO DE DISCURSIVA (fatia 2, 03/10/2026) — redacao-motor.js
   Parte 1 (Node, sem navegador): o miolo puro — pedido, validação, escala, trecho.
   Parte 2 (navegador, IA simulada): espera, cancelar, falha com estimativa local, corrigir de novo.
   Spec: docs/superpowers/specs/2026-10-03-redacao-motor-correcao-design.md */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { semear, abrirRedacao, novoContexto, ENUN, GAB } from './redacao-mesa.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function carregarMotor() {
  const caixa = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(RAIZ, 'redacao-motor.js'), 'utf8'), caixa);
  return caixa.window.CT_REDACAO_MOTOR;
}

const QS = [
  { n: 1, texto: 'Reconhece a estabilização da tutela, art. 304 do CPC', max: 0.3, escala: [0, 0.1, 0.2, 0.3] },
  { n: 2, texto: 'Indica o prazo de dois anos, art. 304, § 5º, do CPC', max: 0.3, escala: [0, 0.1, 0.2, 0.3] },
  { n: 3, texto: 'Afasta a coisa julgada, art. 304, § 6º, do CPC', max: 0.4, escala: null },
];
const RESP = 'A tutela antecipada antecedente torna-se estável quando não há recurso (art. 304 do CPC). O prazo para a ação de revisão é de dois anos.';

export function testarRedacaoMotorEstatico(ok) {
  const R = 'MOTOR ';
  let M = null;
  try { M = carregarMotor(); } catch (e) { ok(false, R + 'redacao-motor.js carrega (' + e.message.split('\n')[0] + ')'); return; }
  ok(!!M && typeof M.montarPrompt === 'function' && typeof M.interpretar === 'function', R + 'publica montarPrompt e interpretar');

  const p = M.montarPrompt({ enunciado: 'Enunciado X', gabarito: 'cru', quesitos: QS, resposta: RESP });
  ok(/Q1/.test(p.prompt) && /0,00 \/ 0,10 \/ 0,20 \/ 0,30/.test(p.prompt) && /até 0,40/.test(p.prompt), R + 'o pedido leva cada quesito com sua escala e seu máximo');
  ok(p.prompt.includes(RESP) && p.cortes.length === 0, R + 'resposta dentro do limite vai inteira, sem corte');
  const longo = M.montarPrompt({ enunciado: 'E', gabarito: '', quesitos: QS, resposta: 'palavra '.repeat(6000) });
  ok(longo.cortes.length === 1 && /resposta/.test(longo.cortes[0]), R + 'resposta acima do limite é cortada e o corte é DITO, não calado');

  // escala e soma
  const r = M.interpretar({ quesitos: [
    { i: 1, nota: 0.25, trecho: 'torna-se estável quando não há recurso', faltou: '' },
    { i: 2, nota: 0.3, trecho: 'o prazo é de cinco anos', faltou: 'citar o § 5º' },
    { i: 3, nota: 9, trecho: '', faltou: 'não enfrentou a coisa julgada' } ],
    forma: { portugues: { nota: 8, comentario: 'ok' }, estrutura: { nota: 6, comentario: 'sem conclusão' }, extensao: { nota: 7, comentario: 'curto' } },
    prioridades: ['a', 'b', 'c', 'd'], geral: 'g' }, { quesitos: QS, resposta: RESP });
  ok(!!r && r.quesitos.length === 3, R + 'resposta válida vira um resultado com um item por quesito');
  ok(r.quesitos[0].obtido === 0.2 || r.quesitos[0].obtido === 0.3, R + 'nota fora da escala (0,25) é encaixada num degrau da banca (' + r.quesitos[0].obtido + ')');
  ok(r.quesitos[2].obtido === 0.4, R + 'nota acima do máximo é cortada no máximo do espelho (' + r.quesitos[2].obtido + ')');
  ok(r.quesitos[0].trecho === 'torna-se estável quando não há recurso', R + 'trecho que existe na resposta é mantido');
  ok(r.quesitos[1].trecho === '', R + 'trecho inventado (não está na resposta) é descartado');
  const soma = r.quesitos.reduce((a, q) => a + q.obtido, 0);
  ok(Math.abs(r.nota - Math.round(soma / 1.0 * 100) / 10) < 0.001 && r.cobertura === Math.round(soma * 100), R + 'nota final é a soma dos quesitos calculada pelo app (' + r.nota + ')');
  ok(r.prioridades.length === 3 && r.forma.length === 3 && r.forma.every(f => f.foraDoEspelho), R + 'forma vem marcada como fora do espelho; prioridades são três');
  ok(M.temTrecho('A  tutela\nantecipada', 'a tutela antecipada') && !M.temTrecho('abc', ''), R + 'trecho confere sem diferenciar caixa nem espaços; vazio não vale');

  // quesito pulado
  const pulou = M.interpretar({ quesitos: [{ i: 1, nota: 0.3 }, { i: 3, nota: 0.4 }] }, { quesitos: QS, resposta: RESP });
  ok(!!pulou && pulou.pulados.length === 1 && pulou.pulados[0] === 1 && pulou.quesitos[1].estimado === true, R + 'quesito que a IA pulou sai marcado para o corretor local preencher');
  ok(M.interpretar({ quesitos: [{ i: 1, nota: 0.3 }] }, { quesitos: QS, resposta: RESP }) === null, R + 'IA que pula mais da metade dos quesitos é tratada como falha');
  ok(M.interpretar(null, { quesitos: QS, resposta: RESP }) === null && M.interpretar({ x: 1 }, { quesitos: QS, resposta: RESP }) === null, R + 'resposta sem a forma combinada é falha');
  ok(M.interpretar({ quesitos: [{ i: 1, nota: 'abc' }, { i: 2, nota: null }, { i: 3, nota: '0,40' }] }, { quesitos: QS, resposta: RESP }).quesitos[2].obtido === 0.4, R + 'nota com vírgula é lida; nota ilegível vale zero');

  // espelho em prosa: pontos
  const prosa = M.interpretar({ pontos: [
    { ponto: 'Estabilização', status: 'coberto', trecho: 'torna-se estável', faltou: '' },
    { ponto: 'Coisa julgada', status: 'faltou', trecho: 'xyz', faltou: 'não tratou' } ], geral: 'g' }, { quesitos: [], resposta: RESP });
  ok(!!prosa && prosa.pontos.length === 2 && prosa.pontos[1].trecho === '' && prosa.nota === 5 && prosa.cobertura === 50, R + 'espelho em prosa: pontos com situação, trecho conferido e nota pela cobertura');
  ok(M.interpretar({ pontos: [] }, { quesitos: [], resposta: RESP }) === null, R + 'prosa sem nenhum ponto é falha');
  ok(M.motivoDaFalha(new Error('Você usou as 20 chamadas de IA de hoje')) === 'cota' && M.motivoDaFalha(new Error('Failed to fetch')) === 'rede' && M.motivoDaFalha({ ctMotivo: 'tempo' }) === 'tempo' && M.motivoDaFalha(new Error('qualquer')) === 'erro', R + 'o motivo da falha é classificado (cota, rede, tempo, outro)');
  ok(Object.keys(M.MOTIVOS).every(k => M.MOTIVOS[k].length > 12), R + 'cada motivo tem frase própria para a faixa');
}

// ───────────── Parte 2: navegador, com a IA simulada ─────────────
const RESPOSTA = Array.from({ length: 5 }, () => 'A tutela antecipada antecedente torna-se estável quando não há recurso, nos termos do art. 304 do CPC, e o prazo da ação de revisão é de dois anos.').join(' ');
const BOA = JSON.stringify({ quesitos: [
  { i: 1, nota: 0.3, trecho: 'torna-se estável quando não há recurso', faltou: '' },
  { i: 2, nota: 0.1, trecho: 'trecho que não existe na resposta', faltou: 'citar o § 5º do art. 304' },
  { i: 3, nota: 0.4, trecho: '', faltou: '' } ],
  forma: { portugues: { nota: 8, comentario: 'Sem desvios.' }, estrutura: { nota: 6, comentario: 'Falta conclusão.' }, extensao: { nota: 7, comentario: 'Dentro do limite.' } },
  prioridades: ['Citar o § 5º', 'Concluir de forma expressa', 'Enfrentar a coisa julgada'], geral: 'Faltou o § 5º.' });

// A IA do teste: troca window.claude.complete depois do boot (por fora do portão de consentimento).
// modo: 'boa' | 'rede' | 'lixo' | 'pendente' (só resolve quando window.__iaSolta() é chamada)
const armarIA = (page, modo, boa) => page.evaluate(({ modo, boa }) => {
  window.__iaChamadas = 0;
  window.claude = window.claude || {};
  window.claude.complete = () => { window.__iaChamadas++;
    if (modo === 'rede') return Promise.reject(new Error('Failed to fetch'));
    if (modo === 'lixo') return Promise.resolve('não sei corrigir isso');
    if (modo === 'pendente') return new Promise(res => { window.__iaSolta = () => res(boa); });
    return Promise.resolve(boa); };
}, { modo, boa });
const hist = page => page.evaluate(() => JSON.parse(localStorage.getItem('catedra:red') || '[]'));
const evo = page => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('catedra:redHist') || '[]'); } catch (_) { return []; } });
const entregar = page => page.click('[data-red="folha"] .ct-folha-rodape .ct-btn');
const abrir = async (pageDaSuite, base, extra) => {
  const c = await novoContexto(pageDaSuite);
  await semear(c.page, base, Object.assign({ redText: RESPOSTA, redTextTs: Date.now() - 1000 }, extra || {}));
  await abrirRedacao(c.page, base);
  return c;
};

export async function testarRedacaoMotor(pageDaSuite, base, ok, opcoes = {}) {
  const R = 'MOTOR [' + (opcoes.motor || 'chromium') + '] ';
  for (const b of [sucesso, cancelar, falhaERecorrigir, outrasFalhas, avisos]) {
    try { await b(pageDaSuite, base, ok, R); } catch (e) { ok(false, R + b.name + ' exceção: ' + String(e.message).split('\n')[0]); }
  }
}

async function sucesso(pageDaSuite, base, ok, R) {
  const { ctx, page } = await abrir(pageDaSuite, base);
  try {
    await armarIA(page, 'boa', BOA); await entregar(page);
    await page.waitForSelector('.ct-hero :text("Sua nota")', { timeout: 15000 });
    const heroi = (await page.textContent('.ct-hero')).replace(/\s+/g, ' ');
    ok(/8[.,]0/.test(heroi) && /corrigido por IA/.test(heroi), R + 'a nota é a soma dos quesitos conferida pelo app (0,80 de 1,00 → 8,0)');
    ok(await page.locator('[data-red="falha-ia"]').count() === 0, R + 'correção por IA não mostra faixa de falha');
    await page.clock.runFor(1500);
    const h = (await hist(page))[0];
    ok(!!h && h.motor === 'ia' && h.res.quesitos.length === 3 && h.res.quesitos[0].trecho !== '' && h.res.quesitos[1].trecho === '', R + 'o histórico guarda o motor e os quesitos, com trecho conferido e trecho inventado descartado');
    const e = (await evo(page))[0];
    ok(!!e && e.quesitos.length === 3 && e.quesitos[0].nota === 0.3 && e.quesitos[1].nota === 0.1 && e.quesitos[2].max === 0.4, R + 'a evolução recebe os quesitos reais da banca, não critérios genéricos');
    const corpo = (await page.textContent('main')).replace(/\s+/g, ' ');
    ok(/citar o § 5º do art\. 304/.test(corpo) && /fora do espelho/i.test(corpo), R + 'a tela mostra o que faltou por quesito e marca a forma como fora do espelho');
  } finally { await ctx.close(); }
}

async function cancelar(pageDaSuite, base, ok, R) {
  const { ctx, page } = await abrir(pageDaSuite, base);
  try {
    await armarIA(page, 'pendente', BOA); await entregar(page);
    await page.waitForSelector('[data-red="corrigindo"]', { timeout: 5000 });
    await page.clock.runFor(12000);
    ok(/00:1[2-5]/.test(await page.textContent('[data-red="corrigindo"]')), R + 'a espera mostra o tempo decorrido (' + (await page.textContent('[data-red="corrigindo"]')).replace(/\s+/g, ' ').trim() + ')');
    await page.click('[data-red="cancelar-correcao"]'); await page.waitForTimeout(200);
    ok(await page.locator('[data-red="corrigindo"]').count() === 0 && (await page.inputValue('[data-red="folha"] textarea')) === RESPOSTA, R + 'cancelar volta para a escrita com o texto intacto');
    await page.evaluate(() => window.__iaSolta()); await page.clock.runFor(1500);
    ok((await hist(page)).length === 0 && await page.locator('.ct-hero :text("Sua nota")').count() === 0, R + 'resposta da IA que chega depois do cancelamento é ignorada e nada é gravado');
  } finally { await ctx.close(); }
}

async function falhaERecorrigir(pageDaSuite, base, ok, R) {
  const { ctx, page } = await abrir(pageDaSuite, base);
  try {
    await armarIA(page, 'rede', BOA); await entregar(page);
    await page.waitForSelector('[data-red="falha-ia"]', { timeout: 15000 });
    const faixa = (await page.textContent('[data-red="falha-ia"]')).replace(/\s+/g, ' ');
    ok(/Sem conexão com a IA/.test(faixa) && /estimativa/i.test(faixa), R + 'falha de rede entrega a estimativa local com o motivo à vista');
    await page.clock.runFor(1500);
    let h = await hist(page);
    ok(h.length === 1 && h[0].motor === 'local' && h[0].falhaIA === 'rede', R + 'o histórico registra que foi estimativa local e por quê');
    const notaLocal = h[0].nota;
    await armarIA(page, 'boa', BOA);
    await page.click('[data-red="recorrigir-ia"]');
    await page.waitForFunction(() => !document.querySelector('[data-red="falha-ia"]'), null, { timeout: 15000 });
    await page.clock.runFor(1500);
    h = await hist(page);
    ok(h.length === 1 && h[0].motor === 'ia' && h[0].nota === 8 && !h[0].falhaIA, R + '"Corrigir de novo com IA" substitui a entrada do histórico (era ' + notaLocal + ', virou ' + h[0].nota + ')');
    const e = await evo(page);
    ok(e.length === 1 && e[0].notaTotal === 8, R + 'a evolução fica com um registro só, atualizado');
    // corrigir de novo que falha mantém o resultado que estava na tela
  } finally { await ctx.close(); }
}

async function outrasFalhas(pageDaSuite, base, ok, R) {
  let c = await abrir(pageDaSuite, base);
  try {
    await armarIA(c.page, 'lixo', BOA); await entregar(c.page);
    await c.page.waitForSelector('[data-red="falha-ia"]', { timeout: 15000 });
    ok(/fora do formato/.test(await c.page.textContent('[data-red="falha-ia"]')), R + 'resposta da IA fora do formato vira estimativa local, com o motivo certo');
  } finally { await c.ctx.close(); }
  c = await abrir(pageDaSuite, base);
  try {
    await c.page.evaluate(() => { try { delete window.claude; } catch (_) { window.claude = undefined; } });
    await entregar(c.page);
    await c.page.waitForSelector('[data-red="falha-ia"]', { timeout: 15000 });
    ok(/não está disponível/.test(await c.page.textContent('[data-red="falha-ia"]')), R + 'sem IA no aparelho, a faixa diz isso');
  } finally { await c.ctx.close(); }
  c = await abrir(pageDaSuite, base);
  try {
    await armarIA(c.page, 'pendente', BOA); await entregar(c.page);
    await c.page.waitForSelector('[data-red="corrigindo"]', { timeout: 5000 });
    await c.page.clock.runFor(92000);
    await c.page.waitForSelector('[data-red="falha-ia"]', { timeout: 15000 });
    ok(/mais de 90 segundos/.test(await c.page.textContent('[data-red="falha-ia"]')), R + '90 segundos sem resposta contam como falha, e sai a estimativa local');
  } finally { await c.ctx.close(); }
}

async function avisos(pageDaSuite, base, ok, R) {
  const c = await abrir(pageDaSuite, base, { redText: 'Só dez palavras nesta resposta curta demais para corrigir agora.' });
  try {
    const rod = (await c.page.textContent('[data-red="folha"] .ct-folha-rodape')).replace(/\s+/g, ' ');
    ok(/Faltam 30 palavras/.test(rod), R + 'o que falta para poder corrigir aparece junto do botão (' + rod.trim().slice(0, 80) + ')');
  } finally { await c.ctx.close(); }
}
