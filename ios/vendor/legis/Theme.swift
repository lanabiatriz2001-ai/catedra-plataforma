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
    static var rCard: CGFloat  { surfaceRadius }
    static var rInner: CGFloat { compactRadius }
    static var rHero: CGFloat  { ThemeState.t.radius + 6 }
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
    /// Piso e escala da tipografia da interface (F2 do plano do iPhone): nada abaixo de
    /// 11 pt (piso da HIG e da casa) e o valor acompanha o Dynamic Type pela métrica do
    /// `.body`. No tamanho padrão (Large) `scaledValue` devolve o próprio número — o iPad
    /// no tamanho de sempre não muda um pixel; só os rótulos de 8–10,5 pt sobem para 11.
    static func escala(_ size: CGFloat) -> CGFloat {
        UIFontMetrics(forTextStyle: .body).scaledValue(for: max(11, size))
    }
    /// Fonte da INTERFACE (rótulos, botões, ícones): o `.system(size:weight:)` de sempre,
    /// passando pelo piso e pela escala. É por aqui que passa toda a tipografia fixa do
    /// LEGIS; a de leitura (tamanho escolhido no "Aa") continua fora, por decisão da pessoa.
    static func ui(_ size: CGFloat, _ weight: Font.Weight = .regular, design: Font.Design = .default) -> Font {
        .system(size: escala(size), weight: weight, design: design)
    }
    /// Fonte de TÍTULO no padrão da casa: serifada quando o tema do Cátedra é serifado.
    static func displayFont(_ size: CGFloat, _ weight: Font.Weight = .bold) -> Font {
        .system(size: escala(size), weight: weight, design: ThemeState.t.displaySerif ? .serif : .default)
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
    /// Linguagem "vitrine": cada matéria tem identidade de COR própria (pedido da
    /// Lana — o monocromático deixava tudo "sem vida"). Tons vivos, distinguíveis
    /// e legíveis nos dois temas. "Minhas Normas" segue o acento da plataforma.
    var color: Color {
        switch self {
        case .constitucional: return Color(hex: 0x2563EB)   // azul royal
        case .civil:          return Color(hex: 0x0D9488)   // teal
        case .penal:          return Color(hex: 0xE11D48)   // rosé
        case .trabalhista:    return Color(hex: 0xD97706)   // âmbar
        case .previdenciario: return Color(hex: 0xDB2777)   // rosa
        case .tributario:     return Color(hex: 0x7C3AED)   // roxo
        case .empresarial:    return Color(hex: 0x65A30D)   // lima
        case .administrativo: return Color(hex: 0x4F46E5)   // índigo
        case .consumidor:     return Color(hex: 0xEA580C)   // laranja
        case .ambiental:      return Color(hex: 0x16A34A)   // verde
        case .digital:        return Color(hex: 0xC026D3)   // fúcsia
        case .internacional:  return Color(hex: 0x0284C7)   // azul-céu (escurecido p/ contraste AA — igual ao CT_CORES_RAMO da web)
        case .especial:       return Color(hex: 0x64748B)   // grafite
        case .personalizada:  return ThemeState.t.accent
        }
    }

    /// Segunda parada do gradiente da matéria (tom mais claro/vibrante).
    var colorLight: Color {
        switch self {
        case .constitucional: return Color(hex: 0x38BDF8)
        case .civil:          return Color(hex: 0x2DD4BF)
        case .penal:          return Color(hex: 0xFB7185)
        case .trabalhista:    return Color(hex: 0xFBBF24)
        case .previdenciario: return Color(hex: 0xF472B6)
        case .tributario:     return Color(hex: 0xA78BFA)
        case .empresarial:    return Color(hex: 0xA3E635)
        case .administrativo: return Color(hex: 0x818CF8)
        case .consumidor:     return Color(hex: 0xFB923C)
        case .ambiental:      return Color(hex: 0x4ADE80)
        case .digital:        return Color(hex: 0xE879F9)
        case .internacional:  return Color(hex: 0x7DD3FC)
        case .especial:       return Color(hex: 0x94A3B8)
        case .personalizada:  return ThemeState.t.accent.opacity(0.75)
        }
    }

    /// Gradiente pronto da matéria — tiles do Início, faixa da leitura, CTAs.
    var gradStops: [Color] { [color, colorLight] }
}

extension Color {
    /// Cor que muda com o tema claro/escuro (para o app ser alternável).
    static func dynamic(light: UInt32, dark: UInt32) -> Color {
        func ns(_ hex: UInt32) -> NSColor {
            NSColor(red: CGFloat((hex >> 16) & 0xFF) / 255,
                    green: CGFloat((hex >> 8) & 0xFF) / 255,
                    blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
        }
        // No macOS a cor dinâmica vinha de NSColor(name:) consultando a `appearance`;
        // no iPadOS ela nasce do trait collection do ambiente.
        return Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark ? ns(dark) : ns(light)
        })
    }

    /// Gradiente diagonal vibrante da própria cor (base → um pouco mais clara),
    /// usado nas faixas de matéria e nos ícones.
    var vibrantGradient: LinearGradient {
        LinearGradient(colors: [self, blended(withWhite: 0.22)],
                       startPoint: .topLeading, endPoint: .bottomTrailing)
    }

    private func blended(withWhite t: Double) -> Color {
        // UIColor não tem usingColorSpace nem .redComponent: os canais saem por getRed.
        // As três contas ficam em variáveis separadas de propósito — inline, o compilador
        // desiste de inferir os tipos ("unable to type-check in reasonable time").
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        guard NSColor(self).getRed(&r, green: &g, blue: &b, alpha: &a) else { return self }
        let rr = Double(r) + (1 - Double(r)) * t
        let gg = Double(g) + (1 - Double(g)) * t
        let bb = Double(b) + (1 - Double(b)) * t
        return Color(.sRGB, red: rr, green: gg, blue: bb, opacity: 1)
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
                    .overlay(Image(systemName: symbol).font(.system(size: 20, weight: .semibold))
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
                    .font(.system(size: size * 0.46, weight: .semibold))
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
