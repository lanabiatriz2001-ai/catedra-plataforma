/* prioridade-calc.js — "onde estou fraca": ordena as disciplinas do edital por
 * prioridade de estudo, mostrando o porquê.
 *
 * Função PURA e sem dependência do app: recebe o estado (o que o localStorage já guarda)
 * e devolve a lista ordenada. Fica em arquivo próprio porque é testada fora do app
 * (tests/run.mjs) — e porque a fórmula tem de ser legível para quem estuda, não só para
 * quem programa.
 *
 * NÃO tem cache: o cálculo é barato (centenas de itens) e cache silencioso desatualizado
 * é pior que recalcular a cada render.
 */
(function (w) {
  'use strict';

  /* Pesos dos fatores. Um lugar só, comentado — mexer aqui muda a régua inteira.
     A soma é 1.0. A ordem reflete o que mais derruba candidato: errar e não revisar. */
  var PESOS = {
    erros: 0.30,        // erros recentes no caderno (últimos 30 dias)
    revisoes: 0.25,     // revisões vencidas/atrasadas
    esfriando: 0.20,    // dias sem estudar a disciplina
    simulado: 0.15,     // desempenho líquido em questões
    incidencia: 0.10    // peso no edital × incidência do diploma
  };
  var JANELA_ERROS = 30;        // dias
  var ESFRIA_DIAS = 21;         // sem estudar por 21 dias = fator no máximo
  var MIN_QUESTOES = 6;         // abaixo disso, o desempenho não é sinal (amostra pequena)

  function norm(s) {
    return String(s == null ? '' : s).trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function arr(x) { return Array.isArray(x) ? x : []; }

  /**
   * @param estado {edital, errors, reviews, sessions, sim, incidencia, hoje}
   *   - edital:   [{disc, peso, questoes, topics}]
   *   - errors:   [{disc, ts}]
   *   - reviews:  [{disc, dueDate}]  (vencida = dueDate <= hoje)
   *   - sessions: [{disc, date, questoes, acertos, erradas}]
   *   - incidencia: {disciplinaNormalizada: 0..1}  (opcional)
   *   - hoje:     'YYYY-MM-DD' (opcional; default = hoje do sistema)
   * @returns [{disc, nota, fatores:[{chave,rotulo,valor,peso,texto}], motivos:[texto], …}]
   */
  function prioridadeDisciplinas(estado) {
    var e = estado || {};
    var hojeStr = e.hoje || new Date().toISOString().slice(0, 10);
    var hojeMs = Date.parse(hojeStr + 'T00:00:00Z');
    var edital = arr(e.edital).filter(function (d) { return d && String(d.disc || '').trim(); });
    if (!edital.length) return [];

    var erros = arr(e.errors), reviews = arr(e.reviews), sessions = arr(e.sessions);
    var inc = e.incidencia || {};

    // ---- agregados por disciplina normalizada
    var porDisc = {};
    edital.forEach(function (d) {
      porDisc[norm(d.disc)] = {
        disc: String(d.disc).trim(),
        peso: (d.peso != null && d.peso !== '' && isFinite(+d.peso) && +d.peso > 0) ? +d.peso : 1,
        erros30: 0, revVencidas: 0, ultimaSessao: null, q: 0, a: 0, er: 0
      };
    });
    var achar = function (nome) { return porDisc[norm(nome)] || null; };

    var limite = hojeMs - JANELA_ERROS * 864e5;
    erros.forEach(function (x) {
      var o = achar(x && x.disc); if (!o) return;
      var ts = +(x.ts || 0);
      if (ts >= limite) o.erros30++;
    });
    reviews.forEach(function (r) {
      var o = achar(r && r.disc); if (!o) return;
      var d = String((r && r.dueDate) || '');
      if (d && d <= hojeStr) o.revVencidas++;
    });
    sessions.forEach(function (s) {
      var o = achar(s && s.disc); if (!o) return;
      var dt = String((s && s.date) || '');
      if (dt && (!o.ultimaSessao || dt > o.ultimaSessao)) o.ultimaSessao = dt;
      o.q += +(s.questoes || 0); o.a += +(s.acertos || 0); o.er += +(s.erradas || 0);
    });

    // ---- normalização: cada fator vira 0..1 comparando com o pior caso do conjunto
    var lista = Object.keys(porDisc).map(function (k) { return porDisc[k]; });
    var maxErros = Math.max.apply(null, [1].concat(lista.map(function (o) { return o.erros30; })));
    var maxRev = Math.max.apply(null, [1].concat(lista.map(function (o) { return o.revVencidas; })));
    var maxPeso = Math.max.apply(null, [1].concat(lista.map(function (o) { return o.peso; })));

    var saida = lista.map(function (o) {
      var fErros = clamp01(o.erros30 / maxErros);
      var fRev = clamp01(o.revVencidas / maxRev);

      var diasSem = o.ultimaSessao
        ? Math.max(0, Math.round((hojeMs - Date.parse(o.ultimaSessao + 'T00:00:00Z')) / 864e5))
        : null;
      // nunca estudada conta como o máximo: é exatamente o buraco que não se enxerga
      var fEsfria = diasSem == null ? 1 : clamp01(diasSem / ESFRIA_DIAS);

      // desempenho: só vira sinal com amostra mínima; 100% líquido = 0 de prioridade
      var liqPct = o.q >= MIN_QUESTOES ? Math.round((o.a - o.er) / o.q * 100) : null;
      var fSim = liqPct == null ? 0.5 : clamp01((100 - liqPct) / 100);

      var fInc = clamp01(0.5 * (o.peso / maxPeso) + 0.5 * (+inc[norm(o.disc)] || 0));

      var fatores = [
        { chave: 'erros', rotulo: 'erros recentes', valor: fErros, peso: PESOS.erros,
          texto: o.erros30 ? (o.erros30 + ' erro' + (o.erros30 > 1 ? 's' : '') + ' nos últimos ' + JANELA_ERROS + ' dias') : 'sem erros recentes' },
        { chave: 'revisoes', rotulo: 'revisões vencidas', valor: fRev, peso: PESOS.revisoes,
          texto: o.revVencidas ? (o.revVencidas + ' revisão' + (o.revVencidas > 1 ? 'es' : '') + ' vencida' + (o.revVencidas > 1 ? 's' : '')) : 'revisões em dia' },
        { chave: 'esfriando', rotulo: 'tempo sem estudar', valor: fEsfria, peso: PESOS.esfriando,
          texto: diasSem == null ? 'nunca estudada por aqui' : (diasSem === 0 ? 'estudada hoje' : ('há ' + diasSem + ' dia' + (diasSem > 1 ? 's' : '') + ' sem estudar')) },
        { chave: 'simulado', rotulo: 'desempenho', valor: fSim, peso: PESOS.simulado,
          texto: liqPct == null ? 'poucas questões para medir' : (liqPct + '% de líquido em ' + o.q + ' questões') },
        { chave: 'incidencia', rotulo: 'peso na prova', valor: fInc, peso: PESOS.incidencia,
          texto: 'peso ' + o.peso + ' no edital' }
      ];

      var nota = Math.round(fatores.reduce(function (a, f) { return a + f.valor * f.peso; }, 0) * 100);
      // os fatores que de fato empurraram esta disciplina para cima
      var dominantes = fatores.slice().sort(function (a, b) { return (b.valor * b.peso) - (a.valor * a.peso); })
        .filter(function (f) { return f.valor > 0.15; }).slice(0, 3);

      return {
        disc: o.disc, nota: nota, fatores: fatores,
        motivos: dominantes.map(function (f) { return f.texto; }),
        erros30: o.erros30, revVencidas: o.revVencidas, diasSem: diasSem,
        liqPct: liqPct, questoes: o.q, peso: o.peso,
        semDados: (o.erros30 === 0 && o.revVencidas === 0 && o.q === 0 && diasSem == null)
      };
    });

    return saida.sort(function (a, b) { return b.nota - a.nota || a.disc.localeCompare(b.disc); });
  }

  var api = { prioridadeDisciplinas: prioridadeDisciplinas, PESOS: PESOS,
              JANELA_ERROS: JANELA_ERROS, ESFRIA_DIAS: ESFRIA_DIAS, MIN_QUESTOES: MIN_QUESTOES };
  w.CT_PRIORIDADE_CALC = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
