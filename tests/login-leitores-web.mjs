// O leitor real só recebe a autorização do host que montou seu iframe.
// A conta fictícia mora apenas nesta página interceptada pelo Playwright.
export async function testarLoginLeitoresWeb(browser, base, ok) {
  for (const tela of ['legis', 'juris']) {
    const ctx = await browser.newContext();
    const leitor = tela + '-web.html';
    const entrada = base + '/Catedra.dc.html';
    const folha = tela === 'legis' ? '.lawrow' : '.vcard';
    const dados = tela === 'legis' ? 'leitura-ativa.js' : 'juris-index.js';
    const recursos = [];
    ctx.on('request', req => recursos.push(new URL(req.url()).pathname));
    await ctx.route('**/Catedra.dc.html*', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html lang="pt-BR"><title>Cátedra de teste</title><body>' +
        '<p>Entrar no Cátedra</p><script>window.CatedraAuth={contaLeitor:""}</script></body></html>'
    }));
    const page = await ctx.newPage();
    try {
      await page.goto(base + '/' + leitor + '?q=Direito+civil');
      await page.waitForURL(url => url.pathname.endsWith('/Catedra.dc.html') && url.searchParams.get('leitor') === tela);
      const destino = new URL(page.url());
      ok(destino.origin === new URL(entrada).origin && destino.searchParams.get('q') === 'Direito civil',
        tela + ' aberto diretamente encaminha a busca para o login da plataforma');
      ok(!recursos.some(p => p.endsWith('/' + dados)), tela + ' não carrega o acervo antes do login');

      await page.evaluate(({tela, leitor}) => {
        localStorage.setItem('catedra:auth', '1');
        localStorage.setItem('catedra:_owner', 'dona-do-estudo');
        const frame = document.createElement('iframe');
        frame.dataset.ctFrame = leitor;
        frame.dataset.ctView = tela;
        frame.src = leitor;
        document.body.appendChild(frame);
      }, {tela, leitor});
      const iframe = page.frameLocator('iframe');
      await iframe.getByRole('link', { name: 'Entrar no Cátedra' }).waitFor();
      ok(await iframe.locator('.wrap').count() === 0 && !recursos.some(p => p.endsWith('/' + dados)),
        tela + ' mantém conteúdo e scripts inertes mesmo com marcas locais de conta');
      const confirmar = () => page.evaluate(() => {
        window.CatedraAuth.contaLeitor = 'dona-do-estudo';
        window.dispatchEvent(new CustomEvent('catedra:sessaoleitor'));
      });
      // A validação assíncrona termina depois de vencer a credencial, ainda sem o aviso
      // do timer (uma guia em segundo plano pode recebê-lo só quando ficar visível).
      let receberRecurso;
      const emCarga = new Promise(resolve => { receberRecurso = resolve; });
      await ctx.route('**/' + dados, receberRecurso, {times: 1});
      await confirmar();
      const recurso = await emCarga;
      await page.evaluate(() => { window.CatedraAuth.contaLeitor = ''; });
      const recarregou = page.waitForEvent('framenavigated', {
        predicate: frame => frame.parentFrame() === page.mainFrame() && frame.url().endsWith('/' + leitor)
      });
      await recurso.continue();
      await recarregou;
      await iframe.getByRole('link', { name: 'Entrar no Cátedra' }).waitFor();
      ok(await iframe.locator('.wrap').count() === 0,
        tela + ' descarta a abertura se a credencial vence durante o carregamento');
      await confirmar();
      await iframe.locator(folha).first().waitFor({timeout:15000});
      ok(await iframe.locator(folha).count() > 0, tela + ' abre o catálogo ao confirmar a sessão');
      const separou = await page.evaluate(() => {
        const filho = document.querySelector('iframe').contentWindow;
        const anterior = filho.ctArmazenamentoLeitor;
        const chave = 'catedra:nota-de-teste';
        anterior.setItem(chave, 'primeira');
        const gravou = localStorage.getItem(chave) === 'primeira';
        window.CatedraAuth.contaLeitor = '';
        window.dispatchEvent(new CustomEvent('catedra:sessaoleitor'));
        const fechou = !filho.document.querySelector('.wrap');
        anterior.setItem(chave, 'tardia');
        return gravou && fechou && anterior.getItem(chave) === null && localStorage.getItem(chave) === 'primeira';
      });
      await iframe.getByRole('link', { name: 'Entrar no Cátedra' }).waitFor();
      ok(separou && await iframe.locator('.wrap').count() === 0,
        tela + ' fecha na saída e impede leitura e escrita atrasadas do antigo titular');

      await page.evaluate(({tela, leitor}) => {
        window.CatedraAuth.contaLeitor = 'segunda-conta';
        const frame = document.createElement('iframe');
        frame.dataset.ctFrame = leitor;
        frame.dataset.ctView = tela;
        frame.setAttribute('sandbox', 'allow-scripts'); // origem opaca como no file:// isolado
        frame.src = leitor;
        document.querySelector('iframe').replaceWith(frame);
      }, {tela, leitor});
      await iframe.getByRole('link', { name: 'Entrar no Cátedra' }).waitFor();
      ok(await iframe.locator('.wrap').count() === 0,
        tela + ' mostra o login quando o iframe não pode verificar o pai');
    } finally { await ctx.close(); }
  }
}
