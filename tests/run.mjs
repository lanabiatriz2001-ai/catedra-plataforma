/* Testes de navegador da plataforma — rodam com `npm test`.
   Sobe um servidor estático na raiz do repositório e dirige um Chromium headless:
   · SYNC: o mergeAll do auth.js (carimbo por chave, vazio nunca apaga cheio,
     união por id, lápides, histórico × lixeira) via tests/sync-fixture.html;
   · ACERVO ida-e-volta: rito/peça/bloco na URL, mensagens ctAbrirAcervo com origem,
     pílula de voltar no LEGIS/JURIS e o ciclo completo via tests/harness-acervo.html.
   O executável do Chrome vem de CT_CHROME ou dos caminhos usuais (CI: google-chrome). */
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

const CHROMES = [process.env.CT_CHROME, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser', '/usr/bin/chromium'].filter(Boolean);
const exe = CHROMES.find(p => { try { return fs.existsSync(p); } catch (_) { return false; } });
if (!exe) { console.error('Nenhum Chrome/Chromium encontrado. Defina CT_CHROME=/caminho/do/chrome'); process.exit(2); }

const srv = http.createServer((req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    const p = path.join(RAIZ, decodeURIComponent(u.pathname).slice(1));
    if (!p.startsWith(RAIZ)) { res.writeHead(403); res.end(); return; }
    const data = fs.readFileSync(p);
    res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('nao encontrado'); }
});
await new Promise(r => srv.listen(8123, r));
const URL0 = 'http://localhost:8123';

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage();
const falhas = [];
const ok = (cond, label) => { console.log((cond ? '✓ ' : '✗ ') + label); if (!cond) falhas.push(label); };
page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));

/* ============================ SYNC (mergeAll) ============================ */
await page.goto(URL0 + '/tests/sync-fixture.html');
await page.waitForFunction(() => window.CatedraSync && window.CatedraSync._test);

const sync = await page.evaluate(() => {
  const M = window.CatedraSync._test.mergeAll;
  const J = JSON.stringify;
  const r = {};

  // 1. escalar com conteúdo dos dois lados: vence o carimbo mais novo, nas duas direções
  const svA = { 'catedra:prefs': '{"tema":"novo"}', 'catedra:_kts': J({ 'catedra:prefs': 2000 }) };
  const lcA = { 'catedra:prefs': '{"tema":"velho"}', 'catedra:_kts': J({ 'catedra:prefs': 1000 }) };
  r.escalarSrvNovo = M(svA, lcA, false)['catedra:prefs'] === '{"tema":"novo"}';
  const svB = { 'catedra:prefs': '{"tema":"velho"}', 'catedra:_kts': J({ 'catedra:prefs': 1000 }) };
  const lcB = { 'catedra:prefs': '{"tema":"novo"}', 'catedra:_kts': J({ 'catedra:prefs': 2000 }) };
  r.escalarLocNovo = M(svB, lcB, true)['catedra:prefs'] === '{"tema":"novo"}';

  // 2. vazio nunca apaga cheio, mesmo com carimbo mais novo (semeadura de aparelho novo)
  const svC = { 'catedra:edital': '[{"disc":"Civil"}]', 'catedra:_kts': J({ 'catedra:edital': 1000 }) };
  const lcC = { 'catedra:edital': '[]', 'catedra:_kts': J({ 'catedra:edital': 9000 }) };
  r.vazioNaoApaga = M(svC, lcC, false)['catedra:edital'] === '[{"disc":"Civil"}]';

  // 3. sem carimbo dos dois lados: decide a direção do merge
  const svD = { 'catedra:profile': '{"nome":"srv"}' }, lcD = { 'catedra:profile': '{"nome":"loc"}' };
  r.semCarimboDirecao = M(svD, lcD, true)['catedra:profile'] === '{"nome":"srv"}'
    && M(svD, lcD, false)['catedra:profile'] === '{"nome":"loc"}';

  // 4. arrays com id: união; em colisão vence o carimbo (up) mais novo
  const svE = { 'catedra:errors': J([{ id: 'e1', q: 'srv', up: 100 }, { id: 'e2', q: 'so-srv' }]) };
  const lcE = { 'catedra:errors': J([{ id: 'e1', q: 'loc', up: 200 }, { id: 'e3', q: 'so-loc' }]) };
  const mE = JSON.parse(M(svE, lcE, false)['catedra:errors']);
  r.arrayUniao = mE.length === 3 && mE.some(x => x.id === 'e2') && mE.some(x => x.id === 'e3');
  r.arrayColisao = mE.find(x => x.id === 'e1').q === 'loc';

  // 5. lápide de item: id apagado neste aparelho não volta da nuvem…
  localStorage.setItem('catedra:_tomb', J({ arr: { 'catedra:errors': { e9: 5000 } } }));
  const svF = { 'catedra:errors': J([{ id: 'e9', q: 'volta?', up: 100 }, { id: 'e8', up: 100 }]) };
  const mF = JSON.parse(M(svF, { 'catedra:errors': '[]' }, false)['catedra:errors']);
  r.lapideSegura = !mF.some(x => x.id === 'e9') && mF.some(x => x.id === 'e8');
  // …a menos que tenha sido editado DEPOIS de apagado
  const svG = { 'catedra:errors': J([{ id: 'e9', q: 'editado depois', up: 9000 }]) };
  const mG = JSON.parse(M(svG, { 'catedra:errors': '[]' }, false)['catedra:errors']);
  r.lapideCedeAoMaisNovo = mG.some(x => x.id === 'e9');
  localStorage.removeItem('catedra:_tomb');

  // 6. chave apagada aqui (lápide de chave): não restaura do servidor…
  localStorage.setItem('catedra:_tomb', J({ keys: { 'catedra:provaData': 5000 } }));
  const svH = { 'catedra:provaData': '"2026-12-01"', 'catedra:_kts': J({ 'catedra:provaData': 1000 }) };
  r.chaveApagadaFica = !('catedra:provaData' in M(svH, {}, false));
  // …salvo se outro aparelho a escreveu DEPOIS da exclusão
  const svI = { 'catedra:provaData': '"2027-01-10"', 'catedra:_kts': J({ 'catedra:provaData': 9000 }) };
  r.chaveNovaVence = M(svI, {}, false)['catedra:provaData'] === '"2027-01-10"';
  localStorage.removeItem('catedra:_tomb');

  // 7. histórico × lixeira: exclusão mais nova tira do histórico; edição mais nova restaura
  const svJ = { 'catedra:sessions': J([{ id: 's1', up: 100 }, { id: 's2', up: 900 }]) };
  const lcJ = { 'catedra:sessionsLixeira': J([{ id: 's1', _delAt: 500 }, { id: 's2', _delAt: 500 }]) };
  const oJ = M(svJ, lcJ, false);
  const sess = JSON.parse(oJ['catedra:sessions']), lix = JSON.parse(oJ['catedra:sessionsLixeira']);
  r.lixeiraGanha = !sess.some(x => x.id === 's1') && lix.some(x => x.id === 's1');
  r.edicaoRestaura = sess.some(x => x.id === 's2') && !lix.some(x => x.id === 's2');

  // 8. o mapa de carimbos mescla por máximo
  const oK = M({ 'catedra:_kts': J({ a: 1, b: 9 }) }, { 'catedra:_kts': J({ a: 5, c: 3 }) }, false);
  const kts = JSON.parse(oK['catedra:_kts']);
  r.ktsMaximo = kts.a === 5 && kts.b === 9 && kts.c === 3;
  return r;
});
for (const [k, v] of Object.entries(sync)) ok(v, 'SYNC ' + k);

/* ======================= ACERVO — ida e volta ======================= */
await page.goto(URL0 + '/ritos-web.html');
const PECA = await page.evaluate(() => Object.keys(window.CT_PECAS || {})[0]);
ok(!!PECA, 'ACERVO há peças com roteiro pronto (' + PECA + ')');

// abre direto no bloco
await page.goto(URL0 + '/ritos-web.html?peca=' + encodeURIComponent(PECA) + '&bloco=2');
await page.waitForTimeout(500);
const a1 = await page.evaluate(() => {
  const rot = document.querySelector('.ctr');
  const blks = [...document.querySelectorAll('.ctr .blk')];
  return { aberto: rot && rot.classList.contains('on'), volta: blks.findIndex(b => b.classList.contains('volta')) };
});
ok(a1.aberto, 'ACERVO painel abre via ?peca=');
ok(a1.volta === 2, 'ACERVO bloco 2 destacado — achou ' + a1.volta);

// chip do fluxo carrega a origem (rito)
await page.goto(URL0 + '/ritos-web.html');
await page.waitForTimeout(300);
const a2 = await page.evaluate(async () => {
  const got = new Promise(r => window.addEventListener('message', e => r(e.data), { once: true }));
  const chip = document.querySelector('#fluxo [data-legis]') || document.querySelector('#fluxo [data-juris]');
  if (!chip) return { erro: 'sem chip' };
  chip.click();
  return await got;
});
ok(a2.type === 'ctAbrirAcervo' && a2.de && !!a2.de.rito, 'ACERVO chip do fluxo manda de.rito');

// chip do painel carrega peça+bloco
await page.goto(URL0 + '/ritos-web.html?peca=' + encodeURIComponent(PECA));
await page.waitForTimeout(500);
const a3 = await page.evaluate(async () => {
  const got = new Promise(r => window.addEventListener('message', e => r(e.data), { once: true }));
  const chips = [...document.querySelectorAll('.ctr .rf button')];
  const chip = chips.find(b => +b.dataset.b > 0) || chips[0];
  if (!chip) return { erro: 'sem chip no painel' };
  chip.click();
  return await got;
});
ok(a3.de && a3.de.peca && a3.de.bloco != null, 'ACERVO chip do painel manda de.peca+bloco');

// pílula de voltar nos dois acervos, e só com ?volta=1
for (const pg of ['legis-web.html?volta=1', 'juris-web.html?volta=1']) {
  await page.goto(URL0 + '/' + pg);
  await page.waitForTimeout(400);
  const a4 = await page.evaluate(async () => {
    const b = [...document.querySelectorAll('button')].find(x => /Voltar ao ponto/.test(x.textContent || ''));
    if (!b) return { pill: false };
    const got = new Promise(r => window.addEventListener('message', e => r(e.data), { once: true }));
    b.click();
    return { pill: true, msg: await got };
  });
  ok(a4.pill && a4.msg && a4.msg.type === 'ctVoltarAcervo', 'ACERVO pílula funciona em ' + pg);
}
await page.goto(URL0 + '/legis-web.html');
await page.waitForTimeout(300);
const a4b = await page.evaluate(() => ![...document.querySelectorAll('button')].some(x => /Voltar ao ponto/.test(x.textContent || '')));
ok(a4b, 'ACERVO sem volta=1 não há pílula');

// ciclo completo no harness que simula o host
await page.goto(URL0 + '/tests/harness-acervo.html');
await page.waitForTimeout(600);
const a5 = await page.evaluate(async (PECA) => {
  const fr = document.getElementById('fr');
  fr.contentWindow.CTRoteiro.abrir(PECA);
  await new Promise(r => setTimeout(r, 300));
  const chip = [...fr.contentDocument.querySelectorAll('.ctr .rf button')].find(b => +b.dataset.b > 0);
  chip.click();
  await new Promise(r => setTimeout(r, 300));
  return window.__log[window.__log.length - 1];
}, PECA);
ok(/legis-web/.test(a5.src) && /volta=1/.test(a5.src) && /q=/.test(a5.src), 'ACERVO ida: LEGIS com q= e volta=1');
await page.waitForTimeout(1500);
const a6 = await page.evaluate(async () => {
  const fr = document.getElementById('fr');
  const b = [...fr.contentDocument.querySelectorAll('button')].find(x => /Voltar ao ponto/.test(x.textContent || ''));
  if (!b) return { erro: 'sem pílula no iframe' };
  b.click();
  await new Promise(r => setTimeout(r, 400));
  return window.__log[window.__log.length - 1];
});
ok(a6.view === 'areamod' && /peca=/.test(a6.src) && /bloco=/.test(a6.src), 'ACERVO volta: mapa com peca+bloco');
await page.waitForTimeout(1200);
const a7 = await page.evaluate(() => {
  const d = document.getElementById('fr').contentDocument;
  const rot = d.querySelector('.ctr');
  return { aberto: rot && rot.classList.contains('on'),
           destacou: [...d.querySelectorAll('.ctr .blk')].some(b => b.classList.contains('volta')) };
});
ok(a7.aberto && a7.destacou, 'ACERVO volta reabre o painel no bloco destacado');

/* ================ ERRO VIRA REVISÃO (item 2) ================ */
await page.goto(URL0 + '/tests/harness-erros.html');
await page.waitForFunction(() => !!window.colherErros);

const err = await page.evaluate(async () => {
  const r = {};
  const limpa = () => ['errors', 'fc', 'reviews'].forEach(k => localStorage.removeItem('catedra:' + k));
  const ler = k => JSON.parse(localStorage.getItem('catedra:' + k) || '[]');

  // 1. N erradas → N erros + N flashcards (com gabarito) + 1 revisão por disciplina
  limpa();
  const lote = [
    { enunciado: 'Cabe HC contra decisão de turma recursal?', gabarito: 'Súmula 690 superada', disc: 'Processo Penal', topico: 'HC' },
    { enunciado: 'Prazo da impugnação ao cumprimento de sentença', gabarito: 'art. 525 CPC', disc: 'Processo Civil', topico: 'Cumprimento' },
    { enunciado: 'Prescrição intercorrente na execução fiscal', gabarito: 'Súmula 314 STJ', disc: 'Processo Civil', topico: 'Prescrição' },
  ];
  const a = window.colherErros(lote, 'Simulado');
  r.criouTudo = a.erros === 3 && a.cards === 3;
  r.umaRevisaoPorDisc = a.revs === 2;
  r.revisaoAmanha = ler('reviews').every(x => x.dueDate > new Date().toISOString().slice(0, 10) && x.due === 1);
  r.temIdEUp = ler('errors').every(x => x.id && x.up) && ler('fc').every(x => x.id && x.up);

  // 2. refazer a mesma prova não duplica
  const b = window.colherErros(lote, 'Simulado');
  r.dedup = b === null && ler('errors').length === 3;

  // 3. desfazer remove exatamente o lote
  limpa();
  window.colherErros(lote, 'Simulado');
  const antes = ler('errors').length + ler('fc').length + ler('reviews').length;
  window.desfazerLote();
  r.desfez = antes === 8 && ler('errors').length === 0 && ler('fc').length === 0 && ler('reviews').length === 0;

  // 4. teto de 20 por correção
  limpa();
  const c = window.colherErros(Array.from({ length: 30 }, (_, i) => ({ enunciado: 'questão ' + i, gabarito: 'g' + i, disc: 'Civil' })), 'Simulado');
  r.teto = c.erros === 20;

  // 5. canal da 2ª fase (postMessage) cai no mesmo caminho
  limpa();
  window.postMessage({ type: 'ctErrosSegundaFase', prova: 'TJ-RJ 2026 · discursiva', quesitos: [
    { titulo: 'Quesito 1 — enfrentar a preliminar de ilegitimidade', disc: 'Processo Civil', nota: 0, max: 1, fundamento: 'art. 485, VI, CPC' },
    { titulo: 'Quesito 2 — dosimetria', disc: 'Penal', nota: 0.5, max: 1, fundamento: 'art. 59 CP' },
  ] }, '*');
  await new Promise(res => setTimeout(res, 200));
  const es = ler('errors');
  r.segundaFase = es.length === 2 && es.every(x => /2ª fase — TJ-RJ/.test(x.source)) && ler('reviews').length === 2;
  limpa();
  return r;
});
for (const [k, v] of Object.entries(err)) ok(v, 'ERROS ' + k);

/* ============= EVOLUÇÃO DA REDAÇÃO (item 4) ============= */
await page.goto(URL0 + '/tests/harness-redhist.html');
await page.waitForFunction(() => !!window.redRegistrar);

const evo = await page.evaluate(() => {
  const r = {};
  const limpa = () => localStorage.removeItem('catedra:redHist');
  const ler = () => JSON.parse(localStorage.getItem('catedra:redHist') || '[]');
  const dia = 864e5;

  // duas tentativas da mesma prova → uma linha, delta por quesito
  limpa();
  window.redRegistrar({ origem: 'segunda-fase', prova: 'TJ-RJ 2026 · discursiva', ts: Date.now() - 3 * dia, notaTotal: 40,
    quesitos: [ { titulo: 'Preliminar', nota: 0, max: 1 }, { titulo: 'Mérito', nota: 1, max: 1 }, { titulo: 'Dosimetria', nota: 0.5, max: 1 } ] });
  window.redRegistrar({ origem: 'segunda-fase', prova: 'TJ-RJ 2026 · discursiva', ts: Date.now(), notaTotal: 75,
    quesitos: [ { titulo: 'Preliminar', nota: 1, max: 1 }, { titulo: 'Mérito', nota: 1, max: 1 }, { titulo: 'Dosimetria', nota: 0.5, max: 1 } ] });
  const e1 = window.redEvolucao();
  r.umaLinhaPorProva = e1.length === 1 && e1[0].tentativas === 2;
  r.curvaSubiu = e1[0].primeiroPct === 50 && e1[0].ultimoPct === 83;
  // o que menos evoluiu vem primeiro (Mérito e Dosimetria: delta 0; Preliminar: +100)
  r.piorPrimeiro = e1[0].quesitos[0].delta === 0 && e1[0].quesitos[e1[0].quesitos.length - 1].delta === 100;
  r.casaPorIndice = e1[0].quesitos.some(q => q.titulo === 'Preliminar' && q.de === 0 && q.para === 100);

  // provas diferentes não se misturam; a origem separa
  window.redRegistrar({ origem: 'redacao', prova: 'TJ-RJ 2026 · discursiva', ts: Date.now(), notaTotal: 60,
    quesitos: [{ titulo: 'Estrutura', nota: 6, max: 10 }] });
  r.origemSepara = window.redEvolucao().length === 2;

  // id + up (regra da casa: merge por id no auth.js)
  r.temIdEUp = ler().every(x => x.id && x.up && Array.isArray(x.quesitos));
  // não guarda o texto da peça
  r.semTexto = ler().every(x => !('texto' in x) && !('folha' in x));

  // sparkline: n pontos, começa em M e não estoura a caixa
  const d = window.redSpark([50, 83]);
  r.spark = /^M[\d. ]+L[\d. ]+$/.test(d) && !/-\d/.test(d);
  r.sparkVazio = window.redSpark([50]) === '';

  // canal da 2ª fase
  limpa();
  window.postMessage({ type: 'ctRedacaoResultado', prova: 'TJ-SP 2025 · sentença', notaTotal: 66,
    quesitos: [{ titulo: 'Relatório', nota: 1, max: 1 }, { titulo: 'Fundamentação', nota: 0, max: 1 }] }, '*');
  return new Promise(res => setTimeout(() => {
    const h = ler();
    r.canal = h.length === 1 && h[0].origem === 'segunda-fase' && h[0].quesitos.length === 2 && h[0].notaTotal === 66;
    limpa();
    res(r);
  }, 200));
});
for (const [k, v] of Object.entries(evo)) ok(v, 'REDHIST ' + k);

// A página REAL da 2ª fase, dirigida uma vez: ao "Salvar e sair" ela posta as duas
// mensagens — os quesitos falhos (item 2) e a nota por quesito (item 4).
await page.goto(URL0 + '/segunda-fase-web.html');
await page.waitForTimeout(700);
const pre = await page.evaluate(() => {
  const P = (window.CT_ESPELHOS || {}).provas || [];
  const alvo = P.find(p => (p.quesitos || []).length >= 2) || P[0];
  if (!alvo) return { erro: 'sem provas' };
  localStorage.setItem('catedraSegundaFase', JSON.stringify({ hist: [], sessao: {
    id: alvo.id, minutos: 300, inicio: Date.now(), acc: 60000, rodando: false,
    folha: 'texto qualquer da peça para a correção rodar', entregue: true, gasto: 60000, veredictos: {} } }));
  return { ok: true };
});
if (!pre.erro) {
  await page.goto(URL0 + '/segunda-fase-web.html');
  await page.waitForTimeout(1200);
  const duas = await page.evaluate(async () => {
    const caixa = {};
    window.addEventListener('message', e => {
      if (e.data && (e.data.type === 'ctErrosSegundaFase' || e.data.type === 'ctRedacaoResultado')) caixa[e.data.type] = e.data;
    });
    // marca dois quesitos como "não atendeu" para haver o que colher
    [...document.querySelectorAll('.q .ver button[data-v="nao"]')].slice(0, 2).forEach(b => b.click());
    const fechar = [...document.querySelectorAll('button')].find(b => /Salvar e sair/.test(b.textContent || ''));
    if (!fechar) return caixa;
    fechar.click();
    await new Promise(r => setTimeout(r, 900));
    return caixa;
  });
  const post = duas.ctErrosSegundaFase, msg = duas.ctRedacaoResultado;
  ok(!!post && Array.isArray(post.quesitos) && post.quesitos.length > 0, 'ERROS 2ª fase posta ctErrosSegundaFase ao fechar');
  ok(!!post && !!post.prova, 'ERROS 2ª fase manda o rótulo da prova');
  ok(!!msg && Array.isArray(msg.quesitos) && msg.quesitos.length >= 2, 'REDHIST 2ª fase posta ctRedacaoResultado');
  ok(!!msg && msg.quesitos.every(q => q.max === 1 && q.nota >= 0 && q.nota <= 1), 'REDHIST notas por quesito normalizadas');
  ok(!!msg && !JSON.stringify(msg).includes('texto qualquer da peça'), 'REDHIST não manda o texto da peça');
}

await browser.close();
srv.close();
console.log(falhas.length ? ('\nFALHAS: ' + falhas.length) : '\nTODOS OS TESTES PASSARAM');
process.exit(falhas.length ? 1 : 0);
