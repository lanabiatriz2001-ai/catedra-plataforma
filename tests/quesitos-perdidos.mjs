/* O QUE VOCÊ REPETE (25/11/2026) — quesitos-perdidos.js
   Parte 1 (Node, sem navegador): o que o app grava de verdade em cada caminho de correção
   (reproduzido aqui e conferido contra o código do host no bloco "contrato"), a ligação com o
   banco e os espelhos reais, a taxa de repetição, os selos, o card do Anki, o caderno em lotes,
   a 2ª fase na escala da banca, o espelho sugerido, os cortes avisados e a data no fuso local.
   Parte 2 (navegador): o fluxo real (prova do banco → conferência própria → correção pela IA
   simulada → correção local, que não conta) às 22h30 em UTC−4; a tela medida (contraste nas
   oito direções, claro e escuro; alvo de toque e gráfico no iPad); a exportação e o caderno.
   Roda sozinho: node tests/quesitos-perdidos.mjs (só a parte 1). */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
let _janela = null;
/** O módulo e os acervos de verdade (banco de discursivas, espelhos da 2ª fase, espelho sugerido). */
function carregar() {
  if (_janela) return _janela;
  const caixa = { window: {} }; vm.createContext(caixa);
  for (const f of ['discursivas.js', 'espelhos.js', 'espelho-sugerido.js', 'quesitos-perdidos.js']) vm.runInContext(ler(f), caixa, { filename: f });
  return (_janela = caixa.window);
}

/* ---- o que o host grava, reproduzido aqui (o bloco "contrato" confere cada peça no código dele) ---- */
const tiraNum = (s) => String(s || '').replace(/^\s*(?:item\s*)?\(?\d+[.)\]]?\s*/i, '').trim();
/** _abrirDiscursiva: o espelho vira texto ("N. quesito  (pontos)" e "Fundamentos exigidos") e o enunciado ganha o cabeçalho. */
export function abrirProva(p) {
  const esp = (p.espelho || []).map((x, i) => {
    const esc = x.escala && x.escala !== String(x.pontos) ? '  [escala: ' + x.escala + ']' : (x.pontos != null ? '  (' + x.pontos + ' ponto' + (x.pontos === 1 ? '' : 's') + ')' : '');
    const fund = (x.dispositivos && x.dispositivos.length) ? '\n   Fundamentos exigidos: ' + x.dispositivos.join('; ') : '';
    return (i + 1) + '. ' + tiraNum(x.quesito) + esc + fund; });
  const cab = [p.orgao, p.cargo, p.ano].filter(Boolean).join(' · ') + (p.banca ? ' — banca ' + p.banca : '');
  return { gab: 'Espelho oficial' + (p.total != null ? ' — total ' + p.total : '') + '\n\n' + esp.join('\n'), enun: cab + '\n\n' + (p.enunciado || '') };
}
/** _redQuesitos: as linhas "N. …" do espelho, com a escala quando há. */
export function quesitosDoEspelho(gab) {
  const out = [];
  for (const l of String(gab || '').split('\n')) {
    const m = /^\s*(\d{1,2})[.)]\s+(.{15,})$/.exec(l); if (!m) continue;
    const esc = /\[escala:\s*([^\]]+)\]/i.exec(m[2]);
    const pts = /\((\d+(?:[.,]\d+)?)\s*ponto/i.exec(m[2]) || /\bat[ée]\s+(\d+[.,]\d+)/i.exec(m[2]) || /(\d+[.,]\d+)/.exec(esc ? esc[1] : '');
    const escala = esc ? esc[1].split('/').map(x => parseFloat(String(x).replace(',', '.'))).filter(n => !isNaN(n)).sort((a, b) => a - b) : null;
    out.push({ n: +m[1], max: escala && escala.length ? escala[escala.length - 1] : (pts ? parseFloat(String(pts[1]).replace(',', '.')) : null) });
  }
  return out;
}
/** Uma correção gravada: "Quesito N" com a nota (qualquer caminho), anotada pelo módulo e guardada como o _redRegistrar guarda.
    extra.legado = registro de antes desta versão (sem id da prova, sem número nem texto do quesito). */
export function registrarComEspelho(M, gab, enun, notaDe, ts, extra = {}) {
  const qs = quesitosDoEspelho(gab);
  const an = M.anotarQuesitos(qs.map((q) => ({ titulo: 'Quesito ' + q.n, nota: notaDe(q), max: q.max != null ? q.max : 1 })), gab);
  const disc = extra.disc || 'Direito Penal', leg = !!extra.legado;
  return { id: extra.id || ('rh' + ts), up: ts, ts, quando: new Date(ts).toISOString().slice(0, 10), origem: 'redacao',
    disc, disciplinaOrigem: 'banco', aproximada: !!extra.aproximada, notaMax: 10, prova: enun.trim().replace(/\s+/g, ' ').slice(0, 80),
    ...(extra.provaId && !leg ? { provaId: extra.provaId } : {}), ...(extra.estimado ? { estimado: true } : {}),
    ...(an.length > 40 && !leg ? { quesitosTotal: an.length } : {}),
    quesitos: an.slice(0, 40).map((q, i) => ({ i, titulo: q.titulo, disc, ...(q.n != null && !leg ? { n: q.n } : {}),
      ...(q.texto && !leg ? { texto: q.texto } : {}), ...(q.cortado && !leg ? { cortado: true } : {}),
      ...(q.disp && !leg ? { disp: q.disp } : {}), nota: Math.round((+q.nota || 0) * 100) / 100, max: Math.round((+q.max || 1) * 100) / 100 })),
    notaTotal: null };
}
export function registrar(M, p, notaDe, ts, extra = {}) {
  const { gab, enun } = abrirProva(p);
  return registrarComEspelho(M, gab, enun, notaDe, ts, { provaId: p.id, ...extra });
}
/** ctRedacaoResultado (segunda-fase-web.html) + _redRegistrar: "rótulo — tema", nota 0/0,5/1 sobre 1, valor em "peso". */
export function registrar2f(p, notaDe, ts, extra = {}) {
  return { id: 'rh2f' + ts, up: ts, ts, quando: new Date(ts).toISOString().slice(0, 10), origem: 'segunda-fase', disc: '', disciplinaOrigem: '',
    aproximada: false, notaMax: 100, prova: p.trib + ' ' + p.ano + ' · ' + p.tipo,
    quesitos: p.quesitos.slice(0, 40).map((q, i) => ({ i, titulo: ((q.rot ? (q.rot + ' — ') : '') + String(q.tema || q.exig || '').slice(0, 100)).slice(0, 120),
      disc: q.disc || '', ...(extra.semPeso ? {} : { peso: (!q.desconto && q.valor != null ? q.valor : 0) }), nota: notaDe(q, i), max: 1 })),
    notaTotal: null };
}
const DIA = 864e5, T0 = Date.UTC(2026, 10, 10, 15);
const pela = (n, v) => (q) => (q.n === n ? v : (q.max != null ? q.max : 1));     // tudo cheio, menos o quesito n

export function testarQuesitosPerdidosEstatico(ok) {
  const R = 'REPETE ';
  let W = null;
  try { W = carregar(); } catch (e) { ok(false, R + 'o módulo e os acervos carregam (' + e.message.split('\n')[0] + ')'); return; }
  const M = W.CT_QUESITOS_PERDIDOS, BANCO = W.CT_DISCURSIVAS, E2F = W.CT_ESPELHOS, SUG = W.CT_ESPELHO_SUGERIDO;
  const prova = (id) => BANCO.find((p) => p.id === id);
  ok(!!M && typeof M.oQueRepete === 'function' && typeof M.anotarQuesitos === 'function' && Array.isArray(BANCO) && BANCO.length > 500, R + 'publica oQueRepete e anotarQuesitos; o banco real carrega');

  // ---- contrato: o que a parte 1 reproduz é o que o host grava ----
  const host = ler('Catedra.dc.html'), sf = ler('segunda-fase-web.html'), sug = ler('espelho-sugerido.js');
  const temNoHost = [
    ["const cab=[q.orgao, q.cargo, q.ano].filter(Boolean).join(' · ')+(q.banca?' — banca '+q.banca:'');", '_abrirDiscursiva monta o cabeçalho'],
    ["redEnunciado: cab+'\\n\\n'+(q.enunciado||''),", 'o enunciado da prova começa pelo cabeçalho'],
    ["return (i+1)+'. '+t+esc+fund;", 'o espelho vira "N. quesito" com pontuação'],
    ["const esc=x.escala&&x.escala!==String(x.pontos)?'  [escala: '+x.escala+']':(x.pontos!=null?'  ('+x.pontos+' ponto'+(x.pontos===1?'':'s')+')':'');", 'a escala ou os pontos vão no fim da linha'],
    ["const t=String(x.quesito||'').replace(/^\\s*(?:item\\s*)?\\(?\\d+[.)\\]]?\\s*/i,'').trim();", 'o número do espelho sai do começo do quesito'],
    ["'\\n   Fundamentos exigidos: '+x.dispositivos.join('; ')", 'os fundamentos vão na linha de baixo'],
    ["const m=/^\\s*(\\d{1,2})[.)]\\s+(.{15,})$/.exec(l);", '_redQuesitos lê as mesmas linhas'],
    ["const _titulo=(enun? enun.replace(/\\s+/g,' ').slice(0,80)", 'submitRed grava 80 caracteres do enunciado'],
    ["const titulo=enun? enun.replace(/\\s+/g,' ').slice(0,80) : 'Questão discursiva';", 'a conferência grava o mesmo título; sem enunciado, "Questão discursiva"'],
    ["quesitos:c.quesitos.map(q=>({quesito:'Quesito '+q.n,", 'a IA grava "Quesito N"'],
    ["quesLocal.push({quesito:'Quesito '+q.n,", 'o corretor local grava "Quesito N"'],
    ["quesitos.push({quesito:'Quesito '+q.n, obtido:n, pontos:max});", 'a conferência própria grava "Quesito N"'],
    ["provaId:_provaId, gabarito:gab, estimado:res.motor==='local'}", 'submitRed manda o id da prova, o espelho e se a nota é estimativa'],
    ["provaId:String(this.state.redProvaId||''), gabarito:this.state.redGabarito,", 'a conferência própria manda o id da prova e o espelho'],
    ["aproximada:!!achou.aproximada, gabarito:achou.gabarito}, evoId)", 'a troca pela IA manda o espelho'],
    ["if(reg.gabarito && QP) try{ qs=QP.anotarQuesitos(reg.quesitos, reg.gabarito);", '_redRegistrar anota pelo módulo'],
    ["...(q.n!=null?{n:+q.n}:{}), ...(q.texto?{texto:String(q.texto).slice(0,120)}:{}), ...(q.cortado?{cortado:true}:{}),", '_redRegistrar guarda número e texto'],
    ["...(reg.estimado?{estimado:true}:{}),", '_redRegistrar marca a correção estimada'],
    ["...(qs.length>40?{quesitosTotal:qs.length}:{}),", '_redRegistrar diz o total da prova longa (guarda só 40 quesitos)'],
    ["quesitos:qs.slice(0,40).map(", '_redRegistrar guarda até 40 quesitos'],
    ["max:+q.pontos||1, ...(q.estimado?{estimado:true}:{})}))", 'o quesito que a IA pulou sai marcado como estimado'],
  ];
  const faltam = temNoHost.filter(([s]) => !host.includes(s)).map(([, d]) => d);
  ok(faltam.length === 0, R + 'contrato com o host: a gravação reproduzida aqui é a do app' + (faltam.length ? ' — mudou: ' + faltam.join('; ') : ''));
  ok(sf.includes("titulo:(q.rot?(q.rot+' — '):'')+String(q.tema||q.exig||'').slice(0,100)") && sf.includes("peso:(!q.desconto&&q.valor!=null?q.valor:0)") && sf.includes("const rotulo=p=>p.trib+' '+p.ano+' · '+p.tipo;"),
    R + 'contrato com a 2ª fase: título "rótulo — tema", valor em "peso" e o rótulo da prova');
  ok(sug.includes("+ '\\n   Fundamento: ' + q.fundamento"), R + 'contrato com o espelho sugerido: o fundamento vai na linha de baixo');

  // ---- regras básicas ----
  ok(M.perdido({ nota: 0.2, max: 1 }) && !M.perdido({ nota: 0.5, max: 1 }) && !M.perdido({ nota: 1, max: 1 }), R + 'perdido é menos da metade dos pontos; metade para cima não é');
  ok(!M.perdido({ nota: 0, max: 0 }) && !M.perdido(null), R + 'quesito sem máximo não é contado como perdido');
  const temas = [['CP art. 69, caput', 'CP art. 69'], ['CP, art. 69', 'CP art. 69'], ['Lei 9.613/98, art. 1o', 'Lei 9.613/98 art. 1o'], ['CPC, arts. 908 e 909', 'CPC art. 908'], ['Sumula 620/STJ', 'Sumula 620/STJ']];
  ok(temas.every(([d, t]) => M.temaDe({ dispositivos: [d] }) === t), R + 'tema é o primeiro dispositivo reduzido a diploma e artigo; "CP, art. 69" e "CP art. 69" são o mesmo tema (' + temas.map(([d]) => M.temaDe({ dispositivos: [d] })).join(' | ') + ')');

  // ---- anotação na hora de gravar ----
  const GAB = 'Espelho oficial\n\n1. Reconhece a estabilização da tutela antecipada  [escala: 0,00/0,10/0,20/0,30]\n   Fundamentos exigidos: CPC art. 304; CPC art. 303\n2. Indica o prazo de dois anos da ação de revisão  (0.4 pontos)';
  const an = M.anotarQuesitos([{ titulo: 'Quesito 1', nota: 0, max: 0.3 }, { titulo: 'Quesito 2', nota: 0.4, max: 0.4 }], GAB);
  ok(an[0].n === 1 && an[0].texto === 'Reconhece a estabilização da tutela antecipada' && an[0].disp.join('|') === 'CPC art. 304|CPC art. 303' && an[1].texto === 'Indica o prazo de dois anos da ação de revisão' && !an[1].disp,
    R + 'a anotação guarda número, texto literal sem a escala nem a pontuação que o app acrescenta, e os fundamentos (' + JSON.stringify(an[0]) + ')');
  const crit = M.anotarQuesitos([{ titulo: 'Cobertura do espelho', nota: 3, max: 10 }], GAB);
  ok(!crit[0].n && !crit[0].texto, R + 'critério de prosa ("Cobertura do espelho") não é anotado como quesito');
  const longo = 'Fundamentação da sentença com exame de cada prova produzida, ' + 'a'.repeat(260);
  const anL = M.anotarQuesitos([{ titulo: 'Quesito 1', nota: 0, max: 1 }], '1. ' + longo + '  (1 ponto)');
  ok(anL[0].texto.length === M.TEXTO_MAX && anL[0].cortado === true, R + 'texto acima de ' + M.TEXTO_MAX + ' caracteres é guardado cortado e marcado (o sync não incha)');

  // ---- a cadeia real, com o banco verdadeiro (o achado da revisão: "Quesito 1" de duas provas virava um tema só) ----
  const SP = prova('tj-sp-2026-1'), MT = prova('tj-mt-2025-1');
  const h2 = [registrar(M, MT, pela(1, 0), T0 + DIA), registrar(M, SP, pela(1, 0), T0)];
  let r = M.oQueRepete(h2, BANCO);
  const ts2 = M.temasDe(r);
  ok(r.pecas === 2 && ts2.length === 2 && r.taxa.pct === null, R + 'o quesito 1 de duas provas diferentes são dois temas, sem taxa inventada (' + ts2.map(t => t.tema.slice(0, 30)).join(' | ') + '; taxa ' + r.taxa.pct + ')');
  const tSP = ts2.find(t => t.quesito.provaId === 'tj-sp-2026-1');
  ok(!!tSP && tSP.quesito.fonte === 'oficial' && tSP.quesito.exigencia.startsWith('Sistemas de aplicação de pena e da medida de segurança') && tSP.quesito.prova === 'TJ-SP 2026 (VUNESP)',
    R + 'a peça se liga à prova do banco pelo id gravado e o quesito traz o texto literal do espelho (' + (tSP && tSP.quesito.exigencia.slice(0, 50)) + ')');
  ok(!ts2.some(t => /^quesito \d+$/i.test(t.tema) || /^quesito \d+$/i.test(t.quesito.exigencia)), R + '"Quesito N" (rótulo do app) nunca vira tema nem exigência');
  const h3 = h2.concat([registrar(M, SP, pela(1, 0.2), T0 + 2 * DIA)]);
  r = M.oQueRepete(h3, BANCO);
  const rep = M.temasDe(r).find(t => t.quesito.provaId === 'tj-sp-2026-1');
  ok(rep.cobrado === 2 && rep.perdas === 2 && rep.repetiu && r.taxa.base === 1 && r.taxa.repetidos === 1 && r.taxa.pct === 100, R + 'refazer a prova e perder de novo o mesmo quesito é repetição (taxa 100%)');
  ok(rep.seriePerda.join() === '100,80' && rep.primeira.ts === T0 && rep.ultima.ts === T0 + 2 * DIA, R + 'a série do gráfico é o que se perdeu do tema em cada peça, na ordem do tempo (' + rep.seriePerda.join() + ')');

  // registro antigo (sem id e sem texto): pelo título, que começa pelo cabeçalho; ambíguo, não liga
  const leg = [registrar(M, SP, pela(1, 0), T0, { legado: true }), registrar(M, SP, pela(1, 0), T0 + DIA, { legado: true })];
  r = M.oQueRepete(leg, BANCO);
  const tLeg = M.temasDe(r)[0];
  ok(!!tLeg && tLeg.quesito.fonte === 'oficial' && tLeg.quesito.exigencia.startsWith('Sistemas de aplicação') && tLeg.repetiu, R + 'registro antigo sem id acha a prova pelo título com o cabeçalho e recupera o texto do espelho');
  const BANCO2 = BANCO.concat([Object.assign({}, SP, { id: 'tj-sp-2026-1-copia' })]);
  r = M.oQueRepete(leg, BANCO2);
  const tAmb = M.temasDe(r)[0], vAmb = M.vistaTema(tAmb);
  ok(tAmb.quesito.fonte === 'desconhecida' && tAmb.tema === 'Quesito 1' && !M.exportavel(tAmb) && vAmb.semTexto && /não foi gravado/.test(vAmb.semTextoMsg)
    && M.temasDe(r).length === 2 && M.temasDe(r).every(t => t.cobrado === 1 && !t.repetiu) && r.taxa.pct === null,
    R + 'título que casa com duas provas: não escolhe — cada peça fica com o "Quesito 1" dela, sem texto, sem repetição inventada, fora do Anki e do caderno');
  ok(M.temasDe(M.oQueRepete(leg.concat([registrar(M, MT, pela(1, 0), T0 + 2 * DIA, { legado: true })]), BANCO2)).length === 3,
    R + 'sem o texto, "Quesito 1" de outra prova não se junta a nenhum');

  // o achado da verificação: peças antigas de provas DIFERENTES que gravam o mesmo título (as questões
  // do TJ-MS 2023 e da OAB repetem o cabeçalho e o começo do enunciado; a conferência sem enunciado grava
  // "Questão discursiva") eram somadas pela posição — "Quesito 1 · repetido", taxa de 100%
  const tituloDe = (p) => abrirProva(p).enun.replace(/\s+/g, ' ').slice(0, 80);
  const MS1 = prova('tj-ms-2023-q01'), MS2 = prova('tj-ms-2023-q02');
  const OAB = ['oabconselhofederal-2026-ac1', 'oabconselhofederal-2026-ac5', 'oabconselhofederal-2026-ac2'].map(prova);
  ok(!!MS1 && !!MS2 && tituloDe(MS1) === tituloDe(MS2) && MS1.disciplina === MS2.disciplina && OAB.every(p => p && tituloDe(p) === tituloDe(OAB[0])),
    R + '(pré-condição) TJ-MS 2023 q01 e q02, e três provas da OAB, gravam o mesmo título na mesma disciplina');
  const antigas = (ps) => M.oQueRepete(ps.map((p, k) => registrar(M, p, pela(1, 0), T0 + k * DIA, { legado: true, disc: p.disciplina, id: 'leg' + k })), BANCO);
  const rMS = antigas([MS1, MS2]), rOAB = antigas(OAB);
  const soltos = (rr, n) => M.temasDe(rr).length === n && M.temasDe(rr).every(t => t.tema === 'Quesito 1' && t.cobrado === 1 && !t.repetiu && M.vistaTema(t).selo === '') && rr.taxa.pct === null;
  ok(soltos(rMS, 2) && soltos(rOAB, 3), R + 'peças antigas de provas diferentes com o mesmo título não se juntam: cada "Quesito 1" fica na peça dele, sem selo, sem taxa (TJ-MS: '
    + M.temasDe(rMS).map(t => M.vistaTema(t).conta).join(' | ') + '; OAB: ' + rOAB.taxa.pct + ')');
  const conf = (txt, k) => registrarComEspelho(M, '1. ' + txt + '  (2 pontos)', 'Questão discursiva', () => 0, T0 + k * DIA, { legado: true, disc: 'Direito Tributário', id: 'conf' + k });
  const rConf = M.oQueRepete([conf('Prescrição intercorrente na execução fiscal e seus requisitos', 0), conf('Responsabilidade do sócio-gerente na dissolução irregular', 2)], BANCO);
  ok(soltos(rConf, 2), R + 'duas conferências antigas sem enunciado ("Questão discursiva") não viram o mesmo quesito');

  // id que ficou para trás: questão colada depois de reabrir o app (o modo prova não volta)
  const colado = registrarComEspelho(M, '1. Fundamentação da sentença com o exame das provas produzidas nos autos  (2 pontos)',
    'Questão colada à mão: julgue o caso do contrato de locação', (q) => 0, T0, { provaId: 'tj-mt-2025-1' });
  const tCol = M.temasDe(M.oQueRepete([colado], BANCO))[0];
  ok(tCol.quesito.provaId === '' && tCol.quesito.fonte === 'colado' && /^Exigência do espelho usado na correção:/.test(M.cardAnki(tCol).verso.replace(/<\/?b>/g, '')),
    R + 'id de prova que não confere com a peça é recusado; o texto do espelho colado sai como "do espelho usado", não "da banca"');

  // critério de prosa e nota estimada não contam
  const prosa = { id: 'rhp', ts: T0, origem: 'redacao', prova: 'x', disc: 'Direito Civil', quesitos: [{ i: 0, titulo: 'Cobertura do espelho', nota: 2, max: 10 }, { i: 1, titulo: 'Nota geral', nota: 1, max: 10 }] };
  const est = registrar(M, SP, pela(1, 0), T0 + 3 * DIA, { estimado: true, id: 'rh-est' });
  const pulado = registrar(M, MT, pela(1, 0), T0 + 4 * DIA); pulado.quesitos[0].estimado = true;
  const doHist = registrar(M, SP, pela(2, 0), T0 + 5 * DIA, { id: 'rh-local' });
  r = M.oQueRepete([prosa, est, pulado, doHist], { banco: BANCO, estimados: ['rh-local'] });
  ok(r.perdidos === 0 && r.ignorados.criterios === 2 && r.ignorados.estimados === SP.espelho.length * 2 + 1, R + 'critério de prosa e nota estimada pelo corretor local (peça inteira, quesito pulado pela IA ou registro do histórico com motor local) ficam fora (' + JSON.stringify(r.ignorados) + ')');

  // superado, piorou, perdido só nas duas últimas
  const sup = M.temasDe(M.oQueRepete([registrar(M, SP, pela(1, 0), T0), registrar(M, SP, pela(1, 1), T0 + DIA)], BANCO))[0];
  const card = M.cardAnki(sup).verso, vSup = M.vistaTema(sup);
  ok(sup.superou && !sup.repetiu && /superado na última \(\d\d\/\d\d\), com 1,00 de 1,00/.test(card) && !/na última[^,]*, 0,00/.test(card) && vSup.selo === 'superado' && vSup.sparkTom === 'ok',
    R + 'tema superado: o alerta diz que a última peça foi atendida (não "0,00"), selo e traço verdes (' + card.split('Alerta de prova:</b> ')[1] + ')');
  const pio = M.temasDe(M.oQueRepete([registrar(M, SP, pela(1, 1), T0), registrar(M, SP, pela(1, 0.2), T0 + DIA)], BANCO))[0], vPio = M.vistaTema(pio);
  ok(pio.piorou && !pio.repetiu && vPio.selo === 'piorou' && vPio.seloTom === 'danger' && vPio.sparkTom === 'danger' && pio.seriePerda.join() === '0,80', R + 'atendido antes e perdido na última: selo "piorou" e traço vermelho, nunca verde');
  const r3 = M.oQueRepete([registrar(M, SP, pela(1, 1), T0), registrar(M, SP, pela(1, 0), T0 + DIA), registrar(M, SP, pela(1, 0.1), T0 + 2 * DIA)], BANCO), dois = M.temasDe(r3)[0];
  ok(dois.repetiu && M.vistaTema(dois).selo === 'repetido' && M.vistaTema(dois).sparkTom === 'danger' && r3.taxa.pct === null, R + 'perdido nas duas últimas (não na primeira): selo "repetido" e traço vermelho; a taxa, que compara a primeira com a última, fica sem número');

  // card do Anki e arquivo
  const c = M.cardAnki(rep);
  ok(/^<b>Direito Penal · Quesito 1 de TJ-SP 2026 \(VUNESP\)<\/b><br><i>Medidas de segurança: sistemas duplo binário e vicariante/.test(c.frente) && /O que a banca exige neste quesito\?$/.test(c.frente)
    && !c.frente.includes('Sistemas de aplicação') && !c.frente.includes('Natureza jurídica'),
    R + 'frente: chamada (disciplina, quesito e prova) e resumo (o assunto da prova), sem nada da exigência (' + c.frente.replace(/<[^>]+>/g, ' ').slice(0, 120) + ')');
  // a frente do card, a pergunta do caderno e o tópico (que o Treino mostra ANTES do gabarito) não trazem
  // a resposta — em nenhuma prova do banco nem da 2ª fase. Antes, sem dispositivo, o tema de agrupamento
  // (o começo da própria exigência) ia para a frente: 1973 dos 3147 cards traziam a exigência inteira.
  const nuc = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const traz = (onde, exig) => { const x = nuc(onde), e = nuc(exig), m = e.slice(0, Math.ceil(e.length / 2)).trim(); return !!e && (x.includes(e) || (m.length >= 12 && x.includes(m))); };
  let nCards = 0, comResumo = 0; const vazou = [];
  const conferir = (t, onde) => { nCards++; const cd = M.cardAnki(t), en = M.paraCaderno(t), ex = t.quesito.exigencia; if (/<i>/.test(cd.frente)) comResumo++;
    if (traz(cd.frente, ex) || traz(en.enunciado, ex) || traz(en.topico, ex)) vazou.push(onde + ': ' + ex.slice(0, 50)); };
  for (const p of BANCO) if ((p.espelho || []).length && p.espelho.length <= 40)
    M.temasDe(M.oQueRepete([registrar(M, p, () => 0, T0)], BANCO)).filter(M.exportavel).forEach(t => conferir(t, p.id + '#' + t.quesito.n));
  for (const p of E2F.provas)
    M.temasDe(M.oQueRepete([registrar2f(p, () => 0, T0)], { banco: BANCO, espelhos2f: E2F })).filter(M.exportavel).forEach(t => conferir(t, p.trib + ' ' + p.ano));
  ok(nCards > 3000 && comResumo > 3000 && vazou.length === 0, R + 'nenhum dos ' + nCards + ' cards do banco e da 2ª fase traz a exigência (inteira ou a metade) na frente, na pergunta do caderno ou no tópico'
    + (vazou.length ? ' — vazou: ' + vazou.slice(0, 3).join(' | ') : ''));
  const t2iguais = M.temasDe(M.oQueRepete([registrar2f(E2F.provas.find(p => p.trib === 'TJ-SE' && p.ano === 2024 && p.tipo === 'Sentença'), () => 0, T0)], { banco: BANCO, espelhos2f: E2F }))
    .find(t => t.quesito.exigencia === 'Estrutura da sentença.');
  ok(!!t2iguais && !/<i>/.test(M.cardAnki(t2iguais).frente) && !/Assunto:/.test(M.paraCaderno(t2iguais).enunciado), R + 'tema do quesito igual ao texto do quesito ("Estrutura da sentença") não vai para a frente como resumo');
  ok(/Exigência da banca:<\/b> Sistemas de aplicação de pena e da medida de segurança\. Sistemas duplo binário e vicariante\. Natureza jurídica/.test(c.verso) && /Pontuação:<\/b> 1,00/.test(c.verso) && /Dispositivos:<\/b> o espelho não indica/.test(c.verso)
    && /Alerta de prova:<\/b> perdido em 2 de 2 peças; na última \(\d\d\/\d\d\), 0,20 de 1,00 — já tinha sido perdido/.test(c.verso), R + 'verso: exigência literal da banca, pontuação, dispositivos e alerta de prova');
  const arq = M.arquivoAnki(M.temasDe(M.oQueRepete(h3.concat(leg), BANCO2)));
  const cab = arq.split('\n').filter(l => l[0] === '#'), linhas = arq.split('\n').filter(l => l && l[0] !== '#');
  ok(cab.join('|') === '#separator:tab|#html:true|#notetype:Aulão|#deck:Quesitos perdidos' && linhas.every(l => l.split('\t').length === 2), R + 'arquivo: cabeçalho aponta o modelo Aulão e o baralho; uma linha por card, frente[TAB]verso');
  ok(linhas.length === 2 && !arq.includes('Quesito 1</b>'), R + 'só vira card o tema que tem o texto do quesito (' + linhas.length + ' cards)');
  const sujo = M.cardAnki({ ...rep, quesito: { ...rep.quesito, exigencia: 'a\tb\n<c> & d' } });
  ok(!/\t|\n/.test(sujo.verso) && sujo.verso.includes('&lt;c&gt; &amp; d'), R + 'TAB, quebra de linha e HTML do texto da banca não quebram a importação');

  // escala da banca no card: quesito com escala do banco
  const TO = prova('tj-to-2025-esp1'), MT24 = prova('tj-mt-2024-esp1');
  r = M.oQueRepete([registrar(M, MT24, pela(12, 0), T0, { disc: 'Direito Constitucional' }), registrar(M, TO, pela(22, 0), T0 + DIA, { disc: 'Direito Civil' })], { banco: BANCO, discDe: (s) => s === 'Constitucional' ? 'Direito Constitucional' : s });
  const cf = M.temasDe(r).find(t => t.tema === 'CF art. 15');
  ok(!!cf && cf.cobrado === 2 && cf.repetiu && cf.disc === 'Direito Constitucional' && r.taxa.pct === 100, R + 'o mesmo artigo perdido em provas de tribunais diferentes é UM tema, na disciplina do espelho de cada quesito (' + (cf && cf.disc) + ')');
  ok(!!cf && /Pontuação:<\/b> 0,40 \(escala da banca: 0,00 \/ 0,20 \/ 0,40\)/.test(M.cardAnki(cf).verso), R + 'pontuação do card na escala da banca (' + (cf && M.cardAnki(cf).verso.match(/Pontuação:<\/b>[^<]*/)[0]) + ')');

  // espelho sugerido: o texto se declara em todo lugar
  const semEsp = BANCO.find(p => !(p.espelho || []).length && p.enunciado);
  const sugerido = { id: semEsp.id, quesitos: [{ quesito: 'Reconhece a prescrição intercorrente na execução fiscal', pontos: 1, fundamento: 'Lei 6.830/1980, art. 40' },
    { quesito: 'Fixa os honorários de sucumbência em favor do executado', pontos: 1, fundamento: 'CPC art. 85' }], total: 2 };
  const regSug = registrarComEspelho(M, SUG.texto(sugerido), abrirProva(semEsp).enun, (q) => (q.n === 1 ? 0 : 1), T0, { provaId: semEsp.id, aproximada: true });
  const tSug = M.temasDe(M.oQueRepete([regSug], { banco: BANCO, sugeridos: [sugerido] }))[0], cSug = M.cardAnki(tSug), eSug = M.paraCaderno(tSug);
  ok(tSug.quesito.fonte === 'sugerido' && tSug.tema === 'Lei 6.830/1980 art. 40' && /Quesito do espelho sugerido \(não oficial\):<\/b> Reconhece a prescrição/.test(cSug.verso) && /não oficial/.test(cSug.frente) && !/Exigência da banca/.test(cSug.verso),
    R + 'espelho sugerido: o card diz "espelho sugerido (não oficial)" na frente e no verso, nunca "exigência da banca"');
  ok(/^Quesito do espelho sugerido \(não oficial\):/.test(eSug.gabarito) && /não oficial/.test(eSug.enunciado) && /sugerido pelo Cátedra, não oficial/.test(eSug.lesson) && eSug.extra.aproximada === true && M.vistaTema(tSug).sugerido,
    R + 'espelho sugerido: o aviso chega ao caderno (pergunta, gabarito e lição) e à tela');

  // caderno: pergunta sem a resposta, referência própria, corte avisado
  const e = M.paraCaderno(rep);
  ok(/^Quesito perdido · Direito Penal · Quesito 1 de TJ-SP 2026 \(VUNESP\)\nAssunto: Medidas de segurança/.test(e.enunciado) && /O que a banca exige neste quesito\?$/.test(e.enunciado)
    && !e.enunciado.includes('Sistemas de aplicação') && !e.enunciado.includes('Natureza jurídica') && e.gabarito.includes('Natureza jurídica da medida de segurança')
    && /^Medidas de segurança/.test(e.topico) && !e.topico.includes('Sistemas de aplicação'),
    R + 'caderno: a frente pergunta e a exigência fica só no gabarito; o tópico, que o Treino mostra antes do gabarito, é o assunto da prova (' + e.topico.slice(0, 40) + ')');
  ok(e.extra.quesitoRef === 'tj-sp-2026-1#1' && !('ref' in e.extra) && e.disc === 'Direito Penal' && /perdido em 2 de 2 peças/.test(e.lesson),
    R + 'caderno: chave própria do quesito (não "ref", que o app lê como jurisprudência), disciplina e lição');
  const grande = BANCO.flatMap(p => (p.espelho || []).map((x, i) => ({ p, n: i + 1, t: tiraNum(x.quesito) }))).find(x => x.t.length > 1150 && !/\n/.test(x.t) && x.p.espelho.length <= 40);
  if (grande) {
    const tg = M.temasDe(M.oQueRepete([registrar(M, grande.p, pela(grande.n, 0), T0)], BANCO)).find(t => t.quesito.n === grande.n);
    const eg = M.paraCaderno(tg);
    ok(eg.gabarito.length <= 1200 && eg.gabarito.includes('(texto cortado; o integral está no espelho da prova)') && M.cardAnki(tg).verso.includes(grande.t.slice(-40).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')),
      R + 'quesito de ' + grande.t.length + ' caracteres: o caderno corta dentro de 1200 e AVISA; o card leva o texto inteiro');
  } else ok(false, R + 'o banco tem quesito longo para o teste do corte');

  // caderno em lotes: o que já está sai ANTES do teto, cada toque leva os próximos
  const varias = BANCO.filter(p => (p.espelho || []).length && p.espelho.length <= 40 && tiraNum(p.espelho[0].quesito).length >= 15).slice(0, 26)
    .map((p, k) => registrar(M, p, (q) => (q.n === 1 ? 0 : (q.max != null ? q.max : 1)), T0 + k * 3600e3));
  const rV = M.oQueRepete(varias, BANCO), N = M.temasDe(rV).filter(M.exportavel).length;
  const erros = []; const agora = T0 + 40 * DIA;
  const toque = () => { const l = M.paraCadernoLote(rV, erros); l.itens.slice(0, 20).forEach(x => erros.push({ ts: agora, quesitoRef: x.extra.quesitoRef })); return l; };
  const l1 = toque(), l2 = toque(), l3 = toque();
  ok(N > 20 && l1.itens.length === N && l2.itens.length === N - 20 && l3.itens.length === 0 && l3.fora.jaNoCaderno === N && erros.length === N,
    R + 'caderno com ' + N + ' temas: 1º toque leva 20, o 2º leva os ' + (N - 20) + ' restantes, o 3º não duplica nada');
  const outraVez = varias.concat([registrar(M, BANCO.find(p => p.id === varias[0].provaId), (q) => (q.n === 1 ? 0 : 1), agora + DIA)]);
  const l4 = M.paraCadernoLote(M.oQueRepete(outraVez, BANCO), erros);
  ok(l4.itens.length === 1, R + 'perder de novo DEPOIS de levar ao caderno volta a valer no módulo (um item novo); no host, o coletor ainda aplica a janela de 30 dias das questões ao mesmo enunciado');
  // o que o host aplica por cima: a mesma janela (ERRO_AUTO_DIAS) e o mesmo hash do enunciado do coletor das questões
  ok(host.includes("const limite=Date.now()-this.ERRO_AUTO_DIAS*864e5;") && host.includes("const itens=lote0.itens.filter(x=>!recentes.has(this._hashErro(x.enunciado)));")
    && l1.itens.find(x => x.extra.quesitoRef === l4.itens[0].extra.quesitoRef).enunciado === l4.itens[0].enunciado,
    R + 'refazer a prova e perder o mesmo quesito dentro de 30 dias dá o mesmo enunciado, que o host não duplica (a janela das questões); depois disso, entra de novo');

  // prova com mais de 40 quesitos: o registro guarda 40, e o resto sai avisado, não calado
  const AC1 = prova('tjto-2025-ac1');
  const rCorte = M.oQueRepete([registrar(M, AC1, pela(1, 0), T0)], BANCO), rCorteLeg = M.oQueRepete([registrar(M, AC1, pela(1, 0), T0, { legado: true })], BANCO);
  ok(AC1.espelho.length === 50 && rCorte.ignorados.cortados === 10 && rCorteLeg.ignorados.cortados === 10 && M.oQueRepete([registrar(M, SP, pela(1, 0), T0)], BANCO).ignorados.cortados === 0,
    R + 'prova de 50 quesitos: os 10 além do 40º são contados para o aviso (registro novo pelo total gravado; antigo pelo espelho do banco)');

  // 2ª fase: escala do quesito (peso), texto do espelho real, fora do caderno (o simulado já manda)
  const P2 = E2F.provas.find(p => p.trib === 'TJ-RJ' && p.ano === 2026 && p.quesitos.some(q => q.valor === 0.5 && (q.disp || []).length));
  const i05 = P2.quesitos.findIndex(q => q.valor === 0.5 && (q.disp || []).length), q05 = P2.quesitos[i05];
  const reg2f = registrar2f(P2, (q, i) => (i === i05 ? 0 : 1), T0);
  const t2sem = M.temasDe(M.oQueRepete([reg2f], BANCO))[0];
  ok(t2sem.quesito.max === 0.5 && t2sem.quesito.fonte === 'desconhecida' && !M.exportavel(t2sem) && /Simulado de 2ª fase/.test(M.vistaTema(t2sem).semTextoMsg),
    R + '2ª fase sem os espelhos carregados: escala real (0,50, não 1,00), sem fingir exigência, fora do Anki');
  const t2 = M.temasDe(M.oQueRepete([reg2f], { banco: BANCO, espelhos2f: E2F }))[0], c2 = M.cardAnki(t2);
  ok(t2.quesito.fonte === 'oficial' && t2.quesito.exigencia === q05.exig.replace(/\s+/g, ' ').trim() && t2.tema === M.temaDe({ dispositivos: q05.disp }) && /Pontuação:<\/b> 0,50/.test(c2.verso) && c2.verso.includes(q05.disp[0]) && c2.frente.includes(q05.rot),
    R + '2ª fase com os espelhos: exigência literal, pontuação 0,50 e dispositivos do espelho (' + t2.tema + ')');
  const l2f = M.paraCadernoLote(M.oQueRepete([reg2f], { banco: BANCO, espelhos2f: E2F }), []);
  ok(l2f.itens.length === 0 && l2f.fora.segundaFase === 1, R + '2ª fase fica fora do botão do caderno: o simulado já manda o quesito não atendido sozinho');
  const reg0 = { id: 'rh2f0', ts: T0, origem: 'segunda-fase', prova: 'TJ-XX 2026 · Sentença', disc: '',
    quesitos: [{ i: 0, titulo: 'Desconto — erro de português', disc: 'Português', peso: 0, nota: 0, max: 1 }, { i: 1, titulo: 'Cível 1 — Prescrição', disc: 'Civil', peso: 1.5, nota: 0, max: 1 }] };
  const r0 = M.oQueRepete([reg0], { banco: BANCO, espelhos2f: E2F });
  ok(r0.ignorados.semValor === 1 && r0.perdidos === 1 && M.temasDe(r0)[0].quesito.max === 1.5, R + 'item de desconto (valor 0) da 2ª fase não vira quesito perdido; o de valor 1,50 vira, na escala dele');
  const t2leg = M.temasDe(M.oQueRepete([registrar2f(P2, (q, i) => (i === i05 ? 0 : 1), T0, { semPeso: true })], { banco: BANCO, espelhos2f: E2F }))[0];
  ok(t2leg.quesito.max === 0.5 && /Pontuação:<\/b> 0,50/.test(M.cardAnki(t2leg).verso), R + '2ª fase gravada sem "peso" (versão antiga): o valor vem do espelho');

  // data no fuso do aparelho: correção às 22h30 em Porto Velho é do dia 24, não do 25
  const fuso = spawnSync(process.execPath, ['-e', "const vm=require('vm'),fs=require('fs');const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);"
    + "const M=c.window.CT_QUESITOS_PERDIDOS, ts=Date.UTC(2026,10,25,2,30);"
    + "const r=M.oQueRepete([{id:'a',ts,origem:'redacao',prova:'x',quesitos:[{i:0,titulo:'Quesito 1',n:1,texto:'Reconhece a prescrição da pretensão executória',nota:0,max:1}]}],[]);"
    + "const t=M.temasDe(r)[0];console.log(M.dataCurta(ts)+'|'+M.vistaTema(t).onde+'|'+M.cardAnki(t).verso);", path.join(RAIZ, 'quesitos-perdidos.js')],
    { encoding: 'utf8', env: { ...process.env, TZ: 'America/Porto_Velho' } });
  const [dia, onde, verso] = String(fuso.stdout || '').trim().split('|');
  ok(dia === '24/11' && /· 24\/11$/.test(onde || '') && /\(24\/11\)/.test(verso || ''), R + 'peça corrigida às 22h30 em UTC−4 aparece com o dia dela (24/11), não com o de UTC (' + (dia || fuso.stderr) + ')');

  // desempenho: o índice do banco é feito uma vez; 60 peças contra o banco inteiro
  const sessenta = []; for (let k = 0; k < 60; k++) { const p = varias[k % varias.length]; sessenta.push(Object.assign({}, p, { id: 'x' + k, ts: T0 + k * 3600e3, provaId: k % 3 ? p.provaId : undefined })); }
  const copia = BANCO.slice(); let t = Date.now(); M.oQueRepete(sessenta, copia); const ms1 = Date.now() - t;
  t = Date.now(); for (let k = 0; k < 10; k++) M.oQueRepete(sessenta.slice(k), copia); const ms10 = Date.now() - t;
  ok(ms1 < 1500 && ms10 < 1500, R + '60 peças contra o banco inteiro: ' + ms1 + ' ms com o índice novo, ' + ms10 + ' ms para mais 10 contas com o índice pronto');
}

/* ---- Parte 2: navegador ---- */
const TEXTO = Array.from({ length: 6 }, () => 'A resposta enfrenta o tema com fundamento na Constituição e na lei, examina os requisitos do caso e conclui de forma expressa.').join(' ');
const DIRECOES = ['sutil', 'premium', 'clean', 'moderno', 'aurora', 'solar', 'terminal', 'holo'];
/** Medidor de contraste na página: cor do texto contra o fundo efetivo (camadas translúcidas e gradientes). */
function instalarMedidor() {
  const sonda = (s) => { let p = document.getElementById('__qp-sonda');
    if (!p) { p = document.createElement('i'); p.id = '__qp-sonda'; p.style.display = 'none'; document.body.appendChild(p); }
    p.style.color = ''; p.style.color = s; const c = getComputedStyle(p).color;
    let m = /rgba?\(([^)]+)\)/.exec(c); if (m) { const v = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return v.length > 3 ? v : v.concat([1]); }
    m = /color\(srgb\s+([^)]+)\)/.exec(c); if (m) { const v = m[1].split(/[\s/]+/).filter(Boolean).map(Number); return [v[0] * 255, v[1] * 255, v[2] * 255, v.length > 3 ? v[3] : 1]; }
    return null; };
  const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const comp = (cima, baixo) => [0, 1, 2].map((i) => cima[i] * cima[3] + baixo[i] * (1 - cima[3])).concat([1]);
  const topo = (s) => { const o = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) { o.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) o.push(cur.trim()); return o; };
  const corNoPonto = (args, caixa, x, y) => {
    let ang = 180; const partes = topo(args);
    if (/^[-\d.]+(deg|turn|rad)$/.test(partes[0])) { const v = parseFloat(partes[0]); ang = /turn/.test(partes[0]) ? v * 360 : (/rad/.test(partes[0]) ? v * 180 / Math.PI : v); partes.shift(); }
    else if (/^to /.test(partes[0])) { const d = partes.shift(); ang = { 'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270 }[d] ?? 180; }
    if (/^in /.test(partes[0] || '')) partes.shift();
    const st = partes.map((a) => { const m = /^(.*?)(?:\s+([-\d.]+)%)?$/.exec(a); return { c: sonda(m[1]), p: m[2] != null ? +m[2] / 100 : null }; }).filter((s) => s.c);
    if (!st.length) return null;
    st.forEach((s, i) => { if (s.p == null) s.p = st.length === 1 ? 0 : i / (st.length - 1); });
    const r = ang * Math.PI / 180, sx = Math.sin(r), sy = -Math.cos(r), L = Math.abs(caixa.width * sx) + Math.abs(caixa.height * sy) || 1;
    const t = 0.5 + ((x - (caixa.left + caixa.width / 2)) * sx + (y - (caixa.top + caixa.height / 2)) * sy) / L;
    if (t <= st[0].p) return st[0].c;
    for (let i = 1; i < st.length; i++) if (t <= st[i].p) { const a = st[i - 1], b = st[i], k = (t - a.p) / ((b.p - a.p) || 1); return [0, 1, 2, 3].map((j) => a.c[j] + (b.c[j] - a.c[j]) * k); }
    return st[st.length - 1].c;
  };
  const fundos = (el, rr) => {
    const camadas = [], pontos = [[rr.left, rr.top], [rr.right, rr.top], [rr.left, rr.bottom], [rr.right, rr.bottom], [(rr.left + rr.right) / 2, (rr.top + rr.bottom) / 2]];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e), bc = sonda(cs.backgroundColor), bi = cs.backgroundImage;
      if (bc && bc[3] > 0.99) { camadas.push(bc); return [camadas.reduceRight((acc, c) => comp(c, acc))]; }
      const lin = bi && bi !== 'none' && /^linear-gradient\((.*)\)\s*$/s.exec(bi.trim());
      if (lin) { const caixa = e.getBoundingClientRect();
        const cores = pontos.map(([x, y]) => corNoPonto(lin[1], caixa, x, y)).filter(Boolean).map((c) => (c[3] < 1 ? comp(c, bc && bc[3] > 0 ? bc : [255, 255, 255, 1]) : c));
        if (cores.length) return cores.map((p) => camadas.reduceRight((acc, c) => comp(c, acc), p)); }
      if (bc && bc[3] > 0) camadas.push(bc);
    }
    return [camadas.reduceRight((acc, c) => comp(c, acc), [255, 255, 255, 1])];
  };
  window.__qp = {
    cor: sonda,
    /** pior contraste de texto dentro de raiz (cada folha com texto próprio, visível) */
    contraste(raizSel) {
      const raiz = document.querySelector(raizSel); if (!raiz) return { achou: false };
      const els = new Map(), tw = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        if (!n.textContent.trim() || !n.parentElement) continue;
        const rg = document.createRange(); rg.selectNodeContents(n); const b = rg.getBoundingClientRect(); if (!b.width || !b.height) continue;
        const u = els.get(n.parentElement);
        els.set(n.parentElement, u ? { left: Math.min(u.left, b.left), top: Math.min(u.top, b.top), right: Math.max(u.right, b.right), bottom: Math.max(u.bottom, b.bottom) } : { left: b.left, top: b.top, right: b.right, bottom: b.bottom });
      }
      const medidas = [];
      for (const [el, caixa] of els) {
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        const fg = sonda(cs.color); if (!fg) continue;
        const pior = Math.min(...fundos(el, caixa).map((p) => cr(fg[3] < 1 ? comp(fg, p) : fg, p)));
        medidas.push({ c: Math.round(pior * 100) / 100, t: el.textContent.trim().slice(0, 30) });
      }
      medidas.sort((x, y) => x.c - y.c);
      return { achou: true, n: medidas.length, pior: medidas[0] || null, abaixo: medidas.filter((m) => m.c < 4.5).slice(0, 4) };
    }
  };
}
/* troca direção e modo e espera o React pintar + a transição de cor dos botões (.14 s): medir antes
   mede a cor do tema ANTERIOR (o mesmo cuidado de tests/novidades-central.mjs) */
const tema = (page, dir, escuro) => page.evaluate(({ dir, escuro }) => new Promise((r) => { const app = window.__catedraApp;
  app.setState({ dir, darkMode: escuro, accent: null }, () => { try { app._temaBroadcast(); } catch (_) {} setTimeout(r, 450); }); }), { dir, escuro });

export async function testarQuesitosPerdidos(pageDaSuite, base, ok, opcoes = {}) {
  const R = 'REPETE [' + (opcoes.motor || 'chromium') + '] ';
  for (const b of [fluxoReal, iPad]) {
    try { await b(pageDaSuite, base, ok, R, opcoes); } catch (e) { ok(false, R + b.name + ' exceção: ' + String(e.message).split('\n')[0]); }
  }
}

/** O fluxo real, às 22h30 de 24/11 em Porto Velho (UTC−4): o que o app grava e o que a tela mostra. */
async function fluxoReal(pageDaSuite, base, ok, R, opcoes) {
  const { semear } = await import('./redacao-mesa.mjs');
  const ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'America/Porto_Velho', acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  await page.clock.install({ time: new Date(Date.UTC(2026, 10, 25, 2, 30)) });
  try {
    await semear(page, base, { redEnunciado: '', redGabarito: '', iaConsentimento: { versao: '2026-09', ts: Date.UTC(2026, 10, 1) } });
    await page.goto(base + '/' + (opcoes.arquivo || 'Catedra.dc.html'));
    await page.waitForFunction(() => typeof window.__catedraGoView === 'function' && !!window.__catedraApp);
    await page.evaluate(() => { window.confirm = () => true; window.__catedraGoView('redacao'); });
    await page.waitForFunction(() => Array.isArray(window.CT_DISCURSIVAS) && window.CT_DISCURSIVAS.length > 100, null, { timeout: 30000 });
    const abrir = (id) => page.evaluate((id) => { const app = window.__catedraApp, p = window.CT_DISCURSIVAS.find(x => x.id === id);
      p._textao = true;    // o textão (6 MB) não é o assunto aqui: o título gravado usa os 80 primeiros caracteres, iguais no resumo
      app.usarDiscursiva({ currentTarget: { getAttribute: () => id } });
      return app.state.redProvaId === id && !!app.state.redGabarito; }, id);
    // 1ª peça: conferência própria (papel primeiro), TJ-MT 2024, quesito 12 zerado
    ok(await abrir('tj-mt-2024-esp1'), R + 'abre a prova do banco com o espelho oficial');
    await page.evaluate(() => { const app = window.__catedraApp; app.terminarMao(); const r = app._redEspelhoResumo(), conf = {};
      r.qs.forEach((q, i) => { const op = app._redConfOpcoes(q); conf[i] = q.n === 12 ? op[0] : op[op.length - 1]; });
      app.setState({ redConf: conf }); app.registrarConferencia(); });
    await page.clock.runFor(60000);
    // 2ª e 3ª peças: correção pela IA (simulada), TJ-TO 2025 com o quesito 22 zerado; depois a IA cai e o corretor local estima
    const corrigir = (zero, modo) => page.evaluate(async ({ zero, modo, texto }) => { const app = window.__catedraApp, qs = app._redQuesitos(app.state.redGabarito);
      const resp = JSON.stringify({ quesitos: qs.map((q, k) => ({ i: k + 1, nota: q.n === zero ? 0 : (q.max != null ? q.max : 1), trecho: '', faltou: q.n === zero ? 'não tratou do tema' : '' })),
        forma: { portugues: { nota: 8, comentario: 'ok' }, estrutura: { nota: 8, comentario: 'ok' }, extensao: { nota: 8, comentario: 'ok' } }, prioridades: ['Tratar do tema'], geral: 'ok' });
      window.claude = window.claude || {};
      window.claude.complete = () => (modo === 'rede' ? Promise.reject(new Error('Failed to fetch')) : Promise.resolve(resp));
      app.setState({ redText: texto, redModoResposta: 'digitar' });
      await app.submitRed();
      return (app.state.redHistory[0] || {}).motor; }, { zero, modo, texto: TEXTO });
    ok(await abrir('tj-to-2025-esp1'), R + 'abre a segunda prova do banco');
    const m1 = await corrigir(22, 'boa');
    await page.clock.runFor(60000);
    await abrir('tj-mt-2024-esp1');
    const m2 = await corrigir(0, 'rede');
    ok(m1 === 'ia' && m2 === 'local', R + 'uma correção pela IA e uma estimada pelo corretor local (' + m1 + ', ' + m2 + ')');
    await page.evaluate(() => window.__catedraApp.redReset());
    await page.clock.runFor(1500);
    const hist = await page.evaluate(() => JSON.parse(localStorage.getItem('catedra:redHist') || '[]'));
    const [loc, ia, conf] = hist;
    ok(hist.length === 3 && conf.provaId === 'tj-mt-2024-esp1' && ia.provaId === 'tj-to-2025-esp1' && loc.estimado === true && !ia.estimado && !conf.estimado,
      R + 'o redHist real guarda o id da prova nos dois caminhos (conferência e IA) e marca a correção estimada');
    ok(!!conf && conf.quesitos[11].n === 12 && /^Q02 b|^Q0?\d/.test(conf.quesitos[11].texto || '') && conf.quesitos[11].titulo === 'Quesito 12' && !!ia && ia.quesitos[21].n === 22 && (ia.quesitos[21].texto || '').length > 15 && Array.isArray(ia.quesitos[21].disp),
      R + 'cada quesito gravado leva número, começo literal do texto e fundamentos (' + (conf && conf.quesitos[11].texto || '').slice(0, 40) + ')');

    // a tela
    await page.waitForSelector('[data-red-repete]', { timeout: 15000 });
    ok(/100\s*%/.test(await page.textContent('[data-red-rep-taxa]')), R + 'a taxa de repetição sai da cadeia real (100%: CF art. 15 perdido nas duas provas)');
    ok(/correção estimada/.test(await page.textContent('[data-red-rep-nota]').catch(() => '')), R + 'a tela diz que a correção estimada ficou fora da conta');
    ok(await page.locator('[data-red-rep-tema]').count() === 0, R + 'a lista começa recolhida');
    await page.click('[data-red-repete] button[aria-controls="red-repete-lista"]');
    await page.waitForSelector('[data-red-rep-tema]');
    const linhas = (await page.locator('[data-red-rep-tema]').allTextContents()).map(s => s.replace(/\s+/g, ' ').trim());
    const cf = linhas.find(s => s.startsWith('CF art. 15')) || '';
    ok(linhas.length === 1 && /repetido/.test(cf) && /perdido em 2 de 2 peças/.test(cf) && /pontos perdidos: 1ª peça 100% → última 100%/.test(cf), R + 'um tema (CF art. 15), repetido, perdido em 2 de 2 peças, com a linha dos pontos perdidos (' + cf.slice(0, 160) + ')');
    ok(/Exigência da banca: Criminal 2\.3\.4 — Suspensão dos direitos políticos/.test(cf) && !/Exigência da banca: Quesito \d/.test(cf) && /CF art\. 15, III/.test(cf),
      R + 'a exigência mostrada é o texto do espelho (o da última perda) com os dispositivos, não o rótulo "Quesito N"');
    ok(/TJ-TO 2025 \(FGV\) · 24\/11/.test(cf) && !/25\/11/.test(cf), R + 'a data é a do aparelho (24/11, 22h30 em UTC−4), não a de UTC');
    const graf = await page.evaluate(() => { const s = document.querySelector('[data-red-rep-tema] [data-red-rep-spark]'); if (!s) return null;
      const p = s.querySelector('path'), r = s.getBoundingClientRect(); window.__qpSonda = document.createElement('i'); window.__qpSonda.style.color = 'var(--danger)'; document.querySelector('[data-red-repete]').appendChild(window.__qpSonda);
      const perigo = getComputedStyle(window.__qpSonda).color; window.__qpSonda.remove();
      return { w: r.width, h: r.height, traco: getComputedStyle(p).stroke, perigo, rot: s.getAttribute('aria-label') }; });
    ok(!!graf && graf.w >= 100 && graf.h >= 20 && graf.traco === graf.perigo && /100%, 100%/.test(graf.rot || ''), R + 'o gráfico do tema pinta, em vermelho porque a última peça perdeu, e tem descrição em texto (' + (graf && graf.traco) + ')');

    // exportação: modelo Aulão, frente[TAB]verso, texto literal
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.click('[data-red-rep-anki]')]);
    const arq = fs.readFileSync(await dl.path(), 'utf8');
    const ls = arq.split('\n').filter(l => l && l[0] !== '#');
    ok(dl.suggestedFilename() === 'catedra-quesitos-perdidos.txt' && /^#separator:tab\n#html:true\n#notetype:Aulão\n#deck:Quesitos perdidos\n/.test(arq) && ls.length === 1 && ls[0].split('\t').length === 2
      && /Exigência da banca:<\/b> Criminal 2\.3\.4 — Suspensão/.test(ls[0]) && /Pontuação:<\/b> 0,40 \(escala da banca: 0,00 \/ 0,20 \/ 0,40\)/.test(ls[0]) && /CF art\. 15/.test(ls[0]),
      R + 'a exportação baixa o card no modelo Aulão, com exigência literal e a escala da banca');
    const frente = (ls[0] || '').split('\t')[0];
    ok(/Quesito 22 de TJ-TO 2025 \(FGV\)/.test(frente) && !/Suspensão dos direitos políticos|Criminal 2\.3\.4|art\. 15/.test(frente) && /O que a banca exige neste quesito\?$/.test(frente),
      R + 'a frente do card baixado identifica o quesito e pergunta, sem a exigência nem o dispositivo (' + frente.replace(/<[^>]+>/g, ' ').slice(0, 110) + ')');

    // caderno: a pergunta sem a resposta; chave própria; segundo toque avisa no mesmo cartão
    await page.click('[data-red-rep-caderno]');
    await page.clock.runFor(1500);
    const erros = await page.evaluate(() => JSON.parse(localStorage.getItem('catedra:errors') || '[]'));
    const e0 = erros[0] || {};
    ok(erros.length === 1 && e0.source === 'Quesitos perdidos' && e0.quesitoRef === 'tj-to-2025-esp1#22' && !('ref' in e0) && /O que a banca exige neste quesito\?/.test(e0.enunciado) && !e0.enunciado.includes(String(ia.quesitos[21].texto).slice(0, 30)) && e0.gabarito.includes(String(ia.quesitos[21].texto).slice(0, 30)),
      R + 'o quesito entra no caderno como questão: pergunta na frente, exigência no gabarito, chave própria (sem "Abrir no JURIS" falso)');
    await page.click('[data-red-rep-caderno]');
    await page.waitForTimeout(150);
    const aviso = await page.evaluate(() => { const t = window.__catedraApp._toastAcaoEl; return t ? { txt: t.textContent, op: getComputedStyle(t).opacity } : null; });
    const erros2 = await page.evaluate(() => JSON.parse(localStorage.getItem('catedra:errors') || '[]'));
    ok(erros2.length === 1 && !!aviso && /já estão no caderno/.test(aviso.txt) && aviso.op === '1', R + 'levar de novo não duplica, e o aviso aparece no cartão do "desfazer" (não escondido atrás dele)');
    // com o "desfazer" na tela, como importar no Anki continua escrito no próprio cartão (o toast da
    // exportação mora no mesmo lugar e ficava escondido atrás dele)
    const info = await page.evaluate(() => { const e = document.querySelector('[data-red-rep-anki-info]'); if (!e) return null; const b = e.getBoundingClientRect(), cs = getComputedStyle(e);
      return { txt: e.textContent.replace(/\s+/g, ' ').trim(), h: b.height, vis: cs.visibility, op: cs.opacity }; });
    ok(!!info && /^Exportar baixa 1 card no modelo Aulão: no Anki, Arquivo › Importar — o modelo e o baralho já vêm no arquivo\.$/.test(info.txt) && info.h > 0 && info.vis === 'visible' && info.op === '1',
      R + 'como importar no Anki fica escrito no cartão, embaixo dos botões (' + (info && info.txt) + ')');
    await page.locator('[data-red-repete]').screenshot({ path: 'tests/_capturas/repete-fluxo-real.png' }).catch(() => {});
  } finally { await ctx.close(); }
}

/** iPad (820×1180, toque): muitos temas no formato real, 2ª fase, espelho sugerido, superado e piorou. */
async function iPad(pageDaSuite, base, ok, R, opcoes) {
  const { semear } = await import('./redacao-mesa.mjs');
  const W = carregar(), M = W.CT_QUESITOS_PERDIDOS, BANCO = W.CT_DISCURSIVAS, E2F = W.CT_ESPELHOS, SUG = W.CT_ESPELHO_SUGERIDO;
  const agora = Date.now(), H = 3600e3;
  const usadas = ['tj-sp-2026-1', 'tj-mt-2025-1', 'tj-ms-2023-q01', 'tj-ms-2023-q02', 'tjto-2025-ac1'];
  const varias = BANCO.filter(p => !usadas.includes(p.id) && (p.espelho || []).length && p.espelho.length <= 40 && tiraNum(p.espelho[0].quesito).length >= 15).slice(0, 24)
    .map((p, k) => registrar(M, p, (q) => (q.n === 1 ? 0 : (q.max != null ? q.max : 1)), agora - (60 - k) * H, { disc: 'Direito Civil' }));
  const SP = BANCO.find(p => p.id === 'tj-sp-2026-1'), MT = BANCO.find(p => p.id === 'tj-mt-2025-1');
  const semEsp = BANCO.find(p => !(p.espelho || []).length && p.enunciado);
  const sugerido = { id: semEsp.id, up: agora - 9 * H, ts: agora - 9 * H, total: 2, quesitos: [{ quesito: 'Reconhece a prescrição intercorrente na execução fiscal', pontos: 1, fundamento: 'Lei 6.830/1980, art. 40' },
    { quesito: 'Fixa os honorários de sucumbência em favor do executado', pontos: 1, fundamento: 'CPC art. 85' }] };
  const P2 = E2F.provas.find(p => p.trib === 'TJ-RJ' && p.ano === 2026 && p.quesitos.some(q => q.valor === 0.5 && (q.disp || []).length));
  const i05 = P2.quesitos.findIndex(q => q.valor === 0.5 && (q.disp || []).length);
  const MS1 = BANCO.find(p => p.id === 'tj-ms-2023-q01'), MS2 = BANCO.find(p => p.id === 'tj-ms-2023-q02'), AC1 = BANCO.find(p => p.id === 'tjto-2025-ac1');
  const hist = varias.concat([
    // peças antigas (sem id nem texto) de provas diferentes que gravam o mesmo título: não podem virar "Quesito 1 · repetido"
    registrar(M, MS1, pela(1, 0), agora - 12 * H, { legado: true, disc: 'Direito Administrativo', id: 'leg-ms1' }),
    registrar(M, MS2, pela(1, 0), agora - 11 * H, { legado: true, disc: 'Direito Administrativo', id: 'leg-ms2' }),
    registrar(M, AC1, pela(1, 0), agora - 10 * H, { disc: 'Direito Penal' }),                             // 50 quesitos: 10 além do 40º
    registrar(M, SP, pela(1, 0), agora - 8 * H), registrar(M, SP, pela(1, 1), agora - 7 * H),              // superado
    registrar(M, MT, pela(1, 0.5), agora - 6 * H), registrar(M, MT, pela(1, 0), agora - 5 * H),            // piorou
    registrarComEspelho(M, SUG.texto(sugerido), abrirProva(semEsp).enun, (q) => (q.n === 1 ? 0 : 1), agora - 4 * H, { provaId: semEsp.id, aproximada: true }),
    registrar2f(P2, (q, i) => (i === i05 ? 0 : 1), agora - 3 * H)]).reverse();
  const r = M.oQueRepete(hist, { banco: BANCO, sugeridos: [sugerido] });
  const N = M.paraCadernoLote(r, []).itens.length;
  // o que a tela tem de mostrar com todas as fontes lidas (o banco e os espelhos da 2ª fase)
  const rE = M.oQueRepete(hist, { banco: BANCO, sugeridos: [sugerido], espelhos2f: E2F });
  const cardsE = M.temasDe(rE).filter(M.exportavel).length, semTextoE = M.temasDe(rE).length - cardsE;
  const ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  // o primeiro instante em que o cartão aparece: as fontes da conta já têm de estar lidas, senão a taxa
  // mostrada muda na frente da pessoa quando elas chegam
  await page.addInitScript(() => {
    const obs = new MutationObserver(() => {
      if (window.__qpPrimeira) return;
      // o molde cru do template ({{ }}) também está no DOM antes do runtime: conta só o cartão pintado
      const c = [...document.querySelectorAll('[data-red-repete]')].find(e => e.getClientRects().length && !/\{\{/.test(e.textContent));
      if (!c) return;
      const t = c.querySelector('[data-red-rep-taxa]');
      window.__qpPrimeira = { banco: Array.isArray(window.CT_DISCURSIVAS), esp2f: !!window.CT_ESPELHOS, taxa: t ? t.textContent.trim() : '' };
      obs.disconnect();
    });
    obs.observe(document, { childList: true, subtree: true });
  });
  try {
    await semear(page, base, { redHist: hist, espelhosSugeridos: [sugerido], redEnunciado: '', redGabarito: '' });
    await page.goto(base + '/' + (opcoes.arquivo || 'Catedra.dc.html'));
    await page.waitForFunction(() => typeof window.__catedraGoView === 'function' && !!window.__catedraApp && !!document.querySelector('[data-toque="1"]'), null, { timeout: 30000 });
    await page.evaluate(() => window.__catedraGoView('redacao'));
    await page.waitForFunction(() => Array.isArray(window.CT_DISCURSIVAS) && !!document.querySelector('[data-red-repete]'), null, { timeout: 30000 });
    await page.evaluate(instalarMedidor);
    await page.click('[data-red-repete] button[aria-controls="red-repete-lista"]');
    // a 2ª fase traz o texto do quesito de espelhos.js, que a Redação pede quando há peça da 2ª fase
    await page.waitForFunction(() => !!window.CT_ESPELHOS && [...document.querySelectorAll('[data-red-rep-tema]')].some(e => /2ª fase/.test(e.textContent) && /Exigência da banca:/.test(e.textContent)), null, { timeout: 20000 });
    const t2 = await page.evaluate(() => [...document.querySelectorAll('[data-red-rep-tema]')].map(e => e.textContent.replace(/\s+/g, ' ')).find(s => /2ª fase/.test(s)) || '');
    ok(/Exigência da banca: Distinguir/.test(t2) && /2ª fase · TJ-RJ 2026/.test(t2), R + 'iPad: a peça da 2ª fase mostra a exigência literal do espelho, lido sob demanda (' + t2.slice(0, 90) + ')');
    const primeira = await page.evaluate(() => window.__qpPrimeira || null), taxaFinal = ((await page.textContent('[data-red-rep-taxa]')) || '').trim();
    ok(!!primeira && primeira.banco && primeira.esp2f && primeira.taxa === taxaFinal && taxaFinal === rE.taxa.pct + '%',
      R + 'iPad: o cartão só aparece com o banco e os espelhos da 2ª fase já lidos — a taxa que ele mostra primeiro é a final (' + JSON.stringify(primeira) + ' → ' + taxaFinal + ')');
    // peças antigas de provas diferentes com o mesmo título: dois "Quesito 1" soltos, sem selo, e a taxa não sobe
    const soltos = await page.evaluate(() => [...document.querySelectorAll('[data-red-rep-tema]')].map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(s => /^Quesito 1\b/.test(s)));
    ok(rE.taxa.pct === 0 && taxaFinal === '0%' && soltos.length === 2 && soltos.every(s => !/repetido|piorou|superado/.test(s) && /perdido em 1 de 1 peça/.test(s) && /não foi gravado/.test(s)),
      R + 'iPad: as duas peças antigas do TJ-MS 2023 (mesmo título, provas diferentes) ficam como dois "Quesito 1" soltos, sem selo, e a taxa fica em 0% (' + soltos.map(s => s.slice(0, 60)).join(' | ') + ')');
    // o corte em 40 quesitos e a exportação ficam escritos no cartão
    const nota = ((await page.textContent('[data-red-rep-nota]').catch(() => '')) || '').replace(/\s+/g, ' ');
    const infoAnki = ((await page.textContent('[data-red-rep-anki-info]').catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    ok(/10 quesitos além do 40º de prova longa não são gravados e ficaram fora da conta/.test(nota), R + 'iPad: a prova de 50 quesitos avisa os 10 que o registro não guarda (' + nota.trim() + ')');
    ok(semTextoE === 2 && infoAnki === 'Exportar baixa ' + cardsE + ' cards no modelo Aulão: no Anki, Arquivo › Importar — o modelo e o baralho já vêm no arquivo. 2 sem o texto da banca ficam de fora.',
      R + 'iPad: o cartão diz quantos cards a exportação baixa, como importar e quantos ficam de fora (' + infoAnki + ')');
    const tSug = await page.evaluate(() => [...document.querySelectorAll('[data-red-rep-tema]')].map(e => e.textContent.replace(/\s+/g, ' ')).find(s => /prescrição intercorrente/.test(s)) || '');
    ok(/espelho sugerido/.test(tSug) && /Quesito do espelho sugerido \(não oficial\):/.test(tSug) && !/Exigência da banca/.test(tSug), R + 'iPad: o quesito do espelho sugerido se declara na tela (selo e rótulo)');

    // alvos de toque e largura
    const alvos = await page.evaluate(() => ['[data-red-repete] button[aria-controls="red-repete-lista"]', '[data-red-rep-anki]', '[data-red-rep-caderno]']
      .map(s => { const b = document.querySelector(s); return b ? Math.round(b.getBoundingClientRect().height) : 0; }));
    ok(alvos.every(h => h >= 44), R + 'iPad: os três botões têm alvo ≥ 44 px no toque (' + alvos.join(', ') + ')');
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), R + 'iPad: nada estoura na horizontal');
    // o gráfico fica ao lado do bloco do tema, sem abrir uma linha só para ele
    const lay = await page.evaluate(() => [...document.querySelectorAll('[data-red-rep-tema]')].filter(e => e.querySelector('[data-red-rep-spark]')).map(e => {
      const s = e.querySelector('[data-red-rep-spark]').getBoundingClientRect(), b = e.firstElementChild.getBoundingClientRect(), r = e.getBoundingClientRect();
      return { lado: s.left >= b.right - 1, dentro: s.top >= r.top - 1 && s.bottom <= r.bottom + 1, semVao: r.height <= b.height + 1 }; }));
    ok(lay.length >= 2 && lay.every(x => x.lado && x.dentro && x.semVao), R + 'iPad: o gráfico mora na coluna da direita do tema, sem vão embaixo do título (' + lay.length + ' gráficos)');
    // a cor do traço segue como o tema terminou
    const cores = await page.evaluate(() => { const cor = (v) => { const i = document.createElement('i'); i.style.color = v; document.querySelector('[data-red-repete]').appendChild(i); const c = getComputedStyle(i).color; i.remove(); return c; };
      const traco = (re) => { const e = [...document.querySelectorAll('[data-red-rep-tema]')].find(x => re.test(x.textContent)); const p = e && e.querySelector('[data-red-rep-spark] path'); return p ? getComputedStyle(p).stroke : null; };
      return { ok: cor('var(--ok)'), perigo: cor('var(--danger)'), superado: traco(/superado/), piorou: traco(/piorou/) }; });
    ok(cores.superado === cores.ok && cores.piorou === cores.perigo, R + 'iPad: traço verde no tema superado e vermelho no que piorou (' + cores.superado + ' / ' + cores.piorou + ')');
    // contraste de todo texto do cartão nas oito direções, claro e escuro
    const ruins = [];
    for (const dir of DIRECOES) for (const escuro of [false, true]) {
      await tema(page, dir, escuro); await page.waitForTimeout(450);
      const k = await page.evaluate(() => window.__qp.contraste('[data-red-repete]'));
      if (!k.achou || k.n < 20 || !k.pior || k.pior.c < 4.5) ruins.push(dir + (escuro ? '/escuro ' : '/claro ') + JSON.stringify(k.abaixo && k.abaixo.length ? k.abaixo : k.pior));
    }
    ok(ruins.length === 0, R + 'iPad: todo texto do cartão (selos repetido, piorou, superado e espelho sugerido inclusive) tem contraste ≥ 4,5:1 nas oito direções, claro e escuro' + (ruins.length ? ' — abaixo: ' + ruins.slice(0, 4).join(' | ') : ''));
    await tema(page, 'sutil', false); await page.waitForTimeout(300);
    await page.locator('[data-red-repete]').screenshot({ path: 'tests/_capturas/repete-ipad-claro.png' }).catch(() => {});
    await tema(page, 'sutil', true);
    await page.locator('[data-red-repete]').screenshot({ path: 'tests/_capturas/repete-ipad-escuro.png' }).catch(() => {});
    await tema(page, 'sutil', false);

    // caderno em lotes: o 1º toque leva 20 e diz quantos faltam no mesmo cartão; o 2º leva o resto; o 3º não duplica
    const toast = () => page.evaluate(() => { const t = window.__catedraApp._toastAcaoEl; return t ? t.textContent : ''; });
    const nErros = () => page.evaluate(() => JSON.parse(localStorage.getItem('catedra:errors') || '[]').length);
    await page.click('[data-red-rep-caderno]'); await page.waitForTimeout(1300);
    const a1 = await toast(), n1 = await nErros();
    await page.click('[data-red-rep-caderno]'); await page.waitForTimeout(1300);
    const a2 = await toast(), n2 = await nErros();
    await page.click('[data-red-rep-caderno]'); await page.waitForTimeout(400);
    const a3 = await toast(), n3 = await nErros();
    ok(N > 20 && n1 === 20 && new RegExp('faltam ' + (N - 20)).test(a1) && /1 da 2ª fase já entra pelo simulado/.test(a1) && /desfazer/.test(a1), R + 'iPad: 1º toque leva 20 e o mesmo cartão diz que faltam ' + (N - 20) + ' (' + a1.slice(0, 120) + ')');
    ok(n2 === N && !/faltam/.test(a2) && n3 === N && /já estão no caderno/.test(a3), R + 'iPad: 2º toque leva os demais (' + n2 + ' no caderno); o 3º não duplica e avisa');
    ok(/revisões|revisão/.test(a1) && !/revisãoes/.test(a1), R + 'iPad: o aviso do lote escreve "revisões" certo');
  } finally { await ctx.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let falhas = 0, total = 0;
  testarQuesitosPerdidosEstatico((c, m) => { total++; if (!c) { falhas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); });
  console.log(falhas ? ('\nFALHAS: ' + falhas + ' de ' + total) : ('\n' + total + ' verificações passaram'));
  process.exit(falhas ? 1 : 0);
}
