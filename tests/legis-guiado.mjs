/* LEGIS → leitura ativa → MODO GUIADO (LA3): abrir o leitor, ligar a leitura ativa, entrar
   em "Ler um por vez" e marcar por TOQUE DE PALAVRA — o caminho do iPad, onde seleção por
   teclado no WKWebView é limitada. É uma função, como tests/oral-lei-seca.mjs, para rodar
   em qualquer par motor × origem (Chromium/WebKit, http/file/bundle); as asserções são as
   mesmas e só o prefixo do rótulo diz onde rodou. O texto da lei vem de um fetch de
   mentira: o que se prova é o leitor, não a rede. */

const PARAS = ['Art. 1.239. Aquele que, não sendo proprietário de imóvel rural ou urbano, possua como sua, por cinco anos ininterruptos, sem oposição, área de terra em zona rural, adquirir-lhe-á a propriedade.',
  'Parágrafo único. O parágrafo do artigo, com sua própria regra.',
  'Art. 1.240. Outro artigo, com um inciso:', 'I - primeiro inciso do artigo com prazo de 10 dias.'];

/**
 * @param page   página do Playwright
 * @param base   'http://localhost:PORTA' ou 'file:///…' — sem barra final
 * @param ok     coletor: ok(cond, rótulo)
 * @param opcoes { motor, origem } — só para o rótulo
 */
export async function testarLegisGuiado(page, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const origem = opcoes.origem || (String(base).startsWith('file:') ? 'file' : 'http');
  const R = 'LEGIS GUIADO [' + motor + '] [' + origem + '] ';
  const erros = [];
  const aoErro = e => { const m = String(e && e.message || e); const esperado = origem !== 'http' && /access control checks|Cross origin|Access-Control|Failed to fetch/i.test(m); if (!esperado) erros.push(m); };
  page.on('pageerror', aoErro);
  try {
    await page.goto(base + '/legis-web.html?area=juridica');
    await page.waitForFunction(() => !!window.openReader && !!window.CT_LA && !!window.CT_LA_CANAL, null, { timeout: 15000 });
    await page.evaluate((paras) => {
      Object.keys(localStorage).filter(k => k.startsWith('catedra:leituras:') || k.startsWith('catedra:grifos:')).forEach(k => localStorage.removeItem(k));
      localStorage.removeItem('catedra:leitorLA');
      window.fetch = async () => ({ json: async () => ({ ok: true, paragraphs: paras }) });
      window.openReader(CAT.laws.find(l => /l10406/.test(l.u)));
    }, PARAS);
    await page.waitForFunction(() => document.querySelectorAll('#rdrDoc .gr').length >= 4, null, { timeout: 10000 });
    const r = await page.evaluate(async () => {
      const w = ms => new Promise(res => setTimeout(res, ms));
      const r = {};
      const LEI = CAT.laws.find(l => /l10406/.test(l.u)).u;
      const rdr = document.getElementById('rdr'), gd = document.getElementById('laGuiado');
      document.getElementById('rdrLA').click(); await w(80);
      r.ligou = rdr.classList.contains('la') && !!document.querySelector('#rdrDoc .la-legenda .la-guiar');
      document.querySelector('#rdrDoc .la-legenda .la-guiar').click(); await w(120);
      r.entrou = rdr.classList.contains('la-guiado') && getComputedStyle(gd).display !== 'none';
      r.documentoEscondidoNaoRemovido = getComputedStyle(document.getElementById('rdrScroll')).visibility === 'hidden' && document.querySelectorAll('#rdrDoc .gr').length === 4;
      r.bancada = !!gd.querySelector('.ct-bc .ct-bc-foco') && !!gd.querySelector('.ct-bc-apoio') && !!gd.querySelector('.la-gd-fila');
      const foco = () => gd.querySelector('.la-gd-texto');
      r.soOPrimeiroDispositivo = /Aquele que/.test(foco().textContent) && !/parágrafo do artigo/.test(foco().textContent) && /CC · Art\. 1\.239/.test(gd.querySelector('.la-norma').textContent);
      r.porPalavra = foco().querySelectorAll('.la-pal').length >= 20 && foco().textContent.replace(/\s+/g, ' ').trim().startsWith('Aquele que, não sendo');
      r.perguntaUmEmFoco = /Quem\?/.test(gd.querySelector('.la-perg').textContent) && gd.querySelector('.la-gd-chips .la-chip.atual').dataset.el === 'quem' && /Pergunta 1 de 7/.test(gd.textContent);
      r.contadorEBarra = /dispositivo 1 de 4/.test(gd.textContent) && !!gd.querySelector('.la-prog i') && /translate/.test(gd.querySelector('.la-prog i').getAttribute('style') || '');
      r.semCronometroNemCelebracao = !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(gd.textContent) && !/\d\d:\d\d/.test(gd.textContent) && !/ofensiva|parabéns|confete/i.test(gd.textContent);
      // toque por palavra: primeira palavra, depois a terceira — o intervalo vira a marca de "Quem?"
      const pals = () => [...foco().querySelectorAll('.la-pal')];
      pals()[0].click(); await w(60);
      r.primeiroToqueSeleciona = pals()[0].classList.contains('sel') && !!gd.querySelector('button[data-acao=marcar]');
      pals()[2].click(); await w(120);
      const it = window.CT_LA_CANAL.ler(LEI).find(x => x.gi === 0);
      r.segundoToqueMarcaNoElementoEmFoco = !!it && it.el.quem.length === 1 && it.el.quem[0].s === 0 && it.el.quem[0].t === 'Aquele que, não' && !gd.querySelector('.la-pal.sel');
      r.marcaAparecePintada = pals().slice(0, 3).every(p => p.classList.contains('mk') && p.classList.contains('la-quem'));
      r.avancouParaOQue = /O quê\?/.test(gd.querySelector('.la-perg').textContent) && gd.querySelector('.la-gd-chips .la-chip.atual').dataset.el === 'oque' && gd.querySelector('.la-gd-chips .la-chip[data-el=quem]').classList.contains('resp');
      // tecla 0 = não há → avança
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true })); await w(80);
      const it2 = window.CT_LA_CANAL.ler(LEI).find(x => x.gi === 0);
      r.zeroRegistraNaoHa = !!it2 && it2.nao.indexOf('oque') >= 0 && /Quando\?/.test(gd.querySelector('.la-perg').textContent);
      // tecla 5 pula direto para "Há prazo?"; seleção + Enter marca
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '5', bubbles: true })); await w(60);
      r.teclaVaiParaAPergunta = gd.querySelector('.la-gd-chips .la-chip.atual').dataset.el === 'prazo';
      // o primeiro toque repinta o foco: a segunda palavra tem de ser procurada DEPOIS dele
      pals().find(p => p.textContent === 'cinco').click(); await w(40);
      pals().find(p => p.textContent === 'anos').click(); await w(100);
      const it3 = window.CT_LA_CANAL.ler(LEI).find(x => x.gi === 0);
      r.marcaDoPrazo = !!it3 && it3.el.prazo.length === 1 && it3.el.prazo[0].t === 'cinco anos';
      // Esc sai devolvendo o documento, rolado no dispositivo atual
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await w(120);
      r.escSai = !rdr.classList.contains('la-guiado') && getComputedStyle(document.getElementById('rdrScroll')).visibility === 'visible' && getComputedStyle(gd).display === 'none';
      r.trilhoMostraOQueFoiFeito = document.querySelector('#rdrDoc .la-trilho[data-gi="0"] .la-chip[data-el=quem]').classList.contains('resp')
        && document.querySelector('#rdrDoc .la-trilho[data-gi="0"] .la-chip[data-el=oque]').classList.contains('nao');
      // o modo respeita prefers-reduced-motion: a única transição é de opacity ≤ 150 ms, dentro de no-preference
      const css = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch (e) { return []; } })
        .filter(x => x.media && /no-preference/.test(x.media.mediaText)).map(x => x.cssText).join('\n');
      r.transicaoSoOpacityCurta = /\.la-gd[^{]*\{[^}]*transition:\s*opacity[^;]*(\.15s|150ms)/.test(css) && !/\.la-gd[^{]*\{[^}]*transition:[^;}]*(transform|width|height|all)/.test(css);
      Object.keys(localStorage).filter(k => k.startsWith('catedra:leituras:')).forEach(k => localStorage.removeItem(k));
      localStorage.removeItem('catedra:leitorLA');
      return r;
    });
    for (const [k, v] of Object.entries(r)) ok(v, R + k);
    if (erros.length) console.log(R + 'erro(s) de página: ' + erros.slice(0, 3).join(' | ').slice(0, 300));
  } finally { page.off('pageerror', aoErro); }
}
