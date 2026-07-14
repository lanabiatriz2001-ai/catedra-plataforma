import SwiftUI

/// Sessão de revisão espaçada do dia: percorre os artigos vencidos (de todas as
/// normas), mostra o número/tema do artigo como estímulo, revela o texto quando a
/// usuária pede e agenda a próxima revisão conforme a resposta (SM-2, estilo Anki).
struct SRSReviewView: View {
    @EnvironmentObject var store: AppStore
    @Environment(\.dismiss) private var dismiss

    private struct ReviewItem: Identifiable {
        let id = UUID()
        let lawID: UUID
        let lawTitle: String
        let unit: LawUnit
        let accent: Color
        let category: LawCategory
        let customCategory: String?
        var materia: String { customCategory ?? category.rawValue }
    }

    /// Escopo da sessão de revisão: tudo, uma matéria, ou uma norma específica.
    enum ReviewScope: Hashable {
        case all, materia(String), law(UUID)
    }

    @State private var queue: [ReviewItem] = []
    @State private var index = 0
    @State private var revealed = false
    @State private var loading = true
    @State private var gradedKeys: Set<String> = []   // artigos distintos revisados na sessão
    @State private var skipped = 0   // vencidos que não puderam ser carregados (offline / não baixados)
    @State private var allItems: [ReviewItem] = []    // todos os vencidos carregados (antes do escopo)
    @State private var scope: ReviewScope = .all      // filtro: tudo / matéria / norma

    var body: some View {
        VStack(spacing: 0) {
            headerBar
            Divider()
            content
        }
        .frame(width: 720, height: 720)
        .task { await build() }
    }

    private var headerBar: some View {
        HStack(spacing: 12) {
            Image(systemName: "brain.head.profile").font(.title3).foregroundStyle(.purple)
            VStack(alignment: .leading, spacing: 1) {
                Text("Revisão espaçada").font(.headline)
                if !loading && !queue.isEmpty && index < queue.count {
                    Text("Restam \(queue.count - index) · \(gradedKeys.count) revisados"
                         + (skipped > 0 && scope == .all ? " · \(skipped) não carregado(s)" : ""))
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()
            if !loading && allItems.count > 1 && (materiaOptions.count > 1 || normOptions.count > 1) {
                scopeMenu
            }
            Button("Fechar") { dismiss() }
        }
        .padding(16)
    }

    private var scopeMenu: some View {
        Menu {
            scopeButton("Tudo (\(allItems.count))", .all)
            if materiaOptions.count > 1 {
                Section("Por matéria") {
                    ForEach(materiaOptions, id: \.label) { opt in
                        scopeButton("\(opt.label) (\(opt.count))", .materia(opt.label))
                    }
                }
            }
            if normOptions.count > 1 {
                Section("Por norma") {
                    ForEach(normOptions, id: \.id) { opt in
                        scopeButton("\(opt.title) (\(opt.count))", .law(opt.id))
                    }
                }
            }
        } label: {
            Label(scopeLabel, systemImage: "line.3.horizontal.decrease.circle").font(.callout)
        }
        .menuStyle(.borderlessButton)
        .fixedSize()
    }

    @ViewBuilder
    private func scopeButton(_ title: String, _ target: ReviewScope) -> some View {
        Button {
            scope = target
            applyScope()
        } label: {
            if scope == target { Label(title, systemImage: "checkmark") } else { Text(title) }
        }
    }

    private var scopeLabel: String {
        switch scope {
        case .all: return "Tudo"
        case .materia(let m): return m
        case .law(let id): return allItems.first { $0.lawID == id }?.lawTitle ?? "Norma"
        }
    }

    private var materiaOptions: [(label: String, count: Int)] {
        var counts: [String: Int] = [:]
        for it in allItems { counts[it.materia, default: 0] += 1 }
        return counts.sorted { $0.key.localizedCompare($1.key) == .orderedAscending }
            .map { (label: $0.key, count: $0.value) }
    }

    private var normOptions: [(id: UUID, title: String, count: Int)] {
        var counts: [UUID: (String, Int)] = [:]
        for it in allItems {
            let cur = counts[it.lawID] ?? (it.lawTitle, 0)
            counts[it.lawID] = (it.lawTitle, cur.1 + 1)
        }
        return counts.map { (id: $0.key, title: $0.value.0, count: $0.value.1) }
            .sorted { $0.title.localizedCompare($1.title) == .orderedAscending }
    }

    @ViewBuilder
    private var content: some View {
        if loading {
            VStack { Spacer(); ProgressView("Montando a revisão…"); Spacer() }
        } else if queue.isEmpty {
            if skipped > 0 && scope == .all {
                // NÃO afirmar "Você está em dia!" quando havia vencidos que só não
                // puderam ser carregados (norma offline/não baixada) — seria mentira.
                ContentUnavailableView {
                    Label("\(skipped) cartão(ões) não carregado(s)", systemImage: "exclamationmark.triangle.fill")
                } description: {
                    Text("As normas desses cartões vencidos não estão baixadas ou não puderam ser lidas agora. Baixe as normas / verifique a conexão e volte a revisar.")
                } actions: {
                    Button("Fechar") { dismiss() }.buttonStyle(.borderedProminent)
                }
            } else {
                allDone(title: "Nada para revisar agora",
                        subtitle: "Você está em dia! Marque artigos com “Revisão espaçada” no modo Estudo para vê-los aqui quando vencerem.")
            }
        } else if index >= queue.count {
            allDone(title: "Revisão concluída 🎉",
                    subtitle: "\(gradedKeys.count) artigo(s) revisado(s) hoje. Volte amanhã para as próximas revisões.")
        } else {
            card(queue[index])
        }
    }

    private func allDone(title: String, subtitle: String) -> some View {
        ContentUnavailableView {
            Label(title, systemImage: "checkmark.seal.fill")
        } description: {
            Text(subtitle)
        } actions: {
            Button("Fechar") { dismiss() }.buttonStyle(.borderedProminent)
        }
    }

    private func card(_ item: ReviewItem) -> some View {
        let srs = store.srsCard(item.lawID, item.unit.key)
        let kind = srs?.cardKind
        // Cartões gerados (cloze/direta/certo-errado) têm frente e resposta próprias;
        // "recall"/nil são os legados que recordavam o artigo inteiro.
        let generated = kind == FlashKind.cloze || kind == FlashKind.clozeType
            || kind == FlashKind.direta || kind == FlashKind.certoErrado
        return VStack(spacing: 0) {
            HStack {
                Text(item.lawTitle.uppercased())
                    .font(.caption.weight(.semibold)).foregroundStyle(item.accent).lineLimit(1)
                Spacer()
                Text(item.unit.label).font(.caption.weight(.semibold)).foregroundStyle(.secondary)
            }
            .padding(.horizontal, 20).padding(.top, 16).padding(.bottom, 8)
            Divider()

            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if generated, let prompt = srs?.prompt {
                        Text(promptLabel(kind))
                            .font(.caption.weight(.semibold)).foregroundStyle(item.accent)
                        Text(prompt)
                            .font(.system(size: 20, design: .default)).lineSpacing(5)
                            .fixedSize(horizontal: false, vertical: true)
                            .textSelection(.enabled)
                    } else {
                        Text(item.unit.label).font(.system(size: 30, weight: .bold, design: .default))
                        if let context = item.unit.context {
                            Text(context).font(.subheadline).foregroundStyle(.secondary)
                        }
                        Text("Tente lembrar o teor deste artigo.").font(.caption).foregroundStyle(.secondary)
                    }
                    if revealed {
                        Divider()
                        if generated, let answer = srs?.answer {
                            answerView(kind: kind, answer: answer, accent: item.accent)
                        }
                        // O texto integral do artigo entra na CONFERÊNCIA (lado da
                        // resposta) — bom para checar a lacuna/afirmação sem que o
                        // cartão vire "decore o artigo todo".
                        ForEach(Array(LawParser.classify(item.unit).enumerated()), id: \.offset) { _, kind in
                            UnitLine(kind: kind, accent: item.accent)
                        }
                    }
                }
                .padding(20)
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            if revealed {
                gradeBar(item)
            } else {
                Divider()
                Button {
                    revealed = true
                } label: {
                    Label(generated ? "Revelar a resposta" : "Mostrar o artigo", systemImage: "eye")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                }
                .buttonStyle(.borderedProminent)
                .tint(item.accent)
                .keyboardShortcut(.space, modifiers: [])
                .padding(16)
            }
        }
    }

    private func promptLabel(_ kind: String?) -> String {
        switch kind {
        case FlashKind.cloze, FlashKind.clozeType: return "Complete a lacuna"
        case FlashKind.direta: return "Responda"
        case FlashKind.certoErrado: return "Certo ou errado?"
        default: return "Responda"
        }
    }

    @ViewBuilder
    private func answerView(kind: String?, answer: String, accent: Color) -> some View {
        if kind == FlashKind.certoErrado {
            let isCorrect = answer.hasPrefix("Certo")
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: isCorrect ? "checkmark.seal.fill" : "xmark.seal.fill")
                    .foregroundStyle(isCorrect ? .green : .red)
                Text(answer)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(isCorrect ? .green : .red)
                    .fixedSize(horizontal: false, vertical: true)
                    .textSelection(.enabled)
            }
        } else {
            HStack(spacing: 8) {
                Image(systemName: "key.fill").foregroundStyle(accent)
                Text(answer).font(.title3.weight(.bold)).foregroundStyle(accent)
                    .textSelection(.enabled)
            }
        }
    }

    private func gradeBar(_ item: ReviewItem) -> some View {
        VStack(spacing: 6) {
            Divider()
            Text("Como foi lembrar deste artigo?")
                .font(.caption).foregroundStyle(.secondary)
            HStack(spacing: 8) {
                ForEach(SRSGrade.allCases) { grade in
                    Button {
                        applyGrade(item, grade)
                    } label: {
                        VStack(spacing: 2) {
                            Text(grade.label).font(.callout.weight(.semibold))
                            Text(SpacedRepetition.intervalLabel(store.srsPreview(item.lawID, item.unit.key, grade)))
                                .font(.caption2.monospacedDigit()).foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                    }
                    .buttonStyle(.bordered)
                    .tint(grade.color)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 14)
        }
    }

    private func applyGrade(_ item: ReviewItem, _ grade: SRSGrade) {
        store.srsGrade(item.lawID, unitKey: item.unit.key, grade: grade)
        // Conta artigos DISTINTOS: um item reapresentado por "Errei" não conta 2×.
        gradedKeys.insert("\(item.lawID.uuidString)|\(item.unit.key)")
        // "Errei" reaparece no fim da sessão (como o Anki reprograma para revê-lo hoje).
        if grade == .again { queue.append(item) }
        index += 1
        revealed = false
    }

    private func accent(for law: LawEntry) -> Color {
        if law.isNovidades { return .orange }
        if let custom = law.customCategory { return CustomCategoryStyle.color(for: custom) }
        return law.category.color
    }

    private func build() async {
        let due = store.srsDueEntries()
        var byLaw: [UUID: [String]] = [:]
        for entry in due { byLaw[entry.lawID, default: []].append(entry.unitKey) }
        var items: [ReviewItem] = []
        for (lawID, keys) in byLaw {
            guard let law = store.laws.first(where: { $0.id == lawID }),
                  let text = store.loadText(for: law) else { continue }
            let units = await Task.detached(priority: .userInitiated) { LawParser.parse(text) }.value
            let map = Dictionary(units.map { ($0.key, $0) }, uniquingKeysWith: { first, _ in first })
            let color = accent(for: law)
            for key in keys where map[key] != nil {
                items.append(ReviewItem(lawID: lawID, lawTitle: law.title, unit: map[key]!, accent: color,
                                        category: law.category, customCategory: law.customCategory))
            }
        }
        skipped = max(0, due.count - items.count)   // vencidos que não entraram na fila
        allItems = items
        applyScope()
        loading = false
    }

    /// Aplica o escopo (tudo / matéria / norma) à fila da sessão e reinicia a posição.
    private func applyScope() {
        queue = allItems.filter { item in
            // Não reapresentar cartões JÁ avaliados nesta sessão — reavaliar empurraria
            // o agendamento SM-2 de novo (srsGrade avança incondicionalmente).
            let key = "\(item.lawID.uuidString)|\(item.unit.key)"
            guard !gradedKeys.contains(key) else { return false }
            switch scope {
            case .all: return true
            case .materia(let m): return item.materia == m
            case .law(let id): return item.lawID == id
            }
        }
        index = 0
        revealed = false
    }
}
