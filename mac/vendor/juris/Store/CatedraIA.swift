import Foundation

/// Ponte de IA COMPARTILHADA entre o app e os módulos nativos (CátedraLEGIS/CátedraJURIS).
///
/// Por que existe: o `AIService` dos módulos fala direto com a API da Anthropic usando uma
/// chave que a pessoa teria de colar em Configurações. O app web não faz isso — ele chama
/// `/api/complete` na Vercel, autenticado pela sessão do Supabase que já está no WebView.
/// Duas IAs, dois jeitos de configurar, e o kill switch do console de administração só
/// valia para uma delas.
///
/// Aqui o módulo pede texto e não sabe de onde vem. Quem sabe é o HOST (main.swift), que
/// registra o provedor no arranque: ele pega o token da sessão perguntando ao WebView e
/// faz o POST. Se o host não registrar nada (módulo rodando sozinho, fora do Cátedra),
/// `disponivel` é false e a tela mostra isso em vez de pedir chave.
@MainActor
enum CatedraIA {

    /// Fechamento instalado pelo host. Recebe o prompt, devolve o texto.
    nonisolated(unsafe) static var provedor: ((String) async throws -> String)?

    /// Mensagem para quando não há IA — a tela usa isto em vez de inventar erro.
    static let semIA = "A IA não está disponível aqui. Abra o CátedraJURIS pelo aplicativo do Cátedra, com a sessão iniciada."

    static var disponivel: Bool { provedor != nil }

    /// Pede um texto à IA. Erro vira mensagem legível, nunca um crash na tela.
    static func texto(_ prompt: String) async throws -> String {
        guard let p = provedor else { throw Erro.indisponivel }
        let r = try await p(prompt)
        let limpo = r.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !limpo.isEmpty else { throw Erro.vazia }
        return limpo
    }

    /// Pede um JSON e já decodifica. A IA às vezes embrulha em cerca de código ou põe
    /// uma frase antes; por isso recortamos do primeiro `{` ao último `}` antes de parsear.
    static func json<T: Decodable>(_ prompt: String, como tipo: T.Type) async throws -> T {
        let bruto = try await texto(prompt)
        guard let inicio = bruto.firstIndex(of: "{"), let fim = bruto.lastIndex(of: "}"), inicio < fim else {
            throw Erro.formato
        }
        let recorte = String(bruto[inicio...fim])
        guard let dados = recorte.data(using: .utf8) else { throw Erro.formato }
        do { return try JSONDecoder().decode(tipo, from: dados) }
        catch { throw Erro.formato }
    }

    enum Erro: LocalizedError {
        case indisponivel, vazia, formato
        case servidor(String)   // o que o /api/complete respondeu, palavra por palavra
        var errorDescription: String? {
            switch self {
            case .indisponivel: return CatedraIA.semIA
            case .vazia:        return "A IA não respondeu."
            case .formato:      return "A IA respondeu em um formato que não consegui ler. Tente de novo."
            case .servidor(let m): return m
            }
        }
    }
}
