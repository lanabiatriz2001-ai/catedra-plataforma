import SwiftUI
import Combine

/// SIMULADO DE LEI SECA — uma prova de verdade, não uma lista.
///
/// Geração (sem IA): cada item é uma PROPOSIÇÃO COMPLETA tirada do texto oficial —
///   · caput que é frase inteira (não termina em ":");
///   · caput-enunciador + UM inciso/alínea, emendados numa frase ("…sendo: um quinto dentre
///     advogados…") — é assim que a banca cobra lista;
///   · parágrafo (§) como frase própria.
/// Itens ERRADOS: troca do núcleo (prazo, percentual, competência, operador: pode/não pode,
/// constitucional/inconstitucional…) pela mesma inversão segura do baralho do JURIS; o
/// gabarito mostra o trecho original × o trecho alterado. Metade certa, metade errada,
/// embaralhadas. Sem inversão segura, o texto não vira item errado (não se inventa).
///
/// Prova: cabeçalho, tempo regressivo, uma questão por tela, grade de navegação
/// (respondida / marcada para revisar / em branco), entrega com confirmação, relatório
/// (nota, acerto por norma, gabarito comentado), histórico local.
struct SimuladoLegisItem: Identifiable, Hashable {
    let id: String
    let lei: String
    let leiID: UUID
    let artigo: String          // "Art. 107" (+ ", I" / ", § 2º")
    let enunciado: String       // proposição apresentada
    let certo: Bool
    let original: String        // proposição oficial (igual ao enunciado quando certo)
    let trocaDe: String?        // trecho original que foi trocado (nos errados)
    let trocaPara: String?      // pelo que foi trocado
    let contexto: String        // texto completo do artigo (gabarito)
}

@MainActor
enum SimuladoLegisLocal {
    struct Proposicao { let rotulo: String; let texto: String }

    /// Proposições completas de um artigo.
    nonisolated static func proposicoes(_ u: LawUnit) -> [Proposicao] {
        var out: [Proposicao] = []
        var stem = ""   // caput que termina em ":" — enunciador dos incisos
        for k in LawParser.classify(u) {
            switch k {
            case .caput(let t):
                let c = limpa(t)
                if c.hasSuffix(":") { stem = String(c.dropLast()).trimmingCharacters(in: .whitespaces) }
                else if c.count >= 60 { out.append(.init(rotulo: u.label, texto: c)) }
            case .inciso(let n, let t):
                let c = limpa(t)
                guard !stem.isEmpty, c.count >= 25, !c.hasSuffix(":") else { continue }
                out.append(.init(rotulo: "\(u.label), \(n)", texto: junta(stem, c)))
            case .alinea(let n, let t):
                let c = limpa(t)
                guard !stem.isEmpty, c.count >= 30, !c.hasSuffix(":") else { continue }
                out.append(.init(rotulo: "\(u.label), \(n))", texto: junta(stem, c)))
            case .paragrafo(let n, let t):
                let c = limpa(t)
                if c.count >= 60, !c.hasSuffix(":") { out.append(.init(rotulo: "\(u.label), \(n)", texto: c)) }
            default: continue
            }
        }
        return out
    }
    nonisolated private static func limpa(_ s: String) -> String {
        var l = s.replacingOccurrences(of: "\\s*\\((?:Redação|Incluíd[oa]|Vide|Revogad[oa]|Renumerad[oa]|Vigência)[^)]*\\)", with: "", options: .regularExpression)
        l = l.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
        return l
    }
    nonisolated private static func junta(_ stem: String, _ parte: String) -> String {
        var p = parte.trimmingCharacters(in: CharacterSet(charactersIn: " ;,."))
        if let f = p.first, f.isUppercase, p.count > 1, !p.hasPrefix("I ") { p = f.lowercased() + p.dropFirst() }
        return stem + ": " + p + "."
    }

    /// Diferença palavra a palavra entre original e alterado → (de, para).
    nonisolated static func troca(_ a: String, _ b: String) -> (String, String)? {
        let wa = a.split(separator: " ").map(String.init), wb = b.split(separator: " ").map(String.init)
        var i = 0; while i < min(wa.count, wb.count), wa[i] == wb[i] { i += 1 }
        var ja = wa.count - 1, jb = wb.count - 1
        while ja >= i, jb >= i, wa[ja] == wb[jb] { ja -= 1; jb -= 1 }
        guard i <= ja || i <= jb else { return nil }
        let de = i <= ja ? wa[i...ja].joined(separator: " ") : "∅"
        let para = i <= jb ? wb[i...jb].joined(separator: " ") : "∅"
        return (de, para)
    }

    typealias PoolItem = (LawEntry, LawUnit, Proposicao)

    /// Passo 1: das normas já PARSEADAS (o parse roda fora da MainActor, em
    /// SimuladoLegisSessao.iniciar) às proposições candidatas.
    static func pool(_ parsed: [(LawEntry, [LawUnit])]) -> [PoolItem] {
        var pool: [PoolItem] = []
        for (lei, all) in parsed {
            let units = ArticleStudyView.collapseRedactions(all).units
            for u in units where u.label.lowercased().hasPrefix("art") {
                for p in proposicoes(u) where p.texto.count <= 520 { pool.append((lei, u, p)) }
            }
        }
        return pool
    }

    /// Mantido para quem chama de forma síncrona (parse na MainActor).
    static func gerar(leis: [LawEntry], store: AppStore, n: Int) -> [SimuladoLegisItem] {
        let parsed: [(LawEntry, [LawUnit])] = leis.compactMap { l in store.loadText(for: l).map { (l, LawParser.parse($0)) } }
        return gerar(pool: pool(parsed), n: n)
    }

    /// Passo 2: escolhe metade certa, metade errada (Exporter é MainActor — fica aqui).
    static func gerar(pool poolIn: [PoolItem], n: Int) -> [SimuladoLegisItem] {
        var pool = poolIn
        guard !pool.isEmpty else { return [] }
        pool.shuffle()
        // metade errada: primeiro os que TÊM inversão segura
        let querErrados = n / 2
        var errados: [SimuladoLegisItem] = [], certos: [SimuladoLegisItem] = []
        var usados = Set<String>()
        for (lei, u, p) in pool {
            let key = "\(lei.id)-\(u.key)-\(p.rotulo)"
            if usados.contains(key) { continue }
            let nome = RemissiveIndex.shortName(lei)
            if errados.count < querErrados, let f = Exporter.afirmacaoFalsaAuto(p.texto), f != p.texto {
                let t = troca(p.texto, f)
                errados.append(.init(id: key, lei: nome, leiID: lei.id, artigo: p.rotulo, enunciado: f, certo: false,
                                     original: p.texto, trocaDe: t?.0, trocaPara: t?.1, contexto: u.lines.joined(separator: "\n")))
                usados.insert(key)
            } else if certos.count < n - querErrados {
                certos.append(.init(id: key, lei: nome, leiID: lei.id, artigo: p.rotulo, enunciado: p.texto, certo: true,
                                    original: p.texto, trocaDe: nil, trocaPara: nil, contexto: u.lines.joined(separator: "\n")))
                usados.insert(key)
            }
            if errados.count >= querErrados, certos.count >= n - querErrados { break }
        }
        return (errados + certos).shuffled()
    }

    static func discursivas(leis: [LawEntry], max m: Int) -> [DiscursivaBanco] {
        let apelidos = leis.map { RemissiveIndex.shortName($0).lowercased() }
        let numeros = leis.compactMap { l -> String? in
            let r = l.reference.lowercased()
            guard let m = r.range(of: "\\d[\\d.]*", options: .regularExpression) else { return nil }
            return String(r[m]).replacingOccurrences(of: ".", with: "")
        }
        let banco = SimuladoLocal.bancoDiscursivas().filter { d in
            let cit = d.espelho.flatMap { $0.dispositivos ?? [] }.joined(separator: " | ").lowercased().replacingOccurrences(of: ".", with: "")
            return apelidos.contains { !$0.isEmpty && cit.contains($0) } || numeros.contains { !$0.isEmpty && cit.contains($0) }
        }
        return Array(banco.shuffled().prefix(m))
    }

    // Histórico local (Application Support) — igual ao padrão dos outros caches do módulo.
    struct Registro: Codable, Identifiable { var id: String; var data: Date; var normas: [String]; var n: Int; var acertos: Int; var segundos: Int }
    private static var url: URL {
        let b = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("CatedraLegis", isDirectory: true)
        try? FileManager.default.createDirectory(at: b, withIntermediateDirectories: true)
        return b.appendingPathComponent("simulados-lei-seca.json")
    }
    static func historico() -> [Registro] { (try? JSONDecoder().decode([Registro].self, from: Data(contentsOf: url))) ?? [] }
    static func registrar(_ r: Registro) { var h = historico(); h.insert(r, at: 0); h = Array(h.prefix(60)); try? JSONEncoder().encode(h).write(to: url) }
}

/// Estado da PROVA EM CURSO, fora da view: clicar em qualquer item da sidebar troca o
/// `path` e destrói a tela — com tudo em `@State`, 30 min de prova sumiam num clique.
/// Aqui a prova sobrevive à navegação e o Início mostra "prova em curso".
@MainActor
final class SimuladoLegisSessao: ObservableObject {
    static let shared = SimuladoLegisSessao()
    @Published var itens: [SimuladoLegisItem] = []
    @Published var discursivas: [DiscursivaBanco] = []
    @Published var respostas: [String: Bool] = [:]
    @Published var marcadas: Set<String> = []
    @Published var atual = 0
    @Published var inicio: Date? = nil
    @Published var minutos = 40
    @Published var entregue = false
    @Published var gerando = false

    var emCurso: Bool { !itens.isEmpty && !entregue }
    var acertos: Int { itens.filter { respostas[$0.id] == $0.certo }.count }
    var respondidas: Int { itens.filter { respostas[$0.id] != nil }.count }
    func restante(em agora: Date) -> Int {
        guard let i = inicio else { return minutos * 60 }
        return max(0, minutos * 60 - Int(agora.timeIntervalSince(i)))
    }
    func decorrido(em agora: Date) -> Int {
        guard let i = inicio else { return 0 }
        return Int(agora.timeIntervalSince(i))
    }
    func limpar() { itens = []; discursivas = []; respostas = [:]; marcadas = []; atual = 0; inicio = nil; entregue = false }

    /// Gera a prova: o parse das normas (o que trava) roda fora da MainActor; a escolha
    /// dos itens errados (Exporter, MainActor) fica aqui, barata.
    func iniciar(leis: [LawEntry], store: AppStore, n: Int, m: Int, minutos: Int) {
        guard !gerando else { return }
        gerando = true
        self.minutos = minutos
        let textos: [(LawEntry, String)] = leis.compactMap { l in store.loadText(for: l).map { (l, $0) } }
        Task { [weak self] in
            let parsed: [(LawEntry, [LawUnit])] = await Task.detached(priority: .userInitiated) {
                textos.map { ($0.0, LawParser.parse($0.1)) }
            }.value
            guard let self else { return }
            let pool = SimuladoLegisLocal.pool(parsed)
            self.itens = SimuladoLegisLocal.gerar(pool: pool, n: n)
            self.discursivas = SimuladoLegisLocal.discursivas(leis: leis, max: m)
            self.respostas = [:]; self.marcadas = []; self.atual = 0; self.entregue = false
            self.inicio = Date()
            self.gerando = false
        }
    }

    func entregar() {
        guard !entregue, !itens.isEmpty else { return }
        entregue = true
        SimuladoLegisLocal.registrar(.init(id: UUID().uuidString, data: Date(), normas: Set(itens.map(\.lei)).sorted(),
                                           n: itens.count, acertos: acertos, segundos: decorrido(em: Date())))
    }
}

struct SimuladoLegisView: View {
    @EnvironmentObject var store: AppStore
    @ObservedObject private var sessao = SimuladoLegisSessao.shared
    var openLaw: (UUID) -> Void = { _ in }
    // configuração
    @State private var escolhidas: Set<UUID> = []
    @State private var n = 20
    @State private var m = 2
    @State private var minutos = 40
    @State private var busca = ""
    @State private var categoria: LawCategory? = nil
    // prova
    @State private var agora = Date()
    @State private var confirmarEntrega = false
    @State private var confirmarAbandono = false
    @State private var mostrarDiscursivas = false
    @AppStorage("readerFontSize") private var fontSize = 16.0
    @AppStorage("readerFontFamily") private var fontFamily = "Sistema (Serifa)"
    private let relogio = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    private var leis: [LawEntry] { store.laws.filter { $0.isRegularLaw && (categoria == nil || $0.category == categoria!) } }
    private var filtradas: [LawEntry] {
        let q = busca.folding(options: .diacriticInsensitive, locale: nil).lowercased()
        return q.isEmpty ? leis : leis.filter { $0.title.folding(options: .diacriticInsensitive, locale: nil).lowercased().contains(q) }
    }
    private var itens: [SimuladoLegisItem] { sessao.itens }
    private var restante: Int { sessao.restante(em: agora) }
    private func hms(_ s: Int) -> String { String(format: "%02d:%02d", s / 60, s % 60) }
    private func leitura(_ size: Double, _ weight: Font.Weight = .regular) -> Font {
        AppTheme.readerFont(size: size, family: fontFamily, weight: weight)
    }

    private var shellSubtitle: String {
        if sessao.emCurso { return Set(itens.map(\.lei)).sorted().joined(separator: " · ") + " · \(itens.count) itens C/E" }
        if sessao.entregue { return "Relatório da prova — nota, acerto por norma e gabarito comentado" }
        return "Proposições do texto oficial, metade com o núcleo trocado — você julga Certo ou Errado, como na banca"
    }

    /// Cronômetro da prova no cabeçalho (o `trailing` do SectionShell).
    private var shellTrailing: AnyView? {
        guard sessao.emCurso else { return nil }
        return AnyView(
            VStack(alignment: .trailing, spacing: 2) {
                Text(hms(restante)).font(Typo.num(24, .heavy))
                    .foregroundStyle(restante < 300 ? AppTheme.danger : AppTheme.ink)
                Text("restante · \(sessao.respondidas)/\(itens.count) respondidas")
                    .font(.system(size: 11)).foregroundStyle(AppTheme.secondaryInk)
            }
        )
    }

    var body: some View {
        SectionShell(icon: "checkmark.seal", title: "Simulado de lei seca",
                     subtitle: shellSubtitle,
                     count: sessao.emCurso || sessao.entregue ? itens.count : nil,
                     search: itens.isEmpty && !sessao.gerando ? $busca : nil, searchPrompt: "Filtrar normas",
                     trailing: shellTrailing) {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if sessao.gerando { gerandoView }
                    else if itens.isEmpty { configuracao }
                    else if sessao.entregue { relatorio }
                    else { prova }
                }
                .padding(22)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .onAppear { agora = Date() }
        .onReceive(relogio) { t in
            agora = t
            if sessao.emCurso, sessao.inicio != nil, restante == 0 { sessao.entregar() }
        }
        .alert("Entregar a prova?", isPresented: $confirmarEntrega) {
            Button("Entregar", role: .destructive) { sessao.entregar() }
            Button("Continuar", role: .cancel) {}
        } message: { Text("\(sessao.respondidas) de \(itens.count) respondidas" + (itens.count - sessao.respondidas > 0 ? " — as em branco contam como erro." : ".")) }
        .alert("Abandonar a prova?", isPresented: $confirmarAbandono) {
            Button("Abandonar", role: .destructive) { sessao.limpar() }
            Button("Continuar a prova", role: .cancel) {}
        } message: { Text("As respostas desta prova serão descartadas e ela não entra no histórico.") }
    }

    private var gerandoView: some View {
        HStack(spacing: 10) {
            ProgressView().controlSize(.small)
            Text("Montando a prova a partir do texto oficial…").font(.system(size: 13)).foregroundStyle(AppTheme.secondaryInk)
        }
        .padding(.vertical, 30)
    }

    // MARK: configuração
    private var configuracao: some View {
        VStack(alignment: .leading, spacing: 14) {
            LegisSectionHeader(title: "Matéria", icon: "tag")
            LegisFlow {
                LegisFilterChip("Todas as matérias", on: categoria == nil) { categoria = nil }
                ForEach(LawCategory.allCases) { c in LegisFilterChip(c.rawValue, on: categoria == c, tint: c.color) { categoria = c } }
            }
            LegisSectionHeader(title: "Normas", icon: "books.vertical", count: escolhidas.isEmpty ? nil : escolhidas.count)
            LegisFlow {
                ForEach(filtradas.prefix(80)) { l in
                    LegisFilterChip(RemissiveIndex.shortName(l), on: escolhidas.contains(l.id)) {
                        if escolhidas.contains(l.id) { escolhidas.remove(l.id) } else { escolhidas.insert(l.id) }
                    }
                }
            }
            if !escolhidas.isEmpty {
                Text("Selecionadas: " + store.laws.filter { escolhidas.contains($0.id) }.map { RemissiveIndex.shortName($0) }.joined(separator: " · "))
                    .font(.system(size: 12.5, weight: .semibold)).foregroundStyle(AppTheme.ink)
            }
            LegisSectionHeader(title: "Prova", icon: "slider.horizontal.3")
            LegisFlow(espacamento: 18) {
                Stepper("Itens: \(n)", value: $n, in: 10...120, step: 10)
                Stepper("Discursivas: \(m)", value: $m, in: 0...10)
                Stepper("Tempo: \(minutos) min", value: $minutos, in: 10...300, step: 10)
            }.font(.system(size: 13))
            Button {
                let sel = store.laws.filter { escolhidas.contains($0.id) }
                mostrarDiscursivas = false
                sessao.iniciar(leis: sel, store: store, n: n, m: m, minutos: minutos)
            } label: { Label("Iniciar prova", systemImage: "play.fill") }
            .buttonStyle(.legisPrimary).disabled(escolhidas.isEmpty)
            let hist = SimuladoLegisLocal.historico()
            if !hist.isEmpty {
                LegisSectionHeader(title: "Provas anteriores", icon: "clock.arrow.circlepath", count: hist.count).padding(.top, 10)
                ForEach(hist.prefix(8)) { h in
                    HStack {
                        Text(h.data.formatted(date: .abbreviated, time: .shortened)).font(.system(size: 12)).foregroundStyle(AppTheme.secondaryInk)
                        Text(h.normas.joined(separator: ", ")).font(.system(size: 12.5, weight: .semibold)).foregroundStyle(AppTheme.ink).lineLimit(1)
                        Spacer()
                        Text("\(h.acertos)/\(h.n) · \(hms(h.segundos))").font(Typo.num(12)).foregroundStyle(AppTheme.ink)
                    }
                    .padding(10).legisCard(radius: AppTheme.rInner)
                }
            }
        }
    }

    // MARK: prova (uma questão por tela)
    private var prova: some View {
        VStack(alignment: .leading, spacing: 14) {
            // grade de navegação
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 34), spacing: 6)], spacing: 6) {
                ForEach(Array(itens.enumerated()), id: \.element.id) { i, it in
                    let resp = sessao.respostas[it.id] != nil, marc = sessao.marcadas.contains(it.id)
                    Button { sessao.atual = i } label: {
                        Text("\(i + 1)").font(Typo.num(12))
                            .frame(width: 34, height: 30)
                            .background(RoundedRectangle(cornerRadius: AppTheme.rInner, style: .continuous)
                                .fill(i == sessao.atual ? ThemeState.t.accent : (resp ? ThemeState.t.accent.opacity(0.18) : AppTheme.elevatedSurface)))
                            .overlay(RoundedRectangle(cornerRadius: AppTheme.rInner, style: .continuous)
                                .strokeBorder(marc ? AppTheme.warn : AppTheme.hairline, lineWidth: marc ? 2 : 1))
                            .foregroundStyle(i == sessao.atual ? Color.white : AppTheme.ink)
                    }.buttonStyle(.plain)
                }
            }
            // questão atual
            if sessao.atual < itens.count {
                let it = itens[sessao.atual]
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text(String(format: "Questão %02d", sessao.atual + 1)).font(.system(size: 13, weight: .heavy)).foregroundStyle(AppTheme.secondaryInk)
                        LegisChip("\(it.lei) · \(it.artigo)", tint: AppTheme.secondaryInk, variant: .soft, size: 11.5)
                        Spacer()
                        Button {
                            if sessao.marcadas.contains(it.id) { sessao.marcadas.remove(it.id) } else { sessao.marcadas.insert(it.id) }
                        } label: {
                            Label(sessao.marcadas.contains(it.id) ? "Marcada para revisar" : "Marcar para revisar",
                                  systemImage: sessao.marcadas.contains(it.id) ? "flag.fill" : "flag")
                        }.buttonStyle(.legisGhost(AppTheme.warn))
                    }
                    Text("Julgue o item a seguir, conforme a literalidade da norma:").font(.system(size: 12.5)).foregroundStyle(AppTheme.secondaryInk)
                    Text(it.enunciado).font(leitura(fontSize)).lineSpacing(4).foregroundStyle(AppTheme.ink).textSelection(.enabled)
                    HStack(spacing: 10) {
                        ForEach([true, false], id: \.self) { v in
                            let sel = sessao.respostas[it.id] == v
                            Button(v ? "CERTO" : "ERRADO") { sessao.respostas[it.id] = v }
                                .font(.system(size: 13, weight: .heavy))
                                .buttonStyle(.bordered).tint(sel ? ThemeState.t.accent : .gray)
                                .controlSize(.large)
                        }
                        if sessao.respostas[it.id] != nil { Button("Limpar") { sessao.respostas[it.id] = nil }.buttonStyle(.legisGhost) }
                    }
                }
                .padding(18)
                .legisCard(tint: ThemeState.t.accent)
            }
            HStack {
                Button { sessao.atual = max(0, sessao.atual - 1) } label: { Label("Anterior", systemImage: "chevron.left") }.buttonStyle(.bordered).disabled(sessao.atual == 0)
                Button { sessao.atual = min(itens.count - 1, sessao.atual + 1) } label: { Label("Próxima", systemImage: "chevron.right") }.buttonStyle(.bordered).disabled(sessao.atual >= itens.count - 1)
                Spacer()
                if !sessao.discursivas.isEmpty {
                    Button(mostrarDiscursivas ? "Ocultar discursivas" : "Discursivas (\(sessao.discursivas.count))") { mostrarDiscursivas.toggle() }.buttonStyle(.bordered)
                }
                Button("Abandonar") { confirmarAbandono = true }.buttonStyle(.legisGhost(AppTheme.danger))
                Button { confirmarEntrega = true } label: { Label("Entregar prova", systemImage: "checkmark.seal.fill") }.buttonStyle(.legisPrimary)
            }
            if mostrarDiscursivas { blocoDiscursivas(gabarito: false) }
        }
    }

    // MARK: relatório
    private var relatorio: some View {
        let porLei = Dictionary(grouping: itens, by: \.lei).map { (k, v) in (k, v.filter { sessao.respostas[$0.id] == $0.certo }.count, v.count) }.sorted { $0.0 < $1.0 }
        let nota = itens.isEmpty ? 0 : Double(sessao.acertos) / Double(itens.count) * 10
        let erradas = itens.filter { sessao.respostas[$0.id] != $0.certo }
        return VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .firstTextBaseline) {
                Text("Resultado").font(AppTheme.displayFont(28, .heavy)).tracking(-0.5).foregroundStyle(AppTheme.ink)
                Spacer()
                if !erradas.isEmpty {
                    // O erro não morre no relatório: vira "Difícil" no domínio do artigo,
                    // que alimenta a revisão do leitor.
                    Button { marcarErradasComoDificeis(erradas) } label: { Label("Marcar erradas como Difícil", systemImage: "exclamationmark.triangle") }
                        .buttonStyle(.bordered)
                }
                Button("Nova prova") { sessao.limpar() }.buttonStyle(.legisPrimary)
            }
            LegisFlow(espacamento: 22) {
                kpi("Nota", String(format: "%.1f", nota))
                kpi("Acertos", "\(sessao.acertos)/\(itens.count)")
                kpi("Em branco", "\(itens.count - sessao.respondidas)")
                kpi("Tempo", hms(sessao.decorrido(em: agora)))
            }
            VStack(alignment: .leading, spacing: 6) {
                LegisSectionHeader(title: "Por norma", icon: "books.vertical")
                ForEach(porLei, id: \.0) { k, a, t in
                    HStack {
                        Text(k).font(.system(size: 13, weight: .semibold)).foregroundStyle(AppTheme.ink).frame(width: 160, alignment: .leading)
                        GeometryReader { g in ZStack(alignment: .leading) { Capsule().fill(AppTheme.hairline); Capsule().fill(ThemeState.t.accent).frame(width: g.size.width * CGFloat(a) / CGFloat(max(1, t))) } }.frame(height: 8)
                        Text("\(a)/\(t)").font(Typo.num(12)).foregroundStyle(AppTheme.ink).frame(width: 60, alignment: .trailing)
                    }
                }
            }
            .padding(14).legisCard()
            LegisSectionHeader(title: "Gabarito comentado", icon: "text.book.closed", count: itens.count).padding(.top, 6)
            ForEach(Array(itens.enumerated()), id: \.element.id) { i, it in
                let r = sessao.respostas[it.id]
                let ok = r == it.certo
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(String(format: "Questão %02d", i + 1)).font(.system(size: 12, weight: .heavy)).foregroundStyle(AppTheme.secondaryInk)
                        LegisChip("\(it.lei) · \(it.artigo)", tint: AppTheme.secondaryInk, variant: .soft)
                        Spacer()
                        LegisChip(r == nil ? "EM BRANCO" : (ok ? "ACERTOU" : "ERROU"),
                                  tint: r == nil ? AppTheme.secondaryInk : (ok ? AppTheme.ok : AppTheme.danger), variant: .filled)
                        Button { openLaw(it.leiID) } label: { Image(systemName: "book") }.buttonStyle(.legisGhost)
                    }
                    Text(it.enunciado).font(leitura(fontSize - 2)).lineSpacing(3).foregroundStyle(AppTheme.ink)
                    HStack(spacing: 12) {
                        Text("Gabarito: \(it.certo ? "CERTO" : "ERRADO")").font(.system(size: 12.5, weight: .heavy)).foregroundStyle(it.certo ? AppTheme.ok : AppTheme.danger)
                        if let r { Text("Você: \(r ? "Certo" : "Errado")").font(.system(size: 12)).foregroundStyle(AppTheme.secondaryInk) }
                    }
                    if !it.certo, let de = it.trocaDe, let para = it.trocaPara {
                        (Text("O item trocou ").font(.system(size: 12.5)) + Text("“\(de)”").font(.system(size: 12.5, weight: .bold)).foregroundStyle(AppTheme.ok)
                         + Text(" por ").font(.system(size: 12.5)) + Text("“\(para)”").font(.system(size: 12.5, weight: .bold)).foregroundStyle(AppTheme.danger) + Text(".").font(.system(size: 12.5)))
                    }
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Texto oficial — \(it.lei), \(it.artigo)").font(.system(size: 11, weight: .heavy)).foregroundStyle(AppTheme.secondaryInk)
                        Text(it.original).font(leitura(fontSize - 3.5)).lineSpacing(2).foregroundStyle(AppTheme.ink).textSelection(.enabled)
                    }
                    .padding(10).background(RoundedRectangle(cornerRadius: AppTheme.rInner, style: .continuous).fill(AppTheme.hairline.opacity(0.18)))
                }
                .padding(14)
                .legisCard(tint: ok || r == nil ? nil : AppTheme.danger, spine: !(ok || r == nil),
                           stroke: ok || r == nil ? nil : AppTheme.danger.opacity(0.5))
            }
            if !sessao.discursivas.isEmpty { blocoDiscursivas(gabarito: true) }
        }
    }

    /// Erro no simulado → "Difícil" no domínio do artigo (store.setMastery), o mesmo
    /// sinal que o dock do leitor grava — sem inventar dado novo.
    private func marcarErradasComoDificeis(_ erradas: [SimuladoLegisItem]) {
        for it in erradas {
            guard let lei = store.laws.first(where: { $0.id == it.leiID }),
                  let texto = store.loadText(for: lei) else { continue }
            let numero = ArticleStudyView.articleNumberKey(it.artigo.components(separatedBy: ",").first ?? it.artigo)
            if let u = LawParser.parse(texto).first(where: { ArticleStudyView.articleNumberKey($0.label) == numero }) {
                store.setMastery("dificil", lawID: lei.id, unitKey: u.key)
            }
        }
    }

    @ViewBuilder private func blocoDiscursivas(gabarito: Bool) -> some View {
        LegisSectionHeader(title: "Questões discursivas", icon: "pencil.line", count: sessao.discursivas.count).padding(.top, 8)
        ForEach(Array(sessao.discursivas.enumerated()), id: \.element.id) { i, d in
            VStack(alignment: .leading, spacing: 8) {
                Text(String(format: "Discursiva %02d — ", i + 1) + d.tema).font(AppTheme.displayFont(14, .heavy)).foregroundStyle(AppTheme.ink)
                Text("\(d.orgao) · \(d.ano.map(String.init) ?? "") · \(d.banca)").font(.system(size: 11.5)).foregroundStyle(AppTheme.secondaryInk)
                Text(d.enunciado).font(leitura(fontSize - 2.5)).lineSpacing(2).foregroundStyle(AppTheme.ink).textSelection(.enabled)
                if gabarito {
                    Text("Padrão de resposta (espelho oficial)").font(.system(size: 12, weight: .heavy)).foregroundStyle(AppTheme.ink).padding(.top, 4)
                    if d.espelho.isEmpty { Text("A banca não publicou o espelho desta questão.").font(.system(size: 12)).foregroundStyle(AppTheme.secondaryInk) }
                    ForEach(Array(d.espelho.enumerated()), id: \.offset) { j, q in
                        HStack(alignment: .top, spacing: 6) {
                            Text("\(j + 1).").font(.system(size: 12, weight: .bold)).foregroundStyle(AppTheme.ink)
                            Text(q.quesito + (q.pontos.map { "  (\($0) pt)" } ?? "")).font(.system(size: 12.5)).foregroundStyle(AppTheme.secondaryInk)
                        }
                    }
                } else {
                    Text("Responda no papel ou na Redação; o espelho aparece no relatório.").font(.system(size: 12)).foregroundStyle(AppTheme.secondaryInk)
                }
            }
            .padding(14).legisCard()
        }
    }

    private func kpi(_ t: String, _ v: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(t.uppercased()).font(.system(size: 10, weight: .bold)).tracking(0.8).foregroundStyle(AppTheme.secondaryInk)
            Text(v).font(Typo.num(22, .heavy)).foregroundStyle(AppTheme.ink)
        }
    }
}
