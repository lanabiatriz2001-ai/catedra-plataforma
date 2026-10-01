/* REVISÃO → MATERIAL DE ORIGEM (item 4)

   O erro de simulado já conhece o dispositivo ou o julgado que o explica. Este roteiro
   prova o fio completo no app REAL: a referência chega à revisão, aparece como ação tanto
   na lista quanto na sessão guiada e percorre a ponte ctAbrirAcervo até a tela e a busca
   corretas. O contexto é próprio porque a semente e a fila de revisões não podem vazar para
   o restante da suíte.

   ESPERAS (01/10/2026). Este módulo caiu uma vez na CI, só no WebKit, no último caso — a pílula
   do JURIS que devolve à sessão guiada —, e passou no rerun sem nenhuma mudança. Não reproduziu
   aqui nem com CPU estrangulada a 20× nem com três WebKits em paralelo: é o runner, mais lento e
   frio que esta máquina. O que havia de frágil virou espera de CONDIÇÃO (de 50 em 50 ms, com
   teto), como no resto da suíte:
   · o toque na pílula tinha teto de 20 s para o iframe do JURIS montar COM o acervo (14,6 mil
     verbetes) e, se estourasse, o `catch` engolia o motivo: a asserção falhava sem dizer por quê.
     Agora o teto é de 45 s e o motivo entra no rótulo;
   · a volta da sessão esperava 5 s fixos (100 × 50 ms); agora espera até 15 s e diz quanto levou,
     para o log mostrar se a margem está encolhendo;
   · as esperas fixas depois de clicar (900 ms para a ponte entregar o ctAbrirAcervo) e depois de
     encerrar o simulado misto (1400 ms para o autosave de 500 ms gravar) passam a esperar a
     mensagem, a view e a chave no armazenamento.
   O que mede altura (44 px) e identidade de fila segue igual: isso não é tempo, é contrato. */

import path from 'path';
import { pathToFileURL } from 'url';

export async function testarRevisaoFonte(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const R = 'REVISÃO/FONTE [' + motor + '] ';
  const browser = pageDaSuite.context().browser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  try { await roteiro(page, base, ok, R); }
  finally { await ctx.close(); }
}

async function roteiro(page, base, ok, R) {
  // A rota inexistente mantém a mesma origem e evita a corrida com o autosave do app aberto.
  await page.goto(base + '/__semente');
  await page.evaluate(() => {
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    localStorage.clear();
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
    set('reviews', []); set('errors', []); set('fc', []); set('sessions', []);
    set('edital', [
      { disc: 'Direito Processual Civil', peso: 3, color: '#2563eb', topics: [] },
      { disc: 'Direito Constitucional', peso: 3, color: '#7c3aed', topics: [] }
    ]);
  });
  await page.goto(base + '/Catedra.dc.html');
  await page.waitForFunction(() => !!window.__catedraApp);
  await page.waitForTimeout(1200);

  const criado = await page.evaluate(async () => {
    const w = ms => new Promise(resolve => setTimeout(resolve, ms));
    const app = window.__catedraApp;
    app._colherErros([{
      enunciado: 'Na impugnação ao cumprimento de sentença, qual dispositivo disciplina as matérias alegáveis?',
      gabarito: 'Aplicam-se as hipóteses previstas no art. 525 do CPC.',
      disc: 'Direito Processual Civil', topico: 'Impugnação ao cumprimento de sentença',
      extra: { ref: 'Art. 525 do CPC' }
    }, {
      enunciado: 'Questão sintética de integração com referência jurisprudencial.',
      gabarito: 'Resposta sintética para testar a navegação.',
      disc: 'Direito Constitucional', topico: 'Referência jurisprudencial de teste',
      extra: { ref: 'Tema 698' }
    }], 'Simulado de teste');
    await w(500);
    const porRef = ref => (app.state.reviews || []).find(r => r.ref === ref);
    const legis = porRef('Art. 525 do CPC');
    const juris = porRef('Tema 698');
    // A lista mostra a revisão legislativa hoje; a jurisprudencial fica fora da sessão por ora.
    app.setState({ reviews: (app.state.reviews || []).map(r => ({ ...r,
      due: r.id === (legis && legis.id) ? 0 : 1,
      dueDate: r.id === (legis && legis.id) ? app._hoje() : app._addDiasStr(app._hoje(), 1)
    })) });
    await w(600);
    return { legis: !!legis, juris: !!juris, legisId: legis && legis.id, jurisId: juris && juris.id };
  });
  ok(criado.legis, R + 'erro de simulado legislativo vira revisão com ref "Art. 525 do CPC"');
  ok(criado.juris, R + 'erro de simulado jurisprudencial vira revisão com ref "Tema 698"');

  const lista = await page.evaluate(async () => {
    const w = ms => new Promise(resolve => setTimeout(resolve, ms));
    // espera a condição acontecer, de 50 em 50 ms; devolve se aconteceu dentro do teto
    const ate = async (cond, limite = 8000) => { const t = Date.now();
      while (Date.now() - t < limite) { if (cond()) return true; await w(50); } return false; };
    const app = window.__catedraApp;
    window.__ctMensagensRevisao = [];
    window.addEventListener('message', e => {
      if (e && e.data && e.data.type === 'ctAbrirAcervo') window.__ctMensagensRevisao.push(e.data);
    });
    window.__catedraGoView('revisoes');
    const acharBotao = () => [...document.querySelectorAll('#dc-root button')]
      .find(b => (b.textContent || '').trim() === 'Abrir no LEGIS');
    await ate(() => !!acharBotao());
    const botao = acharBotao();
    const apareceu = !!botao;
    const altura = botao ? botao.getBoundingClientRect().height : 0;
    if (botao) botao.click();
    // a ponte entrega o ctAbrirAcervo e o app troca de view: esperar os dois, não um prazo
    await ate(() => (window.__ctMensagensRevisao || []).some(m => m.alvo === 'legis')
      && app.state.view === 'legis');
    const msg = (window.__ctMensagensRevisao || []).find(m => m.alvo === 'legis');
    return { apareceu, altura, msgAlvo: msg && msg.alvo, msgTermo: msg && msg.termo,
      view: app.state.view, busca: app.state.acervoBusca };
  });
  ok(lista.apareceu, R + 'lista oferece “Abrir no LEGIS” para revisão com artigo');
  ok(lista.altura >= 44, R + 'ação da lista tem alvo de toque com pelo menos 44 px (' + lista.altura + ' px)');
  ok(lista.msgAlvo === 'legis' && lista.msgTermo === 'Art. 525 do CPC',
    R + 'clique da lista emite ctAbrirAcervo para LEGIS com a referência exata');
  ok(lista.view === 'legis' && lista.busca === 'Art. 525 do CPC',
    R + 'ponte leva à view LEGIS e preenche acervoBusca com a referência exata');

  const guiada = await page.evaluate(async () => {
    const w = ms => new Promise(resolve => setTimeout(resolve, ms));
    const ate = async (cond, limite = 8000) => { const t = Date.now();
      while (Date.now() - t < limite) { if (cond()) return true; await w(50); } return false; };
    const app = window.__catedraApp;
    const juris = (app.state.reviews || []).find(r => r.ref === 'Tema 698');
    app.setState({ revSession: null, reviews: (app.state.reviews || []).map(r => ({ ...r,
      due: r.id === (juris && juris.id) ? 0 : 1,
      dueDate: r.id === (juris && juris.id) ? app._hoje() : app._addDiasStr(app._hoje(), 1)
    })) });
    window.__catedraGoView('revisoes');
    window.__ctMensagensRevisao = [];
    const acharIniciar = () => [...document.querySelectorAll('#dc-root button')]
      .find(b => /^Começar/.test((b.textContent || '').trim()) && !b.disabled);
    await ate(() => !!acharIniciar());
    const iniciar = acharIniciar();
    if (iniciar) iniciar.click();
    // o modal da sessão guiada é o que o caso seguinte lê: esperar ele, não um prazo
    await ate(() => !!app.state.revSession
      && !!document.querySelector('[role="dialog"][aria-label="Sessão de revisão"]'));
    const antes = app.state.revSession ? JSON.parse(JSON.stringify(app.state.revSession)) : null;
    const dlg = document.querySelector('[role="dialog"][aria-label="Sessão de revisão"]');
    const botao = dlg && [...dlg.querySelectorAll('button')]
      .find(b => (b.textContent || '').trim() === 'Abrir no JURIS');
    const apareceu = !!botao;
    const altura = botao ? botao.getBoundingClientRect().height : 0;
    if (botao) botao.click();
    await ate(() => (window.__ctMensagensRevisao || []).some(m => m.alvo === 'juris')
      && app.state.view === 'juris' && app.state.revSession === null);
    const msg = (window.__ctMensagensRevisao || []).find(m => m.alvo === 'juris');
    const de = app.state.acervoDe;
    return { iniciou: !!iniciar && !!dlg, apareceu, altura, msgAlvo: msg && msg.alvo,
      msgTermo: msg && msg.termo, view: app.state.view, busca: app.state.acervoBusca,
      sessaoFechou: app.state.revSession === null
        && !document.querySelector('[role="dialog"][aria-label="Sessão de revisão"]'),
      // desde a volta à origem (24/09/2026) o modal fecha, mas a sessão não se perde: o
      // retrato dela (fila, item, revelado) viaja na origem que a pílula devolve
      retrato: !!antes && !!de && de.view === 'revisoes' && !!de.rev && de.rev.idx === antes.idx
        && JSON.stringify(de.rev.queue) === JSON.stringify(antes.queue),
      antes };
  });
  ok(guiada.iniciou, R + 'sessão guiada abre com a revisão jurisprudencial pendente');
  ok(guiada.apareceu, R + 'sessão guiada oferece “Abrir no JURIS” para revisão com tema');
  ok(guiada.altura >= 44, R + 'ação da sessão guiada tem alvo de toque com pelo menos 44 px (' + guiada.altura + ' px)');
  ok(guiada.msgAlvo === 'juris' && guiada.msgTermo === 'Tema 698',
    R + 'clique da sessão emite ctAbrirAcervo para JURIS com a referência exata');
  ok(guiada.view === 'juris' && guiada.busca === 'Tema 698',
    R + 'ponte leva à view JURIS e preenche acervoBusca com a referência exata');
  ok(guiada.sessaoFechou && guiada.retrato,
    R + 'abrir o material fecha o modal da sessão guiada (que cobriria o acervo) e guarda o retrato dela na origem da volta');

  // …e a pílula do JURIS devolve à sessão, no mesmo item (toque de verdade, dentro do iframe).
  // O teto é generoso de propósito: o iframe só mostra a pílula depois de montar o JURIS com o
  // acervo inteiro, e num runner frio isso passa dos 20 s de antes. O motivo da falha vai para o
  // rótulo — era ele que o `catch` mudo escondia quando a CI caiu aqui (01/10/2026).
  let tocou = false, porqueNaoTocou = '';
  const t0Pilula = Date.now();
  try { await page.frameLocator('iframe[data-ct-view="juris"]').locator('#ct-volta').click({ timeout: 45000 }); tocou = true; }
  catch (e) { porqueNaoTocou = String(e && e.message || e).split('\n')[0].slice(0, 120); }
  const msPilula = Date.now() - t0Pilula;
  const volta = await page.evaluate(async () => {
    const w = ms => new Promise(resolve => setTimeout(resolve, ms)), app = window.__catedraApp;
    const t = Date.now();
    while (Date.now() - t < 15000 && !(app.state.view === 'revisoes' && app.state.revSession)) await w(50);
    return { view: app.state.view, sessao: app.state.revSession, ms: Date.now() - t,
      modal: !!document.querySelector('[role="dialog"][aria-label="Sessão de revisão"]') };
  });
  const s = volta.sessao || {}, a = guiada.antes || {};
  ok(tocou && volta.view === 'revisoes' && volta.modal && s.idx === a.idx
    && JSON.stringify(s.queue) === JSON.stringify(a.queue) && (s.queue || [])[s.idx] === criado.jurisId,
    R + 'a pílula do JURIS volta a Revisões com a sessão guiada reaberta no mesmo item'
    + (tocou ? ' (pílula em ' + msPilula + ' ms, volta em ' + volta.ms + ' ms)'
             : ' — a pílula não recebeu o toque: ' + porqueNaoTocou));
  await page.evaluate(() => window.__catedraApp.closeRevSession());

  const controles = await page.evaluate(async () => {
    const w = ms => new Promise(resolve => setTimeout(resolve, ms)), app = window.__catedraApp;
    const ate = async (cond, limite = 8000) => { const t = Date.now();
      while (Date.now() - t < limite) { if (cond()) return true; await w(50); } return false; };
    const gravado = () => JSON.parse(localStorage.getItem('catedra:reviews') || '[]');
    const baseRev = { disc: 'Direito Civil', topic: 'Revisão manual', color: 'var(--accent)',
      intervalo: 1, facilidade: 2.5, repeticoes: 0, due: 0, dueDate: app._hoje(), up: Date.now() };
    app.setState({ revSession: null, reviews: [
      { ...baseRev, id: 'sem-ref' },
      { ...baseRev, id: 'questao-enam', ref: '2024.1·37' }
    ] });
    /* Ausência pede SENTINELA: perguntar "não há Abrir no …" enquanto a tela ainda mostra a
       lista anterior (a da revisão com Tema 698) responderia sobre o render errado. O tópico
       destas duas revisões novas — "Revisão manual" — é o sinal de que a lista já é a nova. */
    window.__catedraGoView('revisoes');
    const texto = el => ((el || document.body).textContent || '');
    await ate(() => app.state.view === 'revisoes' && /Revisão manual/.test(texto(document.querySelector('#dc-root'))));
    const semBotaoLista = ![...document.querySelectorAll('#dc-root button')].some(b => /^Abrir no (LEGIS|JURIS)$/.test((b.textContent || '').trim()));
    app.startRevSession();
    await ate(() => { const d = document.querySelector('[aria-label="Sessão de revisão"]'); return !!d && /Revisão manual/.test(texto(d)); });
    const dlg = document.querySelector('[aria-label="Sessão de revisão"]');
    const semBotaoSessao = !!dlg && ![...dlg.querySelectorAll('button')].some(b => /^Abrir no (LEGIS|JURIS)$/.test((b.textContent || '').trim()));
    app.closeRevSession(); await w(300);
    app.setState({ reviews: [], errors: [], flashcards: [],
      sjItens: [{ id: 'misto-lei', origem: 'lei', ramo: 'Direito Civil', tema: 'Art. 186',
        ref: 'CC · Art. 186', enunciado: 'Questão sintética do simulado misto.',
        original: 'Resposta sintética.', certo: true }],
      sjResp: { 'misto-lei': false }, sjRamos: [], sjIni: Date.now() });
    await w(300); app.encerrarSj();
    // o autosave tem debounce de 500 ms e cada render o reinicia: esperar a CHAVE, não um prazo
    await ate(() => gravado().some(r => r.ref === 'CC · Art. 186'));
    const gravadas = gravado();
    return { semBotaoLista, semBotaoSessao,
      misto: app.state.reviews.some(r => r.ref === 'CC · Art. 186'),
      persistiu: gravadas.some(r => r.ref === 'CC · Art. 186'),
      semChaveNova: !Object.keys(localStorage).some(k => /^catedra:.*ref/i.test(k)) };
  });
  ok(controles.semBotaoLista && controles.semBotaoSessao, R + 'sem material reconhecido, lista e sessão mantêm as ações existentes');
  ok(controles.misto && controles.persistiu, R + 'encerrar simulado misto transmite a fonte e a revisão persiste no armazenamento');

  await page.goto(base + '/tests/sync-fixture.html');
  await page.waitForFunction(() => !!(window.CatedraSync && window.CatedraSync._test));
  const sync = await page.evaluate(() => {
    const M = window.CatedraSync._test.mergeAll;
    const J = JSON.stringify;
    const servidor = { 'catedra:reviews': J([{ id: 'rev-ref', topic: 'antigo', up: 100 }]) };
    const local = { 'catedra:reviews': J([{ id: 'rev-ref', topic: 'novo', ref: 'Tema 698', up: 200 }]) };
    const lista = JSON.parse(M(servidor, local, false)['catedra:reviews'] || '[]');
    const vencedor = lista.find(r => r.id === 'rev-ref');
    return !!vencedor && vencedor.up === 200 && vencedor.topic === 'novo' && vencedor.ref === 'Tema 698';
  });
  ok(sync, R + 'merge por id/up preserva ref no objeto vencedor de catedra:reviews');
}

// execução focal: `CT_PORT=8154 node tests/revisao-fonte.mjs`
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { iniciarServidor, lancarNavegador } = await import('./_infra.mjs');
  const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const { srv, url } = await iniciarServidor(RAIZ, +(process.env.CT_PORT || 8154));
  const { browser, motor } = await lancarNavegador();
  const page = await browser.newPage();
  const falhas = [];
  const ok = (cond, label) => { console.log((cond ? '✓ ' : '✗ ') + label); if (!cond) falhas.push(label); };
  try { await testarRevisaoFonte(page, url, ok, { motor }); }
  catch (e) { ok(false, 'REVISÃO/FONTE roteiro sem exceção (' + String(e && e.message || e).split('\n')[0].slice(0, 180) + ')'); }
  await browser.close(); srv.close();
  console.log(falhas.length ? ('\nFALHAS: ' + falhas.length) : '\nTODOS OS TESTES PASSARAM');
  process.exit(falhas.length ? 1 : 0);
}
