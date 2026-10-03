/* ciclo-magistratura.js — o método "Ciclo Magistratura" (regras puras, sem DOM).

   O método, em uma frase: quatro matérias ativas em ordem, uma por dia; cada matéria trabalha
   dois assuntos por volta; cada assunto tem um Turno A (primeiro contato) e um Turno B (reteste,
   4–6 dias depois, travado até o A terminar); fechar o assunto agenda revisões em D+7, D+30 e
   D+90; depois do 2º assunto fechado a matéria vai para o fim da fila e a primeira da fila entra.

   Estado (chave `cmag`, objeto, sincronizado pelo carimbo da chave — ver auth.js mergeAll):
     { v, seed, up, vez, ordem:[id], mats:{id:{n,o,s}}, st:{id:{n,ass,nota,d:{a1:true…}}},
       links:{'<id>-<bloco>':'https://…'}, sab:{s1:true…} }
   Revisões ficam FORA, na chave `cmagRevs` (array com id e `up`, em ARRAY_ID do auth.js): assim
   duas revisões criadas em aparelhos diferentes se somam no merge por id, em vez de uma apagar
   a outra.
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
    ['elei', 'Direito Eleitoral', 'Livro encomendado (pendente) · por ora Código Eleitoral Anotado (TSE)', '']
  ];
  var ORDEM = MATS.map(function (m) { return m[0]; });

  var SABADO = [
    ['s1', 'Caderno misto de erros da semana, de todas as matérias'],
    ['s2', 'Explicar por que cada alternativa está errada antes de responder'],
    ['s3', 'Revisões D+7, D+30 e D+90 vencidas'],
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
      { k: 'a1', b: 'Clássicas objetivas', s: 'Caderno TEC · marque a certeza de cada questão', tec: true },
      { k: 'a2', b: 'Obra principal no trecho dos erros + lei seca', s: (m.o ? m.o + ' · ' : '') + 'Vade Mecum · ' + DOD },
      { k: 'a3', b: 'Conversa com a IA + ficha de memória', s: 'Você explica primeiro; a ficha sai com o livro fechado' },
      { k: 'a4', b: 'Cards dos erros', s: 'Erro, chute certo e erro confiante viram card' }
    ];
  }
  function blocosB(m) {
    return [
      { k: 'b1', b: 'Lembrança livre · 3 min', s: 'Tudo o que lembra do assunto, sem consulta' },
      { k: 'b2', b: 'Inéditas', s: 'Caderno TEC · marque a certeza de cada questão', tec: true },
      m.s ? { k: 'b3', b: 'Segunda obra nos dispositivos errados', s: m.s + ' · só os artigos ligados aos erros' }
          : { k: 'b3', b: 'Jurisprudência dos erros', s: DOD + ' · só o que os erros pediram' },
      { k: 'b4', b: 'Discursiva', s: 'Uma questão à mão, depois a correção', tec: true },
      { k: 'b5', b: 'Cards e fechamento', s: 'Novos erros viram cards; fechar agenda D+7, D+30 e D+90' }
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
      st[id] = { n: Math.max(0, Math.min(POR_VOLTA - 1, parseInt(x.n, 10) || 0)), ass: txt(x.ass), nota: txt(x.nota), d: d };
    });
    var links = {};
    Object.keys(obj(c.links)).forEach(function (k) { if (/^[a-z]+-[ab][1-5]$/.test(k) && linkValido(c.links[k])) links[k] = c.links[k]; });
    var sab = {};
    SABADO.forEach(function (s) { if (obj(c.sab)[s[0]]) sab[s[0]] = true; });
    var vez = parseInt(c.vez, 10) || 0; if (vez < 0 || vez >= ATIVAS) vez = 0;
    return { v: 1, seed: txt(c.seed, 40), up: +c.up || 0, vez: vez, ordem: ordem, mats: mats, st: st, links: links, sab: sab };
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
    return n.ordem.some(function (id) { var s = n.st[id]; return s.n || s.ass || s.nota || Object.keys(s.d).length; });
  }

  /* O seed da conta: as 14 matérias com as obras, Constitucional no assunto 1/2 com Teoria da
     Constituição e o próximo assunto como nota. Idempotente pelo chamador: só entra quando
     temProgresso() é falso. */
  function seed(tag, agora) {
    var c = vazio(false);
    c.seed = tag; c.up = agora || 0;
    c.st.const = { n: 0, ass: 'Teoria da Constituição: constitucionalismo, conceito e classificação das constituições',
      nota: 'Próximo assunto: Poder constituinte e direito constitucional no tempo', d: {} };
    return c;
  }

  function linkValido(u) { return typeof u === 'string' && u.length <= 2000 && /^https?:\/\/[^\s<>"']+$/i.test(u.trim()); }

  function com(c, mud, agora) { var n = normalizar(c); mud(n); n.up = agora || Date.now(); return n; }
  function turnoAFeito(c, id) { var s = normalizar(c).st[id], m = normalizar(c).mats[id]; return !!s && blocosA(m).every(function (b) { return s.d[b.k]; }); }
  function turnoBFeito(c, id) { var s = normalizar(c).st[id], m = normalizar(c).mats[id]; return !!s && blocosB(m).every(function (b) { return s.d[b.k]; }); }

  /* Marca/desmarca um bloco. O Turno B não aceita marca enquanto o A não terminar; desmarcar um
     bloco do A com o B já começado mantém o B (desfazer não apaga trabalho). */
  function alternar(c, id, k, agora) {
    var n = normalizar(c);
    if (!n.st[id] || !/^[ab][1-5]$/.test(k)) return n;
    if (k.charAt(0) === 'b' && !n.st[id].d[k] && !turnoAFeito(n, id)) return n;
    return com(n, function (x) { var d = Object.assign({}, x.st[id].d); if (d[k]) delete d[k]; else d[k] = true; x.st[id] = Object.assign({}, x.st[id], { d: d }); }, agora);
  }
  function definir(c, id, campo, valor, agora) {
    var n = normalizar(c);
    if (!n.st[id]) return n;
    if (campo === 'ass' || campo === 'nota') return com(n, function (x) { var o = {}; o[campo] = txt(valor); x.st[id] = Object.assign({}, x.st[id], o); }, agora);
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
  function avancarVez(c, agora) { return com(c, function (x) { x.vez = (x.vez + 1) % ATIVAS; }, agora); }

  /* Fechar o assunto: só com A e B completos. Devolve {cmag, rev} ou null. */
  function fechar(c, id, hojeISO, agora) {
    var n = normalizar(c);
    if (!n.st[id] || !turnoAFeito(n, id) || !turnoBFeito(n, id)) return null;
    agora = agora || Date.now();
    var s = n.st[id], i = n.ordem.indexOf(id);
    var rev = { id: 'cm-' + id + '-' + agora, mat: id, ass: n.mats[id].n + ' · ' + (s.ass || ('assunto ' + (s.n + 1))), dt: hojeISO, f7: false, f30: false, f90: false, up: agora };
    var out = com(n, function (x) {
      var nn = s.n + 1;
      x.st[id] = Object.assign({}, s, { n: nn >= POR_VOLTA ? 0 : nn, ass: '', d: {} });
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
      var turno = turnoAFeito(x, id) ? 'Turno B' : 'Turno A';
      blocos.push({ id: 'v' + n + '-cm' + j, disc: m.n, kind: 'Teoria', tag: turno + ' · assunto ' + (s.n + 1) + '/' + POR_VOLTA,
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

  raiz.CT_CMAG = {
    POR_VOLTA: POR_VOLTA, ATIVAS: ATIVAS, PRAZOS: PRAZOS, MATS: MATS, ORDEM: ORDEM,
    SABADO: SABADO, ROTINA: ROTINA, REGRAS: REGRAS, AUXILIARES: AUXILIARES,
    fnv: fnv, seedDaConta: seedDaConta, blocosA: blocosA, blocosB: blocosB,
    normalizar: normalizar, vazio: vazio, temProgresso: temProgresso, seed: seed,
    linkValido: linkValido, turnoAFeito: turnoAFeito, turnoBFeito: turnoBFeito,
    alternar: alternar, definir: definir, definirLink: definirLink,
    alternarSabado: alternarSabado, zerarSabado: zerarSabado, avancarVez: avancarVez,
    CERTEZAS: CERTEZAS, CATEGORIAS: CATEGORIAS, classificar: classificar,
    fechar: fechar, somaDias: somaDias, prazos: prazos, marcarRevisao: marcarRevisao, gerarVolta: gerarVolta
  };
})(typeof window !== 'undefined' ? window : globalThis);
