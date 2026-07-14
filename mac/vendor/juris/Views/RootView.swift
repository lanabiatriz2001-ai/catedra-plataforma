import SwiftUI

struct RootView: View {
    @Environment(LibraryStore.self) private var store
    @AppStorage("readingFontFamily") private var readingFontFamily = ""   // rebuild ao trocar a fonte

    var body: some View {
        // Layout da casa (Cátedra/CátedraLEGIS): sidebar navy fixa + páginas de
        // conteúdo com cabeçalho próprio (SectionShell). Lista → clique → leitor
        // de página inteira, como no CátedraLEGIS. Alinhamento .top + frames
        // gulosos evitam o conteúdo "flutuar" centralizado quando a página é curta.
        HStack(alignment: .top, spacing: 0) {
            JurisSidebar()
            conteudo
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .background(Palette.appBackground)
        .tint(Palette.accent)
    }

    @ViewBuilder
    private var conteudo: some View {
        if store.isLoading {
            ProgressView("Carregando jurisprudência…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Palette.appBackground)
        } else if let id = store.leituraID ?? store.selectedID, let entry = store.byId[id] {
            LeitorCheio(entry: entry)
        } else {
            switch store.selecao {
            case .inicio: HomeView()
            case .tjroHub: TJROHubView()
            case .mapas: JurisMapasGaleria()
            case .checklist: JurisChecklistView()
            case .central(let c): JurisCentralView(central: c)
            case .tribunal(let id): TribunalCentralView(tribunalID: id)
            case .ramosHub: RamosHubView()
            case .ramoDetalhe(let f): RamoDetalheView(filtro: f)
            default: EntryListView()
            }
        }
    }
}

/// Leitura de página inteira de um verbete (a partir de qualquer lista/página).
struct LeitorCheio: View {
    let entry: JurisEntry
    @Environment(LibraryStore.self) private var store

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                Button {
                    store.leituraID = nil
                    store.selectedID = nil
                } label: {
                    Label("Voltar", systemImage: "chevron.left").font(.system(size: 12.5, weight: .medium))
                }
                .buttonStyle(.borderless)
                Spacer()
                Button { store.navegarLeitura(-1) } label: { Image(systemName: "chevron.up") }
                    .buttonStyle(.borderless).disabled(!store.temAnterior())
                    .keyboardShortcut(.leftArrow, modifiers: .command)
                    .help("Anterior (⌘←)")
                Button { store.navegarLeitura(1) } label: { Image(systemName: "chevron.down") }
                    .buttonStyle(.borderless).disabled(!store.temProximo())
                    .keyboardShortcut(.rightArrow, modifiers: .command)
                    .help("Próximo (⌘→)")
            }
            .padding(.horizontal, 16).padding(.vertical, 8)
            .background(Palette.sidebarBackground)
            .overlay(alignment: .bottom) { Rectangle().fill(Palette.hairline).frame(height: 1) }

            NavigationStack {
                EntryDetailView(entry: entry)
            }
        }
        .background(Palette.detailBackground)
    }
}
