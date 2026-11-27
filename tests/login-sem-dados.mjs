/* LOGIN SEM DADOS NÃO SOBRESCREVE A NUVEM (25/11/2026).

   O defeito (provado na auditoria de 25/11 com o app real): o carimbo por chave (catedra:_kts)
   decide, entre aparelhos, qual valor é o mais novo, e o auth.js carimbava TODA escrita do app —
   inclusive as que acontecem antes de a pessoa chegar ao app, com o portão aberto. Num aparelho
   sem dados (Safari limpo, aparelho novo, ou depois do Sair) o app monta atrás da tela de login e
   grava os valores padrão (74 chaves); carimbados com a hora, eles venciam a nuvem na mescla da
   hidratação e subiam por cima dela. Numa conta de teste, 10 de 12 configurações voltaram ao
   padrão. O mesmo mecanismo fazia o segundo aparelho do dia, ao abrir com rede, zerar os hábitos
   que o primeiro marcou de manhã (a reconciliação do dia grava antes de a leitura da nuvem voltar).

   O conserto (auth.js, setImpl e o evento 'storage'): só carimba depois que o portão fecha pela
   primeira vez na página — a pessoa chegou ao app. A marca não desliga quando o portão reabre: o
   autosave grava 500 ms depois da edição, e a edição feita antes da reabertura é da pessoa.

   Roda o app INTEIRO (Catedra.dc.html) com o auth.js de verdade e o Supabase falso de
   tests/auth-ipad-fixture.html (preguiçoso como o postgrest-js, controlado por __ct:*), injetados
   como o build injeta. O juridico.js é neutralizado: sem versão publicada dos Termos, o aceite
   não entra no caminho. Relógio fixo (setFixedTime: a data para, os temporizadores andam) às 15h
   de Brasília, em contexto próprio por caso. Só na origem http (semeia por base + '/__semente').

   Casos:
   (a) aparelho limpo, o formulário de entrada na tela e o app montado atrás dele: os padrões
       gravados NÃO ganham carimbo, nem a escrita de um satélite (iframe → evento 'storage');
       entrando pelo formulário, o envio leva as configurações da nuvem (carimbadas ontem);
   (b) na mesma página, já no app: a escolha da pessoa carimba com a hora e vence a nuvem que
       outro aparelho mudou hoje de manhã; a escrita do satélite também carimba;
   (c) segundo aparelho do dia, ao abrir com rede: a leitura da nuvem fica presa até a
       reconciliação do dia zerar os hábitos atrás do portão (pré-condição conferida); depois, a
       nuvem vence;
   (d) aberto sem hidratar (a leitura falhou): estudar sem nuvem carimba como sempre;
   (e) sessão pendente retomada: a pessoa edita offline e a rede volta antes de o autosave gravar —
       o portão reabre ("Carregando seus dados…"), e a edição dela ainda carimba e vence.

   NÃO coberto (anterior ao conserto, fora do escopo dele — duas revisões adversariais o
   confirmaram): (1) a reconciliação do dia carimbada como escrita da pessoa sempre que ela roda
   com o portão já fechado — ao despertar depois de suspensão, na abertura offline ou com a
   leitura falhando rápido (o portão fecha antes de o app montar) e na recarga, no dia seguinte,
   de uma aba já hidratada; (2) várias abas: o evento 'storage' carimba pela marca da aba que o
   recebe, e a troca de conta numa aba recarrega a outra com o catedra:hydrated da conta antiga. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = fs.readFileSync(path.join(AQUI, 'auth-ipad-fixture.html'), 'utf8');
const I0 = FIXTURE.indexOf('<script>') + '<script>'.length;
const FALSO = FIXTURE.slice(I0, FIXTURE.indexOf('</script>', I0));
// a mesma ordem do build: React local, configuração do Supabase, cliente, auth.js — antes do app
const INJ = '\n<script src="./vendor/react.js"></script><script src="./vendor/react-dom.js"></script>\n'
  + '<script>' + FALSO + '</script>\n<script src="./auth.js"></script>\n';

const AGORA = new Date('2026-11-25T18:00:00.000Z');   // 15h em Brasília: longe da madrugada
const T = AGORA.getTime(), ONTEM = T - 86400000, MANHA = T - 2 * 3600000;
const HOJE = '2026-11-25', ONTEM_TXT = '2026-11-24';
const U = { id: 'u1', email: 'pessoa@exemplo.com' };
const SESSAO = { user: U, access_token: 'tok-u1', refresh_token: 'r', expires_at: 4102444800 };
const FALHA = { data: null, error: { message: 'TypeError: Failed to fetch', code: '' } };
const REDE_CAIU = { name: 'AuthRetryableFetchError', message: 'Load failed', status: 0 };

// (a) o que a pessoa configurou, na nuvem, carimbado ontem. As nove primeiras diferem do padrão
// do app e provam o carimbo (sem o conserto, o padrão carimbado agora vencia); as três da Redação
// têm padrão vazio e guardam a outra regra da mescla, "vazio nunca apaga cheio".
const NUVEM_A = {
  'catedra:sim': JSON.stringify({ total: 120, acertos: 90, erros: 30, brancos: 0 }),
  'catedra:prefs': JSON.stringify({ density: 'compacta', notifRevisao: false }),
  'catedra:profile': JSON.stringify({ estrategia: 'ciclo', retaFinal: true }),
  'catedra:bancaSel': JSON.stringify('fgv'),
  'catedra:planHoras': '30',
  'catedra:provaDurationMin': '300',
  'catedra:relPeriod': '7',
  'catedra:plataformaQuestoes': JSON.stringify('qconcursos'),
  'catedra:simAnalysis': JSON.stringify('bruta'),
  'catedra:redText': JSON.stringify('Rascunho de discursiva, meia hora de trabalho.'),
  'catedra:redGabarito': JSON.stringify('1. Quesito do espelho (1,00 ponto)'),
  'catedra:redEnunciado': JSON.stringify('Enunciado da questão em andamento.'),
};

// O app servido, lido UMA vez e já com as injeções. A rota só entrega o corpo pronto: com
// route.fetch() cada carga fazia uma ida e volta pela rede do Playwright, e no WebKit uma delas
// ficou pendurada durante a recarga da hidratação (o app nunca voltou; o contexto fechou com o
// pedido aberto e o erro escapou do callback). O .catch cobre o pedido que a navegação cancelou.
const APP = new Map();
async function appInjetado(base) {
  if (!APP.has(base)) APP.set(base, (await (await fetch(base + '/Catedra.dc.html')).text()).replace(/<head[^>]*>/i, (m) => m + INJ));
  return APP.get(base);
}

async function abrir(browser, base, { local = {}, ct = {} }) {
  const corpo = await appInjetado(base);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'America/Sao_Paulo' });
  try {
    await ctx.route('**/Catedra.dc.html*', (route) => route.fulfill({ status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' }, body: corpo }).catch(() => {}));
    await ctx.route('**/juridico.js*', (route) => route.fulfill({ status: 200, headers: { 'content-type': 'text/javascript' },
      body: '/* sem documentos publicados: o aceite dos Termos não entra nestes casos */' }).catch(() => {}));
    const page = await ctx.newPage();
    await page.clock.setFixedTime(AGORA);
    await page.goto(base + '/__semente');
    await page.evaluate(({ local, ct }) => {
      localStorage.clear(); sessionStorage.clear();
      for (const k of Object.keys(local)) localStorage.setItem(k, local[k]);
      // texto vai cru (o __ct:online é lido sem JSON); o resto, em JSON
      for (const k of Object.keys(ct)) localStorage.setItem('__ct:' + k, typeof ct[k] === 'string' ? ct[k] : JSON.stringify(ct[k]));
    }, { local, ct });
    await page.goto(base + '/Catedra.dc.html');
    await page.waitForFunction(() => !!window.__catedraApp, null, { timeout: 60000 });
    return { ctx, page };
  } catch (e) { await ctx.close().catch(() => {}); throw e; }
}

// Um caso: abre, roda e fecha o contexto mesmo quando algo estoura. A exceção vira UMA falha com
// o nome do caso, e os casos seguintes rodam (antes, um tempo esgotado em (a) levava tudo junto).
async function caso(ok, rotulo, browser, base, opcoes, corpo) {
  let aberto = null;
  try {
    aberto = await abrir(browser, base, opcoes);
    await corpo(aberto.page);
  } catch (e) {
    ok(false, rotulo + ' correu sem exceção (' + String(e && e.message || e).split('\n')[0].slice(0, 240) + ')');
  } finally {
    if (aberto) await aberto.ctx.close().catch(() => {});
  }
}

const nuvem = (data, kts) => ({ data: { data: Object.assign({}, data, { 'catedra:_kts': JSON.stringify(kts) }), updated_at: '2026-11-24T21:00:00.000Z' }, error: null });
const ktsDe = (data, t) => { const m = {}; Object.keys(data).forEach((k) => { m[k] = t; }); return m; };
const carimboDe = (page, k) => page.evaluate((k) => (JSON.parse(localStorage.getItem('catedra:_kts') || '{}'))[k] || 0, k);
const envios = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('__ct:chamadas') || '[]')
  .filter((c) => c.nome === 'upsert' && c.arg && c.arg.data).length);
const ultimoEnvio = (page) => page.evaluate(() => {
  const ups = JSON.parse(localStorage.getItem('__ct:chamadas') || '[]').filter((c) => c.nome === 'upsert' && c.arg && c.arg.data);
  return ups.length ? ups[ups.length - 1].arg.data : null;
});

// Onde a página está, para a mensagem de falha dizer em que passo a hidratação parou.
const estado = (page) => page.evaluate(() => ({
  hidratado: sessionStorage.getItem('catedra:hydrated'), app: !!window.__catedraApp,
  portao: (document.getElementById('catedra-auth-gate') || { style: {} }).style.display,
  chamadas: JSON.parse(localStorage.getItem('__ct:chamadas') || '[]').map((c) => c.nome).join('>'),
})).catch((e) => ({ erro: String(e && e.message || e).split('\n')[0].slice(0, 80) }));

// Espera a hidratação terminar (recarregou e o portão fechou) e, se pedido, o envio pós-reload.
async function esperarHidratadoEEnvio(page, minimo) {
  try {
    await page.waitForFunction(() => sessionStorage.getItem('catedra:hydrated') === '1', null, { timeout: 30000 });
    await page.waitForFunction(() => !!window.__catedraApp && document.getElementById('catedra-auth-gate').style.display === 'none', null, { timeout: 60000 });
  } catch (e) {
    throw new Error('a hidratação não terminou: ' + String(e && e.message || e).split('\n')[0] + ' · estado ' + JSON.stringify(await estado(page)));
  }
  // sem envio no prazo, segue: as asserções exigem o envio e dizem o que veio
  if (minimo) await page.waitForFunction((n) => JSON.parse(localStorage.getItem('__ct:chamadas') || '[]')
    .filter((c) => c.nome === 'upsert' && c.arg && c.arg.data).length >= n, minimo, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);   // o autosave (500 ms) e o envio (700 ms) assentam
}

// A cadeia de envios que a hidratação deixou agendada assenta: nada sujo, selo "salvo" e nenhuma
// chamada nova ao Supabase falso por 1,5 s. O (b) precisa disto antes de trocar a nuvem: na CI do
// PR #265 (job 139612297600) ele terminou ~1 s depois do (a) e leu um envio DESSA cadeia, que saiu
// depois da troca e antes do autosave da escolha. Devolve se assentou no prazo.
async function assentar(page, prazo = 30000) {
  const t0 = Date.now(); let n = -1, desde = Date.now();
  while (Date.now() - t0 < prazo) {
    const s = await page.evaluate(() => ({ sujo: localStorage.getItem('catedra:_dirty'), st: window.CatedraSync && window.CatedraSync.status,
      n: JSON.parse(localStorage.getItem('__ct:chamadas') || '[]').length }));
    if (s.n !== n) { n = s.n; desde = Date.now(); }
    else if (!s.sujo && s.st === 'salvo' && Date.now() - desde >= 1500) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

// O valor é o da nuvem? Objeto: cada campo da pessoa ficou (o app pode juntar padrões que a nuvem
// não tinha). Texto e número: exatamente igual.
function preservou(daNuvem, valor) {
  if (valor == null) return false;
  let a, b; try { a = JSON.parse(daNuvem); b = JSON.parse(valor); } catch (_) { return daNuvem === valor; }
  if (a && typeof a === 'object' && !Array.isArray(a)) return !!b && typeof b === 'object' && Object.keys(a).every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));
  return daNuvem === valor;
}

// Escreve como um satélite: um iframe da mesma origem grava DIRETO no localStorage, sem passar
// pelo setImpl do topo, e o topo recebe o evento 'storage' — é o caminho dos grifos do LEGIS/JURIS.
async function escreverComoSatelite(page, chave, valor) {
  return page.evaluate(async ({ chave, valor }) => {
    const f = document.createElement('iframe');
    f.style.display = 'none';
    await new Promise((r) => { f.onload = r; f.src = '/__semente'; document.body.appendChild(f); });
    const ler = () => (JSON.parse(localStorage.getItem('catedra:_kts') || '{}'))[chave] || 0;
    const antes = ler();
    // Este ouvinte entra DEPOIS do do auth.js (registrado quando ele carregou): quando ele roda, o
    // handler do auth.js já rodou. É a prova de que o evento chegou — sem ela, "não carimbou"
    // passaria também com o evento atrasado sob carga.
    const evento = new Promise((r) => {
      const t = setTimeout(() => r(false), 5000);
      window.addEventListener('storage', function ouvir(e) {
        if (e.key !== chave) return;
        clearTimeout(t); window.removeEventListener('storage', ouvir); r(true);
      });
    });
    f.contentWindow.localStorage.setItem(chave, valor);
    const r = { antes, evento: await evento, chegou: localStorage.getItem(chave) === valor };
    r.depois = ler();
    f.remove();
    return r;
  }, { chave, valor });
}

export async function testarLoginSemDados(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const R = 'LOGIN SEM DADOS [' + motor + '] ';
  const browser = pageDaSuite.context().browser();

  // (a) + (b): aparelho limpo, o formulário de entrada aberto enquanto o app monta atrás dele
  await caso(ok, R + '(a)/(b)', browser, base, { ct: { signIn: U, select: nuvem(NUVEM_A, ktsDe(NUVEM_A, ONTEM)) } }, async (page) => {
    await page.waitForSelector('#catedra-auth-gate #cte', { state: 'visible', timeout: 20000 });
    await page.waitForFunction(() => Object.keys(localStorage).filter((k) => k.indexOf('catedra:') === 0).length >= 20, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1000);   // o autosave (500 ms) assenta
    const antes = await page.evaluate((chaves) => {
      const kts = JSON.parse(localStorage.getItem('catedra:_kts') || '{}');
      return {
        portao: document.getElementById('catedra-auth-gate').style.display,
        formulario: !!document.querySelector('#catedra-auth-gate #cte'),
        gravadas: chaves.filter((k) => localStorage.getItem(k) != null).length,
        padroes: Object.keys(localStorage).filter((k) => k.indexOf('catedra:') === 0).length,
        carimbadas: Object.keys(kts),
      };
    }, Object.keys(NUVEM_A));
    ok(antes.portao !== 'none' && antes.formulario && antes.padroes >= 20,
      R + '(a) com o formulário de entrada na tela, o app já gravou os padrões atrás dele (' + antes.padroes + ' chaves; das 12 da nuvem: ' + antes.gravadas + ')');
    ok(antes.carimbadas.length === 0,
      R + '(a) nenhuma escrita antes de a pessoa chegar ao app ganhou carimbo (' + (antes.carimbadas.slice(0, 6).join(', ') || 'nenhuma') + ')');
    const sat = await escreverComoSatelite(page, 'catedra:__sateliteTeste', '{"antes":1}');
    ok(sat.evento && sat.chegou && sat.depois === 0,
      R + '(a) a escrita de um satélite (evento storage) antes de a pessoa chegar ao app também não carimba (evento=' + sat.evento + ', carimbo=' + sat.depois + ')');

    // entra pelo formulário, como no aparelho limpo de verdade
    const seg = await page.$('#ctseg-login'); if (seg) await seg.click();
    await page.fill('#cte', U.email); await page.fill('#ctp', 'senha-de-teste'); await page.click('#cts');
    await esperarHidratadoEEnvio(page, 1);
    const subiu = await ultimoEnvio(page);
    const r = await page.evaluate((chaves) => {
      const o = {}; chaves.forEach((k) => { o[k] = localStorage.getItem(k); });
      const st = window.__catedraApp.state;
      return { local: o, tela: { banca: st.bancaSel, simTotal: st.sim && st.sim.total, densidade: st.prefs && st.prefs.density } };
    }, Object.keys(NUVEM_A));
    const perdidas = Object.keys(NUVEM_A).filter((k) => !preservou(NUVEM_A[k], subiu && subiu[k]));
    const perdidasAqui = Object.keys(NUVEM_A).filter((k) => !preservou(NUVEM_A[k], r.local[k]));
    ok(!!subiu, R + '(a) depois do login houve envio para a nuvem (o aparelho trouxe chaves que ela não tinha)');
    ok(subiu && perdidas.length === 0,
      R + '(a) o envio leva as 12 configurações da nuvem, não os padrões (sobrescritas: ' + (perdidas.join(', ') || 'nenhuma') + ')');
    ok(perdidasAqui.length === 0,
      R + '(a) o aparelho fica com as configurações da nuvem (trocadas aqui: ' + (perdidasAqui.join(', ') || 'nenhuma') + ')');
    ok(r.tela.banca === 'fgv' && r.tela.simTotal === 120 && r.tela.densidade === 'compacta',
      R + '(a) e a tela as mostra (banca=' + r.tela.banca + ', simulados=' + r.tela.simTotal + ', densidade=' + r.tela.densidade + ')');

    // (b) já no app: outro aparelho mudou a banca hoje de manhã (nuvem MANHA, mais nova que o
    // ONTEM daqui) e a pessoa escolhe outra agora. Sem o carimbo dela, a nuvem venceria o envio.
    // Antes da troca da nuvem, a cadeia pós-hidratação assenta (ver assentar); depois da escolha,
    // espera o envio que a LEVA — não qualquer envio novo: um envio que saísse entre a troca e o
    // autosave (ainda que só desta cadeia) traria a 'fcc' da nuvem, e ler esse seria ler o errado.
    if (!await assentar(page)) console.log(R + '(b) a cadeia pós-hidratação não assentou em 30 s; o caso segue e as asserções dizem o que veio');
    const antesB = await carimboDe(page, 'catedra:bancaSel');
    const enviosAntes = await envios(page);
    await page.evaluate((linha) => { localStorage.setItem('__ct:select', JSON.stringify(linha)); },
      nuvem(Object.assign({}, NUVEM_A, { 'catedra:bancaSel': JSON.stringify('fcc') }), Object.assign(ktsDe(NUVEM_A, ONTEM), { 'catedra:bancaSel': MANHA })));
    await page.evaluate(() => window.__catedraApp.setState({ bancaSel: 'vunesp' }));   // o autosave grava em 500 ms
    await page.waitForFunction((n) => JSON.parse(localStorage.getItem('__ct:chamadas') || '[]')
      .filter((c) => c.nome === 'upsert' && c.arg && c.arg.data).slice(n).some((c) => c.arg.data['catedra:bancaSel'] === '"vunesp"'),
      enviosAntes, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);
    const b = await page.evaluate(() => ({
      carimbo: (JSON.parse(localStorage.getItem('catedra:_kts') || '{}'))['catedra:bancaSel'] || 0,
      local: localStorage.getItem('catedra:bancaSel'),
      subiu: JSON.parse(localStorage.getItem('__ct:chamadas') || '[]').filter((c) => c.nome === 'upsert' && c.arg && c.arg.data).map((c) => c.arg.data['catedra:bancaSel']).pop(),
    }));
    ok(antesB === ONTEM && b.carimbo === T,
      R + '(b) já no app, a escolha da pessoa carimba com a hora (antes=' + antesB + ', depois=' + b.carimbo + ', esperado ' + ONTEM + ' → ' + T + ')');
    ok(b.subiu === '"vunesp"' && b.local === '"vunesp"',
      R + '(b) e vence a nuvem que outro aparelho mudou hoje de manhã (enviada=' + b.subiu + ', aqui=' + b.local + ')');
    const sat2 = await escreverComoSatelite(page, 'catedra:__sateliteTeste2', '{"depois":1}');
    ok(sat2.evento && sat2.chegou && sat2.antes === 0 && sat2.depois === T,
      R + '(b) com a pessoa no app, a escrita do satélite (evento storage) carimba (evento=' + sat2.evento + ', antes=' + sat2.antes + ', depois=' + sat2.depois + ')');
  });

  // (c) segundo aparelho do dia, ao abrir: dados de ontem aqui, a nuvem com os hábitos de hoje
  {
    const habOntem = JSON.stringify({ sono: 6, agua: 1, exercicio: 0, pausas: 0, alongar: 0, sol: 0, _date: ONTEM_TXT });
    const habHoje = { sono: 7, agua: 3, exercicio: 1, pausas: 2, alongar: 0, sol: 1, _date: HOJE };
    const daNuvem = { 'catedra:habitos': JSON.stringify(habHoje), 'catedra:onboarded': '1' };
    await caso(ok, R + '(c)', browser, base, {
      local: {
        'catedra:_owner': U.id, 'catedra:auth': '1', 'catedra:onboarded': '1', 'catedra:habitos': habOntem,
        'catedra:_kts': JSON.stringify({ 'catedra:habitos': ONTEM, 'catedra:onboarded': ONTEM }),
      },
      ct: { sessao: U, selectPendente: true, select: nuvem(daNuvem, { 'catedra:habitos': MANHA, 'catedra:onboarded': ONTEM }) },
    }, async (page) => {
      // com a leitura da nuvem presa, o app monta atrás do portão e a reconciliação do dia zera
      // os hábitos de ontem — é a escrita que, carimbada, vencia a nuvem
      const zerou = await page.waitForFunction((hoje) => {
        try { const h = JSON.parse(localStorage.getItem('catedra:habitos') || 'null'); return !!h && h._date === hoje && h.sono === 0 && sessionStorage.getItem('catedra:hydrated') !== '1'; }
        catch (_) { return false; }
      }, HOJE, { timeout: 30000 }).then(() => true, () => false);
      const p = await page.evaluate(() => ({
        portao: document.getElementById('catedra-auth-gate').style.display,
        presas: (window.__ctSelectsPresos || []).length,
        carimbo: (JSON.parse(localStorage.getItem('catedra:_kts') || '{}'))['catedra:habitos'] || 0,
      }));
      ok(zerou && p.portao !== 'none' && p.presas >= 1,
        R + '(c) pré-condição: com a leitura da nuvem presa, a reconciliação do dia zerou os hábitos atrás do portão (zerou=' + zerou + ', portão=' + p.portao + ', leituras presas=' + p.presas + ')');
      ok(p.carimbo === ONTEM,
        R + '(c) a reconciliação do dia, escrita do app, não ganhou carimbo (carimbo=' + p.carimbo + ', esperado ' + ONTEM + ')');
      await page.evaluate(() => { localStorage.removeItem('__ct:selectPendente'); window.__ctResolverSelect(); });
      await esperarHidratadoEEnvio(page, 1);
      const r = await page.evaluate(() => {
        const ups = JSON.parse(localStorage.getItem('__ct:chamadas') || '[]').filter((c) => c.nome === 'upsert' && c.arg && c.arg.data);
        let h = null; try { h = JSON.parse(localStorage.getItem('catedra:habitos')); } catch (_) {}
        let enviado = null; try { enviado = JSON.parse(ups.length ? ups[ups.length - 1].arg.data['catedra:habitos'] : 'null'); } catch (_) {}
        return { h, enviado, tela: window.__catedraApp.state.habitos };
      });
      ok(r.h && r.h.sono === 7 && r.h.agua === 3 && r.h._date === HOJE,
        R + '(c) o segundo aparelho do dia fica com os hábitos de hoje da nuvem (sono=' + (r.h && r.h.sono) + ', água=' + (r.h && r.h.agua) + ', dia=' + (r.h && r.h._date) + ')');
      ok(!!r.enviado && r.enviado.sono === 7 && r.enviado._date === HOJE,
        R + '(c) e o envio leva os hábitos de hoje, não os zerados (enviado=' + JSON.stringify(r.enviado) + ')');
      ok(r.tela && r.tela.sono === 7, R + '(c) a tela mostra os hábitos de hoje (sono=' + (r.tela && r.tela.sono) + ')');
    });
  }

  // (d) aberto sem hidratar (a leitura da nuvem falhou): estudar sem nuvem carimba como sempre
  await caso(ok, R + '(d)', browser, base, {
    local: {
      'catedra:_owner': U.id, 'catedra:auth': '1', 'catedra:onboarded': '1', 'catedra:bancaSel': JSON.stringify('fgv'),
      'catedra:_kts': JSON.stringify({ 'catedra:bancaSel': ONTEM, 'catedra:onboarded': ONTEM }),
    },
    ct: { sessao: U, select: FALHA },
  }, async (page) => {
    await page.waitForFunction(() => document.getElementById('catedra-auth-gate').style.display === 'none', null, { timeout: 30000 });
    await page.waitForTimeout(800);
    const antes = await carimboDe(page, 'catedra:bancaSel');
    await page.evaluate(() => window.__catedraApp.setState({ bancaSel: 'cebraspe' }));   // o autosave grava em 500 ms
    await page.waitForFunction(() => localStorage.getItem('catedra:bancaSel') === '"cebraspe"', null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => ({
      hidratou: sessionStorage.getItem('catedra:hydrated'),
      valor: localStorage.getItem('catedra:bancaSel'),
      carimbo: (JSON.parse(localStorage.getItem('catedra:_kts') || '{}'))['catedra:bancaSel'] || 0,
      sujo: localStorage.getItem('catedra:_dirty'),
    }));
    ok(r.hidratou !== '1', R + '(d) a leitura falhou e o app abriu sem hidratar (hydrated=' + r.hidratou + ')');
    ok(r.valor === '"cebraspe"' && antes === ONTEM && r.carimbo === T,
      R + '(d) a escrita da pessoa, estudando sem nuvem, carimba com a hora (valor=' + r.valor + ', antes=' + antes + ', depois=' + r.carimbo + ')');
    ok(r.sujo === '1', R + '(d) e fica marcada para subir quando a rede voltar (_dirty=' + r.sujo + ')');
  });

  // (e) sessão pendente retomada: a pessoa edita offline e, antes de o autosave gravar, a rede
  // volta e o supabase-js renova o token — o portão reabre com o app vivo (retomarSessao)
  await caso(ok, R + '(e)', browser, base, {
    local: {
      'catedra:_owner': U.id, 'catedra:auth': '1', 'catedra:onboarded': '1', 'catedra:bancaSel': JSON.stringify('fgv'),
      'catedra:_kts': JSON.stringify({ 'catedra:bancaSel': ONTEM, 'catedra:onboarded': ONTEM }),
    },
    ct: {
      sessao: U, online: '0', sessaoErro: REDE_CAIU, selectPendente: true,
      select: nuvem({ 'catedra:bancaSel': JSON.stringify('fgv'), 'catedra:onboarded': '1' }, { 'catedra:bancaSel': ONTEM, 'catedra:onboarded': ONTEM }),
    },
  }, async (page) => {
    const offline = await page.waitForFunction(() => !!window.CatedraSync && window.CatedraSync.status === 'offline'
      && document.getElementById('catedra-auth-gate').style.display === 'none', null, { timeout: 30000 }).then(() => true, () => false);
    ok(offline, R + '(e) abriu offline com a sessão pendente e o portão fechado');
    await page.evaluate((s) => {
      // amostra o portão e a banca a cada 20 ms: uma amostra com o portão aberto e a banca AINDA
      // velha prova que a gravação veio depois da reabertura (ler o portão só depois não provaria)
      window.__amostras = [];
      window.__amostrador = setInterval(() => { window.__amostras.push({
        portao: document.getElementById('catedra-auth-gate').style.display, banca: localStorage.getItem('catedra:bancaSel') }); }, 20);
      window.__catedraApp.setState({ bancaSel: 'vunesp' });   // a edição; o autosave grava em 500 ms
      localStorage.removeItem('__ct:sessaoErro'); localStorage.setItem('__ct:online', '1');
      window.__ctAuthCb('TOKEN_REFRESHED', s);                 // retomarSessao → onLogin → "Carregando seus dados…"
    }, SESSAO);
    await page.waitForFunction(() => localStorage.getItem('catedra:bancaSel') === '"vunesp"', null, { timeout: 10000 }).catch(() => {});
    const w = await page.evaluate(() => {
      clearInterval(window.__amostrador);
      return {
        valor: localStorage.getItem('catedra:bancaSel'),
        abriuAntes: window.__amostras.some((a) => a.portao !== 'none' && a.banca === '"fgv"'),
        presas: (window.__ctSelectsPresos || []).length,
        carimbo: (JSON.parse(localStorage.getItem('catedra:_kts') || '{}'))['catedra:bancaSel'] || 0,
      };
    });
    ok(w.valor === '"vunesp"' && w.abriuAntes && w.presas >= 1,
      R + '(e) pré-condição: o portão reabriu ANTES de o autosave gravar a edição, com a leitura da nuvem presa (valor=' + w.valor + ', abriu antes=' + w.abriuAntes + ', presas=' + w.presas + ')');
    ok(w.carimbo === T,
      R + '(e) a edição feita antes da reabertura carimba com a hora (carimbo=' + w.carimbo + ', esperado ' + T + ')');
    await page.evaluate(() => { localStorage.removeItem('__ct:selectPendente'); window.__ctResolverSelect(); });
    await esperarHidratadoEEnvio(page, 1);
    const r = await page.evaluate(() => ({
      local: localStorage.getItem('catedra:bancaSel'),
      subiu: JSON.parse(localStorage.getItem('__ct:chamadas') || '[]').filter((c) => c.nome === 'upsert' && c.arg && c.arg.data).map((c) => c.arg.data['catedra:bancaSel']).pop(),
    }));
    ok(r.local === '"vunesp"' && r.subiu === '"vunesp"',
      R + '(e) e vence a nuvem na hidratação: a edição fica e sobe (aqui=' + r.local + ', enviada=' + r.subiu + ')');
  });
}
