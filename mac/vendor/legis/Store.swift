import Foundation
import SwiftUI
import AppKit
import Network

@MainActor
final class AppStore: ObservableObject {
    static let shared = AppStore()

    @Published var laws: [LawEntry] = []
    @Published var updates: [UpdateEvent] = []
    @Published var annotations: [TextAnnotation] = []
    @Published var precedents: [LawPrecedent] = []      // jurisprudência por norma (da usuária)
    @Published var srs: [String: SRSCard] = [:]         // revisão espaçada, chave "uuid|chaveArtigo"
    @Published var customCategories: [String] = []
    @Published var study: [String: StudyRecord] = [:]   // chave: uuidString da norma
    @Published var activity: [String: Int] = [:]        // "aaaa-mm-dd" → atividade de estudo (lidos + revisados)
    @Published var readsByDay: [String: Int] = [:]      // "aaaa-mm-dd" → artigos marcados como lidos no dia
    @Published var studySecondsByLaw: [String: Double] = [:]  // uuidString da norma → segundos estudados nela
    @Published var readingChecklist: [ReadingChecklistItem] = []  // metas de leitura livres da usuária
    @Published var editalDisciplinas: [String] = []  // espelho AO VIVO das matérias do edital do Cátedra (não persistido; vem do host a cada abertura da aba)
    @Published var coresFavoritas: [String] = MarkColorLegis.padrao  // paleta de cores de grifo favoritas
    @Published var alinhamentos: [String: String] = [:]  // "lawID|unitKey" -> left|center|right|justify (espelha o JURIS)
    // Respostas das perguntas-guia da LEITURA ATIVA. Chave "lawID|unitKey|qIndex" -> resposta.
    @Published var leituraRespostas: [String: String] = [:]
    // Conteúdo gerado por IA da leitura ativa (recall + pegadinhas), JSON por "lawID|unitKey".
    @Published var leituraIA: [String: String] = [:]

    func leituraIAJSON(lawID: UUID, unitKey: String) -> String? { leituraIA["\(lawID.uuidString)|\(unitKey)"] }
    func setLeituraIA(_ json: String, lawID: UUID, unitKey: String) {
        leituraIA["\(lawID.uuidString)|\(unitKey)"] = json
        save()
    }

    func leituraResposta(lawID: UUID, unitKey: String, q: Int) -> String {
        leituraRespostas["\(lawID.uuidString)|\(unitKey)|\(q)"] ?? ""
    }
    func setLeituraResposta(_ v: String, lawID: UUID, unitKey: String, q: Int) {
        let key = "\(lawID.uuidString)|\(unitKey)|\(q)"
        let t = v.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty { leituraRespostas.removeValue(forKey: key) } else { leituraRespostas[key] = v }
        scheduleSave()
    }

    func alinhamento(lawID: UUID, unitKey: String) -> String { alinhamentos["\(lawID.uuidString)|\(unitKey)"] ?? "natural" }
    func setAlinhamento(_ v: String, lawID: UUID, unitKey: String) {
        let key = "\(lawID.uuidString)|\(unitKey)"
        if v == "natural" { alinhamentos.removeValue(forKey: key) } else { alinhamentos[key] = v }
        save()
    }
    func alinhamentoNS(lawID: UUID, unitKey: String) -> NSTextAlignment {
        switch alinhamento(lawID: lawID, unitKey: unitKey) {
        case "center": return .center
        case "right": return .right
        case "justify": return .justified
        case "left": return .left
        default: return .natural
        }
    }

    // Desfazer/refazer das marcações (só em memória; espelha o CátedraJURIS).
    private var annUndoStack: [[TextAnnotation]] = []
    private var annRedoStack: [[TextAnnotation]] = []
    var canUndoAnnotations: Bool { !annUndoStack.isEmpty }
    var canRedoAnnotations: Bool { !annRedoStack.isEmpty }
    private func snapshotAnnotations() {
        annUndoStack.append(annotations)
        if annUndoStack.count > 60 { annUndoStack.removeFirst() }
        annRedoStack.removeAll()
    }
    func undoAnnotations() {
        guard let prev = annUndoStack.popLast() else { return }
        annRedoStack.append(annotations); annotations = prev; save()
    }
    func redoAnnotations() {
        guard let next = annRedoStack.popLast() else { return }
        annUndoStack.append(annotations); annotations = next; save()
    }

    // Cores favoritas de grifo (add/remove) — espelha adicionar/removerCorFavorita do JURIS.
    func adicionarCorFavorita(_ hex: String) {
        guard !coresFavoritas.contains(hex) else { return }
        coresFavoritas.append(hex); save()
    }
    func removerCorFavorita(_ hex: String) {
        coresFavoritas.removeAll { $0 == hex }; save()
    }

    // Domínio por artigo ("dominado"|"duvida"|"dificil") — o campo StudyRecord.mastery já
    // existia mas não tinha UI; agora dá pra marcar (espelha "dominados" do JURIS).
    func mastery(lawID: UUID, unitKey: String) -> String? {
        study[lawID.uuidString]?.mastery[unitKey]
    }
    func setMastery(_ value: String?, lawID: UUID, unitKey: String) {
        var rec = study[lawID.uuidString] ?? StudyRecord()
        if let value { rec.mastery[unitKey] = value } else { rec.mastery.removeValue(forKey: unitKey) }
        study[lawID.uuidString] = rec
        save()
    }

    var checklistPendingCount: Int { readingChecklist.filter { !$0.done }.count }

    /// Chamado pelo host (main.swift) ao abrir a aba do CátedraLEGIS, lendo o edital do Cátedra via JS.
    func setEditalDisciplinas(_ names: [String]) {
        editalDisciplinas = names
    }

    /// Adiciona uma meta de leitura livre. Pode ser vinculada a uma norma específica
    /// (linkedLawID) ou a uma matéria inteira (linkedCategoryLabel) — os dois são opcionais.
    func addChecklistItem(_ text: String, dueDate: Date? = nil, linkedLawID: UUID? = nil, linkedCategoryLabel: String? = nil) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        readingChecklist.insert(ReadingChecklistItem(text: trimmed, dueDate: dueDate,
                                                       linkedLawID: linkedLawID, linkedCategoryLabel: linkedCategoryLabel), at: 0)
        save()
    }
    func toggleChecklistItem(_ id: UUID) {
        guard let i = readingChecklist.firstIndex(where: { $0.id == id }) else { return }
        readingChecklist[i].done.toggle()
        readingChecklist[i].doneAt = readingChecklist[i].done ? Date() : nil
        save()
        if readingChecklist[i].done {
            let item = readingChecklist[i]
            NotificationCenter.default.post(name: ChecklistSyncBridge.itemDone, object: nil, userInfo: [
                "origem": "CátedraLEGIS", "categoria": item.linkedCategoryLabel as Any, "texto": item.text,
            ])
        }
    }
    func removeChecklistItem(_ id: UUID) {
        readingChecklist.removeAll { $0.id == id }
        save()
    }
    /// Reagenda (ou remove) o prazo de uma meta — o "adiar em 1 clique" do checklist.
    func setChecklistDue(_ id: UUID, _ date: Date?) {
        guard let i = readingChecklist.firstIndex(where: { $0.id == id }) else { return }
        readingChecklist[i].dueDate = date
        save()
    }
    func clearCompletedChecklistItems() {
        readingChecklist.removeAll { $0.done }
        save()
    }

    /// Acumula tempo de estudo numa norma (chamado pelo cronômetro a cada segmento).
    func addStudyTime(_ lawID: UUID, _ seconds: TimeInterval) {
        guard seconds > 0 else { return }
        studySecondsByLaw[lawID.uuidString, default: 0] += seconds
        scheduleSave()
    }
    func studySeconds(for lawID: UUID) -> TimeInterval { studySecondsByLaw[lawID.uuidString] ?? 0 }
    var totalStudySeconds: TimeInterval { studySecondsByLaw.values.reduce(0, +) }
    @Published var isChecking = false
    @Published var checkProgress = ""
    @Published var lastCheckDate: Date?
    @Published var downloadingIDs: Set<UUID> = []
    @Published var lastError: String?
    @Published var isOnline = true              // conectividade (NWPathMonitor); começa otimista
    @Published var sigen: [UUID: SigenNorma] = [:]   // enriquecimento do Senado, em memória (cache em disco)
    private var sigenFetching: Set<UUID> = []
    @Published var douTerms: [String] = []           // termos vigiados no Diário Oficial
    @Published var douItems: [DOUItem] = []           // publicações do DOU já vistas (cache em dou.json)
    @Published var douLastCheck: Date?
    @Published var douChecking = false

    @AppStorage("updateIntervalHours") var updateIntervalHours: Int = 24

    private let baseDir: URL
    private let textsDir: URL
    private var backupsDir: URL { baseDir.appendingPathComponent("backups", isDirectory: true) }
    private var sigenDir: URL { baseDir.appendingPathComponent("sigen", isDirectory: true) }
    private var douFile: URL { baseDir.appendingPathComponent("dou.json") }
    private var libraryFile: URL { baseDir.appendingPathComponent("library.json") }
    private var saveTask: Task<Void, Never>?
    private let pathMonitor = NWPathMonitor()
    private let pathQueue = DispatchQueue(label: "com.vademecum.network")

    init() {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        baseDir = appSupport.appendingPathComponent("VadeMecum", isDirectory: true)
        textsDir = baseDir.appendingPathComponent("textos", isDirectory: true)
        try? FileManager.default.createDirectory(at: textsDir, withIntermediateDirectories: true)
        load()
        seedIfNeeded()
        loadSigenCache()       // enriquecimento do Senado já baixado (offline)
        loadDOUCache()         // publicações do DOU já vistas (offline)
        autoBackupIfNeeded()   // cópia de segurança do library.json (no máx. 1/dia)
        // Grava alterações pendentes (save adiado) e faz backup ao encerrar o app.
        NotificationCenter.default.addObserver(forName: NSApplication.willTerminateNotification,
                                               object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.saveNow(); self?.autoBackupIfNeeded() }
        }
        // Monitor de conectividade: quando a conexão VOLTA, retoma as verificações
        // pendentes (sincronização posterior). O callback chega em outra thread; não
        // capturamos `self` (não-Sendable) — saltamos para a MainActor e usamos o
        // singleton, que é o mesmo objeto.
        pathMonitor.pathUpdateHandler = { path in
            let online = path.status == .satisfied
            Task { @MainActor in
                let store = AppStore.shared
                let wasOffline = !store.isOnline
                store.isOnline = online
                if online && wasOffline { await store.resumeAfterReconnect() }
            }
        }
        pathMonitor.start(queue: pathQueue)
        // O laço de verificação vive junto do app (não da janela): continua ativo
        // mesmo com a janela fechada, enquanto o app estiver aberto.
        Task { await self.autoCheckLoop() }
        // Limpa cartões de revisão órfãos (artigo sumido em atualização anterior) em
        // segundo plano — não bloqueia a abertura e só parseia normas com cartões.
        Task { await self.reconcileAllSRS() }
    }

    // MARK: - Persistência

    private func load() {
        guard FileManager.default.fileExists(atPath: libraryFile.path) else { return }
        do {
            let data = try Data(contentsOf: libraryFile)
            var persisted = try JSONDecoder().decode(LibraryFile.self, from: data)
            // v10: o app passou a ser só de legislação. Fontes de jurisprudência de
            // versões antigas são purgadas na primeira carga — o arquivo original
            // fica preservado ao lado, caso a usuária mude de ideia um dia.
            let purgedIDs = persisted.purgeJurisEntries()
            if !purgedIDs.isEmpty {
                let backup = baseDir.appendingPathComponent("library.pre-v10-jurisprudencia.bak.json")
                if !FileManager.default.fileExists(atPath: backup.path) {
                    do { try data.write(to: backup) } catch {
                        // A purga é desejada mesmo assim, mas a falha não é silenciosa.
                        lastError = "As fontes de jurisprudência foram removidas, mas o backup da biblioteca antiga não pôde ser criado (\(error.localizedDescription))."
                    }
                }
            }
            laws = persisted.laws
            updates = persisted.updates
            annotations = persisted.annotations ?? []
            coresFavoritas = persisted.coresFavoritas ?? MarkColorLegis.padrao
            alinhamentos = persisted.alinhamentos ?? [:]
            leituraRespostas = persisted.leituraRespostas ?? [:]
            leituraIA = persisted.leituraIA ?? [:]
            precedents = persisted.precedents ?? []
            srs = persisted.srs ?? [:]
            customCategories = persisted.customCategories ?? []
            study = persisted.study ?? [:]
            activity = persisted.activity ?? [:]
            readsByDay = persisted.readsByDay ?? [:]
            studySecondsByLaw = persisted.studySecondsByLaw ?? [:]
            readingChecklist = persisted.readingChecklist ?? []
            douTerms = persisted.douTerms ?? []
            douLastCheck = persisted.douLastCheck
            lastCheckDate = persisted.lastCheckDate
            // Poda registros de estudo, anotações, precedentes e cartões de revisão
            // órfãos (normas já excluídas em versões antigas) — nunca renderizam e
            // só inflam o JSON.
            let liveUUIDs = Set(laws.map(\.id))
            let liveIDs = Set(laws.map { $0.id.uuidString })
            study = study.filter { liveIDs.contains($0.key) }
            annotations.removeAll { !liveUUIDs.contains($0.lawID) }
            precedents.removeAll { !liveUUIDs.contains($0.lawID) }
            srs = srs.filter { liveIDs.contains(String($0.key.prefix(36))) }
            // Só depois do backup: apaga os textos das fontes purgadas e persiste.
            for id in purgedIDs {
                try? FileManager.default.removeItem(at: textURL(for: id))
                try? FileManager.default.removeItem(at: previousTextURL(for: id))
            }
            if !purgedIDs.isEmpty { saveNow() }
        } catch {
            // NUNCA sobrescrever uma biblioteca que não conseguimos ler: preserva
            // o arquivo em .bak e avisa, em vez de perder anotações e cadastros.
            let stamp = ISO8601DateFormatter().string(from: Date()).replacingOccurrences(of: ":", with: "-")
            let backup = baseDir.appendingPathComponent("library.json.bak-\(stamp)")
            try? FileManager.default.moveItem(at: libraryFile, to: backup)
            lastError = "Não foi possível ler a biblioteca (\(error.localizedDescription)). O arquivo original foi preservado em \(backup.lastPathComponent) — nada foi apagado."
        }
    }

    /// Grava imediatamente. Para digitação contínua, use `scheduleSave()`.
    func saveNow() {
        saveTask?.cancel()
        saveTask = nil
        let persisted = LibraryFile(laws: laws, updates: updates,
                                    lastCheckDate: lastCheckDate, annotations: annotations,
                                    customCategories: customCategories,
                                    study: study, activity: activity, readsByDay: readsByDay,
                                    precedents: precedents, srs: srs,
                                    douTerms: douTerms, douLastCheck: douLastCheck,
                                    studySecondsByLaw: studySecondsByLaw,
                                    readingChecklist: readingChecklist,
                                    coresFavoritas: coresFavoritas,
                                    alinhamentos: alinhamentos,
                                    leituraRespostas: leituraRespostas,
                                    leituraIA: leituraIA)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        if let data = try? encoder.encode(persisted) {
            try? data.write(to: libraryFile, options: .atomic)
        }
    }

    func save() { saveNow() }

    /// Save adiado (1 s) e coalescido — evita reescrever o library.json inteiro
    /// a cada tecla digitada numa nota.
    func scheduleSave() {
        saveTask?.cancel()
        saveTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 1_000_000_000)
            guard !Task.isCancelled else { return }
            self?.saveNow()
        }
    }

    // MARK: - Backup automático
    //
    // O library.json guarda TUDO que a usuária produz (favoritos, anotações,
    // progresso, jurisprudência, revisão espaçada). Os textos das leis são
    // recuperáveis do Planalto; o library.json não — por isso ele é copiado
    // automaticamente para backups/, com rotação, no máximo 1×/dia.

    private static let backupStampFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd-HHmmss"
        f.timeZone = .current
        return f
    }()

    func autoBackupIfNeeded() {
        let today = Self.dayFormatter.string(from: Date())
        if UserDefaults.standard.string(forKey: "lastBackupDay") == today { return }
        if backupNow() != nil {
            UserDefaults.standard.set(today, forKey: "lastBackupDay")
        }
    }

    /// Copia o library.json atual para backups/ e mantém só os 10 mais recentes.
    @discardableResult
    func backupNow() -> URL? {
        saveNow() // garante que o arquivo reflete o estado atual antes de copiar
        guard FileManager.default.fileExists(atPath: libraryFile.path),
              let data = try? Data(contentsOf: libraryFile) else { return nil }
        try? FileManager.default.createDirectory(at: backupsDir, withIntermediateDirectories: true)
        let url = backupsDir.appendingPathComponent("library-\(Self.backupStampFormatter.string(from: Date())).json")
        do { try data.write(to: url, options: .atomic) } catch { return nil }
        rotateBackups(keep: 10)
        return url
    }

    /// Backups existentes, do mais novo para o mais antigo (nome carimba a data).
    func backupFiles() -> [URL] {
        let files = (try? FileManager.default.contentsOfDirectory(at: backupsDir, includingPropertiesForKeys: [.contentModificationDateKey])) ?? []
        return files.filter { $0.lastPathComponent.hasPrefix("library-") && $0.pathExtension == "json" }
            .sorted { $0.lastPathComponent > $1.lastPathComponent }
    }

    var lastBackupDate: Date? {
        backupFiles().first.flatMap {
            (try? $0.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate
        }
    }

    private func rotateBackups(keep: Int) {
        for url in backupFiles().dropFirst(keep) { try? FileManager.default.removeItem(at: url) }
    }

    func revealBackupsInFinder() {
        try? FileManager.default.createDirectory(at: backupsDir, withIntermediateDirectories: true)
        NSWorkspace.shared.selectFile(nil, inFileViewerRootedAtPath: backupsDir.path)
    }

    /// Restaura a biblioteca a partir de um backup. Valida ANTES de sobrescrever e
    /// guarda o estado atual em backups/ (segurança), depois recarrega em memória.
    func restoreBackup(_ url: URL) {
        guard let data = try? Data(contentsOf: url),
              (try? JSONDecoder().decode(LibraryFile.self, from: data)) != nil else {
            lastError = "O backup selecionado está ilegível — nada foi alterado."
            return
        }
        backupNow()
        do { try data.write(to: libraryFile, options: .atomic) } catch {
            lastError = "Não foi possível restaurar o backup (\(error.localizedDescription))."
            return
        }
        load()
        seedIfNeeded()
    }

    private func seedIfNeeded() {
        let seeds = SeedCatalog.builtInLaws() + SeedCatalog.novidades2026()
        var changed = false
        for seed in seeds {
            // Casa pelo TÍTULO da entrada embutida (estável mesmo quando a URL da
            // fonte muda). Só entradas EMBUTIDAS — normas da usuária nunca são
            // sobrescritas pelo catálogo.
            if let idx = laws.firstIndex(where: { $0.isBuiltIn && $0.title == seed.title }) {
                // Entrada já existe: sincroniza apenas os campos TÉCNICOS de extração,
                // que evoluem com o app (preferências da usuária ficam intactas).
                if laws[idx].validationTerm != seed.validationTerm ||
                   laws[idx].stripPattern != seed.stripPattern ||
                   laws[idx].reference != seed.reference ||
                   laws[idx].category != seed.category ||
                   laws[idx].sourceURL != seed.sourceURL {
                    laws[idx].reference = seed.reference
                    laws[idx].validationTerm = seed.validationTerm
                    laws[idx].stripPattern = seed.stripPattern
                    // category é campo TÉCNICO do catálogo (a usuária reorganiza via
                    // customCategory, que sobrepõe): recategorizar uma lei embutida
                    // numa versão futura chega a quem já a tem instalada.
                    laws[idx].category = seed.category
                    // A URL da fonte pode mudar: força re-baixar do novo endereço e
                    // descarta o texto antigo (senão o diff usaria conteúdo de outra
                    // fonte e geraria alerta falso).
                    if laws[idx].sourceURL != seed.sourceURL {
                        laws[idx].sourceURL = seed.sourceURL
                        laws[idx].contentHash = nil
                        laws[idx].isDownloaded = false
                        try? FileManager.default.removeItem(at: textURL(for: laws[idx].id))
                    }
                    changed = true
                }
            } else {
                laws.append(seed)
                changed = true
            }
        }
        if changed { save() }
    }

    // MARK: - Textos em disco

    func textURL(for id: UUID) -> URL { textsDir.appendingPathComponent("\(id.uuidString).txt") }
    func previousTextURL(for id: UUID) -> URL { textsDir.appendingPathComponent("\(id.uuidString).anterior.txt") }

    func loadText(for law: LawEntry) -> String? {
        try? String(contentsOf: textURL(for: law.id), encoding: .utf8)
    }

    func saveText(_ text: String, for id: UUID) {
        try? text.write(to: textURL(for: id), atomically: true, encoding: .utf8)
    }

    // MARK: - Download e atualização
    //
    // Regras de concorrência (tudo roda na MainActor, mas os `await` de rede são
    // pontos de reentrância): NUNCA reutilizar um índice de `laws` depois de um
    // `await` — sempre re-resolver pelo id. `downloadingIDs` serve de exclusão
    // mútua entre o download manual e a verificação periódica.

    /// `quiet: true` nas verificações automáticas — falha não abre alerta modal
    /// (entra na contabilidade de falhas e avisa por notificação na 3ª seguida).
    func download(lawID: UUID, quiet: Bool = false) async {
        guard !downloadingIDs.contains(lawID),
              let law = laws.first(where: { $0.id == lawID }),
              law.sourceURL != nil else { return }
        // Offline: não adianta tentar (e não conta como falha da fonte). As leis já
        // baixadas continuam disponíveis; o download é retomado quando a conexão volta.
        guard isOnline else {
            if !quiet { lastError = "Sem conexão com a internet. Suas leis já salvas continuam disponíveis — o download será retomado quando você estiver online." }
            return
        }
        downloadingIDs.insert(lawID)
        defer { downloadingIDs.remove(lawID) }
        do {
            let text = try await Planalto.fetchText(for: law)
            let hash = Planalto.contentHash(of: text)
            guard let idx = laws.firstIndex(where: { $0.id == lawID }) else { return } // excluída durante o fetch
            if let oldHash = laws[idx].contentHash, oldHash != hash {
                // Lista de novidades que JÁ tinha conteúdo "esvaziar" é falha do
                // portal, nunca estado legítimo (as fontes são por ano) — não
                // sobrescreve a lista populada.
                if text == Planalto.emptyListSentinel,
                   let old = loadText(for: laws[idx]), old != text {
                    throw FetchError.unexpectedContent
                }
                // Dupla busca com intervalo: só aceita a mudança se ela se repetir —
                // evita falsos alertas quando o portal devolve variações transitórias.
                try await Task.sleep(nanoseconds: 2_000_000_000)
                let confirm = try await Planalto.fetchText(for: law)
                guard Planalto.contentHash(of: confirm) == hash else {
                    throw FetchError.unexpectedContent
                }
                guard let idx2 = laws.firstIndex(where: { $0.id == lawID }) else { return }
                let oldText = loadText(for: laws[idx2]) ?? ""
                registerChange(at: idx2, oldText: oldText, newText: text, notifyUser: true)
            }
            guard let idx3 = laws.firstIndex(where: { $0.id == lawID }) else { return }
            // Primeira gravação (sem baseline, ex.: migração de URL da seed): reposiciona
            // eventuais marcações antigas no texto novo — sem isso elas apontariam para
            // offsets de outro conteúdo sem nunca virar órfãs.
            if laws[idx3].contentHash == nil, annotations.contains(where: { $0.lawID == lawID }) {
                annotations = Annotations.reanchor(annotations, lawID: lawID, newText: text)
            }
            saveText(text, for: lawID)
            laws[idx3].contentHash = hash
            laws[idx3].isDownloaded = true
            laws[idx3].lastFetched = Date()
            laws[idx3].checkFailures = nil
            lastError = nil
            save()
            // Texto novo → poda cartões de revisão de artigos que deixaram de existir.
            await reconcileSRS(lawID: lawID)
        } catch {
            // Fonte que nunca baixou também entra na contabilidade de falhas —
            // senão o monitoramento dela morre em silêncio.
            if let idx = laws.firstIndex(where: { $0.id == lawID }) {
                let count = (laws[idx].checkFailures ?? 0) + 1
                laws[idx].checkFailures = count
                if count == 3 {
                    Notifier.notify(title: "Fonte com problema",
                                    body: "Não foi possível baixar “\(laws[idx].title)” nas últimas \(count) tentativas. A página pode ter mudado de endereço.")
                }
                save()
            }
            if !quiet {
                lastError = "Falha ao baixar \(laws.first(where: { $0.id == lawID })?.title ?? "norma"): \(error.localizedDescription)"
            }
        }
    }

    func downloadAllMissing(quiet: Bool = false) async {
        guard isOnline else {
            if !quiet { lastError = "Sem conexão com a internet. O download das normas será retomado automaticamente quando você voltar a ficar online." }
            return
        }
        let pending = laws.filter { !$0.isDownloaded && $0.sourceURL != nil }
        for (i, law) in pending.enumerated() {
            checkProgress = "Baixando \(i + 1) de \(pending.count): \(law.title)"
            await download(lawID: law.id, quiet: quiet)
        }
        checkProgress = ""
    }

    /// Verifica todas as normas e fontes monitoradas contra as páginas oficiais.
    func checkAllUpdates(manual: Bool) async {
        guard !isChecking else { return }
        // Offline: pula a verificação sem contabilizar falha nas fontes.
        guard isOnline else {
            if manual { lastError = "Sem conexão com a internet. A verificação de atualizações será retomada assim que você voltar a ficar online." }
            return
        }
        isChecking = true
        defer { isChecking = false; checkProgress = "" }

        // Instalação nova ou fontes recém-adicionadas: baixa antes de monitorar,
        // senão o monitoramento fica inerte sem baseline.
        await downloadAllMissing(quiet: !manual)

        let monitored = laws.filter { $0.monitored && $0.sourceURL != nil && $0.isDownloaded }
        var changedTitles: [String] = []
        var failures = 0

        for (i, law) in monitored.enumerated() {
            checkProgress = "Verificando \(i + 1) de \(monitored.count): \(law.title)"
            guard law.sourceURL != nil, !downloadingIDs.contains(law.id) else { continue }
            do {
                let newText = try await Planalto.fetchText(for: law)
                let newHash = Planalto.contentHash(of: newText)
                guard let idx = laws.firstIndex(where: { $0.id == law.id }),
                      !downloadingIDs.contains(law.id) else { continue }
                // nil-safe: sem baseline (contentHash nil, ex.: migração de URL) é
                // primeira gravação, NÃO alteração — evita alerta falso com texto antigo.
                if let oldHash = laws[idx].contentHash, oldHash != newHash {
                    // Lista de novidades que JÁ tinha conteúdo "esvaziar" é falha do
                    // portal (as fontes são por ano) — instabilidade, não mudança.
                    if newText == Planalto.emptyListSentinel,
                       let old = loadText(for: laws[idx]), old != newText {
                        throw FetchError.unexpectedContent
                    }
                    // Dupla busca com intervalo antes de declarar a mudança.
                    try await Task.sleep(nanoseconds: 2_000_000_000)
                    let confirm = try await Planalto.fetchText(for: law)
                    guard let idx2 = laws.firstIndex(where: { $0.id == law.id }),
                          !downloadingIDs.contains(law.id) else { continue }
                    if laws[idx2].contentHash == newHash {
                        // Um download manual concorrente já aplicou esta mesma
                        // mudança — não é falha nem mudança nova.
                        laws[idx2].lastFetched = Date()
                        save()
                        continue
                    }
                    guard Planalto.contentHash(of: confirm) == newHash else {
                        // Confirmação frustrada: fonte instável — o throw leva à
                        // contabilidade por norma (na 3ª seguida a usuária é avisada),
                        // que antes só valia para erros de rede.
                        throw FetchError.unexpectedContent
                    }
                    let oldText = loadText(for: laws[idx2]) ?? ""
                    registerChange(at: idx2, oldText: oldText, newText: newText, notifyUser: false)
                    saveText(newText, for: law.id)
                    laws[idx2].contentHash = newHash
                    laws[idx2].lastFetched = Date()
                    laws[idx2].checkFailures = nil
                    changedTitles.append(laws[idx2].title)
                    // Texto novo → poda cartões de revisão de artigos que sumiram.
                    await reconcileSRS(lawID: law.id)
                } else {
                    // Baseline ausente ou hash igual: grava o texto/baseline sem alertar.
                    if laws[idx].contentHash == nil {
                        // Reposiciona eventuais marcações antigas no texto novo
                        // (migração de URL descarta o texto, não as anotações).
                        if annotations.contains(where: { $0.lawID == law.id }) {
                            annotations = Annotations.reanchor(annotations, lawID: law.id, newText: newText)
                        }
                        saveText(newText, for: law.id)
                        laws[idx].contentHash = newHash
                        laws[idx].isDownloaded = true
                    }
                    laws[idx].lastFetched = Date()
                    laws[idx].checkFailures = nil
                }
                // Persiste por norma: se o app cair no meio da rodada, o hash salvo
                // não desalinha do texto já gravado em disco (evita diff vazio e
                // alerta falso na rodada seguinte).
                save()
            } catch {
                failures += 1
                if let idx = laws.firstIndex(where: { $0.id == law.id }) {
                    let count = (laws[idx].checkFailures ?? 0) + 1
                    laws[idx].checkFailures = count
                    // Falha persistente não pode ser silenciosa: na 3ª seguida, avisa.
                    if count == 3 {
                        Notifier.notify(title: "Fonte com problema",
                                        body: "Não foi possível verificar “\(laws[idx].title)” nas últimas \(count) tentativas. A página pode ter mudado de endereço — abra a norma para detalhes.")
                    }
                    save()
                }
            }
        }

        lastCheckDate = Date()
        save()

        if changedTitles.isEmpty {
            if manual {
                Notifier.notify(title: "Vade Mecum",
                                body: failures == 0
                                    ? "Verificação concluída: nenhuma alteração encontrada."
                                    : "Verificação concluída sem alterações (\(failures) fonte(s) não puderam ser verificadas).")
            }
        } else if changedTitles.count == 1 {
            Notifier.notify(title: "Alteração detectada",
                            body: "\(changedTitles[0]) foi atualizada. Abra o Vade Mecum para ver o que mudou.")
        } else {
            Notifier.notify(title: "\(changedTitles.count) fontes alteradas",
                            body: changedTitles.prefix(4).joined(separator: ", ") + (changedTitles.count > 4 ? "…" : ""))
        }
    }

    private func registerChange(at index: Int, oldText: String, newText: String, notifyUser: Bool) {
        let diff = Planalto.paragraphDiff(old: oldText, new: newText)
        try? oldText.write(to: previousTextURL(for: laws[index].id), atomically: true, encoding: .utf8)
        let event = UpdateEvent(lawID: laws[index].id,
                                lawTitle: laws[index].title,
                                date: Date(),
                                addedParagraphs: diff.added,
                                removedParagraphs: diff.removed)
        updates.insert(event, at: 0)
        if updates.count > 200 { updates.removeLast(updates.count - 200) }
        laws[index].lastChanged = Date()
        laws[index].hasUnreadUpdate = true
        // Texto mudou (a norma foi alterada) → a linha do tempo do Senado precisa ser
        // rebuscada na próxima abertura (não fica presa numa cadeia desatualizada).
        invalidateSigen(laws[index].id)
        // Reposiciona grifos e anotações no texto novo.
        annotations = Annotations.reanchor(annotations, lawID: laws[index].id, newText: newText)
        if notifyUser {
            Notifier.notify(title: "Alteração detectada",
                            body: "\(laws[index].title) foi atualizada.")
        }
    }

    /// Dispara a verificação automática quando o intervalo configurado já passou.
    func autoCheckLoop() async {
        while !Task.isCancelled {
            let interval = TimeInterval(max(updateIntervalHours, 1)) * 3600
            let due = lastCheckDate.map { Date().timeIntervalSince($0) >= interval } ?? true
            if due && !isChecking {
                await checkAllUpdates(manual: false)
            }
            // Alertas do DOU: no máximo 1×/dia (fonte não-oficial — não martelar).
            let douDue = douLastCheck.map { Date().timeIntervalSince($0) >= 24 * 3600 } ?? true
            if douDue && !douTerms.isEmpty {
                await checkDOU(manual: false)
            }
            try? await Task.sleep(nanoseconds: 30 * 60 * 1_000_000_000) // reavalia a cada 30 min
        }
    }

    /// Conexão VOLTOU: retoma a "sincronização posterior" — baixa o que faltava e
    /// reverifica, mas só se houver trabalho pendente (não martela as fontes a cada
    /// oscilação de rede).
    func resumeAfterReconnect() async {
        guard isOnline else { return }
        if !isChecking {
            let hasMissing = laws.contains { !$0.isDownloaded && $0.sourceURL != nil && ($0.checkFailures ?? 0) < 3 }
            let interval = TimeInterval(max(updateIntervalHours, 1)) * 3600
            let due = lastCheckDate.map { Date().timeIntervalSince($0) >= interval } ?? true
            if hasMissing || due { await checkAllUpdates(manual: false) }
        }
        let douDue = douLastCheck.map { Date().timeIntervalSince($0) >= 24 * 3600 } ?? true
        if douDue && !douTerms.isEmpty { await checkDOU(manual: false) }
    }

    // MARK: - Cadastro do usuário

    func addCustomLaw(title: String, reference: String, sourceURL: String?, pastedText: String?,
                      category: LawCategory = .personalizada, customCategory: String? = nil) async {
        var entry = LawEntry(title: title, reference: reference, category: category,
                             sourceURL: sourceURL?.isEmpty == false ? sourceURL : nil,
                             isBuiltIn: false, monitored: sourceURL?.isEmpty == false)
        if let customCategory, !customCategory.isEmpty {
            if let canonical = addCategory(customCategory) {
                entry.customCategory = canonical
            } else if let builtin = LawCategory.allCases.first(where: {
                $0.rawValue.localizedCaseInsensitiveCompare(customCategory) == .orderedSame
            }) {
                entry.category = builtin // nome digitado era matéria embutida
            }
        }
        if let pasted = pastedText, !pasted.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            saveText(pasted, for: entry.id)
            entry.contentHash = Planalto.contentHash(of: pasted)
            entry.isDownloaded = true
            entry.lastFetched = Date()
        }
        laws.append(entry)
        save()
        if entry.sourceURL != nil && !entry.isDownloaded {
            await download(lawID: entry.id)
        }
    }

    // MARK: - Matérias personalizadas

    /// Cria (ou reaproveita) uma matéria e devolve o nome CANÔNICO a usar.
    /// Devolve nil quando o nome colide com uma matéria embutida — nesse caso
    /// o chamador deve usar a própria categoria embutida.
    @discardableResult
    func addCategory(_ name: String) -> String? {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return nil }
        if LawCategory.allCases.contains(where: { $0.rawValue.localizedCaseInsensitiveCompare(trimmed) == .orderedSame }) {
            return nil
        }
        if let existing = customCategories.first(where: { $0.localizedCaseInsensitiveCompare(trimmed) == .orderedSame }) {
            return existing // já existe com outra grafia: devolve a canônica
        }
        customCategories.append(trimmed)
        customCategories.sort { $0.localizedCompare($1) == .orderedAscending }
        save()
        return trimmed
    }

    /// Remove a matéria; as normas dela voltam à matéria de origem.
    func deleteCategory(_ name: String) {
        customCategories.removeAll { $0 == name }
        for idx in laws.indices where laws[idx].customCategory == name {
            laws[idx].customCategory = nil
        }
        save()
    }

    func setCustomCategory(_ lawID: UUID, _ name: String?) {
        guard let idx = laws.firstIndex(where: { $0.id == lawID }) else { return }
        // addCategory canonicaliza a grafia; nome de matéria embutida (nil) limpa o override.
        laws[idx].customCategory = name.flatMap { addCategory($0) }
        save()
    }

    func deleteLaw(_ law: LawEntry) {
        laws.removeAll { $0.id == law.id }
        annotations.removeAll { $0.lawID == law.id }
        precedents.removeAll { $0.lawID == law.id }
        srs = srs.filter { !$0.key.hasPrefix(law.id.uuidString + "|") }
        study.removeValue(forKey: law.id.uuidString) // senão o progresso vira fantasma no Dashboard
        try? FileManager.default.removeItem(at: textURL(for: law.id))
        try? FileManager.default.removeItem(at: previousTextURL(for: law.id))
        invalidateSigen(law.id) // simétrico aos demais artefatos por norma (memória + disco)
        updates.removeAll { $0.lawID == law.id }
        save()
    }

    func markRead(_ lawID: UUID) {
        if let idx = laws.firstIndex(where: { $0.id == lawID }), laws[idx].hasUnreadUpdate {
            laws[idx].hasUnreadUpdate = false
            save()
        }
    }

    func setMonitored(_ lawID: UUID, _ value: Bool) {
        if let idx = laws.firstIndex(where: { $0.id == lawID }) {
            laws[idx].monitored = value
            save()
        }
    }

    func setGeneralNote(_ lawID: UUID, _ note: String) {
        if let idx = laws.firstIndex(where: { $0.id == lawID }) {
            let newValue = note.isEmpty ? nil : note
            guard laws[idx].generalNote != newValue else { return }
            laws[idx].generalNote = newValue
            scheduleSave()
        }
    }

    // MARK: - Anotações

    func annotations(for lawID: UUID) -> [TextAnnotation] {
        annotations
            .filter { $0.lawID == lawID }
            .sorted {
                if $0.isOrphaned != $1.isOrphaned { return !$0.isOrphaned }
                return $0.location < $1.location
            }
    }

    @discardableResult
    func addAnnotation(lawID: UUID, range: NSRange, in text: String,
                       style: AnnotationStyle, colorHex: String) -> TextAnnotation? {
        guard let annotation = Annotations.make(lawID: lawID, range: range, in: text,
                                                style: style, colorHex: colorHex) else { return nil }
        snapshotAnnotations()
        annotations.append(annotation)
        save()
        return annotation
    }

    /// `debounced: true` para mudanças contínuas (digitação, arraste do seletor de cor).
    func updateAnnotation(_ id: UUID, debounced: Bool = false, mutate: (inout TextAnnotation) -> Void) {
        guard let idx = annotations.firstIndex(where: { $0.id == id }) else { return }
        var copy = annotations[idx]
        mutate(&copy)
        guard copy != annotations[idx] else { return }
        if !debounced { snapshotAnnotations() }   // no arraste contínuo não empilha undo
        annotations[idx] = copy
        if debounced { scheduleSave() } else { save() }
    }

    func removeAnnotation(_ id: UUID) {
        snapshotAnnotations()
        annotations.removeAll { $0.id == id }
        save()
    }

    /// Lacunas (cloze) marcadas numa lei — para exportar como card Anki.
    func clozes(lawID: UUID) -> [TextAnnotation] {
        annotations.filter { $0.lawID == lawID && $0.style == .cloze && !$0.isOrphaned }
                   .sorted { $0.location < $1.location }
    }

    func removeClozes(lawID: UUID, in range: NSRange? = nil) {
        snapshotAnnotations()
        annotations.removeAll {
            guard $0.lawID == lawID, $0.style == .cloze else { return false }
            guard let range else { return true }
            return NSIntersectionRange($0.range, range).length > 0
        }
        save()
    }

    func annotationsOverlapping(lawID: UUID, range: NSRange) -> [TextAnnotation] {
        annotations.filter {
            $0.lawID == lawID && !$0.isOrphaned &&
            NSIntersectionRange($0.range, range).length > 0
        }
    }

    func removeAnnotations(lawID: UUID, overlapping range: NSRange) {
        snapshotAnnotations()
        annotations.removeAll {
            $0.lawID == lawID && !$0.isOrphaned &&
            NSIntersectionRange($0.range, range).length > 0
        }
        save()
    }

    var unreadCount: Int { laws.filter(\.hasUnreadUpdate).count }

    /// Acha na biblioteca a norma referida por uma remissão (ex.: "Lei nº 9.279"),
    /// para permitir pular até ela. Casamento CONSERVADOR: tipo canônico + número
    /// (sem milhar) idênticos — "Lei 105" nunca casa "Lei Complementar 105".
    // Id (LawUnit.id) do artigo VIGENTE de número `number` em `lawID` — para o índice
    // remissivo abrir OUTRA norma direto no artigo citado. Faz parse+colapso sob demanda
    // (no clique), igual ao leitor, então o id casa com o focusID de destino.
    func articleUnitID(lawID: UUID, number: String) -> Int? {
        guard let law = laws.first(where: { $0.id == lawID }), let text = loadText(for: law) else { return nil }
        let collapsed = ArticleStudyView.collapseRedactions(LawParser.parse(text))
        return collapsed.units.first { ArticleStudyView.articleNumberKey($0.label) == number }?.id
    }

    func findLaw(refType: String?, refNumber: String?) -> LawEntry? {
        guard let refNumber, !refNumber.isEmpty else { return nil }
        let wantType = LegislativeNote.canonicalType(refType ?? "")
        guard !wantType.isEmpty else { return nil }
        return laws.first { law in
            guard law.isRegularLaw, let ref = LegislativeNote.reference(in: law.reference) else { return false }
            return ref.number == refNumber && LegislativeNote.canonicalType(ref.type) == wantType
        }
    }

    // MARK: - Favoritos

    func isFavorite(_ lawID: UUID) -> Bool {
        laws.first(where: { $0.id == lawID })?.favorite == true
    }

    // Só normas comuns contam/aparecem como favoritas (o filtro da lista e isVisible
    // exigem isRegularLaw) — senão o badge da sidebar divergiria da lista.
    var favoriteCount: Int { laws.reduce(0) { $0 + ($1.isRegularLaw && $1.favorite == true ? 1 : 0) } }

    func toggleFavorite(_ lawID: UUID) {
        guard let idx = laws.firstIndex(where: { $0.id == lawID }), laws[idx].isRegularLaw else { return }
        laws[idx].favorite = !(laws[idx].favorite ?? false)
        save()
    }

    // MARK: - Enriquecimento SIGEN (Senado Dados Abertos) — linha do tempo legislativa
    //
    // Aditivo e OFFLINE-SAFE: a leitura da lei nunca depende disto. Busca 1× por
    // norma quando ela é aberta (online), cacheia em disco (sigen/{id}.json) e em
    // memória. Offline lê só do cache. Sentinela negativo (resolved=false) evita
    // re-tentar normas sem código no SIGEN (Constituição/ADCT/atos atípicos).

    func sigenNorma(for lawID: UUID) -> SigenNorma? { sigen[lawID] }

    /// Carrega o cache SIGEN do disco para a memória (1× na inicialização) — evita
    /// leitura de disco a cada render do leitor.
    private func loadSigenCache() {
        guard let files = try? FileManager.default.contentsOfDirectory(at: sigenDir, includingPropertiesForKeys: nil) else { return }
        let liveIDs = Set(laws.map(\.id))   // roda após load()+seedIfNeeded(), então laws já está populado
        for url in files where url.pathExtension == "json" {
            guard let id = UUID(uuidString: url.deletingPathExtension().lastPathComponent) else { continue }
            guard liveIDs.contains(id) else { try? FileManager.default.removeItem(at: url); continue }  // órfão de norma excluída
            guard let data = try? Data(contentsOf: url),
                  let norma = try? JSONDecoder().decode(SigenNorma.self, from: data) else { continue }
            sigen[id] = norma
        }
    }

    func enrichSIGEN(lawID: UUID, force: Bool = false) async {
        guard let law = laws.first(where: { $0.id == lawID }), law.isRegularLaw else { return }
        if !force, let cached = sigenNorma(for: lawID) {
            // TTL: revalida caches RESOLVIDOS com mais de 30 dias (o Senado pode ter
            // acrescentado alterações mesmo sem o texto do Planalto mudar); também
            // revalida cache de formato antigo (sem `subjects`) para popular o índice
            // de assuntos. O sentinela negativo (resolved=false) NÃO expira.
            let old = cached.resolved && cached.subjects == nil
            let stale = cached.resolved && Date().timeIntervalSince(cached.fetchedAt) > 30 * 24 * 3600
            if !old && !stale { return }
        }
        guard isOnline, !sigenFetching.contains(lawID) else { return }
        guard let key = Sigen.key(fromReference: law.reference) else {
            cacheSigen(lawID, .unresolved())                       // sem sigla/ano → não resolve nunca
            return
        }
        sigenFetching.insert(lawID)
        defer { sigenFetching.remove(lawID) }
        // Rede + parse fora da MainActor; FetchResult é valor (Sendable).
        let result = await Task.detached(priority: .utility) {
            await Sigen.fetch(sigla: key.sigla, numero: key.numero, ano: key.ano)
        }.value
        switch result {
        case .success(let norma): cacheSigen(lawID, norma)
        case .empty:
            // 404 definitivo: sentinela — MAS nunca sobrescreve um cache que já estava
            // resolvido com dados (um 404 súbito sobre norma já baixada é suspeito;
            // preserva a linha do tempo/assuntos em vez de destruí-los).
            if !(sigenNorma(for: lawID)?.resolved ?? false) { cacheSigen(lawID, .unresolved()) }
        case .networkError: break                        // transitório: não cacheia → re-tenta depois
        }
    }

    private func cacheSigen(_ lawID: UUID, _ norma: SigenNorma) {
        sigen[lawID] = norma
        subjectIndexCache = nil   // invalida o índice de assuntos memoizado
        try? FileManager.default.createDirectory(at: sigenDir, withIntermediateDirectories: true)
        if let data = try? JSONEncoder().encode(norma) {
            try? data.write(to: sigenDir.appendingPathComponent("\(lawID.uuidString).json"), options: .atomic)
        }
    }

    /// Invalida o cache SIGEN de uma norma (memória + disco) — chamado quando o
    /// texto muda (foi alterada) para a linha do tempo ser rebuscada na abertura
    /// seguinte, e ao excluir a norma.
    func invalidateSigen(_ lawID: UUID) {
        sigen.removeValue(forKey: lawID)
        subjectIndexCache = nil
        try? FileManager.default.removeItem(at: sigenDir.appendingPathComponent("\(lawID.uuidString).json"))
    }

    // MARK: - Alertas do Diário Oficial (DOU) — fonte não-oficial (in.gov.br), frágil
    //
    // A usuária vigia termos; o app varre a Seção 1 do DOU (últimos 7 dias) 1×/dia,
    // avisa por notificação as publicações NOVAS e mantém a lista em dou.json
    // (separado do library.json). Offline-safe: lê só o cache quando sem rede.

    // Conjunto de ids já VISTOS (independente do cap de exibição de 400) — evita
    // re-notificar as mesmas matérias que ainda estão na janela de 7 dias mas já
    // saíram do topo da lista.
    private var douSeenIDs: Set<String> = []
    private struct DOUCache: Codable { var items: [DOUItem]; var seenIDs: [String] }

    private func loadDOUCache() {
        guard let data = try? Data(contentsOf: douFile) else { return }
        if let cache = try? JSONDecoder().decode(DOUCache.self, from: data) {
            douItems = cache.items
            douSeenIDs = Set(cache.seenIDs)
        } else if let items = try? JSONDecoder().decode([DOUItem].self, from: data) {   // formato antigo
            douItems = items
            douSeenIDs = Set(items.map(\.id))
        }
    }

    private func saveDOUCache() {
        if let data = try? JSONEncoder().encode(DOUCache(items: douItems, seenIDs: Array(douSeenIDs))) {
            try? data.write(to: douFile, options: .atomic)
        }
    }

    func addDOUTerm(_ term: String) {
        let t = term.trimmingCharacters(in: .whitespacesAndNewlines)
        guard t.count >= 2, !douTerms.contains(where: { $0.localizedCaseInsensitiveCompare(t) == .orderedSame }) else { return }
        douTerms.append(t)
        save()
    }

    func removeDOUTerm(_ term: String) {
        douTerms.removeAll { $0 == term }
        // Tira do cache as publicações que só existiam por causa desse termo.
        douItems.removeAll { $0.term.localizedCaseInsensitiveCompare(term) == .orderedSame }
        saveDOUCache()
        save()
    }

    /// Varre o DOU para todos os termos vigiados. Offline → não faz nada. Publicações
    /// novas (não vistas) entram no topo e disparam notificação (nas verificações
    /// automáticas; no manual a usuária já está vendo a tela).
    func checkDOU(manual: Bool) async {
        guard !douChecking, !douTerms.isEmpty else { return }
        guard isOnline else { if manual { lastError = "Sem conexão com a internet. Os alertas do DOU serão retomados quando você voltar a ficar online." }; return }
        douChecking = true
        defer { douChecking = false }
        let to = Date()
        let from = Calendar.current.date(byAdding: .day, value: -7, to: to) ?? to
        var anySucceeded = false
        var freshIDs = Set<String>()
        var fresh: [DOUItem] = []
        for term in douTerms {
            let results = await Task.detached(priority: .utility) { await DOU.search(term: term, from: from, to: to) }.value
            guard let results else { continue }   // falha de rede nesse termo — ignora
            anySucceeded = true
            for item in results where !douSeenIDs.contains(item.id) && freshIDs.insert(item.id).inserted {
                fresh.append(item)
            }
            try? await Task.sleep(nanoseconds: 800_000_000)   // gentileza com a fonte não-oficial
        }
        if !fresh.isEmpty {
            douSeenIDs.formUnion(freshIDs)
            if douSeenIDs.count > 10000 { douSeenIDs = Set(douItems.map(\.id)).union(freshIDs) }  // poda rara
            douItems.insert(contentsOf: fresh, at: 0)
            if douItems.count > 400 { douItems.removeLast(douItems.count - 400) }
            saveDOUCache()
            if !manual {
                Notifier.notify(title: "Diário Oficial",
                                body: fresh.count == 1 ? fresh[0].title
                                    : "\(fresh.count) novas publicações no DOU sobre seus termos.")
            }
        }
        // Só carimba (e bloqueia por 24h) se ALGO respondeu — senão a fonte pode ter
        // caído e o próximo ciclo (30 min) tenta de novo, sem blackout de um dia.
        if anySucceeded { douLastCheck = Date() }
        save()
    }

    // MARK: - Histórico da norma (datas + redações anteriores)

    /// Data de promulgação, extraída da `reference` ("…, de 10 de janeiro de 2002").
    func promulgationText(for lawID: UUID) -> String? {
        guard let ref = laws.first(where: { $0.id == lawID })?.reference else { return nil }
        // "de DD de mês de AAAA" | "de DD/MM/AAAA" | "de AAAA" (o 1º que casar). O
        // `[ºo°]?` aceita o dia ordinal "1º" (ex.: CLT "de 1º de maio de 1943") —
        // sem ele a data degradava para só o ano.
        for p in ["de\\s+\\d{1,2}[ºo°]?\\s+de\\s+\\p{L}+\\s+de\\s+\\d{4}",
                  "de\\s+\\d{1,2}/\\d{1,2}/\\d{4}", "de\\s+\\d{4}"] {
            if let r = ref.range(of: p, options: [.regularExpression, .caseInsensitive]) {
                return String(ref[r]).replacingOccurrences(of: "^de\\s+", with: "",
                                                           options: [.regularExpression, .caseInsensitive])
            }
        }
        return nil
    }

    func lastChangedDate(for lawID: UUID) -> Date? { laws.first(where: { $0.id == lawID })?.lastChanged }

    /// A norma tem uma redação anterior guardada em disco (capturada numa alteração
    /// detectada com o app aberto)?
    func hasPreviousText(for lawID: UUID) -> Bool {
        FileManager.default.fileExists(atPath: previousTextURL(for: lawID).path)
    }

    func loadPreviousText(for lawID: UUID) -> String? {
        try? String(contentsOf: previousTextURL(for: lawID), encoding: .utf8)
    }

    /// URL do Planalto que mostra o texto COM as redações anteriores (o "atualizado",
    /// com o texto antigo riscado). Para as leis cujo seed é a versão "compilada"
    /// (limpa), deriva a base tirando "compilada/compilado"; senão a própria fonte já
    /// é o texto atualizado.
    func planaltoHistoryURL(for lawID: UUID) -> String? {
        guard let src = laws.first(where: { $0.id == lawID })?.sourceURL,
              src.range(of: "planalto\\.gov\\.br", options: .regularExpression) != nil else { return nil }
        return src.replacingOccurrences(of: "compilada", with: "", options: .caseInsensitive)
                  .replacingOccurrences(of: "compilado", with: "", options: .caseInsensitive)
    }

    // MARK: - Índice de assuntos (Senado)

    @Published var sigenIndexing = false
    @Published var sigenIndexProgress = ""

    /// Enriquece TODAS as normas baixadas com o SIGEN (para popular o índice de
    /// assuntos), com throttle leve. Offline/já-em-progresso → não faz nada.
    func enrichAllSIGEN() async {
        guard isOnline, !sigenIndexing else { return }
        sigenIndexing = true
        defer { sigenIndexing = false; sigenIndexProgress = "" }
        // Só as que ainda não têm assuntos cacheados (resolvidas de formato antigo,
        // sem cache, ou sentinela que pode ter virado dado). Não força sentinelas.
        let pending = laws.filter { law in
            guard law.isRegularLaw, law.sourceURL != nil else { return false }
            guard let c = sigen[law.id] else { return true }
            return c.resolved && c.subjects == nil   // formato antigo → repopular
        }
        for (i, law) in pending.enumerated() {
            guard isOnline else { break }
            sigenIndexProgress = "Indexando \(i + 1) de \(pending.count): \(law.title)"
            await enrichSIGEN(lawID: law.id)
            try? await Task.sleep(nanoseconds: 700_000_000)   // ~1 req/s (sem SLA publicado)
        }
    }

    /// Assuntos de uma norma (do cache SIGEN).
    func subjects(for lawID: UUID) -> [String] { sigen[lawID]?.subjectList ?? [] }

    // Memoizado: invalidado (=nil) em cacheSigen/invalidateSigen. Sem isso, o body
    // de SubjectsView reagregaria as 250 normas a cada tecla e a cada gravação de
    // cache durante a indexação em massa.
    private var subjectIndexCache: [(subject: String, lawIDs: [UUID])]?

    /// Índice agregado assunto → normas, a partir do que já está cacheado. A chave
    /// de agrupamento ignora caixa/acentos; o rótulo exibido é a 1ª grafia vista.
    func subjectIndex() -> [(subject: String, lawIDs: [UUID])] {
        if let cached = subjectIndexCache { return cached }
        var groups: [String: (label: String, ids: [UUID])] = [:]
        for law in laws where law.isRegularLaw {
            for term in subjects(for: law.id) {
                let key = term.uppercased().folding(options: .diacriticInsensitive, locale: nil)
                if var g = groups[key] { g.ids.append(law.id); groups[key] = g }
                else { groups[key] = (term, [law.id]) }
            }
        }
        let result = groups.values
            .map { (subject: $0.label, lawIDs: $0.ids) }
            .sorted { $0.subject.localizedCaseInsensitiveCompare($1.subject) == .orderedAscending }
        subjectIndexCache = result
        return result
    }

    /// Quantas normas já foram indexadas (têm assuntos no cache).
    var sigenIndexedCount: Int {
        laws.reduce(0) { $0 + (($1.isRegularLaw && !subjects(for: $1.id).isEmpty) ? 1 : 0) }
    }

    /// Normas que ainda faltam TENTAR indexar (com fonte e sem cache/formato antigo) —
    /// critério de "há trabalho a fazer" (não "todas têm assunto", que nunca chega ao
    /// total: normas sem fonte ou sem indexação temática no Senado ficariam de fora).
    var sigenPendingCount: Int {
        laws.reduce(0) { acc, law in
            guard law.isRegularLaw, law.sourceURL != nil else { return acc }
            guard let c = sigen[law.id] else { return acc + 1 }
            return acc + ((c.resolved && c.subjects == nil) ? 1 : 0)
        }
    }

    // MARK: - Jurisprudência por norma (cadastrada pela usuária)

    /// Precedentes vinculados a uma norma, mais recentes primeiro.
    func precedents(for lawID: UUID) -> [LawPrecedent] {
        precedents.filter { $0.lawID == lawID }
            .sorted { $0.createdAt > $1.createdAt }
    }

    func precedentCount(for lawID: UUID) -> Int {
        precedents.reduce(0) { $0 + ($1.lawID == lawID ? 1 : 0) }
    }

    /// Jurisprudência vinculada a um artigo específico: casa o campo "artigo
    /// relacionado" do precedente com o rótulo/chave do artigo (ex.: "Art. 5º").
    /// Comparação tolerante (ignora espaços/pontuação e "artigo"↔"art").
    func precedents(for lawID: UUID, matchingArticle label: String) -> [LawPrecedent] {
        let target = Self.normalizedArticle(label)
        guard !target.isEmpty else { return [] }
        return precedents.filter {
            $0.lawID == lawID && !$0.articleRef.isEmpty &&
            Self.normalizedArticle($0.articleRef) == target
        }.sorted { $0.createdAt > $1.createdAt }
    }

    // Núcleo "Art N" com milhar e sufixo de letra: grupo 1 = número (ex.: "1.045"),
    // grupo 2 = letra do sufixo (ex.: o "a" de "5º-A"). O ordinal [ºo°] é casado mas
    // NÃO capturado, para que "Art. 5º" e "Art. 5" caiam no mesmo núcleo.
    private static let articleCoreRegex = try! NSRegularExpression(
        pattern: "art[\\s.]*(\\d+(?:\\.\\d{3})*)[ºo°]?(?:[-.]([a-z]))?")

    /// "Art. 5º, XII" → "art5"; "Art. 1.045" → "art1045"; "Art. 5º-A" → "art5-a" —
    /// o núcleo para casar rótulo × referência por IGUALDADE (não prefixo, senão
    /// "Art. 1" casaria "Art. 1.045", e "Art. 5º" casaria "Art. 5º-A").
    private static func normalizedArticle(_ s: String) -> String {
        let lower = s.lowercased().replacingOccurrences(of: "artigo", with: "art")
        let full = NSRange(lower.startIndex..., in: lower)
        guard let m = articleCoreRegex.firstMatch(in: lower, range: full),
              let numRange = Range(m.range(at: 1), in: lower) else { return "" }
        var out = "art" + lower[numRange].replacingOccurrences(of: ".", with: "")
        if m.range(at: 2).location != NSNotFound, let letterRange = Range(m.range(at: 2), in: lower) {
            out += "-" + lower[letterRange]
        }
        return out
    }

    func addPrecedent(_ entry: LawPrecedent) {
        precedents.append(entry)
        save()
    }

    func updatePrecedent(_ entry: LawPrecedent) {
        guard let idx = precedents.firstIndex(where: { $0.id == entry.id }) else { return }
        precedents[idx] = entry
        save()
    }

    func deletePrecedent(_ id: UUID) {
        precedents.removeAll { $0.id == id }
        save()
    }

    // MARK: - Revisão espaçada (SM-2, estilo Anki)

    private static let srsCalendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/Sao_Paulo") ?? .current
        return calendar
    }()

    func srsKey(_ lawID: UUID, _ unitKey: String) -> String { "\(lawID.uuidString)|\(unitKey)" }
    func srsCard(_ lawID: UUID, _ unitKey: String) -> SRSCard? { srs[srsKey(lawID, unitKey)] }

    func srsIsDue(_ card: SRSCard, now: Date = Date()) -> Bool {
        card.due <= Self.srsCalendar.startOfDay(for: now)
    }

    /// Dias até a próxima revisão (negativo/zero = vencida). Usa o MESMO calendário
    /// fixo do resto do SRS, para o rótulo de status bater com srsIsDue/srsDueCount
    /// mesmo se o fuso do Mac diferir do horário de Brasília.
    func srsDaysUntilDue(_ card: SRSCard, now: Date = Date()) -> Int {
        let today = Self.srsCalendar.startOfDay(for: now)
        return Self.srsCalendar.dateComponents([.day], from: today, to: card.due).day ?? 0
    }

    /// Prévia do intervalo (em dias) que cada resposta produziria para este artigo —
    /// para rotular os botões (cartão novo se ainda não estiver no baralho).
    func srsPreview(_ lawID: UUID, _ unitKey: String, _ grade: SRSGrade, now: Date = Date()) -> Int {
        let base = Self.srsCalendar.startOfDay(for: now)
        let card = srsCard(lawID, unitKey) ?? SRSCard(due: base, added: now)
        return SpacedRepetition.nextInterval(card, grade)
    }

    /// Aplica a resposta ao artigo (cria o cartão se ainda não existir) e reprograma.
    @discardableResult
    func srsGrade(_ lawID: UUID, unitKey: String, grade: SRSGrade) -> SRSCard {
        let key = srsKey(lawID, unitKey)
        let now = Date()
        let base = Self.srsCalendar.startOfDay(for: now)
        let existing = srs[key] ?? SRSCard(due: base, added: now)
        // Só conta atividade na PRIMEIRA revisão do artigo no dia — reavaliar o mesmo
        // artigo (trocar a nota, ou "Errei" que o reapresenta) não infla o heatmap.
        let reviewedToday = existing.lastReviewed.map { Self.srsCalendar.isDate($0, inSameDayAs: now) } ?? false
        let updated = SpacedRepetition.schedule(existing, grade: grade, today: now, calendar: Self.srsCalendar)
        srs[key] = updated
        if !reviewedToday {
            let day = Self.dayFormatter.string(from: now)
            activity[day, default: 0] += 1
        }
        scheduleSave()
        return updated
    }

    func srsRemove(_ lawID: UUID, unitKey: String) {
        if srs.removeValue(forKey: srsKey(lawID, unitKey)) != nil { save() }
    }

    /// Cria um flashcard do artigo (entra no baralho vencido hoje) sem avaliar ainda.
    /// Idempotente: se já existe, não mexe no agendamento.
    @discardableResult
    func srsAddCard(_ lawID: UUID, unitKey: String,
                    kind: String? = nil, prompt: String? = nil, answer: String? = nil) -> Bool {
        let key = srsKey(lawID, unitKey)
        guard srs[key] == nil else { return false }
        let now = Date()
        srs[key] = SRSCard(due: Self.srsCalendar.startOfDay(for: now), added: now,
                           cardKind: kind, prompt: prompt, answer: answer)
        save()
        return true
    }

    /// Cria um flashcard a partir do artigo. `style` nil = automático (melhor cloze).
    @discardableResult
    func srsAddCard(_ lawID: UUID, unit: LawUnit, style: FlashcardStyle? = nil) -> Bool {
        let card = Flashcards.make(for: unit, style: style)
        return srsAddCard(lawID, unitKey: unit.key, kind: card.kind, prompt: card.prompt, answer: card.answer)
    }

    func srsHasCard(_ lawID: UUID, unitKey: String) -> Bool { srs[srsKey(lawID, unitKey)] != nil }

    var srsDeckCount: Int { srs.count }

    /// Lista o baralho para gerenciar (ver/apagar) — front = frente do cartão.
    func deckList() -> [(key: String, lawID: UUID, unitKey: String, title: String, kind: String, front: String)] {
        srs.compactMap { (key, card) in
            let parts = key.split(separator: "|", maxSplits: 1)
            guard parts.count == 2, let lawID = UUID(uuidString: String(parts[0])) else { return nil }
            let title = laws.first { $0.id == lawID }?.title ?? "Norma"
            let front = (card.prompt.map { $0.isEmpty } == false) ? card.prompt! : "Recordação do artigo"
            return (key, lawID, String(parts[1]), title, card.cardKind ?? "recall", front)
        }
        .sorted { $0.title == $1.title ? $0.front < $1.front : $0.title.localizedCompare($1.title) == .orderedAscending }
    }

    /// Apaga todos os flashcards do baralho.
    func srsClearAll() { if !srs.isEmpty { srs.removeAll(); save() } }

    /// Gera UM arquivo de importação do Anki POR FORMATO (note type). Cloze e
    /// "cloze escreva a resposta" saem como texto com {{c1::…}}; certo/errado e a
    /// pergunta direta saem como Frente/Verso. Cada arquivo traz as diretivas do
    /// Anki no topo (#separator/#html/#notetype/#tags column). Só devolve os
    /// arquivos que têm cartões. `names` = nomes EXATOS dos note types no Anki.
    func ankiFiles(names: (cloze: String, clozeDigite: String, certoErrado: String, direta: String))
        -> [(name: String, content: String)] {

        func esc(_ s: String) -> String {
            s.replacingOccurrences(of: "\t", with: " ")
             .replacingOccurrences(of: "\r", with: " ")
             .replacingOccurrences(of: "\n", with: "<br>")
             .trimmingCharacters(in: .whitespacesAndNewlines)
        }
        func tag(_ key: String) -> String {
            let lawID = key.split(separator: "|", maxSplits: 1).first.map(String.init) ?? ""
            let title = UUID(uuidString: lawID).flatMap { id in laws.first { $0.id == id }?.title } ?? "Norma"
            let cleaned = title.folding(options: .diacriticInsensitive, locale: nil)
                .map { $0.isLetter || $0.isNumber ? $0 : "_" }
            return "VadeMecum::" + String(cleaned)
        }
        // Reconstrói o texto cloze do Anki: troca a lacuna "______" por {{c1::termo}}.
        func clozeText(_ card: SRSCard) -> String {
            let p = card.prompt ?? ""
            let a = card.answer ?? ""
            if p.contains("______") { return p.replacingOccurrences(of: "______", with: "{{c1::\(a)}}") }
            return a.isEmpty ? p : "\(p) {{c1::\(a)}}"
        }

        let sorted = srs.sorted { $0.key < $1.key }
        func header(_ notetype: String, tagsCol: Int) -> [String] {
            ["#separator:tab", "#html:true", "#notetype:\(notetype)", "#tags column:\(tagsCol)"]
        }

        // Cloze (revelar) + Cloze (escrever) — 1 campo (texto) + tags.
        func clozeFile(kind: String, notetype: String) -> String {
            var lines = header(notetype, tagsCol: 2)
            var n = 0
            for (key, card) in sorted where card.cardKind == kind {
                lines.append([esc(clozeText(card)), tag(key)].joined(separator: "\t")); n += 1
            }
            return n > 0 ? lines.joined(separator: "\n") : ""
        }
        // Frente/Verso — certo/errado e pergunta direta (+ cartões antigos "recall").
        func basicFile(kinds: Set<String>, notetype: String, includeLegacy: Bool) -> String {
            var lines = header(notetype, tagsCol: 3)
            var n = 0
            for (key, card) in sorted {
                let k = card.cardKind ?? ""
                let isLegacy = (k.isEmpty || k == FlashKind.recall)
                guard kinds.contains(k) || (includeLegacy && isLegacy) else { continue }
                var front = card.prompt ?? "Qual é o teor deste artigo?"
                if k == FlashKind.certoErrado { front += "  (Certo ou errado?)" }
                let back = card.answer ?? "(consulte a norma)"
                lines.append([esc(front), esc(back), tag(key)].joined(separator: "\t")); n += 1
            }
            return n > 0 ? lines.joined(separator: "\n") : ""
        }

        return [
            ("anki-cloze.txt", clozeFile(kind: FlashKind.cloze, notetype: names.cloze)),
            ("anki-cloze-escrever.txt", clozeFile(kind: FlashKind.clozeType, notetype: names.clozeDigite)),
            ("anki-certo-errado.txt", basicFile(kinds: [FlashKind.certoErrado], notetype: names.certoErrado, includeLegacy: false)),
            ("anki-basico-direta.txt", basicFile(kinds: [FlashKind.direta], notetype: names.direta, includeLegacy: true)),
        ].filter { !$0.content.isEmpty }
    }

    func srsDueCount(now: Date = Date()) -> Int {
        let today = Self.srsCalendar.startOfDay(for: now)
        return srs.values.reduce(0) { $0 + ($1.due <= today ? 1 : 0) }
    }

    /// Artigos com revisão vencida (due ≤ hoje), como pares (norma, chave do artigo).
    func srsDueEntries(now: Date = Date()) -> [(lawID: UUID, unitKey: String)] {
        let today = Self.srsCalendar.startOfDay(for: now)
        return srs.compactMap { key, card in
            guard card.due <= today,
                  let sep = key.firstIndex(of: "|"),
                  let id = UUID(uuidString: String(key[..<sep])) else { return nil }
            return (id, String(key[key.index(after: sep)...]))
        }
    }

    // MARK: - Metas do dia e previsão de revisões

    /// Artigos marcados como lidos hoje (para a meta diária de leitura).
    var readsToday: Int { readsByDay[Self.dayFormatter.string(from: Date())] ?? 0 }

    /// Cartões distintos revisados hoje (para a meta diária de revisão). Deriva de
    /// `lastReviewed` (não incha com re-revisões do mesmo cartão no mesmo dia).
    var reviewedToday: Int {
        let now = Date()
        return srs.values.reduce(0) { acc, c in
            acc + ((c.lastReviewed.map { Self.srsCalendar.isDate($0, inSameDayAs: now) } ?? false) ? 1 : 0)
        }
    }

    /// Quantos cartões vencem em cada um dos próximos `days` dias (o dia 0 inclui os
    /// atrasados). Alimenta o mini-gráfico de "próximos 7 dias".
    func srsForecast(days: Int = 7, now: Date = Date()) -> [(date: Date, count: Int)] {
        let cal = Self.srsCalendar
        let today = cal.startOfDay(for: now)
        var result: [(date: Date, count: Int)] = []
        for offset in 0..<days {
            guard let day = cal.date(byAdding: .day, value: offset, to: today) else { continue }
            let count = srs.values.reduce(0) { acc, card in
                let cardDay = cal.startOfDay(for: card.due)
                if offset == 0 { return acc + (cardDay <= today ? 1 : 0) }
                return acc + (cal.isDate(cardDay, inSameDayAs: day) ? 1 : 0)
            }
            result.append((date: day, count: count))
        }
        return result
    }

    /// Remove cartões de revisão cujo artigo não existe mais no texto atual da norma
    /// (ex.: artigo revogado/renumerado numa atualização do Planalto). Sem isso, o
    /// cartão órfão continua contando como "vencido" no Início para sempre, mas a
    /// sessão de revisão o descarta — a contagem prometeria revisões que nunca abrem.
    func reconcileSRS(lawID: UUID) async {
        let prefix = lawID.uuidString + "|"
        guard srs.keys.contains(where: { $0.hasPrefix(prefix) }),
              let law = laws.first(where: { $0.id == lawID }),
              let text = loadText(for: law) else { return }
        let valid = await Task.detached(priority: .utility) { Set(LawParser.parse(text).map(\.key)) }.value
        // SALVAGUARDA: se o parser não achou NENHUM artigo (texto rebaixado com layout
        // novo do Planalto, gravação interrompida, etc.), NÃO podar — senão apagaríamos
        // TODOS os flashcards da norma de forma irreversível. Parse vazio = "não sei
        // dizer a validade", nunca "tudo inválido".
        guard !valid.isEmpty else { return }
        let filtered = srs.filter { key, _ in
            !key.hasPrefix(prefix) || valid.contains(String(key.dropFirst(prefix.count)))
        }
        if filtered.count != srs.count { srs = filtered; save() }
    }

    /// Passa por todas as normas que têm cartões e poda os órfãos (chamado na carga).
    func reconcileAllSRS() async {
        let ids = Set(srs.keys.compactMap { UUID(uuidString: String($0.prefix(36))) })
        for id in ids { await reconcileSRS(lawID: id) }
    }

    // MARK: - Estudo (lido / revisão / notas por artigo)

    private static let dayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "America/Sao_Paulo")
        return formatter
    }()

    func record(for lawID: UUID) -> StudyRecord {
        study[lawID.uuidString] ?? StudyRecord()
    }

    func setUnitTotal(_ lawID: UUID, _ total: Int) {
        var record = record(for: lawID)
        guard record.unitTotal != total else { return }
        record.unitTotal = total
        study[lawID.uuidString] = record
        scheduleSave()
    }

    func toggleRead(_ lawID: UUID, unitKey: String) {
        var record = record(for: lawID)
        let day = Self.dayFormatter.string(from: Date())
        if record.readKeys.contains(unitKey) {
            record.readKeys.remove(unitKey)
            readsByDay[day] = max(0, (readsByDay[day] ?? 0) - 1)   // desmarcar não pode inflar a meta
        } else {
            record.readKeys.insert(unitKey)
            activity[day, default: 0] += 1
            readsByDay[day, default: 0] += 1   // separado da atividade, p/ a meta de leitura do dia
        }
        study[lawID.uuidString] = record
        scheduleSave()
    }

    func toggleReview(_ lawID: UUID, unitKey: String) {
        var record = record(for: lawID)
        if record.reviewKeys.contains(unitKey) {
            record.reviewKeys.remove(unitKey)
        } else {
            record.reviewKeys.insert(unitKey)
        }
        study[lawID.uuidString] = record
        scheduleSave()
    }

    func setLastUnit(_ lawID: UUID, _ unitID: Int) {
        var record = record(for: lawID)
        guard record.lastUnitID != unitID else { return }
        record.lastUnitID = unitID
        study[lawID.uuidString] = record
        scheduleSave()
    }

    func setUnitNote(_ lawID: UUID, unitKey: String, note: String) {
        var record = record(for: lawID)
        let trimmed = note.trimmingCharacters(in: .whitespacesAndNewlines)
        if record.notes[unitKey] == (trimmed.isEmpty ? nil : trimmed) { return }
        if trimmed.isEmpty {
            record.notes.removeValue(forKey: unitKey)
        } else {
            record.notes[unitKey] = trimmed
        }
        study[lawID.uuidString] = record
        scheduleSave()
    }

    // Anotação RICA (RTF) por artigo. Guarda o RTF em richNotes e o texto puro em notes
    // (usado nas prévias, contagem e sync). RTF vazio limpa ambos.
    func unitRichNote(_ lawID: UUID, unitKey: String) -> Data? {
        record(for: lawID).richNotes[unitKey]
    }
    func setUnitRichNote(_ lawID: UUID, unitKey: String, rtf: Data, plain: String) {
        var record = record(for: lawID)
        let trimmed = plain.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            record.richNotes.removeValue(forKey: unitKey)
            record.notes.removeValue(forKey: unitKey)
        } else {
            record.richNotes[unitKey] = rtf
            record.notes[unitKey] = trimmed
        }
        study[lawID.uuidString] = record
        scheduleSave()
    }

    var totalReadUnits: Int { study.values.reduce(0) { $0 + $1.readKeys.count } }
    var totalReviewUnits: Int { study.values.reduce(0) { $0 + $1.reviewKeys.count } }

    /// Dias seguidos (terminando hoje ou ontem) com pelo menos 1 unidade lida.
    var currentStreak: Int {
        let calendar = Calendar.current
        var day = Date()
        // A sequência não quebra se hoje ainda não estudou.
        if activity[Self.dayFormatter.string(from: day)] == nil {
            guard let yesterday = calendar.date(byAdding: .day, value: -1, to: day) else { return 0 }
            day = yesterday
        }
        var streak = 0
        while activity[Self.dayFormatter.string(from: day)] != nil {
            streak += 1
            guard let previous = calendar.date(byAdding: .day, value: -1, to: day) else { break }
            day = previous
        }
        return streak
    }

    var activeDaysLastYear: Int {
        let calendar = Calendar.current
        guard let cutoff = calendar.date(byAdding: .day, value: -365, to: Date()) else { return activity.count }
        let cutoffKey = Self.dayFormatter.string(from: cutoff)
        return activity.keys.filter { $0 >= cutoffKey }.count
    }

    /// Intensidade de leitura dos últimos `days` dias (mais antigo primeiro).
    func activitySeries(days: Int) -> [(date: Date, count: Int)] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        return (0..<days).reversed().compactMap { offset in
            guard let date = calendar.date(byAdding: .day, value: -offset, to: today) else { return nil }
            return (date, activity[Self.dayFormatter.string(from: date)] ?? 0)
        }
    }
}
