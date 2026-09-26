import SwiftUI

/// Painel inicial: visão geral da biblioteca, últimas alterações e anotações recentes.
struct DashboardView: View {
    @EnvironmentObject var store: AppStore
    let openLaw: (UUID) -> Void
    let openSection: (SidebarItem) -> Void
    let openUpdates: () -> Void
    var openUpdate: (UUID) -> Void = { _ in }   // abre o comparativo de UMA alteração
    let newCategory: () -> Void

    @AppStorage("lastStudiedLawID") private var lastStudiedLawID = ""
    @AppStorage("srsEnabled") private var srsEnabled = false
    @AppStorage("appearance") private var appearance = "light"  // "system" | "light" | "dark" (default casa com o fallback claro)
    // Um único .sheet(item:) — empilhar vários .sheet(isPresented:) no mesmo view
    // faz o SwiftUI (macOS) confundir qual apresentar/dispensar, e uma folha
    // acabava "sequestrando" a outra (ex.: apagar um flashcard abria a revisão).
    @State private var activeSheet: DashSheet?
    // Observado para o tile "Simulado" refletir "prova em curso" sem sair do Início.
    @ObservedObject private var simulado = SimuladoLegisSessao.shared

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

    // Tiles do bloco TREINAR — as telas que antes não apareciam em lugar nenhum do Início.
    private var treinoTiles: [(String, String, String, SidebarItem)] {
        [("Plano de leitura", "\(ReadingData.totalDias) dias por disciplina", "calendar", .planoLeitura),
         ("Simulado de lei seca", simulado.emCurso ? "prova em curso" : "C/E do texto oficial", "checkmark.seal", .simuladoLegis),
         ("Prova oral", "arguição sobre o artigo", "mic", .provaOral),
         ("Incidência", "artigos mais cobrados", "target", .incidencia),
         ("Índice das normas", "livros, títulos, capítulos", "list.bullet.indent", .indiceEstrutural),
         ("Checklist", "\(store.readingChecklist.filter { !$0.done }.count) metas pendentes", "checklist", .checklist)]
    }

    @ViewBuilder
    private func treinoTile(_ title: String, _ subtitle: String, _ symbol: String, _ item: SidebarItem) -> some View {
        let emCurso = item == .simuladoLegis && simulado.emCurso
        Button { openSection(item) } label: {
            HStack(spacing: 10) {
                IconBubble(symbol: symbol, color: emCurso ? AppTheme.warn : ThemeState.t.accent, size: 34)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(DS.interface(13, .semibold)).foregroundStyle(AppTheme.ink).lineLimit(1)
                    Text(subtitle).font(DS.interface(11)).foregroundStyle(emCurso ? AppTheme.warn : AppTheme.secondaryInk).lineLimit(1)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right").font(DS.interface(10, .semibold))
                    .foregroundStyle(AppTheme.secondaryInk.opacity(0.5))
            }
            .padding(12)
            .legisCard(tint: emCurso ? AppTheme.warn : ThemeState.t.accent, spine: emCurso, hover: true)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    /// Revisão espaçada + gestão do baralho num cartão só (antes eram dois, com os
    /// mesmos números). Aparece quando o método está ligado ou já há cartões.
    @ViewBuilder private var srsCard: some View {
        if srsEnabled || store.srsDeckCount > 0 {
            let due = store.srsDueCount()
            VStack(alignment: .leading, spacing: 12) {
                Button { activeSheet = .review } label: {
                    HStack(spacing: 12) {
                        IconBubble(symbol: "brain.head.profile", color: AppTheme.srs, size: 38)
                        VStack(alignment: .leading, spacing: 3) {
                            LegisSectionHeader(title: "Revisão espaçada", tint: AppTheme.srs)
                            Text(due > 0 ? "\(due) artigo\(due > 1 ? "s" : "") para revisar hoje" : "Você está em dia!")
                                .font(AppTheme.displayFont(15, .bold)).foregroundStyle(AppTheme.ink)
                            Text("\(store.srsDeckCount) artigo\(store.srsDeckCount == 1 ? "" : "s") no baralho")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        if due > 0 {
                            Text("Revisar").font(DS.interface(13, .bold)).foregroundStyle(.white)
                                .padding(.horizontal, 14).padding(.vertical, 7)
                                .background(Capsule().fill(AppTheme.srs))
                        } else {
                            Image(systemName: "checkmark.circle.fill").font(.title2).foregroundStyle(AppTheme.ok)
                        }
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                if store.srsDeckCount > 0 {
                    HStack(spacing: 8) {
                        Button { activeSheet = .flashManager } label: {
                            Label("Gerenciar", systemImage: "rectangle.stack.badge.minus")
                        }
                        .buttonStyle(.bordered).help("Ver e apagar flashcards")
                        Button { activeSheet = .ankiExport } label: {
                            Label("Exportar para o Anki", systemImage: "square.and.arrow.up")
                        }
                        .buttonStyle(.bordered).help("Um arquivo .txt por formato (Cloze, Certo/Errado…) para importar no Anki")
                        Spacer()
                    }
                    .controlSize(.small)
                }
            }
            .padding(14)
            .legisCard(tint: AppTheme.srs, spine: true)
        }
    }

    /// Norma do "Continuar estudando" (a última aberta no modo Estudo, se ainda existir).
    private var lastStudied: LawEntry? {
        guard let uuid = UUID(uuidString: lastStudiedLawID) else { return nil }
        return store.laws.first { $0.id == uuid }
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
            LegisSectionHeader(title: "Tempo de estudo por norma", icon: "hourglass", tint: ThemeState.t.accent,
                               trailing: entries.isEmpty ? nil : AnyView(
                                Text("total \(Self.fmtDur(store.totalStudySeconds))")
                                    .font(.caption).foregroundStyle(.secondary)))
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
                Text(law.title).font(DS.interface(12.5, .medium))
                    .foregroundStyle(AppTheme.ink).lineLimit(1)
                Spacer(minLength: 8)
                Text(Self.fmtDur(secs)).font(Typo.num(12, .semibold))
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

    // Tile de matéria: gradiente da área, ícone grande, contagem — toque abre a lista.
    private func materiaTile(_ cat: LawCategory) -> some View {
        MateriaTile(cat: cat, count: categoryCount(cat)) { openSection(.category(cat)) }
    }

    // Célula de número-chave dentro do hero (fundo translúcido sobre o gradiente).
    private func heroStat(_ value: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(value).font(Typo.num(20)).foregroundStyle(.white)
            Text(label).font(DS.interface(11)).foregroundStyle(.white.opacity(0.85))
        }
        .padding(.horizontal, 14).padding(.vertical, 11)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: AppTheme.rInner, style: .continuous).fill(Color.white.opacity(0.13)))
        .overlay(RoundedRectangle(cornerRadius: AppTheme.rInner, style: .continuous).strokeBorder(Color.white.opacity(0.16), lineWidth: 1))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Entrega 5 — Hoje (spec §7): só o que decide a próxima leitura. Saíram o hero de
                // números, as metas diárias, a ofensiva, o heatmap e a "Biblioteca" (as matérias
                // estão no Acervo; alterações em Novidades; o treino em Treinar).
                if let law = lastStudied {
                    CartaoContinuar(titulo: law.title,
                                    detalhe: UserDefaults.standard.string(forKey: "lastStudiedUnitLabel"),
                                    cor: law.customCategory == nil ? law.category.ramo?.identidade : nil,
                                    acao: { openLaw(law.id) })
                } else {
                    CartaoContinuar(titulo: "Comece pelo Acervo", detalhe: "Escolha uma norma para ler",
                                    cor: nil, acao: { openSection(.destino(.acervo)) })
                }
                srsCard
                Button { openSection(.planoLeitura) } label: {
                    HStack {
                        Label("Plano de leitura", systemImage: "calendar").font(DS.interface(15, .semibold))
                        Spacer()
                        Image(systemName: "chevron.right").font(DS.interface(13))
                    }
                    .foregroundStyle(ThemeState.t.ink)
                    .padding(DSEspaco.e4).frame(minHeight: 44)
                    .appSurface()
                }
                .buttonStyle(.plain)
                ChecklistMiniCard(openChecklist: { openSection(.checklist) })
            }
            .padding(AppTheme.pageInset)
        }
        .background(AppTheme.pageBackground)
        .navigationTitle("Hoje")
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
        case FlashKind.cloze:       return ("Lacuna", "rectangle.dashed", AppTheme.info)
        case FlashKind.clozeType:   return ("Lacuna (escrever)", "square.and.pencil", AppTheme.srs)
        case FlashKind.certoErrado: return ("Certo/errado", "checkmark.circle", AppTheme.ok)
        case FlashKind.direta:      return ("Pergunta direta", "questionmark.circle", ThemeState.t.accent)
        default:                    return ("Antigo", "clock.arrow.circlepath", .gray)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Meus flashcards").font(AppTheme.displayFont(20, .semibold))
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
            Text("Exportar para o Anki").font(AppTheme.displayFont(20, .semibold))
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
                    .buttonStyle(.legisPrimary)
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
/// Tile de matéria com vida: hover levanta e intensifica a sombra colorida (vitrine V4).
private struct MateriaTile: View {
    let cat: LawCategory
    let count: Int
    let action: () -> Void
    @State private var hovering = false

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 6) {
                Image(systemName: cat.symbol)
                    .font(DS.interface(19, .semibold))
                    .foregroundStyle(.white)
                Spacer(minLength: 4)
                Text(cat.shortName)
                    .font(DS.interface(13.5, .bold))
                    .foregroundStyle(.white)
                    .lineLimit(1).minimumScaleFactor(0.75)
                Text("\(count) norma\(count == 1 ? "" : "s")")
                    .font(DS.interface(10.5, .medium))
                    .foregroundStyle(.white.opacity(0.85))
            }
            .padding(14)
            .frame(maxWidth: .infinity, minHeight: 92, alignment: .leading)
            .background(LinearGradient(colors: cat.gradStops,
                                       startPoint: .topLeading, endPoint: .bottomTrailing))
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.rHero, style: .continuous))
            .shadow(color: cat.color.opacity(hovering ? 0.5 : 0.35), radius: hovering ? 13 : 9, y: hovering ? 7 : 5)
            .scaleEffect(hovering ? 1.02 : 1)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { hovering = $0 }
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: hovering)
        .help("Abrir \(cat.rawValue)")
    }
}

struct DailyGoalsCard: View {
    @EnvironmentObject var store: AppStore
    @AppStorage("goalReads") private var goalReads = 10
    @AppStorage("goalReviews") private var goalReviews = 10

    private var forecast: [(date: Date, count: Int)] { store.srsForecast(days: 7) }
    private var hasDeck: Bool { store.srsDeckCount > 0 }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            LegisSectionHeader(title: "Metas do dia", icon: "target", tint: ThemeState.t.accent)
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
                            .foregroundStyle(done ? AppTheme.ok : Color.secondary)
                        if done {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.caption).foregroundStyle(AppTheme.ok)
                        }
                    } else {
                        Text("sem meta").font(.caption).foregroundStyle(.tertiary)
                    }
                }
                if g > 0 {
                    ProgressView(value: Double(min(current, g)), total: Double(g))
                        .tint(done ? AppTheme.ok : tint)
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
                ForEach(Array(forecast.enumerated()), id: \.element.date) { i, d in
                    VStack(spacing: 3) {
                        Text(d.count > 0 ? "\(d.count)" : " ")
                            .font(DS.interface(9).monospacedDigit()).foregroundStyle(.secondary)
                        RoundedRectangle(cornerRadius: 3)
                            .fill(i == 0 ? ThemeState.t.accent : ThemeState.t.accent.opacity(0.45))
                            .frame(height: max(3, CGFloat(d.count) / CGFloat(maxC) * 40))
                        Text(Self.weekdayLabel(d.date))
                            .font(DS.interface(9))
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
                ForEach(columns, id: \.first?.date) { week in
                    VStack(spacing: 3) {
                        ForEach(week, id: \.date) { day in
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
