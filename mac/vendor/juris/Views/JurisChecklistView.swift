import SwiftUI

/// Mini card de tarefas na Início do CátedraJURIS — checklist de leitura PRÓPRIA
/// (dados independentes do CátedraLEGIS: cada app com a sua, sem misturar metas
/// de leis com as de jurisprudência). Captura rápida + as metas mais próximas.
struct JurisChecklistMiniCard: View {
    @Environment(LibraryStore.self) private var store
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
            HStack(spacing: 7) {
                Image(systemName: "checklist").font(.system(size: 12)).foregroundStyle(Palette.accent)
                Text("Checklist de leitura").font(Typo.serifTitle(17, .bold)).foregroundStyle(Palette.titleInk)
                Spacer()
                Button("Ver tudo") { openChecklist() }
                    .buttonStyle(.plain).font(.caption.weight(.semibold))
                    .foregroundStyle(Palette.accent)
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
                                  ? Palette.secondaryInk.opacity(0.4) : Palette.accent)
                .disabled(newText.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding(.horizontal, 10).padding(.vertical, 7)
            .background(Palette.elevated, in: RoundedRectangle(cornerRadius: 8, style: .continuous))

            if visible.isEmpty {
                Text(store.readingChecklist.isEmpty
                     ? "Adicione metas de leitura livres — como \"reler súmulas do TJRO\"."
                     : "Tudo em dia por aqui — nenhuma meta pendente. 🎉")
                    .font(.caption).foregroundStyle(Palette.secondaryInk)
                    .padding(.vertical, 2)
            } else {
                VStack(spacing: 6) {
                    ForEach(visible) { item in miniRow(item) }
                }
                if extra > 0 {
                    Button("+ \(extra) meta\(extra == 1 ? "" : "s") pendente\(extra == 1 ? "" : "s")") { openChecklist() }
                        .buttonStyle(.plain).font(.caption).foregroundStyle(Palette.accent)
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Palette.hairline, lineWidth: 1))
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
                    .foregroundStyle(Palette.secondaryInk.opacity(0.5))
                Text(item.text)
                    .font(.system(size: 12.5))
                    .foregroundStyle(Palette.readingInk)
                    .lineLimit(1)
                Spacer(minLength: 4)
                if let due = item.dueDate {
                    Text(due.formatted(date: .abbreviated, time: .omitted))
                        .font(.system(size: 10)).foregroundStyle(overdue ? .red : Palette.secondaryInk)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

/// Ícone/cor de um vínculo salvo — três "espécies" possíveis: matéria do edital,
/// ramo do Direito (taxonomia do JURIS) ou tipo/fonte de jurisprudência (ex.:
/// Súmulas Vinculantes, Informativos STF). Resolvido pelo LABEL, já que os 3
/// namespaces não colidem entre si (nomes de matéria vs. nomes de fonte).
@MainActor
private func linkVisual(for label: String, store: LibraryStore) -> (icon: String, bg: Color, fg: Color) {
    if store.editalDisciplinas.contains(label) {
        return ("graduationcap.fill", Palette.accent.opacity(0.12), Palette.accent)
    }
    if let fonte = Fonte.ordem.first(where: { $0.nome == label }) {
        return (fonte.simbolo, fonte.cor.opacity(0.16), fonte.cor)
    }
    return ("tag.fill", Palette.elevated, Palette.secondaryInk)
}

/// Página completa da checklist de leitura do CátedraJURIS — metas livres, com
/// prazo opcional e vínculo opcional a uma matéria (do edital, de "Ramos do
/// Direito" ou a um tipo/fonte de jurisprudência). Dados PRÓPRIOS do JURIS
/// (não compartilhados com o LEGIS).
struct JurisChecklistView: View {
    @Environment(LibraryStore.self) private var store
    @State private var newText = ""
    @State private var newHasDueDate = false
    @State private var newDueDate = Date()
    @State private var linkedCategoryLabel: String?
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
    private var completed: [ReadingChecklistItem] {
        store.readingChecklist.filter(\.done).sorted { ($0.doneAt ?? $0.createdAt) > ($1.doneAt ?? $1.createdAt) }
    }
    private var doneCount: Int { completed.count }
    private var total: Int { store.readingChecklist.count }
    private var fontesDisponiveis: [(fonte: Fonte, count: Int)] { store.fontesEm(store.entries) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                addForm
                if total == 0 {
                    vazio
                } else {
                    progressBar
                    if !pending.isEmpty {
                        itemsSection(title: "Pendentes", items: pending, dimmed: false)
                    }
                    if !completed.isEmpty {
                        itemsSection(title: "Concluídas", items: completed, dimmed: true)
                    }
                }
                Color.clear.frame(height: 20)
            }
            .padding(.horizontal, 26).padding(.top, 22)
        }
        .background(Palette.appBackground)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 8) {
                Image(systemName: "checklist").font(.system(size: 15)).foregroundStyle(Palette.accent)
                Text("Checklist de leitura").font(Typo.serifTitle(22, .bold)).foregroundStyle(Palette.titleInk)
                if total > 0 {
                    Text("\(total)")
                        .font(.system(size: 11, weight: .bold)).monospacedDigit()
                        .padding(.horizontal, 7).padding(.vertical, 2)
                        .background(Capsule().fill(Palette.accent))
                        .foregroundStyle(.white)
                }
            }
            Text("Metas que você define — não precisam estar ligadas a um verbete específico.")
                .font(.system(size: 12)).foregroundStyle(Palette.secondaryInk)
        }
    }

    // MARK: - Formulário de adicionar

    private var addForm: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                TextField("Nova meta de leitura (ex.: reler súmulas do TJRO)", text: $newText)
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
                .foregroundStyle(newHasDueDate ? Palette.accent : Palette.secondaryInk)
                .help("Definir um prazo para esta meta")
            }
            .padding(.horizontal, 11).padding(.vertical, 9)
            .background(Palette.elevated, in: RoundedRectangle(cornerRadius: 9, style: .continuous))

            HStack(spacing: 10) {
                if let linkedCategoryLabel {
                    let v = linkVisual(for: linkedCategoryLabel, store: store)
                    linkChip(icon: v.icon, label: linkedCategoryLabel, bg: v.bg, fg: v.fg) {
                        self.linkedCategoryLabel = nil
                    }
                }
                if newHasDueDate {
                    DatePicker("Prazo", selection: $newDueDate, displayedComponents: .date)
                        .datePickerStyle(.compact)
                        .labelsHidden()
                        .font(.system(size: 12.5))
                }
                Spacer(minLength: 0)
                Button("Adicionar", action: addItem)
                    .buttonStyle(.borderedProminent).tint(Palette.accent).controlSize(.small)
                    .disabled(newText.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(14)
        .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Palette.hairline, lineWidth: 1))
    }

    /// Menu "vincular" — matérias do EDITAL primeiro (mais relevante), depois
    /// "Ramos do Direito" (taxonomia própria do JURIS) e por fim o TIPO/FONTE de
    /// jurisprudência (ex.: Súmulas Vinculantes, Informativos STF) — útil pra metas
    /// como "reler todas as súmulas vinculantes". Sem vínculo a verbete específico
    /// (a meta é livre; um verbete específico já tem seu próprio "lido"/favorito).
    private var linkMenu: some View {
        Menu {
            Button("Nenhuma vinculação") { linkedCategoryLabel = nil }
            if !store.editalDisciplinas.isEmpty {
                Divider()
                Text("Matérias do seu edital")
                ForEach(store.editalDisciplinas, id: \.self) { name in
                    Button(name) { linkedCategoryLabel = name }
                }
            }
            if !store.disciplinasOrdenadas.isEmpty {
                Divider()
                Text("Ramos do Direito")
                ForEach(store.disciplinasOrdenadas, id: \.nome) { d in
                    Button(d.nome) { linkedCategoryLabel = d.nome }
                }
            }
            if !fontesDisponiveis.isEmpty {
                Divider()
                Text("Tipo de jurisprudência")
                ForEach(fontesDisponiveis, id: \.fonte) { f in
                    Button(f.fonte.nome) { linkedCategoryLabel = f.fonte.nome }
                }
            }
        } label: {
            Image(systemName: linkedCategoryLabel != nil ? "books.vertical.fill" : "books.vertical")
                .font(.system(size: 14, weight: .medium))
        }
        .menuStyle(.borderlessButton)
        .fixedSize()
        .foregroundStyle(linkedCategoryLabel != nil ? Palette.accent : Palette.secondaryInk)
        .help("Vincular a uma matéria (opcional)")
    }

    @ViewBuilder
    private func linkChip(icon: String, label: String, bg: Color, fg: Color, onClear: @escaping () -> Void) -> some View {
        HStack(spacing: 5) {
            Image(systemName: icon).font(.system(size: 9.5))
            Text(label).font(.system(size: 11, weight: .medium)).lineLimit(1)
            Button(action: onClear) { Image(systemName: "xmark").font(.system(size: 8.5, weight: .bold)) }
                .buttonStyle(.plain)
        }
        .padding(.horizontal, 9).padding(.vertical, 4)
        .background(Capsule().fill(bg))
        .foregroundStyle(fg)
    }

    private func addItem() {
        let trimmed = newText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        store.addChecklistItem(trimmed, dueDate: newHasDueDate ? newDueDate : nil, linkedCategoryLabel: linkedCategoryLabel)
        newText = ""
        newHasDueDate = false
        newDueDate = Date()
        linkedCategoryLabel = nil
        fieldFocused = true
    }

    private var vazio: some View {
        VStack(spacing: 13) {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Palette.accent.opacity(0.10))
                .frame(width: 64, height: 64)
                .overlay(Image(systemName: "checklist").font(.system(size: 27, weight: .medium))
                    .foregroundStyle(Palette.accent))
            Text("Nenhuma meta ainda").font(.system(size: 16.5, weight: .semibold)).foregroundStyle(Palette.titleInk)
            Text("Adicione metas de leitura livres — como \"reler súmulas do TJRO\" ou \"revisar Direito Penal até sexta\" — e marque conforme for cumprindo.")
                .font(.system(size: 12.5)).foregroundStyle(Palette.secondaryInk)
                .multilineTextAlignment(.center).lineSpacing(2.5)
                .frame(maxWidth: 420)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    // MARK: - Progresso

    private var progressBar: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("\(doneCount) de \(total) concluídas")
                    .font(.system(size: 12, weight: .medium)).foregroundStyle(Palette.secondaryInk)
                Spacer()
                if doneCount > 0 {
                    Button("Limpar concluídas") { store.clearCompletedChecklistItems() }
                        .buttonStyle(.plain).font(.system(size: 11.5, weight: .medium))
                        .foregroundStyle(Palette.accent)
                }
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Palette.elevated).frame(height: 6)
                    Capsule().fill(Palette.accent)
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
                .foregroundStyle(Palette.secondaryInk.opacity(0.7))
            VStack(spacing: 7) {
                ForEach(items) { item in
                    JurisChecklistRow(item: item, dimmed: dimmed,
                                       onToggle: { store.toggleChecklistItem(item.id) },
                                       onDelete: { store.removeChecklistItem(item.id) })
                }
            }
        }
    }
}

private struct JurisChecklistRow: View {
    let item: ReadingChecklistItem
    let dimmed: Bool
    let onToggle: () -> Void
    let onDelete: () -> Void
    @Environment(LibraryStore.self) private var store
    @State private var hovering = false

    private var overdue: Bool {
        guard !item.done, let due = item.dueDate else { return false }
        return due < Calendar.current.startOfDay(for: Date())
    }

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onToggle) {
                Image(systemName: item.done ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 18))
                    .foregroundStyle(item.done ? Palette.accent : Palette.secondaryInk.opacity(0.5))
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 4) {
                Text(item.text)
                    .font(.system(size: 13.5))
                    .strikethrough(item.done)
                    .foregroundStyle(item.done ? Palette.secondaryInk : Palette.readingInk)
                if item.dueDate != nil || item.linkedCategoryLabel != nil {
                    HStack(spacing: 6) {
                        if let due = item.dueDate {
                            Text((overdue ? "Atrasada · " : "Prazo: ") + due.formatted(date: .abbreviated, time: .omitted))
                                .font(.system(size: 10.5, weight: .medium))
                                .foregroundStyle(overdue ? .red : Palette.secondaryInk)
                        }
                        if let label = item.linkedCategoryLabel {
                            let v = linkVisual(for: label, store: store)
                            HStack(spacing: 4) {
                                Image(systemName: v.icon).font(.system(size: 9))
                                Text(label).font(.system(size: 10.5, weight: .medium)).lineLimit(1)
                            }
                            .padding(.horizontal, 8).padding(.vertical, 3)
                            .background(Capsule().fill(v.bg))
                            .foregroundStyle(v.fg)
                        }
                    }
                }
            }
            Spacer(minLength: 6)
            if hovering {
                Button(action: onDelete) {
                    Image(systemName: "trash").font(.system(size: 12))
                }
                .buttonStyle(.plain).foregroundStyle(Palette.secondaryInk)
            }
        }
        .padding(.horizontal, 13).padding(.vertical, 10)
        .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous)
            .strokeBorder(overdue ? Color.red.opacity(0.35) : Palette.hairline, lineWidth: 1))
        .opacity(dimmed ? 0.65 : 1)
        .onHover { hovering = $0 }
    }
}
