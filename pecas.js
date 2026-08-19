/* Cátedra — ROTEIRO DE PEÇAS.
 *
 * O mapa de "Processo e peças" (ritos.js) mostra a SEQUÊNCIA dos atos. Este arquivo é a
 * camada de baixo: clicando num ato que é peça (✍️), abre o esqueleto dela — os blocos
 * na ordem, o que cada um tem de conter, o dispositivo que manda, a jurisprudência que
 * costuma cair ali e o erro que custa ponto.
 *
 * Diferença deliberada em relação ao ritos.js: AQUI os números de artigo aparecem.
 * No mapa eles envelheceriam sem necessidade (o rótulo nomeia o instituto e o texto vem
 * do acervo); num roteiro de peça o número É o conteúdo — é o que a pessoa escreve na
 * folha. Ainda assim, cada item leva o rótulo do instituto, e clicar abre o texto
 * integral no CátedraLEGIS / CátedraJURIS: o número é conferível, não é para decorar
 * daqui.
 *
 * Escrito por mim (Cátedra), a partir da lei e da jurisprudência — não é transcrição de
 * material de curso. Confira antes de levar para a prova.
 *
 * Formato:
 *   chave = rótulo da peça, igual ao que aparece em ritos.js depois do ✍️
 *   { rito, sobre, blocos:[{ nome, deve, lei:[], juris:[], erro }], cego:[] }
 *     lei/juris  → viram botões que abrem o acervo naquele termo
 *     cego       → checklist do "modo cego": some o roteiro, fica só a lista
 */
window.CT_PECAS = {

// ─────────────────────────────── SENTENÇA CÍVEL ───────────────────────────────
'Sentença — treino guiado': {
  rito: 'Civil — conhecimento',
  sobre: 'A peça que decide a prova de magistratura. Três elementos essenciais (relatório, fundamentação, dispositivo) e um punhado de itens que a banca conta um a um no espelho: prescrição enfrentada, congruência com o pedido, juros e correção com termo inicial, sucumbência, e o que fazer com a tutela concedida antes.',
  blocos: [
    { nome: 'Cabeçalho e relatório',
      deve: 'Nomes das partes, suma do pedido e da defesa, e o registro das principais ocorrências do processo. Relatório é histórico, não é opinião: nada de adiantar convencimento aqui.',
      lei: ['Elementos essenciais da sentença — CPC, art. 489, I',
            'Relatório dispensado no Juizado — Lei 9.099/95, art. 38'],
      juris: [],
      erro: 'Escrever meia página de fatos e esquecer a suma da CONTESTAÇÃO. O espelho cobra os dois lados.' },

    { nome: 'Questões prévias e preliminares',
      deve: 'Enfrentar, antes do mérito, o que impede julgá-lo: pressupostos processuais, condições da ação, e as preliminares que a parte levantou. Rejeitar também é enfrentar — e tem de vir fundamentado.',
      lei: ['Extinção sem resolução de mérito — CPC, art. 485',
            'Preliminares de contestação — CPC, art. 337',
            'Matérias cognoscíveis de ofício — CPC, art. 337, § 5º'],
      juris: [],
      erro: 'Ir direto ao mérito deixando uma preliminar sem resposta. Preliminar não enfrentada é ponto perdido no espelho e nulidade por omissão na vida real.' },

    { nome: 'Prescrição e decadência',
      deve: 'Se houver, decidir. Reconhecer de ofício é possível, mas só depois de ouvir as partes — decisão surpresa é vedada.',
      lei: ['Resolução de mérito por prescrição ou decadência — CPC, art. 487, II',
            'Contraditório prévio antes de decidir de ofício — CPC, art. 487, parágrafo único',
            'Vedação à decisão surpresa — CPC, art. 10'],
      juris: ['Prescrição — termo inicial'],
      erro: 'Reconhecer prescrição de ofício sem abrir prazo. O art. 487, parágrafo único, é exatamente esse ponto e é dos mais cobrados.' },

    { nome: 'Fundamentação — os fatos',
      deve: 'Dizer o que ficou provado e por quê, apontando a prova. Distribuir o ônus da prova quando ele decidir a causa, e justificar se houver distribuição dinâmica.',
      lei: ['Ônus da prova — CPC, art. 373',
            'Distribuição dinâmica — CPC, art. 373, § 1º',
            'Livre apreciação motivada — CPC, art. 371'],
      juris: [],
      erro: 'Dizer "restou comprovado" sem apontar QUAL prova. O art. 489, § 1º, é a régua da banca: fundamentação genérica não é fundamentação.' },

    { nome: 'Fundamentação — o direito',
      deve: 'Enfrentar todos os argumentos capazes de infirmar a conclusão. Se invocar súmula, precedente ou enunciado, identificar seus fundamentos determinantes e mostrar que o caso se ajusta. Se deixar de aplicar precedente invocado pela parte, distinguir ou superar.',
      lei: ['Sentença não fundamentada — CPC, art. 489, § 1º',
            'Colisão de normas — CPC, art. 489, § 2º',
            'Precedentes obrigatórios — CPC, art. 927',
            'Distinção e superação — CPC, art. 489, § 1º, V e VI'],
      juris: ['Fundamentação — dever de enfrentamento'],
      erro: 'Citar a ementa de um precedente sem mostrar por que ele se aplica AQUI. O inciso V pune exatamente isso.' },

    { nome: 'Dispositivo',
      deve: 'Acolher ou rejeitar, no todo ou em parte, os pedidos — nos limites do que foi pedido. Decisão certa, líquida sempre que possível, com a extensão da obrigação definida desde logo.',
      lei: ['Resolução do mérito — CPC, art. 487, I',
            'Limites do pedido — CPC, art. 490 e art. 492',
            'Congruência — CPC, art. 141',
            'Obrigação de pagar: extensão, índice, juros e termo inicial — CPC, art. 491',
            'Prestações periódicas — CPC, art. 323'],
      juris: [],
      erro: 'Julgar ultra ou extra petita. E, no pedido de pagar quantia, esquecer que o art. 491 manda definir índice, juros e termos iniciais NA SENTENÇA — não deixar para a liquidação.' },

    { nome: 'Juros, correção e termos iniciais',
      deve: 'Fixar índice e termo inicial de cada um, e dizer de onde vêm. Dano moral corrige do arbitramento; responsabilidade extracontratual tem juros do evento danoso; dano material corrige do efetivo prejuízo. Contra a Fazenda, o regime é próprio.',
      lei: ['Juros e correção — CC, arts. 389 e 406',
            'Atualização das condenações contra a Fazenda — CPC, art. 534'],
      juris: ['Súmula 362 do STJ', 'Súmula 54 do STJ', 'Súmula 43 do STJ',
              'Tema 810 do STF', 'Tema 905 do STJ'],
      erro: 'Escrever "juros e correção na forma da lei". A banca quer o índice, o termo inicial e a fonte de cada um — é onde a sentença mais perde ponto por preguiça.' },

    { nome: 'Sucumbência',
      deve: 'Custas e honorários ao vencido, com o percentual dentro da faixa legal. Se cada parte perdeu em algo, distribuir proporcionalmente; se a perda de uma foi mínima, a outra responde por tudo. Contra a Fazenda, os percentuais escalonados por faixa de valor.',
      lei: ['Honorários advocatícios — CPC, art. 85, §§ 2º e 3º',
            'Honorários por equidade — CPC, art. 85, § 8º',
            'Sucumbência recíproca e mínima — CPC, art. 86',
            'Custas ao vencido — CPC, art. 82, § 2º',
            'Gratuidade: suspensão da exigibilidade — CPC, art. 98, § 3º'],
      juris: ['Honorários — sucumbência recíproca', 'Tema 1076 do STJ'],
      erro: 'Arbitrar honorários "por equidade" numa causa de valor alto. O § 8º só entra quando o proveito é inestimável, irrisório ou o valor da causa muito baixo — fora disso, é a faixa do § 2º.' },

    { nome: 'Providências finais',
      deve: 'Confirmar, revogar ou modificar a tutela concedida antes. Verificar se cabe remessa necessária. Publique-se, registre-se, intimem-se.',
      lei: ['Tutela: confirmação na sentença — CPC, art. 296',
            'Remessa necessária — CPC, art. 496',
            'Dispensa da remessa — CPC, art. 496, §§ 3º e 4º',
            'Hipoteca judiciária — CPC, art. 495',
            'Alteração da sentença publicada — CPC, art. 494'],
      juris: [],
      erro: 'Não dizer nada sobre a liminar que foi deferida no começo do processo. A sentença tem de resolver a sorte dela — silêncio aqui é item em branco no espelho.' }
  ],
  cego: [
    'Relatório com a suma do pedido E da defesa',
    'Preliminares enfrentadas uma a uma',
    'Prescrição/decadência decidida (e, se de ofício, com contraditório prévio)',
    'Prova apontada, não só afirmada',
    'Ônus da prova distribuído quando decide a causa',
    'Todos os argumentos capazes de infirmar a conclusão enfrentados',
    'Dispositivo dentro dos limites do pedido',
    'Extensão da obrigação, índice, juros e termos iniciais fixados',
    'Sucumbência com percentual e regra (art. 85 ou 86)',
    'Sorte da tutela provisória resolvida',
    'Remessa necessária verificada'
  ]
},

// ─────────────────────────────── SENTENÇA PENAL ───────────────────────────────
'Sentença penal — treino guiado': {
  rito: 'Penal — procedimento comum',
  sobre: 'Absolvição ou condenação, e — se condenar — a dosimetria em três fases, que é onde a banca conta ponto por ponto. Fundamentar cada circunstância: pena aumentada sem motivo escrito é nulidade.',
  blocos: [
    { nome: 'Relatório',
      deve: 'Partes, imputação, síntese da acusação e da defesa, e as ocorrências relevantes da instrução.',
      lei: ['Requisitos da sentença penal — CPP, art. 381'],
      juris: [],
      erro: 'Copiar a denúncia inteira em vez de resumir a imputação.' },

    { nome: 'Materialidade e autoria',
      deve: 'Dizer se estão provadas e com base em quê. Prova produzida em juízo — elemento de inquérito não confirmado não sustenta condenação sozinho.',
      lei: ['Fundamento da convicção — CPP, art. 155',
            'Exame de corpo de delito — CPP, art. 158',
            'Desaparecimento dos vestígios — CPP, art. 167'],
      juris: ['Cadeia de custódia', 'Prova exclusivamente inquisitorial'],
      erro: 'Condenar apoiado só no que foi colhido no inquérito. O art. 155 é explícito e a banca cobra.' },

    { nome: 'Tipicidade, ilicitude e culpabilidade',
      deve: 'Enfrentar as teses defensivas: atipicidade, excludentes, causas de exclusão da culpabilidade, e a desclassificação se pedida.',
      lei: ['Exclusão da ilicitude — CP, art. 23',
            'Erro de tipo — CP, art. 20',
            'Erro de proibição — CP, art. 21',
            'Absolvição — CPP, art. 386'],
      juris: ['Princípio da insignificância'],
      erro: 'Absolver sem dizer em qual inciso do art. 386 — os efeitos de cada um são diferentes.' },

    { nome: 'Dosimetria — 1ª fase (pena-base)',
      deve: 'Percorrer as oito circunstâncias do art. 59 e fundamentar CADA uma que for valorada negativamente. Partir do mínimo e justificar o afastamento.',
      lei: ['Circunstâncias judiciais — CP, art. 59',
            'Fixação da pena — CP, art. 68'],
      juris: ['Súmula 444 do STJ', 'Súmula 241 do STJ', 'Dosimetria — pena-base'],
      erro: 'Elevar a pena-base com frase genérica ("circunstâncias desfavoráveis"), ou usar inquéritos e ações em curso como maus antecedentes — a Súmula 444 do STJ veda.' },

    { nome: 'Dosimetria — 2ª fase (agravantes e atenuantes)',
      deve: 'Aplicar as agravantes e atenuantes. A pena provisória não desce abaixo do mínimo nem sobe acima do máximo legal.',
      lei: ['Agravantes — CP, arts. 61 e 62',
            'Atenuantes — CP, art. 65',
            'Concurso de circunstâncias — CP, art. 67'],
      juris: ['Súmula 231 do STJ', 'Confissão espontânea — atenuante'],
      erro: 'Baixar abaixo do mínimo por atenuante. A Súmula 231 do STJ é o enunciado mais cobrado da dosimetria.' },

    { nome: 'Dosimetria — 3ª fase (causas de aumento e diminuição)',
      deve: 'Aplicar as causas de aumento e de diminuição, indicando a fração e por quê. Aqui a pena pode passar do máximo ou ficar abaixo do mínimo.',
      lei: ['Concurso material — CP, art. 69',
            'Concurso formal — CP, art. 70',
            'Crime continuado — CP, art. 71',
            'Tentativa — CP, art. 14, parágrafo único'],
      juris: ['Crime continuado — requisitos'],
      erro: 'Escolher a fração sem justificar. Na continuidade delitiva a fração varia com o NÚMERO de crimes, e a banca quer ver esse raciocínio escrito.' },

    { nome: 'Regime, substituição e efeitos',
      deve: 'Fixar o regime inicial pela pena e pelas circunstâncias; examinar substituição por restritivas de direitos e sursis; decidir sobre recorrer em liberdade; fixar o valor mínimo de reparação quando houver pedido.',
      lei: ['Regime inicial — CP, art. 33, §§ 2º e 3º',
            'Penas restritivas de direitos — CP, art. 44',
            'Suspensão condicional da pena — CP, art. 77',
            'Reparação mínima — CPP, art. 387, IV',
            'Prisão preventiva na sentença — CPP, art. 387, § 1º'],
      juris: ['Súmula 269 do STJ', 'Súmula 718 do STF', 'Súmula 719 do STF'],
      erro: 'Impor regime mais gravoso do que a pena comporta usando só a gravidade abstrata do crime — as Súmulas 718 e 719 do STF fecham essa porta.' }
  ],
  cego: [
    'Materialidade e autoria com a prova apontada',
    'Teses defensivas enfrentadas uma a uma',
    'Se absolveu: inciso do art. 386 indicado',
    '1ª fase: as oito circunstâncias percorridas, as negativas fundamentadas',
    '2ª fase: agravantes e atenuantes, sem furar o mínimo',
    '3ª fase: causas de aumento/diminuição com a fração justificada',
    'Regime inicial fixado e fundamentado',
    'Substituição e sursis examinados',
    'Recorrer em liberdade decidido',
    'Reparação mínima quando houver pedido',
    'Detração considerada'
  ]
}
,

// ─────────────────────────────────────────────────────────────────────────────
'Decisão saneadora': {
  rito: 'Civil — conhecimento',
  sobre: 'O art. 357 do CPC é uma lista de cinco providências, e o espelho cobra uma a uma. Sanear não é despachar "especifiquem provas": é resolver o que ficou pendente, fixar o que vai ser provado, dizer de quem é o ônus e organizar a instrução.',
  blocos: [
    { nome: 'Resolver as questões processuais pendentes',
      deve: 'Decidir o que sobrou de processual — preliminares da contestação, irregularidades de representação, ilegitimidade, conexão, competência. Rejeitar também é decidir: tem de vir fundamentado.',
      lei: ['Providências preliminares e saneamento — CPC, art. 357, I', 'Preliminares de contestação — CPC, art. 337', 'Extinção sem resolução de mérito — CPC, art. 485'],
      juris: [],
      erro: 'Deixar uma preliminar sem resposta e ir direto para as provas. No espelho isso é ponto perdido; no processo, nulidade por omissão.' },
    { nome: 'Delimitar as questões de fato e definir os meios de prova',
      deve: 'Dizer QUAIS fatos ficaram controvertidos e, para cada um, qual prova será produzida. É aqui que se defere ou indefere perícia, testemunhal e depoimento pessoal — com motivo.',
      lei: ['Delimitação das questões de fato — CPC, art. 357, II', 'Indeferimento de provas inúteis ou protelatórias — CPC, art. 370, parágrafo único', 'Fatos que independem de prova — CPC, art. 374'],
      juris: [],
      erro: 'Escrever "defiro a produção de provas" sem dizer quais fatos elas servem para provar. Isso não delimita nada e devolve a bagunça para a audiência.' },
    { nome: 'Distribuir o ônus da prova',
      deve: 'Fixar o ônus na regra do art. 373 e, se for o caso, invertê-lo de forma motivada — sempre dando à parte a oportunidade de se desincumbir do encargo.',
      lei: ['Ônus da prova — CPC, art. 373', 'Distribuição dinâmica — CPC, art. 373, § 1º', 'Vedação à prova diabólica — CPC, art. 373, § 2º', 'Inversão no consumo — CDC, art. 6º, VIII'],
      juris: [],
      erro: 'Inverter o ônus só na sentença. A inversão surpreende quem já perdeu a chance de produzir a prova; o momento próprio é o saneamento.' },
    { nome: 'Delimitar as questões de direito relevantes',
      deve: 'Apontar as questões jurídicas que decidirão a causa. Serve para a instrução não gastar tempo com o que é irrelevante e para as partes saberem onde mirar.',
      lei: ['Questões de direito relevantes — CPC, art. 357, IV'],
      juris: [],
      erro: 'Pular este inciso. É o mais esquecido dos cinco e costuma valer ponto autônomo no espelho.' },
    { nome: 'Designar audiência de instrução, se necessária',
      deve: 'Designar a audiência e fixar o prazo comum para o rol de testemunhas (até 15 dias), com o limite de 10 testemunhas — 3 por fato.',
      lei: ['Designação de audiência — CPC, art. 357, V', 'Rol de testemunhas e prazo — CPC, art. 357, § 4º', 'Número de testemunhas — CPC, art. 357, § 6º'],
      juris: [],
      erro: 'Designar audiência sem abrir prazo para o rol, ou não limitar o número de testemunhas.' },
    { nome: 'Estabilizar a decisão e, quando couber, sanear em cooperação',
      deve: 'Registrar o prazo de 5 dias para pedido de esclarecimento ou ajuste, findo o qual a decisão se torna estável. Em causa complexa, designar o saneamento compartilhado em audiência; havendo consenso, homologar a delimitação apresentada pelas partes.',
      lei: ['Estabilidade em 5 dias — CPC, art. 357, § 1º', 'Delimitação consensual homologada — CPC, art. 357, § 2º', 'Saneamento compartilhado em causa complexa — CPC, art. 357, § 3º'],
      juris: [],
      erro: 'Ignorar o § 1º. Sem a estabilização, a discussão volta na apelação e o espelho cobra exatamente essa menção.' }
  ],
  cego: [
    'Preliminares e questões processuais pendentes decididas',
    'Questões de fato controvertidas delimitadas, uma a uma',
    'Meios de prova definidos para cada fato',
    'Ônus da prova distribuído (art. 373) e, se invertido, motivado',
    'Oportunidade de desincumbência assegurada na inversão',
    'Questões de direito relevantes apontadas',
    'Audiência designada quando necessária',
    'Prazo comum para rol de testemunhas fixado',
    'Limite de testemunhas observado',
    'Prazo de 5 dias para ajuste e estabilização registrado'
  ]
},

// ─────────────────────────────────────────────────────────────────────────────
'Decisão da tutela': {
  rito: 'Civil — conhecimento',
  sobre: 'Conceder ou negar tutela provisória é o teste de fundamentação da prova. A banca quer ver os requisitos ENFRENTADOS com os fatos do caso — não a fórmula "presentes os requisitos, defiro".',
  blocos: [
    { nome: 'Identificar a espécie pedida',
      deve: 'Dizer se é tutela de urgência (cautelar ou antecipada) ou de evidência, e se é antecedente ou incidental. O requisito muda conforme a espécie, e trocar de espécie no meio do caminho derruba a fundamentação.',
      lei: ['Espécies de tutela provisória — CPC, art. 294', 'Tutela antecipada antecedente — CPC, art. 303', 'Tutela cautelar antecedente — CPC, art. 305'],
      juris: [],
      erro: 'Tratar tutela de evidência com o vocabulário da urgência. Na evidência não se exige perigo — exigi-lo é erro de premissa.' },
    { nome: 'Enfrentar os requisitos da urgência com os fatos',
      deve: 'Demonstrar a probabilidade do direito apontando a prova que já está nos autos, e o perigo de dano ou risco ao resultado útil apontando o fato concreto que o gera.',
      lei: ['Requisitos da tutela de urgência — CPC, art. 300', 'Caução como contracautela — CPC, art. 300, § 1º', 'Vedação à irreversibilidade — CPC, art. 300, § 3º'],
      juris: [],
      erro: 'Repetir o texto do art. 300 sem amarrar nos fatos. É exatamente a decisão que o art. 489, § 1º, considera não fundamentada.' },
    { nome: 'Tutela de evidência: apontar o inciso',
      deve: 'Quando for evidência, dizer qual dos quatro incisos autoriza a medida — e lembrar que liminar, sem ouvir a outra parte, só nos incisos II e III.',
      lei: ['Hipóteses de tutela de evidência — CPC, art. 311', 'Liminar apenas nos incisos II e III — CPC, art. 311, parágrafo único'],
      juris: [],
      erro: 'Deferir liminarmente evidência com base no inciso I (abuso de defesa) ou IV. O parágrafo único não permite.' },
    { nome: 'Decidir sobre reversibilidade e contracautela',
      deve: 'Avaliar se a medida é reversível; sendo o risco relevante, exigir caução real ou fidejussória, salvo hipossuficiência.',
      lei: ['Irreversibilidade — CPC, art. 300, § 3º', 'Caução e dispensa ao hipossuficiente — CPC, art. 300, § 1º'],
      juris: [],
      erro: 'Negar a tutela apenas invocando "irreversibilidade" quando a irreversibilidade maior está do outro lado (saúde, alimentos). A ponderação tem de aparecer.' },
    { nome: 'Fundamentar, delimitar e sancionar o descumprimento',
      deve: 'Fundamentar de modo claro e preciso, delimitar exatamente o que fica determinado, o prazo e a multa — com valor e periodicidade compatíveis.',
      lei: ['Dever de fundamentar a tutela — CPC, art. 298', 'Fundamentação das decisões — CPC, art. 489, § 1º', 'Multa por descumprimento — CPC, art. 537'],
      juris: [],
      erro: 'Fixar astreintes sem prazo de cumprimento nem teto, ou em valor desproporcional ao da obrigação.' },
    { nome: 'Antecedente: registrar aditamento e estabilização',
      deve: 'Na antecipada antecedente, intimar para aditar a inicial em 15 dias e advertir que, não havendo recurso, a tutela se estabiliza e o processo se extingue.',
      lei: ['Aditamento da inicial — CPC, art. 303, § 1º, I', 'Estabilização da tutela — CPC, art. 304', 'Prazo de 2 anos para rever — CPC, art. 304, § 5º'],
      juris: [],
      erro: 'Esquecer a advertência da estabilização. É o ponto que separa quem estudou o art. 304 de quem decorou o 300.' }
  ],
  cego: [
    'Espécie de tutela identificada (urgência ou evidência; antecedente ou incidental)',
    'Probabilidade do direito demonstrada com a prova dos autos',
    'Perigo de dano apontado com fato concreto',
    'Na evidência, inciso do art. 311 indicado',
    'Liminar sem contraditório só nos incisos II e III',
    'Reversibilidade analisada',
    'Caução examinada quando havia risco',
    'Comando delimitado: o que, em que prazo',
    'Multa fixada em valor proporcional',
    'Aditamento e estabilização tratados, se antecedente'
  ]
},

// ─────────────────────────────────────────────────────────────────────────────
'Decisão de prisão preventiva': {
  rito: 'Penal — prisões e cautelares',
  sobre: 'Depois da Lei 13.964/2019 o juiz não decreta preventiva de ofício, e a fundamentação passou a ter exigências escritas na lei. A banca cobra os três andares: representação/requerimento, requisitos do art. 312 e admissibilidade do art. 313 — mais a revisão periódica.',
  blocos: [
    { nome: 'Verificar a provocação',
      deve: 'Registrar que houve requerimento do Ministério Público, do querelante ou do assistente, ou representação da autoridade policial. Sem provocação, não há preventiva — nem na conversão do flagrante.',
      lei: ['Vedação à decretação de ofício — CPP, art. 311', 'Audiência de custódia e conversão — CPP, art. 310, II'],
      juris: [],
      erro: 'Converter flagrante em preventiva de ofício. É o erro mais cobrado desde 2020 e derruba a decisão inteira.' },
    { nome: 'Fumus commissi delicti',
      deve: 'Apontar a prova da materialidade e o indício suficiente de autoria, indicando as peças concretas do inquérito que os sustentam.',
      lei: ['Prova da materialidade e indício de autoria — CPP, art. 312, caput'],
      juris: [],
      erro: 'Afirmar que "há indícios" sem dizer quais. Fundamentação por referência genérica é nula.' },
    { nome: 'Periculum libertatis com fato concreto',
      deve: 'Demonstrar o perigo gerado pelo estado de liberdade do imputado — garantia da ordem pública, da ordem econômica, conveniência da instrução ou aplicação da lei penal — com base em fatos novos ou contemporâneos.',
      lei: ['Fundamentos da preventiva — CPP, art. 312, caput', 'Perigo gerado pelo estado de liberdade — CPP, art. 312, § 2º', 'Motivação com fatos novos ou contemporâneos — CPP, art. 315, § 1º'],
      juris: [],
      erro: 'Sustentar a prisão na gravidade abstrata do crime ou no clamor social. Nenhum dos dois é fundamento válido.' },
    { nome: 'Admissibilidade do art. 313',
      deve: 'Enquadrar o caso em uma das hipóteses: crime doloso com pena máxima superior a 4 anos, reincidência em crime doloso, violência doméstica para garantir medidas protetivas, ou dúvida sobre a identidade civil.',
      lei: ['Hipóteses de admissibilidade — CPP, art. 313', 'Descumprimento de medida cautelar anterior — CPP, art. 282, § 4º'],
      juris: [],
      erro: 'Decretar preventiva por crime com pena máxima igual ou inferior a 4 anos fora das exceções do art. 313.' },
    { nome: 'Esgotar as cautelares diversas',
      deve: 'Justificar por que as medidas cautelares diversas da prisão são inadequadas ou insuficientes no caso — a prisão é a última opção, não a primeira.',
      lei: ['Subsidiariedade da prisão — CPP, art. 282, § 6º', 'Rol de cautelares diversas — CPP, art. 319', 'Vedações do art. 315, § 2º à motivação inidônea'],
      juris: [],
      erro: 'Não dizer uma palavra sobre monitoração, comparecimento periódico ou proibição de contato. O § 6º exige a justificativa expressa.' },
    { nome: 'Prazo, revisão e comunicações',
      deve: 'Consignar a necessidade de revisão da necessidade da prisão a cada 90 dias, mediante decisão fundamentada, e determinar as comunicações e a expedição do mandado.',
      lei: ['Revisão a cada 90 dias — CPP, art. 316, parágrafo único', 'Revogação quando cessar o motivo — CPP, art. 316, caput'],
      juris: [],
      erro: 'Omitir a revisão periódica. É item de espelho e, na prática, causa de relaxamento.' }
  ],
  cego: [
    'Requerimento ou representação registrado (nunca de ofício)',
    'Materialidade apontada com a peça que a comprova',
    'Indício suficiente de autoria individualizado',
    'Fundamento do art. 312 escolhido e demonstrado com fato concreto',
    'Contemporaneidade do perigo justificada',
    'Hipótese de admissibilidade do art. 313 indicada',
    'Cautelares diversas expressamente afastadas',
    'Proporcionalidade examinada',
    'Revisão em 90 dias consignada',
    'Mandado e comunicações determinados'
  ]
},

// ─────────────────────────────────────────────────────────────────────────────
'Decisão de pronúncia': {
  rito: 'Penal — tribunal do júri',
  sobre: 'A pronúncia é juízo de admissibilidade, não de condenação. Todo o risco da peça está na LINGUAGEM: convencer demais anula, porque os jurados vão ler.',
  blocos: [
    { nome: 'Materialidade e indícios suficientes de autoria',
      deve: 'Demonstrar a prova da materialidade e os indícios suficientes de autoria ou participação — juízo de probabilidade, não de certeza.',
      lei: ['Requisitos da pronúncia — CPP, art. 413, caput', 'Fundamentação da pronúncia — CPP, art. 413, § 1º'],
      juris: [],
      erro: 'Exigir certeza de autoria (isso é sentença) ou pronunciar com base em elemento exclusivo do inquérito não confirmado em juízo.' },
    { nome: 'Linguagem comedida',
      deve: 'Limitar-se à indicação da materialidade e dos indícios, sem aderir a uma das teses nem valorar a prova como se estivesse julgando.',
      lei: ['Limites da fundamentação — CPP, art. 413, § 1º', 'Competência do júri para o mérito — CF, art. 5º, XXXVIII, d'],
      juris: [],
      erro: 'Excesso de linguagem. Não se resolve desentranhando a peça: a consequência é a anulação, e o espelho pune com força.' },
    { nome: 'Qualificadoras e causas de aumento',
      deve: 'Pronunciar com as qualificadoras que têm suporte na prova e afastar, fundamentadamente, as manifestamente improcedentes — só essas.',
      lei: ['Classificação do crime na pronúncia — CPP, art. 413, § 1º', 'Impronúncia — CPP, art. 414', 'Desclassificação — CPP, art. 419'],
      juris: [],
      erro: 'Afastar qualificadora que apenas está controvertida. Havendo dúvida, quem decide é o Conselho de Sentença.' },
    { nome: 'Situação prisional',
      deve: 'Decidir de forma fundamentada sobre a prisão ou as medidas cautelares, considerando o estado atual — não repetir a decisão anterior.',
      lei: ['Prisão e cautelares na pronúncia — CPP, art. 413, § 3º', 'Requisitos da preventiva — CPP, art. 312'],
      juris: [],
      erro: 'Manter a prisão "pelos próprios fundamentos". A pronúncia é momento novo e exige fundamentação própria.' },
    { nome: 'Intimação e preclusão',
      deve: 'Determinar a intimação pessoal do acusado, do defensor e do MP, e registrar o efeito da preclusão — a instrução em plenário não repete a fase anterior.',
      lei: ['Intimação da pronúncia — CPP, art. 420', 'Preclusão e preparação do plenário — CPP, art. 421'],
      juris: [],
      erro: 'Esquecer a intimação pessoal do acusado solto — a intimação por edital só cabe nas hipóteses do parágrafo único do art. 420.' }
  ],
  cego: [
    'Materialidade demonstrada',
    'Indícios suficientes de autoria apontados',
    'Juízo de probabilidade, não de certeza',
    'Linguagem contida, sem adesão a tese',
    'Qualificadoras mantidas com suporte na prova',
    'Afastamento apenas do manifestamente improcedente',
    'Situação prisional decidida com fundamento próprio',
    'Intimações determinadas',
    'Classificação legal do crime consignada'
  ]
},

// ─────────────────────────────────────────────────────────────────────────────
'Sentença em MS': {
  rito: 'Civil — conhecimento',
  sobre: 'Mandado de segurança tem regras próprias que a banca cobra justamente porque quem escreve no automático usa as do CPC: prova pré-constituída, prazo decadencial, efeitos patrimoniais e — o clássico — honorários.',
  blocos: [
    { nome: 'Direito líquido e certo e prova pré-constituída',
      deve: 'Verificar se os fatos estão provados por documento juntado com a inicial. Não há instrução no mandado de segurança: fato que depende de prova nova leva à extinção sem mérito.',
      lei: ['Cabimento e direito líquido e certo — Lei 12.016/2009, art. 1º', 'Documentos e requisição de peças — Lei 12.016/2009, art. 6º, § 1º', 'Extinção sem resolução de mérito — CPC, art. 485, IV'],
      juris: [],
      erro: 'Julgar improcedente o pedido quando faltava prova pré-constituída. Falta prova, não falta direito: extingue-se sem mérito, e a via ordinária fica aberta.' },
    { nome: 'Autoridade coatora e pessoa jurídica',
      deve: 'Aferir se a autoridade indicada é quem praticou o ato ou detém competência para corrigi-lo, e registrar a ciência do órgão de representação da pessoa jurídica.',
      lei: ['Notificação da autoridade e ciência do órgão — Lei 12.016/2009, art. 7º, I e II', 'Ingresso da pessoa jurídica — Lei 12.016/2009, art. 7º, § 2º'],
      juris: ['Teoria da encampação — STJ'],
      erro: 'Extinguir por erro na autoridade quando ela prestou informações defendendo o mérito e é hierarquicamente superior, sem alterar a competência — hipótese de encampação.' },
    { nome: 'Prazo decadencial',
      deve: 'Conferir os 120 dias contados da ciência do ato impugnado, atento a ato de trato sucessivo e a ato omissivo continuado.',
      lei: ['Decadência em 120 dias — Lei 12.016/2009, art. 23'],
      juris: [],
      erro: 'Contar o prazo da publicação de norma genérica em vez do ato concreto que atingiu a pessoa.' },
    { nome: 'Litisconsórcio e vedações',
      deve: 'Verificar a necessidade de citar o beneficiário do ato como litisconsorte passivo necessário e enfrentar as vedações à concessão de liminar quando houver pedido nesse sentido.',
      lei: ['Litisconsórcio necessário — CPC, art. 114', 'Vedações à liminar — Lei 12.016/2009, art. 7º, § 2º', 'Hipóteses de não cabimento — Lei 12.016/2009, art. 5º'],
      juris: [],
      erro: 'Conceder a ordem que desconstitui a nomeação de terceiro sem que ele tenha sido citado.' },
    { nome: 'Efeitos patrimoniais e dispositivo',
      deve: 'Conceder a ordem para o futuro; os valores anteriores à impetração cobram-se pela via própria. O dispositivo deve dizer exatamente o que a autoridade tem de fazer, e em que prazo.',
      lei: ['Efeitos patrimoniais a partir da impetração — Lei 12.016/2009, art. 14, § 4º', 'Súmula 269 do STF — MS não substitui ação de cobrança', 'Súmula 271 do STF — efeitos patrimoniais pretéritos pela via própria'],
      juris: ['Súmula 269/STF', 'Súmula 271/STF'],
      erro: 'Condenar a Fazenda a pagar as parcelas vencidas antes da impetração. É o erro clássico, e as duas súmulas estão no espelho.' },
    { nome: 'Honorários, remessa e sentença',
      deve: 'Não condenar em honorários (custas, sim), e submeter a sentença concessiva à remessa necessária.',
      lei: ['Não cabimento de honorários — Lei 12.016/2009, art. 25', 'Remessa necessária da concessiva — Lei 12.016/2009, art. 14, § 1º', 'Súmula 512 do STF e Súmula 105 do STJ'],
      juris: ['Súmula 512/STF', 'Súmula 105/STJ'],
      erro: 'Arbitrar honorários sucumbenciais. É a pegadinha mais repetida em prova de sentença de MS.' }
  ],
  cego: [
    'Prova pré-constituída examinada',
    'Extinção sem mérito quando falta prova (não improcedência)',
    'Autoridade coatora aferida; encampação considerada',
    'Ciência do órgão de representação registrada',
    'Prazo de 120 dias verificado',
    'Litisconsorte passivo necessário citado quando havia',
    'Vedações à liminar enfrentadas, se pedida',
    'Efeitos patrimoniais só a partir da impetração',
    'Súmulas 269 e 271 do STF observadas',
    'Sem honorários; custas decididas',
    'Remessa necessária determinada na concessão',
    'Dispositivo com comando claro e prazo'
  ]
},

// ─────────────────────────────────────────────────────────────────────────────
'Denúncia': {
  rito: 'Penal — procedimento comum',
  sobre: 'A denúncia é medida de garantia: é a partir dela que o acusado sabe do que se defende. O espelho cobra a descrição do fato com todas as circunstâncias e, sobretudo, a individualização das condutas.',
  blocos: [
    { nome: 'Endereçamento e qualificação',
      deve: 'Endereçar ao juízo competente e qualificar o acusado, ou fornecer os esclarecimentos que permitam identificá-lo.',
      lei: ['Requisitos da denúncia — CPP, art. 41', 'Competência pelo lugar da infração — CPP, art. 70'],
      juris: [],
      erro: 'Denunciar sem qualificação nem elementos de identificação, o que impede a citação.' },
    { nome: 'Exposição do fato com todas as circunstâncias',
      deve: 'Narrar o fato criminoso com tempo, lugar, modo de execução e resultado — o suficiente para que a defesa saiba exatamente o que responder.',
      lei: ['Exposição do fato criminoso — CPP, art. 41', 'Rejeição por inépcia — CPP, art. 395, I'],
      juris: [],
      erro: 'Narrativa genérica que repete o tipo penal. Denúncia que não descreve o fato é inepta.' },
    { nome: 'Individualização das condutas no concurso de agentes',
      deve: 'Havendo vários acusados, descrever o que cada um fez e o liame subjetivo entre eles.',
      lei: ['Concurso de pessoas — CP, art. 29', 'Exposição do fato — CPP, art. 41'],
      juris: [],
      erro: 'Denúncia genérica em crime societário, imputando a todos os sócios pela simples condição de sócio.' },
    { nome: 'Justa causa e classificação',
      deve: 'Apontar os elementos de informação que dão suporte probatório mínimo à imputação e classificar o crime, inclusive concurso e causas de aumento.',
      lei: ['Justa causa — CPP, art. 395, III', 'Classificação do crime — CPP, art. 41', 'Concurso de crimes — CP, arts. 69 a 71'],
      juris: [],
      erro: 'Oferecer denúncia com base em inquérito que não indica autoria — falta justa causa e a peça é rejeitada.' },
    { nome: 'Requerimentos finais',
      deve: 'Requerer o recebimento, a citação, o rol de testemunhas e, se for o caso, as medidas cautelares — com fundamento próprio.',
      lei: ['Rol de testemunhas — CPP, art. 41', 'Recebimento e citação — CPP, arts. 396 e 396-A', 'Medidas cautelares — CPP, arts. 282 e 319'],
      juris: [],
      erro: 'Esquecer o rol de testemunhas: a prova oral da acusação preclui.' }
  ],
  cego: [
    'Juízo competente identificado',
    'Acusado qualificado ou identificável',
    'Fato narrado com tempo, lugar e modo',
    'Resultado e nexo descritos',
    'Condutas individualizadas no concurso de agentes',
    'Liame subjetivo apontado',
    'Elementos de informação indicados (justa causa)',
    'Classificação legal completa',
    'Rol de testemunhas apresentado',
    'Cautelares requeridas com fundamento, se cabíveis'
  ]
},

// ═══════════════════════════════════════════════════════════════════════════
// LOTE 2ª FASE DE MAGISTRATURA — o que o JUIZ escreve.
// Os rótulos abaixo nomeiam a peça como ela aparece no trâmite (ritos.js), mas o
// roteiro é o da DECISÃO que a julga: em prova de juiz não se escreve o embargo,
// escreve-se a sentença dos embargos.
// Fundamentos conferidos um a um contra a fonte primária (Planalto, STJ, STF).
// ═══════════════════════════════════════════════════════════════════════════
// ───────────────────────── SENTENÇA DO JÚRI (2ª fase) ─────────────────────────
'Sentença do júri': {
  rito: 'Penal — tribunal do júri',
  sobre: 'A sentença que o juiz-presidente lê em plenário depois do veredicto. Aqui o juiz NÃO julga o mérito — ele executa o que os jurados decidiram. O que é dele: dosar a pena, fixar o regime e resolver a prisão. A banca mede exatamente isso: até onde vai a soberania dos veredictos e onde começa a jurisdição do presidente.',
  blocos: [
    {
      nome: 'Ler o veredicto antes de escrever',
      deve: 'A sentença tem de ser congruente com as respostas aos quesitos. Antes de redigir, releia a ordem votada — materialidade, autoria, quesito genérico de absolvição, causas de diminuição, qualificadoras e causas de aumento — e o que ficou registrado em ata, inclusive tese de clemência sustentada pela defesa.',
      lei: [
        'Ordem dos quesitos — CPP, art. 483',
        'Quesito genérico de absolvição — CPP, art. 483, III e § 2º',
        'Formulação e votação dos quesitos — CPP, arts. 482 a 491'
      ],
      juris: [
        'Apelação contra absolvição pelo quesito genérico — STF, ARE 1.225.185, Tema 1087, tese de 04/10/2024',
        'Clemência registrada em ata impede novo júri — STF, ARE 1.225.185, Tema 1087, 2ª parte da tese'
      ],
      erro: 'Fundamentar a absolvição. Absolvido pelo quesito genérico, o juiz registra o resultado e ponto — explicar o porquê invade a soberania dos veredictos (CF, art. 5º, XXXVIII, "c").'
    },
    {
      nome: 'Absolvição: dispositivo e efeitos imediatos',
      deve: 'Absolvido o réu, a sentença manda soltá-lo se estiver preso, revoga as medidas cautelares impostas e, quando a absolvição for imprópria, aplica medida de segurança.',
      lei: [
        'Sentença absolutória no júri — CPP, art. 492, II',
        'Soltura, revogação de cautelares e medida de segurança — CPP, art. 492, II, "a" a "c"',
        'Absolvição imprópria — CP, art. 97'
      ],
      juris: [],
      erro: 'Absolver e esquecer o alvará de soltura e a revogação das cautelares diversas da prisão. São dois itens distintos no espelho, e cada um vale ponto.'
    },
    {
      nome: 'Condenação: a base fática é o veredicto',
      deve: 'Condenado, o juiz fixa a pena considerando as circunstâncias agravantes e atenuantes alegadas nos debates e as qualificadoras e causas de aumento reconhecidas pelos jurados. A premissa de fato não é a sua leitura da prova: é o que o conselho de sentença respondeu.',
      lei: [
        'Sentença condenatória no júri — CPP, art. 492, I',
        'Agravantes e atenuantes alegadas nos debates — CPP, art. 492, I, "b"',
        'Requisitos da sentença — CPP, art. 381'
      ],
      juris: [],
      erro: 'Reconhecer qualificadora que os jurados afastaram, ou ignorar a que reconheceram. Isso não é erro de dosimetria: é sentença contrária ao veredicto.'
    },
    {
      nome: 'Dosimetria — as três fases, uma a uma',
      deve: 'Pena-base pelas circunstâncias judiciais, com fato concreto para cada uma que você valorar negativamente; depois agravantes e atenuantes; por fim causas de aumento e de diminuição, que são as únicas que podem levar a pena fora dos limites do tipo.',
      lei: [
        'Circunstâncias judiciais — CP, art. 59',
        'Cálculo da pena em três fases — CP, art. 68',
        'Concurso de crimes — CP, arts. 69 a 71',
        'Crime hediondo — Lei 8.072/90, art. 1º, I'
      ],
      juris: [
        'Atenuante não reduz abaixo do mínimo — Súmula 231 do STJ',
        'Gravidade abstrata não motiva regime mais severo — Súmula 718 do STF'
      ],
      erro: 'Elevar a pena-base repetindo elementar do tipo ou a própria qualificadora já usada para qualificar. É bis in idem, e o espelho desconta.'
    },
    {
      nome: 'Regime inicial, substituição e detração',
      deve: 'Fixar o regime pelo quantum e pelas circunstâncias do art. 59, examinar substituição por restritivas e suspensão condicional (ainda que para negar, motivadamente), e computar o tempo de prisão provisória para determinar o regime.',
      lei: [
        'Regime inicial — CP, art. 33, §§ 2º e 3º',
        'Substituição por penas restritivas de direitos — CP, art. 44',
        'Suspensão condicional da pena — CP, art. 77',
        'Detração na fixação do regime — CPP, art. 387, § 2º'
      ],
      juris: [
        'Regime mais gravoso exige motivação idônea — Súmula 719 do STF',
        'Pena-base no mínimo veda regime mais gravoso — Súmula 440 do STJ'
      ],
      erro: 'Fixar o fechado invocando só a gravidade do homicídio. Ser hediondo não dispensa a fundamentação concreta do regime.'
    },
    {
      nome: 'Prisão depois do veredicto',
      deve: 'Decidir, fundamentadamente, sobre a execução imediata da condenação e sobre a manutenção ou decretação da preventiva. É o ponto mais sensível da peça depois do Tema 1068.',
      lei: [
        'Execução provisória da condenação no júri — CPP, art. 492, I, "e"',
        'Pressupostos da preventiva — CPP, art. 312',
        'Motivação das decisões — CF, art. 93, IX'
      ],
      juris: [
        'Execução imediata independe do total da pena — STF, RE 1.235.340, Tema 1068, j. 12/09/2024'
      ],
      erro: 'Repetir o piso de 15 anos do art. 492, I, "e" como se fosse condição da execução imediata. No Tema 1068 o STF desvinculou a execução do quantum da pena.'
    },
    {
      nome: 'Fecho: leitura, recurso e providências',
      deve: 'Sentença lida em plenário, custas, direito de recorrer, expedição da guia (provisória ou definitiva) e as comunicações de praxe.',
      lei: [
        'Leitura da sentença em plenário — CPP, art. 493',
        'Apelação das decisões do júri — CPP, art. 593, III',
        'Guia de recolhimento — LEP, arts. 105 e 106'
      ],
      juris: [],
      erro: 'Terminar sem uma palavra sobre recorrer em liberdade. A omissão é falta de fundamentação, não descuido de redação.'
    }
  ],
  cego: [
    'Sentença congruente com as respostas aos quesitos',
    'Absolvição pelo quesito genérico NÃO fundamentada',
    'Absolvição: soltura + revogação das cautelares + medida de segurança se imprópria',
    'Qualificadoras e causas de aumento conforme o veredicto',
    'Pena-base com fato concreto para cada circunstância judicial',
    'Agravantes e atenuantes limitadas ao alegado nos debates',
    'Terceira fase: causas de aumento e diminuição, com fração justificada',
    'Regime inicial fundamentado (não só pela gravidade)',
    'Substituição e sursis enfrentados, ainda que para negar',
    'Detração computada para o regime (CPP, art. 387, § 2º)',
    'Execução imediata e preventiva decididas com motivação',
    'Custas, recurso e guia de recolhimento'
  ]
},

// ──────────────────── SENTENÇA SOCIOEDUCATIVA (2ª fase) ────────────────────
'Sentença socioeducativa': {
  rito: 'Criança e adolescente — ato infracional',
  sobre: 'Não é sentença penal: é decisão que aplica medida socioeducativa, de natureza pedagógica. Duas armadilhas cobram quase todo o espelho: aplicar medida sem prova além da confissão, e internar fora das três hipóteses do art. 122. Internação é exceção — e cada exceção tem inciso próprio.',
  blocos: [
    {
      nome: 'Relatório e regularidade do procedimento',
      deve: 'Registrar a representação do Ministério Público, a oitiva do adolescente e dos pais ou responsável, a atuação da defesa técnica e o resultado do estudo social. A oitiva do adolescente não é praxe: é condição de validade.',
      lei: [
        'Representação do Ministério Público — ECA, art. 182',
        'Audiência de apresentação e oitiva do adolescente — ECA, arts. 184 e 186',
        'Defesa técnica por advogado — ECA, art. 207',
        'Alegações finais e sentença — ECA, art. 186, § 4º'
      ],
      juris: [
        'Aplicação da medida é competência exclusiva do juiz — Súmula 108 do STJ'
      ],
      erro: 'Passar por cima da oitiva do adolescente ou da manifestação da defesa técnica. Não é formalidade dispensável — é nulidade.'
    },
    {
      nome: 'Materialidade e autoria — prova, não só confissão',
      deve: 'Aplicar medida das previstas nos incisos II a VI do art. 112 exige prova suficiente de autoria e materialidade. Confissão do adolescente não substitui prova, e não autoriza dispensar as demais.',
      lei: [
        'Prova de autoria e materialidade — ECA, art. 114',
        'Remissão — ECA, arts. 126 a 128'
      ],
      juris: [
        'Nula a desistência de provas em face da confissão — Súmula 342 do STJ'
      ],
      erro: 'Sentenciar apoiado na confissão em sede policial, sem prova produzida em contraditório. A Súmula 342 derruba a sentença inteira.'
    },
    {
      nome: 'Tipicidade, excludentes e prescrição',
      deve: 'Verificar a correspondência da conduta com crime ou contravenção, enfrentar as excludentes alegadas e checar a prescrição — que incide, com a redução da menoridade.',
      lei: [
        'Conceito de ato infracional — ECA, art. 103',
        'Adolescente sujeito às medidas do ECA — ECA, arts. 104 e 105',
        'Redução do prazo prescricional pela menoridade — CP, art. 115'
      ],
      juris: [
        'Prescrição penal aplica-se às medidas socioeducativas — Súmula 338 do STJ',
        'Maioridade superveniente não extingue a medida até os 21 anos — Súmula 605 do STJ'
      ],
      erro: 'Não examinar a prescrição. Em ato infracional o prazo já é curto e cai pela metade — passa despercebido e o espelho cobra.'
    },
    {
      nome: 'Escolha da medida: proporcionalidade, não tarifa',
      deve: 'A medida se escolhe pela capacidade do adolescente de cumpri-la, pelas circunstâncias e pela gravidade do ato — nessa ordem, e não só pela gravidade. Fundamentar por que as medidas menos gravosas não servem ao caso.',
      lei: [
        'Elenco das medidas socioeducativas — ECA, art. 112',
        'Critérios de escolha da medida — ECA, art. 112, § 1º',
        'Princípios da execução socioeducativa — Lei 12.594/2012 (SINASE), art. 35'
      ],
      juris: [],
      erro: 'Escolher a medida pela etiqueta do ato ("roubo é internação"). O art. 112, § 1º manda pesar a capacidade de cumprir e as circunstâncias, e a sentença precisa mostrar esse exame.'
    },
    {
      nome: 'Internação: só nas três hipóteses do art. 122',
      deve: 'Internar exige enquadrar o caso em um dos três incisos: violência ou grave ameaça à pessoa; reiteração no cometimento de outras infrações graves; descumprimento reiterado e injustificável de medida anterior — esta última limitada a três meses. E, havendo outra medida adequada, a internação não se impõe.',
      lei: [
        'Hipóteses de internação — ECA, art. 122, I a III',
        'Internação-sanção: prazo máximo de três meses — ECA, art. 122, § 1º',
        'Vedação havendo medida mais adequada — ECA, art. 122, § 2º',
        'Prazo indeterminado, reavaliação e limites — ECA, art. 121, §§ 2º, 3º e 5º'
      ],
      juris: [
        'Tráfico, por si só, não autoriza internação — Súmula 492 do STJ'
      ],
      erro: 'Internar por ato análogo ao tráfico invocando a gravidade em abstrato. Sem violência ou grave ameaça o inciso I não serve, e a Súmula 492 fecha o atalho.'
    },
    {
      nome: 'Dispositivo e providências da execução',
      deve: 'Aplicar a medida, determinar o plano individual de atendimento, fixar a reavaliação, e resolver o que fazer com a internação provisória cumprida. Nada de prazo certo para a internação.',
      lei: [
        'Reavaliação em no máximo seis meses — ECA, art. 121, § 2º',
        'Teto de três anos e liberação compulsória aos 21 — ECA, art. 121, §§ 3º e 5º',
        'Plano Individual de Atendimento — Lei 12.594/2012, arts. 52 e 53',
        'Recursos e prazo de dez dias — ECA, art. 198'
      ],
      juris: [
        'Oitiva do adolescente antes da regressão — Súmula 265 do STJ'
      ],
      erro: 'Fixar prazo determinado de internação ("internação por um ano"). A internação não comporta prazo certo: o que existe é o teto de três anos e a reavaliação semestral.'
    }
  ],
  cego: [
    'Oitiva do adolescente e dos responsáveis registrada',
    'Defesa técnica atuante e alegações enfrentadas',
    'Autoria e materialidade provadas — não só confissão',
    'Tipicidade do ato infracional demonstrada',
    'Excludentes alegadas enfrentadas',
    'Prescrição examinada, com a redução da menoridade',
    'Escolha da medida justificada pelo art. 112, § 1º',
    'Medidas menos gravosas descartadas com motivo',
    'Internação enquadrada em inciso do art. 122',
    'Internação sem prazo determinado, com reavaliação em até 6 meses',
    'Internação-sanção limitada a três meses',
    'PIA determinado e providências de execução no dispositivo'
  ]
},

// ───────────── SENTENÇA NOS EMBARGOS À EXECUÇÃO FISCAL (2ª fase) ─────────────
'Embargos à execução fiscal': {
  rito: 'Tributário — execução fiscal',
  sobre: 'O rótulo é a peça do executado; em prova de magistratura o que se escreve é a SENTENÇA que a julga. São ação incidental de conhecimento, com sentença e honorários próprios. O espelho costuma cobrar quatro eixos: admissibilidade (garantia e prazo), higidez da CDA, prescrição, e o destino da execução depois do julgado.',
  blocos: [
    {
      nome: 'Admissibilidade: garantia e prazo',
      deve: 'Conferir o termo inicial dos trinta dias conforme a forma de garantia — depósito, fiança bancária ou seguro garantia, ou intimação da penhora — e a exigência de garantia do juízo, que é a regra na execução fiscal. Reconvenção e compensação não cabem aqui.',
      lei: [
        'Prazo de trinta dias e termo inicial — Lei 6.830/80, art. 16, I a III',
        'Garantia do juízo — Lei 6.830/80, art. 16, § 1º',
        'Vedação a reconvenção e compensação — Lei 6.830/80, art. 16, § 3º',
        'Aplicação subsidiária do CPC — Lei 6.830/80, art. 1º'
      ],
      juris: [
        'Exceção de pré-executividade nas matérias de ordem pública sem dilação probatória — Súmula 393 do STJ',
        'Exceção à vedação de compensação — Súmula 394 do STJ'
      ],
      erro: 'Rejeitar liminarmente por falta de garantia sem examinar a alegação de insuficiência patrimonial. A exigência é afastada quando comprovada inequivocamente a inexistência de patrimônio (STJ, REsp 1.487.772/SE, 1ª Turma, j. 28/05/2019, Info 650) — acórdão de Turma, não repetitivo.'
    },
    {
      nome: 'Efeito suspensivo — três requisitos, não um',
      deve: 'Embargos não suspendem a execução automaticamente. Para suspender é preciso garantia, relevância da fundamentação e risco de dano de difícil reparação. Decidir isso expressamente.',
      lei: [
        'Efeito suspensivo dos embargos — CPC, art. 919, § 1º'
      ],
      juris: [
        'Garantia, fumus boni iuris e periculum in mora — STJ, REsp 1.272.827/PE, Tema 526'
      ],
      erro: 'Dizer que os embargos "foram recebidos no efeito suspensivo" sem examinar os três requisitos. É decisão sem fundamentação (CPC, art. 489, § 1º).'
    },
    {
      nome: 'A CDA: presunção, requisitos e substituição',
      deve: 'A certidão goza de presunção de certeza e liquidez, que só cede a prova inequívoca a cargo do executado. Verificar os requisitos formais e, havendo erro material ou formal, admitir a substituição — nunca para trocar o sujeito passivo.',
      lei: [
        'Presunção de certeza e liquidez — Lei 6.830/80, art. 3º',
        'Requisitos da CDA — Lei 6.830/80, art. 2º, §§ 5º e 6º',
        'Emenda ou substituição até a decisão de primeira instância, devolvido o prazo para embargos — Lei 6.830/80, art. 2º, § 8º',
        'Dívida ativa e título executivo — CTN, arts. 201 a 204'
      ],
      juris: [
        'Substituição da CDA até a sentença de embargos, vedada a mudança do sujeito passivo — Súmula 392 do STJ',
        'Desnecessário demonstrativo de cálculo na inicial da execução fiscal — Súmula 559 do STJ'
      ],
      erro: 'Anular a execução por vício formal que não causou prejuízo à defesa, ou aceitar substituição de CDA que troca o devedor. São os dois extremos que o espelho separa.'
    },
    {
      nome: 'Prescrição, decadência e prescrição intercorrente',
      deve: 'Enfrentar os três: decadência do lançamento, prescrição da cobrança e prescrição intercorrente no curso da execução. A intercorrente pressupõe a suspensão de um ano e a oitiva prévia da Fazenda.',
      lei: [
        'Decadência do lançamento — CTN, art. 173',
        'Prescrição da ação de cobrança — CTN, art. 174',
        'Suspensão, arquivamento e prescrição intercorrente — Lei 6.830/80, art. 40, §§ 2º, 4º e 5º'
      ],
      juris: [
        'Suspensão de um ano e início automático do prazo quinquenal — Súmula 314 do STJ',
        'Prescrição anterior à propositura pode ser decretada de ofício — Súmula 409 do STJ'
      ],
      erro: 'Tratar a falta de oitiva da Fazenda (art. 40, § 4º) como nulidade automática. A Fazenda tem de demonstrar prejuízo — presumido só na falta da intimação do termo inicial (STJ, REsp 1.340.553/RS, 1ª Seção, Temas 566 e 570/571, j. 12/09/2018) — e o § 5º dispensa a manifestação nas cobranças de baixo valor.'
    },
    {
      nome: 'Responsabilidade do sócio e redirecionamento',
      deve: 'Se os embargos discutem a legitimidade do sócio, separar inadimplemento de infração à lei. Mero não pagamento não redireciona; dissolução irregular, sim.',
      lei: [
        'Responsabilidade por atos com excesso de poderes ou infração à lei — CTN, art. 135, III',
        'Responsabilidade de terceiros — CTN, art. 134'
      ],
      juris: [
        'Inadimplemento, por si só, não gera responsabilidade do sócio-gerente — Súmula 430 do STJ',
        'Dissolução irregular presumida legitima o redirecionamento — Súmula 435 do STJ'
      ],
      erro: 'Manter o sócio no polo passivo só porque a empresa não pagou. A Súmula 430 é das mais cobradas justamente nesse ponto.'
    },
    {
      nome: 'Dispositivo, honorários e o destino da execução',
      deve: 'Julgar procedente, parcialmente procedente ou improcedente, e dizer o que acontece com a execução: extinção, prosseguimento integral ou prosseguimento pelo saldo remanescente, com nova conta. Fechar com honorários e custas.',
      lei: [
        'Resolução do mérito — CPC, art. 487',
        'Honorários contra a Fazenda por faixas — CPC, art. 85, § 3º',
        'Majoração recursal, pelo tribunal — CPC, art. 85, § 11',
        'Sentença nos embargos, dispensada a audiência se a prova for documental — Lei 6.830/80, art. 17, parágrafo único'
      ],
      juris: [
        'Nas execuções fiscais da União o encargo de 20% do DL 1.025/69 substitui os honorários nos embargos — Súmula 168 do extinto TFR; STJ, REsp 1.143.320/RS, Tema 400'
      ],
      erro: 'Julgar procedente em parte e não dizer por qual valor a execução prossegue. Sem essa determinação a sentença é inexequível — e o espelho conta como item perdido.'
    }
  ],
  cego: [
    'Tempestividade aferida pelo termo inicial correto do art. 16',
    'Garantia do juízo examinada (e a alegação de insuficiência enfrentada)',
    'Efeito suspensivo decidido com os três requisitos',
    'Presunção de liquidez e certeza da CDA enfrentada',
    'Vícios da CDA: prejuízo à defesa verificado',
    'Decadência do lançamento examinada',
    'Prescrição da cobrança examinada',
    'Prescrição intercorrente com prévia oitiva da Fazenda',
    'Legitimidade do sócio enfrentada (Súmulas 430 e 435)',
    'Destino da execução definido: extinção, prosseguimento ou saldo',
    'Honorários fixados por faixas (CPC, art. 85, § 3º)',
    'Custas e intimações'
  ]
},

// ────────── SENTENÇA NOS EMBARGOS À EXECUÇÃO (título extrajudicial) ──────────
'Embargos à execução': {
  rito: 'Civil — cumprimento e execução',
  sobre: 'Ação incidental de conhecimento, distribuída por dependência e autuada em apartado. Diferença que a banca adora: aqui NÃO se exige garantia para embargar — a garantia só entra quando se pede efeito suspensivo. E excesso de execução alegado sem valor correto é rejeitado de plano.',
  blocos: [
    {
      nome: 'Admissibilidade: prazo e independência de garantia',
      deve: 'Quinze dias contados na forma do art. 231, conforme o modo de citação — a juntada do mandado é apenas uma das hipóteses. Independem de penhora, depósito ou caução. Havendo vários executados, o prazo corre individualmente e não se aplica o prazo em dobro do art. 229. Autuação em apartado e distribuição por dependência.',
      lei: [
        'Embargos independem de garantia — CPC, art. 914',
        'Distribuição por dependência e autuação em apartado — CPC, art. 914, § 1º',
        'Prazo de quinze dias, contado na forma do art. 231 — CPC, art. 915',
        'Prazo individual por executado; sem prazo em dobro do art. 229 — CPC, art. 915, §§ 1º e 3º',
        'Contagem em dias úteis — CPC, art. 219'
      ],
      juris: [],
      erro: 'Exigir penhora para conhecer dos embargos. Isso é regime da execução fiscal, não do CPC — trocar os dois custa a admissibilidade inteira.'
    },
    {
      nome: 'Efeito suspensivo: requisitos cumulativos',
      deve: 'Só suspende a execução com requerimento, garantia por penhora, depósito ou caução suficientes, e fundamentos relevantes somados ao risco de dano grave. Decidir de forma expressa e fundamentada.',
      lei: [
        'Efeito suspensivo dos embargos — CPC, art. 919, § 1º',
        'Prosseguimento quanto à parte não abrangida pelo efeito suspensivo — CPC, art. 919, § 3º'
      ],
      juris: [],
      erro: 'Suspender a execução inteira quando o efeito suspensivo diz respeito só a parte do objeto da execução. O § 3º manda prosseguir quanto à parte restante.'
    },
    {
      nome: 'Matéria alegável e exame do título',
      deve: 'Percorrer o rol do art. 917 e, antes dele, os requisitos do título: certeza, liquidez e exigibilidade. Falta de qualquer um leva à extinção da execução, e isso é matéria de ordem pública.',
      lei: [
        'Matérias alegáveis nos embargos — CPC, art. 917, I a VI',
        'Requisitos do título executivo — CPC, art. 783',
        'Títulos extrajudiciais — CPC, art. 784',
        'Requisitos para realizar qualquer execução — CPC, art. 786',
        'Nulidade da execução — CPC, art. 803'
      ],
      juris: [],
      erro: 'Enfrentar só o que o embargante alegou e não conferir de ofício a exigibilidade do título. Nulidade da execução é matéria conhecível de ofício (CPC, art. 803, parágrafo único).'
    },
    {
      nome: 'Excesso de execução — o ônus é do embargante',
      deve: 'Alegado excesso, o embargante tem de declarar o valor que entende correto e apresentar a memória de cálculo. Não o fazendo, essa alegação é rejeitada liminarmente, ou não se examina, se houver outro fundamento.',
      lei: [
        'Excesso de execução — CPC, art. 917, § 2º',
        'Ônus de declarar o valor correto — CPC, art. 917, § 3º',
        'Rejeição liminar da alegação — CPC, art. 917, § 4º'
      ],
      juris: [],
      erro: 'Mandar liquidar o valor correto no lugar do embargante. O ônus é dele, e a lei já diz a consequência de não cumpri-lo.'
    },
    {
      nome: 'Prescrição, pagamento e demais defesas',
      deve: 'Examinar prescrição, pagamento, novação, compensação e o que mais seria lícito deduzir em processo de conhecimento — o inciso VI abre a defesa por inteiro.',
      lei: [
        'Qualquer matéria deduzível como defesa — CPC, art. 917, VI',
        'Prescrição — CC, arts. 189 e 206',
        'Fatos supervenientes conhecíveis — CPC, art. 493'
      ],
      juris: [],
      erro: 'Tratar embargos como se fossem impugnação: aqui a cognição é ampla, não limitada a um rol fechado como o do art. 525, § 1º.'
    },
    {
      nome: 'Dispositivo, honorários e embargos protelatórios',
      deve: 'Resolver o mérito, dizer o que acontece com a execução e fixar honorários. Embargos manifestamente protelatórios são conduta atentatória à dignidade da justiça, com multa própria.',
      lei: [
        'Resolução do mérito — CPC, art. 487',
        'Honorários e majoração — CPC, art. 85, §§ 1º e 11',
        'Embargos protelatórios — CPC, art. 918, III e parágrafo único',
        'Multa por ato atentatório — CPC, art. 774, parágrafo único'
      ],
      juris: [],
      erro: 'Julgar os embargos e não dizer se a execução prossegue e por quanto. A sentença precisa devolver a execução ao trilho.'
    }
  ],
  cego: [
    'Prazo de 15 dias contado na forma do art. 231, conforme o modo de citação',
    'Garantia NÃO exigida para conhecer dos embargos',
    'Efeito suspensivo decidido com requerimento, garantia, relevância e risco',
    'Parte não alcançada pelo efeito suspensivo mantida em execução',
    'Certeza, liquidez e exigibilidade do título examinadas de ofício',
    'Rol do art. 917 percorrido quanto ao alegado',
    'Excesso: valor correto e memória de cálculo cobrados do embargante',
    'Prescrição e pagamento enfrentados',
    'Dispositivo diz o destino da execução e o valor remanescente',
    'Honorários fixados; protelatoriedade avaliada'
  ]
},

// ────────── DECISÃO NA IMPUGNAÇÃO AO CUMPRIMENTO DE SENTENÇA ──────────
'Impugnação ao cumprimento': {
  rito: 'Civil — cumprimento e execução',
  sobre: 'Defesa endoprocessual, com rol FECHADO de matérias — é o oposto dos embargos do art. 917, VI. Três pontos decidem o espelho: o rol do § 1º, o ônus de declarar o valor correto no excesso, e a multa e os honorários de dez por cento do art. 523, § 1º, que não se afastam por impugnar.',
  blocos: [
    {
      nome: 'Cabimento, prazo e ausência de garantia',
      deve: 'Quinze dias contados do fim do prazo de pagamento voluntário, independentemente de penhora ou de nova intimação. Nos próprios autos, sem autuação em apartado.',
      lei: [
        'Prazo e independência de penhora — CPC, art. 525, caput',
        'Prazo para pagamento voluntário — CPC, art. 523',
        'Multa e honorários de dez por cento — CPC, art. 523, § 1º'
      ],
      juris: [
        'Honorários no cumprimento, haja ou não impugnação — Súmula 517 do STJ'
      ],
      erro: 'Afastar a multa do art. 523, § 1º porque o executado impugnou. Impugnar não é pagar: a multa incide pelo não pagamento no prazo.'
    },
    {
      nome: 'O rol do § 1º — cognição limitada',
      deve: 'Só cabem as matérias do § 1º: falta ou nulidade da citação no processo que correu à revelia, ilegitimidade de parte, inexequibilidade do título ou inexigibilidade da obrigação, penhora incorreta ou avaliação errônea, excesso de execução ou cumulação indevida, incompetência, e causas modificativas ou extintivas posteriores à sentença.',
      lei: [
        'Matérias arguíveis — CPC, art. 525, § 1º, I a VII',
        'Causas modificativas ou extintivas supervenientes à sentença — CPC, art. 525, § 1º, VII',
        'Fato superveniente ao prazo da impugnação, por simples petição em 15 dias — CPC, art. 525, § 11'
      ],
      juris: [],
      erro: 'Reabrir discussão sobre o mérito já decidido. O que é anterior à sentença está coberto pela coisa julgada (CPC, art. 508).'
    },
    {
      nome: 'Excesso de execução — o ônus é do impugnante',
      deve: 'Alegado excesso, o executado declara de imediato o valor que entende correto e apresenta demonstrativo. Sem isso, a impugnação é rejeitada liminarmente quanto a esse fundamento, ou não se conhece dele.',
      lei: [
        'Ônus de declarar o valor correto — CPC, art. 525, § 4º',
        'Consequência da omissão — CPC, art. 525, § 5º'
      ],
      juris: [],
      erro: 'Determinar perícia contábil para achar o valor devido antes de exigir do impugnante o valor que ele entende correto. A lei inverte essa ordem.'
    },
    {
      nome: 'Efeito suspensivo',
      deve: 'A impugnação não suspende por si. Suspende quando garantida a execução por penhora, caução ou depósito suficientes, presentes fundamentos relevantes e risco de dano grave. E a suspensão pode ser parcial.',
      lei: [
        'Requisitos do efeito suspensivo — CPC, art. 525, § 6º',
        'Efeito suspensivo não impede substituição, reforço ou redução da penhora — CPC, art. 525, § 7º',
        'Suspensão parcial: prosseguimento quanto à parte restante — CPC, art. 525, § 8º',
        'Prosseguimento mediante caução do exequente — CPC, art. 525, § 10'
      ],
      juris: [],
      erro: 'Suspender tudo quando a impugnação atinge só parte do valor. O § 8º manda prosseguir no restante.'
    },
    {
      nome: 'Inexigibilidade por inconstitucionalidade',
      deve: 'Título fundado em norma ou interpretação declarada inconstitucional pelo STF é inexigível — mas só se a decisão do Supremo for anterior ao trânsito em julgado. Sendo posterior, o caminho é a rescisória, com prazo contado do trânsito da decisão do STF.',
      lei: [
        'Inexigibilidade do título — CPC, art. 525, §§ 12 e 13',
        'Efeitos temporais e rescisória — CPC, art. 525, §§ 14 e 15'
      ],
      juris: [
        'Tributo de trato sucessivo: efeitos futuros da coisa julgada cessam sem rescisória — STF, Temas 881 e 885 (RE 949.297/CE e RE 955.227/BA, Pleno, j. 08/02/2023)'
      ],
      erro: 'Declarar inexigível o título com base em precedente do STF posterior ao trânsito em julgado. Aí não é impugnação: é ação rescisória.'
    },
    {
      nome: 'Dispositivo e honorários',
      deve: 'Decidir a impugnação, dizer se o cumprimento prossegue e por qual valor, e fixar honorários — devidos na fase de cumprimento (art. 85, § 1º; Súmula 517 do STJ), somados aos da sucumbência na própria impugnação. A majoração do art. 85, § 11, é do tribunal ao julgar recurso, não do juízo de primeiro grau.',
      lei: [
        'Honorários e majoração — CPC, art. 85, §§ 1º e 11',
        'Não extingue a execução: interlocutória, agravo de instrumento — CPC, art. 1.015, parágrafo único',
        'Extingue a execução: sentença, apelação — CPC, arts. 203, § 1º, 925 e 1.009',
        'Extinção da execução — CPC, art. 924',
        'A extinção só produz efeito quando declarada por sentença — CPC, art. 925'
      ],
      juris: [
        'Honorários no cumprimento de sentença — Súmula 517 do STJ'
      ],
      erro: 'Não indicar o valor pelo qual o cumprimento segue. Acolhida em parte a impugnação, o dispositivo tem de recalcular ou mandar recalcular expressamente.'
    }
  ],
  cego: [
    'Prazo de 15 dias após o prazo do art. 523, sem penhora e sem nova intimação',
    'Multa e honorários de 10% mantidos apesar da impugnação',
    'Matérias limitadas ao rol do art. 525, § 1º',
    'Matéria anterior à sentença rejeitada pela coisa julgada',
    'Excesso: valor correto e demonstrativo exigidos do impugnante',
    'Efeito suspensivo com garantia, relevância e risco',
    'Suspensão parcial quando a impugnação é parcial',
    'Inexigibilidade por inconstitucionalidade: decisão do STF anterior ao trânsito',
    'Dispositivo diz se o cumprimento prossegue e por quanto',
    'Honorários fixados e majoração examinada'
  ]
}

};
