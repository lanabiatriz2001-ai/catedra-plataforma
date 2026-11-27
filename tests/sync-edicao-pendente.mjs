/* EDIÇÃO AINDA NO DEBOUNCE × SINCRONIZAÇÃO (25/11/2026).

   O defeito (reproduzido na main 60e1987, Chromium e WebKit): o app adia a gravação 500 ms
   (_autosave; cada render com estado sujo rearma o prazo, então digitando sem parar nada grava).
   Se nesse intervalo uma mescla com a nuvem — o envio (pushNow, que lê antes de gravar), o
   pullAndMerge ou a hidratação do auth.js — trouxesse QUALQUER novidade, o aviso 'catedra:synced'
   fazia o _rehydrateFromLocal reler do disco TODAS as chaves do autosave, cancelar o temporizador e
   dar tudo por salvo: a edição da pessoa voltava ao valor gravado, na tela e no aparelho, e nunca
   subia — mesmo numa chave que a nuvem nem tinha mudado. Com o Mac e o iPad abertos juntos, bastava
   uma escolha feita perto de um envio. Era também o que fazia o caso (b) de
   tests/login-sem-dados.mjs falhar às vezes na CI.

   O conserto tem duas metades:
   · na fonte (auth.js): antes de ler o local para mesclar, o auth.js dispara
     'catedra:antesdamescla' e o app grava JÁ o que está pendente (_salvarAgora: só o que a memória
     mudou). A mescla vê a edição com o carimbo de agora — a escrita mais nova deste aparelho —, e
     ela vence e sobe no mesmo envio;
   · no app (_rehydrateFromLocal): o que ainda estiver pendente quando o aviso chega não volta ao
     valor do disco nem é dado por salvo; o autosave o grava depois, com carimbo novo. Numa lista
     por id (as do ARRAY_ID do auth.js) a edição é levada para cima da mescla: gravar a memória crua
     apagaria de vez o item que o outro aparelho criou, porque o setItem do auth.js registra lápide
     para cada id que some do disco. E a edição feita na fresta entre o setState da reidratação e o
     callback dele também não é dada por salva sem ter sido gravada.

   Roda o app INTEIRO com o auth.js de verdade e o Supabase falso de tests/auth-ipad-fixture.html,
   injetados como o build injeta (o mesmo arranjo de tests/login-sem-dados.mjs), com relógio fixo e
   contexto próprio por caso. A ordem é determinística mesmo com a máquina carregada: a leitura da
   nuvem do envio fica PRESA (__ct:selectPendente) e é solta no callback do setState da edição —
   logo depois do componentDidUpdate que armou o autosave, 500 ms antes de ele gravar. Só na origem
   http (semeia por base + '/__semente').

   Casos:
   (a) outro aparelho mudou SÓ as horas do plano; a pessoa troca a banca: a troca fica na tela e no
       aparelho, carimba com a hora e sobe no MESMO envio que trouxe as horas;
   (b) outro aparelho mudou a MESMA chave hoje de manhã: a edição da pessoa vence;
   (c) lista por id (revisões): a nuvem trouxe uma revisão nova, e a pessoa apagou uma e criou outra:
       ficam a da nuvem e a dela, a apagada não volta, e nenhuma lápide cai na da nuvem;
   (d) Redação digitada sem pausa durante o envio: a folha não volta atrás, e o texto inteiro fica
       no aparelho e sobe;
   (e) a metade do app sozinha (sem o aviso antes da mescla): (b) e (c) juntos — a edição sobrevive à
       reidratação, sobe no envio seguinte, e a lista não perde o item da nuvem;
   (f) a fresta do render, no app sem a camada de sync: uma reidratação sem edição não grava nada;
       a edição feita entre o setState da reidratação e o callback dele é gravada — numa chave que
       a nuvem não mudou e numa que ela acabou de mudar. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = fs.readFileSync(path.join(AQUI, 'auth-ipad-fixture.html'), 'utf8');
const I0 = FIXTURE.indexOf('<script>') + '<script>'.length;
const FALSO = FIXTURE.slice(I0, FIXTURE.indexOf('</script>', I0));
// a mesma ordem do build: React local, configuração do Supabase, cliente, auth.js — antes do app
const INJ = '\n<script src="./vendor/react.js"></script><script src="./vendor/react-dom.js"></script>\n'
  + '<script>' + FALSO + '</script>\n<script src="./auth.js"></script>\n';

const AGORA = new Date('2026-11-25T18:00:00.000Z');   // 15h em Brasília: longe da madrugada
const T = AGORA.getTime(), ONTEM = T - 86400000, MANHA = T - 2 * 3600000;
const U = { id: 'u1', email: 'pessoa@exemplo.com' };

const rev = (id, up, topic, dueDate) => ({ id, disc: 'Direito Civil', topic, color: '#2563EB', due: 1, dueDate, intervalo: 1, facilidade: 2.5, repeticoes: 0, up });
const R1 = rev('rv-1', ONTEM, 'Prescrição', '2026-11-26');
const R2 = rev('rv-2', MANHA, 'Usucapião', '2026-11-27');     // a que o outro aparelho criou hoje de manhã
const R3 = rev('rv-3', T, 'Decadência', '2026-11-28');        // a que a pessoa cria agora

const RASCUNHO = 'Rascunho inicial.';
// o que o aparelho e a nuvem têm em comum, carimbado ontem
const BASE = {
  'catedra:onboarded': '1',
  'catedra:bancaSel': JSON.stringify('fgv'),
  'catedra:planHoras': '30',
  'catedra:reviews': JSON.stringify([R1]),
  'catedra:redText': JSON.stringify(RASCUNHO),
  'catedra:redTextTs': String(ONTEM),
  'catedra:redTempoMs': '60000',
  // sem enunciado a Redação não monta a mesa (a folha só existe com uma questão em andamento)
  'catedra:redEnunciado': JSON.stringify('Enunciado da questão em andamento.'),
};

const nuvem = (data, kts) => ({ data: { data: Object.assign({}, data, { 'catedra:_kts': JSON.stringify(kts) }), updated_at: '2026-11-24T21:00:00.000Z' }, error: null });
const ktsDe = (data, t) => { const m = {}; Object.keys(data).forEach((k) => { m[k] = t; }); return m; };
// a nuvem que outro aparelho deixou hoje de manhã: a base de ontem com estas chaves trocadas
const nuvemDeManha = (mudou) => nuvem(Object.assign({}, BASE, mudou), Object.assign(ktsDe(BASE, ONTEM), ktsDe(mudou, MANHA)));

// O app servido, lido UMA vez e já com as injeções (ver tests/login-sem-dados.mjs: com route.fetch()
// cada carga era uma ida e volta pela rede do Playwright, e no WebKit uma delas ficou pendurada).
const APP = new Map();
async function appInjetado(base) {
  if (!APP.has(base)) APP.set(base, (await (await fetch(base + '/Catedra.dc.html')).text()).replace(/<head[^>]*>/i, (m) => m + INJ));
  return APP.get(base);
}

// A cadeia de envios pós-hidratação assenta: nada sujo, selo "salvo" e nenhuma chamada nova ao
// Supabase falso por 1,5 s. Sem esta espera, um envio dela ainda agendado leria a nuvem que o caso
// troca — foi assim que o (b) de login-sem-dados.mjs leu o envio errado na CI.
async function assentar(page, prazo = 30000) {
  const t0 = Date.now(); let n = -1, desde = Date.now();
  while (Date.now() - t0 < prazo) {
    const s = await page.evaluate(() => ({ sujo: localStorage.getItem('catedra:_dirty'), st: window.CatedraSync && window.CatedraSync.status,
      n: JSON.parse(localStorage.getItem('__ct:chamadas') || '[]').length }));
    if (s.n !== n) { n = s.n; desde = Date.now(); }
    else if (!s.sujo && s.st === 'salvo' && Date.now() - desde >= 1500) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

// Aparelho com sessão, os dados da BASE carimbados ontem e a nuvem igual: hidrata e assenta.
async function abrirAparelho(browser, base) {
  const corpo = await appInjetado(base);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'America/Sao_Paulo' });
  try {
    await ctx.route('**/Catedra.dc.html*', (route) => route.fulfill({ status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' }, body: corpo }).catch(() => {}));
    await ctx.route('**/juridico.js*', (route) => route.fulfill({ status: 200, headers: { 'content-type': 'text/javascript' },
      body: '/* sem documentos publicados: o aceite dos Termos não entra nestes casos */' }).catch(() => {}));
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('ERRO NA PÁGINA (sync-edicao-pendente):', String(e && e.message || e).split('\n')[0]));
    await page.clock.setFixedTime(AGORA);
    await page.goto(base + '/__semente');
    await page.evaluate(({ local, ct }) => {
      localStorage.clear(); sessionStorage.clear();
      for (const k of Object.keys(local)) localStorage.setItem(k, local[k]);
      for (const k of Object.keys(ct)) localStorage.setItem('__ct:' + k, JSON.stringify(ct[k]));
    }, { local: Object.assign({ 'catedra:_owner': U.id, 'catedra:auth': '1', 'catedra:_kts': JSON.stringify(ktsDe(BASE, ONTEM)) }, BASE),
         ct: { sessao: U, select: nuvem(BASE, ktsDe(BASE, ONTEM)) } });
    await page.goto(base + '/Catedra.dc.html');
    await page.waitForFunction(() => sessionStorage.getItem('catedra:hydrated') === '1' && !!window.__catedraApp
      && document.getElementById('catedra-auth-gate').style.display === 'none', null, { timeout: 60000 });
    if (!await assentar(page)) console.log('sync-edicao-pendente: a cadeia pós-hidratação não assentou em 30 s; o caso segue e as asserções dizem o que veio');
    return { ctx, page };
  } catch (e) { await ctx.close().catch(() => {}); throw e; }
}

// Um caso: abre, roda e fecha o contexto mesmo quando algo estoura — a exceção vira UMA falha com
// o nome do caso, e os seguintes rodam.
async function caso(ok, rotulo, abrir, corpo) {
  let aberto = null;
  try {
    aberto = await abrir();
    await corpo(aberto.page);
  } catch (e) {
    ok(false, rotulo + ' correu sem exceção (' + String(e && e.message || e).split('\n')[0].slice(0, 240) + ')');
  } finally {
    if (aberto) await aberto.ctx.close().catch(() => {});
  }
}

const nEnvios = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('__ct:chamadas') || '[]')
  .filter((c) => c.nome === 'upsert' && c.arg && c.arg.data).length);

// Troca a nuvem, agenda um envio (CatedraSync.push: 700 ms) e PRENDE a leitura dele; devolve se ela
// ficou presa. A edição e a soltura vêm depois, em editarESoltar.
async function prenderEnvio(page, linha) {
  await page.evaluate((linha) => {
    localStorage.setItem('__ct:selectPendente', 'true');
    localStorage.setItem('__ct:select', JSON.stringify(linha));
    window.CatedraSync.push();
  }, linha);
  return page.waitForFunction(() => (window.__ctSelectsPresos || []).length >= 1, null, { timeout: 15000 }).then(() => true, () => false);
}

// A edição entra pelo setState; no callback dele (o componentDidUpdate já armou o autosave de 500 ms)
// a leitura presa é solta, e a mescla roda na microtarefa seguinte — antes de o autosave gravar.
// Devolve o retrato daquele instante: o que estava no disco e na memória, e quantas leituras soltou.
// `tirar`: ids de revisão que a pessoa apaga; `por`: revisões que ela cria.
function editarESoltar(page, { set = {}, tirar = [], por = [] }) {
  return page.evaluate(({ set, tirar, por }) => new Promise((resolve) => {
    const app = window.__catedraApp, patch = Object.assign({}, set);
    if (tirar.length || por.length) patch.reviews = (app.state.reviews || []).filter((r) => tirar.indexOf(r.id) < 0).concat(por);
    app.setState(patch, () => {
      const ids = (a) => (a || []).map((r) => r.id).sort().join(',');
      const disco = {}; let dr = [];
      Object.keys(set).forEach((k) => { disco[k] = localStorage.getItem('catedra:' + k); });
      try { dr = JSON.parse(localStorage.getItem('catedra:reviews') || '[]'); } catch (_) {}
      const r = { disco, memoria: Object.assign({}, set), discoRev: ids(dr), memoriaRev: ids(app.state.reviews) };
      localStorage.removeItem('__ct:selectPendente');
      r.soltas = window.__ctResolverSelect();
      resolve(r);
    });
  }), { set, tirar, por });
}

// Espera um envio, depois do n-ésimo, que satisfaça `quer` ({chave: valor JSON exato} e/ou
// rev: ids ordenados). Sem ele no prazo, segue: as asserções dizem o que veio.
function esperarEnvio(page, n0, quer, prazo = 20000) {
  return page.waitForFunction(({ n0, quer }) => {
    const ids = (s) => { try { return (JSON.parse(s || '[]') || []).map((r) => r.id).sort().join(','); } catch (_) { return '?'; } };
    const ups = JSON.parse(localStorage.getItem('__ct:chamadas') || '[]').filter((c) => c.nome === 'upsert' && c.arg && c.arg.data).slice(n0);
    return ups.some((u) => Object.keys(quer).every((k) => k === 'rev' ? ids(u.arg.data['catedra:reviews']) === quer.rev : u.arg.data[k] === quer[k]));
  }, { n0, quer }, { timeout: prazo }).then(() => true, () => false);
}

// O que ficou: tela, disco, carimbos, lápides de revisão e os envios depois do n-ésimo.
function ler(page, n0) {
  return page.evaluate((n0) => {
    const ids = (s) => { try { return (JSON.parse(s || '[]') || []).map((r) => r.id).sort().join(','); } catch (_) { return '?'; } };
    const ups = JSON.parse(localStorage.getItem('__ct:chamadas') || '[]').filter((c) => c.nome === 'upsert' && c.arg && c.arg.data).slice(n0);
    const st = window.__catedraApp.state, kts = JSON.parse(localStorage.getItem('catedra:_kts') || '{}');
    let tomb = {}; try { tomb = JSON.parse(localStorage.getItem('catedra:_tomb') || '{}') || {}; } catch (_) {}
    const g = (k) => localStorage.getItem(k);
    return {
      tela: { banca: st.bancaSel, plan: st.planHoras, rev: (st.reviews || []).map((r) => r.id).sort().join(','), red: st.redText },
      disco: { banca: g('catedra:bancaSel'), plan: g('catedra:planHoras'), rev: ids(g('catedra:reviews')), red: g('catedra:redText') },
      kts: { banca: kts['catedra:bancaSel'] || 0, rev: kts['catedra:reviews'] || 0 },
      lapides: Object.keys((tomb.arr && tomb.arr['catedra:reviews']) || {}).sort().join(','),
      envios: ups.map((u) => ({ banca: u.arg.data['catedra:bancaSel'], plan: u.arg.data['catedra:planHoras'], rev: ids(u.arg.data['catedra:reviews']), red: u.arg.data['catedra:redText'] })),
    };
  }, n0);
}

export async function testarSyncEdicaoPendente(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const R = 'SYNC EDIÇÃO PENDENTE [' + motor + '] ';
  const browser = pageDaSuite.context().browser();
  const aparelho = () => abrirAparelho(browser, base);
  // CT_CASO=d (ou a,c) roda só esses casos, para o ciclo curto
  const so = (process.env.CT_CASO || '').split(',').filter(Boolean);
  const roda = (c) => !so.length || so.indexOf(c) >= 0;

  // (a) a nuvem mudou outra chave; a pessoa troca a banca na janela do autosave
  if (roda('a')) await caso(ok, R + '(a)', aparelho, async (page) => {
    const n0 = await nEnvios(page);
    const presa = await prenderEnvio(page, nuvemDeManha({ 'catedra:planHoras': '35' }));
    const pre = await editarESoltar(page, { set: { bancaSel: 'vunesp' } });
    ok(presa && pre.soltas >= 1 && pre.disco.bancaSel === '"fgv"',
      R + '(a) pré-condição: a mescla leu a nuvem com a troca só na memória (leitura presa=' + presa + ', soltas=' + pre.soltas + ', disco=' + pre.disco.bancaSel + ')');
    await esperarEnvio(page, n0, { 'catedra:bancaSel': '"vunesp"', 'catedra:planHoras': '35' });
    await page.waitForTimeout(800);
    const r = await ler(page, n0);
    ok(r.tela.banca === 'vunesp' && r.disco.banca === '"vunesp"',
      R + '(a) a troca da pessoa fica na tela e no aparelho (tela=' + r.tela.banca + ', disco=' + r.disco.banca + ')');
    ok(+r.tela.plan === 35 && r.disco.plan === '35',
      R + '(a) e o que o outro aparelho mudou também chega (horas: tela=' + r.tela.plan + ', disco=' + r.disco.plan + ')');
    ok(r.kts.banca === T, R + '(a) a troca carimba com a hora (carimbo=' + r.kts.banca + ', esperado ' + T + ')');
    const primeiro = r.envios[0] || {};
    ok(primeiro.banca === '"vunesp"' && primeiro.plan === '35',
      R + '(a) e sobe no MESMO envio que trouxe as horas (1º envio: banca=' + primeiro.banca + ', horas=' + primeiro.plan + ')');
  });

  // (b) a nuvem mudou a MESMA chave hoje de manhã; a pessoa escolhe outra agora
  if (roda('b')) await caso(ok, R + '(b)', aparelho, async (page) => {
    const n0 = await nEnvios(page);
    const presa = await prenderEnvio(page, nuvemDeManha({ 'catedra:bancaSel': JSON.stringify('fcc') }));
    const pre = await editarESoltar(page, { set: { bancaSel: 'vunesp' } });
    ok(presa && pre.soltas >= 1 && pre.disco.bancaSel === '"fgv"',
      R + '(b) pré-condição: a mescla leu a nuvem com a escolha só na memória (leitura presa=' + presa + ', soltas=' + pre.soltas + ', disco=' + pre.disco.bancaSel + ')');
    await esperarEnvio(page, n0, { 'catedra:bancaSel': '"vunesp"' });
    await page.waitForTimeout(800);
    const r = await ler(page, n0);
    const ultimo = r.envios[r.envios.length - 1] || {};
    ok(r.tela.banca === 'vunesp' && r.disco.banca === '"vunesp"' && ultimo.banca === '"vunesp"',
      R + '(b) a escolha da pessoa vence a da nuvem de hoje de manhã (tela=' + r.tela.banca + ', disco=' + r.disco.banca + ', enviada=' + ultimo.banca + ')');
    ok(r.kts.banca === T, R + '(b) com o carimbo de agora (carimbo=' + r.kts.banca + ', esperado ' + T + ')');
  });

  // (c) lista por id: a nuvem criou rv-2; a pessoa apaga rv-1 e cria rv-3
  if (roda('c')) await caso(ok, R + '(c)', aparelho, async (page) => {
    const n0 = await nEnvios(page);
    const presa = await prenderEnvio(page, nuvemDeManha({ 'catedra:reviews': JSON.stringify([R1, R2]) }));
    const pre = await editarESoltar(page, { tirar: ['rv-1'], por: [R3] });
    ok(presa && pre.soltas >= 1 && pre.discoRev === 'rv-1' && pre.memoriaRev === 'rv-3',
      R + '(c) pré-condição: a mescla leu a nuvem com a mudança só na memória (disco=' + pre.discoRev + ', memória=' + pre.memoriaRev + ', soltas=' + pre.soltas + ')');
    await esperarEnvio(page, n0, { rev: 'rv-2,rv-3' });
    await page.waitForTimeout(800);
    const r = await ler(page, n0);
    const ultimo = r.envios[r.envios.length - 1] || {};
    ok(r.tela.rev === 'rv-2,rv-3' && r.disco.rev === 'rv-2,rv-3' && ultimo.rev === 'rv-2,rv-3',
      R + '(c) ficam a revisão da nuvem e a da pessoa, e a apagada não volta (tela=' + r.tela.rev + ', disco=' + r.disco.rev + ', enviada=' + ultimo.rev + ')');
    ok(r.lapides.split(',').indexOf('rv-1') >= 0 && r.lapides.split(',').indexOf('rv-2') < 0,
      R + '(c) a lápide é só da que a pessoa apagou (lápides=' + (r.lapides || 'nenhuma') + ')');
  });

  // (d) Redação digitada sem pausa enquanto um envio traz outra chave da nuvem
  if (roda('d')) await caso(ok, R + '(d)', aparelho, async (page) => {
    const P1 = ' Primeira frase escrita.', P2 = ' Segunda frase, digitada sem parar.', P3 = ' Terceira, depois do envio.';
    const ATE2 = RASCUNHO + P1 + P2, TUDO = ATE2 + P3, FOLHA = '[data-red="folha"] textarea';
    await page.evaluate(() => window.__catedraGoView('redacao'));
    await page.waitForSelector(FOLHA, { timeout: 15000 });
    const n0 = await nEnvios(page);
    // amostra o tamanho da folha a cada 15 ms (uma amostra menor que a anterior = o texto voltou
    // atrás) e solta a leitura presa no fim da segunda frase, com a pessoa ainda digitando. O
    // ouvinte fica na window, na borbulha: roda depois do handler do React, com a tecla já na
    // memória do app — e solta ali mesmo (um setTimeout(0) chegou a atrasar 20 teclas no WebKit).
    await page.evaluate(({ FOLHA, alvo }) => {
      const ta = document.querySelector(FOLHA);
      ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
      window.__amostras = []; window.__amostrador = setInterval(() => { const t = document.querySelector(FOLHA); if (t) window.__amostras.push(t.value.length); }, 15);
      window.addEventListener('input', function soltar(e) {
        if (!e.target || !e.target.matches || !e.target.matches(FOLHA) || e.target.value.length < alvo) return;
        window.removeEventListener('input', soltar);
        window.__preRed = { disco: localStorage.getItem('catedra:redText'), memoria: window.__catedraApp.state.redText };
        localStorage.removeItem('__ct:selectPendente');
        window.__preRed.soltas = window.__ctResolverSelect();
      });
    }, { FOLHA, alvo: ATE2.length });
    await page.keyboard.type(P1, { delay: 20 });
    const presa = await prenderEnvio(page, nuvemDeManha({ 'catedra:planHoras': '35' }));
    await page.keyboard.type(P2, { delay: 20 });
    await page.keyboard.type(P3, { delay: 20 });
    await esperarEnvio(page, n0, { 'catedra:redText': JSON.stringify(TUDO) });
    await page.waitForTimeout(800);
    const x = await page.evaluate((FOLHA) => {
      clearInterval(window.__amostrador);
      const a = window.__amostras || []; let recuo = 0;
      for (let i = 1; i < a.length; i++) if (a[i] < a[i - 1]) recuo = Math.max(recuo, a[i - 1] - a[i]);
      return { pre: window.__preRed || null, recuo, folha: (document.querySelector(FOLHA) || {}).value };
    }, FOLHA);
    const r = await ler(page, n0);
    const pre = x.pre || {};
    let discoPre = null; try { discoPre = JSON.parse(pre.disco); } catch (_) {}
    // o que importa no instante da mescla: a segunda frase já digitada e ainda fora do disco
    ok(presa && pre.soltas >= 1 && String(pre.memoria || '').indexOf(ATE2) === 0 && String(discoPre || '').indexOf(P2.trim()) < 0,
      R + '(d) pré-condição: a mescla leu a nuvem com a segunda frase só na memória (leitura presa=' + presa + ', soltas=' + pre.soltas
      + ', memória ' + String(pre.memoria || '').length + ' car., disco ' + String(discoPre || '').length + ' car.)');
    ok(x.recuo === 0, R + '(d) a folha nunca volta atrás enquanto a pessoa digita (maior recuo: ' + x.recuo + ' caracteres)');
    let discoFim = ''; try { discoFim = String(JSON.parse(r.disco.red) || ''); } catch (_) {}
    ok(x.folha === TUDO && r.tela.red === TUDO && r.disco.red === JSON.stringify(TUDO),
      R + '(d) o texto inteiro fica na folha e no aparelho (folha ' + String(x.folha || '').length + ' e disco ' + discoFim.length + ' de ' + TUDO.length + ' car.)');
    const ultimo = r.envios[r.envios.length - 1] || {};
    ok(ultimo.red === JSON.stringify(TUDO), R + '(d) e sobe inteiro (enviado: ' + String(ultimo.red || '').length + ' de ' + JSON.stringify(TUDO).length + ' car.)');
    const primeiro = r.envios[0] || {};
    ok(String(primeiro.red || '').indexOf(P2.trim()) >= 0 && primeiro.plan === '35',
      R + '(d) a segunda frase, ainda não gravada, já vai no envio que trouxe a nuvem (1º envio: ' + String(primeiro.red || '').length + ' car., horas=' + primeiro.plan + ')');
  });

  // (e) só a metade do app: sem o aviso 'catedra:antesdamescla', a reidratação protege sozinha
  if (roda('e')) await caso(ok, R + '(e)', aparelho, async (page) => {
    await page.evaluate(() => { const app = window.__catedraApp; if (app._onAntesDaMescla) window.removeEventListener('catedra:antesdamescla', app._onAntesDaMescla); });
    const n0 = await nEnvios(page);
    const presa = await prenderEnvio(page, nuvemDeManha({ 'catedra:bancaSel': JSON.stringify('fcc'), 'catedra:reviews': JSON.stringify([R1, R2]) }));
    const pre = await editarESoltar(page, { set: { bancaSel: 'vunesp' }, tirar: ['rv-1'], por: [R3] });
    await esperarEnvio(page, n0, { 'catedra:bancaSel': '"vunesp"', rev: 'rv-2,rv-3' });
    await page.waitForTimeout(800);
    const r = await ler(page, n0);
    const primeiro = r.envios[0] || {}, ultimo = r.envios[r.envios.length - 1] || {};
    ok(presa && pre.soltas >= 1 && pre.disco.bancaSel === '"fgv"' && primeiro.banca === '"fcc"' && primeiro.rev === 'rv-1,rv-2',
      R + '(e) pré-condição: sem o aviso antes da mescla, o envio da corrida leva só a nuvem (1º envio: banca=' + primeiro.banca + ', revisões=' + primeiro.rev + ')');
    ok(r.tela.banca === 'vunesp' && r.disco.banca === '"vunesp"' && ultimo.banca === '"vunesp"' && r.kts.banca === T,
      R + '(e) a escolha da pessoa sobrevive à reidratação e sobe no envio seguinte (tela=' + r.tela.banca + ', disco=' + r.disco.banca + ', enviada=' + ultimo.banca + ', carimbo=' + r.kts.banca + ')');
    ok(r.tela.rev === 'rv-2,rv-3' && r.disco.rev === 'rv-2,rv-3' && ultimo.rev === 'rv-2,rv-3',
      R + '(e) a lista leva a mudança da pessoa para cima da mescla (tela=' + r.tela.rev + ', disco=' + r.disco.rev + ', enviada=' + ultimo.rev + ')');
    ok(r.lapides.split(',').indexOf('rv-1') >= 0 && r.lapides.split(',').indexOf('rv-2') < 0,
      R + '(e) e nenhuma lápide cai na revisão que o outro aparelho criou (lápides=' + (r.lapides || 'nenhuma') + ')');
  });

  for (const evento of ['pagehide', 'visibilitychange']) {
    if (!roda('g')) continue;
    await caso(ok, R + '(g) ' + evento, aparelho, async (page) => {
      const campo = '[data-red="folha"] textarea';
      await page.evaluate(() => window.__catedraGoView('redacao'));
      await page.waitForSelector(campo);
      const texto = evento === 'pagehide' ? 'Última frase antes de fechar.' : '';
      const resultado = await page.evaluate(({ campo, evento, texto }) => {
        const folha = document.querySelector(campo);
        folha.value = texto;
        folha.dispatchEvent(new Event('input', { bubbles: true }));
        const lerTexto = () => JSON.parse(localStorage.getItem('catedra:redText'));
        const anterior = lerTexto();
        if (evento === 'visibilitychange') {
          Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
          document.dispatchEvent(new Event(evento));
        } else {
          window.dispatchEvent(new Event(evento));
        }
        const gravado = lerTexto();
        window.dispatchEvent(new Event('pagehide'));
        return { anterior, gravado, repetido: lerTexto() };
      }, { campo, evento, texto });
      ok(resultado.anterior !== texto && resultado.gravado === texto && resultado.repetido === texto,
        R + '(g) ' + evento + ' grava a última entrada antes do temporizador');
      const contexto = page.context();
      await page.close();
      const nova = await contexto.newPage();
      await nova.goto(base + '/__semente');
      ok(await nova.evaluate(() => JSON.parse(localStorage.getItem('catedra:redText'))) === texto,
        R + '(g) ' + evento + ' conserva a edição ao reabrir o armazenamento');
      // Reabre o host real sem injetar o Supabase da fixture. A folha só pode reler o aparelho.
      await nova.route('**/Catedra.dc.html*', route => route.continue());
      await nova.goto(base + '/Catedra.dc.html');
      await nova.waitForFunction(() => !!window.__catedraApp);
      ok(await nova.evaluate(() => window.__catedraApp.state.redText) === texto,
        R + '(g) ' + evento + ' recupera a resposta no app sem consultar a nuvem');
      if (texto) {
        await nova.evaluate(() => window.__catedraGoView('redacao'));
        await nova.waitForSelector(campo, { timeout: 15000 });
        ok(await nova.locator(campo).inputValue() === texto,
          R + '(g) a folha reaberta exibe a última frase');
      }
    });
  }

  // (f) a fresta do render, no app sem a camada de sync (a nuvem é imitada como em
  //     tests/sync-memoria-velha.mjs: grava a chave e avisa)
  if (roda('f')) await caso(ok, R + '(f)', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    try {
      const page = await ctx.newPage();
      await page.goto(base + '/__semente');
      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
        localStorage.setItem('catedra:bancaSel', JSON.stringify('fgv')); localStorage.setItem('catedra:planHoras', '30');
      });
      await page.goto(base + '/Catedra.dc.html');
      await page.waitForFunction(() => !!window.__catedraApp, null, { timeout: 30000 });
      // o autosave da abertura assenta: nenhuma chave suja (e uma folga para o que ele arma)
      await page.waitForFunction(() => { const a = window.__catedraApp, L = a._lastSaved || {};
        return a._autosaveKeys().every((k) => a.state[k] === L[k]); }, null, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(700);
      return { ctx, page };
    } catch (e) { await ctx.close().catch(() => {}); throw e; }
  }, async (page) => {
    const r = await page.evaluate(async () => {
      const w = (ms) => new Promise((res) => setTimeout(res, ms));
      const ate = async (cond, prazo) => { const t0 = Date.now(); while (Date.now() - t0 < prazo) { if (cond()) return true; await w(50); } return cond(); };
      const g = (k) => localStorage.getItem(k);
      const app = window.__catedraApp;
      const gravadas = [], orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) { if (this === localStorage && String(k).indexOf('catedra:') === 0) gravadas.push(k); return orig.call(this, k, v); };
      try {
        // 1) reidratação sem edição nenhuma: adota e não grava nada. Ausência pede sentinela: o
        //    setState vazio só volta depois do commit da reidratação; dali, nenhuma chave suja (sem
        //    elas o autosave nem arma) e nenhuma gravação num prazo bem maior que os 500 ms dele
        orig.call(localStorage, 'catedra:planHoras', '35');
        window.dispatchEvent(new CustomEvent('catedra:synced'));
        await new Promise((res) => app.setState({}, res));
        const L = app._lastSaved || {};
        const sujas = app._autosaveKeys().filter((k) => app.state[k] !== L[k]).join(',');
        await w(1200);
        const semEdicao = { gravadas: gravadas.splice(0).join(','), sujas, plan: app.state.planHoras };
        // 2) a edição na fresta: no MESMO tique do aviso, antes de o React pintar a reidratação —
        //    uma chave que a nuvem não mudou (banca) e a que ela acabou de mudar (horas)
        orig.call(localStorage, 'catedra:planHoras', '36');
        window.dispatchEvent(new CustomEvent('catedra:synced'));
        app.setState({ bancaSel: 'vunesp', planHoras: 40 });
        await ate(() => g('catedra:bancaSel') === '"vunesp"' && g('catedra:planHoras') === '40', 10000);
        return { semEdicao, banca: g('catedra:bancaSel'), plan: g('catedra:planHoras'), tela: { banca: app.state.bancaSel, plan: app.state.planHoras } };
      } finally { Storage.prototype.setItem = orig; }
    });
    ok(+r.semEdicao.plan === 35 && r.semEdicao.gravadas === '' && r.semEdicao.sujas === '',
      R + '(f) a reidratação sem edição adota a nuvem e não grava nada por conta própria (horas=' + r.semEdicao.plan
      + ', gravadas=' + (r.semEdicao.gravadas || 'nenhuma') + ', sujas=' + (r.semEdicao.sujas || 'nenhuma') + ')');
    ok(r.banca === '"vunesp"' && r.tela.banca === 'vunesp',
      R + '(f) a edição feita na fresta do render é gravada, numa chave que a nuvem não mudou (disco=' + r.banca + ', tela=' + r.tela.banca + ')');
    ok(r.plan === '40' && +r.tela.plan === 40,
      R + '(f) …e numa que a nuvem acabou de mudar: a edição é mais nova (disco=' + r.plan + ', tela=' + r.tela.plan + ')');
  });
}
