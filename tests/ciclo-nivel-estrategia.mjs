/* CICLO × NÍVEL E ESTRATÉGIA (03/10/2026). Nível e estratégia eram enfeite em Ajustes; agora
   mudam a volta. Prova-se pela própria _genVolta, com edital e sessões semeados e relógio
   fixo (14:00 de hoje, em contexto próprio — padrão de tests/registro-sessao.mjs):
   · de fábrica (intermediário + ciclo por blocos) a volta é IDÊNTICA à de antes da mudança
     (tests/fixtures/volta-fabrica.json, gerada com o gerador antigo);
   · iniciante nunca abre uma matéria com questões e tem questões curtas; avançado põe as
     questões de cada ponto antes da teoria, com teoria curta;
   · sequencial junta os blocos da matéria; foco em revisão dá até 3 extras de revisão vencida
     e abre com revisão geral a matéria que já foi estudada;
   · trocar nível/estratégia no meio da volta refaz só o que não foi concluído. */

const EDITAL = [
  { disc: 'Direito Civil', peso: 3, questoes: 15, topics: ['Obrigações', 'Contratos', 'Posse'].map(n => ({ name: n, done: false, subs: [] })) },
  { disc: 'Direito Penal', peso: 2, questoes: 10, topics: ['Teoria do crime', 'Penas'].map(n => ({ name: n, done: false, subs: [] })) },
  { disc: 'Direito Constitucional', peso: 2, questoes: 10, topics: ['Controle', 'Direitos fundamentais'].map(n => ({ name: n, done: false, subs: [] })) }];
const DISCS = EDITAL.map(e => e.disc);
// data LOCAL (toISOString é UTC e vira o dia entre 20h e 24h em UTC−4)
const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
// líquido negativo em "Obrigações" com 20 questões: sinal de tópico frágil (o gerador pede ≥ 6)
const SESSOES = (hoje, ts) => [{ id: 's1', up: 1, ts, date: hoje, disc: 'Direito Civil', topico: 'Obrigações', min: 40, questoes: 20, acertos: 6, erradas: 14, brancos: 0, categorias: ['Questões'] }];

const volta = (page, orient) => page.evaluate((o) => { const a = window.__catedraApp;
  a.setState(s => ({ orient: { ...s.orient, ...o } }));
  return a._genVolta('pesos', 1).blocos.map(b => ({ disc: b.disc, kind: b.kind, tag: b.tag, min: b.min })); }, orient);

export async function prepararCiclo(browser, base, arquivo) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  const t = new Date(); t.setHours(14, 0, 0, 0); await page.clock.install({ time: t });
  await page.goto(base + '/__semente');
  await page.evaluate(([ed, ss]) => { localStorage.clear();
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica'); set('edital', ed); set('sessions', ss); set('reviews', []); set('errors', []);
  }, [EDITAL, SESSOES(ymd(t), t.getTime() - 3600e3)]);
  await page.goto(base + '/' + (arquivo || 'Catedra.dc.html'));
  await page.waitForFunction(() => !!window.__catedraApp && !!document.querySelector('#ct-main'), null, { timeout: 20000 });
  await page.waitForTimeout(600);
  return { ctx, page };
}
export const voltaDeFabrica = (page) => volta(page, { nivel: 'intermediario', estrategia: 'ciclo' });

export async function testarCicloNivelEstrategia(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const R = 'CICLO-NÍVEL [' + motor + '] ';
  const { ctx, page } = await prepararCiclo(pageDaSuite.context().browser(), base, opcoes.arquivo);
  try {
    const padrao = await voltaDeFabrica(page);
    ok(padrao.length >= 4, R + 'a volta de fábrica tem blocos (' + padrao.length + ')');
    ok(padrao[0].disc === 'Direito Civil' && padrao[0].kind === 'Questões' && padrao[0].tag === 'Obrigações', R + 'a semente dá sinal de tópico frágil (a volta padrão abre Civil com questões de Obrigações)');
    ok(!!opcoes.voltaDeReferencia && JSON.stringify(padrao) === JSON.stringify(opcoes.voltaDeReferencia), R + 'fábrica gera a volta de antes, bloco a bloco');
    const primeiroDe = (v, disc) => v.find(b => b.disc === disc) || {};
    const bloco = await page.evaluate(() => Math.max(20, Math.round((parseInt(window.__catedraApp.state.orient.blocoPadrao, 10) || 50) * window.__catedraApp._enMult())));

    // ── nível ──
    const ini = await volta(page, { nivel: 'iniciante', estrategia: 'ciclo' });
    ok(DISCS.every(d => primeiroDe(ini, d).kind === 'Teoria'), R + 'iniciante: nenhuma matéria abre com questões (' + DISCS.map(d => primeiroDe(ini, d).kind).join(', ') + ')');
    const qIni = ini.filter(b => b.kind === 'Questões');
    ok(qIni.every(b => b.min === Math.max(15, Math.round(bloco * .6))), R + 'iniciante: questões com 0,6 × o bloco (' + [...new Set(qIni.map(b => b.min))].join(',') + ' de ' + bloco + ')');

    const ava = await volta(page, { nivel: 'avancado', estrategia: 'ciclo' });
    const porPonto = {}; ava.forEach(b => { const k = b.disc + '|' + b.tag; (porPonto[k] || (porPonto[k] = [])).push(b.kind); });
    const pontos = Object.keys(porPonto).filter(k => EDITAL.some(e => e.topics.some(tp => k === e.disc + '|' + tp.name)));
    ok(pontos.length >= 3 && pontos.every(k => porPonto[k][0] === 'Questões'), R + 'avançado: cada ponto pendente entra primeiro como questões (' + pontos.length + ' pontos)');
    const tAva = ava.filter(b => b.kind === 'Teoria');
    ok(tAva.every(b => b.min === Math.max(15, Math.round(bloco * .7))), R + 'avançado: teoria com 0,7 × o bloco (' + [...new Set(tAva.map(b => b.min))].join(',') + ')');
    ok(JSON.stringify(ini) !== JSON.stringify(padrao) && JSON.stringify(ava) !== JSON.stringify(padrao), R + 'os três níveis geram voltas diferentes');

    if (opcoes.soNivel) return;

    // ── estratégia ──
    const seq = await volta(page, { nivel: 'intermediario', estrategia: 'sequencial' });
    const ordem = seq.map(b => b.disc).filter((d, i, a) => i === 0 || a[i - 1] !== d);
    ok(new Set(ordem).size === ordem.length, R + 'sequencial: nenhuma matéria reaparece depois de outra começar (' + ordem.join(' → ') + ')');
    ok(seq.length === padrao.length, R + 'sequencial: mesma quantidade de blocos da volta padrão (' + seq.length + ')');

    // foco em revisão: 3 matérias com revisão vencida → 3 extras de revisão (no ciclo por blocos é 1)
    const extras = (estrategia) => page.evaluate((e) => { const a = window.__catedraApp;
      a.setState(s => ({ orient: { ...s.orient, nivel: 'intermediario', estrategia: e }, reviews: ['Direito Civil', 'Direito Penal', 'Direito Constitucional', 'Direito Civil']
        .map((d, i) => ({ id: 'r' + i, up: 1, disc: d, topic: 'T' + i, due: -1 })) }));
      return a._extrasDoDia().filter(x => x.kind === 'Revisão').map(x => ({ id: x.id, disc: x.disc, min: x.min })); }, estrategia);
    const rvCiclo = await extras('ciclo');
    ok(rvCiclo.length === 1 && rvCiclo[0].id === 'x-rev', R + 'ciclo por blocos: um extra de revisão, como antes');
    const rv = await extras('revisao');
    ok(rv.length === 3 && new Set(rv.map(x => x.disc)).size === 3 && rv.every(x => x.min >= 15 && x.min <= 45), R + 'foco em revisão: 3 extras, um por matéria, ≤ 45 min (' + JSON.stringify(rv) + ')');
    ok(new Set(rv.map(x => x.id)).size === 3 && rv[0].id === 'x-rev', R + 'extras de revisão têm id único e o primeiro segue x-rev');
    const rvVolta = await volta(page, { estrategia: 'revisao' });
    ok(primeiroDe(rvVolta, 'Direito Civil').kind === 'Revisão', R + 'foco em revisão: matéria já estudada abre com revisão geral');
    ok(primeiroDe(rvVolta, 'Direito Penal').kind !== 'Revisão', R + 'foco em revisão: matéria nunca estudada não abre com revisão');

    // ── trocar no meio da volta preserva o concluído ──
    const troca = await page.evaluate(async () => { const a = window.__catedraApp;
      a.setState(s => ({ orient: { ...s.orient, nivel: 'intermediario', estrategia: 'ciclo' }, reviews: [], cycleMode: 'pesos' }));
      const V = a._genVolta('pesos', 1); V.blocos[0].done = true; V.blocos[0].doneDate = a._hoje();
      a.setState({ cicloVolta: V, blocks: a._comporDia(V, []), blocksDate: a._hoje() });
      const feito = V.blocos[0].id + '|' + V.blocos[0].disc + '|' + V.blocos[0].kind + '|' + V.blocos[0].tag;
      const antes = V.blocos.filter(b => !b.done).map(b => b.disc).join('>');
      a.setOrientVal({ currentTarget: { dataset: { k: 'estrategia', v: 'sequencial' } } });
      await new Promise(r => setTimeout(r, 400));
      const N = a.state.cicloVolta; const f = N.blocos.filter(b => b.done);
      const pend = N.blocos.filter(b => !b.done);
      return { feito, depois: f.map(b => b.id + '|' + b.disc + '|' + b.kind + '|' + b.tag), ids: N.blocos.map(b => b.id), total: N.blocos.length, totalAntes: V.blocos.length,
        antes, pendDepois: pend.map(b => b.disc).join('>'), repete: pend.some(b => (b.disc + '|' + b.kind + '|' + b.tag) === feito.split('|').slice(1).join('|')),
        dia: (a.state.blocks || []).filter(b => b.done).length }; });
    ok(troca.depois.length === 1 && troca.depois[0] === troca.feito, R + 'bloco concluído fica igual depois de trocar a estratégia');
    ok(new Set(troca.ids).size === troca.total, R + 'ids da volta continuam únicos');
    ok(troca.antes !== troca.pendDepois, R + 'os pendentes foram refeitos pela regra nova (' + troca.pendDepois + ')');
    ok(!troca.repete, R + 'o que já foi concluído não volta como pendente');
    ok(troca.dia === 1, R + 'o dia continua mostrando o bloco feito hoje');

    // volta toda concluída → nada é refeito, nada some
    const tudo = await page.evaluate(async () => { const a = window.__catedraApp;
      const V = a._genVolta('pesos', 1); V.blocos.forEach(b => { b.done = true; b.doneDate = a._hoje(); });
      a.setState({ cicloVolta: V, blocks: a._comporDia(V, []), blocksDate: a._hoje() }); const n = V.blocos.length;
      a.setOrientVal({ currentTarget: { dataset: { k: 'nivel', v: 'avancado' } } }); await new Promise(r => setTimeout(r, 400));
      return { n, depois: a.state.cicloVolta.blocos.length, feitos: a.state.cicloVolta.blocos.filter(b => b.done).length }; });
    ok(tudo.depois === tudo.n && tudo.feitos === tudo.n, R + 'volta toda concluída não é tocada (' + tudo.feitos + '/' + tudo.n + ')');

    // modo manual: o ciclo é da pessoa, nada muda
    const manual = await page.evaluate(async () => { const a = window.__catedraApp;
      const V = a._genVolta('pesos', 1); a.setState({ cycleMode: 'manual', cicloVolta: V }); const antes = JSON.stringify(a.state.cicloVolta.blocos);
      a.setOrientVal({ currentTarget: { dataset: { k: 'estrategia', v: 'revisao' } } }); await new Promise(r => setTimeout(r, 400));
      return antes === JSON.stringify(a.state.cicloVolta.blocos); });
    ok(manual, R + 'modo manual: trocar a estratégia não mexe na volta guardada');
  } finally { await ctx.close(); }
}
