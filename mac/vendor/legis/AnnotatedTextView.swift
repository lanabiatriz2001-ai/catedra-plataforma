import SwiftUI
import AppKit

enum ReaderCommand {
    case apply(AnnotationStyle)
    case annotate            // grifa com a cor atual e abre o painel para escrever a nota
    case removeInSelection
}

/// Controle imperativo do leitor (busca, rolagem, seleção) exposto ao SwiftUI.
@MainActor
final class ReaderController: ObservableObject {
    weak var textView: ReaderTextView?
    @Published var selectionLength: Int = 0

    var selectedRange: NSRange? {
        guard let range = textView?.selectedRange(), range.length > 0 else { return nil }
        return range
    }

    func showFindBar() {
        guard let tv = textView else { return }
        tv.window?.makeFirstResponder(tv)
        let item = NSMenuItem()
        item.tag = NSTextFinder.Action.showFindInterface.rawValue
        tv.performTextFinderAction(item)
    }

    func scroll(to range: NSRange) {
        guard let tv = textView, let storage = tv.textStorage,
              range.location >= 0, NSMaxRange(range) <= storage.length else { return }
        // Com layout não contíguo, o primeiro scroll de um salto longo pode parar
        // em posição aproximada; repetir após o layout assentar corrige o destino.
        tv.scrollRangeToVisible(range)
        DispatchQueue.main.async { [weak tv] in
            // O texto pode ter trocado (outra norma aberta) antes deste tick
            // rodar — revalida contra o textStorage ATUAL, senão um range válido
            // para a norma antiga (maior) estoura o índice na norma nova (menor).
            guard let tv, let storage = tv.textStorage,
                  range.location >= 0, NSMaxRange(range) <= storage.length else { return }
            tv.scrollRangeToVisible(range)
            tv.showFindIndicator(for: range)
        }
    }

    /// Pula para "Art. N" (aceita "5", "5º", "art 5", "1045", "1.045" e "1º-A"/"1-A").
    func jump(toArticle query: String) {
        guard let tv = textView, let storage = tv.textStorage else { return }
        let trimmed = query.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        // Separa a parte numérica do sufixo de letra ("1º-A" → dígitos "1", sufixo "A").
        let body = trimmed
            .replacingOccurrences(of: "(?i)^art(?:igo)?\\.?\\s*", with: "", options: .regularExpression)
            .trimmingCharacters(in: .whitespaces)
        let digits = body.filter(\.isNumber)
        let suffixLetter = body.range(of: "(?i)[a-z]\\s*$", options: .regularExpression)
            .map { String(body[$0]).trimmingCharacters(in: .whitespaces) }
        let text = storage.string
        var patterns: [String] = []
        if !digits.isEmpty {
            // Ponto de milhar opcional entre dígitos ("1045" acha "Art. 1.045").
            let numberPattern = digits.map { NSRegularExpression.escapedPattern(for: String($0)) }
                .joined(separator: "\\.?")
            // Ordinal (º/°) e sufixo de letra opcionais: casa "1º-A", "1-A" e "1º".
            let suffix = suffixLetter.map {
                "[ºo°]?\\s*[-–.]\\s*\(NSRegularExpression.escapedPattern(for: $0))"
            } ?? ""
            // Lookahead: "5" não casa dentro de "50"; aceita fim de linha/pontuação.
            patterns.append("(?mi)^Art\\.?\\s*\(numberPattern)\(suffix)[ºo°]?(?=[\\s.,;:)\\-–—]|$)")
        }
        patterns.append(NSRegularExpression.escapedPattern(for: trimmed))
        let ns = text as NSString
        for pattern in patterns {
            if let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]),
               let match = regex.firstMatch(in: text, range: NSRange(location: 0, length: ns.length)) {
                scroll(to: match.range)
                return
            }
        }
        NSSound.beep()
    }
}

/// NSTextView com menu de contexto de marcação.
final class ReaderTextView: NSTextView {
    var onCommand: ((ReaderCommand) -> Void)?
    var annotatedRanges: [NSRange] = []
    var allowsNoteCommand = true   // "Anotar…" só onde há painel de nota da anotação
    private var lastMenuClickIndex = 0 // onde o botão direito foi clicado (p/ Remover marcação)

    override func menu(for event: NSEvent) -> NSMenu? {
        let menu = super.menu(for: event) ?? NSMenu()
        var items: [NSMenuItem] = []
        if selectedRange().length > 0 {
            items.append(contentsOf: [
                menuItem("Grifar", symbol: "highlighter", action: #selector(cmdHighlight)),
                menuItem("Sublinhar", symbol: "underline", action: #selector(cmdUnderline)),
                menuItem("Tachar", symbol: "strikethrough", action: #selector(cmdStrikethrough)),
            ])
            if allowsNoteCommand {
                items.append(menuItem("Anotar…", symbol: "note.text.badge.plus", action: #selector(cmdNote)))
            }
        }
        let clickIndex = characterIndex(for: event)
        lastMenuClickIndex = clickIndex
        let hitsAnnotation = selectedRange().length > 0
            ? annotatedRanges.contains { NSIntersectionRange($0, selectedRange()).length > 0 }
            : annotatedRanges.contains { NSLocationInRange(clickIndex, $0) }
        if hitsAnnotation {
            items.append(menuItem("Remover marcação", symbol: "eraser", action: #selector(cmdRemove)))
        }
        if !items.isEmpty {
            items.append(NSMenuItem.separator())
            for (offset, item) in items.enumerated() { menu.insertItem(item, at: offset) }
        }
        return menu
    }

    private func characterIndex(for event: NSEvent) -> Int {
        let point = convert(event.locationInWindow, from: nil)
        return characterIndexForInsertion(at: point)
    }

    private func menuItem(_ title: String, symbol: String, action: Selector) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: action, keyEquivalent: "")
        item.target = self
        item.image = NSImage(systemSymbolName: symbol, accessibilityDescription: title)
        return item
    }

    @objc private func cmdHighlight() { onCommand?(.apply(.highlight)) }
    @objc private func cmdUnderline() { onCommand?(.apply(.underline)) }
    @objc private func cmdStrikethrough() { onCommand?(.apply(.strikethrough)) }
    @objc private func cmdNote() { onCommand?(.annotate) }
    @objc private func cmdRemove() {
        // Sem seleção, remove a marcação sob o PONTO DO CLIQUE direito — o cursor
        // de inserção pode estar em outro lugar e o menu foi montado pelo clique.
        if selectedRange().length == 0 {
            if let hit = annotatedRanges.first(where: { NSLocationInRange(lastMenuClickIndex, $0) }) {
                setSelectedRange(hit)
            }
        }
        onCommand?(.removeInSelection)
    }
}

struct AnnotatedTextView: NSViewRepresentable {
    let text: String
    let annotations: [TextAnnotation]
    let fontFamily: String
    let fontSize: Double
    @ObservedObject var controller: ReaderController
    @Binding var focusedAnnotationID: UUID?
    var onCommand: (ReaderCommand) -> Void
    var textAlignment: NSTextAlignment = .natural

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeNSView(context: Context) -> NSScrollView {
        let storage = NSTextStorage()
        let layoutManager = RoundedBackgroundLayoutManager()
        layoutManager.allowsNonContiguousLayout = false
        let container = NSTextContainer(size: NSSize(width: 0, height: CGFloat.greatestFiniteMagnitude))
        container.widthTracksTextView = true
        storage.addLayoutManager(layoutManager)
        layoutManager.addTextContainer(container)

        let textView = ReaderTextView(frame: .zero, textContainer: container)
        textView.isEditable = false
        textView.isSelectable = true
        textView.isRichText = false
        textView.usesFindBar = true
        textView.isIncrementalSearchingEnabled = true
        textView.textContainerInset = NSSize(width: 40, height: 28)   // margens largas p/ leitura
        textView.autoresizingMask = [.width]
        textView.isVerticallyResizable = true
        textView.isHorizontallyResizable = false
        textView.minSize = NSSize(width: 0, height: 0)
        textView.maxSize = NSSize(width: CGFloat.greatestFiniteMagnitude, height: CGFloat.greatestFiniteMagnitude)
        textView.drawsBackground = true
        textView.backgroundColor = .textBackgroundColor
        textView.delegate = context.coordinator
        textView.onCommand = { [weak coordinator = context.coordinator] command in
            coordinator?.parent.onCommand(command)
        }

        let scrollView = NSScrollView()
        scrollView.documentView = textView
        scrollView.hasVerticalScroller = true
        scrollView.autohidesScrollers = false
        scrollView.drawsBackground = true
        scrollView.backgroundColor = .textBackgroundColor

        controller.textView = textView
        context.coordinator.textView = textView
        applyFullText(to: textView, coordinator: context.coordinator)
        applyAnnotations(to: textView, coordinator: context.coordinator)
        return scrollView
    }

    func updateNSView(_ scrollView: NSScrollView, context: Context) {
        guard let textView = scrollView.documentView as? ReaderTextView else { return }
        let coordinator = context.coordinator
        coordinator.parent = self
        controller.textView = textView

        let fontKey = "\(fontFamily)|\(fontSize)|\(textAlignment.rawValue)"
        if coordinator.lastText != text || coordinator.lastFontKey != fontKey {
            applyFullText(to: textView, coordinator: coordinator)
            coordinator.lastAnnotationsKey = -1 // força reaplicar marcações
        }
        let annotationsKey = annotationsHash
        if coordinator.lastAnnotationsKey != annotationsKey {
            applyAnnotations(to: textView, coordinator: coordinator)
        }
        let currentWidth = scrollView.contentSize.width
        if currentWidth > 0, abs(coordinator.lastLayoutWidth - currentWidth) > 0.5 {
            coordinator.lastLayoutWidth = currentWidth
            scheduleDocumentLayout(for: textView, coordinator: coordinator)
        }
    }

    private var annotationsHash: Int {
        var hasher = Hasher()
        for a in annotations {
            hasher.combine(a.id); hasher.combine(a.location); hasher.combine(a.length)
            hasher.combine(a.style); hasher.combine(a.colorHex)
        }
        return hasher.finalize()
    }

    // MARK: - Construção do texto

    private func baseFont(ofSize size: CGFloat, bold: Bool) -> NSFont {
        switch fontFamily {
        case "Sistema":
            return bold ? .boldSystemFont(ofSize: size) : .systemFont(ofSize: size)
        case "Sistema (Serifa)":
            let descriptor = NSFont.systemFont(ofSize: size, weight: bold ? .semibold : .regular)
                .fontDescriptor.withDesign(.serif)
            if let descriptor, let font = NSFont(descriptor: descriptor, size: size) { return font }
            return bold ? .boldSystemFont(ofSize: size) : .systemFont(ofSize: size)
        default:
            let manager = NSFontManager.shared
            if let font = manager.font(withFamily: fontFamily,
                                       traits: bold ? [.boldFontMask] : [],
                                       weight: 5, size: size) {
                return font
            }
            return bold ? .boldSystemFont(ofSize: size) : .systemFont(ofSize: size)
        }
    }

    private func applyFullText(to textView: ReaderTextView, coordinator: Coordinator) {
        let size = CGFloat(fontSize)
        let regular = baseFont(ofSize: size, bold: false)
        let bold = baseFont(ofSize: size, bold: true)

        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineSpacing = 7       // leitura confortável (foco na leitura)
        paragraphStyle.paragraphSpacing = 16
        paragraphStyle.alignment = textAlignment

        let attributed = NSMutableAttributedString(string: text, attributes: [
            .font: regular,
            .foregroundColor: NSColor.labelColor,
            .paragraphStyle: paragraphStyle,
        ])

        // Lei limpa: NÃO destacar cabeçalhos (artigos/títulos/capítulos) em negrito — o texto
        // da lei fica limpo na leitura corrida; os grifos do usuário é que dão o destaque.
        _ = bold  // (mantido pra assinatura de baseFont; sem uso automático)

        textView.textStorage?.setAttributedString(attributed)
        scheduleDocumentLayout(for: textView, coordinator: coordinator)
        coordinator.lastText = text
        coordinator.lastFontKey = "\(fontFamily)|\(fontSize)|\(textAlignment.rawValue)"
    }

    // Layout EM PEDAÇOS: um ensureLayout do documento inteiro numa tacada só
    // congelava a thread principal por 0,3-1,4s nas normas maiores (CF, OIT) toda
    // vez que abre/redimensiona/troca fonte. Aqui o layout é feito em blocos que
    // cedem ao run loop entre si — a altura (e a barra de rolagem) cresce
    // progressivamente e nenhum bloco isolado passa de ~1 quadro. A largura é
    // fixada explicitamente (não via widthTracksTextView, que depende do frame).
    private func scheduleDocumentLayout(for textView: ReaderTextView, coordinator: Coordinator) {
        coordinator.layoutGeneration += 1
        let gen = coordinator.layoutGeneration
        coordinator.pendingLayout?.cancel()
        let start = DispatchWorkItem { [weak textView, weak coordinator] in
            guard let textView, let coordinator, gen == coordinator.layoutGeneration,
                  let scrollView = textView.enclosingScrollView,
                  let container = textView.textContainer else { return }
            let width = max(1, scrollView.contentSize.width)
            guard width > 1 else { return }
            // Centraliza uma coluna de leitura de ~760pt (em vez do texto de ponta a
            // ponta num monitor largo); o resto vira margem lateral.
            let hInset = max(40, (width - 760) / 2)
            textView.textContainerInset = NSSize(width: hInset, height: 28)
            let inset = textView.textContainerInset
            textView.minSize = NSSize(width: 0, height: scrollView.contentSize.height)
            textView.maxSize = NSSize(width: CGFloat.greatestFiniteMagnitude,
                                      height: CGFloat.greatestFiniteMagnitude)
            textView.isVerticallyResizable = true
            textView.isHorizontallyResizable = false
            textView.autoresizingMask = [.width]
            container.widthTracksTextView = false
            container.containerSize = NSSize(width: max(1, width - inset.width * 2),
                                             height: CGFloat.greatestFiniteMagnitude)
            coordinator.layoutChunk(gen: gen, from: 0, textView: textView, inset: inset)
        }
        coordinator.pendingLayout = start
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.12, execute: start)
    }

    private func applyAnnotations(to textView: ReaderTextView, coordinator: Coordinator) {
        guard let storage = textView.textStorage else { return }
        let full = NSRange(location: 0, length: storage.length)
        storage.beginEditing()
        // Limpa apenas os trechos antes marcados (não o documento inteiro de até
        // 2,5 MB) — importa quando o seletor de cor dispara a cada tick do arraste.
        let regular = baseFont(ofSize: CGFloat(fontSize), bold: false)
        for old in textView.annotatedRanges {
            let clamped = NSIntersectionRange(old, full)
            guard clamped.length > 0 else { continue }
            storage.removeAttribute(.backgroundColor, range: clamped)
            storage.removeAttribute(.underlineStyle, range: clamped)
            storage.removeAttribute(.underlineColor, range: clamped)
            storage.removeAttribute(.strikethroughStyle, range: clamped)
            storage.removeAttribute(.strikethroughColor, range: clamped)
            // desfaz negrito/itálico/cor de texto ao remover a marca (lei limpa = base uniforme)
            storage.addAttribute(.font, value: regular, range: clamped)
            storage.addAttribute(.foregroundColor, value: NSColor.labelColor, range: clamped)
        }

        var ranges: [NSRange] = []
        for annotation in annotations where !annotation.isOrphaned {
            let range = annotation.range
            guard range.location >= 0, NSMaxRange(range) <= storage.length else { continue }
            let color = NSColor(hexRGBA: annotation.colorHex) ?? .systemYellow
            switch annotation.style {
            case .highlight:
                storage.addAttribute(.backgroundColor, value: color.withAlphaComponent(0.32), range: range)
            case .underline:
                storage.addAttribute(.underlineStyle, value: NSUnderlineStyle.single.rawValue, range: range)
                storage.addAttribute(.underlineColor, value: color, range: range)
            case .strikethrough:
                storage.addAttribute(.strikethroughStyle, value: NSUnderlineStyle.single.rawValue, range: range)
                storage.addAttribute(.strikethroughColor, value: color, range: range)
            case .bold:
                storage.addAttribute(.font, value: baseFont(ofSize: CGFloat(fontSize), bold: true), range: range)
            case .italic:
                storage.addAttribute(.font, value: NSFontManager.shared.convert(regular, toHaveTrait: .italicFontMask), range: range)
            case .textColor:
                storage.addAttribute(.foregroundColor, value: color, range: range)
            case .cloze:
                storage.addAttribute(.backgroundColor, value: color.withAlphaComponent(0.16), range: range)
                storage.addAttribute(.underlineStyle, value: NSUnderlineStyle.single.rawValue | NSUnderlineStyle.patternDash.rawValue, range: range)
                storage.addAttribute(.underlineColor, value: color, range: range)
            }
            ranges.append(range)
        }
        storage.endEditing()
        textView.annotatedRanges = ranges
        coordinator.lastAnnotationsKey = annotationsHash
    }

    // MARK: - Coordinator

    @MainActor
    final class Coordinator: NSObject, NSTextViewDelegate {
        var parent: AnnotatedTextView
        weak var textView: ReaderTextView?
        var lastText: String = ""
        var lastFontKey: String = ""
        var lastAnnotationsKey: Int = -1
        var lastLayoutWidth: CGFloat = 0
        var pendingLayout: DispatchWorkItem?
        var layoutGeneration = 0

        init(_ parent: AnnotatedTextView) { self.parent = parent }

        /// Lay out one bounded chunk, grow the text view's height to what's laid out
        /// so far, then yield to the run loop and schedule the next chunk. A newer
        /// layout pass (bump de layoutGeneration) faz esta cadeia parar sozinha.
        func layoutChunk(gen: Int, from: Int, textView: ReaderTextView, inset: NSSize) {
            guard gen == layoutGeneration,
                  let scrollView = textView.enclosingScrollView,
                  let lm = textView.layoutManager,
                  let container = textView.textContainer,
                  let storage = textView.textStorage else { return }
            let length = storage.length
            let chunk = 40_000   // ~1 quadro de layout por passo
            let end = min(from + chunk, length)
            if from < end {
                let glyphs = lm.glyphRange(forCharacterRange: NSRange(location: from, length: end - from),
                                           actualCharacterRange: nil)
                lm.ensureLayout(forGlyphRange: glyphs)
            }
            let width = max(1, scrollView.contentSize.width)
            // Medir só a altura do trecho JÁ posicionado [0, end]. usedRect(for:)
            // forçaria o layout do container INTEIRO de uma vez (anulando o layout em
            // pedaços e recriando o congelamento das leis grandes). boundingRect força
            // layout só do range pedido — e como [0, end] já está posicionado, ele lê.
            let laidGlyphs = lm.glyphRange(forCharacterRange: NSRange(location: 0, length: end),
                                           actualCharacterRange: nil)
            let laidHeight = lm.boundingRect(forGlyphRange: laidGlyphs, in: container).maxY
            let height = max(ceil(laidHeight + inset.height * 2), scrollView.contentSize.height)
            if abs(textView.frame.height - height) > 0.5 || abs(textView.frame.width - width) > 0.5 {
                textView.setFrameSize(NSSize(width: width, height: height))
                scrollView.reflectScrolledClipView(scrollView.contentView)
            }
            guard end < length else { return }
            let next = DispatchWorkItem { [weak self, weak textView] in
                guard let self, let textView else { return }
                self.layoutChunk(gen: gen, from: end, textView: textView, inset: inset)
            }
            pendingLayout = next
            DispatchQueue.main.async(execute: next)   // cede ao run loop entre pedaços
        }

        func textViewDidChangeSelection(_ notification: Notification) {
            guard let tv = textView else { return }
            let range = tv.selectedRange()
            let annotations = parent.annotations
            DispatchQueue.main.async { [weak self] in
                guard let self else { return }
                // Publica só quando muda — cada tick de arraste de seleção passa
                // por aqui, e publicar sempre re-renderiza o leitor inteiro.
                if self.parent.controller.selectionLength != range.length {
                    self.parent.controller.selectionLength = range.length
                }
                // Clique dentro de uma marcação foca a anotação no painel lateral.
                if range.length == 0 {
                    let hit = annotations.first {
                        !$0.isOrphaned && NSLocationInRange(range.location, $0.range)
                    }
                    if let hit, self.parent.focusedAnnotationID != hit.id {
                        self.parent.focusedAnnotationID = hit.id
                    }
                }
            }
        }
    }
}
