import SwiftUI
import AppKit

/// Editor de anotação RICO (RTF): negrito, itálico, sublinhado, tachado, cor do texto,
/// marca-texto (fundo), listas — num NSTextView, com barra de formatação. Guarda RTF.
struct RichNoteEditor: View {
    let initialRTF: Data?                    // conteúdo carregado na criação (use .id p/ recriar)
    let placeholder: String
    let onChange: (Data, String) -> Void   // (RTF, texto puro) a cada edição
    var minHeight: CGFloat = 150

    @StateObject private var coord = RichTextCoordinator()

    // Paleta de cores para texto e marca-texto (combina com o clean do app).
    private let palette: [(String, NSColor)] = [
        ("Amarelo", NSColor(srgbRed: 1.0, green: 0.86, blue: 0.30, alpha: 1)),
        ("Verde",   NSColor(srgbRed: 0.55, green: 0.86, blue: 0.55, alpha: 1)),
        ("Azul",    NSColor(srgbRed: 0.60, green: 0.78, blue: 1.0, alpha: 1)),
        ("Rosa",    NSColor(srgbRed: 1.0, green: 0.68, blue: 0.80, alpha: 1)),
        ("Laranja", NSColor(srgbRed: 1.0, green: 0.75, blue: 0.45, alpha: 1)),
    ]
    private let inkPalette: [(String, NSColor)] = [
        ("Padrão", NSColor.labelColor),
        ("Vermelho", NSColor.systemRed),
        ("Azul", NSColor.systemBlue),
        ("Verde", NSColor.systemGreen),
        ("Roxo", NSColor.systemPurple),
    ]

    var body: some View {
        VStack(spacing: 0) {
            toolbar
            Rectangle().fill(AppTheme.hairline).frame(height: 1)
            RichTextView(initialRTF: initialRTF, coord: coord, onChange: onChange, placeholder: placeholder)
                .frame(minHeight: minHeight)
        }
        .background(RoundedRectangle(cornerRadius: AppTheme.compactRadius, style: .continuous).fill(AppTheme.cardBackground))
        .overlay(RoundedRectangle(cornerRadius: AppTheme.compactRadius, style: .continuous).strokeBorder(AppTheme.hairline, lineWidth: 1))
    }

    // Marcadores coloridos estilo callout (Notion): atenção/importante/dica/revisar.
    private let tags: [(String, String, NSColor)] = [
        ("❓", "Atenção", NSColor(srgbRed: 1.0, green: 0.60, blue: 0.42, alpha: 0.30)),
        ("❗", "Importante", NSColor(srgbRed: 1.0, green: 0.40, blue: 0.40, alpha: 0.30)),
        ("💡", "Dica", NSColor(srgbRed: 1.0, green: 0.86, blue: 0.35, alpha: 0.32)),
        ("🚩", "Revisar", NSColor(srgbRed: 0.55, green: 0.80, blue: 0.95, alpha: 0.32)),
    ]

    private var toolbar: some View {
        VStack(spacing: 4) {
            HStack(spacing: 3) {
                fmt("arrow.uturn.backward", "Desfazer (⌘Z)") { coord.undo() }.disabled(!coord.canUndo)
                fmt("arrow.uturn.forward", "Refazer (⌘⇧Z)") { coord.redo() }.disabled(!coord.canRedo)
                sep
                headingBtn("H1", 1); headingBtn("H2", 2); headingBtn("H3", 3)
                fmt("text.justify", "Texto normal") { coord.setHeading(0) }
                sep
                fmt("bold", "Negrito (⌘B)") { coord.toggleTrait(.boldFontMask) }
                fmt("italic", "Itálico (⌘I)") { coord.toggleTrait(.italicFontMask) }
                fmt("underline", "Sublinhado (⌘U)") { coord.toggleUnderline() }
                fmt("strikethrough", "Tachado") { coord.toggleStrikethrough() }
                sep
                Menu {
                    ForEach(inkPalette, id: \.0) { name, color in
                        Button { coord.setTextColor(color) } label: { Label(name, systemImage: "circle.fill").foregroundStyle(Color(nsColor: color)) }
                    }
                } label: { Image(systemName: "textformat") }
                    .menuStyle(.borderlessButton).menuIndicator(.hidden).fixedSize()
                    .help("Cor do texto selecionado")
                Menu {
                    ForEach(palette, id: \.0) { name, color in
                        Button { coord.setHighlight(color) } label: { Label(name, systemImage: "circle.fill").foregroundStyle(Color(nsColor: color)) }
                    }
                    Divider()
                    Button("Remover marca-texto") { coord.setHighlight(nil) }
                } label: { Image(systemName: "highlighter") }
                    .menuStyle(.borderlessButton).menuIndicator(.hidden).fixedSize()
                    .help("Marca-texto no trecho selecionado")
                Spacer(minLength: 0)
            }
            HStack(spacing: 3) {
                fmt("list.bullet", "Lista com marcadores") { coord.toggleList(ordered: false) }
                fmt("list.number", "Lista numerada") { coord.toggleList(ordered: true) }
                fmt("text.quote", "Citação") { coord.toggleQuote() }
                fmt("curlybraces", "Código") { coord.toggleCode() }
                fmt("minus", "Linha divisória") { coord.insertDivider() }
                sep
                fmt("text.alignleft", "Alinhar à esquerda") { coord.setAlignment(.left) }
                fmt("text.aligncenter", "Centralizar") { coord.setAlignment(.center) }
                fmt("text.alignright", "Alinhar à direita") { coord.setAlignment(.right) }
                fmt("text.justify", "Justificar") { coord.setAlignment(.justified) }
                sep
                ForEach(tags, id: \.1) { emoji, name, color in
                    Button { coord.insertTag(emoji: emoji, color: color) } label: {
                        Text(emoji).font(.system(size: 12))
                            .frame(width: 22, height: 20)
                            .background(RoundedRectangle(cornerRadius: 5).fill(Color(nsColor: color)))
                    }
                    .buttonStyle(.plain)
                    .help(name)
                }
                Spacer(minLength: 0)
                fmt("eraser", "Limpar formatação") { coord.clearFormatting() }
            }
        }
        .buttonStyle(.plain)
        .font(.system(size: 13))
        .foregroundStyle(AppTheme.secondaryInk)
        .padding(.horizontal, 8).padding(.vertical, 6)
    }

    private func headingBtn(_ label: String, _ level: Int) -> some View {
        Button { coord.setHeading(level) } label: {
            Text(label).font(.system(size: 11, weight: .bold)).frame(width: 22, height: 20)
        }
        .help("Título \(label)")
    }

    private var sep: some View {
        Rectangle().fill(AppTheme.hairline).frame(width: 1, height: 15).padding(.horizontal, 3)
    }

    private func fmt(_ icon: String, _ help: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon).frame(width: 24, height: 22)
                .contentShape(Rectangle())
        }
        .help(help)
    }
}

/// NSTextView RTF embrulhado; a barra de formatação age via `coord`.
private struct RichTextView: NSViewRepresentable {
    let initialRTF: Data?
    let coord: RichTextCoordinator
    let onChange: (Data, String) -> Void
    let placeholder: String

    func makeNSView(context: Context) -> NSScrollView {
        let scroll = NSTextView.scrollableTextView()
        scroll.drawsBackground = false
        scroll.hasVerticalScroller = true
        guard let tv = scroll.documentView as? NSTextView else { return scroll }
        tv.isRichText = true
        tv.allowsUndo = true
        tv.drawsBackground = false
        tv.font = .systemFont(ofSize: 13.5)
        tv.textColor = .labelColor
        tv.textContainerInset = NSSize(width: 7, height: 9)
        tv.delegate = coord
        coord.textView = tv
        coord.onChange = onChange
        coord.placeholder = placeholder
        if let initialRTF, let s = NSAttributedString(rtf: initialRTF, documentAttributes: nil), s.length > 0 {
            tv.textStorage?.setAttributedString(s)
        }
        coord.refreshPlaceholder()
        return scroll
    }

    func updateNSView(_ nsView: NSScrollView, context: Context) {
        // A verdade fica na NSTextView durante a edição; não sobrescrever aqui.
    }
}

/// Coordena o NSTextView: aplica formatação no trecho selecionado e emite RTF+texto.
final class RichTextCoordinator: NSObject, ObservableObject, NSTextViewDelegate {
    weak var textView: NSTextView?
    var onChange: ((Data, String) -> Void)?
    var placeholder: String = ""
    private var placeholderView: NSTextField?
    @Published var canUndo = false
    @Published var canRedo = false

    func textDidChange(_ notification: Notification) { emit(); refreshPlaceholder(); refreshUndoState() }

    // Desfazer/refazer usa o undoManager nativo do NSTextView — cobre a digitação;
    // as ações da barra (negrito, listas…) mutam o textStorage direto e não entram
    // na pilha (limitação aceitável: o essencial de digitar/apagar texto é coberto).
    func undo() { textView?.undoManager?.undo(); refreshUndoState() }
    func redo() { textView?.undoManager?.redo(); refreshUndoState() }
    func refreshUndoState() {
        canUndo = textView?.undoManager?.canUndo ?? false
        canRedo = textView?.undoManager?.canRedo ?? false
    }

    private func emit() {
        guard let tv = textView, let ts = tv.textStorage else { return }
        let full = NSRange(location: 0, length: ts.length)
        let rtf = ts.rtf(from: full, documentAttributes: [:]) ?? Data()
        onChange?(rtf, ts.string)
    }

    // Placeholder simples sobreposto quando vazio.
    func refreshPlaceholder() {
        guard let tv = textView else { return }
        let empty = (tv.textStorage?.length ?? 0) == 0
        if empty, placeholderView == nil {
            let lbl = NSTextField(labelWithString: placeholder)
            lbl.font = .systemFont(ofSize: 13.5)
            lbl.textColor = .tertiaryLabelColor
            lbl.isEditable = false; lbl.isSelectable = false; lbl.drawsBackground = false; lbl.isBordered = false
            lbl.lineBreakMode = .byWordWrapping
            lbl.translatesAutoresizingMaskIntoConstraints = false
            tv.addSubview(lbl)
            NSLayoutConstraint.activate([
                lbl.leadingAnchor.constraint(equalTo: tv.leadingAnchor, constant: 11),
                lbl.topAnchor.constraint(equalTo: tv.topAnchor, constant: 9),
                lbl.trailingAnchor.constraint(lessThanOrEqualTo: tv.trailingAnchor, constant: -11),
            ])
            placeholderView = lbl
        } else if !empty {
            placeholderView?.removeFromSuperview(); placeholderView = nil
        }
    }

    private func edit(_ apply: (NSTextView, NSRange, NSMutableAttributedString) -> Void) {
        guard let tv = textView, let ts = tv.textStorage else { return }
        let r = tv.selectedRange()
        guard r.length > 0 else { NSSound.beep(); return }
        tv.shouldChangeText(in: r, replacementString: nil)
        ts.beginEditing()
        apply(tv, r, ts)
        ts.endEditing()
        tv.didChangeText()
    }

    // Como `edit`, mas age na(s) LINHA(S) inteira(s) do parágrafo — funciona mesmo
    // sem seleção (só o cursor na linha), para título/lista/citação/alinhamento.
    private func editLines(_ apply: (NSTextView, NSRange, NSMutableAttributedString) -> Void) {
        guard let tv = textView, let ts = tv.textStorage else { return }
        let sel = tv.selectedRange()
        let nsstr = ts.string as NSString
        let lineRange = nsstr.length > 0 ? nsstr.lineRange(for: sel) : NSRange(location: 0, length: 0)
        tv.shouldChangeText(in: lineRange, replacementString: nil)
        ts.beginEditing()
        apply(tv, lineRange, ts)
        ts.endEditing()
        tv.didChangeText()
    }

    func toggleTrait(_ trait: NSFontTraitMask) {
        edit { tv, r, ts in
            let fm = NSFontManager.shared
            ts.enumerateAttribute(.font, in: r) { val, sub, _ in
                let font = (val as? NSFont) ?? tv.font ?? .systemFont(ofSize: 13.5)
                let has = fm.traits(of: font).contains(trait)
                let newFont = has ? fm.convert(font, toNotHaveTrait: trait) : fm.convert(font, toHaveTrait: trait)
                ts.addAttribute(.font, value: newFont, range: sub)
            }
        }
    }
    func toggleUnderline() {
        edit { tv, r, ts in
            let cur = (ts.attribute(.underlineStyle, at: r.location, effectiveRange: nil) as? Int) ?? 0
            ts.addAttribute(.underlineStyle, value: cur == 0 ? NSUnderlineStyle.single.rawValue : 0, range: r)
        }
    }
    func toggleStrikethrough() {
        edit { tv, r, ts in
            let cur = (ts.attribute(.strikethroughStyle, at: r.location, effectiveRange: nil) as? Int) ?? 0
            ts.addAttribute(.strikethroughStyle, value: cur == 0 ? NSUnderlineStyle.single.rawValue : 0, range: r)
        }
    }
    func setTextColor(_ c: NSColor) { edit { _, r, ts in ts.addAttribute(.foregroundColor, value: c, range: r) } }
    func setHighlight(_ c: NSColor?) {
        edit { _, r, ts in
            if let c { ts.addAttribute(.backgroundColor, value: c, range: r) }
            else { ts.removeAttribute(.backgroundColor, range: r) }
        }
    }
    func clearFormatting() {
        edit { _, r, ts in
            ts.setAttributes([.font: NSFont.systemFont(ofSize: 13.5), .foregroundColor: NSColor.labelColor], range: r)
        }
    }
    // Alterna marcadores (• ou 1.) nas linhas do trecho selecionado (ou só a linha do cursor).
    func toggleList(ordered: Bool) {
        editLines { tv, lineRange, ts in
            guard lineRange.length > 0 else { return }
            let nsstr = ts.string as NSString
            let block = nsstr.substring(with: lineRange)
            let lines = block.components(separatedBy: "\n")
            func isMarked(_ line: String) -> Bool {
                ordered ? line.range(of: "^\\d+\\.\\t", options: .regularExpression) != nil
                        : (line.hasPrefix("•\t") || line.hasPrefix("• "))
            }
            let allMarked = lines.filter { !$0.isEmpty }.allSatisfy(isMarked)
            var n = 0
            let newLines = lines.map { line -> String in
                if line.isEmpty { return line }
                if allMarked {
                    if ordered, let r = line.range(of: "^\\d+\\.\\t", options: .regularExpression) { return String(line[r.upperBound...]) }
                    if !ordered, line.hasPrefix("•\t") { return String(line.dropFirst(2)) }
                    if !ordered, line.hasPrefix("• ") { return String(line.dropFirst(2)) }
                    return line
                } else {
                    n += 1
                    return (ordered ? "\(n).\t" : "•\t") + line
                }
            }
            let replacement = NSAttributedString(string: newLines.joined(separator: "\n"),
                                                 attributes: [.font: tv.font ?? NSFont.systemFont(ofSize: 13.5),
                                                              .foregroundColor: NSColor.labelColor])
            ts.replaceCharacters(in: lineRange, with: replacement)
        }
    }

    // Título H1/H2/H3 na(s) linha(s) do parágrafo — nível 0 volta ao corpo normal.
    func setHeading(_ level: Int) {
        editLines { _, lineRange, ts in
            guard lineRange.length > 0 else { return }
            let size: CGFloat = level == 1 ? 20 : level == 2 ? 17 : level == 3 ? 15 : 13.5
            let base = NSFont.systemFont(ofSize: size)
            let font = level > 0 ? NSFontManager.shared.convert(base, toHaveTrait: .boldFontMask) : base
            ts.addAttribute(.font, value: font, range: lineRange)
        }
    }

    // Alinhamento do(s) parágrafo(s).
    func setAlignment(_ a: NSTextAlignment) {
        editLines { _, lineRange, ts in
            guard lineRange.length > 0 else { return }
            let para = NSMutableParagraphStyle()
            para.alignment = a
            ts.addAttribute(.paragraphStyle, value: para, range: lineRange)
        }
    }

    // Citação: recuo + itálico + cor secundária (alterna se já estiver citada).
    func toggleQuote() {
        editLines { tv, lineRange, ts in
            guard lineRange.length > 0 else { return }
            let cur = ts.attribute(.paragraphStyle, at: lineRange.location, effectiveRange: nil) as? NSParagraphStyle
            let isQuoted = (cur?.headIndent ?? 0) > 0
            let para = NSMutableParagraphStyle()
            para.headIndent = isQuoted ? 0 : 14
            para.firstLineHeadIndent = isQuoted ? 0 : 14
            ts.addAttribute(.paragraphStyle, value: para, range: lineRange)
            let base = tv.font ?? .systemFont(ofSize: 13.5)
            let font = isQuoted ? base : NSFontManager.shared.convert(base, toHaveTrait: .italicFontMask)
            ts.addAttribute(.font, value: font, range: lineRange)
            ts.addAttribute(.foregroundColor, value: isQuoted ? NSColor.labelColor : NSColor.secondaryLabelColor, range: lineRange)
        }
    }

    // Código inline: fonte monoespaçada + fundo sutil no trecho selecionado.
    func toggleCode() {
        edit { tv, r, ts in
            let cur = ts.attribute(.font, at: r.location, effectiveRange: nil) as? NSFont
            let isMono = cur?.fontName.localizedCaseInsensitiveContains("mono") == true
            if isMono {
                ts.addAttribute(.font, value: tv.font ?? .systemFont(ofSize: 13.5), range: r)
                ts.removeAttribute(.backgroundColor, range: r)
            } else {
                ts.addAttribute(.font, value: NSFont.monospacedSystemFont(ofSize: 12.5, weight: .regular), range: r)
                ts.addAttribute(.backgroundColor, value: NSColor.quaternaryLabelColor, range: r)
            }
        }
    }

    // Insere uma linha divisória no ponto do cursor.
    func insertDivider() {
        guard let tv = textView, let ts = tv.textStorage else { return }
        let r = tv.selectedRange()
        let ns = ts.string as NSString
        let needsLeadingNewline = r.location > 0 && ns.character(at: r.location - 1) != 10
        let text = (needsLeadingNewline ? "\n" : "") + String(repeating: "─", count: 24) + "\n"
        let attr = NSAttributedString(string: text, attributes: [
            .font: tv.font ?? .systemFont(ofSize: 13.5), .foregroundColor: NSColor.tertiaryLabelColor,
        ])
        tv.shouldChangeText(in: r, replacementString: nil)
        ts.beginEditing()
        ts.replaceCharacters(in: r, with: attr)
        ts.endEditing()
        tv.didChangeText()
        tv.setSelectedRange(NSRange(location: r.location + attr.length, length: 0))
    }

    // Marcador colorido (estilo callout): prefixa a linha com o emoji e realça o fundo.
    func insertTag(emoji: String, color: NSColor) {
        editLines { tv, lineRange, ts in
            let allTags = ["❓", "❗", "💡", "🚩"]
            let baseFont = tv.font ?? .systemFont(ofSize: 13.5)
            if lineRange.length == 0 {
                let loc = tv.selectedRange().location
                let attr = NSAttributedString(string: emoji + " ", attributes: [.font: baseFont, .foregroundColor: NSColor.labelColor])
                ts.replaceCharacters(in: NSRange(location: loc, length: 0), with: attr)
                ts.addAttribute(.backgroundColor, value: color, range: NSRange(location: loc, length: attr.length))
                return
            }
            let nsstr = ts.string as NSString
            var body = nsstr.substring(with: lineRange)
            for tag in allTags where body.hasPrefix(tag + " ") { body = String(body.dropFirst(tag.count + 1)) }
            let attr = NSAttributedString(string: emoji + " " + body, attributes: [.font: baseFont, .foregroundColor: NSColor.labelColor])
            ts.replaceCharacters(in: lineRange, with: attr)
            ts.addAttribute(.backgroundColor, value: color, range: NSRange(location: lineRange.location, length: attr.length))
        }
    }
}
