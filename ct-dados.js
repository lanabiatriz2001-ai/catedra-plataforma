/* ==========================================================================
   Cátedra — CARREGAMENTO SOB DEMANDA dos acervos grandes.

   Antes, abrir um único verbete baixava e parseava o arquivo inteiro: 9,6 MB de
   juris-text.js, 8,6 MB de contas-text.js, 4,2 MB de leis-seca.js. Agora cada
   acervo está fatiado em dados/<nome>/ (ver scripts/build-fatias.mjs) e só o
   bloco que contém a chave pedida atravessa a rede.

   Três camadas de cache, da mais barata para a mais cara:
     1. memória      — o bloco já parseado, enquanto a aba viver;
     2. IndexedDB    — o bloco parseado sobrevive ao fechamento do app e ao modo
                       offline, sem repetir o JSON.parse;
     3. Cache Storage— o service worker guarda a resposta HTTP (sw.js), o que
                       cobre o primeiro acesso de outra aba e o offline puro.

   O nome de cada bloco carrega o hash do conteúdo, então bloco nunca "vence":
   quando o dado muda, muda o nome, e o registro velho é descartado sozinho na
   próxima leitura do manifesto.

   Uso:
     await CTDados.pronto('juris-text');            // opcional: baixa o manifesto
     const v = await CTDados.get('juris-text','STJ-SUM-1');
     const m = await CTDados.varios('juris-text', ['a','b','c']);   // agrupa por bloco
     CTDados.aquecer('juris-text', chavesVisiveis); // pré-busca sem esperar

   Se dados/ não estiver publicado, `CTDados.disponivel(nome)` devolve false e o
   chamador continua com o arquivo monolítico — a migração não quebra nada.
   ========================================================================== */
(function (w) {
  'use strict';

  var BASE = 'dados/';
  var DB_NOME = 'catedra-fatias', DB_VER = 1, LOJA = 'blocos';

  var manifestos = {};      // nome -> Promise<manifesto|null>
  var prontos = {};         // nome -> true quando o manifesto chegou e é válido
  var memoria = {};         // nome/arquivo -> objeto já parseado
  var emVoo = {};           // nome/arquivo -> Promise

  /* ---------------------------------------------------------------- IndexedDB */
  var dbP = null;
  function db() {
    if (dbP) return dbP;
    dbP = new Promise(function (ok) {
      if (!w.indexedDB) return ok(null);
      var r;
      try { r = w.indexedDB.open(DB_NOME, DB_VER); } catch (e) { return ok(null); }
      r.onupgradeneeded = function () {
        try { if (!r.result.objectStoreNames.contains(LOJA)) r.result.createObjectStore(LOJA); } catch (e) {}
      };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { ok(null); };       // navegador privado, cota, etc.
      r.onblocked = function () { ok(null); };
    });
    return dbP;
  }
  function idbLer(chave) {
    return db().then(function (d) {
      if (!d) return null;
      return new Promise(function (ok) {
        try {
          var t = d.transaction(LOJA, 'readonly').objectStore(LOJA).get(chave);
          t.onsuccess = function () { ok(t.result || null); };
          t.onerror = function () { ok(null); };
        } catch (e) { ok(null); }
      });
    });
  }
  function idbGravar(chave, valor) {
    return db().then(function (d) {
      if (!d) return;
      return new Promise(function (ok) {
        try {
          var t = d.transaction(LOJA, 'readwrite');
          t.objectStore(LOJA).put(valor, chave);
          t.oncomplete = function () { ok(); };
          t.onerror = function () { ok(); };       // sem espaço: segue sem cache
          t.onabort = function () { ok(); };
        } catch (e) { ok(); }
      });
    });
  }
  function idbChaves() {
    return db().then(function (d) {
      if (!d) return [];
      return new Promise(function (ok) {
        try {
          var t = d.transaction(LOJA, 'readonly').objectStore(LOJA).getAllKeys();
          t.onsuccess = function () { ok(t.result || []); };
          t.onerror = function () { ok([]); };
        } catch (e) { ok([]); }
      });
    });
  }
  function idbApagar(chaves) {
    if (!chaves.length) return Promise.resolve();
    return db().then(function (d) {
      if (!d) return;
      return new Promise(function (ok) {
        try {
          var t = d.transaction(LOJA, 'readwrite'), s = t.objectStore(LOJA);
          chaves.forEach(function (k) { s.delete(k); });
          t.oncomplete = function () { ok(); };
          t.onerror = function () { ok(); };
        } catch (e) { ok(); }
      });
    });
  }

  /* ------------------------------------------------------------------- hash
     FNV-1a de 32 bits — precisa ser IDÊNTICO ao de scripts/build-fatias.mjs.  */
  function fnv1a(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
  }

  /* -------------------------------------------------------------- manifesto */
  function manifesto(nome) {
    if (manifestos[nome]) return manifestos[nome];
    manifestos[nome] = fetch(BASE + nome + '/manifesto.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (m) {
        if (m) { prontos[nome] = true; faxina(nome, m); }   // descarta blocos de versões antigas
        return m;
      })
      .catch(function () { return null; });        // dados/ não publicado: cai no monolito
    return manifestos[nome];
  }

  /* Bloco cujo nome não está mais no manifesto é de uma versão anterior: some. */
  function faxina(nome, m) {
    var vivos = {};
    m.arquivos.forEach(function (a) { vivos[nome + '/' + a] = 1; });
    idbChaves().then(function (ks) {
      var mortos = ks.filter(function (k) {
        return String(k).indexOf(nome + '/') === 0 && !vivos[k];
      });
      if (mortos.length) idbApagar(mortos);
    });
  }

  function arquivoDe(m, chave) {
    if (m.modo === 'chave') return (m.mapa || {})[chave] || null;
    return m.arquivos[fnv1a(String(chave)) % m.n] || null;
  }

  /* ------------------------------------------------------------------ bloco */
  function bloco(nome, arquivo) {
    var k = nome + '/' + arquivo;
    if (memoria[k]) return Promise.resolve(memoria[k]);
    if (emVoo[k]) return emVoo[k];
    emVoo[k] = idbLer(k).then(function (guardado) {
      if (guardado) { memoria[k] = guardado; return guardado; }
      return fetch(BASE + k).then(function (r) {
        if (!r.ok) throw new Error('bloco ' + k + ': ' + r.status);
        return r.json();
      }).then(function (obj) {
        memoria[k] = obj;
        idbGravar(k, obj);                          // sem await: não atrasa a tela
        return obj;
      });
    }).catch(function (e) { delete emVoo[k]; throw e; })
      .then(function (v) { delete emVoo[k]; return v; });
    return emVoo[k];
  }

  /* -------------------------------------------------------------- interface */
  function pronto(nome) { return manifesto(nome).then(function (m) { return !!m; }); }
  /* Resposta SÍNCRONA, para quem precisa decidir na hora entre o bloco e o monolito.
     Só é confiável depois de um `await pronto(nome)`. */
  function disponivel(nome) { return prontos[nome] === true; }

  function get(nome, chave) {
    return manifesto(nome).then(function (m) {
      if (!m) return undefined;
      var a = arquivoDe(m, chave);
      if (!a) return undefined;
      return bloco(nome, a).then(function (o) { return o[chave]; });
    });
  }

  /* Agrupa as chaves por bloco: pedir 40 verbetes da mesma tela costuma tocar
     poucos blocos, e assim cada um é baixado uma vez só. */
  function varios(nome, chaves) {
    return manifesto(nome).then(function (m) {
      if (!m) return {};
      var por = {};
      chaves.forEach(function (c) {
        var a = arquivoDe(m, c);
        if (!a) return;
        (por[a] = por[a] || []).push(c);
      });
      var nomes = Object.keys(por);
      return Promise.all(nomes.map(function (a) {
        return bloco(nome, a).then(function (o) { return { a: a, o: o }; })
          .catch(function () { return { a: a, o: {} }; });
      })).then(function (rs) {
        var saida = {};
        rs.forEach(function (r) { por[r.a].forEach(function (c) { if (c in r.o) saida[c] = r.o[c]; }); });
        return saida;
      });
    });
  }

  /* Pré-busca silenciosa: erro aqui nunca chega ao usuário. */
  function aquecer(nome, chaves) {
    try { varios(nome, chaves).catch(function () {}); } catch (e) {}
  }

  /* Baixa o acervo inteiro e devolve o mapa completo — para telas que precisam
     de tudo (busca textual, exportação) e para o modo offline deliberado. */
  function tudo(nome, aoProgredir) {
    return manifesto(nome).then(function (m) {
      if (!m) return null;
      var feito = 0, saida = {};
      return m.arquivos.reduce(function (p, a) {
        return p.then(function () {
          return bloco(nome, a).then(function (o) {
            Object.keys(o).forEach(function (k) { saida[k] = o[k]; });
            feito++;
            if (typeof aoProgredir === 'function') aoProgredir(feito, m.n);
          }).catch(function () { feito++; });
        });
      }, Promise.resolve()).then(function () { return saida; });
    });
  }

  function limpar() {
    memoria = {}; manifestos = {}; prontos = {};
    return idbChaves().then(idbApagar).then(function () {
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.controller)
          navigator.serviceWorker.controller.postMessage({ type: 'ctPurgarDados' });
      } catch (e) {}
    });
  }

  /* Quantos blocos já estão guardados neste aparelho, por acervo. */
  function espaco() {
    return idbChaves().then(function (ks) {
      var por = {};
      ks.forEach(function (k) { var n = String(k).split('/')[0]; por[n] = (por[n] || 0) + 1; });
      return { total: ks.length, porAcervo: por };
    });
  }

  w.CTDados = { pronto: pronto, disponivel: disponivel, get: get, varios: varios,
                aquecer: aquecer, tudo: tudo, limpar: limpar, espaco: espaco,
                manifesto: manifesto, _fnv1a: fnv1a };
})(typeof window !== 'undefined' ? window : this);
