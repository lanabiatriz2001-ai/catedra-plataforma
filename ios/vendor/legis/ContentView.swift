import SwiftUI

enum SidebarItem: Hashable {
    case home
    case all
    case favorites
    case subjects
    case checklist
    case planoLeitura
    case indiceEstrutural
    case incidencia          // mapa de incidência por artigo (citações no acervo do JURIS)
    case provaOral           // pergunta sobre um artigo e corrige contra a lei (local)
    case simuladoLegis       // simulado de lei seca: C/E dos artigos + discursivas oficiais
    case globalSearch
    case updates
    case novidades
    case dou
    case category(LawCategory)
    case customCategory(String)
}

/// Rotas da navegação por telas (NavigationStack) — substituem as 3 colunas
/// verticais. Início é a raiz; abrir uma seção ou uma norma empilha uma tela cheia.
enum NavRoute: Hashable {
    case section(SidebarItem)   // uma seção/lista em tela cheia
    case reader(UUID)           // a norma aberta em tela cheia ("dar play")
    case updateDetail(UUID)     // detalhe de uma alteração
    case secoes                 // compacto (iPhone): a lista da barra lateral como tela
}

struct ContentView: View {
    @EnvironmentObject var store: AppStore
    @State private var path: [NavRoute] = []
    @State private var showAddLaw = false
    @State private var showNewCategory = false
    @State private var newCategoryName = ""
    @State private var showPalette = false                      // command palette (⌘K)
    // Default "light": casa com o fallback claro do tema até o host espelhar o Cátedra
    // (main.swift grava "light"/"dark" nesta chave). Com "dark" a 1ª pintura saía com
    // .primary branco sobre o fundo bege do fallback.
    @AppStorage("appearance") private var appearance = "light"  // "system" | "light" | "dark"
    @ObservedObject private var clock = StudyClock.shared       // cronômetro do top bar
    // Abaixo desta largura (Split View, Slide Over, retrato de iPad pequeno) a barra lateral
    // sai do fluxo e vira uma gaveta aberta pelo botão do cabeçalho — com ela fixa em 210 pt
    // o conteúdo não cabia. Acima disso o visual é o do Mac.
    private static let larguraCompacta: CGFloat = 700
    @State private var showSidebarDrawer = false
    // Largura COMPACTA de verdade (size class: iPhone em retrato, Slide Over): nem barra
    // lateral nem barra do topo — a NavigationStack é a raiz, com os controles na barra de
    // navegação do sistema e a lista da barra lateral como tela ("Seções"). Em regular
    // (iPad em tela cheia) o corpo abaixo continua o de sempre.
    @Environment(\.ehCompacto) private var ehCompacto

    // Top bar no esquema do Cátedra: título + Buscar + notificações + cronômetro EM CURSO.
    // No modo compacto ganha o botão da gaveta e encolhe o que não é essencial.
    private func legisTopBar(compacto: Bool) -> some View {
        HStack(spacing: 12) {
            if compacto {
                Button { showSidebarDrawer = true } label: {
                    Image(systemName: "sidebar.left")
                        .font(AppTheme.ui(13, .medium)).foregroundStyle(AppTheme.secondaryInk)
                        .frame(width: 34, height: 34)
                        .background(Circle().fill(AppTheme.cardBackground))
                        .overlay(Circle().strokeBorder(AppTheme.hairline, lineWidth: 1))
                        .frame(minWidth: 44, minHeight: 44)   // alvo de toque ≥ 44 pt
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Abrir a barra lateral")
            }
            VStack(alignment: .leading, spacing: 1) {
                Text("CátedraLEGIS").font(AppTheme.ui(15, .bold)).foregroundStyle(AppTheme.ink)
                if !compacto {
                    Text("Vade Mecum de leis").font(AppTheme.ui(10.5)).foregroundStyle(AppTheme.secondaryInk)
                }
            }
            Spacer(minLength: 12)
            Button { showPalette = true } label: {
                HStack(spacing: 7) {
                    Image(systemName: "magnifyingglass").font(AppTheme.ui(11))
                    if !compacto {
                        Text("Buscar").font(AppTheme.ui(12.5))
                    }
                }
                .foregroundStyle(AppTheme.secondaryInk)
                .padding(.horizontal, 13).padding(.vertical, 7)
                .background(Capsule().fill(AppTheme.cardBackground))
                .overlay(Capsule().strokeBorder(AppTheme.hairline, lineWidth: 1))
                .frame(minWidth: 44, minHeight: 44)   // alvo de toque ≥ 44 pt
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Buscar norma, matéria ou ação")
            Button { path = [.section(.updates)] } label: {
                Image(systemName: store.unreadCount > 0 ? "bell.badge.fill" : "bell")
                    .font(AppTheme.ui(13, .medium)).foregroundStyle(AppTheme.secondaryInk)
                    .frame(width: 34, height: 34)
                    .background(Circle().fill(AppTheme.cardBackground))
                    .overlay(Circle().strokeBorder(AppTheme.hairline, lineWidth: 1))
            }
            .buttonStyle(.plain)
            // Cronômetro EM CURSO (destaque, como o Cátedra)
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 0) {
                    Text(clock.running ? "EM CURSO" : "ESTUDO").font(AppTheme.ui(8, .heavy)).tracking(0.8)
                        .foregroundStyle(clock.running ? ThemeState.t.accent : AppTheme.secondaryInk)
                    Text(clock.formatted).font(Typo.num(16))
                        .foregroundStyle(AppTheme.ink)
                }
                Button { clock.togglePlay() } label: {
                    Image(systemName: clock.manualPlaying ? "pause.fill" : "play.fill")
                        .font(AppTheme.ui(11, .bold)).foregroundStyle(.white)
                        .frame(width: 28, height: 28)
                        .background(Circle().fill(clock.manualPlaying ? AppTheme.secondaryInk : ThemeState.t.accent))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 12).padding(.vertical, 6)
            .background(Capsule().fill(AppTheme.cardBackground))
            .overlay(Capsule().strokeBorder(clock.running ? ThemeState.t.accent.opacity(0.45) : AppTheme.hairline, lineWidth: 1))
        }
        .padding(.horizontal, 20).padding(.vertical, 11)
        .background(AppTheme.pageBackground)
        .overlay(alignment: .bottom) { Rectangle().fill(AppTheme.hairline).frame(height: 1) }
    }

    private var corpoRegular: some View {
        GeometryReader { geo in
            let compacto = geo.size.width < Self.larguraCompacta
            // Barra lateral: 210 pt como no Mac, mas nunca mais que ~27% da janela.
            let larguraSidebar = min(210, max(176, geo.size.width * 0.27))
            HStack(spacing: 0) {
                if !compacto {
                    LegisSidebar(path: $path, showNewCategory: $showNewCategory, largura: larguraSidebar,
                                 openPalette: { showPalette = true })
                }
                // O cabeçalho vai como BLOCO acima do stack, não como safeAreaInset: o leitor de
                // lei também põe a barra dele com safeAreaInset(.top), e dois insets aninhados no
                // topo faziam o cabeçalho cobrir a barra do leitor — sobravam 6 px dela.
                VStack(spacing: 0) {
                    legisTopBar(compacto: compacto)
                    NavigationStack(path: $path) {
                        DashboardView(
                            openLaw: { path.append(.reader($0)) },
                            openSection: { path.append(.section($0)) },
                            openUpdates: { path.append(.section(.updates)) },
                            openUpdate: { path.append(.updateDetail($0)) },
                            newCategory: { showNewCategory = true }
                        )
                        .navigationDestination(for: NavRoute.self) { route in destino(route) }
                    }
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
            // Gaveta da barra lateral no modo compacto: véu escuro + a mesma LegisSidebar
            // entrando pela esquerda. Navegar, buscar ou criar matéria fecha a gaveta.
            .overlay(alignment: .leading) {
                ZStack(alignment: .leading) {
                    if compacto && showSidebarDrawer {
                        Rectangle().fill(Color.black.opacity(0.34)).ignoresSafeArea()
                            .onTapGesture { showSidebarDrawer = false }
                            .transition(.opacity)
                            .accessibilityLabel("Fechar a barra lateral")
                    }
                    if compacto && showSidebarDrawer {
                        LegisSidebar(path: $path, showNewCategory: $showNewCategory,
                                     largura: min(260, geo.size.width * 0.8),
                                     openPalette: { showSidebarDrawer = false; showPalette = true },
                                     aoNavegar: { showSidebarDrawer = false })
                            .shadow(color: Color.black.opacity(0.3), radius: 20, x: 6)
                            .transition(.move(edge: .leading))
                    }
                }
            }
            .animation(.easeOut(duration: 0.18), value: showSidebarDrawer)
            .onChange(of: compacto) { _, agora in
                if !agora { showSidebarDrawer = false }   // voltou a caber: a gaveta some
            }
        }
    }

    /// Compacto (iPhone): só a NavigationStack. O Início é a raiz; "Seções" (a lista da
    /// barra lateral), busca, sino e cronômetro vivem na barra de navegação — nenhuma
    /// barra própria empilhada por cima.
    private var corpoCompacto: some View {
        NavigationStack(path: $path) {
            DashboardView(
                openLaw: { path.append(.reader($0)) },
                openSection: { path.append(.section($0)) },
                openUpdates: { path.append(.section(.updates)) },
                openUpdate: { path.append(.updateDetail($0)) },
                newCategory: { showNewCategory = true }
            )
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { barraCompacta }
            .navigationDestination(for: NavRoute.self) { route in destino(route) }
        }
    }

    /// Destinos da pilha — os mesmos nos dois corpos.
    @ViewBuilder
    private func destino(_ route: NavRoute) -> some View {
        switch route {
        case .section(let item):
            SectionScreen(item: item,
                          openLaw: { path.append(.reader($0)) },
                          openUpdate: { path.append(.updateDetail($0)) },
                          showAddLaw: $showAddLaw)
        case .reader(let id):
            ReaderScreen(lawID: id, openLaw: { path.append(.reader($0)) })
        case .updateDetail(let id):
            UpdateDetailScreen(updateID: id, openLaw: { path.append(.reader($0)) })
        case .secoes:
            LegisSecoesScreen(path: $path, showNewCategory: $showNewCategory,
                              openPalette: { showPalette = true })
        }
    }

    /// Barra de navegação do Início em compacto: Seções à esquerda; busca, sino e o
    /// cronômetro EM CURSO à direita. Cada alvo tem 44 pt.
    @ToolbarContentBuilder
    private var barraCompacta: some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            Button { path.append(.secoes) } label: {
                Image(systemName: "list.bullet").alvoToque()
            }
            .accessibilityLabel("Seções")
        }
        ToolbarItemGroup(placement: .topBarTrailing) {
            Button { showPalette = true } label: {
                Image(systemName: "magnifyingglass").alvoToque()
            }
            .accessibilityLabel("Buscar norma, matéria ou ação")
            Button { path = [.section(.updates)] } label: {
                Image(systemName: store.unreadCount > 0 ? "bell.badge.fill" : "bell").alvoToque()
            }
            .accessibilityLabel(store.unreadCount > 0 ? "Atualizações, \(store.unreadCount) não lidas" : "Atualizações")
            cronometroCompacto
        }
    }

    /// Cronômetro na barra: tempo em dígitos tabulares (na cor do acento enquanto corre)
    /// e o play/pause de 28 pt com área de toque de 44 — sem o rótulo "EM CURSO" de 8 pt.
    private var cronometroCompacto: some View {
        HStack(spacing: 2) {
            Text(clock.formatted).font(Typo.num(15))
                .foregroundStyle(clock.running ? ThemeState.t.accent : AppTheme.secondaryInk)
                .accessibilityLabel(clock.running ? "Em curso, \(clock.formatted)" : "Estudo, \(clock.formatted)")
            Button { clock.togglePlay() } label: {
                Image(systemName: clock.manualPlaying ? "pause.fill" : "play.fill")
                    .font(AppTheme.ui(11, .bold)).foregroundStyle(.white)
                    .frame(width: 28, height: 28)
                    .background(Circle().fill(clock.manualPlaying ? AppTheme.secondaryInk : ThemeState.t.accent))
                    .alvoToque()
            }
            .buttonStyle(.plain)
            .accessibilityLabel(clock.manualPlaying ? "Pausar o cronômetro" : "Iniciar o cronômetro")
        }
    }

    /// Em compacto a paleta ⌘K é uma FOLHA com o campo no topo (busca modal nativa), não
    /// o overlay de 580 pt do Mac. O mesmo `showPalette` alimenta os dois.
    private var paletaEmFolha: Binding<Bool> {
        Binding(get: { ehCompacto && showPalette }, set: { if !$0 { showPalette = false } })
    }

    // MARK: - Ganchos de VERIFICAÇÃO (argumentos de lançamento; inertes no uso normal)
    //
    // O app não tem projeto Xcode nem XCUITest, e o simulador sem toque só chega ao Início.
    // Estes argumentos (`xcrun simctl launch … -legisAbrirTela secoes`) deixam fotografar e
    // medir cada tela do LEGIS no simulador; sem eles, nada acontece.
    //   -legisSemearNorma 1      cadastra uma norma curta de verificação (texto local) e a abre
    //   -legisAbrirNorma "<trecho do título>"   abre o leitor da norma
    //   -legisAbrirTela secoes|paleta|cadastrar   abre a tela/folha indicada
    @State private var ganchosAplicados = false

    private func aplicarGanchosDeVerificacao() async {
        guard !ganchosAplicados else { return }
        ganchosAplicados = true
        let d = UserDefaults.standard
        if d.bool(forKey: "legisSemearNorma") {
            let titulo = "Lei de Verificação do Leitor"
            if !store.laws.contains(where: { $0.title == titulo }) {
                await store.addCustomLaw(title: titulo, reference: "Lei nº 0, de 11 de setembro de 2026",
                                         sourceURL: nil, pastedText: Self.textoDeVerificacao,
                                         category: .civil, customCategory: nil)
            }
            if let law = store.laws.first(where: { $0.title == titulo }) { path = [.reader(law.id)] }
        }
        if let trecho = d.string(forKey: "legisAbrirNorma"), !trecho.isEmpty,
           let law = store.laws.first(where: {
               $0.isRegularLaw && ($0.title.localizedCaseInsensitiveContains(trecho)
                                   || $0.reference.localizedCaseInsensitiveContains(trecho))
           }) {
            path = [.reader(law.id)]
        }
        switch d.string(forKey: "legisAbrirTela") {
        case "secoes":    if ehCompacto { path = [.secoes] }
        case "paleta":    showPalette = true
        case "cadastrar": showAddLaw = true
        default: break
        }
    }

    /// Seis artigos com incisos e parágrafos — o bastante para o Estudo, o índice e a marcação.
    private static let textoDeVerificacao = """
    Art. 1º Esta lei regula a verificação visual do leitor de normas do CátedraLEGIS no iPhone e no iPad, sem alterar o conteúdo estudado.
    § 1º A verificação abrange a barra de navegação, a faixa do artigo, o cartão do texto e o dock de estudo.
    § 2º Nenhum dado da pessoa é lido ou gravado pela verificação.
    Art. 2º São princípios da verificação:
    I - a legibilidade do texto em qualquer tamanho de letra escolhido pela pessoa;
    II - a área mínima de toque de quarenta e quatro pontos em todo controle;
    III - a preservação do leitor do iPad, pixel a pixel, na largura regular.
    Art. 3º O texto do artigo deve começar antes da dobra da tela em retrato.
    Parágrafo único. Considera-se dobra o limite de duzentos pontos a partir do topo da área do módulo.
    Art. 4º A marcação de trechos faz-se pelo menu de seleção do sistema quando a barra flutuante não couber.
    Art. 5º Os comentários aparecem abaixo do texto quando a margem lateral não couber.
    Art. 6º Esta lei entra em vigor na data de sua publicação.
    """

    var body: some View {
        Group {
            if ehCompacto { corpoCompacto } else { corpoRegular }
        }
        .task {
            // Ganchos de verificação: depois da 1ª pintura, para a pilha já existir.
            try? await Task.sleep(nanoseconds: 400_000_000)
            await aplicarGanchosDeVerificacao()
        }
        .preferredColorScheme(appearance == "light" ? .light : appearance == "dark" ? .dark : nil)
        // Item 5: o chip ⚖️ do mapa de Processo e peças manda o TERMO junto. Sem isto a aba
        // abria no acervo inteiro e a busca era refeita à mão.
        .onReceive(NotificationCenter.default.publisher(for: AcervoEntrada.notificacaoBuscar)) { n in
            guard let t = n.userInfo?["termo"] as? String, !t.isEmpty else { return }
            path = [.section(.globalSearch)]
        }
        .sheet(isPresented: $showAddLaw) { AddLawSheet() }
        .alert("Nova matéria", isPresented: $showNewCategory) {
            TextField("Nome (ex.: Militar, Agrário, Concurso X)", text: $newCategoryName)
            Button("Criar") {
                let name = newCategoryName.trimmingCharacters(in: .whitespaces)
                if !name.isEmpty {
                    if let canonical = store.addCategory(name) {
                        path.append(.section(.customCategory(canonical)))
                    } else if let builtin = LawCategory.allCases.first(where: {
                        $0.rawValue.localizedCaseInsensitiveCompare(name) == .orderedSame
                    }) {
                        path.append(.section(.category(builtin)))
                    }
                }
                newCategoryName = ""
            }
            Button("Cancelar", role: .cancel) { newCategoryName = "" }
        } message: {
            Text("Crie matérias suas para organizar as normas. Você pode mover qualquer norma para uma matéria pelo menu ⋯ do leitor.")
        }
        .alert("Erro", isPresented: Binding(
            get: { store.lastError != nil },
            set: { if !$0 { store.lastError = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(store.lastError ?? "")
        }
        // O cronômetro de estudo só corre com uma NORMA aberta (topo da pilha = leitor),
        // e atribui o tempo à norma específica (dashboard por norma).
        .onAppear { StudyClock.shared.setReader(Self.readerLawID(path.last)) }
        .onChange(of: path) { _, newPath in
            StudyClock.shared.setReader(Self.readerLawID(newPath.last))
        }
        // Command palette (⌘K): salto rápido para qualquer norma, matéria ou ação.
        .background(
            Button(action: { showPalette = true }) { EmptyView() }
                .keyboardShortcut("k", modifiers: .command)
                .opacity(0)
        )
        .sheet(isPresented: paletaEmFolha) {
            CommandPalette(isPresented: $showPalette,
                           openLaw: { path.append(.reader($0)) },
                           openSection: { path = [.section($0)] },
                           addLaw: { showAddLaw = true })
                .environmentObject(store)
                .folhaAdaptavel()
        }
        .overlay {
            Group {
                if showPalette && !ehCompacto {
                    CommandPalette(isPresented: $showPalette,
                                   openLaw: { path.append(.reader($0)) },
                                   openSection: { path = [.section($0)] },
                                   addLaw: { showAddLaw = true })
                        .transition(.opacity.combined(with: .scale(scale: 0.98)))
                }
            }
            .animation(.easeOut(duration: 0.16), value: showPalette)
        }
    }

    private static func readerLawID(_ route: NavRoute?) -> UUID? {
        if case .reader(let id) = route { return id }
        return nil
    }
}

// MARK: - Barra lateral (estilo Cátedra: navy escuro à esquerda, navegação + matérias)

private struct LegisSidebar: View {
    @EnvironmentObject var store: AppStore
    @Binding var path: [NavRoute]
    @Binding var showNewCategory: Bool
    /// Largura dada pelo ContentView (relativa à janela; 210 pt quando há espaço).
    var largura: CGFloat = 210
    var openPalette: () -> Void = {}
    /// Chamado a cada navegação — a gaveta do modo compacto usa isto para se fechar.
    var aoNavegar: () -> Void = {}

    private var lawCount: Int { store.laws.filter(\.isRegularLaw).count }
    private var novidadesCount: Int { store.laws.filter(\.isNovidades).count }
    private func categoryCount(_ c: LawCategory) -> Int {
        store.laws.filter { $0.isRegularLaw && $0.customCategory == nil && $0.category == c }.count
    }
    private func customCategoryCount(_ name: String) -> Int {
        store.laws.filter { $0.isRegularLaw && $0.customCategory == name }.count
    }
    private var pendingChecklist: Int { store.readingChecklist.filter { !$0.done }.count }
    private func isActive(_ item: SidebarItem) -> Bool {
        if item == .home { return path.isEmpty }
        if case .section(let s)? = path.last { return s == item }
        return false
    }
    private func go(_ item: SidebarItem) {
        if item == .home { path = [] } else { path = [.section(item)] }
        aoNavegar()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 10) {
                RoundedRectangle(cornerRadius: AppTheme.rInner, style: .continuous)
                    .fill(ThemeState.t.accent).frame(width: 34, height: 34)
                    .overlay(Image(systemName: "books.vertical.fill")
                        .font(AppTheme.ui(15, .bold)).foregroundStyle(.white))
                VStack(alignment: .leading, spacing: 0) {
                    Text("CátedraLEGIS").font(AppTheme.ui(14.5, .bold)).foregroundStyle(.white)
                    Text("Vade Mecum de leis").font(AppTheme.ui(10))
                        .foregroundStyle(ThemeState.t.sidebarText.opacity(0.85))
                }
            }
            .padding(.horizontal, 14).padding(.top, 16).padding(.bottom, 10)

            Button(action: openPalette) {
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass").font(AppTheme.ui(12))
                    Text("Buscar…").font(AppTheme.ui(12.5))
                    Spacer()
                }
                .foregroundStyle(ThemeState.t.sidebarText.opacity(0.85))
                .padding(.horizontal, 10).padding(.vertical, 7)
                .background(RoundedRectangle(cornerRadius: AppTheme.rInner, style: .continuous).fill(Color.white.opacity(0.08)))
                .overlay(RoundedRectangle(cornerRadius: AppTheme.rInner, style: .continuous).strokeBorder(Color.white.opacity(0.10), lineWidth: 1))
                .frame(minHeight: 44)   // alvo de toque ≥ 44 pt
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 14).padding(.bottom, 6)

            ScrollView {
                VStack(alignment: .leading, spacing: 2) {
                    row(.home, "Início", "house")
                    row(.all, "Todas as normas", "books.vertical", badge: lawCount)
                    row(.favorites, "Favoritos", "star", badge: store.favoriteCount)
                    row(.indiceEstrutural, "Índice das normas", "list.bullet.indent")
                    row(.subjects, "Assuntos", "tag")
                    row(.globalSearch, "Buscar em tudo", "magnifyingglass")
                    row(.novidades, "Novidades", "sparkles", badge: novidadesCount)
                    row(.dou, "Diário Oficial", "newspaper")
                    row(.updates, "Atualizações", "bell.badge", badge: store.unreadCount)

                    // TREINO — Checklist, Simulado e Prova oral existiam como telas mas
                    // nenhuma linha da sidebar/⌘K/Início as alcançava (pente fino 21/08).
                    groupTitle("TREINO")
                    row(.planoLeitura, "Plano de leitura", "calendar")
                    row(.checklist, "Checklist", "checklist", badge: pendingChecklist)
                    row(.incidencia, "Incidência", "target")
                    row(.simuladoLegis, "Simulado de lei seca", "checkmark.seal")
                    row(.provaOral, "Prova oral", "mic")

                    groupTitle("MATÉRIAS")

                    ForEach(LawCategory.allCases.filter { categoryCount($0) > 0 }) { cat in
                        row(.category(cat), cat.rawValue, cat.symbol, badge: categoryCount(cat))
                    }
                    ForEach(store.customCategories, id: \.self) { name in
                        row(.customCategory(name), name, "tag.fill", badge: customCategoryCount(name))
                    }
                    Button { showNewCategory = true; aoNavegar() } label: {
                        HStack(spacing: 11) {
                            Image(systemName: "plus").font(AppTheme.ui(12, .semibold)).frame(width: 20)
                            Text("Nova matéria").font(AppTheme.ui(13, .medium))
                            Spacer(minLength: 0)
                        }
                        .padding(.horizontal, 11).padding(.vertical, 8)
                        .foregroundStyle(ThemeState.t.sidebarText.opacity(0.8))
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 8).padding(.bottom, 14)
            }

            // (O cronômetro vive só no topo, como no Cátedra — o da sidebar duplicava o
            // mesmo StudyClock com outra semântica de rótulo.)
        }
        .frame(width: largura)
        .background(ThemeState.t.sidebarBg)
    }

    /// Cor do ícone na sidebar: matérias exibem a identidade de cor da área
    /// (tom claro, legível sobre o navy); quando a linha está ATIVA, o ícone
    /// acompanha o texto ativo (contraste sobre o fundo de seleção).
    private func groupTitle(_ t: String) -> some View {
        Text(t)
            .font(AppTheme.ui(9.5, .bold)).tracking(0.9)
            .foregroundStyle(ThemeState.t.sidebarText.opacity(0.55))
            .padding(.horizontal, 12).padding(.top, 16).padding(.bottom, 5)
    }

    private func rowIconColor(_ item: SidebarItem, active: Bool) -> Color? {
        guard !active, case .category(let cat) = item else { return nil }
        return cat.colorLight
    }

    @ViewBuilder
    private func row(_ item: SidebarItem, _ label: String, _ icon: String, badge: Int? = nil) -> some View {
        let active = isActive(item)
        Button { go(item) } label: {
            HStack(spacing: 11) {
                Image(systemName: icon).font(AppTheme.ui(13, .medium)).frame(width: 20)
                    .foregroundStyle(rowIconColor(item, active: active) ??
                                     (active ? ThemeState.t.sidebarActiveText : ThemeState.t.sidebarText))
                Text(label).font(AppTheme.ui(13, active ? .semibold : .medium)).lineLimit(1)
                Spacer(minLength: 4)
            }
            .padding(.horizontal, 11).padding(.vertical, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: AppTheme.rInner, style: .continuous)
                .fill(active ? ThemeState.t.sidebarActiveBg : Color.clear))
            .foregroundStyle(active ? ThemeState.t.sidebarActiveText : ThemeState.t.sidebarText)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Tela de uma seção (lista em tela cheia)

private struct SectionScreen: View {
    @EnvironmentObject var store: AppStore
    let item: SidebarItem
    let openLaw: (UUID) -> Void
    let openUpdate: (UUID) -> Void
    @Binding var showAddLaw: Bool
    @State private var sel: UUID?
    @State private var updateSel: UUID?
    @AppStorage("readerMode") private var readerMode = "estudo"

    var body: some View {
        content
            .background(AppTheme.pageBackground)
            .onChange(of: sel) { _, id in if let id { openLaw(id); sel = nil } }
            .onChange(of: updateSel) { _, id in if let id { openUpdate(id); updateSel = nil } }
    }

    @ViewBuilder
    private var content: some View {
        switch item {
        case .all:
            lawList(nil, nil, false, "Buscar")
        case .favorites:
            lawList(nil, nil, true, "Buscar nos favoritos")
        case .category(let c):
            lawList(c, nil, false, "Buscar")
        case .customCategory(let n):
            lawList(nil, n, false, "Buscar")
        case .subjects:
            SubjectsView(selection: $sel)
        case .checklist:
            ChecklistView(selection: $sel)
        case .planoLeitura:
            PlanoLeituraView(open: openLaw)
        case .indiceEstrutural:
            IndiceNormasView(open: openLaw)
        case .incidencia:
            IncidenciaView(abrirLei: openLaw)
        case .provaOral:
            ProvaOralLegisView()
        case .simuladoLegis:
            SimuladoLegisView(openLaw: openLaw)
        case .globalSearch:
            GlobalSearchView(openAt: { id, idx in
                store.setLastUnit(id, idx); readerMode = "estudo"; openLaw(id)
            })
        case .novidades:
            NovidadesListView(selection: $sel)
        case .dou:
            DOUView()
        case .updates:
            UpdatesListView(selection: $updateSel)
        case .home:
            EmptyView()
        }
    }

    @ViewBuilder
    private func lawList(_ category: LawCategory?, _ custom: String?, _ favorites: Bool, _ prompt: String) -> some View {
        LawListView(selection: $sel, category: category, customCategory: custom,
                    favoritesOnly: favorites, onAddLaw: { showAddLaw = true })
    }
}

// MARK: - Leitor em tela cheia ("dar play")

private struct ReaderScreen: View {
    @EnvironmentObject var store: AppStore
    @Environment(\.dismiss) private var dismiss
    @Environment(\.ehCompacto) private var ehCompacto
    let lawID: UUID
    let openLaw: (UUID) -> Void

    var body: some View {
        // .id garante que trocar de norma zera texto, rolagem e estado do leitor.
        LawReaderView(lawID: lawID, onOpenLaw: openLaw)
            .id(lawID)
            .navigationTitle(store.laws.first { $0.id == lawID }?.title ?? "Norma")
            // Compacto: título em linha (44 pt) — o título grande comeria ~96 pt dos 844
            // antes da primeira linha da lei. Em regular fica como sempre.
            .navigationBarTitleDisplayMode(ehCompacto ? .inline : .automatic)
            .onReceive(store.$laws) { laws in
                // Excluída enquanto lida → volta para a tela anterior.
                if !laws.contains(where: { $0.id == lawID }) { dismiss() }
            }
    }
}

// MARK: - Detalhe de uma alteração

private struct UpdateDetailScreen: View {
    @EnvironmentObject var store: AppStore
    let updateID: UUID
    let openLaw: (UUID) -> Void

    var body: some View {
        Group {
            if let event = store.updates.first(where: { $0.id == updateID }) {
                UpdateDetailView(event: event) { openLaw($0) }
            } else {
                ContentUnavailableView("Alteração não encontrada", systemImage: "clock.arrow.circlepath")
            }
        }
        .navigationTitle("Alteração")
    }
}

// MARK: - Lista de normas

struct LawListView: View {
    @EnvironmentObject var store: AppStore
    @Binding var selection: UUID?
    let category: LawCategory?
    let customCategory: String?
    var favoritesOnly: Bool = false
    var onAddLaw: (() -> Void)? = nil
    @State private var query = ""

    /// true no modo "Todas as normas" (sem matéria fixada) — ali a lista é
    /// agrupada por matéria; nas demais telas (inclusive Favoritos) é lista simples.
    private var isAllView: Bool { category == nil && customCategory == nil && !favoritesOnly }

    private var shellTitle: String { customCategory ?? category?.rawValue ?? (favoritesOnly ? "Favoritos" : "Todas as normas") }
    private var shellIcon: String { favoritesOnly ? "star" : (category?.symbol ?? (customCategory != nil ? "tag" : "books.vertical")) }
    private var shellSubtitle: String? {
        if favoritesOnly { return "Normas que você marcou com a estrela" }
        if isAllView { return "Toda a sua biblioteca de legislação, agrupada por matéria" }
        return nil
    }

    private func matches(_ law: LawEntry) -> Bool {
        let q = query.trimmingCharacters(in: .whitespaces)
        return q.isEmpty ||
        law.title.localizedCaseInsensitiveContains(q) ||
        law.reference.localizedCaseInsensitiveContains(q)
    }

    private var filtered: [LawEntry] {
        var result = store.laws.filter(\.isRegularLaw)
        if favoritesOnly {
            result = result.filter { $0.favorite == true }
        } else if let customCategory {
            result = result.filter { $0.customCategory == customCategory }
        } else if let category {
            // Norma movida para matéria personalizada sai da matéria de origem.
            result = result.filter { $0.customCategory == nil && $0.category == category }
        }
        result = result.filter(matches)
        return result.sorted { $0.title.localizedCompare($1.title) == .orderedAscending }
    }

    // Agrupamento por matéria (modo "Todas as normas"): só as normas na matéria de
    // origem; as movidas para matérias personalizadas ganham seções próprias.
    private func lawsIn(_ cat: LawCategory) -> [LawEntry] {
        store.laws.filter { $0.isRegularLaw && $0.customCategory == nil && $0.category == cat && matches($0) }
            .sorted { $0.title.localizedCompare($1.title) == .orderedAscending }
    }
    private func lawsInCustom(_ name: String) -> [LawEntry] {
        store.laws.filter { $0.isRegularLaw && $0.customCategory == name && matches($0) }
            .sorted { $0.title.localizedCompare($1.title) == .orderedAscending }
    }

    // Abre a norma no toque explícito. Não uso List(selection:) porque, num
    // NavigationStack, a List auto-seleciona a 1ª linha ao aparecer — e isso abria
    // sozinho a primeira norma da seção.
    // Contagens pré-computadas UMA vez por repintura — antes cada LawRow varria
    // store.annotations inteiro (O(n) por linha × 250 linhas a cada tecla na busca).
    private var annotationCounts: [UUID: Int] {
        store.annotations.reduce(into: [:]) { $0[$1.lawID, default: 0] += 1 }
    }
    private var precedentCounts: [UUID: Int] {
        store.precedents.reduce(into: [:]) { $0[$1.lawID, default: 0] += 1 }
    }

    @ViewBuilder private func lawButton(_ law: LawEntry, _ ann: [UUID: Int], _ prec: [UUID: Int]) -> some View {
        Button { selection = law.id } label: {
            LawRow(law: law, annotationCount: ann[law.id] ?? 0, jurisCount: prec[law.id] ?? 0)
        }
            .buttonStyle(.plain)
            .listRowSeparator(.hidden)
            .listRowBackground(Color.clear)
            .listRowInsets(EdgeInsets(top: 3, leading: 14, bottom: 3, trailing: 14))
    }

    private var addButton: AnyView? {
        guard let add = onAddLaw else { return nil }
        return AnyView(
            Button { add() } label: {
                Image(systemName: "plus.circle.fill").font(AppTheme.ui(19)).foregroundStyle(ThemeState.t.accent)
            }
            .buttonStyle(.plain).help("Cadastrar uma norma sua (link, PDF ou texto colado)")
        )
    }

    var body: some View {
        let searching = !query.trimmingCharacters(in: .whitespaces).isEmpty
        let count: Int? = filtered.isEmpty ? nil : filtered.count
        return SectionShell(icon: shellIcon, title: shellTitle, subtitle: shellSubtitle,
                            count: count, search: $query, searchPrompt: "Buscar norma",
                            trailing: addButton,
                            tintStops: category?.gradStops ??
                                       customCategory.map { [CustomCategoryStyle.color(for: $0),
                                                             CustomCategoryStyle.color(for: $0).opacity(0.7)] }) {
            lawBody(searching: searching)
        }
    }

    @ViewBuilder private func lawBody(searching: Bool) -> some View {
        if favoritesOnly && filtered.isEmpty && !searching {
            LegisEmpty(icon: "star", title: "Nenhum favorito ainda",
                       message: "Marque uma norma como favorita pela estrela na barra do leitor, ou tocando e segurando a norma na lista.")
        } else if filtered.isEmpty {
            LegisEmpty(icon: "magnifyingglass", title: "Nada encontrado",
                       message: "Nenhuma norma corresponde à busca.")
        } else {
            listContent
        }
    }

    @ViewBuilder private var listContent: some View {
        let ann = annotationCounts, prec = precedentCounts
        List {
            // Fontes com falha persistente ficam fora da contagem — senão o botão
            // nunca desapareceria por causa de uma fonte quebrada.
            let pendingCount = store.laws.filter {
                !$0.isDownloaded && $0.sourceURL != nil && ($0.checkFailures ?? 0) < 3
            }.count
            if isAllView && pendingCount > 0 {
                Button {
                    Task { await store.downloadAllMissing() }
                } label: {
                    Label("Baixar as \(pendingCount) fontes pendentes", systemImage: "square.and.arrow.down")
                }
                .buttonStyle(.legisPrimary)
                .disabled(!store.downloadingIDs.isEmpty)
            }
            if !store.checkProgress.isEmpty {
                Text(store.checkProgress)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            if isAllView {
                // Agrupado por matéria (seções vazias são omitidas).
                ForEach(LawCategory.allCases) { cat in
                    let laws = lawsIn(cat)
                    if !laws.isEmpty {
                        Section {
                            ForEach(laws) { lawButton($0, ann, prec) }
                        } header: {
                            Label(cat.rawValue, systemImage: cat.symbol)
                                .foregroundStyle(cat.color)
                        }
                    }
                }
                ForEach(store.customCategories, id: \.self) { name in
                    let laws = lawsInCustom(name)
                    if !laws.isEmpty {
                        Section {
                            ForEach(laws) { lawButton($0, ann, prec) }
                        } header: {
                            Label(name, systemImage: "tag")
                                .foregroundStyle(CustomCategoryStyle.color(for: name))
                        }
                    }
                }
            } else {
                ForEach(filtered) { law in
                    lawButton(law, ann, prec)
                }
            }
        }
        .listStyle(.inset)
        .scrollContentBackground(.hidden)
        .background(AppTheme.pageBackground)
    }
}

// MARK: - Índice de assuntos (Senado)

struct SubjectsView: View {
    @EnvironmentObject var store: AppStore
    @Binding var selection: UUID?
    @State private var selectedSubject: String?
    @State private var query = ""
    // Busca do assunto no CONTEÚDO das normas (artigos que mencionam o tema).
    @State private var contentHits: [LawSearchHit] = []
    @State private var contentSearching = false
    @State private var contentGen = 0
    @AppStorage("readerMode") private var readerMode = "estudo"

    private var total: Int { store.laws.filter(\.isRegularLaw).count }

    var body: some View {
        let index = store.subjectIndex()
        Group {
            if let subject = selectedSubject {
                subjectDetail(subject, index: index)
            } else {
                master(index)
            }
        }
        .task(id: selectedSubject) { await loadContentHits() }
    }

    // Varre o texto das normas baixadas atrás do termo do assunto (fora da MainActor).
    private func loadContentHits() async {
        guard let subject = selectedSubject else { contentHits = []; return }
        let term = subject.trimmingCharacters(in: .whitespaces)
        guard term.count >= 2 else { contentHits = []; contentSearching = false; return }
        contentSearching = true
        contentGen += 1
        let gen = contentGen
        let accent = ThemeState.t.accent
        let corpus: [(UUID, String, Color, URL)] = store.laws
            .filter { $0.isRegularLaw && $0.isDownloaded }
            .map { ($0.id, $0.title, accent, store.textURL(for: $0.id)) }
        let result = await Task.detached(priority: .userInitiated) {
            LawSearch.run(term: term, corpus: corpus, perLawCap: 4, globalCap: 200)
        }.value
        guard gen == contentGen else { return }
        contentHits = result.hits
        contentSearching = false
    }

    private func openHit(_ hit: LawSearchHit) {
        store.setLastUnit(hit.lawID, hit.unitIndex)
        readerMode = "estudo"
        selection = hit.lawID
    }

    // Lista de assuntos + ação de indexar tudo.
    private func master(_ index: [(subject: String, lawIDs: [UUID])]) -> some View {
        let q = query.trimmingCharacters(in: .whitespaces)
        let filtered = q.isEmpty ? index : index.filter { $0.subject.localizedCaseInsensitiveContains(q) }
        let hasIndex = !index.isEmpty
        return SectionShell(icon: "tag", title: "Assuntos",
                            subtitle: "Navegue a legislação por tema — indexação do Senado (Dados Abertos).",
                            count: hasIndex ? index.count : nil,
                            search: hasIndex ? $query : nil,
                            searchPrompt: "Filtrar assuntos") {
            masterContent(indexEmpty: index.isEmpty, filtered: filtered, q: q)
        }
    }

    @ViewBuilder
    private func masterContent(indexEmpty: Bool, filtered: [(subject: String, lawIDs: [UUID])], q: String) -> some View {
        if indexEmpty && !store.sigenIndexing {
            if store.sigenPendingCount > 0 && store.isOnline {
                LegisEmpty(icon: "tag.slash", title: "Sem assuntos ainda",
                           message: "Toque em Indexar para o app baixar a indexação temática do Senado. Roda em segundo plano e depois funciona offline.",
                           actionLabel: "Indexar \(store.sigenPendingCount) normas",
                           action: { Task { await store.enrichAllSIGEN() } })
            } else {
                LegisEmpty(icon: "tag.slash", title: "Sem assuntos ainda",
                           message: "Abra algumas normas para o app baixar a indexação temática do Senado. Roda em segundo plano e depois funciona offline.")
            }
        } else {
            ScrollView {
                LazyVStack(spacing: 8) {
                    if store.sigenPendingCount > 0 || store.sigenIndexing { indexBanner }
                    subjectRows(filtered: filtered, q: q)
                }
                .padding(.horizontal, 16).padding(.vertical, 14)
            }
        }
    }

    @ViewBuilder
    private func subjectRows(filtered: [(subject: String, lawIDs: [UUID])], q: String) -> some View {
        if filtered.isEmpty {
            Text("Nenhum assunto corresponde a “\(q)”.")
                .font(AppTheme.ui(12.5)).foregroundStyle(AppTheme.secondaryInk)
                .frame(maxWidth: .infinity).padding(.vertical, 40)
        } else {
            ForEach(filtered, id: \.subject) { entry in
                Button { selectedSubject = entry.subject } label: {
                    SectionRow(icon: "number", title: entry.subject.capitalized,
                               trailingText: "\(entry.lawIDs.count)")
                }
                .buttonStyle(.plain)
            }
        }
    }

    // Faixa de indexação temática pendente (card clean).
    private var indexBanner: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("\(store.sigenIndexedCount) de \(total) normas com assuntos · \(store.sigenPendingCount) a indexar")
                .font(AppTheme.ui(12.5, .medium)).foregroundStyle(AppTheme.ink)
            if store.sigenIndexing {
                HStack(spacing: 8) {
                    ProgressView().controlSize(.small)
                    Text(store.sigenIndexProgress).font(.caption).foregroundStyle(AppTheme.secondaryInk).lineLimit(1)
                }
            } else {
                Button { Task { await store.enrichAllSIGEN() } } label: {
                    Label("Indexar \(store.sigenPendingCount) normas", systemImage: "tag.circle.fill")
                }
                .buttonStyle(.borderedProminent).tint(ThemeState.t.accent).disabled(!store.isOnline)
            }
        }
        .padding(13).frame(maxWidth: .infinity, alignment: .leading).appTintedSurface(ThemeState.t.accent)
    }

    // Normas marcadas com o assunto + artigos que mencionam o tema no texto.
    private func subjectDetail(_ subject: String, index: [(subject: String, lawIDs: [UUID])]) -> some View {
        let ids = Set(index.first { $0.subject == subject }?.lawIDs ?? [])
        let laws = store.laws.filter { ids.contains($0.id) }
            .sorted { $0.title.localizedCompare($1.title) == .orderedAscending }
        let back = AnyView(
            Button { selectedSubject = nil } label: {
                Label("Assuntos", systemImage: "chevron.left")
            }.buttonStyle(.legisGhost)
        )
        return SectionShell(icon: "number", title: subject.capitalized,
                            subtitle: "Normas marcadas com este assunto e artigos que mencionam o tema no texto.",
                            trailing: back) {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 8) {
                    detailNorms(laws)
                    detailContent(subject: subject)
                }
                .padding(.horizontal, 16).padding(.vertical, 14)
            }
        }
    }

    @ViewBuilder
    private func detailNorms(_ laws: [LawEntry]) -> some View {
        if !laws.isEmpty {
            groupLabel("Normas sobre este assunto", "\(laws.count)")
            ForEach(laws) { law in
                Button { selection = law.id } label: {
                    LawRow(law: law)
                }
                .buttonStyle(.plain)
            }
        }
    }

    @ViewBuilder
    private func detailContent(subject: String) -> some View {
        groupLabel("No conteúdo das normas", contentSearching ? nil : "\(contentHits.count)")
        if contentSearching {
            HStack(spacing: 8) {
                ProgressView().controlSize(.small)
                Text("Procurando artigos que mencionam “\(subject)”…")
                    .font(AppTheme.ui(12)).foregroundStyle(AppTheme.secondaryInk)
            }
            .frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 14)
        } else if contentHits.isEmpty {
            Text("Nenhum artigo das normas baixadas menciona “\(subject)”.")
                .font(AppTheme.ui(12)).foregroundStyle(AppTheme.secondaryInk)
                .padding(.vertical, 14)
        } else {
            ForEach(contentHits) { hit in
                Button { openHit(hit) } label: { contentHitRow(hit) }
                    .buttonStyle(.plain)
            }
        }
    }

    @ViewBuilder
    private func groupLabel(_ text: String, _ count: String?) -> some View {
        LegisSectionHeader(title: text, count: count.flatMap { Int($0) })
            .padding(.top, 10).padding(.bottom, 1).padding(.horizontal, 2)
    }

    private func contentHitRow(_ hit: LawSearchHit) -> some View {
        HStack(alignment: .top, spacing: 11) {
            IconBubble(symbol: "doc.text.magnifyingglass", color: ThemeState.t.accent, size: 30)
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(hit.unitLabel).font(AppTheme.ui(12.5, .semibold)).foregroundStyle(ThemeState.t.accent)
                    Text("· \(hit.lawTitle)").font(AppTheme.ui(11)).foregroundStyle(AppTheme.secondaryInk).lineLimit(1)
                }
                Text(hit.snippet).font(AppTheme.ui(12)).foregroundStyle(AppTheme.secondaryInk)
                    .lineLimit(2).fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 6)
            Image(systemName: "chevron.right").font(AppTheme.ui(11, .semibold))
                .foregroundStyle(AppTheme.secondaryInk.opacity(0.6))
        }
        .padding(.horizontal, 13).padding(.vertical, 11)
        .legisCard(tint: ThemeState.t.accent, hover: true)
        .contentShape(Rectangle())
    }
}

// MARK: - Alertas do Diário Oficial (DOU)

struct DOUView: View {
    @EnvironmentObject var store: AppStore
    @State private var newTerm = ""

    private var items: [DOUItem] {
        store.douItems.sorted { Self.key($0.date) > Self.key($1.date) }
    }
    private static func key(_ d: String) -> String {
        let p = d.split(separator: "/"); return p.count == 3 ? "\(p[2])\(p[1])\(p[0])" : d
    }

    var body: some View {
        SectionShell(icon: "newspaper", title: "Diário Oficial",
                     subtitle: "Vigie termos na Seção 1 do DOU — o app varre 1×/dia (Imprensa Nacional) e avisa quando surge algo novo.",
                     count: items.isEmpty ? nil : items.count) {
            VStack(spacing: 0) {
                controls
                if store.douTerms.isEmpty {
                    LegisEmpty(icon: "newspaper", title: "Vigie o Diário Oficial",
                               message: "Adicione termos (ex.: “licitação”, “concurso público”, o nome de uma norma) acima. O app procura no DOU e avisa quando aparecer algo novo.")
                } else if items.isEmpty {
                    LegisEmpty(icon: "doc.text.magnifyingglass", title: "Nada encontrado ainda",
                               message: store.douChecking ? "Procurando no DOU…" : "Toque em “Buscar agora” para varrer o DOU pelos seus termos dos últimos 7 dias.")
                } else {
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 8) {
                            ForEach(items) { row($0) }
                        }
                        .padding(16)
                    }
                }
            }
        }
    }

    private var controls: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                TextField("Novo termo para vigiar…", text: $newTerm)
                    .textFieldStyle(.roundedBorder)
                    .onSubmit(addTerm)
                Button("Adicionar", action: addTerm)
                    .disabled(newTerm.trimmingCharacters(in: .whitespaces).count < 2)
                Spacer()
                if store.douChecking {
                    ProgressView().controlSize(.small)
                } else {
                    Button {
                        Task { await store.checkDOU(manual: true) }
                    } label: { Label("Buscar agora", systemImage: "arrow.clockwise") }
                        .disabled(!store.isOnline || store.douTerms.isEmpty)
                }
            }
            if !store.douTerms.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(store.douTerms, id: \.self) { term in
                            HStack(spacing: 4) {
                                Text(term).font(.caption)
                                Button { store.removeDOUTerm(term) } label: {
                                    Image(systemName: "xmark.circle.fill").font(.caption2)
                                }
                                .buttonStyle(.plain).foregroundStyle(.secondary)
                            }
                            .padding(.horizontal, 8).padding(.vertical, 4)
                            .background(Capsule().fill(ThemeState.t.accent.opacity(0.14)))
                        }
                    }
                }
            }
            HStack(spacing: 6) {
                if let last = store.douLastCheck {
                    Text("Última varredura: \(last.formatted(date: .abbreviated, time: .shortened))")
                        .font(.caption2).foregroundStyle(.secondary)
                }
                Spacer()
                if !store.isOnline {
                    Label("Offline", systemImage: "wifi.slash").font(.caption2).foregroundStyle(AppTheme.warn)
                }
            }
        }
        .padding(12)
        .background(AppTheme.elevatedSurface)
    }

    private func row(_ item: DOUItem) -> some View {
        Button { if let u = URL(string: item.url) { UIApplication.shared.open(u) } } label: {
            HStack(alignment: .top, spacing: 10) {
                VStack(spacing: 1) {
                    Image(systemName: "newspaper").foregroundStyle(ThemeState.t.accent)
                    Text(item.date).font(AppTheme.ui(9).monospacedDigit()).foregroundStyle(.tertiary)
                }
                .frame(width: 54)
                VStack(alignment: .leading, spacing: 3) {
                    Text(item.title).font(.callout.weight(.semibold)).lineLimit(2)
                    if !item.snippet.isEmpty {
                        Text(item.snippet).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                    }
                    HStack(spacing: 6) {
                        LegisChip(item.section, tint: ThemeState.t.accent, variant: .soft)
                        if !item.term.isEmpty {
                            Text("“\(item.term)”").font(.caption2).foregroundStyle(.tertiary)
                        }
                    }
                }
                Spacer(minLength: 0)
                Image(systemName: "arrow.up.right.square").foregroundStyle(.tertiary).font(.caption)
            }
            .padding(.horizontal, 16).padding(.vertical, 10)
            .appSurface(accent: ThemeState.t.accent)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func addTerm() {
        store.addDOUTerm(newTerm)
        newTerm = ""
    }
}

// MARK: - Novidades legislativas

struct NovidadesListView: View {
    @EnvironmentObject var store: AppStore
    @Binding var selection: UUID?

    private var items: [LawEntry] {
        store.laws.filter(\.isNovidades)
            .sorted { $0.title.localizedCompare($1.title) == .orderedAscending }
    }

    var body: some View {
        SectionShell(icon: "sparkles", title: "Novidades 2026",
                     subtitle: "Índices oficiais da legislação de 2026 — leis, LCs, MPs e emendas. Quando sai um ato novo, a página se atualiza e você é avisada.",
                     count: items.isEmpty ? nil : items.count) {
            if items.isEmpty {
                LegisEmpty(icon: "sparkles", title: "Sem novidades ainda",
                           message: "Os índices de 2026 aparecem aqui quando são baixados. Verifique sua conexão ou tente atualizar mais tarde.")
            } else {
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(items) { law in
                            Button { selection = law.id } label: {
                                LawRow(law: law)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16).padding(.vertical, 14)
                }
            }
        }
    }
}

struct LawRow: View {
    @EnvironmentObject var store: AppStore
    let law: LawEntry
    /// Contagens pré-computadas pela lista (nil = calcula aqui, para usos avulsos).
    var annotationCount: Int? = nil
    var jurisCount: Int? = nil

    private var accent: Color {
        if law.isNovidades { return AppTheme.warn }
        if let custom = law.customCategory { return CustomCategoryStyle.color(for: custom) }
        return law.category.color
    }

    private var symbol: String {
        if law.isNovidades { return "sparkles" }
        return law.category.symbol
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            IconBubble(symbol: symbol, color: accent, size: 34)
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    if law.hasUnreadUpdate {
                        Circle().fill(AppTheme.danger).frame(width: 8, height: 8)
                    }
                    if law.favorite == true {
                        Image(systemName: "star.fill").font(.caption2).foregroundStyle(.yellow)
                    }
                    // Cor EXPLÍCITA dos tokens espelhados, não Color.primary: a semântica
                    // do sistema segue a aparência da janela, e uma aparência que discorde
                    // dos tokens escrevia branco no cartão branco — o nome da norma sumia.
                    Text(law.title)
                        .font(.system(.body, design: .default).weight(.semibold))
                        .foregroundStyle(AppTheme.ink)
                        .lineLimit(2)
                    if (law.checkFailures ?? 0) >= 3 {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.caption2).foregroundStyle(AppTheme.danger)
                            .help("As verificações desta norma estão falhando")
                    }
                }
                Text(law.reference)
                    .font(.caption)
                    .foregroundStyle(AppTheme.secondaryInk)
                    .lineLimit(1)
                // Só o estado que pede ação (não baixada / alterada) ganha destaque;
                // o resto — origem, matéria, contagens — fica discreto e à direita.
                HStack(spacing: 10) {
                    if !law.isDownloaded {
                        Chip(text: "Não baixada", symbol: "icloud.and.arrow.down", color: AppTheme.warn, filled: true)
                    } else if let changed = law.lastChanged {
                        Chip(text: "Alterada \(changed.formatted(date: .abbreviated, time: .omitted))",
                             symbol: "clock.arrow.circlepath", color: AppTheme.warn, filled: true)
                    }
                    if !law.isBuiltIn {
                        Chip(text: "Minha", symbol: "person", color: .secondary, filled: false)
                    }
                    if let custom = law.customCategory {
                        // Discreto, mas mantém a cor da matéria (sem cápsula).
                        Chip(text: custom, symbol: "tag",
                             color: CustomCategoryStyle.color(for: custom), filled: false)
                    }
                    Spacer(minLength: 0)
                    let annotationCount = annotationCount ?? store.annotations.filter { $0.lawID == law.id }.count
                    if annotationCount > 0 {
                        Label("\(annotationCount)", systemImage: "highlighter")
                            .font(.caption2).foregroundStyle(.tertiary)
                            .help("\(annotationCount) anotação(ões)")
                    }
                    let jurisCount = jurisCount ?? store.precedentCount(for: law.id)
                    if jurisCount > 0 {
                        Label("\(jurisCount)", systemImage: "text.book.closed")
                            .font(.caption2).foregroundStyle(.tertiary)
                            .help("\(jurisCount) item(ns) de jurisprudência")
                    }
                }
                if let record = store.study[law.id.uuidString], record.unitTotal > 0, !record.readKeys.isEmpty {
                    HStack(spacing: 6) {
                        ProgressView(value: min(1, Double(record.readKeys.count) / Double(record.unitTotal)))
                            .tint(accent)
                        Text("\(record.readKeys.count)/\(record.unitTotal)")
                            .font(Typo.num(10, .regular))
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .padding(.vertical, 11)
        .padding(.leading, 15)
        .padding(.trailing, 14)
        .legisCard(tint: accent, spine: true, hover: true)
        .contentShape(Rectangle())
        .contextMenu {
            if law.isRegularLaw {   // feeds de Novidades não são favoritáveis
                Button {
                    store.toggleFavorite(law.id)
                } label: {
                    Label(law.favorite == true ? "Remover dos favoritos" : "Adicionar aos favoritos",
                          systemImage: law.favorite == true ? "star.slash" : "star")
                }
            }
        }
    }
}

// MARK: - Command palette (Buscar; ⌘K com teclado físico)

/// Salto rápido: digite para filtrar normas, matérias e ações; Retorno abre a 1ª, o X
/// (ou um toque no véu) fecha. Overlay central sobre um véu escuro — o toque "app moderno".
struct CommandPalette: View {
    @EnvironmentObject var store: AppStore
    @Binding var isPresented: Bool
    var openLaw: (UUID) -> Void
    var openSection: (SidebarItem) -> Void
    var addLaw: () -> Void
    @State private var query = ""
    @FocusState private var focused: Bool

    private var laws: [LawEntry] {
        let q = query.trimmingCharacters(in: .whitespaces)
        let base = store.laws.filter(\.isRegularLaw)
        let f = q.isEmpty ? base : base.filter {
            $0.title.localizedCaseInsensitiveContains(q) || $0.reference.localizedCaseInsensitiveContains(q)
        }
        return Array(f.sorted { $0.title.localizedCompare($1.title) == .orderedAscending }.prefix(8))
    }

    private struct PaletteAction: Identifiable { let id = UUID(); let label: String; let icon: String; let run: () -> Void }
    private var actions: [PaletteAction] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        var all: [PaletteAction] = [
            PaletteAction(label: "Todas as normas", icon: "books.vertical") { openSection(.all) },
            PaletteAction(label: "Favoritos", icon: "star") { openSection(.favorites) },
            PaletteAction(label: "Buscar em tudo (no texto das leis)", icon: "magnifyingglass") { openSection(.globalSearch) },
            PaletteAction(label: "Assuntos", icon: "tag") { openSection(.subjects) },
            PaletteAction(label: "Novidades", icon: "sparkles") { openSection(.novidades) },
            PaletteAction(label: "Diário Oficial", icon: "newspaper") { openSection(.dou) },
            PaletteAction(label: "Atualizações", icon: "bell.badge") { openSection(.updates) },
            PaletteAction(label: "Índice das normas", icon: "list.bullet.indent") { openSection(.indiceEstrutural) },
            PaletteAction(label: "Plano de leitura", icon: "calendar") { openSection(.planoLeitura) },
            PaletteAction(label: "Checklist de leitura", icon: "checklist") { openSection(.checklist) },
            PaletteAction(label: "Incidência por artigo", icon: "target") { openSection(.incidencia) },
            PaletteAction(label: "Simulado de lei seca", icon: "checkmark.seal") { openSection(.simuladoLegis) },
            PaletteAction(label: "Prova oral", icon: "mic") { openSection(.provaOral) },
            PaletteAction(label: "Cadastrar nova norma", icon: "plus.circle") { addLaw() },
        ]
        for cat in LawCategory.allCases {
            all.append(PaletteAction(label: cat.rawValue, icon: cat.symbol) { openSection(.category(cat)) })
        }
        if q.isEmpty { return Array(all.prefix(5)) }
        return all.filter { $0.label.lowercased().contains(q) }
    }

    @Environment(\.ehCompacto) private var ehCompacto

    var body: some View {
        Group {
            if ehCompacto {
                // Folha (iPhone): o painel preenche a folha do sistema, campo no topo.
                painel
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(AppTheme.cardBackground)
            } else {
                ZStack(alignment: .top) {
                    Rectangle().fill(Color.black.opacity(0.34)).ignoresSafeArea()
                        .onTapGesture { isPresented = false }
                    painel
                        // Até 580 pt (o painel do Mac), mas nunca mais que a janela: em Split View e
                        // Slide Over a paleta encolhe em vez de vazar pelas bordas.
                        .frame(maxWidth: 580)
                        .background(RoundedRectangle(cornerRadius: AppTheme.rHero, style: .continuous).fill(AppTheme.cardBackground))
                        .overlay(RoundedRectangle(cornerRadius: AppTheme.rHero, style: .continuous).strokeBorder(AppTheme.hairline, lineWidth: 1))
                        .shadow(color: Color.black.opacity(0.3), radius: 30, y: 14)
                        .padding(.horizontal, 16)
                        .padding(.top, 64)
                }
            }
        }
        .onAppear { focused = true }
        // onExitCommand (tecla Esc) não existe no iPadOS. Quem fecha aqui é o X do campo ou
        // um toque no véu escuro.
    }

    private var painel: some View {
            VStack(spacing: 0) {
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
                    TextField("Ir para norma, matéria ou ação…", text: $query)
                        .textFieldStyle(.plain).font(AppTheme.ui(17)).focused($focused)
                        .onSubmit { if let first = laws.first { choose { openLaw(first.id) } } else if let a = actions.first { choose(a.run) } }
                    // No Mac era a pastilha "esc"; o iPad não tem a tecla — vira um X de verdade.
                    Button { isPresented = false } label: {
                        Image(systemName: "xmark.circle.fill").font(AppTheme.ui(18)).foregroundStyle(.secondary)
                            .frame(minWidth: 44, minHeight: 44)   // alvo de toque ≥ 44 pt
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Fechar a busca")
                }
                .padding(.horizontal, 16).padding(.vertical, 6)
                Rectangle().fill(AppTheme.hairline).frame(height: 1)
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 2) {
                        if !laws.isEmpty {
                            paletteHeader("Normas")
                            ForEach(laws) { law in
                                paletteRow(law.category.color, law.category.symbol, law.title, law.reference) {
                                    choose { openLaw(law.id) }
                                }
                            }
                        }
                        if !actions.isEmpty {
                            paletteHeader("Ações")
                            ForEach(actions) { a in
                                paletteRow(ThemeState.t.accent, a.icon, a.label, nil) { choose(a.run) }
                            }
                        }
                        if laws.isEmpty && actions.isEmpty {
                            Text("Nada encontrado.").font(AppTheme.ui(13)).foregroundStyle(.secondary)
                                .padding(.horizontal, 12).padding(.vertical, 16)
                        }
                    }
                    .padding(8)
                }
                .frame(maxHeight: ehCompacto ? .infinity : 380)
            }
    }

    private func choose(_ run: () -> Void) { run(); isPresented = false }

    private func paletteHeader(_ t: String) -> some View {
        LegisSectionHeader(title: t).padding(.horizontal, 10).padding(.top, 8).padding(.bottom, 2)
    }

    private func paletteRow(_ color: Color, _ icon: String, _ title: String, _ sub: String?, _ act: @escaping () -> Void) -> some View {
        Button(action: act) {
            HStack(spacing: 11) {
                Image(systemName: icon).font(AppTheme.ui(13, .semibold)).foregroundStyle(color).frame(width: 22)
                VStack(alignment: .leading, spacing: 1) {
                    Text(title).font(AppTheme.ui(13.5, .medium)).foregroundStyle(AppTheme.ink).lineLimit(1)
                    if let sub { Text(sub).font(AppTheme.ui(11)).foregroundStyle(.secondary).lineLimit(1) }
                }
                Spacer()
            }
            .padding(.horizontal, 10).padding(.vertical, 7)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
