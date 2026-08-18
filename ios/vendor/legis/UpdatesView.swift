import SwiftUI

struct UpdatesListView: View {
    @EnvironmentObject var store: AppStore
    @Binding var selection: UUID?

    private var lastCheckText: String {
        "Última verificação: " + (store.lastCheckDate?.formatted(date: .abbreviated, time: .shortened) ?? "ainda não realizada")
    }

    var body: some View {
        SectionShell(icon: "bell.badge", title: "Atualizações",
                     subtitle: "Quando o Planalto altera uma norma monitorada, o app avisa e registra o que mudou aqui. \(lastCheckText).",
                     count: store.updates.isEmpty ? nil : store.updates.count) {
            if store.updates.isEmpty {
                LegisEmpty(icon: "bell.slash", title: "Nenhuma alteração registrada",
                           message: "Quando uma norma que você acompanha for alterada no Planalto, a mudança aparece aqui com o comparativo do que entrou e saiu.")
            } else {
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(store.updates) { event in
                            Button { selection = event.id } label: { updateRow(event) }
                                .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16).padding(.vertical, 14)
                }
            }
        }
    }

    private func updateRow(_ event: UpdateEvent) -> some View {
        HStack(spacing: 12) {
            IconBubble(symbol: "clock.arrow.circlepath", color: ThemeState.t.accent, size: 34)
            VStack(alignment: .leading, spacing: 3) {
                Text(event.lawTitle).font(.system(size: 13.5, weight: .semibold)).foregroundStyle(AppTheme.ink).lineLimit(2)
                Text(event.date.formatted(date: .long, time: .shortened))
                    .font(.system(size: 11.5)).foregroundStyle(AppTheme.secondaryInk)
                HStack(spacing: 8) {
                    Label("\(event.addedParagraphs.count) novos", systemImage: "plus.circle.fill")
                        .font(.system(size: 10.5, weight: .medium))
                        .foregroundStyle(Color(hex: 0x16A34A))
                    Label("\(event.removedParagraphs.count) removidos", systemImage: "minus.circle.fill")
                        .font(.system(size: 10.5, weight: .medium))
                        .foregroundStyle(Color(hex: 0xDC2626))
                }
                .padding(.top, 1)
            }
            Spacer(minLength: 6)
            Image(systemName: "chevron.right").font(.system(size: 11, weight: .semibold))
                .foregroundStyle(AppTheme.secondaryInk.opacity(0.6))
        }
        .padding(.horizontal, 13).padding(.vertical, 11)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: AppTheme.compactRadius, style: .continuous).fill(AppTheme.cardBackground))
        .overlay(RoundedRectangle(cornerRadius: AppTheme.compactRadius, style: .continuous).strokeBorder(AppTheme.hairline, lineWidth: 1))
        .contentShape(Rectangle())
    }
}

struct UpdateDetailView: View {
    let event: UpdateEvent
    let openLaw: (UUID) -> Void
    @AppStorage("updateViewMode") private var viewMode = "tabela"   // "tabela" | "lista"

    private var hasDiff: Bool { !event.addedParagraphs.isEmpty || !event.removedParagraphs.isEmpty }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                header
                if !hasDiff {
                    Text("A página mudou, mas não foi possível isolar trechos específicos (pode ser alteração de formatação).")
                        .foregroundStyle(.secondary)
                } else if viewMode == "tabela" {
                    comparison
                } else {
                    lists
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(AppTheme.pageBackground)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(event.lawTitle).font(.title2.weight(.semibold))
            Text("Alteração detectada em \(event.date.formatted(date: .long, time: .shortened))")
                .font(.subheadline).foregroundStyle(.secondary)
            HStack(spacing: 10) {
                Button("Abrir texto atual da norma") { openLaw(event.lawID) }
                    .buttonStyle(.borderedProminent)
                Spacer()
                if hasDiff {
                    Picker("", selection: $viewMode) {
                        Label("Tabela", systemImage: "rectangle.split.2x1").tag("tabela")
                        Label("Lista", systemImage: "list.bullet").tag("lista")
                    }
                    .pickerStyle(.segmented)
                    .fixedSize()
                    .help("Tabela comparativa (redação anterior × atual) ou listas separadas")
                }
            }
            if hasDiff {
                HStack(spacing: 14) {
                    Label("\(event.addedParagraphs.count) incluídos/alterados", systemImage: "plus.circle.fill")
                        .foregroundStyle(.green)
                    Label("\(event.removedParagraphs.count) removidos", systemImage: "minus.circle.fill")
                        .foregroundStyle(.red)
                }
                .font(.caption)
            }
        }
        .padding(14)
        .appSurface()
    }

    private var comparison: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Comparativo dos trechos que mudaram — o que saiu à esquerda, o que entrou à direita; as palavras alteradas ficam destacadas.")
                .font(.caption).foregroundStyle(.secondary)
            UpdateComparisonTable(added: event.addedParagraphs, removed: event.removedParagraphs)
        }
    }

    private var lists: some View {
        VStack(alignment: .leading, spacing: 14) {
            if !event.addedParagraphs.isEmpty {
                GroupBox {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(Array(event.addedParagraphs.enumerated()), id: \.offset) { _, paragraph in
                            Text(paragraph)
                                .textSelection(.enabled)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(6)
                                .background(RoundedRectangle(cornerRadius: 4).fill(.green.opacity(0.12)))
                        }
                    }
                } label: {
                    Label("Trechos adicionados ou alterados (\(event.addedParagraphs.count))", systemImage: "plus.circle.fill")
                        .foregroundStyle(.green)
                }
            }
            if !event.removedParagraphs.isEmpty {
                GroupBox {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(Array(event.removedParagraphs.enumerated()), id: \.offset) { _, paragraph in
                            Text(paragraph)
                                .textSelection(.enabled)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(6)
                                .background(RoundedRectangle(cornerRadius: 4).fill(.red.opacity(0.12)))
                        }
                    }
                } label: {
                    Label("Trechos removidos (\(event.removedParagraphs.count))", systemImage: "minus.circle.fill")
                        .foregroundStyle(.red)
                }
            }
        }
    }
}
