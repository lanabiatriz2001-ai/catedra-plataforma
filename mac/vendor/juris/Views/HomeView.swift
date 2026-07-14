import SwiftUI

// MARK: - Card de verbete

struct CartaoJuris: View {
    let entry: JurisEntry
    @Environment(LibraryStore.self) private var store

    var body: some View {
        Button { store.lerCheio(entry.id) } label: {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 6) {
                    FonteBadge(fonte: entry.fonteKind, compact: true)
                    Spacer()
                    if store.isImportante(entry) {
                        Image(systemName: "bolt.fill").font(.system(size: 9)).foregroundStyle(Palette.accent)
                    }
                    if store.isFavorite(entry.id) {
                        Image(systemName: "star.fill").font(.system(size: 9)).foregroundStyle(.yellow)
                    }
                }
                Text(entry.titulo)
                    .font(Typo.serifTitle(15, .bold)).foregroundStyle(Palette.titleInk)
                    .lineLimit(1)
                Text(entry.enunciado)
                    .font(Typo.serifBody(11.5)).foregroundStyle(Palette.bodyInk.opacity(0.85))
                    .lineLimit(3).lineSpacing(1.5)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
                if let r = entry.ramoDireito {
                    Text(r).font(.system(size: 9.5, weight: .medium))
                        .foregroundStyle(Palette.accent).lineLimit(1)
                }
            }
            .padding(13)
            .frame(width: 236, height: 150, alignment: .topLeading)
            .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 12))
            .overlay(alignment: .leading) {
                RoundedRectangle(cornerRadius: 2).fill(entry.fonteKind.cor)
                    .frame(width: 3).padding(.vertical, 14)
            }
            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Palette.hairline, lineWidth: 1))
            .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Prateleira (shelf)

struct Prateleira<Conteudo: View>: View {
    let titulo: String
    var simbolo: String? = nil
    var verTodos: (() -> Void)? = nil
    @ViewBuilder var conteudo: () -> Conteudo

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 7) {
                if let s = simbolo { Image(systemName: s).font(.system(size: 12)).foregroundStyle(Palette.accent) }
                Text(titulo).font(Typo.serifTitle(17, .bold)).foregroundStyle(Palette.titleInk)
                Spacer()
                if let v = verTodos {
                    Button(action: v) {
                        HStack(spacing: 3) { Text("Ver todos"); Image(systemName: "chevron.right").font(.system(size: 9, weight: .bold)) }
                            .font(.system(size: 11, weight: .semibold)).foregroundStyle(Palette.accent)
                    }.buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 26)
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 12) { conteudo() }
                    .padding(.horizontal, 26).padding(.vertical, 2)
            }
        }
    }
}

// MARK: - Home

struct HomeView: View {
    @Environment(LibraryStore.self) private var store
    @State private var busca = ""
    @FocusState private var buscaFocada: Bool

    private func amostra(_ f: (JurisEntry) -> Bool, _ n: Int = 14) -> [JurisEntry] {
        Array(store.entries.lazy.filter(f).prefix(n))
    }

    /// Vai para a busca global em "Todos os verbetes" com o termo digitado.
    /// Submete (Enter/lupa) em vez de redirecionar por tecla — a Home desmonta ao
    /// trocar a seleção, então um redirect por caractere perderia o foco.
    private func submeterBusca() {
        let q = busca.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return }
        store.searchText = q
        store.selectedID = nil
        store.selecao = .todos
        busca = ""
    }

    private var barraBusca: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass").font(.system(size: 13, weight: .medium))
                .foregroundStyle(buscaFocada ? Palette.accent : Palette.secondaryInk)
            TextField("Buscar em toda a jurisprudência…", text: $busca)
                .textFieldStyle(.plain).font(.system(size: 13.5))
                .foregroundStyle(Palette.bodyInk)
                .focused($buscaFocada)
                .onSubmit(submeterBusca)
            if !busca.isEmpty {
                Button { submeterBusca() } label: {
                    Text("Buscar").font(.system(size: 11.5, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10).padding(.vertical, 4)
                        .background(Palette.accent, in: Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 13).padding(.vertical, 9)
        .background(Palette.cardBackground, in: Capsule())
        .overlay(Capsule().strokeBorder(buscaFocada ? Palette.accent.opacity(0.6) : Palette.hairline, lineWidth: 1))
        .padding(.horizontal, 26)
    }

    private var destaque: JurisEntry? {
        store.recentEntries.first
            ?? store.entries.first { store.isImportante($0) && $0.fonteKind == .repercussaoGeral }
            ?? store.entries.first { $0.fonteKind == .sumulaSTF }
    }

    private var novidadeVerbetes: [JurisEntry] {
        Array(store.novidades.prefix(8).flatMap { store.verbetes(de: $0) }.prefix(14))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                barraBusca
                JurisDashboardView()
                if let d = destaque { heroCard(d) }
                if !store.recentEntries.isEmpty {
                    Prateleira(titulo: "Continue de onde parou", simbolo: "clock.arrow.circlepath") {
                        ForEach(store.recentEntries.prefix(14)) { CartaoJuris(entry: $0) }
                    }
                }
                if !novidadeVerbetes.isEmpty {
                    Prateleira(titulo: "Novidades dos tribunais", simbolo: "sparkles",
                               verTodos: { store.selecao = .novidades }) {
                        ForEach(novidadeVerbetes) { CartaoJuris(entry: $0) }
                    }
                }
                if store.favorites.count > 0 {
                    Prateleira(titulo: "Seus favoritos", simbolo: "star.fill",
                               verTodos: { store.selecao = .favoritos }) {
                        ForEach(amostra { store.isFavorite($0.id) }) { CartaoJuris(entry: $0) }
                    }
                }
                Prateleira(titulo: "Súmulas do TJRO", simbolo: "building.2.fill",
                           verTodos: { store.selecao = .fonte(.tjro) }) {
                    ForEach(amostra { $0.fonteKind == .tjro || $0.fonteKind == .tjroPrec }) { CartaoJuris(entry: $0) }
                }
                Prateleira(titulo: "Súmulas do STF", simbolo: "building.columns.fill",
                           verTodos: { store.selecao = .fonte(.sumulaSTF) }) {
                    ForEach(amostra { $0.fonteKind == .sumulaSTF }) { CartaoJuris(entry: $0) }
                }
                ramosShelf
                Color.clear.frame(height: 20)
            }
            .padding(.top, 22)
        }
        .background(Palette.appBackground)
    }

    private func heroCard(_ d: JurisEntry) -> some View {
        Group {
            if true {
                Button { store.lerCheio(d.id) } label: {
                    HStack(alignment: .top, spacing: 22) {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack(spacing: 8) {
                                FonteBadge(fonte: d.fonteKind)
                                if let s = d.situacao { SituacaoPill(texto: s) }
                            }
                            Text(d.titulo).font(Typo.serifTitle(30, .bold)).foregroundStyle(Palette.titleInk)
                                .lineLimit(2)
                            Text(d.enunciado).font(Typo.serifBody(14)).foregroundStyle(Palette.bodyInk)
                                .lineLimit(4).lineSpacing(3).fixedSize(horizontal: false, vertical: true)
                            HStack(spacing: 6) {
                                Image(systemName: "book.fill").font(.system(size: 11))
                                Text("Ler inteiro teor").font(.system(size: 12.5, weight: .semibold))
                            }
                            .foregroundStyle(Palette.appBackground)
                            .padding(.horizontal, 14).padding(.vertical, 8)
                            .background(Palette.accent, in: Capsule())
                            .padding(.top, 2)
                        }
                        Spacer(minLength: 0)
                    }
                    .padding(26)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        LinearGradient(colors: [d.fonteKind.cor.opacity(0.16), Palette.cardBackground],
                                       startPoint: .topLeading, endPoint: .bottomTrailing),
                        in: RoundedRectangle(cornerRadius: 18))
                    .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(Palette.hairline, lineWidth: 1))
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 26)
            }
        }
    }

    private var ramosShelf: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Explore por disciplina").font(Typo.serifTitle(17, .bold))
                .foregroundStyle(Palette.titleInk).padding(.horizontal, 26)
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 10) {
                    ForEach(store.disciplinasOrdenadas.prefix(16), id: \.nome) { ramo in
                        Button { store.selecao = .ramoDetalhe(EscopoFiltrado(ramo: ramo.nome)); store.selectedID = nil } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                Image(systemName: "books.vertical.fill").font(.system(size: 16))
                                    .foregroundStyle(Palette.accent)
                                Spacer(minLength: 0)
                                Text(ramo.nome).font(.system(size: 12.5, weight: .semibold))
                                    .foregroundStyle(Palette.titleInk).lineLimit(2)
                                Text("\(ramo.count) verbetes").font(.system(size: 10))
                                    .foregroundStyle(Palette.secondaryInk)
                            }
                            .padding(13).frame(width: 168, height: 104, alignment: .topLeading)
                            .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 12))
                            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Palette.hairline, lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 26)
            }
        }
    }
}
