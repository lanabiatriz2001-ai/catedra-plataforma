/* ONBOARDING · importar backup fora da escolha principal (abertura para outros estudantes).
   O passo 3 oferecia "Importar meus dados" (backup JSON) como terceira opção, lado a lado com
   edital e ciclo — para quem acabou de chegar, isso não significa nada. A opção continua
   existindo, mas como link secundário ("Já usava o Cátedra?"), e a escolha principal fica
   com duas opções. */
export async function testarOnboardingImportar(page, base, ok) {
  const host = base + '/Catedra.dc.html';
  await page.goto(base + '/__semente');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('catedra:auth', '1'); });
  await page.goto(host); await page.waitForTimeout(1600);
  const m = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const app = window.__catedraApp;
    app.setState({ onboardStep: 3, onboardChoice: 'ciclo' }); await w(400);
    const radios = [...document.querySelectorAll('[role="radiogroup"] [role="radio"][data-c]')].map(b => b.dataset.c);
    const link = [...document.querySelectorAll('button')].find(b => /Importe seu backup/.test(b.textContent));
    const r = { radios, temLink: !!link, linkH: link ? Math.round(link.getBoundingClientRect().height) : 0 };
    let importou = 0; const orig = app.importData; app.importData = () => { importou++; };
    if (link) { link.click(); await w(500); }
    app.importData = orig;
    r.importou = importou; r.fechou = app.state.onboardStep === 0;
    return r;
  });
  ok(m.radios.length === 2 && m.radios.includes('edital') && m.radios.includes('ciclo') && !m.radios.includes('import'),
    'ONBOARDING/importar a escolha principal tem só edital e ciclo (' + m.radios.join(',') + ')');
  ok(m.temLink, 'ONBOARDING/importar há um link "Importe seu backup" para quem já usava');
  ok(m.linkH >= 44, 'ONBOARDING/importar o link tem alvo de toque ≥ 44 px (' + m.linkH + ')');
  ok(m.importou === 1 && m.fechou, 'ONBOARDING/importar o link fecha o onboarding e abre a importação (importou=' + m.importou + ', fechou=' + m.fechou + ')');
}
