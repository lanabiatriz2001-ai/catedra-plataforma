import Foundation

/// Ida e volta entre o mapa de "Processo e peças" (que vive no WebView do Cátedra) e as
/// abas NATIVAS do CátedraLEGIS e do CátedraJURIS.
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

    /// De onde a pessoa saiu no mapa do processo — o que a volta precisa reabrir.
    struct Origem: Equatable {
        var view: String      // "areamod" (mapa dos ritos) ou "roteiros" (grade de peças)
        var rito: String
        var peca: String
        var bloco: Int?
        var rotulo: String    // o que aparece no botão: "Voltar ao rito X", "…ao bloco 3"

        /// O objeto que o `window.catedraVoltarAcervo(de)` do app web espera.
        var jsonJS: String {
            var partes: [String] = [
                "view:\(Self.aspas(view))",
                "rito:\(Self.aspas(rito))",
                "peca:\(Self.aspas(peca))",
            ]
            if let b = bloco { partes.append("bloco:\(b)") }
            return "{" + partes.joined(separator: ",") + "}"
        }
        /// Escapa para literal de string JS (o valor vem de dados, não de código).
        private static func aspas(_ s: String) -> String {
            var e = s.replacingOccurrences(of: "\\", with: "\\\\")
            e = e.replacingOccurrences(of: "\"", with: "\\\"")
            e = e.replacingOccurrences(of: "\n", with: " ")
            return "\"\(e)\""
        }
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

    /// Monta a origem a partir do dicionário `de` que o app web manda.
    static func origem(de dic: [String: Any]?) -> Origem? {
        guard let d = dic else { return nil }
        let view = (d["view"] as? String) ?? "areamod"
        let rito = (d["rito"] as? String) ?? ""
        let peca = (d["peca"] as? String) ?? ""
        var bloco: Int?
        if let b = d["bloco"] as? Int { bloco = b }
        else if let b = d["bloco"] as? Double { bloco = Int(b) }
        else if let s = d["bloco"] as? String, let b = Int(s) { bloco = b }
        // Sem nenhum ponto não há para onde voltar — melhor não mostrar botão nenhum.
        if rito.isEmpty && peca.isEmpty { return nil }
        var rotulo = "Voltar ao processo"
        if !peca.isEmpty {
            rotulo = bloco != nil ? "Voltar à peça · bloco \((bloco ?? 0) + 1)" : "Voltar à peça"
        } else if !rito.isEmpty {
            rotulo = "Voltar ao rito"
        }
        return Origem(view: view, rito: rito, peca: peca, bloco: bloco, rotulo: rotulo)
    }
}
