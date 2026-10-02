/* BACKUP NA NUVEM PESSOAL — ERRO LEGÍVEL E SEM FAIXA VERMELHA (01/10/2026).

   No primeiro teste com o GOOGLE_CLIENT_ID ligado na Vercel, "Salvar no Google Drive" acendeu a
   faixa vermelha global: "Erro no app (toque para fechar): promise: HTTP 403 … at backupDrive".
   Dois defeitos:
   · o Drive explica o 403 no corpo JSON (API desligada no projeto do Google Cloud, permissão do
     Drive desmarcada, token vencido, cota…) e o app jogava o corpo fora — sobrava "HTTP 403";
   · o backupDrive RELANÇA a falha de propósito (o backup automático semanal, D11, precisa saber
     que falhou), mas o botão chamava sem .catch: a rejeição virava unhandledrejection e caía no
     #ct-errbar. O botão do iCloud (Mac/iPad) tinha o mesmo furo: cancelar o seletor de pasta
     rejeitava e acendia a faixa.

   Aqui o Google Identity é falso (window.google antes do app) e a API do Drive responde por uma
   rota em www.googleapis.com — nada sai para a rede. O que se MEDE:
   · o caminho feliz chega à API de verdade (listar + enviar): sem isso o resto passaria por
     vacuidade;
   · em cada erro conhecido do Drive, clicar não deixa #ct-errbar nem erro novo na fila, e o
     aviso VISÍVEL (opacidade medida) traz o motivo em português, não "HTTP 403";
   · motivo desconhecido cai no texto do próprio Google, com o código HTTP;
   · Drive cheio (o 403 real): só o envio falha, e o aviso oferece outra conta Google — que
     reabre a janela do Google com a escolha de conta (prompt select_account);
   · permissão do Drive desmarcada na tela do Google: falha antes de chamar a API;
   · o automático com o mesmo 403 ainda marca backupAutoErro e não grava o carimbo (contrato
     do D11);
   · no nativo, cancelar o seletor de pasta e uma falha de gravação não acendem a faixa. */

const ESCOPO = 'https://www.googleapis.com/auth/drive.file';

// Corpos de erro no formato da API do Drive v3 (error.message, errors[].reason, details[].reason)
const ERRO = {
  apiDesligada: { status: 403, corpo: { error: { code: 403,
    message: 'Google Drive API has not been used in project 123456789 before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=123456789 then retry.',
    errors: [{ message: 'Google Drive API has not been used in project 123456789 before or it is disabled.', domain: 'usageLimits', reason: 'accessNotConfigured' }],
    status: 'PERMISSION_DENIED',
    details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'SERVICE_DISABLED', domain: 'googleapis.com' }] } } },
  semEscopo: { status: 403, corpo: { error: { code: 403, message: 'Request had insufficient authentication scopes.',
    errors: [{ message: 'Insufficient Permission', domain: 'global', reason: 'insufficientPermissions' }],
    status: 'PERMISSION_DENIED',
    details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'ACCESS_TOKEN_SCOPE_INSUFFICIENT' }] } } },
  tokenVencido: { status: 401, corpo: { error: { code: 401, message: 'Request had invalid authentication credentials. Expected OAuth 2 access token.',
    errors: [{ message: 'Invalid Credentials', domain: 'global', reason: 'authError', location: 'Authorization' }],
    status: 'UNAUTHENTICATED' } } },
  // o 403 real da Lana (01/10/2026, capturado no Chrome dela): o GET da lista passa e o POST do
  // envio volta assim — a conta escolhida na janela do Google está com o Drive cheio
  driveCheio: { status: 403, corpo: { error: { code: 403, message: "The user's Drive storage quota has been exceeded.",
    errors: [{ message: "The user's Drive storage quota has been exceeded.", domain: 'usageLimits', reason: 'storageQuotaExceeded' }] } } },
  cota: { status: 403, corpo: { error: { code: 403, message: 'User rate limit exceeded.',
    errors: [{ message: 'User rate limit exceeded.', domain: 'usageLimits', reason: 'userRateLimitExceeded' }] } } },
  desconhecido: { status: 400, corpo: { error: { code: 400, message: 'Invalid Value',
    errors: [{ message: 'Invalid Value', domain: 'global', reason: 'invalid' }] } } },
};

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS' };

async function abrirAjustesDados(page, base) {
  await page.goto(base + '/__semente');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); });
  await page.goto(base + '/Catedra.dc.html');
  await page.waitForFunction(() => !!(window.__catedraApp && window.__catedraGoView), null, { timeout: 20000 });
  await page.waitForTimeout(600);
  await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__catedraGoView('ajustes'); await w(700);
    const aba = [...document.querySelectorAll('main .aj-abas button[data-s]')].find(b => b.dataset.s === 'dados');
    if (aba) { aba.click(); await w(600); }
  });
}

// Antes de cada clique: some com qualquer faixa anterior e guarda o tamanho da fila de erros.
const marcarErros = (page) => page.evaluate(() => {
  const b = document.getElementById('ct-errbar'); if (b) b.remove();
  try { return (JSON.parse(localStorage.getItem('catedra:_errFila') || '[]') || []).length; } catch (_) { return 0; }
});

// Depois do clique: a faixa global está na tela? algum erro novo entrou na fila? e o aviso
// que a pessoa VÊ agora — role=status com opacidade cheia (o toast some por opacidade).
const medir = (page, filaAntes) => page.evaluate((antes) => {
  const b = document.getElementById('ct-errbar');
  let fila = []; try { fila = JSON.parse(localStorage.getItem('catedra:_errFila') || '[]') || []; } catch (_) {}
  const visiveis = [...document.querySelectorAll('[role="status"]')]
    .filter(el => parseFloat(getComputedStyle(el).opacity) > 0.9 && el.getBoundingClientRect().height > 0)
    .map(el => el.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
  return { faixa: b ? b.textContent.slice(0, 160) : null, errosNovos: fila.slice(antes).map(x => x.m).join(' | '), aviso: visiveis.join(' / ') };
}, filaAntes);

async function clicar(page, rotulo) {
  const antes = await marcarErros(page);
  await page.locator('main button', { hasText: rotulo }).first().click();
  await page.waitForTimeout(1400);
  return medir(page, antes);
}

export async function testarBackupDriveErros(browser, base, ok) {
  /* ---------- Google Drive (web) ---------- */
  const ctx = await browser.newContext();
  try {
    await ctx.addInitScript((escopo) => {
      window.CATEDRA_GOOGLE = { clientId: 'x' };
      window.__gis = { escopo, pedidos: 0, prompts: [] };
      window.google = { accounts: { oauth2: {
        initTokenClient: (cfg) => ({ requestAccessToken: (o) => { window.__gis.pedidos++; window.__gis.prompts.push((o && o.prompt) || '');
          setTimeout(() => cfg.callback({ access_token: 'token-falso', token_type: 'Bearer', expires_in: 3599, scope: window.__gis.escopo }), 0); } }),
        hasGrantedAllScopes: (r, ...esc) => { const tem = String((r && r.scope) || '').split(' '); return esc.every(s => tem.includes(s)); },
      } } };
    }, ESCOPO);
    let resposta = null;                      // null = caminho feliz; {soEnvio} = a lista passa e o envio falha
    const pedidos = [];
    await ctx.route('https://www.googleapis.com/**', (rota) => {
      const req = rota.request();
      if (req.method() === 'OPTIONS') return rota.fulfill({ status: 204, headers: CORS });
      pedidos.push(req.method() + ' ' + req.url().replace(/\?.*/, ''));
      const json = { ...CORS, 'content-type': 'application/json; charset=UTF-8' };
      const erro = resposta && (resposta.soEnvio ? (req.method() === 'GET' ? null : resposta.soEnvio) : resposta);
      if (erro) return rota.fulfill({ status: erro.status, headers: json, body: JSON.stringify(erro.corpo) });
      if (req.method() === 'GET') return rota.fulfill({ status: 200, headers: json, body: JSON.stringify({ files: [] }) });
      return rota.fulfill({ status: 200, headers: json, body: JSON.stringify({ id: 'arquivo-1', name: 'catedra-backup.json' }) });
    });
    const page = await ctx.newPage();
    page.on('dialog', d => d.dismiss());
    await abrirAjustesDados(page, base);
    const temBotao = await page.locator('main button', { hasText: 'Salvar no Google Drive' }).count();
    ok(temBotao > 0, 'BACKUP/Drive com CATEDRA_GOOGLE.clientId o botão "Salvar no Google Drive" aparece em Ajustes › Dados');
    if (!temBotao) return;

    // caminho feliz: prova que o clique chega à API pelos falsos (lista e depois envia)
    let m = await clicar(page, 'Salvar no Google Drive');
    const feliz = pedidos.slice();
    ok(feliz.some(p => /^GET .*\/drive\/v3\/files$/.test(p)) && feliz.some(p => /^POST .*\/upload\/drive\/v3\/files$/.test(p)) && /salvo no Google Drive/.test(m.aviso),
      'BACKUP/Drive o caminho feliz lista e envia pela API e avisa que salvou (' + feliz.join(', ') + ' · "' + m.aviso + '")');

    const casos = [
      ['apiDesligada', /API do Google Drive não está ativada/, 'a API desligada no projeto do Google Cloud'],
      ['semEscopo', /permissão/, 'a permissão do Drive não concedida'],
      ['tokenVencido', /expirou/, 'a sessão do Google expirada (401)'],
      ['cota', /pedidos demais/, 'o limite de pedidos do Drive'],
      ['desconhecido', /Invalid Value.*400|400.*Invalid Value/, 'motivo desconhecido (cai no texto do Google com o código)'],
    ];
    for (const [k, re, nome] of casos) {
      resposta = ERRO[k];
      m = await clicar(page, 'Salvar no Google Drive');
      ok(!m.faixa && !m.errosNovos, 'BACKUP/Drive ' + nome + ': clicar não acende a faixa vermelha (' + (m.faixa || m.errosNovos || 'sem faixa') + ')');
      ok(re.test(m.aviso) && !/^Google Drive: HTTP \d+$/.test(m.aviso), 'BACKUP/Drive ' + nome + ': o aviso visível diz o motivo ("' + m.aviso + '")');
    }

    // o 403 REAL: a lista passa, o envio volta com storageQuotaExceeded. O aviso diz que o Drive
    // desta conta está cheio e oferece outra conta — sem isso a pessoa não tinha como trocar,
    // porque o Google reaproveita em silêncio a conta que já autorizou
    resposta = { soEnvio: ERRO.driveCheio };
    m = await clicar(page, 'Salvar no Google Drive');
    ok(!m.faixa && !m.errosNovos && /sem espaço/.test(m.aviso) && /outra conta/.test(m.aviso),
      'BACKUP/Drive o Drive cheio (o 403 real) diz que falta espaço e sugere outra conta, sem faixa ("' + m.aviso + '"' + (m.faixa ? ' · faixa: ' + m.faixa : '') + ')');
    const trocar = page.locator('[role="status"] button', { hasText: /outra conta/i });
    const temTrocar = await trocar.count();
    ok(temTrocar > 0, 'BACKUP/Drive o aviso de Drive cheio tem o botão de usar outra conta Google');
    if (temTrocar) {
      resposta = null;                        // a outra conta tem espaço
      const antes = await marcarErros(page);
      await trocar.first().click();
      await page.waitForTimeout(1400);
      m = await medir(page, antes);
      const prompts = await page.evaluate(() => window.__gis.prompts.slice());
      ok(prompts[prompts.length - 1] === 'select_account' && /salvo no Google Drive/.test(m.aviso) && !m.faixa,
        'BACKUP/Drive "usar outra conta" reabre o Google com a escolha de conta e salva (' + prompts.slice(-2).join(' → ') + ' · "' + m.aviso + '")');
      ok(prompts.slice(0, -1).every(p => p !== 'select_account'), 'BACKUP/Drive o clique comum não força a escolha de conta a cada backup');
    }

    // restaurar passa pelo mesmo tradutor (a busca do arquivo é a primeira chamada)
    resposta = ERRO.apiDesligada;
    m = await clicar(page, 'Restaurar do Google Drive');
    ok(!m.faixa && !m.errosNovos && /API do Google Drive não está ativada/.test(m.aviso),
      'BACKUP/Drive restaurar com a API desligada diz o motivo, sem faixa ("' + m.aviso + '"' + (m.faixa ? ' · faixa: ' + m.faixa : '') + ')');

    // permissão desmarcada na tela do Google: o token vem, mas sem o escopo do Drive —
    // falha ANTES de chamar a API, com o motivo
    resposta = null;
    await page.evaluate(() => { window.__gis.escopo = 'openid email'; });
    const nAntes = pedidos.length;
    m = await clicar(page, 'Salvar no Google Drive');
    ok(pedidos.length === nAntes && /permissão/.test(m.aviso) && !m.faixa && !m.errosNovos,
      'BACKUP/Drive sem a permissão do Drive marcada nem chama a API e diz o que fazer (' + (pedidos.length - nAntes) + ' pedidos · "' + m.aviso + '")');
    await page.evaluate((e) => { window.__gis.escopo = e; }, ESCOPO);

    // D11: o automático com o mesmo 403 continua sabendo que falhou
    resposta = ERRO.apiDesligada;
    const filaAntes = await marcarErros(page);
    const auto = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const app = window.__catedraApp;
      ['catedra:_bkpAutoTs', 'catedra:_bkpAutoTry'].forEach(k => localStorage.removeItem(k));
      app.setState({ prefs: { ...(app.state.prefs || {}), backupAuto: true }, backupAutoErro: false });
      await w(200);
      app._backupAutoSemanal();
      for (let i = 0; i < 40 && !app.state.backupAutoErro; i++) await w(50);
      await w(300);
      return { erro: app.state.backupAutoErro, carimbo: localStorage.getItem('catedra:_bkpAutoTs') };
    });
    m = await medir(page, filaAntes);
    ok(auto.erro === true && !auto.carimbo, 'BACKUP/Drive D11: o automático com 403 marca backupAutoErro e não grava o carimbo de sucesso (erro=' + auto.erro + ', carimbo=' + auto.carimbo + ')');
    ok(/backup automático falhou/.test(m.aviso) && /API do Google Drive não está ativada/.test(m.aviso) && !m.faixa && !m.errosNovos,
      'BACKUP/Drive D11: o aviso do automático traz o motivo traduzido, sem faixa ("' + m.aviso + '")');

    // o aviso do automático manda "clicar em salvar acima": quando ela clica e o backup manual
    // dá certo, o aviso tem de sumir (antes ficava — o carimbo só era gravado pelo automático)
    const efeito = () => page.evaluate(() => {
      const rot = [...document.querySelectorAll('main label span')].find(x => x.textContent.trim() === 'Backup automático semanal');
      const caixa = rot && rot.closest('label') && rot.closest('label').parentElement;
      const el = caixa && caixa.lastElementChild;
      return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    });
    const antesManual = await efeito();
    resposta = null;
    m = await clicar(page, 'Salvar no Google Drive');
    const depoisManual = await efeito();
    const errAuto = await page.evaluate(() => window.__catedraApp.state.backupAutoErro);
    ok(/não completou/.test(antesManual) && /salvo no Google Drive/.test(m.aviso) && !/não completou/.test(depoisManual) && /uma vez por semana/.test(depoisManual) && errAuto === false,
      'BACKUP/Drive o backup manual que dá certo apaga o aviso de falha do automático ("' + antesManual.slice(0, 60) + '…" → "' + depoisManual.slice(0, 80) + '")');
    // e conta como o backup da semana: o automático não repete logo em seguida
    const nAuto = pedidos.length;
    await page.evaluate(async () => { localStorage.removeItem('catedra:_bkpAutoTry'); window.__catedraApp._backupAutoSemanal(); await new Promise(r => setTimeout(r, 600)); });
    ok(pedidos.length === nAuto, 'BACKUP/Drive o backup manual conta como o da semana: o automático não repete em seguida (' + (pedidos.length - nAuto) + ' pedidos)');
  } finally { await ctx.close(); }

  /* ---------- iCloud Drive (ponte nativa do Mac/iPad) ---------- */
  const ctxN = await browser.newContext();
  try {
    await ctxN.addInitScript(() => {
      window.__icloud = { resposta: { cancelado: true }, chamadas: 0 };
      window.webkit = { messageHandlers: { catedraBackup: { postMessage: async () => { window.__icloud.chamadas++; return window.__icloud.resposta; } } } };
    });
    const page = await ctxN.newPage();
    await abrirAjustesDados(page, base);
    const temBotao = await page.locator('main button', { hasText: 'Salvar no iCloud Drive' }).count();
    ok(temBotao > 0, 'BACKUP/iCloud com a ponte catedraBackup o botão "Salvar no iCloud Drive" aparece');
    if (!temBotao) return;
    let m = await clicar(page, 'Salvar no iCloud Drive');
    const ch = await page.evaluate(() => window.__icloud.chamadas);
    ok(ch > 0 && !m.faixa && !m.errosNovos, 'BACKUP/iCloud cancelar o seletor de pasta não acende a faixa vermelha (' + ch + ' chamadas · ' + (m.faixa || m.errosNovos || 'sem faixa') + ')');
    await page.evaluate(() => { window.__icloud.resposta = { ok: false, erro: 'sem espaço no iCloud' }; });
    m = await clicar(page, 'Salvar no iCloud Drive');
    ok(!m.faixa && !m.errosNovos && /sem espaço no iCloud/.test(m.aviso), 'BACKUP/iCloud falha ao gravar avisa o motivo, sem faixa ("' + m.aviso + '")');
  } finally { await ctxN.close(); }
}
