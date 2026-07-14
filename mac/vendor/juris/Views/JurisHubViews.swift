import SwiftUI

// MARK: - Cartão-botão padrão das páginas-hub (mesma família dos botões das Centrais)

struct HubCard: View {
    let icon: String
    let titulo: String
    let subtitulo: String
    var sigla: String? = nil      // usa um "selo" de texto no lugar do ícone
    var acao: () -> Void

    var body: some View {
        Button(action: acao) {
            HStack(spacing: 10) {
                if let s = sigla {
                    Text(s)
                        .font(.system(size: 11, weight: .bold))
                        .minimumScaleFactor(0.6).lineLimit(1)
                        .foregroundStyle(.white)
                        .frame(width: 42, height: 34)
                        .background(Palette.accent, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                } else {
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Palette.accent)
                        .frame(width: 34, height: 34)
                        .background(Palette.accent.opacity(0.12), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                }
                VStack(alignment: .leading, spacing: 1) {
                    Text(titulo).font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(Palette.titleInk)
                        .lineLimit(2).multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(subtitulo)
                        .font(.system(size: 10)).foregroundStyle(Palette.secondaryInk)
                        .lineLimit(1).minimumScaleFactor(0.8)
                }
                Spacer(minLength: 4)
                Image(systemName: "chevron.right").font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Palette.secondaryInk)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: max(6, ThemeState.t.radius)))
            .overlay(RoundedRectangle(cornerRadius: max(6, ThemeState.t.radius)).strokeBorder(Palette.hairline, lineWidth: 1))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

/// Barra fina de "voltar" usada pelas páginas-hub.
struct HubBackBar: View {
    let rotulo: String
    let acao: () -> Void

    var body: some View {
        HStack {
            Button(action: acao) {
                Label(rotulo, systemImage: "chevron.left").font(.system(size: 12, weight: .medium))
            }
            .buttonStyle(.borderless)
            Spacer()
        }
        .padding(.horizontal, 12).padding(.vertical, 6)
        .background(Palette.sidebarBackground)
        .overlay(alignment: .bottom) { Rectangle().fill(Palette.hairline).frame(height: 1) }
    }
}

// MARK: - Ramos do Direito (página própria, no lugar da lista embutida no menu)

struct RamosHubView: View {
    @Environment(LibraryStore.self) private var store

    private func ir(_ s: Selecao) {
        store.searchText = ""
        store.leituraID = nil
        store.selecao = s
        store.selectedID = nil
    }

    private let grid = [GridItem(.adaptive(minimum: 240, maximum: 320), spacing: 12)]

    var body: some View {
        SectionShell(icon: "books.vertical.fill",
                     title: "Ramos do Direito",
                     subtitle: "Escolha a disciplina — dentro dela, os assuntos e os tipos de jurisprudência",
                     count: store.disciplinasOrdenadas.count) {
            ScrollView {
                LazyVGrid(columns: grid, alignment: .leading, spacing: 12) {
                    ForEach(store.disciplinasOrdenadas, id: \.nome) { d in
                        HubCard(icon: "bookmark", titulo: d.nome,
                                subtitulo: "\(d.count) verbete\(d.count == 1 ? "" : "s")") {
                            ir(.ramoDetalhe(EscopoFiltrado(ramo: d.nome)))
                        }
                    }
                }
                .padding(.horizontal, 26).padding(.vertical, 20)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

// MARK: - Página de UMA disciplina (assuntos + tipos), escopada ou não a uma central

struct RamoDetalheView: View {
    let filtro: EscopoFiltrado   // ramo obrigatório; central/tribunal opcionais
    @Environment(LibraryStore.self) private var store

    private var base: [JurisEntry] { store.entriesFiltradas(filtro) }

    private var escopoNome: String? {
        if let t = filtro.tribunal { return store.tribunal(t)?.nome ?? "Central do tribunal" }
        if let c = filtro.central { return c.nome }
        return nil
    }

    private var voltar: (rotulo: String, destino: Selecao) {
        if let t = filtro.tribunal { return (store.tribunal(t)?.nome ?? "Tribunais Específicos", .tribunal(t)) }
        if let c = filtro.central { return (c.nome, .central(c)) }
        return ("Ramos do Direito", .ramosHub)
    }

    private func ir(_ s: Selecao) {
        store.searchText = ""
        store.leituraID = nil
        store.selecao = s
        store.selectedID = nil
    }

    private let grid = [GridItem(.adaptive(minimum: 240, maximum: 320), spacing: 12)]
    private let limiteAssuntos = 60

    var body: some View {
        let base = self.base
        let tipos = store.fontesEm(base)
        let assuntos = store.assuntosEm(base)
        let v = voltar
        VStack(spacing: 0) {
            HubBackBar(rotulo: v.rotulo) { ir(v.destino) }
            SectionShell(icon: "bookmark.fill",
                         title: filtro.ramo ?? "Disciplina",
                         subtitle: escopoNome.map { "Dentro de \($0)" } ?? "Em todo o acervo",
                         count: base.count) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        HubCard(icon: "square.stack.3d.up", titulo: "Todos os verbetes da disciplina",
                                subtitulo: "\(base.count) verbete\(base.count == 1 ? "" : "s")") {
                            ir(.filtro(filtro))
                        }

                        if !tipos.isEmpty {
                            secao("Tipos de jurisprudência", "tray.2")
                            LazyVGrid(columns: grid, alignment: .leading, spacing: 12) {
                                ForEach(tipos, id: \.fonte) { t in
                                    HubCard(icon: t.fonte.simbolo, titulo: t.fonte.nome,
                                            subtitulo: "\(t.count) verbete\(t.count == 1 ? "" : "s")") {
                                        var f = filtro; f.fonte = t.fonte
                                        ir(.filtro(f))
                                    }
                                }
                            }
                        }

                        if !assuntos.isEmpty {
                            secao("Assuntos", "number")
                            LazyVGrid(columns: grid, alignment: .leading, spacing: 12) {
                                ForEach(assuntos.prefix(limiteAssuntos), id: \.nome) { a in
                                    HubCard(icon: "number", titulo: a.nome,
                                            subtitulo: "\(a.count) verbete\(a.count == 1 ? "" : "s")") {
                                        var f = filtro; f.tema = a.nome
                                        ir(.filtro(f))
                                    }
                                }
                            }
                            if assuntos.count > limiteAssuntos {
                                Text("Mostrando os \(limiteAssuntos) assuntos mais frequentes de \(assuntos.count) — use a busca em \"Todos os verbetes\" para o restante.")
                                    .font(.system(size: 10.5)).foregroundStyle(Palette.secondaryInk)
                            }
                        }
                        Color.clear.frame(height: 20)
                    }
                    .padding(.horizontal, 26).padding(.top, 20)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }

    private func secao(_ t: String, _ icone: String) -> some View {
        HStack(spacing: 7) {
            Image(systemName: icone).font(.system(size: 12)).foregroundStyle(Palette.accent)
            Text(t).font(Typo.serifTitle(17, .bold)).foregroundStyle(Palette.titleInk)
        }
    }
}

// MARK: - Central de UM tribunal específico (TJRO, TJGO… ou cadastrada)

struct TribunalCentralView: View {
    let tribunalID: String
    @Environment(LibraryStore.self) private var store
    @State private var confirmarExclusao = false

    private var trib: TribunalEspecifico? { store.tribunal(tribunalID) }

    private func ir(_ s: Selecao) {
        store.searchText = ""
        store.leituraID = nil
        store.selecao = s
        store.selectedID = nil
    }

    private let grid = [GridItem(.adaptive(minimum: 240, maximum: 320), spacing: 12)]

    var body: some View {
        if let t = trib {
            conteudo(t)
        } else {
            VStack(spacing: 0) {
                HubBackBar(rotulo: "Tribunais Específicos") { ir(.central(.especificos)) }
                LegisEmpty(icon: "building.2", title: "Central não encontrada",
                           message: "Esta central de tribunal foi excluída.")
            }
            .background(Palette.appBackground)
        }
    }

    private func conteudo(_ t: TribunalEspecifico) -> some View {
        let verbetes = store.entriesDoTribunal(t.id)
        let discs = store.disciplinasEm(verbetes)
        return VStack(spacing: 0) {
            HubBackBar(rotulo: "Tribunais Específicos") { ir(.central(.especificos)) }
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Hero do tribunal — mesma assinatura das Centrais
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 10) {
                            Text(t.sigla)
                                .font(.system(size: 13, weight: .bold))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 10).padding(.vertical, 5)
                                .background(Color.white.opacity(0.16), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                            Text(t.nome).font(.system(size: 26, weight: .bold)).foregroundStyle(.white)
                            Spacer()
                            Text("\(verbetes.count) verbetes")
                                .font(.system(size: 11.5, weight: .semibold)).monospacedDigit()
                                .padding(.horizontal, 10).padding(.vertical, 4)
                                .background(Color.white.opacity(0.16), in: Capsule())
                                .foregroundStyle(.white)
                        }
                        Text(t.detalhe)
                            .font(.system(size: 12.5)).foregroundStyle(.white.opacity(0.85))
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(22)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        LinearGradient(colors: ThemeState.t.heroStops,
                                       startPoint: .topLeading, endPoint: .bottomTrailing),
                        in: RoundedRectangle(cornerRadius: max(6, ThemeState.t.radius)))

                    // O que este tribunal tem
                    LazyVGrid(columns: grid, alignment: .leading, spacing: 12) {
                        if t.fontes.isEmpty {
                            HubCard(icon: "magnifyingglass", titulo: "Tudo que cita \(t.sigla)",
                                    subtitulo: verbetes.isEmpty ? "nada no acervo ainda"
                                             : "\(verbetes.count) verbete\(verbetes.count == 1 ? "" : "s") no acervo") {
                                ir(.filtro(EscopoFiltrado(tribunal: t.id)))
                            }
                        } else {
                            ForEach(t.fontes) { f in
                                let n = store.fonteCounts[f] ?? 0
                                HubCard(icon: f.simbolo, titulo: f.nome,
                                        subtitulo: "\(n) verbete\(n == 1 ? "" : "s")") {
                                    ir(.filtro(EscopoFiltrado(tribunal: t.id, fonte: f)))
                                }
                            }
                        }
                        if t.aoVivo {
                            HubCard(icon: "antenna.radiowaves.left.and.right",
                                    titulo: "Central do \(t.sigla) — ao vivo",
                                    subtitulo: "busca direta no site do tribunal") {
                                ir(.tjroHub)
                            }
                        }
                    }

                    // Por disciplina (dentro dela: assuntos + tipos)
                    if !discs.isEmpty {
                        HStack(spacing: 7) {
                            Image(systemName: "books.vertical").font(.system(size: 12)).foregroundStyle(Palette.accent)
                            Text("Por disciplina").font(Typo.serifTitle(17, .bold)).foregroundStyle(Palette.titleInk)
                        }
                        LazyVGrid(columns: grid, alignment: .leading, spacing: 12) {
                            ForEach(discs, id: \.nome) { d in
                                HubCard(icon: "bookmark", titulo: d.nome,
                                        subtitulo: "\(d.count) verbete\(d.count == 1 ? "" : "s") · assuntos e tipos") {
                                    ir(.ramoDetalhe(EscopoFiltrado(tribunal: t.id, ramo: d.nome)))
                                }
                            }
                        }
                    }

                    if !verbetes.isEmpty {
                        VStack(alignment: .leading, spacing: 11) {
                            HStack(spacing: 7) {
                                Image(systemName: "clock").font(.system(size: 12)).foregroundStyle(Palette.accent)
                                Text("Deste tribunal").font(Typo.serifTitle(17, .bold)).foregroundStyle(Palette.titleInk)
                            }
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(verbetes.prefix(14)) { CartaoJuris(entry: $0) }
                                }
                            }
                        }
                    }

                    if t.custom {
                        Button(role: .destructive) { confirmarExclusao = true } label: {
                            Label("Excluir esta central", systemImage: "trash")
                                .font(.system(size: 11.5, weight: .medium))
                        }
                        .buttonStyle(.borderless)
                    }
                    Color.clear.frame(height: 20)
                }
                .padding(.horizontal, 26).padding(.top, 22)
            }
        }
        .background(Palette.appBackground)
        .alert("Excluir a central \(t.sigla)?", isPresented: $confirmarExclusao) {
            Button("Excluir", role: .destructive) {
                store.excluirTribunal(t.id)
                ir(.central(.especificos))
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("Só a central sai — seus favoritos e anotações continuam intactos.")
        }
    }
}
