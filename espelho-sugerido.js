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

   Publica window.CT_ESPELHO_SUGERIDO = { montarPrompt, triagem, interpretar, texto,
     referencias, CABECALHO }.
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

  function limpo(q) {
    return {
      quesito: String((q && q.quesito) || '').trim(),
      pontos: (q && q.pontos != null && isFinite(+q.pontos)) ? +q.pontos : null,
      fundamento: String((q && q.fundamento) || '').trim(),
    };
  }
  function temFundamento(q) {
    return q.fundamento.length >= MIN_FUNDAMENTO && !RE_VAZIO.test(q.fundamento);
  }
  /** Separa o que a IA devolveu: quesitos aceitos, os descartados por falta de fundamento
      (contados, para a tela dizer quantos ficaram de fora) e os que nem eram quesito. */
  function triagem(objeto) {
    var vindos = ((objeto && objeto.quesitos) || []).map(limpo);
    var aceitos = [], semFundamento = 0, curtos = 0;
    vindos.forEach(function (q) {
      if (q.quesito.length < MIN_QUESITO) { curtos++; return; }
      // a regra dura: sem fundamento conferível, o quesito é descartado
      if (!temFundamento(q)) { semFundamento++; return; }
      aceitos.push(q);
    });
    return { recebidos: vindos.length, aceitos: aceitos, descartados: semFundamento, curtos: curtos };
  }
  /** Lê a resposta da IA e devolve o espelho sugerido, ou null se não sobrou nada usável. */
  function interpretar(objeto, id) {
    var t = triagem(objeto), qs = t.aceitos;
    if (qs.length < 2) return null;
    var soma = qs.reduce(function (a, q) { return a + (q.pontos || 0); }, 0);
    var total = (objeto && objeto.total != null && isFinite(+objeto.total)) ? +objeto.total : (soma || null);
    return { id: id, up: Date.now(), ts: Date.now(), quesitos: qs, total: total,
      recebidos: t.recebidos, descartados: t.descartados };
  }

  /* ---- referências do fundamento, no formato que o host abre no LEGIS ou no JURIS ----
     "art. 304, § 5º, do CPC", "CPC, art. 304", "Lei 8.112/1990, art. 98", "Súmula 7 do
     STJ", "Tema 698 do STF". Cada citação reconhecida vira {tipo, ref}: 'lei' já no molde
     "Art. N … do SIGLA" e 'juris' como "Súmula N …"/"Tema N". O que não for reconhecido não
     vira link: o fundamento continua inteiro no texto, para ser conferido à mão. */
  var SIGLAS = 'CF(?:/88)?|CRFB(?:/88)?|CC|CPC|CPP|CP|CDC|CTN|CLT|ECA|LEP|LIA';
  var RE_JURIS = /\b(S[úu]mula(?:\s+Vinculante)?\s+(?:n[º°.]?\s*)?\d+(?:\s+do\s+(?:STF|STJ|TST|TSE))?|Tema\s+(?:n[º°.]?\s*)?\d+(?:\s+d[ao]\s+(?:STF|STJ|repercuss[ãa]o geral))?)/gi;
  var RE_ART_DEPOIS = new RegExp('\\b(arts?\\.?\\s*\\d[\\d.]*(?:-[A-Z])?[ºª°o]?(?:\\s*(?:,|e)\\s*\\d[\\d.]*(?:-[A-Z])?[ºª°o]?(?![\\d/]))*)((?:\\s*,?\\s*(?:§|par[áa]grafo|par\\.|inc(?:iso)?\\.?|[IVXLC]+\\b|al[íi]nea|[a-z]\\))[^,;]*)*)\\s*,?\\s+d[aeo]s?\\s+(' + SIGLAS + '|Lei(?:\\s+Complementar)?\\s+(?:n[º°.]?\\s*)?[\\d.]+/\\d{2,4}|Constitui[çc][ãa]o(?: Federal)?|C[óo]digo (?:Civil|Penal|de Processo Civil|de Processo Penal))', 'gi');
  var RE_ART_ANTES = new RegExp('\\b(' + SIGLAS + '|Lei(?:\\s+Complementar)?\\s+(?:n[º°.]?\\s*)?[\\d.]+/\\d{2,4})\\s*,?\\s*(arts?\\.?\\s*\\d[\\d.]*(?:-[A-Z])?[ºª°o]?(?:\\s*(?:,|e)\\s*\\d[\\d.]*(?:-[A-Z])?[ºª°o]?(?![\\d/]))*)((?:\\s*,?\\s*(?:§|par[áa]grafo|par\\.|inc(?:iso)?\\.?|[IVXLC]+\\b|al[íi]nea|[a-z]\\))[^,;]*)*)', 'gi');
  function sigla(lei) {
    var l = String(lei).replace(/\s+/g, ' ').trim();
    if (/^(CF|CRFB)/i.test(l) || /^Constitui/i.test(l)) return 'CF';
    if (/^C[óo]digo Civil$/i.test(l)) return 'CC';
    if (/^C[óo]digo Penal$/i.test(l)) return 'CP';
    if (/^C[óo]digo de Processo Civil$/i.test(l)) return 'CPC';
    if (/^C[óo]digo de Processo Penal$/i.test(l)) return 'CPP';
    return l.replace(/^Lei(\s+Complementar)?\s+n[º°.]?\s*/i, 'Lei$1 ');
  }
  function artigo(art, resto, lei) {
    var a = String(art).replace(/^arts?\.?\s*/i, 'Art. ').replace(/o$/, 'º');
    var r = String(resto || '').replace(/\s+/g, ' ').replace(/\s*,\s*$/, '').trim();
    var s = sigla(lei), da = /^(Lei|CF)/.test(s) ? ' da ' : ' do ';
    // "arts. 186 e 927": uma citação por artigo (cada um abre no seu dispositivo)
    var nums = a.replace(/^Art\. /, '').split(/\s*(?:,|\be\b)\s*/).filter(Boolean);
    if (nums.length > 1) return nums.map(function (n) { return 'Art. ' + n.replace(/o$/, 'º') + da + s; });
    return [a + (r ? (r[0] === ',' ? r : ', ' + r) : '') + da + s];
  }
  function referencias(fundamento) {
    var f = String(fundamento || ''), out = [], vistos = {};
    var poe = function (tipo, ref) { var k = ref.toLowerCase(); if (vistos[k]) return; vistos[k] = 1; out.push({ tipo: tipo, ref: ref }); };
    var m;
    RE_ART_DEPOIS.lastIndex = 0; while ((m = RE_ART_DEPOIS.exec(f))) artigo(m[1], m[2], m[3]).forEach(function (r) { poe('lei', r); });
    RE_ART_ANTES.lastIndex = 0; while ((m = RE_ART_ANTES.exec(f))) artigo(m[2], m[3], m[1]).forEach(function (r) { poe('lei', r); });
    RE_JURIS.lastIndex = 0; while ((m = RE_JURIS.exec(f))) poe('juris', m[1].replace(/\s+/g, ' ').replace(/^s[úu]mula/i, 'Súmula').replace(/^tema/i, 'Tema'));
    return out;
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

  window.CT_ESPELHO_SUGERIDO = { montarPrompt: montarPrompt, triagem: triagem, interpretar: interpretar,
    texto: texto, referencias: referencias, CABECALHO: CABECALHO };
})();
