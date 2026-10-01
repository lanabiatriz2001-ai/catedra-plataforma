import SwiftUI

/// Barra lateral do LEGIS e do JURIS no MESMO padrão da lateral do Cátedra (host web):
/// navy do tema, selo "C" na cor de destaque, item ativo como pílula cheia na cor de
/// destaque com brilho, texto claro nos demais. Iguais no Mac e no iPad.

/// Selo da marca, como o do Cátedra: quadrado arredondado na cor de destaque + nome em serifa.
struct SeloLateral: View {
    let nome: String
    let subtitulo: String
    var body: some View {
        let acc = ThemeState.t.accent
        HStack(spacing: DSEspaco.e3) {
            Text("C").font(DS.display(19, .bold)).foregroundStyle(DS.sobreCor)
                .frame(width: 40, height: 40)
                .background(RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(LinearGradient(colors: [acc, acc.opacity(0.7)], startPoint: .topLeading, endPoint: .bottomTrailing)))
                .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(DS.sobreCor.opacity(0.15), lineWidth: 1))
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 1) {
                Text(nome).font(DS.display(18, .bold)).foregroundStyle(DS.sobreCor)
                Text(subtitulo).font(DS.interface(11.5)).foregroundStyle(ThemeState.t.sidebarText)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

/// Título de grupo da lateral, em versalete (como "ESTUDO BASE" no Cátedra).
struct GrupoLateral: View {
    let titulo: String
    var body: some View {
        Text(titulo.uppercased()).font(DS.interface(10.5, .bold)).tracking(1.4)
            .foregroundStyle(ThemeState.t.sidebarText.opacity(0.75))
            .padding(.horizontal, DSEspaco.e3).padding(.top, DSEspaco.e4).padding(.bottom, DSEspaco.e1)
            .accessibilityAddTraits(.isHeader)
    }
}

/// Uma linha da lateral (44 pt). Ativa = pílula cheia na cor de destaque, texto branco e
/// brilho embaixo — o mesmo item ativo do menu do Cátedra.
struct LinhaLateral: View {
    let titulo: String
    let simbolo: String
    let ativa: Bool
    var contagem: Int? = nil
    let acao: () -> Void

    var body: some View {
        let acc = ThemeState.t.accent
        Button(action: acao) {
            HStack(spacing: DSEspaco.e3) {
                Image(systemName: simbolo).font(DS.interface(15, .medium)).frame(width: 22)
                    .accessibilityHidden(true)
                Text(titulo).font(DS.interface(15, ativa ? .semibold : .medium)).lineLimit(1)
                Spacer(minLength: 4)
                if let n = contagem, n > 0 {
                    Text("\(n)").font(DS.mono(11, .semibold))
                        .foregroundStyle(ativa ? DS.sobreCor : ThemeState.t.sidebarText)
                }
            }
            .foregroundStyle(ativa ? DS.sobreCor : ThemeState.t.sidebarText)
            .padding(.horizontal, DSEspaco.e3)
            .frame(minHeight: 44)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(ativa ? AnyShapeStyle(LinearGradient(colors: [acc, acc.opacity(0.82)], startPoint: .leading, endPoint: .trailing))
                            : AnyShapeStyle(Color.clear)))
            .shadow(color: ativa ? acc.opacity(0.45) : .clear, radius: 10, x: 0, y: 4)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(ativa ? .isSelected : [])
    }
}

/// Atalho sob o destino aberto: ponto na cor do ramo/tribunal + nome (44 pt de toque).
struct SubLinhaLateral: View {
    let titulo: String
    let cor: UInt32?
    let acao: () -> Void
    var body: some View {
        Button(action: acao) {
            HStack(spacing: DSEspaco.e2) {
                Circle().fill(cor.map { DS.cor(DSCor.clarear($0, 0.3)) } ?? ThemeState.t.sidebarText)
                    .frame(width: 8, height: 8).accessibilityHidden(true)
                Text(titulo).font(DS.interface(13.5, .medium)).lineLimit(1)
                    .foregroundStyle(ThemeState.t.sidebarText)
                Spacer(minLength: 0)
            }
            .padding(.leading, 46)
            .frame(minHeight: 44)
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

/// Meta do dia no rodapé da lateral: número em serifa + barra na cor de destaque.
struct MetaLateral: View {
    let feito: Int
    let meta: Int
    let unidade: String
    var body: some View {
        let frac = meta > 0 ? min(1, Double(feito) / Double(meta)) : 0
        VStack(alignment: .leading, spacing: DSEspaco.e1) {
            Text("Meta de hoje").font(DS.interface(11.5, .semibold)).foregroundStyle(ThemeState.t.sidebarText)
            Text("\(feito) de \(meta) \(unidade)").font(DS.display(18, .bold)).foregroundStyle(DS.sobreCor)
            GeometryReader { g in
                ZStack(alignment: .leading) {
                    Capsule().fill(DS.sobreCor.opacity(0.12))
                    Capsule().fill(ThemeState.t.accent).frame(width: g.size.width * frac)
                }
            }
            .frame(height: 6).padding(.top, DSEspaco.e1)
        }
        .padding(DSEspaco.e4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(DS.sobreCor.opacity(0.06)))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Meta de hoje: \(feito) de \(meta) \(unidade)")
    }
}

extension View {
    /// Fundo da lateral: o navy do tema, igual ao do Cátedra.
    func fundoLateral() -> some View { background(ThemeState.t.sidebarBg) }
}
