import fs from 'node:fs';
import { createRequire } from 'node:module';
const contraste=(a,b)=>{
 const lum=c=>{let v=c.match(/[\d.]+/g).slice(0,3).map(Number);if(/color\(srgb/.test(c))v=v.map(x=>x*255);v=v.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return v[0]*.2126+v[1]*.7152+v[2]*.0722;};
 const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
};
const require=createRequire(import.meta.url);
export async function testarOralPontos(pageSuite, base, ok, opcoes={}) {
  const R='ORAL PONTOS ['+(opcoes.motor||'chromium')+'] ['+(opcoes.origem||'http')+'] ';
  // O Anexo B roda contra CT_TREINO real, além da fixture isolada do parser.
  require('./oral-pontos.test.cjs');
  const ctx=await pageSuite.context().browser().newContext({viewport:{width:1024,height:1000},reducedMotion:'reduce'});
  // Autenticação tem suíte própria. Este contexto testa a tela com sessão sintética, sem servidor de contas.
  await ctx.route('**/auth.js',route=>route.fulfill({contentType:'text/javascript',body:'/* Autenticação isolada no teste da Prova oral. */'}));
  const page=await ctx.newPage();
  try {
    const host=base+'/'+(opcoes.arquivo||'Catedra.dc.html');
    await page.goto(base.startsWith('file:')?host:base+'/__semente');
    await page.evaluate(()=>{localStorage.setItem('catedra:auth','1');localStorage.setItem('catedra:onboarded','1');});
    await page.goto(host);await page.waitForFunction(()=>!!window.__catedraApp);
    await page.evaluate(async()=>{await window.__catedraApp._treino();window.__catedraGoView('oral');});
    const preparar=async(pontos=true)=>{
      await page.evaluate(pontos=>window.__catedraApp.setState({view:'oral',oralModo:'juris',oralPronto:true,
        oralAlvo:{titulo:'Fixture técnica, sem valor de estudo',tribunal:'Teste',texto:'Texto sintético de teste '.repeat(14),points:pontos?[
          {text:'Primeiro ponto',tag:'termo',terms:['alpha']},{text:'Segundo ponto',tag:'termo',terms:['beta','gamma','delta']},{text:'Terceiro ponto',tag:'termo',terms:['epsilon']}]:undefined},
        oralPergunta:'Fixture técnica',oralResposta:'alpha beta <img src=x onerror=alert(1)>',oralCorrecao:null,oralPontosSobrescritas:{}}),pontos);
      await page.waitForTimeout(100);
      await page.evaluate(()=>window.__catedraApp.corrigirOral());
    };
    await preparar();await page.waitForSelector('[data-oral="pontos"]');
    let txt=await page.textContent('[data-oral="pontos"]');
    ok(/1 coberto.*1 parcial.*1 faltou/.test(txt)&&/Revise primeiro/.test(txt),R+'lista e totais refletem os três estados');
    ok(await page.locator('.ct-oral-resposta img').count()===0 && (await page.textContent('.ct-oral-resposta')).includes('<img'),R+'resposta preservada como texto, sem executar HTML');
    ok((await page.locator('.ct-oral-resposta u').allTextContents()).join(',')==='alpha,beta',R+'sublinha somente os termos encontrados');
    for(const dir of ['sutil','premium'])for(const dark of [false,true]) {
      await page.evaluate(({dir,dark})=>{window.__catedraApp.setState({dir,darkMode:dark});document.documentElement.setAttribute('data-dir',dir);document.documentElement.setAttribute('data-theme',dark?'dark':'light');}, {dir,dark});
      await page.waitForTimeout(150);
      const m=await page.evaluate(()=>{
        const root=document.querySelector('[data-oral="pontos"]'),s=getComputedStyle(root),bar=root.querySelector('.ct-oral-barra');
        return {fg:s.color,bg:s.backgroundColor,width:bar.getBoundingClientRect().width,
          bars:[...bar.children].map(x=>({w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height,bg:getComputedStyle(x).backgroundColor})),
          buttons:[...root.querySelectorAll('button')].map(x=>({h:x.getBoundingClientRect().height,w:x.getBoundingClientRect().width,fg:getComputedStyle(x).color,bg:getComputedStyle(x).backgroundColor})),
          formas:[...root.querySelectorAll('.ct-oral-forma')].map(x=>({w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height,clip:getComputedStyle(x).clipPath,round:getComputedStyle(x).borderRadius})),overflow:root.scrollWidth>root.clientWidth};
      });
      ok(m.width>0 && m.bars.length===3 && m.bars.every(b=>Math.abs(b.w/m.width-1/3)<.02&&b.h>0&&!/rgba\(0, 0, 0, 0\)/.test(b.bg)),R+dir+'/'+dark+' barra pinta e mede 1/3 em cada segmento');
      ok(contraste(m.fg,m.bg)>=4.5&&m.buttons.every(b=>b.h>=44&&b.w>=44&&contraste(b.fg,b.bg)>=4.5),R+dir+'/'+dark+' contraste calculado ≥4,5 e toque ≥44');
      const livre=await page.evaluate(()=>{const b=document.querySelector('[data-oral="manual"][data-i="2"]');b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect(),e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return e===b||b.contains(e);});
      ok(livre,R+'botão recebe o toque sem portão ou sobreposição');
      ok(!m.overflow&&m.formas.every(f=>f.w>0&&f.h>0)&&m.formas[1].clip!=='none',R+'formas visíveis e sem transbordamento');
    }
    // O host recria os botões a cada tique; localizar e clicar no mesmo turno evita alvos destacados.
    await page.evaluate(()=>document.querySelector('[data-oral="manual"][data-i="2"]').click());await page.waitForTimeout(150);
    ok(/2 coberto.*0 faltou/.test(await page.textContent('[data-oral="resumo"]'))&&await page.locator('[data-oral="manual"]').nth(2).getAttribute('aria-pressed')==='true',R+'sobrescrita manual atualiza estado, contagem e acessibilidade');
    // O host recria os botões a cada tique; localizar e clicar no mesmo turno evita alvos destacados.
    await page.evaluate(()=>document.querySelector('[data-oral="manual"][data-i="2"]').click());await page.waitForTimeout(150);
    ok(/1 faltou/.test(await page.textContent('[data-oral="resumo"]')),R+'desfazer restaura a sugestão automática');
    fs.mkdirSync('tests/_capturas',{recursive:true});await page.locator('[data-oral="pontos"]').screenshot({path:'tests/_capturas/oral-pontos-'+(opcoes.motor||'chromium')+'-'+(opcoes.origem||'http')+'.png'});
    await page.evaluate(()=>window.__catedraApp.onOralResposta({currentTarget:{value:'nova resposta'}}));await page.waitForTimeout(100);
    ok(await page.locator('[data-oral="pontos"]').count()===0,R+'editar invalida resultado e sobrescritas');
    await preparar(false);await page.waitForTimeout(100);
    ok(await page.locator('[data-oral="pontos"]').count()===0 && /Mencionou:|Não apareceu:/.test(await page.textContent('#dc-root')),R+'item sem pontos conserva a correção anterior');
    // Entrada colada: a correção só nasce depois de fonte + conferência explícita.
    await page.evaluate(()=>{document.querySelector('[data-oral="editor"]').open=true;});
    await page.locator('[data-oral="material"]').fill('? Pergunta técnica\n- Ponto técnico :: organização, eficiência\n> Documento de teste\n? Outra pergunta técnica\n- Outro ponto :: controle\n> Outra fonte de teste');
    await page.waitForTimeout(1100);
    ok((await page.inputValue('[data-oral="material"]')).includes('Documento de teste'),R+'editor aberto preserva a digitação após o re-render');
    await page.evaluate(()=>document.querySelector('[data-oral="preparar"]').click());
    await page.waitForSelector('[data-oral="previa"]');
    ok(await page.locator('[data-oral="material-ativo"]').count()===0,R+'colar gera prévia, sem habilitar correção automaticamente');
    const previaVisual=await page.evaluate(()=>{const el=document.querySelector('[data-oral="previa"]'),cs=getComputedStyle(el);return {fg:cs.color,bg:cs.backgroundColor,alvos:[...el.querySelectorAll('input,button')].map(e=>(e.type==='checkbox'?e.closest('label'):e).getBoundingClientRect().height),cabe:el.scrollWidth<=el.clientWidth};});
    ok(contraste(previaVisual.fg,previaVisual.bg)>=4.5&&previaVisual.alvos.every(h=>h>=44)&&previaVisual.cabe,R+'prévia: fonte e texto legíveis, controles ≥44 e sem transbordamento');
    await page.locator('[data-oral="previa"]').screenshot({path:'tests/_capturas/oral-previa-'+(opcoes.motor||'chromium')+'-'+(opcoes.origem||'http')+'.png'});
    await page.evaluate(()=>document.querySelector('[data-oral="incluir"][data-qi="0"]').click());
    ok(await page.locator('[data-oral="confirmar"]').count()===0,R+'excluir todos os pontos de uma pergunta impede confirmar');
    await page.evaluate(()=>document.querySelector('[data-oral="incluir"][data-qi="0"]').click());
    await page.locator('[data-oral="termos"]').first().fill('organização,');
    ok((await page.locator('[data-oral="termos"]').first().inputValue()).endsWith(','),R+'editar termos preserva a vírgula digitada antes do próximo termo');
    await page.locator('[data-oral="termos"]').first().fill('organização, eficiência, controle');
    await page.waitForSelector('[data-oral="confirmar"]');
    await page.evaluate(()=>document.querySelector('[data-oral="confirmar"]').click());
    await page.waitForSelector('[data-oral="resposta-material"]');
    await page.locator('[data-oral="resposta-material"]').fill('organizar eficiente');
    await page.evaluate(()=>document.querySelector('[data-oral="corrigir-material"]').click());
    await page.waitForSelector('[data-oral="pontos"]');
    ok(/1 coberto/.test(await page.textContent('[data-oral="resumo"]')),R+'material conferido usa os termos editados (2 de 3)');
    await page.locator('[data-oral="resposta-material"]').fill('organizar');
    await page.evaluate(()=>document.querySelector('[data-oral="corrigir-material"]').click());
    await page.evaluate(()=>document.querySelector('[data-oral="manual"][data-i="0"]').click());
    await page.evaluate(()=>document.querySelector('[data-oral="material-ativo"] [data-i="1"]').click());
    await page.locator('[data-oral="resposta-material"]').fill('controle');
    await page.evaluate(()=>document.querySelector('[data-oral="material-ativo"] [data-i="0"]').click());
    ok(await page.inputValue('[data-oral="resposta-material"]')==='organizar'&&await page.locator('[data-oral="manual"]').getAttribute('aria-pressed')==='true',R+'trocar de pergunta preserva resposta e sobrescrita da sessão');
    await page.evaluate(()=>window.__catedraApp.fecharMaterialOral());
    // Padrão existente: preservar texto e impedir aprovação sobre uma fonte que mudou.
    await page.evaluate(()=>window.__catedraApp.setState({oralModo:'bancas',oralQPronto:true,oralQMostrarPadrao:true,
      oralQResposta:'Resposta já escrita',oralQAtual:{id:'fixture',enunciado:'Pergunta técnica',padrao:'Organização e eficiência.\n\nPlanejamento e controle.',url:'https://exemplo.invalid/fonte',fonte:'Fixture'}}));
    await page.waitForSelector('[data-oral="derivar"]');
    await page.evaluate(()=>document.querySelector('[data-oral="derivar"]').click());
    await page.waitForSelector('[data-oral="previa"]');
    ok((await page.locator('[data-oral="previa"] .ct-oral-literal').allTextContents()).join('|')==='Organização e eficiência.|Planejamento e controle.',R+'derivação exibe recortes literais e fonte para conferência');
    await page.evaluate(()=>document.querySelector('[data-oral="incluir"][data-pi="1"]').click());
    await page.waitForSelector('[data-oral="confirmar"]');
    await page.evaluate(()=>document.querySelector('[data-oral="confirmar"]').click());
    ok(await page.evaluate(()=>window.__catedraApp.state.oralPontosItens[0].points.length===1),R+'recorte excluído não entra no treino confirmado');
    await page.evaluate(()=>{window.__catedraApp.fecharMaterialOral();});
    await page.waitForSelector('[data-oral="material-ativo"]',{state:'detached'});
    await page.evaluate(()=>window.__catedraApp.derivarPontosOral());
    await page.waitForSelector('[data-oral="confirmar"]');
    await page.evaluate(()=>{const a=window.__catedraApp;a.setState({oralQAtual:{...a.state.oralQAtual,padrao:'Texto alterado'}});});
    await page.waitForSelector('[data-oral="confirmar"]');
    await page.evaluate(()=>document.querySelector('[data-oral="confirmar"]').click());
    ok(await page.evaluate(()=>window.__catedraApp.state.oralPontosItens.length===0),R+'mudança do padrão invalida a confirmação');
    await page.evaluate(()=>window.__catedraApp.derivarPontosOral());
    await page.waitForSelector('[data-oral="confirmar"]');
    await page.waitForSelector('[data-oral="confirmar"]');
    await page.evaluate(()=>document.querySelector('[data-oral="confirmar"]').click());
    await page.waitForSelector('[data-oral="material-ativo"]');
    ok(await page.inputValue('[data-oral="resposta-material"]')==='Resposta já escrita',R+'confirmar pontos do padrão preserva a resposta já escrita');
    await page.locator('[data-oral="material-ativo"]').screenshot({path:'tests/_capturas/oral-fontes-'+(opcoes.motor||'chromium')+'-'+(opcoes.origem||'http')+'.png'});
    await page.evaluate(()=>window.__catedraApp.fecharMaterialOral());
    const prova={id:'fixture-espelho',trib:'Fixture',ano:2026,tipoRaw:'discursiva',tipo:'discursiva',banca:'Fixture',quesitos:[
      {rot:'Ponto técnico',disc:'Fixture',tema:'Fixture',exig:'organização eficiência controle planejamento coordenação',terms:['organização','eficiência','controle','planejamento','coordenação'],disp:['CPC art. 489'],valor:1,pont:'1,00'}]};
    await ctx.route('**/espelhos.js',r=>r.fulfill({contentType:'text/javascript',body:'window.CT_ESPELHOS='+JSON.stringify({provas:[prova],meta:{}})+';'}));
    const sf=await ctx.newPage();
    try {
      await sf.goto(base+'/segunda-fase-web.html');
      await sf.waitForFunction(()=>!!window.CT_TREINO&&typeof telaCorrecao==='function');
      await sf.evaluate(()=>{S.sessao={id:'fixture-espelho',folha:'organizar eficiente controle',veredictos:{},minutos:180,gasto:0};telaCorrecao();});
      await sf.waitForSelector('#qs .q');
      ok(/60% dos termos/.test(await sf.textContent('.sug'))&&await sf.evaluate(()=>S.sessao.veredictos[0]==='atendeu'),R+'segunda fase aplica a regra de 60% e explica o limite');
      await sf.evaluate(()=>document.querySelector('.q [data-v="parcial"]').click());
      ok(await sf.evaluate(()=>S.sessao.veredictos[0]==='parcial'&&T.notaPorEspelho(T.corrigirPorEspelho(E.provas[0],S.sessao.folha),S.sessao.veredictos).ganho===0.5),R+'veredito humano altera a nota com o peso oficial preservado');
      const cores=await sf.evaluate(()=>({fg:getComputedStyle(document.querySelector('.sug')).color,bg:getComputedStyle(document.querySelector('.q')).backgroundColor,
        cabe:document.documentElement.scrollWidth<=innerWidth}));
      ok(contraste(cores.fg,cores.bg)>=4.5&&cores.cabe,R+'segunda fase: explicação legível e sem transbordamento');
      await sf.screenshot({path:'tests/_capturas/espelho-pontos-'+(opcoes.motor||'chromium')+'-'+(opcoes.origem||'http')+'.png'});
    }finally{await sf.close();}
    const c=await page.evaluate(()=>window.CT_TREINO.corrigirOralPorPontos([{text:'Dispositivo',terms:['art. 489','§ 1º']}],'artigo 489, parágrafo 1º',{}));
    ok(c.covered===1,R+'normalização Unicode executada no motor do navegador');
  } finally {await ctx.close();}
}
