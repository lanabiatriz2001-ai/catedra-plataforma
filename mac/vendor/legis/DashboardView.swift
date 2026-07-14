import SwiftUI

/// Painel inicial: visão geral da biblioteca, últimas alterações e anotações recentes.
struct DashboardView: View {
    @EnvironmentObject var store: AppStore
    let openLaw: (UUID) -> Void
    let openSection: (SidebarItem) -> Void
    let openUpdates: () -> Void
    let newCategory: () -> Void

    @AppStorage("lastStudiedLawID") private var lastStudiedLawID = ""
    @AppStorage("srsEnabled") private var srsEnabled = false
    @AppStorage("appearance") private var appearance = "dark"   // "system" | "light" | "dark"
    // Um único .sheet(item:) — empilhar vários .sheet(isPresented:) no mesmo view
    // faz o SwiftUI (macOS) confundir qual apresentar/dispensar, e uma folha
    // acabava "sequestrando" a outra (ex.: apagar um flashcard abria a revisão).
    @State private var activeSheet: DashSheet?

    private enum DashSheet: Int, Identifiable {
        case review, ankiExport, flashManager
        var id: Int { rawValue }
    }

    private var lawCount: Int { store.laws.filter(\.isRegularLaw).count }
    private var novidadesCount: Int { store.laws.filter(\.isNovidades).count }
    private var monitoredCount: Int { store.laws.filter { $0.monitored && $0.sourceURL != nil }.count }
    private func categoryCount(_ c: LawCategory) -> Int {
        store.laws.filter { $0.isRegularLaw && $0.customCategory == nil && $0.category == c }.count
    }
    private func customCategoryCount(_ name: String) -> Int {
        store.laws.filter { $0.isRegularLaw && $0.customCategory == name }.count
    }

    // Atalhos de seção — monocromáticos no acento do Cátedra.
    private var sections: [(String, String, Color, SidebarItem)] {
        let a = ThemeState.t.accent
        return [("Todas as normas", "books.vertical.fill", a, .all),
         ("Favoritos", "star.fill", a, .favorites),
         ("Assuntos", "tag.fill", a, .subjects),
         ("Buscar em tudo", "sparkle.magnifyingglass", a, .globalSearch),
         ("Novidades 2026", "sparkles", a, .novidades),
         ("Diário Oficial", "newspaper.fill", a, .dou),
         ("Atualizações", "bell.badge.fill", a, .updates)]
    }

    private func sectionBadge(_ item: SidebarItem) -> Int? {
        switch item {
        case .all: return lawCount
        case .favorites: let n = store.favoriteCount; return n > 0 ? n : nil
        case .novidades: return novidadesCount
        case .dou: let n = store.douItems.count; return n > 0 ? n : nil
        case .updates: let n = store.unreadCount; return n > 0 ? n : nil
        default: return nil
        }
    }

    @ViewBuilder
    private func navCard(_ title: String, _ symbol: String, _ color: Color, _ item: SidebarItem) -> some View {
        Button { openSection(item) } label: {
            HStack(spacing: 10) {
                IconBubble(symbol: symbol, color: color, size: 32)
                Text(title).font(.callout.weight(.medium)).foregroundStyle(.primary).lineLimit(1)
                Spacer(minLength: 4)
                if let b = sectionBadge(item) {
                    Text("\(b)").font(.caption2.weight(.semibold).monospacedDigit())
                        .foregroundStyle(.secondary)
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .appSurface()
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func materiaCard(_ title: String, _ symbol: String, _ color: Color, count: Int, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 10) {
                IconBubble(symbol: symbol, color: color, size: 32)
                VStack(alignment: .leading, spacing: 1) {
                    Text(title).font(.callout.weight(.medium)).foregroundStyle(.primary).lineLimit(1)
                    Text("\(count) norma\(count == 1 ? "" : "s")").font(.caption2).foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .appTintedSurface(color)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    /// Norma do "Continuar estudando" (a última aberta no modo Estudo, se ainda existir).
    private var lastStudied: LawEntry? {
        guard let uuid = UUID(uuidString: lastStudiedLawID) else { return nil }
        return store.laws.first { $0.id == uuid }
    }

    private func statChip(symbol: String, color: Color, label: String, value: Int) -> some View {
        VStack(spacing: 4) {
            Image(systemName: symbol).font(.title3).foregroundStyle(color)
            Text("\(value)").font(.title3.weight(.semibold).monospacedDigit())
            Text(label).font(.caption2).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 4)
    }

    // Tempo de estudo somado por norma (do cronômetro do leitor). Só normas com ≥ 30s.
    private var tempoEntries: [(law: LawEntry, secs: Double)] {
        store.studySecondsByLaw.compactMap { key, secs in
            guard secs >= 30, let uuid = UUID(uuidString: key),
                  let law = store.laws.first(where: { $0.id == uuid }) else { return nil }
            return (law, secs)
        }
        .sorted { $0.secs > $1.secs }
    }

    private static func fmtDur(_ secs: Double) -> String {
        let m = Int(secs) / 60
        if m < 60 { return "\(max(1, m))min" }
        let h = m / 60, rem = m % 60
        return rem == 0 ? "\(h)h" : "\(h)h \(rem)min"
    }

    @ViewBuilder private var tempoPorNormaSection: some View {
        let entries = tempoEntries
        let maxSecs = entries.first?.secs ?? 1
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                SectionTitle(title: "Tempo de estudo por norma", symbol: "hourglass", color: ThemeState.t.accent)
                Spacer()
                if !entries.isEmpty {
                    Text("total \(Self.fmtDur(store.totalStudySeconds))")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            if entries.isEmpty {
                Text("Leia uma norma no leitor (o cronômetro corre dentro da norma) para começar a somar o tempo aqui.")
                    .font(.caption).foregroundStyle(.secondary)
            } else {
                VStack(spacing: 9) {
                    ForEach(entries.prefix(8), id: \.law.id) { entry in
                        Button { openLaw(entry.law.id) } label: { normaTimeRow(entry.law, entry.secs, maxSecs) }
                            .buttonStyle(.plain)
                    }
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .appSurface()
    }

    private func normaTimeRow(_ law: LawEntry, _ secs: Double, _ maxSecs: Double) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(spacing: 8) {
                Text(law.title).font(.system(size: 12.5, weight: .medium))
                    .foregroundStyle(AppTheme.ink).lineLimit(1)
                Spacer(minLength: 8)
                Text(Self.fmtDur(secs)).font(.system(size: 12, weight: .semibold).monospacedDigit())
                    .foregroundStyle(ThemeState.t.accent)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(ThemeState.t.accent.opacity(0.12)).frame(height: 6)
                    Capsule().fill(ThemeState.t.accent)
                        .frame(width: max(6, geo.size.width * CGFloat(secs / max(maxSecs, 1))), height: 6)
                }
            }
            .frame(height: 6)
        }
        .contentShape(Rectangle())
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // HERO — faixa no acento do Cátedra (como o card "Bom dia" do Cátedra).
                HStack(alignment: .top, spacing: 16) {
                    VStack(alignment: .leading, spacing: 6) {
                        let dateText = Date().formatted(date: .complete, time: .omitted)
                        Text((dateText.prefix(1).localizedUppercase + dateText.dropFirst()).uppercased())
                            .font(.caption.weight(.semibold)).tracking(0.7)
                            .foregroundStyle(.white.opacity(0.72))
                            .lineLimit(1).minimumScaleFactor(0.7)
                        Text("CátedraLEGIS")
                            .font(.system(size: 34, weight: .bold))
                            .foregroundStyle(.white)
                            .lineLimit(1).minimumScaleFactor(0.6)
                        Text("\(lawCount) normas · \(store.annotations.count) marcações na sua biblioteca")
                            .font(.callout)
                            .foregroundStyle(.white.opacity(0.85))
                            .lineLimit(1).minimumScaleFactor(0.8)
                    }
                    Spacer(minLength: 8)
                }
                .padding(22)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: AppTheme.surfaceRadius, style: .continuous)
                        .fill(LinearGradient(colors: ThemeState.t.heroStops,
                                             startPoint: .topLeading, endPoint: .bottomTrailing))
                )

                // Continuar de onde parou
                if let law = lastStudied {
                    let record = store.record(for: law.id)
                    Button {
                        openLaw(law.id)
                    } label: {
                        HStack(spacing: 12) {
                            IconBubble(symbol: "book.pages", color: ThemeState.t.accent, size: 38)
                            VStack(alignment: .leading, spacing: 3) {
                                Text("Continuar estudando")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(ThemeState.t.accent)
                                    .textCase(.uppercase)
                                Text(law.title)
                                    .font(.headline)
                                    .foregroundStyle(.primary)
                                if record.unitTotal > 0 {
                                    Text("Artigo \(min(record.lastUnitID + 1, record.unitTotal)) de \(record.unitTotal) · \(record.readKeys.count) lidos")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundStyle(.tertiary)
                        }
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .appTintedSurface(ThemeState.t.accent)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }

                // Revisão espaçada do dia (só quando o método está ligado)
                if srsEnabled {
                    Button {
                        activeSheet = .review
                    } label: {
                        let due = store.srsDueCount()
                        HStack(spacing: 12) {
                            IconBubble(symbol: "brain.head.profile", color: ThemeState.t.accent, size: 38)
                            VStack(alignment: .leading, spacing: 3) {
                                Text("Revisão espaçada")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(ThemeState.t.accent)
                                    .textCase(.uppercase)
                                Text(due > 0 ? "\(due) artigo\(due > 1 ? "s" : "") para revisar hoje" : "Você está em dia!")
                                    .font(.headline).foregroundStyle(.primary)
                                Text("\(store.srsDeckCount) artigo\(store.srsDeckCount == 1 ? "" : "s") no baralho")
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            if due > 0 {
                                Text("Revisar")
                                    .font(.callout.weight(.semibold))
                                    .padding(.horizontal, 14).padding(.vertical, 7)
                                    .background(Capsule().fill(ThemeState.t.accent))
                                    .foregroundStyle(.white)
                            } else {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.title2).foregroundStyle(.green)
                            }
                        }
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .appTintedSurface(ThemeState.t.accent)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }

                // Metas do dia (leitura + revisão) e previsão de vencimentos
                DailyGoalsCard()

                // Checklist de leitura — mini app de tarefas na Início (captura rápida)
                ChecklistMiniCard(openChecklist: { openSection(.checklist) })

                // (Navegar / Por matéria migraram para a barra lateral, como no Cátedra.)

                // Estudo
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    StatCard(title: "Artigos lidos", value: "\(store.totalReadUnits)",
                             symbol: "book", color: ThemeState.t.accent)
                    StatCard(title: "Marcados p/ revisão", value: "\(store.totalReviewUnits)",
                             symbol: "star", color: ThemeState.t.accent)
                    StatCard(title: "Sequência atual", value: "\(store.currentStreak)d",
                             symbol: "flame", color: ThemeState.t.accent,
                             detail: "dias seguidos estudando")
                    StatCard(title: "Dias ativos", value: "\(store.activeDaysLastYear)",
                             symbol: "calendar", color: ThemeState.t.accent,
                             detail: "últimos 365 dias")
                }

                // Tempo de estudo por norma (alimentado pelo cronômetro do leitor)
                tempoPorNormaSection

                // Painel de revisão: flashcards
                if store.srsDeckCount > 0 {
                    VStack(alignment: .leading, spacing: 10) {
                        SectionTitle(title: "Painel de revisão", symbol: "brain.head.profile", color: ThemeState.t.accent)
                        HStack(spacing: 10) {
                            statChip(symbol: "rectangle.stack.badge.plus", color: ThemeState.t.accent,
                                     label: "Flashcards", value: store.srsDeckCount)
                            Divider()
                            statChip(symbol: "checklist", color: ThemeState.t.accent,
                                     label: "Revisar hoje", value: store.srsDueCount())
                        }
                        Divider().padding(.vertical, 2)
                        HStack(spacing: 8) {
                            Button { activeSheet = .flashManager } label: {
                                Label("Gerenciar", systemImage: "rectangle.stack.badge.minus")
                                    .font(.callout.weight(.medium))
                            }
                            .buttonStyle(.bordered)
                            .help("Ver e apagar flashcards")
                            Button { activeSheet = .ankiExport } label: {
                                Label("Exportar para o Anki", systemImage: "square.and.arrow.up")
                                    .font(.callout.weight(.medium))
                            }
                            .buttonStyle(.bordered)
                            .help("Um arquivo .txt por formato (Cloze, Certo/Errado…) para importar no Anki")
                        }
                        Text("Gerencie ou exporte seus flashcards (um arquivo por formato do Anki).")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .appSurface()
                }

                // Heatmap de leitura
                VStack(alignment: .leading, spacing: 8) {
                    SectionTitle(title: "Heatmap de leitura", symbol: "square.grid.3x3.fill")
                    Text("Atividade dos últimos 119 dias.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    ActivityHeatmap(series: store.activitySeries(days: 119))
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .appSurface()

                // Progresso por norma
                let progressed = store.laws.compactMap { law -> (LawEntry, StudyRecord)? in
                    guard let record = store.study[law.id.uuidString],
                          record.unitTotal > 0, !record.readKeys.isEmpty else { return nil }
                    return (law, record)
                }
                .sorted { $0.1.readKeys.count > $1.1.readKeys.count }
                VStack(alignment: .leading, spacing: 10) {
                    SectionTitle(title: "Por norma", symbol: "chart.line.uptrend.xyaxis")
                    if progressed.isEmpty {
                        Text("Você ainda não marcou nenhum artigo como lido. Abra uma norma no modo Estudo e comece!")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    ForEach(progressed.prefix(6), id: \.0.id) { law, record in
                        Button {
                            openLaw(law.id)
                        } label: {
                            VStack(alignment: .leading, spacing: 3) {
                                HStack {
                                    Text(law.title).font(.callout).lineLimit(1)
                                    Spacer()
                                    Text("\(record.readKeys.count)/\(record.unitTotal)")
                                        .font(.caption.monospacedDigit())
                                        .foregroundStyle(.secondary)
                                }
                                ProgressView(value: min(1, Double(record.readKeys.count) / Double(record.unitTotal)))
                                    .tint(ThemeState.t.accent)
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .appSurface()

                // Biblioteca
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    StatCard(title: "Normas", value: "\(lawCount)",
                             symbol: "books.vertical", color: ThemeState.t.accent,
                             detail: "\(monitoredCount) fontes monitoradas")
                    StatCard(title: "Novidades 2026", value: "\(novidadesCount)",
                             symbol: "sparkles", color: ThemeState.t.accent,
                             detail: "índices oficiais de legislação nova")
                    StatCard(title: "Grifos e anotações", value: "\(store.annotations.count)",
                             symbol: "highlighter", color: ThemeState.t.accent,
                             detail: "marcações e notas nas normas")
                    StatCard(title: "Jurisprudências vinculadas", value: "\(store.precedents.count)",
                             symbol: "text.book.closed", color: .indigo,
                             detail: "súmulas, teses e decisões suas")
                }

                // Verificação
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        SectionTitle(title: "Monitoramento", symbol: "bell.badge")
                        Spacer()
                        if store.isChecking {
                            ProgressView().controlSize(.small)
                        }
                        Button(store.isChecking ? "Verificando…" : "Verificar agora") {
                            Task { await store.checkAllUpdates(manual: true) }
                        }
                        .disabled(store.isChecking)
                    }
                    if store.isChecking && !store.checkProgress.isEmpty {
                        Text(store.checkProgress).font(.caption).foregroundStyle(.secondary)
                    } else {
                        Text(store.lastCheckDate.map {
                            "Última verificação: \($0.formatted(date: .abbreviated, time: .shortened))"
                        } ?? "Nenhuma verificação realizada ainda.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }
                }
                .padding(14)
                .appSurface()

                // Últimas alterações
                if !store.updates.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            SectionTitle(title: "Últimas alterações", symbol: "clock.arrow.circlepath", color: ThemeState.t.accent)
                            Spacer()
                            Button("Ver todas") { openUpdates() }
                                .buttonStyle(.link)
                        }
                        ForEach(store.updates.prefix(5)) { event in
                            Button {
                                openLaw(event.lawID)
                            } label: {
                                HStack {
                                    Circle().fill(ThemeState.t.accent).frame(width: 7, height: 7)
                                    Text(event.lawTitle).lineLimit(1)
                                    Spacer()
                                    Text(event.date.formatted(date: .abbreviated, time: .omitted))
                                        .foregroundStyle(.secondary)
                                }
                                .font(.callout)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(14)
                    .appSurface()
                }

                // Anotações recentes
                let recent = store.annotations.sorted { $0.createdAt > $1.createdAt }.prefix(5)
                if !recent.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        SectionTitle(title: "Anotações recentes", symbol: "highlighter", color: ThemeState.t.accent)
                        ForEach(Array(recent)) { annotation in
                            Button {
                                openLaw(annotation.lawID)
                            } label: {
                                HStack(alignment: .top, spacing: 8) {
                                    RoundedRectangle(cornerRadius: 2)
                                        .fill(Color(hexRGBA: annotation.colorHex))
                                        .frame(width: 4, height: 28)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("“\(annotation.selectedText)”")
                                            .font(.callout.italic())
                                            .lineLimit(1)
                                        Text(store.laws.first { $0.id == annotation.lawID }?.title ?? "")
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                }
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(14)
                    .appSurface()
                }
            }
            .padding(AppTheme.pageInset)
        }
        .background(AppTheme.pageBackground)
        .navigationTitle("Início")
        .sheet(item: $activeSheet) { sheet in
            switch sheet {
            case .review:       SRSReviewView().environmentObject(store)
            case .ankiExport:   AnkiExportSheet().environmentObject(store)
            case .flashManager: FlashcardsManagerSheet().environmentObject(store)
            }
        }
    }
}

/// Gerenciar flashcards: lista todos os cartões e permite apagar (um a um ou todos).
struct FlashcardsManagerSheet: View {
    @EnvironmentObject var store: AppStore
    @Environment(\.dismiss) private var dismiss
    @State private var confirmClearAll = false

    private func kindInfo(_ k: String) -> (label: String, symbol: String, color: Color) {
        switch k {
        case FlashKind.cloze:       return ("Lacuna", "rectangle.dashed", .blue)
        case FlashKind.clozeType:   return ("Lacuna (escrever)", "square.and.pencil", .indigo)
        case FlashKind.certoErrado: return ("Certo/errado", "checkmark.circle", .green)
        case FlashKind.direta:      return ("Pergunta direta", "questionmark.circle", ThemeState.t.accent)
        default:                    return ("Antigo", "clock.arrow.circlepath", .gray)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Meus flashcards").font(.title2.weight(.semibold))
                Spacer()
                Button("Fechar") { dismiss() }
            }
            .padding()
            Divider()

            let cards = store.deckList()
            if cards.isEmpty {
                ContentUnavailableView {
                    Label("Nenhum flashcard", systemImage: "rectangle.stack")
                } description: {
                    Text("Crie flashcards no modo Estudo, pelo menu “Criar flashcard”.")
                }
            } else {
                List {
                    ForEach(cards, id: \.key) { c in
                        HStack(alignment: .top, spacing: 10) {
                            let info = kindInfo(c.kind)
                            Image(systemName: info.symbol)
                                .foregroundStyle(info.color).frame(width: 20)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(c.front).font(.callout).lineLimit(2)
                                Text("\(c.title) · \(info.label)")
                                    .font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                            }
                            Spacer(minLength: 8)
                            Button(role: .destructive) {
                                store.srsRemove(c.lawID, unitKey: c.unitKey)
                            } label: {
                                Image(systemName: "trash")
                            }
                            .buttonStyle(.borderless)
                            .help("Apagar este flashcard")
                        }
                        .padding(.vertical, 3)
                    }
                }
                .listStyle(.inset)
            }

            Divider()
            HStack {
                Button(role: .destructive) { confirmClearAll = true } label: {
                    Label("Apagar todos", systemImage: "trash")
                }
                .disabled(store.srsDeckCount == 0)
                Spacer()
                Text("\(store.srsDeckCount) flashcard\(store.srsDeckCount == 1 ? "" : "s")")
                    .font(.caption).foregroundStyle(.secondary)
            }
            .padding()
        }
        .frame(width: 540, height: 560)
        .confirmationDialog("Apagar TODOS os flashcards?", isPresented: $confirmClearAll, titleVisibility: .visible) {
            Button("Apagar todos", role: .destructive) { store.srsClearAll() }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("Isso remove o baralho inteiro. Não dá para desfazer.")
        }
    }
}

/// Exporta os flashcards para o Anki — um arquivo .txt por formato. A usuária
/// confirma os nomes EXATOS dos seus note types (o Anki casa por nome) e escolhe
/// uma pasta; o app grava um arquivo por formato que tenha cartões.
struct AnkiExportSheet: View {
    @EnvironmentObject var store: AppStore
    @Environment(\.dismiss) private var dismiss
    @AppStorage("ntCloze") private var ntCloze = "Cloze"
    @AppStorage("ntClozeDigite") private var ntClozeDigite = "Cloze – Digite a Resposta"
    @AppStorage("ntCertoErrado") private var ntCertoErrado = "Basic – Certo e Errado"
    @AppStorage("ntDireta") private var ntDireta = "Basic"
    @State private var message: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Exportar para o Anki").font(.title2.weight(.semibold))
            Text("Gera um arquivo .txt por formato. Confirme os nomes EXATOS dos seus note types no Anki (com acentos e maiúsculas) — o Anki casa por nome ao importar.")
                .font(.caption).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)

            Form {
                LabeledContent("Cloze (revelar)") {
                    TextField("", text: $ntCloze).textFieldStyle(.roundedBorder)
                }
                LabeledContent("Cloze (escrever)") {
                    TextField("", text: $ntClozeDigite).textFieldStyle(.roundedBorder)
                }
                LabeledContent("Certo e errado") {
                    TextField("", text: $ntCertoErrado).textFieldStyle(.roundedBorder)
                }
                LabeledContent("Básico — resposta direta") {
                    TextField("", text: $ntDireta).textFieldStyle(.roundedBorder)
                }
            }
            .frame(height: 132)

            if let message {
                Text(message).font(.caption).foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack {
                Text("No Anki: Arquivo ▸ Importar (cada arquivo).")
                    .font(.caption2).foregroundStyle(.tertiary)
                Spacer()
                Button("Fechar") { dismiss() }
                Button("Salvar arquivos…") { save() }
                    .buttonStyle(.borderedProminent)
                    .disabled(store.srsDeckCount == 0)
            }
        }
        .padding(20)
        .frame(width: 480)
    }

    private func save() {
        let files = store.ankiFiles(names: (cloze: ntCloze.trimmingCharacters(in: .whitespaces),
                                            clozeDigite: ntClozeDigite.trimmingCharacters(in: .whitespaces),
                                            certoErrado: ntCertoErrado.trimmingCharacters(in: .whitespaces),
                                            direta: ntDireta.trimmingCharacters(in: .whitespaces)))
        guard !files.isEmpty else { message = "Nenhum flashcard para exportar ainda."; return }
        let panel = NSOpenPanel()
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.canCreateDirectories = true
        panel.prompt = "Salvar aqui"
        panel.message = "Escolha a pasta onde salvar os arquivos do Anki"
        guard panel.runModal() == .OK, let dir = panel.url else { return }
        var ok = 0
        var lastErr: String?
        for file in files {
            do { try file.content.write(to: dir.appendingPathComponent(file.name), atomically: true, encoding: .utf8); ok += 1 }
            catch { lastErr = error.localizedDescription }
        }
        if ok > 0 {
            NSWorkspace.shared.activateFileViewerSelecting([dir])
            message = ok == files.count
                ? "\(ok) arquivo(s) salvos. Importe cada um no Anki (Arquivo ▸ Importar)."
                : "\(ok) de \(files.count) salvos. Falha em \(files.count - ok): \(lastErr ?? "erro desconhecido")."
        } else {
            message = "Não foi possível salvar em “\(dir.lastPathComponent)”: \(lastErr ?? "erro desconhecido"). Tente outra pasta."
        }
    }
}

/// Metas diárias (leitura + revisão) com barras de progresso e a previsão de
/// cartões a vencer nos próximos 7 dias. As metas são editáveis (Stepper) e
/// ficam em @AppStorage; 0 = sem meta.
struct DailyGoalsCard: View {
    @EnvironmentObject var store: AppStore
    @AppStorage("goalReads") private var goalReads = 10
    @AppStorage("goalReviews") private var goalReviews = 10

    private var forecast: [(date: Date, count: Int)] { store.srsForecast(days: 7) }
    private var hasDeck: Bool { store.srsDeckCount > 0 }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionTitle(title: "Metas do dia", symbol: "target", color: ThemeState.t.accent)
            goalRow(icon: "book.fill", tint: ThemeState.t.accent, label: "Leitura",
                    current: store.readsToday, goal: $goalReads)
            if hasDeck {
                goalRow(icon: "brain.head.profile", tint: ThemeState.t.accent, label: "Revisão",
                        current: store.reviewedToday, goal: $goalReviews)
                if forecast.contains(where: { $0.count > 0 }) {
                    Divider().padding(.vertical, 2)
                    forecastChart
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .appSurface()
    }

    private func goalRow(icon: String, tint: Color, label: String,
                         current: Int, goal: Binding<Int>) -> some View {
        let g = max(0, goal.wrappedValue)
        let done = g > 0 && current >= g
        return HStack(spacing: 12) {
            IconBubble(symbol: icon, color: tint, size: 34)
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(label).font(.callout.weight(.semibold))
                    Spacer()
                    if g > 0 {
                        Text("\(current) / \(g)")
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(done ? Color.green : Color.secondary)
                        if done {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.caption).foregroundStyle(.green)
                        }
                    } else {
                        Text("sem meta").font(.caption).foregroundStyle(.tertiary)
                    }
                }
                if g > 0 {
                    ProgressView(value: Double(min(current, g)), total: Double(g))
                        .tint(done ? .green : tint)
                }
            }
            Stepper("", value: goal, in: 0...300, step: 5)
                .labelsHidden()
                .help("Ajustar a meta diária de \(label.lowercased())")
        }
    }

    private var forecastChart: some View {
        let maxC = max(1, forecast.map(\.count).max() ?? 1)
        return VStack(alignment: .leading, spacing: 6) {
            Text("Próximos 7 dias").font(.caption.weight(.semibold)).foregroundStyle(.secondary)
            HStack(alignment: .bottom, spacing: 6) {
                ForEach(Array(forecast.enumerated()), id: \.offset) { i, d in
                    VStack(spacing: 3) {
                        Text(d.count > 0 ? "\(d.count)" : " ")
                            .font(.system(size: 9).monospacedDigit()).foregroundStyle(.secondary)
                        RoundedRectangle(cornerRadius: 3)
                            .fill(i == 0 ? ThemeState.t.accent : ThemeState.t.accent.opacity(0.45))
                            .frame(height: max(3, CGFloat(d.count) / CGFloat(maxC) * 40))
                        Text(Self.weekdayLabel(d.date))
                            .font(.system(size: 9))
                            .foregroundStyle(i == 0 ? Color.primary : Color.secondary)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .frame(height: 64, alignment: .bottom)
        }
    }

    private static func weekdayLabel(_ date: Date) -> String {
        weekdayFmt.string(from: date).replacingOccurrences(of: ".", with: "").capitalized
    }
    private static let weekdayFmt: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "pt_BR")
        f.timeZone = TimeZone(identifier: "America/Sao_Paulo")
        f.dateFormat = "EEE"   // dia da semana abreviado (seg, ter, …)
        return f
    }()
}

/// Grade de intensidade de leitura (estilo GitHub): colunas = semanas.
struct ActivityHeatmap: View {
    let series: [(date: Date, count: Int)]

    private var columns: [[(date: Date, count: Int)]] {
        stride(from: 0, to: series.count, by: 7).map {
            Array(series[$0..<min($0 + 7, series.count)])
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .top, spacing: 3) {
                ForEach(Array(columns.enumerated()), id: \.offset) { _, week in
                    VStack(spacing: 3) {
                        ForEach(Array(week.enumerated()), id: \.offset) { _, day in
                            RoundedRectangle(cornerRadius: 2)
                                .fill(color(for: day.count))
                                .frame(width: 13, height: 13)
                                .help("\(day.date.formatted(date: .abbreviated, time: .omitted)): \(day.count) unidade(s) lida(s)")
                        }
                    }
                }
            }
            HStack(spacing: 4) {
                Text("Menos").font(.caption2).foregroundStyle(.tertiary)
                ForEach([0, 1, 3, 6], id: \.self) { level in
                    RoundedRectangle(cornerRadius: 2).fill(color(for: level)).frame(width: 11, height: 11)
                }
                Text("Mais").font(.caption2).foregroundStyle(.tertiary)
            }
        }
    }

    private func color(for count: Int) -> Color {
        switch count {
        case 0: return Color.gray.opacity(0.15)
        case 1...2: return ThemeState.t.accent.opacity(0.35)
        case 3...5: return ThemeState.t.accent.opacity(0.65)
        default: return ThemeState.t.accent
        }
    }
}
