import Foundation

struct WidgetProvaRef: Codable, Equatable { var orgao: String; var ano: Int }

struct WidgetItemDoDia: Codable, Equatable {
    var tipo: String          // "artigo" | "sumula"
    var id: String
    var titulo: String
    var diploma: String
    var artigo: String?
    var ramo: String
    var cor: String
    var corD: String
    var texto: String
    var n: Int
    var rotulo: String        // "caiu em N provas" | "citada em N julgados"
    var provas: [WidgetProvaRef]?

    private enum CodingKeys: String, CodingKey { case tipo, id, titulo, diploma, artigo, ramo, cor, corD, texto, n, rotulo, provas }

    /// Leitura tolerante: só `tipo`, `id` e `titulo` são obrigatórios (sem eles o item é descartado);
    /// o resto, faltando ou com tipo errado, vira o padrão daquele campo.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        func s(_ k: CodingKeys) -> String { ((try? c.decodeIfPresent(String.self, forKey: k)) ?? nil) ?? "" }
        tipo = s(.tipo); id = s(.id); titulo = s(.titulo)
        guard !tipo.isEmpty, !id.isEmpty, !titulo.isEmpty else {
            throw DecodingError.dataCorruptedError(forKey: .id, in: c, debugDescription: "item do dia sem tipo, id ou título")
        }
        diploma = s(.diploma); ramo = s(.ramo); cor = s(.cor); corD = s(.corD); texto = s(.texto); rotulo = s(.rotulo)
        let a = s(.artigo); artigo = a.isEmpty ? nil : a
        n = ((try? c.decodeIfPresent(Int.self, forKey: .n)) ?? nil) ?? 0
        provas = ((try? c.decodeIfPresent([Opcional<WidgetProvaRef>].self, forKey: .provas)) ?? nil)?.compactMap(\.valor)
    }
}

/// Decodifica um elemento sem derrubar o array quando ele está ruim.
private struct Opcional<T: Decodable>: Decodable {
    let valor: T?
    init(from decoder: Decoder) throws { valor = try? T(from: decoder) }
}

/// Lei/súmula do dia: um recorte embutido no widget (widget/dodia.json, gerado por scripts/build-widget-dodia.mjs)
/// girado pela data — o mesmo item em todos os aparelhos no mesmo dia, sem rede.
enum WidgetDoDia {
    static let epoca = "2026-01-01"
    private struct Arquivo: Decodable { var itens: [Opcional<WidgetItemDoDia>] }

    static func carregar(_ dados: Data) -> [WidgetItemDoDia] {
        (try? JSONDecoder().decode(Arquivo.self, from: dados))?.itens.compactMap(\.valor) ?? []
    }
    static func indice(em data: Date, total: Int, calendario cal: Calendar) -> Int {
        guard total > 0, let ini = WidgetHoje.data(epoca, cal) else { return 0 }
        let d = WidgetHoje.diasEntre(ini, data, cal)
        return ((d % total) + total) % total
    }
    static func item(_ itens: [WidgetItemDoDia], em data: Date, calendario cal: Calendar) -> WidgetItemDoDia? {
        itens.isEmpty ? nil : itens[indice(em: data, total: itens.count, calendario: cal)]
    }
    static func destino(_ i: WidgetItemDoDia) -> WidgetDestino {
        if i.tipo == "artigo", let a = i.artigo, !i.diploma.isEmpty { return .legis(diploma: i.diploma, artigo: a) }
        return .juris(id: i.id)
    }
}
