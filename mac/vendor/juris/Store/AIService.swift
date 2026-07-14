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

    // MARK: - Comparação STF × STJ (fiel ao texto oficial)

    static func compararSTFxSTJ(assunto: String, verbete: String, tribunalVerbete: String,
                                nota: String?, stf: [String], stj: [String],
                                apiKey: String, model: String = defaultModel) async throws -> String {
        let system = """
        Você é um assistente jurídico para concursos de magistratura no Brasil. Analise como o STF e o \
        STJ tratam um tema, usando SOMENTE o material fornecido (o verbete em análise, a nota de estudo \
        curada e os enunciados oficiais correlatos).

        REGRA SUPREMA: é sempre preferível responder de MENOS a afirmar algo que não está no material. \
        Na dúvida, escreva "sem registro no material fornecido". NUNCA use conhecimento próprio ou externo, \
        ainda que você tenha certeza — se não está escrito no material, não existe para esta resposta.

        Regras de FIDELIDADE:
        - NÚMEROS (súmula, tema, repercussão geral, repetitivo): copie EXATAMENTE como aparecem no material. \
        Se o número não estiver escrito, exponha o entendimento SEM número — jamais deduza, arredonde ou recorde de memória.
        - SITUAÇÃO: cada enunciado pode vir com um status entre colchetes (ex.: [SUPERADA], [CANCELADA], [REVOGADA], [APROVADA]). \
        Se estiver superada/cancelada/revogada, diga isso explicitamente e NÃO a apresente como entendimento atual. \
        Se o status não constar, escreva "vigência não confirmável pelo material" — não presuma que é vigente.
        - FORÇA VINCULANTE: entre colchetes também vem a natureza (Súmula Vinculante, Tese de Repercussão Geral, \
        Repetitivo, Súmula, Informativo). Registre-a quando relevante — só a Súmula Vinculante e os precedentes \
        do art. 927 do CPC são de observância obrigatória; súmula comum/informativo são persuasivos.
        - DATAS: o material NÃO traz datas de julgamento. Não cite nenhuma data, ano ou período.
        - CORRELATOS: os enunciados "correlatos" foram selecionados automaticamente por palavras-chave e podem \
        NÃO tratar exatamente do mesmo ponto. Antes de comparar, confirme que versam sobre a mesma questão; se não, diga isso e não force a comparação.
        - Ancore cada afirmação em um enunciado específico do material (pelo título). Não escreva frase que você não consiga apontar num item fornecido.
        - A nota de estudo é resumo humano: use-a para contexto, mas para NÚMEROS, redação e STATUS prevalece o texto oficial dos enunciados; se a nota contradisser um enunciado, aponte a divergência.

        Estrutura da resposta (use exatamente estes rótulos, em negrito markdown):
        **Tema:** (uma linha)
        **STF:** núcleo do entendimento (só com o que está no material)
        **STJ:** núcleo do entendimento (idem)
        **Relação:** só afirme CONVERGEM ou DIVERGEM se os DOIS tratarem da mesma questão e o material permitir \
        (divergência = mesma pergunta jurídica, respostas diferentes). Se um lado for "sem registro" ou tratarem de \
        aspectos distintos, escreva "não é possível comparar com o material fornecido".
        **Atenção (prova):** só aponte pegadinha/mudança se estiver EXPLÍCITA no material (ex.: enunciado marcado como \
        superado/cancelado, requisitos cumulativos, exceções, diferença de redação entre STF e STJ). Nada de "atualizações recentes" fora do material. Se não houver, escreva "sem alerta específico no material".
        """
        func lista(_ xs: [String]) -> String {
            xs.isEmpty ? "sem registro no material fornecido (não significa ausência de entendimento do tribunal)"
                : xs.prefix(8).map { "- \($0)" }.joined(separator: "\n")
        }
        var prompt = """
        TEMA: \(assunto)

        VERBETE EM ANÁLISE (\(tribunalVerbete)):
        \(verbete)
        """
        if let nota, !nota.isEmpty {
            prompt += "\n\nNOTA DE ESTUDO (curada, confiável — priorize-a):\n\(nota)"
        }
        prompt += """


        ENUNCIADOS CORRELATOS DO STF:
        \(lista(stf))

        ENUNCIADOS CORRELATOS DO STJ:
        \(lista(stj))
        """
        return try await gerar(system: system, prompt: prompt, apiKey: apiKey, model: model, maxTokens: 1000)
    }
}
