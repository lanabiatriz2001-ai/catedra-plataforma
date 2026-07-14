import SwiftUI
import AppKit

/// "Histórico da norma": consolida, dentro da própria norma, a data de promulgação,
/// a cadeia de alterações (com datas) e o acesso às redações anteriores. É a versão
/// factível do "vacatio legis" — nenhuma fonte calcula a vacância, mas datas e
/// redações anteriores são recuperáveis (reference + linha do tempo do Senado +
/// texto guardado/Planalto).
struct HistoricoView: View {
    @EnvironmentObject var store: AppStore
    @Environment(\.dismiss) private var dismiss
    let lawID: UUID
    let lawTitle: String
    let accent: Color
    var onOpenLaw: (UUID) -> Void = { _ in }

    @State private var showPrevious = false

    private var norma: SigenNorma? { store.sigenNorma(for: lawID) }

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: 12) {
                IconBubble(symbol: "clock.arrow.circlepath", color: accent, size: 36)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Histórico da norma").font(.title3.bold())
                    Text(lawTitle).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
                }
                Spacer()
                Button("Fechar") { dismiss() }
            }
            .padding(16)
            Divider()
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    datasSection
                    redacoesSection
                    if let n = norma, !n.timeline.isEmpty { timelineSection(n) }
                }
                .padding(16)
            }
        }
        .frame(width: 660, height: 720)
        .sheet(isPresented: $showPrevious) {
            PreviousTextView(subtitle: previousSubtitle, text: store.loadPreviousText(for: lawID) ?? "")
        }
    }

    // MARK: Datas

    private var datasSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Datas", systemImage: "calendar").font(.headline)
            if let promulgada = store.promulgationText(for: lawID) {
                dateRow("Promulgada em", promulgada, "checkmark.seal")
            }
            if let latest = norma?.timeline.first {
                dateRow("Última alteração", "\(latest.date) — \(latest.norma)", "pencil.line")
            } else if let changed = store.lastChangedDate(for: lawID) {
                dateRow("Última alteração detectada", changed.formatted(date: .long, time: .omitted), "pencil.line")
            }
            if let n = norma, !n.timeline.isEmpty {
                Text("\(n.timeline.count) norma\(n.timeline.count == 1 ? "" : "s") já alteraram este texto (fonte: Senado — Dados Abertos).")
                    .font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    private func dateRow(_ label: String, _ value: String, _ symbol: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Image(systemName: symbol).foregroundStyle(accent).frame(width: 18)
            Text(label + ":").foregroundStyle(.secondary)
            Text(value).fontWeight(.medium).fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .font(.callout)
    }

    // MARK: Redações anteriores

    private var previousSubtitle: String {
        if let d = store.lastChangedDate(for: lawID) {
            return "\(lawTitle) — até \(d.formatted(date: .long, time: .omitted))"
        }
        return lawTitle
    }

    private var redacoesSection: some View {
        // Calculados uma vez (evita fileExists + varredura/regex repetidos por render).
        let hasPrev = store.hasPreviousText(for: lawID)
        let historyURL = store.planaltoHistoryURL(for: lawID).flatMap(URL.init(string:))
        return VStack(alignment: .leading, spacing: 8) {
            Label("Redações anteriores", systemImage: "doc.on.doc").font(.headline)
            if hasPrev {
                Button {
                    showPrevious = true
                } label: {
                    Label("Ver a redação anterior guardada", systemImage: "doc.text")
                }
                .buttonStyle(.bordered)
                Text("Redação imediatamente anterior à última alteração detectada com o app aberto.")
                    .font(.caption).foregroundStyle(.secondary)
            }
            if let historyURL {
                Button {
                    NSWorkspace.shared.open(historyURL)
                } label: {
                    Label("Abrir versão com histórico no Planalto", systemImage: "safari")
                }
                .buttonStyle(.bordered)
                Text("No Planalto, o texto “atualizado” mostra cada alteração com a redação antiga riscada ao lado da nova.")
                    .font(.caption).foregroundStyle(.secondary)
            }
            if !hasPrev && historyURL == nil {
                Text("As redações anteriores desta norma ainda não estão disponíveis. A redação anterior é guardada automaticamente quando o Planalto altera a norma com o app aberto.")
                    .font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    // MARK: Linha do tempo

    private func timelineSection(_ n: SigenNorma) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Linha do tempo de alterações", systemImage: "arrow.triangle.branch").font(.headline)
            ForEach(Array(n.timeline.enumerated()), id: \.offset) { _, entry in
                let target = store.findLaw(refType: LegislativeNote.reference(in: entry.norma)?.type,
                                           refNumber: LegislativeNote.reference(in: entry.norma)?.number)
                HStack(alignment: .top, spacing: 12) {
                    VStack(spacing: 1) {
                        Text(entry.year).font(.callout.weight(.bold).monospacedDigit()).foregroundStyle(accent)
                        if !entry.date.isEmpty { Text(entry.date).font(.system(size: 9)).foregroundStyle(.tertiary) }
                    }
                    .frame(width: 46)
                    Rectangle().fill(accent.opacity(0.25)).frame(width: 2)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(entry.norma).font(.callout.weight(.semibold))
                        if !entry.comment.isEmpty { Text(entry.comment).font(.caption).foregroundStyle(.secondary) }
                        if let target {
                            Button { onOpenLaw(target.id); dismiss() } label: {
                                Label("Abrir na biblioteca", systemImage: "arrow.up.right.square").font(.caption)
                            }
                            .buttonStyle(.borderless)
                        }
                    }
                    Spacer(minLength: 0)
                }
                .padding(.vertical, 6)
                Divider().padding(.leading, 60)
            }
        }
    }
}

/// Visualizador simples (somente leitura) de uma redação anterior guardada.
struct PreviousTextView: View {
    @Environment(\.dismiss) private var dismiss
    let subtitle: String
    let text: String

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Redação anterior").font(.title3.bold())
                    Text(subtitle).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                }
                Spacer()
                Button("Fechar") { dismiss() }
            }
            .padding(16)
            Divider()
            // NSTextView (layout preguiçoso) — um único SwiftUI Text travava a UI
            // com o texto integral de um código (centenas de KB).
            ReadOnlyTextView(text: text.isEmpty ? "Redação anterior indisponível." : text)
        }
        .frame(width: 640, height: 700)
    }
}

/// NSTextView somente-leitura, selecionável — aguenta o texto integral de uma norma
/// (o NSTextView faz layout sob demanda, ao contrário de um SwiftUI Text único).
struct ReadOnlyTextView: NSViewRepresentable {
    let text: String

    func makeNSView(context: Context) -> NSScrollView {
        let textView = NSTextView()
        textView.isEditable = false
        textView.isSelectable = true
        textView.isRichText = false
        textView.drawsBackground = false
        textView.textContainerInset = NSSize(width: 16, height: 14)
        textView.font = NSFont.systemFont(ofSize: 14)
        textView.string = text
        let scroll = NSScrollView()
        scroll.documentView = textView
        scroll.hasVerticalScroller = true
        scroll.drawsBackground = false
        return scroll
    }

    func updateNSView(_ scroll: NSScrollView, context: Context) {
        guard let textView = scroll.documentView as? NSTextView, textView.string != text else { return }
        textView.string = text
    }
}
