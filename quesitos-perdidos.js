/* QUESITOS PERDIDOS — "o que você repete" (25/11/2026) — quesitos-perdidos.js
   Miolo puro, sem DOM e sem rede: lê o redHist (uma entrada por peça corrigida, com a nota
   de cada quesito) e responde três perguntas:
     1. o que a pessoa perde de novo, por disciplina e tema, entre a primeira e a última peça;
     2. como o quesito perdido vira card do Anki no modelo Aulão (frente[TAB]verso);
     3. como o quesito perdido entra no caderno de erros, pelo coletor que já existe.

   O que o app grava (e por isso este arquivo é como é):
     - a Redação grava cada quesito como "Quesito N" (IA, corretor local e conferência própria);
       o título da peça é o cabeçalho da prova + o enunciado, cortado em 80 caracteres;
     - desde esta versão, a correção grava também o número do quesito, o começo LITERAL do texto
       dele no espelho usado e os fundamentos (anotarQuesitos, chamado pelo host) e o id da prova;
     - a 2ª fase grava "rótulo — tema" com nota 0/0,5/1 sobre 1 e o valor real do quesito em "peso".

   Regras duras (as mesmas do corretor):
     - a exigência do quesito é LITERAL: vem do espelho do banco, do espelho sugerido guardado ou do
       texto gravado na correção; "Quesito N", "Nota geral" e "Cobertura do espelho" são rótulos do
       app e nunca saem como texto da banca;
     - a conta é feita aqui, com os números gravados; nota estimada pelo corretor local (a IA falhou
       ou pulou o quesito) não conta como perda;
     - a pontuação é a da banca: na 2ª fase, o valor do quesito, não a nota de 0 a 1 do simulado;
     - texto cortado sai avisado (e os quesitos além do 40º, que o registro não guarda, também);
       espelho sugerido sai dito como sugerido, não oficial;
     - a frente do card e a pergunta do caderno não trazem a resposta: nem a exigência, nem o tema
       de agrupamento (que, sem dispositivo, é o começo da exigência), nem os dispositivos;
     - peça antiga sem prova ligada só se junta a ela mesma: título igual não prova que é a mesma prova.

   Publica window.CT_QUESITOS_PERDIDOS = { LIMIAR_PERDIDO, TEXTO_MAX, perdido, temaDe, anotarQuesitos,
     oQueRepete, temasDe, vistaTema, exportavel, cardAnki, arquivoAnki, paraCaderno, paraCadernoLote,
     dataCurta }. */
(function () {
  'use strict';

  /* Abaixo desta fração dos pontos do quesito, ele conta como PERDIDO. Meio ponto para
     cima é "atendido em parte": aparece na curva de evolução, não nesta tela. */
  var LIMIAR_PERDIDO = 0.5;
  /* O registro guarda só o começo do texto do quesito (o mesmo teto do título): o redHist vai para
     o sync, e o texto integral continua no banco ou no espelho sugerido guardado — é de lá que a tela
     lê quando a prova confere. Basta para conferir a ligação; o que passar disso sai avisado. */
  var TEXTO_MAX = 120;
  var CADERNO_MAX = 1200;      // o coletor corta enunciado e gabarito do erro em 1200
  var REG_MAX = 40;            // o _redRegistrar guarda até 40 quesitos por peça
  var SEM_DISC = 'Sem disciplina';
  var RE_QUESITO = /^\s*(\d{1,2})[.)]\s+(.{15,})$/;          // a mesma linha que o _redQuesitos do host lê
  var RE_FUND = /^\s*Fundamentos?(?:\s+exigidos)?\s*:\s*(.+)$/i;   // linha de baixo: oficial e sugerido
  var RE_PONTOS = /\s*\(\s*\d+(?:[.,]\d+)?\s*pontos?\s*\)\s*$/i;  // "(0.5 pontos)" que o app acrescenta
  var RE_ESCALA = /\s*\[escala:[^\]]*\]\s*/i;
  var RE_NUM = /^\s*(?:item\s*)?\(?\d+[.)\]]?\s*/i;          // o prefixo que _abrirDiscursiva tira do espelho
  var RE_ROTULO_APP = /^\s*quesito\s+(\d{1,2})\s*$/i;          // rótulo que o app grava no lugar do texto

  function txt(x) { return String(x == null ? '' : x); }
  function achatar(t) {
    var x = txt(t);
    try { x = x.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (_) {}
    return x.toLowerCase().replace(/\s+/g, ' ').trim();
  }
  function limpo(t) { return txt(t).replace(/\s+/g, ' ').trim(); }
  function num(x) { return (Math.round((+x || 0) * 100) / 100).toFixed(2).replace('.', ','); }
  function escHtml(t) { return txt(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function umaLinha(t) { return txt(t).replace(/\t/g, ' ').replace(/\r?\n/g, '<br>').trim(); }
  function lista(x) { return (Array.isArray(x) ? x : []).map(limpo).filter(Boolean); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  /** dd/mm no fuso do aparelho, a partir do carimbo: o "quando" do registro é gravado em UTC e
      vira o dia seguinte numa correção feita à noite no Brasil. */
  function dataCurta(ts) {
    if (!(+ts > 0)) return '';
    var d = new Date(+ts); return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1);
  }
  /** Corta em fronteira de palavra e marca com reticências. */
  function cortaRotulo(t, n) {
    var s = limpo(t); if (s.length <= n) return s;
    var c = s.slice(0, n), i = c.lastIndexOf(' ');
    return (i > n * 0.6 ? c.slice(0, i) : c).replace(/[\s,;:.—–-]+$/, '') + '…';
  }
  /** Mesmo quesito: o começo dos dois textos (até 100 caracteres, sem acento) é igual. */
  function mesmoComeco(a, b) {
    var x = achatar(a), y = achatar(b), k = Math.min(x.length, y.length, 100);
    return k >= 12 && x.slice(0, k) === y.slice(0, k);
  }

  function fracao(nota, max) {
    var m = +max; if (!(m > 0)) return null;
    return Math.max(0, Math.min(1, (+nota || 0) / m));
  }
  /** Quesito perdido: fez menos que LIMIAR_PERDIDO dos pontos. Sem máximo, não há como dizer. */
  function perdido(q) {
    var f = q ? fracao(q.nota, q.max) : null;
    return f != null && f < LIMIAR_PERDIDO;
  }

  /* ---- gravação: o que o host anota em cada quesito na hora de corrigir ---- */
  /** Liga cada "Quesito N" da correção à linha do espelho usado (oficial, sugerido ou colado) e
      devolve a lista com o número, o começo literal do texto (sem a pontuação que o app acrescenta)
      e os fundamentos da linha de baixo. Critério de prosa ("Cobertura do espelho", "Nota geral")
      e lista que não confere com o espelho saem como vieram. */
  function anotarQuesitos(quesitos, gab) {
    var linhas = txt(gab).split('\n'), qs = [];
    for (var i = 0; i < linhas.length; i++) {
      var m = RE_QUESITO.exec(linhas[i]); if (!m) continue;
      var f = RE_FUND.exec(linhas[i + 1] || '');
      qs.push({ n: +m[1], texto: limpo(m[2].replace(RE_ESCALA, ' ').replace(RE_PONTOS, '')),
        disp: f ? lista(f[1].split(';')) : [] });
    }
    var l = Array.isArray(quesitos) ? quesitos : [];
    return l.map(function (q, k) {
      var e = qs[k], r = q && RE_ROTULO_APP.exec(txt(q.titulo));
      // a correção segue a ordem das linhas do espelho; qualquer desencontro, não anota
      if (!q || !e || !r || +r[1] !== e.n || l.length !== qs.length) return q;
      var o = {}; for (var c in q) if (Object.prototype.hasOwnProperty.call(q, c)) o[c] = q[c];
      o.n = e.n; o.texto = e.texto.slice(0, TEXTO_MAX);
      if (e.texto.length > TEXTO_MAX) o.cortado = true;
      if (e.disp.length) o.disp = e.disp.slice(0, 8).map(function (d) { return d.slice(0, 80); });
      return o;
    });
  }
  function numeroDe(q) {
    if (q && q.n != null && +q.n > 0) return +q.n;
    var m = q && RE_ROTULO_APP.exec(txt(q.titulo));
    return m ? +m[1] : null;
  }

  /* ---- ligação com o banco de discursivas (Redação) ---- */
  function cabecalho(p) {
    return [p.orgao, p.cargo, p.ano].filter(Boolean).join(' · ') + (p.banca ? ' — banca ' + p.banca : '');
  }
  /** O título que a Redação grava para uma prova aberta do banco (_abrirDiscursiva + submitRed). */
  function tituloGravado(p) { return (cabecalho(p) + '\n\n' + txt(p.enunciado)).trim().replace(/\s+/g, ' ').slice(0, 80); }
  var memoBanco = { ref: null, idx: null };
  /** Índice do banco, refeito só quando o banco muda: achar a prova pelo título não varre as 600. */
  function indexarBanco(banco) {
    if (memoBanco.ref === banco && memoBanco.idx) return memoBanco.idx;
    var porId = {}, porTitulo = {}, l = Array.isArray(banco) ? banco : [];
    for (var i = 0; i < l.length; i++) {
      var p = l[i]; if (!p || !p.id) continue;
      porId[p.id] = p;
      var k = achatar(tituloGravado(p)); (porTitulo[k] = porTitulo[k] || []).push(p);
    }
    memoBanco = { ref: banco, idx: { porId: porId, porTitulo: porTitulo } };
    return memoBanco.idx;
  }
  function espelhoDe(p, n) {
    var e = p && Array.isArray(p.espelho) ? p.espelho[n - 1] : null;
    return e && e.quesito ? e : null;
  }
  function textoEspelho(e) { return limpo(txt(e.quesito).replace(RE_NUM, '')); }
  /** Prova do banco de uma peça. O id gravado só vale se a peça confere com a prova (o título
      gravado é o dela, ou um quesito gravado confere com o espelho dela): depois de reabrir o app,
      o id da última prova aberta fica para trás numa questão colada à mão. Sem id (registro
      antigo), pelo título — e só quando UMA prova casa, nunca no palpite. */
  function provaDe(reg, idx, ctx) {
    var mesmos = idx.porTitulo[achatar(reg.prova)] || [];
    var p = reg.provaId ? idx.porId[reg.provaId] : null;
    if (p) {
      if (mesmos.indexOf(p) >= 0) return p;
      var confere = reg.quesitos.some(function (q) {
        var n = numeroDe(q); if (!n || !q || !q.texto) return false;
        var e = espelhoDe(p, n); if (e && mesmoComeco(q.texto, textoEspelho(e))) return true;
        var s = ctx.sugeridoDe(p.id), sq = s && Array.isArray(s.quesitos) ? s.quesitos[n - 1] : null;
        return !!(sq && mesmoComeco(q.texto, sq.quesito));
      });
      return confere ? p : null;
    }
    return mesmos.length === 1 ? mesmos[0] : null;
  }
  function rotuloProva(reg, prova) {
    if (prova) {
      var partes = [prova.orgao, prova.ano].filter(Boolean).join(' ');
      if (partes) return partes + (prova.banca ? ' (' + prova.banca + ')' : '');
    }
    return cortaRotulo(reg.prova, 80) || 'Peça sem título';
  }

  /* ---- ligação com os espelhos da 2ª fase (CT_ESPELHOS, carregado sob demanda pelo host) ---- */
  function rotulo2f(p) { return p.trib + ' ' + p.ano + ' · ' + p.tipo; }
  /** O título que o simulado da 2ª fase manda para cada quesito (ctRedacaoResultado), já com o
      corte em 120 do _redRegistrar. */
  function titulo2f(q) { return ((q.rot ? (q.rot + ' — ') : '') + txt(q.tema || q.exig).slice(0, 100)).slice(0, 120); }
  var memo2f = { ref: null, idx: null };
  function indexar2f(esp) {
    if (memo2f.ref === esp && memo2f.idx) return memo2f.idx;
    var idx = {}, provas = esp && Array.isArray(esp.provas) ? esp.provas : [];
    provas.forEach(function (p) {
      if (!p || !Array.isArray(p.quesitos)) return;
      var r = idx[rotulo2f(p)] = idx[rotulo2f(p)] || {};
      p.quesitos.forEach(function (q) { if (q) { var k = titulo2f(q); (r[k] = r[k] || []).push(q); } });
    });
    memo2f = { ref: esp, idx: idx };
    return idx;
  }

  function contexto(fontes) {
    var f = Array.isArray(fontes) ? { banco: fontes } : (fontes || {});
    var sug = {};
    (Array.isArray(f.sugeridos) ? f.sugeridos : []).forEach(function (s) { if (s && s.id) sug[s.id] = s; });
    var est = {};
    (Array.isArray(f.estimados) ? f.estimados : []).forEach(function (id) { if (id) est[id] = true; });
    var idx2f = f.espelhos2f ? indexar2f(f.espelhos2f) : null;
    return {
      banco: indexarBanco(f.banco),
      // o nome da disciplina do espelho ("Penal") no nome que o app usa ("Direito Penal"), quando o host sabe
      discDe: typeof f.discDe === 'function' ? f.discDe : function (s) { return s; },
      sugeridoDe: function (id) { return id ? sug[id] || null : null; },
      estimado: function (id) { return !!est[id]; },
      quesito2f: function (prova, titulo) {
        if (!idx2f) return null;
        var c = (idx2f[txt(prova)] || {})[txt(titulo)] || [];
        return c.length === 1 ? c[0] : null;      // dois quesitos com o mesmo título: não escolhe
      }
    };
  }

  /* ---- os itens: um por quesito de cada peça, com o que se sabe dele ---- */
  function itemRedacao(reg, q, prova, ctx) {
    var n = numeroDe(q);
    if (!n) return 'criterio';      // critério de prosa ou rótulo de versão antiga: não é quesito da banca
    var lit = null, e = (prova && !reg.aproximada) ? espelhoDe(prova, n) : null;
    if (e && (q.texto ? mesmoComeco(q.texto, textoEspelho(e)) : reg.quesitos.length === prova.espelho.length)) {
      // espelho oficial do banco, conferido pelo texto gravado (registro antigo: pela contagem)
      lit = { fonte: 'oficial', texto: textoEspelho(e), abreviada: false, disp: lista(e.dispositivos),
        escala: e.escala ? limpo(e.escala) : '', disc: limpo(e.disciplina) };
    } else if (reg.aproximada && q.texto) {
      var s = ctx.sugeridoDe(reg.provaId || (prova && prova.id)), sq = s && Array.isArray(s.quesitos) ? s.quesitos[n - 1] : null;
      lit = (sq && mesmoComeco(q.texto, sq.quesito))
        ? { fonte: 'sugerido', texto: limpo(sq.quesito), abreviada: false, disp: lista([sq.fundamento]) }
        : { fonte: 'sugerido', texto: limpo(q.texto), abreviada: !!q.cortado, disp: lista(q.disp) };
    } else if (q.texto) {
      // espelho colado, ou editado depois de aberto do banco: é o texto do espelho usado, não "da banca"
      lit = { fonte: 'colado', texto: limpo(q.texto), abreviada: !!q.cortado, disp: lista(q.disp) };
    }
    // Sem prova ligada, o quesito só é "o mesmo" dentro da própria peça: o título gravado (80
    // caracteres) se repete em provas diferentes (as questões do TJ-MS 2023, as da OAB, a
    // conferência sem enunciado, "Questão discursiva"), e juntar por ele somava quesitos pela posição.
    var chaveProva = prova ? prova.id : ('peca:' + (reg.id || ('ts' + (+reg.ts || 0))));
    return {
      origem: 'redacao', n: n, provaId: prova ? prova.id : '', prova: rotuloProva(reg, prova),
      temaProva: prova ? limpo(prova.tema) : '', aproximada: !!reg.aproximada,
      fonte: lit ? lit.fonte : 'desconhecida', exigencia: lit ? lit.texto : '', abreviada: !!(lit && lit.abreviada),
      dispositivos: lit ? lit.disp : [], escala: (lit && lit.escala) || '', temaEspelho: '',
      // a prova de sentença cobra várias disciplinas: o espelho do banco diz a de cada quesito; sem
      // ela, vale a disciplina escolhida para a peça
      disc: (lit && lit.disc && limpo(ctx.discDe(lit.disc))) || limpo(q.disc || reg.disc) || SEM_DISC,
      nota: +q.nota || 0, max: +q.max, escalaConhecida: true,
      chaveQuesito: chaveProva + '#' + n, jaNoCaderno: false
    };
  }
  function itemSegundaFase(reg, q, ctx) {
    var e = ctx.quesito2f(reg.prova, q.titulo);
    if (e && e.desconto) return 'semValor';
    var peso = q.peso != null ? +q.peso : null;
    if (peso === 0) return 'semValor';           // item de desconto ou sem valor: não há ponto a perder
    var valor = (peso != null && peso > 0) ? peso : ((e && e.valor != null && +e.valor > 0) ? +e.valor : null);
    var f = fracao(q.nota, q.max);
    return {
      origem: 'segunda-fase', n: null, provaId: '', prova: limpo(reg.prova) || 'Simulado de 2ª fase',
      temaProva: '', aproximada: false,
      fonte: e ? 'oficial' : 'desconhecida', exigencia: e ? limpo(e.exig) : '', abreviada: false,
      dispositivos: e ? lista(e.disp) : [], escala: '', temaEspelho: e ? limpo(e.tema) : '',
      titulo2f: limpo(q.titulo), rot2f: e ? limpo(e.rot) : '', disc: limpo(q.disc || reg.disc) || SEM_DISC,
      // a escala da banca é o valor do quesito; a nota do simulado (0, meio, inteiro) é fração dele
      nota: valor != null ? Math.round(valor * f * 100) / 100 : (+q.nota || 0),
      max: valor != null ? valor : +q.max, escalaConhecida: valor != null,
      chaveQuesito: '2f:' + achatar(reg.prova) + '#' + achatar(q.titulo).slice(0, 120),
      jaNoCaderno: true          // o simulado já manda sozinho ao caderno o quesito não atendido
    };
  }
  function itensDe(redHist, ctx) {
    var pecas = (Array.isArray(redHist) ? redHist : []).filter(function (r) {
      return r && Array.isArray(r.quesitos) && r.quesitos.length;
    }).slice().sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
    var itens = [], ign = { criterios: 0, estimados: 0, semValor: 0, cortados: 0 }, contadas = 0;
    pecas.forEach(function (reg) {
      var estimada = !!reg.estimado || ctx.estimado(reg.id);
      var prova = reg.origem === 'segunda-fase' ? null : provaDe(reg, ctx.banco, ctx);
      // o _redRegistrar guarda até 40 quesitos por peça: o resto da prova longa não chega aqui, e a
      // tela avisa (o registro novo diz o total; o antigo, ligado ao banco, pelo tamanho do espelho)
      var nEsp = prova && Array.isArray(prova.espelho) ? prova.espelho.length : 0;
      var total = +reg.quesitosTotal || ((reg.quesitos.length === REG_MAX && nEsp > REG_MAX) ? nEsp : 0);
      if (!estimada && total > reg.quesitos.length) ign.cortados += total - reg.quesitos.length;
      var n0 = itens.length;
      reg.quesitos.forEach(function (q) {
        if (!q || fracao(q.nota, q.max) == null) return;
        if (estimada || q.estimado) { ign.estimados++; return; }
        var it = reg.origem === 'segunda-fase' ? itemSegundaFase(reg, q, ctx) : itemRedacao(reg, q, prova, ctx);
        if (typeof it === 'string') { ign[it === 'criterio' ? 'criterios' : 'semValor']++; return; }
        it.peca = contadas; it.pecaId = reg.id; it.ts = +reg.ts || 0;
        it.fracao = fracao(it.nota, it.max);
        it.perdido = it.fracao != null && it.fracao < LIMIAR_PERDIDO;
        it.tema = temaDe(it);
        itens.push(it);
      });
      if (itens.length > n0) contadas++;      // peça sem nenhum quesito que conte não é peça desta tela
    });
    return { itens: itens, pecas: contadas, ignorados: ign };
  }

  /** Tema de agrupamento: o primeiro dispositivo do quesito, reduzido a diploma + artigo
      ("CP art. 69"; "CP, art. 69" é o mesmo tema); sem dispositivo, o tema do espelho (2ª fase)
      ou o começo do próprio quesito; sem texto nenhum, o rótulo dele. */
  function temaDe(item) {
    var d = item && Array.isArray(item.dispositivos) ? item.dispositivos : [];
    for (var i = 0; i < d.length; i++) {
      var s = limpo(d[i]); if (!s) continue;
      s = s.replace(/\s*,\s*(arts?\.)/i, ' $1').replace(/\barts\.(?=\s*\d)/i, 'art.');
      var m = s.match(/^(.*?\bart\.\s*\d[\d.]*[oº°]?(?:-[A-Z])?)/i);
      return (m ? m[1] : s).replace(/[,;]\s*$/, '').trim();
    }
    if (item && item.temaEspelho) return cortaRotulo(item.temaEspelho, 90);
    if (item && item.exigencia) return cortaRotulo(item.exigencia, 90);
    if (item && item.titulo2f) return cortaRotulo(item.titulo2f, 90);
    if (item && item.n) return 'Quesito ' + item.n;
    return cortaRotulo(item && item.titulo, 90) || 'Quesito';
  }
  /* Item sem o texto do quesito (registro antigo, 2ª fase sem o espelho carregado) só se junta ao
     mesmo quesito da mesma prova: "Quesito 1" de duas provas não é o mesmo erro. Sem prova
     ligada (título ambíguo ou fora do banco), a chave é a da própria peça: não se junta a nada. */
  function chaveTema(it) {
    return achatar(it.disc) + '\u0001' + (it.fonte === 'desconhecida' ? ('q:' + it.chaveQuesito) : achatar(it.tema));
  }

  /**
   * O que a pessoa repete. Peça = uma correção gravada (refazer a mesma prova conta de novo).
   * Tema "cobrado" numa peça = a peça tem quesito daquele tema; "perdido" = a soma dos
   * quesitos do tema naquela peça ficou abaixo do limiar.
   * Taxa de repetição: dos temas perdidos na PRIMEIRA peça em que foram cobrados e que
   * voltaram a ser cobrados depois, a parte perdida de novo na ÚLTIMA.
   * Selos: "repetido" = perdido em duas peças ou mais, a última inclusive; "piorou" = atendido
   * antes e perdido só na última; "superado" = perdido antes e atendido na última.
   * @param fontes banco (array) ou {banco, sugeridos, espelhos2f, estimados}
   * @return {pecas, perdidos, taxa:{base,repetidos,pct}, disciplinas:[{disc,perdas,repetidos,temas}], ignorados}
   */
  function oQueRepete(redHist, fontes) {
    var ctx = contexto(fontes), lido = itensDe(redHist, ctx), grupos = {}, ordem = [];
    lido.itens.forEach(function (it) {
      var k = chaveTema(it);
      if (!grupos[k]) { grupos[k] = { chave: k, disc: it.disc, tema: it.tema, porPeca: {}, pecas: [] }; ordem.push(k); }
      var g = grupos[k];
      if (!g.porPeca[it.peca]) { g.porPeca[it.peca] = { peca: it.peca, ts: it.ts, nota: 0, max: 0, itens: [] }; g.pecas.push(it.peca); }
      var c = g.porPeca[it.peca]; c.nota += it.nota; c.max += it.max; c.itens.push(it);
    });
    var temas = [], base = 0, repetidos = 0;
    ordem.forEach(function (k) {
      var g = grupos[k];
      var linha = g.pecas.slice().sort(function (a, b) { return a - b; }).map(function (n) {
        var c = g.porPeca[n], f = fracao(c.nota, c.max);
        return { peca: n, ts: c.ts, prova: c.itens[0].prova, nota: Math.round(c.nota * 100) / 100, max: Math.round(c.max * 100) / 100,
          escalaConhecida: c.itens.every(function (x) { return x.escalaConhecida; }),
          pct: Math.round(f * 100), perdido: f < LIMIAR_PERDIDO, itens: c.itens };
      });
      var perdas = linha.filter(function (c) { return c.perdido; });
      if (!perdas.length) return;
      var primeira = linha[0], ultima = linha[linha.length - 1], voltou = linha.length > 1;
      if (voltou && primeira.perdido) { base++; if (ultima.perdido) repetidos++; }
      // o quesito que representa o tema no card e no caderno: o perdido mais recente, de
      // preferência um que tenha o texto do quesito
      var rep = null;
      for (var i = perdas.length - 1; i >= 0 && !rep; i--) {
        rep = perdas[i].itens.filter(function (it) { return it.perdido && it.fonte !== 'desconhecida'; })[0] || null;
      }
      if (!rep) { var up = perdas[perdas.length - 1]; rep = up.itens.filter(function (it) { return it.perdido; })[0] || up.itens[0]; }
      temas.push({ chave: k, disc: g.disc, tema: g.tema, cobrado: linha.length, perdas: perdas.length,
        primeira: primeira, ultima: ultima, linha: linha,
        repetiu: perdas.length >= 2 && ultima.perdido,
        piorou: voltou && !primeira.perdido && ultima.perdido && perdas.length === 1,
        superou: voltou && !ultima.perdido,
        // 13(b): o erro ao longo das peças — a parte dos pontos do tema que ficou para trás em cada uma
        seriePerda: linha.map(function (c) { return 100 - c.pct; }),
        quesito: rep });
    });
    var peso = function (t) { return t.repetiu ? 3 : t.piorou ? 2 : t.superou ? 0 : 1; };
    var porDisc = {}, discs = [];
    temas.forEach(function (t) {
      if (!porDisc[t.disc]) { porDisc[t.disc] = { disc: t.disc, perdas: 0, repetidos: 0, temas: [] }; discs.push(porDisc[t.disc]); }
      porDisc[t.disc].temas.push(t); porDisc[t.disc].perdas += t.perdas; if (t.repetiu) porDisc[t.disc].repetidos++;
    });
    discs.forEach(function (d) {
      d.temas.sort(function (a, b) { return (peso(b) - peso(a)) || (b.perdas - a.perdas) || (b.ultima.peca - a.ultima.peca); });
    });
    discs.sort(function (a, b) { return (b.repetidos - a.repetidos) || (b.perdas - a.perdas) || a.disc.localeCompare(b.disc); });
    return { pecas: lido.pecas, perdidos: temas.length,
      taxa: { base: base, repetidos: repetidos, pct: base ? Math.round(repetidos / base * 100) : null },
      disciplinas: discs, ignorados: lido.ignorados };
  }
  /** Todos os temas perdidos, na ordem da tela. */
  function temasDe(r) {
    var out = []; (r && r.disciplinas || []).forEach(function (d) { d.temas.forEach(function (t) { out.push(t); }); });
    return out;
  }

  /* ---- textos: tela, card e caderno ---- */
  function pts(c) { return c.escalaConhecida ? (num(c.nota) + ' de ' + num(c.max)) : (c.pct + '% dos pontos'); }
  function alerta(t) {
    var s = 'perdido em ' + t.perdas + ' de ' + t.cobrado + (t.cobrado > 1 ? ' peças' : ' peça');
    var u = t.ultima, d = dataCurta(u.ts), quando = d ? ' (' + d + ')' : '';
    if (t.cobrado === 1) s += '; nessa peça' + quando + ', ' + pts(u);
    else if (u.perdido) s += '; na última' + quando + ', ' + pts(u);
    else s += '; superado na última' + quando + ', com ' + pts(u);
    if (t.cobrado > 1 && t.primeira.perdido && u.perdido) s += ' — já tinha sido perdido na primeira vez que caiu';
    return s + '.';
  }
  function rotuloExigencia(q) {
    return q.fonte === 'sugerido' ? 'Quesito do espelho sugerido (não oficial)'
      : q.fonte === 'colado' ? 'Exigência do espelho usado na correção' : 'Exigência da banca';
  }
  function pergunta(q) {
    return q.fonte === 'sugerido' ? 'O que o espelho sugerido (não oficial) exige neste quesito?'
      : q.fonte === 'colado' ? 'O que o espelho usado na correção exige neste quesito?' : 'O que a banca exige neste quesito?';
  }
  function pontuacao(q) {
    if (!q.escalaConhecida) return 'valor do quesito não gravado';
    return num(q.max) + (q.escala ? ' (escala da banca: ' + q.escala + ')' : '') + (q.fonte === 'sugerido' ? ' (espelho sugerido, não oficial)' : '');
  }
  /** Qual quesito de qual prova. */
  function quesitoDe(q) {
    return q.origem === 'segunda-fase' ? ((q.rot2f || 'Quesito') + ' · ' + q.prova + ' (2ª fase)') : ('Quesito ' + q.n + ' de ' + q.prova);
  }
  /** Chamada da frente: a disciplina e qual quesito de qual prova (o rótulo da 2ª fase já traz a disciplina). */
  function chamada(t) {
    var q = t.quesito;
    return (q.origem === 'segunda-fase' && q.rot2f ? '' : t.disc + ' · ') + quesitoDe(q);
  }
  /** Núcleo de um texto para comparar: sem acento, sem pontuação, minúsculo. */
  function nucleo(t) { return achatar(t).replace(/[^a-z0-9]+/g, ' ').trim(); }
  /** Resumo da frente: o assunto da prova (Redação) ou o tema do quesito no espelho (2ª fase).
      Nunca o tema de agrupamento — sem dispositivo, ele é o começo da própria exigência, a
      resposta —, nem os dispositivos, que são do verso. Assunto que traz a exigência ou a metade
      dela também fica de fora (há tema de quesito igual ao texto do quesito). */
  function resumo(t) {
    var q = t.quesito, a = limpo(q.origem === 'segunda-fase' ? q.temaEspelho : q.temaProva);
    var x = nucleo(a), e = nucleo(q.exigencia), metade = e.slice(0, Math.ceil(e.length / 2)).trim();
    if (!x || (e && (x.indexOf(e) >= 0 || (metade.length >= 12 && x.indexOf(metade) >= 0)))) return '';
    return cortaRotulo(a, 200);
  }
  var AVISO_CORTE = ' (texto cortado; o integral está no espelho da prova)';
  /** Card no molde Aulão. Frente: chamada e resumo, sem nada da resposta. Verso: exigência
      literal, pontuação, dispositivos e alerta de prova. Só para tema que tem o texto do quesito (exportavel). */
  function cardAnki(t) {
    var q = t.quesito, r = resumo(t);
    var frente = '<b>' + escHtml(chamada(t)) + '</b>' + (r ? '<br><i>' + escHtml(r) + '</i>' : '') + '<br>' + escHtml(pergunta(q));
    var verso = '<b>' + escHtml(rotuloExigencia(q)) + ':</b> ' + escHtml(q.exigencia) +
      (q.abreviada ? ' <i>' + escHtml(AVISO_CORTE.trim()) + '</i>' : '') +
      '<br><b>Pontuação:</b> ' + escHtml(pontuacao(q)) +
      '<br><b>Dispositivos:</b> ' + (q.dispositivos.length ? escHtml(q.dispositivos.join('; ')) : 'o espelho não indica') +
      '<br><b>Alerta de prova:</b> ' + escHtml(alerta(t));
    return { frente: umaLinha(frente), verso: umaLinha(verso) };
  }
  /** Tema que tem o texto do quesito: só esse vira card e entra no caderno. */
  function exportavel(t) { return !!(t && t.quesito && t.quesito.fonte !== 'desconhecida' && t.quesito.exigencia); }
  /** Arquivo de importação do Anki: o cabeçalho aponta o modelo Aulão (Frente, Verso) e o baralho,
      e cada linha é frente[TAB]verso. */
  function arquivoAnki(temas) {
    var linhas = (Array.isArray(temas) ? temas : []).filter(exportavel).map(function (t) { var c = cardAnki(t); return c.frente + '\t' + c.verso; });
    return '#separator:tab\n#html:true\n#notetype:Aulão\n#deck:Quesitos perdidos\n' + linhas.join('\n') + (linhas.length ? '\n' : '');
  }
  /** O mesmo quesito no formato do coletor do caderno de erros (_colherErros): a pergunta na
      frente, a exigência só no gabarito; corte avisado dentro do limite de 1200 do coletor. O
      tópico aparece no Treino ANTES de revelar o gabarito: é o resumo da frente, nunca o tema. */
  function paraCaderno(t) {
    var q = t.quesito, r = resumo(t);
    var enunciado = 'Quesito perdido · ' + chamada(t) + (r ? '\nAssunto: ' + r : '') + '\n' + pergunta(q);
    var cabeca = rotuloExigencia(q) + ':\n';
    var rodape = '\nPontuação: ' + pontuacao(q) + '\nDispositivos: ' + (q.dispositivos.length ? q.dispositivos.join('; ') : 'o espelho não indica');
    var exig = q.exigencia, cortou = q.abreviada;
    var cabe = CADERNO_MAX - cabeca.length - rodape.length - AVISO_CORTE.length - 1;
    if (exig.length > cabe) { exig = cortaRotulo(exig, cabe); cortou = true; }
    var extra = { quesitoRef: q.chaveQuesito };
    if (q.fonte === 'sugerido') extra.aproximada = true;
    return {
      enunciado: enunciado.slice(0, CADERNO_MAX),
      gabarito: (cabeca + exig + (cortou ? AVISO_CORTE : '') + rodape).slice(0, CADERNO_MAX),
      disc: t.disc === SEM_DISC ? '' : t.disc, topico: cortaRotulo(r || quesitoDe(q), 120),
      lesson: ('Quesito ' + alerta(t) + (q.fonte === 'sugerido' ? ' O espelho desta prova é sugerido pelo Cátedra, não oficial.' : '')).slice(0, 600),
      extra: extra
    };
  }
  /** Os temas que ainda não estão no caderno, no formato do coletor. "Já está" = há erro com a
      mesma chave do quesito criado depois da última vez que ele foi perdido: perder de novo, depois,
      volta a valer aqui. O host ainda aplica a janela do coletor das questões (o mesmo enunciado
      nos últimos 30 dias não entra de novo): perder o mesmo quesito dentro de um mês não duplica o
      erro que já está no caderno. Ficam fora a 2ª fase (o simulado já manda o quesito sozinho) e o
      tema sem texto. */
  function paraCadernoLote(r, erros) {
    var ja = {}, fora = { segundaFase: 0, semTexto: 0, jaNoCaderno: 0 }, itens = [];
    (Array.isArray(erros) ? erros : []).forEach(function (e) {
      if (e && e.quesitoRef) ja[e.quesitoRef] = Math.max(ja[e.quesitoRef] || 0, +e.ts || 0);
    });
    temasDe(r).forEach(function (t) {
      var q = t.quesito;
      if (q.jaNoCaderno) { fora.segundaFase++; return; }
      if (!exportavel(t)) { fora.semTexto++; return; }
      if (ja[q.chaveQuesito] != null && ja[q.chaveQuesito] >= q.ts) { fora.jaNoCaderno++; return; }
      itens.push(paraCaderno(t));
    });
    return { itens: itens, fora: fora };
  }
  /** O que a tela mostra de um tema (o host só acrescenta a tinta do selo e o traço do gráfico). */
  function vistaTema(t) {
    var q = t.quesito, d = dataCurta(q.ts), serie = t.seriePerda || [];
    var exig = limpo(q.exigencia);
    return {
      tema: t.tema, exigencia: exig, rotuloExig: rotuloExigencia(q), abreviada: !!q.abreviada,
      exigenciaTem: !!exig && exig !== limpo(t.tema),
      semTexto: !exig, semTextoMsg: q.origem === 'segunda-fase'
        ? 'o texto deste quesito fica no Simulado de 2ª fase'
        : 'o texto da banca não foi gravado nesta correção; refaça a prova para vê-lo aqui',
      dispositivos: q.dispositivos.join(' · '), dispTem: q.dispositivos.length > 0,
      conta: 'perdido em ' + t.perdas + ' de ' + t.cobrado + (t.cobrado > 1 ? ' peças' : ' peça'),
      linha: t.cobrado > 1 ? ('pontos perdidos: 1ª peça ' + serie[0] + '% → última ' + serie[serie.length - 1] + '%')
        : ('pontos perdidos nessa peça: ' + serie[0] + '%'),
      onde: (q.origem === 'segunda-fase' ? '2ª fase · ' : '') + q.prova + (d ? ' · ' + d : ''),
      selo: t.repetiu ? 'repetido' : t.piorou ? 'piorou' : t.superou ? 'superado' : '',
      seloTom: (t.repetiu || t.piorou) ? 'danger' : t.superou ? 'ok' : '',
      sugerido: q.fonte === 'sugerido',
      // a cor do traço diz como o tema terminou: perdido na última peça, vermelho; atendido, verde
      sparkShow: serie.length > 1, sparkTom: t.ultima.perdido ? 'danger' : 'ok',
      sparkAlt: 'Pontos perdidos neste tema, peça a peça: ' + serie.map(function (v) { return v + '%'; }).join(', ')
    };
  }

  window.CT_QUESITOS_PERDIDOS = { LIMIAR_PERDIDO: LIMIAR_PERDIDO, TEXTO_MAX: TEXTO_MAX, perdido: perdido, temaDe: temaDe,
    anotarQuesitos: anotarQuesitos, oQueRepete: oQueRepete, temasDe: temasDe, vistaTema: vistaTema, exportavel: exportavel,
    cardAnki: cardAnki, arquivoAnki: arquivoAnki, paraCaderno: paraCaderno, paraCadernoLote: paraCadernoLote, dataCurta: dataCurta };
})();
