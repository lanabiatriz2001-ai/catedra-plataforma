import Foundation

/// Artigo de lei citado por um verbete do JURIS — o inverso do índice de incidência
/// (incidencia-verbetes.json liga artigo → verbetes; aqui, verbete → artigos).
struct ArtigoCitado: Equatable, Hashable {
    let diploma: String
    let artigo: String
}

enum CitacoesLogica {
    /// [diploma: [artigo: [ids de verbete]]] → [id: [ArtigoCitado]] (sem ordem garantida).
    static func inverter(_ d: [String: [String: [String]]]) -> [String: [ArtigoCitado]] {
        var saida: [String: [ArtigoCitado]] = [:]
        for (diploma, artigos) in d {
            for (artigo, ids) in artigos {
                for id in ids { saida[id, default: []].append(ArtigoCitado(diploma: diploma, artigo: artigo)) }
            }
        }
        return saida
    }

    /// "10-A" → (10, "A"): ordem numérica, com a letra desempatando.
    static func chaveArtigo(_ a: String) -> (Int, String) {
        let partes = a.split(separator: "-", maxSplits: 1).map(String.init)
        return (Int(partes.first ?? "") ?? Int.max, partes.count > 1 ? partes[1] : "")
    }

    static func ordenar(_ xs: [ArtigoCitado]) -> [ArtigoCitado] {
        xs.sorted {
            if $0.diploma != $1.diploma { return $0.diploma.localizedCompare($1.diploma) == .orderedAscending }
            let a = chaveArtigo($0.artigo), b = chaveArtigo($1.artigo)
            return a.0 != b.0 ? a.0 < b.0 : a.1 < b.1
        }
    }
}
