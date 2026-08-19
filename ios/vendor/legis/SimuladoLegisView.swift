import SwiftUI

/// Simulado de LEI SECA — objetivas Certo/Errado montadas dos artigos das normas
/// escolhidas + discursivas do banco oficial cujo espelho cita essas normas. Sem IA:
///   · CERTO  = o caput (ou 1º período) do artigo, como está na lei;
///   · ERRADO = o mesmo trecho com o núcleo trocado (prazo, percentual, competência,
///     operador) pela inversão segura do baralho do JURIS (Exporter.afirmacaoFalsaAuto —
///     mesmo módulo). Quando não há inversão segura, o item sai CERTO.
///   · gabarito + comentário = o texto oficial do artigo, com o rótulo.
/// Três visões iguais às do Simulado do JURIS (só enunciados / com gabarito / relatório).
struct SimuladoLegisItem: Identifiable, Hashable {
    let id: String
    let lei: String          // título curto da norma
    let artigo: String       // "Art. 5º"
    let enunciado: String    // afirmação apresentada
    let certo: Bool
    let oficial: String      // texto do artigo (gabarito/comentário)
    let leiID: UUID
}

@MainActor
enum SimuladoLegisLocal {
    static func gerar(leis: [LawEntry], store: AppStore, n: Int) -> [SimuladoLegisItem] {
        var pool: [(LawEntry, LawUnit)] = []
        for lei in leis {
            guard let texto = store.loadText(for: lei) else { continue }
            let units = ArticleStudyView.collapseRedactions(LawParser.parse(texto)).units
            for u in units where u.label.lowercased().hasPrefix("art") { pool.append((lei, u)) }
        }
        guard !pool.isEmpty else { return [] }
        pool.shuffle()
        var out: [SimuladoLegisItem] = []
        var i = 0
        for (lei, u) in pool {
            guard out.count < n else { break }
            let caput = caputDe(u)
            guard caput.count >= 60, caput.count <= 600 else { continue }
            let falsa = Exporter.afirmacaoFalsaAuto(caput)
            let querErrado = (i % 2 == 1) && falsa != nil
            i += 1
            let nome = RemissiveIndex.shortName(lei)
            out.append(.init(id: "\(lei.id)-\(u.key)", lei: nome, artigo: u.label,
                             enunciado: querErrado ? falsa! : caput, certo: !querErrado,
                             oficial: u.lines.joined(separator: "\n"), leiID: lei.id))
        }
        return out
    }

    /// 1º período do caput (sem o rótulo "Art. 5º").
    static func caputDe(_ u: LawUnit) -> String {
        var l = u.lines.first ?? ""
        if let r = l.range(of: u.label) { l = String(l[r.upperBound...]) }
        l = l.trimmingCharacters(in: CharacterSet(charactersIn: " .-–—:"))
        l = l.replacingOccurrences(of: "\\s*\\((?:Redação|Incluído|Vide|Revogado|Renumerado)[^)]*\\)", with: "", options: .regularExpression)
        if let fim = l.range(of: ".", options: .backwards), l.distance(from: l.startIndex, to: fim.lowerBound) > 60,
           let primeiro = l.range(of: "(?<=[a-záéíóúç])\\.\\s+(?=[A-ZÁÉÍÓÚ])", options: .regularExpression) {
            l = String(l[..<primeiro.lowerBound]) + "."
        }
        return l.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Discursivas do banco oficial cujo espelho cita alguma das normas (por apelido:
    /// "CPC", "Lei 8.429", "CF"…).
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
}

struct SimuladoLegisView: View {
    @EnvironmentObject var store: AppStore
    var openLaw: (UUID) -> Void = { _ in }
    @State private var escolhidas: Set<UUID> = []
    @State private var n = 20
    @State private var m = 2
    @State private var itens: [SimuladoLegisItem] = []
    @State private var discursivas: [DiscursivaBanco] = []
    @State private var respostas: [String: Bool] = [:]
    @State private var visao: SimuladoVisao = .enunciados
    @State private var encerrado = false
    @State private var busca = ""

    private var leis: [LawEntry] { store.laws.filter { $0.isRegularLaw } }
    private var filtradas: [LawEntry] {
        let q = busca.folding(options: .diacriticInsensitive, locale: nil).lowercased()
        return q.isEmpty ? leis : leis.filter { $0.title.folding(options: .diacriticInsensitive, locale: nil).lowercased().contains(q) }
    }
    private var acertos: Int { itens.filter { respostas[$0.id] == $0.certo }.count }
    private var respondidas: Int { itens.filter { respostas[$0.id] != nil }.count }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Simulado de lei seca").font(.system(size: 30, weight: .heavy)).tracking(-0.6)
                Text("Escolha as normas; o simulado monta itens Certo/Errado a partir dos próprios artigos (o errado troca o núcleo: prazo, competência, percentual) e junta discursivas oficiais cujo espelho cita essas normas. Sem IA.")
                    .font(.system(size: 13)).foregroundStyle(.secondary)
                if itens.isEmpty { configuracao } else { prova }
            }
            .padding(.horizontal, 28).padding(.vertical, 24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(AppTheme.surface)
    }

    private var configuracao: some View {
        VStack(alignment: .leading, spacing: 12) {
            TextField("Filtrar normas…", text: $busca).textFieldStyle(.roundedBorder).frame(maxWidth: 380)
            LegisFlow {
                ForEach(filtradas.prefix(60)) { l in
                    let on = escolhidas.contains(l.id)
                    Button {
                        if on { escolhidas.remove(l.id) } else { escolhidas.insert(l.id) }
                    } label: {
                        Text(RemissiveIndex.shortName(l)).font(.system(size: 12, weight: .semibold))
                            .padding(.horizontal, 10).padding(.vertical, 5)
                            .background(Capsule().fill(on ? Color.accentColor : AppTheme.hairline.opacity(0.35)))
                            .foregroundStyle(on ? Color.white : AppTheme.ink)
                    }.buttonStyle(.plain)
                }
            }
            HStack(spacing: 16) {
                Stepper("Objetivas: \(n)", value: $n, in: 5...100, step: 5)
                Stepper("Discursivas: \(m)", value: $m, in: 0...10)
            }.font(.system(size: 13))
            Button {
                let sel = leis.filter { escolhidas.contains($0.id) }
                itens = SimuladoLegisLocal.gerar(leis: sel, store: store, n: n)
                discursivas = SimuladoLegisLocal.discursivas(leis: sel, max: m)
                respostas = [:]; encerrado = false; visao = .enunciados
            } label: { Label("Montar simulado", systemImage: "list.bullet.clipboard") }
            .buttonStyle(.borderedProminent).disabled(escolhidas.isEmpty)
        }
    }

    private var prova: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Picker("", selection: $visao) { ForEach(SimuladoVisao.allCases) { Text($0.rawValue).tag($0) } }.pickerStyle(.segmented).frame(maxWidth: 520)
                Spacer()
                if !encerrado {
                    Button("Encerrar e corrigir") { encerrado = true; visao = .relatorio }.buttonStyle(.borderedProminent)
                }
                Button("Novo") { itens = []; discursivas = [] }.buttonStyle(.bordered)
            }
            if encerrado || visao == .relatorio {
                HStack(spacing: 18) {
                    kpi("Objetivas", "\(acertos)/\(itens.count) acertos")
                    kpi("Respondidas", "\(respondidas)")
                    kpi("Aproveitamento", itens.isEmpty ? "—" : "\(Int((Double(acertos) / Double(itens.count)) * 100))%")
                }
            }
            ForEach(Array(itens.enumerated()), id: \.element.id) { i, it in
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(String(format: "Questão %02d", i + 1)).font(.system(size: 12, weight: .heavy)).foregroundStyle(.secondary)
                        Text("\(it.lei) · \(it.artigo)").font(.system(size: 11, weight: .semibold))
                            .padding(.horizontal, 7).padding(.vertical, 2).background(Capsule().fill(AppTheme.hairline.opacity(0.35)))
                        Spacer()
                        Button { openLaw(it.leiID) } label: { Image(systemName: "book") }.buttonStyle(.borderless)
                    }
                    Text(it.enunciado).font(.system(size: 14)).lineSpacing(2)
                    HStack(spacing: 8) {
                        ForEach([true, false], id: \.self) { v in
                            let sel = respostas[it.id] == v
                            Button(v ? "Certo" : "Errado") { if !encerrado { respostas[it.id] = v } }
                                .buttonStyle(.bordered)
                                .tint(sel ? (encerrado ? (v == it.certo ? .green : .red) : .accentColor) : .gray)
                        }
                    }
                    if visao != .enunciados || encerrado {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Gabarito: \(it.certo ? "C" : "E")").font(.system(size: 12, weight: .heavy)).foregroundStyle(it.certo ? .green : .red)
                            Text((it.certo ? "CERTO. " : "ERRADO. ") + "Texto oficial — \(it.lei), \(it.artigo):").font(.system(size: 12, weight: .semibold))
                            Text(it.oficial).font(.system(size: 12.5)).foregroundStyle(.secondary).textSelection(.enabled)
                        }
                        .padding(10).background(RoundedRectangle(cornerRadius: 8).fill(AppTheme.hairline.opacity(0.18)))
                    }
                }
                .padding(14)
                .background(RoundedRectangle(cornerRadius: 12).fill(AppTheme.elevatedSurface))
                .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(AppTheme.hairline))
            }
            if !discursivas.isEmpty {
                Text("Questões discursivas · \(discursivas.count)").font(.system(size: 18, weight: .heavy)).padding(.top, 8)
                ForEach(Array(discursivas.enumerated()), id: \.element.id) { i, d in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(String(format: "Discursiva %02d — ", i + 1) + d.tema).font(.system(size: 14, weight: .heavy))
                        Text("\(d.orgao) · \(d.ano.map(String.init) ?? "") · \(d.banca)").font(.system(size: 11.5)).foregroundStyle(.secondary)
                        Text(d.enunciado).font(.system(size: 13.5)).lineSpacing(2).textSelection(.enabled)
                        if visao != .enunciados || encerrado {
                            Text("Padrão de resposta (espelho oficial)").font(.system(size: 12, weight: .heavy)).padding(.top, 4)
                            if d.espelho.isEmpty { Text("A banca não publicou o espelho desta questão.").font(.system(size: 12)).foregroundStyle(.secondary) }
                            ForEach(Array(d.espelho.enumerated()), id: \.offset) { j, q in
                                HStack(alignment: .top, spacing: 6) {
                                    Text("\(j + 1).").font(.system(size: 12, weight: .bold))
                                    Text(q.quesito + (q.pontos.map { "  (\($0) pt)" } ?? "")).font(.system(size: 12.5)).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                    .padding(14)
                    .background(RoundedRectangle(cornerRadius: 12).fill(AppTheme.elevatedSurface))
                    .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(AppTheme.hairline))
                }
            }
        }
    }

    private func kpi(_ t: String, _ v: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(t.uppercased()).font(.system(size: 10, weight: .bold)).foregroundStyle(.secondary)
            Text(v).font(.system(size: 18, weight: .heavy))
        }
    }
}
