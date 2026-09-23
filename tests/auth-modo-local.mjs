/* MODO LOCAL DO PORTÃO (22/09/2026). O projeto do Supabase foi pausado por cobrança e quem
   tinha saído da conta ficou trancada fora ("Load failed" no login). Com o auth.js de verdade
   e um Supabase falso (tests/auth-modo-local-fixture.html):
   · erro de REDE no login oferece "Usar sem conta por enquanto"; erro de senha, não;
   · usar abre o app (portão fechado) e SOBREVIVE a fechar e abrir de novo;
   · o próximo login de verdade DESCARTA o que estava no aparelho antes de baixar a conta;
   · catedra:_modoLocal nunca sobe (está no EXCLUDE). */
export async function testarAuthModoLocal(page, base, ok) {
  const fix = base + '/tests/auth-modo-local-fixture.html';
  const gate = () => page.evaluate(() => { const g = document.getElementById('catedra-auth-gate'); return g ? g.style.display : 'sem-gate'; });
  const entrar = async () => {
    await page.fill('#cte', 'eu@exemplo.com'); await page.fill('#ctp', 'segredo123');
    await page.click('#cts'); await page.waitForTimeout(500);
  };
  page.on('dialog', d => d.accept());

  await page.goto(fix);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem('__fixLogin', 'rede'); });
  await page.goto(fix); await page.waitForTimeout(600);
  ok(!(await page.$('#ctlocal')), 'MODO LOCAL antes de tentar entrar, o botão não aparece');
  await entrar();
  const msg = await page.$eval('#cterr', e => e.textContent);
  ok(/servidor de contas não respondeu/.test(msg), 'MODO LOCAL "Load failed" vira mensagem clara (' + msg + ')');
  const btn = await page.$('#ctlocal');
  const alt = btn ? await btn.evaluate(b => Math.round(b.getBoundingClientRect().height)) : 0;
  ok(!!btn && alt >= 44, 'MODO LOCAL erro de rede oferece "Usar sem conta por enquanto" com alvo ≥ 44 px (' + alt + ')');

  await Promise.all([page.waitForNavigation(), page.click('#ctlocal')]);
  await page.waitForTimeout(700);
  ok((await gate()) === 'none', 'MODO LOCAL usar sem conta abre o app (portão fechado)');
  const ls = await page.evaluate(() => ({ m: localStorage.getItem('catedra:_modoLocal'), a: localStorage.getItem('catedra:auth') }));
  ok(ls.m === '1' && ls.a === '1', 'MODO LOCAL a marca fica no aparelho');
  await page.reload(); await page.waitForTimeout(700);
  ok((await gate()) === 'none', 'MODO LOCAL fechar e abrir de novo continua sem portão');

  // de volta ao login de verdade: com a marca e um backup importado no aparelho, entrar na
  // conta DESCARTA o aparelho antes de baixar a nuvem (a trava do onLogin, não a do Sair)
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem('__fixLogin', 'ok'); });
  await page.goto(fix); await page.waitForTimeout(600);
  await page.evaluate(() => { localStorage.setItem('catedra:_modoLocal', '1'); localStorage.setItem('catedra:edital', '[{"id":"x","disc":"Importado do backup"}]'); });
  await entrar(); await page.waitForTimeout(800);
  const depois = await page.evaluate(() => ({ ed: localStorage.getItem('catedra:edital'), m: localStorage.getItem('catedra:_modoLocal'), dono: localStorage.getItem('catedra:_owner') }));
  ok(depois.ed === null && depois.m === null && depois.dono === 'u-real',
    'MODO LOCAL o login de verdade descarta o aparelho antes de baixar a conta (edital=' + depois.ed + ', marca=' + depois.m + ', dono=' + depois.dono + ')');

  const exclui = await page.evaluate(async () => { const src = await (await fetch('/auth.js')).text(); return /'catedra:_modoLocal': 1/.test(src.slice(0, 3000)); });
  ok(exclui, 'MODO LOCAL catedra:_modoLocal está no EXCLUDE do sync');
}
