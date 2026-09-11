/* iPad — os consertos de TOQUE do host (branch ipad-consertos), medidos em vez de presumidos.
   Cada caso reproduz um defeito visto no aparelho e prova que a correção PINTA/ACONTECE:
   · (a) o quadradinho de concluir do Edital continua um quadradinho (≤24px de desenho) e o
         dedo tem 44px — pelo ::after de .ct-alvo, medido com elementFromPoint;
   · (c) a gaveta do menu em retrato ROLA (overflow-y:auto) e reserva a barra do sistema;
   · (d) girar o iPad com a gaveta aberta não a deixa presa: retrato→paisagem→retrato fecha;
   · (e) Painel de prioridade e Simulado de 2ª fase entram no scroll único (o host não rola,
         o iframe é 100%);
   · (f) marcar trecho do enunciado da Redação por selectionchange (o caminho do toque, onde
         mouseup não vem) — e a seleção sobrevive aos re-renders de cada segundo;
   · (g) Sair com o auth.js presente delega ao CatedraAuth e NÃO mostra o login antigo;
   · (h) janela flutuante: dentro do nativo sem API de PiP o botão não aparece; com o shim
         do Mac, aparece;
   · (i) cronômetro e simulado restaurados depois de o processo morrer somam o tempo parado
         pela MESMA política do tique (mínimo 1s, teto 6h).
   O item 3 da lista original (fonte ≥16px para não dar zoom ao focar) foi refutado — o zoom
   ao focar é comportamento de iPhone, não de iPad — e por isso não há caso (b).
   Como tests/legis-guiado.mjs: é uma função para rodar em qualquer motor; o rótulo diz onde. */

const SEMENTE_EDITAL = JSON.stringify([{ disc: 'Direito Civil', color: '#2563eb', open: true, peso: '', questoes: '',
  topics: [{ name: 'Personalidade e capacidade', done: false }, { name: 'Prescrição e decadência', done: true },
    { name: 'Contratos em espécie', done: false }] }]);
const ENUNCIADO = 'TJGO — Sentença cível.\n\nA autora ajuizou ação de cobrança contra o réu, alegando inadimplemento de contrato de prestação de serviços firmado em 2022. O réu contestou, arguindo prescrição e, no mérito, a inexistência do débito. Decida.';

/**
 * @param pageDaSuite  página do Playwright (usada só para chegar ao browser: os casos abrem
 *                     contextos próprios, porque precisam de viewport de iPad e de toque)
 * @param base         'http://localhost:PORTA' — sem barra final
 * @param ok           coletor: ok(cond, rótulo)
 * @param ctx          { motor } — só para o rótulo
 */
export async function testarIpadToque(pageDaSuite, base, ok, ctx = {}) {
  const motor = ctx.motor || 'chromium';
  const R = 'IPAD TOQUE [' + motor + '] ';
  const browser = pageDaSuite.context().browser();
  const w = ms => new Promise(r => setTimeout(r, ms));

  /* Contexto de iPad: viewport de retrato ou paisagem, com toque (maxTouchPoints>0 é o que
     liga data-toque="1" no host). Semeia a partir de /__semente (404 na mesma origem): com
     o app vivo, semear é corrida com o autosave de 500ms. */
  async function abrir(viewport, extras = {}, caminho = '/Catedra.dc.html') {
    const c = await browser.newContext({ viewport, hasTouch: true, isMobile: false });
    const page = await c.newPage();
    const erros = [];
    page.on('pageerror', e => erros.push(String(e && e.message || e)));
    await page.goto(base + '/__semente');
    await page.evaluate((ex) => {
      localStorage.clear();
      localStorage.setItem('catedra:auth', '1');
      localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:aceite', JSON.stringify({ termos: 1, privacidade: 1, ts: Date.now() }));
      Object.keys(ex).forEach(k => localStorage.setItem(k, ex[k]));
    }, extras);
    await page.goto(base + caminho);
    await page.waitForFunction(() => !!window.__catedraApp && !!document.querySelector('[data-toque]'), null, { timeout: 20000 });
    // o atributo de toque é o que as regras de CSS leem; sem ele o caso mediria a versão de mouse
    await page.evaluate(() => { const a = window.__catedraApp; if (!a._toque) { a._toque = true; a.setState({}); } });
    await w(1300);
    return { c, page, erros };
  }
  const ir = (page, v) => page.evaluate((v) => { window.__catedraApp._irPara(v); }, v);

  /* ---------- (a) quadradinho do Edital: desenho pequeno, dedo com 44px ---------- */
  {
    const { c, page, erros } = await abrir({ width: 820, height: 1180 }, { 'catedra:edital': SEMENTE_EDITAL });
    try {
      await ir(page, 'edital'); await w(1300);
      const r = await page.evaluate(() => {
        const r = {};
        r.toque = document.querySelector('[data-toque="1"]') !== null;
        const bt = document.querySelector('.ct-scroll button.ct-miudo[data-d][data-i]');
        if (!bt) { r.achou = false; return r; }
        r.achou = true;
        bt.scrollIntoView({ block: 'center' });
        const b = bt.getBoundingClientRect(), cs = getComputedStyle(bt), af = getComputedStyle(bt, '::after');
        r.desenho = { w: b.width, h: b.height, minH: cs.minHeight };
        r.desenhoPequeno = b.height <= 24 && b.width <= 24;
        r.naoEsticado = cs.minHeight === '0px' || cs.minHeight === 'auto' || parseFloat(cs.minHeight) <= 24;
        r.afterMedido = parseFloat(af.height) >= 44 && parseFloat(af.width) >= 44 && cs.position === 'relative';
        // a prova de verdade: um ponto 16px abaixo do centro do quadradinho (fora do desenho,
        // dentro dos 44) devolve o próprio botão ao toque
        const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
        const alvo = document.elementFromPoint(cx, cy + 16);
        r.dedoAcerta = alvo === bt || (alvo && bt.contains(alvo));
        r.acimaTambem = (() => { const e = document.elementFromPoint(cx, cy - 16); return e === bt || (e && bt.contains(e)); })();
        // e o vizinho de texto na mesma linha continua com 44 de altura de linha? não — o que
        // interessa é que a LINHA não foi esticada a 44 pelo quadradinho
        r.linhaFolgada = b.height < 30;
        // um botão de faixa (com rótulo) dentro de <main> continua subindo a 44
        const txt = [...document.querySelectorAll('.ct-scroll button:not(.ct-miudo)')].find(x => /Adicionar|Importar|Nova|Salvar/i.test(x.textContent || '') && x.offsetParent);
        r.botaoDeTextoTem44 = !txt || txt.getBoundingClientRect().height >= 44;
        r.botaoTexto = txt ? (txt.textContent || '').trim().slice(0, 30) + ' ' + txt.getBoundingClientRect().height : 'nenhum';
        return r;
      });
      ok(r.toque, R + '(a) a raiz tem data-toque="1" no contexto com toque');
      ok(r.achou, R + '(a) o quadradinho de concluir do Edital está na tela');
      ok(r.desenhoPequeno, R + '(a) o desenho continua ≤24px (' + JSON.stringify(r.desenho) + ')');
      ok(r.naoEsticado, R + '(a) min-height não estica o quadradinho (' + (r.desenho && r.desenho.minH) + ')');
      ok(r.afterMedido, R + '(a) o ::after de .ct-alvo mede ≥44×44 (getComputedStyle)');
      ok(r.dedoAcerta && r.acimaTambem, R + '(a) 16px acima e abaixo do desenho, elementFromPoint devolve o botão (área de 44 real)');
      ok(r.botaoDeTextoTem44, R + '(a) botão com rótulo dentro de <main> segue com 44px (' + r.botaoTexto + ')');
      ok(!erros.length, R + '(a) sem erro de página (' + erros.slice(0, 2).join(' | ').slice(0, 160) + ')');
    } finally { await c.close(); }
  }

  /* ---------- (c) gaveta rola · (d) girar fecha a gaveta ---------- */
  {
    const { c, page } = await abrir({ width: 820, height: 1180 });
    try {
      // a gaveta abre com transição de .28s: sob carga (a suíte inteira, dois motores) 400ms
      // não bastavam e o transform ainda estava no meio do caminho — por isso a espera folgada
      const r1 = await page.evaluate(() => {
        const a = window.__catedraApp; a.setState({ menuOpen: true });
        return new Promise(res => setTimeout(() => {
          const aside = document.querySelector('aside'), cs = getComputedStyle(aside);
          const m = /matrix\(([^)]+)\)/.exec(cs.transform); const tx = m ? parseFloat(m[1].split(',')[4]) : 0;
          res({ isMobile: a.state.isMobile, overflowY: cs.overflowY, position: cs.position, padB: parseFloat(cs.paddingBottom),
            contain: cs.overscrollBehaviorY || cs.overscrollBehavior || '', aberta: tx > -1, tx,
            backdrop: !!document.querySelector('button[aria-label="Fechar o menu"]') });
        }, 1200));
      });
      ok(r1.isMobile, R + '(c) 820px é modo celular (gaveta fixa)');
      ok(r1.position === 'fixed' && r1.overflowY === 'auto', R + '(c) a gaveta é fixed e rola por dentro (overflow-y:auto, medido ' + r1.overflowY + ')');
      ok(r1.padB >= 20, R + '(c) padding inferior ≥20px (safe-area) — ' + r1.padB);
      ok(r1.aberta && r1.backdrop, R + '(d) antes de girar: gaveta aberta com fundo escurecido (translateX ' + Math.round(r1.tx) + ')');
      // gira para paisagem (modo desktop), depois volta ao retrato
      await page.setViewportSize({ width: 1180, height: 820 }); await w(900);
      const r2 = await page.evaluate(() => { const a = window.__catedraApp; return { isMobile: a.state.isMobile, menuOpen: a.state.menuOpen }; });
      ok(!r2.isMobile && !r2.menuOpen, R + '(d) em paisagem o modo é desktop e menuOpen caiu para false');
      await page.setViewportSize({ width: 820, height: 1180 }); await w(900);
      const r3 = await page.evaluate(() => {
        const a = window.__catedraApp; const aside = document.querySelector('aside'), cs = getComputedStyle(aside);
        const m = /matrix\(([^)]+)\)/.exec(cs.transform); const tx = m ? parseFloat(m[1].split(',')[4]) : 0;
        return { isMobile: a.state.isMobile, menuOpen: a.state.menuOpen, tx, backdrop: !!document.querySelector('button[aria-label="Fechar o menu"]') };
      });
      ok(r3.isMobile && !r3.menuOpen, R + '(d) de volta ao retrato a gaveta continua fechada no estado');
      ok(r3.tx < -200 && !r3.backdrop, R + '(d) …e fora da tela, sem fundo escurecido (translateX ' + Math.round(r3.tx) + ')');
      // camadas ancoradas na barra também fecham ao trocar de modo
      const r4 = await page.evaluate(() => { const a = window.__catedraApp; a.setState({ notifOpen: true, userMenuOpen: true, pomoMenuOpen: true }); return true; });
      await page.setViewportSize({ width: 1180, height: 820 }); await w(900);
      const r5 = await page.evaluate(() => { const s = window.__catedraApp.state; return !s.notifOpen && !s.userMenuOpen && !s.pomoMenuOpen; });
      ok(r4 && r5, R + '(d) notificações, menu da conta e menu do cronômetro fecham ao trocar de modo');
    } finally { await c.close(); }
  }

  /* ---------- (e) prioridade e 2ª fase: scroll único ---------- */
  {
    const { c, page } = await abrir({ width: 820, height: 1180 });
    try {
      for (const v of ['prioridade', 'segundafase']) {
        await ir(page, v); await w(1500);
        const r = await page.evaluate((v) => {
          const a = window.__catedraApp; const sc = document.querySelector('main .ct-scroll'); const cs = getComputedStyle(sc);
          const fr = document.querySelector('iframe[data-ct-view="' + v + '"]'); const mold = fr && fr.parentElement;
          return { view: a.state.view, overflowY: cs.overflowY, naoRola: sc.scrollHeight <= sc.clientHeight + 2,
            h100: fr && fr.style.height === '100%', display: fr && getComputedStyle(fr).display,
            frameEnche: !!fr && !!mold && Math.abs(fr.getBoundingClientRect().height - mold.getBoundingClientRect().height) <= 2 && mold.getBoundingClientRect().height > 300 };
        }, v);
        ok(r.view === v, R + '(e) ' + v + ' abriu');
        ok(r.overflowY === 'hidden' && r.naoRola, R + '(e) ' + v + ': o .ct-scroll não rola (overflow ' + r.overflowY + ')');
        ok(r.h100 && r.display === 'block' && r.frameEnche, R + '(e) ' + v + ': o iframe tem height 100% e enche a moldura');
      }
    } finally { await c.close(); }
  }

  /* ---------- (f) Redação: selectionchange preenche o trecho ---------- */
  {
    const { c, page } = await abrir({ width: 1180, height: 820 }, { 'catedra:redEnunciado': JSON.stringify(ENUNCIADO) });
    try {
      await ir(page, 'redacao'); await w(1300);
      const r = await page.evaluate(async () => {
        const w = ms => new Promise(r => setTimeout(r, ms));
        const a = window.__catedraApp; const r = {};
        const host = document.getElementById('ct-enun'); r.enun = !!host;
        if (!host) return r;
        r.antes = !a.state.redSelTxt;
        // o que o toque longo produz: a seleção muda SEM mouseup
        const alvo = [...host.querySelectorAll('*')].find(el => /ação de cobrança/.test(el.textContent || '') && el.children.length === 0) || host.firstElementChild;
        document.getSelection().removeAllRanges(); document.getSelection().selectAllChildren(alvo);
        document.dispatchEvent(new Event('selectionchange'));
        await w(400);
        r.preencheu = /ação de cobrança/.test(a.state.redSelTxt || '');
        r.dica = (document.body.textContent || '').indexOf('escolha a cor') >= 0;
        // dois renders depois (o relógio re-renderiza a cada segundo): seleção viva e estado igual
        const antes = a.state.redSelTxt; await w(2400);
        const sel = document.getSelection();
        r.sobrevive = !sel.isCollapsed && a.state.redSelTxt === antes && host.contains(sel.anchorNode);
        // marcar a cor usa o trecho e limpa
        const cor = document.querySelector('button.ct-miudo[data-cor]'); r.corTemAlvo = !!cor && parseFloat(getComputedStyle(cor, '::after').height) >= 44 && cor.getBoundingClientRect().height <= 32;
        cor.click(); await w(300);
        r.marcou = !a.state.redSelTxt && a._marcasDaProva().length === 1 && /ação de cobrança/.test(a._marcasDaProva()[0].txt);
        return r;
      });
      ok(r.enun, R + '(f) o enunciado está na tela');
      ok(r.antes && r.preencheu, R + '(f) selectionchange (sem mouseup) preenche redSelTxt com o trecho');
      ok(r.dica, R + '(f) a dica passa a "escolha a cor"');
      ok(r.sobrevive, R + '(f) dois re-renders depois a seleção continua viva e o estado não piscou');
      ok(r.corTemAlvo, R + '(f) a bolinha de cor (30px) tem alvo de 44 sem esticar');
      ok(r.marcou, R + '(f) tocar a cor marca o trecho e limpa a seleção');
    } finally { await c.close(); }
  }

  /* ---------- (g) Sair · (h) janela flutuante · (i) restauração dos cronômetros ---------- */
  {
    const hoje = (() => { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); })();
    const ts = Date.now() - 10 * 60 * 1000;   // o processo morreu há 10 minutos
    const { c, page } = await abrir({ width: 1180, height: 820 }, {
      ct_timer: JSON.stringify({ sec: 100, studied: 100, mode: 'livre', phase: 'foco', cycles: 0, running: true, ts, d: hoje, pf: 25, pb: 5 }),
      ct_prova: JSON.stringify({ sec: 100, min: 240, d: hoje, running: true, ts }),
    });
    try {
      const r = await page.evaluate(async () => {
        const w = ms => new Promise(r => setTimeout(r, ms));
        const a = window.__catedraApp; const r = {};
        // (i) política única: 1s no mínimo, 6h no máximo
        r.gapMin = a._gapSeg(Date.now()) === 1;
        r.gapTeto = a._gapSeg(Date.now() - 7 * 3600 * 1000) === 6 * 3600;
        r.gap10 = Math.abs(a._gapSeg(Date.now() - 600 * 1000) - 600) <= 1;
        r.timer = a.state.timerSeconds; r.timerRodando = a.state.timerRunning;
        r.timerSomouGap = a.state.timerSeconds >= 690 && a.state.timerSeconds <= 720;
        r.prova = a.state.provaSeconds;
        r.provaSomouGap = a.state.provaMode && !a.state.provaRunning && a.state.provaSeconds >= 690 && a.state.provaSeconds <= 720;
        if (a._tick) { clearInterval(a._tick); a._tick = null; }
        a.setState({ timerRunning: false, provaMode: false, provaRunning: false });
        // (g) Sair com o auth.js presente: delega e NÃO derruba loggedIn
        window.__saiu = 0; window.CatedraAuth = { logout() { window.__saiu++; } };
        a.logout(); await w(200);
        r.delegou = window.__saiu === 1 && a.state.loggedIn === true && localStorage.getItem('catedra:auth') === '1';
        // o que se mede é a tela de login PINTADA (o botão "Entrar no protótipo" com caixa), não
        // uma palavra no texto da página — "visitante" aparece em outros cantos do app
        const loginPinta = () => [...document.querySelectorAll('button')].some(b => /Entrar no protótipo/.test(b.textContent || '') && b.getClientRects().length > 0 && b.getBoundingClientRect().height > 0);
        r.semLoginAntigo = !loginPinta();
        delete window.CatedraAuth;
        // (h) nativo sem API de PiP: o botão some; com o shim do Mac, volta
        const capt = HTMLCanvasElement.prototype.captureStream; const docPip = window.documentPictureInPicture;
        window.webkit = { messageHandlers: { catedraNav: { postMessage() {} } } };
        try { delete HTMLCanvasElement.prototype.captureStream; } catch (_) {}
        try { delete window.documentPictureInPicture; } catch (_) {}
        if (window.documentPictureInPicture) { try { Object.defineProperty(window, 'documentPictureInPicture', { value: undefined, configurable: true }); } catch (_) {} }
        r.nativoDetectado = a._temAbasNativas();
        r.semPip = !a._mostraPiP();
        a.setState({ pomoMenuOpen: true }); await w(1300);
        r.botaoSumiu = ![...document.querySelectorAll('button')].some(b => /Janela flutuante/.test(b.textContent || ''));
        window.documentPictureInPicture = { requestWindow() { return Promise.reject(new Error('shim')); } };
        r.comShim = a._mostraPiP();
        a.setState({}); await w(1300);
        r.botaoVoltou = [...document.querySelectorAll('button')].some(b => /Janela flutuante/.test(b.textContent || ''));
        // mensagem honesta quando o atalho do host chega mesmo assim
        try { Object.defineProperty(window, 'documentPictureInPicture', { value: undefined, configurable: true }); } catch (_) {}
        await a.togglePiP(); await w(200);
        r.msg = String(a.state.pipMsg || '');
        r.msgHonesta = /não está disponível neste aparelho/.test(r.msg) && !/Safari|Tela cheia/.test(r.msg);
        // limpa
        delete window.webkit; a.setState({ pomoMenuOpen: false });
        if (capt) HTMLCanvasElement.prototype.captureStream = capt;
        if (docPip) { try { Object.defineProperty(window, 'documentPictureInPicture', { value: docPip, configurable: true }); } catch (_) {} }
        // (g) sem CatedraAuth: o de sempre
        a.logout(); await w(400);
        r.semAuthSai = a.state.loggedIn === false && localStorage.getItem('catedra:auth') === null && loginPinta();
        return r;
      });
      ok(r.gapMin && r.gapTeto && r.gap10, R + '(i) _gapSeg: mínimo 1s, teto 6h, 10min = 600s');
      ok(r.timerSomouGap && r.timerRodando, R + '(i) cronômetro restaurado rodando somou os 10 min parado (' + r.timer + 's)');
      ok(r.provaSomouGap, R + '(i) simulado restaurado somou os 10 min e reabre pausado (' + r.prova + 's)');
      ok(r.delegou, R + '(g) Sair com CatedraAuth delega ao auth.js e mantém loggedIn');
      ok(r.semLoginAntigo, R + '(g) …sem mostrar a tela de login antiga');
      ok(r.nativoDetectado && r.semPip && r.botaoSumiu, R + '(h) nativo sem API de PiP: "Janela flutuante" não é renderizada');
      ok(r.comShim && r.botaoVoltou, R + '(h) com o shim do Mac (documentPictureInPicture) o botão volta');
      ok(r.msgHonesta, R + '(h) a mensagem não manda para o Safari nem para uma Tela cheia (' + r.msg.slice(0, 70) + ')');
      ok(r.semAuthSai, R + '(g) sem CatedraAuth o Sair antigo continua valendo');
    } finally { await c.close(); }
  }

  /* ---------- (j) backup automático no iPad: lembra, não abre o seletor ---------- */
  {
    const { c, page } = await abrir({ width: 820, height: 1180 }, { 'catedra:prefs': JSON.stringify({ backupAuto: true }) });
    try {
      const r = await page.evaluate(async () => {
        const w = ms => new Promise(r => setTimeout(r, ms));
        const a = window.__catedraApp; const r = {}; window.__ponte = [];
        const ponte = { postMessage(m) { window.__ponte.push(m && m.acao); return Promise.resolve({ ok: true, onde: 'Arquivos' }); } };
        localStorage.removeItem('catedra:_bkpAutoTs'); localStorage.removeItem('catedra:_bkpAutoTry');
        // iPad: catedraBackup (seletor de Arquivos) + catedraAcervo (só o iPad tem)
        window.webkit = { messageHandlers: { catedraNav: { postMessage() {} }, catedraBackup: ponte, catedraAcervo: { postMessage() {} } } };
        r.ehIpad = a._nativoBackup() && a._backupNativoPedeDialogo();
        a._backupAutoSemanal(); await w(300);
        r.naoAbriuSeletor = window.__ponte.length === 0;
        const toast = document.querySelector('[role="status"]');
        const bt = toast && [...toast.querySelectorAll('button')].find(b => /Ajustes/.test(b.textContent || ''));
        r.lembrete = !!toast && /backup/i.test(toast.textContent || '') && /Ajustes › Dados/.test(toast.textContent || '') && !!bt && getComputedStyle(toast).opacity === '1';
        r.carimbou = Math.abs(+localStorage.getItem('catedra:_bkpAutoTry') - Date.now()) < 5000;
        // de novo, na mesma semana: silêncio
        toast.style.opacity = '0'; a._backupAutoSemanal(); await w(300);
        r.umaVezPorSemana = getComputedStyle(toast).opacity !== '1' && window.__ponte.length === 0;
        // o botão do lembrete leva aos Ajustes; o botão MANUAL continua abrindo o seletor
        bt.click(); await w(600);
        r.foiParaAjustes = a.state.view === 'ajustes';
        await a.backupICloud(); await w(100);
        r.manualAbre = window.__ponte.length === 1 && window.__ponte[0] === 'salvar';
        // Mac: sem catedraAcervo, o automático grava direto (como antes)
        localStorage.removeItem('catedra:_bkpAutoTry'); window.__ponte.length = 0;
        delete window.webkit.messageHandlers.catedraAcervo;
        a._backupAutoSemanal(); await w(300);
        r.macSegueAutomatico = window.__ponte.length === 1 && window.__ponte[0] === 'salvar';
        delete window.webkit;
        return r;
      });
      ok(r.ehIpad, R + '(j) a ponte do iPad é reconhecida (catedraBackup + catedraAcervo)');
      ok(r.naoAbriuSeletor && r.lembrete, R + '(j) no iPad o backup automático NÃO chama a ponte: mostra o lembrete "Ajustes › Dados" com botão');
      ok(r.carimbou && r.umaVezPorSemana, R + '(j) o lembrete é um por semana (carimbo em catedra:_bkpAutoTry)');
      ok(r.foiParaAjustes, R + '(j) o botão do lembrete abre os Ajustes');
      ok(r.manualAbre, R + '(j) o botão manual "Salvar" continua abrindo o seletor');
      ok(r.macSegueAutomatico, R + '(j) no Mac (sem catedraAcervo) o automático segue gravando sozinho');
    } finally { await c.close(); }
  }
}
