/* VÁRIOS CONCURSOS AO MESMO TEMPO — FASE 1: DADOS (17/09/2026)

   Decisão da dona: estudar para mais de um concurso ao mesmo tempo, com a disciplina em comum
   estudada UMA vez e valendo para todos, e um ciclo por concurso (Fase 2).

   O risco desta fase é o de sempre neste repositório: "migração é onde se perde edital". Por
   isso o `edital` NÃO é movido. Ele vira o acervo comum; `editais` é uma camada leve por cima,
   com o peso e as questões de cada concurso. O que se prova aqui:
   · MIGRAÇÃO QUE NÃO MOVE NADA: quem já tem edital ganha "Meu concurso" com os pesos de hoje,
     e tópicos/progresso do edital ficam intactos. Id FIXO ('ed-principal') e up=1: dois
     aparelhos que migram juntos geram o mesmo concurso, e qualquer edição real vence o padrão;
   · PESO POR CONCURSO: o mesmo Direito Civil vale 2 num e 3 no outro, e trocar de concurso
     troca o peso que o app inteiro lê;
   · FORA DO CONCURSO não entra em prioridade nem nas contagens do painel;
   · O ESTUDO É UM SÓ: a sessão aponta a disciplina, não o concurso — não há segunda cópia, logo
     o tempo não é contado duas vezes;
   · tudo sobrevive a fechar e reabrir o app. */

export async function testarVariosEditais(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const R = 'EDITAIS [' + motor + '] ';
  const arquivo = opcoes.arquivo || 'Catedra.dc.html';
  const ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  const t = new Date(); t.setHours(14, 0, 0, 0); await page.clock.install({ time: t });
  try { await roteiro(page, base, ok, R, arquivo); await cicloPorConcurso(page, base, ok, R, arquivo); await tela(page, base, ok, R, arquivo); await mergeEntreAparelhos(page, base, ok, R); } finally { await ctx.close(); }
}

/* O ponto mais perigoso desta fase não é a tela: é dois aparelhos migrando o mesmo edital.
   Provado contra o mergeAll REAL do auth.js (servidor primeiro, local depois). */
async function mergeEntreAparelhos(page, base, ok, R) {
  await page.goto(base + '/tests/sync-fixture.html'); await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const M = window.CatedraSync && window.CatedraSync._test && window.CatedraSync._test.mergeAll;
    if (!M) return { erro: true };
    const J = x => JSON.stringify(x), L = (m) => JSON.parse(m['catedra:editais'] || '[]');
    const out = {};
    // aparelho NOVO migrou o padrão (up=1); na nuvem a dona já tinha renomeado o mesmo id
    let e = L(M({ 'catedra:editais': J([{ id: 'ed-principal', nome: 'TJGO', discs: {}, up: 1789000000000 }]) },
                { 'catedra:editais': J([{ id: 'ed-principal', nome: 'Meu concurso', discs: {}, up: 1 }]) }));
    out.renomeVence = e.length === 1 && e[0].nome === 'TJGO';
    // os dois migraram (mesmo id) e um criou o TJSP: união, sem "Meu concurso" em dobro
    e = L(M({ 'catedra:editais': J([{ id: 'ed-principal', nome: 'Meu concurso', discs: {}, up: 1 }, { id: 'ed-9', nome: 'TJSP', discs: {}, up: 1789000000001 }]) },
            { 'catedra:editais': J([{ id: 'ed-principal', nome: 'Meu concurso', discs: {}, up: 1 }]) }));
    out.uniao = e.length === 2 && e.filter(x => x.id === 'ed-principal').length === 1 && e.some(x => x.nome === 'TJSP');
    // lista VAZIA num aparelho não apaga a cheia da nuvem
    e = L(M({ 'catedra:editais': J([{ id: 'ed-9', nome: 'TJSP', discs: {}, up: 5 }]) }, { 'catedra:editais': J([]) }));
    out.vazio = e.length === 1 && e[0].nome === 'TJSP';
    return out;
  });
  ok(!r.erro && r.renomeVence, R + 'merge: a migração padrão (up=1) de um aparelho novo NÃO desfaz o nome que você deu no outro');
  ok(!r.erro && r.uniao, R + 'merge: dois aparelhos que migraram juntos não geram "Meu concurso" em dobro, e o concurso novo entra');
  ok(!r.erro && r.vazio, R + 'merge: lista vazia num aparelho não apaga os concursos da nuvem');
}

async function roteiro(page, base, ok, R, arquivo) {
  await page.goto(base + '/__semente');
  await page.evaluate(() => {
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    localStorage.clear();
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
    // um usuário ANTIGO: tem edital com pesos e progresso, e nunca ouviu falar em "editais"
    set('edital', [
      { disc: 'Direito Civil', peso: 2, questoes: 15, color: '#2563eb', topics: [{ name: 'Obrigações', done: true, subs: [] }, { name: 'Contratos', done: false, subs: [] }] },
      { disc: 'Direito Penal', peso: 1, questoes: 10, color: '#dc2626', topics: [{ name: 'Teoria do crime', done: false, subs: [] }] }]);
    set('sessions', [{ id: 's1', ts: Date.now() - 3600e3, date: new Date().toISOString().slice(0, 10), disc: 'Direito Civil', topico: 'Obrigações',
      categoria: 'Teoria', categorias: ['Teoria'], min: 50, questoes: 0, acertos: 0, erradas: 0, brancos: 0, liquido: 0 }]);
    set('reviews', []); set('errors', []);
  });
  await page.goto(base + '/' + arquivo); await page.waitForTimeout(1900);

  // ---- 1) migração: o que existe vira "Meu concurso", sem mover o edital
  const mig = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__catedraGoView('edital'); await w(1200);   // qualquer atualização materializa a migração
    const app = window.__catedraApp; if (app && app._salvarAgora) app._salvarAgora(); await w(200);
    const E = JSON.parse(localStorage.getItem('catedra:editais') || '[]');
    const ED = JSON.parse(localStorage.getItem('catedra:edital') || '[]');
    const ativa = document.querySelector('.ct-concurso-pilula[aria-pressed="true"]');
    return { E, civ: ED.find(d => d.disc === 'Direito Civil') || {}, barra: ativa ? ativa.textContent.trim() : '' };
  });
  const principal = mig.E[0] || {};
  ok(mig.E.length === 1 && principal.id === 'ed-principal' && principal.nome === 'Meu concurso',
    R + 'migração: quem já tinha edital ganha UM concurso, "Meu concurso", de id fixo');
  ok(principal.up === 1, R + 'migração nasce com up=1: qualquer edição real vence este padrão no merge entre aparelhos');
  ok(principal.discs && principal.discs['Direito Civil'] && principal.discs['Direito Civil'].peso === 2 && principal.discs['Direito Penal'].peso === 1,
    R + 'migração leva os pesos de hoje para o concurso');
  ok(mig.civ.topics && mig.civ.topics.length === 2 && mig.civ.topics[0].done === true,
    R + 'migração NÃO move o edital: tópicos e progresso continuam onde estavam');
  ok(mig.barra === 'Meu concurso', R + 'a tela do Edital mostra o concurso ativo');

  // ---- 2) novo concurso: começa sem disciplinas; marcar e pesar
  const novo = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const app = window.__catedraApp;
    window.prompt = () => 'TJSP 2026';
    [...document.querySelectorAll('button')].find(b => /^Novo concurso$/.test((b.textContent || '').trim())).click(); await w(900);
    const r = {};
    const ed0 = app.state.edital;
    r.todosForaNoInicio = ed0.every(d => d.foraDoConcurso === true && d.peso === '');
    r.prioridadeVazia = app._prioridade().length === 0;
    // marca Direito Civil como parte do TJSP e dá peso 3
    const i = ed0.findIndex(d => d.disc === 'Direito Civil');
    document.querySelector('button.ct-ed-noconc[data-i="' + i + '"]').click(); await w(500);
    const inp = document.querySelector('input[data-i="' + i + '"][data-k="peso"]');
    inp.value = '3'; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); await w(700);
    app._salvarAgora(); await w(200);
    const E = JSON.parse(localStorage.getItem('catedra:editais') || '[]');
    r.E = E; r.ativo = JSON.parse(localStorage.getItem('catedra:editalAtivo') || '""');
    r.civilNoPool = (app.state.edital.find(d => d.disc === 'Direito Civil') || {}).peso;
    r.prioridadeSoCivil = app._prioridade().map(p => p.disc || p.nome || p).join(',');
    return r;
  });
  const tjsp = novo.E.find(e => e.nome === 'TJSP 2026') || {};
  const meu = novo.E.find(e => e.id === 'ed-principal') || {};
  ok(novo.todosForaNoInicio, R + 'concurso novo começa SEM disciplinas: cada uma entra ao ser marcada, importada ou cadastrada');
  ok(novo.prioridadeVazia, R + 'sem disciplina no concurso, a prioridade não inventa nenhuma — fora do concurso não entra na conta');
  ok(tjsp.discs && tjsp.discs['Direito Civil'] && +tjsp.discs['Direito Civil'].peso === 3 && tjsp.discs['Direito Civil'].fora === false,
    R + 'no TJSP, Direito Civil entrou com peso 3');
  ok(meu.discs && +meu.discs['Direito Civil'].peso === 2,
    R + 'no concurso antigo, Direito Civil CONTINUA com peso 2 — cada concurso tem o seu');
  ok(novo.ativo === tjsp.id && +novo.civilNoPool === 3, R + 'o app inteiro lê o peso do concurso ativo (3)');
  ok(/Civil/.test(novo.prioridadeSoCivil) && !/Penal/.test(novo.prioridadeSoCivil),
    R + 'prioridade do TJSP: só o que cai nele (' + novo.prioridadeSoCivil + ')');

  // ---- 3) trocar de volta: o peso volta; o estudo é um só
  const volta = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const app = window.__catedraApp;
    document.querySelector('.ct-concurso-pilula[data-id="ed-principal"]').click(); await w(800);
    return { civil: (app.state.edital.find(d => d.disc === 'Direito Civil') || {}).peso,
      penal: (app.state.edital.find(d => d.disc === 'Direito Penal') || {}),
      sessoes: (app.state.sessions || []).length };
  });
  ok(+volta.civil === 2 && +volta.penal.peso === 1 && volta.penal.foraDoConcurso === false,
    R + 'voltar para "Meu concurso" devolve os pesos dele (Civil 2, Penal 1)');
  ok(volta.sessoes === 1, R + 'o estudo é um só: a sessão de Direito Civil não foi duplicada por existir em dois concursos');

  // ---- 4) reabrir o app
  await page.goto(base + '/' + arquivo); await page.waitForTimeout(2000);
  const re = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__catedraGoView('edital'); await w(1000);
    const pil = [...document.querySelectorAll('.ct-concurso-pilula')];
    const ativa = pil.find(b => b.getAttribute('aria-pressed') === 'true');
    return { opcoes: pil.map(b => b.textContent.trim()), ativo: ativa ? ativa.textContent.trim() : '' };
  });
  ok(re.opcoes.length === 2 && re.ativo === 'Meu concurso' && re.opcoes.includes('TJSP 2026'),
    R + 'reabrindo o app: os dois concursos e o ativo sobreviveram (' + re.opcoes.join(' / ') + ')');
}


/* FASE 2 — UM CICLO POR CONCURSO. Cada concurso guarda o ciclo nas próprias chaves
   (catedra:manualFixed#ed-…); "Meu concurso" fica nas chaves de SEMPRE, sem sufixo — a
   migração não move nada. Aqui também se provam as duas correções da Fase 1:
   · CORRIDA ENTRE APARELHOS: espelho de peso de OUTRO concurso chegando pela nuvem não é
     capturado para dentro do concurso ativo (seria corrupção calada);
   · a nuvem trocar o concurso ativo faz o ciclo ser relido do lugar certo, sem gravar o
     ciclo de um concurso por cima do outro. */
async function cicloPorConcurso(page, base, ok, R, arquivo) {
  await page.goto(base + '/__semente');
  await page.evaluate(() => {
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    localStorage.clear();
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica'); set('cycleMode', 'manual');
    set('edital', [{ disc: 'Direito Civil', peso: 2, questoes: 15, topics: [{ name: 'Obrigações', done: false, subs: [] }] },
                   { disc: 'Direito Penal', peso: 1, questoes: 10, topics: [{ name: 'Teoria do crime', done: false, subs: [] }] }]);
    // o ciclo que JÁ EXISTE: pertence a "Meu concurso" e mora nas chaves de sempre
    set('manualFixed', [{ id: 'ag-meu', disc: 'Direito Civil', kind: 'Teoria', min: 50, dia: 'seg', roteiro: '', discEdital: 'Direito Civil', topico: 'Obrigações' }]);
    set('sessions', []); set('reviews', []); set('errors', []);
  });
  await page.goto(base + '/' + arquivo); await page.waitForTimeout(1900);

  const r = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const app = window.__catedraApp, out = {};
    const ids = () => (app.state.manualFixed || []).map(x => x.id).join(',');
    const disco = k => JSON.parse(localStorage.getItem(k) || 'null');
    window.__catedraGoView('edital'); await w(900);
    out.antes = ids();
    // novo concurso: nasce com ciclo PRÓPRIO, vazio
    window.prompt = () => 'TJSP 2026';
    [...document.querySelectorAll('button')].find(b => /^Novo concurso$/.test((b.textContent || '').trim())).click(); await w(1000);
    const tj = (app.state.editais || []).find(e => e.nome === 'TJSP 2026') || {};
    out.tjId = tj.id; out.noTjspVazio = ids();
    // monta um bloco no ciclo do TJSP
    app.setState({ manualFixed: [{ id: 'ag-tj', disc: 'Direito Penal', kind: 'Questões', min: 30, dia: 'ter', roteiro: '' }] }); await w(300);
    app._salvarAgora(); await w(200);
    out.chaveTj = (disco('catedra:manualFixed#' + tj.id) || []).map(x => x.id).join(',');
    out.chaveSempre = (disco('catedra:manualFixed') || []).map(x => x.id).join(',');
    // volta para o principal: o ciclo dele volta inteiro
    document.querySelector('.ct-concurso-pilula[data-id="ed-principal"]').click(); await w(1000);
    out.deVolta = ids();
    out.chaveTjIntacta = (disco('catedra:manualFixed#' + tj.id) || []).map(x => x.id).join(',');

    // ---- CORRIDA: chega pela nuvem um espelho de peso do TJSP enquanto o ativo é o principal
    app.setState({ edital: app.state.edital.map(d => d.disc === 'Direito Civil' ? { ...d, peso: 9, _esp: tj.id } : d) }); await w(700);
    const civ = app.state.edital.find(d => d.disc === 'Direito Civil') || {};
    const meu = (app.state.editais || []).find(e => e.id === 'ed-principal') || {};
    out.espelhoReprojetado = civ.peso;              // tem de voltar para o peso do principal
    out.principalIntacto = meu.discs && meu.discs['Direito Civil'] ? meu.discs['Direito Civil'].peso : null;

    // ---- a NUVEM trocou o ativo para o TJSP (outro aparelho): reidratar relê o ciclo certo
    app._salvarAgora(); await w(150);
    localStorage.setItem('catedra:editalAtivo', JSON.stringify(tj.id));
    app._rehydrateFromLocal(); await w(900);
    out.aposNuvem = ids();
    out.principalNaoSobrescrito = (disco('catedra:manualFixed') || []).map(x => x.id).join(',');
    return out;
  });
  ok(r.antes === 'ag-meu', R + 'ciclo por concurso: o ciclo que já existia é o de "Meu concurso" (' + r.antes + ')');
  ok(r.noTjspVazio === '', R + 'concurso novo nasce com ciclo PRÓPRIO e vazio — não herda o do outro (' + (r.noTjspVazio || 'vazio') + ')');
  ok(r.chaveTj === 'ag-tj', R + 'o ciclo do TJSP mora nas chaves dele (catedra:manualFixed#<id>)');
  ok(r.chaveSempre === 'ag-meu', R + 'o ciclo de "Meu concurso" CONTINUA nas chaves de sempre, sem sufixo — a migração não moveu nada');
  ok(r.deVolta === 'ag-meu' && r.chaveTjIntacta === 'ag-tj', R + 'voltar para "Meu concurso" traz o ciclo dele de volta, e o do TJSP fica intacto');
  ok(+r.espelhoReprojetado === 2 && +r.principalIntacto === 2,
    R + 'CORRIDA ENTRE APARELHOS: espelho de peso do TJSP chegando pela nuvem NÃO é capturado para dentro de "Meu concurso" (Civil continua 2, não 9)');
  ok(r.aposNuvem === 'ag-tj', R + 'a nuvem trocou o concurso ativo: o ciclo é relido do lugar certo (' + r.aposNuvem + ')');
  ok(r.principalNaoSobrescrito === 'ag-meu', R + 'e a troca vinda da nuvem não gravou o ciclo de um concurso por cima do outro');

  // reabrir o app: o concurso ativo e o ciclo dele sobrevivem
  await page.goto(base + '/' + arquivo); await page.waitForTimeout(2000);
  const re = await page.evaluate(() => (window.__catedraApp.state.manualFixed || []).map(x => x.id).join(','));
  ok(re === 'ag-tj', R + 'reabrindo o app: continua no TJSP, com o ciclo do TJSP (' + re + ')');
}


/* FASE 3 — A TELA, MEDIDA. O concurso ativo é a faixa de chamada do Edital (o "primeiro
   lugar" da seção 10 do catedra-ui.css). Mede-se o que pinta: uma faixa só, pílula ativa
   distinguível, alvos de toque, o selo do estudo compartilhado — e as duas regras do
   DESIGN.md que eu tinha quebrado antes: nada de faixa lateral colorida, e barra de
   progresso por translateX, nunca por largura. */
async function tela(page, base, ok, R, arquivo) {
  await page.goto(base + '/__semente');
  await page.evaluate(() => {
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    localStorage.clear();
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
    set('edital', [{ disc: 'Direito Civil', peso: 2, questoes: 15, topics: [{ name: 'Obrigações', done: true, subs: [] }] },
                   { disc: 'Direito Penal', peso: 1, questoes: 10, topics: [{ name: 'Teoria do crime', done: false, subs: [] }] }]);
    // dois concursos, Civil nos dois: o estudo dele rende em dobro
    set('editais', [{ id: 'ed-principal', nome: 'TJGO 2026', discs: { 'Direito Civil': { peso: 2, questoes: 15, fora: false }, 'Direito Penal': { peso: 1, questoes: 10, fora: false } }, up: 5 },
                    { id: 'ed-sp', nome: 'TJSP 2026', discs: { 'Direito Civil': { peso: 3, questoes: 20, fora: false }, 'Direito Penal': { peso: '', questoes: '', fora: true } }, up: 6 }]);
    set('fc', [{ id: 'c1', front: 'f', back: 'b', disc: 'Direito Civil' }]);
    set('sessions', []); set('reviews', []); set('errors', []);
  });
  await page.goto(base + '/' + arquivo); await page.waitForTimeout(1900);
  const m = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__catedraGoView('edital'); await w(1100);
    const main = document.querySelector('main') || document.body;
    const heroes = main.querySelectorAll('.ct-hero');
    const hero = main.querySelector('.ct-concurso-hero');
    const tit = hero && hero.querySelector('.ct-hero-tit');
    const pil = hero ? [...hero.querySelectorAll('.ct-concurso-pilula')] : [];
    const ativa = pil.find(b => b.getAttribute('aria-pressed') === 'true');
    const inativa = pil.find(b => b.getAttribute('aria-pressed') !== 'true');
    const bg = el => el ? getComputedStyle(el).backgroundColor : '';
    const cor = el => el ? getComputedStyle(el).color : '';
    const numPx = hero ? Math.min(...[...hero.querySelectorAll('.ct-kpi b .sc-interp, .ct-kpi b')].map(e => parseFloat(getComputedStyle(e).fontSize))) : 0;
    const selos = [...main.querySelectorAll('.ct-selo')].map(e => e.textContent.trim()).filter(t => /concursos/.test(t));
    const kpis = hero ? [...hero.querySelectorAll('.ct-kpi')].map(k => k.textContent.replace(/\s+/g, ' ').trim()) : [];
    const r = { nHero: heroes.length, titulo: tit ? tit.textContent.trim() : '', tituloPx: tit ? parseFloat(getComputedStyle(tit).fontSize) : 0,
      nPil: pil.length, ativaBg: bg(ativa), inativaBg: bg(inativa), altPil: pil.length ? Math.min(...pil.map(b => b.getBoundingClientRect().height)) : 0,
      selos, kpis, ativaCor: cor(ativa), inativaCor: cor(inativa), numPx };
    // regras do DESIGN.md, medidas no Início (o cartão do baralho) e na barra do baralho
    window.__catedraGoView('inicio'); await w(900);
    const bar = document.querySelector('.cth-baralho');
    if (bar) { const cs = getComputedStyle(bar); r.bordaEsq = cs.borderLeftWidth; r.bordaTopo = cs.borderTopWidth; }
    return r;
  });
  ok(m.nHero === 1, R + 'a tela do Edital tem UMA faixa de chamada — "uma tela tem um primeiro lugar" (' + m.nHero + ')');
  ok(m.titulo === 'TJGO 2026' && m.tituloPx >= 28, R + 'o concurso ativo é o título da faixa, em tamanho de display (' + m.titulo + ', ' + m.tituloPx + ' px)');
  ok(m.nPil === 2 && m.ativaBg !== m.inativaBg && m.ativaBg !== '', R + 'as pílulas mostram os dois concursos, e a ativa PINTA diferente da outra (' + m.ativaBg + ' × ' + m.inativaBg + ')');
  ok(m.ativaCor === m.inativaCor && /255, 255, 255/.test(m.ativaCor),
    R + 'a pílula ATIVA tem o mesmo texto branco das outras sobre o gradiente — nunca branco sobre branco (' + m.ativaCor + ')');
  ok(m.numPx >= 24, R + 'os números da faixa pintam em tamanho de número, não de rótulo (' + m.numPx + ' px; o seletor descendente os encolhia a 11)');
  ok(m.altPil >= 40, R + 'pílulas com alvo de pelo menos 40 px (44 no toque) — mediu ' + Math.round(m.altPil));
  ok(m.selos.some(t => /em 2 concursos/.test(t)), R + 'Direito Civil mostra "em 2 concursos": o estudo dele vale nos dois (' + m.selos.join(', ') + ')');
  ok(m.kpis.some(k => /^1\s*em comum/.test(k)), R + 'a faixa conta as disciplinas em comum com outro concurso (' + m.kpis.join(' | ') + ')');
  ok(m.bordaEsq === m.bordaTopo, R + 'DESIGN.md: o cartão do baralho no Início não tem mais faixa lateral colorida (esq ' + m.bordaEsq + ' = topo ' + m.bordaTopo + ')');
}
