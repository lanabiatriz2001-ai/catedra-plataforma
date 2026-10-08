import assert from 'node:assert/strict';
import fs from 'node:fs';
import {iniciarServidor,lancarNavegador} from './_infra.mjs';
const {srv,url}=await iniciarServidor(process.cwd(),+(process.env.CT_PORT||9470));const {browser,motor}=await lancarNavegador();
const pasta=process.env.CT_CAPTURAS;if(pasta)fs.mkdirSync(pasta,{recursive:true});
try{
 for(const dir of ['holo','moderno','solar'])for(const width of [390,1440])for(const darkMode of [false,true]){
  const p=await browser.newPage({viewport:{width,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(url+'/__semente');await p.evaluate(()=>{localStorage.setItem('catedra:auth','1');localStorage.setItem('catedra:onboarded','1');localStorage.setItem('catedra:cycleMode','magistratura');});
  await p.goto(url+'/Catedra.dc.html');await p.waitForFunction(()=>window.__catedraApp&&window.CT_CMAG);
  await p.evaluate(({dir,darkMode})=>{const a=window.__catedraApp;a.setState({view:'inicio',dir,darkMode,prefs:{...a.state.prefs,fontScale:'grande'},cycleMode:'magistratura',cmag:CT_CMAG.vazio()});a._cmSet(a._cm());},{dir,darkMode});
  await p.getByRole('region',{name:'Retomar ciclo Magistratura'}).waitFor();
  assert.equal(await p.getByRole('heading',{name:'Números e dashboards'}).count(),1);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'sem rolagem lateral');
  const full=await p.locator('.cth-inicio').evaluate(e=>{const r=e.getBoundingClientRect(),parent=e.parentElement.getBoundingClientRect();return Math.abs(r.width-parent.width)<2;});assert.ok(full,'usa toda a largura útil');
  const etapas=await p.locator('.cth-etapas').innerText();assert.match(etapas,/Doutrina/);assert.doesNotMatch(etapas,/Inéditas/);
  assert.equal(await p.locator('.cth-etapas [aria-current="step"]').count(),1);
  assert.ok(await p.locator('.cth-bancada').evaluate((e,w)=>{const a=e.querySelector('.cth-estudo').getBoundingClientRect(),b=e.querySelector('.cth-apoio').getBoundingClientRect();return w>900?Math.abs(a.top-b.top)<2:b.top>=a.bottom;},width));
  await p.getByRole('button',{name:'Registrar tempo',exact:true}).focus();await p.keyboard.press('Enter');await p.getByRole('dialog',{name:'Registrar sessão',exact:true}).waitFor();await p.keyboard.press('Escape');
  if(pasta)await p.screenshot({path:`${pasta}/inicio-${dir}-${width}-${darkMode?'escuro':'claro'}-${motor}.png`});
  assert.deepEqual(errors,[]);await p.close();console.log(`${motor}: ${dir} ${width} ${darkMode?'escuro':'claro'} — largura total, dashboards, fonte grande e teclado`);
 }
}finally{await browser.close();srv.close();}
