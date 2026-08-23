import SwiftUI
#if canImport(UIKit)
import UIKit
#else
import AppKit
#endif

/// PROVA ORAL — BANCAS REAIS.
///
/// O treino livre (ProvaOralJurisView) pergunta sobre o acervo. Esta tela traz a prova oral
/// como ela é: o concurso, os pontos que a banca sorteia, as perguntas que ela formulou, o
/// padrão de resposta que ela publicou e os critérios pelos quais ela pontua — 562
/// documentos oficiais de 101 concursos (2009–2026), cada um com link para o arquivo da
/// banca. O app guarda o CATÁLOGO; o texto fica na fonte, que é o que o torna conferível.
///
/// Sessão de arguição: sorteia o ponto como a banca sorteia, roda o cronômetro do tempo
/// regulamentar, guarda o que a pessoa respondeu e abre o padrão de resposta para o
/// confronto. A correção fina é dela contra o padrão — aqui o app não finge saber a nota.
struct ConcursoOral: Codable, Identifiable, Hashable {
    struct Material: Codable, Hashable, Identifiable {
        var id: String { url.isEmpty ? titulo : url }
        var tipo: String
        var rotulo: String
        var titulo: String
        var url: String
        var obs: String
    }
    var id: String
    var orgao: String
    var ano: Int?
    var cargo: String
    var banca: String
    var area: String
    var subarea: String
    var concurso: String
    var urlConcurso: String
    var materiais: [Material]
    var tem: [String]
    var ouro: Bool

    var titulo: String { [orgao, ano.map(String.init)].compactMap { $0 }.joined(separator: " · ") }
    func materiais(_ tipo: String) -> [Material] { materiais.filter { $0.tipo == tipo } }
}

@MainActor
enum OralBancas {
    /// Estado do acervo: a tela precisa saber a diferenca entre "ainda nao tentei",
    /// "tentei e nao achei" e "achei e esta vazio". Antes existia so um array vazio, que
    /// confundia os tres — e `carregou` era marcado ANTES de tentar ler, entao uma falha
    /// era definitiva: nao havia como tentar de novo.
    enum Estado: Equatable { case naoCarregado, carregando, pronto, indisponivel }
    private(set) static var concursos: [ConcursoOral] = []
    private(set) static var estado: Estado = .naoCarregado

    static func carregar(forcar: Bool = false) {
        if !forcar, estado == .pronto || estado == .carregando { return }
        estado = .carregando
        let candidatos: [URL?] = [
            Bundle.main.url(forResource: "oral", withExtension: "json"),
            Bundle.main.bundleURL.appendingPathComponent("oral.json"),
            Bundle.main.bundleURL.appendingPathComponent("Contents/Resources/oral.json"),
        ]
        for c in candidatos {
            guard let u = c, let d = try? Data(contentsOf: u),
                  let l = try? JSONDecoder().decode([ConcursoOral].self, from: d) else { continue }
            concursos = l
            estado = .pronto
            return
        }
        // O nome do arquivo e problema de quem compila, nao de quem estuda: fica no log.
        print("[CatedraJURIS] acervo de provas orais indisponivel: oral.json ausente ou ilegivel no bundle")
        concursos = []
        estado = .indisponivel
    }
    static var carreiras: [String] { Array(Set(concursos.map(\.subarea).filter { !$0.isEmpty })).sorted() }
    static var bancas: [String] { Array(Set(concursos.map(\.banca).filter { !$0.isEmpty })).sorted() }

    /// Critérios da oral da magistratura — Resolução CNJ 75/2009, arts. 63 a 66. É norma
    /// pública e é o que a banca segue: ponto sorteado, sessão pública, arguição por
    /// sorteio, média aritmética das notas dos examinadores.
    static let criteriosCNJ: [(String, String)] = [
        ("Ponto sorteado", "O programa específico sai até 5 dias antes; o ponto é sorteado na hora, e a arguição segue a ordem sorteada (art. 65)."),
        ("Sessão pública", "A prova é pública e é vedado o exame simultâneo de mais de um candidato (art. 64)."),
        ("O que se avalia", "Domínio do conhecimento jurídico, adequação da linguagem, articulação do raciocínio, capacidade de argumentação e uso correto do vernáculo."),
        ("Nota", "Cada examinador atribui a sua nota; a nota da prova é a média aritmética, lançada em envelope lacrado (art. 65)."),
    ]
}

struct OralBancasView: View {
    @Environment(LibraryStore.self) private var store
    // FILTROS persistem (AppStorage): trocar de aba e voltar não zera carreira/banca/ouro.
    // "" = sem filtro (AppStorage não guarda Optional<String>).
    @AppStorage("juris.oral.carreira") private var carreiraRaw = ""
    @AppStorage("juris.oral.banca") private var bancaRaw = ""
    @AppStorage("juris.oral.soOuro") private var soOuro = true
    @AppStorage("juris.oral.minutos") private var minutos = 15
    @AppStorage("juris.oral.selecionado") private var selID = ""
    @State private var busca = ""
    // sessão de arguição
    @State private var emSessao = false
    @State private var inicio: Date? = nil
    @State private var agora = Date()
    // As anotações da arguição são RASCUNHO por concurso (JurisRascunhoCache): conferir
    // uma súmula em "Todos os verbetes" e voltar não apaga dez minutos de resposta.
    @State private var anotacoes = ""
    private let relogio = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    private var carreira: String? { get { carreiraRaw.isEmpty ? nil : carreiraRaw } nonmutating set { carreiraRaw = newValue ?? "" } }
    private var banca: String? { get { bancaRaw.isEmpty ? nil : bancaRaw } nonmutating set { bancaRaw = newValue ?? "" } }
    private var sel: ConcursoOral? { OralBancas.concursos.first { $0.id == selID } }

    private var lista: [ConcursoOral] {
        let q = busca.folding(options: .diacriticInsensitive, locale: nil).lowercased()
        return OralBancas.concursos.filter { c in
            (carreira == nil || c.subarea == carreira!) &&
            (banca == nil || c.banca == banca!) &&
            (!soOuro || c.ouro) &&
            (q.isEmpty || [c.orgao, c.cargo, c.banca, c.concurso, c.subarea].joined(separator: " ")
                .folding(options: .diacriticInsensitive, locale: nil).lowercased().contains(q))
        }
    }
    private var restante: Int {
        guard let i = inicio else { return minutos * 60 }
        return max(0, minutos * 60 - Int(agora.timeIntervalSince(i)))
    }
    private func hms(_ s: Int) -> String { String(format: "%02d:%02d", s / 60, s % 60) }

    var body: some View {
        Group {
            if let c = sel {
                VStack(spacing: 0) {
                    HubBackBar(rotulo: "Todos os concursos") { selID = ""; emSessao = false; inicio = nil }
                    SectionShell(icon: Selecao.oralBancas.simbolo, title: c.titulo,
                                 subtitle: c.concurso.isEmpty ? c.cargo : c.concurso,
                                 trailing: AnyView(botaoSessao)) {
                        ScrollView {
                            detalhe(c)
                                .padding(.horizontal, 28).padding(.vertical, 24)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                }
            } else {
                SectionShell(icon: Selecao.oralBancas.simbolo, title: Selecao.oralBancas.titulo,
                             subtitle: "O que a banca publicou sobre a oral de cada concurso: os pontos que sorteia, as perguntas que formulou, o padrão de resposta e os critérios. \(OralBancas.concursos.count) concursos, \(OralBancas.concursos.reduce(0) { $0 + $1.materiais.count }) documentos oficiais.",
                             count: lista.count,
                             search: $busca, searchPrompt: "Buscar órgão, cargo, concurso…") {
                    ScrollView {
                        catalogo
                            .padding(.horizontal, 28).padding(.vertical, 24)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
        }
        .onAppear {
            OralBancas.carregar()
            if !selID.isEmpty { anotacoes = JurisRascunhoCache.get("oral-banca", selID) ?? "" }
        }
        .onReceive(relogio) { agora = $0 }
    }

    private var botaoSessao: some View {
        Button { emSessao.toggle(); if emSessao { inicio = Date(); agora = Date() } } label: {
            Label(emSessao ? "Encerrar sessão" : "Iniciar arguição", systemImage: emSessao ? "stop.fill" : "mic.fill")
        }.buttonStyle(.borderedProminent).tint(Palette.accent)
    }

    // MARK: catálogo
    private var catalogo: some View {
        VStack(alignment: .leading, spacing: 14) {
            switch OralBancas.estado {
            case .carregando, .naoCarregado:
                HStack(spacing: 8) {
                    ProgressView().controlSize(.small)
                    Text("Abrindo o acervo de provas orais…").font(.system(size: 13)).foregroundStyle(Palette.secondaryInk)
                }
            case .indisponivel:
                // Estado humano, com saída: o nome do arquivo foi para o log, não para cá.
                VStack(alignment: .leading, spacing: 8) {
                    Text("O acervo de provas orais não veio nesta versão do app.")
                        .font(.system(size: 14, weight: .semibold))
                    Text("Os pontos sorteáveis, as perguntas das bancas e os padrões de resposta ficam nesta tela. Enquanto isso, o mesmo material está no Cátedra na web.")
                        .font(.system(size: 13)).foregroundStyle(Palette.secondaryInk)
                        .fixedSize(horizontal: false, vertical: true)
                    Button("Tentar de novo") { OralBancas.carregar(forcar: true) }
                        .buttonStyle(.bordered)
                }
                .padding(.vertical, 4)
            case .pronto where OralBancas.concursos.isEmpty:
                Text("Nenhum concurso no acervo desta versão.")
                    .font(.system(size: 13)).foregroundStyle(Palette.secondaryInk)
            case .pronto:
                EmptyView()
            }
            RotuloEstudo(texto: "Carreira")
            Flow {
                JurisChip(texto: "Todas", ativo: carreira == nil) { carreira = nil }
                ForEach(OralBancas.carreiras, id: \.self) { c in JurisChip(texto: c, ativo: carreira == c) { carreira = c } }
            }
            RotuloEstudo(texto: "Banca")
            Flow {
                JurisChip(texto: "Todas", ativo: banca == nil) { banca = nil }
                ForEach(OralBancas.bancas, id: \.self) { b in JurisChip(texto: b, ativo: banca == b) { banca = b } }
                JurisChip(texto: "Só com padrão de resposta", simbolo: soOuro ? "checkmark" : nil, ativo: soOuro) { soOuro.toggle() }
            }
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 280), spacing: 12)], spacing: 12) {
                ForEach(lista) { c in
                    Button {
                        selID = c.id; emSessao = false; inicio = nil
                        anotacoes = JurisRascunhoCache.get("oral-banca", c.id) ?? ""
                    } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            Flow {
                                EtiquetaEstudo(texto: c.subarea.isEmpty ? c.area : c.subarea, cor: Palette.accent)
                                if !c.banca.isEmpty { EtiquetaEstudo(texto: c.banca, cor: Palette.secondaryInk) }
                                if c.ouro { EtiquetaEstudo(texto: "padrão de resposta", cor: Palette.importante) }
                            }
                            Text(c.titulo).font(.system(size: 16, weight: .heavy)).foregroundStyle(Palette.titleInk)
                            Text(c.cargo).font(.system(size: 12.5)).foregroundStyle(Palette.secondaryInk).lineLimit(2)
                            Text("\(c.materiais.count) documento(s): " + c.tem.compactMap { rotuloCurto($0) }.joined(separator: ", "))
                                .font(.system(size: 11.5)).foregroundStyle(Palette.secondaryInk).lineLimit(2)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading).padding(14)
                        .background(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).fill(Palette.cardBackground))
                        .overlay(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).strokeBorder(c.ouro ? Palette.accent.opacity(0.4) : Palette.hairline))
                    }.buttonStyle(.plain)
                }
            }
        }
    }
    private func rotuloCurto(_ t: String) -> String? {
        switch t {
        case "padrao_resposta_oral": return "padrão de resposta"
        case "questoes_formuladas": return "perguntas"
        case "relacao_de_pontos": return "pontos"
        case "regulamento_criterios": return "critérios"
        case "edital_convocacao_oral": return "edital"
        case "ata_resultado": return "ata"
        case "gravacao": return "gravação"
        default: return nil
        }
    }

    // MARK: detalhe do concurso
    private func detalhe(_ c: ConcursoOral) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Flow {
                EtiquetaEstudo(texto: c.cargo, cor: Palette.accent)
                if !c.banca.isEmpty { EtiquetaEstudo(texto: "banca " + c.banca, cor: Palette.secondaryInk) }
                if !c.subarea.isEmpty { EtiquetaEstudo(texto: c.subarea, cor: Palette.secondaryInk) }
            }
            if emSessao { sessao(c) }
            // materiais agrupados pelo rótulo, na ordem de valor para o treino
            ForEach(["padrao_resposta_oral", "questoes_formuladas", "relacao_de_pontos", "regulamento_criterios", "edital_convocacao_oral", "ata_resultado", "gravacao"], id: \.self) { tipo in
                let ms = c.materiais(tipo)
                if !ms.isEmpty {
                    BlocoEstudo(rotulo: ms[0].rotulo, cor: tipo == "padrao_resposta_oral" ? Palette.importante : Palette.accent) {
                        VStack(alignment: .leading, spacing: 8) {
                            ForEach(ms) { m in
                                Button { abrir(m.url) } label: {
                                    VStack(alignment: .leading, spacing: 2) {
                                        HStack(alignment: .top, spacing: 6) {
                                            Image(systemName: "doc.text").font(.system(size: 11)).foregroundStyle(Palette.accent)
                                            Text(m.titulo.isEmpty ? m.url : m.titulo).font(.system(size: 13, weight: .semibold)).foregroundStyle(Palette.titleInk)
                                                .multilineTextAlignment(.leading)
                                            Spacer(minLength: 0)
                                            Image(systemName: "arrow.up.right").font(.system(size: 10)).foregroundStyle(Palette.secondaryInk)
                                        }
                                        if !m.obs.isEmpty {
                                            Text(m.obs).font(.system(size: 11)).foregroundStyle(Palette.secondaryInk).lineLimit(3)
                                        }
                                    }
                                    .contentShape(Rectangle())
                                }.buttonStyle(.plain)
                            }
                        }
                    }
                }
            }
            if !c.urlConcurso.isEmpty {
                Button { abrir(c.urlConcurso) } label: { Label("Página oficial do concurso", systemImage: "safari") }
                    .buttonStyle(.bordered)
            }
        }
    }

    // MARK: sessão de arguição
    @ViewBuilder private func sessao(_ c: ConcursoOral) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text("Arguição em curso").font(.system(size: 15, weight: .heavy)).foregroundStyle(Palette.titleInk)
                Spacer()
                Text(hms(restante)).font(Typo.num(30, .heavy))
                    .foregroundStyle(restante < 120 ? Palette.bad : Palette.titleInk)
                Stepper("\(minutos) min", value: $minutos, in: 5...60, step: 5).labelsHidden()
                    .disabled(inicio != nil)
            }
            Text("Abra os pontos sorteáveis abaixo, escolha um ao acaso e responda em voz alta como responderia à banca. Ao final, abra o padrão de resposta e confronte — item a item, sem piedade.")
                .font(.system(size: 12.5)).foregroundStyle(Palette.secondaryInk)
            VStack(alignment: .leading, spacing: 6) {
                RotuloEstudo(texto: "Como esta prova é avaliada")
                ForEach(OralBancas.criteriosCNJ, id: \.0) { t, d in
                    HStack(alignment: .top, spacing: 6) {
                        Text("•").font(.system(size: 12, weight: .bold)).foregroundStyle(Palette.accent)
                        (Text(t + " — ").font(.system(size: 12, weight: .bold)) + Text(d).font(.system(size: 12)))
                            .foregroundStyle(Palette.titleInk)
                    }
                }
                Text("Resolução CNJ 75/2009, arts. 63 a 66 — vale para a magistratura; nas demais carreiras, confira o regulamento do próprio edital, listado acima quando publicado.")
                    .font(.system(size: 10.5)).foregroundStyle(Palette.secondaryInk)
            }
            .padding(12)
            .background(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous).fill(Palette.accent.opacity(0.07)))
            RotuloEstudo(texto: "Suas anotações da arguição")
            TextEditor(text: $anotacoes).font(.system(size: 14)).frame(minHeight: 130)
                .padding(8)
                .background(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous).fill(Palette.cardBackground))
                .overlay(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous).strokeBorder(Palette.hairline))
                .onChange(of: anotacoes) { _, novo in JurisRascunhoCache.set("oral-banca", c.id, novo) }
            if !anotacoes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                let fund = RoteiroLocal.fundamentos(anotacoes)
                Text(fund.isEmpty
                     ? "Você não citou nenhum artigo, súmula ou tema. Na oral, o fundamento é o que sustenta a resposta."
                     : "Fundamentos que você citou: " + fund.joined(separator: "; "))
                    .font(.system(size: 12)).foregroundStyle(fund.isEmpty ? Palette.warn : Palette.secondaryInk)
            }
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).fill(Palette.cardBackground))
        .overlay(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).strokeBorder(Palette.accent.opacity(0.4), lineWidth: 1.5))
    }
    private func abrir(_ s: String) {
        guard let u = URL(string: s) else { return }
        #if canImport(UIKit)
        UIApplication.shared.open(u)
        #else
        NSWorkspace.shared.open(u)
        #endif
    }
}
