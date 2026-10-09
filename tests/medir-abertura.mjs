// Medição local repetível, sem conta real, telemetria ou dados pessoais.
import fs from 'node:fs';
import path from 'node:path';
import { iniciarServidor, lancarNavegador } from './_infra.mjs';
const raiz = path.resolve('.');
const {srv,url} = await iniciarServidor(raiz, 8138);
const {browser,motor} = await lancarNavegador();
const amostras = [];
try {
  for (let i=0;i<3;i++) {
    const ctx = await browser.newContext({viewport:{width:390,height:844}});
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.__lcp = null;
      try { new PerformanceObserver(l => { const e=l.getEntries(); window.__lcp=e[e.length-1].startTime; }).observe({type:'largest-contentful-paint',buffered:true}); } catch (_) {}
    });
    if (motor==='chromium') {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});
      await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    }
    await page.goto(url+'/public/index.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => document.querySelector('#ct-main') && !document.querySelector('#ct-carregamento'),{},{timeout:60000});
    await page.waitForTimeout(500);
    amostras.push(await page.evaluate(() => ({lcp:window.__lcp,paint:performance.getEntriesByType('paint').map(e=>({nome:e.name,ms:e.startTime})),abertura:window.CT_ABERTURA_METRICAS||null,recursos:performance.getEntriesByType('resource').map(e=>({arquivo:new URL(e.name).pathname,bytes:e.transferSize,ms:e.duration})).sort((a,b)=>b.bytes-a.bytes).slice(0,5)})));
    await ctx.close();
  }
  const resultado={motor,perfil:motor==='chromium'?'390×844; CDP 150ms, 1.6Mbps, CPU 4×; 3 contextos frios; não é Lighthouse':'390×844; sem emulação CDP',amostras};
  const destino=process.env.CT_MEDICAO || 'work/abertura-medicao.json';
  fs.mkdirSync(path.dirname(destino),{recursive:true});fs.writeFileSync(destino,JSON.stringify(resultado,null,2));
  console.log(JSON.stringify(resultado,null,2));
} finally {await browser.close();srv.close();}
