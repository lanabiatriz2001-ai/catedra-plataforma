/* O MODO "USAR SEM CONTA" FOI REMOVIDO (01/10/2026). Ele nasceu em 22/09, com o Supabase
   pausado por cobrança, e descartava o aparelho no login seguinte — o iPad da dona ficou com
   uma sessão de 09/09 que só existia nele. Com o auth.js de verdade e um Supabase falso
   (tests/auth-modo-local-fixture.html):
   · erro de REDE no login dá a mensagem clara e NÃO oferece mais "Usar sem conta";
   · aparelho que sobrou com a marca perde a marca na abertura e não abre sem conta;
   · o login seguinte JUNTA o que o aparelho tem com a nuvem (nada é descartado) e deixa
     pendente para subir;
   · catedra:_modoLocal segue no EXCLUDE (legado: nunca sobe se sobrar). */
export async function testarAuthModoLocal(page, base, ok) {
  const fix = base + '/tests/auth-modo-local-fixture.html';
  const gate = () => page.evaluate(() => { const g = document.getElementById('catedra-auth-gate'); return g ? g.style.display : 'sem-gate'; });
  const entrar = async () => {
    await page.fill('#cte', 'eu@exemplo.com'); await page.fill('#ctp', 'segredo123');
    await page.click('#cts'); await page.waitForTimeout(500);
  };
  page.on('dialog', d => d.accept());

  // 1. erro de rede no login: mensagem clara, sem o botão do modo
  await page.goto(fix);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem('__fixLogin', 'rede'); });
  await page.goto(fix); await page.waitForTimeout(600);
  await entrar();
  const msg = await page.$eval('#cterr', e => e.textContent);
  ok(/servidor de contas não respondeu/.test(msg), 'SEM MODO LOCAL "Load failed" vira mensagem clara (' + msg + ')');
  const botao = await page.evaluate(() => !!document.getElementById('ctlocal') || [...document.querySelectorAll('button')].some(b => /sem conta/i.test(b.textContent)));
  ok(!botao, 'SEM MODO LOCAL erro de rede não oferece mais "Usar sem conta por enquanto"');
  ok((await gate()) !== 'none', 'SEM MODO LOCAL sem login o portão continua fechado');

  // 2. aparelho que sobrou com a marca (o iPad da dona): a abertura apaga a marca e não abre
  //    o app sem conta; o dado local fica
  await page.evaluate(() => {
    localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem('__fixLogin', 'ok');
    localStorage.setItem('catedra:_modoLocal', '1'); localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
    localStorage.setItem('catedra:_dirty', '1');
    localStorage.setItem('catedra:sessions', JSON.stringify([{ id: 's-so-no-ipad', date: '2026-09-09', disc: 'Direito Penal', min: 500 }]));
    // a conta já tem uma sessão na nuvem, que o aparelho não tem
    sessionStorage.setItem('__fixNuvem', JSON.stringify({ updated_at: '2026-10-01T19:58:39Z',
      data: { 'catedra:sessions': JSON.stringify([{ id: 's-da-nuvem', date: '2026-08-31', disc: 'Direito Civil', min: 60 }]) } }));
  });
  await page.goto(fix); await page.waitForTimeout(700);
  const aberto = await page.evaluate(() => ({ m: localStorage.getItem('catedra:_modoLocal'), s: localStorage.getItem('catedra:sessions') }));
  ok(aberto.m === null, 'SEM MODO LOCAL a abertura apaga a marca que sobrou (marca=' + aberto.m + ')');
  ok((await gate()) !== 'none', 'SEM MODO LOCAL aparelho com a marca não abre mais sem conta (pede o login)');
  ok(!!aberto.s && aberto.s.includes('s-so-no-ipad'), 'SEM MODO LOCAL a abertura não mexe no estudo do aparelho');

  // 3. o login seguinte junta o aparelho com a nuvem: as duas sessões ficam, e o que só o
  //    aparelho tinha fica pendente para subir
  await entrar(); await page.waitForTimeout(1500);
  const depois = await page.evaluate(() => {
    let ids = []; try { ids = JSON.parse(localStorage.getItem('catedra:sessions') || '[]').map(x => x.id); } catch (_) {}
    return { ids, dirty: localStorage.getItem('catedra:_dirty'), dono: localStorage.getItem('catedra:_owner'), m: localStorage.getItem('catedra:_modoLocal') };
  });
  ok(depois.ids.includes('s-so-no-ipad') && depois.ids.includes('s-da-nuvem'),
    'SEM MODO LOCAL o login junta o aparelho com a nuvem, sem descartar (' + depois.ids.join(', ') + ')');
  ok(depois.dirty === '1', 'SEM MODO LOCAL o que só o aparelho tinha fica pendente para subir (dirty=' + depois.dirty + ')');
  ok(depois.dono === 'u-real' && depois.m === null, 'SEM MODO LOCAL o aparelho passa a ser da conta e a marca não volta (dono=' + depois.dono + ')');

  const fonte = await page.evaluate(async () => (await (await fetch('/auth.js')).text()));
  ok(/'catedra:_modoLocal': 1/.test(fonte.slice(0, 3500)), 'SEM MODO LOCAL catedra:_modoLocal segue no EXCLUDE do sync');
  ok(!/sem conta por enquanto|oferecerModoLocal|modoLocalAtivo|ctlocal/.test(fonte), 'SEM MODO LOCAL o auth.js não tem mais o modo nem o botão');
}
