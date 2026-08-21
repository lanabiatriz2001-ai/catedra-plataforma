/* Cátedra — FLUXOS DOS RITOS PROCESSUAIS.
 *
 * ritos.js é a LISTA dos atos, na ordem. Este arquivo é o FLUXOGRAMA: o mesmo
 * caminho, mas com os pontos em que o processo se bifurca — o juízo de
 * admissibilidade que pode receber, não receber ou rejeitar, e o recurso que
 * cabe de cada saída. É a leitura que a prova cobra: não "quais atos existem",
 * e sim "o que acontece se".
 *
 * Formato de cada passo:
 *   { k, t, art, sub, nota, notaLado, saidas:[], peca, juris:[] }
 *     k      inicio | ato | decisao | prazo | recurso | terminal
 *     t      rótulo curto da caixa
 *     art    dispositivo que rege o ato — vira botão para o CátedraLEGIS
 *     sub    linha de detalhe dentro da caixa
 *     nota   observação lateral, no estilo "chave" do fluxograma de papel
 *     saidas ramificações: { rot (o rótulo da seta), lado: 'esq'|'dir', k, t, art }
 *     peca   nome da peça em pecas.js — vira botão que abre o roteiro
 *
 * Rito sem fluxo escrito aqui é derivado automaticamente de ritos.js pela
 * própria página: os atos viram a espinha e os desvios viram saídas laterais.
 * Escrito a partir da lei. Confira antes de levar para a prova.
 */
window.CT_FLUXOS = {

/* ══════════════════════ PENAL — PROCEDIMENTO SUMÁRIO ══════════════════════ */
'Penal — procedimento sumário': {
  ramo: 'Penal',
  fonte: 'CPP, art. 394, § 1º, II',
  resumo: 'Crime cuja pena máxima é inferior a 4 anos. Mesmo esqueleto do ordinário, com três cortes: 5 testemunhas por parte, audiência una em até 30 dias e debates orais de 20 minutos.',
  passos: [
    { k:'inicio', t:'RITO SUMÁRIO', sub:'pena máxima inferior a 4 anos', art:'CPP, art. 394, § 1º, II' },

    { k:'ato', t:'Oferecimento da denúncia ou queixa', art:'CPP, arts. 41 e 46',
      nota:'Queixa: legitimidade no CPP, art. 30; ação penal privada no CP, art. 100, § 2º. Prazo decadencial de 6 meses — CP, art. 103 e CPP, art. 38.',
      peca:'Denúncia' },

    { k:'decisao', t:'Juízo de admissibilidade', art:'CPP, arts. 395 e 396',
      saidas:[
        { lado:'esq', rot:'rejeita', k:'recurso', t:'RESE',
          sub:'da rejeição da denúncia ou queixa', art:'CPP, art. 581, I' },
        { lado:'dir', rot:'recebe', k:'ato', t:'Prossegue',
          sub:'não há recurso do recebimento', art:'CPP, art. 396, caput' }
      ],
      nota:'Rejeita quando faltar pressuposto, condição da ação ou justa causa (CPP, art. 395). Falta de justa causa manifesta comporta habeas corpus — CPP, art. 648, I.' },

    { k:'ato', t:'Citação do acusado', art:'CPP, art. 396, caput',
      sub:'para responder por escrito em 10 dias',
      nota:'Pessoal — CPP, art. 351. Por hora certa — CPP, art. 362. Por edital — CPP, art. 361; réu citado por edital que não comparece nem constitui advogado: suspende-se processo e prescrição (CPP, art. 366).' },

    { k:'prazo', t:'Resposta à acusação — 10 dias', art:'CPP, art. 396-A',
      sub:'obrigatória; se não vier, o juiz nomeia defensor (§ 2º)',
      nota:'Nela a defesa argui preliminares, alega tudo que interesse à defesa, junta documentos, especifica provas e arrola até 5 testemunhas.',
      peca:'Resposta à acusação' },

    { k:'decisao', t:'Absolvição sumária?', art:'CPP, art. 397',
      saidas:[
        { lado:'esq', rot:'sim', k:'terminal', t:'Absolvição sumária',
          sub:'excludente de ilicitude; excludente de culpabilidade, salvo inimputabilidade; fato atípico; punibilidade extinta',
          art:'CPP, art. 397, I a IV' },
        { lado:'dir', rot:'não', k:'ato', t:'Designa audiência',
          sub:'una, em até 30 dias', art:'CPP, art. 531' }
      ],
      nota:'A inimputabilidade do art. 26, caput, do CP não gera absolvição sumária aqui: o processo segue, porque pode resultar em absolvição imprópria com medida de segurança.' },

    { k:'ato', t:'Audiência una de instrução e julgamento', art:'CPP, art. 531',
      sub:'em até 30 dias — concentração dos atos',
      nota:'No sumário não há a fase do art. 402 (requerimento de diligências) nem a do art. 404. O rito é comprimido: instrução, debates e sentença na mesma assentada.' },

    { k:'ato', t:'Ordem dos atos na audiência', art:'CPP, arts. 400 e 531',
      sub:'1. ofendido · 2. testemunhas de acusação · 3. testemunhas de defesa · 4. esclarecimentos dos peritos · 5. acareações e reconhecimento · 6. interrogatório',
      nota:'A ordem é imperativa. Interrogatório por último é garantia da ampla defesa — inverter gera nulidade se demonstrado prejuízo.' },

    { k:'ato', t:'Até 5 testemunhas por parte', art:'CPP, art. 532',
      nota:'No ordinário são 8 (CPP, art. 401). Não entram na conta as que não prestam compromisso e as referidas — CPP, art. 401, § 1º.' },

    { k:'ato', t:'Debates orais — 20 minutos, prorrogáveis por mais 10', art:'CPP, arts. 534 e 403',
      sub:'assistente fala por 10 minutos, com acréscimo igual à defesa',
      nota:'No sumário não cabe conversão em memoriais pelo art. 403, § 3º — a lei previu debates orais e sentença em audiência.' },

    { k:'decisao', t:'Emendatio ou mutatio?', art:'CPP, arts. 383 e 384',
      saidas:[
        { lado:'esq', rot:'mesmo fato', k:'ato', t:'Emendatio libelli',
          sub:'o juiz corrige a capitulação, ainda que para pena mais grave',
          art:'CPP, art. 383' },
        { lado:'dir', rot:'fato novo', k:'ato', t:'Mutatio libelli',
          sub:'o MP adita em 5 dias; defesa se manifesta em 5 dias',
          art:'CPP, art. 384' }
      ],
      nota:'O réu se defende dos FATOS, não da capitulação. Mutatio sem aditamento é nulidade; e não cabe mutatio em segundo grau — Súmula 453 do STF.' },

    { k:'ato', t:'Sentença em audiência', art:'CPP, arts. 381 e 387',
      sub:'requisitos do art. 381; condenação segue o art. 387',
      peca:'Sentença penal — treino guiado' },

    { k:'decisao', t:'Resultado', art:'CPP, arts. 386 e 387',
      saidas:[
        { lado:'esq', rot:'absolve', k:'terminal', t:'Sentença absolutória',
          sub:'incisos do art. 386; soltura imediata e revogação das cautelares',
          art:'CPP, art. 386 e parágrafo único' },
        { lado:'dir', rot:'condena', k:'terminal', t:'Sentença condenatória',
          sub:'dosimetria, regime, substituição, detração e recorrer em liberdade',
          art:'CPP, art. 387, §§ 1º e 2º' }
      ] },

    { k:'recurso', t:'Apelação — 5 dias para interpor, 8 para arrazoar', art:'CPP, arts. 593, I, e 600',
      nota:'Embargos de declaração em 2 dias — CPP, art. 382. Da sentença do Juizado, recurso inominado em 10 dias — Lei 9.099/95, art. 82.' }
  ]
},

/* ═════════════════ PENAL — PROCEDIMENTO COMUM ORDINÁRIO ═════════════════ */
'Penal — procedimento comum': {
  ramo: 'Penal',
  fonte: 'CPP, art. 394, § 1º, I',
  resumo: 'Crime cuja pena máxima é igual ou superior a 4 anos. É o rito-matriz: aplica-se subsidiariamente aos procedimentos especiais no que não colidirem (CPP, art. 394, §§ 2º e 5º).',
  passos: [
    { k:'inicio', t:'RITO ORDINÁRIO', sub:'pena máxima igual ou superior a 4 anos', art:'CPP, art. 394, § 1º, I' },

    { k:'ato', t:'Oferecimento da denúncia ou queixa', art:'CPP, arts. 41 e 46',
      sub:'prazo: 5 dias com réu preso, 15 dias solto',
      peca:'Denúncia' },

    { k:'decisao', t:'Juízo de admissibilidade', art:'CPP, arts. 395 e 396',
      saidas:[
        { lado:'esq', rot:'rejeita', k:'recurso', t:'RESE', art:'CPP, art. 581, I' },
        { lado:'dir', rot:'recebe', k:'ato', t:'Prossegue', art:'CPP, art. 396, caput' }
      ],
      nota:'Na Lei de Drogas a defesa prévia vem ANTES do recebimento — Lei 11.343/06, art. 55. Nos crimes funcionais afiançáveis, defesa preliminar do CPP, art. 514.' },

    { k:'ato', t:'Citação e resposta à acusação — 10 dias', art:'CPP, arts. 396 e 396-A',
      peca:'Resposta à acusação' },

    { k:'decisao', t:'Absolvição sumária?', art:'CPP, art. 397',
      saidas:[
        { lado:'esq', rot:'sim', k:'terminal', t:'Absolvição sumária', art:'CPP, art. 397, I a IV' },
        { lado:'dir', rot:'não', k:'ato', t:'Audiência em até 60 dias', art:'CPP, art. 400' }
      ] },

    { k:'ato', t:'Audiência una de instrução e julgamento', art:'CPP, art. 400',
      sub:'ofendido · testemunhas de acusação · testemunhas de defesa · peritos · acareações e reconhecimento · interrogatório' },

    { k:'ato', t:'Até 8 testemunhas por parte', art:'CPP, art. 401',
      nota:'Não se computam as que não prestem compromisso e as referidas — art. 401, § 1º.' },

    { k:'decisao', t:'Diligências do art. 402?', art:'CPP, art. 402',
      saidas:[
        { lado:'esq', rot:'deferidas', k:'ato', t:'Realização das diligências',
          sub:'depois, memoriais em 5 dias e sentença em 10', art:'CPP, art. 404, parágrafo único' },
        { lado:'dir', rot:'não há', k:'ato', t:'Debates orais',
          sub:'20 minutos, prorrogáveis por mais 10', art:'CPP, art. 403' }
      ],
      nota:'A complexidade do caso ou o número de acusados permite converter os debates em memoriais escritos, em 5 dias — CPP, art. 403, § 3º.' },

    { k:'ato', t:'Sentença', art:'CPP, arts. 381, 386 e 387',
      peca:'Sentença penal — treino guiado' },

    { k:'recurso', t:'Apelação — 5 dias', art:'CPP, arts. 593, I, e 600' }
  ]
},

/* ══════════════════════ CIVIL — PROCEDIMENTO COMUM ══════════════════════ */
'Civil — conhecimento': {
  ramo: 'Civil',
  fonte: 'CPC, arts. 318 e seguintes',
  resumo: 'O procedimento comum aplica-se a todas as causas, salvo disposição em contrário, e supre subsidiariamente os procedimentos especiais e o processo de execução (CPC, art. 318 e parágrafo único).',
  passos: [
    { k:'inicio', t:'PROCEDIMENTO COMUM', art:'CPC, art. 318' },

    { k:'ato', t:'Petição inicial', art:'CPC, arts. 319 e 320',
      sub:'requisitos do art. 319; documentos indispensáveis no art. 320',
      peca:'Petição inicial' },

    { k:'decisao', t:'Exame da inicial', art:'CPC, arts. 321 e 330',
      saidas:[
        { lado:'esq', rot:'sanável', k:'prazo', t:'Emenda em 15 dias',
          sub:'não emendada, indefere-se', art:'CPC, art. 321 e parágrafo único' },
        { lado:'dir', rot:'indefere', k:'recurso', t:'Apelação',
          sub:'juízo de retratação em 5 dias', art:'CPC, art. 331' }
      ],
      nota:'Improcedência liminar do pedido (CPC, art. 332) é julgamento de mérito sem citar o réu — só nas hipóteses taxativas dos incisos e na prescrição/decadência do § 1º.' },

    { k:'decisao', t:'Tutela provisória?', art:'CPC, arts. 294 e 300',
      saidas:[
        { lado:'esq', rot:'urgência', k:'ato', t:'Antecipada ou cautelar',
          sub:'probabilidade do direito + perigo de dano', art:'CPC, art. 300' },
        { lado:'dir', rot:'evidência', k:'ato', t:'Tutela de evidência',
          sub:'dispensa o perigo', art:'CPC, art. 311' }
      ],
      peca:'Decisão da tutela',
      nota:'Da decisão sobre tutela provisória cabe agravo de instrumento — CPC, art. 1.015, I. Concedida em caráter antecedente e não recorrida, estabiliza-se (art. 304).' },

    { k:'ato', t:'Citação e audiência de conciliação ou mediação', art:'CPC, art. 334',
      sub:'com pelo menos 30 dias de antecedência; réu citado com 20 dias de antecedência',
      nota:'Só não se realiza se AMBAS as partes manifestarem desinteresse (§ 4º, I) ou se o direito não admitir autocomposição. O não comparecimento injustificado é ato atentatório à dignidade da justiça, com multa de até 2% (§ 8º).' },

    { k:'prazo', t:'Contestação — 15 dias', art:'CPC, arts. 335 e 336',
      sub:'ônus da impugnação especificada; preliminares do art. 337',
      peca:'Contestação',
      nota:'Termo inicial varia conforme o art. 335, I a III. Reconvenção é apresentada na própria contestação — art. 343.' },

    { k:'decisao', t:'Réu contestou?', art:'CPC, arts. 344 e 345',
      saidas:[
        { lado:'esq', rot:'não', k:'ato', t:'Revelia',
          sub:'presunção relativa de veracidade; exceções no art. 345', art:'CPC, art. 344' },
        { lado:'dir', rot:'sim', k:'ato', t:'Providências preliminares',
          sub:'réplica em 15 dias se houver preliminar ou fato impeditivo', art:'CPC, arts. 350 e 351' }
      ] },

    { k:'decisao', t:'Julgamento conforme o estado do processo', art:'CPC, arts. 354 a 357',
      saidas:[
        { lado:'esq', rot:'extinção', k:'terminal', t:'Sentença sem mérito',
          sub:'hipóteses do art. 485', art:'CPC, art. 354' },
        { lado:'dir', rot:'madura', k:'terminal', t:'Julgamento antecipado',
          sub:'total (art. 355) ou parcial do mérito (art. 356)', art:'CPC, arts. 355 e 356' }
      ],
      nota:'Do julgamento antecipado PARCIAL do mérito cabe agravo de instrumento — art. 356, § 5º.' },

    { k:'ato', t:'Decisão de saneamento e organização', art:'CPC, art. 357',
      sub:'resolve as questões processuais, delimita fato e direito, distribui o ônus da prova e fixa os meios de prova',
      peca:'Decisão saneadora',
      nota:'Estabiliza-se em 5 dias se ninguém pedir esclarecimento ou ajuste (§ 1º). Causa complexa pede saneamento em cooperação, em audiência (§ 3º).' },

    { k:'ato', t:'Instrução', art:'CPC, arts. 369 a 484',
      sub:'audiência: conciliação · perito · depoimento pessoal · testemunhas do autor · testemunhas do réu',
      art2:'CPC, art. 361' },

    { k:'ato', t:'Alegações finais', art:'CPC, art. 364',
      sub:'orais em 20 minutos, prorrogáveis por 10; ou memoriais em 15 dias, se a causa for complexa' },

    { k:'ato', t:'Sentença', art:'CPC, arts. 489 e 490',
      sub:'relatório, fundamentação e dispositivo; congruência nos arts. 141 e 492',
      peca:'Sentença — treino guiado' },

    { k:'recurso', t:'Apelação — 15 dias', art:'CPC, arts. 1.009 e 1.003, § 5º',
      nota:'Efeito suspensivo é a regra (art. 1.012); as exceções do § 1º saem com eficácia imediata. Embargos de declaração em 5 dias — art. 1.023.' }
  ]
},
/* ══════════════════════ PENAL — TRIBUNAL DO JÚRI ══════════════════════ */
'Penal — tribunal do júri': {
  ramo: 'Penal',
  fonte: 'CPP, arts. 406 a 497',
  resumo: 'Procedimento bifásico. A primeira fase (judicium accusationis) termina com uma de quatro decisões, e cada uma tem recurso próprio — é o ponto que a prova mais cobra. A segunda (judicium causae) é o plenário.',
  passos: [
    { k:'inicio', t:'RITO DO JÚRI', sub:'crimes dolosos contra a vida, consumados ou tentados', art:'CF, art. 5º, XXXVIII, "d"' },
    { k:'ato', t:'Denúncia e resposta em 10 dias', art:'CPP, art. 406',
      sub:'até 8 testemunhas para cada parte', peca:'Denúncia',
      nota:'Aqui a resposta é do art. 406, § 3º, não a do art. 396-A. A lógica é a mesma, mas o dispositivo é outro e a banca troca de propósito.' },
    { k:'ato', t:'Audiência de instrução', art:'CPP, art. 411',
      sub:'ofendido, testemunhas, esclarecimentos dos peritos, acareações, interrogatório e debates orais de 20 minutos' },
    { k:'decisao', t:'Decisão de primeira fase', art:'CPP, arts. 413 a 419',
      saidas:[
        { lado:'esq', rot:'pronuncia', k:'ato', t:'Pronúncia',
          sub:'materialidade + indícios suficientes de autoria · recurso: RESE',
          art:'CPP, arts. 413 e 581, IV' },
        { lado:'dir', rot:'impronuncia', k:'terminal', t:'Impronúncia',
          sub:'não há prova da materialidade ou indícios · recurso: apelação',
          art:'CPP, arts. 414 e 416' }
      ],
      peca:'Decisão de pronúncia',
      nota:'Na pronúncia vale o in dubio pro societate como critério de juízo de admissibilidade — não é condenação. Linguagem comedida: excesso de convencimento é eloquência acusatória e gera nulidade.' },
    { k:'decisao', t:'As outras duas saídas', art:'CPP, arts. 415 e 419',
      saidas:[
        { lado:'esq', rot:'absolve', k:'terminal', t:'Absolvição sumária',
          sub:'atipicidade, excludente, inimputabilidade como única tese · recurso: apelação',
          art:'CPP, arts. 415 e 416' },
        { lado:'dir', rot:'desclassifica', k:'ato', t:'Desclassificação',
          sub:'crime não é doloso contra a vida · remessa ao juízo competente · recurso: RESE',
          art:'CPP, arts. 419 e 581, II' }
      ],
      nota:'Guarde o par: pronúncia e desclassificação, RESE; impronúncia e absolvição sumária, apelação. Impronunciado pode ser processado de novo se surgir prova nova, enquanto não extinta a punibilidade (art. 414, parágrafo único).' },
    { k:'ato', t:'Preclusão da pronúncia e preparação do plenário', art:'CPP, arts. 421 e 422',
      sub:'as partes arrolam até 5 testemunhas e requerem diligências',
      nota:'Depois da preclusão, só se admite circunstância superveniente que altere a classificação (art. 421, § 1º).' },
    { k:'decisao', t:'Desaforamento?', art:'CPP, arts. 427 e 428',
      saidas:[
        { lado:'dir', rot:'sim', k:'ato', t:'Julgamento em outra comarca',
          sub:'interesse da ordem pública, dúvida sobre a imparcialidade do júri ou risco à segurança',
          art:'CPP, art. 427' }
      ],
      nota:'O desaforamento é decidido pelo tribunal, ouvida a defesa — Súmula 712 do STF. Não cabe antes do trânsito da pronúncia.' },
    { k:'ato', t:'Sessão de julgamento', art:'CPP, arts. 447 a 452',
      sub:'25 jurados convocados, 15 presentes para instalar, 7 sorteados para o conselho',
      nota:'Cada parte pode recusar até 3 jurados sem motivar (recusa peremptória, art. 468). Havendo mais de um réu e recusas que impeçam formar o conselho, o julgamento é separado (art. 469, § 1º).' },
    { k:'ato', t:'Instrução em plenário e debates', art:'CPP, arts. 473 a 481',
      sub:'acusação 1h30, defesa 1h30, réplica e tréplica de 1h',
      nota:'É vedado às partes referir-se à decisão de pronúncia como argumento de autoridade (art. 478, I) e ao silêncio do réu em seu prejuízo (art. 478, II).' },
    { k:'ato', t:'Quesitação', art:'CPP, arts. 482 a 491',
      sub:'materialidade · autoria · quesito genérico de absolvição · causas de diminuição · qualificadoras e causas de aumento',
      nota:'Basta maioria: apurados mais de 3 votos num sentido, a votação daquele quesito se encerra, para preservar o sigilo (art. 483, §§ 1º e 2º).' },
    { k:'ato', t:'Sentença lida em plenário', art:'CPP, arts. 492 e 493',
      peca:'Sentença do júri',
      nota:'Execução imediata da condenação, independentemente do total da pena — STF, RE 1.235.340, Tema 1068, j. 12/09/2024.' },
    { k:'recurso', t:'Apelação — hipóteses fechadas', art:'CPP, art. 593, III, "a" a "d"',
      sub:'nulidade posterior à pronúncia · sentença contrária à lei ou à decisão dos jurados · erro na aplicação da pena · decisão manifestamente contrária à prova',
      nota:'Cabe apelação contra absolvição pelo quesito genérico, mas o tribunal não determina novo júri quando houve tese de clemência registrada em ata e acolhida — STF, ARE 1.225.185, Tema 1087, 04/10/2024.' }
  ]
},

/* ══════════════════════ PENAL — EXECUÇÃO PENAL ══════════════════════ */
'Penal — execução penal': {
  ramo: 'Penal',
  fonte: 'Lei 7.210/84 (LEP)',
  resumo: 'A execução é jurisdicionalizada: cada benefício é um incidente com contraditório, decisão fundamentada e recurso próprio. O agravo em execução é o recurso de tudo, sem efeito suspensivo.',
  passos: [
    { k:'inicio', t:'EXECUÇÃO PENAL', sub:'guia de recolhimento expedida', art:'LEP, arts. 105 e 106' },
    { k:'ato', t:'Juízo da execução', art:'LEP, arts. 65 e 66',
      sub:'competência para aplicar a lei mais benigna, somar penas, decidir benefícios e incidentes' },
    { k:'decisao', t:'Progressão de regime', art:'LEP, art. 112',
      saidas:[
        { lado:'esq', rot:'preenche', k:'ato', t:'Progride',
          sub:'percentual cumprido + boa conduta carcerária atestada',
          art:'LEP, art. 112, I a VIII' },
        { lado:'dir', rot:'não preenche', k:'ato', t:'Indefere',
          sub:'decisão fundamentada; renova-se quando implementado o requisito',
          art:'LEP, art. 112, § 2º' }
      ],
      nota:'A Lei 14.843/2024 acrescentou a exigência de exame criminológico ao art. 112. O STJ vem afastando a aplicação retroativa por ser novatio legis in pejus (RHC 200.670, 6ª Turma); para fatos anteriores continua valendo a Súmula 439 do STJ — exame só por decisão motivada.' },
    { k:'ato', t:'Vedações e regras da progressão', art:'LEP, art. 112 e Súmulas',
      sub:'progressão per saltum é vedada; regime não pode ser cumprido em condição mais gravosa por falta de vaga',
      nota:'Súmula 491 do STJ: é inadmissível a chamada progressão per saltum. Súmula Vinculante 56: falta de estabelecimento adequado não autoriza manter o condenado em regime mais gravoso.' },
    { k:'ato', t:'Remição', art:'LEP, arts. 126 a 129',
      sub:'3 dias de trabalho = 1 dia de pena · 12 horas de estudo em 3 dias = 1 dia',
      nota:'Súmula 341 do STJ: a frequência a curso de ensino formal é causa de remição. A remição pela leitura é admitida com base na Recomendação 44/2013 do CNJ.' },
    { k:'decisao', t:'Falta grave', art:'LEP, arts. 50 a 52',
      saidas:[
        { lado:'esq', rot:'reconhecida', k:'ato', t:'Efeitos',
          sub:'regressão, perda de até 1/3 dos dias remidos e nova data-base para a progressão',
          art:'LEP, arts. 118, 127 e 57' },
        { lado:'dir', rot:'afastada', k:'ato', t:'Arquiva o incidente' }
      ],
      nota:'Súmula 533 do STJ: o reconhecimento da falta grave exige procedimento administrativo disciplinar com defesa técnica por advogado ou defensor. Súmula 534: interrompe o prazo da progressão. Súmula 535: NÃO interrompe o do livramento condicional, do indulto nem da comutação.' },
    { k:'ato', t:'Livramento condicional', art:'LEP, arts. 131 a 146',
      sub:'requisitos objetivos e subjetivos do art. 83 do CP; condições e período de prova',
      nota:'Súmula 441 do STJ: a falta grave não interrompe o prazo para obtenção de livramento condicional. Súmula 715 do STF: a pena unificada em 40 anos não é considerada para outros benefícios.' },
    { k:'decisao', t:'Incidente decidido — e o recurso', art:'LEP, arts. 194 a 197',
      saidas:[
        { lado:'esq', rot:'inconformismo', k:'recurso', t:'Agravo em execução',
          sub:'sem efeito suspensivo; prazo de 5 dias', art:'LEP, art. 197' }
      ],
      nota:'O prazo do agravo em execução é de 5 dias — Súmula 700 do STF. Não há previsão de prazo na LEP; aplica-se por analogia o do recurso em sentido estrito.' },
    { k:'terminal', t:'Extinção da pena', art:'LEP, art. 66, II, e CP, art. 107',
      sub:'cumprimento integral, indulto, prescrição da pretensão executória' }
  ]
},

/* ══════════════════════ PENAL — PRISÕES E CAUTELARES ══════════════════════ */
'Penal — prisões e cautelares': {
  ramo: 'Penal',
  fonte: 'CPP, arts. 282 a 350',
  resumo: 'Desde a Lei 13.964/2019 a lógica é a excepcionalidade: nenhuma prisão se decreta de ofício, toda medida cautelar exige necessidade e adequação, e a preventiva precisa ser revisada periodicamente.',
  passos: [
    { k:'inicio', t:'PRISÕES E MEDIDAS CAUTELARES', art:'CPP, art. 282' },
    { k:'ato', t:'Prisão em flagrante', art:'CPP, arts. 301 a 310',
      sub:'comunicação imediata ao juiz, ao MP e à família; auto lavrado em 24 horas',
      nota:'O flagrante é medida pré-cautelar: ele não se sustenta sozinho. Ou é convertido em preventiva, ou o preso é solto.' },
    { k:'ato', t:'Audiência de custódia em 24 horas', art:'CPP, art. 310',
      sub:'apresentação pessoal ao juiz, com MP e defesa',
      nota:'A não realização no prazo torna a prisão ilegal, sem prejuízo da apuração de responsabilidade (art. 310, § 4º). A finalidade é aferir legalidade e integridade física, não o mérito da imputação.' },
    { k:'decisao', t:'Decisão na custódia', art:'CPP, art. 310, I a III',
      saidas:[
        { lado:'esq', rot:'ilegal', k:'terminal', t:'Relaxamento',
          sub:'prisão ilegal, relaxada de ofício', art:'CPP, art. 310, I, e CF, art. 5º, LXV' },
        { lado:'dir', rot:'legal', k:'decisao', t:'Converter ou liberar?',
          sub:'preventiva, cautelares diversas ou liberdade provisória', art:'CPP, art. 310, II e III' }
      ] },
    { k:'decisao', t:'Cabimento da preventiva', art:'CPP, arts. 311 a 313',
      saidas:[
        { lado:'esq', rot:'não cabe', k:'ato', t:'Cautelares diversas ou liberdade provisória',
          sub:'com ou sem fiança, cumuladas com as medidas do art. 319',
          art:'CPP, arts. 319, 321 e 322' },
        { lado:'dir', rot:'cabe', k:'ato', t:'Prisão preventiva',
          sub:'fumus commissi delicti + periculum libertatis, com fato concreto',
          art:'CPP, arts. 312 e 313' }
      ],
      peca:'Decisão de prisão preventiva',
      nota:'Nunca de ofício: exige requerimento do MP, do querelante, do assistente ou representação da autoridade policial (art. 311). E a gravidade abstrata do crime não é fundamento — art. 315, § 2º, lista o que NÃO é fundamentação.' },
    { k:'ato', t:'Substituição por prisão domiciliar', art:'CPP, arts. 317 e 318',
      sub:'maior de 80 anos, doença grave, imprescindível aos cuidados de menor de 6 anos ou com deficiência, gestante, mãe ou pai de criança até 12 anos',
      nota:'O art. 318-A trata da substituição para gestante e mãe de criança, com as ressalvas dos incisos I e II. A jurisprudência do STF firmou-se no HC coletivo 143.641.' },
    { k:'ato', t:'Revisão periódica da preventiva', art:'CPP, art. 316, parágrafo único',
      sub:'a cada 90 dias, mediante decisão fundamentada, de ofício',
      nota:'O descumprimento do prazo não gera soltura automática: o STF entendeu que a falta de revisão não torna a prisão ilegal por si só, cabendo ao juízo sanar a omissão.' },
    { k:'decisao', t:'Impugnação', art:'CPP, arts. 316 e 647',
      saidas:[
        { lado:'esq', rot:'ao próprio juízo', k:'ato', t:'Pedido de revogação',
          sub:'cessada a razão que a determinou', art:'CPP, art. 316' },
        { lado:'dir', rot:'ao tribunal', k:'recurso', t:'Habeas corpus',
          sub:'coação ilegal à liberdade de locomoção', art:'CPP, arts. 647 e 648' }
      ],
      peca:'Habeas corpus' },
    { k:'terminal', t:'Detração', art:'CP, art. 42, e CPP, art. 387, § 2º',
      sub:'o tempo de prisão provisória é computado na pena e considerado na fixação do regime inicial' }
  ]
},

/* ══════════════════ CIVIL — CUMPRIMENTO E EXECUÇÃO ══════════════════ */
'Civil — cumprimento e execução': {
  ramo: 'Civil',
  fonte: 'CPC, arts. 513 a 925',
  resumo: 'Dois caminhos que não se misturam: título judicial vai a cumprimento de sentença, nos mesmos autos, com multa de 10%; título extrajudicial vai a processo de execução, com citação para pagar em 3 dias e honorários de 10%.',
  passos: [
    { k:'inicio', t:'SATISFAÇÃO DO CRÉDITO', art:'CPC, arts. 513 e 771' },
    { k:'decisao', t:'Qual é o título?', art:'CPC, arts. 515 e 784',
      saidas:[
        { lado:'esq', rot:'judicial', k:'ato', t:'Cumprimento de sentença',
          sub:'nos mesmos autos, por requerimento do exequente', art:'CPC, arts. 513 e 523' },
        { lado:'dir', rot:'extrajudicial', k:'ato', t:'Processo de execução',
          sub:'ação autônoma', art:'CPC, arts. 771 e 784' }
      ],
      nota:'O título, judicial ou extrajudicial, precisa ser certo, líquido e exigível (art. 783). Faltando qualquer atributo, a execução é nula — e isso é matéria de ordem pública.' },
    { k:'ato', t:'Cumprimento: intimação para pagar em 15 dias', art:'CPC, art. 523',
      sub:'não pago, incidem multa de 10% e honorários de 10%, e expede-se mandado de penhora',
      nota:'A multa e os honorários incidem pelo NÃO PAGAMENTO, e não são afastados porque o executado impugnou. Súmula 517 do STJ: são devidos honorários no cumprimento, haja ou não impugnação.' },
    { k:'ato', t:'Execução: citação para pagar em 3 dias', art:'CPC, arts. 827 e 829',
      sub:'honorários de 10%, reduzidos à metade se pagar no prazo',
      nota:'Pagando em 3 dias, os honorários caem pela metade (art. 827, § 1º). É o incentivo que a lei coloca no início.' },
    { k:'decisao', t:'Defesa do executado', art:'CPC, arts. 525 e 914',
      saidas:[
        { lado:'esq', rot:'título judicial', k:'ato', t:'Impugnação',
          sub:'15 dias após o prazo do art. 523 · rol fechado do § 1º · não exige garantia',
          art:'CPC, art. 525' },
        { lado:'dir', rot:'título extrajudicial', k:'ato', t:'Embargos à execução',
          sub:'15 dias da citação · cognição ampla · não exige garantia',
          art:'CPC, arts. 914 e 917' }
      ],
      peca:'Impugnação ao cumprimento',
      nota:'A diferença que a prova cobra: a impugnação tem rol fechado (art. 525, § 1º); os embargos admitem qualquer matéria deduzível em processo de conhecimento (art. 917, VI). Nenhum dos dois exige garantia para ser conhecido — ela só entra no efeito suspensivo.' },
    { k:'ato', t:'Penhora, avaliação e expropriação', art:'CPC, arts. 831 a 903',
      sub:'ordem preferencial do art. 835 · impenhorabilidades do art. 833 · adjudicação, alienação por iniciativa particular e leilão',
      nota:'A ordem do art. 835 é relativa, salvo o dinheiro, que tem prioridade (art. 835, § 1º). Bem de família é impenhorável pela Lei 8.009/90, com as exceções do art. 3º.' },
    { k:'decisao', t:'Não há bens penhoráveis', art:'CPC, art. 921',
      saidas:[
        { lado:'dir', rot:'suspende', k:'ato', t:'Suspensão por 1 ano',
          sub:'findo o prazo, corre a prescrição intercorrente', art:'CPC, art. 921, §§ 1º e 4º' }
      ],
      nota:'O prazo da intercorrente é o mesmo da pretensão executada e corre independentemente de nova intimação, contado do fim da suspensão de um ano (art. 921, § 4º, com a Lei 14.195/2021).' },
    { k:'terminal', t:'Extinção', art:'CPC, arts. 924 e 925',
      sub:'satisfação, remissão, renúncia, transação ou prescrição intercorrente',
      nota:'A extinção só produz efeito quando declarada por sentença (art. 925).' }
  ]
},

/* ══════════════════════ CIVIL — RECURSOS ══════════════════════ */
'Civil — recursos': {
  ramo: 'Civil',
  fonte: 'CPC, arts. 994 a 1.044',
  resumo: 'O que define a peça é o pronunciamento atacado: sentença chama apelação, interlocutória chama agravo — mas só nas hipóteses do art. 1.015, e é aí que mora o problema.',
  passos: [
    { k:'inicio', t:'RECURSOS NO CPC', sub:'rol taxativo', art:'CPC, art. 994' },
    { k:'decisao', t:'O que foi decidido?', art:'CPC, arts. 203 e 1.009',
      saidas:[
        { lado:'esq', rot:'sentença', k:'ato', t:'Apelação — 15 dias',
          sub:'devolve toda a matéria impugnada e as questões do art. 1.013, § 1º',
          art:'CPC, arts. 1.009 e 1.003, § 5º' },
        { lado:'dir', rot:'interlocutória', k:'decisao', t:'Está no art. 1.015?',
          art:'CPC, art. 1.015' }
      ] },
    { k:'decisao', t:'Agravo de instrumento', art:'CPC, art. 1.015',
      saidas:[
        { lado:'esq', rot:'no rol', k:'ato', t:'Cabe agravo — 15 dias',
          sub:'formação obrigatória do instrumento no art. 1.017', art:'CPC, arts. 1.015 e 1.016' },
        { lado:'dir', rot:'fora do rol', k:'ato', t:'Impugna na apelação',
          sub:'a interlocutória não agravável não preclui', art:'CPC, art. 1.009, § 1º' }
      ],
      peca:'Agravo de instrumento',
      nota:'O rol é de taxatividade mitigada: cabe agravo fora dele quando houver urgência decorrente da inutilidade do julgamento no futuro recurso de apelação — STJ, REsp 1.704.520, Tema 988, j. 05/12/2018.' },
    { k:'ato', t:'Efeitos da apelação', art:'CPC, art. 1.012',
      sub:'regra: suspensivo · exceções do § 1º saem com eficácia imediata',
      nota:'Nas exceções do § 1º (tutela, alimentos, sentença arbitral, interdição, entre outras), a sentença produz efeitos desde logo e o apelado já pode promover o cumprimento provisório.' },
    { k:'ato', t:'Sem juízo de admissibilidade na origem', art:'CPC, art. 1.010, § 3º',
      sub:'o juiz recebe as contrarrazões e remete ao tribunal',
      nota:'Diferença do CPC/73: o primeiro grau não faz mais o juízo de admissibilidade da apelação. Ele faz o de retratação nos casos do art. 331 e do art. 485, § 7º.' },
    { k:'decisao', t:'No tribunal', art:'CPC, art. 1.013',
      saidas:[
        { lado:'esq', rot:'causa madura', k:'terminal', t:'Julga o mérito desde logo',
          sub:'ainda que a sentença tenha sido terminativa', art:'CPC, art. 1.013, § 3º' },
        { lado:'dir', rot:'vício sanável', k:'ato', t:'Converte em diligência',
          art:'CPC, arts. 938, § 1º, e 1.013, § 3º, IV' }
      ] },
    { k:'ato', t:'Embargos de declaração — 5 dias', art:'CPC, arts. 1.022 a 1.026',
      sub:'omissão, contradição, obscuridade e erro material · interrompem o prazo dos demais recursos',
      nota:'Interrompem, não suspendem: o prazo recomeça do zero. Embargos protelatórios geram multa de até 2%, e de até 10% na reiteração (art. 1.026, §§ 2º e 3º).' },
    { k:'ato', t:'Agravo interno — 15 dias', art:'CPC, art. 1.021',
      sub:'contra decisão monocrática do relator' },
    { k:'recurso', t:'Recurso especial e extraordinário', art:'CPC, arts. 1.029 a 1.041',
      sub:'esgotamento das instâncias, prequestionamento e, no RE, repercussão geral',
      nota:'Súmula 211 do STJ: inadmissível o recurso especial quanto à questão que, apesar de oposta nos embargos, não foi apreciada pelo tribunal. Inadmitido na origem, cabe agravo em recurso especial ou extraordinário (art. 1.042).' }
  ]
},

/* ══════════════════ CONSTITUCIONAL — REMÉDIOS ══════════════════ */
'Constitucional — remédios': {
  ramo: 'Constitucional',
  fonte: 'CF, art. 5º, e Lei 12.016/2009',
  resumo: 'Cada remédio protege um bem jurídico distinto, e escolher o errado é perda de peça. Mandado de segurança protege direito líquido e certo não amparado por HC ou habeas data; habeas corpus, a liberdade de locomoção.',
  passos: [
    { k:'inicio', t:'REMÉDIOS CONSTITUCIONAIS', art:'CF, art. 5º, LXVIII a LXXIII' },
    { k:'decisao', t:'Qual bem está em jogo?', art:'CF, art. 5º',
      saidas:[
        { lado:'esq', rot:'locomoção', k:'ato', t:'Habeas corpus',
          sub:'gratuito, legitimidade universal, sem advogado', art:'CF, art. 5º, LXVIII' },
        { lado:'dir', rot:'outro direito líquido e certo', k:'ato', t:'Mandado de segurança',
          sub:'prova pré-constituída, prazo de 120 dias', art:'CF, art. 5º, LXIX' }
      ],
      peca:'Habeas corpus',
      nota:'O MS é residual: cabe quando o direito não é amparado por habeas corpus nem por habeas data. Errar isso leva à extinção sem resolução de mérito.' },
    { k:'ato', t:'MS — impetração e requisitos', art:'Lei 12.016/2009, arts. 1º e 6º',
      sub:'direito líquido e certo, autoridade coatora, ato de autoridade ou de agente de pessoa jurídica no exercício de atribuição pública',
      nota:'Direito líquido e certo é conceito de PROVA, não de mérito: é o direito demonstrável de plano, sem dilação. Súmula 625 do STF: controvérsia sobre matéria de direito não impede a concessão.' },
    { k:'ato', t:'Prazo decadencial de 120 dias', art:'Lei 12.016/2009, art. 23',
      nota:'Súmula 632 do STF: é constitucional lei que fixa prazo de decadência para a impetração. O prazo corre da ciência do ato impugnado, e não se interrompe por pedido administrativo.' },
    { k:'decisao', t:'Liminar em MS', art:'Lei 12.016/2009, art. 7º, III',
      saidas:[
        { lado:'esq', rot:'defere', k:'ato', t:'Suspende o ato',
          sub:'relevância do fundamento + risco de ineficácia da medida' },
        { lado:'dir', rot:'indefere', k:'recurso', t:'Agravo de instrumento',
          art:'Lei 12.016/2009, art. 7º, § 1º' }
      ],
      nota:'Vedações do art. 7º, § 2º: compensação de créditos tributários, entrega de mercadorias vindas do exterior, reclassificação de servidor e concessão de aumento ou extensão de vantagens. Súmula 212 do STJ veda a compensação por liminar.' },
    { k:'ato', t:'Informações, MP e sentença', art:'Lei 12.016/2009, arts. 7º, I, 12 e 13',
      sub:'autoridade presta informações em 10 dias · MP opina em 10 dias · sentença',
      peca:'Sentença em MS',
      nota:'Súmula 631 do STF: extingue-se o MS se o impetrante não promove a citação do litisconsorte passivo necessário. Súmula 269 do STF: o mandado de segurança não é substitutivo de ação de cobrança.' },
    { k:'decisao', t:'Efeitos patrimoniais', art:'Súmulas 269 e 271 do STF',
      saidas:[
        { lado:'esq', rot:'depois da impetração', k:'ato', t:'Pagos na via do MS' },
        { lado:'dir', rot:'antes da impetração', k:'ato', t:'Ação própria',
          sub:'o MS não produz efeitos patrimoniais pretéritos' }
      ],
      nota:'Súmula 271 do STF: a concessão do mandado de segurança não produz efeitos patrimoniais em relação a período pretérito, os quais devem ser reclamados administrativamente ou pela via judicial própria.' },
    { k:'recurso', t:'Apelação e remessa necessária', art:'Lei 12.016/2009, art. 14',
      sub:'apelação da sentença · concedida a ordem, há reexame necessário',
      nota:'Súmula 597 do STJ: cabe apelação com efeito meramente devolutivo da sentença que concede a segurança. Súmula 512 do STF e 105 do STJ: não cabem honorários em mandado de segurança.' },
    { k:'ato', t:'Os demais remédios', art:'CF, art. 5º, LXXI a LXXIII',
      sub:'habeas data (informações do impetrante) · mandado de injunção (falta de norma regulamentadora) · ação popular (patrimônio público e moralidade)',
      nota:'Súmula 2 do STJ: não cabe habeas data se não houve recusa administrativa. O mandado de injunção passou a ter disciplina própria na Lei 13.300/2016, com eficácia subjetiva e possibilidade de efeitos ultra partes.' }
  ]
},
/* ══════════════════════ TRABALHO — RITO ORDINÁRIO ══════════════════════ */
'Trabalho — rito ordinário': {
  ramo: 'Trabalho',
  fonte: 'CLT, arts. 837 a 852',
  resumo: 'Audiência una, oralidade e concentração. Duas ausências decidem o processo antes do mérito: a do reclamante gera arquivamento; a do reclamado, revelia e confissão quanto à matéria de fato.',
  passos: [
    { k:'inicio', t:'RITO ORDINÁRIO TRABALHISTA', sub:'acima de 40 salários mínimos', art:'CLT, art. 852-A, a contrario' },
    { k:'ato', t:'Reclamação trabalhista', art:'CLT, art. 840',
      sub:'pedido certo, determinado e com indicação de valor',
      nota:'A indicação de valor do § 1º gerou a controvérsia sobre limitar a condenação ao valor apontado. O TST firmou que os valores da inicial são estimativos quando assim ressalvado, não teto da condenação.' },
    { k:'ato', t:'Notificação do reclamado', art:'CLT, art. 841',
      sub:'via postal, com 5 dias de antecedência da audiência',
      nota:'Súmula 16 do TST: presume-se recebida a notificação 48 horas depois da postagem, e o ônus de provar o não recebimento é do destinatário.' },
    { k:'decisao', t:'Quem faltou à audiência?', art:'CLT, art. 844',
      saidas:[
        { lado:'esq', rot:'o autor', k:'terminal', t:'Arquivamento',
          sub:'com condenação em custas, ainda que beneficiário da gratuidade',
          art:'CLT, art. 844, §§ 2º e 3º' },
        { lado:'dir', rot:'o réu', k:'ato', t:'Revelia e confissão',
          sub:'quanto à matéria de fato', art:'CLT, art. 844, caput' }
      ],
      nota:'A revelia trabalhista não impede a juntada de defesa e documentos já apresentados (art. 844, § 5º). E a presunção de veracidade é relativa: não alcança direito nem fato impossível.' },
    { k:'ato', t:'Defesa e instrução na mesma audiência', art:'CLT, arts. 847 a 848',
      sub:'contestação em 20 minutos ou por escrito · interrogatório · até 3 testemunhas por parte',
      peca:'Contestação',
      nota:'Súmula 74 do TST: aplica-se a confissão ficta à parte que, intimada a depor pessoalmente, não comparece. Perícia é obrigatória em insalubridade e periculosidade (art. 195, § 2º).' },
    { k:'ato', t:'Razões finais e segunda proposta de conciliação', art:'CLT, arts. 850 e 831',
      sub:'10 minutos para cada parte; a conciliação é obrigatória em dois momentos',
      nota:'A ausência da proposta conciliatória é nulidade — a CLT a impõe na abertura (art. 846) e depois das razões finais (art. 850).' },
    { k:'ato', t:'Sentença', art:'CLT, arts. 832 e 852',
      sub:'com juros, correção e honorários de sucumbência',
      peca:'Sentença — treino guiado',
      nota:'Correção monetária: o STF, nas ADC 58 e ADC 59 (j. 18/12/2020), fixou IPCA-E na fase pré-judicial e Selic a partir do ajuizamento. Honorários de sucumbência: art. 791-A da CLT, com a cobrança do beneficiário da gratuidade declarada inconstitucional na ADI 5766 (j. 20/10/2021).' },
    { k:'decisao', t:'Recurso ordinário — 8 dias', art:'CLT, art. 895',
      saidas:[
        { lado:'esq', rot:'sem preparo', k:'terminal', t:'Deserção',
          sub:'depósito recursal e custas são pressupostos objetivos', art:'CLT, arts. 789 e 899' },
        { lado:'dir', rot:'com preparo', k:'ato', t:'Sobe ao TRT',
          sub:'depois, recurso de revista ao TST', art:'CLT, art. 896' }
      ],
      nota:'Súmula 128 do TST: é ônus da parte recorrente efetuar o depósito legal integral. Entidades filantrópicas e beneficiários da gratuidade têm redução ou isenção (art. 899, §§ 9º e 10).' }
  ]
},

/* ══════════════════════ JUIZADO ESPECIAL CÍVEL ══════════════════════ */
'Juizado Especial Cível': {
  ramo: 'Juizado Especial Cível',
  fonte: 'Lei 9.099/95',
  resumo: 'Oralidade, simplicidade, informalidade, economia e celeridade — princípios que são regra de decisão, não enfeite. O que mais elimina peça: competência pelo valor e pela matéria, e o efeito da ausência de cada parte.',
  passos: [
    { k:'inicio', t:'JUIZADO ESPECIAL CÍVEL', sub:'causas de menor complexidade', art:'Lei 9.099/95, arts. 2º e 3º' },
    { k:'decisao', t:'Cabe no Juizado?', art:'Lei 9.099/95, arts. 3º e 8º',
      saidas:[
        { lado:'esq', rot:'não cabe', k:'terminal', t:'Extinção sem mérito',
          sub:'complexidade, matéria excluída ou parte inadmissível',
          art:'Lei 9.099/95, art. 51, II' },
        { lado:'dir', rot:'cabe', k:'ato', t:'Pedido, escrito ou oral',
          sub:'até 40 salários mínimos', art:'Lei 9.099/95, arts. 3º, I, e 14' }
      ],
      nota:'Não podem ser parte: incapaz, preso, pessoa jurídica de direito público, massa falida e insolvente civil (art. 8º). Causas excluídas: alimentar, falimentar, fiscal, de interesse da Fazenda, acidente de trabalho, estado e capacidade (art. 3º, § 2º).' },
    { k:'ato', t:'Advogado dispensável até 20 salários', art:'Lei 9.099/95, art. 9º',
      sub:'acima disso é obrigatório; no recurso, sempre',
      nota:'Se uma parte comparece com advogado, o juiz alerta a outra sobre a assistência judiciária (art. 9º, § 1º). No recurso inominado a capacidade postulatória é sempre exigida (art. 41, § 2º).' },
    { k:'decisao', t:'Sessão de conciliação', art:'Lei 9.099/95, arts. 20 e 51, I',
      saidas:[
        { lado:'esq', rot:'falta o autor', k:'terminal', t:'Extinção com custas',
          art:'Lei 9.099/95, arts. 51, I, e 51, § 2º' },
        { lado:'dir', rot:'falta o réu', k:'ato', t:'Revelia',
          sub:'reputam-se verdadeiros os fatos, salvo convicção em contrário do juiz',
          art:'Lei 9.099/95, art. 20' }
      ],
      nota:'A extinção pela ausência do autor condiciona nova propositura ao pagamento das custas — é a única hipótese de custas em primeiro grau (art. 55).' },
    { k:'ato', t:'Audiência de instrução', art:'Lei 9.099/95, arts. 27 a 33',
      sub:'contestação oral ou escrita · pedido contraposto · até 3 testemunhas · prova técnica simplificada',
      nota:'Não se admite intervenção de terceiro nem assistência; o litisconsórcio é permitido (art. 10). Pedido contraposto substitui a reconvenção (art. 31).' },
    { k:'ato', t:'Sentença', art:'Lei 9.099/95, arts. 38 e 39',
      sub:'dispensado o relatório · vedada a sentença condenatória ilíquida',
      nota:'É ineficaz a sentença condenatória na parte que exceder a alçada (art. 39). Optar pelo Juizado implica renúncia ao que passar do teto.' },
    { k:'ato', t:'Embargos de declaração — 5 dias', art:'Lei 9.099/95, arts. 48 a 50',
      nota:'Depois da adequação ao CPC/2015, os embargos no Juizado INTERROMPEM o prazo dos demais recursos (art. 50, com a redação da Lei 13.105/2015).' },
    { k:'decisao', t:'Recurso inominado — 10 dias', art:'Lei 9.099/95, arts. 41 a 43',
      saidas:[
        { lado:'esq', rot:'regra', k:'ato', t:'Só efeito devolutivo',
          sub:'permite execução provisória', art:'Lei 9.099/95, art. 43' },
        { lado:'dir', rot:'dano irreparável', k:'ato', t:'Efeito suspensivo',
          art:'Lei 9.099/95, art. 43, parte final' }
      ],
      nota:'Julga a turma recursal, composta por juízes de primeiro grau (art. 41, § 1º). O preparo abrange também as custas dispensadas em primeiro grau (art. 42, § 1º).' },
    { k:'recurso', t:'O que sobe além da turma recursal', art:'CF, art. 102, III',
      sub:'recurso extraordinário ao STF; não cabe recurso especial',
      nota:'Súmula 203 do STJ: não cabe recurso especial contra decisão de turma recursal. Súmula 640 do STF: cabe recurso extraordinário. Súmula 376 do STJ: compete à turma recursal julgar mandado de segurança contra ato de juizado especial.' }
  ]
},

/* ══════════════════════ JUIZADO ESPECIAL CRIMINAL ══════════════════════ */
'Juizado Especial Criminal': {
  ramo: 'Juizado Especial Criminal',
  fonte: 'Lei 9.099/95, arts. 60 a 92',
  resumo: 'Quatro institutos despenalizadores em cadeia: composição civil, representação, transação penal e suspensão condicional do processo. Saber a ordem entre eles é o que a prova cobra.',
  passos: [
    { k:'inicio', t:'JUIZADO ESPECIAL CRIMINAL', sub:'infração de menor potencial ofensivo: pena máxima até 2 anos, cumulada ou não com multa', art:'Lei 9.099/95, art. 61' },
    { k:'ato', t:'Termo circunstanciado', art:'Lei 9.099/95, art. 69',
      sub:'lavrado no lugar do inquérito',
      nota:'Comparecendo ao juizado ou assumindo o compromisso de comparecer, não se impõe prisão em flagrante nem se exige fiança (art. 69, parágrafo único). Havendo violência doméstica, o juiz determina o afastamento do lar.' },
    { k:'decisao', t:'Audiência preliminar — composição civil', art:'Lei 9.099/95, arts. 72 a 74',
      saidas:[
        { lado:'esq', rot:'há acordo', k:'terminal', t:'Homologação',
          sub:'na ação privada e na pública condicionada, acarreta renúncia ao direito de queixa ou representação',
          art:'Lei 9.099/95, art. 74, parágrafo único' },
        { lado:'dir', rot:'não há', k:'ato', t:'Oportunidade de representação',
          sub:'a falta de representação na audiência não implica decadência',
          art:'Lei 9.099/95, art. 75' }
      ],
      nota:'O acordo civil homologado vale como título executivo. A renúncia só ocorre na ação privada e na pública condicionada — na incondicionada, o processo segue.' },
    { k:'ato', t:'Lesão leve e culposa passam a depender de representação', art:'Lei 9.099/95, art. 88',
      nota:'Isso NÃO vale na violência doméstica: ADI 4.424 e Súmula 536 do STJ afastam a Lei 9.099/95 desses casos, e a ação por lesão corporal é pública incondicionada.' },
    { k:'decisao', t:'Transação penal', art:'Lei 9.099/95, art. 76',
      saidas:[
        { lado:'esq', rot:'aceita', k:'ato', t:'Pena restritiva ou multa',
          sub:'não gera reincidência nem maus antecedentes; não consta de certidão, salvo para impedir nova transação em 5 anos',
          art:'Lei 9.099/95, art. 76, §§ 4º e 6º' },
        { lado:'dir', rot:'não cabe ou recusa', k:'ato', t:'Denúncia oral',
          sub:'reduzida a termo', art:'Lei 9.099/95, art. 77' }
      ],
      peca:'Denúncia',
      nota:'Súmula Vinculante 35: a homologação da transação não faz coisa julgada material; descumprida, retomam-se os atos e o Ministério Público pode oferecer denúncia. Impedimentos no art. 76, § 2º: condenação anterior a pena privativa, transação nos últimos 5 anos, e circunstâncias desfavoráveis.' },
    { k:'ato', t:'Procedimento sumaríssimo', art:'Lei 9.099/95, arts. 77 a 81',
      sub:'defesa oral antes do recebimento · instrução, debates e sentença na mesma audiência',
      nota:'Aqui a resposta vem ANTES do recebimento da denúncia (art. 81), diferente do procedimento comum. Complexidade ou impossibilidade de citação por edital remetem ao juízo comum (art. 66, parágrafo único, e art. 77, § 2º).' },
    { k:'decisao', t:'Suspensão condicional do processo', art:'Lei 9.099/95, art. 89',
      saidas:[
        { lado:'esq', rot:'aceita', k:'ato', t:'Período de prova de 2 a 4 anos',
          sub:'cumprido sem revogação, extingue-se a punibilidade',
          art:'Lei 9.099/95, art. 89, §§ 1º e 5º' },
        { lado:'dir', rot:'revogada', k:'ato', t:'Processo retoma o curso',
          sub:'obrigatória se processado por outro crime ou não repara o dano',
          art:'Lei 9.099/95, art. 89, §§ 3º e 4º' }
      ],
      nota:'Cabe em qualquer crime com pena MÍNIMA igual ou inferior a 1 ano, dentro ou fora do juizado. Súmula 723 do STF: não cabe no crime continuado se a pena mínima, com o acréscimo, ultrapassar 1 ano. Súmula 337 do STJ: cabe na desclassificação e na procedência parcial.' },
    { k:'recurso', t:'Apelação — 10 dias', art:'Lei 9.099/95, art. 82',
      sub:'com razões, julgada pela turma recursal',
      nota:'Prazo unificado de 10 dias, com as razões desde logo (art. 82, § 1º) — diferente dos 5 + 8 dias do CPP.' }
  ]
},

/* ══════════════════════ TRIBUTÁRIO — EXECUÇÃO FISCAL ══════════════════════ */
'Tributário — execução fiscal': {
  ramo: 'Tributário',
  fonte: 'Lei 6.830/80 (LEF)',
  resumo: 'Rito próprio, com CPC subsidiário. A garantia do juízo é a chave que abre os embargos — e a exceção de pré-executividade é a porta lateral para o que é de ordem pública e não pede prova.',
  passos: [
    { k:'inicio', t:'EXECUÇÃO FISCAL', sub:'dívida ativa tributária e não tributária', art:'Lei 6.830/80, arts. 1º e 2º' },
    { k:'ato', t:'Inscrição em dívida ativa e CDA', art:'Lei 6.830/80, arts. 2º, §§ 5º e 6º, e 3º',
      sub:'presunção de certeza e liquidez, ilidível por prova inequívoca',
      nota:'Súmula 559 do STJ: é desnecessário instruir a inicial com demonstrativo de cálculo. Súmula 392: a CDA pode ser substituída até a sentença de embargos para corrigir erro material ou formal, vedada a modificação do sujeito passivo.' },
    { k:'ato', t:'Citação: 5 dias para pagar ou garantir', art:'Lei 6.830/80, arts. 7º e 8º',
      sub:'preferencialmente pelo correio, com aviso de recebimento' },
    { k:'decisao', t:'O executado garantiu o juízo?', art:'Lei 6.830/80, arts. 9º e 16, § 1º',
      saidas:[
        { lado:'esq', rot:'não garantiu', k:'ato', t:'Exceção de pré-executividade',
          sub:'só matéria de ordem pública que dispense dilação probatória',
          art:'Lei 6.830/80, art. 16, § 1º' },
        { lado:'dir', rot:'garantiu', k:'ato', t:'Embargos em 30 dias',
          sub:'depósito, fiança bancária, seguro garantia ou penhora',
          art:'Lei 6.830/80, art. 16, I a III' }
      ],
      peca:'Embargos à execução fiscal',
      nota:'Súmula 393 do STJ: a exceção de pré-executividade é admissível quanto às matérias conhecíveis de ofício que não demandem dilação probatória. A exigência de garantia vem sendo afastada quando comprovada a insuficiência patrimonial do executado.' },
    { k:'decisao', t:'Efeito suspensivo dos embargos', art:'CPC, art. 919, § 1º',
      saidas:[
        { lado:'esq', rot:'sem os requisitos', k:'ato', t:'Execução prossegue' },
        { lado:'dir', rot:'com os requisitos', k:'ato', t:'Execução suspensa',
          sub:'garantia + relevância da fundamentação + risco de dano' }
      ],
      nota:'Não é automático. STJ, REsp 1.272.827/PE, Tema 526: aplica-se subsidiariamente o CPC, exigindo-se os três requisitos cumulativos.' },
    { k:'ato', t:'Sentença nos embargos', art:'Lei 6.830/80, art. 17, parágrafo único',
      sub:'dispensada a audiência quando a prova for exclusivamente documental',
      nota:'Procedente em parte, a sentença tem de dizer por qual valor a execução prossegue — sem isso ela é inexequível.' },
    { k:'decisao', t:'Responsabilidade do sócio', art:'CTN, art. 135, III',
      saidas:[
        { lado:'esq', rot:'só inadimplemento', k:'terminal', t:'Não redireciona',
          sub:'Súmula 430 do STJ' },
        { lado:'dir', rot:'dissolução irregular', k:'ato', t:'Redirecionamento',
          sub:'presunção da Súmula 435 do STJ' }
      ],
      nota:'Súmula 435: presume-se dissolvida irregularmente a empresa que deixa de funcionar no domicílio fiscal sem comunicar aos órgãos competentes, legitimando o redirecionamento ao sócio-gerente.' },
    { k:'decisao', t:'Não localizados devedor ou bens', art:'Lei 6.830/80, art. 40',
      saidas:[
        { lado:'dir', rot:'suspende 1 ano', k:'ato', t:'Arquivamento e prescrição intercorrente',
          sub:'findo o ano, corre o quinquênio automaticamente',
          art:'Lei 6.830/80, art. 40, §§ 2º e 4º' }
      ],
      nota:'Súmula 314 do STJ. O reconhecimento exige prévia oitiva da Fazenda (§ 4º), mas o STJ exige demonstração de prejuízo — presumido apenas quando faltou a intimação do termo inicial (REsp 1.340.553/RS, Temas 566 e 570/571).' },
    { k:'recurso', t:'Apelação — e os embargos infringentes de alçada', art:'Lei 6.830/80, art. 34',
      sub:'em causas de valor até 50 ORTN, só embargos infringentes ao próprio juízo e declaratórios',
      nota:'Súmula 640 do STF não se aplica aqui; a alçada do art. 34 é atualizada por ato normativo e a apelação fica excluída abaixo dela.' }
  ]
},

/* ══════════════════ ADMINISTRATIVO — IMPROBIDADE ══════════════════ */
'Administrativo — improbidade': {
  ramo: 'Administrativo',
  fonte: 'Lei 8.429/92, com a Lei 14.230/2021',
  resumo: 'A reforma de 2021 mudou o eixo: legitimidade exclusiva do Ministério Público, fim da modalidade culposa, rol taxativo no art. 11 e exigência de dolo específico. Ação de rito próprio, que não é ação civil pública.',
  passos: [
    { k:'inicio', t:'AÇÃO DE IMPROBIDADE', art:'Lei 8.429/92, art. 17' },
    { k:'ato', t:'Inquérito civil ou procedimento investigatório', art:'Lei 7.347/85, art. 8º, § 1º',
      sub:'colheita da prova do dolo e do dano',
      nota:'A improbidade não se confunde com a ação civil pública — o art. 17-D é expresso: a ação tem rito próprio e não constitui ACP.' },
    { k:'decisao', t:'Legitimidade', art:'Lei 8.429/92, art. 17, caput',
      saidas:[
        { lado:'esq', rot:'ente lesado', k:'terminal', t:'Não propõe',
          sub:'a legitimidade passou a ser exclusiva do Ministério Público' },
        { lado:'dir', rot:'Ministério Público', k:'ato', t:'Petição inicial',
          art:'Lei 8.429/92, art. 17' }
      ],
      peca:'Petição inicial de improbidade',
      nota:'A pessoa jurídica interessada pode intervir como litisconsorte facultativo. O STF, na ADI 7.042, restabeleceu a legitimidade concorrente das pessoas jurídicas interessadas — ponto em que a lei e a decisão do STF divergem, e a banca costuma explorar.' },
    { k:'decisao', t:'Qual espécie de ato?', art:'Lei 8.429/92, arts. 9º, 10 e 11',
      saidas:[
        { lado:'esq', rot:'enriquecimento ou dano', k:'ato', t:'Arts. 9º e 10',
          sub:'no art. 10 exige-se perda patrimonial EFETIVA e comprovada' },
        { lado:'dir', rot:'violação de princípios', k:'ato', t:'Art. 11 — rol taxativo',
          sub:'conduta fora dos incisos não é improbidade' }
      ],
      nota:'Em todos eles o elemento subjetivo é o dolo — STF, ARE 843.989, Tema 1199, j. 18/08/2022. A revogação da modalidade culposa é irretroativa, mas alcança os atos culposos ainda sem condenação transitada em julgado.' },
    { k:'ato', t:'Indisponibilidade de bens', art:'Lei 8.429/92, art. 16',
      sub:'exige demonstração de perigo de dilapidação e limita-se ao valor do ressarcimento',
      nota:'Deixou de ser automática. A tutela recai sobre o dano ou o acréscimo patrimonial, preservados os bens impenhoráveis e o mínimo existencial.' },
    { k:'ato', t:'Citação e contestação em 30 dias', art:'Lei 8.429/92, art. 17, § 7º',
      sub:'a notificação para defesa prévia foi suprimida pela reforma',
      nota:'O que existe agora é rejeição da inicial nos casos do art. 330 do CPC, e absolvição sumária quando convencido o juiz da inexistência do ato ou da improcedência da ação.' },
    { k:'ato', t:'Instrução e sentença', art:'Lei 8.429/92, art. 17-C',
      sub:'a sentença indica os tipos, o dolo, o dano e a dosimetria de cada sanção',
      nota:'O art. 17-C exige que a condenação individualize a conduta e considere a proporcionalidade — sanção em bloco não se sustenta.' },
    { k:'ato', t:'Sanções', art:'Lei 8.429/92, art. 12',
      sub:'ressarcimento, perda de bens, perda da função, suspensão dos direitos políticos, multa e proibição de contratar',
      nota:'O ressarcimento por ato doloso de improbidade é imprescritível — STF, RE 852.475, Tema 897, j. 08/08/2018. A prescrição da ação é de 8 anos (art. 23), com intercorrente.' },
    { k:'terminal', t:'Independência das instâncias', art:'Lei 8.429/92, art. 21',
      sub:'com as ressalvas da absolvição criminal por inexistência do fato ou negativa de autoria' }
  ]
},

/* ══════════ CRIANÇA E ADOLESCENTE — ATO INFRACIONAL ══════════ */
'Criança e adolescente — ato infracional': {
  ramo: 'Criança e adolescente',
  fonte: 'ECA, arts. 103 a 128 e 171 a 190',
  resumo: 'Criança recebe medida de proteção; adolescente responde por ato infracional com medida socioeducativa. Todo o rito é curto e cheio de prazos próprios — e a internação é sempre exceção.',
  passos: [
    { k:'inicio', t:'ATO INFRACIONAL', sub:'conduta descrita como crime ou contravenção', art:'ECA, art. 103' },
    { k:'decisao', t:'Quem praticou?', art:'ECA, arts. 104 e 105',
      saidas:[
        { lado:'esq', rot:'criança, até 12', k:'terminal', t:'Medidas de proteção',
          sub:'aplicadas pelo Conselho Tutelar', art:'ECA, arts. 101 e 105' },
        { lado:'dir', rot:'adolescente, 12 a 18', k:'ato', t:'Medida socioeducativa',
          sub:'considera-se a idade na DATA DO FATO', art:'ECA, arts. 104, parágrafo único, e 112' }
      ] },
    { k:'ato', t:'Apreensão e apresentação ao Ministério Público', art:'ECA, arts. 171 a 179',
      sub:'apreensão só em flagrante ou por ordem escrita e fundamentada',
      nota:'Comparecendo os pais e não sendo grave o ato, o adolescente é liberado desde logo (art. 174). Internação antes da sentença exige indícios suficientes e é limitada a 45 dias (arts. 108 e 183).' },
    { k:'decisao', t:'Oitiva informal — o que o MP faz', art:'ECA, art. 180',
      saidas:[
        { lado:'esq', rot:'arquiva ou remite', k:'terminal', t:'Arquivamento ou remissão',
          sub:'a remissão pode ser pura ou cumulada com medida não privativa',
          art:'ECA, arts. 126 a 128' },
        { lado:'dir', rot:'representa', k:'ato', t:'Representação',
          sub:'independe de prova pré-constituída da autoria', art:'ECA, arts. 180, III, e 182' }
      ],
      nota:'A remissão do MP é forma de exclusão do processo e não implica reconhecimento de responsabilidade nem gera antecedentes (art. 127). Súmula 108 do STJ: a aplicação de medida socioeducativa é competência exclusiva do juiz.' },
    { k:'ato', t:'Audiência de apresentação', art:'ECA, arts. 184 a 186',
      sub:'oitiva do adolescente e dos pais ou responsável; defesa técnica obrigatória',
      nota:'Sem oitiva do adolescente ou sem defensor, o processo é nulo (art. 207). É aqui que o juiz também pode conceder a remissão judicial.' },
    { k:'ato', t:'Instrução e alegações', art:'ECA, art. 186, §§ 3º e 4º',
      sub:'audiência em continuação, com testemunhas e alegações finais em 5 dias',
      nota:'Súmula 342 do STJ: é nula a desistência de outras provas em face da confissão do adolescente.' },
    { k:'decisao', t:'Sentença', art:'ECA, arts. 112, 114 e 189',
      saidas:[
        { lado:'esq', rot:'não provada', k:'terminal', t:'Improcedência',
          sub:'fato inexistente, não constitui ato infracional, autoria não provada ou prova insuficiente',
          art:'ECA, art. 189' },
        { lado:'dir', rot:'provada', k:'ato', t:'Aplicação da medida',
          sub:'advertência, reparação, PSC, liberdade assistida, semiliberdade ou internação',
          art:'ECA, art. 112' }
      ],
      peca:'Sentença socioeducativa',
      nota:'A escolha considera a capacidade de cumprir, as circunstâncias e a gravidade — nessa ordem (art. 112, § 1º). Prova além da confissão é exigida pelo art. 114.' },
    { k:'decisao', t:'Cabe internação?', art:'ECA, art. 122',
      saidas:[
        { lado:'esq', rot:'não', k:'ato', t:'Medida em meio aberto',
          sub:'havendo outra medida adequada, a internação não se impõe',
          art:'ECA, art. 122, § 2º' },
        { lado:'dir', rot:'sim', k:'ato', t:'Internação',
          sub:'violência ou grave ameaça · reiteração · descumprimento reiterado, por até 3 meses',
          art:'ECA, art. 122, I a III e § 1º' }
      ],
      nota:'Súmula 492 do STJ: o ato análogo ao tráfico, por si só, não conduz obrigatoriamente à internação. Sem prazo determinado, com reavaliação em até 6 meses, teto de 3 anos e liberação compulsória aos 21 (art. 121).' },
    { k:'recurso', t:'Apelação — 10 dias', art:'ECA, art. 198',
      sub:'sistema recursal do CPC com as adaptações do ECA; sem preparo',
      nota:'Súmula 265 do STJ: é necessária a oitiva do adolescente antes de decretar-se a regressão da medida. Súmula 338: a prescrição penal aplica-se às medidas socioeducativas.' }
  ]
},
/* ══════════════════════ TRABALHO — EXECUÇÃO ══════════════════════ */
'Trabalho — execução': {
  ramo: 'Trabalho', fonte: 'CLT, arts. 876 a 892',
  resumo: 'Execução com regras próprias: garantia é pressuposto dos embargos, o prazo é de 5 dias e o recurso é o agravo de petição, que só sobe com os valores delimitados.',
  passos: [
    { k:'inicio', t:'EXECUÇÃO TRABALHISTA', art:'CLT, art. 876' },
    { k:'decisao', t:'Liquidação', art:'CLT, art. 879',
      saidas:[
        { lado:'esq', rot:'valor apurável', k:'ato', t:'Por cálculo',
          sub:'impugnação fundamentada em 8 dias', art:'CLT, art. 879, § 2º' },
        { lado:'dir', rot:'depende de prova', k:'ato', t:'Por arbitramento ou artigos',
          art:'CLT, art. 879, caput' }
      ],
      nota:'A liquidação não pode inovar nem alterar a coisa julgada (art. 879, § 1º). Impugnação fora do prazo do § 2º preclui, e o valor se torna incontroverso.' },
    { k:'ato', t:'Citação: 48 horas para pagar ou garantir', art:'CLT, art. 880',
      nota:'Depois da Reforma, a execução de ofício só cabe quando as partes não estiverem representadas por advogado (art. 878).' },
    { k:'decisao', t:'Garantiu o juízo?', art:'CLT, arts. 882 e 884',
      saidas:[
        { lado:'esq', rot:'não', k:'ato', t:'Penhora',
          sub:'ordem do art. 835 do CPC, aplicado subsidiariamente' },
        { lado:'dir', rot:'sim', k:'ato', t:'Embargos em 5 dias',
          sub:'depósito, seguro garantia judicial ou nomeação de bens',
          art:'CLT, art. 884' }
      ],
      peca:'Embargos à execução',
      nota:'Súmula 128, I, do TST: é ônus da parte o depósito integral. O seguro garantia judicial equipara-se a dinheiro para garantir a execução.' },
    { k:'ato', t:'Matéria dos embargos', art:'CLT, art. 884, § 1º',
      sub:'cumprimento da decisão, quitação ou prescrição da dívida',
      nota:'A cognição é estreita: não se rediscute o mérito da condenação. Matéria nova só a superveniente à sentença.' },
    { k:'ato', t:'Expropriação', art:'CLT, art. 888, e CPC, arts. 831 a 903',
      sub:'avaliação, praça e leilão; adjudicação pelo exequente',
      nota:'A natureza alimentar do crédito autoriza penhora de percentual de salário — o CPC, art. 833, § 2º, ressalva expressamente a prestação alimentícia.' },
    { k:'recurso', t:'Agravo de petição — 8 dias', art:'CLT, art. 897, "a"',
      sub:'só é recebido com a delimitação justificada das matérias e dos valores impugnados',
      nota:'Art. 897, § 1º: sem a delimitação, o agravo não é conhecido. É o filtro que mais elimina recurso na execução trabalhista.' },
    { k:'terminal', t:'Extinção ou prescrição intercorrente', art:'CLT, art. 11-A',
      sub:'dois anos, contados do descumprimento de determinação judicial pelo exequente',
      nota:'A Súmula 114 do TST dizia inaplicável a prescrição intercorrente; a Reforma de 2017 a positivou no art. 11-A, e é este o regime vigente para as execuções iniciadas depois dela.' }
  ]
},

/* ══════════════ PREVIDENCIÁRIO — CONCESSÃO DE BENEFÍCIO ══════════════ */
'Previdenciário — concessão de benefício': {
  ramo: 'Previdenciário', fonte: 'Lei 8.213/91 e CF, art. 201',
  resumo: 'O processo começa antes do processo: sem requerimento administrativo negado, em regra falta interesse de agir. Depois disso, tudo gira em torno de qualidade de segurado, carência e prova.',
  passos: [
    { k:'inicio', t:'BENEFÍCIO PREVIDENCIÁRIO', art:'Lei 8.213/91' },
    { k:'decisao', t:'Houve requerimento administrativo?', art:'CF, art. 5º, XXXV',
      saidas:[
        { lado:'esq', rot:'não', k:'terminal', t:'Falta interesse de agir',
          sub:'salvo recusa notória, contestação de mérito ou revisão de benefício já concedido' },
        { lado:'dir', rot:'sim, negado', k:'ato', t:'Ação previdenciária' }
      ],
      nota:'STF, RE 631.240, Tema 350, j. 03/09/2014: a exigência do prévio requerimento não ofende o acesso à Justiça, e o próprio julgado ressalva as hipóteses em que ela é dispensada.' },
    { k:'decisao', t:'Onde se ajuíza?', art:'CF, art. 109, I e § 3º',
      saidas:[
        { lado:'esq', rot:'até 60 salários', k:'ato', t:'Juizado Especial Federal',
          sub:'competência absoluta na sede da vara', art:'Lei 10.259/2001, art. 3º' },
        { lado:'dir', rot:'acima disso', k:'ato', t:'Vara federal',
          sub:'competência delegada à Justiça Estadual nos termos da lei', art:'CF, art. 109, § 3º' }
      ],
      nota:'A competência delegada foi restringida pela Lei 13.876/2019: passou a valer apenas onde a comarca não for sede de vara federal e a distância for superior a 70 km. Acidente do trabalho é competência da Justiça Estadual (Súmula 15 do STJ).' },
    { k:'ato', t:'Contestação do INSS', art:'CPC, art. 183',
      sub:'prazo em dobro, prescrição quinquenal das parcelas e decadência do direito de revisão',
      peca:'Contestação da Fazenda Pública',
      nota:'Súmula 85 do STJ: em relação de trato sucessivo, quando não negado o próprio direito, a prescrição atinge só as parcelas do quinquênio anterior.' },
    { k:'ato', t:'Prova: qualidade de segurado, carência e tempo', art:'Lei 8.213/91, arts. 11, 15, 25 e 55',
      sub:'perícia médica na incapacidade; início de prova material no tempo rural e no especial',
      nota:'Súmula 149 do STJ: a prova exclusivamente testemunhal não basta para comprovar atividade rurícola. Súmula 577: é possível reconhecer o tempo especial por exposição a ruído com base em laudo posterior ao período.' },
    { k:'ato', t:'Sentença', art:'Lei 8.213/91, arts. 49 e 54',
      sub:'termo inicial do benefício, juros, correção e honorários',
      peca:'Sentença — treino guiado',
      nota:'Súmula 111 do STJ: os honorários não incidem sobre as prestações vencidas após a sentença. O termo inicial é, em regra, a data do requerimento administrativo.' },
    { k:'decisao', t:'Remessa necessária', art:'CPC, art. 496',
      saidas:[
        { lado:'esq', rot:'abaixo do limite', k:'ato', t:'Dispensada',
          sub:'valor certo e líquido inferior ao patamar do § 3º' },
        { lado:'dir', rot:'acima', k:'ato', t:'Sobe ao tribunal' }
      ] },
    { k:'terminal', t:'Cumprimento contra a Fazenda', art:'CPC, art. 534, e CF, art. 100',
      sub:'precatório ou requisição de pequeno valor',
      nota:'Súmula 144 do STJ trata da correção; o essencial em prova é distinguir RPV de precatório e lembrar que não há multa do art. 523 contra a Fazenda.' }
  ]
},

/* ══════════════════ CONSUMIDOR — RELAÇÃO DE CONSUMO ══════════════════ */
'Consumidor — relação de consumo': {
  ramo: 'Consumidor', fonte: 'Lei 8.078/90 (CDC)',
  resumo: 'Tudo depende de duas classificações feitas no começo: existe relação de consumo? e o defeito é vício ou fato do produto? Errar qualquer uma leva ao prazo errado e ao responsável errado.',
  passos: [
    { k:'inicio', t:'RELAÇÃO DE CONSUMO', art:'CDC, arts. 2º e 3º' },
    { k:'decisao', t:'Há relação de consumo?', art:'CDC, arts. 2º, 17 e 29',
      saidas:[
        { lado:'esq', rot:'não', k:'terminal', t:'Regime comum',
          sub:'Código Civil e legislação especial' },
        { lado:'dir', rot:'sim', k:'ato', t:'Aplica-se o CDC',
          sub:'inclusive por equiparação: vítima do evento e exposto a práticas comerciais' }
      ],
      nota:'O STJ adota a teoria finalista mitigada: a pessoa jurídica pode ser consumidora quando demonstrada a vulnerabilidade técnica, jurídica ou econômica na relação concreta.' },
    { k:'decisao', t:'Vício ou fato?', art:'CDC, arts. 12 e 18',
      saidas:[
        { lado:'esq', rot:'vício', k:'ato', t:'Vício do produto ou serviço',
          sub:'atinge só o produto · 30 dias para sanar · responsabilidade solidária de toda a cadeia',
          art:'CDC, arts. 18, 19 e 20' },
        { lado:'dir', rot:'fato', k:'ato', t:'Acidente de consumo',
          sub:'atinge a incolumidade · responsabilidade do fabricante · comerciante é subsidiário',
          art:'CDC, arts. 12 e 13' }
      ],
      nota:'A distinção define o prazo: vício decai em 30 dias (não durável) ou 90 dias (durável), art. 26; fato prescreve em 5 anos da ciência do dano e da autoria, art. 27.' },
    { k:'ato', t:'Excludentes de responsabilidade', art:'CDC, arts. 12, § 3º, e 14, § 3º',
      sub:'não colocação no mercado, inexistência do defeito, culpa exclusiva do consumidor ou de terceiro',
      nota:'Caso fortuito interno não exclui; fortuito externo, sim. Súmula 479 do STJ: as instituições financeiras respondem objetivamente por fortuito interno relativo a fraudes de terceiro.' },
    { k:'ato', t:'Facilitação da defesa em juízo', art:'CDC, arts. 6º, VIII, e 101, I',
      sub:'inversão do ônus da prova e foro do domicílio do consumidor',
      nota:'A inversão é ope judicis: depende de verossimilhança ou hipossuficiência, e a decisão deve ser tomada antes da instrução, para não surpreender o fornecedor.' },
    { k:'ato', t:'Cobrança indevida e repetição em dobro', art:'CDC, art. 42, parágrafo único',
      nota:'STJ, Corte Especial, EAREsp 676.608/RS, j. 21/10/2020: a devolução em dobro independe da natureza do elemento volitivo, bastando a inexistência de engano justificável — com modulação para cobranças posteriores a 30/03/2021.' },
    { k:'decisao', t:'Tutela individual ou coletiva?', art:'CDC, arts. 81 e 91',
      saidas:[
        { lado:'esq', rot:'individual', k:'ato', t:'Ação de consumo',
          sub:'Juizado Especial ou vara cível', peca:'Petição inicial' },
        { lado:'dir', rot:'coletiva', k:'ato', t:'Ação coletiva',
          sub:'difusos, coletivos ou individuais homogêneos', peca:'ACP ambiental' }
      ],
      nota:'Coisa julgada coletiva: erga omnes ou ultra partes, salvo improcedência por insuficiência de provas, e nunca prejudica o direito individual (arts. 103 e 104).' },
    { k:'terminal', t:'Cláusulas abusivas', art:'CDC, arts. 51 e 53',
      sub:'nulidade de pleno direito, reconhecível de ofício',
      nota:'Cuidado com a Súmula 381 do STJ: nos contratos bancários, é vedado ao julgador conhecer de ofício da abusividade das cláusulas — a exceção que a prova adora.' }
  ]
},

/* ══════════════════ FAMÍLIA — ALIMENTOS E GUARDA ══════════════════ */
'Família — alimentos e guarda': {
  ramo: 'Família', fonte: 'CC, arts. 1.583 a 1.710, e Lei 5.478/68',
  resumo: 'Rito especial, alimentos provisórios de ofício e um cumprimento com duas vias — a coercitiva, com prisão, e a expropriatória. Escolher a via errada custa a peça.',
  passos: [
    { k:'inicio', t:'ALIMENTOS E GUARDA', art:'CC, art. 1.694' },
    { k:'ato', t:'Ação de alimentos — rito especial', art:'Lei 5.478/68, arts. 1º a 5º',
      sub:'com prova pré-constituída do parentesco, o juiz fixa alimentos provisórios de ofício',
      peca:'Petição inicial',
      nota:'Sem prova do parentesco ou da obrigação, o rito é o comum e a tutela é a provisória do art. 300 do CPC. O binômio necessidade-possibilidade é o critério do art. 1.694, § 1º.' },
    { k:'decisao', t:'Quem deve?', art:'CC, arts. 1.696 e 1.698',
      saidas:[
        { lado:'esq', rot:'os pais', k:'ato', t:'Obrigação principal' },
        { lado:'dir', rot:'os avós', k:'ato', t:'Complementar e subsidiária',
          sub:'só na impossibilidade total ou parcial dos pais' }
      ],
      nota:'Súmula 596 do STJ: a obrigação alimentar dos avós tem natureza complementar e subsidiária, configurando-se apenas na impossibilidade de cumprimento pelos pais.' },
    { k:'decisao', t:'Guarda', art:'CC, arts. 1.583 e 1.584',
      saidas:[
        { lado:'esq', rot:'regra', k:'ato', t:'Compartilhada',
          sub:'aplicável mesmo sem acordo entre os pais', art:'CC, art. 1.584, § 2º' },
        { lado:'dir', rot:'exceção', k:'ato', t:'Unilateral',
          sub:'quando um dos genitores não a deseja ou não está apto',
          art:'CC, art. 1.583, § 2º' }
      ],
      nota:'A guarda compartilhada não exige convivência harmônica nem residência única — o critério é o melhor interesse da criança, e a alternância de lares é figura distinta.' },
    { k:'decisao', t:'Cumprimento: qual via?', art:'CPC, arts. 528 e 530',
      saidas:[
        { lado:'esq', rot:'coercitiva', k:'ato', t:'Prisão civil',
          sub:'1 a 3 meses, regime fechado, não quita a dívida',
          art:'CPC, art. 528, §§ 3º a 7º' },
        { lado:'dir', rot:'expropriatória', k:'ato', t:'Penhora e desconto',
          sub:'sem prisão, para as parcelas mais antigas', art:'CPC, arts. 528, § 8º, e 529' }
      ],
      nota:'Súmula 309 do STJ: o débito que autoriza a prisão é o das três prestações anteriores ao ajuizamento mais as vencidas no curso do processo. As anteriores cobram-se pela via expropriatória.' },
    { k:'ato', t:'Protesto e inscrição', art:'CPC, art. 528, §§ 1º e 3º',
      sub:'protesto do pronunciamento judicial e inclusão em cadastros de inadimplentes' },
    { k:'decisao', t:'Revisão e exoneração', art:'CC, art. 1.699',
      saidas:[
        { lado:'esq', rot:'mudou a fortuna', k:'ato', t:'Revisional',
          sub:'majoração ou redução' },
        { lado:'dir', rot:'cessou a necessidade', k:'ato', t:'Exoneratória',
          sub:'maioridade não exonera automaticamente' }
      ],
      nota:'Súmula 358 do STJ: o cancelamento da pensão do filho que atingiu a maioridade está sujeito a decisão judicial, mediante contraditório, ainda que nos próprios autos.' },
    { k:'terminal', t:'Sentença', art:'CPC, art. 487',
      sub:'cláusula rebus sic stantibus: a coisa julgada em alimentos é sempre condicionada',
      peca:'Sentença — treino guiado' }
  ]
},

/* ══════════════ SUCESSÕES — INVENTÁRIO E PARTILHA ══════════════ */
'Sucessões — inventário e partilha': {
  ramo: 'Sucessões', fonte: 'CC, arts. 1.784 a 2.027, e CPC, arts. 610 a 673',
  resumo: 'A herança se transmite no instante da morte; o inventário só apura e divide. A primeira decisão do caso é a via — extrajudicial, arrolamento ou inventário judicial.',
  passos: [
    { k:'inicio', t:'ABERTURA DA SUCESSÃO', sub:'saisine: transmissão imediata aos herdeiros', art:'CC, art. 1.784' },
    { k:'ato', t:'Prazos e foro', art:'CPC, arts. 611 e 48',
      sub:'instaurar em 2 meses, ultimar em 12 · foro do último domicílio do falecido',
      nota:'Súmula 542 do STF: não é inconstitucional a multa estadual pelo retardamento do início ou da ultimação do inventário. O prazo do art. 611 é impróprio, mas gera a sanção fiscal.' },
    { k:'decisao', t:'Qual via?', art:'CPC, arts. 610, 659 e 664',
      saidas:[
        { lado:'esq', rot:'consenso, maiores e capazes', k:'ato', t:'Escritura pública',
          sub:'extrajudicial, sem homologação judicial, com advogado',
          art:'CPC, art. 610, §§ 1º e 2º' },
        { lado:'dir', rot:'litígio ou incapaz', k:'ato', t:'Inventário judicial',
          sub:'ou arrolamento, se houver acordo ou pequeno valor',
          art:'CPC, arts. 659 e 664' }
      ],
      nota:'Arrolamento sumário: partilha amigável entre capazes (art. 659). Arrolamento comum: bens até 1.000 salários mínimos (art. 664). Havendo testamento, a via extrajudicial depende de prévio registro e autorização judicial.' },
    { k:'ato', t:'Primeiras declarações', art:'CPC, arts. 617 a 620',
      sub:'inventariante nomeado na ordem legal; relação de herdeiros e de bens',
      nota:'A nomeação segue a ordem do art. 617; o inventariante dativo não representa o espólio em juízo sem os herdeiros (art. 75, § 1º).' },
    { k:'decisao', t:'Impugnações', art:'CPC, arts. 627 e 628',
      saidas:[
        { lado:'esq', rot:'alta indagação', k:'ato', t:'Remessa às vias ordinárias',
          sub:'questão que depende de prova não documental', art:'CPC, art. 612' },
        { lado:'dir', rot:'documental', k:'ato', t:'Decide nos autos' }
      ],
      nota:'O juízo do inventário decide só o que se prova por documento. Petição de herança, reconhecimento de união estável controvertida e nulidade de testamento vão para ação própria.' },
    { k:'ato', t:'Colação e sonegados', art:'CC, arts. 2.002 a 2.012 e 1.992',
      sub:'doações aos descendentes conferem-se ao monte; sonegação faz perder o direito ao bem',
      nota:'A colação preserva a legítima. O valor a colacionar é o do bem ao tempo da abertura da sucessão (CPC, art. 639, parágrafo único).' },
    { k:'ato', t:'Avaliação e ITCMD', art:'CPC, arts. 630 a 638',
      nota:'Súmula 114 do STF: o imposto de transmissão causa mortis não é exigível antes da homologação do cálculo.' },
    { k:'terminal', t:'Partilha e formal', art:'CPC, arts. 647 a 658',
      sub:'esboço, julgamento por sentença e expedição do formal de partilha',
      peca:'Sentença — treino guiado',
      nota:'Partilha amigável entre capazes anula-se pelos vícios dos atos jurídicos, em 1 ano (art. 657); a partilha julgada por sentença rescinde-se nas hipóteses do art. 658.' }
  ]
},

/* ══════════════ REGISTROS PÚBLICOS — DÚVIDA REGISTRAL ══════════════ */
'Registros públicos — dúvida registral': {
  ramo: 'Registros públicos', fonte: 'Lei 6.015/73, arts. 198 a 204',
  resumo: 'Procedimento administrativo, não jurisdicional. O registrador qualifica o título; discordando o interessado, a dúvida sobe ao juiz corregedor — e a decisão não faz coisa julgada material.',
  passos: [
    { k:'inicio', t:'DÚVIDA REGISTRAL', art:'Lei 6.015/73, art. 198' },
    { k:'ato', t:'Qualificação e nota devolutiva', art:'Lei 6.015/73, arts. 198 e 205',
      sub:'o oficial aponta por escrito e de uma só vez todas as exigências',
      nota:'A qualificação é vinculada à legalidade do título, não ao mérito do negócio. Exigência nova depois de cumprida a anterior contraria o dever de apontar tudo de uma vez.' },
    { k:'decisao', t:'O interessado concorda?', art:'Lei 6.015/73, art. 198',
      saidas:[
        { lado:'esq', rot:'sim', k:'terminal', t:'Cumpre a exigência e registra' },
        { lado:'dir', rot:'não', k:'ato', t:'Requer a suscitação da dúvida',
          sub:'o oficial suscita; se recusar, cabe a dúvida inversa, formulada pelo próprio interessado' }
      ],
      nota:'A dúvida inversa não tem previsão na lei — é construção admitida na prática registral e na jurisprudência das corregedorias, para evitar que a inércia do oficial feche a via.' },
    { k:'ato', t:'Prenotação e prazo', art:'Lei 6.015/73, arts. 205 e 203',
      sub:'a prenotação fica prorrogada até 30 dias após a decisão',
      nota:'A ordem de prioridade do art. 186 se preserva enquanto durar a prenotação — perder o prazo é perder a preferência registral.' },
    { k:'ato', t:'Impugnação e parecer', art:'Lei 6.015/73, arts. 200 e 201',
      sub:'interessado impugna em 15 dias · Ministério Público opina em 10 dias' },
    { k:'decisao', t:'Sentença do juiz corregedor', art:'Lei 6.015/73, art. 203',
      saidas:[
        { lado:'esq', rot:'procedente', k:'terminal', t:'Registro negado',
          sub:'devolve-se o título ao interessado' },
        { lado:'dir', rot:'improcedente', k:'terminal', t:'Registro determinado',
          sub:'o oficial procede ao registro' }
      ] },
    { k:'recurso', t:'Apelação administrativa', art:'Lei 6.015/73, art. 202',
      sub:'ao Conselho Superior da Magistratura, com ciência ao Ministério Público',
      nota:'Art. 204: a decisão da dúvida tem natureza administrativa e não impede o uso do processo contencioso competente — não há coisa julgada material.' }
  ]
},

/* ══════════════ CONTROLE EXTERNO — PROCESSO DE CONTAS ══════════════ */
'Controle externo — processo de contas': {
  ramo: 'Controle externo', fonte: 'CF, arts. 70 a 75, e Lei 8.443/92',
  resumo: 'Duas coisas que a prova sempre separa: contas de governo, que a Casa Legislativa julga com parecer prévio do Tribunal, e contas de gestão, que o próprio Tribunal julga.',
  passos: [
    { k:'inicio', t:'CONTROLE EXTERNO', art:'CF, art. 70' },
    { k:'decisao', t:'Que espécie de conta?', art:'CF, arts. 49, IX, e 71, I e II',
      saidas:[
        { lado:'esq', rot:'de governo', k:'ato', t:'Parecer prévio',
          sub:'o julgamento é do Legislativo', art:'CF, art. 71, I' },
        { lado:'dir', rot:'de gestão', k:'ato', t:'Julgamento pelo Tribunal',
          sub:'administradores e demais responsáveis por dinheiro público', art:'CF, art. 71, II' }
      ],
      nota:'STF, RE 848.826, Tema 835, j. 10/08/2016: para fins da inelegibilidade do art. 1º, I, "g", da LC 64/90, a apreciação das contas de PREFEITO — de governo e de gestão — compete à Câmara Municipal, com o parecer prévio do Tribunal de Contas, que só deixa de prevalecer por decisão de dois terços.' },
    { k:'decisao', t:'Como se instaura', art:'Lei 8.443/92, arts. 7º a 9º e 47',
      saidas:[
        { lado:'esq', rot:'ordinária', k:'ato', t:'Prestação de contas anual' },
        { lado:'dir', rot:'dano ao erário', k:'ato', t:'Tomada de contas especial',
          sub:'omissão no dever de prestar, irregularidade ou desfalque' }
      ] },
    { k:'ato', t:'Contraditório do responsável', art:'CF, art. 5º, LV',
      sub:'citação, defesa e produção de prova',
      nota:'Súmula Vinculante 3: nos processos perante o TCU asseguram-se contraditório e ampla defesa quando a decisão puder anular ou revogar ato administrativo que beneficie o interessado — excetuada a apreciação da legalidade do ato de concessão inicial de aposentadoria, reforma e pensão.' },
    { k:'decisao', t:'Julgamento', art:'Lei 8.443/92, arts. 16 e 19',
      saidas:[
        { lado:'esq', rot:'regulares', k:'terminal', t:'Quitação',
          sub:'plena ou com ressalva' },
        { lado:'dir', rot:'irregulares', k:'ato', t:'Débito e multa',
          sub:'e, nos casos graves, inabilitação para cargo em comissão por 5 a 8 anos',
          art:'Lei 8.443/92, arts. 19 e 60' }
      ],
      nota:'O acórdão condenatório é título executivo extrajudicial (CF, art. 71, § 3º) — mas quem executa é o ente credor, não o Tribunal.' },
    { k:'ato', t:'Prescrição', art:'CF, art. 37, § 5º',
      nota:'STF, RE 636.886, Tema 899, j. 20/04/2020: é PRESCRITÍVEL a pretensão de ressarcimento ao erário fundada em decisão de Tribunal de Contas. Imprescritível só o ressarcimento decorrente de ato doloso de improbidade (Tema 897).' },
    { k:'decisao', t:'Impugnação', art:'Lei 8.443/92, arts. 32 a 35',
      saidas:[
        { lado:'esq', rot:'no Tribunal', k:'recurso', t:'Reconsideração, embargos e revisão' },
        { lado:'dir', rot:'no Judiciário', k:'recurso', t:'Mandado de segurança',
          sub:'controle limitado à legalidade e ao devido processo' }
      ],
      peca:'Habeas corpus',
      nota:'STF, RE 636.553, Tema 445, j. 19/02/2020: o TCU tem 5 anos, contados da chegada do processo, para julgar a legalidade da concessão inicial de aposentadoria, reforma ou pensão — findo o prazo, o ato se considera registrado tacitamente.' }
  ]
},

/* ══════════════ CONSTITUCIONAL — CONTROLE CONCENTRADO ══════════════ */
'Constitucional — controle concentrado': {
  ramo: 'Constitucional', fonte: 'CF, art. 102, I, "a", Lei 9.868/99 e Lei 9.882/99',
  resumo: 'Processo objetivo: não há partes, não há lide, não se desiste e não cabe intervenção de terceiros. Escolher a ação certa é metade da questão.',
  passos: [
    { k:'inicio', t:'CONTROLE CONCENTRADO', art:'CF, art. 102, I, "a"' },
    { k:'decisao', t:'Qual ação?', art:'Leis 9.868/99 e 9.882/99',
      saidas:[
        { lado:'esq', rot:'lei federal ou estadual pós-88', k:'ato', t:'ADI ou ADC',
          sub:'ADC só de lei ou ato normativo FEDERAL', art:'CF, art. 102, I, "a"' },
        { lado:'dir', rot:'preceito fundamental e não cabe outra', k:'ato', t:'ADPF',
          sub:'inclusive contra direito pré-constitucional e municipal', art:'Lei 9.882/99, art. 1º' }
      ],
      nota:'A ADPF é subsidiária: só cabe quando não houver outro meio eficaz de sanar a lesividade (art. 4º, § 1º). Lei municipal e norma anterior à Constituição não são objeto de ADI.' },
    { k:'decisao', t:'Legitimidade', art:'CF, art. 103',
      saidas:[
        { lado:'esq', rot:'universais', k:'ato', t:'Sem pertinência temática',
          sub:'Presidente, Mesas do Senado e da Câmara, PGR, Conselho Federal da OAB e partido com representação' },
        { lado:'dir', rot:'especiais', k:'ato', t:'Com pertinência temática',
          sub:'Governador, Mesa de Assembleia e confederação sindical ou entidade de classe' }
      ],
      nota:'A pertinência temática é exigência jurisprudencial, não textual. Entidade de classe de âmbito nacional exige representatividade em pelo menos nove Estados, por aplicação analógica da Lei dos Partidos.' },
    { k:'ato', t:'Instrução do processo objetivo', art:'Lei 9.868/99, arts. 6º a 9º',
      sub:'informações da autoridade em 30 dias · AGU defende o ato · PGR opina em 15 dias · amicus curiae',
      nota:'A AGU não é obrigada a defender a norma quando o STF já a declarou inconstitucional ou quando contraria interesse da União. O amicus curiae entra por decisão irrecorrível do relator (art. 7º, § 2º).' },
    { k:'decisao', t:'Cautelar', art:'Lei 9.868/99, arts. 10 e 11',
      saidas:[
        { lado:'dir', rot:'concedida', k:'ato', t:'Suspensão da eficácia',
          sub:'por maioria absoluta, com efeito ex nunc, salvo decisão em contrário' }
      ],
      nota:'Concedida a cautelar em ADI, torna-se aplicável a legislação anterior, salvo manifestação expressa em sentido contrário (art. 11, § 2º) — é o efeito repristinatório tácito.' },
    { k:'ato', t:'Julgamento', art:'Lei 9.868/99, arts. 22 e 23',
      sub:'quórum de 8 ministros para instalar e 6 votos para declarar',
      nota:'Sem os 6 votos e ausentes ministros que possam alterar o resultado, o julgamento é suspenso (art. 23, parágrafo único).' },
    { k:'decisao', t:'Efeitos', art:'Lei 9.868/99, arts. 27 e 28',
      saidas:[
        { lado:'esq', rot:'regra', k:'ato', t:'Erga omnes, vinculante, ex tunc' },
        { lado:'dir', rot:'modulação', k:'ato', t:'Ex nunc ou outro momento',
          sub:'por 2/3, razões de segurança jurídica ou excepcional interesse social',
          art:'Lei 9.868/99, art. 27' }
      ],
      nota:'O efeito vinculante alcança os demais órgãos do Judiciário e a Administração direta e indireta — não o Legislativo em sua função típica, nem o próprio STF.' },
    { k:'terminal', t:'Irrecorribilidade', art:'Lei 9.868/99, art. 26',
      sub:'a decisão é irrecorrível, ressalvados embargos de declaração, e não cabe ação rescisória',
      nota:'Descumprido o julgado, o instrumento é a reclamação (CF, art. 102, I, "l").' }
  ]
},

/* ══════════════ AMBIENTAL — AÇÃO CIVIL PÚBLICA ══════════════ */
'Ambiental — ação civil pública': {
  ramo: 'Ambiental', fonte: 'Lei 7.347/85 e Lei 6.938/81',
  resumo: 'Responsabilidade objetiva, solidária e aderente à coisa. Duas armadilhas frequentes: a competência é do local do dano, e a coisa julgada não se limita mais ao território do juízo.',
  passos: [
    { k:'inicio', t:'TUTELA COLETIVA AMBIENTAL', art:'CF, art. 225, e Lei 7.347/85' },
    { k:'ato', t:'Inquérito civil', art:'Lei 7.347/85, art. 8º, § 1º',
      sub:'exclusivo do Ministério Público; peça informativa, dispensável à ação',
      nota:'O arquivamento é submetido ao Conselho Superior do MP em 3 dias (art. 9º). A ação pode ser proposta sem inquérito, com prova própria.' },
    { k:'decisao', t:'Solução consensual?', art:'Lei 7.347/85, art. 5º, § 6º',
      saidas:[
        { lado:'esq', rot:'sim', k:'terminal', t:'Compromisso de ajustamento',
          sub:'título executivo extrajudicial, tomado pelos órgãos públicos legitimados' },
        { lado:'dir', rot:'não', k:'ato', t:'Petição inicial da ACP',
          peca:'ACP ambiental' }
      ] },
    { k:'ato', t:'Legitimidade e competência', art:'Lei 7.347/85, arts. 2º e 5º',
      sub:'MP, Defensoria, entes federativos, autarquias, empresas públicas, fundações e associações com 1 ano de constituição',
      nota:'A competência do local do dano é FUNCIONAL e absoluta. O requisito de um ano de constituição da associação pode ser dispensado pelo juiz diante do interesse social (art. 5º, § 4º).' },
    { k:'ato', t:'Regime de responsabilidade', art:'Lei 6.938/81, art. 14, § 1º',
      sub:'objetiva, pela teoria do risco integral, e solidária entre todos os poluidores',
      nota:'Súmula 623 do STJ: as obrigações ambientais têm natureza propter rem, cobráveis do proprietário ou possuidor atual e dos anteriores, à escolha do credor. Súmula 618: inverte-se o ônus da prova. Súmula 613: não se aplica a teoria do fato consumado.' },
    { k:'decisao', t:'Tutela de urgência', art:'Lei 7.347/85, arts. 4º e 12',
      saidas:[
        { lado:'esq', rot:'preventiva', k:'ato', t:'Ação cautelar',
          sub:'para evitar o dano' },
        { lado:'dir', rot:'liminar', k:'ato', t:'Liminar com ou sem justificação',
          sub:'cabe agravo; e suspensão pelo presidente do tribunal', art:'Lei 7.347/85, art. 12, § 1º' }
      ] },
    { k:'ato', t:'Sentença e execução', art:'Lei 7.347/85, arts. 11 e 13',
      sub:'obrigação de fazer ou não fazer com multa · indenização ao fundo de reparação',
      nota:'STF, RE 654.833, Tema 999, j. 20/04/2020: é imprescritível a pretensão de reparação civil de dano ambiental.' },
    { k:'terminal', t:'Coisa julgada', art:'Lei 7.347/85, art. 16',
      sub:'erga omnes, salvo improcedência por insuficiência de provas',
      nota:'STF, RE 1.101.937, Tema 1075, j. 08/04/2021: é inconstitucional a limitação territorial dos efeitos da coisa julgada introduzida pela Lei 9.494/97. O art. 18 dispensa o autor de custas e honorários, salvo má-fé.' }
  ]
},

/* ══════════════════════ ELEITORAL — AÇÕES ══════════════════════ */
'Eleitoral — ações': {
  ramo: 'Eleitoral', fonte: 'LC 64/90, Lei 9.504/97 e Código Eleitoral',
  resumo: 'Cada ação tem janela temporal própria e sanção própria. O que a prova cobra é o par: qual o fato, qual a ação, qual o prazo e o que se perde.',
  passos: [
    { k:'inicio', t:'CONTENCIOSO ELEITORAL', art:'LC 64/90 e Lei 9.504/97' },
    { k:'decisao', t:'Quando o fato aconteceu?', art:'LC 64/90, art. 22, e CF, art. 14, § 10',
      saidas:[
        { lado:'esq', rot:'até a diplomação', k:'ato', t:'AIJE',
          sub:'abuso do poder econômico ou político, uso indevido dos meios de comunicação',
          art:'LC 64/90, art. 22' },
        { lado:'dir', rot:'após a diplomação', k:'ato', t:'AIME',
          sub:'15 dias da diplomação · abuso econômico, corrupção ou fraude',
          art:'CF, art. 14, §§ 10 e 11' }
      ],
      nota:'A AIME corre em segredo de justiça e é julgada publicamente (art. 14, § 11). A AIJE pode ser proposta desde o registro e até a diplomação.' },
    { k:'ato', t:'Registro de candidatura e impugnação', art:'LC 64/90, arts. 3º a 16',
      sub:'AIRC em 5 dias da publicação do pedido de registro',
      nota:'As inelegibilidades do art. 1º da LC 64/90, com a redação da LC 135/2010, geram 8 anos de inelegibilidade — a chamada Lei da Ficha Limpa.' },
    { k:'decisao', t:'Conduta durante a campanha', art:'Lei 9.504/97, arts. 30-A, 41-A e 73',
      saidas:[
        { lado:'esq', rot:'captação ilícita de sufrágio', k:'ato', t:'Representação do art. 41-A',
          sub:'multa e cassação do registro ou do diploma' },
        { lado:'dir', rot:'conduta vedada a agente público', k:'ato', t:'Representação do art. 73',
          sub:'multa e cassação, conforme a gravidade', art:'Lei 9.504/97, art. 73, §§ 4º e 5º' }
      ],
      nota:'A captação ilícita independe do pedido explícito de votos e da aferição de potencialidade lesiva — basta a prova da conduta. Já as condutas vedadas exigem exame de proporcionalidade para a cassação.' },
    { k:'ato', t:'Arrecadação e gastos', art:'Lei 9.504/97, art. 30-A',
      sub:'representação por captação ou gasto ilícito de recursos, até a diplomação · negativa do diploma',
      nota:'O art. 30-A exige proporcionalidade entre a irregularidade e a sanção — não é qualquer erro de contabilidade que cassa.' },
    { k:'decisao', t:'Depois de diplomado', art:'Código Eleitoral, art. 262',
      saidas:[
        { lado:'dir', rot:'3 dias', k:'recurso', t:'RCED',
          sub:'inelegibilidade superveniente ou de natureza constitucional e falta de condição de elegibilidade' }
      ],
      nota:'O recurso contra a expedição do diploma teve o objeto reduzido pela Lei 12.891/2013: hoje se limita às hipóteses do art. 262, e não serve para rediscutir abuso já apreciável em AIJE.' },
    { k:'ato', t:'Ação penal eleitoral', art:'Código Eleitoral, arts. 355 a 364',
      sub:'crimes eleitorais são de ação pública incondicionada, com rito próprio',
      peca:'Denúncia' },
    { k:'recurso', t:'Recursos', art:'Código Eleitoral, arts. 265 a 282',
      sub:'3 dias, em regra · recurso especial eleitoral ao TSE e recurso extraordinário ao STF',
      nota:'Prazos eleitorais são peremptórios e contínuos, e não se suspendem no período eleitoral (art. 16 da LC 64/90).' }
  ]
},

/* ══════════ EMPRESARIAL — RECUPERAÇÃO E FALÊNCIA ══════════ */
'Empresarial — recuperação e falência': {
  ramo: 'Empresarial', fonte: 'Lei 11.101/2005, com a Lei 14.112/2020',
  resumo: 'Recuperação é remédio para empresa viável; falência é liquidação. O stay period, o quórum da assembleia e a classificação dos créditos concentram quase tudo que se cobra.',
  passos: [
    { k:'inicio', t:'CRISE DA EMPRESA', art:'Lei 11.101/2005, art. 1º' },
    { k:'decisao', t:'Qual caminho?', art:'Lei 11.101/2005, arts. 47 e 75',
      saidas:[
        { lado:'esq', rot:'empresa viável', k:'ato', t:'Recuperação judicial',
          sub:'exercício regular há mais de 2 anos e requisitos do art. 48' },
        { lado:'dir', rot:'inviável', k:'ato', t:'Falência',
          sub:'impontualidade acima de 40 salários, execução frustrada ou ato de falência',
          art:'Lei 11.101/2005, art. 94' }
      ],
      nota:'Não se sujeitam à recuperação os créditos com garantia fiduciária, o arrendamento mercantil e o adiantamento de contrato de câmbio (art. 49, §§ 3º e 4º) — a chamada trava bancária.' },
    { k:'ato', t:'Deferimento do processamento', art:'Lei 11.101/2005, art. 52',
      sub:'nomeia administrador judicial, dispensa certidões negativas e determina a suspensão das execuções',
      nota:'Deferir o processamento não é conceder a recuperação. São dois momentos distintos, e a banca troca um pelo outro.' },
    { k:'ato', t:'Stay period', art:'Lei 11.101/2005, art. 6º, §§ 4º e 5º',
      sub:'180 dias de suspensão das execuções, prorrogáveis uma única vez por igual período',
      nota:'Súmula 581 do STJ: a recuperação do devedor principal não impede o prosseguimento das execuções contra coobrigados e garantidores. Créditos fiscais não se suspendem, mas atos de constrição sujeitam-se ao juízo da recuperação.' },
    { k:'ato', t:'Plano e objeções', art:'Lei 11.101/2005, arts. 53 e 55',
      sub:'plano em 60 dias improrrogáveis · credores objetam em 30 dias',
      nota:'Não havendo objeção, o juiz concede a recuperação sem assembleia. Havendo, convoca-se a AGC (art. 56).' },
    { k:'decisao', t:'Assembleia-geral de credores', art:'Lei 11.101/2005, arts. 41 a 45',
      saidas:[
        { lado:'esq', rot:'aprova', k:'ato', t:'Concessão da recuperação',
          sub:'quórum por classe; classes I e IV por cabeça, II e III por cabeça e por crédito',
          art:'Lei 11.101/2005, art. 58' },
        { lado:'dir', rot:'rejeita', k:'decisao', t:'Cabe cram down?',
          sub:'requisitos do art. 58, § 1º', art:'Lei 11.101/2005, art. 58, § 1º' }
      ],
      nota:'Rejeitado o plano e ausentes os requisitos do cram down, o juiz decreta a falência (art. 56, § 4º). A Lei 14.112/2020 admitiu o plano alternativo apresentado pelos credores.' },
    { k:'ato', t:'Fiscalização por 2 anos', art:'Lei 11.101/2005, arts. 61 e 62',
      sub:'descumprimento nesse período convola em falência',
      nota:'Descumprimento depois dos 2 anos não convola: o credor executa o crédito ou requer a falência pela via comum (art. 62).' },
    { k:'ato', t:'Falência: efeitos e classificação', art:'Lei 11.101/2005, arts. 83, 99 e 141',
      sub:'trabalhistas até 150 salários · garantia real · tributários · quirografários · multas · subordinados',
      nota:'Art. 141, II: o arrematante na alienação judicial não sucede nas obrigações do devedor, inclusive trabalhistas e tributárias — regra central para viabilizar a venda de ativos.' },
    { k:'terminal', t:'Encerramento e extinção das obrigações', art:'Lei 11.101/2005, arts. 156 a 159',
      nota:'A Lei 14.112/2020 reduziu os prazos de extinção das obrigações do falido e criou a possibilidade de conciliação e mediação antecedentes (arts. 20-A a 20-D).' }
  ]
},
/* ══════════════════════ PENAL — RECURSOS ══════════════════════ */
'Penal — recursos': {
  ramo: 'Penal', fonte: 'CPP, arts. 574 a 667',
  resumo: 'O sistema recursal penal é taxativo e assimétrico: prazos curtos, rol fechado no RESE e a proibição da reformatio in pejus como limite permanente do tribunal.',
  passos: [
    { k:'inicio', t:'RECURSOS NO PROCESSO PENAL', art:'CPP, art. 574' },
    { k:'ato', t:'Embargos de declaração — 2 dias', art:'CPP, art. 382',
      sub:'ambiguidade, obscuridade, contradição ou omissão',
      peca:'Embargos de declaração',
      nota:'No tribunal o prazo dos embargos é de 5 dias (art. 619). Interrompem o prazo dos demais recursos.' },
    { k:'decisao', t:'O que foi decidido?', art:'CPP, arts. 581 e 593',
      saidas:[
        { lado:'esq', rot:'interlocutória do rol', k:'ato', t:'RESE — 5 dias',
          sub:'rol taxativo do art. 581, com juízo de retratação em 2 dias',
          art:'CPP, arts. 581, 586 e 589' },
        { lado:'dir', rot:'sentença definitiva', k:'ato', t:'Apelação',
          sub:'5 dias para interpor, 8 para arrazoar', art:'CPP, arts. 593 e 600' }
      ],
      peca:'Apelação criminal',
      nota:'O rol do art. 581 é taxativo, mas admite interpretação extensiva — não analogia. Decisão fora dele e não recorrível ataca-se por habeas corpus ou mandado de segurança.' },
    { k:'ato', t:'Efeitos e prisão', art:'CPP, arts. 597 e 387, § 1º',
      sub:'a apelação de sentença condenatória tem efeito suspensivo, salvo no júri',
      nota:'Súmula 347 do STJ: o conhecimento do recurso de apelação do réu independe de sua prisão. A fuga não é causa de deserção.' },
    { k:'decisao', t:'No tribunal', art:'CPP, art. 617',
      saidas:[
        { lado:'esq', rot:'só a defesa recorreu', k:'ato', t:'Vedada a reformatio in pejus',
          sub:'a pena não pode ser agravada', art:'CPP, art. 617' },
        { lado:'dir', rot:'a acusação recorreu', k:'ato', t:'Pode agravar',
          sub:'nos limites da devolução' }
      ],
      nota:'A vedação alcança também a reformatio in pejus indireta: anulada a sentença por recurso exclusivo da defesa, a nova decisão não pode impor pena mais grave. Súmula 160 do STF: nulidade não arguida no recurso da acusação não pode ser declarada em prejuízo do réu.' },
    { k:'ato', t:'Protesto por novo júri — extinto', art:'Lei 11.689/2008',
      sub:'revogado; hoje a via é a apelação do art. 593, III',
      nota:'Continua caindo em prova exatamente porque foi revogado. Não existe mais no ordenamento.' },
    { k:'recurso', t:'Recursos aos tribunais superiores', art:'CF, arts. 102, III, e 105, III',
      sub:'esgotamento da instância, prequestionamento e, no RE, repercussão geral',
      nota:'Súmula 279 do STF: não cabe RE para simples reexame de prova. Súmula 7 do STJ, no mesmo sentido, para o recurso especial. Inadmitidos, cabe agravo do art. 1.042 do CPC.' },
    { k:'decisao', t:'Fora do sistema recursal', art:'CPP, arts. 621 e 647',
      saidas:[
        { lado:'esq', rot:'depois do trânsito', k:'ato', t:'Revisão criminal',
          sub:'só em favor do réu, a qualquer tempo, sem prazo',
          art:'CPP, arts. 621 a 631' },
        { lado:'dir', rot:'liberdade em risco', k:'ato', t:'Habeas corpus',
          art:'CPP, art. 647' }
      ],
      peca:'Habeas corpus',
      nota:'Não existe revisão criminal pro societate. Súmula 393 do STF: para requerer revisão criminal, o condenado não é obrigado a recolher-se à prisão.' }
  ]
}

};
