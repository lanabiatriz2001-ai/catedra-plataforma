/* FASE ORAL · resposta gravada no aparelho e janela de 24 h (25/11/2026) — oral-gravacao.js
   Parte 1 (Node, sem navegador): a janela (sortear, liberar, encerrar com conteúdo), os rótulos
   em hora local — num processo filho com o fuso America/Porto_Velho, com a virada de dia e o
   trecho das 20h às 24h em que a data ISO já é "amanhã" —, os pontos do sorteio sem o padrão
   (também sobre o acervo real), o formato do gravador, os motivos de indisponibilidade, os
   limites, as gravações órfãs, o gravador com um MediaRecorder de mentira e os fios no host,
   no sync e no build.
   Parte 2 (navegador): grava, toca ao lado do padrão, persiste no IndexedDB depois de
   recarregar, apaga, a arguição apagada leva o áudio e nenhuma requisição leva o áudio; o
   aviso no lugar do botão no app nativo, sem gravador e com o microfone negado; a janela de
   24 h com relógio fixo em Porto Velho; o merge do sync; contraste, toque e tema escuro medidos.
   Roda sozinho: node tests/oral-gravacao-24h.mjs (só a parte 1). */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARQ = path.join(RAIZ, 'oral-gravacao.js');
const DIA = 24 * 60 * 60 * 1000;

function carregar(janela) {
  const caixa = { window: janela || {} };
  vm.runInNewContext(fs.readFileSync(ARQ, 'utf8'), caixa);
  return caixa.window.CT_ORAL_GRAV;
}

/* Os rótulos são em hora LOCAL do aparelho. Roda num processo filho com o fuso fixo, para
   não trocar o fuso do processo da suíte (o mesmo processo roda todos os outros testes). */
function emFuso(tz, corpo) {
  const prog = "const fs=require('fs'),vm=require('vm');const c={window:{}};"
    + 'vm.runInNewContext(fs.readFileSync(' + JSON.stringify(ARQ) + ",'utf8'),c);"
    + 'const G=c.window.CT_ORAL_GRAV,DIA=864e5;' + corpo;
  const r = spawnSync(process.execPath, ['-e', prog], { env: { ...process.env, TZ: tz }, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(String(r.stderr || '').split('\n').filter(Boolean).slice(-1)[0] || 'processo filho falhou');
  return JSON.parse(r.stdout);
}

const pergunta = (i, extra) => ({ id: 'doc-' + (i % 2), orgao: 'TJ-XX', ano: 2025, cargo: 'Juiz Substituto', banca: 'Banca de teste',
  carreira: 'Magistratura Estadual', disciplina: 'Direito Civil', ponto: String(1 + (i % 2)), questao: String(i + 1),
  enunciado: 'Enunciado secreto número ' + i + '. Explique a posição e o fundamento.',
  padrao: ('Trecho da resposta oficial ' + i + '. ').repeat(12),
  topicos: '4.1 Posse e propriedade. 4.2 Usucapião. \n \nPADRÃO DE RESPOSTA \n \nTrecho da resposta oficial ' + i,
  url: 'https://example.test/prova', ...(extra || {}) });

/* IndexedDB de mentira, só o que a loja usa. `quebrar = n`: as n primeiras conexões já nascem
   caídas (transaction() lança InvalidStateError, como no Safari depois do segundo plano). */
function idbFalso() {
  const estado = { aberturas: 0, quebrar: 0, conexoes: [] }, lojas = { audio: new Map(), meta: new Map() };
  const idb = {
    open() {
      const n = ++estado.aberturas, req = {};
      const d = {
        n, fechada: false, objectStoreNames: { contains: () => true },
        close() { this.fechada = true; },
        transaction() {
          if (n <= estado.quebrar || d.fechada) { const e = new Error('conexão caída'); e.name = 'InvalidStateError'; throw e; }
          const t = { abort() {}, objectStore: (nome) => ({
            put: (v, k) => { lojas[nome].set(k !== undefined ? k : v.id, v); },
            delete: (k) => { lojas[nome].delete(k); },
            // como no IndexedDB de verdade, o pedido responde ANTES de a transação completar:
            // microtarefa para o pedido, tarefa (setTimeout) para o fim — a ordem não depende da carga
            getAll: () => { const q = {}; Promise.resolve().then(() => { q.result = [...lojas[nome].values()]; if (q.onsuccess) q.onsuccess(); }); return q; } }) };
          setTimeout(() => { if (t.oncomplete) t.oncomplete(); }, 0);
          return t;
        }
      };
      estado.conexoes.push(d);
      setTimeout(() => { req.result = d; if (req.onsuccess) req.onsuccess(); }, 0);
      return req;
    }
  };
  return { idb, estado, lojas };
}

export async function testarOralGravacao24hEstatico(ok) {
  const R = 'ORAL GRAVAÇÃO ';
  let G = null;
  try { G = carregar(); } catch (e) { ok(false, R + 'oral-gravacao.js carrega (' + e.message.split('\n')[0] + ')'); return; }
  ok(!!G && typeof G.novaJanela === 'function' && typeof G.gravar === 'function' && !!G.loja, R + 'publica CT_ORAL_GRAV com a janela, o gravador e a loja');

  /* ---------- janela de 24 h ---------- */
  const T = Date.UTC(2026, 10, 25, 18, 5);
  const fila = [pergunta(0), pergunta(1), pergunta(2)];
  ok(G.novaJanela([], { agora: T }) === null && G.novaJanela(null) === null, R + 'sem perguntas não há sorteio guardado');
  const j = G.novaJanela(fila, { agora: T, min: 5, area: 'juridica' });
  ok(j.estado === 'aguardando' && j.sorteadoEm === T && j.liberaEm === T + DIA && j.up === T && j.min === 5 && j.area === 'juridica' && /^janela-/.test(j.id),
    R + 'o sorteio guarda {fila, sorteadoEm, liberaEm = sorteadoEm + 24 h}, com id e carimbo up');
  ok(j.fila !== fila && j.fila.length === 3 && j.fila[2].enunciado === fila[2].enunciado, R + 'a fila guardada é cópia das perguntas inteiras (a arguição usa exatamente estas)');
  ok(G.novaJanela(fila, { agora: T, min: 0 }).min === 3 && G.novaJanela(fila, { agora: T, min: 99 }).min === 15, R + 'tempo por resposta fica entre 1 e 15 min (3 quando ausente)');
  ok(G.pendente(j) && !G.pendente(null) && !G.pendente({ estado: 'aguardando', fila: [], sorteadoEm: 1, liberaEm: 2 }) && !G.pendente({ estado: 'aguardando', fila: [1] }),
    R + 'pendente só com fila e horários; vazio ou corrompido não conta');
  ok(!G.liberada(j, T + DIA - 1) && G.liberada(j, T + DIA) && G.liberada(j, T + 3 * DIA), R + 'a arguição libera exatamente 24 h depois do sorteio, nem um milissegundo antes');
  const des = G.encerrar(j, 'desistida', T + 3600e3);
  ok(des.estado === 'desistida' && !('fila' in des) && des.up === T + 3600e3 && des.encerradaEm === T + 3600e3 && des.sorteadoEm === T && des.id === j.id && !G.pendente(des),
    R + 'desistir grava um registro encerrado, sem a fila e com carimbo novo');
  ok(Object.keys(des).length >= 5, R + 'o registro encerrado TEM conteúdo: no sync "vazio nunca apaga cheio", e um null perderia para o sorteio da nuvem');
  const ini = G.encerrar(j, 'iniciada', T + DIA, { sessaoId: 'oral-9' });
  ok(ini.estado === 'iniciada' && ini.sessaoId === 'oral-9' && !G.pendente(ini), R + 'começar a arguição encerra a janela e guarda a sessão que nasceu dela');

  let semente = 7; const aleatorio = () => { semente = (semente * 16807) % 2147483647; return semente / 2147483647; };
  const pool = Array.from({ length: 12 }, (_, i) => pergunta(i));
  const s5 = G.sortearFila(pool, 5, aleatorio);
  ok(G.sortearFila(pool.slice(0, 2), 3) === null, R + 'acervo com menos perguntas que a quantidade escolhida não sorteia (2 para 3)');
  // a regra da sala desde o PR #282: a quantidade escolhida, nem uma a menos (a regra antiga sortearia 4 e 9)
  ok(G.sortearFila(pool.slice(0, 4), 5, aleatorio) === null && G.sortearFila(pool.slice(0, 9), 10, aleatorio) === null,
    R + 'como na sala: 4 perguntas para 5 escolhidas, ou 9 para 10, não viram um sorteio menor — não há sorteio');
  ok(s5.length === 5 && new Set(s5.map(q => q.enunciado)).size === 5, R + 'sorteio sem repetir pergunta');
  const justo = G.sortearFila(pool.slice(0, 5), 5, aleatorio);
  ok(!!justo && justo.length === 5 && G.sortearFila(pool, 10, aleatorio).length === 10 && G.sortearFila(pool, 3, aleatorio).length === 3,
    R + 'exatamente a quantidade escolhida (3, 5 ou 10), também quando o acervo tem só essa quantidade');

  const pts = G.pontosDaFila([pergunta(0), pergunta(2), pergunta(1)]);
  ok(pts.length === 2 && pts[0].titulo === 'Direito Civil' && /Ponto 1 · TJ-XX · 2025 · Juiz Substituto · 2 perguntas/.test(pts[0].detalhe), R + 'pontos agrupados por disciplina, ponto e concurso, com a contagem de perguntas');
  ok(pts.every(p => p.topicos === '4.1 Posse e propriedade. 4.2 Usucapião.'), R + 'o programa do ponto aparece cortado antes de "PADRÃO DE RESPOSTA"');
  const tudo = JSON.stringify(pts);
  ok(!/Enunciado secreto|Trecho da resposta oficial|PADR/.test(tudo), R + 'nada do enunciado nem do padrão aparece durante a janela');

  // o acervo real: 391 itens trazem o começo do padrão emendado no programa
  try {
    const caixa = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(RAIZ, 'oral-conteudo.js'), 'utf8'), caixa);
    const Q = caixa.window.CT_ORAL_Q || [];
    const comPadrao = Q.filter(q => /PADR[ÃA]O DE RESPOSTA/.test(q.topicos || '')).length;
    const reais = G.pontosDaFila(Q);
    const inicios = Q.map(q => String(q.padrao || '').replace(/\s+/g, ' ').trim().slice(0, 40)).filter(s => s.length === 40);
    const vaza = reais.filter(p => /PADR[ÃA]O/.test(p.topicos) || inicios.some(s => p.topicos.includes(s)));
    ok(Q.length > 900 && comPadrao > 300 && reais.length > 50 && vaza.length === 0,
      R + 'no acervo real (' + Q.length + ' perguntas, ' + comPadrao + ' com o padrão emendado no programa) nenhum ponto mostra o padrão (' + vaza.length + ')');
  } catch (e) { ok(false, R + 'acervo real lido (' + e.message.split('\n')[0] + ')'); }

  /* ---------- rótulos em hora local ---------- */
  try {
    const t = (d, h, m) => Date.UTC(2026, 10, d, h + 4, m);   // hora de Porto Velho (UTC−4) → instante
    const corpo = 'const T=' + t(25, 14, 5) + ',S=' + t(25, 23, 30) + ';'
      + "const j=G.novaJanela([{id:'a'}],{agora:T}),s=G.novaJanela([{id:'b'}],{agora:S});"
      + 'process.stdout.write(JSON.stringify({'
      + 'noSorteio:G.rotuloLiberacao(j,T),sorteio:G.rotuloSorteio(j,T),'
      + 'as22:G.rotuloLiberacao(j,' + t(25, 22, 0) + '),madrugada:G.rotuloLiberacao(j,' + t(26, 0, 10) + '),'
      + 'antes:[G.liberada(j,' + (t(26, 14, 5) - 1000) + '),G.rotuloLiberacao(j,' + (t(26, 14, 5) - 1000) + ')],'
      + 'naHora:[G.liberada(j,' + t(26, 14, 5) + '),G.rotuloLiberacao(j,' + t(26, 14, 5) + ')],'
      + 'depois:[G.rotuloLiberacao(j,' + t(27, 10, 0) + '),G.rotuloSorteio(j,' + t(27, 10, 0) + ')],'
      + 'virada:[G.rotuloLiberacao(s,S),G.rotuloLiberacao(s,' + t(26, 0, 30) + '),G.rotuloSorteio(s,' + t(26, 0, 30) + ')],'
      + 'quando:G.quando(' + t(26, 0, 30) + ',' + t(25, 23, 30) + ')}))';
    const pv = emFuso('America/Porto_Velho', corpo);
    ok(pv.noSorteio === 'Arguição liberada amanhã às 14:05' && pv.sorteio === 'Sorteado hoje às 14:05',
      R + 'Porto Velho: sorteio às 14:05 diz "' + pv.noSorteio + '"');
    ok(pv.as22 === 'Arguição liberada amanhã às 14:05', R + 'Porto Velho às 22:00 do mesmo dia ainda diz "amanhã" (a data ISO já seria a de amanhã): "' + pv.as22 + '"');
    ok(pv.madrugada === 'Arguição liberada hoje às 14:05', R + 'virou o dia: às 00:10 diz "hoje às 14:05"');
    ok(pv.antes[0] === false && pv.antes[1] === 'Arguição liberada hoje às 14:05' && pv.naHora[0] === true && pv.naHora[1] === 'Arguição liberada desde hoje às 14:05',
      R + 'um segundo antes continua fechada; na hora, "liberada desde hoje às 14:05"');
    ok(pv.depois[0] === 'Arguição liberada desde ontem às 14:05' && pv.depois[1] === 'Sorteado em 25/11 às 14:05', R + 'dias depois: "desde ontem" e a data do sorteio');
    ok(pv.virada[0] === 'Arguição liberada amanhã às 23:30' && pv.virada[1] === 'Arguição liberada hoje às 23:30' && pv.virada[2] === 'Sorteado ontem às 23:30',
      R + 'sorteio às 23:30: "amanhã" na hora; 1 h depois, já no outro dia, "hoje" e "sorteado ontem"');
    ok(pv.quando.dia === 'amanhã' && pv.quando.relativo === true && pv.quando.hora === '00:30', R + 'quando() devolve dia relativo e hora local');
    const sp = emFuso('America/Sao_Paulo', 'const j=G.novaJanela([{id:"a"}],{agora:' + t(25, 14, 5) + '});process.stdout.write(JSON.stringify(G.rotuloLiberacao(j,' + t(25, 14, 5) + ')))');
    ok(sp === 'Arguição liberada amanhã às 15:05', R + 'o mesmo instante em São Paulo (UTC−3) aparece na hora de lá: "' + sp + '"');
  } catch (e) { ok(false, R + 'rótulos por fuso (' + e.message + ')'); }

  /* ---------- gravação: regras puras ---------- */
  const chrome = (t) => /^audio\/webm/.test(t), safari = (t) => t === 'audio/mp4';
  const toca = (t) => (t === 'audio/webm' || t === 'audio/mp4') ? 'maybe' : '';
  ok(G.escolherTipo(chrome, toca) === 'audio/webm;codecs=opus', R + 'Chrome: grava audio/webm;codecs=opus');
  ok(G.escolherTipo(safari, toca) === 'audio/mp4', R + 'Safari/WebKit: grava audio/mp4');
  ok(G.escolherTipo(() => true, (t) => t === 'audio/mp4' ? 'maybe' : '') === 'audio/mp4', R + 'formato que o <audio> do aparelho não toca é pulado');
  ok(G.escolherTipo(() => false, toca) === '' && G.escolherTipo(() => { throw new Error('x'); }, toca) === '', R + 'nenhum formato da lista: o gravador usa o padrão do navegador');

  const base = { temMediaRecorder: true, temGetUserMedia: true, temIndexedDB: true };
  ok(G.suporte(base).ok === true && G.suporte(base).motivo === '', R + 'com gravador, microfone e IndexedDB o botão aparece');
  const mot = (a) => G.suporte({ ...base, ...a });
  ok(!mot({ nativo: true }).ok && /app do Mac e do iPad/.test(mot({ nativo: true }).motivo), R + 'no app nativo: aviso, sem tentar o microfone');
  ok(!mot({ seguro: false }).ok && /conexão segura/.test(mot({ seguro: false }).motivo), R + 'página sem conexão segura: aviso');
  ok(/não grava áudio/.test(mot({ temMediaRecorder: false }).motivo) && /não grava áudio/.test(mot({ temGetUserMedia: false }).motivo), R + 'sem MediaRecorder ou getUserMedia: "este navegador não grava áudio"');
  ok(/guardar o áudio/.test(mot({ temIndexedDB: false }).motivo), R + 'sem IndexedDB: aviso de que não dá para guardar');
  ok(/bloqueado/.test(mot({ falha: 'negado' }).motivo) && /nenhum microfone/.test(mot({ falha: 'sem-microfone' }).motivo) && /não abriu/.test(mot({ falha: 'erro' }).motivo),
    R + 'microfone negado, ausente ou com erro: cada um com o seu porquê');
  ok(Object.values(G.MOTIVOS).every(m => /^Gravação indisponível/.test(m) && m.length <= 200), R + 'todo aviso começa por "Gravação indisponível" e cabe em duas linhas');
  const err = (n) => Object.assign(new Error('x'), { name: n });
  ok(G.falhaDoErro(err('NotAllowedError')) === 'negado' && G.falhaDoErro(err('SecurityError')) === 'negado' && G.falhaDoErro(err('NotFoundError')) === 'sem-microfone' && G.falhaDoErro(err('AbortError')) === 'erro',
    R + 'o erro do getUserMedia vira o motivo certo');
  ok(G.chave('oral-1', 2) === 'oral-1|2' && G.idxDoRegistro({ id: 'doc-a#3' }) === 3 && G.idxDoRegistro({ id: 'doc#b#4' }) === 4 && G.idxDoRegistro({ id: 'sem' }) === -1,
    R + 'chave = sessão da arguição + índice da pergunta (o índice sai do id do registro)');
  ok(G.LIMITES.segPorResposta === 600 && G.LIMITES.bytesPorResposta === 12 * 1024 * 1024 && G.LIMITES.bytesTotal === 100 * 1024 * 1024 && G.LIMITES.bitsPorSegundo === 32000,
    R + 'limites conservadores: 10 min e 12 MB por resposta, 100 MB no aparelho, 32 kbit/s pedidos');
  ok(G.cabe(99 * 1024 * 1024) && !G.cabe(100 * 1024 * 1024), R + 'passou de 100 MB, não grava outra');
  ok(G.duracao(65) === '1:05' && G.duracao(0) === '0:00' && G.tamanho(12 * 1024 * 1024) === '12 MB' && G.tamanho(1.5 * 1024 * 1024) === '1,5 MB', R + 'duração e tamanho em português');
  const lista = [{ id: 's1|0', sessaoId: 's1', conta: 'c', area: 'juridica' }, { id: 's2|0', sessaoId: 's2', conta: 'c', area: 'juridica' },
    { id: 's3|0', sessaoId: 's3', conta: 'outra', area: 'juridica' }, { id: 's4|0', sessaoId: 's4', conta: 'c', area: 'saude' }];
  ok(G.orfas(lista, { conta: 'c', area: 'juridica', vivos: {} }).length === 0, R + 'sem nenhuma sessão viva conhecida, nada é apagado como órfão');
  ok(JSON.stringify(G.orfas(lista, { conta: 'c', area: 'juridica', vivos: { s1: 1 } })) === '["s2|0"]', R + 'órfã é só a da mesma conta e área cuja arguição sumiu');

  /* ---------- gravação: o gravador, com MediaRecorder de mentira ---------- */
  try {
    const tiques = [], relogio = { t: 0 };
    const W = { setInterval: (f) => { tiques.push(f); return tiques.length; }, clearInterval: (id) => { if (id) tiques[id - 1] = null; }, Blob };
    const GG = carregar(W);
    const passa = (ms) => { relogio.t += ms; tiques.slice().forEach(f => f && f()); };
    let soltas = 0, pedido = null;
    const md = { getUserMedia: (c) => { pedido = c; return Promise.resolve({ getTracks: () => [{ stop: () => { soltas++; } }] }); } };
    const feitos = [];
    function MR(fluxo, op) { if (op && op.mimeType === 'audio/recusado') throw new Error('tipo'); this.op = op || null; this.state = 'inactive'; this.mimeType = (op && op.mimeType) || 'audio/padrao'; feitos.push(this); }
    MR.prototype.start = function (n) { this.state = 'recording'; this.fatia = n; };
    MR.prototype.pause = function () { this.state = 'paused'; };
    MR.prototype.resume = function () { this.state = 'recording'; };
    MR.prototype.stop = function () { this.state = 'inactive'; if (this.ondataavailable) this.ondataavailable({ data: new Blob(['x'.repeat(100)]) }); if (this.onstop) this.onstop(); };
    const agora = () => relogio.t;
    let fim = null;
    const c = await GG.gravar({ md, MR, tipo: 'audio/webm;codecs=opus', agora, aoTerminar: (r) => { fim = r; } });
    ok(!!pedido && pedido.audio === true && !pedido.video, R + 'pede só o microfone: getUserMedia({audio:true})');
    ok(feitos[0].op.mimeType === 'audio/webm;codecs=opus' && feitos[0].op.audioBitsPerSecond === 32000 && feitos[0].fatia === 1000, R + 'o gravador recebe o formato escolhido, 32 kbit/s e fatias de 1 s');
    passa(1000); passa(1000);
    ok(Math.round(c.seg()) === 2 && c.estado() === 'recording', R + 'o tempo corre enquanto grava');
    ok(c.pausar() === true && c.estado() === 'paused', R + 'pausar a conversa pausa a gravação (o arquivo segue um só)');
    passa(5000);
    ok(Math.round(c.seg()) === 2, R + 'o tempo pausado não conta');
    ok(c.retomar() === true && c.estado() === 'recording', R + 'retomar continua a mesma gravação');
    passa(1000);
    c.parar('manual');
    ok(!!fim && fim.motivo === 'manual' && fim.dur === 3 && fim.bytes === 100 && fim.blob.size === 100 && fim.mime === 'audio/webm;codecs=opus', R + 'parar entrega o áudio, a duração sem a pausa e o formato');
    ok(soltas === 1 && c.estado() === 'inactive', R + 'o microfone é solto assim que a gravação termina');
    relogio.t += 5000;
    ok(Math.round(c.seg()) === 3, R + 'parada, o tempo congela (a tela não segue contando o que não grava): ' + Math.round(c.seg()) + ' s');
    fim = null;
    const c2 = await GG.gravar({ md, MR, agora, aoTerminar: (r) => { fim = r; } });
    passa(GG.LIMITES.segPorResposta * 1000);
    ok(!!fim && fim.motivo === 'limite' && fim.dur === 600 && c2.estado() === 'inactive', R + 'chegou a 10 min: para sozinha e guarda o que gravou');
    fim = null;
    await GG.gravar({ md, MR, agora, limites: { ...GG.LIMITES, bytesPorResposta: 50 }, aoTerminar: (r) => { fim = r; } });
    feitos[feitos.length - 1].ondataavailable({ data: new Blob(['y'.repeat(60)]) });
    ok(!!fim && fim.motivo === 'bytes', R + 'passou do limite de bytes por resposta: para sozinha');
    fim = null;
    const c4 = await GG.gravar({ md, MR, tipo: 'audio/recusado', agora, aoTerminar: (r) => { fim = r; } });
    ok(feitos[feitos.length - 1].op === null, R + 'formato recusado pelo gravador: tenta de novo sem opções');
    c4.parar('manual');
    ok(!!fim && fim.mime === 'audio/padrao', R + '…e o áudio sai no formato que o navegador escolheu');
    // o sistema para o gravador sem ninguém pedir (trilha encerrada, fone desligado)
    fim = null;
    const c5 = await GG.gravar({ md, MR, agora, aoTerminar: (r) => { fim = r; } });
    passa(2000);
    feitos[feitos.length - 1].stop();
    ok(!!fim && fim.motivo === 'interrompida' && fim.dur === 2 && c5.estado() === 'inactive', R + 'o gravador parou sem o host pedir: motivo "interrompida", não "manual" (' + (fim && fim.motivo) + ')');
    passa(4000);
    ok(Math.round(c5.seg()) === 2, R + '…e o tempo para ali');
    let aoAcabar = null;
    const md2 = { getUserMedia: () => Promise.resolve({ getTracks: () => [{ stop: () => { soltas++; }, addEventListener: (n, f) => { if (n === 'ended') aoAcabar = f; } }] }) };
    fim = null;
    const c6 = await GG.gravar({ md: md2, MR, agora, aoTerminar: (r) => { fim = r; } });
    passa(1000);
    if (aoAcabar) aoAcabar();
    ok(!!aoAcabar && !!fim && fim.motivo === 'interrompida' && c6.estado() === 'inactive', R + 'a trilha do microfone acabou (evento ended): a gravação para e guarda o trecho');
    function MRNaoInicia(f, op) { MR.call(this, f, op); }
    MRNaoInicia.prototype = Object.create(MR.prototype);
    MRNaoInicia.prototype.start = function () { throw err('NotSupportedError'); };
    const soltasAntes = soltas; let erroStart = null;
    try { await GG.gravar({ md, MR: MRNaoInicia, agora }); } catch (e) { erroStart = e; }
    ok(!!erroStart && soltas === soltasAntes + 1, R + 'start() que lança rejeita e solta o microfone (o indicador não fica aceso)');
    let erro = null;
    try { await GG.gravar({ md: { getUserMedia: () => Promise.reject(err('NotAllowedError')) }, MR, agora }); } catch (e) { erro = e; }
    ok(!!erro && GG.falhaDoErro(erro) === 'negado', R + 'microfone negado rejeita a promessa (a tela troca o botão pelo motivo)');
    ok(GG.falhaDoErro(err('NotReadableError')) === 'erro', R + 'microfone ocupado por outro app (NotReadableError) é tropeço passageiro, não recusa');
    const buf = await GG.paraBuffer(new Blob(['abc']));
    ok(buf && buf.byteLength === 3, R + 'o áudio vai ao IndexedDB como ArrayBuffer (o WebKit antigo não guardava Blob)');
  } catch (e) { ok(false, R + 'gravador de mentira (' + e.message.split('\n')[0] + ')'); }

  /* ---------- IndexedDB: a conexão que cai (Safari do iPad em segundo plano) ---------- */
  try {
    const f = idbFalso(), GI = carregar({ indexedDB: f.idb, setInterval, clearInterval, Blob });
    const meta = { id: 's|0', sessaoId: 's', idx: 0, conta: '', area: 'juridica', mime: 'audio/mp4', dur: 1, bytes: 3, criadoEm: 1 };
    f.estado.quebrar = 1;   // a 1ª conexão já nasce caída: transaction() lança InvalidStateError
    const guardou = await GI.loja.guardar(meta, new Uint8Array([1, 2, 3]).buffer);
    ok(guardou === true && f.estado.aberturas === 2 && f.lojas.meta.has('s|0'), R + 'conexão caída: abre outra e guarda na mesma operação (' + f.estado.aberturas + ' aberturas)');
    f.estado.conexoes[1].onclose();
    const lista = await GI.loja.resumo();
    ok(f.estado.aberturas === 3 && lista.length === 1, R + 'conexão fechada pelo sistema (onclose): a próxima operação abre outra');
    f.estado.conexoes[2].onversionchange();
    await GI.loja.total();
    ok(f.estado.conexoes[2].fechada === true && f.estado.aberturas === 4, R + 'versão nova pedida por outra aba: fecha a conexão e reabre depois');
  } catch (e) { ok(false, R + 'IndexedDB de mentira (' + e.message.split('\n')[0] + ')'); }

  /* ---------- tocador: o webm do Chrome sem duração ---------- */
  try {
    const tocador = (dentro, dur) => {
      const ouvintes = {};
      return { tagName: 'AUDIO', duration: dur, _t: 0, ouvintes, closest: (s) => (dentro && s === '.ct-oral-audio') ? {} : null,
        addEventListener(n, fn) { (ouvintes[n] = ouvintes[n] || []).push(fn); },
        removeEventListener(n, fn) { ouvintes[n] = (ouvintes[n] || []).filter(x => x !== fn); },
        get currentTime() { return this._t; },
        set currentTime(v) { this._t = v; if (v > 1e100) { this.duration = 4.2; (ouvintes.durationchange || []).slice().forEach(fn => fn()); } } };
    };
    const a = tocador(true, Infinity);
    G.consertarDuracao({ target: a });
    const soltos = !(a.ouvintes.durationchange || []).length && !(a.ouvintes.timeupdate || []).length;
    ok(a.duration === 4.2 && a.currentTime === 0 && soltos, R + 'webm sem duração (Infinity): pede o fim, o navegador mede (' + a.duration + ' s) e o tocador volta ao começo');
    const fora = tocador(false, Infinity), mp4 = tocador(true, 7);
    G.consertarDuracao({ target: fora }); G.consertarDuracao({ target: mp4 });
    ok(fora.currentTime === 0 && fora.duration === Infinity && mp4.duration === 7 && !(mp4.ouvintes.durationchange || []).length, R + 'só mexe nos tocadores das gravações e só quando falta a duração');
    // o molde não traz src no <audio>: a URL vem em data-grav-src e só o blob da gravação vira src,
    // depois de montar; a mesma URL não recarrega o tocador
    const doMolde = (url) => { const at = { 'data-grav-src': url }; let trocas = 0;
      return { at, get trocas() { return trocas; }, getAttribute: (n) => (n in at ? at[n] : null), setAttribute(n, v) { at[n] = String(v); if (n === 'src') trocas++; } }; };
    const tBlob = doMolde('blob:http://localhost/abc'), tLiteral = doMolde('{{ argGravUrl }}'), tVazio = doMolde(''), tFora = doMolde('https://example.test/a.mp4');
    const raiz = { querySelectorAll: (s) => s === '.ct-oral-audio audio[data-grav-src]' ? [tBlob, tLiteral, tVazio, tFora] : [] };
    const n1 = G.ligarTocadores(raiz), n2 = G.ligarTocadores(raiz);
    tBlob.at['data-grav-src'] = 'blob:http://localhost/nova';
    const n3 = G.ligarTocadores(raiz);
    ok(n1 === 1 && n2 === 0 && n3 === 1 && tBlob.at.src === 'blob:http://localhost/nova' && tBlob.trocas === 2 && !('src' in tLiteral.at) && !('src' in tVazio.at) && !('src' in tFora.at),
      R + 'o tocador só ganha src com o blob da gravação; a mesma URL não recarrega, a nova (gravar de novo) troca; o literal "{{ }}", o vazio e o endereço de fora nunca viram src');
    ok(G.ligarTocadores() === 0, R + 'sem documento (Node), ligar os tocadores não quebra');
  } catch (e) { ok(false, R + 'tocador de mentira (' + e.message.split('\n')[0] + ')'); }

  /* ---------- fios no host, no sync e no build ---------- */
  const ler = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
  const host = ler('Catedra.dc.html'), auth = ler('auth.js'), build = ler('scripts/build.mjs'), buildMac = ler('scripts/build-macos.mjs');
  const auto = (host.match(/_autosaveKeys\(\)\{[^}]*\}/) || [''])[0];
  ok(auto.includes("'oralJanela'"), R + 'oralJanela está no _autosaveKeys (persiste e é reidratada pela mesma lista)');
  const areaPropria = (host.match(/AREA_PROPRIA = new Set\(\[[\s\S]*?\]\)/) || [''])[0];
  ok(areaPropria.includes("'oralJanela'"), R + 'oralJanela é do caderno da área (AREA_PROPRIA), como as sessions em que a arguição grava');
  ok(/_vazioDe\(k\)\{\s*if\(\[[^\]]*'oralJanela'[^\]]*\]\.includes\(k\)\) return null;/.test(host), R + 'na troca de área o vazio de oralJanela é null');
  const exclude = (auth.match(/var EXCLUDE = \{[\s\S]*?\};/) || [''])[0];
  ok(exclude.length > 100 && !exclude.includes('oralJanela'), R + 'catedra:oralJanela sincroniza: fora do EXCLUDE do auth.js');
  const arrayId = (auth.match(/var ARRAY_ID = \{[^}]*\}/) || [''])[0];
  ok(arrayId.length > 50 && !arrayId.includes('oralJanela'), R + 'é objeto, não lista: fora do ARRAY_ID (vence o carimbo mais novo da chave)');
  ok(/<script src="\.\/oral-gravacao\.js"><\/script>/.test(host), R + 'o host carrega oral-gravacao.js por <script> (funciona em file://)');
  // O parser do navegador cria os elementos do molde cru (<x-dc>) antes de o runtime montar o app:
  // um src="{{ … }}" ali começa a carregar a URL literal (o <audio> da gravação a pediu no WebKit do
  // Linux, CI do PR #273). Âncora da própria página (href="#ct-i-…" do <use>) não busca nada.
  const moldeCru = host.slice(host.indexOf('<x-dc>'), host.lastIndexOf('</x-dc>'));
  const buscam = [...moldeCru.matchAll(/<(audio|video|source|img|iframe|frame|embed|object|track|script|link|input|use|image)\b[^>]*?\s(src|srcset|poster|data|href|xlink:href)\s*=\s*("[^"]*\{\{[^"]*"|'[^']*\{\{[^']*'|[^\s"'>]*\{\{[^\s>]*)/gi)]
    .filter(m => !/^["']?#/.test(m[3])).map(m => '<' + m[1] + ' ' + m[2] + '=' + m[3] + '>');
  ok(moldeCru.length > 100000 && buscam.length === 0,
    R + 'no molde cru, nenhum elemento que busca recurso tem {{ }} no endereço (o parser o criaria com a URL literal): ' + (buscam.join(' · ') || 'nenhum'));
  const copiar = (build.match(/const COPIAR = \[[^\]]*\]/) || [''])[0];
  ok(copiar.includes("'oral-gravacao.js'") && /'\.\/oral-gravacao\.js'/.test(build), R + 'build do site: na lista COPIAR e na pré-carga do app instalado');
  ok(/for \(const f of \[[^\]]*'oral-gravacao\.js'/.test(buildMac), R + 'bundle nativo: na lista de cópia do build-macos (o iPad e o Windows saem dele)');
  const fonte = ler('oral-gravacao.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|\/api\/|localStorage|https?:/.test(fonte), R + 'o módulo não fala com a rede nem grava no localStorage');
}

/* ================================ Parte 2: navegador ================================ */
const MARCA = 'CATEDRA-AUDIO-FALSO-7f3a';

/* MediaRecorder e getUserMedia de mentira: a "gravação" é um Blob pequeno com uma marca, para
   provar que nenhum pedido de rede leva o áudio. O cenário vem do sessionStorage, que
   atravessa o recarregamento: normal, nativo (ponte catedraNav), semGravador e negado. */
function instalarFalsos({ MARCA, safari }) {
  const cen = sessionStorage.getItem('__cenarioGrav') || 'normal';
  // segurar: o microfone só abre quando o teste chama window.__grav.soltar() (permissão demorando)
  window.__grav = { aberturas: 0, soltas: 0, mimes: [], bits: null, falharProxima: '', segurar: false, soltar: null };
  // voz da banca de mentira: a leitura só termina quando o teste chama window.__voz.onend()
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  try { Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { cancel() {}, speak(u) { window.__voz = u; } } }); } catch (e) {}
  if (cen === 'nativo') {
    try { Object.defineProperty(window, 'webkit', { configurable: true, value: { messageHandlers: { catedraNav: { postMessage() {} } } } }); } catch (e) {}
  }
  if (cen === 'semGravador') {
    try { Object.defineProperty(window, 'MediaRecorder', { configurable: true, writable: true, value: undefined }); } catch (e) {}
    return;
  }
  const fluxo = () => ({ getTracks: () => [{ stop: () => { window.__grav.soltas++; } }] });
  const gum = () => {
    window.__grav.aberturas++;
    if (cen === 'negado') { const e = new Error('Permissão negada'); e.name = 'NotAllowedError'; return Promise.reject(e); }
    // um tropeço só (microfone ocupado por outro app): a próxima tentativa abre
    if (window.__grav.falharProxima) { const e = new Error('Microfone ocupado'); e.name = window.__grav.falharProxima; window.__grav.falharProxima = ''; return Promise.reject(e); }
    if (window.__grav.segurar) return new Promise((r) => { window.__grav.soltar = () => { window.__grav.soltar = null; r(fluxo()); }; });
    return Promise.resolve(fluxo());
  };
  try { Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: gum } }); } catch (e) {}
  class MRFalso {
    constructor(f, op) { this.mimeType = (op && op.mimeType) || ''; this.state = 'inactive'; window.__grav.mimes.push(this.mimeType); window.__grav.bits = op && op.audioBitsPerSecond; window.__mrUltimo = this; }
    start() { this.state = 'recording'; }
    pause() { this.state = 'paused'; }
    resume() { this.state = 'recording'; }
    entregar() {
      const b = new Blob([MARCA + '-'.repeat(4000)], { type: this.mimeType || 'audio/webm' });
      setTimeout(() => { if (this.ondataavailable) this.ondataavailable({ data: b }); if (this.onstop) this.onstop(); }, 0);
    }
    stop() { if (this.state === 'inactive') return; this.state = 'inactive'; this.entregar(); }
    // o sistema encerra o gravador sem o app pedir (fone desligado, trilha do microfone acabou)
    pararSozinho() { if (this.state === 'inactive') return; this.state = 'inactive'; this.entregar(); }
  }
  MRFalso.isTypeSupported = (t) => safari ? /^audio\/mp4/.test(t) : /^audio\/webm/.test(t);
  try { Object.defineProperty(window, 'MediaRecorder', { configurable: true, writable: true, value: MRFalso }); } catch (e) { window.MediaRecorder = MRFalso; }
}

/* Vigia cada <audio> que entra no documento — também os que o PARSER do navegador cria a partir do
   molde cru (<x-dc>), antes de o runtime montar o app — e relata cada seleção de recurso (loadstart)
   com o endereço usado. Um src="{{ … }}" no molde aparece aqui em qualquer motor, mesmo onde o
   preload="none" segura o pedido de rede (Chrome e Safari do Mac seguram; o WebKit do Linux, na CI
   do PR #273, pediu a URL literal). */
function vigiarTocadores() {
  const engancha = (a) => {
    if (a.__ctVigiado) return;
    a.__ctVigiado = true;
    a.addEventListener('loadstart', () => { try { window.__ctMidia({ src: a.getAttribute('src') || '', atual: a.currentSrc || '' }); } catch (e) {} });
  };
  new MutationObserver((rs) => rs.forEach((r) => r.addedNodes.forEach((n) => {
    if (n.nodeType !== 1) return;
    if (n.tagName === 'AUDIO') engancha(n);
    if (n.querySelectorAll) n.querySelectorAll('audio').forEach(engancha);
  }))).observe(document, { childList: true, subtree: true });
}

async function contexto(pageDaSuite, op = {}) {
  const ctx = await pageDaSuite.context().browser().newContext({
    viewport: op.viewport || { width: 820, height: 1180 }, hasTouch: op.toque !== false, locale: 'pt-BR',
    ...(op.fuso ? { timezoneId: op.fuso } : {}) });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('dialog', d => d.accept().catch(() => {}));
  if (op.hora != null) await page.clock.install({ time: op.hora });
  return { ctx, page, erros };
}
async function semear(page, base, extra) {
  await page.goto(base + '/__semente');
  await page.evaluate((extra) => {
    localStorage.clear();
    const set = (k, v) => localStorage.setItem('catedra:' + k, v);
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', '"juridica"');
    Object.keys(extra || {}).forEach(k => set(k, extra[k]));
  }, extra || {});
}
const esperarApp = (page) => page.waitForFunction(() => window.__catedraApp && typeof window.__catedraGoView === 'function', null, { timeout: 45000 });
/* Abre a Oral e, depois que o acervo real chegou (senão ele sobrescreve), troca as perguntas
   por um conjunto conhecido — o mesmo caminho do tests/oral-sala.mjs. */
async function abrirOral(page, base, arquivo) {
  await page.goto(base + '/' + (arquivo || 'Catedra.dc.html'));
  await esperarApp(page);
  await page.evaluate(() => window.__catedraGoView('oral'));
  await page.getByRole('region', { name: 'Preparar arguição' }).waitFor({ timeout: 20000 });
  await page.waitForFunction(() => window.__catedraApp.state.oralQPronto && document.querySelectorAll('[aria-label="Carreira da arguição"] option').length > 1, null, { timeout: 45000 });
  const Q = Array.from({ length: 10 }, (_, i) => pergunta(i));
  await page.evaluate((Q) => { window.CT_ORAL_Q = Q; window.__catedraApp.setState({ oralQPronto: true, oralBancasPronto: true, oralQDisc: '', oralQCarr: '', argVoz: false }); }, Q);
}
const estado = (page, f) => page.evaluate(f);
/* Mede o que pinta: caixa, cor do texto sobre o fundo efetivo (camadas compostas até o
   primeiro fundo opaco) convertidas por canvas — vale para rgb(), color(srgb) e oklab(). */
const medir = (page, sel) => page.evaluate((sel) => {
  const e = document.querySelector(sel); if (!e) return null;
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const x = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { x.clearRect(0, 0, 1, 1); x.fillStyle = 'rgba(0,0,0,0)'; x.fillStyle = c; x.fillRect(0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const camadas = [];
  for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c[3] > 0) { camadas.push(c); if (c[3] >= 0.99) break; } }
  let f = [255, 255, 255];
  for (let i = camadas.length - 1; i >= 0; i--) { const c = camadas[i]; f = [0, 1, 2].map(k => c[k] * c[3] + f[k] * (1 - c[3])); }
  const t0 = rgba(getComputedStyle(e).color), t = [0, 1, 2].map(k => t0[k] * t0[3] + f[k] * (1 - t0[3]));
  const lum = (c) => { const g = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * g(c[0]) + 0.7152 * g(c[1]) + 0.0722 * g(c[2]); };
  const a = lum(t), b = lum(f), r = e.getBoundingClientRect(), cs = getComputedStyle(e);
  return { w: r.width, h: r.height, texto: e.textContent.replace(/\s+/g, ' ').trim(), contraste: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
    animacao: cs.animationName, visivel: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' };
}, sel);
const fmt = (m) => m ? (Math.round(m.w) + '×' + Math.round(m.h) + ', ' + m.contraste.toFixed(2) + ':1') : 'ausente';
/* A tipografia do nó que PINTA o texto: o runtime embrulha cada {{ }} num <span class="sc-interp">,
   e uma regra de span pode pegá-lo sem pegar o pai (foi assim que o título perdeu o negrito). */
const pintado = (page, sel) => page.evaluate((sel) => {
  const e = document.querySelector(sel); if (!e) return null;
  const n = e.querySelector('.sc-interp') || e, cs = getComputedStyle(n);
  return { peso: parseInt(cs.fontWeight, 10), tam: parseFloat(cs.fontSize), texto: n.textContent.replace(/\s+/g, ' ').trim() };
}, sel);
const tipo = (t) => t ? (t.peso + '/' + t.tam + 'px') : 'ausente';
/* Topo do alvo e fundo da barra fixa, depois que a rolagem (suave) assenta. */
const sobBarra = (page, sel) => page.evaluate(async (sel) => {
  const el = document.querySelector(sel), cab = document.querySelector('.ct-topbar');
  if (!el) return null;
  let ant = NaN;
  for (let i = 0; i < 60; i++) { await new Promise(r => setTimeout(r, 50)); const y = el.getBoundingClientRect().top; if (Math.abs(y - ant) < 0.5) break; ant = y; }
  // a margem de rolagem do tamanho da barra é o que impede o alvo de parar por baixo dela
  return { topo: Math.round(el.getBoundingClientRect().top), barra: Math.round(cab ? cab.getBoundingClientRect().bottom : 0),
    margem: Math.round(parseFloat(getComputedStyle(el).scrollMarginTop) || 0), altura: Math.round(cab ? cab.getBoundingClientRect().height : 0) };
}, sel);
const abaixoDaBarra = (p) => !!p && p.topo >= p.barra - 1 && p.altura > 0 && Math.abs(p.margem - p.altura) <= 1;
const fmtBarra = (p) => p ? ('topo ' + p.topo + ' px, barra até ' + p.barra + ' px, margem de rolagem ' + p.margem + ' px') : 'ausente';
/* CT_CAPTURA_DIR=pasta guarda a captura das telas medidas, para olhar (como no oral-sala). */
async function capturar(page, sel, nome) {
  const dir = process.env.CT_CAPTURA_DIR; if (!dir) return;
  try { fs.mkdirSync(dir, { recursive: true }); await page.locator(sel).first().screenshot({ path: path.join(dir, nome + '.png') }); } catch (e) { console.log('captura ' + nome + ' falhou: ' + e.message.split('\n')[0]); }
}
/* Lê o banco das gravações sem criá-lo: se ele ainda não existe, a abertura é abortada no
   onupgradeneeded (criar aqui deixaria o banco sem lojas para o app). */
const lerIdb = (page) => page.evaluate(() => new Promise((ok) => {
  const r = indexedDB.open('catedra-oral-gravacoes');
  r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (e) {} };
  r.onerror = () => ok([]);
  r.onsuccess = () => {
    const d = r.result;
    if (!d.objectStoreNames.contains('meta')) { d.close(); ok([]); return; }
    const t = d.transaction(['meta', 'audio'], 'readonly'), out = [];
    const q = t.objectStore('meta').getAll();
    q.onsuccess = () => (q.result || []).forEach(m => { const a = t.objectStore('audio').get(m.id); a.onsuccess = () => { const b = a.result; out.push({ ...m, audioBytes: b ? b.byteLength : 0, inicio: b ? new TextDecoder().decode(new Uint8Array(b).slice(0, 24)) : '' }); }; });
    t.oncomplete = () => { d.close(); ok(out); };
  };
}));
async function esperarIdb(page, cond, ms = 8000) {
  const ate = Date.now() + ms; let l = await lerIdb(page);
  while (!cond(l) && Date.now() < ate) { await page.waitForTimeout(150); l = await lerIdb(page); }
  return l;
}

export async function testarOralGravacao24h(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const R = 'ORAL GRAVAÇÃO [' + motor + '] ';
  const so = process.env.CT_BLOCO;   // CT_BLOCO=janela roda só uma parte, para o ciclo curto
  const partes = { gravacao: () => gravacao(pageDaSuite, base, ok, R, motor, opcoes.arquivo),
    caminhos: () => caminhos(pageDaSuite, base, ok, R, motor, opcoes.arquivo),
    duracao: () => duracao(pageDaSuite, base, ok, R, motor, opcoes.arquivo),
    indisponivel: () => indisponivel(pageDaSuite, base, ok, R, motor, opcoes.arquivo), janela: () => janela(pageDaSuite, base, ok, R, opcoes.arquivo),
    corrida: () => corrida(pageDaSuite, base, ok, R, motor, opcoes.arquivo),
    quantidade: () => quantidadeEscolhida(pageDaSuite, base, ok, R, opcoes.arquivo) };
  for (const nome of Object.keys(partes)) {
    if (so && so !== nome) continue;
    try { await partes[nome](); } catch (e) { ok(false, R + nome + ': exceção ' + String(e && e.message || e).split('\n')[0].slice(0, 200)); }
  }
}

/* ---------- gravar, ouvir, recarregar, apagar ---------- */
async function gravacao(pageDaSuite, base, ok, R, motor, arquivo) {
  const { ctx, page, erros } = await contexto(pageDaSuite, { toque: true });
  const pedidos = [];
  page.on('request', (q) => { let d = null; try { d = q.postDataBuffer(); } catch (e) {} pedidos.push({ url: q.url(), metodo: q.method(), tipo: q.headers()['content-type'] || '', marca: !!(d && d.includes(MARCA)) }); });
  const safari = motor === 'webkit';
  await ctx.addInitScript(instalarFalsos, { MARCA, safari });
  const midia = [];
  await ctx.exposeBinding('__ctMidia', (_, d) => { midia.push(d); });
  await ctx.addInitScript(vigiarTocadores);
  try {
    await semear(page, base);
    await abrirOral(page, base, arquivo);
    ok(await page.getByRole('combobox', { name: 'Quando arguir' }).inputValue() === 'agora', R + '"Quando arguir" nasce em "Agora": o fluxo imediato continua sendo o padrão');
    const titulo = await pintado(page, '[data-i="treinar"] > b'), descricao = await pintado(page, '[data-i="treinar"] > span');
    ok(!!titulo && titulo.texto === 'Treinar arguição agora' && titulo.peso >= 700 && !!descricao && titulo.tam > descricao.tam && descricao.peso < 600,
      R + 'o título do botão da Oral continua em negrito e maior que a descrição, medido no nó que pinta (título ' + tipo(titulo) + ', descrição ' + tipo(descricao) + ')');
    await page.getByRole('combobox', { name: 'Quantidade de perguntas' }).selectOption('3');
    await page.locator('[data-i="treinar"]').click();
    const sala = page.getByRole('region', { name: 'Conversa de arguição' });
    await sala.waitFor({ timeout: 15000 });
    const sessaoId = await estado(page, () => window.__catedraApp.state.argSessaoId);
    const botao = sala.locator('[data-grav="gravar"]');
    await botao.waitFor({ timeout: 8000 });
    const mb = await medir(page, '[data-grav="gravar"]');
    ok(!!mb && /Gravar resposta/.test(mb.texto) && mb.h >= 44 && mb.w >= 44, R + 'botão "Gravar resposta" na sala, alvo de toque ≥ 44 px no iPad (' + fmt(mb) + ')');
    ok(!!mb && mb.contraste >= 4.5, R + 'texto do botão com contraste ≥ 4,5:1 (' + fmt(mb) + ')');
    const ms = await medir(page, '[data-grav="controle"] .ct-oral-grav-status');
    ok(!!ms && /só neste aparelho/.test(ms.texto) && ms.contraste >= 4.5, R + 'a nota diz que o áudio fica só neste aparelho e pinta legível (' + fmt(ms) + ')');

    await botao.click();
    await page.waitForFunction(() => (window.__catedraApp.state.argGrav || {}).estado === 'gravando', null, { timeout: 8000 });
    const g = await estado(page, () => ({ ...window.__grav }));
    const esperado = safari ? 'audio/mp4' : 'audio/webm;codecs=opus';
    ok(g.aberturas === 1 && g.mimes[0] === esperado && g.bits === 32000, R + 'abriu o microfone uma vez e grava em ' + g.mimes[0] + ' (esperado ' + esperado + ', pelo isTypeSupported)');
    // o .ct-btn-2 anima borda e fundo em 140 ms: mede depois que a transição termina
    await page.waitForFunction(() => { const b = document.querySelector('[data-grav="gravar"]'); return !!b && b.getAnimations().length === 0; }, null, { timeout: 5000 }).catch(() => {});
    const mg = await medir(page, '[data-grav="gravar"]');
    // o ponteiro continua sobre o botão (como o hover que gruda no iPad): a cor de gravando tem de vencer
    const corGravando = await page.evaluate(() => {
      const b = document.querySelector('[data-grav="gravar"]');
      const sonda = (v) => { const s = document.createElement('span'); s.style.borderTop = '1px solid ' + v; b.parentElement.appendChild(s); const c = getComputedStyle(s).borderTopColor; s.remove(); return c; };
      // compara em RGB (canvas): o WebKit serializa o mesmo color-mix como oklab(), o Chrome como color(srgb)
      const cv = document.createElement('canvas'); cv.width = cv.height = 1; const x = cv.getContext('2d', { willReadFrequently: true });
      const rgb = (c) => { x.clearRect(0, 0, 1, 1); x.fillStyle = 'rgba(0,0,0,0)'; x.fillStyle = c; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const dist = (p, q) => Math.max(...p.map((v, i) => Math.abs(v - q[i])));
      const borda = getComputedStyle(b).borderTopColor;
      return { hover: b.matches(':hover'), borda, aSituacao: dist(rgb(borda), rgb(sonda('color-mix(in srgb, var(--danger) 55%, var(--border))'))),
        aoAcento: dist(rgb(borda), rgb(sonda('color-mix(in srgb, var(--accent) 44%, var(--border))'))) };
    });
    ok(corGravando.aSituacao <= 3 && corGravando.aoAcento > 12,
      R + 'gravando' + (corGravando.hover ? ', com o ponteiro em cima,' : '') + ' a borda é a da cor de situação e não a do hover (' + corGravando.borda + '; Δ situação ' + corGravando.aSituacao + ', Δ hover ' + corGravando.aoAcento + ')');
    ok(!!mg && /Parar gravação/.test(mg.texto) && mg.contraste >= 4.5 && (mg.animacao === 'none' || !mg.animacao), R + 'gravando: "Parar gravação", legível e sem animação (' + fmt(mg) + ', animação ' + (mg && mg.animacao) + ')');
    await capturar(page, '.ct-oral-compositor', 'oral-grav-gravando-' + motor);
    await page.waitForFunction(() => /^0:0[1-9]$/.test(((document.querySelector('.ct-oral-grav-tempo') || {}).textContent || '').trim()), null, { timeout: 10000 });
    ok(true, R + 'o tempo da gravação corre na tela');
    await botao.click();
    await page.waitForFunction(() => (window.__catedraApp.state.argGrav || {}).estado === 'guardada', null, { timeout: 10000 });
    const st1 = await medir(page, '[data-grav="controle"] .ct-oral-grav-status');
    ok(!!st1 && /Resposta gravada \(0:0\d\)/.test(st1.texto) && /Gravar de novo/.test((await botao.textContent()) || ''), R + 'parou: "' + (st1 && st1.texto) + '"');
    ok((await estado(page, () => window.__grav.soltas)) === 1, R + 'o microfone foi solto ao parar');

    await sala.getByRole('button', { name: 'Respondi — ver o padrão', exact: true }).click();
    await page.locator('.ct-oral-correcao [data-grav="ouvir"] audio').waitFor({ timeout: 8000 });
    const ouvir = await estado(page, () => {
      const a = document.querySelector('.ct-oral-correcao [data-grav="ouvir"] audio'), p = document.querySelector('.ct-oral-correcao .ct-oral-texto');
      const r = a.getBoundingClientRect();
      return { src: a.getAttribute('src') || '', controles: a.controls, w: r.width, h: r.height, esquema: getComputedStyle(a).colorScheme,
        antesDoPadrao: !!(p && (a.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING)) };
    });
    ok(/^blob:/.test(ouvir.src) && ouvir.controles && ouvir.w > 100 && ouvir.h > 0 && ouvir.antesDoPadrao,
      R + 'o <audio controls> pinta na correção ANTES do padrão oficial (que passa de várias telas): ouve-se enquanto se lê (src ' + ouvir.src.slice(0, 5) + ', ' + Math.round(ouvir.w) + '×' + Math.round(ouvir.h) + ')');
    ok(ouvir.h >= 44, R + 'o tocador tem altura de alvo de toque ≥ 44 px (' + Math.round(ouvir.h) + ' px)');
    ok(ouvir.esquema !== 'dark', R + 'no tema claro o tocador nativo fica claro (color-scheme ' + ouvir.esquema + ')');
    await capturar(page, '.ct-oral-sala', 'oral-grav-correcao-' + motor);
    const ma = await medir(page, '.ct-oral-correcao [data-grav="ouvir"] .ct-eb');
    ok(!!ma && /Sua resposta gravada · 0:0\d/.test(ma.texto) && ma.contraste >= 4.5, R + 'rótulo do áudio com a duração e contraste ≥ 4,5:1 (' + fmt(ma) + ')');
    const mApagar = await medir(page, '.ct-oral-correcao [data-grav="apagar"]');
    ok(!!mApagar && mApagar.h >= 44 && mApagar.contraste >= 4.5, R + '"Apagar gravação" com alvo ≥ 44 px e legível (' + fmt(mApagar) + ')');

    let idb = await esperarIdb(page, l => l.length === 1);
    ok(idb.length === 1 && idb[0].sessaoId === sessaoId && idb[0].idx === 0 && idb[0].id === sessaoId + '|0' && idb[0].mime === esperado && idb[0].area === 'juridica',
      R + 'IndexedDB deste aparelho: uma gravação, chave sessão|pergunta, formato ' + (idb[0] && idb[0].mime));
    ok(idb.length === 1 && idb[0].audioBytes === idb[0].bytes && idb[0].bytes > 4000 && idb[0].inicio.startsWith(MARCA.slice(0, 24)), R + 'os bytes guardados são os do gravador (' + (idb[0] && idb[0].audioBytes) + ' bytes)');
    ok(!(await estado(page, (m) => Object.keys(localStorage).some(k => String(localStorage.getItem(k)).includes(m)), MARCA)), R + 'nada do áudio no localStorage (que sincroniza)');

    // recarrega no tema escuro: a gravação volta do IndexedDB ao retomar
    await page.evaluate(() => localStorage.setItem('catedra:dark', '1'));
    await page.reload();
    await esperarApp(page);
    await page.evaluate(() => window.__catedraGoView('oral'));
    await page.getByRole('button', { name: 'Retomar arguição', exact: true }).click();
    await page.locator('.ct-oral-correcao [data-grav="ouvir"] audio[src^="blob:"]').waitFor({ timeout: 10000 });
    const escuro = await estado(page, () => !!window.__catedraApp.state.darkMode);
    const me = await medir(page, '.ct-oral-correcao [data-grav="ouvir"] .ct-eb');
    const meb = await medir(page, '.ct-oral-correcao [data-grav="apagar"]');
    ok(escuro && !!me && me.contraste >= 4.5 && !!meb && meb.contraste >= 4.5, R + 'depois de recarregar (tema escuro) a gravação volta do IndexedDB e segue legível (' + fmt(me) + ' · ' + fmt(meb) + ')');
    const esquemaEscuro = await estado(page, () => getComputedStyle(document.querySelector('.ct-oral-correcao [data-grav="ouvir"] audio')).colorScheme);
    ok(esquemaEscuro === 'dark', R + 'no tema escuro o tocador nativo segue o tema (color-scheme ' + esquemaEscuro + '), sem a pílula clara sobre o cartão escuro');
    await capturar(page, '.ct-oral-correcao', 'oral-grav-correcao-escuro-' + motor);
    ok(await estado(page, () => document.documentElement.scrollWidth <= innerWidth + 2), R + 'sem rolagem lateral na largura do iPad');

    await page.locator('.ct-oral-correcao [data-grav="apagar"]').click();
    await page.locator('.ct-oral-correcao [data-grav="ouvir"]').waitFor({ state: 'detached', timeout: 8000 });
    idb = await esperarIdb(page, l => l.length === 0);
    ok(idb.length === 0, R + 'apagar a gravação tira o áudio da tela e do IndexedDB');

    // a próxima pergunta grava na sua própria chave
    await page.evaluate(() => window.__catedraApp.argAvaliar({ currentTarget: { dataset: { v: 'bem' } } }));
    await page.waitForFunction(() => window.__catedraApp.state.argIdx === 1);
    await botao.click();
    await page.waitForFunction(() => (window.__catedraApp.state.argGrav || {}).estado === 'gravando', null, { timeout: 8000 });
    await page.waitForFunction(() => { const s = window.__catedraApp.state; return s.argSeg < s.argMin * 60; }, null, { timeout: 8000 });
    await botao.click();
    await page.waitForFunction(() => (window.__catedraApp.state.argGrav || {}).estado === 'guardada', null, { timeout: 10000 });
    idb = await esperarIdb(page, l => l.length === 1);
    ok(idb.length === 1 && idb[0].id === sessaoId + '|1', R + 'a segunda pergunta grava na chave ' + sessaoId + '|1');

    await sala.getByRole('button', { name: 'Encerrar conversa', exact: true }).click();
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.getByRole('region', { name: 'Histórico de arguições' }).locator('[data-id="' + sessaoId + '"]').click();
    const dialogo = page.getByRole('dialog', { name: 'Histórico de arguição', exact: true });
    await dialogo.locator('[data-grav="ouvir-historico"] audio[src^="blob:"]').waitFor({ timeout: 10000 });
    ok(true, R + 'no histórico da arguição a resposta gravada toca ao lado do registro');
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.__catedraApp.argHistoricoFechar());

    await page.evaluate((id) => window.__catedraApp.delSession({ currentTarget: { dataset: { id } } }), sessaoId);
    await page.waitForTimeout(400);
    idb = await lerIdb(page);
    ok(idb.length === 1, R + 'arguição na lixeira (restaurável) mantém o áudio');
    await page.evaluate((id) => window.__catedraApp.purgeSession({ currentTarget: { dataset: { id } } }), sessaoId);
    idb = await esperarIdb(page, l => l.length === 0);
    ok(idb.length === 0, R + 'apagar a arguição de vez apaga os áudios dela');
    await page.evaluate(async () => {
      const G = window.CT_ORAL_GRAV, a = window.__catedraApp;
      await G.loja.guardar({ id: 'lixo|0', sessaoId: 'lixo', idx: 0, conta: '', area: 'juridica', mime: 'audio/webm', dur: 1, bytes: 3, criadoEm: 1 }, new Uint8Array([1, 2, 3]).buffer);
      a.setState({ sessionsLixeira: [{ id: 'lixo', oralArguicao: [], _delAt: Date.now(), up: 1, ts: 1 }] });
    });
    await page.waitForFunction(() => (window.__catedraApp.state.sessionsLixeira || []).length === 1);
    await page.evaluate(() => window.__catedraApp.esvaziarLixeira());
    idb = await esperarIdb(page, l => l.length === 0);
    ok(idb.length === 0, R + 'esvaziar a lixeira também apaga os áudios das arguições');

    const levou = pedidos.filter(p => p.marca || /^audio\//i.test(p.tipo));
    const molde = pedidos.filter(p => /%7B%7B|\{\{/.test(p.url));
    ok(levou.length === 0, R + 'nenhuma requisição levou o áudio (' + pedidos.length + ' requisições vistas' + (levou.length ? ': ' + levou[0].metodo + ' ' + levou[0].url : '') + ')');
    ok(molde.length === 0, R + 'nenhum pedido de rede com a URL literal "{{ }}" do molde (' + (molde.length ? molde[0].url : 'nenhum') + ')');
    // a causa, em qualquer motor: o <audio> do molde cru não pode nem começar a carregar a URL literal
    const literal = midia.filter(m => /%7B%7B|\{\{/.test(m.atual + ' ' + m.src)), doBlob = midia.filter(m => /^blob:/.test(m.atual));
    ok(literal.length === 0 && doBlob.length > 0,
      R + 'nenhum <audio> começa a carregar a URL literal "{{ }}" do molde, nem os que o parser cria do molde cru antes do runtime ('
      + midia.length + ' cargas de áudio vistas, ' + doBlob.length + ' do blob da gravação' + (literal.length ? '; literal: ' + literal.length + ', ' + literal[0].atual : '') + ')');
    ok(erros.length === 0, R + 'sem erro na página (' + (erros[0] || 'nenhum') + ')');
  } finally { await ctx.close(); }
}

/* ---------- os caminhos que param ou pausam a gravação sem o botão "Parar" ---------- */
async function caminhos(pageDaSuite, base, ok, R, motor, arquivo) {
  const { ctx, page, erros } = await contexto(pageDaSuite, { toque: true });
  await ctx.addInitScript(instalarFalsos, { MARCA, safari: motor === 'webkit' });
  const S = (f, a) => page.evaluate(f, a);
  const esperar = (f, a, ms = 8000) => page.waitForFunction(f, a, { timeout: ms });
  const grav = () => S(() => { const a = window.__catedraApp, s = a.state, m = window.__mrUltimo;
    return { estado: (s.argGrav || {}).estado, motivo: (s.argGrav || {}).motivo, mr: m ? m.state : '', fase: s.argFase, host: !!a._grav }; });
  const tela = () => S(() => { const b = document.querySelector('[data-grav="gravar"]'), st = document.querySelector('[data-grav="controle"] .ct-oral-grav-status'), t = document.querySelector('.ct-oral-grav-tempo');
    return { rotulo: b ? b.textContent.trim() : '', dataEstado: b ? b.getAttribute('data-estado') : '', ocupado: b ? b.getAttribute('aria-busy') : '', status: st ? st.textContent.trim() : '', tempo: t ? t.textContent.trim() : '' }; });
  const gravando = () => esperar(() => (window.__catedraApp.state.argGrav || {}).estado === 'gravando' && !!window.__mrUltimo && window.__mrUltimo.state === 'recording');
  const guardada = (motivo) => esperar((m) => { const g = window.__catedraApp.state.argGrav || {}; return g.estado === 'guardada' && (!m || g.motivo === m); }, motivo || null, 10000);
  const botao = page.locator('[data-grav="gravar"]');
  try {
    await semear(page, base);
    await abrirOral(page, base, arquivo);
    await page.getByRole('combobox', { name: 'Quantidade de perguntas' }).selectOption('10');
    await page.locator('[data-i="treinar"]').click();
    await page.getByRole('region', { name: 'Conversa de arguição' }).waitFor({ timeout: 15000 });
    const sessaoId = await S(() => window.__catedraApp.state.argSessaoId);
    // revela o padrão (se preciso), avalia e espera a próxima pergunta
    const proxima = async (i) => {
      await S(() => { const a = window.__catedraApp; if (!a.state.oralQMostrarPadrao) a.argResponder(); });
      await esperar(() => window.__catedraApp.state.oralQMostrarPadrao === true);
      await S(() => window.__catedraApp.argAvaliar({ currentTarget: { dataset: { v: 'bem' } } }));
      await esperar((i) => window.__catedraApp.state.argIdx === i && !window.__catedraApp.state.oralQMostrarPadrao, i);
    };
    const temChave = (k) => esperarIdb(page, l => l.some(m => m.id === k && m.bytes > 0));

    // 1. revelar o padrão com a gravação correndo
    await botao.click(); await gravando();
    await page.getByRole('button', { name: 'Respondi — ver o padrão', exact: true }).click();
    await guardada();
    let idb = await temChave(sessaoId + '|0');
    ok(idb.some(m => m.id === sessaoId + '|0') && (await grav()).mr === 'inactive' && !(await grav()).host, R + 'revelar o padrão com a gravação correndo guarda o áudio e solta o microfone');

    // 2. o tempo acaba com a gravação correndo
    await proxima(1);
    await botao.click(); await gravando();
    await S(() => window.__catedraApp.setState({ argSeg: 1 }));
    await esperar(() => window.__catedraApp.state.oralQMostrarPadrao === true);
    await guardada();
    idb = await temChave(sessaoId + '|1');
    ok(idb.some(m => m.id === sessaoId + '|1') && (await grav()).mr === 'inactive', R + 'o tempo acabou com a gravação correndo: o áudio fica guardado e o microfone é solto');

    // 3. pausa da conversa e leitura da banca
    await proxima(2);
    await botao.click(); await gravando();
    await S(() => window.__catedraApp.argPausaToggle());
    let g = await grav(), t = await tela();
    ok(g.mr === 'paused' && g.fase === 'pausado' && t.dataEstado === 'pausada' && /pausada junto com a conversa/.test(t.status), R + 'pausar a conversa pausa a gravação ("' + t.status + '")');
    await S(() => { window.__voz = null; window.__catedraApp.argRepetirPergunta(); });
    await esperar(() => window.__catedraApp.state.argFase === 'ouvindo' && !!window.__voz);
    g = await grav(); t = await tela();
    ok(g.mr === 'paused' && /enquanto a banca lê/.test(t.status), R + 'pausada, "Ouvir pergunta novamente" não grava a voz da banca ("' + t.status + '")');
    await S(() => { const u = window.__voz; window.__voz = null; if (u && u.onend) u.onend(); });
    await esperar(() => window.__catedraApp.state.argFase === 'respondendo');
    g = await grav(); t = await tela();
    ok(g.mr === 'recording' && t.dataEstado === 'gravando' && /^Gravando sua resposta/.test(t.status),
      R + 'acabada a leitura, a conversa e a gravação voltam juntas (gravador ' + g.mr + ', "' + t.status + '")');
    await S(() => { window.__voz = null; window.__catedraApp.argRepetirPergunta(); });
    await esperar(() => window.__catedraApp.state.argFase === 'ouvindo' && !!window.__voz);
    const durante = (await grav()).mr;
    await S(() => { const u = window.__voz; window.__voz = null; if (u && u.onend) u.onend(); });
    await esperar(() => window.__catedraApp.state.argFase === 'respondendo');
    ok(durante === 'paused' && (await grav()).mr === 'recording', R + 'com a gravação correndo, a leitura da banca pausa a gravação e a vez de responder a retoma');
    await S(() => window.__catedraApp.argPausaToggle());
    await S(() => window.__catedraApp.argMinhaVez());
    g = await grav();
    ok(g.mr === 'recording' && g.host, R + '"Responder em voz alta" retoma a gravação pausada (a mesma, sem abrir outra)');

    // 4. o gravador para sozinho (o sistema encerrou o microfone)
    await S(() => window.__mrUltimo.pararSozinho());
    await guardada('interrompida');
    await page.waitForTimeout(1300);   // o tempo da tela teria seguido correndo
    g = await grav(); t = await tela();
    ok(!g.host && t.dataEstado === 'parada' && /Gravar de novo/.test(t.rotulo) && !t.tempo && /parou sozinha/.test(t.status) && !/Gravando/.test(t.status),
      R + 'o gravador parou sozinho: a tela deixa de dizer "gravando", o tempo some e o porquê aparece ("' + t.status + '")');
    await botao.click(); await gravando();
    await botao.click(); await guardada();
    t = await tela();
    ok(t.ocupado === 'false' && /Gravar de novo/.test(t.rotulo) && t.dataEstado === 'parada', R + 'depois disso o botão grava e para de novo, sem travar em "Guardando"');

    // 5. limite por resposta (reduzido a 2 s para o teste)
    await S(() => { window.CT_ORAL_GRAV.LIMITES.segPorResposta = 2; });
    await botao.click(); await gravando();
    await guardada('limite');
    await S(() => { window.CT_ORAL_GRAV.LIMITES.segPorResposta = 600; });
    t = await tela();
    ok(!(await grav()).host && t.dataEstado === 'parada' && !t.tempo && /o limite por resposta\. O que você disse até ali ficou guardado/.test(t.status),
      R + 'no limite por resposta a gravação para e a tela diz isso ("' + t.status + '")');

    // 6. microfone ocupado por outro app: aviso, e o botão fica para tentar de novo
    await S(() => { window.__grav.falharProxima = 'NotReadableError'; });
    await botao.click();
    await esperar(() => (window.__catedraApp.state.argGrav || {}).estado === 'falhou');
    t = await tela();
    ok(/não abriu agora/.test(t.status) && /Gravar/.test(t.rotulo) && (await page.locator('[data-grav="indisponivel"]').count()) === 0,
      R + 'microfone ocupado: aviso, sem esconder o botão ("' + t.status + '")');
    await botao.click(); await gravando();
    await botao.click(); await guardada();
    ok(true, R + '…e a segunda tentativa grava');

    // 7. espaço cheio e falha ao guardar: textos que dizem onde apagar e não inventam a causa
    await S(async () => { await window.CT_ORAL_GRAV.loja.guardar({ id: 'cheio|0', sessaoId: 'cheio', idx: 0, conta: 'teste-espaco', area: 'juridica', mime: 'audio/webm', dur: 1, bytes: 100 * 1024 * 1024, criadoEm: 1 }, new Uint8Array([1]).buffer); });
    await botao.click();
    await esperar(() => (window.__catedraApp.state.argGrav || {}).estado === 'cheio');
    t = await tela();
    ok(/acabou \(100 MB\)/.test(t.status) && /Suas arguições/.test(t.status) && !/Revisar respostas/.test(t.status), R + 'espaço cheio aponta para onde dá para apagar ("' + t.status + '")');
    await S(() => window.CT_ORAL_GRAV.loja.apagar(['cheio|0']));
    await S(() => { const L = window.CT_ORAL_GRAV.loja; window.__guardarReal = L.guardar; L.guardar = () => Promise.resolve(false); });
    await botao.click(); await gravando();
    await botao.click();
    await esperar(() => (window.__catedraApp.state.argGrav || {}).estado === 'nao-guardada');
    t = await tela();
    await S(() => { window.CT_ORAL_GRAV.loja.guardar = window.__guardarReal; });
    ok(/não foi guardada neste aparelho/.test(t.status) && !/coube/.test(t.status), R + 'falha ao guardar não é dada como falta de espaço ("' + t.status + '")');

    // 8. sair da tela com a gravação correndo
    await proxima(3);
    await botao.click(); await gravando();
    await S(() => window.__catedraGoView('inicio'));
    await esperar(() => window.__catedraApp.state.argFase === 'pausado');
    idb = await temChave(sessaoId + '|3');
    ok(idb.some(m => m.id === sessaoId + '|3') && (await grav()).mr === 'inactive', R + 'sair da tela com a gravação correndo guarda o áudio e solta o microfone');

    // 9. faxina: a gravação cuja arguição sumiu (apagada no outro aparelho) sai; as vivas e as de outra conta ficam
    await S(async () => { const G = window.CT_ORAL_GRAV, a = window.__catedraApp, buf = () => new Uint8Array([1, 2, 3]).buffer;
      await G.loja.guardar({ id: 'sumiu|0', sessaoId: 'sumiu', idx: 0, conta: a._argConta(), area: 'juridica', mime: 'audio/webm', dur: 1, bytes: 3, criadoEm: 1 }, buf());
      await G.loja.guardar({ id: 'alheia|0', sessaoId: 'alheia', idx: 0, conta: 'outra-conta', area: 'juridica', mime: 'audio/webm', dur: 1, bytes: 3, criadoEm: 1 }, buf()); });
    const antes = await lerIdb(page);
    // a faxina só roda depois do primeiro acerto com a nuvem; aqui não há nuvem, então o teste dá o sinal
    await S(() => { if (window.CatedraSync) Object.defineProperty(window.CatedraSync, 'pronto', { configurable: true, get: () => true }); window.__catedraApp._gravFaxinaFeita = false; window.__catedraGoView('oral'); });
    idb = await esperarIdb(page, l => !l.some(m => m.id === 'sumiu|0'));
    ok(antes.some(m => m.id === 'sumiu|0') && !idb.some(m => m.id === 'sumiu|0') && idb.some(m => m.id === 'alheia|0') && [0, 1, 2, 3].every(i => idb.some(m => m.id === sessaoId + '|' + i)),
      R + 'faxina: some só a gravação cuja arguição não existe mais; as da arguição viva e as de outra conta ficam (' + idb.map(m => m.id.replace(sessaoId, 'sessão')).join(', ') + ')');
    ok(erros.length === 0, R + 'caminhos sem erro na página (' + (erros[0] || 'nenhum') + ')');
  } finally { await ctx.close(); }
}

/* ---------- webm de verdade do Chrome: o tocador mede a duração que o cabeçalho não traz ---------- */
async function duracao(pageDaSuite, base, ok, R, motor, arquivo) {
  if (motor !== 'chromium') return;   // o WebKit grava mp4, que já traz a duração
  const { ctx, page, erros } = await contexto(pageDaSuite, { toque: false });
  try {
    await semear(page, base);
    await page.goto(base + '/' + (arquivo || 'Catedra.dc.html'));
    await esperarApp(page);
    await page.evaluate(() => window.__catedraGoView('oral'));
    await page.locator('.ct-oral-preparo-intro h2').click();   // gesto da pessoa (num título, sem ação): sem ele o AudioContext não corre
    const real = await page.evaluate(async () => {
      if (typeof MediaRecorder !== 'function' || !MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return { erro: 'sem MediaRecorder webm' };
      const ac = new AudioContext(); try { await ac.resume(); } catch (e) {}
      if (ac.state !== 'running') { try { await ac.close(); } catch (e) {} return { erro: 'AudioContext ' + ac.state + ' (sem saída de áudio neste ambiente)' }; }
      const osc = ac.createOscillator(), dest = ac.createMediaStreamDestination(); osc.connect(dest); osc.start();
      const mr = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus' }), partes = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size) partes.push(e.data); };
      const parou = new Promise(r => { mr.onstop = r; });
      mr.start(250); await new Promise(r => setTimeout(r, 1500)); mr.stop(); await parou; osc.stop(); try { await ac.close(); } catch (e) {}
      const blob = new Blob(partes, { type: 'audio/webm;codecs=opus' });
      // fora de .ct-oral-audio ninguém conserta: é a duração que o arquivo traz
      const cru = await new Promise((r) => { const a = new Audio(); a.preload = 'metadata'; a.onloadedmetadata = () => r(String(a.duration)); a.onerror = () => r('erro'); a.src = URL.createObjectURL(blob); });
      const G = window.CT_ORAL_GRAV, app = window.__catedraApp, id = 'oral-real';
      await G.loja.guardar({ id: id + '|0', sessaoId: id, idx: 0, conta: app._argConta(), area: 'juridica', mime: blob.type, dur: 2, bytes: blob.size, criadoEm: Date.now() }, await blob.arrayBuffer());
      app.setState({ sessions: [{ id, ts: Date.now(), up: Date.now(), topico: 'Arguição · 1 pergunta', oralArguicao: [{ id: 'doc#0', pergunta: 'Pergunta de teste', resposta: '', v: 'bem' }] }, ...(app.state.sessions || [])] });
      return { cru, bytes: blob.size };
    });
    // sem áudio de verdade neste ambiente (ou com um Chrome que já grava a duração), não há o que
    // consertar: a lógica segue provada no Node (consertarDuracao e ligarTocadores); aqui só se avisa
    if (real.erro || real.cru !== 'Infinity') { console.log('  (pulado) ' + R + 'webm de verdade: ' + (real.erro || 'o arquivo já traz a duração (' + real.cru + ')')); return; }
    await page.evaluate(() => window.__catedraApp.argHistoricoAbrir({ currentTarget: { dataset: { id: 'oral-real' } } }));
    const sel = '[data-grav="ouvir-historico"] audio[src^="blob:"]';
    await page.locator(sel).waitFor({ timeout: 10000 });
    await page.waitForFunction((sel) => { const a = document.querySelector(sel); return !!a && isFinite(a.duration) && a.duration > 0; }, sel, { timeout: 8000 }).catch(() => {});
    const d = await page.evaluate((sel) => { const a = document.querySelector(sel); return { dur: a.duration, t: a.currentTime, preload: a.preload }; }, sel);
    ok(isFinite(d.dur) && d.dur > 1 && d.dur < 3 && d.t < 0.5 && d.preload === 'metadata',
      R + 'webm de verdade do Chrome (o arquivo diz duração ' + real.cru + ', ' + real.bytes + ' bytes): o tocador mede ' + (isFinite(d.dur) ? d.dur.toFixed(2) + ' s' : d.dur) + ' antes do play e volta ao começo');
    ok(erros.length === 0, R + 'tocador sem erro na página (' + (erros[0] || 'nenhum') + ')');
  } finally { await ctx.close(); }
}

/* ---------- aviso no lugar do botão: app nativo, sem gravador, microfone negado ---------- */
async function indisponivel(pageDaSuite, base, ok, R, motor, arquivo) {
  const { ctx, page } = await contexto(pageDaSuite, { toque: true });
  await ctx.addInitScript(instalarFalsos, { MARCA, safari: motor === 'webkit' });
  try {
    await semear(page, base);
    const abrirSala = async (cen) => {
      await page.evaluate((c) => sessionStorage.setItem('__cenarioGrav', c), cen);
      await page.goto(base + '/' + (arquivo || 'Catedra.dc.html'));
      await esperarApp(page);
      await page.evaluate((cen) => { const a = window.__catedraApp; a.setState({ view: 'oral', oralModo: 'bancas', argOn: true, argFim: false, argSessaoId: 'cenario-' + cen, argOrigemArea: 'juridica', argOrigemConta: a._argConta(),
        argFila: [{ id: 'q', enunciado: 'Pergunta de teste.', padrao: 'Padrão de teste.', disciplina: 'Direito Civil' }], argIdx: 0, argMin: 3, argSeg: 180, argRespostas: [], argRodando: false, argFase: 'pausado', oralQMostrarPadrao: false }); }, cen);
      await page.getByRole('region', { name: 'Conversa de arguição' }).waitFor({ timeout: 15000 });
    };
    await abrirSala('nativo');
    let m = await medir(page, '[data-grav="indisponivel"]');
    ok(!!m && /app do Mac e do iPad/.test(m.texto) && (await page.locator('[data-grav="gravar"]').count()) === 0 && (await estado(page, () => window.__grav.aberturas)) === 0,
      R + 'no app nativo (ponte catedraNav): o aviso no lugar do botão, sem tocar no microfone — "' + (m && m.texto) + '"');
    ok(!!m && m.contraste >= 4.5 && m.visivel, R + 'o aviso pinta legível (' + fmt(m) + ')');
    await capturar(page, '.ct-oral-compositor', 'oral-grav-nativo-' + motor);
    await abrirSala('semGravador');
    m = await medir(page, '[data-grav="indisponivel"]');
    ok(!!m && /não grava áudio/.test(m.texto) && (await page.locator('[data-grav="gravar"]').count()) === 0, R + 'sem MediaRecorder: "' + (m && m.texto) + '"');
    await abrirSala('negado');
    await page.locator('[data-grav="gravar"]').click();
    await page.locator('[data-grav="indisponivel"]').waitFor({ timeout: 8000 });
    m = await medir(page, '[data-grav="indisponivel"]');
    ok(!!m && /bloqueado/.test(m.texto) && (await page.locator('[data-grav="gravar"]').count()) === 0 && (await estado(page, () => window.__catedraApp.state.argGrav.estado)) === 'parada',
      R + 'microfone negado: o botão vira o motivo, nada fica girando — "' + (m && m.texto) + '"');
  } finally { await ctx.close(); }
}

/* ---------- microfone que demora a abrir (permissão pendente): sair da sala ou pausar antes
   de ele responder não pode deixar o microfone gravando fora da tela nem religar o relógio ---------- */
async function corrida(pageDaSuite, base, ok, R, motor, arquivo) {
  const { ctx, page, erros } = await contexto(pageDaSuite, { toque: true });
  await ctx.addInitScript(instalarFalsos, { MARCA, safari: motor === 'webkit' });
  const ler = () => estado(page, () => { const a = window.__catedraApp, g = a.state.argGrav || {};
    return { grav: !!a._grav, abrindo: !!a._gravAbrindo, fase: a.state.argFase, rodando: a.state.argRodando, est: g.estado || '', view: a.state.view,
      mr: window.__mrUltimo ? window.__mrUltimo.state : 'nenhum', soltas: window.__grav.soltas, seg: a.state.argSeg }; });
  // abre a sala numa fase dada, sem relógio correndo, e toca em "Gravar" com o microfone segurado
  const pedirMicrofone = async (id, fase) => {
    await page.evaluate(({ id, fase }) => { const a = window.__catedraApp; window.__grav.segurar = true; window.__grav.soltas = 0; window.__mrUltimo = null;
      a.setState({ view: 'oral', oralModo: 'bancas', argOn: true, argFim: false, argSessaoId: id, argOrigemArea: 'juridica', argOrigemConta: a._argConta(),
        argFila: [{ id: 'q', enunciado: 'Pergunta de teste.', padrao: 'Padrão de teste.', disciplina: 'Direito Civil' }], argIdx: 0, argMin: 3, argSeg: 180, argRespostas: [],
        argRodando: false, argFase: fase, oralQMostrarPadrao: false, argGrav: null }); }, { id, fase });
    const sala = page.getByRole('region', { name: 'Conversa de arguição' });
    await sala.waitFor({ timeout: 15000 });
    await sala.locator('[data-grav="gravar"]').click();
    await page.waitForFunction(() => typeof window.__grav.soltar === 'function', null, { timeout: 8000 });
  };
  // solta o microfone, espera o desfecho e mais que um tique do relógio: se algo o religasse, já teria corrido
  const soltarEEsperar = async (cond) => {
    await page.evaluate(() => window.__grav.soltar());
    await page.waitForFunction(cond, null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1400);
    return ler();
  };
  try {
    await semear(page, base);
    await page.goto(base + '/' + (arquivo || 'Catedra.dc.html'));
    await esperarApp(page);
    // 1) "Gravar" e, antes de o microfone responder, sai da Fase Oral
    await pedirMicrofone('corrida-saida', 'respondendo');
    await page.evaluate(() => window.__catedraGoView('inicio'));
    let s = await soltarEEsperar(() => (window.__catedraApp.state.argGrav || {}).estado === 'parada');
    ok(!s.grav && !s.abrindo && s.view !== 'oral' && s.fase === 'pausado' && s.rodando === false && s.est === 'parada' && s.mr !== 'recording' && s.soltas >= 1 && s.seg === 180,
      R + 'saiu da sala antes de o microfone abrir: nada grava fora da tela, o microfone é solto e o relógio da arguição fica parado (' + JSON.stringify(s) + ')');
    // 2) "Gravar" e, antes de o microfone responder, "Pausar conversa"
    await pedirMicrofone('corrida-pausa', 'respondendo');
    await page.getByRole('button', { name: 'Pausar conversa' }).click();
    s = await soltarEEsperar(() => (window.__catedraApp.state.argGrav || {}).estado === 'parada');
    ok(!s.grav && s.view === 'oral' && s.fase === 'pausado' && s.rodando === false && s.est === 'parada' && s.mr !== 'recording' && s.soltas >= 1 && s.seg === 180,
      R + 'pausou antes de o microfone abrir: a conversa continua pausada e nada grava (' + JSON.stringify(s) + ')');
    ok((await page.locator('[data-grav="gravar"]').count()) === 1, R + 'depois do cancelamento o botão "Gravar" volta, para tentar de novo');
    // 3) controle: sem sair nem pausar, o microfone que demora começa a gravar e a resposta corre
    await pedirMicrofone('corrida-controle', 'pausado');
    s = await soltarEEsperar(() => (window.__catedraApp.state.argGrav || {}).estado === 'gravando');
    ok(s.grav && s.est === 'gravando' && s.mr === 'recording' && s.fase === 'respondendo' && s.rodando === true && s.seg < 180,
      R + 'sem sair nem pausar, o microfone que demora grava e a resposta corre ("gravar é responder") (' + JSON.stringify(s) + ')');
    await page.evaluate(() => window.__catedraApp.argGravarToggle());
    await page.waitForFunction(() => /guardada|nao-guardada/.test((window.__catedraApp.state.argGrav || {}).estado || ''), null, { timeout: 8000 }).catch(() => {});
    ok(erros.length === 0, R + 'corrida do microfone sem erro na página (' + (erros[0] || 'nenhum') + ')');
  } finally { await ctx.close(); }
}

/* ---------- a quantidade escolhida vale igual na sala e no sorteio de 24 h (PR #282) ---------- */
async function quantidadeEscolhida(pageDaSuite, base, ok, R, arquivo) {
  const { ctx, page, erros } = await contexto(pageDaSuite, { toque: true });
  const lerJanela = () => page.evaluate(() => JSON.parse(localStorage.getItem('catedra:oralJanela') || 'null'));
  try {
    await semear(page, base);
    await abrirOral(page, base, arquivo);
    const preparo = page.getByRole('region', { name: 'Preparar arguição' });
    const botao = preparo.locator('[data-i="treinar"]'), estoque = preparo.getByRole('status');
    const qtd = preparo.getByRole('combobox', { name: 'Quantidade de perguntas' });
    // o acervo filtrado fica com 4 perguntas, e a pessoa escolhe 5, no modo de 24 h
    await page.evaluate(() => { window.__Q10 = window.CT_ORAL_Q.slice(); window.CT_ORAL_Q = window.__Q10.slice(0, 4); window.__catedraApp.setState({ oralQDisc: '', oralQCarr: '' }); });
    await qtd.selectOption('5');
    await preparo.getByRole('combobox', { name: 'Quando arguir' }).selectOption('24h');
    await estoque.getByText(/4 perguntas disponíveis.*escolha menos perguntas/i).waitFor({ timeout: 8000 });
    ok(await botao.isDisabled() && /Sortear as perguntas agora/.test((await botao.textContent()) || ''),
      R + '4 perguntas para 5 escolhidas: "Sortear as perguntas agora" fica desligado, com o mesmo aviso de estoque da sala');
    // pelo código, como um toque que passou antes de o estoque mudar: a sala e o sorteio recusam juntos
    const avisos = await page.evaluate(() => {
      const a = window.__catedraApp, lista = [];
      a._toast = (m) => { lista.push(m); };
      try { a.sortearJanela(); a.iniciarArguicao(); } finally { delete a._toast; }
      return lista;
    });
    const recusa = { janela: await lerJanela(), sala: await page.evaluate(() => window.__catedraApp.state.argOn) };
    ok(recusa.janela === null && !recusa.sala && avisos.length === 2 && avisos[0] === avisos[1] && avisos[0] === 'Não há 5 perguntas disponíveis com esses filtros.',
      R + 'sorteio de 24 h e sala recusam juntos, com o mesmo aviso, em vez de sortear menos que o escolhido ("' + avisos.join('" · "') + '"; janela ' + JSON.stringify(recusa.janela && recusa.janela.fila ? recusa.janela.fila.length + ' perguntas' : recusa.janela) + ')');
    // 3 escolhidas: o sorteio guarda exatamente 3, sem repetir, do acervo filtrado
    await qtd.selectOption('3');
    await page.waitForFunction(() => { const b = document.querySelector('[data-i="treinar"]'); return !!b && !b.disabled; }, null, { timeout: 8000 });
    await botao.click();
    await page.getByRole('region', { name: 'Perguntas sorteadas' }).waitFor({ timeout: 10000 });
    const j3 = await lerJanela();
    const f3 = j3 && Array.isArray(j3.fila) ? j3.fila : [];
    const doFiltro = await page.evaluate((f) => f.every(q => window.CT_ORAL_Q.some(x => x.enunciado === q.enunciado)), f3);
    ok(!!j3 && j3.estado === 'aguardando' && f3.length === 3 && new Set(f3.map(q => q.enunciado)).size === 3 && doFiltro,
      R + '3 escolhidas: o sorteio de 24 h guarda exatamente 3 perguntas, sem repetir, do acervo filtrado (' + f3.length + ')');
    // 10 escolhidas com 10 no acervo: exatamente 10 (o "trocar?" do sorteio que espera é aceito)
    await page.evaluate(() => { window.CT_ORAL_Q = window.__Q10.slice(); window.__catedraApp.setState({ oralQDisc: '' }); });
    await qtd.selectOption('10');
    await page.waitForFunction(() => { const b = document.querySelector('[data-i="treinar"]'); return !!b && !b.disabled; }, null, { timeout: 8000 });
    await botao.click();
    await page.waitForFunction(() => { const j = JSON.parse(localStorage.getItem('catedra:oralJanela') || 'null'); return !!j && Array.isArray(j.fila) && j.fila.length !== 3; }, null, { timeout: 8000 }).catch(() => {});
    const j10 = await lerJanela();
    ok(!!j10 && j10.estado === 'aguardando' && Array.isArray(j10.fila) && j10.fila.length === 10 && new Set(j10.fila.map(q => q.enunciado)).size === 10,
      R + '10 escolhidas com 10 no acervo: o sorteio guarda as 10 (' + (j10 && j10.fila ? j10.fila.length : 0) + ')');
    ok(erros.length === 0, R + 'quantidade sem erro na página (' + (erros[0] || 'nenhum') + ')');
  } finally { await ctx.close(); }
}

/* ---------- janela de 24 h, relógio fixo em Porto Velho (UTC−4) ---------- */
async function janela(pageDaSuite, base, ok, R, arquivo) {
  const FUSO = 'America/Porto_Velho';
  const S = Date.UTC(2026, 10, 26, 3, 30);   // 25/11/2026 23:30 em Porto Velho: em UTC já é 26/11
  const { ctx, page, erros } = await contexto(pageDaSuite, { toque: true, fuso: FUSO, hora: S });
  const hhmm = (ms) => new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(ms));
  const lerJanela = () => page.evaluate(() => JSON.parse(localStorage.getItem('catedra:oralJanela') || 'null'));
  const quando = async () => ((await page.locator('.ct-oral-janela-quando').textContent({ timeout: 8000 })) || '').replace(/\s+/g, ' ').trim();
  try {
    await semear(page, base);
    await abrirOral(page, base, arquivo);
    await page.getByRole('combobox', { name: 'Quantidade de perguntas' }).selectOption('3');
    await page.getByRole('combobox', { name: 'Quando arguir' }).selectOption('24h');
    await page.waitForFunction(() => window.__catedraApp.state.argQuando === '24h');
    const tit24 = await pintado(page, '[data-i="treinar"] > b');
    ok(!!tit24 && tit24.texto === 'Sortear as perguntas agora' && tit24.peso >= 700, R + 'com "Em 24 horas" o botão sorteia as perguntas em vez de abrir a sala, com o título em negrito (' + tipo(tit24) + ')');
    ok(/pontos de onde elas saíram/.test((await page.locator('[data-i="treinar"] > span').textContent()) || ''), R + 'a descrição não promete um ponto só: o sorteio é de perguntas, que podem vir de pontos diferentes');
    await page.locator('[data-i="treinar"]').click();
    const cartao = page.getByRole('region', { name: 'Perguntas sorteadas' });
    await cartao.waitFor({ timeout: 10000 });
    const posCartao = await sobBarra(page, '.ct-oral-janela');
    ok(abaixoDaBarra(posCartao), R + 'depois do sorteio o cartão rola para a vista abaixo da barra fixa do topo (' + fmtBarra(posCartao) + ')');
    ok(/^Perguntas sorteadas · arguição em 24 horas$/.test(((await cartao.locator('.ct-eb').first().textContent()) || '').trim()), R + 'o cartão se chama "Perguntas sorteadas", não "Ponto sorteado"');
    let j = await lerJanela();
    ok(!!j && j.estado === 'aguardando' && j.fila.length === 3 && j.liberaEm - j.sorteadoEm === DIA && (await page.getByRole('region', { name: 'Conversa de arguição' }).count()) === 0,
      R + 'o sorteio fica guardado em catedra:oralJanela {fila, sorteadoEm, liberaEm = +24 h} e a sala não abre');
    const h = hhmm(j.liberaEm);
    ok(await quando() === 'Arguição liberada amanhã às ' + h, R + 'sorteio às ' + hhmm(j.sorteadoEm) + ' em Porto Velho: "' + await quando() + '"');
    ok((await cartao.getByRole('button', { name: 'Começar a arguição' }).count()) === 0, R + 'antes de 24 h não há botão para começar');
    const texto = await page.evaluate(() => document.querySelector('.ct-oral-janela').innerText);
    ok(/4\.1 Posse e propriedade\. 4\.2 Usucapião\./.test(texto) && !/PADR|Trecho da resposta oficial|Enunciado secreto/.test(texto), R + 'o cartão mostra o programa do ponto, sem enunciado e sem padrão');
    ok(!(await page.evaluate(() => document.body.innerText.includes('Enunciado secreto'))), R + 'nenhuma pergunta sorteada aparece na tela durante a janela');
    // mede o <span> que o runtime põe em cada {{ }}: é ele que pinta o texto
    const PONTO = { titulo: '.ct-oral-janela-pontos li > b .sc-interp', detalhe: '.ct-oral-janela-pontos li > span .sc-interp', programa: '.ct-oral-janela-pontos li p .sc-interp' };
    for (const [sel, nome] of [['.ct-oral-janela .ct-titulo', 'título'], ['.ct-oral-janela-quando', 'quando libera'], ['.ct-oral-janela-nota', 'nota do sorteio'], [PONTO.titulo, 'disciplina'], [PONTO.detalhe, 'detalhe do ponto'], [PONTO.programa, 'programa']]) {
      const m = await medir(page, sel);
      ok(!!m && m.visivel && m.contraste >= 4.5, R + 'cartão (claro) · ' + nome + ' legível (' + fmt(m) + ')');
    }
    const hier = { titulo: await pintado(page, PONTO.titulo), detalhe: await pintado(page, PONTO.detalhe), programa: await pintado(page, PONTO.programa) };
    const cDet = await medir(page, PONTO.detalhe), cProg = await medir(page, PONTO.programa);
    ok(!!hier.titulo && !!hier.detalhe && !!hier.programa && hier.titulo.peso >= 600 && hier.titulo.tam > hier.detalhe.tam && hier.programa.tam > hier.detalhe.tam && cProg.contraste > cDet.contraste,
      R + 'no cartão, disciplina e programa pintam maiores que o detalhe e o programa na cor do texto (disciplina ' + tipo(hier.titulo) + ', detalhe ' + tipo(hier.detalhe) + ', programa ' + tipo(hier.programa) + ', ' + cProg.contraste.toFixed(1) + ':1 contra ' + cDet.contraste.toFixed(1) + ':1)');
    const botoes = await page.evaluate(() => [...document.querySelectorAll('.ct-oral-janela button')].map(b => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim(), h: r.height, w: r.width }; }));
    ok(botoes.length >= 2 && botoes.every(b => b.h >= 44 && b.w >= 44), R + 'botões do cartão com alvo ≥ 44 px (' + botoes.map(b => b.t + ' ' + Math.round(b.h)).join(' · ') + ')');
    ok(await estado(page, () => document.documentElement.scrollWidth <= innerWidth + 2), R + 'cartão sem rolagem lateral na largura do iPad');
    await capturar(page, '.ct-oral-preparo', 'oral-janela-preparo');
    await capturar(page, '.ct-oral-janela', 'oral-janela-claro');
    // "Estudar o material" abre as fontes (a jurídica começa na jurisprudência), não as bancas com o padrão
    ok((await estado(page, () => window.__catedraApp.state.oralModo)) === 'bancas', R + 'logo depois do sorteio a aba aberta é "Bancas reais" (o sorteio passa por ela)');
    await cartao.getByRole('button', { name: 'Estudar o material' }).click();
    await page.waitForFunction(() => window.__catedraApp.state.oralModo !== 'bancas', null, { timeout: 5000 }).catch(() => {});
    const posFontes = await sobBarra(page, '.ct-oral-fontes'), modo = await estado(page, () => window.__catedraApp.state.oralModo);
    ok(modo === 'juris' && abaixoDaBarra(posFontes),
      R + '"Estudar o material" abre a jurisprudência (aba ' + modo + ') e rola "Fontes e perguntas" para baixo da barra fixa (' + fmtBarra(posFontes) + ')');

    // virada de dia: 40 min depois já é 26/11 — o mesmo horário passa a ser "hoje"
    await page.clock.fastForward(40 * 60 * 1000);
    await page.waitForFunction((h) => (document.querySelector('.ct-oral-janela-quando') || {}).textContent.includes('hoje às ' + h), h, { timeout: 8000 }).catch(() => {});
    ok(await quando() === 'Arguição liberada hoje às ' + h, R + 'virou o dia (00:10): "' + await quando() + '"');
    // fechar e abrir: o sorteio sobrevive
    await page.reload();
    await esperarApp(page);
    await page.evaluate(() => window.__catedraGoView('oral'));
    await cartao.waitFor({ timeout: 10000 });
    ok(await quando() === 'Arguição liberada hoje às ' + h, R + 'depois de recarregar o sorteio continua lá');
    // um minuto antes: fechada
    let agora = await page.evaluate(() => Date.now());
    await page.clock.fastForward(j.liberaEm - agora - 60 * 1000);
    await page.waitForTimeout(300);
    ok((await cartao.getByRole('button', { name: 'Começar a arguição' }).count()) === 0 && await quando() === 'Arguição liberada hoje às ' + h, R + 'um minuto antes de 24 h a arguição continua fechada');
    await page.clock.fastForward(90 * 1000);
    await cartao.getByRole('button', { name: 'Começar a arguição' }).waitFor({ timeout: 8000 });
    ok(await quando() === 'Arguição liberada desde hoje às ' + h, R + 'passadas 24 h: "' + await quando() + '" e o botão aparece');
    // tema escuro, medido
    await page.evaluate(() => localStorage.setItem('catedra:dark', '1'));
    await page.reload();
    await esperarApp(page);
    await page.evaluate(() => window.__catedraGoView('oral'));
    await cartao.waitFor({ timeout: 10000 });
    ok(await estado(page, () => !!window.__catedraApp.state.darkMode), R + 'tema escuro ligado pelo catedra:dark');
    for (const [sel, nome] of [['.ct-oral-janela .ct-titulo', 'título'], ['.ct-oral-janela-quando', 'quando libera'], ['.ct-oral-janela-nota', 'nota do sorteio'], [PONTO.titulo, 'disciplina'], [PONTO.detalhe, 'detalhe do ponto'], [PONTO.programa, 'programa']]) {
      const m = await medir(page, sel);
      ok(!!m && m.visivel && m.contraste >= 4.5, R + 'cartão (escuro) · ' + nome + ' legível (' + fmt(m) + ')');
    }
    await capturar(page, '.ct-oral-janela', 'oral-janela-escuro-liberada');
    // começar usa exatamente o que foi sorteado
    await cartao.getByRole('button', { name: 'Começar a arguição' }).click();
    await page.getByRole('region', { name: 'Conversa de arguição' }).waitFor({ timeout: 10000 });
    const sala = await estado(page, () => { const s = window.__catedraApp.state; return { fila: s.argFila.map(q => q.enunciado), min: s.argMin, id: s.argSessaoId }; });
    ok(JSON.stringify(sala.fila) === JSON.stringify(j.fila.map(q => q.enunciado)) && sala.min === j.min, R + 'a arguição usa exatamente as perguntas sorteadas 24 h antes, na mesma ordem');
    const usada = await lerJanela();
    ok(!!usada && usada.estado === 'iniciada' && usada.sessaoId === sala.id && !('fila' in usada) && (await cartao.count()) === 0, R + 'começar encerra a janela (registro com conteúdo, sem a fila) e o cartão sai');
    await page.getByRole('button', { name: 'Encerrar conversa', exact: true }).click();

    // desistir
    await page.getByRole('combobox', { name: 'Quando arguir' }).selectOption('24h');
    await page.waitForFunction(() => window.__catedraApp.state.argQuando === '24h');
    await page.locator('[data-i="treinar"]').click();
    await cartao.waitFor({ timeout: 10000 });
    await cartao.getByRole('button', { name: 'Desistir do sorteio' }).click();
    await cartao.waitFor({ state: 'detached', timeout: 8000 });
    j = await lerJanela();
    ok(!!j && j.estado === 'desistida' && !('fila' in j) && Object.keys(j).length >= 5, R + 'desistir tira o cartão e grava a desistência com conteúdo (o sync não a desfaz)');

    // o sorteio feito no iPad chega pelo sync e aparece aqui
    const chegou = await page.evaluate(() => {
      const agora = Date.now(), Q = window.CT_ORAL_Q.slice(0, 3);
      localStorage.setItem('catedra:oralJanela', JSON.stringify({ id: 'janela-ipad', estado: 'aguardando', fila: Q, min: 5, area: 'juridica', sorteadoEm: agora - 2 * 3600e3, liberaEm: agora + 22 * 3600e3, up: agora }));
      window.dispatchEvent(new Event('catedra:synced'));
      return agora + 22 * 3600e3;
    });
    await cartao.waitFor({ timeout: 8000 });
    ok(/^Arguição liberada (hoje|amanhã) às /.test(await quando()) && (await quando()).endsWith(hhmm(chegou)), R + 'o sorteio feito no outro aparelho chega pelo sync e aparece: "' + await quando() + '"');

    // o merge entre aparelhos (auth.js), pela fixture do sync
    await page.goto(base + '/tests/sync-fixture.html');
    await page.waitForFunction(() => window.CatedraSync && window.CatedraSync._test, null, { timeout: 15000 });
    const mg = await page.evaluate(() => {
      const M = window.CatedraSync._test.mergeAll, J = JSON.stringify, K = 'catedra:oralJanela', K2 = K + '@saude';
      const pend = J({ id: 'janela-1', estado: 'aguardando', fila: [{ id: 'q' }], sorteadoEm: 1000, liberaEm: 1000 + 864e5, up: 1000 });
      const desist = J({ id: 'janela-1', estado: 'desistida', sorteadoEm: 1000, liberaEm: 1000 + 864e5, encerradaEm: 2000, up: 2000 });
      const novo = J({ id: 'janela-4', estado: 'aguardando', fila: [{ id: 'q2' }], sorteadoEm: 4000, liberaEm: 4000 + 864e5, up: 4000 });
      const kts = (k, t) => J({ [k]: t });
      return {
        desistencia: M({ [K]: pend, 'catedra:_kts': kts(K, 1000) }, { [K]: desist, 'catedra:_kts': kts(K, 2000) }, true)[K] === desist
          && M({ [K]: desist, 'catedra:_kts': kts(K, 2000) }, { [K]: pend, 'catedra:_kts': kts(K, 1000) }, false)[K] === desist,
        novo: M({ [K]: novo, 'catedra:_kts': kts(K, 4000) }, { [K]: desist, 'catedra:_kts': kts(K, 2000) }, false)[K] === novo,
        nulo: M({ [K]: pend, 'catedra:_kts': kts(K, 1000) }, { [K]: 'null', 'catedra:_kts': kts(K, 9000) }, false)[K] === pend,
        area: M({ [K2]: pend, 'catedra:_kts': kts(K2, 1000) }, { [K2]: desist, 'catedra:_kts': kts(K2, 2000) }, true)[K2] === desist,
      };
    });
    ok(mg.desistencia, R + 'SYNC: a desistência mais nova vence o sorteio velho nos dois sentidos');
    ok(mg.novo, R + 'SYNC: o sorteio novo do iPad vence a desistência antiga do Mac');
    ok(mg.nulo, R + 'SYNC: um null perderia para o sorteio da nuvem ("vazio nunca apaga cheio") — por isso o registro encerrado tem conteúdo');
    ok(mg.area, R + 'SYNC: a mesma regra no caderno de outra área (catedra:oralJanela@saude)');
    ok(erros.length === 0, R + 'janela sem erro na página (' + (erros[0] || 'nenhum') + ')');
  } finally { await ctx.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let falhas = 0, total = 0;
  await testarOralGravacao24hEstatico((c, m) => { total++; if (!c) { falhas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); });
  console.log(falhas ? ('\nFALHAS: ' + falhas + ' de ' + total) : ('\n' + total + ' verificações passaram'));
  process.exit(falhas ? 1 : 0);
}
