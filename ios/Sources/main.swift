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
import SwiftUI
import WebKit
import UniformTypeIdentifiers
import UserNotifications

// Endpoint da IA: Info.plist (CatedraAIEndpoint), com override por UserDefaults para
// poder trocar sem rebuild. Mesmo contrato do app do Mac.
func aiEndpoint() -> String {
    if let d = UserDefaults.standard.string(forKey: "CatedraAIEndpoint"), !d.isEmpty { return d }
    if let p = Bundle.main.object(forInfoDictionaryKey: "CatedraAIEndpoint") as? String, !p.isEmpty { return p }
    return ""
}

final class RootViewController: UIViewController, WKUIDelegate, WKNavigationDelegate, WKScriptMessageHandlerWithReply, WKDownloadDelegate, UIDocumentPickerDelegate {

    var webView: WKWebView!
    private var segmento: UISegmentedControl!
    var botaoVoltarAcervo: UIButton!   // item 5: volta ao ponto do processo (só com origem viva)
    private var areaConteudo: UIView!
    private var legisVC: UIViewController?   // criados sob demanda, na 1ª vez que a aba abre
    private var jurisVC: UIViewController?
    // @Observable, sem .shared: a instância é guardada aqui, como o host do Mac faz.
    private var jurisStore: LibraryStore?
    private var jurisUpdater: UpdateService?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        // LEGIS → JURIS: "abrir este verbete" (jurisprudência por artigo). Troca a aba e,
        // com o store montado, leva até o verbete.
        NotificationCenter.default.addObserver(forName: JurisPorArtigo.notificacaoAbrir, object: nil, queue: .main) { [weak self] n in
            MainActor.assumeIsolated {
                guard let self, let id = n.userInfo?["id"] as? String else { return }
                self.segmento.selectedSegmentIndex = 2
                self.trocarAba()
                self.jurisStore?.abrirVerbete(id)
            }
        }

        let cfg = WKWebViewConfiguration()
        let ucc = WKUserContentController()

        // Ponte de IA + notificações, no mundo .page (o app roda no mundo principal).
        for nome in ["catedraAI", "notifyPermission", "notifyShow", "catedraLembretes",
                     "catedraNav", "catedraPlano", "catedraPrint", "catedraAcervo", "catedraBackup",
                     "catedraArea"] {
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

        // ABAS NO TOPO, como no app do Mac: Cátedra | CátedraLEGIS. No Mac isso é a barra
        // de abas do host AppKit; aqui é um UISegmentedControl acima do conteúdo. A
        // WebView deixa de ocupar a tela inteira e passa a viver na área de conteúdo,
        // trocada com a tela nativa do LEGIS.
        segmento = UISegmentedControl(items: ["Cátedra", "CátedraLEGIS", "CátedraJURIS"])
        // -abaLegis / -abaJuris abrem já na aba correspondente. Servem para verificar os
        // portes no simulador sem depender de alguém tocar na tela; em uso normal ninguém
        // passa esses argumentos.
        let args = ProcessInfo.processInfo.arguments
        segmento.selectedSegmentIndex = args.contains("-abaJuris") ? 2
                                      : args.contains("-abaLegis") ? 1 : 0
        segmento.translatesAutoresizingMaskIntoConstraints = false
        segmento.addTarget(self, action: #selector(trocarAba), for: .valueChanged)

        let barra = UIView()
        barra.translatesAutoresizingMaskIntoConstraints = false
        barra.backgroundColor = .secondarySystemBackground
        barra.addSubview(segmento)

        // Item 5: "← Voltar ao ponto do processo". Fica escondido até alguém chegar aqui
        // por um chip do mapa de Processo e peças — antes o caminho era de mão única.
        botaoVoltarAcervo = UIButton(type: .system)
        botaoVoltarAcervo.translatesAutoresizingMaskIntoConstraints = false
        botaoVoltarAcervo.setTitle("← Voltar ao processo", for: .normal)
        botaoVoltarAcervo.titleLabel?.font = .systemFont(ofSize: 13, weight: .semibold)
        botaoVoltarAcervo.isHidden = true
        botaoVoltarAcervo.addTarget(self, action: #selector(voltarAoProcesso), for: .touchUpInside)
        barra.addSubview(botaoVoltarAcervo)

        areaConteudo = UIView()
        areaConteudo.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(barra)
        view.addSubview(areaConteudo)
        areaConteudo.addSubview(webView)

        NSLayoutConstraint.activate([
            barra.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            barra.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            barra.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            segmento.centerXAnchor.constraint(equalTo: barra.centerXAnchor),
            segmento.topAnchor.constraint(equalTo: barra.topAnchor, constant: 6),
            segmento.bottomAnchor.constraint(equalTo: barra.bottomAnchor, constant: -6),
            botaoVoltarAcervo.leadingAnchor.constraint(equalTo: barra.leadingAnchor, constant: 14),
            botaoVoltarAcervo.centerYAnchor.constraint(equalTo: segmento.centerYAnchor),
            botaoVoltarAcervo.trailingAnchor.constraint(lessThanOrEqualTo: segmento.leadingAnchor, constant: -12),

            areaConteudo.topAnchor.constraint(equalTo: barra.bottomAnchor),
            areaConteudo.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            areaConteudo.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            areaConteudo.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            webView.topAnchor.constraint(equalTo: areaConteudo.topAnchor),
            webView.bottomAnchor.constraint(equalTo: areaConteudo.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: areaConteudo.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: areaConteudo.trailingAnchor),
        ])

        guard let dir = Bundle.main.url(forResource: "web", withExtension: nil) else {
            mostrarErro("Bundle web não encontrado dentro do app.")
            return
        }
        webView.loadFileURL(dir.appendingPathComponent("index.html"), allowingReadAccessTo: dir)
        instalarProvedorIA()   // IA dos módulos nativos passa pelo mesmo /api/complete do app
        trocarAba()   // aplica a aba inicial (normalmente Cátedra)
    }

    /// Troca entre a WebView do Cátedra e a tela nativa do CátedraLEGIS. O LEGIS é criado
    /// na primeira vez que a aba é aberta (o AppStore dele carrega a biblioteca do disco,
    /// e não faz sentido pagar isso em quem nunca abrir a aba) e depois fica vivo — sair e
    /// voltar não perde o que estava na tela nem recarrega a norma.
    @objc private func trocarAba() {
        // Antes de montar (ou remontar) uma aba nativa, espelha o tema do Cátedra. Sem
        // isto os módulos ficavam presos no tema de fallback — no iPad, Fibra claro com
        // acento #4263EB — e não acompanhavam nem a direção visual nem o modo escuro
        // escolhidos no app. Este host simplesmente não tinha ponte de tema.
        espelharTema { [weak self] mudou in
            guard let self else { return }
            self.montarAba(remontar: mudou)
        }
    }

    /* A ÁREA DE ESTUDO CHEGA DA WEB (handler catedraArea). Este UISegmentedControl é
       Swift e não passa pelo guarda de rota do app web — sem isto, quem estuda Enfermagem
       tocava na terceira aba e recebia o acervo de súmulas inteiro. */
    private var jurisDisponivel = true
    func aplicarArea(juris: Bool) {
        guard juris != jurisDisponivel, segmento != nil else { jurisDisponivel = juris; return }
        jurisDisponivel = juris
        if juris {
            if segmento.numberOfSegments < 3 { segmento.insertSegment(withTitle: "CátedraJURIS", at: 2, animated: false) }
        } else {
            // quem estiver DENTRO da aba que vai sumir precisa sair antes
            if segmento.selectedSegmentIndex == 2 { segmento.selectedSegmentIndex = 0; trocarAba() }
            if segmento.numberOfSegments > 2 { segmento.removeSegment(at: 2, animated: false) }
        }
    }

    private func montarAba(remontar: Bool) {
        let aba = segmento.selectedSegmentIndex
        // Voltou ao Cátedra pela aba: a volta ao ponto do processo deixou de fazer sentido.
        if aba == 0 { AcervoEntrada.shared.limpar() }
        atualizarBotaoVoltarAcervo()
        if remontar {
            // Tema novo: o SwiftUI leu as cores no build, então a tela precisa nascer de novo.
            if let v = legisVC { v.willMove(toParent: nil); v.view.removeFromSuperview(); v.removeFromParent(); legisVC = nil }
            if let v = jurisVC { v.willMove(toParent: nil); v.view.removeFromSuperview(); v.removeFromParent(); jurisVC = nil }
        }
        if aba == 1 && legisVC == nil {
            legisVC = encaixar(UIHostingController(rootView: CatedraLegisRoot(store: AppStore.shared)))
        }
        if aba == 2 && jurisVC == nil {
            let st = jurisStore ?? LibraryStore(); jurisStore = st
            let up = jurisUpdater ?? UpdateService(); jurisUpdater = up
            jurisVC = encaixar(UIHostingController(rootView: CatedraJurisRoot(store: st, updater: up)))
        }
        webView.isHidden  = (aba != 0)
        legisVC?.view.isHidden = (aba != 1)
        jurisVC?.view.isHidden = (aba != 2)
        switch aba {
        case 1: if let v = legisVC?.view { areaConteudo.bringSubviewToFront(v) }
        case 2: if let v = jurisVC?.view { areaConteudo.bringSubviewToFront(v) }
        default: areaConteudo.bringSubviewToFront(webView)
        }
    }

    // ===== PONTE DE TEMA: Cátedra (CSS vars) → ThemeState dos módulos nativos =====
    // Espelho do que o host do Mac faz. O app escreve o tema inteiro como custom
    // properties num elemento com --accent; aqui lemos as computadas e traduzimos.
    private var ultimoTema: String = ""

    private func espelharTema(_ done: @escaping (Bool) -> Void) {
        let js = """
        (function(){
          var el = document.querySelector('[style*="--accent"]') || document.documentElement;
          var s = getComputedStyle(el);
          function g(n){ return (s.getPropertyValue(n)||'').trim(); }
          return JSON.stringify({
            bg:g('--bg'), surface:g('--surface'), surface2:g('--surface2'), border:g('--border'),
            ink:g('--ink'), text2:g('--text2'), text3:g('--text3'),
            accent:g('--accent'), accentD:g('--accentD'),
            accentSoft:g('--accentSoft'), accentRing:g('--accentRing'), onAccent:g('--onAccent'),
            ok:g('--ok'), warn:g('--warn'), danger:g('--danger'),
            radius:g('--radius'), display:g('--display'), body:g('--body'), mono:g('--mono'),
            sbg:g('--sbg'), stext:g('--stext'), sactbg:g('--sactbg'), sacttext:g('--sacttext'),
            heroGrad:g('--heroGrad'), dark:(localStorage.getItem('catedra:dark')||'')
          });
        })()
        """
        webView.evaluateJavaScript(js) { [weak self] r, _ in
            done(self?.aplicarTema(r as? String) ?? false)
        }
    }

    @discardableResult
    private func aplicarTema(_ json: String?) -> Bool {
        guard let json, let data = json.data(using: .utf8),
              let d = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return false }
        func col(_ k: String) -> Color? { (d[k] as? String).flatMap { Color(css: $0) } }
        var t = ThemeState.t
        if let c = col("bg")       { t.bg = c }
        if let c = col("surface")  { t.surface = c }
        if let c = col("surface2") { t.surface2 = c }
        if let c = col("border")   { t.border = c }
        if let c = col("ink")      { t.ink = c }
        if let c = col("text2")    { t.text2 = c }
        if let c = col("text3")    { t.text3 = c }
        if let c = col("accent")   { t.accent = c }
        if let c = col("accentD")  { t.accentD = c }
        if let c = col("ok")       { t.ok = c }
        if let c = col("warn")     { t.warn = c }
        if let c = col("danger")   { t.danger = c }
        if let disp = d["display"] as? String {
            let l = disp.lowercased()
            t.displaySerif = l.contains("spectral") || l.contains("georgia")
                || (l.contains("serif") && !l.contains("sans-serif"))
        }
        if let c = col("sbg")      { t.sidebarBg = c }
        if let c = col("stext")    { t.sidebarText = c }
        if let c = col("sactbg")   { t.sidebarActiveBg = c }
        if let c = col("sacttext") { t.sidebarActiveText = c }
        if let s = d["radius"] as? String,
           let n = Double(s.replacingOccurrences(of: "px", with: "").trimmingCharacters(in: .whitespaces)) {
            t.radius = min(24, max(4, CGFloat(n)))
        }
        t.heroStops = Self.paradasDoGradiente(d["heroGrad"] as? String, accent: t.accent, accentD: t.accentD)
        let dk = ((d["dark"] as? String) ?? "").trimmingCharacters(in: CharacterSet(charactersIn: "\" "))
        t.isDark = (dk == "1" || dk.lowercased() == "true")
        ThemeState.t = t
        // As duas chaves existem porque LEGIS e JURIS guardam o modo com vocabulários
        // diferentes ("light"/"dark" e "claro"/"escuro"); trocá-las colidiria.
        UserDefaults.standard.set(t.isDark ? "dark" : "light", forKey: "appearance")
        UserDefaults.standard.set(t.isDark ? "escuro" : "claro", forKey: "jurisAppearance")
        let mudou = (json != ultimoTema)
        ultimoTema = json
        return mudou
    }

    /// Extrai as paradas de cor de um `--heroGrad` (gradiente ou cor sólida).
    private static func paradasDoGradiente(_ grad: String?, accent: Color, accentD: Color) -> [Color] {
        guard let grad, !grad.isEmpty else { return [accent, accentD] }
        let ns = grad as NSString
        let cols: [Color] = (try? NSRegularExpression(pattern: "#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgba?\\([^)]*\\)"))?
            .matches(in: grad, range: NSRange(location: 0, length: ns.length))
            .compactMap { Color(css: ns.substring(with: $0.range)) } ?? []
        if cols.count >= 2 { return cols }
        if cols.count == 1 { return [cols[0], cols[0]] }
        return [accent, accentD]
    }

    /// Encaixa uma tela nativa na área de conteúdo, do tamanho dela.
    private func encaixar(_ host: UIViewController) -> UIViewController {
        // MODO ESCURO DO EMBED: `.preferredColorScheme` é preferência de CENA e não chega a
        // um UIHostingController encaixado à mão. Sem isto o LEGIS/JURIS pintava as
        // superfícies escuras (tokens do tema do Cátedra) e escrevia com as cores
        // semânticas do modo CLARO — texto cinza-escuro sobre fundo escuro. Forçar o
        // estilo na view resolve para o SwiftUI e para os controles UIKit de uma vez.
        host.overrideUserInterfaceStyle = ThemeState.t.isDark ? .dark : .light
        addChild(host)
        host.view.translatesAutoresizingMaskIntoConstraints = false
        areaConteudo.addSubview(host.view)
        NSLayoutConstraint.activate([
            host.view.topAnchor.constraint(equalTo: areaConteudo.topAnchor),
            host.view.bottomAnchor.constraint(equalTo: areaConteudo.bottomAnchor),
            host.view.leadingAnchor.constraint(equalTo: areaConteudo.leadingAnchor),
            host.view.trailingAnchor.constraint(equalTo: areaConteudo.trailingAnchor),
        ])
        host.didMove(toParent: self)
        return host
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

      // Mapa de Processo e peças -> acervo. Dentro do app NATIVO a troca é de ABA (o
      // LEGIS e o JURIS são telas nativas ao lado); no site, quem trata é o próprio app
      // web. Este shim intercepta a mensagem do iframe e a repassa ao Swift.
      window.addEventListener('message', function (e) {
        try {
          if (!e || !e.data || e.data.type !== 'ctAbrirAcervo') return;
          // Item 5: o termo e o ponto de origem viajam junto (antes ia só a aba).
          window.webkit.messageHandlers.catedraAcervo.postMessage({
            alvo: String(e.data.alvo || ''), termo: String(e.data.termo || ''),
            de: (e.data.de && typeof e.data.de === 'object') ? e.data.de
              : (e.data.origem && typeof e.data.origem === 'object' ? e.data.origem : null)
          });
          e.stopImmediatePropagation();
        } catch (err) {}
      });

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


    // MARK: - Backup na nuvem pessoal + exports (iPad)
    // O app é sandboxed e sem container iCloud (zero entitlements): o caminho honesto é o
    // seletor de documentos do sistema — a pessoa escolhe iCloud Drive (ou qualquer pasta)
    // na hora de salvar/abrir. Antes, "Exportar" na web não fazia NADA no iPad: o blob: do
    // download era engolido pelo WKWebView. Agora todo download vira um arquivo temporário
    // entregue ao mesmo seletor.
    private var backupReply: ((Any?, String?) -> Void)?
    private var backupModo = ""
    private func handleBackup(_ message: WKScriptMessage, _ reply: @escaping (Any?, String?) -> Void) {
        let body = message.body as? [String: Any] ?? [:]
        let acao = body["acao"] as? String ?? ""
        let nomePedido = body["nome"] as? String ?? ""
        let nome = nomePedido.isEmpty ? "catedra-backup.json" : nomePedido
        if acao == "salvar" {
            guard let json = body["json"] as? String, let data = json.data(using: .utf8), !data.isEmpty else { reply(["erro": "backup vazio"], nil); return }
            let tmp = FileManager.default.temporaryDirectory.appendingPathComponent(nome)
            do { try data.write(to: tmp, options: .atomic) } catch { reply(["erro": error.localizedDescription], nil); return }
            backupReply?(["cancelado": true], nil)
            backupReply = reply; backupModo = "salvar"
            let picker = UIDocumentPickerViewController(forExporting: [tmp], asCopy: true)
            picker.delegate = self
            present(picker, animated: true)
        } else if acao == "ler" {
            backupReply?(["cancelado": true], nil)
            backupReply = reply; backupModo = "ler"
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.json], asCopy: true)
            picker.delegate = self
            present(picker, animated: true)
        } else {
            reply(["erro": "ação desconhecida"], nil)
        }
    }
    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let responder = backupReply else { return }
        backupReply = nil
        if backupModo == "salvar" {
            responder(["ok": true, "onde": urls.first?.deletingLastPathComponent().lastPathComponent ?? "Arquivos"], nil)
            return
        }
        guard let origem = urls.first else { responder(["cancelado": true], nil); return }
        do {
            let dados = try Data(contentsOf: origem)
            responder(["json": String(decoding: dados, as: UTF8.self), "quando": ""], nil)
        } catch { responder(["erro": error.localizedDescription], nil) }
    }
    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        backupReply?(["cancelado": true], nil)
        backupReply = nil
    }

    // Exports do app (âncora com download → blob:) viram download nativo → seletor de
    // documentos. Link http(s) clicado abre no Safari em vez de substituir o app na webview.
    func webView(_ wv: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if action.shouldPerformDownload { decisionHandler(.download); return }
        if let url = action.request.url, let scheme = url.scheme?.lowercased(),
           (scheme == "http" || scheme == "https"), action.navigationType == .linkActivated {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }
    private var downloadDests: [ObjectIdentifier: URL] = [:]
    func webView(_ wv: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { download.delegate = self }
    func webView(_ wv: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) { download.delegate = self }
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String,
                  completionHandler: @escaping (URL?) -> Void) {
        let nome = suggestedFilename.isEmpty ? "catedra-export" : suggestedFilename
        let destino = FileManager.default.temporaryDirectory.appendingPathComponent(nome)
        try? FileManager.default.removeItem(at: destino)
        downloadDests[ObjectIdentifier(download)] = destino
        completionHandler(destino)
    }
    func downloadDidFinish(_ download: WKDownload) {
        guard let arquivo = downloadDests.removeValue(forKey: ObjectIdentifier(download)) else { return }
        let picker = UIDocumentPickerViewController(forExporting: [arquivo], asCopy: true)
        present(picker, animated: true)
    }
    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        downloadDests.removeValue(forKey: ObjectIdentifier(download))
    }

    func userContentController(_ ucc: WKUserContentController,
                               didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        switch message.name {
        case "catedraAI":        chamarIA(message, replyHandler)
        case "notifyPermission": permissaoNotificacao(message, replyHandler)
        case "notifyShow":       mostrarNotificacao(message); replyHandler(nil, nil)
        case "catedraLembretes": agendarLembretes(message, replyHandler)
        case "catedraArea":
            // {area, rotulo, juris, legis} — a web avisa o que a área ativa oferece
            if let d = message.body as? [String: Any] {
                let temJuris = (d["juris"] as? Bool) ?? true
                DispatchQueue.main.async { self.aplicarArea(juris: temJuris) }
            }
            replyHandler(nil, nil)
        case "catedraNav":       abrirTelaNativa(message); replyHandler(nil, nil)
        case "catedraAcervo":    abrirAcervoNativo(message); replyHandler(nil, nil)
        case "catedraBackup":    handleBackup(message, replyHandler)
        // Exclusivos do Mac (impressão). Respondem para o JS não travar esperando uma
        // promessa que nunca resolve.
        default:                 replyHandler(nil, nil)
        }
    }

    /// O JS pedia uma tela nativa por catedraNav. Com as abas no topo isso deixou de ter
    /// uso: quem troca de tela é a aba, não a página. Fica só o aceite da mensagem para o
    /// JS não travar esperando uma promessa.
    private func abrirTelaNativa(_ message: WKScriptMessage) { }

    /// O mapa de Processo e peças pediu um instituto no acervo. No iPad temos as abas
    /// NATIVAS ao lado — abrir o LEGIS/JURIS web dentro da aba Cátedra deixaria duas
    /// portas para o mesmo acervo. Então a mensagem troca de aba em vez de trocar a
    /// página. (O termo ainda não vai para dentro da busca nativa; isso pede um ponto de
    /// entrada no módulo, e sem ele eu abriria a aba fingindo que buscou.)
    private func abrirAcervoNativo(_ message: WKScriptMessage) {
        let corpo = message.body as? [String: Any] ?? [:]
        let alvo = (corpo["alvo"] as? String) ?? ""
        guard alvo == "legis" || alvo == "juris" else { return }
        // Item 5: além de trocar a aba, leva o TERMO e guarda o ponto de origem para a volta.
        let termo = (corpo["termo"] as? String) ?? ""
        let origem = AcervoEntrada.origem(de: corpo["de"] as? [String: Any])
        DispatchQueue.main.async {
            AcervoEntrada.shared.chegou(termo: termo, origem: origem)
            self.segmento.selectedSegmentIndex = (alvo == "juris") ? 2 : 1
            self.trocarAba()
            self.atualizarBotaoVoltarAcervo()
            if alvo == "juris", !termo.isEmpty {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
                    guard let store = self?.jurisStore else { return }
                    store.ir(.todos)          // ir() zera a busca: o termo entra DEPOIS
                    store.searchText = termo
                }
            }
        }
    }

    /// Botão "voltar ao ponto do processo" na barra de abas — só quando há origem viva.
    func atualizarBotaoVoltarAcervo() {
        let temOrigem = AcervoEntrada.shared.origem != nil && segmento.selectedSegmentIndex != 0
        botaoVoltarAcervo?.isHidden = !temOrigem
        if let o = AcervoEntrada.shared.origem { botaoVoltarAcervo?.setTitle("← " + o.rotulo, for: .normal) }
    }

    @objc func voltarAoProcesso() {
        guard let o = AcervoEntrada.shared.origem else { return }
        AcervoEntrada.shared.limpar()
        segmento.selectedSegmentIndex = 0
        trocarAba()
        atualizarBotaoVoltarAcervo()
        // O app web reabre o mapa/roteiro no ponto exato (window.catedraVoltarAcervo).
        webView.evaluateJavaScript("window.catedraVoltarAcervo && window.catedraVoltarAcervo(\(o.jsonJS))", completionHandler: nil)
    }

    /// Mesma coisa do host do Mac: os módulos nativos usam a IA DO APP (a sessão do
    /// Supabase que já está no WebView), e não o AIService com chave da Anthropic.
    func instalarProvedorIA() {
        CatedraIA.provedor = { [weak self] prompt in
            guard let self else { throw CatedraIA.Erro.indisponivel }
            let token = await self.tokenDaSessao()
            let ep = aiEndpoint()
            guard !ep.isEmpty, let url = URL(string: ep) else { throw CatedraIA.Erro.servidor("Endpoint de IA não configurado neste app.") }
            if token.isEmpty { throw CatedraIA.Erro.servidor("Não achei a sessão do Cátedra. Entre na conta na aba Cátedra e tente de novo.") }
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.timeoutInterval = 60
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            if !token.isEmpty { req.setValue("Bearer " + token, forHTTPHeaderField: "Authorization") }
            req.httpBody = try? JSONSerialization.data(withJSONObject: ["prompt": prompt])
            let (data, _) = try await URLSession.shared.data(for: req)
            guard let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                throw CatedraIA.Erro.vazia
            }
            if let e = obj["error"] as? String, !e.isEmpty { throw CatedraIA.Erro.servidor(e) }
            if let t = obj["completion"] as? String { return t }
            if let t = obj["text"] as? String { return t }
            if let t = obj["content"] as? String { return t }
            throw CatedraIA.Erro.vazia
        }
    }

    /// O token vive na PÁGINA (supabase-js no WebView). Para o lado nativo, buscamos.
    private func tokenDaSessao() async -> String {
        await withCheckedContinuation { cont in
            DispatchQueue.main.async { [weak self] in
                guard let wv = self?.webView else { cont.resume(returning: ""); return }
                let js = """
                (function(){ try{
                  if(window.CatedraAuth && window.CatedraAuth.client && window.CatedraAuth.client.auth){
                    return window.CatedraAuth.client.auth.getSession().then(function(s){
                      return (s && s.data && s.data.session && s.data.session.access_token) || '';
                    }).catch(function(){ return ''; });
                  }
                }catch(e){} return ''; })()
                """
                wv.callAsyncJavaScript(js, in: nil, in: .page) { r in
                    if case .success(let v) = r, let t = v as? String { cont.resume(returning: t) }
                    else { cont.resume(returning: "") }
                }
            }
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

/// Raiz do CátedraLEGIS no iPadOS. Espelha o CatedraLegisRoot do Mac (mac/Sources/main.swift),
/// com uma diferença obrigatória: o Mac tem barra de menus e abas para sair da tela; aqui
/// não há nenhuma das duas, então o botão de fechar faz parte da view — sem ele o app
/// entraria no LEGIS e não teria como voltar.
struct CatedraLegisRoot: View {
    let store: AppStore

    var body: some View {
        // Sem botão de fechar flutuante: com as abas no topo, quem volta para o Cátedra é
        // a própria aba. O X que existia aqui (herança da versão em tela cheia) ficava
        // POR CIMA do título da barra lateral do LEGIS.
        ContentView()
            .environmentObject(store)
            .environmentObject(StudyClock.shared)
            .environment(\.colorScheme, ThemeState.t.isDark ? .dark : .light)
            .tint(ThemeState.t.accent)
            .task { Notifier.requestPermission() }
    }
}

/// Raiz do CátedraJURIS no iPadOS. Espelha o CatedraJurisRoot do Mac. O JURIS usa
/// Observation (.environment), não ObservableObject — daí a diferença de sintaxe em
/// relação ao LEGIS logo acima.
struct CatedraJurisRoot: View {
    let store: LibraryStore
    let updater: UpdateService
    @AppStorage("jurisAppearance") private var appearanceRaw = Appearance.claro.rawValue
    private var appearance: Appearance { Appearance(rawValue: appearanceRaw) ?? .claro }

    var body: some View {
        RootView()
            .environment(store)
            .environment(updater)
            .preferredColorScheme(appearance.colorScheme)
            .environment(\.colorScheme, ThemeState.t.isDark ? .dark : .light)
            .tint(ThemeState.t.accent)
            .task {
                // load() só na 1ª vez: reconstruir por troca de tema não recarrega o acervo.
                if store.entries.isEmpty { await store.load() }
                updater.pedirPermissaoNotificacao()
                await updater.verificacaoAutomatica(store: store)
            }
    }
}
