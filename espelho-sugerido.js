/* ==========================================================================
   espelho-sugerido.js — o miolo do "espelho sugerido pelo Cátedra" (C3).

   POR QUE EXISTE, E SEPARADO: quando a banca não publicou espelho de correção,
   o Cátedra pode SUGERIR um, gerado por IA a partir do enunciado. Isso só é
   aceitável sob duas regras duras, e ambas moram aqui, puras e testáveis:

     1. QUESITO SEM FUNDAMENTO NÃO ENTRA. O fundamento (artigo, súmula, tema
        repetitivo) é o que permite conferir no LEGIS/JURIS se a IA acertou.
        Sem ele, o quesito é opinião com cara de gabarito.
     2. O TEXTO SE DECLARA. Toda saída começa dizendo que é sugerida, não
        oficial, e que a banca não publicou espelho. O selo não é decoração:
        é o que sustenta a promessa de honestidade do C1.

   Publica window.CT_ESPELHO_SUGERIDO = { montarPrompt, triagem, interpretar, texto,
     referencias, verbeteNoJuris, resumo, avisoGerado, avisoFalha, ehTextoSugerido, CABECALHO }.
   ========================================================================== */
(function () {
  var MIN_QUESITO = 12;      // frase curta demais não é quesito
  var MIN_FUNDAMENTO = 6;    // "art. 5" já é conferível; "" e "n/a" não são
  var RE_VAZIO = /^(n\/?a|nao|não|nenhum|sem fundamento|-{1,}|\.{1,})$/i;

  function montarPrompt(prova) {
    var enun = String((prova && prova.enunciado) || '').slice(0, 6000);
    var ficha = [prova && prova.orgao, prova && prova.ano, prova && prova.banca,
                 prova && prova.disciplina].filter(Boolean).join(' · ');
    return 'Você é examinador de concurso público brasileiro. A banca NÃO publicou o espelho '
      + 'de correção desta prova discursiva. Monte um espelho de correção plausível.\n\n'
      + (ficha ? ('PROVA: ' + ficha + '\n') : '')
      + 'ENUNCIADO:\n' + enun + '\n\n'
      + 'Responda SOMENTE com JSON, sem texto ao redor, no formato:\n'
      + '{"total": <pontuação total sugerida, número>, "quesitos": [{"quesito": "<o que se exige, '
      + 'em uma frase>", "pontos": <número>, "fundamento": "<dispositivo legal, súmula ou julgado '
      + 'que sustenta o quesito>"}]}\n\n'
      + 'REGRAS: entre 3 e 10 quesitos; a soma dos pontos deve dar o total; TODO quesito precisa '
      + 'de fundamento concreto (artigo de lei, súmula ou tema repetitivo) — se não souber o '
      + 'fundamento, NÃO crie o quesito; nada de fundamento inventado.';
  }

  function limpo(q) {
    return {
      quesito: String((q && q.quesito) || '').trim(),
      pontos: (q && q.pontos != null && isFinite(+q.pontos)) ? +q.pontos : null,
      fundamento: String((q && q.fundamento) || '').trim(),
    };
  }
  function temFundamento(q) {
    return q.fundamento.length >= MIN_FUNDAMENTO && !RE_VAZIO.test(q.fundamento);
  }
  /** Separa o que a IA devolveu: quesitos aceitos, os descartados por falta de fundamento
      (contados, para a tela dizer quantos ficaram de fora) e os que nem eram quesito. */
  function triagem(objeto) {
    var vindos = ((objeto && objeto.quesitos) || []).map(limpo);
    var aceitos = [], semFundamento = 0, curtos = 0;
    vindos.forEach(function (q) {
      if (q.quesito.length < MIN_QUESITO) { curtos++; return; }
      // a regra dura: sem fundamento conferível, o quesito é descartado
      if (!temFundamento(q)) { semFundamento++; return; }
      aceitos.push(q);
    });
    return { recebidos: vindos.length, aceitos: aceitos, descartados: semFundamento, curtos: curtos };
  }
  /** Lê a resposta da IA e devolve o espelho sugerido, ou null se não sobrou nada usável.
      A contagem da triagem vai junto: a tela diz quantos vieram e por que ficaram de fora. */
  function interpretar(objeto, id) {
    var t = triagem(objeto), qs = t.aceitos;
    if (qs.length < 2) return null;
    var soma = qs.reduce(function (a, q) { return a + (q.pontos || 0); }, 0);
    var total = (objeto && objeto.total != null && isFinite(+objeto.total)) ? +objeto.total : (soma || null);
    return { id: id, up: Date.now(), ts: Date.now(), quesitos: qs, total: total,
      recebidos: t.recebidos, descartados: t.descartados, curtos: t.curtos };
  }

  /* ---- o que a tela diz da triagem. A conta fecha: aceitos + descartados = propostos ---- */
  function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }
  function resumo(sug) {
    if (!sug) return '';
    if (sug.recebidos == null) return 'Contagem de descartes indisponível: este espelho foi gerado antes de o app contar.';
    var n = +sug.recebidos || 0, a = (sug.quesitos || []).length, d = +sug.descartados || 0;
    // sem o campo, o que não foi aceito nem caiu por fundamento caiu por ser curto demais
    var c = sug.curtos != null ? (+sug.curtos || 0) : Math.max(0, n - a - d);
    return [plural(n, 'proposto pela IA', 'propostos pela IA'), plural(a, 'aceito', 'aceitos'),
      d ? plural(d, 'descartado por falta de fundamento', 'descartados por falta de fundamento')
        : 'nenhum descartado por falta de fundamento',
      c ? plural(c, 'descartado por enunciado curto demais', 'descartados por enunciado curto demais') : ''
    ].filter(Boolean).join(' · ');
  }
  /** Aviso curto (o toast dura 2 s): a contagem inteira fica na faixa. */
  function avisoGerado(sug) {
    var d = +(sug && sug.descartados) || 0;
    return 'Espelho sugerido gerado' + (d
      ? (' · ' + plural(d, 'quesito sem fundamento ficou de fora', 'quesitos sem fundamento ficaram de fora'))
      : ' — confira os fundamentos');
  }
  /** Por que não saiu espelho: o motivo real é ter menos de dois quesitos aproveitáveis. */
  function avisoFalha(tri) {
    var n = +(tri && tri.recebidos) || 0, a = (tri && tri.aceitos) ? tri.aceitos.length : 0;
    if (!n) return 'A IA não devolveu quesitos com fundamento — tente de novo';
    if (n === 1) return 'A IA propôs só 1 quesito; o mínimo é 2 — tente de novo';
    return (a ? ('Só ' + a + ' dos ' + n + ' quesitos é aproveitável') : ('Nenhum dos ' + n + ' quesitos é aproveitável'))
      + ' (mínimo 2) — tente de novo';
  }

  /* ---- referências do fundamento: o que vira botão para o LEGIS e para o JURIS ----
     Cada citação reconhecida vira {tipo:'lei', ref, cat} no molde que o host abre no LEGIS
     ("Art. 304, § 5º do CPC", e o arquivo da lei no catálogo do LEGIS), ou
     {tipo:'juris', ref, fo, nu, busca}: a coleção e o número
     com que o host acha o verbete exato no JURIS, e o texto de busca de reserva. O que não
     é reconhecido não vira link: o fundamento segue inteiro no texto, para conferir à mão.
     POR QUE UM LEITOR PASSO A PASSO, E NÃO UMA REGEX SÓ: o fundamento vem da IA, é guardado,
     sincronizado e lido a cada pintura da Redação. A regex única tinha retrocesso exponencial
     (oito incisos sem vírgula travavam a tela por segundos) e ligava a sigla que fecha uma
     citação ao artigo da seguinte, inventando dispositivo. Aqui cada passo só anda para a frente. */
  var LIMITE = 600;          // fundamento é uma linha; o que passar disso não é lido
  var LETRA = /[0-9A-Za-zÀ-ÖØ-öø-ÿ]/;
  function letra(ch) { return !!ch && LETRA.test(ch); }
  // Nome da lei → sigla, gênero ("da CF", "do CPC") e o arquivo da lei no catálogo do LEGIS
  // (leis-catalogo.js, URL do Planalto): com ele a tela abre também a lei que o atalho do ENAM
  // não conhece (LINDB, CTB, LC, lei por número). Cada padrão casa no INÍCIO do trecho e
  // ainda passa pela fronteira de palavra em leiEm: "CPM" não é "CP", "CPPM" não é "CPP".
  // Depois do nome, só o ano da lei em vigor ("CF/88", "CPC de 2015"): "CPC/73", "CC/1916" e
  // "Constituição Federal de 1967" são leis revogadas, e o botão abriria outro dispositivo.
  function ano(a) {
    return '(?:\\s*\\/\\s*(?:' + a + '|' + a.slice(2) + ')|\\s+de\\s+' + a + ')?(?!\\s*\\/\\s*\\d|\\s+de\\s+\\d)';
  }
  function padraoLei(nome, a, sigla, fem, cat) { return [new RegExp('^(?:' + nome + ')' + ano(a), 'i'), sigla, fem, cat]; }
  var LEIS = [
    padraoLei('Constitui[çc][ãa]o\\s+(?:Federal|da\\s+Rep[úu]blica(?:\\s+Federativa\\s+do\\s+Brasil)?)|CRFB|CF', '1988', 'CF', 1, 'constituicao'),
    // "Constituição" sozinha é a Federal. A estadual e as antigas, não: nome próprio ("Estadual",
    // "Goiana") ou "de/do/da" depois dela ("de Goiás", "do Estado", "de 1967") recusam. Sem o
    // "i" de propósito: a maiúscula é o que separa o adjetivo pátrio do verbo que segue a citação.
    [new RegExp('^[Cc]onstitui[çc][ãa]o' + ano('1988') + '(?!\\s+(?:d[aeo]s?\\s|[A-ZÀ-ÖØ-Þ]))'), 'CF', 1, 'constituicao'],
    padraoLei('C[óo]digo\\s+de\\s+Processo\\s+Civil|CPC', '2015', 'CPC', 0, 'l13105'),
    padraoLei('C[óo]digo\\s+de\\s+Processo\\s+Penal(?!\\s+Militar)|CPP', '1941', 'CPP', 0, 'del3689'),
    padraoLei('C[óo]digo\\s+Penal(?!\\s+Militar)|CP', '1940', 'CP', 0, 'del2848'),
    padraoLei('C[óo]digo\\s+Civil|CC', '2002', 'CC', 0, 'l10406'),
    padraoLei('C[óo]digo\\s+de\\s+Defesa\\s+do\\s+Consumidor|CDC', '1990', 'CDC', 0, 'l8078'),
    padraoLei('C[óo]digo\\s+Tribut[áa]rio\\s+Nacional|CTN', '1966', 'CTN', 0, 'l5172'),
    padraoLei('C[óo]digo\\s+de\\s+Tr[âa]nsito(?:\\s+Brasileiro)?|CTB', '1997', 'CTB', 0, 'l9503'),
    padraoLei('Consolida[çc][ãa]o\\s+das\\s+Leis\\s+do\\s+Trabalho|CLT', '1943', 'CLT', 1, 'del5452'),
    padraoLei('Estatuto\\s+da\\s+Crian[çc]a\\s+e\\s+do\\s+Adolescente|ECA', '1990', 'ECA', 0, 'l8069'),
    padraoLei('Lei\\s+de\\s+Execu[çc][ãa]o\\s+Penal|LEP', '1984', 'LEP', 1, 'l7210'),
    padraoLei('Lei\\s+de\\s+Improbidade(?:\\s+Administrativa)?|LIA', '1992', 'LIA', 1, 'l8429'),
    padraoLei('Lei\\s+de\\s+Introdu[çc][ãa]o\\s+(?:[àa]s\\s+Normas\\s+do\\s+Direito\\s+Brasileiro|ao\\s+C[óo]digo\\s+Civil)|LINDB', '1942', 'LINDB', 1, 'del4657')
  ];
  // lei pelo número: "Lei 8.112/1990", "Lei n.º 9.613/98", "LC 101/2000", "Decreto-Lei 3.689/1941"
  var RE_LEI_NUM = /^(Lei\s+Complementar|LC|Lei|Decreto-Lei|Decreto\s+Lei|DL)\s+(?:n\.?\s*[º°o]?\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d+)(?:\s*\/\s*(\d{4}|\d{2}))?/i;
  var PREFIXO_CAT = { 'LC': 'lcp', 'Decreto-Lei': 'del', 'Lei': 'l' };   // como o Planalto nomeia o arquivo
  /** A lei que começa exatamente em p, ou null. */
  function leiEm(s, p) {
    if (p > 0 && letra(s.charAt(p - 1))) return null;
    var t = s.slice(p), m = RE_LEI_NUM.exec(t), i;
    if (m && !letra(t.charAt(m[0].length))) {
      var tipo = /^(Lei\s+Complementar|LC)$/i.test(m[1]) ? 'LC' : (/^(Decreto|DL)/i.test(m[1]) ? 'Decreto-Lei' : 'Lei');
      return { ini: p, fim: p + m[0].length, sigla: tipo + ' ' + m[2] + (m[3] ? '/' + m[3] : ''), fem: tipo !== 'Decreto-Lei',
        cat: PREFIXO_CAT[tipo] + m[2].replace(/\./g, '') };
    }
    for (i = 0; i < LEIS.length; i++) {
      m = LEIS[i][0].exec(t);
      if (m && !letra(t.charAt(m[0].length))) return { ini: p, fim: p + m[0].length, sigla: LEIS[i][1], fem: !!LEIS[i][2], cat: LEIS[i][3] };
    }
    return null;
  }
  function leisDo(s) {
    var achadas = [], re = /[A-Za-zÀ-ÖØ-öø-ÿ]+/g, m, l;
    while ((m = re.exec(s))) { l = leiEm(s, m.index); if (l) { achadas.push(l); re.lastIndex = l.fim; } }
    return achadas;
  }
  var RE_ART = /(^|[^0-9A-Za-zÀ-ÖØ-öø-ÿ])(arts?\.?|artigos?)\s*(?=\d)/gi;
  // o ordinal também com ponto, à moda antiga ("art. 1.º", "§ 6.º"): "1.228" é milhar, "1.º" não
  var RE_NUM = /^(\d{1,3}(?:\.\d{3})+|\d+)(-[A-Z])?(\.[ºª°]|\s?[ºª°]|o(?![A-Za-zÀ-ÖØ-öø-ÿ]))?/;
  var RE_MAIS = /^(?:\s*,\s*|\s+(e|a|até)\s+)(?=\d)/i;           // "arts. 186 e 927", "arts. 300 a 302"
  var RE_SEP = /^(?:\s*,\s*|\s+e\s+|\s*)/;
  var DISPOSITIVOS = [
    /^caput(?![A-Za-zÀ-ÖØ-öø-ÿ])/i,
    /^§§?\s*\d+(?:\.[ºª°]|\s?[ºª°o])?/,
    /^par[áa]grafo\s+(?:[úu]nico|\d+(?:\.[ºª°]|\s?[ºª°o])?)/i,
    /^par\.\s*[úu]n(?:ico|\.)?/i,
    /^[Ii]nc(?:isos?|s?\.)?\s*[IVXLCDM]+(?![0-9A-Za-zÀ-ÖØ-öø-ÿ])/,
    /^[IVXLCDM]+(?![0-9A-Za-zÀ-ÖØ-öø-ÿ])/,
    /^al[íi]neas?\s*["“'‘]?[a-z]["”'’]?(?![A-Za-zÀ-ÖØ-öø-ÿ])/i,
    /^["“'‘][a-z]["”'’](?![A-Za-zÀ-ÖØ-öø-ÿ])/,             // alínea só entre aspas: 'art. 1º, I, "g"'
    /^[a-z]\)/,
    /^\d+(?:\.[ºª°]|\s?[ºª°])/
  ];
  var RE_DEPOIS = /^(?:\s*,?\s*d[aeo]s?\s+|\s*,\s*|\s*\(\s*|\s+)/i;
  function ordinal(m) {
    var o = m[3] ? m[3].replace(/[\s.]/g, '') : '';
    return m[1] + (m[2] || '') + (o === 'ª' ? 'ª' : (o ? 'º' : ''));
  }
  /** As citações de artigo, em ordem, sem nunca emprestar a lei de outra citação. */
  function artigos(s) {
    var leis = leisDo(s), usada = {}, out = [], m;
    RE_ART.lastIndex = 0;
    while ((m = RE_ART.exec(s))) {
      var ini = m.index + m[1].length, pos = m.index + m[0].length, nums = [], k, achou, guarda;
      var n = RE_NUM.exec(s.slice(pos)); if (!n) continue;
      nums.push(ordinal(n)); pos += n[0].length;
      for (guarda = 0; guarda < 20; guarda++) {            // mais artigos da mesma citação
        var mais = RE_MAIS.exec(s.slice(pos)); if (!mais) break;
        var n2 = RE_NUM.exec(s.slice(pos + mais[0].length)); if (!n2) break;
        if (!mais[1] || /^e$/i.test(mais[1])) nums.push(ordinal(n2));   // faixa ("300 a 302"): fica o início
        pos += mais[0].length + n2[0].length;
      }
      var fimNum = pos;
      for (guarda = 0; guarda < 40; guarda++) {            // parágrafos, incisos, alíneas
        var q = pos + RE_SEP.exec(s.slice(pos))[0].length;
        if (leiEm(s, q)) break;                            // "CC", "CDC" e "LC" também são letras romanas
        achou = null;
        for (k = 0; k < DISPOSITIVOS.length && !achou; k++) achou = DISPOSITIVOS[k].exec(s.slice(q));
        if (!achou || !achou[0].length) break;
        pos = q + achou[0].length;
      }
      var resto = s.slice(fimNum, pos).replace(/^[\s,]+/, '').replace(/\s+/g, ' ').replace(/(\d)\.([ºª°])/g, '$1$2').trim();
      var dep = RE_DEPOIS.exec(s.slice(pos)), lei = dep ? leiEm(s, pos + dep[0].length) : null;
      if (!lei) {
        // a lei ANTES do artigo ("CPC, art. 139") só vale se for a cabeça desta citação: logo
        // antes dele, livre, e não presa a um "do/da" (aí ela fecha a citação anterior)
        var antes = null;
        for (k = leis.length - 1; k >= 0; k--) if (leis[k].fim <= ini) { antes = leis[k]; break; }
        if (antes && !usada[antes.ini] && /^\s*[,:–—-]?\s*$/.test(s.slice(antes.fim, ini))
            && !/(^|[^A-Za-zÀ-ÖØ-öø-ÿ])(d[aeo]s?|n[ao]s?)\s+$/i.test(s.slice(Math.max(0, antes.ini - 6), antes.ini))) lei = antes;
      }
      if (!lei) continue;
      usada[lei.ini] = 1;
      for (k = 0; k < nums.length; k++) {
        var r = (k === nums.length - 1 && resto) ? ', ' + resto : '';
        out.push({ pos: ini, tipo: 'lei', ref: 'Art. ' + nums[k] + r + (lei.fem ? ' da ' : ' do ') + lei.sigla, cat: lei.cat });
      }
      RE_ART.lastIndex = Math.max(RE_ART.lastIndex, pos);
    }
    return out;
  }
  // súmulas e temas: número com ponto de milhar ("Tema 1.046"), "nº"/"n.º" e o tribunal antes
  // ou depois ("STJ, Tema 1.000", "Súmula 7/STJ"). Nada aninhado que possa retroceder, e os
  // espaços chegam reduzidos a um (referencias): os "\s*" em fila não têm o que repartir.
  var NUMJ = '(\\d{1,3}(?:\\.\\d{3})+|\\d+)';
  var NPREF = '(?:n\\.?\\s*[º°o]?\\.?\\s*)?';
  // os outros números da lista ("Súmulas 7 e 83"), sem engolir o ponto final: "83. TST, Tema" não é "83 do TST"
  var NUML = '(?:\\d{1,3}(?:\\.\\d{3})+|\\d+)';
  // grupos: 1 tribunal antes · 2 "Vinculante" (súmula) ou o tipo do tema · 3 número · 4 mais números ·
  // 5 o que liga o tribunal de depois ("/", " do ", ", ") · 6 o tribunal de depois
  var RE_SUMULA = new RegExp('(?:\\b(STF|STJ|TST|TSE|TCU|TNU)\\s*[,:–—-]\\s*)?\\bS[úu]mulas?\\s+(Vinculantes?\\s+)?' + NPREF + NUMJ
    + '((?:\\s*(?:,|\\be\\b)\\s*' + NUML + ')*)(?:(\\s*[\\/,–-]?\\s*\\(?\\s*(?:d[oa]\\s+)?)(STF|STJ|TST|TSE|TCU|TNU)\\b\\)?)?', 'gi');
  var RE_TEMA = new RegExp('(?:\\b(STF|STJ)\\s*[,:–—-]\\s*)?\\bTemas?\\s+(?:(?:de\\s+)?(Repercuss[ãa]o\\s+Geral|RG|Repetitivos?)\\s+)?' + NPREF + NUMJ
    + '((?:\\s*(?:,|\\be\\b)\\s*' + NUML + ')*)(?:(\\s*[\\/,–-]?\\s*\\(?\\s*(?:d[oa]s?\\s+)?)(STF|STJ|RG|repercuss[ãa]o\\s+geral|recursos?\\s+repetitivos?|repetitivos?)\\b\\)?)?', 'gi');
  function numerosJ(primeiro, lista) {
    return [primeiro].concat(String(lista || '').split(/\s*(?:,|\be\b)\s*/))
      .map(function (x) { return x.replace(/\./g, ''); }).filter(function (x) { return /^\d+$/.test(x); });
  }
  function sumula(num, trib, vinc) {
    var t = String(trib || '').toUpperCase(), r = { pos: 0, tipo: 'juris', nu: +num };
    if (vinc) { r.ref = 'Súmula Vinculante ' + num; r.fo = 'sumula_vinculante'; r.busca = r.ref; }
    else if (t === 'STF' || t === 'STJ') { r.ref = 'Súmula ' + num + ' do ' + t; r.fo = 'sumula_' + t.toLowerCase(); r.busca = 'Súmula ' + num + ' ' + t; }
    else if (t === 'TSE') { r.ref = 'Súmula ' + num + ' do TSE'; r.fo = 'sumula_tse'; r.busca = 'Súmula TSE ' + num; }
    // tribunal fora do acervo do JURIS: a referência aparece, mas não promete um verbete
    else if (t) { r.ref = 'Súmula ' + num + ' do ' + t; r.fo = ''; r.busca = ''; }
    else { r.ref = 'Súmula ' + num; r.fo = ''; r.busca = r.ref; }
    return r;
  }
  function tema(num, onde) {
    var o = String(onde || ''), r = { pos: 0, tipo: 'juris', nu: +num };
    if (/^(STF|RG|repercuss)/i.test(o)) { r.ref = 'Tema ' + num + ' do STF'; r.fo = 'repercussao_geral'; r.busca = 'Tema ' + num + ' (RG)'; }
    else if (/^(STJ|recurso|repetitivo)/i.test(o)) { r.ref = 'Tema ' + num + ' do STJ'; r.fo = 'repetitivo'; r.busca = 'Tema ' + num + ' (Repetitivo)'; }
    else { r.ref = 'Tema ' + num; r.fo = ''; r.busca = r.ref; }
    return r;
  }
  // Um tribunal escrito uma vez serve a UMA citação, como a sigla da lei (artigos), e na dúvida a
  // nenhuma: sem tribunal, o botão busca o número no JURIS em vez de abrir o verbete de outro.
  // O de DEPOIS ("Súmula 7 do STJ", "7/STJ", "7 (STJ)") é da própria citação e vence. O de ANTES
  // ("STJ, Tema 1.000") só vale livre: não quando já é de outra citação ("Tema 786 do STF, Súmula
  // 54 do STJ": o STF é do tema), nem preso a "do/da/no/pelo", a uma barra ou a um número ("ADI
  // 4.277 do STF, Súmula 7"). Ligado só por vírgula ou traço e seguido de outra citação, ele abre
  // a seguinte quando esta já tem o seu ("STF, Tema 786, STJ, Súmula 54") ou quando vem ":" ou
  // traço depois ("STJ: Súmula 54"); em "Súmula 410, STJ, Tema 786" tanto fecha quanto abre: sem dono.
  var RE_PRESO = /(?:(?:^|[^A-Za-zÀ-ÖØ-öø-ÿ])(?:d[aeo]s?|n[ao]s?|pel[ao]s?)\s+|[\/\d]\s*)$/i;
  function livre(s, m) { return !!m[1] && !RE_PRESO.test(s.slice(Math.max(0, m.index - 8), m.index)); }
  function antesDeOutra(trib, liga, resto) {
    return /^(STF|STJ|TST|TSE|TCU|TNU)$/i.test(trib) && /^\s*[,–-]\s*$/.test(liga)
      && /^\s*[,:–—-]\s*(?:S[úu]mulas?|Temas?)\b/i.test(resto);
  }
  function julgados(s) {
    var achados = [], fecham = {}, out = [];
    [RE_SUMULA, RE_TEMA].forEach(function (re) {
      var m; re.lastIndex = 0;
      while ((m = re.exec(s))) {
        var fim = m.index + m[0].length, depois = m[6] || '', ini;
        if (depois) {
          ini = s.charAt(fim - 1) === ')' ? fim - 1 - depois.length : fim - depois.length;
          if (!antesDeOutra(depois, m[5], s.slice(fim))) fecham[ini] = 1;
          // cabeça da seguinte: a busca recomeça nele, para casar como o tribunal antes dela
          else if (livre(s, m) || !/^\s*,/.test(s.slice(fim))) { depois = ''; re.lastIndex = ini; }
          else { depois = ''; fecham[ini] = 1; }
        }
        achados.push({ sumula: re === RE_SUMULA, m: m, depois: depois });
      }
    });
    achados.forEach(function (a) {
      var m = a.m, antes = (livre(s, m) && !fecham[m.index]) ? m[1] : '';
      numerosJ(m[3], m[4]).forEach(function (n) {
        var r = a.sumula ? sumula(n, a.depois || antes, !!m[2]) : tema(n, m[2] || a.depois || antes);
        r.pos = m.index; out.push(r);
      });
    });
    return out;
  }
  var memo = {}, memoN = 0;
  function referencias(fundamento) {
    var f = String(fundamento || ''), chave = 'k' + f, out;
    if (Object.prototype.hasOwnProperty.call(memo, chave)) out = memo[chave];
    else {
      // espaços em fila viram um só: com eles, os "\s*" seguidos do fim das súmulas e dos temas
      // retrocediam em tempo cúbico ("Súmula 1" e 590 espaços levavam 160 ms por leitura)
      var s = f.slice(0, LIMITE * 4).replace(/\s+/g, ' ').slice(0, LIMITE), vistos = {};
      out = artigos(s).concat(julgados(s)).sort(function (a, b) { return a.pos - b.pos; })
        .filter(function (r) { var k = r.ref.toLowerCase(); if (vistos[k]) return false; vistos[k] = 1; return true; });
      if (++memoN > 400) { memo = {}; memoN = 1; }     // a lista é de uma prova por vez; não cresce sem fim
      memo[chave] = out;
    }
    return out.map(function (r) { var c = {}, k; for (k in r) if (k !== 'pos') c[k] = r[k]; return c; });
  }
  /** O id do verbete no índice do JURIS (juris-index.js): coleção + número, que o id nem
      sempre segue (há temas com id fora do padrão). Vazio quando o acervo não tem. */
  function verbeteNoJuris(idx, fo, nu) {
    if (!idx || !idx.length || !fo || !nu) return '';
    for (var i = 0; i < idx.length; i++) { var r = idx[i]; if (r && r[2] === fo && +r[3] === +nu) return String(r[0]); }
    return '';
  }

  var CABECALHO = 'ESPELHO SUGERIDO PELO CÁTEDRA — NÃO OFICIAL';

  function texto(sug) {
    if (!sug || !sug.quesitos || !sug.quesitos.length) return '';
    var linhas = sug.quesitos.map(function (q, i) {
      return (i + 1) + '. ' + q.quesito
        + (q.pontos != null ? ('  (' + q.pontos + ' ponto' + (q.pontos === 1 ? '' : 's') + ')') : '')
        + '\n   Fundamento: ' + q.fundamento;
    });
    return CABECALHO
      + (sug.total != null ? ('  ·  total sugerido ' + sug.total) : '')
      + '\nA banca não publicou espelho desta prova. Os quesitos abaixo foram gerados por IA a '
      + 'partir do enunciado; confira cada fundamento antes de confiar na nota.\n\n'
      + linhas.join('\n');
  }

  /** O texto se declara sugerido? (regra 2). Vale sem o objeto em cache: reabrir uma correção
      do histórico e refazer não pode transformar a nova nota em oficial. */
  function ehTextoSugerido(t) { return String(t || '').replace(/^\s+/, '').indexOf(CABECALHO) === 0; }

  window.CT_ESPELHO_SUGERIDO = { montarPrompt: montarPrompt, triagem: triagem, interpretar: interpretar,
    texto: texto, referencias: referencias, verbeteNoJuris: verbeteNoJuris, resumo: resumo,
    avisoGerado: avisoGerado, avisoFalha: avisoFalha, ehTextoSugerido: ehTextoSugerido, CABECALHO: CABECALHO };
})();
