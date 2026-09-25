import SwiftUI

// =====================================================================================
//  CátedraJURIS — telas de ESTUDO que antes só existiam na versão web:
//    · Grade de informativos (uma edição por quadradinho, verde/âmbar/cinza)
//    · Julgado do dia (sorteio com semente na data — o mesmo dia devolve o mesmo)
//    · Roteiro de estudo do verbete (Em uma frase · Fundamento · Como era · O que decidiu
//      · Pontos que a prova cobra · Pegadinha · quiz) — montado LOCALMENTE (RoteiroLocal)
//    · Prova oral (pergunta e correção locais, ProvaOralLocal — sem IA)
//
//  Peças visuais (RotuloEstudo, BlocoEstudo, EtiquetaEstudo, Flow, chips) moram em
//  Views/Components.swift.
//
//  Cores: fundo/texto/acento seguem o tema do Cátedra (ThemeState); a cor de cada
//  fonte é a do TRIBUNAL (Palette.fonte*). Nada de hex solto aqui.
// =====================================================================================

// MARK: - Roteiro de estudo (modelo + cache)

/// O que a IA devolve para um verbete. Todos os campos opcionais: a IA pode não ter
/// "como era" para um verbete que não mudou nada, e isso é resposta legítima.
struct RoteiroEstudo: Codable, Hashable {
    /// Versão do FORMATO do roteiro. Campo novo opcional não quebra a decodificação do
    /// cache (o compilador sintetiza decodeIfPresent), mas quebraria a ENTREGA: a view só
    /// gera quando `roteiro == nil`, então os até 400 roteiros já gravados continuariam
    /// aparecendo sem o bloco novo, para sempre e sem aviso. Roteiro de versão antiga é
    /// tratado como ausente e regerado — custa milissegundos, é tudo local.
    ///   1 = até o roteiro sem quadro · 2 = com o quadro "Não confunda com"
    ///   3 = quadro com piso de confundibilidade: o de v2 nascia em 99% dos verbetes, com
    ///       trava por tribunal e colunas escolhidas por vocabulário — gravado, continuaria
    ///       na tela mesmo depois do conserto.
    static let versaoAtual = 3

    var versao: Int?
    var nivel: Int?
    var segundaFase: Bool?
    var frase: String?
    var fundamento: String?
    var comoEra: String?
    var decidiu: String?
    var chave: [String]?
    var atencao: String?
    var hoje: String?
    var pegadinha: String?
    var quiz: [QuestaoQuiz]?
    /// O quadro "Não confunda com" (QuadroRelacionados.swift). Substituiu a lista achatada
    /// `jurisprudencia`, que deixou de existir: nenhum roteiro do formato atual a pintava, e
    /// ela ia para o disco em cada roteiro. Chave desconhecida no JSON antigo é ignorada.
    var quadro: QuadroRelacionados?
    /// De que acervo o roteiro saiu (AcervoQuadro.carimbo: "verbetes/notas"). O quadro e a
    /// lista "Do mesmo assunto" dependem do acervo INTEIRO — IDF, temas, vizinhos, curadoria
    /// —, e o roteiro gravado sobrevive à atualização de informativos: sem o carimbo, o
    /// verbete reaberto repintava colunas escolhidas sobre um acervo que não existe mais.
    /// Carimbo diferente = roteiro ausente, regerado; o molde é o do antigo kwCount.
    var acervo: String?
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
    private static var gravando = false
    private static var sujo = false
    private static var aquecendo = false

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

    /// Lê o arquivo FORA da main. Chamado no começo do `load` do acervo, em paralelo com o
    /// decode do corpus: sem isso a primeira consulta — o roteiro do Julgado do dia, na
    /// abertura da aba — decodificava ~1,4 MB na main (medido: 9 a 20 ms). Se alguém ler na
    /// main antes de a leitura destacada voltar (carregar()), vale a de lá e esta é
    /// descartada: nada gravado nesse meio-tempo se perde.
    static func aquecer() {
        guard !carregado, !aquecendo else { return }
        aquecendo = true
        let origem = url
        Task { @MainActor in
            let lido = await Task.detached(priority: .utility) { () -> [String: RoteiroEstudo]? in
                guard let d = try? Data(contentsOf: origem) else { return nil }
                return try? JSONDecoder().decode([String: RoteiroEstudo].self, from: d)
            }.value
            aquecendo = false
            guard !carregado else { return }
            carregado = true
            if let lido { mem = lido }
        }
    }
    static func set(_ id: String, _ r: RoteiroEstudo?) {
        carregar()
        if let r { mem[id] = r } else { mem.removeValue(forKey: id) }
        // teto: 400 mais recentes
        if mem.count > 400 {
            let ordem = mem.sorted { ($0.value.geradoEm ?? .distantPast) < ($1.value.geradoEm ?? .distantPast) }
            for (k, _) in ordem.prefix(mem.count - 400) { mem.removeValue(forKey: k) }
        }
        gravarDepois()
    }

    /// Codificar e gravar o mapa INTEIRO (até 400 roteiros, ~1,4 MB) custava ~11 ms na main
    /// a cada roteiro montado — medido. Agora a main só troca o valor em memória (`mem`
    /// continua sendo a verdade) e o disco recebe uma CÓPIA numa tarefa destacada. Pedidos
    /// que chegam com uma gravação em curso viram uma só, com o estado mais novo: nunca duas
    /// gravações do mesmo arquivo ao mesmo tempo. Se o app fechar no meio, perde-se o último
    /// roteiro — que é local e é refeito na próxima abertura.
    private static func gravarDepois() {
        sujo = true
        guard !gravando else { return }
        gravando = true
        Task { @MainActor in
            while sujo {
                sujo = false
                let copia = mem, destino = url
                await Task.detached(priority: .utility) {
                    if let d = try? JSONEncoder().encode(copia) { try? d.write(to: destino, options: .atomic) }
                }.value
            }
            gravando = false
        }
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
                .padding(.horizontal, 28).padding(.vertical, 24)
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
                    .font(DS.interface(12)).foregroundStyle(Palette.secondaryInk)
            }
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 64), spacing: 7)], spacing: 7) {
                ForEach(eds.prefix(mostrar)) { e in
                    let s = estado(f, e)
                    Button { store.ir(.infoEdicao(f, e.numero)) } label: {
                        VStack(spacing: 1) {
                            Text("\(e.numero)").font(Typo.num(14, .heavy))
                            Text(s.lidos > 0 ? "\(s.lidos)/\(s.total)" : "\(s.total)")
                                .font(DS.interface(9, .bold))
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
                    conteudo.padding(.horizontal, 28).padding(.vertical, 24)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        } else {
            conteudo.padding(.horizontal, 28)
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
            Text(e.titulo).font(DS.interface(21, .heavy)).tracking(-0.3).foregroundStyle(Palette.titleInk)
            Text(e.enunciado).font(DS.interface(15)).lineSpacing(4).foregroundStyle(Palette.titleInk)
                .textSelection(.enabled)
            if let fp = e.fontePublicacao { Text(fp).font(DS.interface(11.5)).foregroundStyle(Palette.secondaryInk) }
            HStack(spacing: 9) {
                Button("Abrir no leitor") { store.lerCheio(e.id) }.buttonStyle(.borderedProminent).tint(Palette.accent)
                Button(mostrarOral ? "Fechar prova oral" : "Modo prova oral") { mostrarOral.toggle() }.buttonStyle(.bordered).tint(Palette.accent)
                Button(store.dominados.contains(e.id) ? "✓ Dominado" : "Marcar como dominado") {
                    if store.dominados.contains(e.id) { store.dominados.remove(e.id) } else { store.dominados.insert(e.id) }
                }.buttonStyle(.bordered).tint(Palette.accent)
            }
            if mostrarOral { ProvaOralView(entry: e) }
            // O destaque do dia é o ÚNICO lugar que gera o roteiro sozinho, sem esperar
            // clique — é justamente o "visual e explicação nos julgados" (Em uma frase,
            // Fundamento, Como era, O que decidiu, Pegadinha, quiz), pedido para aparecer
            // já na abertura. Em qualquer outro verbete continua sob demanda.
            RoteiroEstudoView(entry: e, autoGerar: true)
        }
        .padding(22)
        .background(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).fill(Palette.cardBackground))
        // Sem o filete de 4 pt na lateral: faixa colorida na lateral é proibida na casa (o iPad
        // tirou a dele no PR #83, e o BlocoEstudo daqui já perdeu a sua). A cor do ramo segue
        // na etiqueta logo acima.
        .overlay(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).strokeBorder(Palette.hairline))
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
    /// true quando a PÁGINA já lista os julgados vizinhos mais abaixo (o detalhe do verbete
    /// tem a seção própria): aí o quadro não repete a lista "Do mesmo assunto", senão a
    /// mesma rolagem mostra duas vezes o mesmo conjunto.
    var vizinhosAbaixo: Bool = false
    /// Avisa a página de qual quadro está NA TELA: o detalhe do verbete tira dele a seção
    /// "Do mesmo assunto" e o aviso de tese superada. É o mesmo objeto pintado aqui — antes
    /// o detalhe montava o quadro de novo por conta própria (a segunda varredura do acervo
    /// por abertura, na main), e com o roteiro vindo do cache as duas listas discordavam.
    var aoMudarQuadro: ((QuadroRelacionados?) -> Void)? = nil
    @State private var roteiro: RoteiroEstudo?
    /// O verbete cujo roteiro está sendo montado agora. Por id, e não um Bool: a montagem
    /// roda fora da main e volta depois, e a pessoa pode ter trocado de verbete no meio — o
    /// verbete novo não pode ficar sem roteiro porque o anterior ainda estava "montando".
    @State private var montandoID: String?
    /// O verbete que a view mostra AGORA (a struct que a tarefa capturou pode ser a de antes):
    /// o roteiro que volta de outro verbete vai só para o cache.
    @State private var idNaTela: String?
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
                    .font(DS.interface(12)).foregroundStyle(Palette.secondaryInk)
                if let erro { Text(erro).font(DS.interface(12)).foregroundStyle(Palette.bad) }
                if mostrarOral { ProvaOralView(entry: entry) }
            }
        }
        .onAppear { idNaTela = entry.id; publicar(doCache(entry.id)) }
        .onChange(of: entry.id) { _, novo in
            idNaTela = novo; publicar(doCache(novo)); respostas = [:]; enviouFlash = false; erro = nil
        }
        // O carimbo do acervo entra na chave: quando uma atualização troca o acervo com a
        // página aberta, a tarefa roda de novo, o cache recusa o roteiro montado sobre o
        // acervo anterior e ele é refeito.
        .task(id: entry.id + "#" + store.carimboAcervo) {
            publicar(doCache(entry.id))
            if autoGerar, roteiro == nil, montandoID != entry.id { await gerar() }
        }
    }

    private var gerando: Bool { montandoID == entry.id }

    /// O roteiro na tela, e o quadro dele para a página (aoMudarQuadro).
    private func publicar(_ r: RoteiroEstudo?) {
        roteiro = r
        aoMudarQuadro?(r?.quadro)
    }

    /// O cache só vale se for do formato de hoje E do acervo de agora: roteiro de versão
    /// anterior, ou montado sobre outro acervo, é tratado como ausente e regerado. É o que
    /// faz o quadro novo chegar a quem já abriu o verbete antes. Com o acervo recarregando
    /// (o `reload` zera os verbetes por um instante) não há como julgar o carimbo: vale o
    /// gravado, e a tarefa confere de novo quando o acervo volta.
    private func doCache(_ id: String) -> RoteiroEstudo? {
        guard let r = RoteiroCache.get(id), r.versao == RoteiroEstudo.versaoAtual else { return nil }
        if store.isLoading || store.entries.isEmpty { return r }
        return r.acervo == store.carimboAcervo ? r : nil
    }

    // Sem IA: o roteiro sai do próprio verbete e do acervo (RoteiroLocal) — off-line, sem
    // custo, igual em todos os aparelhos. E FORA da main: a montagem varre o acervo e roda
    // numa tarefa destacada, sobre o retrato do store (AcervoQuadro); aqui fica só publicar.
    // Antes rodava inteira na main, junto com a gravação do cache.
    private func gerar() async {
        guard let acervo = store.acervoParaQuadro() else { return }   // acervo ainda carregando
        let e = entry
        montandoID = e.id; erro = nil
        defer { if montandoID == e.id { montandoID = nil } }
        let r = await Task.detached(priority: .userInitiated) { RoteiroLocal.gerar(e, acervo: acervo) }.value
        // Montado, vai para o cache de qualquer jeito; para a tela, só se ela ainda mostra
        // este verbete (a tarefa é cancelada quando a pessoa troca de verbete ou sai).
        RoteiroCache.set(e.id, r)
        guard !Task.isCancelled, idNaTela == e.id else { return }
        publicar(r)
    }

    @ViewBuilder private func conteudo(_ r: RoteiroEstudo) -> some View {
        Flow {
            if let n = r.nivel { EtiquetaEstudo(texto: "Nível \(n)") }
            if r.segundaFase == true { EtiquetaEstudo(texto: "2ª fase") }
        }
        if let t = r.frase, !t.isEmpty { BlocoEstudo(rotulo: "Em uma frase") { Text(t).fontWeight(.semibold) } }
        if let t = r.fundamento, !t.isEmpty { BlocoEstudo(rotulo: "Fundamento", cor: Palette.secondaryInk) { Text(t) } }
        if let t = r.comoEra, !t.isEmpty { BlocoEstudo(rotulo: "Como era", cor: Palette.warn) { Text(t) } }
        if let t = r.decidiu, !t.isEmpty { BlocoEstudo(rotulo: "O que decidiu", cor: Palette.ok) { Text(t) } }
        if let l = r.chave, !l.isEmpty { lista("Pontos que a prova cobra", l, cor: Palette.accent) }
        // Os julgados vizinhos: QUADRO quando o acervo sustenta a comparação, senão a lista
        // "Do mesmo assunto" — quem decide é o próprio QuadroRelacionadosView.
        if let q = r.quadro, !q.vazio {
            QuadroRelacionadosView(quadro: q, listaAqui: !vizinhosAbaixo)
        }
        if let t = r.atencao, !t.isEmpty { BlocoEstudo(rotulo: "Atenção", cor: Palette.warn) { Text(t) } }
        if let t = r.hoje, !t.isEmpty { BlocoEstudo(rotulo: "O que vale hoje", cor: Palette.ok) { Text(t) } }
        if let t = r.pegadinha, !t.isEmpty { BlocoEstudo(rotulo: "Pegadinha de prova", cor: Palette.bad) { Text(t).fontWeight(.medium) } }
        if let q = r.quiz, !q.isEmpty { quiz(q) }
        HStack(spacing: 9) {
            Button(mostrarOral ? "Fechar prova oral" : "Modo prova oral") { mostrarOral.toggle() }.buttonStyle(.bordered)
            Button("Refazer") {
                RoteiroCache.set(entry.id, nil); publicar(nil); respostas = [:]; enviouFlash = false
                // Na página que monta sozinha, refazer é montar de novo: o quadro e a seção
                // "Do mesmo assunto" da página, que lê este mesmo quadro, sumiriam até um
                // segundo clique.
                if autoGerar { Task { await gerar() } }
            }
            .buttonStyle(.plain).foregroundStyle(Palette.secondaryInk)
        }
        if mostrarOral { ProvaOralView(entry: entry) }
        Text("Roteiro montado localmente a partir do enunciado oficial e do acervo (sem IA) — confira os números antes de decorar.")
            .font(DS.interface(11)).italic().foregroundStyle(Palette.secondaryInk)
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
                    Text("\(i + 1). \(q.en)").font(DS.interface(14)).foregroundStyle(Palette.titleInk)
                    ForEach(Array(q.alts.enumerated()), id: \.offset) { j, a in
                        let resp = respostas[i]
                        let certa = (j == q.ok), escolhida = (resp == j)
                        Button {
                            if respostas[i] == nil { respostas[i] = j }
                        } label: {
                            HStack(alignment: .top, spacing: 8) {
                                Text(String(Character(UnicodeScalar(UInt8(65 + min(j, 25))))) + ")").font(Typo.num(13))
                                Text(a).font(DS.interface(13)).multilineTextAlignment(.leading)
                                Spacer(minLength: 0)
                            }
                            .padding(.horizontal, 12).padding(.vertical, 8)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .foregroundStyle(resp == nil ? Palette.titleInk : (certa ? Palette.okInk : (escolhida ? Palette.badInk : Palette.secondaryInk)))
                            .background(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous)
                                .fill(resp == nil ? Palette.cardBackground : (certa ? Palette.ok.opacity(0.12) : (escolhida ? Palette.bad.opacity(0.12) : Palette.cardBackground))))
                            .overlay(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous)
                                .strokeBorder(resp == nil ? Palette.hairline : (certa ? Palette.ok : (escolhida ? Palette.bad : Palette.hairline)), lineWidth: 1.5))
                        }
                        .buttonStyle(.plain).disabled(resp != nil)
                    }
                    if let resp = respostas[i], let fb = q.fb {
                        let acertou = resp == q.ok
                        BlocoEstudo(rotulo: acertou ? "Certo" : "Errado", cor: acertou ? Palette.ok : Palette.bad) { Text(fb) }
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
            Text(pergunta).font(DS.interface(15.5, .semibold)).lineSpacing(3).foregroundStyle(Palette.titleInk)
            // A resposta digitada é RASCUNHO por verbete (JurisRascunhoCache): navegar
            // ⌘→ para o próximo verbete ou trocar de aba e voltar não apaga o que foi escrito.
            TextEditor(text: $resposta)
                .font(DS.interface(14)).frame(minHeight: 110)
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
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if parte != .informativos {
            JulgadoDoDiaView()
            }
            if parte != .julgado {
            JurisSecaoTitulo(titulo: "Últimos informativos", simbolo: "newspaper",
                             verTodos: { store.ir(.gradeInformativos) })
            .padding(.horizontal, 28)
            HStack(spacing: 10) {
                ForEach([Fonte.informativoSTF, .informativoSTJ, .informativoTSE]) { f in
                    if let e = store.edicoesInfo(f).first {
                        Button { store.ir(.infoEdicao(f, e.numero)) } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                EtiquetaEstudo(texto: f.nomeCurto, cor: f.cor)
                                Text("nº \(e.numero)").font(Typo.num(24, .heavy)).foregroundStyle(Palette.titleInk)
                                Text("\(e.count) verbetes").font(DS.interface(11.5)).foregroundStyle(Palette.secondaryInk)
                            }
                            .padding(14).frame(maxWidth: .infinity, alignment: .leading)
                            .background(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).fill(Palette.cardBackground))
                            .overlay(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).strokeBorder(Palette.hairline))
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
                        Text(e.titulo).font(DS.interface(19, .heavy)).foregroundStyle(Palette.titleInk)
                        Text(e.enunciado).font(DS.interface(14)).lineSpacing(3).foregroundStyle(Palette.titleInk)
                        ProvaOralView(entry: e).id(e.id)
                    }
                    .padding(20)
                    .background(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).fill(Palette.cardBackground))
                    .overlay(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).strokeBorder(Palette.hairline))
                }
            }
            .padding(.horizontal, 28).padding(.vertical, 24)
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
