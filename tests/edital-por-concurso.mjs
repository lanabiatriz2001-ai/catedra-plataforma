/* CADA CONCURSO COM O SEU EDITAL (03/10/2026)

   Decisão da dona: "cada concurso tem o seu edital" — mantendo o estudo ÚNICO de 17/09
   (tests/varios-editais.mjs). Antes, aplicar o modelo do TJ-PE e depois o do TJ-BA somava os
   tópicos dos dois na mesma disciplina, e os dois concursos mostravam a mistura.

   O acervo continua um só e NÃO é movido. Cada tópico/subtópico pode carregar `eds` (os
   concursos a que pertence); sem `eds` vale para todos — é tudo o que existia antes.

   O que se prova aqui, sempre pelo caminho da pessoa e lendo o que ficou GRAVADO:
   · QUEM JÁ USAVA não nota nada: edital sem `eds` aparece inteiro, e a vista de leitura é o
     próprio acervo (mesma referência), com um concurso ou com vários;
   · DOIS EDITAIS NÃO SE MISTURAM: cada concurso mostra só os tópicos do edital dele;
   · O ESTUDO É UM SÓ: tópico de mesmo nome nos dois é o mesmo — marcar num vale no outro, e o
     acervo não ganha segunda cópia;
   · subtópico também é por concurso;
   · "tópicos de outros concursos": aparecem sob a disciplina (medido), e trazer um põe o
     tópico neste concurso sem copiar nada;
   · o botão "Criar um concurso com este edital" do modelo cria o concurso e aplica só nele;
   · contagens, painel por concurso, seletor da sessão, prioridade e ciclo leem o concurso certo;
   · tudo sobrevive a fechar e reabrir, e o merge entre aparelhos não perde a marca `eds`. */

export async function testarEditalPorConcurso(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const R = 'EDITAL/CONCURSO [' + motor + '] ';
  const arquivo = opcoes.arquivo || 'Catedra.dc.html';
  const ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('ERRO NA PÁGINA:', e.message); ok(false, R + 'sem erro de página (' + String(e.message).slice(0, 140) + ')'); });
  try {
    await legado(page, base, ok, R, arquivo);
    await doisEditais(page, base, ok, R, arquivo);
    await modeloCriaConcurso(page, base, ok, R, arquivo);
    await merge(page, base, ok, R);
  } catch (e) { ok(false, R + 'roteiro quebrou: ' + String(e && e.message || e).split('\n')[0].slice(0, 200)); }
  finally { await ctx.close(); }
}

async function semear(page, base, chaves) {
  await page.goto(base + '/__semente');
  await page.evaluate((ch) => {
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    localStorage.clear();
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
    set('sessions', []); set('reviews', []); set('errors', []);
    Object.keys(ch).forEach(k => set(k, ch[k]));
  }, chaves);
}
const EDITAL_ANTIGO = [
  { disc: 'Direito Civil', peso: 2, questoes: 15, color: '#2563eb', topics: [{ name: 'Obrigações', done: true, subs: [{ name: 'Pagamento', done: true }, 'Mora'] }, { name: 'Contratos', done: false, subs: [] }] },
  { disc: 'Direito Penal', peso: 1, questoes: 10, color: '#dc2626', topics: [{ name: 'Teoria do crime', done: false, subs: [] }] }];

/* Quem já usava: nada muda, com um concurso ou com dois. */
async function legado(page, base, ok, R, arquivo) {
  await semear(page, base, { edital: EDITAL_ANTIGO });
  await page.goto(base + '/' + arquivo); await page.waitForTimeout(1900);
  const r = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const app = window.__catedraApp; window.__catedraGoView('edital'); await w(1000);
    const out = {};
    out.mesmaRef = app._edVista() === app.state.edital;
    out.semEds = JSON.stringify(app.state.edital).indexOf('"eds"') < 0;
    out.outrosNaTela = document.querySelectorAll('[data-ed-outros]').length;
    const civ = app._edVista().find(d => d.disc === 'Direito Civil');
    out.civ = civ.topics.length + '/' + civ.topics[0].subs.length;
    // segundo concurso: a disciplina é marcada nele, e os tópicos antigos (de todos) aparecem
    window.prompt = () => 'TJSP 2026';
    [...document.querySelectorAll('button')].find(b => /^Novo concurso$/.test((b.textContent || '').trim())).click(); await w(900);
    // o edital antigo fica com o concurso que já existia: o novo NÃO o herda
    const cru = app.state.edital.find(d => d.disc === 'Direito Civil');
    out.fechado = cru.topics.map(t => (t.eds || ['SEM MARCA']).join('+')).join(',');
    out.vazioNoNovo = app._edVista().find(d => d.disc === 'Direito Civil').topics.length;
    out.principalIntacto = app._edVista('ed-principal').find(d => d.disc === 'Direito Civil').topics.length;
    // marcar a disciplina à mão num concurso que não tem NENHUM tópico dela traz os que existem
    const i = app.state.edital.findIndex(d => d.disc === 'Direito Civil');
    app.toggleNoConcurso({ currentTarget: { dataset: { i: String(i) } } }); await w(500);
    const civ2 = app._edVista().find(d => d.disc === 'Direito Civil');
    out.noNovo = civ2.topics.length + '/' + civ2.topics[0].subs.length + '/' + civ2.topics[0].done;
    out.penalSegueSoNoPrincipal = (app.state.edital.find(d => d.disc === 'Direito Penal').topics[0].eds || []).join('+');
    return out;
  });
  ok(r.mesmaRef && r.semEds && r.civ === '2/2', R + 'quem já usava: o edital antigo aparece inteiro e a vista de leitura É o acervo (nada é copiado nem filtrado)');
  ok(r.outrosNaTela === 0, R + 'quem já usava: nenhuma linha de "tópicos de outros concursos" aparece');
  ok(r.fechado === 'ed-principal,ed-principal' && r.vazioNoNovo === 0 && r.principalIntacto === 2,
    R + 'ao nascer um concurso, o edital antigo fica com o concurso que já existia — o novo não o herda (' + r.fechado + ' · ' + r.vazioNoNovo + ' no novo)');
  ok(r.noNovo === '2/2/true' && r.penalSegueSoNoPrincipal === 'ed-principal',
    R + 'marcar à mão a disciplina num concurso sem nenhum tópico dela traz os tópicos que existem, com o estudo feito (' + r.noNovo + ')');
}

/* Dois editais, pelo importador da tela: não se misturam, e o estudo é um só. */
async function doisEditais(page, base, ok, R, arquivo) {
  await semear(page, base, { edital: [] });
  await page.goto(base + '/' + arquivo); await page.waitForTimeout(1900);
  const importar = (texto) => page.evaluate(async (t) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const app = window.__catedraApp; window.__catedraGoView('edital'); await w(500);
    app.setState({ edRaw: t }); await w(250);
    [...document.querySelectorAll('button')].find(b => /^Reconhecer sem IA$/.test((b.textContent || '').trim())).click(); await w(500);
    app.edConfirm(); await w(700);
  }, texto);
  await importar('DIREITO CIVIL\n1 Prescrição. Prazos. Causas de interrupção.\n2 Contratos\nDIREITO PENAL\n1 Teoria do crime');
  const a = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const app = window.__catedraApp;
    const idA = app._espAtivo(); const semMarca = JSON.stringify(app.state.edital).indexOf('"eds":["ed-principal"]') < 0;
    window.prompt = () => 'Concurso B';
    [...document.querySelectorAll('button')].find(b => /^Novo concurso$/.test((b.textContent || '').trim())).click(); await w(900);
    return { idA, semMarca, idB: app._espAtivo(), civilForaEmB: (app.state.edital.find(d => d.disc === 'Direito Civil') || {}).foraDoConcurso };
  });
  ok(a.idA === 'ed-principal' && !a.semMarca, R + 'o PRIMEIRO edital, importado com o app vazio, já entra marcado como do concurso principal');
  ok(a.idA && a.idB && a.idA !== a.idB && a.civilForaEmB === true, R + 'concurso novo criado; a disciplina do outro edital nasce fora dele');
  await importar('DIREITO CIVIL\n1 Prescrição. Prazos. Decadência.\n2 Posse');
  const b = await page.evaluate(async (ids) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const app = window.__catedraApp; const out = {};
    const nomes = (id) => { const d = app._edVista(id).find(x => x.disc === 'Direito Civil'); return (d ? d.topics : []).map(t => t.name + (t.subs.length ? '{' + t.subs.map(s => s.name).join(',') + '}' : '')).join(' | '); };
    out.emB = nomes(ids.idB); out.emA = nomes(ids.idA);
    const civ = app.state.edital.find(d => d.disc === 'Direito Civil');
    out.acervo = civ.topics.map(t => t.name).join(' | ');
    out.foraB = civ.foraDoConcurso;
    out.penalEmB = (app.state.edital.find(d => d.disc === 'Direito Penal') || {}).foraDoConcurso;
    // a TELA do concurso B (medida): só os tópicos dele + a linha dos outros
    window.__catedraGoView('edital'); await w(500);
    const i = app.state.edital.indexOf(civ);
    if (!civ.open) { app.toggleEdital({ currentTarget: { dataset: { i: String(i) } } }); await w(500); }
    const caixa = document.querySelector('[data-ed-outros="Direito Civil"]');
    const cartao = caixa && caixa.parentElement;
    out.naTela = cartao ? [...cartao.querySelectorAll('input[title="Editar tópico"]')].map(x => x.value).join(' | ') : 'SEM CARTÃO';
    const botao = caixa && caixa.querySelector('button');
    out.outrosTxt = botao ? botao.textContent.trim() : '';
    out.outrosAlt = botao ? Math.round(botao.getBoundingClientRect().height) : 0;
    // marcar "Prescrição" como estudada no B (botão real do tópico)
    const linha = cartao && [...cartao.querySelectorAll('input[title="Editar tópico"]')].find(x => /Prescrição/.test(x.value));
    const check = linha && linha.parentElement.querySelector('button[title="Concluir / desmarcar"]');
    if (check) check.click(); await w(600);
    out.feitoEmA = (app._edVista(ids.idA).find(x => x.disc === 'Direito Civil').topics.find(t => /Prescrição/.test(t.name)) || {}).done;
    // contagens por concurso (painel) e seletor de tópico da sessão
    const res = app._resumoConcursos();
    out.pctA = (res.find(x => x.id === ids.idA) || {}).pct; out.pctB = (res.find(x => x.id === ids.idB) || {}).pct;
    out.select = app._topicosDe('Direito Civil').map(t => t.name).join(' | ');
    out.selectCru = app._topicosDe('Direito Civil', true).length;
    // a prioridade recebe o edital do concurso ATIVO (espia o que chega à calculadora)
    const calc = window.CT_PRIORIDADE_CALC, orig = calc && calc.prioridadeDisciplinas; out.prio = 'SEM CALCULADORA';
    if (orig) { calc.prioridadeDisciplinas = function (arg) { const c = (arg.edital || []).find(d => d.disc === 'Direito Civil'); out.prio = c ? c.topics.map(t => t.name).join(' | ') : 'SEM CIVIL'; return orig.apply(this, arguments); };
      try { app._prioridade(); } catch (e) { out.prio = 'EXCEÇÃO ' + e.message; } calc.prioridadeDisciplinas = orig; }
    // ÍNDICES: "Posse" é o 2º da tela mas o 3º do acervo ("Contratos", do A, está no meio);
    // "Decadência" é o 2º subtópico da tela e o 3º do acervo. Concluir e editar acham o certo.
    const entP = [...cartao.querySelectorAll('input[title="Editar tópico"]')].find(x => x.value === 'Posse');
    out.idxPosse = entP ? entP.dataset.i : 'SEM';
    if (entP) entP.parentElement.querySelector('button[title="Concluir / desmarcar"]').click(); await w(400);
    const entD = [...cartao.querySelectorAll('input[title="Editar subtópico"]')].find(x => x.value === 'Decadência');
    out.idxDec = entD ? entD.dataset.t + '.' + entD.dataset.i : 'SEM';
    if (entD) entD.parentElement.querySelector('button[title="Concluir / desmarcar"]').click(); await w(400);
    if (entP) app.editTopic({ currentTarget: { dataset: { d: entP.dataset.d, i: entP.dataset.i }, value: 'Posse' } }); await w(200);
    const cv = () => app.state.edital.find(d => d.disc === 'Direito Civil');
    out.aposIdx = cv().topics.map(t => t.name + ':' + !!t.done).join(' | ') + ' || ' + cv().topics[0].subs.map(x => x.name + ':' + !!x.done).join(' | ');
    // abrir "outros" e trazer "2 Contratos" para o B (botões reais)
    if (botao) botao.click(); await w(500);
    const cx = document.querySelector('[data-ed-outros="Direito Civil"]');
    out.outrosLista = cx ? [...cx.querySelectorAll('span')].map(x => x.textContent.trim()).join(' | ') : '';
    const trazer = cx && [...cx.querySelectorAll('button')].find(x => /^Trazer para este concurso$/.test(x.textContent.trim()));
    out.trazerAlt = trazer ? Math.round(trazer.getBoundingClientRect().height) : 0;
    const linhaC = cx && [...cx.querySelectorAll('div')].find(x => x.children.length === 2 && /^Contratos$/.test(x.children[0].textContent.trim()));
    if (linhaC) linhaC.querySelector('button').click(); await w(600);
    out.emBDepois = nomes(ids.idB);
    out.acervoDepois = app.state.edital.find(d => d.disc === 'Direito Civil').topics.length;
    // "marcar no edital" pela sessão: conclui só os subtópicos DESTE concurso
    app.toggleSub({ currentTarget: { dataset: { d: String(i), t: '0', i: '2' } } }); await w(300);   // Decadência volta a "não feita"
    app._marcarNoEdital('Direito Civil', 'Prescrição', ''); await w(400);
    out.marcar = cv().topics[0].subs.map(x => x.name + ':' + !!x.done).join(' | ');
    // tirar "Posse" deste concurso (botão real): some daqui, fica no acervo com o estudo
    const cartao2 = document.querySelector('[data-ed-outros="Direito Civil"]').parentElement;
    const entP2 = [...cartao2.querySelectorAll('input[title="Editar tópico"]')].find(x => x.value === 'Posse');
    const tirar = entP2 && entP2.parentElement.querySelector('button[data-tirar]');
    out.tirarCaixa = tirar ? Math.round(tirar.getBoundingClientRect().width) + 'x' + Math.round(tirar.getBoundingClientRect().height) : 'SEM BOTÃO';
    if (tirar) tirar.click(); await w(500);
    out.semPosse = nomes(ids.idB); out.posseNoAcervo = cv().topics.filter(t => t.name === 'Posse' && t.done).length;
    out.rotulo = (document.querySelector('[data-ed-outros="Direito Civil"] button') || {}).textContent;
    // "Trazer todos": tudo o que é do acervo passa a valer aqui
    const todos = [...document.querySelectorAll('[data-ed-outros="Direito Civil"] button')].find(x => /^Trazer todos$/.test(x.textContent.trim()));
    if (todos) todos.click(); await w(500);
    out.comTodos = nomes(ids.idB); out.semLinha = !document.querySelector('[data-ed-outros="Direito Civil"]');
    app.tirarTopico({ currentTarget: { dataset: { d: String(i), t: '0', s: '1' } } }); await w(400);   // devolve "Causas de interrupção" só ao A
    out.subTirado = nomes(ids.idB);
    await w(1400);
    out.gravado = JSON.parse(localStorage.getItem('catedra:edital') || '[]').find(d => d.disc === 'Direito Civil').topics.map(t => t.name + ':' + (t.eds || ['todos']).join('+')).join(' | ');
    return out;
  }, a);
  ok(b.emB === 'Prescrição{Prazos,Decadência} | Posse', R + 'concurso B mostra SÓ os tópicos e subtópicos do edital dele (' + b.emB + ')');
  ok(b.emA === 'Prescrição{Prazos,Causas de interrupção} | Contratos', R + 'concurso A continua com o edital dele, sem o que veio do B (' + b.emA + ')');
  ok(b.acervo === 'Prescrição | Contratos | Posse' && b.foraB === false && b.penalEmB === true,
    R + 'o acervo é um só: "Prescrição" não ganhou segunda cópia; Civil entrou no B e Penal segue fora dele (' + b.acervo + ')');
  ok(b.naTela === 'Prescrição | Posse', R + 'tela do Edital no concurso B lista só os tópicos dele (' + b.naTela + ')');
  ok(/^1 tópico e 1 subtópico de outros concursos$/.test(b.outrosTxt) && b.outrosAlt >= 44, R + 'tela: "' + b.outrosTxt + '" aparece sob a disciplina, com alvo de toque de ' + b.outrosAlt + ' px');
  ok(b.feitoEmA === true, R + 'o estudo é um só: marcar "Prescrição" no concurso B marca no concurso A');
  ok(b.pctA === 33 && b.pctB === 50, R + 'painel: cada concurso conta só os tópicos dele — A tem 1 de 3 (com Penal), B tem 1 de 2 (A ' + b.pctA + '% · B ' + b.pctB + '%)');
  ok(b.select === 'Prescrição | Posse' && b.selectCru === 3, R + 'registro de sessão oferece os tópicos do concurso ativo; a conferência de tópico já gravado olha o acervo todo');
  ok(b.prio === 'Prescrição | Posse', R + 'a prioridade recebe só os tópicos do concurso ativo (' + b.prio + ')');
  ok(b.idxPosse === '2' && b.idxDec === '0.2', R + 'tela filtrada entrega os índices do ACERVO (Posse ' + b.idxPosse + ' · Decadência ' + b.idxDec + ')');
  ok(b.aposIdx === 'Prescrição:true | Contratos:false | Posse:true || Prazos:false | Causas de interrupção:false | Decadência:true',
    R + 'concluir pela tela filtrada marca o tópico e o subtópico CERTOS, sem tocar no vizinho de outro concurso (' + b.aposIdx + ')');
  ok(/Prescrição › Causas de interrupção/.test(b.outrosLista) && /Contratos/.test(b.outrosLista) && b.trazerAlt >= 44,
    R + 'lista de outros concursos traz o tópico e o subtópico que não são daqui (' + b.outrosLista + ')');
  ok(b.emBDepois === 'Prescrição{Prazos,Decadência} | Contratos | Posse' && b.acervoDepois === 3,
    R + '"Trazer para este concurso" põe o tópico aqui sem copiar nada (' + b.emBDepois + ')');
  ok(b.marcar === 'Prazos:true | Causas de interrupção:false | Decadência:true', R + '"marcar no edital" pela sessão conclui só os subtópicos deste concurso (' + b.marcar + ')');
  ok(b.tirarCaixa === '44x44' && b.semPosse === 'Prescrição{Prazos,Decadência} | Contratos' && b.posseNoAcervo === 1,
    R + '"Tirar deste concurso" (alvo ' + b.tirarCaixa + ') some com o tópico daqui e o mantém no acervo, com o estudo (' + b.semPosse + ')');
  ok(/^1 tópico e 1 subtópico de outros concursos$/.test(String(b.rotulo || '').trim()), R + 'o rótulo conta tópico e subtópico separados (' + String(b.rotulo || '').trim() + ')');
  ok(b.comTodos === 'Prescrição{Prazos,Causas de interrupção,Decadência} | Contratos | Posse' && b.semLinha, R + '"Trazer todos" põe aqui tudo o que é do acervo, e a linha de outros concursos some (' + b.comTodos + ')');
  ok(b.subTirado === 'Prescrição{Prazos,Decadência} | Contratos | Posse', R + 'subtópico também pode ser tirado deste concurso (' + b.subTirado + ')');
  ok(new RegExp('^Prescrição:' + a.idA + '\\+' + a.idB + ' \\| Contratos:' + a.idA + '\\+' + a.idB + ' \\| Posse:' + a.idB + '$').test(b.gravado),
    R + 'gravado no aparelho: cada tópico com os concursos a que pertence (' + b.gravado + ')');

  // fechar e reabrir; depois voltar ao concurso A pelo seletor
  await page.goto(base + '/' + arquivo); await page.waitForTimeout(1900);
  const c = await page.evaluate(async (ids) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const app = window.__catedraApp; window.__catedraGoView('edital'); await w(800);
    const nomes = () => (app._edVista().find(x => x.disc === 'Direito Civil') || { topics: [] }).topics.map(t => t.name).join(' | ');
    const out = { ativo: app._espAtivo() === ids.idB, emB: nomes() };
    app.trocarConcurso({ currentTarget: { dataset: { id: ids.idA }, value: ids.idA } }); await w(900);
    out.emA = nomes(); out.feito = app._edVista().find(x => x.disc === 'Direito Civil').topics[0].done;
    // cadastro manual no A: tópico repetido não duplica, subtópico repetido também não
    app.setState({ cad: { ...app.state.cad, mode: 'existente', discSel: 'Direito Civil', topico: 'Posse', sub: '', peso: '', questoes: '' } }); await w(200);
    app.addCadastro(); await w(500);
    out.aposCad = nomes(); out.acervo = app.state.edital.find(d => d.disc === 'Direito Civil').topics.length;
    return out;
  }, a);
  ok(c.ativo && c.emB === 'Prescrição | Contratos | Posse', R + 'fechar e reabrir: o concurso ativo e o edital dele continuam como ficaram (' + c.emB + ')');
  ok(c.emA === 'Prescrição | Contratos' && c.feito === true, R + 'trocar para o concurso A mostra o edital do A, com o estudo feito no B (' + c.emA + ')');
  ok(c.aposCad === 'Prescrição | Contratos | Posse' && c.acervo === 3, R + 'cadastrar à mão um tópico que já existe em outro concurso o traz para este, sem duplicar (' + c.aposCad + ')');
}

/* O botão do modelo: cria o concurso e aplica o edital só nele. */
async function modeloCriaConcurso(page, base, ok, R, arquivo) {
  await semear(page, base, { edital: EDITAL_ANTIGO });
  await page.goto(base + '/' + arquivo); await page.waitForTimeout(1900);
  const r = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const app = window.__catedraApp; const out = {};
    window.__catedraGoView('edital'); await w(800);
    app.toggleModelo(); await w(1200);
    const criar = async (id) => {
      const chip = document.querySelector('button[data-id="' + id + '"]'); if (!chip) return 'SEM CHIP ' + id;
      chip.click(); await w(800);
      const b = document.querySelector('button[data-modelo-novo-concurso]'); if (!b) return 'SEM BOTÃO';
      const alt = Math.round(b.getBoundingClientRect().height);
      b.click(); await w(1300);
      return alt;
    };
    out.alt = await criar('oab2Civil');
    out.nomeAtivo = (app._concursoAtivo() || {}).nome;
    const vista = () => app._edVista().filter(d => !d.foraDoConcurso).map(d => d.disc + ':' + d.topics.length).join(' | ');
    out.civil = vista();
    out.penalFora = (app.state.edital.find(d => d.disc === 'Direito Penal') || {}).foraDoConcurso;
    const idCivil = app._espAtivo();
    app.toggleModelo(); await w(900);
    await criar('oab2Penal');
    out.nomeAtivo2 = (app._concursoAtivo() || {}).nome;
    out.penal = vista();
    out.civilNoCivil = app._edVista(idCivil).filter(d => /Civil/.test(d.disc)).map(d => d.disc + ':' + d.topics.length).join(' | ');
    out.principal = app._edVista('ed-principal').filter(d => d.topics.length).map(d => d.disc + ':' + d.topics.length).join(' | ');
    await w(1500);
    const E = JSON.parse(localStorage.getItem('catedra:editais') || '[]');
    out.concursos = E.map(e => e.nome).join(' | ');
    out.discsCivil = Object.keys((E.find(e => e.id === idCivil) || { discs: {} }).discs).filter(n => !(E.find(e => e.id === idCivil).discs[n] || {}).fora).join(' | ');
    out.estudo = app.state.edital.find(d => d.disc === 'Direito Civil').topics.find(t => t.name === 'Obrigações').done;
    // modelo aplicado do jeito comum, no concurso principal, sobre tópicos que já são de outro
    // concurso: eles passam a ser deste também, e o acervo NÃO ganha segunda cópia
    const antes = app.state.edital.find(d => d.disc === 'Direito Civil').topics.length;
    app.trocarConcurso({ currentTarget: { dataset: { id: 'ed-principal' }, value: 'ed-principal' } }); await w(900);
    app.toggleModelo(); await w(900);
    const chip = document.querySelector('button[data-id="oab2Civil"]'); if (chip) chip.click(); await w(800);
    app.aplicarModelo(); await w(900);
    const civ = app.state.edital.find(d => d.disc === 'Direito Civil');
    out.comum = app._edVista('ed-principal').find(d => d.disc === 'Direito Civil').topics.length + '/' + civ.topics.length + '/' + antes;
    out.doisDonos = civ.topics.filter(t => (t.eds || []).length === 2).length;
    return out;
  });
  ok(r.alt >= 44, R + 'modelo: o botão "Criar um concurso com este edital" aparece (' + r.alt + ' px de altura)');
  ok(r.nomeAtivo === 'OAB · 2ª fase · Civil' && r.civil === 'Direito Civil:26 | Direito Processual Civil:37' && r.penalFora === true,
    R + 'modelo: cria o concurso com o nome do edital e põe nele só as disciplinas do modelo (' + r.nomeAtivo + ' — ' + r.civil + ')');
  ok(r.nomeAtivo2 === 'OAB · 2ª fase · Penal' && /^Direito Penal:\d+ \| Direito Processual Penal:\d+$/.test(r.penal),
    R + 'modelo: um segundo edital vira um segundo concurso, sem as disciplinas do primeiro (' + r.penal + ')');
  ok(r.civilNoCivil === 'Direito Civil:26 | Direito Processual Civil:37', R + 'modelo: o concurso do primeiro edital não ganhou nada do segundo (' + r.civilNoCivil + ')');
  ok(r.principal === 'Direito Civil:2 | Direito Penal:1', R + 'modelo: "Meu concurso" continua só com o que era dele (' + r.principal + ')');
  ok(r.concursos === 'Meu concurso | OAB · 2ª fase · Civil | OAB · 2ª fase · Penal' && r.discsCivil === 'Direito Civil | Direito Processual Civil',
    R + 'gravado: três concursos, cada um com as disciplinas dele (' + r.concursos + ')');
  ok(r.estudo === true, R + 'o que já estava estudado continua estudado');
  ok(r.comum === '28/28/28' && r.doisDonos === 26, R + 'modelo comum sobre tópicos de outro concurso: passam a ser dos dois, sem segunda cópia (' + r.comum + ' · ' + r.doisDonos + ' com dois concursos)');
}

/* O merge REAL do auth.js não pode perder a marca dos concursos. */
async function merge(page, base, ok, R) {
  await page.goto(base + '/tests/sync-fixture.html'); await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const M = window.CatedraSync && window.CatedraSync._test && window.CatedraSync._test.mergeAll;
    if (!M) return { erro: true };
    const J = x => JSON.stringify(x);
    const novo = [{ disc: 'Direito Civil', topics: [{ name: 'Prescrição', done: true, eds: ['ed-principal', 'ed-9'], subs: [{ name: 'Prazos', done: false, eds: ['ed-9'] }] }] }];
    const velho = [{ disc: 'Direito Civil', topics: [{ name: 'Prescrição', done: false, subs: [] }] }];
    const out = {};
    let m = M({ 'catedra:edital': J(novo), 'catedra:_kts': J({ 'catedra:edital': 200 }) }, { 'catedra:edital': J(velho), 'catedra:_kts': J({ 'catedra:edital': 100 }) }, false);
    out.servidorNovo = m['catedra:edital'] === J(novo);
    m = M({ 'catedra:edital': J(velho), 'catedra:_kts': J({ 'catedra:edital': 100 }) }, { 'catedra:edital': J(novo), 'catedra:_kts': J({ 'catedra:edital': 200 }) }, true);
    out.localNovo = m['catedra:edital'] === J(novo);
    m = M({ 'catedra:edital': J(novo), 'catedra:_kts': J({ 'catedra:edital': 100 }) }, { 'catedra:edital': J([]), 'catedra:_kts': J({ 'catedra:edital': 900 }) }, false);
    out.vazio = m['catedra:edital'] === J(novo);
    return out;
  });
  ok(!r.erro && r.servidorNovo && r.localNovo, R + 'merge entre aparelhos: o edital mais recente vence INTEIRO, com a marca dos concursos em cada tópico e subtópico');
  ok(!r.erro && r.vazio, R + 'merge: edital vazio de um aparelho novo não apaga o edital com concursos');
}
