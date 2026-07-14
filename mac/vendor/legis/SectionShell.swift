import SwiftUI

/// Cabeçalho + moldura consistentes para as seções do CátedraLEGIS. Como o layout usa uma
/// barra lateral própria (sem a nav bar do macOS), o título, o contexto e a busca precisam
/// viver DENTRO do conteúdo — este componente dá isso a todas as telas, com o visual clean.
struct SectionShell<Content: View>: View {
    let icon: String
    let title: String
    var subtitle: String? = nil
    var count: Int? = nil
    var search: Binding<String>? = nil
    var searchPrompt: String = "Buscar"
    var trailing: AnyView? = nil
    @ViewBuilder var content: Content

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .center, spacing: 13) {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(ThemeState.t.accent.opacity(0.14))
                    .frame(width: 40, height: 40)
                    .overlay(Image(systemName: icon).font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(ThemeState.t.accent))
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 8) {
                        Text(title).font(.system(size: 20, weight: .bold)).foregroundStyle(AppTheme.ink)
                        if let count {
                            Text("\(count)")
                                .font(.system(size: 11.5, weight: .semibold).monospacedDigit())
                                .padding(.horizontal, 7).padding(.vertical, 1.5)
                                .background(Capsule().fill(ThemeState.t.accent.opacity(0.14)))
                                .foregroundStyle(ThemeState.t.accent)
                        }
                    }
                    if let subtitle {
                        Text(subtitle).font(.system(size: 12.5))
                            .foregroundStyle(AppTheme.secondaryInk)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                Spacer(minLength: 8)
                if let trailing { trailing }
            }
            .padding(.horizontal, 22).padding(.top, 20).padding(.bottom, search == nil ? 16 : 12)

            if let search {
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass").font(.system(size: 13))
                        .foregroundStyle(AppTheme.secondaryInk)
                    TextField(searchPrompt, text: search).textFieldStyle(.plain).font(.system(size: 13.5))
                    if !search.wrappedValue.isEmpty {
                        Button { search.wrappedValue = "" } label: {
                            Image(systemName: "xmark.circle.fill").font(.system(size: 13))
                        }
                        .buttonStyle(.plain).foregroundStyle(.tertiary)
                    }
                }
                .padding(.horizontal, 11).padding(.vertical, 8)
                .background(RoundedRectangle(cornerRadius: 9, style: .continuous).fill(AppTheme.softStroke))
                .overlay(RoundedRectangle(cornerRadius: 9, style: .continuous).strokeBorder(AppTheme.hairline, lineWidth: 1))
                .padding(.horizontal, 22).padding(.bottom, 14)
            }

            Rectangle().fill(AppTheme.hairline).frame(height: 1)
            content
        }
        .background(AppTheme.pageBackground)
    }
}

/// Estado vazio centralizado e clean (o ContentUnavailableView dentro de List ancorava no topo).
struct LegisEmpty: View {
    let icon: String
    let title: String
    let message: String
    var actionLabel: String? = nil
    var action: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: 13) {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(ThemeState.t.accent.opacity(0.10))
                .frame(width: 64, height: 64)
                .overlay(Image(systemName: icon).font(.system(size: 27, weight: .medium))
                    .foregroundStyle(ThemeState.t.accent))
            Text(title).font(.system(size: 16.5, weight: .semibold)).foregroundStyle(AppTheme.ink)
            Text(message).font(.system(size: 12.5)).foregroundStyle(AppTheme.secondaryInk)
                .multilineTextAlignment(.center).lineSpacing(2.5)
                .frame(maxWidth: 400)
            if let actionLabel, let action {
                Button(action: action) { Text(actionLabel).fontWeight(.medium) }
                    .buttonStyle(.borderedProminent).tint(ThemeState.t.accent)
                    .padding(.top, 2)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(32)
    }
}

/// Linha padrão das listas de seção (ícone-acento + título + subtítulo + chevron), em card clean.
struct SectionRow: View {
    let icon: String
    let title: String
    var subtitle: String? = nil
    var trailingText: String? = nil

    var body: some View {
        HStack(spacing: 12) {
            IconBubble(symbol: icon, color: ThemeState.t.accent, size: 34)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 13.5, weight: .semibold))
                    .foregroundStyle(AppTheme.ink).lineLimit(2)
                if let subtitle, !subtitle.isEmpty {
                    Text(subtitle).font(.system(size: 11.5)).foregroundStyle(AppTheme.secondaryInk).lineLimit(2)
                }
            }
            Spacer(minLength: 6)
            if let trailingText {
                Text(trailingText).font(.system(size: 11.5, weight: .medium).monospacedDigit())
                    .foregroundStyle(AppTheme.secondaryInk)
            }
            Image(systemName: "chevron.right").font(.system(size: 11, weight: .semibold))
                .foregroundStyle(AppTheme.secondaryInk.opacity(0.6))
        }
        .padding(.horizontal, 13).padding(.vertical, 11)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: AppTheme.compactRadius, style: .continuous).fill(AppTheme.cardBackground))
        .overlay(RoundedRectangle(cornerRadius: AppTheme.compactRadius, style: .continuous).strokeBorder(AppTheme.hairline, lineWidth: 1))
        .contentShape(Rectangle())
    }
}
