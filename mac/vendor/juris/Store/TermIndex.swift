import Foundation

/// Vocabulário curado de TERMOS/institutos jurídicos para o índice remissivo.
/// (o índice também incorpora termos curtos extraídos dos próprios verbetes)
enum TermIndex {
    static let termos: [String] = [
        // Constitucional / controle
        "Ação Direta de Inconstitucionalidade", "ADPF", "ADC", "Controle de Constitucionalidade",
        "Repercussão Geral", "Reclamação", "Súmula Vinculante", "Cláusula de Reserva de Plenário",
        "Modulação de Efeitos", "Amicus Curiae", "Mandado de Injunção", "Direitos Fundamentais",
        "Liberdade de Expressão", "Direito Adquirido", "Igualdade", "Nacionalidade", "Direitos Políticos",
        "Foro por Prerrogativa de Função", "Imunidade Parlamentar", "Intervenção Federal",
        // Administrativo
        "Improbidade Administrativa", "Servidor Público", "Concurso Público", "Aposentadoria",
        "Licitação", "Contrato Administrativo", "Desapropriação", "Poder de Polícia", "Ato Administrativo",
        "Responsabilidade Civil do Estado", "Processo Administrativo Disciplinar", "Teto Remuneratório",
        "Precatório", "Requisição de Pequeno Valor", "Concessão", "Agência Reguladora", "Tombamento",
        // Tributário
        "ICMS", "ISS", "IPI", "IPTU", "IPVA", "ITBI", "ITCMD", "IRPJ", "IRPF", "PIS", "COFINS",
        "Contribuição Previdenciária", "Contribuição Social", "Imunidade Tributária", "Isenção",
        "Execução Fiscal", "Dívida Ativa", "Prescrição Tributária", "Decadência Tributária",
        "Substituição Tributária", "Simples Nacional", "Repetição de Indébito", "Compensação Tributária",
        "Anterioridade", "Certidão Negativa",
        // Civil
        "Usucapião", "Posse", "Propriedade", "Condomínio", "Servidão", "Usufruto", "Bem de Família",
        "Prescrição", "Decadência", "Responsabilidade Civil", "Dano Moral", "Dano Material",
        "Contrato", "Compra e Venda", "Locação", "Doação", "Fiança", "Seguro", "Alienação Fiduciária",
        "Sucessão", "Herança", "Testamento", "Inventário", "Alimentos", "União Estável", "Casamento",
        "Divórcio", "Guarda", "Investigação de Paternidade", "Poder Familiar", "Nome Civil",
        "Direito de Preferência", "Hipoteca", "Penhor",
        // Consumidor
        "Direito do Consumidor", "Plano de Saúde", "Órgãos de Defesa do Consumidor", "Publicidade",
        "Vício do Produto", "Fato do Produto", "Cadastro de Inadimplentes", "Superendividamento",
        // Empresarial
        "Falência", "Recuperação Judicial", "Sociedade", "Desconsideração da Personalidade Jurídica",
        "Título de Crédito", "Cédula de Crédito Bancário", "Marca", "Patente", "Duplicata", "Cheque",
        // Penal
        "Prescrição Penal", "Dosimetria da Pena", "Regime de Cumprimento de Pena", "Progressão de Regime",
        "Livramento Condicional", "Falta Grave", "Execução Penal", "Remição da Pena", "Crime Continuado",
        "Concurso de Crimes", "Legítima Defesa", "Estado de Necessidade", "Furto", "Roubo", "Estelionato",
        "Tráfico de Drogas", "Homicídio", "Latrocínio", "Peculato", "Corrupção", "Lavagem de Dinheiro",
        "Organização Criminosa", "Porte de Arma", "Estatuto do Desarmamento", "Lei Maria da Penha",
        "Violência Doméstica", "Estatuto da Criança e do Adolescente", "Ato Infracional",
        "Crimes contra a Administração Pública", "Sursis", "Suspensão Condicional do Processo",
        // Processual Penal
        "Prisão Preventiva", "Prisão em Flagrante", "Prisão Temporária", "Habeas Corpus", "Interceptação Telefônica",
        "Busca e Apreensão", "Nulidade", "Competência", "Tribunal do Júri", "Colaboração Premiada",
        "Cadeia de Custódia", "Ação Penal", "Denúncia", "Foro Competente", "Audiência de Custódia",
        // Processo Civil
        "Coisa Julgada", "Litisconsórcio", "Recurso Especial", "Recurso Extraordinário", "Agravo de Instrumento",
        "Agravo Interno", "Embargos de Declaração", "Embargos de Divergência", "Apelação", "Cumprimento de Sentença",
        "Execução", "Penhora", "Impenhorabilidade", "Tutela Provisória", "Antecipação de Tutela",
        "Honorários Advocatícios", "Gratuidade da Justiça", "Prescrição Intercorrente", "Ação Rescisória",
        "Mandado de Segurança", "Ação Civil Pública", "Ação Popular", "Incidente de Resolução de Demandas Repetitivas",
        "Astreintes", "Exceção de Pré-Executividade", "Assistência Judiciária", "Custas Processuais",
        // Previdenciário / Trabalhista
        "Benefício Previdenciário", "Pensão por Morte", "Auxílio-Doença", "Aposentadoria Especial",
        "Salário-Maternidade", "Contribuição ao INSS", "Justiça do Trabalho", "Competência da Justiça do Trabalho",
        "FGTS", "Dano Moral Trabalhista",
        // Eleitoral
        "Inelegibilidade", "Registro de Candidatura", "Prestação de Contas", "Propaganda Eleitoral",
        "Abuso de Poder", "Ficha Limpa", "Filiação Partidária", "Fundo Partidário",
        // Ambiental / outros
        "Direito Ambiental", "Área de Preservação Permanente", "Dano Ambiental", "Registro Público",
        "Notarial", "Direitos Difusos e Coletivos",
    ]
}
