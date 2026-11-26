/* BARALHO — VENCIDAS NO INÍCIO E UM SÓ DONO DA REVISÃO (25/11/2026) — baralho.js
   Parte 1 (Node, sem navegador): vencidas com relógio fixo e fuso, filtro por dono, marca de
   exportado (com o up que o merge por id do auth.js usa) e a volta ao Baralho, o arquivo de
   cada toque, a pergunta da primeira exportação depois de escolher o Anki, textos e avisos (com
   singular), o motivo do bloco do ciclo e as listas do build.
   Parte 2 (navegador): o aviso do Início some com zero, aparece com N, abre a fila só das
   vencidas e retoma a rodada aberta; o seletor em Ajustes (e a busca); a exportação nos dois
   donos com o conteúdo dos arquivos, a pergunta, um arquivo por toque e o "desfazer"; o Baralho
   escondendo os exportados com o Anki dono e devolvendo-os com o Cátedra; contraste com os dez
   destaques do seletor, alvo de toque, tema escuro, baixa estimulação; a marca e a volta
   vencendo o merge entre aparelhos.
   Cada bloco roda em contexto próprio, com relógio e fuso fixos (25/11/2026).
   Roda sozinho: node tests/baralho-dono-revisao.mjs (só a parte 1). */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function carregar() {
  const caixa = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(RAIZ, 'baralho.js'), 'utf8'), caixa);
  return caixa.window.CT_BARALHO;
}

const HOJE = '2026-11-25';
export const LISTA = [
  { id: 'v1', front: 'Vencido ontem', back: 'a', dueDate: '2026-11-24', intervalo: 1, repeticoes: 1, up: 1 },
  { id: 'v2', front: 'Vence hoje', back: 'b', dueDate: '2026-11-25', intervalo: 3, repeticoes: 2, up: 1 },
  { id: 'n1', front: 'Novo, nunca estudado', back: 'c', up: 1 },
  { id: 'f1', front: 'Só amanhã', back: 'd', dueDate: '2026-11-26', intervalo: 5, repeticoes: 2, up: 1 },
  { id: 'x1', front: 'Já foi para o Anki', back: 'e', dueDate: '2026-11-20', exportadoEm: 5, up: 6 },
  { id: 's1', back: 'sem frente não é cartão do Baralho', dueDate: '2026-11-01' },
  null,
  { id: 'm1', front: 'Data fora do formato', back: 'g', dueDate: '25/11/2026' },
];

export function testarBaralhoDonoRevisaoEstatico(ok) {
  const R = 'BARALHO ';
  let B = null;
  try { B = carregar(); } catch (e) { ok(false, R + 'baralho.js carrega (' + e.message.split('\n')[0] + ')'); return; }
  const FUNCOES = ['vencidas', 'doBaralho', 'paraExportar', 'loteDoToque', 'primeiraDesdeEscolha', 'lote', 'ultimoLote', 'marcarExportados', 'desmarcar',
    'textos', 'avisoExportacao', 'confirmacao', 'avisoDesfeito', 'motivoBloco', 'opcoes', 'dono'];
  ok(!!B && FUNCOES.every(k => typeof B[k] === 'function'), R + 'publica ' + FUNCOES.join(', '));

  // ---- vencidas: só o que já foi estudado e venceu até hoje
  const vApp = B.vencidas(LISTA, HOJE, 'app').map(c => c.id).join();
  ok(vApp === 'x1,v1,v2', R + 'Cátedra dono: vencidas são as já estudadas com data até hoje, a mais atrasada primeiro (' + vApp + ')');
  ok(!/n1/.test(vApp), R + 'cartão novo, nunca estudado, não conta como vencido');
  ok(!/f1/.test(vApp) && !/m1/.test(vApp) && !/s1/.test(vApp), R + 'o de amanhã, a data fora do formato e o cartão sem frente ficam fora (sem quebrar)');
  ok(B.vencidas(LISTA, HOJE, 'anki').map(c => c.id).join() === 'v1,v2', R + 'Anki dono: o cartão exportado sai da contagem de vencidas');
  ok(B.vencidas(null, HOJE, 'app').length === 0 && B.vencidas(LISTA, '', 'app').length === 0, R + 'lista ausente ou "hoje" vazio não quebram e não contam nada');

  // ---- relógio fixo e fuso: o dia é o LOCAL, nunca o do toISOString
  const tzAntes = process.env.TZ;
  try {
    process.env.TZ = 'America/Porto_Velho';
    const noite = Date.parse('2026-11-26T02:30:00Z');       // 22h30 de 25/11 em Porto Velho (UTC−4)
    ok(B.hojeDe(noite) === '2026-11-25' && new Date(noite).toISOString().slice(0, 10) === '2026-11-26',
      R + 'às 22h30 em Porto Velho ainda é 25/11 (o toISOString já diria 26/11)');
    ok(B.vencidas(LISTA, noite, 'app').map(c => c.id).join() === 'x1,v1,v2', R + 'às 22h30 de Porto Velho, o cartão de amanhã continua fora da contagem');
    const meiaNoite = Date.parse('2026-11-26T04:05:00Z');   // 00h05 de 26/11 em Porto Velho
    ok(B.hojeDe(new Date(meiaNoite)) === '2026-11-26' && B.vencidas(LISTA, meiaNoite, 'app').some(c => c.id === 'f1'),
      R + 'passada a meia-noite local, o cartão de 26/11 vence');
    // o lote de hoje pode voltar ao Baralho; o de ontem não aparece mais
    const as1430 = Date.parse('2026-11-25T18:30:00Z');      // 14h30 de 25/11 em Porto Velho
    const comLote = B.marcarExportados([{ id: 'a', front: 'a' }, { id: 'b', front: 'b' }], ['a', 'b'], as1430);
    const tl = B.textos(comLote, 'anki', HOJE, { donoRevisao: 'anki', donoRevisaoEm: as1430 - 1000 }).lote;
    ok(!!tl && tl.n === 2 && tl.em === as1430 && tl.txt === 'Última exportação hoje às 14:30, com 2 cartões. Se o arquivo não chegou ao Anki:',
      R + 'Ajustes, Anki dono: o lote de hoje aparece com a hora local (' + (tl && tl.txt) + ')');
    const ontem = B.marcarExportados([{ id: 'a', front: 'a' }], ['a'], as1430 - 864e5);
    ok(B.textos(ontem, 'anki', HOJE, {}).lote === null && B.textos(comLote, 'app', HOJE, {}).lote === null,
      R + 'o lote de ontem não oferece a volta, e com o Cátedra dono não há lote a desfazer');
  } finally { if (tzAntes === undefined) delete process.env.TZ; else process.env.TZ = tzAntes; }

  // ---- dono e filtro do Baralho
  ok(B.dono(null) === 'app' && B.dono({}) === 'app' && B.dono({ donoRevisao: 'qualquer' }) === 'app' && B.dono({ donoRevisao: 'anki' }) === 'anki',
    R + 'sem escolha (ou com valor estranho) o dono é o Cátedra — o comportamento de sempre');
  ok(B.doBaralho(LISTA, 'app').map(c => c.id).join() === 'v1,v2,n1,f1,x1,m1', R + 'Cátedra dono: o Baralho mostra todo cartão com frente, inclusive o já exportado');
  ok(B.doBaralho(LISTA, 'anki').map(c => c.id).join() === 'v1,v2,n1,f1,m1' && B.noAnki(LISTA) === 1, R + 'Anki dono: o Baralho esconde o exportado e sabe quantos estão no Anki');

  // ---- exportação: tudo com o Cátedra dono; só o que falta com o Anki dono; nunca o sem frente
  ok(B.paraExportar(LISTA, 'app').map(c => c.id).join() === 'v1,v2,n1,f1,x1,m1', R + 'Cátedra dono: a exportação leva todo cartão com frente, como sempre (inclusive o já marcado)');
  ok(B.paraExportar(LISTA, 'anki').map(c => c.id).join() === 'v1,v2,n1,f1,m1', R + 'Anki dono: a exportação leva só o que ainda não foi');
  ok(B.paraExportar(LISTA, 'anki').length === 5 && /Faltam 5 cartões/.test(B.textos(LISTA, 'anki', HOJE).estado),
    R + 'o cartão sem frente não sai no arquivo, e a contagem da tela é a mesma da exportação (5 e 5)');
  // um arquivo por toque com o Anki dono: primeiro os básicos, depois os de lei seca
  const MIX = [{ id: 'b1', front: 'b1' }, { id: 'z1', front: 'z1', tipo: 'cloze' }, { id: 'b2', front: 'b2' }, { id: 'z2', front: 'z2', tipo: 'cloze', exportadoEm: 9 }];
  const tApp = B.loteDoToque(MIX, 'app'), t1 = B.loteDoToque(MIX, 'anki');
  ok(tApp.basicos.map(c => c.id).join() === 'b1,b2' && tApp.cloze.map(c => c.id).join() === 'z1,z2' && tApp.restamCloze === 0,
    R + 'Cátedra dono: um toque leva os dois arquivos de sempre (básicos e cloze)');
  ok(t1.basicos.map(c => c.id).join() === 'b1,b2' && t1.cloze.length === 0 && t1.restamCloze === 1,
    R + 'Anki dono: o toque leva um arquivo só — os básicos — e diz quantos de lei seca ficam para o próximo');
  const t2 = B.loteDoToque(B.marcarExportados(MIX, ['b1', 'b2'], 50), 'anki');
  ok(t2.basicos.length === 0 && t2.cloze.map(c => c.id).join() === 'z1' && t2.restamCloze === 0, R + 'Anki dono: acabados os básicos, o toque seguinte leva os de lei seca que faltam');

  // ---- a primeira exportação depois de escolher o Anki pergunta antes
  const PREF = { donoRevisao: 'anki', donoRevisaoEm: 100 };
  ok(B.primeiraDesdeEscolha([{ id: 'a', front: 'a' }], PREF) && B.primeiraDesdeEscolha([{ id: 'a', front: 'a', exportadoEm: 50 }], PREF),
    R + 'Anki dono sem exportação depois da escolha (nem marca, ou só marca de antes): a exportação pergunta');
  ok(!B.primeiraDesdeEscolha([{ id: 'a', front: 'a', exportadoEm: 150 }], PREF) && !B.primeiraDesdeEscolha([{ id: 'a', front: 'a' }], { donoRevisao: 'app', donoRevisaoEm: 100 }),
    R + 'depois de uma exportação com o Anki dono, ou com o Cátedra dono, não pergunta');
  const T0 = B.textos([{ id: 'a', front: 'a' }, { id: 'b', front: 'b' }, { id: 'c', front: 'c' }], 'anki', HOJE, PREF);
  ok(T0.estado === 'O Cátedra não sabe o que você importou no Anki antes desta escolha: a próxima exportação pergunta antes de levar os 3 cartões, porque algum deles pode já estar lá e se repetir.',
    R + 'Ajustes, Anki dono recém-escolhido: a tela não afirma que nada foi exportado — diz que não sabe e que vai perguntar (' + T0.estado + ')');
  const conf = B.confirmacao(3);
  ok(/^Primeira exportação desde que você escolheu o Anki\./.test(conf) && /se algum destes 3 cartões já estiver no Anki, ele pode se repetir/.test(conf) && /Exportar agora\?$/.test(conf)
    && /se este cartão já estiver no Anki/.test(B.confirmacao(1)), R + 'a pergunta diz o risco de repetir no Anki e pede a decisão (singular e plural)');

  // ---- marca de exportado e a volta ao Baralho
  const antes = JSON.stringify(LISTA);
  const M = B.marcarExportados(LISTA, ['v1', 'n1'], 1000);
  const v1 = M.find(c => c && c.id === 'v1');
  ok(JSON.stringify(LISTA) === antes, R + 'marcar não muda a lista recebida');
  ok(v1.exportadoEm === 1000 && v1.up === 1000 && v1.front === 'Vencido ontem' && v1.dueDate === '2026-11-24' && v1.intervalo === 1 && v1.repeticoes === 1,
    R + 'o lote ganha exportadoEm e up novos; texto, data e agendamento FSRS ficam iguais');
  ok(M.length === LISTA.length && M[1] === LISTA[1] && M[6] === null, R + 'cartão fora do lote fica como estava (o mesmo objeto), e o nulo não quebra');
  const adiantado = B.marcarExportados([{ id: 'z', front: 'z', up: 5000 }], ['z'], 1000)[0];
  ok(adiantado.up === 5001 && adiantado.exportadoEm === 1000, R + 'o up nunca desce: com o relógio atrasado a marca ainda vence a cópia antiga no merge por id');
  ok(B.marcarExportados([{ id: 'constructor', front: 'a' }], ['toString'], 1)[0].exportadoEm === undefined, R + 'id que não está no lote não é marcado nem por nome herdado');
  ok(B.doBaralho(M, 'anki').every(c => c.id !== 'v1' && c.id !== 'n1') && B.doBaralho(M, 'app').length === 6,
    R + 'marcado some do Baralho com o Anki dono e continua lá com o Cátedra dono');
  const DOIS = B.marcarExportados(B.marcarExportados(LISTA, ['v1', 'n1'], 1000), ['v2'], 2000);
  const ul = B.ultimoLote(DOIS);
  ok(ul && ul.em === 2000 && ul.ids.join() === 'v2' && ul.n === 1 && B.lote(DOIS, 1000).map(c => c.id).join() === 'v1,n1' && B.ultimoLote([{ id: 'a', front: 'a' }]) === null,
    R + 'o último lote é o da exportação mais recente (o mesmo exportadoEm); sem marca, não há lote');
  const D = B.desmarcar(DOIS, ['v2', 'v1'], 3000), dv2 = D.find(c => c && c.id === 'v2'), dv1 = D.find(c => c && c.id === 'v1');
  ok(!('exportadoEm' in dv2) && dv2.up === 3000 && dv2.dueDate === '2026-11-25' && dv2.intervalo === 3 && !('exportadoEm' in dv1)
    && D.find(c => c && c.id === 'x1') === DOIS.find(c => c && c.id === 'x1'),
    R + 'desfazer tira a marca do lote com up novo (a volta vence no merge); agendamento igual; o resto fica como estava');
  ok(B.avisoDesfeito(1) === 'O cartão voltou ao Baralho: a próxima exportação o leva de novo.' && B.avisoDesfeito(3) === 'Os 3 cartões voltaram ao Baralho: a próxima exportação os leva de novo.'
    && /Nada a desfazer/.test(B.avisoDesfeito(0)), R + 'o aviso do desfazer, no singular, no plural e sem nada a desfazer');

  // ---- textos da tela e avisos
  const T1 = B.textos(LISTA, 'app', HOJE);
  ok(T1.vencidasN === 3 && T1.vencidasRotulo === 'cartões do Baralho vencidos até hoje' && T1.baralho === '', R + 'aviso do Início: "3 cartões do Baralho vencidos até hoje"');
  ok(B.textos([{ id: 'a', front: 'a', dueDate: HOJE }], 'app', HOJE).vencidasRotulo === 'cartão do Baralho vencido até hoje', R + 'aviso no singular com um cartão');
  ok(/só de saída/.test(T1.estado) && /não volta para o Cátedra/.test(T1.estado) && /O cartão exportado quando o Anki era o dono voltou ao Baralho, e a marca continua guardada/.test(T1.estado),
    R + 'Ajustes, Cátedra dono: o arquivo é só de saída, e quem foi marcado antes voltou sem perder a marca');
  const T2 = B.textos(LISTA, 'anki', HOJE, { donoRevisao: 'anki', donoRevisaoEm: 1 });
  ok(T2.estado === '1 cartão já está no Anki e não aparece no Baralho. Faltam 5 cartões: ao serem exportados, eles saem do Baralho.',
    R + 'Ajustes, Anki dono depois de exportar: quantos estão no Anki e quantos faltam (' + T2.estado + ')');
  ok(/1 cartão já está lá e não aparece aqui; os novos ficam aqui até a próxima exportação/.test(T2.baralho) && /escolha o Cátedra em Ajustes › Dados e backup/.test(T2.baralho) && /nenhuma marca se perde/.test(T2.baralho),
    R + 'Baralho, Anki dono: diz quantos estão no Anki, que os novos ficam e como trazer os exportados de volta');
  ok(B.textos(B.marcarExportados(LISTA, ['v1', 'v2', 'n1', 'f1', 'm1'], 9), 'anki', HOJE).estado === '6 cartões já estão no Anki e não aparecem no Baralho. Nada novo para exportar.',
    R + 'Ajustes, Anki dono e tudo exportado: "nada novo para exportar"');
  ok(B.avisoExportacao('app', 3, 0) === '3 flashcards exportados. Arquivo só de saída: não revise estes cartões no Anki.'
    && B.avisoExportacao('app', 2, 1) === '2 flashcards + 1 cloze exportados. Arquivo só de saída: não revise estes cartões no Anki.',
    R + 'aviso da exportação, Cátedra dono: curto, só de saída, e não revisar lá');
  ok(B.avisoExportacao('app', 1, 0) === '1 flashcard exportado. Arquivo só de saída: não revise este cartão no Anki.'
    && B.avisoExportacao('anki', 0, 1) === '1 cloze exportado: agora é do Anki e sai do Baralho.', R + 'aviso da exportação no singular ("1 flashcard exportado", "1 cloze exportado")');
  ok(B.avisoExportacao('anki', 2, 0, 0, 1) === '2 flashcards exportados: agora são do Anki e saem do Baralho. Toque de novo para o de lei seca (Cloze).'
    && /Toque de novo para os 3 de lei seca \(Cloze\)\./.test(B.avisoExportacao('anki', 5, 0, 0, 3)),
    R + 'aviso da exportação, Anki dono: agora são do Anki, saem do Baralho, e o próximo toque leva os de lei seca');
  ok(B.avisoExportacao('anki', 0, 0, 4) === 'Nada novo para exportar: os 4 cartões já estão no Anki.' && B.avisoExportacao('app', 0, 0, 0) === 'Nenhum flashcard para exportar',
    R + 'aviso sem nada para exportar, nos dois donos');
  ok(B.avisoExportacao('app', 2, 1).split(/\s+/).length <= 25 && B.avisoExportacao('anki', 12, 0, 0, 3).split(/\s+/).length <= 25,
    R + 'os avisos da exportação cabem em 25 palavras (o detalhe fica no cartão de Ajustes)');
  const O = B.opcoes('anki');
  ok(O.length === 2 && O[0].v === 'app' && O[0].pressed === 'false' && O[1].on === true && O[1].pressed === 'true'
    && /só de saída/.test(O[0].efeito) && /não revise esses cartões no Anki/.test(O[0].efeito) && /os tira do Baralho/.test(O[1].efeito) && /não apaga nada e traz todos de volta/.test(O[1].efeito),
    R + 'as duas escolhas dizem a consequência de cada uma');
  ok(/Os da leitura ativa seguem também em Revisões/.test(O[1].efeito), R + 'a escolha do Anki não promete o que não cumpre: a leitura ativa segue também em Revisões');
  // o bloco "Revisão · Anki" do ciclo segue no dia; com o Anki dono, o motivo diz onde estão os cartões
  ok(B.motivoBloco(LISTA, 'app') === '8 cartões no baralho' && B.motivoBloco(LISTA, 'anki') === '5 no Baralho · 1 no Anki'
    && B.motivoBloco(B.marcarExportados(LISTA, ['v1', 'v2', 'n1', 'f1', 'm1'], 9), 'anki') === '6 cartões no Anki' && B.motivoBloco([{ id: 'a', front: 'a' }], 'anki') === '1 cartões no baralho',
    R + 'motivo do bloco do ciclo: igual ao de sempre com o Cátedra dono; com o Anki dono, quantos no Baralho e quantos no Anki');
  ok(B.partes(1, 0) === '1 flashcard' && B.partes(2, 1) === '2 flashcards + 1 cloze' && B.partes(0, 3) === '3 cloze', R + 'as partes do aviso concordam em número');

  // ---- sintaxe que o JavaScriptCore do iPad lê, e o arquivo nas listas do build
  const src = fs.readFileSync(path.join(RAIZ, 'baralho.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ok(!/=>|\?\.|\?\?|`|\b(let|const|class)\s/.test(src), R + 'baralho.js só usa sintaxe ES5 (sem seta, let/const, ?. ou ??)');
  const host = fs.readFileSync(path.join(RAIZ, 'Catedra.dc.html'), 'utf8');
  const build = fs.readFileSync(path.join(RAIZ, 'scripts', 'build.mjs'), 'utf8'), mac = fs.readFileSync(path.join(RAIZ, 'scripts', 'build-macos.mjs'), 'utf8');
  ok(/<script src="\.\/baralho\.js"><\/script>/.test(host) && /'baralho\.js'/.test(build) && /'\.\/baralho\.js'/.test(build) && /'baralho\.js'/.test(mac),
    R + 'baralho.js entra no <head> do host, na cópia e no precache do site e na cópia do bundle nativo');
}

/* ---- Parte 2: navegador ---- */
export const CARTOES = [
  { id: 'v1', front: 'O que é mora do credor?', back: 'Recusa injustificada em receber', disc: 'Direito Civil', dueDate: '2026-11-24', intervalo: 1, repeticoes: 1, up: 1 },
  { id: 'v2', front: 'Prazo da contestação?', back: 'Quinze dias', disc: 'Direito Processual Civil', dueDate: '2026-11-25', intervalo: 3, repeticoes: 2, up: 1 },
  { id: 'n1', front: 'Cartão novo, nunca estudado', back: 'não conta como vencido', disc: 'Direito Penal', up: 1 },
  { id: 'f1', front: 'Só amanhã', back: 'fora da fila de hoje', disc: 'Direito Penal', dueDate: '2026-11-26', intervalo: 5, repeticoes: 2, up: 1 },
];
const DONO_FC = [
  { id: 'b1', front: 'Pergunta básica 1', back: 'Resposta 1', disc: 'Direito Civil', dueDate: '2026-11-24', intervalo: 1, repeticoes: 1, up: 1000 },
  { id: 'b2', front: 'Pergunta básica 2', back: 'Resposta 2', disc: 'Direito Penal', up: 1000 },
  { id: 'z1', tipo: 'cloze', front: 'O prazo para contestar é de {{c1::15 dias}}.', back: '15 dias', extra: 'CPC · Art. 335', tags: ['leitura-ativa'], disc: 'Direito Processual Civil', dueDate: '2026-11-25', intervalo: 1, repeticoes: 1, up: 1000 },
];
// os dez destaques do seletor de Ajustes › Aparência (accentOpts do host)
const DESTAQUES = ['#0f7a57', '#0d9488', '#2563eb', '#0a7ea4', '#7c3aed', '#6244f5', '#d6457f', 'var(--danger)', 'var(--warn)', '#84cc16'];

async function novoContexto(pageDaSuite, o = {}) {
  const ctx = await pageDaSuite.context().browser().newContext({ viewport: o.viewport || { width: 1280, height: 900 }, hasTouch: !!o.hasTouch,
    timezoneId: o.timezoneId || 'America/Sao_Paulo', acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  await page.clock.install({ time: new Date(o.quando || '2026-11-25T14:00:00-03:00') });
  return { ctx, page };
}
// semeia ANTES de abrir o app, numa página 404 da mesma origem (abrir e depois semear é corrida com o autosave)
async function semear(page, base, dados) {
  await page.goto(base + '/__semente');
  await page.evaluate((d) => {
    localStorage.clear();
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', JSON.stringify('juridica'));
    Object.keys(d || {}).forEach(k => set(k, d[k]));
  }, dados || {});
}
async function abrir(page, base, view) {
  await page.goto(base + '/Catedra.dc.html');
  await page.waitForFunction(() => !!window.__catedraApp && typeof window.__catedraGoView === 'function' && !!window.CT_BARALHO, null, { timeout: 30000 });
  if (view) await page.evaluate((v) => window.__catedraGoView(v), view);
}
// Medidas na página: cor normalizada pelo canvas (vale para color(), oklab() e color-mix), fundo
// efetivo compondo as camadas translúcidas até a primeira opaca, contraste WCAG e tokens do tema.
const MEDIDA = () => {
  const rgba = (c) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 1; const x = cv.getContext('2d');
    x.fillStyle = 'rgba(1, 2, 3, 0.5)'; const sentinela = x.fillStyle; x.fillStyle = String(c || '');
    if (x.fillStyle === sentinela) return null;
    x.clearRect(0, 0, 1, 1); x.fillRect(0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255];
  };
  const fundo = (el) => {
    const camadas = [];
    for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) { camadas.push(c); if (c[3] >= 0.999) break; } }
    let b = [255, 255, 255];
    for (let i = camadas.length - 1; i >= 0; i--) { const [r, g, bl, a] = camadas[i]; b = [r * a + b[0] * (1 - a), g * a + b[1] * (1 - a), bl * a + b[2] * (1 - a)]; }
    return b;
  };
  const lum = (c) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const razao = (el) => {
    const bg = fundo(el), t = rgba(getComputedStyle(el).color); if (!t) return 0;
    const fg = [t[0] * t[3] + bg[0] * (1 - t[3]), t[1] * t[3] + bg[1] * (1 - t[3]), t[2] * t[3] + bg[2] * (1 - t[3])];
    const a = lum(fg), b = lum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  const caixa = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom }; };
  const token = (nome) => { const p = document.createElement('span'); p.style.color = 'var(' + nome + ')'; (document.querySelector('[data-dir]') || document.body).appendChild(p); const c = rgba(getComputedStyle(p).color); p.remove(); return c; };
  const igual = (x, y) => !!x && !!y && Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]) + Math.abs(x[2] - y[2]) <= 6;
  const cor = (el) => rgba(getComputedStyle(el).color);
  window.__bm = { rgba, fundo, razao, caixa, token, lum, igual, cor };
};
const textoDosAvisos = (page) => page.evaluate(() => [...document.querySelectorAll('[role="status"]')].map(e => e.textContent || '').join(' | '));

export async function testarBaralhoDonoRevisao(pageDaSuite, base, ok, opcoes = {}) {
  const R = 'BARALHO [' + (opcoes.motor || 'chromium') + '] ';
  const blocos = [inicio, toqueEscuroBaixa, destaque, fuso, dono, merge];
  const so = process.env.CT_BLOCO;   // CT_BLOCO=dono roda só um bloco, para o ciclo curto
  for (const b of blocos) {
    if (so && b.name !== so) continue;
    try { await b(pageDaSuite, base, ok, R, opcoes); }
    catch (e) { ok(false, R + b.name + ' exceção: ' + String(e && e.message || e).split('\n')[0].slice(0, 200)); }
  }
}

async function inicio(pageDaSuite, base, ok, R) {
  const { ctx, page } = await novoContexto(pageDaSuite);
  try {
    // zero: só o cartão novo e o de amanhã — nada venceu, o aviso não existe
    await semear(page, base, { fc: CARTOES.filter(c => c.id === 'n1' || c.id === 'f1') });
    await abrir(page, base, 'inicio');
    await page.waitForSelector('[data-proxima-acao]', { timeout: 15000 });
    await page.clock.runFor(600);
    ok(await page.locator('[data-fc-vencidas]').count() === 0, R + 'sem cartão vencido (só o novo e o de amanhã), o aviso do Início não existe');

    // N: dois já estudados e vencidos (ontem e hoje), um novo e um de amanhã
    await semear(page, base, { fc: CARTOES });
    await abrir(page, base, 'inicio');
    await page.waitForSelector('[data-fc-vencidas]', { timeout: 15000 });
    await page.evaluate(MEDIDA);
    const m = await page.evaluate(() => {
      const B = window.__bm, chip = document.querySelector('[data-fc-vencidas]'), pa = document.querySelector('[data-proxima-acao]'), ir = chip.querySelector('.cth-pa-ir');
      const c = B.caixa(chip), p = B.caixa(pa);
      return { n: chip.getAttribute('data-fc-vencidas'), texto: (chip.innerText || '').replace(/\s+/g, ' ').trim(),
        colado: chip.previousElementSibling === pa && c.y >= p.b - 1 && c.y - p.b <= 16 && Math.abs(c.x - p.x) <= 2 && Math.abs(c.w - p.w) <= 2,
        distancia: Math.round(c.y - p.b), ctaUnico: pa.querySelectorAll('button').length === 1, tag: chip.tagName, h: c.h,
        rTxt: B.razao(chip.querySelector('.cth-pa-txt')), rIr: B.razao(ir),
        irTinta: B.igual(B.cor(ir), B.token('--ink')), setaDestaque: B.igual(B.cor(ir.querySelector('svg')), B.token('--accent')),
        icones: [...chip.querySelectorAll('svg')].every(s => s.getAttribute('aria-hidden') === 'true' && s.getBoundingClientRect().width === 16) };
    });
    ok(m.n === '2' && m.texto === '2 cartões do Baralho vencidos até hoje Revisar', R + 'com dois vencidos (ontem e hoje), o aviso conta 2 — o novo e o de amanhã ficam fora ("' + m.texto + '")');
    ok(m.colado, R + 'o aviso fica colado logo abaixo da próxima ação, na mesma largura (' + m.distancia + ' px abaixo)');
    ok(m.ctaUnico, R + 'o cartão da próxima ação continua com um CTA só');
    ok(m.tag === 'BUTTON' && m.h >= 44, R + 'um toque: o aviso inteiro é um botão de ' + Math.round(m.h) + ' px de altura');
    ok(m.rTxt >= 4.5 && m.rIr >= 4.5, R + 'contraste do aviso ≥ 4,5:1 no claro (texto ' + m.rTxt.toFixed(2) + ', "Revisar" ' + m.rIr.toFixed(2) + ')');
    ok(m.irTinta && m.setaDestaque, R + '"Revisar" é texto em tinta; a cor de destaque fica só na seta, que é decoração');
    ok(m.icones, R + 'ícones SVG de 16 px, com aria-hidden');
    ok(await page.locator('.cth-baralho').count() === 0, R + 'o Início segue sem o bloco antigo do Baralho');
    // no celular (390 px) a linha quebra dentro de si: sem rolagem lateral, inteira na tela, alvo de 44 px
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.runFor(300);
    const cel = await page.evaluate(() => { const chip = document.querySelector('[data-fc-vencidas]'), r = chip.getBoundingClientRect();
      return { semRolagem: document.documentElement.scrollWidth <= innerWidth + 2, dentro: r.left >= 0 && r.right <= innerWidth + 1, cabe: chip.scrollWidth <= chip.clientWidth + 1, h: r.height }; });
    ok(cel.semRolagem && cel.dentro && cel.cabe && cel.h >= 44, R + 'a 390 px a linha cabe na tela, sem rolagem lateral, com ' + Math.round(cel.h) + ' px de altura');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.clock.runFor(300);

    // o toque abre a fila SÓ das vencidas, a mais atrasada primeiro
    await page.click('[data-fc-vencidas]');
    await page.waitForSelector('.ct-fc-sala', { timeout: 10000 });
    const fila = await page.evaluate(() => { const a = window.__catedraApp, s = a.state.fcSess || {};
      return { view: a.state.view, ids: (s.ids || []).join(','), conta: (document.querySelector('.ct-fc-conta') || {}).textContent || '', frente: (document.querySelector('.ct-fc-frente') || {}).textContent || '' }; });
    ok(fila.view === 'flashcards' && fila.ids === 'v1,v2', R + 'o toque abre o estudo só das vencidas, a mais atrasada primeiro (' + fila.ids + ')');
    ok(/2 na fila/.test(fila.conta) && /mora do credor/.test(fila.frente), R + 'a sala mostra a fila de 2 e começa pelo cartão de ontem');
    const normal = await page.evaluate(() => window.__catedraApp._fcFila('').map(c => c.id).join(','));
    ok(normal === 'v1,v2,n1', R + 'a fila do próprio Baralho continua levando o cartão novo depois dos vencidos (' + normal + ')');

    // rodada aberta: responde um cartão, volta ao Início e toca a linha de novo — a rodada continua
    await page.click('.ct-fc-virar');
    await page.click('.ct-fc-notas [data-q="5"]');
    await page.waitForFunction(() => { const s = window.__catedraApp.state.fcSess; return !!s && s.i === 1 && s.acertos === 1; }, null, { timeout: 10000 });
    await page.evaluate(() => window.__catedraGoView('inicio'));
    await page.waitForSelector('[data-fc-vencidas]', { timeout: 10000 });
    const umSo = await page.evaluate(() => (document.querySelector('[data-fc-vencidas]').innerText || '').replace(/\s+/g, ' ').trim());
    await page.click('[data-fc-vencidas]');
    await page.waitForSelector('.ct-fc-sala', { timeout: 10000 });
    const ret = await page.evaluate(() => { const a = window.__catedraApp, s = a.state.fcSess || {};
      return { view: a.state.view, i: s.i, acertos: s.acertos, erros: s.erros, ids: (s.ids || []).join(','), frente: (document.querySelector('.ct-fc-frente') || {}).textContent || '' }; });
    ok(umSo === '1 cartão do Baralho vencido até hoje Revisar' && ret.view === 'flashcards' && ret.i === 1 && ret.acertos === 1 && ret.erros === 0 && ret.ids === 'v1,v2' && /Prazo da contestação/.test(ret.frente),
      R + 'com uma rodada aberta, a linha do Início retoma a rodada (1 acerto e o cartão seguinte) em vez de recomeçar (' + umSo + ')');
  } finally { await ctx.close(); }
}

async function toqueEscuroBaixa(pageDaSuite, base, ok, R) {
  const { ctx, page } = await novoContexto(pageDaSuite, { viewport: { width: 820, height: 1180 }, hasTouch: true });
  try {
    await semear(page, base, { fc: CARTOES, dark: '1' });
    await abrir(page, base, 'inicio');
    await page.waitForSelector('[data-fc-vencidas]', { timeout: 15000 });
    await page.evaluate(MEDIDA);
    // escuro com o destaque de sempre: a seta leva o destaque, o texto lê em tinta
    const e = await page.evaluate(() => { const B = window.__bm, chip = document.querySelector('[data-fc-vencidas]'), ir = chip.querySelector('.cth-pa-ir');
      return { escuro: window.__catedraApp.state.darkMode === true && B.lum(B.fundo(chip)) < 0.2, rTxt: B.razao(chip.querySelector('.cth-pa-txt')), rIr: B.razao(ir),
        setaDestaque: B.igual(B.cor(ir.querySelector('svg')), B.token('--accent')) }; });
    ok(e.escuro && e.rTxt >= 4.5 && e.rIr >= 4.5 && e.setaDestaque, R + 'contraste do aviso ≥ 4,5:1 no escuro com o destaque do tema (texto ' + e.rTxt.toFixed(2) + ', "Revisar" ' + e.rIr.toFixed(2) + '), seta no destaque');
    // e na baixa estimulação, ligada pela preferência como nos Ajustes. Espera a COR chegar (a
    // transição de 1 µs da baixa estimulação no WebKit sob carga ainda mostrava a cor antiga)
    await page.evaluate(() => { const a = window.__catedraApp; a.setState(s => ({ prefs: { ...s.prefs, baixaEstimulacao: true } })); });
    await page.waitForFunction(() => document.documentElement.getAttribute('data-baixa') === '1', null, { timeout: 10000 });
    await page.waitForFunction(() => { const B = window.__bm, sv = document.querySelector('[data-fc-vencidas] .cth-pa-ir svg'); return !!sv && B.igual(B.cor(sv), B.token('--ink')); }, null, { timeout: 10000 }).catch(() => {});
    const m = await page.evaluate(() => {
      const B = window.__bm, a = window.__catedraApp, chip = document.querySelector('[data-fc-vencidas]'), ir = chip.querySelector('.cth-pa-ir');
      const cs = getComputedStyle(chip), danger = B.token('--danger'), warn = B.token('--warn');
      const cores = [cs.color, cs.borderTopColor, cs.backgroundColor, getComputedStyle(ir).color, getComputedStyle(ir.querySelector('svg')).color].map(B.rgba);
      return { escuro: a.state.darkMode === true && B.lum(B.fundo(chip)) < 0.2, baixa: document.documentElement.getAttribute('data-baixa') === '1',
        h: B.caixa(chip).h, rTxt: B.razao(chip.querySelector('.cth-pa-txt')), rIr: B.razao(ir),
        tudoTinta: B.igual(B.cor(ir), B.token('--ink')) && B.igual(B.cor(ir.querySelector('svg')), B.token('--ink')),
        semAlarme: !!danger && !cores.some(c => B.igual(c, danger) || B.igual(c, warn)) };
    });
    ok(m.escuro && m.baixa, R + 'iPad 820: tema escuro e baixa estimulação ligados');
    ok(m.h >= 44, R + 'iPad no toque: o aviso tem ' + Math.round(m.h) + ' px de altura (≥ 44)');
    ok(m.rTxt >= 4.5 && m.rIr >= 4.5, R + 'contraste do aviso ≥ 4,5:1 no escuro (texto ' + m.rTxt.toFixed(2) + ', "Revisar" ' + m.rIr.toFixed(2) + ')');
    ok(m.tudoTinta && m.semAlarme, R + 'baixa estimulação: "Revisar" e a seta em tinta, e nada no aviso usa cor de alarme (perigo ou alerta)');

    // o seletor de Ajustes no toque e no escuro
    await page.evaluate(() => window.__catedraGoView('ajustes'));
    await page.locator('main .aj-abas button[data-s="dados"]').click();
    await page.waitForSelector('.ct-dono-op', { timeout: 10000 });
    await page.evaluate(MEDIDA);
    const s = await page.evaluate(() => { const B = window.__bm, ops = [...document.querySelectorAll('.ct-dono-op')];
      return { n: ops.length, hMin: Math.min(...ops.map(o => B.caixa(o).h)),
        rMin: Math.min(...ops.flatMap(o => [B.razao(o.querySelector('b')), B.razao(o.querySelector(':scope > span'))])),
        rSelo: B.razao(document.querySelector('.ct-dono-op .ct-selo')), rEstado: B.razao(document.querySelector('[data-dono-estado]')) }; });
    ok(s.n === 2 && s.hMin >= 44, R + 'iPad no toque: as duas escolhas do dono têm ≥ 44 px (' + Math.round(s.hMin) + ' px)');
    ok(s.rMin >= 4.5 && s.rSelo >= 4.5 && s.rEstado >= 4.5, R + 'contraste do seletor ≥ 4,5:1 no escuro (texto ' + s.rMin.toFixed(2) + ', selo ' + s.rSelo.toFixed(2) + ', estado ' + s.rEstado.toFixed(2) + ')');
  } finally { await ctx.close(); }
}

/* Os dez destaques do seletor, no escuro e no claro: "Revisar" e o selo "em uso" são texto e
   precisam de 4,5:1 com qualquer um (o --accentD de um destaque escolhido escurece nos dois temas). */
async function destaque(pageDaSuite, base, ok, R) {
  const { ctx, page } = await novoContexto(pageDaSuite);
  try {
    await semear(page, base, { fc: CARTOES, dark: '1' });
    await abrir(page, base, 'inicio');
    await page.waitForSelector('[data-fc-vencidas]', { timeout: 15000 });
    await page.evaluate(MEDIDA);
    const varrer = async (sel, escuro) => {
      const medidas = [];
      for (const cor of DESTAQUES) {
        await page.evaluate(([c, esc]) => window.__catedraApp.setState({ accent: c, darkMode: esc }), [cor, escuro]);
        await page.waitForFunction(([c, s, esc]) => { const B = window.__bm, el = document.querySelector(s); if (!B || !el) return false;
          const alvo = /^var\(/.test(c) ? B.token(c.slice(4, -1)) : B.rgba(c);
          return B.igual(B.token('--accent'), alvo) && ((B.lum(B.fundo(el)) < 0.2) === esc); }, [cor, sel, escuro], { timeout: 10000 });
        medidas.push([cor, await page.evaluate((s) => window.__bm.razao(document.querySelector(s)), sel)]);
      }
      return medidas.reduce((a, b) => (b[1] < a[1] ? b : a));
    };
    for (const escuro of [true, false]) {
      const p = await varrer('[data-fc-vencidas] .cth-pa-ir', escuro);
      ok(p[1] >= 4.5, R + '"Revisar" ≥ 4,5:1 com os dez destaques do seletor no ' + (escuro ? 'escuro' : 'claro') + ' (pior: ' + p[0] + ', ' + p[1].toFixed(2) + ')');
    }
    await page.evaluate(() => window.__catedraGoView('ajustes'));
    await page.locator('main .aj-abas button[data-s="dados"]').click();
    await page.waitForSelector('.ct-dono-op .ct-selo', { timeout: 10000 });
    for (const escuro of [true, false]) {
      const p = await varrer('.ct-dono-op .ct-selo', escuro);
      ok(p[1] >= 4.5, R + 'selo "em uso" ≥ 4,5:1 com os dez destaques do seletor no ' + (escuro ? 'escuro' : 'claro') + ' (pior: ' + p[0] + ', ' + p[1].toFixed(2) + ')');
    }
  } finally { await ctx.close(); }
}

async function fuso(pageDaSuite, base, ok, R) {
  const { ctx, page } = await novoContexto(pageDaSuite, { timezoneId: 'America/Porto_Velho', quando: '2026-11-25T22:30:00-04:00' });
  try {
    await semear(page, base, { fc: [
      { id: 'h', front: 'Vence hoje', back: 'x', dueDate: '2026-11-25', intervalo: 1, repeticoes: 1, up: 1 },
      { id: 'a', front: 'Vence amanhã', back: 'y', dueDate: '2026-11-26', intervalo: 2, repeticoes: 1, up: 1 }] });
    await abrir(page, base, 'inicio');
    await page.waitForSelector('[data-fc-vencidas]', { timeout: 15000 });
    const r = await page.evaluate(() => ({ n: document.querySelector('[data-fc-vencidas]').getAttribute('data-fc-vencidas'), hoje: window.__catedraApp._hoje(), iso: new Date().toISOString().slice(0, 10) }));
    ok(r.hoje === '2026-11-25' && r.iso === '2026-11-26' && r.n === '1', R + 'às 22h30 em Porto Velho (já 26/11 em UTC) conta só o cartão de hoje (' + r.n + ')');
  } finally { await ctx.close(); }
}

async function dono(pageDaSuite, base, ok, R) {
  const { ctx, page } = await novoContexto(pageDaSuite);
  const baixados = [], dialogos = [];
  let resposta = 'aceitar';
  page.on('download', d => baixados.push(d));
  page.on('dialog', d => { dialogos.push(d.message()); (resposta === 'aceitar' ? d.accept() : d.dismiss()).catch(() => {}); });
  const ler = async (d) => fs.readFileSync(await d.path(), 'utf8');
  const linhas = (t) => t.split('\n').filter(l => l && l[0] !== '#');
  // duplo: os dois cliques de um clique duplo, na mesma tarefa da página (sem o relógio andar)
  const exportar = async (esperados, duplo) => {
    const n0 = baixados.length;
    if (duplo) await page.evaluate(() => { const b = [...document.querySelectorAll('main button')].find(x => /Flashcards → Anki/.test(x.textContent || '')); b.click(); b.click(); });
    else await page.locator('main button', { hasText: 'Flashcards → Anki' }).click();
    for (let i = 0; i < 40 && baixados.length < n0 + esperados; i++) { await page.clock.runFor(100); await page.waitForTimeout(50); }
    if (!esperados || duplo) { await page.clock.runFor(1500); await page.waitForTimeout(300); }
    return baixados.slice(n0);
  };
  const fcGravado = () => page.evaluate(() => JSON.parse(localStorage.getItem('catedra:fc') || '[]'));
  const marcados = async () => (await fcGravado()).filter(c => c.exportadoEm > 0).map(c => c.id).sort().join(',');
  const estado = () => page.locator('[data-dono-estado]').textContent();
  // a nota do arquivo Cloze (Ajustes) conta os cloze que a PRÓXIMA exportação leva
  const notaCloze = () => page.evaluate(() => /lei seca \(leitura ativa\) sa(i|em) em arquivo próprio, catedra-cloze-lei-seca\.txt/.test((document.querySelector('main') || document.body).innerText || ''));
  const irAjustes = async () => {
    await page.evaluate(() => window.__catedraGoView('ajustes'));
    await page.locator('main .aj-abas button[data-s="dados"]').click();
    await page.waitForSelector('.ct-dono-op', { timeout: 10000 });
  };
  const xAnki = () => page.evaluate(() => { const b = (window.__catedraApp._extrasDoDia() || []).find(x => x.id === 'x-anki'); return b ? b.motivo : null; });
  try {
    await semear(page, base, { fc: DONO_FC });
    await abrir(page, base, '');
    await irAjustes();
    await page.evaluate(MEDIDA);
    const ini = await page.evaluate(() => { const B = window.__bm, g = document.querySelector('.ct-dono-ops'), ops = [...g.querySelectorAll('.ct-dono-op')];
      return { grupo: g.getAttribute('role') === 'group' && document.getElementById(g.getAttribute('aria-labelledby')).textContent === 'Quem agenda a revisão dos cartões',
        press: ops.map(o => o.getAttribute('data-dono') + ':' + o.getAttribute('aria-pressed')).join(','),
        textos: ops.map(o => (o.innerText || '').replace(/\s+/g, ' ')), estado: document.querySelector('[data-dono-estado]').textContent,
        hMin: Math.min(...ops.map(o => B.caixa(o).h)), rMin: Math.min(...ops.flatMap(o => [B.razao(o.querySelector('b')), B.razao(o.querySelector(':scope > span'))])),
        rEstado: B.razao(document.querySelector('[data-dono-estado]')) }; });
    ok(ini.grupo && ini.press === 'app:true,anki:false', R + 'Ajustes › Dados e backup: o seletor nomeado começa no Cátedra, o padrão de sempre (' + ini.press + ')');
    ok(await notaCloze(), R + 'Cátedra dono: a nota do arquivo Cloze aparece, como sempre');
    ok(/O Cátedra \(padrão\) em uso/.test(ini.textos[0]) && /só de saída/.test(ini.textos[0]) && /^O Anki /.test(ini.textos[1]) && /tira do Baralho/.test(ini.textos[1]) && /leitura ativa seguem também em Revisões/.test(ini.textos[1]),
      R + 'cada escolha diz a consequência (a do Anki, também a da leitura ativa), e a em uso tem selo (não só cor)');
    ok(/só de saída/.test(ini.estado), R + 'o cartão da exportação avisa que o arquivo é só de saída (' + ini.estado + ')');
    ok(ini.hMin >= 44 && ini.rMin >= 4.5 && ini.rEstado >= 4.5, R + 'seletor no claro: ≥ 44 px e contraste ≥ 4,5:1 (' + Math.round(ini.hMin) + ' px, ' + ini.rMin.toFixed(2) + ', estado ' + ini.rEstado.toFixed(2) + ')');
    // a busca dos Ajustes acha o bloco (antes, buscar "dono" escondia o cartão inteiro)
    await page.fill('input[aria-label="Buscar nos ajustes"]', 'dono');
    await page.clock.runFor(300);
    const busca = await page.evaluate(() => { const d = document.querySelector('.ct-dono'), r = d && d.getBoundingClientRect(); return !!r && r.height > 0 && !!d.offsetParent; });
    await page.fill('input[aria-label="Buscar nos ajustes"]', '');
    await page.clock.runFor(300);
    ok(busca, R + 'buscar "dono" nos Ajustes mostra o bloco de quem agenda a revisão');
    ok(await xAnki() === '3 cartões no baralho', R + 'Cátedra dono: o bloco "Revisão · Anki" do ciclo segue como sempre ("3 cartões no baralho")');

    // ---- 1) Cátedra dono: exporta tudo, avisa "só de saída", não marca nada nem pergunta
    const d1 = await exportar(2);
    const nomes1 = d1.map(d => d.suggestedFilename()).sort().join(',');
    const t1 = d1.find(d => d.suggestedFilename() === 'catedra-flashcards.txt'), c1 = d1.find(d => d.suggestedFilename() === 'catedra-cloze-lei-seca.txt');
    const txt1 = t1 ? await ler(t1) : '', txtZ1 = c1 ? await ler(c1) : '';
    const b1 = linhas(txt1), z1 = linhas(txtZ1);
    ok(txt1.startsWith('#separator:tab\n#html:true\n#tags column:3\n') && txtZ1.startsWith('#separator:tab\n#html:true\n#notetype:Cloze\n#tags column:3\n') && !txt1.includes('{{c1'),
      R + 'Cátedra dono: os dois arquivos saem com os cabeçalhos de sempre, e o básico sem cloze');
    ok(nomes1 === 'catedra-cloze-lei-seca.txt,catedra-flashcards.txt' && b1.length === 2 && /^Pergunta básica 1\tResposta 1\t/.test(b1[0]) && /^Pergunta básica 2\tResposta 2\t/.test(b1[1])
      && z1.length === 1 && z1[0].startsWith('O prazo para contestar é de {{c1::15 dias}}.\tCPC · Art. 335'),
      R + 'Cátedra dono: um toque leva os 2 básicos e o cloze, nos dois arquivos de sempre (' + nomes1 + ')');
    const aviso1 = await textoDosAvisos(page);
    ok(/2 flashcards \+ 1 cloze exportados\. Arquivo só de saída: não revise estes cartões no Anki\./.test(aviso1),
      R + 'o momento da exportação avisa, curto, que o arquivo é só de saída');
    await page.clock.runFor(1500);
    ok(await marcados() === '' && dialogos.length === 0, R + 'Cátedra dono: exportar não marca cartão nenhum nem pergunta nada');

    // ---- 2) Anki dono: a escolha persiste, e a tela não afirma o que não sabe
    await page.locator('.ct-dono-op[data-dono="anki"]').click();
    await page.clock.runFor(1500);
    const pos = await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('catedra:prefs') || '{}');
      return { press: [...document.querySelectorAll('.ct-dono-op')].map(o => o.getAttribute('aria-pressed')).join(','), gravado: p.donoRevisao, desde: p.donoRevisaoEm,
        estado: document.querySelector('[data-dono-estado]').textContent }; });
    ok(pos.press === 'false,true' && pos.gravado === 'anki' && pos.desde > 0, R + 'escolher o Anki marca a opção e grava prefs.donoRevisao e desde quando (' + pos.gravado + ')');
    ok(pos.estado === 'O Cátedra não sabe o que você importou no Anki antes desta escolha: a próxima exportação pergunta antes de levar os 3 cartões, porque algum deles pode já estar lá e se repetir.',
      R + 'Anki dono recém-escolhido, depois de exportar com o Cátedra dono: a tela diz que não sabe o que já está no Anki (' + pos.estado + ')');
    // 2a) recusar a pergunta: nada baixa, nada marca
    resposta = 'recusar';
    const d2a = await exportar(0);
    ok(d2a.length === 0 && dialogos.length === 1 && /^Primeira exportação desde que você escolheu o Anki\./.test(dialogos[0]) && /algum destes 3 cartões já estiver no Anki, ele pode se repetir/.test(dialogos[0])
      && await marcados() === '', R + 'a primeira exportação depois da escolha pergunta antes (risco de repetir no Anki); recusar não baixa nem marca nada');
    // 2b) aceitar: UM arquivo (os básicos), e só eles saem do Baralho — mesmo com clique duplo,
    // cujo 2º toque levaria o arquivo de lei seca logo atrás (no iPad, recusado e já marcado)
    resposta = 'aceitar';
    const d2 = await exportar(1, true);
    await page.clock.runFor(1500);
    const so2 = d2.length === 1 ? linhas(await ler(d2[0])) : [];
    const fc2 = await fcGravado();
    ok(d2.length === 1 && d2[0].suggestedFilename() === 'catedra-flashcards.txt' && so2.length === 2 && dialogos.length === 2,
      R + 'Anki dono: aceitar baixa UM arquivo por toque — os 2 básicos —, e o 2º toque de um clique duplo não baixa outro (' + d2.map(d => d.suggestedFilename()).join(', ') + ')');
    ok(await marcados() === 'b1,b2' && fc2.filter(c => c.exportadoEm > 0).every(c => c.up > 1000), R + 'só o lote baixado ganha exportadoEm e up novo; o cloze segue no Baralho');
    ok(/2 flashcards exportados: agora são do Anki e saem do Baralho\. Toque de novo para o de lei seca \(Cloze\)\./.test(await textoDosAvisos(page)),
      R + 'o aviso diz que agora são do Anki e que o próximo toque leva o de lei seca');
    ok(await estado() === '2 cartões já estão no Anki e não aparecem no Baralho. Falta 1 cartão: ao ser exportado, ele sai do Baralho.', R + 'Anki dono: o estado conta os que estão no Anki e o que falta');
    await page.evaluate(MEDIDA);
    const lote2 = await page.evaluate(() => { const l = document.querySelector('[data-dono-lote]'), b = l && l.querySelector('button');
      const sp = l && l.querySelector(':scope > span');
      return l ? { txt: (sp.textContent || ''), h: b.getBoundingClientRect().height, rTxt: window.__bm.razao(sp), rBt: window.__bm.razao(b) } : null; });
    ok(!!lote2 && /^Última exportação hoje às \d\d:\d\d, com 2 cartões\. Se o arquivo não chegou ao Anki:$/.test(lote2.txt) && lote2.h >= 44 && lote2.rTxt >= 4.5 && lote2.rBt >= 4.5,
      R + 'Ajustes oferece trazer de volta o lote de hoje, com alvo ≥ 44 px e contraste ≥ 4,5:1 (' + (lote2 && lote2.txt) + ')');
    // 2c) o segundo toque leva o cloze, sem perguntar de novo
    const d3 = await exportar(1);
    await page.clock.runFor(1500);
    const so3 = d3.length === 1 ? linhas(await ler(d3[0])) : [];
    ok(d3.length === 1 && d3[0].suggestedFilename() === 'catedra-cloze-lei-seca.txt' && so3.length === 1 && dialogos.length === 2 && await marcados() === 'b1,b2,z1',
      R + 'o toque seguinte leva o arquivo Cloze, sem perguntar de novo, e marca o cloze');
    ok(/1 cloze exportado: agora é do Anki e sai do Baralho\./.test(await textoDosAvisos(page)), R + 'o aviso concorda no singular ("1 cloze exportado")');
    ok(await estado() === '3 cartões já estão no Anki e não aparecem no Baralho. Nada novo para exportar.', R + 'Anki dono: tudo exportado — "nada novo para exportar"');
    ok(!(await notaCloze()), R + 'Anki dono: com o cloze já no Anki, a nota do arquivo Cloze sai (a próxima exportação não o leva)');
    // 2d) "desfazer" no aviso: o arquivo não chegou — o cloze volta ao Baralho
    await page.locator('[role="status"] button', { hasText: 'desfazer' }).click();
    await page.clock.runFor(1500);
    ok(await marcados() === 'b1,b2' && /O cartão voltou ao Baralho: a próxima exportação o leva de novo\./.test(await textoDosAvisos(page)) && await notaCloze(),
      R + '"desfazer" no aviso devolve o lote ao Baralho, e a próxima exportação o leva de novo');
    // 2e) exporta de novo e usa o "Trazer de volta" de Ajustes, que fica na tela
    const d4 = await exportar(1);
    await page.clock.runFor(1500);
    ok(d4.length === 1 && d4[0].suggestedFilename() === 'catedra-cloze-lei-seca.txt' && await marcados() === 'b1,b2,z1', R + 'exportado de novo, o cloze volta a sair do Baralho');
    await page.locator('[data-dono-lote] button').click();
    await page.clock.runFor(1500);
    const lote3 = await page.locator('[data-dono-lote] > span').textContent();
    ok(await marcados() === 'b1,b2' && /com 2 cartões/.test(lote3), R + '"Trazer de volta ao Baralho" devolve o lote mais recente; o anterior (os 2 básicos) passa a ser o oferecido');
    const d5 = await exportar(1);
    await page.clock.runFor(1500);
    ok(d5.length === 1 && await marcados() === 'b1,b2,z1' && dialogos.length === 2, R + 'e a exportação seguinte leva só o cloze, ainda sem perguntar');
    const d6 = await exportar(0);
    ok(d6.length === 0 && /Nada novo para exportar: os 3 cartões já estão no Anki\./.test(await textoDosAvisos(page)), R + 'Anki dono: exportar de novo não baixa nada nem duplica no Anki');

    // ---- 3) o Baralho com o Anki dono: tudo no Anki, depois um cartão novo
    await page.evaluate(() => window.__catedraGoView('flashcards'));
    await page.waitForSelector('[data-fc-no-anki]', { timeout: 10000 });
    const vazio = await page.evaluate(() => ({ nums: [...document.querySelectorAll('[aria-labelledby="ct-resumo-baralho"] .ct-design-numeros b')].map(b => b.textContent.trim()).join('/'),
      vazio: /O baralho está vazio/.test((document.querySelector('main') || document.body).innerText || ''), nota: document.querySelector('[data-fc-no-anki]').textContent }));
    ok(vazio.nums === '0/0' && !vazio.vazio && /3 cartões já estão lá e não aparecem aqui; os novos ficam aqui até a próxima exportação/.test(vazio.nota),
      R + 'Anki dono e tudo no Anki: o Baralho explica onde estão os cartões, sem dizer "o baralho está vazio"');
    await page.evaluate(() => { const a = window.__catedraApp;
      a.setState(s => { const f = [{ id: 'b3', front: 'Pergunta nova', back: 'Resposta 3', disc: 'Direito Civil', up: 2000 }, ...s.flashcards]; a._saveFC(f); return { flashcards: f }; }); });
    await page.clock.runFor(300);
    await page.evaluate(MEDIDA);
    const bar = await page.evaluate(() => { const nums = [...document.querySelectorAll('[aria-labelledby="ct-resumo-baralho"] .ct-design-numeros b')].map(b => b.textContent.trim());
      return { nums: nums.join('/'), nota: document.querySelector('[data-fc-no-anki]').textContent, rNota: window.__bm.razao(document.querySelector('[data-fc-no-anki]')),
        fila: window.__catedraApp._fcFila('').map(c => c.id).join(',') }; });
    ok(bar.nums === '1/1' && bar.fila === 'b3', R + 'Anki dono: o Baralho conta e estuda só o cartão ainda não exportado (para estudar/cartões ' + bar.nums + ', fila ' + bar.fila + ')');
    ok(/3 cartões já estão lá e não aparecem aqui/.test(bar.nota) && /escolha o Cátedra em Ajustes › Dados e backup/.test(bar.nota) && bar.rNota >= 4.5,
      R + 'o Baralho diz quantos estão no Anki e como trazê-los de volta (contraste ' + bar.rNota.toFixed(2) + ')');
    ok(await xAnki() === '1 no Baralho · 3 no Anki', R + 'Anki dono: o bloco "Revisão · Anki" do ciclo segue no dia e diz onde estão os cartões');
    await page.evaluate(() => window.__catedraGoView('inicio'));
    await page.waitForSelector('[data-proxima-acao]', { timeout: 10000 });
    ok(await page.locator('[data-fc-vencidas]').count() === 0, R + 'Anki dono: os vencidos exportados não acendem o aviso do Início');

    await irAjustes();
    const d7 = await exportar(1);
    await page.clock.runFor(1500);
    const so7 = d7.length === 1 ? linhas(await ler(d7[0])) : [];
    ok(d7.length === 1 && d7[0].suggestedFilename() === 'catedra-flashcards.txt' && so7.length === 1 && /^Pergunta nova\tResposta 3\t/.test(so7[0]) && dialogos.length === 2,
      R + 'Anki dono: a exportação seguinte leva só o cartão novo, sem repetir os já exportados');

    // ---- 4) de volta ao Cátedra: nenhuma marca se perde e os exportados voltam ao Baralho
    await page.locator('.ct-dono-op[data-dono="app"]').click();
    await page.clock.runFor(1500);
    const volta = await page.evaluate(() => ({ estado: document.querySelector('[data-dono-estado]').textContent,
      gravado: (JSON.parse(localStorage.getItem('catedra:prefs') || '{}')).donoRevisao || 'app',
      marcas: JSON.parse(localStorage.getItem('catedra:fc') || '[]').filter(c => c.exportadoEm > 0).length, lote: document.querySelectorAll('[data-dono-lote]').length }));
    ok(volta.gravado === 'app' && volta.marcas === 4, R + 'voltar ao Cátedra não apaga marca nenhuma (' + volta.marcas + ' cartões seguem marcados)');
    ok(/Os 4 cartões exportados quando o Anki era o dono voltaram ao Baralho, e a marca continua guardada\./.test(volta.estado) && volta.lote === 0,
      R + 'a tela diz que os exportados voltaram ao Baralho (e não oferece desfazer com o Cátedra dono)');
    ok(await notaCloze(), R + 'de volta ao Cátedra, a nota do arquivo Cloze volta (a exportação leva tudo de novo)');
    ok(await xAnki() === '4 cartões no baralho', R + 'Cátedra dono: o bloco do ciclo volta ao texto de sempre');
    await page.evaluate(() => window.__catedraGoView('flashcards'));
    await page.waitForSelector('[aria-labelledby="ct-resumo-baralho"]', { timeout: 10000 });
    const de = await page.evaluate(() => ({ nums: [...document.querySelectorAll('[aria-labelledby="ct-resumo-baralho"] .ct-design-numeros b')].map(b => b.textContent.trim()).join('/'),
      nota: document.querySelectorAll('[data-fc-no-anki]').length }));
    ok(de.nums === '4/4' && de.nota === 0, R + 'Cátedra dono: o Baralho volta a mostrar os 4 cartões (' + de.nums + ')');
    await page.evaluate(() => window.__catedraGoView('inicio'));
    await page.waitForSelector('[data-fc-vencidas]', { timeout: 10000 });
    ok(await page.getAttribute('[data-fc-vencidas]', 'data-fc-vencidas') === '2', R + 'Cátedra dono: o aviso do Início volta a contar os 2 vencidos');
  } finally { await ctx.close(); }
}

async function merge(pageDaSuite, base, ok, R) {
  const { ctx, page } = await novoContexto(pageDaSuite);
  try {
    await page.goto(base + '/tests/sync-fixture.html');
    await page.waitForFunction(() => window.CatedraSync && window.CatedraSync._test, null, { timeout: 15000 });
    await page.addScriptTag({ url: base + '/baralho.js' });
    const r = await page.evaluate(() => {
      const M = window.CatedraSync._test.mergeAll, B = window.CT_BARALHO, J = JSON.stringify;
      const velho = [{ id: 'c1', front: 'f', back: 'b', dueDate: '2026-11-24', up: 1000 }];
      const marcado = B.marcarExportados(velho, ['c1'], 5000);
      const subida = JSON.parse(M({ 'catedra:fc': J(velho) }, { 'catedra:fc': J(marcado) }, true)['catedra:fc'])[0];
      const descida = JSON.parse(M({ 'catedra:fc': J(marcado) }, { 'catedra:fc': J(velho) }, false)['catedra:fc'])[0];
      const devolvido = B.desmarcar(marcado, ['c1'], 6000);
      const volta = JSON.parse(M({ 'catedra:fc': J(marcado) }, { 'catedra:fc': J(devolvido) }, true)['catedra:fc'])[0];
      const p = M({ 'catedra:prefs': J({ donoRevisao: 'app' }), 'catedra:_kts': J({ 'catedra:prefs': 1000 }) },
        { 'catedra:prefs': J({ donoRevisao: 'anki', donoRevisaoEm: 2000 }), 'catedra:_kts': J({ 'catedra:prefs': 2000 }) }, true)['catedra:prefs'];
      return { subida: subida.exportadoEm === 5000, descida: descida.exportadoEm === 5000, volta: !('exportadoEm' in volta) && volta.up === 6000, prefs: JSON.parse(p) };
    });
    ok(r.subida && r.descida, R + 'sincronização: a marca de exportado vence a cópia antiga do outro aparelho, nas duas direções do merge por id');
    ok(r.volta, R + 'sincronização: trazer de volta ao Baralho vence a cópia marcada do outro aparelho');
    ok(r.prefs.donoRevisao === 'anki' && r.prefs.donoRevisaoEm === 2000, R + 'sincronização: a escolha do dono mais nova (e desde quando) vence pelo carimbo da chave catedra:prefs');
  } finally { await ctx.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let falhas = 0, total = 0;
  testarBaralhoDonoRevisaoEstatico((c, m) => { total++; if (!c) { falhas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); });
  console.log(falhas ? ('\nFALHAS: ' + falhas + ' de ' + total) : ('\n' + total + ' verificações passaram'));
  process.exit(falhas ? 1 : 0);
}
