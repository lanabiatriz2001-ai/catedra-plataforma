import Foundation
import SwiftUI
import Observation

/// Resumo de uma edição do Juris em Teses para a navegação por edições.
struct EdicaoJT: Identifiable, Hashable {
    let numero: Int
    let tema: String
    let count: Int
    var id: Int { numero }
}

/// Resumo de uma edição de informativo (STF/STJ/TSE).
struct InfoEdicao: Identifiable, Hashable {
    let numero: Int
    let count: Int
    let data: String?
    var id: Int { numero }
}

/// Índices derivados do corpus (busca, contagens, edições, índice remissivo). Calculados
/// FORA da main em `LibraryStore.load` e só então publicados no store — no arquivo, não
/// dentro da classe, para não herdar isolamento de ator.
private struct JurisIndices {
    var byId: [String: JurisEntry] = [:]
    var blobs: [String: String] = [:]
    var fonteCounts: [Fonte: Int] = [:]
    var ramosOrdenados: [(nome: String, count: Int)] = []
    var disciplinasOrdenadas: [(nome: String, count: Int)] = []
    var topicosPorDisciplina: [String: [(nome: String, count: Int)]] = [:]
    var edicoesJT: [EdicaoJT] = []
    var infoEdicoes: [String: [InfoEdicao]] = [:]
    var indice: [(letra: String, itens: [IndiceItem])] = []
}

/// Tudo o que o carregamento produz fora da main: verbetes, erro, índices e o índice de
/// termos do Comparador e dos Relacionados (IndiceTermos).
private struct JurisCarga {
    var items: [JurisEntry]
    var error: String?
    var indices: JurisIndices
    var termos = IndiceTermos()
}

@Observable
@MainActor
final class LibraryStore {
    // Dados
    private(set) var entries: [JurisEntry] = []
    private var blobs: [String: String] = [:]         // id -> texto de busca (sem acento)
    private(set) var byId: [String: JurisEntry] = [:]
    private(set) var isLoading = true
    private(set) var loadError: String?

    // Contagens para a barra lateral
    private(set) var fonteCounts: [Fonte: Int] = [:]
    private(set) var ramosOrdenados: [(nome: String, count: Int)] = []
    private(set) var disciplinasOrdenadas: [(nome: String, count: Int)] = []
    private(set) var topicosPorDisciplina: [String: [(nome: String, count: Int)]] = [:]
    private(set) var edicoesJT: [EdicaoJT] = []
    private(set) var indice: [(letra: String, itens: [IndiceItem])] = []
    private(set) var infoEdicoes: [String: [InfoEdicao]] = [:]   // fonte -> edições (desc)

    // Estado da interface
    var selecao: Selecao = .inicio {
        didSet { leituraID = nil }   // navegar pela barra sai da leitura imersiva
    }
    var searchText: String = ""
    var ordenacao: Ordenacao = .relevancia
    var filtro: Filtro = .todos
    var selectedID: String?
    var leituraID: String?           // verbete em leitura tela cheia (a partir da home)

    // Persistência
    var favorites: Set<String> = [] { didSet { persist() } }
    var marcadosImportantes: Set<String> = [] { didSet { persist() } }
    var richNotes: [String: Data] = [:] { didSet { persist() } }          // RTF por verbete
    var marks: [String: [TextMark]] = [:] { didSet { persist() } }        // marcações no enunciado
    var colecoes: [Colecao] = [] { didSet { persist() } }                 // "Meu edital"
    var lidos: Set<String> = [] { didSet { persist() } }                  // marcados como lidos
    var dominados: Set<String> = [] { didSet { persist() } }              // revisão: "já sei"
    var afirmacoesFalsas: [String: String] = [:] { didSet { persist() } } // versão ERRADA p/ card Certo/Errado
    var metaDiaria: Int = 20 { didSet { persist() } }                     // meta de verbetes lidos por dia
    var leiturasPorDia: [String: Int] = [:] { didSet { persist() } }      // "AAAA-MM-DD" -> nº de leituras (streak/meta)
    var coresFavoritas: [String] = MarkColor.padrao { didSet { persist() } } // paleta de grifo (hex) editável
    var alinhamentos: [String: String] = [:] { didSet { persist() } }     // alinhamento do enunciado por verbete
    var textosEditados: [String: String] = [:] { didSet { persist() } }   // enunciado editado pelo usuário
    var srs: [String: JurisSRSCard] = [:] { didSet { persist() } }             // baralho de revisão espaçada (id do verbete)
    /// Campos da galeria de mapas (saiu em 25/09/2026): lidos do disco só para voltarem a ele.
    private var legadoGaleria = JurisEstadoPersistido.LegadoGaleria()
    var tribunaisCustom: [TribunalCustom] = [] { didSet { persist() } }   // centrais de tribunal cadastradas
    var readingChecklist: [ReadingChecklistItem] = [] { didSet { persist() } }  // checklist de leitura PRÓPRIA do JURIS (não compartilhada com o LEGIS)
    private(set) var recents: [String] = []
    var editalDisciplinas: [String] = []  // espelho AO VIVO das matérias do edital do Cátedra (não persistido; vem do host a cada abertura da aba)

    var checklistPendingCount: Int { readingChecklist.filter { !$0.done }.count }

    /// NAVEGAÇÃO ÚNICA: toda troca de página passa por aqui (sidebar, Home, painel,
    /// hubs). Zera a busca global e sai da leitura — antes havia cinco cópias desta
    /// função e a Home navegava sem limpar o `searchText`, abrindo Favoritos já
    /// filtrados por um termo antigo sem aviso.
    func ir(_ s: Selecao) {
        searchText = ""
        leituraID = nil
        selectedID = nil
        selecao = s
    }

    /// Adiciona uma meta de leitura livre. Pode ser vinculada a uma matéria (do
    /// edital ou de "Ramos do Direito") via linkedCategoryLabel — sem vínculo a
    /// norma (linkedLawID fica sempre nil aqui, é conceito exclusivo do LEGIS).
    func addChecklistItem(_ text: String, dueDate: Date? = nil, linkedCategoryLabel: String? = nil) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        readingChecklist.insert(ReadingChecklistItem(text: trimmed, dueDate: dueDate, linkedCategoryLabel: linkedCategoryLabel), at: 0)
    }
    func toggleChecklistItem(_ id: UUID) {
        guard let i = readingChecklist.firstIndex(where: { $0.id == id }) else { return }
        readingChecklist[i].done.toggle()
        readingChecklist[i].doneAt = readingChecklist[i].done ? Date() : nil
        if readingChecklist[i].done {
            let item = readingChecklist[i]
            NotificationCenter.default.post(name: ChecklistSyncBridge.itemDone, object: nil, userInfo: [
                "origem": "CátedraJURIS", "categoria": item.linkedCategoryLabel as Any, "texto": item.text,
            ])
        }
    }
    func removeChecklistItem(_ id: UUID) {
        readingChecklist.removeAll { $0.id == id }
    }
    /// Reagenda (ou remove) o prazo de uma meta — o "adiar em 1 clique" do checklist.
    func setChecklistDue(_ id: UUID, _ date: Date?) {
        guard let i = readingChecklist.firstIndex(where: { $0.id == id }) else { return }
        readingChecklist[i].dueDate = date
    }
    func clearCompletedChecklistItems() {
        readingChecklist.removeAll { $0.done }
    }
    /// Chamado pelo host (main.swift) ao abrir a aba do CátedraJURIS, lendo o edital do Cátedra via JS.
    func setEditalDisciplinas(_ names: [String]) {
        editalDisciplinas = names
    }

    static let srsCalendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/Sao_Paulo") ?? .current
        return c
    }()

    private var appSupportDir: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("VadeMecumJuris", isDirectory: true)
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        return base
    }
    private var stateURL: URL { appSupportDir.appendingPathComponent("state.json") }
    /// Verbetes baixados pela atualização online (mesclados ao corpus no load).
    var onlineCorpusURL: URL { appSupportDir.appendingPathComponent("corpus-online.json") }
    var novidadesURL: URL { appSupportDir.appendingPathComponent("novidades.json") }

    // Novidades (atualização online)
    private(set) var novidades: [NovidadeEvent] = []
    var lastSeenNovidade: Double {
        get { UserDefaults.standard.double(forKey: "lastSeenNovidade") }
        set { UserDefaults.standard.set(newValue, forKey: "lastSeenNovidade") }
    }
    var novidadesNaoVistas: Int { novidades.filter { $0.timestamp > lastSeenNovidade }.count }
    func novidadeNaoVista(_ n: NovidadeEvent) -> Bool { n.timestamp > lastSeenNovidade }
    func marcarNovidadesVistas() {
        if let t = novidades.map(\.timestamp).max() { lastSeenNovidade = t }
    }

    init() {
        loadState()
        registrarFlushNoCicloDeVida()
    }

    // MARK: - Carregamento do corpus

    func load() async {
        let onlineURL = onlineCorpusURL
        // O roteiro de estudo saiu do app (03/10/2026): o que ele tinha guardado em disco sai junto.
        Self.apagarRoteirosGuardados()
        // TUDO o que pesa roda fora da main: ler e decodificar ~35 MB de JSON (corpus +
        // Central de Contas), montar os índices (o blob de busca dobra o texto inteiro
        // sem acento — era isso, feito na main depois do decode, que congelava a aba por
        // segundos na primeira abertura), as notas de estudo (2,5 MB) e o índice de termos.
        // Na main fica só a publicação no store.
        let carga: JurisCarga = await Task.detached(priority: .userInitiated) {
            guard let url = Self.corpusURL() else {
                return JurisCarga(items: [], error: "corpus.json não encontrado no bundle.",
                                  indices: JurisIndices())
            }
            do {
                let data = try Data(contentsOf: url)
                var items = try JSONDecoder().decode([JurisEntry].self, from: data)
                // mescla o overlay de atualizações online (ids novos apenas)
                if let od = try? Data(contentsOf: onlineURL),
                   let extra = try? JSONDecoder().decode([JurisEntry].self, from: od) {
                    var seen = Set(items.map(\.id))
                    for e in extra where !seen.contains(e.id) {
                        items.append(e); seen.insert(e.id)
                    }
                }
                // Central de Contas (TCU + tribunais de contas estaduais): corpus
                // SEPARADO, gerado por scripts/build-contas-nativo.mjs a partir dos
                // mesmos dados que a web usa. Fica em arquivo próprio para o corpus de
                // STF/STJ/TSE poder ser regerado sem tocar neste, e para o app abrir
                // normalmente se um dos dois não estiver no bundle.
                if let cu = Self.resourceURL("corpus-contas", ext: "json"),
                   let cd = try? Data(contentsOf: cu),
                   let contas = try? JSONDecoder().decode([JurisEntry].self, from: cd) {
                    var vistos = Set(items.map(\.id))
                    for e in contas where !vistos.contains(e.id) {
                        items.append(e); vistos.insert(e.id)
                    }
                }
                // Os três derivados não dependem um do outro: montados em PARALELO. O índice
                // de termos (IndiceTermos) é o mais caro deles e ia para a main na primeira
                // abertura de verbete — o mesmo congelamento de segundos que este `load` já
                // tinha caçado no blob de busca. Em paralelo, o carregamento termina quando
                // termina o mais lento, e não na soma dos três.
                let todos = items
                async let indices = Self.construirIndices(todos)
                async let termos = IndiceTermos.montar(todos)
                return await JurisCarga(items: todos, error: nil,
                                        indices: indices, termos: termos)
            } catch {
                return JurisCarga(items: [], error: "Falha ao ler corpus.json: \(error.localizedDescription)",
                                  indices: JurisIndices())
            }
        }.value

        self.entries = carga.items
        self.loadError = carga.error
        aplicar(carga.indices)
        self.termos = carga.termos
        loadNovidades()
        self.isLoading = false
    }

    /// Os dois arquivos em que o roteiro de estudo ficava guardado (o escrito por IA e o
    /// montado no aparelho). Chamado fora da main, no `load`; arquivo ausente não é erro.
    nonisolated private static func apagarRoteirosGuardados() {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("VadeMecumJuris", isDirectory: true)
        for nome in ["roteiros-estudo.json", "roteiros-estudo-local.json"] {
            try? FileManager.default.removeItem(at: base.appendingPathComponent(nome))
        }
    }

    private func loadNovidades() {
        guard let data = try? Data(contentsOf: novidadesURL),
              let evs = try? JSONDecoder().decode([NovidadeEvent].self, from: data) else { return }
        novidades = evs.sorted { $0.timestamp > $1.timestamp }
    }

    /// Registra eventos de novidade (chamado pela atualização online).
    func registrarNovidades(_ novos: [NovidadeEvent]) {
        guard !novos.isEmpty else { return }
        var all = novidades
        let existentes = Set(all.map(\.id))
        all.insert(contentsOf: novos.filter { !existentes.contains($0.id) }, at: 0)
        all.sort { $0.timestamp > $1.timestamp }
        if all.count > 300 { all = Array(all.prefix(300)) }
        novidades = all
        if let data = try? JSONEncoder().encode(all) {
            try? data.write(to: novidadesURL, options: .atomic)
        }
    }

    /// Verbetes de uma novidade, resolvidos no corpus.
    func verbetes(de novidade: NovidadeEvent) -> [JurisEntry] {
        novidade.ids.compactMap { byId[$0] }
    }

    /// Julgados de um informativo agrupados por disciplina (para o feed de Novidades).
    func julgadosAgrupados(_ novidade: NovidadeEvent) -> [(disciplina: String, itens: [JurisEntry])] {
        var dict: [String: [JurisEntry]] = [:]
        for e in verbetes(de: novidade) { dict[e.disciplina, default: []].append(e) }
        return dict
            .map { (disciplina: $0.key, itens: $0.value.sorted { ($0.tema ?? "") < ($1.tema ?? "") }) }
            .sorted { $0.itens.count != $1.itens.count ? $0.itens.count > $1.itens.count : $0.disciplina < $1.disciplina }
    }

    /// Tópicos (assuntos) mais frequentes dentro de uma disciplina — PRÉ-COMPUTADO no indexAll.
    func topicosDe(_ disciplina: String, limite: Int = 45) -> [(nome: String, count: Int)] {
        Array((topicosPorDisciplina[disciplina] ?? []).prefix(limite))
    }

    /// Recarrega após uma atualização online bem-sucedida.
    func reload() async {
        isLoading = true
        entries = []
        await load()
    }

    /// Procura o corpus em vários locais para funcionar tanto via `swift run`
    /// quanto dentro de um `.app` empacotado.
    nonisolated static func corpusURL() -> URL? {
        if let u = Bundle.main.url(forResource: "corpus", withExtension: "json") { return u }
        if let u = Bundle.main.url(forResource: "corpus", withExtension: "json") { return u }
        let candidate = Bundle.main.bundleURL.appendingPathComponent("corpus.json")
        if FileManager.default.fileExists(atPath: candidate.path) { return candidate }
        return nil
    }

    /// Monta os índices a partir dos verbetes — função PURA, chamada fora da main no `load`.
    /// (Era o `indexAll()` de instância, rodando na main depois do decode.)
    nonisolated private static func construirIndices(_ entries: [JurisEntry]) -> JurisIndices {
        var byId = [String: JurisEntry](minimumCapacity: entries.count)
        var blobs = [String: String](minimumCapacity: entries.count)
        var fonteCounts: [Fonte: Int] = [:]
        var ramoCounts: [String: Int] = [:]
        var discCounts: [String: Int] = [:]
        var temasPorDisc: [String: [String: Int]] = [:]
        var edicoes: [Int: (tema: String, count: Int)] = [:]
        var infoEd: [String: [Int: (count: Int, data: String?)]] = [:]
        for e in entries {
            byId[e.id] = e
            blobs[e.id] = e.searchBlob
            fonteCounts[e.fonteKind, default: 0] += 1
            if let r = e.ramoDireito, !r.isEmpty {
                ramoCounts[r, default: 0] += 1
                let disc = e.disciplina
                discCounts[disc, default: 0] += 1
                if let t = e.tema, !t.isEmpty { temasPorDisc[disc, default: [:]][t, default: 0] += 1 }
            }
            if e.fonteKind == .jurisEmTeses, let ed = e.numero {
                var cur = edicoes[ed] ?? (tema: e.tema ?? "Edição \(ed)", count: 0)
                cur.count += 1
                if cur.tema.isEmpty, let t = e.tema { cur.tema = t }
                edicoes[ed] = cur
            }
            if e.fonteKind.navegaPorEdicao, e.fonteKind != .jurisEmTeses, let n = e.numero {
                var cur = infoEd[e.fonteKind.rawValue]?[n] ?? (count: 0, data: e.data)
                cur.count += 1
                if cur.data == nil { cur.data = e.data }
                infoEd[e.fonteKind.rawValue, default: [:]][n] = cur
            }
        }
        var out = JurisIndices()
        out.byId = byId
        out.blobs = blobs
        out.fonteCounts = fonteCounts
        out.ramosOrdenados = ramoCounts
            .map { (nome: $0.key, count: $0.value) }
            .sorted { $0.count != $1.count ? $0.count > $1.count : $0.nome < $1.nome }
        out.disciplinasOrdenadas = discCounts
            .map { (nome: $0.key, count: $0.value) }
            .sorted { $0.count != $1.count ? $0.count > $1.count : $0.nome < $1.nome }
        out.topicosPorDisciplina = temasPorDisc.mapValues { dict in
            dict.map { (nome: $0.key, count: $0.value) }
                .sorted { $0.count != $1.count ? $0.count > $1.count : $0.nome < $1.nome }
        }
        out.edicoesJT = edicoes
            .map { EdicaoJT(numero: $0.key, tema: $0.value.tema, count: $0.value.count) }
            .sorted { $0.numero > $1.numero }
        out.infoEdicoes = infoEd.mapValues { dict in
            dict.map { InfoEdicao(numero: $0.key, count: $0.value.count, data: $0.value.data) }
                .sorted { $0.numero > $1.numero }
        }
        out.indice = carregarIndiceRemissivo()
        return out
    }

    /// Publica no store os índices calculados fora da main.
    private func aplicar(_ i: JurisIndices) {
        byId = i.byId
        blobs = i.blobs
        fonteCounts = i.fonteCounts
        ramosOrdenados = i.ramosOrdenados
        disciplinasOrdenadas = i.disciplinasOrdenadas
        topicosPorDisciplina = i.topicosPorDisciplina
        edicoesJT = i.edicoesJT
        infoEdicoes = i.infoEdicoes
        indice = i.indice
    }

    private func fold(_ s: String) -> String {
        s.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
    }

    /// Índice REMISSIVO por TERMO (palavra-chave): carrega o PRÉ-COMPUTADO (indice.json).
    nonisolated private static func carregarIndiceRemissivo() -> [(letra: String, itens: [IndiceItem])] {
        guard let url = Self.resourceURL("indice", ext: "json"),
              let data = try? Data(contentsOf: url) else { return [] }
        struct Raw: Decodable { let termo: String; let count: Int; let letra: String }
        guard let raws = try? JSONDecoder().decode([Raw].self, from: data) else { return [] }
        var grupos: [String: [IndiceItem]] = [:]
        var ordem: [String] = []
        for r in raws {
            if grupos[r.letra] == nil { ordem.append(r.letra) }
            grupos[r.letra, default: []].append(IndiceItem(tema: r.termo, count: r.count))
        }
        return ordem.sorted().map { (letra: $0, itens: grupos[$0] ?? []) }
    }

    nonisolated static func resourceURL(_ name: String, ext: String) -> URL? {
        if let u = Bundle.main.url(forResource: name, withExtension: ext) { return u }
        if let u = Bundle.main.url(forResource: name, withExtension: ext) { return u }
        let c = Bundle.main.bundleURL.appendingPathComponent("\(name).\(ext)")
        if FileManager.default.fileExists(atPath: c.path) { return c }
        if let cu = corpusURL() {
            let sib = cu.deletingLastPathComponent().appendingPathComponent("\(name).\(ext)")
            if FileManager.default.fileExists(atPath: sib.path) { return sib }
        }
        return nil
    }

    /// Letras disponíveis no índice (para o "trilho" A-Z).
    var letrasIndice: [String] { indice.map(\.letra) }

    // MARK: - Resultados

    var totalCount: Int { entries.count }

    /// A seleção atual é uma edição de Juris em Teses?
    var edicaoAtual: EdicaoJT? {
        if case .edicao(let n) = selecao {
            return edicoesJT.first { $0.numero == n }
        }
        return nil
    }

    /// Base do escopo selecionado (sem busca nem filtro).
    private var escopo: [JurisEntry] {
        switch selecao {
        case .todos:
            return entries
        case .favoritos:
            return entries.filter { favorites.contains($0.id) }
        case .anotacoes:
            return entries.filter { hasAnnotation($0.id) }
        case .inicio, .hoje, .indice, .novidades, .tjroHub, .checklist, .plano, .gradeInformativos, .julgadoDoDia, .provaOral, .oralBancas, .simulado:
            return []   // views dedicadas cuidam da navegação
        case .fonte(let f):
            return entries.filter { $0.fonteKind == f }
        case .ramo(let r):
            return entries.filter { $0.disciplina == r }
        case .tema(let termo):
            // "assunto" = verbetes que contêm o termo (índice remissivo)
            let f = fold(termo)
            return entries.filter {
                guard let b = blobs[$0.id] else { return false }
                return (b as NSString).range(of: f, options: .literal).location != NSNotFound
            }
        case .edicao(let n):
            return entries.filter { $0.fonteKind == .jurisEmTeses && $0.numero == n }
        case .infoEdicao(let f, let n):
            return entries.filter { $0.fonteKind == f && $0.numero == n }
        case .colecao(let id):
            guard let c = colecoes.first(where: { $0.id == id }) else { return [] }
            return c.ids.compactMap { byId[$0] }
        case .central(let c):
            return entries.filter { $0.fonteKind.central == c }
        case .tribunal, .ramosHub, .ramoDetalhe, .destino, .meuMaterial:
            return []   // páginas-hub próprias
        case .filtro(let f):
            return entriesFiltradas(f)
        }
    }

    /// Aplica um recorte combinado (central/tribunal → disciplina → tipo/assunto).
    func entriesFiltradas(_ f: EscopoFiltrado) -> [JurisEntry] {
        var base: [JurisEntry]
        if let t = f.tribunal { base = entriesDoTribunal(t) }
        else if let c = f.central { base = entries.filter { $0.fonteKind.central == c } }
        else { base = entries }
        if let r = f.ramo { base = base.filter { $0.disciplina == r } }
        if let fo = f.fonte { base = base.filter { $0.fonteKind == fo } }
        if let tm = f.tema { base = base.filter { $0.tema == tm } }
        return base
    }

    /// Disciplinas presentes num conjunto, com contagem (desc).
    func disciplinasEm(_ base: [JurisEntry]) -> [(nome: String, count: Int)] {
        var d: [String: Int] = [:]
        for e in base { d[e.disciplina, default: 0] += 1 }
        return d.map { (nome: $0.key, count: $0.value) }
            .sorted { $0.count != $1.count ? $0.count > $1.count : $0.nome < $1.nome }
    }

    /// Assuntos (campo tema) presentes num conjunto, com contagem (desc).
    func assuntosEm(_ base: [JurisEntry]) -> [(nome: String, count: Int)] {
        var d: [String: Int] = [:]
        for e in base { if let t = e.tema, !t.isEmpty { d[t, default: 0] += 1 } }
        return d.map { (nome: $0.key, count: $0.value) }
            .sorted { $0.count != $1.count ? $0.count > $1.count : $0.nome < $1.nome }
    }

    /// Tipos de jurisprudência (fontes) presentes num conjunto, na ordem canônica.
    func fontesEm(_ base: [JurisEntry]) -> [(fonte: Fonte, count: Int)] {
        var d: [Fonte: Int] = [:]
        for e in base { d[e.fonteKind, default: 0] += 1 }
        return Fonte.ordem.compactMap { f in
            guard let c = d[f], c > 0 else { return nil }
            return (fonte: f, count: c)
        }
    }

    // MARK: - Tribunais específicos (uma central por tribunal)

    /// Todas as centrais de tribunal: as embutidas + as cadastradas pela usuária.
    var tribunais: [TribunalEspecifico] {
        TribunalEspecifico.embutidos + tribunaisCustom.map {
            TribunalEspecifico(id: $0.id, nome: "Central \($0.sigla.uppercased())",
                               sigla: $0.sigla.uppercased(), detalhe: $0.nome,
                               fontes: [], aoVivo: false, custom: true)
        }
    }
    func tribunal(_ id: String) -> TribunalEspecifico? { tribunais.first { $0.id == id } }

    @discardableResult
    func criarTribunal(nome: String, sigla: String) -> TribunalCustom {
        let t = TribunalCustom(nome: nome, sigla: sigla)
        tribunaisCustom.append(t)
        return t
    }
    func excluirTribunal(_ id: String) { tribunaisCustom.removeAll { $0.id == id } }

    /// Verbetes de uma central de tribunal: fontes do corpus (embutidas) ou, nas
    /// cadastradas, tudo no acervo que cite a sigla do tribunal.
    func entriesDoTribunal(_ id: String) -> [JurisEntry] {
        guard let t = tribunal(id) else { return [] }
        if !t.fontes.isEmpty {
            let set = Set(t.fontes)
            return entries.filter { set.contains($0.fonteKind) }
        }
        let sig = fold(t.sigla)
        guard !sig.isEmpty else { return [] }
        return entries.filter { blobs[$0.id]?.contains(sig) ?? false }
    }

    func passaFiltro(_ e: JurisEntry) -> Bool {
        switch filtro {
        case .todos: return true
        case .naoLidos: return !lidos.contains(e.id)
        case .lidos: return lidos.contains(e.id)
        case .vigentes: return e.situacaoKind == .vigente
        case .canceladas: return e.situacaoKind == .cancelada
        case .superadas: return e.situacaoKind == .superada
        case .importantes: return e.importante || marcadosImportantes.contains(e.id)
        }
    }

    var resultados: [JurisEntry] {
        let q = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
        var base = escopo
        if filtro != .todos {
            base = base.filter { passaFiltro($0) }
        }

        if !q.isEmpty {
            let termos = q.split(separator: " ").map(String.init).filter { !$0.isEmpty }
            base = base.filter { e in
                guard let blob = blobs[e.id] else { return false }
                return termos.allSatisfy { blob.contains($0) }
            }
            if ordenacao == .relevancia {
                let numQuery = Int(q.filter(\.isNumber))
                return base.sorted { a, b in
                    score(a, termos: termos, numQuery: numQuery) > score(b, termos: termos, numQuery: numQuery)
                }
            }
        }
        return ordenar(base)
    }

    func edicoesInfo(_ f: Fonte) -> [InfoEdicao] { infoEdicoes[f.rawValue] ?? [] }

    /// Julgados de um informativo específico (respeitando o filtro atual).
    func julgadosInfo(_ f: Fonte, _ numero: Int) -> [JurisEntry] {
        entries
            .filter { $0.fonteKind == f && $0.numero == numero && passaFiltro($0) }
            .sorted { ($0.id) < ($1.id) }
    }

    /// Teses da edição (ordenadas pelo nº da tese extraído do id "JT-EDxxx-yy").
    func tesesDaEdicao(_ numero: Int) -> [JurisEntry] {
        entries
            .filter { $0.fonteKind == .jurisEmTeses && $0.numero == numero && passaFiltro($0) }
            .sorted { teseIndex($0.id) < teseIndex($1.id) }
    }

    private func teseIndex(_ id: String) -> Int {
        // id no formato JT-ED092-08 → 8
        if let dash = id.lastIndex(of: "-"), let n = Int(id[id.index(after: dash)...]) {
            return n
        }
        return Int.max
    }

    private func score(_ e: JurisEntry, termos: [String], numQuery: Int?) -> Int {
        var s = 0
        let titulo = e.titulo.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
        if let n = numQuery, e.numero == n { s += 1000 }
        for t in termos {
            if titulo.contains(t) { s += 40 }
        }
        switch e.fonteKind {
        case .sumulaSTF, .sumulaSTJ: s += 6
        case .repercussaoGeral, .repetitivo: s += 3
        default: break
        }
        if e.importante || marcadosImportantes.contains(e.id) { s += 8 }
        if favorites.contains(e.id) { s += 5 }
        return s
    }

    private func ordenar(_ arr: [JurisEntry]) -> [JurisEntry] {
        switch ordenacao {
        case .relevancia:
            // Por AUTORIDADE (entrega 5): vinculante → controle concentrado → RG/repetitivo →
            // súmulas → teses/informativos → estaduais → contas → apoio. Antes seguia a ordem
            // da barra lateral, que abria "Todos" pela Súmula 1 do TJRO.
            return arr.sorted { a, b in
                let fa = OrdemAutoridade.posicao(a.fonte), fb = OrdemAutoridade.posicao(b.fonte)
                if fa != fb { return fa < fb }
                // Súmulas em ordem crescente (SV 1, Súmula 1…), como se leem; informativos e
                // temas do mais novo para o mais antigo. Desempate estável pelo id.
                let na = a.numero ?? -1, nb = b.numero ?? -1
                if na != nb { return a.fonte.hasPrefix("sumula_") ? na < nb : na > nb }
                return a.id < b.id
            }
        case .numeroDesc:
            return arr.sorted { ($0.numero ?? Int.min) > ($1.numero ?? Int.min) }
        case .numeroAsc:
            return arr.sorted { ($0.numero ?? Int.max) < ($1.numero ?? Int.max) }
        case .fonte:
            return arr.sorted { $0.fonteKind.nomeCurto < $1.fonteKind.nomeCurto }
        }
    }

    /// Contagem por filtro dentro do escopo atual (para o menu de filtros).
    func contagemFiltro(_ f: Filtro) -> Int {
        let base = escopo
        switch f {
        case .todos: return base.count
        case .naoLidos: return base.lazy.filter { !self.lidos.contains($0.id) }.count
        case .lidos: return base.lazy.filter { self.lidos.contains($0.id) }.count
        case .vigentes: return base.lazy.filter { $0.situacaoKind == .vigente }.count
        case .canceladas: return base.lazy.filter { $0.situacaoKind == .cancelada }.count
        case .superadas: return base.lazy.filter { $0.situacaoKind == .superada }.count
        case .importantes: return base.lazy.filter { $0.importante || self.marcadosImportantes.contains($0.id) }.count
        }
    }

    // MARK: - Favoritos / importantes / recentes

    func isFavorite(_ id: String) -> Bool { favorites.contains(id) }

    func toggleFavorite(_ id: String) {
        if favorites.contains(id) { favorites.remove(id) } else { favorites.insert(id) }
    }

    func isImportante(_ e: JurisEntry) -> Bool {
        e.importante || marcadosImportantes.contains(e.id)
    }

    func toggleImportante(_ e: JurisEntry) {
        // marcação do usuário sobrepõe-se à do material apenas aditivamente
        if marcadosImportantes.contains(e.id) {
            marcadosImportantes.remove(e.id)
        } else if !e.importante {
            marcadosImportantes.insert(e.id)
        }
    }

    // MARK: - Anotações pessoais (texto rico / RTF)

    func note(for id: String) -> Data? { richNotes[id] }

    func hasAnnotation(_ id: String) -> Bool { richNotes[id] != nil }

    /// Grava (ou remove, se vazia) a nota em RTF.
    func setNote(_ data: Data?, isEmpty: Bool, for id: String) {
        if isEmpty || data == nil {
            richNotes.removeValue(forKey: id)
        } else {
            richNotes[id] = data
        }
    }

    var annotationsCount: Int { richNotes.count }

    // MARK: - Marcações no enunciado (grifar/sublinhar/tachar)

    func marks(for id: String) -> [TextMark] { marks[id] ?? [] }

    // Histórico de marcações (desfazer/refazer) — em memória, por verbete.
    private var marksUndo: [String: [[TextMark]]] = [:]
    private var marksRedo: [String: [[TextMark]]] = [:]
    private func snapshotMarks(_ id: String) {
        marksUndo[id, default: []].append(marks[id] ?? [])
        if (marksUndo[id]?.count ?? 0) > 60 { marksUndo[id]?.removeFirst() }
        marksRedo[id] = []
    }
    func canUndoMarks(_ id: String) -> Bool { !(marksUndo[id]?.isEmpty ?? true) }
    func canRedoMarks(_ id: String) -> Bool { !(marksRedo[id]?.isEmpty ?? true) }
    func undoMarks(_ id: String) {
        guard let prev = marksUndo[id]?.popLast() else { return }
        marksRedo[id, default: []].append(marks[id] ?? [])
        if prev.isEmpty { marks.removeValue(forKey: id) } else { marks[id] = prev }
    }
    func redoMarks(_ id: String) {
        guard let next = marksRedo[id]?.popLast() else { return }
        marksUndo[id, default: []].append(marks[id] ?? [])
        if next.isEmpty { marks.removeValue(forKey: id) } else { marks[id] = next }
    }

    func addMark(_ m: TextMark, for id: String) {
        snapshotMarks(id)
        var arr = marks[id] ?? []
        arr.append(m)
        marks[id] = arr
    }

    /// Remove marcações que intersectam o intervalo dado.
    func removeMarks(in range: NSRange, for id: String) {
        guard var arr = marks[id] else { return }
        snapshotMarks(id)
        arr.removeAll { NSIntersectionRange($0.range, range).length > 0 || $0.range.location == range.location }
        if arr.isEmpty { marks.removeValue(forKey: id) } else { marks[id] = arr }
    }

    func clearMarks(for id: String) { marks.removeValue(forKey: id) }

    /// Cria (grifo azul) ou atualiza o comentário em balão ancorado a um trecho — espelha o LEGIS.
    func setComment(_ note: String, markID: String?, range: NSRange, for id: String) {
        snapshotMarks(id)
        var arr = marks[id] ?? []
        if let markID, let idx = arr.firstIndex(where: { $0.id == markID }) {
            arr[idx].note = note
        } else {
            arr.append(TextMark(start: range.location, length: range.length, kind: .grifar,
                                colorHex: "#8FBEF0", note: note))
        }
        marks[id] = arr
    }

    func removeComment(markID: String, for id: String) {
        guard var arr = marks[id] else { return }
        snapshotMarks(id)
        if let idx = arr.firstIndex(where: { $0.id == markID }) {
            if arr[idx].colorHex == "#8FBEF0", arr[idx].note != nil {
                // Marcação criada só p/ o comentário (não tinha grifo próprio): remove tudo.
                arr.remove(at: idx)
            } else {
                arr[idx].note = nil
            }
        }
        if arr.isEmpty { marks.removeValue(forKey: id) } else { marks[id] = arr }
    }

    /// Todas as marcações comentadas de um verbete, para o painel de anotações.
    func commentedMarks(for id: String) -> [TextMark] {
        (marks[id] ?? []).filter { !($0.note ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    /// Lacunas (cloze) marcadas em cada verbete — para a exportação de flashcards.
    func clozes(for id: String) -> [TextMark] { (marks[id] ?? []).filter { $0.kind == .cloze } }
    func removeClozes(for id: String) {
        guard var arr = marks[id] else { return }
        snapshotMarks(id)
        arr.removeAll { $0.kind == .cloze }
        if arr.isEmpty { marks.removeValue(forKey: id) } else { marks[id] = arr }
    }
    var clozesPorId: [String: [TextMark]] {
        var d: [String: [TextMark]] = [:]
        for (id, arr) in marks {
            let cs = arr.filter { $0.kind == .cloze }
            if !cs.isEmpty { d[id] = cs }
        }
        return d
    }
    var totalCloze: Int { marks.values.reduce(0) { $0 + $1.filter { $0.kind == .cloze }.count } }

    // MARK: - Baralho de revisão espaçada (SM-2, estilo Anki)

    func srsCard(_ id: String) -> JurisSRSCard? { srs[id] }
    func srsHasCard(_ id: String) -> Bool { srs[id] != nil }
    var srsDeckCount: Int { srs.count }

    /// Cria um flashcard do verbete (entra no baralho, vencido hoje). Idempotente.
    @discardableResult
    func srsAddCard(_ entry: JurisEntry, style: FlashStyle? = nil) -> Bool {
        guard srs[entry.id] == nil else { return false }
        let card = JurisFlashcards.make(for: entry, style: style)
        let now = Date()
        srs[entry.id] = JurisSRSCard(due: Self.srsCalendar.startOfDay(for: now), added: now,
                                cardKind: card.kind, prompt: card.prompt, answer: card.answer)
        return true
    }
    func srsRemove(_ id: String) { srs.removeValue(forKey: id) }
    func srsClearAll() { if !srs.isEmpty { srs.removeAll() } }

    func srsIsDue(_ card: JurisSRSCard, now: Date = Date()) -> Bool {
        card.due <= Self.srsCalendar.startOfDay(for: now)
    }
    func srsDaysUntilDue(_ card: JurisSRSCard, now: Date = Date()) -> Int {
        let today = Self.srsCalendar.startOfDay(for: now)
        return Self.srsCalendar.dateComponents([.day], from: today, to: card.due).day ?? 0
    }
    /// Prévia do intervalo (dias) que cada resposta produziria (cartão novo se ainda não está no baralho).
    func srsPreview(_ id: String, _ grade: JurisSRSGrade, now: Date = Date()) -> Int {
        let base = Self.srsCalendar.startOfDay(for: now)
        let card = srs[id] ?? JurisSRSCard(due: base, added: now)
        return JurisSpacedRepetition.nextInterval(card, grade)
    }
    /// Aplica a resposta (cria o cartão se não existir) e reprograma.
    @discardableResult
    func srsGrade(_ id: String, grade: JurisSRSGrade) -> JurisSRSCard {
        let now = Date()
        let base = Self.srsCalendar.startOfDay(for: now)
        let existing = srs[id] ?? JurisSRSCard(due: base, added: now)
        let reviewedToday = existing.lastReviewed.map { Self.srsCalendar.isDate($0, inSameDayAs: now) } ?? false
        let updated = JurisSpacedRepetition.schedule(existing, grade: grade, today: now, calendar: Self.srsCalendar)
        srs[id] = updated
        if !reviewedToday { leiturasPorDia[Self.chaveDia(now), default: 0] += 1 } // conta p/ meta/streak
        return updated
    }
    /// Ids dos cartões vencidos (due ≤ hoje).
    func srsDueIds(now: Date = Date()) -> [String] {
        let today = Self.srsCalendar.startOfDay(for: now)
        return srs.compactMap { $0.value.due <= today ? $0.key : nil }
    }
    var srsDueCount: Int { srsDueIds().count }
    /// Cartões revisados hoje (deriva de lastReviewed).
    var srsRevisadosHoje: Int {
        let now = Date()
        return srs.values.reduce(0) { $0 + ((($1.lastReviewed.map { Self.srsCalendar.isDate($0, inSameDayAs: now) }) ?? false) ? 1 : 0) }
    }

    // MARK: - Cores favoritas de grifo (paleta editável)

    func adicionarCorFavorita(_ hex: String) {
        let h = hex.uppercased()
        guard !coresFavoritas.contains(where: { $0.uppercased() == h }) else { return }
        coresFavoritas.append(hex)
    }
    func removerCorFavorita(_ hex: String) {
        coresFavoritas.removeAll { $0.uppercased() == hex.uppercased() }
        if coresFavoritas.isEmpty { coresFavoritas = MarkColor.padrao }
    }

    // MARK: - Alinhamento do enunciado

    func alinhamento(for id: String) -> String { alinhamentos[id] ?? "natural" }
    func setAlinhamento(_ v: String, for id: String) {
        if v == "natural" { alinhamentos.removeValue(forKey: id) } else { alinhamentos[id] = v }
    }

    // MARK: - Texto editado do enunciado

    /// Enunciado efetivo: versão editada pelo usuário, se existir; senão o oficial.
    func textoEnunciado(for entry: JurisEntry) -> String {
        textosEditados[entry.id] ?? entry.enunciado
    }
    func enunciadoFoiEditado(_ id: String) -> Bool { textosEditados[id] != nil }
    func setTextoEditado(_ texto: String, entry: JurisEntry) {
        let t = texto.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty || t == entry.enunciado.trimmingCharacters(in: .whitespacesAndNewlines) {
            textosEditados.removeValue(forKey: entry.id)
        } else {
            textosEditados[entry.id] = texto
        }
        // marcações são por deslocamento (UTF-16); ao mudar o texto elas deixam de
        // fazer sentido — remove as que caem fora dos novos limites.
        let len = (textoEnunciado(for: entry) as NSString).length
        if var arr = marks[entry.id] {
            arr.removeAll { $0.range.location + $0.range.length > len }
            if arr.isEmpty { marks.removeValue(forKey: entry.id) } else { marks[entry.id] = arr }
        }
    }
    func restaurarEnunciadoOriginal(_ id: String) { textosEditados.removeValue(forKey: id) }

    // MARK: - Coleções ("Meu edital")

    func criarColecao(_ nome: String) -> Colecao {
        let c = Colecao(nome: nome, criadaEm: Date().timeIntervalSince1970)
        colecoes.append(c)
        return c
    }
    func renomearColecao(_ id: String, para nome: String) {
        if let i = colecoes.firstIndex(where: { $0.id == id }) { colecoes[i].nome = nome }
    }
    func excluirColecao(_ id: String) { colecoes.removeAll { $0.id == id } }

    func estaNaColecao(_ verbeteID: String, _ colecaoID: String) -> Bool {
        colecoes.first { $0.id == colecaoID }?.ids.contains(verbeteID) ?? false
    }
    func toggleNaColecao(_ verbeteID: String, _ colecaoID: String) {
        guard let i = colecoes.firstIndex(where: { $0.id == colecaoID }) else { return }
        if let j = colecoes[i].ids.firstIndex(of: verbeteID) { colecoes[i].ids.remove(at: j) }
        else { colecoes[i].ids.append(verbeteID) }
    }
    func colecoesDe(_ verbeteID: String) -> [Colecao] {
        colecoes.filter { $0.ids.contains(verbeteID) }
    }
    func verbetes(colecao: Colecao) -> [JurisEntry] { colecao.ids.compactMap { byId[$0] } }

    // MARK: - Leitura / revisão

    func isLido(_ id: String) -> Bool { lidos.contains(id) }
    func toggleLido(_ id: String) {
        if lidos.contains(id) {
            lidos.remove(id)
        } else {
            lidos.insert(id)
            leiturasPorDia[Self.chaveDia(Date()), default: 0] += 1   // conta p/ meta diária e streak
        }
    }
    func lidosNa(_ colecao: Colecao) -> Int { colecao.ids.filter { lidos.contains($0) }.count }

    // MARK: - Meta diária, sequência e estatísticas do dashboard

    static func chaveDia(_ d: Date) -> String {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: d)
    }
    /// Contagens só do que está no acervo: a chave antiga de um verbete fundido (cópia de segurança)
    /// e o id retirado (órfão) ficam no disco, mas não contam duas vezes nem contam o que não existe.
    var totalLidos: Int { lidos.reduce(0) { $0 + (byId[$1] != nil ? 1 : 0) } }
    var totalFavoritos: Int { favorites.reduce(0) { $0 + (byId[$1] != nil ? 1 : 0) } }
    var lidosHoje: Int { leiturasPorDia[Self.chaveDia(Date())] ?? 0 }
    /// Dias consecutivos com pelo menos uma leitura, terminando hoje (ou ontem, se hoje ainda vazio).
    var streak: Int {
        let cal = Calendar(identifier: .gregorian)
        var dia = Date(); var n = 0
        if (leiturasPorDia[Self.chaveDia(dia)] ?? 0) == 0 {
            guard let ontem = cal.date(byAdding: .day, value: -1, to: dia) else { return 0 }
            dia = ontem
        }
        while (leiturasPorDia[Self.chaveDia(dia)] ?? 0) > 0 {
            n += 1
            guard let prev = cal.date(byAdding: .day, value: -1, to: dia) else { break }
            dia = prev
        }
        return n
    }
    func totalDaFonte(_ f: Fonte) -> Int { fonteCounts[f] ?? 0 }
    func lidosDaFonte(_ f: Fonte) -> Int {
        lidos.reduce(0) { $0 + ((byId[$1]?.fonteKind == f) ? 1 : 0) }
    }

    /// Semente estável do dia (não usa String.hashValue, que é aleatório por processo).
    private func seedDoDia() -> Int {
        var h = 5381
        for b in Self.chaveDia(Date()).utf8 { h = (h &* 33) &+ Int(b) }
        return abs(h)
    }
    /// Um verbete "do dia" — mesmo julgado importante o dia inteiro, muda à meia-noite.
    var verbeteDoDia: JurisEntry? {
        let importantes = entries.filter { $0.importante || marcadosImportantes.contains($0.id) }
        let pool = importantes.isEmpty ? entries : importantes
        guard !pool.isEmpty else { return nil }
        return pool[seedDoDia() % pool.count]
    }

    /// Nº de leituras num dia (para o heatmap de ofensiva).
    func contagemDoDia(_ d: Date) -> Int { leiturasPorDia[Self.chaveDia(d)] ?? 0 }
    /// Maior contagem diária registrada (para escalar a intensidade do heatmap).
    var maxLeiturasDia: Int { leiturasPorDia.values.max() ?? 0 }

    func responderRevisao(_ id: String, _ r: RevisaoResposta) {
        switch r {
        case .sei: dominados.insert(id)
        case .revisar: dominados.remove(id)
        }
    }

    // MARK: - Julgados relacionados

    // O índice de termos (palavras-chave, IDF, temas) mora em IndiceTermos, no fim deste
    // arquivo: é VALOR, montado fora da main no `load` e lido por retrato (AcervoQuadro) pelos
    // Relacionados, que também rodam fora da main. O store guarda o índice
    // publicado e expõe só o que as telas da main usam — o Comparador STF × STJ e a Linha do
    // tempo.
    @ObservationIgnored private var termos = IndiceTermos()

    /// Rede de segurança, não caminho normal: o índice nasce no `load`, fora da main, junto
    /// de JurisIndices. Só é refeito AQUI — na main, com a tela parada — se o acervo tiver
    /// mudado por outro caminho, e hoje nenhum muda. É o molde do antigo kwCount: índice de
    /// outro tamanho é de outro acervo.
    private func prepararKW() {
        guard termos.total != entries.count else { return }
        termos = IndiceTermos.montar(entries)
    }

    /// Palavras-chave de assunto (título + tema + ENUNCIADO), sem termos genéricos.
    func termosChave(_ e: JurisEntry) -> Set<String> {
        termos.total == entries.count ? termos.termosChave(e) : IndiceTermos.termosChave(e)
    }

    /// O retrato do acervo que os Relacionados leem numa tarefa destacada, com
    /// o índice de termos já montado. nil enquanto o acervo carrega (o `reload` zera `entries`
    /// por um instante).
    func acervoParaQuadro() -> AcervoQuadro? {
        guard !isLoading, !entries.isEmpty else { return nil }
        prepararKW()
        return AcervoQuadro(entries: entries, byId: byId, termos: termos)
    }

    /// Ordena verbetes por data (DD/MM/AAAA); sem data vão para o fim.
    static func chaveData(_ e: JurisEntry) -> Int {
        guard let d = e.data, d.count == 10 else { return Int.max }
        let p = d.split(separator: "/")
        guard p.count == 3, let dd = Int(p[0]), let mm = Int(p[1]), let yy = Int(p[2]) else { return Int.max }
        return yy * 10000 + mm * 100 + dd
    }

    /// Abre um verbete em LEITURA TELA CHEIA (a partir da home).
    func lerCheio(_ id: String) {
        guard byId[id] != nil else { return }
        leituraID = id
        markRecent(id)
    }

    /// Abre um verbete levando para a fonte dele (modo lista+leitura).
    func abrirVerbete(_ id: String) {
        guard let e = byId[id] else { return }
        searchText = ""
        selecao = .fonte(e.fonteKind)
        selectedID = id
        markRecent(id)
    }

    /// Sequência de navegação (verbetes da mesma fonte, ordem das listas).
    func sequenciaLeitura(de id: String) -> [String] {
        guard let e = byId[id] else { return [id] }
        return entries.filter { $0.fonteKind == e.fonteKind }
            .sorted { ($0.numero ?? -1) > ($1.numero ?? -1) }
            .map(\.id)
    }

    /// Verbete anterior/próximo na leitura (⌘← / ⌘→).
    func navegarLeitura(_ delta: Int) {
        guard let cur = leituraID ?? selectedID else { return }
        let seq = sequenciaLeitura(de: cur)
        guard let i = seq.firstIndex(of: cur), seq.indices.contains(i + delta) else { return }
        let novo = seq[i + delta]
        if leituraID != nil { leituraID = novo } else { selectedID = novo }
        markRecent(novo)
    }

    func temAnterior() -> Bool { podeNavegar(-1) }
    func temProximo() -> Bool { podeNavegar(1) }
    private func podeNavegar(_ delta: Int) -> Bool {
        guard let cur = leituraID ?? selectedID else { return false }
        let seq = sequenciaLeitura(de: cur)
        guard let i = seq.firstIndex(of: cur) else { return false }
        return seq.indices.contains(i + delta)
    }

    func markRecent(_ id: String) {
        recents.removeAll { $0 == id }
        recents.insert(id, at: 0)
        if recents.count > 60 { recents = Array(recents.prefix(60)) }
        persist()
    }

    var recentEntries: [JurisEntry] { recents.compactMap { byId[$0] } }

    /// Maior número conhecido de informativo por tribunal (para a atualização online).
    /// Usa um teto plausível por tribunal para ignorar números contaminados
    /// (ex.: verbete marcado STJ mas com nº de Informativo do STF).
    func maxInformativo(_ fonte: Fonte) -> Int {
        let teto: Int
        switch fonte {
        case .informativoSTJ: teto = 950
        case .informativoSTF: teto = 1600
        case .informativoTSE: teto = 300
        default: teto = .max
        }
        return entries.lazy
            .filter { $0.fonteKind == fonte }
            .compactMap(\.numero)
            .filter { $0 <= teto }
            .max() ?? 0
    }

    // MARK: - Persistência

    /// O formato do disco vive em JurisEstadoPersistido.swift (compilável sozinho no teste).
    private typealias Persisted = JurisEstadoPersistido

    /// Ids antigos cujo estado já foi unido ao canônico (JurisMigracaoIDs, em JurisEstadoPersistido.swift):
    /// vai e volta do disco com o resto do estado.
    private var idsMigrados: [String]?

    private func loadState() {
        guard let data = try? Data(contentsOf: stateURL),
              var s = try? JSONDecoder().decode(Persisted.self, from: data) else { return }
        JurisMigracaoIDs.migrar(&s)   // fusões e renomeações do acervo: une o estado no id que ficou
        idsMigrados = s.idsMigrados
        favorites = Set(s.favorites)
        recents = s.recents
        marcadosImportantes = Set(s.importantes ?? [])
        richNotes = s.richNotes ?? [:]
        marks = s.marks ?? [:]
        colecoes = s.colecoes ?? []
        lidos = Set(s.lidos ?? [])
        dominados = Set(s.dominados ?? [])
        afirmacoesFalsas = s.afirmacoesFalsas ?? [:]
        metaDiaria = s.metaDiaria ?? 20
        leiturasPorDia = s.leiturasPorDia ?? [:]
        coresFavoritas = (s.coresFavoritas?.isEmpty == false) ? s.coresFavoritas! : MarkColor.padrao
        alinhamentos = s.alinhamentos ?? [:]
        textosEditados = s.textosEditados ?? [:]
        srs = s.srs ?? [:]
        legadoGaleria = Persisted.LegadoGaleria(de: s)
        tribunaisCustom = s.tribunaisCustom ?? []
        readingChecklist = s.readingChecklist ?? []
        // migra notas antigas em texto simples -> RTF
        for (id, texto) in (s.annotations ?? [:]) where richNotes[id] == nil {
            if let rtf = Self.rtfDeNotaLegada(texto) { richNotes[id] = rtf }
        }
    }

    /// Nota legada em texto simples (`annotations`) como nota rica (RTF); nil se vazia.
    private static func rtfDeNotaLegada(_ texto: String) -> Data? {
        guard !texto.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
        let attr = NSAttributedString(string: texto,
            attributes: [.font: NSFont.systemFont(ofSize: 14),
                         .foregroundColor: NSColor.textColor])
        return try? attr.data(from: NSRange(location: 0, length: attr.length),
                              documentAttributes: [.documentType: NSAttributedString.DocumentType.rtf])
    }

    // DEBOUNCE da gravação: cada `didSet` chamava persist() na hora — marcar 20 lidos
    // eram 40 gravações síncronas do estado inteiro (com RTF) + 40 synchronize() no KVS.
    // Agora a gravação espera ~300 ms de silêncio; o formato do arquivo é o MESMO, e a
    // última alteração nunca se perde: `flushPersist()` grava na hora ao fechar/suspender
    // o app (observadores registrados no init) e em `exportarBackup`.
    private var persistTask: Task<Void, Never>?
    private var persistPendente = false

    private func persist() {
        persistPendente = true
        persistTask?.cancel()
        persistTask = Task { @MainActor [weak self] in
            try? await Task.sleep(nanoseconds: 300_000_000)
            guard !Task.isCancelled else { return }
            self?.persistAgora()
        }
    }

    /// Grava imediatamente o que estiver pendente (fechar/suspender o app, backup).
    func flushPersist() {
        persistTask?.cancel(); persistTask = nil
        if persistPendente { persistAgora() }
    }

    private func registrarFlushNoCicloDeVida() {
        #if canImport(UIKit)
        let nomes: [Notification.Name] = [UIApplication.willTerminateNotification,
                                          UIApplication.didEnterBackgroundNotification,
                                          UIApplication.willResignActiveNotification]
        #else
        let nomes: [Notification.Name] = [NSApplication.willTerminateNotification,
                                          NSApplication.didResignActiveNotification,
                                          NSApplication.willHideNotification]
        #endif
        for n in nomes {
            NotificationCenter.default.addObserver(forName: n, object: nil, queue: .main) { [weak self] _ in
                MainActor.assumeIsolated { self?.flushPersist() }
            }
        }
    }

    /// O estado da memória no formato do disco (state.json, iCloud e backup), com o legado da galeria.
    private func retratoPersistido() -> Persisted {
        var s = Persisted(favorites: Array(favorites), recents: recents,
                          importantes: Array(marcadosImportantes), annotations: nil,
                          richNotes: richNotes, marks: marks,
                          colecoes: colecoes, lidos: Array(lidos), dominados: Array(dominados),
                          afirmacoesFalsas: afirmacoesFalsas,
                          metaDiaria: metaDiaria, leiturasPorDia: leiturasPorDia,
                          coresFavoritas: coresFavoritas, alinhamentos: alinhamentos,
                          textosEditados: textosEditados, srs: srs,
                          tribunaisCustom: tribunaisCustom, readingChecklist: readingChecklist,
                          idsMigrados: idsMigrados)
        legadoGaleria.aplicar(em: &s)
        return s
    }

    private func persistAgora() {
        persistPendente = false
        let s = retratoPersistido()
        guard let data = try? JSONEncoder().encode(s) else { return }
        try? data.write(to: stateURL, options: .atomic)
        syncKVS(s)
    }

    // MARK: - Sync iCloud (best-effort via key-value store)

    private func syncKVS(_ s: Persisted) {
        guard let data = try? JSONEncoder().encode(s) else { return }
        // KVS tem limite de 1 MB por chave; anotações RTF podem estourar → grava sem elas.
        var leve = s; leve.richNotes = nil
        if let dLeve = try? JSONEncoder().encode(leve), dLeve.count < 900_000 {
            NSUbiquitousKeyValueStore.default.set(dLeve, forKey: "state")
            NSUbiquitousKeyValueStore.default.synchronize()
        }
        _ = data
    }

    /// Exporta todos os dados pessoais para um arquivo (backup).
    func exportarBackup() -> Data? {
        flushPersist()
        return try? JSONEncoder().encode(retratoPersistido())
    }

    /// Restaura dados pessoais de um backup (mescla) — regra em JurisEstadoPersistido.mesclarBackup: soma o
    /// que é conjunto, entra o que falta aqui, e o que o backup traz num id fundido passa ao canônico pela
    /// regra da união (JurisMigracaoIDs.migrarRestaurado). Backup antigo com id fundido deixava esse estudo
    /// órfão: a migração da abertura pula o id que este aparelho já marcou em `idsMigrados`.
    func importarBackup(_ data: Data) -> Bool {
        guard var b = try? JSONDecoder().decode(Persisted.self, from: data) else { return false }
        // backup antigo com nota em texto simples (`annotations`): vira nota rica, como no loadState
        var ricas = b.richNotes ?? [:]
        for (id, texto) in (b.annotations ?? [:]) where ricas[id] == nil {
            if let rtf = Self.rtfDeNotaLegada(texto) { ricas[id] = rtf }
        }
        if !ricas.isEmpty { b.richNotes = ricas }
        var s = retratoPersistido()
        s.mesclarBackup(b)
        favorites = Set(s.favorites)
        recents = s.recents
        marcadosImportantes = Set(s.importantes ?? [])
        lidos = Set(s.lidos ?? [])
        dominados = Set(s.dominados ?? [])
        richNotes = s.richNotes ?? [:]
        marks = s.marks ?? [:]
        afirmacoesFalsas = s.afirmacoesFalsas ?? [:]
        leiturasPorDia = s.leiturasPorDia ?? [:]
        alinhamentos = s.alinhamentos ?? [:]
        textosEditados = s.textosEditados ?? [:]
        srs = s.srs ?? [:]
        if let m = s.metaDiaria { metaDiaria = m }
        colecoes = s.colecoes ?? []
        tribunaisCustom = s.tribunaisCustom ?? []
        readingChecklist = s.readingChecklist ?? []
        idsMigrados = s.idsMigrados
        for hex in (b.coresFavoritas ?? []) { adicionarCorFavorita(hex) }
        persist()   // `recents` não tem didSet: grava também quando só ela mudou
        return true
    }
}

// MARK: - Índice de termos e retrato do acervo (fora da main)

/// O índice de TERMOS do acervo: as palavras-chave de cada verbete, a frequência de
/// documentos de cada termo (o IDF do Comparador STF × STJ e da Linha do tempo) e os
/// temas específicos. Montá-lo passa pelo texto inteiro dos 24,6 mil
/// verbetes — medido: ~0,93 s numa passada só num Mac Apple Silicon, mais sob carga e no
/// iPad —, e até aqui ele nascia NA MAIN, na primeira abertura de verbete de cada
/// lançamento, com a tela parada. Agora nasce no `load`, fora da main, em fatias paralelas
/// (~0,23 s no mesmo Mac) e ao lado de JurisIndices.
///
/// É VALOR (Sendable) e fica no arquivo, fora da classe, pelo mesmo motivo de JurisIndices:
/// dentro dela herdaria o isolamento da main. O quadro lê um retrato dele (AcervoQuadro)
/// numa tarefa destacada, sem tocar no store.
struct IndiceTermos: Sendable {
    /// id → termos de título + tema + enunciado.
    var kw: [String: Set<String>] = [:]
    /// id → termos de título + tema, só: o vocabulário de ASSUNTO. Guardado à parte porque
    /// relacionados() o pede para cada candidato do ramo — antes ele era dobrado de novo a
    /// cada chamada, milhares de vezes por verbete aberto.
    var assunto: [String: Set<String>] = [:]
    var docFreq: [String: Int] = [:]
    /// Quantos verbetes compartilham cada `tema` normalizado. Tema repetido em dezenas de
    /// verbetes ("Direito Civil", "Tribunal do Júri", o título de uma edição de
    /// Jurisprudência em Teses) é BALDE, não assunto: não prova que dois verbetes se
    /// confundem, e casava as 12 teses da mesma edição umas com as outras.
    var temaFreq: [String: Int] = [:]
    /// tema normalizado → ids, na ordem do acervo. Deixa o quadro buscar o MESMO assunto
    /// direto, em vez de torcer para a busca por vocabulário alcançá-lo antes do teto.
    var temaIds: [String: [String]] = [:]
    /// Quantos verbetes o acervo tinha quando o índice foi montado — o carimbo, no molde do
    /// antigo kwCount: índice de outro tamanho é de outro acervo e é refeito.
    var total = 0

    /// Monta o índice inteiro — função PURA, chamada fora da main no `load`. Em FATIAS
    /// paralelas: o índice é o derivado mais lento do carregamento (separar as palavras dos
    /// 10 milhões de caracteres, mais que dobrar os acentos), e em série ele atrasava o fim do
    /// `load` em quase um segundo. As fatias são juntadas NA ORDEM do acervo, então o
    /// resultado é o mesmo da passada única: o último registro de um id repetido vence,
    /// `docFreq` soma e `temaIds` guarda a ordem do acervo.
    static func montar(_ entries: [JurisEntry]) -> IndiceTermos {
        let n = entries.count
        let fatias = max(1, min(ProcessInfo.processInfo.activeProcessorCount, n / 1_000))
        var parciais = [IndiceTermos](repeating: IndiceTermos(), count: fatias)
        parciais.withUnsafeMutableBufferPointer { saida in
            DispatchQueue.concurrentPerform(iterations: fatias) { f in
                saida[f] = montarFatia(entries[(n * f / fatias)..<(n * (f + 1) / fatias)])
            }
        }
        var i = IndiceTermos()
        i.total = n
        i.kw.reserveCapacity(n)
        i.assunto.reserveCapacity(n)
        for p in parciais {
            i.kw.merge(p.kw) { _, depois in depois }
            i.assunto.merge(p.assunto) { _, depois in depois }
            for (t, c) in p.docFreq { i.docFreq[t, default: 0] += c }
            for (t, c) in p.temaFreq { i.temaFreq[t, default: 0] += c }
            for (t, ids) in p.temaIds { i.temaIds[t, default: []].append(contentsOf: ids) }
        }
        return i
    }

    private static func montarFatia(_ fatia: ArraySlice<JurisEntry>) -> IndiceTermos {
        var i = IndiceTermos()
        i.kw.reserveCapacity(fatia.count)
        i.assunto.reserveCapacity(fatia.count)
        for e in fatia {
            let a = Set(termos(e.titulo) + termos(e.tema))
            let ks = a.union(termos(e.enunciado))
            i.assunto[e.id] = a
            i.kw[e.id] = ks
            for t in ks { i.docFreq[t, default: 0] += 1 }
            let tema = chaveTema(e)
            if !tema.isEmpty { i.temaFreq[tema, default: 0] += 1; i.temaIds[tema, default: []].append(e.id) }
        }
        return i
    }

    // MARK: Vocabulário

    static let stop: Set<String> = ["de","do","da","dos","das","e","em","a","o","os","as",
        "no","na","nos","nas","ao","à","com","por","para","que","não","um","uma","the","art",
        "lei","sobre","entre","ser","é","se","direito",
        // genéricos jurídicos que casariam qualquer súmula/tese (poluem o comparador)
        "sumula","vinculante","tese","teses","tema","temas","tribunal","supremo","superior",
        "justica","federal","constitucional","constituicao","artigo","processo","leis","decreto",
        "pelo","pela","pelos","pelas","como","quando","onde","seus","suas","este","esta","esse",
        "essa","aquele","aquela","serao","serem","sera","sendo","seja","sejam","seguinte","mediante",
        "conforme","inciso","alinea","paragrafo","todos","todas","cada","qualquer","outro","outra",
        "mesmo","mesma","ainda","apos","antes","desde","deve","devem","pode","podem","cabe","cabem",
        "aplica","aplicam","recurso","acao","instancia","instancias","competente","competencia",
        "julgar","processar","numero","enunciado","disposto","previsto","prevista","efeito","efeitos",
        "publico","publica","publicos","publicas","nao","dos","das","uma","umas"]

    /// Vocabulário de CALENDÁRIO e de metatexto de notícia. Ele não entra na `stop` geral
    /// porque o Comparador STF × STJ e a Linha do tempo usam a mesma base e lá esses termos
    /// não atrapalham; aqui eles fabricavam pares — medido: o Tema 1234 (medicamentos/SUS)
    /// casava com o "teto remuneratório da magistratura" por "fevereiro" e "mantido", e com
    /// o Marco Civil da Internet por "reuniões", "fluxo", "nunc" e "junho".
    ///
    /// "março" fica de fora de propósito: dobrado ele vira "marco", e "Marco Civil da
    /// Internet" e "marco temporal" são assunto, não calendário. Entram também as formas
    /// verbais e os advérbios de ligação que passam do teto de raridade e não dizem assunto
    /// nenhum — sem eles, a Súmula 471 anunciava "isentas · estão · emprêsas" como o que se
    /// discute.
    static let ruidoDeQuadro: Set<String> = [
        "janeiro","fevereiro","abril","maio","junho","julho","agosto","setembro",
        "outubro","novembro","dezembro","julgou","julgamento","modulacao","item","itens",
        "dias","atual","atuais","novas","novos","novo","nova","regras","sessao","sessoes",
        "reuniao","reunioes","nunc","tunc","mantido","mantida","fluxo","placar","votos","voto",
        "maioria","unanimidade","relator","relatora","ministro","ministra","ministros","ontem",
        "hoje","semana","pauta","virtual","presencial","comecou","terminou","retomada",
        "retomado","vista","info","informativo","edicao","edicoes",
        "estao","estava","estavam","foram","sido","houver","havera","haver","tenha","tenham",
        "possa","possam","fica","ficam","feito","feita","caso","casos","modo","forma","vezes",
        "apenas","somente","inclusive","assim","entao","porem","todavia","contudo","quanto",
        "tanto","tendo","isso","isto","aqui","depois","sempre","nunca","muito","muitos","muita",
        "outros","outras","alguns","algumas","demais","nenhum","nenhuma",
        // classe processual e edição, que vêm do TÍTULO do informativo ("STJ · AgInt no REsp
        // 1852422/SP", "Ed. Extraordinária 25") e saíam como "termos próprios" do vizinho
        "agint","agrg","resp","aresp","eresp","edcl","extraordinaria"]

    static func ehRuidoDeQuadro(_ t: String) -> Bool {
        ruidoDeQuadro.contains(t) || t.allSatisfy { $0.isNumber }
    }

    /// As palavras de um campo: dobradas (sem acento, minúsculas), com 4 letras ou mais,
    /// fora da `stop`.
    static func termos(_ s: String?) -> [String] {
        guard let s else { return [] }
        let f = s.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
        return f.split { !$0.isLetter && !$0.isNumber }.map(String.init)
            .filter { $0.count >= 4 && !stop.contains($0) }
    }

    /// Palavras-chave de um verbete (título + tema + ENUNCIADO), sem o índice.
    static func termosChave(_ e: JurisEntry) -> Set<String> {
        Set(termos(e.titulo) + termos(e.tema) + termos(e.enunciado))
    }

    /// Palavras-chave de ASSUNTO (título + tema), sem o enunciado. O enunciado é prosa: os
    /// termos mais raros dele são verbo e advérbio de redação ("esmorecer", "Falcão"), e foi
    /// isso que a linha "O que separa" do quadro andou imprimindo. Título e tema são a
    /// etiqueta editorial do verbete — é ali que mora o vocabulário do domínio.
    static func termosDeAssunto(_ e: JurisEntry) -> Set<String> {
        Set(termos(e.titulo) + termos(e.tema))
    }

    func termosChave(_ e: JurisEntry) -> Set<String> { kw[e.id] ?? Self.termosChave(e) }
    func termosDeAssunto(_ e: JurisEntry) -> Set<String> { assunto[e.id] ?? Self.termosDeAssunto(e) }

    // MARK: Tema

    /// O `tema` dobrado e colapsado — a chave de agrupamento, não o texto de tela. Vazio em
    /// Jurisprudência em Teses: lá o `tema` é o título da EDIÇÃO ("MEDIDAS
    /// SOCIOEDUCATIVAS"), igual em todas as teses dela — é balde por construção, e nas
    /// edições pequenas passava por baixo do teto e casava tese com tese da mesma edição.
    static func chaveTema(_ e: JurisEntry) -> String {
        guard e.fonteKind != .jurisEmTeses, let bruto = e.tema else { return "" }
        let t = bruto.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
        guard t.count >= 6 else { return "" }
        return t.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
    }

    /// Acima disso o `tema` é balde. Medido no acervo de hoje: 3.615 temas distintos, e os
    /// maiores ("da administração pública" 115, "direito civil" 73) juntam verbetes que não
    /// têm nada a ver um com o outro.
    static let tetoTemaCompartilhado = 8

    /// true quando os dois verbetes têm o MESMO tema e esse tema é específico o bastante
    /// para significar alguma coisa. É o sinal de confundibilidade mais forte depois da
    /// curadoria.
    func mesmoTemaEspecifico(_ a: JurisEntry, _ b: JurisEntry) -> Bool {
        let ta = Self.chaveTema(a)
        guard !ta.isEmpty, ta == Self.chaveTema(b) else { return false }
        return (temaFreq[ta] ?? 0) <= Self.tetoTemaCompartilhado
    }

    // MARK: Pontuação

    /// Termo que aparece em mais de 5% do acervo é vocabulário comum: não distingue nada e
    /// não pode virar "o que se discute" ("contra" 1.369, "decisão" 1.595).
    var corteTermoPopular: Int { max(1, total / 20) }

    /// Semelhança de VOCABULÁRIO entre dois verbetes, de 0 a 1: Jaccard dos termos-chave
    /// PONDERADO pelo IDF, sem o ruído de calendário e de notícia. É o sinal mais fraco do
    /// piso de confundibilidade do quadro, e por isso é medido e não contado: contar termos
    /// abaixo de um corte fixo de raridade deixava de fora o par clássico Tema 246 × Tema
    /// 1.118 (18 termos em comum, só 1 abaixo do corte), e a soma sem normalizar premiava o
    /// enunciado-notícia longo (o Tema 1.234 somava 122 com o teto remuneratório da
    /// magistratura; o par Súmula 7 × Súmula 279, 14). Normalizado, os dois ficam em 0,04 e
    /// 0,45.
    func similaridade(_ a: JurisEntry, _ b: JurisEntry) -> Double {
        let ka = termosChave(a), kb = termosChave(b)
        let n = Double(max(total, 1))
        func peso(_ t: String) -> Double { Self.ehRuidoDeQuadro(t) ? 0 : log(n / Double(1 + (docFreq[t] ?? 0))) }
        var comum = 0.0, uniao = 0.0
        for t in ka { let w = peso(t); uniao += w; if kb.contains(t) { comum += w } }
        for t in kb where !ka.contains(t) { uniao += peso(t) }
        return uniao > 0 ? comum / uniao : 0
    }

    /// Termos de ASSUNTO de `outro` que NÃO aparecem em `base`, do mais raro para o mais
    /// comum. É o que alimenta a célula "Termos próprios" do quadro de julgados vizinhos:
    /// VOCABULÁRIO do título e do tema, e só. Dizer que dois julgados divergem no mérito
    /// exigiria uma fonte que o acervo não tem.
    ///
    /// POR QUE NÃO O ENUNCIADO: com ele a célula saía "esmorecer · prolongadamente ·
    /// retroagiria · somava" e "Falcão · Francisco · altura · peculiar" — medido, o primeiro
    /// termo aparecia num ÚNICO verbete do acervo em 40% das colunas. Um termo que não
    /// existe em nenhum outro verbete é, por construção, o oposto do que confunde quem
    /// estuda. Restrito a título+tema, sai "prescrição", "simples · nacional", "reexame ·
    /// necessário" — e a célula some em ~40% das colunas, que é o resultado honesto.
    func termosExclusivos(_ outro: JurisEntry, fora base: JurisEntry, limite: Int = 4) -> [String] {
        porRaridade(termosDeAssunto(outro).subtracting(termosDeAssunto(base)),
                    limite: limite, teto: corteTermoPopular)
    }

    /// Termos-chave comuns a TODOS os verbetes dados, do mais raro para o mais comum. Serve
    /// de "o que se discute" quando o verbete aberto não tem `tema` — nenhuma das 736
    /// súmulas do STF tem. O teto de frequência é o que impede a linha de anunciar o
    /// assunto da controvérsia como "defere · contra" ou "houver · decisão".
    func termosComuns(_ es: [JurisEntry], limite: Int = 5) -> [String] {
        guard let primeiro = es.first else { return [] }
        var comum = termosChave(primeiro)
        for e in es.dropFirst() { comum.formIntersection(termosChave(e)) }
        return porRaridade(comum, limite: limite, teto: corteTermoPopular)
    }

    /// Raro primeiro; empate desfeito pelo próprio termo, para a ordem ser ESTÁVEL entre
    /// aparelhos e entre gerações — sem isso o mesmo verbete mostraria palavras diferentes
    /// a cada vez que o quadro fosse montado. `teto` descarta o termo popular demais para
    /// distinguir; o ruído de calendário e de metatexto sai sempre.
    func porRaridade(_ termos: Set<String>, limite: Int, teto: Int? = nil) -> [String] {
        let filtrados = termos.filter { t in
            if Self.ehRuidoDeQuadro(t) { return false }
            if let teto, (docFreq[t] ?? 0) > teto { return false }
            return true
        }
        let ordem = filtrados.sorted { a, b in
            let fa = docFreq[a] ?? 0, fb = docFreq[b] ?? 0
            return fa == fb ? a < b : fa < fb
        }
        return Array(ordem.prefix(limite))
    }
}

/// O que os Relacionados leem do acervo, por VALOR: a varredura roda numa
/// tarefa destacada e não pode tocar no store, que é da main. Tirar o retrato na main não
/// copia nada — array e dicionário do Swift são cópia-na-escrita.
struct AcervoQuadro: Sendable {
    let entries: [JurisEntry]
    let byId: [String: JurisEntry]
    let termos: IndiceTermos

    func termosChave(_ e: JurisEntry) -> Set<String> { termos.termosChave(e) }
    func similaridade(_ a: JurisEntry, _ b: JurisEntry) -> Double { termos.similaridade(a, b) }
    func mesmoTemaEspecifico(_ a: JurisEntry, _ b: JurisEntry) -> Bool { termos.mesmoTemaEspecifico(a, b) }
    func termosExclusivos(_ outro: JurisEntry, fora base: JurisEntry, limite: Int = 4) -> [String] {
        termos.termosExclusivos(outro, fora: base, limite: limite)
    }
    func termosComuns(_ es: [JurisEntry], limite: Int = 5) -> [String] { termos.termosComuns(es, limite: limite) }

    /// Os verbetes que dividem com `e` um tema ESPECÍFICO (no máximo
    /// `tetoTemaCompartilhado` verbetes no acervo), na ordem do acervo, sem o próprio.
    func mesmoTema(_ e: JurisEntry, limite: Int) -> [JurisEntry] {
        let t = IndiceTermos.chaveTema(e)
        guard !t.isEmpty, (termos.temaFreq[t] ?? 0) <= IndiceTermos.tetoTemaCompartilhado else { return [] }
        return Array((termos.temaIds[t] ?? []).lazy.filter { $0 != e.id }.compactMap { self.byId[$0] }.prefix(limite))
    }

    /// Verbetes correlatos: mesmo ramo, pontuados por termos em comum no título/tema. Os
    /// termos de cada candidato vêm do índice (IndiceTermos.assunto): antes eram dobrados de
    /// novo para cada verbete do ramo, a cada chamada.
    func relacionados(_ entry: JurisEntry, limite: Int = 6) -> [JurisEntry] {
        let base = termos.termosDeAssunto(entry)
        guard !base.isEmpty else { return [] }
        let candidatos = entry.ramoDireito != nil
            ? entries.filter { $0.ramoDireito == entry.ramoDireito && $0.id != entry.id }
            : entries.filter { $0.fonteKind == entry.fonteKind && $0.id != entry.id }
        let pontuados = candidatos.compactMap { c -> (JurisEntry, Int)? in
            let comum = base.intersection(termos.termosDeAssunto(c))
            guard !comum.isEmpty else { return nil }
            var s = comum.count * 10
            if c.tema == entry.tema, entry.tema != nil { s += 20 }
            if c.numero == entry.numero, entry.numero != nil { s += 3 }
            return (c, s)
        }
        return pontuados.sorted { $0.1 > $1.1 }.prefix(limite).map(\.0)
    }
}
