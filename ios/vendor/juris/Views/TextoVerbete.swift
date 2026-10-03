import Foundation

/// Utilitários de TEXTO sobre o verbete — limpar espaços, quebrar em sentenças sem cortar em
/// "art." nem em milhar, e achar os dispositivos citados. Sobraram do gerador local do roteiro
/// de estudo, que saiu do app em 03/10/2026; quem usa hoje é a prova oral (a do JURIS e a das
/// bancas) e a Incidência do LEGIS. PURO e sem @MainActor.
enum TextoVerbete {

    static func limpar(_ s: String) -> String {
        s.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Quebra em sentenças sem cortar em "art.", "n.", "§", "inc.", "Min.", "Rel." — nem no
    /// ponto que separa milhar. Sem a segunda proteção o texto quebrava dentro de "Lei
    /// 8.078", "REsp 1.657.156" e "Decreto 11.846": medido, 2.075 de 15.220 verbetes tinham
    /// a 1ª sentença cortada no meio de um número, e o Tema 500 exibia, sob o rótulo "Tese
    /// fixada", o fragmento "Em, 25/04/2018, o STJ, ao julgar o REsp 1".
    static func sentencas(_ s: String) -> [String] {
        let protegido = s
            .replacingOccurrences(of: "(?i)\\b(art|arts|n|nº|inc|min|rel|des|ed|obs|p|pp|fl|fls|cf|ex|v|vs)\\.", with: "$1§PT§", options: .regularExpression)
            .replacingOccurrences(of: "(?<=\\d)\\.(?=\\d)", with: "§PT§", options: .regularExpression)
        return protegido.components(separatedBy: CharacterSet(charactersIn: ".;"))
            .map { $0.replacingOccurrences(of: "§PT§", with: ".").trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { $0.count > 25 }
    }

    private static let reFund = try! NSRegularExpression(pattern:
        "(?:arts?\\.?\\s*\\d+[\\dº°ª.,\\-A-Za-z§ ]*?(?:,?\\s*(?:§\\s*\\d+[º°]?|par[áa]grafo\\s+[úu]nico|inciso\\s+[IVXLC]+|[IVXLC]+))*)" +
        "(?:\\s*(?:,|e|do|da|de|c/c)\\s*(?:CF(?:/88)?|CR(?:FB)?/?88|C[PC]C|CPP|CP|CC|CDC|CTN|CLT|ECA|LEP|LIA|LINDB|LRF|Lei\\s+n?[ºo.]?\\s*[\\d.]+(?:/\\d{2,4})?|LC\\s*[\\d.]+(?:/\\d{2,4})?|Decreto(?:-Lei)?\\s*n?[ºo.]?\\s*[\\d.]+(?:/\\d{2,4})?))?" +
        "|\\bS[úu]mula(?:\\s+Vinculante)?\\s+n?[ºo.]?\\s*\\d+(?:\\s*(?:do|da|/)\\s*(?:STF|STJ|TST|TSE))?" +
        "|\\bTema\\s+n?[ºo.]?\\s*[\\d.]+(?:\\s*(?:do|da|/)\\s*(?:STF|STJ))?",
        options: [.caseInsensitive])

    static func fundamentos(_ s: String) -> [String] {
        let ns = s as NSString
        var vistos = Set<String>(), out: [String] = []
        for m in reFund.matches(in: s, range: NSRange(location: 0, length: ns.length)) {
            let t = limpar(ns.substring(with: m.range)).trimmingCharacters(in: CharacterSet(charactersIn: " ,;"))
            let k = t.lowercased()
            if t.count >= 6, !vistos.contains(k) { vistos.insert(k); out.append(t) }
        }
        return Array(out.prefix(8))
    }
}
