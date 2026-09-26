/* Runner do WebKit — o proxy do Safari e do WKWebView do iPad na CI (`npm run test:webkit`).
   Enxuto de propósito: a suíte grande (tests/run.mjs) foi escrita para Chromium e leva
   minutos; aqui roda só o que precisa do motor da Apple para ter valor — a Prova oral →
   Lei seca, que no iPad abria sem lei nenhuma, e o quadro "Não confunda com" do JURIS, que
   depende de subgrid e color-mix. Duas origens, com as mesmas asserções:
   · http://localhost — como o site;
   · file://          — como o app nativo, onde fetch de arquivo local falha e o acervo
                        tem de chegar por <script>. É o que mais se parece com o iPad.
   · [bundle]         — mac/build/web/index.html em file://, se existir (é o que
                        scripts/build-macos.mjs gera e o app do Mac/iPad empacota). O bundle
                        não leva a pasta dados/: o caminho testado é o fallback por <script>
                        para leis-seca.js, exatamente o que o iPad usa. Sem bundle na máquina
                        (a CI não o gera), a origem é pulada com aviso — nunca fingida.
   Precisa do WebKit do Playwright: `npx playwright-core install webkit` (CI: --with-deps).
   CT_BROWSER=chromium roda o mesmo roteiro no Chrome, para comparar os dois motores. */
// PRIMEIRO import, e de propósito: arquivo esvaziado pelo iCloud volta do git (ou a suíte para)
// antes de qualquer outro módulo ser avaliado — foi o playwright-core lido errado, num worktree
// do Desktop, que impediu esta suíte de começar. Ver scripts/verificar-pasta-sincronizada.mjs.
import { listarEsvaziados } from '../scripts/verificar-pasta-sincronizada.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { iniciarServidor, lancarNavegador } from './_infra.mjs';
import { testarOralLeiSeca } from './oral-lei-seca.mjs';
import { testarLegisGuiado } from './legis-guiado.mjs';
import { testarEnamModo } from './enam-modo.mjs';
import { testarIpadToque } from './ipad-toque.mjs';
import { testarIpadToqueSatelites } from './ipad-toque-satelites.mjs';
import { testarAuthIpad } from './auth-ipad.mjs';
import { testarAuthAbertura } from './auth-abertura.mjs';
import { testarCarregamentoInicial, testarAberturaEmbutida } from './carregamento-inicial.mjs';
import { testarTemplateFileUrl } from './template-file-url.mjs';
import { testarAuthModoLocal } from './auth-modo-local.mjs';
import { testarSelectHost } from './select-host.mjs';
import { testarJurisQuadro } from './juris-quadro.mjs';
import { testarPrioridadeErrosResolvidos } from './prioridade-erros-resolvidos.mjs';
import { testarRevisaoFonte } from './revisao-fonte.mjs';
import { testarVoltaOrigem } from './volta-origem.mjs';
import { testarContrasteDestaque } from './contraste-destaque.mjs';
import { testarIconesAlvos } from './icones-alvos.mjs';
import { testarPrioridadeDiscursiva } from './prioridade-discursiva.mjs';
import { testarPadronizacaoVisual } from './padronizacao-visual.mjs';
import { testarPostMessageSeguranca } from './postmessage-seguranca.mjs';
import { testarMenuLateral } from './menu-lateral.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// porta própria por padrão: run.mjs usa a 8123, e as duas suítes podem rodar lado a lado
const PORTA = +(process.env.CT_PORT || 8124);
const { srv, url: URL0 } = await iniciarServidor(RAIZ, PORTA);
const { browser, motor } = await lancarNavegador(process.env.CT_BROWSER || 'webkit');
console.log('[' + motor + '] Prova oral → Lei seca, LEGIS guiado, Modo ENAM e o quadro do JURIS em http://localhost:' + PORTA + ' e em file://');

const falhas = [];
const ok = (cond, label) => { console.log((cond ? '✓ ' : '✗ ') + label); if (!cond) falhas.push(label); };

try { await testarPrioridadeErrosResolvidos(ok); }
catch (e) { ok(false, 'PRIORIDADE erro resolvido exceção: ' + e.message); }

// pathToFileURL não põe barra final; o teste concatena '/' + arquivo
const ORIGENS = [[URL0, 'http', 'Catedra.dc.html'], [pathToFileURL(RAIZ).href, 'file', 'Catedra.dc.html']];
const BUNDLE = path.join(RAIZ, 'mac', 'build', 'web');
// Bundle velho que o iCloud esvaziou: lê-lo seria a leitura que já voltou errada. A checagem do
// primeiro import só conta as saídas de build (o build as refaz); aqui ninguém refaz, então fica de fora.
const bundleEsvaziado = listarEsvaziados([BUNDLE]).length;
if (bundleEsvaziado) console.log('[' + motor + '] mac/build/web tem ' + bundleEsvaziado + ' arquivo(s) esvaziado(s) pelo iCloud — a origem [bundle] fica de fora (refaça com: node scripts/build-macos.mjs)');
else if (fs.existsSync(path.join(BUNDLE, 'index.html'))) ORIGENS.push([pathToFileURL(BUNDLE).href, 'bundle', 'index.html']);
else console.log('[' + motor + '] sem mac/build/web/index.html — a origem [bundle] fica de fora (gere com: node scripts/build-macos.mjs)');
for (const [base, origem, arquivo] of ORIGENS) {
  // contexto novo por origem: localStorage e IndexedDB de uma não vazam para a outra
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  try { await testarOralLeiSeca(page, base, ok, { motor, origem, arquivo }); }
  catch (e) {
    ok(false, 'ORAL LEI SECA [' + motor + '] [' + origem + '] o roteiro correu sem exceção ('
      + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
  }
  // LA3: o modo guiado do LEGIS marcando por toque de palavra — o caminho do iPad
  try { await testarLegisGuiado(page, base, ok, { motor, origem }); }
  catch (e) {
    ok(false, 'LEGIS GUIADO [' + motor + '] [' + origem + '] o roteiro correu sem exceção ('
      + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
  }
  // E3: o Modo ENAM — grade de 80 sobre a tela cheia e o banco oficial chegando por <script>
  try { await testarEnamModo(page, base, ok, { motor, origem, arquivo }); }
  catch (e) {
    ok(false, 'ENAM MODO [' + motor + '] [' + origem + '] o roteiro correu sem exceção ('
      + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
  }
  // iPad por toque (retrato 820 e paisagem 1180, hasTouch): quadradinhos, gaveta, giro,
  // scroll único, marcar por seleção, bipe, backup automático, cronômetro ao voltar.
  // Só na origem http: o módulo semeia por base+'/__semente' (404 na mesma origem).
  // Login e sincronização no iPad (portão, teclado, sessão expirada, boot sem rede): a
  // fixture tests/auth-ipad-fixture.html carrega o auth.js com um Supabase de mentira —
  // existe na raiz do repositório, não no bundle, por isso a origem [bundle] fica de fora.
  if (origem !== 'bundle') {
    await testarAuthAbertura(page, base, ok);
    try { await testarAuthIpad(page, base, ok, { motor, origem }); }
    catch (e) {
      ok(false, 'AUTH IPAD [' + motor + '] [' + origem + '] o roteiro correu sem exceção ('
        + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
    }
  }
  if (origem === 'http') {
    await testarCarregamentoInicial(page, base, ok);
    await testarAberturaEmbutida(ok);
    try { await testarPrioridadeDiscursiva(page, base, ok); } catch(e) { ok(false, 'DISCURSIVA exceção: '+e.message); }
    try { await testarRevisaoFonte(page, base, ok, { motor, origem }); }
    catch (e) {
      ok(false, 'REVISÃO/FONTE [' + motor + '] o roteiro correu sem exceção ('
        + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
    }
    try { await testarIpadToque(page, base, ok, { motor, origem }); }
    catch (e) {
      ok(false, 'IPAD TOQUE [' + motor + '] [' + origem + '] o roteiro correu sem exceção ('
        + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
    }
    // o WebKit é o motor do WKWebView do iPad: é aqui que o alvo de toque dos satélites
    // vale mais, porque é o navegador do aparelho onde a régua por largura não alcançava.
    try { await testarIpadToqueSatelites(page, base, ok, { motor, origem }); }
    catch (e) {
      ok(false, 'IPAD/satélites toque [' + motor + '] [' + origem + '] o roteiro correu sem exceção ('
        + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
    }
    // o <select> do host: o tema nativo do WebKit reescrevia padding, raio e min-height (20 px
    // no toque em vez de 44, e 20 com mouse no app do Mac em vez de 38) — só este motor acusa
    try { await testarTemplateFileUrl(browser, base, ok, { motor }); } catch (e) { ok(false, 'TEMPLATE/file exceção: ' + e.message); }
    { const ctxML = await browser.newContext(); const pML = await ctxML.newPage(); try { await testarAuthModoLocal(pML, base, ok); } catch (e) { ok(false, 'MODO LOCAL exceção: ' + e.message); } finally { await ctxML.close(); } }
    try { await testarSelectHost(page, base, ok, { motor, origem }); }
    catch (e) {
      ok(false, 'SELECT/host [' + motor + '] [' + origem + '] o roteiro correu sem exceção ('
        + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
    }
  }
  // O quadro "Não confunda com" do JURIS: a grade usa subgrid, container query e color-mix, e
  // é o motor da Apple que o iPad e o Mac mostram — passar no Chromium não garante o que eles
  // pintam. Só na origem http: o módulo semeia os roteiros por base+'/__semente' (404 na mesma
  // origem), que não existe em file://, e monta o satélite num iframe com a ponte de IA falsa.
  if (origem === 'http') {
    try { await testarPadronizacaoVisual(page, base, ok, { motor, origem }); }
    catch (e) { ok(false, 'PADRONIZAÇÃO VISUAL [' + motor + '] exceção: ' + String(e && e.message || e).split('\n')[0]); }
    // o Baralho do menu com o estilo dos irmãos, e 44 px no toque em retrato e em paisagem —
    // o motor do WKWebView é o que o iPad pinta
    try { await testarMenuLateral(page, base, ok, { motor, origem }); }
    catch (e) { ok(false, 'MENU/BARALHO [' + motor + '] exceção: ' + String(e && e.message || e).split('\n')[0]); }
    // o texto sobre o destaque medido no motor da Apple: gradiente, color-mix e os tokens por
    // cópia no LEGIS são o que o iPad e o Mac pintam
    try { await testarContrasteDestaque(page, base, ok, { motor }); }
    catch (e) { ok(false, 'CONTRASTE/DESTAQUE [' + motor + '] exceção: ' + String(e && e.message || e).split('\n')[0]); }
    // os ícones do app, dos satélites e do portão (SVG Lucide, não emoji) e os alvos do cronômetro no toque, no motor que o
    // iPad pinta — e a nota da Prova oral, cujo fundo inválido o WebKit também descartava
    try { await testarIconesAlvos(page, base, ok, { motor }); }
    catch (e) { ok(false, 'ÍCONES/ALVOS [' + motor + '] exceção: ' + String(e && e.message || e).split('\n')[0]); }
    try { await testarJurisQuadro(page, base, ok, { motor, origem }); }
    catch (e) {
      ok(false, 'JURIS/QUADRO [' + motor + '] [' + origem + '] o roteiro correu sem exceção ('
        + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
    }
    try { await testarPostMessageSeguranca(page, base, ok, { motor, origem, arquivo }); }
    catch (e) {
      ok(false, 'PONTE [' + motor + '] [' + origem + '] o roteiro correu sem exceção ('
        + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
    }
  }
  // Volta à origem: a pílula do LEGIS/JURIS e o botão nativo (shim extraído do Swift) levam ao
  // ponto exato. Em http, todas as origens; em file:// (o caminho dos apps), a ida-e-volta do
  // rito e o shim nativo, falando com os satélites pelo Frame (origem opaca). O bundle fica de
  // fora: é uma cópia gerada que pode estar velha em relação ao código sob teste.
  if (origem !== 'bundle') {
    try { await testarVoltaOrigem(page, base, ok, { motor, origem, arquivo }); }
    catch (e) {
      ok(false, 'VOLTA [' + motor + '] [' + origem + '] o roteiro correu sem exceção ('
        + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
    }
  }
  // A ponte em file:// é o caminho dos apps nativos. Como cada arquivo tem origem opaca,
  // esta execução prova que a autorização pela contentWindow exata funciona sem depender
  // de origin — e que um iframe local arbitrário continua sem privilégios.
  if (origem === 'file') {
    try { await testarPostMessageSeguranca(page, base, ok, { motor, origem, arquivo }); }
    catch (e) {
      ok(false, 'PONTE [' + motor + '] [' + origem + '] o roteiro correu sem exceção ('
        + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
    }
  }
  await ctx.close();
}

await browser.close();
srv.close();
console.log(falhas.length ? ('\nFALHAS: ' + falhas.length) : '\nTODOS OS TESTES PASSARAM');
process.exit(falhas.length ? 1 : 0);
