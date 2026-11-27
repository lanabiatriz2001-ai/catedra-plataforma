/* ==========================================================================
   Cátedra — FASE ORAL: a resposta gravada NESTE aparelho e a janela de 24 h.

   Duas melhorias da sala de arguição, com a lógica fora do host para ser testada em
   Node (tests/oral-gravacao-24h.mjs). O host (Catedra.dc.html) só liga botões a isto.

   1. JANELA DE 24 H — no formato real, o ponto é sorteado na véspera e a arguição
      acontece 24 h depois. A janela guarda a fila sorteada, a hora do sorteio e a da
      liberação; na hora, a arguição usa exatamente essa fila. É dado da conta
      (`oralJanela`, no autosave do host): o sorteio feito no iPad aparece no Mac.
      Desistir ou começar NÃO esvazia a chave — grava um registro encerrado, com
      conteúdo, porque no sync "vazio nunca apaga cheio" (auth.js): um null aqui
      perderia para o sorteio que ainda está na nuvem e a janela voltaria sozinha.

   2. GRAVAÇÃO — MediaRecorder + getUserMedia({audio:true}). O áudio fica no IndexedDB
      deste aparelho (banco `catedra-oral-gravacoes`), nunca no localStorage, no sync ou
      na rede. Chave: sessão da arguição + índice da pergunta. Limites em LIMITES.
      Sem suporte, sem permissão ou no app nativo (que ainda não pede o microfone), a
      tela mostra o motivo no lugar do botão — nunca um botão que falha calado.
   ========================================================================== */
(function (w) {
  'use strict';

  var DIA = 24 * 60 * 60 * 1000;

  /* Limites da gravação, conservadores de propósito:
     · 10 min por resposta — o maior tempo de resposta que a sala oferece;
     · 12 MB por resposta — cobre 10 min mesmo quando o navegador ignora o pedido de
       32 kbit/s (o Safari grava AAC perto de 128 kbit/s: 10 min ≈ 9,6 MB);
     · 100 MB somando todas as gravações deste aparelho — passou disso, a sala pede
       para apagar gravações antigas antes de gravar outra. */
  var LIMITES = {
    segPorResposta: 600,
    bytesPorResposta: 12 * 1024 * 1024,
    bytesTotal: 100 * 1024 * 1024,
    bitsPorSegundo: 32000
  };

  /* Formato: o primeiro que o MediaRecorder grava E que o <audio> do mesmo navegador toca.
     webm/opus é o do Chrome; o Safari/WebKit cai no audio/mp4. */
  var TIPOS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

  function num(x) { return typeof x === 'number' && isFinite(x); }
  function dois(n) { return (n < 10 ? '0' : '') + n; }

  /* ------------------------------------------------------------- datas locais */
  // Dia de CALENDÁRIO local (getters locais, nunca toISOString: em UTC−4 a data ISO já é
  // "amanhã" das 20h às 24h). 23:30 → 00:10 é outro dia, ainda que só 40 min depois.
  function diaLocal(ts) { var d = new Date(ts); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
  function difDias(ts, agora) { return Math.round((diaLocal(ts) - diaLocal(agora)) / DIA); }
  function hora(ts) { var d = new Date(ts); return dois(d.getHours()) + ':' + dois(d.getMinutes()); }
  /** {dia:'hoje'|'amanhã'|'ontem'|'27/11', relativo:bool, hora:'14:05'} */
  function quando(ts, agora) {
    var n = difDias(ts, agora), d = new Date(ts);
    var rel = n === 0 ? 'hoje' : n === 1 ? 'amanhã' : n === -1 ? 'ontem' : '';
    return { dia: rel || (dois(d.getDate()) + '/' + dois(d.getMonth() + 1)), relativo: !!rel, hora: hora(ts) };
  }

  /* ------------------------------------------------------------- janela de 24 h */
  /** O sorteio guardado. `fila` são as perguntas inteiras (como em oralEstado.fila). */
  function novaJanela(fila, op) {
    op = op || {};
    if (!Array.isArray(fila) || !fila.length) return null;
    var agora = num(op.agora) ? op.agora : Date.now();
    var min = Math.max(1, Math.min(15, parseInt(op.min, 10) || 3));
    return { id: 'janela-' + agora, estado: 'aguardando', fila: fila.slice(), min: min,
      area: op.area || 'juridica', sorteadoEm: agora, liberaEm: agora + DIA, up: agora };
  }
  /** Há um sorteio esperando a arguição (registro encerrado, vazio ou corrompido não conta). */
  function pendente(j) {
    return !!(j && typeof j === 'object' && j.estado === 'aguardando' && Array.isArray(j.fila) && j.fila.length
      && num(j.sorteadoEm) && num(j.liberaEm));
  }
  function liberada(j, agora) { return pendente(j) && (num(agora) ? agora : Date.now()) >= j.liberaEm; }
  /** Desistir ou começar: registro encerrado, COM conteúdo e sem a fila (ver cabeçalho). */
  function encerrar(j, estado, agora, extra) {
    var t = num(agora) ? agora : Date.now();
    var r = { id: (j && j.id) || ('janela-' + t), estado: estado === 'iniciada' ? 'iniciada' : 'desistida',
      sorteadoEm: (j && j.sorteadoEm) || 0, liberaEm: (j && j.liberaEm) || 0, encerradaEm: t, up: t };
    if (extra && extra.sessaoId) r.sessaoId = String(extra.sessaoId);
    return r;
  }
  function rotuloLiberacao(j, agora) {
    if (!pendente(j)) return '';
    var t = num(agora) ? agora : Date.now(), q = quando(j.liberaEm, t);
    if (t >= j.liberaEm) return 'Arguição liberada desde ' + q.dia + ' às ' + q.hora;
    return 'Arguição liberada ' + (q.relativo ? q.dia : 'em ' + q.dia) + ' às ' + q.hora;
  }
  function rotuloSorteio(j, agora) {
    if (!j || !num(j.sorteadoEm)) return '';
    var q = quando(j.sorteadoEm, num(agora) ? agora : Date.now());
    return 'Sorteado ' + (q.relativo ? q.dia : 'em ' + q.dia) + ' às ' + q.hora;
  }
  /* O que se mostra durante a janela: disciplina, ponto, concurso de origem e o programa
     publicado do ponto (`topicos`), quando o acervo o tem. Nunca o enunciado nem o padrão:
     ler a pergunta antes não treina nada. A extração do PDF emenda no `topicos` o título
     "PADRÃO DE RESPOSTA" e o começo da resposta oficial (391 dos 392 itens com tópicos, em
     25/11/2026): corta-se no primeiro "PADRÃO" em maiúsculas, que nenhum programa usa. */
  function limpaTopicos(t) {
    var s = String(t || ''), i = s.search(/PADR[ÃA]O/);
    return (i >= 0 ? s.slice(0, i) : s).replace(/\s+/g, ' ').trim();
  }
  function pontosDaFila(fila) {
    var grupos = [], porChave = {};
    (Array.isArray(fila) ? fila : []).forEach(function (q) {
      if (!q) return;
      var titulo = String(q.disciplina || q.carreira || 'Prova oral').trim();
      var origem = [q.orgao, q.ano, q.cargo].filter(Boolean).join(' · ');
      var ponto = q.ponto ? 'Ponto ' + q.ponto : '';
      var k = titulo + '|' + ponto + '|' + origem, g = porChave[k];
      if (!g) { g = porChave[k] = { titulo: titulo, ponto: ponto, origem: origem, topicos: '', n: 0 }; grupos.push(g); }
      g.n++;
      var t = limpaTopicos(q.topicos);
      if (t && g.topicos.indexOf(t) < 0) g.topicos = g.topicos ? g.topicos + ' ' + t : t;
    });
    return grupos.map(function (g) {
      return { titulo: g.titulo, topicos: g.topicos,
        detalhe: [g.ponto, g.origem, g.n === 1 ? '1 pergunta' : g.n + ' perguntas'].filter(Boolean).join(' · ') };
    });
  }
  /* A mesma regra do iniciarArguicao do host (PR #282, "Respeita a quantidade de perguntas
     escolhida na arguição"): embaralha o acervo filtrado e tira EXATAMENTE a quantidade
     escolhida, sem repetir. Com menos perguntas que isso não há sorteio, como a sala não
     abre: 4 perguntas para 5 escolhidas não viram um sorteio de 4. Só o momento muda. */
  function sortearFila(pool, qtd, aleatorio) {
    var r = typeof aleatorio === 'function' ? aleatorio : Math.random, n = parseInt(qtd, 10);
    if (!Array.isArray(pool) || !(n > 0) || pool.length < n) return null;
    var emb = pool.slice();
    for (var i = emb.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), x = emb[i]; emb[i] = emb[j]; emb[j] = x; }
    return emb.slice(0, n);
  }

  /* ------------------------------------------------------------- gravação: regras puras */
  function escolherTipo(grava, toca) {
    for (var i = 0; i < TIPOS.length; i++) {
      var t = TIPOS[i], pode = false;
      try { pode = !!grava(t); } catch (e) { pode = false; }
      if (!pode) continue;
      if (typeof toca === 'function') {
        var r = '';
        try { r = String(toca(t.split(';')[0]) || ''); } catch (e) { r = 'maybe'; }
        if (!r) continue;
      }
      return t;
    }
    return '';   // nenhum da lista: o gravador usa o formato padrão do navegador
  }
  var MOTIVOS = {
    nativo: 'Gravação indisponível neste aparelho: o app do Mac e do iPad ainda não pede acesso ao microfone. Para gravar, abra a Cátedra no navegador.',
    inseguro: 'Gravação indisponível nesta página: o navegador só libera o microfone em conexão segura.',
    semGravador: 'Gravação indisponível neste aparelho: este navegador não grava áudio.',
    semArmazenamento: 'Gravação indisponível neste aparelho: o navegador não permite guardar o áudio aqui.',
    negado: 'Gravação indisponível: o microfone está bloqueado para este site. Libere o microfone nas configurações do navegador e recarregue a página.',
    semMicrofone: 'Gravação indisponível: nenhum microfone foi encontrado neste aparelho.',
    erro: 'Gravação indisponível: o microfone não abriu neste aparelho.'
  };
  /** Pode mostrar o botão? Senão, o porquê em uma frase. */
  function suporte(a) {
    a = a || {};
    if (a.nativo) return { ok: false, motivo: MOTIVOS.nativo };
    if (a.seguro === false) return { ok: false, motivo: MOTIVOS.inseguro };
    if (!a.temMediaRecorder || !a.temGetUserMedia) return { ok: false, motivo: MOTIVOS.semGravador };
    if (!a.temIndexedDB) return { ok: false, motivo: MOTIVOS.semArmazenamento };
    if (a.falha === 'negado') return { ok: false, motivo: MOTIVOS.negado };
    if (a.falha === 'sem-microfone') return { ok: false, motivo: MOTIVOS.semMicrofone };
    if (a.falha) return { ok: false, motivo: MOTIVOS.erro };
    return { ok: true, motivo: '' };
  }
  function falhaDoErro(e) {
    var n = (e && e.name) || '';
    if (n === 'NotAllowedError' || n === 'SecurityError' || n === 'PermissionDeniedError') return 'negado';
    if (n === 'NotFoundError' || n === 'DevicesNotFoundError' || n === 'OverconstrainedError') return 'sem-microfone';
    return 'erro';
  }
  function chave(sessaoId, idx) { return String(sessaoId || '') + '|' + (parseInt(idx, 10) || 0); }
  /** Índice da pergunta no registro da arguição (`id` = documento + '#' + índice). */
  function idxDoRegistro(r) {
    var id = String((r && r.id) || ''), i = id.lastIndexOf('#');
    var n = i >= 0 ? parseInt(id.slice(i + 1), 10) : NaN;
    return isFinite(n) ? n : -1;
  }
  function cabe(total, limite) { return (+total || 0) < (limite || LIMITES.bytesTotal); }
  /* Gravações cuja arguição não existe mais em lugar nenhum (nem no histórico nem na
     lixeira): a arguição foi apagada de vez, aqui ou no outro aparelho. Só olha o que é da
     mesma conta e da mesma área do caderno aberto; sem nenhuma sessão viva conhecida, não
     apaga nada (memória que ainda não carregou não pode decidir apagar áudio). */
  function orfas(lista, ctx) {
    ctx = ctx || {};
    var vivos = ctx.vivos || {};
    if (!Object.keys(vivos).length) return [];
    return (Array.isArray(lista) ? lista : []).filter(function (m) {
      return m && m.id && m.conta === ctx.conta && m.area === ctx.area && !vivos[m.sessaoId];
    }).map(function (m) { return m.id; });
  }
  function duracao(seg) { seg = Math.max(0, Math.round(+seg || 0)); return Math.floor(seg / 60) + ':' + dois(seg % 60); }
  function tamanho(bytes) {
    var mb = (+bytes || 0) / (1024 * 1024);
    return String(mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10).replace('.', ',') + ' MB';
  }

  /* ------------------------------------------------------------- gravação: o gravador */
  function soltar(fluxo) {
    try { (fluxo && fluxo.getTracks ? fluxo.getTracks() : []).forEach(function (t) { try { t.stop(); } catch (e) {} }); } catch (e) {}
  }
  /* Abre o microfone e grava. op: {md, MR, tipo, limites, agora, aoTique(seg), aoTerminar(r)}.
     Devolve Promise<controle>; o controle para, pausa e retoma. aoTerminar recebe
     {blob, mime, dur, bytes, motivo} — motivo: 'manual' | 'limite' | 'bytes' | 'erro' |
     'interrompida' (o gravador parou sem ninguém pedir: trilha do microfone encerrada pelo
     sistema, fone desligado) | o que o host passar ao parar. O microfone é solto (trilhas
     paradas) assim que a gravação termina. */
  function gravar(op) {
    var L = op.limites || LIMITES;
    var agora = typeof op.agora === 'function' ? op.agora : function () { return Date.now(); };
    return op.md.getUserMedia({ audio: true }).then(function (fluxo) {
      var opcoes = {};
      if (op.tipo) opcoes.mimeType = op.tipo;
      if (L.bitsPorSegundo) opcoes.audioBitsPerSecond = L.bitsPorSegundo;
      var mr;
      try { mr = new op.MR(fluxo, opcoes); }
      catch (e) { try { mr = new op.MR(fluxo); } catch (e2) { soltar(fluxo); throw e2; } }
      var partes = [], bytes = 0, ini = agora(), pausadoTotal = 0, pausadaEm = 0;
      var motivo = 'manual', durFinal = null, terminou = false, tique = null;
      // depois de parar, o tempo congela: a tela não pode seguir contando o que não grava
      function seg() { if (durFinal != null) return durFinal; var fim = pausadaEm || agora(); return Math.max(0, (fim - ini - pausadoTotal) / 1000); }
      function finalizar() {
        if (terminou) return;
        terminou = true; w.clearInterval(tique); soltar(fluxo);
        var tipo = mr.mimeType || op.tipo || (partes[0] && partes[0].type) || 'audio/webm';
        var blob = new w.Blob(partes, { type: tipo });
        if (op.aoTerminar) op.aoTerminar({ blob: blob, mime: tipo, dur: Math.round(durFinal != null ? durFinal : seg()), bytes: blob.size, motivo: motivo });
      }
      function parar(m) {
        if (terminou || durFinal != null) return;
        motivo = m || 'manual'; durFinal = seg(); w.clearInterval(tique);
        if (mr.state === 'inactive') { finalizar(); return; }
        try { mr.stop(); } catch (e) { finalizar(); }
      }
      mr.ondataavailable = function (ev) {
        if (ev && ev.data && ev.data.size) { partes.push(ev.data); bytes += ev.data.size; if (bytes >= L.bytesPorResposta) parar('bytes'); }
      };
      // parou sem ninguém pedir (o sistema encerrou a trilha): o motivo diz isso, não "manual"
      mr.onstop = function () { if (durFinal == null) { motivo = 'interrompida'; durFinal = seg(); w.clearInterval(tique); } finalizar(); };
      mr.onerror = function () { parar('erro'); };
      try { (fluxo && fluxo.getTracks ? fluxo.getTracks() : []).forEach(function (t) { if (t && t.addEventListener) t.addEventListener('ended', function () { parar('interrompida'); }); }); } catch (e) {}
      // start() que lança não pode deixar o microfone aberto (o indicador ficaria aceso)
      try { mr.start(1000); } catch (e) { soltar(fluxo); throw e; }
      tique = w.setInterval(function () {
        var s = seg();
        if (s >= L.segPorResposta) parar('limite');
        else if (op.aoTique) op.aoTique(s);
      }, 1000);
      return {
        parar: parar,
        pausar: function () {
          if (terminou || mr.state !== 'recording' || typeof mr.pause !== 'function') return false;
          try { mr.pause(); pausadaEm = agora(); return true; } catch (e) { return false; }
        },
        retomar: function () {
          if (terminou || mr.state !== 'paused' || typeof mr.resume !== 'function') return false;
          try { mr.resume(); pausadoTotal += agora() - pausadaEm; pausadaEm = 0; return true; } catch (e) { return false; }
        },
        estado: function () { return terminou ? 'inactive' : mr.state; },
        seg: seg
      };
    });
  }
  function paraBuffer(blob) {
    if (blob && typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
    return new Promise(function (ok, falha) {
      try { var fr = new w.FileReader(); fr.onload = function () { ok(fr.result); }; fr.onerror = function () { falha(fr.error); }; fr.readAsArrayBuffer(blob); }
      catch (e) { falha(e); }
    });
  }

  /* ------------------------------------------------------------- IndexedDB (só este aparelho) */
  // Duas lojas: `meta` (leve, com índice por sessão — é o que se lista e soma) e `audio`
  // (os bytes, lidos só para tocar). Assim somar o espaço não carrega 100 MB de áudio.
  var DB_NOME = 'catedra-oral-gravacoes', DB_VER = 1, AUDIO = 'audio', META = 'meta';
  var dbP = null, conexao = null;
  // A conexão aberta não é eterna: o Safari do iPad a fecha com a aba em segundo plano, e outra
  // aba pode pedir versão nova. Caída, a próxima operação abre outra em vez de falhar até recarregar.
  function esquecer(d) { if (d && conexao === d) { conexao = null; dbP = null; } }
  function db() {
    if (dbP) return dbP;
    dbP = new Promise(function (ok) {
      var idb = w.indexedDB, r;
      if (!idb) return ok(null);
      try { r = idb.open(DB_NOME, DB_VER); } catch (e) { return ok(null); }
      r.onupgradeneeded = function () {
        try {
          var d = r.result;
          if (!d.objectStoreNames.contains(AUDIO)) d.createObjectStore(AUDIO);
          if (!d.objectStoreNames.contains(META)) d.createObjectStore(META, { keyPath: 'id' }).createIndex('sessaoId', 'sessaoId', { unique: false });
        } catch (e) {}
      };
      r.onsuccess = function () {
        var d = r.result;
        conexao = d;
        d.onclose = function () { esquecer(d); };
        d.onversionchange = function () { try { d.close(); } catch (e) {} esquecer(d); };
        ok(d);
      };
      r.onerror = function () { ok(null); };     // janela privada, cota, banco bloqueado
      r.onblocked = function () { ok(null); };
    }).then(function (d) { if (!d) dbP = null; return d; });   // falhou: tenta de novo na próxima
    return dbP;
  }
  function tx(lojas, modo, corpo, deNovo) {
    return db().then(function (d) {
      if (!d) return null;
      var t;
      try { t = d.transaction(lojas, modo); }
      catch (e) {
        // InvalidStateError: a conexão caiu sem avisar. Esquece e tenta uma vez com outra.
        try { d.close(); } catch (e2) {}
        esquecer(d);
        return deNovo ? null : tx(lojas, modo, corpo, true);
      }
      return new Promise(function (ok) {
        var out = { v: null };
        try { corpo(t, out); }
        catch (e) { try { t.abort(); } catch (e2) {} return ok(null); }
        t.oncomplete = function () { ok(out.v); };
        t.onerror = function () { ok(null); };
        t.onabort = function () { ok(null); };
      });
    });
  }
  var loja = {
    /** Grava (ou substitui) a resposta. Promise<bool>. */
    guardar: function (meta, dados) {
      return tx([AUDIO, META], 'readwrite', function (t, out) {
        t.objectStore(AUDIO).put(dados, meta.id); t.objectStore(META).put(meta); out.v = true;
      }).then(function (v) { return v === true; });
    },
    /** As gravações de uma arguição. Promise<[{meta, dados}]>. */
    daSessao: function (sessaoId) {
      return tx([AUDIO, META], 'readonly', function (t, out) {
        out.v = [];
        var q = t.objectStore(META).index('sessaoId').getAll(String(sessaoId));
        q.onsuccess = function () {
          (q.result || []).forEach(function (m) {
            var a = t.objectStore(AUDIO).get(m.id);
            a.onsuccess = function () { if (a.result) out.v.push({ meta: m, dados: a.result }); };
          });
        };
      }).then(function (v) { return v || []; });
    },
    /** Só os metadados de tudo (para somar o espaço e achar órfãs). */
    resumo: function () {
      return tx([META], 'readonly', function (t, out) {
        var q = t.objectStore(META).getAll();
        q.onsuccess = function () { out.v = q.result || []; };
      }).then(function (v) { return v || []; });
    },
    total: function () {
      return loja.resumo().then(function (l) { return l.reduce(function (s, m) { return s + (+m.bytes || 0); }, 0); });
    },
    /** Apaga gravações pela chave. Promise<n>. */
    apagar: function (ids) {
      ids = (ids || []).filter(Boolean);
      if (!ids.length) return Promise.resolve(0);
      return tx([AUDIO, META], 'readwrite', function (t, out) {
        ids.forEach(function (id) { t.objectStore(AUDIO).delete(id); t.objectStore(META).delete(id); });
        out.v = ids.length;
      }).then(function (v) { return v || 0; });
    },
    /** Apaga tudo o que foi gravado nas arguições dadas. Promise<[chaves apagadas]>. */
    apagarSessoes: function (sessaoIds) {
      var alvo = {};
      (sessaoIds || []).forEach(function (s) { if (s) alvo[String(s)] = 1; });
      if (!Object.keys(alvo).length) return Promise.resolve([]);
      return loja.resumo().then(function (l) {
        var ids = l.filter(function (m) { return alvo[m.sessaoId]; }).map(function (m) { return m.id; });
        return loja.apagar(ids).then(function () { return ids; });
      });
    }
  };

  /* O webm do MediaRecorder do Chrome sai sem a duração no cabeçalho (duration = Infinity): o
     tocador não mostra o total e a barra não deixa voltar a um trecho da resposta. Pedir o
     fim do arquivo faz o navegador medi-lo; medido, volta ao começo. Só nos tocadores das
     gravações (.ct-oral-audio). loadedmetadata não borbulha: a escuta é na captura. */
  function consertarDuracao(ev) {
    var a = ev && ev.target;
    if (!a || a.tagName !== 'AUDIO' || !a.closest || !a.closest('.ct-oral-audio')) return;
    if (a.duration !== Infinity || a.__ctMedindo) return;
    a.__ctMedindo = true;
    function limpar() { a.removeEventListener('durationchange', volta); a.removeEventListener('timeupdate', volta); a.__ctMedindo = false; }
    function volta() {
      if (a.duration === Infinity) return;   // ainda medindo
      limpar();
      try { a.currentTime = 0; } catch (e) {}
    }
    a.addEventListener('durationchange', volta); a.addEventListener('timeupdate', volta);
    try { a.currentTime = 1e101; } catch (e) { limpar(); }
  }
  /* O molde da tela não traz src no <audio>. O parser do navegador cria os elementos do molde
     cru (<x-dc>) antes de o runtime montar o app, e um src="{{ … }}" ali começava a carregar a
     URL literal: com preload="none" o Chrome e o Safari do Mac paravam antes do pedido, o WebKit
     do Linux o fez (CI do PR #273). A URL vai em data-grav-src e entra aqui, depois de montar
     (componentDidUpdate do host, como o src dos satélites), e só o blob da gravação deste
     aparelho. A mesma URL não recarrega o tocador. Devolve quantos tocadores ganharam src. */
  function ligarTocadores(raiz) {
    var lista, n = 0;
    try { lista = (raiz || w.document).querySelectorAll('.ct-oral-audio audio[data-grav-src]'); } catch (e) { return 0; }
    for (var i = 0; i < lista.length; i++) {
      var a = lista[i], url = String(a.getAttribute('data-grav-src') || '');
      if (url.indexOf('blob:') !== 0 || a.getAttribute('src') === url) continue;
      a.setAttribute('src', url);
      n++;
    }
    return n;
  }
  try {
    if (w.document && w.document.addEventListener) w.document.addEventListener('loadedmetadata', consertarDuracao, true);
  } catch (e) {}

  w.CT_ORAL_GRAV = {
    DIA: DIA, LIMITES: LIMITES, TIPOS: TIPOS, MOTIVOS: MOTIVOS,
    // janela de 24 h
    novaJanela: novaJanela, pendente: pendente, liberada: liberada, encerrar: encerrar,
    rotuloLiberacao: rotuloLiberacao, rotuloSorteio: rotuloSorteio, quando: quando,
    pontosDaFila: pontosDaFila, sortearFila: sortearFila, limpaTopicos: limpaTopicos,
    // gravação
    escolherTipo: escolherTipo, suporte: suporte, falhaDoErro: falhaDoErro, chave: chave,
    idxDoRegistro: idxDoRegistro, cabe: cabe, orfas: orfas, duracao: duracao, tamanho: tamanho,
    gravar: gravar, paraBuffer: paraBuffer, loja: loja, consertarDuracao: consertarDuracao, ligarTocadores: ligarTocadores
  };
})(typeof window !== 'undefined' ? window : this);
