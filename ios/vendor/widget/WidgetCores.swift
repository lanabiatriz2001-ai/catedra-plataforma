import Foundation

struct WidgetRGB: Equatable { var r: Double; var g: Double; var b: Double }

/// Contraste WCAG e as cores dos widgets. Regra da casa: texto ≥ 4,5:1. Sobre gradiente o texto é BRANCO PURO e as
/// duas pontas do gradiente escurecem (mistura com preto em passos de 5 %) até o branco passar. A cor da matéria vem
/// do app (CT_CORES_RAMO, resolvida em _widgetResumo); aqui ela só é ajustada.
enum WidgetCores {
    static let branco = WidgetRGB(r: 1, g: 1, b: 1)
    static let preto = WidgetRGB(r: 0, g: 0, b: 0)
    /// Fundo escuro do sistema nos widgets (systemBackground escuro ≈ #1C1C1E).
    static let fundoEscuro = WidgetRGB(r: 28.0 / 255, g: 28.0 / 255, b: 30.0 / 255)
    static let padrao = "#0f7a57"
    static let minimo = 4.5

    static func hex(_ s: String) -> WidgetRGB? {
        var t = s.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard t.hasPrefix("#") else { return nil }
        t.removeFirst()
        if t.count == 3 { t = t.map { "\($0)\($0)" }.joined() }
        guard t.count == 6, let v = UInt32(t, radix: 16) else { return nil }
        return WidgetRGB(r: Double((v >> 16) & 0xff) / 255, g: Double((v >> 8) & 0xff) / 255, b: Double(v & 0xff) / 255)
    }
    static func hex(_ c: WidgetRGB) -> String {
        func h(_ x: Double) -> Int { Int((min(1, max(0, x)) * 255).rounded()) }
        return String(format: "#%02x%02x%02x", h(c.r), h(c.g), h(c.b))
    }
    static func luminancia(_ c: WidgetRGB) -> Double {
        func lin(_ x: Double) -> Double { x <= 0.03928 ? x / 12.92 : pow((x + 0.055) / 1.055, 2.4) }
        return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
    }
    static func contraste(_ a: WidgetRGB, _ b: WidgetRGB) -> Double {
        let la = luminancia(a), lb = luminancia(b)
        return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)
    }
    static func misturar(_ a: WidgetRGB, _ b: WidgetRGB, _ t: Double) -> WidgetRGB {
        WidgetRGB(r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t)
    }
    /// Mistura `c` com `com` em passos de 5 % até o contraste contra `alvo` passar de `minimo`.
    static func ajustar(_ c: WidgetRGB, com: WidgetRGB, contra alvo: WidgetRGB, minimo m: Double = minimo) -> WidgetRGB {
        var t = 0.0, x = c
        while contraste(x, alvo) < m && t < 1 { t = min(1, t + 0.05); x = misturar(c, com, t) }
        return x
    }
    /// Gradiente da matéria (do topo à base), as duas pontas com branco ≥ 4,5:1.
    static func gradienteMateria(_ cor: String) -> [WidgetRGB] {
        let base = hex(cor) ?? hex(padrao)!
        let a = ajustar(base, com: preto, contra: branco)
        let b = ajustar(misturar(a, preto, 0.22), com: preto, contra: branco)
        return [a, b]
    }
    /// Gradiente do tema escolhido no app (paradas do --heroGrad + accent), as duas pontas com branco ≥ 4,5:1.
    static func gradienteTema(_ grad: [String], accent: String) -> [WidgetRGB] {
        var paradas = grad.compactMap { hex($0) }
        if paradas.isEmpty { paradas = [hex(accent) ?? hex(padrao)!] }
        let a = paradas.first!
        let b = paradas.count > 1 ? paradas.last! : misturar(a, preto, 0.25)
        return [ajustar(a, com: preto, contra: branco), ajustar(b, com: preto, contra: branco)]
    }
    /// A cor da matéria como TEXTO: escurecida sobre fundo claro, clareada sobre o fundo escuro do sistema.
    static func textoSobreClaro(_ cor: String) -> WidgetRGB { ajustar(hex(cor) ?? hex(padrao)!, com: preto, contra: branco) }
    static func textoSobreEscuro(_ cor: String) -> WidgetRGB { ajustar(hex(cor) ?? hex(padrao)!, com: branco, contra: fundoEscuro) }
}
