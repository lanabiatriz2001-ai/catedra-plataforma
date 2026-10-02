import SwiftUI
import WidgetKit

struct TelaAgora: View {
    let e: EntradaCatedra
    @Environment(\.widgetFamily) var familia
    var body: some View {
        conteudo
            .widgetURL(WidgetLinks.url(e.hoje == nil ? .entrar : .tela("ciclo")))
            .containerBackground(for: .widget) { FundoAgora(e: e) }
    }
    @ViewBuilder var conteudo: some View {
        if let h = e.hoje {
            #if os(iOS)
            if familia == .accessoryRectangular { AgoraRetangular(h: h) }
            else if familia == .accessoryInline { AgoraLinha(h: h) }
            else { sistema(h) }
            #else
            sistema(h)
            #endif
        } else { EstadoEntrar() }
    }
    @ViewBuilder func sistema(_ h: WidgetHoje) -> some View {
        switch familia {
        case .systemMedium: AgoraMedio(h: h)
        case .systemLarge: AgoraGrande(h: h)
        default: AgoraPequeno(h: h)
        }
    }
}

struct AgoraPequeno: View {
    let h: WidgetHoje
    var body: some View {
        let tinta: Color = h.baixa ? .primary : .white
        VStack(alignment: .leading, spacing: 4) {
            Eyebrow(texto: "Estudar agora").foregroundStyle(tinta)
            Spacer(minLength: 0)
            if let b = h.proximo {
                if h.baixa {
                    TextoMateria(texto: Estilo.curto(b.disc), cor: b.cor, corD: b.corD, fonte: .system(size: 22, weight: .heavy, design: .rounded), linhas: 2)
                } else {
                    Text(Estilo.curto(b.disc)).font(.system(size: 22, weight: .heavy, design: .rounded))
                        .lineLimit(2).minimumScaleFactor(0.7).foregroundStyle(.white).widgetAccentable()
                }
                Text("\(b.min) min").font(.system(size: 15, weight: .semibold)).foregroundStyle(tinta)
            } else {
                Text(h.cicloTotal > 0 ? "Ciclo do dia concluído" : "Monte o ciclo")
                    .font(.system(size: 18, weight: .heavy, design: .rounded)).lineLimit(2).minimumScaleFactor(0.7).foregroundStyle(tinta)
            }
            Spacer(minLength: 0)
            BarraProgresso(pct: h.metaHojePct, tinta: tinta, rotulo: "Meta de hoje")
            Text("\(h.minHoje) de \(h.metaHojeMin) min hoje").font(.system(size: 11, weight: .medium))
                .lineLimit(1).minimumScaleFactor(0.8).foregroundStyle(tinta)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

struct LinhaBloco: View {
    let b: WidgetResumo.Bloco; let tinta: Color
    var body: some View {
        HStack(spacing: 6) {
            Circle().fill(tinta).frame(width: 6, height: 6).accessibilityHidden(true)   // marcador, não faixa lateral
            Text(Estilo.curto(b.disc)).font(.system(size: 13, weight: .semibold)).lineLimit(1).minimumScaleFactor(0.85)
            Spacer(minLength: 4)
            Text("\(b.min) min").font(.system(size: 12, weight: .medium)).monospacedDigit()
        }
        .foregroundStyle(tinta)
    }
}

struct AgoraMedio: View {
    let h: WidgetHoje
    var body: some View {
        let tinta: Color = h.baixa ? .primary : .white
        HStack(alignment: .top, spacing: 14) {
            AgoraPequeno(h: h).frame(maxWidth: .infinity)
            VStack(alignment: .leading, spacing: 8) {
                Eyebrow(texto: "A seguir").foregroundStyle(tinta)
                ForEach(Array(h.seguintes.prefix(2).enumerated()), id: \.offset) { _, b in LinhaBloco(b: b, tinta: tinta) }
                if h.seguintes.isEmpty { Text("Nada depois deste").font(.system(size: 12)).foregroundStyle(tinta) }
                Spacer(minLength: 0)
                RotuloVelho(h: h, tinta: tinta)
                LinkWidget(destino: WidgetLinks.url(.tela("revisoes"))) {
                    Label(Estilo.revisoes(h.revisoesHoje), systemImage: "arrow.triangle.2.circlepath")
                        .font(.system(size: 13, weight: .bold)).foregroundStyle(tinta).lineLimit(1)
                        .frame(minHeight: 44).contentShape(Rectangle())
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

struct AgoraGrande: View {
    let h: WidgetHoje
    var body: some View {
        let tinta: Color = h.baixa ? .primary : .white
        VStack(alignment: .leading, spacing: 10) {
            AgoraPequeno(h: h).frame(height: 132)
            Rectangle().fill(tinta.opacity(0.3)).frame(height: 1).accessibilityHidden(true)
            Eyebrow(texto: "A seguir no ciclo").foregroundStyle(tinta)
            ForEach(Array(h.seguintes.prefix(5).enumerated()), id: \.offset) { _, b in LinhaBloco(b: b, tinta: tinta) }
            if h.seguintes.isEmpty { Text(h.cicloTotal > 0 ? "Nada depois deste" : "Cadastre as matérias no Ciclo do app").font(.system(size: 12)).foregroundStyle(tinta) }
            Spacer(minLength: 0)
            if let v = h.volta {
                Text("Volta \(v.n) · \(v.feitos) de \(v.total) blocos").font(.system(size: 12, weight: .semibold)).foregroundStyle(tinta)
                BarraProgresso(pct: v.total > 0 ? v.feitos * 100 / v.total : 0, tinta: tinta, rotulo: "Volta do ciclo")
            }
            HStack {
                if h.cicloTotal > 0 { Text("\(h.cicloFeitos) de \(h.cicloTotal) hoje").font(.system(size: 12, weight: .medium)) }
                Spacer()
                RotuloVelho(h: h, tinta: tinta)
                LinkWidget(destino: WidgetLinks.url(.tela("revisoes"))) {
                    Label(Estilo.revisoes(h.revisoesHoje), systemImage: "arrow.triangle.2.circlepath").font(.system(size: 12, weight: .bold))
                        .frame(minHeight: 44).contentShape(Rectangle())
                }
            }
            .foregroundStyle(tinta)
        }
    }
}

#if os(iOS)
struct AgoraRetangular: View {
    let h: WidgetHoje
    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text("ESTUDAR AGORA").font(.system(size: 10, weight: .heavy)).widgetAccentable()
            Text(h.proximo.map { Estilo.curto($0.disc) } ?? "Ciclo do dia concluído").font(.system(size: 15, weight: .bold)).lineLimit(1)
            Text(h.proximo.map { "\($0.min) min · meta \(h.metaHojePct)%" } ?? "meta \(h.metaHojePct)%").font(.system(size: 12)).lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct AgoraLinha: View {
    let h: WidgetHoje
    var body: some View { Text(h.proximo.map { "próximo: \(Estilo.curto($0.disc))" } ?? "ciclo do dia concluído") }
}
#endif
