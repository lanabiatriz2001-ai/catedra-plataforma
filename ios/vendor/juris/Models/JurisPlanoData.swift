import SwiftUI

/// Cronograma de leitura de súmulas do JURIS (roteiro da usuária: 'Checklist por
/// Disciplina'). Ordem e faixas FIÉIS à fonte — Vinculantes sobem; TSE, STJ e STF
/// descem (das súmulas mais recentes para as antigas). `de`→`ate` respeita a fonte
/// (pode ser decrescente); `qtd` usa a diferença absoluta.
struct JurisPlanoDia: Identifiable, Hashable {
    let dia: Int; let trilha: String; let de: Int; let ate: Int
    var id: Int { dia }
    var titulo: String { "Súmulas \(trilha)" }
    var faixa: String { de == ate ? "nº \(de)" : "\(de) a \(ate)" }
    var qtd: Int { abs(ate - de) + 1 }
}

enum JurisPlano {
    static let dias: [JurisPlanoDia] = [
        JurisPlanoDia(dia: 1, trilha: "STF Vinculantes", de: 1, ate: 12),
        JurisPlanoDia(dia: 2, trilha: "STF Vinculantes", de: 13, ate: 24),
        JurisPlanoDia(dia: 3, trilha: "STF Vinculantes", de: 25, ate: 32),
        JurisPlanoDia(dia: 4, trilha: "STF Vinculantes", de: 33, ate: 45),
        JurisPlanoDia(dia: 5, trilha: "STF Vinculantes", de: 46, ate: 63),
        JurisPlanoDia(dia: 6, trilha: "TSE", de: 73, ate: 61),
        JurisPlanoDia(dia: 7, trilha: "TSE", de: 60, ate: 49),
        JurisPlanoDia(dia: 8, trilha: "TSE", de: 48, ate: 37),
        JurisPlanoDia(dia: 9, trilha: "TSE", de: 36, ate: 25),
        JurisPlanoDia(dia: 10, trilha: "TSE", de: 24, ate: 13),
        JurisPlanoDia(dia: 11, trilha: "TSE", de: 12, ate: 1),
        JurisPlanoDia(dia: 12, trilha: "STJ", de: 676, ate: 650),
        JurisPlanoDia(dia: 13, trilha: "STJ", de: 651, ate: 630),
        JurisPlanoDia(dia: 14, trilha: "STJ", de: 629, ate: 609),
        JurisPlanoDia(dia: 15, trilha: "STJ", de: 608, ate: 594),
        JurisPlanoDia(dia: 16, trilha: "STJ", de: 593, ate: 580),
        JurisPlanoDia(dia: 17, trilha: "STJ", de: 579, ate: 566),
        JurisPlanoDia(dia: 18, trilha: "STJ", de: 565, ate: 552),
        JurisPlanoDia(dia: 19, trilha: "STJ", de: 551, ate: 538),
        JurisPlanoDia(dia: 20, trilha: "STJ", de: 537, ate: 515),
        JurisPlanoDia(dia: 21, trilha: "STJ", de: 514, ate: 491),
        JurisPlanoDia(dia: 22, trilha: "STJ", de: 490, ate: 458),
        JurisPlanoDia(dia: 23, trilha: "STJ", de: 457, ate: 433),
        JurisPlanoDia(dia: 24, trilha: "STJ", de: 432, ate: 407),
        JurisPlanoDia(dia: 25, trilha: "STJ", de: 406, ate: 390),
        JurisPlanoDia(dia: 26, trilha: "STJ", de: 389, ate: 372),
        JurisPlanoDia(dia: 27, trilha: "STJ", de: 371, ate: 354),
        JurisPlanoDia(dia: 28, trilha: "STJ", de: 353, ate: 336),
        JurisPlanoDia(dia: 29, trilha: "STJ", de: 335, ate: 318),
        JurisPlanoDia(dia: 30, trilha: "STJ", de: 317, ate: 300),
        JurisPlanoDia(dia: 31, trilha: "STJ", de: 299, ate: 283),
        JurisPlanoDia(dia: 32, trilha: "STJ", de: 282, ate: 265),
        JurisPlanoDia(dia: 33, trilha: "STJ", de: 264, ate: 248),
        JurisPlanoDia(dia: 34, trilha: "STJ", de: 247, ate: 229),
        JurisPlanoDia(dia: 35, trilha: "STJ", de: 228, ate: 211),
        JurisPlanoDia(dia: 36, trilha: "STJ", de: 210, ate: 193),
        JurisPlanoDia(dia: 37, trilha: "STJ", de: 192, ate: 175),
        JurisPlanoDia(dia: 38, trilha: "STJ", de: 173, ate: 158),
        JurisPlanoDia(dia: 39, trilha: "STJ", de: 156, ate: 140),
        JurisPlanoDia(dia: 40, trilha: "STJ", de: 139, ate: 123),
        JurisPlanoDia(dia: 41, trilha: "STJ", de: 122, ate: 115),
        JurisPlanoDia(dia: 42, trilha: "STJ", de: 114, ate: 106),
        JurisPlanoDia(dia: 43, trilha: "STJ", de: 105, ate: 93),
        JurisPlanoDia(dia: 44, trilha: "STJ", de: 93, ate: 87),
        JurisPlanoDia(dia: 45, trilha: "STJ", de: 86, ate: 69),
        JurisPlanoDia(dia: 46, trilha: "STJ", de: 67, ate: 51),
        JurisPlanoDia(dia: 47, trilha: "STJ", de: 50, ate: 33),
        JurisPlanoDia(dia: 48, trilha: "STJ", de: 32, ate: 15),
        JurisPlanoDia(dia: 49, trilha: "STJ", de: 14, ate: 1),
        JurisPlanoDia(dia: 50, trilha: "STF", de: 736, ate: 722),
        JurisPlanoDia(dia: 51, trilha: "STF", de: 721, ate: 708),
        JurisPlanoDia(dia: 52, trilha: "STF", de: 707, ate: 694),
        JurisPlanoDia(dia: 53, trilha: "STF", de: 693, ate: 680),
        JurisPlanoDia(dia: 54, trilha: "STF", de: 679, ate: 666),
        JurisPlanoDia(dia: 55, trilha: "STF", de: 665, ate: 652),
        JurisPlanoDia(dia: 56, trilha: "STF", de: 651, ate: 638),
        JurisPlanoDia(dia: 57, trilha: "STF", de: 637, ate: 624),
        JurisPlanoDia(dia: 58, trilha: "STF", de: 623, ate: 610),
        JurisPlanoDia(dia: 59, trilha: "STF", de: 609, ate: 596),
        JurisPlanoDia(dia: 60, trilha: "STF", de: 595, ate: 582),
        JurisPlanoDia(dia: 61, trilha: "STF", de: 581, ate: 568),
        JurisPlanoDia(dia: 62, trilha: "STF", de: 567, ate: 554),
        JurisPlanoDia(dia: 63, trilha: "STF", de: 553, ate: 540),
        JurisPlanoDia(dia: 64, trilha: "STF", de: 539, ate: 526),
        JurisPlanoDia(dia: 65, trilha: "STF", de: 525, ate: 512),
        JurisPlanoDia(dia: 66, trilha: "STF", de: 511, ate: 498),
        JurisPlanoDia(dia: 67, trilha: "STF", de: 497, ate: 484),
        JurisPlanoDia(dia: 68, trilha: "STF", de: 483, ate: 470),
        JurisPlanoDia(dia: 69, trilha: "STF", de: 469, ate: 456),
        JurisPlanoDia(dia: 70, trilha: "STF", de: 455, ate: 442),
        JurisPlanoDia(dia: 71, trilha: "STF", de: 441, ate: 428),
        JurisPlanoDia(dia: 72, trilha: "STF", de: 427, ate: 414),
        JurisPlanoDia(dia: 73, trilha: "STF", de: 413, ate: 400),
        JurisPlanoDia(dia: 74, trilha: "STF", de: 399, ate: 386),
        JurisPlanoDia(dia: 75, trilha: "STF", de: 385, ate: 372),
        JurisPlanoDia(dia: 76, trilha: "STF", de: 371, ate: 358),
        JurisPlanoDia(dia: 77, trilha: "STF", de: 357, ate: 344),
        JurisPlanoDia(dia: 78, trilha: "STF", de: 343, ate: 330),
        JurisPlanoDia(dia: 79, trilha: "STF", de: 329, ate: 316),
        JurisPlanoDia(dia: 80, trilha: "STF", de: 315, ate: 302),
        JurisPlanoDia(dia: 81, trilha: "STF", de: 300, ate: 288),
        JurisPlanoDia(dia: 82, trilha: "STF", de: 287, ate: 275),
        JurisPlanoDia(dia: 83, trilha: "STF", de: 273, ate: 260),
        JurisPlanoDia(dia: 84, trilha: "STF", de: 259, ate: 246),
        JurisPlanoDia(dia: 85, trilha: "STF", de: 245, ate: 232),
        JurisPlanoDia(dia: 86, trilha: "STF", de: 231, ate: 218),
        JurisPlanoDia(dia: 87, trilha: "STF", de: 217, ate: 204),
        JurisPlanoDia(dia: 88, trilha: "STF", de: 203, ate: 190),
        JurisPlanoDia(dia: 89, trilha: "STF", de: 189, ate: 176),
        JurisPlanoDia(dia: 90, trilha: "STF", de: 175, ate: 162),
        JurisPlanoDia(dia: 91, trilha: "STF", de: 161, ate: 148),
        JurisPlanoDia(dia: 92, trilha: "STF", de: 147, ate: 134),
        JurisPlanoDia(dia: 93, trilha: "STF", de: 133, ate: 120),
        JurisPlanoDia(dia: 94, trilha: "STF", de: 119, ate: 106),
        JurisPlanoDia(dia: 95, trilha: "STF", de: 105, ate: 92),
        JurisPlanoDia(dia: 96, trilha: "STF", de: 91, ate: 78),
        JurisPlanoDia(dia: 97, trilha: "STF", de: 77, ate: 64),
        JurisPlanoDia(dia: 98, trilha: "STF", de: 63, ate: 50),
        JurisPlanoDia(dia: 99, trilha: "STF", de: 51, ate: 36),
        JurisPlanoDia(dia: 100, trilha: "STF", de: 35, ate: 22),
        JurisPlanoDia(dia: 101, trilha: "STF", de: 21, ate: 1),
    ]

    static var totalDias: Int { dias.count }
    static var totalSumulas: Int { dias.reduce(0) { $0 + $1.qtd } }
    static var porTrilha: [(trilha: String, dias: [JurisPlanoDia])] {
        var ordem: [String] = []; var mapa: [String:[JurisPlanoDia]] = [:]
        for d in dias { if mapa[d.trilha] == nil { ordem.append(d.trilha) }; mapa[d.trilha, default: []].append(d) }
        return ordem.map { ($0, mapa[$0] ?? []) }
    }
}
