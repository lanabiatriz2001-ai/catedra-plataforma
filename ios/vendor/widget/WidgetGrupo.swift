import Foundation

/// O grupo de apps que o app e o widget dividem. No Mac o prefixo é o do time (Developer ID dispensa perfil e o site
/// da Apple); no iPad/iPhone é `group.` e vem do perfil de provisionamento. Arquivos:
///   resumo.json        — gravado pelo APP (a cópia local do resumo)
///   resumo-nuvem.json  — gravado pelo WIDGET (o último resumo lido da nuvem)
///   passe.json         — gravado pelo APP ({passe, conta})
///   passe-invalido     — gravado pelo WIDGET quando a nuvem recusa o passe; o app pede outro e apaga
enum WidgetGrupo {
    #if os(macOS)
    static let id = "2ZT3GWTS9Z.com.catedra"
    #else
    static let id = "group.com.catedra"
    #endif
    static let resumo = "resumo.json"
    static let resumoNuvem = "resumo-nuvem.json"
    static let passe = "passe.json"
    static let passeInvalido = "passe-invalido"

    static var pasta: URL? {
        if let u = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: id) { return u }
        #if os(macOS)
        // App do Mac sem sandbox: se o sistema não devolver o container, o caminho é este (Task 0, caminho c).
        let u = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Group Containers/\(id)")
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        return u
        #else
        return nil
        #endif
    }

    @discardableResult
    static func gravar(_ dados: Data, _ nome: String) -> Bool {
        guard let p = pasta else { return false }
        do { try dados.write(to: p.appendingPathComponent(nome), options: .atomic); return true } catch { return false }
    }
    static func ler(_ nome: String) -> Data? {
        guard let p = pasta else { return nil }
        return try? Data(contentsOf: p.appendingPathComponent(nome))
    }
    static func existe(_ nome: String) -> Bool {
        guard let p = pasta else { return false }
        return FileManager.default.fileExists(atPath: p.appendingPathComponent(nome).path)
    }
    static func apagar(_ nome: String) {
        guard let p = pasta else { return }
        try? FileManager.default.removeItem(at: p.appendingPathComponent(nome))
    }
}

struct WidgetPasse: Codable, Equatable { var passe: String; var conta: String }
