/* enam.js — o que o app sabe sobre o ENAM (Exame Nacional da Magistratura, FGV/ENFAM).
   Constante ÚNICA das oito áreas do quadro de distribuição (Edital de Abertura n. 02/2026,
   6º ENAM, item 8.6) — 80 questões A–E, cinco horas, 56 acertos habilitam (70 %), 40 para
   quem se autodeclara (50 %). Consumida pelo build do banco (scripts/build-questoes-enam.mjs),
   pelo simulado no formato (E3) e pela correção (E4). Sem rede, sem dependência; sintaxe
   conservadora porque o WKWebView do iPad/Mac usa JavaScriptCore. */
(function (raiz) {
  'use strict';
  var AREAS = [
    { id: 'constitucional', nome: 'Direito Constitucional', cota: 16,
      // nota do quadro 8.6 (igual nos cinco editais, 2024.1 a 2026.1): "podendo ser incluídas questões de
      // Direito Constitucional do Trabalho, Direito Constitucional Tributário e Normas Constitucionais de Processo Penal"
      disciplinasApp: ['Direito Constitucional', 'Direito Constitucional do Trabalho', 'Direito Constitucional Tributário', 'Normas Constitucionais de Processo Penal'],
      cabecalhos: ['DIREITO CONSTITUCIONAL'] },
    { id: 'administrativo', nome: 'Direito Administrativo', cota: 10,
      disciplinasApp: ['Direito Administrativo'], cabecalhos: ['DIREITO ADMINISTRATIVO'] },
    { id: 'humanistica', nome: 'Noções Gerais de Direito e Formação Humanística', cota: 6,
      disciplinasApp: ['Noções Gerais de Direito e Formação Humanística'],
      cabecalhos: ['NOÇÕES GERAIS DE DIREITO E FORMAÇÃO HUMANÍSTICA'] },
    { id: 'dh', nome: 'Direitos Humanos', cota: 6,
      disciplinasApp: ['Direitos Humanos'], cabecalhos: ['DIREITOS HUMANOS'] },
    { id: 'processocivil', nome: 'Direito Processual Civil', cota: 12,
      disciplinasApp: ['Direito Processual Civil'], cabecalhos: ['DIREITO PROCESSUAL CIVIL', 'DIREITOS PROCESSUAL CIVIL'] },
    { id: 'civil', nome: 'Direito Civil', cota: 12,
      disciplinasApp: ['Direito Civil'], cabecalhos: ['DIREITO CIVIL'] },
    { id: 'empresarial', nome: 'Direito Empresarial', cota: 6,
      disciplinasApp: ['Direito Empresarial'], cabecalhos: ['DIREITO EMPRESARIAL'] },
    { id: 'penal', nome: 'Direito Penal', cota: 12,
      disciplinasApp: ['Direito Penal'], cabecalhos: ['DIREITO PENAL'] }
  ];
  var TOTAL = 0;
  for (var i = 0; i < AREAS.length; i++) TOTAL += AREAS[i].cota;
  var DURACAO_MIN = 300;             // 5 horas (item 8.1)
  var META_PADRAO = 56, META_COTA = 40; // 70 % e 50 % (itens 3.7 e 9.2)

  /* As edições. Data e horário são os do edital de cada uma (item 8.1: das 13h às 18h,
     horário oficial de Brasília). A próxima edição entra aqui quando o edital sair. */
  var FUSO_PROVA = 'America/Sao_Paulo';
  var EDICOES = [
    { id: '2024.1', numero: 'I',   data: '2024-04-14', inicio: '13:00', edital: 'Edital de Abertura n. 01/2024' },
    { id: '2024.2', numero: 'II',  data: '2024-10-20', inicio: '13:00', edital: 'Edital de Abertura n. 02/2024' },
    { id: '2025.1', numero: 'III', data: '2025-05-18', inicio: '13:00', edital: 'Edital de Abertura n. 01/2025' },
    { id: '2025.2', numero: 'IV',  data: '2025-10-26', inicio: '13:00', edital: 'Edital de Abertura n. 02/2025' },
    { id: '2026.1', numero: 'V',   data: '2026-06-07', inicio: '13:00', edital: 'Edital de Abertura n. 01/2026' },
    { id: '2026.2', numero: 'VI',  data: '2026-11-29', inicio: '13:00', edital: 'Edital de Abertura n. 02/2026', inscricoesAte: '2026-09-24' }
  ];
  function edicao(id) { for (var k = 0; k < EDICOES.length; k++) if (EDICOES[k].id === id) return EDICOES[k]; return null; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fusoAparelho() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || FUSO_PROVA; } catch (e) { return FUSO_PROVA; } }
  /** A data civil (Y-M-D) de um instante num fuso — é o que evita o erro do new Date('2026-11-29'), que é UTC. */
  function ymdEm(instante, fuso) {
    try {
      var p = new Intl.DateTimeFormat('en-CA', { timeZone: fuso || FUSO_PROVA, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instante);
      var o = {}; for (var i = 0; i < p.length; i++) o[p[i].type] = p[i].value;
      return { y: +o.year, m: +o.month, d: +o.day };
    } catch (e) { var d = new Date(instante); return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }; }
  }
  function ymdDe(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
  /** Dias inteiros até a prova: da data civil de HOJE no fuso pedido (padrão: o do aparelho —
      às 23h30 de 28/11 em Porto Velho ainda "falta 1 dia", embora em Brasília já seja dia 29)
      até a data civil da prova. 0 = é hoje; negativo = passou. */
  function diasAte(dataISO, agora, fuso) {
    var alvo = ymdDe(dataISO); if (!alvo) return null;
    var hoje = ymdEm(agora == null ? new Date() : agora, fuso || fusoAparelho());
    return Math.round((Date.UTC(alvo.y, alvo.m - 1, alvo.d) - Date.UTC(hoje.y, hoje.m - 1, hoje.d)) / 864e5);
  }
  /** O instante (ms UTC) de "data + hh:mm" num fuso — resolvido pelo próprio Intl, sem tabela de horário de verão. */
  function instante(dataISO, hhmm, fuso) {
    var a = ymdDe(dataISO), h = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '13:00')); if (!a || !h) return null;
    var palpite = Date.UTC(a.y, a.m - 1, a.d, +h[1], +h[2]);
    try {
      var p = new Intl.DateTimeFormat('en-CA', { timeZone: fuso || FUSO_PROVA, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(palpite));
      var o = {}; for (var i = 0; i < p.length; i++) o[p[i].type] = p[i].value;
      var visto = Date.UTC(+o.year, +o.month - 1, +o.day, (+o.hour) % 24, +o.minute);
      return palpite - (visto - palpite);   // o desvio entre o que o fuso mostrou e o que queríamos é o offset
    } catch (e) { return palpite + 3 * 3600e3; }
  }
  function cidadeDe(fuso) { var s = String(fuso || '').split('/').pop().replace(/_/g, ' '); return s || fuso; }
  /** "prova às 13h de Brasília · 12h em Porto Velho" — a segunda parte só quando o aparelho está noutro horário. */
  function horaLocal(ed, fusoDoAparelho) {
    ed = ed || {}; var fusoAp = fusoDoAparelho || fusoAparelho();
    var ini = String(ed.inicio || '13:00'), hB = ini.split(':')[0];
    var texto = 'prova às ' + (+hB) + 'h de Brasília';
    var t = instante(ed.data, ini, FUSO_PROVA); if (t == null) return texto;
    try {
      var fmt = function (fuso) { return new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, hour: 'numeric', minute: '2-digit', hour12: false }).format(new Date(t)); };
      if (fmt(fusoAp) !== fmt(FUSO_PROVA)) {
        var hm = fmt(fusoAp).split(':'); texto += ' · ' + (+hm[0]) + (hm[1] && hm[1] !== '00' ? 'h' + hm[1] : 'h') + ' em ' + cidadeDe(fusoAp);
      }
    } catch (e) {}
    return texto;
  }
  /** Cadência de simulados (E5): um a cada 14 dias, o último uma semana antes da prova, só datas
      depois de `agora`. 02/09 → 29/11/2026 dá 13/09, 27/09, 11/10, 25/10, 08/11 e 22/11. */
  function cadencia(agora, dataISO, fuso) {
    var alvo = ymdDe(dataISO); if (!alvo) return [];
    var hoje = ymdEm(agora == null ? new Date() : agora, fuso || fusoAparelho());
    var t0 = Date.UTC(hoje.y, hoje.m - 1, hoje.d), out = [];
    for (var t = Date.UTC(alvo.y, alvo.m - 1, alvo.d) - 7 * 864e5; t > t0; t -= 14 * 864e5) {
      var d = new Date(t); out.unshift(d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()));
    }
    return out;
  }
  /** A próxima edição a partir de `agora` (a prova ainda por vir), ou a última se todas passaram. */
  function proxima(agora, fuso) {
    for (var k = 0; k < EDICOES.length; k++) { var d = diasAte(EDICOES[k].data, agora, fuso); if (d != null && d >= 0) return EDICOES[k]; }
    return EDICOES[EDICOES.length - 1];
  }

  /* ===== E3: a prova montada como ela é =====
     80 questões A–E na ordem das áreas do edital, cota exata por área, embaralhadas dentro do
     bloco. Só o banco oficial (nunca item Certo/Errado gerado) e nunca anulada. Em cada área a
     prioridade é: questão que a pessoa ainda não fez → já feita (continua sendo ENAM de verdade) →
     reserva de prova de magistratura da mesma disciplina, marcada foraDoEnam:true. */
  function embaralhar(a, rnd) { rnd = rnd || Math.random; for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function normDisc(s) { s = String(s || '').replace(/\s*\(.*$/, '').toLowerCase(); try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {} return s.replace(/\s+/g, ' ').trim(); }
  function questaoValida(q) { return !!(q && q.alternativas && q.alternativas.length === 5 && /^[A-E]$/.test(String(q.gabarito || '')) && String(q.enunciado || '').length >= 40); }
  /** O item do simulado (mesmo shape que o Simulado A–E consome) a partir de uma questão do banco ENAM. */
  function item(q) {
    var area = null; for (var k = 0; k < AREAS.length; k++) if (AREAS[k].id === q.area) area = AREAS[k];
    return { id: q.id, origem: 'enam', area: q.area, ramo: q.disciplina || (area ? area.nome : ''), disciplina: q.disciplina || (area ? area.nome : ''),
      enunciado: q.enunciado, alternativas: q.alternativas, certo: q.gabarito, edicao: q.edicao, numero: q.numero, fonte: q.fonte || '',
      banca: 'FGV/ENFAM', ano: String(q.edicao || '').slice(0, 4), assunto: '',
      ref: 'ENAM ' + q.edicao + ' · questão ' + q.numero };
  }
  /** Reserva: questão de prova de magistratura (CT_QUESTOES_PROVA) cobrindo uma área sem estoque. */
  function itemReserva(q, areaId) {
    return { id: 'qp' + q.id, origem: 'prova', foraDoEnam: true, area: areaId, ramo: String(q.disciplina || '').replace(/\s*\(.*$/, ''), disciplina: q.disciplina || '',
      enunciado: q.enunciado, alternativas: q.alternativas, certo: q.gabarito, pct: q.pct, assunto: q.assunto || q.tema || '', banca: q.banca || '', ano: q.ano || '',
      ref: [q.banca, q.orgao, q.ano].filter(Boolean).join(' · ') };
  }
  function areaDaDisciplina(disc) {
    var d = normDisc(disc);
    for (var k = 0; k < AREAS.length; k++) for (var j = 0; j < AREAS[k].disciplinasApp.length; j++) {
      var x = normDisc(AREAS[k].disciplinasApp[j]); if (d === x || d.indexOf(x + ' ') === 0) return AREAS[k];
    }
    return null;
  }
  /**
   * montar(banco, opts) → { itens, porArea, foraDoEnam, faltam, total }
   *   banco        CT_QUESTOES_ENAM
   *   opts.cotas   {areaId: n} — padrão: o quadro 8.6
   *   opts.excluir ids já feitos (catedra:enamSim) — evitados enquanto houver estoque
   *   opts.reserva CT_QUESTOES_PROVA — completa área com estoque curto (foraDoEnam:true)
   *   opts.rnd     gerador de números (os testes passam um determinístico)
   * porArea traz, por área, cota, n, doBanco, foraDoEnam e a faixa (de–ate, 1-based) na prova.
   */
  function montar(banco, opts) {
    opts = opts || {};
    var rnd = opts.rnd || Math.random, cotas = opts.cotas || {};
    var feitas = {}; (opts.excluir || []).forEach(function (id) { feitas[id] = 1; });
    var validas = (banco || []).filter(function (q) { return questaoValida(q) && !q.anulada; });
    var reserva = (opts.reserva || []).filter(questaoValida);
    var itens = [], porArea = [], fora = 0, faltam = 0, usados = {};
    for (var a = 0; a < AREAS.length; a++) {
      var area = AREAS[a], cota = cotas[area.id] != null ? Math.max(0, +cotas[area.id] | 0) : area.cota;
      var doBanco = validas.filter(function (q) { return q.area === area.id; });
      var novas = embaralhar(doBanco.filter(function (q) { return !feitas[q.id]; }), rnd);
      var velhas = embaralhar(doBanco.filter(function (q) { return feitas[q.id]; }), rnd);
      var bloco = novas.concat(velhas).slice(0, cota).map(item), nFora = 0;
      if (bloco.length < cota) {
        var pool = embaralhar(reserva.filter(function (q) { var ar = areaDaDisciplina(q.disciplina); return ar && ar.id === area.id && !usados['qp' + q.id]; }), rnd);
        for (var k = 0; k < pool.length && bloco.length < cota; k++) { bloco.push(itemReserva(pool[k], area.id)); nFora++; }
      }
      embaralhar(bloco, rnd);
      for (var i = 0; i < bloco.length; i++) usados[bloco[i].id] = 1;
      itens = itens.concat(bloco);
      fora += nFora; faltam += Math.max(0, cota - bloco.length);
      porArea.push({ id: area.id, nome: area.nome, cota: cota, n: bloco.length, doBanco: bloco.length - nFora, foraDoEnam: nFora,
        de: itens.length - bloco.length + 1, ate: itens.length });
    }
    return { itens: itens, porArea: porArea, foraDoEnam: fora, faltam: faltam, total: itens.length };
  }
  /** Reconstrói os itens de uma prova guardada (ct_enam_prova guarda só ids). null se algum id sumiu do banco. */
  function rehidratar(ids, banco, reserva) {
    var porId = {}, resId = {}, k;
    for (k = 0; k < (banco || []).length; k++) porId[banco[k].id] = banco[k];
    for (k = 0; k < (reserva || []).length; k++) resId['qp' + reserva[k].id] = reserva[k];
    var itens = [];
    for (k = 0; k < (ids || []).length; k++) {
      var id = ids[k];
      if (porId[id]) { itens.push(item(porId[id])); continue; }
      if (resId[id]) { var ar = areaDaDisciplina(resId[id].disciplina); itens.push(itemReserva(resId[id], ar ? ar.id : '')); continue; }
      return null;
    }
    return itens.length ? itens : null;
  }
  /* ===== E4: a correção — "habilitaria?" =====
     Pura. O ENAM habilita (item 1.2.1), não aprova: a pergunta é se a nota bateria a meta que a
     pessoa escolheu (56 ou 40). Cada área tem um alvo proporcional (cota × meta/80) e o déficit
     é o que faltou para ele. Anulada nunca conta; tempo médio só das respondidas. */
  function corrigir(itens, resp, meta, opts) {
    opts = opts || {}; resp = resp || {};
    meta = +meta > 0 ? Math.round(+meta) : META_PADRAO;
    var validos = (itens || []).filter(function (it) { return it && !it.anulada; });
    var acertos = 0, respondidas = 0, fora = 0, porArea = {}, k;
    for (k = 0; k < AREAS.length; k++) porArea[AREAS[k].id] = { area: AREAS[k].id, nome: AREAS[k].nome, cota: AREAS[k].cota, n: 0, ok: 0, foraDoEnam: 0 };
    validos.forEach(function (it) {
      var r = resp[it.id], ok = r !== undefined && r === it.certo;
      if (r !== undefined) respondidas++;
      if (ok) acertos++;
      if (it.foraDoEnam) fora++;
      var pa = porArea[it.area] || (porArea[it.area] = { area: String(it.area || ''), nome: it.ramo || String(it.area || 'Sem área'), cota: 0, n: 0, ok: 0, foraDoEnam: 0 });
      pa.n++; if (ok) pa.ok++; if (it.foraDoEnam) pa.foraDoEnam++;
    });
    var fator = meta / TOTAL;
    var edital = Object.keys(porArea).map(function (id) {
      var p = porArea[id], cota = p.cota || p.n, alvo = Math.round(cota * fator * 10) / 10;
      return { area: p.area, nome: p.nome, cota: cota, n: p.n, ok: p.ok, pct: p.n ? Math.round(p.ok / p.n * 100) : 0,
        alvo: alvo, alvoInt: Math.round(alvo), deficit: Math.round((alvo - p.ok) * 10) / 10, foraDoEnam: p.foraDoEnam };
    });
    var porDeficit = edital.slice().sort(function (x, y) { return y.deficit - x.deficit || x.area.localeCompare(y.area); });
    var seg = Math.max(0, Math.round(+opts.segundos || 0));
    return { total: validos.length, acertos: acertos, respondidas: respondidas, brancos: validos.length - respondidas, erros: respondidas - acertos,
      anuladas: (itens || []).length - validos.length,
      meta: meta, habilitaria: acertos >= meta, margem: acertos - meta,
      porArea: porDeficit, porAreaEdital: edital,
      tempoTotalSeg: seg, segPorQuestao: respondidas ? Math.round(seg / respondidas) : 0, segDisponivel: Math.round(DURACAO_MIN * 60 / TOTAL),
      comPausa: !!opts.comPausa, foraDoEnam: fora };
  }
  raiz.CT_ENAM = {
    AREAS: AREAS,
    QUESTOES: TOTAL,                 // 80
    ALTERNATIVAS: ['A', 'B', 'C', 'D', 'E'],
    DURACAO_MIN: DURACAO_MIN, META_PADRAO: META_PADRAO, META_COTA: META_COTA,
    EDITAL: 'Edital de Abertura n. 02/2026 — 6º ENAM (FGV/ENFAM)',
    FUSO_PROVA: FUSO_PROVA, EDICOES: EDICOES,
    areaDe: function (id) { for (var k = 0; k < AREAS.length; k++) if (AREAS[k].id === id) return AREAS[k]; return null; },
    edicao: edicao, proxima: proxima, diasAte: diasAte, instante: instante, horaLocal: horaLocal, cadencia: cadencia, fusoAparelho: fusoAparelho,
    RETOMAR_H: 36,                   // E3: a prova guardada em ct_enam_prova vale por 36 h (começar à noite, terminar de manhã)
    montar: montar, rehidratar: rehidratar, areaDaDisciplina: areaDaDisciplina, corrigir: corrigir
  };
})(typeof window !== 'undefined' ? window : globalThis);
