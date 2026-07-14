import SwiftUI
import AppKit

/// Ponte de navegação por SETAS do teclado: o host (main.swift) captura ←/→ e
/// avisa por Notification; o leitor em modo Foco escuta e volta/passa o artigo.
/// `canNavigate` evita consumir as setas quando não há leitor em Foco aberto
/// (na Leitura corrida, listas ou digitando, as setas seguem normais).
enum LegisReaderNav {
    static let navNotification = Notification.Name("CatedraLegisReaderNav")
    nonisolated(unsafe) static var canNavigate = false
}

/// Modo de estudo: leitura artigo por artigo (ou súmula/tema), com marcação de
/// lido, revisão, anotação, flashcards e progresso.
struct ArticleStudyView: View {
    @EnvironmentObject var store: AppStore
    let lawID: UUID
    let text: String
    let accent: Color
    var onOpenLaw: (UUID) -> Void = { _ in }

    // `units` = só os artigos VIGENTES. Redações antigas do mesmo artigo (blocos
    // "Art. Nº" consecutivos e repetidos, ex.: CF Art. 6º com 4 redações) são
    // COLAPSADAS: no Estudo aparece apenas o vigente, e as anteriores ficam num
    // comparativo (botão no cartão). Navegação/índice/progresso contam só vigentes.
    @State private var units: [LawUnit] = []
    @State private var historyByID: [Int: [LawUnit]] = [:]  // id do vigente → redações anteriores (antigas→novas)
    @State private var snapToVigenteID: [Int: Int] = [:]    // qualquer id (full) → id do vigente do grupo
    @State private var parsing = true
    @State private var focusID = 0   // id (posição no doc) do artigo vigente em foco
    @State private var activeSheet: StudySheet?

    // Um único .sheet(item:) — empilhar vários .sheet(isPresented:) no mesmo view
    // confunde o SwiftUI (macOS) sobre qual apresentar (armadilha corrigida na v36).
    private enum StudySheet: Int, Identifiable { case index, map; var id: Int { rawValue } }
    @State private var filter = ""
    @State private var onlyReview = false
    @AppStorage("studyLayout") private var layout = "foco"   // "foco" | "cartoes"
    @AppStorage("srsEnabled") private var srsEnabled = false // revisão espaçada ligada?
    // Última norma estudada — alimenta o "Continuar estudando" do Início.
    @AppStorage("lastStudiedLawID") private var lastStudiedLawID = ""

    private var record: StudyRecord { store.record(for: lawID) }

    var body: some View {
        Group {
            if parsing {
                VStack { Spacer(); ProgressView("Organizando artigos…"); Spacer() }
            } else if units.isEmpty {
                ContentUnavailableView {
                    Label("Não encontrei artigos neste texto", systemImage: "doc.questionmark")
                } description: {
                    Text("Use o modo de leitura corrida para este documento.")
                }
            } else {
                content
            }
        }
        .task(id: text.hashValue) {
            parsing = true
            let source = text
            let parsed = await Task.detached(priority: .userInitiated) { LawParser.parse(source) }.value
            guard !Task.isCancelled else { return }
            let collapsed = Self.collapseRedactions(parsed)
            units = collapsed.units
            historyByID = collapsed.historyByID
            snapToVigenteID = collapsed.snapToVigenteID
            // record.lastUnitID e os hits da busca são índices no array COMPLETO
            // (== LawUnit.id); mapeamos para o id do vigente do grupo.
            let clampedFull = min(max(record.lastUnitID, 0), max(parsed.count - 1, 0))
            focusID = collapsed.snapToVigenteID[clampedFull] ?? (collapsed.units.first?.id ?? 0)
            store.setLastUnit(lawID, focusID) // re-grava já mapeado p/ o vigente
            parsing = false
            store.setUnitTotal(lawID, collapsed.units.count)
            if !parsed.isEmpty { lastStudiedLawID = lawID.uuidString }
        }
        .onChange(of: record.lastUnitID) { _, newValue in
            // A busca global pode pedir outro artigo enquanto a MESMA norma já está
            // aberta. Aí selectedLawID/texto não mudam, o .task(id:) não re-dispara,
            // e o foco ficaria preso no artigo antigo — reposicionamos aqui (mapeando
            // o índice pedido para o vigente do grupo, caso caia numa redação antiga).
            guard !units.isEmpty else { return }
            let target = snapToVigenteID[newValue] ?? newValue
            if target != focusID, units.contains(where: { $0.id == target }) { focusID = target }
        }
        // Setas ←/→ passam/voltam o artigo (modo Foco). O host captura a tecla e avisa.
        .onReceive(NotificationCenter.default.publisher(for: LegisReaderNav.navNotification)) { note in
            guard layout == "foco", !units.isEmpty else { return }
            let next = (note.userInfo?["next"] as? Bool) ?? true
            let pos = focusPosition
            if next, pos < units.count - 1 { goTo(units[pos + 1].id) }
            else if !next, pos > 0 { goTo(units[pos - 1].id) }
        }
        .onAppear { LegisReaderNav.canNavigate = (layout == "foco") }
        .onDisappear { LegisReaderNav.canNavigate = false }
        .onChange(of: layout) { _, v in LegisReaderNav.canNavigate = (v == "foco") }
    }

    @ViewBuilder
    private var content: some View {
        VStack(spacing: 0) {
            topBar
            Divider()
            if layout == "foco" {
                focusMode
            } else {
                cardsMode
            }
        }
        .background(AppTheme.pageBackground)
        .sheet(item: $activeSheet) { sheet in
            switch sheet {
            case .index:
                IndexSheet(lawID: lawID, units: units, accent: accent, currentID: focusID) { id in
                    layout = "foco"; activeSheet = nil
                    goTo(id) // salva a posição, como Anterior/Próximo
                }
            case .map:
                if let unit = focusUnit {
                    ArticleMapSheet(unit: unit,
                                    lawTitle: store.laws.first { $0.id == lawID }?.title ?? "",
                                    accent: accent)
                }
            }
        }
    }

    // MARK: - Barra superior (índice + progresso + layout)

    private var topBar: some View {
        HStack(spacing: 12) {
            Button {
                activeSheet = .index
            } label: {
                Label("ÍNDICE  \(units.count) ARTIGOS", systemImage: "list.bullet.indent")
                    .font(.caption.weight(.semibold))
            }
            .buttonStyle(.bordered)

            if layout == "foco" {
                Button { activeSheet = .map } label: {
                    Label("Mapa", systemImage: "point.3.connected.trianglepath.dotted")
                        .font(.caption.weight(.semibold))
                }
                .buttonStyle(.bordered)
                .help("Gera um mapa/esquema visual deste artigo — copiar ou exportar PNG")
            }

            let read = units.filter { record.readKeys.contains($0.key) }.count
            ProgressView(value: Double(read), total: Double(max(units.count, 1)))
                .tint(accent)
                .frame(width: 130)
            Text("\(read)/\(units.count)")
                .font(.caption.monospacedDigit())
                .foregroundStyle(.secondary)

            Spacer()

            Button {
                srsEnabled.toggle()
            } label: {
                Label("Revisão espaçada", systemImage: "brain.head.profile")
                    .font(.caption)
            }
            .buttonStyle(.bordered)
            .tint(srsEnabled ? .purple : nil)
            .help("Método de revisão espaçada (estilo Anki): quando ligado, o bloco de anotações abaixo do artigo ganha os botões Errei/Difícil/Bom/Fácil e o app agenda sozinho a próxima revisão.")

            Picker("", selection: $layout) {
                Image(systemName: "doc.text").tag("foco")
                Image(systemName: "square.grid.2x2").tag("cartoes")
            }
            .pickerStyle(.segmented)
            .frame(width: 96)
            .help("Foco: um artigo por vez. Cartões: todos em lista.")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(AppTheme.elevatedSurface)
    }

    // MARK: - Modo Foco (um artigo por vez)

    private var focusUnit: LawUnit? { units.first { $0.id == focusID } }
    private var focusPosition: Int { units.firstIndex { $0.id == focusID } ?? 0 }

    @ViewBuilder
    private var focusMode: some View {
        if let unit = focusUnit {
            let pos = focusPosition
            UnitFocusView(lawID: lawID, fullText: text, unit: unit, position: pos, total: units.count,
                          accent: accent, onOpenLaw: onOpenLaw,
                          onPrev: pos > 0 ? { goTo(units[pos - 1].id) } : nil,
                          onNext: pos < units.count - 1 ? { goTo(units[pos + 1].id) } : nil,
                          previousRedactions: historyByID[unit.id] ?? [],
                          onGoToArticle: { number in
                              if let u = units.first(where: { Self.articleNumberKey($0.label) == number }) { goTo(u.id) }
                          })
                // Identidade pela CHAVE, não pela posição: quando a lei muda e os
                // índices deslocam, a view (e a nota em @State) não pode sobreviver
                // apontando para outro artigo — gravaria a nota na chave errada.
                .id(unit.key)
        }
    }

    // `vigenteID` é o id (posição no doc) de um artigo vigente — não a posição no array.
    private func goTo(_ vigenteID: Int) {
        guard units.contains(where: { $0.id == vigenteID }) else { return }
        focusID = vigenteID
        store.setLastUnit(lawID, vigenteID)
    }

    // Colapsa redações: corridas de unidades consecutivas com o MESMO rótulo ("Art. 6º"
    // repetido) viram um só item — o ÚLTIMO da corrida (redação vigente, ordem cronológica
    // do Planalto). As anteriores ficam no histórico. `LawUnit.id` == índice no documento.
    struct CollapsedLaw {
        let units: [LawUnit]                 // só vigentes, em ordem do documento
        let historyByID: [Int: [LawUnit]]    // id do vigente → redações anteriores (antigas→novas)
        let snapToVigenteID: [Int: Int]      // qualquer id → id do vigente do grupo
    }
    static func collapseRedactions(_ all: [LawUnit]) -> CollapsedLaw {
        var vigentes: [LawUnit] = []
        var history: [Int: [LawUnit]] = [:]
        var snap: [Int: Int] = [:]
        var i = 0
        while i < all.count {
            var j = i
            let key = articleNumberKey(all[i].label)
            while j + 1 < all.count && articleNumberKey(all[j + 1].label) == key { j += 1 }
            let vigente = all[j]
            vigentes.append(vigente)
            for k in i...j { snap[all[k].id] = vigente.id }
            if j > i { history[vigente.id] = Array(all[i..<j]) }
            i = j + 1
        }
        return CollapsedLaw(units: vigentes, historyByID: history, snapToVigenteID: snap)
    }

    // Chave do NÚMERO do artigo, tolerante às variações do Planalto que fazem o
    // mesmo artigo repetido não casar por rótulo exato: "Art. 6º", "Art. 6",
    // "Art. 6 o" → "6"; "Art. 121-A" → "121-A"; "Art. 1.045" → "1.045". Sem isso,
    // uma redação antiga cujo ordinal o parser não capturou vira artigo à parte.
    static func articleNumberKey(_ label: String) -> String {
        var s = label.replacingOccurrences(of: "^Art(?:igo)?\\.?\\s*", with: "",
                                            options: [.regularExpression, .caseInsensitive])
        s = s.replacingOccurrences(of: "[ºo°]", with: "", options: .regularExpression)
        s = s.replacingOccurrences(of: "\\s+", with: "", options: .regularExpression)
        return s
    }

    // MARK: - Modo Cartões (lista)

    private var cardsMode: some View {
        VStack(spacing: 0) {
            HStack {
                TextField("Filtrar (ex.: Art. 5º, prescrição…)", text: $filter)
                    .textFieldStyle(.roundedBorder)
                    .frame(maxWidth: 300)
                Toggle(isOn: $onlyReview) {
                    Label("Só revisão", systemImage: "star")
                }
                .toggleStyle(.button)
                Spacer()
            }
            .padding(.horizontal, 16).padding(.vertical, 8)
            ScrollView {
                LazyVStack(spacing: 14) {
                    ForEach(visibleUnits) { unit in
                        UnitCard(lawID: lawID, unit: unit, accent: accent)
                    }
                }
                .padding(AppTheme.pageInset)
            }
            .background(AppTheme.pageBackground)
        }
    }

    private var visibleUnits: [LawUnit] {
        var result = units
        if onlyReview { result = result.filter { record.reviewKeys.contains($0.key) } }
        let q = filter.trimmingCharacters(in: .whitespaces)
        if !q.isEmpty {
            result = result.filter {
                $0.label.localizedCaseInsensitiveContains(q) ||
                $0.lines.contains { $0.localizedCaseInsensitiveContains(q) }
            }
        }
        return result
    }
}

// MARK: - Artigo em foco (layout da imagem)

private struct UnitFocusView: View {
    @EnvironmentObject var store: AppStore
    let lawID: UUID
    let fullText: String
    let unit: LawUnit
    let position: Int
    let total: Int
    let accent: Color
    var onOpenLaw: (UUID) -> Void = { _ in }
    let onPrev: (() -> Void)?
    let onNext: (() -> Void)?
    var previousRedactions: [LawUnit] = []   // redações antigas deste artigo (comparativo)
    var onGoToArticle: (String) -> Void = { _ in }  // pulo interno pelo índice remissivo

    @StateObject private var markController = ReaderController()
    @State private var showRedactions = false
    @State private var pendingRemovalRange: NSRange?
    @AppStorage("readerFontSize") private var fontSize = 16.0
    @AppStorage("readerFontFamily") private var fontFamily = "Sistema (Serifa)"
    @AppStorage("markerColorHex") private var markerColorHex = "#FFD60AFF"
    @AppStorage("srsEnabled") private var srsEnabled = false
    @AppStorage("cleanReading") private var cleanReading = false
    @State private var showAddPrecedent = false
    @State private var articleHeight: CGFloat = 300   // altura medida do artigo (Foco)
    @State private var commentAnchors: [ArticleCommentAnchor] = []  // balões alinhados ao texto
    @State private var editingComment: EditingComment?              // editor de comentário aberto
    private let commentColorHex = "#3B82F6FF"                       // azul: destaca trechos comentados

    private var record: StudyRecord { store.record(for: lawID) }
    private var isRead: Bool { record.readKeys.contains(unit.key) }
    private var isReview: Bool { record.reviewKeys.contains(unit.key) }
    private var articlePrecedents: [LawPrecedent] { store.precedents(for: lawID, matchingArticle: unit.label) }
    private var remissoes: [LegislativeNote] { LegislativeNote.parse(from: unit.lines) }
    private var remissions: [Remission] {
        RemissiveIndex.build(for: unit, currentLawID: lawID,
                             currentNumber: ArticleStudyView.articleNumberKey(unit.label),
                             laws: store.laws,
                             resolveNumbered: { type, num in store.findLaw(refType: type, refNumber: num) })
    }
    private var unitRange: NSRange { NSRange(location: unit.location, length: unit.length) }
    private var hasCard: Bool { store.srsHasCard(lawID, unitKey: unit.key) }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Controles pequenos ficam FIXOS no topo; o artigo (na altura natural) +
            // remissões + jurisprudência + bloco de anotações + navegação rolam juntos.
            if !cleanReading { markToolbar }
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    card
                    if !remissoes.isEmpty {
                        RemissoesView(notes: remissoes,
                                      resolve: { note in
                                          // Exclui a própria norma: uma nota que cita a
                                          // lei aberta (ex.: "Revogado pela Lei nº N" na
                                          // própria Lei N) não vira botão morto.
                                          guard let id = store.findLaw(refType: note.refType,
                                                                       refNumber: note.refNumber)?.id,
                                                id != lawID else { return nil }
                                          return id
                                      },
                                      onOpen: onOpenLaw)
                    }
                    if !remissions.isEmpty {
                        RemissiveIndexView(remissions: remissions, accent: accent,
                                           onSameArticle: onGoToArticle,
                                           onOpenLaw: { id, article in
                                               // Abre a outra norma DIRETO no artigo citado:
                                               // grava o artigo de destino antes de navegar.
                                               if let article, let uid = store.articleUnitID(lawID: id, number: article) {
                                                   store.setLastUnit(id, uid)
                                               }
                                               onOpenLaw(id)
                                           })
                    }
                    if !cleanReading || !articlePrecedents.isEmpty { inlineJuris }
                    // Bloco de anotações e estudo — ABAIXO do artigo (antes era painel lateral).
                    if cleanReading { cleanActionsBar } else { studyBlock }
                    navRow
                }
                .frame(maxWidth: hasComments ? 1040 : 820)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 18)
            }
        }
        // Coluna de leitura centralizada com largura confortável — em vez do
        // texto de ponta a ponta (linhas larguíssimas num monitor grande).
        // Alarga quando há comentários para abrir espaço à margem sem espremer o texto.
        .frame(maxWidth: hasComments ? 1080 : 856)
        .frame(maxWidth: .infinity)
        .padding(.horizontal, AppTheme.pageInset)
        .background(AppTheme.pageBackdrop(accent))
        .onAppear {
            // Registra o artigo em foco — o "onde parou" do registro de sessão no Cátedra.
            UserDefaults.standard.set(unit.label, forKey: "lastStudiedUnitLabel")
        }
        .onChange(of: unit.key) { _, _ in
            UserDefaults.standard.set(unit.label, forKey: "lastStudiedUnitLabel")
        }
        .sheet(isPresented: $showAddPrecedent) {
            PrecedentEditView(lawID: lawID, accent: accent, existing: nil, prefillArticle: unit.label)
        }
        .sheet(item: $editingComment) { ec in
            CommentEditorSheet(initial: ec.text,
                               isEditing: ec.annotationID != nil,
                               onSave: { text in var e = ec; e.text = text; saveComment(e) },
                               onDelete: ec.annotationID != nil ? { deleteComment(ec.annotationID!) } : nil,
                               onCancel: { editingComment = nil })
        }
        .sheet(isPresented: $showRedactions) {
            RedactionComparisonView(articleLabel: unit.label, entries: redactionEntries, accent: accent)
        }
        .confirmationDialog("A seleção contém marcações com anotações escritas. Apagar mesmo assim?",
                            isPresented: Binding(get: { pendingRemovalRange != nil },
                                                 set: { if !$0 { pendingRemovalRange = nil } }),
                            titleVisibility: .visible) {
            Button("Apagar marcações e anotações", role: .destructive) {
                if let range = pendingRemovalRange { store.removeAnnotations(lawID: lawID, overlapping: range) }
                pendingRemovalRange = nil
            }
            Button("Cancelar", role: .cancel) { pendingRemovalRange = nil }
        }
    }

    // Traduz uma seleção local (dentro do artigo) para offset global no texto da lei.
    private func globalRange(_ local: NSRange) -> NSRange {
        NSRange(location: unit.location + local.location, length: local.length)
    }

    private func handle(_ command: ReaderCommand) {
        guard let local = markController.selectedRange else { return }
        let global = globalRange(local)
        switch command {
        case .apply(let style):
            store.addAnnotation(lawID: lawID, range: global, in: fullText, style: style, colorHex: markerColorHex)
        case .annotate:
            store.addAnnotation(lawID: lawID, range: global, in: fullText, style: .highlight, colorHex: markerColorHex)
        case .removeInSelection:
            // Marcação com nota escrita: confirma antes (igual à Leitura corrida);
            // sem nota, remove direto. Usa o range capturado, não a seleção futura.
            let overlapping = store.annotationsOverlapping(lawID: lawID, range: global)
            if overlapping.contains(where: { !$0.note.isEmpty }) {
                pendingRemovalRange = global
            } else {
                store.removeAnnotations(lawID: lawID, overlapping: global)
            }
        }
    }

    // Abre o editor de comentário para o trecho selecionado — reaproveita um comentário
    // existente que já cobre a seleção, senão prepara um novo (a anotação nasce ao salvar).
    private func comment() {
        guard let local = markController.selectedRange, local.length > 0 else { return }
        let global = globalRange(local)
        if let existing = store.annotationsOverlapping(lawID: lawID, range: global).first(where: { !$0.note.isEmpty }) {
            editingComment = EditingComment(annotationID: existing.id, range: existing.range, text: existing.note)
        } else {
            editingComment = EditingComment(annotationID: nil, range: global, text: "")
        }
    }

    // Salva o comentário: atualiza a nota da anotação existente ou cria uma nova (grifo azul).
    private func saveComment(_ ec: EditingComment) {
        let text = ec.text.trimmingCharacters(in: .whitespacesAndNewlines)
        if let id = ec.annotationID {
            store.updateAnnotation(id) { $0.note = text }
        } else if !text.isEmpty {
            if let ann = store.addAnnotation(lawID: lawID, range: ec.range, in: fullText, style: .highlight, colorHex: commentColorHex) {
                store.updateAnnotation(ann.id) { $0.note = text }
            }
        }
        editingComment = nil
    }

    // Remove o comentário e o grifo do trecho — o balão desaparece.
    private func deleteComment(_ id: UUID) {
        store.removeAnnotation(id)
        editingComment = nil
    }

    // Aplica a melhor lacuna automática (número/prazo/valor) no artigo, evitando as já existentes.
    private func sugerirLacunaAutomatica() {
        let localText = (fullText as NSString).substring(with: unitRange)
        let usados = store.clozes(lawID: lawID)
            .map { NSRange(location: $0.location - unit.location, length: $0.length) }
        guard let r = Annotations.melhorLacuna(localText, evitando: usados) else { return }
        store.addAnnotation(lawID: lawID, range: globalRange(r), in: fullText, style: .cloze, colorHex: markerColorHex)
    }

    private func clozesDoArtigo() -> [TextAnnotation] {
        store.clozes(lawID: lawID).filter { NSIntersectionRange($0.range, unitRange).length > 0 }
    }

    private func copiarCloze() {
        let localText = (fullText as NSString).substring(with: unitRange)
        let locais = clozesDoArtigo().map {
            TextAnnotation(lawID: lawID, location: $0.location - unit.location, length: $0.length,
                          selectedText: $0.selectedText, style: .cloze, colorHex: $0.colorHex)
        }
        guard let cz = Annotations.clozeText(localText, locais, agrupado: false) else { return }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(cz, forType: .string)
    }

    private func removerClozesArtigo() {
        store.removeClozes(lawID: lawID, in: unitRange)
    }

    // Empurra balões que se sobreporiam para baixo, preservando a ordem por posição no
    // texto. Devolve as âncoras com o y já ajustado (o campo y é var).
    private func laidOutBalloons() -> [ArticleCommentAnchor] {
        var out: [ArticleCommentAnchor] = []
        var cursor: CGFloat = 0
        for a in commentAnchors.sorted(by: { $0.y < $1.y }) {
            var b = a
            b.y = max(a.y, cursor)
            out.append(b)
            cursor = b.y + 66   // altura mínima reservada por balão
        }
        return out
    }

    private var gerarCardMenu: some View {
        let n = clozesDoArtigo().count
        return Menu {
            Button { handle(.apply(.cloze)) } label: { Label("Transformar seleção em lacuna", systemImage: "rectangle.dashed.badge.record") }
                .disabled(markController.selectionLength == 0)
            Button { sugerirLacunaAutomatica() } label: { Label("Sugerir lacuna automática (o que mais cai)", systemImage: "wand.and.stars") }
            Button { copiarCloze() } label: { Label("Copiar card cloze (para o Anki)", systemImage: "doc.on.clipboard") }
                .disabled(n == 0)
            if n > 0 {
                Divider()
                Text("\(n) lacuna\(n == 1 ? "" : "s") neste artigo")
                Button(role: .destructive) { removerClozesArtigo() } label: { Label("Remover todas as lacunas", systemImage: "trash") }
            }
        } label: {
            Image(systemName: "rectangle.dashed.badge.record")
                .foregroundStyle(n > 0 ? Color.accentColor : .primary)
        }
        .menuStyle(.borderlessButton).menuIndicator(.hidden).fixedSize()
        .help("Gerar card: transformar a seleção em lacuna (cloze)")
    }

    // Barra de marcação: cor + grifar / sublinhar / tachar
    // NOTA: um ScrollView(.horizontal) aqui foi tentado para não cortar botões em
    // janelas estreitas, mas quebrou o clique em TODOS os botões da barra (o gesto
    // de rolagem do ScrollView engole o clique antes de chegar no Button/Menu, nesta
    // hospedagem via NSHostingView). Revertido — HStack simples, sem rolagem.
    private var markToolbar: some View {
        HStack(spacing: 10) {
            // Cor num menu com amostras favoritas + seletor livre (espelha o CátedraJURIS).
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
                Divider()
                ColorPicker("Escolher outra cor…", selection: Binding(
                    get: { Color(hexRGBA: markerColorHex) },
                    set: { markerColorHex = $0.hexRGBA }))
            } label: {
                Circle()
                    .fill(Color(hexRGBA: markerColorHex))
                    .frame(width: 15, height: 15)
                    .contentShape(Rectangle())
                    .overlay(Circle().strokeBorder(.secondary.opacity(0.4), lineWidth: 0.5))
            }
            .menuStyle(.borderlessButton)
            .menuIndicator(.hidden)
            .fixedSize()
            .help("Cor do marcador")

            // Swatches rápidas das cores favoritas (clique aplica a cor atual).
            ForEach(store.coresFavoritas.prefix(5), id: \.self) { hex in
                Button { markerColorHex = hex } label: {
                    Circle().fill(Color(hexRGBA: hex)).frame(width: 13, height: 13)
                        .overlay(Circle().strokeBorder(markerColorHex == hex ? Color.primary : .secondary.opacity(0.35),
                                                       lineWidth: markerColorHex == hex ? 1.5 : 0.5))
                }
                .buttonStyle(.plain)
                .help("Usar esta cor")
            }
            Rectangle().fill(AppTheme.hairline).frame(width: 1, height: 15).padding(.horizontal, 2)

            ForEach(AnnotationStyle.allCases.filter { $0 != .cloze }) { style in
                Button { handle(.apply(style)) } label: { Image(systemName: style.symbol) }
                    .help("\(style.label) o trecho selecionado")
                    .disabled(markController.selectionLength == 0)
            }
            Rectangle().fill(AppTheme.hairline).frame(width: 1, height: 15).padding(.horizontal, 2)
            Button { store.undoAnnotations() } label: { Image(systemName: "arrow.uturn.backward") }
                .help("Desfazer marcação").disabled(!store.canUndoAnnotations)
            Button { store.redoAnnotations() } label: { Image(systemName: "arrow.uturn.forward") }
                .help("Refazer marcação").disabled(!store.canRedoAnnotations)
            Rectangle().fill(AppTheme.hairline).frame(width: 1, height: 15).padding(.horizontal, 2)

            // Gerar card: lacuna (cloze) — espelha o CátedraJURIS.
            gerarCardMenu
            Rectangle().fill(AppTheme.hairline).frame(width: 1, height: 15).padding(.horizontal, 2)

            // Alinhamento do texto deste artigo (espelha o CátedraJURIS).
            Menu {
                Button { store.setAlinhamento("left", lawID: lawID, unitKey: unit.key) } label: { Label("À esquerda", systemImage: "text.alignleft") }
                Button { store.setAlinhamento("center", lawID: lawID, unitKey: unit.key) } label: { Label("Centralizado", systemImage: "text.aligncenter") }
                Button { store.setAlinhamento("right", lawID: lawID, unitKey: unit.key) } label: { Label("À direita", systemImage: "text.alignright") }
                Button { store.setAlinhamento("justify", lawID: lawID, unitKey: unit.key) } label: { Label("Justificado", systemImage: "text.justify") }
                Divider()
                Button { store.setAlinhamento("natural", lawID: lawID, unitKey: unit.key) } label: { Label("Usar padrão", systemImage: "arrow.uturn.backward") }
            } label: {
                Image(systemName: {
                    switch store.alinhamento(lawID: lawID, unitKey: unit.key) {
                    case "center": return "text.aligncenter"
                    case "right": return "text.alignright"
                    case "justify": return "text.justify"
                    default: return "text.alignleft"
                    }
                }())
            }
            .menuStyle(.borderlessButton).menuIndicator(.hidden).fixedSize()
            .help("Alinhamento do texto")
            Rectangle().fill(AppTheme.hairline).frame(width: 1, height: 15).padding(.horizontal, 2)
            Button { comment() } label: { Label("Comentar", systemImage: "text.bubble") }
                .help("Adicionar um comentário na margem para o trecho selecionado")
                .disabled(markController.selectionLength == 0)
            Text("selecione um trecho e grife")
                .font(.caption2).foregroundStyle(.tertiary)
                .opacity(markController.selectionLength == 0 ? 1 : 0)
            Spacer()
        }
        .controlSize(.small)
    }

    // Opção 2 do redesign ("mais ousado/colorido"): faixa de cor forte da matéria
    // no topo do cartão, número do artigo grande em branco.
    // Faixa vibrante da matéria (gradiente + título grande em branco + marca d'água
    // do símbolo da área) — a assinatura do design "Vibrante por matéria".
    private var header: some View {
        let symbol = store.laws.first { $0.id == lawID }?.category.symbol ?? "book"
        return MateriaBanner(context: unit.context, title: unit.label, color: accent, symbol: symbol)
    }

    // Cartão com o cabeçalho colorido acima do texto do artigo, com sombra —
    // troca a caixa neutra da v24 pela versão "ousada" que a usuária escolheu.
    //
    // IMPORTANTE: não envolver a VStack (que contém a MarkableArticleView, um
    // NSScrollView nativo) num .clipShape — combinado com .shadow, isso força o
    // SwiftUI a compor a subárvore inteira num grupo offscreen e QUEBRA o
    // roteamento de eventos de scroll-wheel/trackpad para a NSScrollView (o
    // teclado ainda funciona, por passar pela responder chain, não por hit-test
    // — foi assim que o bug foi isolado). O acabamento arredondado/sombra fica
    // só no fundo decorativo (.background), que não envolve o conteúdo.
    private var card: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            // GeometryReader dá a largura da coluna; a MarkableArticleView mede a
            // altura nessa largura e devolve por $articleHeight — o artigo é então
            // renderizado na altura completa (sem scroll interno) e a página inteira
            // rola no ScrollView de fora. (Sem NSScrollView aninhado, o clipShape do
            // cartão de vidro já não quebra a rolagem.)
            //
            // Quando há comentários, o texto divide a linha com a coluna de balões
            // na margem direita — cada balão alinhado verticalmente ao trecho (estilo
            // Google Docs). A MarkableArticleView reporta as posições por $commentAnchors.
            HStack(alignment: .top, spacing: 10) {
                GeometryReader { geo in
                    MarkableArticleView(fullText: fullText, unitRange: unitRange,
                                        annotations: store.annotations(for: lawID),
                                        fontFamily: fontFamily, fontSize: fontSize, accent: accent,
                                        textAlignment: store.alinhamentoNS(lawID: lawID, unitKey: unit.key),
                                        proposedWidth: geo.size.width,
                                        measuredHeight: $articleHeight,
                                        commentAnchors: $commentAnchors,
                                        controller: markController, onCommand: handle)
                }
                .frame(height: max(articleHeight, 40))
                if hasComments {
                    commentsMargin
                        .frame(width: 208, height: max(articleHeight, 40), alignment: .topLeading)
                        .padding(.trailing, 8)
                }
            }
            if redactionEntries.count > 1 { redactionsFooter }
        }
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: AppTheme.surfaceRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: AppTheme.surfaceRadius, style: .continuous)
                .strokeBorder(
                    LinearGradient(colors: [Color.primary.opacity(0.14), accent.opacity(0.4)],
                                   startPoint: .top, endPoint: .bottom),
                    lineWidth: 1)
        )
        .shadow(color: accent.opacity(0.28), radius: 20, y: 8)
    }

    // Linhas do comparativo: a vigente (o próprio artigo) + redações antigas
    // auto-detectadas (blocos repetidos no texto) + redações antigas/revogadas
    // CURADAS (RedactionSeed) — todas as anteriores tachadas.
    // Artigo cujo CAPUT é só o marcador "(Revogado…)" — não há texto vigente.
    // Olha só a 1ª linha (o caput): rubricas de seção às vezes vazam p/ o corpo
    // do artigo revogado (ex.: "Ação penal" cola no fim do art. 224).
    private var currentRevoked: Bool {
        guard let first = unit.lines.first?.lowercased(), first.contains("revogad") else { return false }
        let noParen = first.replacingOccurrences(of: "\\([^)]*\\)", with: "", options: .regularExpression)
        let noLabel = noParen.replacingOccurrences(of: "^art[\\s.]*\\d[\\d.]*[ºo°]?[\\s.·–—-]*", with: "", options: .regularExpression)
        return noLabel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private var redactionEntries: [RedactionComparisonView.Entry] {
        var out: [RedactionComparisonView.Entry] = []
        out.append(.init(source: currentRevoked ? "Redação atual\n(revogado)" : RedactionComparisonView.source(for: unit),
                         status: currentRevoked ? .atualRevogado : .vigente, lines: unit.lines))
        for u in previousRedactions.reversed() {
            out.append(.init(source: RedactionComparisonView.source(for: u), status: .anterior, lines: u.lines))
        }
        if let law = store.laws.first(where: { $0.id == lawID }) {
            let num = ArticleStudyView.articleNumberKey(unit.label)
            for s in RedactionSeed.history(for: law, article: num).reversed() {
                let src = s.date.map { "\(s.sourceLabel)\n· em vigor \($0)" } ?? s.sourceLabel
                out.append(.init(source: src, status: .anterior, lines: s.lines))
            }
        }
        return out
    }

    // Rodapé do cartão: só o VIGENTE é mostrado no Estudo; este botão abre o
    // comparativo com as redações anteriores do mesmo artigo.
    private var redactionsFooter: some View {
        let n = redactionEntries.count - 1
        return Button { showRedactions = true } label: {
            HStack(spacing: 7) {
                Image(systemName: "clock.arrow.circlepath")
                Text("\(n) \(n == 1 ? "redação anterior" : "redações anteriores") · ver comparativo")
                Spacer()
                Image(systemName: "chevron.right").font(.caption2)
            }
            .font(.caption.weight(.medium))
            .foregroundStyle(accent)
            .padding(.horizontal, 16).padding(.vertical, 10)
            .overlay(Rectangle().fill(AppTheme.hairline).frame(height: 1), alignment: .top)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .help("Comparar a redação vigente com as versões anteriores deste artigo")
    }

    private var hasComments: Bool { !commentAnchors.isEmpty }

    // Coluna de balões na margem: cada um posicionado no y do seu trecho (com anti-colisão).
    private var commentsMargin: some View {
        ZStack(alignment: .topLeading) {
            Color.clear
            ForEach(laidOutBalloons()) { item in
                CommentBalloon(note: item.note,
                               color: Color(hexRGBA: item.colorHex),
                               onTap: {
                                   editingComment = EditingComment(annotationID: item.id,
                                                                   range: NSRange(location: 0, length: 0),
                                                                   text: item.note)
                               })
                    .frame(width: 208, alignment: .topLeading)
                    .offset(y: item.y)
            }
        }
    }

    // Itens do menu de criação de flashcard — compartilhados pela barra compacta e
    // pelo painel de nota. Um cartão testa UM fato (regras do Wozniak): lacuna num
    // trecho, certo/errado, ou pergunta direta — nunca o artigo inteiro.
    @ViewBuilder
    private var flashcardMenuItems: some View {
        Button { store.srsAddCard(lawID, unit: unit) } label: {
            Label("Automático (melhor lacuna)", systemImage: "wand.and.stars")
        }
        Divider()
        ForEach(FlashcardStyle.allCases) { style in
            Button { store.srsAddCard(lawID, unit: unit, style: style) } label: {
                Label(style.label, systemImage: style.symbol)
            }
        }
    }

    // Modo Leitura limpa esconde o notePanel — mas sem ele o progresso por artigo
    // (Marcar como lido) e o flashcard ficariam inacessíveis. Barra compacta.
    private var cleanActionsBar: some View {
        HStack(spacing: 8) {
            let hasCard = store.srsHasCard(lawID, unitKey: unit.key)
            Menu {
                flashcardMenuItems
            } label: {
                Image(systemName: hasCard ? "rectangle.on.rectangle.angled.fill" : "rectangle.stack.badge.plus")
            }
            .menuStyle(.borderlessButton)
            .menuIndicator(.hidden)
            .fixedSize()
            .tint(hasCard ? .purple : nil)
            .disabled(hasCard)
            .help(hasCard ? "Já está no baralho de flashcards" : "Criar flashcard deste artigo")
            Spacer()
            Button {
                let wasRead = isRead
                store.toggleRead(lawID, unitKey: unit.key)
                if !wasRead { onNext?() }
            } label: {
                Label(isRead ? "Lido ✓" : "Marcar como lido",
                      systemImage: isRead ? "checkmark.circle.fill" : "circle")
            }
            .buttonStyle(.borderedProminent)
            .tint(isRead ? .green : accent)
        }
        .controlSize(.small)
    }

    private var navRow: some View {
        HStack {
            // ⌥⌘ e não ⌘ puro: ⌘←/⌘→ são atalhos de edição do macOS (início/fim da
            // linha) e seriam roubados de quem digita no painel de anotação.
            Button { onPrev?() } label: { Label("Anterior", systemImage: "chevron.left") }
                .buttonStyle(.bordered)
                .disabled(onPrev == nil)
                .keyboardShortcut(.leftArrow, modifiers: [.command, .option])
                .help("Artigo anterior (⌥⌘←)")
            Spacer()
            Text("Artigo \(position + 1) de \(total)")
                .font(.callout)
                .foregroundStyle(.secondary)
            Spacer()
            Button { onNext?() } label: { Label("Próximo", systemImage: "chevron.right") }
                .buttonStyle(.borderedProminent)
                .tint(accent)
                .disabled(onNext == nil)
                .keyboardShortcut(.rightArrow, modifiers: [.command, .option])
                .help("Próximo artigo (⌥⌘→)")
        }
    }

    // Bloco de revisão espaçada (só quando o método está ligado).
    private var srsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Revisão espaçada", systemImage: "brain.head.profile")
                .font(.headline).foregroundStyle(.purple)
            if let card = store.srsCard(lawID, unit.key) {
                Text(srsStatus(card))
                    .font(.caption).foregroundStyle(.secondary)
            } else {
                Text("Fora do baralho — responda abaixo para começar a revisar este artigo.")
                    .font(.caption).foregroundStyle(.secondary)
            }
            HStack(spacing: 6) {
                ForEach(SRSGrade.allCases) { grade in
                    Button {
                        store.srsGrade(lawID, unitKey: unit.key, grade: grade)
                    } label: {
                        VStack(spacing: 1) {
                            Text(grade.label).font(.caption2.weight(.semibold))
                            Text(SpacedRepetition.intervalLabel(store.srsPreview(lawID, unit.key, grade)))
                                .font(.system(size: 9).monospacedDigit()).foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 4)
                    }
                    .buttonStyle(.bordered)
                    .tint(grade.color)
                }
            }
            if store.srsCard(lawID, unit.key) != nil {
                Button("Remover da revisão") {
                    store.srsRemove(lawID, unitKey: unit.key)
                }
                .font(.caption2)
                .buttonStyle(.borderless)
            }
        }
    }

    private func srsStatus(_ card: SRSCard) -> String {
        // Mesmo calendário fixo do Store (não Calendar.current): o rótulo bate com
        // srsIsDue/srsDueCount mesmo se o fuso do Mac diferir do de Brasília.
        let days = store.srsDaysUntilDue(card)
        if days <= 0 { return "Vencida — para revisar hoje." }
        let date = card.due.formatted(date: .abbreviated, time: .omitted)
        return "Próxima revisão em \(days) dia\(days > 1 ? "s" : "") (\(date))."
    }


    // Jurisprudência vinculada a ESTE artigo (casa pelo "artigo relacionado").
    private var inlineJuris: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Label("Jurisprudência deste artigo", systemImage: "text.book.closed")
                    .font(.caption.weight(.semibold)).foregroundStyle(.secondary)
                Spacer()
                if !cleanReading {
                    Button { showAddPrecedent = true } label: { Label("Vincular", systemImage: "plus") }
                        .font(.caption).buttonStyle(.borderless)
                }
            }
            ForEach(articlePrecedents) { precedent in
                HStack(alignment: .top, spacing: 8) {
                    Text(precedent.kind)
                        .font(.caption2.weight(.bold))
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(Capsule().fill(PrecedentKind.color(precedent.kind).opacity(0.16)))
                        .foregroundStyle(PrecedentKind.color(precedent.kind))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(precedent.displayTitle).font(.caption.weight(.semibold))
                        if !precedent.summary.isEmpty {
                            Text(precedent.summary).font(.caption).foregroundStyle(.secondary)
                                .lineLimit(3).textSelection(.enabled)
                        }
                    }
                    Spacer()
                    if let url = URL(string: precedent.url), !precedent.url.isEmpty {
                        Button { NSWorkspace.shared.open(url) } label: { Image(systemName: "safari") }
                            .buttonStyle(.borderless)
                    }
                }
            }
            if articlePrecedents.isEmpty && !cleanReading {
                Text("Vincule uma súmula, tese ou decisão a este artigo pelo botão “Vincular”.")
                    .font(.caption2).foregroundStyle(.tertiary)
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .appSurface()
    }

    // Bloco de anotações e estudo — logo ABAIXO do artigo (antes era painel lateral).
    private var studyBlock: some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack(spacing: 8) {
                Image(systemName: "square.and.pencil").font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(accent)
                Text("Anotações e estudo").font(.system(size: 15, weight: .bold)).foregroundStyle(AppTheme.ink)
                Spacer()
                if isRead {
                    Label("Lido", systemImage: "checkmark.circle.fill")
                        .font(.system(size: 11, weight: .medium)).foregroundStyle(Color(hex: 0x16A34A))
                }
                if isReview {
                    Label("Na revisão", systemImage: "star.fill")
                        .font(.system(size: 11, weight: .medium)).foregroundStyle(Color(hex: 0xEA580C))
                }
            }
            noteEditor
            studyActions
            if srsEnabled {
                Divider().padding(.vertical, 1)
                srsSection
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: AppTheme.surfaceRadius, style: .continuous).fill(AppTheme.cardBackground))
        .overlay(RoundedRectangle(cornerRadius: AppTheme.surfaceRadius, style: .continuous).strokeBorder(AppTheme.hairline, lineWidth: 1))
    }

    private var noteEditor: some View {
        RichNoteEditor(
            initialRTF: store.unitRichNote(lawID, unitKey: unit.key) ?? Self.rtfFromPlain(record.notes[unit.key]),
            placeholder: "Anote pontos de atenção, mnemônicos e pegadinhas sobre este artigo…",
            onChange: { rtf, plain in
                store.setUnitRichNote(lawID, unitKey: unit.key, rtf: rtf, plain: plain)
            },
            minHeight: 150
        )
        .id(unit.key)   // recria o editor ao trocar de artigo (carrega a anotação certa)
    }

    // Migra uma anotação antiga (texto puro) para RTF na primeira abertura.
    private static func rtfFromPlain(_ s: String?) -> Data? {
        guard let s = s, !s.isEmpty else { return nil }
        let attr = NSAttributedString(string: s, attributes: [
            .font: NSFont.systemFont(ofSize: 13.5), .foregroundColor: NSColor.labelColor])
        return attr.rtf(from: NSRange(location: 0, length: attr.length), documentAttributes: [:])
    }

    private var studyActions: some View {
        let dom = store.mastery(lawID: lawID, unitKey: unit.key)
        return HStack(spacing: 10) {
            Menu { flashcardMenuItems } label: {
                Label(hasCard ? "No baralho" : "Criar flashcard",
                      systemImage: hasCard ? "rectangle.on.rectangle.angled.fill" : "rectangle.stack.badge.plus")
            }
            .menuStyle(.button)
            .fixedSize()
            .tint(hasCard ? .purple : nil)
            .disabled(hasCard)
            .help("Gera um flashcard (lacuna, certo/errado ou pergunta direta) deste artigo")

            // Domínio do artigo (dominado/dúvida/difícil) — espelha os "dominados" do JURIS.
            Menu {
                Button { store.setMastery(dom == "dominado" ? nil : "dominado", lawID: lawID, unitKey: unit.key) } label: {
                    Label("Dominado", systemImage: dom == "dominado" ? "checkmark.circle.fill" : "checkmark.circle")
                }
                Button { store.setMastery(dom == "duvida" ? nil : "duvida", lawID: lawID, unitKey: unit.key) } label: {
                    Label("Em dúvida", systemImage: dom == "duvida" ? "questionmark.circle.fill" : "questionmark.circle")
                }
                Button { store.setMastery(dom == "dificil" ? nil : "dificil", lawID: lawID, unitKey: unit.key) } label: {
                    Label("Difícil", systemImage: dom == "dificil" ? "exclamationmark.triangle.fill" : "exclamationmark.triangle")
                }
                if dom != nil { Divider(); Button("Limpar", role: .destructive) { store.setMastery(nil, lawID: lawID, unitKey: unit.key) } }
            } label: {
                Label(dom == "dominado" ? "Dominado" : dom == "duvida" ? "Em dúvida" : dom == "dificil" ? "Difícil" : "Domínio",
                      systemImage: dom == "dominado" ? "brain.head.profile" : dom == "duvida" ? "questionmark.circle" : dom == "dificil" ? "exclamationmark.triangle" : "brain")
            }
            .menuStyle(.button).fixedSize()
            .tint(dom == "dominado" ? .green : dom == "duvida" ? .orange : dom == "dificil" ? .red : nil)
            .help("Marcar seu domínio deste artigo")

            Spacer(minLength: 8)

            Button { store.toggleReview(lawID, unitKey: unit.key) } label: {
                Label(isReview ? "Na revisão" : "Marcar para revisar",
                      systemImage: isReview ? "star.fill" : "star")
            }
            .buttonStyle(.bordered)
            .tint(isReview ? .orange : nil)

            Button {
                let wasRead = isRead // captura ANTES de alternar (isRead é computado ao vivo)
                store.toggleRead(lawID, unitKey: unit.key)
                if !wasRead { onNext?() } // ao marcar como lido, avança para o próximo
            } label: {
                Label(isRead ? "Lido ✓" : "Marcar como lido",
                      systemImage: isRead ? "checkmark.circle.fill" : "circle")
            }
            .buttonStyle(.borderedProminent)
            .tint(isRead ? .green : accent)
        }
    }
}

// MARK: - Índice (sheet)

private struct IndexSheet: View {
    @EnvironmentObject var store: AppStore
    @Environment(\.dismiss) private var dismiss
    let lawID: UUID
    let units: [LawUnit]
    let accent: Color
    let currentID: Int             // id (LawUnit.id) do artigo em foco
    let onSelect: (Int) -> Void    // recebe o id do artigo escolhido

    @State private var query = ""

    private var record: StudyRecord { store.record(for: lawID) }
    private var filtered: [LawUnit] {
        guard !query.isEmpty else { return units }
        return units.filter { $0.label.localizedCaseInsensitiveContains(query) ||
            $0.lines.contains { $0.localizedCaseInsensitiveContains(query) } }
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Índice — \(units.count) itens").font(.headline)
                Spacer()
                Button("Fechar") { dismiss() }
            }
            .padding()
            TextField("Buscar artigo…", text: $query)
                .textFieldStyle(.roundedBorder)
                .padding(.horizontal)
            ScrollViewReader { proxy in
                List(filtered, id: \.id) { unit in
                    Button {
                        onSelect(unit.id)
                    } label: {
                        HStack(spacing: 8) {
                            if record.readKeys.contains(unit.key) {
                                Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                            } else {
                                Image(systemName: "circle").foregroundStyle(.tertiary)
                            }
                            Text(unit.label).fontWeight(.medium)
                            if record.reviewKeys.contains(unit.key) {
                                Image(systemName: "star.fill").font(.caption2).foregroundStyle(.orange)
                            }
                            Spacer()
                            if let context = unit.context {
                                Text(context).font(.caption2).foregroundStyle(.tertiary).lineLimit(1)
                            }
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .listRowBackground(unit.id == currentID ? accent.opacity(0.12) : Color.clear)
                }
                .onAppear {
                    // Em leis grandes (Código Civil, CLT…) reabrir o índice sempre no
                    // topo obrigava rolar manualmente até o artigo já aberto.
                    proxy.scrollTo(currentID, anchor: .center)
                }
            }
        }
        .frame(width: 460, height: 560)
    }
}

// MARK: - Renderização compartilhada de uma linha classificada

struct UnitLine: View {
    let kind: LawLineKind
    let accent: Color
    var fontSize: Double = 15

    var body: some View {
        switch kind {
        case .caput(let text):
            body(text)
        case .inciso(let numeral, let text):
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(numeral)
                    .font(.system(size: fontSize - 1, weight: .bold, design: .default))
                    .foregroundStyle(accent)
                    .frame(minWidth: 28, alignment: .trailing)
                body(text)
            }
            .padding(.vertical, 6)
            .padding(.horizontal, 10)
            .background(RoundedRectangle(cornerRadius: AppTheme.compactRadius, style: .continuous).fill(accent.opacity(0.10)))
        case .paragrafo(let label, let text):
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(label)
                    .font(.system(size: fontSize - 1, weight: .bold))
                    .foregroundStyle(.purple)
                body(text)
            }
        case .alinea(let letter, let text):
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text("\(letter))")
                    .font(.system(size: fontSize - 1, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .frame(minWidth: 28, alignment: .trailing)
                body(text)
            }
            .padding(.leading, 28)
        case .plain(let text):
            body(text).foregroundStyle(.secondary)
        }
    }

    private func body(_ text: String) -> some View {
        Text(text)
            .font(.system(size: fontSize, design: .default))
            .lineSpacing(6)
            .textSelection(.enabled)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Cartão de unidade (modo Cartões)

private struct UnitCard: View {
    @EnvironmentObject var store: AppStore
    let lawID: UUID
    let unit: LawUnit
    let accent: Color

    @State private var note = ""
    @State private var noteLoaded = false
    @State private var showNote = false
    @AppStorage("readerFontSize") private var fontSize = 16.0

    private var record: StudyRecord { store.record(for: lawID) }
    private var isRead: Bool { record.readKeys.contains(unit.key) }
    private var isReview: Bool { record.reviewKeys.contains(unit.key) }
    private var remissoes: [LegislativeNote] { LegislativeNote.parse(from: unit.lines) }
    private var borderColor: Color {
        if isReview { return .orange }
        if isRead { return .green }
        return accent.opacity(0.5)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(unit.label)
                    .font(.system(.callout, design: .rounded).weight(.bold))
                    .padding(.horizontal, 10).padding(.vertical, 4)
                    .background(RoundedRectangle(cornerRadius: AppTheme.compactRadius, style: .continuous).fill(accent.opacity(0.12)))
                    .foregroundStyle(accent)
                if let context = unit.context {
                    Text(context).font(.caption).foregroundStyle(.tertiary).lineLimit(1)
                }
                Spacer()
                if isRead { Label("Lido", systemImage: "checkmark.circle.fill").font(.caption).foregroundStyle(.green) }
            }
            VStack(alignment: .leading, spacing: 7) {
                ForEach(Array(LawParser.classify(unit).enumerated()), id: \.offset) { _, kind in
                    UnitLine(kind: kind, accent: accent, fontSize: fontSize)
                }
            }
            if !remissoes.isEmpty { RemissoesView(notes: remissoes) }
            if showNote {
                TextField("Anote pontos de atenção sobre este artigo…", text: $note, axis: .vertical)
                    .textFieldStyle(.plain).lineLimit(1...6).padding(8)
                    .background(RoundedRectangle(cornerRadius: AppTheme.compactRadius).fill(.yellow.opacity(0.10)))
                    .onChange(of: note) { _, v in if noteLoaded { store.setUnitNote(lawID, unitKey: unit.key, note: v) } }
            }
            HStack(spacing: 10) {
                Button { store.toggleRead(lawID, unitKey: unit.key) } label: {
                    Label(isRead ? "Lido ✓" : "Marcar como lido", systemImage: isRead ? "checkmark.circle.fill" : "circle")
                }.buttonStyle(.bordered).tint(isRead ? .green : nil)
                Button { store.toggleReview(lawID, unitKey: unit.key) } label: {
                    Label(isReview ? "Na revisão" : "Revisar", systemImage: isReview ? "star.fill" : "star")
                }.buttonStyle(.bordered).tint(isReview ? .orange : nil)
                Button { showNote.toggle() } label: { Label("Anotar", systemImage: "square.and.pencil") }
                    .buttonStyle(.borderless)
                Spacer()
            }
            .controlSize(.small)
        }
        .padding(14)
        .appSurface(accent: borderColor)
        .overlay(alignment: .leading) {
            UnevenRoundedRectangle(topLeadingRadius: AppTheme.surfaceRadius, bottomLeadingRadius: AppTheme.surfaceRadius)
                .fill(borderColor).frame(width: 4)
        }
        // O cartão é reciclado pela LazyVStack entre unidades: recarrega a nota
        // quando a chave muda. Uma vez visível, o campo não some no meio da
        // edição quando a usuária apaga todo o texto (antes a condição dependia
        // da nota salva ser não-vazia).
        .onAppear { loadNote() }
        .onChange(of: unit.key) { _, _ in loadNote() }
    }

    private func loadNote() {
        noteLoaded = false
        note = record.notes[unit.key] ?? ""
        showNote = showNote || !note.isEmpty
        noteLoaded = true
    }
}
