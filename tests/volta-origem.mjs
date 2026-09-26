/* VOLTA À ORIGEM — o botão de voltar do LEGIS/JURIS leva ao ponto exato (24/09/2026)

   A dona pediu: "fazer o botão de voltar funcionar". Ficou UM mecanismo só: a pílula do
   legis-web/juris-web (ctVoltaDisponivel → ctVoltarAcervo) e o botão nativo do Mac/iPad
   (window.catedraVoltarAcervo) chamam a mesma função do host, _voltarDoAcervo(de), e a
   origem `de` é JSON puro {view, rotulo, rito?, peca?, bloco?, disc?, rev?}.

   Este roteiro roda no Catedra.dc.html REAL (o tests/harness-acervo.html era uma cópia
   antiga do host, sem os ramos de prioridade, ciclo e 2ª fase, e sem os iframes vivos).
   Para cada origem ele prova, pela interface:
   · a ida grava state.acervoDe com a view certa e o rótulo do host;
   · a pílula PINTA dentro do iframe do acervo: caixa > 0, display ≠ none, altura ≥ 44 px,
     dentro do quadro, é ela que recebe o toque no centro (elementFromPoint) e o texto
     tem contraste ≥ 4,5:1 — presença no DOM não prova nada;
   · o toque de verdade (clique do Playwright, com as checagens de ação dele) volta à view
     exata e REABRE o ponto. Para provar a reabertura, o ponto é desfeito no satélite
     escondido antes do toque (outro rito, painel fechado, linha recolhida): se a volta só
     trocasse de tela, o teste ficaria vermelho.
   E ainda: menu/notificação → LEGIS não acende pílula velha; o salto LEGIS→JURIS mantém a
   origem anterior (mesmo com uma `origem` na mensagem); window.catedraVoltarAcervo chamado
   direto com cada forma de `de` (antigo sem view, view desconhecida, view proibida, a view
   atual sem destruir o estado vivo); e o shim nativo extraído de mac/ios main.swift, rodando
   numa página real, entrega de.view==='roteiros' para um chip do pecas-web.

   Consertos da 2ª rodada, cada um com caso que MEDE:
   · leitor ABERTO (oral, simulado, ENAM "Ler no LEGIS", lei aberta depois da ida do ciclo,
     verbete aberto no JURIS) em 1280, 744 e 390 px: a pílula recebe o toque no centro, no
     satélite e visto do host, e o fechar e os controles do leitor seguem recebendo o deles;
   · nome acessível = só o rótulo (getByRole), seta em SVG aria-hidden; pílula é o 1º
     focável do body; Alt+← volta (e não dentro de campo de texto); o foco do host vai à
     view de destino depois da volta;
   · contraste ≥ 4,5:1 com o destaque padrão, #84cc16 e #0d9488, no claro e no escuro;
   · Mapa de Processo (C2): ida pelo painel de um nó e de uma peça, "Voltar ao mapa do
     processo", o MESMO painel reaberto sem roteiro lateral e sem remontar o mapa;
   · revisão numa área que não abre o JURIS; revisão com abas nativas (não fecha a sessão);
   · shim nativo: salto LEGIS web → JURIS com a origem viva do host (C1), nunca a do frame;
   · D2: catedraVoltarAcervo({view:'naoexiste'}) devolve false e fica no lugar.

   Consertos da 3ª rodada:
   · K1: a pílula pinta o par próprio --accentFill/--onAccentFill (≥ 4,5:1 no texto e ≥ 3:1
     contra a --surface), com o destaque padrão, #84cc16, #0d9488 e #d6457f, claro e escuro;
     o --accent do app fica o de antes (o hex escolhido); o --onAccent saiu da régua de luma
     em 25/09 (tests/contraste-destaque.mjs);
     a cor livre do seletor (setAccentColor) chega ao LEGIS aberto;
   · o foco da volta pela lista de revisões continua no botão de origem ~700 ms depois;
   · o toast de ações apagado não intercepta: a 390 px a pílula recebe o toque de verdade;
   · Alt+← com o leitor do JURIS aberto volta e não troca o verbete;
   · K3: ids herdados de Object no Mapa ('no:constructor', 'peca:toString') recusados no host
     e no ritos-web, sem lixo no localStorage, e o lixo já gravado ignorado na carga;
   · K2: no shim nativo (Mac E iPad), a origem forjada por ritos-web/prioridade-web chega
     normalizada (view do data-ct-view, sem rev); o retrato que volta é saneado; a sessão
     guiada com abas nativas não fecha nos dois shims;
   · estático: o botão da barra do Mac usa chevron.left (sem "←") e leva o rótulo ao item.

   RELÓGIO FIXO às 14:00 (padrão de tests/registro-sessao.mjs): a atividade do ciclo mora num
   dia da semana e as revisões vencem "hoje". Contexto próprio porque o relógio não desinstala.
   A semente entra por base+'/__semente' (404 na mesma origem) antes de o app abrir — semear
   com o app aberto é corrida com o autosave. Em file:// (o caminho dos apps nativos) não há
   rota inexistente: a semente vai com o app aberto e o autosave desligado na instância. */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CC = 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm';

export async function testarVoltaOrigem(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const origem = opcoes.origem || (String(base).startsWith('file:') ? 'file' : 'http');
  const arquivo = opcoes.arquivo || 'Catedra.dc.html';
  const R = 'VOLTA [' + motor + '] [' + origem + '] ';
  const browser = pageDaSuite.context().browser();

  // As duas cópias de AcervoEntrada.swift (Mac e iPad) guardam e devolvem o `de`: se
  // divergirem, um aparelho volta certo e o outro não.
  const aeMac = fs.readFileSync(path.join(RAIZ, 'mac/vendor/legis/AcervoEntrada.swift'), 'utf8');
  const aeIos = fs.readFileSync(path.join(RAIZ, 'ios/vendor/legis/AcervoEntrada.swift'), 'utf8');
  ok(aeMac === aeIos, R + 'NATIVO as duas cópias de AcervoEntrada.swift (Mac e iPad) são idênticas');
  ok(/JSONSerialization/.test(aeMac) && !/func aspas\(/.test(aeMac),
    R + 'NATIVO AcervoEntrada devolve o `de` serializado por JSONSerialization, não montado à mão');

  // O botão da barra do Mac: a seta é o SF Symbol, nunca um "←" no título (o VoiceOver lia
  // "seta para a esquerda, Voltar…"), e o rótulo da origem chega também ao item da barra e ao
  // menu de estouro (antes o item dizia sempre "Voltar ao processo", qualquer que fosse a origem).
  {
    const mac = fs.readFileSync(path.join(RAIZ, 'mac/Sources/main.swift'), 'utf8');
    const corpo = nome => { const i = mac.indexOf('func ' + nome + '('); if (i < 0) return '';
      const a = mac.indexOf('{', i); let n = 0, j = a; for (; j < mac.length; j++) { if (mac[j] === '{') n++; else if (mac[j] === '}') { n--; if (!n) break; } }
      return mac.slice(a, j + 1); };
    const monta = corpo('makeVoltaItem'), atualiza = corpo('atualizarBotaoVoltarAcervo');
    ok(!!monta && !/←|\\u\{2190\}|\\u2190/.test(monta) && /\.image\s*=\s*NSImage\(systemSymbolName:\s*"chevron\.left"/.test(monta) && /imagePosition\s*=\s*\.imageLeading/.test(monta),
      R + 'NATIVO Mac: makeVoltaItem monta o voltaButton sem "←" no título, com NSImage(systemSymbolName: "chevron.left") à esquerda');
    ok(/menuFormRepresentation\s*=/.test(monta) && /voltaItem\s*=\s*item/.test(monta),
      R + 'NATIVO Mac: o item da barra guarda a referência (voltaItem) e nasce com menuFormRepresentation para o menu de estouro');
    ok(!!atualiza && !/←/.test(atualiza) && /voltaButton\?\.title\s*=\s*o\.rotulo/.test(atualiza) && /voltaButton\?\.setAccessibilityLabel\(o\.rotulo\)/.test(atualiza)
      && /voltaItem\?\.label\s*=\s*o\.rotulo/.test(atualiza) && /voltaItem\?\.paletteLabel\s*=\s*o\.rotulo/.test(atualiza)
      && /voltaItem\?\.menuFormRepresentation\?\.title\s*=\s*o\.rotulo/.test(atualiza),
      R + 'NATIVO Mac: atualizarBotaoVoltarAcervo põe o rótulo da origem no botão, no nome acessível, no label/paletteLabel do item e no menu de estouro, sem "←"');
    // o detector _temAbasNativas (a sessão guiada não fecha quando há abas nativas) olha o
    // handler catedraNav: se um dos aparelhos deixar de registrá-lo, a sessão volta a fechar
    const ios = fs.readFileSync(path.join(RAIZ, 'ios/Sources/main.swift'), 'utf8');
    ok(/addScriptMessageHandler\([^)]*name:\s*"catedraNav"/.test(mac) && /for nome in \[[^\]]*"catedraNav"[^\]]*\][\s\S]{0,200}addScriptMessageHandler\([^)]*name:\s*nome/.test(ios),
      R + 'NATIVO Mac e iPad registram o handler catedraNav (é por ele que o host sabe que tem abas nativas)');
  }

  // 1) a interface web: cada origem, ida e volta pela pílula
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
    await page.clock.install({ time: hoje14() });
    try {
      await abrirApp(page, base, arquivo, origem === 'http');
      if (origem === 'http') await roteiroWeb(page, ok, R, origem);
      else await roteiroWebArquivo(page, ok, R);
    } catch (e) {
      ok(false, R + 'WEB o roteiro correu sem exceção (' + String(e && e.message || e).split('\n')[0].slice(0, 180) + ')');
    } finally { await ctx.close(); }
  }

  // 2) o caminho nativo: o shim de verdade (extraído do Swift) numa página real
  for (const [nome, arquivoSwift] of [['Mac', 'mac/Sources/main.swift'], ['iPad', 'ios/Sources/main.swift']]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    let shim = '';
    try { shim = extrairShim(arquivoSwift); }
    catch (e) { ok(false, R + 'NATIVO ' + nome + ': o shim foi extraído de ' + arquivoSwift + ' (' + e.message + ')'); await ctx.close(); continue; }
    ok(true, R + 'NATIVO ' + nome + ': o shim (satelitePodeAbrirAcervo + origemComView + listener) foi extraído de ' + arquivoSwift);
    await ctx.addInitScript({ content: embrulharShim(shim) });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
    await page.clock.install({ time: hoje14() });
    try {
      await abrirApp(page, base, arquivo, false);
      await roteiroNativo(page, ok, R + 'NATIVO ' + nome + ': ', nome === 'Mac');
    } catch (e) {
      ok(false, R + 'NATIVO ' + nome + ': o roteiro correu sem exceção (' + String(e && e.message || e).split('\n')[0].slice(0, 180) + ')');
    } finally { await ctx.close(); }
  }
}

function hoje14() { const t = new Date(); t.setHours(14, 0, 0, 0); return t; }

/* ------------------------------------------------------------------ semente e ajudantes */

async function abrirApp(page, base, arquivo, comSegundaFase) {
  const http = /^https?:/.test(base);
  if (http) await page.goto(base + '/__semente');
  else {
    await page.goto(base + '/' + arquivo);
    await page.waitForTimeout(600);
    await page.evaluate(() => { try { if (window.__catedraApp) window.__catedraApp._autosave = () => {}; } catch (_) {} });
  }
  await page.evaluate(semear, { comSegundaFase: comSegundaFase && http, base });
  await page.goto(base + '/' + arquivo);
  await page.waitForFunction(() => !!window.__catedraApp && typeof window.__catedraGoView === 'function', null, { timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.evaluate(instalarAjudantes);
}

async function semear({ comSegundaFase, base }) {
  const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
  localStorage.clear();
  set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
  set('cycleMode', 'manual'); set('blocks', []); set('agendaFeitas', {});
  set('edital', [
    { disc: 'Direito Civil', peso: 3, questoes: 20, color: '#2563eb',
      topics: [{ name: 'Obrigações', done: false, subs: [{ name: 'Adimplemento' }] }] },
    { disc: 'Direito Processual Civil', peso: 3, color: '#0f766e', topics: [] },
    { disc: 'Direito Constitucional', peso: 3, color: '#7c3aed', topics: [] }
  ]);
  set('sessions', []); set('reviews', []); set('errors', []); set('fc', []); set('leituras', []);
  const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  set('manualFixed', [{ id: 'ag-civil', disc: 'Direito Civil', kind: 'Teoria', min: 90,
    dia: DIAS[new Date().getDay()], roteiro: '',
    discEdital: 'Direito Civil', topico: 'Obrigações', subtopico: 'Adimplemento' }]);
  if (!comSegundaFase) return;
  // A 2ª fase guarda a sessão em 'catedraSegundaFase' (sem o prefixo). Uma prova entregue,
  // cuja correção tem dispositivo do espelho para abrir na lei seca.
  const carregar = src => new Promise(res => { const s = document.createElement('script');
    s.charset = 'utf-8'; s.src = base + '/' + src; s.onload = res; s.onerror = res; document.head.appendChild(s); });
  await carregar('espelhos.js'); await carregar('treino.js');
  const P = (window.CT_ESPELHOS || {}).provas || [], T = window.CT_TREINO;
  const alvo = T && P.find(p => { try { return T.corrigirPorEspelho(p, 'folha').quesitos.some(q => q.dispositivos.length); } catch (_) { return false; } });
  if (!alvo) return;
  localStorage.setItem('catedraSegundaFase', JSON.stringify({ hist: [], sessao: {
    id: alvo.id, minutos: 300, inicio: Date.now(), acc: 60000, rodando: false,
    folha: 'Folha de teste da correção.', entregue: true, gasto: 60000, veredictos: {} } }));
}

/* Roda na página do host. Tudo espera CONDIÇÃO (nunca tempo fixo sozinho). */
function instalarAjudantes() {
  const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const cor = s => { s = String(s || '');
    let m = /rgba?\(([^)]+)\)/.exec(s); if (m) return m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    m = /color\(srgb\s+([^)]+)\)/.exec(s); if (m) return m[1].split(/[\s/]+/).filter(Boolean).map((x, i) => i < 3 ? Number(x) * 255 : Number(x));
    return null; };
  window.__vo = {
    w: ms => new Promise(r => setTimeout(r, ms)),
    app: () => window.__catedraApp,
    fr: v => document.querySelector('iframe[data-ct-view="' + v + '"]'),
    async ate(f, ms = 15000) {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) { try { const r = f(); if (r) return r; } catch (_) {} await new Promise(r => setTimeout(r, 60)); }
      try { return f(); } catch (_) { return null; }
    },
    /** o iframe da view carregou e o teste do satélite passou */
    async pronto(v, teste, ms = 30000) {
      return this.ate(() => { const f = this.fr(v); if (!f || f.dataset.ctLoad !== '1' || !f.contentWindow || !f.contentDocument) return null;
        return (!teste || teste(f.contentWindow, f.contentDocument)) ? f : null; }, ms);
    },
    async naView(v, ms = 10000) { return !!(await this.ate(() => this.app().state.view === v && this.fr(v) ? true : this.app().state.view === v, ms)); },
    /** espia os ctAbrirBloco que o host manda a um satélite */
    espiar(v) { const f = this.fr(v); if (!f || !f.contentWindow) return false; const w = f.contentWindow; w.__voBlocos = [];
      if (!w.__voEspia) { w.__voEspia = true; w.addEventListener('message', e => { if (e.data && e.data.type === 'ctAbrirBloco') w.__voBlocos.push(JSON.parse(JSON.stringify(e.data))); }); }
      return true; },
    blocos(v) { const f = this.fr(v); return ((f && f.contentWindow && f.contentWindow.__voBlocos) || []).slice(); },
    de() { const d = this.app().state.acervoDe; return d ? JSON.parse(JSON.stringify(d)) : d; },
    /** a pílula do acervo, MEDIDA: caixa, display, alvo de toque, quem recebe o toque, contraste */
    async pilula(v) {
      const f = this.fr(v);
      const b = await this.ate(() => { const d = f && f.contentDocument; const x = d && d.getElementById('ct-volta');
        return (x && f.contentWindow.getComputedStyle(x).display !== 'none' && (x.textContent || '').trim()) ? x : null; }, 25000);
      const fr = f ? f.getBoundingClientRect() : { width: 0, height: 0 };
      if (!b) { const x = f && f.contentDocument && f.contentDocument.getElementById('ct-volta');
        return { visivel: false, existe: !!x, display: x ? f.contentWindow.getComputedStyle(x).display : '(sem pílula)', quadro: fr.width + 'x' + fr.height }; }
      const W = f.contentWindow, cs = W.getComputedStyle(b), r = b.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const hit = f.contentDocument.elementFromPoint(cx, cy);
      const fg = cor(cs.color), bg = cor(cs.backgroundColor);
      let contraste = 0;
      if (fg && bg) { const a = lum(fg), c = lum(bg); contraste = (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05); }
      // o toque visto do HOST: no centro da pílula, a página de cima tem de achar o próprio
      // iframe (uma barra do host por cima dele, no celular, esconderia a volta sem o satélite saber)
      const hh = document.elementFromPoint(fr.left + cx, fr.top + cy);
      const svg = b.querySelector('svg');
      const D = f.contentDocument;
      const focaveis = [...D.body.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter(e => !e.disabled && e.getClientRects().length > 0 && W.getComputedStyle(e).visibility !== 'hidden');
      return { visivel: true, texto: (b.textContent || '').trim(), display: cs.display, visibilidade: cs.visibility,
        altura: Math.round(r.height), largura: Math.round(r.width),
        dentro: r.left >= 0 && r.top >= 0 && r.right <= W.innerWidth && r.bottom <= W.innerHeight,
        noTopo: !!hit && (hit === b || b.contains(hit)), hostTopo: hh === f,
        hostEl: hh === f ? 'iframe' : (hh ? (hh.tagName + (hh.id ? '#' + hh.id : '') + (hh.className && typeof hh.className === 'string' ? '.' + hh.className.split(/\s+/).slice(0, 2).join('.') : '')
          + ' ' + JSON.stringify((hh.closest('[role],[aria-label],[class]') || hh).outerHTML.replace(/\s+/g, ' ').slice(0, 220))) : 'nada'), quadroVisivel: f.style.display !== 'none' && fr.width > 0 && fr.height > 0,
        contraste: Math.round(contraste * 100) / 100, cores: cs.color + ' / ' + cs.backgroundColor, fundo: cs.backgroundColor,
        svgOculto: !!svg && svg.getAttribute('aria-hidden') === 'true', svgTam: svg ? Math.round(svg.getBoundingClientRect().width) + 'x' + Math.round(svg.getBoundingClientRect().height) : '-',
        seta: /[←⬅]/.test((b.textContent || '') + (b.getAttribute('aria-label') || '')),
        primeiroFocavel: focaveis[0] === b, primeiro: focaveis[0] ? (focaveis[0].id || focaveis[0].tagName) : '-' };
    },
    /** O leitor do satélite (LEGIS #rdr, JURIS #jrdr): aberto? e cada controle visível da
     *  barra superior, do esquema e das ferramentas recebe o toque no PRÓPRIO centro? */
    leitor(v) {
      const f = this.fr(v), W = f && f.contentWindow, D = f && f.contentDocument;
      if (!D) return { aberto: false };
      const C = v === 'juris' ? { id: 'jrdr', fechar: 'jrClose', sel: '.top button, .map .mnode, #jrTools .tool' }
                              : { id: 'rdr', fechar: 'rdrClose', sel: '.top button, .top a, .map .mnode, #rdrTools .tool' };
      const L = D.getElementById(C.id), b = D.getElementById('ct-volta');
      const hitDe = el => { if (!el) return null; const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return null;
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cx < 0 || cy < 0 || cx > W.innerWidth || cy > W.innerHeight) return null;
        const h = D.elementFromPoint(cx, cy); return !!h && (h === el || el.contains(h)); };
      const aberto = !!L && L.classList.contains('on');
      const out = { aberto, medidos: 0, cobertos: [], fechar: hitDe(D.getElementById(C.fechar)), sobrepoeTop: null, dentroDoLeitor: !!(L && b && L.contains(b)) };
      if (!aberto) return out;
      const top = L.querySelector('.top');
      if (top && b) { const t = top.getBoundingClientRect(), r = b.getBoundingClientRect();
        out.sobrepoeTop = !(r.bottom <= t.top || r.top >= t.bottom || r.right <= t.left || r.left >= t.right); }
      L.querySelectorAll(C.sel).forEach(el => {
        const cs = W.getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || !el.offsetParent) return;
        const h = hitDe(el); if (h === null) return;
        out.medidos++; if (!h) out.cobertos.push((el.id || el.className) + '@' + Math.round(el.getBoundingClientRect().top));
      });
      return out;
    },
    /** Os tokens de cor como PINTAM: os do host (a raiz [data-dark][data-dir], de onde o
     *  _temaTokens copia) e os que chegaram à raiz do satélite; e o destaque do tema/escolhido,
     *  para comparar com a régua antiga do --onAccent. */
    tokens(v) {
      const K = ['--accent', '--onAccent', '--accentSolid', '--accentFill', '--onAccentFill', '--surface'];
      const ler = cs => { const o = {}; K.forEach(k => { o[k] = cs ? cs.getPropertyValue(k).trim().toLowerCase() : ''; }); return o; };
      const el = document.querySelector('[data-dark][data-dir]');
      const f = v ? this.fr(v) : null;
      const sat = (f && f.contentDocument) ? ler(f.contentWindow.getComputedStyle(f.contentDocument.documentElement)) : null;
      const app = this.app(), D = app.THEMES()[app.state.dir] || app.THEMES().sutil, P = D[app.state.darkMode ? 'dark' : 'light'];
      return { host: ler(el ? getComputedStyle(el) : null), sat, tema: { accent: P.accent, onAccent: P.onAccent },
        escolhido: app.state.accent || null, dir: app.state.dir, escuro: !!app.state.darkMode };
    },
    /** onde o foco do host está (depois da volta, a pílula sumiu com o iframe) */
    async foco(ms = 1500) {
      const t0 = Date.now(); let a = document.activeElement;
      while (Date.now() - t0 < ms && (!a || a === document.body || a.tagName === 'IFRAME')) { await new Promise(r => setTimeout(r, 50)); a = document.activeElement; }
      return { tag: a ? a.tagName : '-', id: (a && a.id) || '', corpo: !a || a === document.body, iframe: !!a && a.tagName === 'IFRAME',
        dataId: (a && a.dataset && a.dataset.id) || '', acervoRev: !!(a && a.dataset && a.dataset.acervoRev),
        noDialogo: !!(a && a.closest && a.closest('[role="dialog"]')), texto: ((a && a.textContent) || '').trim().slice(0, 40) };
    }
  };
}

/** ok() da pílula: pinta, alvo de toque, texto, contraste — e devolve se dá para tocar. */
function conferirPilula(ok, R, caso, v, p, rotulo) {
  const onde = v === 'juris' ? 'JURIS' : 'LEGIS';
  ok(!!p && p.visivel && p.quadroVisivel && p.display !== 'none' && p.visibilidade !== 'hidden' && p.largura > 0 && p.altura >= 44 && p.dentro && p.noTopo,
    R + caso + ' pílula PINTA no ' + onde + ' (display ' + (p && p.display) + ', ' + (p && p.largura) + '×' + (p && p.altura) + ' px, dentro do quadro: ' + (p && p.dentro) + ', recebe o toque: ' + (p && p.noTopo) + ')');
  // a seta virou SVG Lucide aria-hidden: o texto (e o nome acessível) é SÓ o rótulo
  ok(!!p && p.texto === rotulo && !p.seta, R + caso + ' pílula diz "' + rotulo + '", sem "←" no texto (achou "' + (p && p.texto) + '")');
  if (p && p.visivel && 'svgOculto' in p)
    ok(p.svgOculto && p.svgTam === '16x16', R + caso + ' a seta da pílula é um SVG de 16 px com aria-hidden (' + p.svgTam + ', aria-hidden: ' + p.svgOculto + ')');
  if (p && p.visivel && 'hostTopo' in p)
    ok(p.hostTopo, R + caso + ' visto do host, o centro da pílula cai no iframe do acervo (nada do host por cima' + (p.hostTopo ? '' : '; achou ' + p.hostEl) + ')');
  ok(!!p && p.contraste >= 4.5, R + caso + ' texto da pílula com contraste ≥ 4,5:1 (' + (p && p.contraste) + ':1 — ' + (p && p.cores) + ')');
  return !!(p && p.visivel);
}

/** toque de verdade na pílula (clique do Playwright, que exige visível, estável e sem nada por cima) */
async function tocarPilula(page, v) {
  try { await page.frameLocator('iframe[data-ct-view="' + v + '"]').locator('#ct-volta').click({ timeout: 8000 }); return true; }
  catch (e) { return false; }
}

/** O nome acessível da pílula é SÓ o rótulo: o getByRole do Playwright (árvore de
 *  acessibilidade) acha exatamente um botão com esse nome, e é o #ct-volta. */
async function nomeAcessivel(page, v, rotulo) {
  try {
    const loc = page.frameLocator('iframe[data-ct-view="' + v + '"]').getByRole('button', { name: rotulo, exact: true });
    const n = await loc.count();
    const id = n === 1 ? await loc.evaluate(el => el.id) : '';
    const comSeta = await page.frameLocator('iframe[data-ct-view="' + v + '"]').getByRole('button', { name: '← ' + rotulo, exact: true }).count();
    return { n, id, comSeta };
  } catch (e) { return { n: -1, id: '', comSeta: -1, erro: String(e && e.message || e).slice(0, 80) }; }
}

/** Com o leitor ABERTO, em 1280, 744 e 390 px: a pílula pinta por cima dele e recebe o
 *  toque (no satélite E visto do host), e os controles do leitor seguem recebendo o toque
 *  no próprio centro — o fechar e a barra superior nunca ficam sob a pílula. */
async function medirComLeitor(page, ok, R, caso, v) {
  const V = (fn, arg) => page.evaluate(fn, arg);
  const larguras = [[1280, 900], [744, 1000], [390, 844]];
  for (const [w, h] of larguras) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(450);
    const p = await V(v => window.__vo.pilula(v), v);
    const l = await V(v => window.__vo.leitor(v), v);
    ok(l.aberto && !!p && p.visivel && p.visibilidade !== 'hidden' && p.altura >= 44 && p.dentro && p.noTopo && p.hostTopo,
      R + caso + ' ' + w + ' px, leitor ABERTO: a pílula pinta por cima dele e recebe o toque no centro (leitor aberto: ' + l.aberto
      + ', ' + (p && p.largura) + '×' + (p && p.altura) + ', no satélite: ' + (p && p.noTopo) + ', no host: ' + (p && p.hostTopo) + (p && !p.hostTopo ? ' — por cima: ' + p.hostEl : '') + ')');
    ok(l.aberto && l.fechar === true && l.medidos > 3 && l.cobertos.length === 0 && l.sobrepoeTop === false,
      R + caso + ' ' + w + ' px, leitor ABERTO: o fechar e os ' + l.medidos + ' controles do leitor recebem o toque no próprio centro e a pílula fica fora da barra superior (fechar: '
      + l.fechar + ', cobertos: ' + JSON.stringify(l.cobertos) + ', sobre a barra: ' + l.sobrepoeTop + ')');
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(350);
}

/** Fecha o leitor no satélite (inclusive escondido, depois da volta), pelo botão dele. */
async function fecharLeitorNoQuadro(page, v) {
  return page.evaluate(v => { const f = window.__vo.fr(v), d = f && f.contentDocument; if (!d) return false;
    const L = d.getElementById(v === 'juris' ? 'jrdr' : 'rdr'); if (!L || !L.classList.contains('on')) return false;
    d.getElementById(v === 'juris' ? 'jrClose' : 'rdrClose').click(); return true; }, v);
}

/** O leitor do LEGIS (#rdr) aberto pelo "Ler ativamente": fecha como a pessoa fecharia, pelo ←. */
async function fecharLeitor(page) {
  const aberto = await page.evaluate(() => { const f = window.__vo.fr('legis'); const r = f && f.contentDocument && f.contentDocument.getElementById('rdr'); return !!(r && r.classList.contains('on')); });
  if (!aberto) return false;
  try { await page.frameLocator('iframe[data-ct-view="legis"]').locator('#rdrClose').click({ timeout: 5000 }); } catch (_) {}
  return true;
}

async function clicar(loc) {
  try { await loc.first().click({ timeout: 6000 }); return true; } catch (_) { return false; }
}

/* cor: '#abc', '#aabbcc', 'rgb(…)', 'color(srgb …)' → [r,g,b] (0–255); contraste WCAG */
function rgbDe(s) {
  s = String(s || '').trim().toLowerCase();
  let m = /^#([0-9a-f]{3})$/.exec(s); if (m) return m[1].split('').map(c => parseInt(c + c, 16));
  m = /^#([0-9a-f]{6})$/.exec(s); if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
  m = /rgba?\(([^)]+)\)/.exec(s); if (m) return m[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3).map(Number);
  m = /color\(srgb\s+([^)]+)\)/.exec(s); if (m) return m[1].split(/[\s/]+/).filter(Boolean).slice(0, 3).map(x => Math.round(Number(x) * 255));
  return null;
}
function mesmaCor(a, b) { const x = rgbDe(a), y = rgbDe(b); return !!x && !!y && x.every((v, i) => Math.abs(v - y[i]) <= 1); }
function contrasteDe(a, b) {
  const L = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const x = rgbDe(a), y = rgbDe(b); if (!x || !y) return 0;
  const p = L(x), q = L(y); return Math.round((Math.max(p, q) + 0.05) / (Math.min(p, q) + 0.05) * 100) / 100;
}

/** O toast de ações do host (o "desfazer" do gabarito) nasce ao encerrar o simulado. Depois
 *  que ele SOME, a 390 px — onde ele morava por cima da pílula —, a caixa apagada não pode
 *  seguir comendo o toque: mede o toast (pointer-events/visibility), a pílula vista do host
 *  e faz o toque de verdade na pílula a 390 px. Devolve se o toque foi aceito. */
async function tocarA390SemToast(page, ok, R, caso, v) {
  const t0 = await page.evaluate(() => { const t = window.__vo.app()._toastAcaoEl; return !!t && getComputedStyle(t).pointerEvents !== 'none'; });
  // o toast fica 7 s; o relógio do teste (page.clock) pula o resto em vez de esperar
  if (t0) { try { await page.clock.fastForward(8000); } catch (_) {} }
  await page.evaluate(() => window.__vo.ate(() => { const t = window.__vo.app()._toastAcaoEl; return !t || (getComputedStyle(t).pointerEvents === 'none' && !t.childElementCount); }, 6000));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(450);
  const s = await page.evaluate(() => { const t = window.__vo.app()._toastAcaoEl; const cs = t ? getComputedStyle(t) : null;
    return { existe: !!t, pe: cs ? cs.pointerEvents : '-', vis: cs ? cs.visibility : '-', op: cs ? cs.opacity : '-',
      vazio: !!t && !t.childElementCount && !(t.textContent || '').trim(), viva: !!t && t.getAttribute('role') === 'status' && t.getAttribute('aria-live') === 'polite' }; });
  const p = await page.evaluate(v => window.__vo.pilula(v), v);
  ok(s.existe && s.pe === 'none' && s.vazio && s.viva && s.vis !== 'hidden' && !!p && p.visivel && p.noTopo && p.hostTopo,
    R + caso + ' 390 px, depois que o toast de ações some: ele não intercepta nada, fica vazio (nenhum botão invisível no Tab), continua região viva na árvore e a pílula recebe o toque, no satélite e visto do host (toast: '
    + (s.existe ? 'pointer-events ' + s.pe + ', ' + s.vis + ', opacity ' + s.op + ', vazio ' + s.vazio + ', viva ' + s.viva : 'não existe') + '; no host: ' + (p && p.hostTopo) + (p && !p.hostTopo ? ' — por cima: ' + p.hostEl : '') + ')');
  const tocou = await tocarPilula(page, v);
  ok(tocou, R + caso + ' 390 px: o toque de verdade (Playwright) na pílula é aceito com o toast já apagado');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(350);
  return tocou;
}

/* ------------------------------------------------------------------ o roteiro web */

async function roteiroWeb(page, ok, R, origem) {
  const V = (fn, arg) => page.evaluate(fn, arg);
  const host = sel => page.locator('#dc-root ' + sel);
  const noFrame = (v, sel) => page.frameLocator('iframe[data-ct-view="' + v + '"]').locator(sel);
  const irPeloMenu = async v => { if (!(await clicar(host('button[data-view="' + v + '"]')))) await V(x => window.__catedraGoView(x), v); };

  /* ===== A. FLUXOGRAMA DO RITO ===== */
  await irPeloMenu('areamod');
  const a0 = await V(async () => {
    const vo = window.__vo;
    const f = await vo.pronto('areamod', w => !!w.CTRoteiro && !!w.ctAbrirPonto);
    if (!f) return { erro: 'o ritos-web não carregou' };
    const W = f.contentWindow, ORDEM = W.eval('ORDEM');
    // um rito que NÃO é o primeiro e tem chip de lei: o ponto de origem precisa ser distinguível
    let rito = '', outro = '';
    for (const r of ORDEM.slice(1)) { W.ctAbrirPonto(r); if (f.contentDocument.querySelector('#fluxo [data-legis]')) { rito = r; break; } }
    outro = ORDEM.find(r => r !== rito) || '';
    if (!rito) return { erro: 'nenhum rito com chip de lei' };
    vo.espiar('areamod');
    return { rito, outro };
  });
  if (a0.erro) { ok(false, R + 'RITO ' + a0.erro); return; }
  const RITO = a0.rito;
  const clicouChip = await clicar(noFrame('areamod', '#fluxo [data-legis]'));
  const a1 = await V(async () => { const vo = window.__vo; await vo.naView('legis'); return { view: vo.app().state.view, de: vo.de() }; });
  ok(clicouChip && a1.view === 'legis', R + 'RITO o chip ⚖️ do fluxograma abre o LEGIS (view=' + a1.view + ')');
  ok(!!a1.de && a1.de.view === 'areamod' && a1.de.rito === RITO && !a1.de.peca && a1.de.bloco == null && a1.de.rotulo === 'Voltar ao rito',
    R + 'RITO a ida grava a origem {view:areamod, rito, rótulo "Voltar ao rito"} (' + JSON.stringify(a1.de) + ')');
  conferirPilula(ok, R, 'RITO', 'legis', await V(() => window.__vo.pilula('legis')), 'Voltar ao rito');
  // o ponto se perde no satélite escondido (outro rito na tela): a volta tem de REAPLICÁ-LO
  await V(o => { const vo = window.__vo; vo.fr('areamod').contentWindow.ctAbrirPonto(o); vo.espiar('areamod'); }, a0.outro);
  const tocou = await tocarPilula(page, 'legis');
  const a2 = await V(async (rito) => {
    const vo = window.__vo; await vo.naView('areamod');
    const f = vo.fr('areamod');
    await vo.ate(() => new URLSearchParams(f.contentWindow.location.search).get('rito') === rito, 6000);
    return { view: vo.app().state.view, de: vo.app().state.acervoDe, visivel: f.style.display !== 'none',
      rito: new URLSearchParams(f.contentWindow.location.search).get('rito'), blocos: vo.blocos('areamod') };
  }, RITO);
  ok(tocou && a2.view === 'areamod' && a2.visivel && a2.de === null,
    R + 'RITO o toque na pílula volta a Processo e peças e apaga a origem (view=' + a2.view + ')');
  ok(a2.rito === RITO && a2.blocos.some(b => b.rito === RITO),
    R + 'RITO a volta reabre o MESMO rito no fluxograma (ctAbrirBloco {rito}; na tela: ' + a2.rito + ')');
  // segunda ida ao MESMO ponto: a chave do quadro não pode ficar parada e engolir a volta
  await V(o => { window.__vo.fr('areamod').contentWindow.ctAbrirPonto(o); }, RITO);
  await clicar(noFrame('areamod', '#fluxo [data-legis]'));
  await V(() => window.__vo.naView('legis'));
  await V(o => { const vo = window.__vo; vo.fr('areamod').contentWindow.ctAbrirPonto(o); vo.espiar('areamod'); }, a0.outro);
  await tocarPilula(page, 'legis');
  const a3 = await V(async (rito) => { const vo = window.__vo; await vo.naView('areamod'); const f = vo.fr('areamod');
    await vo.ate(() => new URLSearchParams(f.contentWindow.location.search).get('rito') === rito, 6000);
    return { view: vo.app().state.view, rito: new URLSearchParams(f.contentWindow.location.search).get('rito') }; }, RITO);
  ok(a3.view === 'areamod' && a3.rito === RITO, R + 'RITO a segunda ida-e-volta ao mesmo rito também o reaplica (' + a3.rito + ')');

  /* ===== B. ROTEIRO LATERAL (peça + bloco, dentro de Processo e peças) ===== */
  const b0 = await V(async () => {
    const vo = window.__vo, W = vo.fr('areamod').contentWindow;
    const peca = Object.keys(W.CT_PECAS || {})[0]; if (!peca) return { erro: 'sem peça com roteiro' };
    W.CTRoteiro.abrir(peca);
    const ok2 = await vo.ate(() => [...W.document.querySelectorAll('.ctr.on .rf button')].some(b => +b.dataset.b > 0), 8000);
    if (!ok2) return { erro: 'o painel do roteiro não mostrou chip de bloco' };
    const chip = [...W.document.querySelectorAll('.ctr.on .rf button')].find(b => +b.dataset.b > 0);
    chip.setAttribute('data-vo-chip', '1');
    return { peca, bloco: +chip.dataset.b };
  });
  if (b0.erro) ok(false, R + 'ROTEIRO LATERAL ' + b0.erro);
  else {
    const rotB = 'Voltar à peça · bloco ' + (b0.bloco + 1);
    const cB = await clicar(noFrame('areamod', '[data-vo-chip="1"]'));
    const b1 = await V(async () => { const vo = window.__vo; await vo.naView('legis'); return { view: vo.app().state.view, de: vo.de() }; });
    ok(cB && b1.view === 'legis' && !!b1.de && b1.de.view === 'areamod' && b1.de.rito === RITO && b1.de.peca === b0.peca && b1.de.bloco === b0.bloco && b1.de.rotulo === rotB,
      R + 'ROTEIRO LATERAL a ida grava {view:areamod, rito, peça, bloco ' + b0.bloco + '} (' + JSON.stringify(b1.de) + ')');
    // o LEGIS já estava montado: agora o texto chega por MENSAGEM (ctVoltaDisponivel {rotulo})
    conferirPilula(ok, R, 'ROTEIRO LATERAL', 'legis', await V(() => window.__vo.pilula('legis')), rotB);
    await V(() => { const vo = window.__vo; vo.fr('areamod').contentWindow.CTRoteiro.fechar(); vo.espiar('areamod'); });
    const tB = await tocarPilula(page, 'legis');
    const b2 = await V(async ({ peca, bloco }) => {
      const vo = window.__vo; await vo.naView('areamod'); const d = vo.fr('areamod').contentDocument;
      let destacado = -1;
      await vo.ate(() => { const blks = [...d.querySelectorAll('.ctr .blk')]; const i = blks.findIndex(b => b.classList.contains('volta')); if (i >= 0) destacado = i; return i >= 0; }, 8000);
      const tit = d.querySelector('.ctr [data-r=tit]');
      return { view: vo.app().state.view, aberto: !!d.querySelector('.ctr.on'), titulo: tit && tit.textContent, destacado, blocos: vo.blocos('areamod') };
    }, b0);
    ok(tB && b2.view === 'areamod' && b2.aberto && b2.titulo === b0.peca,
      R + 'ROTEIRO LATERAL a volta reabre o painel da MESMA peça (' + b2.titulo + ')');
    ok(b2.destacado === b0.bloco, R + 'ROTEIRO LATERAL …rolado e aceso no bloco de onde ela saiu (bloco ' + b2.destacado + ', esperado ' + b0.bloco + ')');
  }

  /* ===== C. ROTEIROS DE PEÇAS (pecas-web) — e o ritos-web escondido não recebe nada ===== */
  await irPeloMenu('roteiros');
  const c0 = await V(async () => {
    const vo = window.__vo;
    const f = await vo.pronto('roteiros', (w, d) => !!w.CTRoteiro && !!d.querySelector('.rcard'));
    if (!f) return { erro: 'o pecas-web não carregou' };
    vo.espiar('roteiros'); vo.espiar('areamod');
    return { peca: f.contentDocument.querySelector('.rcard').dataset.n };
  });
  if (c0.erro) ok(false, R + 'ROTEIROS ' + c0.erro);
  else {
    await clicar(noFrame('roteiros', '.rcard[data-n="' + c0.peca.replace(/"/g, '\\"') + '"]'));
    const c1 = await V(async () => { const vo = window.__vo, d = vo.fr('roteiros').contentDocument;
      await vo.ate(() => [...d.querySelectorAll('.ctr.on .rf button')].some(b => +b.dataset.b > 0), 8000);
      const chip = [...d.querySelectorAll('.ctr.on .rf button')].find(b => +b.dataset.b > 0);
      if (!chip) return { erro: 'o roteiro do pecas-web não mostrou chip de bloco' };
      chip.setAttribute('data-vo-chip', '1'); return { bloco: +chip.dataset.b }; });
    if (c1.erro) ok(false, R + 'ROTEIROS ' + c1.erro);
    else {
      const rotC = 'Voltar à peça · bloco ' + (c1.bloco + 1);
      await clicar(noFrame('roteiros', '[data-vo-chip="1"]'));
      const c2 = await V(async () => { const vo = window.__vo; await vo.naView('legis'); return { view: vo.app().state.view, de: vo.de() }; });
      ok(c2.view === 'legis' && !!c2.de && c2.de.view === 'roteiros' && c2.de.peca === c0.peca && c2.de.bloco === c1.bloco && c2.de.rotulo === rotC,
        R + 'ROTEIROS a ida grava {view:roteiros, peça, bloco} (' + JSON.stringify(c2.de) + ')');
      conferirPilula(ok, R, 'ROTEIROS', 'legis', await V(() => window.__vo.pilula('legis')), rotC);
      await V(() => { const vo = window.__vo; vo.fr('roteiros').contentWindow.CTRoteiro.fechar(); vo.espiar('roteiros'); vo.espiar('areamod'); });
      const tC = await tocarPilula(page, 'legis');
      const c3 = await V(async () => {
        const vo = window.__vo; await vo.naView('roteiros'); const d = vo.fr('roteiros').contentDocument;
        let destacado = -1;
        await vo.ate(() => { const i = [...d.querySelectorAll('.ctr .blk')].findIndex(b => b.classList.contains('volta')); if (i >= 0) destacado = i; return i >= 0; }, 8000);
        await vo.w(300);   // dá tempo de um vazamento chegar ao ritos-web, se houver
        const tit = d.querySelector('.ctr [data-r=tit]');
        return { view: vo.app().state.view, aberto: !!d.querySelector('.ctr.on'), titulo: tit && tit.textContent, destacado,
          blocosPecas: vo.blocos('roteiros'), blocosRitos: vo.blocos('areamod') };
      });
      ok(tC && c3.view === 'roteiros' && c3.aberto && c3.titulo === c0.peca && c3.destacado === c1.bloco,
        R + 'ROTEIROS a volta cai em Roteiros de peças com a peça reaberta no bloco ' + c3.destacado + ' (view=' + c3.view + ')');
      // um ctAbrirBloco VAZIO (a chave do quadro voltando a 'p:') não abre nada; o que não pode é levar o ponto
      const vazouC = c3.blocosRitos.filter(b => b.peca || b.rito || b.bloco != null).length;
      ok(c3.blocosPecas.some(b => b.peca === c0.peca) && vazouC === 0,
        R + 'ROTEIROS o ponto vai só ao pecas-web — o ritos-web escondido não recebe a peça (' + vazouC + ' ctAbrirBloco com ponto)');
    }
  }

  /* ===== D. PAINEL DE PRIORIDADE (disc) ===== */
  await V(() => window.__catedraGoView('prioridade'));
  const d0 = await V(async () => {
    const vo = window.__vo;
    const f = await vo.pronto('prioridade', (w, d) => !!d.querySelector('.linha .acoes [data-lei]'));
    if (!f) return { erro: 'o prioridade-web não mostrou linha com lei' };
    const linha = [...f.contentDocument.querySelectorAll('.linha')].find(l => l.querySelector('.acoes [data-lei]'));
    linha.setAttribute('data-vo-linha', '1'); vo.espiar('prioridade');
    return { disc: linha.dataset.d, aberta: linha.classList.contains('on') };
  });
  if (d0.erro) ok(false, R + 'PRIORIDADE ' + d0.erro);
  else {
    if (!d0.aberta) await clicar(noFrame('prioridade', '[data-vo-linha="1"] .lh'));
    const cD = await clicar(noFrame('prioridade', '[data-vo-linha="1"] .acoes [data-lei]'));
    const d1 = await V(async () => { const vo = window.__vo; await vo.naView('legis'); return { view: vo.app().state.view, de: vo.de() }; });
    ok(cD && d1.view === 'legis' && !!d1.de && d1.de.view === 'prioridade' && d1.de.disc === d0.disc && d1.de.rotulo === 'Voltar ao painel de prioridade',
      R + 'PRIORIDADE "Abrir a lei mais cobrada" grava {view:prioridade, disc} (' + JSON.stringify(d1.de) + ')');
    conferirPilula(ok, R, 'PRIORIDADE', 'legis', await V(() => window.__vo.pilula('legis')), 'Voltar ao painel de prioridade');
    // a linha recolhe no satélite escondido: a volta tem de reabri-la
    await V(() => { const vo = window.__vo, d = vo.fr('prioridade').contentDocument; const l = d.querySelector('[data-vo-linha="1"]');
      if (l && l.classList.contains('on')) l.querySelector('.lh').click(); vo.espiar('prioridade'); });
    const tD = await tocarPilula(page, 'legis');
    const d2 = await V(async (disc) => { const vo = window.__vo; await vo.naView('prioridade'); const d = vo.fr('prioridade').contentDocument;
      const linha = () => [...d.querySelectorAll('.linha')].find(l => l.dataset.d === disc);
      await vo.ate(() => linha() && linha().classList.contains('on'), 6000);
      const l = linha();
      return { view: vo.app().state.view, aberta: !!l && l.classList.contains('on'),
        aria: l && l.querySelector('.lh').getAttribute('aria-expanded'), blocos: vo.blocos('prioridade') }; }, d0.disc);
    ok(tD && d2.view === 'prioridade', R + 'PRIORIDADE o toque volta ao painel de prioridade (view=' + d2.view + ')');
    ok(d2.aberta && d2.aria === 'true' && d2.blocos.some(b => b.disc === d0.disc),
      R + 'PRIORIDADE …com a linha "' + d0.disc + '" reaberta (ctAbrirBloco {disc}; aria-expanded=' + d2.aria + ')');
  }

  /* ===== E. CORREÇÃO DA 2ª FASE (antes a volta caía em Processo e peças) ===== */
  if (origem === 'http') {
    await irPeloMenu('segundafase');
    const e0 = await V(async () => {
      const vo = window.__vo;
      const f = await vo.pronto('segundafase', (w, d) => !!d.querySelector('#qs .q [data-legis]'));
      if (!f) return { erro: 'a correção semeada não abriu com dispositivo do espelho' };
      const q = [...f.contentDocument.querySelectorAll('#qs .q')].find(x => x.querySelector('[data-legis]'));
      q.setAttribute('data-vo-q', '1');
      const on = q.querySelector('.ver button.on');
      const novo = ['atendeu', 'parcial', 'nao'].find(v => !on || on.dataset.v !== v);
      return { i: q.dataset.i, novo };
    });
    if (e0.erro) ok(false, R + '2ª FASE ' + e0.erro);
    else {
      // ela está NO MEIO da correção: muda um veredicto e só então abre o dispositivo
      await clicar(noFrame('segundafase', '[data-vo-q="1"] .ver button[data-v="' + e0.novo + '"]'));
      const cE = await clicar(noFrame('segundafase', '[data-vo-q="1"] [data-legis]'));
      const e1 = await V(async () => { const vo = window.__vo; await vo.naView('legis'); return { view: vo.app().state.view, de: vo.de() }; });
      ok(cE && e1.view === 'legis' && !!e1.de && e1.de.view === 'segundafase' && e1.de.rotulo === 'Voltar à correção',
        R + '2ª FASE o dispositivo do espelho grava {view:segundafase, "Voltar à correção"} (' + JSON.stringify(e1.de) + ')');
      conferirPilula(ok, R, '2ª FASE', 'legis', await V(() => window.__vo.pilula('legis')), 'Voltar à correção');
      const tE = await tocarPilula(page, 'legis');
      const e2 = await V(async ({ i, novo }) => { const vo = window.__vo; await vo.naView('segundafase', 6000);
        const d = vo.fr('segundafase').contentDocument, q = d.querySelector('#qs .q[data-i="' + i + '"]');
        return { view: vo.app().state.view, correcao: !!q, veredicto: q && (q.querySelector('.ver button.on') || {}).dataset,
          gravado: (JSON.parse(localStorage.getItem('catedraSegundaFase') || '{}').sessao || {}).veredictos }; }, e0);
      ok(tE && e2.view === 'segundafase', R + '2ª FASE o toque volta à 2ª fase, não a Processo e peças (view=' + e2.view + ')');
      ok(e2.correcao && e2.veredicto && e2.veredicto.v === e0.novo && e2.gravado && e2.gravado[e0.i] === e0.novo,
        R + '2ª FASE …com a correção aberta e o veredicto que ela tinha acabado de marcar (' + (e2.veredicto && e2.veredicto.v) + ')');
    }
  }

  /* ===== F. CICLO (cartão da atividade) ===== */
  await irPeloMenu('ciclo');
  const f0 = await V(async () => { const vo = window.__vo;
    const bt = await vo.ate(() => document.querySelector('.ct-bc-foco [aria-label^="Legislação"]'), 8000);
    return { tem: !!bt }; });
  if (!f0.tem) ok(false, R + 'CICLO o cartão da atividade de hoje mostra o botão de Legislação');
  else {
    await clicar(host('.ct-bc-foco [aria-label^="Legislação"]'));
    const f1 = await V(async () => { const vo = window.__vo; await vo.naView('legis'); return { view: vo.app().state.view, de: vo.de() }; });
    ok(f1.view === 'legis' && !!f1.de && f1.de.view === 'ciclo' && f1.de.disc === 'Direito Civil' && f1.de.rotulo === 'Voltar ao ciclo',
      R + 'CICLO a ida grava {view:ciclo, disc, "Voltar ao ciclo"} (' + JSON.stringify(f1.de) + ')');
    const pF = await V(() => window.__vo.pilula('legis'));
    conferirPilula(ok, R, 'CICLO', 'legis', pF, 'Voltar ao ciclo');
    const nomeF = await nomeAcessivel(page, 'legis', 'Voltar ao ciclo');
    ok(nomeF.n === 1 && nomeF.id === 'ct-volta' && nomeF.comSeta === 0,
      R + 'CICLO o nome acessível da pílula é só "Voltar ao ciclo" (getByRole acha ' + nomeF.n + ' botão, id=' + nomeF.id + '; com "←": ' + nomeF.comSeta + ')');
    ok(pF.primeiroFocavel, R + 'CICLO a pílula é o primeiro elemento focável do body do LEGIS (o primeiro é ' + pF.primeiro + ')');
    // uma ida qualquer e, já no LEGIS, ela abre uma lei no leitor: a volta não pode sumir atrás dele
    const lF = await V(async (CC) => { const vo = window.__vo, W = vo.fr('legis').contentWindow;
      if (typeof W.ctLeituraAbrir !== 'function') return { erro: 'o LEGIS não expõe ctLeituraAbrir' };
      W.ctLeituraAbrir({ leiId: CC, rot: 'Art. 1.239' });
      return { aberto: !!(await vo.ate(() => vo.leitor('legis').aberto, 6000)) }; }, CC);
    if (!lF.aberto) ok(false, R + 'CICLO + lei no leitor: o leitor do LEGIS abriu (' + (lF.erro || 'não abriu') + ')');
    else await medirComLeitor(page, ok, R, 'CICLO + lei no leitor', 'legis');
    // o toque de verdade, com o leitor ABERTO por cima de tudo
    const tF = await tocarPilula(page, 'legis');
    const f2 = await V(async () => { const vo = window.__vo; await vo.naView('ciclo');
      const c = await vo.ate(() => document.querySelector('.ct-bc-foco'), 6000);
      return { view: vo.app().state.view, cartao: !!c && /Direito Civil/.test(c.innerText || ''), foco: await vo.foco() }; });
    ok(tF && f2.view === 'ciclo' && f2.cartao, R + 'CICLO o toque (com o leitor aberto) volta ao Ciclo, com o cartão da atividade na tela');
    ok(!f2.foco.corpo && !f2.foco.iframe && f2.foco.id === 'ct-view-titulo',
      R + 'CICLO depois da volta o foco do host vai ao título da view de destino, não ao body (' + JSON.stringify(f2.foco) + ')');
    await fecharLeitorNoQuadro(page, 'legis');
  }

  /* ===== F2. TECLADO: Alt+← na pílula volta; dentro de um campo de texto, não ===== */
  if (f0.tem) {
    await clicar(host('.ct-bc-foco [aria-label^="Legislação"]'));
    await V(async () => { const vo = window.__vo; await vo.naView('legis'); await vo.pilula('legis'); });
    // dentro da busca do LEGIS, Option+← é "palavra anterior": não volta
    const campo = await V(() => { const d = window.__vo.fr('legis').contentDocument;
      const i = [...d.querySelectorAll('input[type=search], input[type=text], input:not([type])')].find(x => x.getClientRects().length > 0);
      if (!i) return false; i.focus(); return d.activeElement === i; });
    if (campo) {
      await page.keyboard.press('Alt+ArrowLeft');
      await page.waitForTimeout(500);
      ok((await V(() => window.__vo.app().state.view)) === 'legis', R + 'TECLADO Alt+← dentro do campo de busca do LEGIS não volta (é "palavra anterior")');
    }
    let focou = true;
    try { await page.frameLocator('iframe[data-ct-view="legis"]').locator('#ct-volta').focus({ timeout: 5000 }); } catch (_) { focou = false; }
    await page.keyboard.press('Alt+ArrowLeft');
    const k2 = await V(async () => { const vo = window.__vo; await vo.naView('ciclo', 5000);
      return { view: vo.app().state.view, de: vo.app().state.acervoDe, foco: await vo.foco() }; });
    ok(focou && k2.view === 'ciclo' && k2.de === null, R + 'TECLADO Alt+← com o foco na pílula volta ao Ciclo e apaga a origem (view=' + k2.view + ')');
    ok(!k2.foco.corpo && !k2.foco.iframe && k2.foco.id === 'ct-view-titulo',
      R + 'TECLADO depois do Alt+← o foco do host vai ao título da view de destino (' + JSON.stringify(k2.foco) + ')');
  }

  /* ===== F3. CONTRASTE da pílula com a cor de destaque trocada, no claro e no escuro =====
     K1 (rodada 3): a pílula pinta um par PRÓPRIO, var(--accentFill) com var(--onAccentFill),
     calculado no host por contraste WCAG e mandado por cópia (_temaTokens → tema-satelite.js).
     O --accent e o --onAccent do resto do app NÃO mudam por causa dela: o --accent é o hex
     escolhido (ou o do tema) e o --onAccent segue a régua antiga de luma — reescrevê-los
     derrubava o texto em cor de destaque no escuro (#d6457f ia a #a73663, 2,8:1). */
  if (f0.tem) {
    await clicar(host('.ct-bc-foco [aria-label^="Legislação"]'));
    await V(async () => { const vo = window.__vo; await vo.naView('legis'); await vo.pilula('legis'); });
    const fundos = {}, pares = {};
    const casos = [];
    for (const escuro of [false, true]) for (const acc of [null, '#84cc16', '#0d9488', '#d6457f']) casos.push({ dir: 'sutil', escuro, acc });
    // direções em que o par da pílula se afasta do --accent/--onAccent do app
    casos.push({ dir: 'aurora', escuro: false, acc: null }, { dir: 'holo', escuro: false, acc: null }, { dir: 'solar', escuro: true, acc: '#d6457f' });
    for (const { dir, escuro, acc } of casos) {
      // como setAccent/toggleDark/onDir: muda o estado e avisa os satélites (_temaBroadcast)
      await V(({ dir, acc, escuro }) => { const app = window.__vo.app(); app.setState({ dir, accent: acc, darkMode: escuro }, () => app._temaBroadcast()); }, { dir, acc, escuro });
      // espera o par chegar ao satélite E à pílula (não um tempo fixo)
      await V(async () => { const vo = window.__vo; await vo.w(200);
        const t0 = Date.now();
        while (Date.now() - t0 < 4000) {
          const t = vo.tokens('legis'), p = await vo.pilula('legis');
          if (t.sat && t.host['--accentFill'] && t.sat['--accentFill'] === t.host['--accentFill'] && t.sat['--accent'] === t.host['--accent'] && p.visivel) {
            const bg = (p.fundo || '').match(/\d+(\.\d+)?/g) || [];
            const hx = t.host['--accentFill'].replace('#', ''); const want = hx.length === 6 ? [0, 2, 4].map(i => parseInt(hx.slice(i, i + 2), 16)) : null;
            if (want && bg.length >= 3 && want.every((x, i) => Math.abs(x - Number(bg[i])) <= 1)) break;
          }
          await vo.w(100);
        }
        await vo.w(150); });
      const p = await V(() => window.__vo.pilula('legis'));
      const t = await V(() => window.__vo.tokens('legis'));
      const H = t.host, S = t.sat || {};
      const nome = dir + ' · ' + (acc || 'destaque padrão') + (escuro ? ' no escuro' : ' no claro');
      if (dir === 'sutil') fundos[(acc || 'padrão do tema') + (escuro ? ' no escuro' : ' no claro')] = p.fundo;
      pares[nome] = { fill: H['--accentFill'], onFill: H['--onAccentFill'], accent: H['--accent'], onAccent: H['--onAccent'], solid: H['--accentSolid'] };
      const [fg, bg] = String(p.cores || '').split(' / ');
      ok(p.visivel && p.contraste >= 4.5, R + 'CONTRASTE pílula ' + nome + ': texto ' + p.contraste + ':1 (' + p.cores + ')');
      ok(mesmaCor(bg, H['--accentFill']) && mesmaCor(fg, H['--onAccentFill']) && S['--accentFill'] === H['--accentFill'] && S['--onAccentFill'] === H['--onAccentFill'],
        R + 'CONTRASTE pílula ' + nome + ': pinta o par --accentFill/--onAccentFill que o host calculou e mandou ao LEGIS (host ' + H['--accentFill'] + '/' + H['--onAccentFill']
        + ', no LEGIS ' + S['--accentFill'] + '/' + S['--onAccentFill'] + ', pintado ' + p.cores + ')');
      const borda = contrasteDe(H['--accentFill'], H['--surface']);
      ok(borda >= 3, R + 'CONTRASTE pílula ' + nome + ': o fundo se destaca da --surface por ≥ 3:1 (' + borda + ':1 — ' + H['--accentFill'] + ' sobre ' + H['--surface'] + ')');
      // K1: o destaque do app é o escolhido (ou o do tema) — a pílula não o reescreve. O
      // --onAccent deixou a régua de luma (tests/contraste-destaque.mjs mede o texto sobre o
      // --accentSolid em cada componente); aqui basta que ele passe sobre o fundo que o carrega.
      const accEsperado = acc || t.tema.accent;
      const onSobreSolid = contrasteDe(H['--onAccent'], H['--accentSolid']);
      ok(mesmaCor(H['--accent'], accEsperado) && S['--accent'] === H['--accent'] && onSobreSolid >= 4.5,
        R + 'CONTRASTE ' + nome + ': a pílula NÃO reescreve o --accent do app (host ' + H['--accent'] + ', esperado ' + accEsperado
        + '; no LEGIS --accent=' + S['--accent'] + ') e o --onAccent passa sobre o --accentSolid (' + onSobreSolid + ':1)');
    }
    const claros = ['padrão do tema no claro', '#84cc16 no claro', '#0d9488 no claro', '#d6457f no claro'].map(k => fundos[k]);
    ok(new Set(claros).size === 4, R + 'CONTRASTE o destaque escolhido chega mesmo à pílula (quatro fundos diferentes no claro: ' + claros.join(' | ') + ')');
    // o par é da pílula: onde o destaque cru não dá 4,5:1, o fundo ou o texto dela divergem do
    // --accent/--onAccent — e esses continuam os de antes (casos acima)
    const lima = pares['sutil · #84cc16 no claro'] || {}, aur = pares['aurora · destaque padrão no claro'] || {};
    // o par da pílula também exige 3:1 contra a --surface, então não é o par dos botões
    // (--accentSolid/--onAccent): no Aurora claro a pílula fica no ciano cru com texto escuro,
    // e os botões, no ciano escurecido com texto branco
    ok(!mesmaCor(lima.fill, lima.accent) && !(mesmaCor(aur.fill, aur.solid) && mesmaCor(aur.onFill, aur.onAccent)),
      R + 'CONTRASTE o par da pílula é próprio: #84cc16 no claro tem fundo ' + lima.fill + ' (≠ --accent ' + lima.accent + '), aurora no claro pinta '
      + aur.fill + '/' + aur.onFill + ' (≠ par dos botões ' + aur.solid + '/' + aur.onAccent + ')');
    await V(() => { const app = window.__vo.app(); app.setState({ dir: 'sutil', accent: null, darkMode: false }, () => app._temaBroadcast()); });
    await page.waitForTimeout(600);
    await tocarPilula(page, 'legis');
    await V(() => window.__vo.naView('ciclo'));
  }

  /* ===== F4. COR LIVRE (o seletor de cor dos Ajustes) chega ao LEGIS aberto =====
     setAccentColor fazia só setState({accent}): o host trocava e o LEGIS vivo seguia com o
     destaque antigo (e a pílula também). Agora avisa os satélites, como setAccent. */
  {
    const livre = '#e0457b';
    const a0 = await V(async () => { const vo = window.__vo; window.__catedraGoView('legis'); await vo.naView('legis');
      await vo.pronto('legis', w => typeof w.ctEnviarAoHost === 'function');
      await vo.ate(() => { const t = vo.tokens('legis'); return t.sat && t.sat['--accent'] === t.host['--accent']; }, 5000);
      const t = vo.tokens('legis');
      window.__catedraGoView('ajustes'); await vo.naView('ajustes'); vo.app().setState({ ajTab: 'aparencia', ajSec: 'aparencia' });
      const inp = await vo.ate(() => document.querySelector('#dc-root [data-aj^="cor destaque"] input[type=color]'), 6000);
      return { antes: t.sat && t.sat['--accent'], fillAntes: t.sat && t.sat['--accentFill'], view: vo.app().state.view, input: !!inp }; });
    let preencheu = false;
    if (a0.input) { try { await page.locator('#dc-root [data-aj^="cor destaque"] input[type=color]').first().fill(livre, { timeout: 6000 }); preencheu = true; } catch (_) {} }
    const a1 = await V(async (livre) => { const vo = window.__vo;
      await vo.ate(() => { const t = vo.tokens('legis'); return t.sat && t.sat['--accent'] === livre; }, 5000);
      const t = vo.tokens('legis');
      return { estado: vo.app().state.accent, host: t.host['--accent'], sat: t.sat && t.sat['--accent'], fill: t.sat && t.sat['--accentFill'], hostFill: t.host['--accentFill'],
        legisVivo: !!vo.fr('legis') }; }, livre);
    ok(a0.input && preencheu && a1.estado === livre && a1.host === livre, R + 'COR LIVRE o seletor de cor dos Ajustes troca o destaque do host (view ' + a0.view + ', seletor: ' + a0.input + ', preencheu: ' + preencheu + ', estado: ' + a1.estado + ', --accent ' + a1.host + ')');
    ok(a1.legisVivo && a0.antes !== livre && a1.sat === livre && a1.fill === a1.hostFill && a1.fill !== a0.fillAntes,
      R + 'COR LIVRE o LEGIS aberto (vivo atrás dos Ajustes) recebe o destaque novo e o par da pílula (--accent ' + a0.antes + ' → ' + a1.sat + ', --accentFill ' + a0.fillAntes + ' → ' + a1.fill + ')');
    await V(async () => { const vo = window.__vo, app = vo.app(); app.setState({ accent: null }, () => app._temaBroadcast()); window.__catedraGoView('ciclo'); await vo.naView('ciclo'); await vo.w(400); });
  }

  /* ===== L. PÍLULA VELHA: menu e notificação não acendem a volta de outra tela ===== */
  {
    await clicar(host('.ct-bc-foco [aria-label^="Legislação"]'));
    const l0 = await V(async () => { const vo = window.__vo; await vo.naView('legis'); return { de: vo.de(), p: await vo.pilula('legis') }; });
    await irPeloMenu('inicio');
    await V(() => window.__vo.naView('inicio'));
    const menuLegis = await clicar(host('button[data-view="legis"]'));
    const l1 = await V(async () => { const vo = window.__vo; await vo.naView('legis'); await vo.w(500);
      const f = vo.fr('legis'), x = f && f.contentDocument && f.contentDocument.getElementById('ct-volta');
      return { view: vo.app().state.view, de: vo.app().state.acervoDe, display: x ? f.contentWindow.getComputedStyle(x).display : '(sem pílula)' }; });
    ok(!!l0.de && l0.p.visivel, R + 'PÍLULA VELHA antes: a ida do ciclo acende a pílula');
    ok(menuLegis && l1.view === 'legis' && l1.de === null && l1.display === 'none',
      R + 'PÍLULA VELHA o menu → LEGIS apaga a origem e esconde a pílula (acervoDe=' + JSON.stringify(l1.de) + ', display=' + l1.display + ')');
    // a notificação / "escape global" (window.__catedraGoView) passa pelo mesmo _irPara
    await irPeloMenu('ciclo');
    await clicar(host('.ct-bc-foco [aria-label^="Legislação"]'));
    const l2 = await V(async () => { const vo = window.__vo; await vo.naView('legis'); const antes = !!vo.app().state.acervoDe;
      window.__catedraGoView('juris'); await vo.naView('juris'); await vo.pronto('juris', null, 30000); await vo.w(500);
      const f = vo.fr('juris'), x = f && f.contentDocument && f.contentDocument.getElementById('ct-volta');
      return { antes, de: vo.app().state.acervoDe, display: x ? f.contentWindow.getComputedStyle(x).display : '(sem pílula)' }; });
    ok(l2.antes && l2.de === null && (l2.display === 'none' || l2.display === '(sem pílula)'),
      R + 'PÍLULA VELHA a troca por __catedraGoView (notificação) também não herda a origem (display=' + l2.display + ')');
  }

  /* ===== INÍCIO: "O que mudou esta semana" → JURIS tem volta ao Início (pedido da dona, 25/09) ===== */
  {
    await irPeloMenu('inicio');
    await V(() => window.__vo.naView('inicio'));
    const temCartao = await V(async () => { const vo = window.__vo;
      await vo.ate(() => !!document.querySelector('#dc-root button[data-t][onclick], #dc-root #ct-semana'), 6000);
      return !![...document.querySelectorAll('#dc-root button')].find(b => (b.textContent || '').trim() === 'Abrir no JURIS' && b.dataset.t); });
    if (!temCartao) ok(false, R + 'INÍCIO o cartão "O que mudou esta semana" oferece "Abrir no JURIS" (sem itens da semana no acervo gerado)');
    else {
      const abriu = await clicar(page.locator('#dc-root button[data-t]', { hasText: 'Abrir no JURIS' }).first());
      const i1 = await V(async () => { const vo = window.__vo; await vo.naView('juris'); await vo.pronto('juris', null, 30000); await vo.w(500);
        return { view: vo.app().state.view, de: vo.de() }; });
      ok(abriu && i1.view === 'juris' && !!i1.de && i1.de.view === 'inicio' && i1.de.rotulo === 'Voltar ao Início',
        R + 'INÍCIO "Abrir no JURIS" da semana grava {view:inicio, "Voltar ao Início"} (' + JSON.stringify(i1.de) + ')');
      conferirPilula(ok, R, 'INÍCIO', 'juris', await V(() => window.__vo.pilula('juris')), 'Voltar ao Início');
      const tocou = await tocarPilula(page, 'juris');
      const i2 = await V(async () => { const vo = window.__vo; await vo.naView('inicio'); await vo.w(300);
        return { view: vo.app().state.view, de: vo.app().state.acervoDe }; });
      ok(tocou && i2.view === 'inicio' && i2.de === null, R + 'INÍCIO o toque na pílula volta ao Início e apaga a origem (view=' + i2.view + ')');
    }
  }

  /* ===== G/H. REVISÕES: pela lista e pela sessão guiada ===== */
  await V(async () => {
    const app = window.__vo.app(), hoje = app._hoje(), agora = Date.now();
    const b = { color: 'var(--accent)', intervalo: 1, facilidade: 2.5, repeticoes: 0, dueDate: hoje, up: agora };
    app.setState({ revSession: null, reviews: [
      { ...b, id: 'rv-a', disc: 'Direito Civil', topic: 'Primeiro item, sem referência', due: -2 },
      { ...b, id: 'rv-b', disc: 'Direito Constitucional', topic: 'Segundo item, com tema', ref: 'Tema 698', due: -1 },
      { ...b, id: 'rv-c', disc: 'Direito Processual Civil', topic: 'Terceiro item, com artigo', ref: 'Art. 525 do CPC', due: 0 }] });
    await window.__vo.w(400);
  });
  await irPeloMenu('revisoes');
  const g0 = await V(async () => !!(await window.__vo.ate(() => [...document.querySelectorAll('#dc-root button')].find(b => (b.textContent || '').trim() === 'Abrir no LEGIS'), 8000)));
  if (!g0) ok(false, R + 'REVISÃO a lista oferece "Abrir no LEGIS"');
  else {
    await clicar(page.locator('#dc-root button', { hasText: /^\s*Abrir no LEGIS\s*$/ }));
    const g1 = await V(async () => { const vo = window.__vo; await vo.naView('legis'); return { view: vo.app().state.view, de: vo.de(), busca: vo.app().state.acervoBusca }; });
    ok(g1.view === 'legis' && g1.busca === 'Art. 525 do CPC' && !!g1.de && g1.de.view === 'revisoes' && g1.de.rotulo === 'Voltar às revisões' && !g1.de.rev,
      R + 'REVISÃO pela lista: a ida grava {view:revisoes, "Voltar às revisões"} (' + JSON.stringify(g1.de) + ')');
    conferirPilula(ok, R, 'REVISÃO lista', 'legis', await V(() => window.__vo.pilula('legis')), 'Voltar às revisões');
    const tG = await tocarPilula(page, 'legis');
    const g2 = await V(async () => { const vo = window.__vo; await vo.naView('revisoes');
      return { view: vo.app().state.view, lista: !!(await vo.ate(() => [...document.querySelectorAll('#dc-root button')].some(b => (b.textContent || '').trim() === 'Abrir no LEGIS'), 5000)),
        foco: await vo.foco() }; });
    ok(tG && g2.view === 'revisoes' && g2.lista, R + 'REVISÃO pela lista: o toque volta à fila de revisões');
    ok(!g2.foco.corpo && g2.foco.acervoRev && g2.foco.dataId === 'rv-c',
      R + 'REVISÃO pela lista: o foco volta ao botão "Abrir no LEGIS" do item de onde ela saiu (' + JSON.stringify(g2.foco) + ')');
    // o furo era o foco chegar e se perder: uns milissegundos depois o <sc-for> trocava o botão
    // e o foco caía no <body>. ~700 ms depois (o vigia do host dura 600 ms) ele tem de continuar lá.
    const g3 = await V(async () => { await window.__vo.w(700); const a = document.activeElement;
      return { tag: a ? a.tagName : '-', corpo: !a || a === document.body, conectado: !!a && a.isConnected,
        dataId: (a && a.dataset && a.dataset.id) || '', acervoRev: !!(a && a.dataset && a.dataset.acervoRev), texto: ((a && a.textContent) || '').trim().slice(0, 30) }; });
    ok(!g3.corpo && g3.conectado && g3.acervoRev && g3.dataId === 'rv-c',
      R + 'REVISÃO pela lista: ~700 ms depois o foco AINDA está no botão de origem, conectado ao DOM — não caiu no body com o re-render (' + JSON.stringify(g3) + ')');
  }
  const h0 = await V(async () => {
    const vo = window.__vo, app = vo.app();
    const comecar = await vo.ate(() => [...document.querySelectorAll('#dc-root button')].find(b => /^Começar/.test((b.textContent || '').trim()) && !b.disabled), 6000);
    if (comecar) comecar.click(); else app.startRevSession();
    await vo.ate(() => app.state.revSession, 4000);
    // ela anda até o 2º item e revela a resposta: é esse o ponto exato
    while (app.state.revSession && app.state.revSession.queue[app.state.revSession.idx] !== 'rv-b' && app.state.revSession.idx < 5) { app.revSkip(); await vo.w(150); }
    app.revReveal(); await vo.w(300);
    const dlg = document.querySelector('[role="dialog"][aria-label="Sessão de revisão"]');
    const bt = dlg && [...dlg.querySelectorAll('button')].find(x => (x.textContent || '').trim() === 'Abrir no JURIS');
    if (!bt) return { erro: 'a sessão guiada não oferece "Abrir no JURIS" no item com tema' };
    bt.setAttribute('data-vo-rev', '1');
    return { antes: JSON.parse(JSON.stringify(app.state.revSession)) };
  });
  if (h0.erro) ok(false, R + 'REVISÃO guiada ' + h0.erro);
  else {
    await clicar(page.locator('[data-vo-rev="1"]'));
    const h1 = await V(async () => { const vo = window.__vo; await vo.naView('juris');
      return { view: vo.app().state.view, de: vo.de(), sessao: vo.app().state.revSession,
        modal: !!document.querySelector('[role="dialog"][aria-label="Sessão de revisão"]') }; });
    ok(h1.view === 'juris' && h1.sessao === null && !h1.modal, R + 'REVISÃO guiada: a ida abre o JURIS e o modal não fica por cima do acervo');
    ok(!!h1.de && h1.de.view === 'revisoes' && h1.de.rotulo === 'Voltar à revisão' && !!h1.de.rev && h1.de.rev.idx === h0.antes.idx
      && JSON.stringify(h1.de.rev.queue) === JSON.stringify(h0.antes.queue) && h1.de.rev.revealed === true,
      R + 'REVISÃO guiada: a origem leva o retrato da sessão (fila, item ' + (h1.de && h1.de.rev && h1.de.rev.idx) + ', revelado)');
    conferirPilula(ok, R, 'REVISÃO guiada', 'juris', await V(() => window.__vo.pilula('juris')), 'Voltar à revisão');
    const tH = await tocarPilula(page, 'juris');
    const h2 = await V(async () => { const vo = window.__vo; await vo.naView('revisoes');
      const dlg = await vo.ate(() => document.querySelector('[role="dialog"][aria-label="Sessão de revisão"]'), 5000);
      return { view: vo.app().state.view, sessao: vo.app().state.revSession, texto: dlg ? dlg.innerText : '', foco: await vo.foco() }; });
    const s = h2.sessao || {};
    ok(!h2.foco.corpo && !h2.foco.iframe && h2.foco.noDialogo,
      R + 'REVISÃO guiada: depois da volta o foco está dentro da sessão reaberta, não no body (' + JSON.stringify(h2.foco) + ')');
    ok(tH && h2.view === 'revisoes' && !!h2.sessao, R + 'REVISÃO guiada: o toque volta a Revisões com a sessão aberta');
    ok(s.idx === h0.antes.idx && (s.queue || [])[s.idx] === 'rv-b' && s.revealed === true && JSON.stringify(s.queue) === JSON.stringify(h0.antes.queue)
      && /Segundo item, com tema/.test(h2.texto),
      R + 'REVISÃO guiada: …no MESMO item, com a resposta revelada (idx=' + s.idx + ', item=' + ((s.queue || [])[s.idx]) + ')');
    await V(() => window.__vo.app().closeRevSession());
  }

  /* ===== I. PROVA ORAL — "Ler ativamente no LEGIS" ===== */
  await V(() => window.__catedraGoView('oral'));
  const i0 = await V(async (CC) => {
    const vo = window.__vo, app = vo.app();
    const aba = await vo.ate(() => document.querySelector('#dc-root button[data-m="lei"]'), 8000);
    if (!aba) return { erro: 'a prova oral não tem a aba de lei seca' };
    aba.click(); await vo.w(300);
    app.setState({ oralArt: { sigla: 'CC', nome: 'Código Civil', url: CC, rot: 'Art. 1.239', txt: 'Aquele que possua como sua, por cinco anos ininterruptos…' },
      oralArtVariante: 0, oralPergunta: 'O que o art. 1.239 do Código Civil exige?', oralResposta: 'Rascunho da arguição em curso', oralCorrecao: null });
    const bt = await vo.ate(() => [...document.querySelectorAll('#dc-root button')].find(b => /Ler ativamente no LEGIS/.test(b.textContent || '')), 8000);
    return bt ? {} : { erro: 'o artigo sorteado não mostrou "Ler ativamente no LEGIS"' };
  }, CC);
  if (i0.erro) ok(false, R + 'ORAL ' + i0.erro);
  else {
    await clicar(page.locator('#dc-root button', { hasText: 'Ler ativamente no LEGIS' }));
    const i1 = await V(async () => { const vo = window.__vo; await vo.naView('legis'); return { view: vo.app().state.view, de: vo.de() }; });
    ok(i1.view === 'legis' && !!i1.de && i1.de.view === 'oral' && i1.de.rotulo === 'Voltar à prova oral',
      R + 'ORAL a ida grava {view:oral, "Voltar à prova oral"} (' + JSON.stringify(i1.de) + ')');
    // o "Ler ativamente" abre o LEGIS já no leitor: a pílula tem de continuar ao alcance ali
    const lI = await V(async () => { const vo = window.__vo; return !!(await vo.ate(() => vo.leitor('legis').aberto, 6000)); });
    ok(lI, R + 'ORAL o "Ler ativamente" abre o LEGIS já no leitor da lei');
    conferirPilula(ok, R, 'ORAL (leitor aberto)', 'legis', await V(() => window.__vo.pilula('legis')), 'Voltar à prova oral');
    if (lI) await medirComLeitor(page, ok, R, 'ORAL', 'legis');
    // o toque de verdade com o leitor ABERTO (antes ela precisava fechar o leitor para achar a volta)
    const tI = await tocarPilula(page, 'legis');
    const i2 = await V(async () => { const vo = window.__vo, app = vo.app(); await vo.naView('oral');
      const bt = await vo.ate(() => [...document.querySelectorAll('#dc-root button')].find(b => /Ler ativamente no LEGIS/.test(b.textContent || '')), 5000);
      return { view: app.state.view, rot: app.state.oralArt && app.state.oralArt.rot, resposta: app.state.oralResposta, botao: !!bt }; });
    ok(tI && i2.view === 'oral' && i2.rot === 'Art. 1.239' && i2.resposta === 'Rascunho da arguição em curso' && i2.botao,
      R + 'ORAL o toque (com o leitor aberto) volta à prova oral com o artigo sorteado e o rascunho da resposta intactos');
    await fecharLeitorNoQuadro(page, 'legis');
  }

  /* ===== J. SIMULADO MISTO — "Ler ativamente" no gabarito ===== */
  await V(() => window.__catedraGoView('simulados'));
  const j0 = await V(async (CC) => {
    const vo = window.__vo, app = vo.app(); await vo.naView('simulados');
    const itens = [
      { id: 'lei|CC|1239', origem: 'lei', enunciado: 'Aquele que possua como sua por dez anos.', certo: false, original: 'Aquele que possua como sua por cinco anos.',
        trocaDe: 'cinco', trocaPara: 'dez', ref: 'Código Civil · Art. 1.239', ramo: 'Código Civil', tema: 'Art. 1.239', url: CC, contexto: 'x' },
      { id: 'lei|CC|1240', origem: 'lei', enunciado: 'Outro dispositivo, correto.', certo: true, original: 'Outro dispositivo, correto.',
        ref: 'Código Civil · Art. 1.240', ramo: 'Código Civil', tema: 'Art. 1.240', url: CC, contexto: 'y' }];
    const resp = { 'lei|CC|1239': true, 'lei|CC|1240': true };
    app.setState({ sjModo: 'misto', sjAberto: true, sjPronto: true, sjItens: itens, sjResp: resp, sjAtual: 0, sjFim: false, sjIni: Date.now() - 60000 });
    await vo.ate(() => app.state.sjAberto && (app.state.sjItens || []).length === 2, 5000);
    app.encerrarSj();
    const bt = await vo.ate(() => [...document.querySelectorAll('#dc-root button')].find(b => /^Ler ativamente$/.test((b.textContent || '').trim())), 8000);
    return bt ? { rel: app.state.sjRel ? 1 : 0 } : { erro: 'o gabarito não mostrou "Ler ativamente" no item errado' };
  }, CC);
  if (j0.erro) ok(false, R + 'SIMULADO ' + j0.erro);
  else {
    await clicar(page.locator('#dc-root button', { hasText: /^\s*Ler ativamente\s*$/ }));
    const j1 = await V(async () => { const vo = window.__vo; await vo.naView('legis'); return { view: vo.app().state.view, de: vo.de() }; });
    ok(j1.view === 'legis' && !!j1.de && j1.de.view === 'simulados' && j1.de.rotulo === 'Voltar ao simulado',
      R + 'SIMULADO a ida grava {view:simulados, "Voltar ao simulado"} (' + JSON.stringify(j1.de) + ')');
    const lJ = await V(async () => { const vo = window.__vo; return !!(await vo.ate(() => vo.leitor('legis').aberto, 6000)); });
    ok(lJ, R + 'SIMULADO o "Ler ativamente" do gabarito abre o LEGIS já no leitor da lei');
    conferirPilula(ok, R, 'SIMULADO (leitor aberto)', 'legis', await V(() => window.__vo.pilula('legis')), 'Voltar ao simulado');
    if (lJ) await medirComLeitor(page, ok, R, 'SIMULADO', 'legis');
    // o toque de verdade a 390 px, com o leitor aberto e o toast do gabarito já apagado
    const tJ = await tocarA390SemToast(page, ok, R, 'SIMULADO (leitor aberto)', 'legis');
    const j2 = await V(async () => { const vo = window.__vo, app = vo.app(); await vo.naView('simulados');
      const bt = await vo.ate(() => [...document.querySelectorAll('#dc-root button')].find(b => /^Ler ativamente$/.test((b.textContent || '').trim())), 5000);
      return { view: app.state.view, fim: app.state.sjFim, itens: (app.state.sjItens || []).length, botao: !!bt }; });
    ok(tJ && j2.view === 'simulados' && j2.fim === true && j2.itens === 2 && j2.botao,
      R + 'SIMULADO o toque (com o leitor aberto, a 390 px) volta ao gabarito do simulado, com a correção intacta');
    await fecharLeitorNoQuadro(page, 'legis');
  }

  /* ===== K. MODO ENAM — "Ver no JURIS" e "Estudar esta área" na correção ===== */
  await V(() => window.__catedraGoView('simulados'));
  const k0 = await V(async () => {
    const vo = window.__vo, app = vo.app(); await vo.naView('simulados');
    const area = { area: 'administrativo', nome: 'Direito Administrativo', ok: 1, cota: 6, alvo: 4, alvoInt: 4, deficit: 3 };
    app.setState({ sjModo: 'enam', sjAberto: true, sjFim: true, sjAtual: 0, sjIni: Date.now() - 60000,
      sjItens: [{ id: 'enam-1', origem: 'enam', enunciado: 'Questão sintética do ENAM.', alternativas: ['A', 'B', 'C', 'D'], certo: 'A', refs: ['Tema 698', 'Art. 1.239 do CC'] }],
      sjResp: { 'enam-1': 'B' },
      enamCor: { acertos: 1, total: 80, meta: 48, margem: -47, habilitaria: false, brancos: 0, erros: 79, respondidas: 80,
        segPorQuestao: 90, segDisponivel: 180, foraDoEnam: 0, comPausa: false, anuladas: 0, porAreaEdital: [area], porArea: [area] } });
    const ver = await vo.ate(() => [...document.querySelectorAll('#dc-root button')].find(b => /Tema 698 · Ver no JURIS/.test(b.textContent || '')), 6000);
    const est = [...document.querySelectorAll('#dc-root button')].find(b => /Estudar esta área/.test(b.textContent || ''));
    return { ver: !!ver, est: !!est };
  });
  if (!k0.ver) ok(false, R + 'ENAM a correção mostra "Tema 698 · Ver no JURIS"');
  else {
    await clicar(page.locator('#dc-root button', { hasText: 'Tema 698 · Ver no JURIS' }));
    const k1 = await V(async () => { const vo = window.__vo; await vo.naView('juris'); return { view: vo.app().state.view, de: vo.de() }; });
    ok(k1.view === 'juris' && !!k1.de && k1.de.view === 'simulados' && k1.de.rotulo === 'Voltar ao simulado',
      R + 'ENAM "Ver no JURIS" grava {view:simulados, "Voltar ao simulado"} (' + JSON.stringify(k1.de) + ')');
    conferirPilula(ok, R, 'ENAM', 'juris', await V(() => window.__vo.pilula('juris')), 'Voltar ao simulado');
    // no JURIS ela abre um verbete: o leitor de verbete (#jrdr) não pode engolir a volta
    const vK = await V(async () => { const vo = window.__vo, f = vo.fr('juris'), W = f.contentWindow;
      // o acervo carrega por <script>: tenta abrir o 1º verbete do filtro até a lista existir
      await vo.ate(() => { if (typeof W.openVerbete !== 'function') return false; try { W.openVerbete(0); } catch (_) {} return vo.leitor('juris').aberto; }, 20000);
      if (!vo.leitor('juris').aberto) {
        // a busca do ENAM pode não ter resultado nesta cópia do acervo: limpa e abre o primeiro verbete
        try { const q = W.document.querySelector('#q, input[type=search]'); if (q) { q.value = ''; q.dispatchEvent(new W.Event('input', { bubbles: true })); } } catch (_) {}
        await vo.w(800); try { W.openVerbete(0); } catch (_) {}
      }
      return { aberto: !!(await vo.ate(() => vo.leitor('juris').aberto, 4000)) }; });
    if (!vK.aberto) ok(false, R + 'ENAM + verbete no leitor: o leitor do JURIS abriu');
    else await medirComLeitor(page, ok, R, 'ENAM + verbete no leitor do JURIS', 'juris');
    const tK = vK.aberto ? await tocarA390SemToast(page, ok, R, 'ENAM + verbete no leitor do JURIS', 'juris') : await tocarPilula(page, 'juris');
    const k2 = await V(async () => { const vo = window.__vo, app = vo.app(); await vo.naView('simulados');
      return { view: app.state.view, modo: app.state.sjModo, fim: app.state.sjFim, cor: !!app.state.enamCor }; });
    ok(tK && k2.view === 'simulados' && k2.modo === 'enam' && k2.fim === true && k2.cor,
      R + 'ENAM o toque' + (vK.aberto ? ' (com o verbete aberto, a 390 px)' : '') + ' volta à correção do ENAM (modo, fim e resultado intactos)');
    await fecharLeitorNoQuadro(page, 'juris');
    // "Ler no LEGIS" num artigo do gabarito: o LEGIS abre já no leitor
    const temLer = await V(async () => !!(await window.__vo.ate(() => [...document.querySelectorAll('#dc-root button')].find(b => /Art\. 1\.239 do CC · Ler no LEGIS/.test(b.textContent || '')), 6000)));
    if (!temLer) ok(false, R + 'ENAM a correção mostra "Art. 1.239 do CC · Ler no LEGIS"');
    else {
      await clicar(page.locator('#dc-root button', { hasText: 'Art. 1.239 do CC · Ler no LEGIS' }));
      const kL = await V(async () => { const vo = window.__vo; await vo.naView('legis');
        return { view: vo.app().state.view, de: vo.de(), aberto: !!(await vo.ate(() => vo.leitor('legis').aberto, 6000)) }; });
      ok(kL.view === 'legis' && !!kL.de && kL.de.view === 'simulados' && kL.de.rotulo === 'Voltar ao simulado' && kL.aberto,
        R + 'ENAM "Ler no LEGIS" abre o leitor e grava a volta ao simulado (' + JSON.stringify(kL.de) + ', leitor aberto: ' + kL.aberto + ')');
      conferirPilula(ok, R, 'ENAM "Ler no LEGIS" (leitor aberto)', 'legis', await V(() => window.__vo.pilula('legis')), 'Voltar ao simulado');
      if (kL.aberto) await medirComLeitor(page, ok, R, 'ENAM "Ler no LEGIS"', 'legis');
      const tL = kL.aberto ? await tocarA390SemToast(page, ok, R, 'ENAM "Ler no LEGIS" (leitor aberto)', 'legis') : await tocarPilula(page, 'legis');
      const kL2 = await V(async () => { const vo = window.__vo, app = vo.app(); await vo.naView('simulados');
        return { view: app.state.view, modo: app.state.sjModo, fim: app.state.sjFim }; });
      ok(tL && kL2.view === 'simulados' && kL2.modo === 'enam' && kL2.fim === true,
        R + 'ENAM "Ler no LEGIS": o toque com o leitor aberto (a 390 px) volta à correção do ENAM');
      await fecharLeitorNoQuadro(page, 'legis');
    }
    if (k0.est) {
      await clicar(page.locator('#dc-root button', { hasText: 'Estudar esta área' }));
      const k3 = await V(async () => { const vo = window.__vo; await vo.naView('legis'); return { view: vo.app().state.view, de: vo.de(), p: await vo.pilula('legis') }; });
      ok(k3.view === 'legis' && !!k3.de && k3.de.view === 'simulados' && k3.p.visivel && k3.p.texto === 'Voltar ao simulado',
        R + 'ENAM "Estudar esta área" também leva a volta ao simulado (' + JSON.stringify(k3.de) + ', pílula: "' + k3.p.texto + '")');
      await fecharLeitor(page);
      await tocarPilula(page, 'legis');
      await V(() => window.__vo.naView('simulados'));
    } else ok(false, R + 'ENAM a correção mostra "Estudar esta área" em "Onde faltou"');

    /* K2. Alt+← com o LEITOR do JURIS aberto: volta ao simulado e NÃO troca o verbete.
       As setas do leitor (←/→ = verbete anterior/próximo) ouviam também o Alt+←: ela saía do
       JURIS e, escondido, o leitor passava ao verbete anterior. */
    await clicar(page.locator('#dc-root button', { hasText: 'Tema 698 · Ver no JURIS' }));
    const x0 = await V(async () => { const vo = window.__vo; await vo.naView('juris'); await vo.pilula('juris');
      const W = vo.fr('juris').contentWindow, D = W.document;
      const tit = () => (D.getElementById('jrTitle') || {}).textContent || '';
      // um verbete com anterior (índice ≥ 1), para o "anterior" poder acontecer
      const abrir = i => { try { W.openVerbete(i); } catch (_) {} return vo.leitor('juris').aberto; };
      let ok1 = await vo.ate(() => typeof W.openVerbete === 'function' && abrir(1) && tit(), 15000);
      if (!ok1) { try { const q = D.querySelector('#q, input[type=search]'); if (q) { q.value = ''; q.dispatchEvent(new W.Event('input', { bubbles: true })); } } catch (_) {}
        await vo.w(800); ok1 = await vo.ate(() => abrir(1) && tit(), 6000); }
      if (!ok1) return { erro: 'o leitor do JURIS não abriu um verbete com anterior' };
      const t1 = tit(); abrir(0); const t0 = tit(); abrir(1);
      await vo.ate(() => tit() === t1, 2000);
      return { t1, t0, agora: tit(), de: vo.de() }; });
    if (x0.erro) ok(false, R + 'ALT+← JURIS ' + x0.erro);
    else {
      let focou = true;
      try { await page.frameLocator('iframe[data-ct-view="juris"]').locator('#jrClose').focus({ timeout: 5000 }); } catch (_) { focou = false; }
      await page.keyboard.press('Alt+ArrowLeft');
      const x1 = await V(async () => { const vo = window.__vo; await vo.naView('simulados', 5000); await vo.w(400);
        const D = vo.fr('juris').contentDocument;
        return { view: vo.app().state.view, de: vo.app().state.acervoDe, tit: (D.getElementById('jrTitle') || {}).textContent || '', aberto: vo.leitor('juris').aberto }; });
      ok(x0.t1 !== x0.t0 && x0.agora === x0.t1 && !!x0.de && x0.de.view === 'simulados',
        R + 'ALT+← JURIS preparo: leitor aberto num verbete com anterior ("' + x0.t1.slice(0, 40) + '" ≠ "' + x0.t0.slice(0, 40) + '"), origem = simulado');
      ok(focou && x1.view === 'simulados' && x1.de === null,
        R + 'ALT+← JURIS com o leitor aberto volta ao simulado e apaga a origem (view=' + x1.view + ')');
      ok(x1.aberto && x1.tit === x0.t1,
        R + 'ALT+← JURIS …e NÃO troca o verbete no leitor que ficou vivo atrás (antes "' + x0.t1.slice(0, 40) + '", agora "' + x1.tit.slice(0, 40) + '")');
      await fecharLeitorNoQuadro(page, 'juris');
    }
    await V(() => window.__vo.app().setState({ sjModo: 'misto', sjItens: [], sjResp: {}, sjFim: false, sjAberto: false, enamCor: null }));
  }

  /* ===== M. SALTO LEGIS → JURIS mantém a origem anterior ===== */
  await irPeloMenu('areamod');
  await V(async (r) => { const vo = window.__vo; await vo.pronto('areamod', w => !!w.ctAbrirPonto); vo.fr('areamod').contentWindow.CTRoteiro.fechar(); vo.fr('areamod').contentWindow.ctAbrirPonto(r); }, RITO);
  await clicar(noFrame('areamod', '#fluxo [data-legis]'));
  const m0 = await V(async () => { const vo = window.__vo; await vo.naView('legis'); await vo.pronto('legis', w => !!w.ctEnviarAoHost);
    const antes = vo.de();
    // o salto pela ponte REAL do LEGIS; a `origem` de brinde não pode sobrescrever nada
    vo.fr('legis').contentWindow.ctEnviarAoHost({ type: 'ctAbrirAcervo', alvo: 'juris', termo: 'art. 5',
      origem: { view: 'segundafase', rotulo: 'texto do satélite que o host não usa' } });
    await vo.naView('juris');
    return { antes, view: vo.app().state.view, depois: vo.de() }; });
  ok(m0.view === 'juris' && !!m0.antes && JSON.stringify(m0.depois) === JSON.stringify(m0.antes) && m0.depois.view === 'areamod',
    R + 'SALTO LEGIS→JURIS mantém a origem anterior, mesmo com `origem` na mensagem (' + JSON.stringify(m0.depois) + ')');
  conferirPilula(ok, R, 'SALTO', 'juris', await V(() => window.__vo.pilula('juris')), 'Voltar ao rito');
  await V(() => window.__vo.espiar('areamod'));
  const tM = await tocarPilula(page, 'juris');
  const m1 = await V(async (r) => { const vo = window.__vo; await vo.naView('areamod'); await vo.w(300);
    return { view: vo.app().state.view, blocos: vo.blocos('areamod'), rito: new URLSearchParams(vo.fr('areamod').contentWindow.location.search).get('rito') }; }, RITO);
  ok(tM && m1.view === 'areamod' && m1.rito === RITO, R + 'SALTO a pílula do JURIS pula o LEGIS e devolve ao rito de origem (' + m1.rito + ')');

  /* ===== N. window.catedraVoltarAcervo(de) chamado direto (o caminho do botão nativo) ===== */
  // a casca Swift monta a chamada como TEXTO: window.catedraVoltarAcervo(<JSON com chaves ordenadas>)
  const nativo = async (de, deOnde) => {
    if (deOnde) await V(v => window.__catedraGoView(v), deOnde);
    await V(() => { const vo = window.__vo; ['areamod', 'roteiros', 'prioridade'].forEach(v => vo.espiar(v)); });
    const r = await page.evaluate('window.catedraVoltarAcervo(' + JSON.stringify(ordenar(de)) + ')');
    const s = await V(async () => { const vo = window.__vo; await vo.w(700);
      return { view: vo.app().state.view, de: vo.app().state.acervoDe, ritos: vo.blocos('areamod'), pecas: vo.blocos('roteiros'), prio: vo.blocos('prioridade') }; });
    return { r, ...s };
  };
  const PECA = await V(() => Object.keys(window.__vo.fr('areamod').contentWindow.CT_PECAS || {})[0]);
  {
    const n1 = await nativo({ rito: RITO, peca: PECA, bloco: 1 }, 'legis');
    ok(n1.r === true && n1.view === 'areamod' && n1.ritos.some(b => b.rito === RITO && b.peca === PECA && b.bloco === 1),
      R + 'NATIVO `de` antigo, sem view, volta a Processo e peças com rito, peça e bloco (view=' + n1.view + ')');
    const n2 = await nativo({ view: 'roteiros', peca: PECA, bloco: 0, rotulo: 'Voltar à peça · bloco 1', extra: { lista: [1, null, 'x'] } }, 'legis');
    // o ritos-web pode receber um ctAbrirBloco VAZIO (a chave dele volta a 'p:'), que não abre nada
    const vazou2 = n2.ritos.filter(b => b.peca || b.rito || b.bloco != null);
    ok(n2.r === true && n2.view === 'roteiros' && n2.pecas.some(b => b.peca === PECA && b.bloco === 0) && vazou2.length === 0,
      R + 'NATIVO {view:roteiros} (com campo extra) volta a Roteiros de peças e não vaza o ponto para o ritos-web (view=' + n2.view + ', ' + JSON.stringify(vazou2) + ')');
    const n3 = await nativo({ view: 'segundafase', rotulo: 'Voltar à correção' }, 'legis');
    ok(n3.r === true && n3.view === 'segundafase', R + 'NATIVO {view:segundafase} volta à 2ª fase, não a Processo e peças (view=' + n3.view + ')');
    const n4 = await nativo({ view: 'edital', rotulo: 'Voltar' }, 'legis');
    ok(n4.r === true && n4.view === 'edital', R + 'NATIVO view desconhecida da régua mas aberta na área ("edital") volta para ELA, não para areamod (view=' + n4.view + ')');
    const n5 = await nativo({ view: 'legis' }, 'ciclo');
    const n6 = await nativo({ view: '<img src=x>' }, 'ciclo');
    const n7 = await nativo(null, 'ciclo');
    ok(n5.r === false && n5.view === 'ciclo' && n6.r === false && n6.view === 'ciclo' && n7.view !== 'legis' && n7.view !== 'juris',
      R + 'NATIVO view legis, nome inválido e `de` nulo não levam ao acervo nem a lugar inventado (legis→' + n5.view + ', inválido→' + n6.view + ', nulo→' + n7.view + ')');
    // estado vivo: a view atual JÁ É a de origem (o shim nunca tirou a web dali)
    const viva = await V(async () => { const vo = window.__vo; window.__catedraGoView('prioridade'); await vo.naView('prioridade');
      const d = vo.fr('prioridade').contentDocument, ls = [...d.querySelectorAll('.linha')];
      const aberta = ls.find(l => l.classList.contains('on')), fechada = ls.find(l => !l.classList.contains('on'));
      vo.fr('prioridade').contentWindow.__voMarca = 7;
      return { aberta: aberta && aberta.dataset.d, fechada: fechada && fechada.dataset.d }; });
    const n8 = await nativo({ view: 'prioridade', disc: viva.fechada || 'Direito Civil', rotulo: 'Voltar ao painel de prioridade' }, null);
    const n8b = await V(({ aberta, fechada }) => { const vo = window.__vo, d = vo.fr('prioridade').contentDocument;
      const l = n => [...d.querySelectorAll('.linha')].find(x => x.dataset.d === n);
      return { marca: vo.fr('prioridade').contentWindow.__voMarca === 7, continuaAberta: !aberta || (l(aberta) && l(aberta).classList.contains('on')),
        naoMexeu: !fechada || (l(fechada) && !l(fechada).classList.contains('on')) }; }, viva);
    ok(n8.r === true && n8.view === 'prioridade' && n8.de === null && n8.prio.length === 0 && n8b.marca && n8b.continuaAberta && n8b.naoMexeu,
      R + 'NATIVO view atual = de.view: devolve true, apaga a origem e NÃO reaplica o ponto (0 ctAbrirBloco, painel intacto, iframe não recarregou)');
    // o mesmo em Processo e peças: o roteiro aberto no bloco em que ela estava não é refeito
    const viva2 = await V(async (p) => { const vo = window.__vo; window.__catedraGoView('areamod'); await vo.naView('areamod');
      const W = vo.fr('areamod').contentWindow; W.CTRoteiro.abrir(p); await vo.w(300); W.document.querySelector('.ctr [data-r=sc]').scrollTop = 123;
      return W.document.querySelector('.ctr [data-r=sc]').scrollTop; }, PECA);
    const n9 = await nativo({ view: 'areamod', rito: RITO, peca: PECA, bloco: 3 }, null);
    const n9b = await V(() => { const d = window.__vo.fr('areamod').contentDocument; return { aberto: !!d.querySelector('.ctr.on'), rolagem: d.querySelector('.ctr [data-r=sc]').scrollTop }; });
    ok(n9.r === true && n9.view === 'areamod' && n9.ritos.length === 0 && n9b.aberto && n9b.rolagem === viva2,
      R + 'NATIVO de volta a Processo e peças sem sair dele: o roteiro aberto fica onde estava (rolagem ' + n9b.rolagem + ' de ' + viva2 + ')');
  }
  // view desconhecida que a área NÃO abre: nada acontece (antes ia para Processo e peças)
  {
    // na área jurídica, "casos" (casos próprios) não abre — e não está na régua da volta
    const n10 = await V(async () => { const vo = window.__vo, app = vo.app();
      const pode = app._podeAbrir('casos'); window.__catedraGoView('ciclo'); await vo.naView('ciclo');
      const r = window.catedraVoltarAcervo({ view: 'casos', rotulo: 'Voltar' }); await vo.w(500);
      return { pode, r, view: app.state.view }; });
    if (n10.pode) ok(false, R + 'NATIVO a área jurídica deveria bloquear "casos" (o caso de teste perdeu o sentido)');
    else ok(n10.r === false && n10.view === 'ciclo',
      R + 'NATIVO view desconhecida que a área não abre: devolve false e fica onde está (view=' + n10.view + ')');
  }
  // D2: view que NÃO EXISTE neste app (nem removida, nem inventada) não leva a lugar nenhum
  {
    const d1 = await nativo({ view: 'naoexiste', rotulo: 'Voltar' }, 'ciclo');
    ok(d1.r === false && d1.view === 'ciclo', R + 'D2 catedraVoltarAcervo({view:"naoexiste"}) devolve false e não muda a view (r=' + d1.r + ', view=' + d1.view + ')');
    const d2 = await nativo({ view: 'multiformato', rotulo: 'Voltar' }, 'ciclo');
    ok(d2.r === false && d2.view === 'ciclo', R + 'D2 view removida do app ("multiformato") também devolve false e fica no lugar (r=' + d2.r + ', view=' + d2.view + ')');
    // a partir do LEGIS com uma origem guardada: a origem não se perde nem a tela troca
    await irPeloMenu('ciclo');
    await clicar(host('.ct-bc-foco [aria-label^="Legislação"]'));
    const d3 = await V(async () => { const vo = window.__vo; await vo.naView('legis'); const antes = vo.de();
      const r = window.catedraVoltarAcervo({ view: 'naoexiste' }); await vo.w(500);
      return { r, antes, view: vo.app().state.view, depois: vo.de() }; });
    ok(d3.r === false && d3.view === 'legis' && !!d3.antes && JSON.stringify(d3.depois) === JSON.stringify(d3.antes),
      R + 'D2 no LEGIS, {view:"naoexiste"} não tira ela do acervo nem apaga a origem válida (' + JSON.stringify(d3.depois) + ')');
    await tocarPilula(page, 'legis');
    await V(() => window.__vo.naView('ciclo'));
  }

  /* ===== O. MAPA DE PROCESSO: a volta reabre o MESMO painel, no mesmo mapa ===== */
  await irPeloMenu('areamod');
  const o0 = await V(async () => {
    const vo = window.__vo;
    const f = await vo.pronto('areamod', w => !!w.CTMapa && !!w.ctAbrirPonto && !!w.CTRoteiro);
    if (!f) return { erro: 'o ritos-web não carregou' };
    const W = f.contentWindow, d = f.contentDocument;
    W.CTRoteiro.fechar();
    if (!d.body.classList.contains('modo-mapa')) d.getElementById('mMapa').click();
    const ok1 = await vo.ate(() => d.querySelector('#mapaHold [data-abrir]'), 10000);
    return ok1 ? { ok: true } : { erro: 'o modo Mapa não mostrou nenhum nó' };
  });
  if (o0.erro) ok(false, R + 'MAPA ' + o0.erro);
  else {
    for (const cenario of ['no', 'peca']) {
      // um nó (ou uma peça) cujo painel tem referência ⚖️; percorre os ritos até achar
      const alvo = await V(async (cenario) => {
        const vo = window.__vo, f = vo.fr('areamod'), W = f.contentWindow, d = f.contentDocument;
        const ORDEM = W.eval('ORDEM'), atual = new URLSearchParams(W.location.search).get('rito');
        const ritos = [atual].concat(ORDEM.filter(r => r !== atual)).filter(Boolean);
        for (const r of ritos) {
          if (r !== new URLSearchParams(W.location.search).get('rito')) { W.ctAbrirPonto(r); await vo.w(250); }
          const sel = cenario === 'no' ? '#mapaHold [data-abrir]' : '#mapaHold .mp-no [data-peca]';
          for (const b of d.querySelectorAll(sel)) {
            b.click();
            const p = d.querySelector('.mp-painel'), lg = p && p.querySelector('[data-legis]');
            if (lg) { lg.setAttribute('data-vo-mapa', '1');
              return { rito: r, chave: cenario === 'no' ? b.dataset.abrir : b.dataset.peca, titulo: (p.querySelector('h3') || {}).textContent || '' }; }
          }
        }
        return null;
      }, cenario);
      if (!alvo) { ok(false, R + 'MAPA ' + cenario + ': nenhum painel do mapa com referência ⚖️ para testar'); continue; }
      // marca o DOM do mapa e conta as montagens: a volta não pode destruir e remontar
      await V(() => { const W = window.__vo.fr('areamod').contentWindow, d = W.document;
        // o palco e a camada dos nós são do mapa montado (os cartões dentro dela se repintam a
        // cada nó ativado, por desenho); a instância `mapa` do ritos-web é a prova final
        W.__voPalco = d.querySelector('#mapaHold .mp-palco'); W.__voNo = d.querySelector('#mapaHold [data-r="nos"]');
        W.__voMapa = W.eval('mapa');
        W.__montou = 0; if (!W.__voMontInst) { W.__voMontInst = 1; const o = W.CTMapa.montar;
          W.CTMapa.montar = function () { W.__montou++; return o.apply(this, arguments); }; } });
      const cO = await clicar(page.frameLocator('iframe[data-ct-view="areamod"]').locator('[data-vo-mapa="1"]'));
      const o1 = await V(async () => { const vo = window.__vo; await vo.naView('legis');
        return { view: vo.app().state.view, de: vo.de(), exposto: window.__catedraOrigemAcervo ? window.__catedraOrigemAcervo() : 'sem C1' }; });
      const de = o1.de || {};
      ok(cO && o1.view === 'legis' && de.view === 'areamod' && de.rito === alvo.rito && !!de.mapa && de.mapa.tipo === cenario && de.mapa.id === alvo.chave
        && !de.peca && de.bloco == null && de.rotulo === 'Voltar ao mapa do processo',
        R + 'MAPA ' + cenario + ': a ida pelo painel grava {view:areamod, rito, mapa:{tipo:"' + cenario + '", id}} sem peça solta (' + JSON.stringify(o1.de) + ')');
      ok(JSON.stringify(o1.exposto) === JSON.stringify(o1.de),
        R + 'MAPA ' + cenario + ': window.__catedraOrigemAcervo() devolve a mesma origem, em JSON puro (C1: ' + JSON.stringify(o1.exposto) + ')');
      conferirPilula(ok, R, 'MAPA ' + cenario, 'legis', await V(() => window.__vo.pilula('legis')), 'Voltar ao mapa do processo');
      // desfaz o ponto no satélite escondido: fecha o painel
      await V(() => { const d = window.__vo.fr('areamod').contentDocument; const x = d.querySelector('.mp-painel [data-p=x]'); if (x) x.click(); });
      const tO = await tocarPilula(page, 'legis');
      const o2 = await V(async () => { const vo = window.__vo; await vo.naView('areamod');
        const W = vo.fr('areamod').contentWindow, d = W.document;
        await vo.ate(() => d.querySelector('.mp-painel'), 6000); await vo.w(300);
        return { view: vo.app().state.view, de: vo.app().state.acervoDe, painel: !!d.querySelector('.mp-painel'),
          titulo: (d.querySelector('.mp-painel h3') || {}).textContent || '', lateral: !!d.querySelector('.ctr.on'),
          modoMapa: d.body.classList.contains('modo-mapa'), montou: W.__montou,
          mesmoPalco: !!W.__voPalco && W.__voPalco.isConnected && d.querySelector('#mapaHold .mp-palco') === W.__voPalco,
          mesmoNo: !!W.__voNo && W.__voNo.isConnected && d.querySelector('#mapaHold [data-r="nos"]') === W.__voNo,
          mesmaInstancia: !!W.__voMapa && W.eval('mapa') === W.__voMapa,
          aberto: W.eval('typeof mapa!=="undefined" && mapa && mapa.aberto ? mapa.aberto() : null') }; });
      ok(tO && o2.view === 'areamod' && o2.de === null && o2.modoMapa && o2.painel && o2.titulo === alvo.titulo
        && !!o2.aberto && o2.aberto.tipo === cenario && o2.aberto.id === alvo.chave,
        R + 'MAPA ' + cenario + ': o toque volta ao mapa com o MESMO painel reaberto ("' + o2.titulo + '", aberto=' + JSON.stringify(o2.aberto) + ')');
      ok(!o2.lateral, R + 'MAPA ' + cenario + ': a volta não abre o roteiro lateral por cima do mapa');
      ok(o2.montou === 0 && o2.mesmoPalco && o2.mesmoNo && o2.mesmaInstancia,
        R + 'MAPA ' + cenario + ': o mapa não foi destruído nem remontado (montagens: ' + o2.montou + ', mesmo palco no DOM: ' + o2.mesmoPalco
        + ', mesma camada de nós: ' + o2.mesmoNo + ', mesma instância: ' + o2.mesmaInstancia + ')');
      await V(() => { const d = window.__vo.fr('areamod').contentDocument; const x = d.querySelector('.mp-painel [data-p=x]'); if (x) x.click();
        const m = d.querySelector('[data-vo-mapa]'); if (m) m.removeAttribute('data-vo-mapa'); });
    }
    // deixa o Processo e peças como estava (fluxograma)
    await V(() => { const d = window.__vo.fr('areamod').contentDocument; const b = d.getElementById('mFluxo'); if (b) b.click(); });
  }

  /* ===== O2. MAPA: id que é propriedade herdada de Object ('constructor', 'toString',
     '__proto__') é recusado no host e no ritos-web; nada vai para o localStorage do mapa, e o
     lixo que já estava gravado é ignorado na carga (K3). ===== */
  {
    const q0 = await V(async (RITO) => {
      const vo = window.__vo, app = vo.app();
      const f = await vo.pronto('areamod', w => !!w.CTMapa && !!w.ctAbrirPonto);
      if (!f) return { erro: 'o ritos-web não carregou' };
      const W = f.contentWindow, d = f.contentDocument;
      if (!d.body.classList.contains('modo-mapa')) d.getElementById('mMapa').click();
      const valido = await vo.ate(() => { const b = d.querySelector('#mapaHold [data-abrir]'); return b && b.dataset.abrir; }, 10000);
      const CH = 'catedraMapaProcessual';
      const guardadoAntes = localStorage.getItem(CH);
      // host: a régua _mapaDe e a origem que um quadro mandaria
      const host = {
        noConstructor: app._mapaDe({ tipo: 'no', id: 'constructor' }), pecaToString: app._mapaDe({ tipo: 'peca', id: 'toString' }),
        noProto: app._mapaDe({ tipo: 'no', id: '__proto__' }), pecaHas: app._mapaDe({ tipo: 'peca', id: 'hasOwnProperty' }),
        valido: app._mapaDe({ tipo: 'no', id: valido || 'p0' }),
        doFrame: window.__catedraOrigemDoFrame ? window.__catedraOrigemDoFrame({ rito: RITO, mapa: { tipo: 'no', id: 'constructor' } }, 'areamod') : 'sem K2',
        normalizado: app._normalizarDe({ rito: RITO, mapa: { tipo: 'peca', id: 'toString' } }, 'areamod', false) };
      // a volta do botão nativo com um mapa forjado: o host não repassa esse ponto ao ritos-web
      W.__voErros = []; W.addEventListener('error', e => W.__voErros.push(String(e.message || e)));
      const x = d.querySelector('.mp-painel [data-p=x]'); if (x) x.click();
      vo.espiar('areamod');
      window.__catedraGoView('legis'); await vo.naView('legis');
      const rVolta = window.catedraVoltarAcervo({ view: 'areamod', rito: RITO, mapa: { tipo: 'no', id: 'constructor' }, rotulo: 'Voltar ao mapa do processo' });
      await vo.naView('areamod'); await vo.w(600);
      const blocosHost = vo.blocos('areamod');
      // ritos-web: a mensagem do host (ctAbrirBloco) com o ponto forjado, direto no quadro
      const forjados = ['no:constructor', 'peca:toString', 'no:__proto__', 'peca:hasOwnProperty', 'no:valueOf'];
      const painelApos = {};
      for (const mp of forjados) {
        W.postMessage({ type: 'ctAbrirBloco', rito: RITO, mapa: mp }, '*'); await vo.w(250);
        const m = W.eval('mapa');
        painelApos[mp] = { painel: !!d.querySelector('.mp-painel'), aberto: m && m.aberto ? m.aberto() : null, ativo: m && m.ativo ? m.ativo() : null };
      }
      // a peça herdada também não abre roteiro lateral
      W.postMessage({ type: 'ctAbrirBloco', rito: RITO, peca: 'constructor' }, '*'); await vo.w(400);
      const lateral = !!d.querySelector('.ctr.on');
      await vo.w(300);
      const guardado = localStorage.getItem(CH) || '';
      // controle positivo: um nó de verdade abre o painel
      W.postMessage({ type: 'ctAbrirBloco', rito: RITO, mapa: 'no:' + valido }, '*');
      const abriuValido = !!(await vo.ate(() => { const m = W.eval('mapa'); const a = m && m.aberto && m.aberto(); return a && a.id === valido; }, 4000));
      const x2 = d.querySelector('.mp-painel [data-p=x]'); if (x2) x2.click();
      return { valido, host, rVolta, blocosHost, painelApos, lateral, guardado, abriuValido, erros: W.__voErros.slice(), guardadoAntes };
    }, RITO);
    if (q0.erro) ok(false, R + 'MAPA K3 ' + q0.erro);
    else {
      const h = q0.host;
      ok(h.noConstructor === null && h.pecaToString === null && h.noProto === null && h.pecaHas === null && !!h.valido && h.valido.id === q0.valido,
        R + 'MAPA K3 host: _mapaDe recusa no:constructor, peca:toString, no:__proto__ e peca:hasOwnProperty, e aceita um nó real (' + q0.valido + ')');
      ok(!!h.doFrame && typeof h.doFrame === 'object' && !h.doFrame.mapa && !h.normalizado.mapa,
        R + 'MAPA K3 host: a origem de um quadro com mapa herdado sai SEM mapa (__catedraOrigemDoFrame: ' + JSON.stringify(h.doFrame) + ')');
      const comMapaRuim = q0.blocosHost.filter(b => /constructor|toString|__proto__/.test(String(b.mapa || '')));
      ok(q0.rVolta === true && comMapaRuim.length === 0,
        R + 'MAPA K3 host: catedraVoltarAcervo com mapa {no:constructor} volta ao Processo e peças sem mandar esse ponto ao ritos-web (' + JSON.stringify(q0.blocosHost.map(b => b.mapa || null)) + ')');
      const falhou = Object.entries(q0.painelApos).filter(([, a]) => a.painel || a.aberto || /constructor|toString|__proto__|hasOwnProperty|valueOf/.test(String(a.ativo)));
      ok(falhou.length === 0 && !q0.lateral && q0.erros.length === 0,
        R + 'MAPA K3 ritos-web: ctAbrirBloco com no:constructor, peca:toString, no:__proto__, peca:hasOwnProperty, no:valueOf ou peca=constructor não abre painel nem roteiro e não dá erro ('
        + JSON.stringify(falhou) + ', roteiro: ' + q0.lateral + ', erros: ' + JSON.stringify(q0.erros) + ')');
      ok(!/constructor|toString|__proto__|hasOwnProperty|valueOf/.test(q0.guardado),
        R + 'MAPA K3 ritos-web: nada herdado foi gravado no localStorage do mapa (catedraMapaProcessual)');
      ok(q0.abriuValido, R + 'MAPA K3 controle: ctAbrirBloco com um nó real (no:' + q0.valido + ') abre o painel');
    }
    // lixo JÁ gravado (versão antiga, ou um salto forjado de antes do conserto) + ?mapa=no:constructor na 1ª carga
    const q1 = await V(async (RITO) => {
      const vo = window.__vo, f = vo.fr('areamod'); if (!f) return { erro: 'sem o quadro do ritos-web' };
      const CH = 'catedraMapaProcessual';
      let tudo = {}; try { tudo = JSON.parse(localStorage.getItem(CH)) || {}; } catch (_) {}
      tudo[RITO] = Object.assign({}, tudo[RITO] || {}, { ativo: 'constructor', escolhas: { constructor: 'toString', p1: '__proto__' } });
      localStorage.setItem(CH, JSON.stringify(tudo));
      const W0 = f.contentWindow; W0.__voVelho = 1;
      const base = W0.location.pathname;
      W0.location.href = base + '?rito=' + encodeURIComponent(RITO) + '&modo=mapa&mapa=' + encodeURIComponent('no:constructor');
      const W = await vo.ate(() => { const w = f.contentWindow; return (w && !w.__voVelho && w.document.readyState === 'complete' && w.CTMapa && w.eval('typeof mapa!=="undefined" && mapa')) ? w : null; }, 20000);
      if (!W) return { erro: 'o ritos-web não recarregou com o lixo gravado' };
      await vo.w(600);
      const d = W.document, m = W.eval('mapa');
      const carga = { palco: !!d.querySelector('#mapaHold .mp-palco'), painel: !!d.querySelector('.mp-painel'), aberto: m.aberto(), ativo: m.ativo() };
      // o que se grava DEPOIS sai limpo: ativar um nó real repinta e guarda
      const b = d.querySelector('#mapaHold [data-abrir]'); if (b) b.click();
      await vo.w(500);
      let reg = null; try { reg = (JSON.parse(localStorage.getItem(CH)) || {})[RITO] || null; } catch (_) {}
      const x = d.querySelector('.mp-painel [data-p=x]'); if (x) x.click();
      const mf = d.getElementById('mFluxo'); if (mf) mf.click();
      return { carga, reg, clicou: !!b };
    }, RITO);
    if (q1.erro) ok(false, R + 'MAPA K3 carga ' + q1.erro);
    else {
      const c = q1.carga;
      ok(c.palco && !c.painel && c.aberto === null && typeof c.ativo === 'string' && !/constructor|toString|__proto__/.test(c.ativo),
        R + 'MAPA K3 carga: com {"ativo":"constructor", escolhas herdadas} gravado e ?mapa=no:constructor, o mapa monta, nenhum painel abre e a etapa ativa é real ("' + c.ativo + '")');
      const esc = (q1.reg && q1.reg.escolhas) || {};
      ok(q1.clicou && !!q1.reg && typeof q1.reg.ativo === 'string' && !/constructor|toString|__proto__/.test(q1.reg.ativo)
        && !Object.keys(esc).concat(Object.values(esc).map(String)).some(k => /constructor|toString|__proto__/.test(k)),
        R + 'MAPA K3 carga: o que se grava depois sai limpo — ativo real e escolhas sem o lixo (' + JSON.stringify(q1.reg && { ativo: q1.reg.ativo, escolhas: esc }) + ')');
    }
  }

  /* ===== P. REVISÃO numa área que NÃO abre o acervo da referência ===== */
  {
    const p0 = await V(async () => {
      const vo = window.__vo, app = vo.app(), reg = window.CT_AREA_REG;
      if (!reg || typeof reg.podeAbrir !== 'function') return { erro: 'sem CT_AREA_REG' };
      const area = ['saude', 'social', 'policial'].find(a => { try { return reg.podeAbrir(a, 'revisoes') && reg.podeAbrir(a, 'legis') && !reg.podeAbrir(a, 'juris'); } catch (_) { return false; } });
      if (!area) return { erro: 'nenhuma área abre revisões e LEGIS sem abrir o JURIS' };
      window.__catedraGoView('revisoes'); await vo.naView('revisoes');
      app.setState({ areaEstudo: area, revSession: null }); await vo.w(300);
      const hoje = app._hoje(), agora = Date.now();
      const b = { color: 'var(--accent)', intervalo: 1, facilidade: 2.5, repeticoes: 0, dueDate: hoje, up: agora };
      app.setState({ reviews: [
        { ...b, id: 'rv-a', disc: 'Direito Civil', topic: 'Primeiro item, sem referência', due: -2 },
        { ...b, id: 'rv-b', disc: 'Direito Constitucional', topic: 'Segundo item, com tema', ref: 'Tema 698', due: -1 },
        { ...b, id: 'rv-c', disc: 'Direito Processual Civil', topic: 'Terceiro item, com artigo', ref: 'Art. 525 do CPC', due: 0 }] });
      await vo.w(500);
      const textos = () => [...document.querySelectorAll('#dc-root button')].map(x => (x.textContent || '').trim());
      const lista = { view: app.state.view, juris: textos().filter(t => t === 'Abrir no JURIS').length, legis: textos().filter(t => t === 'Abrir no LEGIS').length };
      // a sessão guiada, no item com tema
      app.startRevSession(); await vo.ate(() => app.state.revSession, 3000);
      while (app.state.revSession && app.state.revSession.queue[app.state.revSession.idx] !== 'rv-b' && app.state.revSession.idx < 5) { app.revSkip(); await vo.w(150); }
      app.revReveal(); await vo.w(300);
      const dlg = document.querySelector('[role="dialog"][aria-label="Sessão de revisão"]');
      const sessaoJuris = dlg ? [...dlg.querySelectorAll('button')].filter(x => /Abrir no JURIS/.test(x.textContent || '')).length : -1;
      const antes = JSON.parse(JSON.stringify(app.state.revSession));
      // forçado (um botão velho na tela, um atalho): a sessão NÃO fecha e ninguém sai dali
      app.abrirAcervoDaRevisao({ currentTarget: { dataset: { id: 'rv-b' } } });
      await vo.w(700);
      const depois = { view: app.state.view, sessao: app.state.revSession, de: app.state.acervoDe,
        modal: !!document.querySelector('[role="dialog"][aria-label="Sessão de revisão"]') };
      app.closeRevSession(); app.setState({ areaEstudo: 'juridica' }); await vo.w(300);
      return { area, lista, sessaoJuris, dialogo: !!dlg, antes, depois };
    });
    if (p0.erro) ok(false, R + 'ÁREA ' + p0.erro);
    else {
      ok(p0.lista.view === 'revisoes' && p0.lista.juris === 0 && p0.lista.legis >= 1,
        R + 'ÁREA ' + p0.area + ': a lista de revisões não oferece "Abrir no JURIS" (a área não abre o JURIS) e mantém o "Abrir no LEGIS" (JURIS: ' + p0.lista.juris + ', LEGIS: ' + p0.lista.legis + ')');
      ok(p0.dialogo && p0.sessaoJuris === 0, R + 'ÁREA ' + p0.area + ': a sessão guiada não mostra "Abrir no JURIS" no item com tema (' + p0.sessaoJuris + ')');
      const d = p0.depois, sx = d.sessao || {};
      ok(d.view === 'revisoes' && !!d.sessao && d.modal && sx.idx === p0.antes.idx && sx.revealed === p0.antes.revealed && d.de === null,
        R + 'ÁREA ' + p0.area + ': forçado, "Abrir no JURIS" não fecha a sessão nem sai de Revisões (view=' + d.view + ', sessão aberta: ' + !!d.sessao + ', idx=' + sx.idx + ')');
    }
  }
}

/* ------------------------------------------------------------------ o caminho nativo */

/** Recorta do Swift o shim injetado em atDocumentStart: da função que confere o iframe até
 *  o fim do listener de 'message'. Nada é reescrito além da ponte do WebKit, que a página de
 *  teste não tem: window.webkit.messageHandlers.X → window.__ctMH.X (um gravador). */
function extrairShim(arquivo) {
  const fonte = fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');
  const ini = fonte.indexOf('function satelitePodeAbrirAcervo(e)');
  if (ini < 0) throw new Error('sem satelitePodeAbrirAcervo');
  const lis = fonte.indexOf("window.addEventListener('message'", ini);
  if (lis < 0) throw new Error('sem o listener de message depois do guarda');
  const abre = fonte.indexOf('{', fonte.indexOf('function', lis));
  let n = 0, i = abre;
  for (; i < fonte.length; i++) { if (fonte[i] === '{') n++; else if (fonte[i] === '}') { n--; if (n === 0) break; } }
  const fim = fonte.indexOf(');', i);
  if (fim < 0) throw new Error('fim do listener não encontrado');
  let js = fonte.slice(ini, fim + 2);
  if (/\\\(/.test(js)) throw new Error('interpolação Swift dentro do shim');
  js = js.replace(/\\\\/g, '\\');
  if (!/function origemComView\(e\)/.test(js)) throw new Error('o shim não tem origemComView');
  if (!/de:\s*origemComView\(e\)/.test(js)) throw new Error('o postMessage nativo não manda de: origemComView(e)');
  if (!/messageHandlers\.(catedraNav|catedraAcervo)\.postMessage/.test(js)) throw new Error('o shim não fala com o handler nativo');
  return js;
}

function embrulharShim(js) {
  return '(function(){ if (window.top !== window) return;\n'   // forMainFrameOnly: true
    + '  window.__ctNativo = [];\n'
    + '  var gravar = function (m) { window.__ctNativo.push(JSON.parse(JSON.stringify(m))); return Promise.resolve(); };\n'
    + '  window.__ctMH = { catedraNav: { postMessage: gravar }, catedraAcervo: { postMessage: gravar } };\n'
    + js.replace(/window\.webkit\.messageHandlers\./g, 'window.__ctMH.') + '\n})();';
}

/** JSONSerialization com .sortedKeys: a casca devolve o `de` com as chaves em ordem. */
function ordenar(x) {
  if (Array.isArray(x)) return x.map(ordenar);
  if (x && typeof x === 'object') return Object.keys(x).sort().reduce((o, k) => { o[k] = ordenar(x[k]); return o; }, {});
  return x;
}

/* ------------------------------------------------------------------ satélites por Frame
   Em file:// (o caminho dos apps) o WebKit dá origem opaca a cada arquivo: o host não lê o
   contentDocument dos iframes. Estes ajudantes falam com o satélite pelo Frame do Playwright,
   que roda DENTRO dele — valem nas duas origens. */

async function quadro(page, v, teste, ms = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      const carregou = await page.evaluate(v => { const f = document.querySelector('iframe[data-ct-view="' + v + '"]'); return !!f && f.dataset.ctLoad === '1'; }, v);
      if (carregou) {
        const el = await page.$('iframe[data-ct-view="' + v + '"]');
        const fr = el && await el.contentFrame();
        if (fr && (!teste || await fr.evaluate(teste).catch(() => false))) return fr;
      }
    } catch (_) {}
    await page.waitForTimeout(150);
  }
  return null;
}
async function espiarQ(fr) {
  return fr.evaluate(() => { window.__voBlocos = [];
    if (!window.__voEspia) { window.__voEspia = true; window.addEventListener('message', e => { if (e.data && e.data.type === 'ctAbrirBloco') window.__voBlocos.push(JSON.parse(JSON.stringify(e.data))); }); }
    return true; });
}
async function blocosQ(fr) { return fr.evaluate(() => (window.__voBlocos || []).slice()).catch(() => []); }

/** A mesma medida de __vo.pilula, feita de dentro do satélite. */
async function pilulaQ(page, v) {
  const fr = await quadro(page, v);
  const quadroVisivel = await page.evaluate(v => { const f = document.querySelector('iframe[data-ct-view="' + v + '"]'); const r = f && f.getBoundingClientRect();
    return !!f && f.style.display !== 'none' && r.width > 0 && r.height > 0; }, v);
  if (!fr) return { visivel: false, display: '(sem quadro)' };
  const t0 = Date.now(); let m = null;
  while (Date.now() - t0 < 25000) {
    m = await fr.evaluate(() => {
      const b = document.getElementById('ct-volta'); if (!b) return null;
      const cs = getComputedStyle(b); if (cs.display === 'none' || !(b.textContent || '').trim()) return null;
      const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      const cor = s => { s = String(s || ''); let k = /rgba?\(([^)]+)\)/.exec(s); if (k) return k[1].split(/[\s,/]+/).filter(Boolean).map(Number);
        k = /color\(srgb\s+([^)]+)\)/.exec(s); if (k) return k[1].split(/[\s/]+/).filter(Boolean).map((x, i) => i < 3 ? Number(x) * 255 : Number(x)); return null; };
      const r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const fg = cor(cs.color), bg = cor(cs.backgroundColor); let contraste = 0;
      if (fg && bg) { const a = lum(fg), c = lum(bg); contraste = (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05); }
      return { visivel: true, texto: (b.textContent || '').trim(), display: cs.display, visibilidade: cs.visibility,
        altura: Math.round(r.height), largura: Math.round(r.width),
        dentro: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
        noTopo: !!hit && (hit === b || b.contains(hit)), contraste: Math.round(contraste * 100) / 100, cores: cs.color + ' / ' + cs.backgroundColor,
        svgOculto: !!b.querySelector('svg') && b.querySelector('svg').getAttribute('aria-hidden') === 'true',
        svgTam: b.querySelector('svg') ? Math.round(b.querySelector('svg').getBoundingClientRect().width) + 'x' + Math.round(b.querySelector('svg').getBoundingClientRect().height) : '-',
        seta: /[←⬅]/.test((b.textContent || '') + (b.getAttribute('aria-label') || '')) };
    }).catch(() => null);
    if (m) break;
    await page.waitForTimeout(150);
  }
  return m ? { ...m, quadroVisivel } : { visivel: false, display: '(pílula apagada)', quadroVisivel };
}

/* ------------------------------------------------------------------ web em file:// (enxuto) */

async function roteiroWebArquivo(page, ok, R) {
  const V = (fn, arg) => page.evaluate(fn, arg);
  await V(() => window.__catedraGoView('areamod'));
  const fr = await quadro(page, 'areamod', () => !!window.CTRoteiro && !!window.ctAbrirPonto);
  if (!fr) { ok(false, R + 'RITO o ritos-web carregou em file://'); return; }
  const a0 = await fr.evaluate(() => { const ORDEM = window.eval('ORDEM'); let rito = '';
    for (const r of ORDEM.slice(1)) { window.ctAbrirPonto(r); if (document.querySelector('#fluxo [data-legis]')) { rito = r; break; } }
    return { rito, outro: ORDEM.find(r => r !== rito) || '' }; });
  if (!a0.rito) { ok(false, R + 'RITO nenhum rito com chip de lei'); return; }
  await clicar(fr.locator('#fluxo [data-legis]'));
  const a1 = await V(async () => { const vo = window.__vo; await vo.naView('legis'); return { view: vo.app().state.view, de: vo.de() }; });
  ok(a1.view === 'legis' && !!a1.de && a1.de.view === 'areamod' && a1.de.rito === a0.rito && a1.de.rotulo === 'Voltar ao rito',
    R + 'RITO a ida pelo chip do fluxograma grava {view:areamod, rito, "Voltar ao rito"} (' + JSON.stringify(a1.de) + ')');
  conferirPilula(ok, R, 'RITO', 'legis', await pilulaQ(page, 'legis'), 'Voltar ao rito');
  await fr.evaluate(o => window.ctAbrirPonto(o), a0.outro);
  await espiarQ(fr);
  const tocou = await tocarPilula(page, 'legis');
  const a2 = await V(async () => { const vo = window.__vo; await vo.naView('areamod'); await vo.w(800); return { view: vo.app().state.view, de: vo.app().state.acervoDe }; });
  const rito = await fr.evaluate(() => new URLSearchParams(location.search).get('rito'));
  const blocos = await blocosQ(fr);
  ok(tocou && a2.view === 'areamod' && a2.de === null && rito === a0.rito && blocos.some(b => b.rito === a0.rito),
    R + 'RITO o toque na pílula volta a Processo e peças e reabre o MESMO rito (' + rito + ')');
}

/* ------------------------------------------------------------------ o caminho nativo */

async function roteiroNativo(page, ok, R, completo) {
  const V = (fn, arg) => page.evaluate(fn, arg);
  const ultima = async n => V(async (n) => { const vo = window.__vo; await vo.ate(() => window.__ctNativo.length > n, 8000);
    return { n: window.__ctNativo.length, msg: window.__ctNativo[window.__ctNativo.length - 1] || null,
      view: vo.app().state.view, de: vo.app().state.acervoDe }; }, n);
  const nNativo = () => V(() => window.__ctNativo.length);

  // o ritos-web montado antes, para o vazamento poder aparecer
  await V(() => window.__catedraGoView('areamod'));
  const fRitos = await quadro(page, 'areamod', () => !!window.CTRoteiro && !!window.ctAbrirPonto);
  if (!fRitos) { ok(false, R + 'o ritos-web carregou'); return; }
  const r0 = await fRitos.evaluate(() => { const ORDEM = window.eval('ORDEM');
    for (const r of ORDEM) { window.ctAbrirPonto(r); if (document.querySelector('#fluxo [data-legis]')) return { rito: r }; }
    return { erro: 'nenhum rito com chip de lei' }; });
  if (r0.erro) { ok(false, R + r0.erro); return; }

  /* roteiros: o chip do pecas-web NÃO manda view; o shim injeta o data-ct-view do iframe */
  await V(() => window.__catedraGoView('roteiros'));
  const fPecas = await quadro(page, 'roteiros', () => !!window.CTRoteiro && !!document.querySelector('.rcard'));
  if (!fPecas) { ok(false, R + 'o pecas-web carregou'); return; }
  const peca = await fPecas.evaluate(() => document.querySelector('.rcard').dataset.n);
  await clicar(fPecas.locator('.rcard[data-n="' + peca.replace(/"/g, '\\"') + '"]'));
  const p1 = await fPecas.evaluate(async () => {
    const t0 = Date.now(); let chip = null;
    while (Date.now() - t0 < 8000 && !(chip = [...document.querySelectorAll('.ctr.on .rf button')].find(b => +b.dataset.b > 0))) await new Promise(r => setTimeout(r, 60));
    if (!chip) return { erro: 'sem chip de bloco no roteiro' };
    chip.setAttribute('data-vo-chip', '1'); return { bloco: +chip.dataset.b }; });
  if (p1.erro) { ok(false, R + p1.erro); return; }
  await espiarQ(fPecas); await espiarQ(fRitos);
  const n1 = await nNativo();
  await clicar(fPecas.locator('[data-vo-chip="1"]'));
  const p2 = await ultima(n1);
  const de = p2.msg && p2.msg.de;
  ok(!!p2.msg && (p2.msg.alvo === 'legis' || p2.msg.alvo === 'juris') && !!de && de.view === 'roteiros' && de.peca === peca && de.bloco === p1.bloco,
    R + 'o chip do pecas-web chega ao handler nativo com de.view==="roteiros", peça e bloco (' + JSON.stringify(de) + ')');
  ok(!!de && de.rotulo === 'Voltar à peça · bloco ' + (p1.bloco + 1), R + 'o rótulo do botão nativo vem no `de` ("' + (de && de.rotulo) + '")');
  ok(p2.view === 'roteiros' && p2.de === null, R + 'o shim para a mensagem: a web fica em Roteiros de peças e não guarda origem (view=' + p2.view + ')');
  // a web ficou viva atrás da aba nativa: o roteiro está rolado num ponto qualquer (37 px),
  // que uma reabertura (R.abrir → topo → bloco centralizado) desfaria
  const rolagem = await fPecas.evaluate(() => { const sc = document.querySelector('.ctr [data-r=sc]'); sc.scrollTop = 37; return sc.scrollTop; });
  if (de) {
    // a volta nativa: AcervoEntrada devolve o `de` inteiro, com chaves ordenadas, como texto JS
    const r = await page.evaluate('window.catedraVoltarAcervo(' + JSON.stringify(ordenar(de)) + ')');
    await page.waitForTimeout(800);
    const view = await V(() => window.__vo.app().state.view);
    const viva = await fPecas.evaluate(() => ({ aberto: !!document.querySelector('.ctr.on'), rolagem: document.querySelector('.ctr [data-r=sc]').scrollTop }));
    const bp = (await blocosQ(fPecas)).length, br = (await blocosQ(fRitos)).filter(b => b.peca || b.rito || b.bloco != null).length;
    ok(r === true && view === 'roteiros' && viva.aberto && viva.rolagem === rolagem && bp === 0 && br === 0,
      R + 'o botão nativo devolve a Roteiros de peças sem refazer o roteiro vivo (rolagem ' + viva.rolagem + ' de ' + rolagem + ', ctAbrirBloco: ' + bp + '+' + br + ')');
  }

  /* o fluxograma do ritos-web: view areamod */
  await V(() => window.__catedraGoView('areamod'));
  await quadro(page, 'areamod', () => !!document.querySelector('#fluxo [data-legis]'));
  const n2 = await nNativo();
  await clicar(fRitos.locator('#fluxo [data-legis]'));
  const f1 = await ultima(n2);
  ok(!!f1.msg && !!f1.msg.de && f1.msg.de.view === 'areamod' && !!f1.msg.de.rito && f1.view === 'areamod',
    R + 'o chip do fluxograma chega com de.view==="areamod" e o rito (' + JSON.stringify(f1.msg && f1.msg.de) + ')');

  /* K2: a origem que um QUADRO manda (fora LEGIS/JURIS) nunca passa crua ao nativo — o shim
     entrega a régua do host (window.__catedraOrigemDoFrame): a view é a do data-ct-view do
     iframe, o rótulo é o do host e rev/item/campos estranhos não atravessam. */
  {
    const forjado = { view: 'admin', rotulo: 'FORJADO pelo quadro', rito: 'x', item: 'rv-a', extra: { a: 1 },
      rev: { queue: ['rv-a', 'rv-b'], idx: -4, again: -3, hard: -1, good: -7, easy: -9, revealed: true },
      mapa: { tipo: 'no', id: 'constructor' } };
    const n = await nNativo();
    await fRitos.evaluate(de => window.ctEnviarAoHost({ type: 'ctAbrirAcervo', alvo: 'legis', termo: 'art. 1', de }), forjado);
    const k = await ultima(n);
    const d = k.msg && k.msg.de;
    ok(!!d && d.view === 'areamod' && !('rev' in d) && !('item' in d) && !('extra' in d) && !d.mapa && typeof d.rotulo === 'string' && /^Voltar/.test(d.rotulo)
      && !/FORJADO/.test(JSON.stringify(k.msg)) && k.view === 'areamod',
      R + 'K2 ritos-web com de forjado (view "admin", rev de contadores negativos, item, mapa herdado) chega ao handler normalizado: view do data-ct-view, rótulo do host, sem rev/item/mapa (' + JSON.stringify(d) + ')');
    const temK2 = await V(() => typeof window.__catedraOrigemDoFrame === 'function');
    ok(temK2, R + 'K2 o host expõe window.__catedraOrigemDoFrame (sem ela o shim manda de=null e a volta some)');
  }

  /* salto LEGIS web → JURIS nativo: a origem é a VIVA do host (C1), nunca a do frame */
  {
    const h0 = await V(async () => { const vo = window.__vo, app = vo.app();
      window.__catedraGoView('ciclo'); await vo.naView('ciclo');
      app._irPara('legis', { acervoBusca: '', origemAbrir: '', acervoDe: app._deHost('ciclo', { disc: 'Direito Civil' }) });
      await vo.naView('legis');
      return { de: vo.de(), exposto: typeof window.__catedraOrigemAcervo === 'function' ? window.__catedraOrigemAcervo() : 'sem C1' }; });
    ok(!!h0.de && h0.de.view === 'ciclo' && JSON.stringify(h0.exposto) === JSON.stringify(h0.de),
      R + 'C1 window.__catedraOrigemAcervo() devolve a origem guardada, igual ao estado (' + JSON.stringify(h0.exposto) + ')');
    const fLegis = await quadro(page, 'legis', () => typeof window.ctEnviarAoHost === 'function');
    if (!fLegis) ok(false, R + 'o legis-web carregou para o salto');
    else {
      const n = await nNativo();
      // o frame tenta impor uma origem sua (de e origem): o shim tem de ignorar as duas
      await fLegis.evaluate(() => window.ctEnviarAoHost({ type: 'ctAbrirAcervo', alvo: 'juris', termo: 'art. 5',
        de: { view: 'segundafase', rotulo: 'FORJADO pelo frame' }, origem: { view: 'oral', rotulo: 'FORJADO 2' } }));
      const sj = await ultima(n);
      const d = sj.msg && sj.msg.de;
      ok(!!sj.msg && sj.msg.alvo === 'juris' && !!d && d.view === 'ciclo' && d.rotulo === 'Voltar ao ciclo' && d.disc === 'Direito Civil',
        R + 'salto LEGIS web → JURIS chega ao handler nativo com a origem VIVA do host ({view:ciclo, "Voltar ao ciclo"}: ' + JSON.stringify(d) + ')');
      ok(!!sj.msg && !/FORJADO/.test(JSON.stringify(sj.msg)) && !!d && d.view !== 'segundafase' && d.view !== 'oral',
        R + 'salto LEGIS web → JURIS ignora a origem que o frame do LEGIS mandou (de e origem forjados)');
      // sem origem guardada no host, o salto chega SEM volta — nunca com a do frame
      await V(() => { window.__vo.app().setState({ acervoDe: null }); });
      const n2 = await nNativo();
      await fLegis.evaluate(() => window.ctEnviarAoHost({ type: 'ctAbrirAcervo', alvo: 'juris', termo: 'art. 6',
        de: { view: 'segundafase', rotulo: 'FORJADO pelo frame' } }));
      const sj2 = await ultima(n2);
      ok(!!sj2.msg && sj2.msg.alvo === 'juris' && sj2.msg.de === null,
        R + 'salto LEGIS web → JURIS sem origem no host chega com de=null, não com a do frame (' + JSON.stringify(sj2.msg && sj2.msg.de) + ')');
    }
  }
  // Daqui em diante roda nos DOIS shims (Mac e iPad): a prioridade e a sessão guiada com abas
  // nativas — o iPad fala com o handler catedraAcervo, mas o detector de abas é o catedraNav.

  /* a prioridade manda `origem` com view: passa inteira */
  await V(() => window.__catedraGoView('prioridade'));
  const fPrio = await quadro(page, 'prioridade', () => !!document.querySelector('.linha .acoes [data-lei]'));
  if (!fPrio) ok(false, R + 'o prioridade-web mostrou linha com lei');
  else {
    const disc = await fPrio.evaluate(() => { const l = [...document.querySelectorAll('.linha')].find(x => x.querySelector('.acoes [data-lei]'));
      l.setAttribute('data-vo-linha', '1'); if (!l.classList.contains('on')) l.querySelector('.lh').click(); return l.dataset.d; });
    const n3 = await nNativo();
    await clicar(fPrio.locator('[data-vo-linha="1"] .acoes [data-lei]'));
    const q1 = await ultima(n3);
    ok(!!q1.msg && !!q1.msg.de && q1.msg.de.view === 'prioridade' && q1.msg.de.disc === disc && q1.msg.de.rotulo === 'Voltar ao painel de prioridade',
      R + 'a prioridade chega com de {view:prioridade, disc, rótulo} (' + JSON.stringify(q1.msg && q1.msg.de) + ')');
    // a mesma ponte com a origem forjada (formato antigo `origem`): view do quadro, disc curta, sem rev
    const n4 = await nNativo();
    await fPrio.evaluate(() => window.ctEnviarAoHost({ type: 'ctAbrirAcervo', alvo: 'legis', termo: 'x',
      origem: { view: 'admin', disc: 'Direito Civil', rotulo: 'FORJADO pela prioridade', item: 'rv-a',
        rev: { queue: ['rv-a'], idx: 0, again: -3, hard: -2, good: -1, easy: -5, revealed: true } } }));
    const q2 = await ultima(n4);
    const d2 = q2.msg && q2.msg.de;
    ok(!!d2 && d2.view === 'prioridade' && d2.disc === 'Direito Civil' && d2.rotulo === 'Voltar ao painel de prioridade' && !('rev' in d2) && !('item' in d2)
      && !/FORJADO|admin/.test(JSON.stringify(q2.msg)),
      R + 'K2 prioridade-web com origem forjada (view "admin", rev negativo) chega normalizada: {view:prioridade, disc, rótulo do host}, sem rev (' + JSON.stringify(d2) + ')');
  }

  /* a revisão guiada: a mensagem é do próprio host (e.source === window) e já leva a view.
     O app nativo tem ABAS: o detector _temAbasNativas (window.webkit.messageHandlers.catedraNav)
     fica ligado aqui, apontando para o mesmo gravador do shim — a ida NÃO fecha a sessão. */
  await V(() => { window.webkit = { messageHandlers: window.__ctMH }; });
  const abas = await V(() => window.__vo.app()._temAbasNativas());
  ok(abas === true, R + 'o detector _temAbasNativas enxerga a ponte simulada (' + abas + ')');
  await V(async () => { const vo = window.__vo, app = vo.app(), hoje = app._hoje();
    const b = { color: 'var(--accent)', intervalo: 1, facilidade: 2.5, repeticoes: 0, dueDate: hoje, up: Date.now() };
    app.setState({ revSession: null, reviews: [
      { ...b, id: 'rv-a', disc: 'Direito Civil', topic: 'Primeiro item', due: -2 },
      { ...b, id: 'rv-b', disc: 'Direito Constitucional', topic: 'Segundo item, com tema', ref: 'Tema 698', due: -1 }] });
    await vo.w(300); window.__catedraGoView('revisoes'); await vo.naView('revisoes');
    app.startRevSession(); await vo.ate(() => app.state.revSession, 3000);
    app.revSkip(); await vo.w(150); app.revReveal(); await vo.w(300); });
  const s0 = await V(() => ({ antes: JSON.parse(JSON.stringify(window.__vo.app().state.revSession)), n: window.__ctNativo.length }));
  await clicar(page.locator('[role="dialog"][aria-label="Sessão de revisão"] button', { hasText: /^\s*Abrir no JURIS\s*$/ }));
  const s1 = await ultima(s0.n);
  const deRev = s1.msg && s1.msg.de;
  ok(!!deRev && deRev.view === 'revisoes' && deRev.rotulo === 'Voltar à revisão' && !!deRev.rev && deRev.rev.idx === s0.antes.idx && s1.view === 'revisoes',
    R + 'a revisão guiada chega com de {view:revisoes, retrato da sessão} e a web fica em Revisões (' + JSON.stringify(deRev && { view: deRev.view, idx: deRev.rev && deRev.rev.idx }) + ')');
  const s1b = await V(async () => { const vo = window.__vo; await vo.w(400); const rs = vo.app().state.revSession;
    return { sessao: rs ? JSON.parse(JSON.stringify(rs)) : null, modal: !!document.querySelector('[role="dialog"][aria-label="Sessão de revisão"]') }; });
  ok(!!s1b.sessao && s1b.modal && s1b.sessao.idx === s0.antes.idx && s1b.sessao.revealed === true
    && JSON.stringify(s1b.sessao.queue) === JSON.stringify(s0.antes.queue),
    R + 'com abas nativas, a ida ao JURIS NÃO fecha a sessão guiada (mesmo item, revelado; sessão aberta: ' + !!s1b.sessao + ', modal: ' + s1b.modal + ')');
  if (deRev) {
    const r = await page.evaluate('window.catedraVoltarAcervo(' + JSON.stringify(ordenar(deRev)) + ')');
    const s2 = await V(async () => { const vo = window.__vo; await vo.ate(() => vo.app().state.revSession, 3000);
      return { view: vo.app().state.view, sessao: vo.app().state.revSession, modal: !!document.querySelector('[role="dialog"][aria-label="Sessão de revisão"]') }; });
    const s = s2.sessao || {};
    ok(r === true && s2.view === 'revisoes' && s2.modal && s.idx === s0.antes.idx && (s.queue || [])[s.idx] === 'rv-b' && s.revealed === true,
      R + 'o botão nativo devolve à sessão guiada no MESMO item, revelado (idx=' + s.idx + ')');
  }
  // o retrato que volta pelo botão nativo é confiado só depois da régua: fila só com ids que
  // existem, índice e contadores inteiros ≥ 0, revealed só com true (_restaurarRevisao)
  {
    const r = await V(async () => { const vo = window.__vo, app = vo.app();
      app.closeRevSession(); await vo.w(200); window.__catedraGoView('ciclo'); await vo.naView('ciclo');
      const ok1 = window.catedraVoltarAcervo({ view: 'revisoes', rotulo: 'Voltar à revisão',
        rev: { queue: ['rv-a', { x: 1 }, 1, 'rv-b', 'nao-existe'], idx: '1.7', revealed: 'sim', again: -3, hard: '2.9', good: null, easy: -1 } });
      await vo.ate(() => app.state.revSession, 3000);
      const s = app.state.revSession ? JSON.parse(JSON.stringify(app.state.revSession)) : null;
      app.closeRevSession(); await vo.w(200);
      window.__catedraGoView('ciclo'); await vo.naView('ciclo');
      const ok2 = window.catedraVoltarAcervo({ view: 'revisoes', rotulo: 'Voltar à revisão', rev: { queue: [1, { a: 1 }], idx: 0, again: 5 } });
      await vo.w(500);
      return { ok1, s, ok2, sessao2: app.state.revSession, view2: app.state.view }; });
    const s = r.s || {};
    ok(r.ok1 === true && JSON.stringify(s.queue) === JSON.stringify(['rv-a', 'rv-b']) && s.idx === 1 && s.revealed === false
      && s.again === 0 && s.hard === 2 && s.good === 0 && s.easy === 0,
      R + 'o retrato forjado que volta pelo botão nativo é saneado: fila só com ids reais, idx inteiro, contadores ≥ 0, revealed só com true (' + JSON.stringify(r.s) + ')');
    ok(r.sessao2 === null, R + 'um retrato sem nenhum id real não abre sessão nenhuma (sessão: ' + JSON.stringify(r.sessao2) + ', view=' + r.view2 + ')');
  }
  await V(() => { try { delete window.webkit; } catch (_) { window.webkit = undefined; } });
}

// execução focal: `CT_PORT=8151 node tests/volta-origem.mjs` (CT_BROWSER=webkit roda também em file://)
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { iniciarServidor, lancarNavegador } = await import('./_infra.mjs');
  const { srv, url } = await iniciarServidor(RAIZ, +(process.env.CT_PORT || 8151));
  const { browser, motor } = await lancarNavegador();
  const page = await browser.newPage();
  const falhas = []; let passou = 0;
  const ok = (cond, label) => { console.log((cond ? '✓ ' : '✗ ') + label); if (!cond) falhas.push(label); else passou++; };
  const origens = [[url, 'http']];
  if (motor === 'webkit' || process.env.CT_FILE === '1') origens.push([pathToFileURL(RAIZ).href, 'file']);
  for (const [base, origem] of origens) {
    try { await testarVoltaOrigem(page, base, ok, { motor, origem }); }
    catch (e) { ok(false, 'VOLTA [' + motor + '] [' + origem + '] o roteiro correu sem exceção (' + String(e && e.message || e).split('\n')[0].slice(0, 180) + ')'); }
  }
  await browser.close(); srv.close();
  console.log('\n' + passou + ' ✓ · ' + falhas.length + ' ✗');
  console.log(falhas.length ? ('FALHAS: ' + falhas.length) : 'TODOS OS TESTES PASSARAM');
  process.exit(falhas.length ? 1 : 0);
}
