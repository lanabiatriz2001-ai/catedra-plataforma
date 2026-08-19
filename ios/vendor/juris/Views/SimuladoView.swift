import SwiftUI
import UniformTypeIdentifiers

// =====================================================================================
//  CátedraJURIS — SIMULADO (objetivas Certo/Errado + discursivas), 100% local.
//
//  · Objetivas: sorteadas do ACERVO (JurisEntry). Metade dos itens sai como está
//    (gabarito CERTO) e a outra metade passa por Exporter.afirmacaoFalsaAuto — a mesma
//    inversão de operador de tese que o baralho de flashcards já usa — e vira item
//    ERRADO. O comentário do item é SEMPRE o enunciado oficial do verbete; a referência
//    é "TRIBUNAL · Coleção nº" (ex.: "STJ · Info 875"). Nada é inventado.
//  · Discursivas: sorteadas de discursivas.json (gerado por
//    scripts/build-discursivas-nativo.mjs a partir de discursivas.js). O "padrão de
//    resposta" é o espelho publicado pela banca; sem espelho, a tela diz isso.
//  · Três visões: só enunciados · enunciados + gabarito · relatório completo.
//  · Resultado (respostas, acertos, tempo) fica em Application Support (SimuladoCache),
//    no mesmo molde do RoteiroCache — não sobe para a nuvem.
// =====================================================================================

// MARK: - Modelos

/// Uma discursiva/peça do banco (espelho da web, convertido para JSON).
struct DiscursivaBanco: Codable, Hashable, Identifiable {
    struct Quesito: Codable, Hashable { var quesito: String; var pontos: Double? }
    var id: String
    var tipo: String
    var peca: String
    var banca: String
    var orgao: String
    var cargo: String
    var ano: Int?
    var fase: String
    var disciplina: String
    var tema: String
    var enunciado: String
    var espelho: [Quesito]
    var total: Double?
    var fonte: String

    var rotulo: String {
        var s = "\(banca) · \(orgao)"
        if let a = ano { s += " · \(a)" }
        return s
    }
}

/// Item objetivo Certo/Errado gerado do acervo.
struct SimuladoItem: Codable, Hashable, Identifiable {
    var id: String            // id do verbete + sufixo
    var entryID: String
    var afirmacao: String     // o que o candidato julga
    var gabarito: Bool        // true = CERTO
    var comentario: String    // enunciado oficial (fonte da verdade)
    var referencia: String    // "STJ · Info 875"
    var tribunal: String
    var disciplina: String
}

/// Uma prova inteira + o que a pessoa respondeu.
struct SimuladoProva: Codable, Hashable, Identifiable {
    var id: String
    var criadoEm: Date
    var disciplina: String?               // nil = todas
    var itens: [SimuladoItem]
    var discursivas: [DiscursivaBanco]
    var respostas: [String: Bool] = [:]   // item.id → resposta dada
    var segundos: Int = 0
    var encerrado: Bool = false

    var respondidos: Int { respostas.count }
    var acertos: Int { itens.reduce(0) { $0 + ((respostas[$1.id] == $1.gabarito) ? 1 : 0) } }
    var erros: Int { itens.reduce(0) { $0 + ((respostas[$1.id] != nil && respostas[$1.id] != $1.gabarito) ? 1 : 0) } }
    var emBranco: Int { itens.count - respondidos }
    var percentual: Double { itens.isEmpty ? 0 : Double(acertos) / Double(itens.count) * 100 }
}

// MARK: - Cache (Application Support, como o RoteiroCache)

@MainActor
enum SimuladoCache {
    private static var mem: [SimuladoProva] = []
    private static var carregado = false
    private static var url: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("VadeMecumJuris", isDirectory: true)
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        return base.appendingPathComponent("simulados.json")
    }
    private static func carregar() {
        guard !carregado else { return }
        carregado = true
        if let d = try? Data(contentsOf: url),
           let m = try? JSONDecoder().decode([SimuladoProva].self, from: d) { mem = m }
    }
    static func todos() -> [SimuladoProva] { carregar(); return mem.sorted { $0.criadoEm > $1.criadoEm } }
    static func salvar(_ p: SimuladoProva) {
        carregar()
        if let i = mem.firstIndex(where: { $0.id == p.id }) { mem[i] = p } else { mem.append(p) }
        if mem.count > 60 {   // teto: 60 provas mais recentes
            mem.sort { $0.criadoEm < $1.criadoEm }
            mem.removeFirst(mem.count - 60)
        }
        if let d = try? JSONEncoder().encode(mem) { try? d.write(to: url, options: .atomic) }
    }
    static func apagar(_ id: String) {
        carregar(); mem.removeAll { $0.id == id }
        if let d = try? JSONEncoder().encode(mem) { try? d.write(to: url, options: .atomic) }
    }
}

// MARK: - Motor local (sem IA)

@MainActor
enum SimuladoLocal {
    /// Banco de discursivas embutido no bundle (discursivas.json). Cache em memória.
    private static var bancoMem: [DiscursivaBanco]?
    static func bancoDiscursivas() -> [DiscursivaBanco] {
        if let b = bancoMem { return b }
        var url = Bundle.main.url(forResource: "discursivas", withExtension: "json")
        if url == nil {
            let c = Bundle.main.bundleURL.appendingPathComponent("discursivas.json")
            if FileManager.default.fileExists(atPath: c.path) { url = c }
        }
        var lista: [DiscursivaBanco] = []
        if let u = url, let d = try? Data(contentsOf: u),
           let l = try? JSONDecoder().decode([DiscursivaBanco].self, from: d) { lista = l }
        bancoMem = lista
        return lista
    }

    /// Disciplinas do banco de discursivas (para o filtro casar por prefixo).
    private static func discursivaCasa(_ d: DiscursivaBanco, _ disciplina: String) -> Bool {
        let n = { (s: String) in s.folding(options: .diacriticInsensitive, locale: Locale(identifier: "pt_BR")).lowercased() }
        let chave = n(disciplina).replacingOccurrences(of: "direito ", with: "")
        return n(d.disciplina).contains(chave)
    }

    /// Referência curta no estilo "STJ · Info 875" / "STF · Vinculante 11".
    static func referencia(_ e: JurisEntry) -> String {
        var s = e.tribunal.isEmpty ? e.fonteKind.nomeCurto : e.tribunal
        let col = e.fonteKind.nomeCurto
        if let n = e.numero { s += " · \(col) \(n)" } else if !col.isEmpty { s += " · \(col)" }
        return s
    }

    /// Primeira linha do enunciado — é dela que sai o item.
    private static func base(_ e: JurisEntry) -> String {
        (e.enunciado.split(whereSeparator: { $0 == "\n" }).first.map(String.init) ?? e.enunciado)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Gera uma prova: `n` objetivas C/E (≈ metade erradas, quando a inversão é possível)
    /// e `m` discursivas. `disciplina` nil = acervo inteiro.
    static func gerar(entries: [JurisEntry], n: Int, m: Int, disciplina: String?) -> SimuladoProva {
        var rng = SystemRandomNumberGenerator()
        // candidatos: enunciado com tamanho de item (nem tese de uma palavra, nem acórdão inteiro)
        var pool = entries.filter {
            let b = base($0)
            return b.count >= 60 && b.count <= 600 && $0.situacaoKind == .vigente
        }
        if let d = disciplina { pool = pool.filter { $0.disciplina == d } }
        pool.shuffle(using: &rng)

        var itens: [SimuladoItem] = []
        var querFalso = Bool.random(using: &rng)
        for e in pool where itens.count < n {
            let texto = base(e)
            var afirmacao = texto, gab = true
            if querFalso, let falso = Exporter.afirmacaoFalsaAuto(texto), falso != texto {
                afirmacao = falso; gab = false
            }
            itens.append(SimuladoItem(id: e.id + (gab ? "#c" : "#e"), entryID: e.id, afirmacao: afirmacao,
                                      gabarito: gab, comentario: e.enunciado, referencia: referencia(e),
                                      tribunal: e.tribunal, disciplina: e.disciplina))
            querFalso.toggle()
        }

        var banco = bancoDiscursivas()
        if let d = disciplina {
            let filtrado = banco.filter { discursivaCasa($0, d) }
            if !filtrado.isEmpty { banco = filtrado }
        }
        banco.shuffle(using: &rng)
        let disc = Array(banco.prefix(max(0, m)))

        return SimuladoProva(id: UUID().uuidString, criadoEm: Date(), disciplina: disciplina,
                             itens: itens, discursivas: disc)
    }

    /// Texto (Markdown) para exportar/imprimir — a visão pedida.
    static func markdown(_ p: SimuladoProva, visao: SimuladoVisao) -> String {
        var s = "# Simulado CátedraJURIS\n"
        s += "_\(p.criadoEm.formatted(date: .long, time: .shortened))_ · \(p.disciplina ?? "Todas as disciplinas")\n\n"
        if visao == .relatorio {
            s += "**Resultado:** \(p.acertos)/\(p.itens.count) (\(String(format: "%.0f", p.percentual))%) · erros \(p.erros) · em branco \(p.emBranco) · tempo \(tempo(p.segundos))\n\n"
        }
        s += "## Objetivas (Certo/Errado)\n\n"
        for (i, it) in p.itens.enumerated() {
            s += "**\(i + 1).** \(it.afirmacao)\n"
            if visao != .enunciados {
                s += "\n- Gabarito: **\(it.gabarito ? "CERTO" : "ERRADO")**"
                if visao == .relatorio, let r = p.respostas[it.id] {
                    s += " · Você: \(r ? "Certo" : "Errado") → \(r == it.gabarito ? "acertou" : "errou")"
                } else if visao == .relatorio { s += " · Você: em branco" }
                s += "\n- Comentário: \(it.comentario)\n- Referência: \(it.referencia)\n"
            }
            s += "\n"
        }
        if !p.discursivas.isEmpty {
            s += "## Discursivas\n\n"
            for (i, d) in p.discursivas.enumerated() {
                s += "**Questão \(i + 1)** — \(d.rotulo) · \(d.disciplina)\n\n\(d.enunciado)\n\n"
                if visao != .enunciados {
                    if d.espelho.isEmpty { s += "_Padrão de resposta: espelho não publicado pela banca._\n\n" }
                    else {
                        s += "Padrão de resposta (espelho oficial):\n"
                        for q in d.espelho { s += "- \(q.quesito)" + (q.pontos.map { " (\(fmt($0)) pt)" } ?? "") + "\n" }
                        if let t = d.total { s += "\nTotal: \(fmt(t)) pt\n" }
                        s += "\n"
                    }
                    if !d.fonte.isEmpty { s += "Fonte: \(d.fonte)\n\n" }
                }
            }
        }
        return s
    }
    static func fmt(_ v: Double) -> String { v == v.rounded() ? String(Int(v)) : String(format: "%.2f", v) }
    static func tempo(_ seg: Int) -> String { String(format: "%02d:%02d", seg / 60, seg % 60) }
}

enum SimuladoVisao: String, CaseIterable, Identifiable {
    case enunciados = "Só enunciados"
    case gabarito = "Enunciados + gabarito"
    case relatorio = "Relatório completo"
    var id: String { rawValue }
    var simbolo: String {
        switch self {
        case .enunciados: return "doc.text"
        case .gabarito: return "checkmark.seal"
        case .relatorio: return "chart.bar.doc.horizontal"
        }
    }
}

// MARK: - Tela

struct SimuladoView: View {
    @Environment(LibraryStore.self) private var store
    @State private var prova: SimuladoProva?
    @State private var visao: SimuladoVisao = .enunciados
    @State private var qtdObjetivas = 20
    @State private var qtdDiscursivas = 2
    @State private var disciplina: String? = nil
    @State private var historico: [SimuladoProva] = []
    @State private var cronometro: Timer?
    @State private var avisoExport = false

    private var disciplinas: [(nome: String, count: Int)] { store.disciplinasEm(store.entries) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                cabecalho
                if let p = prova { provaView(p) } else { configuracao; historicoView }
            }
            .padding(.horizontal, 28).padding(.vertical, 24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Palette.appBackground)
        .onAppear { historico = SimuladoCache.todos() }
        .onDisappear { pararCronometro(salvar: true) }
    }

    // MARK: cabeçalho
    private var cabecalho: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                EtiquetaEstudo(texto: "Certo/Errado + discursivas")
                if prova != nil { EtiquetaEstudo(texto: "Local · sem IA", cor: Palette.importante) }
                Spacer()
            }
            Text("Simulado").font(.system(size: 30, weight: .heavy)).tracking(-0.6).foregroundStyle(Palette.titleInk)
            Text("Itens sorteados do acervo oficial (parte deles com a tese invertida, para julgar como ERRADO) e discursivas de provas reais com o espelho da banca. Tudo roda no aparelho.")
                .font(.system(size: 13)).foregroundStyle(Palette.secondaryInk)
        }
    }

    // MARK: configuração
    private var configuracao: some View {
        VStack(alignment: .leading, spacing: 14) {
            RotuloEstudo(texto: "Montar prova")
            Flow(espacamento: 14) {
                stepper("Objetivas", $qtdObjetivas, 5...80, passo: 5)
                stepper("Discursivas", $qtdDiscursivas, 0...6, passo: 1)
            }
            VStack(alignment: .leading, spacing: 6) {
                RotuloEstudo(texto: "Disciplina")
                Flow(espacamento: 6) {
                    chip("Todas", ativo: disciplina == nil) { disciplina = nil }
                    ForEach(disciplinas.prefix(18), id: \.nome) { d in
                        chip("\(d.nome) · \(d.count)", ativo: disciplina == d.nome) { disciplina = d.nome }
                    }
                }
            }
            Button {
                let p = SimuladoLocal.gerar(entries: store.entries, n: qtdObjetivas, m: qtdDiscursivas, disciplina: disciplina)
                prova = p; visao = .enunciados
                SimuladoCache.salvar(p)
                iniciarCronometro()
            } label: {
                Label("Gerar simulado", systemImage: "play.fill").font(.system(size: 14, weight: .bold))
                    .padding(.horizontal, 16).padding(.vertical, 9)
            }
            .buttonStyle(.borderedProminent).tint(Palette.accent)
            .disabled(store.entries.isEmpty)
            let banco = SimuladoLocal.bancoDiscursivas()
            Text(banco.isEmpty ? "Banco de discursivas não encontrado no bundle (discursivas.json) — a prova sai só com objetivas."
                               : "Banco: \(store.entries.count) verbetes · \(banco.count) discursivas de provas reais.")
                .font(.system(size: 11.5)).foregroundStyle(Palette.secondaryInk)
        }
        .padding(18)
        .background(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).fill(Palette.cardBackground))
        .overlay(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).strokeBorder(Palette.hairline))
    }

    private func stepper(_ rotulo: String, _ v: Binding<Int>, _ faixa: ClosedRange<Int>, passo: Int) -> some View {
        HStack(spacing: 8) {
            RotuloEstudo(texto: rotulo)
            Button { v.wrappedValue = max(faixa.lowerBound, v.wrappedValue - passo) } label: { Image(systemName: "minus.circle") }.buttonStyle(.plain)
            Text("\(v.wrappedValue)").font(.system(size: 18, weight: .heavy, design: .monospaced)).foregroundStyle(Palette.titleInk).frame(minWidth: 30)
            Button { v.wrappedValue = min(faixa.upperBound, v.wrappedValue + passo) } label: { Image(systemName: "plus.circle") }.buttonStyle(.plain)
        }
        .foregroundStyle(Palette.accent)
    }

    private func chip(_ t: String, ativo: Bool, _ acao: @escaping () -> Void) -> some View {
        Button(action: acao) {
            Text(t).font(.system(size: 12, weight: .semibold))
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(Capsule().fill(ativo ? Palette.accent : Palette.accentSoft))
                .foregroundStyle(ativo ? Color.white : Palette.accent)
        }.buttonStyle(.plain)
    }

    // MARK: histórico
    @ViewBuilder private var historicoView: some View {
        if !historico.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                RotuloEstudo(texto: "Simulados anteriores")
                ForEach(historico.prefix(12)) { h in
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(h.criadoEm.formatted(date: .abbreviated, time: .shortened))
                                .font(.system(size: 13, weight: .semibold)).foregroundStyle(Palette.titleInk)
                            Text("\(h.disciplina ?? "Todas") · \(h.itens.count) itens · \(h.discursivas.count) discursivas")
                                .font(.system(size: 11.5)).foregroundStyle(Palette.secondaryInk)
                        }
                        Spacer()
                        Text("\(h.acertos)/\(h.itens.count)").font(.system(size: 15, weight: .heavy, design: .monospaced))
                            .foregroundStyle(h.percentual >= 70 ? Color(hex: "#16A34A") : (h.percentual >= 50 ? Color(hex: "#D97706") : Palette.secondaryInk))
                        Button("Abrir") { prova = h; visao = h.encerrado ? .relatorio : .enunciados; if !h.encerrado { iniciarCronometro() } }
                            .buttonStyle(.bordered).tint(Palette.accent)
                        Button { SimuladoCache.apagar(h.id); historico = SimuladoCache.todos() } label: { Image(systemName: "trash") }
                            .buttonStyle(.plain).foregroundStyle(Palette.secondaryInk)
                    }
                    .padding(.horizontal, 14).padding(.vertical, 9)
                    .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Palette.cardBackground))
                    .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(Palette.hairline))
                }
            }
        }
    }

    // MARK: prova
    private func provaView(_ p: SimuladoProva) -> some View {
        VStack(alignment: .leading, spacing: 18) {
            barra(p)
            if visao == .relatorio { relatorio(p) }
            VStack(alignment: .leading, spacing: 12) {
                RotuloEstudo(texto: "Objetivas · julgue Certo ou Errado")
                ForEach(Array(p.itens.enumerated()), id: \.element.id) { i, it in itemCard(i + 1, it, p) }
            }
            if !p.discursivas.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    RotuloEstudo(texto: "Discursivas · provas reais")
                    ForEach(Array(p.discursivas.enumerated()), id: \.element.id) { i, d in discursivaCard(i + 1, d) }
                }
            }
        }
    }

    private func barra(_ p: SimuladoProva) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Flow(espacamento: 8) {
                ForEach(SimuladoVisao.allCases) { v in
                    Button { visao = v } label: {
                        Label(v.rawValue, systemImage: v.simbolo).font(.system(size: 12.5, weight: .semibold))
                            .padding(.horizontal, 11).padding(.vertical, 6)
                            .background(Capsule().fill(visao == v ? Palette.accent : Palette.accentSoft))
                            .foregroundStyle(visao == v ? Color.white : Palette.accent)
                    }.buttonStyle(.plain)
                }
            }
            Flow(espacamento: 10) {
                EtiquetaEstudo(texto: p.disciplina ?? "Todas as disciplinas")
                EtiquetaEstudo(texto: "\(p.respondidos)/\(p.itens.count) respondidos", cor: Palette.secondaryInk)
                EtiquetaEstudo(texto: "⏱ \(SimuladoLocal.tempo(p.segundos))", cor: p.encerrado ? Palette.secondaryInk : Palette.importante)
                Spacer(minLength: 0)
                if !p.encerrado {
                    Button("Encerrar e corrigir") { encerrar() }.buttonStyle(.borderedProminent).tint(Palette.accent)
                }
                Button { exportar(p) } label: { Label("Exportar / imprimir", systemImage: "square.and.arrow.up") }
                    .buttonStyle(.bordered).tint(Palette.accent)
                Button("Voltar") { pararCronometro(salvar: true); prova = nil; historico = SimuladoCache.todos() }
                    .buttonStyle(.bordered)
            }
            if avisoExport {
                Text("Arquivo .md salvo (Documentos do app). Abra e imprima pelo app de sua preferência.")
                    .font(.system(size: 11.5)).foregroundStyle(Palette.secondaryInk)
            }
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).fill(Palette.cardBackground))
        .overlay(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).strokeBorder(Palette.hairline))
    }

    private func relatorio(_ p: SimuladoProva) -> some View {
        let porDisc = Dictionary(grouping: p.itens, by: \.disciplina)
        return VStack(alignment: .leading, spacing: 12) {
            Flow(espacamento: 22) {
                kpi(String(format: "%.0f%%", p.percentual), "acerto", cor: p.percentual >= 70 ? Color(hex: "#16A34A") : (p.percentual >= 50 ? Color(hex: "#D97706") : .red))
                kpi("\(p.acertos)", "acertos", cor: Color(hex: "#16A34A"))
                kpi("\(p.erros)", "erros", cor: .red)
                kpi("\(p.emBranco)", "em branco")
                kpi(SimuladoLocal.tempo(p.segundos), "tempo")
            }
            if porDisc.count > 1 {
                RotuloEstudo(texto: "Por disciplina")
                ForEach(porDisc.keys.sorted(), id: \.self) { d in
                    let its = porDisc[d] ?? []
                    let ok = its.filter { p.respostas[$0.id] == $0.gabarito }.count
                    HStack {
                        Text(d).font(.system(size: 13)).foregroundStyle(Palette.titleInk)
                        Spacer()
                        Text("\(ok)/\(its.count)").font(.system(size: 13, weight: .bold, design: .monospaced)).foregroundStyle(Palette.secondaryInk)
                    }
                }
            }
        }
        .padding(18)
        .background(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).fill(Palette.cardBackground))
        .overlay(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).strokeBorder(Palette.hairline))
    }
    private func kpi(_ v: String, _ r: String, cor: Color = Palette.titleInk) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(v).font(.system(size: 26, weight: .heavy, design: .monospaced)).foregroundStyle(cor)
            RotuloEstudo(texto: r)
        }
    }

    private func itemCard(_ n: Int, _ it: SimuladoItem, _ p: SimuladoProva) -> some View {
        let resp = p.respostas[it.id]
        let mostraGab = visao != .enunciados
        let cor = mostraGab ? (it.gabarito ? Color(hex: "#16A34A") : Color.red) : Palette.accent
        return VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text("\(n)").font(.system(size: 13, weight: .heavy, design: .monospaced)).foregroundStyle(Palette.secondaryInk)
                Text(it.afirmacao).font(.system(size: 14.5)).lineSpacing(3).foregroundStyle(Palette.titleInk)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            HStack(spacing: 8) {
                botaoCE("Certo", true, resp, it, p)
                botaoCE("Errado", false, resp, it, p)
                Spacer()
                if mostraGab {
                    EtiquetaEstudo(texto: it.gabarito ? "Gabarito: Certo" : "Gabarito: Errado", cor: cor)
                    if visao == .relatorio, let r = resp {
                        EtiquetaEstudo(texto: r == it.gabarito ? "Você acertou" : "Você errou", cor: r == it.gabarito ? Color(hex: "#16A34A") : .red)
                    } else if visao == .relatorio {
                        EtiquetaEstudo(texto: "Em branco", cor: Palette.secondaryInk)
                    }
                }
            }
            if mostraGab {
                BlocoEstudo(rotulo: "Comentário", cor: cor) {
                    VStack(alignment: .leading, spacing: 6) {
                        if !it.gabarito { Text("A afirmação inverte a tese. O texto oficial é:").font(.system(size: 12.5, weight: .semibold)).foregroundStyle(Palette.secondaryInk) }
                        Text(it.comentario)
                        HStack {
                            Text(it.referencia).font(.system(size: 12, weight: .bold)).foregroundStyle(cor)
                            Spacer()
                            Button("Abrir no leitor") { store.lerCheio(it.entryID) }.buttonStyle(.plain).font(.system(size: 12)).foregroundStyle(Palette.accent)
                        }
                    }
                }
            }
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).fill(Palette.cardBackground))
        .overlay(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).strokeBorder(Palette.hairline))
    }

    private func botaoCE(_ t: String, _ valor: Bool, _ resp: Bool?, _ it: SimuladoItem, _ p: SimuladoProva) -> some View {
        let ativo = resp == valor
        return Button {
            guard var q = prova, !q.encerrado else { return }
            q.respostas[it.id] = valor
            prova = q; SimuladoCache.salvar(q)
        } label: {
            Text(t).font(.system(size: 12.5, weight: .bold))
                .padding(.horizontal, 14).padding(.vertical, 6)
                .background(Capsule().fill(ativo ? Palette.accent : Palette.accentSoft))
                .foregroundStyle(ativo ? Color.white : Palette.accent)
        }
        .buttonStyle(.plain)
        .disabled(p.encerrado)
        .opacity(p.encerrado && !ativo ? 0.45 : 1)
    }

    private func discursivaCard(_ n: Int, _ d: DiscursivaBanco) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Flow {
                EtiquetaEstudo(texto: "Questão \(n)")
                EtiquetaEstudo(texto: d.rotulo, cor: Palette.secondaryInk)
                if !d.peca.isEmpty { EtiquetaEstudo(texto: d.peca, cor: Palette.importante) }
                EtiquetaEstudo(texto: d.disciplina, cor: Palette.accent)
            }
            if !d.tema.isEmpty { Text(d.tema).font(.system(size: 12.5, weight: .semibold)).foregroundStyle(Palette.secondaryInk) }
            Text(d.enunciado).font(.system(size: 14.5)).lineSpacing(3).foregroundStyle(Palette.titleInk).textSelection(.enabled)
            if visao != .enunciados {
                if d.espelho.isEmpty {
                    BlocoEstudo(rotulo: "Padrão de resposta", cor: Palette.secondaryInk) {
                        Text("A banca não publicou o espelho desta questão. Confira a prova na fonte oficial.")
                    }
                } else {
                    BlocoEstudo(rotulo: "Padrão de resposta · espelho oficial", cor: Color(hex: "#16A34A")) {
                        VStack(alignment: .leading, spacing: 6) {
                            ForEach(Array(d.espelho.enumerated()), id: \.offset) { _, q in
                                HStack(alignment: .top, spacing: 8) {
                                    Text(q.quesito).frame(maxWidth: .infinity, alignment: .leading)
                                    if let pt = q.pontos { Text("\(SimuladoLocal.fmt(pt)) pt").font(.system(size: 12, weight: .bold, design: .monospaced)).foregroundStyle(Palette.secondaryInk) }
                                }
                            }
                            if let t = d.total { Text("Total: \(SimuladoLocal.fmt(t)) pt").font(.system(size: 12, weight: .bold)).foregroundStyle(Palette.secondaryInk) }
                        }
                    }
                }
                if !d.fonte.isEmpty, let u = URL(string: d.fonte) {
                    Link(destination: u) { Label("Fonte oficial", systemImage: "link").font(.system(size: 12)) }.foregroundStyle(Palette.accent)
                }
            }
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).fill(Palette.cardBackground))
        .overlay(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).strokeBorder(Palette.hairline))
    }

    // MARK: ações
    private func encerrar() {
        guard var p = prova else { return }
        p.encerrado = true
        prova = p
        pararCronometro(salvar: true)
        visao = .relatorio
    }
    private func exportar(_ p: SimuladoProva) {
        let md = SimuladoLocal.markdown(p, visao: visao)
        let nome = "simulado-\(p.criadoEm.formatted(.iso8601.year().month().day()))-\(visao == .enunciados ? "prova" : visao == .gabarito ? "gabarito" : "relatorio").md"
        Exporter.salvar(nome: nome, tipo: .plainText, dados: Data(md.utf8))
        avisoExport = true
    }
    private func iniciarCronometro() {
        cronometro?.invalidate()
        guard let p = prova, !p.encerrado else { return }
        cronometro = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            Task { @MainActor in
                guard var q = prova, !q.encerrado else { return }
                q.segundos += 1; prova = q
                if q.segundos % 15 == 0 { SimuladoCache.salvar(q) }
            }
        }
    }
    private func pararCronometro(salvar: Bool) {
        cronometro?.invalidate(); cronometro = nil
        if salvar, let p = prova { SimuladoCache.salvar(p) }
    }
}
