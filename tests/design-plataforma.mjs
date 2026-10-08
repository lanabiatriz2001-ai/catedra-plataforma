import assert from 'node:assert/strict';
import fs from 'node:fs';
import {iniciarServidor,lancarNavegador} from './_infra.mjs';
const {srv,url}=await iniciarServidor(process.cwd(),+(process.env.CT_PORT||9491));const {browser,motor}=await lancarNavegador();
try{
 for(const width of [390,1440]){
  const p=await browser.newPage({viewport:{width,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(url+'/__semente');await p.evaluate(()=>{localStorage.clear();localStorage.setItem('catedra:auth','1');localStorage.setItem('catedra:onboarded','1');});await p.goto(url+'/Catedra.dc.html');await p.waitForFunction(()=>window.__catedraApp);
  await p.evaluate(()=>{const a=window.__catedraApp;a.setState({dir:'holo',prefs:{...a.state.prefs,fontScale:'grande'}})});
  const before=await p.evaluate(()=>{const s=window.__catedraApp.state;return JSON.stringify({sessions:s.sessions,editais:s.editais,reviews:s.reviews,flashcards:s.flashcards,prefs:s.prefs,accent:s.accent,dir:s.dir})});
  for(const view of ['revisoes','flashcards','edital','calendario','analise']){
   await p.evaluate(v=>window.__catedraGoView(v),view);await p.locator(`[data-design-view="${view}"] .ct-design-hero`).waitFor();
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),view+' sem rolagem lateral');
   assert.equal(await p.locator(`[data-design-view="${view}"] .ct-design-hero`).count(),1);
   if(process.env.CT_CAPTURAS){fs.mkdirSync(process.env.CT_CAPTURAS,{recursive:true});await p.screenshot({path:`${process.env.CT_CAPTURAS}/${view}-${width}-${motor}.png`})}
  }
  const after=await p.evaluate(()=>{const s=window.__catedraApp.state;return JSON.stringify({sessions:s.sessions,editais:s.editais,reviews:s.reviews,flashcards:s.flashcards,prefs:s.prefs,accent:s.accent,dir:s.dir})});assert.equal(after,before,'dados e preferências preservados');assert.deepEqual(errors,[]);await p.close();console.log(`${motor}: cinco superfícies ${width}, fonte grande, largura e preservação passaram`);
 }
}finally{await browser.close();srv.close();}
