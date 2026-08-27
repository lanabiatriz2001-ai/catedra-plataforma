import SwiftUI

// MARK: - Ramos do Direito (página própria, no lugar da lista embutida no menu)

struct RamosHubView: View {
    @Environment(LibraryStore.self) private var store


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
                            store.ir(.ramoDetalhe(EscopoFiltrado(ramo: d.nome)))
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


    private let grid = [GridItem(.adaptive(minimum: 240, maximum: 320), spacing: 12)]
    private let limiteAssuntos = 60

    var body: some View {
        let base = self.base
        let tipos = store.fontesEm(base)
        let assuntos = store.assuntosEm(base)
        let v = voltar
        VStack(spacing: 0) {
            HubBackBar(rotulo: v.rotulo) { store.ir(v.destino) }
            SectionShell(icon: "bookmark.fill",
                         title: filtro.ramo ?? "Disciplina",
                         subtitle: escopoNome.map { "Dentro de \($0)" } ?? "Em todo o acervo",
                         count: base.count,
                         tintStops: filtro.ramo.map { RamoStyle.stops($0) }) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        HubCard(icon: "square.stack.3d.up", titulo: "Todos os verbetes da disciplina",
                                subtitulo: "\(base.count) verbete\(base.count == 1 ? "" : "s")") {
                            store.ir(.filtro(filtro))
                        }

                        if !tipos.isEmpty {
                            JurisSecaoTitulo(titulo: "Tipos de jurisprudência", simbolo: "tray.2")
                            LazyVGrid(columns: grid, alignment: .leading, spacing: 12) {
                                ForEach(tipos, id: \.fonte) { t in
                                    HubCard(icon: t.fonte.simbolo, titulo: t.fonte.nome,
                                            subtitulo: "\(t.count) verbete\(t.count == 1 ? "" : "s")") {
                                        var f = filtro; f.fonte = t.fonte
                                        store.ir(.filtro(f))
                                    }
                                }
                            }
                        }

                        if !assuntos.isEmpty {
                            JurisSecaoTitulo(titulo: "Assuntos", simbolo: "number")
                            LazyVGrid(columns: grid, alignment: .leading, spacing: 12) {
                                ForEach(assuntos.prefix(limiteAssuntos), id: \.nome) { a in
                                    HubCard(icon: "number", titulo: a.nome,
                                            subtitulo: "\(a.count) verbete\(a.count == 1 ? "" : "s")") {
                                        var f = filtro; f.tema = a.nome
                                        store.ir(.filtro(f))
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

}

// MARK: - Central de UM tribunal específico (TJRO, TJGO… ou cadastrada)

struct TribunalCentralView: View {
    let tribunalID: String
    @Environment(LibraryStore.self) private var store
    @State private var confirmarExclusao = false

    private var trib: TribunalEspecifico? { store.tribunal(tribunalID) }


    private let grid = [GridItem(.adaptive(minimum: 240, maximum: 320), spacing: 12)]

    var body: some View {
        if let t = trib {
            conteudo(t)
        } else {
            VStack(spacing: 0) {
                HubBackBar(rotulo: "Tribunais Específicos") { store.ir(.central(.especificos)) }
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
            HubBackBar(rotulo: "Tribunais Específicos") { store.ir(.central(.especificos)) }
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Hero do tribunal — mesma assinatura das Centrais
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 10) {
                            Text(t.sigla)
                                .font(.system(size: 13, weight: .bold))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 10).padding(.vertical, 5)
                                .background(Color.white.opacity(0.16), in: RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous))
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
                        in: RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous))

                    // O que este tribunal tem
                    LazyVGrid(columns: grid, alignment: .leading, spacing: 12) {
                        if t.fontes.isEmpty {
                            HubCard(icon: "magnifyingglass", titulo: "Tudo que cita \(t.sigla)",
                                    subtitulo: verbetes.isEmpty ? "nada no acervo ainda"
                                             : "\(verbetes.count) verbete\(verbetes.count == 1 ? "" : "s") no acervo") {
                                store.ir(.filtro(EscopoFiltrado(tribunal: t.id)))
                            }
                        } else {
                            ForEach(t.fontes) { f in
                                let n = store.fonteCounts[f] ?? 0
                                HubCard(icon: f.simbolo, titulo: f.nome,
                                        subtitulo: "\(n) verbete\(n == 1 ? "" : "s")") {
                                    store.ir(.filtro(EscopoFiltrado(tribunal: t.id, fonte: f)))
                                }
                            }
                        }
                        if t.aoVivo {
                            HubCard(icon: "antenna.radiowaves.left.and.right",
                                    titulo: "Central do \(t.sigla) — ao vivo",
                                    subtitulo: "busca direta no site do tribunal") {
                                store.ir(.tjroHub)
                            }
                        }
                    }

                    // Por disciplina (dentro dela: assuntos + tipos)
                    if !discs.isEmpty {
                        JurisSecaoTitulo(titulo: "Por disciplina", simbolo: "books.vertical", count: discs.count)
                        LazyVGrid(columns: grid, alignment: .leading, spacing: 12) {
                            ForEach(discs, id: \.nome) { d in
                                HubCard(icon: "bookmark", titulo: d.nome,
                                        subtitulo: "\(d.count) verbete\(d.count == 1 ? "" : "s") · assuntos e tipos") {
                                    store.ir(.ramoDetalhe(EscopoFiltrado(tribunal: t.id, ramo: d.nome)))
                                }
                            }
                        }
                    }

                    if !verbetes.isEmpty {
                        VStack(alignment: .leading, spacing: 11) {
                            JurisSecaoTitulo(titulo: "Deste tribunal", simbolo: "clock", count: verbetes.count,
                                             verTodos: { store.ir(.filtro(EscopoFiltrado(tribunal: t.id))) })
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
                store.ir(.central(.especificos))
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("Só a central sai — seus favoritos e anotações continuam intactos.")
        }
    }
}
