import SwiftUI

/// Tema ESPELHADO do Cátedra (base visual comum — LEGIS e JURIS, Mac e iPad).
/// Os tokens são lidos das variáveis CSS computadas do WebView (`--bg`, `--surface`,
/// `--border`, `--ink`, `--accent`, `--sbg`, `--radius`, `--heroGrad`…) pela ponte de tema
/// em `main.swift` e gravados em `ThemeState.t`. Mora em ios/vendor/design: o iPad e o
/// Xcode Cloud compilam ios/vendor inteiro, e o mac/build-app.sh inclui esta pasta —
/// um arquivo só, dois alvos.
struct CatedraTheme {
    var bg: Color, surface: Color, surface2: Color, border: Color
    var ink: Color, text2: Color, text3: Color
    var accent: Color, accentD: Color
    var radius: CGFloat
    var sidebarBg: Color, sidebarText: Color, sidebarActiveBg: Color, sidebarActiveText: Color
    var heroStops: [Color]
    var isDark: Bool
    // Semânticos e display espelhados do Cátedra (21/08/2026 — unificação visual)
    var ok: Color = Color(hex: 0x0E7F58)
    var warn: Color = Color(hex: 0xA36306)
    var danger: Color = Color(hex: 0xC0392F)
    var displaySerif: Bool = true
    /// Modo "Baixa estimulação" (P16), lido de prefs.baixaEstimulacao do Cátedra pela ponte
    /// em main.swift. Ligado: a gamificação nativa (ofensiva, sequência, 🎉) some das telas
    /// e as animações do SwiftUI são desligadas na raiz dos hosts. Os dados não mudam.
    var baixaEstimulacao: Bool = false

    /// Superfície atual em 0xRRGGBB — é contra ela que a cor-texto de ramo é calculada.
    /// A ponte grava a partir de `--surface`; o padrão é a superfície da Planilha.
    var surfaceHex: UInt32 = 0xFFFDF8
    /// Família de display da direção ativa (Spectral, Inter Tight, Space Grotesk ou
    /// JetBrains Mono), lida de `--display` pela ponte. Padrão: a identidade Planilha.
    var displayFamilia: String = "Spectral"

    // Fallback = identidade PLANILHA (a aprovada): a 1ª pintura já nasce com a cara da casa.
    static let fallback = CatedraTheme(
        bg: Color(hex: 0xF4F1EA), surface: Color(hex: 0xFFFDF8), surface2: Color(hex: 0xF0ECE1), border: Color(hex: 0xE3DDCE),
        ink: Color(hex: 0x1F1C17), text2: Color(hex: 0x5C564A), text3: Color(hex: 0x7A7368),
        accent: Color(hex: 0x0F7A57), accentD: Color(hex: 0x0B5E43), radius: 12,
        sidebarBg: Color(hex: 0x1E2B3A), sidebarText: Color(hex: 0xB9C3CF),
        sidebarActiveBg: Color(hex: 0x7FD4B5).opacity(0.18), sidebarActiveText: Color(hex: 0x7FD4B5),
        heroStops: [Color(hex: 0x1E2B3A), Color(hex: 0x0F7A57)], isDark: false)
}

/// Estado global do tema (mutável; `main.swift` atualiza antes de montar/rebuild o host).
enum ThemeState {
    static var t = CatedraTheme.fallback
}

extension Color {
    /// Cor a partir de um inteiro hexadecimal (0xRRGGBB).
    init(hex: UInt32) {
        self.init(.sRGB,
                  red: Double((hex >> 16) & 0xFF) / 255,
                  green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255,
                  opacity: 1)
    }

    /// Cor a partir de um valor CSS ("#rgb", "#rrggbb", "rgb(r,g,b)", "rgba(r,g,b,a)").
    /// Usado para importar as variáveis já computadas do tema do Cátedra.
    init?(css raw: String) {
        var s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.isEmpty { return nil }
        if s.hasPrefix("#") {
            s.removeFirst()
            if s.count == 3 { s = s.map { "\($0)\($0)" }.joined() }
            guard s.count == 6, let v = UInt32(s, radix: 16) else { return nil }
            self.init(hex: v); return
        }
        if s.hasPrefix("rgb") {
            guard let open = s.firstIndex(of: "("), let close = s.firstIndex(of: ")") else { return nil }
            let parts = s[s.index(after: open)..<close].split(separator: ",")
                .map { $0.trimmingCharacters(in: .whitespaces) }
            guard parts.count >= 3, let r = Double(parts[0]), let g = Double(parts[1]), let b = Double(parts[2])
            else { return nil }
            let a = parts.count >= 4 ? (Double(parts[3]) ?? 1) : 1
            self.init(.sRGB, red: r/255, green: g/255, blue: b/255, opacity: a); return
        }
        return nil
    }

    /// O mesmo parse de `init?(css:)`, mas devolvendo 0xRRGGBB — para a matemática de
    /// contraste, que trabalha em inteiros. Transparente (alfa 0) não diz nada: nil.
    static func hexDe(css raw: String) -> UInt32? {
        var s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.isEmpty { return nil }
        if s.hasPrefix("#") {
            s.removeFirst()
            if s.count == 3 { s = s.map { "\($0)\($0)" }.joined() }
            guard s.count == 6, let v = UInt32(s, radix: 16) else { return nil }
            return v
        }
        guard s.hasPrefix("rgb"), let open = s.firstIndex(of: "("), let close = s.firstIndex(of: ")")
        else { return nil }
        let partes = s[s.index(after: open)..<close].split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
        guard partes.count >= 3, let r = Double(partes[0]), let g = Double(partes[1]), let b = Double(partes[2])
        else { return nil }
        if partes.count >= 4, let a = Double(partes[3]), a == 0 { return nil }
        func c(_ x: Double) -> UInt32 { UInt32(max(0, min(255, x.rounded()))) }
        return (c(r) << 16) | (c(g) << 8) | c(b)
    }
}
