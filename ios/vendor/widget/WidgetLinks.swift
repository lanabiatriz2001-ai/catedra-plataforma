import Foundation

enum WidgetDestino: Equatable {
    case tela(String)
    case legis(diploma: String, artigo: String)
    case juris(id: String)
    case entrar
}

/// Links `catedra://` do widget para o app. As telas são ids de view do app web: o host chama
/// window.__catedraGoView, que passa pela trava de área (_podeAbrir) — a mesma porta das notificações.
enum WidgetLinks {
    static let esquema = "catedra"
    static let telas: Set<String> = ["inicio", "ciclo", "revisoes", "edital", "analise"]

    static func url(_ d: WidgetDestino) -> URL {
        var c = URLComponents()
        c.scheme = esquema
        switch d {
        case .tela(let v):
            c.host = "ver"; c.path = "/" + (telas.contains(v) ? v : "inicio")
        case .legis(let diploma, let artigo):
            c.host = "legis"; c.queryItems = [URLQueryItem(name: "diploma", value: diploma), URLQueryItem(name: "artigo", value: artigo)]
        case .juris(let id):
            c.host = "juris"; c.queryItems = [URLQueryItem(name: "id", value: id)]
        case .entrar:
            c.host = "entrar"
        }
        return c.url ?? URL(string: "catedra://ver/inicio")!
    }

    static func destino(_ url: URL) -> WidgetDestino? {
        guard url.scheme?.lowercased() == esquema,
              let c = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return nil }
        func q(_ n: String) -> String { (c.queryItems?.first { $0.name == n }?.value ?? "").trimmingCharacters(in: .whitespaces) }
        switch c.host?.lowercased() {
        case "ver":
            let partes = c.path.split(separator: "/", omittingEmptySubsequences: true)
            guard partes.count == 1 else { return nil }
            let v = String(partes[0])
            return telas.contains(v) ? .tela(v) : nil
        case "legis":
            let d = q("diploma"), a = q("artigo")
            return (d.isEmpty || a.isEmpty) ? nil : .legis(diploma: d, artigo: a)
        case "juris":
            let id = q("id")
            guard !id.isEmpty, id.count <= 80,
                  id.allSatisfy({ $0.isASCII && ($0.isLetter || $0.isNumber || $0 == "-" || $0 == "_") }) else { return nil }
            return .juris(id: id)
        case "entrar":
            return .entrar
        default:
            return nil
        }
    }
}
