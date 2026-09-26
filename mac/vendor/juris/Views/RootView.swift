import SwiftUI

struct RootView: View {
    @Environment(LibraryStore.self) private var store
    @AppStorage("readingFontFamily") private var readingFontFamily = ""   // rebuild ao trocar a fonte
    @ObservedObject private var clock = JurisClock.shared                 // cronômetro do top bar

    /// Onde estou: título da seleção atual (a marca "CátedraJURIS" já está na sidebar —
    /// repetir aqui era o mesmo texto duas vezes na mesma tela).
    private var ondeEstou: (titulo: String, sub: String) {
        if let id = store.leituraID ?? store.selectedID, let e = store.byId[id] {
            return (e.titulo, e.fonteKind.nome)
        }
        switch store.selecao {
        case .tribunal(let id): return (store.tribunal(id)?.nome ?? "Central do tribunal", "Tribunais Específicos")
        case .colecao(let id): return (store.colecoes.first { $0.id == id }?.nome ?? "Coleção", "Minhas coleções")
        default: return (store.selecao.titulo, "CátedraJURIS")
        }
    }

    // Top bar no esquema do Cátedra: onde estou + Buscar ⌘K + notificações + cronômetro EM CURSO.
    private var jurisTopBar: some View {
        let onde = ondeEstou
        return HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 1) {
                Text(onde.titulo).font(DS.interface(15, .bold)).foregroundStyle(Palette.titleInk).lineLimit(1)
                Text(onde.sub).font(DS.interface(10.5)).foregroundStyle(Palette.secondaryInk).lineLimit(1)
            }
            Spacer(minLength: 12)
            Button { store.ir(.todos) } label: {
                HStack(spacing: 7) {
                    Image(systemName: "magnifyingglass").font(DS.interface(11))
                    Text("Buscar").font(DS.interface(12.5))
                    Text("⌘K").font(DS.interface(10.5, .semibold)).foregroundStyle(Palette.secondaryInk)
                }
                .foregroundStyle(Palette.secondaryInk)
                .padding(.horizontal, 13).padding(.vertical, 7)
                .background(Capsule().fill(Palette.cardBackground))
                .overlay(Capsule().strokeBorder(Palette.hairline, lineWidth: 1))
            }
            .buttonStyle(.plain)
            Button { store.ir(.novidades) } label: {
                Image(systemName: store.novidadesNaoVistas > 0 ? "bell.badge.fill" : "bell")
                    .font(DS.interface(13, .medium)).foregroundStyle(Palette.secondaryInk)
                    .frame(width: 34, height: 34)
                    .background(Circle().fill(Palette.cardBackground))
                    .overlay(Circle().strokeBorder(Palette.hairline, lineWidth: 1))
            }
            .buttonStyle(.plain)
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 0) {
                    Text(clock.running ? "EM CURSO" : "ESTUDO").font(DS.interface(8, .heavy)).tracking(0.8)
                        .foregroundStyle(clock.running ? Palette.accent : Palette.secondaryInk)
                    Text(clock.formatted).font(DS.interface(16, .bold).monospacedDigit())
                        .foregroundStyle(Palette.titleInk)
                }
                Button { clock.togglePlay() } label: {
                    Image(systemName: clock.manualPlaying ? "pause.fill" : "play.fill")
                        .font(DS.interface(11, .bold)).foregroundStyle(.white)
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
        } else if store.loadError != nil || store.entries.isEmpty {
            /* A falha de carga era 100% silenciosa: loadError era atribuído e nenhuma
               view o exibia — o app abria vazio, sem explicação. Linguagem de produto,
               sem nome de arquivo: o detalhe técnico fica no log. */
            VStack(spacing: 10) {
                Text("O acervo de jurisprudência não pôde ser aberto.")
                    .font(DS.interface(15, .semibold))
                Text("Feche e abra o aplicativo. Se continuar assim, reinstale o CátedraJURIS — o acervo vem dentro dele.")
                    .font(DS.interface(12.5))
                    .foregroundStyle(Palette.secondaryInk)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(30)
            .background(Palette.appBackground)
        } else if let id = store.leituraID ?? store.selectedID, let entry = store.byId[id] {
            LeitorCheio(entry: entry)
        } else {
            switch store.selecao {
            case .inicio: HomeView()
            case .hoje: JurisHojeView()
            case .gradeInformativos: GradeInformativosView()
            case .julgadoDoDia: JulgadoDoDiaView(pagina: true)
            case .provaOral: ProvaOralJurisView()
            case .simulado: SimuladoView()
            case .destino(let d): JurisDestinoHub(destino: d)
            case .meuMaterial: JurisDestinoHub(destino: nil)
            case .oralBancas: OralBancasView()
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
                    Label("Voltar", systemImage: "chevron.left").font(DS.interface(12.5, .medium))
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
