/* sync-conflitos.js — o que a sincronização conta para a pessoa (Ajustes › Dados e backup).
 *
 * Módulo PURO: sem DOM, sem rede, sem localStorage. O auth.js o chama no merge e no envio; o
 * host o chama para escrever os textos. Entra na injeção dos builds (scripts/build.mjs e
 * scripts/build-macos.mjs), ANTES do auth.js — o mesmo lugar em que o auth.js existe. Sem conta
 * (o Catedra.dc.html aberto direto, sem a injeção) não há o que mostrar, e ele não é carregado.
 *
 *  1. RETRATO E LINHAGEM: um hash curto por chave do blob, tirado a cada acerto com a nuvem — a
 *     base que diz o que mudou de cada lado desde então. Cada envio diz quem gravou e de quais
 *     versões veio (linhagem): é o que separa "o outro aparelho mudou" de "a nuvem já tem o que
 *     ESTE aparelho mandou e não soube confirmar". O merge não usa nada disto.
 *  2. DESCRIÇÃO DO CONFLITO: as chaves que mudaram NOS DOIS lados desde a base e chegaram
 *     diferentes, e o que o merge — que já decidiu antes daqui, pelas regras de sempre — deixou
 *     valer: este aparelho, a nuvem, a lápide; nas listas, a união, item a item. Só lê o
 *     resultado; não decide nem altera nada.
 *  3. NOME DO APARELHO, deduzido da plataforma ("app do iPad", "Safari no iPhone").
 *  4. TEXTOS: "Última sincronização: hoje às 09:00", "Última gravação na nuvem: hoje às 08:41 ·
 *     app do iPad" e os avisos.
 *
 * Sintaxe antiga de propósito (var/function): roda no JavaScriptCore do app nativo e no vm do Node.
 */
(function (raiz) {
  'use strict';

  /* ---------- 1. retrato e linhagem ---------- */
  // "Vazio" aqui é ausência ou texto vazio. Quem chama (auth.js) já trocou o que não tem conteúdo
  // ([] {} "" null "0") por '': a régua do que é conteúdo é uma só, a do auth.js.
  function vazio(v) { return v === undefined || v === null || v === ''; }
  // FNV-1a de 32 bits mais o tamanho: só responde "mudou ou não". Não é segredo nem assinatura.
  // O Math.imul fica numa variável local: o laço roda uma vez por caractere do blob inteiro, e
  // consultar o global a cada volta deixava o retrato 60 vezes mais lento no vm do Node.
  var imul = Math.imul;
  function hash(s) {
    s = String(s);
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = imul(h, 0x01000193); }
    return s.length.toString(36) + '.' + (h >>> 0).toString(36);
  }
  function assinatura(v) { return vazio(v) ? '' : hash(v); }
  function retrato(blob) {
    var out = {};
    if (blob && typeof blob === 'object') {
      Object.keys(blob).forEach(function (k) { if (!vazio(blob[k])) out[k] = hash(blob[k]); });
    }
    return out;
  }

  // O carimbo de envio é {id, aparelho, ts, prev}: quem gravou, quando (= o updated_at da gravação)
  // e as versões de onde ela veio, da mais nova para a mais velha. Só fala da versão em que nasceu
  // (ts igual ao updated_at): a cópia velha que um app antigo guardou e reenviou não conta.
  var LINHAGEM = 8;
  function lerCarimbo(v) {
    var c = v;
    if (typeof v === 'string') { try { c = JSON.parse(v); } catch (_) { c = null; } }
    return c && typeof c === 'object' && !Array.isArray(c) ? c : null;
  }
  function carimboDa(ts, carimbo) { var c = lerCarimbo(carimbo); return c && +ts > 0 && +c.ts === +ts ? c : null; }
  // A versão `ts` e as que vieram antes dela (até 8), segundo o próprio carimbo.
  function linhagem(ts, carimbo) {
    if (!(+ts > 0)) return [];
    var out = [+ts], c = carimboDa(ts, carimbo);
    if (c && Array.isArray(c.prev)) {
      c.prev.forEach(function (x) { x = +x; if (x > 0 && out.length < LINHAGEM && out.indexOf(x) < 0) out.push(x); });
    }
    return out;
  }
  /* A base de comparação de um acerto. `confirmada`: a versão que este aparelho viu por último
     ({ts, chaves}). `pendentes`: gravações deste aparelho que a nuvem não confirmou ([{ts, chaves}],
     resposta perdida ou envio do fechamento). Se a linhagem da versão que chegou passa por uma
     delas, a gravação chegou: ela é o ponto comum mais novo, e o que ESTE aparelho mandou não conta
     como mudança do outro lado. Devolve {base, aplicadas}. */
  function escolherBase(confirmada, pendentes, lin) {
    lin = Array.isArray(lin) ? lin : [];
    var aplicadas = [], melhor = null;
    (Array.isArray(pendentes) ? pendentes : []).forEach(function (p) {
      if (!p || !(+p.ts > 0) || lin.indexOf(+p.ts) < 0) return;
      aplicadas.push(p);
      if (!melhor || +p.ts > +melhor.ts) melhor = p;
    });
    return { base: melhor || (confirmada && confirmada.chaves ? confirmada : null), aplicadas: aplicadas };
  }
  /* O que fica da lista de gravações pendentes (da mais nova para a mais velha): as duas mais novas e,
     se ficou de fora, a mais nova que a linhagem já mostrou ter chegado (chegou: 1) — ela é a base até a
     nuvem confirmar outra versão. Descartá-la fazia a gravação deste aparelho voltar a contar como
     "mudou do outro lado" (resposta perdida seguida de duas gravações recusadas, com um aparelho só). */
  function aparar(pendentes) {
    var l = (Array.isArray(pendentes) ? pendentes : []).filter(function (p) { return p && +p.ts > 0; });
    var fica = l.slice(0, 2), chegou = null;
    l.forEach(function (p) { if (p.chegou && (!chegou || +p.ts > +chegou.ts)) chegou = p; });
    if (chegou && fica.indexOf(chegou) < 0) fica.push(chegou);
    return fica;
  }

  /* ---------- nomes das chaves ---------- */
  // Listas (merge por id): [plural, singular, gênero].
  var LISTAS = {
    sessions: ['sessões', 'sessão', 'f'], reviews: ['revisões', 'revisão', 'f'], casos: ['casos', 'caso', 'm'],
    fc: ['flashcards', 'flashcard', 'm'], lib: ['materiais da biblioteca', 'material da biblioteca', 'm'],
    errors: ['erros do caderno', 'erro do caderno', 'm'], eventos: ['eventos do calendário', 'evento do calendário', 'm'],
    metas: ['metas', 'meta', 'f'], red: ['redações', 'redação', 'f'],
    redHist: ['correções de discursivas', 'correção de discursiva', 'f'], meusGrupos: ['grupos', 'grupo', 'm'],
    espelhosSugeridos: ['espelhos sugeridos', 'espelho sugerido', 'm'], leituras: ['leituras', 'leitura', 'f'],
    enamSim: ['simulados do ENAM', 'simulado do ENAM', 'm'], editais: ['concursos', 'concurso', 'm'],
    cmagRevs: ['revisões do Ciclo Magistratura', 'revisão do Ciclo Magistratura', 'f'],
    oabHist: ['treinos da OAB', 'treino da OAB', 'm'], hl: ['grifos', 'grifo', 'm']
  };
  // Valores inteiros (vence um lado): [frase com artigo, plural?]. Várias chaves podem ter o
  // mesmo nome (o ciclo mora em seis): o aviso fala do nome uma vez só.
  var ITENS = {
    edital: ['o edital', 0], editalAtivo: ['o concurso ativo', 0], prova: ['a data da prova', 0],
    profile: ['o perfil', 0], prefs: ['as preferências', 1], orient: ['o ritmo e as metas', 1],
    habitos: ['os hábitos', 1], areaEstudo: ['a área de estudo', 0],
    cicloVolta: ['o ciclo', 0], cycleMode: ['o ciclo', 0], manualFixed: ['o ciclo', 0],
    manualRot: ['o ciclo', 0], manualVoltaN: ['o ciclo', 0], manualFixedRoteiroAtual: ['o ciclo', 0],
    agendaFeitas: ['a agenda do ciclo', 0],
    sim: ['os simulados', 1], simAnalysis: ['os simulados', 1],
    redText: ['o texto da discursiva', 0], redTextTs: ['o texto da discursiva', 0],
    redTempoMs: ['o texto da discursiva', 0], redMarcas: ['o texto da discursiva', 0],
    redEnunciado: ['a discursiva em andamento', 0], redGabarito: ['a discursiva em andamento', 0],
    redDisciplina: ['a discursiva em andamento', 0], redProvaId: ['a discursiva em andamento', 0],
    cmag: ['o Ciclo Magistratura', 0], enam: ['o ENAM', 0], oabPlano: ['o plano da OAB', 0],
    planoLegis: ['o plano de leitura de leis', 0], iaConsentimento: ['o consentimento da IA', 0],
    legisEstudo: ['o estudo no CátedraLEGIS', 0], jurisEstudo: ['o estudo no CátedraJURIS', 0],
    'leituraLeis:v1': ['a leitura de leis', 0]
  };
  // Famílias por prefixo (uma chave por lei ou por verbete).
  var FAMILIAS = [
    ['grifos:', ['os grifos do CátedraLEGIS', 1]],
    ['grifosJuris:', ['os grifos do CátedraJURIS', 1]],
    ['notaJuris:', ['as anotações do CátedraJURIS', 1]]
  ];
  // Manutenção: o próprio app regrava sozinho em cada aparelho (derivado do que é dado, data do
  // dia, ponteiro, marca de lido, aparência deste aparelho) ou o merge decide por regra própria
  // (aceite dos Termos, pela versão). Mudar "dos dois lados" é o normal; avisar seria ruído.
  // A lixeira das sessões também: ela é o registro das exclusões, que valem nos dois aparelhos —
  // o que a exclusão decidiu aparece na própria lista de sessões.
  var MANUTENCAO = {
    dir: 1, dark: 1, accent: 1, leitorDark: 1, apPreset: 1, schemaVersion: 1, onboarded: 1, aceite: 1,
    blocks: 1, blocksDate: 1, rotPointer: 1, streakCheckDate: 1, escudos: 1, streakFreezeUsados: 1,
    escudoUltimoGanho: 1, notifsRead: 1, novidLidas: 1, semanaLidos: 1, relPeriod: 1,
    lastPonto: 1, lastPontoDispensado: 1, bancaDicas: 1, bancaAreaSel: 1, bancaSel: 1,
    bancaAreaConc: 1, bancaAssunto: 1, cicloConviteOff: 1, oficialRevisao: 1, leiturasResumo: 1,
    leitorLeitura: 1, leitorLA: 1, mentorMsgs: 1, sessionsLixeira: 1
  };
  /* As chaves são `catedra:<nome>[@<área>][#<concurso>]`: a área de estudo vem depois do '@' e o
     ciclo de cada concurso que não é o principal, depois do '#' (o host monta assim em _chave). */
  function partes(k) {
    var n = String(k || '');
    if (n.indexOf('catedra:') === 0) n = n.slice(8);
    var concurso = '', area = '', i = n.indexOf('#');
    if (i > 0) { concurso = n.slice(i + 1); n = n.slice(0, i); }
    i = n.lastIndexOf('@');
    if (i > 0) { area = n.slice(i + 1); n = n.slice(0, i); }
    return { nome: n, area: area, concurso: concurso };
  }
  function nomeBase(k) { return partes(k).nome; }
  // null: não interessa à pessoa (manutenção ou meta-estado "_"); {lista, nomes}; {t, pl}; {outros}.
  // Toda resposta com nome leva a área e o concurso da chave.
  function rotulo(k) {
    var p = partes(k), n = p.nome, r = null;
    if (!n || n.charAt(0) === '_' || MANUTENCAO[n]) return null;
    if (n.indexOf('leituras:') === 0) return null;   // espelho por lei de catedra:leituras (essa sim conta)
    if (LISTAS[n]) r = { lista: LISTAS[n][0], nomes: LISTAS[n] };
    else if (ITENS[n]) r = { t: ITENS[n][0], pl: !!ITENS[n][1] };
    else {
      for (var i = 0; i < FAMILIAS.length && !r; i++) {
        if (n.indexOf(FAMILIAS[i][0]) === 0) r = { t: FAMILIAS[i][1][0], pl: !!FAMILIAS[i][1][1] };
      }
    }
    if (!r) return { outros: true };
    r.area = p.area; r.concurso = p.concurso;
    return r;
  }

  /* ---------- 2. descrição ---------- */
  function carimboItem(x) { return (x && (x.up || x.ts)) || 0; }   // a mesma régua do mergeArr (auth.js)
  // {id: {s: texto do item, up}} de uma lista (array com id) ou dos grifos ({livro: [itens com id]}).
  // semTexto: só a presença e o carimbo (sem reescrever cada item) — basta à lista que só a nuvem mudou.
  function itensDe(v, semTexto) {
    if (vazio(v)) return {};
    var o; try { o = JSON.parse(v); } catch (_) { return null; }
    var out = {};
    var pega = function (it, pre) {
      if (!it || it.id == null) return;
      var s = '';
      if (!semTexto) { try { s = JSON.stringify(it); } catch (_) { s = String(it.id); } }
      out[pre + String(it.id)] = { s: s, up: +carimboItem(it) || 0 };
    };
    if (Array.isArray(o)) { o.forEach(function (it) { pega(it, ''); }); return out; }
    if (o && typeof o === 'object') {
      Object.keys(o).forEach(function (b) { (Array.isArray(o[b]) ? o[b] : []).forEach(function (it) { pega(it, b + '\u0001'); }); });
      return out;
    }
    return null;
  }
  /* Lista que mudou dos DOIS lados: o merge já uniu por id. O que se conta, item a item:
     · união: cada lado trouxe algo que o outro não tinha (item novo, ou item que só ele mudou);
     · colisão: o MESMO item mudou nos dois desde a base (carimbo dos dois depois dela) — o merge
       ficou com um, e o lado que ficou é lido do resultado;
     · lápide: item que o outro aparelho mudou depois da base e a exclusão feita aqui segurou.
     Um lado que só tem o que o outro já tem (a nuvem já recebeu o envio deste aparelho) não é
     conflito. Devolve null quando não há nada a contar. */
  function compararLista(k, sv, lc, mg, baseTs) {
    var C = itensDe(sv), L = itensDe(lc), G = itensDe(mg);
    if (!C || !L || !G) return { k: k, lado: 'uniao', unidas: true, colisoes: { local: 0, nuvem: 0 }, lapides: 0 };
    var daqui = 0, dela = 0, col = { local: 0, nuvem: 0 }, lap = 0, bt = +baseTs || 0;
    Object.keys(L).forEach(function (id) {
      var l = L[id], c = C[id];
      if (!c) { daqui++; return; }
      if (c.s === l.s) return;
      var lm = l.up > bt, cm = c.up > bt;
      if (lm && cm) {
        var g = G[id];
        if (g && g.s === l.s) col.local++;
        else if (g && g.s === c.s) col.nuvem++;
      } else if (lm) daqui++;
      else if (cm) dela++;
    });
    Object.keys(C).forEach(function (id) {
      if (L[id]) return;
      if (G[id]) dela++;
      else if (C[id].up > bt) lap++;   // sem a mudança de lá, é só a exclusão daqui chegando
    });
    var unidas = daqui > 0 && dela > 0;
    if (!unidas && !col.local && !col.nuvem && !lap) return null;
    return { k: k, lado: 'uniao', unidas: unidas, colisoes: col, lapides: lap };
  }
  /* Lista que só a NUVEM mudou. O que o resultado tem e a nuvem não tem veio deste aparelho, que está
     igual à base — então estava na nuvem na base e foi apagado lá: a união o trouxe de volta (exato,
     não depende de carimbo; os ids vão junto para o mesmo item não ser avisado de novo a cada volta).
     O que a nuvem tem e o resultado não tem, a lápide daqui segurou: só conta se o outro aparelho o
     mudou depois da base — cópia velha que ele reenviou é só a exclusão daqui chegando. */
  var IDS_VOLTA = 50;
  function soNuvemMudou(k, sv, mg, baseTs) {
    var C = itensDe(sv, true), G = itensDe(mg, true), bt = +baseTs || 0;
    if (!C || !G) return null;
    var volta = [], lap = 0;
    Object.keys(G).forEach(function (id) { if (!C[id]) volta.push(id); });
    Object.keys(C).forEach(function (id) { if (!G[id] && C[id].up > bt) lap++; });
    if (!volta.length && !lap) return null;
    var it = { k: k, lado: 'uniao', unidas: false, colisoes: { local: 0, nuvem: 0 }, lapides: lap, restaurados: volta.length };
    if (volta.length) it.idsVolta = volta.slice(0, IDS_VOLTA);
    return it;
  }
  /* A exclusão feita no outro aparelho não chega a este enquanto ele ainda tem o item (a lápide é
     de cada aparelho): a cada ida e volta a união o devolve. O aviso conta cada item uma vez só —
     tira dos itens novos os ids que um aviso anterior desta conta já contou. */
  function semRepetir(itens, anteriores) {
    var vistos = {};
    (Array.isArray(anteriores) ? anteriores : []).forEach(function (r) {
      ((r && r.itens) || []).forEach(function (it) { ((it && it.idsVolta) || []).forEach(function (id) { vistos[it.k + '\u0001' + id] = 1; }); });
    });
    return (Array.isArray(itens) ? itens : []).map(function (it) {
      if (!it || !Array.isArray(it.idsVolta) || !it.idsVolta.length) return it;
      var novos = it.idsVolta.filter(function (id) { return !vistos[it.k + '\u0001' + id]; });
      if (novos.length === it.idsVolta.length) return it;
      var c = {}; Object.keys(it).forEach(function (x) { c[x] = it[x]; });
      c.restaurados = Math.max(0, (+it.restaurados || 0) - (it.idsVolta.length - novos.length));
      c.idsVolta = novos;
      return c;
    }).filter(function (it) {
      if (!it) return false;
      if (it.lado !== 'uniao') return true;
      var col = it.colisoes || {};
      return !!it.unidas || (+col.local || 0) + (+col.nuvem || 0) + (+it.lapides || 0) + (+it.restaurados || 0) > 0;
    });
  }
  // Valor que o próprio app escreve sozinho: os hábitos zerados na virada do dia. Perder para ele
  // não perde nada da pessoa — e um dia que já virou também não (a meta dos hábitos é diária).
  function habitos(v) { try { var o = JSON.parse(v); return o && typeof o === 'object' && !Array.isArray(o) ? o : null; } catch (_) { return null; } }
  function semPerdaAutomatica(k, perdeu, ficou) {
    if (nomeBase(k) !== 'habitos') return false;
    var a = habitos(perdeu), b = habitos(ficou);
    if (!a) return false;
    var zerado = Object.keys(a).every(function (x) { return x === '_date' || !a[x]; });
    var diaVelho = !!(b && typeof a._date === 'string' && typeof b._date === 'string' && a._date < b._date);
    return zerado || diaVelho;
  }
  /* p = { nuvem, local, mesclado: {chave: texto}, base: {chave: hash} | null, baseTs, listas: {chave: true} }
     Devolve [{k, lado, …}]:
       · valor inteiro: lado 'local' | 'nuvem' | 'lapide' (a exclusão feita aqui valeu) | 'misto';
       · lista: lado 'uniao', com unidas (os dois lados trouxeram coisas), colisoes {local, nuvem},
         lapides e restaurados (apagados no outro aparelho que a união trouxe de volta).
     Vazio quando nada mudou dos dois lados. Sem base (aparelho que ainda não acertou com a nuvem)
     não há como saber o que mudou de cada lado: nada é descrito. */
  function descrever(p) {
    p = p || {};
    var base = p.base;
    if (!base || typeof base !== 'object') return [];
    var nuvem = p.nuvem || {}, local = p.local || {}, mesclado = p.mesclado || {}, listas = p.listas || {};
    var todas = {}, itens = [];
    [nuvem, local, base].forEach(function (o) { Object.keys(o).forEach(function (k) { todas[k] = 1; }); });
    Object.keys(todas).sort().forEach(function (k) {
      var sv = nuvem[k], lc = local[k], b = base[k] || '';
      if (vazio(sv) ? vazio(lc) : sv === lc) return;               // chegaram iguais: nada a escolher
      var nuvemMudou = assinatura(sv) !== b, localMudou = assinatura(lc) !== b;
      if (!rotulo(k)) return;
      var mg = mesclado[k], item;
      if (!localMudou) {                                           // só a nuvem mudou: o merge levou adiante…
        if (listas[k] && nuvemMudou) { item = soNuvemMudou(k, sv, mg, p.baseTs); if (item) itens.push(item); }   // …salvo o que a união desfez
        return;
      }
      if (!nuvemMudou) return;                                     // só este aparelho mudou
      if (listas[k]) { item = compararLista(k, sv, lc, mg, p.baseTs); if (item) itens.push(item); return; }
      item = { k: k, lado: 'misto' };
      if (lc === undefined && vazio(mg) && !vazio(sv)) item.lado = 'lapide';
      else if (vazio(mg) ? vazio(lc) : mg === lc) item.lado = 'local';
      else if (vazio(mg) ? vazio(sv) : mg === sv) item.lado = 'nuvem';
      if (item.lado === 'local' && semPerdaAutomatica(k, sv, lc)) return;
      if (item.lado === 'nuvem' && semPerdaAutomatica(k, lc, sv)) return;
      itens.push(item);
    });
    return itens;
  }
  // Alguma versão ficou de fora? (Listas só unidas, sem colisão nem exclusão, não perdem nada.)
  function temPerda(rel) {
    var itens = (rel && Array.isArray(rel.itens)) ? rel.itens : [];
    return itens.some(function (it) {
      if (!it || !rotulo(it.k)) return false;
      if (it.lado !== 'uniao') return true;
      var c = it.colisoes || {};
      return (+c.local || 0) + (+c.nuvem || 0) + (+it.lapides || 0) + (+it.restaurados || 0) > 0;
    });
  }

  /* ---------- 3. aparelho ---------- */
  function plataformaDe(info) {
    var ua = String(info.ua || ''), pf = String(info.plataforma || ''), toques = +info.toques || 0;
    if (/iPhone|iPod/.test(ua)) return 'iPhone';
    // o iPad (Safari em modo computador e o WKWebView do app) se apresenta como Macintosh; o toque o denuncia
    if (/iPad/.test(ua) || ((pf === 'MacIntel' || /Macintosh/.test(ua)) && toques > 1)) return 'iPad';
    if (/Android/.test(ua)) return 'Android';
    if (/Macintosh|Mac OS X/.test(ua) || /^Mac/.test(pf)) return 'Mac';
    if (/Windows/.test(ua) || /^Win/.test(pf)) return 'Windows';
    if (/CrOS/.test(ua)) return 'Chromebook';
    if (/Linux/.test(ua) || /Linux/.test(pf)) return 'Linux';
    return '';
  }
  function navegadorDe(ua) {
    if (/Edg(e|A|iOS)?\//.test(ua)) return 'Edge';
    if (/OPR\/|Opera/.test(ua)) return 'Opera';
    if (/Firefox\/|FxiOS\//.test(ua)) return 'Firefox';
    if (/SamsungBrowser\//.test(ua)) return 'Samsung Internet';
    if (/Chrome\/|CriOS\/|Chromium\//.test(ua)) return 'Chrome';
    if (/Safari\/|AppleWebKit\//.test(ua)) return 'Safari';
    return 'navegador';
  }
  /* info = {ua, plataforma, toques, protocolo, alvo}. App nativo = página em file:// (Mac e iPad
     em WKWebView, Windows em Electron) ou o alvo carimbado pelo build nativo (CATEDRA_BUILD.alvo). */
  function nomeAparelho(info) {
    info = info || {};
    var p = plataformaDe(info);
    var nativo = info.protocolo === 'file:' || info.alvo === 'macOS' || info.alvo === 'iPadOS';
    if (nativo) return p ? 'app do ' + p : 'app da Cátedra';
    var n = navegadorDe(String(info.ua || ''));
    return p ? n + ' no ' + p : n;
  }

  /* ---------- 4. textos ---------- */
  function dois(n) { return (n < 10 ? '0' : '') + n; }
  // Dia de calendário LOCAL (nunca toISOString: entre 20h e 24h no fuso −4 ele já é o dia seguinte).
  function quandoFoi(ts, agora) {
    var d = new Date(+ts), h = new Date(agora == null ? Date.now() : +agora);
    var hora = dois(d.getHours()) + ':' + dois(d.getMinutes());
    var dia = function (x) { return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
    var diff = Math.round((dia(h) - dia(d)) / 864e5);
    if (diff === 0) return 'hoje às ' + hora;
    if (diff === 1) return 'ontem às ' + hora;
    return dois(d.getDate()) + '/' + dois(d.getMonth() + 1)
      + (d.getFullYear() !== h.getFullYear() ? '/' + d.getFullYear() : '') + ' às ' + hora;
  }
  /* u = {conferido, ts, aparelho, esteAparelho, meuNome} (CatedraSync.ultimaSync).
     · conferido: a última vez que ESTE aparelho acertou com a nuvem (leu ou gravou, com sucesso);
     · ts: quando a versão que está na nuvem foi gravada; aparelho: quem a gravou ('' quando não se sabe). */
  function textoUltima(u, agora) {
    var quando = u ? Math.max(+u.conferido || 0, +u.ts || 0) : 0;
    if (!(quando > 0)) return 'Ainda não houve sincronização com a nuvem neste aparelho.';
    return 'Última sincronização: ' + quandoFoi(quando, agora);
  }
  function textoGravacao(u, agora) {
    if (!u || !(+u.ts > 0)) return '';
    var quem = u.esteAparelho ? 'este aparelho'
      : (u.aparelho ? (u.meuNome && u.aparelho === u.meuNome ? u.aparelho + ' (outro aparelho)' : u.aparelho) : '');
    return 'Última gravação na nuvem: ' + quandoFoi(u.ts, agora) + (quem ? ' · ' + quem : '');
  }
  function juntar(l) { return l.length <= 1 ? (l[0] || '') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]; }
  function maiuscula(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  // "uma sessão", "2 sessões"; "apagada", "apagados"
  function quantos(n, nomes) { return n === 1 ? (nomes[2] === 'f' ? 'uma ' : 'um ') + nomes[1] : n + ' ' + nomes[0]; }
  function flexao(raizPalavra, n, nomes) { return raizPalavra + (nomes[2] === 'f' ? 'a' : 'o') + (n === 1 ? '' : 's'); }
  // O nome da área de estudo vem do host (opcoes.nomeArea); sem ele, o próprio id.
  function nomeDaArea(a, opcoes) {
    var n = '';
    try { n = opcoes && typeof opcoes.nomeArea === 'function' ? String(opcoes.nomeArea(a) || '') : ''; } catch (_) { n = ''; }
    return n || a;
  }
  /* rel = {ts, itens, outro} (CatedraSync.ultimoConflito). opcoes = {meuNome, nomeArea(id)}.
     Uma frase por desfecho, na ordem: o que ficou deste aparelho, o que ficou da nuvem (com o nome
     do aparelho que a gravou, quando se sabe), o que ficou misturado, a exclusão que valeu, as
     listas unidas, o que a união decidiu item a item e, por último, o que não tem nome próprio. */
  function textoConflito(rel, agora, opcoes) {
    opcoes = opcoes || {};
    var itens = (rel && Array.isArray(rel.itens)) ? rel.itens : [];
    var outro = rel && rel.outro ? String(rel.outro) : '';
    var daNuvem = outro ? 'do ' + outro + (opcoes.meuNome && outro === opcoes.meuNome ? ' (outro aparelho)' : '') : 'da nuvem';
    // Agrupa por nome. O mesmo nome em áreas ou concursos diferentes (o edital da Jurídica e o da
    // Saúde) são coisas diferentes: aí cada um leva a área ou o concurso entre parênteses.
    var areas = {}, concursos = {}, lidos = [];
    itens.forEach(function (it) {
      var r = it && rotulo(it.k); if (!r) return;
      lidos.push({ it: it, r: r });
      if (r.outros) return;
      var nome = r.lista || r.t;
      (areas[nome] = areas[nome] || {})[r.area || 'juridica'] = 1;
      (concursos[nome] = concursos[nome] || {})[r.concurso || ''] = 1;
    });
    var nomeDe = function (r, base) {
      var q = [];
      if (Object.keys(areas[base] || {}).length > 1) q.push(nomeDaArea(r.area || 'juridica', opcoes));
      if (Object.keys(concursos[base] || {}).length > 1) q.push(r.concurso ? 'outro concurso' : 'concurso principal');
      return q.length ? base + ' (' + q.join(', ') + ')' : base;
    };
    var esc = {}, ordem = [], unidas = [], frasesLista = [], outros = {};
    lidos.forEach(function (x) {
      var it = x.it, r = x.r;
      if (r.outros) { outros[it.lado] = 1; return; }
      if (r.lista) {
        var nomes = r.nomes || [r.lista, r.lista, 'f'], nome = nomeDe(r, r.lista);
        var c = it.colisoes || {}, cl = +c.local || 0, cn = +c.nuvem || 0, lap = +it.lapides || 0, vol = +it.restaurados || 0;
        // item no formato antigo (sem "unidas"): a união é o que ele dizia
        if (it.unidas || it.unidas === undefined) { if (unidas.indexOf(nome) < 0) unidas.push(nome); }
        var sufixo = nome === r.lista ? '' : nome.slice(r.lista.length);
        if (cl + cn > 0) {
          var n = cl + cn;
          frasesLista.push(quantos(n, nomes) + sufixo + ' ' + (n === 1 ? 'mudou' : 'mudaram') + ' nos dois aparelhos; '
            + (cn === 0 ? 'ficou a versão deste aparelho' : cl === 0 ? 'ficou a versão ' + daNuvem : 'em cada caso ficou a versão mais recente'));
        }
        if (lap > 0) {
          frasesLista.push(quantos(lap, nomes) + sufixo + ' ' + flexao('apagad', lap, nomes) + ' neste aparelho '
            + (lap === 1 ? 'tinha' : 'tinham') + ' mudado no outro; valeu a exclusão');
        }
        if (vol > 0) {
          frasesLista.push(quantos(vol, nomes) + sufixo + ' ' + flexao('apagad', vol, nomes) + ' no outro aparelho '
            + (vol === 1 ? 'voltou, porque continuava neste' : 'voltaram, porque continuavam neste'));
        }
        return;
      }
      var t = nomeDe(r, r.t);
      if (!esc[t]) { esc[t] = { pl: r.pl, lados: {} }; ordem.push(t); }
      esc[t].lados[it.lado] = 1;
    });
    var g = { local: [], nuvem: [], misto: [], lapide: [] };
    ordem.forEach(function (t) {
      var ls = Object.keys(esc[t].lados), qual = ls.length === 1 ? ls[0] : 'misto';
      (g[qual] || g.misto).push(t);
    });
    var verbo = function (l) { return (l.length > 1 || esc[l[0]].pl) ? 'mudaram' : 'mudou'; };
    var frases = [];
    if (g.local.length) frases.push(juntar(g.local) + ' ' + verbo(g.local) + ' nos dois aparelhos; ficou a versão deste aparelho');
    if (g.nuvem.length) frases.push(juntar(g.nuvem) + ' ' + verbo(g.nuvem) + ' nos dois aparelhos; ficou a versão ' + daNuvem);
    if (g.misto.length) frases.push(juntar(g.misto) + ' ' + verbo(g.misto) + ' nos dois aparelhos; ficou uma parte de cada versão');
    if (g.lapide.length) frases.push('para ' + juntar(g.lapide) + ', valeu a exclusão feita neste aparelho');
    if (unidas.length) {
      frases.push('as listas ' + juntar(unidas.map(function (l) { return 'de ' + l; })) + ' foram unidas'
        + (temPerda(rel) ? '' : '; nada se perdeu'));
    }
    frases = frases.concat(frasesLista);
    var lo = Object.keys(outros);
    if (lo.length) {
      var fim = lo.length === 1 && lo[0] === 'local' ? '; ficou a versão deste aparelho'
        : lo.length === 1 && lo[0] === 'nuvem' ? '; ficou a versão ' + daNuvem : '';
      frases.push((frases.length ? 'outros dados também mudaram' : 'alguns dados mudaram') + ' nos dois aparelhos' + fim);
    }
    if (!frases.length) return '';
    return 'Na sincronização de ' + quandoFoi(rel.ts, agora) + ', ' + frases[0] + '.'
      + frases.slice(1).map(function (f) { return ' ' + maiuscula(f) + '.'; }).join('');
  }
  // Vários avisos ainda não lidos, do mais novo para o mais velho (os vazios saem).
  function textoConflitos(lista, agora, opcoes) {
    return (Array.isArray(lista) ? lista : []).map(function (r) { return textoConflito(r, agora, opcoes); }).filter(Boolean);
  }
  /* Os avisos que ainda não foram lidos NESTE aparelho. visto = {conta, ts}: o "Entendi" vale até o
     aviso daquela hora e só para aquela conta — dispensar numa conta não esconde o aviso da outra. */
  function naoLidos(lista, visto) {
    return (Array.isArray(lista) ? lista : []).filter(function (r) {
      if (!r || !(+r.ts > 0)) return false;
      return !(visto && typeof visto === 'object' && visto.conta === r.conta && +r.ts <= (+visto.ts || 0));
    });
  }

  raiz.CT_SYNC_CONFLITOS = {
    versao: 2,
    // a chave que viaja no corpo do envio dizendo quem gravou (EXCLUDE no auth.js)
    CHAVE_ENVIO: 'catedra:_ultimoEnvio',
    hash: hash, retrato: retrato, carimboDa: carimboDa, linhagem: linhagem, escolherBase: escolherBase, aparar: aparar,
    descrever: descrever, semRepetir: semRepetir, temPerda: temPerda, rotulo: rotulo,
    nomeAparelho: nomeAparelho, quandoFoi: quandoFoi, textoUltima: textoUltima, textoGravacao: textoGravacao,
    textoConflito: textoConflito, textoConflitos: textoConflitos, naoLidos: naoLidos
  };
})(typeof window !== 'undefined' ? window : this);
