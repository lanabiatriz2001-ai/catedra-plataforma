/* O QUE VOCÊ REPETE (25/11/2026) — quesitos-perdidos.js
   Parte 1 (Node, sem navegador): agrupamento por disciplina e tema, taxa de repetição entre
   a primeira e a última peça, card do Anki e entrada do caderno de erros.
   Parte 2 (navegador): a tela na Redação, a exportação e o envio ao caderno.
   Roda sozinho: node tests/quesitos-perdidos.mjs (só a parte 1). */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function carregar() {
  const caixa = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(RAIZ, 'quesitos-perdidos.js'), 'utf8'), caixa);
  return caixa.window.CT_QUESITOS_PERDIDOS;
}

const LONGO = 'Reconhecimento do concurso material entre os crimes, com a soma das penas privativas de liberdade aplicadas a cada um deles, nos termos da lei penal';
export const BANCO = [
  { id: 'tj-xx-2025-1', orgao: 'TJ-XX', ano: 2025, banca: 'FGV', disciplina: 'Direito Penal', tema: 'Concurso de crimes',
    enunciado: 'Sentença penal. Tício foi denunciado por dois furtos praticados em dias diferentes contra vítimas diversas.',
    espelho: [
      { quesito: LONGO, pontos: 1, disciplina: 'Penal', dispositivos: ['CP art. 69, caput', 'CP art. 59'] },
      { quesito: 'Fixação do regime inicial de cumprimento da pena', pontos: 0.5, disciplina: 'Penal', dispositivos: ['CP art. 33, par. 2o, a'] } ] },
  { id: 'tj-yy-2026-2', orgao: 'TJ-YY', ano: 2026, banca: 'VUNESP', disciplina: 'Direito Penal', tema: 'Dosimetria',
    enunciado: 'Mévio praticou roubo e, dias depois, corrupção de menores. Profira a sentença, fixando as penas cabíveis.',
    espelho: [
      { quesito: 'Aplicação do cúmulo material das penas', pontos: 2, disciplina: 'Penal', dispositivos: ['CP art. 69'] },
      { quesito: 'Reconhecimento da atenuante da confissão espontânea', pontos: 1, disciplina: 'Penal', dispositivos: ['CP art. 65, III, d'] } ] },
];
const q = (i, titulo, nota, max, disc) => ({ i, titulo, nota, max, disc: disc || 'Direito Penal' });
export const HIST = [   // gravado do mais novo para o mais velho, como o app grava
  { id: 'rh3', ts: 3000, quando: '2026-11-20', origem: 'redacao', provaId: 'tj-yy-2026-2', prova: 'Mévio praticou roubo', disc: 'Direito Penal',
    quesitos: [q(0, 'Aplicação do cúmulo material das penas', 0.5, 2), q(1, 'Reconhecimento da atenuante da confissão espontânea', 1, 1)] },
  { id: 'rh2', ts: 2000, quando: '2026-11-10', origem: 'segunda-fase', prova: 'Simulado sem banco', disc: 'Direito Civil',
    quesitos: [q(0, 'Prescrição da pretensão de reparação civil', 0, 1, 'Direito Civil')] },
  { id: 'rh1', ts: 1000, quando: '2026-11-01', origem: 'redacao', prova: 'Sentença penal. Tício foi denunciado por dois furtos praticados em dias', disc: 'Direito Penal',
    quesitos: [q(0, LONGO.slice(0, 120), 0.2, 1), q(1, 'Fixação do regime inicial de cumprimento da pena', 0.5, 0.5)] },
];

export function testarQuesitosPerdidosEstatico(ok) {
  const R = 'REPETE ';
  let M = null;
  try { M = carregar(); } catch (e) { ok(false, R + 'quesitos-perdidos.js carrega (' + e.message.split('\n')[0] + ')'); return; }
  ok(!!M && typeof M.oQueRepete === 'function' && typeof M.arquivoAnki === 'function', R + 'publica oQueRepete e arquivoAnki');

  ok(M.perdido({ nota: 0.2, max: 1 }) && !M.perdido({ nota: 0.5, max: 1 }) && !M.perdido({ nota: 1, max: 1 }), R + 'perdido é menos da metade dos pontos; metade para cima não é');
  ok(!M.perdido({ nota: 0, max: 0 }) && !M.perdido(null), R + 'quesito sem máximo não é contado como perdido');
  ok(M.temaDe({ dispositivos: ['CP art. 69, caput', 'CP art. 59'] }) === 'CP art. 69' && M.temaDe({ dispositivos: ['Lei 9.613/98, art. 1o'] }) === 'Lei 9.613/98, art. 1o', R + 'tema é o primeiro dispositivo, reduzido a diploma e artigo');
  ok(M.temaDe({ dispositivos: [], titulo: 'Prescrição  da pretensão' }) === 'Prescrição da pretensão', R + 'sem dispositivo, o tema é o título do quesito');

  const r = M.oQueRepete(HIST, BANCO);
  ok(r.pecas === 3 && r.perdidos === 2, R + 'três peças lidas e dois temas perdidos (' + r.pecas + ', ' + r.perdidos + ')');
  const penal = r.disciplinas.find(d => d.disc === 'Direito Penal');
  const art69 = penal && penal.temas.find(t => t.tema === 'CP art. 69');
  ok(!!art69 && art69.cobrado === 2 && art69.perdas === 2 && art69.repetiu === true, R + 'o mesmo artigo perdido em duas provas diferentes é UM tema repetido');
  ok(art69.primeira.pct === 20 && art69.ultima.pct === 25 && art69.primeira.quando === '2026-11-01', R + 'a linha vai da primeira peça (20%) à última (25%), na ordem do tempo e não na da gravação');
  ok(r.disciplinas[0].disc === 'Direito Penal', R + 'disciplina com tema repetido vem antes');
  ok(art69.seriePerda.join() === '80,75', R + 'a série do gráfico é o que se perdeu do tema em cada peça, na ordem do tempo (' + art69.seriePerda.join() + ')');
  ok(r.taxa.base === 1 && r.taxa.repetidos === 1 && r.taxa.pct === 100, R + 'taxa de repetição: 1 tema perdido na primeira e cobrado de novo, 1 perdido de novo (100%)');
  ok(!penal.temas.some(t => /regime|confiss/i.test(t.quesito.exigencia)), R + 'quesito atendido não aparece na tela');

  // registro antigo, sem provaId: a prova é achada pelo começo do enunciado e o texto integral volta
  ok(art69.primeira.itens[0].exigencia === LONGO && art69.primeira.itens[0].provaId === 'tj-xx-2025-1', R + 'registro antigo sem id acha a prova pelo enunciado e recupera a exigência integral');
  const semBanco = M.oQueRepete(HIST, []);
  const t69 = semBanco.disciplinas.find(d => d.disc === 'Direito Penal').temas[0];
  ok(t69.quesito.exigencia === 'Aplicação do cúmulo material das penas' && t69.quesito.dispositivos.length === 0, R + 'sem banco, a exigência é o título gravado e nenhum dispositivo é inventado');
  ok(semBanco.taxa.pct === null, R + 'sem tema cobrado duas vezes, a taxa fica sem número em vez de 0%');

  // superou: perdido na primeira, atendido na última → sai da base como não repetido
  const melhor = M.oQueRepete([
    { id: 'b', ts: 2, quando: '2026-11-02', origem: 'redacao', provaId: 'tj-yy-2026-2', prova: 'x', quesitos: [q(0, 'Aplicação do cúmulo material das penas', 2, 2)] },
    { id: 'a', ts: 1, quando: '2026-11-01', origem: 'redacao', provaId: 'tj-yy-2026-2', prova: 'x', quesitos: [q(0, 'Aplicação do cúmulo material das penas', 0, 2)] }], BANCO);
  ok(melhor.taxa.base === 1 && melhor.taxa.repetidos === 0 && melhor.taxa.pct === 0 && melhor.disciplinas[0].temas[0].superou === true, R + 'refazer a mesma prova e acertar conta como superado (taxa 0%)');
  ok(M.oQueRepete(null, null).perdidos === 0 && M.oQueRepete([{ id: 'z', quesitos: [] }], BANCO).pecas === 0, R + 'histórico vazio ou sem quesitos não quebra');

  // card do Anki
  const c = M.cardAnki(art69);
  ok(/Direito Penal · CP art\. 69/.test(c.frente) && /TJ-YY 2026 \(VUNESP\)/.test(c.frente) && /Dosimetria/.test(c.frente), R + 'frente: chamada (disciplina e tema) e resumo (prova e assunto)');
  ok(c.verso.includes('Aplicação do cúmulo material das penas') && /Pontuação:<\/b> 2,00/.test(c.verso) && c.verso.includes('CP art. 69') && /Alerta de prova:<\/b> perdido em 2 de 2 peças; na última, 0,50 de 2,00/.test(c.verso), R + 'verso: exigência literal, pontuação, dispositivos e alerta de prova');
  const arq = M.arquivoAnki(M.temasDe(r));
  const linhas = arq.split('\n').filter(l => l && l[0] !== '#');
  ok(linhas.length === 2 && linhas.every(l => l.split('\t').length === 2), R + 'arquivo: uma linha por card, frente[TAB]verso');
  const sujo = M.cardAnki({ ...art69, quesito: { ...art69.quesito, exigencia: 'a\tb\n<c> & d' } });
  ok(!/\t|\n/.test(sujo.verso) && sujo.verso.includes('&lt;c&gt; &amp; d'), R + 'TAB, quebra de linha e HTML do texto da banca não quebram a importação');
  const abrev = M.cardAnki(M.oQueRepete([HIST[2]], []).disciplinas[0].temas[0]);
  ok(/título abreviado/.test(abrev.verso), R + 'título cortado em 120 caracteres sai avisado como abreviado, não como texto integral');
  const aprox = M.cardAnki({ ...art69, quesito: { ...art69.quesito, aproximada: true } });
  ok(/espelho sugerido, não oficial/.test(aprox.verso), R + 'pontuação de espelho sugerido leva o aviso para o card');

  // caderno de erros
  const e = M.paraCaderno(art69);
  ok(e.enunciado.includes('Aplicação do cúmulo material das penas') && e.disc === 'Direito Penal' && e.topico === 'CP art. 69' && /Dispositivos: CP art\. 69/.test(e.gabarito) && e.extra.ref === 'discursiva·tj-yy-2026-2·1', R + 'entrada do caderno: enunciado, disciplina, tópico, gabarito com dispositivos e referência da prova');
  ok(/perdido em 2 de 2 peças/.test(e.lesson), R + 'a lição do caderno diz quantas vezes o quesito foi perdido');
}

/* ---- Parte 2: navegador ---- */
const lum = (c) => { const m = String(c).match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

export async function testarQuesitosPerdidos(pageDaSuite, base, ok, opcoes = {}) {
  const R = 'REPETE [' + (opcoes.motor || 'chromium') + '] ';
  const { semear, novoContexto } = await import('./redacao-mesa.mjs');
  const { ctx, page } = await novoContexto(pageDaSuite);
  try {
    const T = 'Reconhece a estabilização da tutela, art. 304 do CPC';
    const hist = [
      { id: 'rh-b', up: 2, ts: Date.now() - 864e5, quando: '2026-11-20', origem: 'redacao', prova: 'Peça B', disc: 'Direito Processual Civil', aproximada: true,
        quesitos: [{ i: 0, titulo: T, nota: 0.1, max: 0.3, disc: 'Direito Processual Civil' }, { i: 1, titulo: 'Indica o prazo de dois anos', nota: 0.3, max: 0.3, disc: 'Direito Processual Civil' }] },
      { id: 'rh-a', up: 1, ts: Date.now() - 9 * 864e5, quando: '2026-11-12', origem: 'redacao', prova: 'Peça A', disc: 'Direito Processual Civil',
        quesitos: [{ i: 0, titulo: T, nota: 0, max: 0.3, disc: 'Direito Processual Civil' }] } ];
    // o cartão mora na primeira etapa da Redação (escolher a prova), ao lado de "Minha evolução"
    await semear(page, base, { redHist: hist, redEnunciado: '', redGabarito: '' });
    await page.goto(base + '/' + (opcoes.arquivo || 'Catedra.dc.html'));
    await page.waitForFunction(() => typeof window.__catedraGoView === 'function');
    await page.evaluate(() => window.__catedraGoView('redacao'));
    await page.waitForSelector('[data-red-repete]', { timeout: 8000 });
    const taxa = await page.textContent('[data-red-rep-taxa]');
    ok(/100\s*%/.test(taxa || ''), R + 'o cartão mostra a taxa de repetição (' + String(taxa).trim() + ')');
    ok(await page.locator('[data-red-rep-tema]').count() === 0, R + 'a lista começa recolhida');
    await page.click('[data-red-repete] button[aria-controls="red-repete-lista"]');
    await page.waitForSelector('[data-red-rep-tema]');
    const temas = await page.locator('[data-red-rep-tema]').allTextContents();
    ok(temas.length === 1 && temas[0].includes(T) && /perdido em 2 de 2 peças/.test(temas[0]) && /1ª peça 0% → última 33%/.test(temas[0]), R + 'um tema, com o quesito literal, a contagem e a linha da primeira à última peça');
    ok(!temas.join(' ').includes('prazo de dois anos'), R + 'quesito atendido fica fora');
    const selo = await page.evaluate(() => {
      const e = [...document.querySelectorAll('[data-red-rep-tema] .ct-selo')].find(x => /repetido/.test(x.textContent)); if (!e) return null;
      const cs = getComputedStyle(e), r = e.getBoundingClientRect(); return { cor: cs.color, fundo: cs.backgroundColor, w: r.width, h: r.height };
    });
    ok(!!selo && selo.w > 0 && selo.h > 0, R + 'o selo "repetido" pinta (caixa ' + (selo ? Math.round(selo.w) + '×' + Math.round(selo.h) : 'ausente') + ')');
    ok(!!selo && contraste(selo.cor, selo.fundo) >= 4.5, R + 'contraste do selo ≥ 4,5:1 (' + (selo ? contraste(selo.cor, selo.fundo).toFixed(2) : '—') + ')');
    ok((await page.locator('[data-red-rep-tema] .ct-selo', { hasText: 'espelho sugerido' }).count()) === 1, R + 'peça corrigida por espelho sugerido leva o selo para a linha');
    const fonte = await page.evaluate(() => { const e = document.querySelector('[data-red-rep-tema] span'); return parseFloat(getComputedStyle(e).fontSize); });
    ok(fonte >= 12, R + 'o quesito é legível (' + fonte + ' px)');
    ok(await page.locator('[data-red-rep-tema] [data-red-rep-exig]').count() === 0, R + 'sem prova do banco, o título do quesito não aparece duas vezes');
    ok(/Peça B · 20\/11/.test(temas[0]), R + 'a data ao lado da prova é a da peça em que o quesito foi perdido');

    const graf = await page.evaluate(() => { const s = document.querySelector('[data-red-rep-tema] [data-red-rep-spark]'); if (!s) return null;
      const p = s.querySelector('path'), r = s.getBoundingClientRect(), ys = (p.getAttribute('d').match(/[ML][\d.]+ ([\d.]+)/g) || []).map(x => +x.split(' ')[1]);
      return { w: r.width, h: r.height, ys, traco: getComputedStyle(p).stroke, rot: s.getAttribute('aria-label') }; });
    ok(!!graf && graf.w >= 100 && graf.h >= 20 && graf.ys.length === 2 && graf.ys[1] > graf.ys[0], R + 'o gráfico do tema pinta e desce quando o erro cai (100% → 67% perdidos)');
    ok(!!graf && /100%, 67%/.test(graf.rot || '') && !/rgba\(0, 0, 0, 0\)|none/.test(graf.traco), R + 'o gráfico tem traço visível e descrição em texto');
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('[data-red-rep-anki]')]);
    const arq = fs.readFileSync(await dl.path(), 'utf8');
    const linhas = arq.split('\n').filter(l => l && l[0] !== '#');
    ok(dl.suggestedFilename() === 'catedra-quesitos-perdidos.txt' && linhas.length === 1 && linhas[0].split('\t').length === 2 && linhas[0].includes(T) && /Alerta de prova/.test(linhas[0]), R + 'a exportação baixa um card por tema, frente[TAB]verso, com a exigência literal');

    await page.click('[data-red-rep-caderno]');
    await page.clock.runFor(1500);
    const erros = await page.evaluate(() => JSON.parse(localStorage.getItem('catedra:errors') || '[]'));
    ok(erros.length === 1 && erros[0].enunciado.includes(T) && erros[0].source === 'Quesitos perdidos' && erros[0].disc === 'Direito Processual Civil', R + 'o quesito perdido entra no caderno de erros e persiste');
    await page.click('[data-red-rep-caderno]');
    await page.clock.runFor(1500);
    const erros2 = await page.evaluate(() => JSON.parse(localStorage.getItem('catedra:errors') || '[]'));
    ok(erros2.length === 1, R + 'levar de novo não duplica o erro');
  } catch (e) { ok(false, R + 'exceção: ' + e.message.split('\n')[0]); }
  finally { await ctx.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let falhas = 0, total = 0;
  testarQuesitosPerdidosEstatico((c, m) => { total++; if (!c) { falhas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); });
  console.log(falhas ? ('\nFALHAS: ' + falhas + ' de ' + total) : ('\n' + total + ' verificações passaram'));
  process.exit(falhas ? 1 : 0);
}
