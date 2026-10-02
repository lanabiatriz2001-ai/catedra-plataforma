import SwiftUI
import WidgetKit

struct TelaDoDia: View {
    let e: EntradaCatedra
    @Environment(\.widgetFamily) var familia
    var body: some View {
        conteudo
            .widgetURL(e.item.map { WidgetLinks.url(WidgetDoDia.destino($0)) } ?? WidgetLinks.url(.tela("inicio")))
            .containerBackground(for: .widget) { Rectangle().fill(.background) }
    }
    @ViewBuilder var conteudo: some View {
        if let r = e.resumo, !r.juridico {
            EstadoTexto(icone: "building.columns", titulo: "Conteúdo da área jurídica", texto: "A lei do dia aparece quando a área de estudo é jurídica.")
        } else if let i = e.item {
            DoDiaCartao(i: i, grande: familia == .systemLarge)
        } else {
            EstadoTexto(icone: "book.closed", titulo: "Lei do dia", texto: "Abra o Cátedra para carregar o acervo.")
        }
    }
}

/// Artigo ou súmula do dia, para leitura: fundo do sistema, título na cor do ramo (ajustada para 4,5:1) e texto em
/// serifa. Todo texto em `.primary` (o `.secondary` do sistema não chega a 4,5:1).
struct DoDiaCartao: View {
    let i: WidgetItemDoDia; let grande: Bool
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Image(systemName: i.tipo == "artigo" ? "text.book.closed" : "building.columns").font(.system(size: 12, weight: .bold)).accessibilityHidden(true)
                TextoMateria(texto: i.tipo == "artigo" ? "\(i.titulo) · \(i.diploma)" : i.titulo, cor: i.cor, corD: i.corD, fonte: .system(size: 13, weight: .heavy))
            }
            Text(i.texto).font(.system(size: grande ? 14 : 13, design: .serif)).lineLimit(grande ? 17 : 5).foregroundStyle(.primary)
            Spacer(minLength: 0)
            HStack(spacing: 4) {
                Image(systemName: i.tipo == "artigo" ? "checkmark.seal" : "quote.bubble").font(.system(size: 11)).accessibilityHidden(true)
                Text(i.rotulo).font(.system(size: 11, weight: .semibold))
            }
            .foregroundStyle(.primary)
            if grande, let p = i.provas, !p.isEmpty {
                Text(p.prefix(6).map { "\($0.orgao) \($0.ano)" }.joined(separator: " · ")).font(.system(size: 11)).lineLimit(2).foregroundStyle(.primary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

/// Cartão com fundo em gradiente (ou do sistema, na baixa estimulação) dentro do painel extra grande.
struct Cartao<Conteudo: View>: View {
    let paradas: [WidgetRGB]; let baixa: Bool
    @ViewBuilder let conteudo: () -> Conteudo
    var body: some View {
        conteudo().padding(12)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background { FundoGradiente(paradas: paradas, baixa: baixa).clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous)) }
            .overlay { if baixa { RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(.separator, lineWidth: 1) } }
    }
}

struct PainelConteudo: View {
    let h: WidgetHoje; let r: WidgetResumo; let item: WidgetItemDoDia?
    var body: some View {
        let tema = WidgetCores.gradienteTema(r.prefs.tema.grad, accent: r.prefs.tema.accent)
        HStack(spacing: 12) {
            LinkWidget(destino: WidgetLinks.url(.tela("ciclo"))) {
                Cartao(paradas: WidgetCores.gradienteMateria(h.proximo?.cor ?? r.prefs.tema.accent), baixa: h.baixa) { AgoraPequeno(h: h) }
            }
            VStack(spacing: 12) {
                LinkWidget(destino: WidgetLinks.url(.tela("edital"))) { Cartao(paradas: tema, baixa: h.baixa) { ProvaPequeno(h: h) } }
                LinkWidget(destino: WidgetLinks.url(.tela("analise"))) { Cartao(paradas: tema, baixa: h.baixa) { SemanaPequeno(h: h) } }
            }
            if r.juridico, let i = item {
                LinkWidget(destino: WidgetLinks.url(WidgetDoDia.destino(i))) { DoDiaCartao(i: i, grande: true) }
            }
        }
    }
}

struct TelaPainel: View {
    let e: EntradaCatedra
    var body: some View {
        Group {
            if let h = e.hoje, let r = e.resumo { PainelConteudo(h: h, r: r, item: e.item) } else { EstadoEntrar() }
        }
        .widgetURL(WidgetLinks.url(e.hoje == nil ? .entrar : .tela("inicio")))
        .containerBackground(for: .widget) { Rectangle().fill(.background) }
    }
}
