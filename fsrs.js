/*
MIT License

Copyright (c) 2026 Open Spaced Repetition

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
/* FSRS-6: fórmulas e parâmetros padrão de ts-fsrs 5.4.2 (MIT).
 * Referência: https://github.com/open-spaced-repetition/ts-fsrs/tree/v5.4.2
 * Agendamento diário, retenção 90%, sem aleatoriedade. Nenhuma consulta à rede.
 * O estado legado só é convertido ao responder; datas, conteúdo e IDs ficam intactos.
 */
(function (root) {
  'use strict';
  var W = [0.212,1.2931,2.3065,8.2956,6.4133,0.8334,3.0194,0.001,1.8722,0.1666,0.796,1.4835,0.0614,0.2629,1.6483,0.6014,1.8729,0.5425,0.0912,0.0658,0.1542];
  var DIA = 86400000;
  function limitar(x,a,b) { return Math.min(Math.max(x,a),b); }
  function arred(x) { return Math.round(x*1e8)/1e8; }
  function finito(x,fallback) { return typeof x==='number' && isFinite(x) ? x : fallback; }
  function dificuldade(g) { return arred(W[4]-Math.exp((g-1)*W[5])+1); }
  function nota(q) { return q<=2?1:q===3?2:q===4?3:4; }
  function proximo(mem,t,g) {
    if(!mem) return {stability:Math.max(W[g-1],0.1),difficulty:limitar(dificuldade(g),1,10)};
    var s=limitar(mem.stability,0.001,36500), d=limitar(mem.difficulty,1,10), ns;
    var factor=arred(Math.pow(0.9,-1/W[20])-1), ret=arred(Math.pow(1+factor*t/s,-W[20]));
    if(t===0) { var inc=Math.pow(s,-W[19])*Math.exp(W[17]*(g-3+W[18])); ns=arred(limitar(s*(g>=2?Math.max(inc,1):inc),0.001,36500)); }
    else if(g===1) {
      var fail=arred(limitar(W[11]*Math.pow(d,-W[12])*(Math.pow(s+1,W[13])-1)*Math.exp((1-ret)*W[14]),0.001,36500));
      ns=limitar(arred(s/Math.exp(W[17]*W[18])),0.001,fail);
    } else ns=arred(limitar(s*(1+Math.exp(W[8])*(11-d)*Math.pow(s,-W[9])*(Math.exp((1-ret)*W[10])-1)*(g===2?W[15]:1)*(g===4?W[16]:1)),0.001,36500));
    var delta=arred(-W[6]*(g-3)*(10-d)/9);
    return {stability:ns,difficulty:limitar(arred(W[7]*dificuldade(4)+(1-W[7])*(d+delta)),1,10)};
  }
  function responder(item,q,agora,registrar) {
    item=item||{}; agora=finito(agora,Date.now());
    if([1,2,3,4,5].indexOf(q)<0) throw new Error('Avaliação inválida');
    var g=nota(q), antigo=item.fsrs, mem=null, last=0;
    if(antigo && finito(antigo.stability,0)>0 && finito(antigo.difficulty,0)>=1) {
      mem={stability:antigo.stability,difficulty:antigo.difficulty}; last=finito(antigo.lastReview,agora);
    } else if(finito(item.repeticoes,0)>0) {
      // Aproximação explícita: não há respostas antigas para reconstruir a memória.
      mem={stability:limitar(finito(item.intervalo,1),1,36500),difficulty:5};
      var due=typeof item.dueDate==='string'?new Date(item.dueDate+'T12:00:00').getTime():NaN;
      last=isFinite(due)?due-mem.stability*DIA:agora;
    }
    var t=last?Math.max(0,Math.floor((agora-last)/DIA)):0, state=proximo(mem,t,g);
    var iv=g===1?0:limitar(Math.round(state.stability),1,36500);
    if(mem && g>1) {
      // FSRS preserva a ordem dos prazos mesmo quando o arredondamento empata.
      var hard=limitar(Math.round(proximo(mem,t,2).stability),1,36500);
      var good=limitar(Math.round(proximo(mem,t,3).stability),1,36500);
      hard=Math.min(hard,good); good=Math.max(good,hard+1);
      iv=g===2?hard:g===3?good:Math.max(iv,good+1);
    }
    var logs=antigo && Array.isArray(antigo.history)?antigo.history.slice():[];
    if(registrar!==false) logs.push({at:agora,rating:g,elapsed:t,interval:iv});
    return {intervalo:iv,due:iv,repeticoes:g===1?0:finito(item.repeticoes,0)+1,
      fsrs:{version:6,stability:state.stability,difficulty:state.difficulty,lastReview:agora,lapses:finito(antigo&&antigo.lapses,0)+(g===1?1:0),history:logs}};
  }
  root.CT_FSRS={responder:responder,proximo:proximo,nota:nota,retencao:0.9,versao:6};
})(typeof window!=='undefined'?window:globalThis);
