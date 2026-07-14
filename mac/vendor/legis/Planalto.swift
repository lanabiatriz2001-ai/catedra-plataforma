import Foundation
import CryptoKit
import PDFKit

enum FetchError: LocalizedError {
    case badURL
    case badResponse(Int)
    case emptyContent
    case unexpectedContent

    var errorDescription: String? {
        switch self {
        case .badURL: return "Endereço (URL) inválido."
        case .badResponse(let code): return "O servidor respondeu com erro (HTTP \(code))."
        case .emptyContent: return "A página foi baixada, mas não contém texto legível."
        case .unexpectedContent: return "O servidor devolveu uma página diferente da esperada (falha temporária comum nos portais oficiais)."
        }
    }
}

enum Planalto {
    static let userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"

    /// Baseline determinístico para listas do Senado ainda sem atos no ano.
    /// Também serve de guarda: uma lista que JÁ teve conteúdo nunca volta a este
    /// estado legitimamente (as fontes são por ano), então a transição
    /// conteúdo → sentinela é tratada como falha transitória do portal.
    static let emptyListSentinel = "Nenhum ato publicado nesta lista até o momento."

    /// Ponto de entrada único: baixa e extrai o texto da fonte da norma.
    static func fetchText(for law: LawEntry) async throws -> String {
        guard let source = law.sourceURL else { throw FetchError.badURL }
        // Com termo de validação, ele já garante o conteúdo certo — então uma lista
        // legitimamente curta (ex.: índice de novidades ainda vazio) não é
        // rejeitada como página sem texto.
        return try await fetchText(from: source, mustContain: law.validationTerm,
                                   stripPattern: law.stripPattern,
                                   minLength: law.validationTerm == nil ? 200 : 40)
    }

    /// Baixa uma página e devolve o texto limpo (sem HTML), normalizado.
    /// `mustContain`: termo que precisa aparecer no texto extraído — protege contra
    /// portais que às vezes devolvem HTTP 200 com a página errada.
    /// `stripPattern`: regex removida do conteúdo bruto antes da extração — para
    /// fontes com timestamp por consulta (ex.: <Metadados> da API do Senado), que
    /// sem isso gerariam "mudança" a cada verificação.
    static func fetchText(from urlString: String, mustContain term: String? = nil,
                          stripPattern: String? = nil,
                          minLength: Int = 200) async throws -> String {
        guard let url = URL(string: urlString) else { throw FetchError.badURL }
        var request = URLRequest(url: url)
        request.setValue(userAgent, forHTTPHeaderField: "User-Agent")
        request.timeoutInterval = 60
        request.cachePolicy = .reloadIgnoringLocalCacheData

        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode != 200 {
            throw FetchError.badResponse(http.statusCode)
        }
        let text: String
        if data.prefix(5).elementsEqual("%PDF-".utf8) {
            text = pdfToText(data)
        } else {
            var raw = decode(data: data, response: response)
            // Lista vazia da API do Senado (ano ainda sem atos) é estado LEGÍTIMO:
            // vira um baseline fixo e determinístico, para que a publicação do
            // 1º ato do ano dispare o fluxo normal de mudança + notificação.
            if raw.contains("<ListaDocumento"),
               raw.range(of: "(?s)<documentos>\\s*</documentos>|<documentos\\s*/>",
                         options: .regularExpression) != nil {
                return emptyListSentinel
            }
            // Lista de atos do Senado: extrai "Nome do ato — ementa" por documento,
            // em vez do texto cru com todos os campos colados (tipo/número/apelido…).
            if let senado = parseSenadoList(raw) {
                text = senado
            } else {
                if let stripPattern {
                    raw = raw.replacingOccurrences(of: stripPattern, with: " ",
                                                   options: .regularExpression)
                }
                text = htmlToText(raw)
            }
        }
        guard text.count > minLength else { throw FetchError.emptyContent }
        if let term, !textContains(term, in: text) {
            throw FetchError.unexpectedContent
        }
        return text
    }

    /// Contém-termo tolerante a espaçamento E ao ponto abreviativo: "Art. 1" casa
    /// com "Art . 1º" e também com "Art 1º" (o Planalto varia entre "Art.", "Art ." e
    /// "Art" conforme a época da lei). Remove espaços e pontos dos dois lados antes de
    /// comparar, sem tocar em acentos. Seguro para os termos usados ("Art. 1",
    /// "Lei nº", "Medida Provisória"…) — nenhum depende de ponto ou espaço interno.
    static func textContains(_ term: String, in text: String) -> Bool {
        guard !term.isEmpty else { return true }
        func squeeze(_ s: String) -> String {
            let noSpace = String(s.unicodeScalars.filter {
                !CharacterSet.whitespacesAndNewlines.contains($0) && $0 != "."
            })
            // "Artigo 1" também vale por "Art. 1" (decretos antigos usam "Artigo").
            return noSpace.replacingOccurrences(of: "artigo", with: "art", options: .caseInsensitive)
        }
        return squeeze(text).range(of: squeeze(term), options: .caseInsensitive) != nil
    }

    static func pdfToText(_ data: Data) -> String {
        guard let document = PDFDocument(data: data), let raw = document.string else { return "" }
        return normalizeLines(raw)
    }

    /// Extrai a lista de atos do XML de dados abertos do Senado em linhas legíveis
    /// ("Lei nº 15.458 de 03/07/2026 — Abre crédito…") em vez do texto cru com os
    /// campos concatenados. Determinístico (ordem do feed) → hash estável.
    /// Devolve nil quando não é uma lista do Senado (outras fontes seguem por htmlToText).
    static func parseSenadoList(_ raw: String) -> String? {
        guard raw.range(of: "<documento\\b", options: .regularExpression) != nil,
              let re = try? NSRegularExpression(pattern: "(?is)<documento\\b.*?</documento>") else { return nil }
        let ns = raw as NSString
        var lines: [String] = []
        for m in re.matches(in: raw, range: NSRange(location: 0, length: ns.length)) {
            let doc = ns.substring(with: m.range)
            let nome = xmlField(doc, "normaNome") ?? xmlField(doc, "norma") ?? ""
            let ementa = xmlField(doc, "ementa") ?? ""
            let parts = [nome, ementa].filter { !$0.isEmpty }
                .map { decodeEntities($0).trimmingCharacters(in: .whitespacesAndNewlines) }
                .filter { !$0.isEmpty }
            if !parts.isEmpty { lines.append(parts.joined(separator: " — ")) }
        }
        guard !lines.isEmpty else { return nil }
        return lines.joined(separator: "\n\n")
    }

    private static func xmlField(_ text: String, _ tag: String) -> String? {
        guard let re = try? NSRegularExpression(pattern: "(?is)<\(tag)>(.*?)</\(tag)>") else { return nil }
        let ns = text as NSString
        guard let m = re.firstMatch(in: text, range: NSRange(location: 0, length: ns.length)),
              m.numberOfRanges > 1 else { return nil }
        return ns.substring(with: m.range(at: 1))
    }

    /// Decodifica os bytes respeitando o charset informado (Planalto usa windows-1252 em páginas antigas).
    static func decode(data: Data, response: URLResponse?) -> String {
        if let name = response?.textEncodingName {
            // Convenção WHATWG: rótulos ISO-8859-1/latin1 significam Windows-1252 na
            // prática da web (portais antigos rotulam ISO-8859-1 mas usam pontuação 1252).
            let lower = name.lowercased()
            if lower.contains("8859-1") || lower == "latin1" || lower.contains("1252") {
                if let s = String(data: data, encoding: .windowsCP1252) { return s }
            }
            let cf = CFStringConvertIANACharSetNameToEncoding(name as CFString)
            if cf != kCFStringEncodingInvalidId {
                let ns = CFStringConvertEncodingToNSStringEncoding(cf)
                if let s = String(data: data, encoding: String.Encoding(rawValue: ns)) { return s }
            }
        }
        // isoLatin1 (nunca falha), não ascii: um único byte acentuado nos primeiros
        // 4 KB (ex.: "Constituição" no <title>) fazia o sniff devolver nil sempre.
        if let head = String(data: data.prefix(4096), encoding: .isoLatin1)?.lowercased() {
            if head.contains("utf-8"), let s = String(data: data, encoding: .utf8) { return s }
            if head.contains("iso-8859-1") || head.contains("windows-1252"),
               let s = String(data: data, encoding: .windowsCP1252) { return s }
        }
        if let s = String(data: data, encoding: .utf8) { return s }
        if let s = String(data: data, encoding: .windowsCP1252) { return s }
        return String(decoding: data, as: UTF8.self)
    }

    static func htmlToText(_ html: String) -> String {
        // Atenção: não truncar em </html> — páginas do Planalto são malformadas e
        // costumam ter o texto da lei DEPOIS dessa tag. Lixo binário ocasional dos
        // portais é neutralizado pela remoção de caracteres de controle abaixo,
        // pelo termo de validação e pela dupla busca de confirmação.
        var s = String(html.unicodeScalars.filter {
            $0.value >= 0x20 || $0 == "\n" || $0 == "\r" || $0 == "\t"
        })
        for pattern in ["(?is)<script.*?</script>", "(?is)<style.*?</style>",
                        "(?is)<head.*?</head>", "(?s)<!--.*?-->"] {
            s = s.replacingOccurrences(of: pattern, with: " ", options: .regularExpression)
        }
        // Quebras de linha do código-fonte HTML não são quebras reais de parágrafo.
        s = s.replacingOccurrences(of: "[\\r\\n]+", with: " ", options: .regularExpression)
        // /documento e /ementa: quebram cada ato da API XML do Senado em linha
        // própria — sem isso o feed vira uma linha única e o diff de atualização
        // mostraria a lista inteira como "novo" em vez de apenas a lei nova.
        s = s.replacingOccurrences(of: "(?i)<(br|/p|/div|/tr|/li|/h[1-6]|/table|/blockquote|/title|/documento|/ementa)[^>]*>",
                                   with: "\n", options: .regularExpression)
        s = s.replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
        s = decodeEntities(s)
        return normalizeLines(s)
    }

    static func normalizeLines(_ input: String) -> String {
        let rawLines = input.components(separatedBy: .newlines)
        var out: [String] = []
        for raw in rawLines {
            let line = raw
                .replacingOccurrences(of: "\u{00A0}", with: " ")
                .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
                .trimmingCharacters(in: .whitespaces)
            if line.isEmpty {
                if let last = out.last, !last.isEmpty { out.append("") }
            } else {
                out.append(line)
            }
        }
        return out.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static let namedEntities: [String: String] = [
        "nbsp": " ", "amp": "&", "lt": "<", "gt": ">", "quot": "\"", "apos": "'",
        "sect": "§", "ordf": "ª", "ordm": "º", "middot": "·", "deg": "°",
        "ccedil": "ç", "Ccedil": "Ç",
        "aacute": "á", "agrave": "à", "acirc": "â", "atilde": "ã", "auml": "ä",
        "eacute": "é", "egrave": "è", "ecirc": "ê",
        "iacute": "í", "icirc": "î",
        "oacute": "ó", "ocirc": "ô", "otilde": "õ", "ouml": "ö",
        "uacute": "ú", "ucirc": "û", "uuml": "ü",
        "Aacute": "Á", "Agrave": "À", "Acirc": "Â", "Atilde": "Ã",
        "Eacute": "É", "Ecirc": "Ê", "Iacute": "Í",
        "Oacute": "Ó", "Ocirc": "Ô", "Otilde": "Õ", "Uacute": "Ú",
        "ndash": "–", "mdash": "—", "hellip": "…",
        "ldquo": "\u{201C}", "rdquo": "\u{201D}", "lsquo": "\u{2018}", "rsquo": "\u{2019}",
    ]

    /// Passada ÚNICA sobre o texto (determinística): substituições encadeadas em
    /// ordem de dicionário produziam saídas diferentes entre execuções do app
    /// ("&amp;sect;" virava "§" ou "&sect;" conforme a ordem) — e, com isso,
    /// hashes diferentes e alertas falsos de alteração.
    static func decodeEntities(_ text: String) -> String {
        guard let regex = try? NSRegularExpression(pattern: "&(#(x?)([0-9a-fA-F]+)|([a-zA-Z]+));") else {
            return text
        }
        let ns = text as NSString
        var result = String()
        result.reserveCapacity(ns.length)
        var last = 0
        for m in regex.matches(in: text, range: NSRange(location: 0, length: ns.length)) {
            result += ns.substring(with: NSRange(location: last, length: m.range.location - last))
            var replacement: String? = nil
            if m.range(at: 3).location != NSNotFound {
                let isHex = ns.substring(with: m.range(at: 2)).lowercased() == "x"
                let digits = ns.substring(with: m.range(at: 3))
                if let value = UInt32(digits, radix: isHex ? 16 : 10),
                   let scalar = Unicode.Scalar(value) {
                    replacement = String(Character(scalar))
                }
            } else if m.range(at: 4).location != NSNotFound {
                replacement = namedEntities[ns.substring(with: m.range(at: 4))]
            }
            result += replacement ?? ns.substring(with: m.range)
            last = m.range.location + m.range.length
        }
        result += ns.substring(from: last)
        return result
    }

    /// Hash estável do conteúdo, ignorando diferenças triviais de espaçamento.
    static func contentHash(of text: String) -> String {
        let normalized = text
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let digest = SHA256.hash(data: Data(normalized.utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }

    /// Diferença por parágrafos entre duas versões do texto.
    static func paragraphDiff(old: String, new: String) -> (added: [String], removed: [String]) {
        let oldSet = Set(old.components(separatedBy: "\n").filter { $0.count > 3 })
        let newParagraphs = new.components(separatedBy: "\n").filter { $0.count > 3 }
        let newSet = Set(newParagraphs)
        let added = newParagraphs.filter { !oldSet.contains($0) }
        let removed = old.components(separatedBy: "\n").filter { $0.count > 3 && !newSet.contains($0) }
        return (Array(added.prefix(300)), Array(removed.prefix(300)))
    }
}
