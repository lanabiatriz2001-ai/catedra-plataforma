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
  ['Alegações finais', 'memoriais', [
    ['⚖️ Memoriais','lei'],
    ['🏛️ Ausência de alegações · nulidade','juris']]],
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
  ['Habeas corpus', 'liberdade de locomoção', [
    ['⚖️ Cabimento','lei'], ['🏛️ HC substitutivo','juris']]],
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
};
