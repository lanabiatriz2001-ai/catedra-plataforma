import assert from 'node:assert/strict';
import {iniciarServidor,lancarNavegador} from './_infra.mjs';
const {srv,url}=await iniciarServidor(process.cwd(),+(process.env.CT_PORT||9361));const {browser,motor}=await lancarNavegador();
try{
 const p=await browser.newPage({viewport:{width:390,height:844}});const erros=[];p.on('pageerror',e=>erros.push(e.message));
 await p.goto(url+'/__semente');await p.evaluate(()=>{localStorage.clear();localStorage.setItem('catedra:auth','1');localStorage.setItem('catedra:onboarded','1');localStorage.setItem('catedra:cycleMode','magistratura');});
 await p.goto(url+'/Catedra.dc.html');await p.waitForFunction(()=>window.__catedraApp&&window.CT_CMAG);
 await p.evaluate(()=>{const a=window.__catedraApp;a.setState({view:'inicio',cycleMode:'magistratura',cmag:CT_CMAG.vazio(),editais:[{id:'a',nome:'TJ A',edital:[]},{id:'b',nome:'TJ B',edital:[]}],errors:[{id:'e',disc:'Direito Constitucional',topico:'Constitucionalismo',enunciado:'Erro preservado'}],reviews:[{id:'r',disc:'Direito Constitucional',topic:'Revisão preservada',dueDate:'2020-01-01',due:-1}],flashcards:[{id:'f',disc:'Direito Constitucional',front:'Card preservado',back:'Resposta'}]});a._cmSet(a._cm());});
 await p.getByRole('region',{name:'Retomar ciclo Magistratura'}).waitFor();assert.equal(await p.getByRole('region',{name:'Sessão sob medida'}).count(),1);assert.equal(await p.getByRole('heading',{name:'Números e dashboards'}).count(),1);
 for(const nome of ['Seus concursos','Onde estou fraca','O que mudou esta semana','Fontes oficiais','Próximas revisões'])assert.equal(await p.getByRole('heading',{name:nome,exact:true}).count(),0,nome);
 assert.equal(await p.locator('.cth-foco,.cth-baralho,#ct-semana,#ct-fontes-oficiais').count(),0);
 for(const width of [390,1280]){await p.setViewportSize({width,height:844});assert.equal(await p.getByRole('region',{name:'Retomar ciclo Magistratura'}).count(),1);assert.equal(await p.getByRole('region',{name:'Sessão sob medida'}).count(),1);assert.equal(await p.getByRole('heading',{name:'Números e dashboards'}).count(),1);assert.equal(await p.locator('.cth-foco,.cth-baralho,#ct-semana,#ct-fontes-oficiais').count(),0);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));if(process.env.CT_CAPTURA)await p.screenshot({path:process.env.CT_CAPTURA+'-'+width+'.png',fullPage:true});}
 const antes=await p.evaluate(()=>{const s=window.__catedraApp.state;return JSON.stringify({errors:s.errors,reviews:s.reviews,flashcards:s.flashcards,editais:s.editais});});
 await p.evaluate(()=>window.__catedraGoView('flashcards'));await p.locator('button.ct-bc-acao').click();await p.locator('.ct-fc-frente').waitFor();assert.match(await p.locator('.ct-fc-frente').innerText(),/Card preservado/);await p.evaluate(()=>window.__catedraApp.setState({fcSess:null}));
 await p.evaluate(()=>window.__catedraGoView('revisoes'));assert.match(await p.locator('main').innerText(),/Revisão preservada/);
 await p.evaluate(()=>window.__catedraGoView('novidades'));await p.getByRole('button',{name:'Ver revisão oficial',exact:true}).click();await p.locator('#ct-revisao-oficial').waitFor();assert.equal(await p.locator('#ct-revisao-oficial').count(),1);
 await p.keyboard.press('Escape');await p.evaluate(()=>window.__catedraGoView('inicio'));
 const depois=await p.evaluate(()=>{const s=window.__catedraApp.state;return JSON.stringify({errors:s.errors,reviews:s.reviews,flashcards:s.flashcards,editais:s.editais});});assert.equal(depois,antes);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.deepEqual(erros,[]);console.log(motor+': Início enxuto mantém ciclo, sessão sob medida, dashboards, dados e acesso às telas próprias.');
}finally{await browser.close();srv.close();}
