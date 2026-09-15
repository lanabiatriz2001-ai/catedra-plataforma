/* INTEGRAÇÃO, 2ª LEVA — BARALHO, CALENDÁRIO, METAS E PAINEL (15/09/2026)

   O buraco mais grave desta leva não era falta de ligação: era um MÓDULO SEM CONSUMIDOR. Três
   caminhos produziam flashcards (o quiz do CátedraJURIS, a conferência da leitura ativa e a
   colheita de erros), a tela de Anki tinha sido removida, e `fcCards`/`fcEmpty` continuavam
   sendo calculados no render sem ninguém no template para lê-los. O ciclo ainda gerava o bloco
   "Revisão · Anki — N cartões no baralho", mandando estudar o que não tinha onde ser estudado.

   O que se prova aqui:
   · o baralho tem tela, fila por vencimento e as três notas do SM-2 — e o agendamento é
     gravado NO CARTÃO (catedra:fc já está no ARRAY_ID: sincroniza por id, sem chave nova);
   · "Não sei" devolve o cartão à mesma rodada; "Sei" joga para frente;
   · terminar OFERECE o registro preenchido (automação abre, não grava) e os cartões viram
     as `questoes` da sessão — a régua que o resto do app já usa;
   · a sessão do baralho carrega origem 'flashcards' e aparece no histórico com o selo;
   · a meta em "cartões" anda sozinha com essas sessões, sem contador paralelo;
   · o painel do Início mostra o que está vencido em vez de dizer que o dia está em dia;
   · concluir um evento do calendário oferece o registro com o vínculo `ev|<id>` — e excluir
     essa sessão REABRE o evento, pelo mesmo caminho que já reabre a atividade do ciclo;
   · o agendamento dos cartões sobrevive a fechar e reabrir o app.

   Relógio fixo às 14:00 pelo mesmo motivo dos outros roteiros: a sessão é datada por
   "agora − minutos" e as datas de vencimento comparam com "hoje". */

export async function testarIntegracaoFase2(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const origem = opcoes.origem || (String(base).startsWith('file:') ? 'file' : 'http');
  const arquivo = opcoes.arquivo || 'Catedra.dc.html';
  const R = 'FASE2 [' + motor + '] [' + origem + '] ';

  const ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  const t = new Date(); t.setHours(14, 0, 0, 0);
  await page.clock.install({ time: t });
  try { await roteiro(page, base, ok, R, arquivo); }
  finally { await ctx.close(); }
}

async function roteiro(page, base, ok, R, arquivo) {
  await page.goto(base + '/__semente');
  await page.evaluate(() => {
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    const ymd = d => { const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
    const mais = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
    localStorage.clear();
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
    set('cycleMode', 'manual'); set('blocks', []); set('sessions', []); set('reviews', []); set('errors', []);
    set('edital', [{ disc: 'Direito Civil', peso: 3, questoes: 20, topics: [{ name: 'Obrigações', done: false, subs: [] }] }]);
    // o baralho: um vencido ontem, um NOVO (sem dueDate) e um só para depois de amanhã
    set('fc', [
      { id: 'c1', front: 'O que é mora do credor?', back: 'Recusa injustificada em receber', disc: 'Direito Civil', origem: 'leitura ativa', dueDate: mais(-1), intervalo: 1, facilidade: 2.5, repeticoes: 1 },
      { id: 'c2', front: 'Prazo da usucapião extraordinária?', back: 'Quinze anos', disc: 'Direito Civil', origem: 'quiz do JURIS' },
      { id: 'c3', front: 'Só depois de amanhã', back: 'não deve aparecer na fila', disc: 'Direito Penal', dueDate: mais(2), intervalo: 6, facilidade: 2.5, repeticoes: 2 }]);
    set('metas', [{ id: 'm' + (Date.now() - 60000), titulo: 'Revisar 50 cartões', prog: 0, alvo: 50, unidade: 'cartões' }]);
    const hoje = new Date();
    set('eventos', [{ id: 'ev-q', dia: hoje.getDate(), mes: hoje.getMonth(), ano: hoje.getFullYear(), tipo: 'Tarefa', titulo: 'Resolver 30 questões de Obrigações', disc: 'Direito Civil', color: 'var(--accent)', done: false }]);
  });
  await page.goto(base + '/' + arquivo); await page.waitForTimeout(1900);

  // ---- 1) o painel mostra o baralho, e a fila respeita o vencimento
  const painel = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__catedraGoView('inicio'); await w(900);
    const bt = document.querySelector('.cth-baralho');
    const menu = [...document.querySelectorAll('button[data-view="flashcards"]')][0];
    return { temNoPainel: !!bt, txt: bt ? (bt.innerText || '').replace(/\n/g, ' ') : '', temNoMenu: !!menu };
  });
  ok(painel.temNoPainel && /^2\b/.test(painel.txt.trim()),
    R + 'Início: o painel mostra 2 cartões vencidos — o vencido de ontem e o novo, nunca o de depois de amanhã (' + painel.txt.trim().slice(0, 40) + ')');
  ok(painel.temNoMenu, R + 'o Baralho tem entrada no menu (a tela existia só como dado antes)');

  // ---- 2) estudar: virar, "Sei" empurra para frente, "Não sei" devolve à rodada
  const estudo = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('.cth-baralho').click(); await w(900);
    const sala = () => document.querySelector('.ct-fc-sala');
    const r = { abriu: !!sala() };
    r.versoEscondido = !document.querySelector('.ct-fc-verso');
    r.frente1 = (document.querySelector('.ct-fc-frente') || {}).textContent || '';
    document.querySelector('.ct-fc-sala button.ct-fc-virar').click(); await w(500);
    r.versoApareceu = !!document.querySelector('.ct-fc-verso');
    // "Não sei" no primeiro cartão → volta para o fim desta rodada
    document.querySelector('[data-q="1"]').click(); await w(600);
    r.filaCresceu = (document.querySelector('.ct-fc-conta') || {}).textContent || '';
    // segundo cartão: "Sei"
    document.querySelector('.ct-fc-sala button.ct-fc-virar').click(); await w(400);
    document.querySelector('[data-q="5"]').click(); await w(700);
    const FC = JSON.parse(localStorage.getItem('catedra:fc') || '[]');
    const p = n => String(n).padStart(2, '0');
    const ymd = d => d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    const hoje = ymd(new Date());
    return { ...r, c1: FC.find(c => c.id === 'c1'), c2: FC.find(c => c.id === 'c2'), c3: FC.find(c => c.id === 'c3'), hoje };
  });
  ok(estudo.abriu && estudo.versoEscondido && estudo.versoApareceu,
    R + 'sala do baralho: a resposta só aparece depois de pedir para virar');
  ok(estudo.c1 && estudo.c1.dueDate === estudo.hoje && estudo.c1.repeticoes === 0,
    R + '"Não sei" zera as repetições e devolve o cartão para hoje (SM-2 gravado no cartão)');
  ok(/2 na fila/.test(estudo.filaCresceu) && /1 a rever/.test(estudo.filaCresceu),
    R + '"Não sei" devolve o cartão ao FIM da mesma rodada: o que foi respondido saiu, o devolvido entrou (' + estudo.filaCresceu.trim() + ')');
  ok(estudo.c2 && estudo.c2.dueDate > estudo.hoje,
    R + '"Sei" joga o cartão para frente, pela régua do SM-2');
  ok(estudo.c3 && estudo.c3.repeticoes === 2,
    R + 'cartão que não vencia ficou intocado — a fila é por vencimento, não "tudo que existe"');

  // ---- 3) encerrar OFERECE o registro, com os cartões como questões
  const reg = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('.ct-fc-sair').click(); await w(1000);
    const dlg = document.querySelector('[role="dialog"][aria-label="Registrar sessão"]');
    if (!dlg) return { erro: 'não ofereceu registro' };
    const val = k => (dlg.querySelector('input[data-k="' + k + '"]') || {}).value;
    const antes = { acertos: val('acertos'), erradas: val('erradas') };
    [...dlg.querySelectorAll('button')].find(b => /^Registrar sessão$/.test((b.textContent || '').trim())).click();
    await w(1500);
    const S = JSON.parse(localStorage.getItem('catedra:sessions') || '[]');
    return { antes, n: S.length, rec: S[0] || {} };
  });
  ok(!reg.erro && reg.antes.acertos === '1' && reg.antes.erradas === '1',
    R + 'encerrar OFERECE o registro preenchido (não grava sozinho) com 1 sei e 1 a rever');
  ok(reg.n === 1 && reg.rec.origem === 'flashcards' && reg.rec.questoes === 2,
    R + 'a sessão do baralho entra no histórico com origem "flashcards" e os cartões como questões');

  // ---- 4) histórico com selo, e a meta de cartões andando sozinha
  const derivados = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__catedraGoView('historico'); await w(1000);
    const selos = [...document.querySelectorAll('.ct-hist-origem')].map(e => (e.textContent || '').trim());
    window.__catedraGoView('conquistas'); await w(1100);
    const txt = (document.body.innerText || '');
    return { selos, meta: /2\s*\/\s*50\s*cartões/.test(txt.replace(/\s+/g, ' ')) };
  });
  ok(derivados.selos.indexOf('baralho') >= 0,
    R + 'histórico: a linha do baralho diz de onde veio (' + derivados.selos.join(', ') + ')');
  ok(derivados.meta, R + 'a meta em "cartões" anda sozinha com as sessões do baralho — sem contador paralelo');

  // ---- 5) calendário: concluir evento oferece registro; excluir a sessão REABRE o evento
  const cal = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__catedraGoView('calendario'); await w(1200);
    const chk = [...document.querySelectorAll('button[data-id="ev-q"]')].find(b => b.offsetParent && /Concluir/i.test(b.getAttribute('title') || ''));
    if (!chk) return { erro: 'checkbox do evento não achado' };
    chk.click(); await w(1100);
    const dlg = document.querySelector('[role="dialog"][aria-label="Registrar sessão"]');
    if (!dlg) return { erro: 'concluir o evento não ofereceu registro' };
    const topico = (dlg.querySelector('input[data-k="topico"]') || {}).value || '';
    const min = dlg.querySelector('input[data-k="minutos"]'); min.value = '40'; min.dispatchEvent(new Event('input', { bubbles: true })); await w(400);
    [...dlg.querySelectorAll('button')].find(b => /^Registrar sessão$/.test((b.textContent || '').trim())).click();
    await w(1500);
    const S = JSON.parse(localStorage.getItem('catedra:sessions') || '[]');
    const evd = JSON.parse(localStorage.getItem('catedra:eventos') || '[]')[0] || {};
    return { topico, rec: S.find(x => x.origem === 'calendario') || {}, eventoFeito: !!evd.done, total: S.length };
  });
  ok(!cal.erro && /Resolver 30 questões/.test(cal.topico),
    R + 'calendário: concluir um evento OFERECE o registro já com o assunto do evento');
  ok(cal.rec.atvKey === 'ev|ev-q' && cal.rec.min === 40 && cal.eventoFeito,
    R + 'a sessão do evento guarda o vínculo ev|<id> e o evento fica concluído');

  const volta = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__catedraGoView('historico'); await w(1000);
    const S = JSON.parse(localStorage.getItem('catedra:sessions') || '[]');
    const alvo = S.find(x => x.origem === 'calendario');
    const bt = document.querySelector('.ct-hist-linha button[data-id="' + alvo.id + '"][title="Remover"]');
    if (!bt) return { erro: 'botão remover não achado' };
    bt.click(); await w(1600);
    const evd = JSON.parse(localStorage.getItem('catedra:eventos') || '[]')[0] || {};
    return { reaberto: evd.done === false };
  });
  ok(volta.reaberto,
    R + 'excluir a sessão do evento REABRE o evento no calendário — mesma regra do ciclo, mesmo caminho');

  // ---- 6) o agendamento dos cartões sobrevive a reabrir o app
  await page.goto(base + '/' + arquivo); await page.waitForTimeout(2000);
  const persist = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__catedraGoView('inicio'); await w(1100);
    const FC = JSON.parse(localStorage.getItem('catedra:fc') || '[]');
    const c2 = FC.find(c => c.id === 'c2') || {};
    return { c2due: String(c2.dueDate || ''), painel: !!document.querySelector('.cth-baralho') };
  });
  ok(persist.c2due && persist.painel,
    R + 'reabrindo o app: o agendamento de cada cartão sobreviveu e o painel segue mostrando o que resta');
}
