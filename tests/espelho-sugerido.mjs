/* ESPELHO SUGERIDO — selo, fundamentos com link e quesitos descartados (25/11/2026)
   Parte 1 (Node, sem navegador): triagem com a conta que fecha, avisos curtos, leitura das
   citações (sem vínculo cruzado de lei nem de tribunal, sem código revogado virando o atual e
   sem retrocesso exponencial ou cúbico) e o caminho até o verbete exato no JURIS e até a lei
   no catálogo do LEGIS, conferidos contra o juris-index.js e o leis-catalogo.js de verdade.
   Parte 2 (navegador, IA simulada em _aiText): gerar pelo botão sem vazar quesito antes da
   entrega; o selo no trilho das etapas 2 e 3, no cartão da nota por quesito, no histórico e
   na evolução (contraste MEDIDO, claro e escuro); o cartão de fundamentos e os botões do LEGIS
   (inclusive LINDB e LC, pelo catálogo) e do JURIS (alvo de toque no iPad); reabrir do
   histórico e refazer à mão sem perder o selo nem o rótulo do espelho guardado; a correção de
   outra prova mostra o espelho que ela usou.
   Roda sozinho: node tests/espelho-sugerido.mjs (só a parte 1). */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function carregar() {
  const caixa = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(RAIZ, 'espelho-sugerido.js'), 'utf8'), caixa);
  return caixa.window.CT_ESPELHO_SUGERIDO;
}

// 5 propostos: 2 aceitos, 2 sem fundamento, 1 curto demais (que até tinha fundamento)
export const RESPOSTA_IA = { total: 10, quesitos: [
  { quesito: 'Reconhecer a estabilização da tutela antecipada', pontos: 4, fundamento: 'art. 304, § 5º, do CPC' },
  { quesito: 'Afastar a formação de coisa julgada material', pontos: 3, fundamento: 'CPC, art. 304, § 6º; Súmula 410 do STJ' },
  { quesito: 'Discorrer livremente sobre o tema proposto', pontos: 2, fundamento: '' },
  { quesito: 'Concluir com a solução do caso concreto', pontos: 1, fundamento: 'n/a' },
  { quesito: 'Prescrição', pontos: 0, fundamento: 'art. 206, § 3º, V, do CC' },
] };
// a mesma resposta e mais um quesito com leis que só o catálogo do LEGIS abre (LINDB e LC)
const RESPOSTA_IA_LEIS = { total: 11, quesitos: [...RESPOSTA_IA.quesitos,
  { quesito: 'Motivar a decisão pelas consequências práticas', pontos: 1, fundamento: 'art. 20 da LINDB; art. 3º, § 1º, da LC 101/2000' }] };
// o espelho de outra prova, com tema e súmula de tribunais diferentes na mesma lista
const RESPOSTA_IA_OUTRA = { total: 10, quesitos: [
  { quesito: 'Identificar a responsabilidade civil objetiva do Estado', pontos: 6, fundamento: 'art. 37, § 6º, da CF; Tema 940 do STF, Súmula 54 do STJ' },
  { quesito: 'Fixar os juros de mora desde o evento danoso', pontos: 4, fundamento: 'Súmula 54 do STJ' }] };

/* A regra de busca do JURIS (juris-web.html, applyFilter): cada termo precisa aparecer no
   título, tema, número, coleção ou ramo (e no enunciado, que aqui fica de fora — sem ele o
   filtro só fica mais estrito, então "achou aqui" vale lá). */
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function buscaJuris(IDX, q) {
  const termos = norm(q).split(' ').filter(Boolean);
  return IDX.filter(r => { const hay = norm((r[4] || '') + ' ' + (r[6] || '') + ' ' + (r[3] || '') + ' ' + (r[2] || '') + ' ' + (r[5] || ''));
    return termos.every(t => hay.indexOf(t) >= 0); });
}

export function testarEspelhoSugeridoEstatico(ok) {
  const R = 'ESPSUG ';
  let M = null;
  try { M = carregar(); } catch (e) { ok(false, R + 'espelho-sugerido.js carrega (' + e.message.split('\n')[0] + ')'); return; }
  ok(!!M && ['triagem', 'referencias', 'resumo', 'avisoGerado', 'avisoFalha', 'verbeteNoJuris', 'ehTextoSugerido'].every(k => typeof M[k] === 'function'),
    R + 'publica triagem, referencias, resumo, avisos, verbeteNoJuris e ehTextoSugerido');

  // ---- as duas regras duras, intactas
  const t = M.triagem(RESPOSTA_IA);
  ok(t.recebidos === 5 && t.aceitos.length === 2 && t.descartados === 2 && t.curtos === 1, R + 'triagem: 5 recebidos, 2 aceitos, 2 sem fundamento, 1 curto demais');
  const sug = M.interpretar(RESPOSTA_IA, 'p1');
  ok(!!sug && sug.quesitos.length === 2 && sug.recebidos === 5 && sug.descartados === 2 && sug.curtos === 1, R + 'o espelho guarda quantos vieram e por que ficaram de fora');
  ok(!!sug && sug.quesitos.every(q => q.fundamento.length >= 6 && !/^n\/?a$/i.test(q.fundamento)), R + 'regra dura mantida: nenhum quesito aceito sem fundamento');
  ok(M.interpretar({ quesitos: [RESPOSTA_IA.quesitos[0], RESPOSTA_IA.quesitos[2]] }, 'p2') === null, R + 'com menos de dois aceitos o espelho é nulo');
  ok(M.triagem(null).recebidos === 0 && M.triagem({}).aceitos.length === 0, R + 'resposta vazia não quebra a triagem');
  const txt = M.texto(sug);
  ok(/^ESPELHO SUGERIDO PELO CÁTEDRA — NÃO OFICIAL/.test(txt) && /banca não publicou/.test(txt), R + 'regra dura mantida: o texto se declara sugerido e não oficial');
  ok(M.ehTextoSugerido(txt) && M.ehTextoSugerido('\n  ' + txt) && !M.ehTextoSugerido('Espelho oficial\n1. Reconhece a tutela') && !M.ehTextoSugerido(''),
    R + 'o texto sugerido se reconhece pelo cabeçalho; o oficial, não');

  // ---- a conta da tela fecha (aceitos + descartados = propostos)
  const res = M.resumo(sug);
  ok(res === '5 propostos pela IA · 2 aceitos · 2 descartados por falta de fundamento · 1 descartado por enunciado curto demais', R + 'resumo diz propostos, aceitos e os dois motivos de descarte (' + res + ')');
  const n = res.match(/\d+/g).map(Number);
  ok(n[0] === n[1] + n[2] + n[3], R + 'a conta fecha: ' + n[1] + ' + ' + n[2] + ' + ' + n[3] + ' = ' + n[0]);
  ok(M.resumo({ quesitos: [{}, {}], recebidos: 2, descartados: 0, curtos: 0 }) === '2 propostos pela IA · 2 aceitos · nenhum descartado por falta de fundamento', R + 'sem descarte, o resumo diz "nenhum"');
  ok(/1 descartado por enunciado curto demais/.test(M.resumo({ quesitos: [{}, {}], recebidos: 4, descartados: 1 })), R + 'espelho sem o campo dos curtos: a conta deduz o que faltou');
  ok(/indisponível/.test(M.resumo({ quesitos: [{}, {}] })) && M.resumo(null) === '', R + 'espelho gerado antes da contagem diz que ela está indisponível');

  // ---- avisos: curtos (o toast dura 2 s) e com o motivo real
  const ag = M.avisoGerado(sug);
  ok(ag === 'Espelho sugerido gerado · 2 quesitos sem fundamento ficaram de fora' && ag.split(/\s+/).length <= 11, R + 'aviso de sucesso curto e com os descartes (' + ag + ')');
  ok(M.avisoGerado({ descartados: 0 }) === 'Espelho sugerido gerado — confira os fundamentos', R + 'sem descarte, o aviso só pede para conferir');
  const curtoComFund = { quesito: 'Prescrição', fundamento: 'art. 206, § 3º, V, do CC' };
  ok(M.avisoFalha(M.triagem({ quesitos: [curtoComFund, RESPOSTA_IA.quesitos[0], RESPOSTA_IA.quesitos[2]] })) === 'Só 1 dos 3 quesitos é aproveitável (mínimo 2) — tente de novo',
    R + 'falha: os números fecham e o motivo é o mínimo de dois aproveitáveis');
  ok(M.avisoFalha(M.triagem({ quesitos: [RESPOSTA_IA.quesitos[0]] })) === 'A IA propôs só 1 quesito; o mínimo é 2 — tente de novo', R + 'falha com um quesito só cita o mínimo de dois');
  ok(M.avisoFalha(null) === 'A IA não devolveu quesitos com fundamento — tente de novo'
    && M.avisoFalha(M.triagem({ quesitos: [RESPOSTA_IA.quesitos[2], RESPOSTA_IA.quesitos[3]] })) === 'Nenhum dos 2 quesitos é aproveitável (mínimo 2) — tente de novo', R + 'falha sem nada aproveitável');

  // ---- citações → referências
  const ref = f => M.referencias(f).map(r => r.tipo + ':' + r.ref).join(' | ');
  const confere = (rotulo, casos) => { const erros = casos.filter(([f, e]) => ref(f) !== e).map(([f, e]) => JSON.stringify(f) + ' → "' + ref(f) + '" (esperado "' + e + '")');
    ok(!erros.length, R + rotulo + (erros.length ? ': ' + erros.join('; ') : '')); };
  confere('artigo antes e depois da lei, lista de artigos, lei por número e Constituição', [
    ['art. 304, § 5º, do CPC', 'lei:Art. 304, § 5º do CPC'],
    ['CPC, art. 139, IV; Súmula 410 do STJ', 'lei:Art. 139, IV do CPC | juris:Súmula 410 do STJ'],
    ['arts. 186 e 927 do Código Civil', 'lei:Art. 186 do CC | lei:Art. 927 do CC'],
    ['Lei 9.613/98, art. 1o', 'lei:Art. 1º da Lei 9.613/98'],
    ['art. 37 §6º da CF', 'lei:Art. 37, §6º da CF'],
    ['art. 5º, XI, da Constituição Federal', 'lei:Art. 5º, XI da CF'],
    ['CF/88, art. 5º, LXVIII', 'lei:Art. 5º, LXVIII da CF'],
    ['art. 1.228 do CC', 'lei:Art. 1.228 do CC'],
    ['art. 489, § 1º, IV, do CPC/2015', 'lei:Art. 489, § 1º, IV do CPC'],
    ['art. 304 do CPC; CPC, art. 304', 'lei:Art. 304 do CPC'],
  ]);
  confere('a sigla que fecha uma citação nunca vira a lei do artigo seguinte', [
    ['art. 300 do CPC, art. 5º da CF', 'lei:Art. 300 do CPC | lei:Art. 5º da CF'],
    ['art. 37, § 6º, da CF, art. 43 do CC', 'lei:Art. 37, § 6º da CF | lei:Art. 43 do CC'],
    ['art. 5º, XXXV, da CF, art. 3º do CPC', 'lei:Art. 5º, XXXV da CF | lei:Art. 3º do CPC'],
    ['art. 186 do CC, art. 927 do CPC', 'lei:Art. 186 do CC | lei:Art. 927 do CPC'],
    ['art. 300 do CPC, art. 5º', 'lei:Art. 300 do CPC'],
    // cada trava sozinha: a sigla já usada (sem "do") e a sigla presa a um "do" (sem artigo antes)
    ['art. 300 CPC, art. 5º', 'lei:Art. 300 do CPC'],
    ['inciso IV do CPC, art. 5º', ''],
  ]);
  confere('código revogado, Constituição antiga e Constituição estadual não viram a lei em vigor', [
    ['art. 273 do CPC/73', ''], ['art. 273 do CPC/1973', ''], ['art. 273 do Código de Processo Civil de 1973', ''],
    ['art. 159 do CC/1916', ''], ['art. 159 do Código Civil de 1916', ''], ['art. 5º da CF/67', ''], ['art. 153 da Constituição Federal de 1967', ''],
    ['art. 5º da Constituição de Goiás', ''], ['art. 5º da Constituição Goiana', ''], ['art. 125 da Constituição do Estado de São Paulo', ''], ['art. 5º da Constituição Estadual', ''],
    // o ano da lei em vigor, e a Constituição sem adjetivo, continuam valendo
    ['art. 489 do CPC/15', 'lei:Art. 489 do CPC'], ['art. 186 do CC/2002', 'lei:Art. 186 do CC'], ['art. 5º da Constituição de 1988', 'lei:Art. 5º da CF'],
    ['art. 5º, XXXV, da Constituição', 'lei:Art. 5º, XXXV da CF'], ['art. 5º da Constituição e art. 3º do CPC', 'lei:Art. 5º da CF | lei:Art. 3º do CPC'],
  ]);
  confere('fronteira de palavra: CPM, CPPM e Código Penal Militar não viram CP nem CPP', [
    ['art. 9º do CPM', ''], ['art. 3º do CPPM', ''], ['art. 9º do Código Penal Militar', ''],
    ['art. 155 § 4º incisos I II III e IV (furto qualificado) do Código Penal Militar', ''],
  ]);
  confere('formas comuns viram referência: caput, ", CF", " CPC", n.º, LC e LINDB', [
    ['art. 5º, caput, da CF', 'lei:Art. 5º, caput da CF'],
    ['art. 300, caput, do CPC', 'lei:Art. 300, caput do CPC'],
    ['Art. 37, §6º, CF', 'lei:Art. 37, §6º da CF'],
    ['art. 37, caput e § 6º, da CF/88', 'lei:Art. 37, caput e § 6º da CF'],
    ['art. 33, caput, da Lei 11.343/2006', 'lei:Art. 33, caput da Lei 11.343/2006'],
    ['art. 98 da Lei n.º 8.112/1990', 'lei:Art. 98 da Lei 8.112/1990'],
    ['art. 304, CPC', 'lei:Art. 304 do CPC'],
    ['Art. 304 CPC', 'lei:Art. 304 do CPC'],
    ['art. 5º, CC', 'lei:Art. 5º do CC'],
    ['art. 3º, § 1º, da LC 101/2000', 'lei:Art. 3º, § 1º da LC 101/2000'],
    ['arts. 5º e 6º da LINDB', 'lei:Art. 5º da LINDB | lei:Art. 6º da LINDB'],
    ['art. 14, § 3º, da CF e art. 1º, I, "g", da LC 64/1990', 'lei:Art. 14, § 3º da CF | lei:Art. 1º, I, "g" da LC 64/1990'],
    // ordinal com ponto, à moda antiga (o fixture do C3 na suíte usa "§6.º")
    ['art. 37, §6.º, da CF/88', 'lei:Art. 37, §6º da CF'], ['art. 1.º do CPC', 'lei:Art. 1º do CPC'], ['art. 121, § 2.º, IV, do CP', 'lei:Art. 121, § 2º, IV do CP'],
  ]);
  confere('gênero da sigla: "da" para lei, Constituição e consolidação; "do" para código e estatuto', [
    ['art. 11 da LIA', 'lei:Art. 11 da LIA'], ['art. 3º da LEP', 'lei:Art. 3º da LEP'], ['art. 2º da CLT', 'lei:Art. 2º da CLT'],
    ['art. 52 do CTB', 'lei:Art. 52 do CTB'], ['art. 121-A do CP', 'lei:Art. 121-A do CP'],
  ]);
  confere('o que não é citação reconhecível não vira link', [
    ['STF, RE 841.526', ''], ['', ''], ['art. 5 o juiz decide', ''], ['art. 157 § 2º I II III IV V VI VII VIII da lei penal', ''],
  ]);
  const jur = f => M.referencias(f).filter(r => r.tipo === 'juris').map(r => [r.ref, r.fo, r.nu, r.busca].join('|')).join(' ; ');
  const casosJ = [
    ['Tema 1.046 do STF', 'Tema 1046 do STF|repercussao_geral|1046|Tema 1046 (RG)'],
    ['Tema 1.046 da repercussão geral', 'Tema 1046 do STF|repercussao_geral|1046|Tema 1046 (RG)'],
    ['STJ, Tema 1.000', 'Tema 1000 do STJ|repetitivo|1000|Tema 1000 (Repetitivo)'],
    ['art. 927, III, do CPC (Tema 1.000/STJ)', 'Tema 1000 do STJ|repetitivo|1000|Tema 1000 (Repetitivo)'],
    ['Súmula nº 7 do STJ', 'Súmula 7 do STJ|sumula_stj|7|Súmula 7 STJ'],
    ['Súmula n.º 7 do STJ', 'Súmula 7 do STJ|sumula_stj|7|Súmula 7 STJ'],
    ['Súmula 7/STJ', 'Súmula 7 do STJ|sumula_stj|7|Súmula 7 STJ'],
    ['Súmulas 7 e 83 do STJ', 'Súmula 7 do STJ|sumula_stj|7|Súmula 7 STJ ; Súmula 83 do STJ|sumula_stj|83|Súmula 83 STJ'],
    ['Súmula Vinculante 13', 'Súmula Vinculante 13|sumula_vinculante|13|Súmula Vinculante 13'],
    ['Súmula 85 do TST', 'Súmula 85 do TST||85|'],
    ['Súmula 7', 'Súmula 7||7|Súmula 7'],
  ];
  const errJ = casosJ.filter(([f, e]) => jur(f) !== e).map(([f, e]) => JSON.stringify(f) + ' → "' + jur(f) + '" (esperado "' + e + '")');
  ok(!errJ.length, R + 'súmula e tema: milhar com ponto, "nº", tribunal antes ou depois; tribunal fora do acervo não promete verbete' + (errJ.length ? ': ' + errJ.join('; ') : ''));
  // um tribunal escrito uma vez serve a UMA citação: o que fecha a anterior não vira o da seguinte,
  // o de depois vence o de antes, e na dúvida nenhuma leva (a busca por número não erra de tribunal)
  const T786 = 'Tema 786 do STF|repercussao_geral|786|Tema 786 (RG)', S54J = 'Súmula 54 do STJ|sumula_stj|54|Súmula 54 STJ', S7J = 'Súmula 7 do STJ|sumula_stj|7|Súmula 7 STJ', T1046 = 'Tema 1046 do STF|repercussao_geral|1046|Tema 1046 (RG)';
  const casosT = [
    ['Tema 786 do STF, Súmula 54 do STJ', T786 + ' ; ' + S54J], ['Tema 1.046 do STF, Súmula 7 do STJ', T1046 + ' ; ' + S7J],
    ['ADI 4.277 do STF, Súmula 7 do STJ', S7J], ['Súmula 7 do STJ, Tema 1.046 do STF', S7J + ' ; ' + T1046],
    ['Tema 786 do STF, Súmula 54', T786 + ' ; Súmula 54||54|Súmula 54'], ['ADI 4.277 do STF, Súmula 7', 'Súmula 7||7|Súmula 7'],
    ['Tema 786/STF, Súmula 54', T786 + ' ; Súmula 54||54|Súmula 54'], ['STF, Súmula 54 do STJ', S54J],
    ['STF, Tema 786, STJ, Súmula 54', T786 + ' ; ' + S54J], ['Súmula 54 do STJ, STF, Tema 786', S54J + ' ; ' + T786],
    ['STF, Súmulas 7 e 83, STJ, Súmula 54', 'Súmula 7 do STF|sumula_stf|7|Súmula 7 STF ; Súmula 83 do STF|sumula_stf|83|Súmula 83 STF ; ' + S54J],
    ['Súmula 410, STJ, Tema 786', 'Súmula 410||410|Súmula 410 ; Tema 786||786|Tema 786'], ['Súmula 7, STJ: Súmula 54', 'Súmula 7||7|Súmula 7 ; ' + S54J],
    ['TSE, Súmulas 7 e 83. TST, Tema 786.', 'Súmula 7 do TSE|sumula_tse|7|Súmula TSE 7 ; Súmula 83 do TSE|sumula_tse|83|Súmula TSE 83 ; Tema 786||786|Tema 786'],
  ];
  const errT = casosT.filter(([f, e]) => jur(f) !== e).map(([f, e]) => JSON.stringify(f) + ' → "' + jur(f) + '" (esperado "' + e + '")');
  ok(!errT.length, R + 'o tribunal que fecha uma citação nunca vira o da seguinte; na dúvida, nenhum' + (errT.length ? ': ' + errT.join('; ') : ''));

  // ---- tempo: nada de retrocesso exponencial (o render lê isto a cada tecla)
  const PATOLOGICOS = [
    'art. 157 § 2º I II III IV V VI VII VIII IX da lei penal',
    'art. 5º ' + Array.from({ length: 12 }, (_, i) => '§ ' + (i + 1) + 'º').join(' ') + ' e assim por diante',
    'art. 5º, incisos I e II e III e IV e V e VI e VII e VIII (rol exemplificativo), conforme a doutrina',
    'art. 1 '.repeat(150), 'Súmula 1, '.repeat(80) + 'do STJ', 'Tema 1 e '.repeat(100),
  ];
  // o melhor de 5 leituras (texto novo a cada vez, fora do memo): com a máquina carregada, uma
  // pausa de agenda ou de coleta de lixo não é o algoritmo; o retrocesso exponencial custa segundos em TODAS
  const tempos = PATOLOGICOS.map((f, i) => Math.min(...[0, 1, 2, 3, 4].map(k => { const t0 = process.hrtime.bigint(); M.referencias(f + ' #' + i + '.' + k + Date.now()); return Number(process.hrtime.bigint() - t0) / 1e6; })));
  ok(tempos.every(ms => ms < 50), R + 'fundamentos patológicos lidos em menos de 50 ms cada (' + tempos.map(ms => ms.toFixed(1)).join(' / ') + ' ms, melhor de 5)');
  // espaços em fila depois do número: os "\s*" seguidos repartiam a fila em tempo cúbico (60 a 175 ms
  // na leitura anterior). Reduzidos a um, a leitura é linear: o limite apertado separa as duas com folga
  const FILAS = ['Súmula 1' + ' '.repeat(590) + 'x', 'Tema 1' + '\n'.repeat(592) + 'y', 'Súmula 1' + ' '.repeat(295) + '-' + ' '.repeat(295)];
  const tFila = FILAS.map((f, i) => Math.min(...[0, 1, 2, 3, 4].map(k => { const t0 = process.hrtime.bigint(); M.referencias(f + ' #' + i + '.' + k + Date.now()); return Number(process.hrtime.bigint() - t0) / 1e6; })));
  ok(tFila.every(ms => ms < 10), R + 'fila de espaços depois do número lida em menos de 10 ms (' + tFila.map(ms => ms.toFixed(1)).join(' / ') + ' ms, melhor de 5)');

  // ---- até o verbete exato, no índice de verdade
  let IDX = null;
  try { const cx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(RAIZ, 'juris-index.js'), 'utf8'), cx); IDX = cx.window.__JURIS_IDX__; } catch (_) {}
  if (!Array.isArray(IDX)) { ok(false, R + 'juris-index.js carrega para conferir os verbetes'); return; }
  const titulo = id => { const r = IDX.find(x => x[0] === id); return r ? r[1] + ' · ' + r[4] : ''; };
  const alvo = (f) => { const r = M.referencias(f).find(x => x.tipo === 'juris'); return r ? titulo(M.verbeteNoJuris(IDX, r.fo, r.nu)) : ''; };
  const verbetes = [
    ['Súmula 410 do STJ', 'STJ · Súmula 410'], ['Súmula 7/STJ', 'STJ · Súmula 7'], ['Súmula 410 do STF', 'STF · Súmula 410'],
    ['Súmula Vinculante 13', 'STF · Súmula Vinculante 13'], ['Tema 698 do STF', 'STF · Tema 698 (RG)'],
    ['Tema 1.046 do STF', 'STF · Tema 1046 (RG)'], ['(Tema 1.000/STJ)', 'STJ · Tema 1000 (Repetitivo)'], ['Súmula 1 do TSE', 'TSE · Súmula TSE 1'],
  ];
  const errV = verbetes.filter(([f, e]) => alvo(f) !== e).map(([f, e]) => f + ' → "' + alvo(f) + '" (esperado "' + e + '")');
  ok(!errV.length, R + 'cada súmula ou tema leva ao verbete exato pela coleção e pelo número' + (errV.length ? ': ' + errV.join('; ') : ''));
  // tema e súmula de tribunais diferentes na mesma lista: cada botão abre o verbete do seu tribunal
  const alvos = f => M.referencias(f).filter(x => x.tipo === 'juris').map(r => titulo(M.verbeteNoJuris(IDX, r.fo, r.nu)) || '(busca)').join(' | ');
  const cruzados = [['Tema 786 do STF, Súmula 54 do STJ', 'STF · Tema 786 (RG) | STJ · Súmula 54'], ['Súmula 7 do STJ, Tema 1.046 do STF', 'STJ · Súmula 7 | STF · Tema 1046 (RG)'],
    ['Tema 786 do STF, Súmula 54', 'STF · Tema 786 (RG) | (busca)']];
  const errC = cruzados.filter(([f, e]) => alvos(f) !== e).map(([f, e]) => f + ' → "' + alvos(f) + '" (esperado "' + e + '")');
  ok(!errC.length, R + 'na lista com dois tribunais, nenhum botão abre o verbete do tribunal vizinho' + (errC.length ? ': ' + errC.join('; ') : ''));
  ok(M.verbeteNoJuris(IDX, 'sumula_stj', 9999) === '' && M.verbeteNoJuris(IDX, '', 7) === '' && M.verbeteNoJuris(null, 'sumula_stj', 7) === '', R + 'sem o verbete no acervo, nada de id inventado');
  // a busca de reserva também acha o verbete (a regra do JURIS exige cada termo)
  const reserva = [['Tema 698 do STF', 'Tema 698 (RG)'], ['Tema 1.046 do STF', 'Tema 1046 (RG)'], ['Súmula 410 do STJ', 'Súmula 410'], ['STJ, Tema 1.000', 'Tema 1000 (Repetitivo)']];
  const errR = reserva.filter(([f, tit]) => { const r = M.referencias(f).find(x => x.tipo === 'juris'); const achados = buscaJuris(IDX, r.busca);
    return !achados.some(x => x[2] === r.fo && +x[3] === r.nu && x[4] === tit); }).map(([f]) => f);
  ok(!errR.length, R + 'a busca de reserva por texto acha o mesmo verbete' + (errR.length ? ' (falhou: ' + errR.join(', ') + ')' : ''));

  // ---- a lei que o atalho do ENAM não abre: o arquivo no catálogo do LEGIS (leis-catalogo.js de verdade),
  // com a mesma regra do host (_espSugLeiCat): "/<arquivo>[compilado].htm" no fim da URL do Planalto
  let CAT = null;
  try { const cx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(RAIZ, 'leis-catalogo.js'), 'utf8'), cx); CAT = cx.window.CT_LEIS_CAT; } catch (_) {}
  if (!Array.isArray(CAT)) { ok(false, R + 'leis-catalogo.js carrega para conferir as leis'); return; }
  const noCatalogo = c => CAT.filter(x => new RegExp('/' + c + '(?:compilad[ao])?\\.htm$', 'i').test(String(x.u || '')));
  const leisCat = [
    ['art. 20 da LINDB', 'Lei de Introdução às Normas do Direito Brasileiro (LINDB)'], ['art. 52 do CTB', 'Código de Trânsito Brasileiro'],
    ['art. 3º, § 1º, da LC 101/2000', 'Lei de Responsabilidade Fiscal'], ['art. 1º, I, "g", da LC 64/1990', 'Lei de Inelegibilidades'],
    ['art. 33, caput, da Lei 11.343/2006', 'Lei de Drogas'], ['art. 98 da Lei n.º 8.112/1990', 'Estatuto dos Servidores Públicos Federais'],
    ['art. 41 do Decreto-Lei 3.689/41', 'Código de Processo Penal'], ['art. 11 da LIA', 'Lei de Improbidade Administrativa'],
    ['art. 3º da LEP', 'Lei de Execução Penal'], ['art. 98 do ECA', 'Estatuto da Criança e do Adolescente'], ['art. 2º da CLT', 'Consolidação das Leis do Trabalho (CLT)'],
    ['art. 5º, XI, da Constituição Federal', 'Constituição Federal'], ['art. 304 do CPC', 'Código de Processo Civil'], ['art. 121 do CP', 'Código Penal'],
    ['art. 186 do CC', 'Código Civil'], ['art. 6º do CDC', 'Código de Defesa do Consumidor'], ['art. 3º do CTN', 'Código Tributário Nacional'],
  ];
  const errCat = leisCat.filter(([f, tit]) => { const r = M.referencias(f).find(x => x.tipo === 'lei'); const ach = r && r.cat ? noCatalogo(r.cat) : [];
    return ach.length !== 1 || ach[0].t !== tit; }).map(([f]) => { const r = M.referencias(f).find(x => x.tipo === 'lei'); return f + ' → ' + (r ? r.cat + ' (' + noCatalogo(r.cat).map(x => x.t).join(', ') + ')' : 'nada'); });
  ok(!errCat.length, R + 'cada lei citada aponta um arquivo só do catálogo do LEGIS, e é a lei certa' + (errCat.length ? ': ' + errCat.join('; ') : ''));
}

/* ---- Parte 2: navegador ---- */
const ENUN_SEM = 'TJ-GO · Juiz Substituto · 2026 — FGV\n\nO autor obteve tutela antecipada antecedente e o réu não recorreu. Responda, em até 30 linhas: o que acontece com a decisão?';

export async function testarEspelhoSugerido(pageDaSuite, base, ok, opcoes = {}) {
  const R = 'ESPSUG [' + (opcoes.motor || 'chromium') + '] ';
  const { semear, novoContexto } = await import('./redacao-mesa.mjs');
  const { contraste } = await import('./redacao-motor.mjs');
  const arquivo = opcoes.arquivo || 'Catedra.dc.html';
  const M = carregar();
  const abrir = async (page) => {
    await page.goto(base + '/' + arquivo);
    await page.waitForFunction(() => typeof window.__catedraGoView === 'function' && !!window.__catedraApp);
    await page.evaluate(() => window.__catedraGoView('redacao'));
  };
  const app = (page, f, arg) => page.evaluate(f, arg);
  const visivel = (page, sel) => page.evaluate(s => [...document.querySelectorAll(s)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).length, sel);
  const fmt = l => l.map(x => x.falta ? x.s + ' (falta)' : x.r.toFixed(2)).join(' / ');
  const conferir = async (page) => {
    await page.click('[data-red="terminei"]'); await page.waitForSelector('[data-red="conf-item"]', { timeout: 8000 });
    const itens = await page.locator('[data-red="conf-item"]').count();
    for (let i = 0; i < itens; i++) await page.locator('[data-red="conf-item"] >> nth=' + i).locator('[data-red="conf-opcao"]').first().click();
    await page.click('[data-red="conf-registrar"]');
    await page.waitForFunction(() => !!window.__catedraApp.state.redResult, null, { timeout: 8000 });
  };

  // ===== claro, desktop: gerar → guardado → ver → conferir → histórico → refazer =====
  let { ctx, page } = await novoContexto(pageDaSuite);
  try {
    await semear(page, base, { redEnunciado: ENUN_SEM, redGabarito: '', redProvaId: 'p-sem-espelho' });
    await abrir(page);
    // prova do banco sem espelho: modo prova; a IA é trocada em _aiText (fora de window.claude)
    await app(page, (q1) => { const c = window.__catedraApp; c.setState({ redModoProva: true }); c._aiText = async () => JSON.stringify({ quesitos: [q1] }); }, RESPOSTA_IA.quesitos[0]);
    await page.waitForSelector('button:has-text("Gerar espelho sugerido")', { timeout: 8000 });
    await page.click('button:has-text("Gerar espelho sugerido")');
    await page.waitForFunction(() => !window.__catedraApp.state.espSugBusy, null, { timeout: 8000 });
    const tFalha = await app(page, () => (window.__catedraApp._toastEl || {}).textContent || '');
    ok(tFalha === 'A IA propôs só 1 quesito; o mínimo é 2 — tente de novo', R + 'IA com um quesito só: o aviso diz o motivo real (' + tFalha + ')');

    await app(page, (resp) => { window.__catedraApp._aiText = async () => JSON.stringify(resp); }, RESPOSTA_IA);
    await page.click('button:has-text("Gerar espelho sugerido")');
    await page.waitForFunction(() => /ESPELHO SUGERIDO/.test(window.__catedraApp.state.redGabarito || '') && !window.__catedraApp.state.espSugBusy, null, { timeout: 8000 });
    const tOk = await app(page, () => (window.__catedraApp._toastEl || {}).textContent || '');
    ok(tOk === 'Espelho sugerido gerado · 2 quesitos sem fundamento ficaram de fora', R + 'aviso de sucesso curto, com os descartes (' + tOk + ')');
    await page.waitForTimeout(150);
    const guardado = await app(page, (qs) => ({ oculto: !!window.__catedraApp.state.redEspelhoOculto, card: !!document.querySelector('[data-esp-sug-card]'),
      vaza: qs.filter(q => document.body.innerText.indexOf(q) >= 0) }), ['Reconhecer a estabilização da tutela antecipada', 'Afastar a formação de coisa julgada', 'Súmula 410', 'art. 304, § 5º']);
    ok(guardado.oculto && !guardado.card && !guardado.vaza.length, R + 'espelho guardado até a entrega: nenhum quesito nem fundamento na tela (' + JSON.stringify(guardado) + ')');
    const trilho2 = await contraste(page, ['.ct-trilho [data-esp-sug-selo]']);
    ok(!trilho2[0].falta && trilho2[0].w > 0 && trilho2[0].r >= 4.5, R + 'etapa 2: selo "Sugerido — não oficial" no trilho, contraste ' + fmt(trilho2));
    const faixa = (await page.textContent('[data-esp-sug-descartes]').catch(() => '') || '').trim();
    ok(faixa === '5 propostos pela IA · 2 aceitos · 2 descartados por falta de fundamento · 1 descartado por enunciado curto demais', R + 'a faixa conta propostos, aceitos e descartados, e a conta fecha (' + faixa + ')');

    // "Ver mesmo assim": aí, e só aí, o cartão com os fundamentos aparece
    page.once('dialog', d => d.accept());
    await page.click('button:has-text("Ver mesmo assim")');
    await page.waitForSelector('[data-esp-sug-card]', { timeout: 8000 });
    const botoes = await page.$$eval('[data-esp-sug-card] button.ct-enam-ref', bs => bs.map(b => b.textContent.trim()));
    ok(await visivel(page, '[data-esp-sug-card] [data-esp-sug-quesito]') === 2
      && botoes.join(' / ') === 'Art. 304, § 5º do CPC · Ler no LEGIS / Art. 304, § 6º do CPC · Ler no LEGIS / Súmula 410 do STJ · Ver no JURIS',
      R + 'espelho aberto: cada fundamento do quesito vira botão para o LEGIS ou o JURIS (' + botoes.join(' / ') + ')');
    const claro = await contraste(page, ['[data-esp-sug-card] [data-esp-sug-fundamento]', '[data-esp-sug-card] [data-esp-sug-card-descartes]', '[data-esp-sug-card] button.ct-enam-ref', '[data-esp-sug-card] .ct-selo-forte', '[data-esp-sug-descartes]']);
    ok(claro.every(x => !x.falta && x.r >= 4.5), R + 'claro: fundamento, contagem, botão e selo do cartão e contagem da faixa ≥ 4,5:1 (' + fmt(claro) + ')');

    // os botões levam ao lugar certo (a navegação é interceptada: aqui importa o destino)
    await app(page, () => { const c = window.__catedraApp; window.__ida = null; c._irPara = (v, x) => { window.__ida = { v, x }; return 'ok'; }; });
    await page.locator('[data-esp-sug-card] button.ct-enam-ref', { hasText: 'Art. 304, § 5º do CPC' }).click();
    const legis = await app(page, () => ({ v: window.__ida && window.__ida.v, lei: (window.__catedraApp._laAbrir || {}).leiId || '', rot: (window.__catedraApp._laAbrir || {}).rot || '' }));
    ok(legis.v === 'legis' && /l13105/.test(legis.lei) && legis.rot === 'Art. 304, § 5º', R + '"Ler no LEGIS" abre o CPC no art. 304, § 5º (' + JSON.stringify(legis) + ')');
    await app(page, () => { window.__ida = null; });
    await page.locator('[data-esp-sug-card] button.ct-enam-ref', { hasText: 'Súmula 410 do STJ' }).click();
    await page.waitForFunction(() => !!window.__ida, null, { timeout: 20000 }).catch(() => {});
    const juris = await app(page, () => window.__ida && { v: window.__ida.v, busca: window.__ida.x.acervoBusca });
    ok(!!juris && juris.v === 'juris' && juris.busca === 'STJ-SUM-410', R + '"Ver no JURIS" abre o verbete exato da Súmula 410 do STJ (' + JSON.stringify(juris) + ')');
    await app(page, () => { delete window.__catedraApp._irPara; });

    // entrega (conferência à mão) → etapa 3: o selo continua e o cartão mostra o espelho usado
    await conferir(page);
    await page.waitForSelector('[data-esp-sug-card]', { timeout: 8000 });
    const e3 = await app(page, () => ({ selo: [...document.querySelectorAll('.ct-trilho [data-esp-sug-selo]')].some(e => e.getBoundingClientRect().width > 0),
      titulo: (document.querySelector('[data-esp-sug-card] .ct-eb') || {}).textContent || '', aprox: !!(window.__catedraApp.state.redResult || {}).aproximada }));
    ok(e3.selo && e3.aprox, R + 'etapa 3: o selo segue no trilho e a nota sai aproximada');
    ok(/Fundamentos do espelho usado/.test(e3.titulo) && await visivel(page, '[data-esp-sug-card] button.ct-enam-ref') === 3, R + 'etapa 3: cartão "Fundamentos do espelho usado" com os botões');
    // no meio da correção também: a nota de cada quesito sai do espelho sugerido
    const seloQ = await contraste(page, ['[data-red="quesitos"] [data-esp-sug-selo-quesitos]']);
    ok(await visivel(page, '[data-red="quesitos"] [data-esp-sug-selo-quesitos]') === 1 && !seloQ[0].falta && seloQ[0].r >= 4.5,
      R + 'etapa 3: o cartão "Nota por quesito" leva o selo, contraste ' + fmt(seloQ));

    // histórico e evolução (etapa 1): os dois selos, medidos
    page.once('dialog', d => d.accept());
    await page.click('.ct-trilho button:has-text("Nova prova")');
    await page.waitForSelector('[data-red-hist-aprox]', { timeout: 8000 });
    await page.locator('.ct-card', { has: page.locator('.ct-eb:text("Minha evolução")') }).locator('button', { hasText: /^ver$/ }).click();
    await page.waitForSelector('[data-red-evo-aprox]', { timeout: 8000 }).catch(() => {});
    const selosClaro = await contraste(page, ['[data-red-hist-aprox]', '[data-red-evo-aprox]']);
    const rotHist = ((await page.textContent('[data-red-hist-aprox]').catch(() => '')) || '').trim();
    ok(selosClaro.every(x => !x.falta && x.r >= 4.5) && rotHist === 'sugerido · aprox.', R + 'claro: selo do histórico ("' + rotHist + '") e da evolução ≥ 4,5:1 (' + fmt(selosClaro) + ')');

    // reabrir do histórico mostra os fundamentos; refazer à mão sem o espelho em cache não vira nota oficial
    await page.locator('button[data-id]', { has: page.locator('[data-red-hist-aprox]') }).first().click();
    await page.waitForSelector('[data-esp-sug-card]', { timeout: 8000 }).catch(() => {});
    ok(await visivel(page, '[data-esp-sug-card] [data-esp-sug-quesito]') === 2, R + 'correção reaberta do histórico traz o cartão com os fundamentos do espelho usado');
    await app(page, () => window.__catedraApp.setState({ espelhosSugeridos: [] }));
    await page.click('[data-red="reescrever"]');
    await page.waitForSelector('[data-red="terminei"]', { timeout: 8000 });
    const refazer = await app(page, () => { const vis = e => !!e && e.getBoundingClientRect().width > 0;
      return { selo: [...document.querySelectorAll('.ct-trilho [data-esp-sug-selo]')].some(vis), vaza: !!document.querySelector('[data-esp-sug-card]'),
        // o cartão guardado e a faixa dizem o mesmo que o trilho: sem o objeto em cache, vale o texto que se declara
        guardado: [...document.querySelectorAll('[data-red="espelho"] .ct-card .ct-eb')].filter(vis).map(e => e.textContent.trim()).filter(t => /guardado/.test(t)),
        faixa: vis(document.querySelector('[data-esp-sug-faixa]')),
        // sem o espelho da prova em mãos, "Regenerar" gravaria outro espelho sob o id que estiver aberto
        regenerar: !!document.querySelector('[data-esp-sug-regerar]') }; });
    ok(refazer.selo && !refazer.vaza, R + 'refazer à mão a partir do histórico mantém o selo, com o espelho guardado de novo (' + JSON.stringify(refazer) + ')');
    ok(refazer.guardado.join('|') === 'Espelho sugerido · guardado' && refazer.faixa && !refazer.regenerar,
      R + 'refazer à mão sem o espelho em cache: o cartão guardado diz "Espelho sugerido", a faixa do sugerido aparece e "Regenerar" não (' + JSON.stringify(refazer) + ')');
    await conferir(page);
    await page.waitForTimeout(300);
    const nova = await app(page, () => { const h = JSON.parse(localStorage.getItem('catedra:red') || '[]'); return { n: h.length, aprox: (h[0] || {}).aproximada }; });
    ok(nova.n === 2 && nova.aprox === true, R + 'a nova tentativa fica registrada como aproximada, não como oficial (' + JSON.stringify(nova) + ')');
  } catch (e) { ok(false, R + 'claro: exceção ' + e.message.split('\n')[0]); }
  finally { await ctx.close(); }

  // ===== escuro, iPad com toque: espelho aberto ao reabrir o app, e os selos da etapa 1 =====
  try {
    ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true });
    page = await ctx.newPage();
    page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
    const tz = new Date(); tz.setHours(14, 0, 0, 0); await page.clock.install({ time: tz });
    const sug = M.interpretar(RESPOSTA_IA_LEIS, 'p-sug');
    // o espelho sugerido de OUTRA prova, já usado numa correção do histórico (tema e súmula de tribunais diferentes)
    const sugB = M.interpretar(RESPOSTA_IA_OUTRA, 'p-outra');
    const resP = { nota: 4, notaStr: '4.0', propria: true, aproximada: true, topicos: [], criterios: [], fortes: [], melhorar: [] };
    const red = [{ id: 'rd1', up: 1, ts: Date.now() - 864e5, tema: 'Tutela estabilizada', words: 0, nota: 4, disc: 'Direito Processual Civil', aproximada: true,
      origem: 'conferencia-propria', gabarito: M.texto(sug), res: resP },
      { id: 'rd2', up: 1, ts: Date.now() - 2 * 864e5, tema: 'Responsabilidade do Estado', words: 0, nota: 4, disc: 'Direito Administrativo', aproximada: true,
      origem: 'conferencia-propria', gabarito: M.texto(sugB), res: resP }];
    const evo = [{ id: 'rh1', up: 1, ts: Date.now() - 864e5, quando: '2026-11-20', origem: 'redacao', prova: 'Tutela estabilizada', disc: 'Direito Processual Civil', aproximada: true,
      quesitos: [{ i: 0, titulo: 'Reconhecer a estabilização', nota: 0.1, max: 4 }] }];
    await semear(page, base, { espelhosSugeridos: [sug, sugB], redProvaId: 'p-sug', redGabarito: M.texto(sug), red, redHist: evo });
    await page.evaluate(() => localStorage.setItem('catedra:dark', '1'));
    await abrir(page);
    await page.waitForSelector('[data-esp-sug-card]', { timeout: 8000 });
    const escuro = await contraste(page, ['.ct-trilho [data-esp-sug-selo]', '[data-esp-sug-descartes]', '[data-esp-sug-card] [data-esp-sug-fundamento]', '[data-esp-sug-card] [data-esp-sug-card-descartes]', '[data-esp-sug-card] button.ct-enam-ref']);
    const dark = await app(page, () => !!window.__catedraApp.state.darkMode);
    ok(dark && escuro.every(x => !x.falta && x.r >= 4.5), R + 'escuro: selo do trilho, contagens, fundamento e botão ≥ 4,5:1 (' + fmt(escuro) + ')');
    // LINDB e LC: o atalho do ENAM não as abre; o catálogo do LEGIS carrega só agora e elas viram botão
    await page.waitForFunction(() => [...document.querySelectorAll('[data-esp-sug-card] button.ct-enam-ref')].filter(b => /LINDB|LC 101/.test(b.textContent)).length === 2, null, { timeout: 8000 }).catch(() => {});
    const doCat = await page.$$eval('[data-esp-sug-card] button.ct-enam-ref', bs => bs.filter(b => /LINDB|LC 101/.test(b.textContent)).map(b => b.textContent.trim() + ' <' + b.dataset.lei + '>'));
    ok(doCat.length === 2 && /^Art\. 20 da LINDB · Ler no LEGIS <.*\/del4657compilado\.htm>$/.test(doCat[0]) && /^Art\. 3º, § 1º da LC 101\/2000 · Ler no LEGIS <.*\/lcp101\.htm>$/.test(doCat[1]),
      R + 'LINDB e LC abrem no LEGIS pelo catálogo (' + doCat.join(' / ') + ')');
    const alturas = await page.$$eval('[data-esp-sug-card] button.ct-enam-ref', bs => bs.map(b => Math.round(b.getBoundingClientRect().height)));
    ok(alturas.length === 5 && alturas.every(h => h >= 44), R + 'iPad com toque: os botões dos fundamentos têm alvo ≥ 44 px (' + alturas.join(', ') + ')');
    const larg = await app(page, () => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    ok(larg.sw <= larg.cw, R + 'iPad: o cartão não cria rolagem horizontal (' + larg.sw + ' ≤ ' + larg.cw + ')');
    await app(page, () => window.__catedraApp.setState({ redEnunciado: '', redGabarito: '', espSugAtual: null, redProvaId: '' }));
    await page.waitForSelector('[data-red-hist-aprox]', { timeout: 8000 });
    await page.locator('.ct-card', { has: page.locator('.ct-eb:text("Minha evolução")') }).locator('button', { hasText: /^ver$/ }).click();
    await page.waitForSelector('[data-red-evo-aprox]', { timeout: 8000 }).catch(() => {});
    const selosEscuro = await contraste(page, ['[data-red-hist-aprox]', '[data-red-evo-aprox]']);
    ok(selosEscuro.every(x => !x.falta && x.r >= 4.5), R + 'escuro: selo do histórico e da evolução ≥ 4,5:1 (' + fmt(selosEscuro) + ')');
    // celular: os selos em caixa alta não podem empurrar a página para o lado
    await page.setViewportSize({ width: 375, height: 812 }); await page.waitForTimeout(200);
    const cel = await app(page, () => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      dentro: ['[data-red-hist-aprox]', '[data-red-evo-aprox]'].every(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.right <= document.documentElement.clientWidth; }) }));
    ok(cel.sw <= cel.cw && cel.dentro, R + 'celular (375 px): selos do histórico e da evolução cabem, sem rolagem horizontal (' + JSON.stringify(cel) + ')');
    // a correção de outra prova, reaberta com o espelho desta em mãos: o cartão mostra o espelho que
    // a CORREÇÃO usou, não o da prova aberta; e cada botão do JURIS vai ao tribunal da sua citação
    await app(page, () => { const c = window.__catedraApp; c.setState({ espSugAtual: (c.state.espelhosSugeridos || []).find(x => x && x.id === 'p-sug') || null }); });
    await page.click('button[data-id="rd2"]');
    await page.waitForSelector('[data-esp-sug-card]', { timeout: 8000 }).catch(() => {});
    const outra = await app(page, () => { const card = document.querySelector('[data-esp-sug-card]'); const t = card ? card.innerText : '';
      return { usado: /responsabilidade civil objetiva do Estado/.test(t), daAberta: /estabilização da tutela antecipada/.test(t),
        juris: card ? [...card.querySelectorAll('button.ct-enam-ref')].map(b => b.textContent.trim()).filter(x => /JURIS/.test(x)) : [] }; });
    ok(outra.usado && !outra.daAberta, R + 'correção de outra prova: o cartão traz o espelho usado nela, não o da prova aberta (' + JSON.stringify(outra) + ')');
    ok(outra.juris.join(' / ') === 'Tema 940 do STF · Ver no JURIS / Súmula 54 do STJ · Ver no JURIS / Súmula 54 do STJ · Ver no JURIS',
      R + '"Tema 940 do STF, Súmula 54 do STJ": cada botão do JURIS leva o tribunal da sua citação (' + outra.juris.join(' / ') + ')');
  } catch (e) { ok(false, R + 'escuro: exceção ' + e.message.split('\n')[0]); }
  finally { await ctx.close().catch(() => {}); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let falhas = 0, total = 0;
  testarEspelhoSugeridoEstatico((c, m) => { total++; if (!c) { falhas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); });
  console.log(falhas ? ('\nFALHAS: ' + falhas + ' de ' + total) : ('\n' + total + ' verificações passaram'));
  process.exit(falhas ? 1 : 0);
}
