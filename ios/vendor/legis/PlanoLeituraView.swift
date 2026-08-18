import SwiftUI

// MARK: - Persistência do plano (dias concluídos) — UserDefaults, self-contido

enum PlanoStore {
    static let doneKey = "catedra.plano.done.v1"
    static func loadDone() -> Set<String> {
        Set((UserDefaults.standard.array(forKey: doneKey) as? [String]) ?? [])
    }
    static func saveDone(_ s: Set<String>) {
        UserDefaults.standard.set(Array(s), forKey: doneKey)
    }
}

// MARK: - Plano de leitura (cronograma de 720 dias por disciplina)

struct PlanoLeituraView: View {
    @EnvironmentObject var store: AppStore
    /// Abre uma norma no leitor (empilha .reader). Fornecido pelo SectionScreen.
    let open: (UUID) -> Void

    @AppStorage("readerMode") private var readerMode = "estudo"
    @AppStorage("catedra.plano.startTS") private var startTS: Double = 0   // 0 = sem cronograma
    @AppStorage("catedra.plano.pace") private var pace: Int = 5            // leituras por semana

    @State private var query = ""
    @State private var filter = "todas"                 // todas | pend | conc
    @State private var showCrono = false
    @State private var openDisc: Set<Int> = []
    @State private var openLaw: Set<String> = []
    @State private var done: Set<String> = PlanoStore.loadDone()

    private var total: Int { ReadingData.plano.reduce(0) { $0 + $1.laws.reduce(0) { $0 + $1.days.count } } }

    var body: some View {
        SectionShell(icon: "calendar",
                     title: "Plano de leitura",
                     subtitle: "\(done.count) de \(total) leituras concluídas · cronograma por disciplina",
                     search: $query,
                     searchPrompt: "Buscar disciplina, lei, artigo, dia, título…",
                     tintStops: [ThemeState.t.accent, ThemeState.t.accentD]) {
            VStack(spacing: 0) {
                toolbar
                Divider().overlay(AppTheme.hairline)
                if showCrono { cronoBar; Divider().overlay(AppTheme.hairline) }
                ScrollView {
                    LazyVStack(spacing: 10) {
                        if terms.isEmpty && filter == "todas" { dashboard }
                        ForEach(Array(ReadingData.plano.enumerated()), id: \.offset) { di, disc in
                            if discMatches(di, disc) { discCard(di, disc) }
                        }
                        Color.clear.frame(height: 30)
                    }
                    .padding(.horizontal, 18).padding(.top, 14)
                }
            }
        }
    }

    // MARK: toolbar

    private var toolbar: some View {
        HStack(spacing: 10) {
            Picker("", selection: $filter) {
                Text("Todas").tag("todas")
                Text("Pendentes").tag("pend")
                Text("Concluídas").tag("conc")
            }
            .pickerStyle(.segmented).frame(width: 260).labelsHidden()
            Spacer()
            Toggle(isOn: $showCrono) { Label("Cronograma", systemImage: "calendar.badge.clock") }
                .toggleStyle(.button).controlSize(.small).tint(ThemeState.t.accent)
            Button { withAnimation { setAll(true) } } label: { Text("Expandir") }
                .buttonStyle(.bordered).controlSize(.small)
            Button { withAnimation { setAll(false) } } label: { Text("Recolher") }
                .buttonStyle(.bordered).controlSize(.small)
        }
        .padding(.horizontal, 20).padding(.vertical, 10)
    }

    private var cronoBar: some View {
        HStack(spacing: 16) {
            Label("Início", systemImage: "flag.checkered").font(.system(size: 12, weight: .semibold))
                .foregroundStyle(AppTheme.secondaryInk)
            DatePicker("", selection: Binding(
                get: { startTS > 0 ? Date(timeIntervalSince1970: startTS) : Date() },
                set: { startTS = $0.timeIntervalSince1970 }), displayedComponents: .date)
                .labelsHidden().datePickerStyle(.compact)   // .field é só do macOS
            Divider().frame(height: 18)
            Stepper(value: $pace, in: 1...7) {
                Text("\(pace) leitura\(pace == 1 ? "" : "s") por semana")
                    .font(.system(size: 12, weight: .semibold)).foregroundStyle(AppTheme.secondaryInk)
            }
            Spacer()
            if startTS > 0 {
                Button("Limpar cronograma") { startTS = 0 }.buttonStyle(.plain)
                    .font(.system(size: 11.5)).foregroundStyle(ThemeState.t.accent)
            } else {
                Text("Defina o início para calcular a data de cada leitura")
                    .font(.system(size: 11.5)).foregroundStyle(AppTheme.secondaryInk.opacity(0.8))
            }
        }
        .padding(.horizontal, 20).padding(.vertical, 10)
        .background(ThemeState.t.accent.opacity(0.05))
    }

    // MARK: dashboard (painel de progresso)

    private var dashboard: some View {
        let doneN = done.count
        let frac = total > 0 ? Double(doneN) / Double(total) : 0
        return HStack(alignment: .center, spacing: 20) {
            ChecklistRing(frac: frac, size: 78, line: 9, center: "\(Int(frac * 100))%")
            VStack(alignment: .leading, spacing: 7) {
                Text("SEU PROGRESSO").font(.system(size: 10, weight: .heavy)).tracking(1.0)
                    .foregroundStyle(ThemeState.t.accent)
                Text("\(doneN) de \(total) leituras concluídas")
                    .font(.system(size: 16, weight: .heavy)).foregroundStyle(AppTheme.ink)
                if let nx = nextPending() {
                    HStack(spacing: 7) {
                        Image(systemName: "arrow.right.circle.fill").font(.system(size: 12))
                            .foregroundStyle(ThemeState.t.accent)
                        Text("Próxima leitura: \(nx)").font(.system(size: 12.5))
                            .foregroundStyle(AppTheme.secondaryInk).lineLimit(1)
                    }
                } else if doneN > 0 {
                    Text("Plano concluído — parabéns! 🎉").font(.system(size: 12.5))
                        .foregroundStyle(AppTheme.secondaryInk)
                }
                if showCrono, startTS > 0 {
                    let atr = overdueCount()
                    Text(atr > 0 ? "⏰ \(atr) leitura\(atr == 1 ? "" : "s") atrasada\(atr == 1 ? "" : "s")" : "Em dia com o cronograma ✓")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(atr > 0 ? (Color(css: "#e11d48") ?? .red) : ThemeState.t.accent)
                }
            }
            Spacer(minLength: 8)
            VStack(alignment: .leading, spacing: 5) {
                ForEach(Array(ReadingData.plano.prefix(7).enumerated()), id: \.offset) { di, disc in
                    let c = Color(css: disc.color) ?? ThemeState.t.accent
                    let nD = disc.laws.reduce(0) { $0 + $1.days.count }
                    HStack(spacing: 8) {
                        Text(abbr(disc.name)).font(.system(size: 8.5, weight: .heavy))
                            .foregroundStyle(c).frame(width: 28, alignment: .leading)
                        RoundedRectangle(cornerRadius: 99).fill(AppTheme.softStroke).frame(width: 92, height: 5)
                            .overlay(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 99).fill(c)
                                    .frame(width: nD > 0 ? 92 * CGFloat(discDone(di, disc)) / CGFloat(nD) : 0, height: 5)
                            }
                    }
                }
            }
        }
        .padding(20)
        .background(AppTheme.cardBackground, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(AppTheme.hairline, lineWidth: 1))
    }

    private func nextPending() -> String? {
        for (di, disc) in ReadingData.plano.enumerated() {
            for (li, law) in disc.laws.enumerated() {
                for dyi in law.days.indices where !done.contains("\(di)_\(li)_\(dyi)") {
                    return "\(law.days[dyi].d) · \(law.name)"
                }
            }
        }
        return nil
    }
    private func overdueCount() -> Int {
        guard startTS > 0 else { return 0 }
        var n = 0
        for (di, disc) in ReadingData.plano.enumerated() {
            for (li, law) in disc.laws.enumerated() {
                for dyi in law.days.indices {
                    let k = "\(di)_\(li)_\(dyi)"
                    if !done.contains(k) && cronoOverdue(globalIndex(di, li, dyi), false) { n += 1 }
                }
            }
        }
        return n
    }

    // MARK: discipline card

    @ViewBuilder
    private func discCard(_ di: Int, _ disc: PlanDiscipline) -> some View {
        let c = Color(css: disc.color) ?? ThemeState.t.accent
        let isOpen = openDisc.contains(di)
        let nDays = disc.laws.reduce(0) { $0 + $1.days.count }
        let d = discDone(di, disc)
        VStack(spacing: 0) {
            Button { toggle(&openDisc, di) } label: {
                HStack(spacing: 13) {
                    RoundedRectangle(cornerRadius: 9, style: .continuous).fill(c)
                        .frame(width: 42, height: 34)
                        .overlay(Text(abbr(disc.name)).font(.system(size: 12.5, weight: .heavy)).foregroundStyle(.white))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(disc.name).font(.system(size: 15.5, weight: .bold)).foregroundStyle(AppTheme.ink)
                        Text("\(disc.laws.count) leis · \(nDays) leituras")
                            .font(.system(size: 11)).foregroundStyle(AppTheme.secondaryInk)
                    }
                    Spacer(minLength: 8)
                    ProgressPill(done: d, total: nDays, color: c)
                    Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(AppTheme.secondaryInk.opacity(0.6))
                        .rotationEffect(.degrees(isOpen ? 90 : 0))
                }
                .padding(14)
            }
            .buttonStyle(.plain)
            if isOpen {
                VStack(spacing: 0) {
                    ForEach(Array(disc.laws.enumerated()), id: \.offset) { li, law in
                        lawGroup(di, li, law, c)
                    }
                }
                .padding(.horizontal, 10).padding(.bottom, 6)
            }
        }
        .background(AppTheme.cardBackground, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(AppTheme.hairline, lineWidth: 1))
        .overlay(alignment: .leading) { RoundedRectangle(cornerRadius: 2).fill(c).frame(width: 3).padding(.vertical, 12) }
    }

    // MARK: law group (collapsible into days)

    @ViewBuilder
    private func lawGroup(_ di: Int, _ li: Int, _ law: PlanLaw, _ c: Color) -> some View {
        let key = "\(di)_\(li)"
        let isOpen = openLaw.contains(key)
        let law0 = lawEntry(for: law.name)
        VStack(spacing: 0) {
            Button { toggle(&openLaw, key) } label: {
                HStack(spacing: 9) {
                    Text(law.name).font(.system(size: 13, weight: .bold)).foregroundStyle(c).lineLimit(1)
                    if law0 != nil {
                        Image(systemName: "book").font(.system(size: 10)).foregroundStyle(AppTheme.secondaryInk.opacity(0.7))
                    }
                    Spacer(minLength: 6)
                    Text("\(lawDone(di, li, law))/\(law.days.count)")
                        .font(.system(size: 10.5, weight: .bold).monospacedDigit())
                        .foregroundStyle(AppTheme.secondaryInk)
                        .padding(.horizontal, 8).padding(.vertical, 2)
                        .background(Capsule().fill(AppTheme.softStroke))
                    Image(systemName: "chevron.right").font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(AppTheme.secondaryInk.opacity(0.5))
                        .rotationEffect(.degrees(isOpen ? 90 : 0))
                }
                .padding(.horizontal, 6).padding(.vertical, 9)
            }
            .buttonStyle(.plain)
            .overlay(alignment: .top) { Rectangle().fill(AppTheme.hairline).frame(height: 1) }
            if isOpen {
                ForEach(Array(law.days.enumerated()), id: \.offset) { dyi, day in
                    if dayMatches(di, li, dyi, day, law) {
                        dayRow(di, li, dyi, day, law, law0, c)
                    }
                }
            }
        }
    }

    // MARK: day row (checkbox + Dia + Art + título neutro + abrir)

    @ViewBuilder
    private func dayRow(_ di: Int, _ li: Int, _ dyi: Int, _ day: PlanDay, _ law: PlanLaw, _ law0: LawEntry?, _ c: Color) -> some View {
        let k = "\(di)_\(li)_\(dyi)"
        let isDone = done.contains(k)
        HStack(spacing: 12) {
            Button { toggleDone(k, law0: law0, day: day) } label: {
                RoundedRectangle(cornerRadius: 5, style: .continuous)
                    .fill(isDone ? c : Color.clear)
                    .frame(width: 17, height: 17)
                    .overlay(RoundedRectangle(cornerRadius: 5).strokeBorder(isDone ? c : AppTheme.secondaryInk.opacity(0.45), lineWidth: 2))
                    .overlay(Image(systemName: "checkmark").font(.system(size: 9, weight: .black)).foregroundStyle(.white).opacity(isDone ? 1 : 0))
            }
            .buttonStyle(.plain)
            Text(day.d).font(.system(size: 12, weight: .heavy).monospacedDigit())
                .foregroundStyle(AppTheme.ink).frame(width: 54, alignment: .leading)
                .strikethrough(isDone, color: AppTheme.secondaryInk).opacity(isDone ? 0.5 : 1)
            Text(day.a).font(.system(size: 12.5)).foregroundStyle(AppTheme.secondaryInk)
                .frame(minWidth: 92, alignment: .leading)
                .strikethrough(isDone, color: AppTheme.secondaryInk).opacity(isDone ? 0.5 : 1)
            Rectangle().fill(AppTheme.hairline.opacity(0.7)).frame(height: 1)
            if let t = day.t, let first = t.first {
                HStack(spacing: 6) {
                    Text(first.num + (t.count > 1 ? " +\(t.count - 1)" : ""))
                        .font(.system(size: 11.5, weight: .bold)).foregroundStyle(AppTheme.secondaryInk)
                    Text(first.name).font(.system(size: 11.5)).foregroundStyle(AppTheme.secondaryInk.opacity(0.8))
                        .lineLimit(1)
                }
                .layoutPriority(1)
            }
            if showCrono, startTS > 0 {
                Text(cronoLabel(globalIndex(di, li, dyi)))
                    .font(.system(size: 10.5, weight: .semibold))
                    .foregroundStyle(cronoOverdue(globalIndex(di, li, dyi), isDone) ? Color(css: "#e11d48")! : ThemeState.t.accent)
                    .padding(.horizontal, 8).padding(.vertical, 2)
                    .background(Capsule().fill((cronoOverdue(globalIndex(di, li, dyi), isDone) ? Color(css: "#e11d48")! : ThemeState.t.accent).opacity(0.12)))
            }
            if law0 != nil {
                Button { openArticle(law0!, firstArt(day.a)) } label: {
                    Image(systemName: "arrow.up.right.square").font(.system(size: 13))
                        .foregroundStyle(ThemeState.t.accent)
                }
                .buttonStyle(.plain).help("Abrir no leitor, no artigo")
            }
        }
        .padding(.horizontal, 6).padding(.vertical, 6)
        .contentShape(Rectangle())
    }

    // MARK: - helpers: progresso

    private func discDone(_ di: Int, _ disc: PlanDiscipline) -> Int {
        var n = 0
        for (li, law) in disc.laws.enumerated() {
            for dyi in law.days.indices where done.contains("\(di)_\(li)_\(dyi)") { n += 1 }
        }
        return n
    }
    private func lawDone(_ di: Int, _ li: Int, _ law: PlanLaw) -> Int {
        law.days.indices.filter { done.contains("\(di)_\(li)_\($0)") }.count
    }

    private func toggleDone(_ k: String, law0: LawEntry?, day: PlanDay) {
        let marcando = !done.contains(k)
        if done.contains(k) { done.remove(k) } else { done.insert(k) }
        PlanoStore.saveDone(done)
        // Progresso integrado: marca os artigos do dia como lidos na norma real do LEGIS.
        if let law0 { markDayRead(law0, day: day, read: done.contains(k)) }
        // Concluiu → o host abre o registro de atividades do Cátedra pré-preenchido.
        if marcando {
            NotificationCenter.default.post(name: Notification.Name("catedraPlanoLegisMarcado"),
                                            object: nil, userInfo: ["key": k])
        }
    }

    /// Marca (ou desmarca) os artigos cobertos por um dia como lidos no StudyRecord da norma.
    private func markDayRead(_ law: LawEntry, day: PlanDay, read: Bool) {
        guard let text = store.loadText(for: law) else { return }
        let units = LawParser.parse(text)
        let (lo, hi) = artRange(day.a)
        for u in units {
            if let n = artNumber(u.label), n >= lo, n <= hi {
                let isRead = store.record(for: law.id).readKeys.contains(u.key)
                if isRead != read { store.toggleRead(law.id, unitKey: u.key) }
            }
        }
    }

    // MARK: - helpers: busca / filtro

    private func norm(_ s: String) -> String {
        s.lowercased().folding(options: .diacriticInsensitive, locale: nil)
    }
    private var terms: [String] { norm(query).split(separator: " ").map(String.init).filter { !$0.isEmpty } }

    private func dayMatches(_ di: Int, _ li: Int, _ dyi: Int, _ day: PlanDay, _ law: PlanLaw) -> Bool {
        let k = "\(di)_\(li)_\(dyi)"
        if filter == "pend" && done.contains(k) { return false }
        if filter == "conc" && !done.contains(k) { return false }
        if terms.isEmpty { return true }
        let disc = ReadingData.plano[di].name
        let tt = (day.t?.map { $0.num + " " + $0.name }.joined(separator: " ")) ?? ""
        let hay = norm(disc + " " + law.name + " " + day.d + " " + day.a + " " + tt)
        return terms.allSatisfy { hay.contains($0) }
    }
    private func discMatches(_ di: Int, _ disc: PlanDiscipline) -> Bool {
        if terms.isEmpty && filter == "todas" { return true }
        for (li, law) in disc.laws.enumerated() {
            for dyi in law.days.indices where dayMatches(di, li, dyi, law.days[dyi], law) { return true }
        }
        return false
    }

    // MARK: - helpers: leis / artigos

    private func lawEntry(for name: String) -> LawEntry? {
        if let l = store.laws.first(where: { $0.isRegularLaw && RemissiveIndex.shortName($0) == name }) { return l }
        return store.laws.first(where: { $0.isRegularLaw && $0.title.localizedCaseInsensitiveContains(name) })
    }
    private func firstArt(_ a: String) -> String? {
        let after = a.drop(while: { !$0.isNumber })
        let num = after.prefix(while: { $0.isNumber || $0 == "." })
        return num.isEmpty ? nil : String(num)
    }
    private func artRange(_ a: String) -> (Int, Int) {
        let ns = a.split(whereSeparator: { !$0.isNumber }).compactMap { Int($0) }
        if ns.isEmpty { return (0, -1) }
        return (ns.first!, ns.last!)
    }
    private func artNumber(_ label: String) -> Int? {
        let after = label.drop(while: { !$0.isNumber })
        let num = after.prefix(while: { $0.isNumber })
        return Int(num)
    }
    private func openArticle(_ law: LawEntry, _ artNum: String?) {
        if let n = artNum, let uid = store.articleUnitID(lawID: law.id, number: n) { store.setLastUnit(law.id, uid) }
        readerMode = "estudo"
        open(law.id)
    }

    // MARK: - helpers: cronograma

    private func globalIndex(_ di: Int, _ li: Int, _ dyi: Int) -> Int {
        var idx = 0
        for d in 0..<di { idx += ReadingData.plano[d].laws.reduce(0) { $0 + $1.days.count } }
        for l in 0..<li { idx += ReadingData.plano[di].laws[l].days.count }
        return idx + dyi
    }
    private func cronoDate(_ gi: Int) -> Date {
        let start = Date(timeIntervalSince1970: startTS)
        // pace leituras por semana: cada leitura avança 7/pace dias
        let step = 7.0 / Double(max(1, pace))
        return start.addingTimeInterval(Double(gi) * step * 86400)
    }
    private func cronoLabel(_ gi: Int) -> String {
        let df = DateFormatter(); df.dateFormat = "dd/MM"
        return df.string(from: cronoDate(gi))
    }
    private func cronoOverdue(_ gi: Int, _ isDone: Bool) -> Bool {
        !isDone && cronoDate(gi) < Calendar.current.startOfDay(for: Date())
    }

    // MARK: - util

    private func abbr(_ name: String) -> String {
        String(name.replacingOccurrences(of: "Direito ", with: "").prefix(3)).uppercased()
    }
    private func toggle<T: Hashable>(_ set: inout Set<T>, _ v: T) {
        if set.contains(v) { set.remove(v) } else { set.insert(v) }
    }
    private func setAll(_ open: Bool) {
        if open { openDisc = Set(ReadingData.plano.indices) } else { openDisc = []; openLaw = [] }
    }
}

// MARK: - Pílula de progresso reutilizada nos dois módulos

struct ProgressPill: View {
    let done: Int; let total: Int; let color: Color
    var body: some View {
        HStack(spacing: 8) {
            RoundedRectangle(cornerRadius: 99).fill(AppTheme.softStroke).frame(width: 56, height: 6)
                .overlay(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 99).fill(color)
                        .frame(width: total > 0 ? 56 * CGFloat(done) / CGFloat(total) : 0, height: 6)
                }
            Text("\(done) / \(total)").font(.system(size: 11, weight: .bold).monospacedDigit())
                .foregroundStyle(AppTheme.secondaryInk)
        }
    }
}
