import SwiftUI

enum Highlighter {
    /// Retorna um AttributedString com os termos da busca realçados (sem sensibilidade a acento/caixa).
    static func attributed(_ text: String, query: String, accent: Color = Palette.accent) -> AttributedString {
        var attr = AttributedString(text)
        let termos = query
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .split(separator: " ")
            .map(String.init)
            .filter { $0.count >= 2 }
        guard !termos.isEmpty else { return attr }

        for termo in termos {
            var searchRange = text.startIndex..<text.endIndex
            while let r = text.range(of: termo, options: [.caseInsensitive, .diacriticInsensitive], range: searchRange) {
                if let lo = AttributedString.Index(r.lowerBound, within: attr),
                   let hi = AttributedString.Index(r.upperBound, within: attr) {
                    attr[lo..<hi].backgroundColor = Palette.highlight
                    attr[lo..<hi].foregroundColor = Palette.readingInk
                    attr[lo..<hi].inlinePresentationIntent = .stronglyEmphasized
                }
                if r.upperBound < text.endIndex {
                    searchRange = r.upperBound..<text.endIndex
                } else { break }
            }
        }
        return attr
    }
}
