/* ==========================================================================
   peca-roteiro.js — o painel do ROTEIRO DE PEÇA, compartilhado.
   Usado por pecas-web.html (a grade de roteiros) e por ritos-web.html (o ✍️ do
   fluxo). Um só lugar para o modo cego, o cronômetro, a impressão e o estado —
   duas cópias divergiriam na primeira correção.

   Depende de: window.CT_PECAS (pecas.js).
   Expõe:      window.CTRoteiro.abrir(nome) · .fechar() · .feitos(nome)
               · .ramoDe(rito) · .RAMOS · .esc() · .limpa()
               · window.CTRoteiro.aoMudar = fn   (chamado quando o modo cego muda)
   ========================================================================== */
(function(){
'use strict';

/* ---------- estilo do componente (injetado: o HTML hospedeiro não repete) ---- */
const CSS = `
.ctr-velo{position:fixed;inset:0;background:rgba(20,15,10,.32);opacity:0;pointer-events:none;transition:opacity .2s;z-index:39}
.ctr-velo.on{opacity:1;pointer-events:auto}
.ctr{position:fixed;top:0;right:0;bottom:0;width:min(680px,96vw);background:var(--bg);
  border-left:1px solid var(--border);z-index:40;transform:translateX(102%);
  transition:transform .24s cubic-bezier(.3,.8,.3,1);display:flex;flex-direction:column;
  box-shadow:-20px 0 50px rgba(20,15,10,.12)}
.ctr.on{transform:none}
.ctr .top{padding:16px 20px 13px;background:var(--surface);border-bottom:1px solid var(--border)}
.ctr .lin1{display:flex;align-items:flex-start;gap:12px}
.ctr h2{margin:0;font:800 22px/1.2 var(--display);letter-spacing:-.02em;flex:1}
.ctr .x{flex:none;border:1px solid var(--border);background:var(--surface2);color:var(--text2);
  border-radius:10px;width:34px;height:34px;font-size:15px;cursor:pointer}
.ctr .x:hover{border-color:var(--text3);color:var(--ink)}
.ctr .tag{display:inline-flex;align-items:center;gap:6px;font:700 10px var(--mono);text-transform:uppercase;
  letter-spacing:.07em;color:var(--rc,var(--accent));background:color-mix(in srgb,var(--rc,var(--accent)) 11%,transparent);
  border-radius:99px;padding:4px 10px;margin-bottom:9px}
.ctr .sobre{margin:11px 0 0;font-size:13px;line-height:1.62;color:var(--text2);
  background:var(--surface2);border-radius:11px;padding:11px 14px}
.ctr .bar{display:flex;align-items:center;gap:7px;padding:11px 20px;background:var(--surface);
  border-bottom:1px solid var(--border);flex-wrap:wrap}
.ctr .seg{display:flex;background:var(--surface2);border-radius:10px;padding:3px;gap:2px}
.ctr .seg button{border:0;background:transparent;color:var(--text3);border-radius:8px;padding:7px 15px;
  font:700 12.5px inherit;cursor:pointer}
.ctr .seg button.on{background:var(--surface);color:var(--ink);box-shadow:0 1px 2px rgba(20,15,10,.06)}
.ctr .ac{margin-left:auto;display:flex;gap:6px}
.ctr .ac button{border:1px solid var(--border);background:var(--surface);color:var(--text2);border-radius:9px;
  padding:7px 12px;font:600 12px inherit;cursor:pointer}
.ctr .ac button:hover{border-color:var(--text3);color:var(--ink)}
.ctr .sc{flex:1;overflow:auto;padding:16px 20px 60px}

.ctr .blk{background:var(--surface);border:1px solid var(--border);border-radius:14px;
  padding:15px 17px;margin-bottom:12px;box-shadow:0 1px 2px rgba(20,15,10,.05)}
.ctr .blk h3{margin:0 0 9px;font:800 15.5px inherit;display:flex;align-items:flex-start;gap:11px;line-height:1.35}
.ctr .blk h3 i{font-style:normal;width:25px;height:25px;border-radius:8px;background:var(--rc,#5b47b8);color:#fff;
  display:flex;align-items:center;justify-content:center;font:800 12px var(--mono);flex:none;margin-top:-1px}
.ctr .deve{font-size:13.8px;line-height:1.68;color:var(--text2)}
.ctr .grp{margin-top:12px}
.ctr .grp .lb{font:700 10px var(--mono);text-transform:uppercase;letter-spacing:.07em;color:var(--text3);
  display:block;margin-bottom:6px}
.ctr .rf{display:flex;flex-wrap:wrap;gap:6px}
.ctr .rf button{border:1px solid var(--border);background:var(--surface2);border-radius:9px;padding:6px 11px;
  font:600 12px inherit;cursor:pointer;text-align:left;color:var(--text2);line-height:1.4}
.ctr .rf button:hover{background:var(--surface)}
.ctr .rf button.lei{color:var(--lei);border-color:color-mix(in srgb,var(--lei) 32%,var(--border))}
.ctr .rf button.lei:hover{border-color:var(--lei)}
.ctr .rf button.juris{color:var(--juris);border-color:color-mix(in srgb,var(--juris) 32%,var(--border))}
.ctr .rf button.juris:hover{border-color:var(--juris)}
.ctr .erro{margin-top:13px;font-size:12.8px;line-height:1.6;color:var(--text2);
  background:color-mix(in srgb,var(--juris) 8%,var(--surface));
  border:1px solid color-mix(in srgb,var(--juris) 22%,transparent);
  border-left:4px solid var(--juris);padding:10px 13px;border-radius:0 10px 10px 0}
.ctr .erro b{color:var(--juris);font-weight:800}

.ctr .cegoTopo{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px 16px;
  margin-bottom:14px;box-shadow:0 1px 2px rgba(20,15,10,.05)}
.ctr .cegoTopo .n{display:flex;align-items:baseline;gap:9px}
.ctr .cegoTopo .n b{font:800 26px/1 var(--display);font-variant-numeric:tabular-nums}
.ctr .cegoTopo .n em{font-style:normal;font-size:12px;color:var(--text3);font-weight:600}
.ctr .cegoTopo .n .cron{margin-left:auto;font:700 19px var(--mono);font-variant-numeric:tabular-nums;color:var(--text2)}
.ctr .cegoTopo .pb{height:8px;border-radius:99px;background:var(--surface2);overflow:hidden;margin-top:11px}
.ctr .cegoTopo .pb i{display:block;height:100%;border-radius:99px;background:var(--ok,#12795a);width:0;transition:width .3s}
.ctr .cegoTopo .acs{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap}
.ctr .cegoTopo .acs button{border:1px solid var(--border);background:var(--surface2);color:var(--text2);
  border-radius:9px;padding:6px 12px;font:600 12px inherit;cursor:pointer}
.ctr .cegoTopo .acs button:hover{border-color:var(--text3);color:var(--ink)}
.ctr ul.cego{list-style:none;padding:0;margin:0}
.ctr ul.cego li{margin-bottom:8px}
.ctr ul.cego label{display:flex;gap:12px;align-items:flex-start;cursor:pointer;background:var(--surface);
  border:1px solid var(--border);border-radius:11px;padding:12px 14px;font-size:13.8px;line-height:1.55}
.ctr ul.cego label:hover{border-color:var(--text3)}
.ctr ul.cego input{margin-top:2px;flex:none;width:18px;height:18px;accent-color:var(--ok,#12795a);cursor:pointer}
.ctr ul.cego input:checked+span{color:var(--text3);text-decoration:line-through;text-decoration-color:var(--border)}
.ctr .nota{font-size:11.8px;color:var(--text3);line-height:1.65;margin-top:20px;border-top:1px solid var(--border);
  padding-top:14px}
.ctr .vazio{padding:38px 6px;color:var(--text3);font-size:13px;line-height:1.7}

@media (max-width:640px){ .ctr .sc{padding:14px 15px 50px} .ctr .top,.ctr .bar{padding-left:15px;padding-right:15px} }
@media print{
  body>*:not(.ctr){display:none !important}
  .ctr-velo,.ctr .x,.ctr .bar{display:none !important}
  body{background:#fff}
  .ctr{position:static;width:auto;transform:none;box-shadow:none;border:0;display:block}
  .ctr .sc{overflow:visible;padding:0}
  .ctr .blk,.ctr .cegoTopo,.ctr ul.cego label{box-shadow:none;break-inside:avoid}
  .ctr .top{border:0;padding:0 0 12px}
}`;

/* ---------- utilidades públicas ---------- */
const esc = t => String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const limpa = t => String(t).replace(/^[^\p{L}]+/u,'').trim();   // tira o emoji do rótulo

/* Cor por RAMO: a mesma cor identifica o ramo no card do roteiro, no número do ato
   e na pílula do rito. É o que permite se localizar sem ler. */
const RAMOS = {
  'Civil':                 '#1f5aa6',
  'Penal':                 '#b93a2b',
  'Constitucional':        '#6a4bbd',
  'Administrativo':        '#0f7a57',
  'Ambiental':             '#2e7d32',
  'Tributário':            '#9a6b00',
  'Eleitoral':             '#b5174e',
  'Criança e adolescente': '#c2185b',
  'Empresarial':           '#00695c'
};
function ramoDe(nome){
  const base = String(nome||'').split('—')[0].trim();
  return { n: base || 'Geral', c: RAMOS[base] || '#7d7a86' };
}

/* ---------- estado do modo cego (por aparelho, fora da nuvem) ---------- */
const CK='catedraPecasCego';
const lerCk=()=>{ try{ return JSON.parse(localStorage.getItem(CK))||{}; }catch(e){ return {}; } };
const gravaCk=(o)=>{ try{ localStorage.setItem(CK,JSON.stringify(o)); }catch(e){} };
function feitos(nome){
  const p=(window.CT_PECAS||{})[nome]; if(!p) return {f:0,t:0,pc:0};
  const m=lerCk()[nome]||{}, t=(p.cego||[]).length;
  let f=0; for(let i=0;i<t;i++) if(m[i]) f++;
  return {f,t,pc:t?Math.round(f/t*100):0};
}

/* O rótulo é escrito para LER ("Elementos essenciais da sentença — CPC, art. 489, I").
   Para BUSCAR não serve: o LEGIS procura pelo nome do diploma, o JURIS pelo instituto. */
const SIGLA={CPC:'Código de Processo Civil', CPP:'Código de Processo Penal',
  CP:'Código Penal', CC:'Código Civil', CF:'Constituição', CDC:'Código de Defesa do Consumidor',
  CLT:'Consolidação das Leis do Trabalho', CTN:'Código Tributário Nacional',
  ECA:'Estatuto da Criança e do Adolescente', LEP:'Lei de Execução Penal'};
function termoBusca(rotulo, alvo){
  const partes=String(rotulo).split('—');
  if(alvo==='juris') return partes[0].trim();
  const ref=(partes[1]||partes[0]).trim();
  const m=/^([A-ZÇ]{2,4})\b/.exec(ref);
  if(m&&SIGLA[m[1]]) return SIGLA[m[1]];
  const lei=/Lei\s+[\d.]+\/\d{2,4}/i.exec(ref);
  return lei?lei[0]:ref;
}
function abrirAcervo(alvo, termo){
  try{ window.parent.postMessage({type:'ctAbrirAcervo', alvo, termo}, '*'); }catch(e){}
}

/* ---------- montagem do painel ---------- */
let el={}, atual=null, modo='roteiro';
let cron={t0:0, acc:0, on:false, id:null};
const cronMs = () => cron.acc + (cron.on ? Date.now()-cron.t0 : 0);
function cronTexto(){ const s=Math.floor(cronMs()/1000);
  return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); }
function cronPara(){ if(cron.on){ cron.acc+=Date.now()-cron.t0; cron.on=false; } clearInterval(cron.id); cron.id=null; }
function cronZera(){ cronPara(); cron.acc=0; }

function montar(){
  if(el.rot) return;
  const st=document.createElement('style'); st.textContent=CSS; document.head.appendChild(st);

  const velo=document.createElement('div'); velo.className='ctr-velo';
  const rot=document.createElement('aside'); rot.className='ctr'; rot.setAttribute('aria-hidden','true');
  rot.innerHTML=
     '<div class="top"><span class="tag" data-r="tag"></span>'
    +'<div class="lin1"><h2 data-r="tit"></h2><button class="x" data-r="x" title="Fechar (Esc)">✕</button></div>'
    +'<p class="sobre" data-r="sobre"></p></div>'
    +'<div class="bar"><span class="seg"><button data-r="tabR" class="on">Roteiro</button>'
    +'<button data-r="tabC">Modo cego</button></span>'
    +'<span class="ac"><button data-r="copy" title="Copiar o esqueleto em texto">⧉ Copiar</button>'
    +'<button data-r="print" title="Imprimir / salvar em PDF">⎙ Imprimir</button></span></div>'
    +'<div class="sc" data-r="sc"></div>';
  document.body.appendChild(velo); document.body.appendChild(rot);

  el={rot, velo, sc:rot.querySelector('[data-r=sc]'), tit:rot.querySelector('[data-r=tit]'),
      sobre:rot.querySelector('[data-r=sobre]'), tag:rot.querySelector('[data-r=tag]'),
      tabR:rot.querySelector('[data-r=tabR]'), tabC:rot.querySelector('[data-r=tabC]')};

  rot.querySelector('[data-r=x]').onclick=fechar;
  velo.onclick=fechar;
  el.tabR.onclick=()=>{ modo='roteiro'; el.tabR.classList.add('on'); el.tabC.classList.remove('on'); pinta(); el.sc.scrollTop=0; };
  el.tabC.onclick=()=>{ modo='cego';    el.tabC.classList.add('on'); el.tabR.classList.remove('on'); pinta(); el.sc.scrollTop=0; };
  rot.querySelector('[data-r=print]').onclick=()=>window.print();
  rot.querySelector('[data-r=copy]').onclick=function(){ copiar(this); };
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') fechar(); });
}

function copiar(btn){
  const p=(window.CT_PECAS||{})[atual]; if(!p) return;
  const txt=atual+'\n'+'='.repeat(atual.length)+'\n\n'
    +(p.blocos||[]).map((b,i)=>(i+1)+'. '+b.nome+'\n   '+b.deve
      +((b.lei||[]).length?'\n   ⚖️ '+b.lei.join('\n   ⚖️ '):'')
      +((b.juris||[]).length?'\n   🏛️ '+b.juris.join('\n   🏛️ '):'')
      +(b.erro?'\n   ⚠ Custa ponto: '+b.erro:'')).join('\n\n')
    +'\n\nCHECKLIST (modo cego)\n'+(p.cego||[]).map(t=>'[ ] '+t).join('\n');
  const ok=()=>{ btn.textContent='✓ Copiado'; setTimeout(()=>btn.textContent='⧉ Copiar',1600); };
  try{ navigator.clipboard.writeText(txt).then(ok,()=>{}); }catch(e){}
}

function pinta(){
  if(!atual) return;
  cronPara();
  const p=(window.CT_PECAS||{})[atual];
  if(!p){
    el.sc.innerHTML='<div class="vazio">O roteiro desta peça ainda não foi escrito.<br><br>Prontos hoje: '
      +Object.keys(window.CT_PECAS||{}).map(esc).join(' · ')+'.</div>';
    return;
  }

  if(modo==='cego'){
    const marc=lerCk()[atual]||{}, itens=p.cego||[];
    const f=itens.reduce((a,_,i)=>a+(marc[i]?1:0),0);
    el.sc.innerHTML=
       '<div class="cegoTopo"><div class="n"><b data-c="n">'+f+'/'+itens.length+'</b>'
      +'<em>itens conferidos</em><span class="cron" data-c="cron">'+cronTexto()+'</span></div>'
      +'<div class="pb"><i data-c="bar" style="width:'+(itens.length?f/itens.length*100:0)+'%"></i></div>'
      +'<div class="acs"><button data-c="play">▶ Cronômetro</button><button data-c="zera">↺ Zerar tempo</button>'
      +'<button data-c="limpa">Desmarcar tudo</button></div></div>'
      +'<ul class="cego">'+itens.map((t,i)=>'<li><label><input type="checkbox" data-i="'+i+'"'
        +(marc[i]?' checked':'')+'><span>'+esc(t)+'</span></label></li>').join('')+'</ul>'
      +'<div class="nota">Escreva a peça sem olhar o roteiro e só então confira aqui. '
      +'O que você marcar fica guardado neste aparelho.</div>';

    const q=s=>el.sc.querySelector('[data-c='+s+']');
    const sync=()=>{ const m=lerCk()[atual]||{}, n=itens.reduce((a,_,i)=>a+(m[i]?1:0),0);
      q('n').textContent=n+'/'+itens.length;
      q('bar').style.width=(itens.length?n/itens.length*100:0)+'%';
      if(typeof API.aoMudar==='function') API.aoMudar(atual); };
    el.sc.querySelectorAll('input[type=checkbox]').forEach(cx=>{
      cx.onchange=()=>{ const o=lerCk(); o[atual]=o[atual]||{}; o[atual][cx.dataset.i]=cx.checked; gravaCk(o); sync(); };
    });
    q('limpa').onclick=()=>{ const o=lerCk(); delete o[atual]; gravaCk(o);
      el.sc.querySelectorAll('input[type=checkbox]').forEach(c=>c.checked=false); sync(); };
    q('play').onclick=function(){
      if(cron.on){ cronPara(); this.textContent='▶ Cronômetro'; }
      else{ cron.on=true; cron.t0=Date.now(); this.textContent='⏸ Pausar';
        cron.id=setInterval(()=>{ const c=q('cron'); if(c) c.textContent=cronTexto(); else cronPara(); },500); }
    };
    q('zera').onclick=()=>{ cronZera(); q('cron').textContent='00:00'; q('play').textContent='▶ Cronômetro'; };
    return;
  }

  el.sc.innerHTML=(p.blocos||[]).map((b,i)=>{
    const lei=(b.lei||[]).map(t=>'<button class="lei" data-alvo="legis" data-t="'+esc(t)+'">⚖️ '+esc(t)+'</button>').join('');
    const jur=(b.juris||[]).map(t=>'<button class="juris" data-alvo="juris" data-t="'+esc(t)+'">🏛️ '+esc(t)+'</button>').join('');
    return '<div class="blk"><h3><i>'+(i+1)+'</i>'+esc(b.nome)+'</h3>'
      +'<div class="deve">'+esc(b.deve)+'</div>'
      +(lei?'<div class="grp"><span class="lb">O que manda</span><div class="rf">'+lei+'</div></div>':'')
      +(jur?'<div class="grp"><span class="lb">O que o tribunal decidiu</span><div class="rf">'+jur+'</div></div>':'')
      +(b.erro?'<div class="erro"><b>⚠ Custa ponto:</b> '+esc(b.erro)+'</div>':'')
      +'</div>';
  }).join('')
    +'<div class="nota">Os artigos estão aqui porque num roteiro de peça o número é o conteúdo — '
    +'mas clique neles: o texto integral abre no CátedraLEGIS, e é lá que se confere. '
    +'Roteiro escrito pelo Cátedra a partir da lei e da jurisprudência, não copiado de curso.</div>';
  el.sc.querySelectorAll('.rf button').forEach(b=>{
    b.onclick=()=>abrirAcervo(b.dataset.alvo, termoBusca(b.dataset.t, b.dataset.alvo));
  });
}

function abrir(nome){
  montar();
  atual=nome; modo='roteiro'; cronZera();
  const p=(window.CT_PECAS||{})[nome];
  const r=ramoDe(p&&p.rito);
  el.rot.style.setProperty('--rc', r.c);
  el.tag.textContent=(p&&p.rito)?p.rito:'Roteiro';
  el.tit.textContent=nome;
  el.sobre.textContent=p?(p.sobre||''):'Roteiro ainda não escrito.';
  el.sobre.style.display=(p&&p.sobre)?'':'none';
  el.tabR.classList.add('on'); el.tabC.classList.remove('on');
  pinta();
  el.rot.classList.add('on'); el.velo.classList.add('on'); el.rot.setAttribute('aria-hidden','false');
  el.sc.scrollTop=0;
}
function fechar(){
  if(!el.rot) return;
  cronPara();
  el.rot.classList.remove('on'); el.velo.classList.remove('on'); el.rot.setAttribute('aria-hidden','true');
}

const API={abrir, fechar, feitos, ramoDe, RAMOS, esc, limpa, abrirAcervo, aoMudar:null};
window.CTRoteiro=API;
window.abrirRoteiro=abrir;   // compatibilidade com quem já chamava assim
})();
