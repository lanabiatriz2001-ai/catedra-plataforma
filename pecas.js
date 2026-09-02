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
  freq: 223,   // vezes em que o tema aparece nas 648 provas de discursivas.js
  carreiras: ['Magistratura'],
  sobre: 'A peça que decide a prova. Três elementos essenciais no art. 489 e um punhado de itens que o espelho conta um a um: preliminar enfrentada, prescrição decidida com contraditório, congruência com o pedido, juros e correção com índice e termo inicial, sucumbência pela regra certa e a sorte da tutela concedida no começo. Cada bloco abaixo abre a fórmula de redação correspondente.',
  blocos: [
    { nome: 'Cabeçalho e relatório',
      deve: 'Relatório é histórico, não é convencimento. Situa o examinador: quem pediu o quê, o que o réu respondeu e o que aconteceu no processo. Sintético, mas sem omitir pedido nenhum.',
      itens: [
        { t:'Partes e objeto', d:'nome das partes, natureza da ação e o que se pede — em duas ou três linhas.' },
        { t:'Suma do pedido', d:'a causa de pedir e os pedidos, um a um. Pedido não relatado tende a virar pedido não julgado.' },
        { t:'Suma da defesa', d:'preliminares suscitadas e teses de mérito. É a metade que mais se esquece.' },
        { t:'Ocorrências relevantes', d:'tutela deferida ou indeferida, revelia, saneamento, provas produzidas, alegações finais.' }
      ],
      lei: ['Elementos essenciais da sentença — CPC, art. 489, I',
            'Relatório dispensado no Juizado — Lei 9.099/95, art. 38'],
      juris: [],
      modelo: 'Vistos etc.\n\nFULANO DE TAL ajuizou a presente AÇÃO DE ... em face de BELTRANO DE TAL, ambos qualificados nos autos, alegando, em síntese, que ... . Requereu, ao final, ... . Atribuiu à causa o valor de R$ ... e juntou documentos.\n\nA tutela de urgência foi ... (deferida/indeferida) à fl. ... .\n\nRegularmente citado, o réu apresentou contestação (fls. ...), na qual suscitou preliminar de ... e, no mérito, sustentou que ... .\n\nHouve réplica (fls. ...). O feito foi saneado à fl. ..., oportunidade em que se fixaram como pontos controvertidos ... . Em audiência de instrução, foram colhidos ... . As partes apresentaram alegações finais.\n\nÉ o relatório. DECIDO.',
      erro: 'Escrever meia página de fatos e esquecer a suma da contestação. O espelho cobra os dois lados, e o relatório é a parte mais barata de pontuar.' },
    { nome: 'Questões prévias e preliminares',
      deve: 'Antes do mérito, o que impede julgá-lo. Rejeitar também é enfrentar, e tem de vir fundamentado — uma linha de motivo por preliminar já basta.',
      itens: [
        { t:'De ofício', d:'pressupostos processuais, condições da ação, litispendência, coisa julgada, perempção — o juiz conhece a qualquer tempo.' },
        { t:'Só se alegadas', d:'convenção de arbitragem e incompetência relativa não se conhecem de ofício.' },
        { t:'Que geram providência', d:'incapacidade, defeito de representação, ausência de caução — saneia-se em vez de extinguir.' },
        { t:'Ordem de exame', d:'primeiro o que extingue, depois o que sanea. Acolhida uma que extingue, as demais ficam prejudicadas — e diga isso.' }
      ],
      lei: ['Extinção sem resolução de mérito — CPC, art. 485',
            'Preliminares de contestação — CPC, art. 337',
            'Matérias não cognoscíveis de ofício — CPC, art. 337, § 5º',
            'Saneamento de vícios — CPC, art. 352'],
      juris: [],
      modelo: 'DAS PRELIMINARES\n\nO réu suscitou preliminar de ilegitimidade passiva, ao argumento de que ... . Não lhe assiste razão. A legitimidade se afere in statu assertionis, e a inicial imputa ao réu a conduta de ..., o que basta para colocá-lo no polo passivo. Rejeito a preliminar.\n\nSuperadas as questões preliminares, e presentes os pressupostos processuais e as condições da ação, passo ao exame do mérito.',
      erro: 'Ir direto ao mérito deixando uma preliminar sem resposta. É ponto perdido no espelho e nulidade por omissão na vida real.' },
    { nome: 'Prescrição e decadência',
      deve: 'Havendo, decidir. O juiz pode reconhecer de ofício — mas só depois de ouvir as partes. Decisão surpresa é vedada em qualquer grau.',
      itens: [
        { t:'Contraditório prévio', d:'antes de reconhecer de ofício, abra prazo. O art. 487, parágrafo único, é expresso, e dialoga com o art. 10.' },
        { t:'Termo inicial', d:'da violação do direito, pela teoria da actio nata; em responsabilidade civil, da ciência do dano e da autoria.' },
        { t:'Causas de impedimento e suspensão', d:'verificar antes de contar o prazo — a citação válida interrompe e retroage à propositura.' },
        { t:'Decadência legal', d:'não se suspende nem se interrompe e é conhecível de ofício sem ressalva.' }
      ],
      lei: ['Resolução de mérito por prescrição ou decadência — CPC, art. 487, II',
            'Contraditório prévio antes de decidir de ofício — CPC, art. 487, parágrafo único',
            'Vedação à decisão surpresa — CPC, art. 10',
            'Interrupção pela citação — CPC, art. 240, § 1º',
            'Prazos prescricionais — CC, arts. 189, 205 e 206',
            'Decadência legal — CC, art. 207'],
      juris: [],
      modelo: 'DA PRESCRIÇÃO\n\nAntes do exame do mérito propriamente dito, e observado o contraditório prévio determinado à fl. ... (art. 487, parágrafo único, do CPC), passo a examinar a prescrição.\n\nA pretensão de ... sujeita-se ao prazo de ... anos (art. 206, § ..., do Código Civil). O termo inicial é a data em que ..., ou seja, .../.../... . A ação foi proposta em .../.../..., e a citação, ocorrida em .../.../..., retroage à data da propositura (art. 240, § 1º, do CPC).\n\nAssim, decorridos ... anos entre o termo inicial e a propositura, RECONHEÇO A PRESCRIÇÃO da pretensão.',
      erro: 'Reconhecer prescrição de ofício sem abrir prazo. É dos pontos mais cobrados, e a sentença cai por vício de procedimento antes de discutir o mérito.' },
    { nome: 'Fundamentação — os fatos',
      deve: 'Dizer o que ficou provado e por quê, apontando a prova concreta. Quando o ônus decidir a causa, distribuí-lo expressamente.',
      itens: [
        { t:'Fatos incontroversos', d:'separe-os logo: não dependem de prova e encurtam a fundamentação.' },
        { t:'Prova de cada ponto controvertido', d:'documento de fl. ..., depoimento de ..., laudo de fl. ... — sempre com a remissão.' },
        { t:'Ônus da prova', d:'ao autor o fato constitutivo; ao réu o impeditivo, modificativo ou extintivo. Quem não se desincumbe, perde.' },
        { t:'Distribuição dinâmica', d:'só por decisão fundamentada, e nunca criando prova impossível para a outra parte.' },
        { t:'Livre convencimento motivado', d:'o juiz aprecia livremente, mas indica na decisão as razões da formação do convencimento.' }
      ],
      lei: ['Ônus da prova — CPC, art. 373',
            'Distribuição dinâmica — CPC, art. 373, §§ 1º e 2º',
            'Livre apreciação motivada — CPC, art. 371',
            'Fatos que independem de prova — CPC, art. 374',
            'Valoração da prova pericial — CPC, art. 479'],
      juris: [],
      modelo: 'DO MÉRITO\n\nÉ incontroverso nos autos que ... .\n\nA controvérsia cinge-se a ... .\n\nO conjunto probatório favorece a tese do autor. O documento de fl. ... demonstra que ... . No mesmo sentido, a testemunha ..., ouvida sob o crivo do contraditório, afirmou que ... (fl. ...). O laudo pericial de fls. ..., por sua vez, concluiu que ..., e não foi infirmado por prova em contrário.\n\nO réu, a quem incumbia a prova do fato impeditivo que alegou (art. 373, II, do CPC), dele não se desincumbiu, limitando-se a ... .',
      erro: 'Escrever "restou comprovado" sem dizer QUAL prova comprovou. O art. 489, § 1º, é a régua da banca: fundamentação genérica não é fundamentação.' },
    { nome: 'Fundamentação — o direito',
      deve: 'Enfrentar todos os argumentos capazes de infirmar a conclusão. Invocando precedente, mostrar por que ele se ajusta ao caso; afastando o que a parte invocou, distinguir ou superar.',
      itens: [
        { t:'Subsunção', d:'norma aplicável, com o dispositivo, e a razão pela qual ela incide sobre os fatos provados.' },
        { t:'Argumentos da parte', d:'enfrentar os que, se acolhidos, mudariam o resultado. Argumento irrelevante pode ser descartado, dizendo que é irrelevante.' },
        { t:'Precedente invocado', d:'identificar os fundamentos determinantes e demonstrar o ajuste ao caso — ementa colada não fundamenta.' },
        { t:'Distinguishing e overruling', d:'para não aplicar precedente invocado pela parte, é preciso distinguir o caso ou demonstrar a superação do entendimento.' },
        { t:'Colisão de normas', d:'havendo ponderação, justificar o objeto, os critérios e as premissas fáticas que a fundamentam.' }
      ],
      lei: ['Sentença não fundamentada — CPC, art. 489, § 1º, I a VI',
            'Ponderação e colisão de normas — CPC, art. 489, § 2º',
            'Precedentes obrigatórios — CPC, art. 927',
            'Dever de uniformidade e estabilidade — CPC, art. 926'],
      juris: [],
      modelo: 'A questão se resolve pela aplicação do art. ... do Código Civil, segundo o qual ... .\n\nNo caso, provado que ..., incide o dispositivo, e a consequência é ... .\n\nO réu invocou o precedente firmado no ... . O caso, porém, não se ajusta: naquele julgado a razão de decidir foi ..., premissa ausente nestes autos, em que ... . Trata-se, pois, de hipótese distinta (distinguishing).\n\nOs demais argumentos deduzidos não têm aptidão para infirmar a conclusão, uma vez que ... .',
      erro: 'Colar a ementa de um precedente sem mostrar por que ele se aplica aqui. O inciso V do § 1º pune exatamente isso, e o inciso VI pune o contrário — deixar de seguir sem distinguir.' },
    { nome: 'Dispositivo',
      deve: 'Acolher ou rejeitar os pedidos, nos limites do que foi pedido. Decisão certa, líquida sempre que possível, com a extensão da obrigação definida desde logo.',
      itens: [
        { t:'Congruência', d:'nem ultra, nem extra, nem citra petita. Pedido não apreciado é omissão; pedido a mais é nulidade.' },
        { t:'Pedido por pedido', d:'diga o que acontece com cada um — procedente, improcedente ou prejudicado.' },
        { t:'Liquidez', d:'na obrigação de pagar, a sentença define desde logo a extensão, o índice, os juros e os termos iniciais. Não empurre para a liquidação.' },
        { t:'Prestações periódicas', d:'incluem-se as vincendas enquanto durar a obrigação, ainda que não pedidas expressamente.' },
        { t:'Obrigação de fazer', d:'fixar o prazo, o modo e a multa, com periodicidade e teto.' }
      ],
      lei: ['Resolução do mérito — CPC, art. 487, I',
            'Limites do pedido — CPC, arts. 141, 490 e 492',
            'Extensão, índice, juros e termos iniciais — CPC, art. 491',
            'Prestações periódicas — CPC, art. 323',
            'Tutela específica e multa — CPC, arts. 497 e 537'],
      juris: [],
      modelo: 'Ante o exposto, com fundamento no art. 487, I, do Código de Processo Civil, JULGO PARCIALMENTE PROCEDENTES os pedidos, para:\n\na) CONDENAR o réu a pagar ao autor a quantia de R$ ... (...), a título de danos materiais, corrigida monetariamente desde o efetivo prejuízo (.../.../...) e acrescida de juros de mora desde a citação;\n\nb) CONDENAR o réu ao pagamento de R$ ... (...), a título de danos morais, corrigidos monetariamente a partir desta data e acrescidos de juros de mora desde o evento danoso (.../.../...);\n\nc) JULGAR IMPROCEDENTE o pedido de ..., ante ... .',
      erro: 'Julgar ultra ou extra petita — e, no pedido de pagar quantia, esquecer que o art. 491 manda definir índice, juros e termos iniciais NA SENTENÇA.' },
    { nome: 'Juros, correção e termos iniciais',
      deve: 'Índice e termo inicial de cada verba, com a fonte de cada um. É o bloco em que a sentença mais perde ponto por preguiça de escrever.',
      itens: [
        { t:'Índice legal desde 2024', d:'a Lei 14.905/2024 alterou o Código Civil: a correção segue o índice do parágrafo único do art. 389 (IPCA) e os juros, a taxa legal do art. 406 — Selic deduzida a correção, e zero se o resultado for negativo.' },
        { t:'Dano moral', d:'correção a partir do arbitramento — a data da sentença.' },
        { t:'Dano material', d:'correção desde o efetivo prejuízo.' },
        { t:'Responsabilidade extracontratual', d:'juros desde o evento danoso.' },
        { t:'Responsabilidade contratual', d:'juros da citação, ou do vencimento se a obrigação for positiva e líquida com termo certo.' },
        { t:'Contra a Fazenda', d:'regime próprio, definido nos temas de repercussão geral e de repetitivo.' }
      ],
      lei: ['Perdas e danos e atualização — CC, art. 389 e parágrafo único',
            'Taxa legal de juros — CC, art. 406 e §§',
            'Juros nas obrigações a termo — CC, art. 397',
            'Cumprimento contra a Fazenda — CPC, art. 534'],
      juris: ['Correção do dano moral a partir do arbitramento — Súmula 362 do STJ',
              'Juros do evento danoso na responsabilidade extracontratual — Súmula 54 do STJ',
              'Correção do dano material desde o efetivo prejuízo — Súmula 43 do STJ',
              'Correção das condenações contra a Fazenda — STF, RE 870.947, Tema 810',
              'Índices de correção e juros nas condenações contra a Fazenda — STJ, REsp 1.495.146, Tema 905'],
      modelo: 'Sobre a condenação incidirão correção monetária pelo índice previsto no parágrafo único do art. 389 do Código Civil e juros de mora à taxa legal do art. 406 do mesmo diploma, na redação da Lei 14.905/2024, observados os seguintes termos iniciais:\n\n— danos materiais: correção desde o efetivo prejuízo (Súmula 43 do STJ) e juros desde o evento danoso (Súmula 54 do STJ);\n\n— danos morais: correção a partir desta data, do arbitramento (Súmula 362 do STJ), e juros desde o evento danoso.',
      erro: 'Escrever "juros e correção na forma da lei". A banca quer o índice, o termo inicial e a fonte de cada um — três informações, não uma remissão genérica.' },
    { nome: 'Sucumbência',
      deve: 'Custas e honorários ao vencido, com o percentual dentro da faixa legal. Havendo perda recíproca, distribuir proporcionalmente; sendo mínima a de uma parte, a outra responde por tudo.',
      itens: [
        { t:'Percentual', d:'de 10% a 20% sobre o valor da condenação, do proveito econômico ou, não havendo, do valor atualizado da causa.' },
        { t:'Contra a Fazenda', d:'faixas escalonadas do § 3º, aplicadas por faixa e não sobre o total.' },
        { t:'Equidade', d:'só quando o proveito for inestimável ou irrisório, ou o valor da causa muito baixo. Causa de valor alto não comporta arbitramento equitativo.' },
        { t:'Sucumbência recíproca', d:'proporcional; vedada a compensação entre os honorários das partes.' },
        { t:'Gratuidade', d:'o beneficiário é condenado, mas a exigibilidade fica suspensa por cinco anos.' }
      ],
      lei: ['Honorários e faixas — CPC, art. 85, §§ 2º e 3º',
            'Base de cálculo — CPC, art. 85, § 6º-A',
            'Arbitramento por equidade — CPC, art. 85, § 8º',
            'Vedação à compensação — CPC, art. 85, § 14',
            'Sucumbência recíproca e mínima — CPC, art. 86 e parágrafo único',
            'Custas ao vencido — CPC, art. 82, § 2º',
            'Suspensão da exigibilidade na gratuidade — CPC, art. 98, § 3º'],
      juris: ['Inaplicabilidade da equidade quando os valores são elevados — STJ, REsp 1.850.512, Tema 1076'],
      modelo: 'Diante da sucumbência recíproca, e considerando que o autor decaiu de aproximadamente ...% de seus pedidos, distribuo os ônus na proporção de ...% para o autor e ...% para o réu, na forma do art. 86 do Código de Processo Civil, vedada a compensação (art. 85, § 14).\n\nCONDENO ainda as partes ao pagamento de honorários advocatícios, que fixo em ...% sobre o valor atualizado da condenação, na forma do art. 85, § 2º, do Código de Processo Civil, atendidos o grau de zelo do profissional, o lugar da prestação do serviço, a natureza e a importância da causa e o trabalho realizado.\n\nSuspensa a exigibilidade em relação ao autor, beneficiário da gratuidade, nos termos do art. 98, § 3º, do CPC.',
      erro: 'Arbitrar honorários "por equidade" numa causa de valor elevado. O Tema 1076 do STJ fechou essa porta: fora das hipóteses do § 8º, é a faixa do § 2º.' },
    { nome: 'Providências finais',
      deve: 'Resolver a sorte da tutela concedida antes, verificar a remessa necessária e fechar com as publicações. Sentença sem essas três linhas fica inacabada.',
      itens: [
        { t:'Tutela provisória', d:'confirmar, revogar ou modificar expressamente. Silêncio aqui é item em branco no espelho.' },
        { t:'Remessa necessária', d:'verificar se é caso e se incide alguma das dispensas por valor ou por precedente.' },
        { t:'Hipoteca judiciária', d:'a decisão que condena a pagar vale como título de hipoteca judiciária, independentemente de pedido.' },
        { t:'Limites da alteração', d:'publicada a sentença, o juiz só a altera para corrigir erro material ou por embargos de declaração.' },
        { t:'Fecho', d:'custas, publique-se, registre-se, intimem-se, e o arquivamento após o trânsito.' }
      ],
      lei: ['Confirmação da tutela na sentença — CPC, art. 296',
            'Remessa necessária — CPC, art. 496',
            'Dispensas da remessa — CPC, art. 496, §§ 3º e 4º',
            'Hipoteca judiciária — CPC, art. 495',
            'Alteração da sentença publicada — CPC, art. 494'],
      juris: [],
      modelo: 'CONFIRMO a tutela de urgência deferida à fl. ... .\n\nDeixo de submeter a sentença ao reexame necessário, por se tratar de condenação em valor certo inferior ao limite do art. 496, § 3º, ..., do Código de Processo Civil.\n\nCustas na forma acima.\n\nPublique-se. Registre-se. Intimem-se.\n\nTransitada em julgado, arquivem-se com as cautelas de estilo.\n\nLocal, data.\nJuiz de Direito',
      erro: 'Não dizer nada sobre a liminar deferida no começo do processo. A sentença tem de resolver a sorte dela — e o art. 296 existe exatamente para isso.' }
  ],
  cego: [
    'Relatório com a suma do pedido E da defesa',
    'Todos os pedidos e todas as teses relatados',
    'Preliminares enfrentadas uma a uma, com motivo',
    'Prescrição ou decadência decidida, com contraditório prévio se de ofício',
    'Fatos incontroversos separados dos controvertidos',
    'Prova apontada com a folha, não só afirmada',
    'Ônus da prova distribuído quando decide a causa',
    'Precedente invocado com os fundamentos determinantes',
    'Distinção ou superação, ao afastar precedente da parte',
    'Todos os argumentos capazes de infirmar a conclusão enfrentados',
    'Dispositivo dentro dos limites do pedido',
    'Cada pedido com destino declarado',
    'Extensão da obrigação definida na sentença',
    'Índice, juros e termos iniciais de cada verba',
    'Sucumbência com percentual e regra (art. 85 ou 86)',
    'Vedação à compensação observada',
    'Sorte da tutela provisória resolvida',
    'Remessa necessária verificada',
    'P. R. I. e arquivamento'
  ],
  dicas: [
    { t:'Antes de escrever, liste os pedidos numa margem e vá riscando conforme o dispositivo os resolve. É o que impede a sentença citra petita, que é o erro mais caro da peça.', alerta:false },
    'Grife no enunciado tudo que tem data: prescrição, termo inicial de juros, termo inicial de correção. Datas no enunciado quase nunca são decorativas.',
    'Fato incontroverso não precisa de prova nem de fundamentação longa. Reconhecê-lo logo economiza meia página.',
    'Se for rejeitar tudo por uma preliminar, ainda assim enfrente o mérito em caráter subsidiário quando a banca der elementos — muitos espelhos pontuam os dois.',
    'A ordem do art. 489 é obrigatória, mas dentro da fundamentação você escolhe a sequência. Fatos antes do direito rende mais que o contrário.',
    'Honorários: primeiro identifique a base (condenação, proveito ou valor da causa), depois o percentual. Invertendo a ordem, o cálculo sai errado.',
    { t:'Reconhecer prescrição ou decadência de ofício exige contraditório prévio (art. 487, parágrafo único, e art. 10). Não é formalidade: é o vício mais fácil de anular a sentença.', alerta:true },
    { t:'O art. 491 manda definir extensão, índice, juros e termos iniciais NA SENTENÇA. Empurrar para a liquidação é item perdido, e em alguns espelhos vale mais de um ponto.', alerta:true },
    { t:'Desde a Lei 14.905/2024 a correção e os juros legais mudaram de base: IPCA para correção e taxa legal (Selic deduzida a correção) para juros. Escrever "1% ao mês" está desatualizado.', alerta:true }
  ],
  especiais: [
    { t:'Sentença contra a Fazenda Pública', d:'Honorários pelas faixas do art. 85, § 3º, aplicadas por faixa, não sobre o total. Remessa necessária, salvo as dispensas do § 3º por valor e do § 4º por precedente. Correção e juros seguem o Tema 810 do STF e o Tema 905 do STJ, e o cumprimento é o do art. 534, por precatório ou RPV.' },
    { t:'Revelia', d:'A presunção do art. 344 é relativa e não alcança as hipóteses do art. 345. Réu revel citado por edital ou por hora certa tem curador especial (art. 72, II), e aí não há efeito material da revelia. Revelia não dispensa fundamentação — dispensa prova, não a decisão.' },
    { t:'Julgamento parcial do mérito', d:'Quando um dos pedidos estiver maduro, o art. 356 permite julgá-lo desde logo, por decisão interlocutória impugnável por agravo de instrumento (§ 5º). A parte julgada é liquidável e executável de imediato, inclusive definitivamente após o trânsito.' },
    { t:'Obrigação de fazer e astreintes', d:'A multa do art. 537 pode ser fixada de ofício, alterada a qualquer tempo se insuficiente ou excessiva, e não faz coisa julgada material quanto ao valor. Fixe periodicidade e teto — multa sem limite é reduzida em grau recursal.' },
    { t:'Sentença ilíquida', d:'Só se admite nas hipóteses do art. 491, I e II: quando não for possível determinar o valor devido de modo definitivo, ou quando a apuração depender de prova demorada ou excessivamente dispendiosa. Fora disso, a sentença tem de ser líquida — e no Juizado a ilíquida é vedada (Lei 9.099/95, art. 38, parágrafo único).' },
    { t:'Dano moral', d:'O arbitramento exige método: diga os critérios que usou — extensão do dano, capacidade econômica das partes, caráter pedagógico — e o valor. Correção a partir do arbitramento (Súmula 362 do STJ), e os juros seguem a natureza da responsabilidade: evento danoso na extracontratual, citação na contratual.' }
  ]
},

// ─────────────────────────────── SENTENÇA PENAL ───────────────────────────────
'Sentença penal — treino guiado': {
  rito: 'Penal — procedimento comum',
  freq: 36,   // vezes em que o tema aparece nas 648 provas de discursivas.js
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
  freq: 4,   // vezes em que o tema aparece nas 648 provas de discursivas.js
  carreiras: ['Magistratura'],
  sobre: 'O art. 357 é uma lista de cinco providências, e o espelho cobra uma a uma. Sanear não é despachar "especifiquem provas": é resolver o que ficou pendente, dizer o que vai ser provado, de quem é o ônus, quais questões de direito decidem a causa e como será a instrução. Decisão interlocutória — mas a que mais organiza o processo.',
  blocos: [
    { nome: 'Resolver as questões processuais pendentes',
      deve: 'Decidir o que sobrou de processual. Rejeitar também é decidir, e tem de vir fundamentado — uma linha de motivo por questão.',
      itens: [
        { t:'Preliminares da contestação', d:'percorrer o rol do art. 337 quanto ao que foi suscitado, acolhendo ou rejeitando expressamente.' },
        { t:'Vícios sanáveis', d:'irregularidade de representação, falta de procuração, ausência de documento — o saneamento é o momento de mandar corrigir, não de extinguir.' },
        { t:'Competência e conexão', d:'resolver o que ficou pendente; conexão gera reunião, não extinção.' },
        { t:'Legitimidade e interesse', d:'aferidos in statu assertionis; havendo ilegitimidade manifesta, extingue-se aqui, sem esperar a sentença.' },
        { t:'Prejudiciais que encurtam', d:'se houver prescrição ou decadência já madura, é possível julgar antecipadamente o mérito em vez de sanear — mas com contraditório prévio.' }
      ],
      lei: ['Saneamento e organização — CPC, art. 357, I',
            'Preliminares de contestação — CPC, art. 337',
            'Extinção sem resolução de mérito — CPC, art. 485',
            'Saneamento de vícios — CPC, art. 352',
            'Julgamento antecipado do mérito — CPC, art. 355'],
      juris: [],
      modelo: 'Vistos em saneamento.\n\n1. DAS QUESTÕES PROCESSUAIS PENDENTES\n\nO réu suscitou preliminar de ..., ao argumento de que ... . Rejeito-a, porquanto ... .\n\nNão há outras nulidades a sanar. Presentes os pressupostos processuais e as condições da ação, DECLARO SANEADO o processo.',
      erro: 'Deixar uma preliminar sem resposta e ir direto para as provas. No espelho é ponto perdido; no processo, nulidade por omissão.' },
    { nome: 'Delimitar as questões de fato e definir os meios de prova',
      deve: 'Dizer QUAIS fatos ficaram controvertidos e, para cada um, qual prova será produzida. É aqui que se defere ou indefere perícia, testemunhal e depoimento pessoal — com motivo.',
      itens: [
        { t:'Separar o incontroverso', d:'fato admitido, notório ou confessado não precisa de prova. Registrar isso encurta a instrução.' },
        { t:'Um ponto controvertido por vez', d:'liste-os numerados: "1) se houve o defeito; 2) a extensão do dano; 3) o nexo".' },
        { t:'Prova para cada ponto', d:'perícia para o ponto 1, testemunhal para o ponto 2, e assim por diante. Prova sem finalidade é prova indeferida.' },
        { t:'Indeferimento motivado', d:'prova inútil, impertinente ou meramente protelatória se indefere — mas dizendo por quê, sob pena de cerceamento.' },
        { t:'Perícia', d:'nomear o perito, fixar prazo, e abrir 15 dias para quesitos e assistente técnico.' }
      ],
      lei: ['Delimitação das questões de fato — CPC, art. 357, II',
            'Fatos que independem de prova — CPC, art. 374',
            'Indeferimento de provas inúteis ou protelatórias — CPC, art. 370, parágrafo único',
            'Nomeação do perito e prazo para quesitos — CPC, art. 465'],
      juris: [],
      modelo: '2. DAS QUESTÕES DE FATO CONTROVERTIDAS E DOS MEIOS DE PROVA\n\nSão incontroversos: a existência do contrato de fls. ... e a data do pagamento.\n\nFixo como pontos controvertidos:\n(i) se o serviço foi prestado nos moldes contratados;\n(ii) a extensão do dano material alegado;\n(iii) a ocorrência de dano moral.\n\nPara o ponto (i), DEFIRO a prova testemunhal e o depoimento pessoal das partes. Para o ponto (ii), DEFIRO a prova pericial contábil, nomeando desde já o perito ..., que deverá apresentar proposta de honorários em 5 dias; facultado às partes, em 15 dias, indicar assistente técnico e apresentar quesitos (art. 465, § 1º, do CPC). Para o ponto (iii), a prova é documental e já se encontra nos autos.\n\nINDEFIRO a prova ... requerida pelo autor, por impertinente ao objeto da lide (art. 370, parágrafo único, do CPC).',
      erro: 'Escrever "defiro a produção de provas" sem dizer quais fatos elas servem para provar. Isso não delimita nada e devolve a bagunça para a audiência.' },
    { nome: 'Distribuir o ônus da prova',
      deve: 'Fixar o ônus pela regra do art. 373 e, se for o caso, invertê-lo de forma motivada — sempre dando à parte a oportunidade de se desincumbir do encargo.',
      itens: [
        { t:'Regra estática', d:'ao autor o fato constitutivo; ao réu o impeditivo, modificativo ou extintivo.' },
        { t:'Distribuição dinâmica', d:'por decisão fundamentada, quando houver peculiaridades ou dificuldade excessiva — e o juiz dá à parte a chance de se desincumbir.' },
        { t:'Prova diabólica', d:'a inversão não pode gerar encargo impossível ou excessivamente difícil para a outra parte (§ 2º).' },
        { t:'Consumo', d:'a inversão do art. 6º, VIII, do CDC é ope judicis e depende de verossimilhança ou hipossuficiência — decidida aqui, não na sentença.' },
        { t:'Momento', d:'o saneamento é o momento próprio. Inverter na sentença surpreende quem já perdeu a chance de produzir a prova.' }
      ],
      lei: ['Ônus da prova — CPC, art. 373',
            'Distribuição dinâmica — CPC, art. 373, § 1º',
            'Vedação à prova diabólica — CPC, art. 373, § 2º',
            'Convenção sobre o ônus — CPC, art. 373, §§ 3º e 4º',
            'Inversão no consumo — CDC, art. 6º, VIII'],
      juris: [],
      modelo: '3. DO ÔNUS DA PROVA\n\nO ônus da prova permanece distribuído na forma do art. 373, I e II, do Código de Processo Civil.\n\nOU\n\nTratando-se de relação de consumo, e presente a hipossuficiência técnica do autor para demonstrar ..., INVERTO o ônus da prova quanto ao ponto controvertido (i), com fundamento no art. 6º, VIII, do Código de Defesa do Consumidor e no art. 373, § 1º, do Código de Processo Civil, assegurando ao réu a oportunidade de se desincumbir do encargo, sem que disso resulte prova de difícil ou impossível produção (art. 373, § 2º).',
      erro: 'Inverter o ônus só na sentença. A inversão surpreende quem já perdeu a chance de produzir a prova; o momento próprio é o saneamento.' },
    { nome: 'Delimitar as questões de direito relevantes',
      deve: 'Apontar as questões jurídicas que decidirão a causa. Serve para a instrução não gastar tempo com o irrelevante e para as partes saberem onde mirar.',
      itens: [
        { t:'O que entra', d:'a tese jurídica de que depende o resultado: prescrição, natureza da responsabilidade, incidência do CDC, validade de cláusula.' },
        { t:'O que não entra', d:'questão que não muda o resultado, ainda que discutida pelas partes — diga que é irrelevante e por quê.' },
        { t:'Precedente aplicável', d:'havendo tema repetitivo ou súmula vinculante sobre o ponto, registrar desde já, para orientar a instrução.' }
      ],
      lei: ['Questões de direito relevantes — CPC, art. 357, IV',
            'Precedentes obrigatórios — CPC, art. 927'],
      juris: [],
      modelo: '4. DAS QUESTÕES DE DIREITO RELEVANTES\n\nSão relevantes para o julgamento:\n(a) a incidência ou não do Código de Defesa do Consumidor à relação em exame;\n(b) a natureza da responsabilidade do réu — objetiva ou subjetiva;\n(c) os critérios de arbitramento do dano moral.\n\nRegistro que a questão (a) é orientada pelo entendimento firmado no ..., cuja aplicação ao caso será examinada na sentença.',
      erro: 'Pular este inciso. É o mais esquecido dos cinco e costuma valer ponto autônomo no espelho.' },
    { nome: 'Designar audiência de instrução, se necessária',
      deve: 'Designar a audiência e fixar o prazo comum para o rol de testemunhas, observando os limites de número.',
      itens: [
        { t:'Prazo do rol', d:'comum, não superior a 15 dias, fixado pelo juiz — não é prazo automático.' },
        { t:'Número', d:'até 10 testemunhas no total, e no máximo 3 para cada fato.' },
        { t:'Intimação', d:'cabe ao advogado informar ou intimar a testemunha por carta com AR; a intimação judicial é excepcional.' },
        { t:'Dispensa', d:'não sendo necessária a audiência, o processo segue para conclusão — e diga isso expressamente.' }
      ],
      lei: ['Designação de audiência — CPC, art. 357, V',
            'Prazo comum para o rol — CPC, art. 357, § 4º',
            'Número de testemunhas — CPC, art. 357, § 6º',
            'Intimação da testemunha pelo advogado — CPC, art. 455'],
      juris: [],
      modelo: '5. DA AUDIÊNCIA\n\nDESIGNO audiência de instrução e julgamento para o dia .../.../..., às ...h.\n\nFixo o prazo comum de 15 dias para apresentação do rol de testemunhas, observado o limite de 10 no total e 3 para cada fato (art. 357, §§ 4º e 6º, do CPC).\n\nCabe ao advogado informar ou intimar a testemunha por carta com aviso de recebimento, na forma do art. 455 do CPC, juntando o comprovante aos autos com pelo menos 3 dias de antecedência.',
      erro: 'Designar audiência sem abrir prazo para o rol, ou não limitar o número de testemunhas. São dois itens distintos do § 4º e do § 6º.' },
    { nome: 'Estabilizar a decisão e, quando couber, sanear em cooperação',
      deve: 'Registrar o prazo de 5 dias para pedido de esclarecimento ou ajuste, findo o qual a decisão se torna estável. Em causa complexa, designar o saneamento compartilhado em audiência.',
      itens: [
        { t:'Estabilização', d:'cinco dias para esclarecimento ou ajuste; passado o prazo, a decisão é estável e a matéria não volta.' },
        { t:'Delimitação consensual', d:'as partes podem apresentar em conjunto a delimitação das questões de fato e de direito; homologada, vincula.' },
        { t:'Saneamento compartilhado', d:'causa complexa em matéria de fato ou de direito comporta audiência para sanear em cooperação com as partes.' },
        { t:'Recorribilidade', d:'a decisão de saneamento em geral não é agravável, salvo capítulo que se enquadre no art. 1.015 — como a redistribuição do ônus da prova.' }
      ],
      lei: ['Estabilidade em 5 dias — CPC, art. 357, § 1º',
            'Delimitação consensual homologada — CPC, art. 357, § 2º',
            'Saneamento compartilhado em causa complexa — CPC, art. 357, § 3º',
            'Agravo contra redistribuição do ônus da prova — CPC, art. 1.015, XI'],
      juris: [],
      modelo: '6. Nos termos do art. 357, § 1º, do Código de Processo Civil, as partes têm o prazo comum de 5 (cinco) dias para pedir esclarecimentos ou solicitar ajustes, findo o qual esta decisão torna-se ESTÁVEL.\n\nIntimem-se.\n\nLocal, data.\nJuiz de Direito',
      erro: 'Ignorar o § 1º. Sem a estabilização, a discussão volta na apelação — e o espelho cobra exatamente essa menção.' }
  ],
  cego: ['Preliminares e questões processuais pendentes decididas','Vícios sanáveis mandados corrigir',
    'Fatos incontroversos separados','Questões de fato controvertidas numeradas',
    'Meio de prova definido para cada ponto','Prova indeferida com motivo',
    'Perícia com perito, prazo e quesitos','Ônus da prova distribuído (art. 373)',
    'Inversão motivada e com oportunidade de desincumbência','Questões de direito relevantes apontadas',
    'Audiência designada quando necessária','Prazo comum para rol de testemunhas fixado',
    'Limite de 10 testemunhas e 3 por fato','Prazo de 5 dias para ajuste e estabilização registrado'],
  dicas: [
    'Escreva o saneamento em seis blocos numerados, na ordem do art. 357. O espelho é conferido item por item, e a numeração faz o corretor achar cada um.',
    'Separe o incontroverso antes de tudo. Cada fato que sai da lista é uma prova a menos e meia página a menos.',
    'Ponto controvertido bem escrito é uma pergunta fechada: "se houve o defeito", não "a questão da qualidade do serviço".',
    'Indeferir prova exige motivo escrito. Indeferimento sem motivo é cerceamento de defesa, e é matéria de apelação garantida.',
    { t:'A inversão do ônus da prova é decisão de saneamento, não de sentença. Inverter na sentença surpreende quem já perdeu a chance de produzir a prova — e é agravável pelo art. 1.015, XI.', alerta:true },
    { t:'O inciso IV — questões de direito relevantes — é o mais esquecido dos cinco. Ele vale ponto autônomo em quase todo espelho de sentença cível prática.', alerta:true }
  ],
  especiais: [
    { t:'Julgamento antecipado parcial', d:'Se um dos pedidos estiver maduro e o outro depender de prova, não sanei tudo: julgue parcialmente o mérito pelo art. 356 e saneie o restante. A decisão é interlocutória, agravável pelo § 5º, e a parte julgada já é liquidável e executável.' },
    { t:'Negócio jurídico processual', d:'As partes plenamente capazes podem convencionar sobre ônus, poderes, faculdades e deveres processuais (art. 190) e apresentar calendário processual (art. 191). O juiz controla a validade e recusa apenas nos casos de nulidade, inserção abusiva em contrato de adesão ou vulnerabilidade manifesta.' },
    { t:'Causa complexa', d:'O § 3º autoriza designar audiência para sanear em cooperação. É o caminho quando há muitas partes, muitos pedidos ou prova técnica difícil — e evita que a delimitação seja rediscutida no meio da instrução.' },
    { t:'Prova emprestada e prova pericial simplificada', d:'A prova emprestada é admitida com contraditório (art. 372). Sendo o ponto de menor complexidade, cabe prova técnica simplificada, com o especialista inquirido em audiência (art. 464, §§ 2º a 4º) — mais rápida e frequentemente suficiente.' }
  ]
},

// ─────────────────────────────────────────────────────────────────────────────
'Decisão da tutela': {
  rito: 'Civil — conhecimento',
  freq: 84,   // vezes em que o tema aparece nas 648 provas de discursivas.js
  carreiras: ['Magistratura'],
  sobre: 'Conceder ou negar tutela provisória é o teste de fundamentação da prova. A banca quer ver os requisitos ENFRENTADOS com os fatos do caso — não a fórmula "presentes os requisitos, defiro". E quer ver a espécie corretamente identificada, porque cada uma tem requisito próprio.',
  blocos: [
    { nome: 'Identificar a espécie pedida',
      deve: 'Dizer se é urgência (cautelar ou antecipada) ou evidência, e se é antecedente ou incidental. O requisito muda conforme a espécie, e trocar de espécie no meio derruba a fundamentação.',
      itens: [
        { t:'Urgência x evidência', d:'a urgência exige probabilidade e perigo; a evidência dispensa o perigo e se apoia na robustez do direito.' },
        { t:'Antecipada x cautelar', d:'a antecipada satisfaz desde logo o que se pede; a cautelar assegura o resultado útil do processo.' },
        { t:'Antecedente x incidental', d:'antecedente é pedida antes do pedido principal, com rito próprio; incidental, no curso do processo.' },
        { t:'Fungibilidade', d:'pedida como cautelar e sendo o caso de antecipada — ou o contrário —, o juiz pode conceder na espécie correta.' }
      ],
      lei: ['Espécies de tutela provisória — CPC, art. 294 e parágrafo único',
            'Tutela antecipada antecedente — CPC, art. 303',
            'Tutela cautelar antecedente — CPC, art. 305 e parágrafo único',
            'Poder geral de cautela — CPC, art. 301'],
      juris: [],
      modelo: 'Vistos.\n\nTrata-se de pedido de tutela provisória de urgência, de natureza ANTECIPADA e em caráter INCIDENTAL, formulado por ... para que ... .\n\nPasso a examinar os requisitos do art. 300 do Código de Processo Civil.',
      erro: 'Tratar tutela de evidência com o vocabulário da urgência. Na evidência não se exige perigo — exigi-lo é erro de premissa.' },
    { nome: 'Enfrentar os requisitos da urgência com os fatos',
      deve: 'Demonstrar a probabilidade do direito apontando a prova que já está nos autos, e o perigo apontando o fato concreto que o gera. Cada requisito em um parágrafo próprio.',
      itens: [
        { t:'Probabilidade do direito', d:'não é certeza: é a plausibilidade que a prova existente sustenta. Aponte o documento, o laudo, o contrato.' },
        { t:'Perigo de dano', d:'na antecipada — o dano que se produz enquanto o processo tramita.' },
        { t:'Risco ao resultado útil', d:'na cautelar — o risco de que a decisão final não sirva para nada.' },
        { t:'Contemporaneidade', d:'perigo antigo e não alegado antes enfraquece o pedido; explique por que a urgência é agora.' },
        { t:'Contraditório prévio', d:'a liminar sem ouvir a parte contrária é possível, mas é exceção — justifique por que a oitiva frustraria a medida.' }
      ],
      lei: ['Requisitos da tutela de urgência — CPC, art. 300',
            'Concessão liminar ou após justificação prévia — CPC, art. 300, § 2º',
            'Dever de fundamentar — CPC, art. 298',
            'Fundamentação das decisões — CPC, art. 489, § 1º'],
      juris: [],
      modelo: 'A PROBABILIDADE DO DIREITO está demonstrada pelo contrato de fls. ..., que prevê expressamente ..., e pelo documento de fl. ..., que comprova ... . Os elementos até aqui produzidos tornam plausível a tese de que ... .\n\nO PERIGO DE DANO também se verifica: o autor demonstrou que ... (fato concreto), e a espera pelo desfecho do processo acarretará ..., consequência que a decisão final não terá como desfazer.\n\nA urgência é contemporânea, porquanto o fato gerador ocorreu em .../.../..., e o autor postulou imediatamente.',
      erro: 'Repetir o texto do art. 300 sem amarrar nos fatos. É exatamente a decisão que o art. 489, § 1º, considera não fundamentada.' },
    { nome: 'Tutela de evidência: apontar o inciso',
      deve: 'Sendo evidência, dizer qual dos quatro incisos autoriza a medida — e lembrar que liminar, sem ouvir a outra parte, só nos incisos II e III.',
      itens: [
        { t:'Inciso I', d:'abuso do direito de defesa ou manifesto propósito protelatório — depende do comportamento do réu, e por isso não cabe liminar.' },
        { t:'Inciso II', d:'prova documental suficiente dos fatos e tese firmada em repetitivos ou súmula vinculante — cabe liminar.' },
        { t:'Inciso III', d:'contrato de depósito, com pedido de entrega da coisa — cabe liminar.' },
        { t:'Inciso IV', d:'petição instruída com prova documental suficiente e o réu não opõe prova capaz de gerar dúvida — não cabe liminar.' }
      ],
      lei: ['Hipóteses de tutela de evidência — CPC, art. 311, I a IV',
            'Liminar apenas nos incisos II e III — CPC, art. 311, parágrafo único'],
      juris: [],
      modelo: 'O pedido é de TUTELA DA EVIDÊNCIA, fundada no art. 311, II, do Código de Processo Civil.\n\nOs fatos estão comprovados documentalmente às fls. ..., e a tese jurídica invocada corresponde à firmada no julgamento de ..., de observância obrigatória (art. 927 do CPC).\n\nPresente a hipótese do inciso II, é cabível a concessão LIMINAR, independentemente da oitiva da parte contrária, na forma do parágrafo único do art. 311.',
      erro: 'Deferir liminarmente evidência com base no inciso I ou no IV. O parágrafo único só autoriza a liminar nos incisos II e III.' },
    { nome: 'Reversibilidade e contracautela',
      deve: 'Avaliar se a medida é reversível; sendo o risco relevante, exigir caução real ou fidejussória, salvo hipossuficiência. E, havendo irreversibilidade dos dois lados, ponderar.',
      itens: [
        { t:'Irreversibilidade', d:'a antecipada não se concede quando houver perigo de irreversibilidade dos efeitos — mas o dispositivo é lido com ponderação.' },
        { t:'Irreversibilidade recíproca', d:'em saúde e alimentos, negar também é irreversível. A decisão tem de mostrar que pesou os dois lados.' },
        { t:'Caução', d:'real ou fidejussória, para ressarcir eventual dano — dispensada ao economicamente hipossuficiente.' },
        { t:'Responsabilidade objetiva', d:'a parte responde pelo prejuízo causado pela efetivação da tutela nas hipóteses do art. 302, independentemente de culpa.' }
      ],
      lei: ['Vedação à irreversibilidade — CPC, art. 300, § 3º',
            'Caução e dispensa ao hipossuficiente — CPC, art. 300, § 1º',
            'Responsabilidade pelo dano da efetivação — CPC, art. 302'],
      juris: [],
      modelo: 'Quanto à reversibilidade, a medida ora deferida é reversível, uma vez que ... .\n\nOU\n\nEmbora se possa cogitar de irreversibilidade parcial dos efeitos, a vedação do art. 300, § 3º, do CPC não é absoluta: a irreversibilidade também se verifica na hipótese inversa, pois o indeferimento acarretaria ..., dano de maior monta e igualmente irreparável. Ponderados os bens em conflito, prevalece ... .\n\nDeixo de exigir caução, ante a hipossuficiência do autor, beneficiário da gratuidade (art. 300, § 1º, parte final).',
      erro: 'Negar a tutela apenas invocando "irreversibilidade" quando a irreversibilidade maior está do outro lado — saúde, alimentos, emprego. A ponderação tem de aparecer.' },
    { nome: 'Delimitar o comando e sancionar o descumprimento',
      deve: 'Dizer exatamente o que fica determinado, em que prazo e sob qual multa. Comando vago não se executa e astreinte sem parâmetro é reduzida em grau recursal.',
      itens: [
        { t:'O quê', d:'a obrigação, com objeto certo: "abster-se de inscrever o nome do autor nos cadastros", não "abster-se de praticar atos lesivos".' },
        { t:'Em quanto tempo', d:'prazo para cumprimento, contado da intimação.' },
        { t:'Sob qual sanção', d:'multa com valor, periodicidade e, preferencialmente, teto.' },
        { t:'Revisibilidade', d:'a multa pode ser modificada de ofício a qualquer tempo se insuficiente ou excessiva, e não faz coisa julgada material quanto ao valor.' },
        { t:'Efetivação', d:'indicar as medidas de apoio necessárias — ofício, busca e apreensão, bloqueio.' }
      ],
      lei: ['Efetivação da tutela e medidas de apoio — CPC, art. 297',
            'Multa por descumprimento — CPC, art. 537 e §§ 1º e 3º',
            'Tutela específica — CPC, art. 497',
            'Dever de fundamentar de modo claro e preciso — CPC, art. 298'],
      juris: [],
      modelo: 'Ante o exposto, DEFIRO a tutela de urgência para DETERMINAR que o réu ... (comando específico), no prazo de ... dias contados da intimação, sob pena de multa diária de R$ ..., limitada a R$ ... (art. 537 do CPC), sem prejuízo da adoção das medidas de apoio necessárias (art. 297 do CPC).\n\nIntime-se o réu com urgência, servindo esta decisão como mandado.\n\nCite-se para os demais termos.',
      erro: 'Fixar astreintes sem prazo de cumprimento nem teto, ou em valor desproporcional ao da obrigação. Multa desproporcional é reduzida, e o efeito coercitivo se perde.' },
    { nome: 'Antecedente: aditamento e estabilização',
      deve: 'Na antecipada antecedente, intimar para aditar em 15 dias e advertir que, não havendo recurso, a tutela se estabiliza e o processo se extingue.',
      itens: [
        { t:'Aditamento', d:'concedida a tutela, o autor adita a inicial em 15 dias ou outro prazo maior fixado pelo juiz, sob pena de extinção.' },
        { t:'Estabilização', d:'não interposto recurso pelo réu, a tutela se estabiliza e o processo é extinto — sem coisa julgada.' },
        { t:'Prazo de dois anos', d:'qualquer das partes pode ajuizar ação para rever, reformar ou invalidar a tutela estabilizada, em dois anos contados da ciência da extinção.' },
        { t:'Cautelar antecedente', d:'rito diferente: efetivada a cautelar, o pedido principal é formulado em 30 dias, nos mesmos autos, sem novas custas.' }
      ],
      lei: ['Aditamento da inicial — CPC, art. 303, § 1º, I',
            'Extinção pela falta de aditamento — CPC, art. 303, § 2º',
            'Estabilização da tutela — CPC, art. 304',
            'Prazo de dois anos para rever — CPC, art. 304, §§ 5º e 6º',
            'Pedido principal na cautelar antecedente — CPC, art. 308'],
      juris: [],
      modelo: 'Tratando-se de tutela antecipada requerida em caráter ANTECEDENTE, INTIME-SE o autor para, no prazo de 15 (quinze) dias, aditar a petição inicial, complementando a argumentação, juntando novos documentos e confirmando o pedido de tutela final, sob pena de extinção sem resolução do mérito (art. 303, §§ 1º, I, e 2º, do CPC).\n\nADVIRTA-SE o réu de que, não interposto o respectivo recurso, a tutela ora concedida tornar-se-á ESTÁVEL e o processo será extinto, nos termos do art. 304 do Código de Processo Civil, facultada a qualquer das partes, no prazo de 2 (dois) anos, a propositura de ação para revê-la, reformá-la ou invalidá-la.',
      erro: 'Esquecer a advertência da estabilização. É o ponto que separa quem estudou o art. 304 de quem decorou o 300.' }
  ],
  cego: ['Espécie identificada (urgência ou evidência; antecedente ou incidental)',
    'Probabilidade do direito demonstrada com a prova dos autos','Perigo de dano apontado com fato concreto',
    'Contemporaneidade da urgência justificada','Concessão sem contraditório justificada, se liminar',
    'Na evidência, inciso do art. 311 indicado','Liminar sem contraditório só nos incisos II e III',
    'Reversibilidade analisada','Irreversibilidade recíproca ponderada, se for o caso',
    'Caução examinada quando havia risco','Comando delimitado: o quê, em que prazo',
    'Multa com valor, periodicidade e teto','Medidas de apoio indicadas',
    'Aditamento e estabilização tratados, se antecedente'],
  dicas: [
    'Escreva um parágrafo para a probabilidade e outro para o perigo. Requisito examinado em bloco é requisito que a banca lê como não examinado.',
    'Probabilidade do direito não é certeza. Se você escrever "está comprovado", está antecipando o mérito — escreva "os elementos tornam plausível".',
    'Perigo de dano tem de ter data. Fato antigo, alegado agora, precisa de explicação para a urgência.',
    'Deferindo parcialmente, diga o que defere e o que indefere. Tutela parcial sem delimitação é tutela inexequível.',
    'Astreinte: fixe periodicidade e teto. Multa diária sem limite vira quantia absurda e é reduzida no agravo.',
    { t:'A vedação do art. 300, § 3º não é absoluta. Quando negar também produz efeito irreversível — saúde, alimentos —, a decisão tem de ponderar, e não apenas invocar o dispositivo.', alerta:true },
    { t:'Liminar em tutela de evidência só nos incisos II e III do art. 311. Nos incisos I e IV é preciso ouvir a parte contrária.', alerta:true },
    { t:'Da decisão sobre tutela provisória cabe agravo de instrumento (art. 1.015, I) — deferindo ou indeferindo. Isso significa que a fundamentação será lida pelo tribunal.', alerta:true }
  ],
  especiais: [
    { t:'Tutela contra a Fazenda Pública', d:'Permanecem as vedações das Leis 8.437/92 e 9.494/97 quanto a reclassificação, aumento de vencimentos, pagamento de vantagens e liberação de bens do exterior. Concedida a liminar, cabe pedido de suspensão ao presidente do tribunal, por grave lesão à ordem, à saúde, à segurança e à economia públicas.' },
    { t:'Saúde e fornecimento de medicamento', d:'Ponderação com a reserva do possível e o mínimo existencial. Registre a prescrição médica, a evidência científica e a imprescindibilidade, e considere a solidariedade dos entes federativos — a decisão precisa dizer contra quem se dirige o comando.' },
    { t:'Estabilização e coisa julgada', d:'A tutela estabilizada NÃO faz coisa julgada material (art. 304, § 6º). Ela se torna imutável apenas depois dos dois anos do § 5º, e nesse prazo qualquer das partes pode discutir o direito em ação própria.' },
    { t:'Tutela em recurso', d:'No agravo de instrumento, o pedido ao relator é de efeito suspensivo (para paralisar decisão que concedeu) ou de antecipação da tutela recursal (para conceder o que o juiz negou) — art. 1.019, I. Pedir suspensivo contra uma negativa não devolve nada.' }
  ]
},

// ─────────────────────────────────────────────────────────────────────────────
'Decisão de prisão preventiva': {
  rito: 'Penal — prisões e cautelares',
  freq: 26,   // vezes em que o tema aparece nas 648 provas de discursivas.js
  carreiras: ['Magistratura'],
  sobre: 'Depois da Lei 13.964/2019 o juiz não decreta preventiva de ofício, e a fundamentação passou a ter exigências escritas na lei. A Lei 15.272/2025 acrescentou critérios de aferição da periculosidade e reforçou a vedação à gravidade abstrata. A banca cobra três andares: provocação, requisitos do art. 312 e admissibilidade do art. 313 — mais a revisão periódica.',
  blocos: [
    { nome: 'Verificar a provocação',
      deve: 'Registrar quem pediu. Sem requerimento ou representação não há preventiva — nem na conversão do flagrante.',
      itens: [
        { t:'Legitimados', d:'Ministério Público, querelante, assistente de acusação, ou representação da autoridade policial.' },
        { t:'Na custódia', d:'a conversão do flagrante em preventiva também depende de provocação; o juiz não converte de ofício.' },
        { t:'Contraditório', d:'ouvida a defesa sempre que possível — a decisão em audiência de custódia já assegura isso.' },
        { t:'Descumprimento de cautelar', d:'descumprida medida diversa, a substituição por prisão também exige requerimento.' }
      ],
      lei: ['Vedação à decretação de ofício — CPP, art. 311',
            'Audiência de custódia e conversão — CPP, art. 310, II',
            'Substituição por descumprimento — CPP, art. 282, § 4º'],
      juris: [],
      modelo: 'Vistos.\n\nTrata-se de representação da autoridade policial (ou requerimento do Ministério Público) pela decretação da prisão preventiva de FULANO DE TAL, nos autos do inquérito policial nº ... .\n\nO Ministério Público manifestou-se favoravelmente à fl. ... . A defesa foi ouvida em audiência de custódia realizada nesta data.\n\nDecido.',
      erro: 'Converter flagrante em preventiva de ofício. É o erro mais cobrado desde 2020 e derruba a decisão inteira.' },
    { nome: 'Fumus commissi delicti',
      deve: 'Apontar a prova da materialidade e o indício suficiente de autoria, indicando as peças concretas que os sustentam.',
      itens: [
        { t:'Prova da materialidade', d:'auto de prisão, laudo, auto de apreensão, boletim de ocorrência com elementos — diga qual peça e a folha.' },
        { t:'Indício suficiente de autoria', d:'não é certeza, mas exige elemento concreto: reconhecimento, apreensão em poder do agente, depoimento.' },
        { t:'Individualização', d:'havendo vários investigados, o indício tem de ser apontado para cada um.' },
        { t:'Excludente evidente', d:'havendo prova de excludente de ilicitude, a preventiva não se decreta.' }
      ],
      lei: ['Prova da materialidade e indício de autoria — CPP, art. 312, caput',
            'Vedação da preventiva havendo excludente — CPP, art. 314'],
      juris: [],
      modelo: 'O FUMUS COMMISSI DELICTI está presente. A materialidade decorre do auto de apreensão de fl. ... e do laudo preliminar de fl. ..., que atestam ... .\n\nOs indícios suficientes de autoria emergem do depoimento da vítima (fl. ...), que reconheceu o investigado, e da apreensão, em seu poder, de ... (fl. ...).',
      erro: 'Afirmar que "há indícios" sem dizer quais. Fundamentação por referência genérica é nula — art. 315, § 2º, III.' },
    { nome: 'Periculum libertatis com fato concreto',
      deve: 'Demonstrar o perigo gerado pelo estado de liberdade, com base em fatos novos ou contemporâneos. Desde a Lei 15.272/2025 há critérios legais expressos para aferir a periculosidade.',
      itens: [
        { t:'Os quatro fundamentos', d:'garantia da ordem pública, da ordem econômica, conveniência da instrução criminal e asseguração da aplicação da lei penal.' },
        { t:'Perigo gerado pela liberdade', d:'o § 2º exige que a decisão indique o perigo concreto — não a hipótese teórica.' },
        { t:'Aferição da periculosidade', d:'a lei de 2025 lista critérios: modus operandi, uso reiterado de violência ou premeditação, participação em organização criminosa, natureza e quantidade de drogas, armas ou munições, e fundado receio de reiteração.' },
        { t:'Vedação expressa', d:'a mesma lei veda decretar a preventiva com base na gravidade abstrata do delito, exigindo demonstração concreta.' },
        { t:'Contemporaneidade', d:'fatos novos ou contemporâneos justificam a aplicação da medida — perigo de anos atrás não sustenta prisão de hoje.' }
      ],
      lei: ['Fundamentos da preventiva — CPP, art. 312, caput',
            'Perigo gerado pelo estado de liberdade — CPP, art. 312, § 2º',
            'Critérios de aferição da periculosidade — CPP, art. 312, § 3º (incluído pela Lei 15.272/2025)',
            'Vedação à gravidade abstrata — CPP, art. 312, § 4º (incluído pela Lei 15.272/2025)',
            'Motivação com fatos novos ou contemporâneos — CPP, art. 315, § 1º',
            'Circunstâncias que recomendam a conversão — CPP, art. 310, §§ 5º e 6º (incluídos pela Lei 15.272/2025)'],
      juris: [],
      modelo: 'O PERICULUM LIBERTATIS igualmente se verifica, na modalidade de garantia da ordem pública.\n\nNão se trata de invocar a gravidade abstrata do delito, expressamente vedada pelo art. 312, § 4º, do Código de Processo Penal. O risco concreto decorre do modus operandi empregado — o investigado agiu ... —, da apreensão de ... e do fundado receio de reiteração, evidenciado por ..., circunstâncias que o art. 312, § 3º, do CPP indica como critérios de aferição da periculosidade.\n\nOs fatos são contemporâneos: ocorreram em .../.../..., há menos de ... dias, o que atende à exigência do art. 315, § 1º, do Código de Processo Penal.',
      erro: 'Sustentar a prisão na gravidade abstrata do crime ou no clamor social. O § 4º do art. 312 hoje veda a primeira em texto expresso, e o art. 315, § 2º, lista as seis fórmulas que não valem como fundamentação.' },
    { nome: 'Admissibilidade do art. 313',
      deve: 'Enquadrar o caso em uma das hipóteses de admissibilidade. Presença dos requisitos do art. 312 sem hipótese do art. 313 não autoriza a prisão.',
      itens: [
        { t:'Inciso I', d:'crime doloso punido com pena privativa de liberdade máxima superior a 4 anos.' },
        { t:'Inciso II', d:'reincidência em crime doloso, observado o prazo depurador de 5 anos.' },
        { t:'Inciso III', d:'crime que envolva violência doméstica e familiar, para garantir a execução das medidas protetivas de urgência.' },
        { t:'Parágrafo único', d:'dúvida sobre a identidade civil ou falta de elementos para esclarecê-la, com soltura imediata após a identificação.' },
        { t:'Descumprimento de cautelar', d:'hipótese autônoma do art. 282, § 4º, independentemente do quantum da pena.' }
      ],
      lei: ['Hipóteses de admissibilidade — CPP, art. 313, I a III',
            'Dúvida sobre a identidade civil — CPP, art. 313, parágrafo único',
            'Descumprimento de medida cautelar anterior — CPP, art. 282, § 4º',
            'Reincidência e prazo depurador — CP, arts. 63 e 64'],
      juris: [],
      modelo: 'A hipótese é admissível na forma do art. 313, I, do Código de Processo Penal, uma vez que o crime imputado — art. ... do Código Penal — é doloso e punido com pena privativa de liberdade máxima superior a 4 (quatro) anos.',
      erro: 'Decretar preventiva por crime com pena máxima igual ou inferior a 4 anos fora das exceções do art. 313. Requisito e admissibilidade são coisas distintas, e a banca separa as duas.' },
    { nome: 'Esgotar as cautelares diversas',
      deve: 'Justificar por que as medidas diversas da prisão são inadequadas ou insuficientes no caso. A prisão é a última opção, não a primeira.',
      itens: [
        { t:'Necessidade e adequação', d:'os dois critérios do art. 282, I e II — necessidade para o processo, adequação à gravidade, às circunstâncias e às condições pessoais.' },
        { t:'Rol do art. 319', d:'comparecimento periódico, proibição de acesso a lugares, proibição de contato, recolhimento domiciliar noturno, monitoração eletrônica, fiança, entre outras.' },
        { t:'Análise concreta', d:'diga por que cada uma das cabíveis não serve. "Insuficientes" sem explicação é fórmula vazia.' },
        { t:'Prisão domiciliar', d:'examinar as hipóteses do art. 318 e a substituição do art. 318-A para gestante e mãe ou pai de criança.' }
      ],
      lei: ['Necessidade e adequação — CPP, art. 282, I e II',
            'Subsidiariedade da prisão — CPP, art. 282, § 6º',
            'Rol de cautelares diversas — CPP, art. 319',
            'Prisão domiciliar — CPP, arts. 317, 318 e 318-A',
            'O que não é fundamentação — CPP, art. 315, § 2º'],
      juris: [],
      modelo: 'Examino, por fim, a suficiência das medidas cautelares diversas da prisão (art. 282, § 6º, do CPP).\n\nO comparecimento periódico em juízo e a proibição de ausentar-se da comarca não são idôneos a conter o risco de reiteração demonstrado, dado que ... . A monitoração eletrônica, por sua vez, mostra-se insuficiente porque ... . A proibição de contato com a vítima já foi descumprida, conforme certidão de fl. ... .\n\nNão é caso de prisão domiciliar, uma vez que não se verifica nenhuma das hipóteses do art. 318 do Código de Processo Penal.\n\nAssim, nenhuma medida menos gravosa se revela adequada e suficiente.',
      erro: 'Não dizer uma palavra sobre monitoração, comparecimento periódico ou proibição de contato. O § 6º exige justificativa expressa da insuficiência.' },
    { nome: 'Dispositivo, revisão e comunicações',
      deve: 'Decretar, consignar a revisão periódica de 90 dias e determinar mandado e comunicações. E lembrar que a revogação é dever quando cessar o motivo.',
      itens: [
        { t:'Revisão em 90 dias', d:'de ofício, mediante decisão fundamentada, sob pena de a prisão se tornar ilegal — mas o descumprimento não gera soltura automática.' },
        { t:'Revogação', d:'dever do juiz quando cessar o motivo, e nova decretação é possível se sobrevierem razões.' },
        { t:'Duração razoável', d:'o excesso de prazo é aferido pela razoabilidade e pela complexidade, não por soma aritmética.' },
        { t:'Providências', d:'mandado de prisão, cadastro no banco nacional, comunicação à família e ao advogado, e ao juízo da execução se houver outra pena.' }
      ],
      lei: ['Revogação quando cessar o motivo — CPP, art. 316, caput',
            'Revisão a cada 90 dias — CPP, art. 316, parágrafo único',
            'Comunicação da prisão — CPP, art. 306',
            'Mandado de prisão e banco nacional — CPP, arts. 289-A e 285'],
      juris: [],
      modelo: 'Ante o exposto, DEFIRO a representação e DECRETO A PRISÃO PREVENTIVA de FULANO DE TAL, qualificado nos autos, com fundamento nos arts. 311, 312 e 313, I, do Código de Processo Penal.\n\nExpeça-se mandado de prisão, com registro no Banco Nacional de Mandados de Prisão (art. 289-A do CPP).\n\nCONSIGNO que a necessidade da manutenção desta prisão será revista de ofício, mediante decisão fundamentada, a cada 90 (noventa) dias, nos termos do art. 316, parágrafo único, do Código de Processo Penal.\n\nComunique-se à família do preso e à pessoa por ele indicada, bem como à Defensoria Pública, se não houver advogado constituído (art. 306 do CPP).\n\nCiência ao Ministério Público. Intimem-se.\n\nLocal, data.\nJuiz de Direito',
      erro: 'Omitir a revisão periódica. É item de espelho e, na prática, gera pedido de relaxamento com base no art. 316, parágrafo único.' }
  ],
  cego: ['Requerimento ou representação registrado (nunca de ofício)',
    'Manifestação do MP e oitiva da defesa consignadas',
    'Materialidade apontada com a peça que a comprova',
    'Indício suficiente de autoria individualizado por investigado',
    'Ausência de excludente evidente verificada (art. 314)',
    'Fundamento do art. 312 escolhido e demonstrado com fato concreto',
    'Critérios de periculosidade do § 3º examinados',
    'Gravidade abstrata expressamente afastada (§ 4º)',
    'Contemporaneidade do perigo justificada',
    'Hipótese de admissibilidade do art. 313 indicada',
    'Cautelares diversas do art. 319 afastadas uma a uma',
    'Prisão domiciliar examinada (arts. 318 e 318-A)',
    'Revisão em 90 dias consignada',
    'Mandado, banco nacional e comunicações determinados'],
  dicas: [
    'Escreva em três andares numerados: provocação, requisitos do art. 312, admissibilidade do art. 313. O corretor procura os três, e a numeração entrega.',
    'Requisito e admissibilidade não são a mesma coisa. Pode haver fumus e periculum e ainda assim não caber preventiva, por faltar hipótese do art. 313.',
    'O art. 315, § 2º lista seis fórmulas que NÃO são fundamentação. Leia esse parágrafo como uma lista de coisas a não escrever.',
    'Contemporaneidade é data. Diga quando o fato ocorreu e quantos dias se passaram.',
    'Havendo vários investigados, individualize. Decisão em bloco é nula quanto a quem não teve a conduta apontada.',
    { t:'A Lei 15.272/2025 incluiu os §§ 3º e 4º no art. 312: o § 3º lista os critérios de aferição da periculosidade e o § 4º veda expressamente a preventiva fundada na gravidade abstrata. Usar os critérios do § 3º pelo nome joga a favor da fundamentação.', alerta:true },
    { t:'A mesma lei incluiu os §§ 5º e 6º no art. 310, com circunstâncias que recomendam a conversão do flagrante e o dever de o juiz examiná-las expressamente. Em decisão de custódia, percorra essa lista.', alerta:true },
    { t:'Nunca de ofício — nem na conversão do flagrante. O art. 311 é categórico desde a Lei 13.964/2019, e é o erro que mais anula decisão em prova.', alerta:true }
  ],
  especiais: [
    { t:'Violência doméstica', d:'A preventiva é admissível pelo art. 313, III, independentemente do quantum da pena, para garantir a execução das medidas protetivas. A Lei 11.340/2006 prevê a decretação em qualquer fase (art. 20) e o descumprimento de medida protetiva é crime autônomo do art. 24-A.' },
    { t:'Gestante e mãe de criança', d:'O art. 318, IV e V, e o art. 318-A tratam da substituição por prisão domiciliar para gestante e para mulher com filho de até 12 anos incompletos, com as ressalvas dos incisos I e II. A decisão precisa enfrentar essa hipótese quando os autos revelarem a condição.' },
    { t:'Prisão temporária', d:'Não se confunde com a preventiva. Rege-se pela Lei 7.960/89, exige um dos incisos do art. 1º combinado com o rol de crimes do inciso III, dura 5 dias prorrogáveis por 5 (30 + 30 nos hediondos), e é cabível apenas na fase de investigação.' },
    { t:'Revisão dos 90 dias', d:'A falta de revisão no prazo não gera soltura automática. O STF entendeu que o descumprimento do art. 316, parágrafo único, não torna a prisão ilegal por si só, cabendo ao juízo competente sanar a omissão — mas a omissão continua sendo item perdido no espelho.' },
    { t:'Excesso de prazo', d:'Aferido pela razoabilidade, não por soma aritmética de prazos. Súmula 21 do STJ: pronunciado o réu, fica superada a alegação de constrangimento por excesso de prazo na instrução. Súmula 52: encerrada a instrução, fica superada a alegação de excesso.' }
  ]
},

// ─────────────────────────────────────────────────────────────────────────────
'Decisão de pronúncia': {
  rito: 'Penal — tribunal do júri',
  freq: 16,   // vezes em que o tema aparece nas 648 provas de discursivas.js
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
  freq: 11,   // vezes em que o tema aparece nas 648 provas de discursivas.js
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
 "rito": "Penal — procedimento comum",
 "freq": 37,
 "carreiras": [
  "Ministério Público",
  "Magistratura"
 ],
 "sobre": "A denúncia é medida de garantia: é a partir dela que o acusado sabe do que se defende. O espelho cobra a descrição do fato com todas as circunstâncias, a individualização das condutas e — item que a maioria esquece — a manifestação sobre o acordo de não persecução penal.",
 "blocos": [
  {
   "nome": "Endereçamento, prazo e qualificação",
   "deve": "Endereçar ao juízo competente, demonstrar o prazo e qualificar o acusado — ou fornecer os elementos que permitam identificá-lo.",
   "itens": [
    {
     "t": "Competência",
     "d": "em regra o lugar da consumação (CPP, art. 70, teoria do resultado); na tentativa, o lugar do último ato de execução. Atenção ao § 4º do art. 70, incluído pela Lei 14.155/2021: no estelionato por depósito, cheque sem fundo, pagamento frustrado ou transferência de valores, a competência é do domicílio da vítima."
    },
    {
     "t": "Infração continuada ou permanente em duas comarcas",
     "d": "a competência é firmada por prevenção (CPP, art. 71) — que é dispositivo processual, e não o crime continuado do art. 71 do Código Penal."
    },
    {
     "t": "Prazo",
     "d": "cinco dias com investigado preso e quinze dias solto, contados do recebimento dos autos do inquérito pelo Ministério Público (CPP, art. 46). O § 1º cuida do termo inicial quando o inquérito é dispensado. Prazos especiais existem em leis próprias — por exemplo, dez dias na Lei 11.343/2006, art. 54, III."
    },
    {
     "t": "Qualificação",
     "d": "nome e demais dados; não os tendo, os esclarecimentos pelos quais se possa identificar o acusado (CPP, art. 41)."
    }
   ],
   "lei": [
    "Requisitos da denúncia — CPP, art. 41",
    "Prazo para denunciar — CPP, art. 46",
    "Competência pelo lugar da infração — CPP, art. 70",
    "Estelionato: domicílio da vítima — CPP, art. 70, § 4º",
    "Prevenção em infração continuada ou permanente — CPP, art. 71"
   ],
   "juris": [],
   "modelo": "Excelentíssimo Senhor Doutor Juiz de Direito da ... Vara Criminal da Comarca de ...\n\nInquérito Policial nº ...\n\nO MINISTÉRIO PÚBLICO DO ESTADO DE ..., por seu Promotor de Justiça, no uso de suas atribuições e com fundamento no art. 129, I, da Constituição da República, vem oferecer DENÚNCIA em face de\n\nFULANO DE TAL, brasileiro, solteiro, pedreiro, nascido em .../.../..., filho de ... e de ..., RG nº ..., CPF nº ..., residente em ...,\n\npela prática do fato criminoso a seguir descrito.",
   "erro": "Denunciar sem qualificação e sem os elementos de identificação, o que inviabiliza a citação — e sem uma linha sobre a competência, que costuma ser o primeiro item do espelho."
  },
  {
   "nome": "Exposição do fato com todas as circunstâncias",
   "deve": "Narrar o fato criminoso de modo que a defesa saiba exatamente o que responder: quem, o quê, quando, onde, como e com que resultado.",
   "itens": [
    {
     "t": "Elementares e circunstâncias",
     "d": "todas as elementares do tipo precisam aparecer descritas no fato, não apenas na capitulação. Qualificadoras, causas de aumento e agravantes só podem ser reconhecidas na sentença se estiverem narradas."
    },
    {
     "t": "Tempo e lugar",
     "d": "data (ou período, nos permanentes e continuados) e local exatos — de que dependem prescrição, competência e, em alguns tipos, a própria elementar."
    },
    {
     "t": "Nexo causal e resultado",
     "d": "a ligação entre a conduta e o resultado, com o suporte probatório indicado."
    },
    {
     "t": "Dolo e finalidade especial",
     "d": "quando o tipo exige elemento subjetivo especial, ele tem de estar narrado como fato, e não afirmado como conclusão."
    },
    {
     "t": "Inépcia",
     "d": "narrativa que apenas repete a fórmula do tipo penal é inepta e leva à rejeição (CPP, art. 395, I)."
    }
   ],
   "lei": [
    "Exposição do fato criminoso — CPP, art. 41",
    "Rejeição por inépcia — CPP, art. 395, I",
    "Emendatio libelli — CPP, art. 383",
    "Mutatio libelli — CPP, art. 384"
   ],
   "juris": [
    "Mutatio libelli não se aplica em segunda instância — Súmula 453 do STF"
   ],
   "modelo": "No dia .../.../..., por volta das ...h, na Rua ..., nº ..., no Bairro ..., nesta Comarca, o denunciado, agindo com vontade livre e consciente e com o fim de ..., subtraiu para si ..., mediante grave ameaça exercida com emprego de arma de fogo, consistente em ... .\n\nApurou-se que ... (indicação dos elementos de informação: auto de prisão em flagrante de fl. ..., laudo pericial de fl. ..., depoimento de fl. ...).",
   "erro": "Narrar em termos genéricos e deixar a qualificadora só na capitulação. O que não foi narrado não pode ser reconhecido na sentença — e o espelho pontua a narrativa, não a etiqueta."
  },
  {
   "nome": "Individualização das condutas no concurso de agentes",
   "deve": "Havendo mais de um acusado, descrever o que cada um fez e o liame subjetivo entre eles.",
   "itens": [
    {
     "t": "Regra do concurso",
     "d": "quem concorre para o crime incide nas penas a ele cominadas, na medida de sua culpabilidade (CP, art. 29). A participação de menor importância reduz de um sexto a um terço (§ 1º) e a cooperação dolosamente distinta segue o § 2º."
    },
    {
     "t": "Denúncia geral × denúncia genérica",
     "d": "a distinção é doutrinária, mas corresponde ao que os tribunais aplicam: admite-se a denúncia que, em crime societário ou de autoria coletiva, não pormenoriza a conduta de cada agente, desde que estabeleça o vínculo mínimo entre o acusado e o fato. É inepta a que imputa o crime pela simples condição de sócio, diretor ou administrador."
    },
    {
     "t": "Não há súmula sobre o tema",
     "d": "nem no STF nem no STJ. A tese se sustenta em precedentes ordinários — no STJ, por exemplo, a 5ª Turma reafirmou a inépcia quando ausente o vínculo entre o cargo e o crime (AgRg no AgRg no REsp 2.038.919/PR, Rel. Min. Joel Ilan Paciornik, 2023). Não invente número de súmula aqui."
    },
    {
     "t": "Autoria e domínio do fato",
     "d": "a teoria do domínio do fato não substitui a prova da conduta: não se presume a autoria pela posição hierárquica."
    }
   ],
   "lei": [
    "Concurso de pessoas — CP, art. 29",
    "Participação de menor importância — CP, art. 29, § 1º",
    "Cooperação dolosamente distinta — CP, art. 29, § 2º",
    "Exposição do fato — CPP, art. 41"
   ],
   "juris": [
    "Inépcia por ausência de vínculo entre o cargo e o fato — STJ, 5ª Turma, AgRg no AgRg no REsp 2.038.919/PR, Rel. Min. Joel Ilan Paciornik, 2023"
   ],
   "erro": "Denúncia genérica em crime societário, imputando a todos os sócios pela simples condição de sócio. É a hipótese clássica de trancamento por inépcia."
  },
  {
   "nome": "Justa causa, classificação e concurso",
   "deve": "Apontar o suporte probatório mínimo e classificar corretamente o crime, inclusive concurso e causas de aumento.",
   "itens": [
    {
     "t": "Justa causa",
     "d": "indicar os elementos de informação que sustentam materialidade e indícios de autoria. Faltando, a denúncia é rejeitada (CPP, art. 395, III)."
    },
    {
     "t": "Arquivamento anterior",
     "d": "se o inquérito havia sido arquivado, a ação penal só pode ser iniciada com prova nova (Súmula 524 do STF). Cuidado com a premissa do enunciado: ele fala em arquivamento \"por despacho do juiz\", o que não corresponde ao art. 28 na redação da Lei 13.964/2019 — o arquivamento é hoje ato do Ministério Público, submetido a controle. O núcleo da súmula (exigência de prova nova) permanece."
    },
    {
     "t": "Classificação",
     "d": "o dispositivo, o concurso (CP, arts. 69 a 71) e as causas de aumento. A classificação errada não invalida a denúncia — o juiz aplica o art. 383 (emendatio libelli) —, mas o espelho pontua a capitulação correta."
    },
    {
     "t": "Rejeição × absolvição sumária",
     "d": "a rejeição do art. 395 é juízo de admissibilidade, sem mérito; a absolvição sumária do art. 397 é decisão de mérito, com coisa julgada material, salvo a extinção da punibilidade do inciso IV. Note a ressalva do inciso II: a inimputabilidade não leva à absolvição sumária, porque pode conduzir à medida de segurança."
    }
   ],
   "lei": [
    "Justa causa — CPP, art. 395, III",
    "Rejeição da denúncia — CPP, art. 395",
    "Absolvição sumária — CPP, art. 397",
    "Concurso de crimes — CP, arts. 69 a 71",
    "Arquivamento pelo Ministério Público — CPP, art. 28"
   ],
   "juris": [
    "Prova nova para desarquivar — Súmula 524 do STF",
    "Art. 28 do CPP e juiz das garantias: mérito julgado — STF, Plenário, ADIs 6298, 6299, 6300 e 6305, Rel. Min. Luiz Fux, 24/08/2023"
   ],
   "erro": "Denunciar com base em inquérito que não indica autoria. Sem justa causa a peça é rejeitada, e a rejeição por esse fundamento vale ponto negativo dobrado quando o enunciado plantou a ausência de prova."
  },
  {
   "nome": "Acordo de não persecução penal — a manifestação obrigatória",
   "deve": "Antes de fechar, dizer expressamente se o caso comporta ou não o acordo do art. 28-A — e por quê.",
   "itens": [
    {
     "t": "Cabimento",
     "d": "infração sem violência ou grave ameaça, pena mínima inferior a quatro anos (consideradas causas de aumento e diminuição, § 1º), confissão formal e circunstanciada, e o acordo sendo necessário e suficiente para reprovação e prevenção."
    },
    {
     "t": "Condições",
     "d": "os incisos I a V do art. 28-A: reparar o dano ou restituir a coisa, renunciar a bens e direitos indicados como instrumentos ou proveito, prestar serviço à comunidade, pagar prestação pecuniária e cumprir outra condição indicada pelo Ministério Público."
    },
    {
     "t": "Vedações",
     "d": "os quatro incisos do § 2º: cabimento de transação penal; reincidência ou conduta criminal habitual, salvo infrações penais pretéritas insignificantes; benefício nos cinco anos anteriores; crime praticado no âmbito de violência doméstica ou familiar, ou contra a mulher por razões da condição do sexo feminino."
    },
    {
     "t": "Processos em curso",
     "d": "o STF decidiu que o acordo é cabível em processos que estavam em andamento quando a Lei 13.964/2019 entrou em vigor, mesmo sem confissão até então, desde que o pedido seja anterior ao trânsito em julgado (Plenário, HC 185.913, 18/09/2024). O STJ alinhou-se no Tema Repetitivo 1098. Não é matéria de repercussão geral — não a chame de tema do STF."
    },
    {
     "t": "Na prova",
     "d": "quando o caso não comporta o acordo, diga o inciso que o veda. Silêncio sobre o ANPP é item perdido em praticamente todo espelho recente de MP."
    }
   ],
   "lei": [
    "Acordo de não persecução penal — CPP, art. 28-A",
    "Vedações — CPP, art. 28-A, § 2º",
    "Condições — CPP, art. 28-A, I a V"
   ],
   "juris": [
    "Retroatividade do ANPP a processos em curso — STF, Plenário, HC 185.913, 18/09/2024",
    "Alinhamento do STJ — Tema Repetitivo 1098, REsp 1.890.344/RS, 3ª Seção, Rel. Min. Reynaldo Soares da Fonseca, 23/10/2024"
   ],
   "modelo": "Deixa-se de propor o acordo de não persecução penal porque o crime foi praticado mediante grave ameaça à pessoa, o que afasta o cabimento na forma do caput do art. 28-A do Código de Processo Penal.\n\n— ou —\n\nPropõe-se, desde logo, o acordo de não persecução penal, nos termos do art. 28-A do Código de Processo Penal, mediante as seguintes condições: ... , designando-se audiência para homologação (§ 4º).",
   "erro": "Não dizer nada sobre o ANPP. A manifestação é obrigatória e o examinador reserva item para ela."
  },
  {
   "nome": "Requerimentos finais e cautelares",
   "deve": "Fechar com recebimento, citação, rol de testemunhas e, se for o caso, as medidas cautelares — cada uma com fundamento próprio.",
   "itens": [
    {
     "t": "Recebimento e citação",
     "d": "requerer o recebimento e a citação do denunciado para responder por escrito em dez dias (CPP, arts. 396 e 396-A)."
    },
    {
     "t": "Rol de testemunhas",
     "d": "apresentado com a denúncia, sob pena de preclusão da prova oral da acusação (CPP, art. 41)."
    },
    {
     "t": "Cautelares diversas da prisão",
     "d": "as do art. 319, aplicadas na forma do art. 282 — necessidade e adequação, sempre motivadas."
    },
    {
     "t": "Prisão preventiva",
     "d": "requerida com os pressupostos do art. 312, e não pela gravidade abstrata. A Lei 15.272/2025 acrescentou ao art. 312 o § 3º, que lista os fatores de aferição da periculosidade geradora de risco à ordem pública (modus operandi, participação em organização criminosa, natureza e quantidade de drogas, armas ou munições, e fundado receio de reiteração), e o § 4º, que veda expressamente a preventiva fundada na gravidade abstrata do delito."
    },
    {
     "t": "Vítima",
     "d": "requerer a fixação de valor mínimo de reparação (CPP, art. 387, IV) exige pedido expresso na denúncia — sem ele, a sentença não pode fixá-lo."
    }
   ],
   "lei": [
    "Recebimento e citação — CPP, arts. 396 e 396-A",
    "Medidas cautelares — CPP, arts. 282 e 319",
    "Prisão preventiva — CPP, art. 312",
    "Periculosidade e vedação da gravidade abstrata — CPP, art. 312, §§ 3º e 4º (Lei 15.272/2025)",
    "Valor mínimo de reparação — CPP, art. 387, IV"
   ],
   "juris": [],
   "modelo": "Requer, ao final:\na) o recebimento da denúncia e a citação do denunciado para responder à acusação, no prazo de 10 (dez) dias (arts. 396 e 396-A do CPP);\nb) a oitiva das testemunhas abaixo arroladas;\nc) a decretação da prisão preventiva, nos termos dos arts. 312 e 313, I, do CPP, pelas razões concretas expostas;\nd) ao final, a procedência da pretensão punitiva, com a condenação nas penas do art. ..., e a fixação do valor mínimo de reparação dos danos, na forma do art. 387, IV, do CPP.\n\nRol de testemunhas: 1) ...; 2) ...; 3) ... .",
   "erro": "Esquecer o rol de testemunhas e o pedido do art. 387, IV. São dois itens que não custam raciocínio nenhum e caem em quase todo espelho."
  }
 ],
 "cego": [
  "Endereçamento ao juízo competente, com a regra de competência dita",
  "Tempestividade pelo art. 46 (5 dias preso / 15 solto)",
  "Acusado qualificado ou identificável",
  "Fato narrado com tempo, lugar, modo e resultado",
  "Todas as elementares e circunstâncias descritas como fato",
  "Condutas individualizadas no concurso de agentes",
  "Liame subjetivo apontado",
  "Elementos de informação indicados (justa causa)",
  "Classificação legal completa, com concurso e majorantes",
  "Manifestação expressa sobre o ANPP (cabimento ou vedação)",
  "Rol de testemunhas apresentado",
  "Cautelares requeridas com fundamento concreto, se cabíveis",
  "Pedido de valor mínimo de reparação (art. 387, IV)"
 ],
 "dicas": [
  {
   "t": "Sétima peça mais cobrada do banco de provas aplicadas: 37 ocorrências, concentradas em MP.",
   "alerta": false
  },
  "Escreva o fato antes da capitulação. Quem começa pela etiqueta acaba narrando o tipo em vez do fato — e é isso que caracteriza a inépcia do art. 395, I.",
  {
   "t": "A manifestação sobre o acordo de não persecução penal é obrigatória e é o item mais esquecido da denúncia. Cabendo ou não, diga por quê.",
   "alerta": true
  },
  {
   "t": "Desde a Lei 15.272/2025, o art. 312 do CPP tem § 3º (fatores de periculosidade) e § 4º (veda a preventiva por gravidade abstrata). Pedir preventiva pela gravidade do crime, em abstrato, virou erro com dispositivo expresso contra.",
   "alerta": true
  },
  "O art. 71 do CPP é prevenção em infração continuada ou permanente; o art. 71 do CP é crime continuado. Trocar um pelo outro é erro que o examinador lê de longe.",
  "A Súmula 524 do STF continua válida no núcleo (prova nova para desarquivar), mas a premissa do arquivamento judicial não corresponde ao art. 28 vigente — cite-a com essa ressalva.",
  "Na Lei Maria da Penha a retratação da representação vai até o recebimento da denúncia, em audiência específica (Lei 11.340/2006, art. 16) — regra especial diante do art. 25 do CPP."
 ],
 "especiais": [
  {
   "t": "Denúncia em crime de tráfico",
   "d": "Prazo de dez dias (Lei 11.343/2006, art. 54, III), procedimento especial com defesa prévia em dez dias antes do recebimento (art. 55) e atenção à causa de diminuição do art. 33, § 4º, cuja aplicação depende de primariedade, bons antecedentes e não dedicação a atividades criminosas nem integração de organização criminosa."
  },
  {
   "t": "Denúncia em crime doloso contra a vida",
   "d": "Rito do júri: a peça pede a pronúncia (CPP, art. 413), e não a condenação. O ANPP é incabível por haver violência. Descreva as qualificadoras uma a uma — a que não for narrada não pode ir a plenário."
  },
  {
   "t": "Denúncia contra pessoa jurídica em crime ambiental",
   "d": "Lei 9.605/1998, art. 3º: a responsabilização da pessoa jurídica não exclui a das pessoas físicas. O STF abandonou a exigência de dupla imputação — a denúncia pode ser oferecida só contra a pessoa jurídica."
  },
  {
   "t": "Denúncia em violência doméstica",
   "d": "ANPP vedado pelo art. 28-A, § 2º, IV. Atenção às medidas protetivas de urgência (Lei 11.340/2006, arts. 22 a 24) e ao crime autônomo de descumprimento (art. 24-A)."
  },
  {
   "t": "Aditamento",
   "d": "Aditamento próprio (inclui fato ou acusado novo) e impróprio (corrige a peça). Havendo prova de elementar não contida na denúncia, o caminho é a mutatio libelli do art. 384, com aditamento em cinco dias — e ela não se aplica em segunda instância (Súmula 453 do STF)."
  }
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
  freq: 6,   // vezes em que o tema aparece nas 648 provas de discursivas.js
  carreiras: ['Magistratura'],
  sobre: 'A sentença que o juiz-presidente lê em plenário depois do veredicto. Aqui o juiz NÃO julga o mérito — ele executa o que os jurados decidiram. O que é dele: dosar a pena, fixar o regime e resolver a prisão. A banca mede exatamente isso: até onde vai a soberania dos veredictos e onde começa a jurisdição do presidente.',
  blocos: [
    { nome: 'Ler o veredicto antes de escrever',
      deve: 'A sentença tem de ser congruente com as respostas aos quesitos. Antes de redigir, releia a ordem votada e o que ficou registrado em ata — inclusive tese de clemência sustentada pela defesa.',
      itens: [
        { t:'Ordem votada', d:'materialidade, autoria ou participação, quesito genérico de absolvição, causa de diminuição, qualificadora e causa de aumento — nessa sequência.' },
        { t:'Quesito genérico', d:'redação obrigatória: "O jurado absolve o acusado?". Respondido sim, a absolvição não se fundamenta.' },
        { t:'Ata da sessão', d:'registra as teses sustentadas, os incidentes e os protestos. Tese de clemência lançada em ata muda o cabimento do novo júri.' },
        { t:'Maioria basta', d:'apurados mais de três votos num sentido, a votação daquele quesito se encerra, para preservar o sigilo.' }
      ],
      lei: ['Ordem dos quesitos — CPP, art. 483',
            'Quesito genérico de absolvição — CPP, art. 483, III e § 2º',
            'Formulação e votação dos quesitos — CPP, arts. 482 a 491'],
      juris: ['Apelação contra absolvição pelo quesito genérico — STF, ARE 1.225.185, Tema 1087, tese fixada em 03/10/2024 (red. p/ acórdão Min. Edson Fachin)',
              'Clemência registrada em ata impede novo júri, desde que compatível com a Constituição, com os precedentes vinculantes do STF e com as circunstâncias fáticas dos autos — STF, ARE 1.225.185, Tema 1087, 2ª parte da tese'],
      modelo: 'O Conselho de Sentença, respondendo aos quesitos que lhe foram formulados, reconheceu a materialidade do fato e a autoria atribuída ao acusado, negou a absolvição, e reconheceu a qualificadora prevista no art. 121, § 2º, ..., do Código Penal, na forma da ata de julgamento.\n\nEm obediência à soberania dos veredictos (art. 5º, XXXVIII, "c", da Constituição), passo a proferir a sentença em conformidade com a decisão dos jurados, nos termos do art. 492 do Código de Processo Penal.',
      erro: 'Fundamentar a absolvição. Absolvido pelo quesito genérico, o juiz registra o resultado e ponto — explicar o porquê invade a soberania dos veredictos (CF, art. 5º, XXXVIII, "c").' },
    { nome: 'Absolvição: dispositivo e efeitos imediatos',
      deve: 'Absolvido o réu, a sentença manda colocá-lo em liberdade se por outro motivo não estiver preso, revoga as medidas restritivas provisoriamente decretadas e, quando a absolvição for imprópria, aplica medida de segurança.',
      itens: [
        { t:'Soltura', d:'a lei diz "se por outro motivo não estiver preso" — a ressalva é a prisão por outro título, não a existência da prisão neste processo.' },
        { t:'Medidas restritivas', d:'revogam-se as provisoriamente decretadas, sejam cautelares pessoais ou reais.' },
        { t:'Absolvição imprópria', d:'reconhecida a inimputabilidade, aplica-se medida de segurança, com a espécie e o prazo mínimo definidos.' },
        { t:'Fiança', d:'absolvido, devolve-se o valor prestado.' }
      ],
      lei: ['Sentença absolutória no júri — CPP, art. 492, II',
            'Soltura, revogação de cautelares e medida de segurança — CPP, art. 492, II, "a" a "c"',
            'Absolvição imprópria — CP, art. 97',
            'Devolução da fiança — CPP, art. 337'],
      juris: [],
      modelo: 'Ante a decisão soberana do Conselho de Sentença, que respondeu afirmativamente ao quesito da absolvição, ABSOLVO o acusado FULANO DE TAL da imputação que lhe foi feita, com fundamento no art. 492, inciso II, do Código de Processo Penal.\n\nExpeça-se alvará de soltura, se por outro motivo não estiver preso. Revogo as medidas restritivas provisoriamente decretadas. Devolva-se o valor da fiança prestada. Sem custas.\n\nPublique-se em plenário. Registre-se. Intimem-se.',
      erro: 'Absolver e esquecer o alvará de soltura e a revogação das medidas restritivas. São dois itens distintos no espelho, e cada um vale ponto.' },
    { nome: 'Condenação: a base fática é o veredicto',
      deve: 'Condenado, o juiz fixa a pena considerando as circunstâncias agravantes e atenuantes alegadas nos debates e as qualificadoras e causas de aumento reconhecidas pelos jurados. A premissa de fato é o veredicto, não a sua leitura da prova.',
      itens: [
        { t:'Vinculação ao veredicto', d:'reconhecer qualificadora que os jurados afastaram, ou ignorar a que reconheceram, é sentença contrária à decisão dos jurados.' },
        { t:'Agravantes e atenuantes', d:'só as alegadas nos debates entram — é a regra própria do júri, diferente do procedimento comum.' },
        { t:'Qualificadora excedente', d:'havendo mais de uma reconhecida, uma qualifica e as demais podem valer como agravante, se houver previsão legal, ou como circunstância judicial.' },
        { t:'Requisitos formais', d:'a sentença do júri é sentença: obedece ao art. 381 do CPP em tudo o que não colidir com o rito.' }
      ],
      lei: ['Sentença condenatória no júri — CPP, art. 492, I',
            'Agravantes e atenuantes alegadas nos debates — CPP, art. 492, I, "b"',
            'Requisitos da sentença — CPP, art. 381'],
      juris: [],
      erro: 'Reconhecer qualificadora que os jurados afastaram. Isso não é erro de dosimetria: é sentença contrária ao veredicto, e o recurso é o do art. 593, III, "b".' },
    { nome: 'Dosimetria — as três fases, uma a uma',
      deve: 'Pena-base pelas circunstâncias judiciais, com fato concreto para cada uma que você valorar negativamente; depois agravantes e atenuantes; por fim causas de aumento e de diminuição, as únicas que rompem os limites do tipo.',
      itens: [
        { t:'Primeira fase', d:'parte-se do mínimo. Patamar de trabalho usual de 1/8 do intervalo por circunstância negativa — critério jurisprudencial, não legal, que precisa ser explicitado.' },
        { t:'Segunda fase', d:'atenuantes antes das agravantes, patamar usual de 1/6, sem ultrapassar mínimo nem máximo.' },
        { t:'Terceira fase', d:'aplicação cumulativa, cada operação sobre o resultado da anterior. Havendo mais de uma causa na Parte Especial, o juiz pode limitar-se a um só aumento.' },
        { t:'Sem bis in idem', d:'elementar do tipo, qualificadora já usada e agravante não voltam a valer na fase anterior.' },
        { t:'Concurso de crimes', d:'entra depois de fechada a dosimetria de cada delito — não é quarta fase.' }
      ],
      lei: ['Circunstâncias judiciais — CP, art. 59',
            'Cálculo da pena em três fases — CP, art. 68',
            'Concurso de causas de aumento na Parte Especial — CP, art. 68, parágrafo único',
            'Concurso de crimes — CP, arts. 69 a 71',
            'Crime hediondo — Lei 8.072/90, art. 1º, I (homicídio qualificado, red. da Lei 15.159/2025); feminicídio no art. 1º, I-B'],
      juris: ['Atenuante não reduz abaixo do mínimo — Súmula 231 do STJ',
              'Gravidade abstrata não motiva regime mais severo — Súmula 718 do STF'],
      modelo: 'Passo a dosar a pena, na forma do art. 68 do Código Penal.\n\nPRIMEIRA FASE. A culpabilidade é normal à espécie. O réu não registra antecedentes. Nada a valorar quanto à conduta social e à personalidade. Os motivos integram a qualificadora reconhecida, e por isso não os valoro nesta fase, sob pena de bis in idem. As circunstâncias do crime são desfavoráveis, pois ... . Ausentes elementos sobre as consequências e o comportamento da vítima. Presente uma circunstância judicial negativa, e adotado como parâmetro 1/8 do intervalo da pena, fixo a PENA-BASE em ... anos de reclusão.\n\nSEGUNDA FASE. Reconhecida nos debates a atenuante da confissão espontânea (art. 65, III, "d", do CP), atenuo a pena em 1/6, fixando a PENA INTERMEDIÁRIA em ... anos de reclusão. Ausentes agravantes alegadas nos debates.\n\nTERCEIRA FASE. Ausentes causas de aumento e de diminuição reconhecidas pelo Conselho de Sentença, torno DEFINITIVA a pena em ... anos de reclusão.',
      erro: 'Elevar a pena-base repetindo elementar do tipo ou a própria qualificadora já usada para qualificar. É bis in idem, e o espelho desconta.' },
    { nome: 'Regime inicial, substituição e detração',
      deve: 'Fixar o regime pelo quantum e pelas circunstâncias do art. 59, examinar substituição e sursis ainda que para negar, e computar o tempo de prisão provisória para determinar o regime.',
      itens: [
        { t:'Detração antes do regime', d:'o tempo de prisão provisória é computado para DETERMINAR o regime inicial, ainda na sentença.' },
        { t:'Regime', d:'acima de 8 anos, fechado; acima de 4 até 8, semiaberto se primário; até 4, aberto se primário. Circunstância desfavorável autoriza agravar, com motivação concreta.' },
        { t:'Hediondez', d:'homicídio qualificado é hediondo, mas isso não impõe por si regime inicial fechado — o regime se define pelas regras gerais, com fundamentação.' },
        { t:'Substituição e sursis', d:'em crime cometido com violência ou grave ameaça a substituição é vedada; ainda assim, diga isso expressamente.' }
      ],
      lei: ['Regime inicial — CP, art. 33, §§ 2º e 3º',
            'Substituição por penas restritivas de direitos — CP, art. 44',
            'Suspensão condicional da pena — CP, art. 77',
            'Detração na fixação do regime — CPP, art. 387, § 2º'],
      juris: ['Regime mais gravoso exige motivação idônea — Súmula 719 do STF',
              'Pena-base no mínimo veda regime mais gravoso com base apenas na gravidade abstrata do delito — Súmula 440 do STJ'],
      modelo: 'Considerado o tempo de prisão provisória (art. 387, § 2º, do CPP), e nos termos do art. 33, § 2º, "a", do Código Penal, o condenado iniciará o cumprimento da pena em regime FECHADO, o que se justifica pelo quantum aplicado.\n\nIncabível a substituição por penas restritivas de direitos, por se tratar de crime cometido com violência à pessoa (art. 44, I, do Código Penal), e, pelo mesmo motivo e pelo quantum, incabível a suspensão condicional da pena (art. 77 do Código Penal).',
      erro: 'Fixar o fechado invocando só a gravidade do homicídio. Ser hediondo não dispensa a fundamentação concreta do regime.' },
    { nome: 'Prisão depois do veredicto',
      deve: 'Decidir, fundamentadamente, sobre a execução imediata da condenação e sobre a manutenção ou decretação da preventiva. É o ponto mais sensível da peça depois do Tema 1068.',
      itens: [
        { t:'Execução imediata', d:'a soberania dos veredictos autoriza a execução da condenação independentemente do total da pena — o piso de 15 anos da alínea "e" foi excluído pelo STF.' },
        { t:'Preventiva', d:'decidir sobre manter, decretar ou revogar, com fato concreto e não com a gravidade em abstrato.' },
        { t:'Motivação', d:'o art. 315, § 2º, do CPP lista o que NÃO é fundamentação — evite todas as seis fórmulas.' }
      ],
      lei: ['Execução provisória da condenação no júri — CPP, art. 492, I, "e"',
            'Pressupostos da preventiva — CPP, art. 312',
            'O que não é fundamentação — CPP, art. 315, § 2º',
            'Motivação das decisões — CF, art. 93, IX'],
      juris: ['Execução imediata independe do total da pena — STF, RE 1.235.340, Tema 1068, j. 12/09/2024'],
      modelo: 'Diante da soberania dos veredictos, e nos termos do art. 492, I, "e", do Código de Processo Penal, com a interpretação conforme fixada pelo Supremo Tribunal Federal no Tema 1068, DETERMINO a execução imediata da condenação, independentemente do total da pena aplicada.\n\nExpeça-se mandado de prisão e guia de execução provisória.\n\nOU\n\nAusentes os pressupostos do art. 312 do Código de Processo Penal, e por não ser caso de execução imediata, PODERÁ o sentenciado recorrer em liberdade.',
      erro: 'Repetir o piso de 15 anos do art. 492, I, "e" como se fosse condição da execução imediata. No Tema 1068 o STF deu interpretação conforme com redução de texto e excluiu o limite.' },
    { nome: 'Fecho: leitura, recurso e providências',
      deve: 'Sentença lida em plenário, custas, direito de recorrer, expedição da guia e as comunicações de praxe.',
      itens: [
        { t:'Leitura em plenário', d:'a sentença é lida antes de encerrada a sessão, e a intimação se dá nesse ato.' },
        { t:'Guia', d:'a definitiva sai após o trânsito; a provisória, quando houver execução imediata.' },
        { t:'Providências', d:'rol dos culpados, ofício ao TRE para suspensão dos direitos políticos, comunicação ao instituto de identificação.' },
        { t:'Recurso', d:'apelação nas hipóteses fechadas do art. 593, III, em 5 dias.' }
      ],
      lei: ['Leitura da sentença em plenário — CPP, art. 493',
            'Apelação das decisões do júri — CPP, art. 593, III',
            'Guia de recolhimento definitiva — LEP, arts. 105 e 106; guia de execução provisória — Res. CNJ 113/2010 e Súmulas 716 e 717 do STF',
            'Suspensão dos direitos políticos — CF, art. 15, III'],
      juris: [],
      modelo: 'Condeno o sentenciado ao pagamento das custas processuais.\n\nExpeça-se guia de execução provisória, encaminhando-se ao Juízo da Execução Penal.\n\nCertificado o trânsito em julgado: a) lance-se o nome no rol dos culpados; b) oficie-se ao Tribunal Regional Eleitoral, para os fins do art. 15, III, da Constituição; c) oficie-se ao instituto de identificação; d) expeça-se guia de execução definitiva.\n\nSentença lida em plenário, saindo os presentes intimados.\n\nPublique-se. Registre-se. Intimem-se.\n\nLocal, data.\nJuiz de Direito — Presidente do Tribunal do Júri',
      erro: 'Terminar sem uma palavra sobre recorrer em liberdade. A omissão é falta de fundamentação, não descuido de redação.' }
  ],
  cego: [
    'Sentença congruente com as respostas aos quesitos',
    'Absolvição pelo quesito genérico NÃO fundamentada',
    'Absolvição: soltura ressalvada a prisão por outro motivo',
    'Revogação das medidas restritivas e devolução da fiança',
    'Medida de segurança na absolvição imprópria',
    'Qualificadoras e causas de aumento conforme o veredicto',
    'Agravantes e atenuantes limitadas ao alegado nos debates',
    'Pena-base com fato concreto para cada circunstância judicial',
    'Fração de trabalho explicitada como critério jurisprudencial',
    'Terceira fase com fração justificada',
    'Sem bis in idem entre elementar, qualificadora e agravante',
    'Detração computada para o regime (CPP, art. 387, § 2º)',
    'Regime inicial fundamentado, não pela hediondez em abstrato',
    'Substituição e sursis enfrentados, ainda que para negar',
    'Execução imediata e preventiva decididas com motivação',
    'Custas, guia, rol dos culpados, TRE e P. R. I.'
  ],
  dicas: [
    'Leia a ata antes de escrever. Ela diz quais teses foram sustentadas, e sem isso você não sabe quais agravantes e atenuantes podem entrar na segunda fase.',
    'No júri, agravante e atenuante só entram se alegadas nos debates. É a diferença mais cobrada em relação ao procedimento comum, onde podem ser reconhecidas de ofício.',
    'Absolveu? A sentença é curta. Não escreva fundamentação: o veredicto é soberano e explicar o motivo é o erro clássico.',
    'Havendo duas qualificadoras, uma qualifica e a outra vai para a segunda fase se tiver previsão como agravante; não tendo, vai para a primeira, como circunstância judicial.',
    { t:'O piso de 15 anos do art. 492, I, "e" não existe mais como condição. O STF, no Tema 1068, deu interpretação conforme com redução de texto — mas o texto do Planalto ainda exibe a redação original, o que confunde.', alerta:true },
    { t:'Feminicídio não está mais no art. 1º, I, da Lei 8.072/90: está no inciso I-B, pela Lei 14.994/2024, e o inciso I foi reescrito pela Lei 15.159/2025. Citar o inciso I para feminicídio está errado.', alerta:true },
    { t:'A tese do Tema 1087 sobre clemência é condicional: só não haverá novo júri se a absolvição for compatível com a Constituição, com os precedentes vinculantes do STF e com as circunstâncias fáticas dos autos.', alerta:true }
  ],
  especiais: [
    { t:'Desclassificação em plenário', d:'Se os jurados desclassificarem para crime não doloso contra a vida, a competência para julgar passa ao juiz-presidente (CPP, art. 492, § 1º), que aplica a pena do crime desclassificado. Sendo infração de menor potencial ofensivo, o presidente aplica os institutos da Lei 9.099/95 (§ 2º).' },
    { t:'Tentativa de homicídio', d:'A causa de diminuição do art. 14, II, do CP é objeto de quesito próprio, e a fração — de 1/3 a 2/3 — depende do iter criminis percorrido. Quanto mais próximo da consumação, menor a redução. Fundamente pela distância do resultado, não pela gravidade.' },
    { t:'Concurso de agentes', d:'A dosimetria é individualizada por réu, mesmo com veredicto único. Participação de menor importância (CP, art. 29, § 1º) e cooperação dolosamente distinta (§ 2º) precisam ter sido objeto de quesito para serem reconhecidas.' },
    { t:'Feminicídio', d:'Depois da Lei 14.994/2024 o feminicídio é crime autônomo (CP, art. 121-A) e figura no rol de hediondos no art. 1º, I-B, da Lei 8.072/90. Verifique a data do fato: para fatos anteriores, aplica-se a lei do tempo, e a mais grave não retroage.' }
  ]
},

// ──────────────────── SENTENÇA SOCIOEDUCATIVA (2ª fase) ────────────────────
'Sentença socioeducativa': {
  rito: 'Criança e adolescente — ato infracional',
  freq: 5,   // vezes em que o tema aparece nas 648 provas de discursivas.js
  carreiras: ['Magistratura'],
  sobre: 'Não é sentença penal: é decisão que aplica medida socioeducativa, de natureza pedagógica. Duas armadilhas cobram quase todo o espelho — aplicar medida sem prova além da confissão, e internar fora das três hipóteses do art. 122. Internação é exceção, e cada exceção tem inciso próprio.',
  blocos: [
    { nome: 'Relatório e regularidade do procedimento',
      deve: 'Registrar a representação, a oitiva do adolescente e dos responsáveis, a atuação da defesa técnica e o resultado do estudo social. A oitiva não é praxe: é condição de validade.',
      itens: [
        { t:'Representação', d:'oferecida pelo Ministério Público após a oitiva informal, com a descrição do ato e a indicação das provas.' },
        { t:'Audiência de apresentação', d:'oitiva do adolescente e dos pais ou responsável — sua falta é nulidade insanável.' },
        { t:'Defesa técnica', d:'nenhum adolescente é processado sem defensor; a defesa deficiente equivale à ausência.' },
        { t:'Estudo social', d:'relatório da equipe interprofissional, base da escolha da medida — se houver, cite; se não houver, diga por quê.' },
        { t:'Internação provisória', d:'registre se houve, desde quando e se o prazo de 45 dias foi observado.' }
      ],
      lei: ['Representação do Ministério Público — ECA, art. 182',
            'Audiência de apresentação e oitiva do adolescente — ECA, arts. 184 e 186',
            'Defesa técnica por advogado — ECA, art. 207',
            'Alegações finais e sentença — ECA, art. 186, § 4º',
            'Prazo máximo da internação provisória — ECA, arts. 108 e 183'],
      juris: ['Aplicação da medida é competência exclusiva do juiz — Súmula 108 do STJ'],
      modelo: 'Vistos etc.\n\nO MINISTÉRIO PÚBLICO ofereceu representação em face do adolescente F. T., nascido em .../.../..., pela prática de ato infracional análogo ao crime previsto no art. ... do Código Penal, ocorrido em .../.../..., nas circunstâncias descritas na peça inicial.\n\nO adolescente foi apreendido em .../.../... e ... (liberado aos responsáveis / mantido em internação provisória, com o prazo do art. 183 do ECA observado).\n\nRealizada a audiência de apresentação, o adolescente foi ouvido na presença de sua genitora e de defensor constituído (fl. ...). Na audiência em continuação foram ouvidas as testemunhas ... e ... . Foi juntado estudo social às fls. ... .\n\nEm alegações finais, o Ministério Público pugnou por ...; a defesa, por ... .\n\nÉ o relatório. DECIDO.',
      erro: 'Passar por cima da oitiva do adolescente ou da manifestação da defesa técnica. Não é formalidade dispensável — é nulidade.' },
    { nome: 'Materialidade e autoria — prova, não só confissão',
      deve: 'Aplicar medida dos incisos II a VI do art. 112 exige prova suficiente de autoria e materialidade. Confissão não substitui prova e não autoriza dispensar as demais.',
      itens: [
        { t:'Exigência do art. 114', d:'prova suficiente de autoria e materialidade, ressalvada apenas a hipótese de remissão.' },
        { t:'Advertência é exceção', d:'a medida do inciso I pode ser aplicada com prova da materialidade e indícios de autoria (art. 114, parágrafo único).' },
        { t:'Confissão', d:'não dispensa as outras provas, e desistir delas por causa dela é nulidade.' },
        { t:'Prova em contraditório', d:'elemento colhido só na fase de apuração policial não sustenta a medida sozinho.' }
      ],
      lei: ['Prova de autoria e materialidade — ECA, art. 114',
            'Advertência com indícios de autoria — ECA, art. 114, parágrafo único',
            'Remissão — ECA, arts. 126 a 128'],
      juris: ['Nula a desistência de provas em face da confissão — Súmula 342 do STJ'],
      modelo: 'A materialidade do ato infracional está demonstrada pelo auto de apreensão de fl. ..., pelo laudo de fl. ... e pelo depoimento da vítima, ouvida em juízo.\n\nA autoria também é certa. O adolescente, ouvido na audiência de apresentação, admitiu ... . Sua confissão, porém, não é o único elemento: encontra respaldo no depoimento de ... (fl. ...) e no reconhecimento realizado na forma do art. 226 do Código de Processo Penal.\n\nAssim, presentes prova suficiente da autoria e da materialidade, na forma exigida pelo art. 114 do Estatuto da Criança e do Adolescente, a representação é procedente.',
      erro: 'Sentenciar apoiado na confissão colhida na fase policial, sem prova produzida em contraditório. A Súmula 342 derruba a sentença inteira.' },
    { nome: 'Tipicidade, excludentes e prescrição',
      deve: 'Verificar a correspondência da conduta com crime ou contravenção, enfrentar as excludentes alegadas e checar a prescrição — que incide, com a redução da menoridade.',
      itens: [
        { t:'Correspondência típica', d:'ato infracional é a conduta descrita como crime ou contravenção; sem tipo correspondente, não há ato infracional.' },
        { t:'Idade na data do fato', d:'é o que define a sujeição ao ECA — e não a idade na data da sentença.' },
        { t:'Excludentes', d:'ilicitude e culpabilidade aplicam-se por analogia, e precisam ser enfrentadas uma a uma.' },
        { t:'Prescrição', d:'aplica-se, com a redução pela metade — mas verifique a exceção introduzida em 2025 para crime que envolva violência sexual contra a mulher.' }
      ],
      lei: ['Conceito de ato infracional — ECA, art. 103',
            'Adolescente inimputável, sujeito às medidas do ECA, aferida a idade à data do fato — ECA, art. 104 e parágrafo único',
            'Criança sujeita às medidas protetivas — ECA, arts. 101 e 105',
            'Redução de metade do prazo prescricional pela menoridade, salvo crime que envolva violência sexual contra a mulher — CP, art. 115 (red. da Lei 15.160/2025)'],
      juris: ['Prescrição penal aplica-se às medidas socioeducativas — Súmula 338 do STJ',
              'Maioridade superveniente não extingue a medida até os 21 anos — Súmula 605 do STJ'],
      modelo: 'A conduta apurada corresponde ao tipo do art. ... do Código Penal, configurando ato infracional na forma do art. 103 do Estatuto da Criança e do Adolescente.\n\nO adolescente contava ... anos na data do fato, o que o sujeita às medidas socioeducativas (art. 104, parágrafo único, do ECA).\n\nA defesa sustentou a excludente de ... . A tese não prospera, porque ... .\n\nQuanto à prescrição, aplicável às medidas socioeducativas (Súmula 338 do STJ), o prazo do art. 109, ..., do Código Penal, reduzido de metade pela menoridade (art. 115 do Código Penal), não se consumou entre ... e ... .',
      erro: 'Não examinar a prescrição. Em ato infracional o prazo já é curto e cai pela metade — passa despercebido e o espelho cobra.' },
    { nome: 'Escolha da medida: proporcionalidade, não tarifa',
      deve: 'A medida se escolhe pela capacidade do adolescente de cumpri-la, pelas circunstâncias e pela gravidade — nessa ordem, e não só pela gravidade. Fundamentar por que as menos gravosas não servem.',
      itens: [
        { t:'A ordem do § 1º', d:'capacidade de cumprir vem primeiro no texto legal; a gravidade é o último critério, não o único.' },
        { t:'Elenco', d:'advertência, obrigação de reparar o dano, prestação de serviços à comunidade, liberdade assistida, semiliberdade e internação — do menos ao mais gravoso.' },
        { t:'Descarte motivado', d:'diga por que cada medida menos gravosa é insuficiente no caso. Sem isso a escolha não se sustenta.' },
        { t:'Adolescente com deficiência', d:'atendimento individualizado e em local adequado às suas condições.' },
        { t:'Princípios da execução', d:'legalidade, excepcionalidade, brevidade, proporcionalidade e mínima intervenção regem o cumprimento.' }
      ],
      lei: ['Elenco das medidas socioeducativas — ECA, art. 112',
            'Critérios de escolha da medida — ECA, art. 112, § 1º',
            'Adolescente com deficiência — ECA, art. 112, § 3º',
            'Princípios da execução socioeducativa — Lei 12.594/2012 (SINASE), art. 35'],
      juris: [],
      modelo: 'Passo à escolha da medida, observados os critérios do art. 112, § 1º, do Estatuto da Criança e do Adolescente.\n\nO estudo social de fls. ... revela que o adolescente ... (contexto familiar, escolar e comunitário), o que indica capacidade de cumprir medida em meio aberto, com acompanhamento.\n\nAs circunstâncias do ato revelam ... . A gravidade, embora relevante, não é o único critério, e o Estatuto a coloca ao lado da capacidade de cumprimento.\n\nA advertência e a obrigação de reparar mostram-se insuficientes, porque ... . A prestação de serviços à comunidade, isoladamente, não atende à finalidade pedagógica, uma vez que ... .\n\nEntendo adequada, proporcional e suficiente a medida de LIBERDADE ASSISTIDA, pelo prazo mínimo de seis meses (art. 118, § 2º, do ECA).',
      erro: 'Escolher a medida pela etiqueta do ato ("roubo é internação"). O art. 112, § 1º manda pesar a capacidade de cumprir e as circunstâncias, e a sentença precisa mostrar esse exame.' },
    { nome: 'Internação: só nas três hipóteses do art. 122',
      deve: 'Internar exige enquadrar o caso em um dos três incisos. E, havendo outra medida adequada, a internação não se impõe.',
      itens: [
        { t:'Inciso I', d:'ato cometido mediante grave ameaça ou violência a pessoa — violência contra a coisa não basta.' },
        { t:'Inciso II', d:'reiteração no cometimento de outras infrações graves — reiteração é mais de uma anterior, não a primeira reincidência.' },
        { t:'Inciso III', d:'descumprimento reiterado e injustificável de medida anteriormente imposta — a internação-sanção, limitada a três meses, com contraditório prévio.' },
        { t:'Subsidiariedade', d:'o § 2º é expresso: havendo outra medida adequada, a internação não se impõe.' },
        { t:'Regime da internação', d:'sem prazo determinado, reavaliação em no máximo seis meses, teto de três anos e liberação compulsória aos 21.' }
      ],
      lei: ['Hipóteses de internação — ECA, art. 122, I a III',
            'Internação-sanção: prazo máximo de três meses — ECA, art. 122, § 1º',
            'Vedação havendo medida mais adequada — ECA, art. 122, § 2º',
            'Prazo indeterminado, reavaliação e limites — ECA, art. 121, §§ 2º, 3º e 5º'],
      juris: ['Tráfico, por si só, não autoriza internação — Súmula 492 do STJ'],
      modelo: 'A internação é medida excepcional, sujeita aos princípios da brevidade, da excepcionalidade e do respeito à condição peculiar de pessoa em desenvolvimento (art. 121 do ECA), e só cabe nas hipóteses taxativas do art. 122.\n\nNo caso, o ato infracional foi praticado mediante grave ameaça a pessoa, com o emprego de ..., o que atrai o inciso I do art. 122.\n\nNão há medida menos gravosa adequada, uma vez que ... (art. 122, § 2º).\n\nAplico ao adolescente a medida socioeducativa de INTERNAÇÃO, sem prazo determinado, a ser reavaliada, mediante decisão fundamentada, no máximo a cada seis meses (art. 121, § 2º, do ECA), observados o limite de três anos e a liberação compulsória aos vinte e um anos de idade.',
      erro: 'Internar por ato análogo ao tráfico invocando a gravidade em abstrato. Sem violência ou grave ameaça o inciso I não serve, e a Súmula 492 fecha o atalho.' },
    { nome: 'Dispositivo e providências da execução',
      deve: 'Aplicar a medida, determinar o plano individual de atendimento, fixar a reavaliação e resolver o que fazer com a internação provisória cumprida. Nada de prazo certo para a internação.',
      itens: [
        { t:'Sem prazo certo', d:'internação não comporta prazo determinado — o que existe é o teto e a reavaliação semestral.' },
        { t:'Detração', d:'o tempo de internação provisória é computado no cumprimento da medida.' },
        { t:'PIA', d:'determinar a elaboração do plano individual de atendimento pela equipe técnica do programa.' },
        { t:'Recurso e prazo', d:'apelação, sem preparo, com prazo de dez dias para o MP e para a defesa.' },
        { t:'Regressão futura', d:'registrar que qualquer regressão exigirá oitiva prévia do adolescente.' }
      ],
      lei: ['Reavaliação em no máximo seis meses — ECA, art. 121, § 2º',
            'Teto de três anos e liberação compulsória aos 21 — ECA, art. 121, §§ 3º e 5º',
            'Detração da internação provisória — Lei 12.594/2012, art. 46, § 1º',
            'Plano Individual de Atendimento — Lei 12.594/2012, arts. 52 e 53',
            'Recursos: prazo de dez dias para o MP e para a defesa em todos os recursos, salvo embargos de declaração — ECA, art. 198, II'],
      juris: ['Oitiva do adolescente antes da regressão — Súmula 265 do STJ'],
      modelo: 'Ante o exposto, JULGO PROCEDENTE a representação, para aplicar ao adolescente F. T. a medida socioeducativa de ..., na forma do art. 112, ..., do Estatuto da Criança e do Adolescente.\n\nDetermino a elaboração do Plano Individual de Atendimento pela equipe técnica do programa, no prazo do art. 56 da Lei 12.594/2012.\n\nCompute-se o período de internação provisória já cumprido.\n\nA medida será reavaliada, mediante decisão fundamentada, no máximo a cada seis meses.\n\nSem custas (art. 141, § 2º, do ECA).\n\nPublique-se. Registre-se. Intimem-se, inclusive o adolescente e seus responsáveis, pessoalmente.',
      erro: 'Fixar prazo determinado de internação ("internação por um ano"). A internação não comporta prazo certo: o que existe é o teto de três anos e a reavaliação semestral.' }
  ],
  cego: [
    'Oitiva do adolescente e dos responsáveis registrada',
    'Defesa técnica atuante e alegações enfrentadas',
    'Prazo da internação provisória verificado',
    'Autoria e materialidade provadas — não só confissão',
    'Tipicidade do ato infracional demonstrada',
    'Idade aferida na data do fato',
    'Excludentes alegadas enfrentadas',
    'Prescrição examinada, com a redução da menoridade',
    'Escolha da medida justificada pelo art. 112, § 1º',
    'Medidas menos gravosas descartadas com motivo',
    'Internação enquadrada em inciso do art. 122',
    'Subsidiariedade do § 2º enfrentada',
    'Internação sem prazo determinado, com reavaliação em até 6 meses',
    'Internação-sanção limitada a três meses',
    'Detração da internação provisória',
    'PIA determinado e intimação pessoal do adolescente'
  ],
  dicas: [
    'A idade que importa é a da DATA DO FATO. Adolescente que completou 18 no curso do processo continua sujeito à medida, até os 21.',
    'Não use vocabulário penal. Não é réu, é adolescente; não é condenação, é aplicação de medida; não é pena, é medida socioeducativa. A banca lê isso.',
    'A ordem do art. 112, § 1º começa pela capacidade de cumprir a medida. Sentença que começa pela gravidade já inverteu o critério legal.',
    'Reiteração do art. 122, II não é a segunda passagem. Exige prática reiterada de outras infrações graves — e a jurisprudência não fixa número, exige análise concreta.',
    'Internação-sanção do inciso III tem teto de três meses e exige contraditório prévio: não se decreta no mesmo despacho que constata o descumprimento.',
    { t:'Prescrição em ato infracional cai pela metade pelo art. 115 do CP — mas a Lei 15.160/2025 excepcionou o crime que envolva violência sexual contra a mulher. Verifique a natureza do ato antes de reduzir.', alerta:true },
    { t:'O art. 105 do ECA é de CRIANÇA, e remete às medidas protetivas do art. 101. Citar o art. 105 para adolescente é erro de dispositivo.', alerta:true },
    { t:'O prazo recursal de dez dias está no art. 198, II, e não alcança os embargos de declaração. Citar "art. 198" sem o inciso é impreciso.', alerta:true }
  ],
  especiais: [
    { t:'Remissão', d:'Pode ser ministerial, antes de iniciado o procedimento (exclusão do processo), ou judicial, depois de iniciado (suspensão ou extinção). Não implica reconhecimento nem comprovação de responsabilidade e não prevalece para efeito de antecedentes (ECA, art. 127). Cumulável com medida em meio aberto — nunca com internação ou semiliberdade (Súmula 108 do STJ e art. 127, parte final).' },
    { t:'Ato análogo ao tráfico', d:'A Súmula 492 do STJ impede a internação automática. Sem violência ou grave ameaça, o inciso I do art. 122 não incide; a internação só cabe pela reiteração (II) ou pelo descumprimento (III), e cada uma exige demonstração própria.' },
    { t:'Adolescente com transtorno mental ou dependência', d:'O art. 112, § 3º, do ECA determina tratamento individual e especializado, em local adequado. A medida socioeducativa não se converte em medida de segurança, e a internação psiquiátrica segue a legislação de saúde mental, não o art. 122.' },
    { t:'Prática em concurso com maior de idade', d:'O adolescente responde no juízo da infância, e o adulto no juízo criminal — não há reunião. Para o adulto, verifique a corrupção de menores do art. 244-B do ECA, crime formal que dispensa prova da efetiva corrupção (Súmula 500 do STJ).' },
    { t:'Execução da medida', d:'O SINASE (Lei 12.594/2012) rege o cumprimento: PIA obrigatório, reavaliação semestral, e regressão só com oitiva prévia (Súmula 265 do STJ). O descumprimento reiterado e injustificável autoriza a internação-sanção do art. 122, III, limitada a três meses.' }
  ]
},

// ───────────── SENTENÇA NOS EMBARGOS À EXECUÇÃO FISCAL (2ª fase) ─────────────
'Embargos à execução fiscal': {
  rito: 'Tributário — execução fiscal',
  freq: 18,   // vezes em que o tema aparece nas 648 provas de discursivas.js
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
  freq: 8,   // vezes em que o tema aparece nas 648 provas de discursivas.js
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
  freq: 6,   // vezes em que o tema aparece nas 648 provas de discursivas.js
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
  freq: 20,   // vezes em que o tema aparece nas 648 provas de discursivas.js
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
  freq: 7,   // vezes em que o tema aparece nas 648 provas de discursivas.js
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
 "rito": "Ambiental — ação civil pública",
 "freq": 31,
 "carreiras": [
  "Ministério Público",
  "Magistratura",
  "Advocacia Pública",
  "Defensoria"
 ],
 "sobre": "A ACP ambiental é a peça em que o candidato mostra que entende a diferença entre responsabilidade objetiva e culpa, entre reparação integral e indenização, e entre o macrobem ambiental e o dano individual reflexo. O espelho quase sempre cobra a cumulação de obrigação de fazer com indenização e a solidariedade entre os poluidores.",
 "blocos": [
  {
   "nome": "Endereçamento, competência e legitimidade",
   "deve": "Fixar o juízo do local do dano e demonstrar a legitimidade ativa e passiva.",
   "itens": [
    {
     "t": "Competência",
     "d": "foro do local onde ocorrer o dano, com competência funcional — portanto absoluta e improrrogável (Lei 7.347/1985, art. 2º). O parágrafo único fixa a prevenção pela propositura."
    },
    {
     "t": "Justiça Federal",
     "d": "quando houver interesse da União, autarquia ou empresa pública federal (CF, art. 109, I). A Súmula 183 do STJ, que mandava o juiz estadual julgar nas comarcas sem vara federal, está CANCELADA desde 08/11/2000 — não a cite como fundamento vivo."
    },
    {
     "t": "Dano de alcance nacional ou regional",
     "d": "a competência observa o art. 93, II, do CDC, e a prevenção do juízo que primeiro conheceu de uma das ações, conforme os itens II e III da tese do Tema 1075 do STF."
    },
    {
     "t": "Legitimados ativos",
     "d": "o rol do art. 5º da LACP — MP, Defensoria, União, Estados, DF e Municípios, autarquias, empresas públicas, fundações, sociedades de economia mista e associações constituídas há pelo menos um ano com pertinência temática (§ 4º autoriza dispensar o requisito temporal)."
    },
    {
     "t": "Polo passivo",
     "d": "poluidor é a pessoa física ou jurídica, de direito público ou privado, responsável direta ou indiretamente pela degradação (Lei 6.938/1981, art. 3º, IV). A responsabilidade entre poluidores é solidária, com litisconsórcio facultativo — não é preciso demandar todos."
    }
   ],
   "lei": [
    "Foro do local do dano, competência funcional — Lei 7.347/1985, art. 2º",
    "Objeto da ACP — Lei 7.347/1985, art. 1º",
    "Legitimados — Lei 7.347/1985, art. 5º",
    "Poluidor direto e indireto — Lei 6.938/1981, art. 3º, IV",
    "Solidariedade entre coautores — CC, art. 942",
    "Competência da Justiça Federal — CF, art. 109, I"
   ],
   "juris": [
    "Art. 16 da LACP é inconstitucional; competência nacional pelo art. 93, II, do CDC — Tema 1075 do STF, RE 1.101.937, Pleno, Rel. Min. Alexandre de Moraes, 08/04/2021",
    "Responsabilidade do Estado por omissão no dever de fiscalizar: solidária, de execução subsidiária — Súmula 652 do STJ"
   ],
   "modelo": "Excelentíssimo Senhor Doutor Juiz de Direito da ... Vara da Fazenda Pública da Comarca de ...\n\nO MINISTÉRIO PÚBLICO DO ESTADO DE ..., por seu Promotor de Justiça, com fundamento no art. 129, III, da Constituição da República, nos arts. 1º, I, 3º e 5º, I, da Lei 7.347/1985 e no art. 14, § 1º, da Lei 6.938/1981, vem propor\n\nAÇÃO CIVIL PÚBLICA AMBIENTAL, com pedido de tutela provisória de urgência,\n\nem face de ..., pelos fundamentos a seguir.",
   "erro": "Propor no foro do domicílio do réu. A competência do art. 2º da LACP é funcional, logo absoluta — e o erro contamina a peça inteira."
  },
  {
   "nome": "Fatos e o dano ambiental",
   "deve": "Descrever a degradação com precisão técnica e documental: o que foi degradado, em que extensão, por qual conduta e com que prova.",
   "itens": [
    {
     "t": "Identificação do bem",
     "d": "APP, reserva legal, unidade de conservação, recurso hídrico, fauna, ar — cada um tem regime próprio e o espelho confere se o candidato acertou o regime."
    },
    {
     "t": "Extensão e prova",
     "d": "auto de infração, laudo do órgão ambiental, imagens de satélite, inquérito civil. Sem base documental, a inicial vira alegação."
    },
    {
     "t": "Dano moral coletivo",
     "d": "quando houver lesão intolerável a valores da coletividade, deve ser pedido de modo autônomo e fundamentado — não é decorrência automática do dano material."
    },
    {
     "t": "Macrobem e microbem",
     "d": "a ACP tutela o macrobem — o meio ambiente como bem difuso. O dano individual reflexo (microbem) é pretensão de titular determinado e segue outro regime, inclusive de prescrição."
    }
   ],
   "lei": [
    "Meio ambiente como bem de uso comum do povo — CF, art. 225",
    "Definição de degradação e poluição — Lei 6.938/1981, art. 3º, II e III",
    "Áreas de preservação permanente — Lei 12.651/2012, art. 4º",
    "Reserva legal — Lei 12.651/2012, art. 12"
   ],
   "juris": [
    "Constitucionalidade do Código Florestal, com interpretações conforme — STF, Pleno, ADC 42 e ADIs 4901, 4902, 4903 e 4937, Rel. Min. Luiz Fux, 28/02/2018",
    "Embargos de declaração no Código Florestal: compensação de reserva legal volta ao critério do mesmo bioma e modulação quanto a aterros sanitários — STF, 24/10/2024"
   ],
   "erro": "Descrever o dano sem dizer a extensão nem indicar o laudo. O espelho pontua a demonstração, não a indignação."
  },
  {
   "nome": "Fundamento jurídico — responsabilidade objetiva e integral",
   "deve": "Assentar o regime: responsabilidade objetiva, pela teoria do risco integral, com reparação integral e solidariedade.",
   "itens": [
    {
     "t": "Objetividade",
     "d": "o poluidor é obrigado, independentemente da existência de culpa, a indenizar ou reparar os danos causados (Lei 6.938/1981, art. 14, § 1º). É a base literal — cite-a."
    },
    {
     "t": "Risco integral",
     "d": "no dano ambiental não se admitem as excludentes do fortuito, da força maior ou do fato de terceiro. Consequência prática: basta demonstrar a conduta e o nexo."
    },
    {
     "t": "Reparação integral",
     "d": "restauração do bem ao estado anterior; sendo inviável, compensação ecológica; e, em qualquer caso, indenização pelo dano residual e pelo período em que o bem esteve degradado (dano intercorrente)."
    },
    {
     "t": "Cumulação",
     "d": "a condenação em obrigação de fazer ou de não fazer pode ser cumulada com a de indenizar — não há escolha excludente."
    },
    {
     "t": "Natureza propter rem",
     "d": "as obrigações ambientais aderem à coisa e podem ser cobradas do proprietário ou possuidor atual e/ou dos anteriores, à escolha do credor. O STJ refinou o enunciado em repetitivo: fica isento o alienante cujo direito real cessou antes da causação do dano, desde que não tenha concorrido para ele."
    },
    {
     "t": "Inversão do ônus da prova",
     "d": "aplica-se às ações de degradação ambiental, por força do princípio da precaução."
    },
    {
     "t": "Fato consumado",
     "d": "não se admite a teoria do fato consumado em direito ambiental — o tempo de ocupação irregular não convalida a degradação."
    }
   ],
   "lei": [
    "Responsabilidade objetiva do poluidor — Lei 6.938/1981, art. 14, § 1º",
    "Dever de reparar — CF, art. 225, § 3º",
    "Condenação em dinheiro ou obrigação de fazer — Lei 7.347/1985, art. 3º"
   ],
   "juris": [
    "Inversão do ônus da prova nas ações de degradação ambiental — Súmula 618 do STJ",
    "Obrigações ambientais têm natureza propter rem — Súmula 623 do STJ",
    "Isenção do alienante cujo direito real cessou antes do dano — Tema Repetitivo 1204 do STJ, REsp 1.953.359/SP e REsp 1.962.089/MS, 1ª Seção, Rel. Min. Assusete Magalhães, setembro de 2023",
    "Não se aplica a teoria do fato consumado em direito ambiental — Súmula 613 do STJ",
    "Cumulação de obrigação de fazer com indenização — Súmula 629 do STJ"
   ],
   "modelo": "A responsabilidade civil por dano ambiental é objetiva e informada pela teoria do risco integral, nos termos do art. 14, § 1º, da Lei 6.938/1981 e do art. 225, § 3º, da Constituição da República, bastando a demonstração da conduta e do nexo de causalidade, sendo inoponíveis as excludentes de caso fortuito, força maior e fato de terceiro.\n\nA reparação há de ser integral: impõe-se a recuperação in natura da área degradada e, cumulativamente, a indenização pelo dano residual e pelo dano interino — cumulação expressamente admitida pela Súmula 629 do Superior Tribunal de Justiça.",
   "erro": "Pedir só a indenização, ou só a recuperação. A cumulação é o item de espelho mais recorrente da matéria (Súmula 629 do STJ)."
  },
  {
   "nome": "Prescrição — o ponto de divergência",
   "deve": "Enfrentar a prescrição com a distinção correta, sinalizando o que é STF e o que é STJ.",
   "itens": [
    {
     "t": "Regra do STF",
     "d": "é imprescritível a pretensão de reparação civil de dano ambiental — Tema 999 da repercussão geral, RE 654.833/AC, Pleno, Rel. Min. Alexandre de Moraes, julgado em 20/04/2020. A tese alcança o macrobem."
    },
    {
     "t": "Recorte do STJ",
     "d": "quando o dano atinge o microbem — o patrimônio individual do lesado —, a pretensão indenizatória é prescritível, pelo prazo trienal do art. 206, § 3º, V, do Código Civil (STJ, 4ª Turma, AgInt no REsp 2.029.870/MA, Rel. Min. Maria Isabel Gallotti, 26/02/2024)."
    },
    {
     "t": "Como escrever",
     "d": "as duas posições convivem por distinção de objeto, não por superação. Afirmar imprescritibilidade sem a distinção custa ponto em prova de magistratura."
    },
    {
     "t": "Cuidado com o número",
     "d": "existe também um Tema 999 no STJ, que é previdenciário (revisão da vida toda). Nunca escreva \"Tema 999\" sem dizer o tribunal."
    }
   ],
   "lei": [
    "Prescrição da reparação civil — CC, art. 206, § 3º, V"
   ],
   "juris": [
    "Imprescritibilidade da reparação de dano ambiental — Tema 999 do STF, RE 654.833/AC, Pleno, Rel. Min. Alexandre de Moraes, 20/04/2020",
    "Prescrição trienal do dano ambiental individual reflexo — STJ, 4ª Turma, AgInt no REsp 2.029.870/MA, Rel. Min. Maria Isabel Gallotti, 26/02/2024"
   ],
   "erro": "Citar \"Tema 999\" sem o tribunal, ou afirmar imprescritibilidade sem distinguir macrobem de microbem."
  },
  {
   "nome": "Tutela provisória e pedidos",
   "deve": "Pedir a paralisação imediata da degradação e, ao final, a reparação integral — com pedidos que possam virar dispositivo.",
   "itens": [
    {
     "t": "Tutela de urgência",
     "d": "a LACP ainda fala em \"ação cautelar\" no art. 4º, mas o processo cautelar autônomo foi extinto pelo CPC/2015: peça tutela provisória de urgência dos arts. 300 e seguintes. O art. 12 da LACP autoriza o mandado liminar."
    },
    {
     "t": "Astreintes",
     "d": "multa diária pelo descumprimento (LACP, art. 11; CPC, art. 537), com valor e periodicidade indicados."
    },
    {
     "t": "Pedidos típicos",
     "d": "(i) cessação da atividade degradante; (ii) apresentação e execução de projeto de recuperação de área degradada, com prazo; (iii) indenização pelo dano residual e pelo dano interino, revertida ao fundo; (iv) abstenção de nova intervenção sem licença; (v) inscrição da obrigação na matrícula do imóvel, dada a natureza propter rem."
    },
    {
     "t": "Destino da condenação em dinheiro",
     "d": "reverte ao fundo de reconstituição dos bens lesados, gerido por conselho com participação obrigatória do Ministério Público (LACP, art. 13)."
    },
    {
     "t": "Ônus da sucumbência",
     "d": "o MP não adianta custas nem honorários periciais (LACP, art. 18); a associação autora só responde por honorários em caso de má-fé (art. 17)."
    }
   ],
   "lei": [
    "Tutela de urgência — CPC, art. 300",
    "Mandado liminar na ACP — Lei 7.347/1985, art. 12",
    "Multa por descumprimento — Lei 7.347/1985, art. 11",
    "Fundo de reconstituição — Lei 7.347/1985, art. 13",
    "Isenção de custas — Lei 7.347/1985, art. 18",
    "Litigância de má-fé da associação — Lei 7.347/1985, art. 17"
   ],
   "juris": [],
   "modelo": "Ante o exposto, requer:\na) a concessão da tutela provisória de urgência, inaudita altera parte, para determinar a imediata paralisação de toda e qualquer intervenção na área, sob pena de multa diária de R$ ... (art. 300 do CPC c/c art. 12 da Lei 7.347/1985);\nb) a citação dos réus;\nc) ao final, a procedência dos pedidos para condenar os réus, solidariamente, (i) à obrigação de fazer consistente na apresentação de Projeto de Recuperação de Área Degradada — PRAD, no prazo de ... dias, e à sua integral execução; (ii) à obrigação de não fazer consistente em abster-se de nova intervenção sem prévio licenciamento; (iii) ao pagamento de indenização pelo dano ambiental residual e pelo dano interino, a ser apurada em liquidação, revertida ao fundo do art. 13 da Lei 7.347/1985; (iv) ao pagamento de indenização por dano moral coletivo, no valor de R$ ...;\nd) a averbação da obrigação de recuperar na matrícula do imóvel.",
   "erro": "Pedir a indenização sem dizer para onde ela vai. A destinação ao fundo do art. 13 é item de espelho e não custa nada lembrar."
  },
  {
   "nome": "Compromisso de ajustamento de conduta e inquérito civil",
   "deve": "Fechar o quadro extrajudicial — o examinador costuma perguntar por que não houve acordo.",
   "itens": [
    {
     "t": "TAC",
     "d": "os órgãos públicos legitimados podem tomar dos interessados compromisso de ajustamento de conduta às exigências legais, com eficácia de título executivo extrajudicial (LACP, art. 5º, § 6º). Atenção: associações civis NÃO podem celebrar TAC — dizer que \"os legitimados do art. 5º\" podem é erro clássico de espelho."
    },
    {
     "t": "Inquérito civil",
     "d": "é do Ministério Público (CF, art. 129, III; LACP, art. 8º, § 1º) e instrui a inicial. Arquivamento é submetido ao Conselho Superior (art. 9º)."
    },
    {
     "t": "Vedação temática",
     "d": "não cabe ACP para veicular pretensões que envolvam tributos, contribuições previdenciárias, FGTS ou outros fundos de natureza institucional cujos beneficiários podem ser individualmente determinados (LACP, art. 1º, parágrafo único)."
    }
   ],
   "lei": [
    "Compromisso de ajustamento de conduta — Lei 7.347/1985, art. 5º, § 6º",
    "Inquérito civil — Lei 7.347/1985, arts. 8º e 9º",
    "Funções do Ministério Público — CF, art. 129, III",
    "Vedação de ACP tributária — Lei 7.347/1985, art. 1º, parágrafo único"
   ],
   "juris": [],
   "erro": "Atribuir a associações a possibilidade de celebrar TAC. O § 6º fala em órgãos públicos legitimados."
  }
 ],
 "cego": [
  "Foro do local do dano, com a competência funcional explicitada",
  "Legitimidade ativa fundamentada (art. 5º da LACP e art. 129, III, da CF)",
  "Polo passivo com poluidor direto e indireto (art. 3º, IV, da Lei 6.938/1981)",
  "Dano descrito com extensão e prova documental",
  "Responsabilidade objetiva pelo art. 14, § 1º, da Lei 6.938/1981",
  "Teoria do risco integral e afastamento das excludentes",
  "Solidariedade entre os poluidores",
  "Cumulação de obrigação de fazer com indenizar (Súmula 629 do STJ)",
  "Natureza propter rem e o recorte do Tema 1204 do STJ",
  "Inversão do ônus da prova (Súmula 618 do STJ)",
  "Prescrição enfrentada com a distinção macrobem × microbem",
  "Tutela de urgência com astreintes",
  "Destinação da indenização ao fundo do art. 13",
  "Dano moral coletivo pedido de modo autônomo"
 ],
 "dicas": [
  {
   "t": "Oitava peça mais cobrada do banco de provas aplicadas: 31 ocorrências.",
   "alerta": false
  },
  "O art. 16 da LACP foi declarado inconstitucional e a redação original foi repristinada (Tema 1075 do STF, 08/04/2021). O Planalto ainda exibe o texto da Lei 9.494/1997 — quem transcreve do site transcreve dispositivo inconstitucional.",
  {
   "t": "\"Tema 999\" sem o tribunal é armadilha: no STF é imprescritibilidade do dano ambiental; no STJ é revisão da vida toda, matéria previdenciária.",
   "alerta": true
  },
  "A responsabilidade do Estado por omissão no dever de fiscalizar é solidária, mas de execução subsidiária — Súmula 652 do STJ. Não existe tema repetitivo sobre isso; quem cita \"Tema 1204\" para o Estado troca o dispositivo.",
  "O art. 4º da LACP fala em ação cautelar, mas o CPC/2015 extinguiu o processo cautelar autônomo. Escreva tutela provisória de urgência.",
  {
   "t": "O julgamento do Código Florestal não parou em 2018: nos embargos de declaração de 24/10/2024 o STF voltou ao critério do mesmo bioma para a compensação de reserva legal e modulou a situação dos aterros sanitários em APP.",
   "alerta": true
  },
  "Súmula 183 do STJ está cancelada desde 2000. Havendo ente federal, a competência é da Justiça Federal (CF, art. 109, I)."
 ],
 "especiais": [
  {
   "t": "ACP por dano a unidade de conservação",
   "d": "Lei 9.985/2000 (SNUC): identificar a categoria da unidade, o regime da zona de amortecimento e o plano de manejo. A degradação em unidade de proteção integral tem regime mais severo que em uso sustentável."
  },
  {
   "t": "ACP contra o Poder Público por omissão fiscalizatória",
   "d": "Fundamento na Súmula 652 do STJ: solidariedade com execução subsidiária. O ente entra no título executivo como devedor-reserva, só sendo convocado se o degradador original não quitar. Precedente-líder: STJ, 2ª Turma, REsp 1.071.741/SP, Rel. Min. Herman Benjamin."
  },
  {
   "t": "ACP e licenciamento ambiental",
   "d": "A existência de licença não exclui a responsabilidade civil, que é objetiva. Licença regular afasta a ilicitude administrativa, não o dever de reparar."
  },
  {
   "t": "ACP em área urbana consolidada",
   "d": "O Código Florestal tem regime próprio para áreas rurais consolidadas em APP (art. 61-A, declarado constitucional em 2018). Em área urbana, verificar a legislação municipal e o plano diretor antes de aplicar as faixas do art. 4º."
  },
  {
   "t": "Execução da sentença coletiva",
   "d": "Decorridos sessenta dias do trânsito em julgado sem execução pela associação autora, o Ministério Público deve promovê-la, facultado igual iniciativa aos demais legitimados (LACP, art. 15)."
  }
 ]
},

'Petição inicial de improbidade': {
 "rito": "Administrativo — improbidade",
 "freq": 27,
 "carreiras": [
  "Ministério Público",
  "Advocacia Pública",
  "Magistratura"
 ],
 "sobre": "Depois da Lei 14.230/2021 e da onda de julgamentos do STF nas ADI 7156 e ADI 7236, a inicial de improbidade virou peça de tipicidade estrita: dolo descrito como fato, tipo indicado com precisão e sanções pedidas com dosimetria. O espelho cobra o elemento subjetivo em primeiro lugar — sem dolo narrado, não há ato de improbidade.",
 "blocos": [
  {
   "nome": "Endereçamento, legitimidade e competência",
   "deve": "Fixar o juízo e demonstrar quem pode propor — ponto que mudou duas vezes desde 2021.",
   "itens": [
    {
     "t": "Legitimidade ativa",
     "d": "o caput do art. 17, na redação da Lei 14.230/2021, atribuiu a ação apenas ao Ministério Público. O STF, nas ADI 7042 e ADI 7043 (Pleno, Rel. Min. Alexandre de Moraes, 31/08/2022), declarou a inconstitucionalidade parcial sem redução de texto do caput e dos §§ 6º-A e 10-C do art. 17 e do caput e dos §§ 5º e 7º do art. 17-B, restabelecendo a legitimidade ativa CONCORRENTE E DISJUNTIVA entre o Ministério Público e as pessoas jurídicas interessadas — inclusive para celebrar o acordo de não persecução civil."
    },
    {
     "t": "Como escrever",
     "d": "é decisão em ADI, controle concentrado: fale em dispositivo do acórdão, não em \"tese\". E não diga que o § 14 do art. 17 caiu — ele constava da cautelar de 17/02/2022, mas não do dispositivo final."
    },
    {
     "t": "Legitimidade passiva",
     "d": "agente público (art. 2º) e o terceiro que induza, concorra dolosamente ou dele se beneficie (art. 3º). O art. 3º, § 1º, exige que o particular tenha agido com dolo."
    },
    {
     "t": "Competência",
     "d": "juízo cível de primeiro grau do local do dano. Não há foro por prerrogativa de função em ação de improbidade — salvo a hipótese específica do art. 17, § 4º-A, que remete às regras de competência do CPC."
    },
    {
     "t": "Procedimento",
     "d": "procedimento comum do CPC, salvo o disposto na própria LIA (art. 17, caput)."
    }
   ],
   "lei": [
    "Legitimidade e procedimento — Lei 8.429/1992, art. 17",
    "Sujeito ativo — Lei 8.429/1992, art. 2º",
    "Terceiro beneficiário — Lei 8.429/1992, art. 3º"
   ],
   "juris": [
    "Legitimidade concorrente e disjuntiva do MP e das pessoas jurídicas interessadas — STF, Pleno, ADI 7042 e ADI 7043, Rel. Min. Alexandre de Moraes, 31/08/2022"
   ],
   "modelo": "Excelentíssimo Senhor Doutor Juiz de Direito da ... Vara da Fazenda Pública da Comarca de ...\n\nO MINISTÉRIO PÚBLICO DO ESTADO DE ..., por seu Promotor de Justiça, com fundamento no art. 129, III, da Constituição da República e no art. 17 da Lei 8.429/1992, vem propor\n\nAÇÃO POR ATO DE IMPROBIDADE ADMINISTRATIVA, com pedido de indisponibilidade de bens,\n\nem face de ..., agente público, e de ..., particular beneficiário, pelos fundamentos a seguir.",
   "erro": "Escrever que a legitimidade é exclusiva do Ministério Público. O texto legal diz isso, mas o STF o declarou parcialmente inconstitucional em 2022 — e o examinador conta com que o candidato saiba."
  },
  {
   "nome": "O dolo — o primeiro item de todo espelho",
   "deve": "Descrever o dolo como fato, e não afirmá-lo como conclusão. Sem dolo narrado, não há tipicidade.",
   "itens": [
    {
     "t": "Regra geral",
     "d": "consideram-se atos de improbidade as condutas DOLOSAS tipificadas nos arts. 9º, 10 e 11 (art. 1º, § 1º)."
    },
    {
     "t": "Conceito legal de dolo",
     "d": "a vontade livre e consciente de alcançar o resultado ilícito tipificado nos arts. 9º, 10 e 11, não bastando a voluntariedade do agente (art. 1º, § 2º)."
    },
    {
     "t": "Cláusula de fechamento",
     "d": "o mero exercício da função ou o desempenho de competências públicas, sem comprovação de ato doloso com fim ilícito, afasta a responsabilidade (art. 1º, § 3º)."
    },
    {
     "t": "Não diga \"dolo específico\"",
     "d": "a lei não usa a expressão. A finalidade específica de obter proveito ou benefício indevido está no art. 11, §§ 1º e 2º — cite o dispositivo do tipo que você está imputando, e não um rótulo doutrinário."
    },
    {
     "t": "Constitucionalidade",
     "d": "o STF declarou constitucionais o art. 1º, §§ 1º, 2º e 3º, e o art. 10, na ADI 7236 (Pleno, Rel. Min. Alexandre de Moraes, sessão de 28/05/2026), e deu interpretação conforme ao art. 1º, § 8º, para assentar que a divergência interpretativa não configura improbidade, exceto quando evidenciado dolo ou erro grosseiro, nos termos do art. 14 do Decreto 9.830/2019."
    },
    {
     "t": "Culposo não existe mais",
     "d": "e a lei nova se aplica aos atos culposos praticados antes, desde que não haja condenação transitada em julgado — cabendo ao juízo analisar eventual dolo (tese 3 do Tema 1199)."
    }
   ],
   "lei": [
    "Dolo como elemento dos tipos — Lei 8.429/1992, art. 1º, § 1º",
    "Conceito de dolo — Lei 8.429/1992, art. 1º, § 2º",
    "Exercício regular da função — Lei 8.429/1992, art. 1º, § 3º",
    "Divergência interpretativa — Lei 8.429/1992, art. 1º, § 8º"
   ],
   "juris": [
    "Exigência de dolo e regime de transição — Tema 1199 do STF, ARE 843.989, Pleno, Rel. Min. Alexandre de Moraes, 18/08/2022",
    "Constitucionalidade do art. 1º, §§ 1º a 3º, e do art. 10 — STF, ADI 7236, sessão de 28/05/2026"
   ],
   "modelo": "O requerido agiu com vontade livre e consciente de alcançar o resultado ilícito, como demonstram: (i) a dispensa de licitação formalizada em .../.../..., quando já havia parecer da própria Procuradoria (fl. ...) apontando a inviabilidade jurídica da contratação; (ii) a assinatura do contrato no mesmo dia do parecer contrário; (iii) o vínculo societário do contratado com o requerido, documentado à fl. ... .\n\nNão se trata, portanto, de mero exercício de competência pública nem de divergência interpretativa (art. 1º, §§ 2º, 3º e 8º, da Lei 8.429/1992), mas de conduta dolosa dirigida ao fim ilícito.",
   "erro": "Afirmar \"o requerido agiu dolosamente\" sem descrever os fatos que revelam o dolo. É o erro que mais derruba nota nessa peça desde 2021."
  },
  {
   "nome": "Tipificação — art. 9º, 10 ou 11",
   "deve": "Escolher o tipo e narrar a conduta que se ajusta a ele. A imputação por tipo errado tem consequências processuais próprias.",
   "itens": [
    {
     "t": "Art. 9º",
     "d": "enriquecimento ilícito — auferir vantagem patrimonial indevida em razão do cargo. Exige acréscimo patrimonial."
    },
    {
     "t": "Art. 10",
     "d": "prejuízo ao erário — ação ou omissão dolosa que enseje perda patrimonial efetiva. O dano deve ser efetivo e comprovado; dano presumido não basta, salvo a hipótese legal do art. 10, VIII, na leitura que exige demonstração."
    },
    {
     "t": "Art. 11",
     "d": "violação de princípios. O caput passou a exigir ação ou omissão dolosa \"caracterizada por uma das seguintes condutas\" — daí a taxatividade. Atenção ao rol vigente: a Lei 14.230/2021 (art. 4º, VI) revogou apenas os incisos I, II, IX e X; VII e VIII permanecem; XI e XII foram acrescidos. Rol atual: III, IV, V, VI, VII, VIII, XI e XII."
    },
    {
     "t": "Não diga que a lei chama o rol de taxativo",
     "d": "ela não usa essa palavra. A taxatividade decorre da cláusula \"caracterizada por uma das seguintes condutas\"."
    },
    {
     "t": "Constitucionalidade",
     "d": "o STF declarou constitucionais o art. 11, caput, e a revogação dos incisos I e II (ADI 7236, vencido o Min. Edson Fachin) e o art. 11, caput, incisos I e II e §§ 3º e 4º (ADI 7156), na sessão de 28/05/2026."
    }
   ],
   "lei": [
    "Enriquecimento ilícito — Lei 8.429/1992, art. 9º",
    "Prejuízo ao erário — Lei 8.429/1992, art. 10",
    "Violação de princípios — Lei 8.429/1992, art. 11",
    "Rol e parágrafos do art. 11 — Lei 8.429/1992, art. 11, §§ 1º a 5º"
   ],
   "juris": [
    "Constitucionalidade do art. 11, caput, e da revogação dos incisos I e II — STF, ADI 7156 e ADI 7236, sessão de 28/05/2026"
   ],
   "erro": "Imputar violação de princípios por conduta que não corresponde a nenhum inciso vigente do art. 11. Depois de 2021 o tipo aberto acabou."
  },
  {
   "nome": "Indisponibilidade de bens — o pedido que mais mudou",
   "deve": "Pedir a indisponibilidade com o regime atual, que não é o da lei escrita nem o do STJ de 2014.",
   "itens": [
    {
     "t": "Base legal",
     "d": "art. 16 da LIA: pedido em caráter antecedente ou incidente, para garantir a integral recomposição do erário ou do acréscimo patrimonial resultante de enriquecimento ilícito. O § 8º manda aplicar, no que couber, o regime da tutela provisória de urgência do CPC."
    },
    {
     "t": "O que o STF derrubou",
     "d": "nas ADI 7156 e ADI 7236 (Pleno, sessão de 24/06/2026, com efeitos ex nunc), foram declaradas inconstitucionais as expressões \"apenas\" e \"mediante a demonstração no caso concreto de perigo de dano irreparável ou de risco ao resultado útil do processo\" (§ 3º); \"não podendo a urgência ser presumida\" (§ 4º); e \"sem incidir sobre os valores a serem eventualmente aplicados a título de multa civil ou sobre acréscimo patrimonial decorrente de atividade lícita\" (§ 10)."
    },
    {
     "t": "O que passou a valer",
     "d": "com interpretação conforme aos §§ 3º, 4º e 10, o STF admitiu, em hipóteses excepcionais e com decisão fundamentada, a indisponibilidade com base em tutela de evidência e a presunção de urgência; e assentou, como regra geral, que a medida recai sobre montante suficiente para garantir o integral ressarcimento, podendo abranger a multa civil e o enriquecimento ilícito, e alcançando, até esse limite, a integralidade dos bens dos requeridos, independentemente da origem, observadas as impenhorabilidades legais."
    },
    {
     "t": "Temas do STJ que não podem mais ser citados",
     "d": "o Tema 701 (periculum in mora presumido, REsp 1.366.721/BA, 2014) e o Tema 1055 (inclusão da multa civil) foram CANCELADOS em razão do Tema Repetitivo 1257 (REsp 2.074.601/MG, 1ª Seção, Rel. Min. Afrânio Vilela, 06/02/2025, DJEN 13/02/2025)."
    },
    {
     "t": "Tema 1257",
     "d": "as disposições da Lei 14.230/2021 aplicam-se aos processos em curso para regular o procedimento da tutela de indisponibilidade, podendo as medidas já deferidas ser reapreciadas para adequação."
    },
    {
     "t": "Limites objetivos",
     "d": "§ 13 (40 salários mínimos) e § 14 (bem de família) continuam vigentes."
    }
   ],
   "lei": [
    "Indisponibilidade de bens — Lei 8.429/1992, art. 16",
    "Regime da tutela de urgência — Lei 8.429/1992, art. 16, § 8º",
    "Tutela de urgência — CPC, art. 300",
    "Tutela de evidência — CPC, art. 311"
   ],
   "juris": [
    "Indisponibilidade: inconstitucionalidade parcial dos §§ 3º, 4º e 10 do art. 16, com efeitos ex nunc — STF, ADI 7156 e ADI 7236, sessão de 24/06/2026",
    "Aplicação da Lei 14.230/2021 aos processos em curso quanto à indisponibilidade — Tema Repetitivo 1257 do STJ, REsp 2.074.601/MG, 1ª Seção, Rel. Min. Afrânio Vilela, 06/02/2025",
    "Temas 701 e 1055 do STJ cancelados em razão do Tema 1257 — DJEN de 13/02/2025"
   ],
   "modelo": "Requer, em caráter incidente, a decretação da indisponibilidade dos bens dos requeridos, nos termos do art. 16 da Lei 8.429/1992, em montante suficiente a garantir o integral ressarcimento do dano ao erário, a multa civil e o acréscimo patrimonial decorrente do enriquecimento ilícito, alcançando a integralidade dos bens até esse limite, independentemente de sua origem, observadas as impenhorabilidades legais — na exata linha do que assentaram o Supremo Tribunal Federal nas ADI 7156 e 7236 (sessão de 24/06/2026) e o § 8º do art. 16, que remete ao regime da tutela provisória de urgência.",
   "erro": "Fundamentar a indisponibilidade no Tema 701 do STJ. Ele foi cancelado em fevereiro de 2025 — citá-lo é assinar que o material de estudo parou em 2014."
  },
  {
   "nome": "Sanções e dosimetria",
   "deve": "Pedir as sanções do art. 12 correspondentes ao tipo imputado, com proporcionalidade fundamentada.",
   "itens": [
    {
     "t": "Art. 12, I (art. 9º)",
     "d": "perda dos bens ou valores acrescidos ilicitamente, perda da função pública, suspensão dos direitos políticos até 14 anos, multa civil equivalente ao valor do acréscimo patrimonial e proibição de contratar ou receber benefícios por até 14 anos."
    },
    {
     "t": "Art. 12, II (art. 10)",
     "d": "ressarcimento integral, perda dos bens se houver acréscimo, perda da função pública, suspensão até 12 anos, multa equivalente ao valor do dano e proibição de contratar por até 12 anos."
    },
    {
     "t": "Art. 12, III (art. 11)",
     "d": "multa civil de até 24 vezes a remuneração do agente e proibição de contratar por até 4 anos. NÃO há perda da função pública nem suspensão de direitos políticos na violação de princípios."
    },
    {
     "t": "Onde está a proporcionalidade",
     "d": "não no § 1º. Está no caput do art. 12 (\"de acordo com a gravidade do fato\"), no § 5º (atos de menor ofensa, sanção limitada à multa) e, sobretudo, no art. 17-C, IV, \"a\", que manda observar os princípios da proporcionalidade e da razoabilidade, com os critérios de dosimetria das alíneas seguintes."
    },
    {
     "t": "O que o STF mexeu no art. 12",
     "d": "na sessão de 28/05/2026 declarou inconstitucional o § 4º e constitucionais os incisos I e II e o § 9º; na sessão de 24/06/2026 declarou inconstitucional o § 10 e, no § 1º, as expressões \"apenas\" e \", na hipótese do inciso I do caput deste artigo, e em caráter excepcional,\", dando interpretação conforme à expressão \"podendo\", que passa a ser poder-dever. Quanto ao inciso III, manteve-se a autoridade da cautelar da ADI 6.678/DF, que afasta a suspensão de direitos políticos nos atos violadores de princípios desde 1º/10/2021."
    }
   ],
   "lei": [
    "Sanções — Lei 8.429/1992, art. 12",
    "Atos de menor ofensa — Lei 8.429/1992, art. 12, § 5º",
    "Requisitos da sentença e dosimetria — Lei 8.429/1992, art. 17-C, IV"
   ],
   "juris": [
    "Inconstitucionalidade do art. 12, §§ 4º e 10, e das expressões do § 1º — STF, ADI 7156 e ADI 7236, sessões de 28/05/2026 e 24/06/2026"
   ],
   "modelo": "Requer, ao final, a procedência dos pedidos para condenar os requeridos, pela prática do ato de improbidade descrito no art. 10, VIII, da Lei 8.429/1992, às sanções do art. 12, II, do mesmo diploma, a saber: (i) ressarcimento integral do dano, no valor de R$ ..., corrigido e acrescido de juros; (ii) perda da função pública; (iii) suspensão dos direitos políticos pelo prazo de ... anos; (iv) multa civil equivalente ao valor do dano; (v) proibição de contratar com o Poder Público ou receber benefícios fiscais ou creditícios pelo prazo de ... anos — observados, na dosimetria, os critérios do art. 17-C, IV, da Lei 8.429/1992.",
   "erro": "Pedir perda da função pública e suspensão de direitos políticos em imputação fundada no art. 11. O art. 12, III, não as prevê."
  },
  {
   "nome": "Prescrição, acordo e o procedimento",
   "deve": "Antecipar as defesas processuais — prescrição, ANPC e a independência das instâncias.",
   "itens": [
    {
     "t": "Prazo",
     "d": "oito anos, contados da ocorrência do fato ou, nas infrações permanentes, do dia em que cessou a permanência (art. 23, caput)."
    },
    {
     "t": "Interrupção e a regra da metade",
     "d": "os marcos interruptivos estão no § 4º (declarados constitucionais na ADI 7156, sessão de 01/07/2026, quanto aos incisos II a V). O § 5º dizia que, interrompida a prescrição, o prazo recomeçava pela metade — o STF declarou inconstitucional a expressão \"pela metade do prazo previsto no caput deste artigo\", fixando prazo máximo de 20 anos de prescrição (ADI 7156 e ADI 7236, sessão de 01/07/2026)."
    },
    {
     "t": "Prescrição intercorrente",
     "d": "está no § 8º, e não no § 5º. O juiz a reconhece e decreta de ofício quando, entre os marcos do § 4º, transcorre o prazo do § 5º. Trocar os parágrafos é erro que a banca lê como desconhecimento do sistema."
    },
    {
     "t": "Regime de transição",
     "d": "o novo regime prescricional é irretroativo, aplicando-se os novos marcos a partir da publicação da lei — DOU de 26/10/2021 (tese 4 do Tema 1199). E cuidado: o Tema 1199 tem quatro teses e nenhuma delas é sobre prescrição intercorrente. Não invente uma quinta."
    },
    {
     "t": "Acordo de não persecução civil",
     "d": "art. 17-B. Resultados mínimos: integral ressarcimento do dano e reversão à pessoa jurídica lesada da vantagem indevida. Requisitos cumulativos do § 1º: oitiva do ente lesado, aprovação em até 60 dias pelo órgão do MP competente para apreciar promoções de arquivamento de inquérito civil (se anterior ao ajuizamento) e homologação judicial. Pode ser celebrado na investigação, no curso da ação ou na execução (§ 4º). Descumprido, impede novo acordo por cinco anos (§ 7º). Duas atualizações: o acordo também pode ser celebrado pelas pessoas jurídicas interessadas (ADI 7042/7043) e o § 3º, que exigia oitiva do Tribunal de Contas, foi declarado inconstitucional em 24/06/2026."
    },
    {
     "t": "Independência das instâncias",
     "d": "art. 21. O inciso I dispensa a efetiva ocorrência de dano, salvo quanto ao ressarcimento e às condutas do art. 10; o inciso II dispensa a aprovação ou rejeição das contas. O § 4º, na letra da lei, faz a absolvição criminal por qualquer dos fundamentos do art. 386 do CPP impedir a ação — mas o STF, na sessão de 25/06/2026 (ADI 7156 e ADI 7236, por unanimidade), deu interpretação conforme: só impedem a tramitação as hipóteses dos arts. 65, 386, I, e 386, IV, do CPP, e exige-se decisão criminal transitada em julgado, e não apenas confirmada por colegiado."
    },
    {
     "t": "Rito",
     "d": "não há mais notificação prévia para defesa preliminar: a Lei 14.230/2021 (art. 4º, X) revogou os antigos §§ 8º e 9º do art. 17, e o § 7º ganhou redação nova — estando a inicial em devida forma, o juiz manda autuá-la e cita os requeridos para contestar em 30 dias comuns. O controle de admissibilidade está no § 6º-B, que manda REJEITAR a inicial nos casos do art. 330 do CPC, quando não preenchidos os requisitos dos incisos I e II do § 6º, ou quando manifestamente inexistente o ato imputado."
    },
    {
     "t": "Requisitos da inicial na LIA",
     "d": "o § 6º do art. 17 exige (I) individualizar a conduta do réu e apontar os elementos probatórios mínimos que demonstrem a ocorrência das hipóteses dos arts. 9º, 10 e 11 e sua autoria, salvo impossibilidade devidamente fundamentada; e (II) instruir com documentos ou justificação que contenham indícios suficientes ou com razões fundamentadas da impossibilidade. A emenda segue o art. 321 do CPC, aplicável por força do caput do art. 17 — a LIA não tem regra própria de emenda."
    },
    {
     "t": "O que caiu do procedimento",
     "d": "o § 10-C (o juiz indicaria com precisão a tipificação, vedada a modificação do fato principal e da capitulação) e o § 10-F, I (nulidade da decisão que condenasse por tipo diverso do da inicial) foram declarados inconstitucionais na sessão de 24/06/2026. Ou seja: não há mais vinculação do juiz à capitulação da inicial."
    }
   ],
   "lei": [
    "Prescrição — Lei 8.429/1992, art. 23",
    "Prescrição intercorrente — Lei 8.429/1992, art. 23, § 8º",
    "Acordo de não persecução civil — Lei 8.429/1992, art. 17-B",
    "Independência das instâncias — Lei 8.429/1992, art. 21",
    "Requisitos da inicial — Lei 8.429/1992, art. 17, § 6º",
    "Rejeição da inicial — Lei 8.429/1992, art. 17, § 6º-B",
    "Citação e prazo de contestação — Lei 8.429/1992, art. 17, § 7º",
    "Emenda da inicial — CPC, art. 321"
   ],
   "juris": [
    "Quatro teses sobre dolo, irretroatividade e regime prescricional — Tema 1199 do STF, ARE 843.989, Pleno, Rel. Min. Alexandre de Moraes, 18/08/2022",
    "Inconstitucionalidade da regra da metade no art. 23, § 5º, com teto de 20 anos — STF, ADI 7156 e ADI 7236, sessão de 01/07/2026",
    "Interpretação conforme ao art. 21, § 4º: só arts. 65, 386, I, e 386, IV, do CPP impedem a ação — STF, ADI 7156 e ADI 7236, sessão de 25/06/2026",
    "Inconstitucionalidade dos arts. 17, §§ 10-C, 10-D e 10-F, I, e 17-B, § 3º — STF, ADI 7156 e ADI 7236, sessão de 24/06/2026"
   ],
   "erro": "Sustentar que a prescrição intercorrente corre pela metade do prazo. A expressão foi declarada inconstitucional em 01/07/2026 e o STF fixou teto de 20 anos."
  }
 ],
 "cego": [
  "Legitimidade ativa fundamentada com a ADI 7042/7043",
  "Legitimidade passiva do agente (art. 2º) e do terceiro (art. 3º, com dolo)",
  "Competência do juízo cível de primeiro grau",
  "Dolo descrito como fato, não afirmado como conclusão",
  "Afastamento expresso do art. 1º, §§ 3º e 8º (exercício da função e divergência interpretativa)",
  "Tipo escolhido entre arts. 9º, 10 e 11, com o inciso vigente",
  "Dano efetivo demonstrado, quando a imputação for do art. 10",
  "Indisponibilidade pedida no regime pós-24/06/2026",
  "Sanções do art. 12 correspondentes ao tipo imputado",
  "Dosimetria fundamentada pelo art. 17-C, IV",
  "Prescrição enfrentada (art. 23, caput, § 4º e § 8º)",
  "Manifestação sobre o acordo de não persecução civil",
  "Requisitos do art. 17, § 6º, I e II, atendidos",
  "Pedido de citação para contestar em 30 dias (art. 17, § 7º)"
 ],
 "dicas": [
  {
   "t": "Nona peça mais cobrada do banco de provas aplicadas: 27 ocorrências.",
   "alerta": false
  },
  {
   "t": "A improbidade é a matéria que mais mudou entre 2021 e 2026. O texto da Lei 8.429/1992 no Planalto não reflete o que o STF decidiu nas ADI 7042, 7043, 7156 e 7236 — escrever pela letra da lei, hoje, é escrever errado em pelo menos quatro pontos.",
   "alerta": true
  },
  "Comece pelo dolo. Sem ele narrado como fato, o resto da peça não sustenta imputação nenhuma (art. 1º, §§ 1º a 3º).",
  {
   "t": "O Tema 1199 tem exatamente quatro teses e nenhuma trata de prescrição intercorrente. Atribuir-lhe uma quinta tese é erro que o examinador identifica na hora.",
   "alerta": true
  },
  "A tese 2 do Tema 1199 (irretroatividade da revogação da culpa) só vale contra a coisa julgada e a execução. Para processo em curso sem trânsito, a lei nova se aplica e o juízo analisa eventual dolo (tese 3). Citar a tese 2 sozinha é meia-verdade.",
  "Prescrição intercorrente é o § 8º do art. 23; a regra da metade era o § 5º — e a expressão foi declarada inconstitucional em 01/07/2026.",
  "O art. 11 não tem mais os incisos I, II, IX e X. Conferir o inciso antes de citar evita imputar por dispositivo revogado.",
  "Não existe mais defesa prévia antes do recebimento. A inicial é rejeitada pelo § 6º-B ou os réus são citados para contestar em 30 dias (§ 7º)."
 ],
 "especiais": [
  {
   "t": "Improbidade e ressarcimento ao erário",
   "d": "A pretensão de ressarcimento por ato doloso de improbidade é imprescritível — Tema 897 do STF, RE 852.475, Pleno, 08/08/2018. Confira o número antes de citar: é o único ponto em que a imprescritibilidade sobreviveu, e não alcança as demais sanções."
  },
  {
   "t": "Improbidade de agente político",
   "d": "O STF admite a concomitância entre o regime da Lei 8.429/1992 e o de crime de responsabilidade, salvo para os agentes submetidos à Lei 1.079/1950 nas hipóteses ali previstas. Verifique o cargo antes de imputar."
  },
  {
   "t": "Improbidade e Tribunal de Contas",
   "d": "O art. 21, II, dispensa a aprovação ou rejeição das contas. A decisão do Tribunal de Contas não vincula o juízo cível — e o § 3º do art. 17-B, que exigia sua oitiva para apurar o dano no acordo, foi declarado inconstitucional em 24/06/2026."
  },
  {
   "t": "Improbidade e ação civil pública",
   "d": "São ações distintas: a de improbidade tem procedimento próprio na LIA e sanções pessoais; a ACP tutela o patrimônio público sem aplicar as sanções do art. 12. Cumular pedidos das duas na mesma inicial é erro de estrutura."
  },
  {
   "t": "Improbidade contra pessoa jurídica de direito privado",
   "d": "A responsabilização da empresa por atos contra a administração segue a Lei 12.846/2013 (anticorrupção). Na LIA, o particular responde como terceiro do art. 3º, e o § 1º exige dolo."
  }
 ]
},

// ═══════════════════════ PROCURADORIAS ═══════════════════════
'Contestação da Fazenda Pública': {
  rito: 'Previdenciário — concessão de benefício',
  freq: 4,   // vezes em que o tema aparece nas 648 provas de discursivas.js
  carreiras: ['Procuradorias','Advocacia Pública'],
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
},
// ═══════════════════════ POLÍCIA JUDICIÁRIA ═══════════════════════
'Relatório de inquérito': {
  rito: 'Penal — procedimento comum',
  freq: 5,   // vezes em que o tema aparece nas 648 provas de discursivas.js
  carreiras: ['Delegado'],
  sobre: 'Peça que encerra o inquérito. Não é acusação nem sentença: é a exposição minuciosa do que foi apurado, com a conclusão da autoridade sobre autoria, materialidade e tipificação provisória. Onde o candidato perde ponto é excedendo — opinando sobre a viabilidade da ação penal — ou faltando: deixando de fundamentar o indiciamento.',
  blocos: [
    { nome: 'Cabeçalho e identificação',
      deve: 'Abrir com a identificação do procedimento e das pessoas, e situar o examinador em quatro linhas: o que se apurou, quando, onde e contra quem.',
      itens: [
        { t:'Dados do procedimento', d:'número do inquérito, data e forma de instauração — portaria de ofício, requisição do MP ou do juiz, requerimento do ofendido ou auto de prisão em flagrante.' },
        { t:'Qualificação completa', d:'do investigado e do ofendido: nome, filiação, nascimento, naturalidade, estado civil, profissão, documentos e endereço.' },
        { t:'Prazo', d:'registrar se o investigado está preso — 10 dias, improrrogáveis — ou solto — 30 dias, prorrogáveis. O prazo é o primeiro item que a banca confere.' }
      ],
      lei: ['Formas de instauração — CPP, art. 5º',
            'Prazos de conclusão — CPP, art. 10',
            'Prisão temporária e prazos — Lei 7.960/89, art. 2º'],
      juris: [],
      modelo: 'PORTARIA nº .../..., instaurada em .../.../..., a partir de ... (requisição / requerimento / auto de prisão em flagrante).\n\nINVESTIGADO: ..., brasileiro, ..., filho de ... e ..., nascido em .../.../..., natural de ..., portador do RG nº ... e do CPF nº ..., residente e domiciliado em ....\n\nVÍTIMA: ....\n\nSituação prisional: o investigado encontra-se PRESO desde .../.../..., em razão de ..., razão pela qual o prazo de conclusão é de 10 dias (art. 10 do CPP).',
      erro: 'Omitir a situação prisional. Dela dependem o prazo, a urgência da remessa e a eventual representação por prorrogação — três itens de espelho de uma vez.' },
    { nome: 'Histórico dos fatos e diligências realizadas',
      deve: 'Narrar o fato apurado e, em seguida, listar o que foi feito. Cada diligência com a folha em que está documentada — o relatório é um mapa dos autos, não um resumo de impressões.',
      itens: [
        { t:'Narrativa do fato', d:'com data, local, modo de execução e resultado, na sequência cronológica.' },
        { t:'Prova pericial', d:'exame de corpo de delito, laudo de local, laudo da arma, exame nos instrumentos do crime — e, faltando, a razão da ausência.' },
        { t:'Prova oral', d:'depoimentos do ofendido, das testemunhas e o interrogatório do investigado, com a síntese do que cada um disse.' },
        { t:'Cadeia de custódia', d:'registrar o rastreamento dos vestígios: coleta, acondicionamento, transporte e recebimento. É item novo no CPP e cobrado com frequência.' },
        { t:'Medidas cautelares deferidas', d:'busca e apreensão, quebras de sigilo, interceptação — com o número do processo incidental e a decisão que as autorizou.' }
      ],
      lei: ['Providências da autoridade policial — CPP, art. 6º',
            'Reconhecimento de pessoas — CPP, art. 226',
            'Cadeia de custódia — CPP, arts. 158-A a 158-F',
            'Apreensão dos instrumentos do crime — CPP, art. 11',
            'Interceptação telefônica — Lei 9.296/96, arts. 1º e 2º'],
      juris: ['Acesso do defensor aos elementos já documentados — Súmula Vinculante 14',
              'Inobservância do procedimento do art. 226 do CPP invalida o reconhecimento — STJ, HC 598.886/SC, 6ª Turma, j. 27/10/2020'],
      erro: 'Relatar diligência sem indicar a folha. O relatório serve para o promotor e o juiz localizarem a prova; sem a remissão, ele não cumpre a função.' },
    { nome: 'Indiciamento — ato privativo e fundamentado',
      deve: 'O indiciamento é ato privativo do delegado e exige fundamentação: indicar por que os elementos convergem para aquela pessoa. Não é etapa automática do encerramento.',
      itens: [
        { t:'Fundamentação', d:'apontar os elementos de autoria e materialidade que sustentam a atribuição, um a um.' },
        { t:'Quem não se indicia', d:'não há indiciamento depois de oferecida a denúncia, nem de quem tem foro por prerrogativa de função sem prévia autorização do tribunal.' },
        { t:'Formalização', d:'lavratura do termo, identificação criminal quando cabível e comunicação aos órgãos de identificação.' }
      ],
      lei: ['Indiciamento como ato privativo, mediante despacho fundamentado — Lei 12.830/2013, art. 2º, § 6º',
            'Identificação criminal — Lei 12.037/2009, arts. 3º e 5º-A',
            'Comunicação ao instituto de identificação — CPP, art. 23'],
      juris: ['Não cabe indiciamento após o recebimento da denúncia'],
      modelo: 'Do conjunto probatório colhido, extrai-se que ... (síntese dos elementos de autoria).\n\nPresentes indícios suficientes de autoria e prova da materialidade, INDICIO FULANO DE TAL, já qualificado, pela prática, em tese, do delito previsto no art. ... do Código Penal, lavrando-se o respectivo termo, com as anotações e comunicações de praxe.',
      erro: 'Indiciar em uma linha ("indicio o investigado pelo crime tal"). O § 6º do art. 2º da Lei 12.830/2013 exige despacho fundamentado — indiciamento sem motivo escrito é nulo e trancável por habeas corpus.' },
    { nome: 'Tipificação provisória e circunstâncias',
      deve: 'Classificar o fato, sempre em caráter provisório, e apontar as circunstâncias que importam para a acusação — qualificadoras, causas de aumento, concurso de agentes, tentativa.',
      itens: [
        { t:'Capitulação provisória', d:'a classificação da autoridade não vincula o Ministério Público, que é o titular da ação penal.' },
        { t:'Circunstâncias relevantes', d:'qualificadoras e causas de aumento com o fato que as sustenta; concurso de pessoas com a conduta de cada um; tentativa com o iter percorrido.' },
        { t:'Causas de extinção da punibilidade', d:'verificar prescrição, decadência e representação — se já extintas, o relatório aponta e remete, mas não arquiva.' }
      ],
      lei: ['Titularidade da ação penal — CF, art. 129, I',
            'Extinção da punibilidade — CP, art. 107',
            'Prazo decadencial da representação — CPP, art. 38'],
      juris: [],
      erro: 'Tratar a capitulação como definitiva. O relatório sugere; quem classifica na denúncia é o Ministério Público, e o juiz ainda pode corrigir por emendatio.' },
    { nome: 'Conclusão, representações e remessa',
      deve: 'Fechar com a conclusão sobre o apurado, as representações necessárias e a remessa. Havendo diligência faltante, dizer qual é e por que é imprescindível.',
      itens: [
        { t:'Conclusão', d:'apurado o fato e a autoria, ou não apurados — e, nesse caso, o que falta.' },
        { t:'Representações', d:'por prisão preventiva, temporária, medidas cautelares diversas ou dilação de prazo, cada uma fundamentada em dispositivo próprio.' },
        { t:'Remessa', d:'autos ao juízo competente, com os instrumentos do crime e os objetos apreendidos.' },
        { t:'Se faltar diligência', d:'a devolução do inquérito ao delegado só cabe para diligências imprescindíveis ao oferecimento da denúncia.' }
      ],
      lei: ['Remessa dos autos ao juízo — CPP, art. 10, § 1º',
            'Devolução para diligências imprescindíveis — CPP, art. 16',
            'Instrumentos e objetos apreendidos — CPP, arts. 11 e 12',
            'Representação por prisão preventiva — CPP, art. 311'],
      juris: [],
      modelo: 'Diante de todo o apurado, entendo esclarecidas a materialidade e a autoria do delito, motivo pelo qual RELATO o presente inquérito policial.\n\nRepresento pela decretação da prisão preventiva do indiciado, com fundamento nos arts. 311, 312 e 313, I, do Código de Processo Penal, uma vez que ....\n\nRemetam-se os autos ao Juízo da ... Vara Criminal da Comarca de ..., acompanhados dos instrumentos do crime e dos objetos apreendidos, dando-se ciência ao Ministério Público.\n\nCumpra-se.\n\nLocal, data.\nDelegado de Polícia',
      erro: 'Concluir opinando sobre a conveniência da denúncia ou pedindo o arquivamento. A autoridade policial não pode arquivar inquérito — o art. 17 do CPP é expresso, e o arquivamento é atribuição do Ministério Público, com submissão à instância de revisão.' }
  ],
  cego: ['Número, data e forma de instauração','Qualificação completa do investigado e da vítima',
    'Situação prisional e prazo indicados','Fato narrado com data, local e modo',
    'Diligências listadas com a folha de cada uma','Cadeia de custódia registrada',
    'Indiciamento fundamentado, não automático','Capitulação provisória com as circunstâncias',
    'Extinção da punibilidade verificada','Representações cautelares fundamentadas',
    'Remessa ao juízo com instrumentos e objetos','Sem pedido de arquivamento (art. 17)']
},

// ═══════════════════════ DEFESA ═══════════════════════
'Alegações finais da defesa': {
  rito: 'Penal — procedimento comum',
  freq: 16,   // vezes em que o tema aparece nas 648 provas de discursivas.js
  carreiras: ['Defensoria','Advocacia'],
  sobre: 'A última palavra da defesa antes da sentença. A peça vale pela ARQUITETURA: preliminares primeiro, mérito depois, e — mesmo pedindo absolvição — os pedidos subsidiários de dosimetria no fim. Defesa que só pede absolvição e é vencida entrega a dosimetria de presente à acusação.',
  blocos: [
    { nome: 'Forma, prazo e delimitação',
      deve: 'Memoriais em 5 dias quando os debates são convertidos; orais em 20 minutos, prorrogáveis por 10, na audiência. Abrir delimitando o que se vai sustentar, na ordem em que se vai sustentar.',
      itens: [
        { t:'Debates orais', d:'20 minutos para cada parte, prorrogáveis por mais 10; o assistente fala depois do Ministério Público, por 10 minutos.' },
        { t:'Memoriais escritos', d:'5 dias, quando a causa for complexa ou houver muitos acusados, ou quando houver diligências do art. 402.' },
        { t:'Ausência é nulidade', d:'a falta de alegações finais da defesa é nulidade absoluta — o juiz deve intimar e, persistindo a omissão, nomear defensor.' }
      ],
      lei: ['Debates orais — CPP, art. 403',
            'Conversão em memoriais — CPP, art. 403, § 3º',
            'Memoriais após diligências — CPP, art. 404, parágrafo único',
            'Nulidade por falta de defesa — CPP, art. 564, IV'],
      juris: ['Nenhum acusado será processado ou julgado sem defensor — CPP, art. 261'],
      erro: 'Apresentar memorial genérico de meia página. Súmula 523 do STF: no processo penal a falta de defesa constitui nulidade absoluta, e a defesa deficiente só anula se houver prova de prejuízo — mas em prova, defesa rasa é nota rasa.' },
    { nome: 'Preliminares e nulidades',
      deve: 'Antes do mérito, tudo que pode encerrar ou anular: incompetência, ilicitude da prova, cerceamento, quebra da cadeia de custódia, inépcia remanescente e extinção da punibilidade.',
      itens: [
        { t:'Prova ilícita e derivada', d:'pedir o desentranhamento e apontar a contaminação por derivação, salvo fonte independente ou descoberta inevitável.' },
        { t:'Cadeia de custódia', d:'a quebra compromete a confiabilidade do vestígio; sustentar a inadmissibilidade ou, ao menos, o valor probatório reduzido.' },
        { t:'Reconhecimento pessoal', d:'a inobservância do art. 226 do CPP é ponto sensível na jurisprudência recente.' },
        { t:'Extinção da punibilidade', d:'prescrição, decadência, perempção, retratação nos casos legais.' }
      ],
      lei: ['Provas ilícitas e derivadas — CPP, art. 157 e §§',
            'Cadeia de custódia — CPP, arts. 158-A a 158-F',
            'Reconhecimento de pessoas — CPP, art. 226',
            'Nulidades — CPP, arts. 563 a 573',
            'Extinção da punibilidade — CP, art. 107'],
      juris: ['Inobservância do art. 226 do CPP invalida o reconhecimento — STJ, HC 598.886/SC, 6ª Turma, j. 27/10/2020'],
      modelo: 'DAS PRELIMINARES\n\n1. DA ILICITUDE DA PROVA E DE SUAS DERIVADAS\n\nA prova de fl. ... foi obtida mediante ..., em violação ao art. ... da Constituição. Nos termos do art. 157, caput e § 1º, do Código de Processo Penal, é inadmissível a prova ilícita e a dela derivada, quando evidenciado o nexo de causalidade.\n\nRequer-se, pois, o desentranhamento da prova de fl. ... e o reconhecimento da contaminação de ..., por derivação.',
      erro: 'Alegar nulidade sem apontar o prejuízo concreto. O art. 563 do CPP consagra o pas de nullité sans grief, e nulidade afirmada em abstrato é rejeitada em uma linha.' },
    { nome: 'Mérito — atacar o que a acusação precisa provar',
      deve: 'A defesa não precisa provar inocência: precisa mostrar que a acusação não provou. Percorrer, na ordem, materialidade, autoria e tipicidade, e mostrar onde a prova não fecha.',
      itens: [
        { t:'Materialidade', d:'ausência de laudo, laudo inconclusivo, vestígio não periciado quando a infração deixa vestígios.' },
        { t:'Autoria', d:'fragilidade do reconhecimento, contradição entre depoimentos, prova apoiada só no inquérito.' },
        { t:'Tipicidade', d:'falta de elementar, ausência de dolo, atipicidade material pela insignificância.' },
        { t:'Excludentes', d:'legítima defesa, estado de necessidade, inexigibilidade de conduta diversa — sustentadas depois de firmado o fato.' },
        { t:'In dubio pro reo', d:'não sendo possível a certeza, o resultado é a absolvição do art. 386, VII, e não a condenação por probabilidade.' }
      ],
      lei: ['Vedação à condenação apoiada só no inquérito — CPP, art. 155',
            'Ônus da prova — CPP, art. 156',
            'Exame de corpo de delito — CPP, art. 158',
            'Excludentes de ilicitude — CP, art. 23',
            'Erro de tipo e erro de proibição — CP, arts. 20 e 21'],
      juris: [],
      erro: 'Inverter o ônus e tentar provar a inocência. A tese que ganha é "a acusação não se desincumbiu do ônus do art. 156", não "o réu comprovou que não fez".' },
    { nome: 'Pedido principal — absolvição pelo inciso certo',
      deve: 'Pedir a absolvição indicando o inciso do art. 386. Cada inciso tem consequência diferente na esfera cível, e a banca observa a escolha.',
      itens: [
        { t:'Inexistência ou atipicidade', d:'incisos I, II e III — os mais fortes, porque fecham a discussão cível.' },
        { t:'Não concorreu para a infração', d:'incisos IV e V.' },
        { t:'Excludente ou dúvida sobre ela', d:'inciso VI, que abrange a fundada dúvida.' },
        { t:'Prova insuficiente', d:'inciso VII — a tese residual, sempre cumulável em caráter subsidiário.' }
      ],
      lei: ['Hipóteses de absolvição — CPP, art. 386, I a VII'],
      juris: [],
      modelo: 'Ante o exposto, requer a defesa:\n\na) preliminarmente, o desentranhamento da prova de fl. ... e o reconhecimento das nulidades apontadas;\n\nb) no mérito, a ABSOLVIÇÃO do acusado, com fundamento no art. 386, inciso III, do Código de Processo Penal, por não constituir o fato infração penal;\n\nc) subsidiariamente, a absolvição com fundamento no art. 386, inciso VII, do mesmo diploma, por não existir prova suficiente para a condenação;',
      erro: 'Pedir "a absolvição" sem inciso. É o mesmo erro da sentença, do lado da defesa — e custa igual.' },
    { nome: 'Pedidos subsidiários — a dosimetria antecipada',
      deve: 'Mesmo convicto da absolvição, formular os pedidos de dosimetria. Se o juiz condenar, a defesa já terá fixado o terreno: desclassificação, atenuantes, causas de diminuição, regime, substituição e detração.',
      itens: [
        { t:'Desclassificação', d:'para o tipo mais brando, ou reconhecimento da tentativa, ou da forma privilegiada.' },
        { t:'Primeira fase', d:'pena-base no mínimo, ausência de circunstâncias judiciais desfavoráveis, vedação ao uso de inquéritos em curso.' },
        { t:'Segunda fase', d:'confissão, menoridade relativa, coação resistível, motivo de relevante valor social ou moral.' },
        { t:'Terceira fase', d:'causas de diminuição no patamar máximo, com fundamento no iter percorrido ou na participação de menor importância.' },
        { t:'Efeitos da pena', d:'regime mais brando, substituição por restritivas, sursis, detração, direito de recorrer em liberdade e gratuidade da justiça.' }
      ],
      lei: ['Circunstâncias judiciais — CP, art. 59',
            'Atenuantes — CP, arts. 65 e 66',
            'Participação de menor importância — CP, art. 29, § 1º',
            'Regime inicial — CP, art. 33, §§ 2º e 3º',
            'Substituição — CP, art. 44',
            'Detração e recorrer em liberdade — CPP, art. 387, §§ 1º e 2º'],
      juris: ['Inquéritos e ações em curso não agravam a pena-base — Súmula 444 do STJ',
              'Confissão usada na convicção gera a atenuante — Súmula 545 do STJ',
              'Atenuante não reduz abaixo do mínimo — Súmula 231 do STJ'],
      erro: 'Não fazer os pedidos subsidiários por achar que enfraquece a tese principal. Não enfraquece — e sem eles, condenado o réu, a defesa perde a dosimetria sem ter disputado.' }
  ],
  cego: ['Forma e prazo corretos (orais ou memoriais)','Preliminares antes do mérito',
    'Prejuízo concreto apontado em cada nulidade','Prova ilícita: desentranhamento e derivação',
    'Materialidade atacada','Autoria atacada','Tipicidade e excludentes enfrentadas',
    'Ônus da prova imputado à acusação (art. 156)','Absolvição pedida com o inciso do art. 386',
    'Tese subsidiária do inciso VII','Desclassificação pedida, se cabível',
    'Atenuantes e causas de diminuição requeridas','Regime, substituição, sursis e detração',
    'Direito de recorrer em liberdade e gratuidade']
},

// ═══════════════════════ RECURSO CRIMINAL ═══════════════════════
'Apelação criminal': {
  rito: 'Penal — recursos',
  carreiras: ['Defensoria','Advocacia','Ministério Público'],
  sobre: 'Duas peças em uma: o termo de interposição, curto e no prazo de 5 dias, e as razões, em 8 dias. O que decide a nota é a DELIMITAÇÃO — o tribunal só devolve o que foi impugnado, e recurso exclusivo da defesa nunca pode piorar a situação do réu.',
  blocos: [
    { nome: 'Interposição — prazo, forma e legitimidade',
      deve: 'Interpor em 5 dias, por petição ou por termo nos autos. As razões vêm depois, em 8 dias — e podem ser apresentadas diretamente no tribunal.',
      itens: [
        { t:'Prazos', d:'5 dias para interpor, 8 para arrazoar; nas contravenções, 3 dias para as razões. No Juizado, a apelação é única, em 10 dias, já com as razões.' },
        { t:'Legitimidade', d:'o réu e o defensor podem apelar; havendo divergência, prevalece a vontade que amplia a defesa.' },
        { t:'Tempestividade', d:'o prazo corre da intimação; para o réu preso, da intimação pessoal; para o defensor público, da intimação pessoal com vista dos autos.' }
      ],
      lei: ['Cabimento da apelação — CPP, art. 593',
            'Prazo de interposição e razões — CPP, arts. 593 e 600',
            'Razões no tribunal — CPP, art. 600, § 4º',
            'Interposição por petição ou termo — CPP, art. 578',
            'Apelação no Juizado — Lei 9.099/95, art. 82'],
      juris: ['A renúncia do réu não impede o conhecimento da apelação do defensor — Súmula 705 do STF',
              'O conhecimento da apelação independe da prisão do réu — Súmula 347 do STJ'],
      modelo: 'EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ... VARA CRIMINAL DA COMARCA DE ...\n\nAutos nº ...\n\nFULANO DE TAL, já qualificado nos autos da ação penal em epígrafe, por seu defensor que esta subscreve, inconformado com a r. sentença de fls. ..., que o condenou às penas do art. ... do Código Penal, vem, respeitosamente e tempestivamente, com fundamento no art. 593, inciso I, do Código de Processo Penal, interpor APELAÇÃO CRIMINAL, requerendo o recebimento e a intimação para apresentação das razões no prazo legal, com posterior remessa ao Egrégio Tribunal de Justiça.\n\nTermos em que pede deferimento.',
      erro: 'Juntar as razões junto com a interposição e depois perceber que faltou matéria. Não é erro fatal, mas a lei separa os prazos justamente para dar fôlego — use os 8 dias.' },
    { nome: 'Delimitação do efeito devolutivo',
      deve: 'Dizer, logo no início das razões, se a apelação é total ou parcial. O tribunal conhece do que foi impugnado — o que não se pede, não se devolve.',
      itens: [
        { t:'Apelação parcial', d:'o recorrente pode limitar o recurso a parte da decisão, declarando-o na petição ou nas razões.' },
        { t:'Matéria de ordem pública', d:'nulidade absoluta e prescrição são conhecíveis de ofício, mesmo fora da delimitação.' },
        { t:'Efeito suspensivo', d:'a apelação da sentença condenatória suspende a execução, salvo no júri, onde a execução é imediata.' }
      ],
      lei: ['Apelação parcial — CPP, art. 599',
            'Efeitos da apelação — CPP, art. 597',
            'Prisão e liberdade na sentença — CPP, art. 387, § 1º'],
      juris: ['Execução imediata da condenação pelo júri — STF, RE 1.235.340, Tema 1068, j. 12/09/2024'],
      erro: 'Delimitar o recurso à dosimetria e depois pedir absolvição nas razões. O tribunal não conhece do que ficou fora da delimitação, salvo matéria de ordem pública.' },
    { nome: 'Razões — preliminares',
      deve: 'Abrir pelas nulidades e pelas questões que dispensam o exame da prova: incompetência, cerceamento de defesa, prova ilícita, ausência de fundamentação e prescrição.',
      itens: [
        { t:'Nulidades', d:'com o prejuízo demonstrado e o momento em que foram arguidas, para afastar a preclusão.' },
        { t:'Falta de fundamentação', d:'sentença que não enfrenta tese relevante da defesa é nula por omissão.' },
        { t:'Prescrição', d:'verificar a superveniente e a retroativa, calculadas pela pena aplicada, agora que ela existe.' }
      ],
      lei: ['Nulidades — CPP, arts. 563 a 573',
            'Motivação das decisões — CF, art. 93, IX',
            'Prescrição pela pena aplicada — CP, art. 110, § 1º'],
      juris: ['Nulidade não arguida no recurso da acusação não se declara em prejuízo do réu — Súmula 160 do STF'],
      erro: 'Deixar a prescrição retroativa para a sustentação oral. Ela se calcula pela pena aplicada e é a tese mais barata da apelação — vai nas razões, em primeiro lugar.' },
    { nome: 'Razões — mérito',
      deve: 'Confrontar a prova com o que a sentença concluiu. Não basta discordar: é preciso mostrar em que ponto a valoração não se sustenta.',
      itens: [
        { t:'Materialidade e autoria', d:'apontar a prova que a sentença desprezou e a que ela superestimou, com remissão às folhas.' },
        { t:'Tipicidade e excludentes', d:'atipicidade, erro, excludentes de ilicitude e de culpabilidade.' },
        { t:'Desclassificação', d:'pedido de reclassificação para tipo mais brando, com o fundamento fático.' },
        { t:'Contradição interna', d:'sentença que reconhece um fato na fundamentação e o desconsidera no dispositivo é atacável por si.' }
      ],
      lei: ['Vedação à condenação apoiada só no inquérito — CPP, art. 155',
            'Absolvição — CPP, art. 386',
            'Emendatio libelli em grau recursal — CPP, art. 617'],
      juris: ['Mutatio libelli não se aplica em segunda instância — Súmula 453 do STF'],
      erro: 'Repetir as alegações finais palavra por palavra. Apelação é recurso contra a SENTENÇA: o alvo é o raciocínio do juiz, não a acusação.' },
    { nome: 'Razões — dosimetria, regime e efeitos',
      deve: 'Percorrer as três fases apontando o erro de cada uma. É onde a apelação mais ganha, porque o erro de dosimetria é objetivo e o tribunal o corrige sem reexaminar prova.',
      itens: [
        { t:'Primeira fase', d:'circunstância valorada sem fato concreto, bis in idem com elementar ou qualificadora, uso de inquérito em curso.' },
        { t:'Segunda fase', d:'atenuante não reconhecida, compensação indevida, redução abaixo do mínimo.' },
        { t:'Terceira fase', d:'fração de aumento sem fundamentação concreta, cumulação indevida de majorantes.' },
        { t:'Efeitos', d:'regime mais gravoso sem motivação, substituição negada sem dizer qual requisito faltou, detração não computada.' }
      ],
      lei: ['Cálculo da pena — CP, art. 68',
            'Circunstâncias judiciais — CP, art. 59',
            'Regime inicial — CP, art. 33, §§ 2º e 3º',
            'Substituição — CP, art. 44',
            'Detração para o regime — CPP, art. 387, § 2º'],
      juris: ['Inquéritos e ações em curso não agravam a pena-base — Súmula 444 do STJ',
              'Gravidade abstrata não motiva regime mais severo — Súmula 718 do STF',
              'Pena-base no mínimo veda regime mais gravoso — Súmula 440 do STJ',
              'Roubo majorado: aumento exige fundamentação concreta — Súmula 443 do STJ'],
      erro: 'Pedir "redução da pena" sem apontar a fase e o vício. O tribunal precisa saber qual operação refazer.' },
    { nome: 'Pedidos e fecho',
      deve: 'Fechar com pedidos escalonados, do mais amplo ao mais restrito, e requerer o que depende de pedido: sustentação oral, prioridade e liberdade.',
      itens: [
        { t:'Escalonamento', d:'nulidade, absolvição, desclassificação, redução da pena, abrandamento do regime, substituição.' },
        { t:'Liberdade', d:'pedido de concessão do direito de recorrer em liberdade ou de revogação da preventiva, quando for o caso.' },
        { t:'Prerrogativas', d:'sustentação oral e, sendo o caso, prioridade de tramitação.' }
      ],
      lei: ['Julgamento no tribunal — CPP, arts. 609 a 618',
            'Vedação à reformatio in pejus — CPP, art. 617',
            'Revogação da preventiva — CPP, art. 316'],
      juris: [],
      modelo: 'Ante o exposto, requer o apelante seja DADO PROVIMENTO ao recurso, para:\n\na) anular a r. sentença, em razão de ...;\n\nb) sucessivamente, ABSOLVER o apelante, com fundamento no art. 386, inciso ..., do Código de Processo Penal;\n\nc) sucessivamente, DESCLASSIFICAR a conduta para o tipo do art. ... do Código Penal;\n\nd) sucessivamente, REDUZIR a pena, reconhecendo-se ..., com o consequente abrandamento do regime inicial para o ... e a substituição da pena privativa de liberdade por restritivas de direitos;\n\ne) em qualquer hipótese, seja assegurado ao apelante o direito de recorrer em liberdade.\n\nRequer, por fim, a intimação para sustentação oral, nos termos do art. 610, parágrafo único, do Código de Processo Penal.\n\nTermos em que pede deferimento.',
      erro: 'Formular pedidos alternativos em vez de sucessivos. Alternativo deixa o tribunal escolher; sucessivo obriga a examinar na ordem que interessa à defesa.' }
  ],
  cego: ['Interposição em 5 dias, por petição ou termo','Razões em 8 dias (3 nas contravenções)',
    'Tempestividade demonstrada','Delimitação do efeito devolutivo declarada',
    'Preliminares e nulidades com prejuízo apontado','Prescrição retroativa calculada pela pena aplicada',
    'Mérito atacando o raciocínio da sentença','Desclassificação pedida, se cabível',
    'Erro apontado fase a fase na dosimetria','Regime, substituição e detração impugnados',
    'Pedidos sucessivos, do mais amplo ao mais restrito','Recorrer em liberdade requerido',
    'Sustentação oral requerida'],
  dicas: [
    { t:'Recurso exclusivo da defesa nunca piora a situação do réu — art. 617 do CPP. A vedação alcança também a reformatio in pejus indireta: anulada a sentença, a nova não pode impor pena maior.', alerta:true },
    'Prescrição retroativa é a primeira coisa a calcular depois de conhecida a pena aplicada. Muitas apelações se resolvem só nisso.',
    'Erro de dosimetria é a tese de maior retorno: é objetiva, não exige reexame de prova e o tribunal corrige diretamente.',
    'Delimite o recurso com cuidado. O que não for impugnado não é devolvido, salvo matéria de ordem pública.',
    'No júri, as hipóteses do art. 593, III são fechadas, e a decisão manifestamente contrária à prova só admite um recurso por esse fundamento.',
    { t:'Cuidado com a Súmula 160 do STF: nulidade não arguida no recurso da acusação não pode ser declarada em prejuízo do réu — nem de ofício.', alerta:true }
  ],
  especiais: [
    { t:'Apelação do júri', d:'As hipóteses são taxativas (art. 593, III): nulidade posterior à pronúncia, sentença contrária à lei ou à decisão dos jurados, erro na aplicação da pena e decisão manifestamente contrária à prova. No último caso o tribunal não absolve — determina novo júri, e só uma vez (art. 593, § 3º).' },
    { t:'Apelação no Juizado', d:'Prazo único de 10 dias, já com as razões (Lei 9.099/95, art. 82, § 1º). Julga a turma recursal, e não cabe recurso especial da decisão dela (Súmula 203 do STJ), apenas extraordinário (Súmula 640 do STF).' },
    { t:'Apelação do Ministério Público', d:'Quando a acusação recorre, abre-se ao tribunal a possibilidade de agravar a pena, nos limites da devolução. Mas o MP também pode recorrer em favor do réu — ele atua como fiscal da ordem jurídica.' },
    { t:'Réu foragido', d:'A fuga não impede o conhecimento do recurso. Súmula 347 do STJ afastou a antiga exigência de recolhimento à prisão, e o art. 595 do CPP, que previa a deserção, foi revogado pela Lei 12.403/2011.' }
  ]
},
// ═══════════════════════ CÍVEL — POSTULATÓRIAS ═══════════════════════
'Petição inicial': {
 "rito": "Civil — conhecimento",
 "freq": 45,
 "carreiras": [
  "Magistratura",
  "Advocacia Pública",
  "Defensoria",
  "Ministério Público"
 ],
 "sobre": "A inicial é peça de requisitos: o art. 319 lista sete e o espelho confere um por um. O que separa a nota boa da mediana não é a narrativa, é a coerência entre causa de pedir, pedido e valor da causa — e o pedido escrito de modo que possa virar dispositivo de sentença sem reescrita.",
 "blocos": [
  {
   "nome": "Endereçamento, partes e competência",
   "deve": "Indicar o juízo e qualificar as partes, justificando a competência quando ela não for evidente.",
   "itens": [
    {
     "t": "Juízo",
     "d": "art. 319, I. Em prova, dizer POR QUE aquele juízo — foro do domicílio do réu (art. 46), foro de eleição, competência absoluta em razão da matéria ou da pessoa."
    },
    {
     "t": "Qualificação",
     "d": "art. 319, II: nomes, prenomes, estado civil, existência de união estável, profissão, CPF/CNPJ, endereço eletrônico e domicílio de autor e réu."
    },
    {
     "t": "Dados que o autor não tem",
     "d": "os §§ 1º a 3º do art. 319 impedem o indeferimento quando a obtenção dos dados do réu for impossível ou tornar inviável o acesso à justiça — o juiz determina diligências."
    }
   ],
   "lei": [
    "Requisitos da inicial — CPC, art. 319",
    "Foro do domicílio do réu — CPC, art. 46",
    "Impossibilidade de obter dados do réu — CPC, art. 319, §§ 1º a 3º"
   ],
   "juris": [],
   "modelo": "Excelentíssimo Senhor Doutor Juiz de Direito da ... Vara Cível da Comarca de ...\n\nFULANO DE TAL, brasileiro, casado, engenheiro, CPF nº ..., endereço eletrônico ..., residente e domiciliado em ..., por seu advogado (procuração anexa), vem propor\n\nAÇÃO DE ... (com pedido de tutela provisória de urgência)\n\nem face de BELTRANO LTDA., pessoa jurídica de direito privado, CNPJ nº ..., com sede em ..., pelos fundamentos a seguir.",
   "erro": "Endereçar a juízo incompetente sem uma linha de justificação. Em prova, competência costuma ser o primeiro item do espelho."
  },
  {
   "nome": "Fatos e fundamentos jurídicos — a causa de pedir",
   "deve": "Narrar os fatos e extrair deles a consequência jurídica. Causa de pedir remota (o fato) e próxima (o direito) precisam estar as duas.",
   "itens": [
    {
     "t": "Narrativa",
     "d": "cronológica, com data, lugar e documento que a comprove. Cada fato relevante amarrado à prova que o demonstra."
    },
    {
     "t": "Fundamento jurídico",
     "d": "não é fundamento LEGAL: é a qualificação jurídica do fato. Ainda assim, nomear o dispositivo é o que o espelho pontua."
    },
    {
     "t": "Teoria da substanciação",
     "d": "o CPC exige a exposição do fato constitutivo; a mudança da causa de pedir depois da citação depende de consentimento do réu (art. 329, II) e, após o saneamento, não é mais possível."
    },
    {
     "t": "Congruência",
     "d": "todo fato narrado deve levar a algum pedido, e todo pedido deve ter fato que o sustente. Fato órfão de pedido é ruído; pedido órfão de fato é inépcia (art. 330, § 1º, III)."
    }
   ],
   "lei": [
    "Causa de pedir — CPC, art. 319, III",
    "Estabilização da demanda — CPC, art. 329",
    "Inépcia — CPC, art. 330, § 1º",
    "Interpretação do pedido — CPC, art. 322, § 2º"
   ],
   "juris": [],
   "erro": "Narrar fatos que não sustentam pedido nenhum e pedir o que nenhum fato sustenta. É a inépcia do art. 330, § 1º, III."
  },
  {
   "nome": "Pedido — certo, determinado e escrito como dispositivo",
   "deve": "Formular o pedido de modo que o juiz possa copiá-lo no dispositivo. Pedido é o limite da sentença (arts. 141 e 492).",
   "itens": [
    {
     "t": "Certeza e determinação",
     "d": "art. 322 (certo) e art. 324 (determinado). Pedido genérico só nas três hipóteses do art. 324, § 1º: ações universais sem individuação dos bens, impossibilidade de determinar de modo definitivo a extensão do que é devido, e quando a determinação do valor depender de ato do réu ou de terceiro."
    },
    {
     "t": "Pedidos implícitos",
     "d": "juros legais, correção monetária e verbas de sucumbência compreendem-se no principal (art. 322, § 1º); prestações sucessivas seguem o art. 323."
    },
    {
     "t": "Cumulação",
     "d": "art. 327: compatibilidade entre os pedidos, competência do mesmo juízo e procedimento adequado — ou o procedimento comum para todos (§ 2º)."
    },
    {
     "t": "Alternativo e subsidiário",
     "d": "alternativo, art. 325; subsidiário (eventual), art. 326, com a ordem de preferência explícita."
    },
    {
     "t": "Tutela provisória",
     "d": "requerida na própria inicial, com os pressupostos do art. 300 (probabilidade do direito e perigo de dano ou risco ao resultado útil) ou do art. 311 (evidência), e com pedido de decisão liminar quando for o caso."
    }
   ],
   "lei": [
    "Pedido certo — CPC, art. 322",
    "Pedidos implícitos — CPC, art. 322, § 1º",
    "Pedido determinado e exceções — CPC, art. 324",
    "Cumulação — CPC, art. 327",
    "Tutela de urgência — CPC, art. 300",
    "Tutela de evidência — CPC, art. 311",
    "Limites da sentença — CPC, arts. 141 e 492"
   ],
   "juris": [],
   "modelo": "Ante o exposto, requer:\na) a concessão da tutela provisória de urgência, inaudita altera parte, para determinar que a ré ..., sob pena de multa diária de R$ ... (art. 300 c/c art. 297, parágrafo único, do CPC);\nb) a citação da ré para, querendo, contestar, sob pena de revelia;\nc) ao final, a procedência dos pedidos para (i) declarar ...; (ii) condenar a ré ao pagamento de R$ ..., corrigidos monetariamente desde ... e acrescidos de juros de mora desde ...; (iii) condenar a ré à obrigação de fazer consistente em ..., no prazo de ... dias;\nd) a condenação da ré nas custas e em honorários advocatícios, na forma do art. 85, § 2º, do CPC.",
   "erro": "Pedido que não pode virar dispositivo. Se o juiz precisa reescrever o pedido para julgar procedente, o item está incompleto."
  },
  {
   "nome": "Valor da causa, provas e opção pela conciliação",
   "deve": "Fechar os requisitos formais restantes — cada um deles é um item independente no espelho.",
   "itens": [
    {
     "t": "Valor da causa",
     "d": "art. 319, V, com o critério do art. 292 conforme o pedido: cobrança pelo principal com juros e multa (I), ato jurídico pelo valor do ato (II), alimentos por doze prestações (III), divisão/demarcação pelo valor de avaliação (IV), indenização por dano moral pelo valor pretendido (V), pedidos cumulados pela soma (VI), alternativos pelo de maior valor (VII), subsidiários pelo principal (VIII)."
    },
    {
     "t": "Provas",
     "d": "art. 319, VI — especificar, e não protestar genericamente."
    },
    {
     "t": "Audiência do art. 334",
     "d": "art. 319, VII — a opção pela realização ou não da audiência de conciliação. Só não se designa se ambas as partes manifestarem desinteresse ou se a autocomposição não for admissível (art. 334, § 4º)."
    },
    {
     "t": "Documentos indispensáveis",
     "d": "art. 320. Faltando, o juiz manda emendar em quinze dias, indicando com precisão o que deve ser corrigido (art. 321)."
    }
   ],
   "lei": [
    "Valor da causa — CPC, art. 292",
    "Documentos indispensáveis — CPC, art. 320",
    "Emenda da inicial — CPC, art. 321",
    "Audiência de conciliação — CPC, art. 334",
    "Gratuidade — CPC, art. 98"
   ],
   "juris": [],
   "erro": "Omitir o inciso VII (opção pela audiência) e o valor da causa. São dois itens de espelho que não dependem de saber direito nenhum."
  },
  {
   "nome": "Indeferimento, improcedência liminar e o que evitar",
   "deve": "Escrever já sabendo por onde a inicial pode cair — é isso que o examinador está testando.",
   "itens": [
    {
     "t": "Indeferimento",
     "d": "art. 330: inépcia, ilegitimidade, falta de interesse, e não atendimento aos arts. 106 e 321. O § 1º define inépcia: falta de pedido ou de causa de pedir; pedido indeterminado fora das exceções; narração da qual não decorra logicamente a conclusão; pedidos incompatíveis entre si."
    },
    {
     "t": "Recurso",
     "d": "da sentença de indeferimento cabe apelação, com juízo de retratação em cinco dias (art. 331). Não retratando, o réu é citado para responder ao recurso (§ 1º)."
    },
    {
     "t": "Improcedência liminar do pedido",
     "d": "art. 332 — contraria enunciado de súmula do STF ou do STJ, acórdão em repetitivo ou em repercussão geral, entendimento firmado em IRDR ou IAC, ou súmula de tribunal local sobre direito local; e ainda a decadência ou a prescrição (§ 1º)."
    }
   ],
   "lei": [
    "Indeferimento da inicial — CPC, art. 330",
    "Apelação e retratação — CPC, art. 331",
    "Improcedência liminar — CPC, art. 332"
   ],
   "juris": [],
   "erro": "Escrever inicial cuja narração não conduz logicamente ao pedido. É a hipótese mais cobrada de inépcia (art. 330, § 1º, III)."
  }
 ],
 "cego": [
  "Juízo indicado e competência justificada",
  "Qualificação completa das duas partes (art. 319, II)",
  "Fatos narrados com data, lugar e prova",
  "Fundamento jurídico do pedido explicitado",
  "Pedido certo e determinado, redigido como dispositivo",
  "Pedidos cumulados compatíveis e com o mesmo procedimento",
  "Tutela provisória com os pressupostos do art. 300 ou 311",
  "Valor da causa pelo critério do art. 292",
  "Provas especificadas com a respectiva finalidade",
  "Opção pela audiência do art. 334 (inciso VII)",
  "Documentos indispensáveis juntados",
  "Pedido de citação e de sucumbência"
 ],
 "dicas": [
  {
   "t": "Sexta peça mais cobrada do banco de provas aplicadas: 45 ocorrências.",
   "alerta": false
  },
  "O art. 319 tem sete incisos e o espelho costuma ter sete itens. Escreva com a lista ao lado e confira antes de entregar.",
  "Pedido é limite da sentença (arts. 141 e 492). Se você não pediu, o juiz não pode dar — salvo os implícitos do art. 322, § 1º.",
  {
   "t": "Desde a Lei 14.905/2024, correção e juros no direito civil seguem o novo art. 389 e o art. 406 do CC: o índice é o IPCA e a taxa legal é a Selic deduzida a correção. Pedir \"juros de 1% ao mês\" sem base contratual ficou errado nas obrigações civis regidas pela nova redação.",
   "alerta": true
  },
  "O inciso VII (audiência de conciliação) é o item mais esquecido da inicial — e o mais barato de lembrar.",
  "Interpretação do pedido é feita conforme o conjunto da postulação e o princípio da boa-fé (art. 322, § 2º) — mas isso é regra de salvamento, não licença para escrever mal."
 ],
 "especiais": [
  {
   "t": "Inicial no Juizado Especial Cível",
   "d": "Pedido pode ser oral e o valor limita a competência a quarenta salários mínimos (Lei 9.099/1995, art. 3º, I). Não cabe pedido ilíquido nem intervenção de terceiros (art. 10). Sem advogado até vinte salários mínimos (art. 9º)."
  },
  {
   "t": "Inicial contra a Fazenda Pública",
   "d": "Não há audiência do art. 334 quando a autocomposição não for admissível; observar a remessa necessária (art. 496) e, na execução, o regime de precatório (CF, art. 100)."
  },
  {
   "t": "Inicial de ação de família",
   "d": "O art. 693 e seguintes impõem que a citação venha desacompanhada de cópia da inicial (art. 695, § 1º), e o esforço de solução consensual é regra (art. 694)."
  },
  {
   "t": "Inicial com pedido de tutela antecedente",
   "d": "Requerida em caráter antecedente, a inicial pode limitar-se ao requerimento da tutela, à indicação do pedido final e à exposição da lide (art. 303). Concedida, o autor adita em quinze dias (§ 1º, I), sob pena de extinção (§ 2º)."
  },
  {
   "t": "Gratuidade da justiça",
   "d": "Pedida na própria inicial (art. 99). Presume-se verdadeira a alegação de pessoa natural (§ 3º), e o juiz só indefere depois de dar oportunidade de comprovação (§ 2º)."
  }
 ]
},

'Contestação': {
 "rito": "Civil — conhecimento",
 "freq": 46,
 "carreiras": [
  "Magistratura",
  "Advocacia Pública",
  "Defensoria"
 ],
 "sobre": "A contestação é a peça da eventualidade: tudo o que o réu tem a dizer, ele diz agora, na ordem certa, sob pena de precluir. O espelho quase nunca cobra \"a melhor tese\" — cobra se todas as preliminares cabíveis foram deduzidas antes do mérito e se cada fato da inicial foi impugnado especificadamente.",
 "blocos": [
  {
   "nome": "Endereçamento, qualificação e tempestividade",
   "deve": "Endereçar ao juízo da causa, qualificar o réu e demonstrar o prazo — na discursiva o marco inicial vale ponto sozinho.",
   "itens": [
    {
     "t": "Endereçamento",
     "d": "ao juízo em que tramita o feito, sem repetir a distribuição."
    },
    {
     "t": "Qualificação do réu",
     "d": "nome, estado civil, existência de união estável, profissão, CPF/CNPJ, endereço eletrônico e domicílio (o mesmo rol do art. 319, II, do CPC)."
    },
    {
     "t": "Termo inicial do prazo",
     "d": "quinze dias úteis contados na forma do art. 335: da audiência de conciliação, do protocolo do pedido de cancelamento pelo réu, ou da juntada do aviso de recebimento/mandado — conforme o caso. Prazo em dobro para litisconsortes com procuradores distintos em autos físicos (art. 229), para a Fazenda (art. 183) e para a Defensoria (art. 186)."
    }
   ],
   "lei": [
    "Prazo e termo inicial — CPC, art. 335",
    "Requisitos da qualificação — CPC, art. 319, II",
    "Contagem em dias úteis — CPC, art. 219",
    "Prazo em dobro da Fazenda — CPC, art. 183",
    "Prazo em dobro da Defensoria — CPC, art. 186"
   ],
   "juris": [],
   "modelo": "Excelentíssimo Senhor Doutor Juiz de Direito da ... Vara Cível da Comarca de ...\n\nAutos nº ...\n\nFULANO DE TAL, já qualificado nos autos, por seu advogado que esta subscreve, vem, tempestivamente — porquanto a audiência do art. 334 do CPC realizou-se em .../.../..., iniciando-se o prazo do art. 335, I, do CPC —, apresentar CONTESTAÇÃO à ação que lhe move ..., pelas razões de fato e de direito a seguir expostas.",
   "erro": "Não demonstrar a tempestividade. Se a peça é entregue sem o marco inicial, o examinador não tem como pontuar o item e o candidato perde ponto que não dependia de tese nenhuma."
  },
  {
   "nome": "Preliminares do art. 337 — todas, na ordem",
   "deve": "Deduzir, antes do mérito, todas as defesas processuais cabíveis. O art. 337 traz um rol e o espelho costuma conferir item por item.",
   "itens": [
    {
     "t": "Ordem de dedução",
     "d": "inexistência ou nulidade da citação; incompetência absoluta e relativa; incorreção do valor da causa; inépcia da inicial; perempção; litispendência; coisa julgada; conexão; incapacidade da parte, defeito de representação ou falta de autorização; convenção de arbitragem; ausência de legitimidade ou de interesse processual; falta de caução ou de outra prestação que a lei exige como preliminar; indevida concessão da gratuidade."
    },
    {
     "t": "Incompetência relativa",
     "d": "desde 2015 vai na própria contestação, e não mais em exceção autônoma. Alegada, o processo pode ser protocolado no foro do domicílio do réu (art. 340)."
    },
    {
     "t": "O que o juiz não conhece de ofício",
     "d": "convenção de arbitragem e incompetência relativa — nas duas, o silêncio do réu implica aceitação (art. 337, §§ 5º e 6º). Todo o resto é matéria de ordem pública."
    },
    {
     "t": "Impugnação à gratuidade",
     "d": "na própria contestação, e não em incidente apartado (art. 337, XIII, e art. 100)."
    }
   ],
   "lei": [
    "Rol das preliminares — CPC, art. 337",
    "Matérias cognoscíveis de ofício — CPC, art. 337, § 5º",
    "Alegação de incompetência e foro de protocolo — CPC, art. 340",
    "Impugnação à gratuidade — CPC, art. 100",
    "Ordem pública e art. 485, § 3º — CPC, art. 485, § 3º"
   ],
   "juris": [],
   "modelo": "I — DAS PRELIMINARES\n\nI.1 — DA ILEGITIMIDADE PASSIVA (art. 337, XI, do CPC)\nA relação jurídica de direito material descrita na inicial não vincula o contestante, porquanto ...\nRequer, em consequência, a extinção do processo sem resolução do mérito, na forma do art. 485, VI, do CPC.",
   "erro": "Guardar preliminar \"para depois\". Fora das hipóteses do art. 342, a matéria não alegada na contestação preclui — e o espelho desconta o item inteiro."
  },
  {
   "nome": "Impugnação especificada dos fatos",
   "deve": "Enfrentar um a um os fatos narrados na inicial. Contestação por negativa geral não impugna nada — salvo as exceções legais.",
   "itens": [
    {
     "t": "Ônus da impugnação especificada",
     "d": "presumem-se verdadeiros os fatos não impugnados (art. 341, caput)."
    },
    {
     "t": "Exceções ao ônus",
     "d": "não se aplica ao defensor público, ao advogado dativo e ao curador especial (art. 341, parágrafo único)."
    },
    {
     "t": "Fatos que não se presumem",
     "d": "os que não admitem confissão, os que dependem de instrumento público quanto à substância do ato, e os que estiverem em contradição com a defesa considerada em conjunto (art. 341, I a III)."
    },
    {
     "t": "Técnica",
     "d": "reproduzir o fato alegado e responder na sequência. Impugnar em bloco é o mesmo que não impugnar."
    }
   ],
   "lei": [
    "Impugnação especificada — CPC, art. 341",
    "Exceções ao ônus — CPC, art. 341, parágrafo único",
    "Efeitos da revelia — CPC, art. 344",
    "Revelia sem presunção — CPC, art. 345"
   ],
   "juris": [],
   "modelo": "II — DOS FATOS\n\nAlega o autor, no item 4 da inicial, que ... . Não procede: o documento de fl. ... demonstra que ... .\nImpugna-se, ainda, especificadamente, o alegado nos itens 6, 7 e 9 da inicial, porquanto ... .",
   "erro": "Impugnação genérica (\"impugnam-se todos os fatos\"). Vale como não impugnação e faz o item cair inteiro."
  },
  {
   "nome": "Mérito, prejudiciais e defesas indiretas",
   "deve": "Depois das preliminares, as prejudiciais de mérito e a defesa de fundo — com o ônus da prova em mente.",
   "itens": [
    {
     "t": "Prescrição e decadência",
     "d": "são mérito, não preliminar: acolhidas, resolvem o mérito (art. 487, II). O juiz as conhece de ofício, ouvidas as partes (art. 487, parágrafo único)."
    },
    {
     "t": "Defesa indireta de mérito",
     "d": "fato impeditivo, modificativo ou extintivo do direito do autor — pagamento, compensação, novação, exceção de contrato não cumprido. Aqui o ônus da prova é do réu (art. 373, II)."
    },
    {
     "t": "Distribuição dinâmica",
     "d": "se for o caso de inversão por impossibilidade ou excessiva dificuldade, requerer com fundamento no art. 373, § 1º, lembrando que a decisão precisa dar à parte oportunidade de se desincumbir (§ 2º veda a prova diabólica reversa)."
    },
    {
     "t": "Prequestionamento",
     "d": "em prova de segunda fase, prequestionar não é obrigatório na contestação, mas nomear o dispositivo em cada tese é o que o espelho pontua."
    }
   ],
   "lei": [
    "Resolução de mérito por prescrição e decadência — CPC, art. 487, II",
    "Ônus da prova — CPC, art. 373",
    "Distribuição dinâmica — CPC, art. 373, §§ 1º e 2º",
    "Prescrição — CC, art. 189",
    "Prazos de prescrição — CC, arts. 205 e 206"
   ],
   "juris": [],
   "erro": "Alegar prescrição como preliminar. Prescrição é mérito e resolve o processo com resolução do mérito — trocar isso mostra desconhecimento da estrutura do art. 487."
  },
  {
   "nome": "Reconvenção e pedidos contrapostos",
   "deve": "Se houver pretensão própria conexa, ela vem na própria contestação — e não em peça autônoma.",
   "itens": [
    {
     "t": "Forma",
     "d": "a reconvenção é proposta na própria contestação (art. 343, caput). Cabe reconvenção mesmo sem contestar (§ 6º)."
    },
    {
     "t": "Autonomia",
     "d": "a desistência da ação ou a extinção sem mérito não obsta o prosseguimento da reconvenção (§ 2º)."
    },
    {
     "t": "Ampliação subjetiva",
     "d": "a reconvenção pode ser proposta contra o autor e terceiro (§ 3º) ou pelo réu em litisconsórcio com terceiro (§ 4º)."
    },
    {
     "t": "Custas e valor",
     "d": "a reconvenção tem valor próprio e recolhimento próprio; sem isso, não é conhecida."
    }
   ],
   "lei": [
    "Reconvenção — CPC, art. 343",
    "Reconvenção sem contestação — CPC, art. 343, § 6º",
    "Autonomia — CPC, art. 343, § 2º"
   ],
   "juris": [],
   "erro": "Apresentar reconvenção como peça apartada, ou esquecer o valor da causa da reconvenção."
  },
  {
   "nome": "Provas, requerimentos e fecho",
   "deve": "Fechar com o protesto por provas especificado, o rol, e os requerimentos de estilo.",
   "itens": [
    {
     "t": "Especificação de provas",
     "d": "nomear cada meio e dizer o que se pretende provar com ele. \"Protesta por todos os meios de prova em direito admitidos\" não especifica nada."
    },
    {
     "t": "Documentos",
     "d": "os que instruem a defesa vêm com ela (art. 434); documento novo, na forma do art. 435."
    },
    {
     "t": "Audiência de conciliação",
     "d": "se o réu não quiser a autocomposição, o pedido de cancelamento vai por petição própria, com dez dias de antecedência (art. 334, § 5º) — e é dele que corre o prazo de contestação (art. 335, II)."
    },
    {
     "t": "Honorários e sucumbência",
     "d": "requerer a condenação do autor nos ônus da sucumbência, com honorários na forma do art. 85, §§ 2º e 3º."
    }
   ],
   "lei": [
    "Momento de produção da prova documental — CPC, art. 434",
    "Documento novo — CPC, art. 435",
    "Desinteresse na conciliação — CPC, art. 334, § 5º",
    "Honorários de sucumbência — CPC, art. 85"
   ],
   "juris": [],
   "modelo": "Ante o exposto, requer:\na) o acolhimento das preliminares, com a extinção do processo sem resolução do mérito (art. 485, VI, do CPC);\nb) subsidiariamente, a improcedência dos pedidos;\nc) a produção de prova documental suplementar, testemunhal — cujo rol segue — e pericial contábil, destinada a demonstrar ...;\nd) a condenação do autor ao pagamento das custas e dos honorários advocatícios, na forma do art. 85, § 2º, do CPC.\n\nTermos em que pede deferimento.\nLocal, data. Advogado. OAB/... nº ...",
   "erro": "Fechar sem especificar provas e sem pedir a sucumbência. São dois itens de espelho perdidos por descuido de fecho."
  }
 ],
 "cego": [
  "Endereçamento ao juízo da causa",
  "Qualificação completa do réu",
  "Tempestividade demonstrada com o marco do art. 335",
  "Todas as preliminares cabíveis do art. 337",
  "Incompetência relativa na contestação (e não em exceção)",
  "Impugnação especificada de cada fato da inicial",
  "Prescrição e decadência tratadas como mérito",
  "Defesa indireta com o ônus do art. 373, II",
  "Reconvenção na própria peça, com valor próprio",
  "Provas especificadas, com a finalidade de cada uma",
  "Pedido de improcedência e de sucumbência"
 ],
 "dicas": [
  {
   "t": "Quinta peça mais cobrada do banco de provas aplicadas: 46 ocorrências.",
   "alerta": false
  },
  "A ordem é eventualidade pura: preliminares, prejudiciais, mérito. Inverter custa o item da estrutura mesmo quando a tese está certa.",
  {
   "t": "Prescrição NÃO é preliminar. É prejudicial de mérito e leva ao art. 487, II — extinção COM resolução do mérito.",
   "alerta": true
  },
  "Incompetência relativa deixou de ser exceção autônoma no CPC/2015: vai na contestação (art. 337, II) e permite o protocolo no foro do domicílio do réu (art. 340).",
  "Impugnação especificada é item de espelho quase garantido. Responda fato por fato, citando o item da inicial.",
  {
   "t": "O réu que não contesta nem sempre é revel para todos os efeitos: os incisos do art. 345 afastam a presunção (litisconsorte que contesta, direitos indisponíveis, instrumento público exigido, alegações inverossímeis ou contraditórias com a prova).",
   "alerta": false
  },
  "Reconvenção sem valor da causa e sem custas não é conhecida — e o examinador confere."
 ],
 "especiais": [
  {
   "t": "Contestação da Fazenda Pública",
   "d": "Prazo em dobro (art. 183), remessa necessária nos limites do art. 496 e §§, e as matérias próprias do regime de direito público. Há roteiro próprio no catálogo."
  },
  {
   "t": "Contestação da Defensoria e do curador especial",
   "d": "O ônus da impugnação especificada não se aplica (art. 341, parágrafo único), o que autoriza a contestação por negativa geral. Prazo em dobro (art. 186). O curador especial é atribuição da Defensoria (art. 72, parágrafo único)."
  },
  {
   "t": "Contestação no Juizado Especial Cível",
   "d": "Não há reconvenção: cabe pedido contraposto fundado nos mesmos fatos (Lei 9.099/1995, art. 31). A defesa é oral ou escrita, na audiência de instrução."
  },
  {
   "t": "Contestação em ação de consumo",
   "d": "Vale examinar a inversão do ônus da prova do art. 6º, VIII, do CDC — que é ope judicis e depende de verossimilhança ou hipossuficiência — e distingui-la da inversão legal do art. 12, § 3º, e do art. 14, § 3º."
  },
  {
   "t": "Alegações supervenientes",
   "d": "Depois da contestação só cabe deduzir novas alegações nas três hipóteses do art. 342: direito ou fato superveniente, matéria cognoscível de ofício, e autorização legal expressa para alegação em qualquer tempo e grau."
  }
 ]
},

'Reconvenção': {
  rito: 'Civil — conhecimento',
  freq: 2,   // vezes em que o tema aparece nas 648 provas de discursivas.js
  carreiras: ['Advocacia','Procuradorias'],
  sobre: 'Ação do réu contra o autor, dentro do mesmo processo. Depois do CPC/2015 ela vem NA contestação, não em peça separada — e ganhou autonomia: desistir da ação principal não a atinge.',
  blocos: [
    { nome: 'Cabimento e conexão',
      deve: 'A reconvenção exige conexão com a ação principal ou com o fundamento da defesa. Sem esse liame, a pretensão do réu é ação autônoma.',
      itens: [
        { t:'Conexão com a ação', d:'mesma causa de pedir ou mesmo objeto.' },
        { t:'Conexão com a defesa', d:'a pretensão nasce do próprio fundamento defensivo — é a hipótese mais cobrada.' },
        { t:'Competência', d:'o juízo da causa principal tem de ser competente também para a reconvenção; a incompetência absoluta impede.' },
        { t:'Procedimento compatível', d:'o rito da reconvenção não pode ser incompatível com o da ação principal.' }
      ],
      lei: ['Cabimento e conexão — CPC, art. 343, caput',
            'Competência — CPC, art. 343 e arts. 62 e 63'],
      juris: [],
      erro: 'Reconvir sem apontar o liame. A conexão é requisito, não formalidade: sem ela a reconvenção não é conhecida.' },
    { nome: 'Forma e autonomia',
      deve: 'Apresentar na própria contestação, em tópico destacado. E registrar a autonomia: a reconvenção sobrevive à extinção ou à desistência da ação principal.',
      itens: [
        { t:'Na mesma peça', d:'não há mais peça autônoma; a reconvenção é capítulo da contestação, com pedido e valor próprios.' },
        { t:'Autonomia', d:'a desistência da ação ou a ocorrência de causa extintiva não obsta o prosseguimento da reconvenção (art. 343, § 2º).' },
        { t:'Sem contestação', d:'é possível reconvir sem contestar — a lei não exige as duas peças (art. 343, § 6º).' },
        { t:'Intimação, não citação', d:'o autor-reconvindo é intimado na pessoa do advogado para responder em 15 dias (art. 343, § 1º).' }
      ],
      lei: ['Apresentação na contestação — CPC, art. 343, caput',
            'Intimação do reconvindo — CPC, art. 343, § 1º',
            'Autonomia — CPC, art. 343, § 2º',
            'Reconvenção sem contestação — CPC, art. 343, § 6º'],
      juris: [],
      erro: 'Protocolar a reconvenção em apartado. Além de errado, cria dois processos onde a lei quis um.' },
    { nome: 'Ampliação subjetiva',
      deve: 'A reconvenção pode trazer gente nova para o processo — terceiro ao lado do réu-reconvinte, ou terceiro ao lado do autor-reconvindo.',
      itens: [
        { t:'Contra o autor e terceiro', d:'permitido pelo § 3º do art. 343.' },
        { t:'Pelo réu e terceiro', d:'permitido pelo § 4º.' },
        { t:'Substituto processual', d:'proposta a ação pelo substituto, a reconvenção deve ser dirigida contra o substituído (§ 5º).' }
      ],
      lei: ['Litisconsórcio na reconvenção — CPC, art. 343, §§ 3º a 5º'],
      juris: [],
      erro: 'Reconvir contra quem não é parte sem invocar o § 3º. A ampliação subjetiva é permitida, mas precisa ser justificada.' },
    { nome: 'Requisitos próprios de inicial',
      deve: 'A reconvenção é ação: tem de ter todos os requisitos de uma petição inicial, inclusive valor da causa e recolhimento de custas.',
      itens: [
        { t:'Requisitos do art. 319', d:'partes, fato, fundamento, pedido certo e determinado, provas, valor.' },
        { t:'Custas', d:'a reconvenção é ação nova e gera custas próprias, salvo gratuidade.' },
        { t:'Sucumbência autônoma', d:'gera honorários próprios, independentes dos da ação principal.' }
      ],
      lei: ['Requisitos da inicial — CPC, art. 319',
            'Valor da causa — CPC, art. 292',
            'Honorários — CPC, art. 85'],
      juris: [],
      modelo: 'DA RECONVENÇÃO\n\nNos termos do art. 343 do Código de Processo Civil, o réu apresenta RECONVENÇÃO em face do autor-reconvindo, pelos fundamentos a seguir expostos, conexos com o fundamento da defesa acima deduzida.\n\n[fatos e fundamentos]\n\nAnte o exposto, requer o réu-reconvinte:\n\na) a intimação do autor-reconvindo, na pessoa de seu advogado, para responder no prazo de 15 (quinze) dias;\n\nb) a procedência da reconvenção, para condenar o autor-reconvindo a ...;\n\nc) a condenação em custas e honorários, de forma autônoma em relação à ação principal.\n\nDá-se à reconvenção o valor de R$ ....',
      erro: 'Não atribuir valor à reconvenção. Sem valor não há custas, e sem custas ela pode ser indeferida como qualquer inicial.' }
  ],
  cego: ['Conexão com a ação ou com a defesa demonstrada','Competência do juízo verificada',
    'Apresentada dentro da contestação','Intimação do reconvindo pelo advogado requerida',
    'Autonomia registrada','Requisitos do art. 319 presentes',
    'Pedido certo e determinado','Valor da causa próprio','Custas recolhidas',
    'Honorários pedidos de forma autônoma']
},

'Ata de audiência': {
  rito: 'Civil — conhecimento',
  carreiras: ['Magistratura'],
  sobre: 'Peça curta e subestimada. A ata é o registro público do que aconteceu e, sobretudo, do que foi DECIDIDO em audiência — e decisão que não consta da ata não existe para efeito de recurso. Em prova prática, ela cobra domínio da ordem dos atos.',
  blocos: [
    { nome: 'Abertura e presenças',
      deve: 'Identificar o processo, a data, o juízo e quem compareceu. A ausência tem consequência e por isso precisa ser registrada com precisão.',
      itens: [
        { t:'Identificação', d:'número dos autos, natureza da audiência, data, hora de início, vara e nome do juiz.' },
        { t:'Presenças', d:'partes, advogados com OAB, Ministério Público quando intervir, testemunhas, perito e intérprete.' },
        { t:'Ausências', d:'quem faltou, se justificou e o que se decidiu quanto a isso — a ausência do depoente intimado gera confissão.' }
      ],
      lei: ['Registro dos atos da audiência — CPC, art. 367',
            'Confissão pela ausência ao depoimento pessoal — CPC, art. 385, § 1º',
            'Adiamento da audiência — CPC, art. 362'],
      juris: [],
      erro: 'Registrar "ausente o réu" sem dizer se estava intimado pessoalmente para depor. Sem esse dado, a confissão ficta não se sustenta.' },
    { nome: 'Tentativa de conciliação',
      deve: 'Registrar que a conciliação foi tentada e o resultado. É dever do juiz em qualquer estado do processo, e a omissão é falha de procedimento.',
      itens: [
        { t:'Resultado', d:'acordo, ausência de acordo ou impossibilidade momentânea.' },
        { t:'Havendo acordo', d:'transcrever os termos com precisão executiva: quem paga o quê, quando, como, e o que acontece no descumprimento.' },
        { t:'Homologação', d:'o acordo homologado extingue o processo com resolução do mérito.' }
      ],
      lei: ['Dever de conciliar — CPC, art. 359',
            'Autocomposição e extinção — CPC, art. 487, III, "b"',
            'Título executivo judicial — CPC, art. 515, II'],
      juris: [],
      erro: 'Homologar acordo em termos vagos ("as partes se comporão"). Acordo é título executivo: se não for líquido, certo e exigível, não executa.' },
    { nome: 'Ordem da instrução',
      deve: 'A ordem do art. 361 é imperativa, e a ata prova que foi seguida. Registrar cada ato na sequência em que ocorreu.',
      itens: [
        { t:'1. Perito e assistentes', d:'esclarecimentos, se intimados na forma do art. 477, § 4º.' },
        { t:'2. Depoimento pessoal', d:'autor e depois réu, com a advertência da pena de confesso.' },
        { t:'3. Testemunhas', d:'as do autor, depois as do réu, inquiridas separadamente.' },
        { t:'Contradita', d:'arguida antes do compromisso, com o registro da decisão e do protesto.' },
        { t:'Perguntas', d:'as partes perguntam diretamente à testemunha; o juiz indefere as impertinentes, registrando as indeferidas.' }
      ],
      lei: ['Ordem dos atos — CPC, art. 361',
            'Depoimento pessoal e pena de confesso — CPC, arts. 385 e 386',
            'Contradita — CPC, art. 457, § 1º',
            'Perguntas diretas às testemunhas — CPC, art. 459',
            'Registro das perguntas indeferidas — CPC, art. 459, § 2º'],
      juris: [],
      erro: 'Indeferir pergunta e não registrar na ata a pergunta indeferida. O § 2º do art. 459 manda transcrever — sem isso a parte não consegue impugnar depois.' },
    { nome: 'Decisões proferidas em audiência',
      deve: 'Tudo o que o juiz decide em audiência entra na ata, fundamentado. Aqui é onde a ata deixa de ser burocracia e vira decisão recorrível.',
      itens: [
        { t:'Saneamento em cooperação', d:'quando a causa é complexa, o saneamento se faz em audiência, e as questões delimitadas na ata ficam estabilizadas.' },
        { t:'Decisões de prova', d:'indeferimento de prova, substituição de testemunha, determinação de nova perícia.' },
        { t:'Poder de polícia', d:'advertências e providências para manter a ordem, com registro do fato.' },
        { t:'Publicação em audiência', d:'a decisão proferida em audiência tem-se por publicada, e o prazo corre daí — registre isso expressamente.' }
      ],
      lei: ['Saneamento em cooperação — CPC, art. 357, § 3º',
            'Poderes do juiz na audiência — CPC, art. 360',
            'Publicação em audiência — CPC, art. 1.003, § 1º'],
      juris: [],
      erro: 'Decidir de viva voz e não lançar na ata. Decisão que não consta do registro não corre prazo, não preclui e cria nulidade.' },
    { nome: 'Alegações finais e encerramento',
      deve: 'Registrar as alegações finais — orais ou a conversão em memoriais — e encerrar com as intimações, o horário e as assinaturas.',
      itens: [
        { t:'Alegações orais', d:'20 minutos para cada parte, prorrogáveis por 10; havendo litisconsorte ou terceiro, 30 minutos divididos.' },
        { t:'Memoriais', d:'quando a causa for complexa ou houver questão de direito nova — prazos sucessivos de 15 dias.' },
        { t:'Encerramento', d:'hora do término, intimações feitas em audiência, e assinatura do juiz, dos advogados e do servidor.' }
      ],
      lei: ['Alegações finais orais e memoriais — CPC, art. 364 e § 2º',
            'Termo de audiência e gravação — CPC, art. 367, §§ 1º a 6º',
            'Intimação em audiência — CPC, art. 1.003, § 1º'],
      juris: [],
      modelo: 'Aos ... dias do mês de ... de ..., às ...h, na sala de audiências da ... Vara Cível da Comarca de ..., presente o MM. Juiz de Direito Dr. ..., foi aberta a audiência de instrução e julgamento nos autos nº ....\n\nPRESENTES: o autor, acompanhado de seu advogado Dr. ..., OAB/... nº ...; o réu, acompanhado de seu advogado Dr. ..., OAB/... nº ....\n\nCONCILIAÇÃO: renovada a proposta conciliatória, não houve acordo.\n\nINSTRUÇÃO: foi colhido o depoimento pessoal do autor e do réu, e inquiridas as testemunhas ... (arroladas pelo autor) e ... (arroladas pelo réu), tudo registrado em meio audiovisual, na forma do art. 367, § 5º, do CPC.\n\nDELIBERAÇÃO: indeferido o pedido de oitiva da testemunha ..., por ..., saindo as partes intimadas.\n\nALEGAÇÕES FINAIS: convertidas em memoriais, prazo sucessivo de 15 dias, na forma do art. 364, § 2º, do CPC, saindo os presentes intimados.\n\nNada mais havendo, encerrou-se a audiência às ...h. Eu, ..., servidor, digitei.',
      erro: 'Encerrar sem consignar que as partes saíram intimadas. Sem isso a secretaria terá de intimar de novo, e o processo perde semanas.' }
  ],
  cego: ['Identificação do processo, data e juízo','Presenças e ausências registradas com precisão',
    'Intimação pessoal para depor consignada','Conciliação tentada e resultado registrado',
    'Acordo transcrito em termos executáveis','Ordem do art. 361 observada e registrada',
    'Contradita e decisão sobre ela','Perguntas indeferidas transcritas',
    'Decisões proferidas em audiência lançadas e fundamentadas',
    'Alegações finais ou conversão em memoriais','Partes saíram intimadas','Hora de encerramento e assinaturas']
},

// ═══════════════════════ CÍVEL — RECURSOS ═══════════════════════
'Apelação': {
  rito: 'Civil — recursos',
  freq: 21,   // vezes em que o tema aparece nas 648 provas de discursivas.js
  carreiras: ['Advocacia','Defensoria','Procuradorias','Ministério Público'],
  sobre: 'Recurso de fundamentação livre contra sentença. O que decide a peça é a dialeticidade — atacar os fundamentos da sentença, um a um — e a consciência de que o tribunal pode julgar o mérito mesmo quando a sentença foi terminativa.',
  blocos: [
    { nome: 'Cabimento, prazo e preparo',
      deve: 'Quinze dias úteis da intimação da sentença, com preparo comprovado no ato da interposição. Sem preparo, deserção — mas há remédio.',
      itens: [
        { t:'Prazo', d:'15 dias úteis; em dobro para Fazenda, MP, Defensoria e litisconsortes com procuradores distintos.' },
        { t:'Preparo', d:'comprovado no ato da interposição; insuficiente, intima-se para complementar em 5 dias; não recolhido, intima-se para pagar em dobro.' },
        { t:'Dispensados', d:'Fazenda, MP, Defensoria e beneficiários da gratuidade.' },
        { t:'Sem juízo de admissibilidade na origem', d:'o juiz não examina os requisitos: recebe as contrarrazões e remete.' }
      ],
      lei: ['Cabimento — CPC, art. 1.009',
            'Prazo — CPC, art. 1.003, § 5º',
            'Preparo e deserção — CPC, art. 1.007 e §§ 2º e 4º',
            'Remessa sem admissibilidade — CPC, art. 1.010, § 3º'],
      juris: [],
      erro: 'Confundir preparo insuficiente com preparo ausente. O § 2º manda complementar em 5 dias; o § 4º manda recolher em dobro. Consequências diferentes.' },
    { nome: 'Requisitos da peça e dialeticidade',
      deve: 'Os quatro requisitos do art. 1.010 são de conferência rápida, mas o terceiro é o que se cobra: as razões do pedido de reforma têm de dialogar com a fundamentação da sentença.',
      itens: [
        { t:'Nomes e qualificação', d:'das partes.' },
        { t:'Exposição do fato e do direito', d:'sintética, para situar o tribunal.' },
        { t:'Razões do pedido de reforma ou de decretação de nulidade', d:'o coração da peça — cada fundamento da sentença atacado especificamente.' },
        { t:'Pedido de nova decisão', d:'expresso, e não implícito.' }
      ],
      lei: ['Requisitos da apelação — CPC, art. 1.010, I a IV',
            'Não conhecimento por ausência de impugnação específica — CPC, art. 932, III',
            'Vício sanável — CPC, art. 932, parágrafo único'],
      juris: ['Súmula 182 do STJ, por analogia: é inviável o recurso que não ataca especificamente os fundamentos da decisão recorrida'],
      erro: 'Repetir a petição inicial ou a contestação. Apelação que não enfrenta os fundamentos da sentença não é conhecida — e o relator decide isso sozinho.' },
    { nome: 'Efeitos',
      deve: 'A regra é o duplo efeito. Registrar quando a hipótese é de eficácia imediata, e pedir efeito suspensivo ao relator quando for o caso.',
      itens: [
        { t:'Regra', d:'efeito devolutivo e suspensivo (art. 1.012, caput).' },
        { t:'Exceções do § 1º', d:'homologação de arbitragem, alimentos, sentença arbitral, interdição, tutela provisória confirmada ou concedida, entre outras — produzem efeitos desde logo.' },
        { t:'Cumprimento provisório', d:'nas exceções, o apelado pode promovê-lo desde a publicação (art. 1.012, § 2º).' },
        { t:'Suspensivo por decisão', d:'pedido dirigido ao tribunal, com risco de dano grave e probabilidade de provimento (art. 1.012, § 4º).' }
      ],
      lei: ['Efeitos da apelação — CPC, art. 1.012 e §§'],
      juris: [],
      erro: 'Ajuizar apelação de sentença que confirmou tutela provisória e supor que ela suspende. Não suspende — e sem o pedido do § 4º o cumprimento provisório corre.' },
    { nome: 'Extensão do devolutivo e causa madura',
      deve: 'O tribunal devolve o que foi impugnado, mas dentro do capítulo impugnado devolve tudo — inclusive fundamento não apreciado pela sentença. E pode julgar o mérito direto.',
      itens: [
        { t:'Profundidade', d:'todas as questões suscitadas e discutidas, ainda que a sentença não as tenha resolvido (art. 1.013, § 1º).' },
        { t:'Fundamento não acolhido', d:'se houver mais de um fundamento e o juiz acolher só um, a apelação devolve os demais (art. 1.013, § 2º).' },
        { t:'Causa madura', d:'sentença terminativa, ou nula por falta de fundamentação, ou omissa — o tribunal julga o mérito se o processo estiver em condições (art. 1.013, § 3º).' },
        { t:'Questão de fato nova', d:'admitida se a parte provar que deixou de propô-la por motivo de força maior (art. 1.014).' }
      ],
      lei: ['Efeito devolutivo em extensão e profundidade — CPC, art. 1.013 e §§ 1º e 2º',
            'Teoria da causa madura — CPC, art. 1.013, § 3º',
            'Questões de fato não propostas — CPC, art. 1.014'],
      juris: [],
      erro: 'Não pedir a aplicação do § 3º quando a sentença foi terminativa. Sem o pedido o tribunal ainda pode aplicar, mas a peça que o formula joga a favor do apelante.' },
    { nome: 'Pedidos e fecho',
      deve: 'Fechar com pedidos escalonados e requerer o que depende de requerimento: sustentação oral, prioridade e efeito suspensivo.',
      itens: [
        { t:'Escalonamento', d:'nulidade da sentença, reforma total, reforma parcial, redução de honorários.' },
        { t:'Honorários recursais', d:'lembrar que o tribunal majora os honorários ao julgar o recurso (art. 85, § 11) — e pedir isso quando se é apelado.' },
        { t:'Prequestionamento', d:'indicar expressamente os dispositivos violados, com vistas aos recursos excepcionais.' }
      ],
      lei: ['Julgamento monocrático pelo relator — CPC, art. 932',
            'Honorários recursais — CPC, art. 85, § 11',
            'Sustentação oral — CPC, art. 937, I'],
      juris: [],
      modelo: 'Ante o exposto, requer o apelante o CONHECIMENTO e o PROVIMENTO do presente recurso, para:\n\na) anular a r. sentença, ante ..., determinando-se o retorno dos autos à origem;\n\nb) sucessivamente, REFORMAR a r. sentença, julgando procedentes os pedidos formulados na inicial, com a condenação do apelado a ...;\n\nc) sucessivamente, reduzir os honorários fixados, adequando-os ao art. 85, § 2º, do Código de Processo Civil;\n\nd) em qualquer hipótese, a inversão dos ônus sucumbenciais.\n\nRequer, ainda, a intimação para sustentação oral, na forma do art. 937, I, do Código de Processo Civil.\n\nPara fins de prequestionamento, tem-se por violados os arts. ... .',
      erro: 'Não prequestionar. Sem o dispositivo indicado e enfrentado no acórdão, o recurso especial não passa — Súmula 211 do STJ.' }
  ],
  cego: ['Prazo de 15 dias úteis observado','Preparo comprovado na interposição',
    'Requisitos do art. 1.010 presentes','Cada fundamento da sentença atacado especificamente',
    'Efeitos identificados (regra ou exceção do § 1º)','Efeito suspensivo requerido, se cabível',
    'Profundidade do devolutivo invocada','Causa madura pedida, se terminativa',
    'Pedidos escalonados','Sustentação oral requerida','Dispositivos prequestionados']
},

'Agravo de instrumento': {
  rito: 'Civil — recursos',
  freq: 1,   // vezes em que o tema aparece nas 648 provas de discursivas.js
  carreiras: ['Advocacia','Defensoria','Procuradorias','Ministério Público'],
  sobre: 'Recurso de cabimento restrito e formação instrumental. Duas causas de não conhecimento dominam: matéria fora do rol do art. 1.015 e instrumento mal formado. As duas têm remédio, e a peça precisa mostrar que conhece os dois.',
  blocos: [
    { nome: 'Cabimento — o rol e sua mitigação',
      deve: 'Enquadrar a decisão em um inciso do art. 1.015. Não sendo possível, sustentar a taxatividade mitigada, demonstrando a urgência.',
      itens: [
        { t:'Rol do art. 1.015', d:'tutelas provisórias, mérito do processo, rejeição da arbitragem, incidente de desconsideração, gratuidade, exibição, exclusão de litisconsorte, entre outros.' },
        { t:'Taxatividade mitigada', d:'cabe agravo fora do rol quando houver urgência decorrente da inutilidade do julgamento da questão no recurso de apelação.' },
        { t:'Fase de execução e liquidação', d:'no cumprimento de sentença, na execução e no inventário, todas as interlocutórias são agraváveis (art. 1.015, parágrafo único).' },
        { t:'Fora do rol e sem urgência', d:'a questão não preclui e se impugna nas razões ou contrarrazões de apelação (art. 1.009, § 1º).' }
      ],
      lei: ['Hipóteses de cabimento — CPC, art. 1.015',
            'Interlocutórias na execução — CPC, art. 1.015, parágrafo único',
            'Não preclusão das não agraváveis — CPC, art. 1.009, § 1º'],
      juris: ['Taxatividade mitigada — STJ, REsp 1.704.520, Tema 988, j. 05/12/2018'],
      erro: 'Agravar de decisão fora do rol sem uma linha sobre urgência. É o caminho mais curto para o não conhecimento monocrático.' },
    { nome: 'Formação do instrumento',
      deve: 'O agravo é autuado em separado e por isso precisa carregar as peças. As obrigatórias, faltando, geram intimação para sanar — mas não conte com isso.',
      itens: [
        { t:'Obrigatórias', d:'cópia da petição inicial, da contestação, da petição que originou a decisão, da própria decisão agravada, da certidão da intimação e das procurações.' },
        { t:'Facultativas', d:'as que o agravante entenda úteis; junte tudo o que sustenta a urgência.' },
        { t:'Declaração de inexistência', d:'quando a peça obrigatória não existir nos autos, declare isso sob pena de responsabilidade.' },
        { t:'Processo eletrônico', d:'dispensa a juntada das peças obrigatórias (art. 1.017, § 5º).' },
        { t:'Vício sanável', d:'o relator intima para sanar em 5 dias antes de não conhecer (art. 932, parágrafo único, e art. 1.017, § 3º).' }
      ],
      lei: ['Peças do instrumento — CPC, art. 1.017, I a III',
            'Sanação do vício — CPC, art. 1.017, § 3º',
            'Dispensa no processo eletrônico — CPC, art. 1.017, § 5º'],
      juris: [],
      erro: 'Esquecer a certidão de intimação em autos físicos. Sem ela o tribunal não afere a tempestividade, e é a peça mais esquecida das seis.' },
    { nome: 'Requisitos da peça e comunicação ao juízo',
      deve: 'Além dos requisitos do art. 1.016, existe um dever pouco lembrado: comunicar ao juízo de origem, em 3 dias, que o agravo foi interposto.',
      itens: [
        { t:'Requisitos', d:'nomes das partes, exposição do fato e do direito, razões do pedido de reforma ou invalidação, nome e endereço dos advogados.' },
        { t:'Comunicação em 3 dias', d:'juntar aos autos de origem cópia da petição, do comprovante de interposição e a relação de documentos (art. 1.018).' },
        { t:'Consequência', d:'a inadmissibilidade por falta de comunicação só é declarada se o agravado a arguir e provar (art. 1.018, § 3º).' },
        { t:'Retratação', d:'o juiz pode reformar a decisão agravada; comunicando isso ao tribunal, o agravo perde o objeto.' }
      ],
      lei: ['Requisitos do agravo — CPC, art. 1.016',
            'Comunicação ao juízo de origem — CPC, art. 1.018 e §§',
            'Retratação — CPC, art. 1.018, § 1º'],
      juris: [],
      erro: 'Não comunicar ao juízo de origem em autos físicos. É vício alegável pelo agravado e leva à inadmissibilidade — dispensado apenas no processo eletrônico.' },
    { nome: 'Efeito suspensivo e tutela recursal',
      deve: 'O agravo, em regra, não suspende. Pedir ao relator o efeito suspensivo ou a antecipação da tutela recursal, com os dois requisitos separados.',
      itens: [
        { t:'Efeito suspensivo', d:'para paralisar os efeitos da decisão agravada.' },
        { t:'Antecipação da tutela recursal', d:'para conceder desde logo o que a decisão negou — pedidos distintos, com consequências distintas.' },
        { t:'Requisitos', d:'probabilidade de provimento do recurso e risco de dano grave ou de difícil reparação.' }
      ],
      lei: ['Poderes do relator — CPC, art. 1.019, I',
            'Efeito suspensivo aos recursos — CPC, art. 995, parágrafo único'],
      juris: [],
      modelo: 'DO PEDIDO DE EFEITO SUSPENSIVO\n\nNos termos do art. 1.019, I, do Código de Processo Civil, requer o agravante a concessão de EFEITO SUSPENSIVO ao presente recurso.\n\nA probabilidade de provimento decorre de ..., conforme demonstrado nas razões acima.\n\nO risco de dano grave e de difícil reparação está em que, mantida a decisão agravada até o julgamento do colegiado, ....\n\nAnte o exposto, requer:\n\na) a concessão do efeito suspensivo, para sustar os efeitos da r. decisão agravada até o julgamento final do recurso;\n\nb) a intimação do agravado para responder no prazo de 15 dias, na forma do art. 1.019, II;\n\nc) ao final, o PROVIMENTO do agravo, para reformar a r. decisão e ....',
      erro: 'Pedir "efeito suspensivo" quando o que se quer é a concessão da tutela que o juiz negou. Suspender uma negativa não devolve nada — o pedido certo é a antecipação da tutela recursal.' }
  ],
  cego: ['Decisão enquadrada no rol do art. 1.015','Taxatividade mitigada sustentada, se fora do rol',
    'Prazo de 15 dias úteis','Peças obrigatórias do art. 1.017 juntadas',
    'Certidão de intimação presente ou dispensada','Requisitos do art. 1.016',
    'Fundamentos da decisão atacados especificamente','Comunicação ao juízo em 3 dias',
    'Efeito suspensivo ou tutela recursal, com os dois requisitos','Pedido de reforma expresso']
},

'Embargos de declaração': {
  rito: 'Civil — recursos',
  freq: 13,   // vezes em que o tema aparece nas 648 provas de discursivas.js
  carreiras: ['Advocacia','Defensoria','Procuradorias','Ministério Público','Magistratura'],
  sobre: 'Recurso de fundamentação vinculada: só cabe nas hipóteses do art. 1.022. Tem duas funções que a prova separa — integrar a decisão e prequestionar. E tem uma armadilha: usado fora das hipóteses, gera multa.',
  blocos: [
    { nome: 'Hipóteses de cabimento',
      deve: 'Três hipóteses no caput e duas equiparações no parágrafo único. As equiparações são a novidade do CPC/2015 e o que mais se cobra.',
      itens: [
        { t:'Obscuridade ou contradição', d:'inciso I — a decisão não se entende, ou afirma e nega ao mesmo tempo.' },
        { t:'Omissão', d:'inciso II — ponto ou questão sobre a qual o juiz deveria ter se pronunciado, de ofício ou a requerimento.' },
        { t:'Erro material', d:'inciso III — corrigível a qualquer tempo, inclusive de ofício.' },
        { t:'Omissão equiparada', d:'decisão que deixa de se manifestar sobre tese firmada em repetitivos ou IAC, ou que incide em qualquer das condutas do art. 489, § 1º.' }
      ],
      lei: ['Hipóteses — CPC, art. 1.022, I a III',
            'Omissão equiparada — CPC, art. 1.022, parágrafo único',
            'Fundamentação das decisões — CPC, art. 489, § 1º'],
      juris: [],
      erro: 'Embargar por inconformismo. Se a decisão está clara, coerente e completa, o remédio é o recurso próprio — e embargos aqui geram multa.' },
    { nome: 'Prazo, forma e ausência de preparo',
      deve: 'Cinco dias, em petição dirigida ao próprio julgador, com a indicação do erro, obscuridade, contradição ou omissão. Não há preparo.',
      itens: [
        { t:'Prazo', d:'5 dias úteis, em dobro nos casos legais.' },
        { t:'Sem preparo', d:'o art. 1.023 é expresso.' },
        { t:'Contraditório', d:'havendo possibilidade de efeito modificativo, o embargado é intimado para responder em 5 dias.' }
      ],
      lei: ['Prazo e forma — CPC, art. 1.023',
            'Contraditório no efeito modificativo — CPC, art. 1.023, § 2º'],
      juris: [],
      erro: 'Acolher embargos com efeito modificativo sem ouvir a parte contrária. É nulidade — e do lado do juiz, item perdido no espelho.' },
    { nome: 'Efeito interruptivo',
      deve: 'Os embargos INTERROMPEM o prazo dos demais recursos, para todas as partes. Interromper não é suspender: o prazo recomeça do zero.',
      itens: [
        { t:'Interrupção', d:'o prazo do recurso seguinte volta a correr integralmente da intimação da decisão dos embargos.' },
        { t:'Para todas as partes', d:'ainda que embargue apenas uma delas.' },
        { t:'Inadmissíveis não interrompem', d:'embargos intempestivos não produzem o efeito; os apenas rejeitados, sim.' }
      ],
      lei: ['Efeito interruptivo — CPC, art. 1.026, caput'],
      juris: [],
      erro: 'Tratar como suspensão e devolver só os dias restantes. É a conta errada mais comum em prazo recursal.' },
    { nome: 'Prequestionamento',
      deve: 'Embargos opostos para prequestionar não são protelatórios, e o CPC criou o prequestionamento ficto: rejeitados os embargos, consideram-se prequestionados os elementos apontados, se o tribunal superior reconhecer a existência do vício.',
      itens: [
        { t:'Prequestionamento ficto', d:'art. 1.025 — os elementos suscitados nos embargos consideram-se incluídos no acórdão.' },
        { t:'Indicação expressa', d:'aponte o dispositivo e a tese, não apenas "prequestiona-se a matéria".' }
      ],
      lei: ['Prequestionamento ficto — CPC, art. 1.025'],
      juris: ['Embargos com fim de prequestionamento não têm caráter protelatório — Súmula 98 do STJ',
              'Inadmissível o recurso especial quando a questão não foi apreciada, apesar da oposição de embargos — Súmula 211 do STJ'],
      modelo: 'Ante o exposto, requer o embargante o CONHECIMENTO e o ACOLHIMENTO dos presentes embargos, para que seja sanada a omissão apontada, com o pronunciamento expresso sobre ..., atribuindo-se-lhes, se necessário, efeito modificativo.\n\nRequer, ainda, para fins de prequestionamento e nos termos do art. 1.025 do Código de Processo Civil, o pronunciamento expresso sobre os arts. ..., tidos por violados.',
      erro: 'Escrever "prequestiona-se todo o ordenamento". Sem indicar o dispositivo e a tese, o prequestionamento ficto do art. 1.025 não opera.' },
    { nome: 'Protelatoriedade e multa',
      deve: 'Embargos manifestamente protelatórios geram multa de até 2% e, na reiteração, de até 10%. E a partir dos terceiros protelatórios, não se admitem novos.',
      itens: [
        { t:'Primeira multa', d:'até 2% sobre o valor atualizado da causa (art. 1.026, § 2º).' },
        { t:'Reiteração', d:'até 10%, e o recurso seguinte fica condicionado ao depósito (art. 1.026, § 3º).' },
        { t:'Terceiros embargos', d:'não são admitidos se os dois anteriores foram protelatórios (art. 1.026, § 4º).' },
        { t:'Fazenda e gratuidade', d:'recolhem a multa ao final (art. 1.026, § 3º, parte final).' }
      ],
      lei: ['Multa por embargos protelatórios — CPC, art. 1.026, §§ 2º a 4º'],
      juris: [],
      erro: 'Reiterar embargos sobre a mesma questão já enfrentada. Além da multa, o recurso seguinte fica condicionado ao depósito prévio.' }
  ],
  cego: ['Hipótese do art. 1.022 identificada','Omissão equiparada invocada, se for o caso',
    'Prazo de 5 dias observado','Sem recolhimento de preparo',
    'Vício apontado com precisão, não em bloco','Efeito modificativo pedido expressamente, se for o caso',
    'Contraditório observado no efeito modificativo','Dispositivos indicados para prequestionamento',
    'Sem reiteração de matéria já enfrentada']
},
// ═══════════════════ TRANSVERSAIS — TODAS AS CARREIRAS ═══════════════════
'Questão discursiva': {
  rito: '',
  freq: 325,   // vezes em que o tema aparece nas 648 provas de discursivas.js
  ramo: 'Transversal',
  carreiras: ['Magistratura','Ministério Público','Defensoria','Procuradorias','Advocacia','Delegado','Analista / Técnico','Auditoria e Controle'],
  sobre: 'É o formato MAIS COBRADO de todos — 325 das 648 questões do banco de provas aplicadas, e o único formato em carreiras de analista, tribunais de contas e boa parte da advocacia pública. Não é peça: é resposta jurídica fundamentada, com limite de linhas. O que separa a nota alta é responder na primeira linha e fundamentar na segunda.',
  blocos: [
    { nome: 'Ler o comando antes de ler o caso',
      deve: 'O enunciado tem duas partes: o caso e o comando. Leia o comando primeiro — ele diz o que procurar no caso. Ler na ordem inversa faz você grifar o que não será perguntado.',
      itens: [
        { t:'O verbo', d:'"disserte" pede exposição; "analise" pede exame do caso; "responda fundamentadamente" pede resposta objetiva com base legal; "posicione-se" pede tomada de posição.' },
        { t:'Quantos itens', d:'conte as perguntas. Comando com "a), b) e c)" quer três respostas, e o espelho pontua as três separadamente.' },
        { t:'O limite', d:'linhas ou parágrafos. Ultrapassar costuma zerar o excedente; ficar muito abaixo entrega que faltou conteúdo.' },
        { t:'A vedação', d:'algumas bancas proíbem identificação, citação de doutrinador pelo nome ou uso de jurisprudência não indicada. Leia as instruções.' },
        { t:'O recorte', d:'se o comando pergunta sobre a validade do ato, não escreva sobre a competência — por mais que você saiba.' }
      ],
      lei: [],
      juris: [],
      erro: 'Responder o que você sabe em vez do que foi perguntado. É o erro mais comum e o mais caro: conteúdo correto fora do comando não pontua.' },
    { nome: 'Planejar em dois minutos',
      deve: 'Antes da primeira linha, escreva na folha de rascunho o esqueleto. Dois minutos aqui economizam dez de reescrita e evitam a resposta que não chega à conclusão.',
      itens: [
        { t:'A tese', d:'uma frase com a sua resposta. Se você não consegue escrevê-la, ainda não sabe o que vai responder.' },
        { t:'Os fundamentos', d:'liste os dispositivos e as súmulas que sustentam a tese, na ordem em que vai usá-los.' },
        { t:'A exceção', d:'anote a hipótese em que a resposta seria outra — é o que demonstra domínio.' },
        { t:'A distribuição', d:'divida o limite de linhas pelos itens do comando, proporcionalmente ao peso de cada um.' }
      ],
      lei: [],
      juris: [],
      modelo: 'RASCUNHO (não vai na folha definitiva)\n\nTESE: ... (uma frase)\nFUNDAMENTO 1: art. ... — porque ...\nFUNDAMENTO 2: Súmula ... — porque ...\nEXCEÇÃO: se ..., a resposta seria ...\nCONCLUSÃO: ...\n\nLinhas: item a) 10 · item b) 10 · item c) 10',
      erro: 'Começar a escrever direto. Sem esqueleto, a resposta chega ao fim do limite de linhas antes de chegar à conclusão.' },
    { nome: 'Abrir respondendo',
      deve: 'A primeira frase é a resposta. Não escreva introdução, não contextualize, não recapitule o enunciado — o examinador acabou de lê-lo.',
      itens: [
        { t:'Resposta direta', d:'"Sim, o ato é nulo." / "Não, a pretensão está prescrita." / "A competência é da Justiça Federal."' },
        { t:'Sem preâmbulo', d:'nada de "trata-se de questão que envolve relevante tema do direito administrativo".' },
        { t:'Um item por parágrafo', d:'comando com três perguntas rende três blocos identificáveis. Se a banca numerou, numere também.' },
        { t:'Sem repetir o caso', d:'referir o fato é preciso; narrar o enunciado de novo é gastar linha que faltará no fim.' }
      ],
      lei: [],
      juris: [],
      modelo: 'a) NÃO. A pretensão não está prescrita.\n\nO prazo aplicável é o quinquenal do art. 1º do Decreto 20.910/32, contado da ... . Como a ação foi proposta em ..., dentro do quinquênio, não se consumou a prescrição.\n\nb) SIM. A responsabilidade é objetiva.\n\nNos termos do art. 37, § 6º, da Constituição, ...',
      erro: 'Gastar as três primeiras linhas dizendo que a questão é relevante. Em resposta com limite de 20 linhas, isso é 15% da nota jogada fora.' },
    { nome: 'Fundamentar — o que é obrigatório e o que é bônus',
      deve: 'Toda afirmação jurídica precisa de âncora. A hierarquia do que pontua: dispositivo legal primeiro, precedente qualificado depois, doutrina por último — e só se acrescentar algo.',
      itens: [
        { t:'Dispositivo', d:'artigo, parágrafo e inciso. "Nos termos do art. 37, § 6º, da Constituição" vale mais que "segundo o princípio da responsabilidade objetiva".' },
        { t:'Precedente qualificado', d:'súmula vinculante, tema de repercussão geral, tema repetitivo e súmula de tribunal superior — com o número.' },
        { t:'Jurisprudência comum', d:'útil quando o tema não tem precedente qualificado; identifique o tribunal e o órgão.' },
        { t:'Doutrina', d:'só se a banca permitir e só se acrescentar. Nome de autor sem tese não pontua.' },
        { t:'Número incerto', d:'na dúvida sobre o número, descreva o conteúdo sem inventar: "conforme entendimento sumulado do STJ sobre a matéria". Número errado desconta; ausência, não.' }
      ],
      lei: [],
      juris: [],
      erro: 'Inventar número de artigo ou de súmula. O corretor confere, e número errado desconta mais do que a ausência da citação.' },
    { nome: 'Mostrar o outro lado',
      deve: 'Resposta que só afirma parece decorada. Resposta que reconhece a exceção, a divergência ou a evolução do entendimento parece de quem entendeu.',
      itens: [
        { t:'A exceção', d:'"A regra é X; excepciona-se quando Y, hipótese em que ...". Uma linha basta.' },
        { t:'Divergência STF x STJ', d:'quando existir, registre-a e diga qual prevalece — e por quê.' },
        { t:'Entendimento superado', d:'se a matéria mudou, diga que mudou. Aplicar tese revogada é erro de conteúdo, não de forma.' },
        { t:'Sem ficar em cima do muro', d:'apresentar as duas correntes e não escolher é resposta incompleta. Escolha e justifique.' }
      ],
      lei: [],
      juris: [],
      modelo: 'A regra é a de que ..., nos termos do art. ... .\n\nHá, contudo, exceção: quando ..., aplica-se ..., por força de ... .\n\nRegistre-se que o tema comportava divergência, prevalecendo hoje o entendimento de que ..., firmado em ... .',
      erro: 'Expor duas correntes e não se posicionar. O comando pediu uma resposta, e "há divergência" não é resposta.' },
    { nome: 'Fechar e revisar',
      deve: 'A conclusão amarra a resposta ao comando. Depois, dois minutos de revisão de forma — é onde se recupera nota barata.',
      itens: [
        { t:'Conclusão', d:'retome a resposta em uma frase, agora com o fundamento embutido. Não introduza argumento novo aqui.' },
        { t:'Limite de linhas', d:'confira. Excedente costuma não ser lido, e alguns editais preveem desconto.' },
        { t:'Português', d:'frases curtas, período direto, sem adjetivo desnecessário. Erro de concordância desconta em quase toda banca.' },
        { t:'Correção sem rasura', d:'errou? Vírgula, "digo", vírgula, e segue. Rasura e corretivo costumam ser vedados.' },
        { t:'Identificação', d:'nunca assine, nunca cite sua cidade, nunca dê pista de identidade — é anulação certa.' }
      ],
      lei: [],
      juris: [],
      erro: 'Terminar a resposta no meio porque as linhas acabaram. Melhor cortar um fundamento no meio do texto do que não concluir.' }
  ],
  cego: ['Comando lido antes do caso','Verbo do comando identificado',
    'Todos os itens do comando respondidos','Limite de linhas respeitado',
    'Resposta direta na primeira frase','Sem introdução genérica',
    'Cada afirmação com dispositivo, súmula ou tema','Números conferidos, nada inventado',
    'Exceção ou divergência registrada','Posição tomada, não só exposta',
    'Conclusão amarrando ao comando','Português revisado','Sem identificação'],
  dicas: [
    { t:'Este é o formato mais cobrado do banco: 325 das 648 questões de provas aplicadas. Em Analista/Técnico e Tribunais de Contas, é praticamente o único.', alerta:false },
    'Grife o comando com caneta diferente do caso. Ao revisar, você confere item por item se respondeu tudo.',
    'Conte as linhas do seu parágrafo médio uma vez, no início da prova. Depois você estima o resto sem contar.',
    'Se o comando tem três itens e você só sabe dois, responda os dois bem e escreva algo defensável no terceiro. Item em branco é zero garantido.',
    'Fundamento genérico ("princípio da legalidade") pontua menos que dispositivo específico. Quando souber o artigo, cite o artigo.',
    { t:'Nunca invente número de artigo ou súmula. Número errado desconta mais que a ausência — descreva o conteúdo se não lembrar o número.', alerta:true },
    { t:'Qualquer marca de identificação anula a prova: nome, assinatura, cidade, número de inscrição fora do campo próprio, e até desenho na margem.', alerta:true }
  ],
  especiais: [
    { t:'Tribunais de Contas', d:'O comando costuma misturar direito administrativo, financeiro e controle externo. Ancore em CF, arts. 70 a 75, na Lei 14.133/2021 quando for contratação, e na LRF quando for despesa. Distinga sempre contas de governo (parecer prévio, julgamento pelo Legislativo) de contas de gestão (julgamento pelo Tribunal).' },
    { t:'Advocacia Pública', d:'A pergunta quase sempre tem um lado: você responde como procurador do ente. Isso não autoriza sustentar tese insustentável, mas orienta a ordem — prerrogativas, preliminares típicas, prescrição quinquenal e, no mérito, a defesa da presunção de legitimidade do ato.' },
    { t:'Analista e técnico de tribunal', d:'Predominam questões de processo civil, administrativo e constitucional, com comando curto e limite apertado — 15 a 30 linhas. Aqui a economia de palavras vale mais que a profundidade: responda, fundamente com o artigo e conclua.' },
    { t:'OAB 2ª fase', d:'A discursiva vem junto com a peça e vale menos, mas é onde se recupera nota. São quatro questões curtas, cada uma com dois itens; o espelho é objetivo e aceita resposta enxuta desde que fundamentada com o dispositivo.' },
    { t:'Questão com item "justifique"', d:'"Responda e justifique" pede duas coisas, e o espelho pontua as duas separadamente. Responder sem justificar perde metade do item; justificar sem responder perde a outra metade.' }
  ]
},

'Parecer jurídico': {
  rito: '',
  freq: 76,   // vezes em que o tema aparece nas 648 provas de discursivas.js
  ramo: 'Transversal',
  carreiras: ['Advocacia Pública','Procuradorias','Ministério Público','Auditoria e Controle','Advocacia'],
  sobre: 'Segunda peça mais cobrada do banco depois da sentença cível — 76 ocorrências, concentradas em advocacia pública, tribunais de contas e Ministério Público. Não é petição: não há parte adversa nem pedido. É análise técnica que responde a uma consulta e assume uma posição — e a responsabilidade do parecerista muda conforme o parecer seja facultativo, obrigatório ou vinculante.',
  blocos: [
    { nome: 'Ementa e identificação',
      deve: 'O parecer abre por uma ementa que permite localizá-lo depois. Ela resume a consulta e a conclusão em poucas linhas, em tópicos.',
      itens: [
        { t:'Ementa', d:'temas tratados, em tópicos separados por ponto, terminando pela conclusão. É o que vai para o índice de pareceres do órgão.' },
        { t:'Número e referência', d:'número do parecer, processo administrativo de origem e órgão consulente.' },
        { t:'Interessado', d:'quem consulta e em que qualidade.' }
      ],
      lei: [],
      juris: [],
      modelo: 'PARECER Nº .../....\nPROCESSO Nº ....\nINTERESSADO: Secretaria Municipal de ....\nASSUNTO: Consulta sobre a possibilidade de ....\n\nEMENTA: DIREITO ADMINISTRATIVO. CONTRATAÇÃO DIRETA. INEXIGIBILIDADE DE LICITAÇÃO. Art. 74 da Lei 14.133/2021. Inviabilidade de competição não demonstrada nos autos. Ausência de justificativa de preço. Impossibilidade de contratação nos termos propostos. Necessidade de saneamento. PELO NÃO ACOLHIMENTO, na forma exposta.',
      erro: 'Escrever a ementa depois de terminar e não revisar a conclusão. Ementa que anuncia o oposto do que o parecer conclui é erro grosseiro e evidente.' },
    { nome: 'Relatório — o que foi perguntado e o que consta dos autos',
      deve: 'Descrever a consulta e o que existe no processo, sem opinar. O relatório do parecer é curto: ele situa, não argumenta.',
      itens: [
        { t:'A consulta', d:'transcreva ou resuma com precisão a pergunta formulada. É ela que delimita o parecer.' },
        { t:'Os documentos', d:'aponte as peças relevantes com a folha: estudo técnico, termo de referência, pesquisa de preços, minuta de contrato.' },
        { t:'O histórico', d:'os atos administrativos já praticados e as manifestações anteriores.' },
        { t:'O que falta', d:'registre desde o relatório a ausência de documento essencial — é o que sustentará a devolução para saneamento.' }
      ],
      lei: [],
      juris: [],
      erro: 'Adiantar conclusão no relatório. Parecer com juízo de valor antes da fundamentação perde a estrutura e confunde o corretor.' },
    { nome: 'Delimitar a consulta',
      deve: 'Dizer o que se vai responder e — principalmente — o que não se vai. É a defesa do parecerista contra a responsabilização por matéria que não lhe foi submetida.',
      itens: [
        { t:'O objeto', d:'liste as questões jurídicas que serão enfrentadas, numeradas.' },
        { t:'O que fica de fora', d:'juízo de conveniência e oportunidade, aspectos técnicos e de engenharia, aferição de preços de mercado — o parecer jurídico não os alcança.' },
        { t:'A premissa fática', d:'o parecer opina sobre os fatos como descritos pelo consulente; registre isso expressamente.' },
        { t:'A extensão da análise', d:'na contratação pública, a análise jurídica prévia examina os elementos indispensáveis e expõe os pressupostos de fato e de direito considerados.' }
      ],
      lei: ['Análise jurídica prévia na contratação — Lei 14.133/2021, art. 53 e §§',
            'Consultoria e assessoramento jurídico do Poder Executivo — CF, art. 131',
            'Funções da AGU e força dos pareceres — LC 73/93, arts. 40 a 42'],
      juris: [],
      modelo: 'DA DELIMITAÇÃO DA CONSULTA\n\nO presente parecer restringe-se ao exame dos seguintes pontos: (i) a adequação da hipótese de contratação direta invocada; (ii) a suficiência da justificativa de preço; e (iii) a conformidade da minuta contratual com a Lei 14.133/2021.\n\nNão são objeto desta manifestação o juízo de conveniência e oportunidade da contratação, os aspectos técnicos do objeto e a aferição da compatibilidade dos preços com o mercado, matérias afetas à área técnica do órgão consulente.\n\nA análise parte das premissas fáticas tal como descritas no processo administrativo, cuja veracidade não é atestada por este parecer.',
      erro: 'Não delimitar. Parecer que não diz o que ficou de fora é parecer que responde por tudo — inclusive pelo que a área técnica errou.' },
    { nome: 'Fundamentação jurídica',
      deve: 'Enfrentar cada ponto delimitado, na ordem, com dispositivo, precedente e — quando útil — orientação normativa do próprio órgão.',
      itens: [
        { t:'Um tópico por ponto', d:'numerado igual à delimitação, para que o consulente encontre a resposta de cada pergunta.' },
        { t:'Norma aplicável', d:'lei, decreto regulamentador e ato normativo interno, nessa ordem de hierarquia.' },
        { t:'Precedente qualificado', d:'súmula vinculante, tema de repercussão geral, repetitivo — e, em contratação, a jurisprudência do Tribunal de Contas.' },
        { t:'Orientação normativa', d:'pareceres referenciais e enunciados do próprio órgão vinculam a atuação administrativa; cite-os quando existirem.' },
        { t:'Consequências jurídicas', d:'a Lei de Introdução manda considerar as consequências práticas da decisão e vedar decisão com base em valores abstratos.' }
      ],
      lei: ['Motivação e consequências práticas — LINDB, arts. 20 a 22',
            'Contratação direta e inexigibilidade — Lei 14.133/2021, arts. 74 e 75',
            'Processo administrativo federal — Lei 9.784/99, arts. 2º e 50',
            'Controle externo e competência do Tribunal de Contas — CF, art. 71'],
      juris: [],
      modelo: 'DA FUNDAMENTAÇÃO\n\n1. DA HIPÓTESE DE INEXIGIBILIDADE\n\nA contratação direta por inexigibilidade pressupõe a inviabilidade de competição, na forma do art. 74 da Lei 14.133/2021. Não basta a alegação de exclusividade: exige-se a demonstração documental, na forma do § 1º do mesmo artigo.\n\nNo caso, o processo não contém ... . Ausente esse elemento, a hipótese invocada não se sustenta.\n\n2. DA JUSTIFICATIVA DE PREÇO\n\nO art. 72, VII, da Lei 14.133/2021 exige a justificativa de preço no processo de contratação direta. Consta dos autos apenas ..., o que não atende à exigência, na medida em que ... .',
      erro: 'Responder a consulta com uma exposição doutrinária sobre o instituto. O consulente quer saber se pode ou não pode fazer, e por quê.' },
    { nome: 'Risco, alternativas e ressalvas',
      deve: 'O parecer útil não só diz "não pode": diz o que aconteceria se fizesse, e o que fazer para poder. É o bloco que separa o parecer de aluno do parecer de procurador.',
      itens: [
        { t:'Risco jurídico', d:'nulidade do ato, responsabilização do gestor, glosa pelo controle externo, improbidade — com o dispositivo de cada consequência.' },
        { t:'Caminho alternativo', d:'havendo forma lícita de atingir o mesmo fim, aponte-a. Parecer que só barra sem oferecer saída é pouco aproveitado.' },
        { t:'Saneamento', d:'quando o vício for sanável, indique exatamente o que juntar ou corrigir e devolva o processo, em vez de rejeitar.' },
        { t:'Ressalvas', d:'condicione a aprovação ao cumprimento de exigências, listadas em tópicos verificáveis.' }
      ],
      lei: ['Invalidação e convalidação de atos administrativos — Lei 9.784/99, arts. 53 a 55',
            'Regime de responsabilização e dosimetria — LINDB, arts. 22 e 28',
            'Nulidade da contratação e efeitos — Lei 14.133/2021, art. 147',
            'Improbidade: dolo específico — Lei 8.429/92, art. 1º, §§ 1º a 3º'],
      juris: [],
      modelo: 'DO RISCO E DAS ALTERNATIVAS\n\nA contratação nos moldes propostos sujeita o gestor à declaração de nulidade do ajuste (art. 147 da Lei 14.133/2021), à glosa pelo Tribunal de Contas e à eventual responsabilização, observado que a improbidade exige dolo específico (art. 1º, §§ 1º a 3º, da Lei 8.429/92).\n\nHá, contudo, caminho juridicamente viável: ... .\n\nAlternativamente, o vício apontado no item 1 é sanável mediante a juntada de ..., o que recomenda a devolução do processo à área técnica antes de nova manifestação jurídica.',
      erro: 'Apontar o problema e parar aí. O consulente precisa decidir; parecer sem alternativa nem caminho de saneamento não resolve o processo.' },
    { nome: 'Conclusão e fecho',
      deve: 'Conclusão numerada, respondendo cada ponto da delimitação, e o registro da natureza do parecer — porque dela depende a responsabilidade de quem o assina e de quem o segue.',
      itens: [
        { t:'Respostas numeradas', d:'uma conclusão por ponto delimitado, na mesma ordem e com a mesma numeração.' },
        { t:'Natureza do parecer', d:'facultativo, obrigatório ou vinculante. O STF firmou que o parecer meramente opinativo não gera responsabilidade do parecerista; quando obrigatório ou vinculante, o exame é outro.' },
        { t:'Ressalvas finais', d:'que o parecer se apoia nas premissas fáticas do consulente e que a decisão é da autoridade.' },
        { t:'Encaminhamento', d:'a quem se submete e o que se sugere que seja feito.' }
      ],
      lei: ['Decisão da autoridade e motivação — Lei 9.784/99, art. 50',
            'Pareceres da AGU e efeito vinculante quando aprovados — LC 73/93, arts. 40 e 41'],
      juris: ['Parecer meramente opinativo não gera responsabilidade do parecerista — STF, MS 24.073/DF, Pleno',
              'Parecer obrigatório ou vinculante e responsabilidade solidária do parecerista — STF, MS 24.584/DF, Pleno'],
      modelo: 'DA CONCLUSÃO\n\nAnte o exposto, respondo à consulta:\n\n1. A hipótese de inexigibilidade invocada NÃO está caracterizada, ante a ausência de demonstração da inviabilidade de competição (art. 74, § 1º, da Lei 14.133/2021);\n\n2. A justificativa de preço é INSUFICIENTE, por não atender ao art. 72, VII, da Lei 14.133/2021;\n\n3. A minuta contratual, no mais, está em conformidade com a legislação, ressalvada a necessidade de adequação da cláusula ... .\n\nEm face do exposto, MANIFESTO-ME PELO NÃO ACOLHIMENTO da proposta nos termos em que formulada, sugerindo a devolução do processo à área técnica para saneamento dos pontos 1 e 2.\n\nRegistro que o presente parecer tem natureza OPINATIVA, não vinculando a autoridade competente, a quem cabe a decisão, devidamente motivada (art. 50 da Lei 9.784/99).\n\nÉ o parecer, que submeto à consideração superior.\n\nLocal, data.\nProcurador',
      erro: 'Concluir de forma genérica ("pelo prosseguimento do feito"). A conclusão tem de responder cada pergunta da delimitação, na ordem, e de forma inequívoca.' }
  ],
  cego: ['Ementa em tópicos, coerente com a conclusão','Número do parecer e processo de origem',
    'Consulta descrita com precisão','Documentos relevantes apontados com a folha',
    'Delimitação: o que se responde e o que fica de fora','Premissas fáticas ressalvadas',
    'Um tópico de fundamentação por ponto delimitado','Norma, precedente e orientação normativa citados',
    'Consequências práticas consideradas (LINDB, arts. 20 a 22)','Risco jurídico apontado com o dispositivo',
    'Alternativa ou caminho de saneamento indicado','Conclusão numerada, respondendo cada ponto',
    'Natureza do parecer registrada','Encaminhamento à autoridade'],
  dicas: [
    { t:'Segunda peça mais cobrada do banco de provas aplicadas: 76 ocorrências, concentradas em Advocacia Pública, Tribunais de Contas e Ministério Público.', alerta:false },
    'Parecer não tem parte adversa nem pedido. Se você escreveu "requer", saiu do formato.',
    'Delimitar é proteção. O bloco que diz o que ficou de fora é o que impede a responsabilização por matéria técnica que não é sua.',
    'Numere a delimitação e repita a numeração na fundamentação e na conclusão. O corretor confere ponto a ponto.',
    'Sempre ofereça saída. Parecer que só barra é parecer que a Administração ignora.',
    'A LINDB entrou nos espelhos: considerar as consequências práticas (art. 20) e não decidir com base em valores jurídicos abstratos é item pontuado.',
    { t:'Registre a natureza do parecer. O STF distingue: o meramente opinativo não gera responsabilidade do parecerista (MS 24.073); o obrigatório ou vinculante muda o quadro (MS 24.584). Não escrever isso é perder um item fácil.', alerta:true },
    { t:'Ementa que contradiz a conclusão é erro grosseiro. Escreva a ementa por último e confira contra o dispositivo final.', alerta:true }
  ],
  especiais: [
    { t:'Parecer em licitação e contrato', d:'A análise jurídica prévia do art. 53 da Lei 14.133/2021 é mais ampla que a da lei anterior: examina os elementos indispensáveis e expõe os pressupostos de fato e de direito considerados. O § 4º admite dispensa da análise em contratações de baixo valor com minuta padronizada, e o § 5º permite parecer referencial para casos repetitivos.' },
    { t:'Parecer do Ministério Público', d:'Aqui o MP atua como fiscal da ordem jurídica (custos legis). O formato é o de manifestação: relatório, fundamentação e conclusão pelo acolhimento ou não do pedido. Não confunda com a peça de parte — no parecer o MP não postula em nome próprio.' },
    { t:'Parecer em processo de contas', d:'No Tribunal de Contas o parecer técnico precede o voto do relator. Distinga parecer prévio sobre contas de governo (CF, art. 71, I — quem julga é o Legislativo) de manifestação em contas de gestão (art. 71, II — quem julga é o próprio Tribunal). Confundir os dois é erro de base.' },
    { t:'Responsabilidade do parecerista', d:'A distinção clássica do STF é entre parecer facultativo, obrigatório e vinculante. No opinativo, o parecerista em regra não responde (MS 24.073/DF). Quando a lei torna o parecer obrigatório ou vinculante, o STF admite examinar a responsabilidade (MS 24.584/DF). O tema voltou ao STF recentemente sem alteração substancial do quadro.' },
    { t:'Parecer referencial', d:'Aplicável a casos materialmente idênticos e repetitivos, dispensa manifestação individualizada, desde que o gestor ateste a identidade e a atualidade do parecer. É previsto no art. 53, § 5º, da Lei 14.133/2021 e reduz drasticamente o volume de manifestações — item frequente em prova de advocacia pública.' }
  ]
}

};
