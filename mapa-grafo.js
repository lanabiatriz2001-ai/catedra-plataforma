/* ==========================================================================
   mapa-grafo.js — a CAMADA DE DADOS do mapa processual.
   Transforma um rito já cadastrado (fluxos.js, ou ritos.js quando não há
   fluxograma escrito) num GRAFO horizontal: nós com coordenada, arestas com
   direção e rótulo, faixas acima e abaixo do tronco.

   Aqui não há DOM, cor, pixel de estilo nem string de interface: só geometria e
   a leitura do que o rito diz. Quem desenha é o mapa-processual.js. A separação
   existe para que cadastrar um rito novo seja mexer em fluxos.js e mais nada.

   NADA é inventado. Todo campo do nó ou vem escrito no rito (t, sub, art, nota,
   peca, saidas) ou é EXTRAÍDO do texto dele (o prazo). O campo `ator` é lido se
   o rito o trouxer — hoje nenhum traz, e por isso o mapa simplesmente não mostra
   a linha em vez de adivinhar quem pratica o ato.

   Expõe: window.CTMapaGrafo
     .CARTAO   { l, a }            medida do cartão, em unidades do mundo
     .GRADE    { colX, faixaY }    passo da grade
     .montar(nome, fontes)         → grafo
     .prazoDe(texto)               → { texto, dias, faixa } | null
     .rota(grafo, escolhas)        → [ids] na ordem em que o processo anda
   ========================================================================== */
(function () {
'use strict';

/* Cartão e grade. O vão entre colunas (colX − l) e entre faixas (faixaY − a) é o
   CORREDOR por onde as linhas passam: enquanto o desenho respeitar esse vão,
   nenhuma seta atravessa cartão — a garantia é geométrica, não de olho. */
var CARTAO = { l: 268, a: 156 };
var GRADE  = { colX: 344, faixaY: 232 };

var TIPO = {
  inicio:   'inicio',
  ato:      'ato',
  decisao:  'decisao',
  prazo:    'prazo',
  recurso:  'recurso',
  terminal: 'fim'
};

/* Uma SAÍDA é desfavorável quando o próprio rito a nomeia assim, no rótulo da
   seta ou no título da caixa. Vale só para saída: um passo do tronco chamado
   "Absolvição sumária?" é uma decisão, não uma rejeição. E encerramento
   favorável — a absolvição em si — não entra aqui: vermelho é para o que fecha
   a porta, não para o que fecha o processo. */
var REJEICAO = /(rejeit|n[aã]o recebe|inadmit|indefer|improced[êe]nc|extin[çc]|nega seguimento|arquiv|impronun|desclassific)/i;

/* Prazos: o rito escreve o prazo dentro do título ou do detalhe ("Contestação —
   15 dias", "Audiência em até 60 dias"). Extrair é leitura; escrever prazo que
   o rito não diz seria invenção. */
var RE_PRAZO = /(\d{1,3})\s*(dias?|horas?|meses|m[eê]s|anos?|minutos?)\b/gi;
var UNIDADE  = { dia:1, dias:1, hora:1/24, horas:1/24, mes:30, meses:30, 'mês':30,
                 ano:365, anos:365, minuto:1/1440, minutos:1/1440 };

function normaliza(t){ return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); }

function prazoDe(texto, ehInicio){
  if (ehInicio) return null;                   // "pena máxima de 4 anos" não é prazo
  var s = String(texto || ''); RE_PRAZO.lastIndex = 0;
  var m, achado = null;
  while ((m = RE_PRAZO.exec(s))) {
    var antes = normaliza(s.slice(Math.max(0, m.index - 26), m.index));
    if (/pena\s+(m[ai]xima|m[ai]nima)|superior a|inferior a/.test(antes)) continue;
    var n = +m[1], dias = n * (UNIDADE[normaliza(m[2])] || 1);
    if (!achado || dias < achado.dias) achado = { texto: m[0].trim(), dias: dias, n: n, unidade: m[2] };
  }
  if (!achado) return null;
  achado.faixa = achado.dias <= 5 ? 'curto' : (achado.dias <= 15 ? 'medio' : 'longo');
  return achado;
}

/* Um nó do grafo. `col` e `faixa` são a posição na grade; x e y saem daí. */
function no(base){
  base.x = base.col * GRADE.colX;
  base.y = base.faixa * GRADE.faixaY;
  return base;
}

function tipoDe(k, rot, titulo, ehSaida){
  if (ehSaida && REJEICAO.test(String(rot || '') + ' ' + String(titulo || ''))) return 'rejeicao';
  return TIPO[k] || 'ato';
}

/* ---- rito sem fluxograma escrito: a espinha vem da lista de atos ------------
   Mesma derivação que a página do fluxo já fazia, para que o mapa e o fluxo
   mostrem o mesmo rito — duas derivações divergiriam na primeira correção. */
function derivar(nome, RITOS){
  var atos = RITOS[nome] || [], alterna = 0;
  return {
    ramo: String(nome || '').split('—')[0].trim(), derivado: true,
    resumo: 'Sequência dos atos deste rito. O fluxograma comentado — com os pontos de bifurcação e o recurso de cada saída — ainda não foi escrito para ele.',
    passos: [{ k: 'inicio', t: nome }].concat(atos.map(function (linha) {
      var ato = linha[0], quando = linha[1], itens = linha[2] || [];
      var peca = (itens.filter(function (f) { return f[1] === 'peca'; })[0] || [])[0];
      return {
        k: 'ato', t: ato, sub: quando || '',
        leis:    itens.filter(function (f) { return f[1] === 'lei'; }).map(function (f) { return f[0]; }),
        jurisps: itens.filter(function (f) { return f[1] === 'juris'; }).map(function (f) { return f[0]; }),
        peca: peca || null,
        saidas: itens.filter(function (f) { return f[1] === 'desvio'; }).map(function (d) {
          return { lado: (alterna++ % 2) ? 'dir' : 'esq', rot: 'desvio', k: 'recurso', t: d[0] };
        })
      };
    }))
  };
}

/* ---------------------------- a montagem ---------------------------------- */
function montar(nome, fontes){
  fontes = fontes || {};
  var FLUXOS = fontes.fluxos || {}, RITOS = fontes.ritos || {}, PECAS = fontes.pecas || {};
  var F = FLUXOS[nome] || derivar(nome, RITOS);
  var passos = F.passos || [];

  var nos = [], arestas = [], porId = {};
  var col = 0, tronco = [], pendentes = [], anterior = null;

  function limpa(t){ return String(t == null ? '' : t).replace(/\s+/g, ' ').trim(); }

  function criar(base){
    var n = no(base); nos.push(n); porId[n.id] = n; return n;
  }
  function ligar(de, para, rot, tipo){
    arestas.push({ id: de + '>' + para, de: de, para: para, rot: limpa(rot), tipo: tipo });
  }

  passos.forEach(function (p, i) {
    var id = 'p' + i;
    var textoPrazo = [p.t, p.sub].filter(Boolean).join(' · ');
    var pz = p.prazo ? { texto: limpa(p.prazo), dias: 0, faixa: 'curto' } : prazoDe(textoPrazo, p.k === 'inicio');
    var atual = criar({
      id: id, ordem: i, principal: true, origem: null,
      tipo: tipoDe(p.k, '', p.t, false), passo: p.k || 'ato',
      titulo: limpa(p.t), resumo: limpa(p.sub), nota: limpa(p.nota),
      art: limpa(p.art), prazo: pz, ator: limpa(p.ator),
      peca: p.peca ? limpa(p.peca) : null,
      pecaPronta: !!(p.peca && PECAS[limpa(p.peca)]),
      leis: (p.leis || []).map(limpa), jurisps: (p.jurisps || []).map(limpa),
      ramos: [], proximo: null,
      col: col, faixa: 0
    });
    tronco.push(id);

    /* quem estava esperando reconvergir liga aqui; se ninguém esperava, o passo
       anterior liga direto. */
    if (pendentes.length) pendentes.forEach(function (pid) { ligar(pid, id, '', 'retorno'); });
    else if (anterior) ligar(anterior, id, '', 'principal');
    pendentes = [];

    var saidas = p.saidas || [];
    if (saidas.length) {
      var acima = 0, abaixo = 0;
      saidas.forEach(function (s, j) {
        var sid = id + 's' + j;
        var faixa = (s.lado === 'esq') ? -(++acima) : (++abaixo);
        var tpz = [s.t, s.sub].filter(Boolean).join(' · ');
        var tipo = tipoDe(s.k, s.rot, s.t, true);
        var ramo = criar({
          id: sid, ordem: i, principal: false, origem: id,
          tipo: tipo, passo: s.k || 'ato',
          titulo: limpa(s.t), resumo: limpa(s.sub), nota: limpa(s.nota),
          art: limpa(s.art), prazo: prazoDe(tpz, false), ator: limpa(s.ator),
          peca: s.peca ? limpa(s.peca) : null,
          pecaPronta: !!(s.peca && PECAS[limpa(s.peca)]),
          leis: [], jurisps: [], ramos: [], proximo: null,
          rotulo: limpa(s.rot),
          col: col + 1, faixa: faixa
        });
        atual.ramos.push(sid);
        ligar(id, sid, s.rot, tipo === 'rejeicao' ? 'rejeicao' : 'alternativa');
        /* saída que ENCERRA (recurso, terminal, rejeição) não volta ao tronco;
           saída que é ato do procedimento reconverge no passo seguinte. */
        var encerra = tipo === 'rejeicao' || s.k === 'terminal' || s.k === 'recurso';
        ramo.encerra = encerra;
        if (!encerra) pendentes.push(sid);
      });
      col += 2;
    } else {
      col += 1;
    }
    anterior = id;
  });

  /* o `proximo` de cada decisão: para onde o mapa vai quando a ramificação está
     recolhida. */
  nos.forEach(function (n) {
    if (!n.ramos.length) return;
    var seg = tronco[tronco.indexOf(n.id) + 1];
    n.proximo = seg || null;
  });

  var maxCol = nos.reduce(function (a, n) { return Math.max(a, n.col); }, 0);
  var fMin = nos.reduce(function (a, n) { return Math.min(a, n.faixa); }, 0);
  var fMax = nos.reduce(function (a, n) { return Math.max(a, n.faixa); }, 0);

  /* desloca tudo para o primeiro quadrante e deixa margem para as setas */
  var MARGEM = 60;
  nos.forEach(function (n) {
    n.x = MARGEM + n.col * GRADE.colX;
    n.y = MARGEM + (n.faixa - fMin) * GRADE.faixaY;
  });

  return {
    rito: nome,
    ramo: F.ramo || String(nome || '').split('—')[0].trim(),
    fonte: F.fonte || '',
    resumo: F.resumo || '',
    derivado: !!F.derivado,
    nos: nos, arestas: arestas, porId: porId, tronco: tronco,
    largura: MARGEM * 2 + maxCol * GRADE.colX + CARTAO.l,
    altura:  MARGEM * 2 + (fMax - fMin) * GRADE.faixaY + CARTAO.a
  };
}

/* ---- a rota: por onde o processo anda, dadas as escolhas já feitas --------
   Numa decisão sem escolha, segue a saída que continua o procedimento (a que
   reconverge). Com escolha, segue a escolhida. Isso é o que pinta o caminho
   percorrido e o que mede o progresso. */
function rota(grafo, escolhas){
  escolhas = escolhas || {};
  var saiDe = {};
  grafo.arestas.forEach(function (a) { (saiDe[a.de] = saiDe[a.de] || []).push(a); });

  /* de um nó, para onde o processo vai */
  function seguinte(id){
    var n = grafo.porId[id], saidas = saiDe[id] || [];
    if (!saidas.length) return null;
    if (n && n.ramos.length) {                       // decisão: quem manda é a escolha
      if (escolhas[id] && grafo.porId[escolhas[id]]) return escolhas[id];
      var segue = n.ramos.filter(function (r) { return !grafo.porId[r].encerra; });
      /* sem escolha, segue o caminho ordinário — que em fluxos.js é sempre o do
         lado direito ("recebe", "não", "não há"), nunca o da exceção */
      var direita = segue.filter(function (r) { return grafo.porId[r].faixa > 0; });
      if (direita.length || segue.length) return direita[0] || segue[0];
      var direta = saidas.filter(function (a) { return a.tipo === 'principal'; })[0];
      return direta ? direta.para : null;
    }
    if (n && n.encerra) return null;                 // saída que fecha o processo
    var a = saidas.filter(function (x) { return x.tipo === 'principal' || x.tipo === 'retorno'; })[0] || saidas[0];
    return a ? a.para : null;
  }

  var caminho = [], visto = {}, atual = grafo.tronco[0];
  while (atual && !visto[atual]) { visto[atual] = 1; caminho.push(atual); atual = seguinte(atual); }
  return caminho;
}

window.CTMapaGrafo = { CARTAO: CARTAO, GRADE: GRADE, montar: montar, prazoDe: prazoDe, rota: rota, derivar: derivar };
})();
