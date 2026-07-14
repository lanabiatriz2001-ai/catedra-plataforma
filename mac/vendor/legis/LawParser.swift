import Foundation

/// Uma unidade de leitura: um artigo de lei.
struct LawUnit: Identifiable, Hashable {
    let id: Int            // posição sequencial no documento
    let key: String        // chave estável p/ progresso ("Art. 5º", "Art. 1º (2)")
    let label: String      // rótulo exibido ("Art. 5º")
    let context: String?   // cabeçalho estrutural vigente ("TÍTULO II — …")
    let lines: [String]    // corpo (a 1ª linha contém o rótulo)
    let location: Int      // offset UTF-16 no texto corrido (p/ pular entre modos)
    let length: Int
}

/// Classificação de uma linha do corpo, para renderização.
enum LawLineKind {
    case caput(String)                 // primeira linha (texto após o rótulo)
    case inciso(String, String)        // ("IV", texto)
    case paragrafo(String, String)     // ("§ 2º" ou "Parágrafo único", texto)
    case alinea(String, String)        // ("a", texto)
    case plain(String)
}

enum LawParser {
    // Início de unidade: um artigo de lei ("Art. 5º", "Artigo 12", "Art. 121-A").
    // • número com ponto de milhar ("Art. 1.045" do CPC) — sem isso o rótulo era
    //   truncado para "Art. 1" e as chaves de progresso colidiam;
    // • `[\s.]*` entre "Art"/"Artigo" e o número tolera as variações do Planalto:
    //   "Art. 1º", "Art . 1º" (Lei do Cheque), "Art. . 1º" (Prova Documental).
    private static let unitRegex = try! NSRegularExpression(
        pattern: "^(Art(?:igo)?[\\s.]*\\d{1,3}(?:\\.\\d{3})*[ºo°]?(?:[-.][A-Z])?)\\b")
    private static let headerRegex = try! NSRegularExpression(
        pattern: "^(TÍTULO|T Í T U L O|CAPÍTULO|C A P Í T U L O|Seção|SEÇÃO|Subseção|SUBSEÇÃO|LIVRO|PARTE|ATO DAS DISPOSIÇÕES)\\b")

    /// Divide o texto da norma em artigos, com chaves estáveis para o progresso.
    static func parse(_ text: String) -> [LawUnit] {
        let boundary = unitRegex
        let ns = text as NSString
        var units: [LawUnit] = []
        var seenKeys: [String: Int] = [:]

        var currentLabel: String?
        var currentContext: String?
        var pendingContext: String?
        var currentLines: [String] = []
        var currentStart = 0
        var pendingHeaderStart: Int?  // início do 1º cabeçalho após o artigo atual (limita a fatia)

        func flush(end: Int) {
            guard let label = currentLabel, !currentLines.isEmpty else { return }
            let count = (seenKeys[label] ?? 0) + 1
            seenKeys[label] = count
            let key = count == 1 ? label : "\(label) (\(count))" // ex.: ADCT repete Art. 1º
            units.append(LawUnit(id: units.count,
                                 key: key,
                                 label: label,
                                 context: currentContext,
                                 lines: currentLines,
                                 location: currentStart,
                                 length: max(0, end - currentStart)))
        }

        var lineStart = 0
        while lineStart < ns.length {
            let lineRange = ns.lineRange(for: NSRange(location: lineStart, length: 0))
            let line = ns.substring(with: lineRange).trimmingCharacters(in: .whitespacesAndNewlines)
            defer { lineStart = NSMaxRange(lineRange) }
            if line.isEmpty { continue }

            let full = NSRange(location: 0, length: (line as NSString).length)
            if headerRegex.firstMatch(in: line, range: full) != nil {
                // Cabeçalho estrutural: passa a valer para as PRÓXIMAS unidades.
                pendingContext = line
                if pendingHeaderStart == nil { pendingHeaderStart = lineRange.location }
                continue
            }
            if let match = boundary.firstMatch(in: line, range: full) {
                // A fatia do artigo anterior termina no 1º cabeçalho seguinte (se houver),
                // para o título do próximo capítulo não vazar no fim do artigo.
                flush(end: pendingHeaderStart ?? lineRange.location)
                currentLabel = (line as NSString).substring(with: match.range(at: 1))
                    .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
                    // Normaliza "Art . 1º"/"Art. . 1º" → "Art. 1º" para o rótulo e a
                    // chave de progresso ficarem consistentes entre as leis.
                    .replacingOccurrences(of: "\\. \\.", with: ".", options: .regularExpression)
                    .replacingOccurrences(of: "^Art\\s*\\.", with: "Art.", options: .regularExpression)
                currentContext = pendingContext ?? currentContext
                pendingContext = nil
                pendingHeaderStart = nil
                currentLines = [line]
                currentStart = lineRange.location
            } else if currentLabel != nil, pendingHeaderStart == nil {
                // Após um cabeçalho estrutural, as linhas já pertencem à próxima
                // divisão — não entram no corpo do artigo anterior (a fatia
                // location/length também termina no cabeçalho).
                currentLines.append(line)
            }
        }
        flush(end: pendingHeaderStart ?? ns.length)
        return units
    }

    /// Classifica as linhas de uma unidade para renderização estruturada.
    static func classify(_ unit: LawUnit) -> [LawLineKind] {
        var kinds: [LawLineKind] = []
        for (index, line) in unit.lines.enumerated() {
            if index == 0 {
                var caput = line
                // Corta o rótulo pelo PRÓPRIO reconhecimento do unitRegex sobre a linha
                // crua — o unit.label é normalizado ("Art . 1º"→"Art. 1º") e não casaria
                // a linha original (deixando o número duplicado no caput). "°º" no trim
                // para o ordinal não vazar quando o \b do regex o solta.
                let raw = line as NSString
                if let m = unitRegex.firstMatch(in: line, range: NSRange(location: 0, length: raw.length)) {
                    caput = raw.substring(from: NSMaxRange(m.range(at: 1)))
                        .trimmingCharacters(in: CharacterSet(charactersIn: " .–—-°º\u{00A0}"))
                } else if let range = caput.range(of: NSRegularExpression.escapedPattern(for: unit.label),
                                                  options: [.regularExpression, .anchored]) {
                    caput = String(caput[range.upperBound...])
                        .trimmingCharacters(in: CharacterSet(charactersIn: " .–—-°º\u{00A0}"))
                }
                kinds.append(.caput(caput))
            } else if let match = firstMatch("^(§\\s*\\d+[ºo°]?[-.A-Z]*|Parágrafo único)\\.?\\s*[–—-]?\\s*(.*)$", line) {
                kinds.append(.paragrafo(match[0], match[1]))
            } else if let match = firstMatch("^([IVXLCDM]+)\\s*[–—-]\\s*(.*)$", line) {
                kinds.append(.inciso(match[0], match[1]))
            } else if let match = firstMatch("^([a-z])\\)\\s*(.*)$", line) {
                kinds.append(.alinea(match[0], match[1]))
            } else {
                kinds.append(.plain(line))
            }
        }
        return kinds
    }

    private static func firstMatch(_ pattern: String, _ line: String) -> [String]? {
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return nil }
        let ns = line as NSString
        guard let match = regex.firstMatch(in: line, range: NSRange(location: 0, length: ns.length)),
              match.numberOfRanges >= 3 else { return nil }
        return [ns.substring(with: match.range(at: 1)), ns.substring(with: match.range(at: 2))]
    }
}
