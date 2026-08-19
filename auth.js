/* auth.js — login real (Supabase Auth) + sincronização de dados na nuvem.
 *
 * Injetado APENAS na build de produção (ver scripts/build.mjs). O Catedra.dc.html
 * permanece intocado. A config (URL + chave PUBLISHABLE, ambas públicas por
 * design) chega em window.CATEDRA_SUPABASE, e o supabase-js é carregado por CDN
 * antes deste arquivo.
 *
 * Como funciona:
 *  - Um "gate" (overlay em tela cheia) cobre o app até resolver a sessão.
 *  - Sem sessão → mostra login/cadastro. Com sessão → baixa os dados da conta
 *    para o localStorage e recarrega (o app lê o localStorage no construtor).
 *  - Toda escrita em catedra:* dispara um upsert (debounced) na tabela user_data.
 *  - "Sair" no app remove catedra:auth → aqui detectamos, deslogamos do Supabase,
 *    limpamos o local e voltamos ao login.
 */
(function () {
  var CFG = window.CATEDRA_SUPABASE || {};
  if (!CFG.url || !CFG.key) return;
  if (!window.supabase || !window.supabase.createClient) {
    console.warn('[Cátedra] supabase-js não carregou; login real desativado (app segue com login local).');
    return;
  }

  var sb = window.supabase.createClient(CFG.url, CFG.key);

  // originais — usados internamente para NÃO disparar o sync em cascata
  var _si = localStorage.setItem.bind(localStorage);
  var _ri = localStorage.removeItem.bind(localStorage);
  // _dirty/_lastSrv/notifSent são meta-estado LOCAL do aparelho — nunca sobem no blob
  var EXCLUDE = { 'catedra:auth': 1, 'catedra:_dirty': 1, 'catedra:_lastSrv': 1, 'catedra:notifSent': 1, 'catedra:_tomb': 1, 'catedra:_bkpFase2': 1, 'catedra:_owner': 1 };

  // ---------- LÁPIDES (tombstones): fazem a EXCLUSÃO valer ----------
  // Sem isto, apagar nunca "pega": o merge une arrays por id (o cartão/erro apagado volta
  // do servidor) e, quando a chave some do local, o servidor a restaura (a data da prova volta).
  // Guardamos o que foi apagado e o merge passa a IGNORAR esses itens vindos da nuvem.
  // Meta-estado local (não sobe no blob).
  // Lápides mais velhas que isto são podadas (a exclusão já propagou há muito) —
  // evita que catedra:_tomb cresça para sempre.
  var TOMB_TTL = 365 * 24 * 3600 * 1000;
  function tombPrune(t) {
    try {
      var min = Date.now() - TOMB_TTL;
      if (t.keys) Object.keys(t.keys).forEach(function (k) { if (t.keys[k] < min) delete t.keys[k]; });
      if (t.arr) Object.keys(t.arr).forEach(function (k) {
        Object.keys(t.arr[k]).forEach(function (id) { if (t.arr[k][id] < min) delete t.arr[k][id]; });
        if (!Object.keys(t.arr[k]).length) delete t.arr[k];
      });
      if (t.hl) Object.keys(t.hl).forEach(function (b) {
        Object.keys(t.hl[b]).forEach(function (id) { if (t.hl[b][id] < min) delete t.hl[b][id]; });
        if (!Object.keys(t.hl[b]).length) delete t.hl[b];
      });
    } catch (_) {}
    return t;
  }
  function tombLoad() { try { return JSON.parse(localStorage.getItem('catedra:_tomb') || '{}') || {}; } catch (_) { return {}; } }
  function tombSave(t) { try { _si('catedra:_tomb', JSON.stringify(tombPrune(t))); } catch (_) {} }
  function tombIds(k) { var t = tombLoad(); return (t.arr && t.arr[k]) || {}; }
  function tombKeyTs(k) { var t = tombLoad(); return (t.keys && t.keys[k]) || 0; }
  function tombHlIds(book) { var t = tombLoad(); return (t.hl && t.hl[book]) || {}; }
  // registra ids que sumiram de um array e limpa a lápide da própria chave (foi reescrita)
  function tombOnSet(k, newVal) {
    try {
      var t = tombLoad();
      if (t.keys && t.keys[k]) { delete t.keys[k]; }           // a chave voltou a existir
      if (ARRAY_ID[k] || k === 'catedra:lib') {
        var before = parseJ(localStorage.getItem(k)) || [], after = parseJ(newVal) || [];
        if (Array.isArray(before) && Array.isArray(after)) {
          var live = {}; after.forEach(function (it) { if (it && it.id != null) live[it.id] = 1; });
          var now = Date.now();
          before.forEach(function (it) {
            if (it && it.id != null && !live[it.id]) {
              t.arr = t.arr || {}; t.arr[k] = t.arr[k] || {}; t.arr[k][it.id] = now;
            }
          });
          // item recriado com o mesmo id deixa de estar apagado
          if (t.arr && t.arr[k]) { after.forEach(function (it) { if (it && it.id != null) delete t.arr[k][it.id]; }); }
        }
      }
      // Grifos (catedra:hl = {livro: [itens com id]}): mesma regra dos arrays, por livro.
      // Sem isto, apagar um grifo não colava — o mergeHl (união por id) o trazia de volta.
      if (k === 'catedra:hl') {
        var b4 = parseJ(localStorage.getItem(k)), aft = parseJ(newVal);
        if (b4 && typeof b4 === 'object' && aft && typeof aft === 'object') {
          var now2 = Date.now();
          Object.keys(b4).forEach(function (book) {
            var liveH = {};
            (Array.isArray(aft[book]) ? aft[book] : []).forEach(function (it) { if (it && it.id != null) liveH[it.id] = 1; });
            (Array.isArray(b4[book]) ? b4[book] : []).forEach(function (it) {
              if (it && it.id != null && !liveH[it.id]) {
                t.hl = t.hl || {}; t.hl[book] = t.hl[book] || {}; t.hl[book][it.id] = now2;
              }
            });
          });
          // grifo recriado com o mesmo id deixa de estar apagado
          if (t.hl) Object.keys(aft).forEach(function (book) {
            if (!t.hl[book]) return;
            (Array.isArray(aft[book]) ? aft[book] : []).forEach(function (it) { if (it && it.id != null) delete t.hl[book][it.id]; });
          });
        }
      }
      tombSave(t);
    } catch (_) {}
  }
  function tombOnRemove(k) {
    try { var t = tombLoad(); t.keys = t.keys || {}; t.keys[k] = Date.now(); tombSave(t); } catch (_) {}
  }
  // tira do array mesclado tudo que foi apagado neste aparelho (a menos que seja mais novo que a lápide)
  function dropTombed(k, arr) {
    if (!Array.isArray(arr)) return arr;
    var tomb = tombIds(k);
    if (!tomb || !Object.keys(tomb).length) return arr;
    return arr.filter(function (it) {
      if (!it || it.id == null) return true;
      var ts = tomb[it.id];
      if (!ts) return true;
      return stamp(it) > ts;   // recriado/editado DEPOIS de apagado → mantém
    });
  }
  function isData(k) { return k && k.indexOf('catedra:') === 0 && !EXCLUDE[k]; }

  function collect() { var o = {}; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (isData(k)) o[k] = localStorage.getItem(k); } return o; }
  // Não sobe PDFs (base64 pesado) da biblioteca para a nuvem — ficam LOCAIS no aparelho.
  // Tira pdfB64/pages/_bytes de catedra:lib só na hora de subir; o merge reanexa os locais.
  function stripLib(str) {
    try { var lib = JSON.parse(str); if (!Array.isArray(lib)) return str;
      var lean = lib.map(function (b) { if (b && (b.pdfB64 || b.pages || b._bytes)) { var c = {}; for (var kk in b) if (kk !== 'pdfB64' && kk !== 'pages' && kk !== '_bytes') c[kk] = b[kk]; c._pdfLocal = true; return c; } return b; });
      return JSON.stringify(lean);
    } catch (e) { return str; }
  }
  function leanForUpload(obj) { if (!obj) return obj; var o = {}; Object.keys(obj).forEach(function (k) { o[k] = (k === 'catedra:lib') ? stripLib(obj[k]) : obj[k]; }); return o; }
  function applyData(d) { if (!d) return; Object.keys(d).forEach(function (k) { if (isData(k)) { try { _si(k, d[k]); } catch (_) {} } }); }
  function clearLocal() { var r = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('catedra:') === 0) r.push(k); } r.forEach(function (k) { _ri(k); }); }

  var user = null, hydrating = true, pushT = null, authToken = null, pushing = false;
  // mantém o token do usuário em cache (para o flush com keepalive ao fechar a aba)
  // O link de redefinição chega como #type=recovery (fluxo implícito) ou ?code=… com
  // ?type=recovery (PKCE). Marcamos ANTES de qualquer coisa: o supabase-js abre a sessão
  // sozinho a partir da URL, e sem esta marca o app entraria direto e a pessoa nunca
  // chegaria a trocar a senha que esqueceu.
  var ehRecuperacao = false;
  try {
    var h = String(location.hash || ''), q = String(location.search || '');
    ehRecuperacao = /type=recovery/.test(h) || /type=recovery/.test(q);
  } catch (_) {}

  sb.auth.onAuthStateChange(function (_e, session) {
    authToken = session && session.access_token;
    if (_e === 'PASSWORD_RECOVERY') { ehRecuperacao = true; showNovaSenha(); }
  });

  // ---------- estado real de sync (exposto ao app) ----------
  var syncStatus = 'local';
  function setStatus(s) {
    syncStatus = s;
    try { window.dispatchEvent(new CustomEvent('catedra:syncstate', { detail: { status: s } })); } catch (_) {}
  }
  function isDirty() { try { return localStorage.getItem('catedra:_dirty') === '1'; } catch (_) { return false; } }
  function setDirty(v) { try { if (v) _si('catedra:_dirty', '1'); else _ri('catedra:_dirty'); } catch (_) {} }
  function lastSrv() { try { return localStorage.getItem('catedra:_lastSrv') || ''; } catch (_) { return ''; } }
  function setLastSrv(v) { try { _si('catedra:_lastSrv', v || ''); } catch (_) {} }

  // ---------- merge por chave/id (fim do last-write-wins) ----------
  // chaves que são ARRAYS de objetos com id: união por id; em colisão vence o de maior up/ts
  var ARRAY_ID = { 'catedra:sessions': 1, 'catedra:sessionsLixeira': 1, 'catedra:reviews': 1, 'catedra:fc': 1, 'catedra:lib': 1, 'catedra:errors': 1, 'catedra:eventos': 1, 'catedra:metas': 1, 'catedra:red': 1, 'catedra:meusGrupos': 1 };
  // Config do CICLO MANUAL (agenda da semana) é de UM APARELHO: no merge sempre vence o LOCAL.
  // Assim (a) uma cópia antiga/vazia da nuvem NUNCA apaga a agenda, e (b) deletar de fato deleta
  // (o "mais conteúdo vence" trazia itens removidos de volta). Trade-off aceito: single-device.
  var CFG_LOCAL_WINS = { 'catedra:edital': 1, 'catedra:manualFixed': 1, 'catedra:manualRot': 1, 'catedra:cycleMode': 1, 'catedra:manualFixedRoteiroAtual': 1, 'catedra:rotPointer': 1, 'catedra:agendaFeitas': 1 };
  function parseJ(s) { try { return JSON.parse(s); } catch (_) { return undefined; } }
  // "Tem conteúdo de verdade?" — separa o valor que o usuário construiu do vazio que o app
  // semeia sozinho no primeiro render: [] , {} , "" , null e o "0" do ponteiro de rodízio.
  function temConteudo(s) {
    if (s === undefined || s === null || s === '') return false;
    var v = parseJ(s);
    if (Array.isArray(v)) return v.length > 0;
    if (v && typeof v === 'object') return Object.keys(v).length > 0;
    if (v === null) return false;
    return String(s) !== '0';
  }
  function stamp(x) { return (x && (x.up || x.ts)) || 0; }
  function mergeArr(sv, lc, preferServer) {
    if (!Array.isArray(sv)) return lc; if (!Array.isArray(lc)) return sv;
    var map = {}, order = [];
    sv.forEach(function (it) { if (it && it.id != null) { map[it.id] = it; order.push(it.id); } });
    lc.forEach(function (it) {
      if (!it || it.id == null) return;
      if (!(it.id in map)) { map[it.id] = it; order.push(it.id); return; }
      var s = map[it.id];
      // colisão: vence quem tem carimbo mais novo; sem carimbo, vence conforme a direção do merge
      if (stamp(it) > stamp(s)) map[it.id] = it;
      else if (stamp(it) === stamp(s) && !preferServer) map[it.id] = it;
    });
    return order.map(function (id) { return map[id]; });
  }
  // merge de catedra:lib: por id (como mergeArr) e REANEXA o PDF local quando a versão da
  // nuvem veio enxuta (sem pdfB64) — garante que sincronizar nunca apaga um PDF local.
  function mergeLibArr(sv, lc, preferServer) {
    var merged = mergeArr(sv, lc, preferServer);
    if (!Array.isArray(merged)) return merged;
    var loc = {}; if (Array.isArray(lc)) lc.forEach(function (it) { if (it && it.id != null) loc[it.id] = it; });
    return merged.map(function (it) {
      if (it && it.id != null && !it.pdfB64 && loc[it.id] && loc[it.id].pdfB64) {
        var c = {}; for (var k in it) c[k] = it[k]; c.pdfB64 = loc[it.id].pdfB64; if (loc[it.id].pages) c.pages = loc[it.id].pages; delete c._pdfLocal; return c;
      }
      return it;
    });
  }
  function mergeHl(sv, lc, preferServer) {
    if (!sv || typeof sv !== 'object') return lc; if (!lc || typeof lc !== 'object') return sv;
    var out = {}; var books = {};
    Object.keys(sv).forEach(function (b) { books[b] = 1; }); Object.keys(lc).forEach(function (b) { books[b] = 1; });
    Object.keys(books).forEach(function (b) {
      var m = mergeArr(sv[b] || [], lc[b] || [], !!preferServer);
      // grifo apagado neste aparelho não volta da nuvem (a menos que editado depois)
      var tomb = tombHlIds(b);
      if (tomb && Object.keys(tomb).length && Array.isArray(m)) {
        m = m.filter(function (it) {
          if (!it || it.id == null) return true;
          var ts = tomb[it.id];
          if (!ts) return true;
          return stamp(it) > ts;
        });
      }
      out[b] = m;
    });
    return out;
  }
  // Carimbo local de "quando esta chave foi escrita pela última vez" — sobe no blob
  // (é chave catedra:*, não está no EXCLUDE) e permite que um valor NOVO de outro
  // aparelho vença uma lápide de chave ANTIGA deste (ex.: apagou a data da prova aqui,
  // marcou uma nova no notebook → a nova deve chegar).
  function ktsStamp(k) {
    try {
      var m = parseJ(localStorage.getItem('catedra:_kts')) || {};
      m[k] = Date.now(); _si('catedra:_kts', JSON.stringify(m));
    } catch (_) {}
  }
  // serverObj/localObj: {chave: stringJSON}. preferServer decide escalares sem carimbo.
  function mergeAll(serverObj, localObj, preferServer) {
    serverObj = serverObj || {}; localObj = localObj || {};
    var keys = {}, out = {};
    var srvKts = parseJ(serverObj['catedra:_kts']) || {};
    var locKts = parseJ(localObj['catedra:_kts']) || {};
    Object.keys(serverObj).forEach(function (k) { keys[k] = 1; }); Object.keys(localObj).forEach(function (k) { keys[k] = 1; });
    Object.keys(keys).forEach(function (k) {
      if (!isData(k)) return;
      var sv = serverObj[k], lc = localObj[k];
      // O mapa de carimbos por chave se mescla por MÁXIMO por chave.
      if (k === 'catedra:_kts') {
        var a = parseJ(sv) || {}, b = parseJ(lc) || {}, mx = {};
        Object.keys(a).forEach(function (kk) { mx[kk] = a[kk]; });
        Object.keys(b).forEach(function (kk) { if (!(mx[kk] >= b[kk])) mx[kk] = b[kk]; });
        out[k] = JSON.stringify(mx); return;
      }
      if (sv == null) { out[k] = lc; return; }
      // A chave sumiu do local. Se foi APAGADA aqui (tem lápide), a exclusão vale — não
      // restaura do servidor — A MENOS que outro aparelho tenha ESCRITO a chave DEPOIS
      // da exclusão (carimbo do servidor mais novo que a lápide): aí o valor novo vence.
      if (lc == null) {
        var tts = tombKeyTs(k);
        if (tts && !((srvKts[k] || 0) > tts)) return;
        out[k] = sv; return;
      }
      if (sv === lc) { out[k] = lc; return; }
      if (k === 'catedra:lib') { var ml = mergeLibArr(parseJ(sv), parseJ(lc), !!preferServer); ml = dropTombed(k, ml); out[k] = ml !== undefined ? JSON.stringify(ml) : (preferServer ? sv : lc); return; }
      if (ARRAY_ID[k]) { var m = mergeArr(parseJ(sv), parseJ(lc), !!preferServer); m = dropTombed(k, m); out[k] = m !== undefined ? JSON.stringify(m) : (preferServer ? sv : lc); return; }
      if (k === 'catedra:hl') { var h = mergeHl(parseJ(sv), parseJ(lc), !!preferServer); out[k] = h !== undefined ? JSON.stringify(h) : (preferServer ? sv : lc); return; }
      // Config do CICLO MANUAL (agenda da semana) pertence a este aparelho: vence quem tem
      // MAIS conteúdo; empate => local. Evita que uma cópia antiga/vazia da nuvem apague a
      // agenda inteira só porque o servidor está "mais novo" (bug de last-write-wins).
      // ...MAS não na HIDRATAÇÃO (preferServer). Ao entrar num aparelho novo, o app React já
      // rodou atrás do gate e semeou catedra:edital="[]", manualFixed="[]", agendaFeitas="{}",
      // rotPointer="0". Com "local sempre vence" esse vazio recém-nascido virava a verdade e
      // subia por cima da nuvem: o edital e a agenda da semana sumiam em TODOS os aparelhos,
      // sem aviso e sem desfazer. Na hidratação só o local COM CONTEÚDO tem direito de ganhar.
      // Ciclo, edital e agenda: NÃO são mais "deste aparelho". A regra antiga (local
      // sempre vence, salvo se vazio) tinha um efeito colateral que a Lana sentiu na pele:
      // ela montava o ciclo no Mac, entrava no iPad, e o iPad mostrava o ciclo VELHO dele
      // — para sempre, porque local nunca cedia. Cada aparelho vivia com um ciclo próprio.
      // Agora: entre duas versões COM CONTEÚDO, vence a mais recente pelo carimbo por
      // chave (catedra:_kts, que os dois lados carregam); VAZIO NUNCA APAGA CHEIO, que
      // era o buraco que a regra antiga fechava — e continua fechado.
      if (CFG_LOCAL_WINS[k]) {
        var lcTem = temConteudo(lc), svTem = temConteudo(sv);
        if (lcTem && !svTem) { out[k] = lc; return; }
        if (svTem && !lcTem) { out[k] = sv; return; }
        if (!lcTem && !svTem) { out[k] = preferServer ? sv : lc; return; }
        var lts = locKts[k] || 0, sts = srvKts[k] || 0;
        if (sts > lts) { out[k] = sv; return; }
        if (lts > sts) { out[k] = lc; return; }
        out[k] = preferServer ? sv : lc;   // sem carimbo dos dois lados: direção do merge
        return;
      }
      out[k] = preferServer ? sv : lc; // escalares/objetos sem carimbo: direção do merge decide
    });
    // Reconciliação histórico × lixeira de sessões (soft-delete entre aparelhos): se a
    // mesma sessão ficou nos DOIS após a união, decide o carimbo — exclusão (_delAt) mais
    // nova que a última edição (up/ts) tira do histórico; edição/restauração mais nova
    // que a exclusão tira da lixeira.
    try {
      var trash = parseJ(out['catedra:sessionsLixeira']);
      var sess = parseJ(out['catedra:sessions']);
      if (Array.isArray(trash) && trash.length && Array.isArray(sess) && sess.length) {
        var delAt = {}; trash.forEach(function (it) { if (it && it.id != null) delAt[it.id] = it._delAt || 0; });
        var dropFromTrash = {};
        var sess2 = sess.filter(function (it) {
          if (!it || it.id == null || !(it.id in delAt)) return true;
          if (stamp(it) > delAt[it.id]) { dropFromTrash[it.id] = 1; return true; }  // restaurada/editada depois
          return false;                                                              // exclusão é mais nova
        });
        var trash2 = trash.filter(function (it) { return !(it && it.id != null && dropFromTrash[it.id]); });
        if (sess2.length !== sess.length) out['catedra:sessions'] = JSON.stringify(sess2);
        if (trash2.length !== trash.length) out['catedra:sessionsLixeira'] = JSON.stringify(trash2);
      }
    } catch (_) {}
    return out;
  }

  function pushNow() {
    if (!user || hydrating || pushing) return;
    pushing = true; setStatus('enviando');
    // read-before-write: relê o servidor e mescla antes de subir (nada de sobrescrever cego)
    sb.from('user_data').select('data,updated_at').eq('user_id', user.id).maybeSingle()
      .then(function (res) {
        // Mesmo cuidado da hidratação, e aqui é PIOR: o upsert lá embaixo executa de
        // verdade. Sem esta checagem, um select que falhou virava row=null, o
        // mergeAll(null, ...) devolvia SÓ o local, e o local subia por cima da nuvem —
        // apagando no servidor o que o outro aparelho tinha gravado. Falhar aqui é o
        // certo: o .catch abaixo mantém o dirty e a próxima tentativa reconcilia.
        if (res && res.error) throw res.error;
        var row = res && res.data;
        var antes = collect();
        var merged = mergeAll(row && row.data, antes, false); // subida: local prevalece nos escalares
        applyData(merged); // grava o resultado unido localmente (via _si — não redispara sync)
        // O push TAMBÉM traz coisa do servidor (o merge une os arrays por id). Sem avisar
        // o app, a memória dele seguia velha, o _autosave regravava por cima e — pior — o
        // tombOnSet criava LÁPIDE nos ids recém-chegados do outro aparelho, apagando-os de
        // vez nos dois lados. Avisa SÓ quando algo mudou de fato: aviso incondicional viraria
        // laço (push → synced → autosave → push).
        var mudou = false;
        try {
          var ks = {}; Object.keys(antes).forEach(function (k) { ks[k] = 1; }); Object.keys(merged).forEach(function (k) { ks[k] = 1; });
          mudou = Object.keys(ks).some(function (k) { return antes[k] !== merged[k]; });
        } catch (_) {}
        if (mudou) { try { window.dispatchEvent(new CustomEvent('catedra:synced')); } catch (_) {} }
        var now = new Date().toISOString();
        return sb.from('user_data').upsert({ user_id: user.id, data: leanForUpload(merged), updated_at: now })
          .then(function (r2) {
            if (r2 && r2.error) throw r2.error;
            setDirty(false); setLastSrv(now); setStatus('salvo');
          });
      })
      .catch(function (err) { console.warn('[Cátedra] sync erro:', err && err.message); setStatus(navigator.onLine === false ? 'offline' : 'erro'); })
      .then(function () { pushing = false; });
  }
  window.CatedraSync = { push: function () {
    setDirty(true);
    clearTimeout(pushT);
    pushT = setTimeout(pushNow, 700);
  }, get status() { return syncStatus; },
  // gancho interno de diagnóstico/teste (não usado pelo app)
  _test: { mergeAll: mergeAll, tombOnSet: tombOnSet, tombLoad: tombLoad, mergeHl: mergeHl } };

  // pull + merge ao voltar para a aba / reconectar — o outro aparelho pode ter estudado
  var pulling = false;
  function pullAndMerge() {
    if (!user || hydrating || pushing || pulling) return;
    pulling = true;
    sb.from('user_data').select('data,updated_at').eq('user_id', user.id).maybeSingle()
      .then(function (res) {
        var row = res && res.data;
        if (!row || !row.data) { pulling = false; return; }
        var serverNewer = row.updated_at && row.updated_at > lastSrv();
        if (!serverNewer && !isDirty()) { pulling = false; setStatus('salvo'); return; }
        // servidor mais novo e este aparelho limpo → escalares vêm do servidor; arrays sempre por id
        var merged = mergeAll(row.data, collect(), serverNewer && !isDirty());
        applyData(merged);
        setLastSrv(row.updated_at || lastSrv());
        try { window.dispatchEvent(new CustomEvent('catedra:synced')); } catch (_) {}
        pulling = false;
        if (isDirty()) pushNow(); else setStatus('salvo');
      })
      .catch(function () { pulling = false; setStatus(navigator.onLine === false ? 'offline' : 'erro'); });
  }

  // flush imediato quando a aba é fechada/minimizada. keepalive sobrevive ao fechamento;
  // SEM token de usuário não envia (RLS rejeitaria) — o dirty fica marcado e a próxima
  // abertura reconcilia via pullAndMerge + pushNow.
  function flushSync() {
    if (!user || hydrating) return;
    clearTimeout(pushT);
    if (!authToken) return; // sem JWT o POST seria rejeitado pelo RLS — deixa o dirty para a próxima sessão
    // NÃO subir quando este aparelho não tem nada novo. Este envio é CEGO (não faz
    // read-before-write, porque no fechamento não dá tempo), então subir sem precisar
    // significa reescrever a nuvem inteira com o blob local — apagando no servidor o
    // que outro aparelho gravou nesse meio-tempo. Sem esta linha, bastava o Mac ficar
    // aberto e ocioso e ser minimizado para desfazer o que foi estudado no celular.
    if (!isDirty()) return;
    try {
      fetch(CFG.url + '/rest/v1/user_data', {
        method: 'POST', keepalive: true,
        headers: { 'apikey': CFG.key, 'Authorization': 'Bearer ' + authToken, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({ user_id: user.id, data: leanForUpload(collect()), updated_at: new Date().toISOString() }),
      });
      // não dá para confirmar sucesso no unload: mantém o dirty; a próxima abertura confirma/mescla
    } catch (_) { pushNow(); }
  }
  document.addEventListener('visibilitychange', function () {
    // Minimizar/trocar de aba NÃO é fechar: a página segue viva, então dá tempo do
    // caminho seguro (pushNow faz read-before-write). O envio cego com keepalive fica
    // só para o pagehide, onde realmente não há tempo de reler o servidor.
    if (document.visibilityState === 'hidden') { clearTimeout(pushT); if (isDirty()) pushNow(); }
    else if (document.visibilityState === 'visible') pullAndMerge();
  });
  window.addEventListener('pagehide', flushSync);
  window.addEventListener('online', function () { setStatus('enviando'); pullAndMerge(); });
  window.addEventListener('offline', function () { setStatus('offline'); });

  // intercepta escritas do app/usuário para acionar a sincronização.
  // usa defineProperty com enumerable:false para NÃO poluir Object.keys(localStorage).
  // Registra as lápides ANTES de escrever/remover (precisa do valor anterior para
  // saber o que sumiu) — é o que faz apagar cartão/erro/data da prova finalmente colar.
  // Lápide SEM gate de `hydrating`: um setItem/removeItem vindo do APP é sempre uma
  // ação intencional (a hidratação da nuvem grava via _si, que NÃO passa por aqui).
  // Com o gate, apagar logo após abrir (nuvem ainda sincronizando) não registrava a
  // lápide → o item voltava. O push segue gateado para não subir no meio da hidratação.
  var setImpl = function (k, v) { if (isData(k)) { tombOnSet(k, v); if (k !== 'catedra:_kts') ktsStamp(k); } _si(k, v); if (user && !hydrating && isData(k)) window.CatedraSync.push(); };
  var remImpl = function (k) { if (isData(k)) tombOnRemove(k); _ri(k); if (k === 'catedra:auth' && user) { logout(); return; } if (user && !hydrating && isData(k)) window.CatedraSync.push(); };
  try {
    Object.defineProperty(localStorage, 'setItem', { configurable: true, writable: true, enumerable: false, value: setImpl });
    Object.defineProperty(localStorage, 'removeItem', { configurable: true, writable: true, enumerable: false, value: remImpl });
  } catch (_) { localStorage.setItem = setImpl; localStorage.removeItem = remImpl; }
  // WebKit: o [[DefineOwnProperty]] exótico do Storage também MATERIALIZA itens literais
  // 'setItem'/'removeItem' com o fonte das funções — limpa a sombra logo após instalar.
  try { _ri('setItem'); _ri('removeItem'); } catch (_) {}

  // ---------- overlay / gate ----------
  // O gate segue a COR SELECIONADA (catedra:accent) e o modo escuro (catedra:dark).
  // Sem accent salvo → verde (comportamento original); assim a web não quebra.
  function _accent() {
    try { var a = localStorage.getItem('catedra:accent'); if (a) { a = JSON.parse(a);
      if (typeof a === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(a)) return a; } } catch (_) {}
    return '#0f7a57';
  }
  function _darken(hex, f) {
    try { var h = hex.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&');
      var n = parseInt(h, 16), r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    } catch (_) { return hex; }
  }
  var ACC = _accent(), ACC2 = _darken(ACC, 0.62);
  var DARK = (function () { var d = localStorage.getItem('catedra:dark'); return d === '1' || d === 'true'; })();
  var GRAD = 'linear-gradient(135deg,' + ACC + ',' + ACC2 + ')';
  // paleta do lado do formulário conforme o modo
  var PG   = DARK ? '#0e1116' : '#f6f4ee';  // fundo do gate
  var CARD = DARK ? '#171b21' : '#ffffff';  // fundo dos inputs
  var INK  = DARK ? '#f2f3f5' : '#1a1a1a';  // títulos/entrada
  var MUT  = DARK ? '#9aa4ad' : '#7a857f';  // texto secundário
  var LAB  = DARK ? '#c2c9d0' : '#5a6b63';  // rótulos
  var BRD  = DARK ? '#2b3138' : '#d9d5cc';  // borda dos inputs
  var el = document.createElement('div');
  el.id = 'catedra-auth-gate';
  el.setAttribute('style', 'position:fixed;inset:0;z-index:2147483000;background:' + PG + ';display:flex;');
  (document.body || document.documentElement).appendChild(el);
  document.addEventListener('DOMContentLoaded', function () { if (document.body && el.parentNode !== document.body) document.body.appendChild(el); });

  function show() { el.style.display = 'flex'; }
  function hide() { el.style.display = 'none'; }
  function showLoading(msg) {
    el.innerHTML = '<div style="margin:auto;text-align:center;font-family:system-ui,sans-serif;">'
      + '<div style="width:40px;height:40px;border:4px solid ' + (DARK ? '#2a2f36' : '#cfe7dd') + ';border-top-color:' + ACC + ';border-radius:50%;margin:0 auto 16px;animation:ctspin .8s linear infinite;"></div>'
      + '<div style="font-size:14px;color:' + MUT + ';">' + (msg || 'Carregando…') + '</div>'
      + '<style>@keyframes ctspin{to{transform:rotate(360deg)}}</style></div>';
    show();
  }

  var mode = 'login';
  function showForm() {
    var title = mode === 'login' ? 'Entrar' : 'Criar conta';
    var alt = mode === 'login' ? 'Primeiro acesso? <b>Criar conta</b>' : 'Já tem conta? <b>Entrar</b>';
    el.innerHTML =
      '<div class="ct-hero" style="flex:1.1;min-width:0;background:' + GRAD + ';color:#fff;flex-direction:column;justify-content:space-between;padding:clamp(28px,4vw,52px);' + (window.innerWidth > 760 ? 'display:flex;' : 'display:none;') + '">'
      + '<div style="display:flex;align-items:center;gap:12px;"><div style="width:42px;height:42px;border-radius:12px;background:rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-weight:700;font-size:22px;">C</div><span style="font-family:Georgia,serif;font-weight:600;font-size:20px;">Cátedra</span></div>'
      + '<div><div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;opacity:.8;font-weight:600;font-family:system-ui,sans-serif;">Sua aprovação, organizada</div><h1 style="font-family:Georgia,serif;font-size:clamp(28px,3.4vw,42px);font-weight:700;line-height:1.1;margin:14px 0 0;max-width:460px;">Estude o que cai, na proporção em que cai.</h1><p style="font-family:system-ui,sans-serif;font-size:15px;opacity:.9;line-height:1.6;margin:16px 0 0;max-width:420px;">Sua conta guarda o progresso e sincroniza entre seus aparelhos.</p></div>'
      + '<div style="font-family:system-ui,sans-serif;font-size:12.5px;opacity:.8;">© Cátedra · plataforma de estudos</div>'
      + '</div>'
      + '<div style="flex:1;min-width:0;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;">'
      + '<form id="ctf" style="width:100%;max-width:360px;">'
      + '<h2 style="font-family:Georgia,serif;font-size:26px;font-weight:600;color:' + INK + ';margin:0;">' + title + '</h2>'
      + '<p style="font-size:13.5px;color:' + MUT + ';margin:6px 0 24px;">Acesse sua conta para salvar e sincronizar seus estudos.</p>'
      + '<label style="display:block;font-size:12px;color:' + LAB + ';font-weight:600;margin-bottom:6px;">E-mail</label>'
      + '<input id="cte" type="email" autocomplete="email" placeholder="voce@email.com" style="width:100%;box-sizing:border-box;border:1px solid ' + BRD + ';background:' + CARD + ';border-radius:10px;padding:12px 14px;font-size:14px;color:' + INK + ';margin-bottom:14px;">'
      + '<label style="display:block;font-size:12px;color:' + LAB + ';font-weight:600;margin-bottom:6px;">Senha</label>'
      + '<input id="ctp" type="password" autocomplete="' + (mode === 'login' ? 'current-password' : 'new-password') + '" placeholder="••••••••" style="width:100%;box-sizing:border-box;border:1px solid ' + BRD + ';background:' + CARD + ';border-radius:10px;padding:12px 14px;font-size:14px;color:' + INK + ';margin-bottom:8px;">'
      + '<div id="cterr" style="min-height:18px;font-size:12.5px;color:#e0533f;margin:4px 0 10px;line-height:1.4;"></div>'
      + '<button id="cts" type="submit" style="width:100%;background:' + GRAD + ';color:#fff;border:none;border-radius:11px;padding:13px;font-weight:600;font-size:15px;cursor:pointer;font-family:inherit;">' + title + '</button>'
      + '<p id="ctt" style="font-size:12.5px;color:' + MUT + ';text-align:center;margin:18px 0 0;cursor:pointer;">' + alt + '</p>'
      + (mode === 'login' ? '<p id="ctf2" style="font-size:12.5px;color:' + MUT + ';text-align:center;margin:10px 0 0;cursor:pointer;text-decoration:underline;">Esqueci minha senha</p>' : '')
      + '</form></div>';
    show();
    el.querySelector('#ctt').onclick = function () { mode = mode === 'login' ? 'signup' : 'login'; showForm(); };
    // Sem isto, quem esquecesse a senha ficava trancado para fora da própria conta para
    // sempre — não havia nenhum caminho de recuperação em lugar nenhum do app.
    var lkEsq = el.querySelector('#ctf2');
    if (lkEsq) lkEsq.onclick = function () {
      var em = (el.querySelector('#cte').value || '').trim();
      var erro = el.querySelector('#cterr');
      if (!em) { erro.textContent = 'Escreva seu e-mail acima e clique de novo.'; return; }
      erro.style.color = MUT; erro.textContent = 'Enviando…';
      sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname })
        .then(function () { erro.style.color = MUT; erro.textContent = 'Se existir conta com esse e-mail, o link de redefinição chegou na caixa de entrada.'; })
        .catch(function () { erro.style.color = '#e0533f'; erro.textContent = 'Não deu para enviar agora. Tente de novo.'; });
    };
    var form = el.querySelector('#ctf'), errEl = el.querySelector('#cterr'), btn = el.querySelector('#cts');
    form.onsubmit = function (e) {
      e.preventDefault();
      var email = (el.querySelector('#cte').value || '').trim();
      var pass = el.querySelector('#ctp').value || '';
      errEl.textContent = '';
      if (!email || !pass) { errEl.textContent = 'Preencha e-mail e senha.'; return; }
      if (pass.length < 6) { errEl.textContent = 'A senha precisa de ao menos 6 caracteres.'; return; }
      btn.disabled = true; btn.textContent = 'Aguarde…';
      var done = function (msg) { btn.disabled = false; btn.textContent = mode === 'login' ? 'Entrar' : 'Criar conta'; if (msg) errEl.textContent = msg; };
      var onRes = function (res) {
        if (res.error) { done(translateErr(res.error.message)); return; }
        if (res.data && res.data.session) { onLogin(res.data.session.user); }
        else if (mode === 'signup') { done('Conta criada! Confirme pelo e-mail e depois entre.'); mode = 'login'; }
        else { done('Não foi possível entrar.'); }
      };
      var p = mode === 'signup' ? sb.auth.signUp({ email: email, password: pass }) : sb.auth.signInWithPassword({ email: email, password: pass });
      p.then(onRes).catch(function () { done('Falha de conexão. Tente de novo.'); });
    };
  }
  function translateErr(m) {
    m = String(m || '');
    if (/Invalid login/i.test(m)) return 'E-mail ou senha incorretos.';
    if (/already registered/i.test(m)) return 'Esse e-mail já tem conta. Faça login.';
    if (/valid email/i.test(m)) return 'E-mail inválido.';
    if (/at least/i.test(m) || /6 characters/i.test(m)) return 'A senha precisa de ao menos 6 caracteres.';
    return m;
  }

  // ---------- fluxo ----------
  // Quem é o dono do que está no localStorage. Sem isto, o acervo de quem usou o aparelho
  // antes (sessões, caderno de erros, edital, flashcards, nome, data da prova) era MESCLADO
  // na conta de quem entrasse depois e SUBIA para a nuvem dele — e, pior, o edital do
  // recém-chegado era substituído pelo do anterior em todos os aparelhos dele.
  // Acontecia sempre que a sessão expirava, ou alguém fechava o app sem clicar em Sair.
  //
  // Deliberadamente NÃO limpamos ao cair na tela de login: sessão que expira por estar
  // offline é comum, e apagar ali destruiria dado local ainda não sincronizado. A limpeza
  // acontece no login, e só quando o dono realmente muda.
  function trocouDeDono(u) {
    var dono = null;
    try { dono = localStorage.getItem('catedra:_owner'); } catch (_) {}
    if (dono === u.id) return false;
    if (!dono) {
      // Sem carimbo: só é suspeito se JÁ existe dado local (versão anterior do app, ou
      // acervo de outra conta). Aparelho zerado entra direto.
      var temDado = false;
      try { for (var i = 0; i < localStorage.length; i++) { if (isData(localStorage.key(i))) { temDado = true; break; } } } catch (_) {}
      if (!temDado) return false;
      // Primeira vez com carimbo e há dado local: assume que é desta conta (upgrade do app),
      // senão todo mundo perderia o próprio acervo ao atualizar.
      return false;
    }
    return true;
  }

  function onLogin(u) {
    user = u;
    // O app precisa saber QUAL conta está logada. Há duas contas distintas em uso (a
    // administradora e a pessoal) e o Ajustes só mostrava um apelido salvo no
    // localStorage — não havia como descobrir, de dentro do app, onde se estava. Isso
    // custou uma caçada inteira a um "bug" que era simplesmente a conta errada.
    try {
      var ident = { id: u.id, email: u.email || '' };
      if (window.CatedraAuth) window.CatedraAuth.user = ident;
      window.dispatchEvent(new CustomEvent('catedra:authuser', { detail: ident }));
    } catch (_) {}
    if (trocouDeDono(u)) { clearLocal(); try { sessionStorage.removeItem('catedra:hydrated'); } catch (_) {} }
    try { _si('catedra:_owner', u.id); } catch (_) {}
    if (sessionStorage.getItem('catedra:hydrated') === '1') { _si('catedra:auth', '1'); hydrating = false; hide(); setStatus(isDirty() ? 'enviando' : 'salvo'); if (isDirty()) pushNow(); else pullAndMerge(); return; }
    showLoading('Carregando seus dados…');
    sb.from('user_data').select('data,updated_at').eq('user_id', u.id).maybeSingle().then(function (res) {
      // FALHA DE LEITURA NÃO É "CONTA VAZIA".
      // O supabase-js NÃO rejeita a promise quando a rede/JWT/RLS falha: ele RESOLVE
      // com {data:null, error:{...}}. Como o código só olhava res.data, um erro virava
      // "a nuvem está vazia" e seguia para o else: carimbava catedra:_lastSrv com o
      // relógio do CLIENTE (mais novo que o updated_at real do servidor), marcava
      // hydrated='1' e recarregava. Depois disso o app ficava logado, VAZIO e
      // "sincronizado": o pullAndMerge não puxava mais (serverNewer=false por causa do
      // carimbo futuro) e o primeiro salvamento subia o vazio por cima do edital.
      // É o sintoma histórico "meu edital sumiu ao entrar em outro aparelho".
      // Casos reais: abrir sem internet com token ainda válido, wi-fi de hotel/portal
      // cativo devolvendo HTML, JWT recusado.
      if (res && res.error) {
        _si('catedra:auth', '1'); hydrating = false; hide();
        setStatus(navigator.onLine === false ? 'offline' : 'erro');
        return;   // NÃO carimba lastSrv, NÃO marca hydrated, NÃO recarrega — a próxima
                  // abertura tenta hidratar de novo e o dado do servidor volta sozinho.
      }
      var row = res && res.data;
      var now = new Date().toISOString();
      if (row && row.data && Object.keys(row.data).length) {
        // mescla nuvem + local (por id nos arrays) — edições offline deste aparelho não se perdem
        var merged = mergeAll(row.data, collect(), true);
        applyData(merged);
        sb.from('user_data').upsert({ user_id: u.id, data: leanForUpload(merged), updated_at: now });
        setLastSrv(now); setDirty(false);
        // avisa o app: a hidratação trocou os dados locais e ele precisa reler/reaplicar migrações
        try { window.dispatchEvent(new CustomEvent('catedra:synced')); } catch (_) {}
      }
      else { sb.from('user_data').upsert({ user_id: u.id, data: leanForUpload(collect()), updated_at: now }); setLastSrv(now); setDirty(false); }
      _si('catedra:auth', '1');
      sessionStorage.setItem('catedra:hydrated', '1');
      location.reload();
    }).catch(function () { _si('catedra:auth', '1'); hydrating = false; hide(); });
  }
  function showLoginState() {
    user = null;
    try {
      if (window.CatedraAuth) window.CatedraAuth.user = null;
      window.dispatchEvent(new CustomEvent('catedra:authuser', { detail: null }));
    } catch (_) {}
    _ri('catedra:auth'); sessionStorage.removeItem('catedra:hydrated'); hydrating = false; showForm();
  }

  // Tela de NOVA SENHA — o link do e-mail de recuperação volta para cá. Sem ela o link
  // não levaria a lugar nenhum: o supabase-js abre a sessão a partir do hash da URL e o
  // app entraria direto, sem nunca deixar a pessoa trocar a senha que ela esqueceu.
  function showNovaSenha() {
    hydrating = false;
    el.innerHTML = '<div style="flex:1;min-width:0;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;">'
      + '<form id="ctnf" style="width:100%;max-width:360px;">'
      + '<h2 style="font-family:Georgia,serif;font-size:26px;font-weight:600;color:' + INK + ';margin:0;">Nova senha</h2>'
      + '<p style="font-size:13.5px;color:' + MUT + ';margin:6px 0 24px;">Escolha a senha que você vai usar daqui em diante.</p>'
      + '<input id="ctnp" type="password" autocomplete="new-password" placeholder="Nova senha (mín. 6 caracteres)" style="width:100%;box-sizing:border-box;border:1px solid ' + BRD + ';background:' + CARD + ';border-radius:10px;padding:12px 14px;font-size:14px;color:' + INK + ';margin-bottom:8px;">'
      + '<div id="ctnerr" style="min-height:18px;font-size:12.5px;color:#e0533f;margin:4px 0 10px;line-height:1.4;"></div>'
      + '<button id="ctnb" type="submit" style="width:100%;background:' + GRAD + ';color:#fff;border:none;border-radius:11px;padding:13px;font-weight:600;font-size:15px;cursor:pointer;font-family:inherit;">Salvar nova senha</button>'
      + '</form></div>';
    show();
    var f = el.querySelector('#ctnf'), erro = el.querySelector('#ctnerr'), b = el.querySelector('#ctnb');
    f.onsubmit = function (e) {
      e.preventDefault();
      var nova = el.querySelector('#ctnp').value || '';
      if (nova.length < 6) { erro.textContent = 'A senha precisa de ao menos 6 caracteres.'; return; }
      b.disabled = true; b.textContent = 'Salvando…';
      sb.auth.updateUser({ password: nova }).then(function (res) {
        if (res.error) { b.disabled = false; b.textContent = 'Salvar nova senha'; erro.textContent = translateErr(res.error.message); return; }
        try { history.replaceState(null, '', location.pathname); } catch (_) {}
        sb.auth.getSession().then(function (r) {
          var s = r && r.data && r.data.session;
          if (s && s.user) onLogin(s.user); else showLoginState();
        });
      }).catch(function () { b.disabled = false; b.textContent = 'Salvar nova senha'; erro.textContent = 'Não deu para salvar agora. Tente de novo.'; });
    };
  }
  // "Sair" apaga TODO o catedra:* deste aparelho (clearLocal). Antes ele fazia isso sem
  // olhar se havia coisa por subir — e há uma janela real: o app espera 500ms para gravar
  // e o sync espera mais 700ms para enviar. Registrar a sessão de estudo e clicar em Sair
  // em seguida levava esse registro junto, definitivamente e sem aviso.
  function logout() {
    clearTimeout(pushT);
    if (user && authToken && isDirty()) {
      if (!confirm('Há estudos deste aparelho que ainda não subiram para a sua conta.\n\nSair agora vai apagá-los daqui. Quer sair mesmo assim?')) {
        setStatus('enviando'); pushNow(); return;   // fica logado e termina de sincronizar
      }
      try { flushSync(); } catch (_) {}             // última tentativa (keepalive sobrevive ao reload)
    }
    sessionStorage.removeItem('catedra:hydrated');
    var fin = function () { clearLocal(); location.reload(); };
    sb.auth.signOut().then(fin, fin);
  }
  window.CatedraAuth = { logout: logout, client: sb };

  showLoading('…');
  sb.auth.getSession().then(function (res) {
    var s = res && res.data && res.data.session;
    if (ehRecuperacao) { showNovaSenha(); return; }
    if (s && s.user) onLogin(s.user); else showLoginState();
  }).catch(function () { showLoginState(); });
})();
