export async function testarSegurancaBackup(page,base,ok){
  await page.goto(base+'/__semente');await page.evaluate(()=>{localStorage.clear();localStorage.setItem('catedra:auth','1');localStorage.setItem('catedra:onboarded','1');});
  await page.goto(base+'/Catedra.dc.html');await page.waitForFunction(()=>!!window.__catedraApp);
  const pip=await page.evaluate(async()=>{const app=window.__catedraApp,frame=document.createElement('iframe');document.body.appendChild(frame);Object.defineProperty(window,'documentPictureInPicture',{configurable:true,value:{requestWindow:async()=>frame.contentWindow}});app._restaurarBackup({accent:'</style><img src=x onerror="parent.__pipProof=1">'});await new Promise(r=>setTimeout(r,100));await app._openDocPiP();await new Promise(r=>setTimeout(r,300));const safe=!window.__pipProof&&!frame.contentDocument.querySelector('img[onerror]');app._closeDocPiP();frame.remove();return safe;});
  ok(pip,'SEGURANÇA: backup com fechamento de style não injeta script no PiP');
  const cores=await page.evaluate(async()=>{const a=window.__catedraApp;for(const cor of ['var(--danger)','var(--warn)']){a._restaurarBackup({accent:cor});await new Promise(r=>setTimeout(r,150));const esperado=getComputedStyle(document.querySelector('[data-dark][data-dir]')).getPropertyValue('--accent').trim();if(a.state.accent!==cor||a._accentHex()!==esperado||!/^#[0-9a-f]{6}$/i.test(a._accentHex()))return false;}return true;});
  ok(cores,'SEGURANÇA: backup preserva vermelho e laranja do seletor e resolve cor segura para o PiP');
  const casos=[['area-web.html?area=saude','areaModulo:v1','saude|sistema-tegumentar|epiderme'],['legis-web.html','legisEstudo',null],['juris-web.html','jurisEstudo',null]];
  for(const [file,key,fixed] of casos){
    await page.goto(base+'/'+file);await page.waitForTimeout(1300);
    const id=fixed||await page.evaluate(()=>document.querySelector('.lawrow[data-id],.vcard[data-id]')?.dataset.id);
    ok(!!id,'SEGURANÇA: fixture usa item real em '+file);if(!id)continue;
    await page.goto(base+'/__semente');await page.evaluate(({key,id})=>localStorage.setItem('catedra:'+key,JSON.stringify({fav:{},stat:{[id]:'"><img src=x onerror="window.__statusProof=1">'}})),{key,id});
    await page.goto(base+'/'+file);await page.waitForTimeout(1400);
    ok(await page.evaluate(()=>!window.__statusProof&&!document.querySelector('img[onerror]')),'SEGURANÇA: '+file+' rejeita status que rompe atributo HTML');
  }
}
