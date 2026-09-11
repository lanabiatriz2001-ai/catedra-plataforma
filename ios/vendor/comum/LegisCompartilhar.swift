import UIKit

/// "Sair do app" no iPadOS para o CátedraLEGIS. No Mac isso era NSWorkspace (revelar no
/// Finder, abrir arquivo); no iPad o caminho é o app Arquivos (via shareddocuments://)
/// e a folha de compartilhamento do sistema. Tudo aqui é UIKit puro, chamado de dentro
/// do SwiftUI — por isso o `topo()`, que acha o controlador certo para apresentar.
@MainActor
enum LegisCompartilhar {
    /// A janela-chave da cena em primeiro plano (o app tem uma janela, mas o iPadOS pode
    /// abrir mais de uma cena; a ativa é a que a pessoa está olhando).
    static func janelaChave() -> UIWindow? {
        let cenas = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let ativa = cenas.first { $0.activationState == .foregroundActive } ?? cenas.first
        guard let ativa else { return nil }
        return ativa.windows.first { $0.isKeyWindow } ?? ativa.windows.first
    }

    /// O UIViewController mais alto da pilha de apresentação — quem pode apresentar uma
    /// folha agora (apresentar a partir de um controlador já coberto falha em silêncio).
    static func topo() -> UIViewController? {
        guard var atual = janelaChave()?.rootViewController else { return nil }
        while let apresentado = atual.presentedViewController { atual = apresentado }
        return atual
    }

    /// Abre a pasta (ou arquivo) no app Arquivos. Só funciona com caminhos dentro da pasta
    /// Documentos do app, que o Arquivos enxerga (UIFileSharingEnabled no Info.plist): a
    /// URL file:// vira shareddocuments:// com o mesmo caminho. `conclusao` recebe false
    /// quando o sistema não abriu — a tela então diz onde a pasta está.
    static func abrirNoArquivos(_ pasta: URL, conclusao: @escaping (Bool) -> Void) {
        guard var partes = URLComponents(url: pasta, resolvingAgainstBaseURL: false) else {
            conclusao(false)
            return
        }
        partes.scheme = "shareddocuments"
        guard let url = partes.url else {
            conclusao(false)
            return
        }
        UIApplication.shared.open(url, options: [:]) { abriu in
            conclusao(abriu)
        }
    }

    /// Folha de compartilhamento do sistema (AirDrop, iCloud Drive, Mail, Salvar em
    /// Arquivos…). No iPad ela é um popover e exige âncora: fica no centro da janela,
    /// sem seta. Devolve false quando não há controlador para apresentar.
    @discardableResult
    static func compartilhar(_ url: URL) -> Bool {
        guard let apresentador = topo() else { return false }
        let folha = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        if let popover = folha.popoverPresentationController {
            let limites = apresentador.view.bounds
            popover.sourceView = apresentador.view
            popover.sourceRect = CGRect(x: limites.midX, y: limites.midY, width: 1, height: 1)
            popover.permittedArrowDirections = []
        }
        apresentador.present(folha, animated: true)
        return true
    }
}
