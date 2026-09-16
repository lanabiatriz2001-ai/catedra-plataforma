/* REGISTRO DE SESSÃO — O EFEITO ANTES DO TOQUE (09/09/2026)

   A dona apontou o que atrapalhava no modal: "não mostra o efeito do registro" e "visual sem
   vida". O que se prova aqui, com histórico semeado (um tópico com 20 questões e líquido
   negativo, ofensiva de 1 dia, sem sessão hoje):
   · o modal abre pelos contratos de sempre (role=dialog + aria-label; .ct-modal-panel);
   · vazio, a faixa diz o que vai aparecer; com 45 min ela projeta a meta do dia e da semana e
     a ofensiva (1 → 2); com questões, o líquido; com o tópico conhecido, o domínio ANTES →
     DEPOIS pela mesma chave do _brain; com a revisão ligada, "amanhã"; desligada, some;
   · as projeções batem com o que o registro grava de verdade (meta de hoje e revisão);
   · chips de tipo têm estado em aria-pressed; todo select e input tem nome; nada estoura em
     390 px; nenhum emoji sobrou como ícone.

   RELÓGIO FIXO (09/09/2026). O app data a sessão por "agora − minutos" (teto 10 h): sessão de
   madrugada pertence a ontem, e aí a faixa mostra "Conta no dia …/… — a sessão começou antes da
   meia-noite" em vez de Meta de hoje / Semana / Ofensiva. Com 45 min digitados, a suíte
   falhava sempre que rodava entre 00:00 e 00:45 locais (na CI, UTC — PR #47). O app está certo;
   o teste é que dependia da hora. Por isso o relógio da página é fixado às 14:00 do dia corrente
   ANTES de semear e de abrir o app, com o Playwright (page.clock.install): a semente (ago(1)) e
   o app enxergam o mesmo "hoje", e o tempo continua correndo a partir daí — cronômetro e
   autosave (setTimeout/setInterval) seguem disparando. O relógio falso não tem desinstalar, então
   o roteiro corre num contexto próprio e não vaza para o que vier depois na suíte. */

import path from 'path';
import { pathToFileURL } from 'url';

export async function testarRegistroSessao(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const origem = opcoes.origem || (String(base).startsWith('file:') ? 'file' : 'http');
  const arquivo = opcoes.arquivo || 'Catedra.dc.html';
  const R = 'REGISTRO [' + motor + '] [' + origem + '] ';

  // Contexto próprio com relógio fixo (ver cabeçalho): 14:00 locais de hoje, tempo correndo.
  // Contexto, e não só página, porque a página da suíte vem de browser.newPage() (contexto
  // fechado a novas páginas) — e o localStorage isolado não atrapalha: o roteiro semeia tudo.
  // `opcoes.relogio` existe para o próprio teste do relógio provar a janela da falha (00:20).
  const ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  const relogio = opcoes.relogio || (() => { const t = new Date(); t.setHours(14, 0, 0, 0); return t; })();
  await page.clock.install({ time: relogio });
  try {
    await roteiro(page, base, ok, R, arquivo, relogio);
    // os selects do modal (ver selectsDoModal): mesmo contexto, mesmo relógio fixo
    if (!opcoes.relogio) await selectsDoModal(page, base, ok, R, arquivo);
  }
  finally { await ctx.close(); }
  if (!opcoes.relogio) await madrugada(pageDaSuite, base, ok, R, arquivo);
}

// O ramo que derrubava a CI, agora coberto de propósito: às 00:20 com 45 min digitados, a
// sessão começou ontem — a faixa avisa e o registro grava a data de ontem. É também a prova
// de que o relógio fixo governa a data do app (sem ele, este caso só existiria de madrugada).
async function madrugada(pageDaSuite, base, ok, R, arquivo) {
  const ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  const t = new Date(); t.setHours(0, 20, 0, 0);
  await page.clock.install({ time: t });
  try {
    await page.goto(base + '/__semente');
    await page.evaluate(() => {
      localStorage.clear();
      const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
      set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
      set('edital', [{ disc: 'Direito Civil', peso: 2, questoes: 15, topics: [{ name: 'Obrigações', done: false, subs: [] }] }]);
      set('sessions', []); set('reviews', []); set('errors', []);
    });
    await page.goto(base + '/' + arquivo); await page.waitForTimeout(1800);
    const m = await page.evaluate(async () => {
      const w = ms => new Promise(res => setTimeout(res, ms));
      const ymd = d => { const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
      const ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
      [...document.querySelectorAll('button')].find(b => /registrar sess/i.test(b.textContent || '')).click(); await w(1000);
      const dlg = document.querySelector('[role="dialog"][aria-label="Registrar sessão"]');
      const selD = dlg.querySelector('select[aria-label="Disciplina"]'); selD.value = 'Direito Civil'; selD.dispatchEvent(new Event('change', { bubbles: true })); await w(300);
      const min = dlg.querySelector('input[data-k="minutos"]'); min.value = '45'; min.dispatchEvent(new Event('input', { bubbles: true })); await w(400);
      const faixa = (dlg.querySelector('.ct-reg-efeito') || {}).textContent || '';
      const esperado = 'Conta no dia ' + ymd(ontem).slice(8, 10) + '/' + ymd(ontem).slice(5, 7) + ' — a sessão começou antes da meia-noite';
      [...dlg.querySelectorAll('button')].find(b => /^Registrar sessão$/.test((b.textContent || '').trim())).click(); await w(1400);
      const S = JSON.parse(localStorage.getItem('catedra:sessions') || '[]');
      return { avisa: faixa.includes(esperado), semMetaDeHoje: !/Meta de hoje/.test(faixa), gravouOntem: S.length === 1 && S[0].date === ymd(ontem), faixa };
    });
    ok(m.avisa, R + 'madrugada (00:20, 45 min): a faixa diz que a sessão conta em ontem, começou antes da meia-noite');
    ok(m.semMetaDeHoje, R + 'madrugada: não promete "Meta de hoje" para uma sessão de ontem');
    ok(m.gravouOntem, R + 'madrugada: o registro grava a data de ontem, como a faixa prometeu');
  } finally { await ctx.close(); }
}

async function roteiro(page, base, ok, R, arquivo, relogio) {
  const w = ms => page.waitForTimeout(ms);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(base + '/__semente');   // página SEM o app: semear com o app vivo é corrida com o autosave (500 ms), que regrava o estado do módulo anterior por cima
  await page.evaluate(() => {
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    const ymd = d => { const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
    const ago = n => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
    localStorage.clear();
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
    set('edital', [{ disc: 'Direito Civil', peso: 2, questoes: 15, topics: [{ name: 'Prescrição e decadência', done: false, subs: [] }, { name: 'Obrigações', done: false, subs: [] }] }]);
    // ontem: 20 questões em Prescrição com líquido −2 (8 certas, 10 erradas) → domínio 0 %
    set('sessions', [{ id: 's1', ts: ago(1).getTime(), date: ymd(ago(1)), disc: 'Direito Civil', topico: 'Prescrição e decadência', categoria: 'Questões', categorias: ['Questões'], min: 45, questoes: 20, acertos: 8, erradas: 10, brancos: 2, liquido: -2, foco: 4, nota: '', countMeta: true }]);
    set('reviews', []); set('errors', []);
  });
  await page.goto(base + '/' + arquivo);
  await w(1800);

  // o relógio fixo pegou: o app vê o "hoje" do relógio, e o tempo continua correndo
  const rel = await page.evaluate(() => Date.now());
  ok(Math.abs(rel - relogio.getTime()) < 60000, R + 'o app enxerga o relógio fixo (' + new Date(rel).toISOString() + ')');
  ok(rel > relogio.getTime(), R + 'o tempo continua correndo a partir do relógio fixo (cronômetro e autosave vivos)');

  const r = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const r = {};
    const abre = [...document.querySelectorAll('button')].find(b => /registrar sess/i.test(b.textContent || ''));
    abre.click(); await w(1000);
    const dlg = document.querySelector('[role="dialog"][aria-label="Registrar sessão"]');
    r.abrePelosContratos = !!dlg && dlg.classList.contains('ct-modal-panel');
    const faixa = () => (dlg.querySelector('.ct-reg-efeito') || {}).textContent || '';
    r.vazioDizOQueVaiAparecer = /Preencha o tempo ou as questões/.test(faixa());
    r.semEmojiComoIcone = !/[\u{1F300}-\u{1FAFF}✅❌○⚖]/u.test(dlg.textContent || '');
    r.todoSelectTemNome = [...dlg.querySelectorAll('select')].every(s => s.getAttribute('aria-label'));
    r.todoInputTemNome = [...dlg.querySelectorAll('input, textarea')].every(s => s.getAttribute('aria-label') || s.closest('label'));
    // escolhe a disciplina do edital no select (como a pessoa faz) e digita 45 min
    const selD = dlg.querySelector('select[aria-label="Disciplina"]'); selD.value = 'Direito Civil'; selD.dispatchEvent(new Event('change', { bubbles: true })); await w(300);
    const min = dlg.querySelector('input[data-k="minutos"]'); min.value = '45'; min.dispatchEvent(new Event('input', { bubbles: true })); await w(400);
    r.projetaMetaDoDia = /Meta de hoje: 0min → 45min de 3h/.test(faixa());
    r.projetaSemana = /Semana: (0min|45min) → (45min|1h30) de/.test(faixa());
    r.projetaOfensiva = /Ofensiva: 1 → 2 dias/.test(faixa());
    r.tituloEhAMateria = /Direito Civil/.test((dlg.querySelector('.ct-reg-tit') || {}).textContent || '');
    r.corDaMateriaNoModal = /--ct-item-cor:/.test(dlg.getAttribute('style') || '');
    // questões: 10 certas e 0 erradas no tópico conhecido → domínio 0 % → 27 %
    const mais = [...dlg.querySelectorAll('button')].find(b => /Mais detalhes/.test(b.textContent || '')); if (mais && mais.getAttribute('aria-expanded') !== 'true') { mais.click(); await w(400); }
    const top = dlg.querySelector('input[data-k="topico"]'); top.value = 'Prescrição e decadência'; top.dispatchEvent(new Event('input', { bubbles: true })); await w(300);
    const ac = dlg.querySelector('input[data-k="acertos"]'); ac.value = '10'; ac.dispatchEvent(new Event('input', { bubbles: true })); await w(400);
    r.projetaLiquido = /10 questões · bruto 100% · líquido \+10 \(100%\)/.test(faixa());
    r.projetaDominioAntesDepois = /Domínio em "Prescrição e decadência": 0% → 27%/.test(faixa());
    // revisão ligada por padrão → amanhã; desligada → some
    r.projetaRevisao = /Revisão espaçada: amanhã/.test(faixa());
    const sw = dlg.querySelector('button[data-k="agendarRevisao"]');
    r.switchTemPapel = sw.getAttribute('role') === 'switch' && sw.getAttribute('aria-checked') === 'true';
    sw.click(); await w(300);
    r.revisaoDesligadaSome = !/Revisão espaçada/.test(faixa()) && sw.getAttribute('aria-checked') === 'false';
    sw.click(); await w(300);
    // chips de tipo com estado
    const chip = [...dlg.querySelectorAll('.ct-reg-chip')].find(c => c.getAttribute('aria-pressed') === 'false');   // um tipo ainda não marcado (o último marcado não pode ser zerado)
    const antes = chip.getAttribute('aria-pressed'); chip.click(); await w(300);
    r.chipTrocaEstado = chip.getAttribute('aria-pressed') !== antes;
    chip.click(); await w(300);
    // registra e confere que a projeção era verdadeira
    const n0 = JSON.parse(localStorage.getItem('catedra:sessions') || '[]').length;
    [...dlg.querySelectorAll('button')].find(b => /^Registrar sessão$/.test((b.textContent || '').trim())).click(); await w(1400);
    const S = JSON.parse(localStorage.getItem('catedra:sessions') || '[]'); const Rv = JSON.parse(localStorage.getItem('catedra:reviews') || '[]');
    r.registrou = S.length === n0 + 1 && S[0].min === 45 && S[0].acertos === 10 && S[0].topico === 'Prescrição e decadência';
    r.revisaoFoiCriadaComoPrometido = Rv.length === 1 && Rv[0].disc === 'Direito Civil' && Rv[0].due === 1;
    r.modalFechou = !document.querySelector('[role="dialog"][aria-label="Registrar sessão"]');
    return r;
  });
  for (const [k, v] of Object.entries(r)) ok(v, R + k);

  // celular: nada estoura e o rodapé continua alcançável
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(base + '/' + arquivo); await w(1500);
  const m = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const abre = [...document.querySelectorAll('button')].find(b => /registrar sess/i.test(b.textContent || '')); abre.click(); await w(700);
    const dlg = document.querySelector('[role="dialog"][aria-label="Registrar sessão"]');
    const b = dlg.getBoundingClientRect();
    const salvar = [...dlg.querySelectorAll('button')].find(x => /^Registrar sessão$/.test((x.textContent || '').trim()));
    return { cabeNaTela: b.width <= innerWidth + 2 && b.left >= -1, rodapeVisivel: !!salvar && salvar.getBoundingClientRect().bottom <= innerHeight + 1, rolaLado: document.documentElement.scrollWidth > innerWidth + 2 };
  });
  ok(m.cabeNaTela, R + 'celular: o modal cabe na tela');
  ok(m.rodapeVisivel, R + 'celular: o botão Registrar continua alcançável sem rolar a página');
  ok(!m.rolaLado, R + 'celular: nada rola de lado');
}

/* OS SELECTS DO MODAL (10/09/2026 — "conserta o select do modal de registro também").
   O mesmo cuidado da agenda da semana, com a MESMA régua de tests/ciclo-inteligente.mjs
   (medidasNaPagina.textoCabe): área útil = clientWidth − padding − 24 da seta; o texto medido
   por canvas com a fonte computada do próprio select. Medido a 1280, 1180 e 390 (toque): o
   modal tem 560 px (select de 510, área útil 462) e, no celular, 354 (select de 320, área
   útil 272). A opção vazia mais larga, "— escolher o tópico —", tem 145 px: cabe com folga
   em todas as larguras, e por isso os rótulos ficaram como estavam. O que cortava era o
   NOME: o tópico de 73 caracteres (498 px), o subtópico de 202, as leis mais longas do
   catálogo do LEGIS (731 px), o título do material. Prova, a 1280:
   (a) a opção vazia de cada select, à vista, cabe na área útil — e todo select do modal
       passa pela régua (select novo sem medida derruba o caso);
   (b) o title de cada select é o texto da opção escolhida, acompanha a troca e fica vazio
       enquanto nada foi escolhido (a opção vazia cabe, não há o que revelar);
   (c) subtópico guardado como texto (formato do parser) aparece com o nome — antes virava
       opção em branco e não dava para escolher;
   (d) o nome inteiro do tópico e do subtópico longos aparece no modal (campo "Tópico
       estudado" e o rótulo do "Marcar … como estudado no edital"). */
async function selectsDoModal(page, base, ok, R, arquivo) {
  const T = R + 'selects do modal (1280) ';
  const SUB = 'Crimes contra as relações de consumo (Lei nº 8.078, de 11 de setembro de 1990), a ordem tributária (Lei nº 8.137, de 27 de dezembro de 1990) e a ordem econômica (Lei nº 8.176, de 8 de fevereiro de 1991)';
  const CPP = 'Código de Processo Penal (Decreto-lei nº 3.689, de 3 de outubro de 1.941)';
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(base + '/__semente');
  await page.evaluate(({ SUB, CPP }) => {
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    localStorage.clear();
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
    // subs nos dois formatos que o edital guarda: string (parser) e {name} (mesclagem)
    set('edital', [
      { disc: 'Direito Penal', peso: 2, questoes: 15, topics: [{ name: 'Leis Penais Especiais', done: false, subs: [SUB, 'Crimes hediondos'] }] },
      { disc: 'Direito Processual Penal', peso: 2, questoes: 15, topics: [{ name: CPP, done: false, subs: [{ name: 'Do inquérito policial' }, { name: 'Da ação penal' }] }] }]);
    set('sessions', []); set('reviews', []); set('errors', []);
  }, { SUB, CPP });
  await page.goto(base + '/' + arquivo); await page.waitForTimeout(1800);
  const r = await page.evaluate(async ({ SUB, CPP }) => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const fonte = cs => [cs.fontStyle, cs.fontWeight, cs.fontSize, cs.fontFamily].join(' ');
    const largura = (sel, t) => { const cx = document.createElement('canvas').getContext('2d'); cx.font = fonte(getComputedStyle(sel)); return cx.measureText(t).width; };
    const textoCabe = (sel, t) => { const cs = getComputedStyle(sel); return largura(sel, t) <= sel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 24; };
    // a opção vazia (value "" ou "__livre__") é a que está à vista, e cabe
    const vaziaCabe = sel => { const o = sel && sel.selectedOptions[0]; return !!o && (o.value === '' || o.value === '__livre__') && textoCabe(sel, o.textContent.trim()); };
    const escolhido = sel => { const o = sel && sel.selectedOptions[0]; return o ? o.textContent.trim() : null; };
    const titleEhOEscolhido = sel => !!sel && sel.title !== '' && sel.title === escolhido(sel);
    const r = {}, medidos = new Set();
    [...document.querySelectorAll('button')].find(b => /registrar sess/i.test(b.textContent || '')).click(); await w(1000);
    const dlg = document.querySelector('[role="dialog"][aria-label="Registrar sessão"]');
    const q = l => { const s = dlg.querySelector('select[aria-label="' + l + '"]'); if (s) medidos.add(l); return s; };
    const troca = async (l, v) => { const s = q(l); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); await w(400); return q(l); };
    const mais = [...dlg.querySelectorAll('button')].find(b => /Mais detalhes/.test(b.textContent || '')); if (mais && mais.getAttribute('aria-expanded') !== 'true') { mais.click(); await w(400); }
    const chip = v => [...dlg.querySelectorAll('.ct-reg-chip')].find(c => c.getAttribute('aria-label') === v);
    // Disciplina: não tem opção vazia — a opção fora do edital ("Outra…") cabe; title = a escolhida
    let s = await troca('Disciplina', 'Direito Penal');
    r.opcaoOutraDaDisciplinaCabe = textoCabe(s, [...s.options].find(o => o.value === '__outra__').textContent.trim());
    r.titleDaDisciplinaEhAEscolhida = s.title === 'Direito Penal' && titleEhOEscolhido(s);
    // Tópico: vazia à vista, cabendo, sem title; escolhido, title = texto da opção
    s = q('Tópico'); r.vaziaDoTopicoCabe = vaziaCabe(s); const topSemTitle = s.title === '';
    s = await troca('Tópico', 'Leis Penais Especiais');
    r.titleDoTopicoEhOEscolhido = topSemTitle && s.title === 'Leis Penais Especiais (2)' && titleEhOEscolhido(s);
    // Subtópico guardado como texto: as opções têm o nome (antes, linhas em branco)
    s = q('Subtópico'); r.vaziaDoSubtopicoCabe = vaziaCabe(s); const subSemTitle = s.title === '';
    const nomesSub = [...s.options].map(o => o.textContent.trim());
    r.subtopicoEmTextoApareceComONome = nomesSub.includes(SUB) && nomesSub.includes('Crimes hediondos') && nomesSub.every(t => t !== '');
    s = await troca('Subtópico', SUB);
    r.titleDoSubtopicoLongoEhONomeInteiro = subSemTitle && s.value === SUB && !textoCabe(s, SUB) && s.title === SUB && titleEhOEscolhido(s);
    r.nomeInteiroDoSubtopicoApareceNoModal = (dlg.textContent || '').includes('Marcar “' + SUB + '” como estudado no edital');
    s = await troca('Subtópico', 'Crimes hediondos'); const acompanhou = s.title === 'Crimes hediondos' && titleEhOEscolhido(s);
    s = await troca('Subtópico', '');
    r.titleDoSubtopicoAcompanhaATroca = acompanhou && s.title === '';
    // o tópico de 73 caracteres (não cabe na área útil): title = o texto inteiro da opção
    await troca('Disciplina', 'Direito Processual Penal');
    s = await troca('Tópico', CPP);
    r.titleDoTopicoLongoEhOTextoInteiro = !textoCabe(s, escolhido(s) || '') && s.title === CPP + ' (2)' && titleEhOEscolhido(s);
    r.nomeInteiroDoTopicoLongoApareceNoModal = dlg.querySelector('input[data-k="topico"]').value === CPP && (dlg.textContent || '').includes('Marcar “' + CPP + '”');
    const nomesObj = [...q('Subtópico').options].map(o => o.textContent.trim());
    r.subtopicoEmObjetoSegueComONome = nomesObj.includes('Do inquérito policial') && nomesObj.includes('Da ação penal');
    // (o seletor "Vincular material da biblioteca" saiu com a remoção da Biblioteca)
    // Lei seca: catálogo do LEGIS; a lei de nome mais largo é a que o select corta
    if (chip('Lei seca').getAttribute('aria-pressed') !== 'true') { chip('Lei seca').click(); await w(400); }
    s = q('Qual lei'); r.vaziaDaLeiCabe = vaziaCabe(s); const leiSemTitle = s.title === '';
    const longa = [...s.options].filter(o => o.value).sort((a, b) => largura(s, b.textContent.trim()) - largura(s, a.textContent.trim()))[0];
    const longaV = longa.value, longaT = longa.textContent.trim();
    const cp = [...s.options].find(o => o.textContent.trim() === 'Código Penal'); const cpV = cp.value;
    s = await troca('Qual lei', longaV);
    r.titleDaLeiLongaEhOTextoInteiro = leiSemTitle && !textoCabe(s, longaT) && s.title === longaT && titleEhOEscolhido(s);
    s = await troca('Qual lei', cpV);
    r.titleDaLeiAcompanhaATroca = s.title === 'Código Penal' && titleEhOEscolhido(s);
    // Trecho (faixas da tabela de leitura do Código Penal)
    s = q('Trecho da lei ou da fonte'); r.vaziaDoTrechoCabe = vaziaCabe(s); const trSemTitle = s.title === '';
    const faixa = [...s.options].find(o => o.value && o.value !== '__outro__'); const faixaV = faixa.value, faixaT = faixa.textContent.trim();
    s = await troca('Trecho da lei ou da fonte', faixaV);
    r.titleDoTrechoEhOEscolhido = trSemTitle && s.title === faixaT && titleEhOEscolhido(s);
    // Jurisprudência: catálogo do JURIS
    if (chip('Jurisprudência').getAttribute('aria-pressed') !== 'true') { chip('Jurisprudência').click(); await w(400); }
    s = q('Qual fonte'); r.vaziaDaFonteCabe = vaziaCabe(s); const foSemTitle = s.title === '';
    const fo = [...s.options].find(o => o.value); const foV = fo.value, foT = fo.textContent.trim();
    s = await troca('Qual fonte', foV);
    r.titleDaFonteEhOEscolhido = foSemTitle && s.title === foT && titleEhOEscolhido(s);
    // todo select do modal passou pela régua acima (um select novo sem medida derruba o caso)
    const esperados = ['Disciplina', 'Tópico', 'Subtópico', 'Qual lei', 'Trecho da lei ou da fonte', 'Qual fonte'];
    r.todoSelectDoModalPassouPelaRegua = esperados.every(l => medidos.has(l)) && [...dlg.querySelectorAll('select')].every(x => esperados.includes(x.getAttribute('aria-label')));
    return r;
  }, { SUB, CPP });
  for (const [k, v] of Object.entries(r)) ok(v, T + k);
}

// execução avulsa: `CT_PORT=8144 node tests/registro-sessao.mjs`
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { iniciarServidor, lancarNavegador } = await import('./_infra.mjs');
  const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const { srv, url } = await iniciarServidor(RAIZ, +(process.env.CT_PORT || 8144));
  const { browser, motor } = await lancarNavegador();
  const page = await browser.newPage();
  const falhas = [];
  const ok = (c, l) => { console.log((c ? '✓ ' : '✗ ') + l); if (!c) falhas.push(l); };
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  try { await testarRegistroSessao(page, url, ok, { motor, origem: 'http' }); }
  catch (e) { ok(false, 'REGISTRO o roteiro correu sem exceção (' + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')'); }
  await browser.close(); srv.close();
  console.log(falhas.length ? ('\nFALHAS: ' + falhas.length) : '\nTODOS OS TESTES PASSARAM');
  process.exit(falhas.length ? 1 : 0);
}
