import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Leitura do resumo na nuvem pelo passe deste aparelho (função widget_ler do Supabase). A chave é a PUBLICÁVEL que o
/// app web já expõe (sb_publishable_…): vai só em `apikey`, nunca como Authorization. O que protege o resumo é o passe.
enum WidgetNuvem {
    enum Resultado: Equatable { case ok(WidgetResumo?), invalido, falha }
    struct Config: Equatable { var url: String; var chave: String }

    static func config(_ info: [String: Any]?) -> Config? {
        guard let u = info?["CatedraSupabaseURL"] as? String, let k = info?["CatedraSupabaseChave"] as? String,
              u.hasPrefix("https://"), !k.isEmpty else { return nil }
        return Config(url: u, chave: k)
    }

    /// 200 + `null` = passe inválido ou revogado (o widget marca e o app pede outro); 200 + {resumo, carimbo} = ok
    /// (resumo nulo: a conta ainda não publicou); qualquer outra coisa = falha de rede ou servidor, que NÃO derruba
    /// o passe — o widget segue com a cópia local.
    static func interpretar(status: Int, corpo: Data) -> Resultado {
        guard status == 200,
              let obj = try? JSONSerialization.jsonObject(with: corpo, options: [.fragmentsAllowed]) else { return .falha }
        if obj is NSNull { return .invalido }
        guard let d = obj as? [String: Any] else { return .falha }
        guard let r = d["resumo"], !(r is NSNull) else { return .ok(nil) }
        guard JSONSerialization.isValidJSONObject(r), let dados = try? JSONSerialization.data(withJSONObject: r) else { return .falha }
        return .ok(WidgetResumo.ler(dados))
    }

    static func pedido(passe: String, config: Config) -> URLRequest? {
        guard let url = URL(string: config.url + "/rest/v1/rpc/widget_ler") else { return nil }
        var req = URLRequest(url: url, timeoutInterval: 10)
        req.httpMethod = "POST"
        req.setValue(config.chave, forHTTPHeaderField: "apikey")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["p_passe": passe])
        return req
    }

    #if canImport(Darwin)
    static func ler(passe: String, config: Config) async -> Resultado {
        guard let req = pedido(passe: passe, config: config) else { return .falha }
        do {
            let (dados, resp) = try await URLSession.shared.data(for: req)
            return interpretar(status: (resp as? HTTPURLResponse)?.statusCode ?? 0, corpo: dados)
        } catch { return .falha }
    }
    #endif
}
