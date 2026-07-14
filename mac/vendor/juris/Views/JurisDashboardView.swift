import SwiftUI

/// Painel de estudos no topo da home. Segue o padrão visual do app:
/// título serifado, hero com gradiente, cards com barra de acento lateral e
/// cabeçalhos de seção iguais aos das prateleiras.
struct JurisDashboardView: View {
    @Environment(LibraryStore.self) private var store

    @State private var mostrarFlash = false
    @State private var flashDeck: [JurisEntry] = []
    @State private var flashTitulo = ""
    @State private var mostrarRevisao = false
    @State private var revisaoDeck: [JurisEntry] = []
    @State private var mostrarSRS = false
    @State private var mostrarBaralho = false

    private var fontesDestaque: [Fonte] {
        [.tjro, .tjroPrec, .sumulaSTF, .sumulaSTJ, .sumulaTSE, .repercussaoGeral, .informativoSTJ]
            .filter { store.totalDaFonte($0) > 0 }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            heroResumo
            if let vd = store.verbeteDoDia {
                secao("Verbete do dia", "sun.max.fill") { verbeteDoDiaCard(vd) }
            }
            // Checklist de leitura PRÓPRIA do CátedraJURIS — dados independentes do
            // LEGIS, cada app com o seu, para não misturar metas de leis com as de jurisprudência.
            JurisChecklistMiniCard(openChecklist: { store.selecao = .checklist })
            kpiGrid
            secao("Atalhos", "bolt.horizontal.fill") { acoesRapidas }
            secao("Sua ofensiva", "flame.fill") { heatmap }
            if !fontesDestaque.isEmpty {
                secao("Seu progresso por fonte", "chart.bar.fill") { progressoFontes }
            }
        }
        .padding(.horizontal, 26)
        .sheet(isPresented: $mostrarFlash) { ExportAnkiSheet(entries: flashDeck, titulo: flashTitulo) }
        .sheet(isPresented: $mostrarRevisao) { RevisaoView(deck: revisaoDeck) }
        .sheet(isPresented: $mostrarSRS) { RevisaoEspacadaView() }
        .sheet(isPresented: $mostrarBaralho) { BaralhoView() }
    }

    /// Cabeçalho de seção idêntico ao das prateleiras (símbolo em acento + título serifado).
    private func secao<C: View>(_ titulo: String, _ simbolo: String, @ViewBuilder _ conteudo: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 11) {
            HStack(spacing: 7) {
                Image(systemName: simbolo).font(.system(size: 12)).foregroundStyle(Palette.accent)
                Text(titulo).font(Typo.serifTitle(17, .bold)).foregroundStyle(Palette.titleInk)
            }
            conteudo()
        }
    }

    // MARK: Hero de resumo (saudação + sequência + meta)

    private var saudacao: String {
        let h = Calendar.current.component(.hour, from: Date())
        switch h { case 5..<12: return "Bom dia"; case 12..<18: return "Boa tarde"; default: return "Boa noite" }
    }

    // Hero no estilo do Cátedra/CátedraLEGIS: gradiente forte (heroStops espelhados
    // do "Bom dia" do Cátedra) com texto BRANCO — a assinatura visual da casa.
    private var heroResumo: some View {
        let feito = store.lidosHoje
        let meta = max(store.metaDiaria, 1)
        let frac = min(Double(feito) / Double(meta), 1)
        let dataLonga = Date().formatted(.dateTime.weekday(.wide).day().month(.wide)).uppercased()
        return VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top, spacing: 14) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(dataLonga)
                        .font(.system(size: 10, weight: .bold)).tracking(1.1)
                        .foregroundStyle(.white.opacity(0.75))
                    Text("\(saudacao), vamos revisar jurisprudência?")
                        .font(.system(size: 26, weight: .bold)).foregroundStyle(.white)
                }
                Spacer(minLength: 0)
                streakBadge
            }
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 8) {
                    Image(systemName: "target").font(.system(size: 12, weight: .semibold)).foregroundStyle(.white.opacity(0.9))
                    Text("Meta de hoje").font(.system(size: 12.5, weight: .semibold)).foregroundStyle(.white.opacity(0.9))
                    Spacer()
                    Text("\(feito) / \(meta)")
                        .font(Typo.serifTitle(14, .bold))
                        .foregroundStyle(.white)
                    passo("minus") { store.metaDiaria = max(5, store.metaDiaria - 5) }
                    passo("plus") { store.metaDiaria = min(200, store.metaDiaria + 5) }
                }
                ProgressView(value: frac)
                    .tint(.white)
                if feito >= meta {
                    Label("Meta batida hoje!", systemImage: "checkmark.seal.fill")
                        .font(.system(size: 11, weight: .semibold)).foregroundStyle(.white)
                }
            }
            .padding(14)
            .background(Color.white.opacity(0.14), in: RoundedRectangle(cornerRadius: 10))
        }
        .padding(22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(colors: ThemeState.t.heroStops,
                           startPoint: .topLeading, endPoint: .bottomTrailing),
            in: RoundedRectangle(cornerRadius: max(6, ThemeState.t.radius)))
    }

    // Botões ± da meta — vivem no hero (gradiente): vidro branco.
    private func passo(_ icone: String, _ acao: @escaping () -> Void) -> some View {
        Button(action: acao) {
            Image(systemName: icone).font(.system(size: 10, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 22, height: 22)
                .background(Color.white.opacity(0.18), in: Circle())
        }
        .buttonStyle(.plain)
    }

    // Vive DENTRO do hero (gradiente) — vidro branco + texto branco, como no Cátedra.
    private var streakBadge: some View {
        let s = store.streak
        return HStack(spacing: 8) {
            Image(systemName: "flame.fill").font(.system(size: 18))
                .foregroundStyle(s > 0 ? Color.orange : .white.opacity(0.45))
            VStack(alignment: .leading, spacing: 0) {
                Text("\(s)").font(Typo.serifTitle(19, .bold)).foregroundStyle(.white)
                Text(s == 1 ? "dia seguido" : "dias seguidos")
                    .font(.system(size: 9.5)).foregroundStyle(.white.opacity(0.8))
            }
        }
        .padding(.horizontal, 13).padding(.vertical, 8)
        .background(Color.white.opacity(0.14), in: RoundedRectangle(cornerRadius: 10))
    }

    // MARK: Verbete do dia

    private func verbeteDoDiaCard(_ e: JurisEntry) -> some View {
        Button { store.lerCheio(e.id) } label: {
            HStack(alignment: .top, spacing: 14) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 8) {
                        FonteBadge(fonte: e.fonteKind)
                        if let s = e.situacao { SituacaoPill(texto: s) }
                    }
                    Text(e.titulo).font(Typo.serifTitle(20, .bold)).foregroundStyle(Palette.titleInk)
                        .lineLimit(2).fixedSize(horizontal: false, vertical: true)
                    Text(e.enunciado).font(Typo.serifBody(13)).foregroundStyle(Palette.bodyInk)
                        .lineLimit(3).lineSpacing(2).fixedSize(horizontal: false, vertical: true)
                    HStack(spacing: 6) {
                        Image(systemName: "book.fill").font(.system(size: 10))
                        Text("Ler inteiro teor").font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(Palette.accent, in: Capsule())
                    .padding(.top, 2)
                }
                Spacer(minLength: 0)
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                LinearGradient(colors: [e.fonteKind.cor.opacity(0.14), Palette.cardBackground],
                               startPoint: .topLeading, endPoint: .bottomTrailing),
                in: RoundedRectangle(cornerRadius: 16))
            .overlay(alignment: .leading) {
                RoundedRectangle(cornerRadius: 2).fill(e.fonteKind.cor).frame(width: 3.5).padding(.vertical, 16)
            }
            .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Palette.hairline, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    // MARK: Calendário de ofensiva (heatmap estilo GitHub, lê leiturasPorDia)

    private var heatmap: some View {
        let semanas = 18
        let cal = Calendar.current
        let hoje = Date()
        let hojeWd = cal.component(.weekday, from: hoje) - 1   // 0=Dom … 6=Sáb
        return VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 3) {
                ForEach(0..<semanas, id: \.self) { col in
                    VStack(spacing: 3) {
                        ForEach(0..<7, id: \.self) { row in
                            celulaHeatmap(col: col, row: row, semanas: semanas, hojeWd: hojeWd, hoje: hoje, cal: cal)
                        }
                    }
                }
                Spacer(minLength: 0)
            }
            HStack(spacing: 5) {
                Text("Menos").font(.system(size: 9)).foregroundStyle(Palette.secondaryInk)
                ForEach(0..<5, id: \.self) { n in
                    RoundedRectangle(cornerRadius: 2).fill(corIntensidade(n == 0 ? 0 : n * 3))
                        .frame(width: 11, height: 11)
                }
                Text("Mais").font(.system(size: 9)).foregroundStyle(Palette.secondaryInk)
                Spacer()
                Text("Cada quadradinho = 1 dia de estudo")
                    .font(.system(size: 10)).foregroundStyle(Palette.secondaryInk)
            }
        }
        .padding(15)
        .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Palette.hairline, lineWidth: 1))
        .shadow(color: .black.opacity(0.05), radius: 6, y: 2)
    }

    @ViewBuilder
    private func celulaHeatmap(col: Int, row: Int, semanas: Int, hojeWd: Int, hoje: Date, cal: Calendar) -> some View {
        let diasAtras = ((semanas - 1) - col) * 7 + (hojeWd - row)
        if diasAtras < 0 {
            RoundedRectangle(cornerRadius: 2).fill(Color.clear).frame(width: 13, height: 13)
        } else if let dia = cal.date(byAdding: .day, value: -diasAtras, to: hoje) {
            let n = store.contagemDoDia(dia)
            RoundedRectangle(cornerRadius: 2).fill(corIntensidade(n))
                .frame(width: 13, height: 13)
                .help("\(LibraryStore.chaveDia(dia)): \(n) lido\(n == 1 ? "" : "s")")
        } else {
            RoundedRectangle(cornerRadius: 2).fill(corIntensidade(0)).frame(width: 13, height: 13)
        }
    }

    private func corIntensidade(_ n: Int) -> Color {
        switch n {
        case 0: return Palette.secondaryInk.opacity(0.12)
        case 1...2: return Palette.fonteSTJ.opacity(0.35)
        case 3...5: return Palette.fonteSTJ.opacity(0.55)
        case 6...9: return Palette.fonteSTJ.opacity(0.78)
        default: return Palette.fonteSTJ
        }
    }

    // MARK: KPIs (cards com barra de acento lateral, como os cartões do app)

    private var kpiGrid: some View {
        let cols = [GridItem(.adaptive(minimum: 158), spacing: 12)]
        return LazyVGrid(columns: cols, spacing: 12) {
            kpi("Verbetes", store.totalCount, "square.stack.3d.up.fill", Palette.accent) { store.selecao = .todos }
            kpi("Lidos", store.totalLidos, "checkmark.circle.fill", Palette.fonteSTJ) { store.selecao = .todos }
            kpi("Favoritos", store.favorites.count, "star.fill", Palette.importante) { store.selecao = .favoritos }
            kpi("Anotações", store.richNotes.count, "square.and.pencil", Palette.fonteJT) { store.selecao = .anotacoes }
            kpi("Coleções", store.colecoes.count, "folder.fill", Palette.fonteRG) {
                if let c = store.colecoes.first { store.selecao = .colecao(c.id) } else { store.selecao = .todos }
            }
            kpi("Novidades", store.novidadesNaoVistas, "sparkles", Palette.fonteInfoSTF) { store.selecao = .novidades }
        }
    }

    private func kpi(_ titulo: String, _ valor: Int, _ icone: String, _ cor: Color, _ acao: @escaping () -> Void) -> some View {
        Button {
            store.selectedID = nil; store.leituraID = nil; acao()
        } label: {
            HStack(spacing: 11) {
                ZStack {
                    Circle().fill(cor.opacity(0.14)).frame(width: 34, height: 34)
                    Image(systemName: icone).font(.system(size: 15)).foregroundStyle(cor)
                }
                VStack(alignment: .leading, spacing: 1) {
                    Text("\(valor)").font(Typo.serifTitle(20, .bold)).foregroundStyle(Palette.titleInk)
                    Text(titulo).font(.system(size: 11)).foregroundStyle(Palette.secondaryInk)
                }
                Spacer(minLength: 0)
            }
            .padding(13)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 12))
            .overlay(alignment: .leading) {
                RoundedRectangle(cornerRadius: 2).fill(cor).frame(width: 3).padding(.vertical, 12)
            }
            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Palette.hairline, lineWidth: 1))
            .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
        }
        .buttonStyle(.plain)
    }

    // MARK: Atalhos (cards uniformes)

    private var acoesRapidas: some View {
        HStack(spacing: 12) {
            Menu {
                Button { abrirFlash(store.entries.filter { store.isFavorite($0.id) }, "Favoritos") }
                    label: { Label("Favoritos (\(store.favorites.count))", systemImage: "star") }
                Button { abrirFlash(Array(store.entries.lazy.filter { store.isImportante($0) }.prefix(500)), "Importantes") }
                    label: { Label("Importantes", systemImage: "bolt") }
                if !store.colecoes.isEmpty {
                    Divider()
                    ForEach(store.colecoes) { c in
                        Button { abrirFlash(store.verbetes(colecao: c), c.nome) }
                            label: { Label(c.nome, systemImage: "folder") }
                    }
                }
            } label: { atalhoCard("JurisFlashcards", "rectangle.on.rectangle.angled", Palette.accent) }
                .menuStyle(.borderlessButton).menuIndicator(.hidden)

            Button { mostrarSRS = true } label: {
                atalhoCard("Revisão espaçada", "brain.head.profile", Palette.fonteJT, badge: store.srsDueCount)
            }
            .buttonStyle(.plain)
            Button { mostrarBaralho = true } label: {
                atalhoCard("Baralho", "rectangle.stack", Palette.fonteRepetitivo, badge: store.srsDeckCount == 0 ? 0 : nil)
            }
            .buttonStyle(.plain)
            Button { abrirRevisao() } label: { atalhoCard("Cartões (folhear)", "sparkles.rectangle.stack", Palette.fonteTSE) }
                .buttonStyle(.plain)
            Button { store.selectedID = nil; store.leituraID = nil; store.selecao = .tjroHub } label: { atalhoCard("Central TJRO", "building.2.fill", Palette.fonteTJRO) }
                .buttonStyle(.plain)
            Button { store.selectedID = nil; store.selecao = .indice } label: { atalhoCard("Índice", "textformat.abc", Palette.fonteRG) }
                .buttonStyle(.plain)
        }
    }

    private func atalhoCard(_ t: String, _ icone: String, _ cor: Color, badge: Int? = nil) -> some View {
        HStack(spacing: 9) {
            ZStack {
                Circle().fill(cor.opacity(0.14)).frame(width: 30, height: 30)
                Image(systemName: icone).font(.system(size: 13)).foregroundStyle(cor)
            }
            Text(t).font(.system(size: 13, weight: .semibold)).foregroundStyle(Palette.bodyInk)
            Spacer(minLength: 0)
            if let badge, badge > 0 {
                Text("\(badge)").font(.system(size: 10.5, weight: .bold)).foregroundStyle(.white)
                    .padding(.horizontal, 6).padding(.vertical, 1)
                    .background(cor, in: Capsule())
            }
        }
        .padding(.horizontal, 13).padding(.vertical, 11)
        .frame(maxWidth: .infinity)
        .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Palette.hairline, lineWidth: 1))
    }

    private func abrirFlash(_ deck: [JurisEntry], _ titulo: String) {
        flashDeck = deck.isEmpty ? Array(store.entries.prefix(50)) : deck
        flashTitulo = titulo
        mostrarFlash = true
    }
    private func abrirRevisao() {
        let fav = store.entries.filter { store.isFavorite($0.id) }
        let imp = Array(store.entries.lazy.filter { store.isImportante($0) }.prefix(60))
        revisaoDeck = !fav.isEmpty ? fav : (!imp.isEmpty ? imp : Array(store.entries.prefix(40)))
        mostrarRevisao = true
    }

    // MARK: Progresso por fonte

    private var progressoFontes: some View {
        VStack(spacing: 11) {
            ForEach(fontesDestaque, id: \.self) { f in fonteLinha(f) }
        }
        .padding(15)
        .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Palette.hairline, lineWidth: 1))
        .shadow(color: .black.opacity(0.05), radius: 6, y: 2)
    }

    private func fonteLinha(_ f: Fonte) -> some View {
        let total = store.totalDaFonte(f)
        let lidos = store.lidosDaFonte(f)
        let frac = total == 0 ? 0 : Double(lidos) / Double(total)
        return Button { store.selectedID = nil; store.leituraID = nil; store.selecao = .fonte(f) } label: {
            HStack(spacing: 10) {
                Image(systemName: f.simbolo).font(.system(size: 12)).foregroundStyle(f.cor).frame(width: 20)
                Text(f.nome).font(.system(size: 12.5, weight: .medium)).foregroundStyle(Palette.bodyInk)
                    .lineLimit(1).frame(width: 186, alignment: .leading)
                ProgressView(value: frac).tint(f.cor)
                Text("\(lidos)/\(total)").font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Palette.secondaryInk).frame(width: 68, alignment: .trailing)
            }
        }
        .buttonStyle(.plain)
    }
}
