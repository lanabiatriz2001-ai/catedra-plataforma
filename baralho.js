/* BARALHO — vencidas de hoje e o dono da revisão (25/11/2026).
   Módulo puro: sem DOM, sem rede e sem relógio próprio. O host (Catedra.dc.html) passa o
   "hoje" do _hoje() (AAAA-MM-DD no fuso local) e o "agora" em ms, e pinta o que sai daqui.
   O agendamento continua no fsrs.js, intocado: aqui só se decide QUAIS cartões contam.

   · Vencida é o cartão JÁ ESTUDADO (tem dueDate) com dueDate até hoje. Cartão novo, nunca
     estudado, não conta: um baralho cheio de cartões novos inflaria o aviso do Início.
   · Dono da revisão (prefs.donoRevisao): 'app' (padrão, o comportamento de sempre) ou 'anki'.
     Com o app dono, exportar é só saída e nada some. Com o Anki dono, cada cartão exportado
     ganha exportadoEm e sai do Baralho — uma fila só, nunca as duas ao mesmo tempo.
     Voltar para o app não apaga marca nenhuma: os exportados só voltam a aparecer.
   · O Cátedra só sabe o que ELE marcou. O que saiu com o app dono (ou antes desta opção) não
     tem marca: a primeira exportação depois de escolher o Anki pergunta antes, e a tela diz.
   · Com o Anki dono, um arquivo por toque (primeiro os básicos, depois os de lei seca): cada
     lote marcado é o de um download só — no iPad, o seletor do segundo arquivo seguido é
     recusado. E o lote de hoje volta ao Baralho se o arquivo não chegou ao Anki. */
(function (root) {
  'use strict';
  var DIA_ISO = /^\d{4}-\d{2}-\d{2}$/;

  function dois(n) { return (n < 10 ? '0' : '') + n; }
  /** "Hoje" em AAAA-MM-DD. Texto passa direto; Date ou ms viram o dia LOCAL — nunca o
      toISOString, que no Brasil troca o dia às 21h (às 20h em Porto Velho). */
  function hojeDe(x) {
    if (typeof x === 'string') return x;
    var d = (x instanceof Date) ? x : new Date(+x);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + dois(d.getMonth() + 1) + '-' + dois(d.getDate());
  }
  function dono(prefs) { return (prefs && prefs.donoRevisao === 'anki') ? 'anki' : 'app'; }
  function exportado(c) { return !!(c && Number(c.exportadoEm) > 0); }
  function ehCloze(c) { return !!(c && c.tipo === 'cloze'); }
  function cartoes(lista) {
    return Array.isArray(lista) ? lista.filter(function (c) { return !!(c && c.front); }) : [];
  }
  /** O que o Baralho mostra: todo cartão com frente; com o Anki dono, menos os exportados. */
  function doBaralho(lista, d) {
    return cartoes(lista).filter(function (c) { return !(d === 'anki' && exportado(c)); });
  }
  /** Quantos cartões já levam a marca de exportado (vale para os dois donos). */
  function noAnki(lista) { return cartoes(lista).filter(exportado).length; }
  function vencido(c, hoje) {
    var d = String((c && c.dueDate) || ''), h = hojeDe(hoje);
    return DIA_ISO.test(d) && DIA_ISO.test(h) && d <= h;
  }
  /** Vencidas do Baralho até hoje, a mais atrasada primeiro. */
  function vencidas(lista, hoje, d) {
    var h = hojeDe(hoje);
    return doBaralho(lista, d).filter(function (c) { return vencido(c, h); })
      .sort(function (a, b) { var x = String(a.dueDate), y = String(b.dueDate); return x < y ? -1 : x > y ? 1 : 0; });
  }
  /** O que a exportação leva: só cartão com frente (o resto viraria linha vazia no Anki); com o
      app dono, todos (como sempre); com o Anki dono, só os que ainda não foram — exportar de
      novo duplicaria o cartão lá. */
  function paraExportar(lista, d) {
    var todos = cartoes(lista);
    return d === 'anki' ? todos.filter(function (c) { return !exportado(c); }) : todos;
  }
  /** O que ESTE toque leva. App dono: os dois arquivos de sempre (básico e cloze). Anki dono:
      um arquivo só — os básicos; acabados eles, os de lei seca. restamCloze diz quantos ficam. */
  function loteDoToque(lista, d) {
    var basicos = [], cloze = [];
    paraExportar(lista, d).forEach(function (c) { (ehCloze(c) ? cloze : basicos).push(c); });
    if (d !== 'anki') return { basicos: basicos, cloze: cloze, restamCloze: 0 };
    return basicos.length ? { basicos: basicos, cloze: [], restamCloze: cloze.length }
      : { basicos: [], cloze: cloze, restamCloze: 0 };
  }
  /** Nenhuma marca de exportado a partir de `desde` (ms; 0 = nunca houve marca). */
  function semExportarDesde(lista, desde) {
    var t = Number(desde) || 0;
    return !cartoes(lista).some(function (c) { return exportado(c) && Number(c.exportadoEm) >= t; });
  }
  /** Anki dono e nada exportado desde a escolha (nenhuma marca a partir de prefs.donoRevisaoEm):
      o Cátedra não sabe o que já está no Anki, então a exportação pergunta antes. */
  function primeiraDesdeEscolha(lista, prefs) {
    return dono(prefs) === 'anki' && semExportarDesde(lista, prefs && prefs.donoRevisaoEm);
  }
  /** Os cartões de uma exportação: todos com o mesmo exportadoEm. */
  function lote(lista, em) {
    var t = Number(em) || 0;
    return t > 0 ? cartoes(lista).filter(function (c) { return Number(c.exportadoEm) === t; }) : [];
  }
  /** A exportação mais recente: os cartões com o maior exportadoEm (ou null). */
  function ultimoLote(lista) {
    var max = 0;
    cartoes(lista).forEach(function (c) { var t = Number(c.exportadoEm) || 0; if (t > max) max = t; });
    if (!max) return null;
    var l = lote(lista, max);
    return { em: max, ids: l.map(function (c) { return c.id; }), n: l.length };
  }
  function copia(c) { var n = {}, k; for (k in c) if (Object.prototype.hasOwnProperty.call(c, k)) n[k] = c[k]; return n; }
  function alvos(ids) { var a = {}; (Array.isArray(ids) ? ids : []).forEach(function (id) { a['#' + id] = 1; }); return a; }
  /** Marca o lote exportado com exportadoEm e um up novo. O up é o carimbo do merge por id do
      auth.js (catedra:fc está no ARRAY_ID): sem ele, a cópia antiga do outro aparelho venceria
      e o cartão voltaria ao Baralho. Nunca abaixo do up que o cartão já tinha. Cartão fora do
      lote fica como estava (o mesmo objeto). */
  function marcarExportados(lista, ids, agora) {
    var alvo = alvos(ids), t = Number(agora) || 0;
    return (Array.isArray(lista) ? lista : []).map(function (c) {
      if (!c || c.id == null || !alvo['#' + c.id]) return c;
      var n = copia(c);
      n.exportadoEm = t;
      n.up = Math.max(t, (Number(c.up) || 0) + 1);
      return n;
    });
  }
  /** O contrário, para o lote cujo arquivo não chegou ao Anki: tira a marca, e o up novo faz a
      volta vencer a cópia marcada do outro aparelho. Texto e agendamento ficam iguais. */
  function desmarcar(lista, ids, agora) {
    var alvo = alvos(ids), t = Number(agora) || 0;
    return (Array.isArray(lista) ? lista : []).map(function (c) {
      if (!c || c.id == null || !alvo['#' + c.id] || !exportado(c)) return c;
      var n = copia(c);
      delete n.exportadoEm;
      n.up = Math.max(t, (Number(c.up) || 0) + 1);
      return n;
    });
  }

  function plural(n, um, varios) { return n === 1 ? um : varios; }
  /** "1 flashcard", "12 flashcards + 3 cloze" — com concordância. */
  function partes(nB, nC) {
    var p = [];
    if (nB) p.push(nB + plural(nB, ' flashcard', ' flashcards'));
    if (nC) p.push(nC + ' cloze');
    return p.join(' + ');
  }
  /* As duas escolhas de Ajustes › Dados e backup, cada uma dizendo o que acontece. A leitura
     ativa agenda o dispositivo conferido também em Revisões (_laConferir): a opção diz isso. */
  var OPCOES = [
    { v: 'app', nome: 'O Cátedra (padrão)',
      efeito: 'Você revisa no Baralho. A exportação para o Anki fica só de saída: o que você revisar lá não volta para cá — para não ter duas filas, não revise esses cartões no Anki.' },
    { v: 'anki', nome: 'O Anki',
      efeito: 'Cada exportação leva só os cartões que ainda não foram e os tira do Baralho: a revisão deles passa a ser no Anki. Os da leitura ativa seguem também em Revisões. Voltar ao Cátedra não apaga nada e traz todos de volta.' }
  ];
  function opcoes(d) {
    return OPCOES.map(function (o) { return { v: o.v, nome: o.nome, efeito: o.efeito, on: o.v === d, pressed: String(o.v === d) }; });
  }
  /** Os textos da tela num lugar só — e testáveis sem navegador. `prefs` diz desde quando o
      Anki é o dono; `hoje` decide se o lote mais recente ainda pode voltar ao Baralho. */
  function textos(lista, d, hoje, prefs) {
    var marcados = noAnki(lista), restam = paraExportar(lista, 'anki').length;
    var n = vencidas(lista, hoje, d).length;
    var t = {
      vencidasN: n,
      vencidasRotulo: plural(n, 'cartão do Baralho vencido até hoje', 'cartões do Baralho vencidos até hoje'),
      noAnki: marcados,
      lote: null
    };
    if (d === 'anki') {
      var ja = marcados ? (marcados + plural(marcados, ' cartão já está no Anki e não aparece', ' cartões já estão no Anki e não aparecem') + ' no Baralho. ') : '';
      var prox;
      if (!restam) prox = cartoes(lista).length ? 'Nada novo para exportar.' : 'Nenhum cartão para exportar.';
      else if (semExportarDesde(lista, prefs && prefs.donoRevisaoEm)) {
        prox = 'O Cátedra não sabe o que você importou no Anki antes desta escolha: a próxima exportação pergunta antes de levar '
          + plural(restam, 'o cartão, que pode já estar lá e se repetir.', 'os ' + restam + ' cartões, porque algum deles pode já estar lá e se repetir.');
      } else {
        prox = plural(restam, 'Falta 1 cartão: ao ser exportado, ele sai do Baralho.', 'Faltam ' + restam + ' cartões: ao serem exportados, eles saem do Baralho.');
      }
      t.estado = ja + prox;
      t.baralho = 'O Anki é o dono da revisão: '
        + (marcados ? (marcados + plural(marcados, ' cartão já está lá e não aparece', ' cartões já estão lá e não aparecem') + ' aqui; os novos ficam aqui até a próxima exportação.')
          : 'os cartões que você exportar saem daqui.')
        + ' Para trazer os exportados de volta, escolha o Cátedra em Ajustes › Dados e backup — nenhuma marca se perde.';
      var L = ultimoLote(lista);
      if (L && hojeDe(L.em) === hojeDe(hoje)) {
        var h = new Date(L.em);
        t.lote = { em: L.em, n: L.n, txt: 'Última exportação hoje às ' + dois(h.getHours()) + ':' + dois(h.getMinutes())
          + ', com ' + plural(L.n, '1 cartão', L.n + ' cartões') + '. Se o arquivo não chegou ao Anki:' };
      }
    } else {
      t.estado = 'O arquivo do Anki é só de saída: o que você revisar lá não volta para o Cátedra.'
        + (marcados ? (' ' + plural(marcados, 'O cartão exportado quando o Anki era o dono voltou', 'Os ' + marcados + ' cartões exportados quando o Anki era o dono voltaram') + ' ao Baralho, e a marca continua guardada.') : '');
      t.baralho = '';
    }
    return t;
  }
  /** Aviso do momento da exportação: curto (o detalhe fica no cartão de Ajustes). */
  function avisoExportacao(d, nB, nC, marcadosAntes, restamCloze) {
    var tot = (Number(nB) || 0) + (Number(nC) || 0), p = partes(nB, nC);
    if (!tot) {
      return d === 'anki'
        ? ('Nada novo para exportar: ' + (marcadosAntes ? (plural(marcadosAntes, 'o cartão já está', 'os ' + marcadosAntes + ' cartões já estão') + ' no Anki.') : 'o Baralho está vazio.'))
        : 'Nenhum flashcard para exportar';
    }
    var exp = plural(tot, ' exportado', ' exportados');
    if (d === 'anki') {
      return p + exp + ': agora ' + plural(tot, 'é', 'são') + ' do Anki e ' + plural(tot, 'sai', 'saem') + ' do Baralho.'
        + (restamCloze ? (' Toque de novo para ' + plural(restamCloze, 'o de lei seca (Cloze).', 'os ' + restamCloze + ' de lei seca (Cloze).')) : '');
    }
    return p + exp + '. Arquivo só de saída: não revise ' + plural(tot, 'este cartão', 'estes cartões') + ' no Anki.';
  }
  /** A pergunta da primeira exportação depois de escolher o Anki (window.confirm). */
  function confirmacao(n) {
    return 'Primeira exportação desde que você escolheu o Anki.\n\nO Cátedra não sabe o que você já importou lá: '
      + plural(n, 'se este cartão já estiver no Anki, ele pode se repetir.', 'se algum destes ' + n + ' cartões já estiver no Anki, ele pode se repetir.')
      + ' Os exportados saem do Baralho.\n\nExportar agora?';
  }
  function avisoDesfeito(n) {
    if (!n) return 'Nada a desfazer: esses cartões já estão no Baralho.';
    return plural(n, 'O cartão voltou ao Baralho: a próxima exportação o leva de novo.', 'Os ' + n + ' cartões voltaram ao Baralho: a próxima exportação os leva de novo.');
  }
  /** Motivo do bloco "Revisão · Anki" do ciclo. O bloco segue no dia como sempre (é tempo de
      revisar cartões, onde for); com o Anki dono, diz onde eles estão. */
  function motivoBloco(lista, d) {
    var total = Array.isArray(lista) ? lista.length : 0;
    var a = d === 'anki' ? noAnki(lista) : 0;
    if (!a) return total + ' cartões no baralho';
    var b = doBaralho(lista, d).length;
    return b ? (b + ' no Baralho · ' + a + ' no Anki') : (a + plural(a, ' cartão no Anki', ' cartões no Anki'));
  }

  root.CT_BARALHO = {
    hojeDe: hojeDe, dono: dono, exportado: exportado, doBaralho: doBaralho, noAnki: noAnki,
    vencido: vencido, vencidas: vencidas, paraExportar: paraExportar, loteDoToque: loteDoToque,
    primeiraDesdeEscolha: primeiraDesdeEscolha, lote: lote, ultimoLote: ultimoLote,
    marcarExportados: marcarExportados, desmarcar: desmarcar, partes: partes,
    textos: textos, avisoExportacao: avisoExportacao, confirmacao: confirmacao, avisoDesfeito: avisoDesfeito,
    motivoBloco: motivoBloco, opcoes: opcoes
  };
})(typeof window !== 'undefined' ? window : globalThis);
