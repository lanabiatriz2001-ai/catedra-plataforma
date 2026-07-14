import SwiftUI
import AppKit

struct LawReaderView: View {
    @EnvironmentObject var store: AppStore
    let lawID: UUID
    // Abre outra norma (ex.: ao clicar numa remissão "Revogado pela Lei X").
    var onOpenLaw: (UUID) -> Void = { _ in }

    @StateObject private var controller = ReaderController()
    @State private var text: String?
    @State private var loadAttempted = false
    @State private var focusedAnnotationID: UUID?
    @State private var articleQuery = ""
    @State private var showInspector = false
    @State private var showPrecedents = false
    @State private var showHistorico = false
    @State private var showDeleteConfirm = false
    @State private var pendingRemovalRange: NSRange?
    @AppStorage("readerFontSize") private var fontSize = 16.0
    @AppStorage("readerFontFamily") private var fontFamily = "Sistema (Serifa)"
    @AppStorage("markerColorHex") private var markerColorHex = "#FFD60AFF"
    @AppStorage("readerMode") private var readerMode = "estudo"
    @AppStorage("cleanReading") private var cleanReading = false
    @State private var showReaderFontPicker = false

    private var law: LawEntry? { store.laws.first { $0.id == lawID } }
    // Índices de "Novidades 2026" são feeds (lista de atos), não normas com artigos:
    // abrem sempre em leitura corrida e não têm modo Estudo nem jurisprudência.
    private var isNovidades: Bool { law?.isNovidades ?? false }
    private var effectiveMode: String { isNovidades ? "corrido" : readerMode }
    private var accent: Color {
        guard let law else { return .accentColor }
        if law.isNovidades { return .orange }
        if let custom = law.customCategory { return CustomCategoryStyle.color(for: custom) }
        return law.category.color
    }
    private var headerSymbol: String {
        guard let law else { return "book" }
        if law.isNovidades { return "sparkles" }
        return law.category.symbol
    }

    var body: some View {
        Group {
            if let law {
                if law.isDownloaded {
                    reader(for: law)
                } else {
                    downloadPrompt(for: law)
                }
            }
        }
        .toolbar { toolbarContent }
        .inspector(isPresented: $showInspector) {
            AnnotationsPanel(lawID: lawID,
                             focusedAnnotationID: $focusedAnnotationID,
                             controller: controller)
                .inspectorColumnWidth(min: 260, ideal: 320, max: 420)
        }
        .sheet(isPresented: $showPrecedents) {
            if let law {
                LawPrecedentsView(lawID: lawID, lawTitle: law.title, accent: accent)
                    .environmentObject(store)
            }
        }
        .sheet(isPresented: $showHistorico) {
            if let law {
                HistoricoView(lawID: lawID, lawTitle: law.title, accent: accent, onOpenLaw: onOpenLaw)
                    .environmentObject(store)
            }
        }
        .sheet(isPresented: $showReaderFontPicker) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Fonte do leitor").font(.headline)
                FontPickerView(selectedFamily: fontFamily, selectedSize: fontSize) { family, size in
                    fontFamily = family
                    fontSize = size
                }
            }
            .padding(12)
        }
        .confirmationDialog("Excluir esta norma e todas as suas anotações?",
                            isPresented: $showDeleteConfirm, titleVisibility: .visible) {
            Button("Excluir", role: .destructive) {
                if let law { store.deleteLaw(law) }
            }
            Button("Cancelar", role: .cancel) {}
        }
        .confirmationDialog("A seleção contém marcações com anotações escritas. Apagar mesmo assim?",
                            isPresented: Binding(
                                get: { pendingRemovalRange != nil },
                                set: { if !$0 { pendingRemovalRange = nil } }
                            ), titleVisibility: .visible) {
            Button("Apagar marcações e anotações", role: .destructive) {
                if let range = pendingRemovalRange {
                    store.removeAnnotations(lawID: lawID, overlapping: range)
                }
                pendingRemovalRange = nil
            }
            Button("Cancelar", role: .cancel) { pendingRemovalRange = nil }
        }
    }

    // MARK: - Leitor

    private func reader(for law: LawEntry) -> some View {
        VStack(spacing: 0) {
            // Modo leitura limpa: some com o cabeçalho para o texto ocupar tudo.
            if !cleanReading {
                header(for: law)
                Divider()
            }
            if let text {
                if effectiveMode == "estudo" {
                    ArticleStudyView(lawID: lawID, text: text, accent: accent, onOpenLaw: onOpenLaw)
                } else {
                    AnnotatedTextView(text: text,
                                      annotations: store.annotations(for: lawID),
                                      fontFamily: fontFamily,
                                      fontSize: fontSize,
                                      controller: controller,
                                      focusedAnnotationID: $focusedAnnotationID,
                                      onCommand: handle,
                                      textAlignment: store.alinhamentoNS(lawID: lawID, unitKey: "full"))
                }
            } else if loadAttempted {
                ContentUnavailableView {
                    Label("Texto não encontrado no disco", systemImage: "exclamationmark.triangle")
                } description: {
                    Text("O arquivo com o texto desta norma sumiu. Baixe novamente.")
                } actions: {
                    Button("Baixar novamente") {
                        Task {
                            await store.download(lawID: lawID)
                            // Recarrega direto: se o texto re-baixado tiver o MESMO
                            // hash, o id da .task não muda e a tela ficaria presa
                            // no aviso mesmo com o arquivo de volta no disco.
                            if let law = store.laws.first(where: { $0.id == lawID }) {
                                text = store.loadText(for: law)
                            }
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(store.downloadingIDs.contains(lawID))
                }
            } else {
                Spacer()
                ProgressView("Abrindo texto…")
                Spacer()
            }
        }
        .background(AppTheme.pageBackground)
        .task(id: "\(lawID.uuidString)-\(law.contentHash ?? "")") {
            text = store.loadText(for: law)
            loadAttempted = true
            store.markRead(lawID)
            // Enriquecimento do Senado (linha do tempo): 1×, cacheado, offline-safe.
            await store.enrichSIGEN(lawID: lawID)
        }
    }

    private func header(for law: LawEntry) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 12) {
                IconBubble(symbol: headerSymbol, color: accent, size: 46)
                VStack(alignment: .leading, spacing: 3) {
                    Text(law.title)
                        .font(.system(.title2, design: .default).weight(.semibold))
                        .lineLimit(2)
                    Text(law.reference)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 6) {
                    if isNovidades {
                        Label("Índice de novidades", systemImage: "sparkles")
                            .font(.caption).foregroundStyle(.secondary)
                    } else {
                        Picker("", selection: $readerMode) {
                            Text("Estudo").tag("estudo")
                            Text("Leitura corrida").tag("corrido")
                        }
                        .pickerStyle(.segmented)
                        .frame(width: 210)
                        .help("Estudo: artigo por artigo, com progresso. Leitura corrida: texto contínuo com grifos e ⌘F.")
                    }
                    if effectiveMode == "corrido" && !isNovidades {
                        TextField("Ir para artigo…", text: $articleQuery)
                            .textFieldStyle(.roundedBorder)
                            .frame(width: 150)
                            .onSubmit { controller.jump(toArticle: articleQuery) }
                            .help("Digite o número do artigo e pressione Enter (busca no texto: ⌘F)")
                    }
                }
            }
            HStack(spacing: 8) {
                if let fetched = law.lastFetched {
                    Chip(text: "Verificada \(fetched.formatted(date: .abbreviated, time: .shortened))",
                         symbol: "checkmark.circle", color: .green)
                }
                if let changed = law.lastChanged {
                    Chip(text: "Alterada \(changed.formatted(date: .abbreviated, time: .omitted))",
                         symbol: "clock.arrow.circlepath", color: .orange)
                }
                if law.sourceURL != nil && !law.monitored {
                    Chip(text: "Monitoramento desligado", symbol: "bell.slash", color: .gray)
                }
                if (law.checkFailures ?? 0) >= 3 {
                    Chip(text: "Verificação falhando há \(law.checkFailures ?? 0) tentativas",
                         symbol: "exclamationmark.triangle", color: .red)
                }
                let count = store.annotations(for: lawID).count
                if count > 0 {
                    Chip(text: "\(count) anotações", symbol: "highlighter", color: .pink)
                }
                if !isNovidades {
                    let jurisCount = store.precedentCount(for: lawID)
                    Button {
                        showPrecedents = true
                    } label: {
                        Chip(text: jurisCount > 0 ? "\(jurisCount) jurisprudência\(jurisCount > 1 ? "s" : "")" : "Jurisprudência",
                             symbol: "text.book.closed", color: accent)
                    }
                    .buttonStyle(.plain)
                    .help("Súmulas, teses e decisões que você vincula a esta norma")
                }
                if !isNovidades {
                    let n = store.sigenNorma(for: lawID)?.timeline.count ?? 0
                    Button { showHistorico = true } label: {
                        Chip(text: n > 0 ? "Histórico · \(n) alterações" : "Histórico",
                             symbol: "clock.arrow.circlepath", color: accent)
                    }
                    .buttonStyle(.plain)
                    .help("Datas (promulgação e alterações) e redações anteriores desta norma")
                }
                Spacer()
            }
            if !isNovidades {
                let subs = store.subjects(for: lawID)
                if !subs.isEmpty {
                    HStack(spacing: 6) {
                        Image(systemName: "tag").font(.caption2).foregroundStyle(.secondary)
                        Text(subs.prefix(8).map { $0.capitalized }.joined(separator: " · "))
                            .font(.caption).foregroundStyle(.secondary).lineLimit(1)
                    }
                    .help("Assuntos indexados pelo Senado")
                }
            }
        }
        .padding(16)
        .appTintedSurface(accent)
        .padding(12)
        .background(AppTheme.pageBackground)
    }

    // MARK: - Comandos de marcação

    private func handle(_ command: ReaderCommand) {
        guard let text else { return }
        switch command {
        case .apply(let style):
            guard let range = controller.selectedRange else { return }
            store.addAnnotation(lawID: lawID, range: range, in: text,
                                style: style, colorHex: markerColorHex)
        case .annotate:
            guard let range = controller.selectedRange else { return }
            if let annotation = store.addAnnotation(lawID: lawID, range: range, in: text,
                                                    style: .highlight, colorHex: markerColorHex) {
                showInspector = true
                focusedAnnotationID = annotation.id
            }
        case .removeInSelection:
            guard let range = controller.selectedRange else { return }
            let overlapping = store.annotationsOverlapping(lawID: lawID, range: range)
            if overlapping.contains(where: { !$0.note.isEmpty }) {
                pendingRemovalRange = range // tem nota escrita: confirma antes de apagar
            } else {
                store.removeAnnotations(lawID: lawID, overlapping: range)
            }
        }
    }

    // MARK: - Ainda não baixada

    private func downloadPrompt(for law: LawEntry) -> some View {
        ContentUnavailableView {
            Label(law.title, systemImage: "icloud.and.arrow.down")
        } description: {
            Text("O texto integral ainda não foi baixado.")
        } actions: {
            if store.downloadingIDs.contains(law.id) {
                ProgressView("Baixando…")
            } else {
                Button("Baixar agora") {
                    Task { await store.download(lawID: law.id) }
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }

    // MARK: - Barra de ferramentas

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItemGroup {
            Button {
                cleanReading.toggle()
            } label: {
                Label("Leitura limpa", systemImage: cleanReading ? "book.closed.fill" : "book.closed")
            }
            .help("Leitura limpa: esconde todo o chrome e deixa só o texto")

            // Na Leitura limpa o cabeçalho (com o seletor de modo) some; este seletor
            // aparece só então, para não se perder a troca de modo.
            if cleanReading && !isNovidades {
                Picker("Modo", selection: $readerMode) {
                    Text("Estudo").tag("estudo")
                    Text("Leitura corrida").tag("corrido")
                }
                .pickerStyle(.segmented)
                .frame(width: 200)
                .help("Alternar entre Estudo e Leitura corrida")
            }

            // Marcação e busca no texto só valem na Leitura corrida — no Estudo a
            // marcação é pela barra do próprio artigo e a busca é pelo Índice. (Estes
            // controles ficavam MORTOS no Estudo; o ColorPicker virava a "pílula verde".)
            if effectiveMode == "corrido" {
                Menu {
                    ForEach(store.coresFavoritas, id: \.self) { hex in
                        Button {
                            markerColorHex = hex
                        } label: {
                            Label(hex, systemImage: markerColorHex == hex ? "checkmark.circle.fill" : "circle.fill")
                        }
                    }
                    Divider()
                    Button("Favoritar cor atual", systemImage: "plus") { store.adicionarCorFavorita(markerColorHex) }
                        .disabled(store.coresFavoritas.contains(markerColorHex))
                    if store.coresFavoritas.contains(markerColorHex) {
                        Button("Remover cor dos favoritos", systemImage: "minus", role: .destructive) { store.removerCorFavorita(markerColorHex) }
                    }
                    ColorPicker("Escolher outra cor…", selection: Binding(
                        get: { Color(hexRGBA: markerColorHex) },
                        set: { markerColorHex = $0.hexRGBA }))
                    Divider()
                    ForEach(AnnotationStyle.allCases.filter { $0 != .cloze }) { style in
                        Button { handle(.apply(style)) } label: { Label(style.label, systemImage: style.symbol) }
                            .disabled(controller.selectionLength == 0)
                    }
                    Button { handle(.annotate) } label: { Label("Anotar", systemImage: "note.text.badge.plus") }
                        .disabled(controller.selectionLength == 0)
                } label: {
                    Label("Marcar", systemImage: "highlighter")
                }
                .help("Grifar, sublinhar, tachar ou anotar a seleção")

                Button { controller.showFindBar() } label: {
                    Label("Buscar no texto", systemImage: "magnifyingglass")
                }
                .help("Busca nativa no texto (⌘F)")

                Menu {
                    Button { store.setAlinhamento("left", lawID: lawID, unitKey: "full") } label: { Label("À esquerda", systemImage: "text.alignleft") }
                    Button { store.setAlinhamento("center", lawID: lawID, unitKey: "full") } label: { Label("Centralizado", systemImage: "text.aligncenter") }
                    Button { store.setAlinhamento("right", lawID: lawID, unitKey: "full") } label: { Label("À direita", systemImage: "text.alignright") }
                    Button { store.setAlinhamento("justify", lawID: lawID, unitKey: "full") } label: { Label("Justificado", systemImage: "text.justify") }
                    Divider()
                    Button { store.setAlinhamento("natural", lawID: lawID, unitKey: "full") } label: { Label("Usar padrão", systemImage: "arrow.uturn.backward") }
                } label: {
                    Label("Alinhamento", systemImage: "text.alignleft")
                }
                .help("Alinhamento do texto")
            }

            Menu {
                Button("Fonte do leitor…") { showReaderFontPicker = true }
                Button("Aumentar") { fontSize = min(30, fontSize + 1) }
                Button("Diminuir") { fontSize = max(10, fontSize - 1) }
                Divider()
                Text("\(fontFamily), \(Int(fontSize)) pt")
            } label: {
                Label("Tipografia", systemImage: "textformat.size")
            }
            .help("Fonte e tamanho do texto")

            if let law, law.isRegularLaw {   // feeds de Novidades não são favoritáveis
                Button {
                    store.toggleFavorite(law.id)
                } label: {
                    Label(law.favorite == true ? "Favorita" : "Favoritar",
                          systemImage: law.favorite == true ? "star.fill" : "star")
                }
                .help(law.favorite == true ? "Remover dos favoritos" : "Adicionar aos favoritos")
            }

            if let law {
                Menu {
                    if !isNovidades {
                        Button { showHistorico = true } label: {
                            Label("Histórico da norma", systemImage: "clock.arrow.circlepath")
                        }
                        Button { showPrecedents = true } label: {
                            Label("Jurisprudência", systemImage: "text.book.closed")
                        }
                        Divider()
                    }
                    if law.sourceURL != nil {
                        Toggle(isOn: Binding(
                            get: { law.monitored },
                            set: { store.setMonitored(law.id, $0) }
                        )) {
                            Label("Monitorar alterações", systemImage: "bell")
                        }
                        Button {
                            Task { await store.download(lawID: law.id) }
                        } label: {
                            Label("Atualizar agora", systemImage: "arrow.down.circle")
                        }
                        .disabled(store.downloadingIDs.contains(law.id))
                        Button {
                            if let source = law.sourceURL, let url = URL(string: source) {
                                NSWorkspace.shared.open(url)
                            }
                        } label: {
                            Label("Abrir a fonte no navegador", systemImage: "safari")
                        }
                    }
                    if law.isRegularLaw {
                        Divider()
                        Menu {
                            Button {
                                store.setCustomCategory(law.id, nil)
                            } label: {
                                let mark = law.customCategory == nil ? "✓ " : ""
                                Text("\(mark)\(law.category.rawValue) (origem)")
                            }
                            ForEach(store.customCategories, id: \.self) { name in
                                Button {
                                    store.setCustomCategory(law.id, name)
                                } label: {
                                    let mark = law.customCategory == name ? "✓ " : ""
                                    Text("\(mark)\(name)")
                                }
                            }
                        } label: {
                            Label("Mover para matéria", systemImage: "tag")
                        }
                    }
                    if !law.isBuiltIn {
                        Divider()
                        Button(role: .destructive) {
                            showDeleteConfirm = true
                        } label: {
                            Label("Excluir norma…", systemImage: "trash")
                        }
                    }
                } label: {
                    Label("Mais", systemImage: "ellipsis.circle")
                }
            }

            Button {
                showInspector.toggle()
            } label: {
                Label("Anotações", systemImage: "sidebar.right")
            }
            .help("Mostrar/ocultar o painel de anotações")
        }
    }
}
