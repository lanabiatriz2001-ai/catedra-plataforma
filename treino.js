/* Cátedra — MOTOR DE TREINO (simulado + prova oral), 100% local, sem IA.
 *
 * Estava tudo dentro do CátedraJURIS e do CátedraLEGIS (Swift). Passou para cá porque
 * simulado e prova oral são do CÁTEDRA: é aqui que ficam o desempenho, o ciclo, a redação
 * e o histórico — e um simulado que não alimenta o desempenho não serve para nada.
 *
 * Fontes (todas já no repositório, nenhuma copiada de curso):
 *   juris-index.js / juris-text.js   25 mil verbetes oficiais (STF, STJ, TSE, TJRO, contas)
 *   /api/law                          texto das leis, do Planalto, pelo proxy do app
 *   discursivas.js                    632 provas discursivas + espelhos oficiais
 *   oral.js                           562 documentos de prova oral de 101 concursos
 *
 * Como o item ERRADO é gerado: troca-se o núcleo da proposição (prazo, percentual,
 * competência, operador "pode/não pode", "constitucional/inconstitucional"). Se não houver
 * troca segura, o item sai CERTO — nunca se inventa uma regra falsa.
 */
(function (w) {
  'use strict';

  // ---------------------------------------------------------------- utilidades
  var norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var limpa = function (s) {
    return String(s || '')
      .replace(/\s*\((?:Redação|Incluíd[oa]|Vide|Revogad[oa]|Renumerad[oa]|Vigência)[^)]*\)/gi, '')
      .replace(/\s+/g, ' ').trim();
  };

  // Pares de inversão: o mesmo conjunto que o baralho e o simulado nativo usam.
  // A troca só vale quando inverte a TESE. "constitucional" solto NÃO entra: "nova ordem
  // constitucional" viraria "nova ordem inconstitucional", que não é uma tese falsa — é
  // absurdo, e absurdo não treina ninguém. Por isso só as formas predicativas.
  var PARES = [
    ['é constitucional', 'é inconstitucional'], ['são constitucionais', 'são inconstitucionais'],
    ['é inconstitucional', 'é constitucional'],
    ['é possível', 'não é possível'], ['é cabível', 'não é cabível'], ['é devido', 'não é devido'],
    ['é lícito', 'é ilícito'], ['é válido', 'é inválido'], ['é legítimo', 'é ilegítimo'],
    ['incide', 'não incide'], ['aplica-se', 'não se aplica'], ['admite-se', 'não se admite'],
    ['cabe', 'não cabe'], ['pode', 'não pode'], ['deve', 'não deve'], ['há', 'não há'],
    ['exige', 'dispensa'], ['depende', 'independe'], ['necessária', 'desnecessária'],
    ['obrigatória', 'facultativa'], ['taxativo', 'exemplificativo'], ['absoluta', 'relativa'],
    ['prescritível', 'imprescritível'], ['competência da União', 'competência dos Estados'],
    ['Justiça Federal', 'Justiça Estadual'], ['Justiça Estadual', 'Justiça Federal'],
    ['objetiva', 'subjetiva'], ['solidária', 'subsidiária'], ['vedada', 'permitida'],
    ['permitida', 'vedada'], ['privativa', 'concorrente'], ['concorrente', 'privativa']
  ];
  // Números e prazos: troca por outro valor plausível (o erro clássico de banca).
  var RE_NUM = /\b(\d{1,3})\s*(dias?|anos?|meses|mês|horas?|salários?[- ]mínimos?)\b/i;
  var RE_PCT = /\b(\d{1,3})\s*%/;
  var RE_FRA = /\b(um|dois|três|quatro|cinco)\s+(quintos?|terços?|quartos?)\b/i;

  /** Inverte o núcleo de uma proposição. Devolve {texto, de, para} ou null. */
  function inverter(txt) {
    var base = String(txt || '');
    for (var i = 0; i < PARES.length; i++) {
      var de = PARES[i][0], para = PARES[i][1];
      var re = new RegExp('(?<![\\p{L}])' + de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}])', 'iu');
      var m = re.exec(base);
      if (!m) continue;
      var prefixo = base.slice(0, m.index);
      if (ANTES_PROIBIDO.test(prefixo)) continue;                  // adjetivo, não núcleo
      // Se o trecho JÁ vem negado ("não pode"), acrescentar outra negação produziria
      // "não não pode". Nesse caso a inversão correta é RETIRAR a negação.
      var mNeg = /\b(n[ãa]o|nem|jamais|nunca)\s+$/i.exec(prefixo);
      if (mNeg) {
        if (!/^n[ãa]o\s/i.test(para)) continue;                    // par não adiciona negação: não serve aqui
        var ini = m.index - mNeg[0].length;
        var afirmativo = m[0];
        if (ini === 0 || /[.!?]\s+$/.test(base.slice(0, ini))) afirmativo = afirmativo[0].toUpperCase() + afirmativo.slice(1);
        return { texto: base.slice(0, ini) + afirmativo + base.slice(m.index + m[0].length),
                 de: mNeg[1] + ' ' + m[0], para: afirmativo };
      }
      var rep = para;
      if (m[0][0] === m[0][0].toUpperCase() && m[0][0] !== m[0][0].toLowerCase()) rep = rep[0].toUpperCase() + rep.slice(1);
      return { texto: base.slice(0, m.index) + rep + base.slice(m.index + m[0].length), de: m[0], para: rep };
    }
    var mn = RE_NUM.exec(base);
    if (mn) {
      var n = parseInt(mn[1], 10);
      var novo = n <= 3 ? n + 2 : (n <= 15 ? n * 2 : Math.round(n / 2));
      if (novo !== n) return { texto: base.replace(mn[0], novo + ' ' + mn[2]), de: mn[0], para: novo + ' ' + mn[2] };
    }
    var mp = RE_PCT.exec(base);
    if (mp) {
      var p = parseInt(mp[1], 10), np = p >= 50 ? p - 20 : p + 20;
      if (np > 0 && np < 100) return { texto: base.replace(mp[0], np + '%'), de: mp[0], para: np + '%' };
    }
    var mf = RE_FRA.exec(base);
    if (mf) {
      var mapa = { um: 'dois', dois: 'três', três: 'um', quatro: 'três', cinco: 'quatro' };
      var novoF = (mapa[norm(mf[1])] || 'dois') + ' ' + mf[2];
      return { texto: base.replace(mf[0], novoF), de: mf[0], para: novoF };
    }
    return null;
  }

  // Palavras que, imediatamente antes do alvo, indicam que ele NÃO é o núcleo da tese
  // (é adjetivo de um substantivo: "ordem constitucional", "prazo de 5 dias do art. …").
  var ANTES_PROIBIDO = /\b(ordem|legisla[çc][ãa]o|texto|norma|reforma|emenda|jurisdi[çc][ãa]o|corte|princ[íi]pio|matéria|mat[ée]ria|quest[ãa]o|controle|natureza|car[áa]ter|infra)\s*$/i;

  /** Frase tem verbo de proposição? Título ("Não recepção em bloco da Lei X") não vira item. */
  function ehProposicao(f) {
    return /\b(é|são|era|foi|deve|devem|pode|podem|cabe|cabem|incide|incidem|aplica|aplicam|constitui|configura|exige|admite|h[áa]|t[êe]m|tem|possui|prescreve|assegura|garante|veda|autoriza|permite|depende|independe|compete|ocorre|gera|enseja|implica|afasta|acarreta|submete|obriga|reconhece|declara)\b/i.test(String(f || ''));
  }

  /** Primeira frase útil de um texto (sem cortar em "art.", "n.", "§"). */
  function primeiraFrase(t) {
    var p = String(t || '').replace(/(?:art|arts|n|nº|inc|min|rel|ex|p|pp|fls?|cf|v|vs)\./gi, function (x) { return x.replace('.', '§PT§'); });
    var partes = p.split(/(?<=[.!?])\s+/);
    for (var i = 0; i < partes.length; i++) {
      var f = partes[i].replace(/§PT§/g, '.').trim();
      if (f.length >= 60 && f.length <= 520 && ehProposicao(f)) return f;
    }
    var todo = p.replace(/§PT§/g, '.').trim();
    if (!ehProposicao(todo)) return '';          // título/rubrica não vira item de prova
    return todo.length > 520 ? todo.slice(0, 520) : todo;
  }

  /** Dispositivos citados (artigo, súmula, tema) — usado na auditoria de fundamentos. */
  function fundamentos(t) {
    var re = /\b(?:arts?\.?\s*\d+[\dºª°\-A-Za-z]*(?:\s*,?\s*(?:§\s*\d+[ºª°]?|par[áa]grafo\s+[úu]nico|inc(?:iso)?\.?\s*[IVXLC]+|[IVXLC]{1,5})\b)*|s[úu]mula(?:\s+vinculante)?\s+n?[ºo.]?\s*\d+|tema\s+n?[ºo.]?\s*[\d.]+)/gi;
    var out = [], vis = {}, m;
    while ((m = re.exec(String(t || '')))) {
      var k = m[0].toLowerCase().replace(/[^a-z0-9§]/g, '');
      if (!vis[k]) { vis[k] = 1; out.push(m[0].replace(/\s+/g, ' ').trim()); }
    }
    return out;
  }

  // ------------------------------------------------------- acervo (carregamento)
  var carregando = {};
  function carregarScript(src) {
    if (carregando[src]) return carregando[src];
    carregando[src] = new Promise(function (ok, falha) {
      var t = document.createElement('script');
      t.src = './' + src;
      t.onload = function () { ok(true); };
      t.onerror = function () { falha(new Error('não consegui carregar ' + src)); };
      document.head.appendChild(t);
    });
    return carregando[src];
  }
  function acervoJuris() {
    if (w.__JURIS_IDX__ && w.__JURIS_TXT__) return Promise.resolve(true);
    return Promise.all([carregarScript('juris-index.js'), carregarScript('juris-text.js')]).then(function () { return true; });
  }
  function acervoOral() {
    if (w.CT_ORAL) return Promise.resolve(true);
    return carregarScript('oral.js');
  }
  /** 999 perguntas reais de banca com o padrão de resposta oficial (oral-conteudo.js). */
  function acervoOralQ() {
    if (w.CT_ORAL_Q) return Promise.resolve(true);
    return carregarScript('oral-conteudo.js');
  }
  /** Texto das 14 leis mais cobradas, em artigos (leis-seca.js) — funciona off-line. */
  function acervoLeis() {
    if (w.CT_LEIS) return Promise.resolve(true);
    return carregarScript('leis-seca.js');
  }
  /** Questões de provas oficiais de magistratura (A-E, gabarito e % de acerto) — questoes-prova.js. */
  function acervoQuestoesProva() {
    if (w.CT_QUESTOES_PROVA) return Promise.resolve(true);
    return carregarScript('questoes-prova.js');
  }

  /** n questões de prova sorteadas, sem repetição, opcionalmente filtradas por trecho da disciplina. */
  function sortearQuestoesProva(n, discs) {
    var pool = (w.CT_QUESTOES_PROVA || []).slice();
    if (discs && discs.length) pool = pool.filter(function (q) {
      return discs.some(function (d) { return norm(q.disciplina).indexOf(norm(d)) >= 0 || norm(d).indexOf(norm(q.disciplina)) >= 0; });
    });
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    return pool.slice(0, Math.max(0, n | 0));
  }

  /** Um artigo sorteado das leis escolhidas, com proposições grandes o bastante para arguir. */
  function sortearArtigo(siglas) {
    var leis = (w.CT_LEIS || []).filter(function (l) { return !siglas || !siglas.length || siglas.indexOf(l.sigla) >= 0; });
    if (!leis.length) return null;
    for (var tent = 0; tent < 60; tent++) {
      var l = leis[Math.floor(Math.random() * leis.length)];
      var a = l.artigos[Math.floor(Math.random() * l.artigos.length)];
      if (!a || a.txt.length < 140) continue;
      return { sigla: l.sigla, nome: l.nome, url: l.url, rot: a.rot, txt: limpa(a.txt) };
    }
    return null;
  }

  /** "do CPC", "da CF": sigla feminina x masculina — "da CPC" denuncia texto gerado. */
  var FEMININO = { CF: 1, CLT: 1, LIA: 1, LEP: 1, 'Maria da Penha': 1 };
  function daSigla(sig) { return (FEMININO[sig] ? 'da ' : 'do ') + sig; }

  /** Pergunta de arguição sobre um ARTIGO de lei, no formato da banca. */
  function perguntaLei(art, variante) {
    var props = proposicoesDoArtigo(art.txt);
    var base = (props[0] && props[0].txt) || primeiraFrase(art.txt) || encurtar(art.txt, 220);
    var inv = inverter(base);
    var f = [];
    if (inv) {
      f.push('Candidato(a): a parte sustenta que ' + encurtar(inv.texto, 230).charAt(0).toLowerCase() + encurtar(inv.texto, 230).slice(1) +
             ' A tese encontra amparo no ' + art.rot + ' ' + daSigla(art.sigla) + '? Decida e fundamente.');
    }
    f.push('O que dispõe o ' + art.rot + ' ' + daSigla(art.sigla) + '? Explique a regra, a razão de ser dela e como o(a) senhor(a) a aplicaria a um caso concreto.');
    var lac = melhorLacuna(base);
    if (lac) f.push('Complete e explique: "' + lac + '" — e diga por que o legislador fixou exatamente isso.');
    f.push('O ' + art.rot + ' ' + daSigla(art.sigla) + ' comporta exceção? Em que hipóteses não se aplica, e qual a consequência do descumprimento?');
    if (props.length > 1) f.push('O ' + art.rot + ' traz um rol. Ele é taxativo ou exemplificativo? Enumere os itens que lembrar e explique o critério que os une.');
    var i = ((variante || 0) % f.length + f.length) % f.length;
    return f[i];
  }

  /** Esconde o trecho mais cobrado de uma proposição (número, prazo, competência). */
  function melhorLacuna(t) {
    var s = String(t || '');
    var alvos = [/\b\d{1,3}\s*(?:dias?|anos?|meses|m[êe]s|horas?)\b/i, /\b\d{1,3}\s*%/, /\b(?:um|dois|tr[êe]s)\s+(?:quintos?|ter[çc]os?|quartos?)\b/i];
    for (var i = 0; i < alvos.length; i++) {
      var m = alvos[i].exec(s);
      if (m) return encurtar(s.replace(m[0], '_______'), 260);
    }
    return null;
  }

  /** Verbetes como objetos {id, tribunal, fonte, titulo, ramo, tema, data, texto}. */
  function verbetes() {
    var IDX = w.__JURIS_IDX__ || [], TXT = w.__JURIS_TXT__ || {};
    var out = [];
    for (var i = 0; i < IDX.length; i++) {
      var r = IDX[i], o = TXT[r[0]];
      if (!o) continue;
      var texto = [o.en, o.co, o.ob].filter(Boolean).join('\n');
      if (!texto) continue;
      out.push({ id: r[0], tribunal: r[1], fonte: r[2], numero: r[3], titulo: r[4],
                 ramo: r[5] || '', tema: r[6] || '', data: r[7] || '', texto: texto });
    }
    return out;
  }

  // ------------------------------------------------------------------ SIMULADO
  /** Simulado de JURISPRUDÊNCIA: itens Certo/Errado do acervo. */
  function simuladoJuris(opc) {
    var n = (opc && opc.n) || 20, tribunal = opc && opc.tribunal;
    // aceita uma disciplina (ramo) ou VÁRIAS (ramos) — a prova real mistura matérias
    var ramos = (opc && opc.ramos && opc.ramos.length) ? opc.ramos : ((opc && opc.ramo) ? [opc.ramo] : null);
    var base = verbetes().filter(function (v) {
      return (!ramos || ramos.indexOf(v.ramo) >= 0) && (!tribunal || v.tribunal === tribunal) && v.texto.length >= 120;
    });
    embaralhar(base);
    var querErrados = Math.floor(n / 2), errados = [], certos = [];
    for (var i = 0; i < base.length && (errados.length < querErrados || certos.length < n - querErrados); i++) {
      var v = base[i], frase = primeiraFrase(limpa(v.texto));
      if (frase.length < 60) continue;
      var inv = errados.length < querErrados ? inverter(frase) : null;
      if (inv) {
        errados.push(item(v, inv.texto, false, frase, inv.de, inv.para));
      } else if (certos.length < n - querErrados) {
        certos.push(item(v, frase, true, frase, null, null));
      }
    }
    var todos = errados.concat(certos);
    embaralhar(todos);
    return todos;
    function item(v, enun, certo, orig, de, para) {
      return { id: v.id, origem: 'juris', enunciado: enun, certo: certo, original: orig,
               trocaDe: de, trocaPara: para, ref: v.tribunal + (v.titulo ? ' · ' + v.titulo : ''),
               ramo: v.ramo, tema: v.tema, data: v.data, contexto: limpa(v.texto).slice(0, 1400) };
    }
  }

  /** Proposições completas de um artigo de lei (caput, caput+inciso, parágrafo). */
  function proposicoesDoArtigo(bloco) {
    var linhas = String(bloco || '').split('\n').map(limpa).filter(Boolean);
    if (!linhas.length) return [];
    var rot = ((/^(Art\.?\s*[\d.]+[ºª°]?(?:-[A-Z])?)/i.exec(linhas[0]) || [])[1] || '').replace(/\.$/, '');
    var out = [], stem = '';
    for (var i = 0; i < linhas.length; i++) {
      var l = linhas[i];
      if (i === 0) {
        var caput = rot ? l.slice(rot.length).replace(/^[\s.\-–—:]+/, '') : l;
        if (/:$/.test(caput)) stem = caput.replace(/:$/, '').trim();
        else if (caput.length >= 60) out.push({ rot: rot, txt: caput });
        continue;
      }
      var mi = /^([IVXLC]+)\s*[-–—]\s*(.+)$/.exec(l);
      var ma = /^([a-z])\)\s*(.+)$/.exec(l);
      var mp = /^(§\s*\d+[ºª°]?|Parágrafo único)\.?\s*(.+)$/i.exec(l);
      if (mi && stem && mi[2].length >= 25 && !/:$/.test(mi[2])) out.push({ rot: rot + ', ' + mi[1], txt: junta(stem, mi[2]) });
      else if (ma && stem && ma[2].length >= 30 && !/:$/.test(ma[2])) out.push({ rot: rot + ', ' + ma[1] + ')', txt: junta(stem, ma[2]) });
      else if (mp && mp[2].length >= 60 && !/:$/.test(mp[2])) out.push({ rot: rot + ', ' + mp[1], txt: mp[2] });
    }
    return out.filter(function (p) { return p.txt.length <= 520; });
    function junta(s, parte) {
      var p = parte.replace(/[;,.\s]+$/, '');
      if (p[0] && p[0] === p[0].toUpperCase() && p[0] !== p[0].toLowerCase()) p = p[0].toLowerCase() + p.slice(1);
      return s + ': ' + p + '.';
    }
  }

  /** Divide o texto corrido de uma lei em blocos por artigo. */
  function artigosDaLei(texto) {
    var t = String(texto || '').replace(/\r/g, '');
    var partes = t.split(/\n(?=\s*Art\.?\s*[\d]+)/i);
    return partes.filter(function (p) { return /^\s*Art\.?\s*\d/i.test(p) && p.length >= 80; });
  }

  /** SIMULADO MISTO: jurisprudência + lei seca, várias disciplinas, proporção configurável.
   *  É o formato da prova real — a banca não separa "agora só jurisprudência".
   *  opc: {n, ramos:[], leis:[], pctLei:0..100}
   */
  function simuladoMisto(opc) {
    var o = opc || {};
    var n = o.n || 30;
    var pctLei = (o.pctLei == null) ? 40 : o.pctLei;
    var qLei = Math.round(n * pctLei / 100);
    var qJur = n - qLei;
    var itens = [];
    if (qJur > 0) itens = itens.concat(simuladoJuris({ n: qJur, ramos: o.ramos }));
    if (qLei > 0 && (w.CT_LEIS || []).length) itens = itens.concat(simuladoLeisEmbutidas(o.leis, qLei));
    embaralhar(itens);
    return itens;
  }

  /** Itens C/E das leis embutidas (leis-seca.js) — sem depender de rede. */
  function simuladoLeisEmbutidas(siglas, n) {
    var leis = (w.CT_LEIS || []).filter(function (l) { return !siglas || !siglas.length || siglas.indexOf(l.sigla) >= 0; });
    var pool = [];
    leis.forEach(function (l) {
      l.artigos.forEach(function (a) {
        proposicoesDoArtigo(limpa(a.txt)).forEach(function (p) {
          if (p.txt.length >= 70 && p.txt.length <= 480) pool.push({ lei: l.sigla, nome: l.nome, rot: p.rot || a.rot, txt: p.txt });
        });
      });
    });
    embaralhar(pool);
    var querErrados = Math.floor(n / 2), errados = [], certos = [];
    for (var i = 0; i < pool.length && (errados.length < querErrados || certos.length < n - querErrados); i++) {
      var p = pool[i];
      var inv = errados.length < querErrados ? inverter(p.txt) : null;
      if (inv) errados.push(mk(p, inv.texto, false, inv.de, inv.para));
      else if (certos.length < n - querErrados) certos.push(mk(p, p.txt, true, null, null));
    }
    return errados.concat(certos);
    function mk(p, enun, certo, de, para) {
      return { id: 'lei|' + p.lei + '|' + p.rot + '|' + enun.slice(0, 24), origem: 'lei',
               enunciado: enun, certo: certo, original: p.txt, trocaDe: de, trocaPara: para,
               ref: p.lei + ' · ' + p.rot, ramo: p.nome, tema: p.rot, data: '', contexto: p.txt };
    }
  }

  /** Relatório de desempenho do simulado: por origem, por disciplina, e o que revisar. */
  function relatorio(itens, respostas) {
    var r = respostas || {};
    var porRamo = {}, porOrigem = { juris: { n: 0, ok: 0 }, lei: { n: 0, ok: 0 } };
    var erradas = [];
    itens.forEach(function (it) {
      var acertou = r[it.id] === it.certo;
      var k = it.ramo || '—';
      (porRamo[k] = porRamo[k] || { n: 0, ok: 0 });
      porRamo[k].n++; if (acertou) porRamo[k].ok++;
      var o = porOrigem[it.origem] || (porOrigem[it.origem] = { n: 0, ok: 0 });
      o.n++; if (acertou) o.ok++;
      if (!acertou) erradas.push(it);
    });
    var ramos = Object.keys(porRamo).map(function (k) {
      return { nome: k, n: porRamo[k].n, ok: porRamo[k].ok, pct: Math.round(porRamo[k].ok / porRamo[k].n * 100) };
    }).sort(function (a, b) { return a.pct - b.pct || b.n - a.n; });
    var acertos = itens.filter(function (it) { return r[it.id] === it.certo; }).length;
    var respondidas = itens.filter(function (it) { return r[it.id] !== undefined; }).length;
    // o que a banca puniria: item errado cujo núcleo trocado a pessoa não percebeu
    var pegadinhas = erradas.filter(function (it) { return !it.certo && it.trocaDe; })
      .map(function (it) { return { ref: it.ref, de: it.trocaDe, para: it.trocaPara }; });
    return {
      total: itens.length, acertos: acertos, respondidas: respondidas,
      brancos: itens.length - respondidas,
      pct: itens.length ? Math.round(acertos / itens.length * 100) : 0,
      ramos: ramos,
      pior: ramos.filter(function (x) { return x.n >= 2; }).slice(0, 3),
      melhor: ramos.slice().reverse().filter(function (x) { return x.n >= 2; }).slice(0, 3),
      origens: porOrigem,
      pegadinhas: pegadinhas.slice(0, 8),
      erradas: erradas
    };
  }

  /** Simulado de LEI SECA a partir do texto já baixado das leis escolhidas. */
  function simuladoLeis(leis, n) {
    var pool = [];
    (leis || []).forEach(function (l) {
      artigosDaLei(l.texto).forEach(function (bloco) {
        proposicoesDoArtigo(bloco).forEach(function (p) { pool.push({ lei: l.nome, url: l.url, rot: p.rot, txt: p.txt }); });
      });
    });
    embaralhar(pool);
    var querErrados = Math.floor((n || 20) / 2), errados = [], certos = [];
    for (var i = 0; i < pool.length && (errados.length < querErrados || certos.length < (n || 20) - querErrados); i++) {
      var p = pool[i];
      var inv = errados.length < querErrados ? inverter(p.txt) : null;
      if (inv) errados.push(mk(p, inv.texto, false, inv.de, inv.para));
      else if (certos.length < (n || 20) - querErrados) certos.push(mk(p, p.txt, true, null, null));
    }
    var todos = errados.concat(certos);
    embaralhar(todos);
    return todos;
    function mk(p, enun, certo, de, para) {
      return { id: p.lei + '|' + p.rot, origem: 'lei', enunciado: enun, certo: certo, original: p.txt,
               trocaDe: de, trocaPara: para, ref: p.lei + ' · ' + p.rot, ramo: p.lei, tema: p.rot,
               data: '', contexto: p.txt, url: p.url };
    }
  }

  // ---------------------------------------------------------------- PROVA ORAL
  /** Encurta uma tese para caber numa pergunta falada, cortando em fronteira de frase. */
  function encurtar(t, max) {
    var s = String(t || '').trim();
    if (s.length <= max) return s;
    var corte = s.slice(0, max);
    var ponto = Math.max(corte.lastIndexOf('; '), corte.lastIndexOf(', '), corte.lastIndexOf(' — '));
    if (ponto > max * 0.5) corte = corte.slice(0, ponto);
    else { var esp = corte.lastIndexOf(' '); if (esp > max * 0.6) corte = corte.slice(0, esp); }
    return corte.replace(/[\s,;:—-]+$/, '') + '…';
  }

  /** O `tema` do acervo às vezes é assunto ("Furto"), às vezes é a tese inteira, às vezes
   *  é sigla ("IR"). Só serve para "em matéria de X" quando é assunto: curto, sem verbo. */
  function ehAssunto(t) {
    var s = String(t || '').trim();
    return s.length >= 8 && s.length <= 58 && !ehProposicao(s) && !/[.;:]/.test(s);
  }

  /** Título que é só código ("Info 803 · STJ", "Ed. 205 · Tese 9") não identifica nada para
   *  quem responde — nesses casos a pergunta precisa apoiar-se no tema ou na própria tese. */
  function tituloVago(t) {
    return /^(info|ed\.?|tema|s[úu]mula|aginte|resp|are|agrg)\b/i.test(String(t || '').trim())
        || String(t || '').trim().length < 18;
  }

  /** Pergunta de arguição sobre um verbete, no formato que a banca usa.
   *  `variante` roda os formatos (0,1,2… — "Outra pergunta" avança). Formatos que não têm
   *  material suficiente no verbete são DESCARTADOS: melhor três perguntas boas do que cinco
   *  com aspas vazias ou "Em matéria de ir".
   */
  function perguntaOral(v, variante) {
    var texto = limpa(v.texto);
    var frase = primeiraFrase(texto);
    var tese = frase || encurtar(texto, 220);            // sempre há algo a citar
    var teseCurta = encurtar(tese, 210);
    var inv = frase ? inverter(frase) : null;
    var fund = fundamentos(texto);
    var assunto = ehAssunto(v.tema) ? String(v.tema).toLowerCase() : '';
    var rotulo = tituloVago(v.titulo)
      ? (assunto ? 'o entendimento do ' + v.tribunal + ' sobre ' + assunto : 'este entendimento do ' + v.tribunal)
      : '"' + v.titulo + '"';
    var f = [];

    // 1) caso hipotético com a tese invertida — o formato mais usado na arguição
    if (inv) {
      var papeis = ['a defesa', 'o recorrente', 'a parte autora', 'o Ministério Público, em parecer,', 'o juízo de primeiro grau'];
      var papel = papeis[Math.abs(hash(v.id)) % papeis.length];
      f.push('Candidato(a), um caso chega ao seu gabinete. ' + papel.charAt(0).toUpperCase() + papel.slice(1) +
             ' sustenta que ' + encurtar(inv.texto, 230).charAt(0).toLowerCase() + encurtar(inv.texto, 230).slice(1) +
             ' A tese procede? Decida e fundamente, indicando a posição do ' + v.tribunal + '.');
    }
    // 2) fundamento e ratio — só quando o verbete de fato cita dispositivos
    if (fund.length) {
      f.push('Sobre ' + rotulo + ': qual é o fundamento normativo e qual a razão de decidir? ' +
             '(Espera-se, entre outros: ' + fund.slice(0, 2).join(', ') + '.)');
    }
    // 3) exceções — exige uma tese legível para ancorar a pergunta
    if (frase) {
      f.push((assunto ? 'Em matéria de ' + assunto + ': o ' : 'O ') + v.tribunal + ' fixou que "' + teseCurta +
             '". Esse entendimento comporta exceção? Em que hipóteses não se aplica?');
    }
    // 4) aplicação a caso concreto — sempre disponível
    f.push('Explique ' + rotulo + ': o que decide, por quê, e como o(a) senhor(a) o aplicaria a um caso concreto.');

    var i = ((variante || 0) % f.length + f.length) % f.length;
    return f[i];
  }

  /** Correção local da resposta oral: cobertura + auditoria de fundamentos. */
  function corrigirOral(base, resposta) {
    var STOP = { de:1,do:1,da:1,dos:1,das:1,e:1,em:1,a:1,o:1,os:1,as:1,no:1,na:1,nos:1,nas:1,ao:1,com:1,por:1,para:1,que:1,'não':1,um:1,uma:1,art:1,artigo:1,lei:1,sobre:1,entre:1,ser:1,se:1,direito:1,seu:1,sua:1,ou:1,mais:1 };
    var chave = [], vis = {};
    norm(base).split(/[^a-z0-9]+/).forEach(function (t) {
      if (t.length >= 5 && !STOP[t] && !vis[t] && chave.length < 14) { vis[t] = 1; chave.push(t); }
    });
    var r = norm(resposta);
    var acertou = chave.filter(function (t) { return r.indexOf(t) >= 0; });
    var faltou = chave.filter(function (t) { return r.indexOf(t) < 0; });
    var cob = chave.length ? acertou.length / chave.length : 0;
    var fBase = fundamentos(base), fResp = fundamentos(resposta);
    var k = function (x) { return x.toLowerCase().replace(/[^a-z0-9§]/g, ''); };
    var setResp = {}; fResp.forEach(function (x) { setResp[k(x)] = 1; });
    var citados = fBase.filter(function (x) { return setResp[k(x)]; });
    var ausentes = fBase.filter(function (x) { return !setResp[k(x)]; });
    var extras = fResp.filter(function (x) { return fBase.map(k).indexOf(k(x)) < 0; });
    return {
      nota: cob >= 0.6 ? 'boa' : cob >= 0.3 ? 'media' : 'fraca',
      cobertura: Math.round(cob * 100),
      acertou: acertou, faltou: faltou,
      fundCitados: citados, fundAusentes: ausentes, fundExtras: extras,
      modelo: base
    };
  }

  // --------------------------------------------------------------------- misc
  function embaralhar(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < String(s).length; i++) { h ^= String(s).charCodeAt(i); h = (h * 16777619) >>> 0; } return h; }

  w.CT_TREINO = {
    acervoJuris: acervoJuris, acervoOral: acervoOral, acervoOralQ: acervoOralQ, acervoLeis: acervoLeis,
    acervoQuestoesProva: acervoQuestoesProva, sortearQuestoesProva: sortearQuestoesProva,
    verbetes: verbetes, sortearArtigo: sortearArtigo, perguntaLei: perguntaLei,
    simuladoJuris: simuladoJuris, simuladoLeis: simuladoLeis,
    simuladoMisto: simuladoMisto, simuladoLeisEmbutidas: simuladoLeisEmbutidas, relatorio: relatorio,
    artigosDaLei: artigosDaLei, proposicoesDoArtigo: proposicoesDoArtigo,
    perguntaOral: perguntaOral, corrigirOral: corrigirOral,
    inverter: inverter, primeiraFrase: primeiraFrase, fundamentos: fundamentos, limpa: limpa,
    encurtar: encurtar, ehAssunto: ehAssunto,
    ehProposicao: ehProposicao
  };
})(typeof window !== 'undefined' ? window : this);
