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
    private(set) static var concursos: [ConcursoOral] = []
    private static var carregou = false
    static func carregar() {
        guard !carregou else { return }
        carregou = true
        let candidatos: [URL?] = [
            Bundle.main.url(forResource: "oral", withExtension: "json"),
            Bundle.main.bundleURL.appendingPathComponent("oral.json"),
            Bundle.main.bundleURL.appendingPathComponent("Contents/Resources/oral.json"),
        ]
        for c in candidatos {
            guard let u = c, let d = try? Data(contentsOf: u),
                  let l = try? JSONDecoder().decode([ConcursoOral].self, from: d) else { continue }
            concursos = l
            return
        }
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
    @State private var carreira: String? = nil
    @State private var banca: String? = nil
    @State private var soOuro = true
    @State private var busca = ""
    @State private var sel: ConcursoOral?
    // sessão de arguição
    @State private var emSessao = false
    @State private var minutos = 15
    @State private var inicio: Date? = nil
    @State private var agora = Date()
    @State private var anotacoes = ""
    private let relogio = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

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
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let c = sel { detalhe(c) } else { catalogo }
            }
            .padding(.horizontal, 28).padding(.vertical, 24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Palette.appBackground)
        .onAppear { OralBancas.carregar() }
        .onReceive(relogio) { agora = $0 }
    }

    // MARK: catálogo
    private var catalogo: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Prova oral · bancas reais").font(.system(size: 30, weight: .heavy)).tracking(-0.6).foregroundStyle(Palette.titleInk)
            Text("O que a banca publicou sobre a oral de cada concurso: os pontos que ela sorteia, as perguntas que formulou, o padrão de resposta que esperava ouvir e os critérios pelos quais pontua. \(OralBancas.concursos.count) concursos, \(OralBancas.concursos.reduce(0) { $0 + $1.materiais.count }) documentos oficiais.")
                .font(.system(size: 13)).foregroundStyle(Palette.secondaryInk)
            if OralBancas.concursos.isEmpty {
                Text("oral.json não está no bundle deste app.").font(.system(size: 13)).foregroundStyle(Color(hex: "#DC2626"))
            }
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass").foregroundStyle(Palette.secondaryInk)
                TextField("Buscar órgão, cargo, concurso…", text: $busca).textFieldStyle(.plain)
            }
            .padding(.horizontal, 12).padding(.vertical, 9)
            .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Palette.cardBackground))
            .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(Palette.hairline))
            RotuloEstudo(texto: "Carreira")
            Flow {
                chip("Todas", on: carreira == nil) { carreira = nil }
                ForEach(OralBancas.carreiras, id: \.self) { c in chip(c, on: carreira == c) { carreira = c } }
            }
            RotuloEstudo(texto: "Banca")
            Flow {
                chip("Todas", on: banca == nil) { banca = nil }
                ForEach(OralBancas.bancas, id: \.self) { b in chip(b, on: banca == b) { banca = b } }
                chip(soOuro ? "Só com padrão de resposta ✓" : "Só com padrão de resposta", on: soOuro) { soOuro.toggle() }
            }
            Text("\(lista.count) concurso(s)").font(.system(size: 11.5, weight: .heavy)).foregroundStyle(Palette.secondaryInk)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 280), spacing: 12)], spacing: 12) {
                ForEach(lista) { c in
                    Button { sel = c; emSessao = false; inicio = nil; anotacoes = "" } label: {
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
                        .background(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).fill(Palette.cardBackground))
                        .overlay(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).strokeBorder(c.ouro ? Palette.accent.opacity(0.4) : Palette.hairline))
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
            HStack {
                Button { sel = nil } label: { Label("todos os concursos", systemImage: "chevron.left") }.buttonStyle(.bordered)
                Spacer()
                Button { emSessao.toggle(); if emSessao { inicio = Date(); agora = Date() } } label: {
                    Label(emSessao ? "Encerrar sessão" : "Iniciar arguição", systemImage: emSessao ? "stop.fill" : "mic.fill")
                }.buttonStyle(.borderedProminent).tint(Palette.accent)
            }
            Text(c.titulo).font(.system(size: 26, weight: .heavy)).tracking(-0.5).foregroundStyle(Palette.titleInk)
            Flow {
                EtiquetaEstudo(texto: c.cargo, cor: Palette.accent)
                if !c.banca.isEmpty { EtiquetaEstudo(texto: "banca " + c.banca, cor: Palette.secondaryInk) }
                if !c.subarea.isEmpty { EtiquetaEstudo(texto: c.subarea, cor: Palette.secondaryInk) }
            }
            if !c.concurso.isEmpty {
                Text(c.concurso).font(.system(size: 13)).foregroundStyle(Palette.secondaryInk)
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
                Text(hms(restante)).font(.system(size: 30, weight: .heavy, design: .monospaced))
                    .foregroundStyle(restante < 120 ? Color(hex: "#DC2626") : Palette.titleInk)
                Stepper("\(minutos) min", value: $minutos, in: 5...60, step: 5).labelsHidden()
                    .disabled(inicio != nil)
            }
            Text("Abra os pontos sorteáveis abaixo, escolha um ao acaso e responda em voz alta como responderia à banca. Ao final, abra o padrão de resposta e confronte — item a item, sem piedade.")
                .font(.system(size: 12.5)).foregroundStyle(Palette.secondaryInk)
            VStack(alignment: .leading, spacing: 6) {
                Text("Como esta prova é avaliada").font(.system(size: 11, weight: .heavy)).tracking(1).foregroundStyle(Palette.secondaryInk)
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
            .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Palette.accent.opacity(0.07)))
            Text("Suas anotações da arguição").font(.system(size: 11, weight: .heavy)).tracking(1).foregroundStyle(Palette.secondaryInk)
            TextEditor(text: $anotacoes).font(.system(size: 14)).frame(minHeight: 130)
                .padding(8)
                .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Palette.cardBackground))
                .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(Palette.hairline))
            if !anotacoes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                let fund = RoteiroLocal.fundamentos(anotacoes)
                Text(fund.isEmpty
                     ? "Você não citou nenhum artigo, súmula ou tema. Na oral, o fundamento é o que sustenta a resposta."
                     : "Fundamentos que você citou: " + fund.joined(separator: "; "))
                    .font(.system(size: 12)).foregroundStyle(fund.isEmpty ? Color(hex: "#D97706") : Palette.secondaryInk)
            }
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).fill(Palette.cardBackground))
        .overlay(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).strokeBorder(Palette.accent.opacity(0.4), lineWidth: 1.5))
    }

    private func chip(_ t: String, on: Bool, _ act: @escaping () -> Void) -> some View {
        Button(action: act) {
            Text(t).font(.system(size: 12, weight: .semibold))
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(Capsule().fill(on ? Palette.accent : Palette.cardBackground))
                .overlay(Capsule().strokeBorder(on ? Palette.accent : Palette.hairline))
                .foregroundStyle(on ? Color.white : Palette.titleInk)
        }.buttonStyle(.plain)
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
