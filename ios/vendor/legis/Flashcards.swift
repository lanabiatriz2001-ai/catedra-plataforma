import Foundation

/// Estilos de flashcard oferecidos à usuária (as "20 regras" do Wozniak: um
/// cartão testa UM fato, nunca o artigo inteiro).
enum FlashcardStyle: String, CaseIterable, Identifiable {
    case cloze          // lacuna sobre um trecho importante (revelar)
    case clozeDigite    // mesma lacuna, mas para ESCREVER a resposta (Anki Cloze c/ digitar)
    case certoErrado    // afirmação para julgar Certo/Errado (estilo Cebraspe)
    case direta         // pergunta direta com resposta curta
    var id: String { rawValue }
    var label: String {
        switch self {
        case .cloze: return "Lacuna — revelar"
        case .clozeDigite: return "Lacuna — escrever a resposta"
        case .certoErrado: return "Certo ou errado"
        case .direta: return "Pergunta direta"
        }
    }
    var symbol: String {
        switch self {
        case .cloze: return "rectangle.dashed"
        case .clozeDigite: return "square.and.pencil"
        case .certoErrado: return "checkmark.circle"
        case .direta: return "questionmark.circle"
        }
    }
}

/// Transforma um artigo num flashcard de verdade, respeitando o princípio do
/// MÍNIMO DE INFORMAÇÃO: cada cartão cobra um trecho/fato, nunca o artigo todo.
/// Três estilos — cloze (lacuna num trecho importante), certo/errado e pergunta
/// direta. Tudo local, determinístico, sem rede nem IA.
enum Flashcards {
    /// Cartão pronto (tipo, frente, resposta). `style` nil = automático (o melhor
    /// cloze disponível). Nunca gera "recorde o artigo inteiro".
    static func make(for unit: LawUnit, style: FlashcardStyle? = nil) -> (kind: String, prompt: String, answer: String?) {
        switch style {
        case .cloze:
            if let c = cloze(for: unit) { return c }
        case .clozeDigite:
            // Mesma geração da lacuna; só o TIPO muda (para o Anki "escreva a resposta").
            if let c = cloze(for: unit) { return (FlashKind.clozeType, c.prompt, c.answer) }
        case .certoErrado:
            if let c = certoErrado(for: unit) { return c }
        case .direta:
            if let c = direta(for: unit) { return c }
        case nil:
            break
        }
        // Automático / fallback do estilo pedido: cloze sempre entrega algo (no pior
        // caso, lacuna numa palavra-chave do 1º período — jamais o artigo inteiro).
        if let c = cloze(for: unit) { return c }
        // Só se o artigo não tiver NENHUM conteúdo textual aproveitável.
        return (FlashKind.direta, "Qual é a regra central de \(unit.label)?", nil)
    }

    // MARK: - Cloze (lacuna num trecho curto)

    /// Candidatos de cloze para a usuária poder trocar a lacuna. Cada um traz a
    /// frente (o PERÍODO relevante, não o artigo todo) com "______" no termo, e o
    /// termo escondido como resposta.
    static func clozeCandidates(for unit: LawUnit) -> [(prompt: String, answer: String)] {
        var out: [(String, String)] = []
        var seen = Set<String>()
        for sentence in sentences(of: unit) {
            let ns = sentence as NSString
            numericRegex.enumerateMatches(in: sentence, range: NSRange(location: 0, length: ns.length)) { m, _, _ in
                guard let m else { return }
                let term = ns.substring(with: m.range).trimmingCharacters(in: .whitespaces)
                guard !term.isEmpty, seen.insert(term.lowercased()).inserted else { return }
                let prompt = ns.replacingCharacters(in: m.range, with: "______")
                out.append((collapse(prompt), term))
            }
        }
        return out
    }

    static func cloze(for unit: LawUnit) -> (kind: String, prompt: String, answer: String?)? {
        // 1) Alvo forte: número/prazo/valor/quórum/percentual — o que mais se cobra.
        if let c = clozeCandidates(for: unit).first {
            return (FlashKind.cloze, c.prompt, c.answer)
        }
        // 2) Sem número: lacuna numa palavra-chave do 1º período (curto), não no todo.
        guard let sentence = sentences(of: unit).first(where: { $0.count >= 12 }) ?? sentences(of: unit).first,
              let (prompt, word) = salientBlank(in: sentence) else { return nil }
        return (FlashKind.cloze, collapse(prompt), word)
    }

    // MARK: - Pergunta direta (resposta curta)

    static func direta(for unit: LawUnit) -> (kind: String, prompt: String, answer: String?)? {
        for sentence in sentences(of: unit) {
            let ns = sentence as NSString
            guard let m = numericRegex.firstMatch(in: sentence, range: NSRange(location: 0, length: ns.length)) else { continue }
            let term = ns.substring(with: m.range).trimmingCharacters(in: .whitespaces)
            guard !term.isEmpty else { continue }
            let clause = collapse(ns.replacingCharacters(in: m.range, with: "…"))
            let prompt = "\(questionStem(for: term)) neste dispositivo?\n\n« \(clause) »"
            return (FlashKind.direta, prompt, term)
        }
        return nil
    }

    // MARK: - Certo / Errado (estilo Cebraspe)

    static func certoErrado(for unit: LawUnit) -> (kind: String, prompt: String, answer: String?)? {
        // Usa um período curto e AUTOSSUFICIENTE (evita fragmentos de inciso soltos).
        guard let sentence = sentences(of: unit).first(where: { $0.count >= 20 && $0.count <= 240 }) else { return nil }
        // Metade das vezes (determinístico pela chave) apresenta a versão FALSA.
        let wantFalse = abs(unit.key.hashValue) % 2 == 0
        if wantFalse, let f = falsify(sentence) {
            return (FlashKind.certoErrado, f.statement,
                    "Errado — no texto: “\(f.original)”, não “\(f.replacement)”.")
        }
        return (FlashKind.certoErrado, sentence, "Certo — reproduz o texto do dispositivo.")
    }

    /// Gera uma versão FALSA plausível trocando UM elemento verificável (um número,
    /// ou um termo por seu oposto jurídico). Devolve o que foi trocado, para a correção.
    private static func falsify(_ sentence: String) -> (statement: String, original: String, replacement: String)? {
        // 1) Troca de número (o mais inequívoco de julgar). Usa o numericRegex
        // "esperto" (mesmo do cloze): só casa número OPERATIVO (prazo/valor/quórum/
        // percentual, fração como unidade). Assim não gera "8 (cinco) dias" nem
        // quebra "2/3" em "5/3", nem troca um número de referência (art./lei) solto.
        let ns = sentence as NSString
        if let m = numericRegex.firstMatch(in: sentence, range: NSRange(location: 0, length: ns.length)) {
            let original = ns.substring(with: m.range)
            let replacement = wrongNumber(for: original)
            if replacement != original {
                return (ns.replacingCharacters(in: m.range, with: replacement), original, replacement)
            }
        }
        // 2) Troca por antônimo jurídico.
        for (word, opposite) in antonyms {
            if let r = sentence.range(of: "\\b\(word)\\b", options: [.regularExpression, .caseInsensitive]) {
                let original = String(sentence[r])
                let replacement = matchCase(of: original, to: opposite)
                return (sentence.replacingCharacters(in: r, with: replacement), original, replacement)
            }
        }
        return nil
    }

    // MARK: - Extração de períodos

    /// Períodos (frases) do artigo, sem o rótulo "Art. X", para servir de base aos
    /// cartões — cada período é curto o bastante para um cartão atômico.
    private static func sentences(of unit: LawUnit) -> [String] {
        let body = bodyText(of: unit)
        // Divide em ";", quebra de linha e "." de fim de frase — mas NÃO no ponto de
        // milhar (entre dígitos), senão "1.080" viraria "1"+"080" e "R$ 1.000,00"
        // viraria "R$ 1", fazendo o cartão cobrar/ensinar um valor truncado.
        let sentinel = "\u{0001}"
        let raw = body
            .replacingOccurrences(of: "(?<![0-9])\\.(?![0-9])|[;\\n]", with: sentinel, options: .regularExpression)
            .components(separatedBy: sentinel)
        var result: [String] = []
        for piece in raw {
            let s = collapse(piece)
            guard !s.isEmpty else { continue }
            // Ignora rótulos de item soltos ("I -", "a)", "§ 1º") sem conteúdo.
            // O grupo dos numerais romanos é case-SENSÍVEL (?-i:…) para não descartar
            // palavras minúsculas feitas só dessas letras ("civil", "mil", "vivi").
            if s.range(of: "^(?:(?-i:[IVXLCDM]+)|[a-z]|§+\\s*\\d*[ºo°]?|Par[áa]grafo[^:]*)\\s*[-–—)]?$",
                       options: [.regularExpression, .caseInsensitive]) != nil { continue }
            result.append(s)
        }
        return result.isEmpty ? [collapse(body)].filter { !$0.isEmpty } : result
    }

    /// Corpo do artigo sem o rótulo "Art. X" da 1ª linha (tolerante ao espaçamento).
    private static func bodyText(of unit: LawUnit) -> String {
        var lines = unit.lines
        if let first = lines.first,
           let r = first.range(of: "^Art(?:igo)?[\\s.]*\\d{1,3}(?:\\.\\d{3})*[ºo°]?(?:[-.][A-Za-z])?",
                               options: [.regularExpression, .caseInsensitive]) {
            lines[0] = String(first[r.upperBound...])
                .trimmingCharacters(in: CharacterSet(charactersIn: " .–—-\u{00A0}"))
        }
        return lines.joined(separator: "\n")
    }

    // MARK: - Helpers de cloze/pergunta

    /// Escolhe UMA palavra-chave do período para virar lacuna (a mais "conteúdo" —
    /// longa, não gramatical) e devolve a frente com "______" no lugar dela.
    private static func salientBlank(in sentence: String) -> (prompt: String, word: String)? {
        let tokens = sentence.split(whereSeparator: { !$0.isLetter && $0 != "-" && $0 != "\u{00A0}" })
        let best = tokens
            .map { String($0) }
            .filter { $0.count >= 5 && !stopwords.contains($0.folded) }
            .max(by: { $0.count < $1.count })
        guard let word = best,
              let r = sentence.range(of: "\\b\(NSRegularExpression.escapedPattern(for: word))\\b",
                                     options: .regularExpression) else { return nil }
        return (sentence.replacingCharacters(in: r, with: "______"), word)
    }

    /// Enunciado da pergunta direta conforme o tipo do número achado.
    private static func questionStem(for term: String) -> String {
        let t = term.folded
        if term.contains("%") { return "Qual é o percentual previsto" }
        if term.contains("R$") { return "Qual é o valor previsto" }
        if term.contains("/") { return "Qual é o quórum/fração previsto" }
        if t.contains("salario") { return "Qual é o valor (em salários mínimos) previsto" }
        if t.range(of: "dia|ano|mes|hora|minuto", options: .regularExpression) != nil {
            return "Qual é o prazo previsto"
        }
        return "Qual é o número/quantidade previsto"
    }

    // Troca só o NÚMERO dentro do token, preservando a unidade ("5 dias" → "8 dias",
    // "10%" → "15%"), e uma fração por outra válida ("2/3" → "1/2"). Número por
    // extenso (sem dígito) devolve igual → o falsify cai no antônimo/ "Certo".
    private static func wrongNumber(for original: String) -> String {
        let norm = original.replacingOccurrences(of: " ", with: "")
        if norm.contains("/") {   // fração / quórum
            let opcoes = ["1/2", "1/3", "2/3", "3/5", "3/4", "2/5", "4/5"]
            if let r = original.range(of: "\\d{1,2}/\\d{1,3}", options: .regularExpression) {
                let atual = original[r].replacingOccurrences(of: " ", with: "")
                let alt = opcoes.first(where: { $0 != atual }) ?? "1/2"
                return original.replacingCharacters(in: r, with: alt)
            }
            return original
        }
        // número (com ponto de milhar opcional) + unidade: mexe só no número.
        if let r = original.range(of: "\\d{1,3}(?:\\.\\d{3})*", options: .regularExpression) {
            let digits = original[r].replacingOccurrences(of: ".", with: "")
            guard let value = Int(digits) else { return original }
            let pool = [5, 8, 10, 15, 20, 24, 30, 48, 60, 72, 90, 120, 180, 360, 365]
            let alt = pool.first(where: { $0 != value }) ?? (value == 1 ? 2 : 1)
            return original.replacingCharacters(in: r, with: String(alt))
        }
        return original
    }

    private static func matchCase(of sample: String, to replacement: String) -> String {
        if sample == sample.uppercased() { return replacement.uppercased() }
        if let f = sample.first, f.isUppercase {
            return replacement.prefix(1).uppercased() + replacement.dropFirst()
        }
        return replacement
    }

    private static func collapse(_ s: String) -> String {
        s.replacingOccurrences(of: "[ \\t\\n]{2,}", with: " ", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: " \t\n.;:,–—-\u{00A0}"))
    }

    // Dinheiro, porcentagem, fração (quórum), número + unidade jurídica, e número
    // por extenso + unidade. Evita números "soltos" (que casariam o próprio número
    // do artigo, anos de datas etc.).
    private static let numericRegex = try! NSRegularExpression(pattern:
        "R\\$\\s?[\\d.]+(?:,\\d{2})?" +
        "|\\b\\d{1,3}(?:\\.\\d{3})*(?:,\\d+)?\\s?%" +
        "|(?<![\\d.])\\d{1,2}/\\d{1,3}(?![\\d/])" +
        "|\\b\\d{1,3}(?:\\.\\d{3})*\\s+(?:dias?|anos?|m[êe]s(?:es)?|horas?|minutos?|sal[áa]rios?[- ]m[íi]nimos?)\\b" +
        "|\\b(?:um|dois|tr[êe]s|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|quinze|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento)\\s+(?:dias?|anos?|m[êe]s(?:es)?|horas?)\\b",
        options: [.caseInsensitive])

    // Pares de antônimos jurídicos para gerar o Certo/Errado FALSO.
    private static let antonyms: [(String, String)] = [
        ("obrigatória", "facultativa"), ("obrigatório", "facultativo"),
        ("facultativa", "obrigatória"), ("facultativo", "obrigatório"),
        ("vedada", "permitida"), ("vedado", "permitido"),
        ("proibida", "permitida"), ("proibido", "permitido"),
        ("permitida", "vedada"), ("permitido", "vedado"),
        ("lícita", "ilícita"), ("lícito", "ilícito"),
        ("gratuita", "onerosa"), ("gratuito", "oneroso"),
        ("maior", "menor"), ("menor", "maior"),
        ("superior", "inferior"), ("inferior", "superior"),
        ("pública", "privada"), ("público", "privado"),
        ("sempre", "nunca"), ("nunca", "sempre"),
        ("válida", "nula"), ("válido", "nulo"),
    ]

    private static let stopwords: Set<String> = [
        "para", "pelo", "pela", "pelos", "pelas", "como", "quando", "onde", "entre",
        "sobre", "seus", "suas", "este", "esta", "esse", "essa", "aquele", "aquela",
        "serao", "serem", "sera", "ser", "sendo", "seja", "sejam", "seguinte",
        "seguintes", "respectivo", "respectiva", "mediante", "conforme", "art",
        "artigo", "paragrafo", "inciso", "alinea", "todos", "todas", "cada",
        "qualquer", "outro", "outra", "mesmo", "mesma", "seus",
    ]
}

/// Nomes dos tipos gravados em SRSCard.cardKind. "recall" é legado (cartões antigos
/// que recordavam o artigo inteiro — não são mais gerados).
enum FlashKind {
    static let cloze = "cloze"
    static let clozeType = "cloze_type"   // lacuna para escrever a resposta
    static let certoErrado = "certo_errado"
    static let direta = "direta"
    static let recall = "recall"
}

private extension String {
    /// minúsculas + sem acento (para comparar com a lista de stopwords).
    var folded: String { folding(options: .diacriticInsensitive, locale: nil).lowercased() }
}
