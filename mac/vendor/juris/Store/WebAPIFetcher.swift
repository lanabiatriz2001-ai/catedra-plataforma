import Foundation
import WebKit

/// Executa chamadas de API que exigem um navegador real (WAF do STF):
/// carrega a página oficial num WKWebView invisível e roda o `fetch` no
/// contexto dela, devolvendo o JSON como texto.
@MainActor
final class WebAPIFetcher: NSObject, WKNavigationDelegate {
    private var webView: WKWebView?
    private var loadContinuation: CheckedContinuation<Void, Error>?

    enum FetchError: LocalizedError {
        case timeout, badResult
        var errorDescription: String? {
            switch self {
            case .timeout: return "tempo esgotado ao carregar a página"
            case .badResult: return "resposta inesperada do site"
            }
        }
    }

    /// Carrega `pageURL` e executa `script` (JS assíncrono que retorna string).
    func fetchViaPage(pageURL: URL, script: String, timeout: TimeInterval = 45) async throws -> String {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        let wv = WKWebView(frame: NSRect(x: 0, y: 0, width: 1024, height: 768), configuration: config)
        wv.navigationDelegate = self
        wv.customUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15"
        self.webView = wv
        defer { self.webView = nil }

        // 1) carrega a página (o WebKit resolve o desafio do WAF)
        try await withThrowingTaskGroup(of: Void.self) { group in
            group.addTask { @MainActor in
                try await withCheckedThrowingContinuation { (c: CheckedContinuation<Void, Error>) in
                    self.loadContinuation = c
                    wv.load(URLRequest(url: pageURL))
                }
            }
            group.addTask {
                try await Task.sleep(nanoseconds: UInt64(timeout * 1_000_000_000))
                throw FetchError.timeout
            }
            try await group.next()
            group.cancelAll()
        }

        // pequena espera para o SPA assentar
        try await Task.sleep(nanoseconds: 1_500_000_000)

        // 2) executa o fetch no contexto da página
        let result = try await wv.callAsyncJavaScript(
            script, arguments: [:], in: nil, contentWorld: .defaultClient)
        guard let s = result as? String else { throw FetchError.badResult }
        return s
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        loadContinuation?.resume()
        loadContinuation = nil
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        loadContinuation?.resume(throwing: error)
        loadContinuation = nil
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        loadContinuation?.resume(throwing: error)
        loadContinuation = nil
    }
}
