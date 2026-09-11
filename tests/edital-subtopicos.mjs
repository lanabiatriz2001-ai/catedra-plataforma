/* EDITAL — SUBTÓPICO EM TEXTO NÃO VIRA OBJETO DE CARACTERES (11/09/2026)

   O edital guarda `topics[].subs` em dois formatos que convivem: string (o parser de edital) e
   {name, done} (importador, modelos, marcações). Marcar um TÓPICO inteiro como estudado fazia
   {...x, done:true} sobre cada subtópico — com x string, o spread virava {0:'H',1:'o',…, done:true}
   e o nome sumia da tela e do disco. O que se prova aqui, com um edital semeado nos dois formatos
   e com dado já corrompido pelo defeito antigo (o próprio spread, reproduzido na semente):
   · ao abrir, o subtópico corrompido volta com o nome (caracteres em ordem; um `name` próprio
     vence), sem chave numérica; string continua string; o reparo é idempotente e avisa no console;
   · QUANDO o conserto vai ao disco: sem camada de sync, já na abertura; com sync, só depois do
     primeiro acerto com a nuvem — gravar antes carimbaria a chave com "agora" e o sync passaria
     esta cópia por cima de edição feita em outro aparelho. Prova-se com um CatedraSync de mentira
     pendente (disco intacto) que depois avisa pronto (disco consertado), e com o auth.js de verdade
     num fixture: o sinal só vem quando o pull responde — não no "salvo" do onLogin, não em erro;
   · registrar sessão com "marcar no edital" num tópico de subtópicos em texto, pelo modal, como a
     pessoa faz: todos viram {name, done:true}, nome preservado, e o tópico fecha;
   · tópico de subtópicos-objeto: done:true e os outros campos intactos; tópico misto marcado
     subtópico a subtópico: o de texto vira objeto e o tópico só fecha quando o último fecha;
   · na tela do Edital, o subtópico em texto aparece com o nome no campo (antes o campo vinha
     vazio) e concluir por ali grava {name, done:true} e pinta o risco (medido, não presumido);
     o PDF do edital também leva o nome (antes a linha saía em branco);
   · ida e volta pelo autosave: o disco, lido ≥ 1,3 s depois, tem os nomes e nenhuma chave
     numérica; o segundo boot lê de volta o mesmo e não tem mais nada a reparar. */

export async function testarEditalSubtopicos(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const origem = opcoes.origem || (String(base).startsWith('file:') ? 'file' : 'http');
  const arquivo = opcoes.arquivo || 'Catedra.dc.html';
  const R = 'EDITAL/SUBTÓPICOS [' + motor + '] [' + origem + '] ';
  // contexto próprio: o localStorage deste roteiro não vaza para o resto da suíte
  const ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  const avisos = [];
  page.on('console', m => { if (m.type() === 'info' && /\[Cátedra\] edital/.test(m.text())) avisos.push(m.text()); });
  try { await roteiro(page, base, ok, R, arquivo, avisos); }
  finally { await ctx.close(); }
  await comSyncPendente(pageDaSuite.context().browser(), base, ok, R, arquivo);
  await sinalDoSync(pageDaSuite.context().browser(), base, ok, R);
}

// Com `id` e `tid`, como o edital de uma conta de verdade: sem eles, a migração de ids do boot
// (que já existia) grava o edital na abertura, e as asserções de disco mediriam a semente.
const editalSemente = () => [{ disc: 'Direito Penal', id: 'd-direito-penal', color: '#b91c1c', open: true, peso: 1, questoes: 10, topics: [
  { name: 'Crimes contra a pessoa', tid: 't-crimes', done: false, subs: ['Homicídio', 'Lesão corporal'] },
  { name: 'Teoria do crime', tid: 't-teoria', done: false, subs: [{ name: 'Tipicidade', done: false, nota: 'dolo e culpa' }, { name: 'Ilicitude', done: false }] },
  { name: 'Penas', tid: 't-penas', done: false, subs: ['Dosimetria', { name: 'Regime inicial', done: false }] },
  // 21 caracteres (chaves 0…20: a ordem numérica importa) e um renomeado pelo editSub antigo
  { name: 'Extinção da punibilidade', tid: 't-extincao', done: false, subs: [{ ...'Prescrição retroativa', done: true }, { ...'Abolitio', name: 'Abolitio criminis', done: false }, 'Decadência'] },
  { name: 'Concurso de pessoas', tid: 't-concurso', done: false, subs: ['Autoria', 'Participação'] },
] }];
const semear = (page, ed) => page.evaluate((ed) => {
  localStorage.clear();
  const set = (k, v) => localStorage.setItem('catedra:' + k, JSON.stringify(v));
  localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
  set('areaEstudo', 'juridica'); set('edital', ed); set('sessions', []); set('reviews', []); set('errors', []);
  return localStorage.getItem('catedra:edital');
}, ed);

// Uma camada de sync que ainda NÃO acertou com a nuvem. O auth.js real não sobe nos testes (não há
// Supabase), então um CatedraSync de mentira faz o papel: pronto=false, depois pronto + evento.
async function comSyncPendente(browser, base, ok, R, arquivo) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  const avisos = [];
  page.on('console', m => { if (m.type() === 'info' && /\[Cátedra\] edital/.test(m.text())) avisos.push(m.text()); });
  try {
    await page.goto(base + '/__semente');
    const cru0 = await semear(page, editalSemente());
    await page.addInitScript(() => { window.__pushes = 0; window.CatedraSync = { pronto: false, push() { window.__pushes++; }, get status() { return 'salvo'; } }; });
    await page.goto(base + '/' + arquivo);
    await page.waitForTimeout(1800);
    const a = await page.evaluate(async (cru0) => {
      await new Promise(res => setTimeout(res, 1300));
      const T = n => window.__catedraApp.state.edital[0].topics.find(t => t.name === n);
      return { tela: T('Extinção da punibilidade').subs[0].name === 'Prescrição retroativa', discoIntacto: localStorage.getItem('catedra:edital') === cru0 };
    }, cru0);
    ok(a.tela, R + 'sync pendente: a tela já mostra o nome consertado');
    ok(a.discoIntacto, R + 'sync pendente ("salvo" antes do pull): o conserto NÃO vai ao disco (≥ 1,3 s depois de abrir)');
    const b = await page.evaluate(async () => {
      const p0 = window.__pushes;
      window.CatedraSync.pronto = true; window.dispatchEvent(new CustomEvent('catedra:syncpronto'));
      for (let i = 0; i < 80 && /"0":"P"/.test(localStorage.getItem('catedra:edital') || ''); i++) await new Promise(res => setTimeout(res, 50));
      const raw = localStorage.getItem('catedra:edital') || '';
      return { consertado: !/"\d+":/.test(raw) && raw.includes('"name":"Prescrição retroativa"') && raw.includes('"name":"Abolitio criminis"'), pushes: window.__pushes - p0 };
    });
    ok(b.consertado, R + 'sync pendente: no aviso de pronto, o conserto vai ao disco com os nomes');
    ok(b.pushes >= 1, R + 'sync pendente: e a gravação pede o envio para a nuvem');
    ok(avisos.some(x => /gravados no disco/.test(x)), R + 'sync pendente: o console registra a gravação do conserto');
  } finally { await ctx.close(); }
}

// O sinal do lado do auth.js, com o auth.js de verdade (tests/sync-pronto-fixture.html).
async function sinalDoSync(browser, base, ok, R) {
  const casos = [
    ['o pull traz dados da nuvem', { data: { data: { 'catedra:metas': '[]' }, updated_at: '2000-01-01T00:00:00Z' }, error: null }, true],
    ['a nuvem não tem linha desta conta', { data: null, error: null }, true],
    // erro de REDE: com status 401 + "jwt" o auth.js da main trata como sessão caída (sessaoCaiu), outro caminho
    ['o pull falha (res.error, sem rejeitar)', { data: null, error: { message: 'Failed to fetch' } }, false],
  ];
  for (const [nome, resposta, esperado] of casos) {
    const ctx = await browser.newContext();
    const pg = await ctx.newPage();
    pg.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
    try {
      await pg.goto(base + '/tests/sync-pronto-fixture.html');
      await pg.waitForFunction(() => window.CatedraSync && typeof window.__responder === 'function', null, { timeout: 8000 });
      const antes = await pg.evaluate(() => ({ pronto: window.CatedraSync.pronto, ev: window.__eventosPronto, status: window.CatedraSync.status }));
      await pg.evaluate((r) => window.__responder(r), resposta);
      await pg.waitForTimeout(400);
      const depois = await pg.evaluate(() => ({ pronto: window.CatedraSync.pronto, ev: window.__eventosPronto }));
      ok(antes.status === 'salvo' && antes.pronto === false && antes.ev === 0, R + 'auth.js, ' + nome + ': com o pull pendente o status já é "' + antes.status + '" e o sinal ainda NÃO veio');
      ok(depois.pronto === esperado && depois.ev === (esperado ? 1 : 0), R + 'auth.js, ' + nome + ': pronto=' + depois.pronto + ', eventos=' + depois.ev + ' (esperado ' + esperado + ')');
    } finally { await ctx.close(); }
  }
}

async function roteiro(page, base, ok, R, arquivo, avisos) {
  const w = ms => page.waitForTimeout(ms);
  await page.goto(base + '/__semente');   // página SEM o app: semear com o app vivo é corrida com o autosave (500 ms)
  const cru0 = await semear(page, editalSemente());
  ok(/"0":"P","1":"r"/.test(cru0), R + 'a semente reproduz o dado corrompido (objeto de caracteres no disco)');
  await page.goto(base + '/' + arquivo);
  await w(1800);

  // 1. reparo na leitura
  const b = await page.evaluate(async (cru0) => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const app = window.__catedraApp, r = {};
    if (!app) return { erro: 'app não exposto' };
    const T = n => (app.state.edital[0].topics || []).find(t => t.name === n);
    const semNum = s => !!s && typeof s === 'object' && !Object.keys(s).some(k => /^\d+$/.test(k));
    const ext = T('Extinção da punibilidade').subs;
    r.reconstroiONome = !!ext[0] && ext[0].name === 'Prescrição retroativa' && ext[0].done === true && semNum(ext[0]);
    r.nomeProprioVence = !!ext[1] && ext[1].name === 'Abolitio criminis' && ext[1].done === false && semNum(ext[1]);
    r.stringContinuaString = ext[2] === 'Decadência' && T('Crimes contra a pessoa').subs[0] === 'Homicídio';
    const ed = app.state.edital;
    r.idempotente = app._editalReparar(ed) === ed && app._editalReparar(JSON.parse(JSON.stringify(ed))).length === ed.length;
    await w(1300);
    r.semCamadaDeSync = typeof window.CatedraSync === 'undefined';
    const raw = localStorage.getItem('catedra:edital') || '';
    r.gravaNaAbertura = raw !== cru0 && !/"\d+":/.test(raw) && raw.includes('"name":"Prescrição retroativa"') && raw.includes('"name":"Abolitio criminis"') && raw.includes('"Decadência"');
    return r;
  }, cru0);
  if (b.erro) { ok(false, R + b.erro); return; }
  ok(b.reconstroiONome, R + 'ao abrir, o objeto de caracteres volta com o nome inteiro ("Prescrição retroativa"), done preservado, sem chave numérica');
  ok(b.nomeProprioVence, R + 'ao abrir, um corrompido que já tinha `name` (renomeado depois) fica com esse nome');
  ok(b.stringContinuaString, R + 'ao abrir, subtópico em texto continua texto (leitura tolerante; quem grava normaliza)');
  ok(b.idempotente, R + 'o reparo é idempotente: sem nada a reparar devolve a mesma lista');
  const rep = avisos.filter(a => /reconstruído/.test(a));
  ok(rep.length >= 1 && rep.every(a => /2 subtópicos reparados/.test(a)), R + 'o reparo conta no console.info quantos consertou (' + (rep[0] || 'nenhum aviso') + ')');
  ok(b.semCamadaDeSync && b.gravaNaAbertura, R + 'sem camada de sync, o conserto vai ao disco já na abertura (≥ 1,3 s): nomes lá, nenhuma chave numérica');
  ok(avisos.some(a => /gravados no disco/.test(a)), R + 'o console registra que o conserto foi gravado');

  // 2. pelo modal: registrar sessão marcando no edital um tópico de subtópicos em texto
  const m = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const app = window.__catedraApp, r = {};
    const abre = [...document.querySelectorAll('button')].find(b => /registrar sess/i.test(b.textContent || ''));
    if (!abre) return { erro: 'botão Registrar sessão não achado' };
    abre.click(); await w(1000);
    const dlg = document.querySelector('[role="dialog"][aria-label="Registrar sessão"]');
    if (!dlg) return { erro: 'modal de registro não abriu' };
    const selD = dlg.querySelector('select[aria-label="Disciplina"]'); selD.value = 'Direito Penal'; selD.dispatchEvent(new Event('change', { bubbles: true })); await w(300);
    // o Registrar abre enxuto: o tópico do edital mora em "Mais detalhes"
    const mais = dlg.querySelector('button.ct-reg-mais');
    if (mais && mais.getAttribute('aria-expanded') !== 'true') { mais.click(); await w(300); }
    const selT = dlg.querySelector('select[aria-label="Tópico"]');
    if (!selT) return { erro: 'select de Tópico não apareceu em "Mais detalhes"' }; selT.value = 'Crimes contra a pessoa'; selT.dispatchEvent(new Event('change', { bubbles: true })); await w(300);
    dlg.querySelector('button[data-k="marcarEdital"]').click(); await w(300);
    r.marcarLigado = dlg.querySelector('button[data-k="marcarEdital"]').getAttribute('aria-checked') === 'true';
    const min = dlg.querySelector('input[data-k="minutos"]'); min.value = '30'; min.dispatchEvent(new Event('input', { bubbles: true })); await w(300);
    [...dlg.querySelectorAll('button')].find(b => /^Registrar sessão$/.test((b.textContent || '').trim())).click(); await w(1400);
    const cp = app.state.edital[0].topics.find(t => t.name === 'Crimes contra a pessoa');
    r.subs = JSON.stringify(cp.subs);
    r.tudoObjetoComNome = cp.subs.length === 2 && cp.subs.every(s => s && typeof s === 'object' && s.done === true && Object.keys(s).sort().join() === 'done,name')
      && cp.subs.map(s => s.name).join('|') === 'Homicídio|Lesão corporal';
    r.topicoFecha = cp.done === true;
    const S = JSON.parse(localStorage.getItem('catedra:sessions') || '[]');
    r.sessaoGravada = S.length === 1 && S[0].topico === 'Crimes contra a pessoa';
    // espera o disco bater com o estado (sem tempo fixo: sob carga o _autosave passa de 1,4 s)
    const cpDisco = () => { const d = JSON.parse(localStorage.getItem('catedra:edital') || '[]'); return ((d[0] && d[0].topics.find(t => t.name === 'Crimes contra a pessoa')) || { subs: [] }).subs; };
    const t0 = Date.now(); while (Date.now() - t0 < 6000 && JSON.stringify(cpDisco()) !== r.subs) await w(100);
    r.discoTemOsNomes = JSON.stringify(cpDisco()) === r.subs;
    r.discoEspera = Date.now() - t0;
    if (!r.discoTemOsNomes) r.discoDiag = JSON.stringify(cpDisco());
    return r;
  });
  if (m.erro) { ok(false, R + m.erro); return; }
  ok(m.marcarLigado, R + 'modal: "marcar no edital" liga (aria-checked=true)');
  ok(m.tudoObjetoComNome, R + 'marcar o tópico inteiro: subtópicos em texto viram {name, done:true} com o nome preservado (' + m.subs + ')');
  ok(m.topicoFecha, R + 'marcar o tópico inteiro: o tópico fica concluído');
  ok(m.sessaoGravada, R + 'a sessão foi registrada no tópico');
  ok(m.discoTemOsNomes, R + 'ida e volta pelo autosave: o disco tem os mesmos {name, done:true} (' + (m.discoTemOsNomes ? 'em ' + (1400 + m.discoEspera) + ' ms' : 'no disco: ' + m.discoDiag) + ')');

  // 3. subtópicos-objeto e tópico misto, pelo mesmo método que o registro chama
  const d = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const app = window.__catedraApp, r = {};
    const forma = s => (s && typeof s === 'object') ? Object.keys(s).sort().map(k => k + '=' + s[k]).join('|') : 'TEXTO:' + s;
    const T = n => app.state.edital[0].topics.find(t => t.name === n);
    app._marcarNoEdital('Direito Penal', 'Teoria do crime'); await w(200);
    const tc = T('Teoria do crime');
    r.objeto = tc.subs.map(forma).join(' ; ');
    r.objetoMantemCampos = r.objeto === 'done=true|name=Tipicidade|nota=dolo e culpa ; done=true|name=Ilicitude' && tc.done === true;
    app._marcarNoEdital('Direito Penal', 'Penas', 'Dosimetria'); await w(200);
    const p1 = T('Penas');
    r.misto = p1.subs.map(forma).join(' ; ');
    r.subEmTextoMarcado = r.misto === 'done=true|name=Dosimetria ; done=false|name=Regime inicial' && !p1.done;
    app._marcarNoEdital('Direito Penal', 'Penas', 'Regime inicial'); await w(200);
    const p2 = T('Penas');
    r.ultimoFecha = p2.subs.map(forma).join(' ; ') === 'done=true|name=Dosimetria ; done=true|name=Regime inicial' && p2.done === true;
    return r;
  });
  ok(d.objetoMantemCampos, R + 'marcar tópico de subtópicos-objeto: done:true e os outros campos intactos (' + d.objeto + ')');
  ok(d.subEmTextoMarcado, R + 'marcar UM subtópico em texto num tópico misto: vira {name, done:true}, o outro fica aberto e o tópico também (' + d.misto + ')');
  ok(d.ultimoFecha, R + 'marcar o último subtópico fecha o tópico, nomes preservados');

  // 4. tela do Edital: o nome do subtópico em texto aparece no campo e concluir por ali grava objeto
  const v = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const app = window.__catedraApp, r = {};
    const forma = s => (s && typeof s === 'object') ? Object.keys(s).sort().map(k => k + '=' + s[k]).join('|') : 'TEXTO:' + s;
    window.__catedraGoView('edital'); await w(900);
    const campos = () => [...document.querySelectorAll('main input[title="Editar subtópico"]')];
    const campo = n => campos().find(i => i.value === n);
    r.nCampos = campos().length;
    r.nomeNoCampo = !!campo('Autoria') && !!campo('Participação') && !!campo('Decadência') && !!campo('Prescrição retroativa');
    r.nenhumCampoVazio = campos().length === 11 && campos().every(i => i.value.trim().length > 0);
    const btn = campo('Autoria') && campo('Autoria').parentElement.querySelector('button[title="Concluir / desmarcar"]');
    if (!btn) return { ...r, erro: 'botão de concluir do subtópico "Autoria" não achado' };
    btn.click(); await w(1400);
    const cp = app.state.edital[0].topics.find(t => t.name === 'Concurso de pessoas');
    r.concluir = cp.subs.map(forma).join(' ; ');
    r.concluirGravaObjeto = r.concluir === 'done=true|name=Autoria ; TEXTO:Participação';
    r.riscoPinta = !!campo('Autoria') && getComputedStyle(campo('Autoria')).textDecorationLine === 'line-through';
    r.abertoSemRisco = !!campo('Participação') && getComputedStyle(campo('Participação')).textDecorationLine === 'none';
    // exportar/imprimir o edital (PDF): as linhas de subtópico levam o nome, o de texto inclusive
    const linhas = app._editalOutline().filter(x => x.k === 'sub');
    r.nLinhas = linhas.length;
    r.exportaNomes = linhas.length === 11 && linhas.every(x => String(x.text || '').trim()) && linhas.some(x => x.text === 'Participação' && !x.done) && linhas.some(x => x.text === 'Autoria' && x.done);
    return r;
  });
  if (v.erro) { ok(false, R + v.erro + ' (' + v.nCampos + ' campos)'); return; }
  ok(v.nomeNoCampo, R + 'tela do Edital: subtópico em texto e reparado aparecem com o nome no campo');
  ok(v.nenhumCampoVazio, R + 'tela do Edital: os 11 campos de subtópico têm nome (' + v.nCampos + ' campos)');
  ok(v.concluirGravaObjeto, R + 'tela do Edital: concluir um subtópico em texto grava {name, done:true} e não mexe no vizinho (' + v.concluir + ')');
  ok(v.riscoPinta && v.abertoSemRisco, R + 'tela do Edital: o concluído pinta riscado e o aberto não (getComputedStyle)');
  ok(v.exportaNomes, R + 'exportar/imprimir o edital: as ' + v.nLinhas + ' linhas de subtópico têm nome, o de texto inclusive, com o concluído marcado');

  // 5. ida e volta: o disco e o segundo boot
  const disco = await page.evaluate(() => localStorage.getItem('catedra:edital'));
  const ed = JSON.parse(disco || '[]');
  const nomes = n => ((ed[0] && ed[0].topics.find(t => t.name === n)) || { subs: [] }).subs.map(s => (s && typeof s === 'object') ? s.name : s).join('|');
  ok(!/"\d+":/.test(disco), R + 'no disco, nenhum subtópico com chave numérica');
  ok(nomes('Extinção da punibilidade') === 'Prescrição retroativa|Abolitio criminis|Decadência'
     && nomes('Crimes contra a pessoa') === 'Homicídio|Lesão corporal' && nomes('Penas') === 'Dosimetria|Regime inicial'
     && nomes('Teoria do crime') === 'Tipicidade|Ilicitude' && nomes('Concurso de pessoas') === 'Autoria|Participação',
     R + 'no disco, todos os nomes de subtópico estão lá, o reparado inclusive');
  const nAvisos = avisos.length;
  await page.goto(base + '/' + arquivo);
  await w(1800);
  const volta = await page.evaluate((disco) => JSON.stringify(window.__catedraApp.state.edital) === disco, disco);
  ok(volta, R + 'segundo boot: o estado lido do disco é o mesmo que foi gravado');
  ok(avisos.length === nAvisos, R + 'segundo boot: nada mais a reparar (nenhum aviso novo no console)');
}
