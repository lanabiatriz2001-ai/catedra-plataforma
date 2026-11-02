/*PURE-START*/
var STOP = new Set('de da do das dos e em no na nos nas a o as os um uma para por com que se ao aos ou como mais mas sua seu suas seus ser ter foi sao esta este essa esse isso entre sobre sem sob ate cada pela pelo pelas pelos quando onde qual quais ja nao nem tambem deve devem podem pode so apenas ha ele ela eles elas lhe lhes sera serao tem'.split(' '));
var SYN = {artigo:'art',artigos:'art',arts:'art',paragrafo:'par',paragrafos:'par',inciso:'inc',incisos:'inc'};
var TAGS = {
  lei:{label:'Lei seca'}, regra:{label:'Regra'}, excecao:{label:'Exceção'}, vedacao:{label:'Vedação'},
  conceito:{label:'Conceito'}, termo:{label:'Termo'}, juris:{label:'Jurisprudência'}, prazo:{label:'Número ou prazo'}
};
var TAG_ALIAS = {
  lei:'lei', leiseca:'lei', literal:'lei', regra:'regra', excecao:'excecao', vedacao:'vedacao', nulidade:'vedacao',
  conceito:'conceito', definicao:'conceito', termo:'termo', estrutura:'termo', juris:'juris', jurisprudencia:'juris',
  sumula:'juris', tema:'juris', prazo:'prazo', numero:'prazo', numeros:'prazo'
};

function plain(s){ return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
function normWord(w){
  var s = plain(w).replace(/[ºª°]/g,'');
  return SYN[s] || s;
}
function tokenize(text){
  var re = /§|[\p{L}\p{N}]+/gu, out = [], m, s = String(text == null ? '' : text);
  while ((m = re.exec(s))) {
    out.push({raw:m[0], n:(m[0] === '§' ? 'par' : normWord(m[0])), i:m.index});
  }
  return out;
}
function sameWord(a, b){
  if (a === b) return true;
  if (a.length < 5 || b.length < 5) return false;
  var n = Math.min(a.length, b.length, 7);
  return a.slice(0, n) === b.slice(0, n);
}
function prepTerm(label){
  var all = tokenize(label).map(function(t){ return t.n; }).filter(Boolean);
  var toks = all.filter(function(n){ return !STOP.has(n) && (n.length > 1 || /\d/.test(n)); });
  return {label:label, toks: toks.length ? toks : all};
}
function matchTerm(term, ans){
  var hits = [];
  if (!term.toks.length) return {found:false, idx:[]};
  for (var k = 0; k < term.toks.length; k++) {
    var idx = [];
    for (var j = 0; j < ans.length; j++) if (sameWord(term.toks[k], ans[j].n)) idx.push(j);
    if (!idx.length) return {found:false, idx:[]};
    hits = hits.concat(idx);
  }
  return {found:true, idx:hits};
}
function deriveTerms(text){
  var seen = {}, out = [], toks = tokenize(text);
  toks.forEach(function(t){
    if (STOP.has(t.n) || seen[t.n]) return;
    if (!(t.n.length >= 5 || /^\d+$/.test(t.n))) return;
    seen[t.n] = 1; out.push(t.raw);
  });
  if (!out.length) {
    toks.forEach(function(t){
      if (STOP.has(t.n) || seen[t.n] || t.n.length < 3) return;
      seen[t.n] = 1; out.push(t.raw);
    });
  }
  return out.slice(0, 5);
}
function need(n){ return Math.ceil(n * 0.6 - 1e-9); }
function scorePoint(p, ans){
  var terms = p.terms.map(function(label){
    var r = matchTerm(prepTerm(label), ans);
    return {label:label, found:r.found, idx:r.idx};
  });
  var f = terms.filter(function(t){ return t.found; }).length;
  var st = f === 0 ? 'faltou' : (f >= need(terms.length) ? 'coberto' : 'parcial');
  return {terms:terms, found:f, total:terms.length, status:st, manual:false};
}
function evaluate(items, answers, ov){
  var tot = {coberto:0, parcial:0, faltou:0, total:0};
  var qs = items.map(function(it, qi){
    var ans = tokenize(answers[qi] || ''), hl = {};
    var pts = it.points.map(function(p, pi){
      var r = scorePoint(p, ans);
      r.terms.forEach(function(t){ if (t.found) t.idx.forEach(function(j){ hl[j] = 1; }); });
      if (ov && ov[qi + ':' + pi] && r.status !== 'coberto') { r.status = 'coberto'; r.manual = true; }
      tot[r.status]++; tot.total++;
      return r;
    });
    var c = 0, pa = 0, fa = 0;
    pts.forEach(function(r){ if (r.status === 'coberto') c++; else if (r.status === 'parcial') pa++; else fa++; });
    return {pts:pts, covered:c, partial:pa, missed:fa, total:pts.length, hl:hl, tokens:ans};
  });
  return {qs:qs, tot:tot};
}
function addPoint(q, s, n, warns){
  var tag = '', m = s.match(/^\[([^\]]*)\]\s*(.*)$/);
  if (m) {
    var k = TAG_ALIAS[plain(m[1]).replace(/[^a-z]/g, '')];
    if (k) tag = k; else warns.push('Linha ' + n + ': etiqueta [' + m[1] + '] desconhecida. O ponto ficou sem cor.');
    s = m[2];
  }
  var parts = s.split('::'), text = parts[0].trim();
  var terms = parts.length > 1 ? parts.slice(1).join('::').split(',').map(function(x){ return x.trim(); }).filter(Boolean) : [];
  if (!text && terms.length) text = terms.join(', ');
  if (!text) { warns.push('Linha ' + n + ': ponto vazio. Ignorado.'); return; }
  var derived = false;
  if (!terms.length) { terms = deriveTerms(text); derived = true; }
  if (!terms.length) terms = [text];
  q.points.push({text:text, tag:tag, terms:terms, derived:derived});
}
function parseMaterial(text){
  var lines = String(text || '').replace(/\r/g, '').split('\n');
  var items = [], warns = [], title = '', cur = null;
  lines.forEach(function(raw, ix){
    var line = raw.trim(), n = ix + 1;
    if (!line) return;
    var c = line.charAt(0), bm;
    if (c === '#') { if (!title) title = line.replace(/^#+\s*/, ''); return; }
    if (c === '?') { cur = {q:line.slice(1).trim(), points:[], ref:'', line:n}; items.push(cur); return; }
    if (c === '>') {
      if (!cur) { warns.push('Linha ' + n + ': fundamento sem pergunta antes dele. Ignorado.'); return; }
      var r = line.slice(1).trim();
      if (r) cur.ref += (cur.ref ? ' · ' : '') + r;
      return;
    }
    bm = line.match(/^[-•*–—]\s*(.*)$/);
    if (bm) {
      if (!cur) { warns.push('Linha ' + n + ': ponto sem pergunta antes dele. Ignorado.'); return; }
      addPoint(cur, bm[1], n, warns);
      return;
    }
    if (cur && cur.points.length === 0 && !cur.ref) { cur.q += ' ' + line; return; }
    warns.push('Linha ' + n + ': não entendi. Comece a linha com ?, - ou >. Ignorada.');
  });
  var ok = items.filter(function(it){
    if (!it.q) { warns.push('Linha ' + it.line + ': pergunta vazia. Ignorada.'); return false; }
    if (!it.points.length) { warns.push('Linha ' + it.line + ': a pergunta não tem pontos (linhas com -). Ignorada.'); return false; }
    return true;
  });
  return {title:title, items:ok, warns:warns};
}
/*PURE-END*/

module.exports={parseMaterial,evaluate,tokenize,normWord,deriveTerms,need,sameWord};
