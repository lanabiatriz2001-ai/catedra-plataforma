import SwiftUI

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
    static func proposicoes(_ u: LawUnit) -> [Proposicao] {
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
    private static func limpa(_ s: String) -> String {
        var l = s.replacingOccurrences(of: "\\s*\\((?:Redação|Incluíd[oa]|Vide|Revogad[oa]|Renumerad[oa]|Vigência)[^)]*\\)", with: "", options: .regularExpression)
        l = l.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
        return l
    }
    private static func junta(_ stem: String, _ parte: String) -> String {
        var p = parte.trimmingCharacters(in: CharacterSet(charactersIn: " ;,."))
        if let f = p.first, f.isUppercase, p.count > 1, !p.hasPrefix("I ") { p = f.lowercased() + p.dropFirst() }
        return stem + ": " + p + "."
    }

    /// Diferença palavra a palavra entre original e alterado → (de, para).
    static func troca(_ a: String, _ b: String) -> (String, String)? {
        let wa = a.split(separator: " ").map(String.init), wb = b.split(separator: " ").map(String.init)
        var i = 0; while i < min(wa.count, wb.count), wa[i] == wb[i] { i += 1 }
        var ja = wa.count - 1, jb = wb.count - 1
        while ja >= i, jb >= i, wa[ja] == wb[jb] { ja -= 1; jb -= 1 }
        guard i <= ja || i <= jb else { return nil }
        let de = i <= ja ? wa[i...ja].joined(separator: " ") : "∅"
        let para = i <= jb ? wb[i...jb].joined(separator: " ") : "∅"
        return (de, para)
    }

    static func gerar(leis: [LawEntry], store: AppStore, n: Int) -> [SimuladoLegisItem] {
        var pool: [(LawEntry, LawUnit, Proposicao)] = []
        for lei in leis {
            guard let texto = store.loadText(for: lei) else { continue }
            let units = ArticleStudyView.collapseRedactions(LawParser.parse(texto)).units
            for u in units where u.label.lowercased().hasPrefix("art") {
                for p in proposicoes(u) where p.texto.count <= 520 { pool.append((lei, u, p)) }
            }
        }
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

struct SimuladoLegisView: View {
    @EnvironmentObject var store: AppStore
    var openLaw: (UUID) -> Void = { _ in }
    // configuração
    @State private var escolhidas: Set<UUID> = []
    @State private var n = 20
    @State private var m = 2
    @State private var minutos = 40
    @State private var busca = ""
    @State private var categoria: LawCategory? = nil
    // prova
    @State private var itens: [SimuladoLegisItem] = []
    @State private var discursivas: [DiscursivaBanco] = []
    @State private var respostas: [String: Bool] = [:]
    @State private var marcadas: Set<String> = []
    @State private var atual = 0
    @State private var inicio: Date? = nil
    @State private var agora = Date()
    @State private var entregue = false
    @State private var confirmarEntrega = false
    @State private var mostrarDiscursivas = false
    private let relogio = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    private var leis: [LawEntry] { store.laws.filter { $0.isRegularLaw && (categoria == nil || $0.category == categoria!) } }
    private var filtradas: [LawEntry] {
        let q = busca.folding(options: .diacriticInsensitive, locale: nil).lowercased()
        return q.isEmpty ? leis : leis.filter { $0.title.folding(options: .diacriticInsensitive, locale: nil).lowercased().contains(q) }
    }
    private var acertos: Int { itens.filter { respostas[$0.id] == $0.certo }.count }
    private var respondidas: Int { itens.filter { respostas[$0.id] != nil }.count }
    private var restante: Int { guard let i = inicio else { return minutos * 60 }; return max(0, minutos * 60 - Int(agora.timeIntervalSince(i))) }
    private var decorrido: Int { guard let i = inicio else { return 0 }; return Int(agora.timeIntervalSince(i)) }
    private func hms(_ s: Int) -> String { String(format: "%02d:%02d", s / 60, s % 60) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if itens.isEmpty { configuracao }
                else if entregue { relatorio }
                else { prova }
            }
            .padding(.horizontal, 28).padding(.vertical, 24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(AppTheme.surface)
        .onReceive(relogio) { t in
            agora = t
            if !entregue, inicio != nil, restante == 0, !itens.isEmpty { entregar() }
        }
        .alert("Entregar a prova?", isPresented: $confirmarEntrega) {
            Button("Entregar", role: .destructive) { entregar() }
            Button("Continuar", role: .cancel) {}
        } message: { Text("\(respondidas) de \(itens.count) respondidas" + (itens.count - respondidas > 0 ? " — as em branco contam como erro." : ".")) }
    }

    // MARK: configuração
    private var configuracao: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Simulado de lei seca").font(.system(size: 30, weight: .heavy)).tracking(-0.6)
            Text("Monte a prova: escolha as normas, o número de itens e o tempo. Os itens são proposições do texto oficial; metade deles tem o núcleo trocado (prazo, competência, percentual, operador) — você julga Certo ou Errado, como na banca.")
                .font(.system(size: 13)).foregroundStyle(.secondary)
            // matéria
            LegisFlow {
                chip("Todas as matérias", on: categoria == nil) { categoria = nil }
                ForEach(LawCategory.allCases) { c in chip(c.rawValue, on: categoria == c) { categoria = c } }
            }
            TextField("Filtrar normas…", text: $busca).textFieldStyle(.roundedBorder).frame(maxWidth: 380)
            LegisFlow {
                ForEach(filtradas.prefix(80)) { l in
                    chip(RemissiveIndex.shortName(l), on: escolhidas.contains(l.id)) {
                        if escolhidas.contains(l.id) { escolhidas.remove(l.id) } else { escolhidas.insert(l.id) }
                    }
                }
            }
            if !escolhidas.isEmpty {
                Text("Selecionadas: " + store.laws.filter { escolhidas.contains($0.id) }.map { RemissiveIndex.shortName($0) }.joined(separator: " · "))
                    .font(.system(size: 12.5, weight: .semibold))
            }
            HStack(spacing: 18) {
                Stepper("Itens: \(n)", value: $n, in: 10...120, step: 10)
                Stepper("Discursivas: \(m)", value: $m, in: 0...10)
                Stepper("Tempo: \(minutos) min", value: $minutos, in: 10...300, step: 10)
            }.font(.system(size: 13))
            Button {
                let sel = store.laws.filter { escolhidas.contains($0.id) }
                itens = SimuladoLegisLocal.gerar(leis: sel, store: store, n: n)
                discursivas = SimuladoLegisLocal.discursivas(leis: sel, max: m)
                respostas = [:]; marcadas = []; atual = 0; entregue = false; inicio = Date(); agora = Date()
            } label: { Label("Iniciar prova", systemImage: "play.fill") }
            .buttonStyle(.borderedProminent).disabled(escolhidas.isEmpty)
            let hist = SimuladoLegisLocal.historico()
            if !hist.isEmpty {
                Text("Provas anteriores").font(.system(size: 13, weight: .heavy)).padding(.top, 10)
                ForEach(hist.prefix(8)) { h in
                    HStack {
                        Text(h.data.formatted(date: .abbreviated, time: .shortened)).font(.system(size: 12)).foregroundStyle(.secondary)
                        Text(h.normas.joined(separator: ", ")).font(.system(size: 12.5, weight: .semibold)).lineLimit(1)
                        Spacer()
                        Text("\(h.acertos)/\(h.n) · \(hms(h.segundos))").font(.system(size: 12, weight: .bold, design: .monospaced))
                    }
                    .padding(10).background(RoundedRectangle(cornerRadius: 10).fill(AppTheme.elevatedSurface)).overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(AppTheme.hairline))
                }
            }
        }
    }

    // MARK: prova (uma questão por tela)
    private var prova: some View {
        VStack(alignment: .leading, spacing: 14) {
            // cabeçalho da prova
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Simulado de lei seca").font(.system(size: 22, weight: .heavy)).tracking(-0.4)
                    Text(Set(itens.map(\.lei)).sorted().joined(separator: " · ") + " · \(itens.count) itens C/E").font(.system(size: 12)).foregroundStyle(.secondary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(hms(restante)).font(.system(size: 26, weight: .heavy, design: .monospaced)).foregroundStyle(restante < 300 ? .red : AppTheme.ink)
                    Text("restante · \(respondidas)/\(itens.count) respondidas").font(.system(size: 11)).foregroundStyle(.secondary)
                }
            }
            // grade de navegação
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 34), spacing: 6)], spacing: 6) {
                ForEach(Array(itens.enumerated()), id: \.element.id) { i, it in
                    let resp = respostas[it.id] != nil, marc = marcadas.contains(it.id)
                    Button { atual = i } label: {
                        Text("\(i + 1)").font(.system(size: 12, weight: .bold, design: .monospaced))
                            .frame(width: 34, height: 30)
                            .background(RoundedRectangle(cornerRadius: 7).fill(i == atual ? Color.accentColor : (resp ? Color.accentColor.opacity(0.18) : AppTheme.elevatedSurface)))
                            .overlay(RoundedRectangle(cornerRadius: 7).strokeBorder(marc ? Color.orange : AppTheme.hairline, lineWidth: marc ? 2 : 1))
                            .foregroundStyle(i == atual ? Color.white : AppTheme.ink)
                    }.buttonStyle(.plain)
                }
            }
            // questão atual
            if atual < itens.count {
                let it = itens[atual]
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text(String(format: "Questão %02d", atual + 1)).font(.system(size: 13, weight: .heavy)).foregroundStyle(.secondary)
                        Text("\(it.lei) · \(it.artigo)").font(.system(size: 11.5, weight: .semibold))
                            .padding(.horizontal, 8).padding(.vertical, 3).background(Capsule().fill(AppTheme.hairline.opacity(0.4)))
                        Spacer()
                        Button { if marcadas.contains(it.id) { marcadas.remove(it.id) } else { marcadas.insert(it.id) } } label: {
                            Label(marcadas.contains(it.id) ? "Marcada para revisar" : "Marcar para revisar", systemImage: marcadas.contains(it.id) ? "flag.fill" : "flag")
                        }.buttonStyle(.borderless).font(.caption).tint(.orange)
                    }
                    Text("Julgue o item a seguir, conforme a literalidade da norma:").font(.system(size: 12.5)).foregroundStyle(.secondary)
                    Text(it.enunciado).font(.system(size: 16)).lineSpacing(4).textSelection(.enabled)
                    HStack(spacing: 10) {
                        ForEach([true, false], id: \.self) { v in
                            let sel = respostas[it.id] == v
                            Button(v ? "CERTO" : "ERRADO") { respostas[it.id] = v }
                                .font(.system(size: 13, weight: .heavy))
                                .buttonStyle(.bordered).tint(sel ? .accentColor : .gray)
                                .controlSize(.large)
                        }
                        if respostas[it.id] != nil { Button("Limpar") { respostas[it.id] = nil }.buttonStyle(.borderless).font(.caption) }
                    }
                }
                .padding(18)
                .background(RoundedRectangle(cornerRadius: 14).fill(AppTheme.elevatedSurface))
                .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(AppTheme.hairline))
            }
            HStack {
                Button { atual = max(0, atual - 1) } label: { Label("Anterior", systemImage: "chevron.left") }.buttonStyle(.bordered).disabled(atual == 0)
                Button { atual = min(itens.count - 1, atual + 1) } label: { Label("Próxima", systemImage: "chevron.right") }.buttonStyle(.bordered).disabled(atual >= itens.count - 1)
                Spacer()
                if !discursivas.isEmpty {
                    Button(mostrarDiscursivas ? "Ocultar discursivas" : "Discursivas (\(discursivas.count))") { mostrarDiscursivas.toggle() }.buttonStyle(.bordered)
                }
                Button { confirmarEntrega = true } label: { Label("Entregar prova", systemImage: "checkmark.seal.fill") }.buttonStyle(.borderedProminent)
            }
            if mostrarDiscursivas { blocoDiscursivas(gabarito: false) }
        }
    }

    private func entregar() {
        guard !entregue else { return }
        entregue = true
        SimuladoLegisLocal.registrar(.init(id: UUID().uuidString, data: Date(), normas: Set(itens.map(\.lei)).sorted(), n: itens.count, acertos: acertos, segundos: decorrido))
    }

    // MARK: relatório
    private var relatorio: some View {
        let porLei = Dictionary(grouping: itens, by: \.lei).map { (k, v) in (k, v.filter { respostas[$0.id] == $0.certo }.count, v.count) }.sorted { $0.0 < $1.0 }
        let nota = itens.isEmpty ? 0 : Double(acertos) / Double(itens.count) * 10
        return VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .firstTextBaseline) {
                Text("Resultado").font(.system(size: 28, weight: .heavy)).tracking(-0.5)
                Spacer()
                Button("Nova prova") { itens = []; discursivas = []; entregue = false; inicio = nil }.buttonStyle(.bordered)
            }
            HStack(spacing: 22) {
                kpi("Nota", String(format: "%.1f", nota))
                kpi("Acertos", "\(acertos)/\(itens.count)")
                kpi("Em branco", "\(itens.count - respondidas)")
                kpi("Tempo", hms(decorrido))
            }
            VStack(alignment: .leading, spacing: 6) {
                Text("Por norma").font(.system(size: 13, weight: .heavy))
                ForEach(porLei, id: \.0) { k, a, t in
                    HStack {
                        Text(k).font(.system(size: 13, weight: .semibold)).frame(width: 160, alignment: .leading)
                        GeometryReader { g in ZStack(alignment: .leading) { Capsule().fill(AppTheme.hairline); Capsule().fill(Color.accentColor).frame(width: g.size.width * CGFloat(a) / CGFloat(max(1, t))) } }.frame(height: 8)
                        Text("\(a)/\(t)").font(.system(size: 12, weight: .bold, design: .monospaced)).frame(width: 60, alignment: .trailing)
                    }
                }
            }
            .padding(14).background(RoundedRectangle(cornerRadius: 12).fill(AppTheme.elevatedSurface)).overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(AppTheme.hairline))
            Text("Gabarito comentado").font(.system(size: 18, weight: .heavy)).padding(.top, 6)
            ForEach(Array(itens.enumerated()), id: \.element.id) { i, it in
                let r = respostas[it.id]
                let ok = r == it.certo
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(String(format: "Questão %02d", i + 1)).font(.system(size: 12, weight: .heavy)).foregroundStyle(.secondary)
                        Text("\(it.lei) · \(it.artigo)").font(.system(size: 11, weight: .semibold)).padding(.horizontal, 7).padding(.vertical, 2).background(Capsule().fill(AppTheme.hairline.opacity(0.4)))
                        Spacer()
                        Text(r == nil ? "EM BRANCO" : (ok ? "ACERTOU" : "ERROU")).font(.system(size: 11, weight: .heavy))
                            .foregroundStyle(r == nil ? .gray : (ok ? .green : .red))
                        Button { openLaw(it.leiID) } label: { Image(systemName: "book") }.buttonStyle(.borderless)
                    }
                    Text(it.enunciado).font(.system(size: 14)).lineSpacing(3)
                    HStack(spacing: 12) {
                        Text("Gabarito: \(it.certo ? "CERTO" : "ERRADO")").font(.system(size: 12.5, weight: .heavy)).foregroundStyle(it.certo ? .green : .red)
                        if let r { Text("Você: \(r ? "Certo" : "Errado")").font(.system(size: 12)).foregroundStyle(.secondary) }
                    }
                    if !it.certo, let de = it.trocaDe, let para = it.trocaPara {
                        (Text("O item trocou ").font(.system(size: 12.5)) + Text("“\(de)”").font(.system(size: 12.5, weight: .bold)).foregroundStyle(.green)
                         + Text(" por ").font(.system(size: 12.5)) + Text("“\(para)”").font(.system(size: 12.5, weight: .bold)).foregroundStyle(.red) + Text(".").font(.system(size: 12.5)))
                    }
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Texto oficial — \(it.lei), \(it.artigo)").font(.system(size: 11, weight: .heavy)).foregroundStyle(.secondary)
                        Text(it.original).font(.system(size: 12.5)).lineSpacing(2).textSelection(.enabled)
                    }
                    .padding(10).background(RoundedRectangle(cornerRadius: 8).fill(AppTheme.hairline.opacity(0.18)))
                }
                .padding(14)
                .background(RoundedRectangle(cornerRadius: 12).fill(AppTheme.elevatedSurface))
                .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(ok || r == nil ? AppTheme.hairline : Color.red.opacity(0.5)))
            }
            if !discursivas.isEmpty { blocoDiscursivas(gabarito: true) }
        }
    }

    @ViewBuilder private func blocoDiscursivas(gabarito: Bool) -> some View {
        Text("Questões discursivas · \(discursivas.count)").font(.system(size: 18, weight: .heavy)).padding(.top, 8)
        ForEach(Array(discursivas.enumerated()), id: \.element.id) { i, d in
            VStack(alignment: .leading, spacing: 8) {
                Text(String(format: "Discursiva %02d — ", i + 1) + d.tema).font(.system(size: 14, weight: .heavy))
                Text("\(d.orgao) · \(d.ano.map(String.init) ?? "") · \(d.banca)").font(.system(size: 11.5)).foregroundStyle(.secondary)
                Text(d.enunciado).font(.system(size: 13.5)).lineSpacing(2).textSelection(.enabled)
                if gabarito {
                    Text("Padrão de resposta (espelho oficial)").font(.system(size: 12, weight: .heavy)).padding(.top, 4)
                    if d.espelho.isEmpty { Text("A banca não publicou o espelho desta questão.").font(.system(size: 12)).foregroundStyle(.secondary) }
                    ForEach(Array(d.espelho.enumerated()), id: \.offset) { j, q in
                        HStack(alignment: .top, spacing: 6) {
                            Text("\(j + 1).").font(.system(size: 12, weight: .bold))
                            Text(q.quesito + (q.pontos.map { "  (\($0) pt)" } ?? "")).font(.system(size: 12.5)).foregroundStyle(.secondary)
                        }
                    }
                } else {
                    Text("Responda no papel ou na Redação; o espelho aparece no relatório.").font(.system(size: 12)).foregroundStyle(.secondary)
                }
            }
            .padding(14).background(RoundedRectangle(cornerRadius: 12).fill(AppTheme.elevatedSurface)).overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(AppTheme.hairline))
        }
    }

    private func chip(_ t: String, on: Bool, _ act: @escaping () -> Void) -> some View {
        Button(action: act) {
            Text(t).font(.system(size: 12, weight: .semibold)).padding(.horizontal, 10).padding(.vertical, 5)
                .background(Capsule().fill(on ? Color.accentColor : AppTheme.hairline.opacity(0.35)))
                .foregroundStyle(on ? Color.white : AppTheme.ink)
        }.buttonStyle(.plain)
    }
    private func kpi(_ t: String, _ v: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(t.uppercased()).font(.system(size: 10, weight: .bold)).foregroundStyle(.secondary)
            Text(v).font(.system(size: 22, weight: .heavy))
        }
    }
}
