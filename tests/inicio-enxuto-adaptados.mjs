import {iniciarServidor,lancarNavegador} from './_infra.mjs';
import {testarVoltaOrigem} from './volta-origem.mjs';
import {testarReguaUnica} from './regua-unica.mjs';
import {testarIntegracaoFase2} from './integracao-fase2.mjs';
import {testarVariosEditais} from './varios-editais.mjs';
import {testarRevisaoOficial} from './revisao-oficial.mjs';
import {testarNovidadesCentral} from './novidades-central.mjs';
import {testarIphoneHost390} from './iphone-host-390.mjs';
const {srv,url}=await iniciarServidor(process.cwd(),+(process.env.CT_PORT||9363));const {browser,motor}=await lancarNavegador();const falhas=[];
const ok=(c,l)=>{console.log((c?'✓ ':'✗ ')+l);if(!c)falhas.push(l);};
try{
 const filtros=(process.env.CT_MODULOS||'regua,fase2,editais,oficial,novidades,iphone').split(',');
 for(const [nome,fn] of [['volta',testarVoltaOrigem],['regua',testarReguaUnica],['fase2',testarIntegracaoFase2],['editais',testarVariosEditais],['novidades',testarNovidadesCentral],['iphone',testarIphoneHost390]]){
  if(!filtros.includes(nome))continue;const p=await browser.newPage();try{await fn(p,url,ok,{motor,origem:'http'});}catch(e){ok(false,nome+': '+e.stack);}finally{await p.close();}
 }
 if(filtros.includes('oficial'))await testarRevisaoOficial(browser,url,ok,{motor});
}finally{await browser.close();srv.close();}
console.log(motor+': '+falhas.length+' falhas');process.exitCode=falhas.length?1:0;
