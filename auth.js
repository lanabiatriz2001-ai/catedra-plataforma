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
  var EXCLUDE = { 'catedra:auth': 1 };
  function isData(k) { return k && k.indexOf('catedra:') === 0 && !EXCLUDE[k]; }

  function collect() { var o = {}; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (isData(k)) o[k] = localStorage.getItem(k); } return o; }
  function applyData(d) { if (!d) return; Object.keys(d).forEach(function (k) { if (isData(k)) { try { _si(k, d[k]); } catch (_) {} } }); }
  function clearLocal() { var r = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('catedra:') === 0) r.push(k); } r.forEach(function (k) { _ri(k); }); }

  var user = null, hydrating = true, pushT = null, authToken = null, firstDirtyAt = 0;
  // mantém o token do usuário em cache (para o flush com keepalive ao fechar a aba)
  sb.auth.onAuthStateChange(function (_e, session) { authToken = session && session.access_token; });

  function pushNow() {
    if (!user || hydrating) return;
    firstDirtyAt = 0;
    sb.from('user_data').upsert({ user_id: user.id, data: collect(), updated_at: new Date().toISOString() })
      .then(function (res) { if (res && res.error) console.warn('[Cátedra] sync erro:', res.error.message); });
  }
  window.CatedraSync = { push: function () {
    if (!firstDirtyAt) firstDirtyAt = Date.now();
    clearTimeout(pushT);
    // debounce 700ms; se está acumulando há >2,5s (edição contínua), sobe já.
    pushT = setTimeout(pushNow, (Date.now() - firstDirtyAt) > 2500 ? 0 : 700);
  } };
  // flush imediato quando a aba é fechada/minimizada — a última edição SEMPRE sobe.
  // keepalive faz a requisição sobreviver ao fechamento; usa o JWT do usuário (RLS).
  function flushSync() {
    if (!user || hydrating) return;
    clearTimeout(pushT); firstDirtyAt = 0;
    try {
      fetch(CFG.url + '/rest/v1/user_data', {
        method: 'POST', keepalive: true,
        headers: { 'apikey': CFG.key, 'Authorization': 'Bearer ' + (authToken || CFG.key), 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({ user_id: user.id, data: collect(), updated_at: new Date().toISOString() }),
      });
    } catch (_) { pushNow(); }
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flushSync(); });
  window.addEventListener('pagehide', flushSync);

  // intercepta escritas do app/usuário para acionar a sincronização.
  // usa defineProperty com enumerable:false para NÃO poluir Object.keys(localStorage).
  var setImpl = function (k, v) { _si(k, v); if (user && !hydrating && isData(k)) window.CatedraSync.push(); };
  var remImpl = function (k) { _ri(k); if (k === 'catedra:auth' && user) { logout(); return; } if (user && !hydrating && isData(k)) window.CatedraSync.push(); };
  try {
    Object.defineProperty(localStorage, 'setItem', { configurable: true, writable: true, enumerable: false, value: setImpl });
    Object.defineProperty(localStorage, 'removeItem', { configurable: true, writable: true, enumerable: false, value: remImpl });
  } catch (_) { localStorage.setItem = setImpl; localStorage.removeItem = remImpl; }

  // ---------- overlay / gate ----------
  var GRAD = 'linear-gradient(135deg,#0f7a57,#0a5c41)';
  var el = document.createElement('div');
  el.id = 'catedra-auth-gate';
  el.setAttribute('style', 'position:fixed;inset:0;z-index:2147483000;background:#f6f4ee;display:flex;');
  (document.body || document.documentElement).appendChild(el);
  document.addEventListener('DOMContentLoaded', function () { if (document.body && el.parentNode !== document.body) document.body.appendChild(el); });

  function show() { el.style.display = 'flex'; }
  function hide() { el.style.display = 'none'; }
  function showLoading(msg) {
    el.innerHTML = '<div style="margin:auto;text-align:center;font-family:system-ui,sans-serif;">'
      + '<div style="width:40px;height:40px;border:4px solid #cfe7dd;border-top-color:#0f7a57;border-radius:50%;margin:0 auto 16px;animation:ctspin .8s linear infinite;"></div>'
      + '<div style="font-size:14px;color:#5a6b63;">' + (msg || 'Carregando…') + '</div>'
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
      + '<h2 style="font-family:Georgia,serif;font-size:26px;font-weight:600;color:#1a1a1a;margin:0;">' + title + '</h2>'
      + '<p style="font-size:13.5px;color:#7a857f;margin:6px 0 24px;">Acesse sua conta para salvar e sincronizar seus estudos.</p>'
      + '<label style="display:block;font-size:12px;color:#5a6b63;font-weight:600;margin-bottom:6px;">E-mail</label>'
      + '<input id="cte" type="email" autocomplete="email" placeholder="voce@email.com" style="width:100%;box-sizing:border-box;border:1px solid #d9d5cc;background:#fff;border-radius:10px;padding:12px 14px;font-size:14px;color:#1a1a1a;margin-bottom:14px;">'
      + '<label style="display:block;font-size:12px;color:#5a6b63;font-weight:600;margin-bottom:6px;">Senha</label>'
      + '<input id="ctp" type="password" autocomplete="' + (mode === 'login' ? 'current-password' : 'new-password') + '" placeholder="••••••••" style="width:100%;box-sizing:border-box;border:1px solid #d9d5cc;background:#fff;border-radius:10px;padding:12px 14px;font-size:14px;color:#1a1a1a;margin-bottom:8px;">'
      + '<div id="cterr" style="min-height:18px;font-size:12.5px;color:#c0392f;margin:4px 0 10px;line-height:1.4;"></div>'
      + '<button id="cts" type="submit" style="width:100%;background:#0f7a57;color:#fff;border:none;border-radius:11px;padding:13px;font-weight:600;font-size:15px;cursor:pointer;font-family:inherit;">' + title + '</button>'
      + '<p id="ctt" style="font-size:12.5px;color:#7a857f;text-align:center;margin:18px 0 0;cursor:pointer;">' + alt + '</p>'
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
    if (sessionStorage.getItem('catedra:hydrated') === '1') { _si('catedra:auth', '1'); hydrating = false; hide(); return; }
    showLoading('Carregando seus dados…');
    sb.from('user_data').select('data').eq('user_id', u.id).maybeSingle().then(function (res) {
      var row = res && res.data;
      if (row && row.data && Object.keys(row.data).length) { clearLocal(); applyData(row.data); }
      else { sb.from('user_data').upsert({ user_id: u.id, data: collect(), updated_at: new Date().toISOString() }); }
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
