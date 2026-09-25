import SwiftUI
import UIKit

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
    @AppStorage("leituraAtiva") private var leituraAtiva = false
    // Lido (não escrito) só para saber se a barra do ArticleStudyView está na tela e
    // não repetir os mesmos botões duas vezes, uma barra em cima da outra.
    @AppStorage("studyLayout") private var studyLayout = "foco"
    @State private var showReaderFontPicker = false
    @AppStorage("readerLineSpacing") private var entrelinha = 7.0
    // Gaveta de contexto e "ir para artigo" (estado só de tela — nada persistido).
    @State private var gaveta: AlturaGaveta = .fechada
    @State private var abaGaveta = 0
    @State private var artigoAberto: CabecalhoArtigo?
    @State private var mostrarIrPara = false
    // Contagem de julgados por artigo: calculada UMA vez por norma (não a cada redesenho).
    @State private var contagensLei: [String: Int] = [:]
    // Compacto (iPhone, Slide Over): nem readerBar nem cabeçalho da norma — a barra de
    // navegação do sistema leva um menu "Mais" com tudo; na Leitura corrida, um rodapé
    // fino com "Ir para artigo", busca, marcação e alinhamento. Em regular nada muda.
    @Environment(\.ehCompacto) private var ehCompacto
    @FocusState private var focoArtigo: Bool

    private var ehCompactoOuFalso: Bool { ehCompacto }
    private var law: LawEntry? { store.laws.first { $0.id == lawID } }
    // Índices de "Novidades 2026" são feeds (lista de atos), não normas com artigos:
    // abrem sempre em leitura corrida e não têm modo Estudo nem jurisprudência.
    private var isNovidades: Bool { law?.isNovidades ?? false }
    private var effectiveMode: String { isNovidades ? "corrido" : readerMode }
    private var accent: Color {
        guard let law else { return ThemeState.t.accent }
        if law.isNovidades { return AppTheme.warn }
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
        // A toolbar da JANELA pertence ao host AppKit (o seletor Cátedra|LEGIS|JURIS), e o
        // LEGIS entra como NSHostingView-subview — então .toolbar { } daqui nunca era
        // desenhado e TODOS estes controles estavam mortos. Viram uma barra própria acima
        // do conteúdo, como o JURIS já faz em EntryDetailView.
        .safeAreaInset(edge: .top, spacing: 0) { if !ehCompacto { barraDoLeitor } }
        .toolbar {
            if ehCompacto {
                ToolbarItem(placement: .topBarTrailing) { maisMenuCompacto }
            }
        }
        // Gancho de VERIFICAÇÃO (ver ContentView): `-legisAbrirFolha precedentes|historico|anotacoes`
        // abre a folha logo que o leitor aparece. Inerte sem o argumento.
        .task {
            try? await Task.sleep(nanoseconds: 900_000_000)
            switch UserDefaults.standard.string(forKey: "legisAbrirFolha") {
            case "precedentes": showPrecedents = true
            case "historico":   showHistorico = true
            case "anotacoes":   showInspector = true
            default: break
            }
        }
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
        .sheet(isPresented: $mostrarIrPara) {
            VStack(alignment: .leading, spacing: DSEspaco.e3) {
                Text("Ir para artigo").font(DS.display(19, .bold))
                TextField("Número do artigo (ex.: 5, 1.045, 121-A)", text: $articleQuery)
                    .textFieldStyle(.roundedBorder)
                    .onSubmit { controller.jump(toArticle: articleQuery); mostrarIrPara = false }
            }
            .padding(DSEspaco.e5).frame(minWidth: 320)
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
            .legisDetentesSeCompacto([.medium, .large])
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
            if let text {
                if effectiveMode == "estudo" {
                    ArticleStudyView(lawID: lawID, text: text, accent: accent, onOpenLaw: onOpenLaw)
                } else {
                    ZStack(alignment: .bottom) {
                        AnnotatedTextView(text: text,
                                          annotations: store.annotations(for: lawID),
                                          fontFamily: fontFamily,
                                          fontSize: fontSize,
                                          controller: controller,
                                          focusedAnnotationID: $focusedAnnotationID,
                                          onCommand: handle,
                                          textAlignment: store.alinhamentoNS(lawID: lawID, unitKey: "full"),
                                          contagens: contagensLei,
                                          entrelinha: entrelinha,
                                          onToqueArtigo: { c in artigoAberto = c; abaGaveta = 0; gaveta = .meia })
                        atalhosDoLeitor
                        if controller.selectionLength > 0 && gaveta == .fechada {
                            paletaSelecao.padding(.bottom, DSEspaco.e5)
                        }
                        if let c = artigoAberto {
                            GavetaContexto(altura: $gaveta, titulo: c.rotulo,
                                           subtitulo: "\(JurisPorArtigo.verbetes(lei: law, label: c.rotulo).count) julgados",
                                           abas: ["Jurisprudência", "Remissões"], aba: $abaGaveta,
                                           compacto: ehCompactoOuFalso) {
                                conteudoGaveta(law: law, artigo: c, texto: text)
                            }
                        }
                    }
                    if ehCompacto && !isNovidades { barraCorridaCompacta }
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
            contagensLei = law.isNovidades ? [:] : JurisPorArtigo.contagens(lei: law)
            loadAttempted = true
            store.markRead(lawID)
            // Enriquecimento do Senado (linha do tempo): 1×, cacheado, offline-safe.
            await store.enrichSIGEN(lawID: lawID)
        }
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

    // MARK: - Barra do leitor (spec §5: no máximo 5 controles — voltar · onde estou · Ler/Estudar · Aa · ⋯)

    @ViewBuilder
    private var barraDoLeitor: some View {
        if cleanReading {
            HStack {
                Button { withAnimation(.easeInOut(duration: 0.15)) { cleanReading = false } } label: {
                    Label("Sair da imersão", systemImage: "arrow.down.right.and.arrow.up.left")
                }
                .keyboardShortcut("i", modifiers: [.command, .shift])
                Spacer()
            }
            .padding(.horizontal, DSEspaco.e4).frame(minHeight: 44)
            .background(ThemeState.t.surface)
        } else if let law {
            BarraLeitor(ramo: law.customCategory ?? law.category.rawValue,
                        corRamo: law.customCategory == nil ? law.category.ramo?.identidade : nil,
                        titulo: law.title,
                        modo: isNovidades ? nil : Binding(get: { ModoLeitor(rawValue: readerMode) ?? .ler },
                                                         set: { readerMode = $0.rawValue }),
                        aoVoltar: nil,
                        aa: { tipografiaMenu }, mais: { maisMenu })
        }
    }

    /// ⌘J e ⌘F do modo Ler. Ficam FORA do ⋯: dentro de um Menu fechado os atalhos não
    /// disparam (revisão final da entrega 2) — e o ⌘F funcionava na barra antiga.
    private var atalhosDoLeitor: some View {
        ZStack {
            Button("Ir para artigo") { mostrarIrPara = true }.keyboardShortcut("j", modifiers: .command)
            Button("Buscar no texto") { controller.showFindBar() }.keyboardShortcut("f", modifiers: .command)
        }
        .opacity(0).frame(width: 0, height: 0).allowsHitTesting(false).accessibilityHidden(true)
    }

    /// Grifo na SELEÇÃO (o menu "Marcar" saiu da barra): cores favoritas, cor livre,
    /// sublinhar, anotar e apagar — 44 pt cada.
    private var paletaSelecao: some View {
        HStack(spacing: DSEspaco.e1) {
            ForEach(Array(store.coresFavoritas.prefix(5)), id: \.self) { hex in
                Button { markerColorHex = hex; handle(.apply(.highlight)) } label: {
                    Circle().fill(Color(hexRGBA: hex)).frame(width: 22, height: 22)
                        .overlay(Circle().strokeBorder(ThemeState.t.ink.opacity(markerColorHex == hex ? 0.6 : 0.15), lineWidth: 2))
                }
                .frame(minWidth: 44, minHeight: 44).contentShape(Rectangle())
                .accessibilityLabel("Grifar com esta cor")
            }
            ColorPicker("Outra cor", selection: Binding(get: { Color(hexRGBA: markerColorHex) },
                                                         set: { markerColorHex = $0.hexRGBA }))
                .labelsHidden().frame(minWidth: 44, minHeight: 44)
            Divider().frame(height: 22)
            Button { handle(.apply(.underline)) } label: { Image(systemName: "underline") }
                .frame(minWidth: 44, minHeight: 44).accessibilityLabel("Sublinhar")
            Button { handle(.annotate) } label: { Image(systemName: "note.text.badge.plus") }
                .frame(minWidth: 44, minHeight: 44).accessibilityLabel("Anotar")
            Button(role: .destructive) { handle(.removeInSelection) } label: { Image(systemName: "eraser") }
                .frame(minWidth: 44, minHeight: 44).accessibilityLabel("Apagar marcação")
        }
        .buttonStyle(.plain)
        .font(DS.interface(15))
        .foregroundStyle(ThemeState.t.ink)
        .padding(.horizontal, DSEspaco.e3)
        .background(Capsule().fill(ThemeState.t.surface).shadow(color: ThemeState.t.ink.opacity(0.16), radius: 12, y: 4))
        .overlay(Capsule().strokeBorder(ThemeState.t.border))
    }

    /// Conteúdo da gaveta: SÓ fonte primária — texto oficial do julgado e remissões da lei.
    @ViewBuilder
    private func conteudoGaveta(law: LawEntry, artigo c: CabecalhoArtigo, texto: String) -> some View {
        if abaGaveta == 0 {
            let vs = JurisPorArtigo.verbetes(lei: law, label: c.rotulo)
            VStack(alignment: .leading, spacing: DSEspaco.e3) {
                if vs.isEmpty {
                    Text("Nenhum julgado do acervo cita este artigo.")
                        .font(DS.interface(15)).foregroundStyle(ThemeState.t.text2)
                }
                ForEach(vs) { v in
                    let corTrib = CorTribunal.identidade(v.trib)
                    VStack(alignment: .leading, spacing: DSEspaco.e2) {
                        HStack(spacing: DSEspaco.e2) {
                            Text(v.trib.isEmpty ? "—" : v.trib).font(DS.interface(11, .bold))
                                .padding(.horizontal, 7).padding(.vertical, 2)
                                .background(Capsule().fill((corTrib.map { DS.cor($0) } ?? ThemeState.t.accent).opacity(0.16)))
                                .foregroundStyle(corTrib.map { DS.corTexto($0) } ?? ThemeState.t.accent)
                            Text(v.t).font(DS.interface(14, .semibold)).foregroundStyle(ThemeState.t.ink)
                        }
                        if let oficial = JurisPorArtigo.textoOficial(v.id), !oficial.isEmpty {
                            Text(oficial).font(DS.display(16, .regular)).foregroundStyle(ThemeState.t.ink)
                                .lineSpacing(3).textSelection(.enabled)
                        }
                        HStack {
                            Text([v.ramo, v.data].filter { !$0.isEmpty }.joined(separator: " · "))
                                .font(DS.mono(11)).foregroundStyle(ThemeState.t.text3)
                            Spacer()
                            Button("Abrir no JURIS") { JurisPorArtigo.abrirNoJuris(v.id) }
                                .font(DS.interface(13, .semibold)).frame(minHeight: 44)
                        }
                    }
                    .padding(DSEspaco.e4)
                    .background(RoundedRectangle(cornerRadius: DSRaio.card, style: .continuous).strokeBorder(ThemeState.t.border))
                }
            }
        } else {
            let notas = LegislativeNote.parse(from: LeitorLogica.trecho(de: c, em: texto,
                                                                          cabecalhos: LeitorLogica.cabecalhos(em: texto)))
            if notas.isEmpty {
                Text("Nenhuma remissão no texto deste artigo.")
                    .font(DS.interface(15)).foregroundStyle(ThemeState.t.text2)
            } else {
                RemissoesView(notes: notas,
                              resolve: { note in
                                  guard let id = store.findLaw(refType: note.refType, refNumber: note.refNumber)?.id,
                                        id != lawID else { return nil }
                                  return id
                              },
                              onOpen: onOpenLaw, embedded: true)
            }
        }
    }

    /// Itens do menu "Marcar" (Leitura corrida): cores favoritas, estilos, anotar, apagar.
    /// Compartilhados pela barra do iPad e pelo rodapé compacto.
    @ViewBuilder
    private var marcarItens: some View {
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
        Divider()
        Button(role: .destructive) { handle(.removeInSelection) } label: { Label("Apagar marcação", systemImage: "eraser") }
            .disabled(controller.selectionLength == 0)
    }

    /// Itens do menu "Alinhamento" (Leitura corrida).
    @ViewBuilder
    private var alinhamentoItens: some View {
        Button { store.setAlinhamento("left", lawID: lawID, unitKey: "full") } label: { Label("À esquerda", systemImage: "text.alignleft") }
        Button { store.setAlinhamento("center", lawID: lawID, unitKey: "full") } label: { Label("Centralizado", systemImage: "text.aligncenter") }
        Button { store.setAlinhamento("right", lawID: lawID, unitKey: "full") } label: { Label("À direita", systemImage: "text.alignright") }
        Button { store.setAlinhamento("justify", lawID: lawID, unitKey: "full") } label: { Label("Justificado", systemImage: "text.justify") }
        Divider()
        Button { store.setAlinhamento("natural", lawID: lawID, unitKey: "full") } label: { Label("Usar padrão", systemImage: "arrow.uturn.backward") }
    }

    // MARK: - Compacto: menu "Mais" na barra de navegação e rodapé da Leitura corrida

    /// Tudo o que a readerBar e o cabeçalho ofereciam, num menu só da barra de navegação:
    /// modo (Estudo/Leitura corrida), favoritar, anotações, tipografia e o "Mais" de sempre.
    @ViewBuilder
    private var maisMenuCompacto: some View {
        if let law {
            Menu {
                if !isNovidades {
                    Picker("Modo de leitura", selection: $readerMode) {
                        Label("Estudo (artigo por artigo)", systemImage: "doc.text").tag("estudo")
                        Label("Leitura corrida", systemImage: "text.justify.left").tag("corrido")
                    }
                    .pickerStyle(.inline)
                }
                if law.isRegularLaw {
                    Button { store.toggleFavorite(law.id) } label: {
                        Label(law.favorite == true ? "Remover dos favoritos" : "Adicionar aos favoritos",
                              systemImage: law.favorite == true ? "star.slash" : "star")
                    }
                }
                Button { showInspector.toggle() } label: {
                    Label("Minhas notas", systemImage: "note.text")
                }
                if effectiveMode == "corrido" {
                    Menu {
                        Button("Fonte do leitor…") { showReaderFontPicker = true }
                        Button("Aumentar") { fontSize = min(30, fontSize + 1) }
                        Button("Diminuir") { fontSize = max(10, fontSize - 1) }
                    } label: {
                        Label("Tipografia · \(Int(fontSize)) pt", systemImage: "textformat.size")
                    }
                    Toggle(isOn: $cleanReading) { Label("Imersão", systemImage: "book.closed") }
                }
                Divider()
                maisMenuItens(law)
            } label: {
                Image(systemName: "ellipsis.circle").alvoToque()
            }
            .accessibilityLabel("Mais opções da norma")
        }
    }

    /// Rodapé da Leitura corrida em compacto: "Ir para artigo", busca no texto, marcação e
    /// alinhamento — os controles que a readerBar tinha, ao alcance do polegar, 44 pt cada.
    private var barraCorridaCompacta: some View {
        HStack(spacing: 8) {
            TextField("Ir para artigo…", text: $articleQuery)
                .textFieldStyle(.roundedBorder)
                .submitLabel(.go)
                .focused($focoArtigo)
                .onSubmit { controller.jump(toArticle: articleQuery) }
                .frame(minHeight: 44)
                .accessibilityLabel("Ir para artigo")
            Button { controller.showFindBar() } label: {
                Image(systemName: "magnifyingglass").alvoToque()
            }
            .accessibilityLabel("Buscar no texto desta norma")
            Menu { marcarItens } label: {
                Image(systemName: "highlighter").alvoToque()
            }
            .accessibilityLabel("Marcar a seleção")
            Menu { alinhamentoItens } label: {
                Image(systemName: "text.alignleft").alvoToque()
            }
            .accessibilityLabel("Alinhamento do texto")
        }
        .padding(.horizontal, 12).padding(.vertical, 4)
        .background(.bar)
        .overlay(Rectangle().fill(AppTheme.hairline).frame(height: 1), alignment: .top)
        .tecladoConcluir(foco: $focoArtigo)
    }

    private var tipografiaMenu: some View {
        Menu {
            Button("Fonte do leitor…") { showReaderFontPicker = true }
            Button("Aumentar") { fontSize = min(30, fontSize + 1) }
            Button("Diminuir") { fontSize = max(10, fontSize - 1) }
            Picker("Entrelinha", selection: $entrelinha) {
                Text("Compacta").tag(4.0); Text("Padrão").tag(7.0); Text("Ampla").tag(11.0)
            }
            Divider()
            Text("\(fontFamily), \(Int(fontSize)) pt")
        } label: {
            Label("Tipografia", systemImage: "textformat.size")
        }
        .menuStyle(.borderlessButton).menuIndicator(.hidden).fixedSize()
        .labelStyle(.iconOnly)
        .help("Fonte e tamanho do texto")
    }


    @ViewBuilder
    private var maisMenu: some View {
        if let law {
            Menu {
                Section("Situação") {
                    if let f = law.lastFetched { Text("Verificada \(f.formatted(date: .abbreviated, time: .shortened))") }
                    if let c = law.lastChanged { Text("Alterada \(c.formatted(date: .abbreviated, time: .omitted))") }
                    if (law.checkFailures ?? 0) >= 3 { Text("Verificação falhando há \(law.checkFailures ?? 0) tentativas") }
                }
                if !isNovidades, !store.subjects(for: lawID).isEmpty {
                    Section("Assuntos (Senado)") {
                        Text(store.subjects(for: lawID).prefix(8).map { $0.capitalized }.joined(separator: " · "))
                    }
                }
                if effectiveMode == "corrido" && !isNovidades {
                    Button { mostrarIrPara = true } label: { Label("Ir para artigo… (⌘J)", systemImage: "number") }
                    Button { controller.showFindBar() } label: { Label("Buscar no texto (⌘F)", systemImage: "magnifyingglass") }
                    Menu {
                        alinhamentoItens
                    } label: { Label("Alinhamento", systemImage: "text.alignleft") }
                }
                if effectiveMode == "estudo" {
                    Button { leituraAtiva.toggle() } label: {
                        Label(leituraAtiva ? "Sair da leitura ativa" : "Leitura ativa", systemImage: "book.and.wrench")
                    }
                }
                if law.isRegularLaw {
                    Button { store.toggleFavorite(law.id) } label: {
                        Label(law.favorite == true ? "Remover dos favoritos" : "Favoritar",
                              systemImage: law.favorite == true ? "star.fill" : "star")
                    }
                }
                Button { showInspector.toggle() } label: { Label("Minhas notas", systemImage: "note.text") }
                Button { withAnimation(.easeInOut(duration: 0.15)) { cleanReading = true } } label: { Label("Imersão", systemImage: "book.closed") }
                    .keyboardShortcut("i", modifiers: [.command, .shift])
                Divider()
                maisMenuItens(law)
            } label: {
                Image(systemName: "ellipsis.circle").font(DS.interface(17))
                    .frame(minWidth: 44, minHeight: 44).contentShape(Rectangle())
                    .accessibilityLabel("Mais")
            }
            .menuStyle(.borderlessButton).menuIndicator(.hidden).fixedSize()
            .labelStyle(.iconOnly)
            .help("Histórico, jurisprudência, monitoramento, mover de matéria e excluir")
        }
    }

    /// Itens do "Mais" — os mesmos na barra do iPad e no menu compacto.
    @ViewBuilder
    private func maisMenuItens(_ law: LawEntry) -> some View {
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
                                UIApplication.shared.open(url)
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
    }

}
