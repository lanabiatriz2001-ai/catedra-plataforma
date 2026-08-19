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
  rito: 'Penal — comum ordinário',
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
  rito: 'Penal — conhecimento',
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
  rito: 'Penal — júri',
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
  rito: 'Penal — conhecimento',
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
}

};
