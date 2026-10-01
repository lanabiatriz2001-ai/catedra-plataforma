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
    try { m = marcasDe(JSON.parse(root.localStorage.getItem(CHAVE) || '[]')); } catch (e) {}
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
      disp: it.disp || '', ramo: it.ramo || '', antes: it.antes || '', depois: it.depois || '',
      // Recorte: a vigência foi lida no trecho do artigo VIZINHO — o selo "Vigência futura"
      // contradiria a pendência ("o texto deste artigo não mudou").
      vigencia: it.vigencia || '', vigenciaEm: it.vigenciaEm || '', vigenciaFutura: !it.recorte && it.vigencia === 'aguardando',
      modificadora: it.modificadora || '', parcial: !!it.parcial, incorporado: !!it.incorporado, resumo: resumo,
      // "No acervo" não oferece marcar/manter: a marca 'lida' não o devolveria à revisão
      podeMarcar: st !== 'incorporado',
      detectadoEm: it.detectadoEm || '', quando: data(it.detectadoEm) || 'data não informada',
      urlOficial: it.urlOficial || '',
      busca: ehLegis ? [it.normaNome || it.norma, it.disp].filter(Boolean).join(' ') : (it.norma ? (it.norma + ' Informativo') : (it.titulo || ''))
    };
  }

  function itens(n, marcas) {
    var P = pacote(n), M = marcas || lerMarcas();
    return P.itens.map(function (it) { return item(it, M); });
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

  root.CT_REVISAO_OFICIAL = {
    precisaRevisar: precisaRevisar,
    CHAVE: CHAVE, STATUS: STATUS, FONTES: FONTES, FRASE: 'Detecção automática, publicação assistida.',
    pacote: pacote, marcasDe: marcasDe, lerMarcas: lerMarcas, marcar: marcar, statusItem: statusItem,
    itens: itens, fontes: fontes, contagem: contagem, contarDe: contarDe, lacunas: lacunas, lacunasTxt: lacunasTxt, diff: diff, diffHtml: diffHtml, esc: esc, data: data
  };
})(typeof window !== 'undefined' ? window : this);
