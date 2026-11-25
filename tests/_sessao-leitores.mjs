/** Um teste de aparência ou conteúdo abre o componente sozinho e fornece sua dependência
 * de autorização. A substituição vale só para o documento navegado, inclusive em file://.
 * As próximas navegações e os iframes continuam usando o controle de acesso real. */
export async function abrirComponenteDoLeitor(page, url) {
  if (!/\/(?:legis|juris)-web\.html$/.test(new URL(url).pathname)) return page.goto(url);
  const fixture = await page.addInitScript((destino) => {
    if (window.top !== window || location.href !== destino) return;
    Object.defineProperty(window, 'ctAutorizarLeitor', {
      get: () => (tela, iniciar) => iniciar(window.localStorage, () => true),
      set: () => {}
    });
  }, new URL(url).href);
  try {
    await page.goto(url);
    await page.waitForFunction(() => document.getElementById('ct-entrada-leitor')?.hidden === true);
  } finally { await fixture.dispose(); }
}

/** Simula apenas o titular já autenticado no host do teste de integração. A montagem,
 * a origem da mensagem e o acesso ao storage passam pela guarda verdadeira do leitor. */
export async function definirContaLeitora(page) {
  await page.evaluate(() => {
    const auth = window.CatedraAuth || (window.CatedraAuth = {});
    Object.defineProperty(auth, 'contaLeitor', {
      configurable: true, value: '018fab90-0000-4000-8000-000000000001'
    });
  });
}

/** O proxy WebKit pode isolar cada file://. Só nesse caso o resultado esperado é a
 * entrada de login visível, com os dados e a lógica do leitor ainda inertes. */
export async function verificarEntradaEmArquivoOpaco(frame, tela) {
  return frame.evaluate((tela) => {
    if (location.protocol !== 'file:') return null;
    try { void window.parent.document; return null; }
    catch (e) { if (e.name !== 'SecurityError') throw e; }
    const link = document.querySelector('#ct-entrada-leitor a');
    return !!link && link.getBoundingClientRect().width > 0 &&
      new URL(link.href).searchParams.get('leitor') === tela &&
      !!document.getElementById('ct-conteudo-leitor') &&
      !window.ctArmazenamentoLeitor && !document.querySelector('.lawrow, .vcard');
  }, tela);
}
