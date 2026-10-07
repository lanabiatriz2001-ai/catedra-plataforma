/* ciclo-magistratura.js — o método "Ciclo Magistratura" (regras puras, sem DOM).

   O método, em uma frase: quatro matérias ativas em ordem, uma por dia; cada matéria trabalha
   dois assuntos por volta; cada assunto tem um Turno A (primeiro contato) e um Turno B (reteste,
   na próxima vez da matéria depois do A, travado até ele terminar). O assunto só troca quando os
   dois cadernos de questões (a1 clássicas e b2 inéditas) chegam ao fim, o que pode levar vários
   dias; cada caderno tem um progresso livre ("34/80"), zerado ao fechar; fechar o assunto entra na fila adaptativa do FSRS no host; depois do 2º assunto fechado a matéria vai para o fim da fila e a primeira da fila entra.

   Estado (chave `cmag`, objeto, sincronizado pelo carimbo da chave — ver auth.js mergeAll):
     { v, seed, up, vez, visitas, ordem:[id], mats:{id:{n,o,s}}, st:{id:{n,ass,nota,d:{a1:true…},p:{a1:'34/80',b2}}},
       links:{'<id>-<bloco>':'https://…'}, sab:{s1:true…} }
   Histórico do assunto e marcos legados ficam FORA, na chave `cmagRevs` (array com id e `up`, em ARRAY_ID do auth.js): assim
   duas revisões criadas em aparelhos diferentes se somam no merge por id, em vez de uma apagar
   a outra.
   O host mantém a revisão atual em `reviews`, usando o mesmo id e o motor fsrs.js.
     { id, mat, ass, dt:'AAAA-MM-DD', f7, f30, f90, up }

   Toda função devolve objeto NOVO (o autosave do app compara por referência). Sintaxe ES2017:
   o WKWebView roda JavaScriptCore. */
(function (raiz) {
  'use strict';

  var POR_VOLTA = 2, ATIVAS = 4, PRAZOS = [7, 30, 90];
  var DOD = 'Súmulas e Principais Julgados (Márcio Cavalcante)';

  // A lista de matérias do método. As obras aqui são as da conta semeada; para quem escolhe o
  // método sem seed, as matérias vêm com as obras em branco (cada pessoa usa as suas).
  var MATS = [
    ['const', 'Direito Constitucional', 'Dirley da Cunha Júnior · Curso de Direito Constitucional', 'CF para Concursos (Dirley e Novelino)'],
    ['civ', 'Direito Civil', 'Flávio Tartuce · Manual, vol. único', 'CC e LINDB para Concursos (Chaves, Figueiredo e Dias)'],
    ['pc', 'Processo Civil', 'Daniel Amorim · Manual, vol. único', 'CPC Comentado (Daniel Amorim)'],
    ['pen', 'Direito Penal', 'Nucci · Manual de Direito Penal', 'CP e LEP para Concursos (Rogério Sanches)'],
    ['pp', 'Processo Penal', 'Renato Brasileiro · Manual, vol. único', 'CPP Comentado (Nucci)'],
    ['adm', 'Direito Administrativo', 'Carvalho Filho · Manual', ''],
    ['cdc', 'Direito do Consumidor', 'Benjamin, Marques e Bessa · Manual', 'CDC Comentado (Leonardo Garcia)'],
    ['eca', 'ECA', 'Nucci · ECA Comentado', ''],
    ['emp', 'Direito Empresarial', 'Fábio Ulhoa · Manual de Direito Comercial', 'Curso de Dir. Empresarial v.1 (Tomazette)'],
    ['trib', 'Direito Tributário', 'Ricardo Alexandre · Direito Tributário', ''],
    ['dh', 'Direitos Humanos', 'Del Preti e Lépore · Manual de DH', ''],
    ['hum', 'Formação Humanística', 'Lordelo · Noções Gerais e Formação Humanística', ''],
    ['amb', 'Direito Ambiental', 'Livro encomendado (pendente) · por ora Lei 6.938/81', ''],
    ['elei', 'Direito Eleitoral', 'José Jairo Gomes · Direito Eleitoral (22ª ed., 2026)', '']
  ];
  var ORDEM = MATS.map(function (m) { return m[0]; });

  var SABADO = [
    ['s1', 'Caderno misto de erros da semana, de todas as matérias'],
    ['s2', 'Explicar por que cada alternativa está errada antes de responder'],
    ['s3', 'Revisões pelo FSRS vencidas'],
    ['s4', 'Revisão em Frases só nos assuntos vencidos'],
    ['s5', 'Errou de novo: card novo ou ficha corrigida']
  ];
  var ROTINA = [
    ['Abertura · 10 min', 'D+1: lembrança livre do assunto de ontem'],
    ['Turno · 1h45 a 2h', 'Os blocos do turno da matéria do dia'],
    ['Fechamento · 15 a 20 min', 'Anki à noite, no máximo 15 cards novos']
  ];
  var REGRAS = [
    'Faltou tempo: corte o turno, nunca o Anki nem o sábado.',
    'Sobrou tempo: Anki atrasado, depois erros acumulados. Nunca matéria nova.'
  ];
  var AUXILIARES = ['Vade Mecum', DOD, 'Revisão em Frases (só no sábado)', 'Revisaço TRF (banco extra para a Federal)'];

  // A conta que nasce com o ciclo cadastrado. O repositório é público: guardamos só o hash
  // FNV-1a do e-mail em minúsculas, não o endereço.
  var CONTAS_SEED = { 'c788a02f': 'lana-2026-10' };

  function fnv(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function seedDaConta(email) { return CONTAS_SEED[fnv(String(email || '').trim().toLowerCase())] || ''; }

  function blocosA(m) {
    return [
      { k: 'a1', b: 'Clássicas objetivas · até o fim do caderno', s: 'Caderno TEC · marque a certeza · não acabou no dia: continua quando a matéria voltar', tec: true, pr: true },
      { k: 'a2', b: 'Obra principal no trecho dos erros + lei seca', s: (m.o ? m.o + ' · ' : '') + 'Vade Mecum · ' + DOD },
      { k: 'a3', b: 'Conversa com a IA + ficha de memória', s: 'Você explica primeiro; a ficha sai com o livro fechado' },
      { k: 'a4', b: 'Cards dos erros', s: 'Erro, chute certo e erro confiante viram card' }
    ];
  }
  function blocosB(m) {
    return [
      { k: 'b1', b: 'Lembrança livre · 3 min', s: 'Tudo o que lembra do assunto, sem consulta' },
      { k: 'b2', b: 'Inéditas · até o fim do caderno', s: 'Caderno TEC · marque a certeza · continua na próxima vez da matéria', tec: true, pr: true },
      m.s ? { k: 'b3', b: 'Segunda obra nos dispositivos errados', s: m.s + ' · só os artigos ligados aos erros' }
          : { k: 'b3', b: 'Jurisprudência dos erros', s: DOD + ' · só o que os erros pediram' },
      { k: 'b4', b: 'Discursiva', s: 'Uma questão à mão, depois a correção', tec: true },
      { k: 'b5', b: 'Cards e fechamento', s: 'Novos erros viram cards; fechar inclui o assunto nas revisões pelo FSRS' }
    ];
  }

  function obj(x) { return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; }
  function txt(x, max) { return String(x == null ? '' : x).slice(0, max || 300); }

  /* Estado em forma: tolera lixo, chave faltando e matéria nova numa versão futura da lista. */
  function normalizar(c) {
    c = obj(c);
    var mats = {}, src = obj(c.mats);
    MATS.forEach(function (m) {
      var x = obj(src[m[0]]);
      mats[m[0]] = { n: m[1], o: typeof x.o === 'string' ? txt(x.o) : '', s: typeof x.s === 'string' ? txt(x.s) : '' };
    });
    var ordem = (Array.isArray(c.ordem) ? c.ordem : []).filter(function (id, i, a) { return mats[id] && a.indexOf(id) === i; });
    ORDEM.forEach(function (id) { if (ordem.indexOf(id) < 0) ordem.push(id); });
    var st = {}, s0 = obj(c.st);
    ordem.forEach(function (id) {
      var x = obj(s0[id]), d = {};
      Object.keys(obj(x.d)).forEach(function (k) { if (/^[ab][1-5]$/.test(k) && x.d[k]) d[k] = true; });
      var pr = {}; ['a1', 'b2'].forEach(function (k) { var v = obj(x.p)[k]; if (v != null && String(v).trim()) pr[k] = txt(v, 40); });
      var rf = obj(x.ref), ref = rf.t ? { t: txt(rf.t), s: txt(rf.s) } : null;
      st[id] = { n: Math.max(0, Math.min(POR_VOLTA - 1, parseInt(x.n, 10) || 0)), ass: txt(x.ass), nota: txt(x.nota), d: d, p: pr, ref: ref, aVisita: x.aVisita == null ? null : Math.max(0, +x.aVisita || 0), ocorrencia: Math.max(0, +x.ocorrencia || 0) };
    });
    var links = {};
    Object.keys(obj(c.links)).forEach(function (k) { if (/^[a-z]+-[ab][1-5]$/.test(k) && linkValido(c.links[k])) links[k] = c.links[k]; });
    var sab = {};
    SABADO.forEach(function (s) { if (obj(c.sab)[s[0]]) sab[s[0]] = true; });
    var vez = parseInt(c.vez, 10) || 0; if (vez < 0 || vez >= ATIVAS) vez = 0;
    return { v: 1, seed: txt(c.seed, 40), up: +c.up || 0, vez: vez, visitas: Math.max(0, +c.visitas || 0), ordem: ordem, mats: mats, st: st, links: links, sab: sab };
  }
  function vazio(semObras) {
    var c = normalizar({});
    if (!semObras) MATS.forEach(function (m) { c.mats[m[0]] = { n: m[1], o: m[2], s: m[3] }; });
    return c;
  }
  /* "A pessoa já começou?" — qualquer coisa além do estado recém-criado conta como progresso. */
  function temProgresso(c, revs) {
    if (Array.isArray(revs) && revs.length) return true;
    if (!c || typeof c !== 'object' || !Array.isArray(c.ordem)) return false;
    var n = normalizar(c);
    if (n.seed) return true;
    if (Object.keys(n.links).length || Object.keys(n.sab).length) return true;
    return n.ordem.some(function (id) { var s = n.st[id]; return s.n || s.ass || s.nota || Object.keys(s.d).length || Object.keys(s.p).length; });
  }

  /* O seed da conta: as 14 matérias com as obras, Constitucional no assunto 1/2 com Teoria da
     Constituição e o próximo assunto como nota. Idempotente pelo chamador: só entra quando
     temProgresso() é falso. */
  function seed(tag, agora) {
    var c = vazio(false);
    c.seed = tag; c.up = agora || 0;
    c.st.const = { n: 0, ass: 'Teoria da Constituição: constitucionalismo, conceito e classificação das constituições',
      nota: 'Próximo assunto: Poder constituinte e direito constitucional no tempo', d: {}, p: {} };
    return c;
  }

  function linkValido(u) { return typeof u === 'string' && u.length <= 2000 && /^https?:\/\/[^\s<>"']+$/i.test(u.trim()); }

  function com(c, mud, agora) { var n = normalizar(c); mud(n); n.up = agora || Date.now(); return n; }
  function turnoAFeito(c, id) { var s = normalizar(c).st[id], m = normalizar(c).mats[id]; return !!s && !cadernoIncompleto(s.p.a1) && blocosA(m).every(function (b) { return s.d[b.k]; }); }
  function turnoBFeito(c, id) { var s = normalizar(c).st[id], m = normalizar(c).mats[id]; return !!s && !cadernoIncompleto(s.p.b2) && blocosB(m).every(function (b) { return s.d[b.k]; }); }

  // O reteste começa numa passagem posterior. Progresso antigo de B é preservado.
  function turnoBLiberado(c, id) {
    var n = normalizar(c), s = n.st[id];
    if (!s || !turnoAFeito(n, id)) return false;
    if (Object.keys(s.d).some(function (k) { return k.charAt(0) === 'b'; })) return true;
    return n.ordem[n.vez] === id && (s.aVisita == null || n.visitas > s.aVisita);
  }
  function cadernoIncompleto(v) {
    var m = String(v || '').trim().match(/^(\d+)\s*\/\s*(\d+)$/);
    return !!m && (+m[2] <= 0 || +m[1] < +m[2]);
  }

  /* Marca/desmarca um bloco. O Turno B não aceita marca enquanto o A não terminar; desmarcar um
     bloco do A com o B já começado mantém o B (desfazer não apaga trabalho). */
  function alternar(c, id, k, agora) {
    var n = normalizar(c);
    if (!n.st[id] || !/^[ab][1-5]$/.test(k)) return n;
    if (k.charAt(0) === 'b' && !n.st[id].d[k] && !turnoBLiberado(n, id)) return n;
    if (!n.st[id].d[k] && (k === 'a1' || k === 'b2') && cadernoIncompleto(n.st[id].p[k])) return n;
    return com(n, function (x) {
      var d = Object.assign({}, x.st[id].d);
      if (d[k]) delete d[k]; else d[k] = true;
      x.st[id] = Object.assign({}, x.st[id], { d: d });
      if (k.charAt(0) === 'a') {
        if (turnoAFeito(x, id) && !turnoAFeito(n, id)) x.st[id].aVisita = x.visitas;
        else if (!turnoAFeito(x, id)) x.st[id].aVisita = null;
      }
    }, agora);
  }
  function definir(c, id, campo, valor, agora) {
    var n = normalizar(c);
    if (!n.st[id]) return n;
    if (campo === 'ass' || campo === 'nota') return com(n, function (x) { var o = {}; o[campo] = txt(valor); x.st[id] = Object.assign({}, x.st[id], o); }, agora);
    // progresso livre do caderno (ex.: 34/80): só nos dois blocos de questões, a1 e b2
    if (campo === 'p:a1' || campo === 'p:b2') return com(n, function (x) { var k = campo.slice(2), pr = Object.assign({}, x.st[id].p); if (String(valor || '').trim()) pr[k] = txt(valor, 40); else delete pr[k]; x.st[id] = Object.assign({}, x.st[id], { p: pr }); }, agora);
    if (campo === 'o' || campo === 's') return com(n, function (x) { var o = {}; o[campo] = txt(valor); x.mats[id] = Object.assign({}, x.mats[id], o); }, agora);
    return n;
  }
  /* Link do TEC: vazio apaga; qualquer coisa que não seja http(s) é recusada (devolve null). */
  function definirLink(c, chave, url, agora) {
    var n = normalizar(c), u = String(url == null ? '' : url).trim();
    if (!/^[a-z]+-[ab][1-5]$/.test(chave) || !n.st[chave.split('-')[0]]) return null;
    if (u && !linkValido(u)) return null;
    return com(n, function (x) { var l = Object.assign({}, x.links); if (u) l[chave] = u; else delete l[chave]; x.links = l; }, agora);
  }
  function alternarSabado(c, k, agora) {
    return com(c, function (x) { var s = Object.assign({}, x.sab); if (s[k]) delete s[k]; else if (SABADO.some(function (q) { return q[0] === k; })) s[k] = true; x.sab = s; }, agora);
  }
  function zerarSabado(c, agora) { return com(c, function (x) { x.sab = {}; }, agora); }
  function avancarVez(c, agora) { return com(c, function (x) { x.vez = (x.vez + 1) % ATIVAS; x.visitas++; }, agora); }

  /* Fechar o assunto: só com A e B completos. Devolve {cmag, rev} ou null. */
  function fechar(c, id, hojeISO, agora) {
    var n = normalizar(c);
    if (!n.st[id] || !turnoAFeito(n, id) || !turnoBFeito(n, id)) return null;
    agora = agora || Date.now();
    var s = n.st[id], i = n.ordem.indexOf(id);
    var rev = { id: 'cm-' + id + '-' + agora, mat: id, ass: n.mats[id].n + ' · ' + (s.ass || ('assunto ' + (s.n + 1))), dt: hojeISO, f7: false, f30: false, f90: false, up: agora };
    var out = com(n, function (x) {
      var nn = s.n + 1;
      x.st[id] = Object.assign({}, s, { n: nn >= POR_VOLTA ? 0 : nn, ass: '', d: {}, p: {}, ref: null, aVisita: null, ocorrencia: agora });
      if (nn >= POR_VOLTA) {
        var o = x.ordem.slice(); o.splice(i, 1); o.push(id); x.ordem = o;
        // a vez aponta para a mesma matéria de antes quando quem saiu estava antes dela
        if (i < x.vez) x.vez = x.vez - 1;
        if (x.vez >= ATIVAS) x.vez = 0;
      }
    }, agora);
    return { cmag: out, rev: rev };
  }

  function somaDias(iso, d) {
    var p = String(iso || '').split('-'); var dt = new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1);
    dt.setDate(dt.getDate() + d);
    var z = function (v) { return (v < 10 ? '0' : '') + v; };
    return dt.getFullYear() + '-' + z(dt.getMonth() + 1) + '-' + z(dt.getDate());
  }
  /* As três datas de uma revisão; vencida = data ≤ hoje e não feita. */
  function prazos(rev, hojeISO) {
    return PRAZOS.map(function (d) {
      var due = somaDias(rev.dt, d), feita = !!rev['f' + d];
      return { d: d, due: due, feita: feita, vencida: !feita && due <= hojeISO };
    });
  }
  function marcarRevisao(revs, id, d, agora) {
    return (Array.isArray(revs) ? revs : []).map(function (r) {
      if (!r || r.id !== id || PRAZOS.indexOf(+d) < 0) return r;
      var o = Object.assign({}, r); o['f' + d] = !r['f' + d]; o.up = agora || Date.now(); return o;
    });
  }

  /* A volta do ciclo para o resto do app (linha do dia, "Executar"): um bloco por matéria
     ativa, a partir da vez. Mesma forma dos blocos de _genVolta. */
  function gerarVolta(c, n, hojeISO, base) {
    var x = normalizar(c); n = n || 1;
    var min = Math.max(60, base || 110), blocos = [];
    for (var j = 0; j < ATIVAS; j++) {
      var id = x.ordem[(x.vez + j) % ATIVAS], s = x.st[id], m = x.mats[id];
      var turno = turnoAFeito(x, id) && turnoBLiberado(x,id) ? 'Turno B' : 'Turno A';
      blocos.push({ id: 'cm-' + id + '-' + s.ocorrencia + '-' + s.n + '-' + fnv(s.ass) + '-' + (turno === 'Turno A' ? 'a' : 'b'), disc: m.n, kind: 'Estudo dirigido', tag: turno + ' · assunto ' + (s.n + 1) + '/' + POR_VOLTA,
        topico: s.ass || '', discEdital: '', min: min, motivo: 'Ciclo Magistratura · ' + turno, done: false, pulado: false, doneDate: '' });
    }
    return { n: n, modo: 'magistratura', blocos: blocos, geradoEm: hojeISO || '', totalMin: blocos.reduce(function (a, b) { return a + b.min; }, 0) };
  }

  /* Certeza por questão. Chute certo conta como ERRO: vai para o caderno com resultado
     'chute_certo'. Acerto com certeza alta ou média não gera registro (devolve null). A categoria
     é única entre as cinco do método; o `motivo` de sempre do caderno é derivado dela, para os
     filtros e gráficos que já existem continuarem contando. */
  var CERTEZAS = [['alta', 'Alta'], ['media', 'Média'], ['chute', 'Chute']];
  var CATEGORIAS = [['lei_seca', 'Lei seca', 'decoreba'], ['doutrina', 'Doutrina', 'conteudo'], ['jurisprudencia', 'Jurisprudência', 'conteudo'],
    ['atencao_interpretacao', 'Atenção ou interpretação', 'interpretacao'], ['lacuna', 'Lacuna (nunca vi)', 'conteudo']];
  function classificar(acertou, certeza, categoria) {
    if (!CERTEZAS.some(function (c) { return c[0] === certeza; })) return null;
    if (acertou && certeza !== 'chute') return null;
    var cat = CATEGORIAS.filter(function (c) { return c[0] === categoria; })[0];
    var resultado = acertou ? 'chute_certo' : 'erro';
    return { resultado: resultado, certeza: certeza, categoria: cat ? cat[0] : '', motivo: acertou ? 'chute' : (cat ? cat[2] : 'conteudo') };
  }

  /* ===== Ligação com o edital =====
     Cada matéria do ciclo acha a sua disciplina no edital ativo pelo nome (com apelidos: "ECA" é
     "Direito da Criança e do Adolescente"). Quando acha, o assunto atual é um tópico ou subtópico
     dela — guardado pelos NOMES ({t, s}), que sobrevivem a reordenar o edital — e fechar o
     assunto marca esse item como estudado e propõe o próximo pendente. */
  var APELIDOS = {
    const: ['direito constitucional', 'constitucional'], civ: ['direito civil', 'civil'],
    pc: ['processo civil', 'direito processual civil'], pen: ['direito penal', 'penal'],
    pp: ['processo penal', 'direito processual penal'], adm: ['direito administrativo', 'administrativo'],
    cdc: ['direito do consumidor', 'consumidor'], eca: ['direito da crianca e do adolescente', 'eca', 'estatuto da crianca e do adolescente'],
    emp: ['direito empresarial', 'empresarial', 'direito comercial'], trib: ['direito tributario', 'tributario'],
    dh: ['direitos humanos'], hum: ['nocoes gerais de direito e formacao humanistica', 'formacao humanistica'],
    amb: ['direito ambiental', 'ambiental'], elei: ['direito eleitoral', 'eleitoral']
  };
  function norm(x) { return String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function nomeSub(x) { return typeof x === 'string' ? x : (x && x.name) || ''; }
  function feitoSub(x) { return !!(x && typeof x === 'object' && x.done); }
  /* índice da disciplina do edital ligada à matéria, ou -1 */
  function discDoEdital(edital, id) {
    var nomes = (APELIDOS[id] || []).map(norm);
    if (!Array.isArray(edital) || !nomes.length) return -1;
    for (var i = 0; i < edital.length; i++) { if (edital[i] && nomes.indexOf(norm(edital[i].disc)) >= 0) return i; }
    return -1;
  }
  /* tópicos e subtópicos em ordem, achatados: {t, s, nome, feito, ti, si} (s='' no tópico) */
  function itensDaDisc(disc) {
    var out = [];
    ((disc && disc.topics) || []).forEach(function (tp, ti) {
      if (!tp || !tp.name) return;
      out.push({ t: tp.name, s: '', nome: tp.name, feito: !!tp.done, ti: ti, si: -1 });
      (Array.isArray(tp.subs) ? tp.subs : []).forEach(function (sb, si) {
        var n = nomeSub(sb); if (n) out.push({ t: tp.name, s: n, nome: n, feito: feitoSub(sb) || !!tp.done, ti: ti, si: si });
      });
    });
    return out;
  }
  function posRef(itens, ref) {
    if (!ref || !ref.t) return -1;
    for (var i = 0; i < itens.length; i++) { if (itens[i].t === ref.t && itens[i].s === (ref.s || '')) return i; }
    return -1;
  }
  /* o próximo item ainda não estudado depois do ref (ou o primeiro pendente) */
  function proximoPendente(disc, ref) {
    var itens = itensDaDisc(disc), i0 = posRef(itens, ref) + 1;
    for (var i = i0; i < itens.length; i++) { if (!itens[i].feito) return itens[i]; }
    for (var j = 0; j < i0 && j < itens.length; j++) { if (!itens[j].feito) return itens[j]; }
    return null;
  }
  /* edital NOVO com o item do ref marcado como estudado (tópico inteiro ou um subtópico) */
  function marcarNoEdital(edital, d, ref) {
    if (!Array.isArray(edital) || !edital[d] || !ref || !ref.t) return edital;
    var disc = edital[d], ti = -1;
    (disc.topics || []).forEach(function (tp, i) { if (ti < 0 && tp && tp.name === ref.t) ti = i; });
    if (ti < 0) return edital;
    var topics = disc.topics.slice(), tp = Object.assign({}, topics[ti]);
    if (ref.s) {
      var subs = (Array.isArray(tp.subs) ? tp.subs : []).map(function (sb) {
        return nomeSub(sb) === ref.s ? { name: ref.s, done: true } : (typeof sb === 'string' ? { name: sb, done: false } : sb);
      });
      tp.subs = subs;
    } else tp.done = true;
    topics[ti] = tp;
    var out = edital.slice(); out[d] = Object.assign({}, disc, { topics: topics });
    return out;
  }
  function definirRef(c, id, item, agora) {
    var n = normalizar(c); if (!n.st[id]) return n;
    return com(n, function (x) { x.st[id] = Object.assign({}, x.st[id], item ? { ass: txt(item.nome), ref: { t: txt(item.t), s: txt(item.s) } } : { ref: null }); }, agora);
  }


  raiz.CT_CMAG = {
    POR_VOLTA: POR_VOLTA, ATIVAS: ATIVAS, PRAZOS: PRAZOS, MATS: MATS, ORDEM: ORDEM,
    SABADO: SABADO, ROTINA: ROTINA, REGRAS: REGRAS, AUXILIARES: AUXILIARES,
    fnv: fnv, seedDaConta: seedDaConta, blocosA: blocosA, blocosB: blocosB,
    normalizar: normalizar, vazio: vazio, temProgresso: temProgresso, seed: seed,
    linkValido: linkValido, turnoAFeito: turnoAFeito, turnoBLiberado: turnoBLiberado, cadernoIncompleto: cadernoIncompleto, turnoBFeito: turnoBFeito,
    alternar: alternar, definir: definir, definirLink: definirLink,
    alternarSabado: alternarSabado, zerarSabado: zerarSabado, avancarVez: avancarVez,
    CERTEZAS: CERTEZAS, CATEGORIAS: CATEGORIAS, classificar: classificar,
    norm: norm, discDoEdital: discDoEdital, itensDaDisc: itensDaDisc, proximoPendente: proximoPendente, marcarNoEdital: marcarNoEdital, definirRef: definirRef,
    fechar: fechar, somaDias: somaDias, prazos: prazos, marcarRevisao: marcarRevisao, gerarVolta: gerarVolta
  };
})(typeof window !== 'undefined' ? window : globalThis);
