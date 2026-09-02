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
  raiz.CT_ENAM = {
    AREAS: AREAS,
    QUESTOES: TOTAL,                 // 80
    ALTERNATIVAS: ['A', 'B', 'C', 'D', 'E'],
    DURACAO_MIN: 300,                // 5 horas (item 8.1)
    META_PADRAO: 56, META_COTA: 40,  // 70 % e 50 % (itens 3.7 e 9.2)
    EDITAL: 'Edital de Abertura n. 02/2026 — 6º ENAM (FGV/ENFAM)',
    FUSO_PROVA: FUSO_PROVA, EDICOES: EDICOES,
    areaDe: function (id) { for (var k = 0; k < AREAS.length; k++) if (AREAS[k].id === id) return AREAS[k]; return null; },
    edicao: edicao, proxima: proxima, diasAte: diasAte, instante: instante, horaLocal: horaLocal, cadencia: cadencia, fusoAparelho: fusoAparelho
  };
})(typeof window !== 'undefined' ? window : globalThis);
