/* CICLO INTELIGENTE + REORGANIZAR/CADASTRAR SEM SAIR DA TELA (09/09/2026)

   O modo `inteligente` monta o dia pela MESMA régua da tela Prioridade (prioridade-calc.js)
   e escreve o porquê de cada bloco. O que se prova aqui, com dado semeado de verdade
   (edital com pesos, sessões com desempenho desigual, revisões vencidas, erros):
   · a revisão vencida de Civil vem primeiro, como bloco de Revisão daquela matéria;
   · todo bloco tem motivo; nunca duas matérias iguais seguidas; nunca o mesmo tópico
     repetido na mesma matéria; o total cabe na meta diária (orient.metaIdeal, 180 por padrão);
   · a linha do dia tem um trecho por bloco, e o "porquê" aparece na lista;
   · subir/descer troca de lugar; tirar do dia tem desfazer; "Adicionar bloco" entra no fim;
   · no manual, o cadastro rápido cria UMA atividade por dia marcado e "Preencher a semana
     pela prioridade" só enche os dias úteis vazios;
   · sem edital, o modo cai na sugestão padrão e o cartão avisa — em vez de fingir.

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
  await page.goto(base + '/' + arquivo);
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
    r.gerou = B.length >= 3;
    r.todosComMotivo = B.every(b => b.motivo && String(b.motivo).length > 6);
    r.revisaoDeCivilPrimeiro = !!B[0] && B[0].disc === 'Direito Civil' && B[0].kind === 'Revisão';
    r.nuncaDuasIguaisSeguidas = B.every((b, i) => i === 0 || b.disc !== B[i - 1].disc);
    r.nuncaOMesmoTopicoNaMateria = new Set(B.map(b => b.disc + '|' + b.tag)).size === B.length;
    const total = B.reduce((a, b) => a + (+b.min || 0), 0);
    r.cabeNaMeta = total > 0 && total <= 180;
    r.minutosValidos = B.every(b => +b.min >= 15);
    r.vinculoAoEdital = B.filter(b => /^Direito/.test(b.disc)).every(b => b.discEdital === b.disc && b.topico === b.tag);
    r.faixaNova = !!document.querySelector('.ct-hero-ciclo');
    r.linhaDoDiaUmTrechoPorBloco = document.querySelectorAll('.ct-linha-seg').length === B.length;
    r.porqueNaLista = document.querySelectorAll('.ct-cb .ct-cb-motivo').length === B.length;
    r.matériaTingeOItem = [...document.querySelectorAll('.ct-cb')].every(el => /--ct-item-cor:/.test(el.getAttribute('style') || ''));
    // reorganizar: descer o primeiro troca com o segundo
    const tits = () => [...document.querySelectorAll('.ct-cb .ct-item-tit')].map(e => e.textContent.trim());
    const antes = tits();
    document.querySelector('.ct-cb .ct-cb-mini[data-dir="1"]').click(); await w(500);
    const depois = tits();
    r.descerTroca = depois[0] === antes[1] && depois[1] === antes[0];
    // tirar do dia + desfazer
    const n0 = document.querySelectorAll('.ct-cb').length;
    const xs = document.querySelectorAll('.ct-cb .ct-cb-mini[title="Tirar do dia"]'); xs[xs.length - 1].click(); await w(500);
    r.tirarReduz = document.querySelectorAll('.ct-cb').length === n0 - 1;
    const desfazer = [...document.querySelectorAll('button')].find(b => /^desfazer$/i.test((b.textContent || '').trim()));
    if (desfazer) { desfazer.click(); await w(500); }
    r.desfazerDevolve = !!desfazer && document.querySelectorAll('.ct-cb').length === n0;
    // adicionar bloco ao dia
    const sel = document.querySelector('.ct-cb-add select[data-k="disc"]'); sel.value = 'Direito Constitucional'; sel.dispatchEvent(new Event('change', { bubbles: true })); await w(300);
    [...document.querySelectorAll('.ct-cb-add button')].find(b => /^Adicionar$/.test((b.textContent || '').trim())).click(); await w(500);
    const t2 = tits();
    r.adicionarEntraNoFim = t2.length === n0 + 1 && t2[t2.length - 1] === 'Direito Constitucional';
    // manual: cadastro rápido em 3 dias + preencher só os vazios
    document.getElementById('ct-cycle-tab-configurar').click(); await w(500);
    [...document.querySelectorAll('.ct-modo')].find(b => b.dataset.mode === 'manual').click(); await w(700);
    const cfg = document.getElementById('ct-cycle-panel-configurar');
    const selAg = cfg.querySelector('.ct-cb-add select[data-k="disc"]'); selAg.value = 'Direito Penal'; selAg.dispatchEvent(new Event('change', { bubbles: true })); await w(300);
    const chipsOn = [...cfg.querySelectorAll('.ct-dia-chip[aria-pressed="true"]')].map(c => c.dataset.dia);
    [...cfg.querySelectorAll('.ct-cb-add button')].find(b => /^Adicionar em/.test((b.textContent || '').trim())).click(); await w(700);
    const mf1 = JSON.parse(localStorage.getItem('catedra:manualFixed') || '[]');
    r.cadastroRapidoUmaPorDia = chipsOn.length === 3 && mf1.length === 3 && chipsOn.every(d => mf1.some(f => f.dia === d && f.disc === 'Direito Penal' && f.discEdital === 'Direito Penal'));
    [...cfg.querySelectorAll('button')].find(b => /Preencher a semana pela prioridade/.test(b.textContent || '')).click(); await w(900);
    const mf2 = JSON.parse(localStorage.getItem('catedra:manualFixed') || '[]');
    const porDia = d => mf2.filter(f => f.dia === d).length;
    r.preencherSoOsVazios = chipsOn.every(d => porDia(d) === 1) && ['seg', 'ter', 'qua', 'qui', 'sex'].filter(d => chipsOn.indexOf(d) < 0).every(d => porDia(d) >= 2);
    r.preencherSemRepetirTopicoNoDia = ['seg', 'ter', 'qua', 'qui', 'sex'].every(d => { const L = mf2.filter(f => f.dia === d); return new Set(L.map(f => f.disc + '|' + f.topico)).size === L.length; });
    r.preencherLevaMotivo = mf2.filter(f => f.id.endsWith('p')).every(f => f.motivo);
    return r;
  });
  for (const [k, v] of Object.entries(r)) ok(v, R + k);

  // sem edital: cai na sugestão padrão e o cartão do modo AVISA
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); localStorage.setItem('catedra:cycleMode', 'inteligente'); localStorage.setItem('catedra:blocks', '[]'); });
  await page.goto(base + '/' + arquivo);
  await w(1600);
  const s = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    document.querySelector('button[data-view="ciclo"]').click(); await w(800);
    const B = JSON.parse(localStorage.getItem('catedra:blocks') || '[]');
    document.getElementById('ct-cycle-tab-configurar').click(); await w(500);
    const card = [...document.querySelectorAll('.ct-modo')].find(b => b.dataset.mode === 'inteligente');
    return { semEditalAindaMontaODia: B.length >= 3, cartaoAvisaSemEdital: /Sem edital cadastrado/.test(card ? card.textContent : ''),
      recomendado: /recomendado/i.test(card ? card.textContent : '') };
  });
  for (const [k, v] of Object.entries(s)) ok(v, R + k);
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
