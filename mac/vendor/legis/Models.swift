import Foundation

enum LawCategory: String, Codable, CaseIterable, Identifiable {
    case constitucional = "Constitucional"
    case civil = "Civil e Processo Civil"
    case penal = "Penal e Processo Penal"
    case trabalhista = "Trabalhista"
    case previdenciario = "Previdenciário e Social"
    case tributario = "Tributário"
    case empresarial = "Empresarial e Econômico"
    case administrativo = "Administrativo e Eleitoral"
    case consumidor = "Consumidor"
    case ambiental = "Ambiental"
    case digital = "Digital e Propriedade Intelectual"
    case internacional = "Tratados e Direitos Humanos"
    case especial = "Leis Especiais"
    case personalizada = "Minhas Normas"

    var id: String { rawValue }

    /// Nome curto para chips e barras compactas (o rawValue às vezes é longo).
    var shortName: String {
        switch self {
        case .civil: return "Civil"
        case .penal: return "Penal"
        case .previdenciario: return "Previdenciário"
        case .empresarial: return "Empresarial"
        case .administrativo: return "Administrativo"
        case .digital: return "Digital e P.I."
        case .internacional: return "Internacional"
        case .especial: return "Especiais"
        default: return rawValue
        }
    }

    var symbol: String {
        switch self {
        case .constitucional: return "building.columns"
        case .civil: return "person.2"
        case .penal: return "shield.lefthalf.filled"
        case .trabalhista: return "briefcase"
        case .previdenciario: return "heart.text.square"
        case .tributario: return "percent"
        case .empresarial: return "dollarsign.circle"
        case .administrativo: return "building.2"
        case .consumidor: return "cart"
        case .ambiental: return "leaf"
        case .digital: return "network"
        case .internacional: return "globe.americas"
        case .especial: return "sparkles"
        case .personalizada: return "person.crop.circle.badge.plus"
        }
    }
}

struct LawEntry: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var title: String
    var reference: String
    var category: LawCategory
    var sourceURL: String?
    var isBuiltIn: Bool = false
    var monitored: Bool = true
    var lastFetched: Date?
    var lastChanged: Date?
    var contentHash: String?
    var hasUnreadUpdate: Bool = false
    var isDownloaded: Bool = false
    // Campos posteriores: opcionais para manter compatibilidade com bibliotecas antigas.
    var docKind: String?        // "novidades" = índices de legislação nova; nil = norma comum
                                // ("juris" existiu até a v10 e é purgado na carga)
    var generalNote: String?    // nota livre da usuária sobre a norma
    var validationTerm: String? // termo que precisa existir no texto baixado (anti página-errada)
    var checkFailures: Int?     // falhas consecutivas de verificação (avisa a usuária na 3ª)
    var customCategory: String? // matéria criada pela usuária (sobrepõe `category` na organização)
    var stripPattern: String?   // regex removida do conteúdo bruto antes da extração (ex.: bloco
                                // <Metadados> da API do Senado, que carrega timestamp por consulta)
    var favorite: Bool?         // marcada como favorita pela usuária (Optional = tolerante a
                                // bibliotecas antigas: chave ausente decodifica como nil)

    var isNovidades: Bool { docKind == "novidades" }
    /// Norma "comum" (aparece em Todas as normas e nas matérias).
    var isRegularLaw: Bool { docKind == nil }
}

// Decodificação TOLERANTE (na extensão, para preservar o init de membro usado no
// SeedCatalog/Store): campos com default via decodeIfPresent, para que UMA chave
// ausente numa entrada (biblioteca antiga ou editada à mão) não derrube o array
// inteiro de leis — e, com ele, TODA a biblioteca. Mesma invariante de
// StudyRecord/LawPrecedent (ver comentário do library.json).
extension LawEntry {
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(UUID.self, forKey: .id) ?? UUID()
        title = try c.decode(String.self, forKey: .title)
        reference = try c.decode(String.self, forKey: .reference)
        category = try c.decodeIfPresent(LawCategory.self, forKey: .category) ?? .especial
        sourceURL = try c.decodeIfPresent(String.self, forKey: .sourceURL)
        isBuiltIn = try c.decodeIfPresent(Bool.self, forKey: .isBuiltIn) ?? false
        monitored = try c.decodeIfPresent(Bool.self, forKey: .monitored) ?? true
        lastFetched = try c.decodeIfPresent(Date.self, forKey: .lastFetched)
        lastChanged = try c.decodeIfPresent(Date.self, forKey: .lastChanged)
        contentHash = try c.decodeIfPresent(String.self, forKey: .contentHash)
        hasUnreadUpdate = try c.decodeIfPresent(Bool.self, forKey: .hasUnreadUpdate) ?? false
        isDownloaded = try c.decodeIfPresent(Bool.self, forKey: .isDownloaded) ?? false
        docKind = try c.decodeIfPresent(String.self, forKey: .docKind)
        generalNote = try c.decodeIfPresent(String.self, forKey: .generalNote)
        validationTerm = try c.decodeIfPresent(String.self, forKey: .validationTerm)
        checkFailures = try c.decodeIfPresent(Int.self, forKey: .checkFailures)
        customCategory = try c.decodeIfPresent(String.self, forKey: .customCategory)
        stripPattern = try c.decodeIfPresent(String.self, forKey: .stripPattern)
        favorite = try c.decodeIfPresent(Bool.self, forKey: .favorite)
    }
}

/// Progresso de estudo de uma norma: artigos lidos, marcados para revisão e
/// anotações por unidade. As chaves são os rótulos estáveis dos artigos
/// ("Art. 5º", "Art. 1.045"…) gerados pelo LawParser.
struct StudyRecord: Codable, Hashable {
    var readKeys: Set<String> = []
    var reviewKeys: Set<String> = []
    var notes: [String: String] = [:]
    var richNotes: [String: Data] = [:]    // chave da unidade → RTF (anotação rica); notes guarda o texto puro
    var mastery: [String: String] = [:]    // chave da unidade → "dominado" | "duvida" | "dificil"
    var unitTotal: Int = 0 // total de unidades na última leitura (p/ barra de progresso)
    var lastUnitID: Int = 0 // último artigo aberto no modo Foco (retoma de onde parou)

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        readKeys = try c.decodeIfPresent(Set<String>.self, forKey: .readKeys) ?? []
        reviewKeys = try c.decodeIfPresent(Set<String>.self, forKey: .reviewKeys) ?? []
        notes = try c.decodeIfPresent([String: String].self, forKey: .notes) ?? [:]
        richNotes = try c.decodeIfPresent([String: Data].self, forKey: .richNotes) ?? [:]
        mastery = try c.decodeIfPresent([String: String].self, forKey: .mastery) ?? [:]
        unitTotal = try c.decodeIfPresent(Int.self, forKey: .unitTotal) ?? 0
        lastUnitID = try c.decodeIfPresent(Int.self, forKey: .lastUnitID) ?? 0
    }
}

/// Um item de checklist de leitura definido livremente pela usuária — NÃO
/// vinculado a um artigo específico (ex.: "reler prisão preventiva", "revisar
/// CDC até sexta"). Complementa o "marcar como lido" por artigo, que já existe.
struct ReadingChecklistItem: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var text: String
    var done: Bool = false
    var createdAt: Date = Date()
    var doneAt: Date?
    var dueDate: Date?         // meta de prazo, opcional
    var linkedLawID: UUID?     // vínculo a uma norma específica, opcional
    var linkedCategoryLabel: String?  // vínculo a uma matéria inteira (sem norma específica), opcional

    init(text: String, dueDate: Date? = nil, linkedLawID: UUID? = nil, linkedCategoryLabel: String? = nil) {
        self.text = text
        self.dueDate = dueDate
        self.linkedLawID = linkedLawID
        self.linkedCategoryLabel = linkedCategoryLabel
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(UUID.self, forKey: .id) ?? UUID()
        text = try c.decodeIfPresent(String.self, forKey: .text) ?? ""
        done = try c.decodeIfPresent(Bool.self, forKey: .done) ?? false
        createdAt = try c.decodeIfPresent(Date.self, forKey: .createdAt) ?? Date()
        doneAt = try c.decodeIfPresent(Date.self, forKey: .doneAt)
        dueDate = try c.decodeIfPresent(Date.self, forKey: .dueDate)
        linkedLawID = try c.decodeIfPresent(UUID.self, forKey: .linkedLawID)
        linkedCategoryLabel = try c.decodeIfPresent(String.self, forKey: .linkedCategoryLabel)
    }
}

/// Formato do arquivo library.json — compartilhado entre o app e o modo --sync.
/// Decodificação tolerante a CHAVES AUSENTES (arquivos de versões antigas), mas
/// estrita quanto a valores corrompidos — corrupção deve lançar erro para que o
/// chamador preserve o arquivo em vez de sobrescrevê-lo.
struct LibraryFile: Codable {
    var laws: [LawEntry]
    var updates: [UpdateEvent]
    var lastCheckDate: Date?
    var annotations: [TextAnnotation]?
    var customCategories: [String]?
    var study: [String: StudyRecord]?   // chave: uuidString da norma
    var activity: [String: Int]?        // "aaaa-mm-dd" → atividade de estudo no dia (lidos + revisados)
    var readsByDay: [String: Int]?      // "aaaa-mm-dd" → artigos marcados como lidos no dia (meta de leitura)
    var precedents: [LawPrecedent]?     // jurisprudência que a usuária vincula a uma norma
    var srs: [String: SRSCard]?         // revisão espaçada; chave "uuidDaNorma|chaveDoArtigo"
    var douTerms: [String]?             // termos vigiados no Diário Oficial (alertas DOU)
    var douLastCheck: Date?             // última varredura do DOU (o cache fica em dou.json)
    var studySecondsByLaw: [String: Double]?  // uuidString da norma → segundos estudados nela
    var readingChecklist: [ReadingChecklistItem]?  // metas de leitura livres da usuária
    var coresFavoritas: [String]?                  // paleta de cores de grifo favoritas
    var alinhamentos: [String: String]?             // "lawID|unitKey" -> alinhamento do texto

    init(laws: [LawEntry], updates: [UpdateEvent],
         lastCheckDate: Date?, annotations: [TextAnnotation]?, customCategories: [String]?,
         study: [String: StudyRecord]? = nil, activity: [String: Int]? = nil,
         readsByDay: [String: Int]? = nil,
         precedents: [LawPrecedent]? = nil, srs: [String: SRSCard]? = nil,
         douTerms: [String]? = nil, douLastCheck: Date? = nil,
         studySecondsByLaw: [String: Double]? = nil,
         readingChecklist: [ReadingChecklistItem]? = nil,
         coresFavoritas: [String]? = nil,
         alinhamentos: [String: String]? = nil) {
        self.laws = laws
        self.updates = updates
        self.lastCheckDate = lastCheckDate
        self.annotations = annotations
        self.customCategories = customCategories
        self.study = study
        self.activity = activity
        self.readsByDay = readsByDay
        self.precedents = precedents
        self.srs = srs
        self.douTerms = douTerms
        self.douLastCheck = douLastCheck
        self.studySecondsByLaw = studySecondsByLaw
        self.readingChecklist = readingChecklist
        self.coresFavoritas = coresFavoritas
        self.alinhamentos = alinhamentos
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        laws = try container.decodeIfPresent([LawEntry].self, forKey: .laws) ?? []
        updates = try container.decodeIfPresent([UpdateEvent].self, forKey: .updates) ?? []
        lastCheckDate = try container.decodeIfPresent(Date.self, forKey: .lastCheckDate)
        annotations = try container.decodeIfPresent([TextAnnotation].self, forKey: .annotations)
        customCategories = try container.decodeIfPresent([String].self, forKey: .customCategories)
        study = try container.decodeIfPresent([String: StudyRecord].self, forKey: .study)
        activity = try container.decodeIfPresent([String: Int].self, forKey: .activity)
        readsByDay = try container.decodeIfPresent([String: Int].self, forKey: .readsByDay)
        precedents = try container.decodeIfPresent([LawPrecedent].self, forKey: .precedents)
        srs = try container.decodeIfPresent([String: SRSCard].self, forKey: .srs)
        douTerms = try container.decodeIfPresent([String].self, forKey: .douTerms)
        douLastCheck = try container.decodeIfPresent(Date.self, forKey: .douLastCheck)
        studySecondsByLaw = try container.decodeIfPresent([String: Double].self, forKey: .studySecondsByLaw)
        readingChecklist = try container.decodeIfPresent([ReadingChecklistItem].self, forKey: .readingChecklist)
        coresFavoritas = try container.decodeIfPresent([String].self, forKey: .coresFavoritas)
        alinhamentos = try container.decodeIfPresent([String: String].self, forKey: .alinhamentos)
    }

    /// Remove da biblioteca as antigas fontes de jurisprudência (docKind "juris",
    /// removidas do app na v10) e tudo o que dependia delas — estudo, anotações,
    /// histórico e precedentes. Devolve os ids purgados para o chamador apagar os
    /// textos em disco.
    mutating func purgeJurisEntries() -> [UUID] {
        let ids = laws.filter { $0.docKind == "juris" }.map(\.id)
        guard !ids.isEmpty else { return [] }
        let idSet = Set(ids)
        let keySet = Set(ids.map(\.uuidString))
        laws.removeAll { idSet.contains($0.id) }
        updates.removeAll { idSet.contains($0.lawID) }
        annotations?.removeAll { idSet.contains($0.lawID) }
        study = study?.filter { !keySet.contains($0.key) }
        precedents?.removeAll { idSet.contains($0.lawID) }
        srs = srs?.filter { key, _ in !keySet.contains(String(key.prefix(36))) }
        return ids
    }
}

/// Uma jurisprudência que a usuária vincula a uma norma específica: súmula, tese,
/// acórdão, informativo ou decisão que ela quer manter à mão junto do texto da lei.
/// Diferente das fontes automáticas removidas na v10 — este conteúdo é 100% da
/// usuária (nada é baixado nem monitorado).
struct LawPrecedent: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var lawID: UUID
    var court: String          // tribunal, livre (STF, STJ, TJSP, TRF-1…)
    var kind: String           // Súmula, Tese, Acórdão, Informativo, Decisão…
    var identifier: String     // "Súmula 231", "REsp 1.657.156", "Tema 69"
    var articleRef: String     // artigo relacionado, livre ("Art. 5º, XII")
    var date: String           // data do julgamento/publicação, livre
    var summary: String        // ementa / enunciado / tese (texto principal)
    var notes: String          // anotações livres da usuária
    var url: String            // link para a íntegra (opcional)
    var tags: [String] = []
    var createdAt: Date = Date()

    init(lawID: UUID, court: String = "", kind: String = "Súmula", identifier: String = "",
         articleRef: String = "", date: String = "", summary: String = "", notes: String = "",
         url: String = "", tags: [String] = []) {
        self.lawID = lawID
        self.court = court
        self.kind = kind
        self.identifier = identifier
        self.articleRef = articleRef
        self.date = date
        self.summary = summary
        self.notes = notes
        self.url = url
        self.tags = tags
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(UUID.self, forKey: .id) ?? UUID()
        // Tolerante como os demais campos: um precedente sem lawID (JSON editado à
        // mão, corrupção parcial) NÃO pode derrubar a decodificação da biblioteca
        // inteira. Sem lawID vira órfão (UUID inexistente) e a poda na carga o
        // descarta em silêncio — em vez de custar leis, anotações e progresso.
        lawID = try c.decodeIfPresent(UUID.self, forKey: .lawID) ?? UUID()
        court = try c.decodeIfPresent(String.self, forKey: .court) ?? ""
        kind = try c.decodeIfPresent(String.self, forKey: .kind) ?? "Súmula"
        identifier = try c.decodeIfPresent(String.self, forKey: .identifier) ?? ""
        articleRef = try c.decodeIfPresent(String.self, forKey: .articleRef) ?? ""
        date = try c.decodeIfPresent(String.self, forKey: .date) ?? ""
        summary = try c.decodeIfPresent(String.self, forKey: .summary) ?? ""
        notes = try c.decodeIfPresent(String.self, forKey: .notes) ?? ""
        url = try c.decodeIfPresent(String.self, forKey: .url) ?? ""
        tags = try c.decodeIfPresent([String].self, forKey: .tags) ?? []
        createdAt = try c.decodeIfPresent(Date.self, forKey: .createdAt) ?? Date()
    }

    /// Rótulo curto para a lista ("STF · Súmula 231").
    var displayTitle: String {
        let left = [court, identifier].filter { !$0.isEmpty }.joined(separator: " · ")
        return left.isEmpty ? kind : left
    }
}

struct UpdateEvent: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var lawID: UUID
    var lawTitle: String
    var date: Date
    var addedParagraphs: [String]
    var removedParagraphs: [String]
}

// Decodificação tolerante (na extensão p/ preservar o init de membro): uma chave
// ausente num evento não pode derrubar o array de updates e, com ele, a biblioteca.
extension UpdateEvent {
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(UUID.self, forKey: .id) ?? UUID()
        lawID = try c.decodeIfPresent(UUID.self, forKey: .lawID) ?? UUID()
        lawTitle = try c.decodeIfPresent(String.self, forKey: .lawTitle) ?? ""
        date = try c.decodeIfPresent(Date.self, forKey: .date) ?? Date()
        addedParagraphs = try c.decodeIfPresent([String].self, forKey: .addedParagraphs) ?? []
        removedParagraphs = try c.decodeIfPresent([String].self, forKey: .removedParagraphs) ?? []
    }
}
