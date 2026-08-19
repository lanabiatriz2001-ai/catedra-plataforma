import SwiftUI

// =====================================================================================
//  CátedraJURIS — telas de ESTUDO que antes só existiam na versão web:
//    · Grade de informativos (uma edição por quadradinho, verde/âmbar/cinza)
//    · Julgado do dia (sorteio com semente na data — o mesmo dia devolve o mesmo)
//    · Roteiro de estudo do verbete (Em uma frase · Fundamento · Como era · O que decidiu
//      · Pontos que a prova cobra · Pegadinha · quiz) — gerado pela IA DO APP
//    · Prova oral (a IA pergunta, você responde, ela corrige contra o enunciado)
//
//  A IA vem de CatedraIA (o host instala o provedor: mesmo /api/complete do Cátedra,
//  autenticado pela sessão). Sem host, a tela diz isso em vez de pedir chave.
//
//  Cores: fundo/texto/acento seguem o tema do Cátedra (ThemeState); a cor de cada
//  fonte é a do TRIBUNAL (Palette.fonte*). Nada de hex solto aqui.
// =====================================================================================

// MARK: - Roteiro de estudo (modelo + cache)

/// O que a IA devolve para um verbete. Todos os campos opcionais: a IA pode não ter
/// "como era" para um verbete que não mudou nada, e isso é resposta legítima.
struct RoteiroEstudo: Codable, Hashable {
    var nivel: Int?
    var segundaFase: Bool?
    var frase: String?
    var fundamento: String?
    var comoEra: String?
    var decidiu: String?
    var chave: [String]?
    var jurisprudencia: [String]?
    var atencao: String?
    var hoje: String?
    var pegadinha: String?
    var quiz: [QuestaoQuiz]?
    var geradoEm: Date?

    struct QuestaoQuiz: Codable, Hashable, Identifiable {
        var id: String { en }
        var en: String
        var alts: [String]
        var ok: Int
        var fb: String?
        var fcF: String?
        var fcV: String?
    }
}

/// Cache dos roteiros por id de verbete. Vive em Application Support ao lado dos dados
/// do módulo. NÃO sobe para a nuvem do Cátedra de propósito: texto de IA de centenas de
/// verbetes engordaria o sync sem necessidade — e é regerável.
@MainActor
enum RoteiroCache {
    private static var mem: [String: RoteiroEstudo] = [:]
    private static var carregado = false

    private static var url: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("VadeMecumJuris", isDirectory: true)
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        // "-local": o arquivo antigo guardava roteiros escritos por IA; o novo é 100% local.
        return base.appendingPathComponent("roteiros-estudo-local.json")
    }
    private static func carregar() {
        guard !carregado else { return }
        carregado = true
        if let d = try? Data(contentsOf: url),
           let m = try? JSONDecoder().decode([String: RoteiroEstudo].self, from: d) { mem = m }
    }
    static func get(_ id: String) -> RoteiroEstudo? { carregar(); return mem[id] }
    static func set(_ id: String, _ r: RoteiroEstudo?) {
        carregar()
        if let r { mem[id] = r } else { mem.removeValue(forKey: id) }
        // teto: 400 mais recentes
        if mem.count > 400 {
            let ordem = mem.sorted { ($0.value.geradoEm ?? .distantPast) < ($1.value.geradoEm ?? .distantPast) }
            for (k, _) in ordem.prefix(mem.count - 400) { mem.removeValue(forKey: k) }
        }
        if let d = try? JSONEncoder().encode(mem) { try? d.write(to: url, options: .atomic) }
    }
}

enum PromptsEstudo {
    static func roteiro(_ e: JurisEntry) -> String {
        var s = "Você prepara material de estudo para concursos jurídicos brasileiros de alto nível (magistratura, MP, procuradorias). Abaixo vai um verbete OFICIAL do acervo.\n\n"
        s += "TRIBUNAL: \(e.tribunal)\nCOLEÇÃO: \(e.fonteKind.nome)"
        if let n = e.numero { s += "\nNÚMERO: \(n)" }
        s += "\nTÍTULO: \(e.titulo)"
        if let r = e.ramoDireito { s += "\nRAMO: \(r)" }
        if let d = e.data { s += "\nDATA: \(d)" }
        if let st = e.situacao { s += "\nSITUAÇÃO: \(st)" }
        s += "\n\nENUNCIADO:\n\(e.enunciado)"
        if let o = e.observacao, !o.isEmpty { s += "\n\nOBSERVAÇÃO DA FONTE:\n\(o)" }
        s += """


        Devolva SOMENTE um objeto JSON, sem cercas de código e sem texto fora dele, com estas chaves:
        {"nivel": 1 | 2 | 3,
         "segundaFase": true | false,
         "frase": "o que o verbete decide, em UMA frase de no máximo 40 palavras, em português claro",
         "fundamento": "os dispositivos legais e constitucionais que sustentam o verbete, citados por artigo",
         "comoEra": "o entendimento ANTERIOR, se este verbete mudou alguma coisa; string vazia se não mudou nada",
         "decidiu": "o que exatamente ficou decidido e por qual razão de decidir",
         "chave": ["3 a 5 pontos que a prova cobra deste verbete, cada um em uma linha curta"],
         "jurisprudencia": ["julgados ou súmulas relacionados, com tribunal e identificação; lista vazia se você não tiver certeza"],
         "atencao": "o que costuma ser mal compreendido; string vazia se não houver",
         "hoje": "se o verbete estiver cancelado, superado ou alterado, o que vale hoje; string vazia se ele estiver íntegro",
         "pegadinha": "a troca exata que a banca faz para transformar este verbete em alternativa errada",
         "quiz": [ {"en": "enunciado da questão", "alts": ["A","B","C"], "ok": 0,
                    "fb": "por que essa é a correta e onde as outras erram, com o fundamento",
                    "fcF": "frente do flashcard — a pergunta seca", "fcV": "verso — a resposta curta"} ]
        }
        O quiz tem 3 questões no estilo da banca, sobre ESTE verbete. "nivel": 1 = todo mundo tem de saber; 2 = separa quem passa; 3 = detalhe fino. "segundaFase": tem cara de discursiva/sentença.
        REGRAS: não invente número de julgado, de súmula, de tema repetitivo nem de artigo — se não tiver certeza, deixe a lista vazia ou descreva sem numerar. Não repita o enunciado. Escreva em português do Brasil.
        """
        return s
    }

    static func perguntaOral(_ e: JurisEntry) -> String {
        "Você é examinador de prova oral de concurso da magistratura brasileira. A partir do verbete abaixo, formule UMA pergunta de arguição — direta, de uma ou duas frases, do jeito que um examinador pergunta em banca. Não dê a resposta. Não use markdown. Responda SOMENTE com a pergunta.\n\n" + base(e)
    }
    static func corrigirOral(_ e: JurisEntry, resposta: String) -> String {
        """
        Você é examinador de prova oral de concurso da magistratura brasileira. Corrija a resposta do candidato COMPARANDO com o verbete oficial. Seja exigente e específico: diga o que ficou de fora, o que está errado e o que a banca esperaria ouvir. Devolva SOMENTE um objeto JSON, sem cercas de código:
        {"nota": "boa" | "media" | "fraca", "acertou": ["o que a resposta acertou"], "faltou": ["o que faltou ou saiu errado, cada item em uma linha"], "modelo": "a resposta que a banca esperaria, em no máximo 5 linhas"}

        \(base(e))

        RESPOSTA DO CANDIDATO:
        \(resposta)
        """
    }
    private static func base(_ e: JurisEntry) -> String {
        var s = "VERBETE OFICIAL\nTRIBUNAL: \(e.tribunal)\nTÍTULO: \(e.titulo)"
        if let r = e.ramoDireito { s += "\nRAMO: \(r)" }
        s += "\nENUNCIADO: \(e.enunciado)"
        return s
    }
}

// MARK: - Peças visuais compartilhadas

/// Rótulo pequeno em caixa alta — a "voz de rótulo" do Cátedra.
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
            .background(RoundedRectangle(cornerRadius: max(6, ThemeState.t.radius - 4), style: .continuous)
                .fill(fundo ?? cor.opacity(ThemeState.t.isDark ? 0.14 : 0.08)))
        }
    }
}

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
        ScrollView {
            VStack(alignment: .leading, spacing: 26) {
                cabecalho
                ForEach(Self.colecoes) { f in
                    let eds = store.edicoesInfo(f)
                    if !eds.isEmpty { colecao(f, eds) }
                }
            }
            .padding(.horizontal, 28).padding(.vertical, 24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Palette.appBackground)
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
        return VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                EtiquetaEstudo(texto: "Acervo por edição")
                Spacer()
            }
            Text("Informativos").font(.system(size: 30, weight: .heavy)).tracking(-0.6).foregroundStyle(Palette.titleInk)
            Flow(espacamento: 22) {
                kpi("\(tot)", "edições")
                kpi("\(lidas)", "lidas", cor: Color(hex: "#16A34A"))
                kpi("\(comecadas)", "começadas", cor: Color(hex: "#D97706"))
                kpi("\(tot - lidas - comecadas)", "não lidas")
            }
            .padding(.horizontal, 18).padding(.vertical, 14)
            .background(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).fill(Palette.cardBackground))
            .overlay(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).strokeBorder(Palette.hairline))
        }
    }
    private func kpi(_ v: String, _ r: String, cor: Color = Palette.titleInk) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(v).font(.system(size: 26, weight: .heavy, design: .monospaced)).foregroundStyle(cor)
            RotuloEstudo(texto: r)
        }
    }

    private func colecao(_ f: Fonte, _ eds: [InfoEdicao]) -> some View {
        let cor = f.cor
        let mostrar = expandidas.contains(f.rawValue) ? eds.count : min(lote, eds.count)
        return VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(f.nome).font(.system(size: 17.5, weight: .bold)).foregroundStyle(Palette.titleInk)
                Text("\(eds.count) edições · até a \(eds.first?.numero ?? 0)")
                    .font(.system(size: 12)).foregroundStyle(Palette.secondaryInk)
                Spacer()
            }
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 64), spacing: 7)], spacing: 7) {
                ForEach(eds.prefix(mostrar)) { e in
                    let s = estado(f, e)
                    Button { store.selecao = .infoEdicao(f, e.numero) } label: {
                        VStack(spacing: 1) {
                            Text("\(e.numero)").font(.system(size: 14, weight: .heavy, design: .monospaced))
                            Text(s.lidos > 0 ? "\(s.lidos)/\(s.total)" : "\(s.total)")
                                .font(.system(size: 9, weight: .bold))
                        }
                        .frame(maxWidth: .infinity, minHeight: 56)
                        .foregroundStyle(cls(s) == .lida ? Color(hex: "#15803D") : cls(s) == .parcial ? Color(hex: "#A16207") : Palette.secondaryInk)
                        .background(RoundedRectangle(cornerRadius: 11, style: .continuous)
                            .fill(cls(s) == .lida ? Color(hex: "#16A34A").opacity(0.14) : cls(s) == .parcial ? Color(hex: "#EAB308").opacity(0.14) : Palette.cardBackground))
                        .overlay(RoundedRectangle(cornerRadius: 11, style: .continuous)
                            .strokeBorder(cls(s) == .lida ? Color(hex: "#16A34A") : cls(s) == .parcial ? Color(hex: "#EAB308") : Palette.hairline, lineWidth: 1.5))
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

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Text("Julgado do dia").font(.system(size: 30, weight: .heavy)).tracking(-0.6).foregroundStyle(Palette.titleInk)
                    Text(Date().formatted(.dateTime.day().month(.wide).year().locale(Locale(identifier: "pt_BR"))))
                        .font(.system(size: 12.5)).foregroundStyle(Palette.secondaryInk)
                }
                if let e = verbete { cartao(e) }
                else { Text("Acervo ainda carregando.").foregroundStyle(Palette.secondaryInk) }
            }
            .padding(.horizontal, 28).padding(.vertical, 24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Palette.appBackground)
    }

    private func cartao(_ e: JurisEntry) -> some View {
        let cor = e.fonteKind.cor
        return VStack(alignment: .leading, spacing: 12) {
            Flow {
                EtiquetaEstudo(texto: e.tribunal, cor: cor)
                EtiquetaEstudo(texto: e.fonteKind.nomeCurto, cor: cor)
                if let r = e.ramoDireito { EtiquetaEstudo(texto: r, cor: RamoStyle.color(r)) }
                if e.importante { EtiquetaEstudo(texto: "Destaque", cor: Palette.importante) }
            }
            Text(e.titulo).font(.system(size: 21, weight: .heavy)).tracking(-0.3).foregroundStyle(Palette.titleInk)
            Text(e.enunciado).font(.system(size: 15)).lineSpacing(4).foregroundStyle(Palette.titleInk)
                .textSelection(.enabled)
            if let fp = e.fontePublicacao { Text(fp).font(.system(size: 11.5)).foregroundStyle(Palette.secondaryInk) }
            HStack(spacing: 9) {
                Button("Abrir no leitor") { store.lerCheio(e.id) }.buttonStyle(.borderedProminent).tint(cor)
                Button(mostrarOral ? "Fechar prova oral" : "Modo prova oral") { mostrarOral.toggle() }.buttonStyle(.bordered).tint(cor)
                Button(store.dominados.contains(e.id) ? "✓ Dominado" : "Marcar como dominado") {
                    if store.dominados.contains(e.id) { store.dominados.remove(e.id) } else { store.dominados.insert(e.id) }
                }.buttonStyle(.bordered).tint(cor)
            }
            if mostrarOral { ProvaOralView(entry: e) }
            // O destaque do dia é o ÚNICO lugar que gera o roteiro sozinho, sem esperar
            // clique — é justamente o "visual e explicação nos julgados" (Em uma frase,
            // Fundamento, Como era, O que decidiu, Pegadinha, quiz), pedido para aparecer
            // já na abertura. Em qualquer outro verbete continua sob demanda.
            RoteiroEstudoView(entry: e, autoGerar: true)
        }
        .padding(22)
        .background(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).fill(Palette.cardBackground))
        .overlay(alignment: .leading) { RoundedRectangle(cornerRadius: 2).fill(cor).frame(width: 5).padding(.vertical, 14) }
        .overlay(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).strokeBorder(Palette.hairline))
    }
}

// MARK: - 3. Roteiro de estudo do verbete (bloco para dentro do EntryDetailView)

struct RoteiroEstudoView: View {
    @Environment(LibraryStore.self) private var store
    let entry: JurisEntry
    /// true SÓ no card do Julgado do dia: é o único verbete em destaque na abertura,
    /// então vale gastar uma chamada de IA sem esperar clique. Em qualquer outro verbete
    /// (a lista inteira, 25 mil) o padrão continua sob demanda — gerar em toda abertura
    /// de página gastaria a cota da API à toa.
    var autoGerar: Bool = false
    @State private var roteiro: RoteiroEstudo?
    @State private var gerando = false
    @State private var erro: String?
    @State private var respostas: [Int: Int] = [:]
    @State private var enviouFlash = false
    @State private var mostrarOral = false

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Divider().padding(.vertical, 4)
            if let r = roteiro { conteudo(r) }
            else {
                HStack(spacing: 10) {
                    Button {
                        Task { await gerar() }
                    } label: { Label(gerando ? "Montando…" : "Montar roteiro de estudo", systemImage: "list.bullet.rectangle") }
                    .buttonStyle(.borderedProminent).tint(Palette.accent).disabled(gerando)
                    // Prova oral não depende de IA (é local): não some quando a IA está fora.
                    Button(mostrarOral ? "Fechar prova oral" : "Modo prova oral") { mostrarOral.toggle() }
                        .buttonStyle(.bordered)
                }
                Text("Tese em uma frase, fundamento, o que mudou, pontos que a prova cobra, pegadinha e um quiz — montados aqui mesmo a partir do enunciado oficial e do acervo, sem IA.")
                    .font(.system(size: 12)).foregroundStyle(Palette.secondaryInk)
                if let erro { Text(erro).font(.system(size: 12)).foregroundStyle(Color(hex: "#DC2626")) }
                if mostrarOral { ProvaOralView(entry: entry) }
            }
        }
        .onAppear { roteiro = RoteiroCache.get(entry.id) }
        .onChange(of: entry.id) { _, _ in roteiro = RoteiroCache.get(entry.id); respostas = [:]; enviouFlash = false; erro = nil }
        .task(id: entry.id) {
            if autoGerar, roteiro == nil, !gerando { await gerar() }
        }
    }

    // Sem IA: o roteiro sai do próprio verbete e do acervo (RoteiroLocal). Instantâneo,
    // off-line, sem custo — e igual em todos os aparelhos. O cache continua o mesmo.
    private func gerar() async {
        gerando = true; erro = nil
        defer { gerando = false }
        let r = RoteiroLocal.gerar(entry, store: store)
        RoteiroCache.set(entry.id, r); roteiro = r
    }

    @ViewBuilder private func conteudo(_ r: RoteiroEstudo) -> some View {
        Flow {
            if let n = r.nivel { EtiquetaEstudo(texto: "Nível \(n)") }
            if r.segundaFase == true { EtiquetaEstudo(texto: "2ª fase") }
        }
        if let t = r.frase, !t.isEmpty { BlocoEstudo(rotulo: "Em uma frase") { Text(t).fontWeight(.semibold) } }
        if let t = r.fundamento, !t.isEmpty { BlocoEstudo(rotulo: "Fundamento", cor: Palette.secondaryInk) { Text(t) } }
        if let t = r.comoEra, !t.isEmpty { BlocoEstudo(rotulo: "Como era", cor: Color(hex: "#EA580C")) { Text(t) } }
        if let t = r.decidiu, !t.isEmpty { BlocoEstudo(rotulo: "O que decidiu", cor: Color(hex: "#16A34A")) { Text(t) } }
        if let l = r.chave, !l.isEmpty { lista("Pontos que a prova cobra", l, cor: Palette.accent) }
        if let l = r.jurisprudencia, !l.isEmpty { lista("Relacionados", l, cor: Palette.secondaryInk) }
        if let t = r.atencao, !t.isEmpty { BlocoEstudo(rotulo: "Atenção", cor: Color(hex: "#EA580C")) { Text(t) } }
        if let t = r.hoje, !t.isEmpty { BlocoEstudo(rotulo: "O que vale hoje", cor: Color(hex: "#16A34A")) { Text(t) } }
        if let t = r.pegadinha, !t.isEmpty { BlocoEstudo(rotulo: "Pegadinha de prova", cor: Color(hex: "#DC2626")) { Text(t).fontWeight(.medium) } }
        if let q = r.quiz, !q.isEmpty { quiz(q) }
        HStack(spacing: 9) {
            Button(mostrarOral ? "Fechar prova oral" : "Modo prova oral") { mostrarOral.toggle() }.buttonStyle(.bordered)
            Button("Refazer") { RoteiroCache.set(entry.id, nil); roteiro = nil; respostas = [:]; enviouFlash = false }.buttonStyle(.plain).foregroundStyle(Palette.secondaryInk)
        }
        if mostrarOral { ProvaOralView(entry: entry) }
        Text("Roteiro escrito pela IA a partir do enunciado oficial — confira os números antes de decorar.")
            .font(.system(size: 11)).italic().foregroundStyle(Palette.secondaryInk)
    }

    private func lista(_ rotulo: String, _ itens: [String], cor: Color) -> some View {
        BlocoEstudo(rotulo: rotulo, cor: cor) {
            VStack(alignment: .leading, spacing: 5) {
                ForEach(itens, id: \.self) { i in
                    HStack(alignment: .top, spacing: 8) { Text("•"); Text(i) }
                }
            }
        }
    }

    private func quiz(_ qs: [RoteiroEstudo.QuestaoQuiz]) -> some View {
        let erradas = qs.indices.filter { i in if let r = respostas[i] { return r != qs[i].ok } else { return false } }
        return VStack(alignment: .leading, spacing: 12) {
            RotuloEstudo(texto: "Quiz — \(qs.count) questões")
            ForEach(Array(qs.enumerated()), id: \.offset) { i, q in
                VStack(alignment: .leading, spacing: 6) {
                    Text("\(i + 1). \(q.en)").font(.system(size: 14)).foregroundStyle(Palette.titleInk)
                    ForEach(Array(q.alts.enumerated()), id: \.offset) { j, a in
                        let resp = respostas[i]
                        let certa = (j == q.ok), escolhida = (resp == j)
                        Button {
                            if respostas[i] == nil { respostas[i] = j }
                        } label: {
                            HStack(alignment: .top, spacing: 8) {
                                Text(String(UnicodeScalar(65 + j)!) + ")").font(.system(size: 13, weight: .bold, design: .monospaced))
                                Text(a).font(.system(size: 13)).multilineTextAlignment(.leading)
                                Spacer(minLength: 0)
                            }
                            .padding(.horizontal, 12).padding(.vertical, 8)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .foregroundStyle(resp == nil ? Palette.titleInk : (certa ? Color(hex: "#15803D") : (escolhida ? Color(hex: "#B91C1C") : Palette.secondaryInk)))
                            .background(RoundedRectangle(cornerRadius: 9, style: .continuous)
                                .fill(resp == nil ? Palette.cardBackground : (certa ? Color(hex: "#16A34A").opacity(0.12) : (escolhida ? Color(hex: "#DC2626").opacity(0.12) : Palette.cardBackground))))
                            .overlay(RoundedRectangle(cornerRadius: 9, style: .continuous)
                                .strokeBorder(resp == nil ? Palette.hairline : (certa ? Color(hex: "#16A34A") : (escolhida ? Color(hex: "#DC2626") : Palette.hairline)), lineWidth: 1.5))
                        }
                        .buttonStyle(.plain).disabled(resp != nil)
                    }
                    if let resp = respostas[i], let fb = q.fb {
                        let acertou = resp == q.ok
                        BlocoEstudo(rotulo: acertou ? "Certo" : "Errado", cor: acertou ? Color(hex: "#16A34A") : Color(hex: "#DC2626")) { Text(fb) }
                    }
                }
            }
            if !erradas.isEmpty {
                Button {
                    // A questão errada vira cartão do baralho de REVISÃO ESPAÇADA do módulo — o
                    // mesmo que já existe, não um baralho paralelo.
                    let hoje = Calendar.current.startOfDay(for: Date())
                    var card = store.srs[entry.id] ?? JurisSRSCard(due: hoje, added: hoje)
                    let q = qs[erradas[0]]
                    card.cardKind = "direta"; card.prompt = q.fcF ?? q.en; card.answer = q.fcV ?? q.fb ?? ""
                    store.srs[entry.id] = card
                    enviouFlash = true
                } label: {
                    Label(enviouFlash ? "No baralho de revisão" : (erradas.count == 1 ? "Gerar flashcard da que errei" : "Gerar flashcards das \(erradas.count) que errei"),
                          systemImage: enviouFlash ? "checkmark" : "rectangle.stack.badge.plus")
                }
                .buttonStyle(.bordered).disabled(enviouFlash)
            }
        }
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
            Text(pergunta).font(.system(size: 15.5, weight: .semibold)).lineSpacing(3).foregroundStyle(Palette.titleInk)
            TextEditor(text: $resposta)
                .font(.system(size: 14)).frame(minHeight: 110)
                .padding(8)
                .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Palette.cardBackground))
                .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(Palette.hairline))
            HStack(spacing: 9) {
                Button("Corrigir") { correcao = ProvaOralLocal.corrigir(entry, resposta: resposta) }
                    .buttonStyle(.borderedProminent).tint(Palette.accent)
                    .disabled(resposta.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                Button("Outra pergunta") { perguntar() }.buttonStyle(.bordered)
            }
            if let c = correcao { resultado(c) }
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: max(6, ThemeState.t.radius - 2), style: .continuous).fill(Palette.accent.opacity(0.06)))
        .onAppear { if pergunta.isEmpty { perguntar() } }
    }

    private func perguntar() {
        pergunta = ProvaOralLocal.pergunta(entry, variante: variante)
        variante += 1
        correcao = nil; resposta = ""
    }

    @ViewBuilder private func resultado(_ c: Correcao) -> some View {
        let nota = c.nota ?? ""
        let cor = nota == "boa" ? Color(hex: "#16A34A") : nota == "media" ? Color(hex: "#D97706") : Color(hex: "#DC2626")
        HStack { EtiquetaEstudo(texto: nota == "boa" ? "Boa" : nota == "media" ? "Mediana" : "Fraca", cor: cor); Spacer() }
        if let a = c.acertou, !a.isEmpty {
            BlocoEstudo(rotulo: "Acertou", cor: Color(hex: "#16A34A")) {
                VStack(alignment: .leading, spacing: 4) { ForEach(a, id: \.self) { Text("• " + $0) } }
            }
        }
        if let f = c.faltou, !f.isEmpty {
            BlocoEstudo(rotulo: "Faltou / saiu errado", cor: Color(hex: "#DC2626")) {
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
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if parte != .informativos {
            JulgadoDoDiaView()
                .frame(maxHeight: 520)
            }
            if parte != .julgado {
            HStack(alignment: .firstTextBaseline) {
                Text("Últimos informativos").font(.system(size: 17.5, weight: .bold)).foregroundStyle(Palette.titleInk)
                Spacer()
                Button("Ver a grade") { store.selecao = .gradeInformativos }.buttonStyle(.plain).foregroundStyle(Palette.accent)
            }
            .padding(.horizontal, 28)
            HStack(spacing: 10) {
                ForEach([Fonte.informativoSTF, .informativoSTJ, .informativoTSE]) { f in
                    if let e = store.edicoesInfo(f).first {
                        Button { store.selecao = .infoEdicao(f, e.numero) } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                EtiquetaEstudo(texto: f.nomeCurto, cor: f.cor)
                                Text("nº \(e.numero)").font(.system(size: 24, weight: .heavy, design: .monospaced)).foregroundStyle(Palette.titleInk)
                                Text("\(e.count) verbetes").font(.system(size: 11.5)).foregroundStyle(Palette.secondaryInk)
                            }
                            .padding(14).frame(maxWidth: .infinity, alignment: .leading)
                            .background(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).fill(Palette.cardBackground))
                            .overlay(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).strokeBorder(Palette.hairline))
                        }.buttonStyle(.plain)
                    }
                }
            }
            .padding(.horizontal, 28)
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

    private func chip(_ t: String, on: Bool, _ act: @escaping () -> Void) -> some View {
        Button(action: act) {
            Text(t).font(.system(size: 12, weight: .semibold))
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(Capsule().fill(on ? Palette.accent : Palette.cardBackground))
                .overlay(Capsule().strokeBorder(on ? Palette.accent : Palette.hairline))
                .foregroundStyle(on ? Color.white : Palette.titleInk)
        }.buttonStyle(.plain)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Prova oral").font(.system(size: 30, weight: .heavy)).tracking(-0.6).foregroundStyle(Palette.titleInk)
                Text("Escolha a disciplina e o tribunal, sorteie um verbete do acervo e responda como responderia à banca. A pergunta vem no formato da arguição real (caso hipotético, fundamento, exceção…) e a correção é contra o enunciado oficial — tudo local, sem IA.")
                    .font(.system(size: 13)).foregroundStyle(Palette.secondaryInk)
                // Filtros — o edital por dentro: disciplina, tribunal, assunto.
                VStack(alignment: .leading, spacing: 8) {
                    RotuloEstudo(texto: "Disciplina")
                    Flow {
                        chip("Todas", on: disciplina == nil) { disciplina = nil; assunto = nil }
                        ForEach(store.disciplinasEm(store.entries).prefix(14), id: \.nome) { d in
                            chip("\(d.nome) · \(d.count)", on: disciplina == d.nome) { disciplina = d.nome; assunto = nil }
                        }
                    }
                    RotuloEstudo(texto: "Tribunal")
                    Flow {
                        chip("Todos", on: tribunal == nil) { tribunal = nil }
                        ForEach(tribunais, id: \.self) { t in chip(t, on: tribunal == t) { tribunal = t } }
                    }
                    if disciplina != nil {
                        RotuloEstudo(texto: "Assunto")
                        Flow {
                            chip("Todos", on: assunto == nil) { assunto = nil }
                            ForEach(store.assuntosEm(store.entries.filter { $0.disciplina == disciplina! && (tribunal == nil || $0.tribunal == tribunal!) }).prefix(16), id: \.nome) { a in
                                chip(a.nome, on: assunto == a.nome) { assunto = a.nome }
                            }
                        }
                    }
                    HStack(spacing: 10) {
                        Button { sortear() } label: { Label("Sortear pergunta (\(universo.count) verbetes)", systemImage: "dice") }
                            .buttonStyle(.borderedProminent).tint(Palette.accent).disabled(universo.isEmpty)
                        if escolhido != nil { Button("Voltar ao julgado do dia") { escolhido = nil }.buttonStyle(.bordered) }
                    }
                }
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass").foregroundStyle(Palette.secondaryInk)
                    TextField("Buscar um verbete (ou use o julgado do dia)", text: $busca).textFieldStyle(.plain)
                }
                .padding(.horizontal, 12).padding(.vertical, 9)
                .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Palette.cardBackground))
                .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(Palette.hairline))
                if !candidatos.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        ForEach(candidatos) { e in
                            Button { escolhido = e; busca = "" } label: {
                                VStack(alignment: .leading, spacing: 2) {
                                    Flow { EtiquetaEstudo(texto: e.tribunal, cor: e.fonteKind.cor); Text(e.titulo).font(.system(size: 13.5, weight: .semibold)).foregroundStyle(Palette.titleInk) }
                                    Text(e.enunciado).font(.system(size: 12)).lineLimit(2).foregroundStyle(Palette.secondaryInk)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 13).padding(.vertical, 9)
                                .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Palette.cardBackground))
                                .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(Palette.hairline))
                            }.buttonStyle(.plain)
                        }
                    }
                }
                let alvo = escolhido ?? JulgadoDoDiaView().verbete
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
                        Text(e.titulo).font(.system(size: 19, weight: .heavy)).foregroundStyle(Palette.titleInk)
                        Text(e.enunciado).font(.system(size: 14)).lineSpacing(3).foregroundStyle(Palette.titleInk)
                        ProvaOralView(entry: e).id(e.id)
                    }
                    .padding(20)
                    .background(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).fill(Palette.cardBackground))
                    .overlay(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).strokeBorder(Palette.hairline))
                }
            }
            .padding(.horizontal, 28).padding(.vertical, 24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Palette.appBackground)
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
        let frase = RoteiroLocal.sentencas(RoteiroLocal.limpar(e.enunciado)).first ?? RoteiroLocal.limpar(e.enunciado)
        let falsa = Exporter.afirmacaoFalsaAuto(e.enunciado)
        let fund = RoteiroLocal.fundamentos(e.enunciado + " " + (e.referencias ?? ""))
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
        let doVerbete = RoteiroLocal.fundamentos(e.enunciado + " " + (e.referencias ?? "") + " " + (e.precedentes ?? ""))
        let daResposta = RoteiroLocal.fundamentos(resposta)
        guard !daResposta.isEmpty else { return c }
        func chave(_ f: String) -> String { normaliza(f).replacingOccurrences(of: "[^a-z0-9]", with: "", options: .regularExpression) }
        let setV = Set(doVerbete.map(chave))
        let confirmados = daResposta.filter { setV.contains(chave($0)) || doVerbete.contains { chave($0).hasPrefix(chave($1)) || chave($1).hasPrefix(chave($0)) } }
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
