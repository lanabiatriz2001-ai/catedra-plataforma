/* RÉGUA ÚNICA · Início e "Onde estou fraca" apontam a mesma disciplina (item 1 do diagnóstico
   de 22/09/2026). Antes, o "Foco sugerido" escolhia disciplina por conta própria (líquido mais
   baixo, mais tempo parada, "onde rende mais") e "Onde estou fraca" usava prioridade-calc com
   pesos fixos — as duas caixas da MESMA tela podiam recomendar matérias diferentes.
   Agora os controles de prioridade de Ajustes são os pesos da régua única:
   · no padrão, a régua é idêntica à antiga (ninguém que não mexeu vê mudança);
   · mexer num controle muda as duas caixas juntas. */

export async function testarReguaUnica(page, base, ok) {
  await import('../prioridade-calc.js'); const C = globalThis.CT_PRIORIDADE_CALC;
  const hoje = '2026-09-22';
  const estado = {
    hoje,
    edital: [{ disc: 'Direito Civil', peso: 1 }, { disc: 'Direito Penal', peso: 1 }],
    // Civil: muitos erros recentes, estudada ontem. Penal: sem erros, parada há 20 dias.
    errors: Array.from({ length: 6 }, (_, i) => ({ disc: 'Direito Civil', ts: Date.parse('2026-09-2' + (i % 2) + 'T12:00:00Z') })),
    reviews: [],
    sessions: [{ disc: 'Direito Civil', date: '2026-09-21' }, { disc: 'Direito Penal', date: '2026-09-02' }]
  };
  const PAD = { pEdital: 8, pDesemp: 9, pRevVenc: 10, pIncid: 8, pProva: 8, pTempo: 7, pErros: 9 };
  const sem = C.prioridadeDisciplinas(estado);
  const comPadrao = C.prioridadeDisciplinas({ ...estado, pesos: C.pesosDosControles(PAD) });
  ok(JSON.stringify(sem.map(p => [p.disc, p.nota])) === JSON.stringify(comPadrao.map(p => [p.disc, p.nota])),
    'RÉGUA/única com os controles no padrão a régua é idêntica à antiga (' + sem.map(p => p.disc + ' ' + p.nota).join(', ') + ')');
  const semErros = C.prioridadeDisciplinas({ ...estado, pesos: C.pesosDosControles({ ...PAD, pErros: 0, pTempo: 10 }) });
  ok(sem[0].disc === 'Direito Civil' && semErros[0].disc === 'Direito Penal',
    'RÉGUA/única zerar "Erros" e subir "Tempo sem estudar" troca o topo (' + sem[0].disc + ' → ' + semErros[0].disc + ')');
  const soma = Object.values(C.pesosDosControles(PAD)).reduce((a, b) => a + b, 0);
  ok(Math.abs(soma - 1) < 1e-9, 'RÉGUA/única os pesos somam 1 (' + soma + ')');

  // no app: o Foco sugerido e o primeiro de "Onde estou fraca" são a mesma disciplina,
  // antes e depois de mexer nos controles
  await page.goto(base + '/__semente');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); });
  await page.clock.install({ time: new Date('2026-09-22T15:00:00-03:00') });
  await page.goto(base + '/Catedra.dc.html'); await page.waitForTimeout(1600);
  const m = await page.evaluate(async (est) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const app = window.__catedraApp;
    // Penal tem o líquido mais baixo em questões (a régua antiga do Foco escolheria Penal),
    // mas Civil concentra os erros recentes (a prioridade escolhe Civil).
    const sessions = [
      { id: 's1', disc: 'Direito Civil', date: '2026-09-21', ts: Date.parse('2026-09-21T12:00:00Z'), min: 60, questoes: 10, acertos: 7, erradas: 3 },
      { id: 's2', disc: 'Direito Penal', date: '2026-09-20', ts: Date.parse('2026-09-20T12:00:00Z'), min: 60, questoes: 10, acertos: 4, erradas: 6 }
    ];
    app.setState({ edital: est.edital.map((d, i) => ({ id: 'e' + i, disc: d.disc, peso: 1, topics: [] })),
      errors: est.errors.map((e, i) => ({ id: 'x' + i, disc: e.disc, ts: e.ts, enunciado: 'q' + i })),
      reviews: [], sessions, blocks: [] });
    window.__catedraGoView('inicio'); await w(900);
    const ler = () => ({
      foco: app.renderVals().focoSugestao||'',
      fraca: app._prioridade()[0] && app._prioridade()[0].disc
    });
    const antes = ler();
    app.setState({ orient: { ...(app.state.orient || {}), pErros: 0, pDesemp: 10 } }); await w(600);
    const depois = ler();
    return { antes, depois };
  }, estado);
  const mesma = (x) => !!x.fraca && x.foco.includes(x.fraca.replace('Direito ', ''));
  ok(mesma(m.antes), 'RÉGUA/única o Foco sugerido aponta o primeiro de "Onde estou fraca" (' + m.antes.fraca + ' | ' + m.antes.foco + ')');
  ok(mesma(m.depois), 'RÉGUA/única depois de mexer nos controles, os dois continuam juntos (' + m.depois.fraca + ' | ' + m.depois.foco + ')');
  ok(m.antes.fraca !== m.depois.fraca, 'RÉGUA/única os controles de Ajustes continuam mudando a régua de prioridade (' + m.antes.fraca + ' → ' + m.depois.fraca + ')');
}
