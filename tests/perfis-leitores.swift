import Foundation

@main
struct TestesPerfisLeitores {
    @MainActor static func testarLoginDosLeitores() throws {
        var perfilAberto: String?
        let sessao = SessaoDosLeitores { perfilAberto = $0.conta }
        let a = UUID().uuidString.lowercased(), b = UUID().uuidString.lowercased()
        let agora = Int(Date().timeIntervalSince1970), vence = agora + 300
        precondition(sessao.contaAutorizada == nil && perfilAberto == nil)
        for aviso in [["conta": a], ["conta": "local", "expiraEm": String(vence)],
                      ["conta": a, "expiraEm": "indefinido"], ["conta": a, "expiraEm": String(agora)]] {
            try sessao.receber(aviso)
            precondition(sessao.contaAutorizada == nil && perfilAberto == nil)
        }
        sessao.pedirAba(2)
        sessao.encerrarDocumento() // a hidratação recarrega o documento antes de liberar a conta
        precondition(sessao.consumirAbaPedida(jurisDisponivel: true) == nil)
        try sessao.receber(["conta": a, "expiraEm": String(vence)])
        precondition(sessao.consumirAbaPedida(jurisDisponivel: true) == 2)
        precondition(sessao.consumirAbaPedida(jurisDisponivel: true) == nil)
        sessao.pedirAba(2)
        precondition(sessao.consumirAbaPedida(jurisDisponivel: false) == nil)
        sessao.pedirAba(1)
        sessao.pedirAba(0) // voltar ao Cátedra cancela a abertura pendente
        precondition(sessao.consumirAbaPedida(jurisDisponivel: true) == nil)

        precondition(sessao.contaAutorizada == a && perfilAberto == a)
        try sessao.receber(["conta": a, "expiraEm": String(vence + 300)])
        sessao.conferirValidade(agora: Date(timeIntervalSince1970: Double(vence)))
        precondition(sessao.contaAutorizada == a && perfilAberto == a)
        sessao.conferirValidade(agora: Date(timeIntervalSince1970: Double(vence + 300)))
        precondition(sessao.contaAutorizada == nil && perfilAberto == nil)
        try sessao.receber(["conta": b, "expiraEm": String(vence)])
        precondition(sessao.contaAutorizada == b && perfilAberto == b)
        try sessao.receber(["conta": ""])
        precondition(sessao.contaAutorizada == nil && perfilAberto == nil)
        try sessao.receber(["conta": b, "expiraEm": String(vence)])
        sessao.encerrarDocumento()
        precondition(sessao.contaAutorizada == nil && perfilAberto == nil)

        let fim = Date(timeIntervalSince1970: Double(Int(Date().timeIntervalSince1970) + 2))
        try sessao.receber(["conta": a, "expiraEm": String(Int(fim.timeIntervalSince1970))])
        precondition(sessao.contaAutorizada == a && perfilAberto == a)
        RunLoop.main.run(until: fim.addingTimeInterval(0.25))
        precondition(sessao.contaAutorizada == nil && perfilAberto == nil)
        try sessao.receber(["conta": b, "expiraEm": String(vence)])
        precondition(sessao.consumirAbaPedida(jurisDisponivel: true) == nil) // expiração não pede para reabrir
        let web = FileManager.default.temporaryDirectory.appendingPathComponent("web")
        precondition(SessaoDosLeitores.paginaPrincipal(web.appendingPathComponent("index.html"), em: web))
        precondition(!SessaoDosLeitores.paginaPrincipal(web.appendingPathComponent("outra/index.html"), em: web))
        precondition(!SessaoDosLeitores.paginaPrincipal(URL(string: "https://example.invalid/index.html"), em: web))
        print("LOGIN-LEITORES · Abrir, renovar, sair, recarregar e vencer a sessão dos leitores respeitam a conta e a página principal.")
    }

    @MainActor static func main() async throws {
        try testarLoginDosLeitores()
        let fm = FileManager.default
        let pasta = fm.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let aplicativo = "teste.catedra.perfis." + UUID().uuidString
        let a = PerfilLeitor(conta: UUID().uuidString, suporte: pasta, aplicativo: aplicativo)
        let b = PerfilLeitor(conta: UUID().uuidString, suporte: pasta, aplicativo: aplicativo)
        let semSessao = PerfilLeitor(conta: nil, suporte: pasta, aplicativo: aplicativo)
        defer {
            try? a.apagar()
            try? b.apagar()
            try? fm.removeItem(at: pasta)
            PerfilLeitor.ativar(semSessao)
        }
        let chave = UUID().uuidString
        let antigo = UserDefaults(suiteName: aplicativo)!
        defer { antigo.removePersistentDomain(forName: aplicativo) }
        antigo.set(chave, forKey: "anthropicKey")
        a.protegerChaveAntiga(antigo)
        precondition(antigo.string(forKey: "anthropicKey") == nil)
        PerfilLeitor.ativar(a)
        precondition(a.chaveAtual() == nil && a.guardarChave(chave))
        precondition(a.chaveAtual() == chave)
        PerfilLeitor.ativar(b)
        precondition(a.chaveAtual() == nil && b.chaveAtual() == nil && !a.guardarChave("outra"))
        do {
            _ = try await AIService.gerar(system: "", prompt: "", perfil: a)
            preconditionFailure("A geração de A prosseguiu na sessão B.")
        } catch AIService.AIError.semChave {}
        PerfilLeitor.ativar(semSessao)
        precondition(!semSessao.guardarChave(chave))
        do {
            _ = try await AIService.gerar(system: "", prompt: "", perfil: semSessao)
            preconditionFailure("A geração prosseguiu sem sessão.")
        } catch AIService.AIError.semChave {}
        print("NAT-04 · A chave do legado exige reentrada. A conta B e a saída recusam a chave de A antes da rede.")

        let origem = pasta.appendingPathComponent("VadeMecumJuris")
        try fm.createDirectory(at: origem, withIntermediateDirectories: true)
        let rascunhoAntigo = JurisRascunhoCache(em: origem)
        rascunhoAntigo.set("oral", "caso", "Resposta sem titular")
        rascunhoAntigo.encerrarPerfil()
        PerfilLeitor.ativar(a)
        let pastaA = a.raiz.appendingPathComponent("VadeMecumJuris")
        let pastaB = b.raiz.appendingPathComponent("VadeMecumJuris")
        for dir in [pastaA, pastaB] { try fm.createDirectory(at: dir, withIntermediateDirectories: true) }
        let rascunhoA = JurisRascunhoCache(em: pastaA)
        precondition(rascunhoA.get("oral", "caso") == nil)
        rascunhoA.set("oral", "caso", "Resposta de A")
        rascunhoA.encerrarPerfil()
        PerfilLeitor.ativar(b)
        let rascunhoB = JurisRascunhoCache(em: pastaB)
        precondition(rascunhoB.get("oral", "caso") == nil)
        rascunhoB.set("oral", "caso", "Resposta de B")
        rascunhoB.encerrarPerfil()
        PerfilLeitor.ativar(a)
        precondition(JurisRascunhoCache(em: pastaA).get("oral", "caso") == "Resposta de A")
        precondition(a.podeRecuperar && a.chaveAtual() == chave)
        try a.recuperarAcervoConfirmado()
        let anterior = PerfilLeitor(conta: a.conta, suporte: pasta, aplicativo: aplicativo)
        PerfilLeitor.ativar(anterior)
        precondition(anterior.usaLegado && !b.podeRecuperar)
        precondition(JurisRascunhoCache(em: anterior.raiz.appendingPathComponent("VadeMecumJuris")).get("oral", "caso") == "Resposta sem titular")
        anterior.alternarAcervo()
        let atual = PerfilLeitor(conta: a.conta, suporte: pasta, aplicativo: aplicativo)
        PerfilLeitor.ativar(atual)
        precondition(atual.raiz == a.raiz && JurisRascunhoCache(em: pastaA).get("oral", "caso") == "Resposta de A")
        a.agendarExclusao()
        precondition(a.exclusaoPendente && !b.exclusaoPendente)
        try a.concluirExclusao()
        try a.concluirExclusao()
        precondition(!a.exclusaoPendente)
        precondition(!fm.fileExists(atPath: a.raizConta.path) && a.chaveAtual() == nil && !b.podeRecuperar)
        precondition(JurisRascunhoCache(em: pastaB).get("oral", "caso") == "Resposta de B")
        print("NAT-09 · A troca offline separa rascunhos e a recuperação exige confirmação. Excluir A preserva B.")
    }
}
