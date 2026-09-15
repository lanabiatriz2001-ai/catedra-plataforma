/* INTEGRAÇÃO ENTRE OS MÓDULOS — O FIO QUE LIGA CICLO, SESSÃO, EDITAL E ACERVO (15/09/2026)

   O que faltava: a atividade do ciclo pré-preenchia o registro e ali o fio se cortava. O tempo
   registrado não voltava para a atividade, sessão parcial não existia (ou o bloco fechava, ou
   nada contava) e apagar a sessão deixava a atividade fechada por um estudo que não existe mais.

   O que se prova aqui, no percurso inteiro do pedido (assunto do edital → atividade no ciclo →
   sessão → acervo → registro → progresso → reabrir o app):
   · PARCIAL: registrar um pedaço NÃO conclui a atividade — ela segue em aberto, mostrando
     quanto já foi feito. Tempo estudado ≠ conteúdo concluído.
   · SEM CONTAR DUAS VEZES: concluir depois do parcial sugere o que RESTA, não o bloco inteiro.
   · VÍNCULO: a sessão grava atvKey (a ocorrência da atividade) e origem — e o histórico mostra
     de onde o número veio ("ciclo", "ciclo · parcial").
   · DERIVADO: o tempo da atividade é somado das sessões, nunca gravado à parte. Excluir a
     sessão do parcial some com o tempo dela sozinho; excluir a sessão que CONCLUIU reabre a
     atividade (planejamento e histórico voltam a dizer a mesma coisa).
   · ACERVO: do cartão da atividade abre-se a legislação do assunto com a busca já preenchida —
     e ABRIR NÃO MARCA NADA: nenhuma leitura, nenhuma conclusão, nenhuma sessão.
   · PERSISTÊNCIA: fechar e reabrir o app mantém o parcial, o vínculo e a atividade em aberto.

   RELÓGIO FIXO às 14:00 (mesmo motivo de tests/registro-sessao.mjs): a atividade da agenda
   pertence a um DIA da semana e a sessão é datada por "agora − minutos"; rodar entre 00:00 e
   00:45 mudava o dia sob os pés do teste. Contexto próprio porque o relógio falso não desinstala. */

import { pathToFileURL } from 'url';

export async function testarIntegracaoModulos(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const origem = opcoes.origem || (String(base).startsWith('file:') ? 'file' : 'http');
  const arquivo = opcoes.arquivo || 'Catedra.dc.html';
  const R = 'INTEGRAÇÃO [' + motor + '] [' + origem + '] ';

  const ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  const relogio = (() => { const t = new Date(); t.setHours(14, 0, 0, 0); return t; })();
  await page.clock.install({ time: relogio });
  try { await roteiro(page, base, ok, R, arquivo); }
  finally { await ctx.close(); }
}

async function roteiro(page, base, ok, R, arquivo) {
  await page.goto(base + '/__semente');
  await page.evaluate(() => {
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    localStorage.clear();
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
    set('cycleMode', 'manual'); set('blocks', []); set('agendaFeitas', {});
    set('edital', [{ disc: 'Direito Civil', peso: 3, questoes: 20, color: '#2563eb',
      topics: [{ name: 'Obrigações', done: false, subs: [{ name: 'Adimplemento' }] }] }]);
    set('sessions', []); set('reviews', []); set('errors', []);
    // a atividade cai em HOJE: a agenda é por dia da semana
    const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    set('manualFixed', [{ id: 'ag-civil', disc: 'Direito Civil', kind: 'Teoria', min: 90,
      dia: DIAS[new Date().getDay()], roteiro: '',
      discEdital: 'Direito Civil', topico: 'Obrigações', subtopico: 'Adimplemento' }]);
  });
  await page.goto(base + '/' + arquivo); await page.waitForTimeout(1800);

  // ---- 1) a atividade do ciclo nasce vinculada ao assunto do edital
  const vinc = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    window.__catedraGoView('ciclo'); await w(900);
    const cartao = document.querySelector('.ct-bc-foco');
    return { achou: !!cartao, temParcial: !!(cartao && cartao.querySelector('.ct-cb-parcial')),
      temBotaoParcial: !!(cartao && cartao.querySelector('[aria-label^="Registrar parcial"]')),
      temBotaoLei: !!(cartao && cartao.querySelector('[aria-label^="Legislação"]')) };
  });
  ok(vinc.achou, R + 'a atividade do edital aparece como bloco do dia no Ciclo');
  ok(vinc.temBotaoParcial, R + 'a atividade em aberto oferece registrar PARCIAL');
  ok(!vinc.temParcial, R + 'sem sessão registrada, a atividade não mostra tempo parcial nenhum');
  ok(vinc.temBotaoLei, R + 'a atividade oferece abrir a legislação do assunto (Direito Civil)');

  // ---- 2) PARCIAL: registra 30 min e a atividade SEGUE EM ABERTO
  const parc = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const cartao = document.querySelector('.ct-bc-foco');
    cartao.querySelector('[aria-label^="Registrar parcial"]').click(); await w(900);
    const dlg = document.querySelector('[role="dialog"][aria-label="Registrar sessão"]');
    if (!dlg) return { erro: 'modal não abriu' };
    const min = dlg.querySelector('input[data-k="minutos"]');
    min.value = '30'; min.dispatchEvent(new Event('input', { bubbles: true })); await w(400);
    [...dlg.querySelectorAll('button')].find(b => /^Registrar sessão$/.test((b.textContent || '').trim())).click();
    await w(1500);
    const S = JSON.parse(localStorage.getItem('catedra:sessions') || '[]');
    const feitas = JSON.parse(localStorage.getItem('catedra:agendaFeitas') || '{}');
    const c2 = document.querySelector('.ct-bc-foco');
    return { n: S.length, rec: S[0] || {}, feitas: Object.keys(feitas).length,
      aindaAberta: !!(c2 && /Direito Civil/.test(c2.innerText || '')),
      faixa: (c2 && c2.querySelector('.ct-cb-parcial-tx') || {}).textContent || '' };
  });
  ok(parc.n === 1 && parc.rec.min === 30, R + 'parcial: a sessão de 30 min entra no histórico');
  ok(parc.rec.edTop === 'Obrigações' && parc.rec.edSub === 'Adimplemento',
    R + 'parcial: a sessão nasce vinculada ao tópico e ao subtópico do edital, sem recadastrar nada');
  ok(/^ag\|ag-civil\|/.test(String(parc.rec.atvKey || '')) && parc.rec.origem === 'ciclo',
    R + 'parcial: a sessão guarda a atividade de origem (atvKey) e a origem "ciclo"');
  ok(parc.rec.concluiu === false, R + 'parcial: a sessão NÃO se declara conclusão da atividade');
  ok(parc.aindaAberta === true && parc.feitas === 0,
    R + 'parcial: a atividade do ciclo segue EM ABERTO — sessão encerrada ≠ conteúdo concluído');
  ok(/30 de 90 min/.test(parc.faixa), R + 'parcial: a atividade mostra "30 de 90 min já registrados" (' + parc.faixa + ')');

  // ---- 3) CONCLUIR depois do parcial sugere o que RESTA (não conta o tempo duas vezes)
  const conc = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const cartao = document.querySelector('.ct-bc-foco');
    cartao.querySelector('[aria-label^="Concluir"]').click(); await w(900);
    const dlg = document.querySelector('[role="dialog"][aria-label="Registrar sessão"]');
    const sugerido = dlg.querySelector('input[data-k="minutos"]').value;
    [...dlg.querySelectorAll('button')].find(b => /^Registrar sessão$/.test((b.textContent || '').trim())).click();
    await w(1500);
    const S = JSON.parse(localStorage.getItem('catedra:sessions') || '[]');
    const feitas = JSON.parse(localStorage.getItem('catedra:agendaFeitas') || '{}');
    const c2 = document.querySelector('.ct-bc-foco');
    return { sugerido, n: S.length, rec: S[0] || {}, feitas: Object.keys(feitas).length,
      fechada: !(c2 && /Direito Civil/.test(c2.innerText || '')),
      somaMin: S.reduce((t, x) => t + (x.min || 0), 0) };
  });
  ok(conc.sugerido === '60', R + 'concluir depois do parcial sugere os 60 min que RESTAM, não os 90 do bloco (veio "' + conc.sugerido + '")');
  ok(conc.n === 2 && conc.somaMin === 90, R + 'o tempo da atividade soma 90 min no total, sem contar o parcial duas vezes');
  ok(conc.rec.concluiu === true && conc.fechada === true && conc.feitas === 1,
    R + 'concluir fecha a atividade e a sessão registra que foi ela quem fechou');

  // ---- 4) o histórico diz DE ONDE cada registro veio
  const hist = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    window.__catedraGoView('historico'); await w(1000);
    const selos = [...document.querySelectorAll('.ct-hist-origem')].map(e => (e.textContent || '').trim());
    return { selos };
  });
  ok(hist.selos.indexOf('ciclo') >= 0 && hist.selos.indexOf('ciclo · parcial') >= 0,
    R + 'histórico: cada linha diz a origem — "ciclo" e "ciclo · parcial" (' + hist.selos.join(', ') + ')');

  // ---- 5) excluir a sessão que CONCLUIU reabre a atividade do ciclo
  const del = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const S = JSON.parse(localStorage.getItem('catedra:sessions') || '[]');
    const alvo = S.find(x => x.concluiu === true);
    // a linha tem dois botões com o mesmo data-id (editar e remover): o de remover é o
    // que se identifica pelo title — pegar "o primeiro" abria a edição
    const bt = document.querySelector('.ct-hist-linha button[data-id="' + alvo.id + '"][title="Remover"]');
    if (!bt) return { erro: 'botão de excluir não encontrado' };
    bt.click(); await w(1600);
    const feitas = JSON.parse(localStorage.getItem('catedra:agendaFeitas') || '{}');
    const S2 = JSON.parse(localStorage.getItem('catedra:sessions') || '[]');
    window.__catedraGoView('ciclo'); await w(900);
    const c2 = document.querySelector('.ct-bc-foco');
    return { feitas: Object.keys(feitas).length, restou: S2.length,
      reaberta: !!(c2 && /Direito Civil/.test(c2.innerText || '')),
      faixa: (c2 && c2.querySelector('.ct-cb-parcial-tx') || {}).textContent || '' };
  });

  ok(del.restou === 1 && del.feitas === 0 && del.reaberta === true,
    R + 'excluir a sessão que concluiu REABRE a atividade — o ciclo não fica fechado por estudo que não existe mais');
  ok(/30 de 90 min/.test(del.faixa),
    R + 'depois da exclusão, a atividade volta a mostrar só os 30 min do parcial que sobrou (contagem derivada)');

  // ---- 6) abrir a legislação do assunto NÃO marca leitura nem progresso
  const acervo = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const antesL = (JSON.parse(localStorage.getItem('catedra:leituras') || '[]')).length;
    const antesS = (JSON.parse(localStorage.getItem('catedra:sessions') || '[]')).length;
    const cartao = document.querySelector('.ct-bc-foco');
    cartao.querySelector('[aria-label^="Legislação"]').click(); await w(1600);
    // há um iframe por satélite no DOM: o do LEGIS é o que interessa
    const frame = [...document.querySelectorAll('iframe[data-ct-frame]')].find(f => /legis-web/.test(f.getAttribute('src') || ''));
    const ed = JSON.parse(localStorage.getItem('catedra:edital') || '[]');
    return { foiPraLegis: !!(frame && /legis/.test(frame.getAttribute('src') || '')),
      buscaNaUrl: /q=/.test((frame && frame.getAttribute('src')) || ''),
      leiuNada: (JSON.parse(localStorage.getItem('catedra:leituras') || '[]')).length === antesL,
      semSessaoNova: (JSON.parse(localStorage.getItem('catedra:sessions') || '[]')).length === antesS,
      editalIntacto: ed[0].topics[0].done !== true };
  });
  ok(acervo.foiPraLegis && acervo.buscaNaUrl,
    R + 'do cartão da atividade abre-se o CátedraLEGIS com o assunto já na busca');
  ok(acervo.leiuNada && acervo.semSessaoNova && acervo.editalIntacto,
    R + 'abrir a lei NÃO marca leitura, NÃO cria sessão e NÃO conclui item do edital — progresso só por ação identificável');

  // ---- 7) fechar e reabrir o app: o vínculo e o parcial sobrevivem
  await page.goto(base + '/' + arquivo); await page.waitForTimeout(2000);
  const volta = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    window.__catedraGoView('ciclo'); await w(1100);
    const c = document.querySelector('.ct-bc-foco');
    const S = JSON.parse(localStorage.getItem('catedra:sessions') || '[]');
    return { aberta: !!(c && /Direito Civil/.test(c.innerText || '')),
      faixa: (c && c.querySelector('.ct-cb-parcial-tx') || {}).textContent || '',
      vinculo: String((S[0] || {}).atvKey || '') };
  });
  ok(volta.aberta === true && /30 de 90 min/.test(volta.faixa) && /^ag\|ag-civil\|/.test(volta.vinculo),
    R + 'reabrindo o app: a atividade continua em aberto, com o parcial e o vínculo intactos');
}
