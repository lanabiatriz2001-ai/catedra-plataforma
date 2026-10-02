import SwiftUI
import WidgetKit

struct TelaProva: View {
    let e: EntradaCatedra
    @Environment(\.widgetFamily) var familia
    var body: some View {
        conteudo
            .widgetURL(WidgetLinks.url(e.hoje == nil ? .entrar : .tela("edital")))
            .containerBackground(for: .widget) { FundoTema(e: e) }
    }
    @ViewBuilder var conteudo: some View {
        if let h = e.hoje {
            #if os(iOS)
            if familia == .accessoryCircular { ProvaCirculo(h: h) } else { ProvaPequeno(h: h) }
            #else
            ProvaPequeno(h: h)
            #endif
        } else { EstadoEntrar() }
    }
}

struct ProvaPequeno: View {
    let h: WidgetHoje
    var body: some View {
        let tinta: Color = h.baixa ? .primary : .white
        VStack(alignment: .leading, spacing: 2) {
            Eyebrow(texto: "Prova").foregroundStyle(tinta)
            Spacer(minLength: 0)
            if let d = h.diasProva {
                Text("\(d)").font(Estilo.numero(54)).minimumScaleFactor(0.5).lineLimit(1).foregroundStyle(tinta).widgetAccentable()
                Text(d == 1 ? "dia" : "dias").font(.system(size: 15, weight: .bold)).foregroundStyle(tinta)
                Spacer(minLength: 0)
                Text(Estilo.dataCurta(h.dataProva)).font(.system(size: 12, weight: .semibold)).foregroundStyle(tinta)
                if !h.nomeProva.isEmpty { Text(h.nomeProva).font(.system(size: 12)).lineLimit(1).minimumScaleFactor(0.8).foregroundStyle(tinta) }
            } else {
                Image(systemName: "calendar.badge.plus").font(.system(size: 26, weight: .semibold)).foregroundStyle(tinta).accessibilityHidden(true)
                Text("Defina a data da prova").font(.system(size: 15, weight: .heavy, design: .rounded)).lineLimit(3).foregroundStyle(tinta)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

struct TelaSemana: View {
    let e: EntradaCatedra
    @Environment(\.widgetFamily) var familia
    var body: some View {
        conteudo
            .widgetURL(WidgetLinks.url(e.hoje == nil ? .entrar : .tela("analise")))
            .containerBackground(for: .widget) { FundoTema(e: e) }
    }
    @ViewBuilder var conteudo: some View {
        if let h = e.hoje {
            #if os(iOS)
            if familia == .accessoryCircular { SemanaCirculo(h: h) }
            else if familia == .systemMedium { SemanaMedio(h: h) } else { SemanaPequeno(h: h) }
            #else
            if familia == .systemMedium { SemanaMedio(h: h) } else { SemanaPequeno(h: h) }
            #endif
        } else { EstadoEntrar() }
    }
}

struct AnelMeta: View {
    let pct: Int; let tinta: Color; let espessura: CGFloat
    var body: some View {
        ZStack {
            Circle().stroke(tinta.opacity(0.25), lineWidth: espessura)
            Circle().trim(from: 0, to: CGFloat(min(100, max(0, pct))) / 100)
                .stroke(tinta, style: StrokeStyle(lineWidth: espessura, lineCap: .round)).rotationEffect(.degrees(-90))
            Text("\(pct)%").font(Estilo.numero(24)).minimumScaleFactor(0.5).lineLimit(1).foregroundStyle(tinta).widgetAccentable()
        }
        .accessibilityElement().accessibilityLabel("Meta da semana").accessibilityValue("\(pct) por cento")
    }
}

struct SemanaPequeno: View {
    let h: WidgetHoje
    var body: some View {
        let tinta: Color = h.baixa ? .primary : .white
        VStack(alignment: .leading, spacing: 6) {
            Eyebrow(texto: "Semana").foregroundStyle(tinta)
            AnelMeta(pct: h.semanaPct, tinta: tinta, espessura: 9).padding(4).frame(maxWidth: .infinity, maxHeight: .infinity)
            Text(h.metaSemanaMin > 0 ? "\(Estilo.horas(h.semanaMin)) de \(Estilo.horas(h.metaSemanaMin))" : "Defina a meta").font(.system(size: 12, weight: .semibold))
                .lineLimit(1).minimumScaleFactor(0.8).foregroundStyle(tinta).frame(maxWidth: .infinity)
        }
    }
}

struct BarrasSemana: View {
    let dias: [WidgetDiaSemana]; let meta: Int; let tinta: Color
    var body: some View {
        let teto = max(meta, dias.map(\.min).max() ?? 0, 1)
        HStack(alignment: .bottom, spacing: 6) {
            ForEach(dias, id: \.data) { d in
                VStack(spacing: 3) {
                    GeometryReader { g in
                        VStack(spacing: 0) {
                            Spacer(minLength: 0)
                            RoundedRectangle(cornerRadius: 3)
                                .fill(d.futuro ? tinta.opacity(0.15) : (d.ehHoje ? tinta : tinta.opacity(0.6)))
                                .frame(height: max(3, g.size.height * CGFloat(d.min) / CGFloat(teto)))
                        }
                    }
                    Text(d.rotulo).font(.system(size: 9, weight: d.ehHoje ? .heavy : .medium)).foregroundStyle(tinta)
                }
            }
        }
        .accessibilityElement().accessibilityLabel("Minutos estudados em cada dia da semana")
    }
}

struct SemanaMedio: View {
    let h: WidgetHoje
    var body: some View {
        let tinta: Color = h.baixa ? .primary : .white
        HStack(spacing: 16) {
            SemanaPequeno(h: h).frame(width: 118)
            VStack(alignment: .leading, spacing: 8) {
                BarrasSemana(dias: h.semana, meta: h.metaHojeMin, tinta: tinta).frame(maxHeight: .infinity)
                HStack {
                    if !h.baixa && h.ofensiva > 0 {
                        Label(h.ofensiva == 1 ? "1 dia de ofensiva" : "\(h.ofensiva) dias de ofensiva", systemImage: "flame.fill")
                            .font(.system(size: 12, weight: .bold)).lineLimit(1)
                    }
                    Spacer(minLength: 0)
                    RotuloVelho(h: h, tinta: tinta)
                }
                .foregroundStyle(tinta)
            }
        }
    }
}

#if os(iOS)
struct ProvaCirculo: View {
    let h: WidgetHoje
    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: -2) {
                Text(h.diasProva.map { "\($0)" } ?? "—").font(.system(size: 20, weight: .heavy, design: .rounded)).minimumScaleFactor(0.5).widgetAccentable()
                Text("dias").font(.system(size: 9, weight: .semibold))
            }
        }
        .accessibilityElement().accessibilityLabel(h.diasProva.map { "\($0) dias até a prova" } ?? "Sem data de prova")
    }
}

struct SemanaCirculo: View {
    let h: WidgetHoje
    var body: some View {
        Gauge(value: Double(h.metaHojePct), in: 0...100) { Text("meta") } currentValueLabel: { Text("\(h.metaHojePct)") }
            .gaugeStyle(.accessoryCircularCapacity).widgetAccentable()
            .accessibilityLabel("Meta de hoje").accessibilityValue("\(h.metaHojePct) por cento")
    }
}
#endif
