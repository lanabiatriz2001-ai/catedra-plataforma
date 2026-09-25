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

/// A página de um destino: título grande e seções em grade de cartões ("vitrine").
struct DestinoHub: View {
    let titulo: String
    let subtitulo: String
    let secoes: [SecaoHub]

    private let colunas = [GridItem(.adaptive(minimum: 220), spacing: DSEspaco.e3)]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: DSEspaco.e6) {
                VStack(alignment: .leading, spacing: DSEspaco.e1) {
                    Text(titulo).font(DS.display(DSTipo.display.rawValue, .bold)).foregroundStyle(ThemeState.t.ink)
                    if !subtitulo.isEmpty {
                        Text(subtitulo).font(DS.interface(15)).foregroundStyle(ThemeState.t.text2)
                    }
                }
                ForEach(secoes) { secao in
                    VStack(alignment: .leading, spacing: DSEspaco.e3) {
                        if !secao.titulo.isEmpty {
                            Text(secao.titulo.uppercased()).font(DS.interface(12, .semibold)).tracking(0.8)
                                .foregroundStyle(ThemeState.t.text3)
                        }
                        LazyVGrid(columns: colunas, alignment: .leading, spacing: DSEspaco.e3) {
                            ForEach(secao.itens) { cartao($0) }
                        }
                    }
                }
            }
            .padding(DSEspaco.e6)
            .frame(maxWidth: 1100, alignment: .leading)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(ThemeState.t.bg)
    }

    private func cartao(_ item: ItemHub) -> some View {
        let cor = item.cor.map { DS.cor($0) } ?? ThemeState.t.accent
        let corTexto = item.cor.map { DS.corTexto($0) } ?? ThemeState.t.accent
        return Button(action: item.acao) {
            VStack(alignment: .leading, spacing: DSEspaco.e2) {
                HStack {
                    Image(systemName: item.simbolo).font(DS.interface(17, .semibold)).foregroundStyle(corTexto)
                    Spacer()
                    if let n = item.contagem, n > 0 {
                        Text("\(n)").font(DS.mono(12)).foregroundStyle(ThemeState.t.text3)
                    }
                }
                Text(item.titulo).font(DS.display(17, .bold)).foregroundStyle(ThemeState.t.ink)
                    .multilineTextAlignment(.leading).lineLimit(2)
                if let d = item.detalhe, !d.isEmpty {
                    Text(d).font(DS.interface(13)).foregroundStyle(ThemeState.t.text2).lineLimit(2)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 96, alignment: .topLeading)
            .padding(DSEspaco.e4)
            // Cor do ramo como borda tingida + lavagem da esquerda (DESIGN.md: sem faixa lateral).
            .background(
                RoundedRectangle(cornerRadius: DSRaio.card, style: .continuous)
                    .fill(LinearGradient(colors: [cor.opacity(0.16), ThemeState.t.surface],
                                         startPoint: .leading, endPoint: .trailing))
            )
            .overlay(RoundedRectangle(cornerRadius: DSRaio.card, style: .continuous)
                .strokeBorder(cor.opacity(0.38), lineWidth: 1))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
    }
}
