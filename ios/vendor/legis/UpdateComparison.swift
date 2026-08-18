import SwiftUI

/// Linha de uma tabela comparativa de alteração legislativa.
enum DiffRow: Identifiable {
    case modified(old: String, new: String)   // trecho reescrito (redação anterior → atual)
    case removed(String)                       // trecho revogado/excluído
    case added(String)                         // trecho novo (incluído)

    var id: String {
        switch self {
        case .modified(let o, let n): return "m:\(o.prefix(60))|\(n.prefix(60))"
        case .removed(let o): return "r:\(o.prefix(80))"
        case .added(let n): return "a:\(n.prefix(80))"
        }
    }
}

/// Alinha os parágrafos removidos e adicionados de uma alteração em pares
/// "redação anterior × redação atual", identificando reescritas (mesmo dispositivo
/// com texto trocado) versus inclusões e revogações puras.
enum UpdateDiff {
    /// Tokens significativos de um parágrafo (para medir semelhança entre versões).
    private static func tokens(_ s: String) -> Set<String> {
        Set(s.lowercased()
            .split { !$0.isLetter && !$0.isNumber }
            .map(String.init)
            .filter { $0.count > 2 })
    }

    /// Emparelha removidos↔adicionados por semelhança (Jaccard); sobras viram
    /// linhas puras. Preserva a ordem: primeiro o que mudou/saiu (ordem da versão
    /// anterior), depois o que entrou novo.
    static func align(removed: [String], added: [String]) -> [DiffRow] {
        let remTok = removed.map(tokens)
        let addTok = added.map(tokens)
        var usedAdded = Set<Int>()
        var rows: [DiffRow] = []
        for (i, para) in removed.enumerated() {
            var best = -1
            var bestSim = 0.34   // limiar mínimo para considerar "mesma norma reescrita"
            for j in added.indices where !usedAdded.contains(j) {
                let inter = remTok[i].intersection(addTok[j]).count
                // |A∪B| = |A| + |B| − |A∩B| — evita alocar um Set de união no laço quente.
                let union = remTok[i].count + addTok[j].count - inter
                let sim = union == 0 ? 0 : Double(inter) / Double(union)
                if sim > bestSim { bestSim = sim; best = j }
            }
            if best >= 0 {
                usedAdded.insert(best)
                rows.append(.modified(old: para, new: added[best]))
            } else {
                rows.append(.removed(para))
            }
        }
        for j in added.indices where !usedAdded.contains(j) {
            rows.append(.added(added[j]))
        }
        return rows
    }

    /// Diferença palavra a palavra entre duas versões (LCS). Devolve cada versão
    /// como sequência de (palavra, mudou?), para grifar só o que trocou.
    static func wordDiff(old: String, new: String) -> (old: [(String, Bool)], new: [(String, Bool)]) {
        let a = old.split(separator: " ").map(String.init)
        let b = new.split(separator: " ").map(String.init)
        let n = a.count, m = b.count
        // Parágrafos muito longos: pular o alinhamento fino (custo O(n·m)) e marcar
        // ambos inteiros como "diferentes" — a tabela ainda mostra as duas versões.
        guard n * m <= 60_000, n > 0, m > 0 else {
            return (a.map { ($0, true) }, b.map { ($0, true) })
        }
        var dp = Array(repeating: Array(repeating: 0, count: m + 1), count: n + 1)
        for i in stride(from: n - 1, through: 0, by: -1) {
            for j in stride(from: m - 1, through: 0, by: -1) {
                dp[i][j] = a[i] == b[j] ? dp[i + 1][j + 1] + 1 : max(dp[i + 1][j], dp[i][j + 1])
            }
        }
        var oldTok: [(String, Bool)] = [], newTok: [(String, Bool)] = []
        var i = 0, j = 0
        while i < n && j < m {
            if a[i] == b[j] { oldTok.append((a[i], false)); newTok.append((b[j], false)); i += 1; j += 1 }
            else if dp[i + 1][j] >= dp[i][j + 1] { oldTok.append((a[i], true)); i += 1 }
            else { newTok.append((b[j], true)); j += 1 }
        }
        while i < n { oldTok.append((a[i], true)); i += 1 }
        while j < m { newTok.append((b[j], true)); j += 1 }
        return (oldTok, newTok)
    }
}

/// Linha já preparada (alinhamento + diff palavra a palavra feitos uma vez em init):
/// evita recomputar o LCS a cada render e garante id ÚNICO (o índice), pois o texto
/// truncado poderia colidir entre trechos com o mesmo começo e sumir da tabela.
private enum PreparedRow: Identifiable {
    case modified(id: Int, old: [(String, Bool)], new: [(String, Bool)])
    case removed(id: Int, text: String)
    case added(id: Int, text: String)
    var id: Int {
        switch self {
        case .modified(let id, _, _): return id
        case .removed(let id, _): return id
        case .added(let id, _): return id
        }
    }
}

/// Tabela comparativa: redação anterior (esquerda) × redação atual (direita),
/// com o que mudou destacado.
struct UpdateComparisonTable: View {
    @AppStorage("readerFontSize") private var fontSize = 16.0
    private let rows: [PreparedRow]

    init(added: [String], removed: [String]) {
        // Alinhamento e diff palavra a palavra são independentes da fonte: calcula
        // uma vez aqui, não a cada avaliação do body.
        rows = UpdateDiff.align(removed: removed, added: added).enumerated().map { index, row in
            switch row {
            case .modified(let old, let new):
                let diff = UpdateDiff.wordDiff(old: old, new: new)
                return .modified(id: index, old: diff.old, new: diff.new)
            case .removed(let old): return .removed(id: index, text: old)
            case .added(let new): return .added(id: index, text: new)
            }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            headerRow
            ForEach(rows) { row in
                Divider()
                rowView(row)
                    .background((row.id % 2 == 0) ? Color.clear : Color.secondary.opacity(0.04))
            }
        }
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(.quaternary))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var headerRow: some View {
        HStack(alignment: .top, spacing: 0) {
            cellLabel("Redação anterior", "minus.circle.fill", .red)
            Rectangle().fill(.quaternary).frame(width: 1)
            cellLabel("Redação atual", "plus.circle.fill", .green)
        }
        .background(Color.secondary.opacity(0.08))
    }

    private func cellLabel(_ text: String, _ symbol: String, _ color: Color) -> some View {
        Label(text, systemImage: symbol)
            .font(.caption.weight(.semibold))
            .foregroundStyle(color)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 12).padding(.vertical, 8)
    }

    @ViewBuilder
    private func rowView(_ row: PreparedRow) -> some View {
        HStack(alignment: .top, spacing: 0) {
            switch row {
            case .modified(_, let old, let new):
                cell(inlineText(old, changed: .red, strike: true), tint: .red.opacity(0.06))
                separator
                cell(inlineText(new, changed: .green, strike: false), tint: .green.opacity(0.06))
            case .removed(_, let old):
                cell(Text(old).foregroundStyle(.primary), tint: .red.opacity(0.08))
                separator
                cell(placeholder("revogado / sem correspondente"), tint: .clear)
            case .added(_, let new):
                cell(placeholder("não existia antes"), tint: .clear)
                separator
                cell(Text(new).foregroundStyle(.primary), tint: .green.opacity(0.08))
            }
        }
    }

    private var separator: some View { Rectangle().fill(.quaternary).frame(width: 1) }

    private func cell(_ content: Text, tint: Color) -> some View {
        content
            .font(.system(size: fontSize - 1))
            .textSelection(.enabled)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .topLeading)
            .padding(.horizontal, 12).padding(.vertical, 10)
            .background(tint)
    }

    private func placeholder(_ text: String) -> Text {
        Text(text).italic().foregroundColor(.secondary)
    }

    /// Concatena as palavras num único Text, grifando as que mudaram.
    private func inlineText(_ tokens: [(String, Bool)], changed: Color, strike: Bool) -> Text {
        tokens.reduce(Text("")) { acc, token in
            var piece = Text(token.0 + " ")
            if token.1 {
                piece = piece.foregroundColor(changed).bold()
                if strike { piece = piece.strikethrough(true, color: changed) }
            } else {
                piece = piece.foregroundColor(.primary)
            }
            return acc + piece
        }
    }
}
