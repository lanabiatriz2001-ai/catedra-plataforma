import { readFileSync } from 'node:fs';
import vm from 'node:vm';
export async function testarMotorFSRS(ok){
  const ctx={}; vm.createContext(ctx); vm.runInContext(readFileSync(new URL('../fsrs.js',import.meta.url),'utf8'),ctx);
  const F=ctx.CT_FSRS, fixture=JSON.parse(readFileSync(new URL('./fixtures/fsrs6-oficial.json',import.meta.url),'utf8'));
  const erros=fixture.rows.filter(x=>{const agora=Date.parse('2026-10-07T12:00:00Z'),item=x.memory?{fsrs:{...x.memory,lastReview:agora-x.t*86400000}}:{};const r=F.responder(item,[0,2,3,4,5][x.g],agora),m=r.fsrs;return Math.abs(m.stability-x.expected.stability)>1e-7||Math.abs(m.difficulty-x.expected.difficulty)>1e-7||r.intervalo!==x.interval;});
  ok(erros.length===0,'FSRS: '+fixture.rows.length+' vetores independentes conferem com ts-fsrs 5.4.2 ('+erros.length+' divergências)');
  const ts=Date.parse('2026-10-07T12:00:00Z');
  const r=F.responder({},4,ts), tarde=F.responder(r,4,ts+17*86400000), cedo=F.responder(r,4,ts+86400000), erro=F.responder(tarde,2,ts+30*86400000);
  ok(r.intervalo===2&&r.fsrs.version===6&&r.fsrs.history[0].rating===3,'FSRS: Bom inicial usa estado novo, estabilidade e histórico real');
  ok(tarde.fsrs.stability>cedo.fsrs.stability,'FSRS: lembrança depois de atraso atualiza a memória pelo tempo realmente decorrido');
  ok(erro.due===0&&erro.fsrs.lapses===1&&erro.fsrs.history.length===3,'FSRS: Errei volta hoje, mantém respostas anteriores e contabiliza falha');
  const legado={id:'preservado',dueDate:'2026-10-14',intervalo:30,repeticoes:5,facilidade:2.3,front:'frente',back:'resposta',ref:'CC art. 1'};
  const antes=JSON.stringify(legado);const migrado=F.responder(legado,4,ts);
  ok(JSON.stringify(legado)===antes&&migrado.fsrs.history.length===1&&migrado.repeticoes===6,'FSRS: migração ao responder não altera fonte nem inventa respostas antigas');
  const preview=F.responder(r,5,ts,false);
  ok(preview.fsrs.history.length===r.fsrs.history.length&&r.fsrs.history.length===1,'FSRS: prévia não registra resposta nem muta memória');
  let recusou=false;try{F.responder({},NaN,ts);}catch(_){recusou=true;}
  ok(recusou,'FSRS: avaliação inválida não grava estado');
  let install, waiting, activated=false, deleted=false;
  const self={location:new URL('https://catedra.example/sw.js'),addEventListener:(type,fn)=>{if(type==='install')install=fn;},skipWaiting:()=>{activated=true;}};
  const caches={open:async()=>({addAll:async(reqs)=>{if(reqs.some(r=>String(r.url||r).includes('fsrs.js')))throw new Error('motor ausente');},add:async()=>{}}),delete:async()=>{deleted=true;}};
  vm.runInNewContext(readFileSync(new URL('../sw.js',import.meta.url),'utf8'),{self,caches,URL,Request,console});
  install({waitUntil:p=>{waiting=p;}});let rejected=false;try{await waiting;}catch(_){rejected=true;}
  ok(rejected&&deleted&&!activated,'FSRS: falha ao baixar o motor rejeita o novo cache offline, preservando a versão anterior');
}
