/* ESPELHO SUGERIDO — selo, fundamentos com link e quesitos descartados (25/11/2026)
   Parte 1 (Node, sem navegador): triagem com contagem, referências do fundamento.
   Parte 2 (navegador, IA simulada): o selo nas etapas 2 e 3 e na evolução, o contador de
   descartados e os botões que abrem o fundamento no LEGIS e no JURIS.
   Roda sozinho: node tests/espelho-sugerido.mjs (só a parte 1). */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function carregar() {
  const caixa = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(RAIZ, 'espelho-sugerido.js'), 'utf8'), caixa);
  return caixa.window.CT_ESPELHO_SUGERIDO;
}

export const RESPOSTA_IA = { total: 10, quesitos: [
  { quesito: 'Reconhecer a estabilização da tutela antecipada', pontos: 4, fundamento: 'art. 304, § 5º, do CPC' },
  { quesito: 'Afastar a formação de coisa julgada material', pontos: 3, fundamento: 'CPC, art. 304, § 6º; Súmula 410 do STJ' },
  { quesito: 'Discorrer livremente sobre o tema proposto', pontos: 2, fundamento: '' },
  { quesito: 'Concluir com a solução do caso concreto', pontos: 1, fundamento: 'n/a' },
  { quesito: 'curto', pontos: 0, fundamento: 'art. 1º do CPC' },
] };

export function testarEspelhoSugeridoEstatico(ok) {
  const R = 'ESPSUG ';
  let M = null;
  try { M = carregar(); } catch (e) { ok(false, R + 'espelho-sugerido.js carrega (' + e.message.split('\n')[0] + ')'); return; }
  ok(!!M && typeof M.triagem === 'function' && typeof M.referencias === 'function', R + 'publica triagem e referencias');

  const t = M.triagem(RESPOSTA_IA);
  ok(t.recebidos === 5 && t.aceitos.length === 2 && t.descartados === 2 && t.curtos === 1, R + 'triagem: 5 recebidos, 2 aceitos, 2 descartados por falta de fundamento, 1 que nem era quesito');
  const sug = M.interpretar(RESPOSTA_IA, 'p1');
  ok(!!sug && sug.quesitos.length === 2 && sug.descartados === 2 && sug.recebidos === 5, R + 'o espelho guarda quantos quesitos vieram e quantos ficaram de fora');
  ok(sug.quesitos.every(q => q.fundamento.length >= 6), R + 'regra dura mantida: nenhum quesito aceito sem fundamento');
  ok(M.interpretar({ quesitos: [RESPOSTA_IA.quesitos[0], RESPOSTA_IA.quesitos[2]] }, 'p2') === null && M.triagem({ quesitos: [RESPOSTA_IA.quesitos[0], RESPOSTA_IA.quesitos[2]] }).descartados === 1, R + 'com menos de dois aceitos o espelho é nulo, e a triagem ainda diz quantos caíram');
  ok(M.triagem(null).recebidos === 0 && M.triagem({}).aceitos.length === 0, R + 'resposta vazia não quebra a triagem');
  const txt = M.texto(sug);
  ok(/SUGERIDO PELO CÁTEDRA — NÃO OFICIAL/.test(txt) && /banca não publicou/.test(txt), R + 'o texto continua se declarando sugerido e não oficial');

  const ref = (f) => M.referencias(f).map(r => r.tipo + ':' + r.ref).join(' | ');
  ok(ref('art. 304, § 5º, do CPC') === 'lei:Art. 304, § 5º do CPC', R + 'artigo antes da lei vira "Art. N, § do SIGLA"');
  ok(ref('CPC, art. 139, IV; Súmula 410 do STJ') === 'lei:Art. 139, IV do CPC | juris:Súmula 410 do STJ', R + 'lei antes do artigo e súmula no mesmo fundamento viram duas referências');
  ok(ref('arts. 186 e 927 do Código Civil') === 'lei:Art. 186 do CC | lei:Art. 927 do CC', R + '"arts. 186 e 927" vira uma referência por artigo, com o código pela sigla');
  ok(ref('Lei 9.613/98, art. 1o') === 'lei:Art. 1º da Lei 9.613/98', R + 'lei por número fica "da Lei N/ano", com o ordinal corrigido');
  ok(ref('art. 37 §6º da CF') === 'lei:Art. 37, §6º da CF' && ref('art. 5º, XI, da Constituição Federal') === 'lei:Art. 5º, XI da CF', R + 'Constituição sai como "da CF", com ou sem vírgula antes do parágrafo');
  ok(ref('Tema 698 do STF') === 'juris:Tema 698 do STF', R + 'tema vai para o JURIS');
  ok(ref('STF, RE 841.526') === '' && ref('') === '', R + 'o que não é reconhecido não vira link (o fundamento segue no texto para conferir à mão)');
  ok(ref('art. 304 do CPC; CPC, art. 304') === 'lei:Art. 304 do CPC', R + 'a mesma citação escrita de dois jeitos não duplica o botão');
}

/* ---- Parte 2: navegador ---- */
const lum = (c) => { const m = String(c).match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

export async function testarEspelhoSugerido(pageDaSuite, base, ok, opcoes = {}) {
  const R = 'ESPSUG [' + (opcoes.motor || 'chromium') + '] ';
  const { semear, novoContexto } = await import('./redacao-mesa.mjs');
  const { ctx, page } = await novoContexto(pageDaSuite);
  try {
    const M = carregar();
    const sug = M.interpretar(RESPOSTA_IA, 'p-sug');
    const hist = [{ id: 'rh1', up: 1, ts: Date.now() - 864e5, quando: '2026-11-20', origem: 'redacao', prova: 'Tutela estabilizada', disc: 'Direito Processual Civil', aproximada: true,
      quesitos: [{ i: 0, titulo: 'Reconhecer a estabilização', nota: 0.1, max: 4 }] }];
    await semear(page, base, { redHist: hist, espelhosSugeridos: [sug], redProvaId: 'p-sug', redGabarito: M.texto(sug) });
    // espSugAtual nasce da prova aberta: o host o reconstrói no boot a partir do cache
    await page.goto(base + '/' + (opcoes.arquivo || 'Catedra.dc.html'));
    await page.waitForFunction(() => typeof window.__catedraGoView === 'function');
    await page.evaluate(() => window.__catedraGoView('redacao'));
    await page.waitForSelector('[data-red="mesa"]', { timeout: 8000 });
    const trilho = await page.evaluate(() => { const e = document.querySelector('.ct-trilho [data-esp-sug-selo]'); if (!e) return null;
      const cs = getComputedStyle(e), r = e.getBoundingClientRect(); return { txt: e.textContent.trim(), cor: cs.color, fundo: cs.backgroundColor, w: r.width, h: r.height }; });
    ok(!!trilho && /Sugerido — não oficial/.test(trilho.txt) && trilho.w > 0 && trilho.h > 0, R + 'o selo fica no trilho das etapas, visível em toda a correção');
    ok(!!trilho && contraste(trilho.cor, trilho.fundo) >= 4.5, R + 'contraste do selo do trilho ≥ 4,5:1 (' + (trilho ? contraste(trilho.cor, trilho.fundo).toFixed(2) : '—') + ')');
    const desc = await page.textContent('[data-esp-sug-descartes]').catch(() => null);
    ok(/2 quesitos descartados por falta de fundamento/.test(desc || '') && /5 propostos/.test(desc || ''), R + 'a tela diz quantos quesitos a IA propôs e quantos caíram por falta de fundamento (' + String(desc || '').trim() + ')');
    const botoes = await page.$$eval('[data-esp-sug-fund] button.ct-enam-ref', bs => bs.map(b => ({ t: b.textContent.trim(), lei: b.dataset.lei || '', busca: b.dataset.busca || '', h: b.getBoundingClientRect().height })));
    ok(botoes.some(b => /Art\. 304, § 5º do CPC · Ler no LEGIS/.test(b.t) && b.lei) && botoes.some(b => /Súmula 410 do STJ · Ver no JURIS/.test(b.t) && b.busca === 'Súmula 410 do STJ'), R + 'cada fundamento vira botão: artigo abre o LEGIS, súmula vai ao JURIS (' + botoes.map(b => b.t).join(' / ') + ')');
    ok(botoes.length > 0 && botoes.every(b => b.h >= 44), R + 'os botões dos fundamentos têm alvo de toque ≥ 44 px');

    await page.evaluate(() => window.__catedraGoView('inicio'));
    await semear(page, base, { redHist: hist, redEnunciado: '', redGabarito: '' });
    await page.goto(base + '/' + (opcoes.arquivo || 'Catedra.dc.html'));
    await page.waitForFunction(() => typeof window.__catedraGoView === 'function');
    await page.evaluate(() => window.__catedraGoView('redacao'));
    await page.waitForSelector('.ct-card .ct-eb:text("Minha evolução")', { timeout: 8000 });
    await page.locator('.ct-card', { has: page.locator('.ct-eb:text("Minha evolução")') }).locator('button', { hasText: /^ver$/ }).click();
    await page.waitForSelector('[data-red-evo-aprox]', { timeout: 6000 }).catch(() => null);
    ok(await page.locator('[data-red-evo-aprox]').count() === 1, R + 'na evolução, a prova corrigida por espelho sugerido leva o selo');
  } catch (e) { ok(false, R + 'exceção: ' + e.message.split('\n')[0]); }
  finally { await ctx.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let falhas = 0, total = 0;
  testarEspelhoSugeridoEstatico((c, m) => { total++; if (!c) { falhas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); });
  console.log(falhas ? ('\nFALHAS: ' + falhas + ' de ' + total) : ('\n' + total + ' verificações passaram'));
  process.exit(falhas ? 1 : 0);
}
