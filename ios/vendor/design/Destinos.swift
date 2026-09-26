import SwiftUI

/// Os quatro destinos de primeiro nível — os MESMOS no LEGIS e no JURIS, na mesma ordem e
/// com os mesmos ícones (spec §6): quem troca de um para o outro não reaprende nada.
enum Destino: String, CaseIterable, Hashable {
    case hoje, acervo, treinar, novidades

    var titulo: String {
        switch self {
        case .hoje: return "Hoje"
        case .acervo: return "Acervo"
        case .treinar: return "Treinar"
        case .novidades: return "Novidades"
        }
    }
    var simbolo: String {
        switch self {
        case .hoje: return "sun.max"
        case .acervo: return "books.vertical"
        case .treinar: return "target"
        case .novidades: return "bell"
        }
    }
}

/// Um cartão da vitrine de um destino.
struct ItemHub: Identifiable {
    let id: String
    let titulo: String
    let detalhe: String?
    let simbolo: String
    /// Cor de identidade (ramo, tribunal); nil = acento do tema.
    let cor: UInt32?
    let contagem: Int?
    let acao: () -> Void
}

struct SecaoHub: Identifiable {
    var id: String { titulo }
    let titulo: String
    let itens: [ItemHub]
}

/// A página de um destino no padrão das páginas do Cátedra: hero no gradiente do tema
/// (título em serifa, subtítulo e chips), seções com título em serifa e fio (`SecaoInicio`)
/// e cartões claros com a cor do ramo/tribunal na borda, na lavagem e no ícone.
struct DestinoHub: View {
    let titulo: String
    let subtitulo: String
    /// Números do topo (ex.: "268 normas", "86 favoritos"); vazio = hero sem chips.
    var destaques: [ChipHero] = []
    let secoes: [SecaoHub]

    private let colunas = [GridItem(.adaptive(minimum: 250), spacing: DSEspaco.e4)]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: DSEspaco.e5) {
                HeroPagina(titulo: titulo, subtitulo: subtitulo, chips: destaques)
                ForEach(secoes) { secao in
                    VStack(alignment: .leading, spacing: DSEspaco.e4) {
                        if !secao.titulo.isEmpty { SecaoInicio(titulo: secao.titulo) }
                        LazyVGrid(columns: colunas, alignment: .leading, spacing: DSEspaco.e4) {
                            ForEach(secao.itens) { CartaoDestino(item: $0) }
                        }
                    }
                }
            }
            .padding(28)
            .frame(maxWidth: 1180, alignment: .leading)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(ThemeState.t.bg)
    }
}

/// Um cartão de destino: ícone em quadrado tingido, título em serifa, detalhe, contagem em
/// etiqueta e seta. Cor do ramo como borda tingida + lavagem da esquerda (sem faixa lateral).
struct CartaoDestino: View {
    let item: ItemHub
    @State private var sobre = false

    var body: some View {
        let cor = item.cor.map { DS.cor($0) } ?? ThemeState.t.accent
        let corTexto = item.cor.map { DS.corTexto($0) } ?? ThemeState.t.accent
        Button(action: item.acao) {
            VStack(alignment: .leading, spacing: DSEspaco.e2) {
                HStack(alignment: .top) {
                    Image(systemName: item.simbolo).font(DS.interface(18, .semibold)).foregroundStyle(corTexto)
                        .frame(width: 46, height: 46)
                        .background(RoundedRectangle(cornerRadius: 13, style: .continuous).fill(cor.opacity(0.14)))
                        .overlay(RoundedRectangle(cornerRadius: 13, style: .continuous).strokeBorder(cor.opacity(0.25), lineWidth: 1))
                        .accessibilityHidden(true)
                    Spacer(minLength: DSEspaco.e2)
                    if let n = item.contagem, n > 0 {
                        Text("\(n)").font(DS.mono(12, .semibold)).foregroundStyle(ThemeState.t.text2)
                            .padding(.horizontal, 9).padding(.vertical, 3)
                            .background(Capsule().fill(ThemeState.t.surface2))
                            .overlay(Capsule().strokeBorder(ThemeState.t.border, lineWidth: 1))
                    }
                }
                Text(item.titulo).font(DS.display(18, .bold)).foregroundStyle(ThemeState.t.ink)
                    .multilineTextAlignment(.leading).lineLimit(2).padding(.top, DSEspaco.e1)
                HStack(alignment: .bottom) {
                    if let d = item.detalhe, !d.isEmpty {
                        Text(d).font(DS.interface(13)).foregroundStyle(ThemeState.t.text2).lineLimit(2)
                    }
                    Spacer(minLength: DSEspaco.e2)
                    Image(systemName: "arrow.right").font(DS.interface(13, .bold)).foregroundStyle(corTexto)
                        .offset(x: sobre ? 3 : 0).accessibilityHidden(true)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 124, alignment: .topLeading)
            .padding(DSEspaco.e4)
            .background(
                RoundedRectangle(cornerRadius: DSRaio.card, style: .continuous)
                    .fill(LinearGradient(colors: [cor.opacity(0.10), ThemeState.t.surface],
                                         startPoint: .leading, endPoint: .trailing))
            )
            .overlay(RoundedRectangle(cornerRadius: DSRaio.card, style: .continuous)
                .strokeBorder(cor.opacity(sobre ? 0.55 : 0.32), lineWidth: 1))
            .shadow(color: Color.black.opacity(sobre ? 0.10 : 0.05), radius: sobre ? 16 : 10, x: 0, y: sobre ? 8 : 4)
            .offset(y: sobre ? -2 : 0)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { h in withAnimation(.easeOut(duration: 0.15)) { sobre = h } }
        .accessibilityElement(children: .combine)
    }
}
