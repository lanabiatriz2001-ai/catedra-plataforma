/* MENUS VAZIOS NO APP NATIVO (23/09/2026). O runtime monta o app primeiro pelo HTML que o
   navegador JÁ analisou — e o parser descarta todo <sc-for> dentro de <select>, deixando uma
   <option> vazia. Logo depois ele relê o arquivo cru (fetch(location.href)) e troca pelo
   template certo. No app nativo a página é file://: o fetch TRAZ o arquivo inteiro, mas com
   ok=false e status=0 (file:// não tem código HTTP), e o runtime descartava a resposta — todos
   os menus com <sc-for> ficavam com uma linha em branco e "Outra…" no iPad.
   Aqui o fetch da própria página é devolvido como o WKWebView devolve (status 0, corpo
   inteiro) e o menu de disciplina tem de listar o edital. */
export async function testarTemplateFileUrl(browser, base, ok, opcoes = {}) {
  const R = '[' + (opcoes.motor || '?') + '] ';
  const ctx = await browser.newContext();
  try {
    await ctx.addInitScript(() => {
      const orig = window.fetch.bind(window);
      window.fetch = (u, o) => {
        const url = String(u && u.url || u);
        if (url === location.href) return orig(u, o).then(r => r.text()).then(t => ({ ok: false, status: 0, text: () => Promise.resolve(t.split('>Outra…</option>').join('>Outra (lida do arquivo)</option>')) }));
        return orig(u, o);
      };
    });
    const page = await ctx.newPage();
    await page.goto(base + '/__semente');
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); });
    await page.goto(base + '/Catedra.dc.html'); await page.waitForTimeout(2000);
    const r = await page.evaluate(async () => {
      const w = ms => new Promise(res => setTimeout(res, ms)); const app = window.__catedraApp;
      app.setState({ edital: [{ id: 'a', disc: 'Direito Civil', topics: [] }, { id: 'b', disc: 'Direito Penal', topics: [] }], sessionModalOpen: true }); await w(900);
      const s = document.querySelector('select[aria-label="Disciplina"]');
      return s ? [...s.options].map(o => o.text) : null;
    });
    // O WebKit do Playwright e o Chromium NÃO descartam o <sc-for> na primeira análise (o do
    // iPadOS 27 descarta): o que se prova aqui é que a releitura com status 0 é APLICADA — o
    // arquivo relido traz um rótulo marcado, e ele tem de aparecer no menu.
    ok(!!r && r.includes('Outra (lida do arquivo)'),
      'TEMPLATE/file ' + R + 'a releitura do arquivo em file:// (status 0) substitui o template analisado (' + JSON.stringify(r) + ')');
    ok(!!r && r.includes('Direito Civil') && r.includes('Direito Penal') && !r.includes(''),
      'TEMPLATE/file ' + R + 'e o menu de disciplina lista o edital (' + JSON.stringify(r) + ')');
  } finally { await ctx.close(); }
}
