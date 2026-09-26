import Foundation
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

/// O estado pessoal do JURIS nativo como ele vai para o disco (state.json), para o iCloud
/// (key-value store) e para o backup. Saiu de dentro do LibraryStore para poder ser
/// compilado sozinho no teste (tests/sem-mapas-mentais.mjs → scripts/testar-estado-juris.sh).
///
/// Todo campo novo é opcional: arquivo antigo sem ele continua abrindo. Campo que o app
/// deixou de usar NÃO sai daqui — sai do código que o lê. Ver `LegadoGaleria`.
struct JurisEstadoPersistido: Codable {
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
    /// LEGADO — a galeria de mapas do verbete saiu do app em 25/09/2026 (decisão da dona).
    /// Nenhuma tela lê estes dois campos; eles só atravessam: o que veio do disco volta ao
    /// disco igual (vazio nunca apaga cheio), e quem nunca teve continua sem.
    var mapasFeitos: [String]?
    var mapasSeeded: Bool?
    var tribunaisCustom: [TribunalCustom]?
    var readingChecklist: [ReadingChecklistItem]?
    /// Ids antigos cujo estado já foi unido ao id canônico (JurisMigracaoIDs). A união roda UMA
    /// vez por id: o que a pessoa desfizer depois no canônico não volta na próxima abertura.
    var idsMigrados: [String]?

    /// Os campos legados da galeria de mapas, guardados como vieram para a próxima gravação.
    struct LegadoGaleria: Equatable {
        var feitos: [String]?
        var seeded: Bool?

        init(de s: JurisEstadoPersistido? = nil) {
            feitos = s?.mapasFeitos
            seeded = s?.mapasSeeded
        }

        /// Devolve ao estado que vai ser gravado o que o disco tinha.
        func aplicar(em s: inout JurisEstadoPersistido) {
            s.mapasFeitos = feitos
            s.mapasSeeded = seeded
        }
    }
}

// MARK: - Migração de ids do acervo

/// Ids que saíram do acervo. `destinos`: o verbete foi fundido ou renomeado e o estado da pessoa vai
/// para o id que ficou; `retirados`: o verbete saiu sem destino (lote L4 das teses oficiais: sem tema
/// oficial) e o estado fica no disco, órfão — nenhuma tela o lê e as contagens o ignoram.
///
/// REGRA DE UNIÃO (os dois ids com estado), a mesma da web (juris-web.html, migraEstadoJuris):
/// · favorito, recente, importante, lido e dominado = OU;
/// · anotação (texto), nota rica e afirmação falsa = concatenadas: a do canônico primeiro, depois a do
///   id antigo, sem repetir texto que já está no canônico;
/// · marcações (grifos, comentários na margem) = união sem repetir;
/// · revisão espaçada = o cartão mais avançado (mais repetições; empate: maior intervalo; depois a
///   revisão mais recente);
/// · coleção = o canônico entra onde o antigo estava;
/// · texto editado e alinhamento = o do canônico; o do antigo só se o canônico não tiver.
/// A chave antiga NUNCA é apagada (cópia de segurança). Roda uma vez por id antigo que tinha estado
/// (`idsMigrados`); sem estado nenhum não marca — se chegar depois (backup, iCloud), une.
enum JurisMigracaoIDs {
    static let destinos: [String: String] = [
        "repgeral-repetitivo-STJ-x640": "repgeral-repetitivo-STJ-518",
        "SELTJGO-0438": "SELTJGO-0433",
        "repgeral-repercussao_geral-STF-x1198": "repgeral-repetitivo-STJ-931",
        "repgeral-repetitivo-STF-x1319": "repgeral-repetitivo-STJ-1196",
        "repgeral-repercussao_geral-STJ-x257": "repgeral-repercussao_geral-STF-476",
        "repgeral-repercussao_geral-STF-x1586": "repgeral-repercussao_geral-STF-825",
        "repgeral-repercussao_geral-STF-x1590": "repgeral-repercussao_geral-STF-21",
        "INF2022-0470": "INF2021-0815",
        // <gerado:teses-oficiais-l4:migracoes> scripts/aplicar-teses-oficiais.py — não edite à mão
        "repgeral-repercussao_geral-STF-100-2": "repgeral-repercussao_geral-STF-100",
        "repgeral-repercussao_geral-STF-1002-2": "repgeral-repercussao_geral-STF-1002",
        "repgeral-repercussao_geral-STF-1019-2": "repgeral-repercussao_geral-STF-1019",
        "repgeral-repercussao_geral-STF-1031-2": "repgeral-repercussao_geral-STF-1031",
        "repgeral-repercussao_geral-STF-1041-2": "repgeral-repercussao_geral-STF-1041",
        "repgeral-repercussao_geral-STF-1075-2": "repgeral-repercussao_geral-STF-1075",
        "repgeral-repercussao_geral-STF-1120-2": "repgeral-repercussao_geral-STF-1120",
        "repgeral-repercussao_geral-STF-116-2": "repgeral-repercussao_geral-STF-116",
        "repgeral-repercussao_geral-STF-1169-2": "repgeral-repercussao_geral-STF-1169",
        "repgeral-repercussao_geral-STF-1170-2": "repgeral-repercussao_geral-STF-1170",
        "repgeral-repercussao_geral-STF-1170-3": "repgeral-repercussao_geral-STF-1170",
        "repgeral-repercussao_geral-STF-1234-2": "repgeral-repercussao_geral-STF-1234",
        "repgeral-repercussao_geral-STF-1262-2": "repgeral-repercussao_geral-STF-1262",
        "repgeral-repercussao_geral-STF-1282-2": "repgeral-repercussao_geral-STF-1282",
        "repgeral-repercussao_geral-STF-1370-2": "repgeral-repercussao_geral-STF-1370",
        "repgeral-repercussao_geral-STF-210-2": "repgeral-repercussao_geral-STF-210",
        "repgeral-repercussao_geral-STF-210-3": "repgeral-repercussao_geral-STF-210",
        "repgeral-repercussao_geral-STF-27-2": "repgeral-repercussao_geral-STF-27",
        "repgeral-repercussao_geral-STF-312": "repgeral-repercussao_geral-STF-27",
        "repgeral-repercussao_geral-STF-323-2": "repgeral-repercussao_geral-STF-323",
        "repgeral-repercussao_geral-STF-323-3": "repgeral-repercussao_geral-STF-323",
        "repgeral-repercussao_geral-STF-393-2": "repgeral-repercussao_geral-STF-393",
        "repgeral-repercussao_geral-STF-477-2": "repgeral-repercussao_geral-STF-477",
        "repgeral-repercussao_geral-STF-478-2": "repgeral-repercussao_geral-STF-478",
        "repgeral-repercussao_geral-STF-492-2": "repgeral-repercussao_geral-STF-492",
        "repgeral-repercussao_geral-STF-545-2": "repgeral-repercussao_geral-STF-545",
        "repgeral-repercussao_geral-STF-627-2": "repgeral-repercussao_geral-STF-627",
        "repgeral-repercussao_geral-STF-733-2": "repgeral-repercussao_geral-STF-733",
        "repgeral-repercussao_geral-STF-761-2": "repgeral-repercussao_geral-STF-761",
        "repgeral-repercussao_geral-STF-771-2": "repgeral-repercussao_geral-STF-771",
        "repgeral-repercussao_geral-STF-771-3": "repgeral-repercussao_geral-STF-771",
        "repgeral-repercussao_geral-STF-857-2": "repgeral-repercussao_geral-STF-857",
        "repgeral-repercussao_geral-STF-881-2": "repgeral-repercussao_geral-STF-881",
        "repgeral-repercussao_geral-STF-881-3": "repgeral-repercussao_geral-STF-881",
        "repgeral-repercussao_geral-STF-967-2": "repgeral-repercussao_geral-STF-967",
        "repgeral-repercussao_geral-STF-x110": "repgeral-repercussao_geral-STF-642",
        "repgeral-repercussao_geral-STF-x117": "repgeral-repercussao_geral-STF-642",
        "repgeral-repercussao_geral-STF-x1371": "repgeral-repercussao_geral-STF-32",
        "repgeral-repercussao_geral-STF-x1713": "repgeral-repercussao_geral-STF-669",
        "repgeral-repercussao_geral-STJ-x1120": "repgeral-repercussao_geral-STF-82",
        "repgeral-repercussao_geral-STJ-x1298": "repgeral-repercussao_geral-STF-1068",
        "repgeral-repercussao_geral-STJ-x1702": "repgeral-repercussao_geral-STF-495",
        "repgeral-repetitivo-STF-185-2": "repgeral-repetitivo-STF-185",
        "repgeral-repetitivo-STF-x1175": "repgeral-repetitivo-STJ-157",
        "repgeral-repetitivo-STF-x1201": "repgeral-repetitivo-STJ-1155",
        "repgeral-repetitivo-STJ-1000-2": "repgeral-repetitivo-STJ-1000",
        "repgeral-repetitivo-STJ-1059-2": "repgeral-repetitivo-STJ-1059",
        "repgeral-repetitivo-STJ-1074-2": "repgeral-repetitivo-STJ-1074",
        "repgeral-repetitivo-STJ-108-2": "repgeral-repetitivo-STJ-108",
        "repgeral-repetitivo-STJ-1092-2": "repgeral-repetitivo-STJ-1092",
        "repgeral-repetitivo-STJ-1093-2": "repgeral-repetitivo-STJ-1093",
        "repgeral-repetitivo-STJ-1112-2": "repgeral-repetitivo-STJ-1112",
        "repgeral-repetitivo-STJ-1134-2": "repgeral-repetitivo-STJ-1134",
        "repgeral-repetitivo-STJ-1149-2": "repgeral-repetitivo-STJ-1149",
        "repgeral-repetitivo-STJ-117-2": "repgeral-repetitivo-STJ-117",
        "repgeral-repetitivo-STJ-1190-2": "repgeral-repetitivo-STJ-1190",
        "repgeral-repetitivo-STJ-1194-2": "repgeral-repetitivo-STJ-1194",
        "repgeral-repetitivo-STJ-1215-2": "repgeral-repetitivo-STJ-1215",
        "repgeral-repetitivo-STJ-1218-2": "repgeral-repetitivo-STJ-1218",
        "repgeral-repetitivo-STJ-1218-3": "repgeral-repetitivo-STJ-1218",
        "repgeral-repetitivo-STJ-1245-2": "repgeral-repetitivo-STJ-1245",
        "repgeral-repetitivo-STJ-1265-2": "repgeral-repetitivo-STJ-1265",
        "repgeral-repetitivo-STJ-1347-2": "repgeral-repetitivo-STJ-1347",
        "repgeral-repetitivo-STJ-1408-2": "repgeral-repetitivo-STJ-1408",
        "repgeral-repetitivo-STJ-1410-2": "repgeral-repetitivo-STJ-1410",
        "repgeral-repetitivo-STJ-16-2": "repgeral-repetitivo-STJ-16",
        "repgeral-repetitivo-STJ-17-2": "repgeral-repetitivo-STJ-17",
        "repgeral-repetitivo-STJ-230-2": "repgeral-repetitivo-STJ-230",
        "repgeral-repetitivo-STJ-260-2": "repgeral-repetitivo-STJ-260",
        "repgeral-repetitivo-STJ-293-2": "repgeral-repetitivo-STJ-293",
        "repgeral-repetitivo-STJ-368-2": "repgeral-repetitivo-STJ-368",
        "repgeral-repetitivo-STJ-371-2": "repgeral-repetitivo-STJ-371",
        "repgeral-repetitivo-STJ-380-2": "repgeral-repetitivo-STJ-380",
        "repgeral-repetitivo-STJ-588-2": "repgeral-repetitivo-STJ-588",
        "repgeral-repetitivo-STJ-589-2": "repgeral-repetitivo-STJ-589",
        "repgeral-repetitivo-STJ-614-2": "repgeral-repetitivo-STJ-614",
        "repgeral-repetitivo-STJ-660-2": "repgeral-repetitivo-STJ-660",
        "repgeral-repetitivo-STJ-660-4": "repgeral-repetitivo-STJ-660",
        "repgeral-repetitivo-STJ-671-2": "repgeral-repetitivo-STJ-871",
        "repgeral-repetitivo-STJ-677-2": "repgeral-repetitivo-STJ-677",
        "repgeral-repetitivo-STJ-689-2": "repgeral-repetitivo-STJ-689",
        "repgeral-repetitivo-STJ-692-2": "repgeral-repetitivo-STJ-692",
        "repgeral-repetitivo-STJ-717-2": "repgeral-repetitivo-STJ-717",
        "repgeral-repetitivo-STJ-766-2": "repgeral-repetitivo-STJ-766",
        "repgeral-repetitivo-STJ-86-2": "repgeral-repetitivo-STJ-86",
        "repgeral-repetitivo-STJ-905-2": "repgeral-repetitivo-STJ-905",
        "repgeral-repetitivo-STJ-919-2": "repgeral-repetitivo-STJ-919",
        "repgeral-repetitivo-STJ-938-2": "repgeral-repetitivo-STJ-938",
        "repgeral-repetitivo-STJ-958-2": "repgeral-repetitivo-STJ-958",
        "repgeral-repetitivo-STJ-958-3": "repgeral-repetitivo-STJ-958",
        "repgeral-repetitivo-STJ-970-2": "repgeral-repetitivo-STJ-970",
        "repgeral-repetitivo-STJ-972-2": "repgeral-repetitivo-STJ-972",
        "repgeral-repetitivo-STJ-972-3": "repgeral-repetitivo-STJ-972",
        "repgeral-repetitivo-STJ-980-2": "repgeral-repetitivo-STJ-980",
        "repgeral-repetitivo-STJ-996-2": "repgeral-repetitivo-STJ-996",
        "repgeral-repetitivo-STJ-996-3": "repgeral-repetitivo-STJ-996",
        "repgeral-repetitivo-STJ-996-4": "repgeral-repetitivo-STJ-996",
        "repgeral-repetitivo-STJ-x1153": "repgeral-repetitivo-STJ-x1139",
        "repgeral-repetitivo-STJ-x1253": "repgeral-repetitivo-STJ-x1251",
        "repgeral-repetitivo-STJ-x1255": "repgeral-repetitivo-STJ-x1251",
        "repgeral-repetitivo-STJ-x1825": "repgeral-repetitivo-STJ-478",
        "repgeral-repetitivo-STJ-x360": "repgeral-repercussao_geral-STF-942",
        "repgeral-repetitivo-STJ-x663": "repgeral-repetitivo-STJ-970",
        "repgeral-repetitivo-STJ-x666": "repgeral-repetitivo-STJ-938",
        "repgeral-repetitivo-STJ-x838": "repgeral-repetitivo-STJ-x837",
        // </gerado:teses-oficiais-l4:migracoes>
    ]
    static let retirados: Set<String> = [
        // <gerado:teses-oficiais-l4:retirados> scripts/aplicar-teses-oficiais.py — não edite à mão
        "repgeral-repercussao_geral-STF-569",
        "repgeral-repercussao_geral-STF-x100",
        "repgeral-repercussao_geral-STF-x1436",
        "repgeral-repercussao_geral-STF-x150",
        "repgeral-repercussao_geral-STF-x151",
        "repgeral-repercussao_geral-STF-x1647",
        "repgeral-repercussao_geral-STF-x1648",
        "repgeral-repercussao_geral-STF-x1859",
        "repgeral-repercussao_geral-STF-x1960",
        "repgeral-repercussao_geral-STF-x258",
        "repgeral-repercussao_geral-STF-x263",
        "repgeral-repercussao_geral-STF-x287",
        "repgeral-repercussao_geral-STF-x288",
        "repgeral-repercussao_geral-STF-x412",
        "repgeral-repercussao_geral-STF-x477",
        "repgeral-repercussao_geral-STF-x604",
        "repgeral-repercussao_geral-STF-x814",
        "repgeral-repercussao_geral-STF-x970",
        "repgeral-repercussao_geral-STJ-x116",
        "repgeral-repercussao_geral-STJ-x1381",
        "repgeral-repercussao_geral-STJ-x1625",
        "repgeral-repercussao_geral-STJ-x1669",
        "repgeral-repercussao_geral-STJ-x2014",
        "repgeral-repercussao_geral-STJ-x229",
        "repgeral-repercussao_geral-STJ-x350",
        "repgeral-repercussao_geral-STJ-x616",
        "repgeral-repercussao_geral-STJ-x618",
        "repgeral-repercussao_geral-STJ-x631",
        "repgeral-repetitivo-STF-x1197",
        "repgeral-repetitivo-STF-x1207",
        "repgeral-repetitivo-STJ-x1060",
        "repgeral-repetitivo-STJ-x1199",
        "repgeral-repetitivo-STJ-x1248",
        "repgeral-repetitivo-STJ-x1265",
        "repgeral-repetitivo-STJ-x1286",
        "repgeral-repetitivo-STJ-x1320",
        "repgeral-repetitivo-STJ-x1410",
        "repgeral-repetitivo-STJ-x1462",
        "repgeral-repetitivo-STJ-x1752",
        "repgeral-repetitivo-STJ-x235",
        "repgeral-repetitivo-STJ-x267",
        "repgeral-repetitivo-STJ-x55",
        "repgeral-repetitivo-STJ-x641",
        "repgeral-repetitivo-STJ-x657",
        "repgeral-repetitivo-STJ-x676",
        "repgeral-repetitivo-STJ-x938",
        // </gerado:teses-oficiais-l4:retirados>
    ]

    /// O id não está mais no acervo (migrado ou retirado): o estado dele é cópia/órfão.
    static func foraDoAcervo(_ id: String) -> Bool { destinos[id] != nil || retirados.contains(id) }

    /// Cartão `a` está mais adiantado que `b`?
    static func maisAvancado(_ a: JurisSRSCard, _ b: JurisSRSCard) -> Bool {
        if a.reps != b.reps { return a.reps > b.reps }
        if a.intervalDays != b.intervalDays { return a.intervalDays > b.intervalDays }
        return (a.lastReviewed ?? .distantPast) > (b.lastReviewed ?? .distantPast)
    }

    /// Nota rica (RTF): a do canônico, uma linha em branco e a do id antigo. Se o texto da antiga já
    /// está no canônico (migração de versão anterior copiou), fica o canônico como está.
    static func juntarNotasRTF(_ canonica: Data, _ antiga: Data) -> Data {
        let opc: [NSAttributedString.DocumentReadingOptionKey: Any] = [.documentType: NSAttributedString.DocumentType.rtf]
        guard let c = try? NSMutableAttributedString(data: canonica, options: opc, documentAttributes: nil),
              let a = try? NSAttributedString(data: antiga, options: opc, documentAttributes: nil) else {
            return canonica
        }
        let ta = a.string.trimmingCharacters(in: .whitespacesAndNewlines)
        if ta.isEmpty || c.string.contains(ta) { return canonica }
        c.append(NSAttributedString(string: "\n\n"))
        c.append(a)
        let doc: [NSAttributedString.DocumentAttributeKey: Any] = [.documentType: NSAttributedString.DocumentType.rtf]
        return (try? c.data(from: NSRange(location: 0, length: c.length), documentAttributes: doc)) ?? canonica
    }

    static func migrar(_ s: inout JurisEstadoPersistido,
                       juntarNotas: (Data, Data) -> Data = JurisMigracaoIDs.juntarNotasRTF) {
        var feitos = Set(s.idsMigrados ?? [])
        for (antigo, novo) in destinos.sorted(by: { $0.key < $1.key }) where !feitos.contains(antigo) {
            var teve = false
            func ou(_ v: inout [String]) {
                guard v.contains(antigo) else { return }
                teve = true
                if !v.contains(novo) { v.append(novo) }
            }
            func ouOpc(_ v: inout [String]?) {
                guard var x = v else { return }
                ou(&x); v = x
            }
            func concatena(_ d: inout [String: String]?) {
                guard let a = d?[antigo], !a.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
                teve = true
                if let n = d?[novo], !n.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    if !n.contains(a.trimmingCharacters(in: .whitespacesAndNewlines)) { d?[novo] = n + "\n\n" + a }
                } else {
                    d?[novo] = a
                }
            }
            func seFaltar<T>(_ d: inout [String: T]?) {
                guard let v = d?[antigo] else { return }
                teve = true
                if d?[novo] == nil { d?[novo] = v }
            }
            ou(&s.favorites); ou(&s.recents)
            ouOpc(&s.importantes); ouOpc(&s.lidos); ouOpc(&s.dominados)
            concatena(&s.annotations); concatena(&s.afirmacoesFalsas)
            if let a = s.richNotes?[antigo] {
                teve = true
                if let n = s.richNotes?[novo] { if n != a { s.richNotes?[novo] = juntarNotas(n, a) } }
                else { s.richNotes?[novo] = a }
            }
            if let a = s.marks?[antigo], !a.isEmpty {
                teve = true
                var n = s.marks?[novo] ?? []
                for m in a where !n.contains(m) { n.append(m) }
                s.marks?[novo] = n
            }
            if let a = s.srs?[antigo] {
                teve = true
                if let n = s.srs?[novo] { if maisAvancado(a, n) { s.srs?[novo] = a } }
                else { s.srs?[novo] = a }
            }
            seFaltar(&s.alinhamentos); seFaltar(&s.textosEditados)
            if s.colecoes != nil {
                for i in s.colecoes!.indices where s.colecoes![i].ids.contains(antigo) {
                    teve = true
                    if !s.colecoes![i].ids.contains(novo) { s.colecoes![i].ids.append(novo) }
                }
            }
            if teve { feitos.insert(antigo) }
        }
        if !feitos.isEmpty { s.idsMigrados = feitos.sorted() }
    }
}
