import SwiftUI

/// Comparativo das redações de um artigo: a vigente (destacada) e as anteriores
/// (TACHADAS + "não vigente"). No Estudo o leitor mostra só a vigente; este
/// comparativo (botão) reúne o histórico — inclusive redações antigas/revogadas
/// CURADAS de fonte oficial que o texto consolidado não preserva.
struct RedactionComparisonView: View {
    let articleLabel: String
    let entries: [Entry]          // vigente primeiro; depois anteriores (nova → antiga)
    let accent: Color
    @Environment(\.dismiss) private var dismiss
    @AppStorage("readerFontSize") private var fontSize = 16.0

    struct Entry: Identifiable {
        let id = UUID()
        let source: String        // "EC 90/2015" · "Redação original (1940)"
        let status: Status
        let lines: [String]       // 1ª linha traz o rótulo ("Art. N."); classificado p/ render
        enum Status { case vigente, atualRevogado, anterior }
        var isCurrent: Bool { status != .anterior }
    }

    private var previousCount: Int { entries.filter { !$0.isCurrent }.count }

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider()
            ScrollView {
                VStack(spacing: 0) {
                    ForEach(Array(entries.enumerated()), id: \.element.id) { idx, row in
                        if idx > 0 { Divider() }
                        RedactionRow(entry: row, accent: accent, fontSize: fontSize)
                    }
                }
            }
        }
        .frame(width: 780, height: 640)
        .background(AppTheme.pageBackground)
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 3) {
                Label("Redações do \(articleLabel)", systemImage: "clock.arrow.circlepath")
                    .font(.title3.weight(.bold)).foregroundStyle(AppTheme.ink)
                Text("Comparativo — a vigente e \(previousCount) \(previousCount == 1 ? "versão anterior" : "versões anteriores"). As antigas ficam tachadas (não vigentes).")
                    .font(.caption).foregroundStyle(AppTheme.secondaryInk)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer()
            Button("Fechar") { dismiss() }.keyboardShortcut(.cancelAction)
        }
        .padding(16)
    }

    // Extrai um rótulo curto da origem de uma redação de um LawUnit (a partir da
    // nota entre parênteses): "…Emenda Constitucional nº 90, de 2015" → "EC 90/2015";
    // sem nota (texto original) → "Redação original".
    static func source(for unit: LawUnit) -> String {
        let text = unit.lines.joined(separator: " ")
        let ns = text as NSString
        let full = NSRange(location: 0, length: ns.length)
        let patterns = ["Reda[cç][aã]o dada pela ([^)]+)",
                        "Nova reda[cç][aã]o dada pela ([^)]+)",
                        "Inclu[ií]d[oa] pela ([^)]+)"]
        for p in patterns {
            if let re = try? NSRegularExpression(pattern: p, options: [.caseInsensitive]),
               let m = re.matches(in: text, range: full).last {
                return shorten(ns.substring(with: m.range(at: 1)))
            }
        }
        return "Redação original"
    }

    private static func shorten(_ note: String) -> String {
        let ns = note as NSString
        let full = NSRange(location: 0, length: ns.length)
        if let re = try? NSRegularExpression(pattern: "Emenda Constitucional( de Revis[aã]o)?\\s*n[ºo°]?\\s*([\\d.]+),?\\s*de\\s*(\\d{4})", options: [.caseInsensitive]),
           let m = re.firstMatch(in: note, range: full) {
            let revis = m.range(at: 1).location != NSNotFound
            return "\(revis ? "ECR" : "EC") \(ns.substring(with: m.range(at: 2)))/\(ns.substring(with: m.range(at: 3)))"
        }
        if let re = try? NSRegularExpression(pattern: "Lei[^\\d]*n[ºo°]?\\s*([\\d.]+),?\\s*de\\s*(\\d{4})", options: [.caseInsensitive]),
           let m = re.firstMatch(in: note, range: full) {
            return "Lei \(ns.substring(with: m.range(at: 1)))/\(ns.substring(with: m.range(at: 2)))"
        }
        return note
    }
}

/// Uma linha do comparativo: coluna de origem à esquerda + texto da redação à direita.
private struct RedactionRow: View {
    let entry: RedactionComparisonView.Entry
    let accent: Color
    let fontSize: Double

    // Reconstrói LawUnits fake só p/ reaproveitar o classificador (caput/incisos/§).
    private var kinds: [LawLineKind] {
        LawParser.classify(LawUnit(id: 0, key: "", label: firstLabel, context: nil,
                                   lines: entry.lines, location: 0, length: 0))
    }
    // Rótulo p/ o classificador cortar do caput (1ª linha começa por "Art. N.").
    private var firstLabel: String {
        let first = entry.lines.first ?? ""
        let ns = first as NSString
        if let re = try? NSRegularExpression(pattern: "^(Art(?:igo)?[\\s.]*\\d[\\d.]*[ºo°]?)"),
           let m = re.firstMatch(in: first, range: NSRange(location: 0, length: ns.length)) {
            return ns.substring(with: m.range(at: 1))
        }
        return ""
    }

    // Só as redações ANTERIORES ficam tachadas; a atual (mesmo revogada) não.
    private var struck: Bool { entry.status == .anterior }

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                switch entry.status {
                case .vigente:        tag("VIGENTE", .white, Color.green)
                case .atualRevogado:  tag("REVOGADO", .white, Color.red)
                case .anterior:       tag("NÃO VIGENTE", Color.red, Color.red.opacity(0.14))
                }
                Text(entry.source)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(entry.isCurrent ? AppTheme.ink : AppTheme.secondaryInk)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(width: 150, alignment: .leading)

            VStack(alignment: .leading, spacing: 7) {
                ForEach(Array(kinds.enumerated()), id: \.offset) { _, kind in
                    UnitLine(kind: kind, accent: accent, fontSize: fontSize - 1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            // Redações anteriores: TACHADAS e esmaecidas — nunca lidas como vigentes.
            .strikethrough(struck, color: AppTheme.secondaryInk)
            .opacity(struck ? 0.7 : 1)
        }
        .padding(16)
        .background(entry.status == .vigente ? accent.opacity(0.06)
                    : entry.status == .atualRevogado ? Color.red.opacity(0.05) : Color.clear)
    }

    private func tag(_ text: String, _ fg: Color, _ bg: Color) -> some View {
        Text(text).font(.system(size: 10, weight: .heavy)).tracking(0.5)
            .foregroundStyle(fg)
            .padding(.horizontal, 8).padding(.vertical, 3)
            .background(Capsule().fill(bg))
    }
}
