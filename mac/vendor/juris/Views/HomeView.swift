import SwiftUI

// MARK: - Card de verbete

struct CartaoJuris: View {
    let entry: JurisEntry
    @Environment(LibraryStore.self) private var store
    @State private var hovering = false

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
                    Text(r).font(.system(size: 9.5, weight: .semibold))
                        .foregroundStyle(RamoStyle.color(r)).lineLimit(1)
                }
            }
            .padding(13)
            .frame(width: 236, height: 150, alignment: .topLeading)
            .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 12))
            .overlay(alignment: .leading) {
                // Lombada na cor do RAMO (vitrine) — a fonte segue no badge.
                RoundedRectangle(cornerRadius: 2).fill(RamoStyle.color(entry.ramoDireito))
                    .frame(width: 3).padding(.vertical, 14)
            }
            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Palette.hairline, lineWidth: 1))
            .shadow(color: hovering ? RamoStyle.color(entry.ramoDireito).opacity(0.25) : .black.opacity(0.05),
                    radius: hovering ? 10 : 5, y: hovering ? 5 : 2)
            .scaleEffect(hovering ? 1.02 : 1)
        }
        .buttonStyle(.plain)
        .onHover { hovering = $0 }
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: hovering)
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
            // Home em QUATRO blocos nomeados, nesta ordem: o que fazer hoje → como estudar →
            // o que acompanhar → como estou. Antes era uma pilha sem hierarquia (destaques,
            // busca, painel inteiro, resumo por IA, hero, prateleiras…) em que o julgado do
            // dia brigava com o painel de métricas pela abertura.
            VStack(alignment: .leading, spacing: 28) {
                barraBusca
                cabecalhoSecao("Hoje", "sun.max.fill")
                JurisDashboardView(partes: [.hero])
                DestaquesEstudoView(parte: .julgado)
                cabecalhoSecao("Estudar", "graduationcap.fill")
                gradeEstudar
                JurisDashboardView(partes: [.atalhos])
                cabecalhoSecao("Acompanhar", "newspaper.fill")
                DestaquesEstudoView(parte: .informativos)
                if !novidadeVerbetes.isEmpty {
                    Prateleira(titulo: "Novidades dos tribunais", simbolo: "sparkles",
                               verTodos: { store.selecao = .novidades }) {
                        ForEach(novidadeVerbetes) { CartaoJuris(entry: $0) }
                    }
                }
                if !store.recentEntries.isEmpty {
                    Prateleira(titulo: "Continue de onde parou", simbolo: "clock.arrow.circlepath") {
                        ForEach(store.recentEntries.prefix(14)) { CartaoJuris(entry: $0) }
                    }
                }
                cabecalhoSecao("Seu progresso", "chart.bar.fill")
                JurisDashboardView(partes: [.checklist, .kpis, .ofensiva, .fontes])
                cabecalhoSecao("Acervo", "books.vertical.fill")
                if let d = destaque { heroCard(d) }
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

    private func cabecalhoSecao(_ t: String, _ simbolo: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: simbolo).font(.system(size: 13, weight: .bold)).foregroundStyle(Palette.accent)
            Text(t.uppercased()).font(.system(size: 12, weight: .heavy)).tracking(1.2).foregroundStyle(Palette.secondaryInk)
            Rectangle().fill(Palette.hairline).frame(height: 1)
        }
        .padding(.horizontal, 28).padding(.top, 6)
    }

    /// As ações de estudo que a pessoa mais usa, em azulejos grandes — antes estavam
    /// escondidas na barra lateral ou no fim do painel.
    private var gradeEstudar: some View {
        let itens: [(String, String, String, Selecao)] = [
            ("Prova oral", "Pergunta de banca sobre um verbete sorteado", "mic.fill", .provaOral),
            ("Simulado", "Objetivas C/E + discursivas oficiais", "list.bullet.clipboard.fill", .simulado),
            ("Grade de informativos", "Edições do STF, STJ e TSE por semana", "calendar", .gradeInformativos),
            ("Julgado do dia", "Roteiro de estudo e quiz do destaque", "sparkles", .julgadoDoDia),
        ]
        return LazyVGrid(columns: [GridItem(.adaptive(minimum: 210), spacing: 12)], spacing: 12) {
            ForEach(itens, id: \.0) { it in
                Button { store.selecao = it.3 } label: {
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: it.2).font(.system(size: 20, weight: .bold)).foregroundStyle(Palette.accent)
                            .frame(width: 36, height: 36)
                            .background(RoundedRectangle(cornerRadius: 9, style: .continuous).fill(Palette.accent.opacity(0.12)))
                        VStack(alignment: .leading, spacing: 3) {
                            Text(it.0).font(.system(size: 15, weight: .heavy)).foregroundStyle(Palette.titleInk)
                            Text(it.1).font(.system(size: 12)).foregroundStyle(Palette.secondaryInk).lineLimit(2)
                        }
                        Spacer(minLength: 0)
                    }
                    .padding(14).frame(maxWidth: .infinity, alignment: .leading)
                    .background(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).fill(Palette.cardBackground))
                    .overlay(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).strokeBorder(Palette.hairline))
                }.buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 28)
    }

    private func heroCard(_ d: JurisEntry) -> some View {
        Group {
            if true {
                Button { store.lerCheio(d.id) } label: {
                    HStack(alignment: .top, spacing: 22) {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack(spacing: 8) {
                                FonteBadge(fonte: d.fonteKind)
                                if d.situacaoKind != .vigente { SituacaoPill(texto: d.situacao ?? d.situacaoKind.rawValue) }
                            }
                            Text(d.titulo).font(Typo.serifTitle(30, .bold)).foregroundStyle(Palette.titleInk)
                                .lineLimit(2)
                            Text(d.enunciado).font(Typo.serifBody(14)).foregroundStyle(Palette.bodyInk)
                                .lineLimit(4).lineSpacing(3).fixedSize(horizontal: false, vertical: true)
                            HStack(spacing: 6) {
                                Image(systemName: "book.fill").font(.system(size: 11))
                                Text("Ler inteiro teor").font(.system(size: 12.5, weight: .bold))
                            }
                            .foregroundStyle(.white)
                            .padding(.horizontal, 16).padding(.vertical, 9)
                            .background(RamoStyle.gradient(d.ramoDireito), in: Capsule())
                            .shadow(color: RamoStyle.color(d.ramoDireito).opacity(0.45), radius: 9, y: 4)
                            .padding(.top, 2)
                        }
                        Spacer(minLength: 0)
                    }
                    .padding(26)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        LinearGradient(colors: [RamoStyle.color(d.ramoDireito).opacity(0.18), Palette.cardBackground],
                                       startPoint: .topLeading, endPoint: .bottomTrailing),
                        in: RoundedRectangle(cornerRadius: 18))
                    .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(RamoStyle.color(d.ramoDireito).opacity(0.25), lineWidth: 1))
                    .shadow(color: RamoStyle.color(d.ramoDireito).opacity(0.16), radius: 16, y: 8)
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
                        RamoTile(nome: ramo.nome, count: ramo.count) {
                            store.selecao = .ramoDetalhe(EscopoFiltrado(ramo: ramo.nome)); store.selectedID = nil
                        }
                    }
                }
                .padding(.horizontal, 26)
            }
        }
    }
}

/// Tile de ramo com vida: gradiente da disciplina + hover que levanta (vitrine V4).
private struct RamoTile: View {
    let nome: String
    let count: Int
    let action: () -> Void
    @State private var hovering = false

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 6) {
                Image(systemName: "books.vertical.fill").font(.system(size: 16))
                    .foregroundStyle(.white)
                Spacer(minLength: 0)
                Text(nome).font(.system(size: 12.5, weight: .bold))
                    .foregroundStyle(.white).lineLimit(2)
                Text("\(count) verbetes").font(.system(size: 10, weight: .medium))
                    .foregroundStyle(.white.opacity(0.85))
            }
            .padding(13).frame(width: 168, height: 104, alignment: .topLeading)
            .background(RamoStyle.gradient(nome), in: RoundedRectangle(cornerRadius: 14))
            .shadow(color: RamoStyle.color(nome).opacity(hovering ? 0.5 : 0.35),
                    radius: hovering ? 12 : 8, y: hovering ? 6 : 4)
            .scaleEffect(hovering ? 1.03 : 1)
        }
        .buttonStyle(.plain)
        .onHover { hovering = $0 }
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: hovering)
    }
}
