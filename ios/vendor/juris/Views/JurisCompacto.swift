import SwiftUI

// ─────────────────────────────────────────────────────────────────────────────
// CátedraJURIS em largura COMPACTA (iPhone em retrato, Slide Over de 320 pt no iPad).
// Frente F3 do plano do iPhone (docs/plans/iphone-nativo-2026-09-11.md). Em largura
// regular (iPad em tela cheia) NADA daqui é montado: RootView continua com a sidebar
// fixa de 210 pt e o LeitorCheio de sempre. Tudo liga por `ehCompacto` (size class),
// nunca por userInterfaceIdiom. Os nomes levam o prefixo "juris" porque LEGIS e JURIS
// compilam no MESMO módulo e um símbolo repetido não compila.
// ─────────────────────────────────────────────────────────────────────────────

// MARK: - Menu (uma definição para a sidebar do iPad e para a lista "Seções" do iPhone)

/// Uma linha do menu do JURIS. `badge`/`ponto` são lidos do store na hora de desenhar,
/// para a fila de trabalho (revisar hoje, checklist, novidades) aparecer nos dois lugares.
struct JurisMenuItem: Identifiable {
    let selecao: Selecao
    let rotulo: String
    let simbolo: String
    var chevron: Bool = false
    // O store é @MainActor: os leitores também, para o compilador aceitar a chamada.
    var badge: @MainActor (LibraryStore) -> Int = { _ in 0 }
    var ponto: @MainActor (LibraryStore) -> Bool = { _ in false }
    var id: Selecao { selecao }
}

struct JurisMenuGrupo: Identifiable {
    let titulo: String
    let itens: [JurisMenuItem]
    var id: String { titulo }
}

/// Os quatro grupos da rotina de quem treina magistratura (ver o cabeçalho de
/// SidebarView). As coleções da pessoa entram depois do último grupo, ao vivo.
enum JurisMenu {
    static let grupos: [JurisMenuGrupo] = [
        JurisMenuGrupo(titulo: "HOJE", itens: [
            JurisMenuItem(selecao: .inicio, rotulo: "Início", simbolo: "house"),
            JurisMenuItem(selecao: .hoje, rotulo: "Revisar hoje", simbolo: "sun.horizon",
                          badge: { $0.srsDueCount + $0.checklistPendingCount }),
            JurisMenuItem(selecao: .novidades, rotulo: "Novidades", simbolo: "sparkles",
                          ponto: { $0.novidadesNaoVistas > 0 }),
        ]),
        JurisMenuGrupo(titulo: "TREINAR", itens: [
            JurisMenuItem(selecao: .simulado, rotulo: "Simulado", simbolo: "list.bullet.clipboard"),
            JurisMenuItem(selecao: .provaOral, rotulo: "Prova oral", simbolo: "mic"),
            JurisMenuItem(selecao: .oralBancas, rotulo: "Prova oral · bancas", simbolo: "person.wave.2"),
            JurisMenuItem(selecao: .julgadoDoDia, rotulo: "Julgado do dia", simbolo: "sun.max"),
            JurisMenuItem(selecao: .plano, rotulo: "Plano de leitura", simbolo: "calendar"),
            JurisMenuItem(selecao: .mapas, rotulo: "Mapas mentais", simbolo: "brain.head.profile"),
        ]),
        JurisMenuGrupo(titulo: "ACERVO", itens: [
            JurisMenuItem(selecao: .todos, rotulo: "Todos os verbetes", simbolo: "square.stack.3d.up"),
            JurisMenuItem(selecao: .ramosHub, rotulo: "Ramos do Direito", simbolo: "books.vertical", chevron: true),
            JurisMenuItem(selecao: .gradeInformativos, rotulo: "Informativos", simbolo: "square.grid.3x3"),
            JurisMenuItem(selecao: .central(.stf), rotulo: "STF", simbolo: "building.columns"),
            JurisMenuItem(selecao: .central(.stj), rotulo: "STJ", simbolo: "building.columns"),
            JurisMenuItem(selecao: .central(.tse), rotulo: "TSE", simbolo: "building.columns"),
            JurisMenuItem(selecao: .central(.especificos), rotulo: "Tribunais (TJRO, TJGO…)", simbolo: "building.2", chevron: true),
            JurisMenuItem(selecao: .central(.contas), rotulo: "Cortes de contas", simbolo: "banknote"),
            JurisMenuItem(selecao: .central(.outros), rotulo: "DOD & Precedentes", simbolo: "text.book.closed"),
        ]),
        JurisMenuGrupo(titulo: "MEU ESTUDO", itens: [
            JurisMenuItem(selecao: .favoritos, rotulo: "Favoritos", simbolo: "star"),
            JurisMenuItem(selecao: .anotacoes, rotulo: "Minhas anotações", simbolo: "square.and.pencil"),
            JurisMenuItem(selecao: .checklist, rotulo: "Checklist de leitura", simbolo: "checklist",
                          badge: { $0.checklistPendingCount }),
            JurisMenuItem(selecao: .indice, rotulo: "Índice alfabético", simbolo: "textformat.abc"),
        ]),
    ]

    /// Título de "onde estou" para a barra de navegação compacta (coleção e tribunal
    /// têm nome próprio; o resto usa o título da seleção).
    @MainActor static func titulo(_ s: Selecao, store: LibraryStore) -> String {
        switch s {
        case .tribunal(let id): return store.tribunal(id)?.nome ?? "Central do tribunal"
        case .colecao(let id): return store.colecoes.first { $0.id == id }?.nome ?? "Coleção"
        default: return s.titulo
        }
    }
}

// MARK: - Pilha de navegação compacta

/// Um destino da pilha. A FONTE DA VERDADE continua sendo o LibraryStore (`selecao`,
/// `leituraID`, `selectedID`): a pilha é só o espelho dela, e por isso TODOS os 46
/// `store.ir(...)` do módulo (hubs, HubBackBar, coleções, novidades, Home) levam à tela
/// certa sem saber que existe pilha.
enum JurisDestinoCompacto: Hashable {
    case secoes              // a lista "Seções" (a sidebar do iPad, como tela)
    case secao(Selecao)      // a página de uma seção (a mesma que o iPad mostra ao lado da sidebar)
    case verbete(String)     // o leitor de um verbete
}

/// Raiz do JURIS em compacto: UM NavigationStack. Início na base; "Seções" (list.bullet)
/// empurra a lista da sidebar como tela; a seção escolhida e o verbete entram na pilha
/// pelo que o store já escreve. Voltar (botão ou gesto da borda) limpa o store.
struct JurisCompactoRaiz: View {
    @Environment(LibraryStore.self) private var store
    @State private var caminho: [JurisDestinoCompacto] = []

    var body: some View {
        NavigationStack(path: $caminho) {
            Group {
                if store.isLoading || store.loadError != nil || store.entries.isEmpty {
                    JurisEstadoAcervo()
                } else {
                    JurisPagina(selecao: .inicio)
                }
            }
            .navigationTitle("Início")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button { caminho = [.secoes] } label: {
                        Image(systemName: "list.bullet").font(Typo.ui(17, .medium)).alvoToque()
                    }
                    .accessibilityLabel("Seções")
                }
                ToolbarItem(placement: .topBarTrailing) { JurisBarraCompacta() }
            }
            .navigationDestination(for: JurisDestinoCompacto.self) { destino in
                switch destino {
                case .secoes:
                    JurisSecoesLista(aoEscolher: escolher)
                case .secao(let s):
                    JurisPagina(selecao: s)
                        .navigationTitle(JurisMenu.titulo(s, store: store))
                        .navigationBarTitleDisplayMode(.inline)
                        .toolbar { ToolbarItem(placement: .topBarTrailing) { JurisBarraCompacta(comBusca: false) } }
                case .verbete(let id):
                    if let e = store.byId[id] {
                        EntryDetailView(entry: e)
                    } else {
                        ProgressView("Abrindo o verbete…")
                    }
                }
            }
        }
        .onAppear {
            sincronizarDoStore()
            #if targetEnvironment(simulator)
            JurisEnsaio.aplicar(store: store) { }
            if JurisEnsaio.folha == "secoes" {
                // A raiz compacta pode ser recriada quando o size class chega: o pedido é
                // reaplicado a cada aparição, depois de o acervo carregar.
                Task { @MainActor in
                    while store.isLoading || store.entries.isEmpty { try? await Task.sleep(nanoseconds: 300_000_000) }
                    try? await Task.sleep(nanoseconds: 500_000_000)
                    if caminho.isEmpty { caminho = [.secoes] }
                }
            }
            #endif
        }
        .onChange(of: store.selecao) { sincronizarDoStore() }
        .onChange(of: store.leituraID) { sincronizarDoStore() }
        .onChange(of: store.selectedID) { sincronizarDoStore() }
        .onChange(of: caminho) { _, novo in sincronizarParaStore(novo) }
    }

    /// Toque numa linha da lista "Seções": navega pelo store (como a sidebar) e deixa a
    /// lista por baixo, para o Voltar da seção cair nela. Se a seção já era a atual, o
    /// store não muda e o onChange não dispara — por isso a pilha é escrita aqui também.
    private func escolher(_ s: Selecao) {
        store.ir(s)
        caminho = (s == .inicio) ? [] : [.secoes, .secao(s)]
    }

    /// A pilha que o estado do store pede agora. Mantém "Seções" na base quando ela já
    /// estava lá; só uma seção por vez (as páginas leem `store.selecao`, então duas na
    /// pilha mostrariam o mesmo conteúdo), e o verbete por cima.
    private func caminhoEspelho() -> [JurisDestinoCompacto] {
        var c: [JurisDestinoCompacto] = (caminho.first == .secoes) ? [.secoes] : []
        if store.selecao != .inicio { c.append(.secao(store.selecao)) }
        if let id = store.leituraID ?? store.selectedID { c.append(.verbete(id)) }
        return c
    }

    private func sincronizarDoStore() {
        let c = caminhoEspelho()
        if c != caminho { caminho = c }
    }

    /// Voltar (botão ou gesto) tirou algo da pilha: o store acompanha. Idempotente — quando
    /// a pilha foi escrita a partir do store, nada aqui muda.
    private func sincronizarParaStore(_ novo: [JurisDestinoCompacto]) {
        let temVerbete = novo.contains { if case .verbete = $0 { return true }; return false }
        if !temVerbete, store.leituraID != nil || store.selectedID != nil {
            store.leituraID = nil
            store.selectedID = nil
        }
        let temSecao = novo.contains { if case .secao = $0 { return true }; return false }
        if !temSecao, store.selecao != .inicio { store.selecao = .inicio }
    }
}

/// Busca, sino e cronômetro como itens da barra de navegação (o `jurisTopBar` do iPad não
/// é montado em compacto — seria a terceira barra empilhada). Cada alvo tem 44 pt.
struct JurisBarraCompacta: View {
    /// Nas telas empurradas o título é longo e o cabeçalho (SectionShell) já tem busca:
    /// a lupa fica só na raiz.
    var comBusca: Bool = true
    @Environment(LibraryStore.self) private var store
    @ObservedObject private var clock = JurisClock.shared

    var body: some View {
        HStack(spacing: 0) {
            if comBusca {
                Button { store.ir(.todos) } label: {
                    Image(systemName: "magnifyingglass").font(Typo.ui(16, .medium)).alvoToque()
                }
                .accessibilityLabel("Buscar em tudo")
            }
            Button { store.ir(.novidades) } label: {
                Image(systemName: store.novidadesNaoVistas > 0 ? "bell.badge.fill" : "bell")
                    .font(Typo.ui(16, .medium)).alvoToque()
            }
            .accessibilityLabel(store.novidadesNaoVistas > 0 ? "Novidades — há atualizações não vistas" : "Novidades")
            Button { clock.togglePlay() } label: {
                HStack(spacing: 6) {
                    Text(clock.formatted)
                        .font(Typo.num(13, .bold)).lineLimit(1).fixedSize()
                        .foregroundStyle(clock.running ? Palette.accent : Palette.titleInk)
                    Image(systemName: clock.manualPlaying ? "pause.fill" : "play.fill")
                        .font(Typo.ui(10, .bold)).foregroundStyle(.white)
                        .frame(width: 24, height: 24)
                        .background(Circle().fill(clock.manualPlaying ? Palette.secondaryInk : Palette.accent))
                }
                .padding(.leading, 6)
                .alvoToque()
            }
            .accessibilityLabel(clock.manualPlaying ? "Pausar o relógio de estudo" : "Iniciar o relógio de estudo")
            .accessibilityValue(clock.formatted)
        }
        .buttonStyle(.plain)
        .foregroundStyle(Palette.titleInk)
    }
}

/// A sidebar do iPad como TELA: os mesmos quatro grupos, as mesmas linhas, os mesmos
/// `store.ir`. List inset grouped, linhas de 44 pt, coleções ao vivo e Ajustes no fim.
struct JurisSecoesLista: View {
    let aoEscolher: (Selecao) -> Void
    @Environment(LibraryStore.self) private var store
    @State private var novaColecao = false

    var body: some View {
        List {
            ForEach(JurisMenu.grupos) { g in
                Section {
                    ForEach(g.itens) { it in
                        linha(it.selecao, it.rotulo, it.simbolo, chevron: it.chevron,
                              badge: it.badge(store), ponto: it.ponto(store))
                    }
                    if g.id == JurisMenu.grupos.last?.id {
                        ForEach(store.colecoes) { c in linha(.colecao(c.id), c.nome, "folder") }
                        Button { novaColecao = true } label: {
                            Label("Nova coleção", systemImage: "plus")
                                .font(Typo.ui(15, .medium)).foregroundStyle(Palette.accent)
                                .frame(minHeight: 44, alignment: .leading)
                        }
                    }
                } header: {
                    Text(g.titulo).font(Typo.ui(11, .bold)).tracking(0.9).foregroundStyle(Palette.secondaryInk)
                }
            }
            Section {
                Button {
                    // O host (main.swift) escuta esta notificação e apresenta os Ajustes do JURIS.
                    NotificationCenter.default.post(name: JurisHostBridge.openSettings, object: nil)
                } label: {
                    Label("Ajustes do CátedraJURIS", systemImage: "gearshape")
                        .font(Typo.ui(15, .medium)).foregroundStyle(Palette.titleInk)
                        .frame(minHeight: 44, alignment: .leading)
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(Palette.appBackground)
        .navigationTitle("Seções")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $novaColecao) {
            JurisNovaColecaoFolha { nome in
                let c = store.criarColecao(nome)
                aoEscolher(.colecao(c.id))
            }
        }
    }

    private func ativa(_ s: Selecao) -> Bool { store.leituraID == nil && store.selecao == s }

    private func linha(_ sel: Selecao, _ rotulo: String, _ simbolo: String,
                       chevron: Bool = false, badge: Int = 0, ponto: Bool = false) -> some View {
        let cor: Color = {
            if case .central(let c) = sel { return Palette.corDeCentral(c) }
            return Palette.accent
        }()
        return Button { aoEscolher(sel) } label: {
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous)
                    .fill(cor.opacity(0.14)).frame(width: 30, height: 30)
                    .overlay(Image(systemName: simbolo).font(Typo.ui(14, .semibold)).foregroundStyle(cor))
                Text(rotulo).font(Typo.ui(15, ativa(sel) ? .semibold : .regular))
                    .foregroundStyle(Palette.titleInk).lineLimit(1)
                Spacer(minLength: 4)
                if badge > 0 {
                    Text("\(badge)").font(Typo.num(11, .bold)).foregroundStyle(.white)
                        .padding(.horizontal, 7).padding(.vertical, 2)
                        .background(Capsule().fill(Palette.accent))
                }
                if ponto { Circle().fill(Palette.accent).frame(width: 8, height: 8) }
                Image(systemName: "chevron.right").font(Typo.ui(11, .bold))
                    .foregroundStyle(Palette.secondaryInk.opacity(0.6))
            }
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(badge > 0 ? "\(rotulo), \(badge) pendentes" : rotulo)
    }
}

/// Carregando / falha de carga do acervo — o mesmo texto que o iPad mostra.
struct JurisEstadoAcervo: View {
    @Environment(LibraryStore.self) private var store

    var body: some View {
        if store.isLoading {
            ProgressView("Carregando jurisprudência…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Palette.appBackground)
        } else {
            /* A falha de carga era 100% silenciosa: loadError era atribuído e nenhuma
               view o exibia — o app abria vazio, sem explicação. Linguagem de produto,
               sem nome de arquivo: o detalhe técnico fica no log. */
            VStack(spacing: 10) {
                Text("O acervo de jurisprudência não pôde ser aberto.")
                    .font(Typo.ui(15, .semibold))
                Text("Feche e abra o aplicativo. Se continuar assim, reinstale o CátedraJURIS — o acervo vem dentro dele.")
                    .font(Typo.ui(12.5))
                    .foregroundStyle(Palette.secondaryInk)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(30)
            .background(Palette.appBackground)
        }
    }
}

// MARK: - Folha "Nova coleção" (compacto)

/// No iPad a nova coleção é um alerta com campo. No iPhone o alerta é apertado e não tem
/// trava de rascunho; aqui é uma folha: o arrastão NÃO fecha com nome digitado e o Fechar
/// pergunta antes de descartar. "Concluir" na barra do teclado, corpo rolável.
struct JurisNovaColecaoFolha: View {
    var mensagem: String? = nil
    let aoCriar: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var nome = ""
    @State private var confirmarDescarte = false
    @FocusState private var foco: Bool

    private var nomeLimpo: String { nome.trimmingCharacters(in: .whitespaces) }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    TextField("Nome (ex.: Meu edital)", text: $nome)
                        .textFieldStyle(.roundedBorder)
                        .font(Typo.ui(16))
                        .focused($foco)
                        .submitLabel(.done)
                        .onSubmit(criar)
                    if let mensagem {
                        Text(mensagem).font(Typo.ui(12.5)).foregroundStyle(Palette.secondaryInk)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(20)
            }
            .background(Palette.appBackground)
            .navigationTitle("Nova coleção")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fechar") { if nome.isEmpty { dismiss() } else { confirmarDescarte = true } }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Criar", action: criar).disabled(nomeLimpo.isEmpty)
                }
            }
            .tecladoConcluir(foco: $foco)
            .confirmationDialog("Descartar o que você escreveu?", isPresented: $confirmarDescarte, titleVisibility: .visible) {
                Button("Descartar", role: .destructive) { dismiss() }
                Button("Continuar escrevendo", role: .cancel) {}
            }
        }
        .folhaAdaptavel(temRascunho: !nome.isEmpty)
        .onAppear { foco = true }
    }

    private func criar() {
        guard !nomeLimpo.isEmpty else { return }
        aoCriar(nomeLimpo)
        dismiss()
    }
}

// MARK: - Peças de layout que mudam só em compacto

/// Fileira que QUEBRA de linha em compacto (Flow) e continua HStack em regular — para o
/// iPad ficar pixel a pixel igual e o iPhone não estourar a borda.
struct JurisFileira<Conteudo: View>: View {
    @Environment(\.ehCompacto) private var ehCompacto
    var espacamento: CGFloat = 9
    var alinhamento: VerticalAlignment = .center
    @ViewBuilder let conteudo: () -> Conteudo

    var body: some View {
        if ehCompacto {
            Flow(espacamento: espacamento) { conteudo() }
        } else {
            HStack(alignment: alinhamento, spacing: espacamento) { conteudo() }
        }
    }
}

/// Cartões lado a lado no iPad; grade que quebra em compacto (`compacto` vem do chamador).
struct JurisGradeOuFileira<Conteudo: View>: View {
    let compacto: Bool
    var minimo: CGFloat = 150
    var espacamento: CGFloat = 10
    @ViewBuilder let conteudo: () -> Conteudo

    var body: some View {
        if compacto {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: minimo), spacing: espacamento)], spacing: espacamento) { conteudo() }
        } else {
            HStack(spacing: espacamento) { conteudo() }
        }
    }
}

/// Margem horizontal de página: 26 pt (ou o valor de hoje) no iPad, 16 em compacto.
struct JurisMargemPagina: ViewModifier {
    @Environment(\.ehCompacto) private var ehCompacto
    let regular: CGFloat
    func body(content: Content) -> some View {
        content.padding(.horizontal, ehCompacto ? 16 : regular)
    }
}

/// No iPhone a `List(selection:)` não seleciona ao toque (só em modo de edição): o toque na
/// linha passa a abrir o verbete. No iPad nada muda — a seleção da lista continua mandando.
struct JurisAbreNoToque: ViewModifier {
    @Environment(\.ehCompacto) private var ehCompacto
    @Environment(LibraryStore.self) private var store
    let id: String
    func body(content: Content) -> some View {
        if ehCompacto {
            content.contentShape(Rectangle()).onTapGesture { store.selectedID = id }
        } else {
            content
        }
    }
}

/// Prévia ESCALADA de um canvas de largura fixa (o mapa mental tem 1040 pt, feitos para
/// exportar): cabe inteiro na largura que houver, sem arrastar em dois eixos.
struct JurisPreviaEscalada<Conteudo: View>: View {
    let larguraNatural: CGFloat
    @ViewBuilder let conteudo: () -> Conteudo
    @State private var alturaNatural: CGFloat = 0

    var body: some View {
        GeometryReader { geo in
            let escala = min(1, max(0.1, geo.size.width / larguraNatural))
            ScrollView(.vertical) {
                conteudo()
                    .background(GeometryReader { g in
                        Color.clear
                            .onAppear { alturaNatural = g.size.height }
                            .onChange(of: g.size.height) { _, nova in alturaNatural = nova }
                    })
                    .scaleEffect(escala, anchor: .topLeading)
                    .frame(width: larguraNatural * escala, height: alturaNatural * escala, alignment: .topLeading)
            }
        }
    }
}

extension View {
    func jurisMargemPagina(_ regular: CGFloat = 26) -> some View { modifier(JurisMargemPagina(regular: regular)) }
    func jurisAbreNoToque(_ id: String) -> some View { modifier(JurisAbreNoToque(id: id)) }
}

// MARK: - Ensaio no simulador (só compila para o simulador; no aparelho não existe)

#if targetEnvironment(simulator)
/// Ganchos de VERIFICAÇÃO por captura, ligados por argumentos de lançamento do simulador
/// (`xcrun simctl launch … -abaJuris -jurisIr todos -jurisVerbete -jurisFolha mapa -jurisMedir`).
/// Servem para abrir a mesma tela sempre, sem toque, e para medir os alvos: a árvore de
/// acessibilidade (o que o `inspect` devolve) sai no log unificado, um elemento por linha,
/// com moldura em pontos. Nada disto entra no binário do aparelho.
enum JurisEnsaio {
    static let argumentos = ProcessInfo.processInfo.arguments

    static func valor(_ chave: String) -> String? {
        guard let i = argumentos.firstIndex(of: chave), argumentos.indices.contains(i + 1) else { return nil }
        return argumentos[i + 1]
    }
    static var abrirVerbete: Bool { argumentos.contains("-jurisVerbete") }
    static var folha: String? { valor("-jurisFolha") }
    static var medir: Bool { argumentos.contains("-jurisMedir") }
    static var secao: Selecao? {
        switch valor("-jurisIr") {
        case "todos": return .todos
        case "hoje": return .hoje
        case "stf": return .central(.stf)
        case "favoritos": return .favoritos
        case "novidades": return .novidades
        case "simulado": return .simulado
        case "indice": return .indice
        case "mapas": return .mapas
        default: return nil
        }
    }

    private static var aplicado = false
    private static var medidor: Timer?

    /// Chamado pela raiz (compacta ou regular) ao aparecer: espera o acervo carregar e
    /// aplica a navegação pedida UMA vez. `abrirSecoes` é como a casca compacta empurra
    /// a lista "Seções"; a regular ignora.
    static func aplicar(store: LibraryStore, abrirSecoes: @escaping () -> Void) {
        guard !aplicado, argumentos.contains(where: { $0.hasPrefix("-juris") }) else { return }
        aplicado = true
        Task { @MainActor in
            while store.isLoading || store.entries.isEmpty { try? await Task.sleep(nanoseconds: 300_000_000) }
            if let s = secao { store.ir(s) }
            if folha == "secoes" { abrirSecoes() }
            if abrirVerbete, let primeiro = store.entries.first {
                // O mesmo caminho do deep link LEGIS → JURIS (JurisPorArtigo → store.abrirVerbete).
                store.abrirVerbete(primeiro.id)
            }
            if medir {
                medidor = Timer.scheduledTimer(withTimeInterval: 4, repeats: true) { _ in
                    MainActor.assumeIsolated { medirTela() }
                }
            }
        }
    }

    /// Percorre a árvore de acessibilidade da janela (a mesma que o VoiceOver e o `inspect`
    /// leem) e escreve um elemento por linha no log: tipo, moldura em pontos e rótulo.
    @MainActor
    static func medirTela() {
        let janelas = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }.flatMap { $0.windows }
        guard let janela = janelas.first(where: { $0.isKeyWindow }) ?? janelas.last else { return }
        var n = 0
        func visitar(_ obj: NSObject, _ prof: Int) {
            guard prof < 60, n < 600 else { return }
            if obj.isAccessibilityElement {
                let f = obj.accessibilityFrame
                let t = obj.accessibilityTraits
                let tipo = t.contains(.button) ? "botao" : t.contains(.searchField) ? "busca"
                    : t.contains(.staticText) ? "texto" : t.contains(.image) ? "imagem"
                    : t.contains(.adjustable) ? "ajustavel" : "elemento"
                let rotulo = (obj.accessibilityLabel ?? "").replacingOccurrences(of: "\n", with: " ")
                n += 1
                NSLog("JURIS-MEDIR|%@|%.0f,%.0f %.0fx%.0f|%@", tipo, f.minX, f.minY, f.width, f.height, rotulo)
            }
            // O SwiftUI publica a árvore pelo protocolo UIAccessibilityContainer
            // (accessibilityElementCount/accessibilityElement(at:)), não por accessibilityElements.
            let total = obj.accessibilityElementCount()
            if total > 0 && total != NSNotFound {
                for i in 0..<total {
                    if let filho = obj.accessibilityElement(at: i) as? NSObject { visitar(filho, prof + 1) }
                }
            } else if let filhos = obj.accessibilityElements as? [NSObject], !filhos.isEmpty {
                filhos.forEach { visitar($0, prof + 1) }
            } else if let v = obj as? UIView {
                v.subviews.forEach { visitar($0, prof + 1) }
            }
        }
        // Folhas e alertas vivem em janelas próprias: percorre todas, a chave por último.
        for j in janelas where j !== janela { visitar(j, 0) }
        visitar(janela, 0)
        NSLog("JURIS-MEDIR|fim|%d elementos", n)
    }
}
#endif
