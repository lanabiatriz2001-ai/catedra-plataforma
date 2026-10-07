import assert from 'node:assert/strict';
import {iniciarServidor,lancarNavegador} from './_infra.mjs';
const {srv,url}=await iniciarServidor(process.cwd(),+(process.env.CT_PORT||9370));const {browser,motor}=await lancarNavegador();
try{
 const p=await browser.newPage({viewport:{width:390,height:844}}),erros=[];p.on('pageerror',e=>erros.push(e.message));
 await p.goto(url+'/__semente');await p.evaluate(()=>{localStorage.clear();localStorage.setItem('catedra:auth','1');localStorage.setItem('catedra:onboarded','1');});await p.goto(url+'/Catedra.dc.html');await p.waitForFunction(()=>window.__catedraApp);
 await p.evaluate(()=>{const a=window.__catedraApp;a.setState({view:'simulados',simAba:'registro',sessions:[],sim:{total:20,acertos:12,erros:6,brancos:2},simMin:'40',simNome:'Registro integrado'});});
 assert.ok(await p.getByText('Raio-X do simulado',{exact:true}).isVisible());assert.equal(await p.getByText('Fazer simulado agora',{exact:true}).count(),0);
 await p.getByRole('button',{name:'Treinar 1ª fase',exact:true}).click();assert.ok(await p.getByText('Fazer simulado agora',{exact:true}).isVisible());assert.equal(await p.getByText('Raio-X do simulado',{exact:true}).count(),0);
 await p.evaluate(()=>window.__catedraApp.openSession());const modal=p.getByRole('dialog',{name:'Registrar sessão',exact:true});await modal.waitFor();await modal.getByRole('navigation',{name:'Modo de registro'}).getByRole('button',{name:'Simulado',exact:true}).click();await modal.getByRole('button',{name:'Registrar simulado no histórico',exact:true}).click();await modal.waitFor({state:'hidden'});
 const s=await p.evaluate(()=>window.__catedraApp.state.sessions);assert.equal(s.length,1);assert.equal(s[0].min,40);assert.equal(s[0].categoria,'Simulado');assert.equal(s[0].questoes,20);
 await p.evaluate(()=>{const a=window.__catedraApp;a.setState({timerSeconds:1200,studiedSeconds:1200,simMin:'',simNome:'Tempo único'});a.openSession();});await modal.waitFor();await modal.getByRole('navigation',{name:'Modo de registro'}).getByRole('button',{name:'Simulado',exact:true}).click();await modal.getByRole('button',{name:'Registrar simulado no histórico',exact:true}).click();await modal.waitFor({state:'hidden'});assert.equal(await p.evaluate(()=>window.__catedraApp.state.timerSeconds),0);assert.equal(await p.evaluate(()=>window.__catedraApp.state.sessions.filter(s=>s.topico==='Tempo único').reduce((n,s)=>n+s.min,0)),20);
 await p.reload();await p.waitForFunction(()=>window.__catedraApp);assert.equal(await p.evaluate(()=>window.__catedraApp.state.sessions.filter(s=>s.topico==='Registro integrado').length),1);
 await p.evaluate(()=>window.__catedraApp._irPara('redacao'));await p.getByRole('navigation',{name:'2ª fase',exact:true}).waitFor();await p.getByRole('button',{name:'Provas oficiais',exact:true}).click();assert.equal(await p.evaluate(()=>window.__catedraApp.state.view),'segundafase');await p.getByRole('button',{name:'Treino escrito',exact:true}).click();assert.equal(await p.evaluate(()=>window.__catedraApp.state.view),'redacao');assert.deepEqual(erros,[]);
 for(const width of [390,1280]){await p.setViewportSize({width,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));}
 console.log(motor+': áreas, abas e registro de simulado persistido uma vez passaram.');
}finally{await browser.close();srv.close();}
