import SwiftUI

// MARK: - Home

/// Início em QUATRO blocos fixos, na ordem da rotina de quem treina magistratura:
///   HOJE       — saudação/meta + o que revisar agora (SRS vencidos, checklist) + julgado do dia
///   TREINAR    — simulado, prova oral (treino), prova oral das bancas, plano, mapas, baralhos
///   ACOMPANHAR — últimos informativos, novidades dos tribunais, continue de onde parou, progresso
///   ACERVO     — favoritos + explorar por disciplina (as prateleiras de fonte fixa
///                TJRO/STF saíram: cada uma já tem Central própria na sidebar)
struct HomeView: View {
    @Environment(LibraryStore.self) private var store
    @State private var busca = ""

    private func amostra(_ f: (JurisEntry) -> Bool, _ n: Int = 14) -> [JurisEntry] {
        Array(store.entries.lazy.filter(f).prefix(n))
    }

    /// Vai para a busca global em "Todos os verbetes" com o termo digitado.
    /// Submete (Enter/lupa) em vez de redirecionar por tecla — a Home desmonta ao
    /// trocar a seleção, então um redirect por caractere perderia o foco.
    private func submeterBusca() {
        let q = busca.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return }
        store.ir(.todos)
        store.searchText = q
        busca = ""
    }

    private var novidadeVerbetes: [JurisEntry] {
        Array(store.novidades.prefix(8).flatMap { store.verbetes(de: $0) }.prefix(14))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 26) {
                JurisCampoBusca(prompt: "Buscar em toda a jurisprudência…", texto: $busca, aoSubmeter: submeterBusca)
                    .padding(.horizontal, 26)

                bloco("Hoje", "sun.max.fill")
                JurisDashboardView(partes: [.hero])
                JurisHojeResumo()
                    .padding(.horizontal, 26)
                DestaquesEstudoView(parte: .julgado)

                bloco("Treinar", "graduationcap.fill")
                gradeTreinar
                JurisDashboardView(partes: [.atalhos])

                bloco("Acompanhar", "newspaper.fill")
                DestaquesEstudoView(parte: .informativos)
                if !novidadeVerbetes.isEmpty {
                    Prateleira(titulo: "Novidades dos tribunais", simbolo: "sparkles",
                               verTodos: { store.ir(.novidades) }) {
                        ForEach(novidadeVerbetes) { CartaoJuris(entry: $0) }
                    }
                }
                if !store.recentEntries.isEmpty {
                    Prateleira(titulo: "Continue de onde parou", simbolo: "clock.arrow.circlepath") {
                        ForEach(store.recentEntries.prefix(14)) { CartaoJuris(entry: $0) }
                    }
                }
                JurisDashboardView(partes: [.kpis, .ofensiva, .fontes])

                bloco("Acervo", "books.vertical.fill")
                if store.favorites.count > 0 {
                    Prateleira(titulo: "Seus favoritos", simbolo: "star.fill",
                               verTodos: { store.ir(.favoritos) }) {
                        ForEach(amostra { store.isFavorite($0.id) }) { CartaoJuris(entry: $0) }
                    }
                }
                ramosShelf
                Color.clear.frame(height: 20)
            }
            .padding(.top, 22)
        }
        .background(Palette.appBackground)
    }

    /// Divisor de bloco: caixa-alta + filete — a "voz de seção grande" da Home.
    private func bloco(_ t: String, _ simbolo: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: simbolo).font(.system(size: 13, weight: .bold)).foregroundStyle(Palette.accent)
            Text(t.uppercased()).font(.system(size: 12, weight: .heavy)).tracking(1.2).foregroundStyle(Palette.secondaryInk)
            Rectangle().fill(Palette.hairline).frame(height: 1)
        }
        .padding(.horizontal, 28).padding(.top, 6)
    }

    /// As ações de treino em azulejos grandes — todas alcançáveis também pela sidebar.
    private var gradeTreinar: some View {
        let itens: [(String, String, String, Selecao)] = [
            ("Simulado", "Objetivas C/E + discursivas oficiais", "list.bullet.clipboard.fill", .simulado),
            ("Prova oral", "Arguição sobre um verbete sorteado, correção local", "mic.fill", .provaOral),
            ("Prova oral · bancas", "Pontos, perguntas e padrão de resposta publicados", "person.wave.2.fill", .oralBancas),
            ("Plano de leitura", "Súmulas STF, STJ e TSE no seu roteiro", "calendar", .plano),
            ("Grade de informativos", "Edições do STF, STJ e TSE por semana", "square.grid.3x3.fill", .gradeInformativos),
            ("Mapas mentais", "Galeria dos mapas que você já abriu", "brain.head.profile", .mapas),
        ]
        return LazyVGrid(columns: [GridItem(.adaptive(minimum: 210), spacing: 12)], spacing: 12) {
            ForEach(itens, id: \.0) { it in
                HubCard(icon: it.2, titulo: it.0, subtitulo: it.1) { store.ir(it.3) }
            }
        }
        .padding(.horizontal, 28)
    }

    private var ramosShelf: some View {
        VStack(alignment: .leading, spacing: 10) {
            JurisSecaoTitulo(titulo: "Explore por disciplina", simbolo: "books.vertical.fill",
                             verTodos: { store.ir(.ramosHub) })
                .padding(.horizontal, 26)
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 10) {
                    ForEach(store.disciplinasOrdenadas, id: \.nome) { ramo in
                        RamoTile(nome: ramo.nome, count: ramo.count) {
                            store.ir(.ramoDetalhe(EscopoFiltrado(ramo: ramo.nome)))
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
            .background(RamoStyle.gradient(nome), in: RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous))
            .shadow(color: RamoStyle.color(nome).opacity(hovering ? 0.5 : 0.35),
                    radius: hovering ? 12 : 8, y: hovering ? 6 : 4)
            .scaleEffect(hovering ? 1.03 : 1)
        }
        .buttonStyle(.plain)
        .onHover { hovering = $0 }
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: hovering)
    }
}

// MARK: - "Revisar hoje"

/// Faixa compacta da fila do dia (SRS vencidos + checklist pendente) com atalho para a
/// página `Selecao.hoje`. Vive na Home e a página completa fica na sidebar.
struct JurisHojeResumo: View {
    @Environment(LibraryStore.self) private var store
    var body: some View {
        let srs = store.srsDueCount
        let metas = store.checklistPendingCount
        Button { store.ir(.hoje) } label: {
            HStack(spacing: 14) {
                Image(systemName: "sun.horizon.fill").font(.system(size: 18, weight: .bold)).foregroundStyle(Palette.accent)
                    .frame(width: 38, height: 38)
                    .background(Palette.accent.opacity(0.12), in: RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Revisar hoje").font(.system(size: 15, weight: .heavy)).foregroundStyle(Palette.titleInk)
                    Text(srs == 0 && metas == 0
                         ? "Nada vencido — abra para ver o julgado do dia e o checklist."
                         : "\(srs) cartão\(srs == 1 ? "" : "ões") de revisão vencido\(srs == 1 ? "" : "s") · \(metas) meta\(metas == 1 ? "" : "s") pendente\(metas == 1 ? "" : "s")")
                        .font(.system(size: 12)).foregroundStyle(Palette.secondaryInk).lineLimit(2)
                }
                Spacer(minLength: 0)
                if srs + metas > 0 {
                    Text("\(srs + metas)").font(Typo.num(12)).foregroundStyle(.white)
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(Palette.accent, in: Capsule())
                }
                Image(systemName: "chevron.right").font(.system(size: 11, weight: .semibold)).foregroundStyle(Palette.secondaryInk)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).strokeBorder(Palette.hairline))
        }
        .buttonStyle(.plain)
    }
}

/// Página "Revisar hoje": a fila única do dia — revisão espaçada vencida, checklist de
/// leitura e o julgado do dia — no lugar de um sheet (SRS) + um card (checklist)
/// espalhados pela Home.
struct JurisHojeView: View {
    @Environment(LibraryStore.self) private var store
    @State private var mostrarSRS = false

    var body: some View {
        SectionShell(icon: Selecao.hoje.simbolo, title: Selecao.hoje.titulo,
                     subtitle: Date().formatted(.dateTime.weekday(.wide).day().month(.wide).locale(Locale(identifier: "pt_BR"))),
                     count: store.srsDueCount + store.checklistPendingCount) {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    JurisSecaoTitulo(titulo: "Revisão espaçada", simbolo: "brain.head.profile", count: store.srsDueCount)
                    srsCard
                    JurisSecaoTitulo(titulo: "Checklist de leitura", simbolo: "checklist", count: store.checklistPendingCount,
                                     verTodos: { store.ir(.checklist) })
                    JurisChecklistMiniCard(openChecklist: { store.ir(.checklist) })
                    JurisSecaoTitulo(titulo: "Julgado do dia", simbolo: "sun.max.fill")
                    if let e = store.verbeteDoDia {
                        CartaoJuris(entry: e, estilo: .hero)
                    }
                    Color.clear.frame(height: 20)
                }
                .padding(.horizontal, 26).padding(.top, 20)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .sheet(isPresented: $mostrarSRS) { RevisaoEspacadaView() }
    }

    private var srsCard: some View {
        let due = store.srsDueCount
        let deck = store.srsDeckCount
        return HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 3) {
                Text(due == 0 ? "Nenhum cartão vencido" : "\(due) cartão\(due == 1 ? "" : "ões") para revisar")
                    .font(.system(size: 15, weight: .bold)).foregroundStyle(Palette.titleInk)
                Text(deck == 0 ? "Gere flashcards pelo roteiro de um verbete ou pelo quiz do julgado do dia."
                               : "\(deck) no baralho · SM-2, estilo Anki")
                    .font(.system(size: 12)).foregroundStyle(Palette.secondaryInk)
            }
            Spacer(minLength: 0)
            Button { mostrarSRS = true } label: {
                Label(due == 0 ? "Abrir baralho" : "Revisar agora", systemImage: "play.fill")
                    .font(.system(size: 12.5, weight: .semibold))
            }
            .buttonStyle(.borderedProminent).tint(Palette.accent).disabled(deck == 0)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).strokeBorder(Palette.hairline))
    }
}
