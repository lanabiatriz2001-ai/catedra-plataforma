import SwiftUI
import UIKit

extension NSFont {
    /// Fonte de leitura — respeita a família escolhida em Ajustes (senão, sistema).
    static func serif(_ size: CGFloat, weight: NSFont.Weight = .regular) -> NSFont {
        if let fam = UserDefaults.standard.string(forKey: "readingFontFamily"), !fam.isEmpty {
            // UIFont.familyNames no lugar do NSFontManager; a família vira descriptor.
            let nsWeight = UIFont.familyNames.contains(fam)
                ? UIFont(descriptor: UIFontDescriptor(fontAttributes: [.family: fam]), size: size)
                : NSFont(name: fam, size: size)
            if let f = nsWeight { return f }
        }
        return NSFont.systemFont(ofSize: size, weight: weight)
    }
}

// MARK: - Editor de texto RICO (anotações) ----------------------------------

/// Traits de fonte no iPadOS: o macOS fazia isso pelo NSFontManager.
enum RichTextCompat {
    static func comTrait(_ f: NSFont, _ t: UIFontDescriptor.SymbolicTraits) -> NSFont {
        guard let d = f.fontDescriptor.withSymbolicTraits(f.fontDescriptor.symbolicTraits.union(t)) else { return f }
        return UIFont(descriptor: d, size: f.pointSize)
    }
}

/// Controla o UITextView do editor de anotações (formatação).
final class RichTextController {
    weak var textView: UITextView?

    private func hasTrait(_ f: NSFont, _ t: UIFontDescriptor.SymbolicTraits) -> Bool {
        f.fontDescriptor.symbolicTraits.contains(t)
    }

    /// Alterna negrito/itálico na seleção (ou nos atributos de digitação).
    /// No macOS havia DOIS jeitos de nomear o trait (NSFontTraitMask e o simbólico); no
    /// iPadOS só existe o simbólico, então o parâmetro `mask` deixou de fazer sentido.
    private func alterna(_ f: NSFont, _ t: UIFontDescriptor.SymbolicTraits) -> NSFont {
        var tr = f.fontDescriptor.symbolicTraits
        if tr.contains(t) { tr.remove(t) } else { tr.insert(t) }
        guard let d = f.fontDescriptor.withSymbolicTraits(tr) else { return f }
        return UIFont(descriptor: d, size: f.pointSize)
    }
    func toggleTrait(symbolic: UIFontDescriptor.SymbolicTraits) {
        guard let tv = textView else { return }
        let sel = tv.selectedRange
        if sel.length == 0 {
            let cur = (tv.typingAttributes[.font] as? NSFont) ?? tv.font ?? .systemFont(ofSize: 14)
            tv.typingAttributes[.font] = alterna(cur, symbolic)
            return
        }
        let ts = tv.textStorage          // não-opcional no iPadOS
        let base = (ts.attribute(.font, at: sel.location, effectiveRange: nil) as? NSFont) ?? .systemFont(ofSize: 14)
        let ativar = !hasTrait(base, symbolic)
        ts.beginEditing()
        ts.enumerateAttribute(.font, in: sel) { v, r, _ in
            let f = (v as? NSFont) ?? .systemFont(ofSize: 14)
            let nf = alterna(f, symbolic)
            ts.addAttribute(.font, value: nf, range: r)
        }
        ts.endEditing()
        tv.delegate?.textViewDidChange?(tv)   // no macOS era didChangeText()
    }

    /// Alterna um atributo inteiro (sublinhado/tachado) na seleção.
    func toggleLineAttr(_ key: NSAttributedString.Key) {
        guard let tv = textView else { return }
        let ts = tv.textStorage
        let sel = tv.selectedRange
        if sel.length == 0 {
            let atual = (tv.typingAttributes[key] as? Int) ?? 0
            tv.typingAttributes[key] = atual == 0 ? NSUnderlineStyle.single.rawValue : 0
            return
        }
        let atual = (ts.attribute(key, at: sel.location, effectiveRange: nil) as? Int) ?? 0
        let novo = atual == 0 ? NSUnderlineStyle.single.rawValue : 0
        ts.addAttribute(key, value: novo, range: sel)
        tv.delegate?.textViewDidChange?(tv)   // no macOS era didChangeText()
    }

    /// Aplica uma família de fonte (preservando tamanho e negrito/itálico). nil = sistema.
    func setFontFamily(_ family: String?) {
        guard let tv = textView else { return }
        // Sem NSFontManager: os traits da fonte antiga são somados ao descriptor da nova.
        func nova(_ f: NSFont) -> NSFont {
            let size = f.pointSize
            var base = family.flatMap { NSFont(name: $0, size: size) } ?? .systemFont(ofSize: size)
            let st = f.fontDescriptor.symbolicTraits
            if st.contains(.traitBold)   { base = RichTextCompat.comTrait(base, .traitBold) }
            if st.contains(.traitItalic) { base = RichTextCompat.comTrait(base, .traitItalic) }
            return base
        }
        aplicarFonte(tv, nova)
    }

    /// Ajusta o tamanho da fonte (delta) na seleção.
    func mudarTamanho(_ delta: CGFloat) {
        guard let tv = textView else { return }
        aplicarFonte(tv) { f in
            f.withSize(max(9, min(48, f.pointSize + delta)))
        }
    }

    private func aplicarFonte(_ tv: UITextView, _ transform: (NSFont) -> NSFont) {
        let sel = tv.selectedRange
        if sel.length == 0 {
            let cur = (tv.typingAttributes[.font] as? NSFont) ?? tv.font ?? .systemFont(ofSize: 14)
            tv.typingAttributes[.font] = transform(cur); return
        }
        let ts = tv.textStorage          // não-opcional no iPadOS
        ts.beginEditing()
        ts.enumerateAttribute(.font, in: sel) { v, r, _ in
            let f = (v as? NSFont) ?? .systemFont(ofSize: 14)
            ts.addAttribute(.font, value: transform(f), range: r)
        }
        ts.endEditing(); tv.delegate?.textViewDidChange?(tv)   // no macOS era didChangeText()
    }

    func desfazer() { textView?.undoManager?.undo() }
    func refazer() { textView?.undoManager?.redo() }

    /// Remove toda a formatação (fonte base, cor padrão, sem realce/sublinhado/tachado).
    func limparFormatacao(baseFont: NSFont, cor: NSColor) {
        guard let tv = textView else { return }
        let ts = tv.textStorage
        var range = tv.selectedRange
        if range.length == 0 { range = NSRange(location: 0, length: ts.length) }
        guard range.length > 0 else { return }
        ts.beginEditing()
        ts.addAttribute(.font, value: baseFont, range: range)
        ts.addAttribute(.foregroundColor, value: cor, range: range)
        ts.removeAttribute(.underlineStyle, range: range)
        ts.removeAttribute(.strikethroughStyle, range: range)
        ts.removeAttribute(.backgroundColor, range: range)
        ts.endEditing(); tv.delegate?.textViewDidChange?(tv)   // no macOS era didChangeText()
    }

    /// Insere texto/símbolo no ponto de inserção.
    func inserir(_ s: String) {
        guard let tv = textView else { return }
        let sel = tv.selectedRange
        tv.textStorage.replaceCharacters(in: sel, with: s)
        tv.selectedRange = NSRange(location: sel.location + (s as NSString).length, length: 0)
        tv.delegate?.textViewDidChange?(tv)
    }

    func setForeground(_ color: NSColor) {
        guard let tv = textView else { return }
        let sel = tv.selectedRange
        if sel.length == 0 { tv.typingAttributes[.foregroundColor] = color; return }
        tv.textStorage.addAttribute(.foregroundColor, value: color, range: sel)
        tv.delegate?.textViewDidChange?(tv)   // no macOS era didChangeText()
    }

    func setHighlight(_ color: NSColor?) {
        guard let tv = textView else { return }
        let ts = tv.textStorage
        let sel = tv.selectedRange
        guard sel.length > 0 else { return }
        if let c = color { ts.addAttribute(.backgroundColor, value: c, range: sel) }
        else { ts.removeAttribute(.backgroundColor, range: sel) }
        tv.delegate?.textViewDidChange?(tv)   // no macOS era didChangeText()
    }

    /// Alinha o(s) parágrafo(s) da seleção (ou todo o texto se nada selecionado).
    func setAlignment(_ alignment: NSTextAlignment) {
        guard let tv = textView else { return }
        let ts = tv.textStorage
        let ns = ts.string as NSString
        let sel = tv.selectedRange
        let alvo = sel.length > 0 ? ns.paragraphRange(for: sel) : NSRange(location: 0, length: ts.length)
        guard alvo.length > 0 else {
            // UITextView não tem defaultParagraphStyle: parte-se do estilo padrão.
            let p = NSMutableParagraphStyle()
            p.alignment = alignment; tv.typingAttributes[.paragraphStyle] = p; return
        }
        let base = (ts.attribute(.paragraphStyle, at: alvo.location, effectiveRange: nil) as? NSParagraphStyle)
        let p = (base?.mutableCopy() as? NSMutableParagraphStyle) ?? NSMutableParagraphStyle()
        p.alignment = alignment
        ts.addAttribute(.paragraphStyle, value: p, range: alvo)
        tv.delegate?.textViewDidChange?(tv)   // no macOS era didChangeText()
    }

    /// Adiciona marcador "•" no início das linhas da seleção.
    func toggleBullet() {
        guard let tv = textView else { return }
        let ts = tv.textStorage
        let ns = ts.string as NSString
        let lineRange = ns.lineRange(for: tv.selectedRange)
        let bloco = ns.substring(with: lineRange)
        let linhas = bloco.components(separatedBy: "\n")
        let temBullet = linhas.first(where: { !$0.isEmpty })?.hasPrefix("•\t") ?? false
        let novas = linhas.map { l -> String in
            if l.isEmpty { return l }
            if temBullet { return l.hasPrefix("•\t") ? String(l.dropFirst(2)) : l }
            return "•\t" + l
        }
        ts.replaceCharacters(in: lineRange, with: novas.joined(separator: "\n"))
        tv.delegate?.textViewDidChange?(tv)   // no macOS era didChangeText()
    }
}

/// Editor de anotações em texto rico (RTF), com auto-persistência.
struct RichTextEditor: UIViewRepresentable {
    let initialData: Data?
    let controller: RichTextController
    var baseFont: NSFont
    var textColor: NSColor
    var onChange: (Data?, Bool) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onChange: onChange) }

    // A UITextView do iPadOS já rola sozinha — não há NSScrollView em volta.
    func makeUIView(context: Context) -> UITextView {
        let tv = UITextView()
        // isRichText/allowsUndo/drawsBackground são do NSTextView.
        tv.allowsEditingTextAttributes = true
        tv.isEditable = true
        tv.isSelectable = true
        tv.backgroundColor = .clear
        tv.delegate = context.coordinator
        tv.font = baseFont
        tv.textColor = textColor
        tv.textContainerInset = UIEdgeInsets(top: 7, left: 5, bottom: 7, right: 5)
        tv.typingAttributes = [.font: baseFont, .foregroundColor: textColor]
        if let d = initialData,
           let a = try? NSAttributedString(data: d,
                        options: [.documentType: NSAttributedString.DocumentType.rtf],
                        documentAttributes: nil) {
            tv.textStorage.setAttributedString(a)
        }
        controller.textView = tv
        return tv
    }

    func updateUIView(_ nsView: UITextView, context: Context) {
        context.coordinator.onChange = onChange   // mantém closure atual
    }

    final class Coordinator: NSObject, UITextViewDelegate {
        var onChange: (Data?, Bool) -> Void
        init(onChange: @escaping (Data?, Bool) -> Void) { self.onChange = onChange }
        func textDidChange(_ notification: Notification) {
            guard let tv = notification.object as? UITextView else { return }
        let ts = tv.textStorage
            let vazio = ts.string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            if vazio { onChange(nil, true); return }
            let rtf = try? ts.data(from: NSRange(location: 0, length: ts.length),
                              documentAttributes: [.documentType: NSAttributedString.DocumentType.rtf])
            onChange(rtf, false)
        }
    }
}

// MARK: - Texto MARCÁVEL (enunciado: grifar/sublinhar/tachar) ----------------

/// Expõe a seleção atual do UITextView do enunciado.
final class MarkController {
    weak var textView: UITextView?
    var selecao: NSRange { textView?.selectedRange ?? NSRange(location: 0, length: 0) }
}

/// Âncora de um comentário em balão na margem — espelha o `ArticleCommentAnchor` do LEGIS.
struct MarkCommentAnchor: Identifiable, Equatable {
    let id: String        // TextMark.id
    var y: CGFloat
    let note: String
    let colorHex: String
}

/// Texto somente-leitura selecionável que renderiza marcações + realce de busca,
/// com auto-altura para caber no card.
struct MarkableText: UIViewRepresentable {
    let text: String
    let marks: [TextMark]
    let query: String
    var baseFont: NSFont
    var inkColor: NSColor
    let controller: MarkController
    @Binding var height: CGFloat
    var alignment: NSTextAlignment = .natural
    var editable: Bool = false
    var onCommit: (String) -> Void = { _ in }
    /// Posições (y) dos comentários em balão deste trecho, para desenhar na margem — espelha o LEGIS.
    @Binding var commentAnchors: [MarkCommentAnchor]

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, UITextViewDelegate {
        var parent: MarkableText
        var editando = false
        init(_ p: MarkableText) { parent = p }
        func textDidEndEditing(_ note: Notification) {
            editando = false
            if let tv = note.object as? UITextView { parent.onCommit(tv.text) }
        }
        func textDidBeginEditing(_ note: Notification) { editando = true }
    }

    func makeUIView(context: Context) -> UITextView {
        let tv = UITextView()
        tv.isSelectable = true
        // drawsBackground/isVerticallyResizable/maxSize/allowsUndo eram do par
        // NSTextView+NSScrollView. Aqui a UITextView se dimensiona sozinha, e a altura
        // é medida no updateUIView (abaixo) e devolvida ao SwiftUI.
        tv.backgroundColor = .clear
        tv.textContainerInset = .zero
        tv.isScrollEnabled = false          // quem rola é a página do JURIS
        tv.textContainer.widthTracksTextView = true
        tv.textContainer.lineFragmentPadding = 0
        tv.delegate = context.coordinator
        tv.isEditable = editable
        controller.textView = tv
        tv.textStorage.setAttributedString(build())
        return tv
    }

    func updateUIView(_ tv: UITextView, context: Context) {
        context.coordinator.parent = self
        tv.isEditable = editable
        // Enquanto o usuário digita, não reescrevemos o storage (perderia o cursor).
        if !(editable && context.coordinator.editando) {
            tv.textStorage.setAttributedString(build())
        }
        DispatchQueue.main.async {
            let lm = tv.layoutManager, tc = tv.textContainer   // não-opcionais no iPadOS
            lm.ensureLayout(for: tc)
            let h = lm.usedRect(for: tc).height + 2
            if abs(h - self.height) > 0.5 { self.height = h }
            updateCommentAnchors(lm: lm, container: tc)
        }
    }

    /// Calcula o y de cada comentário no layout real (mesma técnica do LEGIS:
    /// glyphRange → boundingRect), para posicionar o balão na margem.
    private func updateCommentAnchors(lm: NSLayoutManager, container: NSTextContainer) {
        let len = (text as NSString).length
        var out: [MarkCommentAnchor] = []
        for m in marks {
            guard let note = m.note?.trimmingCharacters(in: .whitespacesAndNewlines), !note.isEmpty else { continue }
            guard m.start >= 0, m.start + m.length <= len, m.length > 0 else { continue }
            let glyphRange = lm.glyphRange(forCharacterRange: NSRange(location: m.start, length: m.length),
                                           actualCharacterRange: nil)
            let rect = lm.boundingRect(forGlyphRange: glyphRange, in: container)
            out.append(MarkCommentAnchor(id: m.id, y: rect.minY, note: note, colorHex: m.colorHex ?? "#8FBEF0"))
        }
        out.sort { $0.y < $1.y }
        if out != commentAnchors {
            commentAnchors = out
        }
    }

    /// Detecta o marcador de lista no início de uma linha (inciso romano, item
    /// numerado, alínea, parágrafo) e devolve o comprimento do marcador — para
    /// aplicar recuo pendente e destacá-lo em negrito.
    private static func marcadorLista(_ linha: String) -> Int? {
        let s = linha.trimmingCharacters(in: .whitespaces)
        guard !s.isEmpty else { return nil }
        let padroes = [
            "^([IVXLCDM]{1,6})\\s*[.)\\-–]",           // incisos romanos  I.  II)
            "^(\\d{1,2}(?:\\.\\d{1,2})?)\\s*[.)\\-–]",  // itens numerados  1.  1.1)
            "^([a-z])\\s*[.)]",                          // alíneas  a)  b)
            "^(§\\s*\\d+[º°]?|Parágrafo único)",         // parágrafos  § 1º
            "^(Súmula|Tese|Enunciado)\\s+\\d+"           // rótulos
        ]
        let recuoEsq = linha.prefix(while: { $0 == " " || $0 == "\t" }).count
        for p in padroes {
            if let re = try? NSRegularExpression(pattern: p, options: [.caseInsensitive]) {
                let range = NSRange(s.startIndex..., in: s)
                if let m = re.firstMatch(in: s, range: range), m.range.location == 0 {
                    return recuoEsq + m.range.length
                }
            }
        }
        return nil
    }

    /// Cabeçalho de seção (ementa estruturada): linha curta toda em MAIÚSCULAS,
    /// possivelmente com inciso romano à frente. Ex.: "I. CASO EM EXAME".
    private static func ehSecao(_ linha: String) -> Bool {
        let s = linha.trimmingCharacters(in: .whitespaces)
        guard s.count >= 3, s.count <= 72 else { return false }
        let letras = s.filter { $0.isLetter }
        guard letras.count >= 3 else { return false }
        return letras == letras.uppercased() && letras != letras.lowercased()
    }

    /// Rótulo estruturante (não em maiúsculas), destacado até os dois-pontos.
    /// Ex.: "Tese de julgamento:", "Dispositivos relevantes citados:".
    private static let rotulos = [
        "Tese de julgamento", "Teses de julgamento", "Tese fixada", "Tese firmada",
        "Dispositivos relevantes citados", "Dispositivo relevante citado",
        "Jurisprudência relevante citada", "Legislação relevante citada",
        "Precedentes citados", "Precedente citado"
    ]
    private static func rotulo(_ linha: String) -> Int? {
        let s = linha.trimmingCharacters(in: .whitespaces)
        for r in rotulos where s.hasPrefix(r) {
            // comprimento até os dois-pontos (inclusive), relativo à linha original
            let recuo = linha.prefix(while: { $0 == " " || $0 == "\t" }).count
            if let c = linha.firstIndex(of: ":") {
                return linha.distance(from: linha.startIndex, to: c) + 1
            }
            return recuo + r.count
        }
        return nil
    }

    private func build() -> NSAttributedString {
        let a = NSMutableAttributedString(string: text, attributes: [
            .font: baseFont, .foregroundColor: inkColor
        ])
        let full = NSRange(location: 0, length: (text as NSString).length)
        let ns = text as NSString

        // Estilo por linha: espaçamento entre linhas + entre parágrafos, e recuo
        // pendente quando a linha começa com marcador de lista (inciso, alínea…).
        let ls = baseFont.pointSize * 0.42
        let ps = baseFont.pointSize * 0.65
        let boldFont = RichTextCompat.comTrait(baseFont, .traitBold)
        let acento = NSColor(Palette.accent)
        ns.enumerateSubstrings(in: full, options: [.byLines, .substringNotRequired]) { _, lineRange, _, _ in
            let linha = ns.substring(with: lineRange)
            let para = NSMutableParagraphStyle()
            para.lineSpacing = ls
            para.paragraphSpacing = ps
            para.alignment = self.alignment
            if MarkableText.ehSecao(linha) {
                // cabeçalho de seção: negrito + acento + respiro acima
                para.paragraphSpacingBefore = ps * 1.3
                a.addAttribute(.paragraphStyle, value: para, range: lineRange)
                a.addAttribute(.font, value: boldFont, range: lineRange)
                a.addAttribute(.foregroundColor, value: acento, range: lineRange)
                a.addAttribute(.kern, value: 0.4, range: lineRange)
            } else if let rLen = MarkableText.rotulo(linha) {
                // rótulo estruturante: negrito até os dois-pontos
                para.paragraphSpacingBefore = ps * 0.6
                a.addAttribute(.paragraphStyle, value: para, range: lineRange)
                let rRange = NSRange(location: lineRange.location, length: min(rLen, lineRange.length))
                a.addAttribute(.font, value: boldFont, range: rRange)
                a.addAttribute(.foregroundColor, value: acento, range: rRange)
            } else if let mLen = MarkableText.marcadorLista(linha) {
                para.headIndent = self.baseFont.pointSize * 1.6
                a.addAttribute(.paragraphStyle, value: para, range: lineRange)
                let mRange = NSRange(location: lineRange.location, length: min(mLen, lineRange.length))
                a.addAttribute(.font, value: boldFont, range: mRange)
            } else {
                a.addAttribute(.paragraphStyle, value: para, range: lineRange)
            }
        }

        // Em modo edição mostramos texto limpo (sem grifos/busca) para digitar.
        if editable { return a }

        // marcações do usuário
        for m in marks {
            let r = m.range
            guard r.location >= 0, r.location + r.length <= full.length, r.length > 0 else { continue }
            switch m.kind {
            case .grifar:
                let c = NSColor(Color(hex: m.colorHex ?? MarkColor.amarelo.rawValue)).withAlphaComponent(0.55)
                a.addAttribute(.backgroundColor, value: c, range: r)
            case .sublinhar:
                a.addAttribute(.underlineStyle, value: NSUnderlineStyle.single.rawValue, range: r)
                a.addAttribute(.underlineColor, value: NSColor(Palette.accent), range: r)
            case .tachar:
                a.addAttribute(.strikethroughStyle, value: NSUnderlineStyle.single.rawValue, range: r)
                a.addAttribute(.strikethroughColor, value: NSColor.systemRed, range: r)
            case .negrito:
                a.addAttribute(.font, value: boldFont, range: r)
            case .italico:
                let ital = RichTextCompat.comTrait(baseFont, .traitItalic)
                a.addAttribute(.font, value: ital, range: r)
            case .corTexto:
                a.addAttribute(.foregroundColor, value: NSColor(Color(hex: m.colorHex ?? "#4F46E5")), range: r)
            case .cloze:
                // lacuna de flashcard: fundo suave + borda tracejada + negrito
                a.addAttribute(.backgroundColor, value: NSColor(Palette.accent).withAlphaComponent(0.14), range: r)
                a.addAttribute(.underlineStyle, value: (NSUnderlineStyle.patternDash.rawValue | NSUnderlineStyle.single.rawValue), range: r)
                a.addAttribute(.underlineColor, value: NSColor(Palette.accent), range: r)
                a.addAttribute(.font, value: boldFont, range: r)
                a.addAttribute(.foregroundColor, value: NSColor(Palette.accent), range: r)
            }
        }

        // realce dos termos de busca (bg dourado + negrito)
        let termos = query.trimmingCharacters(in: .whitespacesAndNewlines)
            .split(separator: " ").map(String.init).filter { $0.count >= 2 }
        let hi = NSColor(Palette.highlight)
        for termo in termos {
            var searchRange = NSRange(location: 0, length: ns.length)
            while true {
                let r = ns.range(of: termo, options: [.caseInsensitive, .diacriticInsensitive], range: searchRange)
                if r.location == NSNotFound { break }
                a.addAttribute(.backgroundColor, value: hi, range: r)
                let loc = r.location + r.length
                if loc >= ns.length { break }
                searchRange = NSRange(location: loc, length: ns.length - loc)
            }
        }
        return a
    }
}
