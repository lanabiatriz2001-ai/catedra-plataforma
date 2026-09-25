import SwiftUI

extension View {
    /// Baixa estimulação: o conteúdo de .sheet vive num controlador de apresentação à parte
    /// e NÃO herda o .transaction das raízes CatedraLegisRoot/CatedraJurisRoot. Quem anima
    /// dentro de uma sheet aplica este modificador no próprio corpo. O JURIS lê o mesmo
    /// ThemeState (os dois vendors compilam num módulo só).
    func semMovimentoSeBaixa() -> some View {
        transaction { tr in if ThemeState.t.baixaEstimulacao { tr.animation = nil; tr.disablesAnimations = true } }
    }
}

enum AppTheme {
    static var surfaceRadius: CGFloat { ThemeState.t.radius }
    static var compactRadius: CGFloat { max(6, ThemeState.t.radius - 3) }
    // Três raios, derivados do `--radius` do Cátedra (pente fino 21/08/2026 — Build C):
    // rCard = cartão/linha, rInner = controles e caixas internas, rHero = hero/paleta/vazios.
    static var rCard: CGFloat  { DSRaio.card }
    static var rInner: CGFloat { DSRaio.interno }
    static var rHero: CGFloat  { DSRaio.hero }
    static let pageInset: CGFloat = 20
    static var pageBackground: Color   { ThemeState.t.bg }
    static var cardBackground: Color   { ThemeState.t.surface }
    static var hairline: Color         { ThemeState.t.border }
    static var ink: Color              { ThemeState.t.ink }
    static var secondaryInk: Color     { ThemeState.t.text2 }
    static var stroke: Color           { ThemeState.t.border }
    static var softStroke: Color       { ThemeState.t.surface2 }
    static var ok: Color               { ThemeState.t.ok }
    static var warn: Color             { ThemeState.t.warn }
    static var danger: Color           { ThemeState.t.danger }
    /// Informativo (azul) — o quarto semântico; e a cor única de "domínio/revisão/SRS"
    /// (antes era `.purple`/`.indigo` solto em cada tela).
    static var info: Color { Color(hex: DSCor.info) }
    static var srs: Color  { Color(hex: DSCor.srs) }
    /// Fonte de TÍTULO: a família de display da direção ativa (base visual comum).
    static func displayFont(_ size: CGFloat, _ weight: Font.Weight = .bold) -> Font {
        DS.display(size, weight)
    }
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
    /// Ramo da tabela única (ios/vendor/design/CoresAcervo.swift). "Minhas Normas" não tem
    /// ramo: segue o acento da plataforma.
    var ramo: Ramo? {
        switch self {
        case .constitucional: return .constitucional
        case .civil:          return .civil
        case .penal:          return .penal
        case .trabalhista:    return .trabalho
        case .previdenciario: return .previdenciario
        case .tributario:     return .tributario
        case .empresarial:    return .empresarial
        case .administrativo: return .administrativo
        case .consumidor:     return .consumidor
        case .ambiental:      return .ambiental
        case .digital:        return .digital
        case .internacional:  return .internacional
        case .especial:       return .especial
        case .personalizada:  return nil
        }
    }

    /// Linguagem "vitrine": cada matéria tem identidade de COR própria.
    var color: Color { ramo.map { Color(hex: $0.identidade) } ?? ThemeState.t.accent }

    /// Segunda parada do gradiente da matéria (tom mais claro/vibrante).
    var colorLight: Color { ramo.map { Color(hex: $0.clara) } ?? ThemeState.t.accent.opacity(0.75) }

    /// Gradiente pronto da matéria — tiles do Início, faixa da leitura, CTAs.
    var gradStops: [Color] { [color, colorLight] }
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

}

/// Faixa colorida de matéria (contexto em caixa alta + título grande em branco)
/// sobre o gradiente vibrante da área — o cabeçalho-assinatura do novo design.
struct MateriaBanner: View {
    let context: String?
    let title: String
    let color: Color
    var symbol: String? = nil
    /// Controles à direita (ex.: seletor Estudo/Leitura corrida do leitor).
    var trailing: AnyView? = nil
    /// `false` = só o conteúdo, sem a moldura própria (quando já vive dentro de um card).
    var framed: Bool = true

    var body: some View {
        HStack(alignment: .top, spacing: 13) {
            if let symbol {
                RoundedRectangle(cornerRadius: AppTheme.rCard, style: .continuous)
                    .fill(LinearGradient(colors: [color, color.opacity(0.72)],
                                         startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: 48, height: 48)
                    .overlay(Image(systemName: symbol).font(DS.interface(20, .semibold))
                        .foregroundStyle(.white))
                    .shadow(color: color.opacity(0.4), radius: 8, y: 4)
            }
            VStack(alignment: .leading, spacing: 3) {
                if let context, !context.isEmpty {
                    Text(context.uppercased())
                        .font(.caption2.weight(.bold)).tracking(0.9)
                        .foregroundStyle(color)
                        .lineLimit(1)
                }
                Text(title)
                    .font(AppTheme.displayFont(24, .bold))
                    .foregroundStyle(AppTheme.ink)
                    .lineLimit(2)
            }
            Spacer(minLength: 0)
            if let trailing { trailing }
        }
        .padding(.horizontal, framed ? 18 : 0)
        .padding(.vertical, framed ? 15 : 0)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: AppTheme.rCard, style: .continuous)
                .fill(framed ? AppTheme.cardBackground : Color.clear)
        )
        .overlay(
            RoundedRectangle(cornerRadius: AppTheme.rCard, style: .continuous)
                .strokeBorder(framed ? AppTheme.hairline : Color.clear, lineWidth: 1)
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
                    .font(DS.interface(size * 0.46, .semibold))
                    .foregroundStyle(color)
            )
    }
}

/// Etiqueta pequena de status (chips das listas) — açúcar sobre `LegisChip`
/// (LegisComponents.swift): `filled` = .soft, `filled: false` = .ghost.
struct Chip: View {
    let text: String
    let symbol: String
    let color: Color
    var filled: Bool = true

    var body: some View {
        LegisChip(text, icon: symbol, tint: color, variant: filled ? .soft : .ghost)
    }
}
