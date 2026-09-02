/* leitura-ativa.js — motor de LEITURA ATIVA da lei (grade de 7 perguntas), item LA1 de
   docs/especificacao-leitura-ativa.md.

   Módulo PURO: sem DOM, sem rede, sem depender de treino.js carregado. É carregado pelo
   host (Catedra.dc.html) e pelo CátedraLEGIS (legis-web.html), e roda em Node cru para os
   testes. Sintaxe conservadora de propósito: o WKWebView do iPad/Mac usa JavaScriptCore.

   O que uma leitura guarda — e o que ela NUNCA guarda:
   · guarda: id estável por lei e dispositivo, hash do texto, offsets e trechos marcados
     (como os grifos de 'catedra:grifos:*'), "não há" declarado, conferências;
   · nunca guarda o texto do dispositivo: ele já vive no acervo, e 1.000 leituras com
     texto embutido estourariam o blob de sync. Se o Planalto mudar a redação, o hash
     denuncia e a leitura fica "desatualizada" em vez de apontar para o lugar errado.

   Todas as funções devolvem um item NOVO (o de entrada não é mutado) com `up` avançado —
   é o `up` que o merge por id do auth.js usa para decidir quem vence entre aparelhos. */
(function (raiz) {
  'use strict';

  /* A grade. Ordem, rótulo, pergunta e cor são fixos e nunca mudam de posição — a cor
     entra como token (--la-<id>) em LA2; aqui só o id que a nomeia. */
  var ELEMENTOS = [
    { id: 'quem',      n: 1, rotulo: 'Quem?',         pergunta: 'sujeito, destinatário, legitimado, competente',            tecla: '1' },
    { id: 'oque',      n: 2, rotulo: 'O quê?',        pergunta: 'conduta, objeto, efeito, o que a norma manda/permite/cria', tecla: '2' },
    { id: 'quando',    n: 3, rotulo: 'Quando?',       pergunta: 'hipótese, condição, momento, marco temporal',               tecla: '3' },
    { id: 'como',      n: 4, rotulo: 'Como?',         pergunta: 'forma, procedimento, meio, quórum, requisito formal',       tecla: '4' },
    { id: 'prazo',     n: 5, rotulo: 'Há prazo?',     pergunta: 'prazo, termo, contagem',                                     tecla: '5' },
    { id: 'excecao',   n: 6, rotulo: 'Há exceção?',   pergunta: 'ressalva, "salvo", "exceto", "não se aplica"',              tecla: '6' },
    { id: 'proibicao', n: 7, rotulo: 'Há proibição?', pergunta: 'vedação, "é vedado", "não pode", "sob pena de"',            tecla: '7' }
  ];
  var IDS = ELEMENTOS.map(function (e) { return e.id; });
  var VERSAO = 1;
  var MAX_TRECHO = 400;     // um trecho marcado é uma pista para reencontrar a marca, não o dispositivo inteiro
  var MAX_MARCAS = 40;      // por elemento; acima disso não é leitura, é cópia

  function ehEl(el) { return IDS.indexOf(el) >= 0; }
  function agoraDepoisDe(item) {
    // o carimbo tem de crescer mesmo em duas edições no mesmo milissegundo, senão o
    // merge por id (auth.js) não sabe qual das duas é a mais nova
    var t = Date.now(), u = (item && +item.up) || 0;
    return t > u ? t : u + 1;
  }

  /* O FNV-1a de treino.js, copiado (não importado: o LEGIS não carrega treino.js). Devolve
     8 dígitos hexadecimais, sempre do mesmo tamanho, para caber num id ou numa comparação. */
  function hash(txt) {
    var s = String(txt == null ? '' : txt), h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    var x = h.toString(16);
    while (x.length < 8) x = '0' + x;
    return x;
  }

  function elVazio() {
    var o = {};
    IDS.forEach(function (id) { o[id] = []; });
    return o;
  }

  /* Copia rasa e segura do item, com os arrays de marcas recriados — quem chama pode
     alterar o resultado sem tocar no original. */
  function clonar(item) {
    var it = {}, k;
    for (k in item) if (Object.prototype.hasOwnProperty.call(item, k)) it[k] = item[k];
    var el = elVazio();
    IDS.forEach(function (id) {
      var ms = (item && item.el && item.el[id]) || [];
      el[id] = ms.map(function (m) { return { s: m.s, t: m.t }; });
    });
    it.el = el;
    it.nao = ((item && item.nao) || []).slice();
    it.conf = ((item && item.conf) || []).map(function (c) { return { el: c.el, q: c.q, ts: c.ts }; });
    return it;
  }

  /** Uma leitura nova para um dispositivo. `txt` serve só para o hash: NÃO fica no item. */
  function nova(p) {
    p = p || {};
    var leiId = String(p.leiId || ''), gi = +p.gi;
    if (!leiId || !isFinite(gi)) return null;
    gi = Math.floor(gi);
    var t = Date.now();
    return {
      id: 'la|' + leiId + '|' + gi,
      up: t, v: VERSAO,
      leiId: leiId,
      sigla: String(p.sigla || '').slice(0, 24),
      rot: String(p.rot || '').slice(0, 80),
      gi: gi,
      hash: hash(p.txt || ''),
      el: elVazio(),
      nao: [],
      conf: [],
      lido: t
    };
  }

  /** Marca um trecho {s, t} no elemento `el`. Mesmo offset duas vezes = uma marca só. */
  function marcar(item, el, marca) {
    if (!item || !ehEl(el) || !marca) return item;
    var s = +marca.s, t = String(marca.t || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TRECHO);
    if (!isFinite(s) || s < 0 || !t) return item;
    s = Math.floor(s);
    var it = clonar(item);
    var lista = it.el[el].filter(function (m) { return m.s !== s; });
    if (lista.length >= MAX_MARCAS) return item;
    lista.push({ s: s, t: t });
    lista.sort(function (a, b) { return a.s - b.s; });
    it.el[el] = lista;
    // marcar algo é a prova de que há: um "não há" anterior neste elemento cai
    it.nao = it.nao.filter(function (x) { return x !== el; });
    it.up = agoraDepoisDe(item);
    return it;
  }

  /** Tira a marca que começa em `s` do elemento `el`. */
  function desmarcar(item, el, s) {
    if (!item || !ehEl(el)) return item;
    s = Math.floor(+s);
    var it = clonar(item);
    var antes = it.el[el].length;
    it.el[el] = it.el[el].filter(function (m) { return m.s !== s; });
    if (it.el[el].length === antes) return item;
    it.up = agoraDepoisDe(item);
    return it;
  }

  /** "Não há" declarado (diferente de "não marquei"). `bool` false desfaz a declaração. */
  function naoHa(item, el, bool) {
    if (!item || !ehEl(el)) return item;
    var it = clonar(item), tem = it.nao.indexOf(el) >= 0;
    if (bool && tem) return item;
    if (!bool && !tem) return item;
    if (bool) { it.nao.push(el); it.el[el] = []; }   // "não há" e marca no mesmo elemento se contradizem
    else it.nao = it.nao.filter(function (x) { return x !== el; });
    it.up = agoraDepoisDe(item);
    return it;
  }

  /** Quantas das 7 perguntas foram respondidas — "respondida" = tem marca OU "não há". */
  function completude(item) {
    var faltam = [], n = 0;
    IDS.forEach(function (id) {
      var marcou = !!(item && item.el && item.el[id] && item.el[id].length);
      var nao = !!(item && item.nao && item.nao.indexOf(id) >= 0);
      if (marcou || nao) n++; else faltam.push(id);
    });
    return { respondidas: n, total: IDS.length, faltam: faltam };
  }

  /** O texto atual do dispositivo ainda é o que foi lido? (false = leitura desatualizada) */
  function atualizada(item, txt) { return !!item && item.hash === hash(txt || ''); }

  /* LA5 — cloze de lei seca. Assinaturas prontas; o corpo entra com o item LA5. */
  function cloze(item, el, txt) { return null; }            // → { front, back, extra } | null
  function renderCloze(front, mostrar) { return ''; }        // front com {{cN::…}} → HTML

  /* LA4 — conferência imediata: "erro como filtro". A conferência é registrada no item e
     `criar` diz o que o host deve gerar — q=5 (acertei) NÃO cria nada; q=3 (hesitei) cria
     flashcard e revisão; q=1 (errei) cria flashcard, revisão e item no caderno de erros.
     Ler não gera cartão; só o que ela errou ou hesitou vira revisão. */
  function conferir(item, el, q) {
    if (!item || !ehEl(el)) return null;
    q = +q;
    if (q !== 1 && q !== 3 && q !== 5) return null;
    var it = clonar(item);
    it.conf.push({ el: el, q: q, ts: Date.now() });
    if (it.conf.length > 200) it.conf = it.conf.slice(-200);   // histórico de conferência, não diário
    it.up = agoraDepoisDe(item);
    var criar = {};
    if (q <= 3) { criar.fc = true; criar.review = true; }
    if (q === 1) criar.erro = true;
    return { item: it, criar: criar };
  }

  function rotulo(el) { for (var i = 0; i < ELEMENTOS.length; i++) if (ELEMENTOS[i].id === el) return ELEMENTOS[i].rotulo; return ''; }
  var LACUNA = '\u2581\u2581\u2581\u2581';   // ▁▁▁▁ — bloco gráfico, não emoji
  /** O texto do dispositivo com as marcas de UM elemento escondidas (offset como pista,
      indexOf como recurso — o padrão de renderGr). É o front da conferência e do cartão. */
  function lacunas(txt, marcas) {
    var s = String(txt == null ? '' : txt);
    var ms = (marcas || []).map(function (m) {
      if (!m || !m.t) return null;
      var i = (m.s != null && s.substr(m.s, m.t.length) === m.t) ? m.s : s.indexOf(m.t);
      return i >= 0 ? { a: i, b: i + m.t.length } : null;
    }).filter(function (x) { return !!x; }).sort(function (a, b) { return b.a - a.a; });
    ms.forEach(function (m) { s = s.slice(0, m.a) + LACUNA + s.slice(m.b); });
    return s;
  }
  /** Front/back de um elemento conferido. Sem IA, sem texto além do próprio dispositivo:
      front = "CC · Art. 1.239 — Há prazo?" + o texto com a lacuna; back = o que estava lá. */
  function cartaoConferencia(item, el, txt) {
    if (!item || !ehEl(el)) return null;
    var ms = (item.el && item.el[el]) || [];
    if (!ms.length) return null;
    var cab = [item.sigla, item.rot].filter(function (x) { return !!x; }).join(' \u00b7 ');
    return { front: (cab ? cab + ' \u2014 ' : '') + rotulo(el) + '\n' + lacunas(txt, ms),
             back: ms.map(function (m) { return m.t; }).join(' / '), ref: cab };
  }

  /** Quanto de uma lei já foi lido ativamente. */
  function progresso(leituras, leiId, totalDispositivos) {
    var lista = (Array.isArray(leituras) ? leituras : []).filter(function (x) { return x && x.leiId === leiId; });
    var completos = lista.filter(function (x) { return completude(x).respondidas === IDS.length; }).length;
    var total = +totalDispositivos || 0;
    return { lidos: lista.length, completos: completos, pct: total > 0 ? Math.round(100 * lista.length / total) : 0 };
  }

  /* O host recebe itens de um iframe: antes de guardar, ele passa por aqui. Só as chaves
     do shape entram (nada de `txt`, nada de campo inventado), strings são aparadas e
     números conferidos. Devolve null se não dá para reconhecer uma leitura. */
  function sanear(x) {
    if (!x || typeof x !== 'object') return null;
    var leiId = String(x.leiId || ''), gi = +x.gi;
    if (!leiId || !isFinite(gi)) return null;
    gi = Math.floor(gi);
    var id = String(x.id || '');
    if (id !== 'la|' + leiId + '|' + gi) return null;   // o id É lei + dispositivo; um id solto seria outra coisa
    var it = {
      id: id,
      up: (+x.up > 0) ? Math.floor(+x.up) : Date.now(),
      v: VERSAO,
      leiId: leiId.slice(0, 300),
      sigla: String(x.sigla || '').slice(0, 24),
      rot: String(x.rot || '').slice(0, 80),
      gi: gi,
      hash: /^[0-9a-f]{8}$/.test(String(x.hash || '')) ? String(x.hash) : hash(''),
      el: elVazio(),
      nao: [],
      conf: [],
      lido: (+x.lido > 0) ? Math.floor(+x.lido) : Date.now()
    };
    IDS.forEach(function (el) {
      var ms = (x.el && Array.isArray(x.el[el])) ? x.el[el] : [];
      var vistos = {}, out = [];
      ms.forEach(function (m) {
        if (!m || !isFinite(+m.s) || +m.s < 0) return;
        var s = Math.floor(+m.s), t = String(m.t || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TRECHO);
        if (!t || vistos[s] || out.length >= MAX_MARCAS) return;
        vistos[s] = 1; out.push({ s: s, t: t });
      });
      out.sort(function (a, b) { return a.s - b.s; });
      it.el[el] = out;
    });
    (Array.isArray(x.nao) ? x.nao : []).forEach(function (el) { if (ehEl(el) && it.nao.indexOf(el) < 0) it.nao.push(el); });
    (Array.isArray(x.conf) ? x.conf : []).slice(-200).forEach(function (c) {
      if (c && ehEl(c.el) && (+c.q === 1 || +c.q === 3 || +c.q === 5)) it.conf.push({ el: c.el, q: +c.q, ts: (+c.ts > 0) ? Math.floor(+c.ts) : 0 });
    });
    return it;
  }

  /** Upsert por id preservando o `up` MAIOR — a regra do host como fonte da verdade.
      Devolve lista nova; se o item que chegou é mais velho que o guardado, devolve a
      mesma lista (referência igual), e quem chama sabe que nada mudou. */
  function upsert(lista, item) {
    lista = Array.isArray(lista) ? lista : [];
    if (!item || !item.id) return lista;
    var i = -1;
    for (var k = 0; k < lista.length; k++) if (lista[k] && lista[k].id === item.id) { i = k; break; }
    if (i < 0) return lista.concat([item]);
    if ((+lista[i].up || 0) >= (+item.up || 0)) return lista;
    var out = lista.slice();
    out[i] = item;
    return out;
  }

  raiz.CT_LA = {
    ELEMENTOS: ELEMENTOS, IDS: IDS, VERSAO: VERSAO,
    nova: nova, marcar: marcar, desmarcar: desmarcar, naoHa: naoHa,
    hash: hash, completude: completude, atualizada: atualizada,
    cloze: cloze, renderCloze: renderCloze, conferir: conferir,
    rotulo: rotulo, lacunas: lacunas, cartaoConferencia: cartaoConferencia, LACUNA: LACUNA,
    progresso: progresso, sanear: sanear, upsert: upsert
  };
})(typeof window !== 'undefined' ? window : globalThis);
