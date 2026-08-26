/* casos.js — o construtor de casos de estudo, com estrutura PRÓPRIA de cada área.
 *
 * POR QUE ISTO EXISTE
 * A jornada vertical das áreas não jurídicas parava num ponto honesto: "em preparo, falta
 * acervo". Construir esse acervo é trabalho editorial (fonte, revisão, direito de uso), e
 * inventá-lo seria pior que não ter. Mas a plataforma não precisa do acervo para servir:
 * ela precisa da ESTRUTURA. Quem estuda Medicina discute caso clínico todo dia na
 * enfermaria; quem estuda Serviço Social atende caso no CRAS. O que falta é onde guardar
 * com forma, treinar em cima e revisar no tempo certo.
 *
 * O QUE ESTE ARQUIVO É E O QUE NÃO É
 * É o ESQUEMA de cada área — quais campos existem, em que ordem, o que cada um pede — e a
 * validação. Não traz conteúdo: nenhum caso vem pronto, nenhum texto é "adaptado" de outra
 * área. O caso é da pessoa.
 *
 * REGRA DURA: NADA IDENTIFICÁVEL.
 * Um caso clínico e um caso socioassistencial nascem de gente real. Guardar CPF, cartão do
 * SUS, telefone ou endereço aqui seria transformar um caderno de estudo num prontuário
 * clandestino. `acharIdentificaveis()` barra o que reconhece e diz o que fazer — e a
 * própria estrutura empurra para a forma certa: "homem, 54 anos" em vez de um nome.
 */
(function (w) {
  'use strict';

  /* ===== ESQUEMAS ==================================================================
     Um por área. A ordem dos campos é a ordem do raciocínio daquela profissão — não é a
     mesma, e é por isso que não dá para reaproveitar um formulário só. */

  var SAUDE = {
    id: 'saude',
    nome: 'Caso clínico',
    nomePlural: 'casos clínicos',
    verbo: 'Discutir o caso',
    resumo: 'A ordem é a do raciocínio clínico: o que se apresenta, o que se acha, o que se '
          + 'conclui, o que se faz e o que aconteceu depois.',
    campos: [
      { k: 'titulo', rot: 'Título do caso', tipo: 'linha', obrigatorio: true,
        dica: 'Um nome que você reconheça depois. Ex.: "Dispneia súbita em pós-operatório".' },
      { k: 'apresentacao', rot: 'Apresentação', tipo: 'texto', obrigatorio: true,
        dica: 'Quem chega e com o quê. Sexo, faixa etária, queixa e há quanto tempo — sem nome, '
            + 'sem número de prontuário, sem data de nascimento.' },
      { k: 'achados', rot: 'Achados', tipo: 'texto',
        dica: 'Exame físico, sinais vitais, exames complementares. O que você mediu ou viu.' },
      { k: 'avaliacao', rot: 'Avaliação', tipo: 'texto',
        dica: 'As hipóteses, e por que uma na frente da outra. É aqui que o raciocínio aparece.' },
      { k: 'conduta', rot: 'Conduta', tipo: 'texto',
        dica: 'O que foi feito, em que ordem e com que justificativa.' },
      { k: 'evolucao', rot: 'Evolução', tipo: 'texto',
        dica: 'O que aconteceu depois — inclusive quando não foi o esperado. O caso que corrige '
            + 'a hipótese é o que mais ensina.' },
      { k: 'fonte', rot: 'Fonte', tipo: 'linha',
        dica: 'Diretriz, protocolo, consenso ou aula em que você se apoiou. Sem fonte o caso vira '
            + 'memória, e memória não se confere depois.' }
    ]
  };

  var SOCIAL = {
    id: 'social',
    nome: 'Caso socioassistencial',
    nomePlural: 'casos socioassistenciais',
    verbo: 'Estudar o caso',
    resumo: 'A ordem é a do trabalho social: o território e a família, a demanda, a leitura '
          + 'técnica, o que se faz, com quem, e o acompanhamento.',
    campos: [
      { k: 'titulo', rot: 'Título do caso', tipo: 'linha', obrigatorio: true,
        dica: 'Um nome que você reconheça depois. Ex.: "Família em situação de despejo iminente".' },
      { k: 'contexto', rot: 'Contexto familiar e territorial', tipo: 'texto', obrigatorio: true,
        dica: 'Composição da família, condições de moradia, território e serviços por perto — '
            + 'sem nomes, endereço ou qualquer coisa que identifique alguém.' },
      { k: 'demanda', rot: 'Demanda', tipo: 'texto', obrigatorio: true,
        dica: 'O que chega ao serviço: demanda espontânea, busca ativa ou encaminhamento — e o que '
            + 'a família diz que precisa.' },
      { k: 'vulnerabilidade', rot: 'Vulnerabilidades e riscos', tipo: 'texto',
        dica: 'O que agrava e o que protege. Vulnerabilidade não é diagnóstico de pessoa: é leitura '
            + 'de situação.' },
      { k: 'avaliacao', rot: 'Avaliação técnica', tipo: 'texto',
        dica: 'A sua leitura profissional da situação, e em que ela se apoia.' },
      { k: 'intervencao', rot: 'Intervenção', tipo: 'texto',
        dica: 'O que foi proposto e feito — atendimento, orientação, acompanhamento, benefício.' },
      { k: 'rede', rot: 'Rede acionada', tipo: 'texto',
        dica: 'Quais serviços entraram: CRAS, CREAS, saúde, educação, conselho, sistema de justiça.' },
      { k: 'encaminhamentos', rot: 'Encaminhamentos', tipo: 'texto',
        dica: 'Para onde, com que fluxo e o que se esperava de retorno.' },
      { k: 'acompanhamento', rot: 'Acompanhamento', tipo: 'texto',
        dica: 'O que aconteceu depois, e por quanto tempo o caso seguiu em acompanhamento.' },
      { k: 'fundamento', rot: 'Fundamento', tipo: 'linha',
        dica: 'A norma, política ou orientação técnica que sustenta a conduta — LOAS, Tipificação, '
            + 'NOB-SUAS, código de ética, resolução.' }
    ]
  };

  var ESQUEMAS = { saude: SAUDE, social: SOCIAL };

  function esquema(areaId) { return ESQUEMAS[areaId] || null; }
  function temEsquema(areaId) { return !!ESQUEMAS[areaId]; }

  /* ===== O QUE NÃO PODE ENTRAR ======================================================
     Cada padrão aqui é um identificador direto. Nome próprio NÃO entra nesta lista: é
     impossível distinguir "Maria" de "doença de Crohn" sem errar muito, e um bloqueio que
     erra muito ensina a pessoa a ignorá-lo. Para nome, a estrutura orienta e o aviso
     lembra — o bloqueio fica para o que é inequívoco. */
  var REGRAS = [
    { k: 'cpf', rot: 'CPF', re: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/ },
    { k: 'cns', rot: 'cartão do SUS', re: /\b[12789]\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\b/ },
    { k: 'telefone', rot: 'telefone', re: /(\(\d{2}\)\s?|\b)\d{4,5}-?\d{4}\b/ },
    { k: 'email', rot: 'e-mail', re: /[\w.+-]+@[\w-]+\.[\w.]{2,}/ },
    { k: 'cep', rot: 'CEP', re: /\b\d{5}-?\d{3}\b/ },
    { k: 'rg', rot: 'RG', re: /\bRG\s*:?\s*[\d.\-xX]{5,}/i },
    { k: 'prontuario', rot: 'número de prontuário', re: /\b(prontu[áa]rio|matr[íi]cula|registro)\s*:?\s*n?[º°]?\s*\d{3,}/i },
    { k: 'nascimento', rot: 'data de nascimento', re: /\b(nasc(imento|ido em)?|dn)\s*:?\s*\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}/i },
    // o nome da via costuma ter preposição no meio ("Rua das Flores"): exigir maiúscula
    // logo depois de "Rua" deixava passar justamente o formato mais comum
    { k: 'endereco', rot: 'endereço', re: /\b(rua|avenida|av\.|travessa|alameda|estrada|rodovia)\s+(?:[\wÀ-ú.]+\s+){0,4}[\wÀ-ú]+\s*,?\s*n?[º°]?\s*\d{1,6}\b/i }
  ];

  /** Devolve a lista do que reconheceu, com o rótulo em português. Vazia = pode salvar. */
  function acharIdentificaveis(texto) {
    var t = String(texto == null ? '' : texto);
    var achados = [];
    for (var i = 0; i < REGRAS.length; i++) {
      var r = REGRAS[i];
      var m = t.match(r.re);
      if (m) achados.push({ tipo: r.k, rotulo: r.rot, trecho: String(m[0]).slice(0, 24) });
    }
    return achados;
  }

  /** O mesmo, sobre um caso inteiro — devolve também em qual campo está. */
  function auditar(caso, areaId) {
    var e = esquema(areaId);
    if (!e || !caso) return [];
    var out = [];
    e.campos.forEach(function (c) {
      acharIdentificaveis(caso[c.k]).forEach(function (a) {
        out.push({ campo: c.k, rotuloCampo: c.rot, tipo: a.tipo, rotulo: a.rotulo, trecho: a.trecho });
      });
    });
    // as perguntas também são texto livre
    (caso.perguntas || []).forEach(function (p, i) {
      acharIdentificaveis(p && p.q).forEach(function (a) {
        out.push({ campo: 'perguntas', rotuloCampo: 'Pergunta ' + (i + 1), tipo: a.tipo, rotulo: a.rotulo, trecho: a.trecho });
      });
      acharIdentificaveis(p && p.r).forEach(function (a) {
        out.push({ campo: 'perguntas', rotuloCampo: 'Resposta ' + (i + 1), tipo: a.tipo, rotulo: a.rotulo, trecho: a.trecho });
      });
    });
    return out;
  }

  /** O que falta para o caso poder ser salvo. */
  function faltando(caso, areaId) {
    var e = esquema(areaId);
    if (!e) return ['área sem esquema de caso'];
    var faltas = [];
    e.campos.forEach(function (c) {
      if (c.obrigatorio && !String((caso && caso[c.k]) || '').trim()) faltas.push(c.rot);
    });
    return faltas;
  }

  /** Um caso vazio, já com a forma da área. */
  function novo(areaId) {
    var e = esquema(areaId);
    if (!e) return null;
    var o = { id: 'c' + Math.abs(Date.now() % 1e9).toString(36) + Math.floor(Math.random() * 1e4).toString(36),
              up: 0, area: areaId, criado: 0, perguntas: [], treinos: [] };
    e.campos.forEach(function (c) { o[c.k] = ''; });
    return o;
  }

  /* ===== TREINO =====================================================================
     A ordem do esquema é a ordem em que o caso se revela. Você lê a apresentação, tenta
     responder, e só então vê o resto — que é como a discussão acontece na prática. */
  function passosDeTreino(caso, areaId) {
    var e = esquema(areaId);
    if (!e || !caso) return [];
    return e.campos
      .filter(function (c) { return String(caso[c.k] || '').trim(); })
      .map(function (c) { return { k: c.k, rot: c.rot, texto: String(caso[c.k]) }; });
  }

  /** Quantos casos, quantos já treinados, e o que ainda não foi. */
  function panorama(lista) {
    var l = Array.isArray(lista) ? lista : [];
    var treinados = l.filter(function (c) { return (c.treinos || []).length > 0; });
    return {
      total: l.length,
      treinados: treinados.length,
      nunca: l.length - treinados.length,
      ultimoTreino: treinados.reduce(function (a, c) {
        var t = (c.treinos || []).reduce(function (x, y) { return Math.max(x, y.ts || 0); }, 0);
        return Math.max(a, t);
      }, 0)
    };
  }

  var api = {
    ESQUEMAS: ESQUEMAS, REGRAS: REGRAS,
    esquema: esquema, temEsquema: temEsquema,
    acharIdentificaveis: acharIdentificaveis, auditar: auditar,
    faltando: faltando, novo: novo,
    passosDeTreino: passosDeTreino, panorama: panorama
  };
  w.CT_CASOS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
