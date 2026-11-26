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
  function explicacao(el, marca, base, nuc, onde) {
    var t = String(marca || '').replace(/\s+/g, ' ').trim().replace(/[.;,]+$/, '');
    if (el === 'prazo' && nuc && nuc.t !== t) {
      var resto = t.replace(nuc.t, ' ').replace(/\s+/g, ' ').trim();
      var frase = 'Prazo de ' + nuc.t;
      if (/ininterrupt/i.test(resto)) frase += ', contado de forma ininterrupta';
      else if (/improrrog/i.test(resto)) frase += ', improrrog\u00e1vel';
      else if (/prorrog/i.test(resto)) frase += ', prorrog\u00e1vel';
      // o fragmento seguinte do texto ("sem oposição", "contados da citação") qualifica o prazo;
      // `onde` é a posição achada da marca (no inciso, nunca no tronco do caput que vem antes)
      var pos = (onde != null && onde >= 0) ? onde : String(base || '').indexOf(marca);
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
   *          situacao: 'revogado' | 'vetado' | '',
   *          desloc: onde o texto do dispositivo começa dentro de txt — o offset da marca é
   *          contado no inciso, e o tronco do caput vem na frente (LA7) }
   */
  function cloze(item, el, txt, opc) {
    if (!item || !ehEl(el)) return null;
    opc = opc || {};
    var base = String(txt == null ? '' : txt).replace(/\s+/g, ' ').trim();
    var desloc = (+opc.desloc > 0 && +opc.desloc < base.length) ? Math.floor(+opc.desloc) : 0;
    var ms = ((item.el && item.el[el]) || []).map(function (m) {
      var achada = acharMarca(base, m, desloc);
      if (!achada) return null;
      var nuc = nucleo(el, achada.t);
      return { a: achada.i + nuc.i, b: achada.i + nuc.i + nuc.t.length, t: nuc.t, marca: achada.t, onde: achada.i, nuc: nuc };
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
    var extra = (cab ? cab + ' \u00b7 ' : '') + rotulo(el) + ' \u2014 ' + explicacao(el, limpas[0].marca, base, limpas[0].nuc, limpas[0].onde);
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
  /* Onde a marca está no texto-base. Sem tronco na frente (desloc 0) é o padrão de renderGr,
     como sempre: o offset, e o indexOf como recurso. Com o tronco do caput na frente do inciso
     ou da alínea (LA7), o offset conta a partir de desloc e a busca nunca volta ao tronco —
     antes, o "a lei" do art. 5º, XXXV virava lacuna no "perante a lei" do caput. E o texto-base
     do inciso perdeu a pontuação final e a inicial maiúscula ("…de lei;" virou "…de lei."): a
     marca casa sem essas duas diferenças, e a lacuna leva o trecho como ele está no texto-base. */
  function acharMarca(base, m, desloc) {
    if (!m || !m.t) return null;
    var t = String(m.t), s = (m.s != null && isFinite(+m.s) && +m.s >= 0) ? desloc + Math.floor(+m.s) : -1;
    if (s >= 0 && base.substr(s, t.length) === t) return { i: s, t: t };
    if (!desloc) { var j = base.indexOf(t); return j >= 0 ? { i: j, t: t } : null; }
    var curta = t.replace(/[\s;,.:]+$/, '');
    if (!curta) return null;
    var minuscula = curta.charAt(0).toLowerCase() + curta.slice(1);
    var casa = function (i) { var p = base.substr(i, curta.length); return p === curta || (i === desloc && p === minuscula); };
    if (s >= desloc && casa(s)) return { i: s, t: base.substr(s, curta.length) };
    var k = base.indexOf(t, desloc);
    if (k >= 0) return { i: k, t: t };
    k = base.indexOf(curta, desloc);
    if (k >= 0) return { i: k, t: curta };
    return casa(desloc) ? { i: desloc, t: base.substr(desloc, curta.length) } : null;
  }

  /* ===== LA7 — o cartão nasce na marcação, no mesmo gesto =====
     Um cartão por dispositivo E por pergunta: o cloze do LA5 tal como é — uma pergunta por
     cartão, no máximo 3 lacunas, cada dispositivo no seu cartão (a regra do deck dela). O id é
     determinístico: marcar de novo a mesma pergunta atualiza o MESMO cartão, e a conferência
     (LA4) e a revisão da pergunta (rv|la|<leitura>|<el>) apontam para ele. */
  function idCartao(leitura, el) {
    var id = (leitura && typeof leitura === 'object') ? leitura.id : leitura;
    id = String(id == null ? '' : id);
    return (id && ehEl(el)) ? 'fc|la|' + id + '|' + el : '';
  }
  /** acharCartao(baralho, leituraId, el) → o id do cartão daquela pergunta: o determinístico;
      se ele ainda não existe, o que a conferência criou antes do LA7 (id 'fc<número>', com
      la.id e la.el) — reaproveitá-lo evita o mesmo trecho duas vezes no Baralho; sem nenhum,
      o determinístico, que é o id do cartão novo. */
  function acharCartao(baralho, leituraId, el) {
    var lid = String(((leituraId && typeof leituraId === 'object') ? leituraId.id : leituraId) || '');
    var id = idCartao(lid, el);
    if (!id) return '';
    var lista = Array.isArray(baralho) ? baralho : [], velho = '';
    for (var k = 0; k < lista.length; k++) {
      var c = lista[k];
      if (!c || !c.id) continue;
      if (c.id === id) return id;
      if (!velho && c.la && c.la.id === lid && c.la.el === el) velho = String(c.id);
    }
    return velho || id;
  }
  /** cartoesDispositivo(item, txt, opc) → {quem: cartão | null, …}: o cloze() de cada pergunta
      com marca (null nas outras). É o que o LEGIS manda junto da leitura — só ele tem o texto
      da lei; o host não recorta nada. */
  function cartoesDispositivo(item, txt, opc) {
    var out = {};
    if (!item || !item.id) return out;
    IDS.forEach(function (el) { out[el] = cloze(item, el, txt, opc); });
    return out;
  }
  /** mudados(antes, depois) → as perguntas cujas marcas este gesto mudou — só elas mexem no
      Baralho. Se a redação do dispositivo mudou ("Confirmar como está"), todas as que têm ou
      tinham marca: o texto dos cartões acompanha a lei. */
  function mudados(antes, depois) {
    if (!depois) return [];
    var marcas = function (it, el) { return JSON.stringify(((it && it.el && it.el[el]) || []).map(function (m) { return [m.s, m.t]; })); };
    var redacao = !!antes && antes.hash !== depois.hash;
    return IDS.filter(function (el) {
      var agora = marcas(depois, el), era = antes ? marcas(antes, el) : '[]';
      return redacao ? (agora !== '[]' || era !== '[]') : agora !== era;
    });
  }
  /* O host recebe o cartão de um iframe: só o conteúdo entra, com tetos, e só cloze de
     verdade — grupos c1..cN seguidos, de 1 a MAX_LACUNAS. Devolve null se não reconhece. */
  function sanearCartao(c) {
    if (!c || typeof c !== 'object') return null;
    var front = String(c.front || ''), back = String(c.back || '');
    var grupos = {}, n = 0, re = /\{\{c(\d+)::/g, m;
    while ((m = re.exec(front))) { if (!grupos[m[1]]) { grupos[m[1]] = 1; n++; } }
    if (!n || n > MAX_LACUNAS || !back.trim()) return null;
    for (var g = 1; g <= n; g++) if (!grupos[g]) return null;
    var palavra = function (t) { return String(t == null ? '' : t).replace(/\s+/g, '_').slice(0, 40); };
    return {
      front: cortarSeguro(front, MAX_FRONT), back: back.slice(0, 1200), extra: String(c.extra || '').slice(0, 900),
      tags: (Array.isArray(c.tags) ? c.tags : []).map(palavra).filter(function (t) { return !!t; }).slice(0, 6),
      termos: (Array.isArray(c.termos) ? c.termos : []).map(function (t) { return String(t == null ? '' : t).slice(0, MAX_TRECHO); }).slice(0, MAX_LACUNAS)
    };
  }
  // campos do agendamento (FSRS), do nascimento e da identidade: o conteúdo novo nunca os toca
  var NAO_E_CONTEUDO = { id: 1, up: 1, criado: 1, dueDate: 1, due: 1, intervalo: 1, facilidade: 1, repeticoes: 1, fsrs: 1 };
  /** O cartão já foi revisado no Baralho: tem agenda (FSRS ou a de antes) ou repetições. */
  function revisado(c) { return !!(c && (c.fsrs || c.dueDate || (+c.repeticoes > 0))); }
  /**
   * fundirCartao(baralho, id, conteudo, agora) → {lista, acao, antes}
   *   Põe o cartão no baralho sem zerar o agendamento: se o id já existe, troca só o
   *   conteúdo (e avança o `up`); dueDate, intervalo, repetições e fsrs ficam. conteudo
   *   null tira o cartão — menos o que já foi revisado: esse FICA, com a agenda e o último
   *   conteúdo, porque um toque na marca não pode apagar o histórico de revisões.
   *   acao: 'criado' | 'atualizado' | 'igual' | 'removido' | 'mantido' | 'nada' — em 'igual',
   *   'mantido' e 'nada' a lista volta a MESMA (referência igual): nada mudou.
   */
  function fundirCartao(baralho, id, conteudo, agora) {
    var lista = Array.isArray(baralho) ? baralho : [];
    id = String(id || '');
    var t = (+agora > 0) ? Math.floor(+agora) : Date.now();
    if (!id) return { lista: lista, acao: 'nada', antes: null };
    var i = -1;
    for (var k = 0; k < lista.length; k++) if (lista[k] && lista[k].id === id) { i = k; break; }
    if (!conteudo || typeof conteudo !== 'object') {
      if (i < 0) return { lista: lista, acao: 'nada', antes: null };
      if (revisado(lista[i])) return { lista: lista, acao: 'mantido', antes: lista[i] };
      return { lista: lista.slice(0, i).concat(lista.slice(i + 1)), acao: 'removido', antes: lista[i] };
    }
    var c, kk;
    if (i < 0) {
      c = { id: id };
      for (kk in conteudo) if (Object.prototype.hasOwnProperty.call(conteudo, kk) && !NAO_E_CONTEUDO[kk]) c[kk] = conteudo[kk];
      c.criado = t; c.up = t;
      return { lista: [c].concat(lista), acao: 'criado', antes: null };
    }
    var velho = lista[i], igual = true;
    for (kk in conteudo) {
      if (!Object.prototype.hasOwnProperty.call(conteudo, kk) || NAO_E_CONTEUDO[kk]) continue;
      if (JSON.stringify(velho[kk]) !== JSON.stringify(conteudo[kk])) { igual = false; break; }
    }
    if (igual) return { lista: lista, acao: 'igual', antes: velho };
    c = {};
    for (kk in velho) if (Object.prototype.hasOwnProperty.call(velho, kk)) c[kk] = velho[kk];
    for (kk in conteudo) if (Object.prototype.hasOwnProperty.call(conteudo, kk) && !NAO_E_CONTEUDO[kk]) c[kk] = conteudo[kk];
    c.id = id;
    c.up = t > (+velho.up || 0) ? t : (+velho.up || 0) + 1;   // o merge por id do auth.js decide pelo maior `up`
    var out = lista.slice(); out[i] = c;
    return { lista: out, acao: 'atualizado', antes: velho };
  }
  /** avisoGesto(feitos, onde) → o aviso ÚNICO do gesto, '' quando não há o que dizer. feitos =
      {criado, removido, mantido, falhou: [el]}: cartão que entrou, que saiu, que ficou por já
      ter revisões ou que não deu para montar. Atualizar não avisa — nada de aviso a cada marca. */
  function avisoGesto(feitos, onde) {
    feitos = feitos || {}; onde = String(onde || '') || 'dispositivo';
    var de = function (k) { return (Array.isArray(feitos[k]) ? feitos[k] : []).filter(ehEl); };
    var c = de('criado'), r = de('removido'), m = de('mantido'), f = de('falhou'), partes = [];
    var um = function (el) { return onde + ' · ' + rotulo(el); };
    if (c.length) partes.push(c.length === 1 ? 'Cartão de ' + um(c[0]) + ' no Baralho' : c.length + ' cartões de ' + onde + ' no Baralho');
    if (r.length) partes.push(r.length === 1 ? 'Cartão de ' + um(r[0]) + ' saiu do Baralho' : r.length + ' cartões de ' + onde + ' saíram do Baralho');
    if (m.length) partes.push(m.length === 1 ? 'O cartão de ' + um(m[0]) + ' fica no Baralho: já tem revisões'
      : m.length + ' cartões de ' + onde + ' ficam no Baralho: já têm revisões');
    if (f.length) partes.push(f.length === 1 ? 'O trecho de ' + rotulo(f[0]) + ' não está no texto de ' + onde + ': o cartão não mudou'
      : 'Os trechos de ' + f.map(rotulo).join(' e ') + ' não estão no texto de ' + onde + ': os cartões não mudaram');
    return partes.join(' · ');
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
     Desde o LA7 o cartão de cada pergunta nasce na marcação (cartoesDispositivo): `criar.fc`
     só faz o host criá-lo quando ainda falta; só o que ela errou ou hesitou vira revisão. */
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

  /**
   * painel(leituras, leiId, dispositivos) → {lidos, pendentes, total, nLidos, completos, pct}
   *   O painel por lei (LA7). `dispositivos` é o que o leitor desenhou, na ordem do texto:
   *   [{gi, rot}]. "Lido ativamente" é a régua de progresso(): o dispositivo tem leitura (é o
   *   número do catálogo); cada lido leva a completude, e completo = as 7 respondidas.
   *   lidos: [{gi, rot, respondidas, total, completo}] · pendentes: [{gi, rot}].
   */
  function painel(leituras, leiId, dispositivos) {
    leiId = String(leiId || '');
    var porGi = {};
    (Array.isArray(leituras) ? leituras : []).forEach(function (x) {
      if (x && x.leiId === leiId && x.gi != null && isFinite(+x.gi)) porGi[Math.floor(+x.gi)] = x;
    });
    var lidos = [], pendentes = [], vistos = {}, dosDispositivos = [];
    (Array.isArray(dispositivos) ? dispositivos : []).forEach(function (d) {
      if (!d || d.gi == null || !isFinite(+d.gi)) return;
      var gi = Math.floor(+d.gi);
      if (vistos[gi]) return;
      vistos[gi] = 1;
      var it = porGi[gi], rot = String(d.rot || (it && it.rot) || '');
      if (!it) { pendentes.push({ gi: gi, rot: rot }); return; }
      var c = completude(it);
      dosDispositivos.push(it);
      lidos.push({ gi: gi, rot: rot, respondidas: c.respondidas, total: c.total, completo: c.respondidas === c.total });
    });
    var total = lidos.length + pendentes.length, p = progresso(dosDispositivos, leiId, total);
    return { lidos: lidos, pendentes: pendentes, total: total, nLidos: p.lidos, completos: p.completos, pct: p.pct };
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
    progresso: progresso, sanear: sanear, upsert: upsert,
    idCartao: idCartao, acharCartao: acharCartao, cartoesDispositivo: cartoesDispositivo, mudados: mudados,
    sanearCartao: sanearCartao, revisado: revisado, fundirCartao: fundirCartao, avisoGesto: avisoGesto,
    painel: painel
  };
})(typeof window !== 'undefined' ? window : globalThis);
