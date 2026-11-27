/* ÚLTIMA SINCRONIZAÇÃO E CONFLITO (25/11/2026) — sync-conflitos.js + auth.js + Ajustes › Dados e backup
   Parte 1 (Node, sem navegador): a descrição do conflito (escalar deste aparelho, da nuvem, lápide; lista
   unida, item mudado nos dois, item apagado que voltou; nada quando só um lado mudou ou quando a nuvem já
   tem o que este aparelho mandou), a linhagem das versões, o nome do aparelho e os textos.
   Parte 2 (navegador): o auth.js de verdade (fixture do iPad, que carrega o módulo como o build) põe o
   carimbo de quem gravou só no corpo do envio, sem envio extra, e descreve o conflito sem mudar o merge —
   no envio, na leitura, na hidratação, com resposta perdida e com o envio do fechamento; os Ajustes
   mostram a última sincronização e os avisos, medidos (contraste, alvo de toque, tema escuro, fuso −4).
   Roda sozinho: node tests/sync-ultima-conflito.mjs (só a parte 1). */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONTE = fs.readFileSync(path.join(RAIZ, 'sync-conflitos.js'), 'utf8');
function carregar() {
  const caixa = { window: {} };
  vm.runInNewContext(FONTE, caixa);
  return caixa.window.CT_SYNC_CONFLITOS;
}
const J = JSON.stringify;

export function testarSyncUltimaConflitoEstatico(ok) {
  const R = 'SYNC-CONFLITO ';
  let M = null;
  try { M = carregar(); } catch (e) { ok(false, R + 'sync-conflitos.js carrega (' + e.message.split('\n')[0] + ')'); return; }
  ok(!!M && ['descrever', 'semRepetir', 'retrato', 'linhagem', 'escolherBase', 'aparar', 'carimboDa', 'temPerda', 'naoLidos', 'nomeAparelho',
    'textoUltima', 'textoGravacao', 'textoConflito', 'textoConflitos'].every(f => typeof M[f] === 'function'),
    R + 'publica descrever, retrato, linhagem, escolherBase, aparar, temPerda, naoLidos, nomeAparelho e os textos');
  ok(M.CHAVE_ENVIO === 'catedra:_ultimoEnvio', R + 'a chave do carimbo de envio é catedra:_ultimoEnvio');

  // retrato: hash por chave com conteúdo; vazio fica de fora
  const E0 = J([{ disc: 'Civil' }]), E1 = J([{ disc: 'Civil' }, { disc: 'Penal' }]), E2 = J([{ disc: 'Civil' }, { disc: 'Processo Civil' }]);
  const r0 = M.retrato({ 'catedra:edital': E0, 'catedra:prova': '' });
  ok(!!r0['catedra:edital'] && !('catedra:prova' in r0), R + 'retrato: hash da chave com conteúdo, nada da vazia');
  ok(M.hash(E0) === M.hash(String(E0)) && M.hash(E0) !== M.hash(E1), R + 'hash: o mesmo texto dá o mesmo valor; texto diferente, outro');

  const BT = 1000;   // a base é a versão de 1000 ms: item com carimbo maior mudou depois dela
  const S = (id, up, x) => Object.assign({ id, up }, x || {});
  const base = M.retrato({ 'catedra:edital': E0, 'catedra:prova': '"2026-12-01"',
    'catedra:sessions': J([S('a', 1), S('b', 1)]), 'catedra:blocksDate': '"2026-11-24"' });
  const L = { 'catedra:sessions': true, 'catedra:reviews': true };
  const d = (nuvem, local, mesclado, b) => M.descrever({ nuvem, local, mesclado, base: b === undefined ? base : b, baseTs: BT, listas: L });

  // (1) escalar: os dois mudaram e ficou a versão deste aparelho
  let x = d({ 'catedra:edital': E1 }, { 'catedra:edital': E2 }, { 'catedra:edital': E2 });
  ok(x.length === 1 && x[0].k === 'catedra:edital' && x[0].lado === 'local', R + 'escalar: os dois mudaram, o merge deixou o local → lado "local" (' + J(x) + ')');
  // (2) escalar: ficou a da nuvem
  x = d({ 'catedra:edital': E1 }, { 'catedra:edital': E2 }, { 'catedra:edital': E1 });
  ok(x.length === 1 && x[0].lado === 'nuvem', R + 'escalar: os dois mudaram, o merge deixou a nuvem → lado "nuvem"');
  // (3) lista: cada lado acrescentou uma sessão → unidas, nada perdido
  const Sn = J([S('a', 1), S('b', 1), S('c', 2000)]), Sl = J([S('a', 1), S('b', 1), S('d', 3000)]);
  const Sm = J([S('a', 1), S('b', 1), S('c', 2000), S('d', 3000)]);
  x = d({ 'catedra:sessions': Sn }, { 'catedra:sessions': Sl }, { 'catedra:sessions': Sm });
  ok(x.length === 1 && x[0].lado === 'uniao' && x[0].unidas === true && x[0].colisoes.local === 0 && x[0].colisoes.nuvem === 0 && x[0].lapides === 0,
    R + 'lista: os dois acrescentaram → unidas, sem colisão nem lápide (' + J(x) + ')');
  ok(M.temPerda({ itens: x }) === false, R + 'lista só unida não perde nada (temPerda = false)');
  // (4) a nuvem já tem tudo o que este aparelho tem (envio do fechamento que chegou): não é conflito
  x = d({ 'catedra:sessions': J([S('a', 1), S('b', 1), S('m', 2000), S('i', 3000)]) }, { 'catedra:sessions': J([S('a', 1), S('b', 1), S('m', 2000)]) },
    { 'catedra:sessions': J([S('a', 1), S('b', 1), S('m', 2000), S('i', 3000)]) });
  ok(x.length === 0, R + 'lista: a nuvem já contém o que este aparelho mudou → nada a descrever (' + J(x) + ')');
  // …e o inverso: este aparelho já tem tudo o que a nuvem tem (a versão da nuvem é a que ele mesmo gravou)
  x = d({ 'catedra:sessions': J([S('a', 1), S('b', 1), S('m', 2000)]) }, { 'catedra:sessions': J([S('a', 1), S('b', 1), S('m', 2000), S('n', 3000)]) },
    { 'catedra:sessions': J([S('a', 1), S('b', 1), S('m', 2000), S('n', 3000)]) });
  ok(x.length === 0, R + 'lista: este aparelho já contém o que a nuvem tem → nada a descrever');
  // (5) a MESMA sessão mudou nos dois aparelhos: o merge ficou com uma versão — isso é conflito
  x = d({ 'catedra:sessions': J([S('a', 1500, { min: 45 }), S('b', 1)]) }, { 'catedra:sessions': J([S('a', 1900, { min: 60 }), S('b', 1)]) },
    { 'catedra:sessions': J([S('a', 1900, { min: 60 }), S('b', 1)]) });
  ok(x.length === 1 && x[0].unidas === false && x[0].colisoes.local === 1 && x[0].colisoes.nuvem === 0 && M.temPerda({ itens: x }),
    R + 'lista: o mesmo item mudou nos dois → colisão, ficou a versão deste aparelho (' + J(x) + ')');
  x = d({ 'catedra:reviews': J([S('r', 1900, { q: 2 })]) }, { 'catedra:reviews': J([S('r', 1500, { q: 4 })]) }, { 'catedra:reviews': J([S('r', 1900, { q: 2 })]) },
    M.retrato({ 'catedra:reviews': J([S('r', 1, { q: 3 })]) }));
  ok(x.length === 1 && x[0].colisoes.nuvem === 1 && x[0].colisoes.local === 0, R + 'lista: colisão em que a versão da nuvem ficou → colisoes.nuvem');
  // …mas o item que só UM lado mudou não é colisão: o merge levou a mudança adiante
  x = d({ 'catedra:sessions': J([S('a', 1500, { min: 45 }), S('b', 1)]) }, { 'catedra:sessions': J([S('a', 1), S('b', 1), S('d', 3000)]) },
    { 'catedra:sessions': J([S('a', 1500, { min: 45 }), S('b', 1), S('d', 3000)]) });
  ok(x.length === 1 && x[0].unidas === true && x[0].colisoes.local + x[0].colisoes.nuvem === 0, R + 'lista: item mudado só na nuvem + item novo daqui → unidas, sem colisão');
  // (6) lápide: a revisão apagada aqui tinha mudado no outro aparelho depois da base; a exclusão valeu
  x = d({ 'catedra:reviews': J([S('r', 1900), S('s', 1)]) }, { 'catedra:reviews': J([S('s', 1), S('t', 2000)]) }, { 'catedra:reviews': J([S('s', 1), S('t', 2000)]) },
    M.retrato({ 'catedra:reviews': J([S('r', 1), S('s', 1)]) }));
  ok(x.length === 1 && x[0].lapides === 1, R + 'lista: item mudado lá e apagado aqui, a lápide segurou → lapides 1 (' + J(x) + ')');
  // …e a exclusão que só chega (o item não mudou lá desde a base) não é conflito
  x = d({ 'catedra:reviews': J([S('r', 1), S('s', 1), S('u', 2500)]) }, { 'catedra:reviews': J([S('s', 1), S('t', 2000)]) }, { 'catedra:reviews': J([S('s', 1), S('t', 2000), S('u', 2500)]) },
    M.retrato({ 'catedra:reviews': J([S('r', 1), S('s', 1)]) }));
  ok(x.length === 1 && x[0].lapides === 0 && x[0].unidas === true, R + 'lista: exclusão daqui de item que não mudou lá não conta como lápide em conflito');
  // (7) só a NUVEM mudou a lista, apagando um item que continuava aqui: a união o trouxe de volta
  const baseRev = M.retrato({ 'catedra:reviews': J([S('a', 1), S('b', 1)]) });
  x = d({ 'catedra:reviews': J([S('a', 1)]) }, { 'catedra:reviews': J([S('a', 1), S('b', 1)]) }, { 'catedra:reviews': J([S('a', 1), S('b', 1)]) }, baseRev);
  ok(x.length === 1 && x[0].restaurados === 1 && J(x[0].idsVolta) === J(['b']) && M.temPerda({ itens: x }), R + 'lista: apagado no outro aparelho e devolvido pela união → restaurados 1, com o id (' + J(x) + ')');
  ok(d({ 'catedra:reviews': J([S('a', 1), S('b', 1), S('c', 2000)]) }, { 'catedra:reviews': J([S('a', 1), S('b', 1)]) },
    { 'catedra:reviews': J([S('a', 1), S('b', 1), S('c', 2000)]) }, baseRev).length === 0, R + 'lista que só a nuvem mudou, sem nada desfeito: nada a descrever');
  // a exclusão daqui segurou o item que o outro aparelho reenviou: só é conflito se ele o MUDOU depois da base
  const baseSo = M.retrato({ 'catedra:reviews': J([S('a', 1)]) });
  ok(d({ 'catedra:reviews': J([S('a', 1), S('r', 5)]) }, { 'catedra:reviews': J([S('a', 1)]) }, { 'catedra:reviews': J([S('a', 1)]) }, baseSo).length === 0,
    R + 'lista: cópia velha reenviada pelo outro aparelho e segurada pela lápide daqui → só a exclusão chegando, nada a descrever');
  x = d({ 'catedra:reviews': J([S('a', 1), S('r', 1800)]) }, { 'catedra:reviews': J([S('a', 1)]) }, { 'catedra:reviews': J([S('a', 1)]) }, baseSo);
  ok(x.length === 1 && x[0].lapides === 1 && !x[0].restaurados, R + 'lista: o outro aparelho MUDOU o item que a exclusão daqui segurou → lápide em conflito');
  // o item que a união devolve a cada ida e volta é avisado uma vez só
  const volta = d({ 'catedra:reviews': J([S('a', 1)]) }, { 'catedra:reviews': J([S('a', 1), S('b', 1)]) }, { 'catedra:reviews': J([S('a', 1), S('b', 1)]) }, baseRev);
  ok(M.semRepetir(volta, [{ ts: 1, itens: volta }]).length === 0 && J(M.semRepetir(volta, [])) === J(volta),
    R + 'aviso repetido: o mesmo item devolvido de novo não vira outro aviso; um item novo, sim');
  const misto = [{ k: 'catedra:reviews', lado: 'uniao', unidas: true, colisoes: { local: 0, nuvem: 0 }, lapides: 0, restaurados: 2, idsVolta: ['b', 'c'] }, { k: 'catedra:edital', lado: 'local' }];
  const sr = M.semRepetir(misto, [{ ts: 1, itens: [{ k: 'catedra:reviews', idsVolta: ['b'] }] }]);
  ok(sr.length === 2 && sr[0].restaurados === 1 && J(sr[0].idsVolta) === J(['c']) && sr[1].lado === 'local' && misto[0].restaurados === 2,
    R + 'aviso repetido: só o que já foi contado sai; o resto do aviso fica (e a entrada não é alterada)');
  // (8) lápide de chave: apagada aqui, mudada lá, o merge não a trouxe
  x = d({ 'catedra:prova': '"2027-01-10"' }, {}, {});
  ok(x.length === 1 && x[0].k === 'catedra:prova' && x[0].lado === 'lapide', R + 'lápide de chave: apagada aqui, mudada lá, o merge não trouxe → lado "lapide"');
  x = d({ 'catedra:prova': '"2027-01-10"' }, {}, { 'catedra:prova': '"2027-01-10"' });
  ok(x.length === 1 && x[0].lado === 'nuvem', R + 'lápide vencida pelo valor mais novo da nuvem → lado "nuvem"');
  // (9) só um lado mudou, ou os dois chegaram ao mesmo valor: nada a descrever
  ok(d({ 'catedra:edital': E1 }, { 'catedra:edital': E0 }, { 'catedra:edital': E1 }).length === 0, R + 'só a nuvem mudou: nada a descrever');
  ok(d({ 'catedra:edital': E0 }, { 'catedra:edital': E2 }, { 'catedra:edital': E2 }).length === 0, R + 'só este aparelho mudou: nada a descrever');
  ok(d({ 'catedra:edital': E1 }, { 'catedra:edital': E1 }, { 'catedra:edital': E1 }).length === 0, R + 'os dois chegaram ao mesmo valor: nada a descrever');
  ok(d({ 'catedra:edital': E1 }, { 'catedra:edital': E2 }, { 'catedra:edital': E2 }, null).length === 0, R + 'sem base da última sincronização, nada é descrito');
  ok(M.descrever({ nuvem: { 'catedra:metas': J([S('m', 1)]) }, local: { 'catedra:metas': '' }, mesclado: { 'catedra:metas': J([S('m', 1)]) }, base: {}, baseTs: BT, listas: { 'catedra:metas': true } }).length === 0,
    R + 'o vazio que o app semeia não conta como mudança deste aparelho');
  // por que o auth.js só usa a base enquanto ela é a do _lastSrv: o Sair esvazia o aparelho, e com a base de
  // antes o vazio da limpeza pareceria mudança deste lado (o navegador prova a trava no caso (d))
  ok(d({ 'catedra:edital': E1 }, {}, { 'catedra:edital': E1 }).length === 1,
    R + 'com a base de antes do Sair, a limpeza pareceria mudança — por isso o auth.js descarta a base sem _lastSrv');
  // (10) manutenção: o app regrava sozinho em cada aparelho — também no ciclo de outro concurso (#ed-…)
  ok(d({ 'catedra:blocksDate': '"2026-11-25"' }, { 'catedra:blocksDate': '"2026-11-26"' }, { 'catedra:blocksDate': '"2026-11-26"' }).length === 0, R + 'chave de manutenção (blocksDate) não vira aviso');
  ok(M.rotulo('catedra:blocks#ed-123') === null && M.rotulo('catedra:rotPointer@saude#ed-9') === null && M.rotulo('catedra:blocksDate#ed-1') === null,
    R + 'o ciclo de outro concurso (#ed-…) segue a lista de manutenção');
  ok(M.descrever({ nuvem: { 'catedra:blocks#ed-1': J([{ d: 'Civil' }]) }, local: { 'catedra:blocks#ed-1': J([{ d: 'Penal' }]) }, mesclado: { 'catedra:blocks#ed-1': J([{ d: 'Penal' }]) },
    base: M.retrato({ 'catedra:blocks#ed-1': J([{ d: 'Processo' }]) }), baseTs: BT, listas: {} }).length === 0, R + 'os blocos do dia de outro concurso não viram aviso');
  ok(J(M.rotulo('catedra:cicloVolta#ed-123')) === J({ t: 'o ciclo', pl: false, area: '', concurso: 'ed-123' }), R + 'o ciclo de outro concurso tem nome (não vira "outros dados")');
  ok(M.rotulo('catedra:dark') === null && M.rotulo('catedra:_kts') === null && M.rotulo('catedra:_lastErr') === null && M.rotulo('catedra:sessionsLixeira') === null,
    R + 'tema deste aparelho, meta-estado "_" e a lixeira das sessões não viram aviso');
  // (11) hábitos zerados na virada do dia: perder para eles (ou para o dia que já virou) não perde nada da pessoa
  const H = o => J(Object.assign({ sono: 0, agua: 0, exercicio: 0, pausas: 0, alongar: 0, sol: 0 }, o));
  const baseH = M.retrato({ 'catedra:habitos': H({ agua: 3, _date: '2026-11-24' }) });
  const dh = (nv, lc, mg) => M.descrever({ nuvem: { 'catedra:habitos': nv }, local: { 'catedra:habitos': lc }, mesclado: { 'catedra:habitos': mg }, base: baseH, baseTs: BT, listas: {} });
  ok(dh(H({ _date: '2026-11-25' }), H({ agua: 1, _date: '2026-11-25' }), H({ agua: 1, _date: '2026-11-25' })).length === 0,
    R + 'hábitos: a nuvem só zerou o dia e ficou o registro daqui → nada a descrever');
  x = dh(H({ agua: 2, _date: '2026-11-25' }), H({ _date: '2026-11-25' }), H({ _date: '2026-11-25' }));
  ok(x.length === 1 && x[0].lado === 'local', R + 'hábitos: o zerado daqui venceu o registro da nuvem → isso SIM é perda e é descrito');
  ok(dh(H({ _date: '2026-11-26' }), H({ agua: 2, _date: '2026-11-25' }), H({ _date: '2026-11-26' })).length === 0, R + 'hábitos de um dia que já virou não contam como perda');
  // o descrever só LÊ: as entradas saem intactas
  const ent = { nuvem: { 'catedra:edital': E1 }, local: { 'catedra:edital': E2 }, mesclado: { 'catedra:edital': E2 }, base, baseTs: BT, listas: L };
  const antes = J(ent); M.descrever(ent);
  ok(J(ent) === antes, R + 'descrever não altera nuvem, local, mesclado nem a base');

  // linhagem: a versão e as de antes, só quando o carimbo nasceu com ela
  ok(J(M.linhagem(5000, J({ id: 'x', ts: 5000, prev: [4000, 3000] }))) === J([5000, 4000, 3000]), R + 'linhagem: a versão e as anteriores do próprio carimbo');
  ok(J(M.linhagem(5000, J({ id: 'x', ts: 4000, prev: [3000] }))) === J([5000]) && J(M.linhagem(5000, null)) === J([5000]) && J(M.linhagem(0, null)) === J([]),
    R + 'linhagem: carimbo velho (de outra versão, reenviado por app antigo) não conta');
  ok(M.linhagem(9, J({ ts: 9, prev: [8, 7, 6, 5, 4, 3, 2, 1, 0.5] })).length === 8, R + 'linhagem: no máximo 8 versões');
  const conf = { ts: 1000, chaves: { a: '1' } }, p1 = { ts: 2000, chaves: { a: '2' } }, p2 = { ts: 3000, chaves: { a: '3' } };
  let eb = M.escolherBase(conf, [p2, p1], [5000, 2000, 1000]);
  ok(eb.base === p1 && eb.aplicadas.length === 1 && eb.aplicadas[0] === p1, R + 'base: a gravação pendente que a linhagem mostra ter chegado vira a base');
  eb = M.escolherBase(conf, [p2, p1], [5000, 3000, 2000, 1000]);
  ok(eb.base === p2 && eb.aplicadas.length === 2, R + 'base: com duas que chegaram, a mais nova');
  eb = M.escolherBase(conf, [p2, p1], [5000, 1000]);
  ok(eb.base === conf && !eb.aplicadas.length, R + 'base: nenhuma pendente chegou → a confirmada');
  ok(M.escolherBase(null, [], [5000]).base === null, R + 'base: sem confirmada e sem pendente, nenhuma');
  // a lista de pendentes guarda as duas mais novas e, à parte, a mais nova que a linhagem já mostrou ter
  // chegado: ela é a base até a nuvem confirmar outra versão (resposta perdida + duas gravações recusadas)
  const w = (ts, chegou) => (chegou ? { ts, chaves: { a: String(ts) }, chegou: 1 } : { ts, chaves: { a: String(ts) } });
  const w1 = w(1500, true), w2 = w(2000), w3 = w(3000), w4 = w(4000);
  ok(J(M.aparar([w4, w3, w2, w1]).map(p => p.ts)) === J([4000, 3000, 1500]), R + 'pendentes: as duas mais novas e a que já chegou, mesmo mais velha');
  ok(J(M.aparar([w4, w3, w(1500)]).map(p => p.ts)) === J([4000, 3000]), R + 'pendentes: sem nenhuma que chegou, só as duas mais novas');
  ok(J(M.aparar([w(3000), w(2000, true), w(1500, true)]).map(p => p.ts)) === J([3000, 2000]),
    R + 'pendentes: a que chegou já entre as duas mais novas não se repete, e a mais velha que chegou sai');
  ok(M.aparar(null).length === 0 && M.aparar([null, { ts: 0 }]).length === 0, R + 'pendentes: lista vazia ou inválida → nenhuma');
  eb = M.escolherBase(conf, M.aparar([w4, w3, w2, w1]), [1500, 1000]);
  ok(eb.base === w1, R + 'base: a gravação que chegou continua sendo a base depois de duas recusadas');

  // nomes das chaves: área no sufixo, listas e famílias
  ok(J(M.rotulo('catedra:edital@saude')) === J({ t: 'o edital', pl: false, area: 'saude', concurso: '' }), R + 'a área no sufixo (@saude) não muda o nome');
  ok(M.rotulo('catedra:hl').lista === 'grifos' && M.rotulo('catedra:grifos:cf88').t === 'os grifos do CátedraLEGIS' && M.rotulo('catedra:qualquerCoisa').outros === true,
    R + 'hl são os grifos; família por prefixo; "outros dados" para o resto');

  // textos — relógio fixo construído no fuso local (o teste vale em qualquer fuso)
  const agora = new Date(2026, 10, 25, 9, 0).getTime();
  const as841 = new Date(2026, 10, 25, 8, 41).getTime();
  const ontem = new Date(2026, 10, 24, 22, 10).getTime();
  ok(M.quandoFoi(as841, agora) === 'hoje às 08:41' && M.quandoFoi(ontem, agora) === 'ontem às 22:10', R + 'quando: "hoje às 08:41" e "ontem às 22:10"');
  ok(M.quandoFoi(new Date(2026, 10, 20, 7, 5).getTime(), agora) === '20/11 às 07:05' && M.quandoFoi(new Date(2025, 11, 31, 23, 59).getTime(), agora) === '31/12/2025 às 23:59', R + 'quando: data curta, com o ano só se for outro');
  const UNIAO = { k: 'catedra:sessions', lado: 'uniao', unidas: true, colisoes: { local: 0, nuvem: 0 }, lapides: 0 };
  const rel = { ts: as841, itens: [{ k: 'catedra:edital', lado: 'local' }, UNIAO] };
  const tx = M.textoConflito(rel, agora);
  ok(tx === 'Na sincronização de hoje às 08:41, o edital mudou nos dois aparelhos; ficou a versão deste aparelho. As listas de sessões foram unidas.', R + 'aviso no texto do pedido (' + tx + ')');
  const tN = M.textoConflito({ ts: as841, itens: [{ k: 'catedra:edital', lado: 'nuvem' }], outro: 'app do iPad' }, agora, { meuNome: 'app do Mac' });
  ok(tN === 'Na sincronização de hoje às 08:41, o edital mudou nos dois aparelhos; ficou a versão do app do iPad.', R + 'o que ficou da nuvem diz QUAL aparelho gravou (' + tN + ')');
  ok(/ficou a versão do app do Mac \(outro aparelho\)\.$/.test(M.textoConflito({ ts: as841, itens: [{ k: 'catedra:edital', lado: 'nuvem' }], outro: 'app do Mac' }, agora, { meuNome: 'app do Mac' }))
    && /ficou a versão da nuvem\.$/.test(M.textoConflito({ ts: as841, itens: [{ k: 'catedra:edital', lado: 'nuvem' }] }, agora)),
    R + 'outro aparelho com o mesmo nome diz "(outro aparelho)"; sem carimbo, "da nuvem"');
  const tU = M.textoConflito({ ts: as841, itens: [UNIAO] }, agora);
  ok(tU === 'Na sincronização de hoje às 08:41, as listas de sessões foram unidas; nada se perdeu.', R + 'lista só unida: diz que nada se perdeu (' + tU + ')');
  const tC = M.textoConflito({ ts: as841, outro: 'app do iPad', itens: [
    { k: 'catedra:sessions', lado: 'uniao', unidas: true, colisoes: { local: 0, nuvem: 2 }, lapides: 0 },
    { k: 'catedra:reviews', lado: 'uniao', unidas: false, colisoes: { local: 1, nuvem: 0 }, lapides: 1 },
    { k: 'catedra:fc', lado: 'uniao', unidas: false, colisoes: { local: 0, nuvem: 0 }, lapides: 0, restaurados: 2 }] }, agora);
  ok(tC === 'Na sincronização de hoje às 08:41, as listas de sessões foram unidas. 2 sessões mudaram nos dois aparelhos; ficou a versão do app do iPad. Uma revisão mudou nos dois aparelhos; ficou a versão deste aparelho. Uma revisão apagada neste aparelho tinha mudado no outro; valeu a exclusão. 2 flashcards apagados no outro aparelho voltaram, porque continuavam neste.',
    R + 'listas: colisão, lápide e item que voltou, cada um na lista certa (' + tC + ')');
  const tx2 = M.textoConflito({ ts: ontem, itens: [{ k: 'catedra:prefs', lado: 'nuvem' }, { k: 'catedra:prova', lado: 'lapide' }, UNIAO,
    Object.assign({}, UNIAO, { k: 'catedra:reviews' }), { k: 'catedra:fooBar', lado: 'local' }] }, agora);
  ok(tx2 === 'Na sincronização de ontem às 22:10, as preferências mudaram nos dois aparelhos; ficou a versão da nuvem. Para a data da prova, valeu a exclusão feita neste aparelho. As listas de sessões e de revisões foram unidas. Outros dados também mudaram nos dois aparelhos; ficou a versão deste aparelho.',
    R + 'aviso com plural, lápide de chave, listas e outros dados (' + tx2 + ')');
  const tx3 = M.textoConflito({ ts: as841, itens: [{ k: 'catedra:cicloVolta', lado: 'local' }, { k: 'catedra:manualRot', lado: 'nuvem' }, { k: 'catedra:edital', lado: 'nuvem' }, { k: 'catedra:prova', lado: 'nuvem' }] }, agora);
  ok(tx3 === 'Na sincronização de hoje às 08:41, o edital e a data da prova mudaram nos dois aparelhos; ficou a versão da nuvem. O ciclo mudou nos dois aparelhos; ficou uma parte de cada versão.', R + 'nome repetido com desfechos diferentes vira "uma parte de cada versão" (' + tx3 + ')');
  const nomeArea = a => ({ juridica: 'Jurídica', saude: 'Saúde e Medicina' })[a];
  const tA = M.textoConflito({ ts: as841, itens: [{ k: 'catedra:edital', lado: 'local' }, { k: 'catedra:edital@saude', lado: 'nuvem' }] }, agora, { nomeArea });
  ok(tA === 'Na sincronização de hoje às 08:41, o edital (Jurídica) mudou nos dois aparelhos; ficou a versão deste aparelho. O edital (Saúde e Medicina) mudou nos dois aparelhos; ficou a versão da nuvem.',
    R + 'o edital de duas áreas são dois: cada um com a sua área e o seu desfecho (' + tA + ')');
  const tK = M.textoConflito({ ts: as841, itens: [{ k: 'catedra:cicloVolta', lado: 'local' }, { k: 'catedra:cicloVolta#ed-7', lado: 'nuvem' }] }, agora);
  ok(tK === 'Na sincronização de hoje às 08:41, o ciclo (concurso principal) mudou nos dois aparelhos; ficou a versão deste aparelho. O ciclo (outro concurso) mudou nos dois aparelhos; ficou a versão da nuvem.',
    R + 'o ciclo do concurso principal e o de outro concurso também se separam (' + tK + ')');
  ok(M.textoConflito({ ts: as841, itens: [{ k: 'catedra:qualquer', lado: 'nuvem' }] }, agora) === 'Na sincronização de hoje às 08:41, alguns dados mudaram nos dois aparelhos; ficou a versão da nuvem.', R + 'só dados sem nome: "alguns dados"');
  ok(M.textoConflito({ ts: as841, itens: [] }, agora) === '' && M.textoConflito(null, agora) === '', R + 'sem itens, sem aviso');
  const varios = M.textoConflitos([{ ts: as841, itens: [{ k: 'catedra:edital', lado: 'local' }] }, { ts: ontem, itens: [UNIAO] }, { ts: ontem - 1, itens: [] }], agora);
  ok(varios.length === 2 && /^Na sincronização de hoje às 08:41/.test(varios[0]) && /^Na sincronização de ontem às 22:10/.test(varios[1]), R + 'vários avisos: um texto por sincronização, do mais novo ao mais velho; o vazio sai');
  // lidos por conta: o "Entendi" de uma conta não esconde o aviso da outra
  const lista = [{ conta: 'u1', ts: 300, itens: [UNIAO] }, { conta: 'u1', ts: 200, itens: [UNIAO] }, { conta: 'u2', ts: 100, itens: [UNIAO] }];
  ok(J(M.naoLidos(lista, { conta: 'u1', ts: 200 }).map(r => r.ts)) === J([300, 100]), R + 'não lidos: só o mais novo da u1 e o da u2 continuam (o "Entendi" vale por conta)');
  ok(M.naoLidos(lista, null).length === 3 && M.naoLidos(lista, { conta: 'u1', ts: 300 }).length === 1, R + 'não lidos: sem "Entendi" todos; depois do mais novo, só os da outra conta');

  // última sincronização: a hora do acerto DESTE aparelho; a gravação na nuvem, à parte
  const as800 = new Date(2026, 10, 25, 8, 0).getTime();
  const U = (o) => Object.assign({ ts: as800, conferido: agora, aparelho: 'Safari no iPad', esteAparelho: false, meuNome: 'Chrome no Mac' }, o);
  ok(M.textoUltima(U(), agora) === 'Última sincronização: hoje às 09:00', R + 'última sincronização: a hora do último acerto deste aparelho, não a da gravação');
  ok(M.textoGravacao(U(), agora) === 'Última gravação na nuvem: hoje às 08:00 · Safari no iPad', R + 'gravação na nuvem: quando e por qual aparelho');
  ok(M.textoGravacao(U({ aparelho: 'Chrome no Mac', esteAparelho: true }), agora) === 'Última gravação na nuvem: hoje às 08:00 · este aparelho', R + 'gravada daqui: "este aparelho"');
  ok(M.textoGravacao(U({ aparelho: 'Chrome no Mac' }), agora) === 'Última gravação na nuvem: hoje às 08:00 · Chrome no Mac (outro aparelho)', R + 'mesmo nome, outro aparelho: diz que é outro');
  ok(M.textoGravacao(U({ aparelho: '' }), agora) === 'Última gravação na nuvem: hoje às 08:00', R + 'sem aparelho conhecido (app antigo), só o horário');
  ok(M.textoUltima(U({ conferido: 0 }), agora) === 'Última sincronização: hoje às 08:00' && M.textoUltima(U({ ts: 0, conferido: as841 }), agora) === 'Última sincronização: hoje às 08:41'
    && M.textoGravacao(U({ ts: 0 }), agora) === '', R + 'sem hora de acerto, a da versão; conta sem linha na nuvem: só o acerto');
  ok(M.textoUltima({ ts: 0, conferido: 0 }, agora) === 'Ainda não houve sincronização com a nuvem neste aparelho.' && M.textoUltima(null, agora) === 'Ainda não houve sincronização com a nuvem neste aparelho.', R + 'sem acerto, avisa que não houve');

  // nome do aparelho
  const UA_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)';
  const UA_SAFARI_MAC = UA_MAC + ' Version/18.0 Safari/605.1.15';
  const UA_CHROME_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  const UA_EDGE_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0';
  const UA_ELECTRON = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) catedra-desktop-win/1.1.0 Chrome/130.0.0.0 Electron/33.0.0 Safari/537.36';
  const n = (ua, protocolo, toques, plataforma, alvo) => M.nomeAparelho({ ua, protocolo, toques, plataforma, alvo });
  ok(n(UA_MAC, 'file:', 0, 'MacIntel') === 'app do Mac', R + 'aparelho: app do Mac (file://, sem toque)');
  ok(n(UA_MAC, 'file:', 5, 'MacIntel') === 'app do iPad', R + 'aparelho: app do iPad (WKWebView se diz Macintosh; o toque denuncia)');
  ok(n(UA_IPHONE, 'file:', 5, 'iPhone') === 'app do iPhone', R + 'aparelho: app do iPhone');
  ok(n(UA_IPHONE, 'https:', 5, 'iPhone') === 'Safari no iPhone', R + 'aparelho: Safari no iPhone');
  ok(n(UA_SAFARI_MAC, 'https:', 5, 'MacIntel') === 'Safari no iPad' && n(UA_SAFARI_MAC, 'https:', 0, 'MacIntel') === 'Safari no Mac', R + 'aparelho: Safari no iPad (modo computador) e no Mac');
  ok(n(UA_CHROME_MAC, 'https:', 0, 'MacIntel') === 'Chrome no Mac' && n(UA_EDGE_WIN, 'https:', 0, 'Win32') === 'Edge no Windows', R + 'aparelho: Chrome no Mac e Edge no Windows');
  ok(n(UA_ELECTRON, 'file:', 0, 'Win32') === 'app do Windows' && n(UA_MAC, 'https:', 0, 'MacIntel', 'macOS') === 'app do Mac', R + 'aparelho: app do Windows (Electron em file://) e o alvo nativo carimbado pelo build');

  // O tests/novidades-central.mjs lê o EXCLUDE do auth.js por /var EXCLUDE = \{[\s\S]*?\};/ — um "};" num
  // comentário dentro dele cortava a leitura antes do catedra:_ultimoEnvio
  const auth = fs.readFileSync(path.join(RAIZ, 'auth.js'), 'utf8');
  const excl = (auth.match(/var EXCLUDE = \{[\s\S]*?\};/) || [''])[0];
  ok(excl.includes("'catedra:_ultimoEnvio': 1") && excl.includes("'catedra:_srvCheio': 1"), R + 'o EXCLUDE do auth.js é lido inteiro (nenhum "};" em comentário corta o catedra:_ultimoEnvio)');
  // o ouvinte do aviso sai na desmontagem, como o vizinho catedra:syncpronto
  const host = fs.readFileSync(path.join(RAIZ, 'Catedra.dc.html'), 'utf8');
  const desmonta = (host.match(/componentWillUnmount\(\)\{[^\n]*/) || [''])[0];
  ok(/removeEventListener\('catedra:syncconflito', this\._onSyncConflito\)/.test(desmonta) && /removeEventListener\('catedra:syncpronto'/.test(desmonta),
    R + 'o host remove o ouvinte de catedra:syncconflito ao desmontar');
}

/* ---- Parte 2: navegador ----
   (A) auth.js de verdade em tests/auth-ipad-fixture.html (Supabase falso preguiçoso, __ct:*), que carrega
       o sync-conflitos.js ANTES do auth.js, como a injeção do build. Cada caso em contexto próprio, relógio
       fixo e semente em base + '/__semente' — por isso só na origem http.
       (a) envio com conflito: carimbo só no corpo, nenhum envio extra em 5 s, descrição e evento; a base
           passa a ser o que SUBIU (a mescla), então o iPad mudar de novo o que ela trouxe não vira aviso;
       (a′) o MESMO caso sem o módulo: o corpo e o aparelho saem iguais, fora o carimbo;
       (b) leitura em que só a nuvem mudou: nada descrito, quem gravou vem do carimbo da nuvem, nenhum envio;
       (b′) base guardada de outra versão que não a do _lastSrv: não vale, nada descrito;
       (c) o PATCH do fechamento leva o carimbo e a linhagem da versão de onde parte;
       (d) base de antes do Sair (sem _lastSrv): nada descrito; carimbo velho de app antigo: sem aparelho;
           e o Sair apaga o que a sincronização observou desta conta;
       (e) corpo vazio não ganha carimbo;
       (f) conflito descoberto na HIDRATAÇÃO (toda abertura do app nativo);
       (h) a leitura sem novidade é a "última sincronização" (a hora do acerto, não a da versão); conflito
           descoberto na LEITURA (volta da rede com edição por subir);
       (i) um aparelho só, resposta perdida: a nuvem tem a gravação daqui — nada de "mudou nos dois", e o
           conflito que aquela gravação descreveu vale uma vez;
       (j) o PATCH do fechamento chegou e o outro aparelho gravou por cima: a linhagem mostra, nada é falso;
       (k) resposta perdida seguida de duas gravações recusadas: a que chegou continua sendo a base, e o
           conflito dela vale uma vez só.
   (B) Catedra.dc.html com CatedraSync simulado: Ajustes › Dados mostram a última sincronização, a gravação
       na nuvem e os avisos não lidos; medidos no iPad (820×1180, toque), no fuso −4 às 21:30 (já 26/11 em
       UTC), claro e escuro; "Entendi" dispensa sem envio, por conta, e sobrevive à reabertura; lista só
       unida vem em tom neutro; um conflito novo volta pelo evento. */
const FIX = '/tests/auth-ipad-fixture.html';
const U1 = { id: 'u1', email: 'lana@exemplo.com' };
const AGORA = new Date('2026-11-25T12:41:00.000Z');
const UPD = '2026-11-25T11:00:00.123+00:00';    // a versão que este aparelho viu por último
const UPD2 = '2026-11-25T12:30:00.456+00:00';   // a nuvem depois que o outro aparelho gravou
const hora = h => Date.parse('2026-11-25T10:00:00Z') + h * 3600e3;
const linha = (data, updated_at) => ({ data: { data, updated_at }, error: null });
const ED0 = J([{ disc: 'Direito Civil', peso: 2, topics: [] }]);
const ED1 = J([{ disc: 'Direito Civil', peso: 3, topics: [] }]);                                     // mudado no outro aparelho
const ED2 = J([{ disc: 'Direito Civil', peso: 2, topics: [{ name: 'Contratos', done: false }] }]);  // mudado aqui
const ED3 = J([{ disc: 'Direito Civil', peso: 2, topics: [{ name: 'Contratos', done: true }] }]);   // mudado aqui de novo
const SA = { id: 'a', up: 1000, min: 30 }, SB = { id: 'b', up: 1000, min: 45 }, SC = { id: 'c', up: 3000, min: 20 }, SD = { id: 'd', up: 4000, min: 50 };
const PROVA0 = J('2026-12-01'), PROVA1 = J('2027-01-10');
const BASE = { 'catedra:edital': ED0, 'catedra:prova': PROVA0, 'catedra:sessions': J([SA, SB]) };
const KTS0 = J({ 'catedra:edital': hora(0), 'catedra:prova': hora(0), 'catedra:sessions': hora(0) });
const IPAD = (ts, prev) => J({ id: 'ipad-1', aparelho: 'app do iPad', ts: Date.parse(ts), prev: prev || [] });
const CHAVES_OBS = ['ct_syncUltima', 'ct_syncRetrato', 'ct_syncPendente', 'ct_syncConflito', 'ct_syncConflitoVisto'];

// lido na página: chamadas ao Supabase falso, o que o aparelho guarda e o que o CatedraSync diz
function lerEstado() {
  const S = window.CatedraSync || {};
  const ultima = typeof S.ultimaSync === 'function' ? S.ultimaSync() : null;   // antes do retrato do storage: cria ct_aparelho
  const conflitos = typeof S.conflitos === 'function' ? S.conflitos() : [];
  const ch = window.__ctChamadas();
  const ls = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i) || ''; if (k.indexOf('catedra:') === 0 || k.indexOf('ct_') === 0) ls[k] = localStorage.getItem(k); }
  return { ups: ch.filter(c => c.nome === 'upsert').map(c => c.arg), selects: ch.filter(c => c.nome === 'select').length,
    ls, eventos: window.__conflitos || [], ultima, conflitos, conflito: conflitos[0] || null };
}

async function casoAuth(browser, base, ok, R, cfg, corpo) {
  const { nome, local, ct, comModulo = true, retratoEm, retratoDe = BASE, hidratar = false } = cfg;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA (sync-ultima-conflito ' + nome + '):', e.message));
  try {
    await page.clock.install({ time: AGORA });
    // sem o módulo: a fixture o pede ao servidor como o build; aqui ele chega vazio
    if (!comModulo) await ctx.route('**/sync-conflitos.js', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    await ctx.addInitScript(() => {
      window.__conflitos = [];
      window.addEventListener('catedra:syncconflito', e => window.__conflitos.push(e.detail));
      // GRAVADOR (como em auth-fechamento): nada vai à rede; o PATCH do fechamento fica em __rep:fetch
      window.fetch = function (u, o) {
        try {
          const l = JSON.parse(localStorage.getItem('__rep:fetch') || '[]');
          l.push({ url: String(u), metodo: (o && o.method) || 'GET', keepalive: !!(o && o.keepalive), corpo: o && typeof o.body === 'string' ? o.body : null });
          localStorage.setItem('__rep:fetch', JSON.stringify(l));
        } catch (_) {}
        return Promise.resolve(new Response(null, { status: 204 }));
      };
    });
    // a base "da última sincronização", calculada aqui pelo mesmo módulo
    const retrato = retratoEm ? { conta: U1.id, ts: Date.parse(retratoEm), chaves: carregar().retrato(retratoDe) } : null;
    await page.goto(base + '/__semente');
    await page.evaluate(({ U1, local, ct, retrato, hidratar }) => {
      localStorage.clear(); sessionStorage.clear();
      localStorage.setItem('__ct:sessao', JSON.stringify(U1));
      localStorage.setItem('__ct:online', '1');
      localStorage.setItem('__ct:chamadas', '[]');
      for (const [k, v] of Object.entries(ct)) localStorage.setItem('__ct:' + k, typeof v === 'string' ? v : JSON.stringify(v));
      localStorage.setItem('catedra:_owner', U1.id);
      for (const [k, v] of Object.entries(local)) localStorage.setItem(k, v);
      if (retrato) localStorage.setItem('ct_syncRetrato', JSON.stringify(retrato));
      localStorage.setItem('catedra:auth', '1');
      if (!hidratar) sessionStorage.setItem('catedra:hydrated', '1');
    }, { U1, local: local || {}, ct: ct || {}, retrato, hidratar });
    const esperar = async (fn, arg, ms = 12000) => {
      const fim = Date.now() + ms;
      while (Date.now() < fim) {
        try { if (await page.evaluate(fn, arg)) return true; } catch (_) {}
        await new Promise(r => setTimeout(r, 100));
      }
      return false;
    };
    await page.goto(base + FIX);
    await esperar(() => typeof window.__ctAuthCb === 'function', null, 6000);
    // o supabase-js de verdade emite INITIAL_SESSION (é dali o token do PATCH do fechamento); o falso não
    if (!hidratar) await page.evaluate(({ U1 }) => window.__ctAuthCb('INITIAL_SESSION', { user: U1, access_token: 'tok-' + U1.id, refresh_token: 'r', expires_at: 4102444800 }), { U1 });
    if (!hidratar) ok(await esperar(() => !!window.CatedraSync && getComputedStyle(document.getElementById('catedra-auth-gate')).display === 'none'),
      R + nome + ' a abertura terminou (portão oculto)');
    await corpo(page, { esperar, ler: () => page.evaluate(lerEstado), ct: (k, v) => page.evaluate(([k, v]) => localStorage.setItem('__ct:' + k, JSON.stringify(v)), [k, v]) });
  } finally { await ctx.close(); }
}

async function testarAuth(browser, base, ok, R) {
  const idDe = ls => { try { return JSON.parse(ls.ct_aparelho).id; } catch (_) { return ''; } };
  const carimboDe = d => { try { return JSON.parse(d['catedra:_ultimoEnvio']); } catch (_) { return null; } };
  // edital: os dois mudaram (o carimbo daqui é mais novo); sessões: cada um acrescentou uma;
  // data da prova: só a nuvem mudou (com carimbo mais novo) — não é conflito
  const local = {
    'catedra:_dirty': '1', 'catedra:_lastSrv': UPD,
    'catedra:edital': ED2, 'catedra:prova': PROVA0, 'catedra:sessions': J([SA, SB, SD]),
    'catedra:_kts': J({ 'catedra:edital': hora(2), 'catedra:prova': hora(0), 'catedra:sessions': hora(2) }) };
  const nuvem = linha({ 'catedra:edital': ED1, 'catedra:prova': PROVA1, 'catedra:sessions': J([SA, SB, SC]),
    'catedra:_kts': J({ 'catedra:edital': hora(1.5), 'catedra:prova': hora(2.3), 'catedra:sessions': hora(2.3) }) }, UPD2);
  const enviou = () => window.__ctChamadas().some(c => c.nome === 'upsert') && !localStorage.getItem('catedra:_dirty');
  const UNIDAS = { k: 'catedra:sessions', lado: 'uniao', unidas: true, colisoes: { local: 0, nuvem: 0 }, lapides: 0 };

  let comMod = null, semMod = null;
  await casoAuth(browser, base, ok, R, { nome: '(a)', local, ct: { select: nuvem }, retratoEm: UPD }, async (page, h) => {
    ok(await h.esperar(enviou), R + '(a) o envio saiu e o sujo foi limpo');
    const antes = await h.ler();
    await page.clock.runFor(5000);   // a janela em que um envio extra apareceria (empurrão de 700 ms, widget de 3 s)
    const s = comMod = await h.ler();
    const up = s.ups[0] || {}, d = up.data || {}, car = carimboDe(d);
    ok(s.ups.length === 1 && s.selects === antes.selects, R + '(a) nenhum envio extra: 1 upsert e nenhuma leitura nova em 5 s (' + s.ups.length + ' upserts)');
    ok(!!car && car.ts === Date.parse(up.updated_at) && car.id === idDe(s.ls) && !!car.aparelho && car.aparelho === (s.ultima && s.ultima.meuNome)
      && J(car.prev) === J([Date.parse(UPD2)]),
      R + '(a) o corpo diz quem gravou: id deste aparelho, nome, ts = updated_at e a versão de onde partiu (' + J(car) + ')');
    ok(!('catedra:_ultimoEnvio' in s.ls), R + '(a) o carimbo nunca vai para o localStorage (não é dado da pessoa)');
    ok(!JSON.parse(s.ls['catedra:_srvCheio'] || '[]').includes('catedra:_ultimoEnvio'), R + '(a) o carimbo fica fora do "vazio nunca apaga cheio" (_srvCheio)');
    const ret = JSON.parse(s.ls.ct_syncRetrato || 'null');
    ok(!!ret && ret.conta === 'u1' && ret.ts === Date.parse(up.updated_at) && !!ret.chaves['catedra:edital'] && !('catedra:_ultimoEnvio' in ret.chaves) && !('ct_syncPendente' in s.ls),
      R + '(a) a base passa a ser a versão gravada (ts = updated_at), sem o carimbo, e nada fica pendente');
    ok(!!s.ultima && s.ultima.ts === Date.parse(up.updated_at) && s.ultima.esteAparelho === true && s.ultima.aparelho === (car && car.aparelho) && s.ultima.conferido >= AGORA.getTime(),
      R + '(a) ultimaSync: a gravação na nuvem é "este aparelho" e o acerto tem hora (' + J(s.ultima) + ')');
    const itens = (s.conflito && s.conflito.itens) || [];
    ok(J(itens) === J([{ k: 'catedra:edital', lado: 'local' }, UNIDAS]),
      R + '(a) conflito descrito: edital (ficou o deste aparelho) e sessões (unidas); a data da prova, que só a nuvem mudou, fica de fora (' + J(itens) + ')');
    ok(s.eventos.length === 1 && J(s.eventos[0].itens) === J(itens) && s.conflito.conta === 'u1' && s.conflitos.length === 1, R + '(a) o evento catedra:syncconflito saiu uma vez, com o mesmo relatório');
    const txt = await page.evaluate(r => window.CT_SYNC_CONFLITOS.textoConflito(r, Date.now()), s.conflito);
    ok(/^Na sincronização de hoje às \d\d:\d\d, o edital mudou nos dois aparelhos; ficou a versão deste aparelho\. As listas de sessões foram unidas\.$/.test(txt),
      R + '(a) o aviso em português claro (' + txt + ')');
    // A base é o que SUBIU (a mescla), não o local de antes dela: a data da prova veio da nuvem nessa mescla…
    const Mn = carregar();
    ok(!!ret && ret.chaves['catedra:prova'] === Mn.hash(PROVA1) && ret.chaves['catedra:edital'] === Mn.hash(ED2) && ret.chaves['catedra:sessions'] === Mn.hash(d['catedra:sessions']),
      R + '(a) a base é o que subiu: a data da prova que a mescla trouxe da nuvem, o edital daqui e as sessões unidas');
    // …e por isso, quando depois só o iPad muda a data da prova de novo, nada vira aviso
    const UPD3 = '2026-11-25T13:10:00.789+00:00', PROVA2 = J('2027-02-15');
    await h.ct('select', linha({ ...d, 'catedra:prova': PROVA2, 'catedra:_kts': J({ ...JSON.parse(d['catedra:_kts'] || '{}'), 'catedra:prova': hora(4) }),
      'catedra:_ultimoEnvio': IPAD(UPD3, [Date.parse(up.updated_at), Date.parse(UPD2)]) }, UPD3));
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    ok(await h.esperar(u => localStorage.getItem('catedra:_lastSrv') === u && window.CatedraSync.status === 'salvo', UPD3), R + '(a) a leitura seguinte trouxe a versão do iPad');
    await page.clock.runFor(1500);
    const s2 = await h.ler();
    ok(s2.ls['catedra:prova'] === PROVA2 && s2.conflitos.length === 1 && s2.eventos.length === 1 && s2.ups.length === 1,
      R + '(a) só o iPad mudou a data da prova desde a gravação daqui: nenhum aviso novo e nenhum envio (' + J(s2.conflitos.map(c => c.itens)) + ')');
  });
  await casoAuth(browser, base, ok, R, { nome: '(a′)', local, ct: { select: nuvem }, comModulo: false }, async (page, h) => {
    ok(await h.esperar(enviou), R + '(a′) sem o módulo, o envio também saiu');
    await page.clock.runFor(5000);
    semMod = await h.ler();
  });
  if (comMod && semMod) {
    const tira = d => { const o = Object.assign({}, d); delete o['catedra:_ultimoEnvio']; return o; };
    const a = tira((comMod.ups[0] || {}).data || {}), b = (semMod.ups[0] || {}).data || {};
    ok(Object.keys(a).length > 0 && J(a) === J(b), R + '(a) o merge é o MESMO com e sem a descrição: o corpo enviado só difere pelo carimbo');
    ok(J(JSON.parse(a['catedra:sessions'] || '[]').map(x => x.id)) === J(['a', 'b', 'c', 'd']) && a['catedra:edital'] === ED2 && a['catedra:prova'] === PROVA1,
      R + '(a) e é o merge de sempre: sessões unidas, edital deste aparelho (carimbo mais novo), data da prova da nuvem');
    const dados = ls => { const o = {}; Object.keys(ls).sort().forEach(k => { if (k.indexOf('catedra:') === 0 && k !== 'catedra:_lastSrv') o[k] = ls[k]; }); return o; };
    ok(J(dados(comMod.ls)) === J(dados(semMod.ls)), R + '(a) o que ficou neste aparelho também é o mesmo (todas as chaves catedra:, fora o _lastSrv)');
    ok(semMod.ups.length === 1 && !('catedra:_ultimoEnvio' in b) && !semMod.conflito && !Object.keys(semMod.ls).some(k => /^ct_sync/.test(k)),
      R + '(a′) sem o módulo, nada de carimbo, de descrição nem de chave ct_sync — o sync segue igual');
  }

  // (b) leitura: só a nuvem mudou o edital, e quem gravou foi o iPad
  await casoAuth(browser, base, ok, R, { nome: '(b)', retratoEm: UPD,
    local: { 'catedra:_lastSrv': UPD, ...BASE, 'catedra:_kts': KTS0 },
    ct: { select: linha({ ...BASE, 'catedra:edital': ED1, 'catedra:_kts': J({ 'catedra:edital': hora(2.3), 'catedra:prova': hora(0), 'catedra:sessions': hora(0) }),
      'catedra:_ultimoEnvio': IPAD(UPD2, [Date.parse(UPD)]) }, UPD2) } }, async (page, h) => {
    ok(await h.esperar(u => localStorage.getItem('catedra:_lastSrv') === u && window.CatedraSync.status === 'salvo', UPD2), R + '(b) a leitura trouxe a versão nova da nuvem');
    await page.clock.runFor(5000);
    const s = await h.ler();
    ok(s.ls['catedra:edital'] === ED1, R + '(b) o merge trouxe o edital mudado no outro aparelho');
    ok(!s.conflito && !s.eventos.length && !('ct_syncConflito' in s.ls), R + '(b) só a nuvem mudou: nenhum conflito descrito');
    ok(!!s.ultima && s.ultima.ts === Date.parse(UPD2) && s.ultima.aparelho === 'app do iPad' && s.ultima.esteAparelho === false && s.ultima.conferido > 0,
      R + '(b) ultimaSync: o horário da versão, o aparelho que a gravou e a hora deste acerto (' + J(s.ultima) + ')');
    ok(!('catedra:_ultimoEnvio' in s.ls), R + '(b) o carimbo que veio da nuvem não entra no localStorage');
    ok(s.ups.length === 0, R + '(b) ler a nuvem com carimbo não dispara envio (' + s.ups.length + ' upserts em 5 s)');
    ok((JSON.parse(s.ls.ct_syncRetrato || 'null') || {}).ts === Date.parse(UPD2), R + '(b) a base acompanha a versão lida');
    // (c) fechamento com pendência: o PATCH condicional também diz quem gravou e de qual versão parte
    await page.evaluate(() => { localStorage.setItem('__rep:fetch', '[]'); localStorage.setItem('catedra:prova', JSON.stringify('2027-02-01')); window.dispatchEvent(new Event('pagehide')); });
    const r = await page.evaluate(() => ({ f: JSON.parse(localStorage.getItem('__rep:fetch') || '[]').filter(x => /\/rest\/v1\/user_data/.test(x.url)), dirty: localStorage.getItem('catedra:_dirty'),
      pend: JSON.parse(localStorage.getItem('ct_syncPendente') || 'null') }));
    const p = r.f[0] || {}; let corpo = null; try { corpo = JSON.parse(p.corpo); } catch (_) {}
    const car = corpo && carimboDe(corpo.data || {});
    ok(r.f.length === 1 && p.metodo === 'PATCH' && p.keepalive === true && /updated_at=eq\./.test(p.url || ''), R + '(c) o fechamento manda um PATCH condicional');
    ok(!!car && car.ts === Date.parse(corpo.updated_at) && car.id === idDe(s.ls) && J(car.prev) === J([Date.parse(UPD2), Date.parse(UPD)]),
      R + '(c) o PATCH leva o carimbo com a linhagem da versão que o filtro exige (' + J(car && car.prev) + ')');
    ok(!!r.pend && r.pend.conta === 'u1' && r.pend.lista.length === 1 && r.pend.lista[0].ts === car.ts, R + '(c) a gravação do fechamento fica pendente (a próxima leitura conta se ela chegou)');
    ok(r.dirty === '1', R + '(c) e o sujo continua: o fechamento nunca o limpa');
  });

  // (b′) a base guardada é de OUTRA versão, não a do _lastSrv (a observação de uma leitura que não firmou a
  // base, por exemplo): não serve. Com ela, o edital pareceria mudado dos dois lados; sem base, nada é descrito
  await casoAuth(browser, base, ok, R, { nome: '(b′)', retratoEm: '2026-11-24T22:00:00.000+00:00', retratoDe: { ...BASE, 'catedra:edital': ED3 },
    local: { 'catedra:_lastSrv': UPD, ...BASE, 'catedra:_kts': KTS0 },
    ct: { select: linha({ ...BASE, 'catedra:edital': ED1, 'catedra:_kts': J({ 'catedra:edital': hora(2.3), 'catedra:prova': hora(0), 'catedra:sessions': hora(0) }),
      'catedra:_ultimoEnvio': IPAD(UPD2, [Date.parse(UPD)]) }, UPD2) } }, async (page, h) => {
    ok(await h.esperar(u => localStorage.getItem('catedra:_lastSrv') === u && window.CatedraSync.status === 'salvo', UPD2), R + '(b′) a leitura trouxe a versão nova da nuvem');
    await page.clock.runFor(1500);
    const s = await h.ler();
    ok(s.ls['catedra:edital'] === ED1 && !s.conflitos.length && !s.eventos.length,
      R + '(b′) base de outra versão que não a do _lastSrv não vale: nada é descrito (' + J(s.conflitos.map(c => c.itens)) + ')');
    ok((JSON.parse(s.ls.ct_syncRetrato || 'null') || {}).ts === Date.parse(UPD2), R + '(b′) e a versão lida passa a ser a base');
  });

  // (d) aparelho esvaziado pelo Sair (sem _lastSrv) com a base de antes: nada é descrito. A versão da nuvem
  // traz um carimbo VELHO (de outra versão, como o que um app antigo guarda e reenvia): sem aparelho.
  await casoAuth(browser, base, ok, R, { nome: '(d)', retratoEm: UPD, local: { 'catedra:sessions': '[]' },
    ct: { select: linha({ ...BASE, 'catedra:edital': ED1, 'catedra:sessions': J([SA, SB, SC]), 'catedra:_ultimoEnvio': IPAD(UPD) }, UPD2) } }, async (page, h) => {
    ok(await h.esperar(u => localStorage.getItem('catedra:_lastSrv') === u, UPD2), R + '(d) a leitura terminou');
    await page.clock.runFor(1500);
    const s = await h.ler();
    ok(s.ls['catedra:edital'] === ED1, R + '(d) o aparelho esvaziado recebeu os dados da nuvem');
    ok(!s.conflito && !s.eventos.length, R + '(d) base de antes do Sair (sem _lastSrv): o vazio da limpeza não vira "conflito"');
    ok(!!s.ultima && s.ultima.ts === Date.parse(UPD2) && s.ultima.aparelho === '' && s.ultima.esteAparelho === false,
      R + '(d) carimbo de outra versão (app antigo reenviando o que guardou): a versão fica sem aparelho conhecido (' + J(s.ultima) + ')');
    const g = await page.evaluate(u => window.CT_SYNC_CONFLITOS.textoGravacao(u, Date.now()), s.ultima);
    ok(/^Última gravação na nuvem: hoje às \d\d:\d\d$/.test(g), R + '(d) e o texto mostra só o horário (' + g + ')');
    // o Sair apaga o que a sincronização observou desta conta (o retrato deriva do conteúdo dela)
    await page.evaluate(() => { localStorage.setItem('ct_syncConflitoVisto', JSON.stringify({ conta: 'u1', ts: 1 })); localStorage.setItem('ct_syncConflito', JSON.stringify({ conta: 'u1', lista: [] })); });
    const tinha = await page.evaluate(ks => ks.filter(k => localStorage.getItem(k) != null), CHAVES_OBS);
    await page.evaluate(() => localStorage.removeItem('catedra:auth'));   // o "Sair" do app
    ok(await h.esperar(ks => !ks.some(k => localStorage.getItem(k) != null) && !localStorage.getItem('catedra:edital'), CHAVES_OBS),
      R + '(d) o Sair apaga ct_syncUltima, ct_syncRetrato, ct_syncConflito e ct_syncConflitoVisto junto com os dados (' + J(tinha) + ' existiam)');
    // o Sair recarrega a página logo depois de limpar: a leitura tolera a navegação
    ok(await h.esperar(() => !!localStorage.getItem('ct_aparelho'), null, 3000), R + '(d) a identidade do aparelho (ct_aparelho) fica: é do aparelho, não da conta');
  });

  // (e) corpo sem dado nenhum: nada de carimbo
  await casoAuth(browser, base, ok, R, { nome: '(e)', local: { 'catedra:_dirty': '1', 'catedra:_lastSrv': UPD }, ct: { select: linha({}, UPD) } }, async (page, h) => {
    ok(await h.esperar(() => window.__ctChamadas().some(c => c.nome === 'upsert')), R + '(e) o envio saiu');
    const d = ((await h.ler()).ups[0] || {}).data;
    ok(!!d && Object.keys(d).length === 0, R + '(e) corpo sem dado não ganha carimbo: a linha não passa a "ter conteúdo" por causa dele (' + J(d) + ')');
  });

  // (f) HIDRATAÇÃO (toda abertura do app nativo): o iPad mudou o edital depois, com carimbo mais novo
  await casoAuth(browser, base, ok, R, { nome: '(f)', retratoEm: UPD, hidratar: true,
    local: { 'catedra:_lastSrv': UPD, 'catedra:_dirty': '1', ...BASE, 'catedra:edital': ED2, 'catedra:_kts': J({ 'catedra:edital': hora(1), 'catedra:prova': hora(0), 'catedra:sessions': hora(0) }) },
    ct: { select: linha({ ...BASE, 'catedra:edital': ED1, 'catedra:_kts': J({ 'catedra:edital': hora(2), 'catedra:prova': hora(0), 'catedra:sessions': hora(0) }),
      'catedra:_ultimoEnvio': IPAD(UPD2, [Date.parse(UPD)]) }, UPD2) } }, async (page, h) => {
    // A hidratação grava o hydrated e recarrega em seguida: na página de ANTES do reload o hydrated, o
    // _lastSrv (semeado) e o CatedraSync já existem. Só o portão oculto prova que é a página nova — sem
    // ele, a leitura seguinte caía no meio da navegação ("Execution context was destroyed", WebKit).
    ok(await h.esperar(() => sessionStorage.getItem('catedra:hydrated') === '1' && !!window.CatedraSync && localStorage.getItem('catedra:_lastSrv') !== null
      && getComputedStyle(document.getElementById('catedra-auth-gate')).display === 'none', null, 20000),
      R + '(f) a hidratação terminou (recarregou com hydrated e o portão sumiu)');
    await page.clock.runFor(1500);
    const c = await page.evaluate(() => JSON.parse(localStorage.getItem('ct_syncConflito') || 'null'));
    const l = (c && c.lista) || [];
    ok(c && c.conta === 'u1' && l.length === 1 && J(l[0].itens) === J([{ k: 'catedra:edital', lado: 'nuvem' }]) && l[0].outro === 'app do iPad',
      R + '(f) o conflito descoberto na hidratação fica guardado para os Ajustes, com o aparelho que gravou a nuvem (' + J(c) + ')');
    ok(await page.evaluate(e => localStorage.getItem('catedra:edital') === e, ED1), R + '(f) e o merge é o de sempre: ficou o edital mais novo, o do iPad');
    const txt = await page.evaluate(r => window.CT_SYNC_CONFLITOS.textoConflito(r, Date.now()), l[0] || null);
    ok(/^Na sincronização de hoje às \d\d:\d\d, o edital mudou nos dois aparelhos; ficou a versão do app do iPad\.$/.test(txt), R + '(f) o aviso diz qual aparelho ganhou (' + txt + ')');
  });

  // (h) LEITURA com edição por subir: a rede volta e a nuvem mudou o mesmo edital no iPad
  await casoAuth(browser, base, ok, R, { nome: '(h)', retratoEm: UPD, local: { 'catedra:_lastSrv': UPD, ...BASE, 'catedra:_kts': KTS0 },
    ct: { select: linha(BASE, UPD) } }, async (page, h) => {
    ok(await h.esperar(() => window.CatedraSync.status === 'salvo' && !!localStorage.getItem('ct_syncUltima')), R + '(h) a leitura da abertura não achou nada novo');
    // "Última sincronização" é a hora DESTE acerto, não a da versão da nuvem (gravada às 11:00): a leitura
    // sem novidade conta como acerto, e outra, mais tarde, a avança
    let u = (await h.ler()).ultima;
    ok(!!u && u.ts === Date.parse(UPD) && u.conferido >= AGORA.getTime(),
      R + '(h) leitura sem novidade: a última sincronização é a hora do acerto, não a da versão (' + (u ? new Date(u.conferido).toISOString() + ' × ' + new Date(u.ts).toISOString() : '—') + ')');
    const c0 = u ? u.conferido : 0;
    await page.clock.runFor(65000);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    ok(await h.esperar(c => window.CatedraSync.ultimaSync().conferido >= c + 60000 && window.CatedraSync.status === 'salvo', c0),
      R + '(h) outra leitura sem novidade, 65 s depois, avança a hora do acerto');
    u = (await h.ler()).ultima;
    ok(u.ts === Date.parse(UPD) && u.aparelho === '' && u.esteAparelho === false, R + '(h) e a gravação na nuvem continua a mesma (' + J(u) + ')');
    await page.evaluate(e => localStorage.setItem('catedra:edital', e), ED2);   // edição da pessoa (o envio espera 700 ms)
    await h.ct('select', linha({ ...BASE, 'catedra:edital': ED1, 'catedra:_kts': J({ 'catedra:edital': hora(3), 'catedra:prova': hora(0), 'catedra:sessions': hora(0) }),
      'catedra:_ultimoEnvio': IPAD(UPD2, [Date.parse(UPD)]) }, UPD2));
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    ok(await h.esperar(u => localStorage.getItem('catedra:_lastSrv') !== u && !localStorage.getItem('catedra:_dirty'), UPD), R + '(h) a leitura mesclou e o envio seguinte subiu');
    await page.clock.runFor(5000);
    const s = await h.ler();
    ok(s.conflitos.length === 1 && J(s.conflitos[0].itens) === J([{ k: 'catedra:edital', lado: 'nuvem' }]) && s.conflitos[0].outro === 'app do iPad' && s.eventos.length === 1,
      R + '(h) o conflito da leitura é descrito uma vez (o envio que veio depois não repete) (' + J(s.conflitos) + ')');
    ok(s.ls['catedra:edital'] === ED1, R + '(h) e o merge é o de sempre: a edição mais nova (a do iPad) ficou');
  });

  // (i) UM aparelho só: a gravação chega à nuvem, a resposta se perde, a pessoa segue editando
  await casoAuth(browser, base, ok, R, { nome: '(i)', retratoEm: UPD, local: { 'catedra:_lastSrv': UPD, ...BASE, 'catedra:_kts': KTS0 },
    ct: { select: linha(BASE, UPD) } }, async (page, h) => {
    ok(await h.esperar(() => window.CatedraSync.status === 'salvo' && !!localStorage.getItem('ct_syncUltima')), R + '(i) a abertura acertou com a nuvem');
    // o iPad tinha mudado o edital (carimbo mais velho que a edição daqui): a 1ª gravação descreve um conflito
    await h.ct('select', linha({ ...BASE, 'catedra:edital': ED1, 'catedra:_kts': J({ 'catedra:edital': hora(2), 'catedra:prova': hora(0), 'catedra:sessions': hora(0) }),
      'catedra:_ultimoEnvio': IPAD(UPD2, [Date.parse(UPD)]) }, UPD2));
    await h.ct('upsert', { data: null, error: { message: 'Failed to fetch' } });   // a resposta se perde…
    await page.evaluate(e => localStorage.setItem('catedra:edital', e), ED2);
    await page.clock.runFor(800);
    ok(await h.esperar(() => window.__ctChamadas().filter(c => c.nome === 'upsert').length === 1 && window.CatedraSync.status === 'erro'), R + '(i) a 1ª gravação "falhou" (resposta perdida)');
    // …mas ela chegou: a nuvem agora é a versão que ESTE aparelho gravou
    await page.evaluate(() => { const up = window.__ctChamadas().filter(c => c.nome === 'upsert')[0].arg;
      localStorage.setItem('__ct:select', JSON.stringify({ data: { data: up.data, updated_at: up.updated_at }, error: null }));
      localStorage.setItem('__ct:upsert', JSON.stringify({ data: null, error: null })); });
    const ev0 = (await h.ler()).eventos.length;
    await page.evaluate(e => localStorage.setItem('catedra:edital', e), ED3);   // a pessoa segue editando
    await page.clock.runFor(800);
    ok(await h.esperar(() => window.__ctChamadas().filter(c => c.nome === 'upsert').length === 2 && !localStorage.getItem('catedra:_dirty')), R + '(i) a 2ª gravação saiu');
    await page.clock.runFor(5000);
    const s = await h.ler();
    const t1 = Date.parse(s.ups[0].updated_at);
    ok(ev0 === 0, R + '(i) a gravação sem confirmação não avisou nada ainda');
    ok(s.conflitos.length === 1 && s.conflitos[0].ts === t1 && J(s.conflitos[0].itens) === J([{ k: 'catedra:edital', lado: 'local' }]) && s.eventos.length === 1,
      R + '(i) a nuvem tem a gravação daqui: o conflito com o iPad que ELA descreveu vale (uma vez), e nada de "mudou nos dois aparelhos" consigo mesmo (' + J(s.conflitos) + ')');
    ok(s.ls['catedra:edital'] === ED3 && J(JSON.parse(s.ups[1].data['catedra:_ultimoEnvio']).prev.slice(0, 1)) === J([t1]),
      R + '(i) a 2ª gravação leva a edição nova e parte da 1ª (linhagem)');
    ok(!('ct_syncPendente' in s.ls), R + '(i) confirmada a 2ª, nada fica pendente');
  });

  // (j) o PATCH do fechamento CHEGOU e o iPad gravou por cima depois de lê-lo: nada é conflito
  await casoAuth(browser, base, ok, R, { nome: '(j)', retratoEm: UPD, local: { 'catedra:_lastSrv': UPD, ...BASE, 'catedra:_kts': KTS0 },
    ct: { select: linha(BASE, UPD) } }, async (page, h) => {
    ok(await h.esperar(() => window.CatedraSync.status === 'salvo' && !!localStorage.getItem('ct_syncUltima')), R + '(j) a abertura acertou com a nuvem');
    await page.evaluate(([e, s]) => { localStorage.setItem('catedra:edital', e); localStorage.setItem('catedra:sessions', s); localStorage.setItem('__rep:fetch', '[]'); window.dispatchEvent(new Event('pagehide')); },
      [ED2, J([SA, SB, { id: 'm', up: Date.now(), min: 25 }])]);
    const patch = await page.evaluate(() => { const f = JSON.parse(localStorage.getItem('__rep:fetch') || '[]').filter(x => x.metodo === 'PATCH')[0]; return f ? JSON.parse(f.corpo) : null; });
    ok(!!patch && !!patch.data['catedra:_ultimoEnvio'], R + '(j) o fechamento mandou o PATCH com o carimbo');
    if (!patch) return;
    // a nuvem aceitou o PATCH; o iPad leu, marcou o tópico como estudado e acrescentou a sessão dele
    const tp = Date.parse(patch.updated_at), UPD3 = '2026-11-25T13:10:00.789+00:00';
    const kts = Object.assign(JSON.parse(patch.data['catedra:_kts'] || '{}'), { 'catedra:edital': hora(4), 'catedra:sessions': hora(4) });
    const vi = Object.assign({}, patch.data, { 'catedra:edital': ED3, 'catedra:sessions': J(JSON.parse(patch.data['catedra:sessions']).concat([{ id: 'i', up: hora(4), min: 15 }])),
      'catedra:_kts': J(kts), 'catedra:_ultimoEnvio': IPAD(UPD3, [tp, Date.parse(UPD)]) });
    await h.ct('select', { data: { data: vi, updated_at: UPD3 }, error: null });
    await page.evaluate(() => window.CatedraSync.push());   // a próxima gravação daqui (relê a nuvem antes)
    await page.clock.runFor(800);
    ok(await h.esperar(() => window.__ctChamadas().some(c => c.nome === 'upsert') && !localStorage.getItem('catedra:_dirty')), R + '(j) a gravação seguinte saiu');
    await page.clock.runFor(5000);
    const s = await h.ler();
    ok(!s.conflitos.length && !s.eventos.length, R + '(j) a linhagem mostra que o PATCH chegou: o iPad mudou DEPOIS de lê-lo, e nada vira "conflito" (' + J(s.conflitos) + ')');
    ok(s.ls['catedra:edital'] === ED3 && J(JSON.parse(s.ls['catedra:sessions']).map(x => x.id)) === J(['a', 'b', 'm', 'i']), R + '(j) e o merge é o de sempre: a marcação do iPad e as duas sessões');
  });

  // (k) UM aparelho só: a resposta da 1ª gravação se perde (ela chegou) e as DUAS seguintes são recusadas sem
  // chegar (a leitura funciona). A que chegou não pode sair da lista de pendentes antes de a nuvem confirmar
  // outra versão: sem ela, a base voltava à de antes e a gravação daqui virava "mudou nos dois aparelhos".
  // E o conflito que ela descreveu vale uma vez só, por mais leituras que a encontrem.
  const ED4 = J([{ disc: 'Direito Civil', peso: 2, topics: [{ name: 'Contratos', done: true }, { name: 'Posse', done: false }] }]);
  const ED5 = J([{ disc: 'Direito Civil', peso: 2, topics: [{ name: 'Contratos', done: true }, { name: 'Posse', done: true }] }]);
  await casoAuth(browser, base, ok, R, { nome: '(k)', retratoEm: UPD, local: { 'catedra:_lastSrv': UPD, ...BASE, 'catedra:_kts': KTS0 },
    ct: { select: linha(BASE, UPD) } }, async (page, h) => {
    ok(await h.esperar(() => window.CatedraSync.status === 'salvo' && !!localStorage.getItem('ct_syncUltima')), R + '(k) a abertura acertou com a nuvem');
    const gravacoes = (n, st) => h.esperar(([n, st]) => window.__ctChamadas().filter(c => c.nome === 'upsert').length === n
      && (st ? window.CatedraSync.status === st : !localStorage.getItem('catedra:_dirty')), [n, st]);
    // a 1ª descreve o conflito com o iPad (que mudou o edital antes), chega à nuvem e a resposta se perde
    await h.ct('select', linha({ ...BASE, 'catedra:edital': ED1, 'catedra:_kts': J({ 'catedra:edital': hora(2), 'catedra:prova': hora(0), 'catedra:sessions': hora(0) }),
      'catedra:_ultimoEnvio': IPAD(UPD2, [Date.parse(UPD)]) }, UPD2));
    await h.ct('upsert', { data: null, error: { message: 'Failed to fetch' } });
    await page.evaluate(e => localStorage.setItem('catedra:edital', e), ED2);
    await page.clock.runFor(800);
    ok(await gravacoes(1, 'erro'), R + '(k) a 1ª gravação "falhou" (resposta perdida)');
    await page.evaluate(() => { const up = window.__ctChamadas().filter(c => c.nome === 'upsert')[0].arg;
      localStorage.setItem('__ct:select', JSON.stringify({ data: { data: up.data, updated_at: up.updated_at }, error: null })); });
    // as duas seguintes são recusadas sem chegar: a nuvem continua com a 1ª
    for (const [i, ed] of [[2, ED3], [3, ED4]]) {
      await page.evaluate(e => localStorage.setItem('catedra:edital', e), ed);
      await page.clock.runFor(800);
      ok(await gravacoes(i, 'erro'), R + '(k) a ' + i + 'ª gravação foi recusada');
    }
    const t1 = Date.parse((await h.ler()).ups[0].updated_at);
    const pend = await page.evaluate(() => ((JSON.parse(localStorage.getItem('ct_syncPendente') || 'null') || {}).lista || []).map(p => ({ ts: p.ts, chegou: !!p.chegou })));
    ok(pend.length === 3 && pend[2].ts === t1 && pend[2].chegou && !pend[0].chegou && !pend[1].chegou,
      R + '(k) pendentes: as duas recusadas e, à parte, a 1ª, que a linhagem mostrou ter chegado (' + J(pend) + ')');
    // a 4ª dá certo
    await h.ct('upsert', { data: null, error: null });
    await page.evaluate(e => localStorage.setItem('catedra:edital', e), ED5);
    await page.clock.runFor(800);
    ok(await gravacoes(4), R + '(k) a 4ª gravação saiu');
    await page.clock.runFor(5000);
    const s = await h.ler();
    ok(s.conflitos.length === 1 && s.conflitos[0].ts === t1 && J(s.conflitos[0].itens) === J([{ k: 'catedra:edital', lado: 'local' }]) && s.eventos.length === 1,
      R + '(k) só o conflito com o iPad, uma vez: a gravação daqui que chegou nunca vira "mudou nos dois aparelhos" (' + J(s.conflitos) + ')');
    ok(s.ls['catedra:edital'] === ED5 && !('ct_syncPendente' in s.ls), R + '(k) a edição mais nova subiu e, confirmada, nada fica pendente');
  });
}

/* ---- (B) Ajustes › Dados e backup ---- */
const lumA = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrasteA = (a, b) => { const x = lumA(a), y = lumA(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
// na página: cor do texto e fundo EFETIVO (as camadas translúcidas compostas até a primeira opaca)
function medirAjustes() {
  const rgb = c => {
    let m = /rgba?\(([^)]+)\)/.exec(c || '');
    if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    m = /color\(srgb ([^)]+)\)/.exec(c || '');
    if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat); return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1]; }
    return null;
  };
  const sobre = (c, f) => [0, 1, 2].map(i => c[i] * c[3] + f[i] * (1 - c[3]));
  const fundo = el => {
    const camadas = []; let opaco = false;
    for (let n = el; n; n = n.parentElement) {
      const c = rgb(getComputedStyle(n).backgroundColor);
      if (c && c[3] > 0) { camadas.push(c); if (c[3] >= 1) { opaco = true; break; } }
    }
    let f = [255, 255, 255];
    for (let i = camadas.length - 1; i >= 0; i--) f = sobre(camadas[i], f);
    return { f, opaco };
  };
  const de = sel => {
    const e = document.querySelector(sel); if (!e) return null;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect(), fu = fundo(e), c = rgb(cs.color) || [0, 0, 0, 1];
    return { cor: sobre(c, fu.f), fundo: fu.f, opaco: fu.opaco, w: r.width, h: r.height, fs: parseFloat(cs.fontSize), corCss: cs.color };
  };
  const caixa = document.querySelector('[data-sync-conflito]');
  // o fundo de aviso do tema, lido de uma sonda no mesmo lugar (claro ou escuro)
  let fundoAviso = '';
  if (caixa) { const s = document.createElement('div'); s.style.background = 'var(--warnSoft)'; caixa.parentElement.appendChild(s); fundoAviso = getComputedStyle(s).backgroundColor; s.remove(); }
  return {
    ultima: de('[data-sync-ultima-txt]'), gravacao: de('[data-sync-gravacao-txt]'), titulo: de('[data-sync-conflito-titulo]'), aviso: de('[data-sync-conflito-txt]'), botao: de('[data-sync-conflito-ok]'),
    textos: [...document.querySelectorAll('[data-sync-conflito-txt]')].map(e => e.textContent.trim()),
    caixa: caixa ? { w: caixa.getBoundingClientRect().width, h: caixa.getBoundingClientRect().height, papel: caixa.getAttribute('role'), perda: caixa.getAttribute('data-perda'),
      fundo: getComputedStyle(caixa).backgroundColor, deAviso: getComputedStyle(caixa).backgroundColor === fundoAviso,
      anim: getComputedStyle(caixa).animationName, transborda: caixa.scrollWidth > caixa.clientWidth + 1 } : null,
    icones: [...document.querySelectorAll('[data-sync-ultima] svg, [data-sync-conflito] svg')].map(s => ({ ico: s.getAttribute('data-ico'), oculto: s.getAttribute('aria-hidden') === 'true', w: Math.round(s.getBoundingClientRect().width) })),
    pagina: document.documentElement.scrollWidth <= innerWidth + 1,
  };
}

async function testarAjustes(browser, base, ok, R) {
  // iPad em retrato, com toque; 25/11/2026 21:30 em Porto Velho (UTC−4) = 26/11 01:30 UTC
  const ctx = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true, timezoneId: 'America/Porto_Velho' });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA (sync-ultima-conflito/ajustes):', e.message));
  try {
    await page.clock.install({ time: new Date('2026-11-26T01:30:00Z') });
    await ctx.addInitScript({ content: FONTE });   // a injeção do build traz o módulo junto do auth.js
    await ctx.addInitScript(() => {
      if (localStorage.getItem('__teste:semSync') === '1') return;
      const ler = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (_) { return null; } };
      window.__pushes = 0;
      window.CatedraSync = {
        pronto: true, get status() { return 'salvo'; }, get carimbo() { const u = ler('__teste:ultima'); return u ? u.ts : 0; },
        push() { window.__pushes++; }, gravarDerivado(k, v) { localStorage.setItem(k, v); },
        ultimaSync() { return ler('__teste:ultima'); }, conflitos() { return ler('__teste:conflitos') || []; },
        ultimoConflito() { return (ler('__teste:conflitos') || [])[0] || null; },
      };
    });
    const semente = async (chaves, limpar = true) => {
      await page.goto(base + '/__semente');
      await page.evaluate(({ chaves, limpar }) => {
        if (limpar) {
          localStorage.clear();
          localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
        }
        for (const [k, v] of Object.entries(chaves)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      }, { chaves, limpar });
    };
    const abrirDados = async () => {
      await page.goto(base + '/Catedra.dc.html');
      await page.waitForFunction(() => typeof window.__catedraGoView === 'function', null, { timeout: 30000 });
      await page.evaluate(() => window.__catedraGoView('ajustes'));
      await page.waitForSelector('button[data-s="dados"]', { timeout: 15000 });
      await page.click('button[data-s="dados"]');
      await page.waitForSelector('[data-aj^="backup"]', { timeout: 10000 });
    };
    const medir = () => page.evaluate(medirAjustes);
    const conferir = (m, tema, icone) => {
      for (const [nome, x] of [['a linha da última sincronização', m.ultima], ['a linha da gravação na nuvem', m.gravacao], ['o título do aviso', m.titulo], ['o texto do aviso', m.aviso], ['o botão Entendi', m.botao]]) {
        const c = x ? contrasteA(x.cor, x.fundo) : 0;
        ok(!!x && x.opaco && c >= 4.5 && x.fs >= 12, R + tema + ': ' + nome + ' tem contraste ≥ 4,5:1 e corpo ≥ 12 px (' + c.toFixed(2) + ', ' + (x ? x.fs : '—') + ' px)');
      }
      ok(!!m.botao && !!m.titulo && m.botao.corCss === m.titulo.corCss, R + tema + ': o "Entendi" usa a cor de texto principal, a mesma do título (' + (m.botao && m.botao.corCss) + ')');
      ok(!!m.botao && m.botao.h >= 44 && m.botao.w >= 44, R + tema + ': alvo de toque do "Entendi" ≥ 44 px (' + (m.botao ? Math.round(m.botao.w) + '×' + Math.round(m.botao.h) : '—') + ')');
      ok(!!m.caixa && m.caixa.w > 0 && m.caixa.h > 0 && !m.caixa.transborda && m.pagina, R + tema + ': o aviso pinta e nada transborda na largura do iPad');
      ok(m.icones.length === 2 && m.icones.every(i => i.oculto && i.w === 16) && m.icones[1].ico === icone, R + tema + ': ícones SVG de 16 px, escondidos do leitor de tela (' + J(m.icones.map(i => i.ico)) + ')');
    };

    // sem conta (sem CatedraSync): nada novo aparece
    await semente({ '__teste:semSync': '1' });
    await abrirDados();
    ok(await page.locator('[data-sync-ultima], [data-sync-conflito]').count() === 0, R + 'sem conta (sem CatedraSync), Dados e backup não mostram nada novo');

    // com conta: este aparelho acertou às 21:20; a versão da nuvem foi gravada às 20:41 pelo iPad (hoje em
    // Porto Velho; 26/11 em UTC). Dois avisos não lidos: o das 20:50 e o das 00:30 (25/11 em Porto Velho,
    // 04:30 UTC) — o mais velho não pode sumir porque chegou outro
    const ULTIMA = { ts: Date.parse('2026-11-26T00:41:00Z'), conferido: Date.parse('2026-11-26T01:20:00Z'), aparelho: 'app do iPad', esteAparelho: false, meuNome: 'Chrome no Mac' };
    const UNIDAS = { k: 'catedra:sessions', lado: 'uniao', unidas: true, colisoes: { local: 0, nuvem: 0 }, lapides: 0 };
    const C1 = { conta: 'u1', ts: Date.parse('2026-11-26T00:50:00Z'), outro: 'app do iPad', itens: [{ k: 'catedra:edital', lado: 'nuvem' }, UNIDAS] };
    const C0 = { conta: 'u1', ts: Date.parse('2026-11-25T04:30:00Z'), outro: 'app do iPad', itens: [{ k: 'catedra:reviews', lado: 'uniao', unidas: false, colisoes: { local: 1, nuvem: 0 }, lapides: 0 }] };
    await semente({ '__teste:ultima': ULTIMA, '__teste:conflitos': [C1, C0] });
    await abrirDados();
    await page.waitForSelector('[data-sync-conflito-txt]', { timeout: 10000 });
    const ult = (await page.textContent('[data-sync-ultima-txt]') || '').trim(), grav = (await page.textContent('[data-sync-gravacao-txt]') || '').trim();
    ok(ult === 'Última sincronização: hoje às 21:20', R + 'Ajustes › Dados: a última sincronização é a hora do acerto deste aparelho, no fuso −4 (' + ult + ')');
    ok(grav === 'Última gravação na nuvem: hoje às 20:41 · app do iPad', R + 'Ajustes › Dados: e, à parte, quando e por qual aparelho a nuvem foi gravada (' + grav + ')');
    const m = await medir();
    ok(J(m.textos) === J(['Na sincronização de hoje às 20:50, o edital mudou nos dois aparelhos; ficou a versão do app do iPad. As listas de sessões foram unidas.',
      'Na sincronização de hoje às 00:30, uma revisão mudou nos dois aparelhos; ficou a versão deste aparelho.']),
      R + 'os dois avisos não lidos aparecem, do mais novo ao mais velho, dizendo o que prevaleceu (' + J(m.textos) + ')');
    const tit = (await page.textContent('[data-sync-conflito-titulo]') || '').trim();
    ok(tit === 'Conflito na sincronização' && m.caixa.perda === '1' && m.caixa.deAviso && m.caixa.papel === 'status' && m.caixa.anim === 'none',
      R + 'com versão descartada: título de conflito, fundo de aviso, role=status, sem animação (' + m.caixa.fundo + ')');
    conferir(m, 'claro', 'triangle-alert');

    // "Entendi": some, fica lido neste aparelho (para esta conta) e não manda nada para a nuvem
    await page.clock.runFor(1500);   // o autosave da abertura assenta antes da contagem
    const p0 = await page.evaluate(() => window.__pushes);
    await page.tap('[data-sync-conflito-ok]');
    await page.waitForSelector('[data-sync-conflito]', { state: 'detached', timeout: 6000 });
    await page.clock.runFor(1500);
    const pos = await page.evaluate(() => ({ visto: localStorage.getItem('ct_syncConflitoVisto'), pushes: window.__pushes, ultima: !!document.querySelector('[data-sync-ultima]') }));
    ok(pos.visto === J({ conta: 'u1', ts: C1.ts }), R + '"Entendi" guarda neste aparelho, por conta, até qual aviso foi lido (' + pos.visto + ')');
    ok(pos.pushes === p0, R + 'dispensar não dispara envio (' + p0 + ' → ' + pos.pushes + ' pedidos de envio)');
    ok(pos.ultima, R + 'a linha da última sincronização continua depois de dispensar');

    // outra conta neste aparelho: o "Entendi" da u1 não esconde o aviso dela, mesmo mais velho; só lista unida → tom neutro
    const C2 = { conta: 'u2', ts: Date.parse('2026-11-25T03:00:00Z'), outro: 'app do iPad', itens: [UNIDAS] };
    await semente({ '__teste:conflitos': [C2] }, false);
    await abrirDados();
    await page.waitForSelector('[data-sync-conflito-txt]', { timeout: 10000 });
    const mn = await medir();
    const titN = (await page.textContent('[data-sync-conflito-titulo]') || '').trim();
    ok(J(mn.textos) === J(['Na sincronização de ontem às 23:00, as listas de sessões foram unidas; nada se perdeu.']), R + 'o aviso de outra conta aparece apesar do "Entendi" da primeira (' + J(mn.textos) + ')');
    ok(titN === 'Listas unidas na sincronização' && mn.caixa.perda === '0' && !mn.caixa.deAviso && mn.icones[1].ico === 'circle-check',
      R + 'lista só unida, nada perdido: tom neutro, sem fundo de aviso nem triângulo de alerta (' + titN + ', ' + mn.caixa.fundo + ')');

    // reabrir no escuro: o neutro medido; um conflito NOVO chega pelo evento e aparece em tom de aviso
    await semente({ 'catedra:dark': '1' }, false);
    await abrirDados();
    await page.waitForSelector('[data-sync-conflito-txt]', { timeout: 10000 });
    const mne = await medir();
    ok(!!mne.ultima && lumA(mne.ultima.fundo) < 0.2, R + 'o tema escuro está valendo no cartão (luminância do fundo ' + (mne.ultima ? lumA(mne.ultima.fundo).toFixed(3) : '—') + ')');
    conferir(mne, 'escuro, neutro', 'circle-check');
    const C3 = { conta: 'u2', ts: Date.parse('2026-11-26T01:10:00Z'), outro: 'app do iPad', itens: [{ k: 'catedra:prefs', lado: 'nuvem' }] };
    await page.evaluate(c => { localStorage.setItem('__teste:conflitos', JSON.stringify([c].concat(JSON.parse(localStorage.getItem('__teste:conflitos') || '[]'))));
      window.dispatchEvent(new CustomEvent('catedra:syncconflito', { detail: c })); }, C3);
    await page.waitForSelector('[data-sync-conflito][data-perda="1"]', { timeout: 6000 });
    const md = await medir();
    ok(md.textos[0] === 'Na sincronização de hoje às 21:10, as preferências mudaram nos dois aparelhos; ficou a versão do app do iPad.' && md.textos.length === 2,
      R + 'um conflito novo, avisado pelo evento, aparece sobre o anterior (' + J(md.textos) + ')');
    conferir(md, 'escuro, conflito', 'triangle-alert');
  } finally { await ctx.close(); }
}

export async function testarSyncUltimaConflito(pageDaSuite, base, ok, opcoes = {}) {
  const R = 'SYNC-CONFLITO [' + (opcoes.motor || 'chromium') + '] ';
  const browser = pageDaSuite.context().browser();
  try { await testarAuth(browser, base, ok, R); }
  catch (e) { ok(false, R + 'auth.js: o roteiro correu sem exceção (' + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')'); }
  try { await testarAjustes(browser, base, ok, R); }
  catch (e) { ok(false, R + 'Ajustes: o roteiro correu sem exceção (' + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')'); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let falhas = 0, total = 0;
  testarSyncUltimaConflitoEstatico((c, m) => { total++; if (!c) { falhas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); });
  console.log(falhas ? ('\nFALHAS: ' + falhas + ' de ' + total) : ('\n' + total + ' verificações passaram'));
  process.exit(falhas ? 1 : 0);
}
