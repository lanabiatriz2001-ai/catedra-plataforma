import assert from 'node:assert/strict';
import { iniciarServidor,lancarNavegador } from './_infra.mjs';
const {srv,url}=await iniciarServidor(process.cwd(),+(process.env.CT_PORT||9351));
const {browser,motor}=await lancarNavegador();
try{
 const p=await browser.newPage({viewport:{width:390,height:844}});
 const erros=[];p.on('pageerror',e=>erros.push(e.message));
 await p.goto(url+'/__semente');
 await p.evaluate(()=>{localStorage.clear();for(const [k,v] of Object.entries({auth:'1',onboarded:'1',cycleMode:'magistratura'}))localStorage.setItem('catedra:'+k,v);});
 await p.goto(url+'/Catedra.dc.html');await p.waitForFunction(()=>window.__catedraApp&&window.CT_CMAG);
 await p.evaluate(()=>{const a=window.__catedraApp;a.setState({view:'inicio',cycleMode:'magistratura',sessions:[],cmag:CT_CMAG.vazio()});a._cmSet(a._cm());});
 const home=p.getByRole('region',{name:'Retomar ciclo Magistratura'});
 await home.waitFor();assert.match(await home.innerText(),/Doutrina/);
 await home.getByRole('button',{name:'Registrar tempo',exact:true}).click();
 const dlg=p.getByRole('dialog',{name:'Registrar sessão',exact:true});
 assert.equal(await dlg.getByRole('combobox',{name:'Etapa do ciclo'}).inputValue(),'a2');
 await dlg.getByRole('textbox',{name:'Onde parei nesta sessão',exact:true}).fill('Página 73');
 await dlg.getByRole('textbox',{name:'Próxima ação desta sessão'}).fill('Retomar controle difuso');
 await dlg.getByRole('spinbutton',{name:'Minutos de estudo'}).fill('25');
 await dlg.getByRole('button',{name:'Registrar sessão',exact:true}).click();
 await p.waitForFunction(()=>window.__catedraApp.state.sessions.length===1);
 let r=await p.evaluate(()=>{const a=window.__catedraApp,s=a.state.sessions[0],c=a._cm();return {min:s.min,k:s.cmEtapa,nome:s.cmEtapaNome,id:s.cmagId,key:s.atvKey,done:c.st.const.d.a2,point:c.st.const.retomadas.a2.ponto,revs:a.state.reviews.length};});
 assert.equal(r.min,25);assert.equal(r.k,'a2');assert.equal(r.nome,'Doutrina');assert.equal(r.id,'const');assert.ok(r.key);assert.ok(!r.done);assert.equal(r.point,'Página 73');assert.equal(r.revs,0);
 assert.match(await home.innerText(),/Página 73/);assert.match(await home.innerText(),/25 min registrados/);
 if(process.env.CT_CAPTURA)await home.screenshot({path:process.env.CT_CAPTURA});
 await p.waitForFunction(()=>JSON.parse(localStorage.getItem('catedra:cmag')||'{}')?.st?.const?.retomadas?.a2?.ponto==='Página 73');
 await p.reload();await p.waitForFunction(()=>window.__catedraApp&&window.CT_CMAG);
 await home.waitFor();assert.match(await home.innerText(),/Retomar controle difuso/);
 await p.evaluate(()=>window.__catedraApp.toggleTimer());
 r=await p.evaluate(()=>{const a=window.__catedraApp;return {k:a.state.sessionDraft.cmEtapa,key:a.state.sessionDraft.atvKey,running:a.state.timerRunning};});assert.equal(r.k,'a2');assert.ok(r.key);assert.ok(r.running);
 await p.evaluate(()=>{const a=window.__catedraApp;a.setState({timerSeconds:600,studiedSeconds:600});a.openSession();});
 await dlg.getByRole('button',{name:'Registrar fora do ciclo'}).click();
 assert.equal(await dlg.getByRole('combobox',{name:'Etapa do ciclo'}).count(),0);
 await dlg.getByRole('button',{name:'Registrar sessão',exact:true}).click();
 await p.waitForFunction(()=>window.__catedraApp.state.sessions.length===2);await dlg.waitFor({state:'hidden'});
 r=await p.evaluate(()=>window.__catedraApp.state.sessions[0]);assert.equal(r.atvKey,null);assert.equal(r.cmEtapa,null);
 await home.locator('.cm-seq[data-id="juris"]').click();await home.getByRole('heading',{name:'Jurisprudência',exact:true}).waitFor();
 await home.getByRole('button',{name:'Registrar tempo',exact:true}).click();await dlg.getByRole('heading',{name:'Jurisprudência',exact:true}).waitFor();
 r=await p.evaluate(()=>window.__catedraApp.state.sessionDraft);assert.equal(r.disc,'Jurisprudência');assert.equal(r.agendarRevisao,false);assert.ok(r.atvKey.startsWith('vt|cm-juris-'));
 await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 await dlg.getByRole('textbox',{name:'Onde parei nesta sessão'}).pressSequentially('Súmula 12',{delay:25});
 await p.waitForFunction(()=>window.__catedraApp.state.sessionDraft.cmPonto==='Súmula 12').catch(async e=>{console.log('Diagnóstico do ponto:',await p.evaluate(()=>({draft:window.__catedraApp.state.sessionDraft,campo:document.querySelector('[data-k="cmPonto"]')?.value,aberto:window.__catedraApp.state.sessionModalOpen})));throw e;});
 await dlg.getByRole('spinbutton',{name:'Minutos de estudo'}).fill('15');
 await p.waitForFunction(()=>window.__catedraApp.state.sessionDraft.minutos==='15');
 await dlg.getByRole('button',{name:'Registrar sessão',exact:true}).click();
 await p.waitForFunction(()=>window.__catedraApp.state.sessions.length===3&&window.__catedraApp._cm().juris.ponto==='Súmula 12');
 r=await p.evaluate(()=>{const c=window.__catedraApp._cm();return c.juris;});assert.equal(r.etapa,0);assert.equal(r.ponto,'Súmula 12');
 r=await p.evaluate(()=>{const a=window.__catedraApp,s=a.state.sessions.find(s=>s.cmagId==='const');a.openHistEdit({currentTarget:{dataset:{id:s.id}}});a.setState({histEdit:{...a.state.histEdit,minutos:'35'}});a.saveHistEdit();return a._cmView().cmAtivas[0].tempo;});assert.equal(r,35);
 // Registro programático (ex.: prova oral) com o Magistratura ativo deve continuar
 // independente do ciclo e do cronômetro; não pode concluir ou mudar a retomada.
 r=await p.evaluate(()=>{
   const a=window.__catedraApp;
   if(!a.state.blocks.some(b=>b.cmagId))throw Error('Fixture sem bloco do Magistratura');
   a.setState({timerSeconds:420,studiedSeconds:420,timerRunning:true});
   const antes={cm:JSON.stringify(a._cm()),draft:JSON.stringify(a.state.sessionDraft),revs:JSON.stringify(a.state.reviews),n:a.state.sessions.length};
   const rec=a._registrarAtividadeAuto({categoria:'Prova oral',topico:'Controle de constitucionalidade',min:8,disc:'Direito Constitucional'});
   const salvo=JSON.parse(localStorage.getItem('catedra:sessions')||'[]')[0];
   const resultado={rec,salvo,maisUma:a.state.sessions.length===antes.n+1,cicloIgual:JSON.stringify(a._cm())===antes.cm,draftIgual:JSON.stringify(a.state.sessionDraft)===antes.draft,revsIguais:JSON.stringify(a.state.reviews)===antes.revs,cronometroPreservado:a.state.timerSeconds===420&&a.state.studiedSeconds===420&&a.state.timerRunning};
   a.setState({timerSeconds:0,studiedSeconds:0,timerRunning:false});return resultado;
 });
 assert.ok(r.maisUma);assert.ok(r.cicloIgual);assert.ok(r.draftIgual);assert.ok(r.revsIguais);assert.ok(r.cronometroPreservado);
 assert.equal(r.rec.disc,'Direito Constitucional');assert.equal(r.rec.topico,'Controle de constitucionalidade');assert.equal(r.rec.categoria,'Prova oral');assert.equal(r.rec.min,8);assert.equal(r.rec.auto,true);
 assert.equal(r.rec.atvKey,undefined);assert.equal(r.rec.cmEtapa,undefined);assert.equal(r.rec.concluiu,undefined);assert.deepEqual(r.salvo,r.rec);
 // O registro de simulado também mantém o ciclo independente.
 r=await p.evaluate(()=>{
   const a=window.__catedraApp,antes=JSON.stringify(a._cm()),n=a.state.sessions.length;
   a.setState({simNome:'Simulado de regressão',simMin:'30',simAnalysis:'objetiva',sim:{total:10,acertos:7,erros:2,brancos:1}});
   a.saveSimulado();return {rec:a.state.sessions[0],maisUma:a.state.sessions.length===n+1,cicloIgual:JSON.stringify(a._cm())===antes};
 });
 assert.ok(r.maisUma);assert.ok(r.cicloIgual);assert.equal(r.rec.categoria,'Simulado');assert.equal(r.rec.min,30);assert.equal(r.rec.questoes,10);assert.equal(r.rec.acertos,7);assert.equal(r.rec.atvKey,undefined);assert.equal(r.rec.cmEtapa,undefined);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.deepEqual(erros,[]);
 console.log(motor+': início, sessão por etapa, retomada após reload, cronômetro global, sessão avulsa, jurisprudência e registro automático integrados.');
}finally{await browser.close();srv.close();}
