import SwiftUI

// =====================================================================================
//  Peças visuais COMPARTILHADAS do CátedraJURIS — a fonte única de verdade.
//  Antes cada tela reimplementava cartão, chip, rótulo e título de seção do seu jeito
//  (5 cartões de verbete, 6 chips, 4 títulos de seção). Tudo o que se repete mora aqui.
// =====================================================================================

/// Selo colorido identificando a fonte (estilo premium: filete + versalete).
struct FonteBadge: View {
    let fonte: Fonte
    var compact: Bool = false
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: fonte.simbolo).font(.system(size: compact ? 8.5 : 9.5, weight: .semibold))
            Text((compact ? fonte.nomeCurto : fonte.nome).uppercased())
                .font(.system(size: compact ? 9.5 : 10, weight: .bold))
                .tracking(0.6)
                .lineLimit(1)
        }
        .padding(.horizontal, compact ? 6 : 8)
        .padding(.vertical, compact ? 2.5 : 3.5)
        .foregroundStyle(fonte.cor)
        .background(fonte.cor.opacity(0.12), in: Capsule())
        .overlay(Capsule().strokeBorder(fonte.cor.opacity(0.30), lineWidth: 0.6))
    }
}

/// O ÚNICO chip do app.
///  · sem `acao`: etiqueta passiva (ramo, tema…) — o uso histórico;
///  · com `acao`: chip de filtro clicável, `ativo` preenchido no acento / inativo no
///    cartão com filete. Substitui os seis `chip(...)` locais de Simulado, Oral, Prova
///    oral e Checklist, que usavam duas paletas diferentes para a mesma coisa.
struct JurisChip: View {
    let texto: String
    var simbolo: String? = nil
    var cor: Color = Palette.secondaryInk
    var ativo: Bool = false
    var acao: (() -> Void)? = nil

    var body: some View {
        if let acao {
            Button(action: acao) { rotulo(clicavel: true) }.buttonStyle(.plain)
        } else {
            rotulo(clicavel: false)
        }
    }

    private func rotulo(clicavel: Bool) -> some View {
        HStack(spacing: 4) {
            if let s = simbolo { Image(systemName: s).font(.system(size: clicavel ? 10 : 8.5, weight: .medium)) }
            Text(texto).font(.system(size: clicavel ? 12 : 10.5, weight: clicavel ? .semibold : .medium)).lineLimit(1)
        }
        .padding(.horizontal, clicavel ? 10 : 7).padding(.vertical, clicavel ? 5 : 2.5)
        .foregroundStyle(clicavel ? (ativo ? Color.white : Palette.titleInk) : cor)
        .background(Capsule().fill(clicavel ? (ativo ? Palette.accent : Palette.cardBackground) : cor.opacity(0.10)))
        .overlay(Capsule().strokeBorder(clicavel ? (ativo ? Palette.accent : Palette.hairline) : Color.clear))
        .contentShape(Capsule())
    }
}

/// Pílula de situação (Aprovada/Superada/Cancelada).
struct SituacaoPill: View {
    let texto: String
    private var cor: Color {
        let t = texto.lowercased()
        if t.contains("cancel") { return Palette.bad }
        if t.contains("super") || t.contains("revog") || t.contains("altera") { return Palette.warn }
        return Palette.fonteSTJ
    }
    var body: some View {
        Text(texto.uppercased())
            .font(.system(size: 9, weight: .bold))
            .tracking(0.5)
            .padding(.horizontal, 7).padding(.vertical, 2.5)
            .foregroundStyle(cor)
            .background(cor.opacity(0.14), in: Capsule())
    }
}

/// Selo de "importante" (dourado).
struct ImportantePill: View {
    var body: some View {
        HStack(spacing: 3) {
            Image(systemName: "bolt.fill").font(.system(size: 8.5))
            Text("IMPORTANTE").font(.system(size: 9, weight: .bold)).tracking(0.5)
        }
        .padding(.horizontal, 7).padding(.vertical, 2.5)
        .foregroundStyle(Palette.accent)
        .background(Palette.accent.opacity(0.14), in: Capsule())
        .overlay(Capsule().strokeBorder(Palette.accent.opacity(0.3), lineWidth: 0.6))
    }
}

/// Linha de metadado no detalhe.
struct MetaRow: View {
    let icone: String
    let rotulo: String
    let valor: String
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Image(systemName: icone)
                .font(.system(size: 11))
                .foregroundStyle(Palette.accent)
                .frame(width: 16)
            Text(rotulo.uppercased())
                .font(.system(size: 10, weight: .bold))
                .tracking(0.4)
                .foregroundStyle(Palette.secondaryInk)
                .frame(width: 132, alignment: .leading)
            Text(valor)
                .font(.system(size: 12.5))
                .foregroundStyle(Palette.bodyInk)
                .textSelection(.enabled)
            Spacer(minLength: 0)
        }
    }
}

/// Cabeçalho de seção dourado com filetes (estilo revista) — usado na ficha do verbete.
struct SectionRule: View {
    let titulo: String
    var body: some View {
        HStack(spacing: 8) {
            Rectangle().fill(Palette.accent.opacity(0.5)).frame(width: 18, height: 1)
            Text(titulo.uppercased())
                .font(.system(size: 10, weight: .bold))
                .tracking(1.2)
                .foregroundStyle(Palette.accent)
            Rectangle().fill(Palette.hairline).frame(height: 1)
        }
    }
}

// MARK: - Título de seção interna (o formato da Prateleira, para todas as páginas)

/// "Por disciplina", "Desta central", "Tipos de jurisprudência"… — um só formato:
/// símbolo no acento + título `Typo.serifTitle(17)` + contagem opcional + "Ver todos".
struct JurisSecaoTitulo: View {
    let titulo: String
    var simbolo: String? = nil
    var cor: Color = Palette.accent
    var count: Int? = nil
    var verTodos: (() -> Void)? = nil

    var body: some View {
        HStack(spacing: 7) {
            if let s = simbolo { Image(systemName: s).font(.system(size: 12)).foregroundStyle(cor) }
            Text(titulo).font(Typo.serifTitle(17, .bold)).foregroundStyle(Palette.titleInk)
            if let count {
                Text("\(count)").font(Typo.num(11))
                    .padding(.horizontal, 7).padding(.vertical, 1)
                    .background(cor.opacity(0.16), in: Capsule()).foregroundStyle(cor)
            }
            Spacer()
            if let v = verTodos {
                Button(action: v) {
                    HStack(spacing: 3) { Text("Ver todos"); Image(systemName: "chevron.right").font(.system(size: 9, weight: .bold)) }
                        .font(.system(size: 11, weight: .semibold)).foregroundStyle(Palette.accent)
                }.buttonStyle(.plain)
            }
        }
    }
}

// MARK: - Cartão de verbete (UM cartão, três estilos)

/// Lombada SEMPRE na cor do RAMO (vitrine); o tribunal vive no FonteBadge.
///  · .grid — azulejo fixo 236×150 das prateleiras horizontais;
///  · .row  — linha de largura cheia (listas de hub, galeria);
///  · .hero — destaque grande com gradiente do ramo e chamada "Ler inteiro teor".
struct CartaoJuris: View {
    enum Estilo { case grid, row, hero }
    let entry: JurisEntry
    var estilo: Estilo = .grid
    /// Ação ao clicar; nil = abre em leitura tela cheia.
    var acao: (() -> Void)? = nil
    /// Rodapé extra (ex.: "abrir mapa ›") nos estilos grid/row.
    var rodape: String? = nil
    @Environment(LibraryStore.self) private var store
    @State private var hovering = false

    private var ramoCor: Color { RamoStyle.color(entry.ramoDireito) }

    var body: some View {
        Button { if let acao { acao() } else { store.lerCheio(entry.id) } } label: {
            switch estilo {
            case .grid: grid
            case .row: row
            case .hero: hero
            }
        }
        .buttonStyle(.plain)
        .onHover { hovering = $0 }
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: hovering)
    }

    private var selos: some View {
        HStack(spacing: 6) {
            FonteBadge(fonte: entry.fonteKind, compact: true)
            if let s = entry.situacao, entry.situacaoKind != .vigente { SituacaoPill(texto: s) }
            Spacer()
            if store.isImportante(entry) {
                Image(systemName: "bolt.fill").font(.system(size: 9)).foregroundStyle(Palette.accent)
            }
            if store.isFavorite(entry.id) {
                Image(systemName: "star.fill").font(.system(size: 9)).foregroundStyle(Palette.importante)
            }
        }
    }

    private var grid: some View {
        VStack(alignment: .leading, spacing: 8) {
            selos
            Text(entry.titulo)
                .font(Typo.serifTitle(15, .bold)).foregroundStyle(Palette.titleInk)
                .lineLimit(1)
            Text(entry.enunciado)
                .font(Typo.serifBody(11.5)).foregroundStyle(Palette.bodyInk.opacity(0.85))
                .lineLimit(3).lineSpacing(1.5)
                .fixedSize(horizontal: false, vertical: true)
                .multilineTextAlignment(.leading)
            Spacer(minLength: 0)
            HStack {
                if let r = entry.ramoDireito {
                    Text(r).font(.system(size: 9.5, weight: .semibold)).foregroundStyle(ramoCor).lineLimit(1)
                }
                Spacer()
                if let rodape { Text(rodape).font(.system(size: 9.5, weight: .semibold)).foregroundStyle(Palette.secondaryInk) }
            }
        }
        .padding(13)
        .frame(width: 236, height: 150, alignment: .topLeading)
        .modifier(Moldura(cor: ramoCor, hovering: hovering, raio: Palette.rCard))
    }

    private var row: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: store.isLido(entry.id) ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 13))
                .foregroundStyle(store.isLido(entry.id) ? Palette.ok : Palette.secondaryInk.opacity(0.4))
                .padding(.top, 2)
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 7) {
                    Text(entry.titulo).font(Typo.serifTitle(13.5, .semibold)).foregroundStyle(Palette.titleInk).lineLimit(1)
                    FonteBadge(fonte: entry.fonteKind, compact: true)
                    if let s = entry.situacao, entry.situacaoKind != .vigente { SituacaoPill(texto: s) }
                    Spacer(minLength: 0)
                    if let rodape { Text(rodape).font(.system(size: 9.5, weight: .semibold)).foregroundStyle(Palette.secondaryInk) }
                }
                Text(entry.enunciado).font(Typo.serifBody(12)).foregroundStyle(Palette.bodyInk.opacity(0.85))
                    .lineLimit(2).fixedSize(horizontal: false, vertical: true)
                    .multilineTextAlignment(.leading)
            }
        }
        .padding(11)
        .frame(maxWidth: .infinity, alignment: .leading)
        .modifier(Moldura(cor: ramoCor, hovering: hovering, raio: Palette.rInner))
    }

    private var hero: some View {
        HStack(alignment: .top, spacing: 22) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    FonteBadge(fonte: entry.fonteKind)
                    if entry.situacaoKind != .vigente { SituacaoPill(texto: entry.situacao ?? entry.situacaoKind.rawValue) }
                    if let r = entry.ramoDireito { JurisChip(texto: r, cor: ramoCor) }
                }
                Text(entry.titulo).font(Typo.serifTitle(30, .bold)).foregroundStyle(Palette.titleInk)
                    .lineLimit(2).multilineTextAlignment(.leading)
                Text(entry.enunciado).font(Typo.serifBody(14)).foregroundStyle(Palette.bodyInk)
                    .lineLimit(4).lineSpacing(3).fixedSize(horizontal: false, vertical: true)
                    .multilineTextAlignment(.leading)
                HStack(spacing: 6) {
                    Image(systemName: "book.fill").font(.system(size: 11))
                    Text("Ler inteiro teor").font(.system(size: 12.5, weight: .bold))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 16).padding(.vertical, 9)
                .background(RamoStyle.gradient(entry.ramoDireito), in: Capsule())
                .shadow(color: ramoCor.opacity(0.45), radius: 9, y: 4)
                .padding(.top, 2)
            }
            Spacer(minLength: 0)
        }
        .padding(26)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(colors: [ramoCor.opacity(0.18), Palette.cardBackground],
                           startPoint: .topLeading, endPoint: .bottomTrailing),
            in: RoundedRectangle(cornerRadius: Palette.rHero, style: .continuous))
        .overlay(alignment: .leading) {
            RoundedRectangle(cornerRadius: 2).fill(ramoCor).frame(width: 4).padding(.vertical, 22)
        }
        .overlay(RoundedRectangle(cornerRadius: Palette.rHero, style: .continuous).strokeBorder(ramoCor.opacity(0.25), lineWidth: 1))
        .shadow(color: ramoCor.opacity(0.16), radius: 16, y: 8)
    }

    /// Fundo de cartão + lombada do ramo + filete + sombra que "levanta" no hover.
    private struct Moldura: ViewModifier {
        let cor: Color
        let hovering: Bool
        let raio: CGFloat
        func body(content: Content) -> some View {
            content
                .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: raio, style: .continuous))
                .overlay(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 2).fill(cor).frame(width: 3).padding(.vertical, 12)
                }
                .overlay(RoundedRectangle(cornerRadius: raio, style: .continuous).strokeBorder(Palette.hairline, lineWidth: 1))
                .shadow(color: hovering ? cor.opacity(0.25) : .black.opacity(0.05),
                        radius: hovering ? 10 : 5, y: hovering ? 5 : 2)
                .scaleEffect(hovering ? 1.02 : 1)
        }
    }
}

// MARK: - Prateleira (shelf horizontal com título de seção)

struct Prateleira<Conteudo: View>: View {
    let titulo: String
    var simbolo: String? = nil
    var verTodos: (() -> Void)? = nil
    @ViewBuilder var conteudo: () -> Conteudo

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            JurisSecaoTitulo(titulo: titulo, simbolo: simbolo, verTodos: verTodos)
                .padding(.horizontal, 26)
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 12) { conteudo() }
                    .padding(.horizontal, 26).padding(.vertical, 2)
            }
        }
    }
}

// MARK: - Cartão-botão das páginas-hub (Centrais, Ramos, Tribunal)

struct HubCard: View {
    let icon: String
    let titulo: String
    let subtitulo: String
    var sigla: String? = nil      // usa um "selo" de texto no lugar do ícone
    var cor: Color = Palette.accent
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
                        .background(cor, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                } else {
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(cor)
                        .frame(width: 34, height: 34)
                        .background(cor.opacity(0.12), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
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
            .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).strokeBorder(Palette.hairline, lineWidth: 1))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

/// Barra fina de "voltar" no topo das páginas-filhas.
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

// MARK: - Peças das telas de estudo (roteiro, simulado, prova oral)

/// Rótulo pequeno em caixa alta — a "voz de rótulo" do Cátedra. SÓ para rótulos de
/// campo/bloco; título de seção é JurisSecaoTitulo.
struct RotuloEstudo: View {
    let texto: String
    var body: some View {
        Text(texto.uppercased())
            .font(.system(size: 10.5, weight: .bold)).tracking(1.4)
            .foregroundStyle(Palette.secondaryInk)
    }
}

/// Bloco do roteiro: rótulo em cima, corpo com faixa colorida à esquerda.
struct BlocoEstudo<Corpo: View>: View {
    let rotulo: String
    var cor: Color = Palette.accent
    var fundo: Color? = nil
    @ViewBuilder var corpo: Corpo
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            RotuloEstudo(texto: rotulo)
            HStack(alignment: .top, spacing: 0) {
                RoundedRectangle(cornerRadius: 2).fill(cor).frame(width: 3)
                corpo
                    .font(.system(size: 14.5)).lineSpacing(3)
                    .foregroundStyle(Palette.titleInk)
                    .padding(.horizontal, 13).padding(.vertical, 10)
                Spacer(minLength: 0)
            }
            .background(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous)
                .fill(fundo ?? cor.opacity(ThemeState.t.isDark ? 0.14 : 0.08)))
        }
    }
}

/// Etiqueta em caixa alta (tribunal, "2ª fase", "Destaque"…).
struct EtiquetaEstudo: View {
    let texto: String
    var cor: Color = Palette.accent
    var body: some View {
        Text(texto.uppercased())
            .font(.system(size: 10, weight: .heavy)).tracking(0.6)
            .padding(.horizontal, 8).padding(.vertical, 3)
            .background(Capsule().fill(cor.opacity(0.15)))
            .foregroundStyle(cor)
    }
}

/// KPI numérico grande + rótulo (Simulado, Grade de informativos).
struct JurisKPI: View {
    let valor: String
    let rotulo: String
    var cor: Color = Palette.titleInk
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(valor).font(Typo.num(26, .heavy)).foregroundStyle(cor)
            RotuloEstudo(texto: rotulo)
        }
    }
}

/// Campo de busca inline das páginas (mesmo desenho em Oral, Prova oral, Home).
struct JurisCampoBusca: View {
    let prompt: String
    @Binding var texto: String
    var aoSubmeter: (() -> Void)? = nil
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass").font(.system(size: 13)).foregroundStyle(Palette.secondaryInk)
            TextField(prompt, text: $texto).textFieldStyle(.plain).font(.system(size: 13.5))
                .onSubmit { aoSubmeter?() }
            if !texto.isEmpty {
                Button { texto = "" } label: {
                    Image(systemName: "xmark.circle.fill").font(.system(size: 12)).foregroundStyle(Palette.secondaryInk)
                }.buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 12).padding(.vertical, 9)
        .background(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous).fill(Palette.cardBackground))
        .overlay(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous).strokeBorder(Palette.hairline))
    }
}

/// Fileira de chips de filtro que mostra `limite` itens e um chip "mais N…" para o
/// resto — no lugar do `prefix(18)` que escondia disciplinas sem aviso.
struct JurisChipsLimitados<T: Hashable>: View {
    let itens: [T]
    var limite: Int = 14
    let rotulo: (T) -> String
    let ativo: (T) -> Bool
    let acao: (T) -> Void
    @State private var expandido = false

    var body: some View {
        let visiveis = expandido ? itens : Array(itens.prefix(limite))
        ForEach(visiveis, id: \.self) { it in
            JurisChip(texto: rotulo(it), ativo: ativo(it)) { acao(it) }
        }
        if itens.count > limite {
            JurisChip(texto: expandido ? "menos" : "mais \(itens.count - limite)…",
                      simbolo: expandido ? "chevron.up" : "chevron.down") { expandido.toggle() }
        }
    }
}

// MARK: - Flow (fileira que QUEBRA de linha) — corrige o estouro de largura no iPad.
// Fileiras de etiquetas/KPIs eram HStack rígido: cabiam no Mac (janela larga) e
// ultrapassavam a borda no iPad, sobretudo em retrato ou com a barra lateral aberta,
// porque HStack nunca quebra linha sozinho. Layout protocol (iOS 16+) resolve sem
// depender de largura fixa nem de ScrollView horizontal escondendo conteúdo.
struct Flow: Layout {
    var espacamento: CGFloat = 6
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let largura = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, alturaLinha: CGFloat = 0
        for v in subviews {
            let t = v.sizeThatFits(.unspecified)
            if x > 0 && x + t.width > largura { x = 0; y += alturaLinha + espacamento; alturaLinha = 0 }
            x += t.width + espacamento
            alturaLinha = max(alturaLinha, t.height)
        }
        return CGSize(width: largura, height: y + alturaLinha)
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x: CGFloat = bounds.minX, y: CGFloat = bounds.minY, alturaLinha: CGFloat = 0
        for v in subviews {
            let t = v.sizeThatFits(.unspecified)
            if x > bounds.minX && x + t.width > bounds.maxX { x = bounds.minX; y += alturaLinha + espacamento; alturaLinha = 0 }
            v.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(t))
            x += t.width + espacamento
            alturaLinha = max(alturaLinha, t.height)
        }
    }
}
