import UIKit

/// Seletor de produto da barra do topo (Cátedra | LEGIS | JURIS), desenhado pelo próprio app.
/// Substitui o UISegmentedControl: o iOS 27 ignora selectedSegmentTintColor e pinta uma pílula
/// clara própria, mas respeita a cor do texto — o acento sumia e "JURIS" ficava branco sobre
/// cinza. Aqui a pílula é SEMPRE o acento do tema e o texto sobre ela é o --onAccent (ou o
/// contraste decide), igual no iOS 17, 26 e 27.
/// Expõe só o pedaço da API do UISegmentedControl que a casca usa, para o resto do main.swift
/// não mudar: selectedSegmentIndex, numberOfSegments, titleForSegment(at:),
/// removeAllSegments(), insertSegment(withTitle:at:animated:), sizeToFit() e .valueChanged.
/// Mudar a seleção por código NÃO dispara .valueChanged — como no UISegmentedControl.
final class SeletorProduto: UIControl {
    private var botoes: [UIButton] = []
    private let trilho = UIView()
    private let pilula = UIView()
    private let fonteSel = UIFont.systemFont(ofSize: 13, weight: .semibold)
    private let fonteNormal = UIFont.systemFont(ofSize: 13, weight: .medium)
    private var corTexto = UIColor.label
    private var corSobreAcento = UIColor.white
    private static let folga: CGFloat = 14          // de cada lado do título
    private static let alturaPilula: CGFloat = 32
    private static let altura: CGFloat = 44         // alvo de toque da casa: o botão tem a altura toda

    /// Herdada do UISegmentedControl; aqui a largura de cada segmento já é sempre pelo conteúdo.
    var apportionsSegmentWidthsByContent = true

    private var sel = -1
    var selectedSegmentIndex: Int {
        get { sel }
        set { sel = botoes.indices.contains(newValue) ? newValue : -1; atualizarSelecao(animado: false) }
    }
    var numberOfSegments: Int { botoes.count }

    init(items: [String]) {
        super.init(frame: .zero)
        for v in [trilho, pilula] {
            v.isUserInteractionEnabled = false
            v.layer.cornerCurve = .continuous
            addSubview(v)
        }
        for (i, t) in items.enumerated() { insertSegment(withTitle: t, at: i, animated: false) }
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) não é usado") }

    func titleForSegment(at i: Int) -> String? {
        botoes.indices.contains(i) ? botoes[i].title(for: .normal) : nil
    }

    func removeAllSegments() {
        botoes.forEach { $0.removeFromSuperview() }
        botoes = []
        sel = -1
        atualizarSelecao(animado: false)
        invalidateIntrinsicContentSize()
    }

    func insertSegment(withTitle titulo: String, at i: Int, animated: Bool) {
        let b = UIButton(type: .custom)
        b.setTitle(titulo, for: .normal)
        b.titleLabel?.font = fonteNormal
        b.titleLabel?.adjustsFontSizeToFitWidth = true   // se a barra der menos espaço que o ideal
        b.titleLabel?.minimumScaleFactor = 0.8
        b.accessibilityLabel = titulo
        b.addTarget(self, action: #selector(tocou(_:)), for: .touchUpInside)
        let pos = min(max(i, 0), botoes.count)
        botoes.insert(b, at: pos)
        addSubview(b)
        if sel >= pos { sel += 1 }
        atualizarSelecao(animado: false)
        invalidateIntrinsicContentSize()
        setNeedsLayout()
    }

    /// Cores do tema, chamada por aplicarAparenciaHost a cada troca de tema.
    /// A pílula é o acento AJUSTADO até o texto sobre ela alcançar 4,5:1 (regra da casa): com o
    /// magenta padrão, branco sobre acento media 4,01:1 na captura do simulador. Escurecer (ou
    /// clarear, se a letra for escura) mantém a identidade da cor; trocar a letra, não.
    func aplicarCores(fundo: UIColor, acento: UIColor, sobreAcento: UIColor, texto: UIColor) {
        trilho.backgroundColor = fundo
        pilula.backgroundColor = Self.ajustadaPara(contraste: 4.5, fundo: acento, texto: sobreAcento)
        corSobreAcento = sobreAcento
        corTexto = texto
        atualizarSelecao(animado: false)
    }

    /// Luminância relativa da WCAG.
    static func luminancia(_ c: UIColor) -> CGFloat {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        c.getRed(&r, green: &g, blue: &b, alpha: &a)
        func f(_ v: CGFloat) -> CGFloat { v <= 0.03928 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4) }
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }

    static func contraste(_ a: UIColor, _ b: UIColor) -> CGFloat {
        let la = luminancia(a), lb = luminancia(b)
        return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)
    }

    /// Escurece ou clareia o fundo em passos de 4 % até o texto alcançar o contraste pedido.
    /// O sentido é o que AFASTA do texto: letra clara → fundo mais escuro, e vice-versa.
    static func ajustadaPara(contraste alvo: CGFloat, fundo: UIColor, texto: UIColor) -> UIColor {
        guard contraste(fundo, texto) < alvo else { return fundo }
        let escurecer = luminancia(texto) > luminancia(fundo)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        guard fundo.getRed(&r, green: &g, blue: &b, alpha: &a) else { return fundo }
        var cor = fundo
        for _ in 0..<30 {
            if escurecer { r *= 0.96; g *= 0.96; b *= 0.96 }
            else { r += (1 - r) * 0.04; g += (1 - g) * 0.04; b += (1 - b) * 0.04 }
            cor = UIColor(red: r, green: g, blue: b, alpha: a)
            if contraste(cor, texto) >= alvo { break }
        }
        return cor
    }

    @objc private func tocou(_ b: UIButton) {
        guard let i = botoes.firstIndex(of: b), i != sel else { return }
        sel = i
        atualizarSelecao(animado: !UIAccessibility.isReduceMotionEnabled)
        sendActions(for: .valueChanged)
    }

    private func larguraIdeal(_ b: UIButton) -> CGFloat {
        let t = (b.title(for: .normal) ?? "") as NSString
        return ceil(t.size(withAttributes: [.font: fonteSel]).width) + 2 * Self.folga
    }

    override var intrinsicContentSize: CGSize {
        CGSize(width: botoes.reduce(0) { $0 + larguraIdeal($1) } + 4, height: Self.altura)
    }
    override func sizeThatFits(_ size: CGSize) -> CGSize { intrinsicContentSize }

    override func layoutSubviews() {
        super.layoutSubviews()
        let total = botoes.reduce(0) { $0 + larguraIdeal($1) }
        // A barra pode dar menos que o ideal (iPhone SE, Slide Over): encolhe por igual.
        let escala = total > 0 && bounds.width - 4 < total ? max(bounds.width - 4, 0) / total : 1
        var x = (bounds.width - total * escala) / 2
        let alturaTrilho = Self.alturaPilula + 4
        trilho.frame = CGRect(x: x - 2, y: (bounds.height - alturaTrilho) / 2,
                              width: total * escala + 4, height: alturaTrilho)
        trilho.layer.cornerRadius = alturaTrilho / 2
        for b in botoes {
            let w = larguraIdeal(b) * escala
            b.frame = CGRect(x: x, y: 0, width: w, height: bounds.height)
            x += w
        }
        posicionarPilula()
    }

    private func posicionarPilula() {
        guard botoes.indices.contains(sel) else { pilula.isHidden = true; return }
        pilula.isHidden = false
        let f = botoes[sel].frame
        pilula.frame = CGRect(x: f.minX, y: (bounds.height - Self.alturaPilula) / 2,
                              width: f.width, height: Self.alturaPilula)
        pilula.layer.cornerRadius = Self.alturaPilula / 2
    }

    private func atualizarSelecao(animado: Bool) {
        for (i, b) in botoes.enumerated() {
            let escolhido = i == sel
            b.setTitleColor(escolhido ? corSobreAcento : corTexto, for: .normal)
            b.titleLabel?.font = escolhido ? fonteSel : fonteNormal
            b.accessibilityTraits = escolhido ? [.button, .selected] : [.button]
        }
        if animado {
            UIView.animate(withDuration: 0.22, delay: 0, options: [.curveEaseOut, .beginFromCurrentState]) {
                self.posicionarPilula()
            }
        } else {
            posicionarPilula()
        }
    }
}
