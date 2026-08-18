import Foundation

/// Uma publicação do Diário Oficial da União (Seção 1) que casou um termo vigiado.
struct DOUItem: Codable, Hashable, Identifiable {
    var id: String          // urlTitle (identificador único da matéria)
    var title: String
    var date: String        // "08/07/2026"
    var url: String
    var snippet: String
    var section: String     // "DO1"
    var term: String        // termo vigiado que casou (para agrupar/mostrar)
    var firstSeen: Date

    init(id: String, title: String, date: String, url: String, snippet: String, section: String, term: String, firstSeen: Date = Date()) {
        self.id = id; self.title = title; self.date = date; self.url = url
        self.snippet = snippet; self.section = section; self.term = term; self.firstSeen = firstSeen
    }

    // Decodificação tolerante: uma matéria malformada no cache nunca derruba a lista.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
        title = try c.decodeIfPresent(String.self, forKey: .title) ?? ""
        date = try c.decodeIfPresent(String.self, forKey: .date) ?? ""
        url = try c.decodeIfPresent(String.self, forKey: .url) ?? ""
        snippet = try c.decodeIfPresent(String.self, forKey: .snippet) ?? ""
        section = try c.decodeIfPresent(String.self, forKey: .section) ?? "DO1"
        term = try c.decodeIfPresent(String.self, forKey: .term) ?? ""
        firstSeen = try c.decodeIfPresent(Date.self, forKey: .firstSeen) ?? Date()
    }
}

/// Cliente do buscador do Diário Oficial (in.gov.br). Endpoint NÃO-OFICIAL (backend
/// do buscador público, usado por engenharia reversa) — exige User-Agent de
/// navegador, é frágil e pode mudar sem aviso. Conteúdo do DOU sob CC BY-ND 3.0.
enum DOU {
    private static let dayFmt: DateFormatter = {
        let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "dd-MM-yyyy"; f.timeZone = .current; return f
    }()

    /// Busca a Seção 1 do DOU por um termo, num intervalo de datas. Rode fora da
    /// MainActor. nil = falha de rede/transporte (re-tenta); [] = sem resultados.
    static func search(term: String, from: Date, to: Date) async -> [DOUItem]? {
        let q = term.trimmingCharacters(in: .whitespaces)
        // urlQueryAllowed deixa passar &, +, =, ?, ; que quebram/injetam a querystring.
        var cs = CharacterSet.urlQueryAllowed
        cs.remove(charactersIn: "&+=?;/#%")
        guard !q.isEmpty,
              let enc = q.addingPercentEncoding(withAllowedCharacters: cs),
              let url = URL(string: "https://www.in.gov.br/consulta/-/buscar/dou?q=\(enc)&s=do1&exactDate=personalizado&publishFrom=\(dayFmt.string(from: from))&publishTo=\(dayFmt.string(from: to))&sortType=0")
        else { return nil }
        var req = URLRequest(url: url)
        req.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
                     forHTTPHeaderField: "User-Agent")
        req.timeoutInterval = 30
        guard let (data, resp) = try? await URLSession.shared.data(for: req),
              let http = resp as? HTTPURLResponse, http.statusCode == 200 else { return nil }
        // Fallback de charset: se o portal servir Latin-1 um dia, não vira nil eterno.
        guard let html = String(data: data, encoding: .utf8) ?? String(data: data, encoding: .isoLatin1) else { return nil }
        // Página 200 sem a chave "jsonArray" = formato mudou / página errada (endpoint
        // não-oficial e frágil). Isso é FALHA (nil → re-tenta/sinaliza), não "0
        // resultados" — senão a usuária perderia alertas do DOU em silêncio.
        guard let arr = extractJsonArray(html) else { return nil }
        return arr.compactMap { obj in
            let urlTitle = (obj["urlTitle"] as? String) ?? ""
            guard !urlTitle.isEmpty else { return nil }
            return DOUItem(id: urlTitle,
                           title: clean((obj["title"] as? String) ?? ""),
                           date: (obj["pubDate"] as? String) ?? "",
                           url: "https://www.in.gov.br/web/dou/-/\(urlTitle)",
                           snippet: clean((obj["content"] as? String) ?? ""),
                           section: (obj["pubName"] as? String) ?? "DO1",
                           term: q)
        }
    }

    /// Extrai a `"jsonArray":[…]` da página, casando os colchetes (respeita strings
    /// e escapes) — não depende da estrutura do <script> em volta.
    private static func extractJsonArray(_ html: String) -> [[String: Any]]? {
        // Ancora na chave real "jsonArray": [  (não em qualquer texto "jsonArray").
        guard let m = html.range(of: "\"jsonArray\"\\s*:\\s*\\[", options: .regularExpression) else { return nil }
        let open = html.index(before: m.upperBound)   // o '[' final do match
        var depth = 0, inStr = false, esc = false
        var end: String.Index?
        var i = open
        while i < html.endIndex {
            let c = html[i]
            if inStr {
                if esc { esc = false } else if c == "\\" { esc = true } else if c == "\"" { inStr = false }
            } else if c == "\"" { inStr = true }
            else if c == "[" { depth += 1 }
            else if c == "]" { depth -= 1; if depth == 0 { end = html.index(after: i); break } }
            i = html.index(after: i)
        }
        guard let end, let data = String(html[open..<end]).data(using: .utf8),
              let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return nil }
        return arr
    }

    private static func clean(_ s: String) -> String {
        var t = s.replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
        for (a, b) in [("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", "\""),
                       ("&#39;", "'"), ("&nbsp;", " "), ("&hellip;", "…")] {
            t = t.replacingOccurrences(of: a, with: b)
        }
        return t.replacingOccurrences(of: "\\s{2,}", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
