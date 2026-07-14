import SwiftUI
import AppKit

/// Tipo de marcação aplicada ao texto do enunciado.
enum MarkKind: String, Codable, CaseIterable, Identifiable {
    case grifar       // realce (fundo)
    case sublinhar    // sublinhado
    case tachar       // tachado
    case negrito      // negrito (peso forte)
    case italico      // itálico
    case corTexto     // cor da letra (foreground)
    case cloze        // lacuna para flashcard (vira {{c1::…}} no Anki)
    var id: String { rawValue }

    var nome: String {
        switch self {
        case .grifar: return "Grifar"
        case .sublinhar: return "Sublinhar"
        case .tachar: return "Tachar"
        case .negrito: return "Negrito"
        case .italico: return "Itálico"
        case .corTexto: return "Cor do texto"
        case .cloze: return "Lacuna (cloze)"
        }
    }
    var simbolo: String {
        switch self {
        case .grifar: return "highlighter"
        case .sublinhar: return "underline"
        case .tachar: return "strikethrough"
        case .negrito: return "bold"
        case .italico: return "italic"
        case .corTexto: return "a.square"
        case .cloze: return "rectangle.dashed"
        }
    }
}

/// Cores disponíveis para grifar (hex).
enum MarkColor: String, CaseIterable, Identifiable {
    case amarelo = "#F2D24B"
    case verde   = "#8BD17C"
    case rosa    = "#F29BB5"
    case azul    = "#8FBEF0"
    case laranja = "#F2B366"
    var id: String { rawValue }
    var color: Color { Color(hex: rawValue) }
    /// Paleta inicial de cores favoritas (hex).
    static var padrao: [String] { allCases.map(\.rawValue) }
}

/// Uma marcação persistida: intervalo (UTF-16, como o NSTextView usa) + tipo + cor.
struct TextMark: Codable, Hashable, Identifiable {
    var start: Int
    var length: Int
    var kind: MarkKind
    var colorHex: String?
    /// Comentário em balão na margem, ancorado a este trecho (espelha o LEGIS).
    var note: String?
    var id: String { "\(start)-\(length)-\(kind.rawValue)" }
    var range: NSRange { NSRange(location: start, length: length) }
}

/// Item do índice alfabético.
struct IndiceItem: Identifiable, Hashable {
    let tema: String
    let count: Int
    var id: String { tema }
}
