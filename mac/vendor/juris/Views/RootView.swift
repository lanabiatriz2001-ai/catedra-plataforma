import SwiftUI

struct RootView: View {
    @Environment(LibraryStore.self) private var store
    @AppStorage("readingFontFamily") private var readingFontFamily = ""   // rebuild ao trocar a fonte
    @ObservedObject private var clock = JurisClock.shared                 // cronômetro do top bar

    // Top bar no esquema do Cátedra: título + Buscar ⌘K + notificações + cronômetro EM CURSO.
    private var jurisTopBar: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 1) {
                Text("CátedraJURIS").font(.system(size: 15, weight: .bold)).foregroundStyle(Palette.titleInk)
                Text("Vade Mecum de jurisprudência").font(.system(size: 10.5)).foregroundStyle(Palette.secondaryInk)
            }
            Spacer(minLength: 12)
            Button { store.leituraID = nil; store.selectedID = nil; store.selecao = .todos } label: {
                HStack(spacing: 7) {
                    Image(systemName: "magnifyingglass").font(.system(size: 11))
                    Text("Buscar").font(.system(size: 12.5))
                    Text("⌘K").font(.system(size: 10.5, weight: .semibold)).foregroundStyle(Palette.secondaryInk)
                }
                .foregroundStyle(Palette.secondaryInk)
                .padding(.horizontal, 13).padding(.vertical, 7)
                .background(Capsule().fill(Palette.cardBackground))
                .overlay(Capsule().strokeBorder(Palette.hairline, lineWidth: 1))
            }
            .buttonStyle(.plain)
            Button { store.leituraID = nil; store.selectedID = nil; store.selecao = .novidades } label: {
                Image(systemName: store.novidadesNaoVistas > 0 ? "bell.badge.fill" : "bell")
                    .font(.system(size: 13, weight: .medium)).foregroundStyle(Palette.secondaryInk)
                    .frame(width: 34, height: 34)
                    .background(Circle().fill(Palette.cardBackground))
                    .overlay(Circle().strokeBorder(Palette.hairline, lineWidth: 1))
            }
            .buttonStyle(.plain)
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 0) {
                    Text(clock.running ? "EM CURSO" : "ESTUDO").font(.system(size: 8, weight: .heavy)).tracking(0.8)
                        .foregroundStyle(clock.running ? Palette.accent : Palette.secondaryInk)
                    Text(clock.formatted).font(.system(size: 16, weight: .bold).monospacedDigit())
                        .foregroundStyle(Palette.titleInk)
                }
                Button { clock.togglePlay() } label: {
                    Image(systemName: clock.manualPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 11, weight: .bold)).foregroundStyle(.white)
                        .frame(width: 28, height: 28)
                        .background(Circle().fill(clock.manualPlaying ? Palette.secondaryInk : Palette.accent))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 12).padding(.vertical, 6)
            .background(Capsule().fill(Palette.cardBackground))
            .overlay(Capsule().strokeBorder(clock.running ? Palette.accent.opacity(0.45) : Palette.hairline, lineWidth: 1))
        }
        .padding(.horizontal, 20).padding(.vertical, 11)
        .background(Palette.appBackground)
        .overlay(alignment: .bottom) { Rectangle().fill(Palette.hairline).frame(height: 1) }
    }

    var body: some View {
        // Layout da casa (Cátedra/CátedraLEGIS): sidebar navy fixa + páginas de
        // conteúdo com cabeçalho próprio (SectionShell). Lista → clique → leitor
        // de página inteira, como no CátedraLEGIS. Alinhamento .top + frames
        // gulosos evitam o conteúdo "flutuar" centralizado quando a página é curta.
        HStack(alignment: .top, spacing: 0) {
            JurisSidebar()
            conteudo
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                .safeAreaInset(edge: .top, spacing: 0) { jurisTopBar }
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
            case .gradeInformativos: GradeInformativosView()
            case .julgadoDoDia: JulgadoDoDiaView()
            case .provaOral: ProvaOralJurisView()
            case .tjroHub: TJROHubView()
            case .mapas: JurisMapasGaleria()
            case .checklist: JurisChecklistView()
            case .plano: PlanoLeituraJurisView()
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
