const fs = require('fs');
const vm = require('vm');
const cx = {window:{}};
vm.runInNewContext(fs.readFileSync(__dirname + '/../treino.js','utf8'),cx);
const pure = fs.readFileSync(__dirname + '/oral-pontos-fixture.cjs', 'utf8').split('module.exports=')[0];
// Fixture de teste. NÃO é conteúdo de estudo: foi escrita de memória e não foi conferida na lei seca.
const EXAMPLE = [
  "# Exemplo para testar a página",
  "",
  "? Quais são os princípios que a Constituição Federal impõe expressamente à administração pública?",
  "- [regra] Vale para a administração direta e indireta de qualquer dos Poderes e de todos os entes federativos :: direta, indireta, Poderes, Municípios",
  "- [lei] Legalidade :: legalidade",
  "- [lei] Impessoalidade :: impessoalidade",
  "- [lei] Moralidade :: moralidade",
  "- [lei] Publicidade :: publicidade",
  "- [lei] Eficiência :: eficiência",
  "> CF/88, art. 37, caput.",
  "",
  "? Quais são os elementos essenciais da sentença?",
  "- [lei] Relatório: nomes das partes, identificação do caso, suma do pedido e da contestação e principais ocorrências do processo :: relatório, nomes das partes, suma do pedido, contestação, ocorrências",
  "- [lei] Fundamentos: o juiz analisa as questões de fato e de direito :: fundamentos, questões de fato, direito",
  "- [lei] Dispositivo: o juiz resolve as questões principais que as partes lhe submeterem :: dispositivo, questões principais, partes",
  "> CPC, art. 489, I a III.",
  "",
  "? Quando uma decisão judicial não se considera fundamentada?",
  "- [vedacao] Só indica, reproduz ou parafraseia ato normativo, sem explicar sua relação com a causa :: ato normativo, paráfrase, relação com a causa",
  "- [vedacao] Usa conceitos jurídicos indeterminados sem explicar o motivo concreto da incidência no caso :: conceitos jurídicos indeterminados, motivo concreto",
  "- [vedacao] Invoca motivos que serviriam para justificar qualquer outra decisão :: qualquer outra decisão, motivos",
  "- [vedacao] Não enfrenta todos os argumentos capazes de, em tese, infirmar a conclusão :: argumentos, infirmar, conclusão",
  "- [vedacao] Só invoca precedente ou súmula, sem identificar os fundamentos determinantes nem demonstrar que o caso se ajusta a eles :: precedente, súmula, fundamentos determinantes",
  "- [vedacao] Deixa de seguir súmula, jurisprudência ou precedente invocado pela parte, sem demonstrar distinção ou superação :: distinção, superação",
  "> CPC, art. 489, § 1º, I a VI."
].join('\n');
const api = new Function(pure + '; return {parseMaterial,evaluate,tokenize,normWord,deriveTerms,need,sameWord};')();
// O parser do anexo prepara a fixture; cada avaliação abaixo exercita o motor de produção.
api.evaluate = (items, answers, ov) => {
  const qs = items.map((it, qi) => cx.window.CT_TREINO.corrigirOralPorPontos(it.points, answers[qi],
    Object.fromEntries(it.points.map((p,pi)=>[pi,!!ov[qi+':'+pi]]))));
  return {qs, tot:qs.reduce((a,q)=>{for(const k of Object.keys(a))a[k]+=q.tot[k];return a;},{coberto:0,parcial:0,faltou:0,total:0})};
};
api.parseMaterial=cx.window.CT_TREINO.prepararMaterialOral;
let fail = 0;
function ok(c, m){ if(!c){ fail++; console.log('FALHOU:', m); } else console.log('ok   :', m); }

const r = api.parseMaterial(EXAMPLE);
ok(r.items.length === 3, 'exemplo tem 3 perguntas (' + r.items.length + ')');
ok(r.items.map(i=>i.points.length).join() === '6,3,6', 'pontos por pergunta 6,3,6 -> ' + r.items.map(i=>i.points.length).join());
ok(r.warns.length === 0, 'sem avisos no exemplo: ' + JSON.stringify(r.warns));
ok(r.items[0].ref === 'CF/88, art. 37, caput.', 'fundamento da P1');
ok(r.items[0].points[1].tag === 'lei' && r.items[0].points[0].tag === 'regra', 'etiquetas lei/regra');

// resposta boa na P1, sem eficiência, com plural/radical e sem acento
const a1 = 'A administração pública direta e indireta de todos os Poderes e dos Municípios deve obedecer à legalidade, a impessoalidade, a moralidade e a publicidade. Art. 37 da CF.';
let E = api.evaluate(r.items, [a1, '', ''], {});
const st = E.qs[0].pts.map(p=>p.status).join();
ok(st === 'coberto,coberto,coberto,coberto,coberto,faltou', 'P1 status = ' + st);
ok(E.qs[1].pts.every(p=>p.status==='faltou') && E.qs[2].pts.every(p=>p.status==='faltou'), 'respostas vazias => tudo faltou');

// radical: "impessoal" acha "impessoalidade"; "eficiente" acha "eficiência"
E = api.evaluate(r.items, ['impessoal e eficiente', '', ''], {});
ok(E.qs[0].pts[2].status==='coberto' && E.qs[0].pts[5].status==='coberto', 'radical impessoal/eficiente');

// P2: relatório com termos parciais
const a2 = 'A sentença tem relatório, com os nomes das partes; fundamentos, onde analisa questões de fato e de direito; e dispositivo, que resolve as questões principais.';
E = api.evaluate(r.items, ['', a2, ''], {});
ok(E.qs[1].pts[1].status==='coberto', 'fundamentos coberto: ' + E.qs[1].pts[1].status);
ok(E.qs[1].pts[2].status==='coberto', 'dispositivo coberto: ' + E.qs[1].pts[2].status);
ok(E.qs[1].pts[0].status==='parcial', 'relatório parcial (achou relatório e nomes das partes, 2 de 5): ' + E.qs[1].pts[0].status + ' ' + E.qs[1].pts[0].found + '/' + E.qs[1].pts[0].total);

// artigo/art, § e parágrafo
const t = api.tokenize('art. 489, § 1º e artigo 37');
ok(t.map(x=>x.n).join(' ') === 'art 489 par 1 e art 37', 'tokens: ' + t.map(x=>x.n).join(' '));
const m = api.parseMaterial('? q\n- ponto :: art. 489, § 1º');
const e2 = api.evaluate(m.items, ['Conforme o artigo 489, parágrafo 1º'], {});
ok(e2.qs[0].pts[0].status==='coberto', 'artigo 489 + parágrafo 1º => coberto (' + e2.qs[0].pts[0].found + '/2)');
const e3 = api.evaluate(m.items, ['art. 37'], {});
ok(e3.qs[0].pts[0].status==='faltou', 'art. 37 não cobre art. 489');

// limiar 60%
ok([1,2,3,4,5,6,10].map(api.need).join()==='1,2,2,3,3,4,6', 'limiar: ' + [1,2,3,4,5,6,10].map(api.need).join());

// override manual
E = api.evaluate(r.items, ['', '', ''], {'0:5': true});
ok(E.qs[0].pts[5].status==='coberto' && E.qs[0].pts[5].manual===true && E.tot.coberto===1, 'override manual conta como coberto');

// termos derivados e avisos
const d = api.parseMaterial('? Pergunta\n- Princípio da legalidade administrativa\n- [xyz] outro ponto\nlinha solta depois\n> fundamento\n? Sem pontos\n');
ok(d.items.length === 1, 'pergunta sem pontos é descartada: ' + d.items.length);
ok(d.warns.length >= 3 && d.warns.some(w=>/não tem pontos/.test(w)), 'avisos gerados: ' + JSON.stringify(d.warns));
ok(api.deriveTerms('Princípio da legalidade administrativa').join() === 'Princípio,legalidade,administrativa', 'derivados: ' + api.deriveTerms('Princípio da legalidade administrativa').join());

// pergunta em várias linhas e CRLF
const ml = api.parseMaterial('? Primeira parte\r\ncontinua aqui\r\n- ponto um :: continua\r\n');
ok(ml.items[0].q === 'Primeira parte continua aqui', 'pergunta multilinha: ' + ml.items[0].q);

// falsos positivos curtos não casam
ok(!api.sameWord('art','arte') && !api.sameWord('fe','fer'), 'palavras curtas só exatas');
// Entradas autorizadas e fonte obrigatória, sem conteúdo de estudo novo.
const T=cx.window.CT_TREINO;
const semFonte=T.prepararMaterialOral('? Pergunta técnica\n- ponto :: organização');
ok(!semFonte.prontoParaConferir&&semFonte.items.length===1,'material sem fonte continua apenas como prévia');
const comFonte=T.prepararMaterialOral('? Pergunta técnica\n- ponto :: organização\n> Documento de teste');
ok(comFonte.prontoParaConferir,'material com fonte pode ser conferido');
const q={id:'fixture',enunciado:'Pergunta técnica',url:'https://exemplo.invalid/documento',fonte:'Fixture',padrao:'Organização e eficiência.\n\nPlanejamento e controle.'};
const previa=T.prepararPontosDoPadrao(q);
ok(previa.items[0].points.length===2&&previa.items[0].points.every(p=>q.padrao.slice(p.inicio,p.fim)===p.text),'pontos derivados são recortes literais com endereço no padrão');
ok(previa.origemId===q.id&&previa.origemUrl===q.url&&previa.padraoOriginal===q.padrao,'prévia preserva identidade e versão da fonte');
ok(T.prepararPontosDoPadrao({...q,url:''})===null,'derivação sem fonte é recusada');
const prova={quesitos:[{rot:'Fixture',exig:'organização eficiência controle planejamento coordenação',terms:['organização','eficiência','controle','planejamento','coordenação'],disp:['CPC art. 489'],valor:1,pont:'1,00'}]};
let c=T.corrigirPorEspelho(prova,'organizar eficiente controle');
ok(c.quesitos[0].cobertura===60&&c.quesitos[0].sugestao==='atendeu','espelho aplica radical e limiar de 60% (3/5)');
ok(c.quesitos[0].dispCitados===0,'auditoria de dispositivos permanece separada da sugestão de vocabulário');
ok(T.corrigirPorEspelho(prova,'organizar').quesitos[0].sugestao==='parcial','espelho com algum termo sugere parcial, mesmo abaixo de 30%');
ok(T.corrigirPorEspelho(prova,'texto alheio').quesitos[0].sugestao==='nao','espelho sem termos sugere não atendido');
ok(T.notaPorEspelho(c,{0:'parcial'}).ganho===0.5&&c.quesitos[0].valor===1,'veredito humano prevalece e pontuação oficial é preservada');
ok(T.corrigirPorEspelho({quesitos:[{exig:'prazo 5',disp:[]}]},'prazo 8').quesitos[0].sugestao==='parcial','números diferentes não cobrem o termo numérico do espelho');
ok(T.corrigirPorEspelho({quesitos:[{exig:'mora',disp:[]}]},'mora').quesitos[0].sugestao==='atendeu','exigência curta também é comparada como palavra inteira');
// Equivalência Unicode em ambos os lados, sem alterar os endereços do texto original.
const termo = 'público', nfd = termo.normalize('NFD');
for (const criterio of [termo, nfd]) for (const resposta of [termo, nfd]) {
  const texto = '⚖️ ' + resposta + ', eficiente';
  const pontos = [{text:'Ponto', terms:[criterio,'eficiência','ausente','outro','mais']}];
  const oral = T.corrigirOralPorPontos(pontos, texto, {});
  ok(oral.pts[0].status==='parcial' && oral.pts[0].found===2, 'oral: Unicode e radical mantêm cobertura parcial');
  ok(oral.segmentos.map(s=>s.t).join('')===texto && oral.segmentos.some(s=>s.marca && s.t===resposta), 'destaque preserva texto e acento original');
  const revisado = T.corrigirOralPorPontos(pontos, texto, {0:true});
  ok(revisado.pts[0].status==='coberto' && revisado.pts[0].manual, 'revisão manual prevalece para Unicode');
  const esp = T.corrigirPorEspelho({quesitos:[{exig:criterio,terms:[criterio,'eficiência','ausente','outro','mais'],disp:[],valor:2}]}, texto);
  ok(esp.quesitos[0].cobertura===40 && esp.quesitos[0].sugestao==='parcial' && T.notaPorEspelho(esp,{}).ganho===1, 'espelho: classificação e pontuação Unicode equivalentes');
  ok(T.notaPorEspelho(esp,{0:'atendeu'}).ganho===2 && esp.quesitos[0].valor===2, 'espelho: revisão manual e peso preservados');
}
console.log(fail ? ('\n' + fail + ' falha(s)') : '\ntudo certo');
if(fail) throw new Error(fail + ' falha(s) no Anexo B');
