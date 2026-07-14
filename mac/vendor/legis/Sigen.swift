import SwiftUI
import Foundation

// MARK: - Modelo do enriquecimento estruturado do Senado (SIGEN / Dados Abertos)

/// Um evento de alteração de um dispositivo (revogação, nova redação, remissão),
/// tal como o Senado registra — tipado e com a norma que causou a mudança.
struct SigenEvent: Codable, Hashable {
    var article: String    // "Art. 3" (extraído de nomeDispositivo)
    var kindRaw: String    // o "comentario" do SIGEN (taxonomia oficial)
    var byNorma: String    // "Lei nº 13.146 de 06/07/2015"
    var byCodigo: String   // codNormaPosterior (para deep-link futuro)

    enum Kind { case revogado, revogadoParcial, alteracao, remissao, vigencia, outro }
    var kind: Kind {
        let c = kindRaw.lowercased().folding(options: .diacriticInsensitive, locale: nil)
        if c.contains("revogacao de parte") { return .revogadoParcial }
        if c.contains("revoga") { return .revogado }
        if c.contains("encerramento de vigencia") { return .vigencia }
        if c.contains("correlat") { return .remissao }
        if c.contains("altera") || c.contains("acrescimo") || c.contains("nova redacao") { return .alteracao }
        return .outro
    }
}

/// Uma entrada da linha do tempo: uma norma que alterou esta, com a data.
struct SigenTimelineEntry: Codable, Hashable {
    var norma: String      // "Lei nº 13.104 de 09/03/2015"
    var date: String       // "09/03/2015"
    var comment: String
    var codigo: String     // codnormaposterior

    /// "aaaammdd" a partir de "dd/mm/aaaa" para ordenar cronologicamente.
    var sortKey: String {
        let p = date.split(separator: "/")
        return p.count == 3 ? "\(p[2])\(p[1])\(p[0])" : date
    }
    var year: String { String(sortKey.prefix(4)) }
}

/// O resultado do enriquecimento de uma norma. `resolved == false` é o sentinela
/// negativo (norma sem código no SIGEN — ex.: Constituição/ADCT) para não re-tentar.
struct SigenNorma: Codable, Hashable {
    var codigo: String
    var events: [SigenEvent]
    var timeline: [SigenTimelineEntry]
    var fetchedAt: Date
    var resolved: Bool
    var subjects: [String]?   // descritores temáticos (indexacao) — Optional p/ caches antigos

    static func unresolved() -> SigenNorma {
        SigenNorma(codigo: "", events: [], timeline: [], fetchedAt: Date(), resolved: false, subjects: [])
    }
    var hasData: Bool { resolved && !timeline.isEmpty }
    var subjectList: [String] { subjects ?? [] }
}

// MARK: - Cliente SIGEN

enum Sigen {
    /// Tipo canônico (de LegislativeNote) → sigla do SIGEN. Verificado ao vivo:
    /// LEI/LCP/DEL/DEC/MPV/EMC. Constituição/resolução/ato não têm código confiável.
    static func sigla(forCanonicalType t: String) -> String? {
        switch t {
        case "lei": return "LEI"
        case "lc": return "LCP"
        case "dl": return "DEL"
        case "decreto": return "DEC"
        case "mp": return "MPV"
        case "ec": return "EMC"
        default: return nil
        }
    }

    /// (sigla, número, ano) a partir da `reference` da norma ("Lei nº 10.406, de 10 de janeiro de 2002").
    static func key(fromReference ref: String) -> (sigla: String, numero: String, ano: String)? {
        guard let parsed = LegislativeNote.reference(in: ref),
              let sigla = sigla(forCanonicalType: LegislativeNote.canonicalType(parsed.type)),
              let ym = ref.range(of: "\\b(19|20)\\d{2}\\b", options: .regularExpression) else { return nil }
        var numero = parsed.number
        // MPs permanentes têm sufixo de reedição ("2.200-2"); LegislativeNote corta
        // no hífen → /MPV/2200 (norma errada). Preserva o "-N" só para MPV.
        if sigla == "MPV", let r = ref.range(of: "\\b\\d[\\d.]*-\\d+", options: .regularExpression) {
            numero = ref[r].replacingOccurrences(of: ".", with: "")
        }
        return (sigla, numero, String(ref[ym]))
    }

    /// Resultado da busca, distinguindo falha DEFINITIVA (não re-tentar; cacheia
    /// sentinela) de falha TRANSITÓRIA de rede (re-tentar na próxima abertura).
    enum FetchResult { case success(SigenNorma); case empty; case networkError }

    /// Busca e parseia o detalhe da norma. Chamada de rede — rode fora da MainActor.
    static func fetch(sigla: String, numero: String, ano: String) async -> FetchResult {
        guard let url = URL(string: "https://legis.senado.leg.br/dadosabertos/legislacao/\(sigla)/\(numero)/\(ano)") else { return .empty }
        var req = URLRequest(url: url)
        req.setValue("application/json", forHTTPHeaderField: "Accept")   // sem isso volta XML
        req.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) VadeMecum", forHTTPHeaderField: "User-Agent")
        req.timeoutInterval = 25
        guard let (data, resp) = try? await URLSession.shared.data(for: req),
              let http = resp as? HTTPURLResponse else { return .networkError }  // transporte/timeout
        if http.statusCode == 200 {
            // 200 com corpo NÃO-JSON (página de manutenção/erro servida como 200) ou com
            // shape inesperada é falha TRANSITÓRIA — re-tentar, nunca cachear o sentinela
            // permanente. Só 404/410 é definitivo (por design).
            guard let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                return .networkError
            }
            guard let norma = parse(root) else { return .networkError }
            return .success(norma)
        }
        // SÓ "não encontrado" é definitivo (cacheia sentinela). 429/403/5xx e afins são
        // transitórios — NÃO cacheiam (senão um Too Many Requests na indexação em massa
        // marcaria normas boas como permanentemente sem dados).
        if http.statusCode == 404 || http.statusCode == 410 { return .empty }
        return .networkError
    }

    // Parsing TOLERANTE: os nós do SIGEN vêm ora objeto único, ora array, ora "" (vazio),
    // e o array pode ser HETEROGÊNEO (um "" ou null no meio de objetos) — mapeia elemento
    // a elemento para não descartar os irmãos válidos.
    private static func obj(_ any: Any?) -> [String: Any]? { any as? [String: Any] }
    private static func arr(_ any: Any?) -> [[String: Any]] {
        if let a = any as? [Any] { return a.compactMap { $0 as? [String: Any] } }
        if let d = any as? [String: Any] { return [d] }
        return []   // "" ou ausente → vazio
    }
    private static func str(_ any: Any?) -> String {
        if let s = any as? String { return s }
        if let n = any as? NSNumber { return n.stringValue }
        return ""
    }

    private static func parse(_ root: [String: Any]) -> SigenNorma? {
        guard let detalhe = obj(root["DetalheDocumento"]),
              let documentos = obj(detalhe["documentos"]),
              let doc = arr(documentos["documento"]).first else { return nil }
        let codigo = str(doc["id"])

        var events: [SigenEvent] = []
        if let disps = obj(doc["disps"]) {
            for disp in arr(disps["disp"]) {
                let art = articleLabel(from: str(disp["nomeDispositivo"]))
                guard let refs = obj(disp["refs"]) else { continue }
                for ref in arr(refs["ref"]) {
                    events.append(SigenEvent(article: art, kindRaw: str(ref["comentario"]),
                                             byNorma: str(ref["dispositivo"]),
                                             byCodigo: str(ref["codNormaPosterior"])))
                }
            }
        }

        var timeline: [SigenTimelineEntry] = []
        var seen = Set<String>()
        if let vides = obj(doc["vides"]) {
            for vide in arr(vides["vide"]) {
                let entry = SigenTimelineEntry(norma: str(vide["nomeNormaPosterior"]),
                                               date: str(vide["datAssinatura"]),
                                               comment: str(vide["comentario"]),
                                               codigo: str(vide["codnormaposterior"]))
                let dedup = "\(entry.norma)|\(entry.date)"
                guard !entry.norma.isEmpty, seen.insert(dedup).inserted else { continue }
                timeline.append(entry)
            }
        }
        timeline.sort { $0.sortKey > $1.sortKey }   // mais recente primeiro

        // Assuntos (indexacao.frase): "APROVAÇÃO , CODIGO , CONSUMIDOR ." → descritores.
        // Tolerante como o resto do parser: `indexacao` pode ser objeto único ou array,
        // e `frase` pode ser array HETEROGÊNEO (null/número no meio) ou string única —
        // por isso arr()/compactMap, não `as? [String]` (tudo-ou-nada).
        var subjects: [String] = []
        var seenSubj = Set<String>()
        for node in arr(doc["indexacao"]) {
            var frases: [String] = []
            if let a = node["frase"] as? [Any] { frases = a.compactMap { $0 as? String } }
            else if let s = node["frase"] as? String { frases = [s] }
            for frase in frases {
                for raw in frase.components(separatedBy: CharacterSet(charactersIn: ",.;/")) {
                    let term = raw.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard term.count >= 2 else { continue }
                    let key = term.uppercased().folding(options: .diacriticInsensitive, locale: nil)
                    if seenSubj.insert(key).inserted { subjects.append(term) }
                }
            }
        }
        return SigenNorma(codigo: codigo, events: events, timeline: timeline,
                          fetchedAt: Date(), resolved: true, subjects: subjects)
    }

    /// "Art. 3 [Lei nº ...]" → "Art. 3".
    private static func articleLabel(from nome: String) -> String {
        if let r = nome.range(of: "[") { return String(nome[..<r.lowerBound]).trimmingCharacters(in: .whitespaces) }
        return nome.trimmingCharacters(in: .whitespaces)
    }
}
