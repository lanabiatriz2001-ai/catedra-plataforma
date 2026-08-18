/* Cátedra — conteúdo dos MÓDULOS POR ÁREA (area-web.html).
   Vive fora do app, como os modelos de edital: só é baixado quando a pessoa abre o
   módulo da sua área.

   O que entra aqui: ESTRUTURA estável e verificável da carreira — os sistemas do
   corpo humano, os equipamentos do SUAS, os tributos por competência da Constituição,
   as camadas do modelo OSI. NÃO entra doutrina, número de artigo, prazo, dose,
   protocolo clínico nem nada que dependa de edição/ano: isso muda, e material de
   estudo errado é pior que material nenhum. Cada item é um PONTO DE ESTUDO para
   marcar progresso, não uma fonte de consulta.

   Formato: { nome, icone, sub, legenda, disc, grupos:[{n, c, itens:[{t, d}]}] }
   - disc = disciplina sugerida ao abrir o registro de sessão a partir do item
   - t = título do ponto | d = o que revisar dentro dele (roteiro curto) */
window.CT_MODULOS = {

  saude: {
    nome:'Corpo humano', icone:'🩺', disc:'Anatomia e Fisiologia',
    sub:'Os sistemas do corpo, estrutura por estrutura — marque o que já domina',
    legenda:'Mapa de estudo da anatomia e fisiologia humana. Cada sistema tem uma barra de progresso: o verde enche conforme você marca as estruturas como dominadas.',
    grupos:[
      {n:'Sistema tegumentar', c:'#c0392f', itens:[
        {t:'Epiderme', d:'camadas, queratinócitos, melanócitos, renovação celular'},
        {t:'Derme', d:'papilar e reticular, colágeno, vasos, terminações nervosas'},
        {t:'Hipoderme (tela subcutânea)', d:'tecido adiposo, isolamento térmico, reserva'},
        {t:'Anexos cutâneos', d:'pelos, unhas, glândulas sudoríparas e sebáceas'},
        {t:'Funções da pele', d:'barreira, termorregulação, sensibilidade, síntese de vitamina D'} ]},
      {n:'Sistema esquelético', c:'#b08433', itens:[
        {t:'Crânio', d:'neurocrânio e viscerocrânio, suturas, forames'},
        {t:'Coluna vertebral', d:'cervical, torácica, lombar, sacro e cóccix; curvaturas'},
        {t:'Caixa torácica', d:'esterno, costelas verdadeiras, falsas e flutuantes'},
        {t:'Cintura escapular e membro superior', d:'clavícula, escápula, úmero, rádio, ulna, carpo, metacarpo, falanges'},
        {t:'Cintura pélvica e membro inferior', d:'ílio, ísquio, púbis, fêmur, patela, tíbia, fíbula, tarso, metatarso'},
        {t:'Tecido ósseo', d:'compacto e esponjoso, osteócitos, remodelação, ossificação'} ]},
      {n:'Sistema articular', c:'#c2790c', itens:[
        {t:'Articulações fibrosas', d:'suturas, sindesmoses, gonfoses'},
        {t:'Articulações cartilagíneas', d:'sínfises e sincondroses'},
        {t:'Articulações sinoviais', d:'cápsula, membrana e líquido sinovial, cartilagem hialina'},
        {t:'Movimentos articulares', d:'flexão, extensão, abdução, adução, rotação, circundução'} ]},
      {n:'Sistema muscular', c:'#a855f7', itens:[
        {t:'Músculo esquelético', d:'estriado voluntário, sarcômero, unidade motora'},
        {t:'Músculo liso', d:'involuntário, vísceras e vasos'},
        {t:'Músculo cardíaco', d:'estriado involuntário, discos intercalares'},
        {t:'Contração muscular', d:'deslizamento dos filamentos, actina e miosina, cálcio, ATP'},
        {t:'Principais grupos musculares', d:'cabeça e pescoço, tronco, membros superiores e inferiores'} ]},
      {n:'Sistema nervoso', c:'#6b4fbb', itens:[
        {t:'Neurônio e neuróglia', d:'corpo, dendritos, axônio, bainha de mielina, sinapse'},
        {t:'Encéfalo', d:'cérebro, cerebelo e tronco encefálico; lobos e áreas funcionais'},
        {t:'Medula espinal', d:'substância cinzenta e branca, arco reflexo'},
        {t:'Meninges e liquor', d:'dura-máter, aracnoide, pia-máter, circulação liquórica'},
        {t:'Nervos cranianos e espinhais', d:'doze pares cranianos; trinta e um pares espinhais'},
        {t:'Sistema nervoso autônomo', d:'simpático e parassimpático, respostas antagônicas'} ]},
      {n:'Sistema endócrino', c:'#0d9488', itens:[
        {t:'Hipotálamo e hipófise', d:'eixo de comando, adeno e neuro-hipófise'},
        {t:'Tireoide e paratireoides', d:'hormônios tireoidianos, metabolismo, cálcio'},
        {t:'Suprarrenais', d:'córtex e medula, cortisol, aldosterona, catecolaminas'},
        {t:'Pâncreas endócrino', d:'ilhotas, insulina e glucagon, glicemia'},
        {t:'Gônadas e pineal', d:'hormônios sexuais; melatonina e ciclo circadiano'} ]},
      {n:'Sistema cardiovascular', c:'#e11d48', itens:[
        {t:'Coração — câmaras e valvas', d:'átrios, ventrículos, valvas atrioventriculares e semilunares'},
        {t:'Circulação sistêmica e pulmonar', d:'grande e pequena circulação, trocas gasosas'},
        {t:'Vasos sanguíneos', d:'artérias, veias, capilares; camadas da parede'},
        {t:'Ciclo cardíaco', d:'sístole, diástole, débito cardíaco'},
        {t:'Sistema de condução', d:'nó sinoatrial, nó atrioventricular, feixe de His, Purkinje'},
        {t:'Sangue', d:'plasma, hemácias, leucócitos, plaquetas, hemostasia'} ]},
      {n:'Sistema linfático e imunitário', c:'#0891b2', itens:[
        {t:'Vasos e linfonodos', d:'drenagem da linfa, retorno ao sistema venoso'},
        {t:'Baço, timo e tonsilas', d:'órgãos linfoides primários e secundários'},
        {t:'Imunidade inata e adaptativa', d:'barreiras, fagocitose, linfócitos B e T, anticorpos'} ]},
      {n:'Sistema respiratório', c:'#2563eb', itens:[
        {t:'Vias aéreas superiores', d:'cavidade nasal, faringe, laringe'},
        {t:'Vias aéreas inferiores', d:'traqueia, brônquios, bronquíolos'},
        {t:'Pulmões e pleura', d:'lobos, hilo, pleura visceral e parietal'},
        {t:'Alvéolos e hematose', d:'membrana alveolocapilar, trocas gasosas'},
        {t:'Mecânica ventilatória', d:'diafragma, intercostais, inspiração e expiração, volumes'} ]},
      {n:'Sistema digestório', c:'#84cc16', itens:[
        {t:'Boca e glândulas salivares', d:'dentes, língua, mastigação, amilase salivar'},
        {t:'Faringe e esôfago', d:'deglutição, peristaltismo, esfíncteres'},
        {t:'Estômago', d:'regiões, suco gástrico, pepsina, ácido clorídrico'},
        {t:'Intestino delgado', d:'duodeno, jejuno e íleo; vilosidades e absorção'},
        {t:'Intestino grosso', d:'ceco, cólon, reto; água, eletrólitos, microbiota'},
        {t:'Fígado, vesícula e pâncreas', d:'bile, enzimas pancreáticas, metabolismo hepático'} ]},
      {n:'Sistema urinário', c:'#06b6d4', itens:[
        {t:'Rins', d:'córtex, medula, pelve renal, irrigação'},
        {t:'Néfron', d:'glomérulo, cápsula, túbulos, alça; filtração, reabsorção, secreção'},
        {t:'Vias urinárias', d:'ureteres, bexiga, uretra, micção'},
        {t:'Equilíbrio hidroeletrolítico', d:'volemia, sódio e potássio, equilíbrio ácido-base'} ]},
      {n:'Sistema genital', c:'#db2777', itens:[
        {t:'Sistema genital masculino', d:'testículos, epidídimo, ducto deferente, próstata, pênis'},
        {t:'Sistema genital feminino', d:'ovários, tubas uterinas, útero, vagina'},
        {t:'Ciclo menstrual', d:'fases ovariana e uterina, controle hormonal'},
        {t:'Gametogênese', d:'espermatogênese e ovogênese'} ]},
      {n:'Órgãos dos sentidos', c:'#7c3aed', itens:[
        {t:'Visão', d:'túnicas do olho, retina, cristalino, via óptica'},
        {t:'Audição e equilíbrio', d:'orelha externa, média e interna; cóclea, vestíbulo'},
        {t:'Olfato, gustação e tato', d:'receptores químicos e mecânicos, sensibilidade cutânea'} ]}
    ]},

  social: {
    nome:'SUAS e política social', icone:'🤝', disc:'Serviço Social',
    sub:'A engrenagem da assistência social — proteções, equipamentos, benefícios e instrumentos',
    legenda:'Estrutura do Sistema Único de Assistência Social e do trabalho profissional. Complementa o CátedraLEGIS, que traz a letra da LOAS, do SUAS e dos estatutos.',
    grupos:[
      {n:'Seguridade social', c:'#b45309', itens:[
        {t:'Tripé da seguridade', d:'saúde, previdência e assistência social'},
        {t:'Assistência social como direito', d:'não contributiva, a quem dela necessitar'},
        {t:'Princípios e diretrizes', d:'descentralização, participação, comando único'},
        {t:'Financiamento', d:'fundos nacional, estaduais e municipais; cofinanciamento'} ]},
      {n:'Níveis de proteção', c:'#0d9488', itens:[
        {t:'Proteção social básica', d:'prevenção de riscos, fortalecimento de vínculos'},
        {t:'Proteção especial de média complexidade', d:'direitos violados, vínculos preservados'},
        {t:'Proteção especial de alta complexidade', d:'acolhimento, vínculos rompidos'},
        {t:'Vigilância socioassistencial', d:'territórios, dados, planejamento da oferta'} ]},
      {n:'Equipamentos', c:'#2563eb', itens:[
        {t:'CRAS', d:'porta de entrada, PAIF, referência territorial'},
        {t:'CREAS', d:'PAEFI, violações de direitos, medidas socioeducativas em meio aberto'},
        {t:'Centro POP', d:'população em situação de rua'},
        {t:'Unidades de acolhimento', d:'abrigo, casa-lar, república, família acolhedora'},
        {t:'Centro-Dia', d:'pessoa com deficiência e pessoa idosa em situação de dependência'} ]},
      {n:'Benefícios e transferência de renda', c:'#c2790c', itens:[
        {t:'BPC', d:'pessoa idosa e pessoa com deficiência, critério de renda'},
        {t:'Benefícios eventuais', d:'natalidade, funeral, vulnerabilidade temporária, calamidade'},
        {t:'Programas de transferência de renda', d:'condicionalidades, cadastro, acompanhamento'},
        {t:'Cadastro Único', d:'porta de acesso aos programas sociais'} ]},
      {n:'Trabalho profissional', c:'#7c3aed', itens:[
        {t:'Instrumentos técnico-operativos', d:'entrevista, visita domiciliar, reunião, encaminhamento'},
        {t:'Documentos profissionais', d:'estudo social, relatório, laudo, parecer'},
        {t:'Dimensões do exercício profissional', d:'técnico-operativa, teórico-metodológica, ético-política'},
        {t:'Projeto ético-político', d:'liberdade, autonomia, defesa dos direitos humanos'},
        {t:'Serviço Social nas empresas', d:'saúde do trabalhador, benefícios, responsabilidade social'} ]},
      {n:'Controle social', c:'#0891b2', itens:[
        {t:'Conselhos de assistência social', d:'composição paritária, deliberação, fiscalização'},
        {t:'Conferências', d:'ciclo de avaliação e definição de diretrizes'},
        {t:'Planos e pactuações', d:'plano de assistência social, CIB e CIT'} ]}
    ]},

  juridica: {
    nome:'Processo e peças', icone:'⚖️', disc:'Direito Processual Civil',
    sub:'As fases do processo e as peças de cada momento — o esqueleto que a prova cobra',
    legenda:'Complementa o CátedraLEGIS (letra da lei) e o CátedraJURIS (súmulas e teses): aqui fica a ESTRUTURA do processo e das peças, que é o que organiza a resposta na prova prática.',
    grupos:[
      {n:'Fases do processo civil', c:'#2563eb', itens:[
        {t:'Postulatória', d:'petição inicial, citação, contestação, réplica'},
        {t:'Saneamento e organização', d:'questões processuais, fixação dos pontos controvertidos, provas deferidas'},
        {t:'Instrutória', d:'produção da prova, audiência de instrução'},
        {t:'Decisória', d:'sentença, seus requisitos e efeitos'},
        {t:'Recursal', d:'devolutivo e suspensivo, juízo de admissibilidade'},
        {t:'Cumprimento e execução', d:'título judicial e extrajudicial, defesa do executado'} ]},
      {n:'Peças cíveis', c:'#0d9488', itens:[
        {t:'Petição inicial', d:'endereçamento, fatos, fundamentos, pedido, valor da causa'},
        {t:'Contestação', d:'preliminares, mérito, ônus da impugnação especificada'},
        {t:'Sentença', d:'relatório, fundamentação, dispositivo'},
        {t:'Acórdão e voto', d:'ementa, relatório, voto condutor'} ]},
      {n:'Recursos', c:'#c0392f', itens:[
        {t:'Apelação', d:'efeitos, capítulos impugnados, teoria da causa madura'},
        {t:'Agravo de instrumento', d:'hipóteses de cabimento taxativas'},
        {t:'Embargos de declaração', d:'omissão, contradição, obscuridade, erro material'},
        {t:'Recursos aos tribunais superiores', d:'especial e extraordinário, prequestionamento, repercussão geral'} ]},
      {n:'Tutelas', c:'#c2790c', itens:[
        {t:'Tutela de urgência', d:'probabilidade do direito e perigo de dano'},
        {t:'Tutela de evidência', d:'dispensa do perigo de dano'},
        {t:'Antecipada e cautelar', d:'satisfativa x conservativa; antecedente e incidental'} ]},
      {n:'Processo penal', c:'#6b4fbb', itens:[
        {t:'Investigação preliminar', d:'inquérito policial, cadeia de custódia, indiciamento'},
        {t:'Ação penal', d:'denúncia e queixa, condições da ação, justa causa'},
        {t:'Resposta à acusação', d:'preliminares, absolvição sumária'},
        {t:'Instrução e sentença', d:'audiência una, alegações finais, sentença penal'},
        {t:'Prisões e medidas cautelares', d:'flagrante, preventiva, temporária, cautelares diversas'} ]}
    ]},

  policial: {
    nome:'Prática policial', icone:'🚔', disc:'Direito Processual Penal',
    sub:'Do local de crime ao inquérito — o que a atividade policial exige na prática',
    legenda:'Estrutura do trabalho policial e da investigação. A letra da lei fica no CátedraLEGIS; aqui está a sequência que a prova cobra em questões práticas.',
    grupos:[
      {n:'Cadeia de custódia', c:'#e11d48', itens:[
        {t:'Reconhecimento e isolamento', d:'identificar o elemento e preservar o local'},
        {t:'Fixação e coleta', d:'descrição, fotografia, recolhimento do vestígio'},
        {t:'Acondicionamento e transporte', d:'embalagem, lacre, rastreabilidade'},
        {t:'Recebimento e processamento', d:'central de custódia, perícia'},
        {t:'Armazenamento e descarte', d:'guarda e destinação final'} ]},
      {n:'Investigação criminal', c:'#c0392f', itens:[
        {t:'Notitia criminis', d:'formas de conhecimento do fato'},
        {t:'Inquérito policial', d:'natureza inquisitiva, peças, relatório'},
        {t:'Diligências investigativas', d:'oitivas, reconhecimento, reprodução simulada'},
        {t:'Meios de obtenção de prova', d:'busca e apreensão, interceptação, infiltração, colaboração'},
        {t:'Indiciamento', d:'ato privativo da autoridade policial'} ]},
      {n:'Prisões e abordagem', c:'#b08433', itens:[
        {t:'Prisão em flagrante', d:'espécies, auto de prisão, comunicação'},
        {t:'Audiência de custódia', d:'apresentação, controle da legalidade'},
        {t:'Prisões cautelares', d:'preventiva e temporária, requisitos'},
        {t:'Abordagem e busca pessoal', d:'fundada suspeita, proporcionalidade'} ]},
      {n:'Uso da força', c:'#0891b2', itens:[
        {t:'Princípios do uso da força', d:'legalidade, necessidade, proporcionalidade, moderação'},
        {t:'Níveis de intervenção', d:'presença, verbalização, controle de contato, força não letal, força letal'},
        {t:'Responsabilização', d:'excludentes, excesso, registro da ocorrência'} ]},
      {n:'Criminologia e segurança pública', c:'#7c3aed', itens:[
        {t:'Escolas criminológicas', d:'clássica, positiva, crítica'},
        {t:'Prevenção criminal', d:'primária, secundária, terciária'},
        {t:'Vitimologia', d:'vítima, vitimização primária, secundária e terciária'},
        {t:'Sistema de segurança pública', d:'órgãos, competências, integração'} ]}
    ]},

  fiscal: {
    nome:'Tributos e controle', icone:'📊', disc:'Direito Tributário',
    sub:'Quem cobra o quê, e como o dinheiro público é controlado',
    legenda:'Competências tributárias como estão na Constituição e a estrutura do controle da administração. Alíquotas, prazos e regras específicas mudam — confira sempre na lei vigente pelo CátedraLEGIS.',
    grupos:[
      {n:'Espécies tributárias', c:'#0e7490', itens:[
        {t:'Impostos', d:'não vinculados a contraprestação estatal'},
        {t:'Taxas', d:'poder de polícia e serviço público específico e divisível'},
        {t:'Contribuição de melhoria', d:'valorização imobiliária por obra pública'},
        {t:'Empréstimos compulsórios', d:'calamidade, guerra externa, investimento urgente'},
        {t:'Contribuições especiais', d:'sociais, de intervenção no domínio econômico, de interesse de categorias'} ]},
      {n:'Impostos da União', c:'#2563eb', itens:[
        {t:'Imposto de importação e de exportação', d:'comércio exterior, extrafiscalidade'},
        {t:'Imposto de renda', d:'generalidade, universalidade, progressividade'},
        {t:'IPI', d:'seletividade e não cumulatividade'},
        {t:'IOF', d:'operações financeiras, função regulatória'},
        {t:'ITR e IGF', d:'propriedade rural; grandes fortunas'} ]},
      {n:'Impostos dos Estados e Municípios', c:'#0d9488', itens:[
        {t:'ICMS', d:'circulação de mercadorias e serviços de transporte e comunicação'},
        {t:'ITCMD e IPVA', d:'transmissão causa mortis e doação; propriedade de veículos'},
        {t:'IPTU', d:'propriedade urbana, progressividade'},
        {t:'ITBI e ISS', d:'transmissão onerosa de imóveis; serviços de qualquer natureza'} ]},
      {n:'Limitações ao poder de tributar', c:'#c0392f', itens:[
        {t:'Legalidade e anterioridade', d:'anual e nonagesimal, exceções'},
        {t:'Isonomia e capacidade contributiva', d:'tratamento igual, graduação pela capacidade'},
        {t:'Vedação ao confisco e à limitação ao tráfego', d:'proporcionalidade da carga'},
        {t:'Imunidades', d:'recíproca, templos, partidos, entidades, livros'} ]},
      {n:'Controle da administração', c:'#b08433', itens:[
        {t:'Controle interno e externo', d:'autotutela; tribunais de contas e Legislativo'},
        {t:'Tribunais de contas', d:'julgamento de contas, competências, natureza das decisões'},
        {t:'Orçamento público', d:'plano plurianual, diretrizes orçamentárias, orçamento anual'},
        {t:'Responsabilidade fiscal', d:'limites de despesa, transparência, metas'},
        {t:'Auditoria', d:'planejamento, evidência, achados, relatório'} ]}
    ]},

  administrativa: {
    nome:'Administração pública', icone:'🏛️', disc:'Direito Administrativo',
    sub:'Princípios, atos, contratos e servidores — o dia a dia da máquina pública',
    legenda:'Estrutura da administração pública. A letra da lei (estatuto, licitações, processo administrativo) fica no CátedraLEGIS.',
    grupos:[
      {n:'Princípios', c:'#0891b2', itens:[
        {t:'Legalidade e impessoalidade', d:'só o que a lei autoriza; finalidade pública'},
        {t:'Moralidade e publicidade', d:'probidade; transparência como regra'},
        {t:'Eficiência', d:'resultado, economicidade, qualidade do serviço'},
        {t:'Princípios implícitos', d:'supremacia e indisponibilidade do interesse público, autotutela, proporcionalidade'} ]},
      {n:'Organização administrativa', c:'#2563eb', itens:[
        {t:'Administração direta e indireta', d:'desconcentração e descentralização'},
        {t:'Autarquias e fundações', d:'personalidade, regime, controle finalístico'},
        {t:'Empresas públicas e sociedades de economia mista', d:'regime jurídico, licitação, controle'},
        {t:'Terceiro setor', d:'organizações sociais, OSCIP, parcerias'} ]},
      {n:'Ato administrativo', c:'#7c3aed', itens:[
        {t:'Elementos', d:'competência, finalidade, forma, motivo, objeto'},
        {t:'Atributos', d:'presunção de legitimidade, imperatividade, autoexecutoriedade, tipicidade'},
        {t:'Discricionariedade e vinculação', d:'mérito administrativo e seus limites'},
        {t:'Extinção', d:'anulação, revogação, cassação, convalidação'} ]},
      {n:'Poderes e responsabilidade', c:'#c2790c', itens:[
        {t:'Poderes administrativos', d:'vinculado, discricionário, hierárquico, disciplinar, regulamentar, de polícia'},
        {t:'Responsabilidade civil do Estado', d:'objetiva, nexo causal, excludentes, direito de regresso'},
        {t:'Improbidade administrativa', d:'espécies de ato, elemento subjetivo, sanções'} ]},
      {n:'Licitações e contratos', c:'#0d9488', itens:[
        {t:'Princípios da licitação', d:'isonomia, julgamento objetivo, vinculação ao instrumento convocatório'},
        {t:'Modalidades e critérios de julgamento', d:'quando cabe cada uma; menor preço, técnica e preço'},
        {t:'Contratação direta', d:'dispensa e inexigibilidade'},
        {t:'Contratos administrativos', d:'cláusulas exorbitantes, equilíbrio econômico-financeiro, fiscalização'} ]},
      {n:'Servidores públicos', c:'#b08433', itens:[
        {t:'Formas de provimento', d:'nomeação, promoção, reintegração, reversão, aproveitamento'},
        {t:'Direitos e deveres', d:'remuneração, licenças, vedações'},
        {t:'Regime disciplinar', d:'penalidades, sindicância, processo administrativo disciplinar'},
        {t:'Estabilidade e vacância', d:'estágio probatório, exoneração, demissão, aposentadoria'} ]}
    ]},

  educacao: {
    nome:'Fundamentos da educação', icone:'📚', disc:'Fundamentos da Educação',
    sub:'Estrutura do ensino, currículo, didática e gestão — o que a prova de magistério cobra',
    legenda:'Estrutura da educação básica e do trabalho docente. A letra da LDB e dos estatutos fica no CátedraLEGIS.',
    grupos:[
      {n:'Estrutura da educação', c:'#2563eb', itens:[
        {t:'Níveis e modalidades', d:'educação básica e superior; especial, EJA, profissional, indígena, no campo'},
        {t:'Educação infantil', d:'creche e pré-escola, cuidar e educar'},
        {t:'Ensino fundamental', d:'anos iniciais e finais, alfabetização, progressão'},
        {t:'Ensino médio', d:'formação geral básica e itinerários formativos'},
        {t:'Organização do sistema', d:'competências da União, Estados e Municípios; regime de colaboração'} ]},
      {n:'Currículo e BNCC', c:'#0d9488', itens:[
        {t:'Competências gerais', d:'as dez competências que atravessam toda a educação básica'},
        {t:'Áreas do conhecimento', d:'linguagens, matemática, ciências da natureza, ciências humanas, ensino religioso'},
        {t:'Habilidades e objetos de conhecimento', d:'leitura dos códigos, progressão por ano'},
        {t:'Currículo e projeto pedagógico', d:'base comum e parte diversificada, contextualização'} ]},
      {n:'Didática e aprendizagem', c:'#7c3aed', itens:[
        {t:'Planejamento de ensino', d:'objetivos, conteúdos, metodologia, recursos, avaliação'},
        {t:'Metodologias', d:'aula expositiva dialogada, projetos, resolução de problemas, metodologias ativas'},
        {t:'Teorias da aprendizagem', d:'inatismo, empirismo, construtivismo, sociointeracionismo'},
        {t:'Avaliação da aprendizagem', d:'diagnóstica, formativa e somativa; instrumentos'},
        {t:'Inclusão e adaptação curricular', d:'atendimento educacional especializado, acessibilidade'} ]},
      {n:'Gestão escolar', c:'#c2790c', itens:[
        {t:'Gestão democrática', d:'conselho escolar, participação da comunidade, autonomia'},
        {t:'Projeto político-pedagógico', d:'construção coletiva, diagnóstico, metas'},
        {t:'Financiamento da educação', d:'vinculação de recursos, fundo de manutenção, programas suplementares'},
        {t:'Avaliação em larga escala', d:'indicadores, uso pedagógico dos resultados'} ]}
    ]},

  tecnologia: {
    nome:'Fundamentos de TI', icone:'💻', disc:'Tecnologia da Informação',
    sub:'Redes, dados, algoritmos e segurança — a base que cai em qualquer prova da área',
    legenda:'Fundamentos estáveis da computação. Versões de ferramenta e sintaxe específica mudam; aqui ficam os conceitos que a prova cobra.',
    grupos:[
      {n:'Redes de computadores', c:'#2563eb', itens:[
        {t:'Modelo OSI', d:'física, enlace, rede, transporte, sessão, apresentação, aplicação'},
        {t:'Pilha TCP/IP', d:'correspondência com o OSI, encapsulamento'},
        {t:'Endereçamento IP', d:'IPv4 e IPv6, máscara, sub-redes, endereços privados'},
        {t:'Protocolos de aplicação', d:'HTTP, DNS, SMTP, FTP, SSH'},
        {t:'Equipamentos', d:'switch, roteador, firewall, ponto de acesso'} ]},
      {n:'Estruturas de dados e algoritmos', c:'#7c3aed', itens:[
        {t:'Listas, pilhas e filas', d:'operações e custo'},
        {t:'Árvores e grafos', d:'percursos, árvore binária de busca, busca em largura e profundidade'},
        {t:'Tabelas hash', d:'função de espalhamento, colisões'},
        {t:'Ordenação e busca', d:'algoritmos clássicos e complexidade'},
        {t:'Complexidade', d:'notação assintótica, pior e melhor caso'} ]},
      {n:'Banco de dados', c:'#0d9488', itens:[
        {t:'Modelo relacional', d:'tabela, chave primária e estrangeira, integridade'},
        {t:'SQL', d:'consulta, junções, agregação, subconsultas'},
        {t:'Normalização', d:'formas normais, anomalias, desnormalização'},
        {t:'Transações', d:'atomicidade, consistência, isolamento, durabilidade'},
        {t:'Bancos não relacionais', d:'documento, chave-valor, coluna, grafo'} ]},
      {n:'Segurança da informação', c:'#c0392f', itens:[
        {t:'Pilares', d:'confidencialidade, integridade, disponibilidade'},
        {t:'Criptografia', d:'simétrica, assimétrica, função de resumo, assinatura digital'},
        {t:'Autenticação e autorização', d:'fatores, controle de acesso, privilégio mínimo'},
        {t:'Ameaças e ataques', d:'engenharia social, injeção, negação de serviço, código malicioso'},
        {t:'Proteção de dados pessoais', d:'bases legais, ciclo de vida do dado, incidentes'} ]},
      {n:'Engenharia de software', c:'#c2790c', itens:[
        {t:'Ciclo de vida', d:'requisitos, projeto, implementação, teste, manutenção'},
        {t:'Métodos ágeis', d:'iterações, papéis, artefatos, entrega contínua'},
        {t:'Controle de versão', d:'ramos, mesclagem, resolução de conflito'},
        {t:'Testes', d:'unidade, integração, sistema, aceitação'} ]}
    ]},

  militar: {
    nome:'Exatas para concurso militar', icone:'🎖️', disc:'Matemática',
    sub:'Matemática, física e química — os pilares das provas das escolas militares',
    legenda:'Roteiro de conteúdo das provas militares. Marque o que já domina para enxergar onde o estudo está descoberto.',
    grupos:[
      {n:'Álgebra', c:'#2563eb', itens:[
        {t:'Funções', d:'afim, quadrática, modular, exponencial, logarítmica'},
        {t:'Polinômios e equações', d:'raízes, divisão, relações entre coeficientes'},
        {t:'Progressões', d:'aritmética e geométrica, soma dos termos'},
        {t:'Matrizes, determinantes e sistemas', d:'operações, escalonamento, discussão de sistemas'},
        {t:'Números complexos', d:'forma algébrica e trigonométrica, potenciação'} ]},
      {n:'Geometria e trigonometria', c:'#0d9488', itens:[
        {t:'Geometria plana', d:'triângulos, quadriláteros, círculo, áreas'},
        {t:'Geometria espacial', d:'prismas, pirâmides, cilindro, cone, esfera; volumes'},
        {t:'Geometria analítica', d:'ponto, reta, circunferência, cônicas'},
        {t:'Trigonometria', d:'razões, ciclo, identidades, equações trigonométricas'} ]},
      {n:'Física', c:'#c0392f', itens:[
        {t:'Cinemática', d:'movimento uniforme e variado, lançamentos'},
        {t:'Dinâmica', d:'leis de Newton, atrito, trabalho e energia, impulso'},
        {t:'Termologia', d:'temperatura, calor, gases, termodinâmica'},
        {t:'Óptica e ondas', d:'reflexão, refração, lentes, ondulatória, som'},
        {t:'Eletricidade e magnetismo', d:'carga, campo, potencial, circuitos, indução'} ]},
      {n:'Química', c:'#7c3aed', itens:[
        {t:'Estrutura atômica e tabela periódica', d:'modelos, distribuição eletrônica, propriedades'},
        {t:'Ligações e geometria molecular', d:'iônica, covalente, metálica, polaridade'},
        {t:'Estequiometria', d:'mol, balanceamento, cálculos de reação'},
        {t:'Físico-química', d:'soluções, termoquímica, cinética, equilíbrio, eletroquímica'},
        {t:'Química orgânica', d:'funções, isomeria, reações'} ]},
      {n:'Estatística e análise combinatória', c:'#c2790c', itens:[
        {t:'Contagem', d:'princípio fundamental, arranjos, combinações, permutações'},
        {t:'Probabilidade', d:'eventos, união e interseção, condicional'},
        {t:'Estatística descritiva', d:'médias, mediana, moda, dispersão'} ]}
    ]}
};
