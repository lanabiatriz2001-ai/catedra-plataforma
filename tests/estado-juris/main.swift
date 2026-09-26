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
struct JurisSRSCard: Codable, Hashable {       // só os campos que a migração compara (JurisMigracaoIDs.maisAvancado)
    var intervalDays: Int = 0
    var reps: Int = 0
    var lastReviewed: Date?
}
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
                                     tribunaisCustom: lido.tribunaisCustom, readingChecklist: lido.readingChecklist,
                                     idsMigrados: lido.idsMigrados)
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

// ── 6. migração de ids do acervo (lote L4 das teses oficiais: um verbete por tema) ──────────
// A tabela é a GERADA (scripts/aplicar-teses-oficiais.py): o teste usa um par real dela.
let D = JurisMigracaoIDs.destinos, RET = JurisMigracaoIDs.retirados
confere(D.count >= 113 && RET.count >= 46, "a tabela gerada tem as fusões e os retirados do L4 (\(D.count) destinos, \(RET.count) retirados)")
confere(Set(D.keys).isDisjoint(with: RET) && D.values.allSatisfy { D[$0] == nil && !RET.contains($0) },
        "nenhum id é fundido e retirado ao mesmo tempo, e nenhum destino saiu do acervo (sem cadeia)")
let idAntigo = "repgeral-repercussao_geral-STF-1234-2", idCanon = "repgeral-repercussao_geral-STF-1234"
confere(D[idAntigo] == idCanon, "\(idAntigo) → \(idCanon) está na tabela")
func rtf(_ t: String) -> Data {
    let a = NSAttributedString(string: t)
    return try! a.data(from: NSRange(location: 0, length: a.length),
                       documentAttributes: [.documentType: NSAttributedString.DocumentType.rtf])
}
func texto(_ d: Data?) -> String {
    guard let d, let a = try? NSAttributedString(data: d, options: [.documentType: NSAttributedString.DocumentType.rtf],
                                                 documentAttributes: nil) else { return "" }
    return a.string
}
let hoje = Date(timeIntervalSince1970: 1_790_000_000)
var st = JurisEstadoPersistido(favorites: [idAntigo], recents: [idAntigo, "STJ-SUM-7"], importantes: [],
    annotations: [idAntigo: "nota do id antigo", idCanon: "nota do canônico"],
    richNotes: [idAntigo: rtf("rica do id antigo"), idCanon: rtf("rica do canônico")],
    marks: [idAntigo: [TextMark(start: 0, length: 4, kind: .grifar, colorHex: nil, note: "margem antiga")],
            idCanon: [TextMark(start: 2, length: 3, kind: .sublinhar, colorHex: nil, note: nil)]],
    colecoes: [Colecao(id: "c1", nome: "Meu edital", ids: [idAntigo], criadaEm: 1)],
    lidos: [idAntigo, idCanon], dominados: [idAntigo],
    afirmacoesFalsas: [idAntigo: "falsa antiga"], metaDiaria: 20, leiturasPorDia: nil, coresFavoritas: nil,
    alinhamentos: [idAntigo: "justificado"], textosEditados: [idAntigo: "editado id antigo", idCanon: "editado canônico"],
    srs: [idAntigo: JurisSRSCard(intervalDays: 12, reps: 4, lastReviewed: hoje),
          idCanon: JurisSRSCard(intervalDays: 1, reps: 1, lastReviewed: hoje)],
    tribunaisCustom: nil, readingChecklist: nil)
JurisMigracaoIDs.migrar(&st)
confere(st.favorites.contains(idCanon) && st.favorites.contains(idAntigo), "união: favorito do id antigo vale no canônico, e o id antigo fica como cópia")
confere(st.lidos == [idAntigo, idCanon] && st.dominados == [idAntigo, idCanon] && st.recents.contains(idCanon), "união: lido, dominado e recente = OU, sem repetir")
confere(st.annotations?[idCanon] == "nota do canônico\n\nnota do id antigo" && st.annotations?[idAntigo] == "nota do id antigo",
        "união: anotações concatenadas (canônico primeiro) e a do id antigo continua no disco")
confere(texto(st.richNotes?[idCanon]).contains("rica do canônico") && texto(st.richNotes?[idCanon]).contains("rica do id antigo")
        && texto(st.richNotes?[idCanon]).range(of: "rica do canônico")!.lowerBound < texto(st.richNotes?[idCanon]).range(of: "rica do id antigo")!.lowerBound,
        "união: nota rica (RTF) concatenada de verdade, legível, canônico primeiro")
confere(st.marks?[idCanon]?.count == 2 && st.marks?[idCanon]?.contains { $0.note == "margem antiga" } == true, "união: marcações somadas, com o comentário na margem")
confere(st.srs?[idCanon]?.reps == 4 && st.srs?[idCanon]?.intervalDays == 12, "união: fica o cartão de revisão mais avançado (4 repetições, 12 dias)")
confere(st.textosEditados?[idCanon] == "editado canônico" && st.alinhamentos?[idCanon] == "justificado",
        "texto editado do canônico fica; alinhamento do id antigo entra porque o canônico não tinha")
confere(st.afirmacoesFalsas?[idCanon] == "falsa antiga" && st.colecoes?.first?.ids == [idAntigo, idCanon],
        "afirmação falsa migra; a coleção ganha o canônico onde estava o id antigo")
confere(st.idsMigrados == [idAntigo], "a união fica marcada (idsMigrados) só para o id que tinha estado")
// idempotente e respeita o que a pessoa desfez depois
let ordenado = JSONEncoder(); ordenado.outputFormatting = .sortedKeys
let antesMig = try! ordenado.encode(st)
JurisMigracaoIDs.migrar(&st)
confere(try! ordenado.encode(st) == antesMig, "segunda abertura: a migração não muda nada (não concatena de novo)")
st.favorites.removeAll { $0 == idCanon }
JurisMigracaoIDs.migrar(&st)
confere(!st.favorites.contains(idCanon), "a pessoa desfavoritou o canônico depois: o favorito não volta na abertura seguinte")
// o marcador vai e volta do disco
if let d = try? regravar(try! JSONEncoder().encode(st)) {
    confere((objeto(d)["idsMigrados"] as? [String]) == [idAntigo], "idsMigrados volta ao disco na gravação")
} else { confere(false, "idsMigrados volta ao disco na gravação") }
// retirado: o estado fica, órfão, sem erro
let ret = RET.sorted().first!
var so = JurisEstadoPersistido(favorites: [ret, "STJ-SUM-7"], recents: [ret], importantes: nil, annotations: nil,
    richNotes: [ret: rtf("minha nota")], marks: nil, colecoes: nil, lidos: [ret], dominados: nil, afirmacoesFalsas: nil,
    metaDiaria: nil, leiturasPorDia: nil, coresFavoritas: nil, alinhamentos: nil, textosEditados: nil, srs: nil,
    tribunaisCustom: nil, readingChecklist: nil)
JurisMigracaoIDs.migrar(&so)
confere(so.favorites == [ret, "STJ-SUM-7"] && texto(so.richNotes?[ret]) == "minha nota" && so.lidos == [ret] && so.idsMigrados == nil,
        "retirado (\(ret)): favorito, nota e lido ficam no disco, intactos — nada é apagado nem inventado")
confere(JurisMigracaoIDs.foraDoAcervo(ret) && JurisMigracaoIDs.foraDoAcervo(idAntigo) && !JurisMigracaoIDs.foraDoAcervo(idCanon),
        "foraDoAcervo reconhece o retirado e a cópia antiga, não o canônico")
// estado id antigo sem idsMigrados abre; estado sem nada dos ids não ganha marca
var vazio = try! JSONDecoder().decode(JurisEstadoPersistido.self, from: json("""
{"favorites":["STJ-SUM-7"],"recents":[]}
"""))
JurisMigracaoIDs.migrar(&vazio)
confere(vazio.idsMigrados == nil && vazio.favorites == ["STJ-SUM-7"], "estado sem nenhum id migrado: nada muda e nenhuma marca é criada")

// ── 7. o ⚡ (importante que a pessoa marca: `importantes`) segue o OU na fusão ─────────────────
var raio = try! JSONDecoder().decode(JurisEstadoPersistido.self, from: json("""
{"favorites":[],"recents":[],"importantes":["\(idAntigo)","STJ-SUM-7"]}
"""))
JurisMigracaoIDs.migrar(&raio)
confere(raio.importantes == [idAntigo, "STJ-SUM-7", idCanon] && raio.idsMigrados == [idAntigo],
        "⚡ na abertura: o importante do id fundido vale no canônico, e o do id antigo fica como cópia")

// ── 8. restaurar BACKUP antigo com id fundido (JurisEstadoPersistido.mesclarBackup, o que o
//       LibraryStore.importarBackup faz). O aparelho já rodou a migração (idsMigrados tem o id): a
//       abertura seguinte pularia o id — a união tem de rodar sobre o conteúdo restaurado.
func estadoVazio() -> JurisEstadoPersistido {
    JurisEstadoPersistido(favorites: [], recents: [], importantes: [], annotations: nil, richNotes: [:], marks: [:],
        colecoes: [], lidos: [], dominados: [], afirmacoesFalsas: [:], metaDiaria: 20, leiturasPorDia: [:],
        coresFavoritas: nil, alinhamentos: [:], textosEditados: [:], srs: [:], tribunaisCustom: [],
        readingChecklist: [], idsMigrados: nil)
}
var aparelho = estadoVazio()      // o que o LibraryStore tem na memória (retratoPersistido)
aparelho.favorites = ["STJ-SUM-7"]
aparelho.richNotes = [idCanon: rtf("rica do canônico")]
aparelho.srs = [idCanon: JurisSRSCard(intervalDays: 2, reps: 1, lastReviewed: hoje)]
aparelho.colecoes = [Colecao(id: "c1", nome: "Meu edital", ids: ["STJ-SUM-7"], criadaEm: 1)]
aparelho.idsMigrados = [idAntigo]  // este aparelho já uniu o que ELE tinha no id antigo
let backupAntigo = try! JSONDecoder().decode(JurisEstadoPersistido.self, from: JSONEncoder().encode(
    JurisEstadoPersistido(favorites: [idAntigo], recents: [idAntigo], importantes: [idAntigo], annotations: nil,
        richNotes: [idAntigo: rtf("rica do backup")],
        marks: [idAntigo: [TextMark(start: 5, length: 6, kind: .grifar, colorHex: "#FCE7A1", note: "margem do backup")]],
        colecoes: [Colecao(id: "c1", nome: "Meu edital", ids: [idAntigo], criadaEm: 1),
                   Colecao(id: "c9", nome: "Revisão final", ids: [idAntigo], criadaEm: 2)],
        lidos: [idAntigo], dominados: [idAntigo], afirmacoesFalsas: [idAntigo: "falsa do backup"], metaDiaria: nil,
        leiturasPorDia: nil, coresFavoritas: nil, alinhamentos: nil, textosEditados: nil,
        srs: [idAntigo: JurisSRSCard(intervalDays: 30, reps: 6, lastReviewed: hoje)],
        tribunaisCustom: nil, readingChecklist: nil)))   // backup de antes do L4: sem idsMigrados
confere(backupAntigo.idsMigrados == nil, "o backup antigo não traz idsMigrados")
var restaurado = aparelho
restaurado.mesclarBackup(backupAntigo)
confere(restaurado.favorites.contains(idCanon) && restaurado.lidos?.contains(idCanon) == true
        && restaurado.dominados?.contains(idCanon) == true && restaurado.recents.contains(idCanon),
        "backup antigo restaurado: favorito, lido, dominado e recente do id fundido aparecem no canônico")
confere(restaurado.importantes?.contains(idCanon) == true,
        "backup antigo restaurado: o ⚡ (importante) do id fundido aparece no canônico — OU")
let ricaRest = texto(restaurado.richNotes?[idCanon])
confere(ricaRest.contains("rica do canônico") && ricaRest.contains("rica do backup")
        && ricaRest.range(of: "rica do canônico")!.lowerBound < ricaRest.range(of: "rica do backup")!.lowerBound,
        "backup antigo restaurado: a nota rica do backup se junta à do canônico deste aparelho (canônico primeiro)")
confere(restaurado.marks?[idCanon]?.contains { $0.note == "margem do backup" } == true
        && restaurado.afirmacoesFalsas?[idCanon] == "falsa do backup",
        "backup antigo restaurado: grifo com comentário e afirmação falsa chegam ao canônico")
confere(restaurado.srs?[idCanon]?.reps == 6 && restaurado.srs?[idCanon]?.intervalDays == 30,
        "backup antigo restaurado: fica o cartão de revisão mais avançado (o do backup, 6 repetições)")
confere(restaurado.colecoes?.first { $0.id == "c1" }?.ids == ["STJ-SUM-7", idCanon]
        && restaurado.colecoes?.first { $0.id == "c9" }?.ids == [idAntigo, idCanon],
        "backup antigo restaurado: o canônico entra nas coleções em que o id antigo estava no backup")
confere(restaurado.favorites.contains(idAntigo) && texto(restaurado.richNotes?[idAntigo]) == "rica do backup",
        "backup antigo restaurado: a chave antiga fica como cópia (nada apagado)")
confere(restaurado.idsMigrados == [idAntigo], "backup antigo restaurado: o id segue marcado uma vez só")
// a abertura seguinte não junta de novo nem duplica
let antesAbrir = try! ordenado.encode(restaurado)
JurisMigracaoIDs.migrar(&restaurado)
confere(try! ordenado.encode(restaurado) == antesAbrir, "abertura depois da restauração: nada muda (não concatena de novo)")
// restaurar o MESMO backup de novo não duplica a nota nem o grifo
var duas = restaurado
duas.mesclarBackup(backupAntigo)
confere(texto(duas.richNotes?[idCanon]) == ricaRest && duas.marks?[idCanon]?.count == restaurado.marks?[idCanon]?.count,
        "restaurar o mesmo backup outra vez: nota e grifo não se repetem")

// backup NOVO (exportado depois da fusão, com idsMigrados): o canônico dele já traz a união, e o que a
// pessoa desfez ali (desfavoritou o canônico) não volta pela cópia antiga
let backupNovo = try! JSONDecoder().decode(JurisEstadoPersistido.self, from: json("""
{"favorites":["\(idAntigo)"],"recents":[],"importantes":["\(idAntigo)"],"idsMigrados":["\(idAntigo)"]}
"""))
var outro = estadoVazio()
outro.mesclarBackup(backupNovo)
confere(!outro.favorites.contains(idCanon) && outro.importantes?.contains(idCanon) != true
        && outro.favorites.contains(idAntigo) && outro.idsMigrados == [idAntigo],
        "backup novo (com idsMigrados): não reúne o id que o backup já uniu — o desfeito não volta; a marca vem junto")
// retirado no backup: vem como cópia órfã, sem destino e sem marca
var comRetirado = estadoVazio()
comRetirado.mesclarBackup(try! JSONDecoder().decode(JurisEstadoPersistido.self, from: json("""
{"favorites":["\(ret)"],"recents":[],"importantes":["\(ret)"]}
""")))
confere(comRetirado.favorites == [ret] && comRetirado.importantes == [ret] && comRetirado.idsMigrados == nil,
        "backup com id retirado (\(ret)): o estado volta ao disco, órfão, sem destino e sem marca")

print(falhas == 0 ? "\nestado do JURIS: tudo certo" : "\nestado do JURIS: \(falhas) falha(s)")
exit(falhas == 0 ? 0 : 1)
