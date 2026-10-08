import assert from 'node:assert/strict';
import fs from 'node:fs';
import {iniciarServidor,lancarNavegador} from './_infra.mjs';
const {srv,url}=await iniciarServidor(process.cwd(),+(process.env.CT_PORT||9470));
const {browser,motor}=await lancarNavegador();
try{
 const p=await browser.newPage({viewport:{width:390,height:844},timezoneId:'UTC'});
 await p.goto(url+'/__semente');await p.evaluate(()=>{localStorage.clear();localStorage.setItem('catedra:auth','1');localStorage.setItem('catedra:onboarded','1');localStorage.setItem('catedra:areaEstudo','"oab"');const dueDate=new Date(Date.now()-3*864e5).toISOString().slice(0,10);localStorage.setItem('catedra:oabHist@oab',JSON.stringify([{id:'historico-teste',ts:Date.now(),up:Date.now(),atividade:'Direito Penal · Leitura da área',rascunho:{enunciado:'Treino próprio',resposta:'Fundamento registrado',espelho:'Critério de comparação',ponto:'Página 12'}}]));localStorage.setItem('catedra:reviews@oab',JSON.stringify([{id:'legado-sem-disc',dueDate},{id:'revisao-com-disc',disc:'Direito Penal',topic:'Tipicidade',dueDate}]));localStorage.setItem('catedra:oabPlano@oab',JSON.stringify({fase:'2',area:'Penal',pos:{'2-Penal':'2-Penal|Direito Penal|Identificação e redação da peça'},rascunhos:{},feitos:{},voltas:{},concursos:{}}));});
 await p.goto(url+'/Catedra.dc.html');await p.getByRole('region',{name:'Percurso OAB',exact:true}).waitFor();
 assert.equal(await p.evaluate(()=>window.__catedraApp.state.reviews.length),2);assert.ok(await p.evaluate(()=>window.__catedraApp.state.reviews.every(r=>r.due<0)));await p.locator('.ct-oab details').evaluateAll(ds=>ds.forEach(d=>d.open=true));const records=[];
 for(const dark of [false,true])for(const width of [390,1280]){
  await p.setViewportSize({width,height:844});await p.waitForFunction(()=>window.__catedraApp.state.isMobile===(innerWidth<900));await p.evaluate(d=>window.__catedraApp.setState({darkMode:d}),dark);await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await p.waitForTimeout(400);
  const result=await p.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');const rgba=c=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=c;ctx.fillRect(0,0,1,1);const x=[...ctx.getImageData(0,0,1,1).data];return [x[0],x[1],x[2],x[3]/255];};const over=(a,b)=>{const t=a[3]??1;return a.slice(0,3).map((x,i)=>x*t+b[i]*(1-t));};
   const bg=e=>{const stack=[];for(let n=e;n;n=n.parentElement)stack.unshift(rgba(getComputedStyle(n).backgroundColor));return stack.reduce((b,a)=>over(a,b),[255,255,255]);};
   const lum=c=>c.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
   const root=document.querySelector('.ct-oab');const shown=e=>e.getBoundingClientRect().height>0;
   const targets=[...root.querySelectorAll('button,input,textarea,select,a,summary')].filter(shown).map(e=>({name:e.getAttribute('aria-label')||e.textContent.trim().slice(0,50),w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}));
   const contrasts=[...root.querySelectorAll('.ct-nota,.ct-eb,h2,h3,button,a')].filter(shown).map(e=>{let backgrounds=[bg(e)];if(e.classList.contains('ct-btn')){const probe=document.createElement('span');probe.style.color='var(--accentSolid)';e.appendChild(probe);const accent=rgba(getComputedStyle(probe).color).slice(0,3);probe.remove();backgrounds=[accent,accent.map(x=>x*.82)];}const ratios=backgrounds.map(background=>{const f=lum(over(rgba(getComputedStyle(e).color),background)),b=lum(background);return (Math.max(f,b)+.05)/(Math.min(f,b)+.05);});return {text:e.textContent.trim().slice(0,50),ratio:Math.min(...ratios)};});
   return {targets,contrasts,overflow:document.documentElement.scrollWidth>innerWidth+2};
  });
  assert.equal(result.overflow,false);assert.ok(result.targets.every(t=>t.w>=43.9&&t.h>=43.9),JSON.stringify(result.targets));assert.ok(result.contrasts.every(c=>c.ratio>=4.5),JSON.stringify(result.contrasts));records.push({motor,width,dark,...result});
  if(process.env.CT_CAPTURA_DIR){fs.mkdirSync(process.env.CT_CAPTURA_DIR,{recursive:true});await p.evaluate(()=>{document.activeElement?.blur();document.querySelector('.ct-scroll').scrollTop=0;});await p.screenshot({path:process.env.CT_CAPTURA_DIR+'/oab-'+width+'-'+(dark?'escuro':'claro')+'.png'});await p.getByLabel('Resposta OAB',{exact:true}).scrollIntoViewIfNeeded();await p.screenshot({path:process.env.CT_CAPTURA_DIR+'/oab-resposta-'+width+'-'+(dark?'escuro':'claro')+'.png'});await p.getByRole('button',{name:'Guardar por hoje',exact:true}).scrollIntoViewIfNeeded();await p.screenshot({path:process.env.CT_CAPTURA_DIR+'/oab-registro-'+width+'-'+(dark?'escuro':'claro')+'.png'});}
 }
 if(process.env.CT_CAPTURA_DIR)fs.writeFileSync(process.env.CT_CAPTURA_DIR+'/medidas-'+motor+'.json',JSON.stringify(records,null,2));console.log(motor+': contraste >=4.5, alvos >=44px e larguras390/1280 sem overflow.');
}finally{await browser.close();srv.close();}
