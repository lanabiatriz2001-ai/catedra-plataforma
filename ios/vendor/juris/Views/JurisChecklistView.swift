import SwiftUI

// MARK: - Peças do checklist (vitrine) — espelham o CátedraLEGIS

/// Estado do prazo — dirige a pílula e o agrupamento por urgência.
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

/// Pílula de prazo viva: "há N dias" rosé, "Hoje" no acento, futuro neutro.
fileprivate struct DuePill: View {
    let kind: DueKind
    var body: some View {
        switch kind {
        case .none:
            EmptyView()
        case .overdue(let dias):
            pill("há \(dias) dia\(dias == 1 ? "" : "s")", icon: "alarm.fill",
                 fg: .white, bg: Color(hex: "#E11D48"))
        case .today:
            pill("Hoje", icon: "sun.max.fill", fg: .white, bg: Palette.accent)
        case .future(let d):
            pill(d.formatted(.dateTime.day().month(.abbreviated)), icon: "calendar",
                 fg: Palette.secondaryInk, bg: Palette.elevated)
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

/// Menu de reagendar em 1 clique.
fileprivate struct ReagendarMenu: View {
    let itemID: UUID
    @Environment(LibraryStore.self) private var store
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

/// Ícone/cor de um vínculo salvo — quatro "espécies": matéria do edital, ramo do
/// Direito (cor da paleta vitrine, igual ao LEGIS), tipo/fonte de jurisprudência
/// (cor do tribunal) ou tag livre. Resolvido pelo LABEL (namespaces não colidem).
@MainActor
fileprivate func linkVisual(for label: String, store: LibraryStore) -> (icon: String, bg: Color, fg: Color) {
    if store.editalDisciplinas.contains(label) {
        return ("graduationcap.fill", Palette.accent.opacity(0.12), Palette.accent)
    }
    if let fonte = Fonte.ordem.first(where: { $0.nome == label }) {
        return (fonte.simbolo, fonte.cor.opacity(0.16), fonte.cor)
    }
    if store.disciplinasOrdenadas.contains(where: { $0.nome == label }) {
        let c = RamoStyle.color(label)
        return ("books.vertical.fill", c.opacity(0.14), c)
    }
    return ("tag.fill", Palette.elevated, Palette.secondaryInk)
}

/// Cor da meta: herda a identidade do vínculo (edital/fonte/ramo) ou o acento.
@MainActor
fileprivate func checklistTint(_ item: ReadingChecklistItem, store: LibraryStore) -> Color {
    guard let label = item.linkedCategoryLabel else { return Palette.accent }
    return linkVisual(for: label, store: store).fg
}

// MARK: - Mini card da Início (vitrine)

/// Mini card de tarefas na Início do CátedraJURIS — checklist PRÓPRIA (dados
/// independentes do LEGIS). Captura rápida + as metas mais próximas.
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
    private var doneCount: Int { store.readingChecklist.filter(\.done).count }
    private var total: Int { store.readingChecklist.count }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .fill(LinearGradient(colors: [Palette.accent, Palette.accentSoft],
                                         startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: 30, height: 30)
                    .overlay(Image(systemName: "checklist").font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.white))
                Text("Checklist de leitura")
                    .font(Typo.serifTitle(17, .bold)).foregroundStyle(Palette.titleInk)
                Spacer()
                if total > 0 {
                    ChecklistRing(frac: Double(doneCount) / Double(max(total, 1)),
                                  stops: [Palette.accent, Palette.accentSoft],
                                  size: 30, line: 4)
                }
                Button(action: openChecklist) {
                    Text("Ver tudo")
                        .font(.system(size: 11, weight: .bold))
                        .padding(.horizontal, 10).padding(.vertical, 5)
                        .background(Capsule().fill(Palette.accent.opacity(0.13)))
                        .foregroundStyle(Palette.accent)
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
                                  ? Palette.secondaryInk.opacity(0.4) : Palette.accent)
                .disabled(newText.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding(.horizontal, 11).padding(.vertical, 8)
            .background(Capsule().fill(Palette.elevated))
            .overlay(Capsule().strokeBorder(Palette.hairline, lineWidth: 1))

            if visible.isEmpty {
                Text(store.readingChecklist.isEmpty
                     ? "Adicione metas de leitura livres — como \"reler súmulas do TJRO\"."
                     : "Tudo em dia por aqui — nenhuma meta pendente. 🎉")
                    .font(.caption).foregroundStyle(Palette.secondaryInk)
                    .padding(.vertical, 2)
            } else {
                VStack(spacing: 5) {
                    ForEach(visible) { item in miniRow(item) }
                }
                if extra > 0 {
                    Button("+ \(extra) meta\(extra == 1 ? "" : "s") pendente\(extra == 1 ? "" : "s")") { openChecklist() }
                        .buttonStyle(.plain).font(.caption.weight(.semibold))
                        .foregroundStyle(Palette.accent)
                }
            }
        }
        .padding(15)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(Palette.hairline, lineWidth: 1))
        .shadow(color: Palette.accent.opacity(0.10), radius: 12, y: 5)
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
                    .foregroundStyle(Palette.readingInk)
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

// MARK: - Página completa

/// Checklist de leitura do CátedraJURIS — metas livres agrupadas por urgência,
/// com a cor do vínculo (edital/ramo/fonte) e reagendar em 1 clique. Dados
/// PRÓPRIOS do JURIS (não compartilhados com o LEGIS).
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
    private var fontesDisponiveis: [(fonte: Fonte, count: Int)] { store.fontesEm(store.entries) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                addForm
                if total == 0 {
                    vazio
                } else {
                    statsHeader
                    if !atrasadas.isEmpty {
                        itemsSection(title: "Atrasadas", tint: Color(hex: "#E11D48"),
                                     icon: "alarm.fill", items: atrasadas, dimmed: false)
                    }
                    if !hoje.isEmpty {
                        itemsSection(title: "Hoje", tint: Palette.accent,
                                     icon: "sun.max.fill", items: hoje, dimmed: false)
                    }
                    if !proximas.isEmpty {
                        itemsSection(title: "Próximas", tint: Palette.secondaryInk,
                                     icon: "calendar", items: proximas, dimmed: false)
                    }
                    if !semPrazo.isEmpty {
                        itemsSection(title: "Sem prazo", tint: Palette.secondaryInk,
                                     icon: "tray", items: semPrazo, dimmed: false)
                    }
                    if !completed.isEmpty {
                        itemsSection(title: "Concluídas", tint: Palette.secondaryInk,
                                     icon: "checkmark.circle", items: completed, dimmed: true)
                    }
                }
                Color.clear.frame(height: 20)
            }
            .padding(.horizontal, 26).padding(.top, 22)
        }
        .background(Palette.appBackground)
    }

    private var header: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(LinearGradient(colors: [Palette.accent, Palette.accentSoft],
                                     startPoint: .topLeading, endPoint: .bottomTrailing))
                .frame(width: 42, height: 42)
                .overlay(Image(systemName: "checklist").font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(.white))
                .shadow(color: Palette.accent.opacity(0.4), radius: 8, y: 4)
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 8) {
                    Text("Checklist de leitura").font(Typo.serifTitle(24, .bold)).foregroundStyle(Palette.titleInk)
                    if total > 0 {
                        Text("\(total)")
                            .font(.system(size: 11, weight: .bold)).monospacedDigit()
                            .padding(.horizontal, 8).padding(.vertical, 2)
                            .background(Capsule().fill(Palette.accent.opacity(0.15)))
                            .foregroundStyle(Palette.accent)
                    }
                }
                Text("Metas que você define — agrupadas por urgência, com reagendar em 1 clique.")
                    .font(.system(size: 12)).foregroundStyle(Palette.secondaryInk)
            }
        }
    }

    // MARK: - Cabeçalho de progresso (anel + chips)

    private var statsHeader: some View {
        HStack(spacing: 18) {
            ChecklistRing(frac: total == 0 ? 0 : Double(doneCount) / Double(total),
                          stops: [Palette.accent, Palette.accentSoft],
                          size: 66, line: 9,
                          center: total == 0 ? "0%" : "\(Int((Double(doneCount) / Double(total) * 100).rounded()))%")
            VStack(alignment: .leading, spacing: 7) {
                Text("\(doneCount) de \(total) concluídas")
                    .font(.system(size: 15, weight: .bold)).foregroundStyle(Palette.titleInk)
                HStack(spacing: 7) {
                    statChip("\(hoje.count) hoje", tint: Palette.accent, on: !hoje.isEmpty)
                    statChip("\(atrasadas.count) atrasada\(atrasadas.count == 1 ? "" : "s")",
                             tint: Color(hex: "#E11D48"), on: !atrasadas.isEmpty)
                    statChip("\(proximas.count + semPrazo.count) na fila",
                             tint: Palette.secondaryInk, on: false)
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
                .foregroundStyle(Palette.accent)
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(Palette.hairline, lineWidth: 1))
        .shadow(color: Palette.accent.opacity(0.12), radius: 14, y: 6)
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
            .padding(.horizontal, 12).padding(.vertical, 9)
            .background(Capsule().fill(Palette.elevated))
            .overlay(Capsule().strokeBorder(Palette.hairline, lineWidth: 1))

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
        .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Palette.hairline, lineWidth: 1))
    }

    /// Menu "vincular" — edital primeiro, depois Ramos do Direito e tipos/fontes.
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
                .fill(LinearGradient(colors: [Palette.accent.opacity(0.16), Palette.accentSoft.opacity(0.10)],
                                     startPoint: .topLeading, endPoint: .bottomTrailing))
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
                    JurisChecklistRow(item: item, dimmed: dimmed,
                                       onToggle: {
                                           withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                                               store.toggleChecklistItem(item.id)
                                           }
                                       },
                                       onDelete: {
                                           withAnimation(.spring(response: 0.3, dampingFraction: 0.75)) {
                                               store.removeChecklistItem(item.id)
                                           }
                                       })
                }
            }
        }
    }
}

// MARK: - Linha do checklist (vitrine)

private struct JurisChecklistRow: View {
    let item: ReadingChecklistItem
    let dimmed: Bool
    let onToggle: () -> Void
    let onDelete: () -> Void
    @Environment(LibraryStore.self) private var store
    @State private var hovering = false

    private var kind: DueKind { dueKind(item) }
    private var overdue: Bool { if case .overdue = kind { return !item.done }; return false }
    private var tint: Color { checklistTint(item, store: store) }

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
                    .foregroundStyle(item.done ? Palette.secondaryInk : Palette.readingInk)
                HStack(spacing: 6) {
                    DuePill(kind: item.done ? .none : kind)
                    if let label = item.linkedCategoryLabel {
                        let v = linkVisual(for: label, store: store)
                        HStack(spacing: 4) {
                            Image(systemName: v.icon).font(.system(size: 9))
                            Text(label).font(.system(size: 10.5, weight: .semibold)).lineLimit(1)
                        }
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(Capsule().fill(v.bg))
                        .foregroundStyle(v.fg)
                    }
                }
            }
            Spacer(minLength: 6)
            if hovering && !item.done {
                ReagendarMenu(itemID: item.id)
                    .foregroundStyle(Palette.secondaryInk)
            }
            if hovering {
                Button(action: onDelete) {
                    Image(systemName: "trash").font(.system(size: 12))
                }
                .buttonStyle(.plain).foregroundStyle(Palette.secondaryInk)
            }
        }
        .padding(.horizontal, 13).padding(.vertical, 11)
        .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(alignment: .leading) {
            // Lombada do vínculo — a paleta vitrine no checklist.
            RoundedRectangle(cornerRadius: 2, style: .continuous)
                .fill(item.done ? tint.opacity(0.35) : tint)
                .frame(width: 3)
                .padding(.vertical, 9).padding(.leading, 1.5)
        }
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous)
            .strokeBorder(overdue ? Color(hex: "#E11D48").opacity(0.4) : Palette.hairline, lineWidth: 1))
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
