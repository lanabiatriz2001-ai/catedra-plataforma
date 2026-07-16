import SwiftUI

// MARK: - Peças compartilhadas do checklist (vitrine)

/// Anel de progresso gradiente — o "rosto" moderno do checklist.
struct ChecklistRing: View {
    let frac: Double
    var stops: [Color] = [ThemeState.t.accent, ThemeState.t.accentD]
    var size: CGFloat = 64
    var line: CGFloat = 8
    var center: String = ""

    var body: some View {
        ZStack {
            Circle().stroke(AppTheme.softStroke, lineWidth: line)
            Circle()
                .trim(from: 0, to: max(0.001, min(frac, 1)))
                .stroke(AngularGradient(colors: stops + [stops[0]], center: .center),
                        style: StrokeStyle(lineWidth: line, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.spring(response: 0.6, dampingFraction: 0.8), value: frac)
            if !center.isEmpty {
                Text(center)
                    .font(.system(size: size * 0.26, weight: .bold).monospacedDigit())
                    .foregroundStyle(AppTheme.ink)
            }
        }
        .frame(width: size, height: size)
    }
}

/// Estado do prazo de uma meta — dirige a pílula e o agrupamento.
fileprivate enum DueKind {
    case none, overdue(Int), today, future(Date)
}
fileprivate func dueKind(_ item: ReadingChecklistItem) -> DueKind {
    guard let due = item.dueDate else { return .none }
    let cal = Calendar.current
    let sod = cal.startOfDay(for: Date())
    let d = cal.startOfDay(for: due)
    if d < sod { return .overdue(max(1, cal.dateComponents([.day], from: d, to: sod).day ?? 1)) }
    if d == sod { return .today }
    return .future(due)
}

/// Cor da meta: herda a identidade da matéria/norma vinculada (paleta vitrine).
@MainActor
fileprivate func checklistTint(_ item: ReadingChecklistItem, store: AppStore) -> Color {
    if let id = item.linkedLawID, let law = store.laws.first(where: { $0.id == id }) {
        if let custom = law.customCategory { return CustomCategoryStyle.color(for: custom) }
        return law.category.color
    }
    if let label = item.linkedCategoryLabel,
       let cat = LawCategory.allCases.first(where: { $0.rawValue == label }) {
        return cat.color
    }
    return ThemeState.t.accent
}

/// Pílula de prazo viva: "há N dias" rosé, "Hoje" no acento, futuro neutro.
fileprivate struct DuePill: View {
    let kind: DueKind
    var body: some View {
        switch kind {
        case .none:
            EmptyView()
        case .overdue(let dias):
            pill("há \(dias) dia\(dias == 1 ? "" : "s")", icon: "alarm.fill",
                 fg: .white, bg: Color(hex: 0xE11D48))
        case .today:
            pill("Hoje", icon: "sun.max.fill",
                 fg: .white, bg: ThemeState.t.accent)
        case .future(let d):
            pill(d.formatted(.dateTime.day().month(.abbreviated)), icon: "calendar",
                 fg: AppTheme.secondaryInk, bg: AppTheme.softStroke)
        }
    }
    private func pill(_ t: String, icon: String, fg: Color, bg: Color) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon).font(.system(size: 8.5, weight: .bold))
            Text(t).font(.system(size: 10.5, weight: .bold))
        }
        .padding(.horizontal, 8).padding(.vertical, 3.5)
        .background(Capsule().fill(bg))
        .foregroundStyle(fg)
    }
}

/// Menu de reagendar em 1 clique — a utilidade nova do checklist.
fileprivate struct ReagendarMenu: View {
    let itemID: UUID
    @EnvironmentObject var store: AppStore
    var body: some View {
        Menu {
            Button { set(daysFromToday: 0) } label: { Label("Hoje", systemImage: "sun.max") }
            Button { set(daysFromToday: 1) } label: { Label("Amanhã", systemImage: "sunrise") }
            Button { set(daysFromToday: 7) } label: { Label("Em 1 semana", systemImage: "calendar.badge.clock") }
            Divider()
            Button { store.setChecklistDue(itemID, nil) } label: { Label("Sem prazo", systemImage: "calendar.badge.minus") }
        } label: {
            Image(systemName: "calendar").font(.system(size: 12))
        }
        .menuStyle(.borderlessButton).menuIndicator(.hidden).fixedSize()
        .help("Reagendar esta meta")
    }
    private func set(daysFromToday n: Int) {
        let d = Calendar.current.date(byAdding: .day, value: n,
                                      to: Calendar.current.startOfDay(for: Date())) ?? Date()
        store.setChecklistDue(itemID, d)
    }
}

// MARK: - Mini card da Início (vitrine)

/// Mini card de tarefas na Início do CátedraLEGIS — captura rápida + as metas mais
/// próximas. O checklist completo (vínculos, prazos, grupos) vive na página dedicada.
struct ChecklistMiniCard: View {
    @EnvironmentObject var store: AppStore
    let openChecklist: () -> Void
    @State private var newText = ""
    @FocusState private var fieldFocused: Bool

    private var pending: [ReadingChecklistItem] {
        store.readingChecklist.filter { !$0.done }.sorted { a, b in
            switch (a.dueDate, b.dueDate) {
            case let (da?, db?): return da < db
            case (nil, nil): return a.createdAt > b.createdAt
            case (nil, _): return false
            case (_, nil): return true
            }
        }
    }
    private var visible: [ReadingChecklistItem] { Array(pending.prefix(5)) }
    private var extra: Int { max(0, pending.count - visible.count) }
    private var doneCount: Int { store.readingChecklist.filter(\.done).count }
    private var total: Int { store.readingChecklist.count }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .fill(LinearGradient(colors: [ThemeState.t.accent, ThemeState.t.accentD],
                                         startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: 30, height: 30)
                    .overlay(Image(systemName: "checklist").font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.white))
                Text("Checklist de leitura")
                    .font(.system(size: 15, weight: .bold)).foregroundStyle(AppTheme.ink)
                Spacer()
                if total > 0 {
                    ChecklistRing(frac: Double(doneCount) / Double(max(total, 1)),
                                  size: 30, line: 4)
                }
                Button(action: openChecklist) {
                    Text("Ver tudo")
                        .font(.system(size: 11, weight: .bold))
                        .padding(.horizontal, 10).padding(.vertical, 5)
                        .background(Capsule().fill(ThemeState.t.accent.opacity(0.13)))
                        .foregroundStyle(ThemeState.t.accent)
                }
                .buttonStyle(.plain)
            }

            HStack(spacing: 8) {
                TextField("Nova meta de leitura…", text: $newText)
                    .textFieldStyle(.plain)
                    .font(.system(size: 13))
                    .focused($fieldFocused)
                    .onSubmit(addQuick)
                Button(action: addQuick) {
                    Image(systemName: "plus.circle.fill").font(.system(size: 17))
                }
                .buttonStyle(.plain)
                .foregroundStyle(newText.trimmingCharacters(in: .whitespaces).isEmpty
                                  ? AppTheme.secondaryInk.opacity(0.4) : ThemeState.t.accent)
                .disabled(newText.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding(.horizontal, 11).padding(.vertical, 8)
            .background(Capsule().fill(AppTheme.softStroke))
            .overlay(Capsule().strokeBorder(AppTheme.hairline, lineWidth: 1))

            if visible.isEmpty {
                Text(store.readingChecklist.isEmpty
                     ? "Adicione metas de leitura livres — como \"revisar CDC até sexta\"."
                     : "Tudo em dia por aqui — nenhuma meta pendente. 🎉")
                    .font(.caption).foregroundStyle(AppTheme.secondaryInk)
                    .padding(.vertical, 2)
            } else {
                VStack(spacing: 5) {
                    ForEach(visible) { item in miniRow(item) }
                }
                if extra > 0 {
                    Button("+ \(extra) meta\(extra == 1 ? "" : "s") pendente\(extra == 1 ? "" : "s")") { openChecklist() }
                        .buttonStyle(.plain).font(.caption.weight(.semibold))
                        .foregroundStyle(ThemeState.t.accent)
                }
            }
        }
        .padding(15)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(AppTheme.cardBackground))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(AppTheme.hairline, lineWidth: 1))
        .shadow(color: ThemeState.t.accent.opacity(0.10), radius: 12, y: 5)
    }

    private func addQuick() {
        let trimmed = newText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        store.addChecklistItem(trimmed)
        newText = ""
        fieldFocused = true
    }

    @ViewBuilder
    private func miniRow(_ item: ReadingChecklistItem) -> some View {
        let tint = checklistTint(item, store: store)
        Button {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                store.toggleChecklistItem(item.id)
            }
        } label: {
            HStack(spacing: 9) {
                Image(systemName: item.done ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 15))
                    .foregroundStyle(item.done ? tint : tint.opacity(0.45))
                    .symbolEffect(.bounce, value: item.done)
                Text(item.text)
                    .font(.system(size: 12.5, weight: .medium))
                    .foregroundStyle(AppTheme.ink)
                    .lineLimit(1)
                Spacer(minLength: 4)
                DuePill(kind: dueKind(item))
            }
            .padding(.horizontal, 9).padding(.vertical, 6)
            .background(RoundedRectangle(cornerRadius: 9, style: .continuous).fill(tint.opacity(0.05)))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Checklist completo (página dedicada)

/// Checklist de leitura livre — metas que a usuária define ela mesma (ex.: "reler
/// prisão preventiva", "revisar CDC até sexta"), agrupadas por urgência e com a
/// identidade de cor da matéria vinculada.
struct ChecklistView: View {
    @EnvironmentObject var store: AppStore
    @Binding var selection: UUID?
    @State private var newText = ""
    @State private var newHasDueDate = false
    @State private var newDueDate = Date()
    @State private var linkedLawID: UUID?
    @State private var linkedCategoryLabel: String?
    @FocusState private var fieldFocused: Bool

    // Normas agrupadas por matéria (mesma lógica da barra lateral), para o menu de vínculo.
    private var categoriesWithLaws: [(LawCategory, [LawEntry])] {
        LawCategory.allCases.compactMap { cat in
            let laws = store.laws.filter { $0.isRegularLaw && $0.customCategory == nil && $0.category == cat }
                .sorted { $0.title.localizedCompare($1.title) == .orderedAscending }
            return laws.isEmpty ? nil : (cat, laws)
        }
    }
    private var customCategoriesWithLaws: [(String, [LawEntry])] {
        store.customCategories.compactMap { name in
            let laws = store.laws.filter { $0.isRegularLaw && $0.customCategory == name }
                .sorted { $0.title.localizedCompare($1.title) == .orderedAscending }
            return laws.isEmpty ? nil : (name, laws)
        }
    }
    private var hasLink: Bool { linkedLawID != nil || linkedCategoryLabel != nil }

    private var pending: [ReadingChecklistItem] {
        store.readingChecklist.filter { !$0.done }.sorted { a, b in
            switch (a.dueDate, b.dueDate) {
            case let (da?, db?): return da < db
            case (nil, nil): return a.createdAt > b.createdAt
            case (nil, _): return false
            case (_, nil): return true
            }
        }
    }
    private var completed: [ReadingChecklistItem] {
        store.readingChecklist.filter(\.done).sorted { ($0.doneAt ?? $0.createdAt) > ($1.doneAt ?? $1.createdAt) }
    }
    // Grupos por urgência — o coração "funcional" da página.
    private var atrasadas: [ReadingChecklistItem] {
        pending.filter { if case .overdue = dueKind($0) { return true }; return false }
    }
    private var hoje: [ReadingChecklistItem] {
        pending.filter { if case .today = dueKind($0) { return true }; return false }
    }
    private var proximas: [ReadingChecklistItem] {
        pending.filter { if case .future = dueKind($0) { return true }; return false }
    }
    private var semPrazo: [ReadingChecklistItem] {
        pending.filter { if case .none = dueKind($0) { return true }; return false }
    }
    private var doneCount: Int { completed.count }
    private var total: Int { store.readingChecklist.count }

    var body: some View {
        SectionShell(icon: "checklist", title: "Checklist de leitura",
                     subtitle: "Metas que você define — agrupadas por urgência, com reagendar em 1 clique.",
                     count: total == 0 ? nil : total) {
            VStack(spacing: 0) {
                addForm
                Rectangle().fill(AppTheme.hairline).frame(height: 1)
                if total == 0 {
                    LegisEmpty(icon: "checklist", title: "Nenhuma meta ainda",
                               message: "Adicione metas de leitura livres — como \"reler prisão preventiva\" ou \"revisar CDC até sexta\" — e marque conforme for cumprindo.")
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 22) {
                            statsHeader
                            if !atrasadas.isEmpty {
                                itemsSection(title: "Atrasadas", tint: Color(hex: 0xE11D48),
                                             icon: "alarm.fill", items: atrasadas, dimmed: false)
                            }
                            if !hoje.isEmpty {
                                itemsSection(title: "Hoje", tint: ThemeState.t.accent,
                                             icon: "sun.max.fill", items: hoje, dimmed: false)
                            }
                            if !proximas.isEmpty {
                                itemsSection(title: "Próximas", tint: AppTheme.secondaryInk,
                                             icon: "calendar", items: proximas, dimmed: false)
                            }
                            if !semPrazo.isEmpty {
                                itemsSection(title: "Sem prazo", tint: AppTheme.secondaryInk,
                                             icon: "tray", items: semPrazo, dimmed: false)
                            }
                            if !completed.isEmpty {
                                itemsSection(title: "Concluídas", tint: AppTheme.secondaryInk,
                                             icon: "checkmark.circle", items: completed, dimmed: true)
                            }
                        }
                        .padding(AppTheme.pageInset)
                    }
                }
            }
        }
    }

    // MARK: - Cabeçalho de progresso (anel + chips)

    private var statsHeader: some View {
        HStack(spacing: 18) {
            ChecklistRing(frac: total == 0 ? 0 : Double(doneCount) / Double(total),
                          size: 66, line: 9,
                          center: total == 0 ? "0%" : "\(Int((Double(doneCount) / Double(total) * 100).rounded()))%")
            VStack(alignment: .leading, spacing: 7) {
                Text("\(doneCount) de \(total) concluídas")
                    .font(.system(size: 15, weight: .bold)).foregroundStyle(AppTheme.ink)
                HStack(spacing: 7) {
                    statChip("\(hoje.count) hoje", tint: ThemeState.t.accent, on: !hoje.isEmpty)
                    statChip("\(atrasadas.count) atrasada\(atrasadas.count == 1 ? "" : "s")",
                             tint: Color(hex: 0xE11D48), on: !atrasadas.isEmpty)
                    statChip("\(proximas.count + semPrazo.count) na fila",
                             tint: AppTheme.secondaryInk, on: false)
                }
            }
            Spacer()
            if doneCount > 0 {
                Button("Limpar concluídas") {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.75)) {
                        store.clearCompletedChecklistItems()
                    }
                }
                .buttonStyle(.plain).font(.system(size: 11.5, weight: .semibold))
                .foregroundStyle(ThemeState.t.accent)
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(AppTheme.cardBackground))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(AppTheme.hairline, lineWidth: 1))
        .shadow(color: ThemeState.t.accent.opacity(0.12), radius: 14, y: 6)
    }

    private func statChip(_ t: String, tint: Color, on: Bool) -> some View {
        Text(t)
            .font(.system(size: 11, weight: .bold))
            .padding(.horizontal, 9).padding(.vertical, 3.5)
            .background(Capsule().fill(on ? tint : tint.opacity(0.12)))
            .foregroundStyle(on ? .white : tint)
    }

    // MARK: - Formulário de adicionar

    private var addForm: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                TextField("Nova meta de leitura (ex.: revisar CDC até sexta)", text: $newText)
                    .textFieldStyle(.plain)
                    .font(.system(size: 13.5))
                    .focused($fieldFocused)
                    .onSubmit(addItem)
                linkMenu
                Button {
                    withAnimation(.easeInOut(duration: 0.15)) { newHasDueDate.toggle() }
                } label: {
                    Image(systemName: newHasDueDate ? "calendar.badge.checkmark" : "calendar.badge.plus")
                        .font(.system(size: 14, weight: .medium))
                }
                .buttonStyle(.plain)
                .foregroundStyle(newHasDueDate ? ThemeState.t.accent : AppTheme.secondaryInk)
                .help("Definir um prazo para esta meta")
            }
            .padding(.horizontal, 12).padding(.vertical, 9)
            .background(Capsule().fill(AppTheme.softStroke))
            .overlay(Capsule().strokeBorder(AppTheme.hairline, lineWidth: 1))

            HStack(spacing: 10) {
                if let linkedLawID, let law = store.laws.first(where: { $0.id == linkedLawID }) {
                    linkChip(icon: "book.closed.fill", label: law.title) { self.linkedLawID = nil }
                } else if let linkedCategoryLabel {
                    let fromEdital = store.editalDisciplinas.contains(linkedCategoryLabel)
                    linkChip(icon: fromEdital ? "graduationcap.fill" : "tag.fill", label: linkedCategoryLabel) { self.linkedCategoryLabel = nil }
                }
                if newHasDueDate {
                    DatePicker("Prazo", selection: $newDueDate, displayedComponents: .date)
                        .datePickerStyle(.compact)
                        .labelsHidden()
                        .font(.system(size: 12.5))
                }
                Spacer(minLength: 0)
                Button("Adicionar", action: addItem)
                    .buttonStyle(.borderedProminent).tint(ThemeState.t.accent).controlSize(.small)
                    .disabled(newText.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(.horizontal, 22).padding(.vertical, 16)
    }

    /// Menu "vincular a uma norma ou matéria" — organizado do mesmo jeito que a barra lateral.
    private var linkMenu: some View {
        Menu {
            Button("Nenhuma vinculação") { linkedLawID = nil; linkedCategoryLabel = nil }
            if !store.editalDisciplinas.isEmpty {
                Divider()
                Text("Matérias do seu edital")
                ForEach(store.editalDisciplinas, id: \.self) { name in
                    Button(name) { linkedCategoryLabel = name; linkedLawID = nil }
                }
            }
            Divider()
            Text("Vade Mecum")
            ForEach(categoriesWithLaws, id: \.0.rawValue) { cat, laws in
                Menu(cat.rawValue) {
                    Button("Toda a matéria") { linkedCategoryLabel = cat.rawValue; linkedLawID = nil }
                    Divider()
                    ForEach(laws) { law in
                        Button(law.title) { linkedLawID = law.id; linkedCategoryLabel = nil }
                    }
                }
            }
            if !customCategoriesWithLaws.isEmpty {
                Divider()
                ForEach(customCategoriesWithLaws, id: \.0) { name, laws in
                    Menu(name) {
                        Button("Toda a matéria") { linkedCategoryLabel = name; linkedLawID = nil }
                        Divider()
                        ForEach(laws) { law in
                            Button(law.title) { linkedLawID = law.id; linkedCategoryLabel = nil }
                        }
                    }
                }
            }
        } label: {
            Image(systemName: hasLink ? "books.vertical.fill" : "books.vertical")
                .font(.system(size: 14, weight: .medium))
        }
        .menuStyle(.borderlessButton)
        .fixedSize()
        .foregroundStyle(hasLink ? ThemeState.t.accent : AppTheme.secondaryInk)
        .help("Vincular a uma norma ou matéria (opcional)")
    }

    @ViewBuilder
    private func linkChip(icon: String, label: String, onClear: @escaping () -> Void) -> some View {
        HStack(spacing: 5) {
            Image(systemName: icon).font(.system(size: 9.5))
            Text(label).font(.system(size: 11, weight: .medium)).lineLimit(1)
            Button(action: onClear) { Image(systemName: "xmark").font(.system(size: 8.5, weight: .bold)) }
                .buttonStyle(.plain)
        }
        .padding(.horizontal, 9).padding(.vertical, 4)
        .background(Capsule().fill(ThemeState.t.accent.opacity(0.14)))
        .foregroundStyle(ThemeState.t.accent)
    }

    private func addItem() {
        let trimmed = newText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        store.addChecklistItem(trimmed, dueDate: newHasDueDate ? newDueDate : nil,
                                linkedLawID: linkedLawID, linkedCategoryLabel: linkedCategoryLabel)
        newText = ""
        newHasDueDate = false
        newDueDate = Date()
        linkedLawID = nil
        linkedCategoryLabel = nil
        fieldFocused = true
    }

    // MARK: - Seções de itens

    @ViewBuilder
    private func itemsSection(title: String, tint: Color, icon: String,
                              items: [ReadingChecklistItem], dimmed: Bool) -> some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack(spacing: 6) {
                Image(systemName: icon).font(.system(size: 10, weight: .bold)).foregroundStyle(tint)
                Text(title.uppercased())
                    .font(.system(size: 10.5, weight: .bold)).tracking(1)
                    .foregroundStyle(tint)
                Text("\(items.count)")
                    .font(.system(size: 9.5, weight: .bold).monospacedDigit())
                    .padding(.horizontal, 5.5).padding(.vertical, 1)
                    .background(Capsule().fill(tint.opacity(0.13)))
                    .foregroundStyle(tint)
            }
            VStack(spacing: 7) {
                ForEach(items) { item in
                    ChecklistRow(item: item, dimmed: dimmed,
                                 onToggle: {
                                     withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                                         store.toggleChecklistItem(item.id)
                                     }
                                 },
                                 onDelete: {
                                     withAnimation(.spring(response: 0.3, dampingFraction: 0.75)) {
                                         store.removeChecklistItem(item.id)
                                     }
                                 },
                                 onOpenLaw: { selection = $0 })
                }
            }
        }
    }
}

// MARK: - Linha do checklist (vitrine)

private struct ChecklistRow: View {
    @EnvironmentObject var store: AppStore
    let item: ReadingChecklistItem
    let dimmed: Bool
    let onToggle: () -> Void
    let onDelete: () -> Void
    let onOpenLaw: (UUID) -> Void
    @State private var hovering = false

    private var kind: DueKind { dueKind(item) }
    private var overdue: Bool { if case .overdue = kind { return !item.done }; return false }
    private var tint: Color { checklistTint(item, store: store) }
    private var linkedLaw: LawEntry? {
        guard let id = item.linkedLawID else { return nil }
        return store.laws.first { $0.id == id }
    }

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onToggle) {
                ZStack {
                    Circle()
                        .fill(item.done
                              ? AnyShapeStyle(LinearGradient(colors: [tint, tint.opacity(0.72)],
                                                             startPoint: .topLeading, endPoint: .bottomTrailing))
                              : AnyShapeStyle(Color.clear))
                    Circle().strokeBorder(item.done ? Color.clear : tint.opacity(0.5), lineWidth: 1.8)
                    if item.done {
                        Image(systemName: "checkmark")
                            .font(.system(size: 10, weight: .heavy)).foregroundStyle(.white)
                    }
                }
                .frame(width: 21, height: 21)
                .symbolEffect(.bounce, value: item.done)
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 5) {
                Text(item.text)
                    .font(.system(size: 13.5, weight: .medium))
                    .strikethrough(item.done)
                    .foregroundStyle(item.done ? AppTheme.secondaryInk : AppTheme.ink)
                HStack(spacing: 6) {
                    DuePill(kind: item.done ? .none : kind)
                    if let law = linkedLaw {
                        Button { onOpenLaw(law.id) } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "book.closed.fill").font(.system(size: 9))
                                Text(law.title).font(.system(size: 10.5, weight: .semibold)).lineLimit(1)
                            }
                            .padding(.horizontal, 8).padding(.vertical, 3)
                            .background(Capsule().fill(tint.opacity(0.13)))
                            .foregroundStyle(tint)
                        }
                        .buttonStyle(.plain)
                        .help("Abrir esta norma")
                    } else if let label = item.linkedCategoryLabel {
                        let fromEdital = store.editalDisciplinas.contains(label)
                        HStack(spacing: 4) {
                            Image(systemName: fromEdital ? "graduationcap.fill" : "tag.fill").font(.system(size: 9))
                            Text(label).font(.system(size: 10.5, weight: .semibold)).lineLimit(1)
                        }
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(Capsule().fill(tint.opacity(0.13)))
                        .foregroundStyle(tint)
                    }
                }
            }
            Spacer(minLength: 6)
            if hovering && !item.done {
                ReagendarMenu(itemID: item.id)
                    .foregroundStyle(AppTheme.secondaryInk)
            }
            if hovering {
                Button(action: onDelete) {
                    Image(systemName: "trash").font(.system(size: 12))
                }
                .buttonStyle(.plain).foregroundStyle(AppTheme.secondaryInk)
            }
        }
        .padding(.horizontal, 13).padding(.vertical, 11)
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(AppTheme.cardBackground))
        .overlay(alignment: .leading) {
            // Lombada da matéria vinculada — a paleta vitrine no checklist.
            RoundedRectangle(cornerRadius: 2, style: .continuous)
                .fill(item.done ? tint.opacity(0.35) : tint)
                .frame(width: 3)
                .padding(.vertical, 9).padding(.leading, 1.5)
        }
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous)
            .strokeBorder(overdue ? Color(hex: 0xE11D48).opacity(0.4) : AppTheme.hairline, lineWidth: 1))
        .shadow(color: (hovering ? tint : .black).opacity(hovering ? 0.16 : 0.03), radius: hovering ? 9 : 3, y: 3)
        .scaleEffect(hovering ? 1.004 : 1)
        .animation(.easeOut(duration: 0.14), value: hovering)
        .opacity(dimmed ? 0.6 : 1)
        .onHover { hovering = $0 }
        .contextMenu {
            if !item.done {
                Button { store.setChecklistDue(item.id, Calendar.current.startOfDay(for: Date())) } label: { Label("Para hoje", systemImage: "sun.max") }
                Button { store.setChecklistDue(item.id, Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: Date()))) } label: { Label("Para amanhã", systemImage: "sunrise") }
                Button { store.setChecklistDue(item.id, nil) } label: { Label("Sem prazo", systemImage: "calendar.badge.minus") }
                Divider()
            }
            Button(role: .destructive, action: onDelete) { Label("Apagar meta", systemImage: "trash") }
        }
    }
}
