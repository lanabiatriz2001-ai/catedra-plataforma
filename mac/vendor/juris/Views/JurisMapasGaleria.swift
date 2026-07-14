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

    private let grid = [GridItem(.adaptive(minimum: 250, maximum: 330), spacing: 14)]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                if entries.isEmpty {
                    vazio
                } else {
                    LazyVGrid(columns: grid, alignment: .leading, spacing: 14) {
                        ForEach(entries) { e in
                            cartao(e)
                        }
                    }
                }
                Color.clear.frame(height: 20)
            }
            .padding(.horizontal, 26).padding(.top, 22)
        }
        .background(Palette.appBackground)
        .sheet(item: $aberto) { e in MapaMentalSheet(entry: e) }
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 8) {
                    Image(systemName: "brain.head.profile").font(.system(size: 15)).foregroundStyle(Palette.accent)
                    Text("Mapas mentais").font(Typo.serifTitle(22, .bold)).foregroundStyle(Palette.titleInk)
                    Text("\(entries.count)")
                        .font(.system(size: 11, weight: .bold)).monospacedDigit()
                        .padding(.horizontal, 7).padding(.vertical, 2)
                        .background(Capsule().fill(Palette.accent))
                        .foregroundStyle(.white)
                }
                Text("Recuperados da sua atividade + todos os que você abrir. Cada cartão reabre o mapa na hora.")
                    .font(.system(size: 12)).foregroundStyle(Palette.secondaryInk)
            }
            Spacer()
            if !entries.isEmpty {
                Button { exportarTodos() } label: {
                    Label(exportando ? "Exportando… \(exportados)/\(entries.count)" : "Exportar todos (PNG)…",
                          systemImage: "square.and.arrow.up.on.square")
                        .font(.system(size: 11.5, weight: .medium))
                }
                .controlSize(.small)
                .disabled(exportando)
                .help("Salva um PNG de cada mapa numa pasta à sua escolha")
            }
        }
    }

    private var vazio: some View {
        VStack(spacing: 10) {
            Image(systemName: "brain.head.profile").font(.system(size: 38, weight: .thin))
                .foregroundStyle(Palette.accent.opacity(0.7))
            Text("Nenhum mapa registrado ainda").font(Typo.serifTitle(16, .semibold)).foregroundStyle(Palette.titleInk)
            Text("Abra um verbete e use Analisar → Mapa mental — ele aparece aqui automaticamente.")
                .font(.system(size: 12)).foregroundStyle(Palette.secondaryInk)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 60)
    }

    private func cartao(_ e: JurisEntry) -> some View {
        Button { aberto = e } label: {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 6) {
                    FonteBadge(fonte: e.fonteKind, compact: true)
                    Spacer()
                    Image(systemName: "brain.head.profile").font(.system(size: 10)).foregroundStyle(Palette.accent)
                }
                Text(e.titulo)
                    .font(Typo.serifTitle(14.5, .bold)).foregroundStyle(Palette.titleInk)
                    .lineLimit(2).multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                Text(e.enunciado)
                    .font(Typo.serifBody(11)).foregroundStyle(Palette.bodyInk.opacity(0.85))
                    .lineLimit(2).multilineTextAlignment(.leading)
                Spacer(minLength: 0)
                HStack {
                    if let r = e.ramoDireito {
                        Text(r).font(.system(size: 9.5, weight: .medium)).foregroundStyle(Palette.accent).lineLimit(1)
                    }
                    Spacer()
                    Text("abrir mapa ›").font(.system(size: 9.5, weight: .semibold)).foregroundStyle(Palette.secondaryInk)
                }
            }
            .padding(13)
            .frame(height: 130, alignment: .topLeading)
            .frame(maxWidth: .infinity)
            .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: max(6, ThemeState.t.radius)))
            .overlay(RoundedRectangle(cornerRadius: max(6, ThemeState.t.radius)).strokeBorder(Palette.hairline, lineWidth: 1))
            .shadow(color: .black.opacity(0.05), radius: 4, y: 1)
            .contextMenu {
                Button(role: .destructive) { store.removerMapa(e.id) } label: {
                    Label("Remover da galeria", systemImage: "trash")
                }
            }
        }
        .buttonStyle(.plain)
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
