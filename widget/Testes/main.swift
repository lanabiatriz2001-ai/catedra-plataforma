import Foundation

// Casos dos arquivos puros do widget (ios/vendor/widget). Rodados por tests/widget-swift.mjs.
// Saída: uma linha "ok <caso>" ou "FALHA <caso>" por caso, e "FIM <n>" no fim.

var falhas = 0, total = 0
func caso(_ nome: String, _ cond: Bool) { total += 1; if !cond { falhas += 1 }; print((cond ? "ok " : "FALHA ") + nome) }

var cal = Calendar(identifier: .gregorian)
cal.timeZone = TimeZone(identifier: "America/Sao_Paulo")!
func dia(_ s: String, _ h: Int = 14, _ c: Calendar = cal) -> Date {
    let p = s.split(separator: "-").map { Int($0)! }
    return c.date(from: DateComponents(year: p[0], month: p[1], day: p[2], hour: h))!
}
func resumoBase() -> WidgetResumo {
    var r = WidgetResumo()
    r.carimbo = 1_000; r.geradoEm = dia("2026-10-01", 10).timeIntervalSince1970 * 1000
    r.conta = "u1"; r.sessao = "conta"
    r.prova = .init(data: "2026-10-31", nome: "TJSP 2026")
    r.revisoes = .init(atrasadas: 2, porData: ["2026-10-01": 3, "2026-10-02": 1, "2026-10-05": 4])
    r.ciclo = .init(feitos: 1, total: 4, proximos: [
        .init(disc: "Direito Constitucional", min: 50, cor: "#2563eb", corD: "#38bdf8"),
        .init(disc: "Direito Penal", min: 40, cor: "#e11d48", corD: "#fb7185")], volta: .init(n: 3, feitos: 12, total: 20))
    r.metaDiariaMin = 180; r.metaSemanaMin = 1080; r.diasAtivos = ["seg", "ter", "qua", "qui", "sex", "sab"]
    r.minPorDia = ["2026-09-27": 500, "2026-09-28": 100, "2026-09-29": 0, "2026-09-30": 200, "2026-10-01": 90]
    r.ofensiva = .init(n: 6, valeAte: "2026-10-03")
    return r
}

// ---- WidgetHoje (01/10/2026 é uma quinta-feira) ----
do {
    let r = resumoBase()
    let h = WidgetHoje.calcular(r, agora: dia("2026-10-01", 14), calendario: cal)
    caso("hoje: dias até a prova (01/10 → 31/10 = 30)", h.diasProva == 30 && h.nomeProva == "TJSP 2026")
    caso("hoje: revisões de hoje = atrasadas + as que vencem até hoje (2 + 3 = 5)", h.revisoesHoje == 5)
    caso("hoje: minutos e meta de hoje (90 de 180 = 50 %)", h.minHoje == 90 && h.metaHojePct == 50)
    caso("hoje: semana de segunda a domingo, sem o domingo anterior (390 de 1080 = 36 %)", h.semanaMin == 390 && h.semanaPct == 36)
    caso("hoje: a semana começa em 28/09 e hoje é a quinta", h.semana.count == 7 && h.semana[0].data == "2026-09-28" && h.semana[0].rotulo == "seg" && h.semana[3].ehHoje && h.semana[4].futuro)
    caso("hoje: a ofensiva vale (6)", h.ofensiva == 6)
    caso("hoje: próximo bloco e o seguinte", h.proximo?.disc == "Direito Constitucional" && h.seguintes.count == 1 && h.volta?.n == 3)
    caso("hoje: resumo de 4 h não está envelhecido", h.envelhecidoHa == nil)

    let m = WidgetHoje.calcular(r, agora: dia("2026-10-02", 0).addingTimeInterval(30 * 60), calendario: cal)
    caso("meia-noite: a prova fica um dia mais perto (29)", m.diasProva == 29)
    caso("meia-noite: as revisões de ontem passam a contar (2 + 3 + 1 = 6)", m.revisoesHoje == 6)
    caso("meia-noite: a meta de hoje zera", m.minHoje == 0 && m.metaHojePct == 0)
    caso("meia-noite: resumo de 14,5 h aparece como envelhecido", m.envelhecidoHa.map(WidgetHoje.rotuloEnvelhecido) == "atualizado há 14 h")

    let dom = WidgetHoje.calcular(r, agora: dia("2026-10-04", 9), calendario: cal)
    caso("domingo: a ofensiva passou do 'vale até' e zera", dom.ofensiva == 0)
    caso("domingo: ainda é a mesma semana (começa em 28/09)", dom.semana[0].data == "2026-09-28" && dom.semanaMin == 390 && dom.semana[6].ehHoje)
    let seg = WidgetHoje.calcular(r, agora: dia("2026-10-05", 9), calendario: cal)
    caso("segunda: semana nova, zerada", seg.semana[0].data == "2026-10-05" && seg.semanaMin == 0)

    var passada = r; passada.prova = .init(data: "2026-09-01", nome: "")
    caso("prova que já passou não fica negativa", WidgetHoje.calcular(passada, agora: dia("2026-10-01"), calendario: cal).diasProva == 0)
    var semProva = r; semProva.prova = nil
    caso("sem prova, sem número", WidgetHoje.calcular(semProva, agora: dia("2026-10-01"), calendario: cal).diasProva == nil)
    var semGerado = r; semGerado.geradoEm = 0
    caso("resumo sem geradoEm não ganha rótulo de 'atualizado há…'", WidgetHoje.calcular(semGerado, agora: dia("2026-10-01"), calendario: cal).envelhecidoHa == nil)
    caso("rótulo de envelhecido em dias", WidgetHoje.rotuloEnvelhecido(3 * 86400) == "atualizado há 3 dias")

    var ny = Calendar(identifier: .gregorian); ny.timeZone = TimeZone(identifier: "America/New_York")!
    var viagem = r; viagem.prova = .init(data: "2026-11-02", nome: "")
    let v1 = WidgetHoje.calcular(viagem, agora: dia("2026-10-31", 23, ny), calendario: ny)
    let v2 = WidgetHoje.calcular(viagem, agora: dia("2026-11-01", 23, ny).addingTimeInterval(30 * 60), calendario: ny)
    caso("fuso: em Nova York, no fim do horário de verão, a contagem e o 'hoje' seguem certos", v1.diasProva == 2 && v1.hoje == "2026-10-31" && v2.diasProva == 1 && v2.hoje == "2026-11-01")
}

// ---- WidgetResumo (leitura tolerante) ----
do {
    let vazio = WidgetResumo.ler(Data("{}".utf8))
    caso("resumo: {} lê com os padrões", vazio != nil && vazio!.conta == "" && vazio!.sessao == "local" && vazio!.metaDiariaMin == 180 && vazio!.prova == nil)
    let novo = WidgetResumo.ler(Data(#"{"v":2,"conta":"u1","novo":{"x":1},"prova":{"data":"2026-10-31","nome":"X"}}"#.utf8))
    caso("resumo: versão futura com campo novo lê o que conhece", novo?.v == 2 && novo?.conta == "u1" && novo?.prova?.nome == "X" && novo?.prefs.baixa == false)
    caso("resumo: campo com tipo errado cai no padrão", WidgetResumo.ler(Data(#"{"metaDiariaMin":"muito","conta":"u1"}"#.utf8))?.metaDiariaMin == 180)
    caso("resumo: JSON quebrado → nada", WidgetResumo.ler(Data(#"{"conta":"#.utf8)) == nil)
    caso("resumo: null → nada", WidgetResumo.ler(Data("null".utf8)) == nil)
    let ciclo = WidgetResumo.ler(Data(##"{"ciclo":{"feitos":1,"total":"x","proximos":[{"disc":"A","min":50,"corD":"#fff"},7,{"disc":"B","min":40,"cor":"#000","corD":"#111"}]}}"##.utf8))
    caso("resumo: bloco sem cor mantém os outros blocos e o ciclo", ciclo?.ciclo.feitos == 1 && ciclo?.ciclo.total == 0 && ciclo?.ciclo.proximos.map(\.disc) == ["A", "B"] && ciclo?.ciclo.proximos[0].cor == "")
    let prefs = WidgetResumo.ler(Data(##"{"prefs":{"baixa":true,"tema":{"accent":"#123456","escuro":true}}}"##.utf8))
    caso("resumo: tema sem grad mantém prefs.baixa e o resto do tema", prefs?.prefs.baixa == true && prefs?.prefs.tema.accent == "#123456" && prefs?.prefs.tema.grad == [] && prefs?.prefs.tema.escuro == true)
    let rev = WidgetResumo.ler(Data(#"{"revisoes":{"atrasadas":2,"porData":{"2026-10-01":3,"2026-10-02":"muitas","2026-10-03":1}}}"#.utf8))
    caso("resumo: porData com valor de tipo errado mantém os outros dias", rev?.revisoes.atrasadas == 2 && rev?.revisoes.porData == ["2026-10-01": 3, "2026-10-03": 1])
    let ofe = WidgetResumo.ler(Data(#"{"ofensiva":{"n":"seis","valeAte":"2026-10-03"}}"#.utf8))
    caso("resumo: ofensiva com tipo errado cai no padrão só naquele campo", ofe?.ofensiva.n == 0 && ofe?.ofensiva.valeAte == "2026-10-03")
    let base = resumoBase()
    let volta = (try? JSONEncoder().encode(base)).flatMap(WidgetResumo.ler)
    caso("resumo: ida e volta pelo JSON", volta == base)
    let ex = WidgetResumo.exemplo(dia("2026-10-01"), calendario: cal)
    caso("resumo: o exemplo tem prova, ciclo e semana", ex.prova != nil && ex.ciclo.proximos.count >= 3 && !ex.minPorDia.isEmpty)
}

// ---- WidgetSelecao (nuvem × cópia local, por conta) ----
do {
    var local = resumoBase(); local.carimbo = 1000; local.geradoEm = 5
    var nuvem = resumoBase(); nuvem.carimbo = 2000; nuvem.geradoEm = 1
    caso("seleção: a nuvem com carimbo maior vence", WidgetSelecao.escolher(local: local, nuvem: nuvem, contaDoPasse: "u1")?.carimbo == 2000)
    nuvem.carimbo = 1000
    caso("seleção: carimbo igual → o gerado por último (a cópia local, com o que ainda não subiu)", WidgetSelecao.escolher(local: local, nuvem: nuvem, contaDoPasse: "u1")?.geradoEm == 5)
    var outra = resumoBase(); outra.conta = "u2"; outra.carimbo = 9999
    caso("seleção: resumo de OUTRA conta nunca aparece (troca 2001 × pessoal)", WidgetSelecao.escolher(local: local, nuvem: outra, contaDoPasse: "u1")?.conta == "u1")
    caso("seleção: passe de outra conta descarta a cópia local também", WidgetSelecao.escolher(local: local, nuvem: nil, contaDoPasse: "u2") == nil)
    var solto = resumoBase(); solto.sessao = "local"; solto.conta = ""
    caso("seleção: sem conta e sem passe, vale a cópia local", WidgetSelecao.escolher(local: solto, nuvem: nil, contaDoPasse: nil) != nil)
    caso("seleção: cópia local sem conta não vale quando já há passe", WidgetSelecao.escolher(local: solto, nuvem: nuvem, contaDoPasse: "u1")?.conta == "u1")
    caso("seleção: nada → nada", WidgetSelecao.escolher(local: nil, nuvem: nil, contaDoPasse: nil) == nil)
}

// ---- fim dos casos ----
print("FIM \(total)")
exit(falhas > 0 ? 1 : 0)
