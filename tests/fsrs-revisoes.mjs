export async function testarRevisoesFSRS(page,base,ok){
  await page.goto(base+'/__semente');
  await page.evaluate(()=>{localStorage.clear();localStorage.setItem('catedra:auth','1');localStorage.setItem('catedra:onboarded','1');localStorage.setItem('catedra:reviews',JSON.stringify([{id:'fsrs-legado',disc:'Direito Civil',topic:'Prescrição',ref:'CC art. 189',due:0,intervalo:30,repeticoes:5,facilidade:2.3,up:1}]));});
  await page.goto(base+'/Catedra.dc.html');await page.waitForFunction(()=>window.__catedraApp&&window.CT_FSRS);
  const antes=await page.evaluate(()=>{const a=window.__catedraApp,r=a.state.reviews.find(x=>x.id==='fsrs-legado');return {fsrs:!!r.fsrs,ref:r.ref,reps:r.repeticoes};});
  ok(!antes.fsrs&&antes.ref==='CC art. 189'&&antes.reps===5,'FSRS: abrir não substitui memória antiga nem conteúdo');
  await page.evaluate(()=>{const a=window.__catedraApp;a.startRevSession();a.revReveal();});await page.waitForTimeout(100);
  await page.evaluate(()=>window.__catedraApp.revAnswer({currentTarget:{dataset:{q:'4'}}}));await page.waitForTimeout(1400);
  const respondeu=await page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('catedra:reviews')).find(x=>x.id==='fsrs-legado');return {id:r.id,topic:r.topic,ref:r.ref,reps:r.repeticoes,iv:r.intervalo,f:r.fsrs,up:r.up};});
  ok(respondeu.id==='fsrs-legado'&&respondeu.topic==='Prescrição'&&respondeu.ref==='CC art. 189'&&respondeu.reps===6&&respondeu.f?.version===6&&respondeu.f.history.length===1&&respondeu.f.history[0].rating===3&&respondeu.up>1,'FSRS: sessão real registra Bom e preserva identidade, fonte e estudo');
  await page.reload();await page.waitForFunction(()=>window.__catedraApp&&window.CT_FSRS);
  const voltou=await page.evaluate(()=>window.__catedraApp.state.reviews.find(x=>x.id==='fsrs-legado'));
  ok(voltou.fsrs?.stability===respondeu.f.stability&&voltou.fsrs.history.length===1&&voltou.intervalo===respondeu.iv,'FSRS: memória e data sobrevivem ao recarregar');
  const ciclo=await page.evaluate(()=>{const a=window.__catedraApp;a.setState({cmagRevs:[{id:'fsrs-ciclo',disc:'Civil',ass:'Contratos',dt:'2026-01-01',f7:true,f30:false,f90:false,up:1}]});return new Promise(r=>setTimeout(()=>{a._reconcileReviews();setTimeout(()=>{const b=a.state.reviews.find(x=>x.id==='fsrs-ciclo');r({date:b?.dueDate,duplicados:a._revisoesDoCicloFSRS().filter(x=>x.id==='fsrs-ciclo').length,antiga:a.state.cmagRevs[0].f7});},100);},100));});
  ok(ciclo.date==='2026-01-31'&&ciclo.duplicados===1&&ciclo.antiga===true,'FSRS: revisão do ciclo preserva a próxima data antiga sem duplicar nem apagar conclusão');
  const removida=await page.evaluate(()=>{const a=window.__catedraApp,antes=window.confirm;window.confirm=()=>true;a.reviewRemove({currentTarget:{dataset:{id:'fsrs-ciclo'}}});window.confirm=antes;return new Promise(r=>setTimeout(()=>r(!a._revisoesDoCicloFSRS().some(x=>x.id==='fsrs-ciclo')),100));});
  ok(removida,'FSRS: tirar a revisão do ciclo da fila geral não a recria pela migração');
}
