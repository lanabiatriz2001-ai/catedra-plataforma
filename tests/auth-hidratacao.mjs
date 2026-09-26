/* HIDRATAÇÃO QUE NÃO FINGE QUE ENVIOU (24/09/2026).

   A hidratação do onLogin (primeiro login, toda abertura do Mac/iPad com sessionStorage novo,
   volta da sessão pendente) mesclava nuvem + local e fazia um sb.from('user_data').upsert(...)
   SOLTO, sem .then. O builder do supabase-js é preguiçoso — a requisição só sai no then() —
   então esse upsert nunca saiu, desde o primeiro sync. Mesmo assim o código apagava o _dirty,
   carimbava _lastSrv com o relógio do cliente e o selo virava "salvo": o que só existia neste
   aparelho ficava fora da nuvem sem aviso, e o Sair o apagava sem perguntar.

   Agora a hidratação não envia nada: marca pendência quando já havia (jaSujo) ou quando o
   local trouxe algo que a nuvem não tem (contribuiu, pelo blob ENXUTO), grava _lastSrv com o
   updated_at do servidor, e o pushNow depois do reload sobe com leitura antes de gravar.

   Roda com tests/auth-ipad-fixture.html — auth.js de verdade, Supabase falso PREGUIÇOSO (só
   registra e responde no then) e controlado por __ct:* (sobrevive aos reloads). Cada caso em
   contexto próprio, relógio fixo (page.clock.install) e semente gravada a partir de
   base + '/__semente' (404 na mesma origem): nada do auth.js vivo durante a semente. Por isso
   só na origem http.

   Casos:
   (a) local [s1] sujo + nuvem [s9]: upsert EXECUTADO com s1 e s9; o sujo só some depois da
       resposta (__ct:upsertAtraso);
   (b) upsert falhando ({error}, sem rejeitar): _dirty '1', selo ≠ 'salvo', _lastSrv = updated_at
       do servidor, nova tentativa em 30 s;
   (c) depois de (b), Sair avisa a pendência e desistir não apaga nada;
   (d) sem contribuição local: nenhum upsert na abertura (guarda contra push a cada abertura) —
       também com PDF local na biblioteca e com o interruptor catedra:dark='0'; duas aberturas;
   (e) conta nova sem linha, com dado local: sobe;
   (f) conta nova sem nada local: não cria linha;
   (g) aparelho "contaminado" pelo defeito antigo (dado ausente da nuvem, sem _dirty, sem
       hydrated): a abertura detecta e sobe;
   (h) interruptor: catedra:dark='0' local com carimbo mais novo que o '1' da nuvem: sobe o '0'
       (um critério com temConteudo trataria '0' como vazio e nunca resgataria);
   (i) serverNewer compara INSTANTES, não texto: o mesmo instante em fusos diferentes não conta
       como "mais novo"; 1 ms depois (com microssegundos, como o PostgREST devolve) conta;
   (j) edição feita com o upsert da abertura em voo: não perde o sujo nem o envio — sobe logo
       depois, e o selo só diz "salvo" quando ela chegou;
   (k) login pelo FORMULÁRIO (hydrating já falso): o reload da própria hidratação não manda o
       POST cego do flushSync (keepalive, sem reler a nuvem); quem sobe é o pushNow pós-reload;
   (l) o mesmo na sessão pendente retomada (TOKEN_REFRESHED → retomarSessao, reload em 700 ms).

   A TRAVA DA HIDRATAÇÃO (25/09/2026). Só a sessão guardada abre com `hydrating` = true; os
   outros caminhos chegavam ao onLogin com o portão aberto, e o 'hidden' (pushNow) e o pagehide
   (flushSync CEGO, com o blob local ainda não mesclado) subiam dados durante o "Carregando seus
   dados…" e durante a tela de aceite dos Termos (P14), antes do aceite. Agora uma trava única
   vai do começo da hidratação até o reload. Estes casos carregam o juridico.js de verdade (a
   fixture não o carrega; o teste o injeta pela rota, sem mexer no arquivo):
   (m) login pelo formulário + 'hidden' e pagehide durante o carregamento e durante a tela de
       aceite: nenhum upsert, nenhum POST keepalive antes do aceite; depois de aceitar, o pushNow
       pós-reload sobe o merge (s9+s1) e o aceite novo;
   (n) "Não aceito — sair da conta" com a trava ligada: não sobe nada, e um login seguinte na
       mesma aba hidrata e sobe normalmente;
   (o) erro na leitura da hidratação: a trava é solta — uma edição depois marca sujo e, com a
       rede de volta, sobe;
   (p) sessão pendente retomada + 'hidden' na tela de aceite + Aceitar com o envio lento: a
       pendência não é apagada por um envio em voo sem o aceite; o aceite novo sobe depois do
       reload (o setDirty(true) avança a geração); (p2) o mesmo com o autosave gravando nos
       700 ms antes do reload do viaPendente: a edição sobe junto.

   Todo caso confere que a hidratação TERMINOU (hydrated=1 e portão oculto) antes das guardas:
   sem isso, "nenhum upsert" passaria num fluxo que travou antes de chegar lá. */

const FIX = '/tests/auth-ipad-fixture.html';
const U1 = { id: 'u1', email: 'lana@exemplo.com' };
const AGORA = new Date('2026-09-24T12:00:00.000Z');
const UPD = '2026-01-01T00:00:00.000Z';
const S1 = { id: 's1', up: 1000, t: 'local' }, S9 = { id: 's9', up: 2000, t: 'nuvem' };
const linhaCom = data => ({ data: { data, updated_at: UPD }, error: null });
const FALHA = { data: null, error: { message: 'TypeError: Failed to fetch', code: '' } };

export async function testarAuthHidratacao(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const R = 'AUTH HIDRATAÇÃO [' + motor + '] ';
  const browser = pageDaSuite.context().browser();
  const caso = (cfg, corpo) => casoBase(browser, base, ok, R, cfg, corpo);

  // (a) sujo local + nuvem: sobe as duas, e o sujo só some quando a resposta chega
  await caso({
    nome: '(a)',
    local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:_dirty': '1' },
    ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }), upsertAtraso: 2000 },
  }, async (page, h) => {
    // o upsert foi PEDIDO (then chamado) mas a resposta ainda não veio: continua sujo
    const pediu = await h.esperar(() => window.__ctChamadas().some(c => c.nome === 'upsert'), 8000);
    const durante = await page.evaluate(() => ({ dirty: localStorage.getItem('catedra:_dirty'), status: window.CatedraSync.status }));
    ok(pediu, R + '(a) o upsert da abertura foi pedido');
    ok(pediu && durante.dirty === '1' && durante.status !== 'salvo', R + '(a) com o upsert em voo, o sujo continua e o selo não diz "salvo" (' + durante.dirty + ', ' + durante.status + ')');
    await page.waitForTimeout(2600);
    const r = await h.ler();
    const subiu = r.ups.map(u => u.sessions).join('|');
    ok(r.ups.length >= 1 && /"s1"/.test(subiu) && /"s9"/.test(subiu), R + '(a) o upsert é EXECUTADO e leva s1 e s9 (' + r.ups.length + ' upsert[s])');
    ok(r.dirty == null && r.status === 'salvo', R + '(a) o sujo some só depois da resposta, e o selo vira "salvo" (' + r.dirty + ', ' + r.status + ')');
    ok(r.lastSrv !== UPD && r.lastSrv > UPD, R + '(a) depois do envio confirmado, _lastSrv avança para o carimbo do envio (' + r.lastSrv + ')');
  });

  // (b) + (c) upsert falha: nada de "salvo", o sujo fica, _lastSrv é o do servidor; o Sair avisa
  await caso({
    nome: '(b)',
    local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:_dirty': '1' },
    ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }), upsert: FALHA },
  }, async (page, h) => {
    await page.waitForTimeout(1500);
    const r = await h.ler();
    ok(r.dirty === '1', R + '(b) envio que falhou: _dirty continua "1" (' + r.dirty + ')');
    ok(r.status !== 'salvo' && /erro|offline/.test(r.status), R + '(b) envio que falhou: o selo não diz "salvo" (' + r.status + ')');
    ok(r.lastSrv === UPD, R + '(b) envio que falhou: _lastSrv é o updated_at do servidor, não o relógio do cliente (' + r.lastSrv + ')');
    ok(r.chamadas.filter(n => n === 'upsert').length >= 1, R + '(b) o envio foi de fato tentado (upsert executado)');
    const n0 = r.chamadas.length;
    await page.clock.runFor(31000);
    await page.waitForTimeout(300);
    const r2 = await h.ler();
    const novas = r2.chamadas.slice(n0);
    ok(novas.includes('select') && novas.includes('upsert') && r2.dirty === '1', R + '(b) nova tentativa em 30 s (select e upsert de novo), sujo mantido (' + novas.join(',') + ')');

    // (c) Sair logo depois: o aviso de pendência aparece; desistir não apaga nem desloga
    let dialogo = '';
    page.once('dialog', async dl => { dialogo = dl.message(); await dl.dismiss(); });
    await page.evaluate(() => window.CatedraAuth.logout());
    await page.waitForTimeout(400);
    const c = await page.evaluate(() => ({
      s1: /"s1"/.test(localStorage.getItem('catedra:sessions') || ''),
      signOut: window.__ctChamadas().filter(x => x.nome === 'signOut').length,
    }));
    ok(/^Há estudos deste aparelho que ainda não subiram/.test(dialogo), R + '(c) Sair depois da hidratação sem envio avisa a pendência (' + dialogo.slice(0, 50) + '…)');
    ok(c.s1 && c.signOut === 0, R + '(c) desistir de sair mantém s1 e não chama signOut');
  });

  // (d) sem contribuição local: nenhum upsert — abrindo duas vezes seguidas
  {
    const libLocal = [{ id: 'b1', t: 'Livro', up: 500, pdfB64: 'JVBERi0xLjQK', pages: 3 }];
    const libNuvem = [{ id: 'b1', t: 'Livro', up: 500, _pdfLocal: true }];
    const nuvem = {
      'catedra:sessions': JSON.stringify([S9]),
      'catedra:lib': JSON.stringify(libNuvem),
      'catedra:dark': '0',
      'catedra:_kts': JSON.stringify({ 'catedra:sessions': 1000, 'catedra:dark': 1000 }),
    };
    // local igual à nuvem, mas com o PDF anexado e carimbos MAIS NOVOS (como o app que semeia no
    // boot): carimbo novo com o mesmo valor não é dado novo
    const local = {
      'catedra:sessions': JSON.stringify([S9]),
      'catedra:lib': JSON.stringify(libLocal),
      'catedra:dark': '0',
      'catedra:_kts': JSON.stringify({ 'catedra:sessions': 5000, 'catedra:dark': 5000 }),
    };
    await caso({ nome: '(d)', local, ct: { select: linhaCom(nuvem) } }, async (page, h) => {
      await page.waitForTimeout(3000);
      const r = await h.ler();
      ok(r.ups.length === 0, R + '(d) local igual à nuvem (PDF local, dark="0", carimbos novos): nenhum upsert na abertura (' + r.ups.length + ')');
      ok(r.dirty == null && r.status === 'salvo', R + '(d) sem contribuição: sem sujo e selo "salvo" (' + r.dirty + ', ' + r.status + ')');
      ok(r.lastSrv === UPD, R + '(d) sem contribuição: _lastSrv é o updated_at do servidor (' + r.lastSrv + ')');
      const pdf = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('catedra:lib'))[0].pdfB64; } catch (_) { return null; } });
      ok(pdf === 'JVBERi0xLjQK', R + '(d) o PDF local continua no aparelho depois da hidratação');
      // segunda abertura (sessionStorage novo, como cada lançamento do app no Mac/iPad)
      await page.evaluate(() => { sessionStorage.clear(); localStorage.setItem('__ct:chamadas', '[]'); });
      await page.reload();
      ok(await h.hidratado(), R + '(d) a segunda abertura terminou a hidratação (hydrated=1 e portão oculto)');
      await page.waitForTimeout(3000);
      const r2 = await h.ler();
      ok(r2.ups.length === 0 && r2.dirty == null, R + '(d) segunda abertura seguida: também nenhum upsert (' + r2.ups.length + ')');
    });
  }

  // (e) conta nova (sem linha) com dado local: sobe
  await caso({
    nome: '(e)',
    local: { 'catedra:sessions': JSON.stringify([S1]) },
    ct: { select: { data: null, error: null }, upsertAtraso: 1500 },
  }, async (page, h) => {
    const pediu = await h.esperar(() => window.__ctChamadas().some(c => c.nome === 'upsert'), 8000);
    const durante = await page.evaluate(() => ({ dirty: localStorage.getItem('catedra:_dirty'), status: window.CatedraSync.status }));
    ok(pediu && durante.dirty === '1' && durante.status !== 'salvo', R + '(e) conta sem linha: com o upsert em voo, o sujo continua e o selo não diz "salvo" (' + durante.dirty + ', ' + durante.status + ')');
    await page.waitForTimeout(2100);
    const r = await h.ler();
    ok(r.ups.length >= 1 && /"s1"/.test(r.ups.map(u => u.sessions).join('|')), R + '(e) conta sem linha e dado local: o upsert sai com s1 (' + r.ups.length + ')');
    ok(r.ups.length >= 1 && r.dirty == null && r.status === 'salvo', R + '(e) conta sem linha: depois da resposta do upsert, sujo limpo e "salvo" (' + r.dirty + ', ' + r.status + ')');
  });

  // (f) conta nova sem nada local: não cria linha
  await caso({
    nome: '(f)',
    local: {},
    ct: { select: { data: null, error: null } },
  }, async (page, h) => {
    await page.waitForTimeout(3000);
    const r = await h.ler();
    ok(r.ups.length === 0 && r.dirty == null, R + '(f) conta sem linha e nada local: nenhum upsert, nenhuma linha vazia (' + r.ups.length + ')');
  });

  // (g) aparelho contaminado: s1 só aqui, sem _dirty, sem hydrated — a abertura resgata
  await caso({
    nome: '(g)',
    local: { 'catedra:sessions': JSON.stringify([S1]) },
    ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }), upsertAtraso: 1500 },
  }, async (page, h) => {
    const pediu = await h.esperar(() => window.__ctChamadas().some(c => c.nome === 'upsert'), 8000);
    const durante = await page.evaluate(() => ({ dirty: localStorage.getItem('catedra:_dirty'), status: window.CatedraSync.status }));
    ok(pediu && durante.dirty === '1' && durante.status !== 'salvo', R + '(g) aparelho contaminado: a abertura marca sujo e, com o upsert em voo, o selo não diz "salvo" (' + durante.dirty + ', ' + durante.status + ')');
    await page.waitForTimeout(2100);
    const r = await h.ler();
    const subiu = r.ups.map(u => u.sessions).join('|');
    ok(r.ups.length >= 1 && /"s1"/.test(subiu) && /"s9"/.test(subiu), R + '(g) aparelho contaminado (sem _dirty): a abertura detecta e sobe s1 junto de s9 (' + r.ups.length + ')');
    ok(r.ups.length >= 1 && r.dirty == null && r.status === 'salvo', R + '(g) depois da resposta do upsert de resgate, sem sujo e "salvo" (' + r.dirty + ', ' + r.status + ')');
  });

  // (h) interruptor: '0' local mais novo que o '1' da nuvem
  await caso({
    nome: '(h)',
    local: { 'catedra:dark': '0', 'catedra:_kts': JSON.stringify({ 'catedra:dark': 9000 }) },
    ct: { select: linhaCom({ 'catedra:dark': '1', 'catedra:_kts': JSON.stringify({ 'catedra:dark': 1000 }) }) },
  }, async (page, h) => {
    await page.waitForTimeout(1600);
    const r = await h.ler();
    ok(r.ups.length >= 1 && r.ups.every(u => u.dark === '0'), R + '(h) tema claro escolhido aqui (dark="0", carimbo mais novo) sobe para a nuvem (' + r.ups.map(u => u.dark).join(',') + ')');
  });

  // (i) serverNewer por instante: o mesmo instante escrito em dois fusos não é "mais novo".
  // Por texto, '…T10:00:00.12+00:00' > '…T07:00:00.12-03:00' — e a nuvem venceria os escalares
  // de um aparelho limpo sem ter mudado nada.
  await caso({
    nome: '(i)',
    local: { 'catedra:sessions': JSON.stringify([S9]), 'catedra:_lastSrv': '2026-03-01T07:00:00.12-03:00' },
    ct: { select: { data: { data: { 'catedra:sessions': JSON.stringify([S9, { id: 's7', up: 3000 }]) }, updated_at: '2026-03-01T10:00:00.12+00:00' }, error: null } },
    hidratado: true,
  }, async (page, h) => {
    await page.waitForTimeout(1300);
    const mesmo = await page.evaluate(() => /"s7"/.test(localStorage.getItem('catedra:sessions') || ''));
    ok(!mesmo, R + '(i) _lastSrv "07:00:00.12-03:00" e updated_at "10:00:00.12+00:00" são o mesmo instante: a nuvem não conta como mais nova');
    // 1 ms depois (com microssegundos, como o PostgREST devolve) já é mais novo
    await page.evaluate(() => {
      localStorage.setItem('__ct:select', JSON.stringify({ data: { data: { 'catedra:sessions': JSON.stringify([{ id: 's9', up: 2000, t: 'nuvem' }, { id: 's7', up: 3000 }]) }, updated_at: '2026-03-01T10:00:00.121345+00:00' }, error: null }));
      window.dispatchEvent(new Event('online'));
    });
    await page.waitForTimeout(1300);
    const novo = await page.evaluate(() => ({ s7: /"s7"/.test(localStorage.getItem('catedra:sessions') || ''), last: localStorage.getItem('catedra:_lastSrv') }));
    ok(novo.s7 && novo.last === '2026-03-01T10:00:00.121345+00:00', R + '(i) 1 ms depois é mais novo: puxa e guarda o carimbo do servidor como veio (' + novo.last + ')');
  });

  // (j) edição com o upsert da abertura em voo. O CatedraSync.push agenda outro pushNow em 700 ms,
  // que morre no `pushing`; sem a geração, a resposta do primeiro apagava o sujo da edição que
  // não estava no retrato — ela não subia, o selo dizia "salvo" e o Sair não avisava.
  await caso({
    nome: '(j)',
    local: { 'catedra:sessions': JSON.stringify([S1]) },
    ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }), upsertAtraso: 2000 },
  }, async (page, h) => {
    const pediu = await h.esperar(() => window.__ctChamadas().some(c => c.nome === 'upsert'), 8000);
    ok(pediu, R + '(j) o upsert da abertura foi pedido');
    // a pessoa marca algo pelo caminho do app (setItem interceptado → CatedraSync.push)
    await page.evaluate(() => {
      const a = JSON.parse(localStorage.getItem('catedra:sessions') || '[]');
      a.push({ id: 's2', up: 5000, t: 'durante o envio' });
      localStorage.setItem('catedra:sessions', JSON.stringify(a));
    });
    // a resposta do primeiro upsert chega em ~2 s; o segundo sai logo em seguida e demora mais 2 s
    const segundo = await h.esperar(() => window.__ctChamadas().filter(c => c.nome === 'upsert').length >= 2, 4000);
    const meio = await page.evaluate(() => ({ dirty: localStorage.getItem('catedra:_dirty'), status: window.CatedraSync.status }));
    ok(segundo && meio.dirty === '1' && meio.status !== 'salvo', R + '(j) resposta do primeiro envio sem a edição: o sujo fica, o selo não diz "salvo" e o segundo envio sai (' + meio.dirty + ', ' + meio.status + ')');
    await page.waitForTimeout(2600);
    const r = await h.ler();
    const ult = r.ups[r.ups.length - 1] || { sessions: '' };
    ok(r.ups.length >= 2 && /"s2"/.test(ult.sessions) && /"s1"/.test(ult.sessions) && /"s9"/.test(ult.sessions), R + '(j) a edição feita durante o envio sobe no envio seguinte (' + r.ups.length + ' upsert[s])');
    ok(r.dirty == null && r.status === 'salvo', R + '(j) só depois do envio que levou a edição: sem sujo e "salvo" (' + r.dirty + ', ' + r.status + ')');
  });

  // (k) login pelo FORMULÁRIO: aqui `hydrating` já é falso (showLoginState). O reload da
  // hidratação dispara visibilitychange/pagehide; com o sujo que o aparelho trouxe, o flushSync
  // mandava o blob da leitura da hidratação às cegas (POST keepalive, sem reler a nuvem).
  await caso({
    nome: '(k)',
    formulario: true,
    local: { 'catedra:sessions': JSON.stringify([S1]) },
    ct: { signIn: U1, select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }) },
  }, async (page, h) => {
    await page.waitForTimeout(1500);
    const r = await h.ler();
    const f = await h.fetchs();
    ok(f.pagehide >= 1 && f.sujoNoPagehide === '1', R + '(k) o reload da hidratação passou pelo pagehide com o aparelho sujo (' + f.pagehide + ', ' + f.sujoNoPagehide + ')');
    ok(f.lista.filter(x => x.keepalive && /user_data/.test(x.url)).length === 0, R + '(k) login pelo formulário: nenhum POST cego (keepalive) para user_data no reload da hidratação (' + f.lista.length + ' fetch[es])');
    const subiu = r.ups.map(u => u.sessions).join('|');
    ok(r.ups.length >= 1 && /"s1"/.test(subiu) && /"s9"/.test(subiu) && r.dirty == null, R + '(k) quem sobe é o pushNow pós-reload, com leitura antes (' + r.ups.length + ', ' + r.dirty + ')');
  });

  // (l) sessão pendente retomada: abriu offline, a rede volta e o supabase-js renova o token
  // (TOKEN_REFRESHED → retomarSessao → onLogin com viaPendente → reload em 700 ms)
  await caso({
    nome: '(l)',
    pendente: true,
    local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:auth': '1' },
    ct: { online: '0', sessaoErro: { name: 'AuthRetryableFetchError', message: 'Load failed', status: 0 }, select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }) },
  }, async (page, h) => {
    await page.waitForTimeout(1500);
    const r = await h.ler();
    const f = await h.fetchs();
    ok(f.pagehide >= 1 && f.sujoNoPagehide === '1', R + '(l) o reload da sessão retomada passou pelo pagehide com o aparelho sujo (' + f.pagehide + ', ' + f.sujoNoPagehide + ')');
    ok(f.lista.filter(x => x.keepalive && /user_data/.test(x.url)).length === 0, R + '(l) sessão pendente retomada: nenhum POST cego (keepalive) para user_data no reload (' + f.lista.length + ' fetch[es])');
    const subiu = r.ups.map(u => u.sessions).join('|');
    ok(r.ups.length >= 1 && /"s1"/.test(subiu) && /"s9"/.test(subiu) && r.dirty == null, R + '(l) quem sobe é o pushNow pós-reload (' + r.ups.length + ', ' + r.dirty + ')');
  });

  // --- a trava da hidratação ---
  const esconder = page => page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  const mostrar = page => page.evaluate(() => { delete document.visibilityState; });
  const fecharAba = page => page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); });
  const cegos = f => f.lista.filter(x => x.keepalive && /user_data/.test(x.url)).length;
  const VELHO = JSON.stringify({ versao: '0.9/0.9', ts: 1 });
  const aceiteDe = u => String(u.aceite || '');

  // (m) login pelo formulário: 'hidden' + pagehide no "Carregando seus dados…" e na tela de aceite
  await caso({
    nome: '(m)',
    formulario: true, aceite: true, semHidratar: true,
    local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:_dirty': '1', 'catedra:aceite': VELHO },
    ct: { signIn: U1, select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }), selectAtraso: 1500 },
  }, async (page, h) => {
    // 1) carregando: a leitura da hidratação saiu e ainda não voltou
    const carregando = await h.esperar(() => window.__ctChamadas().some(c => c.nome === 'select') && !document.querySelector('#ctac'), 6000);
    ok(carregando, R + '(m) a leitura da hidratação está em voo ("Carregando seus dados…")');
    await esconder(page); await page.waitForTimeout(150); await mostrar(page);
    await fecharAba(page); await page.waitForTimeout(150);
    await page.evaluate(() => localStorage.removeItem('__ct:selectAtraso'));
    // 2) tela de aceite
    const naTela = await h.esperar(() => !!document.querySelector('#ctac'), 8000);
    ok(naTela, R + '(m) a tela de aceite dos Termos apareceu');
    await esconder(page); await page.waitForTimeout(600); await mostrar(page);
    await fecharAba(page); await page.waitForTimeout(600);
    const r0 = await h.ler(), f0 = await h.fetchs();
    const aindaNaTela = await page.evaluate(() => !!document.querySelector('#ctac'));
    ok(r0.ups.length === 0, R + '(m) antes do aceite: nenhum upsert, nem no carregamento nem na tela de aceite (' + r0.ups.length + ')');
    ok(cegos(f0) === 0, R + '(m) antes do aceite: nenhum POST keepalive para user_data (' + cegos(f0) + ')');
    ok(aindaNaTela && r0.dirty === '1', R + '(m) antes do aceite: a tela segue aberta e a pendência fica (' + r0.dirty + ')');
    // 3) aceita: reload e pushNow pós-reload
    await page.click('#ctac'); await page.click('#ctacok');
    ok(await h.hidratado(), R + '(m) depois do aceite a hidratação terminou (hydrated=1 e portão oculto)');
    await page.waitForTimeout(1500);
    const r = await h.ler(), f = await h.fetchs();
    const ult = r.ups[r.ups.length - 1] || {};
    ok(r.ups.length >= 1 && /"s1"/.test(ult.sessions || '') && /"s9"/.test(ult.sessions || ''), R + '(m) depois do aceite, o pushNow pós-reload sobe s9+s1 (' + r.ups.length + ' upsert[s])');
    ok(r.ups.length >= 1 && /"1\.0\/1\.0"/.test(aceiteDe(ult)), R + '(m) e sobe o aceite novo (' + aceiteDe(ult).slice(0, 40) + ')');
    ok(r.ups.every(u => !/0\.9\/0\.9/.test(aceiteDe(u))), R + '(m) nenhum envio levou o aceite velho');
    ok(cegos(f) === 0 && r.dirty == null && r.status === 'salvo', R + '(m) sem POST cego em nenhum momento; sujo limpo e "salvo" (' + cegos(f) + ', ' + r.dirty + ', ' + r.status + ')');
  });

  // (n) "Não aceito — sair da conta" com a trava ligada; depois, outro login na mesma aba
  await caso({
    nome: '(n)',
    formulario: true, aceite: true, semHidratar: true,
    local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:_dirty': '1', 'catedra:aceite': VELHO },
    ct: { signIn: U1, select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }) },
  }, async (page, h) => {
    ok(await h.esperar(() => !!document.querySelector('#ctac'), 8000), R + '(n) a tela de aceite apareceu');
    await esconder(page); await page.waitForTimeout(300); await mostrar(page);
    await page.click('#ctacsair');
    // o fin() apaga o local e recarrega: volta ao formulário, sem sessão
    const noForm = await h.esperar(() => !!document.querySelector('#catedra-auth-gate #cte') && !localStorage.getItem('catedra:sessions'), 8000);
    const r0 = await h.ler(), f0 = await h.fetchs();
    ok(noForm, R + '(n) "Não aceito": volta ao formulário, sem o dado local');
    ok(r0.ups.length === 0 && cegos(f0) === 0 && f0.pagehide >= 1, R + '(n) "Não aceito": nada subiu — nem upsert, nem POST cego no reload (' + r0.ups.length + ', ' + cegos(f0) + ', pagehide ' + f0.pagehide + ')');
    ok(r0.chamadas.includes('signOut'), R + '(n) "Não aceito": a sessão foi encerrada (signOut)');
    // login seguinte na mesma aba
    const seg = await page.$('#ctseg-login'); if (seg) await seg.click();
    await page.fill('#cte', U1.email); await page.fill('#ctp', 'senha-de-teste'); await page.click('#cts');
    ok(await h.esperar(() => !!document.querySelector('#ctac'), 8000), R + '(n) o login seguinte hidrata e chega à tela de aceite de novo');
    await page.click('#ctac'); await page.click('#ctacok');
    ok(await h.hidratado(), R + '(n) o login seguinte termina a hidratação');
    await page.waitForTimeout(1500);
    const r = await h.ler();
    const ult = r.ups[r.ups.length - 1] || {};
    ok(r.ups.length >= 1 && /"1\.0\/1\.0"/.test(aceiteDe(ult)) && /"s9"/.test(ult.sessions || '') && !/"s1"/.test(ult.sessions || ''), R + '(n) o login seguinte sobe o aceite novo com a conta da nuvem (s9; o s1 recusado foi apagado) (' + r.ups.length + ')');
    ok(r.dirty == null && r.status === 'salvo', R + '(n) o login seguinte termina sem sujo e "salvo" (' + r.dirty + ', ' + r.status + ')');
  });

  // (o) erro na leitura da hidratação: a trava é solta e a sessão segue subindo o que se faz
  await caso({
    nome: '(o)',
    formulario: true, semHidratar: true,
    local: { 'catedra:sessions': JSON.stringify([S1]) },
    ct: { signIn: U1, select: FALHA },
  }, async (page, h) => {
    const aberto = await h.esperar(() => !!window.CatedraSync && /erro|offline/.test(window.CatedraSync.status)
      && getComputedStyle(document.getElementById('catedra-auth-gate')).display === 'none', 8000);
    ok(aberto, R + '(o) leitura da hidratação falhou: o app abre com o selo em erro, sem hydrated');
    ok(await page.evaluate(() => sessionStorage.getItem('catedra:hydrated') == null), R + '(o) leitura que falhou não marca hydrated');
    // a pessoa edita: marca sujo e tenta (a leitura ainda falha)
    await page.evaluate(() => { const a = JSON.parse(localStorage.getItem('catedra:sessions') || '[]'); a.push({ id: 's2', up: 5000, t: 'depois do erro' }); localStorage.setItem('catedra:sessions', JSON.stringify(a)); });
    await page.waitForTimeout(1300);
    const r1 = await h.ler();
    ok(r1.dirty === '1', R + '(o) a edição depois do erro marca sujo (' + r1.dirty + ')');
    const selects1 = r1.chamadas.filter(n => n === 'select').length;
    ok(selects1 >= 2, R + '(o) e dispara um envio (a leitura antes de gravar sai: a trava foi solta) (' + selects1 + ' select[s])');
    // a rede volta
    await page.evaluate(() => { localStorage.setItem('__ct:select', JSON.stringify({ data: { data: { 'catedra:sessions': JSON.stringify([{ id: 's9', up: 2000, t: 'nuvem' }]) }, updated_at: '2026-01-01T00:00:00.000Z' }, error: null })); window.dispatchEvent(new Event('online')); });
    await page.waitForTimeout(1500);
    const r = await h.ler();
    const ult = r.ups[r.ups.length - 1] || {};
    ok(r.ups.length >= 1 && /"s2"/.test(ult.sessions || '') && /"s1"/.test(ult.sessions || '') && /"s9"/.test(ult.sessions || ''), R + '(o) com a rede de volta, sobe a edição (s2) junto de s1 e s9 (' + r.ups.length + ')');
    ok(r.dirty == null && r.status === 'salvo', R + '(o) depois do envio, sem sujo e "salvo" (' + r.dirty + ', ' + r.status + ')');
  });

  // (p) sessão pendente retomada + tela de aceite + 'hidden' + Aceitar com o envio lento.
  // Duas voltas: sem escrita depois do Aceitar (o aceite é a ÚNICA marcação de sujo nova — a que
  // escapava do contador) e com o autosave gravando nos 700 ms antes do reload do viaPendente.
  for (const nos700 of [false, true]) {
    const P = nos700 ? '(p2)' : '(p)';
    await caso({
      nome: P,
      pendente: true, aceite: true, semHidratar: true,
      local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:_dirty': '1', 'catedra:auth': '1', 'catedra:aceite': VELHO },
      ct: { online: '0', sessaoErro: { name: 'AuthRetryableFetchError', message: 'Load failed', status: 0 }, select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }), upsertAtraso: 400 },
    }, async (page, h) => {
      ok(await h.esperar(() => !!document.querySelector('#ctac'), 8000), R + P + ' a sessão retomada chegou à tela de aceite');
      await page.click('#ctac');
      // trocar de aba com a pendência marcada: antes, isso disparava um pushNow com o aceite velho
      await esconder(page); await page.waitForTimeout(150); await mostrar(page);
      const ups0 = (await h.ler()).ups.length;
      ok(ups0 === 0, R + P + ' "hidden" na tela de aceite: nenhum envio sai (' + ups0 + ')');
      await page.evaluate((nos700) => {
        document.querySelector('#ctacok').click();
        if (!nos700) return;
        const a = JSON.parse(localStorage.getItem('catedra:sessions') || '[]');
        a.push({ id: 's3', up: 6000, t: 'nos 700 ms' });
        localStorage.setItem('catedra:sessions', JSON.stringify(a));
      }, nos700);
      const logo = await page.evaluate(() => localStorage.getItem('catedra:_dirty'));
      ok(logo === '1', R + P + ' logo depois de Aceitar, a pendência está marcada (' + logo + ')');
      ok(await h.hidratado(), R + P + ' a hidratação terminou depois do aceite');
      await page.waitForTimeout(2000);
      const r = await h.ler();
      const comNovo = r.ups.filter(u => /"1\.0\/1\.0"/.test(aceiteDe(u)));
      ok(comNovo.length >= 1, R + P + ' o aceite novo SUBIU (' + r.ups.map(u => aceiteDe(u).slice(12, 19) || '—').join(' | ') + ')');
      ok(comNovo.some(u => /"s1"/.test(u.sessions) && /"s9"/.test(u.sessions) && (!nos700 || /"s3"/.test(u.sessions))),
        R + P + (nos700 ? ' a edição dos 700 ms do viaPendente sobe junto (s1, s3, s9)' : ' o envio com o aceite novo leva s1 e s9'));
      ok(r.ups.every(u => !/0\.9\/0\.9/.test(aceiteDe(u))), R + P + ' nenhum envio levou o aceite velho');
      ok(r.dirty == null && r.status === 'salvo', R + P + ' só depois do envio com o aceite novo: sem sujo e "salvo" (' + r.dirty + ', ' + r.status + ')');
    });
  }
}

/* Um caso: contexto e relógio próprios, semente em /__semente, abre a fixture e CONFERE que a
   hidratação (reload incluso) terminou antes de `corpo(page, h)` — sem isso as guardas de
   "nenhum upsert" passariam num fluxo que travou no meio.
   `formulario`: sem sessão guardada; entra pelo formulário (__ct:signIn).
   `pendente`: abre offline com a sessão pendente e depois a devolve (TOKEN_REFRESHED).
   Nos dois, o fetch da página é embrulhado desde o início (sobrevive ao reload) para registrar o
   POST keepalive do flushSync, e o pagehide anota se o aparelho estava sujo.
   `aceite`: a fixture passa a carregar o juridico.js de verdade (injetado pela rota, antes do
   auth.js) — sem ele não há versão vigente e a tela de aceite nunca aparece.
   `semHidratar`: o próprio corpo conduz (e confere) a hidratação — tela de aceite, erro. */
async function casoBase(browser, base, ok, R, { nome, local, ct, hidratado, formulario, pendente, aceite, semHidratar }, corpo) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA (auth-hidratacao):', e.message));
  try {
    await page.clock.install({ time: AGORA });
    if (aceite) {
      await ctx.route(u => /\/tests\/auth-ipad-fixture\.html$/.test(new URL(u).pathname), async rota => {
        const resp = await rota.fetch();
        const corpoHtml = (await resp.text()).replace('<script src="auth.js"></script>', '<script src="juridico.js"></script>\n<script src="auth.js"></script>');
        await rota.fulfill({ response: resp, body: corpoHtml });
      });
    }
    if (formulario || pendente) {
      await ctx.addInitScript(() => {
        const orig = window.fetch;
        window.fetch = function (u, o) {
          try {
            const l = JSON.parse(localStorage.getItem('__rep:fetch') || '[]');
            l.push({ url: String(u), method: o && o.method, keepalive: !!(o && o.keepalive) });
            localStorage.setItem('__rep:fetch', JSON.stringify(l));
          } catch (_) {}
          return orig.apply(this, arguments);
        };
        window.addEventListener('pagehide', () => {
          if (!/auth-ipad-fixture/.test(location.pathname)) return;   // o /__semente não conta
          try {
            localStorage.setItem('__rep:ph', String(+(localStorage.getItem('__rep:ph') || 0) + 1));
            localStorage.setItem('__rep:sujoNoPh', String(localStorage.getItem('catedra:_dirty')));
          } catch (_) {}
        }, true);
      });
    }
    await page.goto(base + '/__semente');
    await page.evaluate(({ U1, local, ct, hidratado, semSessao }) => {
      localStorage.clear(); sessionStorage.clear();
      if (!semSessao) localStorage.setItem('__ct:sessao', JSON.stringify(U1));
      localStorage.setItem('__ct:online', '1');
      localStorage.setItem('__ct:chamadas', '[]');
      for (const [k, v] of Object.entries(ct || {})) localStorage.setItem('__ct:' + k, typeof v === 'string' ? v : JSON.stringify(v));
      localStorage.setItem('catedra:_owner', U1.id);
      for (const [k, v] of Object.entries(local || {})) localStorage.setItem(k, v);
      if (hidratado) { localStorage.setItem('catedra:auth', '1'); sessionStorage.setItem('catedra:hydrated', '1'); }
    }, { U1, local, ct, hidratado, semSessao: !!formulario });
    const h = {
      // espera tolerante à navegação (a hidratação recarrega a página)
      esperar: async (fn, ms = 10000) => {
        const fim = Date.now() + ms;
        while (Date.now() < fim) {
          try { if (await page.evaluate(fn)) return true; } catch (_) {}
          await new Promise(r => setTimeout(r, 100));
        }
        return false;
      },
      hidratado: () => h.esperar(() => sessionStorage.getItem('catedra:hydrated') === '1' && !!window.CatedraSync && !!window.CatedraAuth
        && getComputedStyle(document.getElementById('catedra-auth-gate')).display === 'none', 12000),
      ler: () => page.evaluate(() => {
        const ch = window.__ctChamadas();
        return {
          chamadas: ch.map(c => c.nome),
          ups: ch.filter(c => c.nome === 'upsert').map(c => ({
            sessions: String(c.arg && c.arg.data && c.arg.data['catedra:sessions'] || ''),
            dark: c.arg && c.arg.data ? c.arg.data['catedra:dark'] : undefined,
            aceite: c.arg && c.arg.data ? c.arg.data['catedra:aceite'] : undefined,
          })),
          dirty: localStorage.getItem('catedra:_dirty'),
          lastSrv: localStorage.getItem('catedra:_lastSrv'),
          status: window.CatedraSync.status,
        };
      }),
      fetchs: () => page.evaluate(() => ({
        lista: JSON.parse(localStorage.getItem('__rep:fetch') || '[]'),
        pagehide: +(localStorage.getItem('__rep:ph') || 0),
        sujoNoPagehide: localStorage.getItem('__rep:sujoNoPh'),
      })),
    };
    await page.goto(base + FIX);
    if (formulario) {
      await page.waitForSelector('#catedra-auth-gate #cte', { timeout: 10000 });
      const seg = await page.$('#ctseg-login'); if (seg) await seg.click();
      await page.fill('#cte', U1.email);
      await page.fill('#ctp', 'senha-de-teste');
      await page.click('#cts');
    }
    if (pendente) {
      // abriu offline com dono e dado local: app aberto, selo "offline", nada hidratado
      const abriu = await h.esperar(() => !!window.CatedraSync && window.CatedraSync.status === 'offline'
        && getComputedStyle(document.getElementById('catedra-auth-gate')).display === 'none', 10000);
      ok(abriu, R + nome + ' abriu offline com a sessão pendente');
      await page.evaluate(({ U1 }) => {
        localStorage.removeItem('__ct:sessaoErro'); localStorage.setItem('__ct:online', '1');
        window.__ctAuthCb('TOKEN_REFRESHED', { user: U1, access_token: 'tok-' + U1.id, refresh_token: 'r', expires_at: 4102444800 });
      }, { U1 });
    }
    if (!semHidratar) ok(await h.hidratado(), R + nome + ' a hidratação terminou (hydrated=1 e portão oculto)');
    await corpo(page, h);
  } finally { await ctx.close(); }
}
