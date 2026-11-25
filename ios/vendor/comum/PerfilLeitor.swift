import Foundation
import Security

/// Os leitores só abrem o acervo depois de a página principal informar a sessão.
struct PerfilLeitor {
    @MainActor private(set) static var atual = PerfilLeitor(conta: nil)
    @MainActor static var diretorio: URL { atual.raiz }

    static let mudouAcervo = Notification.Name("catedraMudouAcervoDoLeitor")
    let conta: String?
    let suporte: URL
    let raizConta: URL
    let raiz: URL
    let dominio: String
    let servicoChave: String
    private var preferenciasConta: UserDefaults { UserDefaults(suiteName: dominio)! }
    var usaLegado: Bool { raiz != raizConta }
    var preferencias: UserDefaults { UserDefaults(suiteName: usaLegado ? dominio + ".anterior" : dominio)! }
    var chaveDeNuvem: String? {
        guard autenticado, let conta else { return nil }
        return usaLegado ? "leitor.\(conta).anterior.state" : "leitor.\(conta).state"
    }
    var autenticado: Bool { conta.flatMap(UUID.init(uuidString:)) != nil }

    init(conta: String?, suporte: URL = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0],
         aplicativo: String = Bundle.main.bundleIdentifier ?? "Catedra") {
        self.conta = conta.flatMap(UUID.init(uuidString:))?.uuidString.lowercased()
        let pasta = self.conta ?? "sem-sessao"
        self.suporte = suporte
        raizConta = suporte.appendingPathComponent("Catedra/Leitores/\(pasta)", isDirectory: true)
        dominio = "\(aplicativo).leitores.\(pasta)"
        let legado = raizConta.appendingPathComponent("Acervo anterior", isDirectory: true)
        let abrirLegado = UserDefaults(suiteName: dominio)?.bool(forKey: "usarAcervoAnterior") == true
        raiz = abrirLegado && FileManager.default.fileExists(atPath: legado.path) ? legado : raizConta
        servicoChave = "\(aplicativo).leitores.anthropic"
    }

    @MainActor static func ativar(_ perfil: PerfilLeitor) {
        atual = perfil
    }

    private var registroLegado: URL {
        raizConta.deletingLastPathComponent().appendingPathComponent("titular-do-acervo-anterior")
    }
    private var legado: URL { raizConta.appendingPathComponent("Acervo anterior", isDirectory: true) }
    var temAcervoRecuperado: Bool { FileManager.default.fileExists(atPath: legado.path) }
    private let modulosAntigos = ["VadeMecum", "VadeMecumJuris", "CatedraLegis"]

    var podeRecuperar: Bool {
        guard autenticado, !temAcervoRecuperado else { return false }
        if FileManager.default.fileExists(atPath: registroLegado.path),
           (try? String(contentsOf: registroLegado, encoding: .utf8)) != conta { return false }
        return modulosAntigos.contains { FileManager.default.fileExists(atPath: suporte.appendingPathComponent($0).path) }
    }

    /// O marcador exclusivo garante um único titular, inclusive depois da exclusão da conta.
    /// A cópia aparece de uma vez e mantém em separado todos os estudos feitos após a atualização.
    @MainActor func recuperarAcervoConfirmado() throws {
        guard dominio == Self.atual.dominio, let conta, podeRecuperar else { throw CocoaError(.fileWriteNoPermission) }
        let fm = FileManager.default
        try fm.createDirectory(at: raizConta, withIntermediateDirectories: true)
        if (try? String(contentsOf: registroLegado, encoding: .utf8)) != conta {
            try Data(conta.utf8).write(to: registroLegado, options: .withoutOverwriting)
        }
        let parcial = raizConta.appendingPathComponent("recuperacao-parcial", isDirectory: true)
        if fm.fileExists(atPath: parcial.path) { try fm.removeItem(at: parcial) }
        try fm.createDirectory(at: parcial, withIntermediateDirectories: true)
        defer { try? fm.removeItem(at: parcial) }
        for modulo in modulosAntigos {
            let fonte = suporte.appendingPathComponent(modulo)
            if fm.fileExists(atPath: fonte.path) { try fm.copyItem(at: fonte, to: parcial.appendingPathComponent(modulo)) }
        }
        try fm.moveItem(at: parcial, to: legado)
        let preferenciasLegado = UserDefaults(suiteName: dominio + ".anterior")!
        for chave in ["catedra.plano.done.v1", "juris.plano.done.v1", "catedra.plano.startTS",
                      "catedra.plano.pace", "lastStudiedLawID", "lastStudiedUnitLabel"] {
            if let valor = UserDefaults.standard.object(forKey: chave) { preferenciasLegado.set(valor, forKey: chave) }
        }
        alternarAcervo()
    }

    @MainActor func alternarAcervo() {
        guard dominio == Self.atual.dominio, temAcervoRecuperado else { return }
        preferenciasConta.set(!usaLegado, forKey: "usarAcervoAnterior")
        NotificationCenter.default.post(name: Self.mudouAcervo, object: nil)
    }

    private func consultaChave(_ titular: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: servicoChave,
         kSecAttrAccount as String: titular, kSecAttrSynchronizable as String: false]
    }

    private func ler(_ titular: String) -> String? {
        var consulta = consultaChave(titular)
        consulta[kSecReturnData as String] = true
        consulta[kSecMatchLimit as String] = kSecMatchLimitOne
        var resultado: CFTypeRef?
        guard SecItemCopyMatching(consulta as CFDictionary, &resultado) == errSecSuccess,
              let dados = resultado as? Data else { return nil }
        return String(data: dados, encoding: .utf8)
    }

    private func gravar(_ valor: String, para titular: String) -> Bool {
        let consulta = consultaChave(titular)
        if valor.isEmpty {
            let status = SecItemDelete(consulta as CFDictionary)
            return status == errSecSuccess || status == errSecItemNotFound
        }
        let dados: [String: Any] = [kSecValueData as String: Data(valor.utf8),
                                    kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
        let status = SecItemUpdate(consulta as CFDictionary, dados as CFDictionary)
        if status == errSecItemNotFound {
            return SecItemAdd(consulta.merging(dados) { _, novo in novo } as CFDictionary, nil) == errSecSuccess
        }
        return status == errSecSuccess
    }

    /// A chave antiga não tinha titular. Só sai da quarentena quando o titular
    /// apresenta a mesma chave nos Ajustes da sua conta.
    func protegerChaveAntiga(_ preferenciasAntigas: UserDefaults) {
        guard let chave = preferenciasAntigas.string(forKey: "anthropicKey"), !chave.isEmpty else { return }
        if gravar(chave, para: "legado") { preferenciasAntigas.removeObject(forKey: "anthropicKey") }
    }

    @MainActor func chaveAtual() -> String? {
        guard autenticado, dominio == Self.atual.dominio, raiz == Self.atual.raiz, let conta else { return nil }
        return ler(conta)
    }

    @MainActor func guardarChave(_ valor: String) -> Bool {
        guard autenticado, dominio == Self.atual.dominio, raiz == Self.atual.raiz, let conta else { return false }
        let chave = valor.trimmingCharacters(in: .whitespacesAndNewlines)
        guard gravar(chave, para: conta) else { return false }
        if !chave.isEmpty, ler("legado") == chave { return gravar("", para: "legado") }
        return true
    }

    /// O banco já confirmou a exclusão. Uma falha do disco ou do Chaveiro precisa
    /// sobreviver ao encerramento do app para a limpeza continuar na próxima abertura.
    private static let registroExclusoes = "catedra.leitores.exclusoesPendentes"
    @MainActor private static var exclusoesPendentes: [String] {
        UserDefaults.standard.stringArray(forKey: registroExclusoes) ?? []
    }
    @MainActor var exclusaoPendente: Bool {
        guard autenticado, let conta else { return false }
        return Self.exclusoesPendentes.contains(conta)
    }
    @MainActor func agendarExclusao() {
        guard autenticado, let conta, !exclusaoPendente else { return }
        UserDefaults.standard.set(Self.exclusoesPendentes + [conta], forKey: Self.registroExclusoes)
    }
    @MainActor func concluirExclusao() throws {
        guard exclusaoPendente, let conta else { return }
        try apagar()
        UserDefaults.standard.set(Self.exclusoesPendentes.filter { $0 != conta }, forKey: Self.registroExclusoes)
    }
    @MainActor static func retomarExclusoes() {
        for conta in exclusoesPendentes {
            try? PerfilLeitor(conta: conta).concluirExclusao()
        }
    }

    func apagar() throws {
        guard autenticado, let conta else { return }
        let chaveRemovida = gravar("", para: conta)
        if FileManager.default.fileExists(atPath: raizConta.path) { try FileManager.default.removeItem(at: raizConta) }
        preferenciasConta.removePersistentDomain(forName: dominio)
        preferenciasConta.removePersistentDomain(forName: dominio + ".anterior")
        let nuvem = NSUbiquitousKeyValueStore.default
        nuvem.removeObject(forKey: "leitor.\(conta).state")
        nuvem.removeObject(forKey: "leitor.\(conta).anterior.state")
        guard chaveRemovida else { throw CocoaError(.fileWriteNoPermission) }
    }
}

/// A autorização dura somente até o vencimento comunicado pelo login da página
/// principal. O dono dos arquivos no disco, sozinho, nunca abre um leitor.
@MainActor
final class SessaoDosLeitores {
    private let aplicar: (PerfilLeitor) -> Void
    private var vencimento: Date?
    private var alarme: Timer?
    // Só a aba pedida pela pessoa sobrevive à recarga do login. Artigos, busca e
    // contexto do perfil anterior nunca fazem parte do pedido.
    private(set) var abaPedida: Int?

    func pedirAba(_ aba: Int) {
        abaPedida = (aba == 1 || aba == 2) ? aba : nil
    }

    func consumirAbaPedida(jurisDisponivel: Bool) -> Int? {
        guard contaAutorizada != nil, let aba = abaPedida else { return nil }
        abaPedida = nil
        return aba == 2 && !jurisDisponivel ? nil : aba
    }
    // Só para concluir uma exclusão já confirmada pelo servidor que volte após vencer
    // a sessão. Mudar de conta ou de documento encerra também esta associação.
    private var ultimaContaConfirmada: String?

    init(aplicar: @escaping (PerfilLeitor) -> Void) { self.aplicar = aplicar }

    var contaAutorizada: String? {
        guard let vencimento, Date() < vencimento else { return nil }
        return ultimaContaConfirmada
    }

    static func paginaPrincipal(_ origem: URL?, em pastaWeb: URL?) -> Bool {
        guard let origem, origem.isFileURL, let pastaWeb else { return false }
        return origem.standardizedFileURL.resolvingSymlinksInPath().path ==
               pastaWeb.appendingPathComponent("index.html").standardizedFileURL.resolvingSymlinksInPath().path
    }

    private func bloquear() {
        alarme?.invalidate()
        alarme = nil
        vencimento = nil
        aplicar(PerfilLeitor(conta: nil))
    }

    func encerrarDocumento() {
        ultimaContaConfirmada = nil
        bloquear()
        PerfilLeitor.retomarExclusoes()
    }

    // Também é chamada na volta do segundo plano: o sistema pode ter suspendido o timer.
    func conferirValidade(agora: Date = Date()) {
        if let vencimento, agora >= vencimento { bloquear() }
    }

    func receber(_ dados: [String: String]) throws {
        if let exclusao = dados["excluir"] {
            let alvo = PerfilLeitor(conta: exclusao)
            guard let conta = alvo.conta else { throw CocoaError(.fileWriteNoPermission) }
            if ultimaContaConfirmada == conta {
                alvo.agendarExclusao()
                ultimaContaConfirmada = nil
                bloquear()
            }
            guard alvo.exclusaoPendente else { throw CocoaError(.fileWriteNoPermission) }
            try alvo.concluirExclusao()
            return
        }
        guard let conta = dados["conta"] else { throw CocoaError(.fileReadCorruptFile) }
        let perfil = PerfilLeitor(conta: conta)
        PerfilLeitor.retomarExclusoes()
        guard let titular = perfil.conta, let segundos = Int64(dados["expiraEm"] ?? ""),
              Date().timeIntervalSince1970 < Double(segundos) else { bloquear(); return }
        guard !perfil.exclusaoPendente else { bloquear(); throw CocoaError(.fileWriteNoPermission) }
        let limite = Date(timeIntervalSince1970: Double(segundos))
        alarme?.invalidate()
        ultimaContaConfirmada = titular
        vencimento = limite
        let timer = Timer(fire: limite, interval: 0, repeats: false) { [weak self] _ in
            MainActor.assumeIsolated { self?.conferirValidade() }
        }
        alarme = timer
        RunLoop.main.add(timer, forMode: .common)
        aplicar(perfil)
    }
}
