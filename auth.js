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
  var EXCLUDE = { 'catedra:auth': 1, 'catedra:_dirty': 1, 'catedra:_lastSrv': 1, 'catedra:notifSent': 1 };
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
  sb.auth.onAuthStateChange(function (_e, session) { authToken = session && session.access_token; });

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
  var ARRAY_ID = { 'catedra:sessions': 1, 'catedra:reviews': 1, 'catedra:fc': 1, 'catedra:lib': 1, 'catedra:errors': 1, 'catedra:eventos': 1, 'catedra:metas': 1, 'catedra:red': 1, 'catedra:meusGrupos': 1 };
  // Config do CICLO MANUAL (agenda da semana) é de UM APARELHO: no merge sempre vence o LOCAL.
  // Assim (a) uma cópia antiga/vazia da nuvem NUNCA apaga a agenda, e (b) deletar de fato deleta
  // (o "mais conteúdo vence" trazia itens removidos de volta). Trade-off aceito: single-device.
  var CFG_LOCAL_WINS = { 'catedra:manualFixed': 1, 'catedra:manualRot': 1, 'catedra:cycleMode': 1, 'catedra:manualFixedRoteiroAtual': 1, 'catedra:rotPointer': 1, 'catedra:agendaFeitas': 1 };
  function parseJ(s) { try { return JSON.parse(s); } catch (_) { return undefined; } }
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
  function mergeHl(sv, lc) {
    if (!sv || typeof sv !== 'object') return lc; if (!lc || typeof lc !== 'object') return sv;
    var out = {}; var books = {};
    Object.keys(sv).forEach(function (b) { books[b] = 1; }); Object.keys(lc).forEach(function (b) { books[b] = 1; });
    Object.keys(books).forEach(function (b) { out[b] = mergeArr(sv[b] || [], lc[b] || [], false); });
    return out;
  }
  // serverObj/localObj: {chave: stringJSON}. preferServer decide escalares sem carimbo.
  function mergeAll(serverObj, localObj, preferServer) {
    serverObj = serverObj || {}; localObj = localObj || {};
    var keys = {}, out = {};
    Object.keys(serverObj).forEach(function (k) { keys[k] = 1; }); Object.keys(localObj).forEach(function (k) { keys[k] = 1; });
    Object.keys(keys).forEach(function (k) {
      if (!isData(k)) return;
      var sv = serverObj[k], lc = localObj[k];
      if (sv == null) { out[k] = lc; return; }
      if (lc == null) { out[k] = sv; return; }
      if (sv === lc) { out[k] = lc; return; }
      if (k === 'catedra:lib') { var ml = mergeLibArr(parseJ(sv), parseJ(lc), !!preferServer); out[k] = ml !== undefined ? JSON.stringify(ml) : (preferServer ? sv : lc); return; }
      if (ARRAY_ID[k]) { var m = mergeArr(parseJ(sv), parseJ(lc), !!preferServer); out[k] = m !== undefined ? JSON.stringify(m) : (preferServer ? sv : lc); return; }
      if (k === 'catedra:hl') { var h = mergeHl(parseJ(sv), parseJ(lc)); out[k] = h !== undefined ? JSON.stringify(h) : (preferServer ? sv : lc); return; }
      // Config do CICLO MANUAL (agenda da semana) pertence a este aparelho: vence quem tem
      // MAIS conteúdo; empate => local. Evita que uma cópia antiga/vazia da nuvem apague a
      // agenda inteira só porque o servidor está "mais novo" (bug de last-write-wins).
      if (CFG_LOCAL_WINS[k]) { out[k] = lc; return; }
      out[k] = preferServer ? sv : lc; // escalares/objetos sem carimbo: direção do merge decide
    });
    return out;
  }

  function pushNow() {
    if (!user || hydrating || pushing) return;
    pushing = true; setStatus('enviando');
    // read-before-write: relê o servidor e mescla antes de subir (nada de sobrescrever cego)
    sb.from('user_data').select('data,updated_at').eq('user_id', user.id).maybeSingle()
      .then(function (res) {
        var row = res && res.data;
        var merged = mergeAll(row && row.data, collect(), false); // subida: local prevalece nos escalares
        applyData(merged); // grava o resultado unido localmente (via _si — não redispara sync)
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
  }, get status() { return syncStatus; } };

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
    if (document.visibilityState === 'hidden') flushSync();
    else if (document.visibilityState === 'visible') pullAndMerge();
  });
  window.addEventListener('pagehide', flushSync);
  window.addEventListener('online', function () { setStatus('enviando'); pullAndMerge(); });
  window.addEventListener('offline', function () { setStatus('offline'); });

  // intercepta escritas do app/usuário para acionar a sincronização.
  // usa defineProperty com enumerable:false para NÃO poluir Object.keys(localStorage).
  var setImpl = function (k, v) { _si(k, v); if (user && !hydrating && isData(k)) window.CatedraSync.push(); };
  var remImpl = function (k) { _ri(k); if (k === 'catedra:auth' && user) { logout(); return; } if (user && !hydrating && isData(k)) window.CatedraSync.push(); };
  try {
    Object.defineProperty(localStorage, 'setItem', { configurable: true, writable: true, enumerable: false, value: setImpl });
    Object.defineProperty(localStorage, 'removeItem', { configurable: true, writable: true, enumerable: false, value: remImpl });
  } catch (_) { localStorage.setItem = setImpl; localStorage.removeItem = remImpl; }

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
      + '</form></div>';
    show();
    el.querySelector('#ctt').onclick = function () { mode = mode === 'login' ? 'signup' : 'login'; showForm(); };
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
  function onLogin(u) {
    user = u;
    if (sessionStorage.getItem('catedra:hydrated') === '1') { _si('catedra:auth', '1'); hydrating = false; hide(); setStatus(isDirty() ? 'enviando' : 'salvo'); if (isDirty()) pushNow(); else pullAndMerge(); return; }
    showLoading('Carregando seus dados…');
    sb.from('user_data').select('data,updated_at').eq('user_id', u.id).maybeSingle().then(function (res) {
      var row = res && res.data;
      var now = new Date().toISOString();
      if (row && row.data && Object.keys(row.data).length) {
        // mescla nuvem + local (por id nos arrays) — edições offline deste aparelho não se perdem
        var merged = mergeAll(row.data, collect(), true);
        applyData(merged);
        sb.from('user_data').upsert({ user_id: u.id, data: leanForUpload(merged), updated_at: now });
        setLastSrv(now); setDirty(false);
      }
      else { sb.from('user_data').upsert({ user_id: u.id, data: leanForUpload(collect()), updated_at: now }); setLastSrv(now); setDirty(false); }
      _si('catedra:auth', '1');
      sessionStorage.setItem('catedra:hydrated', '1');
      location.reload();
    }).catch(function () { _si('catedra:auth', '1'); hydrating = false; hide(); });
  }
  function showLoginState() { user = null; _ri('catedra:auth'); sessionStorage.removeItem('catedra:hydrated'); hydrating = false; showForm(); }
  function logout() { sessionStorage.removeItem('catedra:hydrated'); var fin = function () { clearLocal(); location.reload(); }; sb.auth.signOut().then(fin, fin); }
  window.CatedraAuth = { logout: logout, client: sb };

  showLoading('…');
  sb.auth.getSession().then(function (res) {
    var s = res && res.data && res.data.session;
    if (s && s.user) onLogin(s.user); else showLoginState();
  }).catch(function () { showLoginState(); });
})();
