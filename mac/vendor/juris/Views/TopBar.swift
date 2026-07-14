import SwiftUI

/// Barra superior de navegação: logo + menus (Ramos, Fontes, Biblioteca) + busca + tema.
struct TopBar: View {
    @Environment(LibraryStore.self) private var store
    @Environment(UpdateService.self) private var updater
    @AppStorage("jurisAppearance") private var appearanceRaw = Appearance.claro.rawValue
    @State private var novaColecao = false
    @State private var nomeColecao = ""

    private var searchBinding: Binding<String> {
        Binding(get: { store.searchText }, set: { novo in
            store.searchText = novo
            if !novo.isEmpty, case .inicio = store.selecao { store.selecao = .todos }
        })
    }

    private func ativa(_ s: Selecao) -> Bool { store.selecao == s }

    var body: some View {
        HStack(spacing: 14) {
            // Marca
            HStack(spacing: 9) {
                Image(systemName: "books.vertical.fill")
                    .font(.system(size: 15, weight: .semibold)).foregroundStyle(Palette.accent)
                VStack(alignment: .leading, spacing: -1) {
                    Text("Vade Mecum").font(Typo.serifTitle(15, .bold)).foregroundStyle(Palette.titleInk)
                    Text("JURISPRUDÊNCIA").font(.system(size: 7.5, weight: .bold)).tracking(1.4)
                        .foregroundStyle(Palette.accent)
                }
            }
            .onTapGesture { store.selecao = .inicio; store.selectedID = nil }

            Divider().frame(height: 22)

            // Navegação principal
            navBtn("Início", "house", ativo: ativa(.inicio)) { store.selecao = .inicio; store.selectedID = nil }

            ramosMenu
            fontesMenu
            bibliotecaMenu

            navBtn("Índice", "textformat.abc", ativo: ativa(.indice)) { store.selecao = .indice }

            // Novidades com contador
            Button { store.selecao = .novidades } label: {
                HStack(spacing: 5) {
                    Image(systemName: "sparkles")
                    Text("Novidades").font(.system(size: 12.5, weight: .medium))
                    if store.novidadesNaoVistas > 0 {
                        Text("\(store.novidadesNaoVistas)")
                            .font(.system(size: 9, weight: .bold))
                            .padding(.horizontal, 5).padding(.vertical, 1)
                            .background(Palette.accent, in: Capsule())
                            .foregroundStyle(Palette.appBackground)
                    }
                }
                .foregroundStyle(ativa(.novidades) ? Palette.accent : Palette.bodyInk)
            }
            .buttonStyle(.plain)
            .focusable(false)

            Spacer(minLength: 12)

            buscaGlobal
            temaControl
            SettingsLink {
                Image(systemName: "gearshape").font(.system(size: 13)).foregroundStyle(Palette.secondaryInk)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 16).padding(.vertical, 9)
        .background(Palette.sidebarBackground)
        .overlay(alignment: .bottom) { Rectangle().fill(Palette.hairline).frame(height: 1) }
        .alert("Nova coleção", isPresented: $novaColecao) {
            TextField("Nome (ex.: Meu edital)", text: $nomeColecao)
            Button("Criar") {
                let nome = nomeColecao.trimmingCharacters(in: .whitespaces)
                let c = store.criarColecao(nome.isEmpty ? "Nova coleção" : nome)
                store.selecao = .colecao(c.id); store.selectedID = nil
            }
            Button("Cancelar", role: .cancel) {}
        }
    }

    // MARK: Botões / menus

    private func navBtn(_ titulo: String, _ icone: String, ativo: Bool, _ acao: @escaping () -> Void) -> some View {
        Button(action: acao) {
            HStack(spacing: 5) {
                Image(systemName: icone)
                Text(titulo).font(.system(size: 12.5, weight: .medium))
            }
            .foregroundStyle(ativo ? Palette.accent : Palette.bodyInk)
        }
        .buttonStyle(.plain)
        .focusable(false)   // barra de navegação é por mouse — evita o anel de foco azul ao abrir
    }

    private var ramosMenu: some View {
        Menu {
            ForEach(store.disciplinasOrdenadas, id: \.nome) { d in
                Menu {
                    Button {
                        store.searchText = ""; store.selecao = .ramo(d.nome); store.selectedID = nil
                    } label: { Label("Ver toda a disciplina  (\(d.count))", systemImage: "square.stack.3d.up") }
                    let topicos = store.topicosDe(d.nome)
                    if !topicos.isEmpty {
                        Divider()
                        ForEach(topicos, id: \.nome) { t in
                            Button {
                                store.searchText = ""; store.selecao = .tema(t.nome); store.selectedID = nil
                            } label: { Text("\(t.nome)  (\(t.count))") }
                        }
                    }
                } label: { Text("\(d.nome)  (\(d.count))") }
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "books.vertical")
                Text("Ramos do Direito").font(.system(size: 12.5, weight: .medium))
                Image(systemName: "chevron.down").font(.system(size: 8, weight: .bold))
            }
            .foregroundStyle(Palette.bodyInk)
        }
        .menuStyle(.borderlessButton).fixedSize()
        .focusable(false)
    }

    private var fontesMenu: some View {
        Menu {
            Button { store.searchText = ""; store.selecao = .tjroHub; store.selectedID = nil } label: {
                Label("★ Central do TJRO", systemImage: "building.2.fill")
            }
            Divider()
            ForEach(Fonte.ordem.filter { (store.fonteCounts[$0] ?? 0) > 0 }) { f in
                Button {
                    store.searchText = ""; store.selecao = .fonte(f); store.selectedID = nil
                } label: { Label("\(f.nome)  (\(store.fonteCounts[f] ?? 0))", systemImage: f.simbolo) }
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "building.columns")
                Text("Fontes").font(.system(size: 12.5, weight: .medium))
                Image(systemName: "chevron.down").font(.system(size: 8, weight: .bold))
            }
            .foregroundStyle(Palette.bodyInk)
        }
        .menuStyle(.borderlessButton).fixedSize()
        .focusable(false)
    }

    private var bibliotecaMenu: some View {
        Menu {
            Button { store.selecao = .todos; store.selectedID = nil } label: { Label("Todos os verbetes", systemImage: "square.stack.3d.up.fill") }
            Button { store.selecao = .favoritos } label: { Label("Favoritos (\(store.favorites.count))", systemImage: "star.fill") }
            Button { store.selecao = .anotacoes } label: { Label("Minhas anotações (\(store.annotationsCount))", systemImage: "square.and.pencil") }
            Divider()
            if store.colecoes.isEmpty {
                Text("Nenhuma coleção")
            } else {
                ForEach(store.colecoes) { c in
                    Button { store.selecao = .colecao(c.id); store.selectedID = nil } label: {
                        Label("\(c.nome) (\(c.ids.count))", systemImage: "folder.fill")
                    }
                }
            }
            Button { nomeColecao = ""; novaColecao = true } label: { Label("Nova coleção…", systemImage: "folder.badge.plus") }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "bookmark")
                Text("Biblioteca").font(.system(size: 12.5, weight: .medium))
                Image(systemName: "chevron.down").font(.system(size: 8, weight: .bold))
            }
            .foregroundStyle(Palette.bodyInk)
        }
        .menuStyle(.borderlessButton).fixedSize()
        .focusable(false)
    }

    private var buscaGlobal: some View {
        HStack(spacing: 7) {
            Image(systemName: "magnifyingglass").font(.system(size: 12)).foregroundStyle(Palette.secondaryInk)
            TextField("Buscar em toda a jurisprudência…", text: searchBinding)
                .textFieldStyle(.plain).font(.system(size: 12.5)).foregroundStyle(Palette.bodyInk)
                .frame(width: 230)
            if !store.searchText.isEmpty {
                Button { store.searchText = "" } label: {
                    Image(systemName: "xmark.circle.fill").font(.system(size: 11)).foregroundStyle(Palette.secondaryInk)
                }.buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 10).padding(.vertical, 6)
        .background(Palette.cardBackground, in: Capsule())
        .overlay(Capsule().strokeBorder(Palette.hairline, lineWidth: 1))
    }

    private var temaControl: some View {
        HStack(spacing: 2) {
            ForEach(Appearance.allCases) { ap in
                Button { appearanceRaw = ap.rawValue } label: {
                    Image(systemName: ap.simbolo).font(.system(size: 11, weight: .medium))
                        .frame(width: 26, height: 22)
                        .foregroundStyle(appearanceRaw == ap.rawValue ? Palette.accent : Palette.secondaryInk)
                        .background(appearanceRaw == ap.rawValue ? Palette.accent.opacity(0.14) : .clear,
                                    in: RoundedRectangle(cornerRadius: 6))
                }
                .buttonStyle(.plain)
            }
        }
    }
}
