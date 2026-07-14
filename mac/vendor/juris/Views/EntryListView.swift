import SwiftUI

struct EntryListView: View {
    @Environment(LibraryStore.self) private var store
    @Environment(UpdateService.self) private var updater

    private var selection: Binding<String?> {
        Binding(get: { store.selectedID }, set: { store.selectedID = $0 })
    }

    private var searchBinding: Binding<String> {
        Binding(get: { store.searchText }, set: { store.searchText = $0 })
    }

    /// Fonte que navega por edição (JT ou informativos), quando sem busca ativa.
    private var fonteNavegavel: Fonte? {
        if case .fonte(let f) = store.selecao, f.navegaPorEdicao,
           store.searchText.trimmingCharacters(in: .whitespaces).isEmpty { return f }
        return nil
    }

    private var isIndice: Bool { if case .indice = store.selecao { return true }; return false }
    private var isNovidades: Bool { if case .novidades = store.selecao { return true }; return false }
    private var isColecao: Bool { if case .colecao = store.selecao { return true }; return false }
    @State private var mostrarAnki = false

    private var estaAtualizando: Bool {
        if case .executando = updater.fase { return true }
        return false
    }

    var body: some View {
        // Página no padrão do CátedraLEGIS: cabeçalho SectionShell (ícone + título
        // + contagem + busca inline) e barra de voltar contextual — a lista abre o
        // leitor de página inteira ao clicar (a seleção vira leitura no RootView).
        Group {
            if case .colecao(let id) = store.selecao {
                ColecaoView(colecaoID: id)   // tem cabeçalho próprio (renomear/exportar)
            } else {
                VStack(spacing: 0) {
                    backBar
                    SectionShell(icon: store.selecao.simbolo,
                                 title: store.selecao.titulo,
                                 subtitle: subtituloEscopo,
                                 count: headerCount,
                                 search: isNovidades ? nil : searchBinding,
                                 searchPrompt: isIndice ? "Filtrar termos…" : "Buscar por texto, número, tema…",
                                 trailing: toolsTrailing) {
                        conteudo
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.appBackground)
        .sheet(isPresented: $mostrarAnki) {
            ExportAnkiSheet(entries: store.resultados, titulo: store.selecao.titulo)
        }
    }

    @ViewBuilder
    private var conteudo: some View {
        if store.isLoading {
            ProgressView("Carregando corpus…").frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if isNovidades {
            NovidadesView()
        } else if isIndice {
            IndexView()
        } else if let f = fonteNavegavel {
            if f == .jurisEmTeses { EdicoesListView() }
            else { InfoEdicoesView(fonte: f) }
        } else if case .edicao(let n) = store.selecao {
            TesesDaEdicaoView(numero: n)
        } else if case .infoEdicao(let f, let n) = store.selecao {
            InfoTesesView(fonte: f, numero: n)
        } else {
            listaPadrao
        }
    }

    /// Contagem do cabeçalho (só nas listas de verbetes).
    private var headerCount: Int? {
        if isIndice || isNovidades || fonteNavegavel != nil { return nil }
        return store.resultados.count
    }

    /// Subtítulo de contexto do cabeçalho.
    private var subtituloEscopo: String? {
        switch store.selecao {
        case .filtro(let f):
            var partes: [String] = []
            if f.fonte != nil || f.tema != nil, let r = f.ramo { partes.append(r) }
            if let t = f.tribunal { partes.append(store.tribunal(t)?.nome ?? "") }
            else if let c = f.central { partes.append(c.nome) }
            let s = partes.filter { !$0.isEmpty }.joined(separator: " · ")
            return s.isEmpty ? nil : s
        case .fonte(let f): return f.central.nome
        case .favoritos: return "Verbetes que você marcou com estrela"
        case .anotacoes: return "Verbetes com anotações suas"
        case .tema: return "Assunto do índice alfabético"
        case .novidades: return "Atualizações vindas dos sites oficiais"
        default: return nil
        }
    }

    /// Para onde volta esta página (barra "‹" acima do cabeçalho).
    private var voltar: (rotulo: String, destino: Selecao)? {
        switch store.selecao {
        case .tema: return ("Índice alfabético", .indice)
        case .fonte(let f): return (f.central.nome, .central(f.central))
        case .ramo: return ("Ramos do Direito", .ramosHub)
        case .filtro(let f):
            if let r = f.ramo {
                let hub = EscopoFiltrado(central: f.central, tribunal: f.tribunal, ramo: r)
                return (r, .ramoDetalhe(hub))
            }
            if let t = f.tribunal { return (store.tribunal(t)?.nome ?? "Tribunais Específicos", .tribunal(t)) }
            if let c = f.central { return (c.nome, .central(c)) }
            return nil
        default: return nil
        }
    }

    @ViewBuilder
    private var backBar: some View {
        if let v = voltar {
            HStack {
                Button {
                    store.searchText = ""
                    store.selectedID = nil
                    store.selecao = v.destino
                } label: {
                    Label(v.rotulo, systemImage: "chevron.left").font(.system(size: 12, weight: .medium))
                }
                .buttonStyle(.borderless)
                Spacer()
            }
            .padding(.horizontal, 12).padding(.vertical, 6)
            .background(Palette.sidebarBackground)
            .overlay(alignment: .bottom) { Rectangle().fill(Palette.hairline).frame(height: 1) }
        }
    }

    private var listaPadrao: some View {
        let resultados = store.resultados
        return Group {
            if resultados.isEmpty {
                emptyState
            } else {
                List(resultados, selection: selection) { entry in
                    EntryRow(entry: entry, query: store.searchText,
                             isFavorite: store.isFavorite(entry.id),
                             isImportante: store.isImportante(entry),
                             hasNote: store.hasAnnotation(entry.id))
                        .listRowSeparatorTint(Palette.hairline)
                        .tag(entry.id)
                }
                .listStyle(.inset)
                .scrollContentBackground(.hidden)
                .background(Palette.appBackground)
            }
        }
    }

    /// Ações do cabeçalho (Atualizar nas novidades; filtro/ordenação/Anki nas listas).
    private var toolsTrailing: AnyView? {
        if isNovidades {
            return AnyView(
                Button { Task { await updater.atualizar(store: store) } } label: {
                    Label("Atualizar", systemImage: "arrow.triangle.2.circlepath")
                        .font(.system(size: 11.5, weight: .medium))
                }
                .disabled(estaAtualizando)
                .controlSize(.small)
            )
        }
        if isIndice { return nil }
        return AnyView(
            HStack(spacing: 10) {
                filterMenu
                sortMenu
                Button { mostrarAnki = true } label: {
                    Label("Anki", systemImage: "rectangle.on.rectangle.angled")
                        .font(.system(size: 11.5, weight: .medium))
                }
                .help("Exportar estes verbetes para o Anki")
            }
            .controlSize(.small)
        )
    }

    private var sortMenu: some View {
        Menu {
            Picker("Ordenar", selection: Binding(
                get: { store.ordenacao }, set: { store.ordenacao = $0 })) {
                ForEach(Ordenacao.allCases) { o in
                    Label(o.rawValue, systemImage: o.simbolo).tag(o)
                }
            }
        } label: {
            Label("Ordenar", systemImage: "arrow.up.arrow.down")
        }
    }

    private var filterMenu: some View {
        Menu {
            Picker("Filtro", selection: Binding(
                get: { store.filtro }, set: { store.filtro = $0 })) {
                ForEach(Filtro.allCases) { f in
                    Label("\(f.rawValue)  (\(store.contagemFiltro(f)))", systemImage: f.simbolo)
                        .tag(f)
                }
            }
        } label: {
            Label("Filtrar", systemImage: store.filtro == .todos
                  ? "line.3.horizontal.decrease.circle"
                  : "line.3.horizontal.decrease.circle.fill")
        }
        .foregroundStyle(store.filtro == .todos ? Color.secondary : store.filtro.cor)
        .help("Filtrar por situação/importância")
    }

    /// Estado vazio CENTRALIZADO com a mensagem certa para cada escopo
    /// (Favoritos/Anotações tinham a dica errada "selecione uma fonte…").
    private var emptyState: some View {
        Group {
            if !store.searchText.isEmpty {
                LegisEmpty(icon: "magnifyingglass", title: "Nenhum resultado",
                           message: "Nenhum verbete corresponde a “\(store.searchText)”.")
            } else if store.filtro != .todos {
                LegisEmpty(icon: "line.3.horizontal.decrease.circle", title: "Nada com este filtro",
                           message: "Nenhum verbete \(store.filtro.rawValue.lowercased()) neste escopo.",
                           actionLabel: "Limpar filtro", action: { store.filtro = .todos })
            } else {
                switch store.selecao {
                case .favoritos:
                    LegisEmpty(icon: "star", title: "Nenhum favorito ainda",
                               message: "Abra um verbete e toque na estrela na barra de ferramentas do leitor — ele passa a morar aqui.")
                case .anotacoes:
                    LegisEmpty(icon: "square.and.pencil", title: "Nenhuma anotação ainda",
                               message: "Escreva uma anotação no painel do leitor de um verbete — todos os verbetes anotados aparecem aqui.")
                default:
                    LegisEmpty(icon: "tray", title: "Nada aqui",
                               message: "Este escopo ainda não tem verbetes.")
                }
            }
        }
    }
}

// MARK: - Edições (Jurisprudência em Teses)

/// Lista de edições do Juris em Teses — cada edição abre suas teses.
struct EdicoesListView: View {
    @Environment(LibraryStore.self) private var store

    var body: some View {
        List(store.edicoesJT) { ed in
            Button {
                store.selecao = .edicao(ed.numero)
                store.selectedID = nil
            } label: {
                HStack(spacing: 12) {
                    Text("\(ed.numero)")
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundStyle(Palette.fonteJT)
                        .frame(width: 44, height: 34)
                        .background(Palette.fonteJT.opacity(0.12), in: RoundedRectangle(cornerRadius: 7))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(tituloEdicao(ed.tema))
                            .font(Typo.serifTitle(12.5, .semibold))
                            .foregroundStyle(Palette.titleInk)
                            .lineLimit(2)
                        Text("\(ed.count) tese\(ed.count == 1 ? "" : "s")")
                            .font(.system(size: 10.5))
                            .foregroundStyle(Palette.secondaryInk)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(Palette.accent.opacity(0.6))
                }
                .contentShape(Rectangle())
                .padding(.vertical, 4)
            }
            .buttonStyle(.plain)
        }
        .listStyle(.inset)
        .scrollContentBackground(.hidden)
        .background(Palette.appBackground)
        .navigationSubtitle("\(store.edicoesJT.count) edições")
    }

    private func tituloEdicao(_ tema: String) -> String {
        tema.localizedCapitalized
            .replacingOccurrences(of: " Ii", with: " II")
            .replacingOccurrences(of: " Iii", with: " III")
            .replacingOccurrences(of: " Iv", with: " IV")
            .replacingOccurrences(of: " Vi", with: " VI")
            .replacingOccurrences(of: " Vii", with: " VII")
            .replacingOccurrences(of: " Viii", with: " VIII")
            .replacingOccurrences(of: " Ix", with: " IX")
    }
}

/// Teses de uma edição, com botão de voltar às edições.
struct TesesDaEdicaoView: View {
    let numero: Int
    @Environment(LibraryStore.self) private var store

    private var selection: Binding<String?> {
        Binding(get: { store.selectedID }, set: { store.selectedID = $0 })
    }

    var body: some View {
        let teses = store.tesesDaEdicao(numero)
        VStack(spacing: 0) {
            header
            Divider()
            if teses.isEmpty {
                ContentUnavailableView("Nenhuma tese com o filtro atual", systemImage: "line.3.horizontal.decrease.circle")
            } else {
                List(teses, selection: selection) { entry in
                    EntryRow(entry: entry, query: store.searchText,
                             isFavorite: store.isFavorite(entry.id),
                             isImportante: store.isImportante(entry),
                             hasNote: store.hasAnnotation(entry.id))
                        .listRowSeparatorTint(Palette.hairline)
                        .tag(entry.id)
                }
                .listStyle(.inset)
                .scrollContentBackground(.hidden)
                .background(Palette.appBackground)
            }
        }
        .background(Palette.appBackground)
        .navigationSubtitle(store.edicaoAtual?.tema.localizedCapitalized ?? "")
    }

    private var header: some View {
        HStack(spacing: 8) {
            Button {
                store.selecao = .fonte(.jurisEmTeses)
                store.selectedID = nil
            } label: {
                Label("Edições", systemImage: "chevron.left")
                    .font(.system(size: 12, weight: .medium))
            }
            .buttonStyle(.borderless)

            Spacer()
            if let ed = store.edicaoAtual {
                Text(ed.tema)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Palette.fonteJT)
                    .lineLimit(1)
            }
        }
        .padding(.horizontal, 12).padding(.vertical, 7)
        .background(.ultraThinMaterial)
    }
}

// MARK: - Linha

struct EntryRow: View {
    @Environment(LibraryStore.self) private var store
    let entry: JurisEntry
    let query: String
    let isFavorite: Bool
    var isImportante: Bool = false
    var hasNote: Bool = false
    var mostrarLido: Bool = true

    var body: some View {
        HStack(alignment: .top, spacing: 9) {
            if mostrarLido {
                Button { store.toggleLido(entry.id) } label: {
                    Image(systemName: store.isLido(entry.id) ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 14))
                        .foregroundStyle(store.isLido(entry.id) ? Palette.fonteSTJ
                                         : Palette.secondaryInk.opacity(0.4))
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .padding(.top, 1)
                .help(store.isLido(entry.id) ? "Marcar como não lido" : "Marcar como lido")
            }
            RoundedRectangle(cornerRadius: 2)
                .fill(entry.fonteKind.cor)
                .frame(width: 3.5)
                .padding(.vertical, 2)

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    FonteBadge(fonte: entry.fonteKind, compact: true)
                    Text(entry.titulo)
                        .font(Typo.serifTitle(13.5, .semibold))
                        .foregroundStyle(Palette.titleInk)
                        .lineLimit(1)
                    if entry.situacaoKind != .vigente {
                        SituacaoPill(texto: entry.situacaoKind.rawValue)
                    }
                    Spacer(minLength: 4)
                    if hasNote {
                        Image(systemName: "square.and.pencil")
                            .font(.system(size: 10)).foregroundStyle(Palette.accent)
                    }
                    if isImportante {
                        Image(systemName: "bolt.fill")
                            .font(.system(size: 10)).foregroundStyle(Palette.accent)
                    }
                    if isFavorite {
                        Image(systemName: "star.fill")
                            .font(.system(size: 10)).foregroundStyle(.yellow)
                    }
                }

                Text(Highlighter.attributed(entry.enunciado, query: query))
                    .font(Typo.serifBody(12.5))
                    .foregroundStyle(Palette.bodyInk.opacity(0.85))
                    .lineLimit(2)
                    .lineSpacing(1.5)
                    .fixedSize(horizontal: false, vertical: true)

                if entry.ramoDireito != nil || entry.tema != nil || entry.data != nil {
                    HStack(spacing: 6) {
                        if let d = entry.data {
                            JurisChip(texto: d, simbolo: "calendar", cor: Palette.secondaryInk)
                        }
                        if let r = entry.ramoDireito {
                            JurisChip(texto: r, simbolo: "bookmark.fill", cor: Palette.accent)
                        }
                        if let t = entry.tema, t != entry.ramoDireito {
                            JurisChip(texto: t, cor: Palette.secondaryInk)
                        }
                    }
                }
            }
            .opacity(store.isLido(entry.id) ? 0.58 : 1)
        }
        .padding(.vertical, 6)
    }
}

// MARK: - Barra de pesquisa

struct SearchBar: View {
    @Binding var text: String
    var prompt: String
    @FocusState private var focado: Bool

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(focado ? Palette.accent : Palette.secondaryInk)
            TextField(prompt, text: $text)
                .textFieldStyle(.plain)
                .font(.system(size: 13))
                .foregroundStyle(Palette.bodyInk)
                .focused($focado)
            if !text.isEmpty {
                Button { text = "" } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(Palette.secondaryInk)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 11).padding(.vertical, 7)
        .background(Palette.cardBackground, in: Capsule())
        .overlay(Capsule().strokeBorder(focado ? Palette.accent.opacity(0.6) : Palette.hairline, lineWidth: 1))
        .padding(.horizontal, 12).padding(.top, 10).padding(.bottom, 8)
        .background(Palette.appBackground)
    }
}

// MARK: - Índice alfabético

struct IndexView: View {
    @Environment(LibraryStore.self) private var store

    private var grupos: [(letra: String, itens: [IndiceItem])] {
        let q = store.searchText.trimmingCharacters(in: .whitespacesAndNewlines)
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
        if q.isEmpty { return store.indice }
        return store.indice.compactMap { g in
            let f = g.itens.filter {
                $0.tema.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current).contains(q)
            }
            return f.isEmpty ? nil : (letra: g.letra, itens: f)
        }
    }

    var body: some View {
        let grupos = self.grupos
        ScrollViewReader { proxy in
            HStack(spacing: 0) {
                if grupos.isEmpty {
                    ContentUnavailableView("Nenhum assunto", systemImage: "magnifyingglass")
                        .frame(maxWidth: .infinity)
                } else {
                    List {
                        ForEach(grupos, id: \.letra) { g in
                            Section {
                                ForEach(g.itens) { item in
                                    Button {
                                        store.searchText = ""
                                        store.selecao = .tema(item.tema)
                                        store.selectedID = nil
                                    } label: {
                                        HStack(spacing: 8) {
                                            Text(item.tema)
                                                .font(.system(size: 12.5))
                                                .foregroundStyle(Palette.bodyInk)
                                                .lineLimit(2)
                                            Spacer(minLength: 6)
                                            Text("\(item.count)")
                                                .font(.system(size: 10.5, weight: .medium))
                                                .foregroundStyle(Palette.secondaryInk)
                                        }
                                        .contentShape(Rectangle())
                                        .padding(.vertical, 2)
                                    }
                                    .buttonStyle(.plain)
                                }
                            } header: {
                                Text(g.letra)
                                    .font(Typo.serifTitle(13, .bold))
                                    .foregroundStyle(Palette.accent)
                                    .id("letra-\(g.letra)")
                            }
                        }
                    }
                    .listStyle(.inset)
                    .scrollContentBackground(.hidden)
                    .background(Palette.appBackground)

                    // trilho A–Z
                    VStack(spacing: 1) {
                        ForEach(grupos, id: \.letra) { g in
                            Button { withAnimation { proxy.scrollTo("letra-\(g.letra)", anchor: .top) } } label: {
                                Text(g.letra)
                                    .font(.system(size: 9.5, weight: .bold))
                                    .foregroundStyle(Palette.accent)
                                    .frame(width: 18, height: 15)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 6)
                    .frame(width: 22)
                }
            }
        }
        .navigationSubtitle("\(grupos.reduce(0) { $0 + $1.itens.count }) termos")
    }
}

// MARK: - Informativos por edição

/// Lista de edições de um informativo (STF/STJ/TSE) — cada uma abre seus julgados.
struct InfoEdicoesView: View {
    let fonte: Fonte
    @Environment(LibraryStore.self) private var store

    var body: some View {
        List(store.edicoesInfo(fonte)) { ed in
            Button {
                store.selecao = .infoEdicao(fonte, ed.numero)
                store.selectedID = nil
            } label: {
                HStack(spacing: 12) {
                    VStack(spacing: 0) {
                        Text("\(ed.numero)")
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                            .foregroundStyle(fonte.cor)
                    }
                    .frame(width: 52, height: 34)
                    .background(fonte.cor.opacity(0.12), in: RoundedRectangle(cornerRadius: 7))
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Informativo \(ed.numero)")
                            .font(Typo.serifTitle(13, .semibold))
                            .foregroundStyle(Palette.titleInk)
                        HStack(spacing: 6) {
                            Text("\(ed.count) julgado\(ed.count == 1 ? "" : "s")")
                            if let d = ed.data { Text("· \(d)") }
                        }
                        .font(.system(size: 10.5))
                        .foregroundStyle(Palette.secondaryInk)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(Palette.accent.opacity(0.6))
                }
                .contentShape(Rectangle())
                .padding(.vertical, 4)
            }
            .buttonStyle(.plain)
        }
        .listStyle(.inset)
        .scrollContentBackground(.hidden)
        .background(Palette.appBackground)
        .navigationSubtitle("\(store.edicoesInfo(fonte).count) informativos")
    }
}

/// Julgados de um informativo específico, com botão de voltar.
struct InfoTesesView: View {
    let fonte: Fonte
    let numero: Int
    @Environment(LibraryStore.self) private var store

    private var selection: Binding<String?> {
        Binding(get: { store.selectedID }, set: { store.selectedID = $0 })
    }

    var body: some View {
        let julgados = store.julgadosInfo(fonte, numero)
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                Button {
                    store.selecao = .fonte(fonte)
                    store.selectedID = nil
                } label: {
                    Label(fonte.nome, systemImage: "chevron.left")
                        .font(.system(size: 12, weight: .medium))
                }
                .buttonStyle(.borderless)
                Spacer()
                Text("Informativo \(numero)")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(fonte.cor).lineLimit(1)
            }
            .padding(.horizontal, 12).padding(.vertical, 7)
            .background(Palette.sidebarBackground)
            .overlay(alignment: .bottom) { Rectangle().fill(Palette.hairline).frame(height: 1) }

            if julgados.isEmpty {
                ContentUnavailableView("Nenhum julgado com o filtro atual", systemImage: "line.3.horizontal.decrease.circle")
            } else {
                List(julgados, selection: selection) { entry in
                    EntryRow(entry: entry, query: "",
                             isFavorite: store.isFavorite(entry.id),
                             isImportante: store.isImportante(entry),
                             hasNote: store.hasAnnotation(entry.id))
                        .listRowSeparatorTint(Palette.hairline)
                        .tag(entry.id)
                }
                .listStyle(.inset)
                .scrollContentBackground(.hidden)
                .background(Palette.appBackground)
            }
        }
        .background(Palette.appBackground)
        .navigationSubtitle("\(julgados.count) julgado\(julgados.count == 1 ? "" : "s")")
    }
}
