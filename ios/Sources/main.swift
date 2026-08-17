// Cátedra para iPadOS — WKWebView em tela cheia carregando o mesmo bundle web do app
// do Mac (gerado por scripts/build-macos.mjs). Mesma arquitetura do mac/Sources/main.swift,
// com as diferenças que o iOS impõe:
//
//   · UIKit no lugar do AppKit (não existe NSAlert/NSWindow/NSWorkspace aqui).
//   · O .app do iOS é PLANO: o executável e o Info.plist ficam na raiz do bundle,
//     não em Contents/MacOS.
//   · O app é SANDBOXED de verdade: nada de ~/Documents da pessoa; o backup nativo do
//     Mac não tem equivalente direto (a nuvem do Supabase continua sendo o backup real).
//
// As PONTES nativas são as mesmas, porque o bundle web depende delas:
//   · catedraAI            → window.claude.complete (o build do Mac NÃO injeta shim de /api)
//   · notifyPermission/Show → window.Notification (o WKWebView não expõe a API web)
//   · WKUIDelegate         → alert/confirm/prompt. SEM isto o confirm() devolve false
//                            EM SILÊNCIO — e o app usa confirm em ponto sensível
//                            (o aviso de "sair com estudo não sincronizado", por exemplo).

import UIKit
import WebKit
import UserNotifications

// Endpoint da IA: Info.plist (CatedraAIEndpoint), com override por UserDefaults para
// poder trocar sem rebuild. Mesmo contrato do app do Mac.
func aiEndpoint() -> String {
    if let d = UserDefaults.standard.string(forKey: "CatedraAIEndpoint"), !d.isEmpty { return d }
    if let p = Bundle.main.object(forInfoDictionaryKey: "CatedraAIEndpoint") as? String, !p.isEmpty { return p }
    return ""
}

final class RootViewController: UIViewController, WKUIDelegate, WKNavigationDelegate, WKScriptMessageHandlerWithReply {

    var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground

        let cfg = WKWebViewConfiguration()
        let ucc = WKUserContentController()

        // Ponte de IA + notificações, no mundo .page (o app roda no mundo principal).
        for nome in ["catedraAI", "notifyPermission", "notifyShow", "catedraLembretes",
                     "catedraNav", "catedraPlano", "catedraPrint"] {
            ucc.addScriptMessageHandler(self, contentWorld: .page, name: nome)
        }
        ucc.addUserScript(WKUserScript(source: Self.pontesJS,
                                       injectionTime: .atDocumentStart,
                                       forMainFrameOnly: true))
        cfg.userContentController = ucc
        // O bundle é local (file://) e precisa ler os próprios arquivos. São DUAS chaves,
        // e elas moram em OBJETOS DIFERENTES — pôr as duas no mesmo objeto derruba o app
        // com NSUnknownKeyException no viewDidLoad (aprendido na marra):
        //   · allowFileAccessFromFileURLs      → WKPreferences
        //   · allowUniversalAccessFromFileURLs → WKWebViewConfiguration
        // A segunda é necessária porque o support.js faz fetch(location.href) para
        // reprocessar o template; sem ela o fetch é barrado por origem (subrecursos
        // como script/img/link carregariam, mas o fetch não).
        cfg.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        cfg.setValue(true, forKey: "allowUniversalAccessFromFileURLs")
        cfg.defaultWebpagePreferences.allowsContentJavaScript = true

        webView = WKWebView(frame: .zero, configuration: cfg)
        webView.uiDelegate = self
        webView.navigationDelegate = self
        webView.translatesAutoresizingMaskIntoConstraints = false
        // Sem isto o teclado do iPad empurra a página e o layout fica torto ao voltar.
        webView.scrollView.keyboardDismissMode = .interactive
        view.addSubview(webView)
        // Ocupa a tela inteira; o CSS do app cuida da safe area.
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])

        guard let dir = Bundle.main.url(forResource: "web", withExtension: nil) else {
            mostrarErro("Bundle web não encontrado dentro do app.")
            return
        }
        webView.loadFileURL(dir.appendingPathComponent("index.html"), allowingReadAccessTo: dir)
    }

    private func mostrarErro(_ t: String) {
        let a = UIAlertController(title: "Cátedra", message: t, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "OK", style: .default))
        present(a, animated: true)
    }

    // MARK: - Pontes injetadas na página

    // Mesmo shim do app do Mac: o token do Supabase é da PÁGINA, não do host — então a
    // página o busca e manda junto com o prompt (o /api/complete exige sessão).
    static let pontesJS = """
    (function () {
      window.claude = window.claude || {};
      window.claude.complete = function (prompt) {
        var envia = function (tok) {
          return window.webkit.messageHandlers.catedraAI.postMessage({
            prompt: String(prompt || ''), token: String(tok || '')
          });
        };
        try {
          if (window.CatedraAuth && window.CatedraAuth.client && window.CatedraAuth.client.auth) {
            return window.CatedraAuth.client.auth.getSession().then(
              function (s) { return envia(s && s.data && s.data.session && s.data.session.access_token); },
              function () { return envia(''); }
            );
          }
          return envia('');
        } catch (e) { return Promise.reject(e); }
      };

      // O WKWebView não expõe a Web Notification API: shimamos para o UNUserNotificationCenter.
      if (typeof window.Notification === 'undefined') {
        var N = function (titulo, opcoes) {
          try {
            window.webkit.messageHandlers.notifyShow.postMessage({
              title: String(titulo || ''), body: String((opcoes && opcoes.body) || '')
            });
          } catch (e) {}
        };
        N.permission = 'default';
        N.requestPermission = function (cb) {
          var p = window.webkit.messageHandlers.notifyPermission.postMessage({ request: true })
            .then(function (s) { N.permission = s; return s; });
          if (typeof cb === 'function') p.then(cb);
          return p;
        };
        window.Notification = N;
        try {
          window.webkit.messageHandlers.notifyPermission.postMessage({ request: false })
            .then(function (s) { N.permission = s; });
        } catch (e) {}
      }

      // ===== Lembrete de revisão que toca com o APP FECHADO =====
      // Isto é o que o site não faz. Lê as revisões do próprio armazenamento do app e
      // manda a contagem para o Swift agendar. Escrito para NÃO depender de eu ter
      // acertado o nome da chave: procura qualquer chave catedra:* cujo conteúdo pareça
      // uma lista de revisões. Se não achar nada, fica quieto — nunca quebra a página.
      function contarRevisoesPendentes() {
        var hoje = new Date(); hoje.setHours(23, 59, 59, 999);
        var limite = hoje.getTime();
        var melhor = 0;
        try {
          for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (!k || k.indexOf('catedra:') !== 0 || !/rev/i.test(k)) continue;
            var arr;
            try { arr = JSON.parse(localStorage.getItem(k)); } catch (e) { continue; }
            if (!Array.isArray(arr)) continue;
            var n = 0;
            for (var j = 0; j < arr.length; j++) {
              var r = arr[j]; if (!r || r.feito || r.done) continue;
              var t = null;
              if (r.dueDate) { var d = new Date(r.dueDate); if (!isNaN(d)) t = d.getTime(); }
              if (t === null && typeof r.due === 'number' && r.due > 1e11) t = r.due;
              if (t !== null && t <= limite) n++;
            }
            if (n > melhor) melhor = n;
          }
        } catch (e) {}
        return melhor;
      }

      function sincronizarLembrete() {
        try {
          if (!window.webkit || !window.webkit.messageHandlers.catedraLembretes) return;
          var hora = 8;
          try { var h = parseInt(localStorage.getItem('catedra:horaLembrete'), 10);
                if (h >= 0 && h <= 23) hora = h; } catch (e) {}
          window.webkit.messageHandlers.catedraLembretes.postMessage({
            pendentes: contarRevisoesPendentes(), hora: hora
          });
        } catch (e) {}
      }
      // Depois do app montar (o auth.js ainda recarrega a página uma vez), e de tempos
      // em tempos enquanto estiver aberto.
      window.addEventListener('load', function () { setTimeout(sincronizarLembrete, 5000); });
      setInterval(sincronizarLembrete, 10 * 60 * 1000);
      window.catedraSincronizarLembrete = sincronizarLembrete;   // para teste manual
    })();
    """

    func userContentController(_ ucc: WKUserContentController,
                               didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        switch message.name {
        case "catedraAI":        chamarIA(message, replyHandler)
        case "notifyPermission": permissaoNotificacao(message, replyHandler)
        case "notifyShow":       mostrarNotificacao(message); replyHandler(nil, nil)
        case "catedraLembretes": agendarLembretes(message, replyHandler)
        // Exclusivos do Mac (abas nativas, impressão). Respondem para o JS não travar
        // esperando uma promessa que nunca resolve.
        default:                 replyHandler(nil, nil)
        }
    }

    private func chamarIA(_ message: WKScriptMessage, _ reply: @escaping (Any?, String?) -> Void) {
        let corpo = message.body as? [String: Any] ?? [:]
        let prompt = (corpo["prompt"] as? String) ?? ""
        let token = (corpo["token"] as? String) ?? ""
        let ep = aiEndpoint()
        guard !ep.isEmpty, let url = URL(string: ep) else {
            reply(nil, "IA não configurada neste app."); return
        }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if !token.isEmpty { req.setValue("Bearer " + token, forHTTPHeaderField: "Authorization") }
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["prompt": prompt])
        req.timeoutInterval = 60
        URLSession.shared.dataTask(with: req) { data, resp, err in
            DispatchQueue.main.async {
                if let err { reply(nil, "Falha de rede: " + err.localizedDescription); return }
                guard let data else { reply(nil, "Resposta vazia da IA."); return }
                let obj = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
                if let texto = obj?["completion"] as? String { reply(texto, nil); return }
                // Devolve o erro do servidor em vez de um silêncio — foi o que fez a IA
                // "não responder" no Mac sem ninguém saber por quê.
                let msg = (obj?["error"] as? String)
                    ?? "A IA não respondeu (HTTP \((resp as? HTTPURLResponse)?.statusCode ?? 0))."
                reply(nil, msg)
            }
        }.resume()
    }

    private func permissaoNotificacao(_ message: WKScriptMessage, _ reply: @escaping (Any?, String?) -> Void) {
        let centro = UNUserNotificationCenter.current()
        let pedir = ((message.body as? [String: Any])?["request"] as? Bool) ?? false
        if pedir {
            centro.requestAuthorization(options: [.alert, .sound, .badge]) { ok, erro in
                if let erro { NSLog("Cátedra: permissão de notificação falhou: \(erro.localizedDescription)") }
                if ok { reply("granted", nil) }
                else { centro.getNotificationSettings { s in reply(Self.mapear(s.authorizationStatus), nil) } }
            }
        } else {
            centro.getNotificationSettings { s in reply(Self.mapear(s.authorizationStatus), nil) }
        }
    }

    private static func mapear(_ s: UNAuthorizationStatus) -> String {
        switch s {
        case .authorized, .provisional, .ephemeral: return "granted"
        case .denied: return "denied"
        default: return "default"
        }
    }

    /// Agenda o lembrete diário de revisão — a coisa que um site NÃO consegue fazer no iOS.
    ///
    /// O `new Notification(...)` da web só dispara com a página ABERTA: fecha o app, acabou
    /// o lembrete. Aqui usamos UNCalendarNotificationTrigger, que o sistema entrega no
    /// horário mesmo com o app fechado — é o motivo de existir um app nativo em vez de só
    /// o site, e vale tanto para a pessoa quanto para a revisão da Apple (diretriz 4.2).
    private func agendarLembretes(_ message: WKScriptMessage, _ reply: @escaping (Any?, String?) -> Void) {
        let c = message.body as? [String: Any] ?? [:]
        let pendentes = (c["pendentes"] as? Int) ?? 0
        let hora = min(23, max(0, (c["hora"] as? Int) ?? 8))
        let centro = UNUserNotificationCenter.current()
        let ident = "catedra-revisao-diaria"

        // Sem revisão pendente não há por que incomodar: cancela o que estava agendado.
        centro.removePendingNotificationRequests(withIdentifiers: [ident])
        guard pendentes > 0 else { reply("cancelado", nil); return }

        // Só agenda se a pessoa autorizou — pedir aqui seria um prompt do nada.
        centro.getNotificationSettings { s in
            guard s.authorizationStatus == .authorized || s.authorizationStatus == .provisional else {
                reply("sem-permissao", nil); return
            }
            let conteudo = UNMutableNotificationContent()
            conteudo.title = "Revisões de hoje"
            conteudo.body = pendentes == 1
                ? "Você tem 1 revisão pendente. Cinco minutos resolvem."
                : "Você tem \(pendentes) revisões pendentes. Comece pela mais atrasada."
            conteudo.sound = .default
            var quando = DateComponents(); quando.hour = hora; quando.minute = 0
            let req = UNNotificationRequest(
                identifier: ident, content: conteudo,
                trigger: UNCalendarNotificationTrigger(dateMatching: quando, repeats: true))
            centro.add(req) { erro in
                if let erro { reply(nil, erro.localizedDescription) }
                else { reply("agendado", nil) }
            }
        }
    }

    private func mostrarNotificacao(_ message: WKScriptMessage) {
        let c = message.body as? [String: Any] ?? [:]
        let conteudo = UNMutableNotificationContent()
        conteudo.title = (c["title"] as? String) ?? "Cátedra"
        conteudo.body = (c["body"] as? String) ?? ""
        conteudo.sound = .default
        UNUserNotificationCenter.current().add(
            UNNotificationRequest(identifier: UUID().uuidString, content: conteudo, trigger: nil))
    }

    // MARK: - alert / confirm / prompt
    // Sem estes três o WKWebView responde SOZINHO e em silêncio: alert some, confirm()
    // devolve false e prompt() devolve nil. O app usa confirm() em decisão sensível
    // (sair com estudo não sincronizado), então isso não é cosmético.

    func webView(_ w: WKWebView, runJavaScriptAlertPanelWithMessage m: String,
                 initiatedByFrame f: WKFrameInfo, completionHandler done: @escaping () -> Void) {
        let a = UIAlertController(title: "Cátedra", message: m, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in done() })
        present(a, animated: true)
    }

    func webView(_ w: WKWebView, runJavaScriptConfirmPanelWithMessage m: String,
                 initiatedByFrame f: WKFrameInfo, completionHandler done: @escaping (Bool) -> Void) {
        let a = UIAlertController(title: "Cátedra", message: m, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "Cancelar", style: .cancel) { _ in done(false) })
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in done(true) })
        present(a, animated: true)
    }

    func webView(_ w: WKWebView, runJavaScriptTextInputPanelWithPrompt m: String, defaultText d: String?,
                 initiatedByFrame f: WKFrameInfo, completionHandler done: @escaping (String?) -> Void) {
        let a = UIAlertController(title: "Cátedra", message: m, preferredStyle: .alert)
        a.addTextField { $0.text = d }
        a.addAction(UIAlertAction(title: "Cancelar", style: .cancel) { _ in done(nil) })
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in done(a.textFields?.first?.text) })
        present(a, animated: true)
    }

    // Link externo (http/https) abre no Safari em vez de sequestrar a tela do app.
    func webView(_ w: WKWebView, createWebViewWith cfg: WKWebViewConfiguration,
                 for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let u = action.request.url, let s = u.scheme?.lowercased(), s == "http" || s == "https" {
            UIApplication.shared.open(u)
        }
        return nil
    }
}

// CICLO DE VIDA POR CENA (UIScene) — obrigatório, não é estilo.
//
// O padrão antigo (AppDelegate com `var window` + makeKeyAndVisible no
// didFinishLaunching, igual ao do macOS) instala normalmente e RODA no iPadOS 26,
// mas no iPadOS 27 o app MORRE no lançamento: EXC_BREAKPOINT / SIGTRAP em
// ___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption. Não é aviso, é
// trap — e o gatilho é o SDK com que se LINKA, não o MinimumOSVersion.
// Descoberto do jeito difícil: rodou no simulador de iOS 26.5 e crashou no de 27.0,
// mesmo binário.
//
// A cena é entregue por CÓDIGO (delegateClass abaixo), o que evita ter que declarar
// UIApplicationSceneManifest no Info.plist — que exigiria acertar o nome do módulo
// Swift, coisa frágil num build sem projeto Xcode.
final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession,
               options: UIScene.ConnectionOptions) {
        guard let cena = scene as? UIWindowScene else { return }
        let w = UIWindow(windowScene: cena)   // e não UIWindow(frame: UIScreen.main.bounds)
        w.rootViewController = RootViewController()
        w.makeKeyAndVisible()
        window = w
    }
}

final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ app: UIApplication,
                     didFinishLaunchingWithOptions opts: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }
    func application(_ app: UIApplication,
                     configurationForConnecting sessao: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let c = UISceneConfiguration(name: "Default Configuration", sessionRole: sessao.role)
        c.delegateClass = SceneDelegate.self
        return c
    }
}

// main.swift aceita código de topo: chamamos o UIApplicationMain à mão para não
// precisar de @main nem de projeto Xcode (mesmo espírito do build do Mac).
UIApplicationMain(CommandLine.argc, CommandLine.unsafeArgv, nil, NSStringFromClass(AppDelegate.self))
