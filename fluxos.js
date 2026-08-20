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
}

};
