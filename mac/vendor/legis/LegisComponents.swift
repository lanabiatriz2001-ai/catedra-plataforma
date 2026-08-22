import SwiftUI

// =====================================================================================
//  CátedraLEGIS — COMPONENTES COMPARTILHADOS (pente fino 21/08/2026, Build C).
//
//  Antes havia 6 receitas de cartão, 5 de chip, 4 de cabeçalho de seção e 3 de botão
//  primário espalhadas pelas telas. Aqui vive UMA de cada; as telas só consomem.
//  Nomes prefixados com `Legis` porque o módulo é PLANO (LEGIS + JURIS + host num só).
// =====================================================================================

// MARK: - Tipografia numérica

// `Typo.num` vive em vendor/juris/Design/JurisTheme.swift (módulo plano: uma definição só).

// MARK: - Fonte de leitura (respeita os Ajustes do leitor fora do leitor)

extension AppTheme {
    /// A mesma família/tamanho que o leitor usa (`readerFontFamily`/`readerFontSize`),
    /// para o Simulado e a Prova oral não ignorarem a escolha da usuária.
    static func readerFont(size: Double, family: String, weight: Font.Weight = .regular) -> Font {
        switch family {
        case "Sistema":          return .system(size: size, weight: weight, design: .default)
        case "Sistema (Serifa)": return .system(size: size, weight: weight, design: .serif)
        default:                 return Font.custom(family, size: size).weight(weight)
        }
    }
}

// MARK: - Chip (etiqueta) e chip de filtro

/// Etiqueta pequena em cápsula. `filled` = cápsula na cor (atenção), `soft` = tinta
/// clara (padrão das listas), `ghost` = só texto na cor (discreto).
struct LegisChip: View {
    enum Variant { case filled, soft, ghost }
    let text: String
    var icon: String? = nil
    var tint: Color = ThemeState.t.accent
    var variant: Variant = .soft
    var size: CGFloat = 10.5

    init(_ text: String, icon: String? = nil, tint: Color = ThemeState.t.accent,
         variant: Variant = .soft, size: CGFloat = 10.5) {
        self.text = text; self.icon = icon; self.tint = tint; self.variant = variant; self.size = size
    }

    var body: some View {
        HStack(spacing: 4) {
            if let icon { Image(systemName: icon).font(.system(size: size - 1.5, weight: .bold)) }
            Text(text).font(.system(size: size, weight: variant == .ghost ? .medium : .bold)).lineLimit(1)
        }
        .padding(.horizontal, variant == .ghost ? 0 : 8)
        .padding(.vertical, variant == .ghost ? 0 : 3.5)
        .background(Capsule().fill(background))
        .foregroundStyle(variant == .filled ? Color.white : tint)
    }

    private var background: Color {
        switch variant {
        case .filled: return tint
        case .soft:   return tint.opacity(0.13)
        case .ghost:  return .clear
        }
    }
}

/// Chip SELECIONÁVEL (filtros de matéria/norma do Simulado, da Prova oral…).
struct LegisFilterChip: View {
    let text: String
    var on: Bool
    var tint: Color = ThemeState.t.accent
    let action: () -> Void

    init(_ text: String, on: Bool, tint: Color = ThemeState.t.accent, _ action: @escaping () -> Void) {
        self.text = text; self.on = on; self.tint = tint; self.action = action
    }

    var body: some View {
        Button(action: action) {
            Text(text).font(.system(size: 12, weight: .semibold))
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(Capsule().fill(on ? tint : AppTheme.hairline.opacity(0.35)))
                .foregroundStyle(on ? Color.white : AppTheme.ink)
                .contentShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Cabeçalho de seção (dentro de uma página)

/// "MATÉRIAS · 12" — caixa alta pequena com tracking, como o Cátedra web. Um só estilo
/// para todas as seções de todas as páginas.
struct LegisSectionHeader: View {
    let title: String
    var icon: String? = nil
    var count: Int? = nil
    var tint: Color = AppTheme.secondaryInk
    var trailing: AnyView? = nil

    var body: some View {
        HStack(spacing: 6) {
            if let icon {
                Image(systemName: icon).font(.system(size: 10, weight: .bold)).foregroundStyle(tint)
            }
            Text(title.uppercased())
                .font(.system(size: 10.5, weight: .bold)).tracking(1)
                .foregroundStyle(tint)
            if let count {
                Text("\(count)")
                    .font(Typo.num(9.5))
                    .padding(.horizontal, 5.5).padding(.vertical, 1)
                    .background(Capsule().fill(tint.opacity(0.13)))
                    .foregroundStyle(tint)
            }
            Spacer(minLength: 0)
            if let trailing { trailing }
        }
    }
}

// MARK: - Cartão

/// O cartão do LEGIS: fundo de superfície, hairline, raio `rCard`, lombada opcional
/// na cor da matéria e o "levantar" no hover (antes só o LawRow tinha).
struct LegisCardModifier: ViewModifier {
    var tint: Color?
    var spine: Bool
    var hover: Bool
    var stroke: Color?
    var radius: CGFloat
    @State private var hovering = false

    private var lifted: Bool { hover && hovering }

    func body(content: Content) -> some View {
        content
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: radius, style: .continuous).fill(AppTheme.cardBackground))
            .overlay(RoundedRectangle(cornerRadius: radius, style: .continuous)
                .strokeBorder(stroke ?? AppTheme.hairline, lineWidth: 1))
            .overlay(alignment: .leading) {
                if spine, let tint {
                    RoundedRectangle(cornerRadius: 2, style: .continuous)
                        .fill(tint).frame(width: 3)
                        .padding(.vertical, 10).padding(.leading, 1.5)
                }
            }
            .scaleEffect(lifted ? 1.006 : 1)
            .shadow(color: (lifted ? (tint ?? ThemeState.t.accent) : Color.black).opacity(lifted ? 0.16 : 0.03),
                    radius: lifted ? 9 : 3, y: 3)
            .animation(.easeOut(duration: 0.15), value: hovering)
            .onHover { if hover { hovering = $0 } }
    }
}

extension View {
    /// Cartão padrão do LEGIS. `tint` colore a lombada (`spine`) e a sombra do hover.
    func legisCard(tint: Color? = nil, spine: Bool = false, hover: Bool = false,
                   stroke: Color? = nil, radius: CGFloat = AppTheme.rCard) -> some View {
        modifier(LegisCardModifier(tint: tint, spine: spine, hover: hover, stroke: stroke, radius: radius))
    }
}

// MARK: - Botões

/// Botão PRIMÁRIO: cápsula com o gradiente do acento (ou da matéria).
struct LegisPrimaryButtonStyle: ButtonStyle {
    var stops: [Color] = [ThemeState.t.accent, ThemeState.t.accentD]

    func makeBody(configuration: Configuration) -> some View {
        LegisPrimaryButtonBody(configuration: configuration, stops: stops)
    }

    private struct LegisPrimaryButtonBody: View {
        let configuration: ButtonStyle.Configuration
        let stops: [Color]
        @Environment(\.isEnabled) private var isEnabled

        var body: some View {
            configuration.label
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(.white)
                .padding(.horizontal, 16).padding(.vertical, 9)
                .background(Capsule().fill(LinearGradient(colors: stops, startPoint: .leading, endPoint: .trailing)))
                .shadow(color: stops[0].opacity(isEnabled ? 0.35 : 0), radius: 8, y: 3)
                .opacity(isEnabled ? (configuration.isPressed ? 0.85 : 1) : 0.45)
                .scaleEffect(configuration.isPressed ? 0.98 : 1)
                .contentShape(Capsule())
        }
    }
}

/// Botão FANTASMA: texto no acento, sem borda (voltar, "ver tudo", limpar…).
struct LegisGhostButtonStyle: ButtonStyle {
    var tint: Color = ThemeState.t.accent

    func makeBody(configuration: Configuration) -> some View {
        LegisGhostButtonBody(configuration: configuration, tint: tint)
    }

    private struct LegisGhostButtonBody: View {
        let configuration: ButtonStyle.Configuration
        let tint: Color
        @Environment(\.isEnabled) private var isEnabled

        var body: some View {
            configuration.label
                .font(.system(size: 12.5, weight: .semibold))
                .foregroundStyle(tint)
                .opacity(isEnabled ? (configuration.isPressed ? 0.6 : 1) : 0.4)
                .contentShape(Rectangle())
        }
    }
}

extension ButtonStyle where Self == LegisPrimaryButtonStyle {
    static var legisPrimary: LegisPrimaryButtonStyle { LegisPrimaryButtonStyle() }
    static func legisPrimary(_ stops: [Color]) -> LegisPrimaryButtonStyle { LegisPrimaryButtonStyle(stops: stops) }
}
extension ButtonStyle where Self == LegisGhostButtonStyle {
    static var legisGhost: LegisGhostButtonStyle { LegisGhostButtonStyle() }
    static func legisGhost(_ tint: Color) -> LegisGhostButtonStyle { LegisGhostButtonStyle(tint: tint) }
}
