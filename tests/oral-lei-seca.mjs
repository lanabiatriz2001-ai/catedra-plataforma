/* PROVA ORAL → aba "Lei seca": a lista de leis TEM de aparecer.

   No iPad (WKWebView, file://) a aba abria e ficava sem lei nenhuma — ou presa em
   "Carregando o texto das leis…" — e nenhum teste via, porque a suíte só rodava em
   Chromium sobre http://localhost. Este teste abre o host logado, entra na Prova oral,
   clica em Lei seca e exige, nesta ordem: o aviso de carregamento sumir, pelo menos uma
   lei listada, contador de artigos acima de zero e um artigo sorteado com texto.

   É uma função, não um script, para rodar em qualquer par motor × origem: Chromium e
   WebKit, http://localhost (o site) e file:// (o app nativo, onde fetch de arquivo
   local falha e o acervo tem de chegar por <script>). As asserções são as mesmas nos
   quatro cantos — só o prefixo do rótulo diz onde rodou. */

const AVISO = 'Carregando o texto das leis…';

/**
 * @param page   página do Playwright (o chamador é dono do contexto)
 * @param base   'http://localhost:PORTA' ou 'file:///caminho/da/raiz' — sem barra final
 * @param ok     coletor de asserções da suíte: ok(cond, rótulo)
 * @param opcoes { motor: 'chromium'|'webkit', origem: 'http'|'file'|'bundle', arquivo } —
 *               motor/origem só para o rótulo; `arquivo` é o nome do HTML do host dentro de
 *               `base` (padrão Catedra.dc.html; o bundle do app nativo o chama index.html)
 */
export async function testarOralLeiSeca(page, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const origem = opcoes.origem || (String(base).startsWith('file:') ? 'file' : 'http');
  const arquivo = opcoes.arquivo || 'Catedra.dc.html';
  // 'bundle' é file:// também — o mesmo WKWebView, o mesmo fetch local barrado
  const emArquivo = origem === 'file' || origem === 'bundle';
  const R = 'ORAL LEI SECA [' + motor + '] [' + origem + '] ';
  const errosPagina = [];
  // Erros de JS no iPad não têm console: o app grava o último em catedra:_lastErr. Aqui há
  // console, então os dois canais entram no log — o do Playwright e o do próprio app.
  const aoErro = e => {
    const m = String(e && e.message || e);
    // Em file:// o WebKit relata como erro cada fetch de arquivo local que barra (o manifesto
    // das fatias, a releitura do próprio HTML pelo dc-runtime). É justamente o que o app
    // contorna caindo para <script> — fica no log como contexto, não como falha nem na conta.
    const esperado = emArquivo && /access control checks|Cross origin requests|Access-Control/i.test(m);
    if (!esperado) errosPagina.push(m);
    console.log(R + (esperado ? 'aviso (fetch local barrado em file://, esperado): ' : 'ERRO NA PÁGINA: ') + m);
  };
  page.on('pageerror', aoErro);

  try {
    const host = base + '/' + arquivo;
    // host logado, no padrão da suíte: gravar as chaves, recarregar, esperar o boot.
    await page.goto(host);
    await page.evaluate(() => {
      localStorage.setItem('catedra:auth', '1');
      localStorage.setItem('catedra:onboarded', '1');
      // área jurídica explícita: é a das 14 leis embutidas (leis-seca.js), o caso do iPad —
      // e a página compartilhada da suíte pode ter saído de um teste em outra área.
      localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
      // zera o registro do app para que o que sair no fim seja DESTE teste
      localStorage.removeItem('catedra:_lastErr');
    });
    await page.goto(host);
    await page.waitForTimeout(1600);

    const montou = await page.evaluate(() => typeof window.__catedraGoView === 'function' && !!document.getElementById('dc-root'));
    ok(montou, R + 'o host montou (dc-root no DOM e window.__catedraGoView disponível)');
    if (!montou) { await relatarUltimoErro(page, R, errosPagina); return; }

    await page.evaluate(() => window.__catedraGoView('oral'));
    await page.waitForTimeout(700);
    // clique pelo DOM (e não pelo Playwright): o app re-renderiza a cada tique do relógio
    // e um handle preso a um botão antigo falharia por elemento destacado
    const clicou = await page.evaluate(() => {
      const b = document.querySelector('#dc-root button[data-m="lei"]');
      if (!b) return false;
      b.click();
      return true;
    });
    ok(clicou, R + 'a aba "Lei seca" existe na Prova oral e recebeu o clique');
    if (!clicou) { await relatarUltimoErro(page, R, errosPagina); return; }

    // espera o aviso sumir — até 25 s, olhando a cada 250 ms. O acervo pesa (4,4 MB no
    // caminho monolítico), então o prazo é largo de propósito; o que não pode é ficar preso.
    const ini = Date.now();
    let carregando = true;
    while (Date.now() - ini < 25000) {
      carregando = await page.evaluate(aviso => {
        const raiz = document.getElementById('dc-root');
        return !!raiz && (raiz.innerText || '').includes(aviso);
      }, AVISO);
      if (!carregando) break;
      await page.waitForTimeout(250);
    }
    const seg = ((Date.now() - ini) / 1000).toFixed(1);
    ok(!carregando, R + 'o aviso "' + AVISO + '" sumiu (' + (carregando ? 'preso após ' : 'em ') + seg + ' s)');

    // Painel de lei seca = o cartão que contém "Sortear artigo" (ou, se ainda estiver
    // preso, o aviso). Escopo importa: a Prova oral tem outros chips button[data-v]
    // (minutos da arguição, ramo, tribunal), e contá-los daria um verde falso.
    const painel = await page.evaluate(aviso => {
      const raiz = document.getElementById('dc-root');
      if (!raiz) return null;
      const cards = [...raiz.querySelectorAll('.ct-card')]
        .filter(c => /Sortear artigo/.test(c.textContent) || c.textContent.includes(aviso));
      // o mais interno: um cartão que embrulhe o painel também casaria pelo texto
      const card = cards.find(c => !cards.some(o => o !== c && c.contains(o))) || null;
      if (!card) return null;
      const sel = card.querySelector('select');
      const leis = sel
        ? [...sel.querySelectorAll('option')].filter(o => o.value !== '').map(o => o.textContent.trim())
        : [...card.querySelectorAll('button[data-v]')].filter(b => b.getAttribute('data-v') !== '').map(b => b.textContent.trim());
      const m = (card.textContent || '').match(/(\d[\d.]*)\s+artigos?/);
      return { forma: sel ? 'select' : 'chips', leis, artigos: m ? parseInt(m[1].replace(/\D/g, ''), 10) : 0,
        texto: (card.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300) };
    }, AVISO);
    ok(!!painel, R + 'o painel de lei seca está na tela');
    const nLeis = painel ? painel.leis.length : 0;
    ok(nLeis >= 1, R + 'há pelo menos uma lei listada (' + nLeis + (painel ? ' em ' + painel.forma : '')
      + (nLeis ? ': ' + painel.leis.slice(0, 4).join(', ').slice(0, 120) + (nLeis > 4 ? '…' : '') : '') + ')');
    const nArt = painel ? painel.artigos : 0;
    ok(nArt > 0, R + 'o contador de artigos é maior que zero (' + nArt + ' artigos)');

    // Sortear um artigo: é o que a pessoa faz em seguida, e é o que falha em silêncio
    // quando CT_LEIS vem vazio ("Não achei artigo com esse filtro").
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('#dc-root button')].find(x => /Sortear artigo/.test(x.textContent));
      if (b) b.click();
    });
    await page.waitForTimeout(600);
    const dispositivo = await page.evaluate(() => {
      const rotulo = [...document.querySelectorAll('#dc-root .ct-eb')].find(e => /Dispositivo apontado pela banca/.test(e.textContent));
      if (!rotulo || !rotulo.parentElement) return null;
      const filhos = [...rotulo.parentElement.children].filter(c => c !== rotulo);
      // o texto do artigo ({{ oralArtTexto }}) é o bloco longo; rótulo e nome da lei são curtos
      const txt = filhos.map(c => (c.textContent || '').trim()).sort((a, b) => b.length - a.length)[0] || '';
      return { rot: (filhos[0] && filhos[0].textContent.trim()) || '', txt };
    });
    ok(!!dispositivo && dispositivo.txt.length >= 40,
      R + '"Sortear artigo" mostra o dispositivo com texto ('
      + (dispositivo ? dispositivo.rot.slice(0, 40) + ' · ' + dispositivo.txt.length + ' caracteres' : 'bloco não apareceu') + ')');

    // O que a pessoa veria, para o log contar a história quando algo falha.
    if (carregando || !painel || nLeis < 1 || nArt < 1 || !dispositivo || dispositivo.txt.length < 40) {
      const diag = await page.evaluate(() => {
        const w = window;
        return {
          CT_LEIS: Array.isArray(w.CT_LEIS) ? w.CT_LEIS.length : typeof w.CT_LEIS,
          CT_TREINO: !!w.CT_TREINO, CTDados: !!w.CTDados,
          erroNaTela: (document.body.innerText || '').match(/Não consegui carregar[^\n]*/)?.[0] || '',
        };
      }).catch(() => null);
      console.log(R + 'DIAGNÓSTICO: ' + JSON.stringify(diag) + (painel ? ' | painel: ' + painel.texto : ''));
    }
    await relatarUltimoErro(page, R, errosPagina);
  } finally {
    page.off('pageerror', aoErro);
  }
}

/* O app guarda o último erro em catedra:_lastErr (é o que o "Copiar relatório" dos Ajustes
   inclui). Se houver, vai para o log — no iPad é a única pista que sobra. */
async function relatarUltimoErro(page, R, errosPagina) {
  const ultimo = await page.evaluate(() => { try { return localStorage.getItem('catedra:_lastErr'); } catch (_) { return null; } }).catch(() => null);
  if (ultimo) console.log(R + 'catedra:_lastErr = ' + String(ultimo).replace(/\s+/g, ' ').slice(0, 600));
  if (errosPagina.length) console.log(R + errosPagina.length + ' erro(s) de página capturado(s) pelo Playwright');
}
