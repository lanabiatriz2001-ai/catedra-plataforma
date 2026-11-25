/* QUESITOS PERDIDOS — "o que você repete" (25/11/2026) — quesitos-perdidos.js
   Miolo puro, sem DOM e sem rede: lê o redHist (uma entrada por peça corrigida, com a nota
   de cada quesito) e responde três perguntas:
     1. o que a pessoa perde de novo, por disciplina e tema, entre a primeira e a última peça;
     2. como o quesito perdido vira card do Anki (frente[TAB]verso);
     3. como o quesito perdido entra no caderno de erros, pelo coletor que já existe.

   Regras duras (as mesmas do corretor):
     - a exigência do quesito é LITERAL: vem do espelho do banco ou do título gravado na
       correção; este arquivo não resume, não reescreve e não completa texto de banca;
     - a conta é feita aqui, com os números gravados; nada é estimado;
     - quando só existe o título abreviado (registro antigo, sem prova do banco), o card
       diz que o texto está abreviado em vez de fingir que é o texto integral.

   Publica window.CT_QUESITOS_PERDIDOS = { LIMIAR_PERDIDO, perdido, temaDe, oQueRepete,
     cardAnki, arquivoAnki, paraCaderno }. */
(function () {
  'use strict';

  /* Abaixo desta fração dos pontos do quesito, ele conta como PERDIDO. Meio ponto para
     cima é "atendido em parte": aparece na curva de evolução, não nesta tela. */
  var LIMIAR_PERDIDO = 0.5;
  var SEM_DISC = 'Sem disciplina';

  function txt(x) { return String(x == null ? '' : x); }
  function achatar(t) {
    var x = txt(t);
    try { x = x.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (_) {}
    return x.toLowerCase().replace(/\s+/g, ' ').trim();
  }
  function num(x) { return (Math.round((+x || 0) * 100) / 100).toFixed(2).replace('.', ','); }
  function escHtml(t) { return txt(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function umaLinha(t) { return txt(t).replace(/\t/g, ' ').replace(/\r?\n/g, '<br>').trim(); }

  function fracao(nota, max) {
    var m = +max; if (!(m > 0)) return null;
    return Math.max(0, Math.min(1, (+nota || 0) / m));
  }
  /** Quesito perdido: fez menos que LIMIAR_PERDIDO dos pontos. Sem máximo, não há como dizer. */
  function perdido(q) {
    var f = q ? fracao(q.nota, q.max) : null;
    return f != null && f < LIMIAR_PERDIDO;
  }

  /* ---- ligação com o banco de espelhos ---- */
  function indexar(banco) {
    var porId = {}, lista = Array.isArray(banco) ? banco : [];
    for (var i = 0; i < lista.length; i++) if (lista[i] && lista[i].id) porId[lista[i].id] = lista[i];
    return { porId: porId, lista: lista };
  }
  /** Prova do banco de uma peça: pelo id gravado; nos registros antigos, pelo começo do
      enunciado (que é o título da peça) — e só quando UMA prova casa, nunca no palpite. */
  function provaDe(reg, idx) {
    var alvo = achatar(reg.prova);
    var comeca = function (p) { return alvo.length >= 30 && !!p.enunciado && achatar(txt(p.enunciado).slice(0, 400)).indexOf(alvo) === 0; };
    // o id gravado só vale se a peça confere com a prova (enunciado ou algum quesito):
    // o id da última prova aberta pode ter ficado para trás numa questão digitada à mão
    var pid = reg.provaId && idx.porId[reg.provaId];
    if (pid && (comeca(pid) || reg.quesitos.some(function (q) { return !!quesitoDoEspelho(pid, q); }))) return pid;
    if (alvo.length < 30) return null;
    var achada = null;
    for (var i = 0; i < idx.lista.length; i++) {
      var p = idx.lista[i];
      if (!p || !p.enunciado) continue;
      if (comeca(p)) { if (achada) return null; achada = p; }
    }
    return achada;
  }
  /** Quesito do espelho que corresponde ao gravado: mesmo índice se o texto confere; senão,
      o único do espelho que começa pelo título. Sem conferir o texto, não liga. */
  function quesitoDoEspelho(prova, q) {
    var esp = prova && Array.isArray(prova.espelho) ? prova.espelho : [];
    var t = achatar(q.titulo).slice(0, 100);
    if (!esp.length || t.length < 12) return null;
    var confere = function (e) { return !!e && achatar(e.quesito).indexOf(t) === 0; };
    if (confere(esp[q.i])) return esp[q.i];
    var um = null;
    for (var i = 0; i < esp.length; i++) if (confere(esp[i])) { if (um) return null; um = esp[i]; }
    return um;
  }

  /** Tema de agrupamento: o primeiro dispositivo do quesito, reduzido a diploma + artigo
      ("CP art. 69"); sem dispositivo, o próprio título do quesito. */
  function temaDe(item) {
    var d = item && Array.isArray(item.dispositivos) ? item.dispositivos : [];
    for (var i = 0; i < d.length; i++) {
      var s = txt(d[i]).trim(); if (!s) continue;
      var m = s.match(/^(.*?\bart\.\s*\d[\d.]*[oº°]?(?:-[A-Z])?)/i);
      return (m ? m[1] : s).replace(/,\s*$/, '').replace(/\s+/g, ' ').trim();
    }
    // a 2ª fase grava "Q1 — tema": o rótulo da questão não faz parte do tema
    return txt(item && item.titulo).replace(/\s+/g, ' ').trim().replace(/^[^—]{1,14} — /, '').slice(0, 90) || 'Quesito';
  }

  function rotuloProva(reg, prova) {
    if (prova) {
      var partes = [prova.orgao, prova.ano].filter(Boolean).join(' ');
      if (partes) return partes + (prova.banca ? ' (' + prova.banca + ')' : '');
    }
    return txt(reg.prova).replace(/\s+/g, ' ').trim().slice(0, 80) || 'Peça sem título';
  }

  /** Um item por quesito de cada peça, já com o que o banco sabe dele. */
  function itensDe(redHist, banco) {
    var idx = indexar(banco);
    var pecas = (Array.isArray(redHist) ? redHist : []).filter(function (r) {
      return r && Array.isArray(r.quesitos) && r.quesitos.length;
    }).slice().sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
    var itens = [];
    pecas.forEach(function (reg, n) {
      var prova = provaDe(reg, idx);
      reg.quesitos.forEach(function (q) {
        if (!q || fracao(q.nota, q.max) == null) return;
        var e = quesitoDoEspelho(prova, q);
        var integral = !!e, titulo = txt(q.titulo).trim();
        var item = {
          peca: n, pecaId: reg.id, ts: reg.ts || 0, quando: txt(reg.quando),
          origem: reg.origem === 'segunda-fase' ? 'segunda-fase' : 'redacao',
          provaId: prova ? prova.id : txt(reg.provaId), prova: rotuloProva(reg, prova),
          temaProva: prova ? txt(prova.tema) : '', aproximada: !!reg.aproximada,
          i: q.i, titulo: titulo,
          exigencia: integral ? txt(e.quesito).trim() : titulo,
          abreviada: !integral && titulo.length >= 118,
          dispositivos: (integral && Array.isArray(e.dispositivos)) ? e.dispositivos.filter(Boolean).map(txt) : [],
          disc: txt(q.disc || reg.disc).trim() || (integral && e.disciplina ? txt(e.disciplina) : '') || SEM_DISC,
          nota: +q.nota || 0, max: +q.max, fracao: fracao(q.nota, q.max)
        };
        item.perdido = perdido(item);
        item.tema = temaDe(item);
        itens.push(item);
      });
    });
    return { itens: itens, pecas: pecas.length };
  }

  /**
   * O que a pessoa repete. Peça = uma correção gravada (refazer a mesma prova conta de novo).
   * Tema "cobrado" numa peça = a peça tem quesito daquele tema; "perdido" = a soma dos
   * quesitos do tema naquela peça ficou abaixo do limiar.
   * Taxa de repetição: dos temas perdidos na PRIMEIRA peça em que foram cobrados e que
   * voltaram a ser cobrados depois, a parte perdida de novo na ÚLTIMA.
   * @return {pecas, perdidos, taxa:{base,repetidos,pct}, disciplinas:[{disc,perdas,temas:[…]}]}
   */
  function oQueRepete(redHist, banco) {
    var lido = itensDe(redHist, banco), grupos = {}, ordem = [];
    lido.itens.forEach(function (it) {
      var k = achatar(it.disc) + '\u0001' + achatar(it.tema);
      if (!grupos[k]) { grupos[k] = { chave: k, disc: it.disc, tema: it.tema, porPeca: {}, pecas: [] }; ordem.push(k); }
      var g = grupos[k];
      if (!g.porPeca[it.peca]) { g.porPeca[it.peca] = { peca: it.peca, nota: 0, max: 0, itens: [] }; g.pecas.push(it.peca); }
      var c = g.porPeca[it.peca]; c.nota += it.nota; c.max += it.max; c.itens.push(it);
    });
    var temas = [], base = 0, repetidos = 0;
    ordem.forEach(function (k) {
      var g = grupos[k];
      var linha = g.pecas.slice().sort(function (a, b) { return a - b; }).map(function (n) {
        var c = g.porPeca[n], f = fracao(c.nota, c.max), it0 = c.itens[0];
        return { peca: n, quando: it0.quando, prova: it0.prova, nota: c.nota, max: c.max,
          pct: Math.round(f * 100), perdido: f < LIMIAR_PERDIDO, itens: c.itens };
      });
      var perdas = linha.filter(function (c) { return c.perdido; });
      if (!perdas.length) return;
      var primeira = linha[0], ultima = linha[linha.length - 1], voltou = linha.length > 1;
      var repetiu = voltou && primeira.perdido && ultima.perdido;
      if (voltou && primeira.perdido) { base++; if (repetiu) repetidos++; }
      // o quesito que representa o tema no card e no caderno: o perdido mais recente
      var ultimaPerda = perdas[perdas.length - 1];
      var rep = ultimaPerda.itens.filter(function (it) { return it.perdido; })[0] || ultimaPerda.itens[0];
      temas.push({ chave: k, disc: g.disc, tema: g.tema, cobrado: linha.length, perdas: perdas.length,
        primeira: primeira, ultima: ultima, repetiu: repetiu,
        // o erro ao longo das peças: fração dos pontos do tema que ficou para trás em cada uma
        seriePerda: linha.map(function (c) { return 100 - c.pct; }),
        superou: voltou && primeira.perdido && !ultima.perdido, quesito: rep });
    });
    var porDisc = {}, discs = [];
    temas.forEach(function (t) {
      if (!porDisc[t.disc]) { porDisc[t.disc] = { disc: t.disc, perdas: 0, repetidos: 0, temas: [] }; discs.push(porDisc[t.disc]); }
      porDisc[t.disc].temas.push(t); porDisc[t.disc].perdas += t.perdas; if (t.repetiu) porDisc[t.disc].repetidos++;
    });
    discs.forEach(function (d) {
      d.temas.sort(function (a, b) { return (b.repetiu - a.repetiu) || (b.perdas - a.perdas) || (b.ultima.peca - a.ultima.peca); });
    });
    discs.sort(function (a, b) { return (b.repetidos - a.repetidos) || (b.perdas - a.perdas) || a.disc.localeCompare(b.disc); });
    return { pecas: lido.pecas, perdidos: temas.length,
      taxa: { base: base, repetidos: repetidos, pct: base ? Math.round(repetidos / base * 100) : null },
      disciplinas: discs };
  }

  function alerta(t) {
    var q = t.quesito;
    var s = 'perdido em ' + t.perdas + ' de ' + t.cobrado + (t.cobrado > 1 ? ' peças' : ' peça') +
      '; na última, ' + num(q.nota) + ' de ' + num(q.max);
    if (t.repetiu) s += ' — já tinha sido perdido na primeira vez que caiu';
    return s + '.';
  }
  /** Card no molde aulão. Frente: chamada e resumo. Verso: exigência literal da banca,
      pontuação, dispositivos e alerta de prova. */
  function cardAnki(t) {
    var q = t.quesito;
    var frente = '<b>' + escHtml(t.disc + ' · ' + t.tema) + '</b><br>' +
      escHtml('Quesito de ' + q.prova + (q.temaProva ? ' — ' + q.temaProva : '')) + '<br>' +
      'O que a banca exige neste quesito?';
    var verso = '<b>Exigência da banca:</b> ' + escHtml(q.exigencia) +
      (q.abreviada ? ' <i>(título abreviado pelo app; o texto integral está no espelho da prova)</i>' : '') +
      '<br><b>Pontuação:</b> ' + num(q.max) + (q.aproximada ? ' (espelho sugerido, não oficial)' : '') +
      '<br><b>Dispositivos:</b> ' + (q.dispositivos.length ? escHtml(q.dispositivos.join('; ')) : 'o espelho não indica') +
      '<br><b>Alerta de prova:</b> ' + escHtml(alerta(t));
    return { frente: umaLinha(frente), verso: umaLinha(verso) };
  }
  /** Arquivo de importação do Anki: uma linha por card, frente[TAB]verso. */
  function arquivoAnki(temas) {
    var linhas = (Array.isArray(temas) ? temas : []).map(function (t) { var c = cardAnki(t); return c.frente + '\t' + c.verso; });
    return '#separator:tab\n#html:true\n' + linhas.join('\n') + (linhas.length ? '\n' : '');
  }
  /** O mesmo quesito no formato do coletor do caderno de erros (_colherErros). */
  function paraCaderno(t) {
    var q = t.quesito;
    return {
      enunciado: ('Quesito perdido (' + q.prova + '): ' + q.exigencia).slice(0, 1200),
      gabarito: (q.exigencia + (q.dispositivos.length ? '\nDispositivos: ' + q.dispositivos.join('; ') : '')).slice(0, 1200),
      disc: t.disc === SEM_DISC ? '' : t.disc, topico: t.tema.slice(0, 120),
      lesson: ('Quesito ' + alerta(t)).slice(0, 600),
      extra: q.provaId ? { ref: 'discursiva·' + q.provaId + '·' + (q.i + 1) } : {}
    };
  }
  /** Todos os temas perdidos, na ordem da tela. */
  function temasDe(r) {
    var out = []; (r && r.disciplinas || []).forEach(function (d) { d.temas.forEach(function (t) { out.push(t); }); });
    return out;
  }

  window.CT_QUESITOS_PERDIDOS = { LIMIAR_PERDIDO: LIMIAR_PERDIDO, perdido: perdido, temaDe: temaDe,
    oQueRepete: oQueRepete, temasDe: temasDe, cardAnki: cardAnki, arquivoAnki: arquivoAnki, paraCaderno: paraCaderno };
})();
