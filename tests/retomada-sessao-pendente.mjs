/* Rascunho da sessão do Ciclo Magistratura: o input real deve sobreviver ao reload
   mesmo com o cronômetro pausado. Cada caso nasce em um contexto descartável, com
   dados sintéticos antes do boot e relógio no mesmo dia (a expiração não é alterada).
   CT_BROWSER=chromium|webkit; CT_PORT permite executar em paralelo com outros testes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import '../ciclo-magistratura.js';
import { iniciarServidor, lancarNavegador } from './_infra.mjs';

const M = globalThis.CT_CMAG;
const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Porto_Velho' }).format(new Date());
const relogio = new Date(hoje + 'T14:00:00-04:00');
const ANTIGO = { ponto: 'Página antiga 10', proximo: 'Ação antiga' };
const NOVO = { ponto: 'Página nova 42', proximo: 'Continuar no exemplo' };
const ETAPA1 = { ponto: 'Caderno: premissa pendente', proximo: 'Reconstruir a premissa' };
let cmag = M.definir(M.vazio(), 'const', 'ass', 'Controle de constitucionalidade');
cmag = M.guardarRetomada(cmag, 'const', 'a2', 'ponto', ANTIGO.ponto);
cmag = M.guardarRetomada(cmag, 'const', 'a2', 'proximo', ANTIGO.proximo);
const cmagOutraEtapa = M.guardarRetomada(
  M.guardarRetomada(cmag, 'const', 'a1', 'ponto', ETAPA1.ponto), 'const', 'a1', 'proximo', ETAPA1.proximo);
const volta = M.gerarVolta(cmag, 1, hoje);
const bloco = volta.blocos.find(b => b.cmagId === 'const');
const atvKey = 'vt|' + bloco.id;
const edital = [{ id: 'm003-edital', disc: 'Direito Constitucional', peso: 2, questoes: 10,
  topics: [{ id: 'm003-topico', tid: 't-controle-de-constitucionalidade', name: 'Controle de constitucionalidade', done: false, subs: [] }] }];
const sessions = [{ id: 'm003-sessao-anterior', ts: relogio.getTime() - 864e5, date: hoje,
  disc: 'Direito Civil', topico: 'Sessão sintética anterior', categoria: 'Teoria', categorias: ['Teoria'], min: 25, questoes: 0, acertos: 0 }];
const timerBase = { sec: 600, studied: 600, mode: 'livre', phase: 'foco', cycles: 0,
  running: false, ts: relogio.getTime(), d: hoje, pf: 25, pb: 5, ps: 0, pd: relogio.getTime(),
  atv: { atvKey, disc: bloco.disc, topico: bloco.topico, cmEtapa: 'a2', categoria: 'Teoria', categorias: ['Teoria'] } };
const { srv, url } = await iniciarServidor(process.cwd(), +(process.env.CT_PORT || 8176));
const { browser, motor } = await lancarNavegador();

const origem = { conta: '', escopo: 'catedra:blocks', atvKey, etapa: 'a2' };
const comRascunho = (rascunho = { ...origem, ...NOVO }) => ({
  ...timerBase, atv: { ...timerBase.atv, cmRascunho: rascunho }
});

async function preparar(timer = timerBase, extras = {}) {
  const ctx = await browser.newContext({ viewport: { width: 820, height: 1180 }, timezoneId: 'America/Porto_Velho' });
  const page = await ctx.newPage(), erros = [];
  page.on('pageerror', e => erros.push(e.message));
  await page.clock.install({ time: relogio });
  await page.goto(url + '/__semente');
  await page.evaluate(({ cmag, volta, edital, sessions, timer, extras }) => {
    localStorage.clear();
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica'); set('cycleMode', 'magistratura');
    set('cmag', cmag); set('cicloVolta', volta);
    set('blocks', volta.blocos.map(b => ({ ...b, voltaId: b.id }))); set('blocksDate', timer.d);
    set('edital', edital); set('sessions', sessions);
    set('reviews', []); set('errors', []);
    for (const [k, v] of Object.entries(extras)) set(k, v);
    localStorage.setItem('ct_timer', JSON.stringify(timer));
  }, { cmag, volta, edital, sessions, timer, extras });
  await page.goto(url + '/Catedra.dc.html');
  await page.waitForFunction(() => window.__catedraApp && window.CT_CMAG);
  await page.waitForFunction(() => window.__catedraApp.state.timerSeconds === 600);
  await page.evaluate(() => window.__catedraApp.setState({ view: 'inicio' }));
  await page.getByRole('region', { name: 'Retomar ciclo Magistratura' }).waitFor();
  return { ctx, page, erros };
}

async function abrirRegistro(page) {
  await page.getByRole('region', { name: 'Retomar ciclo Magistratura' })
    .getByRole('button', { name: 'Registrar tempo', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Registrar sessão', exact: true });
  await dialog.waitFor();
  return dialog;
}
const campos = dialog => ({
  ponto: dialog.getByRole('textbox', { name: 'Onde parei nesta sessão', exact: true }),
  proximo: dialog.getByRole('textbox', { name: 'Próxima ação desta sessão', exact: true })
});
async function ler(page) {
  return page.evaluate(() => {
    const a = window.__catedraApp, s = a.state, d = s.sessionDraft;
    return { timerSeconds: s.timerSeconds, studiedSeconds: s.studiedSeconds, timerRunning: s.timerRunning,
      atvKey: d.atvKey, cmEtapa: d.cmEtapa, ponto: d.cmPonto, proximo: d.cmProximo,
      cmag: a._cm(), cicloVolta: s.cicloVolta, edital: s.edital, sessions: s.sessions,
      timer: JSON.parse(localStorage.getItem('ct_timer') || 'null') };
  });
}
function preservouEstudo(antes, depois) {
  for (const k of ['timerSeconds', 'studiedSeconds', 'timerRunning', 'atvKey', 'cmEtapa', 'cmag', 'cicloVolta', 'edital', 'sessions'])
    assert.deepEqual(depois[k], antes[k], 'Preservar ' + k + ' sem registrar sessão');
  assert.equal(depois.sessions.length, 1, 'Nenhuma sessão foi registrada pela edição ou recarga');
  assert.equal(!!depois.cmag.st.const.d.a2, false, 'A etapa continua aberta');
}
async function recarregar(page) {
  await page.reload();
  await page.waitForFunction(() => window.__catedraApp && window.CT_CMAG && window.__catedraApp.state.timerSeconds === 600);
  await page.evaluate(() => window.__catedraApp.setState({ view: 'inicio' }));
}
async function preencher(page, valores) {
  const input = campos(await abrirRegistro(page));
  await input.ponto.fill(valores.ponto);
  await input.proximo.fill(valores.proximo);
  await page.waitForFunction(({ ponto, proximo }) => {
    const d = window.__catedraApp.state.sessionDraft;
    return d.cmPonto === ponto && d.cmProximo === proximo;
  }, valores);
  // Cronômetro pausado: nenhum tick nem chamada do teste salva o input por acidente.
  await page.waitForTimeout(1200);
  return input;
}
function snapshotGravado(estado, valores) {
  const r = estado.timer?.atv?.cmRascunho;
  assert.ok(r && typeof r === 'object', 'O input pausado grava o rascunho local antes do reload');
  assert.equal(r.ponto, valores.ponto, 'O snapshot local contém o ponto digitado');
  assert.equal(r.proximo, valores.proximo, 'O snapshot local contém a próxima ação digitada');
}

async function principal() {
  const { ctx, page, erros } = await preparar();
  try {
    const antes = await ler(page), dialog = await abrirRegistro(page), input = campos(dialog);
    assert.equal(await input.ponto.inputValue(), ANTIGO.ponto, 'Fixture reabre o checkpoint conhecido');
    await input.ponto.fill(NOVO.ponto); await input.proximo.fill(NOVO.proximo);
    await page.waitForTimeout(1200);
    const aposInput = await ler(page);
    preservouEstudo(antes, aposInput);
    snapshotGravado(aposInput, NOVO);
    await recarregar(page);
    const depois = await ler(page), reaberto = campos(await abrirRegistro(page));
    const visivel = { ponto: await reaberto.ponto.inputValue(), proximo: await reaberto.proximo.inputValue() };
    console.log(JSON.stringify({ motor, caso: 'principal', aposInput: { timer: aposInput.timer, ponto: aposInput.ponto, proximo: aposInput.proximo }, aposReload: { timer: depois.timer, ...visivel } }));
    preservouEstudo(antes, depois);
    assert.deepEqual(visivel, NOVO, 'Os dois campos digitados na UI sobrevivem ao reload com o timer pausado');
    if (process.env.CT_EVIDENCIAS) {
      const pasta = path.resolve(process.env.CT_EVIDENCIAS === '1' ? 'work/mission-003' : process.env.CT_EVIDENCIAS);
      assert.ok(pasta === path.resolve('work/mission-003') || pasta.startsWith(path.resolve('work/mission-003') + path.sep),
        'Capturas deste teste ficam em work/mission-003');
      fs.mkdirSync(pasta, { recursive: true });
      await page.getByRole('dialog', { name: 'Registrar sessão', exact: true })
        .screenshot({ path: path.join(pasta, 'rascunho-preservado-' + motor + '.png') });
    }
    assert.deepEqual(erros, [], 'A página não produziu exceções');
  } finally { await ctx.close(); }
}

async function apagar() {
  const { ctx, page, erros } = await preparar();
  try {
    const antes = await ler(page), vazio = { ponto: '', proximo: '' };
    await preencher(page, vazio);
    snapshotGravado(await ler(page), vazio);
    await recarregar(page);
    const depois = await ler(page), input = campos(await abrirRegistro(page));
    assert.equal(await input.ponto.inputValue(), '', 'Apagar o ponto é uma intenção persistida');
    assert.equal(await input.proximo.inputValue(), '', 'Apagar a próxima ação não ressuscita o checkpoint');
    preservouEstudo(antes, depois);
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
}

async function restaurarSnapshot(nome, timer, esperado, extras = {}) {
  const { ctx, page, erros } = await preparar(timer, extras);
  try {
    const estado = await ler(page), input = campos(await abrirRegistro(page));
    assert.deepEqual({ ponto: await input.ponto.inputValue(), proximo: await input.proximo.inputValue() }, esperado, nome);
    assert.equal(estado.timerSeconds, 600, nome + ': mantém o tempo');
    assert.equal(estado.studiedSeconds, 600, nome + ': mantém o tempo estudado');
    assert.equal(estado.timerRunning, false, nome + ': permanece pausado');
    assert.equal(estado.atvKey, atvKey, nome + ': mantém o vínculo');
    assert.equal(estado.cmEtapa, 'a2', nome + ': mantém a etapa');
    assert.deepEqual(estado.sessions, sessions, nome + ': não cria sessão');
    assert.deepEqual(estado.edital, edital, nome + ': não altera o edital');
    assert.deepEqual(estado.cmag, extras.cmag || cmag, nome + ': não altera o checkpoint salvo');
    assert.deepEqual(erros, [], nome + ': sem exceções');
  } finally { await ctx.close(); }
}

async function legado() {
  assert.equal(Object.hasOwn(timerBase.atv, 'cmRascunho'), false);
  await restaurarSnapshot('Timer legado sem rascunho usa checkpoint do ciclo', timerBase, ANTIGO);
  await restaurarSnapshot('Timer legado usa a etapa restaurada mesmo quando outra etapa tem checkpoint',
    timerBase, ANTIGO, { cmag: cmagOutraEtapa });
}

async function limites() {
  const longo = { ponto: 'P'.repeat(900), proximo: 'A'.repeat(1200) };
  await restaurarSnapshot('Snapshot longo respeita os limites dos campos', comRascunho({ ...origem, ...longo }),
    { ponto: longo.ponto.slice(0, 300), proximo: longo.proximo.slice(0, 500) });
  await restaurarSnapshot('Tipos inválidos voltam ao checkpoint sem quebrar o boot',
    comRascunho({ ...origem, ponto: { texto: 'inválido' }, proximo: 42 }), ANTIGO);
  await restaurarSnapshot('Snapshot malformado não quebra o boot', comRascunho(['inválido']), ANTIGO);
}

async function guardas() {
  await restaurarSnapshot('Snapshot válido pertence à mesma origem', comRascunho(), NOVO);
  for (const [k, v] of Object.entries({ conta: 'outra-conta', escopo: 'catedra:blocks@saude', atvKey: 'vt|outro-bloco', etapa: 'b2' }))
    await restaurarSnapshot('Rascunho de outra origem não contamina ' + k,
      comRascunho({ ...origem, ...NOVO, [k]: v }), ANTIGO);
  await restaurarSnapshot('Trocar a conta local impede reaproveitar notas da origem anterior',
    comRascunho(), ANTIGO, { _owner: 'conta-sintetica-destino' });
}

async function origemViva() {
  for (const tipo of ['conta', 'area', 'concurso']) {
    const { ctx, page, erros } = await preparar(timerBase,
      tipo === 'conta' ? { _owner: 'conta-sintetica-origem' } : {});
    try {
      await preencher(page, NOVO);
      const preenchido = await ler(page);
      snapshotGravado(preenchido, NOVO);
      if (tipo === 'conta') assert.equal(preenchido.timer.atv.cmRascunho.conta, 'conta-sintetica-origem',
        'A corrida começa com um dono local antigo conhecido');
      await page.evaluate(tipo => new Promise(resolve => {
        const a = window.__catedraApp;
        if (tipo === 'conta') {
          const user = { id: 'conta-sintetica-destino', email: 'destino@example.invalid' };
          // O auth anuncia o usuário antes de atualizar _owner; pagehide pode ocorrer
          // nessa janela. A identidade autenticada deve prevalecer sobre o dono velho.
          window.CatedraAuth = { ...(window.CatedraAuth || {}), user };
          window.dispatchEvent(new CustomEvent('catedra:authuser', { detail: user }));
          a._saveTimer();
          window.__snapshotDepoisDaTroca = JSON.parse(localStorage.getItem('ct_timer'));
          localStorage.setItem('catedra:_owner', user.id);
          a.setState({ registroModo: 'estudo' }, resolve);
        } else {
          a.setState(tipo === 'area' ? { areaEstudo: 'saude' } : { editalAtivo: 'concurso-sintetico-destino' }, () => {
            a._saveTimer();
            window.__snapshotDepoisDaTroca = JSON.parse(localStorage.getItem('ct_timer'));
            resolve();
          });
        }
      }), tipo);
      await page.waitForFunction(() => {
        const d = window.__catedraApp.state.sessionDraft;
        return d._cmRascunhoOrigem === null && d.cmPonto === '' && d.cmProximo === '';
      });
      const resultado = await page.evaluate(() => {
        const a = window.__catedraApp;
        a._saveTimer();
        return { primeiro: window.__snapshotDepoisDaTroca,
          final: JSON.parse(localStorage.getItem('ct_timer')), sessions: a.state.sessions,
          timerSeconds: a.state.timerSeconds, studiedSeconds: a.state.studiedSeconds };
      });
      assert.equal(resultado.primeiro.atv?.cmRascunho, undefined, tipo + ': primeira gravação não reatribui notas');
      assert.equal(resultado.final.atv?.cmRascunho, undefined, tipo + ': gravações seguintes não reatribuem notas');
      assert.equal(resultado.timerSeconds, 600); assert.equal(resultado.studiedSeconds, 600);
      assert.deepEqual(resultado.sessions, sessions, tipo + ': não registra tempo durante a troca');
      assert.deepEqual(erros, []);
    } finally { await ctx.close(); }
  }
}

async function desvincular() {
  for (const acao of ['avulsa', 'disciplina']) {
    const { ctx, page, erros } = await preparar();
    try {
      await preencher(page, NOVO);
      const dialog = page.getByRole('dialog', { name: 'Registrar sessão', exact: true });
      if (acao === 'avulsa') await dialog.getByRole('button', { name: 'Registrar fora do ciclo', exact: true }).click();
      else {
        const detalhes = dialog.getByRole('button', { name: 'Mais detalhes', exact: true });
        if (await detalhes.count() && await detalhes.getAttribute('aria-expanded') !== 'true') await detalhes.click();
        await dialog.getByRole('combobox', { name: 'Disciplina', exact: true }).selectOption('__outra__');
      }
      await page.waitForFunction(() => window.__catedraApp.state.sessionDraft.atvKey === '');
      const estado = await ler(page);
      assert.equal(estado.ponto, '', acao + ': campo do ciclo foi limpo');
      assert.equal(estado.proximo, '', acao + ': próxima ação foi limpa');
      assert.equal(estado.cmEtapa, '', acao + ': etapa foi desvinculada');
      assert.equal(estado.timer.atv, null, acao + ': persistência não conserva o vínculo anterior');
      assert.equal(estado.timerSeconds, 600); assert.equal(estado.studiedSeconds, 600);
      assert.deepEqual(estado.sessions, sessions, acao + ': não registra sessão');
      assert.deepEqual(estado.cmag, cmag, acao + ': não grava checkpoint definitivo');
      assert.deepEqual(erros, []);
    } finally { await ctx.close(); }
  }
}

async function etapa() {
  const { ctx, page, erros } = await preparar(timerBase, { cmag: cmagOutraEtapa });
  try {
    const antes = await ler(page);
    await preencher(page, NOVO);
    const dialog = page.getByRole('dialog', { name: 'Registrar sessão', exact: true });
    await dialog.getByRole('combobox', { name: 'Etapa do ciclo', exact: true }).selectOption('a1');
    await page.waitForFunction(() => window.__catedraApp.state.sessionDraft.cmEtapa === 'a1');
    const trocou = await ler(page);
    assert.equal(trocou.ponto, ETAPA1.ponto, 'Trocar etapa abre o checkpoint da etapa de destino');
    assert.equal(trocou.proximo, ETAPA1.proximo);
    snapshotGravado(trocou, ETAPA1);
    assert.equal(trocou.timer.atv.cmRascunho.etapa, 'a1', 'Snapshot recebe a origem da etapa de destino');
    await recarregar(page);
    const depois = await ler(page), input = campos(await abrirRegistro(page));
    assert.equal(depois.cmEtapa, 'a1');
    assert.equal(await input.ponto.inputValue(), ETAPA1.ponto);
    assert.equal(await input.proximo.inputValue(), ETAPA1.proximo);
    for (const k of ['timerSeconds', 'studiedSeconds', 'atvKey', 'cmag', 'sessions', 'edital'])
      assert.deepEqual(depois[k], antes[k], 'Trocar etapa não altera ' + k);
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
}

async function salvar() {
  const { ctx, page, erros } = await preparar();
  try {
    const antes = await ler(page);
    await preencher(page, NOVO);
    snapshotGravado(await ler(page), NOVO);
    await recarregar(page);
    const dialog = await abrirRegistro(page);
    await dialog.getByRole('button', { name: 'Registrar sessão', exact: true }).click();
    await page.waitForFunction(() => window.__catedraApp.state.sessions.length === 2);
    const salvo = await ler(page), rec = salvo.sessions[0];
    assert.equal(rec.min, 10, 'Registro usa os 600s preservados');
    assert.equal(rec.atvKey, atvKey, 'Registro mantém a atividade');
    assert.equal(rec.cmEtapa, 'a2', 'Registro mantém a etapa estudada');
    assert.equal(rec.cmPonto, NOVO.ponto); assert.equal(rec.cmProximo, NOVO.proximo);
    assert.equal(rec.concluiu, false, 'Registrar tempo não conclui a atividade');
    assert.deepEqual(salvo.sessions[1], sessions[0], 'Sessão anterior preservada');
    const sessoesLocais = await page.evaluate(() => JSON.parse(
      localStorage.getItem(window.__catedraApp._chave('sessions')) || 'null'));
    assert.deepEqual(sessoesLocais, salvo.sessions, 'O registro e seus textos são gravados localmente antes do autosave do ciclo');
    assert.equal(salvo.timer, null, 'Registro explícito remove ct_timer');
    assert.equal(salvo.timerSeconds, 0); assert.equal(salvo.studiedSeconds, 0); assert.equal(salvo.timerRunning, false);
    assert.equal(salvo.cmag.st.const.retomadas.a2.ponto, NOVO.ponto, 'O checkpoint definitivo recebe o ponto');
    assert.equal(salvo.cmag.st.const.retomadas.a2.proximo, NOVO.proximo, 'O checkpoint definitivo recebe a próxima ação');
    assert.deepEqual(salvo.cmag.st.const.d, antes.cmag.st.const.d, 'A etapa continua aberta');
    assert.equal(salvo.cmag.vez, antes.cmag.vez, 'O registro não avança a matéria');
    assert.deepEqual(salvo.edital, antes.edital, 'O registro parcial não conclui o edital');
    // O checkpoint do ciclo usa o autosave existente, com debounce. Confirma a
    // gravação aplicada antes de testar o próximo boot, como ciclo-retomada.mjs.
    await page.waitForFunction(({ ponto, proximo }) => {
      const c = JSON.parse(localStorage.getItem('catedra:cmag') || '{}');
      const r = c.st?.const?.retomadas?.a2;
      return r?.ponto === ponto && r?.proximo === proximo;
    }, NOVO);
    await page.reload();
    await page.waitForFunction(() => window.__catedraApp && window.CT_CMAG);
    const reaberto = await ler(page);
    assert.equal(reaberto.sessions.length, 2, 'Reabrir não registra a mesma sessão de novo');
    assert.equal(reaberto.timer, null, 'O timer consumido continua removido depois do reload');
    assert.equal(reaberto.timerSeconds, 0); assert.equal(reaberto.studiedSeconds, 0);
    assert.deepEqual(reaberto.cmag.st.const.d, antes.cmag.st.const.d);
    assert.equal(reaberto.cmag.st.const.retomadas.a2.ponto, NOVO.ponto);
    assert.equal(reaberto.cmag.st.const.retomadas.a2.proximo, NOVO.proximo);
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
}

try {
  const casos = { principal, apagar, legado, limites, guardas, origemViva, desvincular, etapa, salvar };
  const nomes = process.env.CT_CASE ? process.env.CT_CASE.split(',') : Object.keys(casos);
  for (const nome of nomes) {
    assert.ok(casos[nome], 'CT_CASE conhecido: ' + nome);
    await casos[nome]();
    console.log(motor + ': PASS ' + nome);
  }
  console.log(motor + ': rascunho pendente validado em ' + nomes.length + ' caso(s).');
} finally { await browser.close(); await new Promise(r => srv.close(r)); }
