/* ==========================================================================
   redacao-motor.js — o miolo da correção de discursiva por IA (03/10/2026).

   POR QUE EXISTE, E SEPARADO: a correção por IA só merece confiança se o app
   CONFERIR o que a IA devolve. Antes, a nota final era a que o modelo "sentia",
   nada garantia que a nota de um quesito respeitava a escala da banca, e a
   evolução recebia quatro critérios genéricos no lugar dos quesitos. As regras
   moram aqui, puras e testáveis sem navegador:

     1. A ESCALA É DA BANCA. Máximo e degraus vêm do espelho lido pelo app; a
        nota que a IA dá a um quesito é encaixada no degrau permitido.
     2. A NOTA FINAL É SOMA. Quem soma é o app, não o modelo.
     3. TRECHO INVENTADO NÃO ENTRA. A citação da resposta só fica se existir
        literalmente no texto da pessoa.
     4. CORTE SE DIZ. Texto acima do limite é cortado, e o corte volta em
        `cortes` para a tela avisar — nunca calado.
     5. FALHA TEM NOME. Resposta fora da forma combinada devolve null, e o
        motivo da falha é classificado para a faixa dizer a verdade.

   Publica window.CT_REDACAO_MOTOR = { montarPrompt, interpretar, temTrecho,
   naEscala, motivoDaFalha, localizar, anotar, compararLeituras, MOTIVOS, LIMITES }.
   ========================================================================== */
(function () {
  var LIMITES = { resposta: 15000, enunciado: 8000, quesito: 500, gabarito: 12000 };
  var MOTIVOS = {
    'sem-ia':  'A IA não está disponível neste aparelho agora.',
    'recusou': 'Você não autorizou o envio do texto à IA.',
    'cota':    'As chamadas de IA de hoje acabaram.',
    'rede':    'Sem conexão com a IA no momento.',
    'tempo':   'A IA demorou mais de 90 segundos para responder.',
    'pausada': 'O acesso à IA desta conta está pausado.',
    'sessao':  'Entre na sua conta para usar a IA.',
    'invalida': 'A IA respondeu fora do formato da correção.',
    'erro':    'A IA não conseguiu corrigir desta vez.'
  };

  function num2(x) { return (Math.round((+x || 0) * 100) / 100).toFixed(2).replace('.', ','); }
  function lerNota(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
    return isFinite(n) ? n : 0;
  }
  function maxDe(q) { return q && q.max != null ? +q.max : 1; }

  /** A nota que RESPEITA a banca: degrau mais próximo da escala, ou o intervalo [0, máximo].
      No empate entre dois degraus vale o de BAIXO: na dúvida, a banca não dá o ponto. */
  function naEscala(valor, q) {
    var v = Math.max(0, lerNota(valor));
    if (q && q.escala && q.escala.length) {
      var esc = q.escala.slice().sort(function (a, b) { return a - b; });
      return esc.reduce(function (a, b) { return (Math.abs(b - v) < Math.abs(a - v) - 1e-9) ? b : a; });
    }
    return Math.min(Math.round(Math.min(v, maxDe(q)) * 100) / 100, maxDe(q));
  }
  /** Nota muito acima do máximo do quesito é sinal de que a IA usou outra régua (0 a 10): não é nota cheia. */
  function foraDaRegua(valor, q) { var max = maxDe(q); return lerNota(valor) > max * 1.5 + 0.05; }

  function achatar(t) { var x = String(t || ''); try { x = x.normalize('NFC'); } catch (_) {} return x.toLowerCase().replace(/\s+/g, ' ').trim(); }
  /** O trecho existe na resposta? Sem diferenciar caixa nem espaços; vazio nunca vale. */
  function temTrecho(resposta, trecho) {
    var t = limparTrecho(achatar(trecho));
    if (t.length < 4) return false;
    return achatar(resposta).indexOf(t) >= 0;
  }
  /** Tira o que a IA costuma pôr em volta da citação: aspas, reticências e o ponto final a mais. */
  function limparTrecho(t) {
    return String(t || '').trim().replace(/^["“”'«\s]*(…|\.\.\.)?\s*/, '').replace(/\s*(…|\.\.\.)?["“”'»\s]*$/, '').replace(/[.;,:]+$/, '').trim();
  }
  function trechoOuVazio(resposta, trecho) {
    var t = limparTrecho(trecho);
    return temTrecho(resposta, t) ? t.slice(0, 400) : '';
  }

  /* ---- Onde o trecho está NA RESPOSTA (fatia 3): para a tela marcar o texto da pessoa. ----
     A busca é a mesma do temTrecho (sem caixa, sem diferença de espaços), mas devolve as
     posições no texto original, para a marca cair sobre o que a pessoa escreveu de fato. */
  function nfc(t) { var x = String(t || ''); try { x = x.normalize('NFC'); } catch (_) {} return x; }
  function mapear(base) {
    var norm = '', idx = [], espaco = true;
    for (var i = 0; i < base.length; i++) {
      var ch = base.charAt(i);
      if (/\s/.test(ch)) { if (!espaco) { norm += ' '; idx.push(i); espaco = true; } }
      else { norm += (ch.toLowerCase().charAt(0) || ch); idx.push(i); espaco = false; }
    }
    return { norm: norm, idx: idx };
  }
  function localizarEm(base, mapa, trecho) {
    var t = limparTrecho(achatar(trecho));
    if (t.length < 4) return null;
    var p = mapa.norm.indexOf(t);
    if (p < 0) return null;
    return { ini: mapa.idx[p], fim: mapa.idx[p + t.length - 1] + 1 };
  }
  function localizar(resposta, trecho) { var base = nfc(resposta); return localizarEm(base, mapear(base), trecho); }
  /** Parte a resposta em segmentos: os marcados ({t, q, status}) e os lisos ({t}). Remontados, dão o
      texto original caractere a caractere. Trecho que não existe, ou que cai sobre outro já marcado, fica de fora. */
  function anotar(resposta, itens) {
    var base = nfc(resposta), mapa = mapear(base);
    var achados = (itens || []).map(function (it) {
      var pos = it && it.trecho ? localizarEm(base, mapa, it.trecho) : null;
      return pos ? { ini: pos.ini, fim: pos.fim, q: it.q, status: it.status || '' } : null;
    }).filter(Boolean).sort(function (a, b) { return a.ini - b.ini || a.q - b.q; });
    var segs = [], cursor = 0;
    achados.forEach(function (a) {
      if (a.ini < cursor) return;                       // sobreposto a uma marca anterior
      if (a.ini > cursor) segs.push({ t: base.slice(cursor, a.ini) });
      segs.push({ t: base.slice(a.ini, a.fim), q: a.q, status: a.status });
      cursor = a.fim;
    });
    if (cursor < base.length) segs.push({ t: base.slice(cursor) });
    return { texto: base, segs: segs };
  }

  function milhar(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function cortar(texto, limite, nome, cortes) {
    var t = String(texto || '').trim();
    if (t.length <= limite) return t;
    cortes.push(nome + ' passa de ' + milhar(limite) + ' caracteres: só o começo foi para a IA');
    return t.slice(0, limite);
  }

  function montarPrompt(d) {
    d = d || {};
    var cortes = [];
    var qs = d.quesitos || [];
    var resposta = cortar(d.resposta, LIMITES.resposta, 'a resposta', cortes);
    var respostaCortada = cortes.length > 0;
    var enun = cortar(d.enunciado, LIMITES.enunciado, 'o enunciado', cortes);
    var p = 'Você é corretor de provas discursivas de concursos públicos no Brasil. Corrija a RESPOSTA DO CANDIDATO '
      + 'contra o espelho, com o rigor de uma banca: fundamento exigido e não citado não pontua; não elogie; '
      + 'não invente trecho.\n';
    if (qs.length) {
      var quesitoCortado = false;
      var linhas = qs.map(function (q, i) {
        var txt = String(q.texto || '');
        if (txt.length > LIMITES.quesito) { quesitoCortado = true; txt = txt.slice(0, LIMITES.quesito); }
        var regua = (q.escala && q.escala.length)
          ? 'notas permitidas: ' + q.escala.map(num2).join(' / ')
          : 'nota de 0,00 até ' + num2(maxDe(q));
        return 'Q' + (i + 1) + ' — ' + txt + ' [' + regua + ']';
      });
      if (quesitoCortado) cortes.push('o espelho tem quesito com mais de ' + LIMITES.quesito + ' caracteres: só o começo dele foi para a IA');
      p += 'QUESITOS DO ESPELHO, na ordem da banca:\n' + linhas.join('\n') + '\n'
        + 'Para CADA quesito devolva: "i" (o número depois de Q), "nota" (só um valor permitido), "trecho" (citação '
        + 'LITERAL e curta da resposta que justifica a nota; "" se não há) e "faltou" (o que faltou para o valor cheio, '
        + 'com o dispositivo; "" se nada).\n';
    } else {
      var gab = cortar(d.gabarito, LIMITES.gabarito, 'o espelho', cortes);
      p += 'ESPELHO EM PROSA:\n"""\n' + gab + '\n"""\n'
        + 'Extraia de 4 a 8 PONTOS ESPERADOS do espelho. Para cada um devolva: "ponto", "status" ("coberto", "parcial" '
        + 'ou "faltou"), "trecho" (citação LITERAL e curta da resposta; "" se não há) e "faltou".\n';
    }
    p += 'Avalie também, FORA do espelho (não entra na nota): "portugues", "estrutura" e "extensao", cada um com '
      + '"nota" de 0 a 10 e "comentario" de uma frase. Dê as 3 "prioridades" para a próxima resposta e um "geral" de '
      + '2 a 3 frases, começando pelo que faltou.\n'
      + 'Devolva SOMENTE um JSON válido: {' + (qs.length
        ? '"quesitos":[{"i":1,"nota":0,"trecho":"","faltou":""}]'
        : '"pontos":[{"ponto":"","status":"coberto","trecho":"","faltou":""}]')
      + ',"forma":{"portugues":{"nota":0,"comentario":""},"estrutura":{"nota":0,"comentario":""},"extensao":{"nota":0,"comentario":""}},'
      + '"prioridades":["","",""],"geral":""}\n'
      + (enun ? 'ENUNCIADO:\n"""\n' + enun + '\n"""\n' : '')
      + (respostaCortada ? 'A RESPOSTA foi cortada no limite de envio: avalie só o trecho enviado e, no "faltou" de quesito que '
        + 'não aparece nele, diga que ele pode estar depois do corte.\n' : '')
      + 'RESPOSTA DO CANDIDATO:\n"""\n' + resposta + (respostaCortada ? '\n[… a resposta continua, mas foi cortada aqui]' : '') + '\n"""';
    return { prompt: p, cortes: cortes };
  }

  function lerForma(f) {
    var nomes = [['portugues', 'Português e norma culta'], ['estrutura', 'Estrutura e coesão'], ['extensao', 'Extensão']];
    return nomes.filter(function (par) { return f && f[par[0]] != null && f[par[0]] !== ''; }).map(function (par) {
      var v = f && f[par[0]];
      var nota = v && typeof v === 'object' ? lerNota(v.nota) : 0;
      var com = v && typeof v === 'object' ? String(v.comentario || '') : String(v || '');
      return { chave: par[0], nome: par[1], nota: Math.max(0, Math.min(10, Math.round(nota * 10) / 10)),
        comentario: com.slice(0, 400), foraDoEspelho: true };
    });
  }

  /** Confere a resposta da IA. Devolve o resultado conferido, ou null quando ela não serve. */
  function interpretar(json, ctx) {
    if (!json || typeof json !== 'object') return null;
    ctx = ctx || {};
    var qs = ctx.quesitos || [];
    var resposta = String(ctx.resposta || '');
    var base = {
      forma: lerForma(json.forma),
      prioridades: (Array.isArray(json.prioridades) ? json.prioridades : []).map(String)
        .map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 3),
      geral: String(json.geral || '').slice(0, 1200)
    };
    if (qs.length) {
      if (!Array.isArray(json.quesitos)) return null;
      var porI = {};
      var lerI = function (v) { var m = /\d+/.exec(String(v == null ? '' : v)); return m ? +m[0] : NaN; };
      var comI = json.quesitos.filter(function (x) { return x && !isNaN(lerI(x.i)); });
      if (!comI.length && json.quesitos.length === qs.length) {       // sem "i" nenhum e mesma quantidade: vale a posição
        json.quesitos.forEach(function (x, k) { if (x) porI[k + 1] = x; });
      } else {
        comI.forEach(function (x) { var k = lerI(x.i); if (porI[k] === undefined) porI[k] = x; });
      }
      var pulados = [], soma = 0, total = 0;
      var itens = qs.map(function (q, idx) {
        var x = porI[idx + 1], max = maxDe(q);
        total += max;
        if (!x || foraDaRegua(x.nota, q)) { pulados.push(idx); return { n: q.n, texto: q.texto, obtido: 0, pontos: max, trecho: '', faltou: '', estimado: true }; }
        var obtido = naEscala(x.nota, q);
        soma += obtido;
        return { n: q.n, texto: q.texto, obtido: obtido, pontos: max, trecho: trechoOuVazio(resposta, x.trecho),
          faltou: String(x.faltou || '').slice(0, 400), estimado: false };
      });
      if (pulados.length > qs.length / 2) return null;
      base.quesitos = itens; base.pontos = []; base.pulados = pulados;
      base.soma = Math.round(soma * 100) / 100; base.total = Math.round(total * 100) / 100;
      base.cobertura = total ? Math.round(soma / total * 100) : 0;
      base.nota = total ? Math.round(soma / total * 100) / 10 : 0;
      return base;
    }
    if (!Array.isArray(json.pontos)) return null;
    var pontos = json.pontos.filter(function (x) { return x && String(x.ponto || '').trim(); }).slice(0, 8).map(function (x) {
      var st = String(x.status || '').toLowerCase();
      var status = /parc|incompl/.test(st) ? 'parcial' : /n[ãa]o|falt|ausen/.test(st) ? 'faltou' : /cobert|contempl/.test(st) ? 'coberto' : 'faltou';
      return { ponto: String(x.ponto).trim().slice(0, 180), status: status, trecho: trechoOuVazio(resposta, x.trecho),
        faltou: String(x.faltou || '').slice(0, 400) };
    });
    if (pontos.length < 3) return null;      // um ponto coberto não pode valer nota 10
    var pts = pontos.reduce(function (a, x) { return a + (x.status === 'coberto' ? 1 : x.status === 'parcial' ? 0.5 : 0); }, 0);
    base.quesitos = []; base.pontos = pontos; base.pulados = [];
    base.cobertura = Math.round(pts / pontos.length * 100);
    base.nota = Math.round(base.cobertura) / 10;
    return base;
  }

  function motivoDaFalha(err) {
    if (err && err.ctMotivo && MOTIVOS[err.ctMotivo]) return err.ctMotivo;
    var m = String((err && err.message) || err || '');
    if (/chamadas de IA de hoje|\b429\b|\bcota\b/i.test(m)) return 'cota';
    if (/recus|consent|não autoriz/i.test(m)) return 'recusou';
    if (/foi pausado|está pausad|ia_pausada/i.test(m)) return 'pausada';
    if (/entre na sua conta|sess[ãa]o expirad/i.test(m)) return 'sessao';
    if (/failed to fetch|load failed|network|offline|sem conex|\brede\b/i.test(m)) return 'rede';
    return 'erro';
  }

  /* SEGUNDA LEITURA (25/11/2026): a pessoa conferiu no papel e depois digitou o que escreveu para a IA
     ler. Aqui só se compara: quesito a quesito, a nota que ela se deu contra a nota da IA.
     - Mesmo parser dos dois lados (_redQuesitos sobre o mesmo espelho); ainda assim, lista de tamanho ou
       máximo diferente não é comparada linha a linha (desalinhado) — sobra o total.
     - Quesito cuja régua da conferência tem um degrau só (opcoes com menos de 2 valores) não se compara:
       as duas leituras saem iguais à força ("sem-regua").
     - Quesito que a IA não avaliou ("sem-nota") não conta como divergência.
     - Com quesito sem nota ou sem régua, o total da IA não existe (notaIA e difNota null): somar zero
       rebaixaria, e somar a estimativa do corretor local poria na boca da IA uma nota que ela não deu.
     - A comparação usa a precisão da tela (2 casas), e o total da IA sai pela MESMA conta da
       conferência (soma das notas sem arredondar sobre o total arredondado): notas iguais dão total igual. */
  function compararLeituras(sua, ia) {
    var a = Array.isArray(sua && sua.quesitos) ? sua.quesitos : [];
    var b = Array.isArray(ia && ia.quesitos) ? ia.quesitos : [];
    var num = function (v) { var n = +v; return isFinite(n) ? n : 0; };
    var c2 = function (v) { return Math.round(num(v) * 100) / 100; };
    var notaIA = (ia && ia.nota != null && ia.nota !== '' && isFinite(+ia.nota)) ? Math.round(+ia.nota * 10) / 10 : null;
    var out = { notaSua: Math.round(num(sua && sua.nota) * 10) / 10, notaIA: notaIA,
      linhas: [], divergentes: 0, semNota: 0, semRegua: 0, avaliados: 0, desalinhado: false };
    out.difNota = notaIA == null ? null : Math.round((notaIA - out.notaSua) * 10) / 10;
    if (!a.length || !b.length) return out;
    var difMax = function (qa, i) { var qb = b[i] || {}; return qa.pontos != null && qb.pontos != null && Math.abs(num(qa.pontos) - num(qb.pontos)) > 0.005; };
    if (a.length !== b.length || a.some(difMax)) { out.desalinhado = true; return out; }
    var somaIA = 0, total = 0;
    out.linhas = a.map(function (qa, i) {
      var qb = b[i] || {}, s = c2(qa.obtido), n = c2(qb.obtido);
      var m = /(\d+)/.exec(String(qa.quesito || qb.quesito || ''));
      var umDegrau = Array.isArray(qa.opcoes) && qa.opcoes.length < 2, sem = !umDegrau && !!qb.estimado;
      var fora = umDegrau || sem;
      var d = umDegrau ? 'sem-regua' : sem ? 'sem-nota' : (n < s ? 'ia-menos' : (n > s ? 'ia-mais' : 'igual'));
      var dif = fora ? null : Math.round((n - s) * 100) / 100;
      if (umDegrau) out.semRegua++; else if (sem) out.semNota++; else if (dif !== 0) out.divergentes++;
      somaIA += num(qb.obtido); total += num(qa.pontos != null ? qa.pontos : qb.pontos);   // soma sem arredondar, como a conferência
      return { i: i + 1, n: m ? +m[1] : i + 1, sua: s, ia: fora ? null : n, max: num(qa.pontos != null ? qa.pontos : qb.pontos),
        dif: dif, d: d, trecho: fora ? '' : String(qb.trecho || ''), faltou: fora ? '' : String(qb.faltou || '') };
    });
    out.avaliados = out.linhas.length - out.semNota - out.semRegua;
    if (out.semNota || out.semRegua) { out.notaIA = null; out.difNota = null; }
    else {
      var t = Math.round(total * 100) / 100;
      out.notaIA = t ? Math.round(somaIA / t * 100) / 10 : 0;
      out.difNota = Math.round((out.notaIA - out.notaSua) * 10) / 10;
    }
    return out;
  }

  window.CT_REDACAO_MOTOR = { montarPrompt: montarPrompt, interpretar: interpretar, temTrecho: temTrecho,
    naEscala: naEscala, motivoDaFalha: motivoDaFalha, localizar: localizar, anotar: anotar, compararLeituras: compararLeituras,
    MOTIVOS: MOTIVOS, LIMITES: LIMITES };
})();
