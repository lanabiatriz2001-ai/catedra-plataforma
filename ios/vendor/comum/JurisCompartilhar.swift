import UIKit
import UniformTypeIdentifiers

/// Compartilhar e escolher arquivos no iPad, de qualquer ponto do CátedraJURIS.
///
/// No Mac o módulo usava NSSavePanel/NSOpenPanel. No iPadOS não existe painel modal de
/// arquivo chamável de qualquer lugar: o arquivo é gravado em Documentos do app (visível em
/// Arquivos › No meu iPad › Cátedra, por UIFileSharingEnabled) e, logo em seguida, a folha
/// de compartilhamento do sistema oferece Salvar em Arquivos, AirDrop, Mail, Imprimir…
/// Abrir usa o UIDocumentPickerViewController, com o delegate RETIDO aqui enquanto o
/// seletor está na tela (o seletor só guarda referência fraca ao delegate).
@MainActor
enum JurisCompartilhar {
    /// Controlador no topo da pilha de apresentação: janela-chave → raiz → sobe pelos
    /// apresentados (ignora um que já esteja sendo fechado, como um menu se retirando).
    static func topo() -> UIViewController? {
        let cenas = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let janelas = cenas.flatMap { $0.windows }
        let janela = janelas.first { $0.isKeyWindow } ?? janelas.first
        var vc = janela?.rootViewController
        while let apresentado = vc?.presentedViewController, !apresentado.isBeingDismissed {
            vc = apresentado
        }
        return vc
    }

    static func compartilhar(_ url: URL) { compartilhar([url]) }

    /// Pequena espera antes de apresentar: quando o pedido vem de um item de Menu, o
    /// menu ainda está se recolhendo e o UIKit recusa apresentar por cima dele.
    private static let esperaAntesDeApresentar: UInt64 = 300_000_000

    /// Folha de compartilhamento do sistema com um ou mais arquivos.
    static func compartilhar(_ urls: [URL]) {
        guard !urls.isEmpty else { return }
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: esperaAntesDeApresentar)
            guard let vc = topo() else { return }
            let folha = UIActivityViewController(activityItems: urls, applicationActivities: nil)
            // No iPad a folha é popover e PRECISA de âncora (sourceView/sourceRect), senão
            // o app cai. Ancorada no centro da tela, sem seta.
            if let pop = folha.popoverPresentationController {
                pop.sourceView = vc.view
                pop.sourceRect = CGRect(x: vc.view.bounds.midX, y: vc.view.bounds.midY, width: 1, height: 1)
                pop.permittedArrowDirections = []
            }
            vc.present(folha, animated: true)
        }
    }

    /// Delegate do seletor de documentos, retido enquanto o seletor está na tela.
    private static var seletorDelegate: SeletorDelegate?

    /// Abre o seletor de documentos (cópia local do arquivo escolhido) e devolve a URL
    /// pela completion — nil se a pessoa cancelou ou se não há tela para apresentar.
    static func escolherArquivo(tipos: [UTType], completion: @escaping (URL?) -> Void) {
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: esperaAntesDeApresentar)
            guard let vc = topo() else { completion(nil); return }
            let seletor = UIDocumentPickerViewController(forOpeningContentTypes: tipos, asCopy: true)
            seletor.allowsMultipleSelection = false
            let delegate = SeletorDelegate { url in
                JurisCompartilhar.seletorDelegate = nil
                completion(url)
            }
            seletorDelegate = delegate
            seletor.delegate = delegate
            vc.present(seletor, animated: true)
        }
    }

    @MainActor
    private final class SeletorDelegate: NSObject, UIDocumentPickerDelegate {
        let aoTerminar: (URL?) -> Void
        init(_ aoTerminar: @escaping (URL?) -> Void) { self.aoTerminar = aoTerminar }
        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            aoTerminar(urls.first)
        }
        func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
            aoTerminar(nil)
        }
    }
}
