/* ==========================================================================
   Gera espelhos.js — os espelhos oficiais em formato consumível pelo motor de
   treino (treino.js) e pelo Simulado de 2ª fase (segunda-fase-web.html).
   A fonte é o próprio banco-espelhos.html, que já traz as 586 linhas de quesito
   embutidas: aqui elas são reagrupadas por PROVA, que é a unidade do simulado.
   Rode com:  node scripts/build-espelhos.mjs
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const html = fs.readFileSync(path.join(raiz,'banco-espelhos.html'),'utf8');
const i = html.indexOf('const D = ');
if(i<0) throw new Error('banco-espelhos.html sem o bloco "const D = "');
const D = JSON.parse(html.slice(i+'const D = '.length, html.indexOf('\n', i)).trim().replace(/;$/,''));

/* --------------------------------------------------------------------------
   Quanto vale o quesito. A banca escreve a pontuação em prosa e cada uma
   escreve de um jeito: "0,50", "ate 0,50", "0,00 a 0,15", "1,00 (4 x 0,25)",
   "0,10 / 0,10 / 0,10", "desconto de até 10%", "não discriminada". O valor sai
   por melhor esforço e o texto original NUNCA é descartado — quando a leitura
   é ambígua, o quesito vai marcado como incerto e o total do espelho aparece
   como aproximado, em vez de fingir precisão que a banca não deu.
   -------------------------------------------------------------------------- */
function valorDoQuesito(txt){
  const s = String(txt||'').trim();
  if(!s) return {valor:null, incerto:true, desconto:false};
  const baixo = s.toLowerCase();
  if(/^desconto|^perda|^abatimento/.test(baixo)) return {valor:0, incerto:false, desconto:true};
  const nums = (s.match(/\d+(?:[.,]\d+)?/g)||[]).map(n=>parseFloat(n.replace(',','.')));
  if(!nums.length) return {valor:null, incerto:true, desconto:false};

  // A banca às vezes diz que o item NÃO tem valor próprio — e ainda assim escreve um
  // número (o total do bloco, o que os itens somam, a nota final da questão). Somar
  // esse número por quesito multiplicaria o bloco inteiro pelo número de itens.
  // Só escapa quando o texto ABRE com o valor do item ("0,20 (item destacado); ...").
  const abreComValor = /^\s*(?:at[ée]\s+)?\d/.test(s);
  const semValorProprio = /n[aã]o\s+discriminad|em\s+conjunto|somam|p\.m\.|nota\s+final|escala com/i;
  if((!abreComValor && semValorProprio.test(baixo)) || /demais valores/i.test(baixo))
    return {valor:null, incerto:true, desconto:false};

  // "5 itens de 0,20" e "4 x 0,25" são multiplicação, não soma nem primeiro número
  const mult = /^(\d+)\s*(?:itens?|questões|questoes|subitens?)?\s*(?:de|x|×)\s*(\d+(?:[.,]\d+)?)/i.exec(s);
  if(mult) return {valor:parseInt(mult[1],10)*parseFloat(mult[2].replace(',','.')),
                   incerto:false, desconto:false};

  const faixa = /(\d+(?:[.,]\d+)?)\s*(?:a|até|ate)\s*(\d+(?:[.,]\d+)?)/i.exec(s);
  if(faixa) return {valor:Math.max(parseFloat(faixa[1].replace(',','.')),
                                   parseFloat(faixa[2].replace(',','.'))), incerto:false, desconto:false};
  if(/^(até|ate)\b/i.test(baixo)) return {valor:nums[0], incerto:false, desconto:false};

  const antesDoParenteses = s.split('(')[0];
  const numsFora = (antesDoParenteses.match(/\d+(?:[.,]\d+)?/g)||[]).map(n=>parseFloat(n.replace(',','.')));

  if(numsFora.length>1){
    const cresce = numsFora.every((v,k)=>k===0||v>numsFora[k-1]);
    const iguais = numsFora.every(v=>v===numsFora[0]);
    if(/escala/i.test(baixo) || (cresce && numsFora[0]===0))
      return {valor:Math.max(...numsFora), incerto:false, desconto:false};   // escala de nota
    if(iguais)
      return {valor:numsFora.reduce((a,b)=>a+b,0), incerto:false, desconto:false};  // subitens somados
    // "0,25 + 0,20 + 0,25": a banca escreveu a soma com todas as parcelas — não é ambíguo
    if(/\+/.test(antesDoParenteses))
      return {valor:numsFora.reduce((a,b)=>a+b,0), incerto:false, desconto:false};
    return {valor:numsFora.reduce((a,b)=>a+b,0), incerto:true, desconto:false};
  }
  return {valor:numsFora.length?numsFora[0]:nums[0], incerto:false, desconto:false};
}

/* quanto tempo a banca costuma dar; usado só como sugestão do cronômetro */
const HORAS = t => /sentenc|sentença|peça/i.test(t) ? 4 : 5;

const provas = new Map();
for(const r of D.rows){
  const id = [r.trib, r.ano, r.tipoRaw].join(' · ');
  if(!provas.has(id)) provas.set(id, {
    id, trib:r.trib, ano:r.ano, banca:r.banca, cargo:r.cargo||'',
    tipo:r.tipo, tipoRaw:r.tipoRaw, url:r.url||'', prova:r.prova||'', prova2:r.prova2||'',
    gab:r.gab||'', conc:r.conc||'', nota:r.nota||'',
    horas:HORAS(r.tipoRaw), quesitos:[]
  });
  const v = valorDoQuesito(r.pont);
  provas.get(id).quesitos.push({
    rot:r.rot||'', disc:r.disc||'', tema:r.tema||'', exig:r.exig||'',
    pont:r.pont||'', valor:v.valor, incerto:v.incerto, desconto:v.desconto,
    disp:Array.isArray(r.disp)?r.disp:[]
  });
}

const lista = [...provas.values()].map(p=>{
  const somaveis = p.quesitos.filter(q=>!q.desconto && q.valor!=null);
  p.total = somaveis.reduce((a,q)=>a+q.valor,0);
  p.incertos = p.quesitos.filter(q=>q.incerto).length;
  p.instr = (D.instr||[]).filter(x=>x.o===(p.trib+' '+p.ano)).map(x=>x.t);
  return p;
}).sort((a,b)=> b.ano-a.ano || a.trib.localeCompare(b.trib,'pt') || a.tipoRaw.localeCompare(b.tipoRaw,'pt'));

const saida = {
  meta:{ gerado:new Date().toISOString().slice(0,10), provas:lista.length,
    quesitos:D.rows.length, fonte:'banco-espelhos.html',
    naoLocalizados:(D.naoLoc||[]).length },
  provas: lista
};
fs.writeFileSync(path.join(raiz,'espelhos.js'),
  '// Gerado por scripts/build-espelhos.mjs a partir de banco-espelhos.html. Não editar à mão.\n'
 +'// Espelhos oficiais agrupados por prova — a unidade do Simulado de 2ª fase.\n'
 +'window.CT_ESPELHOS='+JSON.stringify(saida)+';\n','utf8');

console.log('espelhos.js escrito ·', lista.length, 'provas ·', D.rows.length, 'quesitos ·',
  lista.reduce((a,p)=>a+p.incertos,0), 'quesitos com pontuação ambígua');
