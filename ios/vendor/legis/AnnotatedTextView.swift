import SwiftUI
import UIKit

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
    /// Retângulo do trecho selecionado, no espaço de coordenadas da MarkableArticleView
    /// (já com o textContainerInset somado) — usado para posicionar a barra de marcação
    /// flutuante logo acima/abaixo da seleção. `.zero` quando não há seleção.
    @Published var selectionRect: CGRect = .zero

    var selectedRange: NSRange? {
        guard let range = textView?.selectedRange, range.length > 0 else { return nil }
        return range
    }

    /// No macOS isto abria a barra de busca nativa do NSTextView (NSTextFinder). O iPadOS
    /// não tem equivalente numa UITextView somente-leitura — a busca de verdade do LEGIS
    /// é a da própria tela (lupa), que não passa por aqui. Fica só o foco no texto.
    func showFindBar() {
        textView?.becomeFirstResponder()
    }

    func scroll(to range: NSRange) {
        guard let tv = textView else { return }
        let storage = tv.textStorage   // não-opcional no iPadOS
        guard range.location >= 0, NSMaxRange(range) <= storage.length else { return }
        // Com layout não contíguo, o primeiro scroll de um salto longo pode parar
        // em posição aproximada; repetir após o layout assentar corrige o destino.
        tv.scrollRangeToVisible(range)
        DispatchQueue.main.async { [weak tv] in
            // O texto pode ter trocado (outra norma aberta) antes deste tick
            // rodar — revalida contra o textStorage ATUAL, senão um range válido
            // para a norma antiga (maior) estoura o índice na norma nova (menor).
            guard let tv, range.location >= 0, NSMaxRange(range) <= tv.textStorage.length else { return }
            tv.scrollRangeToVisible(range)
            // showFindIndicator (o "flash" amarelo do macOS) não existe no iPadOS: em vez
            // dele, seleciona o trecho — o destaque da seleção cumpre o mesmo papel.
            tv.selectedRange = range
        }
    }

    /// Pula para "Art. N" (aceita "5", "5º", "art 5", "1045", "1.045" e "1º-A"/"1-A").
    func jump(toArticle query: String) {
        guard let tv = textView else { return }
        let storage = tv.textStorage
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
        // Artigo não encontrado. O Mac dava um beep; no iPadOS não há equivalente e um
        // som seria intrusivo — falha em silêncio, como já falhava quando o texto não
        // tinha o artigo.
    }
}

/// UITextView com menu de contexto de marcação.
final class ReaderTextView: UITextView {
    var onCommand: ((ReaderCommand) -> Void)?
    var annotatedRanges: [NSRange] = []
    var allowsNoteCommand = true   // "Anotar…" só onde há painel de nota da anotação
    // No macOS o menu vinha do clique DIREITO, que podia cair fora da seleção — por isso
    // existia lastMenuClickIndex. No iPadOS o menu é o da SELEÇÃO: ele só aparece quando
    // há texto selecionado, então o ponto do clique deixa de fazer sentido e some.
    override func editMenu(for textRange: UITextRange, suggestedActions: [UIMenuElement]) -> UIMenu? {
        let sel = selectedRange
        var acoes: [UIAction] = []
        if sel.length > 0 {
            acoes.append(item("Grifar", "highlighter") { [weak self] in self?.onCommand?(.apply(.highlight)) })
            acoes.append(item("Sublinhar", "underline") { [weak self] in self?.onCommand?(.apply(.underline)) })
            acoes.append(item("Tachar", "strikethrough") { [weak self] in self?.onCommand?(.apply(.strikethrough)) })
            if allowsNoteCommand {
                acoes.append(item("Anotar…", "note.text.badge.plus") { [weak self] in self?.onCommand?(.annotate) })
            }
            if annotatedRanges.contains(where: { NSIntersectionRange($0, sel).length > 0 }) {
                acoes.append(item("Remover marcação", "eraser") { [weak self] in self?.onCommand?(.removeInSelection) })
            }
        }
        guard !acoes.isEmpty else { return UIMenu(children: suggestedActions) }
        // Os comandos do Cátedra vêm primeiro; Copiar/Definir/Compartilhar seguem depois.
        return UIMenu(children: [UIMenu(options: .displayInline, children: acoes)] + suggestedActions)
    }

    private func item(_ titulo: String, _ simbolo: String, _ acao: @escaping () -> Void) -> UIAction {
        UIAction(title: titulo, image: UIImage(systemName: simbolo)) { _ in acao() }
    }
}

struct AnnotatedTextView: UIViewRepresentable {
    let text: String
    let annotations: [TextAnnotation]
    let fontFamily: String
    let fontSize: Double
    @ObservedObject var controller: ReaderController
    @Binding var focusedAnnotationID: UUID?
    var onCommand: (ReaderCommand) -> Void
    var textAlignment: NSTextAlignment = .natural

    /// Mesma fonte com um trait somado. No macOS isto era NSFontManager.convert.
    static func comTrait(_ f: NSFont, _ t: UIFontDescriptor.SymbolicTraits) -> NSFont {
        guard let d = f.fontDescriptor.withSymbolicTraits(f.fontDescriptor.symbolicTraits.union(t)) else { return f }
        return UIFont(descriptor: d, size: f.pointSize)
    }

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeUIView(context: Context) -> ReaderTextView {
        let storage = NSTextStorage()
        let layoutManager = RoundedBackgroundLayoutManager()
        layoutManager.allowsNonContiguousLayout = false
        let container = NSTextContainer(size: CGSize(width: 0, height: CGFloat.greatestFiniteMagnitude))
        container.widthTracksTextView = true
        storage.addLayoutManager(layoutManager)
        layoutManager.addTextContainer(container)

        // Aqui a UITextView ROLA sozinha (isScrollEnabled fica ligado, ao contrário do
        // MarkableArticleView do Estudo, onde quem rola é o ScrollView do SwiftUI). Some
        // com isso o NSScrollView em volta, e some também o que era só dele:
        // hasVerticalScroller, autohidesScrollers, minSize/maxSize, autoresizingMask e
        // isVerticallyResizable. A busca incremental (usesFindBar) não tem equivalente
        // no iPadOS — a lupa do LEGIS continua fazendo a busca de verdade.
        let textView = ReaderTextView(frame: .zero, textContainer: container)
        textView.isEditable = false
        textView.isSelectable = true
        textView.textContainerInset = UIEdgeInsets(top: 28, left: 40, bottom: 28, right: 40)
        textView.backgroundColor = NSColor(AppTheme.surface)   // folha do tema, não branco do sistema
        textView.alwaysBounceVertical = true
        textView.delegate = context.coordinator
        textView.onCommand = { [weak coordinator = context.coordinator] command in
            coordinator?.parent.onCommand(command)
        }

        controller.textView = textView
        context.coordinator.textView = textView
        applyFullText(to: textView, coordinator: context.coordinator)
        applyAnnotations(to: textView, coordinator: context.coordinator)
        return textView
    }

    func updateUIView(_ textView: ReaderTextView, context: Context) {
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
        let currentWidth = textView.bounds.width   // era o contentSize do NSScrollView
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
            if let descriptor { return UIFont(descriptor: descriptor, size: size) }   // init não-opcional no iPadOS
            return bold ? .boldSystemFont(ofSize: size) : .systemFont(ofSize: size)
        default:
            // Sem NSFontManager no iPadOS: a família vira descriptor e o negrito é trait.
            var desc = UIFontDescriptor(fontAttributes: [.family: fontFamily])
            if bold, let negrito = desc.withSymbolicTraits(.traitBold) { desc = negrito }
            if true {
                return UIFont(descriptor: desc, size: size)
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
            .foregroundColor: NSColor(AppTheme.ink),
            .paragraphStyle: paragraphStyle,
        ])

        // Lei limpa: NÃO destacar cabeçalhos (artigos/títulos/capítulos) em negrito — o texto
        // da lei fica limpo na leitura corrida; os grifos do usuário é que dão o destaque.
        _ = bold  // (mantido pra assinatura de baseFont; sem uso automático)

        textView.textStorage.setAttributedString(attributed)
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
                  let container = textView.textContainer as NSTextContainer? else { return }
            let width = max(1, textView.bounds.width)   // era o contentSize do NSScrollView
            guard width > 1 else { return }
            // Centraliza uma coluna de leitura de ~760pt (em vez do texto de ponta a
            // ponta num monitor largo); o resto vira margem lateral.
            let hInset = max(40, (width - 760) / 2)
            // No iPadOS o inset tem LADOS (UIEdgeInsets), e minSize/maxSize/
            // isVerticallyResizable/autoresizingMask eram do par NSTextView+NSScrollView,
            // que aqui não existe — a UITextView se dimensiona sozinha.
            textView.textContainerInset = UIEdgeInsets(top: 28, left: hInset, bottom: 28, right: hInset)
            let inset = textView.textContainerInset
            container.widthTracksTextView = false
            container.size = CGSize(width: max(1, width - inset.left - inset.right),
                                             height: CGFloat.greatestFiniteMagnitude)
            coordinator.layoutChunk(gen: gen, from: 0, textView: textView, inset: inset)
        }
        coordinator.pendingLayout = start
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.12, execute: start)
    }

    private func applyAnnotations(to textView: ReaderTextView, coordinator: Coordinator) {
        let storage = textView.textStorage
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
            storage.addAttribute(.foregroundColor, value: NSColor(AppTheme.ink), range: clamped)
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
                storage.addAttribute(.font, value: AnnotatedTextView.comTrait(regular, .traitItalic), range: range)
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
    final class Coordinator: NSObject, UITextViewDelegate {
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
        func layoutChunk(gen: Int, from: Int, textView: ReaderTextView, inset: UIEdgeInsets) {
            guard gen == layoutGeneration else { return }
            // layoutManager, textContainer e textStorage não são opcionais no iPadOS.
            let lm = textView.layoutManager
            let container = textView.textContainer
            let storage = textView.textStorage
            let length = storage.length
            let chunk = 40_000   // ~1 quadro de layout por passo
            let end = min(from + chunk, length)
            if from < end {
                let glyphs = lm.glyphRange(forCharacterRange: NSRange(location: from, length: end - from),
                                           actualCharacterRange: nil)
                lm.ensureLayout(forGlyphRange: glyphs)
            }
            let width = max(1, textView.bounds.width)   // era o contentSize do NSScrollView
            // Medir só a altura do trecho JÁ posicionado [0, end]. usedRect(for:)
            // forçaria o layout do container INTEIRO de uma vez (anulando o layout em
            // pedaços e recriando o congelamento das leis grandes). boundingRect força
            // layout só do range pedido — e como [0, end] já está posicionado, ele lê.
            let laidGlyphs = lm.glyphRange(forCharacterRange: NSRange(location: 0, length: end),
                                           actualCharacterRange: nil)
            let laidHeight = lm.boundingRect(forGlyphRange: laidGlyphs, in: container).maxY
            // Sem NSScrollView: a altura mínima é a da própria área visível, e o tamanho
            // do conteúdo é o contentSize da UITextView (que É a scroll view).
            let height = max(ceil(laidHeight + inset.top + inset.bottom), textView.bounds.height)
            if abs(textView.contentSize.height - height) > 0.5 {
                textView.contentSize = CGSize(width: width, height: height)
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
            let range = tv.selectedRange
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
