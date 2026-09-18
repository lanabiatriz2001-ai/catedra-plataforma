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

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

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
  await page.evaluate(medidasNaPagina);

  const r = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const { tipoCabeOTexto } = window.__ctAg;
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
    let cfg = document.getElementById('ct-cycle-panel-configurar');
    const selAg = cfg.querySelector('.ct-cb-add select[data-k="disc"]'); selAg.value = 'Direito Penal'; selAg.dispatchEvent(new Event('change', { bubbles: true })); await w(300);
    const chipsOn = [...cfg.querySelectorAll('.ct-dia-chip[aria-pressed="true"]')].map(c => c.dataset.dia);
    [...cfg.querySelectorAll('.ct-cb-add button')].find(b => /^Adicionar em/.test((b.textContent || '').trim())).click(); await w(1500);
    const mf1 = JSON.parse(localStorage.getItem('catedra:manualFixed') || '[]');
    r.cadastroRapidoUmaPorDia = chipsOn.length === 3 && mf1.length === 3 && chipsOn.every(d => mf1.some(f => f.dia === d && f.disc === 'Direito Penal' && f.discEdital === 'Direito Penal'));
    // agenda: cartões LEGÍVEIS (tópico/disciplina + "Tipo · min", sem select à vista), edição de um por vez
    // com o tipo por extenso (antes o select saía com uma letra), carga do dia na coluna, "+ atividade" já em edição
    const cards = [...cfg.querySelectorAll('.ct-ag')];
    const idsAg = cards.map(c => ((c.querySelector('.ct-ag-cab') || {}).dataset || {}).id);
    r.agendaCartoesLegiveis = cards.length === 3 && cards.every(c => /Direito Penal/.test((c.querySelector('.ct-ag-tit') || {}).textContent || '') && /Teoria · 50min/.test((c.querySelector('.ct-ag-meta') || {}).textContent || '') && !c.querySelector('select'));
    cards[0].querySelector('.ct-ag-cab').click(); await w(400);
    const aberto = cfg.querySelector('.ct-ag[data-editando="1"]'); const kindSel = aberto && aberto.querySelector('select[data-field="kind"]');
    r.agendaEditaUmPorVez = !!aberto && cfg.querySelectorAll('.ct-ag[data-editando="1"]').length === 1 && !!kindSel && kindSel.getBoundingClientRect().width >= 100 && aberto.querySelector('.ct-ag-cab').getAttribute('aria-expanded') === 'true';
    // o tipo aparece POR EXTENSO: cada opção cabe na área útil do select (sem o padding e a seta
    // de ~24 px) na grade de 4 colunas, o pior caso. Com a divisão fixa 3:2 o select tinha 100 px
    // e "Jurisprudência" (95 px de texto), "Flashcards", "Questões" e "Simulado" saíam cortados.
    r.agendaTipoCabeOTexto = !!kindSel && tipoCabeOTexto(kindSel);
    // UM CARTÃO POR VEZ de verdade: com A aberto, abrir B fecha A (estado e aria dos dois)
    const cabDe = id => cfg.querySelector('.ct-ag-cab[data-id="' + id + '"]');
    cabDe(idsAg[1]).click(); await w(400);
    const abertos = [...cfg.querySelectorAll('.ct-ag[data-editando="1"]')];
    r.agendaAbrirOutroFechaOPrimeiro = !!idsAg[0] && !!idsAg[1] && idsAg[0] !== idsAg[1] && abertos.length === 1
      && abertos[0].contains(cabDe(idsAg[1])) && cabDe(idsAg[0]).closest('.ct-ag').getAttribute('data-editando') === '0'
      && cabDe(idsAg[1]).getAttribute('aria-expanded') === 'true' && cabDe(idsAg[0]).getAttribute('aria-expanded') === 'false';
    const abertoB = abertos[0] || cfg.querySelector('.ct-ag[data-editando="1"]');
    const idAberto = abertoB.querySelector('.ct-ag-cab').dataset.id;
    [...abertoB.querySelectorAll('button')].find(b => /^Pronto$/.test((b.textContent || '').trim())).click(); await w(400);
    r.agendaProntoFecha = !cfg.querySelector('.ct-ag[data-editando="1"]');
    r.agendaProntoDevolveOFoco = document.activeElement === cfg.querySelector('.ct-ag-cab[data-id="' + idAberto + '"]');   // o foco não cai no body
    const colSeg = [...cfg.querySelectorAll('.ct-ag-col')].find(c => c.getAttribute('aria-label') === 'Segunda');
    r.agendaMostraCarga = /1 atividade · 50min/.test((colSeg.querySelector('.ct-ag-col-carga') || {}).textContent || '');
    colSeg.querySelector('.ct-ag-add').click(); await w(1500);
    const novo = cfg.querySelector('.ct-ag[data-editando="1"]');
    r.agendaNovoAbreEmEdicao = !!novo && /Atividade sem disciplina/.test((novo.querySelector('.ct-ag-tit') || {}).textContent || '') && document.activeElement === novo.querySelector('select[data-field="discEdital"]');   // o foco vai ao primeiro campo
    [...novo.querySelectorAll('button')].find(b => /^Remover$/.test((b.textContent || '').trim())).click(); await w(1500);
    r.agendaRemoverApaga = JSON.parse(localStorage.getItem('catedra:manualFixed') || '[]').length === 3 && !cfg.querySelector('.ct-ag[data-editando="1"]');
    r.agendaRemoverFocaAColuna = document.activeElement === colSeg.querySelector('.ct-ag-add');   // depois de remover, o foco vai ao "+ atividade" da coluna
    // convite no EXECUTAR: manual com agenda e volta vazia → "A volta ainda está vazia" com gerar / montar / agora não
    document.getElementById('ct-cycle-tab-executar').click(); await w(500);
    const conv = document.querySelector('#ct-cycle-panel-executar .ct-convite-volta');
    r.conviteApareceNoExecutar = !!conv && /A volta ainda está vazia/.test(conv.textContent || '') && !![...conv.querySelectorAll('button')].find(b => /Gerar uma volta pela prioridade/.test(b.textContent || ''));
    if (conv) { [...conv.querySelectorAll('button')].find(b => /Agora não/.test(b.textContent || '')).click(); await w(1500); }
    r.agoraNaoSomeEFicaLembrado = !document.querySelector('#ct-cycle-panel-executar .ct-convite-volta') && localStorage.getItem('catedra:cicloConviteOff') === '1';
    document.getElementById('ct-cycle-tab-configurar').click(); await w(500); cfg = document.getElementById('ct-cycle-panel-configurar');
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

  await agendaNomesLongos(page, base, ok, R, arquivo);
  await agendaNoToque(page, base, ok, R, arquivo);
}

/* Medidas de aparência que rodam DENTRO da página (instaladas em window.__ctAg por
   page.evaluate(medidasNaPagina)): largura de texto pela fonte computada e contraste WCAG
   contra o pixel da lavagem. Presença no DOM não prova que pinta — isto mede. */
function medidasNaPagina() {
  const fonte = cs => [cs.fontStyle, cs.fontWeight, cs.fontSize, cs.fontFamily].join(' ');
  // a régua: o texto cabe na área útil do select — clientWidth − padding − a seta nativa (~24 px,
  // que fica além do padding; a seta da casa, com appearance:none, mora dentro do padding-right),
  // largura medida por canvas com a fonte COMPUTADA do próprio select
  const textoCabe = (sel, t) => {
    const cs = getComputedStyle(sel); const cx = document.createElement('canvas').getContext('2d'); cx.font = fonte(cs);
    const seta = (cs.appearance || cs.webkitAppearance) === 'none' ? 0 : 24;
    const util = sel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - seta;
    return cx.measureText(t).width <= util;
  };
  // cada opção do select cabe na área útil
  const tipoCabeOTexto = sel => {
    const ops = [...sel.options].map(o => o.textContent.trim());
    return ops.includes('Jurisprudência') && ops.every(t => textoCabe(sel, t));
  };
  // a opção VAZIA (value "") é a primeira, é a que está à vista e cabe na área útil
  const vaziaCabe = sel => !!sel && sel.options[0].value === '' && sel.selectedIndex === 0 && textoCabe(sel, sel.options[0].textContent.trim());
  // o Chrome devolve rgb(), rgba() e, para color-mix, color(srgb r g b / a): os três viram {r,g,b,a} em 0..1
  const rgba = s => { s = String(s || '').trim(); let m;
    if ((m = s.match(/^rgba?\(([^)]*)\)$/i))) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return { r: p[0] / 255, g: p[1] / 255, b: p[2] / 255, a: p.length > 3 ? p[3] : 1 }; }
    if ((m = s.match(/^color\(srgb\s+([^)]*)\)$/i))) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    throw new Error('cor que o teste não sabe ler: ' + s); };
  const sobre = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const lum = c => { const l = v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); return 0.2126 * l(c.r) + 0.7152 * l(c.g) + 0.0722 * l(c.b); };
  const razao = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // a cor que um token resolve DENTRO de um elemento (herda o --ct-item-cor do cartão)
  const token = (host, v) => { const s = document.createElement('span'); s.style.color = v; host.appendChild(s); const c = getComputedStyle(s).color; s.remove(); return c; };
  // o PIOR ponto da lavagem do .ct-item: a cor da matéria a 18% sobre a superfície do cartão
  const fundoLavagem = card => { const c = rgba(token(card, 'var(--ct-item-cor)')); return sobre({ r: c.r, g: c.g, b: c.b, a: 0.18 * c.a }, rgba(token(card, 'var(--surface)'))); };
  const texto = (el, bg) => razao(sobre(rgba(getComputedStyle(el).color), bg), bg);
  window.__ctAg = { textoCabe, tipoCabeOTexto, vaziaCabe, rgba, sobre, razao, token, fundoLavagem, texto };
}

/* NOMES DO EDITAL no cartão aberto, a 1280 px (a grade de 4 colunas: select de ~173 px, área
   útil de ~125 px — o layout mais estreito). Semente com nomes REAIS do modelo de
   magistratura (modelos-edital.js): um subtópico de 202 caracteres e um tópico de 73 (o select
   corta a opção em 70). Quatro cartões, um por estado do vínculo — cheio, sem subtópico, sem
   tópico, sem disciplina — para que cada opção vazia apareça À VISTA no seu select. Prova:
   (a) as três opções vazias cabem na área útil (antes: "— sem vínculo com o edital —" 193 px,
   "— a disciplina inteira —" 149 px, "— o tópico inteiro —" 130 px, todas cortadas);
   (b) o title de cada select é o nome inteiro do que está selecionado (hover no desktop) —
   inclusive quando a opção foi cortada em 70 com "…"; vazio quando nada está selecionado;
   (c) o cabeçalho do cartão EM EDIÇÃO vai até 13 linhas: mostra inteiros o subtópico de 202 e o
   tópico de 73, e o cartão fechado continua cortado em 3;
   (d) o nome-parágrafo real (o tópico de 1179 caracteres do modelo promotor) corta em no máximo
   13 linhas em edição, e com o cabeçalho no topo da janela o select Disciplina fica à vista —
   sem o corte, o cabeçalho empurrava os campos e o Pronto abaixo da dobra. */
function topicoParagrafoDoPromotor() {
  // o maior nome de tópico do modelo promotor, lido do arquivo que o app carrega (não copiado)
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(raiz, 'modelos-edital.js'), 'utf8'), ctx);
  let maior = { disc: '', nome: '' };
  for (const [disc, , tops] of ctx.window.CT_MODELOS_DATA.promotor || [])
    for (const [nome] of tops) if (nome.length > maior.nome.length) maior = { disc, nome };
  if (maior.nome.length < 1000) throw new Error('o modelo promotor não tem mais o tópico-parágrafo (maior: ' + maior.nome.length + ' caracteres)');
  return maior;
}

async function agendaNomesLongos(page, base, ok, R, arquivo) {
  const T = R + 'agenda nomes do edital (1280) ';
  const SUB = 'Crimes contra as relações de consumo (Lei nº 8.078, de 11 de setembro de 1990), a ordem tributária (Lei nº 8.137, de 27 de dezembro de 1990) e a ordem econômica (Lei nº 8.176, de 8 de fevereiro de 1991)';
  const CPP = 'Código de Processo Penal (Decreto-lei nº 3.689, de 3 de outubro de 1.941)';
  const PROM = topicoParagrafoDoPromotor().nome;
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(base + '/__semente');
  await page.evaluate(({ SUB, CPP, PROM }) => {
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    localStorage.clear();
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica'); set('cycleMode', 'manual'); set('blocks', []);
    // subs nos dois formatos que o edital guarda: string (parser) e {name} (mesclagem)
    set('edital', [
      { disc: 'Direito Penal', peso: 2, questoes: 15, topics: [{ name: 'Leis Penais Especiais', done: false, subs: [SUB, 'Crimes hediondos'] }, { name: 'Teoria do crime', done: false, subs: [] }] },
      { disc: 'Direito Processual Penal', peso: 2, questoes: 15, topics: [{ name: CPP, done: false, subs: [{ name: 'Do inquérito policial' }, { name: 'Da ação penal' }] }, { name: 'Do processo penal em geral', done: false, subs: [] }, { name: PROM, done: false, subs: [] }] }]);
    set('sessions', []); set('reviews', []); set('errors', []);
    set('manualFixed', [
      { id: 'ag-longo', disc: 'Direito Penal', kind: 'Teoria', min: 50, dia: 'seg', roteiro: '', discEdital: 'Direito Penal', topico: 'Leis Penais Especiais', subtopico: SUB },
      { id: 'ag-cpp', disc: 'Direito Processual Penal', kind: 'Teoria', min: 50, dia: 'ter', roteiro: '', discEdital: 'Direito Processual Penal', topico: CPP, subtopico: '' },
      { id: 'ag-semtop', disc: 'Direito Processual Penal', kind: 'Teoria', min: 50, dia: 'qua', roteiro: '', discEdital: 'Direito Processual Penal', topico: '', subtopico: '' },
      { id: 'ag-semdisc', disc: '', kind: 'Questões', min: 30, dia: 'qui', roteiro: '', discEdital: '', topico: '' },
      { id: 'ag-prom', disc: 'Direito Processual Penal', kind: 'Teoria', min: 50, dia: 'sex', roteiro: '', discEdital: 'Direito Processual Penal', topico: PROM, subtopico: '' }]);
  }, { SUB, CPP, PROM });
  await page.goto(base + '/' + arquivo); await page.waitForTimeout(1800);
  await page.evaluate(medidasNaPagina);
  const r = await page.evaluate(async ({ SUB, CPP, PROM }) => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const M = window.__ctAg, r = {};
    window.__catedraGoView('ciclo'); await w(900);
    document.getElementById('ct-cycle-tab-configurar').click(); await w(600);
    const cfg = document.getElementById('ct-cycle-panel-configurar');
    const cab = id => cfg.querySelector('.ct-ag-cab[data-id="' + id + '"]');
    const abrir = async id => { if (cab(id).getAttribute('aria-expanded') !== 'true') { cab(id).click(); await w(400); } return cab(id).closest('.ct-ag'); };
    const sel = (card, f) => card.querySelector('select[data-field="' + f + '"]');
    const tit = card => card.querySelector('.ct-ag-tit');
    const inteiro = el => !!el && el.scrollHeight <= el.clientHeight + 1;
    if (!['ag-longo', 'ag-cpp', 'ag-semtop', 'ag-semdisc', 'ag-prom'].every(id => !!cab(id))) throw new Error('a semente não montou os 5 cartões da agenda');
    // fechado, o título do nome longo segue cortado em 3 linhas (a semana precisa caber) — medido
    // ANTES de abrir, e exigido junto com o "inteiro em edição" lá embaixo
    const fechadoCortado = tit(cab('ag-longo').closest('.ct-ag')).textContent === SUB && !inteiro(tit(cab('ag-longo').closest('.ct-ag')));
    // (a) cada opção vazia, à vista no seu select, cabe na área útil
    let c = await abrir('ag-semdisc');
    r.vaziaDaDisciplinaCabe = M.vaziaCabe(sel(c, 'discEdital'));
    c = await abrir('ag-semtop');
    r.vaziaDoTopicoCabe = M.vaziaCabe(sel(c, 'topico'));
    c = await abrir('ag-cpp');
    r.vaziaDoSubtopicoCabe = M.vaziaCabe(sel(c, 'subtopico'));
    // (b) title = nome inteiro do selecionado; o tópico de 73 caracteres, cortado em 70 na opção
    const sT = sel(c, 'topico'), opT = sT && sT.selectedOptions[0];
    r.titleDoTopicoCortadoEhONomeInteiro = !!opT && sT.title === CPP && opT.textContent === CPP.slice(0, 70) + '…';
    // (c) em edição, o cabeçalho mostra o tópico inteiro
    r.cabecalhoEmEdicaoMostraOTopicoInteiro = tit(c).textContent === CPP && inteiro(tit(c));
    c = await abrir('ag-longo');
    const sD = sel(c, 'discEdital'), sS = sel(c, 'subtopico'), sTl = sel(c, 'topico');
    r.titleDaDisciplinaEhOSelecionado = !!sD && sD.title === 'Direito Penal' && sD.selectedOptions[0].textContent === 'Direito Penal';
    r.titleDoTopicoEhOSelecionado = !!sTl && sTl.title === 'Leis Penais Especiais' && sTl.selectedOptions[0].textContent === 'Leis Penais Especiais';
    r.titleDoSubtopicoCortadoEhONomeInteiro = !!sS && sS.title === SUB && sS.selectedOptions[0].textContent === SUB.slice(0, 70) + '…';
    r.cabecalhoEmEdicaoMostraOSubtopicoInteiroEFechadoCorta = fechadoCortado && tit(c).textContent === SUB && inteiro(tit(c));
    // o title acompanha o valor: vazio enquanto nada está escolhido (a opção vazia cabe, não há o
    // que revelar) e, escolhido pelo select, o nome escolhido — o template re-renderiza
    c = await abrir('ag-cpp');
    const sSub = sel(c, 'subtopico'); const tituloVazio = sSub.value === '' && sSub.title === '';
    sSub.value = 'Do inquérito policial'; sSub.dispatchEvent(new Event('change', { bubbles: true })); await w(500);
    c = cab('ag-cpp').closest('.ct-ag');
    r.titleAcompanhaOValor = tituloVazio && sel(c, 'subtopico').title === 'Do inquérito policial' && tit(c).textContent === 'Do inquérito policial';
    // (d) o nome-parágrafo (tópico de 1179 do promotor): em edição, mais que o fechado e no
    // máximo 13 linhas, cortado; com o cabeçalho no topo da área visível, o select Disciplina
    // (o primeiro campo) fica inteiro dentro da janela
    c = await abrir('ag-prom');
    const tP = tit(c), lh = parseFloat(getComputedStyle(tP).lineHeight);
    r.nomeParagrafoEmEdicaoCortaEmAte13Linhas = tP.textContent === PROM && lh > 0
      && tP.clientHeight > 3 * lh + 1 && tP.clientHeight <= 13 * lh + 1 && tP.scrollHeight > tP.clientHeight + 1;
    cab('ag-prom').scrollIntoView({ block: 'start', behavior: 'instant' }); await w(300);
    let rol = cab('ag-prom').parentElement;
    while (rol && rol !== document.documentElement && !(/(auto|scroll)/.test(getComputedStyle(rol).overflowY) && rol.scrollHeight > rol.clientHeight)) rol = rol.parentElement;
    const caixa = rol && rol !== document.documentElement ? rol.getBoundingClientRect() : { top: 0, bottom: innerHeight };
    const topoVis = Math.max(0, caixa.top), fundoVis = Math.min(innerHeight, caixa.bottom);
    const rc = cab('ag-prom').getBoundingClientRect(), sDp = sel(cab('ag-prom').closest('.ct-ag'), 'discEdital');
    const rd = sDp && sDp.getBoundingClientRect();
    r.nomeParagrafoDeixaADisciplinaNaJanela = !!rd && Math.abs(rc.top - topoVis) <= 2 && rd.top >= topoVis && rd.bottom <= fundoVis + 1;
    return r;
  }, { SUB, CPP, PROM });
  for (const [k, v] of Object.entries(r)) ok(v, T + k);
}

/* A agenda no TOQUE, a 390 px (celular), em contexto próprio (padrão de registro-sessao.mjs):
   três atividades no mesmo roteiro — Penal, Civil e uma SEM disciplina — para que a nota
   "Roteiro: …" apareça (no roteiro principal o cadastro rápido grava roteiro vazio). Prova:
   sem rolagem lateral, colunas dentro do contêiner, alvos ≥ 44 px, Tipo por extenso e lado a
   lado com Minutos, contraste ≥ 4,5:1 contra o pior ponto da lavagem nos DOIS temas (meta,
   rótulos, nota, Remover, título vermelho do cartão sem disciplina) e o anel de foco inset. */
async function agendaNoToque(pageDaSuite, base, ok, R, arquivo) {
  const ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  const T = R + 'agenda no toque (390) ';
  try {
    await page.goto(base + '/__semente');
    await page.evaluate(() => {
      const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
      const Tp = names => names.map(n => ({ name: n, done: false, subs: [] }));
      localStorage.clear();
      set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica'); set('cycleMode', 'manual'); set('blocks', []);
      set('edital', [{ disc: 'Direito Penal', peso: 2, questoes: 15, topics: Tp(['Teoria do crime']) }, { disc: 'Direito Civil', peso: 2, questoes: 15, topics: Tp(['Obrigações']) }]);
      set('sessions', []); set('reviews', []); set('errors', []);
      set('manualFixed', [
        { id: 'ag-penal', disc: 'Direito Penal', kind: 'Jurisprudência', min: 50, dia: 'seg', roteiro: 'Roteiro 1', discEdital: 'Direito Penal', topico: 'Teoria do crime' },
        { id: 'ag-civil', disc: 'Direito Civil', kind: 'Flashcards', min: 45, dia: 'qua', roteiro: 'Roteiro 1', discEdital: 'Direito Civil', topico: '' },
        { id: 'ag-solta', disc: '', kind: 'Questões', min: 30, dia: 'sex', roteiro: 'Roteiro 1', discEdital: '', topico: '' }]);
    });
    await page.goto(base + '/' + arquivo); await page.waitForTimeout(1800);
    await page.evaluate(medidasNaPagina);
    const { r, n } = await page.evaluate(async () => {
      const w = ms => new Promise(res => setTimeout(res, ms));
      const app = window.__catedraApp, M = window.__ctAg, r = {}, n = { claro: {}, escuro: {} };
      window.__catedraGoView('ciclo'); await w(900);
      document.getElementById('ct-cycle-tab-configurar').click(); await w(600);
      const cfg = document.getElementById('ct-cycle-panel-configurar');
      const cab = id => cfg.querySelector('.ct-ag-cab[data-id="' + id + '"]');
      const abrir = async id => { if (cab(id).getAttribute('aria-expanded') !== 'true') { cab(id).click(); await w(400); } return cab(id).closest('.ct-ag'); };
      r.tresCartoesNoMesmoRoteiro = cfg.querySelectorAll('.ct-ag').length === 3 && !!cab('ag-penal') && !!cab('ag-civil') && !!cab('ag-solta');
      // a semana quebra linha: nada rola de lado, nenhuma coluna passa da borda do contêiner
      const cont = cfg.querySelector('.ct-ag-rolagem').getBoundingClientRect(); const cols = [...cfg.querySelectorAll('.ct-ag-col')];
      r.semRolagemLateral = document.documentElement.scrollWidth <= innerWidth;
      r.colunasDentroDoConteiner = cols.length === 8 && cols.every(c => { const b = c.getBoundingClientRect(); return b.left >= cont.left - 0.5 && b.right <= cont.right + 0.5 && b.right <= innerWidth; });
      // alvos de toque, com um cartão aberto
      const ab = await abrir('ag-penal'); const alt = el => el.getBoundingClientRect().height;
      const campos = [...ab.querySelectorAll('.ct-campo')], acoes = [...ab.querySelectorAll('.ct-ag-acoes button')], adds = [...cfg.querySelectorAll('.ct-ag-add')], cabs = [...cfg.querySelectorAll('.ct-ag-cab')];
      r.alvoCamposNo44 = campos.length >= 5 && campos.every(e => alt(e) >= 44);
      r.alvoProntoERemoverNo44 = acoes.length === 2 && acoes.every(e => alt(e) >= 44);
      r.alvoMaisAtividadeNo44 = adds.length === 8 && adds.every(e => alt(e) >= 44);
      r.alvoCabecalhoNo44 = cabs.length === 3 && cabs.every(e => alt(e) >= 44);
      // Tipo por extenso e, havendo espaço (260 px de linha), lado a lado com Minutos
      const sel = ab.querySelector('select[data-field="kind"]'), num = ab.querySelector('input[data-field="min"]');
      r.tipoCabeOTexto = !!sel && M.tipoCabeOTexto(sel);
      const bt = sel.closest('.ct-ag-campo').getBoundingClientRect(), bm = num.closest('.ct-ag-campo').getBoundingClientRect();
      r.tipoEMinutosLadoALado = Math.abs(bt.top - bm.top) < 1 && bm.left >= bt.right;
      // contraste contra o pior ponto da lavagem, cartão a cartão, nos dois temas
      for (const escuro of [false, true]) {
        app.setState({ darkMode: escuro }); await w(500);
        const q = n[escuro ? 'escuro' : 'claro']; q.meta = []; q.rotulos = []; q.nota = []; q.remover = []; q.titulo = [];
        for (const id of ['ag-penal', 'ag-civil', 'ag-solta']) {
          const card = await abrir(id); const bg = M.fundoLavagem(card);
          q.meta.push(M.texto(card.querySelector('.ct-ag-meta'), bg));
          card.querySelectorAll('.ct-ag-form .ct-rotulo').forEach(e => q.rotulos.push(M.texto(e, bg)));
          const nota = card.querySelector('.ct-ag-nota'); if (nota) q.nota.push(M.texto(nota, bg));
          const rem = card.querySelector('.ct-ag-remover'); const rb = M.rgba(getComputedStyle(rem).backgroundColor);
          q.remover.push(M.texto(rem, rb.a >= 1 ? rb : M.sobre(rb, bg)));
          if (id === 'ag-solta') {
            const tit = card.querySelector('.ct-ag-tit');
            r['tituloSemDisciplinaNaCorDoPerigo' + (escuro ? 'Escuro' : 'Claro')] = card.getAttribute('data-sem-disc') === 'true' && getComputedStyle(tit).color === M.token(card, 'var(--danger)');
            q.titulo.push(M.texto(tit, bg));
          }
        }
      }
      app.setState({ darkMode: false }); await w(400);
      return { r, n };
    });
    for (const [k, v] of Object.entries(r)) ok(v, T + k);
    const minimo = { meta: 3, rotulos: 12, nota: 3, remover: 3, titulo: 1 };
    for (const tema of ['claro', 'escuro']) for (const [k, qtd] of Object.entries(minimo)) {
      const xs = n[tema][k] || []; const pior = xs.length ? Math.min(...xs) : 0;
      ok(xs.length >= qtd && pior >= 4.5, T + 'contraste ' + tema + ' ' + k + ' ≥ 4,5:1 (pior ' + pior.toFixed(2) + ' em ' + xs.length + ' medidas)');
    }
    // anel de foco: o cabeçalho focado por teclado mostra o box-shadow inset (o cartão não corta)
    const foco = () => page.evaluate(() => { const c = document.querySelector('#ct-cycle-panel-configurar .ct-ag-cab'); return { ativo: document.activeElement === c, fv: c.matches(':focus-visible'), sombra: getComputedStyle(c).boxShadow }; });
    await page.evaluate(() => document.querySelector('#ct-cycle-panel-configurar .ct-ag-cab').focus({ focusVisible: true }));
    let f = await foco();
    if (!f.fv) { await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); f = await foco(); }
    ok(f.ativo && f.fv && /inset/.test(f.sombra), T + 'cabeçalho focado por teclado mostra o anel inset (' + f.sombra + ')');
  } finally { await ctx.close(); }
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
