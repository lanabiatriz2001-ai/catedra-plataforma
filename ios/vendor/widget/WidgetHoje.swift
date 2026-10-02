import Foundation

struct WidgetDiaSemana: Equatable {
    var rotulo: String
    var data: String
    var min: Int
    var ehHoje: Bool
    var futuro: Bool
}

/// As contas do dia, puras: dado o resumo e "agora", o que o widget mostra. Sem rede, sem disco. O "hoje" é a data
/// civil no fuso do aparelho (o mesmo `_hoje()` do app); a regra "sessão de madrugada pertence a ontem" já vem
/// resolvida no `minPorDia` que o app manda.
struct WidgetHoje: Equatable {
    var hoje = ""
    var diasProva: Int? = nil
    var nomeProva = ""
    var dataProva = ""
    var revisoesHoje = 0
    var minHoje = 0
    var metaHojeMin = 0
    var metaHojePct = 0
    var semanaMin = 0
    var metaSemanaMin = 0
    var semanaPct = 0
    var semana: [WidgetDiaSemana] = []
    var ofensiva = 0
    var proximo: WidgetResumo.Bloco? = nil
    var seguintes: [WidgetResumo.Bloco] = []
    var cicloFeitos = 0
    var cicloTotal = 0
    var volta: WidgetResumo.Volta? = nil
    var envelhecidoHa: TimeInterval? = nil
    var baixa = false

    static let rotulosSemana = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]
    static let limiteFresco: TimeInterval = 12 * 3600

    static func ymd(_ d: Date, _ cal: Calendar) -> String {
        let c = cal.dateComponents([.year, .month, .day], from: d)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }
    static func data(_ s: String, _ cal: Calendar) -> Date? {
        let p = s.split(separator: "-").compactMap { Int($0) }
        guard p.count == 3 else { return nil }
        return cal.date(from: DateComponents(year: p[0], month: p[1], day: p[2]))
    }
    static func diasEntre(_ a: Date, _ b: Date, _ cal: Calendar) -> Int {
        cal.dateComponents([.day], from: cal.startOfDay(for: a), to: cal.startOfDay(for: b)).day ?? 0
    }
    static func pct(_ feito: Int, _ alvo: Int) -> Int {
        guard alvo > 0 else { return 0 }
        return min(100, Int((Double(feito) * 100 / Double(alvo)).rounded()))
    }
    /// "atualizado há 13 h" (até 47 h) / "atualizado há 2 dias".
    static func rotuloEnvelhecido(_ s: TimeInterval) -> String {
        let horas = Int(s / 3600)
        if horas < 48 { return "atualizado há \(max(1, horas)) h" }
        return "atualizado há \(horas / 24) dias"
    }

    static func calcular(_ r: WidgetResumo, agora: Date, calendario cal: Calendar = .current) -> WidgetHoje {
        var h = WidgetHoje()
        let hoje = ymd(agora, cal)
        h.hoje = hoje
        h.baixa = r.prefs.baixa
        if let p = r.prova, let d = data(p.data, cal) {
            h.diasProva = max(0, diasEntre(agora, d, cal))
            h.nomeProva = p.nome
            h.dataProva = p.data
        }
        h.revisoesHoje = r.revisoes.atrasadas + r.revisoes.porData.filter { $0.key <= hoje }.reduce(0) { $0 + $1.value }
        h.minHoje = r.minPorDia[hoje] ?? 0
        h.metaHojeMin = r.metaDiariaMin
        h.metaHojePct = pct(h.minHoje, r.metaDiariaMin)
        // semana de segunda a domingo (weekday: 1 = domingo … 7 = sábado)
        let desdeSegunda = (cal.component(.weekday, from: agora) + 5) % 7
        let segunda = cal.date(byAdding: .day, value: -desdeSegunda, to: cal.startOfDay(for: agora)) ?? agora
        var soma = 0
        for i in 0..<7 {
            let k = ymd(cal.date(byAdding: .day, value: i, to: segunda) ?? segunda, cal)
            let m = k <= hoje ? (r.minPorDia[k] ?? 0) : 0
            soma += m
            h.semana.append(WidgetDiaSemana(rotulo: rotulosSemana[i], data: k, min: m, ehHoje: k == hoje, futuro: k > hoje))
        }
        h.semanaMin = soma
        h.metaSemanaMin = r.metaSemanaMin
        h.semanaPct = pct(soma, r.metaSemanaMin)
        h.ofensiva = (!r.ofensiva.valeAte.isEmpty && hoje <= r.ofensiva.valeAte) ? r.ofensiva.n : 0
        h.proximo = r.ciclo.proximos.first
        h.seguintes = Array(r.ciclo.proximos.dropFirst())
        h.cicloFeitos = r.ciclo.feitos
        h.cicloTotal = r.ciclo.total
        h.volta = r.ciclo.volta
        let idade = agora.timeIntervalSince1970 - r.geradoEm / 1000
        h.envelhecidoHa = idade > limiteFresco ? idade : nil
        return h
    }
}
