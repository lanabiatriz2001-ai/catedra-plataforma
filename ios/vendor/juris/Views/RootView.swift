import SwiftUI

struct RootView: View {
    @Environment(LibraryStore.self) private var store
    @Environment(\.ehCompacto) private var ehCompacto                       // iPhone / Slide Over: casca própria
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize            // Typo.* escala por UIFontMetrics: reavaliar ao mudar
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
                Text(onde.titulo).font(Typo.ui(15, .bold)).foregroundStyle(Palette.titleInk).lineLimit(1)
                Text(onde.sub).font(Typo.ui(10.5)).foregroundStyle(Palette.secondaryInk).lineLimit(1)
            }
            Spacer(minLength: 12)
            Button { store.ir(.todos) } label: {
                HStack(spacing: 7) {
                    Image(systemName: "magnifyingglass").font(Typo.ui(11))
                    Text("Buscar").font(Typo.ui(12.5))
                    Text("⌘K").font(Typo.ui(10.5, .semibold)).foregroundStyle(Palette.secondaryInk)
                }
                .foregroundStyle(Palette.secondaryInk)
                .padding(.horizontal, 13).padding(.vertical, 7)
                .background(Capsule().fill(Palette.cardBackground))
                .overlay(Capsule().strokeBorder(Palette.hairline, lineWidth: 1))
                // Alvo de 44 pt sem engordar a barra: o recuo negativo devolve a altura
                // visual (a área de toque avança sobre o respiro da barra).
                .jurisAlvoToque().padding(.vertical, -7)
            }
            .buttonStyle(.plain)
            Button { store.ir(.novidades) } label: {
                Image(systemName: store.novidadesNaoVistas > 0 ? "bell.badge.fill" : "bell")
                    .font(Typo.ui(13, .medium)).foregroundStyle(Palette.secondaryInk)
                    .frame(width: 34, height: 34)
                    .background(Circle().fill(Palette.cardBackground))
                    .overlay(Circle().strokeBorder(Palette.hairline, lineWidth: 1))
                    .jurisAlvoToque().padding(.vertical, -5)
            }
            .buttonStyle(.plain)
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 0) {
                    Text(clock.running ? "EM CURSO" : "ESTUDO").font(Typo.ui(8, .heavy)).tracking(0.8)
                        .foregroundStyle(clock.running ? Palette.accent : Palette.secondaryInk)
                    Text(clock.formatted).font(Typo.num(16, .bold))
                        .foregroundStyle(Palette.titleInk)
                }
                Button { clock.togglePlay() } label: {
                    Image(systemName: clock.manualPlaying ? "pause.fill" : "play.fill")
                        .font(Typo.ui(11, .bold)).foregroundStyle(.white)
                        .frame(width: 28, height: 28)
                        .background(Circle().fill(clock.manualPlaying ? Palette.secondaryInk : Palette.accent))
                        .jurisAlvoToque().padding(.vertical, -8)
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
        Group {
            if ehCompacto {
                // iPhone (e Slide Over): sem sidebar nem jurisTopBar — um NavigationStack
                // com "Seções" na barra, a seção e o verbete empurrados na pilha
                // (JurisCompacto.swift). O store continua sendo a fonte da verdade.
                JurisCompactoRaiz()
            } else {
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
                .onAppear {
                    #if targetEnvironment(simulator)
                    JurisEnsaio.aplicar(store: store) { }   // ensaio por captura (JurisCompacto.swift)
                    #endif
                }
            }
        }
        .background(Palette.appBackground)
        .tint(Palette.accent)
        // Dynamic Type: os tamanhos passam por UIFontMetrics dentro de Typo.*, que não lê o
        // ambiente — recriar a árvore quando o tamanho muda é o que faz o texto acompanhar.
        .id(dynamicTypeSize)
    }

    @ViewBuilder
    private var conteudo: some View {
        if store.isLoading || store.loadError != nil || store.entries.isEmpty {
            JurisEstadoAcervo()   // carregando / falha de carga (JurisCompacto.swift, comum às duas cascas)
        } else if let id = store.leituraID ?? store.selectedID, let entry = store.byId[id] {
            LeitorCheio(entry: entry)
        } else {
            JurisPagina(selecao: store.selecao)
        }
    }
}

/// A página de UMA seção — a mesma view nas duas cascas: ao lado da sidebar no iPad e
/// empurrada na pilha compacta no iPhone. As páginas leem `store.selecao` por dentro.
struct JurisPagina: View {
    let selecao: Selecao

    var body: some View {
        switch selecao {
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

/// Leitura de página inteira de um verbete (a partir de qualquer lista/página).
struct LeitorCheio: View {
    let entry: JurisEntry
    @Environment(LibraryStore.self) private var store

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                // Alvos de 44 pt: a barra fica com 44 pt de altura (28 + 8 + 8) e cada
                // botão cobre a altura toda.
                Button {
                    store.leituraID = nil
                    store.selectedID = nil
                } label: {
                    Label("Voltar", systemImage: "chevron.left").font(Typo.ui(12.5, .medium))
                        .jurisAlvoToque().padding(.vertical, -8)
                }
                .buttonStyle(.borderless)
                Spacer()
                Button { store.navegarLeitura(-1) } label: { Image(systemName: "chevron.up").jurisAlvoToque().padding(.vertical, -8) }
                    .buttonStyle(.borderless).disabled(!store.temAnterior())
                    .keyboardShortcut(.leftArrow, modifiers: .command)
                    .help("Anterior (⌘←)")
                Button { store.navegarLeitura(1) } label: { Image(systemName: "chevron.down").jurisAlvoToque().padding(.vertical, -8) }
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
