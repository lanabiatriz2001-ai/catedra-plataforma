import SwiftUI

/// Mini card de tarefas na Início do CátedraLEGIS — captura rápida + as metas mais
/// próximas, como um mini app de tarefas embutido no painel. O checklist completo
/// (vínculos, prazos, seções pendentes/concluídas) vive na página dedicada.
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

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                SectionTitle(title: "Checklist de leitura", symbol: "checklist", color: ThemeState.t.accent)
                Spacer()
                Button("Ver tudo") { openChecklist() }
                    .buttonStyle(.plain).font(.caption.weight(.semibold))
                    .foregroundStyle(ThemeState.t.accent)
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
            .padding(.horizontal, 10).padding(.vertical, 7)
            .background(RoundedRectangle(cornerRadius: 8, style: .continuous).fill(AppTheme.softStroke))

            if visible.isEmpty {
                Text(store.readingChecklist.isEmpty
                     ? "Adicione metas de leitura livres — como \"revisar CDC até sexta\"."
                     : "Tudo em dia por aqui — nenhuma meta pendente. 🎉")
                    .font(.caption).foregroundStyle(AppTheme.secondaryInk)
                    .padding(.vertical, 2)
            } else {
                VStack(spacing: 6) {
                    ForEach(visible) { item in miniRow(item) }
                }
                if extra > 0 {
                    Button("+ \(extra) meta\(extra == 1 ? "" : "s") pendente\(extra == 1 ? "" : "s")") { openChecklist() }
                        .buttonStyle(.plain).font(.caption).foregroundStyle(ThemeState.t.accent)
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .appSurface()
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
        let overdue = !item.done && (item.dueDate.map { $0 < Calendar.current.startOfDay(for: Date()) } ?? false)
        Button { store.toggleChecklistItem(item.id) } label: {
            HStack(spacing: 9) {
                Image(systemName: "circle")
                    .font(.system(size: 14))
                    .foregroundStyle(AppTheme.secondaryInk.opacity(0.5))
                Text(item.text)
                    .font(.system(size: 12.5))
                    .foregroundStyle(AppTheme.ink)
                    .lineLimit(1)
                Spacer(minLength: 4)
                if let due = item.dueDate {
                    Text(due.formatted(date: .abbreviated, time: .omitted))
                        .font(.system(size: 10)).foregroundStyle(overdue ? .red : AppTheme.secondaryInk)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

/// Checklist de leitura livre — metas que a usuária define ela mesma (ex.: "reler
/// prisão preventiva", "revisar CDC até sexta"), sem vínculo com um artigo ou
/// norma específica. Complementa o "marcar como lido" por artigo (dentro do leitor).
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
    private var doneCount: Int { completed.count }
    private var total: Int { store.readingChecklist.count }

    var body: some View {
        SectionShell(icon: "checklist", title: "Checklist de leitura",
                     subtitle: "Metas que você define — não precisam estar ligadas a um artigo específico.",
                     count: total == 0 ? nil : total) {
            VStack(spacing: 0) {
                addForm
                Rectangle().fill(AppTheme.hairline).frame(height: 1)
                if total == 0 {
                    LegisEmpty(icon: "checklist", title: "Nenhuma meta ainda",
                               message: "Adicione metas de leitura livres — como \"reler prisão preventiva\" ou \"revisar CDC até sexta\" — e marque conforme for cumprindo.")
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 20) {
                            progressBar
                            if !pending.isEmpty {
                                itemsSection(title: "Pendentes", items: pending, dimmed: false)
                            }
                            if !completed.isEmpty {
                                itemsSection(title: "Concluídas", items: completed, dimmed: true)
                            }
                        }
                        .padding(AppTheme.pageInset)
                    }
                }
            }
        }
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
            .padding(.horizontal, 11).padding(.vertical, 9)
            .background(RoundedRectangle(cornerRadius: 9, style: .continuous).fill(AppTheme.softStroke))
            .overlay(RoundedRectangle(cornerRadius: 9, style: .continuous).strokeBorder(AppTheme.hairline, lineWidth: 1))

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
    /// As matérias do EDITAL do Cátedra (o plano de estudos da usuária) vêm primeiro,
    /// já que são o vínculo mais relevante; a taxonomia própria do Vade Mecum vem depois.
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

    // MARK: - Progresso

    private var progressBar: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("\(doneCount) de \(total) concluídas")
                    .font(.system(size: 12, weight: .medium)).foregroundStyle(AppTheme.secondaryInk)
                Spacer()
                if doneCount > 0 {
                    Button("Limpar concluídas") { store.clearCompletedChecklistItems() }
                        .buttonStyle(.plain).font(.system(size: 11.5, weight: .medium))
                        .foregroundStyle(ThemeState.t.accent)
                }
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(AppTheme.softStroke).frame(height: 6)
                    Capsule().fill(ThemeState.t.accent)
                        .frame(width: total == 0 ? 0 : geo.size.width * CGFloat(doneCount) / CGFloat(total), height: 6)
                }
            }
            .frame(height: 6)
        }
    }

    // MARK: - Seções de itens

    @ViewBuilder
    private func itemsSection(title: String, items: [ReadingChecklistItem], dimmed: Bool) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title.uppercased())
                .font(.system(size: 10.5, weight: .bold)).tracking(0.8)
                .foregroundStyle(AppTheme.secondaryInk.opacity(0.7))
            VStack(spacing: 7) {
                ForEach(items) { item in
                    ChecklistRow(item: item, dimmed: dimmed,
                                 onToggle: { store.toggleChecklistItem(item.id) },
                                 onDelete: { store.removeChecklistItem(item.id) },
                                 onOpenLaw: { selection = $0 })
                }
            }
        }
    }
}

private struct ChecklistRow: View {
    @EnvironmentObject var store: AppStore
    let item: ReadingChecklistItem
    let dimmed: Bool
    let onToggle: () -> Void
    let onDelete: () -> Void
    let onOpenLaw: (UUID) -> Void
    @State private var hovering = false

    private var overdue: Bool {
        guard !item.done, let due = item.dueDate else { return false }
        return due < Calendar.current.startOfDay(for: Date())
    }
    private var linkedLaw: LawEntry? {
        guard let id = item.linkedLawID else { return nil }
        return store.laws.first { $0.id == id }
    }

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onToggle) {
                Image(systemName: item.done ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 18))
                    .foregroundStyle(item.done ? ThemeState.t.accent : AppTheme.secondaryInk.opacity(0.5))
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 4) {
                Text(item.text)
                    .font(.system(size: 13.5))
                    .strikethrough(item.done)
                    .foregroundStyle(item.done ? AppTheme.secondaryInk : AppTheme.ink)
                if item.dueDate != nil || linkedLaw != nil || item.linkedCategoryLabel != nil {
                    HStack(spacing: 6) {
                        if let due = item.dueDate {
                            Text((overdue ? "Atrasada · " : "Prazo: ") + due.formatted(date: .abbreviated, time: .omitted))
                                .font(.system(size: 10.5, weight: .medium))
                                .foregroundStyle(overdue ? .red : AppTheme.secondaryInk)
                        }
                        if let law = linkedLaw {
                            Button { onOpenLaw(law.id) } label: {
                                HStack(spacing: 4) {
                                    Image(systemName: "book.closed.fill").font(.system(size: 9))
                                    Text(law.title).font(.system(size: 10.5, weight: .medium)).lineLimit(1)
                                }
                                .padding(.horizontal, 8).padding(.vertical, 3)
                                .background(Capsule().fill(ThemeState.t.accent.opacity(0.12)))
                                .foregroundStyle(ThemeState.t.accent)
                            }
                            .buttonStyle(.plain)
                            .help("Abrir esta norma")
                        } else if let label = item.linkedCategoryLabel {
                            let fromEdital = store.editalDisciplinas.contains(label)
                            HStack(spacing: 4) {
                                Image(systemName: fromEdital ? "graduationcap.fill" : "tag.fill").font(.system(size: 9))
                                Text(label).font(.system(size: 10.5, weight: .medium)).lineLimit(1)
                            }
                            .padding(.horizontal, 8).padding(.vertical, 3)
                            .background(Capsule().fill(fromEdital ? ThemeState.t.accent.opacity(0.12) : AppTheme.softStroke))
                            .foregroundStyle(fromEdital ? ThemeState.t.accent : AppTheme.secondaryInk)
                        }
                    }
                }
            }
            Spacer(minLength: 6)
            if hovering {
                Button(action: onDelete) {
                    Image(systemName: "trash").font(.system(size: 12))
                }
                .buttonStyle(.plain).foregroundStyle(AppTheme.secondaryInk)
            }
        }
        .padding(.horizontal, 13).padding(.vertical, 10)
        .background(RoundedRectangle(cornerRadius: AppTheme.compactRadius, style: .continuous).fill(AppTheme.cardBackground))
        .overlay(RoundedRectangle(cornerRadius: AppTheme.compactRadius, style: .continuous)
            .strokeBorder(overdue ? Color.red.opacity(0.35) : AppTheme.hairline, lineWidth: 1))
        .opacity(dimmed ? 0.65 : 1)
        .onHover { hovering = $0 }
    }
}
