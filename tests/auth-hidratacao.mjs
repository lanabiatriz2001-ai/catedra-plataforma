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
       mesma aba hidrata e sobe normalmente (com estudo pendente, pergunta antes; aqui a pessoa confirma);
   (o) erro na leitura da hidratação: a trava é solta — uma edição depois marca sujo e, com a
       rede de volta, sobe;
   (p) sessão pendente retomada + 'hidden' na tela de aceite + Aceitar com o envio lento: a
       pendência não é apagada por um envio em voo sem o aceite; o aceite novo sobe depois do
       reload (o setDirty(true) avança a geração); (p2) o mesmo com o autosave gravando nos
       700 ms antes do reload do viaPendente: a edição sobe junto.

   O ACEITE QUE SINCRONIZA (25/09/2026). O showAceite gravava o aceite novo SEM carimbo (_kts); na
   mescla da hidratação o empate dava a vitória à nuvem, o aceite antigo de lá desfazia o vigente
   recém-dado, e o portão pedia de novo a cada abertura com sessionStorage novo (todo lançamento no
   Mac/iPad). E depois de um erro de rede na leitura da hidratação o app abria destravado sem pedir
   o aceite: a pessoa editava, a rede voltava e o pushNow subia tudo sem o aceite vigente.
   (q) aceitar no portão: o aceite vigente fica no aparelho, sobe e vence o antigo da nuvem; a
       segunda abertura (sessionStorage novo) NÃO pede de novo;
   (r) aparelho que aceitou o vigente antes do conserto (SEM carimbo) e nuvem com o antigo — sem
       carimbo e com carimbo MAIS NOVO: a versão decide, o aparelho não volta ao antigo, nada é
       pedido e o vigente sobe;
   (s) erro de rede na leitura da hidratação sem aceite vigente: o app abre e segue usável, as
       edições marcam sujo, mas NADA sobe ('hidden', pagehide, 'online' e 'visible' com a rede
       ainda fora); com a rede de volta, a tela de aceite aparece antes de qualquer upsert, e
       depois do aceite sobem as edições, o merge e o aceite vigente;
   (s2) a leitura dessa nova tentativa não responde: passado o prazo o app volta usável, a resposta
       atrasada é descartada e a próxima volta da rede mostra o aceite.

   O PORTÃO DE QUEM NÃO ACEITA E O ACEITE MAIS NOVO (25/11/2026). Toda versão nova dos documentos manda
   todas as contas ao portão. O "Não aceito" apagava sem perguntar o estudo que ainda não tinha subido;
   exportar e excluir a conta ficavam em Ajustes, atrás do aceite (os Termos, 12.2, prometem os dois a quem
   não concorda); o aceite só valia para a versão exata do build, e o app de build anterior voltava ao
   portão a cada abertura quando a nuvem tinha o aceite mais novo; e a aba da web já hidratada seguia
   sincronizando sem o aceite vigente.
   (n2) "Não aceito" com estudo pendente e a pergunta CANCELADA: o portão segue aberto, o s1 e a
        pendência ficam e nada sobe; os alvos medem ≥ 44 px e o texto passa de 4,5:1 (claro);
   (t) aba já hidratada (sessionStorage) com o aceite da versão anterior e s1 sujo — o reload depois de
       publicar um documento novo: o portão aparece antes de qualquer envio; depois do aceite sobem s1 e
       o aceite vigente;
   (u) "Baixar meus dados" (web, escuro, com as mesmas medidas): o arquivo traz a nuvem e o aparelho
       mesclados; nada sobe, nada é gravado no aparelho e o portão segue aberto;
   (v) "Excluir minha conta" (web): baixa o arquivo e pergunta (o que apaga e o que não apaga);
       recusada, nada é excluído; confirmada, a RPC de exclusão é chamada, o aparelho é limpo e volta o
       login — sem nenhum envio; (v2) o mesmo no app nativo: o arquivo vai pela ponte catedraBackup e a
       pergunta só aparece depois de ele ser salvo;
   (w) a nuvem tem o aceite de uma versão MAIS NOVA que a deste build: nenhuma abertura pede o aceite
       e o aparelho fica com o mais novo.

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
    ok(r.ups.length >= 1 && /"1\.0\/1\.2"/.test(aceiteDe(ult)), R + '(m) e sobe o aceite novo (' + aceiteDe(ult).slice(0, 40) + ')');
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
    // com estudo pendente (o s1 sujo) o "Não aceito" pergunta antes de apagar o aparelho; aqui a pessoa confirma
    let perguntaN = '';
    page.once('dialog', async d => { perguntaN = d.message(); await d.accept(); });
    await page.click('#ctacsair');
    // o fin() apaga o local e recarrega: volta ao formulário, sem sessão
    const noForm = await h.esperar(() => !!document.querySelector('#catedra-auth-gate #cte') && !localStorage.getItem('catedra:sessions'), 8000);
    const r0 = await h.ler(), f0 = await h.fetchs();
    ok(/ainda não subiram/.test(perguntaN), R + '(n) "Não aceito" com estudo pendente pergunta antes de apagar o aparelho («' + perguntaN.slice(0, 60) + '…»)');
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
    ok(r.ups.length >= 1 && /"1\.0\/1\.2"/.test(aceiteDe(ult)) && /"s9"/.test(ult.sessions || '') && !/"s1"/.test(ult.sessions || ''), R + '(n) o login seguinte sobe o aceite novo com a conta da nuvem (s9; o s1 recusado foi apagado) (' + r.ups.length + ')');
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
      const comNovo = r.ups.filter(u => /"1\.0\/1\.2"/.test(aceiteDe(u)));
      ok(comNovo.length >= 1, R + P + ' o aceite novo SUBIU (' + r.ups.map(u => aceiteDe(u).slice(12, 19) || '—').join(' | ') + ')');
      ok(comNovo.some(u => /"s1"/.test(u.sessions) && /"s9"/.test(u.sessions) && (!nos700 || /"s3"/.test(u.sessions))),
        R + P + (nos700 ? ' a edição dos 700 ms do viaPendente sobe junto (s1, s3, s9)' : ' o envio com o aceite novo leva s1 e s9'));
      ok(r.ups.every(u => !/0\.9\/0\.9/.test(aceiteDe(u))), R + P + ' nenhum envio levou o aceite velho');
      ok(r.dirty == null && r.status === 'salvo', R + P + ' só depois do envio com o aceite novo: sem sujo e "salvo" (' + r.dirty + ', ' + r.status + ')');
    });
  }

  await casosAceite(caso, ok, R);
  await casosPortao(caso, ok, R);
}

/* Os casos do aceite que sincroniza — (q), (r), (s). Ver o cabeçalho. */
async function casosAceite(caso, ok, R) {
  const VELHO = JSON.stringify({ versao: '0.9/0.9', ts: 1 });
  const VIGENTE_OLD = JSON.stringify({ versao: '1.0/1.2', ts: 777 });   // aceito antes do conserto
  const aceiteDe = u => String(u.aceite || '');
  const versaoLocal = page => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('catedra:aceite')).versao; } catch (_) { return null; } });
  const esconder = page => page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  const mostrar = page => page.evaluate(() => { delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
  const cegos = f => f.lista.filter(x => x.keepalive && /user_data/.test(x.url)).length;
  const LINHA_S9 = { data: { data: { 'catedra:sessions': JSON.stringify([S9]) }, updated_at: UPD }, error: null };
  // o app aberto e usável depois de uma leitura da hidratação que falhou: selo em erro, portão oculto
  const abertoSemHidratar = h => h.esperar(() => !!window.CatedraSync && /erro|offline/.test(window.CatedraSync.status)
    && getComputedStyle(document.getElementById('catedra-auth-gate')).display === 'none', 8000);
  // "segunda abertura": sessionStorage novo e a nuvem com o que o último envio gravou
  const reabrir = async (page, h) => {
    await page.evaluate(() => {
      const ups = window.__ctChamadas().filter(c => c.nome === 'upsert');
      const u = ups[ups.length - 1];
      if (u) localStorage.setItem('__ct:select', JSON.stringify({ data: { data: u.arg.data, updated_at: u.arg.updated_at }, error: null }));
      sessionStorage.clear(); localStorage.setItem('__ct:chamadas', '[]');
    });
    await page.reload();
    // a tela de aceite NÃO pode aparecer; a hidratação termina sozinha
    const pediu = await h.esperar(() => !!document.querySelector('#ctac'), 2500);
    return { pediu, hidratou: await h.hidratado() };
  };

  // (q) aceitar no portão: o vigente fica, sobe e vence o antigo da nuvem; a segunda abertura não pede
  await caso({
    nome: '(q)',
    aceite: true, semHidratar: true,
    local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:aceite': VELHO },
    ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]), 'catedra:aceite': VELHO }) },
  }, async (page, h) => {
    ok(await h.esperar(() => !!document.querySelector('#ctac'), 8000), R + '(q) sem aceite vigente, a tela de aceite apareceu');
    await page.click('#ctac'); await page.click('#ctacok');
    ok(await h.hidratado(), R + '(q) depois do aceite a hidratação terminou');
    await page.waitForTimeout(1500);
    const r = await h.ler();
    const v = await versaoLocal(page);
    ok(v === '1.0/1.2', R + '(q) depois da mescla com a nuvem, o aceite do aparelho continua o vigente (' + v + ')');
    const kts = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('catedra:_kts'))['catedra:aceite']; } catch (_) { return null; } });
    ok(kts > 0, R + '(q) o aceite novo foi gravado com carimbo em catedra:_kts (' + kts + ')');
    const ult = r.ups[r.ups.length - 1] || {};
    ok(r.ups.length >= 1 && /"1\.0\/1\.2"/.test(aceiteDe(ult)) && /"s1"/.test(ult.sessions || '') && /"s9"/.test(ult.sessions || ''), R + '(q) o envio pós-reload sobe o aceite vigente junto de s1 e s9 (' + r.ups.map(u => aceiteDe(u).slice(12, 19) || '—').join(' | ') + ')');
    ok(r.ups.every(u => !/0\.9\/0\.9/.test(aceiteDe(u))), R + '(q) nenhum envio levou o aceite antigo');
    const seg = await reabrir(page, h);
    ok(!seg.pediu && seg.hidratou, R + '(q) segunda abertura (sessionStorage novo): NÃO pede o aceite de novo e hidrata (pediu=' + seg.pediu + ')');
    ok(await versaoLocal(page) === '1.0/1.2', R + '(q) segunda abertura: o aceite do aparelho segue o vigente');
  });

  // (r) aparelho que aceitou o vigente ANTES do conserto (sem carimbo), nuvem com o antigo
  for (const [rot, ktsNuvem] of [['sem carimbo', null], ['com carimbo mais novo', { 'catedra:aceite': 9000 }]]) {
    const nuvem = { 'catedra:sessions': JSON.stringify([S9]), 'catedra:aceite': VELHO };
    if (ktsNuvem) nuvem['catedra:_kts'] = JSON.stringify(ktsNuvem);
    await caso({
      nome: '(r)',
      aceite: true, semHidratar: true,
      local: { 'catedra:sessions': JSON.stringify([S9]), 'catedra:aceite': VIGENTE_OLD },
      ct: { select: linhaCom(nuvem) },
    }, async (page, h) => {
      const pediu = await h.esperar(() => !!document.querySelector('#ctac'), 2500);
      ok(!pediu && await h.hidratado(), R + '(r) ' + rot + ': aceite vigente no aparelho, nada é pedido e a hidratação termina');
      await page.waitForTimeout(1500);
      const v = await versaoLocal(page);
      ok(v === '1.0/1.2', R + '(r) ' + rot + ': o aparelho NÃO volta ao aceite antigo da nuvem (' + v + ')');
      const r = await h.ler();
      ok(r.ups.length >= 1 && r.ups.every(u => /"1\.0\/1\.2"/.test(aceiteDe(u))), R + '(r) ' + rot + ': o aceite vigente sobe e substitui o antigo na nuvem (' + r.ups.map(u => aceiteDe(u).slice(12, 19) || '—').join(' | ') + ')');
      const seg = await reabrir(page, h);
      ok(!seg.pediu && seg.hidratou && await versaoLocal(page) === '1.0/1.2', R + '(r) ' + rot + ': segunda abertura também não pede (pediu=' + seg.pediu + ')');
    });
  }

  // (s) erro de rede na leitura da hidratação, sem aceite vigente: nada sobe até o aceite
  await caso({
    nome: '(s)',
    aceite: true, semHidratar: true, espiarFetch: true,
    local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:aceite': VELHO },
    ct: { select: FALHA },
  }, async (page, h) => {
    const aberto = () => abertoSemHidratar(h);
    ok(await aberto(), R + '(s) leitura da hidratação falhou: o app abre (usável offline), selo em erro');
    // a pessoa estuda sem rede
    await page.evaluate(() => { const a = JSON.parse(localStorage.getItem('catedra:sessions') || '[]'); a.push({ id: 's2', up: 5000, t: 'sem rede' }); localStorage.setItem('catedra:sessions', JSON.stringify(a)); });
    await page.waitForTimeout(1300);
    const r1 = await h.ler();
    ok(r1.dirty === '1', R + '(s) a edição marca sujo (' + r1.dirty + ')');
    ok(r1.chamadas.filter(n => n === 'select').length === 1 && r1.ups.length === 0, R + '(s) sem aceite vigente, a edição não dispara envio (' + r1.chamadas.join(',') + ')');
    await esconder(page); await page.waitForTimeout(300);
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide'))); await page.waitForTimeout(300);
    // a rede "volta" mas a leitura ainda falha: refaz a hidratação, que falha e reabre o app
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    ok(await aberto(), R + '(s) nova tentativa que falha: o app volta a ficar usável');
    await mostrar(page);
    ok(await aberto(), R + '(s) "visible" com a rede fora: tenta e o app volta a ficar usável');
    await page.waitForTimeout(800);
    const r2 = await h.ler(), f2 = await h.fetchs();
    ok(r2.ups.length === 0 && cegos(f2) === 0, R + '(s) com a rede fora, nada subiu — nem upsert, nem POST keepalive (' + r2.ups.length + ', ' + cegos(f2) + ')');
    ok(r2.chamadas.filter(n => n === 'select').length >= 2, R + '(s) "online"/"visible" refazem a leitura da hidratação (' + r2.chamadas.filter(n => n === 'select').length + ' select[s])');
    ok(await page.evaluate(() => /"s2"/.test(localStorage.getItem('catedra:sessions') || '') && sessionStorage.getItem('catedra:hydrated') == null), R + '(s) a edição offline segue no aparelho e nada foi marcado como hidratado');
    // a rede volta de verdade
    await page.evaluate(l => { localStorage.setItem('__ct:select', JSON.stringify(l)); window.dispatchEvent(new Event('online')); }, LINHA_S9);
    const naTela = await h.esperar(() => !!document.querySelector('#ctac'), 8000);
    const r3 = await h.ler();
    ok(naTela && r3.ups.length === 0, R + '(s) rede de volta: a tela de aceite aparece ANTES de qualquer upsert (' + naTela + ', ' + r3.ups.length + ')');
    await page.click('#ctac'); await page.click('#ctacok');
    ok(await h.hidratado(), R + '(s) depois do aceite a hidratação terminou');
    await page.waitForTimeout(1500);
    const r = await h.ler();
    const ult = r.ups[r.ups.length - 1] || {};
    ok(r.ups.length >= 1 && /"1\.0\/1\.2"/.test(aceiteDe(ult)) && ['s1', 's2', 's9'].every(id => new RegExp('"' + id + '"').test(ult.sessions || '')), R + '(s) depois do aceite sobem a edição offline (s2), s1, s9 e o aceite vigente (' + r.ups.length + ')');
    ok(r.ups.every(u => !/0\.9\/0\.9/.test(aceiteDe(u))), R + '(s) nenhum envio levou o aceite antigo');
    ok(r.dirty == null && r.status === 'salvo', R + '(s) no fim, sem sujo e "salvo" (' + r.dirty + ', ' + r.status + ')');
  });

  // (s2) a leitura da nova tentativa não responde (portal cativo que segura a conexão): passado o
  // prazo, o app volta usável — o "Carregando…" não fica sobre o estudo — e a resposta atrasada é
  // descartada; a pendência se rearma e a próxima volta da rede mostra o aceite
  await caso({
    nome: '(s2)',
    aceite: true, semHidratar: true,
    local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:aceite': VELHO },
    ct: { select: FALHA },
  }, async (page, h) => {
    ok(await abertoSemHidratar(h), R + '(s2) leitura da hidratação falhou: o app abre');
    await page.evaluate(l => { localStorage.setItem('__ct:select', JSON.stringify(l)); localStorage.setItem('__ct:selectAtraso', '60000'); window.dispatchEvent(new Event('online')); }, LINHA_S9);
    const cobriu = await h.esperar(() => getComputedStyle(document.getElementById('catedra-auth-gate')).display !== 'none' && !document.querySelector('#ctac'), 3000);
    ok(cobriu, R + '(s2) a nova tentativa cobre o app com "Carregando seus dados…" enquanto lê');
    await page.clock.runFor(16000);
    ok(await abertoSemHidratar(h), R + '(s2) a leitura não respondeu no prazo: o app volta a ficar usável');
    await page.clock.runFor(50000);   // a resposta atrasada chega agora
    await page.waitForTimeout(600);
    const r1 = await h.ler();
    const tarde = await page.evaluate(() => ({ tela: !!document.querySelector('#ctac'), hyd: sessionStorage.getItem('catedra:hydrated'),
      gate: getComputedStyle(document.getElementById('catedra-auth-gate')).display }));
    ok(!tarde.tela && tarde.hyd == null && tarde.gate === 'none' && r1.ups.length === 0, R + '(s2) a resposta atrasada é descartada: nem tela de aceite, nem hidratação, nem envio (' + JSON.stringify(tarde) + ', ' + r1.ups.length + ')');
    await page.evaluate(() => { localStorage.removeItem('__ct:selectAtraso'); window.dispatchEvent(new Event('online')); });
    const naTela = await h.esperar(() => !!document.querySelector('#ctac'), 8000);
    ok(naTela && (await h.ler()).ups.length === 0, R + '(s2) a pendência se rearmou: com a rede boa, a tela de aceite aparece antes de qualquer envio');
  });
}

/* O portão de quem não aceita e o aceite mais novo — (n2), (t), (u), (v), (v2), (w). Ver o cabeçalho. Nenhum caso fixa a
   versão vigente (lê window.CT_JURIDICO.versao quando precisa): valem com a 1.0/1.2 e com a 1.0/1.3. */
async function casosPortao(caso, ok, R) {
  const VELHO = JSON.stringify({ versao: '0.9/0.9', ts: 1 });
  const ANTERIOR = JSON.stringify({ versao: '1.0/1.1', ts: 1 });       // a versão de antes da vigente
  const MAIS_NOVO = JSON.stringify({ versao: '1.0/9.9', ts: 5000 });   // aceita num build mais novo que este
  const ARQ = /^catedra-dados-\d{4}-\d{2}-\d{2}\.json$/;
  const aceiteDe = u => String(u.aceite || '');
  const versaoLocal = page => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('catedra:aceite')).versao; } catch (_) { return null; } });
  const esconder = page => page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  const mostrar = page => page.evaluate(() => { delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
  const cegos = f => f.lista.filter(x => x.keepalive && /user_data/.test(x.url)).length;
  const naTela = h => h.esperar(() => !!document.querySelector('#ctac'), 8000);
  const estado = page => page.evaluate(() => ({
    tela: !!document.querySelector('#ctac'),
    s1: /"s1"/.test(localStorage.getItem('catedra:sessions') || ''),
    s9: /"s9"/.test(localStorage.getItem('catedra:sessions') || ''),
    msg: (document.querySelector('#ctacmsg') || {}).textContent || '',
  }));
  const rpcs = (page, n) => page.evaluate(n => window.__ctChamadas().filter(c => c.nome === 'rpc' && c.arg && c.arg.n === n).length, n);
  const lerDownload = async d => { const s = await d.createReadStream(); const partes = []; for await (const c of s) partes.push(c); return Buffer.concat(partes).toString('utf8'); };
  // "segunda abertura": sessionStorage novo e a nuvem com o que o último envio gravou
  const reabrir = async (page, h) => {
    await page.evaluate(() => {
      const ups = window.__ctChamadas().filter(c => c.nome === 'upsert');
      const u = ups[ups.length - 1];
      if (u) localStorage.setItem('__ct:select', JSON.stringify({ data: { data: u.arg.data, updated_at: u.arg.updated_at }, error: null }));
      sessionStorage.clear(); localStorage.setItem('__ct:chamadas', '[]');
    });
    await page.reload();
    const pediu = await h.esperar(() => !!document.querySelector('#ctac'), 2500);
    return { pediu, hidratou: await h.hidratado() };
  };
  // Aparência que se MEDE: altura dos alvos (≥ 44 px no toque), o "Não aceito" é botão, contraste calculado do texto
  // sobre o fundo que de fato pinta atrás dele, e os ícones Lucide de 16 px escondidos do leitor de tela.
  const medir = page => page.evaluate(() => {
    const canal = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = c => { const p = c.match(/[\d.]+/g).map(Number); return 0.2126 * canal(p[0]) + 0.7152 * canal(p[1]) + 0.0722 * canal(p[2]); };
    const fundo = n => { for (let e = n; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor, p = b.match(/[\d.]+/g); if (p && (p.length < 4 || +p[3] > 0)) return b; } return 'rgb(255, 255, 255)'; };
    const contraste = n => { const a = lum(getComputedStyle(n).color), b = lum(fundo(n)); return Math.round((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) * 100) / 100; };
    // minAlt: o min-height que de fato vale (o estilo inline pode ser cortado calado, e aí a altura de hoje é só acaso)
    const alvo = sel => { const n = document.querySelector(sel); if (!n) return { tag: 'ausente', h: 0, minAlt: 0, contraste: 0, sublinhado: false }; const r = n.getBoundingClientRect(), cs = getComputedStyle(n);
      return { tag: n.tagName, h: Math.round(r.height * 10) / 10, minAlt: parseFloat(cs.minHeight) || 0, contraste: contraste(n), sublinhado: /underline/.test(cs.textDecorationLine || cs.textDecoration || '') }; };
    const icone = (sel, nome) => { const s = document.querySelector(sel + ' svg[data-ico="' + nome + '"]'); if (!s) return false; const r = s.getBoundingClientRect(); return s.getAttribute('aria-hidden') === 'true' && Math.round(r.width) === 16 && Math.round(r.height) === 16; };
    const titulo = document.querySelector('#catedra-auth-gate h2'), intro = titulo && titulo.nextElementSibling;
    return { sair: alvo('#ctacsair'), baixar: alvo('#ctacbaixar'), excluir: alvo('#ctacexcluir'), frase: alvo('#ctacnc'),
      titulo: titulo ? contraste(titulo) : 0, intro: intro ? contraste(intro) : 0,
      fraseTexto: (document.querySelector('#ctacnc') || {}).textContent || '', icones: icone('#ctacbaixar', 'download') && icone('#ctacexcluir', 'trash-2') };
  });
  const conferirMedidas = (m, P) => {
    ok(m.sair.tag === 'BUTTON' && [m.sair, m.baixar, m.excluir].every(a => a.h >= 44 && a.minAlt >= 44),
      R + P + ' alvos ≥ 44 px, com o min-height valendo: "Não aceito" é botão (' + m.sair.tag + ', ' + m.sair.h + '/' + m.sair.minAlt + ' px), "Baixar" ' + m.baixar.h + '/' + m.baixar.minAlt + ' px, "Excluir" ' + m.excluir.h + '/' + m.excluir.minAlt + ' px');
    ok([m.sair.contraste, m.frase.contraste, m.baixar.contraste, m.excluir.contraste, m.titulo, m.intro].every(c => c >= 4.5),
      R + P + ' texto ≥ 4,5:1 sobre o fundo de verdade (título ' + m.titulo + ', texto ' + m.intro + ', frase ' + m.frase.contraste + ', "Não aceito" ' + m.sair.contraste + ', botões ' + m.baixar.contraste + ' e ' + m.excluir.contraste + ')');
    ok(m.sair.sublinhado, R + P + ' o estilo do "Não aceito" chega inteiro (sublinhado, que fica no fim do atributo)');
    ok(/Não concorda\? Você pode baixar os seus dados e excluir a conta sem aceitar\./.test(m.fraseTexto) && m.icones, R + P + ' a frase de quem não concorda está lá, e os botões têm ícone Lucide de 16 px escondido do leitor de tela');
  };

  // (n2) "Não aceito" com estudo pendente e a pergunta CANCELADA: nada é apagado, nada sobe, o portão segue aberto
  await caso({
    nome: '(n2)',
    aceite: true, semHidratar: true,
    local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:_dirty': '1', 'catedra:aceite': VELHO },
    ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }) },
  }, async (page, h) => {
    ok(await naTela(h), R + '(n2) a tela de aceite apareceu');
    conferirMedidas(await medir(page), '(n2) claro:');
    let pergunta = '';
    page.once('dialog', async d => { pergunta = d.message(); await d.dismiss(); });
    await page.click('#ctacsair');
    await page.waitForTimeout(800);
    const r = await h.ler(), e = await estado(page);
    ok(/ainda não subiram/.test(pergunta) && /Baixar meus dados/.test(pergunta), R + '(n2) com estudo pendente, "Não aceito" pergunta antes e aponta "Baixar meus dados" («' + pergunta.slice(0, 70).replace(/\n/g, ' ') + '…»)');
    ok(e.tela && e.s1 && r.dirty === '1', R + '(n2) Cancelar: a tela de aceite continua, o s1 segue no aparelho e a pendência fica (tela=' + e.tela + ', s1=' + e.s1 + ', _dirty=' + r.dirty + ')');
    ok(r.ups.length === 0 && !r.chamadas.includes('signOut'), R + '(n2) Cancelar: nada subiu e a sessão não foi encerrada (' + r.ups.length + ' upsert[s]; ' + r.chamadas.join(',') + ')');
  });

  // (t) aba da web já hidratada (sessionStorage) com o aceite da versão ANTERIOR e estudo pendente: é o reload depois de
  // publicar um documento novo. Refaz a hidratação e mostra o portão antes de qualquer envio; depois do aceite, sobe.
  await caso({
    nome: '(t)',
    hidratado: true, aceite: true, semHidratar: true, espiarFetch: true,
    local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:_dirty': '1', 'catedra:aceite': ANTERIOR },
    ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }) },
  }, async (page, h) => {
    ok(await naTela(h), R + '(t) aba já hidratada com o aceite da versão anterior: a tela de aceite aparece');
    await esconder(page); await page.waitForTimeout(300); await mostrar(page);
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide'))); await page.waitForTimeout(300);
    const r0 = await h.ler(), f0 = await h.fetchs();
    const marca = await page.evaluate(() => sessionStorage.getItem('catedra:hydrated'));
    ok(r0.ups.length === 0 && cegos(f0) === 0, R + '(t) antes do aceite nada sobe — nem upsert, nem POST keepalive, com "hidden" e pagehide (' + r0.ups.length + ', ' + cegos(f0) + ')');
    ok(marca == null && r0.chamadas.includes('select'), R + '(t) a aba refez a hidratação: leu a nuvem e tirou a marca de hidratada (' + marca + ')');
    const vigente = await page.evaluate(() => window.CT_JURIDICO.versao);
    await page.click('#ctac'); await page.click('#ctacok');
    ok(await h.hidratado(), R + '(t) depois do aceite a hidratação terminou');
    await page.waitForTimeout(1500);
    const r = await h.ler();
    const ult = r.ups[r.ups.length - 1] || {};
    ok(r.ups.length >= 1 && /"s1"/.test(ult.sessions || '') && /"s9"/.test(ult.sessions || '') && aceiteDe(ult).indexOf('"versao":"' + vigente + '"') >= 0,
      R + '(t) depois do aceite sobem s1 (com s9) e o aceite vigente ' + vigente + ' (' + r.ups.length + ' upsert[s]; ' + aceiteDe(ult).slice(0, 40) + ')');
    ok(r.ups.every(u => !/"1\.0\/1\.1"/.test(aceiteDe(u))) && r.dirty == null && r.status === 'salvo', R + '(t) nenhum envio levou o aceite anterior; no fim, sem sujo e "salvo" (' + r.dirty + ', ' + r.status + ')');
  });

  // (u) "Baixar meus dados" na web, no escuro: o arquivo traz a nuvem e o aparelho mesclados; nada sobe, nada é gravado
  // no aparelho e o portão segue aberto
  await caso({
    nome: '(u)',
    aceite: true, semHidratar: true,
    local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:_dirty': '1', 'catedra:aceite': VELHO, 'catedra:dark': '1' },
    ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }) },
  }, async (page, h) => {
    ok(await naTela(h), R + '(u) a tela de aceite apareceu (escuro)');
    conferirMedidas(await medir(page), '(u) escuro:');
    const [baixa] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.click('#ctacbaixar')]);
    const nome = baixa.suggestedFilename();
    let arq = null; try { arq = JSON.parse(await lerDownload(baixa)); } catch (_) {}
    const dados = (arq && arq.dados) || {};
    ok(ARQ.test(nome), R + '(u) o arquivo baixado tem nome com a data (' + nome + ')');
    ok(!!arq && arq.formato === 'catedra-dados-da-conta' && /"s1"/.test(dados['catedra:sessions'] || '') && /"s9"/.test(dados['catedra:sessions'] || ''),
      R + '(u) o arquivo traz o aparelho (s1) e a nuvem (s9) mesclados (' + Object.keys(dados).length + ' chave[s])');
    ok(!['catedra:_dirty', 'catedra:_lastSrv', 'catedra:_owner', 'catedra:auth'].some(k => k in dados), R + '(u) o arquivo não leva o meta-estado do aparelho (_dirty, _lastSrv, _owner, auth)');
    await page.waitForTimeout(800);
    const r = await h.ler(), e = await estado(page);
    ok(r.ups.length === 0 && !r.chamadas.includes('signOut') && await rpcs(page, 'excluir_minha_conta') === 0, R + '(u) baixar não sobe nada, não exclui e não sai (' + r.chamadas.join(',') + ')');
    ok(e.tela && e.s1 && !e.s9 && r.dirty === '1', R + '(u) baixar não grava no aparelho: a tela segue, o s1 fica, a mescla não foi gravada aqui e a pendência fica (' + JSON.stringify({ tela: e.tela, s1: e.s1, s9: e.s9, dirty: r.dirty }) + ')');
    ok(/baixado/.test(e.msg) && /Nada foi enviado à sua conta/.test(e.msg), R + '(u) a tela diz que o arquivo foi baixado e que nada subiu («' + e.msg + '»)');
  });

  // (v) "Excluir minha conta" na web e (v2) no app nativo: primeiro o arquivo, depois a pergunta; recusada, nada é
  // excluído; confirmada, a RPC exclui, o aparelho é limpo e o app volta ao login — e nada sobe em momento algum
  for (const nativo of [false, true]) {
    const V = nativo ? '(v2)' : '(v)';
    await caso({
      nome: V,
      aceite: true, semHidratar: true, nativo,
      local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:_dirty': '1', 'catedra:aceite': VELHO },
      ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }) },
    }, async (page, h) => {
      ok(await naTela(h), R + V + ' a tela de aceite apareceu');
      // 1) a pergunta recusada
      let pergunta = '';
      page.once('dialog', async d => { pergunta = d.message(); await d.dismiss(); });
      // a espera do download nunca fica solta: sem download (regressão), vira null e o caso reprova, sem derrubar a suíte
      const baixa = nativo ? null : page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      await page.click('#ctacexcluir');
      const b1 = baixa ? await baixa : null, nomeWeb = b1 ? b1.suggestedFilename() : '';
      const recusou = await h.esperar(() => /Nada foi excluído/.test((document.querySelector('#ctacmsg') || {}).textContent || ''), 6000);
      const e1 = await estado(page), r1 = await h.ler();
      ok(/lista de espera do beta/.test(pergunta) && /aviso de venda/.test(pergunta) && /Não dá para desfazer/.test(pergunta) && /acabou de ser (baixado|salvo em )/.test(pergunta),
        R + V + ' a pergunta diz o que apaga, o que NÃO apaga (lista de espera, aviso de venda) e que o arquivo acabou de ser salvo');
      ok(recusou && e1.tela && e1.s1 && await rpcs(page, 'excluir_minha_conta') === 0 && r1.ups.length === 0, R + V + ' recusada: nenhuma exclusão, nenhum envio, o portão e o s1 ficam («' + e1.msg + '»)');
      if (nativo) {
        const p = await page.evaluate(() => ({ ponte: JSON.parse(localStorage.getItem('__rep:ponte') || '[]'), confirm: JSON.parse(localStorage.getItem('__rep:confirm') || '[]') }));
        const m = p.ponte[0] || {};
        ok(p.ponte.length === 1 && m.acao === 'salvar' && ARQ.test(m.nome || '') && m.s1 && m.s9, R + V + ' no app nativo o arquivo vai pela ponte catedraBackup (salvar ' + m.nome + ', com s1 e s9)');
        ok(p.confirm.length === 1 && p.confirm[0].ponteRespondeu === '1' && /salvo em iCloud Drive › Cátedra/.test(p.confirm[0].t), R + V + ' a pergunta só aparece depois de a ponte dizer que salvou (' + JSON.stringify(p.confirm.map(c => c.ponteRespondeu)) + ')');
      } else {
        ok(ARQ.test(nomeWeb), R + V + ' na web o arquivo é baixado antes da pergunta (' + nomeWeb + ')');
      }
      // 2) a pergunta confirmada
      page.once('dialog', d => d.accept());
      const baixa2 = nativo ? null : page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      await page.click('#ctacexcluir');
      if (baixa2) await baixa2;
      const saiu = await h.esperar(() => !!document.querySelector('#catedra-auth-gate #cte') && !localStorage.getItem('catedra:sessions'), 10000);
      const r2 = await h.ler(), nExcluir = await rpcs(page, 'excluir_minha_conta');
      ok(saiu && nExcluir === 1 && r2.chamadas.includes('signOut'), R + V + ' confirmada: a RPC excluir_minha_conta é chamada uma vez, a sessão sai e o aparelho fica sem o dado (' + nExcluir + '; ' + r2.chamadas.join(',') + ')');
      ok(r2.ups.length === 0, R + V + ' em nenhum momento algo subiu (' + r2.ups.length + ' upsert[s])');
    });
  }

  // (w) a nuvem tem o aceite de uma versão MAIS NOVA que a deste build (aceito no site ou num aparelho já atualizado), e
  // este é o app de build anterior: nenhuma abertura pede o aceite e o aparelho fica com o mais novo
  await caso({
    nome: '(w)',
    aceite: true, semHidratar: true,
    local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:aceite': VELHO },
    ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]), 'catedra:aceite': MAIS_NOVO }) },
  }, async (page, h) => {
    const pediu = await h.esperar(() => !!document.querySelector('#ctac'), 2500);
    ok(!pediu && await h.hidratado(), R + '(w) aceite mais novo na nuvem: a primeira abertura não pede nada e a hidratação termina (pediu=' + pediu + ')');
    await page.waitForTimeout(1500);
    const v1 = await versaoLocal(page), r1 = await h.ler();
    ok(v1 === '1.0/9.9' && r1.ups.length >= 1 && r1.ups.every(u => /"1\.0\/9\.9"/.test(aceiteDe(u))), R + '(w) a mescla deixa o aparelho com o aceite mais novo, e é ele que sobe (' + v1 + '; ' + r1.ups.map(u => aceiteDe(u).slice(12, 19) || '—').join(' | ') + ')');
    for (const n of [2, 3]) {
      const seg = await reabrir(page, h);
      const v = await versaoLocal(page);
      ok(!seg.pediu && seg.hidratou && v === '1.0/9.9', R + '(w) abertura ' + n + ' (sessionStorage novo): não pede de novo e o aceite segue o mais novo (pediu=' + seg.pediu + ', ' + v + ')');
    }
  });
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
   `semHidratar`: o próprio corpo conduz (e confere) a hidratação — tela de aceite, erro.
   `espiarFetch`: o mesmo registro de fetch/pagehide, sem mudar o caminho de entrada.
   `nativo`: a página ganha a ponte do app nativo (window.webkit.messageHandlers.catedraBackup), que registra o pedido
   em __rep:ponte e responde "salvo" depois de 600 ms, como o seletor de Arquivos do iPad; e o confirm é embrulhado para
   registrar (__rep:confirm) se a pergunta veio depois dessa resposta. */
async function casoBase(browser, base, ok, R, { nome, local, ct, hidratado, formulario, pendente, aceite, semHidratar, espiarFetch, nativo }, corpo) {
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
    if (nativo) {
      await ctx.addInitScript(() => {
        window.webkit = { messageHandlers: { catedraBackup: { postMessage: function (m) {
          let s = '';
          try { s = String((JSON.parse(m.json).dados || {})['catedra:sessions'] || ''); } catch (_) {}
          const l = JSON.parse(localStorage.getItem('__rep:ponte') || '[]');
          l.push({ acao: m.acao, nome: m.nome, s1: /"s1"/.test(s), s9: /"s9"/.test(s) });
          localStorage.setItem('__rep:ponte', JSON.stringify(l));
          return new Promise(res => setTimeout(() => { localStorage.setItem('__rep:ponteRespondeu', String(l.length)); res({ ok: true, onde: 'iCloud Drive › Cátedra' }); }, 600));
        } } } };
        const conf = window.confirm.bind(window);
        window.confirm = function (t) {
          const l = JSON.parse(localStorage.getItem('__rep:confirm') || '[]');
          l.push({ ponteRespondeu: localStorage.getItem('__rep:ponteRespondeu'), t: String(t) });
          localStorage.setItem('__rep:confirm', JSON.stringify(l));
          return conf(t);
        };
      });
    }
    if (formulario || pendente || espiarFetch) {
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
