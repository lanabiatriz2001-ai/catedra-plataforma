import WidgetKit
import SwiftUI

// Lê o estado que o app Cátedra grava no App Group (host → evaluateJavaScript → suite).
private let kGroup = "group.com.catedra.desktop"

struct CatedraEntry: TimelineEntry {
    let date: Date
    let diasProva: Int      // -1 = sem data de prova
    let revisoes: Int
    let metaPct: Int
    let streak: Int
    let proximo: String
}

struct Provider: TimelineProvider {
    private func read() -> CatedraEntry {
        let d = UserDefaults(suiteName: kGroup)
        let dias = (d?.object(forKey: "diasProva") as? Int) ?? -1
        return CatedraEntry(date: Date(),
                            diasProva: dias,
                            revisoes: d?.integer(forKey: "revisoes") ?? 0,
                            metaPct: d?.integer(forKey: "metaPct") ?? 0,
                            streak: d?.integer(forKey: "streak") ?? 0,
                            proximo: d?.string(forKey: "proximo") ?? "")
    }
    func placeholder(in context: Context) -> CatedraEntry {
        CatedraEntry(date: Date(), diasProva: 84, revisoes: 3, metaPct: 62, streak: 5, proximo: "Constitucional")
    }
    func getSnapshot(in context: Context, completion: @escaping (CatedraEntry) -> Void) { completion(read()) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<CatedraEntry>) -> Void) {
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
        completion(Timeline(entries: [read()], policy: .after(next)))
    }
}

private let navy = Color(red: 0.12, green: 0.16, blue: 0.28)
private let accent = Color(red: 0.20, green: 0.33, blue: 0.85)

private struct Stat: View {
    let value: String, label: String, tint: Color
    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(value).font(.system(size: 17, weight: .bold, design: .rounded)).foregroundStyle(tint)
            Text(label).font(.system(size: 9.5, weight: .medium)).foregroundStyle(.white.opacity(0.6))
        }
    }
}

struct CatedraWidgetView: View {
    var entry: CatedraEntry
    @Environment(\.widgetFamily) var family

    private var diasStr: String { entry.diasProva < 0 ? "—" : "\(entry.diasProva)" }

    var body: some View {
        if family == .systemSmall { small } else { medium }
    }

    private var small: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 5) {
                Image(systemName: "graduationcap.fill").font(.system(size: 11)).foregroundStyle(.white.opacity(0.85))
                Text("Cátedra").font(.system(size: 11, weight: .semibold)).foregroundStyle(.white.opacity(0.85))
                Spacer()
                if entry.streak > 0 {
                    Text("🔥\(entry.streak)").font(.system(size: 11, weight: .semibold)).foregroundStyle(.white)
                }
            }
            Spacer(minLength: 0)
            Text(diasStr).font(.system(size: 40, weight: .bold, design: .rounded)).foregroundStyle(.white)
            Text(entry.diasProva < 0 ? "defina a data da prova" : "dias até a prova")
                .font(.system(size: 10)).foregroundStyle(.white.opacity(0.6))
            Spacer(minLength: 0)
            HStack {
                Stat(value: "\(entry.revisoes)", label: "revisões", tint: entry.revisoes > 0 ? Color(red: 1, green: 0.7, blue: 0.4) : .white)
                Spacer()
                Stat(value: "\(entry.metaPct)%", label: "meta/sem", tint: .white)
            }
        }
        .padding(14)
    }

    private var medium: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 5) {
                    Image(systemName: "graduationcap.fill").font(.system(size: 12)).foregroundStyle(.white.opacity(0.85))
                    Text("Cátedra").font(.system(size: 12, weight: .semibold)).foregroundStyle(.white.opacity(0.85))
                }
                Spacer(minLength: 0)
                Text(diasStr).font(.system(size: 46, weight: .bold, design: .rounded)).foregroundStyle(.white)
                Text(entry.diasProva < 0 ? "sem data de prova" : "dias até a prova")
                    .font(.system(size: 11)).foregroundStyle(.white.opacity(0.6))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            VStack(alignment: .leading, spacing: 12) {
                Stat(value: "\(entry.revisoes)", label: "revisões pendentes", tint: entry.revisoes > 0 ? Color(red: 1, green: 0.7, blue: 0.4) : .white)
                Stat(value: "\(entry.metaPct)%", label: "meta da semana", tint: .white)
                Stat(value: entry.streak > 0 ? "🔥 \(entry.streak)" : "0", label: "dias de ofensiva", tint: .white)
                if !entry.proximo.isEmpty {
                    Stat(value: entry.proximo, label: "próximo bloco", tint: .white.opacity(0.9))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(16)
    }
}

struct CatedraWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "CatedraWidget", provider: Provider()) { entry in
            CatedraWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    LinearGradient(colors: [navy, accent.opacity(0.55)], startPoint: .topLeading, endPoint: .bottomTrailing)
                }
        }
        .configurationDisplayName("Cátedra")
        .description("Seu estudo de hoje: dias até a prova, revisões, meta e ofensiva.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct CatedraWidgetBundle: WidgetBundle {
    var body: some Widget { CatedraWidget() }
}
