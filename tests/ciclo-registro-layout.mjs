
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {iniciarServidor,lancarNavegador} from './_infra.mjs';
import {testarRegistroSessao} from './registro-sessao.mjs';
const {srv,url}=await iniciarServidor(process.cwd(),+(process.env.CT_PORT||9468));
const {browser,motor}=await lancarNavegador();
const pasta=process.env.CT_CAPTURAS;
if(pasta)fs.mkdirSync(pasta,{recursive:true});
async function medirContraste(p, seletor){
 return p.locator(seletor).evaluateAll(es=>{
  const ctx=document.createElement('canvas').getContext('2d');
  const rgba=c=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=c;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].map((v,i)=>i===3?v/255:v)};
  const sobre=(a,b)=>[0,1,2].map(i=>a[i]*a[3]+b[i]*(1-a[3])).concat(1);
  const luz=c=>c.slice(0,3).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
  return es.map(e=>{
   const pais=[];for(let n=e;n;n=n.parentElement)pais.unshift(n);
   let bg=rgba(getComputedStyle(document.documentElement).getPropertyValue('--surface'));
   for(const n of pais)bg=sobre(rgba(getComputedStyle(n).backgroundColor),bg);
   const fg=sobre(rgba(getComputedStyle(e).color),bg),a=luz(fg),b=luz(bg);
   return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  });
 });
}
try{
 for(const largura of [390,1280])for(const escuro of [false,true]){
  const p=await browser.newPage({viewport:{width:largura,height:960},hasTouch:true});
  const erros=[];p.on('pageerror',e=>erros.push(e.message));
  await p.goto(url+'/__semente');
  await p.evaluate(()=>{localStorage.clear();for(const [k,v]of Object.entries({auth:'1',onboarded:'1',cycleMode:'magistratura'}))localStorage.setItem('catedra:'+k,v);});
  await p.goto(url+'/Catedra.dc.html');await p.waitForFunction(()=>window.__catedraApp&&window.CT_CMAG);
  await p.evaluate(({escuro,largura})=>{const a=window.__catedraApp,c=CT_CMAG.vazio();c.ativas=largura===390?1:4;a.setState({view:'ciclo',cyclePanel:'executar',cycleMode:'magistratura',darkMode:escuro,sessions:[],cmag:c});a._cmSet(c);},{escuro,largura});
  const mapa=p.getByRole('navigation',{name:'Sequência da volta do ciclo'});
  await mapa.waitFor();await p.waitForTimeout(450);
  assert.equal(await mapa.locator('.cm-etapa').count(),largura===390?2:5);
  assert.equal(await mapa.locator('[aria-current="step"]').count(),1);
  const b=await p.evaluate(()=>{
   const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};
   return {ativas:box('.cm-mapa-ativas'),fila:box('.cm-mapa-fila'),percurso:box('.cm-grade'),mapa:box('.cm-mapa'),overflow:document.documentElement.scrollWidth>innerWidth,
    alvos:[...document.querySelectorAll('.cm-mapa button')].map(e=>e.getBoundingClientRect().height)};
  });
  assert.ok(!b.overflow);assert.ok(b.mapa.y+b.mapa.h<=b.percurso.y+1);
  if(largura===390)assert.ok(b.fila.y>b.ativas.y);else assert.ok(b.fila.x>b.ativas.x);
  assert.ok(b.alvos.every(n=>n>=44));
  const contrasteMapa=await medirContraste(p,'.cm-mapa .cm-etapa-info b,.cm-mapa .cm-mapa-legenda b,.cm-mapa .cm-fila li');
  assert.ok(contrasteMapa.every(n=>n>=4.5),JSON.stringify(contrasteMapa));
  if(pasta)await mapa.screenshot({path:pasta+'/ciclo-'+largura+'-'+(escuro?'escuro':'claro')+'-'+motor+'.png'});
  await p.locator('.cm-hero button').filter({hasText:'Registrar tempo'}).click();
  const dlg=p.getByRole('dialog',{name:'Registrar sessão',exact:true});await dlg.waitFor();
  assert.equal(await dlg.getByRole('combobox',{name:'Etapa do ciclo'}).inputValue(),'a2');
  const caixas=await dlg.evaluate(e=>{
   const box=s=>{const r=e.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};
   return{a:box('.ct-reg-identidade'),b:box('.ct-reg-duracao'),v:box('.cm-session'),overflow:e.scrollWidth>e.clientWidth};
  });
  assert.ok(!caixas.overflow);
  if(largura===390)assert.ok(caixas.b.y>caixas.a.y);else assert.ok(caixas.b.x>caixas.a.x);
  assert.ok(caixas.v.y>caixas.a.y);
  const contrasteRegistro=await medirContraste(p,'.ct-reg .ct-reg-secao-t,.ct-reg .ct-reg-aviso,.ct-reg .ct-reg-chip[aria-pressed=\"true\"]');
  assert.ok(contrasteRegistro.every(n=>n>=4.5),JSON.stringify(contrasteRegistro));
  console.log('Contraste mínimo '+motor+' '+largura+' '+escuro+': '+Math.min(...contrasteMapa,...contrasteRegistro).toFixed(2));
  await dlg.getByRole('spinbutton',{name:'Minutos de estudo'}).fill('25');
  await dlg.getByRole('textbox',{name:'Onde parei nesta sessão',exact:true}).fill('Página 73');
  await dlg.getByRole('textbox',{name:'Próxima ação desta sessão'}).fill('Retomar controle difuso');
  await dlg.evaluate(e=>{e.scrollTop=0});
  if(pasta)await p.screenshot({path:pasta+'/registro-'+largura+'-'+(escuro?'escuro':'claro')+'-'+motor+'.png'});
  await dlg.getByRole('button',{name:'Registrar sessão',exact:true}).click();
  await p.waitForFunction(()=>window.__catedraApp.state.sessions.length===1);
  const salvo=await p.evaluate(()=>{const a=window.__catedraApp,c=a._cm();return{min:a.state.sessions[0].min,done:c.st.const.d.a2,ponto:c.st.const.retomadas.a2.ponto}});
  assert.equal(salvo.min,25);assert.ok(!salvo.done);assert.equal(salvo.ponto,'Página 73');
  assert.deepEqual(erros,[]);
  console.log(motor+': '+largura+' '+(escuro?'escuro':'claro')+' — hierarquia, toque, largura e registro sem avanço passaram');
  await p.close();
 }
 if(!process.env.CT_APENAS_LAYOUT){
 const p=await browser.newPage();const falhas=[];
 await testarRegistroSessao(p,url,(v,t)=>{if(!v)falhas.push(t);},{motor});
 assert.deepEqual(falhas,[]);await p.close();
 console.log(motor+': projeções, histórico, revisão e acessibilidade do registro passaram.');
 }
}finally{await browser.close();await new Promise(r=>srv.close(r));}
