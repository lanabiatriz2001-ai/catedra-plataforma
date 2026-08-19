import Foundation

/// Roteiro de estudo gerado LOCALMENTE, sem IA, a partir do próprio verbete e do acervo.
/// Substitui a chamada à IA no RoteiroEstudoView: mesmo formato (RoteiroEstudo), mesmo
/// cache, zero custo, funciona off-line e é determinístico — o roteiro do Info 875 é o
/// mesmo hoje e daqui a um mês.
///
/// De onde sai cada campo:
///   frase         1ª frase do enunciado (ou a tese da nota do app, quando existe)
///   fundamento    dispositivos citados no texto (art./§/inciso + diploma), na ordem
///   comoEra/hoje  situação + observação da fonte (cancelada/superada/alterada)
///   decidiu       o enunciado inteiro, limpo
///   chave         ramos "regra"/"fundamento" da nota do app, ou frases-núcleo do enunciado
///   jurisprudencia verbetes relacionados do acervo (mesmo ramo/tema) — reais, abríveis
///   atencao       ramos "cuidado"/"excecao"/"vedacao" da nota
///   pegadinha     a inversão segura da tese (Exporter.afirmacaoFalsaAuto) — a troca que a
///                 banca faz para virar alternativa errada
///   quiz          1 questão C/E com a inversão + flashcard por lacuna (JurisFlashcards)
@MainActor
enum RoteiroLocal {

    static func gerar(_ e: JurisEntry, store: LibraryStore) -> RoteiroEstudo {
        let nota = store.notaApp(for: e.id)
        let en = limpar(e.enunciado)
        let frases = sentencas(en)
        var r = RoteiroEstudo()
        r.nivel = nivel(e)
        r.segundaFase = e.importante || (nota?.temEsquema ?? false)
        r.frase = nota?.tese.map(limpar).flatMap { $0.isEmpty ? nil : $0 } ?? frases.first ?? en
        r.fundamento = fundamentos(en + " " + (e.referencias ?? "")).joined(separator: "; ")
        r.decidiu = en
        let sit = (e.situacao ?? "").lowercased()
        let alterado = sit.contains("cancel") || sit.contains("super") || sit.contains("alter") || sit.contains("revog")
        r.comoEra = alterado ? en : ""
        r.hoje = alterado ? [e.situacao ?? "", limpar(e.observacao ?? "")].filter { !$0.isEmpty }.joined(separator: " — ") : ""
        // chave: da nota, senão frases-núcleo (as que têm verbo de decisão / operador)
        let ramos = nota?.ramos ?? []
        var chave = ramos.filter { ["regra", "fundamento"].contains($0.tipo) }.flatMap { $0.itens }
        if chave.isEmpty { chave = frases.filter(ehNucleo).prefix(5).map(String.init) }
        if chave.isEmpty, let f = frases.first { chave = [f] }
        r.chave = Array(chave.prefix(5))
        r.jurisprudencia = store.relacionados(e, limite: 5).map { rel in
            [rel.tribunal, rel.titulo].joined(separator: " · ")
        }
        let aten = ramos.filter { ["cuidado", "excecao", "vedacao", "pegadinha"].contains($0.tipo) }.flatMap { $0.itens }
        r.atencao = aten.prefix(3).joined(separator: " ")
        let falsa = Exporter.afirmacaoFalsaAuto(en)
        r.pegadinha = falsa.map { "A banca troca o núcleo e escreve: “\($0)”" } ?? ""
        // quiz: Certo/Errado com a inversão; flashcard pela melhor lacuna
        var quiz: [RoteiroEstudo.QuestaoQuiz] = []
        if let f = falsa {
            let certa = frases.first ?? en
            quiz.append(.init(en: "Julgue o item, conforme o entendimento do \(e.tribunal):",
                              alts: ["CERTO: " + certa, "ERRADO: " + f], ok: 0,
                              fb: "A segunda troca o núcleo da tese; o \(e.tribunal) decidiu exatamente o oposto. " + (r.fundamento.map { $0.isEmpty ? "" : "Fundamento: \($0)." } ?? ""),
                              fcF: nil, fcV: nil))
        }
        if let fc = JurisFlashcards.direta(e) {
            quiz.append(.init(en: fc.prompt, alts: [fc.answer ?? "—"], ok: 0,
                              fb: "Lacuna no trecho mais cobrado do enunciado.", fcF: fc.prompt, fcV: fc.answer))
        }
        r.quiz = quiz
        r.geradoEm = Date()
        return r
    }

    // MARK: - Auxiliares

    private static func nivel(_ e: JurisEntry) -> Int {
        let n = e.enunciado.count
        if e.importante { return 3 }
        return n > 700 ? 3 : (n > 300 ? 2 : 1)
    }

    static func limpar(_ s: String) -> String {
        s.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Quebra em sentenças sem cortar em "art.", "n.", "§", "inc.", "Min.", "Rel.".
    static func sentencas(_ s: String) -> [String] {
        let protegido = s.replacingOccurrences(of: "(?i)\\b(art|arts|n|nº|inc|min|rel|des|ed|obs|p|pp|fl|fls|cf|ex|v|vs)\\.", with: "$1§PT§", options: .regularExpression)
        return protegido.components(separatedBy: CharacterSet(charactersIn: ".;"))
            .map { $0.replacingOccurrences(of: "§PT§", with: ".").trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { $0.count > 25 }
    }

    private static let reFund = try! NSRegularExpression(pattern:
        "(?:arts?\\.?\\s*\\d+[\\dº°ª.,\\-A-Za-z§ ]*?(?:,?\\s*(?:§\\s*\\d+[º°]?|par[áa]grafo\\s+[úu]nico|inciso\\s+[IVXLC]+|[IVXLC]+))*)" +
        "(?:\\s*(?:,|e|do|da|de|c/c)\\s*(?:CF(?:/88)?|CR(?:FB)?/?88|C[PC]C|CPP|CP|CC|CDC|CTN|CLT|ECA|LEP|LIA|LINDB|LRF|Lei\\s+n?[ºo.]?\\s*[\\d.]+(?:/\\d{2,4})?|LC\\s*[\\d.]+(?:/\\d{2,4})?|Decreto(?:-Lei)?\\s*n?[ºo.]?\\s*[\\d.]+(?:/\\d{2,4})?))?" +
        "|\\bS[úu]mula(?:\\s+Vinculante)?\\s+n?[ºo.]?\\s*\\d+(?:\\s*(?:do|da|/)\\s*(?:STF|STJ|TST|TSE))?" +
        "|\\bTema\\s+n?[ºo.]?\\s*[\\d.]+(?:\\s*(?:do|da|/)\\s*(?:STF|STJ))?",
        options: [.caseInsensitive])

    static func fundamentos(_ s: String) -> [String] {
        let ns = s as NSString
        var vistos = Set<String>(), out: [String] = []
        for m in reFund.matches(in: s, range: NSRange(location: 0, length: ns.length)) {
            let t = limpar(ns.substring(with: m.range)).trimmingCharacters(in: CharacterSet(charactersIn: " ,;"))
            let k = t.lowercased()
            if t.count >= 6, !vistos.contains(k) { vistos.insert(k); out.append(t) }
        }
        return Array(out.prefix(8))
    }

    private static func ehNucleo(_ f: String) -> Bool {
        let l = f.lowercased()
        return ["não", "deve", "cabe", "é possível", "é vedad", "compete", "incide", "aplica", "prescreve", "prazo", "somente", "apenas", "desde que", "independe", "configura", "constitui"].contains { l.contains($0) }
    }
}
