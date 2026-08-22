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

/* ============= D9 — BUILD SEM CDN: FALHAR EM VEZ DE DEGRADAR ============= */
// Este é o único teste que não usa navegador: o que se prova aqui é o comportamento do
// processo de build. Um deploy que depende de CDN em runtime não abre em rede que
// bloqueia CDN — foi o que aconteceu no ambiente de teste.
{
  const { execFileSync } = await import('child_process');
  const stub = path.join(RAIZ, 'tests', 'offline-stub.cjs');
  const rodar = (env) => {
    try {
      execFileSync(process.execPath, [path.join(RAIZ, 'scripts', 'build.mjs')],
        { cwd: RAIZ, env: { ...process.env, ...env }, stdio: 'pipe' });
      return { code: 0, saida: '' };
    } catch (e) {
      return { code: e.status ?? 1, saida: String(e.stdout || '') + String(e.stderr || '') };
    }
  };

  const semRede = rodar({ NODE_OPTIONS: '--require ' + stub, CT_PERMITE_CDN: '' });
  ok(semRede.code === 1, 'D9 build sem rede FALHA (exit 1) em vez de publicar dependendo de CDN');
  ok(/BUILD ABORTADO/.test(semRede.saida), 'D9 a falha explica o que houve');
  ok(/CT_PERMITE_CDN/.test(semRede.saida), 'D9 a falha diz qual é a saída de emergência');

  const comFlag = rodar({ NODE_OPTIONS: '--require ' + stub, CT_PERMITE_CDN: '1' });
  ok(comFlag.code === 0, 'D9 CT_PERMITE_CDN=1 ainda permite build degradado (debug)');

  // build normal: nada de terceiro sobra no HTML publicado
  const normal = rodar({});
  ok(normal.code === 0, 'D9 build com rede passa');
  const html = fs.readFileSync(path.join(RAIZ, 'public', 'index.html'), 'utf8');
  const terceiros = (html.match(/(?:src|href)="https:\/\/[^"]*(?:jsdelivr|unpkg|fonts\.googleapis|fonts\.gstatic)[^"]*"/g) || []);
  ok(terceiros.length === 0, 'D9 HTML publicado não carrega nada de CDN nem do Google Fonts');
  ok(/href="\.\/fonts\.css"/.test(html), 'D9 as fontes vêm do próprio domínio');
  const cssFontes = fs.readFileSync(path.join(RAIZ, 'public', 'fonts.css'), 'utf8');
  ok(/font-display:\s*swap/.test(cssFontes), 'D9 font-display:swap preservado');
  ok(!/fonts\.gstatic\.com/.test(cssFontes), 'D9 o CSS das fontes aponta para arquivos locais');
  ok(fs.readdirSync(path.join(RAIZ, 'public', 'fonts')).length > 10, 'D9 os .woff2 estão no deploy');
}


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
/* ============= BUSCA ÚNICA NO ⌘K (item 6) ============= */
await page.goto(URL0 + '/tests/harness-busca.html');
await page.waitForFunction(() => !!window.__IDX);

const bu = await page.evaluate(() => {
  const B = window.CT_BUSCA, IDX = window.__IDX, r = {};
  const t = (q, tipo) => (B.buscar(IDX, q)[tipo][0] || {}).titulo || null;

  r.indexou = IDX.length > 300 && IDX.some(x => x.tipo === 'lei') && IDX.some(x => x.tipo === 'peca') && IDX.some(x => x.tipo === 'rito');

  // acervo: lei, jurisprudência, peça e rito no mesmo campo
  r.achaLei = t('improbidade', 'lei') === 'Lei de Improbidade Administrativa';
  r.achaSumula = /Súmula 619/.test(t('súmula 619', 'verbete') || '');
  r.achaPeca = /Senten/.test(t('sentença', 'peca') || '');
  r.achaRito = /júri/i.test(t('júri', 'rito') || '');

  // sigla é como se procura lei na prática — e vale SÓ para lei
  r.sigla = t('cpc', 'lei') === 'Código de Processo Civil' && t('ctn', 'lei') === 'Código Tributário Nacional';
  r.siglaCF = t('cf', 'lei') === 'Constituição Federal';           // não pode ser "Código Florestal"
  r.siglaNaoVazaProVerbete = B.buscar(IDX, 'cpc').verbete.every(v => /cpc|processo civil/i.test(B.normalizar(v.titulo + ' ' + v.extra)));

  // número da lei (a referência é buscável)
  r.numeroDaLei = t('8.429', 'lei') === 'Lei de Improbidade Administrativa';

  // acento e caixa não importam
  r.semAcento = t('sentenca', 'peca') === t('sentença', 'peca') && t('JÚRI', 'rito') === t('júri', 'rito');

  // prefixo ganha de pedaço no meio
  r.ranking = B.pontuar('codigo de processo civil', 'codigo') === 3
    && B.pontuar('codigo de processo civil', 'processo') === 2
    && B.pontuar('codigo de processo civil', 'rocess') === 1;

  // repetido no acervo aparece uma vez só — MAS súmula homônima de tribunais diferentes
  // são duas coisas: a chave inclui o extra (tribunal · situação)
  r.dedup = B.buscar(IDX, 'súmula 619').verbete.length === 1;
  const doisTribunais = B.indexar({ verbetes: [
    ['A', 'STF', 'sumula_stf', 619, 'Súmula 619', 'Constitucional', 'x', null, 'Revogada', 0],
    ['B', 'STJ', 'sumula_stj', 619, 'Súmula 619', 'Administrativo', 'y', null, null, 1]] });
  const d2 = B.buscar(doisTribunais, 'súmula 619').verbete;
  r.homonimasSeparadas = d2.length === 2;
  r.revogadaPorUltimo = d2[0].extra.includes('STJ') && /Revogada/.test(d2[1].extra);

  // teto por tipo e piso de 2 letras
  r.teto = B.buscar(IDX, 'lei', { porTipo: 3 }).lei.length <= 3;
  r.pisoDuasLetras = B.buscar(IDX, 'l').lei.length === 0;

  // o índice monta rápido o bastante para caber na primeira tecla
  r.rapido = window.__idxPronto < 400;
  const t0 = performance.now(); B.buscar(IDX, 'sentença'); r.buscaRapida = (performance.now() - t0) < 150;
  return r;
});
for (const [k, v] of Object.entries(bu)) ok(v, 'BUSCA ' + k);

// o app não carrega os acervos da paleta no boot (juris-index.js tem 2,4 MB)
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1500);
const boot = await page.evaluate(() => ({
  motor: !!window.CT_BUSCA,            // o motor é leve e vem junto
  juris: !!window.__JURIS_IDX__,       // o acervo NÃO
  cat: !!window.CT_LEIS_CAT,
}));
ok(boot.motor, 'BUSCA motor carrega no boot');
ok(!boot.juris && !boot.cat, 'BUSCA acervos NÃO carregam no boot (só na 1ª busca)');
/* ======= O QUE MUDOU ESTA SEMANA (item 7) ======= */
await page.goto(URL0 + '/tests/harness-semana.html');
await page.waitForFunction(() => !!window.CT_SEMANA);

const sem = await page.evaluate(() => {
  const S = window.CT_SEMANA, r = {};
  const it = S.itens || [];
  r.temItens = it.length >= 10;
  r.camposCompletos = it.every(x => x.id && x.titulo && x.tese && x.quando && x.tribunal);
  r.soInformativos = it.every(x => /STF|STJ|TSE/.test(x.tribunal));
  r.dataValida = it.every(x => /^\d{2}\/\d{2}\/\d{4}$/.test(x.quando));
  // marcador é opcional, mas quando existe tem de ser um dos três
  r.marcadorValido = it.every(x => x.marcador == null || ['superacao', 'divergencia', 'vinculante'].includes(x.marcador));
  // os marcados vêm primeiro (é o que muda o estudo)
  const iPrimeiroSem = it.findIndex(x => !x.marcador);
  const iUltimoCom = it.map((x, i) => x.marcador ? i : -1).filter(i => i >= 0).pop();
  r.marcadosPrimeiro = (iUltimoCom == null) || (iPrimeiroSem === -1) || (iUltimoCom < iPrimeiroSem);
  // a tese é recorte curto: o arquivo não pode virar um segundo acervo
  r.teseCurta = it.every(x => x.tese.length <= 340);
  r.arquivoLeve = JSON.stringify(S).length < 120000;
  // sem tese repetida (o acervo republica o mesmo julgado em edição extraordinária)
  const teses = it.map(x => x.tese.toLowerCase().replace(/\s+/g, ' ').slice(0, 160));
  r.semRepetida = new Set(teses).size === teses.length;
  // marcador vem calibrado: alguma coisa TEM de estar marcada, senão o bloco perde a graça
  r.temAlgumMarcado = it.some(x => x.marcador);

  // ordenado do mais novo para o mais velho dentro de cada grupo
  const ms = s => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s); return new Date(+m[3], +m[2] - 1, +m[1]).getTime(); };
  const semMarc = it.filter(x => !x.marcador).map(x => ms(x.quando));
  r.ordenado = semMarc.every((v, i) => i === 0 || semMarc[i - 1] >= v);
  return r;
});
for (const [k, v] of Object.entries(sem)) ok(v, 'SEMANA ' + k);

// a home mostra o bloco, e "Já vi" tira o item e persiste
await page.goto(URL0 + '/Catedra.dc.html');
await page.evaluate(() => { localStorage.removeItem('catedra:semanaLidos'); });
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1800);
const home = await page.evaluate(async () => {
  const tit = [...document.querySelectorAll('h2')].find(h => /mudou esta semana/i.test(h.textContent || ''));
  if (!tit) return { erro: 'sem bloco' };
  const cont = tit.closest('.cth-sec').nextElementSibling;
  const antes = [...cont.children].filter(e => e.tagName === 'DIV').length;
  const b = cont.querySelector('button[data-id]');
  const id = b && b.dataset.id;
  if (b) b.click();
  await new Promise(r => setTimeout(r, 500));
  return { antes, id, lidos: JSON.parse(localStorage.getItem('catedra:semanaLidos') || '[]') };
});
ok(!home.erro && home.antes > 0, 'SEMANA bloco aparece na home com itens');
ok(!home.erro && home.lidos.includes(home.id), 'SEMANA "Já vi" registra e persiste (sincroniza)');
/* ============= PROVA ORAL — MODO ARGUIÇÃO (item 3) ============= */
await page.goto(URL0 + '/tests/harness-arguicao.html');
await page.waitForFunction(() => !!window.CT_ORAL_Q && !!window.argPool);

const arg = await page.evaluate(() => {
  const r = {};
  const Q = window.CT_ORAL_Q;
  r.acervo = Q.length > 900;

  // só entra pergunta com padrão de resposta útil — é ele que corrige
  const pool = window.argPool({ areaEstudo: 'juridica' });
  r.soComPadrao = pool.every(q => q.padrao && q.padrao.length > 200);

  // o sorteio respeita a ÁREA: quem estuda magistratura não recebe pergunta de fotônica
  const carrJur = ['Magistratura Estadual', 'Ministério Público', 'Defensoria Pública', 'Advocacia Pública'];
  r.poolDaArea = pool.length >= 100 && pool.every(q => carrJur.includes(q.carreira));
  const poolPol = window.argPool({ areaEstudo: 'policial' });
  r.areaPolicial = poolPol.length > 0 && poolPol.every(q => ['Polícia Civil', 'Polícia Federal', 'Perícia'].includes(q.carreira));

  // filtro escolhido à mão manda mais que a área
  const escolhido = window.argPool({ areaEstudo: 'juridica', oralQCarr: 'Polícia Civil' });
  r.filtroManda = escolhido.length > 0 && escolhido.every(q => q.carreira === 'Polícia Civil');

  // sessão de 5 sem repetir pergunta. Atenção: `id` no acervo é do DOCUMENTO (o malote),
  // não da questão — 417 perguntas jurídicas compartilham 190 ids. O que identifica a
  // pergunta é o enunciado, e ele é único nas 892.
  const fila = window.argSortear({ areaEstudo: 'juridica' }, 5);
  r.cinco = fila.length === 5 && new Set(fila.map(q => q.enunciado)).size === 5;
  r.enunciadoEhAChave = new Set(pool.map(q => q.enunciado)).size === pool.length;

  // o carimbo de controle do CEBRASPE não pode aparecer na tela
  const sujos = Q.filter(q => /<<[^>]{4,80}>>/.test(q.enunciado || ''));
  r.temSujos = sujos.length > 0;
  r.limpa = sujos.every(q => !/<</.test(window.argLimpa(q.enunciado)) && window.argLimpa(q.enunciado).length > 40);
  return r;
});
for (const [k, v] of Object.entries(arg)) ok(v, 'ARGUICAO ' + k);

// a sessão roda de ponta a ponta na tela: pergunta → padrão só depois → autoavaliação → resumo
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1600);
const fluxo = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const M = () => document.querySelector('main').innerText;
  document.querySelector('button[data-view="oral"]').click(); await w(400);
  const bm = [...document.querySelectorAll('button')].find(b => b.dataset.m === 'bancas');
  if (bm) bm.click(); await w(2500);
  const cartao = [...document.querySelectorAll('main div')].find(d => /^Modo arguição/.test(d.textContent.trim()));
  if (!cartao) return { erro: 'sem cartão de arguição' };
  const comecar = [...cartao.closest('div[style*="surface2"]').querySelectorAll('button')].find(b => b.textContent.trim() === 'Começar');
  comecar.click(); await w(1000);
  const abriu = /ARGUIÇÃO · PERGUNTA 1 DE 5|Arguição · pergunta 1 de 5/i.test(M());
  // sinal exato: os botões de autoavaliação só existem DENTRO do bloco do padrão — o texto
  // "padrão de resposta" também aparece na apresentação da página, e enganava o teste
  const temPadrao = () => !!document.querySelector('main button[data-v="bem"]');
  const padraoAntes = temPadrao();
  [...document.querySelectorAll('main button')].find(b => /Respondi — ver o padrão/.test(b.textContent || '')).click(); await w(500);
  const padraoDepois = temPadrao();
  for (let i = 0; i < 5; i++) {
    const ver = [...document.querySelectorAll('main button')].find(b => /Respondi — ver o padrão/.test(b.textContent || ''));
    if (ver) { ver.click(); await w(350); }
    const b = [...document.querySelectorAll('main button')].find(x => x.dataset.v === 'nao');
    if (!b) break;
    b.click(); await w(500);
  }
  const fim = /Fim da arguição/.test(M());
  const erros = JSON.parse(localStorage.getItem('catedra:errors') || '[]');
  return { abriu, padraoAntes, padraoDepois, fim, errosCriados: erros.length };
});
ok(!fluxo.erro && fluxo.abriu, 'ARGUICAO sessão abre com a pergunta');
ok(!fluxo.erro && !fluxo.padraoAntes && fluxo.padraoDepois, 'ARGUICAO padrão só aparece depois de responder');
ok(!fluxo.erro && fluxo.fim, 'ARGUICAO cinco perguntas levam ao resumo');

/* ============= U5 — SINCRONIZAÇÃO VISÍVEL E HONESTA ============= */
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1600);
const u5 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const aside = () => document.querySelector('aside');
  const selo = () => [...aside().querySelectorAll('span')].map(s => s.textContent.trim())
    .find(t => /salvo|enviando|conexão|erro|não consegui/i.test(t)) || '';
  const botao = () => [...aside().querySelectorAll('button')].find(b => /tentar agora/i.test(b.textContent || ''));
  const emitir = st => window.dispatchEvent(new CustomEvent('catedra:syncstate', { detail: { status: st } }));
  const r = {};

  r.permanente = !!selo();                       // existe sem nenhum evento: é selo, não toast

  emitir('enviando'); await w(250); r.enviando = /enviando/i.test(selo());
  emitir('offline');  await w(250);
  r.offline = /sem conexão/i.test(selo()) && /guardado aqui/i.test(selo());   // diz onde os dados estão
  emitir('salvo');    await w(250);
  r.salvoComHora = /^✓ salvo às \d{2}:\d{2}$/.test(selo());
  emitir('erro');     await w(250);
  r.erroCurto = /tentando de novo/i.test(selo());
  r.semBotaoNoErroCurto = !botao();               // erro que acabou de começar não vira alarme

  // erro que PERSISTE (mais de 5 min) vira aviso com ação
  const orig = Date.now; let delta = 0; Date.now = () => orig() + delta;
  emitir('erro'); await w(200); delta = 6 * 60000; emitir('erro'); await w(300);
  r.erroLongo = /não consegui salvar/i.test(selo());
  r.temAcao = !!botao();
  if (botao()) botao().click();                   // não pode explodir sem CatedraSync
  await w(200);
  r.naoTravou = document.querySelectorAll('aside button').length > 0;
  Date.now = orig;

  // voltar a salvar limpa o alarme
  emitir('salvo'); await w(250);
  r.recupera = /✓ salvo/i.test(selo()) && !botao();
  return r;
});
for (const [k, v] of Object.entries(u5)) ok(v, 'U5 ' + k);
/* ============= U6 — DESFAZER EM VEZ DE CONFIRMAR ============= */
await page.goto(URL0 + '/Catedra.dc.html');
await page.evaluate(() => {
  localStorage.setItem('catedra:metas', JSON.stringify([{ id: 'm-u6', titulo: 'Meta de teste', prog: 0, alvo: 10, unidade: 'un.' }]));
  localStorage.setItem('catedra:sessions', JSON.stringify([{ id: 's-u6', ts: Date.now(), date: new Date().toISOString().slice(0, 10),
    disc: 'Direito Civil', topico: 'Teste U6', categoria: 'Teoria', min: 30, questoes: 10, acertos: 8, erradas: 2, brancos: 0, liquido: 6 }]));
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1800);

const u6 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const ler = k => JSON.parse(localStorage.getItem('catedra:' + k) || '[]');
  const r = {};
  let confirmou = false;
  window.confirm = () => { confirmou = true; return true; };

  // vai para Metas & Conquistas
  const mais = document.querySelector('button[aria-label="Mostrar mais opções"]');
  if (mais) mais.click(); await w(350);
  document.querySelector('button[data-view="conquistas"]').click(); await w(700);

  const botaoX = () => [...document.querySelectorAll('main button[data-id="m-u6"]')].find(b => (b.textContent || '').trim() === '×');
  if (!botaoX()) return { erro: 'sem botão de excluir a meta' };
  botaoX().click();
  await w(300);

  r.semConfirm = !confirmou;                                   // excluir 1 item não pede permissão
  r.sumiuDaTela = !document.querySelector('main button[data-id="m-u6"]');
  const toast = document.querySelector('div[role=status]');
  r.temToast = !!toast && /excluíd/i.test(toast.textContent || '');
  const undo = toast && [...toast.querySelectorAll('button')].find(b => /desfazer/i.test(b.textContent || ''));
  r.temDesfazer = !!undo;

  if (undo) undo.click();
  await w(900);
  const metas = ler('metas');
  r.restauraMesmoId = metas.length === 1 && metas[0].id === 'm-u6' && metas[0].titulo === 'Meta de teste';
  r.carimboNovo = !!(metas[0] && metas[0].up);                 // `up` novo faz a recriação vencer a lápide

  // sem desfazer, a exclusão persiste no disco (o autosave leva ~1s)
  botaoX().click();
  await w(1600);
  r.persisteSemDesfazer = ler('metas').length === 0;
  return r;
});
for (const [k, v] of Object.entries(u6)) ok(v, 'U6 ' + k);

// o destrutivo em MASSA continua pedindo confirmação — é a fronteira da especificação
const u6b = await page.evaluate(() => {
  const fonte = [...document.querySelectorAll('script')].map(s => s.textContent || '').find(t => t.includes('wipeAll')) || '';
  return {
    wipeAllPergunta: /wipeAll\s*=\s*\(\)=>\{\s*if\(!window\.confirm/.test(fonte),
    itemNaoPergunta: !/removeMeta[^}]*window\.confirm/.test(fonte) && !/removeCard[^}]*window\.confirm/.test(fonte)
      && !/removeErro[^}]*window\.confirm/.test(fonte) && !/removeEvent[^}]*window\.confirm/.test(fonte),
  };
});
ok(u6b.wipeAllPergunta, 'U6 apagar tudo continua pedindo confirmação');
ok(u6b.itemNaoPergunta, 'U6 exclusão de item não pede mais confirmação');
/* ============= D1 — TEMA ÚNICO NOS SATÉLITES ============= */
// Todo satélite carrega a mesma ponte
const d1arqs = await page.evaluate(async (base) => {
  const paginas = ['legis-web.html', 'juris-web.html', 'ritos-web.html', 'pecas-web.html',
                   'segunda-fase-web.html', 'prioridade-web.html', 'area-web.html'];
  const r = {};
  for (const p of paginas) {
    const t = await (await fetch(base + '/' + p)).text();
    r[p] = t.includes('tema-satelite.js');
  }
  return r;
}, URL0);
ok(Object.values(d1arqs).every(Boolean), 'D1 os 7 satélites carregam a ponte de tema (' +
   Object.entries(d1arqs).filter(([, v]) => !v).map(([k]) => k).join(', ') + ')');

// Satélite avulso (sem host) mantém a paleta própria — o fallback do var() continua valendo
await page.goto(URL0 + '/ritos-web.html');
await page.waitForTimeout(700);
const avulso = await page.evaluate(() => ({
  marcado: document.documentElement.getAttribute('data-ct-tema'),
  accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
}));
ok(!avulso.marcado, 'D1 página avulsa não é pintada pelo host (segue com a cara própria)');

// Dentro do app: o satélite herda cor e fundo, e a troca de cor atravessa
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1700);
const d1 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const r = {};
  const btn = document.querySelector('button[data-view="areamod"]');
  if (!btn) return { erro: 'sem satélite nesta área' };
  btn.click(); await w(2400);
  const frame = () => [...document.querySelectorAll('iframe')].find(f => /ritos-web/.test(f.getAttribute('src') || ''));
  if (!frame()) return { erro: 'iframe não montou' };
  const dentro = () => { const d = frame().contentDocument;
    const cs = d.defaultView.getComputedStyle(d.documentElement);
    return { accent: cs.getPropertyValue('--accent').trim(), bg: cs.getPropertyValue('--bg').trim(),
             marcado: d.documentElement.getAttribute('data-ct-tema'), esquema: d.documentElement.style.colorScheme }; };
  const host = getComputedStyle(document.querySelector('[style*="--accent"]'));
  const a = dentro();
  r.herdaCor = a.accent === host.getPropertyValue('--accent').trim() && !!a.accent;
  r.herdaFundo = a.bg === host.getPropertyValue('--bg').trim() && !!a.bg;
  r.marcado = a.marcado === '1';

  // trocar a cor de destaque atravessa até o satélite
  const mais = document.querySelector('button[aria-label="Mostrar mais opções"]');
  if (mais) mais.click(); await w(300);
  document.querySelector('button[data-view="ajustes"]').click(); await w(700);
  const cores = [...document.querySelectorAll('main button[data-c]')];
  const alvo = cores.find(c => c.dataset.c && c.dataset.c !== a.accent);
  if (!alvo) return { ...r, erro: 'sem paleta de cores nos Ajustes' };
  const nova = alvo.dataset.c;
  alvo.click(); await w(500);
  document.querySelector('button[data-view="areamod"]').click(); await w(2200);
  r.trocaDeCorAtravessa = frame() && dentro().accent === nova;
  return r;
});
if (!d1.erro) {
  ok(d1.herdaCor, 'D1 satélite herda a cor de destaque do host');
  ok(d1.herdaFundo, 'D1 satélite herda o fundo (modo escuro deixa de piscar branco)');
  ok(d1.marcado, 'D1 satélite se marca como tematizado');
  ok(d1.trocaDeCorAtravessa, 'D1 trocar a cor nos Ajustes muda o satélite');
} else {
  ok(false, 'D1 não deu para exercitar o satélite: ' + d1.erro);
}
/* ============= U3 — CONTINUAR DE ONDE PAREI ============= */
// atenção: o rótulo do cartão é maiúsculo por CSS — comparar sem diferenciar caixa
await page.goto(URL0 + '/Catedra.dc.html');
await page.evaluate(() => {
  ['catedra:lastPonto', 'catedra:lastPontoDispensado', 'ct_prova'].forEach(k => localStorage.removeItem(k));
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1600);

const u3a = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const tem = () => /continuar de onde parei/i.test(document.querySelector('main').innerText);
  const r = {};
  r.semPontoNaoMostra = !tem();                       // app novo não inventa cartão

  // visitar um satélite grava o ponto
  document.querySelector('button[data-view="areamod"]').click(); await w(1500);
  const p = JSON.parse(localStorage.getItem('catedra:lastPonto') || 'null');
  r.gravaPonto = !!p && p.view === 'areamod' && !!p.rotulo && typeof p.ts === 'number';

  // estando NA view do ponto, o cartão não aparece (seria conselho para ficar onde já está)
  r.naViewNaoMostra = !tem();

  document.querySelector('button[data-view="inicio"]').click(); await w(700);
  r.mostraNoInicio = tem();
  return r;
});
for (const [k, v] of Object.entries(u3a)) ok(v, 'U3 ' + k);

// ponto com rito reabre no ponto exato
await page.evaluate(() => {
  localStorage.setItem('catedra:lastPonto', JSON.stringify({ view: 'areamod', rito: 'Civil — conhecimento',
    peca: '', bloco: null, termo: '', rotulo: 'Processo e peças — Civil — conhecimento', ts: Date.now() - 2 * 3600e3 }));
  localStorage.setItem('catedra:lastPontoDispensado', '0');
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1700);
const u3b = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const M = () => document.querySelector('main').innerText;
  const r = {};
  r.idadeRelativa = /há 2h/.test(M());                // ts em ms vira idade legível
  const btn = [...document.querySelectorAll('main button')].find(b => /^Continuar$/i.test((b.textContent || '').trim()));
  if (!btn) return { ...r, erro: 'sem botão Continuar' };
  btn.click(); await w(2200);
  const fr = [...document.querySelectorAll('iframe')].find(f => /ritos-web/.test(f.getAttribute('src') || ''));
  r.reabreNoPonto = !!fr && /rito=Civil/.test(decodeURIComponent(fr.getAttribute('src') || ''));

  document.querySelector('button[data-view="inicio"]').click(); await w(700);
  const x = [...document.querySelectorAll('main button')].find(b => (b.textContent || '').trim() === '✕');
  r.temDispensar = !!x;
  if (x) { x.click(); await w(600); }
  r.dispensaSome = !/continuar de onde parei/i.test(M());
  r.dispensaPersiste = +(localStorage.getItem('catedra:lastPontoDispensado') || '0') > 0;
  return r;
});
if (!u3b.erro) { for (const [k, v] of Object.entries(u3b)) ok(v, 'U3 ' + k); }
else ok(false, 'U3 ' + u3b.erro);

// O app já reabre a prova pausada em TELA CHEIA no boot (_restoreProva consome ct_prova),
// e descarta prova de outro dia de propósito: por isso o cartão NÃO trata simulado — seria
// um botão que nunca aparece. Este teste guarda a decisão.
await page.evaluate(() => {
  localStorage.setItem('ct_prova', JSON.stringify({ d: new Date().toISOString().slice(0, 10), min: 60, sec: 1800 }));
  localStorage.removeItem('catedra:lastPonto');
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1700);
const u3c = await page.evaluate(() => ({
  consumiuAChave: !localStorage.getItem('ct_prova'),
  semCartaoDeProva: !/simulado cronometrado pausado/i.test(document.querySelector('main').innerText),
}));
ok(u3c.consumiuAChave, 'U3 a prova pausada é retomada pelo app (a chave é consumida no boot)');
ok(u3c.semCartaoDeProva, 'U3 o cartão não duplica a retomada da prova');
await page.evaluate(() => { ['catedra:lastPonto', 'catedra:lastPontoDispensado', 'ct_prova'].forEach(k => localStorage.removeItem(k)); });
/* ============= U1 — IFRAMES VIVOS ============= */
await page.goto(URL0 + '/Catedra.dc.html');
await page.evaluate(() => ['catedra:lastPonto', 'catedra:lastPontoDispensado', 'ct_prova'].forEach(k => localStorage.removeItem(k)));
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1700);

const u1 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const fr = v => document.querySelector('iframe[data-ct-view="' + v + '"]');
  const r = {};

  // os seis existem no DOM, mas SEM src: quem nunca abriu o LEGIS não paga por ele
  // (eram quatro até o D2 devolver 2ª fase e Prioridade ao template)
  const todos = [...document.querySelectorAll('iframe[data-ct-view]')];
  r.seisMontados = todos.length === 6;
  r.nenhumCarregaNoBoot = todos.every(f => !f.getAttribute('src'));
  r.todosEscondidos = todos.every(f => f.style.display === 'none');

  // abrir a tela carrega SÓ o dela
  document.querySelector('button[data-view="areamod"]').click(); await w(1800);
  r.carregaSoOAtual = !!fr('areamod').getAttribute('src')
    && !fr('legis').getAttribute('src') && !fr('juris').getAttribute('src');
  r.visivel = fr('areamod').style.display === 'block';

  // o src NÃO leva mais o ponto/busca: fica IGUAL entre idas e vindas (é o que "estável"
  // quer dizer) — o embed=1 do D2 faz parte da base e também não muda
  const src1 = fr('areamod').getAttribute('src');
  r.srcSemPonto = !/rito=|peca=|bloco=|[?&]q=/.test(src1 || '');
  document.querySelector('button[data-view="inicio"]').click(); await w(400);
  document.querySelector('button[data-view="areamod"]').click(); await w(600);
  r.srcEstavel = fr('areamod').getAttribute('src') === src1;

  // sair e voltar NÃO recarrega (a marca sobrevive) — é o coração do U1
  try { fr('areamod').contentWindow.__u1 = 42; } catch (e) {}
  document.querySelector('button[data-view="inicio"]').click(); await w(500);
  r.escondeAoSair = fr('areamod').style.display === 'none';
  document.querySelector('button[data-view="areamod"]').click(); await w(800);
  let vivo = false; try { vivo = fr('areamod').contentWindow.__u1 === 42; } catch (e) {}
  r.naoRecarregaAoVoltar = vivo;
  return r;
});
for (const [k, v] of Object.entries(u1)) ok(v, 'U1 ' + k);

// ida e volta com os iframes vivos: busca aplicada, pílula acesa, e o LEGIS sobrevive
const u1b = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const fr = v => document.querySelector('iframe[data-ct-view="' + v + '"]');
  const r = {};
  const d = fr('areamod').contentDocument;
  const chip = d.querySelector('#fluxo [data-legis]') || d.querySelector('#fluxo [data-juris]');
  if (!chip) return { erro: 'sem chip no fluxo' };
  chip.click(); await w(1800);
  const legis = fr('legis');
  try {
    const ld = legis.contentDocument;
    r.buscaChegou = !!(ld.getElementById('cq') || {}).value;
    r.pilulaAcesa = !!ld.getElementById('ct-volta');
    legis.contentWindow.__u1legis = 7;
    ld.getElementById('ct-volta').click();
  } catch (e) { return { erro: String(e).slice(0, 80) }; }
  await w(1500);
  r.voltouAoMapa = fr('areamod').style.display === 'block';
  let vivo = false; try { vivo = legis.contentWindow.__u1legis === 7; } catch (e) {}
  r.legisContinuaVivo = vivo;      // antes, voltar destruía a página do acervo

  // segunda ida: agora o LEGIS já está montado, então a busca vai por MENSAGEM
  const chip2 = fr('areamod').contentDocument.querySelector('#fluxo [data-legis]');
  if (chip2) { chip2.click(); await w(1200); }
  let vivo2 = false, termo2 = '';
  try { vivo2 = legis.contentWindow.__u1legis === 7; termo2 = (legis.contentDocument.getElementById('cq') || {}).value; } catch (e) {}
  r.segundaIdaSemRecarregar = vivo2;
  r.segundaIdaAplicaBusca = !!termo2;
  return r;
});
if (!u1b.erro) { for (const [k, v] of Object.entries(u1b)) ok(v, 'U1 ' + k); }
else ok(false, 'U1 ida-e-volta: ' + u1b.erro);

/* ============= D2 — MODO EMBUTIDO (?embed=1) ============= */
const d2 = await page.evaluate(async (base) => {
  const paginas = ['legis-web.html', 'juris-web.html', 'ritos-web.html', 'pecas-web.html',
                   'segunda-fase-web.html', 'prioridade-web.html', 'area-web.html'];
  const r = { semParametro: {}, comParametro: {} };
  for (const p of paginas) {
    const t = await (await fetch(base + '/' + p)).text();
    r.semParametro[p] = t.includes('tema-satelite.js');   // a ponte é quem aplica o embed
  }
  return r;
}, URL0);
ok(Object.values(d2.semParametro).every(Boolean), 'D2 os 7 satélites carregam a ponte que aplica o embed');

// a página avulsa mantém o cabeçalho inteiro; com ?embed=1 ele encolhe
for (const pag of ['legis-web.html', 'ritos-web.html']) {
  await page.goto(URL0 + '/' + pag);
  await page.waitForTimeout(700);
  const cheio = await page.evaluate(() => {
    const h = document.querySelector('.head') || document.querySelector('.brand');
    const ic = h && h.querySelector('.ic');
    return { marca: document.documentElement.getAttribute('data-ct-embed'),
             iconeVisivel: !!(ic && getComputedStyle(ic).display !== 'none'),
             alturaCab: h ? Math.round(h.getBoundingClientRect().height) : 0 };
  });
  await page.goto(URL0 + '/' + pag + '?embed=1');
  await page.waitForTimeout(700);
  const magro = await page.evaluate(() => {
    const h = document.querySelector('.head') || document.querySelector('.brand');
    const ic = h && h.querySelector('.ic');
    return { marca: document.documentElement.getAttribute('data-ct-embed'),
             iconeVisivel: !!(ic && getComputedStyle(ic).display !== 'none'),
             alturaCab: h ? Math.round(h.getBoundingClientRect().height) : 0 };
  });
  ok(!cheio.marca && cheio.iconeVisivel, 'D2 ' + pag + ' avulsa mantém o cabeçalho inteiro');
  ok(magro.marca === '1' && !magro.iconeVisivel, 'D2 ' + pag + ' com embed=1 esconde a identidade');
  ok(magro.alturaCab < cheio.alturaCab, 'D2 ' + pag + ' encolhe de ' + cheio.alturaCab + 'px para ' + magro.alturaCab + 'px');
}

// dentro do app: todos os iframes pedem embed=1, e as SEIS telas abrem de verdade
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1700);
const d2b = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const r = { telas: {} };
  const views = ['areamod', 'roteiros', 'legis', 'juris', 'segundafase', 'prioridade'];
  r.seisIframes = document.querySelectorAll('iframe[data-ct-view]').length === 6;
  for (const v of views) {
    const b = document.querySelector('button[data-view="' + v + '"]');
    if (!b) { r.telas[v] = 'sem botão no menu'; continue; }
    b.click(); await w(1900);
    const f = document.querySelector('iframe[data-ct-view="' + v + '"]');
    if (!f) { r.telas[v] = 'sem iframe'; continue; }
    const src = f.getAttribute('src') || '';
    let corpo = 0, embed = null;
    try { corpo = (f.contentDocument.body.innerText || '').trim().length;
          embed = f.contentDocument.documentElement.getAttribute('data-ct-embed'); } catch (e) {}
    r.telas[v] = { embedNaURL: /embed=1/.test(src), embedAplicado: embed === '1', temConteudo: corpo > 200 };
  }
  return r;
});
ok(d2b.seisIframes, 'D2 as seis telas de iframe existem (2ª fase e Prioridade voltaram)');
for (const [v, t] of Object.entries(d2b.telas)) {
  ok(typeof t === 'object' && t.embedNaURL && t.embedAplicado, 'D2 ' + v + ' abre em modo embutido');
  ok(typeof t === 'object' && t.temConteudo, 'REGRESSÃO ' + v + ' abre com conteúdo (não fica em branco)');
}
/* ===== BARRA: todo botão leva a uma tela (regressão dos botões mudos) =====
   Prioridade e Simulado de 2ª fase trocavam a view para telas que não existiam
   mais no template — clicar não abria nada. As páginas seguiam no bundle. */
const barra = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const r = {};
  for (const [view, arquivo] of [['prioridade', 'prioridade-web.html'], ['segundafase', 'segunda-fase-web.html']]) {
    const b = document.querySelector('button[data-view="' + view + '"]');
    if (!b) { r[view + 'TemBotao'] = false; continue; }
    r[view + 'TemBotao'] = true;
    b.click(); await w(1800);
    const f = document.querySelector('iframe[data-ct-view="' + view + '"]');
    // o src pode trazer parâmetros (o D2 acrescenta ?embed=1): compara a PÁGINA, não a string
    const src = (f && f.getAttribute('src')) || '';
    r[view + 'Abre'] = !!f && src.split('?')[0] === arquivo && f.style.display === 'block';
    let texto = ''; try { texto = (f.contentDocument.body.innerText || '').trim(); } catch (e) {}
    r[view + 'TemConteudo'] = texto.length > 200;
  }
  return r;
});
for (const [k, v] of Object.entries(barra)) ok(v, 'BARRA ' + k);
/* ============= LEGIS — D5, D4, D7, D8, D10 e U7(b) =============
   O leitor de norma busca /api/law (função serverless). O servidor destes testes é
   estático, então a rota é servida aqui: sem texto de lei não dá para medir coluna,
   serifa nem entrelinha do modo leitura. */
await page.route('**/api/law*', r => r.fulfill({
  contentType: 'application/json',
  body: JSON.stringify({ ok: true, paragraphs: [
    'TÍTULO I', 'DAS DISPOSIÇÕES PRELIMINARES', 'CAPÍTULO I', 'DA APLICAÇÃO DA LEI',
    'Art. 1º Toda pessoa é capaz de direitos e deveres na ordem civil, e este parágrafo é '
      + 'longo de propósito para que a medida da coluna de leitura tenha o que medir.',
    '§ 1º Parágrafo de teste com texto suficiente para medir a entrelinha.',
    'I - inciso de teste', 'a) alínea de teste', 'Art. 2º Segundo artigo de teste.'] }),
}));
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(URL0 + '/legis-web.html');
await page.evaluate(() => ['catedra:legisEstudo', 'catedra:leitorLeitura', 'catedra:leitorDark']
  .forEach(k => localStorage.removeItem(k)));
await page.goto(URL0 + '/legis-web.html');
await page.waitForTimeout(600);

const lg = await page.evaluate(() => {
  const cs = el => getComputedStyle(el);
  const row = document.querySelector('.lawrow');
  const link = row.querySelector('a');
  const r = {};
  // D5 — um botão só: a linha é a ação primária, o Planalto é apoio
  r.d5SemBotaoVerde = document.querySelectorAll('.lawrow .rd').length === 0
    && !/ler aqui/i.test(document.getElementById('catalog').innerText);
  r.d5LinhaClicavel = row.classList.contains('abrivel') && cs(row).cursor === 'pointer';
  r.d5TituloEhBotao = row.querySelector('.lt').tagName === 'BUTTON';
  r.d5PlanaltoDiscreto = /planalto/i.test(link.textContent)
    && cs(link).borderTopWidth === '0px' && cs(link).borderLeftWidth === '0px';
  r.d5EstrelaTemNome = /favorito/i.test(row.querySelector('.fav').getAttribute('aria-label') || '');
  r.d5Alvo44 = row.getBoundingClientRect().height >= 44;
  // o overlay que estende o clique não pode engolir os controles da própria linha
  const bl = link.getBoundingClientRect();
  const emCima = document.elementFromPoint(bl.left + bl.width / 2, bl.top + bl.height / 2);
  r.d5PlanaltoContinuaClicavel = emCima === link || link.contains(emCima);
  const br = row.getBoundingClientRect();
  const meio = document.elementFromPoint(br.left + br.width * 0.5, br.top + br.height / 2);
  r.d5MeioDaLinhaAbre = !!(meio && meio.closest && meio.closest('.lt'));

  // D4 — zero absoluto vira convite
  const fav = document.getElementById('st-fav');
  r.d4ZeroViraConvite = fav.classList.contains('zero')
    && /marque/i.test(fav.innerText) && !/^0/.test(fav.innerText.trim())
    && !/\b0\b/.test(document.querySelector('.statbar').innerText.split('LEIS')[0]);

  // D7 — dois níveis de microlabel
  const forte = cs(document.getElementById('rdrMat'));
  const fraca = cs(document.querySelector('.statbar .ml-fraca'));
  r.d7Forte = /mono|Menlo|SFMono/i.test(forte.fontFamily) && forte.textTransform === 'uppercase'
    && parseFloat(forte.letterSpacing) > 1;
  r.d7Fraca = fraca.textTransform === 'uppercase' && fraca.letterSpacing === 'normal'
    && parseFloat(fraca.fontSize) <= 11 && fraca.color !== forte.color;

  // D10 — nome acessível em tudo que é botão/link (inclusive os só-ícone do leitor)
  r.d10TodosComNome = [...document.querySelectorAll('button, a')]
    .every(el => ((el.getAttribute('aria-label') || el.textContent || '').trim().length > 0));

  return r;
});
ok(lg.d5SemBotaoVerde, 'D5 o botão verde "Ler aqui" sumiu (era 1 por lei, 268 no total)');
ok(lg.d5LinhaClicavel, 'D5 a linha inteira abre o leitor (cursor pointer)');
ok(lg.d5TituloEhBotao, 'D5 o alvo primário é um botão de verdade (alcançável por teclado)');
ok(lg.d5PlanaltoDiscreto, 'D5 "Planalto ↗" virou link discreto, sem borda');
ok(lg.d5EstrelaTemNome, 'D5 a ★ ganhou aria-label');
ok(lg.d5Alvo44, 'D5 a área de toque da linha tem 44px ou mais');
ok(lg.d5PlanaltoContinuaClicavel, 'D5 o clique estendido não engole o link do Planalto');
ok(lg.d5MeioDaLinhaAbre, 'D5 clicar no meio da linha cai no botão de ler');
ok(lg.d4ZeroViraConvite, 'D4 métrica zerada vira convite em vez de "0 FAVORITAS"');
ok(lg.d7Forte, 'D7 microlabel forte: mono, caixa alta e espaçamento (cor do ramo)');
ok(lg.d7Fraca, 'D7 microlabel fraca: menor, sem espaçamento extra e sem a cor do forte');
ok(lg.d10TodosComNome, 'D10 nenhum botão ou link sem nome acessível');

// D10 — contraste do texto miúdo nas QUATRO abas (pane escondido não é medível, então
// cada uma tem de ser aberta; foi assim que apareceram os --text3 de 12px do Plano).
// Ficam DE FORA as pastilhas pintadas com a cor da matéria (`--c`, branco sobre a cor ou a
// cor sobre um tinte dela): ali o contraste depende da paleta por disciplina, não do degrau
// de --text3 que a D10 pede — corrigir aquilo é escurecer o código de cores do app inteiro,
// que é outra decisão (medido: .ab branco sobre #f5872f dá 2.50:1; .tn e .cap b, ~4.3:1).
const magros = [];
for (const t of ['catalog', 'plano', 'indice', 'incid']) {
  await page.evaluate(tt => document.querySelector('#tabsTopo button[data-t="' + tt + '"]').click(), t);
  await page.waitForTimeout(t === 'incid' ? 1200 : 300);
  magros.push(...await page.evaluate(() => {
    const cs = el => getComputedStyle(el);
    const lum = c => { const m = c.match(/[\d.]+/g).map(Number);
      const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const fundo = el => { let n = el; while (n && n !== document.documentElement) {
        const c = cs(n).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && !/, 0\)$/.test(c)) return c; n = n.parentElement; }
      return cs(document.body).backgroundColor; };
    const ruins = [];
    document.querySelectorAll('body *').forEach(el => {
      const c = cs(el);
      if (parseFloat(c.fontSize) >= 13 || c.backgroundImage !== 'none') return;
      if (!el.offsetParent) return;
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
      if (lum(c.color) > 0.6) return;          // texto claro = pastilha colorida (ver acima)
      const cor = c.getPropertyValue('--c').trim();          // cor da matéria em escopo
      const hex = h => { h = h.replace('#', '');
        if (h.length === 3) h = h.split('').map(x => x + x).join('');
        return 'rgb(' + [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)).join(', ') + ')'; };
      if (cor && (cor[0] === '#' ? hex(cor) : cor) === c.color) return;
      const a = lum(c.color), b = lum(fundo(el));
      const k = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      if (k < 4.5) ruins.push((el.className || el.tagName) + ' ' + k.toFixed(2));
    });
    return ruins;
  }));
}
ok(magros.length === 0, 'D10 texto abaixo de 13px com contraste ≥ 4.5:1 nas 4 abas ('
   + magros.slice(0, 5).join(', ') + ')');
await page.evaluate(() => document.querySelector('#tabsTopo button[data-t="catalog"]').click());
await page.waitForTimeout(200);

// clicar na ★ não pode abrir o leitor — e com 1 favorita a métrica volta a ser número
await page.locator('.lawrow .fav').first().click();
await page.waitForTimeout(250);
const lgFav = await page.evaluate(() => ({
  naoAbriu: !document.getElementById('rdr').classList.contains('on'),
  viraNumero: !document.getElementById('st-fav').classList.contains('zero')
    && /^1\b/.test(document.getElementById('st-fav').innerText.trim()),
}));
ok(lgFav.naoAbriu, 'D5 clicar na ★ marca o favorito sem abrir o leitor');
ok(lgFav.viraNumero, 'D4 com 1 favorita o slot volta a ser número');

// D10 — foco visível na pílula: numa página recém-carregada a primeira parada do Tab é a
// fileira de abas (um clique anterior movimenta o ponto de partida do Tab, mesmo com blur)
await page.goto(URL0 + '/legis-web.html');
await page.waitForTimeout(400);
await page.keyboard.press('Tab');
const foco = await page.evaluate(() => { const el = document.activeElement, c = getComputedStyle(el);
  return { alvo: el.closest('.tabs') ? 'pilula' : el.tagName, w: c.outlineWidth, cor: c.outlineColor,
           accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() }; });
ok(foco.alvo === 'pilula' && parseFloat(foco.w) >= 2 && /15, 122, 87/.test(foco.cor),
   'D10 pílula com foco visível na cor de destaque (' + foco.w + ' ' + foco.cor + ')');

// D5/U7 — abrir pelo clique na linha e medir o modo leitura
const cx = await page.locator('.lawrow').first().boundingBox();
await page.mouse.click(cx.x + cx.width * 0.5, cx.y + cx.height / 2);
await page.waitForTimeout(500);
ok(await page.evaluate(() => document.getElementById('rdr').classList.contains('on')),
   'D5 o clique na linha abre mesmo o leitor');
const u7a = await page.evaluate(() => { const cs = el => getComputedStyle(el);
  const d = document.querySelector('#rdr .docwrap'), c = document.querySelector('#rdr .caput');
  return { w: d.getBoundingClientRect().width, fs: parseFloat(cs(d).fontSize),
           // "sans-serif" contém "serif": a serifa se reconhece pelo NOME da fonte
           serif: /Spectral|Georgia/i.test(cs(c).fontFamily), lh: parseFloat(cs(c).lineHeight) }; });
await page.click('#rdrLeitura');
await page.waitForTimeout(250);
const u7b = await page.evaluate(() => { const cs = el => getComputedStyle(el);
  const d = document.querySelector('#rdr .docwrap'), c = document.querySelector('#rdr .caput');
  return { w: d.getBoundingClientRect().width, fs: parseFloat(cs(d).fontSize),
           // "sans-serif" contém "serif": a serifa se reconhece pelo NOME da fonte
           serif: /Spectral|Georgia/i.test(cs(c).fontFamily), lh: parseFloat(cs(c).lineHeight),
           aria: document.getElementById('rdrLeitura').getAttribute('aria-pressed'),
           guardado: localStorage.getItem('catedra:leitorLeitura'),
           soLocal: !JSON.stringify(Object.keys(localStorage)).includes('catedra:leitorLeitura:sync') }; });
ok(!u7a.serif && u7a.w > u7b.w, 'U7 o leitor normal segue largo e sem serifa (o modo leitura é escolha)');
ok(u7b.serif && u7b.fs >= 17 && u7b.lh / u7b.fs >= 1.68 && u7b.w <= 700,
   'U7 modo leitura: ~68ch, corpo serifado ' + u7b.fs + 'px, entrelinha ' + (u7b.lh / u7b.fs).toFixed(2));
ok(u7b.aria === 'true', 'U7 o botão do modo leitura diz o estado (aria-pressed)');
ok(u7b.guardado === '1' && u7b.soLocal, 'U7 a escolha fica no localStorage do aparelho (sem sync)');

// e continua valendo na próxima abertura
await page.goto(URL0 + '/legis-web.html');
await page.waitForTimeout(600);
await page.evaluate(() => document.querySelector('.lawrow .lt').click());
await page.waitForTimeout(400);
ok(await page.evaluate(() => document.getElementById('rdr').classList.contains('leitura')),
   'U7 o modo leitura é lembrado entre aberturas');

/* ---- D8: o mesmo exercício no celular ---- */
await page.setViewportSize({ width: 375, height: 780 });
await page.goto(URL0 + '/legis-web.html');
await page.waitForTimeout(600);
const gordos = [];
for (const t of ['catalog', 'plano', 'indice', 'incid']) {
  await page.evaluate(tt => { const b = document.querySelector('#tabsTopo button[data-t="' + tt + '"]');
    b.click();
    // abre a primeira seção do Plano: os dias só existem depois de abrir
    const s = document.querySelector('#plano .sec-h'); if (s && tt === 'plano') s.click();
    const g = document.querySelector('#plano .grp-h'); if (g && tt === 'plano') g.click(); }, t);
  await page.waitForTimeout(t === 'incid' ? 1200 : 350);
  gordos.push(...await page.evaluate(() => {
    const p = [];
    document.querySelectorAll('button, a, input, .day').forEach(el => {
      if (!el.offsetParent) return;
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) return;
      if (b.height < 44 || b.width < 44) p.push((el.className || el.tagName)
        + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
    });
    return p;
  }));
}
await page.evaluate(() => document.querySelector('#tabsTopo button[data-t="catalog"]').click());
await page.waitForTimeout(250);
const d8 = await page.evaluate(() => {
  const cs = el => getComputedStyle(el);
  const tabs = document.getElementById('tabsTopo'), on = tabs.querySelector('button.on');
  const t = tabs.getBoundingClientRect(), o = on.getBoundingClientRect();
  return { rola: cs(tabs).overflowX === 'auto', snap: /x/.test(cs(tabs).scrollSnapType),
    snapItem: cs(on).scrollSnapAlign === 'center',
    ativaVisivel: o.left >= t.left - 1 && o.right <= t.right + 1 };
});
ok(gordos.length === 0, 'D8 nenhum alvo de toque abaixo de 44px no celular, nas 4 abas ('
   + gordos.slice(0, 6).join(', ') + ')');
ok(d8.rola && d8.snap && d8.snapItem, 'D8 a fileira de pílulas rola com scroll-snap');
ok(d8.ativaVisivel, 'D8 a pílula ativa já está à vista na carga');

// as ferramentas secundárias do leitor recolhem no ⋯ (e o esquema vira gaveta no ☰)
await page.evaluate(() => document.querySelector('.lawrow .lt').click());
await page.waitForTimeout(500);
const d8b = await page.evaluate(() => getComputedStyle(document.getElementById('rdrTools')).display);
await page.click('#rdrMore');
await page.waitForTimeout(250);
const d8c = await page.evaluate(() => {
  const t = document.getElementById('rdrTools'), cs = el => getComputedStyle(el);
  const pequenas = [...t.querySelectorAll('button, a')]
    .filter(el => { const b = el.getBoundingClientRect(); return b.height < 44 || b.width < 44; });
  return { aberto: cs(t).display === 'flex', dentroDaTela: t.getBoundingClientRect().right <= 375,
    diz: document.getElementById('rdrMore').getAttribute('aria-expanded') === 'true',
    alvosOk: pequenas.length === 0 };
});
ok(d8b === 'none' && d8c.aberto && d8c.diz && d8c.dentroDaTela && d8c.alvosOk,
   'D8 no celular as ações secundárias do leitor ficam recolhidas num ⋯');
await page.click('#rdrMapa');
await page.waitForTimeout(350);
const d8d = await page.evaluate(() => ({
  gaveta: document.querySelector('#rdr .map').getBoundingClientRect().left > -1,
  fechouOMais: !document.getElementById('rdrTools').classList.contains('aberto'),
}));
ok(d8d.gaveta && d8d.fechouOMais, 'D8 o esquema da lei vira gaveta no celular (260px não cabem em 375)');

// trocar de aba não pode apagar o "você está aqui" das pílulas do Índice
const d8e = await page.evaluate(() => {
  document.querySelector('#tabsTopo button[data-t="indice"]').click();
  const tabs = document.querySelector('#indice .tabs');
  return !!(tabs && tabs.querySelector('button.on'));
});
ok(d8e, 'D8 trocar de aba não apaga a pílula ativa do Índice');

await page.unroute('**/api/law*');
await page.setViewportSize({ width: 1280, height: 720 });
/* ============= JURIS — D3, D4, D7, D8, D10 e U7(b) ============= */
// Contexto próprio: estes casos mexem no localStorage do acervo e medem tamanho de
// tela, e não podem sujar o estado que os testes do app usam.
// O índice tem 25 mil verbetes; os TEXTOS são 10 MB e só entram quando um verbete é
// realmente aberto — o último caso do bloco guarda essa fronteira.
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const jp = await ctx.newPage();
  const errosJuris = [];
  const pedidos = [];
  jp.on('pageerror', e => errosJuris.push(e.message));
  jp.on('request', r => pedidos.push(r.url()));
  await jp.goto(URL0 + '/juris-web.html');
  await jp.waitForTimeout(2400);

  // ---- D3(a): nenhum identificador técnico na interface
  const d3a = await jp.evaluate(() => ({
    semSnakeNaTela: !/[a-z]{3,}_[a-z]{3,}/.test(document.getElementById('paneAcervo').innerText),
    semSnakeNosChips: ![...document.querySelectorAll('#bases .chip, #ramos .chip, #trib .chip')]
      .some(c => /[a-z]{3,}_[a-z]{3,}/.test(c.textContent || '')),
    colecaoRotulada: [...document.querySelectorAll('#bases .chip')]
      .some(c => /Informativos? do STJ/i.test(c.textContent || '')),
    cardRotulado: ![...document.querySelectorAll('.vcard .num')]
      .some(n => /[a-z]{3,}_[a-z]{3,}/.test(n.textContent || '')),
  }));
  for (const [k, v] of Object.entries(d3a)) ok(v, 'D3 ' + k);

  // ---- D3(b): as duas fileiras recolhidas, tribunais à vista, acervo na 1ª dobra
  const d3b = await jp.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    o.tribunaisContinuamAVista = document.querySelectorAll('#trib .chip').length > 3;
    o.painelComecaFechado = document.getElementById('popFiltros').hidden === true;
    o.acervoNaPrimeiraDobra = document.querySelector('.vcard').getBoundingClientRect().top < 460;
    document.getElementById('btFiltros').click(); await w(150);
    o.botaoAbreOPainel = !document.getElementById('popFiltros').hidden
      && document.getElementById('btFiltros').getAttribute('aria-expanded') === 'true';
    const chip = [...document.querySelectorAll('#ramos .chip')].find(c => /^Direito Penal\s/.test(c.textContent.trim()));
    if (!chip) return { ...o, erro: 'sem chip de ramo no painel' };
    chip.click(); await w(350);
    o.contaNoBotao = /Filtros \(1\)/.test(document.getElementById('btFiltros').textContent);
    const ativo = document.querySelector('#fAtivos .chip');
    o.chipAtivoAoLado = !!ativo && /Direito Penal/.test(ativo.textContent);
    o.chipAtivoTemNome = !!ativo && /remover filtro/i.test(ativo.getAttribute('aria-label') || '');
    o.filtroValeu = document.querySelectorAll('.vcard').length > 0
      && [...document.querySelectorAll('.vcard .rtag')].every(t => /Direito Penal/.test(t.textContent));
    ativo.click(); await w(350);
    o.chipRemoveOFiltro = document.querySelectorAll('#fAtivos .chip').length === 0
      && document.getElementById('btFiltros').textContent.trim() === 'Filtros';
    // "＋ N ramos" mexe na lista de dentro: não pode ser lido como clique fora e fechar
    document.getElementById('btFiltros').click(); await w(150);
    const mais = [...document.querySelectorAll('#ramos .chip')].find(c => /ramos$/.test(c.textContent.trim()));
    if (mais) { mais.click(); await w(250); }
    o.verMaisNaoFechaOPainel = !mais || !document.getElementById('popFiltros').hidden;
    document.body.click(); await w(150);
    o.cliqueForaFecha = document.getElementById('popFiltros').hidden;
    return o;
  });
  if (d3b.erro) ok(false, 'D3 ' + d3b.erro);
  else for (const [k, v] of Object.entries(d3b)) ok(v, 'D3 ' + k);

  // ---- D4: zero absoluto vira convite; com 1 volta a ser número
  const d4 = await jp.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const sb = () => document.querySelector('#paneAcervo .statbar').innerText;
    const o = {};
    o.zeroNaoVira0 = !/\b0\b/.test(sb()) && /marque/i.test(sb());
    const card = document.querySelector('.vcard');
    card.querySelector('.st').click(); card.querySelector('.st').click();   // '' → rev → dom
    card.querySelector('.fav').click(); await w(120);
    o.comUmViraNumero = /\b1\b/.test(sb()) && /dominados/i.test(sb()) && /favoritos/i.test(sb());
    return o;
  });
  for (const [k, v] of Object.entries(d4)) ok(v, 'D4 ' + k);

  // ---- D7: dois níveis de microlabel, e eles são mesmo diferentes
  // O par vivo mora no leitor: "ENUNCIADO" estrutura a leitura (forte) e "VERBETES DO
  // FILTRO" é rótulo de coluna (fraco). Antes os dois saíam em 10px/800 e só mudavam de
  // cor — era esse o "tudo destaca, nada destaca".
  const d7 = await jp.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.openVerbete(0); await w(1600);
    const g = e => { const c = getComputedStyle(e); return { fs: parseFloat(c.fontSize), w: +c.fontWeight, cor: c.color, caixa: c.textTransform }; };
    const forte = g(document.querySelector('#jrdr .venun .lbl'));
    const fraca = g(document.querySelector('#jrdr .maptitle'));
    const daPagina = g(document.querySelector('#paneAcervo .statbar .mlW'));
    document.getElementById('jrClose').click(); await w(200);
    return { forte, fraca,
      hierarquia: forte.fs > fraca.fs && forte.w > fraca.w && forte.cor !== fraca.cor,
      ambosCaps: forte.caixa === 'uppercase' && fraca.caixa === 'uppercase' && daPagina.caixa === 'uppercase',
      paginaSegueOFraco: daPagina.fs === fraca.fs && daPagina.w === fraca.w };
  });
  ok(d7.hierarquia, 'D7 o nível forte se distingue do fraco em tamanho, peso e cor ('
     + d7.forte.fs + 'px/' + d7.forte.w + ' × ' + d7.fraca.fs + 'px/' + d7.fraca.w + ')');
  ok(d7.ambosCaps, 'D7 os dois níveis continuam mono-caps (a linguagem da casa não muda)');
  ok(d7.paginaSegueOFraco, 'D7 metadado da página usa o mesmo nível fraco do leitor');

  // ---- D10: nome acessível em todo botão, foco visível e contraste do cinza pequeno
  const d10 = await jp.evaluate(() => {
    const o = {};
    o.todoBotaoTemNome = [...document.querySelectorAll('button')]
      .every(b => (b.textContent || '').trim() || b.getAttribute('aria-label'));
    o.semNome = [...document.querySelectorAll('button')]
      .filter(b => !(b.textContent || '').trim() && !b.getAttribute('aria-label'))
      .map(b => b.id || b.className).join(', ');
    // contraste real do rótulo pequeno contra o fundo da página
    const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = s => { const m = s.match(/\d+/g).map(Number); return 0.2126 * lin(m[0]) + 0.7152 * lin(m[1]) + 0.0722 * lin(m[2]); };
    const razao = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const alvo = document.querySelector('#paneAcervo .statbar .mlW');
    o.contraste = +razao(getComputedStyle(alvo).color, getComputedStyle(document.body).backgroundColor).toFixed(2);
    o.contrasteAA = o.contraste >= 4.5;
    return o;
  });
  ok(d10.todoBotaoTemNome, 'D10 nenhum botão sem nome acessível (' + (d10.semNome || 'nenhum') + ')');
  ok(d10.contrasteAA, 'D10 rótulo pequeno passa no AA (' + d10.contraste + ':1, antes 4.16 com --text3)');

  // foco visível de verdade: chega no chip pelo teclado e ele se acende
  await jp.click('#q');
  await jp.keyboard.press('Tab');
  const foco = await jp.evaluate(() => {
    const a = document.activeElement, c = getComputedStyle(a);
    return { ehChip: a.classList.contains('chip') || a.classList.contains('tab') || a.classList.contains('fbtn'),
             temContorno: c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0 };
  });
  ok(foco.ehChip && foco.temContorno, 'D10 chip alcançado pelo teclado mostra o foco');

  // ---- U7(b): modo leitura no leitor de verbete
  const u7 = await jp.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    window.openVerbete(0); await w(1600);
    const dw = () => document.querySelector('#jrdr .docwrap');
    o.medidaAntes = parseFloat(getComputedStyle(dw()).maxWidth);
    document.getElementById('jrLeitura').click(); await w(200);
    o.ligou = document.getElementById('jrdr').classList.contains('leitura');
    o.medidaDepois = parseFloat(getComputedStyle(dw()).maxWidth);
    const c = getComputedStyle(document.querySelector('#jrdr .venun .bd'));
    o.corpo = parseFloat(c.fontSize);
    o.entrelinha = +(parseFloat(c.lineHeight) / parseFloat(c.fontSize)).toFixed(2);
    o.serifado = /Spectral|Georgia|serif/i.test(c.fontFamily);
    o.pressionado = document.getElementById('jrLeitura').getAttribute('aria-pressed') === 'true';
    // sem sync: a chave não leva o prefixo que o auth.js sobe para a nuvem
    o.foraDoSync = !Object.keys(localStorage).some(k => k.indexOf('catedra:') === 0 && /leitura/i.test(k))
      && localStorage.getItem('catedraJurisLeitura') === '1';
    return o;
  });
  ok(u7.ligou, 'U7 modo leitura liga no leitor de verbete');
  ok(u7.medidaDepois < u7.medidaAntes && u7.medidaDepois < 640,
     'U7 a medida da linha encolhe para ~68ch (' + Math.round(u7.medidaAntes) + 'px → ' + Math.round(u7.medidaDepois) + 'px)');
  ok(u7.corpo >= 17 && u7.entrelinha >= 1.69 && u7.serifado,
     'U7 corpo serifado ≥17px com entrelinha 1.7 (' + u7.corpo + 'px / ' + u7.entrelinha + ')');
  ok(u7.pressionado, 'U7 o botão informa o estado (aria-pressed)');
  ok(u7.foraDoSync, 'U7 a escolha fica no aparelho — chave fora do prefixo que sincroniza');

  // lembrado entre aberturas
  await jp.goto(URL0 + '/juris-web.html');
  await jp.waitForTimeout(2200);
  const u7b = await jp.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.openVerbete(0); await w(1600);
    return document.getElementById('jrdr').classList.contains('leitura');
  });
  ok(u7b, 'U7 o modo leitura sobrevive a reabrir a página');

  // ---- D8: celular — alvo de 44px, pílulas com rolagem e ferramentas no "⋯"
  const mctx = await browser.newContext({ viewport: { width: 375, height: 780 }, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  mp.on('pageerror', e => errosJuris.push('mobile: ' + e.message));
  await mp.goto(URL0 + '/juris-web.html');
  await mp.waitForTimeout(2400);
  const d8 = await mp.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const alt = s => Math.round(document.querySelector(s).getBoundingClientRect().height);
    const o = {};
    const tabs = document.getElementById('tabs');
    o.pilulasRolamComEncaixe = tabs.scrollWidth > tabs.clientWidth
      && getComputedStyle(tabs).scrollSnapType.indexOf('x') === 0
      && getComputedStyle(document.querySelector('.tab')).scrollSnapAlign !== 'none';
    o.alvoDaPilula = alt('.tab') >= 44;
    o.alvoDoChip = alt('#trib .chip') >= 44;
    o.alvoDoStatus = alt('.vcard .st') >= 44 && alt('.vcard .fav') >= 44;
    // a ativa tem de aparecer sozinha: no celular a última pílula nasce fora da tela
    document.querySelector('.tab[data-pane="tribunais"]').click(); await w(400);
    const r = document.querySelector('#tabs .tab.on').getBoundingClientRect();
    o.ativaVisivelSemRolarNaMao = r.left >= -1 && r.right <= window.innerWidth + 1;
    document.querySelector('.tab[data-pane="acervo"]').click(); await w(300);
    window.openVerbete(0); await w(1600);
    o.ferramentasNoMais = getComputedStyle(document.getElementById('jrMais')).display !== 'none'
      && getComputedStyle(document.getElementById('jrTools')).display === 'none';
    document.getElementById('jrMais').click(); await w(200);
    o.oMaisAbre = getComputedStyle(document.getElementById('jrTools')).display !== 'none'
      && document.getElementById('jrMais').getAttribute('aria-expanded') === 'true';
    o.leitorCabeNaTela = getComputedStyle(document.querySelector('#jrdr .map')).display === 'none';
    return o;
  });
  for (const [k, v] of Object.entries(d8)) ok(v, 'D8 ' + k);

  ok(errosJuris.length === 0, 'JURIS nenhuma exceção na página (' + errosJuris.join(' | ') + ')');
  // a fronteira do acervo: abrir verbete puxa o BLOCO do texto, nunca o arquivo de 10 MB
  ok(!pedidos.some(u => /juris-text\.js/.test(u)), 'JURIS abrir verbete não baixa o juris-text.js inteiro');

  await mctx.close();
  await ctx.close();
}

/* ===== D6/D7/D8/D10 — pente fino visual do fluxo dos ritos e dos roteiros ===== */
/* Ferramentas medidas dentro da página, compartilhadas pelos casos abaixo:
   · vazamento: um retângulo l×a centrado cabe num losango L×A se l/L + a/A ≤ 1;
     medimos as linhas de texto de verdade (rects de Range) e o chip da lei;
   · contraste: compõe os fundos translúcidos até achar cor sólida (color-mix vira
     color(srgb …) no valor computado, por isso o parser passa pelo canvas). */
const FERRAMENTAS = `
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const paraRGB = s => {
    const m = String(s||'').match(/rgba?\\(([^)]+)\\)/);
    if (m) { const p = m[1].split(',').map(Number); return [p[0],p[1],p[2], p.length>3?p[3]:1]; }
    try { ctx.clearRect(0,0,1,1); ctx.fillStyle = '#000'; ctx.fillStyle = s; ctx.fillRect(0,0,1,1);
      const d = ctx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2],d[3]/255]; } catch (e) { return null; }
  };
  const fundoDe = el => {
    let n = el; const camadas = [];
    while (n && n.nodeType === 1) {
      const p = paraRGB(getComputedStyle(n).backgroundColor);
      if (p && p[3] > 0) { camadas.push(p); if (p[3] >= 1) break; }
      n = n.parentElement;
    }
    camadas.push([255,255,255,1]);
    let [r,g,b] = camadas[camadas.length-1];
    for (let i = camadas.length-2; i >= 0; i--) { const [R,G,B,A] = camadas[i];
      r = R*A + r*(1-A); g = G*A + g*(1-A); b = B*A + b*(1-A); }
    return [r,g,b];
  };
  const lum = ([r,g,b]) => { const f = v => { v/=255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); };
    return .2126*f(r) + .7152*f(g) + .0722*f(b); };
  const contraste = (fg,bg) => { const a = lum(fg)+.05, b = lum(bg)+.05; return a>b ? a/b : b/a; };
  const contrasteDe = el => contraste(paraRGB(getComputedStyle(el).color), fundoDe(el));
  const miudos = () => [...document.querySelectorAll('body *')].filter(el => {
    const t = [...el.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim());
    if (!t) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getClientRects().length
      && parseFloat(cs.fontSize) < 13;
  });
  const vazamento = () => [...document.querySelectorAll('.dec')].map(dec => {
    const los = dec.querySelector('.losango') || dec;
    if (getComputedStyle(los).clipPath === 'none') return null;   // virou caixa: não é losango
    const R = los.getBoundingClientRect();
    const cx = R.left + R.width/2, cy = R.top + R.height/2, a = R.width/2, b = R.height/2;
    const alvos = [];
    const w = document.createTreeWalker(dec, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!String(n.nodeValue).trim()) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      [...rg.getClientRects()].forEach(x => { if (x.width && x.height) alvos.push(x); });
    }
    dec.querySelectorAll('.art').forEach(x => { const rr = x.getBoundingClientRect(); if (rr.width) alvos.push(rr); });
    let pior = 0;
    alvos.forEach(rr => [[rr.left,rr.top],[rr.right,rr.top],[rr.left,rr.bottom],[rr.right,rr.bottom]]
      .forEach(([x,y]) => { const v = Math.abs(x-cx)/a + Math.abs(y-cy)/b; if (v > pior) pior = v; }));
    return { t: (dec.querySelector('.tt')||{}).textContent, pior: +pior.toFixed(3) };
  }).filter(Boolean);
`;

// D6(a) — o texto da decisão dentro do losango, em coluna larga e em coluna estreita.
// Antes da correção, a 940px (a largura do satélite dentro do app) 10 dos 26 losangos
// destes ritos vazavam, e a 905px, 23 — o título e a lei escapavam pela lateral.
{
  const ritos = ['Administrativo — improbidade', 'Civil — conhecimento', 'Penal — procedimento sumário',
                 'Penal — tribunal do júri', 'Empresarial — recuperação e falência'];
  for (const larg of [1280, 940]) {
    await page.setViewportSize({ width: larg, height: 900 });
    let total = 0, vazam = [], pior = 0;
    for (const rito of ritos) {
      await page.goto(URL0 + '/ritos-web.html?rito=' + encodeURIComponent(rito));
      await page.waitForTimeout(250);
      const m = await page.evaluate(FERRAMENTAS + '; vazamento()');
      m.forEach(x => { total++; if (x.pior > 1) vazam.push(x.t); if (x.pior > pior) pior = x.pior; });
    }
    ok(total > 0 && vazam.length === 0,
      'D6 nenhum texto escapa do losango a ' + larg + 'px (' + total + ' losangos, pior=' + pior.toFixed(2) +
      (vazam.length ? '; vazam: ' + vazam.slice(0, 3).join(' / ') : '') + ')');
  }
}

// D6(a) — e continua cabendo quando a coluna muda de largura SEM recarregar (é o caso
// do iframe dentro do app: a janela muda, o texto reflui, a forma precisa remedir)
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(URL0 + '/ritos-web.html?rito=' + encodeURIComponent('Civil — conhecimento'));
await page.waitForTimeout(400);
await page.setViewportSize({ width: 980, height: 900 });
await page.waitForTimeout(400);
const d6r = await page.evaluate(FERRAMENTAS + '; vazamento()');
ok(d6r.length > 0 && d6r.every(x => x.pior <= 1),
  'D6 a forma remede sozinha ao mudar a largura (' + d6r.length + ' losangos, pior=' +
  Math.max(0, ...d6r.map(x => x.pior)).toFixed(2) + ')');

// D6(b) — o rótulo da seta é o que separa os caminhos: contraste e pílula própria
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(URL0 + '/ritos-web.html?rito=' + encodeURIComponent('Administrativo — improbidade'));
await page.waitForTimeout(300);
const d6b = await page.evaluate(FERRAMENTAS + `; (() => {
  const rot = [...document.querySelectorAll('.saida .fio .rot')].filter(x => (x.textContent||'').trim());
  if (!rot.length) return { erro: 'sem rótulo de seta' };
  const cs = getComputedStyle(rot[0]);
  return {
    achou: rot.map(x => x.textContent.trim()).join(' | ').slice(0, 40),
    piorContraste: +Math.min(...rot.map(contrasteDe)).toFixed(2),
    temPill: (paraRGB(cs.backgroundColor)||[0,0,0,0])[3] > 0 && parseFloat(cs.borderTopWidth) > 0,
    naoUsaText3: cs.color !== getComputedStyle(document.documentElement).getPropertyValue('--text3').trim(),
  };
})()`);
if (d6b.erro) ok(false, 'D6 ' + d6b.erro);
else {
  ok(d6b.piorContraste >= 4.5, 'D6 rótulo da seta com contraste ≥ 4.5:1 (' + d6b.piorContraste + ':1 — ' + d6b.achou + ')');
  ok(d6b.temPill, 'D6 rótulo da seta ganhou fundo pill para descolar da linha');
}

// D7 — dois níveis de microlabel, e os dois em uso nas duas páginas
for (const pg of ['ritos-web.html', 'pecas-web.html']) {
  await page.goto(URL0 + '/' + pg);
  await page.waitForTimeout(400);
  const d7 = await page.evaluate(FERRAMENTAS + `; (() => {
    const f = document.querySelector('.ml-forte'), w = document.querySelector('.ml-fraca');
    if (!f || !w) return { erro: 'faltou nível ' + (!f ? 'forte' : 'fraco') };
    const cf = getComputedStyle(f), cw = getComputedStyle(w);
    return {
      usaOsDois: true,
      monoSoNoForte: /mono|Menlo|ui-monospace/i.test(cf.fontFamily) && !/mono|Menlo|ui-monospace/i.test(cw.fontFamily),
      // Chrome serializa letter-spacing:0 como 'normal' — parseFloat daria NaN
      espacamentoSoNoForte: (parseFloat(cf.letterSpacing) || 0) > (parseFloat(cw.letterSpacing) || 0),
      coresDiferentes: cf.color !== cw.color,
      fracoLegivel: +contrasteDe(w).toFixed(2) >= 4.5,
    };
  })()`);
  if (d7.erro) ok(false, 'D7 ' + pg + ': ' + d7.erro);
  else for (const [k, v] of Object.entries(d7)) ok(v, 'D7 ' + pg + ' ' + k);
}

// D8 — celular: pílula ativa visível já no load, alvos de 44px e as ações no "⋯"
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(URL0 + '/ritos-web.html?rito=' + encodeURIComponent('Tributário — execução fiscal'));
await page.waitForTimeout(500);
const d8rp = await page.evaluate(`(() => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const mats = document.getElementById('mats'), on = mats.querySelector('.pill.on');
  const rm = mats.getBoundingClientRect(), rp = on ? on.getBoundingClientRect() : null;
  const r = {
    pilulaAtivaInteiraNoLoad: !!rp && rp.left >= rm.left - 1 && rp.right <= rm.right + 1,
    temScrollSnap: /x/.test(getComputedStyle(mats).scrollSnapType || ''),
    // sem o scroll da fileira a pílula escolhida nasceria fora da tela
    fileiraRolou: mats.scrollLeft > 0,
    alvosDe44: [...document.querySelectorAll('.pill, header button')]
      .filter(b => b.getClientRects().length)
      .every(b => b.getBoundingClientRect().height >= 44),
    maisVisivel: document.getElementById('bMais').getClientRects().length > 0,
    acoesRecolhidas: document.getElementById('bNotas').getClientRects().length === 0,
  };
  return new Promise(async ok2 => {
    document.getElementById('bMais').click(); await w(120);
    r.menuAbre = document.getElementById('bNotas').getClientRects().length > 0;
    r.avisaEstado = document.getElementById('bMais').getAttribute('aria-expanded') === 'true';
    document.body.click(); await w(120);
    r.menuFechaClicandoFora = document.getElementById('bNotas').getClientRects().length === 0;
    ok2(r);
  });
})()`);
for (const [k, v] of Object.entries(d8rp)) ok(v, 'D8 ' + k);

await page.goto(URL0 + '/pecas-web.html');
await page.waitForTimeout(400);
const d8p = await page.evaluate(`(() => ({
  alvos: [...document.querySelectorAll('header input, header select')]
    .every(b => b.getBoundingClientRect().height >= 44),
  // sem 16px na busca o iOS dá zoom ao focar — foi por isso que a página proibia ampliar
  buscaGrande: parseFloat(getComputedStyle(document.getElementById('q')).fontSize) >= 16,
  deixaAmpliar: !/user-scalable\\s*=\\s*no|maximum-scale/.test(
    (document.querySelector('meta[name=viewport]')||{}).content || ''),
}))()`);
for (const [k, v] of Object.entries(d8p)) ok(v, 'D8/D10 peças no celular ' + k);

// D10 — nome acessível, foco visível e contraste do texto miúdo nas duas páginas
for (const pg of ['ritos-web.html', 'pecas-web.html']) {
  for (const larg of [1280, 390]) {
    await page.setViewportSize({ width: larg, height: 844 });
    await page.goto(URL0 + '/' + pg);
    await page.waitForTimeout(400);
    const d10 = await page.evaluate(FERRAMENTAS + `; (() => ({
      semNome: [...document.querySelectorAll('button')]
        .filter(b => b.getClientRects().length)
        .filter(b => !((b.textContent||'').trim() || b.getAttribute('aria-label') || b.getAttribute('title')))
        .map(b => b.className || b.id),
      miudosRuins: miudos().map(el => ({ q: el.className || el.tagName, c: +contrasteDe(el).toFixed(2),
        t: (el.textContent||'').trim().slice(0, 24) })).filter(x => x.c < 4.5),
    }))()`);
    ok(d10.semNome.length === 0, 'D10 ' + pg + ' @' + larg + ': todo botão tem nome acessível' +
      (d10.semNome.length ? ' (sem nome: ' + d10.semNome.join(', ') + ')' : ''));
    ok(d10.miudosRuins.length === 0, 'D10 ' + pg + ' @' + larg + ': texto abaixo de 13px com ≥ 4.5:1' +
      (d10.miudosRuins.length ? ' (' + JSON.stringify(d10.miudosRuins.slice(0, 3)) + ')' : ''));
  }
  await page.setViewportSize({ width: 1280, height: 844 });
  await page.goto(URL0 + '/' + pg);
  await page.waitForTimeout(300);
  await page.keyboard.press('Tab');
  const foco = await page.evaluate(`(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { erro: 'nada recebeu o foco' };
    const cs = getComputedStyle(el);
    return { visivel: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0, quem: el.tagName + '.' + el.className };
  })()`);
  ok(!foco.erro && foco.visivel, 'D10 ' + pg + ': o primeiro Tab mostra o foco (' + (foco.quem || foco.erro) + ')');
}
// O host acrescenta ?embed=1 ao src dos iframes (D2): as duas páginas precisam
// continuar inteiras nesse modo — nada do pente fino pode depender do cabeçalho grande.
for (const [pg, alvo] of [['ritos-web.html', '#fluxo .passo'], ['pecas-web.html', '.rcard']]) {
  await page.goto(URL0 + '/' + pg + '?embed=1');
  await page.waitForTimeout(500);
  const emb = await page.evaluate(`(() => ({
    conteudo: document.querySelectorAll('${alvo}').length,
    semNome: [...document.querySelectorAll('button')].filter(b => b.getClientRects().length)
      .filter(b => !((b.textContent||'').trim() || b.getAttribute('aria-label') || b.getAttribute('title'))).length,
  }))()`);
  ok(emb.conteudo > 0 && emb.semNome === 0, 'D10 ' + pg + ' inteira também com ?embed=1 (' + emb.conteudo + ' itens)');
}
await page.setViewportSize({ width: 1280, height: 720 });

await browser.close();
srv.close();
console.log(falhas.length ? ('\nFALHAS: ' + falhas.length) : '\nTODOS OS TESTES PASSARAM');
process.exit(falhas.length ? 1 : 0);
