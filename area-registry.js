/* area-registry.js — o que cada área de estudo REALMENTE oferece.
 *
 * POR QUE ISTO EXISTE
 * O app decidia o que mostrar com três guardas diferentes, criadas em momentos
 * diferentes e com alcances diferentes:
 *
 *     isJuridica    →  id === 'juridica'                        (a mais estrita)
 *     areaJuris     →  _area.juris                              (vale em 5 áreas)
 *     temAreaMod    →  _area.modulo !== ''                      (vale em 10)
 *
 * A mistura das três é o que produzia o vazamento: a guarda existia no MENU e nunca no
 * corpo da view, então "continuar de onde parei", um deep link ou window.__catedraGoView
 * reabriam a tela de peças processuais para quem estuda Enfermagem. E `CT_AREA(id)` caía
 * em CT_AREAS[0] quando não encontrava — isto é, "sem área" não era neutro: era Direito.
 *
 * Aqui a pergunta deixa de ser "que área é esta?" e passa a ser "esta área TEM esta
 * capacidade?". Quem responde é uma tabela, não um `if` espalhado por 13 mil linhas.
 *
 * REGRA DE HONESTIDADE
 * Uma capacidade só é `true` quando existe acervo de verdade para ela. Não se marca
 * `jurisprudencia: true` em Saúde porque "o JURIS abriria" — ele abriria vazio de
 * sentido, cheio de súmula do STJ. Sem acervo, a resposta certa é `false`, e a tela
 * some ou diz que está em preparação. É o oposto de fingir equivalência.
 */
(function (w) {
  'use strict';

  /* As capacidades. Cada uma corresponde a um acervo ou a um fluxo que existe no
     repositório — nenhuma é aspiracional. */
  var CAPACIDADES = [
    'fontesNormativas',      // CátedraLEGIS: texto de lei/norma/protocolo da área
    'jurisprudencia',        // CátedraJURIS: 15 mil verbetes de STF/STJ/TSE/tribunais de contas
    'moduloArea',            // o módulo de estudo próprio (area-modulos.js / ritos-web)
    'pecasERitos',           // roteiro de peça e sequência de atos do processo
    'segundaFase',           // prova discursiva de 2ª fase, com espelho oficial
    'redacaoDiscursiva',     // banco de discursivas + raio-X do espelho
    'provaOral',             // arguição em voz alta — o motor serve a qualquer fonte
    'provaOralBancas',       // o acervo do que as BANCAS jurídicas publicaram sobre a oral
    'prioridadeIncidencia',  // ranking por incidência em prova real (prioridade-dados.js)
    'bancoDeQuestoes',       // simulado cronometrado montado da lei seca da área
    'casosProprios',         // construtor de casos DA ÁREA, preenchidos pela pessoa
    'editalPorPesos',        // edital com peso e nº de questões por disciplina
    'catalogoDeBancas'       // concursos, bancas e o que cada uma cobra
  ];

  /* Prontidão da área, no sentido do guia: uma área só é "completa" quando tem plano,
     módulo próprio, uma modalidade de prática e fontes coerentes. As demais são
     honestas sobre o que ainda não têm — e a interface diz isso em vez de improvisar. */
  var COMPLETA = 'completa', PARCIAL = 'parcial';

  /* Base: o que TODA área tem, porque não depende de acervo jurídico nenhum —
     ciclo, revisões, calendário, metas, histórico, desempenho, busca e ajustes. */
  function base(extra) {
    var o = {};
    for (var i = 0; i < CAPACIDADES.length; i++) o[CAPACIDADES[i]] = false;
    o.editalPorPesos = true;      // o edital é a lista de disciplinas da pessoa, seja qual for
    o.catalogoDeBancas = true;    // o catálogo de concursos cobre todas as carreiras
    for (var k in (extra || {})) o[k] = extra[k];
    return o;
  }

  /* As cinco áreas de carreira jurídica. A diferença entre elas não é de capacidade —
     é de ênfase —, então compartilham o mesmo conjunto e divergem só onde há acervo
     próprio: peças, 2ª fase, oral e o ranking de incidência são de magistratura. */
  /* Uma correção de honestidade na outra direção. A primeira versão desta tabela dava
     bancoDeQuestoes e provaOral SÓ a magistratura, com o argumento de que o simulado
     "geraria prova de Direito". Ler o codigo desmentiu: treino.js:202 tem
     acervoLeisArea(area), escrito — e assim documentado — justamente para que "Simulado
     (itens de lei seca) e Prova oral (modo Lei seca) passem a oferecer a legislação da
     área escolhida". Fechar essas portas tornava aquela função código morto e tirava de
     policial, saúde e das demais um treino que já funcionava.
     Regra corrigida: quem tem FONTE NORMATIVA própria monta simulado dela e argui sobre
     ela. O que continua exclusivo é o ACERVO das bancas jurídicas (provaOralBancas). */
  function juridicaBase(extra) {
    return base(Object.assign({
      fontesNormativas: true,
      jurisprudencia: true,
      moduloArea: true,
      bancoDeQuestoes: true,
      provaOral: true
    }, extra || {}));
  }

  var AREAS = {
    juridica: {
      rotulo: 'Jurídica',
      prontidao: COMPLETA,
      capacidades: juridicaBase({
        pecasERitos: true, segundaFase: true, redacaoDiscursiva: true,
        provaOralBancas: true, prioridadeIncidencia: true
      }),
      // O vocabulário da área. A interface pede o termo por aqui em vez de cravá-lo.
      termos: { fonte: 'lei', fontePlural: 'leis', dispositivo: 'artigo', acervo: 'legislação', genero: 'f' }
    },

    /* Carreiras jurídicas não-magistratura: têm lei e jurisprudência, não têm o acervo
       de peças/espelhos/oral, que é de concurso de juiz. */
    policial: {
      rotulo: 'Policial', prontidao: COMPLETA,
      capacidades: juridicaBase({}),
      termos: { fonte: 'lei', fontePlural: 'leis', dispositivo: 'artigo', acervo: 'legislação', genero: 'f' }
    },
    fiscal: {
      rotulo: 'Fiscal e tributária', prontidao: COMPLETA,
      capacidades: juridicaBase({}),
      termos: { fonte: 'norma', fontePlural: 'normas', dispositivo: 'artigo', acervo: 'legislação tributária', genero: 'f' }
    },
    contas: {
      rotulo: 'Controle externo', prontidao: COMPLETA,
      capacidades: juridicaBase({}),
      termos: { fonte: 'norma', fontePlural: 'normas', dispositivo: 'artigo', acervo: 'legislação de controle', genero: 'f' }
    },
    administrativa: {
      rotulo: 'Administrativa', prontidao: COMPLETA,
      capacidades: juridicaBase({}),
      termos: { fonte: 'norma', fontePlural: 'normas', dispositivo: 'artigo', acervo: 'legislação', genero: 'f' }
    },

    /* Áreas não jurídicas. Têm módulo próprio e fontes próprias (AREA_LEGIS fixa os
       diplomas de cada uma no topo do CátedraLEGIS). NÃO têm jurisprudência: o acervo
       do JURIS é de tribunal, e oferecê-lo aqui seria vender equivalência falsa. */
    saude: {
      rotulo: 'Saúde e Medicina', prontidao: PARCIAL,
      capacidades: base({ fontesNormativas: true, moduloArea: true,
        bancoDeQuestoes: true, provaOral: true, casosProprios: true }),
      termos: { fonte: 'diretriz', fontePlural: 'diretrizes', dispositivo: 'item', acervo: 'diretrizes e protocolos', genero: 'f' },
      emPreparo: ['acervo editorial de casos e questões por especialidade']
    },
    social: {
      rotulo: 'Assistência Social', prontidao: PARCIAL,
      capacidades: base({ fontesNormativas: true, moduloArea: true,
        bancoDeQuestoes: true, provaOral: true, casosProprios: true }),
      termos: { fonte: 'norma', fontePlural: 'normas', dispositivo: 'artigo', acervo: 'legislação social', genero: 'f' },
      emPreparo: ['acervo editorial de casos', 'escrita técnica (relatório, parecer, estudo social)']
    },
    educacao: {
      rotulo: 'Educação', prontidao: PARCIAL,
      capacidades: base({ fontesNormativas: true, moduloArea: true,
        bancoDeQuestoes: true, provaOral: true }),
      termos: { fonte: 'documento normativo', fontePlural: 'documentos normativos', dispositivo: 'item', acervo: 'normas da educação', genero: 'm' },
      emPreparo: ['banco de questões próprio']
    },
    tecnologia: {
      rotulo: 'Tecnologia', prontidao: PARCIAL,
      capacidades: base({ fontesNormativas: true, moduloArea: true,
        bancoDeQuestoes: true, provaOral: true }),
      termos: { fonte: 'documentação', fontePlural: 'documentações', dispositivo: 'seção', acervo: 'documentação técnica', genero: 'f' },
      emPreparo: ['banco de questões próprio']
    },
    /* Militar tem módulo, mas não tem lista de diplomas em AREA_LEGIS — então o LEGIS
       abriria no catálogo jurídico geral, que não é dela. Fica sem fontesNormativas. */
    militar: {
      rotulo: 'Militar', prontidao: PARCIAL,
      capacidades: base({ moduloArea: true }),
      termos: { fonte: 'norma', fontePlural: 'normas', dispositivo: 'item', acervo: 'normas', genero: 'f' },
      emPreparo: ['fontes normativas da carreira', 'banco de questões próprio']
    },
    /* "Outra" não tem módulo nem fontes: é o caso em que a pessoa usa o Cátedra só pelo
       que é universal (ciclo, revisões, edital, metas). Dizer isso é melhor que fingir. */
    outra: {
      rotulo: 'Outra área', prontidao: PARCIAL,
      capacidades: base({}),
      termos: { fonte: 'material', fontePlural: 'materiais', dispositivo: 'trecho', acervo: 'seus materiais', genero: 'm' },
      emPreparo: ['módulo de estudo próprio', 'fontes normativas da carreira']
    }
  };

  /* Que view exige que capacidade. É esta tabela que o guarda de rota consulta —
     por isso a proteção passa a valer para o deep link e para o "continuar de onde
     parei", e não só para o botão do menu. */
  var VIEW_EXIGE = {
    legis: 'fontesNormativas',
    juris: 'jurisprudencia',
    areamod: 'moduloArea',
    roteiros: 'pecasERitos',
    segundafase: 'segundaFase',
    redacao: 'redacaoDiscursiva',
    oral: 'provaOral',
    prioridade: 'prioridadeIncidencia',
    simulados: 'bancoDeQuestoes',
    casos: 'casosProprios',
    edital: 'editalPorPesos',
    bancas: 'catalogoDeBancas'
  };

  function definicao(id) {
    return AREAS[id] || null;               // NÃO cai em jurídica: quem não existe, não existe
  }
  function tem(id, capacidade) {
    var d = definicao(id);
    if (!d) return false;                   // área desconhecida não libera nada
    return !!d.capacidades[capacidade];
  }
  /** A view pode abrir nesta área? View sem exigência declarada é universal. */
  function podeAbrir(id, view) {
    var exige = VIEW_EXIGE[view];
    if (!exige) return true;
    return tem(id, exige);
  }
  function termo(id, chave, reserva) {
    var d = definicao(id);
    return (d && d.termos && d.termos[chave]) || reserva || chave;
  }
  /** O que a área ainda não tem, em português, para a tela dizer sem inventar. */
  function emPreparo(id) {
    var d = definicao(id);
    return (d && d.emPreparo) ? d.emPreparo.slice() : [];
  }

  var api = {
    CAPACIDADES: CAPACIDADES, VIEW_EXIGE: VIEW_EXIGE, AREAS: AREAS,
    definicao: definicao, tem: tem, podeAbrir: podeAbrir, termo: termo, emPreparo: emPreparo
  };
  w.CT_AREA_REG = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
