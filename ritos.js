/* Cátedra — SEQUÊNCIA DOS PROCEDIMENTOS ("Processo e peças").
 *
 * Só trâmite. Nada de conteúdo programático: o edital já vive em modelos-edital.js e o
 * mapa não o repete.
 *
 * Cada rito é uma SEQUÊNCIA de atos, na ordem em que acontecem. De cada ato saem:
 *   ⚖️ dispositivo   → abre no CátedraLEGIS
 *   🏛️ jurisprudência → abre no CátedraJURIS
 *   ✍️ peça          → leva ao treino da peça
 *   ↘ desvio         → para onde o processo pode ir dali
 *
 * NENHUM número de artigo aqui, pela mesma razão do area-modulos.js: número envelhece.
 * O rótulo nomeia o instituto; o texto vem do acervo do app.
 */
window.CT_RITOS = {

// ───────────────────────────── PROCESSO CIVIL ─────────────────────────────
'Civil — conhecimento': [
  ['Distribuição', 'protocolo e livre distribuição', [
    ['⚖️ Competência','lei'], ['⚖️ Prevenção','lei'],
    ['🏛️ Conflito de competência','juris'],
    ['↘ declinação de ofício','desvio']]],
  ['Petição inicial', 'o autor deduz a pretensão', [
    ['⚖️ Requisitos da inicial','lei'], ['⚖️ Pedido e causa de pedir','lei'],
    ['⚖️ Valor da causa','lei'], ['⚖️ Documentos indispensáveis','lei'],
    ['⚖️ Emenda','lei'],
    ['🏛️ Inépcia','juris'], ['🏛️ Pedido implícito','juris'],
    ['✍️ Petição inicial','peca'],
    ['↘ indeferimento liminar','desvio'], ['↘ improcedência liminar do pedido','desvio']]],
  ['Tutela provisória', 'antes ou junto da inicial', [
    ['⚖️ Urgência antecipada','lei'], ['⚖️ Urgência cautelar','lei'],
    ['⚖️ Evidência','lei'], ['⚖️ Estabilização','lei'],
    ['🏛️ Fungibilidade','juris'], ['🏛️ Estabilização · repetitivo','juris'],
    ['✍️ Decisão da tutela','peca'],
    ['↘ agravo de instrumento','desvio']]],
  ['Audiência de conciliação', 'antes da contestação', [
    ['⚖️ Designação','lei'], ['⚖️ Dispensa','lei'],
    ['🏛️ Ausência injustificada','juris'],
    ['↘ autocomposição · homologação','desvio']]],
  ['Citação', 'angulariza a relação processual', [
    ['⚖️ Modos de citação','lei'], ['⚖️ Citação por edital','lei'],
    ['⚖️ Citação por hora certa','lei'],
    ['🏛️ Edital · nulidade','juris'], ['🏛️ Comparecimento espontâneo','juris'],
    ['↘ curador especial','desvio']]],
  ['Resposta do réu', 'contestação e defesas', [
    ['⚖️ Contestação','lei'], ['⚖️ Preliminares','lei'],
    ['⚖️ Reconvenção','lei'], ['⚖️ Revelia e efeitos','lei'],
    ['🏛️ Revelia · efeito relativo','juris'], ['🏛️ Ônus da impugnação específica','juris'],
    ['✍️ Contestação','peca'], ['✍️ Reconvenção','peca'],
    ['↘ incompetência','desvio'], ['↘ impugnação à gratuidade','desvio']]],
  ['Providências preliminares', 'réplica e regularização', [
    ['⚖️ Réplica','lei'], ['⚖️ Julgamento conforme o estado do processo','lei'],
    ['🏛️ Fato impeditivo · réplica','juris'],
    ['↘ extinção sem resolução de mérito','desvio'],
    ['↘ julgamento antecipado do mérito','desvio'],
    ['↘ julgamento antecipado parcial','desvio']]],
  ['Saneamento e organização', 'fixa questões e distribui o ônus', [
    ['⚖️ Decisão de saneamento','lei'], ['⚖️ Ônus da prova','lei'],
    ['⚖️ Distribuição dinâmica','lei'], ['⚖️ Delimitação das questões','lei'],
    ['🏛️ Saneamento compartilhado','juris'], ['🏛️ Inversão do ônus','juris'],
    ['✍️ Decisão saneadora','peca']]],
  ['Instrução', 'produção da prova admitida', [
    ['⚖️ Depoimento pessoal','lei'], ['⚖️ Confissão','lei'],
    ['⚖️ Prova testemunhal','lei'], ['⚖️ Prova pericial','lei'],
    ['⚖️ Prova documental','lei'], ['⚖️ Inspeção judicial','lei'],
    ['⚖️ Prova emprestada','lei'],
    ['🏛️ Prova ilícita','juris'], ['🏛️ Perícia · honorários','juris'],
    ['✍️ Ata de audiência','peca'],
    ['↘ incidente de falsidade','desvio']]],
  ['Alegações finais', 'memoriais ou debates orais', [
    ['⚖️ Debates e memoriais','lei'],
    ['🏛️ Cerceamento de defesa','juris']]],
  ['Sentença', 'resolve o mérito ou extingue', [
    ['⚖️ Elementos da sentença','lei'], ['⚖️ Fundamentação adequada','lei'],
    ['⚖️ Com resolução de mérito','lei'], ['⚖️ Sem resolução de mérito','lei'],
    ['⚖️ Congruência','lei'], ['⚖️ Sucumbência e honorários','lei'],
    ['🏛️ Fundamentação · repercussão geral','juris'], ['🏛️ Extra e ultra petita','juris'],
    ['✍️ Sentença — treino guiado','peca'],
    ['↘ embargos de declaração','desvio'], ['↘ apelação','desvio'],
    ['↘ remessa necessária','desvio']]],
  ['Coisa julgada', 'estabilidade da decisão', [
    ['⚖️ Limites objetivos','lei'], ['⚖️ Limites subjetivos','lei'],
    ['🏛️ Relativização','juris'],
    ['↘ ação rescisória','desvio']]],
],

'Civil — cumprimento e execução': [
  ['Cumprimento de sentença', 'título judicial', [
    ['⚖️ Definitivo e provisório','lei'], ['⚖️ Intimação para pagar','lei'],
    ['⚖️ Multa e honorários','lei'],
    ['🏛️ Multa · termo inicial','juris'],
    ['✍️ Impugnação ao cumprimento','peca'],
    ['↘ impugnação','desvio']]],
  ['Execução por título extrajudicial', 'título executivo', [
    ['⚖️ Títulos executivos','lei'], ['⚖️ Citação para pagar','lei'],
    ['🏛️ Título · liquidez','juris'],
    ['✍️ Embargos à execução','peca'],
    ['↘ exceção de pré-executividade','desvio']]],
  ['Penhora e avaliação', 'constrição patrimonial', [
    ['⚖️ Ordem de preferência','lei'], ['⚖️ Impenhorabilidade','lei'],
    ['⚖️ Penhora on-line','lei'],
    ['🏛️ Bem de família','juris'], ['🏛️ Salário · penhorabilidade','juris'],
    ['↘ embargos de terceiro','desvio']]],
  ['Expropriação', 'satisfação do crédito', [
    ['⚖️ Adjudicação','lei'], ['⚖️ Alienação por iniciativa particular','lei'],
    ['⚖️ Leilão judicial','lei'],
    ['🏛️ Preço vil','juris']]],
],

'Civil — recursos': [
  ['Embargos de declaração', 'omissão, contradição, obscuridade, erro', [
    ['⚖️ Hipóteses','lei'], ['⚖️ Efeitos','lei'],
    ['🏛️ Prequestionamento','juris'], ['🏛️ Caráter protelatório','juris'],
    ['✍️ Embargos de declaração','peca']]],
  ['Apelação', 'contra sentença', [
    ['⚖️ Cabimento','lei'], ['⚖️ Efeitos','lei'], ['⚖️ Teoria da causa madura','lei'],
    ['🏛️ Efeito suspensivo','juris'], ['🏛️ Dialeticidade','juris'],
    ['✍️ Apelação','peca'],
    ['↘ juízo de retratação','desvio']]],
  ['Agravo de instrumento', 'contra decisão interlocutória', [
    ['⚖️ Hipóteses de cabimento','lei'], ['⚖️ Formação do instrumento','lei'],
    ['🏛️ Taxatividade mitigada','juris'],
    ['✍️ Agravo de instrumento','peca']]],
  ['Recursos aos tribunais superiores', 'especial e extraordinário', [
    ['⚖️ Recurso especial','lei'], ['⚖️ Recurso extraordinário','lei'],
    ['⚖️ Agravo em recurso','lei'],
    ['🏛️ Repercussão geral','juris'], ['🏛️ Recursos repetitivos','juris'],
    ['🏛️ Súmula 7 · reexame de prova','juris']]],
],

// ───────────────────────────── PROCESSO PENAL ─────────────────────────────
'Penal — procedimento comum': [
  ['Inquérito policial', 'investigação preliminar', [
    ['⚖️ Formas de instauração','lei'], ['⚖️ Prazos','lei'], ['⚖️ Indiciamento','lei'],
    ['🏛️ Arquivamento','juris'], ['🏛️ Investigação pelo MP','juris'],
    ['✍️ Relatório de inquérito','peca'],
    ['↘ trancamento por habeas corpus','desvio']]],
  ['Denúncia ou queixa', 'deflagração da ação penal', [
    ['⚖️ Requisitos','lei'], ['⚖️ Prazo','lei'], ['⚖️ Rejeição','lei'],
    ['⚖️ Ação penal pública e privada','lei'],
    ['🏛️ Inépcia da denúncia','juris'], ['🏛️ Denúncia genérica','juris'],
    ['✍️ Denúncia','peca'],
    ['↘ rejeição · recurso em sentido estrito','desvio']]],
  ['Citação e resposta à acusação', 'defesa prévia', [
    ['⚖️ Citação do acusado','lei'], ['⚖️ Conteúdo da resposta','lei'],
    ['🏛️ Absolvição sumária','juris'], ['🏛️ Defesa · nulidade','juris'],
    ['✍️ Resposta à acusação','peca'],
    ['↘ absolvição sumária','desvio']]],
  ['Audiência de instrução', 'unidade e concentração', [
    ['⚖️ Ordem dos atos','lei'], ['⚖️ Oitiva de testemunhas','lei'],
    ['⚖️ Interrogatório','lei'],
    ['🏛️ Interrogatório por último','juris'], ['🏛️ Prova ilícita por derivação','juris'],
    ['↘ diligências complementares','desvio']]],
  ['Alegações finais', 'memoriais ou debates orais', [
    ['⚖️ Memoriais','lei'], ['⚖️ Prazo e ordem','lei'],
    ['🏛️ Ausência de alegações · nulidade','juris'],
    ['✍️ Alegações finais da defesa','peca']]],
  ['Sentença penal', 'condenatória ou absolutória', [
    ['⚖️ Emendatio libelli','lei'], ['⚖️ Mutatio libelli','lei'],
    ['⚖️ Dosimetria — 1ª fase','lei'], ['⚖️ Dosimetria — 2ª fase','lei'],
    ['⚖️ Dosimetria — 3ª fase','lei'], ['⚖️ Regime inicial','lei'],
    ['⚖️ Substituição da pena','lei'],
    ['🏛️ Circunstâncias judiciais','juris'], ['🏛️ Regime · súmulas','juris'],
    ['✍️ Sentença penal — treino guiado','peca'],
    ['↘ apelação','desvio'], ['↘ embargos de declaração','desvio']]],
],

'Penal — tribunal do júri': [
  ['Primeira fase — sumário da culpa', 'juízo de acusação', [
    ['⚖️ Instrução preliminar','lei'],
    ['🏛️ In dubio pro societate','juris']]],
  ['Decisão de pronúncia', 'admite a acusação', [
    ['⚖️ Pronúncia','lei'], ['⚖️ Impronúncia','lei'],
    ['⚖️ Absolvição sumária','lei'], ['⚖️ Desclassificação','lei'],
    ['🏛️ Excesso de linguagem','juris'],
    ['✍️ Decisão de pronúncia','peca'],
    ['↘ recurso em sentido estrito','desvio']]],
  ['Preparação do plenário', 'saneamento da 2ª fase', [
    ['⚖️ Alistamento e sorteio','lei'], ['⚖️ Desaforamento','lei'],
    ['🏛️ Desaforamento · requisitos','juris']]],
  ['Sessão de julgamento', 'plenário', [
    ['⚖️ Formação do conselho','lei'], ['⚖️ Incomunicabilidade','lei'],
    ['⚖️ Debates','lei'], ['⚖️ Quesitação','lei'],
    ['🏛️ Quesito genérico de absolvição','juris'], ['🏛️ Soberania dos veredictos','juris'],
    ['✍️ Sentença do júri','peca'],
    ['↘ apelação por decisão contrária à prova','desvio']]],
],

'Penal — prisões e cautelares': [
  ['Prisão em flagrante', 'situação flagrancial', [
    ['⚖️ Espécies de flagrante','lei'], ['⚖️ Auto de prisão','lei'],
    ['🏛️ Flagrante preparado','juris'],
    ['↘ relaxamento','desvio']]],
  ['Audiência de custódia', 'apresentação ao juiz', [
    ['⚖️ Prazo e finalidade','lei'],
    ['🏛️ Ausência · consequências','juris'],
    ['↘ liberdade provisória','desvio'], ['↘ conversão em preventiva','desvio']]],
  ['Prisão preventiva', 'cautelar pessoal', [
    ['⚖️ Requisitos','lei'], ['⚖️ Hipóteses de cabimento','lei'],
    ['⚖️ Revisão periódica','lei'],
    ['🏛️ Fundamentação concreta','juris'], ['🏛️ Gravidade abstrata','juris'],
    ['✍️ Decisão de prisão preventiva','peca']]],
  ['Medidas cautelares diversas', 'alternativas à prisão', [
    ['⚖️ Rol das medidas','lei'], ['⚖️ Monitoração eletrônica','lei'],
    ['🏛️ Proporcionalidade','juris']]],
],

// ───────────────────── OUTRAS DISCIPLINAS COM RITO ─────────────────────
'Constitucional — controle concentrado': [
  ['Ação direta de inconstitucionalidade', 'ADI', [
    ['⚖️ Legitimados','lei'], ['⚖️ Objeto','lei'], ['⚖️ Medida cautelar','lei'],
    ['🏛️ Pertinência temática','juris'], ['🏛️ Efeitos da decisão','juris'],
    ['↘ modulação de efeitos','desvio']]],
  ['Ação declaratória de constitucionalidade', 'ADC', [
    ['⚖️ Requisitos','lei'], ['🏛️ Controvérsia relevante','juris']]],
  ['Arguição de descumprimento', 'ADPF', [
    ['⚖️ Subsidiariedade','lei'], ['🏛️ Estado de coisas inconstitucional','juris']]],
],

'Constitucional — remédios': [
  ['Mandado de segurança', 'direito líquido e certo', [
    ['⚖️ Cabimento','lei'], ['⚖️ Liminar','lei'], ['⚖️ Prazo decadencial','lei'],
    ['🏛️ Prova pré-constituída','juris'], ['🏛️ Autoridade coatora','juris'],
    ['✍️ Sentença em MS','peca']]],
  ['Habeas corpus', 'contra coação ilegal à liberdade de locomoção', [
    ['⚖️ Cabimento','lei'], ['⚖️ Legitimidade universal','lei'],
    ['⚖️ Competência originária','lei'], ['⚖️ Liminar','lei'],
    ['🏛️ HC substitutivo de recurso próprio','juris'],
    ['🏛️ Concessão de ofício','juris'],
    ['✍️ Habeas corpus','peca'],
    ['↘ recurso ordinário constitucional','desvio']]],
  ['Habeas data · mandado de injunção', '', [
    ['⚖️ Habeas data','lei'], ['⚖️ Mandado de injunção','lei'],
    ['🏛️ Efeitos do MI','juris']]],
],

'Administrativo — improbidade': [
  ['Petição inicial', 'legitimidade do MP', [
    ['⚖️ Atos de improbidade','lei'], ['⚖️ Dolo específico','lei'],
    ['🏛️ Dolo · retroatividade','juris'],
    ['✍️ Petição inicial de improbidade','peca']]],
  ['Notificação e defesa prévia', '', [
    ['⚖️ Rito da lei','lei'], ['🏛️ Rejeição liminar','juris']]],
  ['Instrução e sentença', '', [
    ['⚖️ Sanções','lei'], ['⚖️ Dosimetria das sanções','lei'],
    ['🏛️ Proporcionalidade das sanções','juris']]],
],

'Ambiental — ação civil pública': [
  ['Inquérito civil', 'investigação do MP', [
    ['⚖️ Instauração','lei'], ['🏛️ Compromisso de ajustamento','juris'],
    ['↘ TAC','desvio']]],
  ['Petição inicial da ACP', '', [
    ['⚖️ Legitimados','lei'], ['⚖️ Objeto','lei'], ['⚖️ Liminar','lei'],
    ['🏛️ Competência','juris'],
    ['✍️ ACP ambiental','peca']]],
  ['Sentença e coisa julgada', '', [
    ['⚖️ Coisa julgada erga omnes','lei'],
    ['🏛️ Dano ambiental · imprescritibilidade','juris'],
    ['🏛️ Responsabilidade objetiva e solidária','juris']]],
],

'Tributário — execução fiscal': [
  ['Inscrição em dívida ativa', 'constituição do título', [
    ['⚖️ CDA · requisitos','lei'],
    ['🏛️ Presunção de certeza','juris'],
    ['↘ substituição da CDA','desvio']]],
  ['Citação e garantia', '', [
    ['⚖️ Citação','lei'], ['⚖️ Penhora','lei'],
    ['🏛️ Redirecionamento ao sócio','juris']]],
  ['Embargos à execução fiscal', 'defesa do executado', [
    ['⚖️ Prazo e efeitos','lei'],
    ['🏛️ Efeito suspensivo','juris'],
    ['✍️ Embargos à execução fiscal','peca'],
    ['↘ exceção de pré-executividade','desvio']]],
],

'Eleitoral — ações': [
  ['Registro de candidatura', 'RRC', [
    ['⚖️ Condições de elegibilidade','lei'], ['⚖️ Inelegibilidades','lei'],
    ['🏛️ Ficha limpa','juris'],
    ['↘ impugnação ao registro','desvio']]],
  ['AIJE', 'investigação judicial eleitoral', [
    ['⚖️ Abuso de poder','lei'], ['⚖️ Rito','lei'],
    ['🏛️ Gravidade das circunstâncias','juris']]],
  ['AIME', 'impugnação de mandato eletivo', [
    ['⚖️ Prazo e hipóteses','lei'], ['🏛️ Segredo de justiça','juris']]],
],

'Criança e adolescente — ato infracional': [
  ['Apreensão e oitiva', '', [
    ['⚖️ Apreensão em flagrante','lei'], ['⚖️ Oitiva informal do MP','lei'],
    ['🏛️ Internação provisória','juris'],
    ['↘ remissão','desvio']]],
  ['Representação e defesa', '', [
    ['⚖️ Representação do MP','lei'], ['⚖️ Defesa técnica','lei'],
    ['🏛️ Defensor · obrigatoriedade','juris']]],
  ['Sentença e medidas', '', [
    ['⚖️ Medidas socioeducativas','lei'], ['⚖️ Internação · hipóteses','lei'],
    ['🏛️ Excepcionalidade da internação','juris'],
    ['✍️ Sentença socioeducativa','peca']]],
],

'Empresarial — recuperação e falência': [
  ['Pedido de recuperação judicial', '', [
    ['⚖️ Requisitos','lei'], ['⚖️ Deferimento do processamento','lei'],
    ['🏛️ Stay period','juris']]],
  ['Plano e assembleia', '', [
    ['⚖️ Plano de recuperação','lei'], ['⚖️ Assembleia de credores','lei'],
    ['🏛️ Cram down','juris']]],
  ['Falência', '', [
    ['⚖️ Hipóteses','lei'], ['⚖️ Classificação dos créditos','lei'],
    ['🏛️ Sucessão trabalhista','juris']]],
],

// ══════════════════ TRABALHO ══════════════════
'Trabalho — rito ordinário': [
  ['Reclamação trabalhista', 'petição inicial na Justiça do Trabalho', [
    ['⚖️ Requisitos da inicial','lei'], ['⚖️ Pedido certo e com valor','lei'],
    ['⚖️ Jus postulandi','lei'], ['⚖️ Competência da Justiça do Trabalho','lei'],
    ['🏛️ Limitação da condenação ao valor do pedido','juris'],
    ['↘ arquivamento por inépcia','desvio']]],
  ['Notificação do reclamado', 'via postal, presume-se recebida', [
    ['⚖️ Notificação e prazo','lei'], ['🏛️ Presunção de recebimento','juris']]],
  ['Audiência una', 'conciliação, defesa e instrução', [
    ['⚖️ Comparecimento obrigatório das partes','lei'],
    ['⚖️ Proposta obrigatória de conciliação','lei'],
    ['🏛️ Preposto e conhecimento dos fatos','juris'],
    ['↘ arquivamento pela ausência do autor','desvio'],
    ['↘ revelia e confissão pela ausência do réu','desvio']]],
  ['Defesa', 'contestação, exceções e reconvenção', [
    ['⚖️ Contestação em 20 minutos ou por escrito','lei'],
    ['⚖️ Exceção de incompetência territorial','lei'],
    ['⚖️ Prescrição bienal e quinquenal','lei'],
    ['🏛️ Ônus da prova nas horas extras','juris'],
    ['✍️ Contestação','peca']]],
  ['Instrução', 'depoimentos, testemunhas e perícia', [
    ['⚖️ Interrogatório das partes','lei'], ['⚖️ Até 3 testemunhas por parte','lei'],
    ['⚖️ Perícia obrigatória em insalubridade','lei'],
    ['🏛️ Confissão ficta','juris']]],
  ['Razões finais e conciliação', '10 minutos para cada parte', [
    ['⚖️ Razões finais orais','lei'], ['⚖️ Segunda proposta de conciliação','lei']]],
  ['Sentença', 'resolve o mérito', [
    ['⚖️ Requisitos da sentença trabalhista','lei'],
    ['⚖️ Juros e correção monetária','lei'],
    ['⚖️ Honorários de sucumbência','lei'],
    ['🏛️ Índice de correção dos débitos trabalhistas','juris'],
    ['↘ embargos de declaração em 5 dias','desvio']]],
  ['Recurso ordinário', 'prazo de 8 dias, com depósito recursal', [
    ['⚖️ Recurso ordinário','lei'], ['⚖️ Depósito recursal e custas','lei'],
    ['🏛️ Deserção','juris'],
    ['↘ recurso de revista ao TST','desvio']]],
],

'Trabalho — execução': [
  ['Liquidação', 'por cálculo, arbitramento ou artigos', [
    ['⚖️ Modalidades de liquidação','lei'], ['⚖️ Impugnação aos cálculos','lei'],
    ['🏛️ Coisa julgada e limites da liquidação','juris']]],
  ['Citação para pagar', '48 horas para pagar ou garantir', [
    ['⚖️ Mandado de citação e penhora','lei'], ['⚖️ Garantia do juízo','lei']]],
  ['Embargos à execução', 'prazo de 5 dias, garantido o juízo', [
    ['⚖️ Embargos do executado','lei'], ['⚖️ Impugnação do exequente','lei'],
    ['🏛️ Matérias alegáveis','juris'],
    ['✍️ Embargos à execução','peca'],
    ['↘ agravo de petição','desvio']]],
  ['Expropriação', 'penhora, avaliação e alienação', [
    ['⚖️ Ordem de penhora','lei'], ['⚖️ Impenhorabilidade','lei'],
    ['🏛️ Penhora de salário para crédito trabalhista','juris'],
    ['🏛️ Desconsideração da personalidade jurídica','juris']]],
  ['Extinção', 'satisfação do crédito', [
    ['⚖️ Extinção da execução','lei'], ['🏛️ Prescrição intercorrente','juris']]],
],

// ══════════════════ PREVIDENCIÁRIO ══════════════════
'Previdenciário — concessão de benefício': [
  ['Requerimento administrativo', 'condição para o interesse de agir', [
    ['⚖️ Requerimento ao INSS','lei'],
    ['🏛️ Prévio requerimento como interesse de agir · repercussão geral','juris'],
    ['↘ recurso ao Conselho de Recursos','desvio']]],
  ['Ação previdenciária', 'competência e inicial', [
    ['⚖️ Competência delegada da Justiça Estadual','lei'],
    ['⚖️ Juizado Especial Federal até 60 salários','lei'],
    ['🏛️ Competência para acidente do trabalho','juris'],
    ['✍️ Petição inicial','peca']]],
  ['Contestação do INSS', 'prazo em dobro para a Fazenda', [
    ['⚖️ Prazo em dobro','lei'], ['⚖️ Prescrição das parcelas','lei'],
    ['🏛️ Decadência do direito de revisão','juris'],
    ['✍️ Contestação da Fazenda Pública','peca']]],
  ['Prova do tempo e da incapacidade', 'perícia e prova material', [
    ['⚖️ Carência e qualidade de segurado','lei'],
    ['⚖️ Tempo especial e agentes nocivos','lei'],
    ['🏛️ Início de prova material para tempo rural · súmula','juris'],
    ['🏛️ Prova exclusivamente testemunhal é insuficiente','juris']]],
  ['Sentença', 'concessão, revisão ou improcedência', [
    ['⚖️ Termo inicial do benefício','lei'], ['⚖️ Juros e correção','lei'],
    ['⚖️ Honorários contra a Fazenda','lei'],
    ['🏛️ Desaposentação','juris'],
    ['✍️ Sentença — treino guiado','peca'],
    ['↘ remessa necessária','desvio']]],
  ['Cumprimento contra a Fazenda', 'precatório ou RPV', [
    ['⚖️ Cumprimento contra a Fazenda','lei'], ['⚖️ Precatório e requisição de pequeno valor','lei'],
    ['✍️ Impugnação ao cumprimento','peca']]],
],

// ══════════════════ JUIZADOS ══════════════════
'Juizado Especial Cível': [
  ['Pedido', 'escrito ou oral, na secretaria', [
    ['⚖️ Competência até 40 salários mínimos','lei'],
    ['⚖️ Causas excluídas do Juizado','lei'],
    ['⚖️ Advogado dispensável até 20 salários','lei'],
    ['🏛️ Opção do autor e renúncia ao excedente','juris'],
    ['↘ incompetência: extinção sem julgamento','desvio']]],
  ['Sessão de conciliação', 'primeiro ato do procedimento', [
    ['⚖️ Conciliação e juízo arbitral','lei'],
    ['↘ ausência do autor: extinção com custas','desvio'],
    ['↘ ausência do réu: revelia','desvio']]],
  ['Audiência de instrução', 'contestação e provas na mesma sessão', [
    ['⚖️ Contestação oral ou escrita','lei'],
    ['⚖️ Pedido contraposto','lei'],
    ['⚖️ Prova técnica simplificada','lei'],
    ['🏛️ Vedação à intervenção de terceiros','juris']]],
  ['Sentença', 'dispensado o relatório', [
    ['⚖️ Sentença sem relatório','lei'],
    ['⚖️ Vedação à sentença ilíquida','lei'],
    ['🏛️ Fundamentação sucinta','juris'],
    ['↘ embargos de declaração em 5 dias','desvio']]],
  ['Recurso inominado', 'prazo de 10 dias, com advogado', [
    ['⚖️ Recurso inominado às turmas recursais','lei'],
    ['⚖️ Efeito apenas devolutivo, salvo dano irreparável','lei'],
    ['🏛️ Cabimento de mandado de segurança contra ato de turma recursal','juris'],
    ['↘ recurso extraordinário ao STF','desvio']]],
],

'Juizado Especial Criminal': [
  ['Termo circunstanciado', 'infração de menor potencial ofensivo', [
    ['⚖️ Conceito de menor potencial ofensivo','lei'],
    ['⚖️ Lavratura do termo e não imposição de prisão em flagrante','lei'],
    ['🏛️ Concurso de crimes e soma das penas','juris']]],
  ['Audiência preliminar', 'composição civil e representação', [
    ['⚖️ Composição dos danos civis','lei'],
    ['⚖️ Renúncia ao direito de representação','lei'],
    ['⚖️ Representação na lesão leve e culposa','lei'],
    ['🏛️ Inaplicabilidade na violência doméstica · súmula','juris']]],
  ['Transação penal', 'proposta do Ministério Público', [
    ['⚖️ Requisitos da transação','lei'],
    ['🏛️ Descumprimento permite oferecer denúncia · súmula vinculante','juris'],
    ['🏛️ Transação não gera reincidência nem maus antecedentes','juris'],
    ['↘ recusa injustificada do MP: art. 28 do CPP','desvio']]],
  ['Denúncia e procedimento sumaríssimo', 'oral, reduzida a termo', [
    ['⚖️ Denúncia oral','lei'], ['⚖️ Resposta antes do recebimento','lei'],
    ['✍️ Denúncia','peca']]],
  ['Suspensão condicional do processo', 'pena mínima até 1 ano', [
    ['⚖️ Requisitos e período de prova','lei'],
    ['🏛️ Suspensão e crimes em concurso · súmula','juris'],
    ['↘ revogação obrigatória e facultativa','desvio']]],
  ['Sentença e recurso', 'apelação em 10 dias', [
    ['⚖️ Apelação no Juizado','lei'], ['⚖️ Embargos de declaração','lei'],
    ['✍️ Sentença penal — treino guiado','peca']]],
],

// ══════════════════ EXECUÇÃO PENAL ══════════════════
'Penal — execução penal': [
  ['Guia de recolhimento', 'inicia a execução', [
    ['⚖️ Expedição da guia','lei'], ['⚖️ Competência do juízo da execução','lei'],
    ['🏛️ Competência para execução provisória','juris']]],
  ['Progressão de regime', 'requisito objetivo e subjetivo', [
    ['⚖️ Percentuais do art. 112 da LEP','lei'],
    ['⚖️ Exame criminológico facultativo e motivado','lei'],
    ['🏛️ Data-base após falta grave','juris'],
    ['🏛️ Progressão per saltum é vedada · súmula','juris'],
    ['↘ regressão de regime','desvio']]],
  ['Remição', 'pelo trabalho e pelo estudo', [
    ['⚖️ Remição pelo trabalho','lei'], ['⚖️ Remição pelo estudo','lei'],
    ['⚖️ Perda de até 1/3 pela falta grave','lei'],
    ['🏛️ Remição pela leitura','juris']]],
  ['Falta grave', 'apuração e efeitos', [
    ['⚖️ Rol das faltas graves','lei'], ['⚖️ Sanções disciplinares','lei'],
    ['🏛️ Necessidade de procedimento administrativo com defesa técnica · súmula','juris'],
    ['🏛️ Falta grave interrompe o prazo da progressão, não do livramento · súmula','juris']]],
  ['Livramento condicional', 'requisitos objetivos e subjetivos', [
    ['⚖️ Requisitos do livramento','lei'], ['⚖️ Condições e revogação','lei'],
    ['🏛️ Falta grave não interrompe o prazo do livramento · súmula','juris']]],
  ['Incidentes e recurso', 'agravo em execução', [
    ['⚖️ Procedimento judicial da execução','lei'],
    ['⚖️ Agravo em execução, sem efeito suspensivo','lei'],
    ['🏛️ Prazo de 5 dias do agravo em execução · súmula','juris'],
    ['↘ unificação de penas e detração','desvio']]],
],

// ══════════════════ CONSUMIDOR ══════════════════
'Consumidor — relação de consumo': [
  ['Caracterização da relação', 'consumidor, fornecedor e destinação final', [
    ['⚖️ Conceito de consumidor','lei'], ['⚖️ Conceito de fornecedor','lei'],
    ['🏛️ Teoria finalista mitigada','juris'],
    ['🏛️ Consumidor por equiparação','juris']]],
  ['Vício ou fato do produto ou serviço', 'a distinção que muda tudo', [
    ['⚖️ Vício do produto e prazos do art. 18','lei'],
    ['⚖️ Fato do produto e responsabilidade do art. 12','lei'],
    ['⚖️ Responsabilidade do comerciante','lei'],
    ['⚖️ Decadência e prescrição no CDC','lei'],
    ['🏛️ Vício oculto e termo inicial','juris']]],
  ['Ação individual', 'foro, inversão e tutela', [
    ['⚖️ Foro do domicílio do consumidor','lei'],
    ['⚖️ Inversão do ônus da prova','lei'],
    ['⚖️ Desconsideração da personalidade jurídica','lei'],
    ['🏛️ Momento da inversão do ônus','juris'],
    ['✍️ Petição inicial','peca']]],
  ['Práticas abusivas e cobrança indevida', 'repetição do indébito', [
    ['⚖️ Práticas abusivas','lei'], ['⚖️ Repetição em dobro','lei'],
    ['⚖️ Cláusulas abusivas e nulidade de pleno direito','lei'],
    ['🏛️ Repetição em dobro independe de má-fé · uniformização','juris']]],
  ['Tutela coletiva', 'direitos difusos, coletivos e individuais homogêneos', [
    ['⚖️ Classificação dos direitos coletivos','lei'],
    ['⚖️ Legitimidade e coisa julgada','lei'],
    ['✍️ ACP ambiental','peca'],
    ['↘ liquidação e execução individual','desvio']]],
],

// ══════════════════ FAMÍLIA E SUCESSÕES ══════════════════
'Família — alimentos e guarda': [
  ['Ação de alimentos', 'rito especial da Lei 5.478/68', [
    ['⚖️ Procedimento especial dos alimentos','lei'],
    ['⚖️ Alimentos provisórios de ofício','lei'],
    ['⚖️ Binômio necessidade e possibilidade','lei'],
    ['🏛️ Alimentos avoengos são subsidiários e complementares · súmula','juris'],
    ['✍️ Petição inicial','peca']]],
  ['Guarda e convivência', 'melhor interesse da criança', [
    ['⚖️ Guarda compartilhada como regra','lei'],
    ['⚖️ Guarda unilateral e convivência','lei'],
    ['🏛️ Compartilhada mesmo sem consenso','juris'],
    ['↘ estudo psicossocial','desvio']]],
  ['Cumprimento de alimentos', 'prisão ou expropriação', [
    ['⚖️ Rito da prisão civil: três prestações','lei'],
    ['⚖️ Protesto e desconto em folha','lei'],
    ['🏛️ Prisão civil apenas pelas prestações recentes · súmula','juris'],
    ['↘ habeas corpus contra a prisão','desvio']]],
  ['Sentença e revisão', 'cláusula rebus sic stantibus', [
    ['⚖️ Ação revisional e exoneratória','lei'],
    ['🏛️ Maioridade não exonera automaticamente · súmula','juris'],
    ['✍️ Sentença — treino guiado','peca']]],
],

'Sucessões — inventário e partilha': [
  ['Abertura da sucessão', 'saisine e prazo', [
    ['⚖️ Transmissão imediata da herança','lei'],
    ['⚖️ Prazo para abrir o inventário','lei'],
    ['⚖️ Foro do último domicílio','lei'],
    ['🏛️ Multa fiscal por atraso · súmula','juris']]],
  ['Escolha da via', 'judicial, arrolamento ou extrajudicial', [
    ['⚖️ Inventário e arrolamento','lei'],
    ['⚖️ Inventário extrajudicial por escritura','lei'],
    ['↘ arrolamento sumário','desvio'],
    ['↘ alvará judicial','desvio']]],
  ['Primeiras declarações e habilitação', 'herdeiros e bens', [
    ['⚖️ Primeiras declarações','lei'], ['⚖️ Citação e impugnações','lei'],
    ['⚖️ Colação e sonegados','lei'],
    ['🏛️ Herdeiro preterido e petição de herança','juris']]],
  ['Avaliação e cálculo do imposto', 'ITCMD', [
    ['⚖️ Avaliação dos bens','lei'], ['⚖️ Cálculo do tributo','lei'],
    ['🏛️ Homologação da partilha depende da quitação · súmula','juris']]],
  ['Partilha', 'sentença e formal', [
    ['⚖️ Esboço e julgamento da partilha','lei'],
    ['⚖️ Formal de partilha','lei'],
    ['⚖️ Anulação e rescisão da partilha','lei'],
    ['✍️ Sentença — treino guiado','peca']]],
],

// ══════════════════ REGISTROS PÚBLICOS ══════════════════
'Registros públicos — dúvida registral': [
  ['Qualificação registral', 'o registrador examina o título', [
    ['⚖️ Princípio da legalidade registral','lei'],
    ['⚖️ Nota devolutiva','lei'],
    ['🏛️ Limites da qualificação registral','juris']]],
  ['Suscitação da dúvida', 'a requerimento do interessado', [
    ['⚖️ Procedimento da dúvida','lei'],
    ['⚖️ Dúvida inversa','lei'],
    ['🏛️ Natureza administrativa do procedimento','juris']]],
  ['Manifestação e parecer', 'interessado e Ministério Público', [
    ['⚖️ Impugnação em 15 dias','lei'], ['⚖️ Vista ao Ministério Público','lei']]],
  ['Sentença', 'procedente ou improcedente a dúvida', [
    ['⚖️ Decisão do juiz corregedor','lei'],
    ['⚖️ Ausência de coisa julgada material','lei'],
    ['↘ apelação ao Conselho Superior da Magistratura','desvio']]],
],

// ══════════════════ CONTROLE EXTERNO ══════════════════
'Controle externo — processo de contas': [
  ['Competência e objeto', 'contas de governo e contas de gestão', [
    ['⚖️ Competências do Tribunal de Contas','lei'],
    ['⚖️ Parecer prévio sobre as contas do chefe do Executivo','lei'],
    ['🏛️ Contas de prefeito: julgamento pela Câmara · repercussão geral','juris'],
    ['🏛️ Tribunal de Contas não é órgão judicante','juris']]],
  ['Instauração', 'tomada e prestação de contas', [
    ['⚖️ Prestação de contas ordinária','lei'],
    ['⚖️ Tomada de contas especial','lei'],
    ['↘ representação e denúncia','desvio']]],
  ['Contraditório', 'citação e audiência do responsável', [
    ['⚖️ Citação do responsável','lei'], ['⚖️ Defesa e produção de prova','lei'],
    ['🏛️ Contraditório na anulação de ato que beneficia terceiro · súmula vinculante','juris'],
    ['🏛️ Prazo decadencial para revisão de atos','juris']]],
  ['Julgamento', 'regulares, ressalvadas ou irregulares', [
    ['⚖️ Espécies de julgamento das contas','lei'],
    ['⚖️ Débito e multa','lei'],
    ['⚖️ Inabilitação para cargo em comissão','lei'],
    ['🏛️ Título executivo do acórdão condenatório','juris'],
    ['🏛️ Imprescritibilidade do ressarcimento por ato doloso · repercussão geral','juris']]],
  ['Recursos e controle judicial', 'reexame e mandado de segurança', [
    ['⚖️ Recursos no processo de contas','lei'],
    ['🏛️ Controle judicial limitado à legalidade do procedimento','juris'],
    ['↘ mandado de segurança contra o acórdão','desvio']]],
],

'Penal — recursos': [
  ['Embargos de declaração', 'omissão, ambiguidade, obscuridade ou contradição', [
    ['⚖️ Hipóteses e prazo de 2 dias','lei'], ['🏛️ Efeito interruptivo','juris'],
    ['✍️ Embargos de declaração','peca']]],
  ['Recurso em sentido estrito', 'rol taxativo', [
    ['⚖️ Hipóteses de cabimento','lei'], ['⚖️ Prazo e juízo de retratação','lei'],
    ['🏛️ Taxatividade do rol','juris'],
    ['↘ carta testemunhável','desvio']]],
  ['Apelação criminal', 'contra sentença definitiva', [
    ['⚖️ Hipóteses de cabimento','lei'], ['⚖️ Prazo de interposição e de razões','lei'],
    ['⚖️ Efeito devolutivo e suspensivo','lei'],
    ['🏛️ Reformatio in pejus','juris'], ['🏛️ Apelação no júri','juris'],
    ['✍️ Apelação criminal','peca']]],
  ['Recursos aos tribunais superiores', 'especial e extraordinário', [
    ['⚖️ Cabimento do recurso especial','lei'], ['⚖️ Repercussão geral','lei'],
    ['🏛️ Prequestionamento','juris'],
    ['↘ agravo em recurso especial','desvio']]],
  ['Ações autônomas de impugnação', 'fora do sistema recursal', [
    ['⚖️ Habeas corpus','lei'], ['⚖️ Revisão criminal','lei'],
    ['⚖️ Mandado de segurança em matéria criminal','lei'],
    ['🏛️ Revisão criminal e prova nova','juris'],
    ['✍️ Habeas corpus','peca']]],
],

};
