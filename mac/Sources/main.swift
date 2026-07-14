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
    try {
      return window.webkit.messageHandlers.catedraAI.postMessage(String(prompt || ''));
    } catch (e) {
      return Promise.reject(e);
    }
  };
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
    private var currentTab = 0                   // 0 = Cátedra, 1 = CátedraLEGIS

    // Menu bar extra (NSStatusItem): acesso rápido + relógio de estudo ao vivo.
    private var statusItem: NSStatusItem?
    private var statusClockItem: NSMenuItem?
    private var statusTimer: Timer?
    private var widgetTimer: Timer?
    // "Widget" desenhado pelo app (sem WidgetKit): painel flutuante + números no menu.
    private var widgetPanel: NSPanel?
    private var statItems: [NSMenuItem] = []
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
    func applicationWillTerminate(_ n: Notification) {
        flushLegisStudy()
        flushJurisStudy()
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
        [.flexibleSpace, AppDelegate.tabItemID, .flexibleSpace]
    }
    func toolbarAllowedItemIdentifiers(_ tb: NSToolbar) -> [NSToolbarItem.Identifier] {
        [.flexibleSpace, AppDelegate.tabItemID]
    }

    @objc private func tabChanged(_ sender: NSSegmentedControl) {
        switchTo(sender.selectedSegment)
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
        let a = NSMenuItem(title: "Cátedra", action: #selector(mbTab0(_:)), keyEquivalent: "1"); a.target = self; menu.addItem(a)
        let b = NSMenuItem(title: "CátedraLEGIS", action: #selector(mbTab1(_:)), keyEquivalent: "2"); b.target = self; menu.addItem(b)
        let c = NSMenuItem(title: "CátedraJURIS", action: #selector(mbTab2(_:)), keyEquivalent: "3"); c.target = self; menu.addItem(c)
        menu.addItem(.separator())
        let panelToggle = NSMenuItem(title: "Painel na área de trabalho", action: #selector(mbTogglePanel(_:)), keyEquivalent: "")
        panelToggle.target = self; menu.addItem(panelToggle); panelToggleItem = panelToggle
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
        // Ao SAIR do CátedraLEGIS/CátedraJURIS, fecha a rajada e coleta no Cátedra.
        if currentTab == 1 && tab != 1 { flushLegisStudy() }
        if currentTab == 2 && tab != 2 { flushJurisStudy() }
        StudyClock.shared.setTabActive(tab == 1)   // relógio do LEGIS: só na aba 1
        JurisClock.shared.setTabActive(tab == 2)   // relógio do JURIS: só na aba 2
        currentTab = tab
        tabControl?.selectedSegment = tab
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
            pushWidgetData()   // voltou ao Cátedra: atualiza o widget com os dados frescos
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
        webView.evaluateJavaScript("window.catedraOpenStudyRegistration && window.catedraOpenStudyRegistration(\(json))", completionHandler: nil)
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
        webView.evaluateJavaScript("window.catedraOpenStudyRegistration && window.catedraOpenStudyRegistration(\(json))", completionHandler: nil)
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

    // MARK: Roteamento das pontes JS → Swift
    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        let reply: (Any?, String?) -> Void = { v, e in DispatchQueue.main.async { replyHandler(v, e) } }
        switch message.name {
        case "catedraAI":        handleAI(message, reply)
        case "notifyPermission": handleNotifPermission(message, reply)
        case "notifyShow":       handleNotifShow(message.body); reply(nil, nil)
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

    private func handleAI(_ message: WKScriptMessage, _ reply: @escaping (Any?, String?) -> Void) {
        let prompt = (message.body as? String) ?? ""
        if let url = aiEndpoint() { postEndpoint(url, prompt, reply) }
        else if let key = geminiKey() { postGemini(key, prompt, reply) }
        else { reply(nil, "IA não configurada") }
    }

    private func postEndpoint(_ url: URL, _ prompt: String, _ reply: @escaping (Any?, String?) -> Void) {
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.timeoutInterval = 60
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
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
            center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
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
        child.setValue(false, forKey: "drawsBackground")

        let panel = NSPanel(contentRect: rect,
                            styleMask: [.titled, .closable, .utilityWindow, .nonactivatingPanel],
                            backing: .buffered, defer: false)
        panel.title = "Cátedra · Foco"
        panel.isFloatingPanel = true
        panel.level = .floating
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        panel.hidesOnDeactivate = false
        panel.isMovableByWindowBackground = true
        panel.backgroundColor = NSColor(srgbRed: 0x0d/255.0, green: 0x15/255.0, blue: 0x12/255.0, alpha: 1)
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
    @objc func reloadApp(_ s: Any?) { loadApp() }
    @objc func zoomIn(_ s: Any?) { webView.magnification = min(webView.magnification + 0.1, 3.0) }
    @objc func zoomOut(_ s: Any?) { webView.magnification = max(webView.magnification - 0.1, 0.5) }
    @objc func zoomReset(_ s: Any?) { webView.magnification = 1.0 }

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
        let t0 = view.addItem(withTitle: "Cátedra", action: #selector(goTab0(_:)), keyEquivalent: "1"); t0.target = self
        let t1 = view.addItem(withTitle: "CátedraLEGIS", action: #selector(goTab1(_:)), keyEquivalent: "2"); t1.target = self
        let t2 = view.addItem(withTitle: "CátedraJURIS", action: #selector(goTab2(_:)), keyEquivalent: "3"); t2.target = self
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
