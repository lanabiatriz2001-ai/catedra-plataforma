import SwiftUI
import UIKit

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
extension NSAttributedString.Key {
    /// Quantidade de julgados ligados ao artigo cujo cabeçalho carrega este atributo. O
    /// número é DESENHADO na margem esquerda — nunca inserido no texto, que é a base dos grifos.
    static let catedraContagem = NSAttributedString.Key("catedraContagem")
}

final class RoundedBackgroundLayoutManager: NSLayoutManager {
    override func drawGlyphs(forGlyphRange glyphsToShow: NSRange, at origin: CGPoint) {
        super.drawGlyphs(forGlyphRange: glyphsToShow, at: origin)
        guard let storage = textStorage else { return }
        let chars = characterRange(forGlyphRange: glyphsToShow, actualGlyphRange: nil)
        storage.enumerateAttribute(.catedraContagem, in: chars) { valor, faixa, _ in
            guard let n = valor as? Int, n > 0 else { return }
            let linha = lineFragmentRect(forGlyphAt: glyphIndexForCharacter(at: faixa.location), effectiveRange: nil)
            let fonte = UIFont(name: "JetBrains Mono", size: 11) ?? .monospacedDigitSystemFont(ofSize: 11, weight: .medium)
            let cor = UIColor(DS.corSinalMargem)
            let rotulo = NSAttributedString(string: "\(n)", attributes: [.font: fonte, .foregroundColor: cor])
            let tam = rotulo.size()
            rotulo.draw(at: CGPoint(x: max(4, origin.x - tam.width - 14),
                                   y: origin.y + linha.minY + (linha.height - tam.height) / 2))
        }
    }

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
            let path = UIBezierPath(roundedRect: rect, cornerRadius: r)
            // Uma única path (winding non-zero), com "remendos" quadrados
            // encaixando de volta as bordas que continuam — um só fill evita
            // pintar a mesma cor semitransparente 2x na mesma área (o que
            // escureceria o canto "achatado").
            if i > 0 {
                path.append(UIBezierPath(rect: NSRect(x: rect.minX, y: rect.minY, width: rect.width, height: r)))
            }
            if i < rectCount - 1 {
                path.append(UIBezierPath(rect: NSRect(x: rect.minX, y: rect.maxY - r, width: rect.width, height: r)))
            }
            if i == 0 && hasBefore {
                path.append(UIBezierPath(rect: NSRect(x: rect.minX, y: rect.minY, width: r, height: rect.height)))
            }
            if i == rectCount - 1 && hasAfter {
                path.append(UIBezierPath(rect: NSRect(x: rect.maxX - r, y: rect.minY, width: r, height: rect.height)))
            }
            path.fill()
        }
    }
}
