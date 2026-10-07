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

                // Início no padrão do Cátedra (host web, .cth-*): próxima ação, hero com saudação,
                // chips e painel de vidro, números sobrepostos ao pé do hero e o estudo semanal.
                Group {
                    if let ultimo = store.recentEntries.first {
                        FaixaProximaAcao(titulo: "Continuar: \(ultimo.titulo)", motivo: ultimo.tema ?? ultimo.ramoDireito ?? "Volte ao verbete em que parou.",
                                         meta: ultimo.tribunal, botao: "Abrir o verbete", acao: { store.lerCheio(ultimo.id) })
                    } else {
                        FaixaProximaAcao(titulo: "Comece pelo Acervo", motivo: "STF, STJ, TSE, tribunais estaduais e cortes de contas.",
                                         botao: "Abrir o Acervo", acao: { store.ir(.destino(.acervo)) })
                    }
                }
                .padding(.horizontal, 26)
                VStack(spacing: 0) {
                    let meta = max(store.metaDiaria, 1), feito = store.lidosHoje
                    HeroInicio(saudacao: HeroInicio<EmptyView>.saudacao() + ".",
                               subtitulo: HeroInicio<EmptyView>.dataLonga() + " · \(store.entries.count) verbetes no acervo",
                               chips: ThemeState.t.baixaEstimulacao
                                   ? [ChipHero(simbolo: "star.fill", valor: "\(store.favorites.count)", rotulo: "favoritos")]
                                   : [ChipHero(simbolo: "flame.fill", valor: "\(store.streak)", rotulo: store.streak == 1 ? "dia seguido" : "dias seguidos"),
                                      ChipHero(simbolo: "star.fill", valor: "\(store.favorites.count)", rotulo: "favoritos")]) {
                        VStack(alignment: .leading, spacing: 14) {
                            PainelVidroNumero(rotulo: "Meta de hoje", valor: "\(feito)/\(meta)",
                                              detalhe: feito >= meta ? "Meta cumprida — bom trabalho." : "faltam \(meta - feito) verbetes para a meta")
                            HStack {
                                BotaoVidro(titulo: "Revisar hoje", forte: false) { store.ir(.hoje) }
                                Spacer(minLength: 8)
                                BotaoVidro(titulo: "Julgado do dia") { if let j = store.verbeteDoDia { store.lerCheio(j.id) } else { store.ir(.julgadoDoDia) } }
                            }
                        }
                    }
                    HStack(alignment: .top, spacing: 16) {
                        CartaoNumeroInicio(rotulo: "Meta de hoje", valor: "\(min(100, feito * 100 / meta))", unidade: "%",
                                           apoio: "\(feito)/\(meta) verbetes", fracao: Double(feito) / Double(meta))
                        CartaoNumeroInicio(rotulo: "Revisões", valor: "\(store.srsDueCount)", apoio: "cartões vencidos hoje")
                        CartaoNumeroInicio(rotulo: "Favoritos", valor: "\(store.favorites.count)", apoio: "verbetes marcados com estrela")
                    }
                    .padding(.horizontal, 2).offset(y: -42).padding(.bottom, -42)
                }
                .padding(.horizontal, 26)
                SecaoInicio(titulo: "Estudo semanal",
                            meta: "\(BarrasSemana.dias(store.leiturasPorDia).map(\.valor).reduce(0, +)) verbetes na semana")
                    .padding(.horizontal, 26)
                BarrasSemana(atividade: store.leiturasPorDia)
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
                // Baixa estimulação: a ofensiva (heatmap) não entra; os dados continuam lá.
                JurisDashboardView(partes: ThemeState.t.baixaEstimulacao ? [.kpis, .fontes] : [.kpis, .ofensiva, .fontes])

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
    /// Título de bloco no padrão do Início do Cátedra (serifa + fio).
    private func bloco(_ t: String, _ simbolo: String) -> some View {
        SecaoInicio(titulo: t).padding(.horizontal, 26)
    }

    /// As ações de treino em azulejos grandes — todas alcançáveis também pela sidebar.
    private var gradeTreinar: some View {
        let itens: [(String, String, String, Selecao)] = [
            ("Simulado", "Objetivas C/E + discursivas oficiais", "list.bullet.clipboard.fill", .simulado),
            ("Prova oral", "Arguição sobre um verbete sorteado, correção local", "mic.fill", .provaOral),
            ("Prova oral · bancas", "Pontos, perguntas e padrão de resposta publicados", "person.wave.2.fill", .oralBancas),
            ("Plano de leitura", "Súmulas STF, STJ e TSE no seu roteiro", "calendar", .plano),
            ("Grade de informativos", "Edições do STF, STJ e TSE por semana", "square.grid.3x3.fill", .gradeInformativos),
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
                Image(systemName: "books.vertical.fill").font(DS.interface(16))
                    .foregroundStyle(DS.sobreCor)
                Spacer(minLength: 0)
                Text(nome).font(DS.interface(12.5, .bold))
                    .foregroundStyle(DS.sobreCor).lineLimit(2)
                Text("\(count) verbetes").font(DS.interface(10, .medium))
                    .foregroundStyle(DS.sobreCor.opacity(0.85))
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
                Image(systemName: "sun.horizon.fill").font(DS.interface(18, .bold)).foregroundStyle(Palette.accent)
                    .frame(width: 38, height: 38)
                    .background(Palette.accent.opacity(0.12), in: RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Revisar hoje").font(DS.interface(15, .heavy)).foregroundStyle(Palette.titleInk)
                    Text(srs == 0 && metas == 0
                         ? "Nada vencido — abra para ver o julgado do dia e o checklist."
                         : "\(srs) cartão\(srs == 1 ? "" : "ões") de revisão vencido\(srs == 1 ? "" : "s") · \(metas) meta\(metas == 1 ? "" : "s") pendente\(metas == 1 ? "" : "s")")
                        .font(DS.interface(12)).foregroundStyle(Palette.secondaryInk).lineLimit(2)
                }
                Spacer(minLength: 0)
                if srs + metas > 0 {
                    Text("\(srs + metas)").font(Typo.num(12)).foregroundStyle(DS.sobreCor)
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(Palette.accent, in: Capsule())
                }
                Image(systemName: "chevron.right").font(DS.interface(11, .semibold)).foregroundStyle(Palette.secondaryInk)
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
                    .font(DS.interface(15, .bold)).foregroundStyle(Palette.titleInk)
                Text(deck == 0 ? "Crie flashcards pelo menu ⋯ de um verbete."
                               : "\(deck) no baralho · FSRS, estilo Anki")
                    .font(DS.interface(12)).foregroundStyle(Palette.secondaryInk)
            }
            Spacer(minLength: 0)
            Button { mostrarSRS = true } label: {
                Label(due == 0 ? "Abrir baralho" : "Revisar agora", systemImage: "play.fill")
                    .font(DS.interface(12.5, .semibold))
            }
            .buttonStyle(.borderedProminent).tint(Palette.accent).disabled(deck == 0)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).strokeBorder(Palette.hairline))
    }
}
