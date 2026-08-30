// main.swift — Cátedra para macOS: janela nativa (AppKit) hospedando o app web
// (WKWebView) que vive dentro do bundle, em Contents/Resources/web/index.html.
//
// Destaques:
//  · Ponte de IA NATIVA: injeta window.claude.complete que encaminha o prompt ao
//    Swift (WKScriptMessageHandlerWithReply), que faz o POST via URLSession ao
//    endpoint configurado. Assim a IA funciona mesmo com o conteúdo em file://
//    (sem CORS). Se o endpoint não estiver configurado ou falhar, a Promise
//    rejeita e o próprio app cai no fallback heurístico local (try/catch dele).
//  · Menu padrão (Encerrar, copiar/colar, recarregar, zoom, janela).
//  · Links externos (http/https) abrem no navegador padrão, não dentro do app.
//  · Tamanho/posição da janela são lembrados entre sessões.

import Cocoa
import WebKit
import UniformTypeIdentifiers
import UserNotifications
import SwiftUI
import WidgetKit

// Endpoint da IA: Info.plist (CatedraAIEndpoint) com override por UserDefaults
// (defaults write com.catedra.desktop CatedraAIEndpoint "https://.../api/complete").
func aiEndpoint() -> URL? {
    let fromDefaults = UserDefaults.standard.string(forKey: "CatedraAIEndpoint")
    let fromPlist = Bundle.main.object(forInfoDictionaryKey: "CatedraAIEndpoint") as? String
    let raw = (fromDefaults ?? fromPlist ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    guard !raw.isEmpty, !raw.contains("YOUR-DEPLOY"), let url = URL(string: raw),
          url.scheme == "https" || url.scheme == "http" else { return nil }
    return url
}

// JS injetado no início de cada documento: define a ponte window.claude.complete.
let bridgeJS = """
(function () {
  window.claude = window.claude || {};
  window.claude.complete = function (prompt) {
    // /api/complete passou a exigir a sessão do Supabase (antes era IA aberta para a
    // internet inteira, na conta da dona do app). O host Swift não tem esse token —
    // quem tem é a página. Então pegamos aqui e mandamos junto com o prompt.
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
    } catch (e) {
      return Promise.reject(e);
    }
  };

  // Mapa de Processo e peças -> acervo. No app nativo o CátedraLEGIS e o CátedraJURIS
  // são ABAS de verdade; sem isto o app web abriria um iframe do MESMO acervo dentro da
  // aba Cátedra, deixando duas portas para a mesma coisa. O handler catedraNav (que já
  // existe para a agenda única) troca a aba do host. O shim entra em atDocumentStart,
  // portanto ANTES do listener do app web — por isso o stopImmediatePropagation basta
  // para o web não tratar a mesma mensagem em seguida. Se a ponte não existir (site na
  // Vercel), o postMessage lança e o caminho web continua valendo.
  window.addEventListener('message', function (e) {
    try {
      if (!e || !e.data || e.data.type !== 'ctAbrirAcervo') return;
      var alvo = String(e.data.alvo || '');
      if (alvo !== 'legis' && alvo !== 'juris') return;
      // Item 5: o termo e o ponto de origem viajam junto — antes só o nome da aba ia, e a
      // pessoa chegava no acervo inteiro, sem busca e sem caminho de volta.
      window.webkit.messageHandlers.catedraNav.postMessage({
        alvo: alvo, termo: String(e.data.termo || ''),
        de: (e.data.de && typeof e.data.de === 'object') ? e.data.de
          : (e.data.origem && typeof e.data.origem === 'object' ? e.data.origem : null)
      });
      e.stopImmediatePropagation();
    } catch (err) {}
  });
})();
"""

// Shim da Web Notification API → notificações nativas do macOS (UNUserNotificationCenter).
// O WKWebView não expõe `window.Notification`; sem isto o app mostra "não suportado".
let notifShimJS = """
(function () {
  if (window.__catedraNotif) return;
  window.__catedraNotif = true;
  function post(name, body) {
    try { return window.webkit.messageHandlers[name].postMessage(body || {}); }
    catch (e) { return Promise.reject(e); }
  }
  function N(title, opts) {
    opts = opts || {};
    this.title = title;
    post('notifyShow', { title: String(title == null ? '' : title),
                         body: String(opts.body || ''), tag: String(opts.tag || ''),
                         view: (opts.data && opts.data.view) ? String(opts.data.view) : '' });
  }
  N.prototype.close = function () {};
  N.prototype.addEventListener = function () {};
  N.requestPermission = function (cb) {
    var p = post('notifyPermission', { request: true }).then(function (s) { N.permission = s; return s; });
    if (typeof cb === 'function') { p.then(cb); }
    return p;
  };
  Object.defineProperty(N, 'permission', { value: 'default', writable: true, configurable: true });
  post('notifyPermission', { request: false }).then(function (s) { N.permission = s; }).catch(function () {});
  window.Notification = N;
})();
"""

// PiP nativo do cronômetro/pomodoro. O WKWebView não tem Document PiP (é do Chromium) nem
// captureStream de canvas, então o PiP do app não abriria. Este shim de
// window.documentPictureInPicture faz o requestWindow abrir um window.open('') — que o Swift
// hospeda num PAINEL FLUTUANTE nativo (ver createWebViewWith/makePiPPanel). Assim a própria
// UI de PiP do app volta a funcionar (mesma origem: os botões Pausar/Zerar seguem ativos).
let pipShimJS = """
(function () {
  if (window.documentPictureInPicture && window.documentPictureInPicture.requestWindow) return;
  window.documentPictureInPicture = {
    requestWindow: function (opts) {
      opts = opts || {};
      var w = window.open('', 'catedraPiP', 'width=' + (opts.width || 360) + ',height=' + (opts.height || 250));
      return w ? Promise.resolve(w) : Promise.reject(new Error('PiP bloqueado'));
    }
  };
})();
"""

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandlerWithReply, UNUserNotificationCenterDelegate, NSWindowDelegate, NSToolbarDelegate, WKDownloadDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    private var titleObs: NSKeyValueObservation?
    private var pipPanel: NSPanel?      // painel flutuante do cronômetro (PiP nativo)
    private var pipWebView: WKWebView?

    // Aba CátedraLEGIS (Vade Mecum de LEIS) — app SwiftUI nativo hospedado dentro do Cátedra.
    private var pageContainer: NSView!          // abriga as duas abas empilhadas
    private var vmHost: NSView?                  // NSHostingView do ContentView (criado sob demanda)
    private var lastThemeKey: String?            // tema do Cátedra já aplicado (p/ rebuild só quando muda)
    private var legisSettingsWindow: NSWindow?   // janela de Ajustes (sem cena Settings no host AppKit)
    private var jurisHost: NSView?               // NSHostingView do CátedraJURIS (RootView), sob demanda
    private var jurisStore: LibraryStore?        // @Observable — instância única; dados compartilhados
    private var jurisUpdater: UpdateService?     //   com o app de jurisprudência autônomo (VadeMecumJuris)
    private var jurisSettingsWindow: NSWindow?
    private weak var tabControl: NSSegmentedControl?
    private weak var voltaButton: NSButton?     // item 5: volta ao ponto do processo
    private var currentTab = 0                   // 0 = Cátedra, 1 = CátedraLEGIS
    /* A ÁREA DE ESTUDO CHEGA DA WEB (handler catedraArea). Esta barra é escrita em Swift
       e não passa pelo guarda de rota do app web — sem isto, quem estuda Enfermagem
       apertava ⌘3 e recebia o acervo de súmulas do STF/STJ inteiro. */
    private var jurisDisponivel = true
    private func aplicarArea(juris: Bool) {
        guard juris != jurisDisponivel else { return }
        jurisDisponivel = juris
        // quem estiver DENTRO da aba que acabou de sumir precisa sair dela
        if !juris && currentTab == 2 { switchTo(0) }
        reconstruirAbas()
    }
    private func reconstruirAbas() {
        guard let seg = tabControl else { return }
        let rotulos = jurisDisponivel ? ["Cátedra", "CátedraLEGIS", "CátedraJURIS"]
                                      : ["Cátedra", "CátedraLEGIS"]
        seg.segmentCount = rotulos.count
        for (i, r) in rotulos.enumerated() { seg.setLabel(r, forSegment: i) }
        if #available(macOS 11.0, *) {
            let simbolos = ["graduationcap", "book.closed", "building.columns"]
            for i in 0..<rotulos.count {
                seg.setImage(NSImage(systemSymbolName: simbolos[i], accessibilityDescription: nil), forSegment: i)
            }
        }
        seg.selectedSegment = min(currentTab, rotulos.count - 1)
        // o item de menu e o ⌘3 acompanham
        for it in tabMenuItems where it.tag == 2 { it.isHidden = !jurisDisponivel }
    }

    // Menu bar extra (NSStatusItem): acesso rápido + relógio de estudo ao vivo.
    private var statusItem: NSStatusItem?
    private var statusClockItem: NSMenuItem?
    private var statusTimer: Timer?
    private var widgetTimer: Timer?
    private var nativeRevTimer: Timer?           // agenda única: LEGIS/JURIS → Revisões do Cátedra
    private var autoBackupTimer: Timer?          // backup semanal automático (checa de 6 em 6h)
    // "Widget" desenhado pelo app (sem WidgetKit): painel flutuante + números no menu.
    private var widgetPanel: NSPanel?
    private var statItems: [NSMenuItem] = []
    private var tabMenuItems: [NSMenuItem] = []   // itens ⌘1/2/3 (menu Visualizar + barra) → marca a aba ativa
    private var panelToggleItem: NSMenuItem?
    private var lastStats = CatedraStats()

    // Ponte de estudo: o relógio (StudyClock.shared) cronometra o tempo ativo no CátedraLEGIS
    // e é registrado como sessão no Cátedra ao sair da aba.
    private var legisReadsBaseline: Int?              // readsToday no início da rajada
    private var jurisLidosBaseline: Int?              // lidosHoje (JURIS) no início da rajada
    private var legisReviewsBaseline: Int?            // reviewedToday no início da rajada

    func applicationDidFinishLaunching(_ n: Notification) {
        buildMenu()
        setupMenuBarExtra()
        startWidgetSync()
        startNativeReviewsSync()   // agenda de revisão única (lei seca + juris no Cátedra)
        startAutoBackup()          // backup semanal automático em ~/Documents/Cátedra Backups
        setupPlanoMarcadoObservers()   // check no LEGIS/JURIS → registro de atividades no Cátedra
        UNUserNotificationCenter.current().delegate = self

        // configuração do WebView + pontes nativas (IA e notificações)
        let cfg = WKWebViewConfiguration()
        let ucc = WKUserContentController()
        ucc.addUserScript(WKUserScript(source: bridgeJS, injectionTime: .atDocumentStart,
                                       forMainFrameOnly: true, in: .page))
        ucc.addUserScript(WKUserScript(source: notifShimJS, injectionTime: .atDocumentStart,
                                       forMainFrameOnly: true, in: .page))
        ucc.addUserScript(WKUserScript(source: pipShimJS, injectionTime: .atDocumentStart,
                                       forMainFrameOnly: true, in: .page))
        ucc.addScriptMessageHandler(self, contentWorld: .page, name: "catedraAI")
        ucc.addScriptMessageHandler(self, contentWorld: .page, name: "notifyPermission")
        ucc.addScriptMessageHandler(self, contentWorld: .page, name: "notifyShow")
        ucc.addScriptMessageHandler(self, contentWorld: .page, name: "catedraNav")  // web → trocar de aba nativa
        ucc.addScriptMessageHandler(self, contentWorld: .page, name: "catedraArea") // web → área de estudo ativa e o que ela oferece
        ucc.addScriptMessageHandler(self, contentWorld: .page, name: "catedraPlano") // web → marcar leitura do plano (ciclo semanal)
        ucc.addScriptMessageHandler(self, contentWorld: .page, name: "catedraPrint") // web → imprimir/salvar PDF (window.print é mudo no WKWebView)
        ucc.addScriptMessageHandler(self, contentWorld: .page, name: "catedraBackup") // web → backup no iCloud Drive (pasta Cátedra) ou painel de arquivo
        cfg.userContentController = ucc
        cfg.preferences.javaScriptCanOpenWindowsAutomatically = true  // necessário p/ o window.open do PiP
        cfg.preferences.setValue(true, forKey: "developerExtrasEnabled")  // "Inspecionar" no menu de contexto

        let frame = NSRect(x: 0, y: 0, width: 1200, height: 820)
        webView = WKWebView(frame: frame, configuration: cfg)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsMagnification = true
        webView.allowsBackForwardNavigationGestures = false

        // Container que empilha as duas abas: o WebView do Cátedra e (sob demanda) o Vade Mecum.
        let container = NSView(frame: frame)
        container.autoresizingMask = [.width, .height]
        webView.frame = container.bounds
        webView.autoresizingMask = [.width, .height]
        container.addSubview(webView)
        pageContainer = container

        // Janela macOS convencional: barra de título sólida, opaca — não flutuante.
        window = NSWindow(
            contentRect: frame,
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered, defer: false)
        window.title = "Cátedra"
        window.tabbingMode = .disallowed
        window.minSize = NSSize(width: 900, height: 600)
        window.contentView = container
        window.center()
        window.setFrameAutosaveName("CatedraMainWindow")
        buildToolbar()   // seletor de abas (Cátedra | Vade Mecum) na barra de título
        window.makeKeyAndOrderFront(nil)
        instalarProvedorIA()   // IA dos módulos nativos passa pelo mesmo /api/complete do app

        // reflete o título do documento na janela (só quando a aba Cátedra está ativa)
        titleObs = webView.observe(\.title, options: [.new]) { [weak self] wv, _ in
            guard let self = self, self.currentTab == 0 else { return }
            let t = (wv.title ?? "").trimmingCharacters(in: .whitespaces)
            self.window.title = t.isEmpty ? "Cátedra" : t
        }

        setupLegisClock()
        setupJurisClock()
        setupLegisArrowKeys()
        // Engrenagem do CátedraJURIS (o embed não tem cena Settings) → janela de Ajustes.
        NotificationCenter.default.addObserver(forName: JurisHostBridge.openSettings,
                                               object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.openJurisSettings(nil) }
        }
        // Item do checklist de leitura (LEGIS/JURIS) marcado como feito → marca a
        // tarefa correspondente do ciclo de estudos como concluída no Cátedra.
        NotificationCenter.default.addObserver(forName: ChecklistSyncBridge.itemDone,
                                               object: nil, queue: .main) { [weak self] note in
            MainActor.assumeIsolated { self?.markCycleTaskDone(note.userInfo) }
        }
        // O painel de cor nativo (ColorPicker "Escolher outra cor…") guarda a última
        // posição em disco — se ela ficou de um monitor externo desconectado, o painel
        // abre fora da tela e PARECE que não abriu nada. Recentraliza toda vez que ele
        // vira a janela-chave, ignorando qualquer posição salva ruim.
        NotificationCenter.default.addObserver(forName: NSWindow.didBecomeKeyNotification,
                                               object: nil, queue: .main) { [weak self] note in
            guard let panel = note.object as? NSColorPanel, panel === NSColorPanel.shared else { return }
            MainActor.assumeIsolated {
                guard let screen = self?.window?.screen ?? NSScreen.main else { return }
                let sf = screen.visibleFrame
                let x = sf.midX - panel.frame.width / 2
                let y = sf.midY - panel.frame.height / 2
                panel.setFrameOrigin(NSPoint(x: x, y: y))
            }
        }
        loadApp()
        NSApp.activate(ignoringOtherApps: true)
    }

    // Setas ←/→ do teclado passam/voltam o artigo no leitor Foco do CátedraLEGIS.
    // Monitor local: só sequestra a tecla quando faz sentido (aba 1, leitor Foco
    // aberto, janela principal — não sheets/Ajustes — e sem digitar num campo);
    // caso contrário devolve o evento e as setas seguem rolando/movendo o cursor.
    private var arrowKeyMonitor: Any?
    private func setupLegisArrowKeys() {
        arrowKeyMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            guard let self = self else { return event }
            guard event.keyCode == 123 || event.keyCode == 124 else { return event }   // ← / →
            guard event.modifierFlags.intersection([.command, .option, .control, .shift]).isEmpty else { return event }
            guard self.currentTab == 1, self.vmHost != nil, LegisReaderNav.canNavigate else { return event }
            guard event.window == self.window else { return event }                     // exclui sheets e Ajustes
            if let tv = self.window.firstResponder as? NSTextView, tv.isEditable { return event }  // digitando (anotação/busca)
            NotificationCenter.default.post(name: LegisReaderNav.navNotification, object: nil,
                                            userInfo: ["next": event.keyCode == 124])
            return nil
        }
    }

    func loadApp() {
        guard let dir = Bundle.main.resourceURL?.appendingPathComponent("web", isDirectory: true) else { return }
        let index = dir.appendingPathComponent("index.html")
        webView.loadFileURL(index, allowingReadAccessTo: dir)
    }

    // Ao terminar de carregar o app web, se ficou um registro de estudo pendente do
    // encerramento anterior (deliverStudyRegistration com terminating=true), injeta agora.
    func webView(_ wv: WKWebView, didFinish navigation: WKNavigation!) {
        guard wv === webView else { return }
        let pend = UserDefaults.standard.stringArray(forKey: "catedraPendingStudyRegs") ?? []
        guard !pend.isEmpty else { return }
        // NÃO apagar antes de entregar — era exatamente esse o bug: a chave era removida
        // do disco 2s ANTES da injeção acontecer. E havia uma corrida: o auth.js dá
        // location.reload() ao terminar a hidratação, então a injeção caía numa página
        // que estava morrendo (ou onde a ponte ainda não existia). Resultado: o tempo
        // estudado no CátedraLEGIS/JURIS antes de fechar o app sumia sem deixar rastro.
        // Agora: só entrega na página ESTÁVEL (já hidratada) e só risca do disco o que o
        // app confirmar que recebeu.
        wv.evaluateJavaScript("sessionStorage.getItem('catedra:hydrated')") { [weak self] r, _ in
            guard let self, (r as? String) == "1" else { return }   // ainda vai recarregar: espera o próximo didFinish
            MainActor.assumeIsolated { self.entregarEstudosPendentes(pend) }
        }
    }

    /// Injeta os registros de estudo pendentes e remove do disco SÓ os confirmados.
    private func entregarEstudosPendentes(_ pend: [String]) {
        for (i, json) in pend.enumerated() {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0 + Double(i) * 0.6) { [weak self] in
                guard let self else { return }
                self.webView.evaluateJavaScript(
                    "window.catedraOpenStudyRegistration ? window.catedraOpenStudyRegistration(\(json)) : 'sem-ponte'"
                ) { r, _ in
                    // A ponte devolve 'ok'/'queued' quando aceita; 'busy'/'err:'/'sem-ponte'
                    // significam que NÃO entrou — nesse caso fica no disco para a próxima vez.
                    let s = r as? String
                    guard s == "ok" || s == "queued" else { return }
                    MainActor.assumeIsolated {
                        var restante = UserDefaults.standard.stringArray(forKey: "catedraPendingStudyRegs") ?? []
                        if let idx = restante.firstIndex(of: json) { restante.remove(at: idx) }
                        UserDefaults.standard.set(restante, forKey: "catedraPendingStudyRegs")
                    }
                }
            }
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ s: NSApplication) -> Bool { true }

    // Cronômetros de estudo (LEGIS: dentro de uma norma; JURIS: aba ativa): pausam
    // quando o app perde o foco e fecham a rajada (coletando no Cátedra) ao encerrar.
    func applicationDidBecomeActive(_ n: Notification) {
        StudyClock.shared.setAppActive(true)
        JurisClock.shared.setAppActive(true)
    }
    func applicationWillResignActive(_ n: Notification) {
        StudyClock.shared.setAppActive(false)
        JurisClock.shared.setAppActive(false)
    }
    private var terminating = false
    func applicationWillTerminate(_ n: Notification) {
        terminating = true   // os flushes gravam o registro pendente em disco (a JS não roda no shutdown)
        flushLegisStudy()
        flushJurisStudy()
    }

    // Entrega o registro de estudo pré-preenchido ao app web. Ao ENCERRAR, a
    // evaluateJavaScript não chegaria a rodar (processo saindo) e o tempo estudado se
    // perderia — então guardamos o payload em disco e o injetamos no próximo launch.
    private func deliverStudyRegistration(_ json: String) {
        if terminating {
            var pend = UserDefaults.standard.stringArray(forKey: "catedraPendingStudyRegs") ?? []
            pend.append(json)
            UserDefaults.standard.set(pend, forKey: "catedraPendingStudyRegs")
        } else {
            webView.evaluateJavaScript("window.catedraOpenStudyRegistration && window.catedraOpenStudyRegistration(\(json))", completionHandler: nil)
        }
    }

    // MARK: - Abas Cátedra ⇆ Vade Mecum

    private static let tabItemID = NSToolbarItem.Identifier("CatedraTabSwitcher")

    // Barra de título com um seletor centralizado "Cátedra | CátedraLEGIS".
    private func buildToolbar() {
        let tb = NSToolbar(identifier: "CatedraToolbar")
        tb.delegate = self
        tb.displayMode = .iconOnly
        tb.allowsUserCustomization = false
        tb.centeredItemIdentifier = AppDelegate.tabItemID
        window.toolbar = tb
        if #available(macOS 11.0, *) { window.toolbarStyle = .unified }
    }

    func toolbar(_ toolbar: NSToolbar, itemForItemIdentifier id: NSToolbarItem.Identifier,
                 willBeInsertedIntoToolbar flag: Bool) -> NSToolbarItem? {
        if id == AppDelegate.voltaItemID { return makeVoltaItem(id) }
        guard id == AppDelegate.tabItemID else { return nil }
        let seg = NSSegmentedControl(labels: ["Cátedra", "CátedraLEGIS", "CátedraJURIS"],
                                     trackingMode: .selectOne,
                                     target: self, action: #selector(tabChanged(_:)))
        seg.segmentStyle = .texturedRounded
        seg.selectedSegment = currentTab
        if #available(macOS 11.0, *) {
            seg.setImage(NSImage(systemSymbolName: "graduationcap", accessibilityDescription: nil), forSegment: 0)
            seg.setImage(NSImage(systemSymbolName: "book.closed", accessibilityDescription: nil), forSegment: 1)
            seg.setImage(NSImage(systemSymbolName: "building.columns", accessibilityDescription: nil), forSegment: 2)
            for i in 0..<3 { seg.setImageScaling(.scaleProportionallyDown, forSegment: i) }
        }
        tabControl = seg
        let item = NSToolbarItem(itemIdentifier: id)
        item.view = seg
        item.label = "Abas"
        item.visibilityPriority = .high
        return item
    }

    func toolbarDefaultItemIdentifiers(_ tb: NSToolbar) -> [NSToolbarItem.Identifier] {
        [AppDelegate.voltaItemID, .flexibleSpace, AppDelegate.tabItemID, .flexibleSpace]
    }
    func toolbarAllowedItemIdentifiers(_ tb: NSToolbar) -> [NSToolbarItem.Identifier] {
        [.flexibleSpace, AppDelegate.tabItemID, AppDelegate.voltaItemID]
    }

    // Item 5: "← Voltar ao ponto do processo". Nasce escondido; só aparece quando a pessoa
    // chegou ao acervo por um chip do mapa de Processo e peças (antes, mão única).
    static let voltaItemID = NSToolbarItem.Identifier("catedraVoltaAcervo")
    private func makeVoltaItem(_ id: NSToolbarItem.Identifier) -> NSToolbarItem {
        let b = NSButton(title: "← Voltar ao processo", target: self, action: #selector(voltarAoProcesso))
        b.bezelStyle = .rounded
        b.controlSize = .small
        b.isHidden = true
        voltaButton = b
        let item = NSToolbarItem(itemIdentifier: id)
        item.view = b
        item.label = "Voltar ao processo"
        item.visibilityPriority = .low
        return item
    }

    /// Mostra/esconde o botão conforme haja um ponto de origem vivo e estejamos numa aba nativa.
    func atualizarBotaoVoltarAcervo() {
        let o = AcervoEntrada.shared.origem
        voltaButton?.isHidden = (o == nil || currentTab == 0)
        if let o { voltaButton?.title = "← " + o.rotulo }
    }

    @objc func voltarAoProcesso() {
        guard let o = AcervoEntrada.shared.origem else { return }
        AcervoEntrada.shared.limpar()
        switchTo(0)
        atualizarBotaoVoltarAcervo()
        // O app web reabre o mapa/roteiro no ponto exato (window.catedraVoltarAcervo).
        webView?.evaluateJavaScript("window.catedraVoltarAcervo && window.catedraVoltarAcervo(\(o.jsonJS))", completionHandler: nil)
    }

    @objc private func tabChanged(_ sender: NSSegmentedControl) {
        switchTo(sender.selectedSegment)
    }

    // Marca com ✓ o item de menu (Visualizar + barra) da aba ativa.
    private func updateTabMenuState() {
        for it in tabMenuItems { it.state = (it.tag == currentTab) ? .on : .off }
    }

    // Atalhos ⌘1/⌘2/⌘3 do menu Visualizar.
    @objc func goTab0(_ sender: Any?) { switchTo(0) }
    @objc func goTab1(_ sender: Any?) { switchTo(1) }
    @objc func goTab2(_ sender: Any?) { switchTo(2) }

    // ===== Menu bar extra (NSStatusItem) =====
    func setupMenuBarExtra() {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let btn = item.button {
            btn.image = NSImage(systemSymbolName: "graduationcap.fill", accessibilityDescription: "Cátedra")
            btn.image?.isTemplate = true
            btn.imagePosition = .imageLeading
        }
        let menu = NSMenu()
        // Números do estudo (informativo) — atualizados por refreshWidgetStatItems().
        let mkStat: (String) -> NSMenuItem = { t in
            let it = NSMenuItem(title: t, action: nil, keyEquivalent: ""); it.isEnabled = false; return it
        }
        statItems = [mkStat("Próxima prova: —"), mkStat("Revisões pendentes: 0"),
                     mkStat("Meta da semana: 0%"), mkStat("Ofensiva: 0 dias"), mkStat("Próximo: —")]
        for it in statItems { menu.addItem(it) }
        menu.addItem(.separator())
        let clock = NSMenuItem(title: "Sem estudo em andamento", action: nil, keyEquivalent: ""); clock.isEnabled = false
        menu.addItem(clock); statusClockItem = clock
        menu.addItem(.separator())
        let open = NSMenuItem(title: "Abrir Cátedra", action: #selector(mbOpen(_:)), keyEquivalent: ""); open.target = self; menu.addItem(open)
        let foco = NSMenuItem(title: "Estudar agora (abrir Cátedra)", action: #selector(mbFoco(_:)), keyEquivalent: ""); foco.target = self; menu.addItem(foco)
        menu.addItem(.separator())
        let a = NSMenuItem(title: "Cátedra", action: #selector(mbTab0(_:)), keyEquivalent: "1"); a.target = self; a.tag = 0; menu.addItem(a)
        let b = NSMenuItem(title: "CátedraLEGIS", action: #selector(mbTab1(_:)), keyEquivalent: "2"); b.target = self; b.tag = 1; menu.addItem(b)
        let c = NSMenuItem(title: "CátedraJURIS", action: #selector(mbTab2(_:)), keyEquivalent: "3"); c.target = self; c.tag = 2; menu.addItem(c)
        tabMenuItems.append(contentsOf: [a, b, c])
        menu.addItem(.separator())
        let panelToggle = NSMenuItem(title: "Painel na área de trabalho", action: #selector(mbTogglePanel(_:)), keyEquivalent: "")
        panelToggle.target = self; menu.addItem(panelToggle); panelToggleItem = panelToggle
        let bkp = NSMenuItem(title: "Fazer backup agora", action: #selector(mbBackupNow(_:)), keyEquivalent: "")
        bkp.target = self; menu.addItem(bkp)
        menu.addItem(.separator())
        menu.addItem(NSMenuItem(title: "Sair da Cátedra", action: #selector(NSApplication.terminate(_:)), keyEquivalent: ""))
        item.menu = menu
        statusItem = item
        let tm = Timer(timeInterval: 1.0, repeats: true) { [weak self] _ in self?.refreshMenuBar() }
        RunLoop.main.add(tm, forMode: .common); statusTimer = tm
        refreshWidgetStatItems()
        refreshMenuBar()
        if UserDefaults.standard.bool(forKey: "catedraDeskWidgetVisible") {
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in self?.showWidgetPanel() }
        }
    }
    func refreshMenuBar() {
        let running = StudyClock.shared.running || JurisClock.shared.running
        if running {
            let t = StudyClock.shared.running ? StudyClock.shared.formatted : JurisClock.shared.formatted
            statusItem?.button?.title = "  \(t)"
            statusClockItem?.title = "Estudando · \(t)"
        } else {
            statusItem?.button?.title = glanceableTitle()
            statusClockItem?.title = "Sem estudo em andamento"
        }
    }
    // Rótulo curto na barra quando NÃO está estudando: prioriza revisões atrasadas,
    // senão a contagem regressiva da prova, senão só o ícone.
    private func glanceableTitle() -> String {
        if lastStats.revisoes > 0 { return "  ⏰\(lastStats.revisoes)" }
        if lastStats.diasProva >= 0 { return "  \(lastStats.diasProva)d" }
        return ""
    }
    func refreshWidgetStatItems() {
        guard statItems.count == 5 else { return }
        let s = lastStats
        statItems[0].title = "Próxima prova: " + (s.diasProva < 0 ? "sem data definida" : "\(s.diasProva) \(s.diasProva == 1 ? "dia" : "dias")")
        statItems[1].title = "Revisões pendentes: \(s.revisoes)"
        statItems[2].title = "Meta da semana: \(s.metaPct)%"
        statItems[3].title = "Ofensiva: \(s.streak) \(s.streak == 1 ? "dia" : "dias")"
        statItems[4].title = "Próximo: " + (s.proximo.isEmpty ? "—" : s.proximo)
        statItems[4].isHidden = s.proximo.isEmpty
    }
    private func mbBringUp() { NSApp.activate(ignoringOtherApps: true); window?.makeKeyAndOrderFront(nil) }

    // ===== Widget do macOS: lê o payload do app web e grava no App Group =====
    func startWidgetSync() {
        let tm = Timer(timeInterval: 180.0, repeats: true) { [weak self] _ in self?.pushWidgetData() }
        RunLoop.main.add(tm, forMode: .common); widgetTimer = tm
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [weak self] in self?.pushWidgetData() }
    }
    func pushWidgetData() {
        guard let wv = webView else { return }
        wv.evaluateJavaScript("(window.catedraWidgetPayload && JSON.stringify(window.catedraWidgetPayload())) || ''") { [weak self] result, _ in
            guard let self = self,
                  let s = result as? String, !s.isEmpty, let data = s.data(using: .utf8),
                  let obj = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return }
            var st = CatedraStats()
            st.diasProva = (obj["diasProva"] as? NSNumber)?.intValue ?? -1
            st.revisoes  = (obj["revisoes"] as? NSNumber)?.intValue ?? 0
            st.metaPct   = (obj["metaPct"] as? NSNumber)?.intValue ?? 0
            st.streak    = (obj["streak"] as? NSNumber)?.intValue ?? 0
            st.proximo   = (obj["proximo"] as? String) ?? ""
            self.lastStats = st
            WidgetModel.shared.stats = st           // atualiza o painel flutuante (SwiftUI)
            self.refreshWidgetStatItems()           // atualiza os números no menu
            self.refreshMenuBar()                   // atualiza o rótulo glanceável na barra
            // Espelha no App Group para o dia em que houver um widget WidgetKit assinado.
            if let d = UserDefaults(suiteName: "group.com.catedra.desktop") {
                d.set(st.diasProva, forKey: "diasProva"); d.set(st.revisoes, forKey: "revisoes")
                d.set(st.metaPct, forKey: "metaPct");     d.set(st.streak, forKey: "streak")
                d.set(st.proximo, forKey: "proximo")
            }
        }
    }
    @objc func mbOpen(_ s: Any?) { mbBringUp() }
    @objc func mbFoco(_ s: Any?) { mbBringUp(); switchTo(0) }
    @objc func mbTab0(_ s: Any?) { mbBringUp(); switchTo(0) }
    @objc func mbTab1(_ s: Any?) { mbBringUp(); switchTo(1) }
    @objc func mbTab2(_ s: Any?) { mbBringUp(); switchTo(2) }
    @objc func mbTogglePanel(_ s: Any?) { toggleWidgetPanel() }
    @objc func mbBackupNow(_ s: Any?) { performBackup(force: true) }

    // ===== Agenda de revisão única: revisões vencidas do LEGIS/JURIS aparecem no Cátedra =====
    // O host lê os baralhos SRS dos dois apps nativos e injeta um resumo no WebView
    // ({legis:{due,deck}, juris:{due,deck}}); a view Revisões do Cátedra exibe e o
    // botão "Abrir" volta por catedraNav para trocar de aba. Atualiza a cada 2 min,
    // ao trocar para a aba Cátedra e logo após abrir o app.
    func startNativeReviewsSync() {
        let tm = Timer(timeInterval: 120.0, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.pushNativeReviews() }
        }
        RunLoop.main.add(tm, forMode: .common); nativeRevTimer = tm
        DispatchQueue.main.asyncAfter(deadline: .now() + 6) { [weak self] in
            guard let self else { return }
            // Instancia o store do JURIS cedo (dados compartilhados com a aba — é o
            // mesmo objeto reaproveitado depois), senão a contagem só existiria após
            // a primeira visita à aba de jurisprudência.
            if self.jurisStore == nil { self.jurisStore = LibraryStore() }
            self.pushNativeReviews()
        }
    }
    func pushNativeReviews() {
        guard let wv = webView else { return }
        let payload = "{\"legis\":{\"due\":\(AppStore.shared.srsDueCount()),\"deck\":\(AppStore.shared.srsDeckCount)}," +
                      "\"juris\":{\"due\":\(jurisStore?.srsDueCount ?? 0),\"deck\":\(jurisStore?.srsDeckCount ?? 0)}}"
        wv.evaluateJavaScript("window.catedraSetNativeRev && window.catedraSetNativeRev(\(payload))", completionHandler: nil)
        // Planos de leitura (LEGIS + JURIS) → blocos no Ciclo de Estudos do Cátedra.
        if let planoJSON = nativePlanoPayload() {
            wv.evaluateJavaScript("window.catedraSetNativePlano && window.catedraSetNativePlano(\(planoJSON))", completionHandler: nil)
        }
        // Catálogo de leis/fontes → seletores do registro de sessão.
        if let cat = nativeCatalogoJSON() {
            wv.evaluateJavaScript("window.catedraSetNativeCatalogo && window.catedraSetNativeCatalogo(\(cat))", completionHandler: nil)
        }
    }

    // Checkbox do ciclo semanal (web) → marca/desmarca a leitura no plano do LEGIS.
    // Linhas de súmulas espelham no plano do JURIS (é a MESMA leitura nos dois).
    func togglePlanoLeitura(_ key: String) {
        guard !key.isEmpty else { return }
        let d = UserDefaults.standard
        var done = Set((d.array(forKey: "catedra.plano.done.v1") as? [String]) ?? [])
        let marcando = !done.contains(key)
        if marcando { done.insert(key) } else { done.remove(key) }
        d.set(Array(done), forKey: "catedra.plano.done.v1")
        let parts = key.split(separator: "_").compactMap { Int($0) }
        if parts.count == 3, parts[0] < ReadingData.plano.count {
            let disc = ReadingData.plano[parts[0]]
            if disc.name == "Súmulas", parts[1] < disc.laws.count {
                let lawName = disc.laws[parts[1]].name
                let dyi = parts[2]
                var jurisDia: Int? = nil
                if lawName.contains("VINCULANTES") { jurisDia = 1 + dyi }
                else if lawName.contains("TSE") { jurisDia = 6 + dyi }
                else if lawName.contains("STJ") { jurisDia = 12 + dyi }
                else if lawName.contains("STF") { jurisDia = 50 + dyi }
                if let jd = jurisDia {
                    var lidos = Set((d.array(forKey: "juris.plano.done.v1") as? [Int]) ?? [])
                    if marcando { lidos.insert(jd) } else { lidos.remove(jd) }
                    d.set(Array(lidos), forKey: "juris.plano.done.v1")
                }
            }
        }
        pushNativeReviews()   // re-injeta o payload → o quadro semanal atualiza na hora
    }

    // Check de leitura nos apps NATIVOS (plano do LEGIS/JURIS) → volta pra aba
    // Cátedra e abre o registro de atividades. A troca de aba já dispara o flush
    // do cronômetro (se houve ≥1 min de estudo, o registro abre com o TEMPO real
    // rateado); senão, abrimos com o prefill específico da leitura marcada — a
    // chamada é "auto": respeita o toggle dela e nunca atropela um modal aberto.
    func setupPlanoMarcadoObservers() {
        // O LEGIS pediu para abrir um verbete do acervo (jurisprudência do artigo): troca
        // para a aba JURIS e leva o store até ele. O store pode ainda não existir (aba
        // nunca aberta) — switchTo cria; por isso o abrirVerbete vem depois.
        NotificationCenter.default.addObserver(forName: JurisPorArtigo.notificacaoAbrir, object: nil, queue: .main) { [weak self] n in
            MainActor.assumeIsolated {
                guard let self, let id = n.userInfo?["id"] as? String else { return }
                self.switchTo(2)
                self.jurisStore?.abrirVerbete(id)
            }
        }
        NotificationCenter.default.addObserver(forName: Notification.Name("catedraPlanoLegisMarcado"), object: nil, queue: .main) { [weak self] n in
            MainActor.assumeIsolated {
                guard let self, let k = n.userInfo?["key"] as? String else { return }
                var payload: [String: Any] = ["auto": true, "origem": "CátedraLEGIS", "min": 0,
                                              "categoria": "Lei seca", "topico": "Leitura de leis — plano"]
                let parts = k.split(separator: "_").compactMap { Int($0) }
                if parts.count == 3, parts[0] < ReadingData.plano.count {
                    let disc = ReadingData.plano[parts[0]]
                    if parts[1] < disc.laws.count, parts[2] < disc.laws[parts[1]].days.count {
                        let law = disc.laws[parts[1]]
                        let day = law.days[parts[2]]
                        let juris = disc.name == "Súmulas"
                        payload["categoria"] = juris ? "Jurisprudência" : "Lei seca"
                        payload["topico"] = (juris ? "Jurisprudência — " : "Lei seca — ") + law.name + " · " + day.a
                        if !juris { payload["disc"] = disc.name }
                    }
                }
                self.abrirRegistroAuto(payload)
            }
        }
        NotificationCenter.default.addObserver(forName: Notification.Name("catedraPlanoJurisMarcado"), object: nil, queue: .main) { [weak self] n in
            MainActor.assumeIsolated {
                guard let self else { return }
                let dia = n.userInfo?["dia"] as? Int ?? 0
                let faixa = n.userInfo?["faixa"] as? String ?? ""
                let trilha = n.userInfo?["trilha"] as? String ?? ""
                self.abrirRegistroAuto(["auto": true, "origem": "CátedraJURIS", "min": 0,
                                        "categoria": "Jurisprudência",
                                        "topico": "Súmulas \(trilha) — \(faixa) (Dia \(dia))"])
            }
        }
    }
    func abrirRegistroAuto(_ payload: [String: Any]) {
        switchTo(0)   // volta pro Cátedra — dispara o flush do tempo estudado
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) { [weak self] in
            guard let self, let wv = self.webView,
                  let data = try? JSONSerialization.data(withJSONObject: payload),
                  let json = String(data: data, encoding: .utf8) else { return }
            wv.evaluateJavaScript("window.catedraOpenStudyRegistration && window.catedraOpenStudyRegistration(\(json))", completionHandler: nil)
            self.pushNativeReviews()
        }
    }

    // Catálogo p/ o registro de sessão: "Lei seca" lista as leis do plano do LEGIS
    // (por disciplina); "Jurisprudência" lista as fontes do JURIS. Estático — cacheado.
    private var catalogoJSONCache: String?
    func nativeCatalogoJSON() -> String? {
        if let c = catalogoJSONCache { return c }
        var legis: [[String: Any]] = []
        for disc in ReadingData.plano where disc.name != "Súmulas" {
            legis.append(["disc": disc.name, "leis": disc.laws.map { $0.name }])
        }
        let fontes: [Fonte] = [.sumulaVinculante, .sumulaSTF, .sumulaSTJ, .sumulaTSE,
                               .repercussaoGeral, .repetitivo, .jurisEmTeses,
                               .informativoSTF, .informativoSTJ, .informativoTSE,
                               .controleConst, .adi, .adc, .ado, .adpf, .precedentesObrig]
        let dict: [String: Any] = ["legis": legis, "juris": fontes.map { $0.nome }]
        guard let d = try? JSONSerialization.data(withJSONObject: dict),
              let s = String(data: d, encoding: .utf8) else { return nil }
        catalogoJSONCache = s
        return s
    }

    // Próxima meta de cada plano de leitura + progresso — vira bloco no Ciclo.
    // LEGIS: cronograma por disciplina (id de leitura "di_li_dyi", próximo = 1º não
    // concluído, mesma ordem do PlanoLeituraView). JURIS: 101 dias de súmulas
    // (próximo = 1º "dia" não lido). Lê os mesmos UserDefaults dos planos nativos.
    func nativePlanoPayload() -> String? {
        let ldone = PlanoStore.loadDone()
        var lTotal = 0
        // TODAS as leituras agrupadas por número da tabela-dia ("Dia 3" → CF, CC,
        // CPC… + a linha de súmulas), com estado feito/pendente por lei. O roteiro
        // fixa seg→sex = os 5 dias da SEMANA do plano em curso — igual à folha dela.
        var porDia: [Int: [[String: Any]]] = [:]
        var pendMin: Int? = nil
        for (di, disc) in ReadingData.plano.enumerated() {
            for (li, law) in disc.laws.enumerated() {
                for (dyi, day) in law.days.enumerated() {
                    lTotal += 1
                    let key = "\(di)_\(li)_\(dyi)"
                    let feito = ldone.contains(key)
                    let n = Int(day.d.replacingOccurrences(of: "Dia ", with: "")) ?? 0
                    porDia[n, default: []].append(["key": key, "law": law.name, "arts": day.a, "done": feito, "cor": law.color, "disc": disc.name])
                    if !feito { pendMin = min(pendMin ?? n, n) }
                }
            }
        }
        // semana do plano em curso: bloco de 5 dias que contém o 1º pendente
        let maxDia = porDia.keys.max() ?? 1
        let alvo = pendMin ?? maxDia
        let sIni = ((alvo - 1) / 5) * 5 + 1
        var semana: [[String: Any]] = []
        for n in sIni...(sIni + 4) where porDia[n] != nil {
            semana.append(["num": n, "itens": porDia[n]!])
        }
        var lNext: Any = NSNull()
        if let pm = pendMin, let itens = porDia[pm] {
            let pend = itens.filter { !(($0["done"] as? Bool) ?? false) }
            if let i0 = pend.first {
                lNext = ["dia": "Dia \(pm)", "law": i0["law"] ?? "", "arts": i0["arts"] ?? "",
                         "disc": (pend.count > 1 ? "\(pend.count) normas neste dia" : ""), "color": "#0D9488"] as [String: Any]
            }
        }
        // Tabela COMPLETA por dia (p/ navegar entre roteiros no Ciclo: Roteiro N = dias 5N-4..5N)
        var todosDias: [String: Any] = [:]
        for (n, itens) in porDia { todosDias[String(n)] = itens }
        let legis: [String: Any] = ["done": ldone.count, "total": lTotal, "next": lNext, "semana": semana, "todosDias": todosDias]

        let jdone = JurisPlanoStore.lidos()
        let jTotal = JurisPlano.dias.count
        let jDone = JurisPlano.dias.filter { jdone.contains($0.dia) }.count
        var jProx: [[String: Any]] = []
        for nd in JurisPlano.dias where !jdone.contains(nd.dia) {
            if jProx.count >= 7 { break }
            jProx.append(["dia": nd.dia, "faixa": nd.faixa, "trilha": nd.trilha, "qtd": nd.qtd, "color": jurisTrilhaColor(nd.trilha)])
        }
        let jNext: Any = jProx.first.map { $0 as Any } ?? NSNull()
        let juris: [String: Any] = ["done": jDone, "total": jTotal, "next": jNext, "prox": jProx]

        let dict: [String: Any] = ["legis": legis, "juris": juris]
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let json = String(data: data, encoding: .utf8) else { return nil }
        return json
    }
    private func jurisTrilhaColor(_ t: String) -> String {
        switch t {
        case "STJ": return "#0D9488"
        case "TSE": return "#7C3AED"
        default:    return "#2563EB"
        }
    }

    // ===== Backup automático (semanal) =====
    // Escreve em ~/Documents/Cátedra Backups: os dados do app web (localStorage
    // catedra:*, sem PDFs pesados) + cópias do library.json (LEGIS) e state.json
    // (JURIS). Mantém os 8 mais recentes de cada série. Roda no máximo 1×/semana.
    func startAutoBackup() {
        // Primeiro disparo pouco após abrir; depois de 6 em 6 horas — o throttle de 7
        // dias dentro de performBackup garante que só faz backup de fato 1×/semana,
        // mas cobre o caso do app ficar aberto por muitos dias sem relançar.
        DispatchQueue.main.asyncAfter(deadline: .now() + 20) { [weak self] in
            MainActor.assumeIsolated { self?.performBackup(force: false) }
        }
        let tm = Timer(timeInterval: 6 * 3600, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.performBackup(force: false) }
        }
        RunLoop.main.add(tm, forMode: .common); autoBackupTimer = tm
    }
    func performBackup(force: Bool) {
        let last = UserDefaults.standard.double(forKey: "catedraLastBackupAt")
        if !force && Date().timeIntervalSince1970 - last < 7 * 24 * 3600 { return }
        guard let wv = webView else { return }
        // Coleta o localStorage do Cátedra (sem o flag de auth e sem PDFs base64 — o
        // mesmo corte do sync; os PDFs originais seguem na pasta da biblioteca).
        let js = """
        (function(){
          var o = {};
          for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (!k || k.indexOf('catedra:') !== 0 || k === 'catedra:auth') continue;
            var v = localStorage.getItem(k);
            if (k === 'catedra:lib') {
              try { var lib = JSON.parse(v); if (Array.isArray(lib)) v = JSON.stringify(lib.map(function(b){
                if (b && (b.pdfB64 || b.pages || b._bytes)) { var c = {}; for (var kk in b) if (kk!=='pdfB64'&&kk!=='pages'&&kk!=='_bytes') c[kk]=b[kk]; c._pdfLocal=true; return c; }
                return b; })); } catch(_) {}
            }
            o[k] = v;
          }
          return JSON.stringify(o);
        })()
        """
        wv.evaluateJavaScript(js) { [weak self] result, _ in
            guard let self, let s = result as? String, s.count > 2 else { return }
            MainActor.assumeIsolated { self.writeBackupFiles(webJSON: s, force: force) }
        }
    }
    private func writeBackupFiles(webJSON: String, force: Bool) {
        let fm = FileManager.default
        let dir = fm.homeDirectoryForCurrentUser
            .appendingPathComponent("Documents/Cátedra Backups", isDirectory: true)
        do {
            try fm.createDirectory(at: dir, withIntermediateDirectories: true)
            let df = DateFormatter(); df.dateFormat = "yyyy-MM-dd"
            let stamp = df.string(from: Date())
            // 1) app web (plataforma) — sobrescreve se rodar de novo no mesmo dia
            try webJSON.data(using: .utf8)?
                .write(to: dir.appendingPathComponent("catedra-web-\(stamp).json"))
            // 2) apps nativos — cópia dos arquivos de dados
            let appSup = fm.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support")
            let pares: [(URL, String)] = [
                (appSup.appendingPathComponent("VadeMecum/library.json"), "legis-\(stamp).json"),
                (appSup.appendingPathComponent("VadeMecumJuris/state.json"), "juris-\(stamp).json"),
            ]
            for (src, name) in pares where fm.fileExists(atPath: src.path) {
                let dst = dir.appendingPathComponent(name)
                if fm.fileExists(atPath: dst.path) { try fm.removeItem(at: dst) }
                try fm.copyItem(at: src, to: dst)
            }
            // 3) poda: mantém os 8 mais recentes de cada série (nomes têm a data → sort lexical)
            for prefix in ["catedra-web-", "legis-", "juris-"] {
                let all = (try? fm.contentsOfDirectory(atPath: dir.path)) ?? []
                let serie = all.filter { $0.hasPrefix(prefix) && $0.hasSuffix(".json") }.sorted(by: >)
                for velho in serie.dropFirst(8) {
                    try? fm.removeItem(at: dir.appendingPathComponent(velho))
                }
            }
            UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: "catedraLastBackupAt")
            UserDefaults.standard.removeObject(forKey: "catedraLastBackupError")
            if force { NSWorkspace.shared.activateFileViewerSelecting([dir]) }   // revela no Finder
        } catch {
            NSLog("Cátedra backup falhou: \(error.localizedDescription)")
            UserDefaults.standard.set(error.localizedDescription, forKey: "catedraLastBackupError")
            if force {
                let a = NSAlert(); a.messageText = "Não foi possível fazer o backup"
                a.informativeText = error.localizedDescription; a.alertStyle = .warning
                a.runModal()
            } else {
                // O backup SEMANAL roda com force:false — e aqui a falha era MUDA:
                // só um NSLog que ninguém lê. Resultado: o backup parava de
                // acontecer e a pessoa só descobriria no dia em que precisasse
                // dele. A causa mais provável é justamente negar o acesso à pasta
                // Documentos (o macOS pergunta uma vez; trocar a assinatura do app
                // faz ele perguntar de novo).
                // Avisa por notificação — no máximo uma por dia, para não virar praga.
                let ud = UserDefaults.standard
                let agora = Date().timeIntervalSince1970
                if agora - ud.double(forKey: "catedraLastBackupWarnAt") > 86_400 {
                    ud.set(agora, forKey: "catedraLastBackupWarnAt")
                    let c = UNMutableNotificationContent()
                    c.title = "O backup do Cátedra não está funcionando"
                    c.body = "Não consegui gravar em Documentos › Cátedra Backups. Veja Ajustes do Sistema › Privacidade e Segurança › Arquivos e Pastas."
                    UNUserNotificationCenter.current().add(
                        UNNotificationRequest(identifier: "catedra-backup-falhou", content: c, trigger: nil))
                }
            }
        }
    }

    // ===== Painel flutuante "widget" na área de trabalho (desenhado pelo app) =====
    func toggleWidgetPanel() {
        if let p = widgetPanel, p.isVisible { hideWidgetPanel() } else { showWidgetPanel() }
    }
    func showWidgetPanel() {
        if widgetPanel == nil {
            let host = NSHostingView(rootView: WidgetCardView(model: WidgetModel.shared))
            host.frame = NSRect(x: 0, y: 0, width: 300, height: 150)
            let panel = NSPanel(contentRect: host.frame,
                                styleMask: [.borderless, .nonactivatingPanel],
                                backing: .buffered, defer: false)
            panel.isFloatingPanel = true
            panel.level = .floating
            panel.hidesOnDeactivate = false
            panel.isMovableByWindowBackground = true
            panel.backgroundColor = .clear
            panel.hasShadow = true
            panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
            panel.contentView = host
            panel.setFrameAutosaveName("CatedraDeskWidget")
            if panel.frame.origin == .zero, let vf = NSScreen.main?.visibleFrame {
                panel.setFrameOrigin(NSPoint(x: vf.maxX - 320, y: vf.maxY - 170))
            }
            widgetPanel = panel
        }
        WidgetModel.shared.onTogglePiP = { [weak self] in self?.toggleClockPiP() }
        WidgetModel.shared.onClose = { [weak self] in self?.hideWidgetPanel() }
        widgetPanel?.orderFrontRegardless()
        // Se a posição salva era de um monitor que não está mais conectado, o painel
        // abriria fora da tela — traz de volta para o canto do monitor principal.
        if let p = widgetPanel,
           !NSScreen.screens.contains(where: { $0.visibleFrame.intersects(p.frame) }),
           let vf = NSScreen.main?.visibleFrame {
            p.setFrameOrigin(NSPoint(x: vf.maxX - 320, y: vf.maxY - 170))
        }
        UserDefaults.standard.set(true, forKey: "catedraDeskWidgetVisible")
        panelToggleItem?.state = .on
        pushWidgetData()
    }
    func hideWidgetPanel() {
        widgetPanel?.orderOut(nil)
        UserDefaults.standard.set(false, forKey: "catedraDeskWidgetVisible")
        panelToggleItem?.state = .off
    }
    // Botão do widget: abre/fecha a janela flutuante do cronômetro (PiP), via o app web.
    func toggleClockPiP() {
        webView?.evaluateJavaScript("window.catedraTogglePiP && window.catedraTogglePiP()", completionHandler: nil)
    }

    private func switchTo(_ tab: Int) {
        // aba que a área não oferece não abre por atalho, por menu nem por clique
        if tab == 2 && !jurisDisponivel { tabControl?.selectedSegment = currentTab; return }
        // Ao SAIR do CátedraLEGIS/CátedraJURIS, fecha a rajada e coleta no Cátedra.
        if currentTab == 1 && tab != 1 { flushLegisStudy() }
        if currentTab == 2 && tab != 2 { flushJurisStudy() }
        StudyClock.shared.setTabActive(tab == 1)   // relógio do LEGIS: só na aba 1
        JurisClock.shared.setTabActive(tab == 2)   // relógio do JURIS: só na aba 2
        currentTab = tab
        tabControl?.selectedSegment = tab
        updateTabMenuState()
        // Voltou ao Cátedra pela aba: a volta ao ponto do processo deixou de fazer sentido.
        if tab == 0 { AcervoEntrada.shared.limpar() }
        atualizarBotaoVoltarAcervo()
        switch tab {
        case 1:
            // Reespelha o tema do Cátedra e monta/atualiza o host; só mostra se ainda na aba 1.
            openLegisTab { [weak self] in
                guard let self = self, self.currentTab == 1 else { return }
                self.applyTabVisibility(1)
            }
        case 2:
            openJurisTab { [weak self] in
                guard let self = self, self.currentTab == 2 else { return }
                self.applyTabVisibility(2)
            }
        default:
            applyTabVisibility(0)
            pushWidgetData()      // voltou ao Cátedra: atualiza o widget com os dados frescos
            pushNativeReviews()   // …e a agenda única (revisões vencidas do LEGIS/JURIS)
        }
    }

    // MARK: - Ponte de estudo (CátedraLEGIS → Cátedra)

    // Registra as condições/baselines do cronômetro (chamado 1× no launch).
    private func setupLegisClock() {
        StudyClock.shared.onBurstStart = { [weak self] in
            guard let self = self, self.legisReadsBaseline == nil else { return }
            self.legisReadsBaseline = AppStore.shared.readsToday
            self.legisReviewsBaseline = AppStore.shared.reviewedToday
        }
        // Cada segmento do cronômetro soma no tempo de estudo daquela norma.
        StudyClock.shared.onSegmentEnd = { law, secs in
            AppStore.shared.addStudyTime(law, secs)
        }
    }

    // Fecha a rajada: ABRE o registro do Cátedra pré-preenchido (a pessoa confere —
    // não grava sozinho). O tempo vem RATEADO POR MATÉRIA (o relógio fecha um
    // segmento a cada troca de norma): uma matéria → um registro; várias → FILA
    // (um modal por matéria, em sequência). Sobras <1 min fundem na dominante.
    private func flushLegisStudy() {
        let (total, byLaw) = StudyClock.shared.takeAndResetBurst()
        defer { legisReadsBaseline = nil; legisReviewsBaseline = nil }
        guard Int((total / 60).rounded()) >= 1, vmHost != nil else { return }

        // Agrupa o tempo por disciplina do Cátedra (norma → matéria), guardando a
        // norma mais lida de cada disciplina para o tópico.
        struct Acc { var secs: TimeInterval = 0; var topLaw: LawEntry?; var topSecs: TimeInterval = 0 }
        var porDisc: [String: Acc] = [:]
        for (id, s) in byLaw {
            guard let law = AppStore.shared.laws.first(where: { $0.id == id }) else { continue }
            let disc = law.customCategory ?? AppDelegate.catedraDisc(for: law.category)
            var a = porDisc[disc] ?? Acc()
            a.secs += s
            if s > a.topSecs { a.topSecs = s; a.topLaw = law }
            porDisc[disc] = a
        }
        if porDisc.isEmpty {  // segurança: sem rateio, registra o total como antes
            let (disc, _) = legisDiscAndTopic()
            porDisc[disc] = Acc(secs: total, topLaw: nil, topSecs: 0)
        }
        var lista = porDisc.map { (disc: $0.key, acc: $0.value) }.sorted { $0.acc.secs > $1.acc.secs }
        if lista.count > 1 {
            let resto = lista.dropFirst().filter { $0.acc.secs < 60 }.reduce(0.0) { $0 + $1.acc.secs }
            lista[0].acc.secs += resto
            lista = [lista[0]] + lista.dropFirst().filter { $0.acc.secs >= 60 }
        }

        let reads = max(0, AppStore.shared.readsToday - (legisReadsBaseline ?? AppStore.shared.readsToday))
        let reviews = max(0, AppStore.shared.reviewedToday - (legisReviewsBaseline ?? AppStore.shared.reviewedToday))
        let artigo = UserDefaults.standard.string(forKey: "lastStudiedUnitLabel") ?? ""
        let lastLawID = UserDefaults.standard.string(forKey: "lastStudiedLawID").flatMap(UUID.init)

        var itens: [[String: Any]] = []
        for item in lista {
            let mins = Int((item.acc.secs / 60).rounded())
            guard mins >= 1 else { continue }
            var topico = item.acc.topLaw?.title ?? "Leitura de leis · CátedraLEGIS"
            var nota = "leitura de lei no CátedraLEGIS"
            if let law = item.acc.topLaw, law.id == lastLawID, !artigo.isEmpty {
                topico += " — \(artigo)"
                nota = "parou no \(artigo) no CátedraLEGIS"
            }
            itens.append(["min": mins, "disc": item.disc, "topico": topico,
                          "categoria": "Lei seca", "origem": "CátedraLEGIS", "nota": nota])
        }
        guard !itens.isEmpty else { return }
        // Artigos lidos/revisões da rajada inteira vão na nota do primeiro registro.
        var partes: [String] = []
        if reads > 0 { partes.append("\(reads) artigo\(reads == 1 ? "" : "s") lido\(reads == 1 ? "" : "s")") }
        if reviews > 0 { partes.append("\(reviews) revisã\(reviews == 1 ? "o" : "es")") }
        if !partes.isEmpty, let nota0 = itens[0]["nota"] as? String {
            itens[0]["nota"] = partes.joined(separator: " · ") + " · " + nota0
        }

        let payload: [String: Any] = itens.count == 1
            ? itens[0]
            : ["queue": itens, "origem": "CátedraLEGIS"]
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8) else { return }
        deliverStudyRegistration(json)
    }

    // MARK: - Ponte de estudo (CátedraJURIS → Cátedra)

    // Baseline da rajada do JURIS (verbetes lidos), capturado quando o relógio parte do zero.
    private func setupJurisClock() {
        JurisClock.shared.onBurstStart = { [weak self] in
            guard let self = self, self.jurisLidosBaseline == nil else { return }
            self.jurisLidosBaseline = self.jurisStore?.lidosHoje ?? 0
        }
    }

    // Fecha a rajada do CátedraJURIS: o tempo vem RATEADO POR MATÉRIA (o relógio
    // fecha um segmento a cada troca de verbete). Uma matéria → um registro; várias
    // matérias → FILA de registros (o Cátedra abre um modal por matéria, em sequência).
    // Sobras de menos de 1 min são fundidas na matéria dominante.
    private func flushJurisStudy() {
        var breakdown = JurisClock.shared.takeAndResetBreakdown()   // já vem por ordem de tempo
        defer { jurisLidosBaseline = nil }
        guard !breakdown.isEmpty, jurisStore != nil, let store = jurisStore else { return }

        // Funde na dominante as matérias com menos de 60s (não valem um modal).
        if breakdown.count > 1 {
            let resto = breakdown.dropFirst().filter { $0.secs < 60 }.reduce(0) { $0 + $1.secs }
            breakdown = [(breakdown[0].disc, breakdown[0].secs + resto, breakdown[0].titulo)]
                + breakdown.dropFirst().filter { $0.secs >= 60 }
        }

        let lidos = max(0, store.lidosHoje - (jurisLidosBaseline ?? store.lidosHoje))
        var itens: [[String: Any]] = []
        for (disc, secs, titulo) in breakdown {
            let mins = Int((secs / 60).rounded())
            guard mins >= 1 else { continue }
            let topico = titulo.map { "Jurisprudência — \($0)" } ?? "Revisão de jurisprudência · CátedraJURIS"
            let nota = (titulo.map { "parou em \($0)" } ?? "revisão de jurisprudência") + " no CátedraJURIS"
            itens.append(["min": mins, "disc": disc, "topico": topico,
                          "categoria": "Jurisprudência", "origem": "CátedraJURIS", "nota": nota])
        }
        guard !itens.isEmpty else { return }
        // O total de verbetes lidos da rajada vai na nota do primeiro registro.
        if lidos > 0, var nota0 = itens[0]["nota"] as? String {
            nota0 = "\(lidos) verbete\(lidos == 1 ? "" : "s") lido\(lidos == 1 ? "" : "s") · " + nota0
            itens[0]["nota"] = nota0
        }

        let payload: [String: Any] = itens.count == 1
            ? itens[0]
            : ["queue": itens, "origem": "CátedraJURIS"]
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8) else { return }
        deliverStudyRegistration(json)
    }

    // MARK: - Ponte de checklist (CátedraLEGIS/CátedraJURIS → ciclo do Cátedra)

    // Item de leitura marcado como feito no LEGIS/JURIS → tenta marcar como concluída
    // a tarefa correspondente de HOJE no ciclo de estudos (por matéria/categoria).
    private func markCycleTaskDone(_ userInfo: [AnyHashable: Any]?) {
        guard let userInfo, let origem = userInfo["origem"] as? String,
              let texto = userInfo["texto"] as? String else { return }
        let categoria = userInfo["categoria"] as? String
        let payload: [String: Any] = ["origem": origem, "categoria": categoria ?? NSNull(), "texto": texto]
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8) else { return }
        webView.evaluateJavaScript("window.catedraMarkChecklistDone && window.catedraMarkChecklistDone(\(json))", completionHandler: nil)
    }

    // Disciplina do Cátedra + tópico (norma + artigo onde parou) da última norma estudada.
    private func legisDiscAndTopic() -> (String, String) {
        guard let idStr = UserDefaults.standard.string(forKey: "lastStudiedLawID"),
              let uuid = UUID(uuidString: idStr),
              let law = AppStore.shared.laws.first(where: { $0.id == uuid }) else {
            return ("Legislação", "Leitura de leis · CátedraLEGIS")
        }
        let disc = law.customCategory ?? AppDelegate.catedraDisc(for: law.category)
        var topico = law.title
        if let artigo = UserDefaults.standard.string(forKey: "lastStudiedUnitLabel"), !artigo.isEmpty {
            topico += " — \(artigo)"
        }
        return (disc, topico)
    }

    private static func catedraDisc(for c: LawCategory) -> String {
        switch c {
        case .constitucional: return "Direito Constitucional"
        case .civil:          return "Direito Civil"
        case .penal:          return "Direito Penal"
        case .administrativo: return "Direito Administrativo"
        case .tributario:     return "Direito Tributário"
        case .trabalhista:    return "Direito do Trabalho"
        case .previdenciario: return "Direito Previdenciário"
        case .empresarial:    return "Direito Empresarial"
        case .consumidor:     return "Direito do Consumidor"
        case .ambiental:      return "Direito Ambiental"
        case .internacional:  return "Direito Internacional"
        default:              return "Legislação"
        }
    }

    private func applyTabVisibility(_ tab: Int) {
        webView.isHidden = (tab != 0)
        vmHost?.isHidden = (tab != 1)
        jurisHost?.isHidden = (tab != 2)
        switch tab {
        case 1: window.title = "CátedraLEGIS"
        case 2: window.title = "CátedraJURIS"
        default:
            let t = (webView.title ?? "").trimmingCharacters(in: .whitespaces)
            window.title = t.isEmpty ? "Cátedra" : t
        }
    }

    // Lê o tema ATUAL do Cátedra (variáveis CSS já computadas do WebView) e monta ou
    // atualiza o host do CátedraLEGIS. Rebuild só quando o tema muda → trocar de aba
    // preserva o estado; mudar a identidade no Ajustes do Cátedra reflete aqui.
    private func openLegisTab(_ done: @escaping () -> Void) {
        // As variáveis de tema do Cátedra ficam inline no <div style="--bg:…"> raiz do app
        // (não em :root); então lemos do elemento que realmente as possui.
        let js = """
        (function(){
          var el = document.querySelector('[style*="--accent"]') || document.documentElement;
          var s = getComputedStyle(el);
          function g(n){ return (s.getPropertyValue(n)||'').trim(); }
          return JSON.stringify({
            bg:g('--bg'), surface:g('--surface'), surface2:g('--surface2'), border:g('--border'),
            ink:g('--ink'), text2:g('--text2'), text3:g('--text3'),
            accent:g('--accent'), accentD:g('--accentD'), radius:g('--radius'),
            ok:g('--ok'), warn:g('--warn'), danger:g('--danger'), display:g('--display'),
            sbg:g('--sbg'), stext:g('--stext'), sactbg:g('--sactbg'), sacttext:g('--sacttext'),
            heroGrad:g('--heroGrad'), dark:(localStorage.getItem('catedra:dark')||'')
          });
        })()
        """
        webView.evaluateJavaScript(js) { [weak self] result, _ in
            guard let self = self else { return }
            let changed = self.applyCatedraTheme(from: result as? String)
            if self.vmHost == nil {
                self.buildVMHost()
            } else if changed {
                self.vmHost?.removeFromSuperview(); self.vmHost = nil
                self.buildVMHost()
            }
            // O tema mudou: derruba o host do JURIS também, p/ reconstruir com o novo
            // tema na próxima visita (mesma semântica de rebuild-só-quando-muda).
            if changed, self.jurisHost != nil {
                self.jurisHost?.removeFromSuperview(); self.jurisHost = nil
            }
            self.refreshEditalDisciplinas()
            done()
        }
    }

    /// Espelha as matérias do edital do Cátedra p/ o vínculo da checklist de leitura do LEGIS.
    private func refreshEditalDisciplinas() {
        webView.evaluateJavaScript("window.catedraEditalDisciplinas && window.catedraEditalDisciplinas()") { result, _ in
            guard let s = result as? String, let data = s.data(using: .utf8),
                  let names = try? JSONDecoder().decode([String].self, from: data) else { return }
            AppStore.shared.setEditalDisciplinas(names)
        }
    }
    /// Mesma coisa, para a checklist de leitura PRÓPRIA do CátedraJURIS (dados separados).
    private func refreshEditalDisciplinasJuris() {
        guard let store = jurisStore else { return }
        webView.evaluateJavaScript("window.catedraEditalDisciplinas && window.catedraEditalDisciplinas()") { result, _ in
            guard let s = result as? String, let data = s.data(using: .utf8),
                  let names = try? JSONDecoder().decode([String].self, from: data) else { return }
            store.setEditalDisciplinas(names)
        }
    }

    private func buildVMHost() {
        guard vmHost == nil else { return }
        // AppStore é singleton (dados em ~/Library/Application Support/VadeMecum — compartilhados
        // com o app de leis autônomo). Criado só agora, ao abrir a aba pela 1ª vez.
        let host = NSHostingView(rootView: CatedraLegisRoot(store: AppStore.shared))
        // MODO ESCURO DO EMBED: `.preferredColorScheme` é preferência de CENA — dentro de um
        // NSHostingView colado numa janela AppKit ela não chega a lugar nenhum. Era por isso
        // que, com o Cátedra no escuro, o LEGIS pintava as superfícies escuras (tokens do
        // tema) mas escrevia com as cores SEMÂNTICAS do modo claro: "Leitura", "Revisão",
        // `Color.secondary`, o placeholder do checklist e os rótulos do gráfico saíam
        // cinza-escuro sobre fundo escuro — ilegíveis. Pintar a aparência do host resolve
        // para o SwiftUI e para os controles AppKit (stepper, campo de texto) de uma vez.
        host.appearance = NSAppearance(named: ThemeState.t.isDark ? .darkAqua : .aqua)
        host.frame = pageContainer.bounds
        host.autoresizingMask = [.width, .height]
        pageContainer.addSubview(host)
        vmHost = host
    }

    // Espelha o tema e monta/atualiza o host do CátedraJURIS (Vade Mecum de
    // jurisprudência). Mesmo contrato do openLegisTab: rebuild só quando o tema muda.
    private func openJurisTab(_ done: @escaping () -> Void) {
        let js = """
        (function(){
          var el = document.querySelector('[style*="--accent"]') || document.documentElement;
          var s = getComputedStyle(el);
          function g(n){ return (s.getPropertyValue(n)||'').trim(); }
          return JSON.stringify({
            bg:g('--bg'), surface:g('--surface'), surface2:g('--surface2'), border:g('--border'),
            ink:g('--ink'), text2:g('--text2'), text3:g('--text3'),
            accent:g('--accent'), accentD:g('--accentD'), radius:g('--radius'),
            ok:g('--ok'), warn:g('--warn'), danger:g('--danger'), display:g('--display'),
            sbg:g('--sbg'), stext:g('--stext'), sactbg:g('--sactbg'), sacttext:g('--sacttext'),
            heroGrad:g('--heroGrad'), dark:(localStorage.getItem('catedra:dark')||'')
          });
        })()
        """
        webView.evaluateJavaScript(js) { [weak self] result, _ in
            guard let self = self else { return }
            let changed = self.applyCatedraTheme(from: result as? String)
            if self.jurisHost == nil {
                self.buildJurisHost()
            } else if changed {
                self.jurisHost?.removeFromSuperview(); self.jurisHost = nil
                self.buildJurisHost()
            }
            if changed, self.vmHost != nil {
                self.vmHost?.removeFromSuperview(); self.vmHost = nil
            }
            self.refreshEditalDisciplinasJuris()
            done()
        }
    }

    private func buildJurisHost() {
        guard jurisHost == nil else { return }
        // Store/updater únicos do embed (dados em ~/Library/Application Support/
        // VadeMecumJuris — COMPARTILHADOS com o app de jurisprudência autônomo).
        let store = jurisStore ?? LibraryStore()
        let updater = jurisUpdater ?? UpdateService()
        jurisStore = store; jurisUpdater = updater
        let host = NSHostingView(rootView: CatedraJurisRoot(store: store, updater: updater))
        // MODO ESCURO DO EMBED: `.preferredColorScheme` é preferência de CENA — dentro de um
        // NSHostingView colado numa janela AppKit ela não chega a lugar nenhum. Era por isso
        // que, com o Cátedra no escuro, o LEGIS pintava as superfícies escuras (tokens do
        // tema) mas escrevia com as cores SEMÂNTICAS do modo claro: "Leitura", "Revisão",
        // `Color.secondary`, o placeholder do checklist e os rótulos do gráfico saíam
        // cinza-escuro sobre fundo escuro — ilegíveis. Pintar a aparência do host resolve
        // para o SwiftUI e para os controles AppKit (stepper, campo de texto) de uma vez.
        host.appearance = NSAppearance(named: ThemeState.t.isDark ? .darkAqua : .aqua)
        host.frame = pageContainer.bounds
        host.autoresizingMask = [.width, .height]
        pageContainer.addSubview(host)
        jurisHost = host
    }

    // Espelha o tema do Cátedra: importa as CSS vars computadas → CatedraTheme (ThemeState.t)
    // + modo claro/escuro. Retorna true se o tema mudou desde a última aplicação.
    @discardableResult
    private func applyCatedraTheme(from json: String?) -> Bool {
        guard let json = json, let data = json.data(using: .utf8),
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
        if let r = (d["radius"] as? String).flatMap(AppDelegate.px) { t.radius = min(24, max(4, r)) }
        t.heroStops = AppDelegate.heroColors(d["heroGrad"] as? String, accent: t.accent, accentD: t.accentD)
        let darkStr = ((d["dark"] as? String) ?? "").trimmingCharacters(in: CharacterSet(charactersIn: "\" "))
        t.isDark = (darkStr == "1" || darkStr.lowercased() == "true")
        ThemeState.t = t
        UserDefaults.standard.set(t.isDark ? "dark" : "light", forKey: "appearance")
        // O CátedraJURIS usa chave própria (valores "claro"/"escuro" — colidiria com a
        // do LEGIS, que guarda "light"/"dark" na chave "appearance").
        UserDefaults.standard.set(t.isDark ? "escuro" : "claro", forKey: "jurisAppearance")
        let changed = (json != lastThemeKey)
        lastThemeKey = json
        return changed
    }

    // "10px" → CGFloat.
    private static func px(_ s: String) -> CGFloat? {
        let n = s.replacingOccurrences(of: "px", with: "").trimmingCharacters(in: .whitespaces)
        return Double(n).map { CGFloat($0) }
    }

    // Extrai as paradas de cor de um `--heroGrad` (gradiente ou cor sólida) do Cátedra.
    private static func heroColors(_ grad: String?, accent: Color, accentD: Color) -> [Color] {
        guard let grad = grad, !grad.isEmpty else { return [accent, accentD] }
        let pattern = "#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgba?\\([^)]*\\)"
        let ns = grad as NSString
        let cols: [Color] = (try? NSRegularExpression(pattern: pattern))?
            .matches(in: grad, range: NSRange(location: 0, length: ns.length))
            .compactMap { Color(css: ns.substring(with: $0.range)) } ?? []
        if cols.count >= 2 { return cols }
        if cols.count == 1 { return [cols[0], cols[0]] }
        return [accent, accentD]
    }

    // Ajustes do CátedraLEGIS numa janela própria (o host AppKit não tem cena Settings/⌘,).
    @objc func openLegisSettings(_ sender: Any?) {
        if legisSettingsWindow == nil {
            let root = SettingsView().environmentObject(AppStore.shared).frame(width: 580, height: 560)
            let w = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 580, height: 560),
                             styleMask: [.titled, .closable], backing: .buffered, defer: false)
            w.title = "Ajustes — CátedraLEGIS"
            w.contentView = NSHostingView(rootView: root)
            w.isReleasedWhenClosed = false
            w.center()
            legisSettingsWindow = w
        }
        legisSettingsWindow?.makeKeyAndOrderFront(nil)
    }

    // Ajustes do CátedraJURIS numa janela própria (⌘⌥, — o ⌘, é do LEGIS).
    @objc func openJurisSettings(_ sender: Any?) {
        // Garante store/updater mesmo se a aba nunca foi aberta nesta sessão.
        let store = jurisStore ?? LibraryStore()
        let updater = jurisUpdater ?? UpdateService()
        jurisStore = store; jurisUpdater = updater
        if jurisSettingsWindow == nil {
            let root = JurisSettingsView().environment(store).environment(updater)
                .frame(width: 620, height: 560)
            let w = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 620, height: 560),
                             styleMask: [.titled, .closable], backing: .buffered, defer: false)
            w.title = "Ajustes — CátedraJURIS"
            w.contentView = NSHostingView(rootView: root)
            w.isReleasedWhenClosed = false
            w.center()
            jurisSettingsWindow = w
        }
        jurisSettingsWindow?.makeKeyAndOrderFront(nil)
    }


    // MARK: Backup na nuvem pessoal (iCloud Drive)
    // Sem entitlement de iCloud (o app é notarizado com zero entitlements e não é sandboxed):
    // ~/Library/Mobile Documents/com~apple~CloudDocs É a pasta do iCloud Drive do usuário, e
    // escrever nela basta para o arquivo subir. Sem iCloud Drive ativo, cai no painel de salvar.
    private func pastaICloud() -> URL? {
        let base = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Mobile Documents/com~apple~CloudDocs", isDirectory: true)
        var isDir: ObjCBool = false
        guard FileManager.default.fileExists(atPath: base.path, isDirectory: &isDir), isDir.boolValue else { return nil }
        return base.appendingPathComponent("Cátedra", isDirectory: true)
    }
    private func handleBackup(_ message: WKScriptMessage, _ reply: @escaping (Any?, String?) -> Void) {
        let body = message.body as? [String: Any] ?? [:]
        let acao = body["acao"] as? String ?? ""
        let nomePedido = body["nome"] as? String ?? ""
        let nome = nomePedido.isEmpty ? "catedra-backup.json" : nomePedido
        let json = body["json"] as? String ?? ""
        DispatchQueue.main.async { [weak self] in
            guard let self else { reply(["erro": "host indisponível"], nil); return }
            let fm = FileManager.default
            if acao == "salvar" {
                guard let data = json.data(using: .utf8), !data.isEmpty else { reply(["erro": "backup vazio"], nil); return }
                if let pasta = self.pastaICloud() {
                    do {
                        try fm.createDirectory(at: pasta, withIntermediateDirectories: true)
                        try data.write(to: pasta.appendingPathComponent(nome), options: .atomic)
                        reply(["ok": true, "onde": "iCloud Drive › Cátedra"], nil)
                        return
                    } catch { /* sem iCloud gravável: cai no painel abaixo */ }
                }
                let painel = NSSavePanel()
                painel.nameFieldStringValue = nome
                painel.canCreateDirectories = true
                painel.allowedContentTypes = [.json]
                painel.begin { resultado in
                    guard resultado == .OK, let destino = painel.url else { reply(["cancelado": true], nil); return }
                    do { try data.write(to: destino, options: .atomic); reply(["ok": true, "onde": destino.deletingLastPathComponent().lastPathComponent], nil) }
                    catch { reply(["erro": error.localizedDescription], nil) }
                }
            } else if acao == "ler" {
                let ler: (URL) -> Void = { origem in
                    do {
                        let dados = try Data(contentsOf: origem)
                        var quando = ""
                        if let attrs = try? fm.attributesOfItem(atPath: origem.path), let mod = attrs[.modificationDate] as? Date {
                            quando = DateFormatter.localizedString(from: mod, dateStyle: .short, timeStyle: .short)
                        }
                        reply(["json": String(decoding: dados, as: UTF8.self), "quando": quando], nil)
                    } catch { reply(["erro": error.localizedDescription], nil) }
                }
                if let pasta = self.pastaICloud() {
                    let arquivo = pasta.appendingPathComponent(nome)
                    if fm.fileExists(atPath: arquivo.path) { ler(arquivo); return }
                }
                let painel = NSOpenPanel()
                painel.allowedContentTypes = [.json]
                painel.canChooseDirectories = false
                painel.allowsMultipleSelection = false
                if let pasta = self.pastaICloud() { painel.directoryURL = pasta }
                painel.begin { resultado in
                    guard resultado == .OK, let origem = painel.url else { reply(["cancelado": true], nil); return }
                    ler(origem)
                }
            } else {
                reply(["erro": "ação desconhecida"], nil)
            }
        }
    }

    // MARK: Roteamento das pontes JS → Swift
    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        let reply: (Any?, String?) -> Void = { v, e in DispatchQueue.main.async { replyHandler(v, e) } }
        switch message.name {
        case "catedraAI":        handleAI(message, reply)
        case "notifyPermission": handleNotifPermission(message, reply)
        case "notifyShow":       handleNotifShow(message.body); reply(nil, nil)
        case "catedraArea":
            // {area, rotulo, juris, legis} — a web avisa o que a área ativa oferece
            if let d = message.body as? [String: Any] {
                let temJuris = (d["juris"] as? Bool) ?? true
                DispatchQueue.main.async { self.aplicarArea(juris: temJuris) }
            }
            reply(nil, nil)
        case "catedraNav":
            // Agenda única: o "Abrir" das revisões nativas na web troca a aba do host.
            // Item 5: o mapa de Processo e peças manda um DICIONÁRIO {alvo, termo, de} —
            // a String continua aceita (revisões nativas e versões antigas do bundle).
            var dest = ""
            var termo = ""
            var origem: AcervoEntrada.Origem?
            if let s = message.body as? String {
                dest = s
            } else if let d = message.body as? [String: Any] {
                dest = (d["alvo"] as? String) ?? ""
                termo = (d["termo"] as? String) ?? ""
                origem = AcervoEntrada.origem(de: d["de"] as? [String: Any])
            }
            if dest == "legis" || dest == "juris" {
                AcervoEntrada.shared.chegou(termo: termo, origem: origem)
                if dest == "legis" { switchTo(1) } else { switchTo(2) }
                atualizarBotaoVoltarAcervo()   // switchTo já rodou: agora o botão sabe da origem
                // O JURIS é um store do host: dá para aplicar a busca direto.
                if dest == "juris", !termo.isEmpty {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
                        guard let store = self?.jurisStore else { return }
                        store.ir(.todos)          // ir() zera a busca: o termo entra DEPOIS
                        store.searchText = termo
                    }
                }
            }
            reply(nil, nil)
        case "catedraPlano":
            // Ciclo semanal: checkbox de uma leitura da tabela-dia (key "di_li_dyi").
            togglePlanoLeitura((message.body as? String) ?? "")
            reply(nil, nil)
        case "catedraBackup":    handleBackup(message, reply)
        case "catedraPrint":
            // Relatório → Imprimir/Salvar PDF: WKWebView não implementa window.print(),
            // então o host roda a NSPrintOperation da própria webview (diálogo padrão do macOS).
            DispatchQueue.main.async { [weak self] in
                guard let self, let wv = self.webView, let win = wv.window else { return }
                let info = NSPrintInfo.shared
                info.horizontalPagination = .fit
                info.verticalPagination = .automatic
                info.topMargin = 24; info.bottomMargin = 24
                info.leftMargin = 24; info.rightMargin = 24
                let op = wv.printOperation(with: info)
                op.view?.frame = wv.bounds
                op.runModal(for: win, delegate: nil, didRun: nil, contextInfo: nil)
            }
            reply(nil, nil)
        default:                 reply(nil, "handler desconhecido")
        }
    }

    // Ponte de IA (JS → Swift → IA → JS). Dois modos:
    //  1) endpoint /api/complete (CatedraAIEndpoint) — a chave fica no servidor;
    //  2) Gemini DIRETO (CatedraGeminiKey) — sem servidor, só uma chave gratuita do Google AI Studio.
    // Sem nenhum dos dois, rejeita → o app cai no fallback heurístico local.
    private func geminiKey() -> String? {
        let d = UserDefaults.standard.string(forKey: "CatedraGeminiKey")
        let p = Bundle.main.object(forInfoDictionaryKey: "CatedraGeminiKey") as? String
        let raw = (d ?? p ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        return (raw.isEmpty || raw.contains("YOUR-KEY")) ? nil : raw
    }

    /// Instala o provedor de IA que os módulos NATIVOS (LEGIS/JURIS) usam. Sem isto eles
    /// cairiam no AIService, que pede uma chave da Anthropic da própria pessoa em
    /// Configurações — e o app já tem IA pela sessão do Supabase. Uma IA só, e o kill
    /// switch do console de administração vale para os dois lados.
    func instalarProvedorIA() {
        CatedraIA.provedor = { [weak self] prompt in
            guard let self else { throw CatedraIA.Erro.indisponivel }
            let token = await self.tokenDaSessao()
            guard let url = aiEndpoint() else { throw CatedraIA.Erro.servidor("Endpoint de IA não configurado neste app.") }
            if token.isEmpty { throw CatedraIA.Erro.servidor("Não achei a sessão do Cátedra. Entre na conta na aba Cátedra e tente de novo.") }
            return try await withCheckedThrowingContinuation { cont in
                self.postEndpoint(url, prompt, token) { valor, erro in
                    // Antes eu trocava QUALQUER erro pela mensagem genérica de "IA
                    // indisponível" — e escondia a causa real (sessão expirada, chave da
                    // API não configurada na Vercel…). A tela mostra o que o servidor disse.
                    if let erro { cont.resume(throwing: CatedraIA.Erro.servidor(erro)) }
                    else { cont.resume(returning: (valor as? String) ?? "") }
                }
            }
        }
    }

    /// O token da sessão vive na PÁGINA (supabase-js no WebView), não aqui. A ponte de IA
    /// do JS já manda o token junto; para o lado nativo temos de ir buscar.
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

    private func handleAI(_ message: WKScriptMessage, _ reply: @escaping (Any?, String?) -> Void) {
        // A ponte antiga mandava só a string do prompt; a nova manda {prompt, token}.
        // Aceitamos as duas formas para não quebrar um WebView com JS em cache.
        var prompt = ""
        var token = ""
        if let s = message.body as? String {
            prompt = s
        } else if let d = message.body as? [String: Any] {
            prompt = (d["prompt"] as? String) ?? ""
            token = (d["token"] as? String) ?? ""
        }
        if let url = aiEndpoint() { postEndpoint(url, prompt, token, reply) }
        else if let key = geminiKey() { postGemini(key, prompt, reply) }
        else {
            // Dizer a verdade: antes isto virava "a IA não respondeu" na tela, e a pessoa
            // ficava tentando de novo achando que era instabilidade.
            reply(nil, "IA não configurada neste app. Use o Cátedra no navegador, ou configure o endpoint.")
        }
    }

    private func postEndpoint(_ url: URL, _ prompt: String, _ token: String,
                              _ reply: @escaping (Any?, String?) -> Void) {
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.timeoutInterval = 60
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if !token.isEmpty { req.setValue("Bearer " + token, forHTTPHeaderField: "Authorization") }
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["prompt": prompt])
        URLSession.shared.dataTask(with: req) { data, _, err in
            if let err = err { reply(nil, err.localizedDescription); return }
            guard let data = data,
                  let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                reply(nil, "resposta inválida da IA"); return
            }
            let text = (obj["completion"] as? String) ?? (obj["text"] as? String) ?? ""
            if text.isEmpty { reply(nil, (obj["error"] as? String) ?? "IA retornou vazio") } else { reply(text, nil) }
        }.resume()
    }

    private func postGemini(_ key: String, _ prompt: String, _ reply: @escaping (Any?, String?) -> Void) {
        let model = UserDefaults.standard.string(forKey: "CatedraGeminiModel") ?? "gemini-2.5-flash"
        guard let url = URL(string: "https://generativelanguage.googleapis.com/v1beta/models/\(model):generateContent") else {
            reply(nil, "URL do Gemini inválida"); return
        }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.timeoutInterval = 60
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(key, forHTTPHeaderField: "x-goog-api-key")
        let body: [String: Any] = [
            "contents": [["role": "user", "parts": [["text": prompt]]]],
            "generationConfig": ["maxOutputTokens": 4096, "temperature": 0.7, "thinkingConfig": ["thinkingBudget": 0]],
        ]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        URLSession.shared.dataTask(with: req) { data, _, err in
            if let err = err { reply(nil, err.localizedDescription); return }
            guard let data = data,
                  let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                reply(nil, "resposta inválida do Gemini"); return
            }
            if let cands = obj["candidates"] as? [[String: Any]], let first = cands.first,
               let content = first["content"] as? [String: Any], let parts = content["parts"] as? [[String: Any]] {
                let text = parts.compactMap { $0["text"] as? String }.joined()
                if text.isEmpty { reply(nil, "Gemini retornou vazio (filtro de segurança?)") } else { reply(text, nil) }
            } else {
                let e = (obj["error"] as? [String: Any])?["message"] as? String
                reply(nil, e ?? "Gemini sem resposta")
            }
        }.resume()
    }

    // MARK: Notificações nativas
    private func mapAuth(_ s: UNAuthorizationStatus) -> String {
        switch s {
        case .authorized, .provisional, .ephemeral: return "granted"
        case .denied:                               return "denied"
        default:                                    return "default"
        }
    }

    private func handleNotifPermission(_ message: WKScriptMessage, _ reply: @escaping (Any?, String?) -> Void) {
        let center = UNUserNotificationCenter.current()
        let wantsRequest = ((message.body as? [String: Any])?["request"] as? Bool) ?? false
        if wantsRequest {
            center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, erro in
                // O erro era descartado. A resposta ao JS continua correta (o ramo
                // de baixo consulta o estado real), mas sem log não há como apoiar
                // um testador que diz "não recebo lembrete nenhum".
                if let erro { NSLog("Cátedra: pedido de permissão de notificação falhou: \(erro.localizedDescription)") }
                if granted {
                    reply("granted", nil)
                } else {
                    center.getNotificationSettings { s in reply(self.mapAuth(s.authorizationStatus), nil) }
                }
            }
        } else {
            center.getNotificationSettings { s in reply(self.mapAuth(s.authorizationStatus), nil) }
        }
    }

    private func handleNotifShow(_ body: Any?) {
        guard let d = body as? [String: Any] else { return }
        let title = (d["title"] as? String) ?? "Cátedra"
        let content = UNMutableNotificationContent()
        content.title = title.isEmpty ? "Cátedra" : title
        content.body = (d["body"] as? String) ?? ""
        content.sound = .default
        if let view = d["view"] as? String, !view.isEmpty { content.userInfo = ["view": view] }
        let id = (d["tag"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? UUID().uuidString
        let req = UNNotificationRequest(identifier: id, content: content, trigger: nil)
        UNUserNotificationCenter.current().add(req, withCompletionHandler: nil)
    }

    // exibe a notificação mesmo com o app em primeiro plano
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list, .sound])
    }

    // clique na notificação traz o app à frente (e navega, se houver view)
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        NSApp.activate(ignoringOtherApps: true)
        window?.makeKeyAndOrderFront(nil)
        if let view = response.notification.request.content.userInfo["view"] as? String, !view.isEmpty,
           let esc = view.addingPercentEncoding(withAllowedCharacters: .alphanumerics) {
            switchTo(0)   // a navegação da notificação é no app web (aba Cátedra)
            webView?.evaluateJavaScript("window.__catedraGoView && window.__catedraGoView('\(esc)')", completionHandler: nil)
        }
        completionHandler()
    }

    // MARK: Links externos abrem no navegador padrão
    func webView(_ wv: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        // Exports do app (âncora com atributo download → blob:) viram DOWNLOAD nativo,
        // senão o WKWebView exibiria o blob inline (substituindo o app) e nada salvaria.
        if action.shouldPerformDownload { decisionHandler(.download); return }
        if let url = action.request.url, let scheme = url.scheme?.lowercased(),
           (scheme == "http" || scheme == "https"), action.navigationType == .linkActivated {
            NSWorkspace.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    // === Downloads dos exports (JSON/ICS/CSV + edital TXT/PDF) → ~/Downloads ===
    private var downloadDests: [ObjectIdentifier: URL] = [:]
    func webView(_ wv: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { download.delegate = self }
    func webView(_ wv: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) { download.delegate = self }
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let fm = FileManager.default
        let dir = fm.urls(for: .downloadsDirectory, in: .userDomainMask).first
            ?? fm.homeDirectoryForCurrentUser.appendingPathComponent("Downloads")
        let safe = suggestedFilename.isEmpty ? "catedra-export" : suggestedFilename
        var url = dir.appendingPathComponent(safe)
        let base = url.deletingPathExtension().lastPathComponent
        let ext = url.pathExtension
        var i = 1
        while fm.fileExists(atPath: url.path) {   // não sobrescreve: nome (1), (2)…
            url = dir.appendingPathComponent(ext.isEmpty ? "\(base) (\(i))" : "\(base) (\(i)).\(ext)"); i += 1
        }
        downloadDests[ObjectIdentifier(download)] = url
        completionHandler(url)
    }
    func downloadDidFinish(_ download: WKDownload) {
        if let u = downloadDests.removeValue(forKey: ObjectIdentifier(download)) {
            NSWorkspace.shared.activateFileViewerSelecting([u])   // revela o arquivo no Finder
        }
    }
    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        downloadDests.removeValue(forKey: ObjectIdentifier(download))
        // Antes isto era um beco sem saída: a pessoa clicava "Exportar", nada
        // acontecia, e não havia aviso, alerta nem log — parecia botão quebrado.
        // Causa mais provável na máquina de quem RECEBE o app: permissão da pasta
        // Downloads (o loop de deduplicação acima faz fileExists, que é LEITURA e
        // não tem consentimento implícito como a criação de arquivo tem).
        // Cancelar não é erro — nesse caso fica quieto.
        let ns = error as NSError
        if ns.domain == NSURLErrorDomain && ns.code == NSURLErrorCancelled { return }
        NSLog("Cátedra export falhou: \(error.localizedDescription)")
        let a = NSAlert()
        a.messageText = "Não foi possível salvar o arquivo"
        a.informativeText = error.localizedDescription
            + "\n\nSe for permissão, veja Ajustes do Sistema › Privacidade e Segurança › Arquivos e Pastas."
        a.alertStyle = .warning
        a.runModal()
    }

    // window.open: link externo (http/https) → navegador; caso contrário (PiP do
    // cronômetro, via about:blank) → PAINEL FLUTUANTE nativo hospedando o novo WKWebView.
    func webView(_ wv: WKWebView, createWebViewWith cfg: WKWebViewConfiguration,
                 for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url, let s = url.scheme?.lowercased(),
           s == "http" || s == "https" {
            NSWorkspace.shared.open(url)
            return nil
        }
        return makePiPPanel(configuration: cfg, features: windowFeatures)
    }

    private func makePiPPanel(configuration cfg: WKWebViewConfiguration, features: WKWindowFeatures) -> WKWebView {
        if let old = pipPanel { old.close() }  // um PiP por vez
        let w = features.width.map { CGFloat($0.doubleValue) } ?? 360
        let h = features.height.map { CGFloat($0.doubleValue) } ?? 250
        let rect = NSRect(x: 0, y: 0, width: w, height: h)

        let child = WKWebView(frame: rect, configuration: cfg)
        child.uiDelegate = self   // sem isto o window.close() do PiP não fecha o painel
        child.setValue(false, forKey: "drawsBackground")

        let panel = NSPanel(contentRect: rect,
                            styleMask: [.titled, .closable, .utilityWindow, .nonactivatingPanel, .fullSizeContentView],
                            backing: .buffered, defer: false)
        panel.title = "Cátedra · Foco"
        // Titlebar transparente + conteúdo sob ela: o card escuro preenche a janela toda e
        // os semáforos flutuam sobre o gradiente (sem a barra branca que destoava).
        panel.titlebarAppearsTransparent = true
        panel.titleVisibility = .hidden
        panel.appearance = NSAppearance(named: .darkAqua)
        panel.isFloatingPanel = true
        panel.level = .floating
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        panel.hidesOnDeactivate = false
        panel.isMovableByWindowBackground = true
        panel.backgroundColor = NSColor(srgbRed: 0x0b/255.0, green: 0x0e/255.0, blue: 0x14/255.0, alpha: 1)
        panel.contentView = child
        panel.delegate = self
        if let scr = NSScreen.main {
            let vf = scr.visibleFrame
            panel.setFrameTopLeftPoint(NSPoint(x: vf.maxX - w - 24, y: vf.maxY - 24))
        } else {
            panel.center()
        }
        panel.orderFrontRegardless()

        pipPanel = panel
        pipWebView = child
        return child
    }

    // app chamou w.close() no PiP → fecha o painel
    func webViewDidClose(_ webView: WKWebView) {
        if webView === pipWebView { pipPanel?.close() }
    }

    // usuário fechou o painel → limpa referências (o app detecta via w.closed/pagehide)
    func windowWillClose(_ notification: Notification) {
        if let win = notification.object as? NSWindow, win === pipPanel {
            pipPanel = nil
            pipWebView = nil
        }
    }

    // MARK: alert/confirm/prompt do JS → NSAlert nativo (sem isto, no WKWebView eles não aparecem)
    private func panelHost(_ wv: WKWebView) -> NSWindow? { wv.window ?? window }

    func webView(_ wv: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let a = NSAlert(); a.messageText = "Cátedra"; a.informativeText = message; a.addButton(withTitle: "OK")
        if let host = panelHost(wv) { a.beginSheetModal(for: host) { _ in completionHandler() } }
        else { a.runModal(); completionHandler() }
    }

    func webView(_ wv: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let a = NSAlert(); a.messageText = "Cátedra"; a.informativeText = message
        a.addButton(withTitle: "OK"); a.addButton(withTitle: "Cancelar")
        if let host = panelHost(wv) { a.beginSheetModal(for: host) { r in completionHandler(r == .alertFirstButtonReturn) } }
        else { completionHandler(a.runModal() == .alertFirstButtonReturn) }
    }

    func webView(_ wv: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let a = NSAlert(); a.messageText = "Cátedra"; a.informativeText = prompt
        a.addButton(withTitle: "OK"); a.addButton(withTitle: "Cancelar")
        let tf = NSTextField(frame: NSRect(x: 0, y: 0, width: 260, height: 24)); tf.stringValue = defaultText ?? ""
        a.accessoryView = tf
        let reply: (NSApplication.ModalResponse) -> Void = { r in completionHandler(r == .alertFirstButtonReturn ? tf.stringValue : nil) }
        if let host = panelHost(wv) { a.beginSheetModal(for: host, completionHandler: reply) } else { reply(a.runModal()) }
    }

    // MARK: Ações de menu
    // ⌘R e o zoom valem só para a aba Cátedra (WebView). Nas abas LEGIS/JURIS o
    // WebView está escondido — agir nele recarregava/zoomava algo invisível.
    @objc func reloadApp(_ s: Any?) { guard currentTab == 0 else { NSSound.beep(); return }; loadApp() }
    @objc func zoomIn(_ s: Any?) { guard currentTab == 0 else { return }; webView.magnification = min(webView.magnification + 0.1, 3.0) }
    @objc func zoomOut(_ s: Any?) { guard currentTab == 0 else { return }; webView.magnification = max(webView.magnification - 0.1, 0.5) }
    @objc func zoomReset(_ s: Any?) { guard currentTab == 0 else { return }; webView.magnification = 1.0 }

    func buildMenu() {
        let main = NSMenu()

        // Menu do app
        let appItem = NSMenuItem(); main.addItem(appItem)
        let appMenu = NSMenu(); appItem.submenu = appMenu
        appMenu.addItem(withTitle: "Sobre o Cátedra",
                        action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        let legisSettings = appMenu.addItem(withTitle: "Ajustes do CátedraLEGIS…",
                                            action: #selector(openLegisSettings(_:)), keyEquivalent: ",")
        legisSettings.target = self
        let jurisSettings = appMenu.addItem(withTitle: "Ajustes do CátedraJURIS…",
                                            action: #selector(openJurisSettings(_:)), keyEquivalent: ",")
        jurisSettings.keyEquivalentModifierMask = [.command, .option]
        jurisSettings.target = self
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Ocultar Cátedra", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        let ho = appMenu.addItem(withTitle: "Ocultar Outros",
                                 action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h")
        ho.keyEquivalentModifierMask = [.command, .option]
        appMenu.addItem(withTitle: "Mostrar Tudo", action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Encerrar Cátedra", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")

        // Editar (habilita ⌘C/⌘V/⌘A dentro do WebView via responder chain)
        let editItem = NSMenuItem(); main.addItem(editItem)
        let edit = NSMenu(title: "Editar"); editItem.submenu = edit
        edit.addItem(withTitle: "Desfazer", action: Selector(("undo:")), keyEquivalent: "z")
        let redo = edit.addItem(withTitle: "Refazer", action: Selector(("redo:")), keyEquivalent: "z")
        redo.keyEquivalentModifierMask = [.command, .shift]
        edit.addItem(.separator())
        edit.addItem(withTitle: "Recortar", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        edit.addItem(withTitle: "Copiar", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        edit.addItem(withTitle: "Colar", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        edit.addItem(withTitle: "Selecionar Tudo", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")

        // Visualizar
        let viewItem = NSMenuItem(); main.addItem(viewItem)
        let view = NSMenu(title: "Visualizar"); viewItem.submenu = view
        // Abas por teclado (⌘1/⌘2/⌘3)
        let t0 = view.addItem(withTitle: "Cátedra", action: #selector(goTab0(_:)), keyEquivalent: "1"); t0.target = self; t0.tag = 0
        let t1 = view.addItem(withTitle: "CátedraLEGIS", action: #selector(goTab1(_:)), keyEquivalent: "2"); t1.target = self; t1.tag = 1
        let t2 = view.addItem(withTitle: "CátedraJURIS", action: #selector(goTab2(_:)), keyEquivalent: "3"); t2.target = self; t2.tag = 2
        tabMenuItems.append(contentsOf: [t0, t1, t2]); updateTabMenuState()
        view.addItem(.separator())
        view.addItem(withTitle: "Recarregar", action: #selector(reloadApp(_:)), keyEquivalent: "r")
        view.addItem(.separator())
        view.addItem(withTitle: "Aumentar Zoom", action: #selector(zoomIn(_:)), keyEquivalent: "+")
        view.addItem(withTitle: "Diminuir Zoom", action: #selector(zoomOut(_:)), keyEquivalent: "-")
        view.addItem(withTitle: "Tamanho Real", action: #selector(zoomReset(_:)), keyEquivalent: "0")

        // Janela
        let winItem = NSMenuItem(); main.addItem(winItem)
        let win = NSMenu(title: "Janela"); winItem.submenu = win
        win.addItem(withTitle: "Minimizar", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        win.addItem(withTitle: "Zoom", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: "")

        NSApp.mainMenu = main
        NSApp.windowsMenu = win
    }
}

// Raiz SwiftUI do CátedraLEGIS (Vade Mecum de leis): injeta o AppStore no ambiente,
// aplica o acento do Cátedra como tint global (as cores por matéria seguem locais) e
// pede permissão de notificação ao aparecer. O modo claro/escuro é do próprio ContentView
// (via @AppStorage "appearance", que espelhamos do Cátedra em applyCatedraTheme).
struct CatedraLegisRoot: View {
    let store: AppStore

    var body: some View {
        ContentView()
            .environmentObject(store)
            .environmentObject(StudyClock.shared)
            .environment(\.colorScheme, ThemeState.t.isDark ? .dark : .light)
            .tint(ThemeState.t.accent)
            .task { Notifier.requestPermission() }
    }
}

// Raiz do CátedraJURIS: o RootView do Vade Mecum de jurisprudência (vendor/juris),
// com Observation (.environment, não .environmentObject). O tema segue o espelho
// do Cátedra via "jurisAppearance" (setado em applyCatedraTheme) + tint do acento.
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
                // load() só na 1ª vez (rebuild por mudança de tema não re-carrega).
                if store.entries.isEmpty { await store.load() }
                updater.pedirPermissaoNotificacao()
                await updater.verificacaoAutomatica(store: store)
            }
    }
}

// ===== "Widget" do Cátedra desenhado pelo próprio app (sem WidgetKit/assinatura) =====
// Os mesmos números do _widgetPayload() alimentam a barra de menu e este card, que
// o AppDelegate hospeda num NSPanel flutuante. Como é o app que desenha, funciona
// sob assinatura ad-hoc, nunca expira e não depende de conta Apple.
struct CatedraStats {
    var diasProva: Int = -1     // -1 = sem data de prova
    var revisoes: Int = 0
    var metaPct: Int = 0
    var streak: Int = 0
    var proximo: String = ""
}

final class WidgetModel: ObservableObject {
    static let shared = WidgetModel()
    @Published var stats = CatedraStats()
    var onTogglePiP: (() -> Void)?   // botão do cronômetro flutuante no widget
    var onClose: (() -> Void)?       // botão de ocultar o widget
}

private let panelNavy = Color(red: 0.12, green: 0.16, blue: 0.28)
private let panelAccent = Color(red: 0.20, green: 0.33, blue: 0.85)

struct WidgetCardView: View {
    @ObservedObject var model: WidgetModel
    private var s: CatedraStats { model.stats }
    private var diasStr: String { s.diasProva < 0 ? "—" : "\(s.diasProva)" }

    private func stat(_ value: String, _ label: String, tint: Color = .white) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(value).font(.system(size: 15, weight: .bold, design: .rounded)).foregroundStyle(tint)
            Text(label).font(.system(size: 9, weight: .medium)).foregroundStyle(.white.opacity(0.6))
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // cabeçalho: título + controles SEMPRE visíveis (cronômetro flutuante e fechar)
            HStack(spacing: 6) {
                Image(systemName: "graduationcap.fill").font(.system(size: 12)).foregroundStyle(.white.opacity(0.85))
                Text("Cátedra").font(.system(size: 12, weight: .semibold)).foregroundStyle(.white.opacity(0.85))
                Spacer(minLength: 0)
                Button { model.onTogglePiP?() } label: {
                    Image(systemName: "timer").font(.system(size: 13, weight: .semibold)).foregroundStyle(.white.opacity(0.82))
                }
                .buttonStyle(.plain).help("Mostrar/ocultar o cronômetro flutuante")
                Button { model.onClose?() } label: {
                    Image(systemName: "xmark").font(.system(size: 12, weight: .bold)).foregroundStyle(.white.opacity(0.72))
                }
                .buttonStyle(.plain).help("Ocultar o widget (reabra pela barra de menus 🎓)")
            }
            // corpo: duas colunas
            HStack(spacing: 14) {
                VStack(alignment: .leading, spacing: 2) {
                    Spacer(minLength: 0)
                    Text(diasStr).font(.system(size: 38, weight: .bold, design: .rounded)).foregroundStyle(.white)
                    Text(s.diasProva < 0 ? "sem data de prova" : "dias até a prova")
                        .font(.system(size: 10)).foregroundStyle(.white.opacity(0.6))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                VStack(alignment: .leading, spacing: 8) {
                    stat("\(s.revisoes)", "revisões", tint: s.revisoes > 0 ? Color(red: 1, green: 0.7, blue: 0.4) : .white)
                    stat("\(s.metaPct)%", "meta/sem")
                    stat(s.streak > 0 ? "🔥 \(s.streak)" : "0", "ofensiva")
                    if !s.proximo.isEmpty {
                        stat(s.proximo, "próximo", tint: .white.opacity(0.9))
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(14)
        .frame(width: 300, height: 150)
        .background(
            LinearGradient(colors: [panelNavy, panelAccent.opacity(0.55)],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)
let delegate = AppDelegate()
app.delegate = delegate
app.run()
