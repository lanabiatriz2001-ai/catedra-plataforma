import Foundation

/// Cliente mínimo da API da Anthropic (Claude), usado para análises assistidas
/// por IA dentro do app — sempre a partir do TEXTO OFICIAL fornecido, para ser fiel.
/// A chave é da própria usuária (Configurações) e nunca sai do app a não ser para a API.
enum AIService {
    static let defaultModel = "claude-sonnet-5"

    enum AIError: LocalizedError {
        case semChave, http(Int, String), resposta, rede(String)
        var errorDescription: String? {
            switch self {
            case .semChave: return "Configure sua chave da API da Anthropic em Configurações ▸ Inteligência Artificial."
            case .http(let c, let m): return "A API retornou erro \(c): \(m)"
            case .resposta: return "Não consegui interpretar a resposta da IA."
            case .rede(let m): return "Falha de rede: \(m)"
            }
        }
    }

    /// Envia system+prompt e devolve o texto da resposta.
    static func gerar(system: String, prompt: String, apiKey: String,
                      model: String = defaultModel, maxTokens: Int = 1200) async throws -> String {
        let chave = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !chave.isEmpty else { throw AIError.semChave }
        guard let url = URL(string: "https://api.anthropic.com/v1/messages") else { throw AIError.rede("URL inválida") }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue(chave, forHTTPHeaderField: "x-api-key")
        req.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.timeoutInterval = 60

        let body: [String: Any] = [
            "model": model,
            "max_tokens": maxTokens,
            "system": system,
            "messages": [["role": "user", "content": prompt]],
        ]
        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, resp): (Data, URLResponse)
        do { (data, resp) = try await URLSession.shared.data(for: req) }
        catch { throw AIError.rede(error.localizedDescription) }

        guard let http = resp as? HTTPURLResponse else { throw AIError.resposta }
        guard (200..<300).contains(http.statusCode) else {
            let msg = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])
                .flatMap { ($0?["error"] as? [String: Any])?["message"] as? String } ?? "erro"
            throw AIError.http(http.statusCode, msg)
        }
        // { content: [ { type:"text", text:"..." } ] }
        guard let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let content = obj["content"] as? [[String: Any]] else { throw AIError.resposta }
        let texto = content.compactMap { $0["text"] as? String }.joined()
        guard !texto.isEmpty else { throw AIError.resposta }
        return texto
    }
}
