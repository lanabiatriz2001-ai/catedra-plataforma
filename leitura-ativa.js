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

  /* ===== LA5 — cloze de lei seca: o cartão que ela já faz à mão no Anki =====
     Fidelidade literal ao texto, UM dispositivo por cartão, UMA pergunta por cartão, no
     máximo 3 lacunas na sintaxe do Anki ({{c1::…}}), e "Back Extra" com fundamento +
     explicação curta gerada por regra (sem IA) + alerta só quando a banca tem termo para
     trocar (inverter, do treino.js — opcional: o LEGIS não o carrega, o host sim). */
  var MAX_LACUNAS = 3, MAX_FRONT = 900;
  var RE_NUCLEO_PRAZO = /\b((?:\d{1,3}(?:[.,]\d{1,3})?|um|uma|dois|duas|tr[êe]s|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|quinze|vinte|trinta|quarenta|sessenta|noventa|cento e vinte|cento e oitenta)\s+(?:dias?|anos?|meses|m[êe]s|horas?|minutos?|semanas?|d[ée]cadas?))\b/i;
  var PREFIXO_EXPL = { quem: 'Quem: ', oque: 'O que a norma determina: ', quando: 'Hip\u00f3tese ou momento: ',
    como: 'Forma ou requisito: ', excecao: 'Ressalva: ', proibicao: 'Veda\u00e7\u00e3o: ' };
  // chaves literais no texto da lei (raras) não podem virar lacuna por acidente
  function escapeCloze(s) { return String(s == null ? '' : s).replace(/\{\{/g, '{ {').replace(/\}\}/g, '} }'); }
  /** O termo-chave dentro da marca: em "Há prazo?" é o número + unidade ("cinco anos");
      nos outros elementos é a marca inteira — recall literal, sem inventar recorte. */
  function nucleo(el, t) {
    var s = String(t || '').trim();
    if (el === 'prazo') { var m = RE_NUCLEO_PRAZO.exec(s); if (m) return { t: m[1], i: m.index }; }
    return { t: s, i: 0 };
  }
  /** Corta em `max` sem partir um {{…}} no meio: recua até o fim da lacuna anterior. */
  function cortarSeguro(s, max) {
    s = String(s == null ? '' : s); max = max || MAX_FRONT;
    if (s.length <= max) return s;
    var corte = max, abre = s.lastIndexOf('{{', corte), fecha = s.lastIndexOf('}}', corte);
    if (abre >= 0 && abre > fecha) corte = abre;                 // caiu dentro de uma lacuna
    return s.slice(0, corte).replace(/\s+\S*$/, '') + '\u2026';
  }
  /** Explicação curta, literal, por regra — uma frase. Para o prazo: "Prazo de cinco anos,
      contado de forma ininterrupta e sem oposição" (o resto da marca e o fragmento
      seguinte do texto viram qualificadores). Nunca IA. */
  function explicacao(el, marca, base, nuc) {
    var t = String(marca || '').replace(/\s+/g, ' ').trim().replace(/[.;,]+$/, '');
    if (el === 'prazo' && nuc && nuc.t !== t) {
      var resto = t.replace(nuc.t, ' ').replace(/\s+/g, ' ').trim();
      var frase = 'Prazo de ' + nuc.t;
      if (/ininterrupt/i.test(resto)) frase += ', contado de forma ininterrupta';
      else if (/improrrog/i.test(resto)) frase += ', improrrog\u00e1vel';
      else if (/prorrog/i.test(resto)) frase += ', prorrog\u00e1vel';
      // o fragmento seguinte do texto ("sem oposição", "contados da citação") qualifica o prazo
      var pos = String(base || '').indexOf(marca);
      if (pos >= 0) {
        var depois = String(base).slice(pos + marca.length).replace(/^[\s,;]+/, '');
        var frag = (depois.split(/[,;.]/)[0] || '').trim();
        // "e sem oposição" lê como condição; "contados da citação" é aposto — vírgula
        if (frag && frag.length <= 40 && /^(sem|com|contad[oa]s?|a contar|a partir|desde|ap[\u00f3o]s)\b/i.test(frag)) frase += (/^(sem|com)\b/i.test(frag) ? ' e ' : ', ') + frag;
      }
      return frase;
    }
    if (el === 'prazo') return 'Prazo: ' + t;
    var p = PREFIXO_EXPL[el] || '';
    var frase2 = p + t;
    if (el === 'excecao') frase2 += ' \u2014 fora dela vale a regra';
    return frase2.length > 220 ? frase2.slice(0, 217).replace(/\s+\S*$/, '') + '\u2026' : frase2;
  }
  /**
   * cloze(item, el, txt, opc) → { front, back, extra, tags, termos } | null
   *   txt  texto-base: a proposição do dispositivo (o LEGIS junta o tronco do caput ao
   *        inciso, como proposicoesDoArtigo faz); as marcas são reencontradas por offset
   *        ou por indexOf, o padrão de renderGr.
   *   opc  { inverter: fn(txt) → {de, para} | null (CT_TREINO.inverter, se houver),
   *          situacao: 'revogado' | 'vetado' | '' }
   */
  function cloze(item, el, txt, opc) {
    if (!item || !ehEl(el)) return null;
    opc = opc || {};
    var base = String(txt == null ? '' : txt).replace(/\s+/g, ' ').trim();
    var ms = ((item.el && item.el[el]) || []).map(function (m) {
      if (!m || !m.t) return null;
      var i = (m.s != null && base.substr(m.s, m.t.length) === m.t) ? m.s : base.indexOf(m.t);
      if (i < 0) return null;
      var nuc = nucleo(el, m.t);
      return { a: i + nuc.i, b: i + nuc.i + nuc.t.length, t: nuc.t, marca: m.t, nuc: nuc };
    }).filter(function (x) { return !!x; }).sort(function (a, b) { return a.a - b.a; });
    // sem sobreposição; no máximo 3 lacunas — as excedentes ficam visíveis
    var limpas = [], fim = -1;
    ms.forEach(function (m) { if (m.a >= fim && limpas.length < MAX_LACUNAS) { limpas.push(m); fim = m.b; } });
    if (!limpas.length) return null;
    var front = '', back = '', pos = 0;
    limpas.forEach(function (m, i) {
      front += escapeCloze(base.slice(pos, m.a)) + '{{c' + (i + 1) + '::' + escapeCloze(m.t) + '}}';
      back += base.slice(pos, m.a) + '\u00ab' + m.t + '\u00bb';
      pos = m.b;
    });
    front += escapeCloze(base.slice(pos)); back += base.slice(pos);
    var cab = [item.sigla, item.rot].filter(function (x) { return !!x; }).join(' \u00b7 ');
    var extra = (cab ? cab + ' \u00b7 ' : '') + rotulo(el) + ' \u2014 ' + explicacao(el, limpas[0].marca, base, limpas[0].nuc);
    var inverter = opc.inverter || (raiz.CT_TREINO && raiz.CT_TREINO.inverter) || null;
    if (typeof inverter === 'function') {
      for (var k = 0; k < limpas.length; k++) {
        var inv = null; try { inv = inverter(limpas[k].marca); } catch (e) { inv = null; }
        if (inv && inv.de && inv.para && inv.de !== inv.para) { extra += (/[.!?]$/.test(extra) ? '' : '.') + ' A banca costuma trocar \u201c' + inv.de + '\u201d por \u201c' + inv.para + '\u201d.'; break; }
      }
    }
    var sit = String(opc.situacao || '').toLowerCase();
    if (sit === 'revogado' || sit === 'vetado') extra = '(' + sit.toUpperCase() + ') ' + extra;
    return { front: cortarSeguro(front, MAX_FRONT), back: back, extra: extra,
             tags: ['leitura-ativa'].concat(item.sigla ? [String(item.sigla)] : []).concat([el]),
             termos: limpas.map(function (m) { return m.t; }) };
  }
  /** O front em pedaços, para quem renderiza por template (o host): [{t, lacuna, n, w}]. */
  function segmentosCloze(front) {
    var s = String(front == null ? '' : front), re = /\{\{c(\d+)::([\s\S]*?)\}\}/g, out = [], pos = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > pos) out.push({ t: s.slice(pos, m.index), lacuna: false, n: 0, w: 0 });
      out.push({ t: m[2], lacuna: true, n: +m[1], w: Math.min(40, Math.max(3, m[2].length)) });
      pos = m.index + m[0].length;
    }
    if (pos < s.length) out.push({ t: s.slice(pos), lacuna: false, n: 0, w: 0 });
    return out;
  }
  function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /** renderCloze(front, {revelar, el}) → HTML: cada {{cN::x}} vira <span class="la-lacuna la-<el>">
      com largura proporcional ao trecho (ch); ao revelar, o trecho com o fundo da identidade. */
  function renderCloze(front, opc) {
    opc = opc || {};
    var el = ehEl(opc.el) ? opc.el : '', rot = el ? rotulo(el) : '';
    return segmentosCloze(front).map(function (p) {
      if (!p.lacuna) return escHtml(p.t);
      if (opc.revelar) return '<span class="la-lacuna revelada' + (el ? ' la-' + el : '') + '">' + escHtml(p.t) + '</span>';
      return '<span class="la-lacuna' + (el ? ' la-' + el : '') + '" style="display:inline-block;min-width:' + p.w + 'ch" role="img" aria-label="lacuna' + (rot ? ': ' + escHtml(rot) : '') + '">' + LACUNA + (rot ? ' ' + escHtml(rot) : '') + '</span>';
    }).join('');
  }

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
    segmentosCloze: segmentosCloze, cortarSeguro: cortarSeguro, escapeCloze: escapeCloze, MAX_LACUNAS: MAX_LACUNAS,
    progresso: progresso, sanear: sanear, upsert: upsert
  };
})(typeof window !== 'undefined' ? window : globalThis);
