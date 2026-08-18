import SwiftUI
import UIKit

/// Editor de anotação RICO (RTF): negrito, itálico, sublinhado, tachado, cor do texto,
/// marca-texto (fundo), listas — num UITextView, com barra de formatação. Guarda RTF.
struct RichNoteEditor: View {
    let initialRTF: Data?                    // conteúdo carregado na criação (use .id p/ recriar)
    let placeholder: String
    let onChange: (Data, String) -> Void   // (RTF, texto puro) a cada edição
    var minHeight: CGFloat = 150

    @StateObject private var coord = RichTextCoordinator()
    @EnvironmentObject var store: AppStore   // cores favoritas COMPARTILHADAS com o marca-texto da lei
    @State private var inkColor = Color.primary   // última cor de texto escolhida (pra favoritar)
    @State private var hlColor = Color(hexRGBA: "#FFD60AFF")   // última cor de marca-texto escolhida

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
        ("❓", "Atenção", NSColor(red: 1.0, green: 0.60, blue: 0.42, alpha: 0.30)),
        ("❗", "Importante", NSColor(red: 1.0, green: 0.40, blue: 0.40, alpha: 0.30)),
        ("💡", "Dica", NSColor(red: 1.0, green: 0.86, blue: 0.35, alpha: 0.32)),
        ("🚩", "Revisar", NSColor(red: 0.55, green: 0.80, blue: 0.95, alpha: 0.32)),
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
                fmt("bold", "Negrito (⌘B)") { coord.toggleTrait(.traitBold) }
                fmt("italic", "Itálico (⌘I)") { coord.toggleTrait(.traitItalic) }
                fmt("underline", "Sublinhado (⌘U)") { coord.toggleUnderline() }
                fmt("strikethrough", "Tachado") { coord.toggleStrikethrough() }
                sep
                // Cor do TEXTO — livre (abre o painel do macOS); aplica na seleção.
                Image(systemName: "textformat").font(.system(size: 10))
                ColorPicker("", selection: $inkColor, supportsOpacity: false)
                    .labelsHidden()
                    .onChange(of: inkColor) { _, c in coord.setTextColor(NSColor(c)) }
                    .help("Cor do texto — escolha qualquer cor")
                // MARCA-TEXTO — livre; aplica na seleção.
                Image(systemName: "highlighter").font(.system(size: 10))
                ColorPicker("", selection: $hlColor, supportsOpacity: false)
                    .labelsHidden()
                    .onChange(of: hlColor) { _, c in coord.setHighlight(NSColor(c)) }
                    .help("Marca-texto — escolha qualquer cor")
                fmt("highlighter", "Remover marca-texto do trecho") { coord.setHighlight(nil) }
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
                            .background(RoundedRectangle(cornerRadius: 5).fill(Color(uiColor: color)))
                    }
                    .buttonStyle(.plain)
                    .help(name)
                }
                sep
                // Favoritar a cor de marca-texto atual + cores favoritas (compartilhadas
                // com o marca-texto da lei). Clique aplica; botão direito remove.
                Button { store.adicionarCorFavorita(hlColor.hexRGBA) } label: {
                    Image(systemName: store.coresFavoritas.contains(hlColor.hexRGBA) ? "star.fill" : "star")
                        .foregroundStyle(store.coresFavoritas.contains(hlColor.hexRGBA) ? Color.yellow : Color.secondary)
                }
                .help("Salvar esta cor de marca-texto nos favoritos")
                .disabled(store.coresFavoritas.contains(hlColor.hexRGBA))
                ForEach(store.coresFavoritas.prefix(6), id: \.self) { hex in
                    Button { hlColor = Color(hexRGBA: hex); coord.setHighlight(NSColor(hexRGBA: hex)) } label: {
                        Circle().fill(Color(hexRGBA: hex)).frame(width: 14, height: 14)
                            .overlay(Circle().strokeBorder(.secondary.opacity(0.35), lineWidth: 0.5))
                    }
                    .buttonStyle(.plain)
                    .help("Marcar com esta cor · botão direito remove dos favoritos")
                    .contextMenu {
                        Button(role: .destructive) { store.removerCorFavorita(hex) } label: {
                            Label("Remover dos favoritos", systemImage: "star.slash")
                        }
                    }
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

/// UITextView RTF embrulhado; a barra de formatação age via `coord`.
private struct RichTextView: UIViewRepresentable {
    let initialRTF: Data?
    let coord: RichTextCoordinator
    let onChange: (Data, String) -> Void
    let placeholder: String

    func makeUIView(context: Context) -> UITextView {
        // No iPadOS a UITextView JÁ rola sozinha: não existe NSScrollView em volta, e
        // `scrollableTextView()` é construtor do AppKit. Devolvemos a text view direto.
        let tv = UITextView()
        tv.allowsEditingTextAttributes = true      // equivale ao isRichText do macOS
        tv.backgroundColor = .clear                // equivale ao drawsBackground = false
        tv.font = .systemFont(ofSize: 13.5)
        tv.textColor = .label
        tv.textContainerInset = UIEdgeInsets(top: 9, left: 7, bottom: 9, right: 7)
        tv.delegate = coord
        coord.textView = tv
        coord.onChange = onChange
        coord.placeholder = placeholder
        // NSAttributedString(rtf:) é do AppKit; no iPadOS o RTF entra por data(_:options:).
        if let initialRTF,
           let s = try? NSAttributedString(data: initialRTF,
                                           options: [.documentType: NSAttributedString.DocumentType.rtf],
                                           documentAttributes: nil), s.length > 0 {
            tv.textStorage.setAttributedString(s)
        }
        coord.refreshPlaceholder()
        return tv
    }

    func updateUIView(_ tv: UITextView, context: Context) {
        // A verdade fica na UITextView durante a edição; não sobrescrever aqui.
    }
}

/// Coordena o UITextView: aplica formatação no trecho selecionado e emite RTF+texto.
final class RichTextCoordinator: NSObject, ObservableObject, UITextViewDelegate {
    weak var textView: UITextView?
    var onChange: ((Data, String) -> Void)?
    var placeholder: String = ""
    private var placeholderView: UILabel?
    @Published var canUndo = false
    @Published var canRedo = false

    // No iPadOS o delegate avisa por textViewDidChange(_:), não por Notification.
    func textViewDidChange(_ textView: UITextView) { emit(); refreshPlaceholder(); refreshUndoState() }

    // Desfazer/refazer usa o undoManager nativo do UITextView — cobre a digitação;
    // as ações da barra (negrito, listas…) mutam o textStorage direto e não entram
    // na pilha (limitação aceitável: o essencial de digitar/apagar texto é coberto).
    func undo() { textView?.undoManager?.undo(); refreshUndoState() }
    func redo() { textView?.undoManager?.redo(); refreshUndoState() }
    func refreshUndoState() {
        canUndo = textView?.undoManager?.canUndo ?? false
        canRedo = textView?.undoManager?.canRedo ?? false
    }

    private func emit() {
        guard let tv = textView else { return }
        let ts = tv.textStorage   // não-opcional no iPadOS
        let full = NSRange(location: 0, length: ts.length)
        // .rtf(from:) é conveniência do AppKit; aqui o RTF sai por data(from:).
        let rtf = (try? ts.data(from: full,
                                documentAttributes: [.documentType: NSAttributedString.DocumentType.rtf])) ?? Data()
        onChange?(rtf, ts.string)
    }

    // Placeholder simples sobreposto quando vazio.
    func refreshPlaceholder() {
        guard let tv = textView else { return }
        let empty = tv.textStorage.length == 0
        if empty, placeholderView == nil {
            // NSTextField(labelWithString:) é do AppKit; o rótulo do iPadOS é UILabel,
            // que já nasce não editável e sem fundo — daí sumirem quatro linhas.
            let lbl = UILabel()
            lbl.text = placeholder
            lbl.font = .systemFont(ofSize: 13.5)
            lbl.textColor = .tertiaryLabel
            lbl.numberOfLines = 0
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

    // shouldChangeText/didChangeText são do NSTextView. No iPadOS o ciclo é
    // beginEditing/endEditing no storage, e o aviso ao delegate é MANUAL — sem ele o
    // RTF não seria emitido e a nota sairia da tela sem ter sido salva.
    private func edit(_ apply: (UITextView, NSRange, NSMutableAttributedString) -> Void) {
        guard let tv = textView else { return }
        let ts = tv.textStorage
        let r = tv.selectedRange
        guard r.length > 0 else { return }   // sem seleção não há o que formatar (o Mac dava beep)
        ts.beginEditing()
        apply(tv, r, ts)
        ts.endEditing()
        textViewDidChange(tv)
    }

    // Como `edit`, mas age na(s) LINHA(S) inteira(s) do parágrafo — funciona mesmo
    // sem seleção (só o cursor na linha), para título/lista/citação/alinhamento.
    private func editLines(_ apply: (UITextView, NSRange, NSMutableAttributedString) -> Void) {
        guard let tv = textView else { return }
        let ts = tv.textStorage
        let sel = tv.selectedRange
        let nsstr = ts.string as NSString
        let lineRange = nsstr.length > 0 ? nsstr.lineRange(for: sel) : NSRange(location: 0, length: 0)
        ts.beginEditing()
        apply(tv, lineRange, ts)
        ts.endEditing()
        textViewDidChange(tv)
    }

    /// Liga/desliga negrito ou itálico no trecho. No macOS quem fazia isso era o
    /// NSFontManager; no iPadOS o trait vive no descriptor da própria fonte.
    func toggleTrait(_ trait: UIFontDescriptor.SymbolicTraits) {
        edit { tv, r, ts in
            ts.enumerateAttribute(.font, in: r) { val, sub, _ in
                let font = (val as? NSFont) ?? tv.font ?? .systemFont(ofSize: 13.5)
                var traits = font.fontDescriptor.symbolicTraits
                if traits.contains(trait) { traits.remove(trait) } else { traits.insert(trait) }
                guard let d = font.fontDescriptor.withSymbolicTraits(traits) else { return }
                ts.addAttribute(.font, value: UIFont(descriptor: d, size: font.pointSize), range: sub)
            }
        }
    }
    /// Mesma fonte com um trait somado — usado por título e citação.
    private static func comTrait(_ f: NSFont, _ t: UIFontDescriptor.SymbolicTraits) -> NSFont {
        guard let d = f.fontDescriptor.withSymbolicTraits(f.fontDescriptor.symbolicTraits.union(t)) else { return f }
        return UIFont(descriptor: d, size: f.pointSize)
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
            ts.setAttributes([.font: NSFont.systemFont(ofSize: 13.5), .foregroundColor: NSColor.label], range: r)
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
                                                              .foregroundColor: NSColor.label])
            ts.replaceCharacters(in: lineRange, with: replacement)
        }
    }

    // Título H1/H2/H3 na(s) linha(s) do parágrafo — nível 0 volta ao corpo normal.
    func setHeading(_ level: Int) {
        editLines { _, lineRange, ts in
            guard lineRange.length > 0 else { return }
            let size: CGFloat = level == 1 ? 20 : level == 2 ? 17 : level == 3 ? 15 : 13.5
            let base = NSFont.systemFont(ofSize: size)
            let font = level > 0 ? Self.comTrait(base, .traitBold) : base
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
            let font = isQuoted ? base : Self.comTrait(base, .traitItalic)
            ts.addAttribute(.font, value: font, range: lineRange)
            ts.addAttribute(.foregroundColor, value: isQuoted ? NSColor.label : NSColor.secondaryLabel, range: lineRange)
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
                ts.addAttribute(.backgroundColor, value: NSColor.quaternaryLabel, range: r)
            }
        }
    }

    // Insere uma linha divisória no ponto do cursor.
    func insertDivider() {
        guard let tv = textView else { return }
        let ts = tv.textStorage
        let r = tv.selectedRange
        let ns = ts.string as NSString
        let needsLeadingNewline = r.location > 0 && ns.character(at: r.location - 1) != 10
        let text = (needsLeadingNewline ? "\n" : "") + String(repeating: "─", count: 24) + "\n"
        let attr = NSAttributedString(string: text, attributes: [
            .font: tv.font ?? .systemFont(ofSize: 13.5), .foregroundColor: NSColor.tertiaryLabel,
        ])
        ts.beginEditing()
        ts.replaceCharacters(in: r, with: attr)
        ts.endEditing()
        tv.selectedRange = NSRange(location: r.location + attr.length, length: 0)
        textViewDidChange(tv)
    }

    // Marcador colorido (estilo callout): prefixa a linha com o emoji e realça o fundo.
    func insertTag(emoji: String, color: NSColor) {
        editLines { tv, lineRange, ts in
            let allTags = ["❓", "❗", "💡", "🚩"]
            let baseFont = tv.font ?? .systemFont(ofSize: 13.5)
            if lineRange.length == 0 {
                let loc = tv.selectedRange.location
                let attr = NSAttributedString(string: emoji + " ", attributes: [.font: baseFont, .foregroundColor: NSColor.label])
                ts.replaceCharacters(in: NSRange(location: loc, length: 0), with: attr)
                ts.addAttribute(.backgroundColor, value: color, range: NSRange(location: loc, length: attr.length))
                return
            }
            let nsstr = ts.string as NSString
            var body = nsstr.substring(with: lineRange)
            for tag in allTags where body.hasPrefix(tag + " ") { body = String(body.dropFirst(tag.count + 1)) }
            let attr = NSAttributedString(string: emoji + " " + body, attributes: [.font: baseFont, .foregroundColor: NSColor.label])
            ts.replaceCharacters(in: lineRange, with: attr)
            ts.addAttribute(.backgroundColor, value: color, range: NSRange(location: lineRange.location, length: attr.length))
        }
    }
}
