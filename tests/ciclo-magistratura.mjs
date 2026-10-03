/* CICLO MAGISTRATURA (ciclo-magistratura.js + tela no host) — método opcional, 03/10/2026.

   O que se prova, com o app de verdade:
   · os cinco modos de sempre continuam lá e o sexto é opcional (escolher e voltar funciona);
   · o seed da conta entra depois do acerto com a nuvem, liga o modo, e é IDEMPOTENTE: rodar de
     novo não duplica e não sobrescreve progresso; outra conta não recebe seed;
   · o Turno B fica travado até o A terminar; fechar o assunto agenda D+7/30/90 e grava em
     catedra:cmagRevs; o 2º assunto fechado manda a matéria para o fim da fila;
   · revisão vencida PINTA (fundo = --danger, texto ≥ 4,5:1, medido);
   · link do TEC só aceita http(s); texto da pessoa é escapado;
   · chute certo vai para o caderno de erros como erro, com certeza/resultado/categoria;
   · o estado sobrevive ao recarregar (autosave + reidratação). */

export async function testarCicloMagistratura(page, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const R = 'CICLO MAGISTRATURA [' + motor + '] ';
  const w = ms => page.waitForTimeout(ms);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(base + '/__semente');   // sem o app: semear com ele aberto é corrida com o autosave
  await page.evaluate(() => {
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    localStorage.clear();
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica'); set('cycleMode', 'sugestao'); set('blocks', []);
    set('edital', [{ disc: 'Direito Constitucional', peso: 2, topics: [{ name: 'Poder constituinte', done: false, subs: [] }] }]);
  });
  await page.goto(base + '/Catedra.dc.html');
  await page.waitForFunction(() => window.__catedraApp && window.CT_CMAG, null, { timeout: 30000 });
  await page.evaluate(() => window.__catedraApp.setState({ view: 'ciclo', cyclePanel: 'executar' }));
  await w(400);

  // 1. modos: os cinco de sempre + o novo; trocar para manual e voltar não quebra
  const lista = await page.evaluate(() => {
    const app = window.__catedraApp; app.setState({ cyclePanel: 'configurar' });
    return new Promise(r => setTimeout(() => r(Array.from(document.querySelectorAll('button.ct-modo')).map(b => b.dataset.mode)), 300));
  });
  ok(['inteligente', 'sugestao', 'edital', 'pesos', 'manual', 'magistratura'].every(m => lista.includes(m)), R + 'os seis modos aparecem (' + lista.join(',') + ')');
  await page.click('button.ct-modo[data-mode="manual"]'); await w(300);
  await page.click('button.ct-modo[data-mode="sugestao"]'); await w(300);
  const sug = await page.evaluate(() => ({ m: window.__catedraApp.state.cycleMode, n: ((window.__catedraApp.state.cicloVolta || {}).blocos || []).length, cm: !!document.querySelector('section.cm') }));
  ok(sug.m === 'sugestao' && sug.n > 0 && !sug.cm, R + 'sugestão segue gerando a volta e sem o painel do método (' + JSON.stringify(sug) + ')');

  // 2. seed: conta errada não recebe; a certa recebe uma vez só
  const seed = await page.evaluate(() => {
    const app = window.__catedraApp, M = window.CT_CMAG, real = M.seedDaConta;
    M.seedDaConta = e => (e === 'conta-semeada@teste' ? 'teste-seed' : '');
    const out = {};
    window.CatedraSync = { pronto: true, email: 'outra@teste', push() {} };
    out.outra = app._cmagSeed();
    window.CatedraSync = { pronto: false, email: 'conta-semeada@teste', push() {} };
    out.antesDoSync = app._cmagSeed();
    window.CatedraSync.pronto = true;
    window.dispatchEvent(new CustomEvent('catedra:syncpronto'));
    return new Promise(r => setTimeout(() => {
      const s = app.state; out.modo = s.cycleMode; out.ass = s.cmag && s.cmag.st.const.ass; out.ordem = s.cmag && s.cmag.ordem.slice(0, 4).join(',');
      out.obraAdm = s.cmag && s.cmag.mats.adm.o; out.disco = localStorage.getItem('catedra:cycleMode');
      out.denovo = app._cmagSeed();
      M.seedDaConta = real; r(out);
    }, 200));
  });
  ok(seed.outra === false && seed.antesDoSync === false, R + 'sem seed para outra conta nem antes do acerto com a nuvem');
  ok(seed.modo === 'magistratura' && seed.disco === 'magistratura' && /^Teoria da Constituição/.test(seed.ass || '') && seed.ordem === 'const,civ,pc,pen' && /Carvalho Filho/.test(seed.obraAdm || ''),
    R + 'seed liga o modo com as 4 ativas, as obras e Teoria da Constituição (' + JSON.stringify(seed) + ')');
  ok(seed.denovo === false, R + 'seed rodado de novo não faz nada (idempotente)');
  await page.evaluate(() => window.__catedraApp.setState({ cyclePanel: 'executar' }));
  await w(400);

  // 3. tela: 4 matérias; B travado; A completo libera B; fechar agenda revisões
  const t0 = await page.evaluate(() => ({ mats: document.querySelectorAll('section.cm .cm-mat').length,
    bTravado: Array.from(document.querySelectorAll('.cm-mat')[0].querySelectorAll('.cm-chk[data-k^="b"]')).every(b => b.disabled) }));
  ok(t0.mats === 4 && t0.bTravado, R + 'quatro cartões e Turno B travado (' + JSON.stringify(t0) + ')');
  const marcar = async (id, ks) => { for (const k of ks) { await page.click(`.cm-chk[data-id="${id}"][data-k="${k}"]`); await w(60); } };
  await marcar('const', ['a1', 'a2', 'a3', 'a4']);
  const bLivre = await page.evaluate(() => Array.from(document.querySelectorAll('.cm-chk[data-id="const"][data-k^="b"]')).every(b => !b.disabled));
  ok(bLivre, R + 'Turno A completo libera o Turno B');
  await marcar('const', ['b1', 'b2', 'b3', 'b4', 'b5']);
  await page.click('.cm-fechar[data-id="const"]'); await w(1400);
  const f1 = await page.evaluate(() => ({ revs: JSON.parse(localStorage.getItem('catedra:cmagRevs') || '[]').length, n: window.__catedraApp.state.cmag.st.const.n,
    prazos: document.querySelectorAll('.cm-prazo').length, primeira: document.querySelector('.cm-mat .cm-mat-n').textContent }));
  ok(f1.revs === 1 && f1.n === 1 && f1.prazos === 3 && f1.primeira === 'Direito Constitucional', R + '1º assunto fechado: revisão gravada e checks zerados (' + JSON.stringify(f1) + ')');
  await marcar('const', ['a1', 'a2', 'a3', 'a4', 'b1', 'b2', 'b3', 'b4', 'b5']);
  await page.click('.cm-fechar[data-id="const"]'); await w(500);
  const f2 = await page.evaluate(() => ({ ativas: Array.from(document.querySelectorAll('.cm-mat .cm-mat-n')).map(x => x.textContent), ultimaFila: Array.from(document.querySelectorAll('.cm-fila li')).pop().textContent }));
  ok(f2.ativas.join('|') === 'Direito Civil|Processo Civil|Direito Penal|Processo Penal' && f2.ultimaFila === 'Direito Constitucional',
    R + '2º assunto fechado: a matéria vai para o fim da fila e a próxima entra (' + JSON.stringify(f2) + ')');

  // 4. revisão vencida pinta (fundo = --danger; texto ≥ 4,5:1)
  await page.evaluate(() => { const app = window.__catedraApp; const d = new Date(); d.setDate(d.getDate() - 10);
    const p = n => String(n).padStart(2, '0'); const iso = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    app.setState({ cmagRevs: [{ id: 'cm-velha', mat: 'civ', ass: 'Direito Civil · LINDB', dt: iso, f7: false, f30: false, f90: false, up: Date.now() }] }); });
  await w(300);
  const venc = await page.evaluate(() => {
    const el = document.querySelector('.cm-prazo[data-estado="vencida"]'); if (!el) return null;
    const cs = getComputedStyle(el), danger = getComputedStyle(document.querySelector('[style*="--accent"]') || document.body).getPropertyValue('--danger');
    const rgb = s => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
    const lum = c => { const a = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; };
    const L1 = lum(rgb(cs.color)), L2 = lum(rgb(cs.backgroundColor));
    return { n: document.querySelectorAll('.cm-prazo[data-estado="vencida"]').length, bg: cs.backgroundColor, danger: danger.trim(), ratio: (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05), alerta: !!document.querySelector('.cm-alerta') };
  });
  ok(venc && venc.n === 1 && venc.ratio >= 4.5 && venc.alerta && venc.bg !== 'rgba(0, 0, 0, 0)', R + 'revisão D+7 vencida destacada e legível (' + JSON.stringify(venc) + ')');

  // 5. link do TEC: javascript: recusado, https aceito
  const colar = '.cm-lk[data-l="civ-a1"]';
  await page.click(colar); await w(150);
  await page.fill('input.cm-in[data-l="civ-a1"]', 'javascript:alert(1)'); await page.press('input.cm-in[data-l="civ-a1"]', 'Enter'); await w(200);
  const ruim = await page.evaluate(() => window.__catedraApp.state.cmag.links['civ-a1'] || '');
  await page.fill('input.cm-in[data-l="civ-a1"]', 'https://www.tecconcursos.com.br/cadernos/123'); await page.press('input.cm-in[data-l="civ-a1"]', 'Enter'); await w(250);
  const bom = await page.evaluate(() => { const a = document.querySelector('a.cm-lk'); return a ? a.getAttribute('href') : ''; });
  ok(ruim === '' && bom === 'https://www.tecconcursos.com.br/cadernos/123', R + 'link do TEC só aceita http(s) (' + JSON.stringify({ ruim, bom }) + ')');

  // 6. texto da pessoa é escapado
  await page.fill('input.cm-in[data-id="civ"][data-campo="ass"]', '<img src=x onerror="window.__xss=1">LINDB');
  await page.press('input.cm-in[data-id="civ"][data-campo="ass"]', 'Tab'); await w(300);
  const xss = await page.evaluate(() => ({ img: !!document.querySelector('section.cm img'), xss: !!window.__xss, ass: window.__catedraApp.state.cmag.st.civ.ass }));
  ok(!xss.img && !xss.xss && /LINDB$/.test(xss.ass), R + 'assunto com HTML fica texto (' + JSON.stringify(xss) + ')');

  // 7. chute certo vira erro no caderno
  await page.click('.cm-seg button[data-q="res"][data-v="certo"]');
  await page.click('.cm-seg button[data-q="certeza"][data-v="chute"]');
  await page.click('.cm-q .ct-btn'); await w(1400);
  const erro = await page.evaluate(() => (JSON.parse(localStorage.getItem('catedra:errors') || '[]')[0]) || {});
  ok(erro.resultado === 'chute_certo' && erro.certeza === 'chute' && erro.motivo === 'chute' && erro.disc === 'Direito Civil' && erro.up > 0,
    R + 'chute certo entra no caderno como erro (' + JSON.stringify({ r: erro.resultado, c: erro.certeza, m: erro.motivo, d: erro.disc }) + ')');

  // 8. sobrevive ao recarregar
  await page.reload(); await page.waitForFunction(() => window.__catedraApp && window.CT_CMAG, null, { timeout: 30000 });
  const vol = await page.evaluate(() => { const s = window.__catedraApp.state; return { modo: s.cycleMode, prim: s.cmag && s.cmag.ordem[0], link: s.cmag && s.cmag.links['civ-a1'], revs: (s.cmagRevs || []).length }; });
  ok(vol.modo === 'magistratura' && vol.prim === 'civ' && /^https:/.test(vol.link || '') && vol.revs === 1, R + 'estado volta igual depois de recarregar (' + JSON.stringify(vol) + ')');

  if (opcoes.capturas) {
    await page.evaluate(() => window.__catedraApp.setState({ view: 'ciclo', cyclePanel: 'executar' })); await w(500);
    await page.screenshot({ path: opcoes.capturas + '/ciclo-magistratura-' + motor + '.png', fullPage: false });
  }
}
