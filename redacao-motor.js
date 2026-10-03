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
   naEscala, motivoDaFalha, MOTIVOS, LIMITES }.
   ========================================================================== */
(function () {
  var LIMITES = { resposta: 15000, enunciado: 8000, quesito: 500, gabarito: 12000 };
  var MOTIVOS = {
    'sem-ia':  'A IA não está disponível neste aparelho agora.',
    'recusou': 'Você não autorizou o envio do texto à IA.',
    'cota':    'As chamadas de IA de hoje acabaram.',
    'rede':    'Sem conexão com a IA no momento.',
    'tempo':   'A IA demorou mais de 90 segundos para responder.',
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

  /** A nota que RESPEITA a banca: degrau mais próximo da escala, ou o intervalo [0, máximo]. */
  function naEscala(valor, q) {
    var v = Math.max(0, lerNota(valor));
    if (q && q.escala && q.escala.length) {
      return q.escala.reduce(function (a, b) { return Math.abs(b - v) < Math.abs(a - v) ? b : a; });
    }
    return Math.round(Math.min(v, maxDe(q)) * 100) / 100;
  }

  function achatar(t) { return String(t || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  /** O trecho existe na resposta? Sem diferenciar caixa nem espaços; vazio nunca vale. */
  function temTrecho(resposta, trecho) {
    var t = achatar(trecho).replace(/^["“”'«]+|["“”'»]+$/g, '').replace(/…$|\.\.\.$/, '').trim();
    if (t.length < 4) return false;
    return achatar(resposta).indexOf(t) >= 0;
  }
  function trechoOuVazio(resposta, trecho) {
    var t = String(trecho || '').trim();
    return temTrecho(resposta, t) ? t.slice(0, 400) : '';
  }

  function cortar(texto, limite, nome, cortes) {
    var t = String(texto || '').trim();
    if (t.length <= limite) return t;
    cortes.push(nome + ' passa de ' + limite + ' caracteres: só o começo foi para a IA');
    return t.slice(0, limite);
  }

  function montarPrompt(d) {
    d = d || {};
    var cortes = [];
    var qs = d.quesitos || [];
    var resposta = cortar(d.resposta, LIMITES.resposta, 'a resposta', cortes);
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
      if (quesitoCortado) cortes.push('há quesito com mais de ' + LIMITES.quesito + ' caracteres: só o começo foi para a IA');
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
      + 'RESPOSTA DO CANDIDATO:\n"""\n' + resposta + '\n"""';
    return { prompt: p, cortes: cortes };
  }

  function lerForma(f) {
    var nomes = [['portugues', 'Português e norma culta'], ['estrutura', 'Estrutura e coesão'], ['extensao', 'Extensão']];
    return nomes.map(function (par) {
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
      json.quesitos.forEach(function (x) { if (x && x.i != null && porI[+x.i] === undefined) porI[+x.i] = x; });
      var pulados = [], soma = 0, total = 0;
      var itens = qs.map(function (q, idx) {
        var x = porI[idx + 1], max = maxDe(q);
        total += max;
        if (!x) { pulados.push(idx); return { n: q.n, texto: q.texto, obtido: 0, pontos: max, trecho: '', faltou: '', estimado: true }; }
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
      var status = /cobert|contempl/.test(st) ? 'coberto' : /parc|incompl/.test(st) ? 'parcial' : 'faltou';
      return { ponto: String(x.ponto).trim().slice(0, 180), status: status, trecho: trechoOuVazio(resposta, x.trecho),
        faltou: String(x.faltou || '').slice(0, 400) };
    });
    if (!pontos.length) return null;
    var pts = pontos.reduce(function (a, x) { return a + (x.status === 'coberto' ? 1 : x.status === 'parcial' ? 0.5 : 0); }, 0);
    base.quesitos = []; base.pontos = pontos; base.pulados = [];
    base.cobertura = Math.round(pts / pontos.length * 100);
    base.nota = Math.round(base.cobertura) / 10;
    return base;
  }

  function motivoDaFalha(err) {
    if (err && err.ctMotivo && MOTIVOS[err.ctMotivo]) return err.ctMotivo;
    var m = String((err && err.message) || err || '');
    if (/chamadas de IA de hoje|\b429\b|cota/i.test(m)) return 'cota';
    if (/recus|consent|não autoriz/i.test(m)) return 'recusou';
    if (/failed to fetch|load failed|network|offline|sem conex|rede/i.test(m)) return 'rede';
    return 'erro';
  }

  window.CT_REDACAO_MOTOR = { montarPrompt: montarPrompt, interpretar: interpretar, temTrecho: temTrecho,
    naEscala: naEscala, motivoDaFalha: motivoDaFalha, MOTIVOS: MOTIVOS, LIMITES: LIMITES };
})();
