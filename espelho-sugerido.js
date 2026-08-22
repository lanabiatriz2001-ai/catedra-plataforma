/* ==========================================================================
   espelho-sugerido.js — o miolo do "espelho sugerido pelo Cátedra" (C3).

   POR QUE EXISTE, E SEPARADO: quando a banca não publicou espelho de correção,
   o Cátedra pode SUGERIR um, gerado por IA a partir do enunciado. Isso só é
   aceitável sob duas regras duras, e ambas moram aqui, puras e testáveis:

     1. QUESITO SEM FUNDAMENTO NÃO ENTRA. O fundamento (artigo, súmula, tema
        repetitivo) é o que permite conferir no LEGIS/JURIS se a IA acertou.
        Sem ele, o quesito é opinião com cara de gabarito.
     2. O TEXTO SE DECLARA. Toda saída começa dizendo que é sugerida, não
        oficial, e que a banca não publicou espelho. O selo não é decoração:
        é o que sustenta a promessa de honestidade do C1.

   Publica window.CT_ESPELHO_SUGERIDO = { montarPrompt, interpretar, texto }.
   ========================================================================== */
(function () {
  var MIN_QUESITO = 12;      // frase curta demais não é quesito
  var MIN_FUNDAMENTO = 6;    // "art. 5" já é conferível; "" e "n/a" não são
  var RE_VAZIO = /^(n\/?a|nao|não|nenhum|sem fundamento|-{1,}|\.{1,})$/i;

  function montarPrompt(prova) {
    var enun = String((prova && prova.enunciado) || '').slice(0, 6000);
    var ficha = [prova && prova.orgao, prova && prova.ano, prova && prova.banca,
                 prova && prova.disciplina].filter(Boolean).join(' · ');
    return 'Você é examinador de concurso público brasileiro. A banca NÃO publicou o espelho '
      + 'de correção desta prova discursiva. Monte um espelho de correção plausível.\n\n'
      + (ficha ? ('PROVA: ' + ficha + '\n') : '')
      + 'ENUNCIADO:\n' + enun + '\n\n'
      + 'Responda SOMENTE com JSON, sem texto ao redor, no formato:\n'
      + '{"total": <pontuação total sugerida, número>, "quesitos": [{"quesito": "<o que se exige, '
      + 'em uma frase>", "pontos": <número>, "fundamento": "<dispositivo legal, súmula ou julgado '
      + 'que sustenta o quesito>"}]}\n\n'
      + 'REGRAS: entre 3 e 10 quesitos; a soma dos pontos deve dar o total; TODO quesito precisa '
      + 'de fundamento concreto (artigo de lei, súmula ou tema repetitivo) — se não souber o '
      + 'fundamento, NÃO crie o quesito; nada de fundamento inventado.';
  }

  /** Lê a resposta da IA e devolve o espelho sugerido, ou null se não sobrou nada usável. */
  function interpretar(objeto, id) {
    var qs = ((objeto && objeto.quesitos) || []).map(function (q) {
      return {
        quesito: String((q && q.quesito) || '').trim(),
        pontos: (q && q.pontos != null && isFinite(+q.pontos)) ? +q.pontos : null,
        fundamento: String((q && q.fundamento) || '').trim(),
      };
    }).filter(function (q) {
      // a regra dura: sem fundamento conferível, o quesito é descartado
      return q.quesito.length >= MIN_QUESITO
        && q.fundamento.length >= MIN_FUNDAMENTO
        && !RE_VAZIO.test(q.fundamento);
    });
    if (qs.length < 2) return null;
    var soma = qs.reduce(function (a, q) { return a + (q.pontos || 0); }, 0);
    var total = (objeto && objeto.total != null && isFinite(+objeto.total)) ? +objeto.total : (soma || null);
    return { id: id, up: Date.now(), ts: Date.now(), quesitos: qs, total: total };
  }

  var CABECALHO = 'ESPELHO SUGERIDO PELO CÁTEDRA — NÃO OFICIAL';

  function texto(sug) {
    if (!sug || !sug.quesitos || !sug.quesitos.length) return '';
    var linhas = sug.quesitos.map(function (q, i) {
      return (i + 1) + '. ' + q.quesito
        + (q.pontos != null ? ('  (' + q.pontos + ' ponto' + (q.pontos === 1 ? '' : 's') + ')') : '')
        + '\n   Fundamento: ' + q.fundamento;
    });
    return CABECALHO
      + (sug.total != null ? ('  ·  total sugerido ' + sug.total) : '')
      + '\nA banca não publicou espelho desta prova. Os quesitos abaixo foram gerados por IA a '
      + 'partir do enunciado; confira cada fundamento antes de confiar na nota.\n\n'
      + linhas.join('\n');
  }

  window.CT_ESPELHO_SUGERIDO = { montarPrompt: montarPrompt, interpretar: interpretar,
    texto: texto, CABECALHO: CABECALHO };
})();
