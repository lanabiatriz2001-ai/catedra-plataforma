import Foundation

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
