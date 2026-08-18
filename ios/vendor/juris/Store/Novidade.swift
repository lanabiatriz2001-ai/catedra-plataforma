import Foundation

/// Um evento de atualização (informativo/súmula novos baixados dos sites oficiais).
struct NovidadeEvent: Codable, Identifiable, Hashable {
    var id: String
    var timestamp: Double          // epoch (segundos)
    var fonte: String
    var titulo: String             // "Informativo STJ nº 895"
    var detalhe: String            // "12 julgados novos · 30/06/2026"
    var ids: [String]              // verbetes incluídos

    var data: Date { Date(timeIntervalSince1970: timestamp) }
    var fonteKind: Fonte { Fonte(rawValue: fonte) ?? .outro }
}
