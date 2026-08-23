/* busca-unica.js — o motor da busca do ⌘K (item 6).
 *
 * Uma função PURA, sem DOM e sem dependência do app, para ser testada fora dele
 * (tests/run.mjs). O host monta as fontes (leis, verbetes, peças, ritos), chama
 * `indexar` UMA vez e `buscar` a cada tecla.
 *
 * Ranking: prefixo > palavra inteira > pedaço no meio. Empate desfaz pela ordem da
 * fonte (o catálogo do LEGIS vem por importância), depois pelo título mais curto e por
 * fim alfabeticamente — a lista não dança entre teclas.
 */
(function (w) {
  'use strict';

  /** Sem acento, minúsculas, espaços normalizados — as fontes vêm de lugares diferentes. */
  function normalizar(s) {
    return String(s == null ? '' : s)
      .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ').trim();
  }

  /* Pontuação de um alvo contra o termo. 0 = não casa.
     3 = começa com; 2 = palavra inteira dentro; 1 = pedaço no meio. */
  function pontuar(alvoNorm, termoNorm) {
    if (!termoNorm) return 0;
    if (alvoNorm.startsWith(termoNorm)) return 3;
    var i = alvoNorm.indexOf(termoNorm);
    if (i < 0) return 0;
    var antes = i === 0 ? ' ' : alvoNorm[i - 1];
    return /[\s\-–—(,.:/]/.test(antes) ? 2 : 1;
  }

  /* Sigla pelas iniciais do título: é assim que se procura lei na prática ("cpc", "ctn",
     "cdc"). O catálogo já traz a sigla entre parênteses em algumas normas (LGPD, CLT), mas
     não nos Códigos — sem isto, "cpc" não acha o Código de Processo Civil. */
  var LIGACOES = { de: 1, do: 1, da: 1, dos: 1, das: 1, e: 1, a: 1, o: 1, em: 1, no: 1, na: 1 };
  function iniciais(titulo) {
    return normalizar(titulo).split(' ')
      .filter(function (p) { return p && !LIGACOES[p]; })
      .map(function (p) { return p[0]; }).join('');
  }

  /**
   * Monta o índice plano. Cada fonte é opcional: o host passa o que já carregou.
   * @param fontes {leis:[{t,r,c,u}], verbetes:[[id,tr,fo,nu,ti,ra,te,...]], pecas:{nome:{}}, ritos:{nome:{}}}
   * @returns [{tipo, titulo, extra, arg, _t, _e}]  (_t/_e = versões normalizadas, prontas para buscar)
   */
  function indexar(fontes) {
    var f = fontes || {};
    var out = [];
    var põe = function (tipo, titulo, extra, arg, meta, chave) {
      var t = String(titulo || '').trim();
      if (!t) return;
      // _i = posição na fonte. O catálogo do LEGIS vem em ordem de importância (CF, CC,
      // CPC…), e isso é o desempate certo: sem ele, "cf" acha o Código Florestal antes da
      // Constituição Federal, porque o título é mais curto.
      out.push({ tipo: tipo, titulo: t, extra: String(extra || ''), arg: arg == null ? t : arg,
                 _t: normalizar(t), _e: normalizar(extra),
                 // iniciais só valem para lei — calculá-las nos 15 mil verbetes custa ~25 ms à toa
                 _s: (tipo === 'lei' ? iniciais(t) : ''), _i: out.length,
                 // súmula revogada vai para o fim; verbete marcado como importante sobe
                 _rev: (meta && /revogad|cancelad/i.test(String(meta.si || ''))) ? 1 : 0,
                 _w: (meta && meta.im) ? 1 : 0,
                 // _k = IDENTIDADE, não aparência. Deduplicar por título+extra colapsava o que
                 // é diferente e separava o que é igual: a mesma súmula coletada duas vezes com
                 // ramo/tema escritos diferente virava duas linhas. A chave carrega só o que
                 // torna o item aquele item (tribunal, número, nome canônico).
                 _k: normalizar(chave || (tipo + '|' + t + '|' + (extra || ''))),
                 // o id da fonte fica guardado à parte: `arg` é o que abre a tela (busca textual),
                 // mas quem precisar do registro exato ainda o tem
                 id: (meta && meta.id) || '' });
    };

    (Array.isArray(f.leis) ? f.leis : []).forEach(function (l) {
      // a referência ("Lei nº 8.429/1992") é o que muita gente digita: entra como extra buscável
      põe('lei', l && l.t, (l && l.r) || '', (l && l.t) || '', null, 'lei|' + ((l && l.t) || ''));
    });

    // verbetes: array de arrays do juris-index.js (id:0, tribunal:1, fonte:2, número:3,
    // título:4, ramo:5, tema:6). O título já traz "Súmula 619 do STJ".
    (Array.isArray(f.verbetes) ? f.verbetes : []).forEach(function (v) {
      if (!v) return;
      var titulo = v[4] || ((v[1] || '') + ' ' + (v[3] || ''));
      // v[8] = situação ("Revogada"/"Cancelada"): entra no hint porque decorar súmula
      // caída é o pior desperdício de estudo que existe.
      var extra = [v[1], v[8], v[5], v[6]].filter(Boolean).join(' · ');
      // arg = TÍTULO, não o id: o CátedraJURIS abre por ?q= (busca textual) e não conhece
      // o id interno do índice — mandar "STJ-SUM-619" abriria a página sem resultado.
      // tribunal + número + título. Sem o número (verbete que não é súmula), tribunal +
      // título já bastam — o que NÃO entra é ramo/tema, que variam por quem catalogou.
      var chave = ['verbete', v[1] || '', v[3] || '', titulo].map(normalizar).join('|');
      põe('verbete', titulo, extra, titulo, { si: v[8], im: v[9], id: v[0] }, chave);
    });

    Object.keys(f.pecas || {}).forEach(function (nome) {
      var p = f.pecas[nome] || {};
      põe('peca', nome, [p.rito || 'roteiro de peça', SINONIMOS[nome]].filter(Boolean).join(' · '), nome, null, 'peca|' + nome);
    });

    Object.keys(f.ritos || {}).forEach(function (nome) {
      põe('rito', nome, 'sequência dos atos', nome, null, 'rito|' + nome);
    });

    return out;
  }

  /* As duas peças cujo nome depende de sigla: sem isto, "mandado de segurança" e "ação
     civil pública" não alcançam a peça — só o rito. */
  var SINONIMOS = { 'Sentença em MS': 'mandado de segurança', 'ACP ambiental': 'ação civil pública' };

  var ORDEM = ['lei', 'verbete', 'peca', 'rito'];

  /**
   * @param indice saída de indexar()
   * @param termo texto digitado
   * @param opcoes {porTipo:8}
   * @returns {lei:[...], verbete:[...], peca:[...], rito:[...]} — cada um já ordenado e cortado
   */
  function buscar(indice, termo, opcoes) {
    var q = normalizar(termo);
    var porTipo = (opcoes && opcoes.porTipo) || 8;
    var res = { lei: [], verbete: [], peca: [], rito: [] };
    if (q.length < 2) return res;                       // 1 letra devolveria o acervo inteiro

    (indice || []).forEach(function (it) {
      if (!res[it.tipo]) return;
      var p = pontuar(it._t, q);
      // Sigla pelas iniciais vale só para LEI — é ali que a sigla é o idioma ("CPC", "CTN").
      // Aplicada aos verbetes, casava bobagem: "cpc" achava "Contrato de promessa de compra
      // e venda" (c-p-c-v) antes de qualquer tese sobre o Código de Processo Civil.
      if (!p && it.tipo === 'lei' && it._s && q.length >= 2) {
        p = (it._s === q) ? 3 : (it._s.indexOf(q) === 0 ? 2 : 0);
      }
      // o extra (referência da lei, tribunal/ramo do verbete) vale menos que o título
      if (!p) { var pe = pontuar(it._e, q); if (pe) p = Math.min(1, pe); }
      if (!p) return;
      res[it.tipo].push({ tipo: it.tipo, titulo: it.titulo, extra: it.extra, arg: it.arg, id: it.id, _p: p, _i: it._i, _rev: it._rev, _w: it._w, _k: it._k });
    });

    ORDEM.forEach(function (t) {
      // Desempate: nas LEIS a ordem da fonte é significativa (o catálogo vem por
      // importância: CF, CC, CPC…). Nos verbetes ela é só a ordem de coleta — ali o que
      // ajuda é o título mais curto, que costuma ser a súmula/tese, não o acórdão longo.
      var porFonte = (t === 'lei');
      res[t].sort(function (a, b) {
        return (b._p - a._p)
          || (a._rev - b._rev)                 // súmula revogada nunca vem em primeiro
          || (b._w - a._w)                     // verbete marcado como importante sobe
          || (porFonte ? (a._i - b._i) : 0)
          || (a.titulo.length - b.titulo.length)
          || a.titulo.localeCompare(b.titulo);
      });
      // o acervo tem entradas repetidas (mesma tese em fontes diferentes): uma só na lista
      var visto = {}, limpo = [];
      res[t].forEach(function (x) {
        // Depois de ordenar, e por _k: o primeiro a chegar já é o melhor pelos critérios
        // acima (pontuação, vigência, importância), então quem cai fora é a cópia pior.
        // STF e STJ gravam títulos idênticos ("Súmula 619") e continuam sendo dois itens —
        // o tribunal está na chave. Deduplicar só pelo título escondia uma das duas, e a
        // que sobrava podia ser justamente a REVOGADA.
        var k = x._k || normalizar(x.titulo + '|' + x.extra);
        if (visto[k]) return;
        visto[k] = 1; limpo.push(x);
      });
      res[t] = limpo.slice(0, porTipo);
    });
    return res;
  }

  var api = { normalizar: normalizar, pontuar: pontuar, iniciais: iniciais, indexar: indexar, buscar: buscar, ORDEM: ORDEM };
  w.CT_BUSCA = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
