import SwiftUI

/// Galeria "Mapas mentais" — todos os mapas feitos, recuperados e futuros.
/// O mapa é DERIVADO do verbete (nota curada/enunciado), então cada cartão
/// reabre o mapa idêntico na hora; dá para exportar todos em PNG de uma vez.
struct JurisMapasGaleria: View {
    @Environment(LibraryStore.self) private var store
    @State private var aberto: JurisEntry?
    @State private var exportando = false
    @State private var exportados = 0

    private var entries: [JurisEntry] { store.mapasEntries }

    var body: some View {
        SectionShell(icon: Selecao.mapas.simbolo, title: Selecao.mapas.titulo,
                     subtitle: "Recuperados da sua atividade + todos os que você abrir. Cada cartão reabre o mapa na hora.",
                     count: entries.count,
                     trailing: entries.isEmpty ? nil : AnyView(botaoExportar)) {
            Group {
                if entries.isEmpty {
                    LegisEmpty(icon: "brain.head.profile", title: "Nenhum mapa registrado ainda",
                               message: "Abra um verbete e escolha “Mapa mental / fluxograma” no menu de ferramentas do leitor — ele aparece aqui automaticamente.")
                } else {
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 8) {
                            ForEach(entries) { e in
                                CartaoJuris(entry: e, estilo: .row, acao: { aberto = e }, rodape: "abrir mapa ›")
                                    .contextMenu {
                                        Button(role: .destructive) { store.removerMapa(e.id) } label: {
                                            Label("Remover da galeria", systemImage: "trash")
                                        }
                                    }
                            }
                            Color.clear.frame(height: 20)
                        }
                        .padding(.horizontal, 26).padding(.top, 20)
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .sheet(item: $aberto) { e in MapaMentalSheet(entry: e) }
    }

    private var botaoExportar: some View {
        Button { exportarTodos() } label: {
            Label(exportando ? "Exportando… \(exportados)/\(entries.count)" : "Exportar todos (PNG)…",
                  systemImage: "square.and.arrow.up.on.square")
                .font(.system(size: 11.5, weight: .medium))
        }
        .controlSize(.small)
        .disabled(exportando)
        .help("Salva um PNG de cada mapa numa pasta à sua escolha")
    }

    // Exporta um PNG de cada mapa para uma pasta escolhida pela usuária.
    private func exportarTodos() {
        let panel = NSOpenPanel()
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.canCreateDirectories = true
        panel.prompt = "Exportar aqui"
        panel.message = "Escolha a pasta onde salvar os \(entries.count) mapas mentais (PNG)."
        guard panel.runModal() == .OK, let dir = panel.url else { return }
        exportando = true; exportados = 0
        let alvo = entries
        Task { @MainActor in
            for e in alvo {
                let nota = MapaMentalView.notaEfetiva(e, curada: store.notaApp(for: e.id))
                if let png = Exporter.mapaPNG(e, nota) {
                    let nome = e.titulo.replacingOccurrences(of: "/", with: "-")
                        .replacingOccurrences(of: " ", with: "_").prefix(80)
                    try? png.write(to: dir.appendingPathComponent("mapa_\(nome).png"))
                }
                exportados += 1
            }
            exportando = false
        }
    }
}
