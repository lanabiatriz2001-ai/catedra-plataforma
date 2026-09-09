/* CICLO = VOLTA CONTÍNUA COM PONTEIRO (o método do Cátedra: ciclo, não calendário) —
   09/09/2026, decisão da dona depois de ver o "plano do dia" refeito a cada dia.

   O modo `inteligente` monta a VOLTA inteira pela régua da tela Prioridade (prioridade-calc.js)
   e o dia é uma fatia dela. O que se prova aqui, com dado semeado de verdade (edital com pesos,
   sessões com desempenho desigual, revisões vencidas, erros):
   · a revisão vencida de Civil vem antes da volta, como bloco de Revisão daquela matéria;
   · a volta tem blocos de TODAS as matérias, nunca duas iguais seguidas, nunca o mesmo tópico
     repetido na mesma matéria, e Civil (prioridade 71) ganha mais blocos que Constitucional (23);
   · o dia cabe na meta diária (180 + folga de 15) e todo bloco tem motivo;
   · a linha do ciclo mostra a volta inteira (não só o dia), com o trecho de hoje marcado;
   · concluir marca na volta; subir/descer troca de lugar NA VOLTA; tirar = pular (com desfazer);
     "Adicionar bloco" entra na volta; "Puxar o próximo" traz mais um para hoje;
   · no manual, o cadastro rápido cria UMA atividade por dia marcado e "Gerar uma volta pela
     prioridade" monta o ciclo manual com ponteiro; o dia puxa a fatia depois da agenda;
   · sem edital, a volta sai pelas matérias da área e o cartão avisa — em vez de fingir.

   Função, não script, para rodar em qualquer par motor × origem (como oral-lei-seca.mjs). */

import path from 'path';
import { pathToFileURL } from 'url';

export async function testarCicloInteligente(page, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const origem = opcoes.origem || (String(base).startsWith('file:') ? 'file' : 'http');
  const arquivo = opcoes.arquivo || 'Catedra.dc.html';
  const R = 'CICLO INTELIGENTE [' + motor + '] [' + origem + '] ';
  const w = ms => page.waitForTimeout(ms);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(base + '/__semente');   // página SEM o app: semear com o app vivo é corrida com o autosave (500 ms), que regrava o estado do módulo anterior por cima
  await page.evaluate(() => {
    // semente: 4 disciplinas com peso, sessões com desempenho desigual, 2 revisões vencidas
    // de Civil + 1 de hoje, 2 erros de Civil, Penal nunca estudada, Processual Civil esfriando
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    const ymd = d => { const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
    const ago = n => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
    const T = names => names.map(n => ({ name: n, done: false, subs: [] }));
    localStorage.clear();
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica'); set('cycleMode', 'inteligente'); set('blocks', []);
    set('edital', [
      { disc: 'Direito Constitucional', peso: 3, questoes: 20, topics: T(['Direitos e garantias fundamentais', 'Controle de constitucionalidade', 'Organização dos Poderes']) },
      { disc: 'Direito Civil', peso: 2, questoes: 15, topics: T(['LINDB', 'Prescrição e decadência', 'Obrigações', 'Contratos em espécie']) },
      { disc: 'Direito Penal', peso: 2, questoes: 15, topics: T(['Teoria do crime', 'Concurso de pessoas', 'Crimes contra a pessoa']) },
      { disc: 'Direito Processual Civil', peso: 1, questoes: 10, topics: T(['Jurisdição e competência', 'Tutela provisória', 'Recursos']) }
    ]);
    const S = [];
    const add = (n, disc, topico, min, q, a, e) => S.push({ id: 's' + (Date.now() - n * 1e6), ts: ago(n).getTime(), date: ymd(ago(n)), disc, topico, categoria: 'Questões', categorias: ['Questões'], min, questoes: q, acertos: a, erradas: e, brancos: 0, liquido: a - e, foco: 4, nota: '', countMeta: true });
    add(1, 'Direito Constitucional', 'Controle de constitucionalidade', 60, 20, 16, 3);
    add(2, 'Direito Civil', 'Prescrição e decadência', 45, 20, 8, 10);
    add(6, 'Direito Civil', 'Obrigações', 40, 12, 5, 6);
    add(25, 'Direito Processual Civil', 'Tutela provisória', 50, 10, 7, 2);
    set('sessions', S);
    set('reviews', [
      { id: 'r1', disc: 'Direito Civil', topic: 'Prescrição e decadência', color: '#0D9488', due: -3, dueDate: ymd(ago(3)), intervalo: 3, facilidade: 2.5, repeticoes: 1, up: Date.now() },
      { id: 'r2', disc: 'Direito Civil', topic: 'Obrigações', color: '#0D9488', due: -1, dueDate: ymd(ago(1)), intervalo: 1, facilidade: 2.5, repeticoes: 0, up: Date.now() },
      { id: 'r3', disc: 'Direito Constitucional', topic: 'Controle de constitucionalidade', color: '#2563EB', due: 0, dueDate: ymd(new Date()), intervalo: 1, facilidade: 2.5, repeticoes: 0, up: Date.now() }
    ]);
    set('errors', [{ id: 'e1', ts: ago(2).getTime(), disc: 'Direito Civil', topico: 'Prescrição' }, { id: 'e2', ts: ago(5).getTime(), disc: 'Direito Civil', topico: 'Obrigações' }]);
  });
  await page.goto(base + '/' + arquivo);
  await w(1800);

  const r = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const nav = document.querySelector('button[data-view="ciclo"]'); if (nav) nav.click(); await w(900);
    const r = {};
    const B = JSON.parse(localStorage.getItem('catedra:blocks') || '[]');
    const V = JSON.parse(localStorage.getItem('catedra:cicloVolta') || 'null') || { blocos: [] };
    const VB = V.blocos || [];
    r.gerouVolta = VB.length >= 8;
    r.voltaCobreTodasAsMaterias = ['Direito Constitucional', 'Direito Civil', 'Direito Penal', 'Direito Processual Civil'].every(d => VB.some(b => b.disc === d));
    r.voltaNuncaDuasIguaisSeguidas = VB.every((b, i) => i === 0 || b.disc !== VB[i - 1].disc);
    r.voltaNuncaOMesmoTipoETopico = new Set(VB.map(b => b.disc + '|' + b.kind + '|' + b.tag)).size === VB.length;
    r.voltaPrioridadeDaMaisBlocos = VB.filter(b => b.disc === 'Direito Civil').length > VB.filter(b => b.disc === 'Direito Constitucional').length;
    r.voltaTodosComMotivo = VB.every(b => b.motivo && String(b.motivo).length > 6);
    r.voltaVinculoAoEdital = VB.every(b => b.discEdital === b.disc && b.topico === b.tag && +b.min >= 15);
    r.diaGerou = B.length >= 2;
    r.revisaoDeCivilAntesDaVolta = !!B[0] && B[0].extra === true && B[0].disc === 'Direito Civil' && B[0].kind === 'Revisão';
    r.revisaoExtraLevaOTopico = !!B[0] && B[0].topico === 'Prescrição e decadência';   // o registro abre com o tópico da revisão
    r.diaEhFatiaDaVolta = B.filter(b => !b.extra).every(b => b.voltaId && VB.some(v => v.id === b.voltaId));
    const total = B.reduce((a, b) => a + (+b.min || 0), 0);
    r.diaCabeNaMeta = total > 0 && total <= 195;
    r.faixaNova = !!document.querySelector('.ct-hero-ciclo');
    r.linhaMostraAVoltaInteira = document.querySelectorAll('.ct-lc-seg').length === VB.length + B.filter(b => b.extra).length;
    r.linhaMarcaOsDeHoje = document.querySelectorAll('.ct-lc-seg[data-hoje="1"]').length === B.filter(b => !b.done).length;
    r.linhaPorVirSemClique = [...document.querySelectorAll('.ct-lc-seg')].filter(s => s.disabled).length === VB.length - B.filter(b => b.voltaId).length;
    r.legendaDizOndeParei = /Volta 1 · 0 de \d+ blocos · onde parei:/.test((document.querySelector('.ct-lc-legenda') || {}).textContent || '');
    r.porqueNaLista = document.querySelectorAll('.ct-cb .ct-cb-motivo').length === B.length;
    r.matériaTingeOItem = [...document.querySelectorAll('.ct-cb')].every(el => /--ct-item-cor:/.test(el.getAttribute('style') || ''));
    // reorganizar: descer o primeiro bloco DA VOLTA troca com o seguinte — na tela e na volta
    const tits = () => [...document.querySelectorAll('.ct-cb .ct-item-tit')].map(e => e.textContent.trim());
    const i1 = B.findIndex(b => b.voltaId); const antes = tits();
    const setas = document.querySelectorAll('.ct-cb .ct-cb-mini[data-dir="1"]');
    r.extraNaoTemSeta = setas[0].disabled === true;
    setas[i1].click(); await w(1700);
    const depois = tits(); const V2 = JSON.parse(localStorage.getItem('catedra:cicloVolta') || 'null') || { blocos: [] };
    r.descerTrocaNaTela = depois[i1] === antes[i1 + 1] && depois[i1 + 1] === antes[i1];
    r.descerTrocaNaVolta = V2.blocos[0].id === B[i1 + 1].voltaId && V2.blocos[1].id === B[i1].voltaId;
    // tirar do dia = pular nesta volta, com desfazer
    const n0 = document.querySelectorAll('.ct-cb').length;
    const xs = document.querySelectorAll('.ct-cb .ct-cb-mini[title="Tirar do dia"]'); xs[xs.length - 1].click(); await w(1700);
    const V3 = JSON.parse(localStorage.getItem('catedra:cicloVolta') || 'null') || { blocos: [] };
    r.tirarReduz = document.querySelectorAll('.ct-cb').length === n0 - 1;
    r.tirarViraPuladoNaVolta = V3.blocos.filter(b => b.pulado).length === 1;
    const desfazer = [...document.querySelectorAll('button')].find(b => /^desfazer$/i.test((b.textContent || '').trim()));
    if (desfazer) { desfazer.click(); await w(1700); }
    const V4 = JSON.parse(localStorage.getItem('catedra:cicloVolta') || 'null') || { blocos: [] };
    r.desfazerDevolve = !!desfazer && document.querySelectorAll('.ct-cb').length === n0 && V4.blocos.filter(b => b.pulado).length === 0;
    // adicionar bloco: entra na VOLTA logo depois do último de hoje, e no dia
    const sel = document.querySelector('.ct-cb-add select[data-k="disc"]'); sel.value = 'Direito Constitucional'; sel.dispatchEvent(new Event('change', { bubbles: true })); await w(300);
    [...document.querySelectorAll('.ct-cb-add button')].find(b => /^Adicionar$/.test((b.textContent || '').trim())).click(); await w(1700);
    const t2 = tits(); const V5 = JSON.parse(localStorage.getItem('catedra:cicloVolta') || 'null') || { blocos: [] };
    r.adicionarEntraNoFimDoDia = t2.length === n0 + 1 && t2[t2.length - 1] === 'Direito Constitucional';
    r.adicionarEntraNaVolta = V5.blocos.length === VB.length + 1 && V5.blocos.some(b => b.id.startsWith('u'));
    // puxar o próximo da volta
    [...document.querySelectorAll('button')].find(b => /Puxar o próximo bloco da volta/.test(b.textContent || '')).click(); await w(500);
    r.puxarTrazMaisUm = tits().length === n0 + 2;
    // concluir pela linha do ciclo marca na volta (o registro abre; fechamos)
    const segHoje = document.querySelector('.ct-lc-seg[data-hoje="1"][data-extra="0"]'); segHoje.click(); await w(1700);
    const V6 = JSON.parse(localStorage.getItem('catedra:cicloVolta') || 'null') || { blocos: [] };
    r.concluirMarcaNaVolta = V6.blocos.filter(b => b.done && !b.pulado).length === 1;
    const fechar = document.querySelector('[role="dialog"][aria-label="Registrar sessão"] button[aria-label="Fechar"]'); if (fechar) fechar.click(); await w(300);
    // manual: cadastro rápido em 3 dias + gerar a volta manual pela prioridade
    document.getElementById('ct-cycle-tab-configurar').click(); await w(500);
    [...document.querySelectorAll('.ct-modo')].find(b => b.dataset.mode === 'manual').click(); await w(700);
    const cfg = document.getElementById('ct-cycle-panel-configurar');
    const selAg = cfg.querySelector('.ct-cb-add select[data-k="disc"]'); selAg.value = 'Direito Penal'; selAg.dispatchEvent(new Event('change', { bubbles: true })); await w(300);
    const chipsOn = [...cfg.querySelectorAll('.ct-dia-chip[aria-pressed="true"]')].map(c => c.dataset.dia);
    [...cfg.querySelectorAll('.ct-cb-add button')].find(b => /^Adicionar em/.test((b.textContent || '').trim())).click(); await w(1500);
    const mf1 = JSON.parse(localStorage.getItem('catedra:manualFixed') || '[]');
    r.cadastroRapidoUmaPorDia = chipsOn.length === 3 && mf1.length === 3 && chipsOn.every(d => mf1.some(f => f.dia === d && f.disc === 'Direito Penal' && f.discEdital === 'Direito Penal'));
    window.confirm = () => true;
    [...cfg.querySelectorAll('button')].find(b => /Gerar uma volta pela prioridade/.test(b.textContent || '')).click(); await w(1700);
    const rot = JSON.parse(localStorage.getItem('catedra:manualRot') || '[]');
    r.voltaManualGerada = rot.length >= 8 && rot.every(x => x.motivo && x.discEdital) && rot.every((x, i) => i === 0 || x.disc !== rot[i - 1].disc);
    r.voltaManualTemPonteiro = cfg.querySelectorAll('.ct-rot[data-next="1"]').length === 1;
    const Bm = JSON.parse(localStorage.getItem('catedra:blocks') || '[]');
    r.diaManualPuxaAFatia = Bm.some(b => b.rotId) && Bm.filter(b => b.rotId).reduce((a, b) => a + b.min, 0) <= 195;
    // pular o próximo marca como pulado e o ponteiro anda
    [...cfg.querySelectorAll('button')].find(b => /Pular o próximo/.test(b.textContent || '')).click(); await w(1700);
    const rot2 = JSON.parse(localStorage.getItem('catedra:manualRot') || '[]');
    r.pularAndaOPonteiro = rot2[0].pulado === true && cfg.querySelector('.ct-rot[data-next="1"] .ct-rot-pos').textContent.trim() === '2';
    return r;
  });
  for (const [k, v] of Object.entries(r)) ok(v, R + k);

  // sem edital: cai na sugestão padrão e o cartão do modo AVISA
  await page.goto(base + '/__semente');   // página SEM o app: semear com o app vivo é corrida com o autosave (500 ms), que regrava o estado do módulo anterior por cima
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); localStorage.setItem('catedra:cycleMode', 'inteligente'); localStorage.setItem('catedra:blocks', '[]'); });
  await page.goto(base + '/' + arquivo);
  await w(1600);
  const s = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    document.querySelector('button[data-view="ciclo"]').click(); await w(800);
    const B = JSON.parse(localStorage.getItem('catedra:blocks') || '[]');
    document.getElementById('ct-cycle-tab-configurar').click(); await w(500);
    const card = [...document.querySelectorAll('.ct-modo')].find(b => b.dataset.mode === 'inteligente');
    return { semEditalAindaMontaODia: B.length >= 2, cartaoAvisaSemEdital: /Sem edital cadastrado/.test(card ? card.textContent : ''),
      recomendado: /recomendado/i.test(card ? card.textContent : '') };
  });
  for (const [k, v] of Object.entries(s)) ok(v, R + k);

  // volta CURTA já guardada (1 feito hoje + 1 pendente) e um bloco SOLTO de reta final no dia:
  // o solto sobrevive à recomposição; pular a última pendência fecha a volta e a próxima nasce;
  // desfazer devolve a volta 1 inteira e tira os blocos "a seguir"
  await page.goto(base + '/__semente');   // página SEM o app: semear com o app vivo é corrida com o autosave (500 ms), que regrava o estado do módulo anterior por cima
  await page.evaluate(() => {
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    const ymd = d => { const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
    const hoje = ymd(new Date()); const T = names => names.map(n => ({ name: n, done: false, subs: [] }));
    localStorage.clear();
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica'); set('cycleMode', 'inteligente');
    set('edital', [{ disc: 'Direito Civil', peso: 2, questoes: 15, topics: T(['LINDB', 'Obrigações']) }, { disc: 'Direito Penal', peso: 2, questoes: 15, topics: T(['Teoria do crime', 'Concurso de pessoas']) }]);
    set('sessions', []); set('reviews', []); set('errors', []);
    const A = { id: 'v1-0', disc: 'Direito Civil', kind: 'Teoria', tag: 'LINDB', topico: 'LINDB', discEdital: 'Direito Civil', min: 50, motivo: '', done: true, pulado: false, doneDate: hoje };
    const Bq = { id: 'v1-1', disc: 'Direito Penal', kind: 'Teoria', tag: 'Teoria do crime', topico: 'Teoria do crime', discEdital: 'Direito Penal', min: 50, motivo: '', done: false, pulado: false, doneDate: '' };
    set('cicloVolta', { n: 1, modo: 'inteligente', geradoEm: hoje, blocos: [A, Bq], totalMin: 100 });
    localStorage.setItem('catedra:blocksDate', JSON.stringify(hoje));
    set('blocks', [{ disc: 'Lei seca de alta incidência', kind: 'Lei seca', min: 30, tag: 'Reta final', done: false },
      { id: A.id, voltaId: A.id, disc: A.disc, kind: A.kind, tag: A.tag, topico: A.topico, discEdital: A.discEdital, min: 50, motivo: '', done: true },
      { id: Bq.id, voltaId: Bq.id, disc: Bq.disc, kind: Bq.kind, tag: Bq.tag, topico: Bq.topico, discEdital: Bq.discEdital, min: 50, motivo: '', done: false }]);
  });
  await page.goto(base + '/' + arquivo);
  await w(1800);
  const c = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms)); const r = {};
    document.querySelector('button[data-view="ciclo"]').click(); await w(800);
    const tits = () => [...document.querySelectorAll('.ct-cb .ct-item-tit')].map(e => e.textContent.trim());
    const V = () => JSON.parse(localStorage.getItem('catedra:cicloVolta') || 'null') || { n: 0, blocos: [] };
    r.blocoSoltoSobreviveARecomposicao = tits().includes('Lei seca de alta incidência') && tits().includes('Direito Civil') && tits().includes('Direito Penal');
    r.feitoNaoTemTirar = !document.querySelector('.ct-cb[data-done="true"] .ct-cb-mini[title="Tirar do dia"]') && document.querySelectorAll('.ct-cb .ct-cb-mini[title="Tirar do dia"]').length === 2;
    const x = [...document.querySelectorAll('.ct-cb')].find(el => /Direito Penal/.test(el.textContent || '')).querySelector('.ct-cb-mini[title="Tirar do dia"]'); x.click(); await w(1700);
    const V2 = V();
    r.pularAUltimaPendenciaFechaAVolta = V2.n === 2 && V2.blocos.length >= 2 && V2.blocos.every(b => !b.done);
    r.aProximaVoltaJaEntraNoDia = tits().length >= 4;   // solto + feito + 2 blocos 'a seguir' da volta 2
    r.avisaQueFechou = /Volta 1 fechada/.test(document.body.textContent || '');
    const desfazer = [...document.querySelectorAll('button')].find(b => /^desfazer$/i.test((b.textContent || '').trim()));
    if (desfazer) { desfazer.click(); await w(1700); }
    const V3 = V(); const B3 = JSON.parse(localStorage.getItem('catedra:blocks') || '[]');
    r.desfazerDevolveAVolta1 = !!desfazer && V3.n === 1 && V3.blocos.length === 2 && V3.blocos[1].done === false && V3.blocos[1].pulado === false;
    r.desfazerTiraOsBlocosASeguir = B3.every(b => !b.voltaId || b.voltaId.startsWith('v1-')) && B3.filter(b => b.voltaId).length === 2 && B3.some(b => b.tag === 'Reta final');
    return r;
  });
  for (const [k, v] of Object.entries(c)) ok(v, R + k);
}

// execução avulsa: `CT_PORT=8142 node tests/ciclo-inteligente.mjs`
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { iniciarServidor, lancarNavegador } = await import('./_infra.mjs');
  const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const { srv, url } = await iniciarServidor(RAIZ, +(process.env.CT_PORT || 8142));
  const { browser, motor } = await lancarNavegador();
  const page = await browser.newPage();
  const falhas = [];
  const ok = (c, l) => { console.log((c ? '✓ ' : '✗ ') + l); if (!c) falhas.push(l); };
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  try { await testarCicloInteligente(page, url, ok, { motor, origem: 'http' }); }
  catch (e) { ok(false, 'CICLO INTELIGENTE o roteiro correu sem exceção (' + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')'); }
  await browser.close(); srv.close();
  console.log(falhas.length ? ('\nFALHAS: ' + falhas.length) : '\nTODOS OS TESTES PASSARAM');
  process.exit(falhas.length ? 1 : 0);
}
