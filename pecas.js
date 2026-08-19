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

};
