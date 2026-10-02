/* ENVIO NO FECHAMENTO E NO SAIR SEM SOBRESCREVER A NUVEM (25/09/2026).

   O pagehide (flushSync) mandava um POST com `resolution=merge-duplicates`: o blob local
   inteiro por cima da nuvem, sem reler — o que outro aparelho gravou desde a última leitura
   deste sumia. E o Sair fazia o mesmo POST e apagava o aparelho no mesmo instante.

   Agora:
   · o fechamento manda um PATCH condicional (keepalive) com filtro no updated_at que este
     aparelho viu por último (_lastSrv, texto cru do servidor, com encodeURIComponent — o '+'
     do fuso vira %2B): só grava se a nuvem não mudou desde então. Não envia sem _lastSrv, com
     corpo acima de ~60 KB (o keepalive recusaria), durante a hidratação, nem quando uma chave
     que tinha conteúdo na nuvem (catedra:_srvCheio, EXCLUDE) ficou vazia aqui sem lápide de
     chave ("vazio nunca apaga cheio"). Nunca limpa o sujo;
   · o Sair tenta subir pelo pushNow (leitura antes de gravar) e ESPERA a resposta (até 5 s)
     antes de perguntar; só com pendência que sobrou avisa; confirmando, a última tentativa é o
     PATCH condicional, e só então signOut e clearLocal. Um envio que ainda estava em voo não
     regrava nada depois do clearLocal (`saindo`).

   Roda com tests/auth-ipad-fixture.html (auth.js de verdade, Supabase falso preguiçoso, __ct:*).
   O window.fetch da página é trocado por um GRAVADOR (addInitScript; nada vai à rede, e o
   registro sobrevive ao reload do Sair em __rep:fetch) — page.route não serve para keepalive.
   O fechamento é um `new Event('pagehide')` despachado na janela. Cada caso em contexto
   próprio, relógio fixo e semente por base + '/__semente'. Só na origem http.

   Casos:
   (a) PATCH com user_id=eq.u1 e updated_at=eq.<_lastSrv codificado> ('+00:00' → %2B00%3A00 e
       o formato 'Z'), keepalive, Prefer return=minimal, sem POST, sem meta-estado no corpo, e o
       sujo continua;
   (b) sem _lastSrv: nenhum envio;  (c) corpo > 60 KB: nenhum envio;
   (d) durante a hidratação: nenhum envio;
   (e) chave que tinha conteúdo na nuvem ficou vazia ('[]'): nenhum envio; com lápide de chave
       (o "apagar tudo") o PATCH sai;
   (f) o acerto com a nuvem grava catedra:_srvCheio (push e pull), e ele nunca sobe;
   (g) Sair com pendência: select e upsert EXECUTADOS e respondidos antes do signOut, sem aviso
       e sem envio keepalive; depois, o aparelho limpo;
   (h) Sair com o envio falhando: tenta antes, o aviso aparece e desistir mantém tudo; confirmar
       manda o PATCH condicional antes do signOut, nunca o POST;
   (i) envio em voo quando o Sair apaga o aparelho: a resposta atrasada não regrava nada depois
       do clearLocal (nem mescla, nem upsert). */

const FIX = '/tests/auth-ipad-fixture.html';
const U1 = { id: 'u1', email: 'lana@exemplo.com' };
const AGORA = new Date('2026-09-25T12:00:00.000Z');
const UPD = '2026-01-01T00:00:00.123+00:00';
const S1 = { id: 's1', up: 1000, t: 'local' }, S9 = { id: 's9', up: 2000, t: 'nuvem' };
const linhaCom = (data, updated_at = UPD) => ({ data: { data, updated_at }, error: null });
const FALHA = { data: null, error: { message: 'TypeError: Failed to fetch', code: '' } };
const sessoes = a => JSON.stringify(a);

export async function testarAuthFechamento(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const R = 'AUTH FECHAMENTO [' + motor + '] ';
  const browser = pageDaSuite.context().browser();
  const caso = (cfg, corpo) => casoBase(browser, base, ok, R, cfg, corpo);
  const fechar = page => page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const paraNuvem = f => f.filter(x => /\/rest\/v1\/user_data/.test(x.url));

  // (a) PATCH condicional, nos dois formatos do _lastSrv
  await caso({
    nome: '(a)', hidratado: true,
    local: { 'catedra:sessions': sessoes([S1]), 'catedra:_dirty': '1', 'catedra:_lastSrv': UPD, 'catedra:_srvCheio': JSON.stringify(['catedra:sessions']) },
    ct: { select: linhaCom({ 'catedra:sessions': sessoes([S9]) }), upsert: FALHA },
  }, async (page, h) => {
    await page.waitForTimeout(900);   // o pushNow da abertura falha (upsert com erro): o sujo fica
    await h.zerarFetch();
    await fechar(page);
    await page.waitForTimeout(150);
    const f = paraNuvem(await h.fetchs());
    const r = await h.ler();
    const p = f[0] || {};
    const q = p.url ? new URL(p.url).search : '';
    ok(f.length === 1 && p.metodo === 'PATCH' && p.keepalive, R + '(a) pagehide com pendência: um PATCH keepalive (' + f.map(x => x.metodo).join(',') + ')');
    ok(f.every(x => x.metodo !== 'POST'), R + '(a) nenhum POST cego para user_data');
    ok(/[?&]user_id=eq\.u1(&|$)/.test(q), R + '(a) filtro user_id=eq.u1 (' + q.slice(0, 40) + ')');
    ok(q.includes('updated_at=eq.2026-01-01T00%3A00%3A00.123%2B00%3A00'), R + '(a) filtro updated_at=eq.<_lastSrv> com o "+" do fuso codificado (' + q + ')');
    const lido = p.url ? new URL(p.url).searchParams.get('updated_at') : '';
    ok(lido === 'eq.' + UPD, R + '(a) o servidor lê exatamente o _lastSrv cru (' + lido + ')');
    ok(p.headers && p.headers.Prefer === 'return=minimal' && p.headers.Authorization === 'Bearer tok-u1' && p.headers.apikey === 'chave-de-teste',
      R + '(a) cabeçalhos: apikey, Bearer do usuário e Prefer return=minimal');
    let corpo = {}; try { corpo = JSON.parse(p.corpo || '{}'); } catch (_) {}
    const d = corpo.data || {};
    ok(/"s1"/.test(d['catedra:sessions'] || '') && !('user_id' in corpo), R + '(a) o corpo leva o dado local (s1)');
    ok(!('catedra:_srvCheio' in d) && !('catedra:_dirty' in d) && !('catedra:_lastSrv' in d), R + '(a) nenhum meta-estado local no corpo (_srvCheio, _dirty, _lastSrv)');
    ok(r.dirty === '1', R + '(a) o pagehide não limpa o sujo (' + r.dirty + ')');
    // o outro formato que o _lastSrv guarda: o toISOString do próprio pushNow
    await page.evaluate(() => localStorage.setItem('catedra:_lastSrv', '2026-02-03T04:05:06.789Z'));
    await h.zerarFetch();
    await fechar(page);
    await page.waitForTimeout(150);
    const f2 = paraNuvem(await h.fetchs());
    ok(f2.length === 1 && f2[0].metodo === 'PATCH' && f2[0].url.includes('updated_at=eq.2026-02-03T04%3A05%3A06.789Z'),
      R + '(a) formato "Z" do _lastSrv: updated_at=eq.2026-02-03T04%3A05%3A06.789Z (' + (f2[0] ? new URL(f2[0].url).search : '—') + ')');
  });

  // (b) sem _lastSrv: sem filtro não há envio seguro
  await caso({
    nome: '(b)', hidratado: true,
    local: { 'catedra:sessions': sessoes([S1]), 'catedra:_dirty': '1' },
    ct: { select: { data: null, error: null }, upsert: FALHA },
  }, async (page, h) => {
    await page.waitForTimeout(900);
    await h.zerarFetch();
    await fechar(page); await page.waitForTimeout(150);
    const f = paraNuvem(await h.fetchs()), r = await h.ler();
    ok(r.lastSrv == null || r.lastSrv === '', R + '(b) o aparelho não tem _lastSrv (' + r.lastSrv + ')');
    ok(f.length === 0 && r.dirty === '1', R + '(b) sem _lastSrv: nenhum envio no pagehide, sujo mantido (' + f.map(x => x.metodo).join(',') + ')');
  });

  // (c) corpo acima do teto do keepalive
  await caso({
    nome: '(c)', hidratado: true,
    local: { 'catedra:sessions': sessoes([S1]), 'catedra:grande': JSON.stringify('x'.repeat(70000)), 'catedra:_dirty': '1', 'catedra:_lastSrv': UPD },
    ct: { select: linhaCom({ 'catedra:sessions': sessoes([S9]) }), upsert: FALHA },
  }, async (page, h) => {
    await page.waitForTimeout(900);
    await h.zerarFetch();
    await fechar(page); await page.waitForTimeout(150);
    const f = paraNuvem(await h.fetchs()), r = await h.ler();
    ok(f.length === 0 && r.dirty === '1', R + '(c) corpo > 60 KB: nenhum envio no pagehide (o keepalive recusaria), sujo mantido (' + f.map(x => x.metodo).join(',') + ')');
  });

  // (d) durante a hidratação (leitura da nuvem em voo)
  await caso({
    nome: '(d)', semHidratar: true,
    local: { 'catedra:sessions': sessoes([S1]), 'catedra:_dirty': '1', 'catedra:_lastSrv': UPD },
    ct: { select: linhaCom({ 'catedra:sessions': sessoes([S9]) }), selectAtraso: 4000 },
  }, async (page, h) => {
    const lendo = await h.esperar(() => window.__ctChamadas().some(c => c.nome === 'select') && sessionStorage.getItem('catedra:hydrated') !== '1', 6000);
    ok(lendo, R + '(d) a leitura da hidratação está em voo');
    await h.zerarFetch();
    await fechar(page); await page.waitForTimeout(150);
    const f = paraNuvem(await h.fetchs());
    ok(f.length === 0, R + '(d) pagehide durante a hidratação: nenhum envio (' + f.map(x => x.metodo).join(',') + ')');
    ok(await h.hidratado(), R + '(d) a hidratação terminou depois');
  });

  // (e) "vazio nunca apaga cheio": a chave que tinha conteúdo na nuvem ficou vazia aqui
  await caso({
    nome: '(e)', hidratado: true,
    local: { 'catedra:sessions': sessoes([S1]), 'catedra:edital': '[]', 'catedra:_dirty': '1', 'catedra:_lastSrv': UPD,
      'catedra:_srvCheio': JSON.stringify(['catedra:sessions', 'catedra:edital']) },
    ct: { select: linhaCom({ 'catedra:sessions': sessoes([S9]) }), upsert: FALHA },
  }, async (page, h) => {
    await page.waitForTimeout(900);
    await h.zerarFetch();
    await fechar(page); await page.waitForTimeout(150);
    const f = paraNuvem(await h.fetchs()), r = await h.ler();
    ok(f.length === 0 && r.dirty === '1', R + '(e) edital cheio na nuvem e "[]" aqui, sem lápide: nenhum envio, sujo mantido (' + f.map(x => x.metodo).join(',') + ')');
    // o "apagar tudo": a chave sai por removeItem e deixa lápide de chave — aí o envio vale
    await page.evaluate(() => localStorage.removeItem('catedra:edital'));
    await page.waitForTimeout(100);
    await h.zerarFetch();
    await fechar(page); await page.waitForTimeout(150);
    const f2 = paraNuvem(await h.fetchs());
    const tomb = await page.evaluate(() => { try { return !!JSON.parse(localStorage.getItem('catedra:_tomb')).keys['catedra:edital']; } catch (_) { return false; } });
    ok(tomb && f2.length === 1 && f2[0].metodo === 'PATCH', R + '(e) com lápide de chave (removeItem de propósito), o PATCH condicional sai (' + f2.map(x => x.metodo).join(',') + ')');
  });

  // (f) o acerto com a nuvem grava _srvCheio, que nunca sobe
  await caso({
    nome: '(f)', hidratado: true,
    local: { 'catedra:sessions': sessoes([S1]), 'catedra:_dirty': '1', 'catedra:_lastSrv': UPD },
    ct: { select: linhaCom({ 'catedra:sessions': sessoes([S9]), 'catedra:edital': JSON.stringify([{ id: 'd1' }]), 'catedra:vazio': '[]' }) },
  }, async (page, h) => {
    const subiu = await h.esperar(() => localStorage.getItem('catedra:_dirty') == null, 6000);
    const r = await h.ler();
    const cheio = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('catedra:_srvCheio')); } catch (_) { return null; } });
    ok(subiu && Array.isArray(cheio) && cheio.includes('catedra:sessions') && cheio.includes('catedra:edital') && !cheio.includes('catedra:vazio'),
      R + '(f) depois do pushNow que deu certo, _srvCheio lista as chaves com conteúdo (' + JSON.stringify(cheio) + ')');
    const upKeys = await page.evaluate(() => window.__ctChamadas().filter(c => c.nome === 'upsert').map(c => Object.keys(c.arg && c.arg.data || {})));
    ok(r.ups >= 1 && upKeys.every(ks => !ks.includes('catedra:_srvCheio')), R + '(f) _srvCheio nunca sobe no blob (EXCLUDE)');
    // pull que traz coisa nova: a lista passa a ser a da nuvem lida
    await page.evaluate(() => {
      localStorage.setItem('__ct:select', JSON.stringify({ data: { data: { 'catedra:sessions': JSON.stringify([{ id: 's9', up: 2000 }]), 'catedra:metas': JSON.stringify([{ id: 'm1', up: 1 }]) }, updated_at: '2027-01-01T00:00:00+00:00' }, error: null }));
      window.dispatchEvent(new Event('online'));
    });
    const puxou = await h.esperar(() => localStorage.getItem('catedra:_lastSrv') === '2027-01-01T00:00:00+00:00', 4000);
    const cheio2 = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('catedra:_srvCheio')); } catch (_) { return null; } });
    ok(puxou && Array.isArray(cheio2) && cheio2.includes('catedra:metas') && !cheio2.includes('catedra:edital'),
      R + '(f) depois do pull que mesclou, _srvCheio é o que a nuvem tem (' + JSON.stringify(cheio2) + ')');
  });

  // (g) Sair espera o envio seguro antes de apagar o aparelho
  await caso({
    nome: '(g)', hidratado: true,
    local: { 'catedra:sessions': sessoes([S1]), 'catedra:_dirty': '1', 'catedra:_lastSrv': UPD },
    ct: { select: linhaCom({ 'catedra:sessions': sessoes([S9]) }), upsert: FALHA },
  }, async (page, h) => {
    await page.waitForTimeout(900);   // abertura: o envio falhou, a pendência fica
    const antes = await h.ler();
    ok(antes.dirty === '1', R + '(g) antes do Sair há pendência (' + antes.dirty + ')');
    await page.evaluate(() => {
      localStorage.removeItem('__ct:upsert');                 // a rede voltou
      localStorage.setItem('__ct:upsertAtraso', '1500');       // e a resposta demora
      localStorage.setItem('__ct:chamadas', '[]');
    });
    await h.zerarFetch();
    const dialogos = [];
    page.on('dialog', async dl => { dialogos.push(dl.message()); await dl.accept(); });
    await h.ev(() => { window.CatedraAuth.logout(); });
    const saiu = await h.esperar(() => window.__ctChamadas().some(c => c.nome === 'signOut') && !localStorage.getItem('catedra:sessions'), 10000);
    const ch = await h.ev(() => window.__ctChamadas());
    const f = paraNuvem(await h.fetchs());
    const iSel = ch.findIndex(c => c.nome === 'select'), iUp = ch.findIndex(c => c.nome === 'upsert'), iOut = ch.findIndex(c => c.nome === 'signOut');
    ok(saiu, R + '(g) Sair terminou: signOut e aparelho limpo');
    ok(iSel >= 0 && iUp > iSel && iOut > iUp, R + '(g) ordem: leitura, upsert e só depois signOut (' + ch.map(c => c.nome).join(',') + ')');
    const up = ch[iUp] || {}, out = ch[iOut] || {};
    ok(iUp >= 0 && iOut >= 0 && out.t - up.t >= 1400, R + '(g) o signOut esperou a RESPOSTA do upsert (' + (out.t - up.t) + ' ms depois do pedido)');
    ok(/"s1"/.test(String(up.arg && up.arg.data && up.arg.data['catedra:sessions'] || '')), R + '(g) o upsert levou s1');
    ok(dialogos.length === 0, R + '(g) com o envio confirmado, nenhum aviso de pendência (' + dialogos.length + ')');
    ok(f.length === 0, R + '(g) nenhum envio keepalive (nem POST, nem PATCH) no Sair (' + f.map(x => x.metodo).join(',') + ')');
  });

  // (h) Sair com o envio falhando: tenta antes, avisa; confirmar → PATCH condicional, nunca POST
  await caso({
    nome: '(h)', hidratado: true,
    local: { 'catedra:sessions': sessoes([S1]), 'catedra:_dirty': '1', 'catedra:_lastSrv': UPD },
    ct: { select: linhaCom({ 'catedra:sessions': sessoes([S9]) }), upsert: FALHA },
  }, async (page, h) => {
    await page.waitForTimeout(900);
    await page.evaluate(() => localStorage.setItem('__ct:chamadas', '[]'));
    await h.zerarFetch();
    // com o diálogo aberto a página não responde a evaluate: quem conta os envios é o confirm
    await page.evaluate(() => {
      const orig = window.confirm;
      window.confirm = function (m) { window.__upsAoAvisar = window.__ctChamadas().filter(c => c.nome === 'upsert').length; return orig.call(window, m); };
    });
    let msg = '';
    page.once('dialog', async dl => { msg = dl.message(); await dl.dismiss(); });
    await h.ev(() => window.CatedraAuth.logout());
    await page.waitForTimeout(400);
    const upsAntesDoAviso = await h.ev(() => window.__upsAoAvisar == null ? -1 : window.__upsAoAvisar);
    const r = await h.ler();
    const c = await h.ev(() => ({ s1: /"s1"/.test(localStorage.getItem('catedra:sessions') || ''), auth: localStorage.getItem('catedra:auth'),
      signOut: window.__ctChamadas().filter(x => x.nome === 'signOut').length,
      portao: getComputedStyle(document.getElementById('catedra-auth-gate')).display }));
    ok(/^Há estudos deste aparelho que ainda não subiram/.test(msg), R + '(h) envio falhando: o aviso de pendência aparece (' + msg.slice(0, 50) + '…)');
    ok(upsAntesDoAviso >= 1, R + '(h) o envio foi TENTADO antes do aviso (' + upsAntesDoAviso + ' upsert[s])');
    ok(c.s1 && c.signOut === 0 && c.auth === '1' && r.dirty === '1' && c.portao === 'none', R + '(h) desistir: nada apagado, sem signOut, sujo mantido, app aberto');
    ok(paraNuvem(await h.fetchs()).length === 0, R + '(h) desistir: nenhum envio keepalive');
    // agora confirma a saída
    await page.evaluate(() => localStorage.setItem('__ct:chamadas', '[]'));
    await h.zerarFetch();
    page.once('dialog', dl => dl.accept());
    await h.ev(() => { window.CatedraAuth.logout(); });
    const saiu = await h.esperar(() => window.__ctChamadas().some(x => x.nome === 'signOut') && !localStorage.getItem('catedra:sessions'), 10000);
    const f = paraNuvem(await h.fetchs());
    const out = (await h.ev(() => window.__ctChamadas())).find(x => x.nome === 'signOut') || {};
    ok(saiu, R + '(h) confirmar: signOut e aparelho limpo');
    ok(f.length === 1 && f[0].metodo === 'PATCH' && f[0].keepalive && f[0].url.includes('updated_at=eq.2026-01-01T00%3A00%3A00.123%2B00%3A00'),
      R + '(h) confirmar: a última tentativa é o PATCH condicional (' + f.map(x => x.metodo).join(',') + ')');
    ok(f.every(x => x.metodo !== 'POST'), R + '(h) confirmar: nenhum POST cego');
    ok(f.length === 1 && out.t != null && f[0].t <= out.t, R + '(h) o PATCH sai antes do signOut');
  });

  // (h2) a sessão CAI durante a espera do Sair (a leitura do envio volta 401/PGRST301): o
  // formulário de "sessão expirada" fica na tela, nada é apagado e o Sair não segue com o
  // "dá para subir" de antes da queda.
  await caso({
    nome: '(h2)', hidratado: true,
    local: { 'catedra:sessions': sessoes([S1]), 'catedra:_dirty': '1', 'catedra:_lastSrv': UPD },
    ct: { select: linhaCom({ 'catedra:sessions': sessoes([S9]) }), upsert: FALHA },
  }, async (page, h) => {
    await page.waitForTimeout(900);
    await page.evaluate(() => { localStorage.setItem('__ct:chamadas', '[]');
      localStorage.setItem('__ct:select', JSON.stringify({ data: null, error: { message: 'JWT expired', code: 'PGRST301' }, status: 401 })); });
    await h.zerarFetch();
    const dialogos = [];
    page.on('dialog', async dl => { dialogos.push(dl.message()); await dl.dismiss(); });
    await h.ev(() => window.CatedraAuth.logout());
    await page.waitForTimeout(1500);
    const c = await h.ev(() => ({ s1: /"s1"/.test(localStorage.getItem('catedra:sessions') || ''),
      dirty: localStorage.getItem('catedra:_dirty'),
      signOut: window.__ctChamadas().filter(x => x.nome === 'signOut').length,
      portao: getComputedStyle(document.getElementById('catedra-auth-gate')).display,
      expirou: /sess[ãa]o expirou/i.test(document.getElementById('catedra-auth-gate').textContent || '') }));
    ok(c.portao !== 'none' && c.expirou, R + '(h2) sessão caiu na espera do Sair: o formulário de "sessão expirada" continua na tela (portão ' + c.portao + ')');
    ok(dialogos.length === 0, R + '(h2) nenhum aviso de "dá para subir" com a sessão já caída (' + dialogos.length + ')');
    ok(c.s1 && c.dirty === '1' && c.signOut === 0, R + '(h2) nada apagado, pendência mantida e sem signOut — um novo login ainda salva s1');
    ok(paraNuvem(await h.fetchs()).length === 0, R + '(h2) nenhum envio keepalive');
  });

  // (i) envio em voo quando o Sair apaga o aparelho: nada regrava depois do clearLocal.
  // O reload do Sair é SEGURADO pela rota do documento: enquanto isso a página velha segue viva e
  // a resposta atrasada da leitura chega depois do clearLocal.
  {
    let segurar = false;
    await caso({
      nome: '(i)', hidratado: true,
      local: { 'catedra:sessions': sessoes([S1]), 'catedra:_lastSrv': UPD },
      ct: { select: linhaCom({ 'catedra:sessions': sessoes([S9]), 'catedra:depois': JSON.stringify('da nuvem') }) },
      rota: async (ctx) => {
        await ctx.route(u => /\/tests\/auth-ipad-fixture\.html$/.test(new URL(u).pathname), async rota => {
          if (segurar) { segurar = false; await new Promise(r => setTimeout(r, 6500)); }
          await rota.continue();
        });
      },
    }, async (page, h) => {
      await page.waitForTimeout(900);
      // a pessoa edita; o envio sai em 700 ms e a leitura dele demora 6 s (mais que os 5 s do Sair)
      await page.evaluate(() => {
        localStorage.setItem('__ct:selectAtraso', '6000');
        localStorage.setItem('__ct:chamadas', '[]');
        const a = JSON.parse(localStorage.getItem('catedra:sessions') || '[]');
        a.push({ id: 's2', up: 5000 });
        localStorage.setItem('catedra:sessions', JSON.stringify(a));
      });
      ok(await h.esperar(() => window.__ctChamadas().some(c => c.nome === 'select'), 3000), R + '(i) o envio da edição está em voo (leitura pedida)');
      segurar = true;
      page.on('dialog', dl => dl.accept().catch(() => {}));
      await h.ev(() => { window.__paginaVelha = 1; window.CatedraAuth.logout(); });
      // o Sair espera até 5 s, avisa, confirma, signOut, clearLocal e recarrega (segurado)
      const limpou = await h.esperar(() => window.__ctChamadas().some(c => c.nome === 'signOut') && !localStorage.getItem('catedra:sessions'), 15000);
      const diag = limpou ? '' : await h.ev(() => window.__ctChamadas().map(c => c.nome).join(',') + ' / sessions=' + !!localStorage.getItem('catedra:sessions') + ' / velha=' + !!window.__paginaVelha).catch(e => String(e).slice(0, 80));
      ok(limpou, R + '(i) o Sair limpou o aparelho com o envio ainda em voo' + (diag ? ' (' + diag + ')' : ''));
      // a leitura atrasada responde (6 s) com a página velha ainda viva (reload segurado 6,5 s); depois o reload conclui
      await page.waitForTimeout(3500);
      const novaPagina = await h.esperar(() => !window.__paginaVelha && !!document.getElementById('catedra-auth-gate') && !!window.CatedraAuth, 10000);
      ok(novaPagina, R + '(i) o reload do Sair concluiu');
      await page.waitForTimeout(600);
      const r = await page.evaluate(() => ({
        chaves: Object.keys(localStorage).filter(k => k.indexOf('catedra:') === 0),
        chamadas: window.__ctChamadas().map(c => c.nome),
      }));
      const iOut = r.chamadas.indexOf('signOut');
      ok(!r.chaves.includes('catedra:depois') && !r.chaves.includes('catedra:sessions') && !r.chaves.includes('catedra:_lastSrv') && !r.chaves.includes('catedra:_dirty'),
        R + '(i) a resposta atrasada não regravou nada depois do clearLocal (' + r.chaves.join(',') + ')');
      ok(iOut >= 0 && !r.chamadas.slice(iOut).includes('upsert'), R + '(i) nenhum upsert depois do signOut (' + r.chamadas.join(',') + ')');
    });
  }
}

/* Um caso: contexto e relógio próprios, gravador de fetch desde o início (sobrevive ao reload),
   semente em /__semente, abre a fixture e confere que a hidratação terminou (salvo semHidratar). */
async function casoBase(browser, base, ok, R, { nome, local, ct, hidratado, semHidratar, rota }, corpo) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA (auth-fechamento):', e.message));
  try {
    await page.clock.install({ time: AGORA });
    if (rota) await rota(ctx);
    await ctx.addInitScript(() => {
      // GRAVADOR: nada vai à rede; o registro fica em __rep:fetch (sobrevive ao reload do Sair)
      window.fetch = function (u, o) {
        try {
          const l = JSON.parse(localStorage.getItem('__rep:fetch') || '[]');
          l.push({ url: String(u), metodo: o && o.method || 'GET', keepalive: !!(o && o.keepalive), headers: o && o.headers || {}, corpo: o && typeof o.body === 'string' ? o.body : null, t: Date.now() });
          localStorage.setItem('__rep:fetch', JSON.stringify(l));
        } catch (_) {}
        return Promise.resolve(new Response(null, { status: 204 }));
      };
    });
    await page.goto(base + '/__semente');
    await page.evaluate(({ U1, local, ct, hidratado }) => {
      localStorage.clear(); sessionStorage.clear();
      localStorage.setItem('__ct:sessao', JSON.stringify(U1));
      localStorage.setItem('__ct:online', '1');
      localStorage.setItem('__ct:chamadas', '[]');
      for (const [k, v] of Object.entries(ct || {})) localStorage.setItem('__ct:' + k, typeof v === 'string' ? v : JSON.stringify(v));
      localStorage.setItem('catedra:_owner', U1.id);
      for (const [k, v] of Object.entries(local || {})) localStorage.setItem(k, v);
      if (hidratado) { localStorage.setItem('catedra:auth', '1'); sessionStorage.setItem('catedra:hydrated', '1'); }
    }, { U1, local, ct, hidratado });
    /* O Sair RECARREGA a página, e um page.evaluate que cai nesse instante morre com "Execution
       context was destroyed, most likely because of a navigation" — exceção que derruba o módulo
       inteiro, não um caso (foi assim, sob carga, em 01/10/2026). Tudo o que estes casos leem
       (chamadas do Supabase falso, fetchs, chaves do sync) vive no localStorage e SOBREVIVE ao
       reload, então a leitura é repetida quando a página volta, em vez de abortar. Erro que não
       seja de navegação continua subindo: só o barulho do reload é absorvido. */
    const ev = async (fn, arg) => {
      const fim = Date.now() + 15000;
      let ultimo;
      while (Date.now() < fim) {
        try { return await page.evaluate(fn, arg); }
        catch (e) {
          ultimo = e;
          if (!/Execution context was destroyed|because of a navigation|frame was detached/i.test(String(e && e.message || e))) throw e;
          try { await page.waitForLoadState('domcontentloaded', { timeout: 5000 }); } catch (_) {}
          await new Promise(r => setTimeout(r, 100));
        }
      }
      throw ultimo;
    };
    const h = {
      ev,
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
      ler: () => ev(() => ({
        ups: window.__ctChamadas().filter(c => c.nome === 'upsert').length,
        dirty: localStorage.getItem('catedra:_dirty'),
        lastSrv: localStorage.getItem('catedra:_lastSrv'),
        status: window.CatedraSync && window.CatedraSync.status,
      })),
      fetchs: () => ev(() => JSON.parse(localStorage.getItem('__rep:fetch') || '[]')),
      zerarFetch: () => ev(() => localStorage.setItem('__rep:fetch', '[]')),
    };
    await page.goto(base + FIX);
    // o supabase-js de verdade emite INITIAL_SESSION ao assinar onAuthStateChange — é dali que o
    // auth.js tira o token do envio com keepalive. O falso não emite: o caso emite por ele.
    await h.esperar(() => typeof window.__ctAuthCb === 'function', 5000);
    await page.evaluate(({ U1 }) => window.__ctAuthCb('INITIAL_SESSION', { user: U1, access_token: 'tok-' + U1.id, refresh_token: 'r', expires_at: 4102444800 }), { U1 });
    if (!semHidratar) ok(await h.hidratado(), R + nome + ' a abertura terminou (hydrated=1 e portão oculto)');
    await corpo(page, h);
  } finally { await ctx.close(); }
}
