import assert from 'node:assert/strict';
import fs from 'node:fs';
import {iniciarServidor,lancarNavegador} from './_infra.mjs';

const {srv,url}=await iniciarServidor(process.cwd(),+(process.env.CT_PORT||9488));
const {browser,motor}=await lancarNavegador();
const erros=[];
try {
 const p=await browser.newPage({viewport:{width:1280,height:900}});
 p.on('pageerror',e=>erros.push(e.message));
 await p.goto(url+'/__semente');
 await p.evaluate(()=>{localStorage.clear();for(const [k,v] of Object.entries({auth:'1',onboarded:'1',areaEstudo:'"juridica"'}))localStorage.setItem('catedra:'+k,v);});
 await p.goto(url+'/Catedra.dc.html');await p.waitForFunction(()=>window.__catedraApp);
 await p.evaluate(()=>window.__catedraGoView('oral'));
 const preparo=p.getByRole('region',{name:'Preparar arguição'});
 await preparo.waitFor();
 await p.waitForFunction(()=>window.__catedraApp.state.oralQPronto&&document.querySelectorAll('[aria-label="Carreira da arguição"] option').length>1);
 assert.ok((await preparo.getByRole('combobox',{name:'Carreira da arguição'}).locator('option').count())>1);
 await preparo.getByRole('combobox',{name:'Quantidade de perguntas'}).selectOption('3');
 await preparo.getByRole('combobox',{name:'Tempo por resposta'}).selectOption('5');
 await p.waitForFunction(()=>window.__catedraApp.state.argQtd===3&&window.__catedraApp.state.argMin===5);
 await p.evaluate(()=>{window.CT_ORAL_Q=Array.from({length:10},(_,i)=>({id:'documento-compartilhado',enunciado:'Pergunta de treino número '+i+'. Explique sua posição e apresente o fundamento.',padrao:'Padrão oficial de teste. '.repeat(20),disciplina:'Direito Civil',carreira:'Magistratura Estadual',orgao:'Banca de teste',ano:'2026',url:'https://example.test/prova'}));window.__catedraApp.setState({oralQPronto:true,oralBancasPronto:true,oralQDisc:'',oralQCarr:'',argVoz:false});});
 const capturas=process.env.CT_CAPTURA_DIR;if(capturas)fs.mkdirSync(capturas,{recursive:true});
 for(const width of [390,768,1024,1280]){
  await p.setViewportSize({width,height:900});await p.waitForFunction(()=>window.__catedraApp.state.isMobile===(innerWidth<900));
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  if(capturas&&[390,1280].includes(width))await preparo.screenshot({path:capturas+'/oral-preparo-'+width+'.png'});
 }
 await preparo.locator('[data-i="treinar"]').click();
 const sala=p.getByRole('region',{name:'Conversa de arguição'});await sala.waitFor();
 await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.ok(await p.evaluate(()=>document.querySelector('.ct-oral-sala-topo').getBoundingClientRect().top>=document.querySelector('.ct-topbar').getBoundingClientRect().bottom));
 const estado=await p.evaluate(()=>{const s=window.__catedraApp.state;return {fila:s.argFila,id:s.argSessaoId,min:s.argMin};});
 const inicio=await p.evaluate(id=>window.__catedraApp.state.sessions.find(s=>s.id===id),estado.id);assert.equal(inicio.date,'');assert.equal(inicio.countMeta,false);
 assert.equal(estado.fila.length,3);assert.equal(new Set(estado.fila.map(q=>q.enunciado)).size,3);assert.equal(estado.min,5);
 assert.equal(await sala.getByRole('region',{name:'Comparação com a banca'}).count(),0);
 await sala.getByRole('button',{name:'Pausar conversa',exact:true}).click();
 await sala.getByText('Conversa pausada',{exact:true}).waitFor();
 const perguntaOriginal=await p.evaluate(()=>window.__catedraApp.state.argFila[0].enunciado);
 await p.evaluate(()=>{const a=window.__catedraApp;a.setState({argFila:a.state.argFila.map((q,i)=>i===0?{...q,enunciado:'Enunciado longo de prova. '.repeat(180)}:q)});});
 for(const width of [390,1280]){
  await p.setViewportSize({width,height:900});
  await p.waitForFunction(()=>window.__catedraApp.state.isMobile===(innerWidth<900));
  assert.ok(await sala.locator('.ct-oral-pergunta').evaluate(e=>e.getBoundingClientRect().height>500));
  await sala.locator('#ct-arg-resposta').scrollIntoViewIfNeeded();
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const relogio=await p.evaluate(()=>{const r=document.querySelector('.ct-oral-relogio').getBoundingClientRect(),c=document.querySelector('.ct-topbar').getBoundingClientRect();return {top:r.top,bottom:r.bottom,cab:c.bottom,altura:innerHeight};});
  assert.ok(relogio.top>=relogio.cab-1&&relogio.bottom<relogio.altura,JSON.stringify(relogio));
 }
 await p.evaluate(texto=>{const a=window.__catedraApp;a.setState({argFila:a.state.argFila.map((q,i)=>i===0?{...q,enunciado:texto}:q)});},perguntaOriginal);
 await sala.locator('#ct-arg-resposta').fill('Minha resposta integral: posição, fundamento e ressalvas.');
 await p.waitForTimeout(1400);
 const pausa=await p.evaluate(()=>window.__catedraApp.state.argSeg);
 const gravado=await p.evaluate(id=>JSON.parse(localStorage.getItem('catedra:sessions')).find(s=>s.id===id),estado.id);
 assert.equal(gravado.oralEstado.fila.length,3);assert.equal(gravado.oralEstado.resposta,'Minha resposta integral: posição, fundamento e ressalvas.');
 assert.equal(gravado.oralEstado.seg,pausa);
 for(const dir of ['sutil','premium'])for(const dark of [false,true])for(const width of [390,1024,1280]){
  await p.setViewportSize({width,height:900});await p.evaluate(({dark,dir})=>{const a=window.__catedraApp;a.setState({darkMode:dark,dir,prefs:{...a.state.prefs,fontScale:'grande'}});},{dark,dir});await p.waitForTimeout(160);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  const medida=await p.evaluate(()=>{
   const canais=c=>(c.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
   const lum=c=>canais(c).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
   const e=document.querySelector('.ct-oral-pergunta'),txt=e.querySelector('p'),f=lum(getComputedStyle(txt).color),b=lum(getComputedStyle(e).backgroundColor);
   const buttons=[...document.querySelectorAll('.ct-oral-sala button')].filter(e=>e.getBoundingClientRect().height>0);
   return {contraste:(Math.max(f,b)+.05)/(Math.min(f,b)+.05),toque:buttons.every(e=>e.getBoundingClientRect().height>=43.9),pergunta:e.getBoundingClientRect().width,fonte:parseFloat(getComputedStyle(e).getPropertyValue('--fs-base'))};
  });
  assert.ok(medida.contraste>=4.5,JSON.stringify(medida));assert.ok(medida.toque);assert.ok(medida.pergunta>200);assert.ok(medida.fonte>13.5);
  if(capturas&&[390,1280].includes(width))await sala.screenshot({path:capturas+'/oral-sala-'+dir+'-'+width+'-'+(dark?'escuro':'claro')+'.png'});
 }
 await p.reload();await p.waitForFunction(()=>window.__catedraApp);await p.evaluate(()=>window.__catedraGoView('oral'));
 await p.getByRole('button',{name:'Retomar arguição',exact:true}).click();await sala.getByText('Conversa pausada',{exact:true}).waitFor();
 assert.equal(await sala.locator('#ct-arg-resposta').inputValue(),gravado.oralEstado.resposta);
 assert.equal(await p.evaluate(()=>window.__catedraApp.state.argSeg),pausa);await p.waitForTimeout(1100);assert.equal(await p.evaluate(()=>window.__catedraApp.state.argSeg),pausa);
 await p.evaluate(()=>{const a=window.__catedraApp;a.setState({argFila:a.state.argFila.map((q,i)=>i===a.state.argIdx?{...q,padrao:'Padrão oficial longo. '.repeat(180)}:q)});});
 await sala.getByRole('button',{name:'Respondi — ver o padrão',exact:true}).click();
 await sala.getByRole('region',{name:'Comparação com a banca'}).waitFor();
 await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 assert.ok(await p.evaluate(()=>document.querySelector('.ct-oral-correcao').getBoundingClientRect().top>=document.querySelector('.ct-oral-sala-topo').getBoundingClientRect().bottom-1));
 await sala.getByRole('button',{name:'Respondi bem',exact:true}).scrollIntoViewIfNeeded();
 await p.evaluate(()=>{const a=window.__catedraApp;a.argAvaliar({currentTarget:{dataset:{v:'bem'}}});a.argAvaliar({currentTarget:{dataset:{v:'bem'}}});});
 await p.waitForFunction(()=>window.__catedraApp.state.argIdx===1);assert.equal(await p.evaluate(()=>window.__catedraApp.state.argRespostas.length),1);
 await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 assert.ok(await p.evaluate(()=>document.querySelector('.ct-oral-pergunta').getBoundingClientRect().top>=document.querySelector('.ct-oral-sala-topo').getBoundingClientRect().bottom-1));
 await sala.getByRole('button',{name:'Pausar conversa',exact:true}).click();
 await p.evaluate(()=>window.__catedraGoView('inicio'));await p.waitForFunction(()=>window.__catedraApp.state.view==='inicio'&&!window.__catedraApp.state.argRodando);const saiu=await p.evaluate(()=>window.__catedraApp.state.argSeg);await p.waitForTimeout(1100);assert.equal(await p.evaluate(()=>window.__catedraApp.state.argSeg),saiu);await p.evaluate(()=>window.__catedraGoView('oral'));
 await sala.getByRole('button',{name:'Encerrar conversa',exact:true}).click();
 await p.getByRole('button',{name:'Retomar arguição',exact:true}).click();
 await sala.getByText('Conversa pausada',{exact:true}).waitFor();
 assert.equal(await p.evaluate(()=>window.__catedraApp.state.argIdx),1);
 assert.equal(await p.evaluate(id=>window.__catedraApp.state.sessions.filter(s=>s.id===id).length,estado.id),1);
 const contaOriginal=await p.evaluate(()=>window.__catedraApp.state.authEmail);
 await p.evaluate(()=>{const a=window.__catedraApp;a.setState({authEmail:'outra@conta.test'});a.argEncerrar();});
 assert.equal(await p.getByRole('button',{name:'Retomar arguição',exact:true}).count(),0);
 await p.evaluate(email=>window.__catedraApp.setState({authEmail:email}),contaOriginal);
 await p.getByRole('button',{name:'Retomar arguição',exact:true}).click();
 for(let i=1;i<3;i++){
  await sala.getByRole('button',{name:'Respondi — ver o padrão',exact:true}).click();
  await sala.getByRole('button',{name:'Respondi bem',exact:true}).click();
 }
 await p.getByRole('region',{name:'Resultado da arguição'}).waitFor();
 await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 assert.ok(await p.evaluate(()=>{const r=document.querySelector('.ct-oral-fecho').getBoundingClientRect();return r.top>=document.querySelector('.ct-topbar').getBoundingClientRect().bottom-1&&r.top<innerHeight;}));
 assert.equal(await p.evaluate(()=>window.__catedraApp.state.argRespostas.length),3);
 await p.getByRole('button',{name:'Nova arguição',exact:true}).click();
 const pausaTeclado=sala.getByRole('button',{name:'Pausar conversa',exact:true});
 await pausaTeclado.focus();await p.keyboard.press('Space');
 await sala.getByText('Conversa pausada',{exact:true}).waitFor();
 assert.ok(await sala.getByRole('button',{name:'Continuar conversa',exact:true}).evaluate(e=>{const c=getComputedStyle(e);return e.matches(':focus-visible')&&(parseFloat(c.outlineWidth)>0||c.boxShadow!=='none');}));
 await p.keyboard.press('Tab');
 assert.ok(await p.evaluate(()=>document.querySelector('.ct-oral-sala').contains(document.activeElement)&&document.activeElement.tagName==='BUTTON'));
 await sala.getByRole('button',{name:'Encerrar conversa',exact:true}).click();
 assert.deepEqual(erros,[]);
 console.log(motor+': sala, filtros, fila sem repetição, tempo, contraste medido, toque, retomada integral, histórico único e isolamento de conta passaram.');
}finally{await browser.close();srv.close();}
