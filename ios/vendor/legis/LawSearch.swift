import SwiftUI

/// Um acerto de busca no CONTEÚDO das normas: aponta para um artigo específico.
struct LawSearchHit: Identifiable, Sendable {
    let id = UUID()
    let lawID: UUID
    let lawTitle: String
    let accent: Color
    let unitIndex: Int
    let unitLabel: String
    let context: String?
    let snippet: String
    let term: String
}

/// Busca full-text reutilizável (usada pela pesquisa global e pelo índice de Assuntos
/// por conteúdo). Lê o texto de cada norma e devolve os ARTIGOS que contêm o termo.
enum LawSearch {
    /// `corpus`: (id, título, cor, URL do texto) — montado na MainActor; a leitura de
    /// disco e a varredura devem rodar fora dela (Task.detached).
    nonisolated static func run(term: String,
                                corpus: [(UUID, String, Color, URL)],
                                perLawCap: Int = 6,
                                globalCap: Int = 400) -> (hits: [LawSearchHit], truncated: Bool) {
        var out: [LawSearchHit] = []
        var truncated = false
        let opts: String.CompareOptions = [.caseInsensitive, .diacriticInsensitive]
        for (id, title, color, url) in corpus {
            guard let text = try? String(contentsOf: url, encoding: .utf8),
                  text.range(of: term, options: opts) != nil else { continue }
            let units = LawParser.parse(text)
            var perLaw = 0
            for (i, unit) in units.enumerated() {
                let body = unit.lines.joined(separator: " ")
                guard let r = body.range(of: term, options: opts) else { continue }
                if perLaw >= perLawCap { truncated = true; break }   // teto por norma
                out.append(LawSearchHit(lawID: id, lawTitle: title, accent: color, unitIndex: i,
                                        unitLabel: unit.label, context: unit.context,
                                        snippet: snippet(body, r), term: term))
                perLaw += 1
                if out.count >= globalCap { return (out, true) }     // teto global
            }
        }
        return (out, truncated)
    }

    nonisolated static func snippet(_ body: String, _ r: Range<String.Index>) -> String {
        let start = body.index(r.lowerBound, offsetBy: -60, limitedBy: body.startIndex) ?? body.startIndex
        let end = body.index(r.upperBound, offsetBy: 100, limitedBy: body.endIndex) ?? body.endIndex
        var s = String(body[start..<end]).trimmingCharacters(in: .whitespacesAndNewlines)
        if start != body.startIndex { s = "… " + s }
        if end != body.endIndex { s += " …" }
        return s
    }
}
