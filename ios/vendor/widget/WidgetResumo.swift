import Foundation

/// Resumo de estudo que o app publica para os widgets (versão 1). São FATOS, não as contas do dia: o widget refaz
/// "dias até a prova", "revisões de hoje" e "meta de hoje" sozinho, inclusive à meia-noite (WidgetHoje). É montado
/// na web por `_widgetResumo()` (Catedra.dc.html). A leitura é tolerante: campo que falta ou vem com tipo errado
/// vira o padrão, campo novo é ignorado — app mais novo não derruba widget mais velho, nem o contrário.
struct WidgetResumo: Codable, Equatable {
    struct Prova: Codable, Equatable { var data: String; var nome: String }
    struct Revisoes: Codable, Equatable { var atrasadas: Int; var porData: [String: Int] }
    struct Bloco: Codable, Equatable { var disc: String; var min: Int; var cor: String; var corD: String }
    struct Volta: Codable, Equatable { var n: Int; var feitos: Int; var total: Int }
    struct Ciclo: Codable, Equatable { var feitos: Int; var total: Int; var proximos: [Bloco]; var volta: Volta? }
    struct Ofensiva: Codable, Equatable { var n: Int; var valeAte: String }
    struct Tema: Codable, Equatable { var accent: String; var grad: [String]; var escuro: Bool }
    struct Prefs: Codable, Equatable { var baixa: Bool; var tema: Tema }

    var v = 1
    var carimbo: Double = 0          // ms do updated_at do user_data (0 = nunca acertou com a nuvem)
    var geradoEm: Double = 0         // ms
    var conta = ""
    var sessao = "local"             // "conta" | "local" | "nenhuma"
    var area = "juridica"
    var juridico = true
    var prova: Prova? = nil
    var revisoes = Revisoes(atrasadas: 0, porData: [:])
    var ciclo = Ciclo(feitos: 0, total: 0, proximos: [], volta: nil)
    var metaDiariaMin = 180
    var diasAtivos: [String] = []
    var metaSemanaMin = 0
    var minPorDia: [String: Int] = [:]
    var ofensiva = Ofensiva(n: 0, valeAte: "")
    var prefs = Prefs(baixa: false, tema: Tema(accent: "#0f7a57", grad: [], escuro: false))

    init() {}

    private enum CodingKeys: String, CodingKey {
        case v, carimbo, geradoEm, conta, sessao, area, juridico, prova, revisoes, ciclo
        case metaDiariaMin, diasAtivos, metaSemanaMin, minPorDia, ofensiva, prefs
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        func le<T: Decodable>(_ k: CodingKeys, _ padrao: T) -> T {
            do { return try c.decodeIfPresent(T.self, forKey: k) ?? padrao } catch { return padrao }
        }
        var r = WidgetResumo()
        r.v = le(.v, r.v)
        r.carimbo = le(.carimbo, r.carimbo)
        r.geradoEm = le(.geradoEm, r.geradoEm)
        r.conta = le(.conta, r.conta)
        r.sessao = le(.sessao, r.sessao)
        r.area = le(.area, r.area)
        r.juridico = le(.juridico, r.juridico)
        do { r.prova = try c.decodeIfPresent(Prova.self, forKey: .prova) } catch { r.prova = nil }
        r.revisoes = le(.revisoes, r.revisoes)
        r.ciclo = le(.ciclo, r.ciclo)
        r.metaDiariaMin = le(.metaDiariaMin, r.metaDiariaMin)
        r.diasAtivos = c.lista(.diasAtivos)
        r.metaSemanaMin = le(.metaSemanaMin, r.metaSemanaMin)
        r.minPorDia = c.mapa(.minPorDia)
        r.ofensiva = le(.ofensiva, r.ofensiva)
        r.prefs = le(.prefs, r.prefs)
        self = r
    }

    /// JSON do app ou da nuvem → resumo (nil se não for um objeto JSON).
    static func ler(_ dados: Data) -> WidgetResumo? { try? JSONDecoder().decode(WidgetResumo.self, from: dados) }

    /// Exemplo: galeria de widgets sem dado ainda, capturas de revisão e o `-widgetExemplo` do simulador.
    static func exemplo(_ agora: Date, calendario cal: Calendar = .current) -> WidgetResumo {
        var r = WidgetResumo()
        let em = { (d: Int) -> String in WidgetHoje.ymd(cal.date(byAdding: .day, value: d, to: agora) ?? agora, cal) }
        let hoje = em(0)
        r.carimbo = 1; r.geradoEm = agora.timeIntervalSince1970 * 1000; r.sessao = "local"
        r.prova = Prova(data: em(84), nome: "Magistratura estadual")
        r.revisoes = Revisoes(atrasadas: 1, porData: [hoje: 2, em(1): 3])
        r.ciclo = Ciclo(feitos: 2, total: 6, proximos: [
            Bloco(disc: "Direito Constitucional", min: 50, cor: "#2563eb", corD: "#38bdf8"),
            Bloco(disc: "Direito Civil", min: 40, cor: "#0d9488", corD: "#2dd4bf"),
            Bloco(disc: "Direito Penal", min: 30, cor: "#e11d48", corD: "#fb7185"),
            Bloco(disc: "Direito Administrativo", min: 30, cor: "#4f46e5", corD: "#818cf8")],
            volta: Volta(n: 3, feitos: 12, total: 20))
        r.metaDiariaMin = 180; r.diasAtivos = ["seg", "ter", "qua", "qui", "sex", "sab"]; r.metaSemanaMin = 1080
        r.minPorDia = [em(-3): 170, em(-2): 200, em(-1): 120, hoje: 95]
        r.ofensiva = Ofensiva(n: 5, valeAte: em(1))
        r.prefs = Prefs(baixa: false, tema: Tema(accent: "#0f7a57", grad: ["#1e2b3a", "#0f7a57"], escuro: false))
        return r
    }
}

// ---- Leitura tolerante também por dentro: campo que falta ou vem com tipo errado vira o padrão DAQUELE campo, e
// item ruim de lista/mapa sai sozinho (um bloco sem cor não derruba o ciclo; um dia torto não zera as revisões).
// Os init(from:) ficam em extensões para os structs manterem o init por membros.

/// Decodifica um valor ou vira nil, sem lançar — para descartar só o item ruim de uma lista ou mapa.
private struct Talvez<T: Decodable>: Decodable {
    let valor: T?
    init(from decoder: Decoder) throws { valor = try? T(from: decoder) }
}

extension KeyedDecodingContainer {
    func le<T: Decodable>(_ k: Key, _ padrao: T) -> T {
        do { return try decodeIfPresent(T.self, forKey: k) ?? padrao } catch { return padrao }
    }
    func lista<T: Decodable>(_ k: Key) -> [T] {
        ((try? decodeIfPresent([Talvez<T>].self, forKey: k)) ?? nil)?.compactMap { $0.valor } ?? []
    }
    func mapa<T: Decodable>(_ k: Key) -> [String: T] {
        (((try? decodeIfPresent([String: Talvez<T>].self, forKey: k)) ?? nil) ?? [:]).compactMapValues { $0.valor }
    }
}

extension WidgetResumo.Prova {
    private enum K: String, CodingKey { case data, nome }
    init(from d: Decoder) throws {
        let c = try d.container(keyedBy: K.self)
        self.init(data: c.le(.data, ""), nome: c.le(.nome, ""))
    }
}
extension WidgetResumo.Revisoes {
    private enum K: String, CodingKey { case atrasadas, porData }
    init(from d: Decoder) throws {
        let c = try d.container(keyedBy: K.self)
        self.init(atrasadas: c.le(.atrasadas, 0), porData: c.mapa(.porData))
    }
}
extension WidgetResumo.Bloco {
    private enum K: String, CodingKey { case disc, min, cor, corD }
    init(from d: Decoder) throws {
        let c = try d.container(keyedBy: K.self)
        self.init(disc: c.le(.disc, ""), min: c.le(.min, 0), cor: c.le(.cor, ""), corD: c.le(.corD, ""))
    }
}
extension WidgetResumo.Volta {
    private enum K: String, CodingKey { case n, feitos, total }
    init(from d: Decoder) throws {
        let c = try d.container(keyedBy: K.self)
        self.init(n: c.le(.n, 0), feitos: c.le(.feitos, 0), total: c.le(.total, 0))
    }
}
extension WidgetResumo.Ciclo {
    private enum K: String, CodingKey { case feitos, total, proximos, volta }
    init(from d: Decoder) throws {
        let c = try d.container(keyedBy: K.self)
        self.init(feitos: c.le(.feitos, 0), total: c.le(.total, 0), proximos: c.lista(.proximos),
                  volta: (try? c.decodeIfPresent(WidgetResumo.Volta.self, forKey: .volta)) ?? nil)
    }
}
extension WidgetResumo.Ofensiva {
    private enum K: String, CodingKey { case n, valeAte }
    init(from d: Decoder) throws {
        let c = try d.container(keyedBy: K.self)
        self.init(n: c.le(.n, 0), valeAte: c.le(.valeAte, ""))
    }
}
extension WidgetResumo.Tema {
    private enum K: String, CodingKey { case accent, grad, escuro }
    init(from d: Decoder) throws {
        let c = try d.container(keyedBy: K.self)
        self.init(accent: c.le(.accent, "#0f7a57"), grad: c.lista(.grad), escuro: c.le(.escuro, false))
    }
}
extension WidgetResumo.Prefs {
    private enum K: String, CodingKey { case baixa, tema }
    init(from d: Decoder) throws {
        let c = try d.container(keyedBy: K.self)
        self.init(baixa: c.le(.baixa, false), tema: c.le(.tema, WidgetResumo.Tema(accent: "#0f7a57", grad: [], escuro: false)))
    }
}
