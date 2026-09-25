// Testes do estado persistido do JURIS nativo (JurisEstadoPersistido.swift), compilado por
// scripts/testar-estado-juris.sh — o projeto não tem XCTest. Saída: uma linha ✓/✗ por
// conferência; código de saída 1 se alguma falhar.
//
// O que se prova: a galeria de mapas saiu do app (25/09/2026), mas o state.json de quem já a
// usou continua abrindo sem erro, e os dois campos dela (mapasFeitos, mapasSeeded) voltam ao
// disco IGUAIS na próxima gravação — o código não lê, não apaga e não cria.
//
// O arquivo do estado entra de verdade, junto com Colecao.swift e Markup.swift (TextMark) reais.
// JurisSRSCard, TribunalCustom e ReadingChecklistItem moram em arquivos que puxam o JURIS e o
// LEGIS inteiros (telas, tema, exportador); entram aqui como dublês Codable mínimos — o que se
// testa é o envelope do estado e os campos legados, não a decodificação de cada cartão.
import Foundation
import SwiftUI

extension Color { init(hex: String) { self = .clear } }   // do JurisTheme.swift; só pinta (MarkColor.color)
struct JurisSRSCard: Codable, Hashable { var intervalDays: Int? }
struct TribunalCustom: Codable, Hashable { var id: String? }
struct ReadingChecklistItem: Codable, Hashable { var id: String? }

var falhas = 0
func confere(_ c: Bool, _ rotulo: String) {
    print((c ? "✓ " : "✗ ") + rotulo)
    if !c { falhas += 1 }
}
func json(_ s: String) -> Data { Data(s.utf8) }
func objeto(_ d: Data) -> [String: Any] {
    ((try? JSONSerialization.jsonObject(with: d)) as? [String: Any]) ?? [:]
}

/// Faz o que o LibraryStore faz: lê o disco, guarda o legado, monta o estado NOVO só com o que o
/// app usa (sem os campos da galeria) e devolve o legado antes de gravar.
func regravar(_ d: Data) throws -> Data {
    let lido = try JSONDecoder().decode(JurisEstadoPersistido.self, from: d)
    let legado = JurisEstadoPersistido.LegadoGaleria(de: lido)
    var novo = JurisEstadoPersistido(favorites: lido.favorites, recents: lido.recents,
                                     importantes: lido.importantes, annotations: nil,
                                     richNotes: lido.richNotes, marks: lido.marks,
                                     colecoes: lido.colecoes, lidos: lido.lidos, dominados: lido.dominados,
                                     afirmacoesFalsas: lido.afirmacoesFalsas,
                                     metaDiaria: lido.metaDiaria, leiturasPorDia: lido.leiturasPorDia,
                                     coresFavoritas: lido.coresFavoritas, alinhamentos: lido.alinhamentos,
                                     textosEditados: lido.textosEditados, srs: lido.srs,
                                     tribunaisCustom: lido.tribunaisCustom, readingChecklist: lido.readingChecklist)
    legado.aplicar(em: &novo)
    return try JSONEncoder().encode(novo)
}

// ── 1. state.json gravado pela versão com a galeria ─────────────────────────
let antigo = json("""
{"favorites":["STF-SV-11","STJ-SUM-7"],"recents":["STJ-SUM-7","INF2024-0343"],
 "importantes":["STF-SV-11"],"lidos":["STJ-SUM-7"],"dominados":[],
 "marks":{"STJ-SUM-7":[{"start":0,"length":12,"kind":"grifar","colorHex":"#FCE7A1","note":"cai muito"}]},
 "colecoes":[{"id":"c1","nome":"Meu edital","ids":["STJ-SUM-7"],"criadaEm":780000000}],
 "srs":{"STJ-SUM-7":{"ease":2.5,"intervalDays":3,"reps":1,"lapses":0,"due":780100000,"added":780000000,"cardKind":"cloze"}},
 "metaDiaria":25,"leiturasPorDia":{"2026-09-24":14},
 "mapasFeitos":["INF2024-0343","STJ-SUM-7","STF-SV-11"],"mapasSeeded":true}
""")
var lido: JurisEstadoPersistido?
do { lido = try JSONDecoder().decode(JurisEstadoPersistido.self, from: antigo) }
catch { print("  erro: \(error)") }
confere(lido != nil, "state.json antigo, com mapasFeitos e mapasSeeded, abre sem erro")
confere(lido?.favorites == ["STF-SV-11", "STJ-SUM-7"] && lido?.metaDiaria == 25
        && lido?.colecoes?.first?.nome == "Meu edital"
        && lido?.marks?["STJ-SUM-7"]?.first?.note == "cai muito"
        && lido?.srs?["STJ-SUM-7"]?.intervalDays == 3,
        "o resto do estudo (favoritos, meta, coleção, grifo com nota, revisão) chega inteiro")

let legado = JurisEstadoPersistido.LegadoGaleria(de: lido)
confere(legado.feitos == ["INF2024-0343", "STJ-SUM-7", "STF-SV-11"] && legado.seeded == true,
        "o legado da galeria é guardado como veio (ordem incluída)")

// ── 2. a próxima gravação devolve os campos iguais ──────────────────────────
if let d = try? regravar(antigo) {
    let o = objeto(d)
    confere((o["mapasFeitos"] as? [String]) == ["INF2024-0343", "STJ-SUM-7", "STF-SV-11"],
            "regravado: mapasFeitos volta ao disco igual (não é apagado)")
    confere((o["mapasSeeded"] as? Bool) == true, "regravado: mapasSeeded volta ao disco igual")
    confere((o["favorites"] as? [String])?.count == 2 && (o["metaDiaria"] as? Int) == 25,
            "regravado: o estudo segue gravado ao lado do legado")
    // e uma segunda volta (abrir, gravar, abrir, gravar) não perde nada
    if let d2 = try? regravar(d) {
        confere((objeto(d2)["mapasFeitos"] as? [String]) == ["INF2024-0343", "STJ-SUM-7", "STF-SV-11"],
                "segunda gravação seguida: o legado continua lá")
    } else { confere(false, "segunda gravação seguida: o legado continua lá") }
} else {
    confere(false, "regravado: mapasFeitos volta ao disco igual (não é apagado)")
}

// ── 3. quem nunca teve a galeria continua sem ───────────────────────────────
// A versão antiga SEMEAVA a galeria na primeira abertura (recentes + lidos) e gravava
// mapasFeitos/mapasSeeded. Agora nada é criado.
let semGaleria = json("""
{"favorites":[],"recents":["STJ-SUM-7","INF2024-0343"],"lidos":["STF-SV-11"]}
""")
if let d = try? regravar(semGaleria) {
    let o = objeto(d)
    confere(o["mapasFeitos"] == nil && o["mapasSeeded"] == nil,
            "estado sem galeria: a gravação não cria mapasFeitos nem mapasSeeded")
    confere((o["recents"] as? [String]) == ["STJ-SUM-7", "INF2024-0343"], "estado sem galeria: recentes intactos")
} else {
    confere(false, "estado sem galeria: a gravação não cria mapasFeitos nem mapasSeeded")
}

// ── 4. galeria vazia ou meio preenchida: devolve exatamente o que havia ─────
let soLista = json("""
{"favorites":[],"recents":[],"mapasFeitos":[]}
""")
if let d = try? regravar(soLista) {
    let o = objeto(d)
    confere((o["mapasFeitos"] as? [String]) == [] && o["mapasSeeded"] == nil,
            "lista vazia sem mapasSeeded: volta vazia e o seeded continua ausente")
} else {
    confere(false, "lista vazia sem mapasSeeded: volta vazia e o seeded continua ausente")
}

// ── 5. backup antigo (.json exportado) também abre ──────────────────────────
let backup = json("""
{"favorites":["A"],"recents":[],"mapasFeitos":["A"],"mapasSeeded":false,"campoQueNaoExisteMais":42}
""")
confere((try? JSONDecoder().decode(JurisEstadoPersistido.self, from: backup)) != nil,
        "backup antigo, até com campo desconhecido, abre sem erro")

print(falhas == 0 ? "\nestado do JURIS: tudo certo" : "\nestado do JURIS: \(falhas) falha(s)")
exit(falhas == 0 ? 0 : 1)
