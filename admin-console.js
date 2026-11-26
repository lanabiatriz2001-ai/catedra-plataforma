/* ==========================================================================
   admin-console.js — o miolo puro do console de administração (25/11/2026).

   POR QUE EXISTE, E SEPARADO: o console só formata o que o servidor já
   filtrou (as RPCs admin_* checam is_admin() no banco). As contas que ele faz
   moram aqui, testáveis sem navegador (tests/admin-visao-feedback.mjs):

     1. PANORAMA. Os seis números da visão geral num cartão só: contas criadas
        (e quantas nos últimos 7 dias), ativas em 7 e em 30 dias, inscritos na
        lista de espera, feedbacks NÃO LIDOS (lido=false, não "em aberto") e
        erros das últimas 24 h. O que não deu para contar vira "indisponível"
        com o motivo curto — nunca um 0 que parece dado.
     2. RESPOSTA POR E-MAIL. O endereço mailto: com assunto e corpo iniciais, e
        a nota interna que guarda a resposta com data e hora locais, SEM apagar
        a nota anterior. O status sai de "novo" e nunca rebaixa um "resolvido".

   Publica window.CT_ADMIN = { panorama, listaEspera, motivoFalha, novasEm,
   naoLidos, carimbo, dataCurta, mailtoResposta, notaComResposta, acrescentarNota,
   statusAposResposta, emailValido, LIMITES }.
   ========================================================================== */
(function () {
  // os mesmos tetos do SQL: admin_feedback() e admin_erros_cliente() devolvem no máximo 200 linhas.
  // admin_lista_espera() não tem LIMIT, mas o PostgREST do Supabase corta a resposta em 1000 linhas
  // por padrão (max_rows; não conferido no banco vivo): no teto, o cartão diz "1000+", não 1000.
  var LIMITES = { feedback: 200, erros: 200, espera: 1000, citacao: 400 };
  var DIA = 86400000;

  function dois(n) { return (n < 10 ? '0' : '') + n; }
  function comoData(d) {
    var x = d instanceof Date ? d : new Date(d == null ? NaN : d);
    return isNaN(x.getTime()) ? null : x;
  }
  // Hora LOCAL, montada à mão: toISOString daria o dia seguinte entre 20h e 24h em UTC−4.
  function dataCurta(d) {
    var x = comoData(d); if (!x) return '';
    return dois(x.getDate()) + '/' + dois(x.getMonth() + 1) + '/' + x.getFullYear();
  }
  function carimbo(d) {
    var x = comoData(d); if (!x) return '';
    return dataCurta(x) + ' ' + dois(x.getHours()) + ':' + dois(x.getMinutes());
  }

  // supabase-js NÃO rejeita a promise em erro: o motivo vem em res.error (ou na exceção
  // de rede). Curto, para caber debaixo do número.
  function motivoFalha(err) {
    var cod = String((err && err.code) || '');
    var m = String((err && (err.message || err.details || err.hint)) || err || '');
    if (cod === 'PGRST202' || cod === '42883' || /could not find the function|function .* does not exist|schema cache/i.test(m)) return 'função ausente no banco';
    if (cod === '42501' || /acesso_negado|permission denied/i.test(m)) return 'sem permissão';
    if (/failed to fetch|load failed|networkerror|network request failed|timeout|offline/i.test(m)) return 'sem conexão';
    return 'falha ao consultar';
  }

  // Resultado de admin_lista_espera ({data, error}) → { n, motivo }. n === null: não deu para contar.
  function listaEspera(res) {
    if (!res) return { n: null, motivo: 'sem resposta' };
    if (res.error) return { n: null, motivo: motivoFalha(res.error) };
    if (!Array.isArray(res.data)) return { n: null, motivo: 'resposta inesperada' };
    return { n: res.data.length, motivo: '' };
  }

  // Contas criadas nos últimos `dias` dias, pela data de cadastro de cada conta (o mesmo
  // recorte de saude.contas: o servidor já tirou as contas internas @catedra.app).
  function novasEm(testadores, agora, dias) {
    if (!Array.isArray(testadores)) return null;
    var corte = agora - (dias || 7) * DIA, n = 0;
    for (var i = 0; i < testadores.length; i++) {
      var t = testadores[i] ? Date.parse(testadores[i].criadoEm) : NaN;
      if (!isNaN(t) && t >= corte && t <= agora + DIA) n++;
    }
    return n;
  }

  // Não lido é o que ninguém tocou (lido=false no banco). "Em aberto" (status ≠ resolvido)
  // é outra conta — é a do selo da aba Suporte, que continua como está.
  function naoLidos(feedback) {
    if (!Array.isArray(feedback)) return null;
    var n = 0;
    for (var i = 0; i < feedback.length; i++) if (feedback[i] && feedback[i].lido === false) n++;
    return n;
  }

  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    return v != null && v !== '' && isFinite(+v) ? +v : null;
  }
  function item(id, rotulo, valor, detalhe, indisponivel) {
    return { id: id, rotulo: rotulo, valor: String(valor), detalhe: detalhe || '', indisponivel: !!indisponivel };
  }
  function fora(id, rotulo, motivo) { return item(id, rotulo, 'indisponível', motivo, true); }

  var ROTULOS = [
    ['contas', 'Contas criadas'], ['ativas7', 'Ativas em 7 dias'], ['ativas30', 'Ativas em 30 dias'],
    ['espera', 'Lista de espera'], ['naoLidos', 'Feedbacks não lidos'], ['erros24', 'Erros nas últimas 24 h']
  ];

  /* e = {
       carregado:    o console já fez uma rodada de _loadAdmin;
       acessoNegado: todas as RPCs voltaram acesso_negado;
       visao:        admin_visao_geral (null se falhou) — usa saude e testadores;
       feedback:     admin_feedback (array; null se falhou);
       erros:        admin_erros_cliente(24) (array; null se falhou);
       listaEspera:  { n, motivo }, de listaEspera();
       telemetria:   true/false (o interruptor); null se admin_config falhou;
       agora:        ms (o teste fixa) } */
  function panorama(e) {
    e = e || {};
    var agora = typeof e.agora === 'number' ? e.agora : Date.now();
    if (!e.carregado) return ROTULOS.map(function (r) { return item(r[0], r[1], '—', 'carregando…', false); });
    if (e.acessoNegado) return ROTULOS.map(function (r) { return fora(r[0], r[1], 'sem permissão'); });

    var out = [];
    var v = e.visao && typeof e.visao === 'object' ? e.visao : null;
    var s = v && v.saude && typeof v.saude === 'object' ? v.saude : null;
    var contas = s ? num(s.contas) : null;
    if (contas == null) out.push(fora('contas', 'Contas criadas', 'visão geral não carregou'));
    else {
      var novas = novasEm(v.testadores, agora, 7);
      out.push(item('contas', 'Contas criadas', contas, novas == null ? 'no total' : novas + ' nos últimos 7 dias'));
    }
    // ativos7d/ativos30d contam last_sign_in_at (supabase-admin.sql): login novo, não uso. O
    // detalhe diz isso, para o número não passar por "quem estudou".
    var a7 = s ? num(s.ativos7d) : null, a30 = s ? num(s.ativos30d) : null;
    out.push(a7 == null ? fora('ativas7', 'Ativas em 7 dias', 'visão geral não carregou') : item('ativas7', 'Ativas em 7 dias', a7, 'fizeram login na última semana'));
    out.push(a30 == null ? fora('ativas30', 'Ativas em 30 dias', 'visão geral não carregou') : item('ativas30', 'Ativas em 30 dias', a30, 'fizeram login no último mês'));

    var le = e.listaEspera || { n: null, motivo: 'sem resposta' };
    out.push(le.n == null ? fora('espera', 'Lista de espera', le.motivo || 'falha ao consultar')
      : le.n >= LIMITES.espera ? item('espera', 'Lista de espera', LIMITES.espera + '+', 'a consulta para em ' + LIMITES.espera + ' inscritos')
      : item('espera', 'Lista de espera', le.n, 'inscritos pela página pública'));

    var fb = Array.isArray(e.feedback) ? e.feedback : null;
    if (!fb) out.push(fora('naoLidos', 'Feedbacks não lidos', 'relatos não carregaram'));
    else {
      var det = fb.length === 0 ? 'nenhum relato ainda'
        : fb.length >= LIMITES.feedback ? 'entre os ' + LIMITES.feedback + ' relatos mais recentes'
        : 'de ' + fb.length + (fb.length === 1 ? ' relato' : ' relatos');
      out.push(item('naoLidos', 'Feedbacks não lidos', naoLidos(fb), det));
    }

    // telemetria: true/false é o interruptor lido de admin_config; null = a configuração não
    // carregou, e aí o cartão não afirma que está desligada.
    var er = Array.isArray(e.erros) ? e.erros : null;
    if (!er) out.push(fora('erros24', 'Erros nas últimas 24 h', 'erros não carregaram'));
    else out.push(item('erros24', 'Erros nas últimas 24 h', er.length >= LIMITES.erros ? LIMITES.erros + '+' : er.length,
      e.telemetria === true ? 'recebidos pela telemetria' : e.telemetria === false ? 'telemetria desligada: nada novo chega'
        : 'estado da telemetria indisponível'));
    return out;
  }

  // ── resposta por e-mail ──────────────────────────────────────────────────
  function emailValido(em) { return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(String(em || '').trim()); }

  // mailto: com assunto e corpo iniciais (RFC 6068: quebra de linha vira %0D%0A). O endereço
  // passa por encodeURIComponent para que nada nele vire cabeçalho (?cc=, &bcc=); só o @ volta.
  function mailtoResposta(f) {
    f = f || {};
    var em = String(f.email || '').trim();
    if (!emailValido(em)) return '';
    var quando = dataCurta(f.criado_em);
    var msg = String(f.mensagem || '').replace(/\r\n?/g, '\n').trim();
    // slice conta unidades UTF-16: sem espaço antes do corte, ele pode partir um emoji (par
    // substituto) e o meio que sobra faz o encodeURIComponent lançar — dentro do render, o app inteiro caía.
    if (msg.length > LIMITES.citacao) msg = msg.slice(0, LIMITES.citacao).replace(/\s+\S*$/, '').replace(/[\uD800-\uDBFF]$/, '') + '…';
    var assunto = 'Cátedra: resposta ao seu relato' + (quando ? ' de ' + quando : '');
    var corpo = 'Olá,\n\nObrigada por escrever pelo app da Cátedra. Sobre o que você relatou' + (quando ? ' em ' + quando : '') + ':\n\n'
      + (msg ? msg.split('\n').map(function (l) { return '> ' + l; }).join('\n') + '\n\n' : '');
    // o relato é texto de terceiro: um substituto solto que venha nele vira "sem link", nunca uma exceção
    try {
      return 'mailto:' + encodeURIComponent(em).replace(/%40/g, '@')
        + '?subject=' + encodeURIComponent(assunto)
        + '&body=' + encodeURIComponent(corpo.replace(/\n/g, '\r\n'));
    } catch (err) { return ''; }
  }

  // A resposta entra na nota interna com prefixo datado, depois do que já havia (uma linha em branco separa).
  function notaComResposta(anterior, texto, quando) {
    var t = String(texto || '').replace(/\r\n?/g, '\n').trim();
    if (!t) return null;
    var nova = '[resposta por e-mail em ' + carimbo(quando || new Date()) + '] ' + t;
    var ant = String(anterior == null ? '' : anterior).replace(/\s+$/, '');
    return ant ? ant + '\n\n' + nova : nova;
  }

  // "Nota interna" é um campo de uma linha (window.prompt; no Mac, um NSTextField): reescrever
  // ali uma nota de várias linhas colaria as linhas. Nesse caso o que se digita ENTRA NO FIM,
  // numa linha nova. Texto vazio não grava (null).
  function acrescentarNota(anterior, texto) {
    var t = String(texto || '').replace(/\r\n?/g, '\n').trim();
    if (!t) return null;
    var ant = String(anterior == null ? '' : anterior).replace(/\s+$/, '');
    return ant ? ant + '\n' + t : t;
  }

  // Os valores de status são os do SQL (supabase-admin.sql: novo | andamento | resolvido; não há
  // CHECK). Responder tira o relato de "novo"; um "resolvido" (responder depois de consertar) fica.
  function statusAposResposta(st) { return st === 'resolvido' || st === 'andamento' ? st : 'andamento'; }

  var API = { panorama: panorama, listaEspera: listaEspera, motivoFalha: motivoFalha, novasEm: novasEm,
    naoLidos: naoLidos, carimbo: carimbo, dataCurta: dataCurta, mailtoResposta: mailtoResposta,
    notaComResposta: notaComResposta, acrescentarNota: acrescentarNota, statusAposResposta: statusAposResposta,
    emailValido: emailValido, LIMITES: LIMITES };
  if (typeof window !== 'undefined') window.CT_ADMIN = API;
})();
