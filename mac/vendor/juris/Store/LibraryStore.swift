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
    var mapasFeitos: [String] = [] { didSet { persist() } }               // verbetes com mapa mental feito (galeria)
    private var mapasSeeded = false                                       // seed único da galeria (recuperação)
    var tribunaisCustom: [TribunalCustom] = [] { didSet { persist() } }   // centrais de tribunal cadastradas
    var readingChecklist: [ReadingChecklistItem] = [] { didSet { persist() } }  // checklist de leitura PRÓPRIA do JURIS (não compartilhada com o LEGIS)
    private(set) var recents: [String] = []
    var editalDisciplinas: [String] = []  // espelho AO VIVO das matérias do edital do Cátedra (não persistido; vem do host a cada abertura da aba)

    var checklistPendingCount: Int { readingChecklist.filter { !$0.done }.count }

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
    }

    // MARK: - Carregamento do corpus

    func load() async {
        let onlineURL = onlineCorpusURL
        let result: (items: [JurisEntry], error: String?) = await Task.detached(priority: .userInitiated) {
            guard let url = Self.corpusURL() else {
                return ([], "corpus.json não encontrado no bundle.")
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
                return (items, nil)
            } catch {
                return ([], "Falha ao ler corpus.json: \(error.localizedDescription)")
            }
        }.value

        self.entries = result.items
        self.loadError = result.error
        indexAll()
        loadNovidades()
        loadNotas()
        self.isLoading = false
    }

    /// Notas de estudo ORIGINAIS (não oficiais) — esquema/mapa mental a partir do texto público.
    private(set) var notasApp: [String: NotaEstudo] = [:]
    func notaApp(for id: String) -> NotaEstudo? { notasApp[id] }
    private func loadNotas() {
        guard let url = Self.resourceURL("notas", ext: "json"),
              let data = try? Data(contentsOf: url),
              let dict = try? JSONDecoder().decode([String: NotaEstudo].self, from: data) else { return }
        notasApp = dict
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

    private func indexAll() {
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
        self.byId = byId
        self.blobs = blobs
        self.fonteCounts = fonteCounts
        self.ramosOrdenados = ramoCounts
            .map { (nome: $0.key, count: $0.value) }
            .sorted { $0.count != $1.count ? $0.count > $1.count : $0.nome < $1.nome }
        self.disciplinasOrdenadas = discCounts
            .map { (nome: $0.key, count: $0.value) }
            .sorted { $0.count != $1.count ? $0.count > $1.count : $0.nome < $1.nome }
        self.topicosPorDisciplina = temasPorDisc.mapValues { dict in
            dict.map { (nome: $0.key, count: $0.value) }
                .sorted { $0.count != $1.count ? $0.count > $1.count : $0.nome < $1.nome }
        }
        self.edicoesJT = edicoes
            .map { EdicaoJT(numero: $0.key, tema: $0.value.tema, count: $0.value.count) }
            .sorted { $0.numero > $1.numero }
        self.infoEdicoes = infoEd.mapValues { dict in
            dict.map { InfoEdicao(numero: $0.key, count: $0.value.count, data: $0.value.data) }
                .sorted { $0.numero > $1.numero }
        }
        buildIndice()
    }

    private func fold(_ s: String) -> String {
        s.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
    }

    /// Índice REMISSIVO por TERMO (palavra-chave), computado em segundo plano.
    /// Carrega o índice remissivo PRÉ-COMPUTADO (indice.json) — instantâneo.
    private func buildIndice() {
        guard let url = Self.resourceURL("indice", ext: "json"),
              let data = try? Data(contentsOf: url) else { return }
        struct Raw: Decodable { let termo: String; let count: Int; let letra: String }
        guard let raws = try? JSONDecoder().decode([Raw].self, from: data) else { return }
        var grupos: [String: [IndiceItem]] = [:]
        var ordem: [String] = []
        for r in raws {
            if grupos[r.letra] == nil { ordem.append(r.letra) }
            grupos[r.letra, default: []].append(IndiceItem(tema: r.termo, count: r.count))
        }
        self.indice = ordem.sorted().map { (letra: $0, itens: grupos[$0] ?? []) }
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
        case .inicio, .indice, .novidades, .tjroHub, .checklist:
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
        case .mapas:
            return mapasFeitos.compactMap { byId[$0] }
        case .central(let c):
            return entries.filter { $0.fonteKind.central == c }
        case .tribunal, .ramosHub, .ramoDetalhe:
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
            let ordem = Dictionary(uniqueKeysWithValues: Fonte.ordem.enumerated().map { ($1, $0) })
            return arr.sorted { a, b in
                let fa = ordem[a.fonteKind] ?? 99, fb = ordem[b.fonteKind] ?? 99
                if fa != fb { return fa < fb }
                return (a.numero ?? -1) > (b.numero ?? -1)
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
    var totalLidos: Int { lidos.count }
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

    private static let stop: Set<String> = ["de","do","da","dos","das","e","em","a","o","os","as",
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

    /// Verbetes correlatos: mesmo ramo, pontuados por termos em comum no título/tema.
    func relacionados(_ entry: JurisEntry, limite: Int = 6) -> [JurisEntry] {
        func termos(_ s: String?) -> Set<String> {
            guard let s = s else { return [] }
            let f = s.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
            return Set(f.split { !$0.isLetter && !$0.isNumber }
                .map(String.init).filter { $0.count >= 4 && !Self.stop.contains($0) })
        }
        let base = termos(entry.titulo).union(termos(entry.tema))
        guard !base.isEmpty else { return [] }
        let candidatos = entry.ramoDireito != nil
            ? entries.filter { $0.ramoDireito == entry.ramoDireito && $0.id != entry.id }
            : entries.filter { $0.fonteKind == entry.fonteKind && $0.id != entry.id }
        let pontuados = candidatos.compactMap { c -> (JurisEntry, Int)? in
            let comum = base.intersection(termos(c.titulo).union(termos(c.tema)))
            guard !comum.isEmpty else { return nil }
            var s = comum.count * 10
            if c.tema == entry.tema, entry.tema != nil { s += 20 }
            if c.numero == entry.numero, entry.numero != nil { s += 3 }
            return (c, s)
        }
        return pontuados.sorted { $0.1 > $1.1 }.prefix(limite).map(\.0)
    }

    /// Termos-chave de um verbete (título + tema), para casar assunto.
    /// Palavras-chave de assunto (título + tema + ENUNCIADO), sem termos genéricos.
    func termosChave(_ e: JurisEntry) -> Set<String> {
        if kwPronto, let c = kwCache[e.id] { return c }
        return termosChaveRaw(e)
    }
    private func termosChaveRaw(_ e: JurisEntry) -> Set<String> {
        func t(_ s: String?) -> [String] {
            guard let s = s else { return [] }
            let f = s.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
            return f.split { !$0.isLetter && !$0.isNumber }.map(String.init)
                .filter { $0.count >= 4 && !Self.stop.contains($0) }
        }
        return Set(t(e.titulo) + t(e.tema) + t(e.enunciado))
    }

    // Cache de palavras-chave + frequência de documentos (IDF) — para relevância no comparador.
    @ObservationIgnored private var kwCache: [String: Set<String>] = [:]
    @ObservationIgnored private var docFreq: [String: Int] = [:]
    @ObservationIgnored private var kwPronto = false
    @ObservationIgnored private var kwCount = 0
    private func prepararKW() {
        guard !kwPronto || kwCount != entries.count else { return }  // reconstrói se o corpus mudou
        kwCache.removeAll(keepingCapacity: true); docFreq.removeAll(keepingCapacity: true)
        kwCount = entries.count
        kwCache.reserveCapacity(entries.count)
        for e in entries {
            let ks = termosChaveRaw(e)
            kwCache[e.id] = ks
            for t in ks { docFreq[t, default: 0] += 1 }
        }
        kwPronto = true
    }

    /// Fontes que NÃO entram no comparador STF × STJ (seleções de TJ, TSE, TJRO).
    private static let foraComparador: Set<String> =
        ["sel_tjgo","sel_tjpr","sel_tjrj","sumula_tse","informativo_tse","tjro","tjro_prec"]

    /// Verbetes de um tribunal que tratam do mesmo assunto do `entry` (Comparador STF × STJ).
    /// Pontua por termos raros em comum no ENUNCIADO (IDF), com filtro de fonte/tribunal.
    func comparaveis(_ entry: JurisEntry, tribunal: String, limite: Int = 8) -> [JurisEntry] {
        prepararKW()
        let base = kwCache[entry.id] ?? termosChaveRaw(entry)
        guard base.count >= 2 else { return [] }
        let n = Double(max(entries.count, 1))
        let pont = entries.compactMap { c -> (JurisEntry, Double)? in
            guard c.id != entry.id, c.tribunal == tribunal,
                  !Self.foraComparador.contains(c.fonte) else { return nil }
            let comum = base.intersection(kwCache[c.id] ?? [])
            guard comum.count >= 2 else { return nil }
            var s = comum.reduce(0.0) { $0 + log(n / Double(1 + (docFreq[$1] ?? 0))) }
            if c.ramoDireito == entry.ramoDireito { s += 1 }
            return (c, s)
        }
        return pont.sorted { $0.1 > $1.1 }.prefix(limite).map(\.0)
    }

    /// Ordena verbetes por data (DD/MM/AAAA); sem data vão para o fim.
    static func chaveData(_ e: JurisEntry) -> Int {
        guard let d = e.data, d.count == 10 else { return Int.max }
        let p = d.split(separator: "/")
        guard p.count == 3, let dd = Int(p[0]), let mm = Int(p[1]), let yy = Int(p[2]) else { return Int.max }
        return yy * 10000 + mm * 100 + dd
    }

    /// Linha do tempo do assunto: verbetes relacionados + o próprio, do mais antigo ao mais recente.
    func linhaDoTempo(_ entry: JurisEntry, limite: Int = 24) -> [JurisEntry] {
        prepararKW()
        let base = termosChave(entry)
        guard !base.isEmpty else { return [entry] }
        var pool = entries.filter { c in
            c.id == entry.id || (base.intersection(termosChave(c)).count >= 2 &&
                (c.ramoDireito == entry.ramoDireito || c.tema == entry.tema))
        }
        pool.sort { Self.chaveData($0) < Self.chaveData($1) }
        return Array(pool.prefix(limite))
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

    /// Registra um mapa mental feito (abre a galeria "Mapas mentais").
    func registrarMapa(_ id: String) {
        mapasFeitos.removeAll { $0 == id }
        mapasFeitos.insert(id, at: 0)
        if mapasFeitos.count > 500 { mapasFeitos = Array(mapasFeitos.prefix(500)) }
    }

    func removerMapa(_ id: String) { mapasFeitos.removeAll { $0 == id } }

    var mapasEntries: [JurisEntry] { mapasFeitos.compactMap { byId[$0] } }

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

    private struct Persisted: Codable {
        var favorites: [String]
        var recents: [String]
        var importantes: [String]?
        var annotations: [String: String]?     // legado (texto simples)
        var richNotes: [String: Data]?
        var marks: [String: [TextMark]]?
        var colecoes: [Colecao]?
        var lidos: [String]?
        var dominados: [String]?
        var afirmacoesFalsas: [String: String]?
        var metaDiaria: Int?
        var leiturasPorDia: [String: Int]?
        var coresFavoritas: [String]?
        var alinhamentos: [String: String]?
        var textosEditados: [String: String]?
        var srs: [String: JurisSRSCard]?
        var mapasFeitos: [String]?
        var mapasSeeded: Bool?
        var tribunaisCustom: [TribunalCustom]?
        var readingChecklist: [ReadingChecklistItem]?
    }

    private func loadState() {
        guard let data = try? Data(contentsOf: stateURL),
              let s = try? JSONDecoder().decode(Persisted.self, from: data) else { return }
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
        mapasFeitos = s.mapasFeitos ?? []
        mapasSeeded = s.mapasSeeded ?? false
        tribunaisCustom = s.tribunaisCustom ?? []
        readingChecklist = s.readingChecklist ?? []
        // RECUPERAÇÃO (uma vez): os mapas mentais nunca foram registrados como
        // objetos — mas são derivados do verbete, então regeneram idênticos.
        // Semeia a galeria com a atividade (recentes + lidos), de onde os mapas
        // feitos vieram; daí em diante todo mapa aberto é registrado.
        if !mapasSeeded && mapasFeitos.isEmpty {
            var vistos = Set<String>()
            mapasFeitos = (s.recents + (s.lidos ?? [])).filter { vistos.insert($0).inserted }
            mapasSeeded = true
        }
        // migra notas antigas em texto simples -> RTF
        if let legado = s.annotations {
            for (id, texto) in legado where richNotes[id] == nil {
                let t = texto.trimmingCharacters(in: .whitespacesAndNewlines)
                if t.isEmpty { continue }
                let attr = NSAttributedString(string: texto,
                    attributes: [.font: NSFont.systemFont(ofSize: 14),
                                 .foregroundColor: NSColor.textColor])
                if let rtf = try? attr.data(from: NSRange(location: 0, length: attr.length),
                                            documentAttributes: [.documentType: NSAttributedString.DocumentType.rtf]) {
                    richNotes[id] = rtf
                }
            }
        }
    }

    private func persist() {
        let s = Persisted(favorites: Array(favorites), recents: recents,
                          importantes: Array(marcadosImportantes),
                          annotations: nil,
                          richNotes: richNotes, marks: marks,
                          colecoes: colecoes, lidos: Array(lidos), dominados: Array(dominados),
                          afirmacoesFalsas: afirmacoesFalsas,
                          metaDiaria: metaDiaria, leiturasPorDia: leiturasPorDia,
                          coresFavoritas: coresFavoritas, alinhamentos: alinhamentos,
                          textosEditados: textosEditados, srs: srs,
                          mapasFeitos: mapasFeitos, mapasSeeded: mapasSeeded,
                          tribunaisCustom: tribunaisCustom, readingChecklist: readingChecklist)
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
        let s = Persisted(favorites: Array(favorites), recents: recents,
                          importantes: Array(marcadosImportantes), annotations: nil,
                          richNotes: richNotes, marks: marks,
                          colecoes: colecoes, lidos: Array(lidos), dominados: Array(dominados),
                          afirmacoesFalsas: afirmacoesFalsas,
                          metaDiaria: metaDiaria, leiturasPorDia: leiturasPorDia,
                          coresFavoritas: coresFavoritas, alinhamentos: alinhamentos,
                          textosEditados: textosEditados, srs: srs,
                          mapasFeitos: mapasFeitos, mapasSeeded: mapasSeeded,
                          tribunaisCustom: tribunaisCustom, readingChecklist: readingChecklist)
        return try? JSONEncoder().encode(s)
    }

    /// Restaura dados pessoais de um backup (mescla).
    func importarBackup(_ data: Data) -> Bool {
        guard let s = try? JSONDecoder().decode(Persisted.self, from: data) else { return false }
        favorites.formUnion(s.favorites)
        marcadosImportantes.formUnion(s.importantes ?? [])
        lidos.formUnion(s.lidos ?? [])
        dominados.formUnion(s.dominados ?? [])
        for (k, v) in (s.richNotes ?? [:]) where richNotes[k] == nil { richNotes[k] = v }
        for (k, v) in (s.marks ?? [:]) where marks[k] == nil { marks[k] = v }
        for (k, v) in (s.afirmacoesFalsas ?? [:]) where afirmacoesFalsas[k] == nil { afirmacoesFalsas[k] = v }
        for (k, v) in (s.leiturasPorDia ?? [:]) { leiturasPorDia[k] = max(leiturasPorDia[k] ?? 0, v) }
        for (k, v) in (s.alinhamentos ?? [:]) where alinhamentos[k] == nil { alinhamentos[k] = v }
        for (k, v) in (s.textosEditados ?? [:]) where textosEditados[k] == nil { textosEditados[k] = v }
        for (k, v) in (s.srs ?? [:]) where srs[k] == nil { srs[k] = v }
        for hex in (s.coresFavoritas ?? []) { adicionarCorFavorita(hex) }
        if let m = s.metaDiaria { metaDiaria = m }
        let existentes = Set(colecoes.map(\.id))
        colecoes.append(contentsOf: (s.colecoes ?? []).filter { !existentes.contains($0.id) })
        let tribExistentes = Set(tribunaisCustom.map(\.id))
        tribunaisCustom.append(contentsOf: (s.tribunaisCustom ?? []).filter { !tribExistentes.contains($0.id) })
        let checklistExistentes = Set(readingChecklist.map(\.id))
        readingChecklist.append(contentsOf: (s.readingChecklist ?? []).filter { !checklistExistentes.contains($0.id) })
        return true
    }
}
