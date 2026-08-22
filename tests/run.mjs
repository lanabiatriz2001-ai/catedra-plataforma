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

/* ============= ONDE ESTOU FRACA (item 1) ============= */
await page.goto(URL0 + '/tests/harness-prioridade.html');
await page.waitForFunction(() => !!window.CT_PRIORIDADE_CALC);

const prio = await page.evaluate(() => {
  const { prioridadeDisciplinas, PESOS } = window.CT_PRIORIDADE_CALC;
  const hoje = '2026-08-22';
  const dia = 864e5, hojeMs = Date.parse(hoje + 'T00:00:00Z');
  const r = {};

  const base = {
    hoje,
    edital: [{ disc: 'Direito Processual Penal', peso: 2 }, { disc: 'Direito Civil', peso: 1 }],
    errors: [], reviews: [],
    sessions: [
      { disc: 'Direito Processual Penal', date: '2026-08-21', questoes: 20, acertos: 15, erradas: 5 },
      { disc: 'Direito Civil', date: '2026-08-21', questoes: 20, acertos: 15, erradas: 5 }
    ]
  };

  // pesos somam 1 e estão num lugar só
  r.pesosSomam1 = Math.abs(Object.values(PESOS).reduce((a, b) => a + b, 0) - 1) < 1e-9;

  // mais erros → sobe
  const comErros = prioridadeDisciplinas({ ...base,
    errors: [1, 2, 3].map(i => ({ disc: 'Direito Civil', ts: hojeMs - i * dia })) });
  r.errosSobem = comErros[0].disc === 'Direito Civil';

  // erro fora da janela de 30 dias não conta
  const errosVelhos = prioridadeDisciplinas({ ...base,
    errors: [1, 2, 3].map(i => ({ disc: 'Direito Civil', ts: hojeMs - (40 + i) * dia })) });
  r.janela30 = errosVelhos[0].disc !== 'Direito Civil' || errosVelhos[0].nota === errosVelhos[1].nota;

  // revisões vencidas sobem; revisar (dueDate no futuro) desce
  const vencidas = prioridadeDisciplinas({ ...base, reviews: [
    { disc: 'Direito Civil', dueDate: '2026-08-10' }, { disc: 'Direito Civil', dueDate: '2026-08-12' }] });
  const revisou = prioridadeDisciplinas({ ...base, reviews: [
    { disc: 'Direito Civil', dueDate: '2026-09-10' }, { disc: 'Direito Civil', dueDate: '2026-09-12' }] });
  const notaDe = (lista, d) => lista.find(x => x.disc === d).nota;
  r.revisoesSobem = notaDe(vencidas, 'Direito Civil') > notaDe(revisou, 'Direito Civil');
  r.revisarDesce = notaDe(revisou, 'Direito Civil') < notaDe(vencidas, 'Direito Civil');

  // tempo sem estudar pesa; nunca estudada é o máximo do fator
  const parada = prioridadeDisciplinas({ ...base,
    sessions: [{ disc: 'Direito Processual Penal', date: '2026-08-21', questoes: 20, acertos: 15, erradas: 5 }] });
  r.nuncaEstudada = parada[0].disc === 'Direito Civil' && parada[0].diasSem === null;

  // desempenho: amostra pequena não vira sinal
  const poucas = prioridadeDisciplinas({ ...base,
    sessions: [{ disc: 'Direito Civil', date: '2026-08-21', questoes: 3, acertos: 0, erradas: 3 },
               { disc: 'Direito Processual Penal', date: '2026-08-21', questoes: 20, acertos: 15, erradas: 5 }] });
  r.amostraMinima = poucas.find(x => x.disc === 'Direito Civil').liqPct === null;

  // nome com caixa/acento diferente casa (strings livres no app)
  const acento = prioridadeDisciplinas({ ...base,
    errors: [{ disc: '  direito civil  ', ts: hojeMs - dia }] });
  r.normalizaNome = acento.find(x => x.disc === 'Direito Civil').erros30 === 1;

  // sem dado nenhum: marca semDados (a tela explica em vez de mostrar zeros)
  const vazio = prioridadeDisciplinas({ hoje, edital: [{ disc: 'Direito Civil' }], errors: [], reviews: [], sessions: [] });
  r.semDados = vazio.length === 1 && vazio[0].semDados === true;
  r.semEdital = prioridadeDisciplinas({ hoje, edital: [] }).length === 0;

  // cada cartão explica o porquê
  r.temMotivos = comErros[0].motivos.length > 0 && comErros[0].fatores.length === 5;
  r.notaLimitada = comErros.every(x => x.nota >= 0 && x.nota <= 100);
  return r;
});
for (const [k, v] of Object.entries(prio)) ok(v, 'PRIORIDADE ' + k);

await browser.close();
srv.close();
console.log(falhas.length ? ('\nFALHAS: ' + falhas.length) : '\nTODOS OS TESTES PASSARAM');
process.exit(falhas.length ? 1 : 0);
