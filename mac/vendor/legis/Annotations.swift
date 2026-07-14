import Foundation
import SwiftUI
import AppKit

enum AnnotationStyle: String, Codable, CaseIterable, Identifiable {
    case highlight
    case underline
    case strikethrough
    case bold
    case italic
    case textColor
    case cloze   // lacuna para flashcard (vira {{c1::…}} no Anki) — espelha o JURIS

    var id: String { rawValue }

    var label: String {
        switch self {
        case .highlight: return "Grifar"
        case .underline: return "Sublinhar"
        case .strikethrough: return "Tachar"
        case .bold: return "Negrito"
        case .italic: return "Itálico"
        case .textColor: return "Cor do texto"
        case .cloze: return "Lacuna (cloze)"
        }
    }

    var symbol: String {
        switch self {
        case .highlight: return "highlighter"
        case .underline: return "underline"
        case .strikethrough: return "strikethrough"
        case .bold: return "bold"
        case .italic: return "italic"
        case .textColor: return "character"
        case .cloze: return "rectangle.dashed"
        }
    }
}

/// Uma marcação/anotação sobre um trecho do texto de uma norma.
/// `location`/`length` são offsets UTF-16 (compatíveis com NSRange/NSTextView).
/// Quando a norma muda no Planalto, a âncora é reencontrada pelo texto selecionado
/// e pelo contexto; se não for possível, a anotação fica "órfã" (location = -1).
struct TextAnnotation: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var lawID: UUID
    var location: Int
    var length: Int
    var selectedText: String
    var contextBefore: String = ""
    var contextAfter: String = ""
    var style: AnnotationStyle
    var colorHex: String
    var note: String = ""
    var noteFontFamily: String?
    var noteFontSize: Double?
    var createdAt: Date = Date()

    var isOrphaned: Bool { location < 0 }
    var range: NSRange { NSRange(location: location, length: length) }

    // Decodificação tolerante a chaves ausentes (campos adicionados depois),
    // para que uma anotação antiga nunca derrube a biblioteca inteira.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(UUID.self, forKey: .id) ?? UUID()
        lawID = try c.decode(UUID.self, forKey: .lawID)
        location = try c.decode(Int.self, forKey: .location)
        length = try c.decode(Int.self, forKey: .length)
        selectedText = try c.decodeIfPresent(String.self, forKey: .selectedText) ?? ""
        contextBefore = try c.decodeIfPresent(String.self, forKey: .contextBefore) ?? ""
        contextAfter = try c.decodeIfPresent(String.self, forKey: .contextAfter) ?? ""
        style = try c.decodeIfPresent(AnnotationStyle.self, forKey: .style) ?? .highlight
        colorHex = try c.decodeIfPresent(String.self, forKey: .colorHex) ?? "#FFD60AFF"
        note = try c.decodeIfPresent(String.self, forKey: .note) ?? ""
        noteFontFamily = try c.decodeIfPresent(String.self, forKey: .noteFontFamily)
        noteFontSize = try c.decodeIfPresent(Double.self, forKey: .noteFontSize)
        createdAt = try c.decodeIfPresent(Date.self, forKey: .createdAt) ?? Date()
    }

    init(id: UUID = UUID(), lawID: UUID, location: Int, length: Int, selectedText: String,
         contextBefore: String = "", contextAfter: String = "", style: AnnotationStyle,
         colorHex: String, note: String = "", noteFontFamily: String? = nil,
         noteFontSize: Double? = nil, createdAt: Date = Date()) {
        self.id = id
        self.lawID = lawID
        self.location = location
        self.length = length
        self.selectedText = selectedText
        self.contextBefore = contextBefore
        self.contextAfter = contextAfter
        self.style = style
        self.colorHex = colorHex
        self.note = note
        self.noteFontFamily = noteFontFamily
        self.noteFontSize = noteFontSize
        self.createdAt = createdAt
    }
}

enum Annotations {
    static let contextLength = 40

    /// Constrói o texto Cloze do Anki a partir das lacunas marcadas — espelha o
    /// `Exporter.clozeDeMarcas` do JURIS. `agrupado`: todas viram c1 (um card,
    /// "Digite a Resposta"); senão c1, c2, c3… (um card por lacuna).
    static func clozeText(_ texto: String, _ lacunas: [TextAnnotation], agrupado: Bool) -> String? {
        guard !lacunas.isEmpty else { return nil }
        let ns = texto as NSString
        var rs = lacunas.map(\.range)
            .filter { $0.length > 0 && $0.location >= 0 && $0.location + $0.length <= ns.length }
            .sorted { $0.location < $1.location }
        guard !rs.isEmpty else { return nil }
        var limpo: [NSRange] = []
        for r in rs where (limpo.last.map { NSMaxRange($0) <= r.location } ?? true) { limpo.append(r) }
        rs = limpo
        var resultado = ""; var cursor = 0; var n = 1
        for r in rs {
            if r.location > cursor { resultado += ns.substring(with: NSRange(location: cursor, length: r.location - cursor)) }
            resultado += "{{c\(agrupado ? 1 : n)::\(ns.substring(with: r))}}"
            cursor = NSMaxRange(r); n += 1
        }
        if cursor < ns.length { resultado += ns.substring(with: NSRange(location: cursor, length: ns.length - cursor)) }
        return resultado
    }

    private static let numericRegex = try! NSRegularExpression(
        pattern: "\\b\\d+([.,]\\d+)?\\s*(anos?|meses|dias|%|por cento)?\\b")

    /// Sugere a melhor lacuna automática do trecho — número/prazo/valor (o que mais
    /// se cobra em prova), evitando lacunas já usadas. Espelha `Exporter.melhorLacuna`
    /// do JURIS, adaptado ao texto local do artigo (`unitRange`-relative).
    static func melhorLacuna(_ texto: String, evitando usados: [NSRange] = []) -> NSRange? {
        let ns = texto as NSString
        let full = NSRange(location: 0, length: ns.length)
        func livre(_ r: NSRange) -> Bool { usados.allSatisfy { NSIntersectionRange($0, r).length == 0 } }
        for m in numericRegex.matches(in: texto, range: full) where livre(m.range) { return m.range }
        return nil
    }

    static func make(lawID: UUID, range: NSRange, in fullText: String,
                     style: AnnotationStyle, colorHex: String) -> TextAnnotation? {
        let ns = fullText as NSString
        guard range.length > 0, range.location >= 0,
              range.location + range.length <= ns.length else { return nil }
        let before = NSRange(location: max(0, range.location - contextLength),
                             length: min(contextLength, range.location))
        let afterStart = range.location + range.length
        let after = NSRange(location: afterStart,
                            length: min(contextLength, ns.length - afterStart))
        return TextAnnotation(lawID: lawID,
                              location: range.location,
                              length: range.length,
                              selectedText: ns.substring(with: range),
                              contextBefore: ns.substring(with: before),
                              contextAfter: ns.substring(with: after),
                              style: style,
                              colorHex: colorHex)
    }

    /// Reposiciona as anotações de uma norma após o texto mudar.
    static func reanchor(_ annotations: [TextAnnotation], lawID: UUID, newText: String) -> [TextAnnotation] {
        let ns = newText as NSString
        return annotations.map { annotation in
            guard annotation.lawID == lawID else { return annotation }
            var a = annotation
            // 1. A posição antiga ainda vale?
            if a.location >= 0, a.location + a.length <= ns.length,
               ns.substring(with: a.range) == a.selectedText {
                return a
            }
            // 2. Procura todas as ocorrências do trecho (avança 1 a 1 para não pular sobrepostas).
            var occurrences: [NSRange] = []
            var searchStart = 0
            while searchStart < ns.length {
                let found = ns.range(of: a.selectedText, options: [],
                                     range: NSRange(location: searchStart, length: ns.length - searchStart))
                if found.location == NSNotFound { break }
                occurrences.append(found)
                searchStart = found.location + 1
                if occurrences.count > 200 { break }
            }
            if occurrences.count == 1 {
                a.location = occurrences[0].location
                a.length = occurrences[0].length
                return a
            }
            // 3. Desambigua pelo contexto imediato.
            if occurrences.count > 1 {
                let beforeKey = String(a.contextBefore.suffix(15))
                let afterKey = String(a.contextAfter.prefix(15))
                for occurrence in occurrences {
                    let bStart = max(0, occurrence.location - contextLength)
                    let before = ns.substring(with: NSRange(location: bStart, length: occurrence.location - bStart))
                    let aStart = occurrence.location + occurrence.length
                    let after = ns.substring(with: NSRange(location: aStart, length: min(contextLength, ns.length - aStart)))
                    if (!beforeKey.isEmpty && before.hasSuffix(beforeKey)) ||
                       (!afterKey.isEmpty && after.hasPrefix(afterKey)) {
                        a.location = occurrence.location
                        a.length = occurrence.length
                        return a
                    }
                }
                // Ambíguo sem contexto compatível: melhor marcar como órfã do que
                // migrar silenciosamente o grifo para o artigo errado.
                a.location = -1
                a.length = 0
                return a
            }
            // 4. O trecho sumiu do texto (pode ter sido revogado/alterado): órfã.
            a.location = -1
            a.length = 0
            return a
        }
    }
}

// MARK: - Paleta de cores de marcação (favoritas)

/// Cores padrão de grifo, espelhando a paleta do CátedraJURIS (amarelo/verde/rosa/azul/laranja).
enum MarkColorLegis {
    static let padrao = ["#FFD60AFF", "#34C759FF", "#FF375FFF", "#0A84FFFF", "#FF9F0AFF"]
}

// MARK: - Cores em hexadecimal

extension NSColor {
    convenience init?(hexRGBA hex: String) {
        var value = hex.trimmingCharacters(in: .whitespaces)
        if value.hasPrefix("#") { value.removeFirst() }
        guard value.count == 6 || value.count == 8,
              let number = UInt64(value, radix: 16) else { return nil }
        let hasAlpha = value.count == 8
        let r, g, b, a: CGFloat
        if hasAlpha {
            r = CGFloat((number >> 24) & 0xFF) / 255
            g = CGFloat((number >> 16) & 0xFF) / 255
            b = CGFloat((number >> 8) & 0xFF) / 255
            a = CGFloat(number & 0xFF) / 255
        } else {
            r = CGFloat((number >> 16) & 0xFF) / 255
            g = CGFloat((number >> 8) & 0xFF) / 255
            b = CGFloat(number & 0xFF) / 255
            a = 1
        }
        self.init(srgbRed: r, green: g, blue: b, alpha: a)
    }

    var hexRGBA: String {
        let c = usingColorSpace(.sRGB) ?? self
        return String(format: "#%02X%02X%02X%02X",
                      Int(round(c.redComponent * 255)),
                      Int(round(c.greenComponent * 255)),
                      Int(round(c.blueComponent * 255)),
                      Int(round(c.alphaComponent * 255)))
    }
}

extension Color {
    init(hexRGBA hex: String, fallback: Color = .yellow) {
        if let ns = NSColor(hexRGBA: hex) {
            self = Color(nsColor: ns)
        } else {
            self = fallback
        }
    }

    var hexRGBA: String { NSColor(self).hexRGBA }
}
