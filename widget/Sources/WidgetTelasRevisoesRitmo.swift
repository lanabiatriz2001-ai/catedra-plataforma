import SwiftUI
import WidgetKit

/// Usa o mesmo resumo e o mesmo relógio dos outros modelos, sem alterar o estudo pelo widget.
struct TelaRevisoes: View {
    let e: EntradaCatedra
    @Environment(\.widgetFamily) var familia
    var body: some View {
        Group {
            if let h = e.hoje, let r = e.resumo {
                #if os(iOS)
                if ehAcessorio(familia) {
                    if familia == .accessoryInline { Text("\(Estilo.revisoes(h.revisoesHoje)) para hoje") }
                    else {
                        VStack(alignment: .leading) {
                            Text("REVISÕES").font(.system(size: 10, weight: .heavy))
                            Text(h.revisoesHoje > 0 ? "\(Estilo.revisoes(h.revisoesHoje)) para hoje" : "Hoje em dia")
                                .font(.system(size: 15, weight: .bold)).lineLimit(1)
                        }.widgetAccentable()
                    }
                } else { RevisoesCartao(h: h, r: r, familia: familia) }
                #else
                RevisoesCartao(h: h, r: r, familia: familia)
                #endif
            } else { EstadoEntrar() }
        }
        .widgetURL(WidgetLinks.url(e.hoje == nil ? .entrar : .tela("revisoes")))
        .containerBackground(for: .widget) { FundoTema(e: e) }
    }
}

struct RevisoesCartao: View {
    let h: WidgetHoje
    let r: WidgetResumo
    let familia: WidgetFamily
    var tinta: Color { h.baixa ? .primary : .white }
    var datas: [String] { r.revisoes.porData.keys.filter { $0 > h.hoje && (r.revisoes.porData[$0] ?? 0) > 0 }.sorted() }
    var body: some View {
        Group {
            if familia == .systemMedium {
                HStack(spacing: 18) { destaque; agenda(limite: 2).frame(maxWidth: .infinity) }
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    destaque
                    if familia == .systemLarge { agenda(limite: 6) }
                }
            }
        }
        .foregroundStyle(tinta)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
    var destaque: some View {
        VStack(alignment: .leading, spacing: 4) {
            Eyebrow(texto: "Revisões de hoje")
            Spacer(minLength: 0)
            Text("\(h.revisoesHoje)").font(Estilo.numero(52)).lineLimit(1).minimumScaleFactor(0.5).widgetAccentable()
            Text(h.revisoesHoje > 0 ? "para retomar" : "Hoje em dia").font(.system(size: 14, weight: .semibold))
            Spacer(minLength: 0)
            RotuloVelho(h: h, tinta: tinta)
        }
    }
    func agenda(limite: Int) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Eyebrow(texto: "Próximos dias")
            if datas.isEmpty { Text("Nenhuma revisão agendada.").font(.system(size: 13)).lineLimit(3) }
            ForEach(Array(datas.prefix(limite)), id: \.self) { data in
                HStack {
                    Text(Estilo.dataCurta(data)).font(.system(size: 12, weight: .medium)).lineLimit(1)
                    Spacer(minLength: 6)
                    Text("\(r.revisoes.porData[data] ?? 0)").font(.system(size: 17, weight: .bold)).monospacedDigit()
                }
            }
            Spacer(minLength: 0)
        }
    }
}

struct TelaRitmo: View {
    let e: EntradaCatedra
    @Environment(\.widgetFamily) var familia
    var body: some View {
        Group {
            if let h = e.hoje {
                #if os(iOS)
                if familia == .accessoryCircular {
                    Gauge(value: Double(h.metaHojePct), in: 0...100) { Text("hoje") }
                        currentValueLabel: { Text("\(h.metaHojePct)") }
                        .gaugeStyle(.accessoryCircularCapacity).widgetAccentable()
                        .accessibilityLabel("Meta de hoje").accessibilityValue("\(h.metaHojePct) por cento")
                } else { RitmoCartao(h: h, medio: familia == .systemMedium) }
                #else
                RitmoCartao(h: h, medio: familia == .systemMedium)
                #endif
            } else { EstadoEntrar() }
        }
        .widgetURL(WidgetLinks.url(e.hoje == nil ? .entrar : .tela("inicio")))
        .containerBackground(for: .widget) { FundoTema(e: e) }
    }
}

struct RitmoCartao: View {
    let h: WidgetHoje
    let medio: Bool
    var tinta: Color { h.baixa ? .primary : .white }
    var body: some View {
        HStack(spacing: 18) {
            VStack(alignment: .leading, spacing: 6) {
                Eyebrow(texto: "Ritmo de hoje")
                Spacer(minLength: 0)
                Text(Estilo.horas(h.minHoje)).font(Estilo.numero(32)).minimumScaleFactor(0.6).lineLimit(1).widgetAccentable()
                Text(h.metaHojeMin > 0 ? "de \(Estilo.horas(h.metaHojeMin))" : "Defina a meta").font(.system(size: 12, weight: .semibold))
                BarraProgresso(pct: h.metaHojePct, tinta: tinta, rotulo: "Meta de hoje")
                Spacer(minLength: 0)
                RotuloVelho(h: h, tinta: tinta)
            }.frame(maxWidth: .infinity, alignment: .leading)
            if medio {
                VStack(alignment: .leading, spacing: 8) {
                    Eyebrow(texto: "Próximo bloco")
                    Text(h.proximo.map { Estilo.curto($0.disc) } ?? "Abra o ciclo")
                        .font(.system(size: 19, weight: .heavy, design: .rounded)).lineLimit(3).minimumScaleFactor(0.7)
                    if let b = h.proximo { Text("\(b.min) min").font(.system(size: 13, weight: .semibold)) }
                    Spacer(minLength: 0)
                    Text(Estilo.revisoes(h.revisoesHoje)).font(.system(size: 12, weight: .medium))
                }.frame(maxWidth: .infinity, alignment: .leading)
            }
        }.foregroundStyle(tinta)
    }
}
