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
   sincronizando sem o aceite vigente. Com a revisão adversarial do PR (mesmo dia): dois toques para excluir
   na web, a conta informada ao app nativo antes da limpeza, a nuvem relida antes de excluir, as auxiliares
   de estudo no arquivo e na pergunta, as travas depois de decidir, a marca de aceite da aba e o prazo da
   leitura refeita, o painel que rola e os alvos de 44 px de toda a tela.
   (n) confirmado o "Não aceito", tudo trava até o reload e um 2º toque não pergunta de novo;
   (n2) "Não aceito" com estudo pendente e a pergunta CANCELADA: o portão segue aberto, o s1 e a
        pendência ficam e nada sobe; os alvos medem ≥ 44 px (com o min-height valendo), o texto passa de
        4,5:1 (claro) e, a 375×560, o título e o "Não aceito" chegam à tela por rolagem;
   (n3) sem pendência e sem nada em andamento, o "Não aceito" sai sem perguntar;
   (n4) prova do ENAM em andamento, sem pendência: o "Não aceito" pergunta; Cancelar mantém a prova; e o
        arquivo leva as auxiliares deste aparelho;
   (p)/(p2) depois de Aceitar, os outros botões travam: o "Não aceito" nos 700 ms não disputa o reload;
   (t) aba já hidratada (sessionStorage) com o aceite da versão anterior e s1 sujo — o reload depois de
       publicar um documento novo: o portão aparece antes de qualquer envio; depois do aceite sobem s1 e
       o aceite vigente;
   (t2) a mesma aba com a leitura refeita sem resposta: passado o prazo o app abre, sem subir nada, e com
        a rede de volta o aceite aparece antes de qualquer envio;
   (t3) a cópia local do aceite não grava (cota cheia) e o vigente está na nuvem: uma recarga só, sem laço;
   (u) "Baixar meus dados" (web, escuro, com as mesmas medidas): o arquivo traz a nuvem e o aparelho
       mesclados; nada sobe, nada é gravado no aparelho e o portão segue aberto; a tela diz "entregue ao
       navegador", não "baixado"; depois, um toque só em "Excluir" já pergunta, sem baixar de novo;
   (v) "Excluir minha conta" (web): o 1º toque só entrega o arquivo; a pergunta (a conta, o que apaga, o que
       fica pela Política 9.4 e 9.5) vem no 2º; recusada, nada é excluído; confirmada, a nuvem é relida, a
       RPC de exclusão é chamada, o aparelho é limpo e volta o login — sem nenhum envio; (v2) no app
       nativo: um toque, o arquivo vai pela ponte catedraBackup e a pergunta só aparece depois de ele ser
       salvo; a tela e a pergunta avisam que o LEGIS/JURIS nativos não entram no arquivo; e a conta é
       informada à ponte catedraPerfil antes do {excluir}, que limpa os leitores sem "limpeza pendente";
   (v3) a RPC de exclusão falha: nada é apagado nem enviado, e os botões e o foco voltam;
   (v4) outro aparelho envia estudos depois que o portão abriu: a 1ª confirmação não exclui; a 2ª gera o
        arquivo com o que chegou e exclui — também com o carimbo atrasado (relógio de quem enviou atrás do
        de quem gravou a linha vista); (v4w) o mesmo na web: com a nuvem nova, o toque seguinte entrega
        outro arquivo, com o que chegou, sem perguntar; só o próximo pergunta e exclui;
   (w) a nuvem tem o aceite de uma versão MAIS NOVA que a deste build: nenhuma abertura pede o aceite
       e o aparelho fica com o mais novo.
   Com a verificação das correções (26/11/2026): (n5) o simulado pausado que o app consome ao retomar
   ainda faz o "Não aceito" perguntar e vai no arquivo; (t2) depois do prazo, a aba segue hidratada, a
   recarga tem o mesmo prazo e a trava segue; (t4) o aceite vigente gravado por outra aba solta a trava na
   nova tentativa; (u2)/(u3) com a ponte do arquivo muda, "Aceitar" e "Não aceito" ainda tiram a pessoa do
   portão; (v5) sem credencial conferida, o aviso não promete limpeza pendente; o duplo clique na web não
   vira o 2º toque (feito no celular, onde o botão fica sob o dedo, e conferido que os dois cliques caíram nele);
   o e-mail longo quebra; o painel rola também deitado; o estilo do "Aceitar" chega inteiro (com a sombra que vem
   depois da família da fonte; na main, desde o #270, sem aspas que cortem o atributo); e nada depende de janela de
   tempo.

   Todo caso confere que a hidratação TERMINOU (hydrated=1 e portão oculto) antes das guardas:
   sem isso, "nenhum upsert" passaria num fluxo que travou antes de chegar lá. */

const FIX = '/tests/auth-ipad-fixture.html';
// id em formato UUID, como o do Supabase: o app nativo (PerfilLeitor) recusa conta fora dele
const U1 = { id: '3f2a9c1e-7b4d-4e8a-9c21-5d6e7f809a1b', email: 'lana@exemplo.com' };
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
    ct: { signIn: U1, select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }), signOutPendente: true },
  }, async (page, h) => {
    ok(await h.esperar(() => !!document.querySelector('#ctac'), 8000), R + '(n) a tela de aceite apareceu');
    await esconder(page); await page.waitForTimeout(300); await mostrar(page);
    // com estudo pendente (o s1 sujo) o "Não aceito" pergunta antes de apagar o aparelho; aqui a pessoa confirma
    let perguntaN = '', dialogosN = 0;
    page.on('dialog', d => { dialogosN++; if (dialogosN > 1) d.dismiss().catch(() => {}); });
    page.once('dialog', async d => { perguntaN = d.message(); await d.accept(); });
    // a caixa marcada antes deixa o "Aceitar" com opacity 1 no atributo: depois de decidir, ele tem de apagar como os outros
    await page.click('#ctac');
    await page.click('#ctacsair');
    // decidido: até o reload (aqui o signOut só responde quando o teste solta) tudo trava, o "Aceitar" fica com cara de
    // desabilitado, e um 2º toque não pergunta de novo — o "Cancelar" dele não desfaria a saída já em curso
    const travadoN = await page.evaluate(() => {
      const t = ['#ctacsair', '#ctacexcluir', '#ctacbaixar', '#ctac', '#ctacok'].every(s => !!document.querySelector(s) && document.querySelector(s).disabled);
      // o BTN tem transição de opacidade (.12 s): leva-a ao fim antes de medir, para ler o valor em que ela para, e não
      // um quadro do meio dela (que depende de quanto a máquina demorou)
      const ac = document.querySelector('#ctacok');
      (ac.getAnimations ? ac.getAnimations() : []).forEach(a => { try { a.finish(); } catch (_) {} });
      const opAceitar = +getComputedStyle(ac).opacity;
      const m = (document.querySelector('#ctacmsg') || {}).textContent || '';
      const b = document.querySelector('#ctacsair'); if (b) b.click();
      return { t, opAceitar, m };
    }).catch(() => ({ t: false, opAceitar: 1, m: 'a página já tinha recarregado' }));
    ok(travadoN.t && /Saindo da conta/.test(travadoN.m) && dialogosN === 1, R + '(n) confirmado o "Não aceito", tudo trava até o reload («' + travadoN.m + '») e um 2º toque não pergunta de novo (' + dialogosN + ' pergunta[s])');
    ok(travadoN.opAceitar < 0.7, R + '(n) depois de decidir, o "Aceitar" desabilitado também apaga (opacidade ' + travadoN.opAceitar + ')');
    // solta o signOut: o fin() apaga o local e recarrega
    await h.esperar(() => typeof window.__ctResolverSignOut === 'function', 8000);
    await page.evaluate(() => { localStorage.removeItem('__ct:signOutPendente'); if (window.__ctResolverSignOut) window.__ctResolverSignOut(); });
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
      // Aceitar trava os outros: um "Não aceito" tocado nos 700 ms do viaPendente não pode disputar o reload
      let dialogos = 0; page.on('dialog', d => { dialogos++; d.dismiss().catch(() => {}); });
      const travou = await page.evaluate((nos700) => {
        document.querySelector('#ctacok').click();
        const t = ['#ctacsair', '#ctacexcluir', '#ctacbaixar', '#ctac'].every(s => document.querySelector(s).disabled);
        document.querySelector('#ctacsair').click();
        if (nos700) {
          const a = JSON.parse(localStorage.getItem('catedra:sessions') || '[]');
          a.push({ id: 's3', up: 6000, t: 'nos 700 ms' });
          localStorage.setItem('catedra:sessions', JSON.stringify(a));
        }
        return t;
      }, nos700);
      ok(travou, R + P + ' depois de Aceitar, "Não aceito", "Excluir", "Baixar" e a caixa ficam desabilitados até o reload');
      const logo = await page.evaluate(() => localStorage.getItem('catedra:_dirty'));
      ok(logo === '1', R + P + ' logo depois de Aceitar, a pendência está marcada (' + logo + ')');
      ok(await h.hidratado(), R + P + ' a hidratação terminou depois do aceite');
      ok(dialogos === 0, R + P + ' o "Não aceito" tocado nos 700 ms não disputou o reload (nenhuma pergunta)');
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

/* O portão de quem não aceita e o aceite mais novo — (n2), (n3), (n4), (n5), (t), (t2), (t3), (t4), (u), (u2), (u3), (v),
   (v2), (v3), (v4), (v4w), (v5), (w). Ver o cabeçalho. Nenhum caso fixa a versão vigente (lê window.CT_JURIDICO.versao
   quando precisa): valem com a 1.0/1.2 e com a 1.0/1.3. Nada de janela fixa de tempo: o que precisa esperar fica preso
   na fixture (selectAtraso com o relógio falso, signOutPendente, rpcPendente) até o caso soltar. */
async function casosPortao(caso, ok, R) {
  const VELHO = JSON.stringify({ versao: '0.9/0.9', ts: 1 });
  const ANTERIOR = JSON.stringify({ versao: '1.0/1.1', ts: 1 });       // a versão de antes da vigente
  const MAIS_NOVO = JSON.stringify({ versao: '1.0/9.9', ts: 5000 });   // aceita num build mais novo que este
  // na web o nome leva a hora (cada entrega tem nome próprio); no nativo, só a data
  const ARQ = /^catedra-dados-\d{4}-\d{2}-\d{2}(-\d{6})?\.json$/;
  // a credencial que o leitor confere (getClaims da fixture): com ela, o portão sabe informar a conta ao app nativo
  const CLAIMS = { sub: U1.id, iss: 'https://exemplo.invalido/auth/v1', aud: 'authenticated', role: 'authenticated', exp: 4102444800 };
  const aceiteDe = u => String(u.aceite || '');
  const versaoLocal = page => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('catedra:aceite')).versao; } catch (_) { return null; } });
  const esconder = page => page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  const mostrar = page => page.evaluate(() => { delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
  const cegos = f => f.lista.filter(x => x.keepalive && /user_data/.test(x.url)).length;
  const naTela = h => h.esperar(() => !!document.querySelector('#ctac'), 8000);
  const abertoSemHidratar = h => h.esperar(() => !!window.CatedraSync && /erro|offline/.test(window.CatedraSync.status)
    && getComputedStyle(document.getElementById('catedra-auth-gate')).display === 'none', 8000);
  const estado = page => page.evaluate(() => ({
    tela: !!document.querySelector('#ctac'),
    s1: /"s1"/.test(localStorage.getItem('catedra:sessions') || ''),
    s9: /"s9"/.test(localStorage.getItem('catedra:sessions') || ''),
    msg: (document.querySelector('#ctacmsg') || {}).textContent || '',
    frase: (document.querySelector('#ctacnc') || {}).textContent || '',
  }));
  const rpcs = (page, n) => page.evaluate(n => window.__ctChamadas().filter(c => c.nome === 'rpc' && c.arg && c.arg.n === n).length, n);
  const lerDownload = async d => { const s = await d.createReadStream(); const partes = []; for await (const c of s) partes.push(c); return Buffer.concat(partes).toString('utf8'); };
  const msgTem = (h, re) => h.esperar(new Function('return /' + re.source + '/.test((document.querySelector("#ctacmsg") || {}).textContent || "")'), 8000);
  // Respostas às perguntas, na ordem: cada pergunta (confirm/alert) toma a próxima resposta da fila; sem resposta na fila,
  // Cancelar. Todas ficam registradas, e os downloads contados.
  const perguntador = page => {
    const p = { fila: [], textos: [], downloads: [] };
    page.on('dialog', d => { p.textos.push(d.message()); const a = p.fila.shift(); (a === 'aceitar' ? d.accept() : d.dismiss()).catch(() => {}); });
    page.on('download', d => p.downloads.push(d));
    return p;
  };
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
    // minAlt: o min-height que de fato vale (o estilo inline pode ser cortado calado, e aí a altura de hoje é só acaso);
    // sombra: a declaração que vem depois da família da fonte no estilo do "Aceitar" (aspas na família cortavam o resto)
    const alvo = sel => { const n = document.querySelector(sel); if (!n) return { tag: 'ausente', h: 0, minAlt: 0, contraste: 0, sublinhado: false, sombra: false }; const r = n.getBoundingClientRect(), cs = getComputedStyle(n);
      return { tag: n.tagName, h: Math.round(r.height * 10) / 10, minAlt: parseFloat(cs.minHeight) || 0, contraste: contraste(n), sublinhado: /underline/.test(cs.textDecorationLine || cs.textDecoration || ''), sombra: !!cs.boxShadow && cs.boxShadow !== 'none' }; };
    const icone = (sel, nome) => { const s = document.querySelector(sel + ' svg[data-ico="' + nome + '"]'); if (!s) return false; const r = s.getBoundingClientRect(); return s.getAttribute('aria-hidden') === 'true' && Math.round(r.width) === 16 && Math.round(r.height) === 16; };
    const titulo = document.querySelector('#catedra-auth-gate h2'), intro = titulo && titulo.nextElementSibling;
    const rotulo = document.querySelector('#ctac') && document.querySelector('#ctac').closest('label');
    return { sair: alvo('#ctacsair'), baixar: alvo('#ctacbaixar'), excluir: alvo('#ctacexcluir'), frase: alvo('#ctacnc'), aceitar: alvo('#ctacok'),
      termos: alvo('#catedra-auth-gate button[data-doc="termos.html"]'), politica: alvo('#catedra-auth-gate button[data-doc="privacidade.html"]'),
      rotulo: rotulo ? { h: Math.round(rotulo.getBoundingClientRect().height * 10) / 10, minAlt: parseFloat(getComputedStyle(rotulo).minHeight) || 0 } : { h: 0, minAlt: 0 },
      titulo: titulo ? contraste(titulo) : 0, intro: intro ? contraste(intro) : 0,
      fraseTexto: (document.querySelector('#ctacnc') || {}).textContent || '', icones: icone('#ctacbaixar', 'download') && icone('#ctacexcluir', 'trash-2') };
  });
  const conferirMedidas = (m, P) => {
    ok(m.sair.tag === 'BUTTON' && [m.sair, m.baixar, m.excluir, m.termos, m.politica, m.rotulo, m.aceitar].every(a => a.h >= 44 && a.minAlt >= 44),
      R + P + ' alvos ≥ 44 px, com o min-height valendo: "Não aceito" é botão (' + m.sair.tag + ', ' + m.sair.h + '/' + m.sair.minAlt + ' px), "Baixar" ' + m.baixar.h + '/' + m.baixar.minAlt + ' px, "Excluir" ' + m.excluir.h + '/' + m.excluir.minAlt
      + ' px, "Termos" ' + m.termos.h + '/' + m.termos.minAlt + ' px, "Política" ' + m.politica.h + '/' + m.politica.minAlt + ' px, rótulo do aceite ' + m.rotulo.h + '/' + m.rotulo.minAlt
      + ' px, "Aceitar" ' + m.aceitar.h + '/' + m.aceitar.minAlt + ' px');
    ok([m.sair.contraste, m.frase.contraste, m.baixar.contraste, m.excluir.contraste, m.titulo, m.intro].every(c => c >= 4.5),
      R + P + ' texto ≥ 4,5:1 sobre o fundo de verdade (título ' + m.titulo + ', texto ' + m.intro + ', frase ' + m.frase.contraste + ', "Não aceito" ' + m.sair.contraste + ', botões ' + m.baixar.contraste + ' e ' + m.excluir.contraste + ')');
    ok(m.sair.sublinhado, R + P + ' o estilo do "Não aceito" chega inteiro (sublinhado, que fica no fim do atributo)');
    ok(m.aceitar.sombra, R + P + ' o estilo do "Aceitar" chega inteiro (a sombra, que vem depois da família da fonte no atributo)');
    ok(/Não concorda\? Você pode baixar os seus dados e excluir a conta sem aceitar\./.test(m.fraseTexto) && m.icones, R + P + ' a frase de quem não concorda está lá, e os botões têm ícone Lucide de 16 px escondido do leitor de tela');
  };

  // (n2) "Não aceito" com estudo pendente e a pergunta CANCELADA: nada é apagado, nada sobe, o portão segue aberto
  await caso({
    nome: '(n2)',
    aceite: true, semHidratar: true,
    local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:_dirty': '1', 'catedra:aceite': VELHO },
    // um e-mail longo, sem hífen: não pode passar da largura do painel no celular
    ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }), sessao: { id: U1.id, email: 'fernanda.albuquerque.cavalcanti.souza@universidade.edu.br' } },
  }, async (page, h) => {
    ok(await naTela(h), R + '(n2) a tela de aceite apareceu');
    conferirMedidas(await medir(page), '(n2) claro:');
    // celular pequeno e deitado: a tela passa da altura; o painel ROLA (auto/scroll e com sobra de verdade: o
    // scrollIntoView também rola um overflow:hidden, que o dedo não rola) e tudo chega à vista; e o e-mail longo quebra
    for (const [w, hh] of [[375, 560], [844, 390], [667, 375]]) {
      await page.setViewportSize({ width: w, height: hh });
      const alcance = await page.evaluate(() => {
        let sc = document.querySelector('#catedra-auth-gate h2').parentElement;
        while (sc && sc !== document.body && getComputedStyle(sc).overflowY === 'visible') sc = sc.parentElement;
        const rolavel = !!sc && sc !== document.body && /^(auto|scroll)$/.test(getComputedStyle(sc).overflowY) && sc.scrollHeight > sc.clientHeight + 1;
        // 1 px de folga: a rolagem é em pixel inteiro e a posição do alvo, fracionária (o "Não aceito" para em 560,19 de 560)
        const ver = s => { const n = document.querySelector(s); if (!n) return false; n.scrollIntoView({ block: 'nearest' }); const r = n.getBoundingClientRect(); return r.top >= -1 && r.bottom <= innerHeight + 1; };
        const p = document.querySelector('#ctacnc');
        return { rolavel, titulo: ver('#catedra-auth-gate h2'), sair: ver('#ctacsair'), frase: p.scrollWidth <= p.clientWidth + 1, lateral: !!sc && sc.scrollWidth <= sc.clientWidth + 1 };
      });
      ok(alcance.rolavel && alcance.titulo && alcance.sair, R + '(n2) ' + w + '×' + hh + ': o painel rola e o título e o "Não aceito" chegam à tela (' + JSON.stringify(alcance) + ')');
      ok(alcance.frase && alcance.lateral, R + '(n2) ' + w + '×' + hh + ': o e-mail longo quebra e o painel não rola para o lado');
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    let pergunta = '';
    page.once('dialog', async d => { pergunta = d.message(); await d.dismiss(); });
    await page.click('#ctacsair');
    await page.waitForTimeout(800);
    const r = await h.ler(), e = await estado(page);
    ok(/ainda não subiram/.test(pergunta) && /Baixar meus dados/.test(pergunta), R + '(n2) com estudo pendente, "Não aceito" pergunta antes e aponta "Baixar meus dados" («' + pergunta.slice(0, 70).replace(/\n/g, ' ') + '…»)');
    ok(e.tela && e.s1 && r.dirty === '1', R + '(n2) Cancelar: a tela de aceite continua, o s1 segue no aparelho e a pendência fica (tela=' + e.tela + ', s1=' + e.s1 + ', _dirty=' + r.dirty + ')');
    ok(r.ups.length === 0 && !r.chamadas.includes('signOut'), R + '(n2) Cancelar: nada subiu e a sessão não foi encerrada (' + r.ups.length + ' upsert[s]; ' + r.chamadas.join(',') + ')');
  });

  // (n3) "Não aceito" SEM estudo pendente e sem nada em andamento: sai sem perguntar
  await caso({
    nome: '(n3)',
    aceite: true, semHidratar: true,
    local: { 'catedra:sessions': JSON.stringify([S9]), 'catedra:aceite': VELHO },
    ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }) },
  }, async (page, h) => {
    ok(await naTela(h), R + '(n3) a tela de aceite apareceu');
    let perguntou = false;
    page.once('dialog', async d => { perguntou = true; await d.dismiss(); });
    await page.click('#ctacsair');
    const noForm = await h.esperar(() => !!document.querySelector('#catedra-auth-gate #cte'), 8000);
    ok(noForm && !perguntou, R + '(n3) sem pendência, "Não aceito" sai sem perguntar (perguntou=' + perguntou + ')');
  });

  // (n4) prova do ENAM em andamento (e o retrato da 2ª fase), sem estudo pendente: o "Não aceito" pergunta; Cancelar mantém
  // a prova; e o arquivo de "Baixar meus dados" leva essas auxiliares, que o "Não aceito" e a exclusão também apagariam.
  // As auxiliares levam o titular: sem ele, o onLogin as trataria como estudo antigo de outro dono.
  await caso({
    nome: '(n4)',
    aceite: true, semHidratar: true,
    local: { 'catedra:sessions': JSON.stringify([S9]), 'catedra:aceite': VELHO,
      ct_enam_prova: JSON.stringify({ titular: U1.id, respostas: { q1: 'B' } }), ct_bkpFase2: JSON.stringify({ titular: U1.id, texto: 'rascunho' }) },
    ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }) },
  }, async (page, h) => {
    ok(await naTela(h), R + '(n4) a tela de aceite apareceu');
    let pergunta = '';
    page.once('dialog', async d => { pergunta = d.message(); await d.dismiss(); });
    await page.click('#ctacsair');
    await page.waitForTimeout(600);
    const e = await page.evaluate(() => ({ tela: !!document.querySelector('#ctac'), prova: !!localStorage.getItem('ct_enam_prova') }));
    ok(/em andamento/.test(pergunta) && /Baixar meus dados/.test(pergunta), R + '(n4) com prova em andamento e sem pendência, "Não aceito" pergunta antes («' + pergunta.slice(0, 80).replace(/\n/g, ' ') + '…»)');
    ok(e.tela && e.prova, R + '(n4) Cancelar: o portão segue e a prova em andamento fica no aparelho (' + JSON.stringify(e) + ')');
    if (!e.tela) { ok(false, R + '(n4) sem o portão não há como baixar o arquivo'); return; }
    const espera = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
    await page.click('#ctacbaixar');
    const baixa = await espera;
    let arq = null; try { arq = baixa && JSON.parse(await lerDownload(baixa)); } catch (_) {}
    const aux = (arq && arq.auxiliares) || {};
    ok(!!baixa && /"q1"/.test(aux.ct_enam_prova || '') && /rascunho/.test(aux.ct_bkpFase2 || ''), R + '(n4) o arquivo leva as auxiliares deste aparelho (prova do ENAM e retrato da 2ª fase) (' + Object.keys(aux).join(', ') + ')');
  });

  // (n5) simulado pausado (ct_prova) que o app consome ao retomar, antes do portão: o _restoreProva o apaga do aparelho no
  // catedra:authuser e o guarda só na memória. O "Não aceito" ainda pergunta, e o arquivo o leva, pelo retrato da abertura.
  await caso({
    nome: '(n5)',
    aceite: true, semHidratar: true, consomeProva: true,
    local: { 'catedra:sessions': JSON.stringify([S9]), 'catedra:aceite': VELHO, ct_prova: JSON.stringify({ titular: U1.id, min: 60, sec: 1800, running: false }) },
    ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }) },
  }, async (page, h) => {
    ok(await naTela(h), R + '(n5) a tela de aceite apareceu');
    const consumida = await page.evaluate(() => localStorage.getItem('ct_prova') == null);
    let pergunta = '';
    page.once('dialog', async d => { pergunta = d.message(); await d.dismiss(); });
    await page.click('#ctacsair');
    const ficou = await page.evaluate(() => !!document.querySelector('#ctac')).catch(() => false);
    ok(consumida && /em andamento/.test(pergunta) && ficou, R + '(n5) o app já tinha tirado o ct_prova do aparelho, e o "Não aceito" ainda pergunta e fica (consumida=' + consumida + ', ficou=' + ficou + ')');
    if (!ficou) { ok(false, R + '(n5) sem o portão não há como baixar o arquivo'); return; }
    const espera = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
    await page.click('#ctacbaixar');
    const baixa = await espera;
    let arq = null; try { arq = baixa && JSON.parse(await lerDownload(baixa)); } catch (_) {}
    const aux = (arq && arq.auxiliares) || {};
    ok(!!baixa && /"sec":1800/.test(aux.ct_prova || ''), R + '(n5) o arquivo leva o simulado pausado que o app tinha tirado do aparelho (' + Object.keys(aux).join(', ') + ')');
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

  // (t2) a mesma aba, mas a leitura refeita não responde (portal cativo que segura a conexão): passado o prazo, o app abre
  // como antes, sem subir nada, e segue marcada como hidratada — a recarga seguinte relê com o mesmo prazo. Depois do prazo
  // a trava continua (nem 'hidden' nem pagehide sobem o sujo sem o aceite), e na volta a tela de aceite vem antes de tudo.
  await caso({
    nome: '(t2)',
    hidratado: true, aceite: true, semHidratar: true, espiarFetch: true,
    local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:_dirty': '1', 'catedra:aceite': ANTERIOR },
    ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }), selectAtraso: 60000 },
  }, async (page, h) => {
    const lendo = n => h.esperar(new Function('return window.__ctChamadas().filter(c => c.nome === "select").length >= ' + n
      + ' && !document.querySelector("#ctac") && getComputedStyle(document.getElementById("catedra-auth-gate")).display !== "none"'), 6000);
    ok(await lendo(1), R + '(t2) a aba hidratada refaz a leitura ("Carregando seus dados…" sobre o app)');
    await page.clock.runFor(16000);
    ok(await abertoSemHidratar(h) && (await h.ler()).ups.length === 0, R + '(t2) a leitura não respondeu no prazo: o app abre, sem subir nada');
    ok(await page.evaluate(() => sessionStorage.getItem('catedra:hydrated')) === '1', R + '(t2) passado o prazo, a aba segue marcada como hidratada');
    await page.reload();
    ok(await lendo(2), R + '(t2) a recarga refaz a leitura (Carregando seus dados…)');
    await page.clock.runFor(16000);
    ok(await abertoSemHidratar(h) && (await h.ler()).ups.length === 0, R + '(t2) a recarga também tem o prazo: o app abre, sem subir nada');
    // a trava segue depois do prazo: com a leitura que agora responderia na hora, nem o 'hidden' (pushNow) nem o pagehide
    // (envio com keepalive) sobem o sujo sem o aceite
    await page.evaluate(() => localStorage.removeItem('__ct:selectAtraso'));
    await esconder(page);
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    const r1 = await h.ler(), f1 = await h.fetchs();
    ok(r1.ups.length === 0 && cegos(f1) === 0 && r1.dirty === '1', R + '(t2) depois do prazo, sem o aceite, nada sobe com hidden e pagehide, e o sujo fica (' + r1.ups.length + ', ' + cegos(f1) + ', ' + r1.dirty + ')');
    await mostrar(page);   // 'visible' refaz a leitura
    ok(await naTela(h) && (await h.ler()).ups.length === 0, R + '(t2) na volta, a tela de aceite aparece antes de qualquer envio');
  });

  // (t3) aba hidratada sem aceite no aparelho, com o vigente na nuvem, e a cópia local do aceite que não grava (cota cheia):
  // a hidratação termina numa recarga só e para ali — antes, recarregava sem fim
  await caso({
    nome: '(t3)',
    hidratado: true, aceite: true, semHidratar: true, cota: 'catedra:aceite',
    local: { 'catedra:sessions': JSON.stringify([S1]) },
    ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]), 'catedra:aceite': MAIS_NOVO }) },
  }, async (page, h) => {
    const hidratou = await h.hidratado();
    await page.waitForTimeout(3000);
    const c = await page.evaluate(() => ({ cargas: +(localStorage.getItem('__rep:cargas') || 0), aceiteLocal: localStorage.getItem('catedra:aceite'),
      hyd: sessionStorage.getItem('catedra:hydrated') })).catch(() => ({ cargas: -1 }));
    ok(hidratou && c.cargas === 2 && c.hyd === '1', R + '(t3) a cópia local do aceite não grava: a aba hidrata com uma recarga só e não recarrega mais (' + c.cargas + ' carga[s], aceite local ' + c.aceiteLocal + ')');
  });

  // (t4) a mesma aba, presa no prazo, com a trava; outra aba grava no aparelho o aceite vigente: na nova tentativa
  // ('online'), o atalho da aba hidratada solta a trava e sobe o que estava pendente
  await caso({
    nome: '(t4)',
    hidratado: true, aceite: true, semHidratar: true,
    local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:_dirty': '1', 'catedra:aceite': ANTERIOR },
    ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }), selectAtraso: 60000 },
  }, async (page, h) => {
    ok(await h.esperar(() => window.__ctChamadas().some(c => c.nome === 'select') && getComputedStyle(document.getElementById('catedra-auth-gate')).display !== 'none', 6000),
      R + '(t4) a aba hidratada refaz a leitura');
    await page.clock.runFor(16000);
    ok(await abertoSemHidratar(h) && (await h.ler()).ups.length === 0, R + '(t4) passado o prazo, o app abre com a trava, sem subir nada');
    await page.evaluate(m => { localStorage.removeItem('__ct:selectAtraso'); localStorage.setItem('catedra:aceite', m); window.dispatchEvent(new Event('online')); }, MAIS_NOVO);
    const subiu = await h.esperar(() => window.__ctChamadas().some(c => c.nome === 'upsert'), 8000);
    const r = await h.ler(), ult = r.ups[r.ups.length - 1] || {};
    ok(subiu && /"s1"/.test(ult.sessions || '') && r.dirty == null && r.status === 'salvo',
      R + '(t4) com o aceite vigente gravado por outra aba, a nova tentativa solta a trava e sobe o pendente (' + r.ups.length + ' upsert[s], ' + r.dirty + ', ' + r.status + ')');
  });

  // (u) "Baixar meus dados" na web, no escuro: o arquivo traz a nuvem e o aparelho mesclados; nada sobe, nada é gravado
  // no aparelho e o portão segue aberto. Depois, um toque só em "Excluir" já pergunta, sem baixar de novo.
  await caso({
    nome: '(u)',
    aceite: true, semHidratar: true,
    local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:_dirty': '1', 'catedra:aceite': VELHO, 'catedra:dark': '1' },
    ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }) },
  }, async (page, h) => {
    ok(await naTela(h), R + '(u) a tela de aceite apareceu (escuro)');
    conferirMedidas(await medir(page), '(u) escuro:');
    // a espera do download nunca fica solta: sem download (regressão), vira null e o caso reprova, sem derrubar a suíte
    const esperaBaixa = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
    await page.click('#ctacbaixar');
    const baixa = await esperaBaixa;
    ok(!!baixa, R + '(u) "Baixar meus dados" dispara o download');
    const nome = baixa ? baixa.suggestedFilename() : '';
    let arq = null; try { arq = baixa && JSON.parse(await lerDownload(baixa)); } catch (_) {}
    const dados = (arq && arq.dados) || {};
    ok(ARQ.test(nome), R + '(u) o arquivo baixado tem nome com a data (' + nome + ')');
    ok(/-\d{6}\.json$/.test(nome), R + '(u) na web o nome leva a hora: a 2ª entrega do dia não herda o nome da 1ª (' + nome + ')');
    ok(!!arq && arq.formato === 'catedra-dados-da-conta' && /"s1"/.test(dados['catedra:sessions'] || '') && /"s9"/.test(dados['catedra:sessions'] || ''),
      R + '(u) o arquivo traz o aparelho (s1) e a nuvem (s9) mesclados (' + Object.keys(dados).length + ' chave[s])');
    ok(!['catedra:_dirty', 'catedra:_lastSrv', 'catedra:_owner', 'catedra:auth'].some(k => k in dados), R + '(u) o arquivo não leva o meta-estado do aparelho (_dirty, _lastSrv, _owner, auth)');
    await page.waitForTimeout(800);
    const r = await h.ler(), e = await estado(page);
    ok(r.ups.length === 0 && !r.chamadas.includes('signOut') && await rpcs(page, 'excluir_minha_conta') === 0, R + '(u) baixar não sobe nada, não exclui e não sai (' + r.chamadas.join(',') + ')');
    ok(e.tela && e.s1 && !e.s9 && r.dirty === '1', R + '(u) baixar não grava no aparelho: a tela segue, o s1 fica, a mescla não foi gravada aqui e a pendência fica (' + JSON.stringify({ tela: e.tela, s1: e.s1, s9: e.s9, dirty: r.dirty }) + ')');
    // na web não há como saber se o navegador salvou (o Safari pergunta antes): a tela não afirma "baixado"
    ok(/entregue ao navegador/.test(e.msg) && /permita o download/.test(e.msg) && /Nada foi enviado à sua conta/.test(e.msg) && !/baixado/.test(e.msg),
      R + '(u) a tela diz que o arquivo foi entregue ao navegador, pede para conferir e diz que nada subiu («' + e.msg + '»)');
    // depois de baixar, um toque em "Excluir" já pergunta, sem gerar outro arquivo
    const p = perguntador(page);
    await page.click('#ctacexcluir');
    await msgTem(h, /Nada foi excluído/);
    ok(p.textos.length === 1 && /entregue ao navegador nesta tela/.test(p.textos[0]) && p.downloads.length === 0,
      R + '(u) depois de "Baixar", um toque em "Excluir" já pergunta, sem baixar de novo (' + p.textos.length + ' pergunta[s], ' + p.downloads.length + ' download[s])');
  });

  // (u2) app nativo com a ponte do arquivo muda (o seletor de Arquivos do iPad que não abriu): o "Aceitar" ainda tira a
  // pessoa do portão; e (u3) o "Não aceito" também
  for (const sair of [false, true]) {
    const U = sair ? '(u3)' : '(u2)';
    await caso({
      nome: U,
      aceite: true, semHidratar: true, nativo: true,
      local: { 'catedra:sessions': JSON.stringify([S9]), 'catedra:aceite': VELHO },
      ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }), ponteMuda: true },
    }, async (page, h) => {
      ok(await naTela(h), R + U + ' a tela de aceite apareceu');
      await page.click('#ctacbaixar');
      ok(await msgTem(h, /Preparando o arquivo/), R + U + ' o pedido foi à ponte, que não responde');
      if (sair) {
        await page.click('#ctacsair');
        const noForm = await h.esperar(() => !!document.querySelector('#catedra-auth-gate #cte'), 8000);
        ok(noForm, R + U + ' com a ponte muda, "Não aceito — sair da conta" ainda sai');
      } else {
        await page.click('#ctac'); await page.click('#ctacok');
        ok(await h.hidratado(), R + U + ' com a ponte muda, "Aceitar e continuar" ainda conclui a hidratação');
      }
    });
  }

  // (v) "Excluir minha conta" na web e (v2) no app nativo. Web: o 1º toque só entrega o arquivo (o Safari pode estar
  // perguntando se baixa, e o reload da exclusão encerraria o blob); a pergunta vem no 2º, sem baixar de novo. Nativo: a
  // ponte só responde depois de salvo, e um toque basta. Recusada, nada é excluído; confirmada, a nuvem é relida, a RPC
  // exclui, o aparelho é limpo — no nativo, também o LEGIS/JURIS, sem "limpeza pendente" — e o app volta ao login. Nada sobe.
  for (const nativo of [false, true]) {
    const V = nativo ? '(v2)' : '(v)';
    await caso({
      nome: V,
      aceite: true, semHidratar: true, nativo,
      local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:_dirty': '1', 'catedra:aceite': VELHO },
      ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }), leitorClaims: CLAIMS },
    }, async (page, h) => {
      ok(await naTela(h), R + V + ' a tela de aceite apareceu');
      const p = perguntador(page);
      if (!nativo) {
        // duplo clique: o 2º clique (detail 2) chega depois de o 1º entregar o arquivo e não pode virar o "toque seguinte".
        // Feito no celular, onde o painel rola e o botão fica sob o dedo enquanto o aviso cresce embaixo dele. Na tela
        // larga o formulário centrado sobe metade do que o aviso cresce, o 2º clique cai fora do botão e o caso passaria
        // sem provar nada: por isso ele também confere que os dois cliques caíram no botão.
        await page.setViewportSize({ width: 375, height: 560 });
        await page.evaluate(() => {
          window.__ctCliquesExcluir = [];
          document.addEventListener('click', e => { if (e.isTrusted && e.target.closest && e.target.closest('#ctacexcluir')) window.__ctCliquesExcluir.push(e.detail); }, true);
        });
        await page.dblclick('#ctacexcluir');
        const entregou = await msgTem(h, /toque de novo/);
        const cliques = await page.evaluate(() => window.__ctCliquesExcluir.join(','));
        ok(cliques === '1,2' && entregou && p.textos.length === 0 && p.downloads.length === 1 && ARQ.test(p.downloads[0].suggestedFilename()),
          R + V + ' na web o 1º toque, mesmo num duplo clique, só entrega o arquivo e pede outro toque, sem perguntar (cliques no botão: ' + cliques + '; ' + p.downloads.length + ' download[s], ' + p.textos.length + ' pergunta[s])');
        await page.setViewportSize({ width: 1280, height: 900 });
      }
      // a pergunta recusada
      await page.click('#ctacexcluir');
      const recusou = await msgTem(h, /Nada foi excluído/);
      const pergunta = p.textos[0] || '';
      const e1 = await estado(page), r1 = await h.ler();
      ok(/lana@exemplo\.com/.test(pergunta) && /Conta: lana@exemplo\.com\./.test(e1.frase), R + V + ' a tela e a pergunta dizem qual conta será excluída');
      ok(/lista de espera do beta/.test(pergunta) && /9\.4 e 9\.5/.test(pergunta) && /iCloud Drive ou no Google Drive/.test(pergunta) && /Não dá para desfazer/.test(pergunta),
        R + V + ' a pergunta diz o que apaga e, como a Política (9.4 e 9.5), o que fica (cópias no iCloud/Google Drive, lista de espera)');
      ok(nativo ? /acabou de ser salvo em iCloud Drive › Cátedra/.test(pergunta) : /entregue ao navegador nesta tela/.test(pergunta) && !/acabou de ser/.test(pergunta),
        R + V + (nativo ? ' no nativo a pergunta diz onde o arquivo acabou de ser salvo' : ' na web a pergunta não afirma que o arquivo foi baixado: foi entregue ao navegador, e é para conferir'));
      const notaLeitores = /CátedraLEGIS e o CátedraJURIS guardam neste aparelho \(como anotações, grifos, revisões, favoritos, coleções e progresso de leitura\)/;
      ok(nativo ? notaLeitores.test(e1.frase) && notaLeitores.test(pergunta) && /se perde com a exclusão da conta/.test(pergunta) : !notaLeitores.test(e1.frase) && !notaLeitores.test(pergunta),
        R + V + (nativo ? ' no nativo, a tela e a pergunta dizem que o que o LEGIS/JURIS guardam neste aparelho não entra no arquivo e se perde com a conta' : ' na web não há aviso dos leitores nativos'));
      ok(recusou && e1.tela && e1.s1 && await rpcs(page, 'excluir_minha_conta') === 0 && r1.ups.length === 0 && p.downloads.length === (nativo ? 0 : 1),
        R + V + ' recusada: nenhuma exclusão, nenhum envio, nenhum download novo; o portão e o s1 ficam («' + e1.msg + '»)');
      if (nativo) {
        const nat = await page.evaluate(() => ({ ponte: JSON.parse(localStorage.getItem('__rep:ponte') || '[]'), confirm: JSON.parse(localStorage.getItem('__rep:confirm') || '[]') }));
        const m = nat.ponte[0] || {};
        ok(nat.ponte.length === 1 && m.acao === 'salvar' && ARQ.test(m.nome || '') && m.s1 && m.s9, R + V + ' no app nativo o arquivo vai pela ponte catedraBackup (salvar ' + m.nome + ', com s1 e s9)');
        ok(nat.confirm.length === 1 && nat.confirm[0].ponteRespondeu === '1', R + V + ' a pergunta só aparece depois de a ponte dizer que salvou (' + JSON.stringify(nat.confirm.map(c => c.ponteRespondeu)) + ')');
      }
      // a pergunta confirmada
      p.fila.push('aceitar');
      await page.click('#ctacexcluir');
      const saiu = await h.esperar(() => !!document.querySelector('#catedra-auth-gate #cte') && !localStorage.getItem('catedra:sessions'), 10000);
      const r2 = await h.ler(), nExcluir = await rpcs(page, 'excluir_minha_conta');
      ok(saiu && nExcluir === 1 && r2.chamadas.includes('signOut'), R + V + ' confirmada: a RPC excluir_minha_conta é chamada uma vez, a sessão sai e o aparelho fica sem o dado (' + nExcluir + '; ' + r2.chamadas.join(',') + ')');
      ok(r2.ups.length === 0 && p.downloads.length === (nativo ? 0 : 1), R + V + ' em nenhum momento algo subiu, nem saiu outro download (' + r2.ups.length + ' upsert[s], ' + p.downloads.length + ' download[s])');
      // "confirmada, a nuvem é relida": duas leituras ANTES da RPC — a da hidratação e a de antes de excluir
      const ordem = await page.evaluate(() => window.__ctChamadas().map(c => c.nome === 'rpc' ? 'rpc:' + (c.arg && c.arg.n) : c.nome));
      const iRpc = ordem.indexOf('rpc:excluir_minha_conta'), leituras = iRpc < 0 ? 0 : ordem.slice(0, iRpc).filter(n => n === 'select').length;
      ok(leituras >= 2, R + V + ' confirmada, a nuvem é relida antes da RPC (' + leituras + ' leitura[s] antes dela: a da hidratação e a de antes de excluir)');
      if (nativo) {
        const nat = await page.evaluate(() => ({ perfil: JSON.parse(localStorage.getItem('__rep:perfil') || '[]'), alertas: JSON.parse(localStorage.getItem('__rep:alert') || '[]') }));
        // como o host: expiraEm em texto (o handler só aceita [String: String]) e nenhum aviso
        const iConta = nat.perfil.findIndex(m => m.conta === U1.id && typeof m.expiraEm === 'string'), iExcluir = nat.perfil.findIndex(m => m.excluir === U1.id);
        ok(iConta >= 0 && iExcluir > iConta && nat.alertas.length === 0,
          R + V + ' no nativo a conta é informada à ponte antes do {excluir}, que é aceito: sem "limpeza pendente" (' + JSON.stringify(nat.perfil) + '; ' + JSON.stringify(nat.alertas) + ')');
      }
    });
  }

  // (v3) a RPC de exclusão falha ({error}, sem rejeitar): nada é apagado nem enviado, os botões voltam e o foco também
  await caso({
    nome: '(v3)',
    aceite: true, semHidratar: true,
    local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:_dirty': '1', 'catedra:aceite': VELHO },
    // a RPC fica PRESA até o caso soltar: nada de janela de tempo para o "Excluindo a conta…"
    ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }), rpc_excluir_minha_conta: { data: null, error: { message: 'TypeError: Failed to fetch' } }, rpcPendente: ['excluir_minha_conta'] },
  }, async (page, h) => {
    ok(await naTela(h), R + '(v3) a tela de aceite apareceu');
    const p = perguntador(page);
    await page.click('#ctacexcluir');
    await msgTem(h, /toque de novo/);
    p.fila.push('aceitar');
    await page.click('#ctacexcluir');
    // com a RPC em voo, o botão desabilitado perde o foco (é o que a regra de foco manda e o que alguns navegadores
    // fazem; o Chromium deste teste o mantém): sem devolvê-lo, quem usa teclado recomeça o Tab do topo
    ok(await msgTem(h, /Excluindo a conta/), R + '(v3) a exclusão ficou em voo');
    await page.evaluate(() => { if (document.activeElement && document.activeElement.blur) { document.activeElement.blur(); window.__ctBlurou = true; } });
    await page.evaluate(() => { if (window.__ctResolverRpc) window.__ctResolverRpc(); });
    const falhou = await msgTem(h, /Não deu para excluir agora/);
    const e = await estado(page), r = await h.ler();
    const f = await page.evaluate(() => ({ blurou: !!window.__ctBlurou, foco: (document.activeElement || {}).id || '', excluir: !document.querySelector('#ctacexcluir').disabled, sair: !document.querySelector('#ctacsair').disabled }));
    ok(falhou && await rpcs(page, 'excluir_minha_conta') === 1 && e.tela && e.s1 && r.dirty === '1' && r.ups.length === 0 && !r.chamadas.includes('signOut'),
      R + '(v3) exclusão recusada pelo servidor: avisa, nada é apagado, nada sobe e a sessão fica («' + e.msg + '»)');
    ok(f.blurou && f.excluir && f.sair && f.foco === 'ctacexcluir', R + '(v3) depois da falha os botões voltam e o foco volta ao "Excluir minha conta" (' + JSON.stringify(f) + ')');
  });

  // (v4) outro aparelho envia estudos (s10) depois que o portão abriu: a 1ª confirmação relê a nuvem, não exclui e pede
  // outro toque; o 2º gera o arquivo com o s10 e exclui (no app nativo, onde um toque já salva e pergunta). Também com o
  // relógio ATRASADO de quem enviou: o carimbo novo sai mais velho que o visto e conta como mudança do mesmo jeito.
  for (const [rot, upd] of [['', '2026-02-01T00:00:00.000Z'], [' relógio atrasado', '2025-12-01T00:00:00.000Z']]) {
    const V4 = '(v4)' + rot;
    await caso({
      nome: V4,
      aceite: true, semHidratar: true, nativo: true,
      local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:_dirty': '1', 'catedra:aceite': VELHO },
      ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }), leitorClaims: CLAIMS },
    }, async (page, h) => {
      ok(await naTela(h), R + V4 + ' a tela de aceite apareceu');
      await page.evaluate(upd => localStorage.setItem('__ct:select', JSON.stringify({ data: { data: { 'catedra:sessions': JSON.stringify([{ id: 's9', up: 2000 }, { id: 's10', up: 3000 }]) }, updated_at: upd }, error: null })), upd);
      const p = perguntador(page);
      p.fila.push('aceitar');
      await page.click('#ctacexcluir');
      const avisou = await msgTem(h, /Outro aparelho enviou estudos/);
      ok(avisou && await rpcs(page, 'excluir_minha_conta') === 0 && (await estado(page)).tela, R + V4 + ' a nuvem mudou depois que a tela abriu: a 1ª confirmação não exclui e pede outro toque');
      if (!await page.$('#ctacexcluir')) { ok(false, R + V4 + ' o portão sumiu depois da 1ª confirmação: não há o 2º toque'); return; }
      p.fila.push('aceitar');
      await page.click('#ctacexcluir');
      const saiu = await h.esperar(() => !!document.querySelector('#catedra-auth-gate #cte'), 10000);
      const nat = await page.evaluate(() => JSON.parse(localStorage.getItem('__rep:ponte') || '[]'));
      ok(saiu && await rpcs(page, 'excluir_minha_conta') === 1 && nat.length === 2 && !nat[0].ids.includes('s10') && nat[1].ids.includes('s10'),
        R + V4 + ' o 2º toque gera o arquivo com o que chegou (s10) e só então exclui (' + nat.map(x => x.ids.join('+')).join(' → ') + ')');
    });
  }

  // (v4w) o mesmo na web: o 1º toque entregou o arquivo da nuvem de quando a tela abriu. Com a nuvem nova, a confirmação não
  // exclui, e o toque seguinte entrega OUTRO arquivo (com o s10) sem perguntar; sem o `entregue = ''`, ele perguntaria, e a
  // resposta já na fila excluiria com o arquivo velho.
  await caso({
    nome: '(v4w)',
    aceite: true, semHidratar: true,
    local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:_dirty': '1', 'catedra:aceite': VELHO },
    ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }) },
  }, async (page, h) => {
    ok(await naTela(h), R + '(v4w) a tela de aceite apareceu');
    const p = perguntador(page);
    // o evento de download chega ao Node por fora do page.evaluate: espera por ele, com teto
    const baixou = async n => { for (let i = 0; i < 50 && p.downloads.length < n; i++) await new Promise(r => setTimeout(r, 100)); return p.downloads.length >= n; };
    await page.click('#ctacexcluir');
    await msgTem(h, /toque de novo/);
    await page.evaluate(() => localStorage.setItem('__ct:select', JSON.stringify({ data: { data: { 'catedra:sessions': JSON.stringify([{ id: 's9', up: 2000 }, { id: 's10', up: 3000 }]) }, updated_at: '2026-02-01T00:00:00.000Z' }, error: null })));
    p.fila.push('aceitar');
    await page.click('#ctacexcluir');
    const avisou = await msgTem(h, /Outro aparelho enviou estudos/);
    p.fila.push('aceitar');   // a resposta "já na fila": só o toque que pergunta a consome
    await page.click('#ctacexcluir');
    const entregouDeNovo = await msgTem(h, /entregue ao navegador\. Confira se ele foi salvo/);
    await baixou(2);
    const ids = async d => { try { return JSON.parse(JSON.parse(await lerDownload(d)).dados['catedra:sessions']).map(x => x.id); } catch (_) { return []; } };
    const i0 = p.downloads[0] ? await ids(p.downloads[0]) : [], i1 = p.downloads[1] ? await ids(p.downloads[1]) : [];
    ok(avisou && entregouDeNovo && await rpcs(page, 'excluir_minha_conta') === 0 && p.textos.length === 1 && p.downloads.length === 2 && !i0.includes('s10') && i1.includes('s10'),
      R + '(v4w) com a nuvem nova, o toque seguinte entrega outro arquivo (com o s10) sem perguntar (' + p.textos.length + ' pergunta[s]; ' + i0.join('+') + ' → ' + i1.join('+') + ')');
    if (!await page.$('#ctacexcluir')) { ok(false, R + '(v4w) o portão sumiu: excluiu com o arquivo velho'); return; }
    await page.click('#ctacexcluir');
    const saiu = await h.esperar(() => !!document.querySelector('#catedra-auth-gate #cte'), 10000);
    ok(saiu && await rpcs(page, 'excluir_minha_conta') === 1 && p.textos.length === 2, R + '(v4w) só o toque depois do arquivo novo pergunta e exclui');
  });

  // (v5) app nativo SEM credencial conferida (o getClaims recusou): o {conta} não sai, o app recusa o {excluir} sem agendar e
  // o aviso não promete limpeza "pendente"
  await caso({
    nome: '(v5)',
    aceite: true, semHidratar: true, nativo: true,
    local: { 'catedra:sessions': JSON.stringify([S1]), 'catedra:_dirty': '1', 'catedra:aceite': VELHO },
    ct: { select: linhaCom({ 'catedra:sessions': JSON.stringify([S9]) }) },
  }, async (page, h) => {
    ok(await naTela(h), R + '(v5) a tela de aceite apareceu');
    const p = perguntador(page);
    p.fila.push('aceitar');
    await page.click('#ctacexcluir');
    const saiu = await h.esperar(() => !!document.querySelector('#catedra-auth-gate #cte') && !localStorage.getItem('catedra:sessions'), 10000);
    const nat = await page.evaluate(() => ({ perfil: JSON.parse(localStorage.getItem('__rep:perfil') || '[]'), alertas: JSON.parse(localStorage.getItem('__rep:alert') || '[]') }));
    ok(saiu && !nat.perfil.some(m => m.conta) && nat.perfil.some(m => m.excluir === U1.id) && nat.alertas.length === 1
      && /não confirmou a limpeza/.test(nat.alertas[0]) && !/pendente/.test(nat.alertas[0]),
      R + '(v5) sem credencial conferida, o aviso não promete limpeza pendente (' + JSON.stringify(nat) + ')');
  });
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
   `nativo`: a página ganha as pontes do app nativo. A catedraBackup registra o pedido em __rep:ponte (com os ids das
   sessões do arquivo) e responde "salvo" depois de 600 ms, como o seletor de Arquivos do iPad — ou nunca, com
   __ct:ponteMuda (o seletor que não abriu); o confirm é embrulhado para registrar (__rep:confirm) se a pergunta veio
   depois dessa resposta. A catedraPerfil faz como o handler e o SessaoDosLeitores.receber (mac/Sources/main.swift,
   ios/Sources/main.swift, ios/vendor/comum/PerfilLeitor.swift): recusa corpo que não seja só texto ("Perfil inválido") e
   conta que não seja UUID, registra cada mensagem em __rep:perfil e só aceita o {excluir} da última conta confirmada
   NESTE documento por {conta, expiraEm}; e o alert vira registro em __rep:alert.
   `cota`: o setItem dessa chave no localStorage lança QuotaExceededError (cota cheia), e cada carga da fixture fica
   contada em __rep:cargas.
   `consomeProva`: como o _restoreProva do app (Catedra.dc.html), que no catedra:authuser lê o ct_prova, o APAGA e guarda o
   simulado pausado só na memória. */
async function casoBase(browser, base, ok, R, { nome, local, ct, hidratado, formulario, pendente, aceite, semHidratar, espiarFetch, nativo, cota, consomeProva }, corpo) {
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
          if (localStorage.getItem('__ct:ponteMuda') === 'true') return new Promise(() => {});   // o seletor que não abriu
          let ids = [];
          try { ids = JSON.parse((JSON.parse(m.json).dados || {})['catedra:sessions'] || '[]').map(x => x && x.id); } catch (_) {}
          const l = JSON.parse(localStorage.getItem('__rep:ponte') || '[]');
          l.push({ acao: m.acao, nome: m.nome, ids, s1: ids.includes('s1'), s9: ids.includes('s9') });
          localStorage.setItem('__rep:ponte', JSON.stringify(l));
          return new Promise(res => setTimeout(() => { localStorage.setItem('__rep:ponteRespondeu', String(l.length)); res({ ok: true, onde: 'iCloud Drive › Cátedra' }); }, 600));
        } } } };
        // {conta: ''} bloqueia os leitores sem esquecer a confirmação (o bloquear() do Swift não a zera)
        let confirmada = null;
        const uuid = s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || '') ? s.toLowerCase() : null;
        window.webkit.messageHandlers.catedraPerfil = { postMessage: function (m) {
          const l = JSON.parse(localStorage.getItem('__rep:perfil') || '[]'); l.push(m); localStorage.setItem('__rep:perfil', JSON.stringify(l));
          if (!m || typeof m !== 'object' || Object.keys(m).some(k => typeof m[k] !== 'string')) return Promise.reject(new Error('Perfil inválido'));
          if (m.excluir != null) {
            if (!uuid(m.excluir) || uuid(m.excluir) !== confirmada) return Promise.reject(new Error('Não foi possível atualizar os dados locais desta conta.'));
            confirmada = null; return Promise.resolve(true);
          }
          if (m.conta == null) return Promise.reject(new Error('Não foi possível atualizar os dados locais desta conta.'));
          if (uuid(m.conta) && /^\d+$/.test(m.expiraEm || '') && +m.expiraEm * 1000 > Date.now()) confirmada = uuid(m.conta);
          return Promise.resolve(true);
        } };
        window.alert = function (t) { const l = JSON.parse(localStorage.getItem('__rep:alert') || '[]'); l.push(String(t)); localStorage.setItem('__rep:alert', JSON.stringify(l)); };
        const conf = window.confirm.bind(window);
        window.confirm = function (t) {
          const l = JSON.parse(localStorage.getItem('__rep:confirm') || '[]');
          l.push({ ponteRespondeu: localStorage.getItem('__rep:ponteRespondeu'), t: String(t) });
          localStorage.setItem('__rep:confirm', JSON.stringify(l));
          return conf(t);
        };
      });
    }
    if (consomeProva) {
      await ctx.addInitScript(() => {
        window.addEventListener('catedra:authuser', () => { try { localStorage.removeItem('ct_prova'); } catch (_) {} });
      });
    }
    if (cota) {
      // roda antes do auth.js, que liga o _si ao setItem na carga
      await ctx.addInitScript((chave) => {
        const orig = Storage.prototype.setItem;
        Storage.prototype.setItem = function (k, v) {
          if (this === window.localStorage && k === chave) throw new DOMException('A cota do armazenamento acabou.', 'QuotaExceededError');
          return orig.call(this, k, v);
        };
        if (/auth-ipad-fixture/.test(location.pathname)) { try { orig.call(window.localStorage, '__rep:cargas', String(+(window.localStorage.getItem('__rep:cargas') || 0) + 1)); } catch (_) {} }
      }, cota);
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
    // com a cota, uma regressão recarregaria a página sem fim e a carga nunca terminaria: espera só o início da navegação
    await page.goto(base + FIX, cota ? { waitUntil: 'commit' } : undefined);
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
