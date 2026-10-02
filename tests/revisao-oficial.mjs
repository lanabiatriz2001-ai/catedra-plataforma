/* REVISÃO OFICIAL — o sentinela (Planalto/STF/STJ) nos três produtos.

   Cátedra: o painel "Revisão oficial" com filtros (o resumo compacto do Início, que abre este
   painel, é do PR #175 e tem o teste dele em tests/novidades-central.mjs). LEGIS: "Mudanças
   oficiais" com texto anterior × atual. JURIS: "Informativos oficiais" como fila editorial.
   Mesmo vocabulário de status nos três: Detectado · Conferir · Conferido · Falhou · Parcial.

   O pacote real (novidades.js) pode estar vazio; aqui ele é trocado por uma fixture via
   ctx.route — host e satélites carregam o mesmo arquivo, então a troca vale nos três.
   Tudo MEDE (caixas, contraste, scrollWidth); presença no DOM não prova que pinta. */

const FIX = {
  geradoEm: '2026-09-30T10:00:00.000Z',
  fontes: {
    planalto: { resultado: 'novidades', ultimaTentativa: '2026-09-30T10:00:00.000Z', ultimoSucesso: '2026-09-30T10:00:00.000Z',
      limites: ['não descobre normas novas sozinho — norma nova entra pelo catálogo do CátedraLEGIS'] },
    stf: { resultado: 'novidades', ultimaTentativa: '2026-09-30T10:00:00.000Z', ultimoSucesso: '2026-09-30T10:00:00.000Z',
      limites: ['cobre o Informativo, não a base de repercussão geral'] },
    stj: { resultado: 'falha', erro: 'fetch failed', ultimaTentativa: '2026-09-30T10:00:00.000Z', ultimoSucesso: '2026-09-20T10:00:00.000Z',
      limites: ['súmulas do STJ NÃO entram neste sentinela'] },
  },
  itens: [
    { id: 'PLN-CF-art5-aaa', fonte: 'planalto', tipo: 'alteracao', norma: 'CF', normaNome: 'Constituição Federal', disp: 'Art. 5º',
      titulo: 'Art. 5º — CF', antes: 'Art. 5º Todos são iguais perante a lei, sem distinção de qualquer natureza.',
      depois: 'Art. 5º Todos são iguais perante a lei, sem distinção de qualquer espécie.', modificadora: 'Emenda Constitucional nº 999, de 2026',
      vigencia: 'em-vigor', vigenciaMotivo: 'texto compilado sem marcador de vigência própria', revisar: false, urlOficial: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm', detectadoEm: '2026-09-30T10:00:00.000Z' },
    { id: 'PLN-CF-art250-bbb', fonte: 'planalto', tipo: 'inclusao', norma: 'CF', normaNome: 'Constituição Federal', disp: 'Art. 250-A', rotulo: 'Art. 250-A do ADCT',
      titulo: 'Art. 250-A — CF', antes: null, depois: 'Art. 250-A Regra nova. (Vigência) a partir de 01/01/2027',
      vigencia: 'aguardando', vigenciaEm: '01/01/2027', vigenciaMotivo: 'a página traz marcador de vigência e data futura',
      revisar: true, urlOficial: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm', detectadoEm: '2026-09-30T10:00:00.000Z' },
    { id: 'INF-STF-1190', fonte: 'stf', tipo: 'informativo', norma: 'STF', normaNome: 'STF — Informativo', disp: 'Informativo 1190 do STF',
      titulo: 'Informativo 1190 do STF', revisar: true, pendencia: 'edição detectada na fonte oficial; o conteúdo entra no acervo quando o script rodar',
      urlOficial: 'https://www.stf.jus.br/arquivo/informativo/documento/informativo1190.htm', detectadoEm: '2026-09-30T10:00:00.000Z' },
    { id: 'INF-STF-1189', fonte: 'stf', tipo: 'informativo', norma: 'STF', normaNome: 'STF — Informativo', disp: 'Informativo 1189 do STF',
      titulo: 'Informativo 1189 do STF', revisar: false, incorporado: true,
      urlOficial: 'https://www.stf.jus.br/arquivo/informativo/documento/informativo1189.htm', detectadoEm: '2026-09-29T10:00:00.000Z' },
  ],
};
const VAZIO = { geradoEm: null, fontes: {}, itens: [] };
const corpo = (n) => '/* fixture */ window.CT_NOVIDADES = ' + JSON.stringify(n) + ';';

// contraste WCAG entre duas cores computadas (rgb/rgba; alfa composto sobre o fundo)
const CONTRASTE = `(function(){
  function rgb(s){ s=String(s); const m=(s.match(/[\\d.]+/g)||[0,0,0]).map(Number); if(/^color\\(srgb/.test(s)){ return [m[0]*255,m[1]*255,m[2]*255].concat(m.length>3?[m[3]]:[]); } return m; }
  function lum(c){ const f=v=>{ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }; return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]); }
  function fundo(el){ let e=el; while(e){ const b=rgb(getComputedStyle(e).backgroundColor); if(b.length<4||b[3]>0.5) return b; e=e.parentElement; } return [255,255,255]; }
  window.__ctContraste=function(el){ const c=rgb(getComputedStyle(el).color), b=fundo(el); const L1=lum(c), L2=lum(b); return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05); };
})();`;

const SEM_NOME = `(function(raiz){ return Array.from(raiz.querySelectorAll('button,a[href],[role="button"]')).filter(b=>{
  const r=b.getBoundingClientRect(); if(!r.width&&!r.height) return false;
  const n=(b.getAttribute('aria-label')||b.textContent||'').trim(); return !n; }).length; })`;

export async function testarRevisaoOficial(browser, base, ok, { motor = 'chromium' } = {}) {
  const tag = `OFICIAL [${motor}]`;
  const novoCtx = async (pacote, area, largura = 1280) => {
    const ctx = await browser.newContext({ viewport: { width: largura, height: 900 } });
    await ctx.route('**/novidades.js', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: corpo(pacote) }));
    await ctx.addInitScript((a) => { try {
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:areaEstudo', JSON.stringify(a));
      if (!sessionStorage.getItem('__ofLimpo')) { localStorage.removeItem('catedra:novidLidas'); sessionStorage.setItem('__ofLimpo', '1'); }
    } catch (_) {} }, area);
    await ctx.addInitScript(CONTRASTE);
    return ctx;
  };
  const abrirApp = async (pg) => {
    await pg.goto(base + '/Catedra.dc.html');
    await pg.waitForFunction(() => !!window.__catedraApp && !!window.CT_REVISAO_OFICIAL, null, { timeout: 30000 });
    await pg.evaluate(() => window.__catedraGoView('inicio')); await pg.waitForTimeout(900);
  };

  // ── 1/2. painel "Revisão oficial" (o botão do Início chama oficialPainelAbrir) ───────
  {
    const ctx = await novoCtx(FIX, 'juridica'); const pg = await ctx.newPage();
    await abrirApp(pg);
    // o botão do resumo do Início (#175) abre ESTE diálogo, não a Central
    const btn = await pg.$('#ct-fontes-oficiais #ct-of-abrir');
    if (btn) { await btn.click(); await pg.waitForTimeout(400); }
    ok(!!btn && await pg.evaluate(() => !!document.getElementById('ct-revisao-oficial') && window.__catedraApp.state.view === 'inicio'),
      `${tag} 1 "Ver revisão oficial" do Início abre o diálogo da revisão oficial`);
    if (!btn) { await pg.evaluate(() => window.__catedraApp.oficialPainelAbrir()); await pg.waitForTimeout(400); }
    const p = await pg.evaluate((SEM) => {
      const d = document.getElementById('ct-revisao-oficial'); if (!d) return { aberto: false };
      const itens = Array.from(d.querySelectorAll('#ct-of-lista article'));
      const vocab = ['Detectado', 'Conferir', 'Conferido', 'No acervo', 'Falhou', 'Parcial'];
      const sts = itens.map(a => a.querySelector('.ct-of-st').textContent.trim());
      const rev = itens.find(a => a.dataset.id === 'INF-STF-1190');
      const cob = d.querySelector('#ct-of-cobertura');
      const frase = d.querySelector('.ct-of-frase');
      return { aberto: d.getBoundingClientRect().height > 100, dialog: d.getAttribute('role') === 'dialog',
        n: itens.length, vocab: sts.every(x => vocab.includes(x)),
        revisarNaoPublicado: !!rev && rev.querySelector('.ct-of-st').textContent.trim() === 'Conferir' && !/publicad/i.test(rev.innerText.replace(/não|nunca/gi, '')),
        dataDeteccao: itens.every(a => /detectado em/.test(a.innerText)),
        tipos: itens.map(a => a.querySelector('.ct-of-tipo').textContent.trim()).join('|'),
        limites: cob ? cob.querySelectorAll('.ct-of-item').length === 3 && /súmulas do STJ/.test(cob.innerText)
          && Array.from(cob.querySelectorAll('.ct-of-resumo')).every(e => e.getBoundingClientRect().height >= 12 && window.__ctContraste(e) >= 4.5) : false,
        frase: frase ? /só entra no acervo depois de conferido/.test(frase.textContent) && window.__ctContraste(frase) >= 4.5 : false,
        selo: itens[0] ? window.__ctContraste(itens[0].querySelector('.ct-of-st')) : 0,
        semNome: eval(SEM)(d) };
    }, SEM_NOME);
    ok(p.aberto && p.dialog, `${tag} 2 "Ver revisão oficial" abre o painel (role=dialog)`);
    ok(p.n === 4 && p.vocab, `${tag} 2b lista os 4 itens com status do vocabulário único`);
    ok(p.revisarNaoPublicado, `${tag} 2c item marcado para revisão aparece como "Conferir", nunca como publicado`);
    const res = await pg.evaluate(() => { const r = id => (document.querySelector('#ct-revisao-oficial article[data-id="' + id + '"] .ct-of-resumo') || {}).textContent || ''; return { a: r('PLN-CF-art5-aaa'), b: r('PLN-CF-art250-bbb') }; });
    ok(/^Alterado pela Emenda Constitucional nº 999/.test(res.a) && !/marcador de vigência/.test(res.a), `${tag} 2c2 resumo traz a norma modificadora, não o diagnóstico do classificador (${res.a})`);
    ok(/Aguardando vigência: vale a partir de 01\/01\/2027/.test(res.b) && !/redação anterior/.test(res.b), `${tag} 2c3 inclusão com vigência futura diz a data e não fala em "redação anterior"`);
    const inc = await pg.evaluate(() => { const a = document.querySelector('#ct-revisao-oficial article[data-id="INF-STF-1189"]'); return a ? { st: a.querySelector('.ct-of-st').textContent.trim(), cls: a.querySelector('.ct-of-st').className, res: a.querySelector('.ct-of-resumo').textContent, marcar: !!a.querySelector('[data-st]') } : null; });
    ok(inc && inc.st === 'No acervo' && /ct-of-st-conferido/.test(inc.cls) && /Já incorporado ao acervo/.test(inc.res) && !inc.marcar, `${tag} 2c4 item incorporado (sem incorporadoTxt) mostra "No acervo", com a classe de Conferido e sem botão de marcar`);
    ok(p.dataDeteccao, `${tag} 2d todo item mostra a data de detecção`);
    ok(/Alteração/.test(p.tipos) && /Inclusão/.test(p.tipos) && /informativo/i.test(p.tipos), `${tag} 2e tipos por extenso (${p.tipos})`);
    ok(p.limites, `${tag} 2f cobertura e limites das três fontes PINTAM no painel (altura e contraste ≥ 4,5:1)`);
    ok(p.frase, `${tag} 2f2 a frase de atualização assistida (revisão só entra depois de conferida) aparece legível`);
    ok(p.selo >= 4.5, `${tag} 2f3 selo de status do painel ≥ 4,5:1 (${(p.selo || 0).toFixed(2)})`);
    ok(p.semNome === 0, `${tag} 2g nenhum botão do painel sem nome acessível (${p.semNome})`);

    const filtro = async (k) => { await pg.click(`#ct-revisao-oficial [data-f="${k}"]`); await pg.waitForTimeout(250);
      return pg.evaluate(() => ({ n: document.querySelectorAll('#ct-of-lista article').length,
        txt: (document.getElementById('ct-revisao-oficial') || {}).innerText || '' })); };
    const fL = await filtro('legis'), fJ = await filtro('juris'), fR = await filtro('revisar'), fF = await filtro('falhas');
    ok(fL.n === 2 && fJ.n === 2 && fR.n === 3, `${tag} 3 filtros LEGIS/JURIS/Precisa revisar (${fL.n}/${fJ.n}/${fR.n})`);
    ok(/STJ/.test(fF.txt) && /Falhou/.test(fF.txt) && /fetch failed/.test(fF.txt), `${tag} 3b Falhas/parciais mostra a fonte que falhou, com o erro`);
    await filtro('todos');

    // marcar como conferido
    await pg.click('#ct-revisao-oficial article[data-id="PLN-CF-art5-aaa"] [data-st="conferido"]'); await pg.waitForTimeout(300);
    const m = await pg.evaluate(() => ({ st: document.querySelector('#ct-revisao-oficial article[data-id="PLN-CF-art5-aaa"] .ct-of-st').textContent.trim(),
      ls: (window.__catedraApp.state.novidLidas || []).find(x => x.id === 'PLN-CF-art5-aaa') }));
    ok(m.st === 'Conferido' && m.ls && m.ls.st === 'conferido' && m.ls.up > 0, `${tag} 3c "Marcar como conferido" muda o status e grava em novidLidas {id, up, st}`);
    await pg.waitForTimeout(1300);
    ok(await pg.evaluate(() => /"st":"conferido"/.test(localStorage.getItem('catedra:novidLidas') || '')), `${tag} 3c2 a marca chega ao catedra:novidLidas (global, sincronizado)`);

    // Esc fecha
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(250);
    ok(await pg.evaluate(() => !document.getElementById('ct-revisao-oficial')), `${tag} 3d Esc fecha o painel`);

    // ── 4. Planalto → LEGIS, STF → JURIS ────────────────────────────────────────────
    await pg.evaluate(() => window.__catedraApp.oficialPainelAbrir()); await pg.waitForTimeout(400);
    await pg.click('#ct-revisao-oficial article[data-id="PLN-CF-art250-bbb"] [data-alvo]'); await pg.waitForTimeout(1500);
    const l = await pg.evaluate(() => ({ view: window.__catedraApp.state.view,
      src: (document.querySelector('iframe[data-ct-view="legis"]') || {}).src || '' }));
    ok(l.view === 'legis', `${tag} 4 item do Planalto abre o CátedraLEGIS (${l.view})`);
    const fr = pg.frames().find(f => /legis-web\.html/.test(f.url()));
    if (fr) {
      await fr.waitForFunction(() => document.getElementById('pane-oficial') && document.getElementById('pane-oficial').classList.contains('on'), null, { timeout: 8000 }).catch(() => {});
      ok(await fr.evaluate(() => document.getElementById('pane-oficial').classList.contains('on') && !!document.querySelector('#oficialLegis article[data-id="PLN-CF-art250-bbb"]')),
        `${tag} 4b o LEGIS abre já em "Mudanças oficiais", com o item`);
      await fr.click('#oficialLegis [data-of-marcar="PLN-CF-art250-bbb"]'); await pg.waitForTimeout(500);
      ok(await pg.evaluate(() => ((window.__catedraApp.state.novidLidas || []).find(x => x.id === 'PLN-CF-art250-bbb') || {}).st === 'conferido'),
        `${tag} 4b2 "Marcar como conferido" no LEGIS chega ao host pela ponte (ctOficialMarcar)`);
    } else ok(false, `${tag} 4b o iframe do LEGIS não montou`);
    await pg.evaluate(() => window.__catedraGoView('inicio')); await pg.waitForTimeout(600);
    await pg.evaluate(() => window.__catedraApp.oficialPainelAbrir()); await pg.waitForTimeout(400);
    await pg.click('#ct-revisao-oficial article[data-id="INF-STF-1190"] [data-alvo]'); await pg.waitForTimeout(1500);
    ok(await pg.evaluate(() => window.__catedraApp.state.view) === 'juris', `${tag} 4c item do STF abre o CátedraJURIS`);

    // ── 5. nenhuma variável órfã: todo {{ oficial… }} do template sai do render() ──────
    const orf = await pg.evaluate(async () => {
      const src = await fetch(location.href).then(r => r.text());
      const nomes = [...new Set((src.match(/\{\{\s*oficial\w+/g) || []).map(x => x.replace(/\{\{\s*/, '')))];
      const vars = window.__catedraApp.renderVals ? window.__catedraApp.renderVals() : null;
      if (!vars || typeof vars !== 'object') return { nomes: nomes.length, faltam: ['render() inacessível'] };
      return { nomes: nomes.length, faltam: nomes.filter(n => !(n in vars)) };
    });
    const fechado = await pg.evaluate(() => { const R = window.CT_REVISAO_OFICIAL, o = R.itens; let n = 0; R.itens = function () { n++; return o.apply(this, arguments); };
      const v = window.__catedraApp.renderVals(); R.itens = o; return { n, len: v.oficialLista.length }; });
    ok(fechado.n === 0 && fechado.len === 0, `${tag} 5b com o painel fechado o render não mapeia a fila (${fechado.n} chamadas)`);
    ok(orf.nomes >= 10 && orf.faltam.length === 0, `${tag} 5 nenhuma variável órfã no template (${orf.nomes} nomes; faltam: ${orf.faltam.join(',') || 'nenhuma'})`);
    await ctx.close();
  }

  // ── 6. pacote gerado, nenhum item, mas uma fonte falhou: nunca "nenhuma mudança" ──────
  {
    const FAL = { geradoEm: FIX.geradoEm, fontes: FIX.fontes, itens: [] };
    const ctx = await novoCtx(FAL, 'juridica'); const pg = await ctx.newPage();
    await abrirApp(pg);
    await pg.evaluate(() => window.__catedraApp.oficialPainelAbrir()); await pg.waitForTimeout(400);
    const v = await pg.evaluate(() => (document.getElementById('ct-of-vazio') || {}).textContent || '');
    ok(/não se completou: STJ \(falhou\)/.test(v) && !/^Nenhuma mudança/.test(v), `${tag} 6 vazio com fonte em falha diz que a varredura não se completou (${v.slice(0, 60)})`);
    await pg.goto(base + '/juris-web.html'); await pg.waitForTimeout(500);
    await pg.click('#tabs .tab[data-pane="oficial"]'); await pg.waitForTimeout(200);
    const jv = await pg.evaluate(() => (document.getElementById('oficialVazio') || {}).textContent || '');
    ok(/não se completou: STJ \(falhou\)/.test(jv) && /STF: nenhuma edição nova/.test(jv), `${tag} 6b JURIS vazio separa a fonte que falhou da que respondeu`);
    await ctx.close();
  }

  // ── 6c. Planalto parcial, nenhum item: o LEGIS não diz "nenhuma mudança" ───────────────
  {
    const PAR = { geradoEm: FIX.geradoEm, fontes: { ...FIX.fontes, planalto: { ...FIX.fontes.planalto, resultado: 'parcial' } }, itens: [] };
    const ctx = await novoCtx(PAR, 'juridica'); const pg = await ctx.newPage();
    await pg.goto(base + '/legis-web.html?area=juridica'); await pg.waitForTimeout(500);
    await pg.click('#tabsTopo button[data-t="oficial"]'); await pg.waitForTimeout(200);
    const lv = await pg.evaluate(() => (document.getElementById('oficialVazio') || {}).textContent || '');
    ok(/não se completou \(parcial/.test(lv) && !/^Nenhuma mudança/.test(lv), `${tag} 6c LEGIS com Planalto parcial não diz "nenhuma mudança"`);
    await ctx.close();
  }

  // ── 6d. regras do módulo (sem tela): autoria, revogação futura, recorte, parcial × acervo ──
  {
    const ctx = await novoCtx(VAZIO, 'juridica'); const pg = await ctx.newPage();
    await pg.goto(base + '/legis-web.html?area=juridica'); await pg.waitForTimeout(300);
    const u = await pg.evaluate(() => {
      const R = window.CT_REVISAO_OFICIAL, um = (it) => R.itens({ geradoEm: null, fontes: {}, itens: [Object.assign({ id: 'x', fonte: 'planalto' }, it)] }, {})[0];
      const inc = um({ tipo: 'inclusao', modificadora: 'Lei nº 14.994, de 2024', modificadoras: [{ acao: 'incluído', norma: 'Lei nº 14.994, de 2024' }], vigencia: 'em-vigor' });
      const rev = um({ tipo: 'revogacao', modificadora: 'Lei nº 15.000, de 2026', modificadoras: [{ acao: 'revogado', norma: 'Lei nº 15.000, de 2026' }], vigencia: 'aguardando', vigenciaEm: '01/01/2027' });
      const rec = um({ tipo: 'alteracao', recorte: true, vigencia: 'aguardando', vigenciaEm: '01/01/2027', pendencia: 'o texto deste artigo não mudou' });
      const pa = um({ tipo: 'alteracao', parcial: true, incorporado: true });
      // A ação da anotação é do § ou do inciso, não do artigo: numa ALTERAÇÃO, um § incluído ou
      // revogado continua sendo "Alterado pela…". Só inclusão/revogação usam a ação do tipo.
      const altInc = um({ tipo: 'alteracao', modificadora: 'Lei nº 15.100, de 2026', modificadoras: [{ acao: 'incluído', norma: 'Lei nº 15.100, de 2026' }], vigencia: 'em-vigor' });
      const altRev = um({ tipo: 'alteracao', modificadora: 'Lei nº 15.101, de 2026', modificadoras: [{ acao: 'revogado', norma: 'Lei nº 15.101, de 2026' }], vigencia: 'em-vigor' });
      const dl = um({ tipo: 'alteracao', modificadora: 'Decreto-lei nº 229, de 28.2.1967', modificadoras: [{ acao: 'redação dada', norma: 'Decreto-lei nº 229, de 28.2.1967' }], vigencia: 'em-vigor' });
      const revOutra = um({ tipo: 'revogacao', modificadora: 'Lei nº 14.900, de 2025', vigencia: 'em-vigor',
        modificadoras: [{ acao: 'revogado', norma: 'Lei nº 15.000, de 2026' }, { acao: 'incluído', norma: 'Lei nº 14.900, de 2025' }] });
      const incOutra = um({ tipo: 'inclusao', modificadora: 'Lei nº 15.100, de 2026', vigencia: 'em-vigor',
        modificadoras: [{ acao: 'incluído', norma: 'Lei nº 14.994, de 2024' }, { acao: 'redação dada', norma: 'Lei nº 15.100, de 2026' }] });
      const recInd = um({ tipo: 'alteracao', recorte: true, vigencia: 'indeterminada', pendencia: 'o texto deste artigo não mudou' });
      // No acervo vence a marca antiga: conferido ANTES da baixa não vira "Manter em revisão".
      const incConf = R.itens({ geradoEm: null, fontes: {}, itens: [{ id: 'y', fonte: 'stf', tipo: 'informativo', incorporado: true }] }, { y: { st: 'conferido', up: 1 } })[0];
      // Duas anotações do MESMO tipo: a do caput (a primeira) é a do artigo; a outra é de um §
      // acrescentado depois por outra lei (CP art. 121-A). Idem na revogação.
      const inc2 = um({ tipo: 'inclusao', modificadora: 'Lei nº 15.384, de 2026', vigencia: 'em-vigor',
        modificadoras: [{ acao: 'incluído', norma: 'Lei nº 14.994, de 2024' }, { acao: 'incluído', norma: 'Lei nº 15.384, de 2026' }] });
      const rev2 = um({ tipo: 'revogacao', modificadora: 'Lei nº 15.500, de 2026', vigencia: 'em-vigor',
        modificadoras: [{ acao: 'revogado', norma: 'Lei nº 15.000, de 2026' }, { acao: 'revogado', norma: 'Lei nº 15.500, de 2026' }] });
      // Inclusão sem anotação de inclusão: nenhuma lei é citada (a "redação dada" não incluiu o artigo).
      const incSem = um({ tipo: 'inclusao', modificadora: 'Lei nº 15.100, de 2026', modificadoras: [{ acao: 'redação dada', norma: 'Lei nº 15.100, de 2026' }], vigencia: 'em-vigor' });
      // Tropeços reais da página: preposição repetida (CF art. 168) e dois-pontos no parêntese (ADCT).
      const pelaPela = um({ tipo: 'alteracao', modificadora: 'pela Emenda Constitucional nº 19, de 1998', modificadoras: [{ acao: 'redação dada', norma: 'pela Emenda Constitucional nº 19, de 1998' }], vigencia: 'em-vigor' });
      const doisPontos = um({ tipo: 'inclusao', modificadora: 'Emenda Constitucional nº 27, de 2000:', modificadoras: [{ acao: 'incluído', norma: 'Emenda Constitucional nº 27, de 2000:' }], vigencia: 'em-vigor' });
      // Pendência sozinha abre a frase com maiúscula.
      const inf = R.itens({ geradoEm: null, fontes: {}, itens: [{ id: 'z', fonte: 'stj', tipo: 'informativo', revisar: true, pendencia: 'edição detectada na fonte oficial' }] }, {})[0];
      const adct = um({ tipo: 'alteracao', disp: 'Art. 1º', rotulo: 'Art. 1º do ADCT' });
      return { adct: adct.rotulo + '|' + adct.disp + '|' + adct.busca, inc: inc.resumo, rev: rev.resumo, rec: rec.resumo, recFut: rec.vigenciaFutura, pa: pa.status + '|' + pa.podeMarcar,
        altInc: altInc.resumo, altRev: altRev.resumo, dl: dl.resumo, revOutra: revOutra.resumo, incOutra: incOutra.resumo,
        recInd: recInd.resumo, recIndFut: recInd.vigenciaFutura, incConf: incConf.status + '|' + incConf.podeMarcar,
        inc2: inc2.resumo, rev2: rev2.resumo, incSem: incSem.resumo, pelaPela: pelaPela.resumo, doisPontos: doisPontos.resumo, inf: inf.resumo };
    });
    ok(/^Incluído pela Lei nº 14\.994/.test(u.inc) && !/Modificada/.test(u.inc), `${tag} 6d inclusão diz "Incluído pela…" (${u.inc})`);
    ok(/deixa de valer em 01\/01\/2027; até lá, continua valendo/.test(u.rev) && /Revogado pela/.test(u.rev), `${tag} 6e revogação futura diz que DEIXA de valer na data (${u.rev})`);
    ok(/^Art\. 1º do ADCT\|Art\. 1º\|/.test(u.adct) && !/ADCT/.test(u.adct.split('|')[2]), `${tag} 6j rótulo distingue o ADCT e a busca segue com o disp limpo (${u.adct})`);
    ok(u.rec === 'O texto deste artigo não mudou.' && u.recFut === false, `${tag} 6f recorte mostra só a pendência, sem selo de vigência futura (${u.rec})`);
    ok(u.pa === 'parcial|true', `${tag} 6g parcial vence o "No acervo" (${u.pa})`);
    ok(u.altInc === 'Alterado pela Lei nº 15.100, de 2026.' && u.altRev === 'Alterado pela Lei nº 15.101, de 2026.',
      `${tag} 6d2 § incluído ou revogado numa alteração sai "Alterado pela…", não como se o artigo fosse incluído ou revogado (${u.altInc} | ${u.altRev})`);
    ok(/^Alterado pelo Decreto-lei nº 229/.test(u.dl), `${tag} 6d3 norma masculina leva "pelo" (${u.dl})`);
    ok(/^Revogado pela Lei nº 15\.000/.test(u.revOutra) && !/14\.900/.test(u.revOutra) && /^Incluído pela Lei nº 14\.994/.test(u.incOutra) && !/15\.100/.test(u.incOutra),
      `${tag} 6d4 revogação e inclusão citam a lei da própria ação, não outra anotação da diferença (${u.revOutra} | ${u.incOutra})`);
    ok(u.recInd === 'O texto deste artigo não mudou.' && u.recIndFut === false, `${tag} 6f2 recorte com vigência sem data também mostra só a pendência (${u.recInd})`);
    ok(u.incConf === 'incorporado|false', `${tag} 6g2 item no acervo com marca antiga de conferido fica "No acervo", sem botão (${u.incConf})`);
    ok(u.inc2 === 'Incluído pela Lei nº 14.994, de 2024.' && u.rev2 === 'Revogado pela Lei nº 15.000, de 2026.',
      `${tag} 6d5 com duas anotações do mesmo tipo, vale a do caput — a primeira (${u.inc2} | ${u.rev2})`);
    ok(u.incSem === 'Dispositivo novo no texto compilado.', `${tag} 6d6 inclusão sem anotação de inclusão não cita lei nenhuma (${u.incSem})`);
    ok(u.pelaPela === 'Alterado pela Emenda Constitucional nº 19, de 1998.' && u.doisPontos === 'Incluído pela Emenda Constitucional nº 27, de 2000.',
      `${tag} 6d7 preposição repetida e dois-pontos da página não chegam ao resumo (${u.pelaPela} | ${u.doisPontos})`);
    ok(u.inf === 'Edição detectada na fonte oficial.', `${tag} 6d8 pendência sozinha abre a frase com maiúscula (${u.inf})`);
    await ctx.close();
  }

  // ── 6h. "No acervo" nos satélites: sem botão de marcar, mesmo com marca antiga de conferido ──
  {
    const INC = { geradoEm: FIX.geradoEm, fontes: FIX.fontes, itens: [
      { id: 'PLN-L14133-art77-ccc', fonte: 'planalto', tipo: 'alteracao', norma: 'L14133', normaNome: 'Lei nº 14.133, de 2021', disp: 'Art. 77',
        titulo: 'Art. 77 — L14133', antes: 'Art. 77. Texto antigo.', depois: 'Art. 77. Texto antigo. Parágrafo único. Novo. (Incluído pela Lei nº 15.266, de 2025)',
        modificadora: 'Lei nº 15.266, de 2025', modificadoras: [{ acao: 'incluído', norma: 'Lei nº 15.266, de 2025' }],
        vigencia: 'em-vigor', revisar: false, incorporado: true, incorporadoTxt: 'já no LEGIS',
        urlOficial: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm', detectadoEm: FIX.geradoEm },
      FIX.itens[0], FIX.itens[3]] };
    const ctx = await novoCtx(INC, 'juridica'); const pg = await ctx.newPage();
    await pg.goto(base + '/legis-web.html?area=juridica'); await pg.waitForTimeout(300);
    await pg.evaluate(() => localStorage.setItem('catedra:novidLidas', JSON.stringify([
      { id: 'PLN-L14133-art77-ccc', st: 'conferido', up: 1 }, { id: 'INF-STF-1189', st: 'conferido', up: 1 }])));
    await pg.goto(base + '/legis-web.html?area=juridica&oficial=PLN-L14133-art77-ccc');
    await pg.waitForFunction(() => document.querySelector('#oficialLegis article'), null, { timeout: 10000 }).catch(() => {});
    const L = await pg.evaluate(() => { const a = document.querySelector('#oficialLegis article[data-id="PLN-L14133-art77-ccc"]');
      return a ? { st: a.querySelector('.ct-of-st').textContent.trim(), marcar: !!a.querySelector('[data-of-marcar]'),
        res: a.querySelector('.ct-of-resumo').textContent, outro: !!document.querySelector('#oficialLegis [data-of-marcar="PLN-CF-art5-aaa"]') } : null; });
    ok(!!L && L.st === 'No acervo' && !L.marcar && L.outro, `${tag} 6h LEGIS: item no acervo (mesmo conferido antes) fica "No acervo" e sem botão de marcar`);
    ok(!!L && /^Alterado pela Lei nº 15\.266/.test(L.res), `${tag} 6h2 LEGIS: parágrafo incluído numa alteração sai "Alterado pela…" (${L && L.res})`);
    await pg.goto(base + '/juris-web.html?oficial=INF-STF-1189');
    await pg.waitForFunction(() => document.querySelector('#oficialJuris article'), null, { timeout: 10000 }).catch(() => {});
    const J = await pg.evaluate(() => { const a = document.querySelector('#oficialJuris article[data-id="INF-STF-1189"]');
      return a ? { st: a.querySelector('.ct-of-st').textContent.trim(), marcar: !!a.querySelector('[data-of-marcar]') } : null; });
    ok(!!J && J.st === 'No acervo' && !J.marcar, `${tag} 6i JURIS: informativo no acervo (mesmo conferido antes) fica "No acervo" e sem botão de marcar`);
    await ctx.close();
  }

  // ── 7. estado vazio honesto ─────────────────────────────────────────────────────────
  {
    const ctx = await novoCtx(VAZIO, 'juridica'); const pg = await ctx.newPage();
    await abrirApp(pg);
    await pg.evaluate(() => window.__catedraApp.oficialPainelAbrir()); await pg.waitForTimeout(400);
    const v = await pg.evaluate(() => (document.getElementById('ct-of-vazio') || {}).innerText || '');
    ok(/Ainda não há varredura/.test(v) && /nunca publicadas sozinhas/.test(v) && !/tudo atualizado|integralmente atualizad[oa]\b(?!.*não)/i.test(v),
      `${tag} 7 painel vazio diz que não há varredura e não promete atualização integral`);
    await pg.goto(base + '/legis-web.html?area=juridica'); await pg.waitForTimeout(500);
    await pg.click('#tabsTopo button[data-t="oficial"]'); await pg.waitForTimeout(200);
    const lv = await pg.evaluate(() => (document.getElementById('oficialVazio') || {}).innerText || '');
    ok(/não significa que todas as normas estejam atualizadas/.test(lv), `${tag} 7b LEGIS vazio declara o limite do catálogo`);
    await pg.goto(base + '/juris-web.html'); await pg.waitForTimeout(500);
    await pg.click('#tabs .tab[data-pane="oficial"]'); await pg.waitForTimeout(200);
    const jv = await pg.evaluate(() => (document.getElementById('oficialVazio') || {}).innerText || '');
    ok(/não garante/.test(jv) && /súmulas/.test(jv), `${tag} 7c JURIS vazio não garante acervo atualizado e cita o que fica fora`);
    await ctx.close();
  }

  // ── 8. LEGIS e JURIS com itens, em desktop e no celular/iPad ────────────────────────
  for (const larg of [1280, 820, 390]) {
    const ctx = await novoCtx(FIX, 'juridica', larg); const pg = await ctx.newPage();
    await pg.goto(base + '/legis-web.html?area=juridica&oficial=PLN-CF-art5-aaa');
    await pg.waitForFunction(() => document.querySelector('#oficialLegis article'), null, { timeout: 10000 }).catch(() => {});
    const L = await pg.evaluate((SEM) => {
      const box = document.getElementById('oficialLegis'), a = box.querySelector('article[data-id="PLN-CF-art5-aaa"]');
      const b = box.querySelector('article[data-id="PLN-CF-art250-bbb"]');
      const del = a && a.querySelector('.ct-of-del'), ins = a && a.querySelector('.ct-of-ins');
      const lados = a ? Array.from(a.querySelectorAll('.ct-of-lado h4')).map(h => h.textContent) : [];
      return { grupo: /Constituição Federal · 2 dispositivos/.test(box.textContent),
        cmp: lados.join('|') === 'Texto anterior|Texto atual' && del && del.textContent.trim() === 'natureza.' && ins && ins.textContent.trim() === 'espécie.',
        pintaDiff: del ? getComputedStyle(del).textDecorationLine.includes('line-through') : false,
        selo: /Detectado no Planalto em/.test(a ? a.textContent : ''),
        vigFutura: b ? /Vigência futura · 01\/01\/2027/.test(b.textContent) && /Incluído/.test(b.textContent) && /Conferir/.test(b.textContent) : false,
        alterado: a ? /Alterado/.test(a.textContent) : false,
        rotulo: b ? b.querySelector('.ct-of-titulo').textContent.trim() : '',
        rolaLado: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        semNome: eval(SEM)(box), contraste: a ? window.__ctContraste(a.querySelector('.ct-of-st')) : 0 };
    }, SEM_NOME);
    const t = `${tag} LEGIS@${larg}`;
    ok(L.grupo, `${t} 8 agrupa por norma ("Constituição Federal · 2 dispositivos")`);
    ok(L.cmp && L.pintaDiff, `${t} 8b alteração mostra texto anterior × atual, com só o trecho mudado destacado`);
    ok(L.selo && L.alterado, `${t} 8c selo "Detectado no Planalto em …" e status por dispositivo (Alterado)`);
    ok(L.rotulo === 'Art. 250-A do ADCT', `${t} 8d2 o cartão usa o rótulo do motor (${L.rotulo})`);
    ok(L.vigFutura, `${t} 8d inclusão com vigência futura mostra a data e fica em "Conferir"`);
    ok(!L.rolaLado, `${t} 8e sem rolagem horizontal`);
    ok(L.semNome === 0, `${t} 8f nenhum botão sem nome acessível (${L.semNome})`);
    ok(L.contraste >= 4.5, `${t} 8g selo de status ≥ 4,5:1 (${(L.contraste || 0).toFixed(2)})`);
    await pg.click('#oficialLegis [data-of-marcar="PLN-CF-art5-aaa"]'); await pg.waitForTimeout(200);
    ok(await pg.evaluate(() => /Conferido/.test(document.querySelector('#oficialLegis article[data-id="PLN-CF-art5-aaa"] .ct-of-st').textContent)),
      `${t} 8h "Marcar como conferido" no LEGIS vira "Conferido"`);

    await pg.goto(base + '/juris-web.html?oficial=INF-STF-1190');
    await pg.waitForFunction(() => document.querySelector('#oficialJuris article'), null, { timeout: 10000 }).catch(() => {});
    const J = await pg.evaluate((SEM) => {
      const box = document.getElementById('oficialJuris'), a = box && box.querySelector('article[data-id="INF-STF-1190"]');
      const btns = a ? Array.from(a.querySelectorAll('button,a')).map(b => b.textContent.trim()) : [];
      return { aberto: !document.getElementById('paneOficial').hidden, item: !!a,
        grupo: /STF · 2 edições/.test(box ? box.textContent : ''),
        incSemComparar: (() => { const b = box && box.querySelector('article[data-id="INF-STF-1189"]'); return !!b && /No acervo/.test(b.textContent) && !/Precisa comparar/.test(b.textContent); })(),
        nTab: (document.getElementById('nOficial') || {}).textContent, stjFalhou: /STJ\s*Falhou/.test(box ? box.textContent : ''),
        fila: a ? /Novo informativo/.test(a.textContent) && /Precisa comparar com o acervo: edição detectada/.test(a.textContent) && /Conferir/.test(a.textContent) : false,
        acoes: btns.includes('Ver no acervo') && btns.some(x => /^Registro oficial/.test(x)) && btns.includes('Marcar como conferido'),
        rolaLado: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        semNome: box ? eval(SEM)(box) : 99 };
    }, SEM_NOME);
    const tj = `${tag} JURIS@${larg}`;
    ok(J.aberto && J.item, `${tj} 9 ?oficial= abre "Informativos oficiais" no item`);
    ok(J.grupo && J.stjFalhou, `${tj} 9b agrupa por tribunal e mostra o STJ que falhou`);
    ok(J.incSemComparar && J.nTab === '1', `${tj} 9b2 "No acervo" não pede comparação e fica fora do contador da aba (${J.nTab})`);
    ok(J.fila, `${tj} 9c fila editorial: "Novo informativo", "Precisa comparar com o acervo", status Conferir`);
    ok(J.acoes, `${tj} 9d ações: Ver no acervo, Registro oficial, Marcar como conferido`);
    ok(!J.rolaLado, `${tj} 9e sem rolagem horizontal`);
    ok(J.semNome === 0, `${tj} 9f nenhum botão sem nome acessível (${J.semNome})`);
    await pg.click('#oficialJuris [data-of-acervo="INF-STF-1190"]'); await pg.waitForTimeout(300);
    ok(await pg.evaluate(() => !document.getElementById('paneAcervo').hidden && /STF/.test(document.getElementById('q').value)),
      `${tj} 9g "Ver no acervo" volta ao acervo já buscando o tribunal`);

    if (motor === 'chromium' && larg === 820) {
      const ctxT = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });
      await ctxT.route('**/novidades.js', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: corpo(FIX) }));
      const pt = await ctxT.newPage();
      for (const [u, sel] of [['/legis-web.html?area=juridica&oficial=PLN-CF-art5-aaa', '#oficialLegis'], ['/juris-web.html?oficial=INF-STF-1190', '#oficialJuris']]) {
        await pt.goto(base + u);
        await pt.waitForFunction((s) => document.querySelector(s + ' article'), sel, { timeout: 10000 }).catch(() => {});
        const a = await pt.evaluate((s) => { const bs = Array.from(document.querySelectorAll(s + ' .ct-of-btn')).filter(b => b.getBoundingClientRect().width);
          return { n: bs.length, baixos: bs.filter(b => b.getBoundingClientRect().height < 44).length, grosso: matchMedia('(pointer: coarse)').matches }; }, sel);
        ok(a.grosso && a.n > 0 && a.baixos === 0, `${tag} ${sel} 8i botões da revisão oficial com 44 px no toque (${a.baixos}/${a.n} baixos)`);
      }
      await ctxT.close();
    }
    // painel do host no celular/iPad
    if (larg < 1280) {
      await abrirApp(pg);
      await pg.evaluate(() => window.__catedraApp.oficialPainelAbrir()); await pg.waitForTimeout(400);
      const H = await pg.evaluate(() => {
        const d = document.getElementById('ct-revisao-oficial'), r = d.getBoundingClientRect();
        const btns = Array.from(d.querySelectorAll('button')).filter(b => b.getBoundingClientRect().width);
        return { cabe: r.right <= window.innerWidth + 1 && r.left >= -1,
          rolaLado: d.scrollWidth > d.clientWidth + 1 || document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          estouram: Array.from(d.querySelectorAll('article,.ct-of-item')).filter(e => e.getBoundingClientRect().right > r.right + 1).length,
          alvo: btns.filter(b => b.getBoundingClientRect().height < 36).length };
      });
      ok(H.cabe && !H.rolaLado && H.estouram === 0, `${tag} HOST@${larg} 10 o painel cabe sem rolagem horizontal`);
      ok(H.alvo === 0, `${tag} HOST@${larg} 10b botões do painel com altura de toque (${H.alvo} baixos)`);
    }
    await ctx.close();
  }
}
