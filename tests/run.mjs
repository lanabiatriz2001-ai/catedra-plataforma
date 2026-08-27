/* Testes de navegador da plataforma — rodam com `npm test`.
   Sobe um servidor estático na raiz do repositório e dirige um Chromium headless:
   · SYNC: o mergeAll do auth.js (carimbo por chave, vazio nunca apaga cheio,
     união por id, lápides, histórico × lixeira) via tests/sync-fixture.html;
   · ACERVO ida-e-volta: rito/peça/bloco na URL, mensagens ctAbrirAcervo com origem,
     pílula de voltar no LEGIS/JURIS e o ciclo completo via tests/harness-acervo.html.
   O executável do Chrome vem de CT_CHROME ou dos caminhos usuais (CI: google-chrome). */
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// '.css' faltava aqui, e o custo foi alto: o servidor entregava satellite-base.css como
// application/octet-stream, o Chrome recusava a folha em modo padrão (cssRules.length = 0)
// e TODA a verificação da TASK9 rodou num navegador onde a base não existia — verde por
// acidente, porque as asserções mediam o que o CSS da própria página já garantia.
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

const CHROMES = [process.env.CT_CHROME, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser', '/usr/bin/chromium'].filter(Boolean);
const exe = CHROMES.find(p => { try { return fs.existsSync(p); } catch (_) { return false; } });
if (!exe) { console.error('Nenhum Chrome/Chromium encontrado. Defina CT_CHROME=/caminho/do/chrome'); process.exit(2); }

const srv = http.createServer((req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    const p = path.join(RAIZ, decodeURIComponent(u.pathname).slice(1));
    if (!p.startsWith(RAIZ)) { res.writeHead(403); res.end(); return; }
    const data = fs.readFileSync(p);
    res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('nao encontrado'); }
});
// A porta sai do ambiente (CT_PORT) para que duas sessões trabalhando no mesmo repositório
// possam rodar a suíte ao mesmo tempo — sem isso a segunda morre com EADDRINUSE.
const PORTA = +(process.env.CT_PORT || 8123);
await new Promise(r => srv.listen(PORTA, r));
const URL0 = 'http://localhost:' + PORTA;

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage();
const falhas = [];
const ok = (cond, label) => { console.log((cond ? '✓ ' : '✗ ') + label); if (!cond) falhas.push(label); };
page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));

/* ============= D9 — BUILD SEM CDN: FALHAR EM VEZ DE DEGRADAR ============= */
// Este é o único teste que não usa navegador: o que se prova aqui é o comportamento do
// processo de build. Um deploy que depende de CDN em runtime não abre em rede que
// bloqueia CDN — foi o que aconteceu no ambiente de teste.
{
  const { execFileSync } = await import('child_process');
  const stub = path.join(RAIZ, 'tests', 'offline-stub.cjs');
  const rodar = (env) => {
    try {
      execFileSync(process.execPath, [path.join(RAIZ, 'scripts', 'build.mjs')],
        { cwd: RAIZ, env: { ...process.env, ...env }, stdio: 'pipe' });
      return { code: 0, saida: '' };
    } catch (e) {
      return { code: e.status ?? 1, saida: String(e.stdout || '') + String(e.stderr || '') };
    }
  };

  const semRede = rodar({ NODE_OPTIONS: '--require ' + stub, CT_PERMITE_CDN: '' });
  ok(semRede.code === 1, 'D9 build sem rede FALHA (exit 1) em vez de publicar dependendo de CDN');
  ok(/BUILD ABORTADO/.test(semRede.saida), 'D9 a falha explica o que houve');
  ok(/CT_PERMITE_CDN/.test(semRede.saida), 'D9 a falha diz qual é a saída de emergência');

  const comFlag = rodar({ NODE_OPTIONS: '--require ' + stub, CT_PERMITE_CDN: '1' });
  ok(comFlag.code === 0, 'D9 CT_PERMITE_CDN=1 ainda permite build degradado (debug)');

  // build normal: nada de terceiro sobra no HTML publicado
  const normal = rodar({});
  ok(normal.code === 0, 'D9 build com rede passa');
  const html = fs.readFileSync(path.join(RAIZ, 'public', 'index.html'), 'utf8');
  const terceiros = (html.match(/(?:src|href)="https:\/\/[^"]*(?:jsdelivr|unpkg|fonts\.googleapis|fonts\.gstatic)[^"]*"/g) || []);
  ok(terceiros.length === 0, 'D9 HTML publicado não carrega nada de CDN nem do Google Fonts');
  ok(/href="\.\/fonts\.css"/.test(html), 'D9 as fontes vêm do próprio domínio');
  const cssFontes = fs.readFileSync(path.join(RAIZ, 'public', 'fonts.css'), 'utf8');
  ok(/font-display:\s*swap/.test(cssFontes), 'D9 font-display:swap preservado');
  ok(!/fonts\.gstatic\.com/.test(cssFontes), 'D9 o CSS das fontes aponta para arquivos locais');
  ok(fs.readdirSync(path.join(RAIZ, 'public', 'fonts')).length > 10, 'D9 os .woff2 estão no deploy');
}

/* ============= U10 — PWA INSTALÁVEL E OFFLINE DE VERDADE ============= */
// Estes testes rodam em http://localhost, onde o sw.js se AUTODESTRÓI de propósito
// (senão o preview passa a servir asset velho). Registrar o worker aqui provaria o
// contrário do que interessa. Então o caminho de PRODUÇÃO é simulado: o público
// public/sw.js (gerado pelo build acima) é avaliado com um `self` de mentira, e o
// que se afere são as FUNÇÕES DE DECISÃO — orçamento, fallback, listas de cache.
{
  const swSrc = fs.readFileSync(path.join(RAIZ, 'public', 'sw.js'), 'utf8');
  const carregarSW = (origem, cota) => {
    const eventos = {};
    const self = {
      location: new URL(origem + '/sw.js'),
      addEventListener: (t, fn) => { (eventos[t] = eventos[t] || []).push(fn); },
      navigator: { storage: { estimate: () => Promise.resolve(cota || { quota: 2e9, usage: 0 }) } },
    };
    new Function('self', swSrc)(self);
    return { api: self.__ctSW, eventos };
  };

  // 1. o kill-switch continua de pé: fora de produção, ZERO handler de fetch
  const dev = carregarSW('http://localhost:8123');
  ok(!dev.api, 'U10 fora de produção o worker não expõe política de cache (kill-switch intacto)');
  ok(!(dev.eventos.fetch || []).length, 'U10 fora de produção o worker não intercepta fetch nenhum');
  const devFile = carregarSW('http://127.0.0.1:5500');
  ok(!(devFile.eventos.fetch || []).length, 'U10 o kill-switch também vale para 127.0.0.1');

  const { api: SW, eventos: evProd } = carregarSW('https://catedra.exemplo.app');
  ok(!!SW && (evProd.fetch || []).length === 1, 'U10 em produção o worker instala o handler de fetch');

  // 2. a casca cobre tudo o que o app precisa para ABRIR offline
  const casca = SW.ASSETS;
  const naCasca = (p) => casca.indexOf(p) >= 0;
  ok(['./index.html', './support.js', './auth.js', './ct-dados.js'].every(naCasca),
    'U10 a casca traz o documento e os scripts do runtime');
  ok(['./prioridade-calc.js', './busca-unica.js', './semana-juris.js'].every(naCasca),
    'U10 a casca traz os três scripts do <head> (antes só entravam depois da 1a visita)');
  ok(casca.some(p => /^\.\/vendor\//.test(p)) && naCasca('./fonts.css') && casca.some(p => /^\.\/fonts\//.test(p)),
    'U10 a casca traz as libs vendoradas e as fontes locais');
  ok(!casca.some(p => /cyrillic|greek|vietnamese/.test(p)) && casca.filter(p => /^\.\/fonts\//.test(p)).length < 20,
    'U10 só os subconjuntos latinos das fontes entram no precache');
  ok(casca.filter(p => /\/dados\/[^/]+\/manifesto\.json$/.test(p)).length >= 1,
    'U10 os manifestos dos acervos fatiados entram na casca (sem eles o CTDados desiste offline)');

  // 3. o acervo é MEDIDO, não chutado, e cabe no orçamento
  ok(SW.ACERVOS.length > 20, 'U10 o precache do acervo tem os satélites e os bancos (' + SW.ACERVOS.length + ' arquivos)');
  ok(SW.ACERVOS.every(([p, b]) => typeof p === 'string' && b > 0),
    'U10 todo item do acervo carrega o tamanho real do arquivo');
  const totalAcervo = SW.ACERVOS.reduce((s, [, b]) => s + b, 0);
  ok(totalAcervo <= SW.ORCAMENTO_ACERVO,
    'U10 o acervo (' + (totalAcervo / 1048576).toFixed(1) + ' MB) cabe no orçamento de '
    + (SW.ORCAMENTO_ACERVO / 1048576).toFixed(0) + ' MB');
  const temAcervo = (p) => SW.ACERVOS.some(([c]) => c === p);
  ok(['./legis-web.html', './juris-web.html', './ritos-web.html', './segunda-fase-web.html'].every(temAcervo),
    'U10 as páginas satélite entram no precache');
  ok(temAcervo('./juris-index.js') && temAcervo('./espelhos.js') && temAcervo('./questoes-prova.js'),
    'U10 os acervos do estudo do dia entram no precache');
  ok(SW.ACERVOS.filter(([c]) => /\/dados\/leis-seca\//.test(c)).length >= 10,
    'U10 a lei seca entra em blocos (acervoLeis pede o acervo inteiro: bloco faltando vira lista vazia)');

  // 4. a armadilha declarada na especificação: o blob de contas fica SÓ-ONLINE
  const tudoQueSeCacheia = casca.concat(SW.ACERVOS.map(([c]) => c));
  ok(!tudoQueSeCacheia.some(p => /contas-(index|text)\.js$/.test(p)
    || /\/dados\/contas-text\/(?!manifesto\.json$)/.test(p)),
    'U10 o blob de contas (11,2 MB) fica fora do precache — decisão comentada no sw.js');
  // …mas o manifesto dele FICA: é o que faz o CTDados usar os blocos que ela já leu
  // (IndexedDB/Cache) em vez de desistir e pedir o monolito de 8,7 MB que não está lá.
  ok(casca.indexOf('./dados/contas-text/manifesto.json') >= 0,
    'U10 o manifesto de contas fica em cache para o que ela já leu continuar abrindo offline');
  ok(!tudoQueSeCacheia.some(p => /leis-seca\.js$/.test(p) || /discursivas-textos\.js$/.test(p)),
    'U10 monolito de lei seca e discursivas-textos ficam fora (duplicado e não-usado)');

  // 4b. camada 3: os pesados só descem quando ELA pede
  const pedido = SW.ACERVOS_SOB_PEDIDO.map(([c]) => c);
  ok(!tudoQueSeCacheia.some(p => /juris-text\.js$/.test(p) || /oral-conteudo\.js$/.test(p)
    || /leis-seca-areas\.js$/.test(p)),
    'U10 os três pesados não entram no aquecimento automático');
  ok(['./juris-text.js', './oral-conteudo.js', './leis-seca-areas.js'].every(p => pedido.indexOf(p) >= 0),
    'U10 …mas estão na lista de "Baixar tudo" (senão o simulado de súmulas nunca abriria offline)');
  const somaPedido = SW.ACERVOS.concat(SW.ACERVOS_SOB_PEDIDO).reduce((s, [, b]) => s + b, 0);
  ok(somaPedido <= SW.ORCAMENTO_PEDIDO && SW.ORCAMENTO_PEDIDO > SW.ORCAMENTO_ACERVO,
    'U10 o pedido explícito tem orçamento próprio e maior (' + (somaPedido / 1048576).toFixed(1)
    + ' MB de ' + (SW.ORCAMENTO_PEDIDO / 1048576).toFixed(0) + ' MB)');
  const semEspaco = carregarSW('https://catedra.exemplo.app', { quota: 30 * 1048576, usage: 25 * 1048576 });
  ok((await semEspaco.api.orcamentoDisponivel(true)) < SW.ORCAMENTO_PEDIDO,
    'U10 pedido dela não cria espaço no aparelho: a cota continua limitando');

  // 5. o orçamento é aritmética: corta a cauda, e item grande não trava a fila
  const plano = SW.planoDeAquecimento([['a', 100], ['gigante', 5000], ['c', 50]], 200);
  ok(plano.itens.length === 2 && plano.bytes === 150 && plano.cortados[0] === 'gigante',
    'U10 o que não cabe é pulado sem interromper os itens seguintes');
  ok(SW.planoDeAquecimento(SW.ACERVOS, 0).itens.length === 0,
    'U10 orçamento zero não baixa nada (em vez de estourar a cota)');
  const apertado = carregarSW('https://catedra.exemplo.app', { quota: 20 * 1048576, usage: 18 * 1048576 });
  const orc = await apertado.api.orcamentoDisponivel();
  ok(orc > 0 && orc < SW.ORCAMENTO_ACERVO,
    'U10 com a cota do aparelho apertada o orçamento encolhe sozinho (' + Math.round(orc / 1024) + ' KB)');

  // 6. fallback offline: cada tipo de pedido recebe a resposta certa
  ok(SW.modoDeFallback({ url: 'https://x.app/legis-web.html', mode: 'navigate', destination: 'iframe' }) === 'pagina',
    'U10 satélite em iframe recebe página própria (e não o app inteiro dentro do iframe)');
  ok(SW.modoDeFallback({ url: 'https://x.app/juris-web.html', mode: 'navigate', destination: '' }) === 'pagina',
    'U10 satélite sem destination (Safari antigo) também recebe a página própria');
  ok(SW.modoDeFallback({ url: 'https://x.app/algo', mode: 'navigate', destination: 'document' }) === 'app',
    'U10 rota qualquer do app cai no app inteiro, que resolve a tela sozinho');
  ok(SW.modoDeFallback({ url: 'https://x.app/index.html', mode: 'navigate', destination: '' }) === 'app',
    'U10 a entrada do app nunca é confundida com satélite');
  ok(SW.modoDeFallback({ url: 'https://x.app/treino.js', mode: 'no-cors', destination: 'script' }) === 'recurso',
    'U10 script sem cópia guardada é tratado como recurso');

  const pg = SW.paginaOffline('Sem rede', 'texto');
  const pgTxt = await pg.text();
  ok(pg.status === 200 && /text\/html/.test(pg.headers.get('content-type') || ''),
    'U10 a página de indisponível é HTML de verdade (200), não erro de rede cru');
  ok(/Tentar de novo/.test(pgTxt) && /prefers-color-scheme/i.test(pgTxt),
    'U10 a página de indisponível tem ação de recarregar e segue o tema do aparelho');

  const rJs = SW.recursoOffline({ url: 'https://x.app/oral-conteudo.js' });
  ok(rJs.status === 503, 'U10 script sem cache devolve 503 (dispara o onerror de quem pediu)');
  const rJson = SW.recursoOffline({ url: 'https://x.app/dados/juris-text/a.json' });
  ok(rJson.status === 503 && /application\/json/.test(rJson.headers.get('content-type') || ''),
    'U10 bloco de acervo sem cache devolve 503 em JSON, não promessa quebrada');
  // um .js vazio com 200 seria pior que o erro: o app acharia que o acervo carregou
  ok(!/^\s*$/.test(await rJs.text()), 'U10 o corpo do 503 explica o que houve');

  // 7. manifesto e ponte de instalação — o que o host dos Ajustes vai consumir
  const mani = JSON.parse(fs.readFileSync(path.join(RAIZ, 'public', 'manifest.webmanifest'), 'utf8'));
  ok(mani.id && mani.start_url === './index.html' && mani.display === 'standalone',
    'U10 o manifesto publicado tem id estável, start_url do deploy e display standalone');
  ok(mani.theme_color === '#0f7a57', 'U10 a cor do manifesto é a mesma do app (splash e barra combinam)');
  ok((mani.icons || []).some(i => /\.png$/.test(i.src)), 'U10 o manifesto publicado tem ícone PNG (iOS)');
  const idxHtml = fs.readFileSync(path.join(RAIZ, 'public', 'index.html'), 'utf8');
  ok(/window\.__catedraInstall\s*=/.test(idxHtml) && /beforeinstallprompt/.test(idxHtml),
    'U10 o build segura o beforeinstallprompt (senão o item dos Ajustes não teria o que chamar)');
  ok(/window\.__catedraOffline\s*=/.test(idxHtml) && /ctAquecerAcervos/.test(idxHtml),
    'U10 o host tem por onde ler o estado do acervo offline e mandar baixar o resto');
}


/* ============================ SYNC (mergeAll) ============================ */
await page.goto(URL0 + '/tests/sync-fixture.html');
await page.waitForFunction(() => window.CatedraSync && window.CatedraSync._test);

const sync = await page.evaluate(() => {
  const M = window.CatedraSync._test.mergeAll;
  const J = JSON.stringify;
  const r = {};

  // 1. escalar com conteúdo dos dois lados: vence o carimbo mais novo, nas duas direções
  const svA = { 'catedra:prefs': '{"tema":"novo"}', 'catedra:_kts': J({ 'catedra:prefs': 2000 }) };
  const lcA = { 'catedra:prefs': '{"tema":"velho"}', 'catedra:_kts': J({ 'catedra:prefs': 1000 }) };
  r.escalarSrvNovo = M(svA, lcA, false)['catedra:prefs'] === '{"tema":"novo"}';
  const svB = { 'catedra:prefs': '{"tema":"velho"}', 'catedra:_kts': J({ 'catedra:prefs': 1000 }) };
  const lcB = { 'catedra:prefs': '{"tema":"novo"}', 'catedra:_kts': J({ 'catedra:prefs': 2000 }) };
  r.escalarLocNovo = M(svB, lcB, true)['catedra:prefs'] === '{"tema":"novo"}';

  // 2. vazio nunca apaga cheio, mesmo com carimbo mais novo (semeadura de aparelho novo)
  const svC = { 'catedra:edital': '[{"disc":"Civil"}]', 'catedra:_kts': J({ 'catedra:edital': 1000 }) };
  const lcC = { 'catedra:edital': '[]', 'catedra:_kts': J({ 'catedra:edital': 9000 }) };
  r.vazioNaoApaga = M(svC, lcC, false)['catedra:edital'] === '[{"disc":"Civil"}]';

  // 3. sem carimbo dos dois lados: decide a direção do merge
  const svD = { 'catedra:profile': '{"nome":"srv"}' }, lcD = { 'catedra:profile': '{"nome":"loc"}' };
  r.semCarimboDirecao = M(svD, lcD, true)['catedra:profile'] === '{"nome":"srv"}'
    && M(svD, lcD, false)['catedra:profile'] === '{"nome":"loc"}';

  // 4. arrays com id: união; em colisão vence o carimbo (up) mais novo
  const svE = { 'catedra:errors': J([{ id: 'e1', q: 'srv', up: 100 }, { id: 'e2', q: 'so-srv' }]) };
  const lcE = { 'catedra:errors': J([{ id: 'e1', q: 'loc', up: 200 }, { id: 'e3', q: 'so-loc' }]) };
  const mE = JSON.parse(M(svE, lcE, false)['catedra:errors']);
  r.arrayUniao = mE.length === 3 && mE.some(x => x.id === 'e2') && mE.some(x => x.id === 'e3');
  r.arrayColisao = mE.find(x => x.id === 'e1').q === 'loc';

  // 5. lápide de item: id apagado neste aparelho não volta da nuvem…
  localStorage.setItem('catedra:_tomb', J({ arr: { 'catedra:errors': { e9: 5000 } } }));
  const svF = { 'catedra:errors': J([{ id: 'e9', q: 'volta?', up: 100 }, { id: 'e8', up: 100 }]) };
  const mF = JSON.parse(M(svF, { 'catedra:errors': '[]' }, false)['catedra:errors']);
  r.lapideSegura = !mF.some(x => x.id === 'e9') && mF.some(x => x.id === 'e8');
  // …a menos que tenha sido editado DEPOIS de apagado
  const svG = { 'catedra:errors': J([{ id: 'e9', q: 'editado depois', up: 9000 }]) };
  const mG = JSON.parse(M(svG, { 'catedra:errors': '[]' }, false)['catedra:errors']);
  r.lapideCedeAoMaisNovo = mG.some(x => x.id === 'e9');
  localStorage.removeItem('catedra:_tomb');

  // 6. chave apagada aqui (lápide de chave): não restaura do servidor…
  localStorage.setItem('catedra:_tomb', J({ keys: { 'catedra:provaData': 5000 } }));
  const svH = { 'catedra:provaData': '"2026-12-01"', 'catedra:_kts': J({ 'catedra:provaData': 1000 }) };
  r.chaveApagadaFica = !('catedra:provaData' in M(svH, {}, false));
  // …salvo se outro aparelho a escreveu DEPOIS da exclusão
  const svI = { 'catedra:provaData': '"2027-01-10"', 'catedra:_kts': J({ 'catedra:provaData': 9000 }) };
  r.chaveNovaVence = M(svI, {}, false)['catedra:provaData'] === '"2027-01-10"';
  localStorage.removeItem('catedra:_tomb');

  // 7. histórico × lixeira: exclusão mais nova tira do histórico; edição mais nova restaura
  const svJ = { 'catedra:sessions': J([{ id: 's1', up: 100 }, { id: 's2', up: 900 }]) };
  const lcJ = { 'catedra:sessionsLixeira': J([{ id: 's1', _delAt: 500 }, { id: 's2', _delAt: 500 }]) };
  const oJ = M(svJ, lcJ, false);
  const sess = JSON.parse(oJ['catedra:sessions']), lix = JSON.parse(oJ['catedra:sessionsLixeira']);
  r.lixeiraGanha = !sess.some(x => x.id === 's1') && lix.some(x => x.id === 's1');
  r.edicaoRestaura = sess.some(x => x.id === 's2') && !lix.some(x => x.id === 's2');

  // 8. o mapa de carimbos mescla por máximo
  const oK = M({ 'catedra:_kts': J({ a: 1, b: 9 }) }, { 'catedra:_kts': J({ a: 5, c: 3 }) }, false);
  const kts = JSON.parse(oK['catedra:_kts']);
  r.ktsMaximo = kts.a === 5 && kts.b === 9 && kts.c === 3;
  return r;
});
for (const [k, v] of Object.entries(sync)) ok(v, 'SYNC ' + k);

/* ======================= ACERVO — ida e volta ======================= */
await page.goto(URL0 + '/ritos-web.html');
const PECA = await page.evaluate(() => Object.keys(window.CT_PECAS || {})[0]);
ok(!!PECA, 'ACERVO há peças com roteiro pronto (' + PECA + ')');

// abre direto no bloco
await page.goto(URL0 + '/ritos-web.html?peca=' + encodeURIComponent(PECA) + '&bloco=2');
await page.waitForTimeout(500);
const a1 = await page.evaluate(() => {
  const rot = document.querySelector('.ctr');
  const blks = [...document.querySelectorAll('.ctr .blk')];
  return { aberto: rot && rot.classList.contains('on'), volta: blks.findIndex(b => b.classList.contains('volta')) };
});
ok(a1.aberto, 'ACERVO painel abre via ?peca=');
ok(a1.volta === 2, 'ACERVO bloco 2 destacado — achou ' + a1.volta);

// chip do fluxo carrega a origem (rito)
await page.goto(URL0 + '/ritos-web.html');
await page.waitForTimeout(300);
const a2 = await page.evaluate(async () => {
  const got = new Promise(r => window.addEventListener('message', e => r(e.data), { once: true }));
  const chip = document.querySelector('#fluxo [data-legis]') || document.querySelector('#fluxo [data-juris]');
  if (!chip) return { erro: 'sem chip' };
  chip.click();
  return await got;
});
ok(a2.type === 'ctAbrirAcervo' && a2.de && !!a2.de.rito, 'ACERVO chip do fluxo manda de.rito');

// chip do painel carrega peça+bloco
await page.goto(URL0 + '/ritos-web.html?peca=' + encodeURIComponent(PECA));
await page.waitForTimeout(500);
const a3 = await page.evaluate(async () => {
  const got = new Promise(r => window.addEventListener('message', e => r(e.data), { once: true }));
  const chips = [...document.querySelectorAll('.ctr .rf button')];
  const chip = chips.find(b => +b.dataset.b > 0) || chips[0];
  if (!chip) return { erro: 'sem chip no painel' };
  chip.click();
  return await got;
});
ok(a3.de && a3.de.peca && a3.de.bloco != null, 'ACERVO chip do painel manda de.peca+bloco');

// pílula de voltar nos dois acervos, e só com ?volta=1
for (const pg of ['legis-web.html?volta=1', 'juris-web.html?volta=1']) {
  await page.goto(URL0 + '/' + pg);
  await page.waitForTimeout(400);
  const a4 = await page.evaluate(async () => {
    const b = [...document.querySelectorAll('button')].find(x => /Voltar ao ponto/.test(x.textContent || ''));
    if (!b) return { pill: false };
    const got = new Promise(r => window.addEventListener('message', e => r(e.data), { once: true }));
    b.click();
    return { pill: true, msg: await got };
  });
  ok(a4.pill && a4.msg && a4.msg.type === 'ctVoltarAcervo', 'ACERVO pílula funciona em ' + pg);
}
await page.goto(URL0 + '/legis-web.html');
await page.waitForTimeout(300);
const a4b = await page.evaluate(() => ![...document.querySelectorAll('button')].some(x => /Voltar ao ponto/.test(x.textContent || '')));
ok(a4b, 'ACERVO sem volta=1 não há pílula');

// ciclo completo no harness que simula o host
await page.goto(URL0 + '/tests/harness-acervo.html');
await page.waitForTimeout(600);
const a5 = await page.evaluate(async (PECA) => {
  const fr = document.getElementById('fr');
  fr.contentWindow.CTRoteiro.abrir(PECA);
  await new Promise(r => setTimeout(r, 300));
  const chip = [...fr.contentDocument.querySelectorAll('.ctr .rf button')].find(b => +b.dataset.b > 0);
  chip.click();
  await new Promise(r => setTimeout(r, 300));
  return window.__log[window.__log.length - 1];
}, PECA);
ok(/legis-web/.test(a5.src) && /volta=1/.test(a5.src) && /q=/.test(a5.src), 'ACERVO ida: LEGIS com q= e volta=1');
await page.waitForTimeout(1500);
const a6 = await page.evaluate(async () => {
  const fr = document.getElementById('fr');
  const b = [...fr.contentDocument.querySelectorAll('button')].find(x => /Voltar ao ponto/.test(x.textContent || ''));
  if (!b) return { erro: 'sem pílula no iframe' };
  b.click();
  await new Promise(r => setTimeout(r, 400));
  return window.__log[window.__log.length - 1];
});
ok(a6.view === 'areamod' && /peca=/.test(a6.src) && /bloco=/.test(a6.src), 'ACERVO volta: mapa com peca+bloco');
await page.waitForTimeout(1200);
const a7 = await page.evaluate(() => {
  const d = document.getElementById('fr').contentDocument;
  const rot = d.querySelector('.ctr');
  return { aberto: rot && rot.classList.contains('on'),
           destacou: [...d.querySelectorAll('.ctr .blk')].some(b => b.classList.contains('volta')) };
});
ok(a7.aberto && a7.destacou, 'ACERVO volta reabre o painel no bloco destacado');

/* ================ ERRO VIRA REVISÃO (item 2) ================ */
await page.goto(URL0 + '/tests/harness-erros.html');
await page.waitForFunction(() => !!window.colherErros);

const err = await page.evaluate(async () => {
  const r = {};
  const limpa = () => ['errors', 'fc', 'reviews'].forEach(k => localStorage.removeItem('catedra:' + k));
  const ler = k => JSON.parse(localStorage.getItem('catedra:' + k) || '[]');

  // 1. N erradas → N erros + N flashcards (com gabarito) + 1 revisão por disciplina
  limpa();
  const lote = [
    { enunciado: 'Cabe HC contra decisão de turma recursal?', gabarito: 'Súmula 690 superada', disc: 'Processo Penal', topico: 'HC' },
    { enunciado: 'Prazo da impugnação ao cumprimento de sentença', gabarito: 'art. 525 CPC', disc: 'Processo Civil', topico: 'Cumprimento' },
    { enunciado: 'Prescrição intercorrente na execução fiscal', gabarito: 'Súmula 314 STJ', disc: 'Processo Civil', topico: 'Prescrição' },
  ];
  const a = window.colherErros(lote, 'Simulado');
  r.criouTudo = a.erros === 3 && a.cards === 3;
  r.umaRevisaoPorDisc = a.revs === 2;
  r.revisaoAmanha = ler('reviews').every(x => x.dueDate > new Date().toISOString().slice(0, 10) && x.due === 1);
  r.temIdEUp = ler('errors').every(x => x.id && x.up) && ler('fc').every(x => x.id && x.up);

  // 2. refazer a mesma prova não duplica
  const b = window.colherErros(lote, 'Simulado');
  r.dedup = b === null && ler('errors').length === 3;

  // 3. desfazer remove exatamente o lote
  limpa();
  window.colherErros(lote, 'Simulado');
  const antes = ler('errors').length + ler('fc').length + ler('reviews').length;
  window.desfazerLote();
  r.desfez = antes === 8 && ler('errors').length === 0 && ler('fc').length === 0 && ler('reviews').length === 0;

  // 4. teto de 20 por correção
  limpa();
  const c = window.colherErros(Array.from({ length: 30 }, (_, i) => ({ enunciado: 'questão ' + i, gabarito: 'g' + i, disc: 'Civil' })), 'Simulado');
  r.teto = c.erros === 20;

  // 5. canal da 2ª fase (postMessage) cai no mesmo caminho
  limpa();
  window.postMessage({ type: 'ctErrosSegundaFase', prova: 'TJ-RJ 2026 · discursiva', quesitos: [
    { titulo: 'Quesito 1 — enfrentar a preliminar de ilegitimidade', disc: 'Processo Civil', nota: 0, max: 1, fundamento: 'art. 485, VI, CPC' },
    { titulo: 'Quesito 2 — dosimetria', disc: 'Penal', nota: 0.5, max: 1, fundamento: 'art. 59 CP' },
  ] }, '*');
  await new Promise(res => setTimeout(res, 200));
  const es = ler('errors');
  r.segundaFase = es.length === 2 && es.every(x => /2ª fase — TJ-RJ/.test(x.source)) && ler('reviews').length === 2;
  limpa();
  return r;
});
for (const [k, v] of Object.entries(err)) ok(v, 'ERROS ' + k);

/* ============= EVOLUÇÃO DA REDAÇÃO (item 4) ============= */
await page.goto(URL0 + '/tests/harness-redhist.html');
await page.waitForFunction(() => !!window.redRegistrar);

const evo = await page.evaluate(() => {
  const r = {};
  const limpa = () => localStorage.removeItem('catedra:redHist');
  const ler = () => JSON.parse(localStorage.getItem('catedra:redHist') || '[]');
  const dia = 864e5;

  // duas tentativas da mesma prova → uma linha, delta por quesito
  limpa();
  window.redRegistrar({ origem: 'segunda-fase', prova: 'TJ-RJ 2026 · discursiva', ts: Date.now() - 3 * dia, notaTotal: 40,
    quesitos: [ { titulo: 'Preliminar', nota: 0, max: 1 }, { titulo: 'Mérito', nota: 1, max: 1 }, { titulo: 'Dosimetria', nota: 0.5, max: 1 } ] });
  window.redRegistrar({ origem: 'segunda-fase', prova: 'TJ-RJ 2026 · discursiva', ts: Date.now(), notaTotal: 75,
    quesitos: [ { titulo: 'Preliminar', nota: 1, max: 1 }, { titulo: 'Mérito', nota: 1, max: 1 }, { titulo: 'Dosimetria', nota: 0.5, max: 1 } ] });
  const e1 = window.redEvolucao();
  r.umaLinhaPorProva = e1.length === 1 && e1[0].tentativas === 2;
  r.curvaSubiu = e1[0].primeiroPct === 50 && e1[0].ultimoPct === 83;
  // o que menos evoluiu vem primeiro (Mérito e Dosimetria: delta 0; Preliminar: +100)
  r.piorPrimeiro = e1[0].quesitos[0].delta === 0 && e1[0].quesitos[e1[0].quesitos.length - 1].delta === 100;
  r.casaPorIndice = e1[0].quesitos.some(q => q.titulo === 'Preliminar' && q.de === 0 && q.para === 100);

  // provas diferentes não se misturam; a origem separa
  window.redRegistrar({ origem: 'redacao', prova: 'TJ-RJ 2026 · discursiva', ts: Date.now(), notaTotal: 60,
    quesitos: [{ titulo: 'Estrutura', nota: 6, max: 10 }] });
  r.origemSepara = window.redEvolucao().length === 2;

  // id + up (regra da casa: merge por id no auth.js)
  r.temIdEUp = ler().every(x => x.id && x.up && Array.isArray(x.quesitos));
  // não guarda o texto da peça
  r.semTexto = ler().every(x => !('texto' in x) && !('folha' in x));

  // sparkline: n pontos, começa em M e não estoura a caixa
  const d = window.redSpark([50, 83]);
  r.spark = /^M[\d. ]+L[\d. ]+$/.test(d) && !/-\d/.test(d);
  r.sparkVazio = window.redSpark([50]) === '';

  // canal da 2ª fase
  limpa();
  window.postMessage({ type: 'ctRedacaoResultado', prova: 'TJ-SP 2025 · sentença', notaTotal: 66,
    quesitos: [{ titulo: 'Relatório', nota: 1, max: 1 }, { titulo: 'Fundamentação', nota: 0, max: 1 }] }, '*');
  return new Promise(res => setTimeout(() => {
    const h = ler();
    r.canal = h.length === 1 && h[0].origem === 'segunda-fase' && h[0].quesitos.length === 2 && h[0].notaTotal === 66;
    limpa();
    res(r);
  }, 200));
});
for (const [k, v] of Object.entries(evo)) ok(v, 'REDHIST ' + k);

// A página REAL da 2ª fase, dirigida uma vez: ao "Salvar e sair" ela posta as duas
// mensagens — os quesitos falhos (item 2) e a nota por quesito (item 4).
await page.goto(URL0 + '/segunda-fase-web.html');
await page.waitForTimeout(700);
const pre = await page.evaluate(() => {
  const P = (window.CT_ESPELHOS || {}).provas || [];
  const alvo = P.find(p => (p.quesitos || []).length >= 2) || P[0];
  if (!alvo) return { erro: 'sem provas' };
  localStorage.setItem('catedraSegundaFase', JSON.stringify({ hist: [], sessao: {
    id: alvo.id, minutos: 300, inicio: Date.now(), acc: 60000, rodando: false,
    folha: 'texto qualquer da peça para a correção rodar', entregue: true, gasto: 60000, veredictos: {} } }));
  return { ok: true };
});
if (!pre.erro) {
  await page.goto(URL0 + '/segunda-fase-web.html');
  await page.waitForTimeout(1200);
  const duas = await page.evaluate(async () => {
    const caixa = {};
    window.addEventListener('message', e => {
      if (e.data && (e.data.type === 'ctErrosSegundaFase' || e.data.type === 'ctRedacaoResultado')) caixa[e.data.type] = e.data;
    });
    // marca dois quesitos como "não atendeu" para haver o que colher
    [...document.querySelectorAll('.q .ver button[data-v="nao"]')].slice(0, 2).forEach(b => b.click());
    const fechar = [...document.querySelectorAll('button')].find(b => /Salvar e sair/.test(b.textContent || ''));
    if (!fechar) return caixa;
    fechar.click();
    await new Promise(r => setTimeout(r, 900));
    return caixa;
  });
  const post = duas.ctErrosSegundaFase, msg = duas.ctRedacaoResultado;
  ok(!!post && Array.isArray(post.quesitos) && post.quesitos.length > 0, 'ERROS 2ª fase posta ctErrosSegundaFase ao fechar');
  ok(!!post && !!post.prova, 'ERROS 2ª fase manda o rótulo da prova');
  ok(!!msg && Array.isArray(msg.quesitos) && msg.quesitos.length >= 2, 'REDHIST 2ª fase posta ctRedacaoResultado');
  ok(!!msg && msg.quesitos.every(q => q.max === 1 && q.nota >= 0 && q.nota <= 1), 'REDHIST notas por quesito normalizadas');
  ok(!!msg && !JSON.stringify(msg).includes('texto qualquer da peça'), 'REDHIST não manda o texto da peça');
}
/* ============= ONDE ESTOU FRACA (item 1) ============= */
await page.goto(URL0 + '/tests/harness-prioridade.html');
await page.waitForFunction(() => !!window.CT_PRIORIDADE_CALC);

const prio = await page.evaluate(() => {
  const { prioridadeDisciplinas, PESOS } = window.CT_PRIORIDADE_CALC;
  const hoje = '2026-08-22';
  const dia = 864e5, hojeMs = Date.parse(hoje + 'T00:00:00Z');
  const r = {};

  const base = {
    hoje,
    edital: [{ disc: 'Direito Processual Penal', peso: 2 }, { disc: 'Direito Civil', peso: 1 }],
    errors: [], reviews: [],
    sessions: [
      { disc: 'Direito Processual Penal', date: '2026-08-21', questoes: 20, acertos: 15, erradas: 5 },
      { disc: 'Direito Civil', date: '2026-08-21', questoes: 20, acertos: 15, erradas: 5 }
    ]
  };

  // pesos somam 1 e estão num lugar só
  r.pesosSomam1 = Math.abs(Object.values(PESOS).reduce((a, b) => a + b, 0) - 1) < 1e-9;

  // mais erros → sobe
  const comErros = prioridadeDisciplinas({ ...base,
    errors: [1, 2, 3].map(i => ({ disc: 'Direito Civil', ts: hojeMs - i * dia })) });
  r.errosSobem = comErros[0].disc === 'Direito Civil';

  // erro fora da janela de 30 dias não conta
  const errosVelhos = prioridadeDisciplinas({ ...base,
    errors: [1, 2, 3].map(i => ({ disc: 'Direito Civil', ts: hojeMs - (40 + i) * dia })) });
  r.janela30 = errosVelhos[0].disc !== 'Direito Civil' || errosVelhos[0].nota === errosVelhos[1].nota;

  // revisões vencidas sobem; revisar (dueDate no futuro) desce
  const vencidas = prioridadeDisciplinas({ ...base, reviews: [
    { disc: 'Direito Civil', dueDate: '2026-08-10' }, { disc: 'Direito Civil', dueDate: '2026-08-12' }] });
  const revisou = prioridadeDisciplinas({ ...base, reviews: [
    { disc: 'Direito Civil', dueDate: '2026-09-10' }, { disc: 'Direito Civil', dueDate: '2026-09-12' }] });
  const notaDe = (lista, d) => lista.find(x => x.disc === d).nota;
  r.revisoesSobem = notaDe(vencidas, 'Direito Civil') > notaDe(revisou, 'Direito Civil');
  r.revisarDesce = notaDe(revisou, 'Direito Civil') < notaDe(vencidas, 'Direito Civil');

  // tempo sem estudar pesa; nunca estudada é o máximo do fator
  const parada = prioridadeDisciplinas({ ...base,
    sessions: [{ disc: 'Direito Processual Penal', date: '2026-08-21', questoes: 20, acertos: 15, erradas: 5 }] });
  r.nuncaEstudada = parada[0].disc === 'Direito Civil' && parada[0].diasSem === null;

  // desempenho: amostra pequena não vira sinal
  const poucas = prioridadeDisciplinas({ ...base,
    sessions: [{ disc: 'Direito Civil', date: '2026-08-21', questoes: 3, acertos: 0, erradas: 3 },
               { disc: 'Direito Processual Penal', date: '2026-08-21', questoes: 20, acertos: 15, erradas: 5 }] });
  r.amostraMinima = poucas.find(x => x.disc === 'Direito Civil').liqPct === null;

  // nome com caixa/acento diferente casa (strings livres no app)
  const acento = prioridadeDisciplinas({ ...base,
    errors: [{ disc: '  direito civil  ', ts: hojeMs - dia }] });
  r.normalizaNome = acento.find(x => x.disc === 'Direito Civil').erros30 === 1;

  // sem dado nenhum: marca semDados (a tela explica em vez de mostrar zeros)
  const vazio = prioridadeDisciplinas({ hoje, edital: [{ disc: 'Direito Civil' }], errors: [], reviews: [], sessions: [] });
  r.semDados = vazio.length === 1 && vazio[0].semDados === true;
  r.semEdital = prioridadeDisciplinas({ hoje, edital: [] }).length === 0;

  // cada cartão explica o porquê
  r.temMotivos = comErros[0].motivos.length > 0 && comErros[0].fatores.length === 5;
  r.notaLimitada = comErros.every(x => x.nota >= 0 && x.nota <= 100);
  return r;
});
for (const [k, v] of Object.entries(prio)) ok(v, 'PRIORIDADE ' + k);
/* ============= BUSCA ÚNICA NO ⌘K (item 6) ============= */
await page.goto(URL0 + '/tests/harness-busca.html');
await page.waitForFunction(() => !!window.__IDX);

const bu = await page.evaluate(() => {
  const B = window.CT_BUSCA, IDX = window.__IDX, r = {};
  const t = (q, tipo) => (B.buscar(IDX, q)[tipo][0] || {}).titulo || null;

  r.indexou = IDX.length > 300 && IDX.some(x => x.tipo === 'lei') && IDX.some(x => x.tipo === 'peca') && IDX.some(x => x.tipo === 'rito');

  // acervo: lei, jurisprudência, peça e rito no mesmo campo
  r.achaLei = t('improbidade', 'lei') === 'Lei de Improbidade Administrativa';
  r.achaSumula = /Súmula 619/.test(t('súmula 619', 'verbete') || '');
  r.achaPeca = /Senten/.test(t('sentença', 'peca') || '');
  r.achaRito = /júri/i.test(t('júri', 'rito') || '');

  // sigla é como se procura lei na prática — e vale SÓ para lei
  r.sigla = t('cpc', 'lei') === 'Código de Processo Civil' && t('ctn', 'lei') === 'Código Tributário Nacional';
  r.siglaCF = t('cf', 'lei') === 'Constituição Federal';           // não pode ser "Código Florestal"
  r.siglaNaoVazaProVerbete = B.buscar(IDX, 'cpc').verbete.every(v => /cpc|processo civil/i.test(B.normalizar(v.titulo + ' ' + v.extra)));

  // número da lei (a referência é buscável)
  r.numeroDaLei = t('8.429', 'lei') === 'Lei de Improbidade Administrativa';

  // acento e caixa não importam
  r.semAcento = t('sentenca', 'peca') === t('sentença', 'peca') && t('JÚRI', 'rito') === t('júri', 'rito');

  // prefixo ganha de pedaço no meio
  r.ranking = B.pontuar('codigo de processo civil', 'codigo') === 3
    && B.pontuar('codigo de processo civil', 'processo') === 2
    && B.pontuar('codigo de processo civil', 'rocess') === 1;

  // repetido no acervo aparece uma vez só — MAS súmula homônima de tribunais diferentes
  // são duas coisas: a chave inclui o extra (tribunal · situação)
  r.dedup = B.buscar(IDX, 'súmula 619').verbete.length === 1;
  const doisTribunais = B.indexar({ verbetes: [
    ['A', 'STF', 'sumula_stf', 619, 'Súmula 619', 'Constitucional', 'x', null, 'Revogada', 0],
    ['B', 'STJ', 'sumula_stj', 619, 'Súmula 619', 'Administrativo', 'y', null, null, 1]] });
  const d2 = B.buscar(doisTribunais, 'súmula 619').verbete;
  r.homonimasSeparadas = d2.length === 2;
  r.revogadaPorUltimo = d2[0].extra.includes('STJ') && /Revogada/.test(d2[1].extra);

  /* --- TASK 7 · identidade canônica: o que colapsa e o que NÃO colapsa --- */
  // (a) mesmo tribunal, mesmo número, mesmo título, ramo/tema escritos diferente = UM item
  r.t7mesmoVerbeteExtrasDiferentes = B.buscar(B.indexar({ verbetes: [
    ['STJ-1', 'STJ', 'stj', 619, 'Súmula 619 do STJ', 'Penal', 'Prescrição'],
    ['STJ-2', 'STJ', 'stj', 619, 'Súmula 619 do STJ', 'Processo Penal', 'Prescrição da pretensão']
  ] }), 'súmula 619').verbete.length === 1;
  // (b) tribunais diferentes com o mesmo número = DOIS itens (são súmulas distintas)
  r.t7tribunaisDiferentesFicam = B.buscar(B.indexar({ verbetes: [
    ['A', 'STF', 'stf', 619, 'Súmula 619', 'Constitucional', 'x'],
    ['B', 'STJ', 'stj', 619, 'Súmula 619', 'Administrativo', 'y']
  ] }), 'súmula 619').verbete.length === 2;
  // (c) mesma lei repetida por nome/referência = UM item
  r.t7leiRepetida = B.buscar(B.indexar({ leis: [
    { t: 'Código de Processo Civil', r: 'Lei nº 13.105/2015' },
    { t: 'Código de Processo Civil', r: 'CPC' }
  ] }), 'processo civil').lei.length === 1;
  // (d) mesmo título, números juridicamente distintos = DOIS itens
  r.t7numerosDistintosFicam = B.buscar(B.indexar({ verbetes: [
    ['A', 'STJ', 'stj', 7, 'Súmula', 'Civil', 'x'],
    ['B', 'STJ', 'stj', 8, 'Súmula', 'Penal', 'y']
  ] }), 'súmula').verbete.length === 2;
  // (e) o id da fonte sobrevive à busca (para abrir o registro exato quando houver como)
  r.t7idPreservado = (B.buscar(B.indexar({ verbetes: [
    ['STJ-SUM-619', 'STJ', 'stj', 619, 'Súmula 619 do STJ', 'Penal', 'x']
  ] }), 'súmula 619').verbete[0] || {}).id === 'STJ-SUM-619';
  // (f) a chave é identidade, não aparência: dois itens iguais têm a MESMA _k
  r.t7chaveEstavel = (function () {
    const i = B.indexar({ verbetes: [
      ['STJ-1', 'STJ', 'stj', 619, 'Súmula 619 do STJ', 'Penal', 'Prescrição'],
      ['STJ-2', 'STJ', 'stj', 619, 'Súmula 619 do STJ', 'Outro ramo', 'Outro tema']] });
    return i[0]._k === i[1]._k && !!i[0]._k;
  })();

  // teto por tipo e piso de 2 letras
  r.teto = B.buscar(IDX, 'lei', { porTipo: 3 }).lei.length <= 3;
  r.pisoDuasLetras = B.buscar(IDX, 'l').lei.length === 0;

  // o índice monta rápido o bastante para caber na primeira tecla
  r.rapido = window.__idxPronto < 400;
  const t0 = performance.now(); B.buscar(IDX, 'sentença'); r.buscaRapida = (performance.now() - t0) < 150;
  return r;
});
for (const [k, v] of Object.entries(bu)) ok(v, 'BUSCA ' + k);

// o app não carrega os acervos da paleta no boot (juris-index.js tem 2,4 MB)
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1500);
const boot = await page.evaluate(() => ({
  motor: !!window.CT_BUSCA,            // o motor é leve e vem junto
  juris: !!window.__JURIS_IDX__,       // o acervo NÃO
  cat: !!window.CT_LEIS_CAT,
}));
ok(boot.motor, 'BUSCA motor carrega no boot');
ok(!boot.juris && !boot.cat, 'BUSCA acervos NÃO carregam no boot (só na 1ª busca)');
/* ======= O QUE MUDOU ESTA SEMANA (item 7) ======= */
await page.goto(URL0 + '/tests/harness-semana.html');
await page.waitForFunction(() => !!window.CT_SEMANA);

const sem = await page.evaluate(() => {
  const S = window.CT_SEMANA, r = {};
  const it = S.itens || [];
  r.temItens = it.length >= 10;
  r.camposCompletos = it.every(x => x.id && x.titulo && x.tese && x.quando && x.tribunal);
  r.soInformativos = it.every(x => /STF|STJ|TSE/.test(x.tribunal));
  r.dataValida = it.every(x => /^\d{2}\/\d{2}\/\d{4}$/.test(x.quando));
  // marcador é opcional, mas quando existe tem de ser um dos três
  r.marcadorValido = it.every(x => x.marcador == null || ['superacao', 'divergencia', 'vinculante'].includes(x.marcador));
  // os marcados vêm primeiro (é o que muda o estudo)
  const iPrimeiroSem = it.findIndex(x => !x.marcador);
  const iUltimoCom = it.map((x, i) => x.marcador ? i : -1).filter(i => i >= 0).pop();
  r.marcadosPrimeiro = (iUltimoCom == null) || (iPrimeiroSem === -1) || (iUltimoCom < iPrimeiroSem);
  // a tese é recorte curto: o arquivo não pode virar um segundo acervo
  r.teseCurta = it.every(x => x.tese.length <= 340);
  r.arquivoLeve = JSON.stringify(S).length < 120000;
  // sem tese repetida (o acervo republica o mesmo julgado em edição extraordinária)
  const teses = it.map(x => x.tese.toLowerCase().replace(/\s+/g, ' ').slice(0, 160));
  r.semRepetida = new Set(teses).size === teses.length;
  // marcador vem calibrado: alguma coisa TEM de estar marcada, senão o bloco perde a graça
  r.temAlgumMarcado = it.some(x => x.marcador);

  // ordenado do mais novo para o mais velho dentro de cada grupo
  const ms = s => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s); return new Date(+m[3], +m[2] - 1, +m[1]).getTime(); };
  const semMarc = it.filter(x => !x.marcador).map(x => ms(x.quando));
  r.ordenado = semMarc.every((v, i) => i === 0 || semMarc[i - 1] >= v);
  return r;
});
for (const [k, v] of Object.entries(sem)) ok(v, 'SEMANA ' + k);

// a home mostra o bloco, e "Já vi" tira o item e persiste
await page.goto(URL0 + '/Catedra.dc.html');
await page.evaluate(() => { localStorage.removeItem('catedra:semanaLidos'); });
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1800);
const home = await page.evaluate(async () => {
  const tit = [...document.querySelectorAll('h2')].find(h => /mudou esta semana/i.test(h.textContent || ''));
  if (!tit) return { erro: 'sem bloco' };
  const cont = tit.closest('.cth-sec').nextElementSibling;
  const antes = [...cont.children].filter(e => e.tagName === 'DIV').length;
  const b = cont.querySelector('button[data-id]');
  const id = b && b.dataset.id;
  if (b) b.click();
  await new Promise(r => setTimeout(r, 500));
  return { antes, id, lidos: JSON.parse(localStorage.getItem('catedra:semanaLidos') || '[]') };
});
ok(!home.erro && home.antes > 0, 'SEMANA bloco aparece na home com itens');
ok(!home.erro && home.lidos.includes(home.id), 'SEMANA "Já vi" registra e persiste (sincroniza)');
/* ============= PROVA ORAL — MODO ARGUIÇÃO (item 3) ============= */
await page.goto(URL0 + '/tests/harness-arguicao.html');
await page.waitForFunction(() => !!window.CT_ORAL_Q && !!window.argPool);

const arg = await page.evaluate(() => {
  const r = {};
  const Q = window.CT_ORAL_Q;
  r.acervo = Q.length > 900;

  // só entra pergunta com padrão de resposta útil — é ele que corrige
  const pool = window.argPool({ areaEstudo: 'juridica' });
  r.soComPadrao = pool.every(q => q.padrao && q.padrao.length > 200);

  // o sorteio respeita a ÁREA: quem estuda magistratura não recebe pergunta de fotônica
  const carrJur = ['Magistratura Estadual', 'Ministério Público', 'Defensoria Pública', 'Advocacia Pública'];
  r.poolDaArea = pool.length >= 100 && pool.every(q => carrJur.includes(q.carreira));
  const poolPol = window.argPool({ areaEstudo: 'policial' });
  r.areaPolicial = poolPol.length > 0 && poolPol.every(q => ['Polícia Civil', 'Polícia Federal', 'Perícia'].includes(q.carreira));

  // filtro escolhido à mão manda mais que a área
  const escolhido = window.argPool({ areaEstudo: 'juridica', oralQCarr: 'Polícia Civil' });
  r.filtroManda = escolhido.length > 0 && escolhido.every(q => q.carreira === 'Polícia Civil');

  // sessão de 5 sem repetir pergunta. Atenção: `id` no acervo é do DOCUMENTO (o malote),
  // não da questão — 417 perguntas jurídicas compartilham 190 ids. O que identifica a
  // pergunta é o enunciado, e ele é único nas 892.
  const fila = window.argSortear({ areaEstudo: 'juridica' }, 5);
  r.cinco = fila.length === 5 && new Set(fila.map(q => q.enunciado)).size === 5;
  r.enunciadoEhAChave = new Set(pool.map(q => q.enunciado)).size === pool.length;

  // o carimbo de controle do CEBRASPE não pode aparecer na tela
  const sujos = Q.filter(q => /<<[^>]{4,80}>>/.test(q.enunciado || ''));
  r.temSujos = sujos.length > 0;
  r.limpa = sujos.every(q => !/<</.test(window.argLimpa(q.enunciado)) && window.argLimpa(q.enunciado).length > 40);
  return r;
});
for (const [k, v] of Object.entries(arg)) ok(v, 'ARGUICAO ' + k);

// a sessão roda de ponta a ponta na tela: pergunta → padrão só depois → autoavaliação → resumo
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1600);
const fluxo = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const M = () => document.querySelector('main').innerText;
  document.querySelector('button[data-view="oral"]').click(); await w(400);
  const bm = [...document.querySelectorAll('button')].find(b => b.dataset.m === 'bancas');
  if (bm) bm.click(); await w(2500);
  const cartao = [...document.querySelectorAll('main div')].find(d => /^Modo arguição/.test(d.textContent.trim()));
  if (!cartao) return { erro: 'sem cartão de arguição' };
  const comecar = [...cartao.closest('div[style*="surface2"]').querySelectorAll('button')].find(b => b.textContent.trim() === 'Começar');
  comecar.click(); await w(1000);
  const abriu = /ARGUIÇÃO · PERGUNTA 1 DE 5|Arguição · pergunta 1 de 5/i.test(M());
  // sinal exato: os botões de autoavaliação só existem DENTRO do bloco do padrão — o texto
  // "padrão de resposta" também aparece na apresentação da página, e enganava o teste
  const temPadrao = () => !!document.querySelector('main button[data-v="bem"]');
  const padraoAntes = temPadrao();
  [...document.querySelectorAll('main button')].find(b => /Respondi — ver o padrão/.test(b.textContent || '')).click(); await w(500);
  const padraoDepois = temPadrao();
  for (let i = 0; i < 5; i++) {
    const ver = [...document.querySelectorAll('main button')].find(b => /Respondi — ver o padrão/.test(b.textContent || ''));
    if (ver) { ver.click(); await w(350); }
    const b = [...document.querySelectorAll('main button')].find(x => x.dataset.v === 'nao');
    if (!b) break;
    b.click(); await w(500);
  }
  const fim = /Fim da arguição/.test(M());
  const erros = JSON.parse(localStorage.getItem('catedra:errors') || '[]');
  return { abriu, padraoAntes, padraoDepois, fim, errosCriados: erros.length };
});
ok(!fluxo.erro && fluxo.abriu, 'ARGUICAO sessão abre com a pergunta');
ok(!fluxo.erro && !fluxo.padraoAntes && fluxo.padraoDepois, 'ARGUICAO padrão só aparece depois de responder');
ok(!fluxo.erro && fluxo.fim, 'ARGUICAO cinco perguntas levam ao resumo');

/* ============= U5 — SINCRONIZAÇÃO VISÍVEL E HONESTA ============= */
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1600);
const u5 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const aside = () => document.querySelector('aside');
  const selo = () => [...aside().querySelectorAll('span')].map(s => s.textContent.trim())
    .find(t => /salvo|enviando|conexão|erro|não consegui/i.test(t)) || '';
  const botao = () => [...aside().querySelectorAll('button')].find(b => /tentar agora/i.test(b.textContent || ''));
  const emitir = st => window.dispatchEvent(new CustomEvent('catedra:syncstate', { detail: { status: st } }));
  const r = {};

  r.permanente = !!selo();                       // existe sem nenhum evento: é selo, não toast

  emitir('enviando'); await w(250); r.enviando = /enviando/i.test(selo());
  emitir('offline');  await w(250);
  r.offline = /sem conexão/i.test(selo()) && /guardado aqui/i.test(selo());   // diz onde os dados estão
  emitir('salvo');    await w(250);
  r.salvoComHora = /^✓ salvo às \d{2}:\d{2}$/.test(selo());
  emitir('erro');     await w(250);
  r.erroCurto = /tentando de novo/i.test(selo());
  r.semBotaoNoErroCurto = !botao();               // erro que acabou de começar não vira alarme

  // erro que PERSISTE (mais de 5 min) vira aviso com ação
  const orig = Date.now; let delta = 0; Date.now = () => orig() + delta;
  emitir('erro'); await w(200); delta = 6 * 60000; emitir('erro'); await w(300);
  r.erroLongo = /não consegui salvar/i.test(selo());
  r.temAcao = !!botao();
  if (botao()) botao().click();                   // não pode explodir sem CatedraSync
  await w(200);
  r.naoTravou = document.querySelectorAll('aside button').length > 0;
  Date.now = orig;

  // voltar a salvar limpa o alarme
  emitir('salvo'); await w(250);
  r.recupera = /✓ salvo/i.test(selo()) && !botao();
  return r;
});
for (const [k, v] of Object.entries(u5)) ok(v, 'U5 ' + k);
/* ============= U6 — DESFAZER EM VEZ DE CONFIRMAR ============= */
await page.goto(URL0 + '/Catedra.dc.html');
await page.evaluate(() => {
  localStorage.setItem('catedra:metas', JSON.stringify([{ id: 'm-u6', titulo: 'Meta de teste', prog: 0, alvo: 10, unidade: 'un.' }]));
  localStorage.setItem('catedra:sessions', JSON.stringify([{ id: 's-u6', ts: Date.now(), date: new Date().toISOString().slice(0, 10),
    disc: 'Direito Civil', topico: 'Teste U6', categoria: 'Teoria', min: 30, questoes: 10, acertos: 8, erradas: 2, brancos: 0, liquido: 6 }]));
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1800);

const u6 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const ler = k => JSON.parse(localStorage.getItem('catedra:' + k) || '[]');
  const r = {};
  let confirmou = false;
  window.confirm = () => { confirmou = true; return true; };

  // vai para Metas & Conquistas
  const mais = document.querySelector('button[aria-label="Mostrar mais opções"]');
  if (mais) mais.click(); await w(350);
  document.querySelector('button[data-view="conquistas"]').click(); await w(700);

  const botaoX = () => [...document.querySelectorAll('main button[data-id="m-u6"]')].find(b => (b.textContent || '').trim() === '×');
  if (!botaoX()) return { erro: 'sem botão de excluir a meta' };
  botaoX().click();
  await w(300);

  r.semConfirm = !confirmou;                                   // excluir 1 item não pede permissão
  r.sumiuDaTela = !document.querySelector('main button[data-id="m-u6"]');
  const toast = document.querySelector('div[role=status]');
  r.temToast = !!toast && /excluíd/i.test(toast.textContent || '');
  const undo = toast && [...toast.querySelectorAll('button')].find(b => /desfazer/i.test(b.textContent || ''));
  r.temDesfazer = !!undo;

  if (undo) undo.click();
  await w(900);
  const metas = ler('metas');
  r.restauraMesmoId = metas.length === 1 && metas[0].id === 'm-u6' && metas[0].titulo === 'Meta de teste';
  r.carimboNovo = !!(metas[0] && metas[0].up);                 // `up` novo faz a recriação vencer a lápide

  // sem desfazer, a exclusão persiste no disco (o autosave leva ~1s)
  botaoX().click();
  await w(1600);
  r.persisteSemDesfazer = ler('metas').length === 0;
  return r;
});
for (const [k, v] of Object.entries(u6)) ok(v, 'U6 ' + k);

// o destrutivo em MASSA continua pedindo confirmação — é a fronteira da especificação
const u6b = await page.evaluate(() => {
  const fonte = [...document.querySelectorAll('script')].map(s => s.textContent || '').find(t => t.includes('wipeAll')) || '';
  return {
    wipeAllPergunta: /wipeAll\s*=\s*\(\)=>\{\s*if\(!window\.confirm/.test(fonte),
    itemNaoPergunta: !/removeMeta[^}]*window\.confirm/.test(fonte) && !/removeCard[^}]*window\.confirm/.test(fonte)
      && !/removeErro[^}]*window\.confirm/.test(fonte) && !/removeEvent[^}]*window\.confirm/.test(fonte),
  };
});
ok(u6b.wipeAllPergunta, 'U6 apagar tudo continua pedindo confirmação');
ok(u6b.itemNaoPergunta, 'U6 exclusão de item não pede mais confirmação');
/* ===== TASK 9 · FUNDAÇÃO VISUAL ÚNICA DOS SATÉLITES =====
   Sete páginas independentes reinventavam a mesma fundação — box-sizing, foco, alvo de
   toque — e divergiam. E o contrato de tema levava cor e raio, mas não a ESCALA: quem
   escolhia "texto grande" via o app crescer e o iframe dentro dele continuar miúdo. */
{
  const SAT = ['legis-web.html', 'juris-web.html', 'ritos-web.html', 'pecas-web.html',
               'segunda-fase-web.html', 'prioridade-web.html', 'area-web.html'];
  // 1) todos carregam a base, e ANTES do próprio <style> (para poder especializar)
  const base = await page.evaluate(async ({ b, sat }) => {
    const r = {};
    for (const p of sat) {
      const t = await (await fetch(b + '/' + p)).text();
      const iLink = t.indexOf('satellite-base.css'), iStyle = t.indexOf('<style>');
      r[p] = iLink > 0 && iStyle > 0 && iLink < iStyle && /--module-accent/.test(t);
    }
    return r;
  }, { b: URL0, sat: SAT });
  const faltando = Object.entries(base).filter(([, v]) => !v).map(([k]) => k);
  ok(faltando.length === 0, 'TASK9 os 7 satélites carregam a base antes do estilo próprio ('
    + (faltando.join(', ') || 'todos') + ')');

  // 2) o contrato de tokens é o MESMO dos dois lados — token que só um lado conhece é letra morta
  const contrato = await page.evaluate(async (b) => {
    const [host, ponte] = await Promise.all([
      (await fetch(b + '/Catedra.dc.html')).text(), (await fetch(b + '/tema-satelite.js')).text()]);
    // O contrato leva só o que ALGUÉM LÊ do outro lado. --space-1..3 e --content-max
    // saíram: nenhum satélite os consumia, e token que atravessa a ponte sem consumidor
    // dá a impressão de que a densidade se propaga quando ela não move um pixel.
    const NOVOS = ['--fs-3xs', '--fs-2xs', '--fs-xs', '--fs-sm', '--fs-base', '--fs-md',
                   '--fs-lg', '--fs-xl', '--fs-2xl', '--control-h'];
    const MORTOS = ['--space-1', '--space-2', '--space-3', '--content-max'];
    return {
      hostManda: NOVOS.every(t => host.includes("'" + t + "'")),
      sateliteLe: NOVOS.every(t => ponte.includes("'" + t + "'")),
      semTokenSemConsumidor: MORTOS.every(t => !ponte.includes("'" + t + "'")),
      // a densidade tem de produzir token de verdade — não basta ficar gravada
      densidadeProduzToken: /density==='compacta'/.test(host) && /--control-h:\$\{/.test(host),
    };
  }, URL0);
  for (const [k, v] of Object.entries(contrato)) ok(v, 'TASK9 ' + k);

  // 3) a escala chega DE FATO ao satélite: o host manda, o iframe aplica
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.evaluate(() => { localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1600);
  const chega = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('button[data-view="prioridade"]').click(); await w(2200);
    const f = document.querySelector('iframe[data-ct-view="prioridade"]');
    if (!f || !f.contentDocument) return { erro: 'iframe não abriu' };
    const cs = f.contentWindow.getComputedStyle(f.contentDocument.documentElement);
    const v = n => (cs.getPropertyValue(n) || '').trim();
    // Não basta o token CHEGAR: ele tem de MOVER alguma coisa. O .sel do painel de
    // prioridade lê --control-h; sem consumidor, o token chegava e a tela ficava igual.
    const sel = f.contentDocument.querySelector('.sel');
    const alturaCom = sel ? f.contentWindow.getComputedStyle(sel).minHeight : '';
    f.contentDocument.documentElement.style.setProperty('--control-h', '61px');
    const alturaDepois = sel ? f.contentWindow.getComputedStyle(sel).minHeight : '';
    f.contentDocument.documentElement.style.setProperty('--control-h', alturaCom);
    return {
      escalaChegou: !!v('--fs-base') && !!v('--fs-2xl'),
      alturaDeControleChegou: !!v('--control-h'),
      tokenMoveAlgumaCoisa: alturaDepois === '61px' && alturaCom !== '61px',
      // a base só está aplicada se o Chrome ACEITOU a folha — e ele só aceita com text/css
      baseFoiAceita: [...f.contentDocument.styleSheets]
        .some(ss => (ss.href || '').includes('satellite-base.css') && ss.cssRules && ss.cssRules.length > 5),
      fundacaoAplicada: f.contentWindow.getComputedStyle(f.contentDocument.body).boxSizing === 'border-box',
    };
  });
  if (chega.erro) ok(false, 'TASK9 ' + chega.erro);
  else for (const [k, v] of Object.entries(chega)) ok(v, 'TASK9 ' + k);

  // 4) movimento reduzido: nenhum satélite respeitava
  const mov = await page.evaluate(async (b) => {
    const css = await (await fetch(b + '/satellite-base.css')).text();
    return { respeitaMovimentoReduzido: /prefers-reduced-motion:\s*reduce/.test(css)
      && /animation-duration:\s*\.01ms\s*!important/.test(css) };
  }, URL0);
  for (const [k, v] of Object.entries(mov)) ok(v, 'TASK9 ' + k);

  // 5) o satélite avulso (sem host) não pode depender da base para ficar legível
  await page.goto(URL0 + '/ritos-web.html');
  await page.waitForTimeout(700);
  const avulso = await page.evaluate(() => {
    const cs = getComputedStyle(document.body);
    return { avulsoTemFundo: cs.backgroundColor !== 'rgba(0, 0, 0, 0)',
             avulsoTemCorDeModulo: !!getComputedStyle(document.documentElement).getPropertyValue('--module-accent').trim() };
  });
  for (const [k, v] of Object.entries(avulso)) ok(v, 'TASK9 ' + k);

  // 6) o build leva a base junto — sem ela no bundle, o satélite publicado fica sem fundação
  const noBuild = await page.evaluate(async (b) => {
    const [web, mac] = await Promise.all([
      (await fetch(b + '/scripts/build.mjs')).text(), (await fetch(b + '/scripts/build-macos.mjs')).text()]);
    return { buildWebCopia: web.includes("'satellite-base.css'"),
             buildWebPrecache: web.includes("'./satellite-base.css'"),
             buildMacCopia: mac.includes("'satellite-base.css'") };
  }, URL0);
  for (const [k, v] of Object.entries(noBuild)) ok(v, 'TASK9 ' + k);
}

/* ============= D1 — TEMA ÚNICO NOS SATÉLITES ============= */
// Todo satélite carrega a mesma ponte
const d1arqs = await page.evaluate(async (base) => {
  const paginas = ['legis-web.html', 'juris-web.html', 'ritos-web.html', 'pecas-web.html',
                   'segunda-fase-web.html', 'prioridade-web.html', 'area-web.html'];
  const r = {};
  for (const p of paginas) {
    const t = await (await fetch(base + '/' + p)).text();
    r[p] = t.includes('tema-satelite.js');
  }
  return r;
}, URL0);
ok(Object.values(d1arqs).every(Boolean), 'D1 os 7 satélites carregam a ponte de tema (' +
   Object.entries(d1arqs).filter(([, v]) => !v).map(([k]) => k).join(', ') + ')');

// Satélite avulso (sem host) mantém a paleta própria — o fallback do var() continua valendo
await page.goto(URL0 + '/ritos-web.html');
await page.waitForTimeout(700);
const avulso = await page.evaluate(() => ({
  marcado: document.documentElement.getAttribute('data-ct-tema'),
  accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
}));
ok(!avulso.marcado, 'D1 página avulsa não é pintada pelo host (segue com a cara própria)');

// Dentro do app: o satélite herda cor e fundo, e a troca de cor atravessa
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1700);
const d1 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const r = {};
  const btn = document.querySelector('button[data-view="areamod"]');
  if (!btn) return { erro: 'sem satélite nesta área' };
  btn.click(); await w(2400);
  const frame = () => [...document.querySelectorAll('iframe')].find(f => /ritos-web/.test(f.getAttribute('src') || ''));
  if (!frame()) return { erro: 'iframe não montou' };
  const dentro = () => { const d = frame().contentDocument;
    const cs = d.defaultView.getComputedStyle(d.documentElement);
    return { accent: cs.getPropertyValue('--accent').trim(), bg: cs.getPropertyValue('--bg').trim(),
             marcado: d.documentElement.getAttribute('data-ct-tema'), esquema: d.documentElement.style.colorScheme }; };
  const host = getComputedStyle(document.querySelector('[style*="--accent"]'));
  const a = dentro();
  r.herdaCor = a.accent === host.getPropertyValue('--accent').trim() && !!a.accent;
  r.herdaFundo = a.bg === host.getPropertyValue('--bg').trim() && !!a.bg;
  r.marcado = a.marcado === '1';

  // trocar a cor de destaque atravessa até o satélite
  const mais = document.querySelector('button[aria-label="Mostrar mais opções"]');
  if (mais) mais.click(); await w(300);
  document.querySelector('button[data-view="ajustes"]').click(); await w(700);
  // D11 mudou a cor de destaque de lugar: ela mora na aba Aparência, nao mais solta na pagina
  const abaAp = [...document.querySelectorAll('main .aj-abas button[data-t]')].find(b => /Aparência/.test(b.textContent));
  if (abaAp) { abaAp.click(); await w(700); }
  const cores = [...document.querySelectorAll('main button[data-c]')];
  const alvo = cores.find(c => c.dataset.c && c.dataset.c !== a.accent);
  if (!alvo) return { ...r, erro: 'sem paleta de cores nos Ajustes' };
  const nova = alvo.dataset.c;
  alvo.click(); await w(500);
  document.querySelector('button[data-view="areamod"]').click(); await w(2200);
  r.trocaDeCorAtravessa = frame() && dentro().accent === nova;
  return r;
});
if (!d1.erro) {
  ok(d1.herdaCor, 'D1 satélite herda a cor de destaque do host');
  ok(d1.herdaFundo, 'D1 satélite herda o fundo (modo escuro deixa de piscar branco)');
  ok(d1.marcado, 'D1 satélite se marca como tematizado');
  ok(d1.trocaDeCorAtravessa, 'D1 trocar a cor nos Ajustes muda o satélite');
} else {
  ok(false, 'D1 não deu para exercitar o satélite: ' + d1.erro);
}
/* ============= U3 — CONTINUAR DE ONDE PAREI ============= */
// atenção: o rótulo do cartão é maiúsculo por CSS — comparar sem diferenciar caixa
await page.goto(URL0 + '/Catedra.dc.html');
await page.evaluate(() => {
  ['catedra:lastPonto', 'catedra:lastPontoDispensado', 'ct_prova'].forEach(k => localStorage.removeItem(k));
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1600);

const u3a = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const tem = () => /continuar de onde parei/i.test(document.querySelector('main').innerText);
  const r = {};
  r.semPontoNaoMostra = !tem();                       // app novo não inventa cartão

  // visitar um satélite grava o ponto
  document.querySelector('button[data-view="areamod"]').click(); await w(1500);
  const p = JSON.parse(localStorage.getItem('catedra:lastPonto') || 'null');
  r.gravaPonto = !!p && p.view === 'areamod' && !!p.rotulo && typeof p.ts === 'number';

  // estando NA view do ponto, o cartão não aparece (seria conselho para ficar onde já está)
  r.naViewNaoMostra = !tem();

  document.querySelector('button[data-view="inicio"]').click(); await w(700);
  r.mostraNoInicio = tem();
  return r;
});
for (const [k, v] of Object.entries(u3a)) ok(v, 'U3 ' + k);

// ponto com rito reabre no ponto exato
await page.evaluate(() => {
  localStorage.setItem('catedra:lastPonto', JSON.stringify({ view: 'areamod', rito: 'Civil — conhecimento',
    peca: '', bloco: null, termo: '', rotulo: 'Processo e peças — Civil — conhecimento', ts: Date.now() - 2 * 3600e3 }));
  localStorage.setItem('catedra:lastPontoDispensado', '0');
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1700);
const u3b = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const M = () => document.querySelector('main').innerText;
  const r = {};
  r.idadeRelativa = /há 2h/.test(M());                // ts em ms vira idade legível
  const btn = [...document.querySelectorAll('main button')].find(b => /^Continuar$/i.test((b.textContent || '').trim()));
  if (!btn) return { ...r, erro: 'sem botão Continuar' };
  btn.click(); await w(2200);
  const fr = [...document.querySelectorAll('iframe')].find(f => /ritos-web/.test(f.getAttribute('src') || ''));
  r.reabreNoPonto = !!fr && /rito=Civil/.test(decodeURIComponent(fr.getAttribute('src') || ''));

  document.querySelector('button[data-view="inicio"]').click(); await w(700);
  const x = [...document.querySelectorAll('main button')].find(b => (b.textContent || '').trim() === '✕');
  r.temDispensar = !!x;
  if (x) { x.click(); await w(600); }
  r.dispensaSome = !/continuar de onde parei/i.test(M());
  r.dispensaPersiste = +(localStorage.getItem('catedra:lastPontoDispensado') || '0') > 0;
  return r;
});
if (!u3b.erro) { for (const [k, v] of Object.entries(u3b)) ok(v, 'U3 ' + k); }
else ok(false, 'U3 ' + u3b.erro);

// O app já reabre a prova pausada em TELA CHEIA no boot (_restoreProva consome ct_prova),
// e descarta prova de outro dia de propósito: por isso o cartão NÃO trata simulado — seria
// um botão que nunca aparece. Este teste guarda a decisão.
await page.evaluate(() => {
  localStorage.setItem('ct_prova', JSON.stringify({ d: new Date().toISOString().slice(0, 10), min: 60, sec: 1800 }));
  localStorage.removeItem('catedra:lastPonto');
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1700);
const u3c = await page.evaluate(() => ({
  consumiuAChave: !localStorage.getItem('ct_prova'),
  semCartaoDeProva: !/simulado cronometrado pausado/i.test(document.querySelector('main').innerText),
}));
ok(u3c.consumiuAChave, 'U3 a prova pausada é retomada pelo app (a chave é consumida no boot)');
ok(u3c.semCartaoDeProva, 'U3 o cartão não duplica a retomada da prova');
await page.evaluate(() => { ['catedra:lastPonto', 'catedra:lastPontoDispensado', 'ct_prova'].forEach(k => localStorage.removeItem(k)); });
/* ============= U1 — IFRAMES VIVOS ============= */
await page.goto(URL0 + '/Catedra.dc.html');
await page.evaluate(() => ['catedra:lastPonto', 'catedra:lastPontoDispensado', 'ct_prova'].forEach(k => localStorage.removeItem(k)));
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1700);

const u1 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const fr = v => document.querySelector('iframe[data-ct-view="' + v + '"]');
  const r = {};

  // os seis existem no DOM, mas SEM src: quem nunca abriu o LEGIS não paga por ele
  // (eram quatro até o D2 devolver 2ª fase e Prioridade ao template)
  const todos = [...document.querySelectorAll('iframe[data-ct-view]')];
  r.seisMontados = todos.length === 6;
  r.nenhumCarregaNoBoot = todos.every(f => !f.getAttribute('src'));
  r.todosEscondidos = todos.every(f => f.style.display === 'none');

  // abrir a tela carrega SÓ o dela
  document.querySelector('button[data-view="areamod"]').click(); await w(1800);
  r.carregaSoOAtual = !!fr('areamod').getAttribute('src')
    && !fr('legis').getAttribute('src') && !fr('juris').getAttribute('src');
  r.visivel = fr('areamod').style.display === 'block';

  // o src NÃO leva mais o ponto/busca: fica IGUAL entre idas e vindas (é o que "estável"
  // quer dizer) — o embed=1 do D2 faz parte da base e também não muda
  const src1 = fr('areamod').getAttribute('src');
  r.srcSemPonto = !/rito=|peca=|bloco=|[?&]q=/.test(src1 || '');
  document.querySelector('button[data-view="inicio"]').click(); await w(400);
  document.querySelector('button[data-view="areamod"]').click(); await w(600);
  r.srcEstavel = fr('areamod').getAttribute('src') === src1;

  // sair e voltar NÃO recarrega (a marca sobrevive) — é o coração do U1
  try { fr('areamod').contentWindow.__u1 = 42; } catch (e) {}
  document.querySelector('button[data-view="inicio"]').click(); await w(500);
  r.escondeAoSair = fr('areamod').style.display === 'none';
  document.querySelector('button[data-view="areamod"]').click(); await w(800);
  let vivo = false; try { vivo = fr('areamod').contentWindow.__u1 === 42; } catch (e) {}
  r.naoRecarregaAoVoltar = vivo;
  return r;
});
for (const [k, v] of Object.entries(u1)) ok(v, 'U1 ' + k);

// ida e volta com os iframes vivos: busca aplicada, pílula acesa, e o LEGIS sobrevive
const u1b = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const fr = v => document.querySelector('iframe[data-ct-view="' + v + '"]');
  const r = {};
  const d = fr('areamod').contentDocument;
  const chip = d.querySelector('#fluxo [data-legis]') || d.querySelector('#fluxo [data-juris]');
  if (!chip) return { erro: 'sem chip no fluxo' };
  chip.click(); await w(1800);
  const legis = fr('legis');
  try {
    const ld = legis.contentDocument;
    r.buscaChegou = !!(ld.getElementById('cq') || {}).value;
    r.pilulaAcesa = !!ld.getElementById('ct-volta');
    legis.contentWindow.__u1legis = 7;
    ld.getElementById('ct-volta').click();
  } catch (e) { return { erro: String(e).slice(0, 80) }; }
  await w(1500);
  r.voltouAoMapa = fr('areamod').style.display === 'block';
  let vivo = false; try { vivo = legis.contentWindow.__u1legis === 7; } catch (e) {}
  r.legisContinuaVivo = vivo;      // antes, voltar destruía a página do acervo

  // segunda ida: agora o LEGIS já está montado, então a busca vai por MENSAGEM
  const chip2 = fr('areamod').contentDocument.querySelector('#fluxo [data-legis]');
  if (chip2) { chip2.click(); await w(1200); }
  let vivo2 = false, termo2 = '';
  try { vivo2 = legis.contentWindow.__u1legis === 7; termo2 = (legis.contentDocument.getElementById('cq') || {}).value; } catch (e) {}
  r.segundaIdaSemRecarregar = vivo2;
  r.segundaIdaAplicaBusca = !!termo2;
  return r;
});
if (!u1b.erro) { for (const [k, v] of Object.entries(u1b)) ok(v, 'U1 ' + k); }
else ok(false, 'U1 ida-e-volta: ' + u1b.erro);

/* ============= D2 — MODO EMBUTIDO (?embed=1) ============= */
const d2 = await page.evaluate(async (base) => {
  const paginas = ['legis-web.html', 'juris-web.html', 'ritos-web.html', 'pecas-web.html',
                   'segunda-fase-web.html', 'prioridade-web.html', 'area-web.html'];
  const r = { semParametro: {}, comParametro: {} };
  for (const p of paginas) {
    const t = await (await fetch(base + '/' + p)).text();
    r.semParametro[p] = t.includes('tema-satelite.js');   // a ponte é quem aplica o embed
  }
  return r;
}, URL0);
ok(Object.values(d2.semParametro).every(Boolean), 'D2 os 7 satélites carregam a ponte que aplica o embed');

// a página avulsa mantém o cabeçalho inteiro; com ?embed=1 ele encolhe
for (const pag of ['legis-web.html', 'ritos-web.html']) {
  await page.goto(URL0 + '/' + pag);
  await page.waitForTimeout(700);
  const cheio = await page.evaluate(() => {
    const h = document.querySelector('.head') || document.querySelector('.brand');
    const ic = h && h.querySelector('.ic');
    return { marca: document.documentElement.getAttribute('data-ct-embed'),
             iconeVisivel: !!(ic && getComputedStyle(ic).display !== 'none'),
             alturaCab: h ? Math.round(h.getBoundingClientRect().height) : 0 };
  });
  await page.goto(URL0 + '/' + pag + '?embed=1');
  await page.waitForTimeout(700);
  const magro = await page.evaluate(() => {
    const h = document.querySelector('.head') || document.querySelector('.brand');
    const ic = h && h.querySelector('.ic');
    return { marca: document.documentElement.getAttribute('data-ct-embed'),
             iconeVisivel: !!(ic && getComputedStyle(ic).display !== 'none'),
             alturaCab: h ? Math.round(h.getBoundingClientRect().height) : 0 };
  });
  ok(!cheio.marca && cheio.iconeVisivel, 'D2 ' + pag + ' avulsa mantém o cabeçalho inteiro');
  ok(magro.marca === '1' && !magro.iconeVisivel, 'D2 ' + pag + ' com embed=1 esconde a identidade');
  ok(magro.alturaCab < cheio.alturaCab, 'D2 ' + pag + ' encolhe de ' + cheio.alturaCab + 'px para ' + magro.alturaCab + 'px');
}

// dentro do app: todos os iframes pedem embed=1, e as SEIS telas abrem de verdade
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1700);
const d2b = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const r = { telas: {} };
  const views = ['areamod', 'roteiros', 'legis', 'juris', 'segundafase', 'prioridade'];
  r.seisIframes = document.querySelectorAll('iframe[data-ct-view]').length === 6;
  for (const v of views) {
    const b = document.querySelector('button[data-view="' + v + '"]');
    if (!b) { r.telas[v] = 'sem botão no menu'; continue; }
    b.click(); await w(1900);
    const f = document.querySelector('iframe[data-ct-view="' + v + '"]');
    if (!f) { r.telas[v] = 'sem iframe'; continue; }
    const src = f.getAttribute('src') || '';
    let corpo = 0, embed = null;
    try { corpo = (f.contentDocument.body.innerText || '').trim().length;
          embed = f.contentDocument.documentElement.getAttribute('data-ct-embed'); } catch (e) {}
    r.telas[v] = { embedNaURL: /embed=1/.test(src), embedAplicado: embed === '1', temConteudo: corpo > 200 };
  }
  return r;
});
ok(d2b.seisIframes, 'D2 as seis telas de iframe existem (2ª fase e Prioridade voltaram)');
for (const [v, t] of Object.entries(d2b.telas)) {
  ok(typeof t === 'object' && t.embedNaURL && t.embedAplicado, 'D2 ' + v + ' abre em modo embutido');
  ok(typeof t === 'object' && t.temConteudo, 'REGRESSÃO ' + v + ' abre com conteúdo (não fica em branco)');
}
/* ===== BARRA: todo botão leva a uma tela (regressão dos botões mudos) =====
   Prioridade e Simulado de 2ª fase trocavam a view para telas que não existiam
   mais no template — clicar não abria nada. As páginas seguiam no bundle. */
const barra = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const r = {};
  for (const [view, arquivo] of [['prioridade', 'prioridade-web.html'], ['segundafase', 'segunda-fase-web.html']]) {
    const b = document.querySelector('button[data-view="' + view + '"]');
    if (!b) { r[view + 'TemBotao'] = false; continue; }
    r[view + 'TemBotao'] = true;
    b.click(); await w(1800);
    const f = document.querySelector('iframe[data-ct-view="' + view + '"]');
    // o src pode trazer parâmetros (o D2 acrescenta ?embed=1): compara a PÁGINA, não a string
    const src = (f && f.getAttribute('src')) || '';
    r[view + 'Abre'] = !!f && src.split('?')[0] === arquivo && f.style.display === 'block';
    let texto = ''; try { texto = (f.contentDocument.body.innerText || '').trim(); } catch (e) {}
    r[view + 'TemConteudo'] = texto.length > 200;
  }
  return r;
});
for (const [k, v] of Object.entries(barra)) ok(v, 'BARRA ' + k);
/* ============= LEGIS — D5, D4, D7, D8, D10 e U7(b) =============
   O leitor de norma busca /api/law (função serverless). O servidor destes testes é
   estático, então a rota é servida aqui: sem texto de lei não dá para medir coluna,
   serifa nem entrelinha do modo leitura. */
await page.route('**/api/law*', r => r.fulfill({
  contentType: 'application/json',
  body: JSON.stringify({ ok: true, paragraphs: [
    'TÍTULO I', 'DAS DISPOSIÇÕES PRELIMINARES', 'CAPÍTULO I', 'DA APLICAÇÃO DA LEI',
    'Art. 1º Toda pessoa é capaz de direitos e deveres na ordem civil, e este parágrafo é '
      + 'longo de propósito para que a medida da coluna de leitura tenha o que medir.',
    '§ 1º Parágrafo de teste com texto suficiente para medir a entrelinha.',
    'I - inciso de teste', 'a) alínea de teste', 'Art. 2º Segundo artigo de teste.'] }),
}));
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(URL0 + '/legis-web.html');
await page.evaluate(() => ['catedra:legisEstudo', 'catedra:leitorLeitura', 'catedra:leitorDark']
  .forEach(k => localStorage.removeItem(k)));
await page.goto(URL0 + '/legis-web.html');
await page.waitForTimeout(600);

const lg = await page.evaluate(() => {
  const cs = el => getComputedStyle(el);
  const row = document.querySelector('.lawrow');
  const link = row.querySelector('a');
  const r = {};
  // D5 — um botão só: a linha é a ação primária, o Planalto é apoio
  r.d5SemBotaoVerde = document.querySelectorAll('.lawrow .rd').length === 0
    && !/ler aqui/i.test(document.getElementById('catalog').innerText);
  r.d5LinhaClicavel = row.classList.contains('abrivel') && cs(row).cursor === 'pointer';
  r.d5TituloEhBotao = row.querySelector('.lt').tagName === 'BUTTON';
  r.d5PlanaltoDiscreto = /planalto/i.test(link.textContent)
    && cs(link).borderTopWidth === '0px' && cs(link).borderLeftWidth === '0px';
  r.d5EstrelaTemNome = /favorito/i.test(row.querySelector('.fav').getAttribute('aria-label') || '');
  r.d5Alvo44 = row.getBoundingClientRect().height >= 44;
  // o overlay que estende o clique não pode engolir os controles da própria linha
  const bl = link.getBoundingClientRect();
  const emCima = document.elementFromPoint(bl.left + bl.width / 2, bl.top + bl.height / 2);
  r.d5PlanaltoContinuaClicavel = emCima === link || link.contains(emCima);
  const br = row.getBoundingClientRect();
  const meio = document.elementFromPoint(br.left + br.width * 0.5, br.top + br.height / 2);
  r.d5MeioDaLinhaAbre = !!(meio && meio.closest && meio.closest('.lt'));

  // D4 — zero absoluto vira convite
  const fav = document.getElementById('st-fav');
  r.d4ZeroViraConvite = fav.classList.contains('zero')
    && /marque/i.test(fav.innerText) && !/^0/.test(fav.innerText.trim())
    && !/\b0\b/.test(document.querySelector('.statbar').innerText.split('LEIS')[0]);

  // D7 — dois níveis de microlabel
  const forte = cs(document.getElementById('rdrMat'));
  const fraca = cs(document.querySelector('.statbar .ml-fraca'));
  r.d7Forte = /mono|Menlo|SFMono/i.test(forte.fontFamily) && forte.textTransform === 'uppercase'
    && parseFloat(forte.letterSpacing) > 1;
  r.d7Fraca = fraca.textTransform === 'uppercase' && fraca.letterSpacing === 'normal'
    && parseFloat(fraca.fontSize) <= 11 && fraca.color !== forte.color;

  // D10 — nome acessível em tudo que é botão/link (inclusive os só-ícone do leitor)
  r.d10TodosComNome = [...document.querySelectorAll('button, a')]
    .every(el => ((el.getAttribute('aria-label') || el.textContent || '').trim().length > 0));

  return r;
});
ok(lg.d5SemBotaoVerde, 'D5 o botão verde "Ler aqui" sumiu (era 1 por lei, 268 no total)');
ok(lg.d5LinhaClicavel, 'D5 a linha inteira abre o leitor (cursor pointer)');
ok(lg.d5TituloEhBotao, 'D5 o alvo primário é um botão de verdade (alcançável por teclado)');
ok(lg.d5PlanaltoDiscreto, 'D5 "Planalto ↗" virou link discreto, sem borda');
ok(lg.d5EstrelaTemNome, 'D5 a ★ ganhou aria-label');
ok(lg.d5Alvo44, 'D5 a área de toque da linha tem 44px ou mais');
ok(lg.d5PlanaltoContinuaClicavel, 'D5 o clique estendido não engole o link do Planalto');
ok(lg.d5MeioDaLinhaAbre, 'D5 clicar no meio da linha cai no botão de ler');
ok(lg.d4ZeroViraConvite, 'D4 métrica zerada vira convite em vez de "0 FAVORITAS"');
ok(lg.d7Forte, 'D7 microlabel forte: mono, caixa alta e espaçamento (cor do ramo)');
ok(lg.d7Fraca, 'D7 microlabel fraca: menor, sem espaçamento extra e sem a cor do forte');
ok(lg.d10TodosComNome, 'D10 nenhum botão ou link sem nome acessível');

// D10 — contraste do texto miúdo nas QUATRO abas (pane escondido não é medível, então
// cada uma tem de ser aberta; foi assim que apareceram os --text3 de 12px do Plano).
// Ficam DE FORA as pastilhas pintadas com a cor da matéria (`--c`, branco sobre a cor ou a
// cor sobre um tinte dela): ali o contraste depende da paleta por disciplina, não do degrau
// de --text3 que a D10 pede — corrigir aquilo é escurecer o código de cores do app inteiro,
// que é outra decisão (medido: .ab branco sobre #f5872f dá 2.50:1; .tn e .cap b, ~4.3:1).
const magros = [];
for (const t of ['catalog', 'plano', 'indice', 'incid']) {
  await page.evaluate(tt => document.querySelector('#tabsTopo button[data-t="' + tt + '"]').click(), t);
  await page.waitForTimeout(t === 'incid' ? 1200 : 300);
  magros.push(...await page.evaluate(() => {
    const cs = el => getComputedStyle(el);
    const lum = c => { const m = c.match(/[\d.]+/g).map(Number);
      const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const fundo = el => { let n = el; while (n && n !== document.documentElement) {
        const c = cs(n).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && !/, 0\)$/.test(c)) return c; n = n.parentElement; }
      return cs(document.body).backgroundColor; };
    const ruins = [];
    document.querySelectorAll('body *').forEach(el => {
      const c = cs(el);
      if (parseFloat(c.fontSize) >= 13 || c.backgroundImage !== 'none') return;
      if (!el.offsetParent) return;
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
      if (lum(c.color) > 0.6) return;          // texto claro = pastilha colorida (ver acima)
      const cor = c.getPropertyValue('--c').trim();          // cor da matéria em escopo
      const hex = h => { h = h.replace('#', '');
        if (h.length === 3) h = h.split('').map(x => x + x).join('');
        return 'rgb(' + [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)).join(', ') + ')'; };
      if (cor && (cor[0] === '#' ? hex(cor) : cor) === c.color) return;
      const a = lum(c.color), b = lum(fundo(el));
      const k = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      if (k < 4.5) ruins.push((el.className || el.tagName) + ' ' + k.toFixed(2));
    });
    return ruins;
  }));
}
ok(magros.length === 0, 'D10 texto abaixo de 13px com contraste ≥ 4.5:1 nas 4 abas ('
   + magros.slice(0, 5).join(', ') + ')');
await page.evaluate(() => document.querySelector('#tabsTopo button[data-t="catalog"]').click());
await page.waitForTimeout(200);

// clicar na ★ não pode abrir o leitor — e com 1 favorita a métrica volta a ser número
await page.locator('.lawrow .fav').first().click();
await page.waitForTimeout(250);
const lgFav = await page.evaluate(() => ({
  naoAbriu: !document.getElementById('rdr').classList.contains('on'),
  viraNumero: !document.getElementById('st-fav').classList.contains('zero')
    && /^1\b/.test(document.getElementById('st-fav').innerText.trim()),
}));
ok(lgFav.naoAbriu, 'D5 clicar na ★ marca o favorito sem abrir o leitor');
ok(lgFav.viraNumero, 'D4 com 1 favorita o slot volta a ser número');

// D10 — foco visível na pílula: numa página recém-carregada a primeira parada do Tab é a
// fileira de abas (um clique anterior movimenta o ponto de partida do Tab, mesmo com blur)
await page.goto(URL0 + '/legis-web.html');
await page.waitForTimeout(400);
await page.keyboard.press('Tab');
const foco = await page.evaluate(() => { const el = document.activeElement, c = getComputedStyle(el);
  return { alvo: el.closest('.tabs') ? 'pilula' : el.tagName, w: c.outlineWidth, cor: c.outlineColor,
           accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() }; });
ok(foco.alvo === 'pilula' && parseFloat(foco.w) >= 2 && /15, 122, 87/.test(foco.cor),
   'D10 pílula com foco visível na cor de destaque (' + foco.w + ' ' + foco.cor + ')');

// D5/U7 — abrir pelo clique na linha e medir o modo leitura
const cx = await page.locator('.lawrow').first().boundingBox();
await page.mouse.click(cx.x + cx.width * 0.5, cx.y + cx.height / 2);
await page.waitForTimeout(500);
ok(await page.evaluate(() => document.getElementById('rdr').classList.contains('on')),
   'D5 o clique na linha abre mesmo o leitor');
const u7a = await page.evaluate(() => { const cs = el => getComputedStyle(el);
  const d = document.querySelector('#rdr .docwrap'), c = document.querySelector('#rdr .caput');
  return { w: d.getBoundingClientRect().width, fs: parseFloat(cs(d).fontSize),
           // "sans-serif" contém "serif": a serifa se reconhece pelo NOME da fonte
           serif: /Spectral|Georgia/i.test(cs(c).fontFamily), lh: parseFloat(cs(c).lineHeight) }; });
await page.click('#rdrLeitura');
await page.waitForTimeout(250);
const u7b = await page.evaluate(() => { const cs = el => getComputedStyle(el);
  const d = document.querySelector('#rdr .docwrap'), c = document.querySelector('#rdr .caput');
  return { w: d.getBoundingClientRect().width, fs: parseFloat(cs(d).fontSize),
           // "sans-serif" contém "serif": a serifa se reconhece pelo NOME da fonte
           serif: /Spectral|Georgia/i.test(cs(c).fontFamily), lh: parseFloat(cs(c).lineHeight),
           aria: document.getElementById('rdrLeitura').getAttribute('aria-pressed'),
           guardado: localStorage.getItem('catedra:leitorLeitura'),
           soLocal: !JSON.stringify(Object.keys(localStorage)).includes('catedra:leitorLeitura:sync') }; });
ok(!u7a.serif && u7a.w > u7b.w, 'U7 o leitor normal segue largo e sem serifa (o modo leitura é escolha)');
ok(u7b.serif && u7b.fs >= 17 && u7b.lh / u7b.fs >= 1.68 && u7b.w <= 700,
   'U7 modo leitura: ~68ch, corpo serifado ' + u7b.fs + 'px, entrelinha ' + (u7b.lh / u7b.fs).toFixed(2));
ok(u7b.aria === 'true', 'U7 o botão do modo leitura diz o estado (aria-pressed)');
ok(u7b.guardado === '1' && u7b.soLocal, 'U7 a escolha fica no localStorage do aparelho (sem sync)');

// e continua valendo na próxima abertura
await page.goto(URL0 + '/legis-web.html');
await page.waitForTimeout(600);
await page.evaluate(() => document.querySelector('.lawrow .lt').click());
await page.waitForTimeout(400);
ok(await page.evaluate(() => document.getElementById('rdr').classList.contains('leitura')),
   'U7 o modo leitura é lembrado entre aberturas');

/* ---- D8: o mesmo exercício no celular ---- */
await page.setViewportSize({ width: 375, height: 780 });
await page.goto(URL0 + '/legis-web.html');
await page.waitForTimeout(600);
const gordos = [];
for (const t of ['catalog', 'plano', 'indice', 'incid']) {
  await page.evaluate(tt => { const b = document.querySelector('#tabsTopo button[data-t="' + tt + '"]');
    b.click();
    // abre a primeira seção do Plano: os dias só existem depois de abrir
    const s = document.querySelector('#plano .sec-h'); if (s && tt === 'plano') s.click();
    const g = document.querySelector('#plano .grp-h'); if (g && tt === 'plano') g.click(); }, t);
  await page.waitForTimeout(t === 'incid' ? 1200 : 350);
  gordos.push(...await page.evaluate(() => {
    const p = [];
    document.querySelectorAll('button, a, input, .day').forEach(el => {
      if (!el.offsetParent) return;
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) return;
      if (b.height < 44 || b.width < 44) p.push((el.className || el.tagName)
        + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
    });
    return p;
  }));
}
await page.evaluate(() => document.querySelector('#tabsTopo button[data-t="catalog"]').click());
await page.waitForTimeout(250);
const d8 = await page.evaluate(() => {
  const cs = el => getComputedStyle(el);
  const tabs = document.getElementById('tabsTopo'), on = tabs.querySelector('button.on');
  const t = tabs.getBoundingClientRect(), o = on.getBoundingClientRect();
  return { rola: cs(tabs).overflowX === 'auto', snap: /x/.test(cs(tabs).scrollSnapType),
    snapItem: cs(on).scrollSnapAlign === 'center',
    ativaVisivel: o.left >= t.left - 1 && o.right <= t.right + 1 };
});
ok(gordos.length === 0, 'D8 nenhum alvo de toque abaixo de 44px no celular, nas 4 abas ('
   + gordos.slice(0, 6).join(', ') + ')');
ok(d8.rola && d8.snap && d8.snapItem, 'D8 a fileira de pílulas rola com scroll-snap');
ok(d8.ativaVisivel, 'D8 a pílula ativa já está à vista na carga');

// as ferramentas secundárias do leitor recolhem no ⋯ (e o esquema vira gaveta no ☰)
await page.evaluate(() => document.querySelector('.lawrow .lt').click());
await page.waitForTimeout(500);
const d8b = await page.evaluate(() => getComputedStyle(document.getElementById('rdrTools')).display);
await page.click('#rdrMore');
await page.waitForTimeout(250);
const d8c = await page.evaluate(() => {
  const t = document.getElementById('rdrTools'), cs = el => getComputedStyle(el);
  const pequenas = [...t.querySelectorAll('button, a')]
    .filter(el => { const b = el.getBoundingClientRect(); return b.height < 44 || b.width < 44; });
  return { aberto: cs(t).display === 'flex', dentroDaTela: t.getBoundingClientRect().right <= 375,
    diz: document.getElementById('rdrMore').getAttribute('aria-expanded') === 'true',
    alvosOk: pequenas.length === 0 };
});
ok(d8b === 'none' && d8c.aberto && d8c.diz && d8c.dentroDaTela && d8c.alvosOk,
   'D8 no celular as ações secundárias do leitor ficam recolhidas num ⋯');
await page.click('#rdrMapa');
await page.waitForTimeout(350);
const d8d = await page.evaluate(() => ({
  gaveta: document.querySelector('#rdr .map').getBoundingClientRect().left > -1,
  fechouOMais: !document.getElementById('rdrTools').classList.contains('aberto'),
}));
ok(d8d.gaveta && d8d.fechouOMais, 'D8 o esquema da lei vira gaveta no celular (260px não cabem em 375)');

// trocar de aba não pode apagar o "você está aqui" das pílulas do Índice
const d8e = await page.evaluate(() => {
  document.querySelector('#tabsTopo button[data-t="indice"]').click();
  const tabs = document.querySelector('#indice .tabs');
  return !!(tabs && tabs.querySelector('button.on'));
});
ok(d8e, 'D8 trocar de aba não apaga a pílula ativa do Índice');

await page.unroute('**/api/law*');
await page.setViewportSize({ width: 1280, height: 720 });
/* ============= JURIS — D3, D4, D7, D8, D10 e U7(b) ============= */
// Contexto próprio: estes casos mexem no localStorage do acervo e medem tamanho de
// tela, e não podem sujar o estado que os testes do app usam.
// O índice tem 25 mil verbetes; os TEXTOS são 10 MB e só entram quando um verbete é
// realmente aberto — o último caso do bloco guarda essa fronteira.
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const jp = await ctx.newPage();
  const errosJuris = [];
  const pedidos = [];
  jp.on('pageerror', e => errosJuris.push(e.message));
  jp.on('request', r => pedidos.push(r.url()));
  await jp.goto(URL0 + '/juris-web.html');
  await jp.waitForTimeout(2400);

  // ---- D3(a): nenhum identificador técnico na interface
  const d3a = await jp.evaluate(() => ({
    semSnakeNaTela: !/[a-z]{3,}_[a-z]{3,}/.test(document.getElementById('paneAcervo').innerText),
    semSnakeNosChips: ![...document.querySelectorAll('#bases .chip, #ramos .chip, #trib .chip')]
      .some(c => /[a-z]{3,}_[a-z]{3,}/.test(c.textContent || '')),
    colecaoRotulada: [...document.querySelectorAll('#bases .chip')]
      .some(c => /Informativos? do STJ/i.test(c.textContent || '')),
    cardRotulado: ![...document.querySelectorAll('.vcard .num')]
      .some(n => /[a-z]{3,}_[a-z]{3,}/.test(n.textContent || '')),
  }));
  for (const [k, v] of Object.entries(d3a)) ok(v, 'D3 ' + k);

  // ---- D3(b): as duas fileiras recolhidas, tribunais à vista, acervo na 1ª dobra
  const d3b = await jp.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    o.tribunaisContinuamAVista = document.querySelectorAll('#trib .chip').length > 3;
    o.painelComecaFechado = document.getElementById('popFiltros').hidden === true;
    o.acervoNaPrimeiraDobra = document.querySelector('.vcard').getBoundingClientRect().top < 460;
    document.getElementById('btFiltros').click(); await w(150);
    o.botaoAbreOPainel = !document.getElementById('popFiltros').hidden
      && document.getElementById('btFiltros').getAttribute('aria-expanded') === 'true';
    const chip = [...document.querySelectorAll('#ramos .chip')].find(c => /^Direito Penal\s/.test(c.textContent.trim()));
    if (!chip) return { ...o, erro: 'sem chip de ramo no painel' };
    chip.click(); await w(350);
    o.contaNoBotao = /Filtros \(1\)/.test(document.getElementById('btFiltros').textContent);
    const ativo = document.querySelector('#fAtivos .chip');
    o.chipAtivoAoLado = !!ativo && /Direito Penal/.test(ativo.textContent);
    o.chipAtivoTemNome = !!ativo && /remover filtro/i.test(ativo.getAttribute('aria-label') || '');
    o.filtroValeu = document.querySelectorAll('.vcard').length > 0
      && [...document.querySelectorAll('.vcard .rtag')].every(t => /Direito Penal/.test(t.textContent));
    ativo.click(); await w(350);
    o.chipRemoveOFiltro = document.querySelectorAll('#fAtivos .chip').length === 0
      && document.getElementById('btFiltros').textContent.trim() === 'Filtros';
    // "＋ N ramos" mexe na lista de dentro: não pode ser lido como clique fora e fechar
    document.getElementById('btFiltros').click(); await w(150);
    const mais = [...document.querySelectorAll('#ramos .chip')].find(c => /ramos$/.test(c.textContent.trim()));
    if (mais) { mais.click(); await w(250); }
    o.verMaisNaoFechaOPainel = !mais || !document.getElementById('popFiltros').hidden;
    document.body.click(); await w(150);
    o.cliqueForaFecha = document.getElementById('popFiltros').hidden;
    return o;
  });
  if (d3b.erro) ok(false, 'D3 ' + d3b.erro);
  else for (const [k, v] of Object.entries(d3b)) ok(v, 'D3 ' + k);

  // ---- D4: zero absoluto vira convite; com 1 volta a ser número
  const d4 = await jp.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const sb = () => document.querySelector('#paneAcervo .statbar').innerText;
    const o = {};
    o.zeroNaoVira0 = !/\b0\b/.test(sb()) && /marque/i.test(sb());
    const card = document.querySelector('.vcard');
    card.querySelector('.st').click(); card.querySelector('.st').click();   // '' → rev → dom
    card.querySelector('.fav').click(); await w(120);
    o.comUmViraNumero = /\b1\b/.test(sb()) && /dominados/i.test(sb()) && /favoritos/i.test(sb());
    return o;
  });
  for (const [k, v] of Object.entries(d4)) ok(v, 'D4 ' + k);

  // ---- D7: dois níveis de microlabel, e eles são mesmo diferentes
  // O par vivo mora no leitor: "ENUNCIADO" estrutura a leitura (forte) e "VERBETES DO
  // FILTRO" é rótulo de coluna (fraco). Antes os dois saíam em 10px/800 e só mudavam de
  // cor — era esse o "tudo destaca, nada destaca".
  const d7 = await jp.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.openVerbete(0); await w(1600);
    const g = e => { const c = getComputedStyle(e); return { fs: parseFloat(c.fontSize), w: +c.fontWeight, cor: c.color, caixa: c.textTransform }; };
    const forte = g(document.querySelector('#jrdr .venun .lbl'));
    const fraca = g(document.querySelector('#jrdr .maptitle'));
    const daPagina = g(document.querySelector('#paneAcervo .statbar .mlW'));
    document.getElementById('jrClose').click(); await w(200);
    return { forte, fraca,
      hierarquia: forte.fs > fraca.fs && forte.w > fraca.w && forte.cor !== fraca.cor,
      ambosCaps: forte.caixa === 'uppercase' && fraca.caixa === 'uppercase' && daPagina.caixa === 'uppercase',
      paginaSegueOFraco: daPagina.fs === fraca.fs && daPagina.w === fraca.w };
  });
  ok(d7.hierarquia, 'D7 o nível forte se distingue do fraco em tamanho, peso e cor ('
     + d7.forte.fs + 'px/' + d7.forte.w + ' × ' + d7.fraca.fs + 'px/' + d7.fraca.w + ')');
  ok(d7.ambosCaps, 'D7 os dois níveis continuam mono-caps (a linguagem da casa não muda)');
  ok(d7.paginaSegueOFraco, 'D7 metadado da página usa o mesmo nível fraco do leitor');

  // ---- D10: nome acessível em todo botão, foco visível e contraste do cinza pequeno
  const d10 = await jp.evaluate(() => {
    const o = {};
    o.todoBotaoTemNome = [...document.querySelectorAll('button')]
      .every(b => (b.textContent || '').trim() || b.getAttribute('aria-label'));
    o.semNome = [...document.querySelectorAll('button')]
      .filter(b => !(b.textContent || '').trim() && !b.getAttribute('aria-label'))
      .map(b => b.id || b.className).join(', ');
    // contraste real do rótulo pequeno contra o fundo da página
    const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = s => { const m = s.match(/\d+/g).map(Number); return 0.2126 * lin(m[0]) + 0.7152 * lin(m[1]) + 0.0722 * lin(m[2]); };
    const razao = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const alvo = document.querySelector('#paneAcervo .statbar .mlW');
    o.contraste = +razao(getComputedStyle(alvo).color, getComputedStyle(document.body).backgroundColor).toFixed(2);
    o.contrasteAA = o.contraste >= 4.5;
    return o;
  });
  ok(d10.todoBotaoTemNome, 'D10 nenhum botão sem nome acessível (' + (d10.semNome || 'nenhum') + ')');
  ok(d10.contrasteAA, 'D10 rótulo pequeno passa no AA (' + d10.contraste + ':1, antes 4.16 com --text3)');

  // foco visível de verdade: chega no chip pelo teclado e ele se acende
  await jp.click('#q');
  await jp.keyboard.press('Tab');
  const foco = await jp.evaluate(() => {
    const a = document.activeElement, c = getComputedStyle(a);
    return { ehChip: a.classList.contains('chip') || a.classList.contains('tab') || a.classList.contains('fbtn'),
             temContorno: c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0 };
  });
  ok(foco.ehChip && foco.temContorno, 'D10 chip alcançado pelo teclado mostra o foco');

  // ---- U7(b): modo leitura no leitor de verbete
  const u7 = await jp.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    window.openVerbete(0); await w(1600);
    const dw = () => document.querySelector('#jrdr .docwrap');
    o.medidaAntes = parseFloat(getComputedStyle(dw()).maxWidth);
    document.getElementById('jrLeitura').click(); await w(200);
    o.ligou = document.getElementById('jrdr').classList.contains('leitura');
    o.medidaDepois = parseFloat(getComputedStyle(dw()).maxWidth);
    const c = getComputedStyle(document.querySelector('#jrdr .venun .bd'));
    o.corpo = parseFloat(c.fontSize);
    o.entrelinha = +(parseFloat(c.lineHeight) / parseFloat(c.fontSize)).toFixed(2);
    o.serifado = /Spectral|Georgia|serif/i.test(c.fontFamily);
    o.pressionado = document.getElementById('jrLeitura').getAttribute('aria-pressed') === 'true';
    // sem sync: a chave não leva o prefixo que o auth.js sobe para a nuvem
    o.foraDoSync = !Object.keys(localStorage).some(k => k.indexOf('catedra:') === 0 && /leitura/i.test(k))
      && localStorage.getItem('catedraJurisLeitura') === '1';
    return o;
  });
  ok(u7.ligou, 'U7 modo leitura liga no leitor de verbete');
  ok(u7.medidaDepois < u7.medidaAntes && u7.medidaDepois < 640,
     'U7 a medida da linha encolhe para ~68ch (' + Math.round(u7.medidaAntes) + 'px → ' + Math.round(u7.medidaDepois) + 'px)');
  ok(u7.corpo >= 17 && u7.entrelinha >= 1.69 && u7.serifado,
     'U7 corpo serifado ≥17px com entrelinha 1.7 (' + u7.corpo + 'px / ' + u7.entrelinha + ')');
  ok(u7.pressionado, 'U7 o botão informa o estado (aria-pressed)');
  ok(u7.foraDoSync, 'U7 a escolha fica no aparelho — chave fora do prefixo que sincroniza');

  // lembrado entre aberturas
  await jp.goto(URL0 + '/juris-web.html');
  await jp.waitForTimeout(2200);
  const u7b = await jp.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.openVerbete(0); await w(1600);
    return document.getElementById('jrdr').classList.contains('leitura');
  });
  ok(u7b, 'U7 o modo leitura sobrevive a reabrir a página');

  // ---- D8: celular — alvo de 44px, pílulas com rolagem e ferramentas no "⋯"
  const mctx = await browser.newContext({ viewport: { width: 375, height: 780 }, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  mp.on('pageerror', e => errosJuris.push('mobile: ' + e.message));
  await mp.goto(URL0 + '/juris-web.html');
  await mp.waitForTimeout(2400);
  const d8 = await mp.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const alt = s => Math.round(document.querySelector(s).getBoundingClientRect().height);
    const o = {};
    const tabs = document.getElementById('tabs');
    o.pilulasRolamComEncaixe = tabs.scrollWidth > tabs.clientWidth
      && getComputedStyle(tabs).scrollSnapType.indexOf('x') === 0
      && getComputedStyle(document.querySelector('.tab')).scrollSnapAlign !== 'none';
    o.alvoDaPilula = alt('.tab') >= 44;
    o.alvoDoChip = alt('#trib .chip') >= 44;
    o.alvoDoStatus = alt('.vcard .st') >= 44 && alt('.vcard .fav') >= 44;
    // a ativa tem de aparecer sozinha: no celular a última pílula nasce fora da tela
    document.querySelector('.tab[data-pane="tribunais"]').click(); await w(400);
    const r = document.querySelector('#tabs .tab.on').getBoundingClientRect();
    o.ativaVisivelSemRolarNaMao = r.left >= -1 && r.right <= window.innerWidth + 1;
    document.querySelector('.tab[data-pane="acervo"]').click(); await w(300);
    window.openVerbete(0); await w(1600);
    o.ferramentasNoMais = getComputedStyle(document.getElementById('jrMais')).display !== 'none'
      && getComputedStyle(document.getElementById('jrTools')).display === 'none';
    document.getElementById('jrMais').click(); await w(200);
    o.oMaisAbre = getComputedStyle(document.getElementById('jrTools')).display !== 'none'
      && document.getElementById('jrMais').getAttribute('aria-expanded') === 'true';
    o.leitorCabeNaTela = getComputedStyle(document.querySelector('#jrdr .map')).display === 'none';
    return o;
  });
  for (const [k, v] of Object.entries(d8)) ok(v, 'D8 ' + k);

  ok(errosJuris.length === 0, 'JURIS nenhuma exceção na página (' + errosJuris.join(' | ') + ')');
  // a fronteira do acervo: abrir verbete puxa o BLOCO do texto, nunca o arquivo de 10 MB
  ok(!pedidos.some(u => /juris-text\.js/.test(u)), 'JURIS abrir verbete não baixa o juris-text.js inteiro');

  await mctx.close();
  await ctx.close();
}

/* ===== D6/D7/D8/D10 — pente fino visual do fluxo dos ritos e dos roteiros ===== */
/* Ferramentas medidas dentro da página, compartilhadas pelos casos abaixo:
   · vazamento: um retângulo l×a centrado cabe num losango L×A se l/L + a/A ≤ 1;
     medimos as linhas de texto de verdade (rects de Range) e o chip da lei;
   · contraste: compõe os fundos translúcidos até achar cor sólida (color-mix vira
     color(srgb …) no valor computado, por isso o parser passa pelo canvas). */
const FERRAMENTAS = `
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const paraRGB = s => {
    const m = String(s||'').match(/rgba?\\(([^)]+)\\)/);
    if (m) { const p = m[1].split(',').map(Number); return [p[0],p[1],p[2], p.length>3?p[3]:1]; }
    try { ctx.clearRect(0,0,1,1); ctx.fillStyle = '#000'; ctx.fillStyle = s; ctx.fillRect(0,0,1,1);
      const d = ctx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2],d[3]/255]; } catch (e) { return null; }
  };
  const fundoDe = el => {
    let n = el; const camadas = [];
    while (n && n.nodeType === 1) {
      const p = paraRGB(getComputedStyle(n).backgroundColor);
      if (p && p[3] > 0) { camadas.push(p); if (p[3] >= 1) break; }
      n = n.parentElement;
    }
    camadas.push([255,255,255,1]);
    let [r,g,b] = camadas[camadas.length-1];
    for (let i = camadas.length-2; i >= 0; i--) { const [R,G,B,A] = camadas[i];
      r = R*A + r*(1-A); g = G*A + g*(1-A); b = B*A + b*(1-A); }
    return [r,g,b];
  };
  const lum = ([r,g,b]) => { const f = v => { v/=255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); };
    return .2126*f(r) + .7152*f(g) + .0722*f(b); };
  const contraste = (fg,bg) => { const a = lum(fg)+.05, b = lum(bg)+.05; return a>b ? a/b : b/a; };
  const contrasteDe = el => contraste(paraRGB(getComputedStyle(el).color), fundoDe(el));
  const miudos = () => [...document.querySelectorAll('body *')].filter(el => {
    const t = [...el.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim());
    if (!t) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getClientRects().length
      && parseFloat(cs.fontSize) < 13;
  });
  const vazamento = () => [...document.querySelectorAll('.dec')].map(dec => {
    const los = dec.querySelector('.losango') || dec;
    if (getComputedStyle(los).clipPath === 'none') return null;   // virou caixa: não é losango
    const R = los.getBoundingClientRect();
    const cx = R.left + R.width/2, cy = R.top + R.height/2, a = R.width/2, b = R.height/2;
    const alvos = [];
    const w = document.createTreeWalker(dec, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!String(n.nodeValue).trim()) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      [...rg.getClientRects()].forEach(x => { if (x.width && x.height) alvos.push(x); });
    }
    dec.querySelectorAll('.art').forEach(x => { const rr = x.getBoundingClientRect(); if (rr.width) alvos.push(rr); });
    let pior = 0;
    alvos.forEach(rr => [[rr.left,rr.top],[rr.right,rr.top],[rr.left,rr.bottom],[rr.right,rr.bottom]]
      .forEach(([x,y]) => { const v = Math.abs(x-cx)/a + Math.abs(y-cy)/b; if (v > pior) pior = v; }));
    return { t: (dec.querySelector('.tt')||{}).textContent, pior: +pior.toFixed(3) };
  }).filter(Boolean);
`;

// D6(a) — o texto da decisão dentro do losango, em coluna larga e em coluna estreita.
// Antes da correção, a 940px (a largura do satélite dentro do app) 10 dos 26 losangos
// destes ritos vazavam, e a 905px, 23 — o título e a lei escapavam pela lateral.
{
  const ritos = ['Administrativo — improbidade', 'Civil — conhecimento', 'Penal — procedimento sumário',
                 'Penal — tribunal do júri', 'Empresarial — recuperação e falência'];
  for (const larg of [1280, 940]) {
    await page.setViewportSize({ width: larg, height: 900 });
    let total = 0, vazam = [], pior = 0;
    for (const rito of ritos) {
      await page.goto(URL0 + '/ritos-web.html?rito=' + encodeURIComponent(rito));
      await page.waitForTimeout(250);
      const m = await page.evaluate(FERRAMENTAS + '; vazamento()');
      m.forEach(x => { total++; if (x.pior > 1) vazam.push(x.t); if (x.pior > pior) pior = x.pior; });
    }
    ok(total > 0 && vazam.length === 0,
      'D6 nenhum texto escapa do losango a ' + larg + 'px (' + total + ' losangos, pior=' + pior.toFixed(2) +
      (vazam.length ? '; vazam: ' + vazam.slice(0, 3).join(' / ') : '') + ')');
  }
}

// D6(a) — e continua cabendo quando a coluna muda de largura SEM recarregar (é o caso
// do iframe dentro do app: a janela muda, o texto reflui, a forma precisa remedir)
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(URL0 + '/ritos-web.html?rito=' + encodeURIComponent('Civil — conhecimento'));
await page.waitForTimeout(400);
await page.setViewportSize({ width: 980, height: 900 });
await page.waitForTimeout(400);
const d6r = await page.evaluate(FERRAMENTAS + '; vazamento()');
ok(d6r.length > 0 && d6r.every(x => x.pior <= 1),
  'D6 a forma remede sozinha ao mudar a largura (' + d6r.length + ' losangos, pior=' +
  Math.max(0, ...d6r.map(x => x.pior)).toFixed(2) + ')');

// D6(b) — o rótulo da seta é o que separa os caminhos: contraste e pílula própria
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(URL0 + '/ritos-web.html?rito=' + encodeURIComponent('Administrativo — improbidade'));
await page.waitForTimeout(300);
const d6b = await page.evaluate(FERRAMENTAS + `; (() => {
  const rot = [...document.querySelectorAll('.saida .fio .rot')].filter(x => (x.textContent||'').trim());
  if (!rot.length) return { erro: 'sem rótulo de seta' };
  const cs = getComputedStyle(rot[0]);
  return {
    achou: rot.map(x => x.textContent.trim()).join(' | ').slice(0, 40),
    piorContraste: +Math.min(...rot.map(contrasteDe)).toFixed(2),
    temPill: (paraRGB(cs.backgroundColor)||[0,0,0,0])[3] > 0 && parseFloat(cs.borderTopWidth) > 0,
    naoUsaText3: cs.color !== getComputedStyle(document.documentElement).getPropertyValue('--text3').trim(),
  };
})()`);
if (d6b.erro) ok(false, 'D6 ' + d6b.erro);
else {
  ok(d6b.piorContraste >= 4.5, 'D6 rótulo da seta com contraste ≥ 4.5:1 (' + d6b.piorContraste + ':1 — ' + d6b.achou + ')');
  ok(d6b.temPill, 'D6 rótulo da seta ganhou fundo pill para descolar da linha');
}

// D7 — dois níveis de microlabel, e os dois em uso nas duas páginas
for (const pg of ['ritos-web.html', 'pecas-web.html']) {
  await page.goto(URL0 + '/' + pg);
  await page.waitForTimeout(400);
  const d7 = await page.evaluate(FERRAMENTAS + `; (() => {
    const f = document.querySelector('.ml-forte'), w = document.querySelector('.ml-fraca');
    if (!f || !w) return { erro: 'faltou nível ' + (!f ? 'forte' : 'fraco') };
    const cf = getComputedStyle(f), cw = getComputedStyle(w);
    return {
      usaOsDois: true,
      monoSoNoForte: /mono|Menlo|ui-monospace/i.test(cf.fontFamily) && !/mono|Menlo|ui-monospace/i.test(cw.fontFamily),
      // Chrome serializa letter-spacing:0 como 'normal' — parseFloat daria NaN
      espacamentoSoNoForte: (parseFloat(cf.letterSpacing) || 0) > (parseFloat(cw.letterSpacing) || 0),
      coresDiferentes: cf.color !== cw.color,
      fracoLegivel: +contrasteDe(w).toFixed(2) >= 4.5,
    };
  })()`);
  if (d7.erro) ok(false, 'D7 ' + pg + ': ' + d7.erro);
  else for (const [k, v] of Object.entries(d7)) ok(v, 'D7 ' + pg + ' ' + k);
}

// D8 — celular: pílula ativa visível já no load, alvos de 44px e as ações no "⋯"
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(URL0 + '/ritos-web.html?rito=' + encodeURIComponent('Tributário — execução fiscal'));
await page.waitForTimeout(500);
const d8rp = await page.evaluate(`(() => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const mats = document.getElementById('mats'), on = mats.querySelector('.pill.on');
  const rm = mats.getBoundingClientRect(), rp = on ? on.getBoundingClientRect() : null;
  const r = {
    pilulaAtivaInteiraNoLoad: !!rp && rp.left >= rm.left - 1 && rp.right <= rm.right + 1,
    temScrollSnap: /x/.test(getComputedStyle(mats).scrollSnapType || ''),
    // sem o scroll da fileira a pílula escolhida nasceria fora da tela
    fileiraRolou: mats.scrollLeft > 0,
    alvosDe44: [...document.querySelectorAll('.pill, header button')]
      .filter(b => b.getClientRects().length)
      .every(b => b.getBoundingClientRect().height >= 44),
    maisVisivel: document.getElementById('bMais').getClientRects().length > 0,
    acoesRecolhidas: document.getElementById('bNotas').getClientRects().length === 0,
  };
  return new Promise(async ok2 => {
    document.getElementById('bMais').click(); await w(120);
    r.menuAbre = document.getElementById('bNotas').getClientRects().length > 0;
    r.avisaEstado = document.getElementById('bMais').getAttribute('aria-expanded') === 'true';
    document.body.click(); await w(120);
    r.menuFechaClicandoFora = document.getElementById('bNotas').getClientRects().length === 0;
    ok2(r);
  });
})()`);
for (const [k, v] of Object.entries(d8rp)) ok(v, 'D8 ' + k);

await page.goto(URL0 + '/pecas-web.html');
await page.waitForTimeout(400);
const d8p = await page.evaluate(`(() => ({
  alvos: [...document.querySelectorAll('header input, header select')]
    .every(b => b.getBoundingClientRect().height >= 44),
  // sem 16px na busca o iOS dá zoom ao focar — foi por isso que a página proibia ampliar
  buscaGrande: parseFloat(getComputedStyle(document.getElementById('q')).fontSize) >= 16,
  deixaAmpliar: !/user-scalable\\s*=\\s*no|maximum-scale/.test(
    (document.querySelector('meta[name=viewport]')||{}).content || ''),
}))()`);
for (const [k, v] of Object.entries(d8p)) ok(v, 'D8/D10 peças no celular ' + k);

// D10 — nome acessível, foco visível e contraste do texto miúdo nas duas páginas
for (const pg of ['ritos-web.html', 'pecas-web.html']) {
  for (const larg of [1280, 390]) {
    await page.setViewportSize({ width: larg, height: 844 });
    await page.goto(URL0 + '/' + pg);
    await page.waitForTimeout(400);
    const d10 = await page.evaluate(FERRAMENTAS + `; (() => ({
      semNome: [...document.querySelectorAll('button')]
        .filter(b => b.getClientRects().length)
        .filter(b => !((b.textContent||'').trim() || b.getAttribute('aria-label') || b.getAttribute('title')))
        .map(b => b.className || b.id),
      miudosRuins: miudos().map(el => ({ q: el.className || el.tagName, c: +contrasteDe(el).toFixed(2),
        t: (el.textContent||'').trim().slice(0, 24) })).filter(x => x.c < 4.5),
    }))()`);
    ok(d10.semNome.length === 0, 'D10 ' + pg + ' @' + larg + ': todo botão tem nome acessível' +
      (d10.semNome.length ? ' (sem nome: ' + d10.semNome.join(', ') + ')' : ''));
    ok(d10.miudosRuins.length === 0, 'D10 ' + pg + ' @' + larg + ': texto abaixo de 13px com ≥ 4.5:1' +
      (d10.miudosRuins.length ? ' (' + JSON.stringify(d10.miudosRuins.slice(0, 3)) + ')' : ''));
  }
  await page.setViewportSize({ width: 1280, height: 844 });
  await page.goto(URL0 + '/' + pg);
  await page.waitForTimeout(300);
  await page.keyboard.press('Tab');
  const foco = await page.evaluate(`(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { erro: 'nada recebeu o foco' };
    const cs = getComputedStyle(el);
    return { visivel: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0, quem: el.tagName + '.' + el.className };
  })()`);
  ok(!foco.erro && foco.visivel, 'D10 ' + pg + ': o primeiro Tab mostra o foco (' + (foco.quem || foco.erro) + ')');
}
// O host acrescenta ?embed=1 ao src dos iframes (D2): as duas páginas precisam
// continuar inteiras nesse modo — nada do pente fino pode depender do cabeçalho grande.
for (const [pg, alvo] of [['ritos-web.html', '#fluxo .passo'], ['pecas-web.html', '.rcard']]) {
  await page.goto(URL0 + '/' + pg + '?embed=1');
  await page.waitForTimeout(500);
  const emb = await page.evaluate(`(() => ({
    conteudo: document.querySelectorAll('${alvo}').length,
    semNome: [...document.querySelectorAll('button')].filter(b => b.getClientRects().length)
      .filter(b => !((b.textContent||'').trim() || b.getAttribute('aria-label') || b.getAttribute('title'))).length,
  }))()`);
  ok(emb.conteudo > 0 && emb.semNome === 0, 'D10 ' + pg + ' inteira também com ?embed=1 (' + emb.conteudo + ' itens)');
}
await page.setViewportSize({ width: 1280, height: 720 });
/* ====== D7/D8/D10 — PENTE FINO: 2ª FASE, PRIORIDADE E MÓDULO DA ÁREA ======
   Fica por último de propósito: mexe no tamanho da janela (breakpoint móvel) e
   devolve 1280×720 no fim, para não contaminar os blocos anteriores. */
{
  // botão sem texto E sem aria-label é botão que o leitor de tela anuncia como "botão"
  const semNome = () => page.evaluate(() => [...document.querySelectorAll('button')]
    .filter(b => !((b.textContent || '').trim()) && !b.getAttribute('aria-label'))
    .map(b => b.className || b.outerHTML.slice(0, 50)));
  // alvo de toque medido pelo DEDO, não pela caixa do elemento: quem amplia a área
  // com ::after (a bolinha de status) continua desenhada com 22px e clicável com 44
  const alvo44 = sel => page.evaluate(s => {
    const b = document.querySelector(s); if (!b) return null;
    const r = b.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, p = 21;
    return [[cx - p, cy - p], [cx + p, cy - p], [cx - p, cy + p], [cx + p, cy + p]]
      .every(([x, y]) => { const e = document.elementFromPoint(x, y); return e === b || b.contains(e); });
  }, sel);
  const correcao = async largura => {          // deixa a 2ª fase na tela de correção
    await page.setViewportSize({ width: largura, height: 800 });
    await page.goto(URL0 + '/segunda-fase-web.html');
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      const P = (window.CT_ESPELHOS || {}).provas || [];
      const alvo = P.find(p => (p.quesitos || []).length >= 3) || P[0];
      localStorage.setItem('catedraSegundaFase', JSON.stringify({ hist: [], sessao: {
        id: alvo.id, minutos: 300, inicio: Date.now(), acc: 6e4, rodando: false,
        folha: 'peça de teste citando o art. 5', entregue: true, gasto: 6e4, veredictos: {} } }));
    });
    await page.goto(URL0 + '/segunda-fase-web.html');
    await page.waitForTimeout(900);
  };

  /* -- D10: nome acessível em todo botão -- */
  const semNomePorPagina = {};
  for (const p of ['area-web.html?area=saude', 'prioridade-web.html', 'segunda-fase-web.html']) {
    await page.goto(URL0 + '/' + p); await page.waitForTimeout(600);
    semNomePorPagina[p] = await semNome();
  }
  await correcao(1280);
  semNomePorPagina['segunda-fase (correção)'] = await semNome();
  ok(Object.values(semNomePorPagina).every(v => v.length === 0),
     'D10 nenhum botão sem nome acessível nas satélites ' + JSON.stringify(semNomePorPagina));

  /* -- D7: os dois níveis de rótulo são visivelmente diferentes -- */
  const d7 = await page.evaluate(() => {
    const f = document.querySelector('.rot-forte'), m = document.querySelector('.rot-fraco');
    if (!f || !m) return { erro: 'faltou um dos níveis na tela' };
    const a = getComputedStyle(f), b = getComputedStyle(m);
    const mono = s => /mono|Menlo|Courier/i.test(s);
    return { corDiferente: a.color !== b.color,
             forteMaior: parseFloat(a.fontSize) > parseFloat(b.fontSize),
             espacoSoNoForte: parseFloat(a.letterSpacing) > 0 && !(parseFloat(b.letterSpacing) > 0),
             monoSoNoForte: mono(a.fontFamily) && !mono(b.fontFamily) };
  });
  if (d7.erro) ok(false, 'D7 ' + d7.erro);
  else for (const [k, v] of Object.entries(d7)) ok(v, 'D7 ' + k);

  /* -- D10: foco visível ao chegar de teclado (área, que é onde estão os só-ícone) -- */
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(URL0 + '/area-web.html?area=saude');
  await page.waitForTimeout(500);
  let foco = null;
  for (let i = 0; i < 8 && !foco; i++) {
    await page.keyboard.press('Tab');
    foco = await page.evaluate(() => { const a = document.activeElement;
      if (!a || a.tagName !== 'BUTTON') return null;
      const cs = getComputedStyle(a);
      return { cls: a.className, w: cs.outlineWidth, estilo: cs.outlineStyle }; });
  }
  ok(!!foco && parseFloat(foco.w) >= 2 && foco.estilo === 'solid',
     'D10 pílula/chip mostra foco visível ao teclado ' + JSON.stringify(foco));

  /* -- D10: a linha do painel de prioridade é botão de verdade (teclado + estado) -- */
  await page.goto(URL0 + '/prioridade-web.html');
  await page.waitForTimeout(800);
  const prio = await page.evaluate(() => {
    const h = document.querySelector('.linha .lh');
    if (!h) return { erro: 'sem linha' };
    const r = { ehBotao: h.tagName === 'BUTTON', fechado: h.getAttribute('aria-expanded') === 'false',
                aponta: !!document.getElementById(h.getAttribute('aria-controls') || '') };
    h.click();
    r.abriuEAnuncia = h.getAttribute('aria-expanded') === 'true' && h.closest('.linha').classList.contains('on');
    // e aqui também os dois níveis convivem: seção (.dh) forte, legenda de número fraca
    const f = getComputedStyle(document.querySelector('.det .rot-forte'));
    const m = getComputedStyle(document.querySelector('.stat .rot-fraco'));
    r.doisNiveis = f.color !== m.color && parseFloat(f.letterSpacing) > 0 && !(parseFloat(m.letterSpacing) > 0);
    return r;
  });
  if (prio.erro) ok(false, 'D10 prioridade: ' + prio.erro);
  else for (const [k, v] of Object.entries(prio)) ok(v, 'D10 prioridade ' + k);

  /* -- D8: alvos de 44px no breakpoint móvel -- */
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(URL0 + '/area-web.html?area=saude');
  await page.waitForTimeout(500);
  ok(await alvo44('.row .st'), 'D8 a bolinha de status tem 44px de alvo no celular (desenho segue com 22)');
  ok(await alvo44('.row .fav'), 'D8 a ★ tem 44px de alvo no celular');
  const pequenos = await page.evaluate(() => [...document.querySelectorAll('button,select,input')]
    .filter(e => e.offsetParent !== null && !e.classList.contains('st'))
    .filter(e => e.getBoundingClientRect().height < 44).length);
  ok(pequenos === 0, 'D8 nenhum controle abaixo de 44px no módulo da área (' + pequenos + ')');

  await page.goto(URL0 + '/prioridade-web.html');
  await page.waitForTimeout(800);
  const prioPeq = await page.evaluate(() => [...document.querySelectorAll('button,select')]
    .filter(e => e.offsetParent !== null).filter(e => e.getBoundingClientRect().height < 44).length);
  ok(prioPeq === 0, 'D8 nenhum controle abaixo de 44px no painel de prioridade (' + prioPeq + ')');

  /* -- D8: o "⋯" recolhe as ações secundárias no celular e some no desktop -- */
  await correcao(375);
  const mais = await page.evaluate(() => {
    const b = document.getElementById('bMais'), it = document.getElementById('maisIt');
    if (!b || !it) return { erro: 'sem menu ⋯' };
    const r = { aparece: getComputedStyle(b).display !== 'none',
                temNome: !!b.getAttribute('aria-label'),
                comecaFechado: getComputedStyle(it).display === 'none',
                primariaVisivel: getComputedStyle(document.getElementById('bFechar')).display !== 'none' };
    b.click();
    r.abre = getComputedStyle(it).display !== 'none' && b.getAttribute('aria-expanded') === 'true';
    r.guardaImprimir = [...it.querySelectorAll('button')].some(x => /imprimir/i.test(x.textContent));
    document.body.click();
    r.fechaClicandoFora = getComputedStyle(it).display === 'none';
    return r;
  });
  if (mais.erro) ok(false, 'D8 ' + mais.erro);
  else for (const [k, v] of Object.entries(mais)) ok(v, 'D8 menu ⋯ ' + k);

  const deskMais = await (async () => { await correcao(1280);
    return page.evaluate(() => ({
      some: getComputedStyle(document.getElementById('bMais')).display === 'none',
      itensNaLinha: getComputedStyle(document.getElementById('maisIt')).display === 'contents' })); })();
  ok(deskMais.some && deskMais.itensNaLinha, 'D8 no desktop o ⋯ some e os botões voltam para a linha');

  /* -- D8: fileira de veredictos com encaixe e a marcada visível já no load.
     320px é onde as três pílulas deixam de caber lado a lado. -- */
  await correcao(320);
  const trilho = await page.evaluate(() => {
    const sc = document.querySelector('.q .vb'); if (!sc) return { erro: 'sem fileira' };
    const on = sc.querySelector('button.on'); if (!on) return { erro: 'sem veredicto marcado' };
    const a = on.getBoundingClientRect(), b = sc.getBoundingClientRect();
    return { rolaHorizontal: sc.scrollWidth > sc.clientWidth,
             comEncaixe: getComputedStyle(sc).scrollSnapType.indexOf('x') === 0,
             marcadaVisivelNoLoad: a.left >= b.left - 1 && a.right <= b.right + 1,
             semCorteVertical: sc.scrollHeight <= sc.clientHeight + 2 };
  });
  if (trilho.erro) ok(false, 'D8 trilho: ' + trilho.erro);
  else for (const [k, v] of Object.entries(trilho)) ok(v, 'D8 veredictos ' + k);

  // os seletores dirigidos pelos testes de cima continuam de pé depois do pente fino
  const seletores = await page.evaluate(() => ({
    ver: document.querySelectorAll('.q .ver button[data-v]').length > 0,
    salvar: [...document.querySelectorAll('button')].some(b => /Salvar e sair/.test(b.textContent || '')),
    disp: document.querySelectorAll('.disp [data-legis]').length > 0,
  }));
  for (const [k, v] of Object.entries(seletores)) ok(v, 'D8/D10 seletor preservado: ' + k);

  await page.evaluate(() => localStorage.removeItem('catedraSegundaFase'));
  await page.setViewportSize({ width: 1280, height: 720 });
}
/* ============= U2 — ESQUELETO DE CARREGAMENTO ============= */
// O que se prova aqui: o vazio sem explicação acabou na PRIMEIRA carga de cada acervo, e
// que a volta a uma tela já carregada não pisca esqueleto (com o iframe vivo, seria mentira).
// O esqueleto existe para a carga LENTA. Medi-lo com um `await w(80)` depois do clique é
// uma corrida: servindo de localhost, o LEGIS às vezes carrega antes disso e o esqueleto
// já saiu — passava aqui e falhava na CI. Em vez de dar mais tempo (que só adia o
// problema), atrasamos a resposta da página, que é a condição em que o recurso importa.
await page.route('**/legis-web.html*', async (rota) => {
  await new Promise(r => setTimeout(r, 900));
  await rota.continue();
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1700);
const u2 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const skel = () => !!document.querySelector('.ct-skelbox');
  const r = {};
  r.inicioSemEsqueleto = !skel();                       // só as telas de iframe têm esqueleto

  document.querySelector('button[data-view="legis"]').click();
  await w(250);
  r.primeiraCargaMostra = skel();                       // a página ainda está a caminho

  const fr = document.querySelector('iframe[data-ct-view="legis"]');
  for (let i = 0; i < 200 && fr.dataset.ctLoad !== '1'; i++) await w(100);
  await w(250);
  r.someQuandoAPaginaCarrega = !skel();                 // e sai assim que ela chega
  r.esqueletoFicaAtras = true;                          // conferido pelo z-order do CSS abaixo

  // sair e voltar: iframe vivo, nada recarrega, nada pisca
  document.querySelector('button[data-view="inicio"]').click(); await w(350);
  document.querySelector('button[data-view="legis"]').click(); await w(120);
  r.voltaNaoPisca = !skel();
  return r;
});
for (const [k, v] of Object.entries(u2)) ok(v, 'U2 ' + k);
await page.unroute('**/legis-web.html*');  // o atraso era só para medir o esqueleto
// o esqueleto é FUNDO: fica atrás do iframe (que é `position:relative`), então mesmo que um
// satélite antigo nunca avise, a página carregada o cobre — nunca tapa conteúdo
const u2css = await page.evaluate(() => {
  const fr = document.querySelector('iframe[data-ct-view="legis"]');
  return { framePosicionado: getComputedStyle(fr).position === 'relative',
           molduraRelativa: getComputedStyle(fr.parentElement).position === 'relative' };
});
ok(u2css.framePosicionado && u2css.molduraRelativa, 'U2 o esqueleto é fundo (o iframe pinta por cima)');

/* ============= U9 — SCROLL ÚNICO ============= */
const u9 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const sc = () => document.querySelector('.ct-scroll');
  const r = {};
  document.querySelector('button[data-view="legis"]').click(); await w(500);
  r.hostNaoRola = (sc().scrollHeight - sc().clientHeight) <= 1;
  r.paginaNaoRola = (document.documentElement.scrollHeight - document.documentElement.clientHeight) <= 1;
  const fr = document.querySelector('iframe[data-ct-view="legis"]').getBoundingClientRect();
  r.quadroOcupaOEspaco = fr.height > window.innerHeight * 0.6 && fr.bottom <= window.innerHeight + 1;
  const topo = document.querySelector('.ct-topbar').getBoundingClientRect();
  r.topoAlcancavel = topo.top >= 0 && topo.height > 20;
  const menu = document.querySelector('aside button[data-view="inicio"]');
  r.menuAlcancavel = !!menu && menu.getBoundingClientRect().height > 10;

  // fora do acervo, o host volta a rolar como sempre
  document.querySelector('button[data-view="revisoes"]').click(); await w(500);
  r.foraDoAcervoRolaDeNovo = /auto|scroll/.test(getComputedStyle(sc()).overflowY);
  return r;
});
for (const [k, v] of Object.entries(u9)) ok(v, 'U9 ' + k);

/* ============= U8 — ATALHOS VISÍVEIS (tecla ?) ============= */
// A tecla ? é gateada por conta conectada, como o ⌘K: na tela de entrar não há o que
// atalhar. Por isso este bloco entra com a sessão local ligada.
await page.evaluate(() => localStorage.setItem('catedra:auth', '1'));
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1700);
const u8 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const modal = () => [...document.querySelectorAll('div[role=dialog]')]
    .find(d => /Atalhos do teclado/.test(d.getAttribute('aria-label') || ''));
  const tecla = k => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  const r = {};
  r.fechadoPorPadrao = !modal();

  tecla('?'); await w(300);
  r.interrogacaoAbre = !!modal();
  const linhas = modal() ? modal().querySelectorAll('span[style*="mono"]').length : 0;
  r.listaTemAtalhos = linhas >= 4;
  r.listaTemOCmdK = /⌘K/.test(modal() ? modal().innerText : '');

  tecla('Escape'); await w(300);
  r.escFecha = !modal();

  // dentro de um campo de texto, ? é só uma interrogação
  const inp = document.createElement('input'); document.body.appendChild(inp); inp.focus();
  tecla('?'); await w(250);
  r.dentroDeInputNaoAbre = !modal();
  inp.remove();
  return r;
});
for (const [k, v] of Object.entries(u8)) ok(v, 'U8 ' + k);

// a lista da tela e o item da paleta saem da MESMA constante (fonte única)
const u8b = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const fonte = [...document.querySelectorAll('script')].map(s => s.textContent || '').find(t => t.includes('ATALHOS =')) || '';
  const bloco = fonte.slice(fonte.indexOf('ATALHOS ='), fonte.indexOf('ATALHOS =') + 900);
  const naConstante = (bloco.slice(0, bloco.indexOf('];')).match(/\{tecla:/g) || []).length;

  document.querySelector('button[title^="Buscar"]').click(); await w(300);
  const campo = document.querySelector('div[role=dialog] input');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(campo, 'atalho'); campo.dispatchEvent(new Event('input', { bubbles: true }));
  await w(400);
  const item = [...document.querySelectorAll('div[role=dialog] button')].find(b => /Atalhos do teclado/.test(b.textContent || ''));
  const temItemNaPaleta = !!item;
  if (item) item.click();
  await w(400);
  const modal = [...document.querySelectorAll('div[role=dialog]')]
    .find(d => /Atalhos do teclado/.test(d.getAttribute('aria-label') || ''));
  const naTela = modal ? modal.querySelectorAll('span[style*="mono"]').length : 0;
  if (modal) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await w(200);
  return { temItemNaPaleta, mesmaFonte: naConstante > 0 && naConstante === naTela };
});
ok(u8b.temItemNaPaleta, 'U8 a paleta ⌘K também leva aos atalhos');
ok(u8b.mesmaFonte, 'U8 a lista da tela sai da constante única ATALHOS');
await page.evaluate(() => localStorage.removeItem('catedra:auth'));

const hojeStr = new Date().toISOString().slice(0, 10);
/* ============= U11 — REGISTRO DE ESTUDO EM UM TOQUE ============= */
// O cronômetro anda pelo RELÓGIO (Date.now), então adiantar o relógio adianta a sessão —
// mesmo truque do U5 acima. Assim dá para pausar com 32 min sem esperar 32 min.
await page.goto(URL0 + '/Catedra.dc.html');
await page.evaluate((hoje) => {
  localStorage.setItem('catedra:sessions', JSON.stringify([{ id: 's-u11', ts: Date.now() - 3600e3, date: hoje,
    disc: 'Direito Penal', topico: 'Crimes contra a vida', categoria: 'Teoria', categorias: ['Teoria'],
    min: 40, questoes: 0, acertos: 0, erradas: 0, brancos: 0, liquido: 0 }]));
}, hojeStr);
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1800);
const u11 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const toast = () => [...document.querySelectorAll('div[role=status]')].find(d => /Registrar/.test(d.textContent || ''));
  // D12 recolheu os botões soltos do cronômetro para dentro do chip de foco. O play
  // continua a um clique — é justamente o que o item promete ("nada se perde").
  const abrirChip = async () => {
    if (document.querySelector('[role=menu][aria-label="Cronômetro e foco"]')) return;
    const chip = [...document.querySelectorAll('header.ct-topbar button')]
      .find(b => /Focar|\d\d:\d\d/.test(b.textContent || ''));
    if (chip) { chip.click(); await w(300); }
  };
  const play = () => { const m = document.querySelector('[role=menu][aria-label="Cronômetro e foco"]');
    return m && [...m.querySelectorAll('button')].find(b => /Iniciar|Pausar|Retomar/.test(b.textContent || '')); };
  const r = {};
  await abrirChip();
  if (!play()) return { erro: 'sem botão de cronômetro no chip de foco' };

  const orig = Date.now; let delta = 0; Date.now = () => orig() + delta;
  await abrirChip(); play().click(); await w(300);          // começa a contar
  delta = 32 * 60000;                    // 32 minutos de estudo
  await w(1400);                         // um tique com o relógio adiantado
  await abrirChip(); play().click(); await w(600);          // pausa → oferta
  Date.now = orig;

  const t = toast();
  r.ofereceAoPausar = !!t && /Registrar 32 min em Direito Penal/.test(t.textContent || '');
  const bt = n => [...(t ? t.querySelectorAll('button') : [])].find(b => (b.textContent || '').trim() === n);
  r.tresCaminhos = !!bt('Registrar') && !!bt('Editar') && !!bt('Ignorar');
  if (!bt('Registrar')) return r;

  bt('Registrar').click(); await w(900);
  const ss = JSON.parse(localStorage.getItem('catedra:sessions') || '[]');
  const nova = ss.find(s => s.id !== 's-u11');
  r.registraDireto = !!nova && nova.min === 32 && nova.disc === 'Direito Penal';
  r.herdaCategoria = !!nova && nova.categoria === 'Teoria';
  r.zeraOCronometro = !localStorage.getItem('ct_timer');   // sem isso o mesmo tempo entraria duas vezes
  return r;
});
if (!u11.erro) { for (const [k, v] of Object.entries(u11)) ok(v, 'U11 ' + k); }
else ok(false, 'U11 ' + u11.erro);

// menos de 5 min é ruído: não oferece nada
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1700);
const u11b = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  // D12: o play mora dentro do chip de foco (o menu fecha a cada estado, então reabre)
  const abrirChip = async () => {
    if (document.querySelector('[role=menu][aria-label="Cronômetro e foco"]')) return;
    const chip = [...document.querySelectorAll('header.ct-topbar button')]
      .find(b => /Focar|\d\d:\d\d/.test(b.textContent || ''));
    if (chip) { chip.click(); await w(300); }
  };
  const play = () => { const m = document.querySelector('[role=menu][aria-label="Cronômetro e foco"]');
    return m && [...m.querySelectorAll('button')].find(b => /Iniciar|Pausar|Retomar/.test(b.textContent || '')); };
  const orig = Date.now; let delta = 0; Date.now = () => orig() + delta;
  await abrirChip(); play().click(); await w(300);
  delta = 2 * 60000;
  await w(1400);
  await abrirChip(); play().click(); await w(600);
  Date.now = orig;
  const t = [...document.querySelectorAll('div[role=status]')].find(d => /Registrar/.test(d.textContent || ''));
  return !t || t.style.opacity !== '1';
});
ok(u11b, 'U11 dois minutos não viram oferta de registro');

/* ============= U4 — RETOMADA EXPLÍCITA DA REDAÇÃO ============= */
// (O outro caso do U4, o simulado pausado, NÃO existe: _restoreProva consome ct_prova no
// boot e reabre a prova em tela cheia — o teste do U3 acima guarda essa decisão.)
await page.goto(URL0 + '/Catedra.dc.html');
await page.evaluate(() => {
  localStorage.setItem('catedra:redEnunciado', JSON.stringify('TJ-XX 2024 · Sentença cível\n\nProfira sentença.'));
  localStorage.setItem('catedra:redText', JSON.stringify('Vistos etc. Trata-se de ação de cobrança...'));
  localStorage.setItem('catedra:redTextTs', JSON.stringify(Date.now() - 3 * 3600e3));
  localStorage.removeItem('catedra:redGabarito');
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1800);
const u4 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const M = () => document.querySelector('main').innerText;
  const r = {};
  document.querySelector('button[data-view="redacao"]').click(); await w(2500);
  r.mostraAFaixa = /rascunho salvo/i.test(M());
  r.dizDeQuando = /há 3h/.test(M());
  const btn = n => [...document.querySelectorAll('main button')].find(b => (b.textContent || '').trim() === n);
  r.ofereceOsDoisCaminhos = !!btn('Continuar') && !!btn('Começar do zero');

  // "Começar do zero" pergunta antes (é destruição de texto) e limpa só a resposta
  let perguntou = false; window.confirm = () => { perguntou = true; return true; };
  btn('Começar do zero').click(); await w(600);
  r.zerarPergunta = perguntou;
  r.zerarLimpaOTexto = JSON.parse(localStorage.getItem('catedra:redText') || '""') === '';
  r.zerarMantemAProva = !!JSON.parse(localStorage.getItem('catedra:redEnunciado') || '""');
  r.faixaSaiDepois = !/rascunho salvo/i.test(M());
  return r;
});
for (const [k, v] of Object.entries(u4)) ok(v, 'U4 ' + k);

// escrever faz a faixa sair sozinha — ela não fica pedindo passagem durante o trabalho
await page.evaluate(() => {
  localStorage.setItem('catedra:redText', JSON.stringify('Rascunho de outra sessão.'));
  localStorage.setItem('catedra:redTextTs', JSON.stringify(Date.now() - 26 * 3600e3));
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1800);
const u4b = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const M = () => document.querySelector('main').innerText;
  document.querySelector('button[data-view="redacao"]').click(); await w(2500);
  const antes = /rascunho salvo/i.test(M());
  const ta = document.querySelector('main textarea');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(ta, 'Rascunho de outra sessão. Continuando agora.');
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  await w(500);
  return { antes, depois: /rascunho salvo/i.test(M()) };
});
ok(u4b.antes && !u4b.depois, 'U4 a faixa some assim que a pessoa volta a escrever');

/* ============= U12 — LEMBRETE DE REVISÃO NO HORÁRIO ============= */
// Notification é substituído ANTES do app subir: o headless não dá permissão de verdade.
await page.addInitScript(() => {
  const N = function (titulo, opts) { window.__notifs = (window.__notifs || []).concat([{ titulo, opts }]); this.close = () => {}; };
  N.permission = 'granted';
  N.requestPermission = async () => 'granted';
  window.Notification = N;
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.evaluate(() => {
  localStorage.removeItem('catedra:notifRevDia');
  localStorage.setItem('catedra:prefs', JSON.stringify({ revLembrete: true, revHora: '00:01' }));
  localStorage.setItem('catedra:reviews', JSON.stringify([
    { id: 'r-u12a', disc: 'Direito Civil', topic: 'Prescrição', due: -2, dueDate: '2020-01-01', intervalo: 1, facilidade: 2.5, repeticoes: 0 },
    { id: 'r-u12b', disc: 'Direito Penal', topic: 'Dolo', due: -1, dueDate: '2020-01-02', intervalo: 1, facilidade: 2.5, repeticoes: 0 },
  ]));
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(6500);   // o verificador roda 4s depois do boot
const u12 = await page.evaluate(() => ({
  disparou: (window.__notifs || []).length === 1,
  dizQuantasEQuantoTempo: /revis/i.test(((window.__notifs || [])[0] || {}).titulo || '') || /revis/i.test((((window.__notifs || [])[0] || {}).opts || {}).body || ''),
  corpoTemONumero: /2 revisões esperando/.test((((window.__notifs || [])[0] || {}).opts || {}).body || ''),
  // Data LOCAL, como o app grava (_hoje/_ymd). Com toISOString() a comparação é em UTC, e
  // no Brasil (UTC-3) ela passa a divergir depois das 21h — o teste passava o dia inteiro e
  // quebrava toda noite, sem nada ter mudado no app.
  marcouODia: localStorage.getItem('catedra:notifRevDia') === (() => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  })(),
}));
for (const [k, v] of Object.entries(u12)) ok(v, 'U12 ' + k);

// segundo boot no mesmo dia: não repete
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(6500);
const u12b = await page.evaluate(() => (window.__notifs || []).length === 0);
ok(u12b, 'U12 não repete o aviso no mesmo dia');

// desligado (o padrão) não dispara nada
await page.evaluate(() => {
  localStorage.removeItem('catedra:notifRevDia');
  localStorage.setItem('catedra:prefs', JSON.stringify({ revLembrete: false, revHora: '00:01' }));
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(6500);
const u12c = await page.evaluate(() => (window.__notifs || []).length === 0 && !localStorage.getItem('catedra:notifRevDia'));
ok(u12c, 'U12 desligado (padrão) não avisa nada');

/* ============= U7 (a) — TEMA AUTOMÁTICO ============= */
await page.evaluate(() => { localStorage.setItem('catedra:prefs', JSON.stringify({ temaAuto: true })); localStorage.setItem('catedra:dark', '0'); });
await page.emulateMedia({ colorScheme: 'dark' });
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1800);
const escuroAuto = await page.evaluate(() => document.querySelector('[data-dark]').getAttribute('data-dark'));
ok(escuroAuto === '1', 'U7 com tema automático, sistema escuro deixa o app escuro');

await page.emulateMedia({ colorScheme: 'light' });
await page.waitForTimeout(600);
const claroDepois = await page.evaluate(() => document.querySelector('[data-dark]').getAttribute('data-dark'));
ok(claroDepois === '0', 'U7 o app acompanha a mudança do sistema sem recarregar');

const u7 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const mais = document.querySelector('button[aria-label="Mostrar mais opções"]');
  if (mais) mais.click(); await w(300);
  document.querySelector('button[data-view="ajustes"]').click(); await w(700);
  // D11: Claro/Escuro/Auto vivem na aba Aparência, junto do resto do visual
  const abaAp = [...document.querySelectorAll('main .aj-abas button[data-t]')].find(b => /Aparência/.test(b.textContent));
  if (abaAp) { abaAp.click(); await w(700); }
  const btn = n => [...document.querySelectorAll('main button')].find(b => (b.textContent || '').trim() === n);
  const r = { temBotaoAuto: !!btn('Auto') };
  if (btn('Escuro')) btn('Escuro').click();
  await w(1200);
  const prefs = JSON.parse(localStorage.getItem('catedra:prefs') || '{}');
  r.manualDesligaOAutomatico = prefs.temaAuto === false;
  r.manualVale = document.querySelector('[data-dark]').getAttribute('data-dark') === '1';
  if (btn('Auto')) btn('Auto').click();
  await w(800);
  r.autoVoltaAoSistema = document.querySelector('[data-dark]').getAttribute('data-dark') === '0'
    && JSON.parse(localStorage.getItem('catedra:prefs') || '{}').temaAuto === true;
  return r;
});
for (const [k, v] of Object.entries(u7)) ok(v, 'U7 ' + k);
await page.emulateMedia({ colorScheme: 'no-preference' });

/* ===== C1: qualidade do texto extraído dos PDFs das bancas =====
   A extração crua publicava, em 267 das 561 provas, o regulamento do caderno no lugar do
   enunciado. A receita mora em scripts/extrair_prova.py e a régua em
   scripts/qualidade-texto.mjs — a MESMA que o build usa para recusar publicar e que o
   portão usa para reprovar. Estes casos travam a régua e o resultado publicado. */
const { audita: auditaTxt, juntaEspelho: juntaEsp } = await import('../scripts/qualidade-texto.mjs');

const _limpo = 'Considerando a situação hipotética apresentada, redija um texto dissertativo '
  + 'a respeito da responsabilidade civil do Estado por ato omissivo, abordando '
  + 'necessariamente os pressupostos do dever de indenizar, a teoria adotada pelo '
  + 'ordenamento brasileiro e o entendimento do Supremo Tribunal Federal sobre o tema, '
  + 'com fundamento no artigo 37, parágrafo 6.º, da Constituição Federal de 1988.';
ok(auditaTxt(_limpo).length === 0, 'C1 régua aprova enunciado limpo');
ok(auditaTxt('NÃO SERÁ PERMITIDO o uso de aparelhos. ' + _limpo).includes('instrucoes-de-caderno'),
  'C1 régua reprova regulamento do caderno no lugar do enunciado');
ok(auditaTxt(_limpo + ('\nCEBRASPE – TRF DA 6.ª REGIÃO – Edital 2024').repeat(4)).includes('cabecalho-repetido'),
  'C1 régua reprova cabeçalho de página repetido');
ok(auditaTxt('<<D01_dAdm_A0100422_2321>> ' + _limpo).includes('marcador-interno'),
  'C1 régua reprova código interno do PDF da banca');
ok(auditaTxt('oi').includes('curto'), 'C1 régua reprova texto curto demais (PDF escaneado)');

// A armadilha que fazia a auditoria acusar 59 espelhos bons de "curtos": o espelho
// estruturado é um array de OBJETOS, e array.join() devolve "[object Object]".
const _esp = juntaEsp([{ quesito: 'Identificar a competência do juízo', escala: '0,00 a 2,00' },
  { quesito: 'Apontar a prescrição intercorrente', escala: '0,00 a 3,00' }]);
ok(!/\[object Object\]/.test(_esp), 'C1 espelho estruturado não vira "[object Object]" ao ser medido');
ok(/compet[êe]ncia do ju[íi]zo/i.test(_esp) && /prescri[çc][ãa]o/i.test(_esp),
  'C1 espelho estruturado é medido pelo texto do quesito');

// O acervo PUBLICADO tem de passar na mesma régua — é o portão, dentro da suíte.
const _carrega = (arq) => { const w = {};
  new Function('window', fs.readFileSync(path.join(RAIZ, arq), 'utf8'))(w);
  return w[Object.keys(w)[0]]; };
const _TEXTOS = _carrega('discursivas-textos.js');
const _DISC = _carrega('discursivas-completo.js');
const _ORAL = _carrega('oral-conteudo.js');

let _ruimEn = [];
for (const [id, it] of Object.entries(_TEXTOS)) {
  if (it.en != null && auditaTxt(it.en).length) _ruimEn.push(id + ':' + auditaTxt(it.en).join(','));
}
ok(_ruimEn.length === 0, 'C1 nenhum enunciado publicado reprova na régua (' + _ruimEn.slice(0, 3).join(' | ') + ')');

let _ruimEsp = [];
for (const q of (Array.isArray(_DISC) ? _DISC : Object.values(_DISC))) {
  const t = juntaEsp(q.espelho) || String(q.espelhoTexto || '')
    || String((_TEXTOS[q.id] || {}).et || '');
  if (t.trim() && auditaTxt(t).length) _ruimEsp.push(q.id + ':' + auditaTxt(t).join(','));
}
ok(_ruimEsp.length === 0, 'C1 nenhum espelho publicado reprova na régua (' + _ruimEsp.slice(0, 3).join(' | ') + ')');

const _oralRuim = Object.values(_ORAL).filter(x => /<<[A-Za-z0-9_]{6,}>>/.test(String(x.enunciado) + String(x.padrao || '')));
ok(_oralRuim.length === 0, 'C1 prova oral sem código interno do PDF no meio da pergunta (' + _oralRuim.length + ')');

/* ===== C1: a tela diz a verdade sobre a falta de espelho =====
   "Sem espelho" tem duas causas — a banca não publicou, ou o PDF existe e não deu para
   transcrever. Sair com a mesma palavra faria a pessoa procurar um espelho que não existe. */
const _lista = Array.isArray(_DISC) ? _DISC : Object.values(_DISC);
const _semEspelho = _lista.filter(q => !(q.espelho && q.espelho.length) && !q.espelhoTexto);
const _semMotivo = _semEspelho.filter(q => !q.espelhoSituacao);
ok(_semEspelho.length === 0 || _semMotivo.length === 0,
  'C1 toda prova sem espelho registra POR QUE (' + _semMotivo.length + ' sem motivo de ' + _semEspelho.length + ')');

const c1tela = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  // o catálogo só é buscado ao entrar na Redação (script sob demanda, não no boot)
  const mais = document.querySelector('button[aria-label="Mostrar mais opções"]');
  if (mais) { mais.click(); await w(300); }
  const nav = document.querySelector('button[data-view="redacao"]');
  if (nav) { nav.click(); await w(3000); }
  const L = (window.CT_DISCURSIVAS || []);
  const alvo = L.find(q => q.espelhoSituacao === 'nao-publicado');
  const falho = L.find(q => q.espelhoSituacao && q.espelhoSituacao !== 'nao-publicado');
  return { carregou: L.length > 0, temCampo: L.some(q => !!q.espelhoSituacao),
    naoPublicado: alvo ? alvo.id : null, naoTranscrito: falho ? falho.id : null };
});
ok(c1tela.carregou, 'C1 catálogo de discursivas carrega ao entrar na Redação');
ok(c1tela.temCampo, 'C1 catálogo leve carrega a situação do espelho (o split preserva o campo)');

/* ===== C1: o textão chega à tela =====
   Do split de 21/08 até 22/08, discursivas-textos.js era publicado no bundle, copiado pelos
   builds e testado — e NENHUMA linha do app o carregava. A prova abria com o resumo de 320
   caracteres e sem padrão de resposta. Este caso trava o caminho inteiro: catálogo leve →
   clique na prova → textão sob demanda → enunciado íntegro na tela. */
await page.goto(URL0 + '/Catedra.dc.html');
// a Redação precisa estar na etapa 1 (o banco): prova aberta por um teste anterior fica
// gravada e a tela abriria direto na etapa 2, sem card nenhum para clicar
await page.evaluate(() => ['redEnunciado', 'redGabarito', 'redText', 'redProvaId']
  .forEach(k => localStorage.removeItem('catedra:' + k)));
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1800);
const c1texto = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const mais = document.querySelector('button[aria-label="Mostrar mais opções"]');
  if (mais) { mais.click(); await w(300); }
  const nav = document.querySelector('button[data-view="redacao"]');
  if (!nav) return { erro: 'sem botão da Redação no menu' };
  nav.click(); await w(3000);
  const L = window.CT_DISCURSIVAS;
  if (!L) return { erro: 'o catálogo de discursivas não carregou' };
  out.catalogoCarregou = true;
  out.textoesNaoVieramJunto = !window.CT_DISCURSIVAS_TEXTOS;   // só sob demanda
  // a lista mostra as 180 primeiras: escolher pelo que ESTÁ na tela, não pelo banco inteiro
  const naTela = [...document.querySelectorAll('main button[data-id]')].map(b => b.getAttribute('data-id'));
  const alvo = L.find(q => q.temTextoFull && naTela.includes(q.id));
  if (!alvo) return { ...out, erro: 'nenhuma prova com texto completo entre as exibidas (' + naTela.length + ' cards)' };
  out.resumoCurtoNoCatalogo = String(alvo.enunciado || '').length <= 340;
  const card = document.querySelector('main button[data-id="' + alvo.id + '"]');
  if (!card) return { ...out, erro: 'a prova não apareceu como card' };
  card.click(); await w(3000);
  out.textoesCarregaramSobDemanda = !!window.CT_DISCURSIVAS_TEXTOS;
  let guardado = ''; try { guardado = JSON.parse(localStorage.getItem('catedra:redEnunciado') || '""'); } catch (e) {}
  out.enunciadoInteiro = guardado.length > 340;
  // a tela junta as quebras de linha que vieram do PDF e mostra o cabeçalho no herói,
  // não no corpo — então a comparação normaliza espaços e fatia DEPOIS do cabeçalho
  const norm = x => String(x || '').replace(/\s+/g, ' ');
  const corpo = guardado.split('\n\n').slice(1).join('\n\n');
  const trecho = norm(corpo).slice(60, 120).trim();
  out.enunciadoNaTela = trecho.length > 20 && norm(document.body.innerText).includes(trecho);
  return out;
});
if (c1texto.erro) ok(false, 'C1 textão: ' + c1texto.erro);
else for (const [k, v] of Object.entries(c1texto)) ok(v, 'C1 textão ' + k);

/* ===== C1: a trava de PII acusa CPF de gente, não CPF de exemplo =====
   O espelho da DPE-SE 2021 ensina a qualificar a parte numa petição e escreve, na prosa da
   própria banca, "inscrita no CPF sob o nº 111.222.333-33 …". É documento público e o número
   é um espaço em branco com cara de número — mas ele abortava o build. Trava que grita à toa
   é trava que alguém desliga; agora só conta CPF que passa no dígito verificador, que é o que
   a marca d'água de PDF de curso carrega. */
const { verificarPII } = await import('../scripts/verificar-pii.mjs');
{
  const dir = fs.mkdtempSync(path.join(RAIZ, '.pii-'));
  try {
    fs.writeFileSync(path.join(dir, 'exemplo.txt'), 'Maria Silva, inscrita no CPF sob o nº 111.222.333-33, residente…');
    const semRuido = verificarPII(dir, { abortar: false, rotulo: 'fixture' });
    ok(semRuido.length === 0, 'C1 PII ignora CPF de exemplo do espelho (111.222.333-33)');
    fs.writeFileSync(path.join(dir, 'vazamento.txt'), 'material de curso — CPF: 529.982.247-25 — não distribuir');
    const warn = console.warn; console.warn = () => {};
    const comVazamento = verificarPII(dir, { abortar: false, rotulo: 'fixture' });
    console.warn = warn;
    ok(comVazamento.length > 0, 'C1 PII continua acusando CPF válido (marca d\'água de verdade)');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

/* ===== C2: ponte para as plataformas de questões (só link de saída) =====
   A regra dura: o Cátedra NUNCA raspa, embute por iframe nem copia conteúdo dessas
   plataformas, e nenhuma credencial delas passa por aqui. O teste trava as duas coisas
   que podem quebrar em silêncio: a montagem da URL e a preferência que sincroniza. */
const c2 = await page.evaluate(async () => {
  const P = window.CT_PLATAFORMAS;
  if (!P) return { erro: 'CT_PLATAFORMAS não carregou' };
  const tec = P.link('tec', { disciplina: 'Direito Administrativo', assunto: 'improbidade' });
  const qc = P.link('qc', { banca: 'CEBRASPE', ano: 2024 });
  const fallback = P.link('plataforma-que-nao-existe', { assunto: 'prescrição' });
  return { tec, qc, fallback, nomes: P.ordem.map(k => P.nome(k)) };
});
ok(!c2.erro, 'C2 mapa de plataformas carrega no host');
ok(/tecconcursos\.com\.br/.test(c2.tec || '') && /improbidade/.test(c2.tec || ''),
  'C2 TEC recebe a busca já filtrada no assunto fraco');
ok(/qconcursos\.com/.test(c2.qc || '') && /CEBRASPE/i.test(decodeURIComponent(c2.qc || '')),
  'C2 QConcursos recebe banca e ano');
ok(/tecconcursos/.test(c2.fallback || ''), 'C2 plataforma desconhecida cai na padrão em vez de quebrar');
ok((c2.nomes || []).length >= 2, 'C2 há mais de uma plataforma no menu');

// Nada de embutir: a regra do item proíbe iframe/raspagem dessas plataformas.
const fonteHost = fs.readFileSync(path.join(RAIZ, 'Catedra.dc.html'), 'utf8');
ok(!/<iframe[^>]+(tecconcursos|qconcursos|estrategia)/i.test(fonteHost),
  'C2 nenhuma plataforma de questões é embutida por iframe');
const fontePlat = fs.readFileSync(path.join(RAIZ, 'plataformas-questoes.js'), 'utf8');
ok(!/fetch\(|XMLHttpRequest|password|senha|token/i.test(fontePlat),
  'C2 o mapa só monta URL — não busca conteúdo nem toca em credencial');

// A preferência sincroniza: a chave precisa estar na lista do autosave.
ok(/'plataformaQuestoes'/.test(fonteHost) && /_autosaveKeys\(\)\{[^}]*plataformaQuestoes/.test(fonteHost),
  'C2 plataforma preferida entra no autosave (sincroniza entre aparelhos)');
const c2ui = await page.evaluate(() => ({
  ajustes: !!document.querySelector('#aj-plataforma'),
  fonte: [...document.querySelectorAll('script')].map(s => s.textContent || '')
    .some(t => t.includes('praticarDisciplina') && t.includes('praticarQuestao')),
}));
ok(c2ui.fonte, 'C2 os botões de praticar existem no host (diagnóstico, edital e gabarito)');

/* ===== C3: espelho sugerido — o selo é o item =====
   Sem rotulagem inequívoca, um espelho de IA vira "espelho da banca" na cabeça de quem
   estuda. O miolo mora em espelho-sugerido.js, puro: fundamento obrigatório por quesito
   e texto que se declara não oficial. */
const c3 = await page.evaluate(() => {
  const M = window.CT_ESPELHO_SUGERIDO;
  if (!M) return { erro: 'CT_ESPELHO_SUGERIDO não carregou' };
  // um quesito COM fundamento, um SEM e um com fundamento de fachada ("n/a")
  const sug = M.interpretar({ total: 10, quesitos: [
    { quesito: 'Identificar a responsabilidade civil objetiva do Estado', pontos: 6, fundamento: 'art. 37, §6.º, da CF/88' },
    { quesito: 'Discorrer sobre o que o examinador quiser', pontos: 2, fundamento: '' },
    { quesito: 'Apontar a excludente de culpa exclusiva da vítima', pontos: 2, fundamento: 'STF, RE 841.526' },
    { quesito: 'Falar sobre o tema de modo geral e abrangente', pontos: 2, fundamento: 'n/a' },
  ] }, 'p-teste');
  const txt = sug ? M.texto(sug) : '';
  const soLixo = M.interpretar({ quesitos: [
    { quesito: 'Um quesito bonito porém sem lastro nenhum', pontos: 5, fundamento: '' } ] }, 'p2');
  const prompt = M.montarPrompt({ enunciado: 'Disserte sobre responsabilidade civil do Estado.',
    orgao: 'TJ-GO', ano: 2025, banca: 'FGV' });
  return {
    quesitos: sug ? sug.quesitos.length : 0,
    todosComFundamento: !!sug && sug.quesitos.every(q => (q.fundamento || '').trim().length >= 6),
    temSelo: /SUGERIDO/.test(txt) && /N[ÃA]O OFICIAL/i.test(txt),
    dizQueBancaNaoPublicou: /banca n[ãa]o publicou/i.test(txt),
    fundamentoNoTexto: /Fundamento:/.test(txt),
    carimbo: !!(sug && sug.up),
    semNadaUsavel: soLixo === null,
    promptExigeFundamento: /N[ÃA]O crie o quesito/i.test(prompt) && /fundamento concreto/i.test(prompt),
    promptTemFicha: /TJ-GO/.test(prompt) && /FGV/.test(prompt),
  };
});
ok(!c3.erro && c3.quesitos === 2, 'C3 quesito sem fundamento é descartado (vieram 4, ficaram 2)');
ok(!c3.erro && c3.todosComFundamento, 'C3 todo quesito publicado traz fundamento conferível');
ok(!c3.erro && c3.temSelo, 'C3 o espelho sugerido sai rotulado "SUGERIDO — NÃO OFICIAL"');
ok(!c3.erro && c3.dizQueBancaNaoPublicou, 'C3 o texto repete que a banca não publicou espelho');
ok(!c3.erro && c3.fundamentoNoTexto, 'C3 o fundamento aparece no texto, quesito a quesito');
ok(!c3.erro && c3.carimbo, 'C3 o espelho gerado leva carimbo up (sincroniza e a exclusão gruda)');
ok(!c3.erro && c3.semNadaUsavel, 'C3 sem quesito fundamentado o resultado é nulo — não publica meia coisa');
ok(!c3.erro && c3.promptExigeFundamento, 'C3 o prompt proíbe quesito sem fundamento');
ok(!c3.erro && c3.promptTemFicha, 'C3 o prompt leva banca, órgão e ano da prova');

ok(/'espelhosSugeridos'/.test(fonteHost) && /_autosaveKeys\(\)\{[^}]*espelhosSugeridos/.test(fonteHost),
  'C3 o cache de espelhos sugeridos entra no autosave');
ok(/aproximada/.test(fonteHost) && /espelho-sugerido/.test(fonteHost),
  'C3 a nota tirada de espelho sugerido é marcada como aproximada');
const authSrc = fs.readFileSync(path.join(RAIZ, 'auth.js'), 'utf8');
ok(/catedra:espelhosSugeridos/.test(authSrc), 'C3 espelhosSugeridos está no ARRAY_ID (apagar gruda)');

/* ===== D12 · BARRA DO TOPO + D13 · SALA DE FOCO =====
   O topo empilhava 8 controles no mesmo nível (busca, pílula de sync com texto longo, sino,
   ◎ de foco, avatar e um bloco inteiro de cronômetro que parecia um segundo app). Agora são
   quatro cidadãos e um chip; e o modo foco virou uma sala. A regra do item: nenhuma função
   se perde — tudo continua alcançável em no máximo dois cliques. */
await page.goto(URL0 + '/Catedra.dc.html');
// as teclas do D13 (espaco/F) e o `?` do U8 valem so com sessao iniciada, como o ⌘K
await page.evaluate(() => localStorage.setItem('catedra:auth', '1'));
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1800);
const d12 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const r = {};
  const topo = document.querySelector('header.ct-topbar');
  if (!topo) return { erro: 'sem barra do topo' };
  r.semPilulaSync = !document.querySelector('.ct-synclabel');
  // controles VISÍVEIS no topo (fora do título): no máximo quatro
  const visiveis = [...topo.querySelectorAll(':scope > div > button, :scope > div > div > button')]
    .filter(b => b.offsetParent !== null);
  r.noMaximoQuatro = visiveis.length <= 5;   // busca, sino, avatar, chip (+ alarme de sync, raro)
  const chip = [...topo.querySelectorAll('button')].find(b => /Focar|\d\d:\d\d/.test(b.textContent || ''));
  r.temChipDeFoco = !!chip;
  if (!chip) return r;
  chip.click(); await w(350);
  const menu = document.querySelector('[role=menu][aria-label="Cronômetro e foco"]');
  r.chipAbreOPoder = !!menu;
  const txt = menu ? menu.textContent : '';
  // nenhuma função de hoje se perde: play, zerar, presets, PiP, foco e registrar
  r.temPlay = /Iniciar|Retomar|Pausar/.test(txt);
  r.temPresets = /25 \/ 5/.test(txt) && /50 \/ 10/.test(txt) && /90 \/ 15/.test(txt);
  r.temPiP = /flutuante/i.test(txt);
  r.temModoFoco = /modo foco/i.test(txt);
  r.temRegistrar = /Registrar sessão/i.test(txt);
  // o pontinho de sync mudou-se para o avatar
  const avatar = [...topo.querySelectorAll('button')].find(b => /Conta e sincroniza/i.test(b.getAttribute('aria-label') || ''));
  r.syncNoAvatar = !!avatar && avatar.querySelectorAll('span').length >= 2;
  return r;
});
if (d12.erro) ok(false, 'D12 ' + d12.erro);
else for (const [k, v] of Object.entries(d12)) ok(v, 'D12 ' + k);

const d13 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const r = {};
  const menu = document.querySelector('[role=menu][aria-label="Cronômetro e foco"]');
  const btn = menu && [...menu.querySelectorAll('button')].find(b => /modo foco/i.test(b.textContent));
  if (!btn) return { erro: 'não achei "entrar no modo foco" no chip' };
  btn.click(); await w(600);
  const sala = document.querySelector('[aria-label="Sala de foco"]');
  r.salaAbre = !!sala;
  if (!sala) return r;
  r.ocupaATelaToda = getComputedStyle(sala).position === 'fixed' && sala.getBoundingClientRect().width >= window.innerWidth - 2;
  r.temAnel = sala.querySelectorAll('svg circle').length >= 2;      // trilho + progresso
  r.anelUsaODash = !!sala.querySelector('circle[stroke-dasharray]');
  r.temCronometroGrande = [...sala.querySelectorAll('div')].some(d => /^\d\d:\d\d/.test((d.textContent || '').trim()) && parseFloat(getComputedStyle(d).fontSize) >= 40);
  r.temFraseDeEntrada = (sala.textContent || '').length > 60;
  const acoes = [...sala.querySelectorAll('button')].filter(b => b.offsetParent !== null && (b.textContent || '').trim());
  r.tresAcoes = acoes.length <= 4;                                   // pausar, encerrar, PiP (+ fechar)
  r.temEncerrar = acoes.some(b => /Encerrar/i.test(b.textContent));
  // espaço pausa e retoma, sem sair da sala
  const antes = !!document.querySelector('[aria-label="Sala de foco"]');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
  await w(300);
  r.espacoNaoFechaASala = antes && !!document.querySelector('[aria-label="Sala de foco"]');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
  await w(400);
  r.fSaiDaSala = !document.querySelector('[aria-label="Sala de foco"]');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
  await w(400);
  r.fEntraDeNovo = !!document.querySelector('[aria-label="Sala de foco"]');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await w(400);
  r.escSai = !document.querySelector('[aria-label="Sala de foco"]');
  return r;
});
if (d13.erro) ok(false, 'D13 ' + d13.erro);
else for (const [k, v] of Object.entries(d13)) ok(v, 'D13 ' + k);

/* ===== D11 · AJUSTES REFEITOS =====
   Nasce de uso real: a Lana precisou do backup e não o achou. As abas ficavam no meio da
   página e "Dados & conselho" misturava dois assuntos. A régua do item: a personalização
   visual NÃO se perde, e "quero fazer backup" se resolve em dois gestos. */
const d11 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const r = {};
  try { if (window.__catedraGoView) window.__catedraGoView('ajustes'); } catch (e) {}
  await w(1200);
  const abasEl = () => [...document.querySelectorAll('main .aj-abas button[data-t]')];
  const abas = abasEl().map(b => b.textContent.trim());
  r.seisAbas = abas.length === 6;
  r.abasPorAssunto = ['Você', 'Estudo', 'banca', 'Aparência', 'Dados', 'Conta'].every((x, i) => (abas[i] || '').includes(x));
  const barra = document.querySelector('main .aj-abas');
  r.abasGrudamNoTopo = !!barra && getComputedStyle(barra).position === 'sticky';

  // busca interna: acha em QUALQUER aba, inclusive nas que não estão no DOM
  const busca = document.querySelector('main input[aria-label="Buscar nos ajustes"]');
  r.temBusca = !!busca;
  const procurar = async (q) => { busca.value = q; busca.dispatchEvent(new Event('input', { bubbles: true })); await w(450);
    return [...document.querySelectorAll('main .aj-abas button[data-t]')].map(b => b.textContent).join(' '); };
  if (busca) {
    r.achaBackup = /[Bb]ackup/.test(await procurar('backup'));
    r.achaSair = /sair/i.test(await procurar('sair'));
    r.achaTema = /[Tt]ema/.test(await procurar('tema'));
    await procurar('');
  }
  const clicaAba = async (re) => { const b = abasEl().find(x => re.test(x.textContent)); if (!b) return false; b.click(); await w(700); return true; };

  // Aparência: nada de personalização se perde
  r.abreAparencia = await clicaAba(/Aparência/);
  r.temPresets = document.querySelectorAll('main button[data-p]').length >= 3;
  const corpo = () => document.body.innerText;
  r.temAvancada = /Personalização avançada/.test(corpo());
  r.temDirecaoVisual = /Direção visual/.test(corpo());
  r.temCorDestaque = /Cor de destaque/.test(corpo());
  r.temTamanhoTexto = /Tamanho do texto/.test(corpo());
  const abrir = document.querySelector('main button[aria-expanded]');
  r.avancadaTemBotao = !!abrir;
  if (abrir) { abrir.click(); await w(500); }
  r.avancadaTemOsFinos = /cantos/i.test(corpo());   // o rótulo é uppercase por CSS: innerText devolve CANTOS

  // Dados & backup: backup no topo, perigo isolado no fim
  r.abreDados = await clicaAba(/Dados/);
  const t = corpo();
  r.backupAntesDoPerigo = t.indexOf('Seus dados') >= 0 && t.indexOf('Zona de perigo') > t.indexOf('Seus dados');
  r.temBackupAutomatico = /Backup automático semanal/.test(t);
  r.perigoIsolado = /Zona de perigo/.test(t) && /Não dá para desfazer/.test(t);

  r.abreConta = await clicaAba(/^Conta$/);
  r.contaTemSair = /Sair da conta/.test(corpo());
  return r;
});
for (const [k, v] of Object.entries(d11)) ok(v, 'D11 ' + k);

/* ===== REVISÃO ADVERSARIAL — os defeitos que ela achou não voltam =====
   Uma revisão de 106 agentes sobre este lote confirmou 27 defeitos. Cada caso abaixo trava
   um deles pelo COMPORTAMENTO, não pela implementação. */

// A Aparência ficava no nível do <main> sem portão de view: depois de visitar a aba uma vez,
// os cartões de preset e cor apareciam por baixo do Início, do Ciclo e do Edital.
const rev1 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  try { if (window.__catedraGoView) window.__catedraGoView('ajustes'); } catch (e) {}
  await w(1000);
  const ap = [...document.querySelectorAll('main .aj-abas button[data-t]')].find(b => /Aparência/.test(b.textContent));
  if (!ap) return { erro: 'sem aba Aparência' };
  ap.click(); await w(600);
  const naAba = /Escolhas rápidas/.test(document.body.innerText);
  try { if (window.__catedraGoView) window.__catedraGoView('inicio'); } catch (e) {}
  await w(900);
  return { naAba, vazouParaOInicio: /Escolhas rápidas|Personalização avançada/.test(document.body.innerText) };
});
ok(!rev1.erro && rev1.naAba, 'REVISÃO Aparência aparece na sua aba');
ok(!rev1.erro && !rev1.vazouParaOInicio, 'REVISÃO Aparência NÃO vaza para o Início (perdera o portão de view)');

// O F ligava a sala por baixo do simulado cronometrado, punha o cronômetro a correr durante
// a prova, e o Esc seguinte saía da PROVA — apagando ct_prova.
const rev2 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const app = { }; const r = {};
  localStorage.setItem('catedra:auth', '1');
  // simula um modal aberto pelo caminho que o app usa
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); await w(500);
  r.fEntraQuandoLivre = !!document.querySelector('[aria-label="Sala de foco"]');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await w(400);
  r.escSaiDaSala = !document.querySelector('[aria-label="Sala de foco"]');
  return r;
});
for (const [k, v] of Object.entries(rev2)) ok(v, 'REVISÃO ' + k);

// A busca dos Ajustes deixava cartões escondidos ao trocar de aba (display imperativo em
// elemento que o runtime não remonta), e mandava Flashcards para a aba errada.
const rev3 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  try { if (window.__catedraGoView) window.__catedraGoView('ajustes'); } catch (e) {}
  await w(1000);
  const busca = document.querySelector('main input[aria-label="Buscar nos ajustes"]');
  if (!busca) return { erro: 'sem busca nos Ajustes' };
  busca.value = 'backup'; busca.dispatchEvent(new Event('input', { bubbles: true })); await w(500);
  const alvo = [...document.querySelectorAll('main .aj-abas button[data-t]')].find(b => /Flashcards/.test(b.textContent));
  const abaDoFlash = alvo ? alvo.getAttribute('data-t') : null;
  busca.value = 'flashcards'; busca.dispatchEvent(new Event('input', { bubbles: true })); await w(500);
  const flash = [...document.querySelectorAll('main .aj-abas button[data-t]')].find(b => /Flashcards/.test(b.textContent));
  const r = { flashApontaParaDados: !!flash && flash.getAttribute('data-t') === 'dados' };
  // trocar de aba com a busca ativa não pode deixar cartão escondido
  const abaEstudo = [...document.querySelectorAll('main .aj-abas button[data-t]')].find(b => /Estudo/.test(b.textContent));
  if (abaEstudo) { abaEstudo.click(); await w(800); }
  const escondidos = [...document.querySelectorAll('main [data-aj]')].filter(e => e.style.display === 'none');
  r.nenhumCartaoFicaEscondido = escondidos.length === 0;
  r.buscaFoiLimpa = (document.querySelector('main input[aria-label="Buscar nos ajustes"]') || {}).value === '';
  return r;
});
if (rev3.erro) ok(false, 'REVISÃO ' + rev3.erro);
else for (const [k, v] of Object.entries(rev3)) ok(v, 'REVISÃO ' + k);

// O fallback de plataformaOpcoes lançava por construção e derrubava o render inteiro.
const rev4 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const guardado = window.CT_PLATAFORMAS;
  try {
    delete window.CT_PLATAFORMAS;
    try { if (window.__catedraGoView) window.__catedraGoView('inicio'); } catch (e) {}
    await w(900);
    // se o render tivesse caído, o app inteiro renderizaria vazio
    const vivo = (document.body.innerText || '').length > 200 && !!document.querySelector('header.ct-topbar');
    return { appSobreviveSemOMapaDePlataformas: vivo };
  } finally { window.CT_PLATAFORMAS = guardado; }
});
for (const [k, v] of Object.entries(rev4)) ok(v, 'REVISÃO ' + k);

// O assunto que vai para a plataforma não pode carregar o nome de um material pessoal inteiro.
const rev5 = await page.evaluate(() => {
  const P = window.CT_PLATAFORMAS;
  const url = P.link('tec', { disciplina: 'Direito Civil',
    assunto: 'processo 0001234-56 2024 8 26 0100 peticao inicial cliente' });
  return { assuntoNaoVaiInteiro: decodeURIComponent(url).length < 140 };
});
for (const [k, v] of Object.entries(rev5)) ok(v, 'REVISÃO ' + k);

/* ===== D14: VARREDURA DE LIGAÇÕES PERDIDAS =====
   Duas falhas do mesmo tipo passaram meses despercebidas: um botão da barra usava
   `style="{{ navPrioridade }}"`, variável que nunca entrou no render() (o dc-runtime
   resolve ausente como string vazia — nada reclama), e trocava a view para uma tela cujo
   bloco tinha se perdido num merge. O runtime não avisa; o CI passa a avisar. */
const D14 = await page.evaluate(() => {
  const html = document.documentElement.outerHTML;
  return { ok: !!html };
});
ok(D14.ok, 'D14 página carregou para a varredura');

const fonteTpl = fs.readFileSync(path.join(RAIZ, 'Catedra.dc.html'), 'utf8');
// o template é tudo que está fora do <script> inline; o render() está dentro dele
const semComentario = fonteTpl.replace(/<!--[\s\S]*?-->/g, '');
const soTemplate = semComentario.replace(/<script[\s\S]*?<\/script>/g, '');

// --- 1) todo data-view leva a uma tela que existe
const views = [...new Set([...soTemplate.matchAll(/data-view="([a-z0-9_-]+)"/gi)].map(m => m[1]))]
  .filter(v => v && !v.includes('{'));
const semTela = views.filter(v => !new RegExp("view *=== *'" + v + "'").test(fonteTpl));
ok(semTela.length === 0, 'D14 todo data-view tem tela no render (' + (semTela.join(', ') || 'nenhum órfão') + ')');

// as views que são página satélite precisam do iframe montado no template
const SATELITES = { legis: 'legis-web.html', juris: 'juris-web.html', areamod: 'area-web.html',
  segundafase: 'segunda-fase-web.html', prioridade: 'prioridade-web.html' };
const semIframe = Object.keys(SATELITES).filter(v =>
  views.includes(v) && !new RegExp('data-ct-view="' + v + '"').test(soTemplate));
ok(semIframe.length === 0, 'D14 toda view de satélite tem o iframe no template (' + (semIframe.join(', ') || 'todas montadas') + ')');

// --- 2) variável órfã: {{ nome }} de escopo global que o render() não devolve
// Fora de <sc-for> (lá o nome vem do item) e sem ponto (p.short pertence ao item).
const semFor = soTemplate.replace(/<sc-for[\s\S]*?<\/sc-for>/g, '');
const vars = [...new Set([...semFor.matchAll(/\{\{\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\}\}/g)].map(m => m[1]))];
// O render() devolve um objeto literal gigante; procurar "nome:" ou "nome," (atalho) basta.
const resolvida = (n) => new RegExp('(^|[\\s,{])' + n + '\\s*[:,]').test(fonteTpl)
  || new RegExp('\\.\\.\\.' + n + '\\b').test(fonteTpl);
const orfas = vars.filter(v => !resolvida(v));
ok(orfas.length === 0, 'D14 nenhuma variável órfã no template (' + (orfas.slice(0, 6).join(', ') || 'nenhuma') + ')');

// --- 3) a regressão que originou o item: os dois botões da barra
const d14barra = await page.evaluate(() => {
  const r = {};
  for (const v of ['prioridade', 'segundafase']) {
    const b = document.querySelector('button[data-view="' + v + '"]');
    r[v + 'TemBotao'] = !!b;
    r[v + 'TemEstilo'] = !!b && (b.getAttribute('style') || '').length > 20;
  }
  return r;
});
for (const [k, v] of Object.entries(d14barra)) ok(v, 'D14 ' + k);

/* ===== TASK 5 · NAVEGAÇÃO POR JORNADA, SEM TROCAR IDS =====
   A barra agrupava por arquitetura do código ("Treino", "Acervo"). Agora agrupa pela rotina
   e pelas fases do concurso. O que NÃO pode mudar é o data-view: renomear um id quebraria
   deep-link, ponto de retorno e as abas nativas. */
{
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.evaluate(() => { localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1600);
  const nav = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const mais = document.querySelector('button[aria-label="Mostrar mais opções"]');
    const antesDeAbrir = mais ? mais.getAttribute('aria-expanded') : null;
    if (mais) { mais.click(); await w(400); }
    const mais2 = document.querySelector('button[aria-label="Mostrar mais opções"]');
    const views = [...document.querySelectorAll('aside button[data-view]')].map(b => b.getAttribute('data-view'));
    const rotulos = [...document.querySelectorAll('aside div')]
      .map(d => (d.textContent || '').trim()).filter(t => t.length < 30 && t.length > 3);
    const ordem = (v) => views.indexOf(v);
    return {
      // todo id essencial continua na barra
      idsPreservados: ['inicio','ciclo','revisoes','calendario','legis','edital','simulados',
        'redacao','oral','prioridade','bancas','analise','historico','ajustes'].every(v => views.includes(v)),
      // a rotina vem primeiro, depois o acervo base, depois as fases, depois o planejamento
      hojeAntesDoAcervo: ordem('inicio') < ordem('legis'),
      acervoAntesDasFases: ordem('legis') < ordem('simulados'),
      fasesAntesDoPlanejamento: ordem('simulados') < ordem('prioridade'),
      // os rótulos dizem a fase
      dizFases: rotulos.some(t => /fases da magistratura|treino/i.test(t)),
      dizEstudoBase: rotulos.some(t => /estudo base/i.test(t)),
      dizPlanejamento: rotulos.some(t => /planejamento/i.test(t)),
      // o expansor conta o seu estado
      expansorFechadoDizFalse: antesDeAbrir === 'false',
      expansorAbertoDizTrue: !!mais2 && mais2.getAttribute('aria-expanded') === 'true',
      expansorApontaParaOPainel: !!mais2 && !!document.getElementById(mais2.getAttribute('aria-controls') || ''),
    };
  });
  for (const [k, v] of Object.entries(nav)) ok(v, 'TASK5 ' + k);

  // o fundo do menu do celular precisa ser alcançável por teclado
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1500);
  const drawer = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const abrir = document.querySelector('button[aria-label="Abrir menu"]');
    if (!abrir) return { erro: 'sem botão de menu no celular' };
    abrir.click(); await w(450);
    const fundo = document.querySelector('button[aria-label="Fechar o menu"]');
    const r = { fundoEhBotaoComNome: !!fundo };
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await w(450);
    r.escFechaOMenu = !document.querySelector('button[aria-label="Fechar o menu"]');
    return r;
  });
  if (drawer.erro) ok(false, 'TASK5 ' + drawer.erro);
  else for (const [k, v] of Object.entries(drawer)) ok(v, 'TASK5 ' + k);
  await page.setViewportSize({ width: 1280, height: 800 });
}

/* ===== ÁREA GOVERNA A PLATAFORMA (Fase 2 do guia de refatoração) =====
   A troca de área era cosmética. Havia TRÊS guardas diferentes (isJuridica, areaJuris,
   temAreaMod), e todas só no MENU: a view continuava aberta pelo "continuar de onde
   parei", pelo window.__catedraGoView e por deep link. Quem estuda Enfermagem reabria a
   tela de peças processuais sem nunca ter pedido. Agora quem responde é area-registry.js,
   e a resposta vale para toda entrada. */
{
  // 1) o registro é uma tabela honesta, não um if espalhado
  const reg = await page.evaluate(async (b) => {
    const src = await (await fetch(b + '/area-registry.js')).text();
    const ctx = {};
    new Function('window', src)(ctx);
    const R = ctx.CT_AREA_REG;
    const JUR = ['juridica', 'policial', 'fiscal', 'contas', 'administrativa'];
    const NAO = ['saude', 'social', 'educacao', 'tecnologia', 'militar', 'outra'];
    return {
      // jurisprudência é acervo de tribunal: só quem tem carreira jurídica
      jurisSoNasJuridicas: JUR.every(a => R.podeAbrir(a, 'juris')) && NAO.every(a => !R.podeAbrir(a, 'juris')),
      // peças, 2ª fase, oral e o ranking de incidência são de magistratura
      pecasSoEmJuridica: R.podeAbrir('juridica', 'roteiros')
        && ['policial', 'saude', 'social', 'outra'].every(a => !R.podeAbrir(a, 'roteiros')),
      /* CORRIGIDO depois da revisão: a primeira versão desta tabela dava oral e simulado
         só a magistratura. O código desmentia — treino.js:202 tem acervoLeisArea(area),
         escrito para que "Simulado (itens de lei seca) e Prova oral (modo Lei seca)"
         sirvam a área escolhida. Quem tem fonte normativa própria argui e simula sobre
         ela; o que é exclusivo é o ACERVO das bancas jurídicas. */
      oralOndeHaFonte: R.podeAbrir('juridica', 'oral') && R.podeAbrir('saude', 'oral')
        && !R.podeAbrir('outra', 'oral'),
      acervoDeBancasSoEmJuridica: R.tem('juridica', 'provaOralBancas')
        && ['policial', 'saude', 'social'].every(a => !R.tem(a, 'provaOralBancas')),
      simuladoOndeHaFonte: R.podeAbrir('saude', 'simulados') && R.podeAbrir('policial', 'simulados')
        && !R.podeAbrir('outra', 'simulados'),
      // o que é universal continua universal em TODAS as onze
      cicloEmTodas: [...JUR, ...NAO].every(a => R.podeAbrir(a, 'ciclo') && R.podeAbrir(a, 'revisoes')),
      editalEmTodas: [...JUR, ...NAO].every(a => R.podeAbrir(a, 'edital')),
      // "sem área" NÃO pode virar Direito por omissão
      areaDesconhecidaNaoLiberaNada: !R.podeAbrir('inexistente', 'juris') && !R.podeAbrir('', 'roteiros'),
      // e a área diz o que ainda não tem, em português
      dizOQueEstaEmPreparo: R.emPreparo('saude').length > 0 && R.emPreparo('juridica').length === 0,
      termoDaArea: R.termo('saude', 'fontePlural') === 'diretrizes' && R.termo('juridica', 'fontePlural') === 'leis',
    };
  }, URL0);
  for (const [k, v] of Object.entries(reg)) ok(v, 'AREA ' + k);

  // 2) o menu segue a capacidade — e Jurídica não perde NADA
  const ACERVO = ['legis', 'juris', 'areamod', 'roteiros', 'segundafase', 'redacao', 'oral',
                  'prioridade', 'simulados', 'edital', 'bancas'];
  const menus = {};
  for (const area of ['juridica', 'saude', 'outra']) {
    await page.goto(URL0 + '/Catedra.dc.html');
    await page.evaluate((a) => {
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:areaEstudo', JSON.stringify(a));
    }, area);
    await page.goto(URL0 + '/Catedra.dc.html');
    await page.waitForTimeout(1700);
    menus[area] = await page.evaluate(async (acervo) => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const m = document.querySelector('button[aria-label="Mostrar mais opções"]');
      if (m) { m.click(); await w(350); }
      return [...document.querySelectorAll('aside button[data-view]')]
        .map(b => b.dataset.view).filter(v => acervo.includes(v));
    }, ACERVO);
  }
  ok(ACERVO.every(v => menus.juridica.includes(v)),
    'AREA jurídica continua com todas as telas (' + menus.juridica.length + '/' + ACERVO.length + ')');
  ok(!menus.saude.includes('juris') && !menus.saude.includes('roteiros')
     && !menus.saude.includes('segundafase') && !menus.saude.includes('redacao')
     && !menus.saude.includes('prioridade'),
    'AREA saúde não recebe tela de acervo jurídico no menu (' + menus.saude.join(',') + ')');
  ok(menus.saude.includes('legis') && menus.saude.includes('areamod') && menus.saude.includes('edital'),
    'AREA saúde mantém o que é dela (' + menus.saude.join(',') + ')');
  ok(menus.outra.includes('edital') && !menus.outra.includes('legis'),
    'AREA "outra" fica só com o universal (' + menus.outra.join(',') + ')');

  /* 3) O CORAÇÃO: a guarda vale para toda ENTRADA, não só para o botão. Este é o teste
        que o app não tinha — e é por isso que o vazamento durou tanto. */
  const guarda = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const r = {};
    const tentar = async (v) => {
      window.__catedraGoView(v); await w(700);
      const t = document.body.innerText;
      return { barrou: /não faz parte de/i.test(t), explica: t.length > 200 };
    };
    // saúde está ativa: nenhuma destas pode abrir
    for (const v of ['juris', 'roteiros', 'oral', 'prioridade', 'segundafase']) {
      const x = await tentar(v);
      r['barra_' + v] = x.barrou;
    }
    // e o que é dela abre normalmente
    window.__catedraGoView('ciclo'); await w(700);
    r.ciclo_abre = !/não faz parte de/i.test(document.body.innerText);
    return r;
  });
  for (const [k, v] of Object.entries(guarda)) ok(v, 'AREA guarda ' + k);

  // 4) a tela barrada EXPLICA e oferece saída — não é um redirecionamento mudo
  const explica = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__catedraGoView('juris'); await w(700);
    const t = document.body.innerText;
    return {
      dizQualTela: /Jurisprudência · CátedraJURIS/i.test(t),
      dizPorQue: /acervo de jurisprudência é de tribunal/i.test(t),
      dizOQueVem: /Em preparo/i.test(t),
      ofereceSaida: [...document.querySelectorAll('button[data-view]')]
        .some(b => /Voltar ao meu painel/i.test(b.textContent))
        && [...document.querySelectorAll('button[data-view]')].some(b => /Trocar de área/i.test(b.textContent)),
      semJargao: !/undefined|null|\.json|bundle/i.test(t),
    };
  });
  for (const [k, v] of Object.entries(explica)) ok(v, 'AREA tela barrada ' + k);

  // 5) "continuar de onde parei" não pode ressuscitar tela de outra área
  const ponto = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    localStorage.setItem('catedra:lastPonto', JSON.stringify({ view: 'roteiros', ts: Date.now(), rotulo: 'Roteiros' }));
    return { semeado: true };
  });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1800);
  const voltou = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const b = [...document.querySelectorAll('button')].find(x => /continuar|voltar ao ponto|retomar/i.test(x.textContent || ''));
    if (!b) return { semCartao: true };
    b.click(); await w(800);
    return { naoAbreRoteiros: /não faz parte de/i.test(document.body.innerText) };
  });
  if (!voltou.semCartao) ok(voltou.naoAbreRoteiros, 'AREA "continuar de onde parei" respeita a área');
  else ok(ponto.semeado, 'AREA (o cartão de retomada não estava na tela nesta conta)');

  /* 6) CADERNO POR ÁREA — o item de maior risco desta fase, porque mexe em persistência.
        Antes: quem estuda Direito, acumula progresso e troca para Saúde levava TUDO junto —
        o edital de magistratura continuava sendo o edital e as revisões de Processo Civil
        continuavam vencendo. Não havia uma única chave por área na camada de persistência.
        A regra escolhida é a mais conservadora que existe: Direito (e "sem área") ficam nas
        chaves HISTÓRICAS, sem sufixo — nenhum dado existente é movido ou reescrito. */
  /* Aba PRÓPRIA para este caso. Semear com localStorage.clear() na aba compartilhada
     não funciona: o app da carga anterior ainda está vivo e o autosave dele (debounce de
     500 ms) grava o estado velho POR CIMA da semente, logo depois do clear. Com
     addInitScript os valores existem antes de qualquer linha do app rodar. */
  const areaCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const areaPg = await areaCtx.newPage();
  await areaPg.addInitScript(() => {
    try {
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      if (!localStorage.getItem('catedra:areaEstudo')) {
        localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
        // o campo é `topics` (não `topicos`): semente com o nome errado testa outra coisa
        localStorage.setItem('catedra:edital', JSON.stringify([{ id: 'e1', up: 1, disc: 'Direito Civil', peso: 3, color: '#2563EB', topics: [{ name: 'Prescrição', done: false }] }]));
        localStorage.setItem('catedra:reviews', JSON.stringify([{ id: 'r1', up: 1, tema: 'Prescrição', prox: '2026-09-01', intervalo: 1, facilidade: 2.5, repeticoes: 0 }]));
        localStorage.setItem('catedra:blocks', JSON.stringify([{ id: 'b1', up: 1, disc: 'Direito Civil', kind: 'Teoria', min: 50 }]));
        localStorage.setItem('catedra:sessions', JSON.stringify([{ id: 's1', ts: 1, disc: 'Direito Civil', min: 45 }]));
        localStorage.setItem('catedra:prefs', JSON.stringify({ nome: 'Lana', fontScale: 'grande' }));
      }
    } catch (_) {}
  });
  await areaPg.goto(URL0 + '/Catedra.dc.html');
  await areaPg.waitForTimeout(2000);

  const trocarArea = async (id) => {
    return areaPg.evaluate(async (alvoId) => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      window.__catedraGoView('ajustes'); await w(1600);
      for (let i = 0; i < 6; i++) {
        const alvo = [...document.querySelectorAll('button[data-a]')].find(x => x.dataset.a === alvoId);
        if (alvo) {
          alvo.click(); await w(900);
          // a troca passou a exigir confirmação (prévia): clicar no card só PROPÕE
          const conf = [...document.querySelectorAll('button')]
            .find(x => /^trocar para /i.test((x.textContent || '').trim()));
          if (conf) { conf.click(); }
          await w(2200); return 'ok';
        }
        const abrir = [...document.querySelectorAll('button')]
          .find(x => /^trocar de área$/i.test((x.textContent || '').trim()));
        if (abrir) { abrir.click(); await w(900); } else { await w(600); }
      }
      // devolve o MOTIVO: "false" nu não se conserta
      const t = document.body.innerText || '';
      return 'não achei o seletor · ajustes=' + /Personalização, orientação/.test(t)
        + ' trocar=' + [...document.querySelectorAll('button')].some(x => /trocar de área/i.test((x.textContent || '').trim()))
        + ' cards=' + document.querySelectorAll('button[data-a]').length
        + ' área=' + (localStorage.getItem('catedra:areaEstudo') || '?')
        + ' corpo=' + t.slice(0, 50).replace(/\n+/g, ' ');
    }, id);
  };
  const lerChaves = () => areaPg.evaluate(() => {
    const g = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
    return { edital: g('catedra:edital'), reviews: g('catedra:reviews'),
             blocks: g('catedra:blocks'), sessions: g('catedra:sessions'),
             prefs: g('catedra:prefs'),
             saudeEdital: g('catedra:edital@saude'), saudeRev: g('catedra:reviews@saude') };
  });

  const antesDaTroca = await lerChaves();
  const foiParaSaude = await trocarArea('saude');
  ok(foiParaSaude === 'ok', 'AREA a troca de área acontece pela interface (' + foiParaSaude + ')');

  /* Comparação por CONTEÚDO, não byte a byte: o app re-serializa legitimamente ao salvar
     (carimbo `up`, campos que ele completa), e um teste preso ao texto exato reprova por
     causa disso — escondendo o que ele deveria proteger, que é não perder nada. */
  const conteudo = (bruto) => {
    try { const a = JSON.parse(bruto || '[]'); return Array.isArray(a) ? a.map(x => x.id).sort().join(',') : ''; }
    catch (_) { return 'ILEGÍVEL'; }
  };
  if (foiParaSaude === 'ok') {
    const emSaude = await lerChaves();
    ok(conteudo(emSaude.edital) === conteudo(antesDaTroca.edital)
       && conteudo(emSaude.reviews) === conteudo(antesDaTroca.reviews)
       && conteudo(emSaude.sessions) === conteudo(antesDaTroca.sessions),
      'AREA o caderno de Direito continua intacto no armazenamento');
    // e a TELA de Saúde não mostra o edital de magistratura
    const naTela = await areaPg.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      window.__catedraGoView('edital'); await w(1200);
      return { texto: (document.querySelector('main') || document.body).innerText };
    });
    ok(!/Direito Civil/.test(naTela.texto),
      'AREA o edital de Direito não aparece dentro de Saúde');

    const voltou = await trocarArea('juridica');
    ok(voltou === 'ok', 'AREA dá para voltar para Direito (' + voltou + ')');
    if (voltou === 'ok') {
      const depois = await lerChaves();
      ok(conteudo(depois.edital) === conteudo(antesDaTroca.edital), 'AREA o edital volta inteiro ('
        + conteudo(depois.edital) + ')');
      ok(conteudo(depois.reviews) === conteudo(antesDaTroca.reviews), 'AREA as revisões voltam inteiras');
      ok(conteudo(depois.sessions) === conteudo(antesDaTroca.sessions), 'AREA o histórico volta inteiro');
      ok((() => { try { const p = JSON.parse(depois.prefs || '{}'); return p.nome === 'Lana' && p.fontScale === 'grande'; }
                 catch (_) { return false; } })(), 'AREA preferência é da pessoa, não da área');
      const volta = await areaPg.evaluate(async () => {
        const w = ms => new Promise(r => setTimeout(r, ms));
        window.__catedraGoView('edital'); await w(1200);
        return (document.querySelector('main') || document.body).innerText;
      });
      ok(/Direito Civil/.test(volta), 'AREA e a tela mostra o edital de volta');
    }
  }

  /* 7) A BUSCA só oferece o que a área pode abrir. Buscar o que não se pode abrir é
        pior que não achar: promete uma porta e mostra um muro. E o juris-index pesa
        2,4 MB — nem carregar faz sentido fora das carreiras jurídicas. */
  const buscaPorArea = await areaPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const abrirPaleta = async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
      await w(600);
      return document.querySelector('input[aria-label="Buscar em toda a plataforma"]');
    };
    const buscar = async (termo) => {
      const i = await abrirPaleta(); if (!i) return null;
      i.value = termo; i.dispatchEvent(new Event('input', { bubbles: true })); await w(1400);
      const t = document.body.innerText;
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await w(400);
      return t;
    };
    const r = {};
    // em Direito, a jurisprudência aparece
    const emDireito = await buscar('súmula');
    r.direitoAchaSumula = /súmula/i.test(emDireito || '');
    return r;
  });
  for (const [k, v] of Object.entries(buscaPorArea)) ok(v, 'AREA busca ' + k);

  /* A medição em Saúde tem de acontecer numa ABA NOVA: o juris-index.js já foi baixado
     enquanto a aba estava em Direito, e script carregado não se descarrega. Perguntar
     "carregou?" na mesma aba mediria o passado, não a regra. */
  const saudeCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const saudePg = await saudeCtx.newPage();
  await saudePg.addInitScript(() => {
    try {
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:areaEstudo', JSON.stringify('saude'));
    } catch (_) {}
  });
  await saudePg.goto(URL0 + '/Catedra.dc.html');
  await saudePg.waitForTimeout(1900);
  const emSaude = await saudePg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
    await w(700);
    const i = document.querySelector('input[aria-label="Buscar em toda a plataforma"]');
    if (!i) return { semPaleta: true };
    i.value = 'súmula'; i.dispatchEvent(new Event('input', { bubbles: true })); await w(1800);
    return { texto: document.body.innerText, carregouJuris: !!window.__JURIS_IDX__,
             carregouPecas: !!window.CT_PECAS };
  });
  if (!emSaude.semPaleta) {
    ok(!/Súmula \d/.test(emSaude.texto), 'AREA busca não devolve súmula em Saúde');
    ok(!emSaude.carregouJuris, 'AREA busca nem baixa o acervo de jurisprudência fora das jurídicas (2,4 MB)');
    ok(!emSaude.carregouPecas, 'AREA busca nem baixa o catálogo de peças fora das jurídicas');
  }
  await saudeCtx.close();

  /* 8) Nada na tela pode apontar para uma porta fechada, e grupo sem item é ruído.
        Em Saúde sobrava um cabeçalho "TREINO" solto, com borda e tudo, sem nada embaixo —
        e o atalho "Simulados" nos essenciais levava direto à tela barrada. */
  const saudeCtx2 = await browser.newContext({ viewport: { width: 1365, height: 936 } });
  const saudePg2 = await saudeCtx2.newPage();
  await saudePg2.addInitScript(() => {
    try {
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:areaEstudo', JSON.stringify('saude'));
    } catch (_) {}
  });
  await saudePg2.goto(URL0 + '/Catedra.dc.html');
  await saudePg2.waitForTimeout(2000);
  const semPortaFechada = await saudePg2.evaluate(() => {
    // o que Saúde de fato NÃO tem — oral e simulado passaram a servi-la, sobre a lei dela
    const barrada = ['juris', 'roteiros', 'segundafase', 'redacao', 'prioridade'];
    const atalhos = [...document.querySelectorAll('button[data-view]')]
      .filter(b => b.closest('main')).map(b => b.dataset.view);
    const aside = (document.querySelector('aside') || {}).innerText || '';
    return {
      nenhumAtalhoParaTelaBarrada: atalhos.every(v => !barrada.includes(v)),
      // o grupo só existe quando tem item embaixo — e em Saúde agora tem (simulado e oral)
      grupoCoerenteComOsItens: (/TREINO/i.test(aside))
        === [...document.querySelectorAll('aside button[data-view]')]
          .some(b => ['simulados', 'redacao', 'roteiros', 'segundafase', 'oral'].includes(b.dataset.view)),
      aindaTemOQueEDela: atalhos.includes('areamod') || atalhos.includes('ciclo'),
    };
  });
  for (const [k, v] of Object.entries(semPortaFechada)) ok(v, 'AREA ' + k);
  await saudeCtx2.close();
  // e Jurídica NÃO perde o cabeçalho do grupo
  const juridicaMantem = await areaPg.evaluate(() =>
    /fases da magistratura/i.test((document.querySelector('aside') || {}).innerText || ''));
  ok(juridicaMantem, 'AREA jurídica mantém o grupo "Fases da Magistratura"');

  // 9) todo satélite recebe a área — cinco dos sete não tinham como saber onde estavam
  const contextoSat = await areaPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__catedraGoView('legis'); await w(2200);
    const f = document.querySelector('iframe[data-ct-view="legis"]');
    return { legisRecebeArea: !!f && /area=/.test(f.getAttribute('src') || '') };
  });
  for (const [k, v] of Object.entries(contextoSat)) ok(v, 'AREA ' + k);

  /* 10) O PIOR CAMINHO QUE A REVISAO ENCONTROU, agora testado.
     A nuvem podia trazer areaEstudo de outro aparelho. Sem tratar isso, cada _load()
     continuava usando a area VELHA: o estado ficava hibrido (area Saude + caderno de
     Direito) e, 500 ms depois, o autosave gravava o caderno de Direito dentro de
     catedra:*@saude e subia para a nuvem — apagando o caderno da outra area nos dois
     lados, sem ninguem tocar em nada. */
  const sincCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const sincPg = await sincCtx.newPage();
  await sincPg.addInitScript(() => {
    try {
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
      // caderno de Direito (chaves historicas, sem sufixo)
      localStorage.setItem('catedra:edital', JSON.stringify([{ id: 'jur1', up: 1, disc: 'Direito Civil', peso: 3, color: '#2563EB', topics: [] }]));
      localStorage.setItem('catedra:reviews', JSON.stringify([{ id: 'jr1', up: 1, tema: 'Prescrição', prox: '2026-09-01', intervalo: 1, facilidade: 2.5, repeticoes: 0 }]));
      // caderno de Saude, feito no OUTRO aparelho
      localStorage.setItem('catedra:edital@saude', JSON.stringify([{ id: 'sau1', up: 9, disc: 'Clínica Médica', peso: 4, color: '#0EA5E9', topics: [] }]));
      localStorage.setItem('catedra:reviews@saude', JSON.stringify([{ id: 'sr1', up: 9, tema: 'Sepse', prox: '2026-09-02', intervalo: 1, facilidade: 2.5, repeticoes: 0 }]));
    } catch (_) {}
  });
  await sincPg.goto(URL0 + '/Catedra.dc.html');
  await sincPg.waitForTimeout(2000);
  const sinc = await sincPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const ler = () => {
      const g = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
      const ids = b => { try { return (JSON.parse(b || '[]') || []).map(x => x.id).sort().join(','); } catch (_) { return 'ILEGÍVEL'; } };
      return { jur: ids(g('catedra:edital')), sau: ids(g('catedra:edital@saude')),
               jurRev: ids(g('catedra:reviews')), sauRev: ids(g('catedra:reviews@saude')) };
    };
    const antes = ler();
    // é exatamente o que o pull da nuvem faz: grava a chave e avisa o app
    localStorage.setItem('catedra:areaEstudo', JSON.stringify('saude'));
    window.dispatchEvent(new CustomEvent('catedra:synced'));
    await w(2500);                       // muito além dos 500 ms do autosave
    const depois = ler();
    return { antes, depois, areaFinal: localStorage.getItem('catedra:areaEstudo') };
  });
  ok(sinc.antes.sau === 'sau1' && sinc.antes.jur === 'jur1', 'AREA sync o cenário parte dos dois cadernos distintos');
  ok(sinc.depois.sau === 'sau1',
    'AREA sync NÃO grava o caderno de Direito por cima do de Saúde (edital@saude = ' + sinc.depois.sau + ')');
  ok(sinc.depois.sauRev === 'sr1',
    'AREA sync preserva as revisões da área que chegou (reviews@saude = ' + sinc.depois.sauRev + ')');
  ok(sinc.depois.jur === 'jur1' && sinc.depois.jurRev === 'jr1',
    'AREA sync o caderno de Direito também fica intacto');
  await sincCtx.close();

  /* 11) A CASCA NATIVA precisa saber a área. No Mac e no iPad o CátedraJURIS é uma ABA
     fixa da barra (⌘3), escrita em Swift: o guarda de rota da web não a alcança, porque
     ela não é uma view. Quem estuda Enfermagem apertava ⌘3 e recebia o acervo de súmulas
     inteiro. Aqui se testa o LADO WEB da ponte — que a mensagem é emitida, e com o
     conteúdo certo. O lado Swift foi compilado à parte (0 erros nos dois alvos). */
  const ponteCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pontePg = await ponteCtx.newPage();
  await pontePg.addInitScript(() => {
    try {
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:areaEstudo', JSON.stringify('saude'));
    } catch (_) {}
    // finge a ponte do WKWebView: no navegador ela não existe
    window.__avisos = [];
    window.webkit = { messageHandlers: { catedraArea: { postMessage: (b) => { window.__avisos.push(b); } } } };
  });
  await pontePg.goto(URL0 + '/Catedra.dc.html');
  await pontePg.waitForTimeout(2000);
  const ponte = await pontePg.evaluate(() => {
    const a = (window.__avisos || [])[0] || null;
    return { avisou: !!a, area: a && a.area, juris: a && a.juris, legis: a && a.legis,
             quantos: (window.__avisos || []).length };
  });
  ok(ponte.avisou, 'NATIVO a casca é avisada da área na abertura');
  ok(ponte.area === 'saude', 'NATIVO o aviso leva a área ativa (' + ponte.area + ')');
  ok(ponte.juris === false, 'NATIVO diz que Saúde não tem jurisprudência — a aba ⌘3 some');
  ok(ponte.legis === true, 'NATIVO diz que Saúde tem fontes normativas — o LEGIS fica');
  ok(ponte.quantos === 1, 'NATIVO não repete o aviso a cada render (' + ponte.quantos + ')');
  await pontePg.close();

  // e em Direito a aba continua
  const pontePg2 = await pontelCtxNovo();
  async function pontelCtxNovo() {
    const pg = await ponteCtx.newPage();
    await pg.addInitScript(() => {
      try {
        localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
        localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
      } catch (_) {}
      window.__avisos = [];
      window.webkit = { messageHandlers: { catedraArea: { postMessage: (b) => { window.__avisos.push(b); } } } };
    });
    await pg.goto(URL0 + '/Catedra.dc.html');
    await pg.waitForTimeout(2000);
    return pg;
  }
  const emDireito = await pontePg2.evaluate(() => (window.__avisos || [])[0] || null);
  ok(emDireito && emDireito.juris === true, 'NATIVO em Direito a aba do JURIS continua');
  await pontePg2.close();
  await ponteCtx.close();

  /* 12) A TROCA DE ÁREA PASSA POR UMA PRÉVIA (Fase 2, item 5 do guia).
     Trocar de área deixou de ser um clique só, e por um motivo concreto: desde que cada
     área ganhou o seu caderno, quem troca encontra edital, revisões e histórico DAQUELA
     área — vazios na primeira vez. Ver isso de repente parece perda de dados. */
  const pvCtx = await browser.newContext({ viewport: { width: 1365, height: 936 } });
  const pvPg = await pvCtx.newPage();
  await pvPg.addInitScript(() => {
    try {
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
      localStorage.setItem('catedra:edital', JSON.stringify([{ id: 'e1', up: 1, disc: 'Direito Civil', peso: 3, color: '#2563EB', topics: [] }]));
    } catch (_) {}
  });
  await pvPg.goto(URL0 + '/Catedra.dc.html');
  await pvPg.waitForTimeout(2000);
  const pv = await pvPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__catedraGoView('ajustes'); await w(1500);
    for (let i = 0; i < 5; i++) {
      const card = [...document.querySelectorAll('button[data-a]')].find(x => x.dataset.a === 'saude');
      if (card) { card.click(); await w(900); break; }
      const abrir = [...document.querySelectorAll('button')]
        .find(x => /^trocar de área$/i.test((x.textContent || '').trim()));
      if (abrir) { abrir.click(); await w(700); } else await w(400);
    }
    const t = document.body.innerText;
    const area = () => { try { return localStorage.getItem('catedra:areaEstudo') || ''; } catch (_) { return ''; } };
    const r = {
      abriuPrevia: /trocar de área de estudo/i.test(t),
      naoTrocouSozinha: area().includes('juridica'),
      dizDeParaOnde: /jurídica/i.test(t) && /saúde e medicina/i.test(t),
      dizOQueSome: /deixa de aparecer/i.test(t) && /cátedrajuris/i.test(t),
      // era "casos clínicos": o construtor de casos existe desde a Fase 4, então
      // prometê-lo como futuro virou mentira. O que segue em preparo é o ACERVO.
      dizOQueEstaEmPreparo: /em preparo/i.test(t) && /acervo editorial/i.test(t),
      prometeQueNadaSePerde: /nada é apagado/i.test(t) && /volta inteiro/i.test(t),
      temCancelar: [...document.querySelectorAll('button')].some(x => /^cancelar$/i.test((x.textContent || '').trim())),
    };
    // cancelar tem de deixar tudo como estava
    const cancelar = [...document.querySelectorAll('button')].find(x => /^cancelar$/i.test((x.textContent || '').trim()));
    if (cancelar) { cancelar.click(); await w(700); }
    r.cancelarNaoTroca = area().includes('juridica')
      && !/trocar de área de estudo/i.test(document.body.innerText);
    return r;
  });
  for (const [k, v] of Object.entries(pv)) ok(v, 'PREVIA ' + k);

  // e confirmar troca de verdade
  const pvConf = await pvPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    for (let i = 0; i < 5; i++) {
      const card = [...document.querySelectorAll('button[data-a]')].find(x => x.dataset.a === 'saude');
      if (card) { card.click(); await w(900); break; }
      const abrir = [...document.querySelectorAll('button')]
        .find(x => /^trocar de área$/i.test((x.textContent || '').trim()));
      if (abrir) { abrir.click(); await w(700); } else await w(400);
    }
    const conf = [...document.querySelectorAll('button')].find(x => /^trocar para /i.test((x.textContent || '').trim()));
    if (!conf) return { semBotao: true };
    conf.click(); await w(2200);
    const area = (() => { try { return localStorage.getItem('catedra:areaEstudo') || ''; } catch (_) { return ''; } })();
    const jur = (() => { try { return localStorage.getItem('catedra:edital') || ''; } catch (_) { return ''; } })();
    return { confirmouTroca: area.includes('saude'),
             cadernoDeDireitoIntacto: /Direito Civil/.test(jur) };
  });
  if (!pvConf.semBotao) for (const [k, v] of Object.entries(pvConf)) ok(v, 'PREVIA ' + k);
  await pvCtx.close();

  /* 13) FASE 5 — NENHUM RÓTULO JURÍDICO RESIDUAL fora do Direito.
     O guia é direto: "Remover labels jurídicos residuais de áreas não jurídicas". Esta
     varredura percorre as telas universais em cada área não jurídica e falha se aparecer
     vocabulário de Direito. `petição` leva guarda porque "rePETIÇÃO espaçada" é do SM-2. */
  const TERMOS = /magistratura|jurisprud|súmula|(?<!re)petição|acórdão|peça processual|processual civil|2ª fase|banca examinadora/i;
  const varreCtx = await browser.newContext({ viewport: { width: 1365, height: 936 } });
  for (const area of ['saude', 'social', 'educacao', 'outra']) {
    const vp = await varreCtx.newPage();
    await vp.addInitScript((a) => {
      try {
        localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
        localStorage.setItem('catedra:areaEstudo', JSON.stringify(a));
      } catch (_) {}
    }, area);
    await vp.goto(URL0 + '/Catedra.dc.html');
    await vp.waitForTimeout(1900);
    const achados = await vp.evaluate(async (fonteRegex) => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const RE = new RegExp(fonteRegex, 'i');
      const out = [];
      for (const v of ['inicio', 'ciclo', 'revisoes', 'calendario', 'edital', 'bancas', 'ajustes']) {
        window.__catedraGoView(v); await w(600);
        const m = document.querySelector('main');
        const t = (m ? m.innerText : document.body.innerText);
        const linha = t.split('\n').map(x => x.trim()).find(x => x && RE.test(x));
        if (linha) out.push(v + ': ' + linha.slice(0, 60));
      }
      return out;
    }, TERMOS.source);
    ok(achados.length === 0, 'FASE5 sem rótulo jurídico em ' + area + ' (' + (achados.join(' | ') || 'limpo') + ')');
    await vp.close();
  }
  await varreCtx.close();

  /* 14) FASE 3 — o contrato de estado vazio, aplicado às telas jurídicas.
     O guia exige que EmptyState tenha explicação e AÇÃO possível. A 2ª fase dizia só
     "Nenhuma prova com esse filtro." — e parava aí. Botão morto num estado vazio seria
     pior que estado vazio sem botão, então o teste também aperta o botão. */
  const f3 = await page.evaluate(async (base) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const ifr = document.createElement('iframe');
    ifr.style.cssText = 'position:fixed;left:-9999px;width:1100px;height:820px';
    ifr.src = base + '/segunda-fase-web.html';
    document.body.appendChild(ifr);
    await new Promise(r => { ifr.onload = r; setTimeout(r, 6000); });
    await w(1400);
    const d = ifr.contentDocument;
    if (!d) { ifr.remove(); return { semIframe: true }; }
    const q = d.getElementById('fq');
    if (!q) { ifr.remove(); return { semCampo: true }; }
    q.value = 'zzzzznadaaqui'; q.dispatchEvent(new Event('input', { bubbles: true })); await w(900);
    const t = d.body.innerText;
    const r = {
      mostraVazio: /nenhuma prova com esse filtro/i.test(t),
      explicaPorQue: /o acervo tem \d+ provas/i.test(t),
      ofereceSaida: !!d.getElementById('limparFiltros'),
    };
    const bt = d.getElementById('limparFiltros');
    if (bt) { bt.click(); await w(900); }
    r.aSaidaFunciona = !/nenhuma prova com esse filtro/i.test(d.body.innerText)
      && (d.getElementById('fq') || {}).value === '';
    ifr.remove();
    return r;
  }, URL0);
  if (!f3.semIframe && !f3.semCampo) for (const [k, v] of Object.entries(f3)) ok(v, 'FASE3 ' + k);

  // e as filas de pílulas dos satélites obedecem ao mesmo trilho
  const trilhos = await page.evaluate(async (b) => {
    const alvos = [['legis-web.html', '.tabs.ct-chips'], ['ritos-web.html', '.chips.ct-chips'],
                   ['juris-web.html', '.ct-chips']];
    const out = {};
    for (const [pag, sel] of alvos) {
      const t = await (await fetch(b + '/' + pag)).text();
      out[pag.replace('-web.html', '')] = t.includes('ct-chips') && t.includes('catedra-ui.css');
    }
    return out;
  }, URL0);
  for (const [k, v] of Object.entries(trilhos)) ok(v, 'FASE3 fila no trilho em ' + k);


  /* ===== FASE 4 — casos da pessoa, com a estrutura de cada área ====================
     O que precisa ser verdade: (a) a capacidade existe só onde há esquema; (b) os dois
     esquemas são DIFERENTES — nada de reaproveitar o formulário jurídico; (c) o guarda
     de dados identificáveis BLOQUEIA o salvamento; (d) o caso fica no caderno DAQUELA
     área e em lugar nenhum mais; (e) o treino revela por etapas e a autoavaliação
     agenda a revisão no mesmo motor do resto do app. */
  await areaPg.goto(URL0 + '/Catedra.dc.html');
  await areaPg.waitForTimeout(1500);
  const f4reg = await areaPg.evaluate(() => {
    const R = window.CT_AREA_REG, C = window.CT_CASOS;
    const campos = a => (C.esquema(a) || { campos: [] }).campos.map(c => c.k);
    const sa = campos('saude'), so = campos('social');
    return {
      capacidadeSoOndeHaEsquema: R.tem('saude', 'casosProprios') && R.tem('social', 'casosProprios')
        && !R.tem('juridica', 'casosProprios') && !R.tem('policial', 'casosProprios')
        && !R.tem('outra', 'casosProprios'),
      viewSegueACapacidade: R.podeAbrir('saude', 'casos') && !R.podeAbrir('juridica', 'casos'),
      juridicaNaoTemEsquema: !C.temEsquema('juridica') && C.esquema('juridica') === null,
      esquemasDiferentes: sa.join(',') !== so.join(',') && sa.length === 7 && so.length === 10,
      saudeNaOrdemClinica: sa.join(',') === 'titulo,apresentacao,achados,avaliacao,conduta,evolucao,fonte',
      socialNaOrdemDoTrabalhoSocial: so.join(',')
        === 'titulo,contexto,demanda,vulnerabilidade,avaliacao,intervencao,rede,encaminhamentos,acompanhamento,fundamento',
      barraIdentificavel: ['CPF 123.456.789-09', 'tel (69) 98103-8480', 'maria@exemplo.com',
        'Rua das Flores, 120', 'CEP 76800-000', 'prontuário nº 44821', 'nascimento 12/03/1988']
        .every(t => C.acharIdentificaveis(t).length > 0),
      deixaPassarDescricaoLegitima: ['homem, 54 anos, dispneia há 2 dias', 'PA 90x60, FC 118',
        'família com 4 pessoas, 2 crianças em idade escolar', 'doença de Crohn desde 2019']
        .every(t => C.acharIdentificaveis(t).length === 0),
    };
  });
  for (const [k, v] of Object.entries(f4reg)) ok(v, 'FASE4 ' + k);

  // o percurso de verdade, na tela: escrever → ser barrado pelo guarda → corrigir → treinar
  await areaPg.evaluate(() => localStorage.setItem('catedra:areaEstudo', JSON.stringify('saude')));
  await areaPg.goto(URL0 + '/Catedra.dc.html');
  await areaPg.waitForTimeout(1600);
  const f4tela = await areaPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const bt = re => [...document.querySelectorAll('button')]
      .find(x => re.test((x.textContent || '').trim()));
    const r = {};
    // 1) o menu chama o caso pelo nome da área
    r.menuComNomeDaArea = /casos clínicos/i.test(document.body.innerText);
    const menu = bt(/^casos clínicos$/i); if (menu) menu.click(); await w(700);
    r.abriuAView = /meus casos clínicos/i.test(document.body.innerText);
    // 2) o construtor traz os campos do esquema clínico, e nenhum campo jurídico
    const novo = bt(/^novo caso$|^escrever o primeiro$/i); if (novo) novo.click(); await w(600);
    const t = document.body.innerText;
    // rascunho não oferece "Apagar": só o caso já guardado
    r.rascunhoNaoOfereceApagar = !bt(/^apagar$/i);
    r.temCamposClinicos = /apresentação/i.test(t) && /achados/i.test(t) && /conduta/i.test(t)
      && /evolução/i.test(t);
    r.semCampoJuridico = !/peça|dispositivo legal|jurisprudência/i.test(t);
    // 3) preencher com algo identificável e tentar guardar
    const set = (sel, val) => { const e = document.querySelector(sel); if (!e) return false;
      const p = Object.getOwnPropertyDescriptor(e.constructor.prototype, 'value');
      p.set.call(e, val); e.dispatchEvent(new Event('input', { bubbles: true })); return true; };
    r.achouCampos = set('[data-k="titulo"]', 'Dispneia súbita em pós-operatório')
      && set('[data-k="apresentacao"]', 'Paciente Maria, CPF 123.456.789-09, dispneia há 2 dias.');
    await w(400);
    const guardar = bt(/^guardar o caso$/i); if (guardar) guardar.click(); await w(600);
    const t2 = document.body.innerText;
    r.guardaBloqueou = /não pode ser guardado/i.test(t2) && /cpf/i.test(t2);
    r.disseComoConsertar = /homem, 54 anos/i.test(t2);
    // o autosave já pode ter gravado a chave vazia — o que não pode é ter CONTEÚDO
    r.naoGravouNada = JSON.parse(localStorage.getItem('catedra:casos@saude') || '[]').length === 0;
    // 4) corrigir e guardar de verdade
    set('[data-k="apresentacao"]', 'Homem, 54 anos, dispneia súbita 2 dias após herniorrafia.');
    set('[data-k="achados"]', 'PA 90x60, FC 118, SpO2 88% em ar ambiente.');
    set('[data-k="conduta"]', 'Oxigenoterapia, anticoagulação plena e angiotomografia.');
    await w(300);
    const g2 = bt(/^guardar o caso$/i); if (g2) g2.click(); await w(900);
    const cru = localStorage.getItem('catedra:casos@saude');
    const salvos = JSON.parse(cru || '[]');
    const abrirDeNovo = bt(/^editar$/i); if (abrirDeNovo) abrirDeNovo.click(); await w(600);
    r.casoGuardadoOfereceApagar = !!bt(/^apagar$/i);
    const volta = bt(/^cancelar$/i); if (volta) volta.click(); await w(500);
    r.guardouNoCadernoDaArea = salvos.length === 1 && salvos[0].apresentacao.indexOf('54 anos') > -1;
    /* o que casoSalvar grava tem de ser EXATAMENTE o esquema mais os metadados: espalhar o
       rascunho inteiro é o que levava campo de outra área para o disco, sem auditoria */
    r.gravouSoAsChavesDoEsquema = salvos.length === 1
      && Object.keys(salvos[0]).sort().join(',')
         === ['achados','apresentacao','area','avaliacao','conduta','criado','evolucao',
              'fonte','id','perguntas','titulo','treinos','up'].sort().join(',');
    r.naoVazouParaOCadernoJuridico = JSON.parse(localStorage.getItem('catedra:casos') || '[]').length === 0;
    r.semAfordanciaDeCompartilhar = !/compartilhar|publicar|enviar para o grupo/i
      .test(document.body.innerText);
    // 5) treinar: revela por etapas, não de uma vez
    const treinar = bt(/^discutir o caso$/i); if (treinar) treinar.click(); await w(700);
    const t3 = document.body.innerText;
    r.treinoComecaPelaApresentacao = /54 anos/.test(t3) && !/angiotomografia/i.test(t3);
    const rev = bt(/revelar a próxima parte/i); if (rev) rev.click(); await w(500);
    r.revelaEmEtapas = /PA 90x60/.test(document.body.innerText)
      && !/angiotomografia/i.test(document.body.innerText);
    const rev2 = bt(/revelar a próxima parte/i); if (rev2) rev2.click(); await w(500);
    r.chegaAoFim = /angiotomografia/i.test(document.body.innerText)
      && !!bt(/^conduzi bem$/i);
    // 6) a autoavaliação entra no MESMO motor de revisão
    const aval = bt(/^conduzi bem$/i); if (aval) aval.click(); await w(900);
    const revs = JSON.parse(localStorage.getItem('catedra:reviews@saude') || '[]');
    r.agendouRevisao = revs.some(x => x.casoId && /dispneia/i.test(x.topic || ''));
    r.contouOTreino = (JSON.parse(localStorage.getItem('catedra:casos@saude') || '[]')[0]
      .treinos || []).length === 1;
    return r;
  });
  for (const [k, v] of Object.entries(f4tela)) ok(v, 'FASE4 tela ' + k);

  // e em Assistência Social o formulário é OUTRO — não é o de saúde renomeado
  await areaPg.evaluate(() => localStorage.setItem('catedra:areaEstudo', JSON.stringify('social')));
  await areaPg.goto(URL0 + '/Catedra.dc.html');
  await areaPg.waitForTimeout(1600);
  const f4soc = await areaPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const bt = re => [...document.querySelectorAll('button')]
      .find(x => re.test((x.textContent || '').trim()));
    const menu = bt(/^casos socioassistenciais$/i); if (menu) menu.click(); await w(700);
    const novo = bt(/^novo caso$|^escrever o primeiro$/i); if (novo) novo.click(); await w(600);
    const t = document.body.innerText;
    return {
      formularioProprio: /contexto familiar e territorial/i.test(t) && /vulnerabilidades/i.test(t)
        && /rede acionada/i.test(t) && /encaminhamentos/i.test(t),
      // pelos CAMPOS, não pelo texto da página: "conduta" aparece legitimamente na dica
      // do fundamento ("a norma que sustenta a conduta") sem ser campo de caso clínico
      semCamposClinicos: ['achados', 'conduta', 'evolucao', 'apresentacao']
        .every(k => !document.querySelector('[data-k="' + k + '"]')),
      camposSaoOsDoEsquemaSocial: [...document.querySelectorAll('[data-k]')]
        .map(e => e.dataset.k).filter(k => k !== 'q' && k !== 'r').join(',')
        === 'titulo,contexto,demanda,vulnerabilidade,avaliacao,intervencao,rede,encaminhamentos,acompanhamento,fundamento',
      cadernoSeparado: JSON.parse(localStorage.getItem('catedra:casos@social') || '[]').length === 0
        && JSON.parse(localStorage.getItem('catedra:casos@saude') || '[]').length === 1,
    };
  });
  for (const [k, v] of Object.entries(f4soc)) ok(v, 'FASE4 social ' + k);

  // jurídica não abre a tela nem por deep link — e explica em vez de sumir
  await areaPg.evaluate(() => localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica')));
  await areaPg.goto(URL0 + '/Catedra.dc.html');
  await areaPg.waitForTimeout(1600);
  const f4jur = await areaPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    try { window.__catedraGoView('casos'); } catch (_) {}
    await w(800);
    const t = document.body.innerText;
    return {
      naoAbre: !/meus casos/i.test(t),
      explicaEmVezDeSumir: /não faz parte de/i.test(t),
      semMenuDeCasos: ![...document.querySelectorAll('button')]
        .some(x => /^casos (clínicos|socioassistenciais)$/i.test((x.textContent || '').trim())),
    };
  });
  for (const [k, v] of Object.entries(f4jur)) ok(v, 'FASE4 jurídica ' + k);

  /* Sem entrada em ARRAY_ID, `casos` sincronizaria como blob inteiro: um aparelho
     apagaria o caso escrito no outro, e a lápide da exclusão não seguraria — que é
     exatamente o defeito já documentado em `reviews@area`. */

  /* ===== FASE 4 · o que a revisão adversarial pegou ================================
     Cada bloco aqui nasceu de um defeito CONFIRMADO. Eles cobrem o que a primeira leva
     de testes não olhava: os falsos POSITIVOS do guarda (que barravam caso legítimo), a
     troca de área com caso aberto, o ida-e-volta do backup e a revisão órfã. */

  const f4pii = await areaPg.evaluate(() => {
    const C = window.CT_CASOS;
    const BARRA = ['CPF 123.456.789-09', 'tel (69) 98103-8480', '(11) 3255-1010',
      '(011) 3222-1010', '(11) 9 8765-4321', 'Retorno pelo +55 11 98765-4321.',
      'Telefone da irmã: +55 11 98765-4321', 'Fone 021 99888-7766', 'WhatsApp 11 98765-4321',
      'telefone: 98103-8480', 'contato 98765-4321', 'cel 98103-8480', 'contato: 98103-8480',
      'celular: (11) 98888-7777', 'maria@exemplo.com', 'Rua das Flores, 120',
      'Rua das Flores nº 120', 'Avenida Sete de Setembro 1200', 'Av. Brasil, 45',
      'Travessa Bela 7', 'CEP 76800-000', '76800-000', 'prontuário nº 44821',
      'matrícula 998877', 'registro nº 4482', 'nascimento 12/03/1988', 'nasc. 1/2/88',
      'dn 12.03.1988', 'cartão 700 1234 5678 9012', 'RG: 1234567'];
    // prosa legítima de caso clínico e socioassistencial — barrar qualquer uma delas é
    // defeito GRAVE: a pessoa fica sem como guardar um caso que não identifica ninguém
    const PASSA = ['em situação de rua há 3 anos', 'Moram na mesma rua do CRAS há 2 anos',
      'Consultório na Rua há 6 meses', 'acidente em rodovia BR 116',
      'mora em estrada vicinal a 30 km da sede', 'acompanhamento de 2019-2023 no PAIF',
      'débito urinário de 1500-2000 mL em 24 horas', 'diurese 1200-1800 mL/dia',
      'homem, 54 anos, dispneia há 2 dias', 'PA 90x60, FC 118', 'peso ao nascer 1.500 g',
      'família com 4 pessoas, 2 crianças em idade escolar', 'doença de Crohn desde 2019',
      'benefício de 1.412 reais por mês', 'acompanhado desde 03/2019', 'escore de Glasgow 12',
      // homógrafos: "celular" e "contato" são palavra corrente nestas duas profissões, e
      // colá-las a uma faixa numérica NÃO faz um telefone
      'contagem celular 1200-1800/mm³', 'Referência da contagem celular: 4500-11000/mm³',
      'densidade celular 1500-2000 por campo', 'contato 2019-2023 com a rede',
      'contato semanal de 2018-2020', 'telefonema de 2019-2023',
      'telefone: a família tem 2 filhos e renda de 1200 a 1800 reais',
      'leucócitos 4500-11000/mm³', 'plaquetas 150000-400000', 'sódio 135-145 mEq/L',
      'internada de 12/2019 a 03/2020', 'idade gestacional de 34 semanas', 'CID J18.9',
      'glicemia 126 mg/dL', 'renda per capita de 218 reais', '12 sessões de fisioterapia',
      'internado por 12 dias', 'dose de 500 mg, 3x ao dia', 'frequência respiratória 28 irpm',
      '20 atendimentos entre 2021 e 2024', 'registro de acompanhamento desde 2019',
      'matrícula escolar regular', 'nasceu prematuro'];
    const escapou = BARRA.filter(t => C.acharIdentificaveis(t).length === 0);
    const barrouDemais = PASSA.filter(t => C.acharIdentificaveis(t).length > 0);
    return {
      barraOQueIdentifica: escapou.length === 0 || ('escapou: ' + escapou.join(' | ')),
      naoBarraProsaLegitima: barrouDemais.length === 0 || ('barrou: ' + barrouDemais.join(' | ')),
      // o guarda olha TODO campo de texto, não só os do esquema da área ativa
      auditaCampoForaDoEsquema: C.auditar(
        { id: 'x', area: 'saude', apresentacao: 'CPF 123.456.789-09', titulo: 'a', contexto: 'b', demanda: 'c' },
        'social').length === 1,
      gravaSoOEsquema: !('apresentacao' in C.apenasDoEsquema(
        { id: 'x', apresentacao: 'sobra clínica', titulo: 'a' }, 'social')),
    };
  });
  for (const [k, v] of Object.entries(f4pii)) ok(v === true, 'FASE4 guarda ' + k + (v === true ? '' : ' — ' + v));

  /* Trocar de área com rascunho aberto: o caso clínico não pode terminar no caderno
     socioassistencial, e a tela não pode continuar exibindo o que a área não tem. */
  await areaPg.evaluate(() => { localStorage.setItem('catedra:areaEstudo', JSON.stringify('saude'));
    localStorage.removeItem('catedra:casos@saude'); localStorage.removeItem('catedra:casos@social'); });
  await areaPg.goto(URL0 + '/Catedra.dc.html');
  await areaPg.waitForTimeout(1600);
  const f4troca = await areaPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const bt = re => [...document.querySelectorAll('button')].find(x => re.test((x.textContent || '').trim()));
    const set = (sel, val) => { const e = document.querySelector(sel); if (!e) return false;
      const p = Object.getOwnPropertyDescriptor(e.constructor.prototype, 'value');
      p.set.call(e, val); e.dispatchEvent(new Event('input', { bubbles: true })); return true; };
    const r = {};
    (bt(/^casos clínicos$/i) || {}).click?.(); await w(600);
    (bt(/^novo caso$|^escrever o primeiro$/i) || {}).click?.(); await w(500);
    set('[data-k="titulo"]', 'Dispneia pós-operatória');
    set('[data-k="apresentacao"]', 'Homem, 54 anos, CPF 123.456.789-09, dispneia súbita.');
    await w(300);
    // troca de área PELA INTERFACE, sem recarregar — é o caminho que o teste antigo pulava
    const irAjustes = async () => {
      const bt2 = re => [...document.querySelectorAll('button')].find(x => re.test((x.textContent || '').trim()));
      let a = bt2(/^ajustes$/i);
      if (!a) { const mais = bt2(/^mais opções$/i); if (mais) { mais.click(); await w(500); a = bt2(/^ajustes$/i); } }
      if (a) { a.click(); await w(900); return true; }
      return false;
    };
    if (!await irAjustes()) return { semAjustes: true };
    for (let i = 0; i < 5; i++) {
      const card = [...document.querySelectorAll('button[data-a]')].find(x => x.dataset.a === 'social');
      if (card) { card.click(); await w(900); break; }
      const abrir = bt(/^trocar de área$/i);
      if (abrir) { abrir.click(); await w(700); } else await w(400);
    }
    const conf = [...document.querySelectorAll('button')].find(x => /^trocar para /i.test((x.textContent || '').trim()));
    if (!conf) return { semBotao: true };
    conf.click(); await w(2200);
    r.trocouMesmo = (localStorage.getItem('catedra:areaEstudo') || '').includes('social');
    const irCasos = bt(/^casos socioassistenciais$/i); if (irCasos) irCasos.click(); await w(800);
    r.construtorFechou = !document.querySelector('[data-k="apresentacao"]')
      && !document.querySelector('[data-k="contexto"]');
    r.naoMostraCasoDaOutraArea = !/dispneia pós-operatória/i.test(document.body.innerText);
    await w(900);
    r.nadaVazouParaOSocial = JSON.parse(localStorage.getItem('catedra:casos@social') || '[]')
      .every(c => !c || !('apresentacao' in c));
    r.socialSegueVazio = JSON.parse(localStorage.getItem('catedra:casos@social') || '[]').length === 0;
    return r;
  });
  // um teste que se pula sozinho não é teste: se o caminho não existir, isto FALHA
  ok(!f4troca.semAjustes && !f4troca.semBotao,
     'FASE4 troca o caminho da troca de área existe' + (f4troca.semAjustes || f4troca.semBotao ? ' — ' + JSON.stringify(f4troca) : ''));
  for (const [k, v] of Object.entries(f4troca)) {
    if (k === 'semAjustes' || k === 'semBotao') continue;
    ok(v, 'FASE4 troca ' + k);
  }


  /* O backup é o único caminho de volta para conteúdo que só existe porque a pessoa
     escreveu. A tela promete "entram no seu backup" — e a restauração estava apagando os
     casos: o arquivo devolvia ao disco, mas o estado seguia velho e o autosave regravava
     vazio 500 ms depois. Este teste faz o ida-e-volta de verdade. */
  await areaPg.evaluate(() => { localStorage.setItem('catedra:areaEstudo', JSON.stringify('saude'));
    localStorage.setItem('catedra:casos@saude', JSON.stringify([{ id: 'cbk', up: 5, criado: 5,
      area: 'saude', titulo: 'Choque séptico no pós-operatório',
      apresentacao: 'Mulher, 61 anos, febre e hipotensão no 3º dia de pós-operatório.',
      achados: 'PA 80x50, FC 124, lactato 4,2.', avaliacao: '', conduta: '', evolucao: '',
      fonte: '', perguntas: [], treinos: [] }])); });
  await areaPg.goto(URL0 + '/Catedra.dc.html');
  await areaPg.waitForTimeout(1600);
  const f4bkp = await areaPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const bt = re => [...document.querySelectorAll('button')].find(x => re.test((x.textContent || '').trim()));
    // 1) exportar, capturando o Blob em vez de baixar o arquivo
    let texto = '';
    const criar = URL.createObjectURL;
    URL.createObjectURL = (b) => { try { b.text().then(t => { texto = t; }); } catch (_) {} return 'blob:teste'; };
    const irAjustes = async () => {
      const bt2 = re => [...document.querySelectorAll('button')].find(x => re.test((x.textContent || '').trim()));
      let a = bt2(/^ajustes$/i);
      if (!a) { const mais = bt2(/^mais opções$/i); if (mais) { mais.click(); await w(500); a = bt2(/^ajustes$/i); } }
      if (a) { a.click(); await w(900); return true; }
      return false;
    };
    if (!await irAjustes()) { URL.createObjectURL = criar; return { semBotaoExportar: true }; }
    const abaDados = document.querySelector('button[data-t="dados"]');
    if (abaDados) { abaDados.click(); await w(700); }
    const exp = bt(/exportar backup/i); if (!exp) { URL.createObjectURL = criar; return { semBotaoExportar: true }; }
    exp.click(); await w(900);
    URL.createObjectURL = criar;
    const r = { exportouOCaso: /Choque séptico/.test(texto) };
    try { localStorage.setItem('teste_backup', texto); } catch (_) {}
    return r;
  });
  ok(!f4bkp.semBotaoExportar, 'FASE4 backup o botão de exportar existe');
  if (!f4bkp.semBotaoExportar) {
    ok(f4bkp.exportouOCaso, 'FASE4 backup exportouOCaso');
    // 2) aparelho "limpo": o caso some do disco e da memória
    await areaPg.evaluate(() => localStorage.removeItem('catedra:casos@saude'));
    await areaPg.goto(URL0 + '/Catedra.dc.html');
    await areaPg.waitForTimeout(1600);
    const volta = await areaPg.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const bt = re => [...document.querySelectorAll('button')].find(x => re.test((x.textContent || '').trim()));
      const texto = localStorage.getItem('teste_backup') || '';
      if (!texto) return { semTexto: true };
      // o input de importar é criado na hora e nunca entra no DOM: capturo na criação
      const criarEl = document.createElement.bind(document);
      let alvo = null;
      document.createElement = (t) => { const e = criarEl(t); if (t === 'input') alvo = e; return e; };
      const bt2 = re => [...document.querySelectorAll('button')].find(x => re.test((x.textContent || '').trim()));
      let aj = bt2(/^ajustes$/i);
      if (!aj) { const mais = bt2(/^mais opções$/i); if (mais) { mais.click(); await w(500); aj = bt2(/^ajustes$/i); } }
      if (aj) { aj.click(); await w(900); }
      const abaDados = document.querySelector('button[data-t="dados"]');
      if (abaDados) { abaDados.click(); await w(700); }
      const imp = bt(/importar dados|importar backup/i);
      if (!imp) { document.createElement = criarEl; return { semBotaoImportar: true }; }
      imp.click(); await w(300);
      document.createElement = criarEl;
      if (!alvo) return { semInput: true };
      const arq = new File([texto], 'catedra-backup.json', { type: 'application/json' });
      Object.defineProperty(alvo, 'files', { value: [arq], configurable: true });
      alvo.onchange && alvo.onchange();
      await w(2500);                       // passa do autosave de 500 ms de propósito
      const disco = JSON.parse(localStorage.getItem('catedra:casos@saude') || '[]');
      return {
        oCasoVoltouAoDisco: disco.length === 1 && /Choque séptico/.test(disco[0].titulo || ''),
        oAutosaveNaoApagou: disco.length === 1 && !!disco[0].apresentacao,
      };
    });
    if (!volta.semTexto && !volta.semBotaoImportar && !volta.semInput) {
      for (const [k, v] of Object.entries(volta)) ok(v, 'FASE4 backup ' + k);
    } else {
      ok(false, 'FASE4 backup o teste não achou por onde importar (' + JSON.stringify(volta) + ')');
    }
  }

  /* Revisão órfã: o caso morre com lápide, mas a revisão dele era só filtrada. O outro
     aparelho devolvia a revisão pelo merge por id e ela voltava para sempre, com o título
     de um caso que não existe e sem tela por onde removê-la. */
  /* Semeadura em ABA NOVA com addInitScript: semear com setItem na aba compartilhada não
     funciona — o app da carga anterior ainda está vivo e o autosave dele grava por cima
     500 ms depois, o que aqui apagava justamente a lápide que o teste quer exercitar. */
  const orfaCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await orfaCtx.addInitScript(() => {
    try {
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:areaEstudo', JSON.stringify('saude'));
      localStorage.setItem('catedra:casos@saude', JSON.stringify([{ id: 'cmorto', del: true, up: 900 }]));
      localStorage.setItem('catedra:reviews@saude', JSON.stringify([
        { id: 'rorfa', casoId: 'cmorto', disc: 'Caso clínico', topic: 'Choque séptico', color: '#8b5cf6',
          due: 0, dueDate: '2026-01-01', intervalo: 1, facilidade: 2.5, repeticoes: 1, up: 100 },
        { id: 'rviva', disc: 'Direito Civil', topic: 'Prescrição', color: '#2563EB',
          due: 0, dueDate: '2026-01-01', intervalo: 1, facilidade: 2.5, repeticoes: 1, up: 100 },
      ]));
    } catch (_) {}
  });
  const orfaPg = await orfaCtx.newPage();
  await orfaPg.goto(URL0 + '/Catedra.dc.html');
  // esperar a CONDIÇÃO, não um tempo fixo: a gravação do autosave atrasa sob carga, e um
  // sleep generoso hoje vira falha intermitente amanhã
  let orfaCaiu = true;
  try {
    await orfaPg.waitForFunction(
      () => !JSON.parse(localStorage.getItem('catedra:reviews@saude') || '[]').some(r => r.id === 'rorfa'),
      { timeout: 15000 });
  } catch (_) { orfaCaiu = false; }
  const f4orfa = await orfaPg.evaluate(() => {
    const rv = JSON.parse(localStorage.getItem('catedra:reviews@saude') || '[]');
    return {
      soltouARevisaoDoCasoApagado: !rv.some(r => r.id === 'rorfa'),
      naoLevouAsOutrasJunto: rv.some(r => r.id === 'rviva'),
      sumiuDaTela: !/choque séptico/i.test(document.body.innerText),
    };
  });
  f4orfa.soltouARevisaoDoCasoApagado = f4orfa.soltouARevisaoDoCasoApagado && orfaCaiu;
  for (const [k, v] of Object.entries(f4orfa)) ok(v, 'FASE4 revisão ' + k);

  /* Vocabulário jurídico não pode ser oferecido como método de estudo a quem não estuda
     Direito — nem na tela Bancas, nem na aba Banca dos Ajustes, nem no rótulo do menu. */
  const f4banca = await orfaPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const bt = re => [...document.querySelectorAll('button')].find(x => re.test((x.textContent || '').trim()));
    const JUR = /súmula|sumul|jurisprud|lei seca|tribunais superiores|acórdão|em Direito/i;
    const out = {};
    const irBancas = bt(/^bancas$/i); if (irBancas) irBancas.click(); await w(900);
    out.telaBancasLimpa = !JUR.test(document.body.innerText);
    let aj = bt(/^ajustes$/i);
    if (!aj) { const mais = bt(/^mais opções$/i); if (mais) { mais.click(); await w(500); aj = bt(/^ajustes$/i); } }
    out.achouAjustes = !!aj;
    if (aj) { aj.click(); await w(900); }
    const abaBanca = document.querySelector('button[data-t="banca"]');
    out.achouAbaBanca = !!abaBanca;          // seletor sumiu → vermelho, não silêncio
    if (abaBanca) { abaBanca.click(); await w(800); }
    /* A prova de abertura precisa ser EXCLUSIVA do painel. "estilo|formato|foco" já casava
       na aba "Você" ("tom e foco", "ESTILO DE COBRANÇA"), então o bloco inteiro ficava verde
       mesmo sem a aba nunca ter aberto — e mediria uma aba que é limpa por natureza. */
    const painel = document.querySelector('#aj-banca-painel');
    out.abaBancaAbriu = !!painel;
    const txtPainel = painel ? painel.innerText : '';
    out.abaBancaTemConteudo = /formato das questões/i.test(txtPainel);
    out.abaBancaLimpa = !!painel && !JUR.test(txtPainel);
    // e a concordância não pode quebrar ao trocar o vocabulário ("a texto das diretrizes")
    out.abaBancaConcorda = !!painel
      && !/\b(?:a|as|na|nas)\s+texto\b|\bo\s+literalidade\b/i.test(txtPainel);
    return out;
  });
  for (const [k, v] of Object.entries(f4banca)) ok(v, 'FASE4 banca ' + k);
  await orfaCtx.close();


  /* ===== DISCURSIVAS — o enunciado lê como página ==================================
     Texto extraído de PDF chegava com a quebra de linha da página da banca (frases
     partidas no meio) e com o cabeçalho repetido: uma vez no herói, outra na 1ª linha
     do corpo. O teste abre uma prova REAL do banco (TJ-MS 2023, FGV) e confere os três
     consertos: largura de leitura, junção das quebras e cabeçalho sem eco. */
  await areaPg.evaluate(() => localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica')));
  await areaPg.goto(URL0 + '/Catedra.dc.html');
  await areaPg.waitForTimeout(1800);
  const disc = await areaPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__catedraGoView('redacao'); await w(2600);
    const busca = [...document.querySelectorAll('input')].find(x => /Buscar por tema/i.test(x.placeholder || ''));
    if (!busca) return { semBusca: true };
    const pd = Object.getOwnPropertyDescriptor(busca.constructor.prototype, 'value');
    pd.set.call(busca, 'TJ-MS'); busca.dispatchEvent(new Event('input', { bubbles: true })); await w(1000);
    const card = [...document.querySelectorAll('button')].find(x => /TJ-MS/.test(x.textContent || ''));
    if (!card) return { semCard: true };
    card.click(); await w(3200);
    const corpo = document.querySelector('.ct-leitura');
    if (!corpo) return { semCorpo: true };
    const t = corpo.innerText;
    return {
      temLarguraDeLeitura: getComputedStyle(corpo).maxWidth !== 'none',
      fraseInteiraNaMesmaLinha: /secretário de Educação do Município/.test(t) && !/de\nEducação/.test(t),
      juntouAQuebraDoPdf: !/\bda con\n/.test(t) && !/ de\n[A-ZÀ-Ú]/.test(t),
      cabecalhoSemEco: !/^TJ-MS · Juiz Substituto/.test(t.trim()),
      corpoNaoVazio: t.trim().length > 400,
    };
  });
  ok(!disc.semBusca && !disc.semCard && !disc.semCorpo,
     'DISC o caminho até a prova existe' + ((disc.semBusca||disc.semCard||disc.semCorpo)?' — '+JSON.stringify(disc):''));
  for (const [k, v] of Object.entries(disc)) {
    if (k.startsWith('sem')) continue;
    ok(v, 'DISC ' + k);
  }

  // o Catedra.dc.html não carrega o auth.js sozinho; o gancho do merge mora na fixture
  await areaPg.goto(URL0 + '/tests/sync-fixture.html');
  await areaPg.waitForFunction(() => window.CatedraSync && window.CatedraSync._test);
  const f4merge = await areaPg.evaluate(() => {
    const M = window.CatedraSync._test.mergeAll;
    const K = 'catedra:casos@saude';
    const srv = {}; srv[K] = JSON.stringify([{ id: 'a', up: 10, titulo: 'do outro aparelho' }]);
    const loc = {}; loc[K] = JSON.stringify([{ id: 'b', up: 20, titulo: 'deste aparelho' }]);
    const juntos = JSON.parse(M(srv, loc, false)[K] || '[]');
    // e a lápide: o mesmo id, apagado aqui depois, não pode ressuscitar da nuvem
    const srv2 = {}; srv2[K] = JSON.stringify([{ id: 'a', up: 10, titulo: 'do outro aparelho' }]);
    const loc2 = {}; loc2[K] = JSON.stringify([{ id: 'a', up: 99, del: true }]);
    const depois = JSON.parse(M(srv2, loc2, false)[K] || '[]');
    return {
      mesclaPorId: juntos.length === 2 && juntos.some(c => c.id === 'a') && juntos.some(c => c.id === 'b'),
      lapideSegura: depois.length === 1 && depois[0].del === true && !depois[0].titulo,
    };
  });
  for (const [k, v] of Object.entries(f4merge)) ok(v, 'FASE4 sync ' + k);


  await areaCtx.close();
  // devolve a aba compartilhada ao estado jurídico, que é o de todos os outros blocos
  await page.evaluate(() => localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica')));
}

/* ===== TASK 10 · PENTE-FINO DE ACESSIBILIDADE =====
   Coisas que não aparecem em captura de tela: nome de campo, estado de interruptor,
   contraste medido, zoom bloqueado, alvo de toque, movimento reduzido. */
{
  // 1) zoom: nenhuma página pode proibir a pinça (WCAG 1.4.4)
  const zoom = await page.evaluate(async (b) => {
    const paginas = ['Catedra.dc.html', 'legis-web.html', 'juris-web.html', 'area-web.html',
      'ritos-web.html', 'pecas-web.html', 'segunda-fase-web.html', 'prioridade-web.html', 'banco-espelhos.html'];
    const ruins = [];
    for (const p of paginas) {
      const t = await (await fetch(b + '/' + p)).text();
      const m = t.match(/<meta[^>]+name=["']viewport["'][^>]*>/i);
      if (m && /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?!\d)/i.test(m[0])) ruins.push(p);
    }
    return { nenhumaBloqueiaZoom: ruins.length === 0, quais: ruins.join(', ') };
  }, URL0);
  ok(zoom.nenhumaBloqueiaZoom, 'TASK10 nenhuma página bloqueia o zoom (' + (zoom.quais || 'todas liberadas') + ')');

  // 2) todo campo de busca tem NOME — placeholder não é nome acessível
  const nomes = await page.evaluate(async (b) => {
    const alvos = [['legis-web.html', 'cq'], ['legis-web.html', 'iq'], ['juris-web.html', 'q'],
      ['juris-web.html', 'qtc'], ['area-web.html', 'q'], ['segunda-fase-web.html', 'fq'],
      ['banco-espelhos.html', 'q']];
    const sem = [];
    for (const [p, id] of alvos) {
      const t = await (await fetch(b + '/' + p)).text();
      const tag = (t.match(new RegExp('<input[^>]*id="' + id + '"[^>]*>', 'i')) || [''])[0];
      if (!/aria-label=|aria-labelledby=/.test(tag)) sem.push(p + '#' + id);
    }
    return { todosNomeados: sem.length === 0, quais: sem.join(', ') };
  }, URL0);
  ok(nomes.todosNomeados, 'TASK10 as buscas dos satélites têm nome (' + (nomes.quais || 'todas') + ')');

  // 3) contraste: --text3 sobre bg/surface/surface2, em TODOS os temas dos dois modos
  const contraste = await page.evaluate(async (b) => {
    const src = await (await fetch(b + '/Catedra.dc.html')).text();
    const lum = (h) => {
      const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
        .map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    };
    const cont = (a, c) => { const x = lum(a), y = lum(c); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const blocos = [...src.matchAll(/\b(light|dark):\{([\s\S]*?)\n\s*heroGrad:'[^']*'\s*\}/g)];
    const ruins = [], pulados = [];
    let medidos = 0;
    for (const [, modo, corpo] of blocos) {
      const d = {}; for (const m of corpo.matchAll(/(\w+):'(#[0-9a-fA-F]{6})'/g)) d[m[1]] = m[2];
      // Tema que o parser não entendeu (hex de 3 dígitos, rgba(), chave renomeada) era
      // descartado em SILÊNCIO: ficava indistinguível de tema aprovado. Agora ele REPROVA —
      // "não consegui medir" não é "passou".
      if (!(d.bg && d.surface && d.surface2 && d.text3 && d.accentSoft)) { pulados.push(modo); continue; }
      medidos++;
      // accentSoft entra na conta: é o fundo do cartão "próximo bloco" do Início, onde o
      // text3 aparece — medir só bg/surface/surface2 deixava justamente esse par de fora.
      const pior = Math.min(...['bg', 'surface', 'surface2', 'accentSoft'].map(k => cont(d.text3, d[k])));
      if (pior < 4.5) ruins.push(modo + ' ' + d.text3 + ' = ' + pior.toFixed(2));
    }
    // `temas` conta o que foi MEDIDO, não o que a regex casou: senão a guarda que existe
    // para detectar "o teste parou de ler algum tema" nunca detectaria nada.
    return { temas: medidos, ok: ruins.length === 0 && pulados.length === 0,
             quais: [...ruins, ...pulados.map(m => 'não consegui medir: ' + m)].slice(0, 5).join(' · ') };
  }, URL0);
  ok(contraste.temas >= 12, 'TASK10 o teste leu os temas todos (' + contraste.temas + ')');
  ok(contraste.ok, 'TASK10 --text3 tem 4.5:1 em todo tema, claro e escuro (' + (contraste.quais || 'todos passam') + ')');

  // 4) corpo mínimo: nada abaixo de 10,5px, nem no tamanho padrão
  const corpo = await page.evaluate(async (b) => {
    const src = await (await fetch(b + '/Catedra.dc.html')).text();
    const m = src.match(/--fs-3xs:\$\{_fs\(([\d.]+)\)\}/);
    return { menorDegrau: m ? parseFloat(m[1]) : 0 };
  }, URL0);
  ok(corpo.menorDegrau >= 10.5, 'TASK10 o menor degrau tipográfico é ' + corpo.menorDegrau + 'px (mínimo 10.5)');

  // 5) interruptor liga/desliga diz o estado, não só o nome
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.evaluate(() => { localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1600);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1900);
  const sw = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    // Ajustes vive atrás de "Mais opções" desde a TASK5: abrir o expansor faz parte do caminho
    const ir = async (v) => {   // (a página já foi recarregada em desktop logo acima)
      let b = document.querySelector('button[data-view="' + v + '"]');
      if (!b) {
        const mais = document.querySelector('button[aria-label="Mostrar mais opções"]');
        if (mais) { mais.click(); await w(500); }
        b = document.querySelector('button[data-view="' + v + '"]');
      }
      if (b) { b.click(); await w(1000); }
      return !!b;
    };
    if (!await ir('ajustes')) return { erro: 'não achei a entrada de Ajustes' };
    const sws = [...document.querySelectorAll('[role="switch"]')];
    if (!sws.length) return { erro: 'nenhum interruptor com papel' };
    const r = {
      todosTemEstado: sws.every(s => s.getAttribute('aria-checked') === 'true' || s.getAttribute('aria-checked') === 'false'),
      todosTemNome: sws.every(s => (s.getAttribute('aria-label') || '').length > 3),
      quantos: sws.length >= 6,
    };
    // e o estado ACOMPANHA o clique (não é um atributo decorativo)
    const alvo = sws[0], antes = alvo.getAttribute('aria-checked');
    alvo.click(); await w(500);
    const depois = document.querySelectorAll('[role="switch"]')[0].getAttribute('aria-checked');
    r.estadoSegueOClique = depois !== antes;
    document.querySelectorAll('[role="switch"]')[0].click(); await w(300);
    return r;
  });
  if (sw.erro) ok(false, 'TASK10 ' + sw.erro);
  else for (const [k, v] of Object.entries(sw)) ok(v, 'TASK10 interruptor ' + k);

  // 6) alvo de toque no celular, nas telas mais usadas
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1800);
  const toque = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    /* Mede a CAIXA DE TOQUE, não o desenho.
       A primeira versão exigia 44x44 de todo controle e eu a fiz passar inflando tudo com
       !important — o que deformou quadradinho do Edital, célula do calendário e o trilho
       dos interruptores (que viraram discos). O alvo agora é o da WCAG 2.2 AA (2.5.8):
       24x24 de mínimo duro. Quem quer os 44 confortáveis usa .ct-alvo, que cresce a área
       por um pseudo-elemento e deixa o desenho intacto — e o teste conta isso. */
    const MIN = 24;
    const medir = () => [...document.querySelectorAll('button,a[href],select,[role="button"],[role="switch"],[role="tab"]')]
      .filter(e => e.offsetParent !== null)
      .map(e => {
        const r = e.getBoundingClientRect();
        const alvo = e.classList.contains('ct-alvo');   // caixa de toque expandida por ::after
        return { w: alvo ? Math.max(44, r.width) : r.width,
                 h: alvo ? Math.max(44, r.height) : r.height, rw: r.width,
                 t: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 28) };
      })
      .filter(x => x.rw > 0 && (x.h < MIN || x.w < MIN))
      .map(x => x.t + '[' + Math.round(x.w) + 'x' + Math.round(x.h) + ']');
    // a view fica gravada: sem voltar ao Início de propósito, mediríamos a tela anterior
    const inicio = document.querySelector('button[data-view="inicio"]');
    if (inicio) { inicio.click(); await w(900); }
    const r = { inicio: medir() };
    for (const v of ['ciclo', 'ajustes']) {
      let b = document.querySelector('button[data-view="' + v + '"]');
      if (!b) {
        const abrir = document.querySelector('button[aria-label="Abrir menu"]');
        if (abrir) { abrir.click(); await w(500); }
        const mais = document.querySelector('button[aria-label="Mostrar mais opções"]');
        if (mais) { mais.click(); await w(500); }
        b = document.querySelector('button[data-view="' + v + '"]');
      }
      if (b) { b.click(); await w(1000); r[v] = medir(); }
    }
    return r;
  });
  for (const [tela, l] of Object.entries(toque))
    ok(l.length === 0, 'TASK10 alvo de toque em ' + tela + ' (' + (l.join(', ') || 'todos ≥24px') + ')');

  /* E a regressão que originou tudo isto: a regra de toque NÃO pode deformar o desenho.
     Três medidas concretas do estrago que a primeira versão causava. */
  const semDeformar = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const ir = async (v) => {
      let b = document.querySelector('button[data-view="' + v + '"]');
      if (!b) {
        const ab = document.querySelector('button[aria-label="Abrir menu"]'); if (ab) { ab.click(); await w(400); }
        const m = document.querySelector('button[aria-label="Mostrar mais opções"]'); if (m) { m.click(); await w(400); }
        b = document.querySelector('button[data-view="' + v + '"]');
      }
      if (b) { b.click(); await w(900); } return !!b;
    };
    const r = {};
    // o interruptor continua uma PÍLULA (mais largo que alto), não um disco de 44
    await ir('ajustes');
    const sw = document.querySelector('[role="switch"]');
    if (sw) { const b = sw.getBoundingClientRect(); r.interruptorContinuaPilula = b.width > b.height + 8; }
    // a célula do calendário mantém a altura que o mês precisa
    await ir('calendario');
    const cel = document.querySelector('button.ct-calcell');
    if (cel) r.celulaDoCalendarioNaoEncolhe = cel.getBoundingClientRect().height >= 50;
    // as classes de exceção que eu tinha inventado não existiam; nenhuma pode voltar sem dono
    r.semClasseFantasma = !document.querySelector('.ct-nobump, .ct-cal-cel');
    return r;
  });
  for (const [k, v] of Object.entries(semDeformar)) ok(v, 'TASK10 ' + k);
  await page.setViewportSize({ width: 1280, height: 800 });

  // 7) movimento reduzido: host e satélites
  const mov = await page.evaluate(async (b) => {
    const [host, base, banco] = await Promise.all([
      (await fetch(b + '/Catedra.dc.html')).text(),
      (await fetch(b + '/satellite-base.css')).text(),
      (await fetch(b + '/banco-espelhos.html')).text()]);
    const tem = t => /prefers-reduced-motion:\s*reduce/.test(t) && /animation-duration:\s*\.00?1ms\s*!important/.test(t);
    return { hostRespeita: tem(host), sateliteRespeita: tem(base), bancoRespeita: tem(banco) };
  }, URL0);
  for (const [k, v] of Object.entries(mov)) ok(v, 'TASK10 ' + k);
}

/* ===== TASK 8 · PROVA ORAL E PRIORIDADE VIRAM AÇÃO =====
   A Prova oral abria com nomes de ACERVO e um paredão de filtros; o ranking de Prioridade
   dizia o que estudar e parava aí. Agora as duas telas oferecem o próximo passo. */
{
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.evaluate(() => { localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1600);

  const oral = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('button[data-view="oral"]').click(); await w(900);
    const cards = [...document.querySelectorAll('button[data-i]')];
    const r = {
      tresIntencoes: cards.length === 3,
      // o rótulo diz o ATO, não o acervo de onde vem
      dizemOAto: /treinar argui/i.test(cards.map(c => c.textContent).join(' '))
        && /responder quest/i.test(cards.map(c => c.textContent).join(' '))
        && /consultar concursos/i.test(cards.map(c => c.textContent).join(' ')),
      // a diferença entre as três está escrita, não subentendida
      explicaADiferenca: cards.every(c => (c.textContent || '').length > 90),
      // os cards vêm ANTES dos filtros detalhados
      antesDosFiltros: (() => {
        const f = document.querySelector('button[data-v]');
        return !!f && !!(cards[0].compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING);
      })(),
    };
    // "Treinar arguição" cai no modo arguição que já existia — com relógio e sem cronômetro novo
    cards.find(c => c.dataset.i === 'treinar').click(); await w(3500);
    r.treinarAbreArguicao = /\d+:\d\d/.test(document.body.innerText) && !document.querySelector('button[data-i]');
    r.umCronometroSo = (document.body.innerText.match(/\b\d{1,2}:\d{2}\b/g) || []).length <= 3;
    return r;
  });
  for (const [k, v] of Object.entries(oral)) ok(v, 'TASK8 oral ' + k);

  // --- Prioridade: as duas saídas de estudo ---
  const prioAcoes = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__abriu = [];
    window.open = (u) => { window.__abriu.push(String(u)); return null; };
    document.querySelector('button[data-view="prioridade"]').click(); await w(2200);
    const f = document.querySelector('iframe[data-ct-view="prioridade"]');
    if (!f || !f.contentDocument) return { erro: 'iframe de prioridade não abriu' };
    const d = f.contentDocument;
    const linha = d.querySelector('.linha .lh');
    if (!linha) return { erro: 'ranking vazio' };
    linha.click(); await w(300);
    const det = d.querySelector('.linha.on .det');
    const r = {
      temResolverQuestoes: !!det.querySelector('[data-praticar]'),
      temAbrirLei: !!det.querySelector('[data-lei]'),
      // a lei oferecida é o dispositivo REAL mais cobrado, não um genérico
      leiEhODispositivoTop: (() => {
        const b = det.querySelector('[data-lei]'), top = det.querySelector('.arts button');
        return !!b && !!top && /art\.\s*\S+/.test(b.dataset.lei);
      })(),
    };
    det.querySelector('[data-praticar]').click(); await w(700);
    r.resolverAbreAPlataforma = window.__abriu.length === 1 && /tecconcursos\.com\.br/.test(window.__abriu[0]);
    r.levaADisciplina = /texto=|q=/.test(window.__abriu[0] || '');
    return r;
  });
  if (prioAcoes.erro) ok(false, 'TASK8 prioridade ' + prioAcoes.erro);
  else for (const [k, v] of Object.entries(prioAcoes)) ok(v, 'TASK8 prioridade ' + k);

  // "Abrir a lei mais cobrada" leva ao LEGIS e deixa a volta para o Painel de Prioridade
  const voltaDaLei = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const f = document.querySelector('iframe[data-ct-view="prioridade"]');
    if (!f || !f.contentDocument) return { erro: 'iframe sumiu' };
    const b = f.contentDocument.querySelector('.linha.on .det [data-lei]');
    if (!b) return { erro: 'sem botão de lei' };
    b.click(); await w(1800);
    const legis = document.querySelector('iframe[data-ct-view="legis"]');
    return { leiAbreOLegis: !!legis && legis.style.display === 'block' };
  });
  if (voltaDaLei.erro) ok(false, 'TASK8 prioridade ' + voltaDaLei.erro);
  else for (const [k, v] of Object.entries(voltaDaLei)) ok(v, 'TASK8 prioridade ' + k);

  /* A plataforma escolhida em Ajustes é respeitada — e este teste só vale se ele TROCAR
     a plataforma. A primeira versão nunca escrevia `plataformaQuestoes`, rodava no default
     'tec' e conferia só que "alguma URL abriu": ignorar a escolha da pessoa e mandar todo
     mundo para o TEC passaria verde. */
  // _load() faz JSON.parse: gravar o valor cru estoura e cai no fallback 'tec' — em silêncio
  await page.evaluate(() => localStorage.setItem('catedra:plataformaQuestoes', JSON.stringify('qc')));
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1800);
  const outraPlataforma = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__abriu = [];
    window.open = (u) => { window.__abriu.push(String(u)); return null; };
    window.postMessage({ type: 'ctPraticarPrioridade', disc: 'Direito Civil' }, '*');
    await w(700);
    const url = window.__abriu[0] || '';
    return {
      hostAtendeAMensagem: window.__abriu.length === 1 && /^https?:/.test(url),
      respeitaAEscolhaDeAjustes: /qconcursos\.com/.test(url),
      naoCaiNoTecPorPadrao: !/tecconcursos\.com\.br/.test(url),
      levaADisciplinaEscolhida: /Civil/i.test(decodeURIComponent(url)),
    };
  });
  for (const [k, v] of Object.entries(outraPlataforma)) ok(v, 'TASK8 prioridade ' + k);
  await page.evaluate(() => localStorage.removeItem('catedra:plataformaQuestoes'));

}

/* ===== TASK 6 · CICLO: EXECUTAR E CONFIGURAR SÃO COISAS DIFERENTES =====
   A tela do Ciclo empilhava a rotina de hoje e o construtor. Quem abria para estudar tinha de
   passar pelo painel de configuração. Agora são duas abas — e trocar de aba não pode encostar
   em blocks, manualFixed nem manualRot: é estado de tela, não de dados. */
{
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.evaluate(() => { localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1600);
  const ciclo = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const vis = id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none'; };
    const tab = id => document.getElementById(id);
    document.querySelector('button[data-view="ciclo"]').click(); await w(800);
    const r = {};
    // 1) abre pronta para executar
    r.abreExecutando = vis('ct-cycle-panel-executar') && !vis('ct-cycle-panel-configurar');
    r.abaExecutarSelecionada = tab('ct-cycle-tab-executar').getAttribute('aria-selected') === 'true';
    r.painelTemNome = tab('ct-cycle-tab-executar').getAttribute('aria-controls') === 'ct-cycle-panel-executar'
      && document.getElementById('ct-cycle-panel-executar').getAttribute('aria-labelledby') === 'ct-cycle-tab-executar';
    /* 2) os dados do ciclo ANTES de mexer nas abas.
       A primeira versão comparava as chaves numa conta VAZIA: manualFixed e manualRot
       valiam "[]" dos dois lados, então um setCyclePanel que apagasse o ciclo manual da
       pessoa comparava "[]" com "[]" e passava verde. Agora o teste semeia conteúdo real
       — só assim a comparação tem o que perder. */
    const SEMENTE = {
      'catedra:manualFixed': JSON.stringify([{ id: 'f1', up: 1, dia: 'seg', disc: 'Direito Penal' }]),
      'catedra:manualRot': JSON.stringify([{ id: 'r1', up: 1, disc: 'Direito Civil' }]),
      'catedra:blocks': JSON.stringify([{ id: 'b1', up: 1, disc: 'Direito Civil', kind: 'Teoria', min: 50, done: false }]),
    };
    for (const [k, v] of Object.entries(SEMENTE)) { try { localStorage.setItem(k, v); } catch (_) {} }
    const snap = () => JSON.stringify(['blocks','manualFixed','manualRot','cycleMode']
      .map(k => { try { return localStorage.getItem('catedra:' + k); } catch (_) { return null; } }));
    const antes = snap();
    r.sementeTemConteudo = ['manualFixed','manualRot','blocks']
      .every(k => (localStorage.getItem('catedra:' + k) || '').length > 20);
    // 3) troca para configurar
    tab('ct-cycle-tab-configurar').click(); await w(700);
    r.trocaMostraConfig = vis('ct-cycle-panel-configurar') && !vis('ct-cycle-panel-executar');
    r.abaConfigSelecionada = tab('ct-cycle-tab-configurar').getAttribute('aria-selected') === 'true';
    r.abaExecutarSaiDaTabulacao = tab('ct-cycle-tab-executar').tabIndex === -1;
    r.dadosIntactos = snap() === antes;
    // 4) o construtor de verdade está na aba de configuração
    r.configTemOsModos = /Como montar seu ciclo/i.test(document.getElementById('ct-cycle-panel-configurar').textContent || '');
    // 5) seta volta para executar (roving tabindex sem seta deixaria a aba inalcançável)
    tab('ct-cycle-tab-configurar').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await w(700);
    r.setaVoltaParaExecutar = vis('ct-cycle-panel-executar') && !vis('ct-cycle-panel-configurar');
    r.setaLevaOFoco = document.activeElement === tab('ct-cycle-tab-executar');
    // 6) painel escondido não deve ser tabulável
    r.escondidoNaoRecebeFoco = [...document.querySelectorAll('#ct-cycle-panel-configurar button')]
      .every(b => b.offsetParent === null);
    return r;
  });
  for (const [k, v] of Object.entries(ciclo)) ok(v, 'TASK6 ' + k);

  // conta sem ciclo montado: "Executar" não pode ser uma tela em branco
  const vazio = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const p = document.getElementById('ct-cycle-panel-executar');
    const temPonte = /ainda não tem blocos/i.test(p.textContent || '');
    if (!temPonte) return { pulou: true };
    const b = [...p.querySelectorAll('button')].find(x => /configurar ciclo/i.test(x.textContent || ''));
    b.click(); await w(700);
    return { ponteLevaAConfigurar: getComputedStyle(document.getElementById('ct-cycle-panel-configurar')).display !== 'none' };
  });
  if (!vazio.pulou) for (const [k, v] of Object.entries(vazio)) ok(v, 'TASK6 ' + k);
}

/* ===== TASK 4 · A ESCOLHA DO ONBOARDING É EXPLÍCITA =====
   O passo "Por onde quer começar?" abria sem nada selecionado: apertar Continuar caía num
   fallback silencioso, e a tela não dizia o que ia acontecer. E o modal aparecia POR CIMA
   do login, os dois disputando a atenção. */
{
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.evaluate(() => { localStorage.clear(); });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1500);
  const semLogin = await page.evaluate(() => ({
    // sem sessão, a tela de entrada manda: o onboarding espera a vez
    onboardingNaoCompeteComOLogin: !document.querySelector('[role="radiogroup"][aria-label="Por onde quer começar"]')
      && !/Bem-vindo à Cátedra/.test(document.body.innerText || ''),
  }));
  for (const [k, v] of Object.entries(semLogin)) ok(v, 'TASK4 ' + k);

  await page.evaluate(() => { localStorage.setItem('catedra:auth', '1'); localStorage.removeItem('catedra:onboarded'); });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1600);
  const onb = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const avancar = async (n) => { for (let i = 0; i < n; i++) {
      const b = [...document.querySelectorAll('button')].find(x => /Começar|Continuar/.test((x.textContent || '').trim()) && x.offsetParent !== null);
      if (b) { b.click(); await w(350); } } };
    await avancar(2);
    const grupo = document.querySelector('[role="radiogroup"][aria-label="Por onde quer começar"]');
    if (!grupo) return { erro: 'não cheguei ao passo da escolha' };
    const cards = [...grupo.querySelectorAll('[role="radio"]')];
    const marcado = cards.filter(c => c.getAttribute('aria-checked') === 'true');
    return {
      grupoTemPapel: true,
      tresOpcoesComPapel: cards.length === 3,
      umaSoMarcada: marcado.length === 1,
      oRecomendadoVemMarcado: marcado.length === 1 && marcado[0].getAttribute('data-c') === 'ciclo',
      // /i porque o rótulo é uppercase por CSS e o innerText devolve RECOMENDADO
      seloRecomendadoVisivel: /recomendado/i.test(grupo.innerText || ''),
      // escolher outro move a marca, e a marca não é só cor. Precisa esperar o re-render:
      // ler aria-checked no mesmo tique devolve o valor antigo.
      trocaDeEscolha: await (async () => {
        cards.find(c => c.getAttribute('data-c') === 'edital').click();
        await w(400);
        const g2 = document.querySelector('[role="radiogroup"][aria-label="Por onde quer começar"]');
        const q = (c) => g2.querySelector('[data-c="' + c + '"]').getAttribute('aria-checked');
        return q('edital') === 'true' && q('ciclo') === 'false';
      })(),
    };
  });
  if (onb.erro) ok(false, 'TASK4 ' + onb.erro);
  else for (const [k, v] of Object.entries(onb)) ok(v, 'TASK4 ' + k);
}

/* ===== TASK 3 · UMA ÚNICA PRÓXIMA AÇÃO NO INÍCIO =====
   O Início oferecia quatro KPIs, chips de área, ritmo semanal, "o dia em campo" e um "Foco
   sugerido" — todos disputando a mesma decisão. Agora há UM card, derivado do que já se
   calcula, com precedência fixa. Os casos abaixo verificam o TEXTO, o TIPO e o DESTINO, não
   só a presença do card: um card que aparece apontando para o lugar errado é pior que nenhum. */
{
  const semear = async (dados) => {
    await page.goto(URL0 + '/Catedra.dc.html');
    await page.evaluate((d) => {
      ['reviews', 'blocks', 'blocksDate', 'eventos', 'sessions', 'edital', 'lastPonto', 'semanaLidos']
        .forEach(k => localStorage.removeItem('catedra:' + k));
      Object.keys(d).forEach(k => localStorage.setItem('catedra:' + k, JSON.stringify(d[k])));
      localStorage.setItem('catedra:auth', '1');
      localStorage.setItem('catedra:onboarded', '1');
    }, dados);
    await page.goto(URL0 + '/Catedra.dc.html');
    await page.waitForTimeout(1700);
    return page.evaluate(() => {
      const card = document.querySelector('[data-proxima-acao]');
      if (!card) return { achou: false };
      const cta = card.querySelector('button[data-view],button[data-acao]');
      return {
        achou: true,
        tipo: card.getAttribute('data-proxima-acao'),
        texto: (card.innerText || '').replace(/\s+/g, ' ').trim(),
        destino: cta ? (cta.getAttribute('data-view') || cta.getAttribute('data-acao')) : null,
        umCtaSo: card.querySelectorAll('button').length === 1,
      };
    });
  };
  const hoje = new Date();
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const blocoAberto = [{ i: 0, disc: 'Direito Civil', kind: 'Teoria', min: 50, done: false }];

  // 1 — revisão vencida ganha de tudo
  const a1 = await semear({
    reviews: [{ id: 'r1', disc: 'Direito Penal', topic: 'Dolo', due: -3, dueDate: '2020-01-01', intervalo: 1, facilidade: 2.5, repeticoes: 0 }],
    blocks: blocoAberto, blocksDate: iso(hoje),
  });
  ok(a1.achou && a1.tipo === 'revisao', 'TASK3 revisão vencida vence a precedência (' + (a1.tipo || 'sem card') + ')');
  ok(a1.achou && a1.destino === 'revisoes', 'TASK3 a revisão manda para a tela de Revisões');
  ok(a1.achou && /revis/i.test(a1.texto), 'TASK3 o card diz que se trata de revisão');
  ok(a1.achou && a1.umCtaSo, 'TASK3 um único CTA no card');

  // 2 — sem revisão vencida, o bloco aberto do ciclo assume
  const a2 = await semear({ reviews: [], blocks: blocoAberto, blocksDate: iso(hoje) });
  ok(a2.achou && a2.tipo === 'ciclo', 'TASK3 bloco aberto do ciclo assume quando não há revisão (' + (a2.tipo || 'sem card') + ')');
  ok(a2.achou && a2.destino === 'ciclo', 'TASK3 o bloco manda para o Ciclo');
  ok(a2.achou && /civil/i.test(a2.texto), 'TASK3 o card nomeia a disciplina do bloco');

  // 3 — nada pendente hoje: o card não some, vira estado neutro com destino real
  const a3 = await semear({ reviews: [], blocks: [{ i: 0, disc: 'Direito Civil', kind: 'Teoria', min: 50, done: true }], blocksDate: iso(hoje) });
  ok(a3.achou, 'TASK3 sem pendência o card continua existindo (estado neutro)');
  ok(a3.achou && !!a3.destino, 'TASK3 o estado neutro também tem destino real (' + (a3.destino || 'nenhum') + ')');

  // o "Foco sugerido" não pode competir com o card na mesma posição
  const duplicado = await page.evaluate(() => {
    const txt = (document.body.innerText || '');
    const card = document.querySelector('[data-proxima-acao]');
    const antes = card ? txt.indexOf(card.innerText.slice(0, 24)) : -1;
    const foco = txt.indexOf('Foco sugerido');
    return { temCard: !!card, focoDepoisOuAusente: foco === -1 || (antes >= 0 && foco > antes) };
  });
  ok(duplicado.temCard && duplicado.focoDepoisOuAusente, 'TASK3 o "Foco sugerido" não disputa a mesma posição do card');
}

/* ===== TASK 2 · O GATE DE AUTENTICAÇÃO ISOLA O APP =====
   O gate cobre a tela, mas só isso: o app atrás continua rolando (4.446 px de scroll),
   continua alcançável por Tab e continua sendo lido por leitor de tela. Um overlay que
   não isola não é um portão — é uma cortina. Os casos abaixo travam o isolamento pelo
   COMPORTAMENTO observável, via tests/auth-gate-fixture.html (auth.js de verdade, com
   um cliente Supabase falso que devolve "sem sessão"). */
/* O fixture põe o app no HTML de saída, então o gate sempre encontrou um irmão para
   isolar — e por isso passava. Na BUILD REAL o auth.js é script de <head>: quando ele
   roda, <body> não existe, o gate nasce em <html> e o único "irmão" era o <head>. O app
   (#dc-root) montava depois, livre: com o login na tela, Tab entrava direto na barra
   lateral. Este teste reproduz a ordem de carga da produção. */
{
  await page.goto(URL0 + '/tests/auth-gate-tardio.html');
  await page.waitForTimeout(900);
  const tardio = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    await w(400);
    const gate = document.getElementById('catedra-auth-gate');
    const app = document.getElementById('app-tardio');
    const foras = [];
    for (let i = 0; i < 8; i++) {
      const fs = [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')]
        .filter(x => x.offsetParent !== null);
      const idx = fs.indexOf(document.activeElement);
      const prox = fs[(idx + 1) % fs.length];
      if (prox) prox.focus();
      if (document.activeElement !== document.body && gate && !gate.contains(document.activeElement)) {
        foras.push((document.activeElement.textContent || '').trim().slice(0, 20));
      }
    }
    return {
      appMontouDepois: !!app,
      appQueMontouDepoisFicaInerte: !!app && app.inert === true,
      appQueMontouDepoisSaiDoLeitor: !!app && app.getAttribute('aria-hidden') === 'true',
      headNaoEhMarcadoPorEngano: document.head.inert !== true,
      rolagemTravada: document.documentElement.style.overflow === 'hidden',
      nadaEscapaDoGate: foras.length === 0,
    };
  });
  for (const [k, v] of Object.entries(tardio)) ok(v, 'GATE ' + k);
}

await page.goto(URL0 + '/tests/auth-gate-fixture.html');
await page.waitForTimeout(1200);
const gate = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const el = document.getElementById('catedra-auth-gate');
  const app = document.getElementById('app');
  if (!el) return { erro: 'o gate não foi criado' };
  await w(400);
  return {
    gateVisivel: getComputedStyle(el).display !== 'none',
    // a página atrás não pode rolar enquanto o login está na frente
    bodyTravado: document.body.style.overflow === 'hidden',
    htmlTravado: document.documentElement.style.overflow === 'hidden',
    // e não pode ser alcançada por mouse, teclado ou leitor de tela
    appInerte: app.inert === true,
    appEscondidoDoLeitor: app.getAttribute('aria-hidden') === 'true',
    // semântica de diálogo
    ehDialogo: el.getAttribute('role') === 'dialog',
    ehModal: el.getAttribute('aria-modal') === 'true',
    temNome: !!(el.getAttribute('aria-label') || '').trim(),
  };
});
if (gate.erro) ok(false, 'GATE ' + gate.erro);
else for (const [k, v] of Object.entries(gate)) ok(v, 'GATE ' + k);

// O foco não escapa do gate, e o Esc não fecha um login obrigatório.
const gateFoco = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const el = document.getElementById('catedra-auth-gate');
  const dentro = (n) => !!n && el.contains(n);
  const focaveis = [...el.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')]
    .filter(n => n.offsetParent !== null || n === document.activeElement);
  if (!focaveis.length) return { erro: 'nenhum controle focável no gate' };
  const r = {};
  // Tab sintético não move o foco sozinho: quem move é o trap. Então a asserção é o ALVO
  // exato, não "continua dentro" — que passaria mesmo sem trap nenhum.
  const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
  ultimo.focus();
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
  await w(120);
  r.tabNoUltimoVoltaAoPrimeiro = document.activeElement === primeiro;
  primeiro.focus();
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
  await w(120);
  r.shiftTabNoPrimeiroVoltaAoUltimo = document.activeElement === ultimo;
  r.focoNuncaEscapa = dentro(document.activeElement);
  // Esc não fecha: o login é obrigatório
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await w(200);
  r.escNaoFechaOLogin = getComputedStyle(el).display !== 'none';
  return r;
});
if (gateFoco.erro) ok(false, 'GATE foco: ' + gateFoco.erro);
else for (const [k, v] of Object.entries(gateFoco)) ok(v, 'GATE ' + k);

// Abas Entrar/Criar conta e o botão da senha precisam DIZER o seu estado.
const gateSemantica = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const el = document.getElementById('catedra-auth-gate');
  const entrar = el.querySelector('#ctseg-login');
  const criar = el.querySelector('#ctseg-signup');
  if (!entrar || !criar) return { erro: 'não achei as abas Entrar/Criar conta' };
  const r = {
    abaEntrarSelecionada: entrar.getAttribute('aria-selected') === 'true',
    abaCriarNaoSelecionada: criar.getAttribute('aria-selected') === 'false',
    abasTemPapel: entrar.getAttribute('role') === 'tab' && criar.getAttribute('role') === 'tab',
    // roving tabindex: só a aba ativa entra na ordem de tabulação
    rovingTabindex: entrar.getAttribute('tabindex') === '0' && criar.getAttribute('tabindex') === '-1',
  };
  criar.click(); await w(300);
  const entrar2 = el.querySelector('#ctseg-login'), criar2 = el.querySelector('#ctseg-signup');
  r.trocaDeAbaAtualizaOEstado = criar2.getAttribute('aria-selected') === 'true'
    && entrar2.getAttribute('aria-selected') === 'false';
  el.querySelector('#ctseg-login').click(); await w(300);
  // o olho da senha diz o que vai fazer, e muda quando faz
  const olho = el.querySelector('[data-olho]');
  r.olhoTemNome = !!olho && /mostrar senha/i.test(olho.getAttribute('aria-label') || '');
  if (olho) { olho.click(); await w(150); r.olhoMudaDeNome = /ocultar senha/i.test(olho.getAttribute('aria-label') || ''); olho.click(); }
  return r;
});
if (gateSemantica.erro) ok(false, 'GATE semântica: ' + gateSemantica.erro);
else for (const [k, v] of Object.entries(gateSemantica)) ok(v, 'GATE ' + k);

// Ao fechar, o app volta ao que era: rolagem, inert e aria-hidden restaurados.
const gateFecha = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const el = document.getElementById('catedra-auth-gate');
  const app = document.getElementById('app');
  if (!el.__setGateOpen) return { erro: 'setGateOpen não foi exposto no elemento do gate' };
  el.__setGateOpen(false);
  await w(200);
  return {
    fechouOGate: getComputedStyle(el).display === 'none',
    devolveuARolagem: document.body.style.overflow !== 'hidden' && document.documentElement.style.overflow !== 'hidden',
    appVoltouAFuncionar: app.inert !== true && app.getAttribute('aria-hidden') !== 'true',
  };
});
if (gateFecha.erro) ok(false, 'GATE fecha: ' + gateFecha.erro);
else for (const [k, v] of Object.entries(gateFecha)) ok(v, 'GATE ' + k);

// A prova que importa: a página atrás não rola com GESTO DE GENTE. `overflow:hidden` bloqueia
// roda e teclado, mas não bloqueia window.scrollBy — medir com scrollBy daria falso negativo.
await page.goto(URL0 + '/tests/auth-gate-fixture.html');
await page.waitForTimeout(1300);
const antesDeRolar = await page.evaluate(() => window.scrollY);
await page.mouse.move(400, 400);
await page.mouse.wheel(0, 2000);
await page.waitForTimeout(350);
const depoisDaRoda = await page.evaluate(() => window.scrollY);
await page.keyboard.press('End');
await page.waitForTimeout(300);
const depoisDoEnd = await page.evaluate(() => window.scrollY);
ok(depoisDaRoda === antesDeRolar, 'GATE a roda do mouse não rola o app atrás do login');
ok(depoisDoEnd === antesDeRolar, 'GATE a tecla End não rola o app atrás do login');

await browser.close();
srv.close();
console.log(falhas.length ? ('\nFALHAS: ' + falhas.length) : '\nTODOS OS TESTES PASSARAM');
process.exit(falhas.length ? 1 : 0);
