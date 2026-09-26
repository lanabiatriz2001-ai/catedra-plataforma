import Foundation

/// Ida e volta entre as telas do Cátedra (que vivem no WebView: Processo e peças, roteiros,
/// prioridade, correção da 2ª fase, revisão…) e as abas NATIVAS do CátedraLEGIS e do CátedraJURIS.
///
/// No site isso já funcionava por `postMessage`: o chip ⚖️/🏛️ manda `ctAbrirAcervo` com o
/// termo e o ponto de origem, e a pílula "voltar" devolve ao bloco exato. No app nativo o
/// acervo não é um iframe — é uma aba de verdade —, então o shim JS entregava só o nome da
/// aba e jogava fora o termo e a origem: a pessoa chegava no acervo inteiro, sem busca, e
/// sem caminho de volta.
///
/// Este é o carregador desse par (termo + origem) entre o host e as telas nativas. Fica no
/// vendor/legis porque os dois lados (LEGIS e JURIS) o enxergam no módulo plano.
@MainActor
final class AcervoEntrada: ObservableObject {
    static let shared = AcervoEntrada()

    /// De onde a pessoa saiu no app web — o que a volta precisa reabrir. O objeto `de`
    /// nasce SEMPRE no app web (host ou satélite) e volta para ele INTEIRO: a casca nativa
    /// só lê `view`, `rito`, `peca`, `bloco` e `rotulo` para desenhar o botão; campos que
    /// ela não conhece (disc, o retrato da revisão guiada, o que vier) passam intactos.
    struct Origem: Equatable {
        var view: String      // a view do host de onde a pessoa saiu ("areamod", "roteiros", "prioridade"…)
        var rito: String
        var peca: String
        var bloco: Int?
        var rotulo: String    // o que aparece no botão: "Voltar ao rito", "Voltar à peça · bloco 3"…
        /// O `de` recebido, serializado por JSONSerialization (chaves ordenadas, para a
        /// igualdade não depender da ordem do dicionário).
        var json: String

        /// O objeto que o `window.catedraVoltarAcervo(de)` do app web espera. JSON válido é
        /// literal JS válido; U+2028/U+2029 saem escapados para valer também em motor antigo.
        var jsonJS: String { json }
    }

    /// Termo que a tela de destino deve aplicar assim que aparecer (consumido uma vez).
    @Published var termoPendente: String = ""
    /// Ponto de origem vivo. Enquanto não for nil, a aba nativa mostra o botão de voltar.
    @Published var origem: Origem?

    /// Chamado pelo host ao receber `ctAbrirAcervo` com termo/origem.
    func chegou(termo: String, origem: Origem?) {
        termoPendente = termo.trimmingCharacters(in: .whitespacesAndNewlines)
        self.origem = origem
        if !termoPendente.isEmpty {
            NotificationCenter.default.post(name: Self.notificacaoBuscar, object: nil,
                                            userInfo: ["termo": termoPendente])
        }
    }

    /// A tela de destino pega o termo e o zera — para não reaplicar numa navegação futura.
    func consumirTermo() -> String {
        let t = termoPendente
        termoPendente = ""
        return t
    }

    /// Some com o botão de voltar (usou a volta, ou trocou de aba na mão).
    func limpar() {
        origem = nil
        termoPendente = ""
    }

    /// "Abra o acervo já buscando isto" — o LEGIS escuta e navega para a busca global.
    static let notificacaoBuscar = Notification.Name("catedraAcervoBuscar")

    /// Monta a origem a partir do dicionário `de` que o app web manda. Vale com `view` não
    /// vazia ou, compatibilidade com bundle antigo (que não mandava view), com rito/peça.
    static func origem(de dic: [String: Any]?) -> Origem? {
        guard let bruto = dic, let d = jsonPuro(bruto, profundidade: 0) as? [String: Any] else { return nil }
        let viewDada = texto(d["view"])
        let rito = texto(d["rito"])
        let peca = texto(d["peca"])
        var bloco: Int?
        if let b = d["bloco"] as? NSNumber, CFGetTypeID(b) != CFBooleanGetTypeID() { bloco = b.intValue }
        else if let s = d["bloco"] as? String, let b = Int(s) { bloco = b }
        // Sem nenhum ponto não há para onde voltar — melhor não mostrar botão nenhum.
        if viewDada.isEmpty && rito.isEmpty && peca.isEmpty { return nil }
        // Sem view, o app web trata a origem como o mapa de Processo e peças (como sempre foi).
        let view = viewDada.isEmpty ? "areamod" : viewDada
        guard let json = serializar(d) else { return nil }
        // Rótulo numa linha só: quebra (inclusive U+2028/U+2029) vira espaço no botão.
        var rotulo = texto(d["rotulo"]).components(separatedBy: .newlines).joined(separator: " ")
        if rotulo.count > 80 { rotulo = String(rotulo.prefix(79)) + "…" }
        if rotulo.isEmpty { rotulo = rotuloPadrao(view: view, peca: peca, rito: rito, bloco: bloco) }
        return Origem(view: view, rito: rito, peca: peca, bloco: bloco, rotulo: rotulo, json: json)
    }

    /// Rótulo de reserva, quando o app web não mandou `rotulo` (bundle antigo).
    private static func rotuloPadrao(view: String, peca: String, rito: String, bloco: Int?) -> String {
        if !peca.isEmpty {
            if let b = bloco { return "Voltar à peça · bloco \(b + 1)" }
            return "Voltar à peça"
        }
        if !rito.isEmpty { return "Voltar ao rito" }
        switch view {
        case "areamod":     return "Voltar ao processo"
        case "roteiros":    return "Voltar ao roteiro"
        case "prioridade":  return "Voltar ao painel de prioridade"
        case "segundafase": return "Voltar à correção"
        case "ciclo":       return "Voltar ao ciclo"
        case "revisoes":    return "Voltar à revisão"
        case "simulados":   return "Voltar ao simulado"
        case "oral":        return "Voltar à prova oral"
        default:            return "Voltar ao Cátedra"
        }
    }

    private static func texto(_ v: Any?) -> String {
        ((v as? String) ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Fica só o que é JSON (texto, número finito, booleano, null, lista, objeto com chave
    /// texto). O WebKit pode entregar Date ou NaN; esses campos caem em vez de derrubar a volta.
    private static func jsonPuro(_ v: Any, profundidade: Int) -> Any? {
        if profundidade > 12 { return nil }
        switch v {
        case let s as String:
            return s
        case let n as NSNumber:
            if CFGetTypeID(n) == CFBooleanGetTypeID() { return n }
            return n.doubleValue.isFinite ? n : nil
        case is NSNull:
            return NSNull()
        case let a as [Any]:
            return a.map { jsonPuro($0, profundidade: profundidade + 1) ?? NSNull() }
        case let d as [String: Any]:
            var r: [String: Any] = [:]
            for (k, x) in d { if let y = jsonPuro(x, profundidade: profundidade + 1) { r[k] = y } }
            return r
        default:
            return nil
        }
    }

    private static func serializar(_ d: [String: Any]) -> String? {
        guard JSONSerialization.isValidJSONObject(d),
              let dados = try? JSONSerialization.data(withJSONObject: d, options: [.sortedKeys]),
              var s = String(data: dados, encoding: .utf8) else { return nil }
        s = s.replacingOccurrences(of: "\u{2028}", with: "\\u2028")
        s = s.replacingOccurrences(of: "\u{2029}", with: "\\u2029")
        return s
    }
}
