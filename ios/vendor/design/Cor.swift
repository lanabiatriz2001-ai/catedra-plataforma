import SwiftUI

/// Matemática de cor da base visual, em inteiros 0xRRGGBB — testável sem tela.
/// A cor-texto repete o passo do host (`_corTx` no Catedra.dc.html, conferido também por
/// scripts/verificar-cores-texto.mjs): escurece (claro) ou clareia (escuro) em passos de 3 %
/// até 4,5:1 sobre a superfície, com teto de 85 %. Cor-identidade ≠ cor-texto (DESIGN.md).
enum DSCor {
    /// Informativo e revisão espaçada — os dois semânticos que o host não publica como
    /// variável CSS. Moram aqui para não haver hex fora da base.
    static let info: UInt32 = 0x2563EB
    static let srs: UInt32 = 0x7C3AED
    /// Número de julgados na margem do leitor: o text3 da Planilha, passado por `texto(…)`.
    static let sinalMargem: UInt32 = 0x6F695F

    static func canais(_ h: UInt32) -> (Double, Double, Double) {
        (Double((h >> 16) & 0xFF), Double((h >> 8) & 0xFF), Double(h & 0xFF))
    }
    static func hex(_ r: Double, _ g: Double, _ b: Double) -> UInt32 {
        func c(_ x: Double) -> UInt32 { UInt32(max(0, min(255, x.rounded()))) }
        return (c(r) << 16) | (c(g) << 8) | c(b)
    }
    static func luminancia(_ h: UInt32) -> Double {
        let (r, g, b) = canais(h)
        func lin(_ v: Double) -> Double { let x = v / 255; return x <= 0.03928 ? x / 12.92 : pow((x + 0.055) / 1.055, 2.4) }
        return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    }
    static func contraste(_ a: UInt32, _ b: UInt32) -> Double {
        let x = luminancia(a), y = luminancia(b)
        return (max(x, y) + 0.05) / (min(x, y) + 0.05)
    }
    static func escurecer(_ h: UInt32, _ f: Double) -> UInt32 {
        let (r, g, b) = canais(h); return hex(r * (1 - f), g * (1 - f), b * (1 - f))
    }
    static func clarear(_ h: UInt32, _ f: Double) -> UInt32 {
        let (r, g, b) = canais(h); return hex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f)
    }
    static func texto(identidade: UInt32, superficie: UInt32, escuro: Bool) -> UInt32 {
        var f = 0.0, saida = identidade
        while f < 0.85 && contraste(saida, superficie) < 4.5 {
            f += 0.03
            saida = escuro ? clarear(identidade, f) : escurecer(identidade, f)
        }
        return saida
    }
}

/// Fachada da base visual. Tipografia (Tipografia.swift) entra por `extension DS`.
enum DS {
    /// Cor de identidade (ramo, tribunal) pronta para virar TEXTO no tema atual.
    static func corTexto(_ identidade: UInt32) -> Color {
        Color(hex: DSCor.texto(identidade: identidade, superficie: ThemeState.t.surfaceHex,
                               escuro: ThemeState.t.isDark))
    }
    /// Cor do número de julgados na margem do leitor, legível no tema atual.
    static var corSinalMargem: Color { corTexto(DSCor.sinalMargem) }
}
