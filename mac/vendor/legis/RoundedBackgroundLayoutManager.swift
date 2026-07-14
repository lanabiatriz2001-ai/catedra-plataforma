import AppKit

/// NSLayoutManager que desenha fundos de texto (grifos do marca-texto e o
/// tingimento "chip" dos incisos) com cantos arredondados só na moldura
/// EXTERNA do trecho marcado — mantém retas as emendas internas (quebra de
/// linha, ou o encontro com um trecho de OUTRA cor colado, ex.: um grifo do
/// usuário no meio de um chip de inciso), para o bloco marcado parecer
/// contínuo em vez de uma sequência de "pílulas" com entalhes nas juntas.
///
/// Pressupõe view "flipped" (padrão do NSTextView, nunca sobrescrito por
/// ReaderTextView): a 1ª linha de um trecho que quebra em várias fica em
/// rectArray[0], com o menor Y.
final class RoundedBackgroundLayoutManager: NSLayoutManager {
    override func fillBackgroundRectArray(_ rectArray: UnsafePointer<CGRect>, count rectCount: Int,
                                           forCharacterRange charRange: NSRange, color: NSColor) {
        color.setFill()
        let radius: CGFloat = 4
        let storage = textStorage
        let hasBefore = charRange.location > 0 &&
            storage?.attribute(.backgroundColor, at: charRange.location - 1, effectiveRange: nil) != nil
        let end = NSMaxRange(charRange)
        let hasAfter = (storage.map { end < $0.length } ?? false) &&
            storage?.attribute(.backgroundColor, at: end, effectiveRange: nil) != nil

        for i in 0..<rectCount {
            let rect = rectArray[i].insetBy(dx: 0, dy: 1)
            guard rect.width > 0, rect.height > 0 else { continue }
            let r = min(radius, min(rect.width, rect.height))
            let path = NSBezierPath(roundedRect: rect, xRadius: r, yRadius: r)
            // Uma única path (winding non-zero), com "remendos" quadrados
            // encaixando de volta as bordas que continuam — um só fill evita
            // pintar a mesma cor semitransparente 2x na mesma área (o que
            // escureceria o canto "achatado").
            if i > 0 {
                path.append(NSBezierPath(rect: NSRect(x: rect.minX, y: rect.minY, width: rect.width, height: r)))
            }
            if i < rectCount - 1 {
                path.append(NSBezierPath(rect: NSRect(x: rect.minX, y: rect.maxY - r, width: rect.width, height: r)))
            }
            if i == 0 && hasBefore {
                path.append(NSBezierPath(rect: NSRect(x: rect.minX, y: rect.minY, width: r, height: rect.height)))
            }
            if i == rectCount - 1 && hasAfter {
                path.append(NSBezierPath(rect: NSRect(x: rect.maxX - r, y: rect.minY, width: r, height: rect.height)))
            }
            path.fill()
        }
    }
}
