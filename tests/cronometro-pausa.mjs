/* CRONÔMETRO — O TEMPO PAUSADO APARECE, MAS NÃO CONTA (03/10/2026)

   Pedido da dona: "incluir no relógio o tempo que o cronômetro fica pausado, no final só
   registrar o tempo líquido de efetivo estudo". O que se prova, com o relógio da página fixo
   (page.clock, padrão de registro-sessao.mjs) e o tempo avançado à mão (fastForward: o
   cronômetro é ancorado no Date.now, então UM tique cobre o salto; a deriva real é de segundos):
   · 10 min rodando e pausa: o relógio fica em 10:00 e a linha "Em pausa · 03:00" conta ao vivo;
   · a pausa sobrevive ao fechamento do app (ct_timer) e segue contando desde o carimbo;
   · retomar acumula ("Pausas · …") sem que um segundo de pausa entre no relógio;
   · o registro oferecido e gravado é o LÍQUIDO (12 min), nunca o bruto (15 min);
   · zerar some com a linha de pausa. */

export async function testarCronometroPausa(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const arquivo = opcoes.arquivo || 'Catedra.dc.html';
  const R = 'PAUSA [' + motor + '] ';
  const ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  const t0 = new Date(); t0.setHours(14, 0, 0, 0);
  await page.clock.install({ time: t0 });
  try {
    await page.goto(base + '/__semente');
    await page.evaluate(() => {
      localStorage.clear();
      const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
      set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
      set('edital', [{ disc: 'Direito Civil', peso: 2, questoes: 15, topics: [{ name: 'Obrigações', done: false, subs: [] }] }]);
      set('sessions', []); set('reviews', []); set('errors', []);
    });
    await page.goto(base + '/' + arquivo); await page.waitForTimeout(1800);

    const botao = re => page.evaluate(src => { const b = [...document.querySelectorAll('.cth-timer button')].find(x => new RegExp(src).test(x.textContent || '')); if (b) b.click(); return !!b; }, re.source);
    const le = () => page.evaluate(() => ({
      relogio: ((document.querySelector('.cth-clock') || {}).textContent || '').trim(),
      pausa: ((document.querySelector('.cth-timer [data-pausa]') || {}).textContent || '').trim(),
      cor: (() => { const e = document.querySelector('.cth-timer [data-pausa]'); return e ? getComputedStyle(e).color : ''; })(),
    }));

    ok(await botao(/Iniciar/), R + 'o cronômetro da tela inicial tem o botão Iniciar');
    await page.clock.fastForward(10 * 60 * 1000); await page.waitForTimeout(300);
    let v = await le();
    ok(/^10:0\d$/.test(v.relogio) && !v.pausa, R + '10 min rodando: relógio em 10:00 e sem linha de pausa (' + JSON.stringify(v) + ')');

    await botao(/Pausar/); await page.waitForTimeout(300);
    await page.clock.fastForward(3 * 60 * 1000); await page.waitForTimeout(300);
    v = await le();
    const parado = v.relogio;
    ok(/^10:0\d$/.test(v.relogio), R + 'em pausa o relógio NÃO anda (' + v.relogio + ')');
    ok(/^Em pausa · 03:0\d fora da conta$/.test(v.pausa), R + 'a linha conta a pausa ao vivo: "' + v.pausa + '"');
    ok(/rgba?\(255, 255, 255/.test(v.cor), R + 'a linha de pausa pinta em claro sobre o herói (' + v.cor + ')');

    const salvo = await page.evaluate(() => JSON.parse(localStorage.getItem('ct_timer') || '{}'));
    ok(salvo.running === false && +salvo.pd > 0, R + 'a pausa em curso fica gravada no ct_timer (pd) para sobreviver ao fechamento');

    await botao(/Retomar/); await page.waitForTimeout(300);
    await page.clock.fastForward(2 * 60 * 1000); await page.waitForTimeout(300);
    v = await le();
    ok(/^12:0\d$/.test(v.relogio), R + 'retomado, só o estudo entra no relógio: 12:00 (' + v.relogio + ')');
    ok(/^Pausas · 03:0\d fora da conta$/.test(v.pausa), R + 'o total de pausas fica visível e parado: "' + v.pausa + '"');

    await botao(/Pausar/); await page.waitForTimeout(600);
    const reg = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const txt = document.body.innerText;
      const oferta = (txt.match(/Registrar \d+ min[^\n?]*\?/) || [''])[0];
      const b = [...document.querySelectorAll('button')].find(x => (x.textContent || '').trim() === 'Registrar');
      if (b) b.click(); await w(1500);
      return { oferta, sessoes: JSON.parse(localStorage.getItem('catedra:sessions') || '[]') };
    });
    ok(/^Registrar 12 min/.test(reg.oferta), R + 'a oferta de registro é o líquido: "' + reg.oferta + '"');
    const s = reg.sessoes[reg.sessoes.length - 1] || {};
    ok(reg.sessoes.length === 1 && +s.min === 12, R + 'a sessão gravada tem 12 min, sem as pausas (' + JSON.stringify({ n: reg.sessoes.length, min: s.min }) + ')');
    await page.clock.fastForward(2000); await page.waitForTimeout(300);
    v = await le();
    ok(v.relogio === '00:00' && !v.pausa, R + 'registrado e zerado, a linha de pausa some (' + JSON.stringify(v) + ')');
  } finally { await ctx.close(); }
  await reabre(pageDaSuite, base, ok, R, arquivo);
}

// Fechou o app em pausa: ao reabrir, o relógio fica onde parou e a pausa segue contando desde o
// carimbo gravado. Contexto SEM relógio falso — recarregar com page.clock instalado trava a página.
async function reabre(pageDaSuite, base, ok, R, arquivo) {
  const ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(base + '/__semente');
    await page.evaluate(() => {
      localStorage.clear();
      const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
      set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
      const d = new Date(), p = n => String(n).padStart(2, '0');
      const hoje = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
      localStorage.setItem('ct_timer', JSON.stringify({ sec: 600, studied: 600, mode: 'livre', phase: 'foco', cycles: 0, running: false,
        ts: Date.now() - 180000, d: hoje, pf: 25, pb: 5, ps: 60, pd: Date.now() - 180000 }));
    });
    await page.goto(base + '/' + arquivo); await page.waitForTimeout(2500);
    const v = await page.evaluate(() => ({
      relogio: ((document.querySelector('.cth-clock') || {}).textContent || '').trim(),
      pausa: ((document.querySelector('.cth-timer [data-pausa]') || {}).textContent || '').trim() }));
    ok(v.relogio === '10:00' && /^Em pausa · 04:0\d fora da conta$/.test(v.pausa),
      R + 'reaberto em pausa: relógio em 10:00 e pausa = 1 min anterior + 3 min desde o fechamento (' + JSON.stringify(v) + ')');
  } finally { await ctx.close(); }
}
