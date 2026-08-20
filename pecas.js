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
  carreiras: ['Magistratura'],
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
  carreiras: ['Magistratura'],
  sobre: 'A peça mais cobrada na segunda fase criminal. O esqueleto vem do art. 381 do CPP; o que separa a nota boa da nota média é a ORDEM interna — preliminar no lugar certo, mérito crime por crime, e dosimetria individualizada por réu, em três fases explícitas. Cada bloco abaixo abre a fórmula de redação correspondente.',
  blocos: [
    {
      nome: 'Cabeçalho e relatório',
      deve: 'Relatório é histórico, não é convencimento. Ele situa o examinador: quem, o quê, quando, e o que já aconteceu no processo. Sintético, mas sem pular nenhum pedido das partes.',
      itens: [
        { t:'Qualificação e data do recebimento', d:'nome, nacionalidade, estado civil, nascimento, naturalidade, filiação e domicílio do réu; e a data em que a denúncia foi recebida — é marco interruptivo da prescrição.' },
        { t:'Síntese da imputação', d:'local (define competência), data (define prescrição), conduta e a capitulação dada pela acusação (é sobre ela que a emendatio vai incidir).' },
        { t:'Marcha processual', d:'recebimento, citação, resposta à acusação com as preliminares suscitadas, incidentes apartados, audiência una, diligências do art. 402 e alegações finais.' },
        { t:'Pedido de cada parte', d:'o que a acusação pediu e o que a defesa pediu, um a um. Pedido não enfrentado na sentença é omissão, e omissão custa ponto.' }
      ],
      lei: [
        'Requisitos da sentença — CPP, art. 381, I e II',
        'Recebimento da denúncia interrompe a prescrição — CP, art. 117, I',
        'Termo de audiência e registro dos atos — CPP, art. 405'
      ],
      juris: [],
      modelo: 'Vistos etc.\n\nO MINISTÉRIO PÚBLICO DO ESTADO DE ..., por seu Promotor de Justiça, ofereceu denúncia contra FULANO DE TAL, já qualificado nos autos, dando-o como incurso nas sanções do art. ... do Código Penal, pelos fatos ocorridos em ..., na comarca de ....\n\nSegundo a denúncia, ... (síntese objetiva do fato imputado).\n\nA denúncia foi recebida em ... (fl. ...). Regularmente citado, o acusado apresentou resposta à acusação (fls. ...), na qual suscitou preliminar de ... e, no mérito, pugnou por .... Não foi caso de absolvição sumária (art. 397 do CPP).\n\nNa audiência una de instrução e julgamento foram ouvidos o ofendido, as testemunhas de acusação e de defesa, seguindo-se o interrogatório do réu. Nada foi requerido na fase do art. 402 do CPP.\n\nEm alegações finais, o Ministério Público pugnou por ...; a defesa, por ....\n\nÉ o relatório. Decido.',
      erro: 'Descrever o fato em três parágrafos e esquecer a suma da defesa e os pedidos dela. O espelho conta os dois lados, e o relatório é a parte mais barata de pontuar.'
    },
    {
      nome: 'Preliminares — processo, ação, punibilidade',
      deve: 'Enfrentar antes do mérito o que impede julgá-lo, sempre nessa ordem: primeiro o que é do processo, depois o que é da ação, por último o que extingue a punibilidade. A ordem não é estética: uma nulidade processual reconhecida torna inútil discutir a inépcia.',
      itens: [
        { t:'Do processo', d:'competência, nulidades (prova ilícita e derivada, cerceamento de defesa, quebra da cadeia de custódia, inversão da ordem do art. 400) e pressupostos processuais.' },
        { t:'Da ação', d:'inépcia da denúncia por falta de requisito do art. 41, ausência de justa causa, ilegitimidade de parte, litispendência e coisa julgada.' },
        { t:'Da punibilidade', d:'prescrição, decadência, perempção, renúncia, perdão, falta de representação. Calculada pela pena em ABSTRATO, a prescrição resolve-se aqui; dependendo da pena aplicada (retroativa), só depois da dosimetria.' },
        { t:'O fecho de cada preliminar', d:'toda preliminar suscitada tem de ser expressamente acolhida ou rejeitada, com uma linha de motivo. Silenciar sobre uma delas é nulidade por omissão.' }
      ],
      lei: [
        'Rejeição da denúncia e falta de justa causa — CPP, art. 395',
        'Requisitos da denúncia — CPP, art. 41',
        'Nulidades — CPP, arts. 563 a 573',
        'Causas de extinção da punibilidade — CP, art. 107',
        'Prazos prescricionais e termo inicial — CP, arts. 109 e 111',
        'Prescrição pela pena aplicada — CP, art. 110',
        'Redução do prazo pela menoridade ou senilidade — CP, art. 115',
        'Causas interruptivas — CP, art. 117'
      ],
      juris: [
        'Prescrição em perspectiva é inadmissível — Súmula 438 do STJ',
        'Menoridade exige documento hábil — Súmula 74 do STJ'
      ],
      modelo: 'DAS PRELIMINARES\n\nA defesa suscitou a preliminar de ..., ao argumento de que .... Não lhe assiste razão. Isso porque ... (uma ou duas linhas de motivo). Rejeito, pois, a preliminar.\n\nOU\n\nAcolho a preliminar de ..., porquanto ..., e, em consequência, declaro nulo o ato de fl. ..., determinando ....\n\nSuperadas as questões preliminares, passo ao exame do mérito.',
      erro: 'Levar a prescrição pela pena em concreto para o começo da sentença. Enquanto a pena não estiver dosada não há prazo a contar — nessa hipótese o mérito vem primeiro, e a extinção da punibilidade vai no dispositivo.'
    },
    {
      nome: 'Mérito — materialidade, autoria e tipicidade, crime por crime',
      deve: 'A fundamentação é apartada por crime e a autoria, individualizada por réu. Nesta ordem: materialidade, autoria, tipicidade, teses da defesa. Materialidade sem autoria e autoria sem materialidade são hipóteses reais — não presuma que uma arrasta a outra.',
      itens: [
        { t:'Materialidade', d:'apontar a prova concreta: laudo pericial, auto de apreensão, prontuário, documento. No roubo, a materialidade não depende de exame de corpo de delito e admite outros meios de prova.' },
        { t:'Autoria, réu por réu', d:'descrever a conduta de cada um. No concurso de agentes, apontar a divisão de tarefas e o liame subjetivo; a participação de menor importância e a cooperação dolosamente distinta têm consequência na pena.' },
        { t:'Tipicidade', d:'elementares presentes, dolo ou culpa, consumação ou tentativa, e o crime-fim quando houver absorção (ante-fato e pós-fato impuníveis).' },
        { t:'Teses da defesa', d:'atipicidade entra antes ou junto da tipicidade; excludente de ilicitude e de culpabilidade entram DEPOIS de firmadas materialidade e autoria — não se exclui a ilicitude de um fato que não se provou.' },
        { t:'Base probatória', d:'a condenação não se sustenta em elemento colhido só no inquérito. Cite a prova produzida em contraditório e diga por que ela convence.' }
      ],
      lei: [
        'Vedação à condenação apoiada só no inquérito — CPP, art. 155',
        'Ônus da prova — CPP, art. 156',
        'Exame de corpo de delito e prova testemunhal supletiva — CPP, arts. 158 e 167',
        'Relação de causalidade — CP, art. 13',
        'Tentativa — CP, art. 14, II',
        'Concurso de pessoas e participação de menor importância — CP, art. 29 e §§'
      ],
      juris: [
        'Reconhecimento pessoal fora do art. 226 do CPP — STJ, HC 598.886/SC, 6ª Turma, j. 27/10/2020'
      ],
      modelo: 'DO MÉRITO\n\nA materialidade do delito está demonstrada por ... (laudo de fl. ..., auto de apreensão de fl. ...).\n\nA autoria também é certa. Em juízo, a testemunha ... narrou que ... (fl. ...). No mesmo sentido, .... O réu, interrogado, ....\n\nAssim, comprovadas materialidade e autoria, e presentes as elementares do tipo do art. ... do Código Penal, a conduta é típica.\n\nPasso ao exame das teses defensivas. A defesa sustentou .... A tese não prospera, porque ....',
      erro: 'Condenar transcrevendo o depoimento prestado na delegacia. O art. 155 do CPP é expresso, e é dos itens que a banca marca com mais frequência.'
    },
    {
      nome: 'Emendatio e mutatio libelli',
      deve: 'O réu se defende dos FATOS, não da capitulação. Se os fatos narrados na denúncia comportam definição jurídica diversa, o juiz a corrige — ainda que para pena mais grave. Se a prova revelou fato NOVO, não narrado, sem aditamento o juiz não pode condenar por ele.',
      itens: [
        { t:'Emendatio (art. 383)', d:'mesma base fática, capitulação diferente. Vem depois de firmadas materialidade e autoria e ANTES do reconhecimento das causas de aumento e diminuição.' },
        { t:'Emendatio que abre benefício', d:'se a nova definição tornar cabível suspensão condicional do processo, o juiz abre vista ao Ministério Público — a iniciativa da proposta é dele.' },
        { t:'Mutatio (art. 384)', d:'fato novo revelado na instrução. O MP adita em 5 dias, a defesa se manifesta em 5 dias, e podem ser ouvidas até 3 testemunhas. Sem aditamento, não há condenação pelo fato novo.' },
        { t:'Limite recursal', d:'mutatio é instituto de primeiro grau. O tribunal não pode aplicá-la ao julgar o recurso.' }
      ],
      lei: [
        'Emendatio libelli — CPP, art. 383 e §§ 1º e 2º',
        'Mutatio libelli — CPP, art. 384 e §§',
        'Suspensão condicional do processo — Lei 9.099/95, art. 89'
      ],
      juris: [
        'Mutatio não se aplica em segunda instância — Súmula 453 do STF'
      ],
      modelo: 'DA EMENDATIO LIBELLI\n\nEmbora a denúncia tenha capitulado a conduta no art. ... do Código Penal, os fatos nela narrados — e comprovados nos autos — configuram, na verdade, o crime do art. ..., porquanto ....\n\nAssim, com fundamento no art. 383 do Código de Processo Penal, atribuo aos fatos definição jurídica diversa, para considerar o acusado incurso nas sanções do art. ... do Código Penal, sem alteração da descrição fática contida na peça acusatória.',
      erro: 'Chamar de emendatio o que é mutatio. Se você precisou de um fato que a denúncia não narra, não é correção de rótulo — é fato novo, e sem aditamento a condenação é nula.'
    },
    {
      nome: 'Dispositivo — absolvição',
      deve: 'Absolver exige indicar o INCISO do art. 386, e não apenas dizer que absolve. Cada inciso tem consequência distinta na esfera cível e na execução.',
      itens: [
        { t:'Escolher o inciso', d:'inexistência provada do fato (I); falta de prova do fato (II); fato atípico (III); prova de que o réu não concorreu (IV); falta de prova de que concorreu (V); excludente ou fundada dúvida sobre ela (VI); prova insuficiente para condenar (VII).' },
        { t:'Efeitos obrigatórios', d:'soltura imediata se preso, cessação das medidas cautelares reais e pessoais, restituição de coisas apreendidas e devolução do valor da fiança.' },
        { t:'Absolvição imprópria', d:'reconhecida a inimputabilidade do art. 26, caput, do CP, absolve-se com aplicação de medida de segurança, especificando a espécie e o prazo mínimo.' }
      ],
      lei: [
        'Hipóteses de absolvição — CPP, art. 386, I a VII',
        'Efeitos da absolvição — CPP, art. 386, parágrafo único',
        'Medida de segurança — CP, arts. 96 e 97',
        'Devolução da fiança — CPP, art. 337'
      ],
      juris: [],
      modelo: 'Ante o exposto, JULGO IMPROCEDENTE a pretensão punitiva estatal para ABSOLVER o acusado FULANO DE TAL da imputação de prática do crime do art. ... do Código Penal, com fundamento no art. 386, inciso ..., do Código de Processo Penal.\n\nExpeça-se alvará de soltura, se por al não estiver preso. Revogo as medidas cautelares diversas da prisão anteriormente impostas. Restituam-se os bens apreendidos e devolva-se o valor da fiança prestada.\n\nSem custas.\n\nPublique-se. Registre-se. Intimem-se.',
      erro: 'Citar inciso que não existe. O art. 386 do CPP vai do inciso I ao VII — a numeração acima disso é erro que a banca localiza de imediato.'
    },
    {
      nome: 'Dispositivo — condenação e dosimetria em três fases',
      deve: 'A fundamentação é apartada por CRIME; a dosimetria é apartada por RÉU. Três fases explícitas, cada uma com o resultado numérico ao final. Reconhecer uma circunstância não é o mesmo que valorá-la: reconhece-se onde couber, valora-se uma única vez, na fase mais adiantada em que ela aparecer.',
      itens: [
        { t:'1ª fase — circunstâncias judiciais', d:'parte-se do MÍNIMO legal, não do termo médio. Percorra as oito do art. 59 e valore só as que tiverem lastro concreto no enunciado. Patamar de trabalho usual: 1/8 do intervalo entre mínimo e máximo por circunstância negativa — critério jurisprudencial, não legal, que precisa ser explicitado.' },
        { t:'1ª fase — o que não pode', d:'inquérito e ação penal em curso não agravam a pena-base. A mesma condenação não serve como mau antecedente e como reincidência. Ato infracional não gera antecedente nem reincidência.' },
        { t:'2ª fase — agravantes e atenuantes', d:'valoram-se sobre a pena-base, patamar usual de 1/6. As atenuantes precedem as agravantes. No concurso entre elas, prevalecem as preponderantes do art. 67 — motivos determinantes, personalidade e reincidência. Não se ultrapassa o mínimo nem o máximo nesta fase.' },
        { t:'3ª fase — causas de aumento e diminuição', d:'as únicas que rompem os limites do tipo. Aplicação cumulativa, cada operação sobre o resultado da anterior. Havendo mais de uma causa na Parte Especial, o juiz pode limitar-se a um só aumento ou a uma só diminuição, prevalecendo a que mais aumente ou diminua.' },
        { t:'Fora do trifásico — concurso de crimes', d:'material, formal e continuado só entram DEPOIS de fechada a dosimetria de cada crime. Havendo reclusão e detenção, executa-se primeiro a reclusão.' },
        { t:'Pena de multa', d:'em duas etapas: quantidade de dias-multa, fase a fase, proporcional à privativa; e valor do dia-multa, fixado pela situação econômica do réu ao tempo do fato, entre 1/30 e 5 salários mínimos.' }
      ],
      lei: [
        'Circunstâncias judiciais — CP, art. 59',
        'Cálculo da pena em três fases — CP, art. 68',
        'Concurso de causas de aumento na Parte Especial — CP, art. 68, parágrafo único',
        'Agravantes — CP, arts. 61 e 62',
        'Atenuantes — CP, arts. 65 e 66',
        'Concurso de circunstâncias preponderantes — CP, art. 67',
        'Reincidência e prazo depurador — CP, arts. 63 e 64',
        'Concurso material, formal e crime continuado — CP, arts. 69, 70 e 71',
        'Dias-multa e valor do dia-multa — CP, arts. 49 e 60'
      ],
      juris: [
        'Inquéritos e ações em curso não agravam a pena-base — Súmula 444 do STJ',
        'Reincidência não vale na 1ª e na 2ª fase ao mesmo tempo — Súmula 241 do STJ',
        'Atenuante não reduz abaixo do mínimo — Súmula 231 do STJ',
        'Confissão usada na convicção gera a atenuante — Súmula 545 do STJ',
        'Maus antecedentes não se sujeitam ao prazo de cinco anos — STF, RE 593.818, Tema 150, j. 17/08/2020',
        'Roubo majorado: aumento exige fundamentação concreta — Súmula 443 do STJ'
      ],
      modelo: 'Ante o exposto, JULGO PROCEDENTE a pretensão punitiva estatal para CONDENAR o acusado FULANO DE TAL, já qualificado, como incurso nas sanções do art. ... do Código Penal.\n\nPasso a dosar a pena, individualmente, na forma do art. 68 do Código Penal.\n\nPRIMEIRA FASE. A culpabilidade é normal à espécie. O réu não registra antecedentes. Nada há a valorar quanto à conduta social e à personalidade. Os motivos são os próprios do tipo. As circunstâncias do crime, contudo, são desfavoráveis, pois ... . As consequências e o comportamento da vítima nada acrescentam. Presente uma circunstância judicial negativa, e adotando como parâmetro a fração de 1/8 do intervalo da pena, fixo a PENA-BASE em ... anos de reclusão e ... dias-multa.\n\nSEGUNDA FASE. Presente a atenuante da confissão espontânea (art. 65, III, "d", do CP), atenuo a pena em 1/6. Presente a agravante da reincidência (art. 61, I, do CP), agravo a pena em 1/6. Compensadas as circunstâncias por serem ambas preponderantes (art. 67 do CP), fixo a PENA INTERMEDIÁRIA em ... anos de reclusão e ... dias-multa.\n\nTERCEIRA FASE. Presente a causa de aumento do art. ..., § ..., do Código Penal, majoro a pena em ..., pelas razões já expostas. Ausentes causas de diminuição, torno DEFINITIVA a pena em ... anos de reclusão e ... dias-multa, à razão de 1/30 do salário mínimo vigente ao tempo do fato.',
      erro: 'Valorar o mesmo fato duas vezes. Se a circunstância é elementar do tipo, ou já serviu de qualificadora, ou já é agravante, ela não volta na fase anterior — bis in idem é o erro mais descontado da peça.'
    },
    {
      nome: 'Regime, substituição, sursis e detração',
      deve: 'Depois da pena definitiva, quatro decisões encadeadas — e nenhuma delas se resolve pela gravidade abstrata do crime.',
      itens: [
        { t:'Detração antes do regime', d:'o tempo de prisão provisória é computado para DETERMINAR o regime inicial, ainda na sentença. Não confunda com a detração da execução.' },
        { t:'Regime inicial', d:'pena acima de 8 anos, fechado; acima de 4 até 8, semiaberto se primário; até 4, aberto se primário. Circunstância judicial desfavorável autoriza regime mais gravoso, desde que motivada concretamente. Detenção nunca começa em fechado.' },
        { t:'Substituição por restritivas', d:'privativa não superior a 4 anos, crime sem violência ou grave ameaça, réu não reincidente em crime doloso e circunstâncias favoráveis. Examinar sempre, ainda que para negar.' },
        { t:'Suspensão condicional da pena', d:'só quando incabível a substituição: pena não superior a 2 anos, réu não reincidente em crime doloso, circunstâncias favoráveis. Fixar período de prova e condições.' },
        { t:'Crime hediondo', d:'a obrigatoriedade do regime inicial fechado foi afastada pelo STF — o regime se define pelas regras gerais do art. 33, com fundamentação concreta.' }
      ],
      lei: [
        'Regimes e critérios de fixação — CP, art. 33, §§ 2º e 3º',
        'Detração para fixar o regime na sentença — CPP, art. 387, § 2º',
        'Substituição por restritivas de direitos — CP, art. 44',
        'Espécies de restritivas — CP, arts. 43, 46 e 47',
        'Suspensão condicional da pena — CP, arts. 77 e 78'
      ],
      juris: [
        'Gravidade em abstrato não motiva regime mais severo — Súmula 718 do STF',
        'Regime mais severo exige motivação idônea — Súmula 719 do STF',
        'Pena-base no mínimo veda regime mais gravoso — Súmula 440 do STJ',
        'Reincidente com pena até 4 anos e circunstâncias favoráveis: semiaberto — Súmula 269 do STJ',
        'Regime inicial fechado obrigatório em crime hediondo é inconstitucional — STF, HC 111.840/ES, Pleno, j. 27/06/2012'
      ],
      modelo: 'Considerado o tempo de prisão provisória (art. 387, § 2º, do CPP), e nos termos do art. 33, § 2º, "b", do Código Penal, o condenado iniciará o cumprimento da pena em regime SEMIABERTO.\n\nDeixo de substituir a pena privativa de liberdade por restritivas de direitos, porque o crime foi cometido com violência à pessoa, o que afasta o requisito do art. 44, I, do Código Penal. Pelo mesmo motivo, incabível a suspensão condicional da pena do art. 77 do mesmo diploma.\n\nOU\n\nPresentes os requisitos do art. 44 do Código Penal, SUBSTITUO a pena privativa de liberdade por duas restritivas de direitos, consistentes em prestação de serviços à comunidade e prestação pecuniária no valor de ..., cujas condições serão especificadas pelo Juízo da Execução.',
      erro: 'Fixar o fechado só porque o crime é grave, ou negar a substituição sem dizer qual requisito do art. 44 faltou. Nos dois casos falta motivação, e o item cai inteiro.'
    },
    {
      nome: 'Fecho — efeitos, reparação, custas e providências',
      deve: 'A sentença só está pronta quando resolve o que fazer com o réu agora, o que fica para depois do trânsito e o que se comunica a quem.',
      itens: [
        { t:'Recorrer em liberdade', d:'decidir fundamentadamente sobre manter, decretar ou revogar a prisão preventiva. Silenciar é omissão.' },
        { t:'Reparação mínima', d:'o valor mínimo do art. 387, IV, exige pedido expresso e contraditório sobre o montante. Sem isso, não se arbitra de ofício.' },
        { t:'Efeitos da condenação', d:'os do art. 91 são automáticos (perda do produto e do proveito, obrigação de reparar); os do art. 92 não são — perda do cargo, incapacidade para o pátrio poder e inabilitação para dirigir precisam ser declarados motivadamente na sentença.' },
        { t:'Custas e providências finais', d:'condenação em custas; e, após o trânsito, lançamento no rol dos culpados, comunicação ao instituto de identificação, ofício ao TRE para suspensão dos direitos políticos e expedição da guia de execução.' }
      ],
      lei: [
        'Prisão ou liberdade na sentença — CPP, art. 387, § 1º',
        'Valor mínimo de reparação — CPP, art. 387, IV',
        'Efeitos genéricos da condenação — CP, art. 91',
        'Efeitos específicos, não automáticos — CP, art. 92 e parágrafo único',
        'Suspensão dos direitos políticos — CF, art. 15, III',
        'Guia de recolhimento — LEP, arts. 105 e 106',
        'Custas — CPP, art. 804'
      ],
      juris: [],
      modelo: 'Presentes os requisitos do art. 312 do Código de Processo Penal, e pelos fundamentos já expostos, NEGO ao sentenciado o direito de recorrer em liberdade. Expeça-se mandado de prisão.\n\nOU\n\nAusentes os requisitos da prisão preventiva, PODERÁ o sentenciado recorrer em liberdade.\n\nDeixo de fixar o valor mínimo de reparação (art. 387, IV, do CPP), à falta de pedido expresso e de contraditório sobre o montante.\n\nCondeno o réu ao pagamento das custas processuais.\n\nCertificado o trânsito em julgado: a) lance-se o nome do réu no rol dos culpados; b) oficie-se ao Tribunal Regional Eleitoral, para os fins do art. 15, III, da Constituição; c) oficie-se ao instituto de identificação; d) expeça-se guia de execução.\n\nPublique-se. Registre-se. Intimem-se.\n\nLocal, data.\nJuiz de Direito',
      erro: 'Terminar a peça sem o P.R.I. e sem decidir sobre recorrer em liberdade. É a diferença entre uma sentença completa e uma sentença que a banca lê como inacabada.'
    }
  ],
  cego: [
    'Relatório com qualificação, data do recebimento e suma dos DOIS lados',
    'Todos os pedidos das partes registrados',
    'Preliminares na ordem: processo → ação → punibilidade',
    'Cada preliminar expressamente acolhida ou rejeitada',
    'Prescrição examinada na fase certa (abstrata antes, retroativa depois)',
    'Fundamentação apartada por crime',
    'Materialidade antes da autoria; autoria individualizada por réu',
    'Condenação apoiada em prova produzida em contraditório (art. 155)',
    'Teses da defesa enfrentadas uma a uma',
    'Emendatio ou mutatio no lugar certo, se for o caso',
    'Absolvição com o inciso do art. 386 indicado',
    'Dosimetria individualizada por réu, em três fases explícitas',
    'Sem bis in idem entre elementar, qualificadora, agravante e causa de aumento',
    'Multa dosada e proporcional à privativa',
    'Concurso de crimes aplicado depois da dosimetria de cada um',
    'Detração computada e regime inicial fundamentado',
    'Substituição e sursis enfrentados, ainda que para negar',
    'Recorrer em liberdade decidido',
    'Custas, rol dos culpados, TRE, guia de execução e P.R.I.'
  ],
  dicas: [
    { t:'Antes de escrever, faça o quadro de rascunho: circunstâncias judiciais favoráveis e desfavoráveis, agravantes e atenuantes, causas de aumento e de diminuição. É o que impede o bis in idem, e leva dois minutos.', alerta:false },
    'Grife o enunciado procurando o que muda a pena: idade do réu na data do fato e na data da sentença, reincidência, concurso de agentes, arma, tentativa, confissão, e datas que possam ter feito a prescrição correr.',
    'A data da sentença é a data da prova, salvo se o enunciado disser outra coisa. Isso importa para a senilidade do art. 115 e para a prescrição.',
    'Havendo vários réus, absolva primeiro e condene depois. Fica mais limpo e você não repete a análise.',
    'A pena-base parte do mínimo. Não existe teoria do termo médio no direito brasileiro atual.',
    'Passe os anos para meses antes de calcular frações. Evita erro aritmético, que na dosimetria custa o item inteiro.',
    'Se o tempo apertar, não sacrifique o dispositivo. Uma segunda fase resumida perde pontos; uma peça que não chega ao P.R.I. perde muito mais.',
    'Errou ao escrever? Não rasure: vírgula, "digo", vírgula, e siga.',
    'Na primeira citação escreva o diploma por extenso ("Código de Processo Penal"); nas demais, use a sigla.',
    { t:'Cuidado com o art. 386 do CPP: ele vai do inciso I ao VII. Inciso acima disso não existe, e a banca vê na hora.', alerta:true },
    { t:'Reconhecer não é valorar. A mesma circunstância pode ser reconhecida em mais de uma fase, mas só pode ser valorada uma vez — na fase mais adiantada em que apareça.', alerta:true },
    { t:'Concurso de crimes não é quarta fase. Ele entra depois de fechada a dosimetria de cada delito, e não incide sobre a multa — salvo na continuidade delitiva.', alerta:true }
  ],
  especiais: [
    { t:'Tráfico de drogas', d:'Na primeira fase preponderam a natureza e a quantidade da substância, a personalidade e a conduta social (Lei 11.343/06, art. 42) — e a quantidade não pode ser usada de novo na terceira fase para negar o tráfico privilegiado. A causa de diminuição de 1/6 a 2/3 do art. 33, § 4º exige réu primário, de bons antecedentes, que não se dedique a atividades criminosas nem integre organização criminosa.' },
    { t:'Violência doméstica e familiar', d:'Vedada a substituição por prestação pecuniária, cesta básica ou pagamento isolado de multa (Lei 11.340/06, art. 17). Não cabem os institutos da Lei 9.099/95 (Súmula 536 do STJ), não se aplica a substituição por restritivas nos crimes cometidos com violência (Súmula 588 do STJ) e não incide o princípio da insignificância (Súmula 589 do STJ).' },
    { t:'Réu menor de 21 anos na data do fato', d:'Atenuante do art. 65, I, do CP e prazo prescricional reduzido pela metade (art. 115). A menoridade exige prova por documento hábil (Súmula 74 do STJ) — se o enunciado não trouxer o documento, diga isso na sentença em vez de simplesmente aplicar.' },
    { t:'Corrupção de menores', d:'O art. 244-B do ECA é crime formal: configura-se independentemente de prova da efetiva corrupção do adolescente (Súmula 500 do STJ). Nos crimes praticados em concurso com menor, verifique se não há bis in idem com a agravante do art. 62, IV, do CP.' },
    { t:'Sucessão de leis no tempo', d:'Verifique qual lei é mais benéfica ao réu no conjunto, e não dispositivo por dispositivo. A lei penal mais benigna retroage (CF, art. 5º, XL; CP, art. 2º, parágrafo único), inclusive quanto ao regime e à substituição.' },
    { t:'Concurso material benéfico', d:'Na continuidade delitiva e no concurso formal, se a exasperação resultar pena maior que a soma das penas, aplica-se a soma (CP, arts. 70, parágrafo único, e 71, parágrafo único). Confira sempre — é armadilha frequente de enunciado.' }
  ]
},

// ─────────────────────────────────────────────────────────────────────────────
'Decisão saneadora': {
  rito: 'Civil — conhecimento',
  carreiras: ['Magistratura'],
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
  carreiras: ['Magistratura'],
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
  carreiras: ['Magistratura'],
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
  carreiras: ['Magistratura'],
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
  carreiras: ['Magistratura'],
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
  carreiras: ['Ministério Público'],
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
  carreiras: ['Magistratura'],
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
  carreiras: ['Magistratura'],
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
  carreiras: ['Magistratura','Procuradorias'],
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
  carreiras: ['Magistratura','Advocacia'],
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
  carreiras: ['Magistratura','Advocacia'],
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
},
// ═══════════════════════ DEFENSORIA E ADVOCACIA ═══════════════════════
'Habeas corpus': {
  rito: 'Constitucional — remédios',
  carreiras: ['Defensoria','Advocacia','Ministério Público'],
  sobre: 'Ação constitucional de rito sumaríssimo, sem dilação probatória. Três coisas decidem a peça: identificar corretamente a autoridade coatora (dela depende a competência), demonstrar a ilegalidade com prova pré-constituída, e pedir o que o writ pode dar — soltura, trancamento, anulação —, não o reexame de prova.',
  blocos: [
    { nome: 'Cabimento e a coação apontada',
      deve: 'Dizer, na primeira linha, qual liberdade de locomoção está ameaçada ou violada e por qual ato. Sem constrangimento à locomoção — atual ou iminente — não há habeas corpus, por mais grave que seja a ilegalidade.',
      lei: ['Garantia constitucional — CF, art. 5º, LXVIII',
            'Cabimento — CPP, art. 647',
            'Hipóteses de coação ilegal — CPP, art. 648, I a VII'],
      juris: ['Não cabe contra decisão que aplica só pena de multa — Súmula 693 do STF',
              'Não cabe contra punição disciplinar militar — Súmula 694 do STF',
              'Não cabe se já extinta a pena privativa de liberdade — Súmula 695 do STF'],
      erro: 'Usar o HC como recurso genérico contra decisão que não afeta a liberdade de locomoção. É a razão mais comum de não conhecimento.' },
    { nome: 'Legitimidade, autoridade coatora e competência',
      deve: 'Qualquer pessoa pode impetrar, em favor próprio ou alheio, com ou sem advogado, e o Ministério Público também. A competência se define pela autoridade coatora — errar quem é o coator derruba a peça na porta.',
      lei: ['Legitimidade universal — CPP, art. 654',
            'Requisitos da petição — CPP, art. 654, § 1º',
            'Competência do STF — CF, art. 102, I, "d" e "i"',
            'Competência do STJ — CF, art. 105, I, "c"',
            'Competência dos tribunais e do juiz — CPP, art. 650'],
      juris: ['Concessão de ofício pelo tribunal — CPP, art. 654, § 2º'],
      erro: 'Apontar como coator o delegado quando a prisão foi decretada pelo juiz. O coator é quem pratica ou mantém o ato — e é ele que define o tribunal competente.' },
    { nome: 'A ilegalidade, com prova pré-constituída',
      deve: 'O rito não comporta instrução: tudo que se alega tem de vir documentado na impetração. Enquadre a ilegalidade em uma das hipóteses do art. 648 e junte a peça que a demonstra.',
      lei: ['Falta de justa causa — CPP, art. 648, I',
            'Excesso de prazo — CPP, art. 648, II',
            'Nulidade do processo — CPP, art. 648, VI',
            'Extinção da punibilidade — CPP, art. 648, VII'],
      juris: ['Habeas corpus não é via para reexame de prova','Excesso de prazo aferido pela razoabilidade, não por soma aritmética'],
      erro: 'Pedir dilação probatória ou perícia. Se o fato depende de prova a ser produzida, a via é outra, e o writ não é conhecido.' },
    { nome: 'Liminar',
      deve: 'A liminar em habeas corpus não tem previsão expressa no CPP — é construção jurisprudencial, e por isso precisa ser fundamentada nos dois requisitos: a plausibilidade da ilegalidade e o risco de que a espera consuma o direito.',
      lei: ['Poder geral de cautela — CPP, art. 660, § 2º'],
      juris: ['Não cabe HC contra indeferimento de liminar em HC no tribunal superior — Súmula 691 do STF',
              'Mitigação da Súmula 691 em caso de flagrante ilegalidade'],
      erro: 'Pedir liminar sem dizer o que acontece se ela for negada. Sem perigo demonstrado a liminar é indeferida e o pedido perde força.' },
    { nome: 'Pedido — o que o writ pode entregar',
      deve: 'Formular pedido próprio da via: relaxamento da prisão ilegal, revogação da preventiva, substituição por cautelares diversas, trancamento da ação penal ou do inquérito, anulação de ato processual, extinção da punibilidade. Pedido genérico de "justiça" não se defere.',
      lei: ['Concessão da ordem e alvará de soltura — CPP, arts. 660 e 661',
            'Requisição de informações à autoridade coatora — CPP, art. 662',
            'Medidas cautelares diversas da prisão — CPP, art. 319'],
      juris: ['Trancamento da ação penal é medida excepcional, cabível na atipicidade manifesta, na ausência de indícios ou na extinção da punibilidade'],
      erro: 'Pedir só a soltura quando o caso comporta trancamento, ou o contrário. O pedido tem de corresponder à ilegalidade que você descreveu.' },
    { nome: 'Fecho e providências',
      deve: 'Requerer informações da autoridade coatora, indicar as peças que instruem, e — quando for o caso — pedir preferência de julgamento. Habeas corpus não tem custas.',
      lei: ['Informações da autoridade — CPP, art. 662',
            'Gratuidade — CPP, art. 5º, LXXVII, da CF',
            'Recurso ordinário constitucional — CF, arts. 102, II, "a", e 105, II, "a"'],
      juris: [],
      erro: 'Esquecer de instruir com a decisão atacada. Sem ela o tribunal não tem como aferir a ilegalidade, e o writ não é conhecido.' }
  ],
  cego: ['Coação à liberdade de locomoção identificada','Hipótese do art. 648 apontada',
    'Autoridade coatora corretamente indicada','Competência justificada por ela',
    'Prova pré-constituída juntada','Liminar com plausibilidade e perigo',
    'Pedido próprio da via (relaxar, revogar, trancar, anular)',
    'Informações da autoridade requeridas','Sem pedido de dilação probatória']
},

'Resposta à acusação': {
  rito: 'Penal — procedimento comum',
  carreiras: ['Defensoria','Advocacia'],
  sobre: 'Peça obrigatória e a única chance de encerrar o processo antes da instrução. Ela tem duas ambições distintas: as preliminares, que atacam o processo, e o mérito, que busca a absolvição sumária do art. 397. E tem uma função silenciosa que decide a instrução inteira: arrolar testemunhas — não o fazer aqui gera preclusão.',
  blocos: [
    { nome: 'Preliminares e questões processuais',
      deve: 'Alegar tudo o que interessa à defesa antes do mérito: incompetência, inépcia da denúncia, falta de justa causa, ilicitude da prova, nulidade da investigação e quebra da cadeia de custódia.',
      lei: ['Conteúdo da resposta — CPP, art. 396-A',
            'Rejeição da denúncia — CPP, art. 395',
            'Requisitos da denúncia — CPP, art. 41',
            'Provas ilícitas e derivadas — CPP, art. 157 e §§',
            'Cadeia de custódia — CPP, arts. 158-A a 158-F'],
      juris: ['Nulidade exige demonstração de prejuízo — CPP, art. 563'],
      erro: 'Deixar a alegação de incompetência para depois. Exceções vão em apartado, mas a matéria também se argui aqui, sob pena de preclusão em alguns casos.' },
    { nome: 'Mérito — a absolvição sumária',
      deve: 'Pedir expressamente a absolvição sumária, apontando o inciso do art. 397: excludente de ilicitude, excludente de culpabilidade salvo inimputabilidade, atipicidade do fato ou punibilidade extinta.',
      lei: ['Hipóteses de absolvição sumária — CPP, art. 397, I a IV',
            'Extinção da punibilidade — CP, art. 107',
            'Excludentes de ilicitude — CP, art. 23'],
      juris: [],
      erro: 'Pedir absolvição sumária por inimputabilidade. O art. 397, II ressalva esse caso justamente porque ele leva à absolvição imprópria, que exige instrução.' },
    { nome: 'Provas e rol de testemunhas',
      deve: 'Especificar as provas pretendidas e arrolar as testemunhas — até oito no ordinário, cinco no sumário. Este é o momento; depois há preclusão.',
      lei: ['Especificação de provas e rol — CPP, art. 396-A',
            'Número de testemunhas no ordinário — CPP, art. 401',
            'Número no sumário — CPP, art. 532',
            'Testemunhas que não se computam — CPP, art. 401, § 1º'],
      juris: [],
      erro: 'Reservar-se a arrolar testemunhas "oportunamente". Não existe oportunidade posterior — o rol vai aqui.' },
    { nome: 'Documentos, justificações e exceções',
      deve: 'Juntar documentos, requerer diligências e, quando for o caso, opor as exceções em petição apartada.',
      lei: ['Juntada de documentos e justificações — CPP, art. 396-A',
            'Exceções em apartado — CPP, arts. 95 a 111',
            'Diligências — CPP, art. 402'],
      juris: [],
      erro: 'Misturar a exceção de suspeição no corpo da resposta. Ela corre em apartado e tem rito próprio.' },
    { nome: 'Pedidos e defesa obrigatória',
      deve: 'Fechar com pedidos escalonados: rejeição da denúncia, absolvição sumária e, subsidiariamente, instrução com as provas requeridas. Se o acusado não apresenta resposta, o juiz nomeia defensor — a peça é obrigatória.',
      lei: ['Nomeação de defensor pela ausência de resposta — CPP, art. 396-A, § 2º',
            'Revogação de prisão preventiva — CPP, art. 316',
            'Medidas cautelares diversas — CPP, art. 319'],
      juris: [],
      erro: 'Apresentar resposta genérica de duas linhas pedindo "instrução do feito". Resposta sem tese é resposta perdida, e em prova é nota perdida.' }
  ],
  cego: ['Preliminares processuais alegadas','Inépcia e justa causa examinadas',
    'Ilicitude da prova e cadeia de custódia arguidas','Absolvição sumária pedida com o inciso do art. 397',
    'Testemunhas arroladas nesta peça','Provas especificadas','Documentos juntados',
    'Exceções em apartado, se cabíveis','Pedidos escalonados']
},

// ═══════════════════════ MINISTÉRIO PÚBLICO ═══════════════════════
'ACP ambiental': {
  rito: 'Ambiental — ação civil pública',
  carreiras: ['Ministério Público','Advocacia pública'],
  sobre: 'Inicial de tutela coletiva. O que a banca conta: legitimidade e objeto, a responsabilidade civil ambiental como objetiva, solidária e propter rem, o pedido cumulado de reparação e o alcance da coisa julgada — que deixou de ser limitado ao território do juízo.',
  blocos: [
    { nome: 'Legitimidade, competência e objeto',
      deve: 'Indicar o legitimado e o bem tutelado, e justificar a competência pelo local do dano — funcional e absoluta.',
      lei: ['Objeto da ACP — Lei 7.347/85, art. 1º',
            'Legitimados — Lei 7.347/85, art. 5º',
            'Competência do local do dano — Lei 7.347/85, art. 2º',
            'Competência coletiva de âmbito nacional ou regional — CDC, art. 93, II'],
      juris: ['Inconstitucionalidade da limitação territorial da coisa julgada — STF, RE 1.101.937, Tema 1075, j. 08/04/2021'],
      erro: 'Ajuizar no domicílio do réu. A competência do art. 2º é funcional e absoluta: é o foro do local onde ocorreu ou deve ocorrer o dano.' },
    { nome: 'Causa de pedir — a responsabilidade ambiental',
      deve: 'Narrar o dano e sustentar o regime próprio: responsabilidade objetiva, fundada no risco da atividade, solidária entre os poluidores e aderente à coisa.',
      lei: ['Dever de reparar independentemente de culpa — Lei 6.938/81, art. 14, § 1º',
            'Poluidor e degradação — Lei 6.938/81, art. 3º',
            'Sanções penais e administrativas independem da reparação — CF, art. 225, § 3º',
            'Função socioambiental da propriedade — CF, art. 186, II'],
      juris: ['Obrigações ambientais são propter rem — Súmula 623 do STJ',
              'Inversão do ônus da prova na degradação ambiental — Súmula 618 do STJ',
              'Não se aplica a teoria do fato consumado — Súmula 613 do STJ',
              'Imprescritibilidade da reparação civil por dano ambiental — STF, RE 654.833, Tema 999, j. 20/04/2020'],
      erro: 'Discutir culpa do degradador. A responsabilidade é objetiva — provar culpa é ônus que você não tem e que enfraquece a inicial.' },
    { nome: 'Pedidos — cumulação é a regra',
      deve: 'Cumular obrigação de fazer, de não fazer e indenização. A recomposição in natura é preferencial, mas não exclui a indenização pelo dano intercorrente e pelo dano moral coletivo.',
      lei: ['Obrigação de fazer e não fazer — Lei 7.347/85, art. 3º',
            'Tutela específica e multa — Lei 7.347/85, art. 11',
            'Fundo de reconstituição dos bens lesados — Lei 7.347/85, art. 13',
            'Tutela específica das obrigações — CPC, art. 497'],
      juris: ['Cumulação de obrigação de fazer e indenização é possível na reparação ambiental'],
      erro: 'Pedir só a indenização. Dinheiro não recompõe o bem ambiental — o pedido principal é a recuperação, e a indenização é complemento.' },
    { nome: 'Tutela de urgência e provas',
      deve: 'Requerer liminar para fazer cessar o dano, apontando o risco concreto de agravamento. Instruir com o inquérito civil e com a prova técnica disponível.',
      lei: ['Liminar na ACP — Lei 7.347/85, art. 12',
            'Inquérito civil — Lei 7.347/85, art. 8º, § 1º',
            'Tutela de urgência — CPC, art. 300',
            'Princípio da precaução — Lei 6.938/81, art. 4º, I'],
      juris: [],
      erro: 'Requerer liminar sem descrever o que se agrava enquanto o processo tramita. Em matéria ambiental, o perigo é a espinha do pedido liminar.' },
    { nome: 'Fecho — coisa julgada, TAC e custas',
      deve: 'Registrar o regime da coisa julgada erga omnes, ressalvar a possibilidade de compromisso de ajustamento e observar que o autor não adianta custas nem honorários, salvo má-fé.',
      lei: ['Coisa julgada erga omnes — Lei 7.347/85, art. 16',
            'Compromisso de ajustamento de conduta — Lei 7.347/85, art. 5º, § 6º',
            'Isenção de custas e honorários — Lei 7.347/85, art. 18'],
      juris: [],
      erro: 'Reproduzir a limitação territorial do art. 16 como se ainda valesse. O STF declarou inconstitucional a redação dada pela Lei 9.494/97 no Tema 1075.' }
  ],
  cego: ['Legitimidade do autor demonstrada','Competência do local do dano justificada',
    'Responsabilidade objetiva e solidária sustentada','Natureza propter rem invocada, se cabível',
    'Imprescritibilidade da reparação registrada','Pedido de recomposição in natura formulado',
    'Indenização e dano moral coletivo cumulados','Liminar com risco concreto de agravamento',
    'Inquérito civil e prova técnica juntados','Coisa julgada erga omnes sem limitação territorial']
},

'Petição inicial de improbidade': {
  rito: 'Administrativo — improbidade',
  carreiras: ['Ministério Público'],
  sobre: 'Depois da Lei 14.230/2021 a peça mudou de eixo: legitimidade agora é exclusiva do Ministério Público, não existe modalidade culposa, o rol do art. 11 é taxativo, e o dolo exigido é específico — a vontade livre e consciente de alcançar o resultado ilícito, não basta a voluntariedade da conduta.',
  blocos: [
    { nome: 'Legitimidade e sujeitos',
      deve: 'A ação é proposta pelo Ministério Público. Identificar o agente público e, havendo particular, demonstrar que ele concorreu dolosamente ou se beneficiou — o terceiro não responde sozinho.',
      lei: ['Legitimidade do Ministério Público — Lei 8.429/92, art. 17, caput',
            'Sujeito ativo — Lei 8.429/92, arts. 1º e 2º',
            'Terceiro que concorre ou se beneficia — Lei 8.429/92, art. 3º'],
      juris: ['Independência das instâncias — Lei 8.429/92, art. 21, §§'],
      erro: 'Incluir o particular no polo passivo sem apontar a conduta dolosa dele. Sem agente público não há ação de improbidade contra terceiro.' },
    { nome: 'Tipificação e dolo específico',
      deve: 'Enquadrar a conduta em um dos três blocos e demonstrar o dolo específico. No art. 11, o rol é taxativo: conduta fora dos incisos não é improbidade, por mais reprovável que seja.',
      lei: ['Enriquecimento ilícito — Lei 8.429/92, art. 9º',
            'Prejuízo ao erário — Lei 8.429/92, art. 10',
            'Violação de princípios, rol taxativo — Lei 8.429/92, art. 11',
            'Exigência de dolo — Lei 8.429/92, art. 1º, §§ 1º a 3º',
            'Perda patrimonial efetiva no art. 10 — Lei 8.429/92, art. 10, caput'],
      juris: ['Responsabilidade subjetiva com dolo nos arts. 9º, 10 e 11 — STF, ARE 843.989, Tema 1199, j. 18/08/2022',
              'Revogação da modalidade culposa é irretroativa — STF, Tema 1199, tese 2',
              'Nova lei alcança atos culposos sem condenação transitada em julgado — STF, Tema 1199, tese 3'],
      erro: 'Narrar a conduta e concluir pelo dolo "presumido da própria ilegalidade". Depois do Tema 1199, ilegalidade não é improbidade — o dolo específico tem de ser descrito com fatos.' },
    { nome: 'Causa de pedir e prova',
      deve: 'Descrever a conduta, o resultado e o nexo, com individualização por réu. A inicial vem instruída com documentos ou justificação da impossibilidade de apresentá-los.',
      lei: ['Requisitos da inicial de improbidade — Lei 8.429/92, art. 17, § 6º',
            'Inquérito civil — Lei 7.347/85, art. 8º, § 1º',
            'Rejeição da inicial — Lei 8.429/92, art. 17, § 6º-B'],
      juris: [],
      erro: 'Petição inicial genérica contra todos os integrantes de uma comissão. A individualização da conduta é requisito expresso, e a inicial genérica é rejeitada.' },
    { nome: 'Indisponibilidade de bens e tutela',
      deve: 'A indisponibilidade não é automática: exige demonstração de perigo de dilapidação e recai sobre o valor do dano ou do acréscimo patrimonial, preservando o mínimo existencial e os bens impenhoráveis.',
      lei: ['Indisponibilidade de bens — Lei 8.429/92, art. 16 e §§',
            'Limite ao valor do ressarcimento — Lei 8.429/92, art. 16, § 5º',
            'Tutela de urgência — CPC, art. 300'],
      juris: [],
      erro: 'Pedir indisponibilidade genérica invocando periculum in mora presumido. A lei reformada exige demonstração concreta do risco.' },
    { nome: 'Sanções pedidas e dosimetria',
      deve: 'Pedir as sanções do art. 12 de forma fundamentada, observando que elas não são cumulativas por obrigação e que a aplicação segue proporcionalidade e individualização.',
      lei: ['Sanções por espécie de ato — Lei 8.429/92, art. 12, I a III',
            'Critérios de dosimetria — Lei 8.429/92, art. 17-C, IV',
            'Ressarcimento integral do dano — Lei 8.429/92, art. 12, caput'],
      juris: ['Imprescritibilidade do ressarcimento por ato doloso de improbidade — STF, RE 852.475, Tema 897, j. 08/08/2018'],
      erro: 'Pedir todas as sanções em bloco, sem dizer por que cada uma cabe. A dosimetria é exigida por lei e o pedido genérico enfraquece a condenação.' },
    { nome: 'Prescrição e fecho',
      deve: 'Verificar o prazo de oito anos e a prescrição intercorrente, e fechar com o pedido de citação, provas e valor da causa.',
      lei: ['Prazo prescricional de oito anos — Lei 8.429/92, art. 23',
            'Prescrição intercorrente — Lei 8.429/92, art. 23, §§ 4º e 5º',
            'Interrupção da prescrição — Lei 8.429/92, art. 23, § 4º'],
      juris: ['Novo regime prescricional é irretroativo — STF, Tema 1199, tese 4'],
      erro: 'Aplicar o prazo novo a fato anterior à Lei 14.230/2021. Os novos marcos temporais só correm a partir da publicação da lei.' }
  ],
  cego: ['Legitimidade exclusiva do MP registrada','Agente público identificado e terceiro justificado',
    'Conduta enquadrada em ato do art. 9º, 10 ou 11','Rol taxativo do art. 11 respeitado',
    'Dolo específico descrito com fatos','Conduta individualizada por réu',
    'Indisponibilidade com perigo concreto demonstrado','Sanções pedidas com dosimetria',
    'Prescrição de oito anos verificada','Irretroatividade do novo regime observada']
},

// ═══════════════════════ PROCURADORIAS ═══════════════════════
'Contestação da Fazenda Pública': {
  rito: 'Previdenciário — concessão de benefício',
  carreiras: ['Procuradorias','Advocacia pública'],
  sobre: 'Contestação com prerrogativas próprias e preliminares típicas. O que separa a peça boa da genérica é usar as defesas que só a Fazenda tem — prazo em dobro, prescrição quinquenal do trato sucessivo, remessa necessária — sem esquecer o ônus da impugnação especificada, que vale para ela como para qualquer réu.',
  blocos: [
    { nome: 'Prerrogativas processuais',
      deve: 'Registrar, de saída, o prazo em dobro, a dispensa de preparo e o regime de custas. São prerrogativas do ente, não do procurador.',
      lei: ['Prazo em dobro para a Fazenda — CPC, art. 183',
            'Dispensa de preparo recursal — CPC, art. 1.007, § 1º',
            'Despesas processuais ao final — CPC, art. 91',
            'Intimação pessoal — CPC, art. 183, § 1º'],
      juris: [],
      erro: 'Invocar prazo em dobro para manifestação em que a lei já fixa prazo próprio para a Fazenda. O § 2º do art. 183 exclui a contagem em dobro nesses casos.' },
    { nome: 'Preliminares típicas da Fazenda',
      deve: 'Percorrer as que se repetem: falta de interesse de agir por ausência de prévio requerimento administrativo, incompetência, ilegitimidade do ente, litisconsórcio necessário e inadequação da via.',
      lei: ['Preliminares de contestação — CPC, art. 337',
            'Competência delegada — CF, art. 109, § 3º',
            'Juizado Especial Federal — Lei 10.259/2001, art. 3º'],
      juris: ['Prévio requerimento administrativo como condição do interesse de agir — STF, RE 631.240, Tema 350, j. 03/09/2014'],
      erro: 'Alegar carência por ausência de requerimento quando houve resistência administrativa notória ou contestação de mérito. O próprio Tema 350 ressalva essas hipóteses.' },
    { nome: 'Prescrição e decadência',
      deve: 'Separar as duas: a decadência atinge o direito de revisão do ato; a prescrição, nas relações de trato sucessivo, atinge apenas as parcelas anteriores ao quinquênio.',
      lei: ['Prescrição quinquenal contra a Fazenda — Decreto 20.910/32, art. 1º',
            'Decadência do direito de revisão do benefício — Lei 8.213/91, art. 103',
            'Prescrição das parcelas — Lei 8.213/91, art. 103, parágrafo único'],
      juris: ['Trato sucessivo: prescrição atinge só as prestações do quinquênio anterior — Súmula 85 do STJ'],
      erro: 'Pedir a extinção total por prescrição em relação de trato sucessivo. Quando o direito em si não foi negado, prescrevem as parcelas, não a pretensão.' },
    { nome: 'Mérito e ônus da impugnação especificada',
      deve: 'Impugnar fato por fato. O ônus da impugnação especificada alcança a Fazenda: fato não impugnado é fato incontroverso, e a presunção de legitimidade do ato administrativo não supre a defesa.',
      lei: ['Ônus da impugnação especificada — CPC, art. 341',
            'Ônus da prova — CPC, art. 373',
            'Distribuição dinâmica do ônus — CPC, art. 373, § 1º'],
      juris: [],
      erro: 'Contestar por negativa geral confiando na presunção de legitimidade. A dispensa do art. 341, parágrafo único, não alcança a Fazenda representada por procurador.' },
    { nome: 'Provas e pedidos',
      deve: 'Requerer as provas pertinentes — perícia, prova documental complementar, cálculos — e formular pedido subsidiário quando houver risco de procedência parcial.',
      lei: ['Especificação de provas — CPC, art. 336',
            'Prova pericial — CPC, art. 464',
            'Reconvenção — CPC, art. 343'],
      juris: [],
      erro: 'Deixar de requerer perícia em ação que depende de aferição técnica. Sem prova requerida a tempo, a procedência vem por ausência de contraprova.' },
    { nome: 'Fecho — honorários, remessa e cumprimento',
      deve: 'Fechar com honorários por faixas, o regime da remessa necessária e a forma de cumprimento contra a Fazenda.',
      lei: ['Honorários contra a Fazenda por faixas — CPC, art. 85, §§ 3º a 5º',
            'Remessa necessária e exceções — CPC, art. 496 e §§ 3º e 4º',
            'Cumprimento contra a Fazenda — CPC, art. 534',
            'Precatório e requisição de pequeno valor — CF, art. 100, § 3º'],
      juris: [],
      erro: 'Ignorar as exceções do art. 496, § 3º e insistir na remessa necessária em condenação de baixo valor. É perda de credibilidade barata.' }
  ],
  cego: ['Prazo em dobro e prerrogativas registrados','Interesse de agir e prévio requerimento examinados',
    'Preliminares do art. 337 percorridas','Decadência do direito de revisão examinada',
    'Prescrição quinquenal das parcelas alegada','Impugnação especificada, fato por fato',
    'Provas requeridas, inclusive perícia','Honorários por faixas',
    'Remessa necessária e suas exceções','Forma de cumprimento indicada']
}
,

// ─────────────────────────────────────────────────────────────────────────────
'Petição inicial': {
  rito: 'Civil — conhecimento',
  sobre: 'É a peça que fixa os limites do que o juiz pode decidir. Erro aqui não se conserta depois: pedido mal formulado vira sentença sem o que a parte queria, e causa de pedir esquecida não volta na apelação.',
  blocos: [
    { nome: 'Endereçamento, partes e competência',
      deve: 'Endereçar ao juízo competente e qualificar autor e réu com o que a lei pede — nome, estado civil, existência de união estável, profissão, CPF/CNPJ, endereço eletrônico e domicílio.',
      lei: ['Requisitos da inicial — CPC, art. 319, I e II', 'Dispensa de dados não obtidos — CPC, art. 319, §§ 1º a 3º', 'Foro de domicílio do réu — CPC, art. 46'],
      juris: [],
      erro: 'Pedir a extinção porque falta um dado de qualificação. Os §§ do art. 319 mandam prosseguir quando obtê-lo for impossível ou tornar o acesso à justiça muito oneroso.' },
    { nome: 'Fato e fundamentos jurídicos',
      deve: 'Narrar os fatos e deles extrair a consequência jurídica. É a causa de pedir — próxima (fundamento jurídico) e remota (os fatos) — e ela delimita a coisa julgada.',
      lei: ['Fato e fundamentos jurídicos do pedido — CPC, art. 319, III', 'Estabilização da demanda — CPC, art. 329', 'Limites da coisa julgada — CPC, art. 503'],
      juris: [],
      erro: 'Narrar o fato e esquecer de qualificá-lo juridicamente, ou o contrário: citar teses sem contar o que aconteceu. O juiz decide sobre fatos, não sobre teses soltas.' },
    { nome: 'Pedido certo e determinado',
      deve: 'Formular o pedido com todas as suas especificações. Pedido genérico só nas três hipóteses legais; havendo cumulação, verificar compatibilidade, competência e rito comum.',
      lei: ['Pedido certo — CPC, art. 322', 'Pedido genérico — CPC, art. 324, § 1º', 'Prestações sucessivas incluídas — CPC, art. 323', 'Cumulação de pedidos — CPC, art. 327'],
      juris: [],
      erro: 'Pedir "o que for de direito". Fora do art. 324, § 1º, o pedido genérico leva a emenda e, mantido, a indeferimento.' },
    { nome: 'O que já vem incluído — e o que não vem',
      deve: 'Lembrar que juros legais, correção monetária e verbas de sucumbência são pedidos implícitos; tudo o mais precisa ser pedido. E o pedido interpreta-se a partir do conjunto da postulação, com boa-fé.',
      lei: ['Pedidos implícitos — CPC, art. 322, § 1º', 'Interpretação do pedido — CPC, art. 322, § 2º', 'Congruência — CPC, arts. 141 e 492'],
      juris: [],
      erro: 'Não pedir a tutela específica da obrigação de fazer e depois querer executá-la. Implícitos são só os do § 1º.' },
    { nome: 'Valor da causa, provas e audiência',
      deve: 'Atribuir valor à causa segundo o proveito econômico pretendido, indicar as provas que pretende produzir e dizer se opta ou não pela audiência de conciliação ou mediação.',
      lei: ['Valor da causa — CPC, arts. 291 e 292', 'Provas — CPC, art. 319, VI', 'Opção pela audiência — CPC, art. 319, VII', 'Audiência do art. 334 — CPC, art. 334, § 5º'],
      juris: [],
      erro: 'Omitir a opção pela audiência: sem manifestação das duas partes, ela é designada e o prazo de contestação corre da audiência.' },
    { nome: 'Documentos, gratuidade e tutela',
      deve: 'Instruir com os documentos indispensáveis à propositura, requerer gratuidade quando for o caso e, havendo urgência, deduzir a tutela provisória com os requisitos próprios.',
      lei: ['Documentos indispensáveis — CPC, art. 320', 'Emenda em 15 dias — CPC, art. 321', 'Gratuidade — CPC, art. 98', 'Tutela de urgência — CPC, art. 300'],
      juris: [],
      erro: 'Deixar de juntar o documento indispensável e ser indeferido sem emenda. O art. 321 exige que o juiz aponte com precisão o que corrigir e conceda prazo.' }
  ],
  cego: [
    'Juízo competente endereçado',
    'Partes qualificadas (art. 319, I e II)',
    'Fatos narrados e qualificados juridicamente',
    'Pedido certo e determinado, com especificações',
    'Cumulação verificada quanto a compatibilidade e rito',
    'Prestações sucessivas consideradas',
    'Valor da causa atribuído conforme o proveito econômico',
    'Provas indicadas',
    'Opção pela audiência de conciliação declarada',
    'Documentos indispensáveis juntados',
    'Tutela provisória deduzida com os requisitos, se havia urgência'
  ]
},

// ─────────────────────────────────────────────────────────────────────────────
'Contestação': {
  rito: 'Civil — conhecimento',
  sobre: 'Uma peça, uma chance: vale a eventualidade — tudo o que se tem a alegar vai aqui, ainda que contraditório entre si. E o que não for impugnado especificadamente presume-se verdadeiro.',
  blocos: [
    { nome: 'Tempestividade e prazo',
      deve: 'Conferir o termo inicial conforme a hipótese: audiência de conciliação frustrada, protocolo do pedido de cancelamento, ou juntada do mandado — e o prazo em dobro quando couber.',
      lei: ['Prazo e termo inicial — CPC, art. 335', 'Litisconsortes com procuradores distintos — CPC, art. 229', 'Fazenda Pública e Defensoria — CPC, arts. 183 e 186'],
      juris: [],
      erro: 'Contar da citação quando houve audiência designada. O prazo corre da audiência, não do mandado.' },
    { nome: 'Preliminares do art. 337',
      deve: 'Alegar, antes do mérito, tudo o que impede ou retarda o julgamento: incompetência, inépcia, litispendência, coisa julgada, conexão, incapacidade, convenção de arbitragem, ilegitimidade, falta de interesse, indevida concessão de gratuidade.',
      lei: ['Rol das preliminares — CPC, art. 337', 'Matérias cognoscíveis de ofício — CPC, art. 337, § 5º', 'Incompetência relativa e absoluta — CPC, art. 64'],
      juris: [],
      erro: 'Deixar a convenção de arbitragem e a incompetência relativa para depois. Nenhuma das duas o juiz conhece de ofício: não alegadas aqui, precluem.' },
    { nome: 'Impugnação especificada dos fatos',
      deve: 'Enfrentar fato por fato. O que não for impugnado presume-se verdadeiro, salvo se houver direito indisponível, documento essencial faltando ou contradição com a própria defesa.',
      lei: ['Ônus da impugnação especificada — CPC, art. 341', 'Exceções à presunção — CPC, art. 341, I a III', 'Defensor público, advogado dativo e curador especial — CPC, art. 341, parágrafo único'],
      juris: [],
      erro: 'Negação geral dos fatos. Vale o mesmo que não contestar: os fatos ficam incontroversos e a instrução perde objeto.' },
    { nome: 'Mérito por eventualidade',
      deve: 'Deduzir toda a defesa de mérito de uma vez — direta (nega o fato ou seus efeitos) e indireta (fato impeditivo, modificativo ou extintivo), ainda que as teses sejam entre si incompatíveis.',
      lei: ['Concentração da defesa — CPC, art. 336', 'Fatos impeditivos, modificativos e extintivos — CPC, art. 373, II', 'Prescrição e decadência — CC, arts. 189 e 210'],
      juris: [],
      erro: 'Guardar uma tese "para a apelação". Fora das exceções do art. 342, alegação nova depois da contestação não é conhecida.' },
    { nome: 'Provas, reconvenção e pedidos finais',
      deve: 'Especificar as provas a produzir, apresentar reconvenção na própria peça quando cabível, e pedir a improcedência com honorários.',
      lei: ['Reconvenção na contestação — CPC, art. 343', 'Especificação de provas — CPC, art. 336', 'Honorários — CPC, art. 85'],
      juris: [],
      erro: 'Protocolar a reconvenção em peça apartada. Desde 2015 ela vai na contestação.' }
  ],
  cego: [
    'Tempestividade verificada no termo inicial correto',
    'Preliminares do art. 337 alegadas',
    'Incompetência relativa e arbitragem alegadas (não são de ofício)',
    'Cada fato da inicial impugnado especificadamente',
    'Defesa direta apresentada',
    'Defesa indireta (impeditivo/modificativo/extintivo) apresentada',
    'Prescrição e decadência examinadas',
    'Eventualidade observada: tudo alegado de uma vez',
    'Provas especificadas',
    'Reconvenção deduzida na própria peça, se cabível',
    'Pedido de improcedência com honorários'
  ]
},

// ─────────────────────────────────────────────────────────────────────────────
'Reconvenção': {
  rito: 'Civil — conhecimento',
  sobre: 'Ação do réu contra o autor, no mesmo processo. O que a banca cobra é o vínculo: precisa ser conexa com a ação principal ou com o fundamento da defesa — e ela vive por conta própria.',
  blocos: [
    { nome: 'Cabimento e conexão',
      deve: 'Demonstrar a conexão com a ação principal ou com o fundamento da defesa. Sem esse vínculo não há reconvenção — há ação autônoma.',
      lei: ['Reconvenção — CPC, art. 343, caput', 'Conexão — CPC, art. 55'],
      juris: [],
      erro: 'Reconvir para cobrar dívida sem relação nenhuma com a causa. A peça é rejeitada e o réu perde o prazo da ação própria.' },
    { nome: 'Autonomia',
      deve: 'Registrar que a reconvenção prossegue ainda que a ação principal seja extinta, e que pode ser oferecida mesmo sem contestação.',
      lei: ['Independência da reconvenção — CPC, art. 343, § 2º', 'Desnecessidade de contestar — CPC, art. 343, § 6º'],
      juris: [],
      erro: 'Achar que a desistência do autor leva a reconvenção junto. Não leva: ela segue.' },
    { nome: 'Ampliação subjetiva',
      deve: 'Quando for o caso, reconvir contra o autor e terceiro, ou reconvir o réu em litisconsórcio com terceiro — a lei autoriza expressamente as duas hipóteses.',
      lei: ['Reconvenção contra terceiro — CPC, art. 343, § 3º', 'Reconvinte com terceiro — CPC, art. 343, § 4º', 'Autor substituto processual — CPC, art. 343, § 5º'],
      juris: [],
      erro: 'Reconvir contra quem só figura como substituto processual sem observar o § 5º: nessa hipótese a reconvenção é contra o substituído.' },
    { nome: 'Requisitos de petição inicial e valor',
      deve: 'Cumprir os requisitos do art. 319, atribuir valor próprio à causa e recolher as custas correspondentes; o autor-reconvindo é intimado, na pessoa do advogado, para responder em 15 dias.',
      lei: ['Requisitos da inicial — CPC, art. 319', 'Intimação para responder — CPC, art. 343, § 1º', 'Valor da causa — CPC, art. 292'],
      juris: [],
      erro: 'Não atribuir valor à reconvenção. Sem valor não há base para custas nem para honorários próprios.' }
  ],
  cego: [
    'Conexão com a ação ou com o fundamento da defesa demonstrada',
    'Apresentada na própria contestação',
    'Autonomia registrada (sobrevive à extinção da principal)',
    'Requisitos do art. 319 cumpridos',
    'Valor da causa próprio atribuído',
    'Intimação do reconvindo em 15 dias',
    'Ampliação subjetiva tratada, quando havia',
    'Pedido próprio formulado com clareza'
  ]
},

// ─────────────────────────────────────────────────────────────────────────────
'Apelação': {
  rito: 'Civil — recursos',
  sobre: 'O recurso que devolve tudo. O erro que mais derruba apelação não é de mérito: é não atacar especificamente os fundamentos da sentença — recurso que repete a inicial não é conhecido.',
  blocos: [
    { nome: 'Cabimento, prazo e preparo',
      deve: 'Verificar que se trata de sentença, o prazo de 15 dias úteis e o recolhimento do preparo, sob pena de deserção — com atenção à intimação para complementar quando o recolhimento for insuficiente.',
      lei: ['Cabimento — CPC, art. 1.009', 'Prazo — CPC, art. 1.003, § 5º', 'Preparo e deserção — CPC, art. 1.007', 'Complementação e relevação — CPC, art. 1.007, §§ 2º e 4º'],
      juris: [],
      erro: 'Não recolher o preparo confiando em intimação posterior. Ela só existe nas hipóteses dos §§ do art. 1.007.' },
    { nome: 'Impugnação específica dos fundamentos',
      deve: 'Expor os fundamentos de fato e de direito e as razões do pedido de reforma ou decretação de nulidade, enfrentando cada fundamento autônomo da sentença.',
      lei: ['Requisitos das razões — CPC, art. 1.010, II e III', 'Fundamentação das decisões — CPC, art. 489, § 1º', 'Dialeticidade — CPC, art. 932, III'],
      juris: ['Súmula 283 do STF — fundamento não impugnado mantém a decisão'],
      erro: 'Copiar a inicial. Sem dialeticidade o relator nem conhece do recurso (art. 932, III).' },
    { nome: 'Interlocutórias não agraváveis',
      deve: 'Levar na apelação (ou nas contrarrazões) as decisões interlocutórias que não constam do rol do agravo — é a única oportunidade, e não há preclusão antes dela.',
      lei: ['Impugnação das interlocutórias na apelação — CPC, art. 1.009, § 1º', 'Contrarrazões — CPC, art. 1.009, § 2º'],
      juris: [],
      erro: 'Deixar de repetir a impugnação da interlocutória não agravável, achando que já ficou decidida. Ela precisa ser renovada aqui.' },
    { nome: 'Efeitos',
      deve: 'Indicar se há efeito suspensivo — regra geral — ou se o caso está entre as exceções do § 1º do art. 1.012; havendo eficácia imediata, requerer a suspensão ao tribunal quando presente risco de dano grave.',
      lei: ['Efeito suspensivo como regra — CPC, art. 1.012, caput', 'Exceções — CPC, art. 1.012, § 1º', 'Pedido de efeito suspensivo ao tribunal — CPC, art. 1.012, §§ 3º e 4º'],
      juris: [],
      erro: 'Afirmar que a apelação contra sentença que confirma tutela provisória suspende os efeitos. Não suspende: é exceção do § 1º.' },
    { nome: 'Profundidade e causa madura',
      deve: 'Lembrar que o tribunal aprecia todas as questões suscitadas e discutidas, ainda que não decididas por inteiro, e que, decretada a nulidade ou reformada a sentença terminativa, pode julgar desde logo o mérito se a causa estiver madura.',
      lei: ['Profundidade do efeito devolutivo — CPC, art. 1.013, §§ 1º e 2º', 'Teoria da causa madura — CPC, art. 1.013, § 3º', 'Questões de fato não propostas — CPC, art. 1.014'],
      juris: [],
      erro: 'Pedir apenas a anulação quando a causa está madura. Peça também o julgamento do mérito, subsidiariamente.' }
  ],
  cego: [
    'Tempestividade e preparo conferidos',
    'Cada fundamento autônomo da sentença atacado',
    'Pedido de reforma ou de nulidade explícito',
    'Interlocutórias não agraváveis impugnadas aqui',
    'Efeito da apelação identificado (regra ou exceção do § 1º)',
    'Efeito suspensivo requerido quando havia risco',
    'Prequestionamento das matérias federais/constitucionais',
    'Causa madura invocada subsidiariamente',
    'Pedido final claro'
  ]
},

// ─────────────────────────────────────────────────────────────────────────────
'Agravo de instrumento': {
  rito: 'Civil — recursos',
  sobre: 'O recurso das interlocutórias — e o único cujo cabimento a banca cobra pelo rol. Depois do Tema 988 do STJ, o rol é de taxatividade mitigada: fora dele, só com urgência demonstrada.',
  blocos: [
    { nome: 'Cabimento: o rol e a taxatividade mitigada',
      deve: 'Enquadrar a decisão numa das hipóteses do art. 1.015. Fora do rol, demonstrar a urgência decorrente da inutilidade do julgamento da questão apenas na apelação.',
      lei: ['Rol do agravo — CPC, art. 1.015', 'Agravo na liquidação, cumprimento, execução e inventário — CPC, art. 1.015, parágrafo único'],
      juris: ['Tema 988 do STJ — taxatividade mitigada do art. 1.015'],
      erro: 'Agravar de qualquer interlocutória. Fora do rol e sem urgência demonstrada, o recurso não é conhecido — e a matéria vai para a apelação.' },
    { nome: 'Peças obrigatórias e formação do instrumento',
      deve: 'Instruir com as peças obrigatórias — decisão agravada, certidão da intimação ou outro documento que prove a tempestividade, e procurações — além das facultativas úteis à compreensão.',
      lei: ['Peças obrigatórias — CPC, art. 1.017, I', 'Peças facultativas — CPC, art. 1.017, III', 'Sanabilidade dos vícios — CPC, art. 1.017, § 3º, c/c art. 932, parágrafo único'],
      juris: [],
      erro: 'Deixar de juntar a certidão de intimação sem explicar. O § 3º manda intimar para sanar; mas o relator não adivinha a data.' },
    { nome: 'Efeito suspensivo ou antecipação da tutela recursal',
      deve: 'Requerer, quando necessário, a suspensão da decisão ou a antecipação da tutela recursal, demonstrando probabilidade do direito e risco de dano.',
      lei: ['Poderes do relator — CPC, art. 1.019, I', 'Requisitos da tutela de urgência — CPC, art. 300'],
      juris: [],
      erro: 'Pedir "efeito suspensivo" sem demonstrar o risco. O relator decide por fundamentação concreta, não por pedido genérico.' },
    { nome: 'Comunicação ao juízo de origem',
      deve: 'Nos processos em autos físicos, informar ao juízo de primeiro grau a interposição, em 3 dias, juntando cópia e a relação de documentos — sob pena de inadmissibilidade, se arguida pelo agravado.',
      lei: ['Comunicação em 3 dias — CPC, art. 1.018, § 2º', 'Inadmissibilidade se arguida — CPC, art. 1.018, § 3º'],
      juris: [],
      erro: 'Ignorar o art. 1.018 nos autos físicos. Arguido pelo agravado e comprovado, o recurso não é admitido.' }
  ],
  cego: [
    'Hipótese do art. 1.015 identificada',
    'Fora do rol: urgência demonstrada (Tema 988/STJ)',
    'Peças obrigatórias juntadas',
    'Tempestividade comprovada',
    'Efeito suspensivo ou tutela recursal requerida com fundamento',
    'Comunicação ao juízo de origem em 3 dias (autos físicos)',
    'Razões atacam a decisão agravada, não a inicial',
    'Pedido de reforma delimitado'
  ]
},

// ─────────────────────────────────────────────────────────────────────────────
'Embargos de declaração': {
  rito: 'Civil — recursos',
  sobre: 'Existem para consertar defeito do julgado, não para reabrir a discussão. Usado como recurso de revisão, vira multa; usado direito, é o que abre a porta das instâncias superiores.',
  blocos: [
    { nome: 'Hipótese de cabimento',
      deve: 'Apontar com precisão a obscuridade, a contradição, a omissão ou o erro material — e mostrar onde, no acórdão ou na sentença, o vício está.',
      lei: ['Hipóteses — CPC, art. 1.022, I a III', 'Omissão qualificada — CPC, art. 1.022, parágrafo único', 'Fundamentação — CPC, art. 489, § 1º'],
      juris: [],
      erro: 'Chamar de "omissão" a rejeição de um argumento. Enfrentado e rejeitado não é omisso; omisso é o que a decisão sequer considerou, ou o que o art. 489, § 1º, exigia.' },
    { nome: 'Prazo e interrupção',
      deve: 'Opor em 5 dias, lembrando que interrompem o prazo para os demais recursos — inclusive quando inadmitidos, salvo se intempestivos.',
      lei: ['Prazo de 5 dias e interrupção — CPC, art. 1.023 e art. 1.026, caput'],
      juris: [],
      erro: 'Tratar como suspensão. É interrupção: o prazo do outro recurso recomeça do zero.' },
    { nome: 'Efeitos infringentes e contraditório',
      deve: 'Quando o acolhimento puder alterar o resultado, requerer expressamente o efeito infringente — e lembrar que o embargado será ouvido em 5 dias.',
      lei: ['Contraditório prévio ao efeito infringente — CPC, art. 1.023, § 2º'],
      juris: [],
      erro: 'Modificar o julgado sem ouvir a outra parte. É nulidade, e o § 2º é expresso.' },
    { nome: 'Prequestionamento',
      deve: 'Usar os embargos para obter o pronunciamento sobre a matéria constitucional ou federal — os elementos suscitados consideram-se incluídos no acórdão ainda que inadmitidos ou rejeitados.',
      lei: ['Prequestionamento ficto — CPC, art. 1.025'],
      juris: ['Súmula 211 do STJ — matéria não apreciada não é prequestionada', 'Súmula 356 do STF'],
      erro: 'Ir ao especial sem opor embargos quando o acórdão silenciou. O art. 1.025 pressupõe que a matéria foi suscitada nos embargos.' },
    { nome: 'Não protelar',
      deve: 'Evitar a reiteração do já decidido: embargos protelatórios rendem multa de até 2% e, na reiteração, até 10%, com depósito prévio para novos recursos.',
      lei: ['Multa por protelação — CPC, art. 1.026, §§ 2º e 3º', 'Dispensa de depósito para Fazenda e beneficiário da gratuidade — CPC, art. 1.026, § 3º'],
      juris: [],
      erro: 'Repetir os embargos com o mesmo argumento. A segunda vez custa até 10% do valor da causa.' }
  ],
  cego: [
    'Vício identificado e localizado no julgado',
    'Enquadramento em obscuridade, contradição, omissão ou erro material',
    'Omissão do art. 489, § 1º, invocada quando era o caso',
    'Prazo de 5 dias observado',
    'Efeito infringente requerido expressamente, se pretendido',
    'Contraditório do § 2º considerado',
    'Prequestionamento explicitado (art. 1.025)',
    'Sem reiteração do já enfrentado'
  ]
},

// ─────────────────────────────────────────────────────────────────────────────
'Ata de audiência': {
  rito: 'Civil — conhecimento',
  sobre: 'A ata é a memória do que aconteceu — e o que não está nela, para efeito de recurso, não aconteceu. Protesto não consignado é preclusão consumada.',
  blocos: [
    { nome: 'Abertura e presenças',
      deve: 'Registrar dia, hora e local, o juízo, as partes, os advogados com OAB, o Ministério Público quando intervir, e as ausências com a consequência aplicada.',
      lei: ['Registro do ocorrido — CPC, art. 367', 'Consequência da ausência à conciliação — CPC, art. 334, § 8º', 'Intervenção do MP — CPC, art. 178'],
      juris: [],
      erro: 'Não registrar a ausência injustificada à audiência de conciliação — é ato atentatório à dignidade da justiça, com multa de até 2%.' },
    { nome: 'Tentativa de conciliação',
      deve: 'Consignar a tentativa de autocomposição e o seu resultado; havendo acordo, reduzi-lo a termo e homologar por sentença.',
      lei: ['Conciliação na audiência de instrução — CPC, art. 359', 'Homologação do acordo — CPC, art. 487, III, b', 'Audiência de conciliação — CPC, art. 334'],
      juris: [],
      erro: 'Encerrar a audiência sem uma linha sobre conciliação. O art. 359 impõe a tentativa mesmo depois de frustrada a do art. 334.' },
    { nome: 'Prova oral produzida',
      deve: 'Registrar depoimento pessoal, oitiva de testemunhas com qualificação e compromisso (ou o motivo da dispensa), contraditas e as respostas ao juízo e às partes.',
      lei: ['Ordem dos atos — CPC, art. 361', 'Depoimento pessoal — CPC, art. 385', 'Compromisso e contradita — CPC, arts. 457 e 457, § 1º', 'Registro por gravação — CPC, art. 367, §§ 5º e 6º'],
      juris: [],
      erro: 'Deixar de consignar a contradita e a decisão sobre ela. Sem isso não há como impugnar o depoimento depois.' },
    { nome: 'Requerimentos, decisões e protestos',
      deve: 'Registrar os requerimentos das partes, as decisões proferidas em audiência — que são interlocutórias e devem vir fundamentadas — e os protestos consignados contra o indeferimento.',
      lei: ['Decisões em audiência — CPC, art. 367 c/c art. 203, § 2º', 'Fundamentação — CPC, art. 489, § 1º', 'Interlocutórias não agraváveis vão na apelação — CPC, art. 1.009, § 1º'],
      juris: [],
      erro: 'Indeferir prova sem fundamentar e sem consignar o protesto da parte. Some a base do recurso e sobra nulidade.' },
    { nome: 'Encerramento',
      deve: 'Consignar alegações finais orais ou a conversão em memoriais com prazos, os atos ordenados, a designação de nova data se houver, e colher as assinaturas.',
      lei: ['Alegações finais e memoriais — CPC, art. 364 e § 2º', 'Assinatura da ata — CPC, art. 367, § 2º', 'Continuação da audiência — CPC, art. 362'],
      juris: [],
      erro: 'Converter em memoriais sem fixar prazo e ordem. Depois ninguém sabe de quem era a vez.' }
  ],
  cego: [
    'Data, hora, juízo e presenças registradas',
    'Ausências e suas consequências consignadas',
    'Tentativa de conciliação e resultado',
    'Acordo reduzido a termo e homologado, se houve',
    'Depoimento pessoal registrado',
    'Testemunhas qualificadas, compromissadas ou dispensadas',
    'Contraditas e decisões sobre elas',
    'Requerimentos das partes',
    'Decisões proferidas em audiência, fundamentadas',
    'Protestos consignados',
    'Alegações finais ou memoriais com prazo',
    'Assinaturas colhidas'
  ]
}

};
