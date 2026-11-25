/* LEITURA DA IA DEPOIS DA CONFERÊNCIA PRÓPRIA (25/11/2026)
   A pessoa fez à mão e conferiu sozinha; depois digita o que escreveu e a IA lê contra o mesmo espelho,
   com a mesma régua. A nota registrada continua a dela. A tela mostra em quais quesitos as duas leituras
   divergem. Parte 1 (Node): M.compararLeituras. Parte 2 (navegador, IA simulada). */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { semear, abrirRedacao, novoContexto } from './redacao-mesa.mjs';
import { RESPOSTA, armarIA, hist, contraste } from './redacao-motor.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const motor = () => { const cx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(RAIZ, 'redacao-motor.js'), 'utf8'), cx); return cx.window.CT_REDACAO_MOTOR; };

export function testarRedacaoSegundaEstatico(ok) {
  const R = 'SEGUNDA ';
  const M = motor();
  if (!M || typeof M.compararLeituras !== 'function') { ok(false, R + 'redacao-motor.js publica compararLeituras'); return; }
  const q = (obtido, pontos, extra) => Object.assign({ obtido, pontos }, extra || {});
  const c = M.compararLeituras({ nota: 8, quesitos: [q(0.3, 0.3), q(0.1, 0.3), q(0.4, 0.4)] },
    { nota: 6, quesitos: [q(0.3, 0.3), q(0.3, 0.3, { trecho: 'dois anos' }), q(0, 0.4, { faltou: 'afastar a coisa julgada' })] });
  ok(c.linhas.map(l => l.d).join() === 'igual,ia-mais,ia-menos' && c.divergentes === 2, R + 'cada quesito diz se a IA deu a mesma nota, mais ou menos, e a contagem de divergências bate');
  ok(c.linhas[1].dif === 0.2 && c.linhas[2].dif === -0.4 && c.notaSua === 8 && c.notaIA === 6 && c.difNota === -2, R + 'a diferença sai arredondada (0,30 − 0,10 = 0,20, sem resto de ponto flutuante)');
  ok(c.linhas[1].trecho === 'dois anos' && c.linhas[2].faltou === 'afastar a coisa julgada', R + 'o trecho e o que faltou vêm da leitura da IA');
  const s = M.compararLeituras({ nota: 10, quesitos: [q(0.3, 0.3), q(0.3, 0.3)] }, { nota: 5, quesitos: [q(0.3, 0.3), q(0, 0.3, { estimado: true, trecho: 'x', faltou: 'y' })] });
  ok(s.divergentes === 0 && s.semNota === 1 && s.avaliados === 1 && s.linhas[1].d === 'sem-nota' && s.linhas[1].trecho === '' && s.linhas[1].faltou === '', R + 'quesito que a IA não avaliou não conta como divergência nem empresta trecho');
  ok(s.notaIA === null && s.difNota === null && s.linhas[1].ia === null && s.linhas[1].dif === null && s.linhas[0].ia === 0.3, R + 'com quesito sem nota não existe total da IA nem diferença de total (nem zero, nem estimativa local)');
  const g = M.compararLeituras({ nota: 7.5, quesitos: [{ quesito: 'Nota geral', obtido: 7.5, pontos: 10 }] }, { nota: 6, quesitos: [] });
  ok(g.linhas.length === 0 && g.difNota === -1.5 && g.notaIA === 6, R + 'conferência por nota geral compara só o total');
  const v = M.compararLeituras(null, undefined);
  ok(v.linhas.length === 0 && v.notaSua === 0 && v.notaIA === null && v.divergentes === 0, R + 'entrada vazia não quebra e não inventa nota da IA');
  // régua de um degrau (espelho do banco com escala "0,40"): as duas leituras sairiam iguais à força
  const u = M.compararLeituras({ nota: 10, quesitos: [q(0.4, 0.4, { opcoes: [0.4] }), q(0.3, 0.3, { opcoes: [0, 0.1, 0.2, 0.3] })] }, { nota: 10, quesitos: [q(0.4, 0.4), q(0.1, 0.3)] });
  ok(u.linhas[0].d === 'sem-regua' && u.semRegua === 1 && u.avaliados === 1 && u.divergentes === 1 && u.notaIA === null && u.linhas[0].ia === null, R + 'quesito com régua de um degrau fica "sem régua", fora da contagem e sem total da IA');
  // mesmas notas nos quesitos: total igual (a IA soma sobre o mesmo total arredondado da conferência)
  const t = M.compararLeituras({ nota: 7.3, quesitos: [q(0.6, 0.6), q(0, 0.2), q(1.2, 1.2), q(0, 0.35), q(0.23, 0.45)] }, { nota: 7.2, quesitos: [q(0.6, 0.6), q(0, 0.2), q(1.2, 1.2), q(0, 0.35), q(0.23, 0.45)] });
  ok(t.divergentes === 0 && t.notaIA === 7.3 && t.difNota === 0, R + 'mesmas notas em todos os quesitos dão o mesmo total dos dois lados (7,3 e 7,3)');
  // máximo de 3 casas: a nota cheia da IA não passa do máximo e não vira divergência na precisão da tela
  const cheia = M.naEscala(0.375, { max: 0.375 });
  // (caso da revisão do PR: cheias de 0,375 · 0,375 · 0,25 nos dois lados; somar as notas já arredondadas dava 10,1)
  const p3 = M.compararLeituras({ nota: 10, quesitos: [q(0.375, 0.375), q(0.375, 0.375), q(0.25, 0.25)] }, { nota: 10.1, quesitos: [q(cheia, 0.375), q(0.375, 0.375), q(0.25, 0.25)] });
  ok(cheia === 0.375 && p3.divergentes === 0 && p3.notaIA === 10 && p3.difNota === 0, R + 'quesitos de 0,375: nota cheia fica 0,375, sem divergência falsa, e o total da IA soma as notas sem arredondar (10,0, não 10,1)');
  // listas desalinhadas (máximo diferente no mesmo índice): não compara linha a linha
  const d = M.compararLeituras({ nota: 5, quesitos: [q(0.3, 0.3), q(0.2, 0.3)] }, { nota: 4, quesitos: [q(0.3, 0.3), q(0, 0.4)] });
  ok(d.desalinhado === true && d.linhas.length === 0 && d.notaIA === 4, R + 'quesitos com máximo diferente no mesmo índice não são comparados linha a linha');
  // o rótulo é o número do quesito no espelho, não a posição
  const n = M.compararLeituras({ nota: 5, quesitos: [q(0.3, 0.3, { quesito: 'Quesito 1' }), q(0.2, 0.3, { quesito: 'Quesito 4' })] }, { nota: 5, quesitos: [q(0.3, 0.3), q(0.2, 0.3)] });
  ok(n.linhas.map(l => l.n).join() === '1,4', R + 'a linha leva o número do quesito do espelho (Q4), não a posição na lista');
  ok(M.motivoDaFalha({ message: 'O acesso à IA desta conta foi pausado. Fale com quem te convidou.' }) === 'pausada'
    && M.motivoDaFalha({ message: 'Entre na sua conta do Cátedra para usar a IA.' }) === 'sessao', R + 'IA pausada pelo console e sessão expirada têm motivo próprio');
  const longo = M.montarPrompt({ enunciado: 'E', quesitos: [{ n: 1, texto: 'quesito de teste', max: 1 }], resposta: 'palavra '.repeat(3000) });
  ok(/15\.000/.test(longo.cortes[0]) && /cortada aqui/.test(longo.prompt) && /pode estar depois do corte/.test(longo.prompt), R + 'resposta cortada: o aviso diz 15.000 e o pedido avisa a IA do corte');
}

// Você: Q1 0,30 · Q2 0,10 · Q3 0,40 (nota 8,0).  IA: Q1 0,30 · Q2 0,30 · Q3 0,00 (nota 6,0).
const IA2 = JSON.stringify({ quesitos: [
  { i: 1, nota: 0.3, trecho: 'torna-se estável quando não há recurso', faltou: '' },
  { i: 2, nota: 0.3, trecho: 'o prazo da ação de revisão é de dois anos', faltou: '' },
  { i: 3, nota: 0, trecho: '', faltou: 'Não afastou a coisa julgada do § 6º.' } ],
  forma: { portugues: { nota: 8, comentario: 'Sem desvios.' } }, prioridades: ['Enfrentar a coisa julgada'], geral: 'Faltou o § 6º.' });
// A IA lê Q1 e Q2 com as mesmas notas da pessoa e PULA o Q3. A transcrição cita o § 6º, então o corretor
// local daria nota ao Q3: se ela vazasse para a leitura, o total da "IA" subiria com nota que a IA não deu.
const IA3 = JSON.stringify({ quesitos: [
  { i: 1, nota: 0.3, trecho: 'torna-se estável quando não há recurso', faltou: '' },
  { i: 2, nota: 0.1, trecho: '', faltou: 'Citar o § 5º do art. 304.' } ],
  forma: { portugues: { nota: 8, comentario: 'Sem desvios.' } }, prioridades: ['Citar o § 5º'], geral: 'Faltou o § 5º.' });
const COM_Q3 = RESPOSTA + ' A decisão estabilizada não faz coisa julgada, nos termos do art. 304, § 6º, do CPC, e só a ação própria pode afastá-la.';
const LONGO = Array.from({ length: 22 }, () => RESPOSTA).join(' ');
const PROSA = 'Espelho em prosa: espera-se que o candidato reconheça a estabilização da tutela antecipada antecedente, indique o prazo de dois anos para a ação de revisão e afaste a coisa julgada, com fundamento no art. 304 do CPC.';
const IA_PROSA = JSON.stringify({ pontos: [
  { ponto: 'Estabilização da tutela', status: 'coberto', trecho: 'torna-se estável quando não há recurso', faltou: '' },
  { ponto: 'Prazo de dois anos', status: 'coberto', trecho: 'o prazo da ação de revisão é de dois anos', faltou: '' },
  { ponto: 'Afastar a coisa julgada', status: 'faltou', trecho: '', faltou: 'Não mencionou o § 6º.' },
  { ponto: 'Fundamento no art. 304', status: 'parcial', trecho: '', faltou: 'Citar os parágrafos.' } ],
  forma: { portugues: { nota: 8, comentario: 'Sem desvios.' } }, prioridades: ['Afastar a coisa julgada'], geral: 'Cobre o principal, mas não afasta a coisa julgada.' });
// espelho com um quesito de régua de um degrau, como os do banco com escala "0,40"
const GAB_UM_DEGRAU = 'Instruções gerais da banca.\n1. Reconhece a estabilização da tutela, art. 304 do CPC [escala: 0,00/0,10/0,20/0,30]\n2. Indica o prazo de dois anos, art. 304, § 5º, do CPC [escala: 0,40]';
const IA_UM_DEGRAU = JSON.stringify({ quesitos: [
  { i: 1, nota: 0.1, trecho: '', faltou: 'Não citou o caput.' }, { i: 2, nota: 0, trecho: '', faltou: 'Não indicou o prazo.' } ],
  forma: { portugues: { nota: 8, comentario: 'Sem desvios.' } }, prioridades: ['Indicar o prazo'], geral: 'Faltou o prazo.' });

const evo = page => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('catedra:redHist') || '[]'); } catch (_) { return []; } });
const linhas = page => page.evaluate(() => [...document.querySelectorAll('[data-red="segunda-linha"]')].map(e => ({ d: e.getAttribute('data-d'), txt: e.textContent.replace(/\s+/g, ' ').trim(),
  sua: (e.querySelector('[data-red="segunda-linha-sua"]') || {}).textContent, ia: (e.querySelector('[data-red="segunda-linha-ia"]') || {}).textContent })));
const foco = page => page.evaluate(() => (document.activeElement && document.activeElement.getAttribute('data-red')) || '');
const esperarFoco = (page, alvo) => page.waitForFunction(a => document.activeElement && document.activeElement.getAttribute('data-red') === a, alvo, { timeout: 4000 }).then(() => true, () => false);
const gravarPedido = page => page.evaluate(() => { const o = window.claude.complete; window.claude.complete = (p, opts) => { window.__iaPedido = p; return o(p, opts); }; });

async function conferir(page) {
  await page.click('[data-red="terminei"]'); await page.waitForSelector('[data-red="conf-item"]');
  const marcar = (i, txt) => page.locator('[data-red="conf-item"] >> nth=' + i).locator('[data-red="conf-opcao"]', { hasText: txt }).click();
  await marcar(0, '0,30'); await marcar(1, '0,10'); await marcar(2, '0,40');
  await page.click('[data-red="conf-registrar"]'); await page.waitForSelector('[data-red="segunda"]', { timeout: 8000 });
}
async function abrirCampo(page) { await page.click('[data-red="segunda-abrir"]'); await page.waitForSelector('[data-red="segunda-texto"]'); }

export async function testarRedacaoSegunda(pageDaSuite, base, ok, opcoes = {}) {
  const R = 'SEGUNDA [' + (opcoes.motor || 'chromium') + '] ';
  for (const b of [fluxo, pulado, cancelar, tempo, indisponivel, prosa, umDegrau, medidas]) {
    try { await b(pageDaSuite, base, ok, R); } catch (e) { ok(false, R + b.name + ' exceção: ' + String(e.message).split('\n')[0]); }
  }
}

const CONSENT = () => ({ iaConsentimento: { versao: '2026-09', ts: Date.now() - 1000 } });

async function fluxo(pageDaSuite, base, ok, R) {
  const { ctx, page } = await novoContexto(pageDaSuite);
  const erros = []; page.on('pageerror', e => erros.push(String(e.message)));
  try {
    await semear(page, base, CONSENT()); await abrirRedacao(page, base); await armarIA(page, 'boa', IA2);
    await conferir(page);
    ok(await page.locator('[data-red="segunda-linha"]').count() === 0 && await page.locator('[data-red="segunda-texto"]').count() === 0
      && /Digitar o que escrevi/.test(await page.textContent('[data-red="segunda-abrir"]')), R + 'depois da conferência própria a leitura da IA é um convite fechado, sem campo nem comparação');
    const ordem = await page.evaluate(() => { const r = document.querySelector('[data-red="reescrever"]'), s = document.querySelector('[data-red="segunda"]');
      return !!(r && s && (r.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING)); });
    ok(ordem, R + 'papel primeiro: o cartão da IA vem depois de "Refazer à mão"');
    await page.waitForTimeout(1400);                 // o registro da conferência chega ao storage pelo autosave
    const evo0 = await evo(page); const h0 = await hist(page);
    ok(evo0.length === 1 && h0.length === 1 && h0[0].texto === '', R + 'a conferência própria deixou um registro na evolução e uma entrada sem texto');

    await abrirCampo(page);
    ok(await page.isDisabled('[data-red="segunda-pedir"]') && /Faltam 40 palavras/.test(await page.textContent('[data-red="segunda-dica"]')), R + 'sem texto o botão fica desligado e a dica diz quantas palavras faltam');
    ok(await esperarFoco(page, 'segunda-texto'), R + 'abrir o campo leva o foco para ele (foco em: ' + await foco(page) + ')');
    ok(await page.getAttribute('[data-red="segunda-texto"]', 'aria-describedby') === 'ct-seg-dica' && await page.locator('label[for="ct-seg-texto"]').count() === 1, R + 'o campo tem rótulo visível e a dica ligada a ele');
    await page.fill('[data-red="segunda-texto"]', RESPOSTA.split(' ').slice(0, 39).join(' '));
    ok(/Falta 1 palavra/.test(await page.textContent('[data-red="segunda-dica"]')), R + 'a dica concorda no singular: "Falta 1 palavra"');

    // a IA falha: o motivo aparece, nada é gravado, a conferência fica como estava
    ok(await page.getAttribute('[data-red="segunda-aviso"]', 'role') === 'status' && (await page.textContent('[data-red="segunda-aviso"]')).trim() === '', R + 'a região viva já existe, vazia, antes de pedir');
    await armarIA(page, 'rede', IA2);
    await page.fill('[data-red="segunda-texto"]', RESPOSTA);
    await page.click('[data-red="segunda-pedir"]'); await page.waitForSelector('[data-red="segunda-erro"]', { timeout: 8000 });
    await page.waitForTimeout(1400);
    let h = await hist(page);
    ok(/conex|rede|internet/i.test(await page.textContent('[data-red="segunda-erro"]')) && /continua registrada/.test(await page.textContent('[data-red="segunda-erro"]')), R + 'falha da IA é dita na tela, com o motivo');
    ok(/continua registrada/.test(await page.textContent('[data-red="segunda-aviso"]')), R + 'a região viva anuncia o motivo ao leitor de tela');
    ok(h.length === 1 && !h[0].segunda && h[0].nota === 8 && await page.locator('[data-red="segunda-linha"]').count() === 0, R + 'falha não grava leitura nem inventa estimativa local como se fosse a IA');
    ok(await page.inputValue('[data-red="segunda-texto"]') === RESPOSTA && await esperarFoco(page, 'segunda-erro'), R + 'o texto continua no campo depois da falha, e o foco vai para a mensagem (texto, não o botão que um Enter dispararia)');

    // resposta fora do formato: motivo próprio, nada gravado
    await armarIA(page, 'lixo', IA2);
    await page.click('[data-red="segunda-pedir"]');
    await page.waitForFunction(() => /fora do formato/.test((document.querySelector('[data-red="segunda-erro"]') || {}).textContent || ''), null, { timeout: 8000 });
    ok(!(await hist(page))[0].segunda, R + 'resposta fora do formato também não grava nada');

    // a IA responde: comparação quesito a quesito, com a régua da conferência no pedido
    await armarIA(page, 'boa', IA2); await gravarPedido(page);
    const up0 = h[0].up;
    await page.click('[data-red="segunda-pedir"]'); await page.waitForSelector('[data-red="segunda-linha"]', { timeout: 15000 });
    const pedido = await page.evaluate(() => window.__iaPedido || '');
    ok(/notas permitidas: 0,00 \/ 0,20 \/ 0,40/.test(pedido), R + 'a IA recebe a mesma régua que a conferência ofereceu (0 / metade / cheio no quesito sem escala)');
    const ls = await linhas(page);
    ok(ls.length === 3 && ls.map(l => l.d).join() === 'igual,ia-mais,ia-menos', R + 'uma linha por quesito: igual, a IA deu mais, a IA deu menos');
    ok(ls[1].sua === '0,10' && ls[1].ia === '0,30' && /de 0,30/.test(ls[1].txt) && /a IA deu mais/.test(ls[1].txt) && /A IA pontuou este trecho:.*dois anos/.test(ls[1].txt), R + 'no Q2 a sua nota (0,10) e a da IA (0,30) ficam cada uma no seu lugar, sobre o máximo, com o trecho que ela pontuou');
    ok(ls[2].sua === '0,40' && ls[2].ia === '0,00' && /Segundo a IA, faltou:.*§ 6º/.test(ls[2].txt), R + 'no quesito em que a IA deu menos aparece o que ela disse que faltou');
    ok(!/estável quando/.test(ls[0].txt) && /mesma nota/.test(ls[0].txt), R + 'quesito com a mesma nota não repete trecho');
    ok(/diferente em 2 de 3 quesitos/.test(await page.textContent('[data-red="segunda-resumo"]'))
      && (await page.textContent('[data-red="segunda-sua"]')).trim() === '8,0' && (await page.textContent('[data-red="segunda-ia"]')).trim() === '6,0', R + 'o resumo conta as divergências e mostra as duas notas, 8,0 e 6,0');
    ok(/Faltou o § 6º/.test(await page.textContent('[data-red="segunda-geral"]')), R + 'o comentário geral da IA aparece');
    ok(await page.locator('[data-red="segunda-texto"]').count() === 0, R + 'depois da leitura o campo fecha');
    ok(await esperarFoco(page, 'segunda-resumo'), R + 'o foco vai para o resumo, que o leitor de tela lê na chegada (foco em: ' + await foco(page) + ')');

    await page.waitForTimeout(1400);
    h = await hist(page);
    ok(h.length === 1 && h[0].nota === 8 && h[0].origem === 'conferencia-propria' && h[0].res.propria === true, R + 'a nota registrada continua sendo a da conferência própria (8,0)');
    ok(!!h[0].segunda && h[0].segunda.nota === 6 && h[0].segunda.quesitos.length === 3 && h[0].segunda.texto === RESPOSTA && h[0].segunda.words === RESPOSTA.split(/\s+/).length,
      R + 'a leitura, a transcrição e a contagem de palavras ficam em segunda, na mesma entrada do histórico');
    ok(h[0].texto === '' && h[0].up > up0, R + 'o texto da entrada continua vazio (app antigo não confunde com resposta digitada) e o carimbo up avança para o sync');
    ok(JSON.stringify(await evo(page)) === JSON.stringify(evo0), R + 'a evolução fica idêntica: a leitura da IA não entra na curva nem na prioridade');
    ok(await page.evaluate(() => Object.keys(localStorage).filter(k => /redSeg/.test(k)).length === 0), R + 'o estado de tela da leitura (redSeg*) não vai para o storage');

    // persiste e volta a pintar depois de recarregar e abrir pelo histórico
    // ("Suas correções" só aparece na etapa 1, sem prova na mesa: a semente tira o enunciado antes de reabrir)
    await page.goto(base + '/__semente');
    await page.evaluate(() => { localStorage.setItem('catedra:redEnunciado', JSON.stringify('')); localStorage.setItem('catedra:redGabarito', JSON.stringify('')); });
    await page.goto(base + '/Catedra.dc.html');
    await page.waitForFunction(() => typeof window.__catedraGoView === 'function');
    await page.evaluate(() => window.__catedraGoView('redacao')); await armarIA(page, 'boa', IA2);   // a página nova traz o shim de novo
    await page.waitForSelector('button[data-id="' + h[0].id + '"]', { timeout: 8000 });
    const rascunho0 = await page.evaluate(() => localStorage.getItem('catedra:redText'));
    await page.click('button[data-id="' + h[0].id + '"]'); await page.waitForSelector('[data-red="segunda-linha"]', { timeout: 8000 });
    ok((await linhas(page)).map(l => l.d).join() === 'igual,ia-mais,ia-menos' && /Pedir uma nova leitura/.test(await page.textContent('[data-red="segunda-abrir"]')), R + 'recarregando e abrindo pelo histórico a comparação volta, com o convite para uma nova leitura');
    await page.waitForTimeout(1400);
    ok(await page.evaluate(() => localStorage.getItem('catedra:redText')) === rascunho0, R + 'abrir a conferência pelo histórico não leva a transcrição para o rascunho da folha');
    await abrirCampo(page);
    ok(await page.inputValue('[data-red="segunda-texto"]') === RESPOSTA && await esperarFoco(page, 'segunda-texto') && await page.locator('[data-red="segunda-substitui"]').count() === 1,
      R + 'pedir nova leitura abre o campo com a transcrição guardada, com o foco, e avisa que a nova substitui a atual');
    await page.click('[data-red="segunda-fechar"]');
    ok(await esperarFoco(page, 'segunda-abrir') && await page.locator('[data-red="segunda-texto"]').count() === 0, R + '"Agora não" fecha o campo e devolve o foco ao botão que o abriu');
    ok(erros.length === 0, R + 'nenhum erro de página no fluxo (' + erros.slice(0, 1).join('') + ')');
  } finally { await ctx.close(); }
}

async function pulado(pageDaSuite, base, ok, R) {
  const { ctx, page } = await novoContexto(pageDaSuite);
  try {
    await semear(page, base, CONSENT()); await abrirRedacao(page, base); await armarIA(page, 'boa', IA2);
    await conferir(page);
    await abrirCampo(page);
    await armarIA(page, 'boa', IA3);
    await page.fill('[data-red="segunda-texto"]', COM_Q3);
    await page.click('[data-red="segunda-pedir"]'); await page.waitForSelector('[data-red="segunda-linha"]', { timeout: 15000 });
    const ls = await linhas(page);
    ok(ls.map(l => l.d).join() === 'igual,igual,sem-nota' && ls[2].ia === '—' && /a IA não avaliou/.test(ls[2].txt), R + 'quesito que a IA pulou aparece como "a IA não avaliou", sem número no lugar da nota dela');
    const resumo = await page.textContent('[data-red="segunda-resumo"]');
    ok((await page.textContent('[data-red="segunda-ia"]')).trim() === '—' && (await page.textContent('[data-red="segunda-sua"]')).trim() === '8,0', R + 'com quesito pulado não aparece total da IA (—), só o seu 8,0');
    ok(/mesmas notas nos 2 quesitos que avaliou/.test(resumo) && /não avaliou o Q3/.test(resumo) && /não há total da IA/.test(resumo) && !/3 quesitos/.test(resumo), R + 'o resumo conta só os 2 quesitos que a IA leu e nomeia o Q3 que ela pulou (' + resumo.trim() + ')');
    const peso = await page.evaluate(() => { const f = d => +getComputedStyle(document.querySelector('[data-red="segunda-linha"][data-d="' + d + '"] .ct-ia2-rotulo')).fontWeight; return { igual: f('igual'), sem: f('sem-nota') }; });
    ok(peso.sem === peso.igual, R + 'a linha do quesito pulado não ganha o destaque de divergência (peso ' + peso.sem + ' contra ' + peso.igual + ')');
    await page.waitForTimeout(1400);
    let h = await hist(page);
    const q3 = h[0] && h[0].segunda && h[0].segunda.quesitos[2];
    ok(!!q3 && q3.estimado === true && q3.obtido === 0 && h[0].segunda.nota === null, R + 'gravado: o Q3 sem nota da IA (estimado, 0) e sem total — nada do corretor local entra na leitura');

    // texto acima do limite: a dica avisa antes e o cartão diz o que foi cortado depois
    await abrirCampo(page);
    ok(await page.inputValue('[data-red="segunda-texto"]') === COM_Q3, R + 'o campo reabre com a transcrição da leitura anterior');
    await page.fill('[data-red="segunda-texto"]', LONGO);
    ok(/passa de 15\.000 caracteres/.test(await page.textContent('[data-red="segunda-dica"]')), R + 'texto acima do limite: a dica avisa antes do pedido que a IA vai ler só o começo');
    await armarIA(page, 'boa', IA2);
    await page.click('[data-red="segunda-pedir"]');
    await page.waitForSelector('[data-red="segunda-cortes"]', { timeout: 15000 });
    ok(/A IA não leu tudo — a resposta passa de 15\.000 caracteres/.test(await page.textContent('[data-red="segunda-cortes"]')) && (await linhas(page)).map(l => l.d).join() === 'igual,ia-mais,ia-menos', R + 'depois da leitura o cartão diz que o texto foi cortado, e a nova leitura substitui a anterior');
    await page.waitForTimeout(1400);
    h = await hist(page);
    ok(h.length === 1 && h[0].segunda.nota === 6 && Array.isArray(h[0].segunda.cortes) && h[0].segunda.cortes.length === 1 && h[0].nota === 8, R + 'a nova leitura fica na mesma entrada, com o aviso de corte guardado; a nota registrada segue 8,0');
  } finally { await ctx.close(); }
}

async function cancelar(pageDaSuite, base, ok, R) {
  const { ctx, page } = await novoContexto(pageDaSuite);
  try {
    await semear(page, base, CONSENT()); await abrirRedacao(page, base); await armarIA(page, 'boa', IA2);
    await conferir(page);
    await abrirCampo(page);
    await armarIA(page, 'pendente', IA2);
    await page.fill('[data-red="segunda-texto"]', RESPOSTA);
    await page.click('[data-red="segunda-pedir"]'); await page.waitForSelector('[data-red="segunda-cancelar"]', { timeout: 8000 });
    ok(/Lendo com IA/.test(await page.textContent('[data-red="segunda-pedir"]')) && (await page.textContent('[data-red="segunda-aviso"]')).trim() === 'A IA está lendo o seu texto.', R + 'durante a leitura o botão mostra a espera e a região viva anuncia uma frase fixa (sem contar segundos)');
    ok(await esperarFoco(page, 'segunda-cancelar'), R + 'durante a leitura o foco vai para "Cancelar" (o botão de pedir fica desligado)');
    ok(await page.getAttribute('[data-red="segunda-texto"]', 'readonly') !== null, R + 'durante a leitura o campo fica só para leitura: o que se digitasse ali se perderia');
    await page.click('[data-red="segunda-cancelar"]');
    await page.waitForSelector('[data-red="segunda-cancelar"]', { state: 'detached', timeout: 8000 });
    ok(/Pedir a leitura da IA/.test(await page.textContent('[data-red="segunda-pedir"]')) && await page.inputValue('[data-red="segunda-texto"]') === RESPOSTA, R + 'cancelar destrava o botão e mantém o texto no campo');
    ok(await esperarFoco(page, 'segunda-pedir'), R + 'cancelar devolve o foco ao botão de pedir (foco em: ' + await foco(page) + ')');
    ok(await page.evaluate(() => !!(window.__iaSinal && window.__iaSinal.aborted)), R + 'cancelar aborta a chamada à IA');
    ok(await page.evaluate(() => typeof window.__iaSolta === 'function'), R + 'a IA simulada segue pendente para responder depois do cancelamento');
    await page.evaluate(() => window.__iaSolta());   // a IA responde depois do cancelamento
    await page.waitForTimeout(1400);
    const h = await hist(page);
    ok(h.length === 1 && !h[0].segunda && await page.locator('[data-red="segunda-linha"]').count() === 0, R + 'a resposta que chega depois de cancelar é descartada: nada gravado, nada pintado');
  } finally { await ctx.close(); }
}

async function tempo(pageDaSuite, base, ok, R) {
  const { ctx, page } = await novoContexto(pageDaSuite);
  const erros = []; page.on('pageerror', e => erros.push(String(e.message)));
  try {
    await semear(page, base, CONSENT()); await abrirRedacao(page, base); await armarIA(page, 'boa', IA2);
    await conferir(page);
    await abrirCampo(page);
    await armarIA(page, 'pendente', 'não é json');
    await page.fill('[data-red="segunda-texto"]', RESPOSTA);
    await page.click('[data-red="segunda-pedir"]'); await page.waitForSelector('[data-red="segunda-cancelar"]', { timeout: 8000 });
    await page.clock.fastForward(91000);
    await page.waitForSelector('[data-red="segunda-erro"]', { timeout: 8000 });
    const erro = await page.textContent('[data-red="segunda-erro"]');
    ok(/90 segundos/.test(erro) && /já contou na cota/.test(erro), R + 'tempo esgotado: o motivo aparece e diz que a chamada já contou na cota (' + erro.trim() + ')');
    await page.evaluate(() => window.__iaSolta && window.__iaSolta());   // a resposta tardia, fora do formato, chega agora
    await page.waitForTimeout(1400);
    const h = await hist(page);
    ok(h.length === 1 && !h[0].segunda && await page.locator('[data-red="segunda-linha"]').count() === 0, R + 'a resposta que chega depois do tempo esgotado não vira leitura');
    ok(erros.length === 0, R + 'a resposta tardia fora do formato não deixa rejeição solta nem erro de página (' + erros.slice(0, 1).join('') + ')');
  } finally { await ctx.close(); }
}

async function indisponivel(pageDaSuite, base, ok, R) {
  const { ctx, page } = await novoContexto(pageDaSuite);
  try {
    await semear(page, base, CONSENT()); await abrirRedacao(page, base);
    await page.evaluate(() => { try { delete window.claude; } catch (_) { window.claude = undefined; } });
    await conferir(page);
    ok(/não está disponível/.test(await page.textContent('[data-red="segunda-indisp"]')) && await page.locator('[data-red="segunda-abrir"]').count() === 0,
      R + 'sem IA no aparelho o cartão diz isso antes de a pessoa digitar, e não oferece o campo');
  } finally { await ctx.close(); }
}

async function prosa(pageDaSuite, base, ok, R) {
  const { ctx, page } = await novoContexto(pageDaSuite);
  try {
    await semear(page, base, Object.assign(CONSENT(), { redGabarito: PROSA }));
    await abrirRedacao(page, base); await armarIA(page, 'boa', IA_PROSA);
    await page.click('[data-red="terminei"]'); await page.waitForSelector('[data-red="conf-unica"]');
    await page.fill('[data-red="conf-unica"]', '7,5');
    await page.click('[data-red="conf-registrar"]'); await page.waitForSelector('[data-red="segunda"]', { timeout: 8000 });
    ok(/a nota que ela daria/.test(await page.textContent('[data-red="segunda"]')), R + 'espelho em prosa: o convite promete a nota da IA, não quesitos');
    await abrirCampo(page);
    await armarIA(page, 'boa', IA_PROSA);
    await page.fill('[data-red="segunda-texto"]', RESPOSTA);
    await page.click('[data-red="segunda-pedir"]'); await page.waitForSelector('[data-red="segunda-resumo"]', { timeout: 15000 });
    const resumo = await page.textContent('[data-red="segunda-resumo"]');
    ok(/na nota geral/.test(resumo) && await page.locator('[data-red="segunda-linha"]').count() === 0 && (await page.textContent('[data-red="segunda-sua"]')).trim() === '7,5',
      R + 'conferência por nota geral: o cartão compara só o total, sem linhas (' + resumo.trim() + ')');
    ok(/não afasta a coisa julgada/.test(await page.textContent('[data-red="segunda-geral"]')), R + 'sem linhas, o comentário geral da IA é o que explica a diferença');
  } finally { await ctx.close(); }
}

async function umDegrau(pageDaSuite, base, ok, R) {
  const { ctx, page } = await novoContexto(pageDaSuite);
  try {
    await semear(page, base, Object.assign(CONSENT(), { redGabarito: GAB_UM_DEGRAU }));
    await abrirRedacao(page, base); await armarIA(page, 'boa', IA_UM_DEGRAU);
    await page.click('[data-red="terminei"]'); await page.waitForSelector('[data-red="conf-item"]');
    const marcar = (i, txt) => page.locator('[data-red="conf-item"] >> nth=' + i).locator('[data-red="conf-opcao"]', { hasText: txt }).click();
    await marcar(0, '0,30'); await marcar(1, '0,40');
    await page.click('[data-red="conf-registrar"]'); await page.waitForSelector('[data-red="segunda"]', { timeout: 8000 });
    await abrirCampo(page);
    await armarIA(page, 'boa', IA_UM_DEGRAU);
    await page.fill('[data-red="segunda-texto"]', RESPOSTA);
    await page.click('[data-red="segunda-pedir"]'); await page.waitForSelector('[data-red="segunda-linha"]', { timeout: 15000 });
    const ls = await linhas(page); const resumo = await page.textContent('[data-red="segunda-resumo"]');
    ok(ls.map(l => l.d).join() === 'ia-menos,sem-regua' && ls[1].ia === '—' && /sem régua para comparar/.test(ls[1].txt), R + 'quesito com uma nota só no espelho fica "sem régua para comparar", sem nota da IA forçada no degrau');
    ok(/diferente em 1 de 1 quesito comparável\./.test(resumo) && /No Q2, o espelho só permite uma nota/.test(resumo) && (await page.textContent('[data-red="segunda-ia"]')).trim() === '—',
      R + 'o resumo não afirma concordância forçada: nomeia o Q2 e não dá total da IA (' + resumo.trim() + ')');
  } finally { await ctx.close(); }
}

async function medidas(pageDaSuite, base, ok, R) {
  const casos = [['light', { width: 820, height: 1180 }], ['dark', { width: 820, height: 1180 }], ['light', { width: 390, height: 844 }]];
  for (const [esquema, viewport] of casos) {
    const T = R + esquema + ' ' + viewport.width + ' px: ';
    const ctx = await pageDaSuite.context().browser().newContext({ viewport, hasTouch: true });
    const page = await ctx.newPage(); const t = new Date(); t.setHours(14, 0, 0, 0); await page.clock.install({ time: t });
    try {
      await semear(page, base, CONSENT());
      if (esquema === 'dark') await page.evaluate(() => localStorage.setItem('catedra:dark', '1'));
      const erros = []; page.on('pageerror', e => erros.push(String(e.message)));
      await abrirRedacao(page, base); await armarIA(page, 'boa', IA2); await conferir(page);
      await abrirCampo(page);
      // falha medida, não só lida
      await armarIA(page, 'rede', IA2); await page.fill('[data-red="segunda-texto"]', RESPOSTA);
      await page.click('[data-red="segunda-pedir"]'); await page.waitForSelector('[data-red="segunda-erro"]', { timeout: 8000 });
      const falha = await contraste(page, ['[data-red="segunda-erro"]', '[data-red="segunda-dica"]', '[data-red="segunda-pedir"]', '[data-red="segunda-fechar"]', 'label[for="ct-seg-texto"]']);
      ok(falha.every(m => !m.falta && m.r >= 4.5) && falha.filter(m => /pedir|fechar/.test(m.s)).every(m => m.h >= 44), T + 'na falha, texto ≥ 4,5:1 e botões com 44 px (' + falha.map(m => m.r + '/' + m.h).join(' ') + ')');
      await armarIA(page, 'boa', IA2);
      await page.click('[data-red="segunda-pedir"]'); await page.waitForSelector('[data-red="segunda-linha"]', { timeout: 15000 });
      const dep = await contraste(page, ['[data-red="segunda-resumo"]', '[data-red="segunda-linha"][data-d="igual"] .ct-ia2-rotulo', '[data-red="segunda-linha"][data-d="ia-menos"] .ct-ia2-rotulo',
        '[data-red="segunda-linha"][data-d="ia-mais"] .ct-ia2-rotulo', '[data-red="segunda-linha"][data-d="ia-menos"] .ct-quesito-falta', '[data-red="segunda-linha"][data-d="ia-mais"] [data-red="segunda-linha-ia"]',
        '[data-red="segunda-sua"]', '[data-red="segunda-ia"]', '[data-red="segunda-geral"] .ct-ia2-texto', '[data-red="segunda-abrir"]']);
      ok(dep.every(m => !m.falta && m.r >= 4.5), T + 'todo texto da comparação com contraste ≥ 4,5:1 (' + dep.map(m => m.r).join(' ') + ')');
      const med = await page.evaluate(() => { const st = s => getComputedStyle(document.querySelector(s));
        const c = document.querySelector('[data-red="segunda"]'), r = c.getBoundingClientRect();
        const rot = d => document.querySelector('[data-red="segunda-linha"][data-d="' + d + '"] .ct-ia2-rotulo');
        return { igual: +st('[data-red="segunda-linha"][data-d="igual"] .ct-ia2-rotulo').fontWeight, dif: +getComputedStyle(rot('ia-menos')).fontWeight,
          fundoDif: getComputedStyle(rot('ia-menos')).backgroundColor, fundoIgual: getComputedStyle(rot('igual')).backgroundColor,
          num: parseFloat(st('[data-red="segunda-linha"][data-d="ia-mais"] [data-red="segunda-linha-ia"]').fontSize), nota: parseFloat(st('[data-red="segunda-linha"][data-d="ia-mais"] .ct-nota').fontSize),
          vaza: [...c.querySelectorAll('*')].some(e => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > r.right + 1 || b.left < r.left - 1); }), sx: document.documentElement.scrollWidth > innerWidth + 1,
          abrir: document.querySelector('[data-red="segunda-abrir"]').getBoundingClientRect().height }; });
      ok(med.dif > med.igual && !/rgba?\(0, 0, 0, 0\)|transparent/.test(med.fundoDif) && /rgba?\(0, 0, 0, 0\)|transparent/.test(med.fundoIgual), T + 'a divergência vira selo com fundo e peso maior; a linha igual não (peso ' + med.dif + '/' + med.igual + ', fundo ' + med.fundoDif + ')');
      ok(med.num > med.nota, T + 'os números da linha são maiores que os rótulos (' + med.num + ' contra ' + med.nota + ' px)');
      ok(!med.vaza && !med.sx && med.abrir >= 44, T + 'nada vaza do cartão nem da página e o botão de nova leitura tem 44 px');
      ok(erros.length === 0, T + 'nenhum erro de página (' + erros.slice(0, 1).join('') + ')');
    } finally { await ctx.close(); }
  }
}
