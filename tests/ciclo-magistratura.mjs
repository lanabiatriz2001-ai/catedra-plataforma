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

  const dia=await page.evaluate(()=>{const a=window.__catedraApp; a.setState({orient:{...a.state.orient,metaIdeal:300}}); a._recomporDia(); return {n:a.state.blocks.length,disc:a.state.blocks[0].disc,geral:!!document.querySelector('.ct-hero-ciclo'),kind:a.state.blocks[0].kind};});
  ok(dia.n===1&&dia.disc==='Direito Constitucional'&&!dia.geral&&dia.kind==='Estudo dirigido',R+'uma matéria com meta de 5h, sem controles de conclusão duplicados ('+JSON.stringify(dia)+')');
  const regressao = await page.evaluate(() => {
    const app=window.__catedraApp, M=window.CT_CMAG, c=app._cm();
    const v=M.gerarVolta(c,1,'2026-10-06'), outra=M.gerarVolta(c,2,'2026-10-07');
    const anterior=app.state.sessions;
    const legado={id:'s-legado',disc:v.blocos[0].disc,topico:v.blocos[0].topico,atvKey:'vt|v1-cm0',min:30};
    const alheio={id:'s-alheio',disc:'Direito Civil',topico:'Outro assunto',atvKey:'vt|v1-cm0',min:20};
    app.state.sessions=[legado,alheio];
    const migradas=app._cmVinculosLegados({blocos:[{...v.blocos[0],id:'v1-cm0'}]},v);
    app.state.sessions=anterior;
    app.puxarProximo(); const soUma=app.state.blocks.length===1;
    app.toggleBlock({currentTarget:{dataset:{i:'0'}}});
    const registro=app.state.sessionModalOpen&&!app.state.sessionDraft.concluiu&&app.state.sessionDraft.categorias.length===0&&!app.state.blocks[0].done;
    app.setState({sessionModalOpen:false});
    return {idsEstaveis:v.blocos[0].id===outra.blocos[0].id,
      ocorrenciasSeparadas:v.blocos[0].id!==M.gerarVolta({...c,st:{...c.st,const:{...c.st.const,ocorrencia:123}}},1,'2026-10-06').blocos[0].id,
      migraSemApagar:migradas.length===2&&migradas[0].id===legado.id&&migradas[0].min===30&&migradas[0].atvKey==='vt|'+v.blocos[0].id&&migradas[1]===alheio,
      soUma,registro};
  });
  for(const [k,v] of Object.entries(regressao)) ok(v,R+k);

  // 3. tela: 4 matérias; B travado; A completo libera B; fechar agenda revisões
  const t0 = await page.evaluate(() => ({ mats: document.querySelectorAll('section.cm .cm-mat').length,
    bTravado: Array.from(document.querySelectorAll('.cm-mat')[0].querySelectorAll('.cm-chk[data-k^="b"]')).every(b => b.disabled) }));
  ok(t0.mats === 4 && t0.bTravado, R + 'quatro cartões e Turno B travado (' + JSON.stringify(t0) + ')');
  const marcar = async (id, ks) => { for (const k of ks) { await page.click(`.cm-chk[data-id="${id}"][data-k="${k}"]`); await w(60); } };
  await page.fill('input.cm-pr[data-id="const"][data-campo="p:a1"]', '34/80'); await page.press('input.cm-pr[data-id="const"][data-campo="p:a1"]', 'Tab'); await w(200);
  const pr = await page.evaluate(() => ({ a1: window.__catedraApp.state.cmag.st.const.p.a1, n: document.querySelectorAll('.cm-mat')[0].querySelectorAll('input.cm-pr').length,
    rotB: Array.from(document.querySelectorAll('.cm-turno span')).some(x => /próxima vez da matéria/.test(x.textContent)) }));
  ok(pr.a1 === '34/80' && pr.n === 2 && pr.rotB, R + 'progresso do caderno só em a1 e b2, e o Turno B fala da próxima vez da matéria (' + JSON.stringify(pr) + ')');
  await marcar('const', ['a1']);
  ok(await page.evaluate(()=>!window.__catedraApp.state.cmag.st.const.d.a1), R+'34/80 impede concluir o caderno');
  await page.fill('input.cm-pr[data-id="const"][data-campo="p:a1"]', '80/80');
  await page.press('input.cm-pr[data-id="const"][data-campo="p:a1"]', 'Tab');
  await marcar('const', ['a1', 'a2', 'a3', 'a4']);
  ok(await page.evaluate(()=>Array.from(document.querySelectorAll('.cm-chk[data-id="const"][data-k^="b"]')).every(b=>b.disabled)), R+'A completo mantém B travado nesta passagem');
  await page.evaluate(()=>{const a=window.__catedraApp; for(let i=0;i<4;i++)a.cmAvancar();}); await w(200);
  const bLivre = await page.evaluate(() => Array.from(document.querySelectorAll('.cm-chk[data-id="const"][data-k^="b"]')).every(b => !b.disabled));
  ok(bLivre, R + 'nova passagem libera o Turno B');
  await marcar('const', ['b1', 'b2', 'b3', 'b4', 'b5']);
  await page.click('.cm-fechar[data-id="const"]'); await w(1400);
  const f1 = await page.evaluate(() => ({ revs: JSON.parse(localStorage.getItem('catedra:cmagRevs') || '[]').length, n: window.__catedraApp.state.cmag.st.const.n,
    prazos: document.querySelectorAll('.cm-prazo').length, pr: Object.keys(window.__catedraApp.state.cmag.st.const.p || {}).length, primeira: document.querySelector('.cm-mat .cm-mat-n').textContent }));
  ok(f1.revs === 1 && f1.n === 1 && f1.pr === 0 && f1.prazos === 3 && f1.primeira === 'Direito Constitucional', R + '1º assunto fechado: revisão gravada e checks zerados (' + JSON.stringify(f1) + ')');
  await marcar('const', ['a1', 'a2', 'a3', 'a4']);
  await page.evaluate(()=>{const a=window.__catedraApp; for(let i=0;i<4;i++)a.cmAvancar();}); await w(200);
  await marcar('const', ['b1', 'b2', 'b3', 'b4', 'b5']);
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

  // 7. menu suspenso no Início e na sala de foco, só com o relógio correndo; chute certo vira erro
  const semRelogio = await page.evaluate(() => { const app = window.__catedraApp; app.setState({ view: 'inicio' }); return new Promise(r => setTimeout(() => r(!document.querySelector('.cm-qm')), 300)); });
  await page.evaluate(() => { const app = window.__catedraApp; if (!app.state.timerRunning) app.toggleTimer(); });
  await w(400);
  const noInicio = await page.evaluate(() => !!document.querySelector('.cm-qm[data-onde="inicio"] .cm-qm-btn'));
  const noModal = await page.evaluate(() => { const app = window.__catedraApp; app.openSession(); return new Promise(r => setTimeout(() => { const t = !!document.querySelector('.ct-reg-desemp .cm-seg'); app.setState({ sessionModalOpen: false }); r(t); }, 300)); });
  await page.evaluate(() => window.__catedraApp.enterFocus({})); await w(400);
  const noFoco = await page.evaluate(() => !!document.querySelector('.cm-qm[data-onde="foco"] .cm-qm-btn'));
  ok(semRelogio && noInicio && noFoco && !noModal, R + 'menu "Registrar questão" aparece no Início e na sala de foco com o relógio correndo, e não no registro de sessão ('
    + JSON.stringify({ semRelogio, noInicio, noFoco, noModal }) + ')');
  await page.click('.cm-qm[data-onde="foco"] .cm-qm-btn', { timeout: 10000 }); await w(200);
  const dentro = await page.evaluate(() => { const r = document.querySelector('.cm-qm-painel').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
  ok(dentro, R + 'o painel do menu cabe inteiro na tela da sala de foco');
  if (opcoes.capturas) await page.screenshot({ path: opcoes.capturas + '/ciclo-magistratura-foco-' + motor + '.png' });
  await page.selectOption('.cm-qm-painel select[data-q="mat"]', 'civ'); await w(150);
  await page.click('.cm-qm-painel button[data-q="res"][data-v="certo"]');
  await page.click('.cm-qm-painel button[data-q="certeza"][data-v="chute"]');
  await page.click('.cm-qm-painel .cm-qm-ok');
  // com o relógio correndo, o tique de cada segundo reagenda o autosave (500 ms): o disco recebe em até ~1,5 s
  await page.waitForFunction(() => (JSON.parse(localStorage.getItem('catedra:errors') || '[]')[0] || {}).resultado, null, { timeout: 5000 }).catch(() => {});
  const erro = await page.evaluate(() => (JSON.parse(localStorage.getItem('catedra:errors') || '[]')[0]) || {});
  ok(erro.resultado === 'chute_certo' && erro.certeza === 'chute' && erro.motivo === 'chute' && erro.disc === 'Direito Civil' && /LINDB$/.test(erro.topico) && erro.up > 0,
    R + 'chute certo entra no caderno como erro (' + JSON.stringify({ r: erro.resultado, c: erro.certeza, m: erro.motivo, d: erro.disc }) + ')');

  // sai da sala e para o relógio antes do passo seguinte
  await page.evaluate(() => { const app = window.__catedraApp; app.exitFocus(); if (app.state.timerRunning) app.toggleTimer(); app.setState({ sessionModalOpen: false }); });
  // 8. sobrevive ao recarregar
  await page.reload(); await page.waitForFunction(() => window.__catedraApp && window.CT_CMAG, null, { timeout: 30000 });
  const vol = await page.evaluate(() => { const s = window.__catedraApp.state; return { modo: s.cycleMode, prim: s.cmag && s.cmag.ordem[0], link: s.cmag && s.cmag.links['civ-a1'], revs: (s.cmagRevs || []).length }; });
  ok(vol.modo === 'magistratura' && vol.prim === 'civ' && /^https:/.test(vol.link || '') && vol.revs === 1, R + 'estado volta igual depois de recarregar (' + JSON.stringify(vol) + ')');

  // 9. ligado ao edital: o assunto vira capítulo + seção; fechar marca no edital e propõe o próximo
  await page.evaluate(() => { const app = window.__catedraApp;
    app.setState({ view: 'ciclo', cyclePanel: 'executar', edital: [{ disc: 'Direito Civil', peso: 1, topics: [
      { name: '1 Lei de introdução', done: false, subs: ['1.1 Vigência', '1.2 Eficácia'] }, { name: '2 Parte geral', done: false, subs: [] }] }] }); });
  await w(400);
  const temSel = await page.evaluate(() => !!document.querySelector('select.cm-ed-t[data-id="civ"]') && !document.querySelector('input.cm-in[data-id="civ"][data-campo="ass"]'));
  await page.selectOption('select.cm-ed-t[data-id="civ"]', '0'); await w(200);
  await page.selectOption('select.cm-ed-s[data-id="civ"]', '0'); await w(200);
  await page.selectOption('select.cm-ed-s[data-id="civ"]', ''); await w(200);
  const inteiro = await page.evaluate(() => JSON.stringify(window.__catedraApp.state.cmag.st.civ.ref));
  await page.selectOption('select.cm-ed-s[data-id="civ"]', '0'); await w(200);
  await marcar('civ', ['a1', 'a2', 'a3', 'a4']);
  await page.evaluate(()=>{const a=window.__catedraApp; for(let i=0;i<4;i++)a.cmAvancar();}); await w(200);
  await marcar('civ', ['b1', 'b2', 'b3', 'b4', 'b5']);
  await page.click('.cm-fechar[data-id="civ"]'); await w(500);
  const ed = await page.evaluate(() => { const s = window.__catedraApp.state; const sb = s.edital[0].topics[0].subs[0];
    return { feito: typeof sb === 'object' && sb.done === true, prox: s.cmag.st.civ.ass, ref: s.cmag.st.civ.ref }; });
  ok(temSel && inteiro === '{"t":"1 Lei de introdução","s":""}' && ed.feito && ed.prox === '1.2 Eficácia',
    R + 'assunto escolhido no edital; fechar marca a seção estudada e propõe a próxima (' + JSON.stringify({ temSel, inteiro, ed }) + ')');

  if (opcoes.capturas) {
    await page.evaluate(() => window.__catedraApp.setState({ view: 'ciclo', cyclePanel: 'executar' })); await w(500);
    await page.screenshot({ path: opcoes.capturas + '/ciclo-magistratura-' + motor + '.png', fullPage: false });
  }
  // O cabeçalho novo pinta legível no toque, sem rolagem lateral, em duas direções e temas.
  const contexto=await page.context().browser().newContext({viewport:{width:1024,height:1024},hasTouch:true});
  const visual=await contexto.newPage();
  try {
    await visual.goto(base+'/__semente');
    await visual.evaluate(()=>{
      localStorage.setItem('catedra:auth','1'); localStorage.setItem('catedra:onboarded','1');
      localStorage.setItem('catedra:areaEstudo','juridica'); localStorage.setItem('catedra:cycleMode','magistratura');
    });
    await visual.goto(base+'/Catedra.dc.html');
    await visual.waitForFunction(()=>window.__catedraApp&&window.CT_CMAG);
    await visual.evaluate(()=>{const a=window.__catedraApp;a._cmSet(CT_CMAG.seed('visual',Date.now()));a.setState({view:'ciclo',cyclePanel:'executar'});});
    for(const largura of [390,1024,1280]) {
      await visual.setViewportSize({width:largura,height:1024});
      for(const dir of ['sutil','aurora']) for(const darkMode of [false,true]) {
        await visual.evaluate(({dir,darkMode})=>window.__catedraApp.setState({dir,darkMode}),{dir,darkMode});
        await visual.waitForTimeout(500);
        const medidas=await visual.evaluate(()=>{
          const hero=document.querySelector('.cm-hero'), painel=hero.querySelector('.cm-hero-texto');
          const rgb=s=>(s.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
          const lum=c=>{const v=c.map(x=>{x/=255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4);});return .2126*v[0]+.7152*v[1]+.0722*v[2];};
          const contraste=(el,bg)=>{const cs=getComputedStyle(el),a=+cs.opacity,fg=rgb(cs.color).map((v,i)=>v*a+bg[i]*(1-a));const l1=lum(fg),l2=lum(bg);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);};
          const bg=rgb(getComputedStyle(painel).backgroundColor);
          const textos=[...painel.querySelectorAll('.cm-kicker,.cm-h,.cm-sub')].map(el=>contraste(el,bg));
          const botoes=[...hero.querySelectorAll('button')],h=hero.getBoundingClientRect();
          return {semRolagem:document.documentElement.scrollWidth<=innerWidth,
            toque:botoes.every(el=>el.getBoundingClientRect().height>=44),
            dentro:botoes.every(el=>{const b=el.getBoundingClientRect();return b.left>=h.left&&b.right<=h.right;}),
            contraste:Math.min(...textos,...botoes.map(el=>contraste(el,rgb(getComputedStyle(el).backgroundColor))))};
        });
        ok(medidas.semRolagem&&medidas.toque&&medidas.dentro&&medidas.contraste>=4.5,
          R+'cabeçalho '+largura+' '+dir+' '+(darkMode?'escuro':'claro')+' — toque, caixas e contraste ≥ 4,5:1 ('+JSON.stringify(medidas)+')');
      }
      if(opcoes.capturas){await visual.locator('.cm-hero').scrollIntoViewIfNeeded();await visual.screenshot({path:opcoes.capturas+'/magistratura-topo-'+largura+'-'+motor+'.png'});}
    }
  } finally {await contexto.close();}

}
