import SwiftUI
import AppKit

/// Âncora de um comentário: onde (y) o trecho comentado começa dentro da coluna do
/// texto — usada para posicionar o balão na margem alinhado ao trecho.
struct ArticleCommentAnchor: Identifiable, Equatable {
    let id: UUID          // id da anotação
    var y: CGFloat        // topo do trecho comentado (dentro da região de texto, com inset)
    let note: String
    let colorHex: String
}

/// Renderiza UM artigo (fatia do texto completo da lei) num NSTextView que permite
/// selecionar e marcar (grifar/sublinhar/tachar/cor). As marcações são as mesmas
/// TextAnnotation da leitura corrida: os offsets locais do artigo são traduzidos
/// para offsets globais no texto da lei, então um grifo feito no Estudo aparece
/// também na Leitura corrida e vice-versa.
struct MarkableArticleView: NSViewRepresentable {
    let fullText: String
    let unitRange: NSRange           // faixa do artigo dentro de fullText
    let annotations: [TextAnnotation] // todas as anotações da lei
    let fontFamily: String
    let fontSize: Double
    var accent: Color = .accentColor  // cor dos rótulos (Art., incisos)
    var textAlignment: NSTextAlignment = .natural  // alinhamento do texto (espelha o JURIS)
    let proposedWidth: CGFloat        // largura dada pelo SwiftUI (via GeometryReader)
    @Binding var measuredHeight: CGFloat // altura medida do artigo, devolvida ao SwiftUI
    @Binding var commentAnchors: [ArticleCommentAnchor]  // posições dos comentários p/ os balões
    @ObservedObject var controller: ReaderController
    var onCommand: (ReaderCommand) -> Void

    private var articleText: String {
        let ns = fullText as NSString
        guard unitRange.location >= 0, NSMaxRange(unitRange) <= ns.length else { return "" }
        return ns.substring(with: unitRange)
    }

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    // Retorna a NSTextView DIRETO (sem NSScrollView interno). O artigo é renderizado
    // na sua altura natural e quem rola é o ScrollView do SwiftUI que envolve toda a
    // página do Estudo — some assim a fragilidade de aninhar NSScrollView dentro do
    // SwiftUI (a barra que "existia mas não andava" / prendia num pedaço do meio).
    func makeNSView(context: Context) -> ReaderTextView {
        let storage = NSTextStorage()
        let layoutManager = RoundedBackgroundLayoutManager()
        let container = NSTextContainer(size: NSSize(width: 10, height: CGFloat.greatestFiniteMagnitude))
        container.widthTracksTextView = true
        storage.addLayoutManager(layoutManager)
        layoutManager.addTextContainer(container)

        let textView = ReaderTextView(frame: NSRect(x: 0, y: 0, width: 400, height: 100), textContainer: container)
        textView.isEditable = false
        textView.isSelectable = true
        textView.isRichText = false
        textView.textContainerInset = NSSize(width: 34, height: 10)
        textView.isVerticallyResizable = false
        textView.isHorizontallyResizable = false
        textView.drawsBackground = false
        textView.allowsNoteCommand = false // no Estudo não há painel de nota da anotação
        textView.delegate = context.coordinator
        textView.onCommand = { [weak coordinator = context.coordinator] cmd in
            coordinator?.parent.onCommand(cmd)
        }

        controller.textView = textView
        context.coordinator.textView = textView
        applyText(to: textView, coordinator: context.coordinator)
        applyAnnotations(to: textView, coordinator: context.coordinator)
        remeasure(textView, coordinator: context.coordinator, force: true)
        return textView
    }

    func updateNSView(_ textView: ReaderTextView, context: Context) {
        context.coordinator.parent = self
        controller.textView = textView
        let key = "\(articleText.hashValue)|\(fontFamily)|\(fontSize)|\(accent.hashValue)|\(textAlignment.rawValue)"
        var changed = false
        if context.coordinator.lastKey != key {
            applyText(to: textView, coordinator: context.coordinator)
            context.coordinator.lastAnnHash = 0
            changed = true
        }
        let annHash = annotationsHash
        let annChanged = context.coordinator.lastAnnHash != annHash
        if annChanged {
            applyAnnotations(to: textView, coordinator: context.coordinator)
            context.coordinator.lastAnnHash = annHash
        }
        // Força re-medir quando comentários mudam para reposicionar os balões.
        remeasure(textView, coordinator: context.coordinator, force: changed || annChanged)
    }

    // Mede a altura do artigo na largura dada pelo SwiftUI (via GeometryReader) e
    // devolve pelo binding — o ScrollView externo então sabe o tamanho real e rola
    // até o fim. Largura EXPLÍCITA no container (widthTracksTextView lê o frame, que
    // às vezes ainda é 0 → media truncava o artigo em ~2/3, prendendo a rolagem).
    private func remeasure(_ textView: ReaderTextView, coordinator: Coordinator, force: Bool) {
        let width = proposedWidth
        guard width > 1, let lm = textView.layoutManager, let container = textView.textContainer else { return }
        if !force && abs(coordinator.lastLayoutWidth - width) < 0.5 { return }
        coordinator.lastLayoutWidth = width
        let inset = textView.textContainerInset
        container.widthTracksTextView = false
        container.containerSize = NSSize(width: max(1, width - inset.width * 2),
                                         height: CGFloat.greatestFiniteMagnitude)
        lm.ensureLayout(for: container)
        let height = ceil(lm.usedRect(for: container).height + inset.height * 2)
        textView.setFrameSize(NSSize(width: width, height: height))
        if abs(measuredHeight - height) > 0.5 {
            DispatchQueue.main.async { measuredHeight = height }
        }
        updateCommentAnchors(lm: lm, container: container, inset: inset)
    }

    // Para cada anotação COM comentário, calcula onde (y) o trecho começa na coluna
    // do texto — o balão da margem é posicionado nesse y.
    private func updateCommentAnchors(lm: NSLayoutManager, container: NSTextContainer, inset: NSSize) {
        let len = (articleText as NSString).length
        var out: [ArticleCommentAnchor] = []
        for a in annotations where !a.isOrphaned && !a.note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            let inter = NSIntersectionRange(a.range, unitRange)
            guard inter.length > 0 else { continue }
            let loc = inter.location - unitRange.location
            guard loc >= 0, loc + inter.length <= len else { continue }
            let glyphRange = lm.glyphRange(forCharacterRange: NSRange(location: loc, length: inter.length),
                                           actualCharacterRange: nil)
            let rect = lm.boundingRect(forGlyphRange: glyphRange, in: container)
            out.append(ArticleCommentAnchor(id: a.id, y: rect.minY + inset.height, note: a.note, colorHex: a.colorHex))
        }
        out.sort { $0.y < $1.y }
        if out != commentAnchors {
            DispatchQueue.main.async { commentAnchors = out }
        }
    }

    private var annotationsHash: Int {
        var h = Hasher()
        for a in localAnnotations() { h.combine(a.location); h.combine(a.length); h.combine(a.colorHex); h.combine(a.style) }
        for a in annotations where !a.note.isEmpty { h.combine(a.id); h.combine(a.note) }  // comentários
        return h.finalize()
    }

    /// Anotações que caem neste artigo, já traduzidas para offsets locais.
    private func localAnnotations() -> [(location: Int, length: Int, colorHex: String, style: AnnotationStyle)] {
        let len = (articleText as NSString).length
        return annotations.compactMap { a in
            guard !a.isOrphaned else { return nil }
            let inter = NSIntersectionRange(a.range, unitRange)
            guard inter.length > 0 else { return nil }
            let loc = inter.location - unitRange.location
            guard loc >= 0, loc + inter.length <= len else { return nil }
            return (loc, inter.length, a.colorHex, a.style)
        }
    }

    private func baseFont(bold: Bool) -> NSFont {
        let size = CGFloat(fontSize)
        switch fontFamily {
        case "Sistema": return bold ? .boldSystemFont(ofSize: size) : .systemFont(ofSize: size)
        case "Sistema (Serifa)":
            if let d = NSFont.systemFont(ofSize: size, weight: bold ? .semibold : .regular).fontDescriptor.withDesign(.serif),
               let f = NSFont(descriptor: d, size: size) { return f }
            return bold ? .boldSystemFont(ofSize: size) : .systemFont(ofSize: size)
        default:
            if let f = NSFontManager.shared.font(withFamily: fontFamily, traits: bold ? [.boldFontMask] : [], weight: 5, size: size) { return f }
            return bold ? .boldSystemFont(ofSize: size) : .systemFont(ofSize: size)
        }
    }

    /// Estilo tipográfico ao modo "plataforma de estudo" (Magistrar/PROLegis):
    /// caput e rótulos coloridos, incisos e alíneas com recuo pendente, § em
    /// destaque. Só aplica ATRIBUTOS (não altera o texto), então os offsets das
    /// marcações continuam válidos.
    private func applyText(to textView: ReaderTextView, coordinator: Coordinator) {
        let ns = articleText as NSString
        let base = baseFont(bold: false)
        // "Lei limpa": o texto da lei fica SEM marcação automática (nenhuma cor de acento,
        // negrito, itálico ou chip de inciso). Só mantemos o RECUO estrutural pra leitura.
        // Os grifos DO USUÁRIO são aplicados depois em applyAnnotations, intactos.

        let attributed = NSMutableAttributedString(string: articleText)
        let basePara = NSMutableParagraphStyle()
        basePara.lineSpacing = 7
        basePara.paragraphSpacing = 16
        basePara.alignment = textAlignment
        attributed.addAttributes([.font: base, .foregroundColor: NSColor.labelColor,
                                  .paragraphStyle: basePara],
                                 range: NSRange(location: 0, length: ns.length))

        func indent(_ first: CGFloat, _ head: CGFloat) -> NSParagraphStyle {
            let p = NSMutableParagraphStyle()
            p.lineSpacing = 7; p.paragraphSpacing = 10; p.paragraphSpacingBefore = 3
            p.firstLineHeadIndent = first; p.headIndent = head
            return p
        }
        func prefixRange(_ lineRange: NSRange, _ length: Int) -> NSRange {
            NSRange(location: lineRange.location, length: max(0, min(length, lineRange.length)))
        }

        var i = 0
        while i < ns.length {
            let lineRange = ns.lineRange(for: NSRange(location: i, length: 0))
            defer { i = NSMaxRange(lineRange) }
            let line = ns.substring(with: lineRange).trimmingCharacters(in: .whitespacesAndNewlines)
            if line.isEmpty { continue }

            // Lei limpa: SÓ o recuo estrutural (§, incisos, alíneas). Nada de negrito, cor
            // de acento, chip de inciso ou itálico — o texto da lei fica limpo pra leitura,
            // e as marcações do usuário (grifos) é que dão o destaque.
            if firstMatch("^(§+\\s*\\d+[ºo°]?|Parágrafo único|Parágrafo)", line) != nil {
                attributed.addAttribute(.paragraphStyle, value: indent(4, 22), range: lineRange)
            } else if firstMatch("^[IVXLCDM]+\\s+[-–—]", line) != nil {
                attributed.addAttribute(.paragraphStyle, value: indent(16, 34), range: lineRange)
            } else if firstMatch("^[a-z]\\)", line) != nil {
                attributed.addAttribute(.paragraphStyle, value: indent(34, 50), range: lineRange)
            }
        }
        coordinator.incisoRanges = []   // sem chips de inciso (lei limpa)
        // (Removido) esmaecer as notas do Planalto (Revogado/Vide/Redação dada) — a lei fica
        // limpa; o conteúdo das alterações continua no bloco "Remissões e alterações" abaixo.
        textView.textStorage?.setAttributedString(attributed)
        // Mesma chave calculada em updateNSView; inclui o accent para repintar os
        // rótulos se a matéria (cor) da norma mudar com o artigo aberto.
        coordinator.lastKey = "\(articleText.hashValue)|\(fontFamily)|\(fontSize)|\(accent.hashValue)|\(textAlignment.rawValue)"
        // A altura é recalculada pelo SwiftUI via sizeThatFits — invalida a medição
        // ao trocar o texto/fonte para o ScrollView externo pegar a nova altura.
        textView.invalidateIntrinsicContentSize()
    }

    private func firstMatch(_ pattern: String, _ line: String) -> String? {
        guard let re = try? NSRegularExpression(pattern: pattern) else { return nil }
        let ns = line as NSString
        guard let m = re.firstMatch(in: line, range: NSRange(location: 0, length: ns.length)) else { return nil }
        return ns.substring(with: m.range)
    }

    // ns.lineRange(for:) inclui o(s) caractere(s) de quebra de linha; sem tirá-los,
    // o fundo do chip "vazaria" um traço na borda inferior da linha.
    private func trimmedLineRange(_ lineRange: NSRange, in ns: NSString) -> NSRange {
        // ns.lineRange(for:) reconhece \n, \r, \r\n, U+2028 e U+2029 como
        // terminador — cobre todos, senão um deles sobra pintado no chip.
        var len = lineRange.length
        while len > 0 {
            let last = ns.character(at: lineRange.location + len - 1)
            if last == 10 || last == 13 || last == 0x2028 || last == 0x2029 || last == 0x85 {
                len -= 1
            } else {
                break
            }
        }
        return NSRange(location: lineRange.location, length: len)
    }

    private func applyAnnotations(to textView: ReaderTextView, coordinator: Coordinator) {
        guard let storage = textView.textStorage else { return }
        let full = NSRange(location: 0, length: storage.length)
        storage.beginEditing()
        for attr in [NSAttributedString.Key.backgroundColor, .underlineStyle, .underlineColor, .strikethroughStyle, .strikethroughColor] {
            storage.removeAttribute(attr, range: full)
        }
        // Como a "lei limpa" deixa o texto base uniforme, aqui reasseguramos fonte/cor base
        // sobre TODO o range antes de reaplicar as marcações — assim negrito/itálico/cor de
        // texto (marcas do usuário) somem corretamente quando removidos.
        let baseF = baseFont(bold: false)
        storage.addAttribute(.font, value: baseF, range: full)
        storage.addAttribute(.foregroundColor, value: NSColor.labelColor, range: full)
        var ranges: [NSRange] = []
        for a in localAnnotations() {
            let range = NSRange(location: a.location, length: a.length)
            guard NSMaxRange(range) <= storage.length else { continue }
            let color = NSColor(hexRGBA: a.colorHex) ?? .systemYellow
            switch a.style {
            case .highlight: storage.addAttribute(.backgroundColor, value: color.withAlphaComponent(0.32), range: range)
            case .underline:
                storage.addAttribute(.underlineStyle, value: NSUnderlineStyle.single.rawValue, range: range)
                storage.addAttribute(.underlineColor, value: color, range: range)
            case .strikethrough:
                storage.addAttribute(.strikethroughStyle, value: NSUnderlineStyle.single.rawValue, range: range)
                storage.addAttribute(.strikethroughColor, value: color, range: range)
            case .bold:
                storage.addAttribute(.font, value: baseFont(bold: true), range: range)
            case .italic:
                storage.addAttribute(.font, value: NSFontManager.shared.convert(baseF, toHaveTrait: .italicFontMask), range: range)
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
    }

    @MainActor
    final class Coordinator: NSObject, NSTextViewDelegate {
        var parent: MarkableArticleView
        weak var textView: ReaderTextView?
        var lastKey = ""
        var lastAnnHash = 0
        var lastLayoutWidth: CGFloat = 0
        var pendingLayout: DispatchWorkItem?
        var incisoRanges: [NSRange] = []
        init(_ parent: MarkableArticleView) { self.parent = parent }

        func textViewDidChangeSelection(_ notification: Notification) {
            guard let tv = textView else { return }
            let len = tv.selectedRange().length
            DispatchQueue.main.async { [weak self] in
                guard let self, self.parent.controller.selectionLength != len else { return }
                self.parent.controller.selectionLength = len
            }
        }
    }
}
