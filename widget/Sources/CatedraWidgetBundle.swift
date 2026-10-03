import WidgetKit
import SwiftUI

// A extensão de widgets do Cátedra (Mac, iPad, iPhone). Dados e contas: ios/vendor/widget. Telas: WidgetTelas*.swift.
// Spec: docs/superpowers/specs/2026-10-01-widgets-design.md.

enum Familias {
    #if os(iOS)
    static let agora: [WidgetFamily] = [.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryInline]
    static let prova: [WidgetFamily] = [.systemSmall, .accessoryCircular]
    static let semana: [WidgetFamily] = [.systemSmall, .systemMedium, .accessoryCircular]
    #else
    static let agora: [WidgetFamily] = [.systemSmall, .systemMedium, .systemLarge]
    static let prova: [WidgetFamily] = [.systemSmall]
    static let semana: [WidgetFamily] = [.systemSmall, .systemMedium]
    #endif
    static let dodia: [WidgetFamily] = [.systemMedium, .systemLarge]
    static let painel: [WidgetFamily] = [.systemExtraLarge]
}

struct CatedraWidgetAgora: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "agora", provider: ProvedorCatedra()) { TelaAgora(e: $0) }
            .configurationDisplayName("Estudar agora")
            .description("O próximo bloco do ciclo, a meta de hoje e as revisões vencidas.")
            .supportedFamilies(Familias.agora)
    }
}
struct CatedraWidgetProva: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "prova", provider: ProvedorCatedra()) { TelaProva(e: $0) }
            .configurationDisplayName("Prova")
            .description("Quantos dias faltam para a prova.")
            .supportedFamilies(Familias.prova)
    }
}
struct CatedraWidgetSemana: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "semana", provider: ProvedorCatedra()) { TelaSemana(e: $0) }
            .configurationDisplayName("Semana")
            .description("A meta da semana, os minutos de cada dia e a ofensiva.")
            .supportedFamilies(Familias.semana)
    }
}
struct CatedraWidgetDoDia: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "dodia", provider: ProvedorCatedra()) { TelaDoDia(e: $0) }
            .configurationDisplayName("Lei do dia")
            .description("Um artigo ou uma súmula que cai em prova, um por dia.")
            .supportedFamilies(Familias.dodia)
    }
}
struct CatedraWidgetPainel: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "painel", provider: ProvedorCatedra()) { TelaPainel(e: $0) }
            .configurationDisplayName("Painel")
            .description("Estudar agora, prova, semana e a lei do dia num quadro só.")
            .supportedFamilies(Familias.painel)
    }
}

@main
struct CatedraWidgets: WidgetBundle {
    var body: some Widget {
        CatedraWidgetAgora()
        CatedraWidgetProva()
        CatedraWidgetSemana()
        CatedraWidgetDoDia()
        CatedraWidgetPainel()
    }
}
