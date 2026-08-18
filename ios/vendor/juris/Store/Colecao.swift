import Foundation

/// Uma coleção pessoal ("Meu edital", "Penal para o TJ", …).
struct Colecao: Codable, Identifiable, Hashable {
    var id: String
    var nome: String
    var ids: [String]           // verbetes na coleção (ordem de inclusão)
    var criadaEm: Double

    init(id: String = UUID().uuidString, nome: String, ids: [String] = [], criadaEm: Double = 0) {
        self.id = id; self.nome = nome; self.ids = ids; self.criadaEm = criadaEm
    }
}

/// Resultado de uma sessão de revisão (flashcards).
enum RevisaoResposta { case sei, revisar }
