import SwiftUI

/// Tema ESPELHADO do Cátedra: os tokens são lidos das variáveis CSS já computadas
/// do WebView do Cátedra (`--bg`, `--surface`, `--border`, `--ink`, `--accent`,
/// `--sbg`, `--radius`, `--heroGrad`…) em `main.swift` e injetados aqui. Assim o
/// CátedraLEGIS herda EXATAMENTE a identidade visual atual do Cátedra (tema/dir/
/// acento/claro-escuro) — e muda junto quando a Lana troca nos Ajustes do Cátedra.
struct CatedraTheme {
    var bg: Color, surface: Color, surface2: Color, border: Color
    var ink: Color, text2: Color, text3: Color
    var accent: Color, accentD: Color
    var radius: CGFloat
    var sidebarBg: Color, sidebarText: Color, sidebarActiveBg: Color, sidebarActiveText: Color
    var heroStops: [Color]
    var isDark: Bool

    // Fallback (tema "clean" do Cátedra, claro, acento azul-royal) até a leitura chegar.
    static let fallback = CatedraTheme(
        bg: Color(hex: 0xF7F7F9), surface: Color(hex: 0xFFFFFF), surface2: Color(hex: 0xF5F5F5), border: Color(hex: 0xECECEC),
        ink: Color(hex: 0x18181B), text2: Color(hex: 0x52525B), text3: Color(hex: 0x74747A),
        accent: Color(hex: 0x4263EB), accentD: Color(hex: 0x2F49C0), radius: 12,
        sidebarBg: Color(hex: 0x14192B), sidebarText: Color(hex: 0xB8C0D8),
        sidebarActiveBg: Color.white.opacity(0.13), sidebarActiveText: Color(hex: 0xFFFFFF),
        heroStops: [Color(hex: 0x4263EB), Color(hex: 0x2F49C0)], isDark: false)
}

/// Estado global do tema (mutável; `main.swift` atualiza antes de montar/rebuild o host).
enum ThemeState {
    static var t = CatedraTheme.fallback
}

enum AppTheme {
    static var surfaceRadius: CGFloat { ThemeState.t.radius }
    static var compactRadius: CGFloat { max(6, ThemeState.t.radius - 3) }
    static let pageInset: CGFloat = 20
    static var pageBackground: Color   { ThemeState.t.bg }
    static var cardBackground: Color   { ThemeState.t.surface }
    static var hairline: Color         { ThemeState.t.border }
    static var ink: Color              { ThemeState.t.ink }
    static var secondaryInk: Color     { ThemeState.t.text2 }
    static var stroke: Color           { ThemeState.t.border }
    static var softStroke: Color       { ThemeState.t.surface2 }
    static var surface: Color          { ThemeState.t.surface }
    static var elevatedSurface: Color  { ThemeState.t.surface }

    /// Fundo da página: liso, na cor de fundo do Cátedra.
    static func pageBackdrop(_ accent: Color) -> some View {
        ThemeState.t.bg.ignoresSafeArea()
    }
}

struct SurfaceCard<Content: View>: View {
    var padding: CGFloat = 14
    var accent: Color? = nil
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .appSurface(accent: accent)
    }
}

struct AccentCallout<Content: View>: View {
    let symbol: String
    let color: Color
    @ViewBuilder var content: Content

    var body: some View {
        HStack(spacing: 12) {
            IconBubble(symbol: symbol, color: color, size: 40)
            content
            Spacer(minLength: 0)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: AppTheme.surfaceRadius, style: .continuous)
                .fill(color.opacity(0.08))
                .overlay(
                    RoundedRectangle(cornerRadius: AppTheme.surfaceRadius, style: .continuous)
                        .stroke(color.opacity(0.22), lineWidth: 1)
                )
        )
    }
}

struct SectionTitle: View {
    let title: String
    let symbol: String
    var color: Color? = nil

    var body: some View {
        Label(title, systemImage: symbol)
            .font(.headline.weight(.semibold))
            .foregroundStyle(color ?? .primary)
    }
}

extension View {
    /// Cartão Cátedra clean: fundo branco chapado + borda hairline + sombra bem sutil.
    func appSurface(accent: Color? = nil) -> some View {
        let radius = AppTheme.surfaceRadius
        return background(
            RoundedRectangle(cornerRadius: radius, style: .continuous)
                .fill(AppTheme.cardBackground)
        )
        .overlay(
            RoundedRectangle(cornerRadius: radius, style: .continuous)
                .strokeBorder(AppTheme.hairline, lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.045), radius: 6, y: 2)
    }

    /// Cartão clean com um toque da cor da matéria (leve tinta + borda colorida discreta).
    func appTintedSurface(_ color: Color) -> some View {
        let radius = AppTheme.surfaceRadius
        return background(
            RoundedRectangle(cornerRadius: radius, style: .continuous)
                .fill(AppTheme.cardBackground)
        )
        .overlay(
            RoundedRectangle(cornerRadius: radius, style: .continuous)
                .fill(color.opacity(0.05))
        )
        .overlay(
            RoundedRectangle(cornerRadius: radius, style: .continuous)
                .strokeBorder(color.opacity(0.30), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.045), radius: 6, y: 2)
    }
}

extension LawCategory {
    /// Monocromático: todas as matérias usam o acento do Cátedra (identidade única,
    /// como o Cátedra que é azul em tudo). A distinção fica no ícone/nome, não na cor.
    var color: Color { ThemeState.t.accent }
}

extension Color {
    /// Cor que muda com o tema claro/escuro (para o app ser alternável).
    static func dynamic(light: UInt32, dark: UInt32) -> Color {
        func ns(_ hex: UInt32) -> NSColor {
            NSColor(srgbRed: CGFloat((hex >> 16) & 0xFF) / 255,
                    green: CGFloat((hex >> 8) & 0xFF) / 255,
                    blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
        }
        return Color(nsColor: NSColor(name: nil) { appearance in
            appearance.bestMatch(from: [.aqua, .darkAqua]) == .darkAqua ? ns(dark) : ns(light)
        })
    }

    /// Cor a partir de um inteiro hexadecimal (0xRRGGBB).
    init(hex: UInt32) {
        self.init(.sRGB,
                  red: Double((hex >> 16) & 0xFF) / 255,
                  green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255,
                  opacity: 1)
    }

    /// Gradiente diagonal vibrante da própria cor (base → um pouco mais clara),
    /// usado nas faixas de matéria e nos ícones.
    var vibrantGradient: LinearGradient {
        LinearGradient(colors: [self, blended(withWhite: 0.22)],
                       startPoint: .topLeading, endPoint: .bottomTrailing)
    }

    private func blended(withWhite t: Double) -> Color {
        let n = NSColor(self).usingColorSpace(.sRGB) ?? .gray
        return Color(.sRGB,
                     red: Double(n.redComponent) + (1 - Double(n.redComponent)) * t,
                     green: Double(n.greenComponent) + (1 - Double(n.greenComponent)) * t,
                     blue: Double(n.blueComponent) + (1 - Double(n.blueComponent)) * t,
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
}

/// Faixa colorida de matéria (contexto em caixa alta + título grande em branco)
/// sobre o gradiente vibrante da área — o cabeçalho-assinatura do novo design.
struct MateriaBanner: View {
    let context: String?
    let title: String
    let color: Color
    var symbol: String? = nil

    var body: some View {
        HStack(spacing: 13) {
            if let symbol {
                IconBubble(symbol: symbol, color: color, size: 46)
            }
            VStack(alignment: .leading, spacing: 3) {
                if let context, !context.isEmpty {
                    Text(context.uppercased())
                        .font(.caption2.weight(.bold)).tracking(0.9)
                        .foregroundStyle(color)
                        .lineLimit(1)
                }
                Text(title)
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(AppTheme.ink)
                    .lineLimit(2)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 15)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: AppTheme.surfaceRadius, style: .continuous)
                .fill(AppTheme.cardBackground)
        )
        .overlay(
            RoundedRectangle(cornerRadius: AppTheme.surfaceRadius, style: .continuous)
                .strokeBorder(AppTheme.hairline, lineWidth: 1)
        )
    }
}

/// Matérias criadas pela usuária também usam o acento do Cátedra (monocromático).
enum CustomCategoryStyle {
    static func color(for name: String) -> Color { ThemeState.t.accent }
}

/// Ícone em "bolha" colorida, usado nas listas.
struct IconBubble: View {
    let symbol: String
    let color: Color
    var size: CGFloat = 30

    var body: some View {
        RoundedRectangle(cornerRadius: size * 0.30, style: .continuous)
            .fill(color.opacity(0.14))
            .frame(width: size, height: size)
            .overlay(
                Image(systemName: symbol)
                    .font(.system(size: size * 0.46, weight: .semibold))
                    .foregroundStyle(color)
            )
    }
}

/// Etiqueta pequena de status (chips das listas).
/// `filled` (padrão) desenha a cápsula colorida — bom para o que exige atenção
/// (ex.: "Não baixada"). Com `filled: false` o chip fica discreto (só ícone+texto
/// na cor `color`, sem cápsula) para não poluir a linha da norma. Em ambos os
/// casos o texto respeita `color`; passe `.secondary` para um cinza neutro.
struct Chip: View {
    let text: String
    let symbol: String
    let color: Color
    var filled: Bool = true

    var body: some View {
        Label(text, systemImage: symbol)
            .font(.caption2.weight(filled ? .semibold : .regular))
            .padding(.horizontal, filled ? 7 : 0)
            .padding(.vertical, filled ? 3 : 0)
            .background(filled ? AnyView(RoundedRectangle(cornerRadius: 6, style: .continuous).fill(color.opacity(0.12))) : AnyView(Color.clear))
            .foregroundStyle(color)
    }
}

/// Cartão do painel inicial.
struct StatCard: View {
    let title: String
    let value: String
    let symbol: String
    let color: Color
    var detail: String? = nil

    var body: some View {
        SurfaceCard(accent: color) {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    IconBubble(symbol: symbol, color: color, size: 34)
                    Spacer()
                }
                Text(value)
                    .font(.system(size: 30, weight: .semibold, design: .rounded))
                    .foregroundStyle(.primary)
                    .monospacedDigit()
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.callout.weight(.medium))
                        .foregroundStyle(.primary)
                    if let detail {
                        Text(detail)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }
}
