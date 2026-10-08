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
            if familia == .accessoryCircular { ProvaCirculo(h: h) }
            else if familia == .accessoryRectangular {
                VStack(alignment: .leading, spacing: 2) {
                    Text(h.diasProva.map { "\($0) dias até a prova" } ?? "Defina a data da prova").font(.system(size: 15, weight: .bold)).lineLimit(1)
                    Text(h.nomeProva).font(.system(size: 12)).lineLimit(1)
                }.widgetAccentable()
            } else { sistema(h) }
            #else
            sistema(h)
            #endif
        } else { EstadoEntrar() }
    }
    @ViewBuilder func sistema(_ h: WidgetHoje) -> some View {
        switch familia {
        case .systemMedium: ProvaAmpla(h: h, grande: false)
        case .systemLarge: ProvaAmpla(h: h, grande: true)
        default: ProvaPequeno(h: h)
        }
    }
}

struct ProvaAmpla: View {
    let h: WidgetHoje
    let grande: Bool
    var body: some View {
        let tinta: Color = h.baixa ? .primary : .white
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top, spacing: 18) {
                ProvaPequeno(h: h).frame(maxWidth: .infinity)
                VStack(alignment: .leading, spacing: 8) {
                    Eyebrow(texto: "Sua preparação")
                    Text(h.nomeProva.isEmpty ? "Cadastre seu concurso no Edital" : h.nomeProva)
                        .font(.system(size: 16, weight: .heavy, design: .rounded)).lineLimit(grande ? 4 : 3).minimumScaleFactor(0.8)
                    Spacer(minLength: 0)
                    Text("\(Estilo.horas(h.semanaMin)) nesta semana").font(.system(size: 12, weight: .semibold)).lineLimit(2)
                }.frame(maxWidth: .infinity, alignment: .leading)
            }
            if grande {
                BarraProgresso(pct: h.semanaPct, tinta: tinta, rotulo: "Meta da semana")
                Text(h.metaSemanaMin > 0 ? "Meta semanal: \(Estilo.horas(h.metaSemanaMin))" : "Defina uma meta no app")
                    .font(.system(size: 13, weight: .semibold))
                Eyebrow(texto: "Próximo estudo")
                if let b = h.proximo { LinhaBloco(b: b, tinta: tinta) }
                else { Text("Monte seu ciclo de estudo").font(.system(size: 13)) }
                Spacer(minLength: 0)
                RotuloVelho(h: h, tinta: tinta)
            }
        }.foregroundStyle(tinta)
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
            else { sistema(h) }
            #else
            sistema(h)
            #endif
        } else { EstadoEntrar() }
    }
    @ViewBuilder func sistema(_ h: WidgetHoje) -> some View {
        switch familia {
        case .systemLarge: SemanaGrande(h: h)
        case .systemMedium: SemanaMedio(h: h)
        default: SemanaPequeno(h: h)
        }
    }
}

struct SemanaGrande: View {
    let h: WidgetHoje
    var body: some View {
        let tinta: Color = h.baixa ? .primary : .white
        VStack(alignment: .leading, spacing: 14) {
            Eyebrow(texto: "Sua semana de estudo")
            HStack(spacing: 16) {
                AnelMeta(pct: h.semanaPct, tinta: tinta, espessura: 8).frame(width: 88, height: 88)
                VStack(alignment: .leading, spacing: 6) {
                    Text(Estilo.horas(h.semanaMin)).font(Estilo.numero(30)).minimumScaleFactor(0.7).lineLimit(1)
                    Text(h.metaSemanaMin > 0 ? "de \(Estilo.horas(h.metaSemanaMin))" : "Defina a meta semanal").font(.system(size: 13, weight: .semibold))
                }
            }
            BarrasSemana(dias: h.semana, meta: h.metaHojeMin, tinta: tinta).frame(maxHeight: .infinity)
            HStack {
                Text("Hoje: \(Estilo.horas(h.minHoje))").font(.system(size: 13, weight: .bold))
                Spacer(minLength: 0)
                RotuloVelho(h: h, tinta: tinta)
            }
        }.foregroundStyle(tinta)
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
        HStack(alignment: .bottom, spacing: 4) {
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
                    Text(d.rotulo).font(.system(size: 11, weight: d.ehHoje ? .heavy : .medium)).foregroundStyle(tinta).lineLimit(1).fixedSize()
                }
            }
        }
        .accessibilityElement().accessibilityLabel("Minutos estudados em cada dia da semana")
        .accessibilityValue(dias.map { "\($0.rotulo) \($0.min) min" }.joined(separator: ", "))
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
        .accessibilityElement().accessibilityLabel(h.diasProva.map { ($0 == 1 ? "1 dia até a prova" : "\($0) dias até a prova") } ?? "Sem data de prova")
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
