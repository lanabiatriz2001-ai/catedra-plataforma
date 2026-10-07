import complete from '../api/complete.js';
import tts from '../api/tts.js';
export async function testarReservaIA(ok){
  const oldFetch=globalThis.fetch, oldA=process.env.ANTHROPIC_API_KEY,oldG=process.env.GEMINI_API_KEY,oldB=process.env.BETA_EMAILS;
  process.env.ANTHROPIC_API_KEY='teste';process.env.GEMINI_API_KEY='teste';delete process.env.BETA_EMAILS;
  const fakeRes=()=>({code:0,status(n){this.code=n;return this;},json(body){this.body=body;return this;}});
  try{
    let used=0,paid=0,fail=false;
    globalThis.fetch=async(url)=>{const u=String(url);
      if(u.endsWith('/auth/v1/user'))return {ok:true,json:async()=>({id:'test-user',email:'test@example.invalid'})};
      if(u.endsWith('/meu_email_liberado'))return {ok:true,json:async()=>true};
      if(u.endsWith('/meu_acesso_bloqueado'))return {ok:true,json:async()=>false};
      if(u.endsWith('/minha_cota_ia'))return {ok:true,json:async()=>({limite:1,usadas:0,restante:1})};
      if(u.endsWith('/reservar_uso_ia')){if(fail)return {ok:false};const accepted=used<1;if(accepted)used++;return {ok:true,json:async()=>({reservada:accepted,limite:1,usadas:used,restante:0})};}
      if(u.includes('anthropic.com')){paid++;return {ok:true,json:async()=>({content:[{type:'text',text:'ok'}]})};}
      if(u.includes('googleapis.com')){paid++;return {ok:true,json:async()=>({output_audio:{data:Buffer.from('abcd').toString('base64'),mime_type:'audio/L16;rate=24000'}})};}
      throw new Error('rota inesperada '+u);
    };
    const responses=Array.from({length:12},()=>fakeRes());
    await Promise.all(responses.map((res,i)=>(i%2?tts:complete)({method:'POST',headers:{authorization:'Bearer test'},body:{prompt:'teste',texto:'teste'}},res)));
    ok(responses.filter(x=>x.code===200).length===1&&responses.filter(x=>x.code===429).length===11&&paid===1,'SEGURANÇA: complete/tts concorrentes só pagam uma chamada com uma reserva disponível');
    fail=true;paid=0;const res=fakeRes();await complete({method:'POST',headers:{authorization:'Bearer test'},body:{prompt:'teste'}},res);
    ok(res.code===503&&paid===0,'SEGURANÇA: reserva indisponível não libera chamada paga');
  }finally{globalThis.fetch=oldFetch;for(const [key,value] of [['ANTHROPIC_API_KEY',oldA],['GEMINI_API_KEY',oldG],['BETA_EMAILS',oldB]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
}
