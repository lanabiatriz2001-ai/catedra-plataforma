import SwiftUI

// =====================================================================================
//  CátedraJURIS — telas de ESTUDO que antes só existiam na versão web:
//    · Grade de informativos (uma edição por quadradinho, verde/âmbar/cinza)
//    · Julgado do dia (sorteio com semente na data — o mesmo dia devolve o mesmo)
//    · Prova oral (pergunta e correção locais, ProvaOralLocal — sem IA)
//
//  Peças visuais (RotuloEstudo, BlocoEstudo, EtiquetaEstudo, Flow, chips) moram em
//  Views/Components.swift.
//
//  Cores: fundo/texto/acento seguem o tema do Cátedra (ThemeState); a cor de cada
//  fonte é a do TRIBUNAL (Palette.fonte*). Nada de hex solto aqui.
// =====================================================================================

// MARK: - 1. Grade de informativos

struct GradeInformativosView: View {
    @Environment(LibraryStore.self) private var store
    @State private var expandidas: Set<String> = []

    private static let colecoes: [Fonte] = [
        .informativoSTF, .informativoSTJ, .informativoTSE,
        .boletimJurisTCU, .boletimPessoalTCU, .infoLicTCU,
    ]
    private let lote = 48

    var body: some View {
        SectionShell(icon: Selecao.gradeInformativos.simbolo, title: Selecao.gradeInformativos.titulo,
                     subtitle: "Uma edição por quadradinho — verde lida, âmbar começada.",
                     count: todas.reduce(0) { $0 + $1.1.count }) {
            ScrollView {
                VStack(alignment: .leading, spacing: 26) {
                    cabecalho
                    ForEach(Self.colecoes) { f in
                        let eds = store.edicoesInfo(f)
                        if !eds.isEmpty { colecao(f, eds) }
                    }
                }
                .jurisMargemPagina(28).padding(.vertical, 24)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private var todas: [(Fonte, [InfoEdicao])] {
        Self.colecoes.map { ($0, store.edicoesInfo($0)) }.filter { !$0.1.isEmpty }
    }
    private func estado(_ f: Fonte, _ e: InfoEdicao) -> (lidos: Int, total: Int) {
        let ids = store.entries.lazy.filter { $0.fonteKind == f && $0.numero == e.numero }.map(\.id)
        var l = 0, t = 0
        for id in ids { t += 1; if store.dominados.contains(id) || store.lidos.contains(id) { l += 1 } }
        return (l, max(t, e.count))
    }

    private var cabecalho: some View {
        let tot = todas.reduce(0) { $0 + $1.1.count }
        var lidas = 0, comecadas = 0
        for (f, eds) in todas { for e in eds { let s = estado(f, e); if s.lidos >= s.total { lidas += 1 } else if s.lidos > 0 { comecadas += 1 } } }
        return Flow(espacamento: 22) {
            JurisKPI(valor: "\(tot)", rotulo: "edições")
            JurisKPI(valor: "\(lidas)", rotulo: "lidas", cor: Palette.ok)
            JurisKPI(valor: "\(comecadas)", rotulo: "começadas", cor: Palette.warn)
            JurisKPI(valor: "\(tot - lidas - comecadas)", rotulo: "não lidas")
        }
        .padding(.horizontal, 18).padding(.vertical, 14)
        .background(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).fill(Palette.cardBackground))
        .overlay(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).strokeBorder(Palette.hairline))
    }

    private func colecao(_ f: Fonte, _ eds: [InfoEdicao]) -> some View {
        let cor = f.cor
        let mostrar = expandidas.contains(f.rawValue) ? eds.count : min(lote, eds.count)
        return VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                JurisSecaoTitulo(titulo: f.nome, simbolo: f.simbolo, cor: cor, count: eds.count)
                Text("até a \(eds.first?.numero ?? 0)")
                    .font(Typo.ui(12)).foregroundStyle(Palette.secondaryInk)
            }
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 64), spacing: 7)], spacing: 7) {
                ForEach(eds.prefix(mostrar)) { e in
                    let s = estado(f, e)
                    Button { store.ir(.infoEdicao(f, e.numero)) } label: {
                        VStack(spacing: 1) {
                            Text("\(e.numero)").font(Typo.num(14, .heavy))
                            Text(s.lidos > 0 ? "\(s.lidos)/\(s.total)" : "\(s.total)")
                                .font(Typo.ui(9, .bold))
                        }
                        .frame(maxWidth: .infinity, minHeight: 56)
                        .foregroundStyle(cls(s) == .lida ? Palette.okInk : cls(s) == .parcial ? Palette.warn : Palette.secondaryInk)
                        .background(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous)
                            .fill(cls(s) == .lida ? Palette.ok.opacity(0.14) : cls(s) == .parcial ? Palette.warn.opacity(0.14) : Palette.cardBackground))
                        .overlay(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous)
                            .strokeBorder(cls(s) == .lida ? Palette.ok : cls(s) == .parcial ? Palette.warn : Palette.hairline, lineWidth: 1.5))
                    }
                    .buttonStyle(.plain)
                    .help("\(f.nome) nº \(e.numero) — \(s.lidos) de \(s.total) lidos")
                }
            }
            if eds.count > mostrar {
                Button("Ver mais \(f.nomeCurto) (\(eds.count - mostrar) restantes)") { expandidas.insert(f.rawValue) }
                    .buttonStyle(.bordered).tint(cor)
            }
        }
    }
    private enum Cls { case lida, parcial, nao }
    private func cls(_ s: (lidos: Int, total: Int)) -> Cls { s.lidos >= s.total && s.total > 0 ? .lida : (s.lidos > 0 ? .parcial : .nao) }
}

// MARK: - 2. Julgado do dia

struct JulgadoDoDiaView: View {
    @Environment(LibraryStore.self) private var store
    @State private var mostrarOral = false

    /// FONTE ÚNICA: o mesmo `store.verbeteDoDia` que o painel da Home já usava (mesma
    /// semente por data, muda à meia-noite). Antes esta tela recalculava por conta
    /// própria com OUTRO algoritmo de semente — os dois sorteavam verbetes diferentes
    /// no mesmo dia, e apareciam ao mesmo tempo na Home como se fossem coisas distintas.
    var verbete: JurisEntry? { store.verbeteDoDia }

    /// true na página própria (sidebar): ganha o SectionShell. Embutido na Home vem só o cartão.
    var pagina: Bool = false

    var body: some View {
        if pagina {
            SectionShell(icon: Selecao.julgadoDoDia.simbolo, title: Selecao.julgadoDoDia.titulo,
                         subtitle: Date().formatted(.dateTime.weekday(.wide).day().month(.wide).year().locale(Locale(identifier: "pt_BR")))) {
                ScrollView {
                    conteudo.jurisMargemPagina(28).padding(.vertical, 24)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        } else {
            conteudo.jurisMargemPagina(28)
        }
    }

    @ViewBuilder private var conteudo: some View {
        if let e = verbete { cartao(e) }
        else { Text("Acervo ainda carregando.").foregroundStyle(Palette.secondaryInk) }
    }

    private func cartao(_ e: JurisEntry) -> some View {
        let cor = RamoStyle.color(e.ramoDireito)
        return VStack(alignment: .leading, spacing: 12) {
            Flow {
                FonteBadge(fonte: e.fonteKind)
                if let r = e.ramoDireito { EtiquetaEstudo(texto: r, cor: cor) }
                if e.importante { EtiquetaEstudo(texto: "Destaque", cor: Palette.importante) }
            }
            Text(e.titulo).font(Typo.ui(21, .heavy)).tracking(-0.3).foregroundStyle(Palette.titleInk)
            Text(e.enunciado).font(Typo.ui(15)).lineSpacing(4).foregroundStyle(Palette.titleInk)
                .textSelection(.enabled)
            if let fp = e.fontePublicacao { Text(fp).font(Typo.ui(11.5)).foregroundStyle(Palette.secondaryInk) }
            JurisFileira(espacamento: 9) {
                Button("Abrir no leitor") { store.lerCheio(e.id) }.buttonStyle(.borderedProminent).tint(Palette.accent)
                Button(mostrarOral ? "Fechar prova oral" : "Modo prova oral") { mostrarOral.toggle() }.buttonStyle(.bordered).tint(Palette.accent)
                Button(store.dominados.contains(e.id) ? "✓ Dominado" : "Marcar como dominado") {
                    if store.dominados.contains(e.id) { store.dominados.remove(e.id) } else { store.dominados.insert(e.id) }
                }.buttonStyle(.bordered).tint(Palette.accent)
            }
            if mostrarOral { ProvaOralView(entry: e) }
        }
        .padding(22)
        .background(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).fill(Palette.cardBackground))
        .overlay(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).strokeBorder(Palette.hairline))
    }
}

// MARK: - 3. Prova oral dentro do verbete (bloco para o EntryDetailView)

/// O que sobra abaixo das anotações no modo Estudar: o botão da prova oral. O roteiro de
/// estudo, o quadro comparativo e o quiz saíram (decisão da dona, 03/10/2026) — no verbete
/// fica o texto oficial e o que a pessoa mesma escreve.
struct ProvaOralDoVerbete: View {
    let entry: JurisEntry
    @State private var mostrarOral = false

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Divider().padding(.vertical, 4)
            Button(mostrarOral ? "Fechar prova oral" : "Modo prova oral") { mostrarOral.toggle() }
                .buttonStyle(.bordered).tint(Palette.accent)
                .frame(minHeight: 44)
            if mostrarOral { ProvaOralView(entry: entry) }
        }
        .onChange(of: entry.id) { _, _ in mostrarOral = false }
    }
}

// MARK: - 4. Prova oral

// Prova oral SEM IA: pergunta e correção geradas na hora, no aparelho, pela própria
// plataforma (ProvaOralLocal). Antes cada pergunta e cada correção eram uma chamada
// paga à API da Anthropic — dependente de rede e de custo por uso; agora não depende
// de nada além do acervo que já está no bundle.
struct ProvaOralView: View {
    let entry: JurisEntry
    @State private var pergunta: String = ""
    @State private var resposta = ""
    @State private var correcao: Correcao?
    @State private var variante = 0

    struct Correcao: Codable { var nota: String?; var acertou: [String]?; var faltou: [String]?; var modelo: String? }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            RotuloEstudo(texto: "Prova oral")
            Text(pergunta).font(Typo.ui(15.5, .semibold)).lineSpacing(3).foregroundStyle(Palette.titleInk)
            // A resposta digitada é RASCUNHO por verbete (JurisRascunhoCache): navegar
            // ⌘→ para o próximo verbete ou trocar de aba e voltar não apaga o que foi escrito.
            TextEditor(text: $resposta)
                .font(Typo.ui(14)).frame(minHeight: 110)
                .padding(8)
                .background(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous).fill(Palette.cardBackground))
                .overlay(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous).strokeBorder(Palette.hairline))
                .onChange(of: resposta) { _, novo in JurisRascunhoCache.set("oral", entry.id, novo) }
            HStack(spacing: 9) {
                Button("Corrigir") { correcao = ProvaOralLocal.corrigir(entry, resposta: resposta) }
                    .buttonStyle(.borderedProminent).tint(Palette.accent)
                    .disabled(resposta.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                Button("Outra pergunta") { perguntar() }.buttonStyle(.bordered)
            }
            if let c = correcao { resultado(c) }
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous).fill(Palette.accent.opacity(0.06)))
        .onAppear {
            if pergunta.isEmpty { perguntar(limparResposta: false) }
            resposta = JurisRascunhoCache.get("oral", entry.id) ?? ""
        }
    }

    private func perguntar(limparResposta: Bool = true) {
        pergunta = ProvaOralLocal.pergunta(entry, variante: variante)
        variante += 1
        correcao = nil
        if limparResposta { resposta = ""; JurisRascunhoCache.set("oral", entry.id, nil) }
    }

    @ViewBuilder private func resultado(_ c: Correcao) -> some View {
        let nota = c.nota ?? ""
        let cor = nota == "boa" ? Palette.ok : nota == "media" ? Palette.warn : Palette.bad
        HStack { EtiquetaEstudo(texto: nota == "boa" ? "Boa" : nota == "media" ? "Mediana" : "Fraca", cor: cor); Spacer() }
        if let a = c.acertou, !a.isEmpty {
            BlocoEstudo(rotulo: "Acertou", cor: Palette.ok) {
                VStack(alignment: .leading, spacing: 4) { ForEach(a, id: \.self) { Text("• " + $0) } }
            }
        }
        if let f = c.faltou, !f.isEmpty {
            BlocoEstudo(rotulo: "Faltou / saiu errado", cor: Palette.bad) {
                VStack(alignment: .leading, spacing: 4) { ForEach(f, id: \.self) { Text("• " + $0) } }
            }
        }
        if let m = c.modelo, !m.isEmpty { BlocoEstudo(rotulo: "O que a banca esperaria", cor: Palette.secondaryInk) { Text(m) } }
    }
}

// MARK: - 5. Página inicial de estudo (julgado do dia + informativos em destaque)

/// Entra na frente da HomeView quando a aba abre: o julgado do dia e as edições de
/// informativo mais recentes em destaque, como pedido.
struct DestaquesEstudoView: View {
    enum Parte { case tudo, julgado, informativos }
    var parte: Parte = .tudo
    @Environment(LibraryStore.self) private var store
    @Environment(\.ehCompacto) private var ehCompacto
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if parte != .informativos {
            JulgadoDoDiaView()
            }
            if parte != .julgado {
            JurisSecaoTitulo(titulo: "Últimos informativos", simbolo: "newspaper",
                             verTodos: { store.ir(.gradeInformativos) })
            .jurisMargemPagina(28)
            // iPhone: três cartões com "nº 1234" a 24 pt não cabem lado a lado — grade.
            JurisGradeOuFileira(compacto: ehCompacto, minimo: 150, espacamento: 10) {
                ForEach([Fonte.informativoSTF, .informativoSTJ, .informativoTSE]) { f in
                    if let e = store.edicoesInfo(f).first {
                        Button { store.ir(.infoEdicao(f, e.numero)) } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                EtiquetaEstudo(texto: f.nomeCurto, cor: f.cor)
                                Text("nº \(e.numero)").font(Typo.num(24, .heavy)).foregroundStyle(Palette.titleInk)
                                Text("\(e.count) verbetes").font(Typo.ui(11.5)).foregroundStyle(Palette.secondaryInk)
                            }
                            .padding(14).frame(maxWidth: .infinity, alignment: .leading)
                            .background(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).fill(Palette.cardBackground))
                            .overlay(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).strokeBorder(Palette.hairline))
                        }.buttonStyle(.plain)
                    }
                }
            }
            .jurisMargemPagina(28)
            }
        }
    }
}


// MARK: - 6. Prova oral como página (entrada da barra lateral)

/// A prova oral é sobre UM verbete. Esta página escolhe qual: o julgado do dia por
/// padrão, ou qualquer outro pela busca — e embute a mesma ProvaOralView do leitor.
struct ProvaOralJurisView: View {
    @Environment(LibraryStore.self) private var store
    @State private var busca = ""
    @State private var escolhido: JurisEntry?
    @State private var disciplina: String? = nil
    @State private var tribunal: String? = nil
    @State private var assunto: String? = nil

    /// Universo filtrado (disciplina / tribunal / assunto) de onde se sorteia.
    private var universo: [JurisEntry] {
        store.entries.filter { e in
            (disciplina == nil || e.disciplina == disciplina!) &&
            (tribunal == nil || e.tribunal == tribunal!) &&
            (assunto == nil || e.tema == assunto!)
        }
    }
    private var tribunais: [String] {
        var c: [String: Int] = [:]; for e in store.entries { c[e.tribunal, default: 0] += 1 }
        return c.sorted { $0.value > $1.value }.map(\.key).prefix(8).map { $0 }
    }
    private func sortear() {
        let base = universo.filter { Exporter.afirmacaoFalsaAuto($0.enunciado) != nil || $0.enunciado.count > 80 }
        escolhido = (base.isEmpty ? universo : base).randomElement()
        busca = ""
    }

    private var candidatos: [JurisEntry] {
        let q = busca.trimmingCharacters(in: .whitespaces).lowercased()
        guard q.count >= 3 else { return [] }
        return Array(store.entries.lazy.filter {
            $0.titulo.lowercased().contains(q) || $0.enunciado.lowercased().contains(q)
        }.prefix(30))
    }

    var body: some View {
        SectionShell(icon: Selecao.provaOral.simbolo, title: Selecao.provaOral.titulo,
                     subtitle: "Escolha a disciplina e o tribunal, sorteie um verbete do acervo e responda como responderia à banca. Pergunta no formato da arguição real e correção contra o enunciado oficial — tudo local, sem IA.",
                     search: $busca, searchPrompt: "Buscar um verbete (ou use o julgado do dia)") {
            ScrollView { corpo }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private var corpo: some View {
        let discs = store.disciplinasEm(store.entries).map(\.nome)
        let assuntos: [String] = disciplina == nil ? [] :
            store.assuntosEm(store.entries.filter { $0.disciplina == disciplina! && (tribunal == nil || $0.tribunal == tribunal!) }).map(\.nome)
        return VStack(alignment: .leading, spacing: 16) {
                // Filtros — o edital por dentro: disciplina, tribunal, assunto. Sem
                // prefix() escondendo disciplinas: o chip "mais N…" abre o resto.
                VStack(alignment: .leading, spacing: 8) {
                    RotuloEstudo(texto: "Disciplina")
                    Flow {
                        JurisChip(texto: "Todas", ativo: disciplina == nil) { disciplina = nil; assunto = nil }
                        JurisChipsLimitados(itens: discs, limite: 14, rotulo: { $0 }, ativo: { disciplina == $0 }) { disciplina = $0; assunto = nil }
                    }
                    RotuloEstudo(texto: "Tribunal")
                    Flow {
                        JurisChip(texto: "Todos", ativo: tribunal == nil) { tribunal = nil }
                        ForEach(tribunais, id: \.self) { t in JurisChip(texto: t, ativo: tribunal == t) { tribunal = t } }
                    }
                    if disciplina != nil {
                        RotuloEstudo(texto: "Assunto")
                        Flow {
                            JurisChip(texto: "Todos", ativo: assunto == nil) { assunto = nil }
                            JurisChipsLimitados(itens: assuntos, limite: 16, rotulo: { $0 }, ativo: { assunto == $0 }) { assunto = $0 }
                        }
                    }
                    HStack(spacing: 10) {
                        Button { sortear() } label: { Label("Sortear pergunta (\(universo.count) verbetes)", systemImage: "dice") }
                            .buttonStyle(.borderedProminent).tint(Palette.accent).disabled(universo.isEmpty)
                        if escolhido != nil { Button("Voltar ao julgado do dia") { escolhido = nil }.buttonStyle(.bordered) }
                    }
                }
                if !candidatos.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        ForEach(candidatos) { e in
                            CartaoJuris(entry: e, estilo: .row, acao: { escolhido = e; busca = "" })
                        }
                    }
                }
                let alvo = escolhido ?? store.verbeteDoDia
                if let e = alvo {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Flow {
                                EtiquetaEstudo(texto: e.tribunal, cor: e.fonteKind.cor)
                                EtiquetaEstudo(texto: e.fonteKind.nomeCurto, cor: e.fonteKind.cor)
                                if escolhido == nil { EtiquetaEstudo(texto: "Julgado do dia", cor: Palette.importante) }
                            }
                            Spacer()
                            Button("Abrir no leitor") { store.lerCheio(e.id) }.buttonStyle(.plain).foregroundStyle(Palette.accent)
                        }
                        Text(e.titulo).font(Typo.ui(19, .heavy)).foregroundStyle(Palette.titleInk)
                        Text(e.enunciado).font(Typo.ui(14)).lineSpacing(3).foregroundStyle(Palette.titleInk)
                        ProvaOralView(entry: e).id(e.id)
                    }
                    .padding(20)
                    .background(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).fill(Palette.cardBackground))
                    .overlay(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).strokeBorder(Palette.hairline))
                }
            }
            .jurisMargemPagina(28).padding(.vertical, 24)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Prova oral LOCAL — sem IA, sem custo, sem depender de internet nem de chave.
// Reaproveita o gerador de lacuna que o baralho de revisão espaçada já tinha
// (Exporter.melhorLacuna / JurisFlashcards) para montar a pergunta, e corrige por
// cobertura de termos-chave contra o próprio enunciado oficial — determinístico,
// roda inteiro no aparelho.
@MainActor
enum ProvaOralLocal {
    // Palavras curtas ou conectivas não contam como "termo-chave": senão qualquer
    // resposta que use "do", "da", "não" batia com tudo.
    private static let stop: Set<String> = ["de","do","da","dos","das","e","em","a","o","os","as",
        "no","na","nos","nas","ao","à","com","por","para","que","não","um","uma","the","art","artigo",
        "lei","sobre","entre","ser","é","se","direito","seu","sua","seus","suas","ou","mais","the"]

    private static func normaliza(_ s: String) -> String {
        s.folding(options: .diacriticInsensitive, locale: Locale(identifier: "pt_BR")).lowercased()
    }
    private static func termosChave(_ texto: String, max: Int = 14) -> [String] {
        let brutos = texto.split(whereSeparator: { !$0.isLetter && !$0.isNumber })
            .map { normaliza(String($0)) }
            .filter { $0.count >= 5 && !stop.contains($0) }
        var vistos = Set<String>(), saida: [String] = []
        for t in brutos where !vistos.contains(t) { vistos.insert(t); saida.append(t) }
        return Array(saida.prefix(max))
    }

    /// Pergunta de arguição sobre um VERBETE — sem IA, no tom de banca. `variante` roda os
    /// formatos que as bancas realmente usam na oral (0, 1, 2… — "Outra pergunta" avança):
    ///   0 caso hipotético: o examinador apresenta a TESE INVERTIDA como argumento da parte
    ///     e pergunta se procede — é a pergunta mais comum de arguição, e a inversão é a
    ///     mesma que o baralho já usa (só troca o núcleo: prazo, competência, operador);
    ///   1 fundamento: "qual o fundamento normativo e a ratio";
    ///   2 lacuna: complete e explique;
    ///   3 aplicação: esse entendimento alcança o tema X? há exceção?;
    ///   4 abertura: explique o entendimento.
    /// Nada é inventado: todo conteúdo vem do enunciado oficial; a "história" é o molde.
    static func pergunta(_ e: JurisEntry, variante: Int = 0) -> String {
        let frase = TextoVerbete.sentencas(TextoVerbete.limpar(e.enunciado)).first ?? TextoVerbete.limpar(e.enunciado)
        let falsa = Exporter.afirmacaoFalsaAuto(e.enunciado)
        let fund = TextoVerbete.fundamentos(e.enunciado + " " + (e.referencias ?? ""))
        let lacuna = JurisFlashcards.direta(e)
        var formatos: [String] = []
        if let f = falsa {
            var g = Gerador(e.id)
            let papel = ["a defesa, em sustentação oral,", "o recorrente", "a parte autora, na inicial,", "o Ministério Público, em parecer,", "o magistrado de primeiro grau"].randomElement(using: &g)!
            formatos.append("Candidato(a), um caso chega ao seu gabinete. \(papel.prefix(1).uppercased() + papel.dropFirst()) sustenta que \(f.prefix(1).lowercased() + f.dropFirst()) A tese procede? Decida e fundamente, indicando a posição do \(e.tribunal).")
        }
        if !fund.isEmpty {
            formatos.append("Qual é o fundamento normativo do entendimento \"\(e.titulo)\" e qual a razão de decidir? (Espera-se, entre outros: \(fund.prefix(2).joined(separator: ", ")).)")
        }
        if let d = lacuna, let termo = d.answer, !termo.isEmpty {
            formatos.append("Complete e explique: \(d.prompt.replacingOccurrences(of: "Complete a tese:\n\n", with: ""))\n\n(A banca quer ouvir o raciocínio inteiro, não só a palavra que falta.)")
        }
        if let t = e.tema, !t.isEmpty {
            formatos.append("Em matéria de \(t.lowercased()): esse entendimento do \(e.tribunal) — \"\(frase)\" — comporta exceção? Em que hipóteses ele não se aplica?")
        }
        formatos.append("Explique o entendimento fixado em \"\(e.titulo)\" — o que ele decide, por quê, e como o(a) senhor(a) o aplicaria em um caso concreto.")
        return formatos[((variante % formatos.count) + formatos.count) % formatos.count]
    }

    /// Gerador determinístico por id — a mesma pergunta para o mesmo verbete, sempre.
    private struct Gerador: RandomNumberGenerator {
        var estado: UInt64
        init(_ semente: String) { estado = semente.unicodeScalars.reduce(1469598103934665603) { ($0 ^ UInt64($1.value)) &* 1099511628211 } }
        mutating func next() -> UInt64 { estado = estado &* 6364136223846793005 &+ 1442695040888963407; return estado }
    }

    /// Corrige contra o ENUNCIADO OFICIAL do verbete, por cobertura de termos-chave, e
    /// AUDITA OS FUNDAMENTOS: todo artigo, súmula ou tema que a resposta cita é conferido
    /// contra os que o verbete (enunciado + referências) cita. Numero decorado errado é o
    /// erro mais comum de arguição — aqui ele aparece como "o verbete não menciona".
    static func corrigir(_ e: JurisEntry, resposta: String) -> ProvaOralView.Correcao {
        var c = corrigirContra(base: e.enunciado, resposta: resposta)
        let doVerbete = TextoVerbete.fundamentos(e.enunciado + " " + (e.referencias ?? "") + " " + (e.precedentes ?? ""))
        let daResposta = TextoVerbete.fundamentos(resposta)
        guard !daResposta.isEmpty else { return c }
        func chave(_ f: String) -> String { normaliza(f).replacingOccurrences(of: "[^a-z0-9]", with: "", options: .regularExpression) }
        let setV = Set(doVerbete.map(chave))
        let confirmados = daResposta.filter { r in
            let kr = chave(r)
            return setV.contains(kr) || doVerbete.contains { v in let kv = chave(v); return kv.hasPrefix(kr) || kr.hasPrefix(kv) }
        }
        let estranhos = daResposta.filter { !confirmados.contains($0) }
        if !confirmados.isEmpty { c.acertou = (c.acertou ?? []) + ["Fundamento confirmado no verbete: " + confirmados.joined(separator: "; ")] }
        if !estranhos.isEmpty { c.faltou = (c.faltou ?? []) + ["Fundamento citado que o verbete NÃO menciona — confira antes de levar para a banca: " + estranhos.joined(separator: "; ")] }
        if !doVerbete.isEmpty, confirmados.isEmpty { c.faltou = (c.faltou ?? []) + ["O verbete se apoia em: " + doVerbete.prefix(3).joined(separator: "; ") + " — e a resposta não citou."] }
        return c
    }

    /// Mesma correção, genérica — usada também pelo LEGIS (contra o trecho da lei).
    static func corrigirContra(base texto: String, resposta: String) -> ProvaOralView.Correcao {
        let chave = termosChave(texto)
        let respN = normaliza(resposta)
        let acertou = chave.filter { respN.contains($0) }
        let faltou = chave.filter { !respN.contains($0) }
        let cobertura = chave.isEmpty ? 0 : Double(acertou.count) / Double(chave.count)
        let nota = cobertura >= 0.6 ? "boa" : (cobertura >= 0.3 ? "media" : "fraca")
        return ProvaOralView.Correcao(
            nota: nota,
            acertou: acertou.isEmpty ? nil : ["Mencionou: " + acertou.prefix(6).joined(separator: ", ")],
            faltou: faltou.isEmpty ? nil : ["Não apareceu na resposta: " + faltou.prefix(6).joined(separator: ", ")],
            modelo: texto
        )
    }
}
