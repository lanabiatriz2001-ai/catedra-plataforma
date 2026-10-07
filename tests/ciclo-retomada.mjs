import { iniciarServidor, lancarNavegador } from './_infra.mjs';
const {srv,url}=await iniciarServidor(process.cwd(),9347);
const {browser}=await lancarNavegador();
try {
  const p=await browser.newPage();
  await p.goto(url+'/__semente');
  await p.evaluate(()=>{localStorage.setItem('catedra:auth','1');localStorage.setItem('catedra:onboarded','1');localStorage.setItem('catedra:cycleMode','magistratura');});
  await p.goto(url+'/Catedra.dc.html');
  await p.waitForFunction(()=>window.__catedraApp&&window.CT_CMAG);
  await p.evaluate(()=>{const a=window.__catedraApp;a.setState({view:'ciclo',cycleMode:'magistratura',cmag:CT_CMAG.vazio()});a._cmSet(a._cm());});
  await p.locator('input[placeholder="Ex.: página 42 · parei antes de controle difuso"]').fill('Página 42');
  await p.locator('input[placeholder="Ex.: retomar o exemplo e terminar a seção"]').fill('Ler o exemplo');
  await p.evaluate(()=>{const a=window.__catedraApp,e={currentTarget:{dataset:{id:'const',k:'a2'}}};a.cmEtapaEstudar(e);a.setState({timerMode:'livre',timerSeconds:1200,studiedSeconds:1200});a.cmGuardarDepois(e);});
  await p.waitForFunction(()=>window.__catedraApp.state.sessionModalOpen);
  let r=await p.evaluate(()=>{const a=window.__catedraApp,d=a.state.sessionDraft;return {running:a.state.timerRunning,min:d.minutos,k:d.cmEtapa,done:a._cm().st.const.d.a2};});
  if(r.running||r.min!=='20'||r.k!=='a2'||r.done)throw Error(JSON.stringify(r));
  await p.evaluate(()=>window.__catedraApp.saveSession());
  await p.waitForFunction(()=>{const c=JSON.parse(localStorage.getItem('catedra:cmag')||'{}');return c.st&&c.st.const&&c.st.const.retomadas&&c.st.const.retomadas.a2&&c.st.const.retomadas.a2.ponto==='Página 42';});
  await p.reload();await p.waitForFunction(()=>window.__catedraApp&&window.CT_CMAG);
  r=await p.evaluate(()=>{const a=window.__catedraApp;a.setState({view:'ciclo'});const v=a._cmView().cmAtivas[0];return {ponto:v.retomadaPonto,proximo:v.retomadaProximo,acao:v.retomadaAcao,min:v.A.find(x=>x.k==='a2').tempo,done:a._cm().st.const.d.a2,vez:a._cm().vez};});
  if(r.ponto!=='Página 42'||r.proximo!=='Ler o exemplo'||r.acao!=='Continuar Doutrina'||r.min!==20||r.done||r.vez!==0)throw Error(JSON.stringify(r));
  console.log('Pausa, 20 minutos registrados e retomada após reabrir:',r);
} finally {await browser.close();srv.close();}
