/* Cátedra — REVISÃO OFICIAL: o vocabulário único das mudanças detectadas nas fontes oficiais.
 *
 * O sentinela (scripts/sentinela.mjs) escreve `novidades.js` no servidor; este módulo é a
 * leitura comum desse pacote para os três lugares que o mostram: o Início do Cátedra (resumo
 * e painel "Revisão oficial"), o CátedraLEGIS ("Mudanças oficiais") e o CátedraJURIS
 * ("Informativos oficiais"). Um módulo só para que os três falem a MESMA língua de status:
 *
 *   Detectado · Conferir · Conferido · No acervo · Falhou · Parcial
 *
 * "No acervo" (incorporado:true, decisão da dona em 01/10/2026): a edição/dispositivo já entrou no
 * acervo; fica fora de "para revisar" e não pede comparação.
 *
 * A premissa jurídica não muda aqui: detecção automática, publicação assistida. Nenhum item
 * nasce "publicado"; o máximo que a tela diz é que alguém conferiu.
 *
 * "Conferido" mora no estado ÚNICO das novidades, catedra:novidLidas = [{id, up, st}] (contrato
 * do PR #175; ARRAY_ID no auth.js, viaja entre aparelhos). O host é o dono: os satélites só
 * LEEM a chave e pedem a marca pela ponte (ctOficialMarcar); enquanto o host grava (≤ 500 ms),
 * a tela do satélite usa um espelho em memória.
 *
 * Sintaxe ES5 de propósito: roda no JavaScriptCore do WKWebView e em file://.
 */
(function (root) {
  'use strict';
  var armazenamentoLeitor = root.ctArmazenamentoLeitor;
  var CHAVE = 'catedra:novidLidas';
  var espelho = {};   // marcas pedidas por ESTE satélite e ainda não gravadas pelo host

  // Status por texto + cor; a cor nunca anda sozinha. `cls` liga ao CSS em catedra-ui.css.
  var STATUS = {
    detectado: { rotulo: 'Detectado', cls: 'ct-of-st-detectado', desc: 'mudança encontrada na fonte oficial, ainda sem conferência' },
    conferir:  { rotulo: 'Conferir',  cls: 'ct-of-st-conferir',  desc: 'precisa de conferência humana antes de entrar no acervo' },
    conferido: { rotulo: 'Conferido', cls: 'ct-of-st-conferido', desc: 'conferido contra a fonte oficial' },
    incorporado: { rotulo: 'No acervo', cls: 'ct-of-st-conferido', desc: 'já incorporado ao acervo do Cátedra' },
    falhou:    { rotulo: 'Falhou',    cls: 'ct-of-st-falhou',    desc: 'a consulta à fonte não deu certo' },
    parcial:   { rotulo: 'Parcial',   cls: 'ct-of-st-parcial',   desc: 'consulta ou comparação incompleta' }
  };
  var FONTES = {
    planalto: { nome: 'Planalto', produto: 'legis', produtoNome: 'CátedraLEGIS' },
    stf: { nome: 'STF', produto: 'juris', produtoNome: 'CátedraJURIS' },
    stj: { nome: 'STJ', produto: 'juris', produtoNome: 'CátedraJURIS' }
  };
  var TIPOS = { alteracao: 'Alteração', inclusao: 'Inclusão', revogacao: 'Revogação', informativo: 'Informativo' };
  // Limites de reserva: valem só se o pacote vier sem `limites` (o sentinela sempre manda).
  var LIMITE_PADRAO = {
    planalto: 'Não descobre norma nova fora do catálogo do LEGIS.',
    stf: 'Cobre o Informativo; súmulas e repercussão geral ficam fora.',
    stj: 'Cobre o Informativo; súmulas e repetitivos ainda fora da rotina.'
  };

  function pacote(n) {
    var N = n || root.CT_NOVIDADES || {};
    return { geradoEm: N.geradoEm || null, fontes: N.fontes || {}, itens: Array.isArray(N.itens) ? N.itens : [] };
  }

  /** [{id, up, st}] → {id: {st, up}} */
  function marcasDe(lista) {
    var m = {};
    (Array.isArray(lista) ? lista : []).forEach(function (x) { if (x && x.id) m[x.id] = { st: x.st || 'lida', up: x.up || 0 }; });
    return m;
  }
  function lerMarcas() {
    var m = {};
    try { m = marcasDe(JSON.parse((armazenamentoLeitor || root.localStorage).getItem(CHAVE) || '[]')); } catch (e) {}
    Object.keys(espelho).forEach(function (id) { if (!m[id] || (m[id].up || 0) < espelho[id].up) m[id] = espelho[id]; });
    return m;
  }
  /** Satélite: pede ao host (dono do estado) e já mostra. "Manter em revisão" = volta a 'lida'. */
  function marcar(id, st) {
    if (!id) return lerMarcas();
    var v = st === 'conferido' ? 'conferido' : 'lida';
    espelho[id] = { st: v, up: Date.now() };
    try { if (root.ctEnviarAoHost) root.ctEnviarAoHost({ type: 'ctOficialMarcar', id: String(id), st: v }); } catch (e) {}
    return lerMarcas();
  }

  function data(iso, comHora) {
    if (!iso) return '';
    try {
      var o = { day: '2-digit', month: 'short' };
      if (comHora) { o.hour = '2-digit'; o.minute = '2-digit'; }
      return new Date(iso).toLocaleString('pt-BR', o);
    } catch (e) { return ''; }
  }

  /** Status de UM item. A ordem importa: o que já está no acervo vence a marca da pessoa;
   *  fora isso a marca vence; parcial e "conferir" (vigência sem data, comparação no teto)
   *  nunca viram "Detectado" limpo. */
  function statusItem(it, marcas) {
    var mk = marcas && marcas[it.id];
    // Já no acervo (comparação inteira): a marca antiga não muda nada. Sem esta ordem, um item
    // conferido ANTES da baixa mostrava "Manter em revisão", e o clique o tirava da revisão.
    if (it.incorporado && !it.parcial) return 'incorporado';
    if (mk && mk.st === 'conferido') return 'conferido';
    // comparação parcial nunca sai como conferida por inteiro, nem como "No acervo"
    if (it.parcial) return 'parcial';
    if (it.revisar) return 'conferir';
    return 'detectado';
  }

  function tipoJuris(it) {
    // O sentinela hoje só detecta EDIÇÕES; os subtipos abaixo já têm lugar na fila para
    // quando o build do acervo cruzar a edição com os verbetes.
    if (it.subtipo === 'novo-verbete') return 'Possível novo verbete';
    if (it.subtipo === 'atualizacao-verbete') return 'Possível atualização de verbete';
    return 'Novo informativo';
  }

  /** "pelo" ou "pela", conforme a norma: "pelo Decreto-lei nº 229", "pela Lei nº 14.133". */
  function pelaPelo(norma) {
    return /^(decreto|ato|provimento|regulamento|regimento|estatuto|c[óo]digo)\b/i.test(String(norma).trim()) ? 'pelo' : 'pela';
  }

  /** A norma como o Planalto a anota, sem os tropeços reais da página: a preposição repetida
   *  ("Redação dada pela pela Emenda…", CF art. 168 e CLT) e a pontuação dentro do parêntese
   *  ("…nº 8, de 15/08/95:)", ADCT). */
  function limparNorma(n) {
    return String(n || '').replace(/^\s*pel[ao]\s+/i, '').replace(/[\s:;,.]+$/, '').trim();
  }

  /** Quem fez a mudança, dito do ARTIGO — o dispositivo do cartão.
   *  · Alteração: "Alterado pela <norma da diferença>". A anotação nova pode ser de um § ou de
   *    um inciso ("Incluído pela…" num § 9º, "Revogado pela…" num § 1º); repeti-la como se fosse
   *    do artigo diria que o artigo foi incluído ou revogado, e ele continua lá.
   *  · Inclusão / revogação: a PRIMEIRA anotação com a ação do próprio tipo — a do caput, que é
   *    a do artigo; as seguintes são de § ou inciso acrescentados depois, por outras leis (CP
   *    art. 121-A: caput pela Lei 14.994, § 3º por outra). Sem anotação do tipo, nenhuma norma
   *    é citada — apontar outra lei da diferença atribuiria a mudança à lei errada. */
  function autoria(it) {
    var L = Array.isArray(it.modificadoras) ? it.modificadoras : [];
    var achar = function (re) {
      for (var k = 0; k < L.length; k++) {
        if (L[k] && L[k].norma && re.test(String(L[k].acao || '').toLowerCase())) return L[k].norma;
      }
      return '';
    };
    var norma = '', verbo = '';
    if (it.tipo === 'inclusao') { norma = achar(/^inclu/); verbo = 'Incluído'; }
    else if (it.tipo === 'revogacao') { norma = achar(/^revogad/); verbo = 'Revogado'; }
    else if (it.tipo === 'alteracao') { norma = it.modificadora || ''; verbo = 'Alterado'; }
    norma = limparNorma(norma);
    return norma ? (verbo + ' ' + pelaPelo(norma) + ' ' + norma) : '';
  }

  function item(it, marcas) {
    var f = FONTES[it.fonte] || { nome: it.fonte || 'Fonte oficial', produto: 'juris', produtoNome: 'CátedraJURIS' };
    var st = statusItem(it, marcas);
    var ehLegis = f.produto === 'legis';
    var fonteUrl = urlSegura(it.urlOficial);
    var tipo = TIPOS[it.tipo] || 'Alteração';
    // Frase para quem estuda, na ordem do que muda a vida dela. vigenciaMotivo é diagnóstico do
    // classificador (o sentinela preenche em TODO item) e não vira resumo.
    var partes = [];
    // Recorte: a pendência diz que ESTE artigo não mudou; a vigência viria do vizinho e contradiria.
    if (!it.recorte) {
      if (it.vigencia === 'aguardando') {
        var em = it.vigenciaEm ? (' em ' + it.vigenciaEm) : '';
        if (it.tipo === 'revogacao') partes.push('Revogação aguardando vigência: deixa de valer' + (em || ' na data da norma') + '; até lá, continua valendo');
        else partes.push('Aguardando vigência' + (it.vigenciaEm ? (': vale a partir de ' + it.vigenciaEm) : '')
          + (it.tipo === 'alteracao' ? '; até lá, vale a redação anterior' : (it.tipo === 'inclusao' ? '; até lá, o dispositivo ainda não se aplica' : '')));
      } else if (it.vigencia === 'indeterminada') partes.push('Vigência própria sem data na página: conferir na fonte');
    }
    var quem = it.modificadora ? autoria(it) : '';
    if (quem) partes.push(quem);
    if (it.pendencia) partes.push(String(it.pendencia));
    if (!partes.length && it.incorporado) partes.push(it.incorporadoTxt ? ('Item ' + it.incorporadoTxt) : 'Já incorporado ao acervo');
    if (!partes.length) partes.push({ revogacao: 'O dispositivo saiu do texto compilado (revogado ou renumerado): conferir na fonte',
      inclusao: 'Dispositivo novo no texto compilado', informativo: 'Edição nova na fonte oficial' }[it.tipo] || 'Mudança detectada no texto compilado');
    // A pendência do sentinela vem em minúscula (para seguir dois-pontos); sozinha, abre a frase.
    var resumo = partes.join(' · ').replace(/[.:;,\s]+$/, '') + '.';
    resumo = resumo.charAt(0).toUpperCase() + resumo.slice(1);
    return {
      id: String(it.id || ''), fonte: it.fonte || '', fonteNome: f.nome, produto: f.produto, produtoNome: f.produtoNome,
      tipo: it.tipo || 'alteracao', tipoRotulo: ehLegis ? tipo : tipoJuris(it),
      status: st, statusRotulo: STATUS[st].rotulo, statusCls: STATUS[st].cls,
      titulo: it.titulo || it.disp || 'Mudança detectada', norma: it.norma || '', normaNome: it.normaNome || it.norma || '',
      disp: it.disp || '', rotulo: it.rotulo || it.disp || '', ramo: it.ramo || '', antes: it.antes || '', depois: it.depois || '',
      // Recorte: a vigência foi lida no trecho do artigo VIZINHO — o selo "Vigência futura"
      // contradiria a pendência ("o texto deste artigo não mudou").
      vigencia: it.vigencia || '', vigenciaEm: it.vigenciaEm || '', vigenciaFutura: !it.recorte && it.vigencia === 'aguardando',
      modificadora: it.modificadora || '', parcial: !!it.parcial, incorporado: !!it.incorporado, resumo: resumo,
      // "No acervo" não oferece marcar/manter: a marca 'lida' não o devolveria à revisão
      podeMarcar: st !== 'incorporado',
      detectadoEm: it.detectadoEm || '', quando: data(it.detectadoEm) || 'data não informada',
      urlOficial: it.urlOficial || '',
      // o link "Fonte oficial" do painel do host: só https de host oficial (a regra do _novidUrl)
      fonteUrl: fonteUrl, temFonte: !!fonteUrl,
      busca: ehLegis ? [it.normaNome || it.norma, it.disp].filter(Boolean).join(' ') : (it.norma ? (it.norma + ' Informativo') : (it.titulo || ''))
    };
  }

  function itens(n, marcas) {
    var P = pacote(n), M = marcas || lerMarcas(), frases = {};
    return P.itens.map(function (it) {
      var o = item(it, M), v = varreduraItem(it, P.fontes);
      // a frase sai uma vez por diário (fonte ou coleção): a data formatada custa e se repete
      o.varredura = v;
      o.varreduraTxt = frases[v.chave] || (frases[v.chave] = varreduraTxt(v));
      return o;
    });
  }

  /** Saúde de cada fonte: ok / parcial / falhou / pendente (nunca consultada). */
  function fontes(n) {
    var P = pacote(n);
    return ['planalto', 'stf', 'stj'].map(function (k) {
      var f = P.fontes[k] || {}, r = f.resultado;
      var st = r === 'falha' ? 'falhou' : (r === 'parcial' ? 'parcial' : ((r === 'sem-novidade' || r === 'novidades') ? 'ok' : 'pendente'));
      // mesmo rótulo do resumo do Início e da Central (#175)
      var rot = st === 'ok' ? (r === 'novidades' ? 'Detectado' : 'Sem novidade') : { parcial: 'Parcial', falhou: 'Falhou', pendente: 'Nunca consultada' }[st];
      var limites = (Array.isArray(f.limites) && f.limites.length) ? f.limites : [LIMITE_PADRAO[k]];
      return { k: k, nome: FONTES[k].nome, produto: FONTES[k].produto, status: st, statusRotulo: rot,
        statusCls: st === 'ok' ? 'ct-of-st-conferido' : (st === 'falhou' ? 'ct-of-st-falhou' : (st === 'parcial' ? 'ct-of-st-parcial' : 'ct-of-st-pendente')),
        monitora: f.monitora || '', limites: limites, limite: limites[0], erro: f.erro || '',
        tentativa: data(f.ultimaTentativa, true) || 'nunca', sucesso: data(f.ultimoSucesso, true) || 'nunca' };
    });
  }

  /** Fontes que NÃO permitem dizer "nada mudou": a última consulta falhou, respondeu só em
   *  parte ou nunca aconteceu. Estado vazio com lacuna nunca vira "nenhuma mudança". */
  function lacunas(F) {
    return (F || fontes()).filter(function (f) { return f.status !== 'ok'; });
  }
  function lacunasTxt(L) {
    return L.map(function (f) { return f.nome + ' (' + String(f.statusRotulo).toLowerCase() + ')'; }).join(', ');
  }

  function contagem(n, marcas) { return contarDe(itens(n, marcas), fontes(n)); }
  /** Contagem sobre listas JÁ mapeadas: quem já tem as duas não remapeia. */
  function contarDe(L, F) {
    var c = { total: L.length, revisar: 0, conferidos: 0, legis: 0, juris: 0, fontesOk: 0, fontesProblema: 0, fontesPendentes: 0 };
    L.forEach(function (i) {
      if (i.status === 'conferido') c.conferidos++; else if (i.status !== 'incorporado') c.revisar++;
      if (i.produto === 'legis') c.legis++; else c.juris++;
    });
    F.forEach(function (f) {
      if (f.status === 'ok') c.fontesOk++; else if (f.status === 'pendente') c.fontesPendentes++; else c.fontesProblema++;
    });
    return c;
  }

  /** Diferença por palavras entre o texto anterior e o atual: prefixo e sufixo comuns ficam
   *  neutros, o miolo sai como removido (-) e incluído (+). Discreto e estável — não tenta
   *  alinhar palavra a palavra um artigo de 4.000 caracteres. */
  function diff(antes, depois) {
    var a = String(antes || '').split(/(\s+)/), b = String(depois || '').split(/(\s+)/);
    var i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    var j = 0; while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
    var pre = a.slice(0, i).join(''), suf = a.slice(a.length - j).join('');
    return { pre: pre, saiu: a.slice(i, a.length - j).join(''), entrou: b.slice(i, b.length - j).join(''), suf: suf };
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }

  /** HTML do par antes × depois, com o trecho mudado em <del>/<ins>. Usado no LEGIS. */
  function diffHtml(antes, depois) {
    var d = diff(antes, depois);
    var corta = function (s, lado) {
      if (s.length <= 220) return esc(s);
      return lado === 'pre' ? ('…' + esc(s.slice(-200))) : (esc(s.slice(0, 200)) + '…');
    };
    return {
      antes: corta(d.pre, 'pre') + (d.saiu ? '<del class="ct-of-del">' + esc(d.saiu) + '</del>' : '') + corta(d.suf, 'suf'),
      depois: corta(d.pre, 'pre') + (d.entrou ? '<ins class="ct-of-ins">' + esc(d.entrou) + '</ins>' : '') + corta(d.suf, 'suf')
    };
  }

  function precisaRevisar(i) { return i.status !== 'conferido' && i.status !== 'incorporado'; }

  /* ── Por item: a última varredura da fonte, o link oficial e "conferida, aguardando o acervo" ── */

  /** Link de saída só para https de host oficial — a mesma lista do _novidUrl da Central
   *  (planalto.gov.br, stf.jus.br, stj.jus.br e subdomínios). O endereço vem do pacote: http,
   *  outro host ou texto malformado não vira link. */
  function urlSegura(u) {
    try {
      var x = new URL(String(u || ''));
      return (x.protocol === 'https:' && /(^|\.)(planalto\.gov\.br|stf\.jus\.br|stj\.jus\.br)$/i.test(x.hostname)) ? x.href : '';
    } catch (e) { return ''; }
  }

  function instante(iso) { var t = Date.parse(iso || ''); return isFinite(t) ? t : null; }
  function dois(n) { return (n < 10 ? '0' : '') + n; }
  /** Reserva do formatador: dia/mês/ano e hora LOCAIS (o recorte do ISO seria a hora de Greenwich). */
  function dataLocal(iso) {
    var d = new Date(iso);
    return dois(d.getDate()) + '/' + dois(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + dois(d.getHours()) + ':' + dois(d.getMinutes());
  }

  /** O diário que responde por UM item: o da coleção dele (Informativo, repercussão geral,
   *  repetitivos, súmulas), quando o pacote o traz; senão, o da fonte. Havendo o da coleção, o da
   *  fonte não serve: a fonte sai "falha" se QUALQUER coleção falhar (vale o pior resultado), e
   *  "parcial" move o último sucesso dela com uma coleção sem leitura. Informativo de antes das
   *  coleções não traz `colecao`: é a coleção Informativo (a régua do filtro da Central). */
  // Reserva do nome curto de cada coleção (o pacote traz `rotuloCurto`; é o NOVID_COLECAO do host).
  var COLECOES = { informativo: 'Informativo', rg: 'Repercussão geral', repetitivos: 'Repetitivos', sumulas: 'Súmulas' };

  function diarioDoItem(it, fontes) {
    var F = (fontes && typeof fontes === 'object') ? fontes : {};
    var fonte = (it && it.fonte) ? String(it.fonte) : '';
    var f = (fonte && F[fonte] && typeof F[fonte] === 'object') ? F[fonte] : null;
    if (!f) return { nivel: '', chave: fonte + '|', e: {}, quem: 'da fonte' };
    var col = (it.colecao ? String(it.colecao) : '') || (fonte !== 'planalto' ? 'informativo' : '');
    var C = (f.colecoes && typeof f.colecoes === 'object') ? f.colecoes : {};
    var c = (col && C[col] && typeof C[col] === 'object') ? C[col] : null;
    if (!c) return { nivel: 'fonte', chave: fonte + '|', e: f, quem: 'da fonte' };
    // A frase nomeia a coleção: a data é a DELA, não a da fonte, que o cartão da fonte mostra ao
    // lado com outro valor (uma coleção que falha deixa a fonte inteira "Falhou").
    var nome = String(c.rotuloCurto || COLECOES[col] || col) + ' (' + ((FONTES[fonte] && FONTES[fonte].nome) || fonte.toUpperCase()) + ')';
    return { nivel: 'colecao', chave: fonte + '|' + col, e: c, fonte: f, quem: 'da coleção ' + nome };
  }

  /** A falha do pedido INTEIRO à fonte, que nenhuma coleção registrou. O motor carimba toda coleção
   *  que roda com a data da fonte (no tempo esgotado, todas), então uma falha da fonte mais nova que
   *  o diário de TODAS as coleções é a deste aparelho (sem rede, servidor fora do ar), que o host
   *  grava só na fonte. Coleção que ficou fora de uma rodada filtrada não herda falha alheia: lá a
   *  coleção que rodou tem a data da fonte. Devolve o instante da falha, ou null. */
  function falhaDaFonteInteira(f) {
    var t = instante(f && f.ultimaTentativa);
    if (t === null || f.resultado !== 'falha') return null;
    var C = (f.colecoes && typeof f.colecoes === 'object') ? f.colecoes : {}, ids = Object.keys(C);
    for (var k = 0; k < ids.length; k++) {
      var x = instante(C[ids[k]] && C[ids[k]].ultimaTentativa);
      if (x !== null && x >= t) return null;
    }
    return t;
  }

  /** A última varredura que vale para UM item, sem tela (testada em Node):
   *  · sucessoEm — o último sucesso do diário (da coleção ou da fonte);
   *  · falhouDepois / falhaEm — a última tentativa é MAIS NOVA que esse sucesso e o diário a grava
   *    como falha (o motor só move o último sucesso quando a consulta dá certo); no item de
   *    coleção, vale também a falha do pedido inteiro à fonte (falhaDaFonteInteira);
   *  · semDado — o pacote não diz quando a fonte foi lida. Nunca vira "nunca": se o item existe,
   *    alguma leitura houve; o que falta é o registro dela;
   *  · parcial — esse sucesso foi a última tentativa e ela leu só em parte ('parcial' move o
   *    último sucesso com uma lacuna nomeada: no Planalto, uma norma que não se leu pode ser a do
   *    item); a frase diz "(leitura parcial)" em vez de passar por leitura inteira;
   *  · quem — de que diário é a data: "da fonte" ou "da coleção Súmulas (STF)". */
  function varreduraItem(it, fontes) {
    var d = diarioDoItem(it, fontes), e = d.e || {};
    var s = instante(e.ultimoSucesso), t = instante(e.ultimaTentativa);
    var falha = (t !== null && (s === null || t > s) && e.resultado === 'falha') ? t : null;
    var falhaIso = falha === null ? null : String(e.ultimaTentativa), tentIso = t === null ? null : String(e.ultimaTentativa);
    var tf = d.nivel === 'colecao' ? falhaDaFonteInteira(d.fonte) : null;
    if (tf !== null && (s === null || tf > s) && (falha === null || tf > falha)) {
      falha = tf; falhaIso = tentIso = String(d.fonte.ultimaTentativa);
    }
    return { nivel: d.nivel, chave: d.chave, quem: d.quem || 'da fonte',
      sucessoEm: s === null ? null : String(e.ultimoSucesso), tentativaEm: tentIso,
      parcial: s !== null && e.resultado === 'parcial' && (t === null || s >= t),
      falhouDepois: falha !== null, falhaEm: falhaIso, semDado: s === null && falha === null };
  }

  /** A frase da varredura. `fmt` é o formatador de quem mostra (a Central usa a data por extenso
   *  dos cartões de fonte); sem ele, a data curta com hora deste módulo (o painel e os satélites). */
  function varreduraTxt(v, fmt) {
    var f = function (iso) {
      var s = '';
      try { s = (typeof fmt === 'function') ? fmt(iso) : data(iso, true); } catch (e) { s = ''; }
      return s || dataLocal(iso);
    };
    var r = 'Última varredura ' + ((v && v.quem) || 'da fonte') + ': ';
    if (!v || (!v.sucessoEm && !v.falhouDepois)) return r + 'não informada';
    r += v.sucessoEm ? (f(v.sucessoEm) + (v.parcial ? ' (leitura parcial)' : '')) : 'nenhuma concluída';
    return v.falhouDepois ? (r + ' · última tentativa falhou em ' + f(v.falhaEm)) : r;
  }

  /** Conferida e ainda fora do acervo: a pessoa marcou "Conferido" e o motor não incorporou. A
   *  marca não incorpora nada (detecção e incorporação seguem separadas); só diz que alguém
   *  conferiu na fonte. "No acervo" já sai 'incorporado' do statusItem; incorporado com
   *  comparação parcial também fica fora, porque o acervo já o tem. Comparação parcial nunca
   *  conta, nem conferida: o motor não dá baixa em item parcial (mesclarNovidades), então o aviso
   *  ficaria aceso para sempre — ou até a pessoa desfazer a conferência para apagá-lo. */
  function aguardaAcervo(it, marcas) { return !!it && !it.parcial && !it.incorporado && statusItem(it, marcas) === 'conferido'; }
  /** Quantas há: o chip do Início, na MESMA régua do filtro da Central. */
  function conferidosAguardando(lista, marcas) {
    var n = 0;
    (Array.isArray(lista) ? lista : []).forEach(function (it) { if (aguardaAcervo(it, marcas)) n++; });
    return n;
  }

  root.CT_REVISAO_OFICIAL = {
    precisaRevisar: precisaRevisar,
    CHAVE: CHAVE, STATUS: STATUS, FONTES: FONTES, FRASE: 'Detecção automática, publicação assistida.',
    pacote: pacote, marcasDe: marcasDe, lerMarcas: lerMarcas, marcar: marcar, statusItem: statusItem,
    itens: itens, fontes: fontes, contagem: contagem, contarDe: contarDe, lacunas: lacunas, lacunasTxt: lacunasTxt, diff: diff, diffHtml: diffHtml, esc: esc, data: data,
    urlSegura: urlSegura, varreduraItem: varreduraItem, varreduraTxt: varreduraTxt, aguardaAcervo: aguardaAcervo, conferidosAguardando: conferidosAguardando
  };
})(typeof window !== 'undefined' ? window : this);
