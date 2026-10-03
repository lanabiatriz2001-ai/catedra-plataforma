// Cátedra para iOS (iPhone e iPad) — WKWebView carregando o mesmo bundle web do app do
// Mac (gerado por scripts/build-macos.mjs), com o CátedraLEGIS e o CátedraJURIS nativos
// (SwiftUI) ao lado, uma aba cada. Mesma arquitetura do mac/Sources/main.swift, com as
// diferenças que o iOS impõe:
//
//   · UIKit no lugar do AppKit (não existe NSAlert/NSWindow/NSWorkspace aqui).
//   · O .app do iOS é PLANO: o executável e o Info.plist ficam na raiz do bundle,
//     não em Contents/MacOS.
//   · O app é SANDBOXED de verdade: nada de ~/Documents da pessoa; o backup nativo do
//     Mac não tem equivalente direto (a nuvem do Supabase continua sendo o backup real).
//   · UM app universal: o mesmo binário instala no iPhone e no iPad. Toda adaptação de
//     tela liga pela CLASSE DE TAMANHO (traitCollection.horizontalSizeClass == .compact),
//     nunca pelo modelo do aparelho (userInterfaceIdiom): o iPad em Slide Over também é
//     compacto, e um iPhone grande em paisagem é regular. A barra do topo é a barra de
//     navegação DO SISTEMA (UINavigationBar standalone): o seletor de produto
//     (Cátedra | LEGIS | JURIS) é o titleView e a volta ao mapa de Processo e peças é um
//     botão de voltar de verdade — o UIKit cuida da altura (44/32 pt), da status bar, da
//     safe area, do Dynamic Type e do encurtamento do rótulo. A casca só entra com o tema.
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
import WidgetKit
import UserNotifications

// Endpoint da IA: Info.plist (CatedraAIEndpoint), com override por UserDefaults para
// poder trocar sem rebuild. Mesmo contrato do app do Mac.
func aiEndpoint() -> String {
    if let d = UserDefaults.standard.string(forKey: "CatedraAIEndpoint"), !d.isEmpty { return d }
    if let p = Bundle.main.object(forInfoDictionaryKey: "CatedraAIEndpoint") as? String, !p.isEmpty { return p }
    return ""
}

final class RootViewController: UIViewController, WKUIDelegate, WKNavigationDelegate, WKScriptMessageHandlerWithReply, WKDownloadDelegate, UIDocumentPickerDelegate, UNUserNotificationCenterDelegate, UINavigationBarDelegate {

    var webView: WKWebView!
    private var segmento: SeletorProduto!
    private var areaConteudo: UIView!
    private var legisVC: UIViewController?   // criados sob demanda, na 1ª vez que a aba abre
    private var jurisVC: UIViewController?
    // @Observable, sem .shared: a instância é guardada aqui, como o host do Mac faz.
    private var jurisStore: LibraryStore?
    private var pedindoPasseWidget = false
    /// Sobe a cada saída de conta: um pedido de passe que estava em voo quando a conta saiu não regrava passe.json.
    private var geracaoWidget = 0
    private var widgetExemploAtivo = false   // simulador com -widgetExemplo: o exemplo não é sobrescrito
    private var jurisUpdater: UpdateService?
    // ===== Paridade com o host do Mac (mac/Sources/main.swift) =====
    // O bundle web depende destas pontes; sem elas botões da web "não faziam nada" no iPad.
    var navBar: UINavigationBar!                       // barra do SISTEMA no topo (segue o tema do app)
    var itemTopo: UINavigationItem!                    // item da barra: o seletor de produto é o titleView
    var botaoAjustes: UIBarButtonItem!                 // engrenagem dos módulos nativos (LEGIS/JURIS)
    var corSobreAcento: UIColor?                       // --onAccent do tema: texto do segmento selecionado
    var corPilula: UIColor?                            // --accentSolid do tema: fundo da pílula selecionada (par do --onAccent)
    var abaAtual = 0                                   // última aba MONTADA (o segmento muda antes do montar)
    var nativeRevTimer: Timer?                         // agenda única: LEGIS/JURIS → Revisões do Cátedra
    var temaTimer: Timer?                              // a casca segue o tema do app (claro/escuro/acento)
    var temaPendenteNativo = false                     // tema mudou com o LEGIS/JURIS fora da tela: remontar ao voltar
    var legisReadsBaseline: Int?                       // readsToday no início da rajada do LEGIS
    var legisReviewsBaseline: Int?                     // reviewedToday no início da rajada
    var jurisLidosBaseline: Int?                       // lidosHoje (JURIS) no início da rajada
    var catalogoJSONCache: String?

    override func viewDidLoad() {
        // Gaveta do leitor do LEGIS: texto OFICIAL do verbete lido do acervo do JURIS.
        JurisPorArtigo.textoOficial = { [weak self] id in
            self?.jurisStore?.entries.first { $0.id == id }?.enunciado
        }
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        // LEGIS → JURIS: "abrir este verbete" (jurisprudência por artigo). Troca a aba e,
        // com o store montado, leva até o verbete.
        // Entrega 3: "Abrir no LEGIS" a partir do verbete — troca de aba; o ContentView do LEGIS
        // consome o pedido pendente (JurisPorArtigo.pedidoLegis).
        NotificationCenter.default.addObserver(forName: JurisPorArtigo.notificacaoAbrirLegis, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.selecionarAba(1) }
        }
        NotificationCenter.default.addObserver(forName: JurisPorArtigo.notificacaoAbrir, object: nil, queue: .main) { [weak self] n in
            MainActor.assumeIsolated {
                guard let self, let id = n.userInfo?["id"] as? String else { return }
                self.selecionarAba(2)
                self.abrirVerbeteQuandoCarregado(id)
            }
        }

        let cfg = WKWebViewConfiguration()
        let ucc = WKUserContentController()

        // Ponte de IA + notificações, no mundo .page (o app roda no mundo principal).
        for nome in ["catedraAI", "notifyPermission", "notifyShow", "catedraLembretes",
                     "catedraNav", "catedraPlano", "catedraPrint", "catedraAcervo", "catedraBackup",
                     "catedraArea", "catedraWidget"] {
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
        // Segurar o dedo num link abria a pré-visualização do Safari — e os botões do app são
        // <a href="#">. O gesto de "voltar" pela borda também não faz sentido numa página só.
        webView.allowsLinkPreview = false
        webView.allowsBackForwardNavigationGestures = false

        // ABAS NO TOPO, como no app do Mac: Cátedra | CátedraLEGIS | CátedraJURIS. No Mac isso
        // é a barra de abas do host AppKit; aqui é um UISegmentedControl no titleView de um
        // UINavigationBar do sistema, acima do conteúdo. A WebView não ocupa a tela inteira:
        // vive na área de conteúdo, trocada com as telas nativas do LEGIS e do JURIS. Os
        // títulos dos segmentos são decididos SÓ por reconstruirSegmentos(compacto:) — curtos
        // em largura compacta (iPhone, Slide Over), inteiros em regular.
        segmento = SeletorProduto(items: ["Cátedra", "CátedraLEGIS", "CátedraJURIS"])
        segmento.apportionsSegmentWidthsByContent = true
        // -abaLegis / -abaJuris abrem já na aba correspondente. Servem para verificar os
        // portes no simulador sem depender de alguém tocar na tela; em uso normal ninguém
        // passa esses argumentos.
        let args = ProcessInfo.processInfo.arguments
        #if targetEnvironment(simulator)
        // -semPortao (SÓ no simulador): pula o portão de login para inspecionar as telas sem conta.
        if args.contains("-semPortao") { for s in Self.scriptsSemPortao { ucc.addUserScript(s) } }
        #endif
        segmento.selectedSegmentIndex = args.contains("-abaJuris") ? 2
                                      : args.contains("-abaLegis") ? 1 : 0
        segmento.addTarget(self, action: #selector(trocarAba), for: .valueChanged)

        // Engrenagem dos módulos nativos. No Mac os Ajustes do LEGIS/JURIS abrem pelo menu da
        // barra (⌘, e ⌘⌥,); aqui não há menu, então ela mora na barra do topo e só aparece
        // neles — a engrenagem da barra lateral do JURIS também cai aqui (JurisHostBridge).
        // É um botão de 44×44 pt dentro do item (alvo de toque da casa), e não o item de
        // imagem do sistema, cujo quadro fica abaixo disso.
        let engrenagem = UIButton(type: .system)
        engrenagem.setImage(UIImage(systemName: "gearshape"), for: .normal)
        engrenagem.accessibilityLabel = "Ajustes do módulo"
        engrenagem.addTarget(self, action: #selector(abrirAjustesDoModulo), for: .touchUpInside)
        engrenagem.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([engrenagem.widthAnchor.constraint(equalToConstant: 44),
                                     engrenagem.heightAnchor.constraint(equalToConstant: 44)])
        botaoAjustes = UIBarButtonItem(customView: engrenagem)
        botaoAjustes.isHidden = true

        // A barra do topo é a do SISTEMA, standalone (fora de UINavigationController): presa à
        // safe area em cima, e o fundo cobre a status bar porque position(for:) devolve
        // .topAttached. Vai de borda a borda: a própria barra inseta o conteúdo pela safe
        // area lateral (paisagem do iPhone), então nada fica sob a Dynamic Island e o fundo
        // do tema chega até as bordas. A volta ao processo é o botão de voltar do sistema
        // (ver atualizarBotaoVoltarAcervo) — não há mais botão próprio nem hitTest à mão.
        itemTopo = UINavigationItem()
        itemTopo.titleView = segmento
        itemTopo.rightBarButtonItem = botaoAjustes
        navBar = UINavigationBar()
        navBar.translatesAutoresizingMaskIntoConstraints = false
        navBar.delegate = self
        navBar.setItems([itemTopo], animated: false)

        areaConteudo = UIView()
        areaConteudo.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(navBar)
        view.addSubview(areaConteudo)
        areaConteudo.addSubview(webView)

        NSLayoutConstraint.activate([
            navBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            navBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            navBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            areaConteudo.topAnchor.constraint(equalTo: navBar.bottomAnchor),
            // Até a ÁREA SEGURA, não até a borda: a barra inferior do modo celular e o fim de
            // toda lista ficavam por baixo do indicador home (env(safe-area-inset-bottom) é 0
            // sem viewport-fit=cover). A faixa que sobra é pintada com o fundo do tema.
            areaConteudo.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            areaConteudo.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            areaConteudo.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            webView.topAnchor.constraint(equalTo: areaConteudo.topAnchor),
            webView.bottomAnchor.constraint(equalTo: areaConteudo.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: areaConteudo.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: areaConteudo.trailingAnchor),
        ])

        // Títulos dos segmentos pela classe de tamanho: agora e a cada mudança (rotação do
        // iPhone, Slide Over / Split View no iPad). O botão de voltar segue a mesma regra.
        reconstruirSegmentos(compacto: ehCompacto)
        registerForTraitChanges([UITraitHorizontalSizeClass.self]) { (vc: Self, _: UITraitCollection) in
            vc.reconstruirSegmentos(compacto: vc.ehCompacto)
            vc.atualizarBotaoVoltarAcervo()
        }

        UNUserNotificationCenter.current().delegate = self   // aviso aparece com o app ABERTO; toque navega
        instalarCicloDeVida()          // relógios pausam fora do foco; segundo plano fecha a rajada
        instalarObservadoresNativos()  // check no LEGIS/JURIS → registro no Cátedra; engrenagem do JURIS
        setupLegisClock()
        setupJurisClock()
        startNativeReviewsSync()       // agenda única + plano de leitura + catálogo → web
        iniciarEspelhoDeTema()         // a casca (barra, fundo, status bar) acompanha o tema do app

        guard Bundle.main.url(forResource: "web", withExtension: nil) != nil else {
            mostrarErro("Bundle web não encontrado dentro do app.")
            return
        }
        carregarApp()
        instalarProvedorIA()   // IA dos módulos nativos passa pelo mesmo /api/complete do app
        trocarAba()   // aplica a aba inicial (normalmente Cátedra)
        #if targetEnvironment(simulator)
        // Só no simulador: -widgetExemplo grava o resumo de exemplo no grupo, para ver os widgets cheios sem conta.
        if ProcessInfo.processInfo.arguments.contains("-widgetExemplo"),
           let d = try? JSONEncoder().encode(WidgetResumo.exemplo(Date())) {
            widgetExemploAtivo = true
            WidgetGrupo.gravar(d, WidgetGrupo.resumo)
            WidgetCenter.shared.reloadAllTimelines()
        }
        #endif
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [weak self] in self?.gravarResumoWidget() }
    }

    /// Carrega (ou recarrega) o bundle web — também é a saída da tela branca quando o iPadOS
    /// mata o processo de conteúdo do WKWebView em segundo plano.
    func carregarApp() {
        guard let dir = Bundle.main.url(forResource: "web", withExtension: nil) else { return }
        webView.loadFileURL(dir.appendingPathComponent("index.html"), allowingReadAccessTo: dir)
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
        let mudou = juris != jurisDisponivel
        jurisDisponivel = juris
        guard mudou, segmento != nil else { return }
        reconstruirSegmentos(compacto: ehCompacto)
    }

    /// Largura compacta = iPhone em retrato (e quase todo iPhone em paisagem), iPad em Slide
    /// Over ou num terço do Split View. É a ÚNICA pergunta que a casca faz sobre o tamanho da
    /// tela — nunca "é iPhone?" (userInterfaceIdiom), que erraria no Slide Over.
    var ehCompacto: Bool { traitCollection.horizontalSizeClass == .compact }

    /// ÚNICA função que decide os títulos do seletor de produto: curtos em compacto
    /// ("Cátedra | LEGIS | JURIS" cabem em 320 pt), inteiros em regular; sem o terceiro quando
    /// a área de estudo não oferece jurisprudência. Preserva a aba selecionada — e, se a aba
    /// aberta era a que sumiu, volta ao Cátedra pela mesma trocarAba() de sempre.
    private func reconstruirSegmentos(compacto: Bool) {
        var titulos = compacto ? ["Cátedra", "LEGIS", "JURIS"]
                               : ["Cátedra", "CátedraLEGIS", "CátedraJURIS"]
        if !jurisDisponivel { titulos.removeLast() }
        let selecionada = max(0, segmento.selectedSegmentIndex)
        let iguais = segmento.numberOfSegments == titulos.count
            && titulos.indices.allSatisfy { segmento.titleForSegment(at: $0) == titulos[$0] }
        if !iguais {
            // removeAllSegments zera a seleção — por isso ela foi lida antes.
            segmento.removeAllSegments()
            for (i, t) in titulos.enumerated() { segmento.insertSegment(withTitle: t, at: i, animated: false) }
            segmento.apportionsSegmentWidthsByContent = true
            segmento.sizeToFit()            // o titleView é medido pelo quadro que ele tem
            navBar?.setNeedsLayout()
        }
        if selecionada < titulos.count {
            if segmento.selectedSegmentIndex != selecionada { segmento.selectedSegmentIndex = selecionada }
        } else {
            // quem estava DENTRO da aba que sumiu (JURIS retirado pela área) sai antes
            segmento.selectedSegmentIndex = 0
            trocarAba()
        }
    }

    private func montarAba(remontar: Bool) {
        let aba = segmento.selectedSegmentIndex
        // Ao SAIR do CátedraLEGIS/CátedraJURIS, fecha a rajada e coleta no Cátedra (como no Mac).
        if abaAtual == 1 && aba != 1 { flushLegisStudy() }
        if abaAtual == 2 && aba != 2 { flushJurisStudy() }
        StudyClock.shared.setTabActive(aba == 1)   // relógio do LEGIS: só na aba 1
        JurisClock.shared.setTabActive(aba == 2)   // relógio do JURIS: só na aba 2
        abaAtual = aba
        // Voltou ao Cátedra pela aba: a volta ao ponto do processo deixou de fazer sentido.
        if aba == 0 { AcervoEntrada.shared.limpar() }
        atualizarBotaoVoltarAcervo()
        // O tema pode ter mudado enquanto os módulos estavam fora da tela (o espelho de 2 s
        // consumiu a diferença): eles ainda precisam nascer de novo com as cores novas.
        if remontar || temaPendenteNativo {
            // Tema novo: o SwiftUI leu as cores no build, então a tela precisa nascer de novo.
            if let v = legisVC { v.willMove(toParent: nil); v.view.removeFromSuperview(); v.removeFromParent(); legisVC = nil }
            if let v = jurisVC { v.willMove(toParent: nil); v.view.removeFromSuperview(); v.removeFromParent(); jurisVC = nil }
            temaPendenteNativo = false
        }
        if aba == 1 && legisVC == nil {
            legisVC = encaixar(UIHostingController(rootView: CatedraLegisRoot(store: AppStore.shared)))
            refreshEditalDisciplinas()   // matérias do edital → vínculo da checklist do LEGIS
        }
        if aba == 2 && jurisVC == nil {
            let st = jurisStore ?? LibraryStore(); jurisStore = st
            let up = jurisUpdater ?? UpdateService(); jurisUpdater = up
            jurisVC = encaixar(UIHostingController(rootView: CatedraJurisRoot(store: st, updater: up)))
            refreshEditalDisciplinasJuris()
        }
        webView.isHidden  = (aba != 0)
        legisVC?.view.isHidden = (aba != 1)
        jurisVC?.view.isHidden = (aba != 2)
        botaoAjustes?.isHidden = (aba == 0)
        switch aba {
        case 1: if let v = legisVC?.view { areaConteudo.bringSubviewToFront(v) }
        case 2: if let v = jurisVC?.view { areaConteudo.bringSubviewToFront(v) }
        default:
            areaConteudo.bringSubviewToFront(webView)
            pushNativeReviews()   // voltou ao Cátedra: agenda única e plano com os dados frescos
        }
    }

    /// O store do JURIS pode ainda não existir (aba nunca aberta) ou estar carregando o acervo
    /// (35 MB de JSON): abrirVerbete devolve em silêncio se o id não está indexado. Na primeira
    /// vez o "abrir este verbete" do LEGIS caía no vazio — aqui ele espera o acervo chegar.
    func abrirVerbeteQuandoCarregado(_ id: String, tentativa: Int = 0) {
        if jurisStore == nil { jurisStore = LibraryStore() }
        guard let store = jurisStore else { return }
        if !store.entries.isEmpty { store.abrirVerbete(id); return }
        guard tentativa < 60 else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.abrirVerbeteQuandoCarregado(id, tentativa: tentativa + 1)
        }
    }

    // ===== Widgets (WidgetKit): resumo e passe no grupo de apps; links catedra:// =====
    // Espelho do host do Mac (mac/Sources/main.swift); a duplicação é aceita (Ruling R3 do plano dos widgets).
    /// Lê o resumo do app web e grava no grupo de apps; garante o passe da nuvem; pede ao sistema para redesenhar os
    /// widgets. Com o portão de login à mostra ("nenhuma"), não mexe no que o widget tem.
    func gravarResumoWidget(_ feito: (() -> Void)? = nil) {
        guard !widgetExemploAtivo, let wv = webView else { feito?(); return }
        wv.evaluateJavaScript("(window.catedraWidgetResumo && JSON.stringify(window.catedraWidgetResumo())) || ''") { [weak self] result, _ in
            defer { feito?() }
            guard let self, let s = result as? String, !s.isEmpty, let dados = s.data(using: .utf8),
                  let r = WidgetResumo.ler(dados), r.sessao != "nenhuma" else { return }
            if r.sessao == "conta" { self.garantirPasseWidget(conta: r.conta) }
            else { WidgetGrupo.apagar(WidgetGrupo.passe); WidgetGrupo.apagar(WidgetGrupo.resumoNuvem) }
            // resumo igual ao já gravado: nada a regravar nem a redesenhar (o orçamento de recargas do iOS é curto)
            if WidgetGrupo.ler(WidgetGrupo.resumo) == dados { return }
            WidgetGrupo.gravar(dados, WidgetGrupo.resumo)
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
    /// Indo para o fundo: o iOS dá alguns segundos; a gravação pede esse tempo e devolve ao terminar.
    func gravarResumoWidgetNoFundo() {
        var tarefa = UIBackgroundTaskIdentifier.invalid
        let fim = { if tarefa != .invalid { UIApplication.shared.endBackgroundTask(tarefa); tarefa = .invalid } }
        tarefa = UIApplication.shared.beginBackgroundTask(withName: "widget-resumo") { fim() }
        gravarResumoWidget { fim() }
    }
    /// Passe de leitura da nuvem para este aparelho: pede à web quando falta, quando é de outra conta ou quando o
    /// widget marcou que a nuvem o recusou.
    func garantirPasseWidget(conta: String) {
        if WidgetGrupo.existe(WidgetGrupo.passeInvalido) {
            WidgetGrupo.apagar(WidgetGrupo.passe); WidgetGrupo.apagar(WidgetGrupo.passeInvalido)
        }
        if let d = WidgetGrupo.ler(WidgetGrupo.passe), let p = try? JSONDecoder().decode(WidgetPasse.self, from: d), p.conta == conta { return }
        guard !pedindoPasseWidget, let wv = webView else { return }
        pedindoPasseWidget = true
        let geracao = geracaoWidget
        wv.callAsyncJavaScript("return window.catedraWidgetPasse ? await window.catedraWidgetPasse(aparelho) : null",
                               arguments: ["aparelho": UIDevice.current.name], in: nil, in: .page) { [weak self] res in
            guard let self else { return }
            self.pedindoPasseWidget = false
            guard self.geracaoWidget == geracao else { return }   // a conta saiu com o pedido em voo
            guard case .success(let v) = res, let s = v as? String, let d = s.data(using: .utf8),
                  let p = try? JSONDecoder().decode(WidgetPasse.self, from: d), !p.passe.isEmpty, p.conta == conta else { return }
            WidgetGrupo.gravar(d, WidgetGrupo.passe)
            WidgetGrupo.apagar(WidgetGrupo.resumoNuvem)   // o cache da nuvem era do passe/conta anterior
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
    /// A conta saiu (auth.js manda {saiu:true} antes do reload): o widget esquece resumo e passe.
    func apagarWidgetAoSair() {
        geracaoWidget += 1
        for n in [WidgetGrupo.resumo, WidgetGrupo.resumoNuvem, WidgetGrupo.passe, WidgetGrupo.passeInvalido] { WidgetGrupo.apagar(n) }
        WidgetCenter.shared.reloadAllTimelines()
    }
    /// catedra:// (toque no widget), a quente pelo SceneDelegate e a frio pelas urlContexts da conexão.
    /// diploma/artigo/id vêm do link (dado de fora): vão só para o Swift, nunca para texto de JavaScript.
    func abrirLinkWidget(_ url: URL) {
        guard let d = WidgetLinks.destino(url) else { return }
        switch d {
        case .tela(let v): selecionarAba(0); irParaTelaWeb(v)
        case .entrar: selecionarAba(0)
        case .legis(let diploma, let artigo): JurisPorArtigo.abrirNoLegis(ArtigoCitado(diploma: diploma, artigo: artigo))
        case .juris(let id):
            guard jurisDisponivel else { selecionarAba(0); return }
            JurisPorArtigo.abrirNoJuris(id)   // o observador do viewDidLoad troca a aba e espera o acervo carregar
        }
    }
    /// A página pode estar carregando (abertura a frio): tenta até ela expor __catedraGoView (trava de área incluída).
    func irParaTelaWeb(_ v: String, tentativa: Int = 0) {
        // o id da tela vem do link (dado de fora): vai como ARGUMENTO, nunca colado no texto do JavaScript
        guard let wv = webView else { return }
        wv.callAsyncJavaScript("if (typeof window.__catedraGoView !== 'function') return false; window.__catedraGoView(v); return true",
                               arguments: ["v": v], in: nil, in: .page) { [weak self] res in
            if case .success(let r) = res, (r as? Bool) == true { return }
            if tentativa >= 40 { return }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { self?.irParaTelaWeb(v, tentativa: tentativa + 1) }
        }
    }

    /// Troca de aba por código (pontes da web, notificações, volta ao processo).
    func selecionarAba(_ i: Int) {
        guard i >= 0, i < segmento.numberOfSegments else { return }
        segmento.selectedSegmentIndex = i
        trocarAba()
    }

    // ===== PONTE DE TEMA: Cátedra (CSS vars) → ThemeState dos módulos nativos =====
    // Espelho do que o host do Mac faz. O app escreve o tema inteiro como custom
    // properties num elemento com --accent; aqui lemos as computadas e traduzimos.
    private var ultimoTema: String = ""

    private func espelharTema(_ done: @escaping (Bool) -> Void) {
        let js = """
        (function(){
          // Nó dos tokens pelo que ele É, não pelo texto do atributo style. O div raiz
          // carrega data-dark + data-dir + as variáveis; casar `[style*="--accent"]`
          // dependia de ele ser o PRIMEIRO em ordem de documento — verdade hoje só porque
          // é ancestral de todos. Qualquer nó com --accent no style fora dele quebrava a
          // leitura do tema, e o sintoma seria o texto sumido do LEGIS de novo. O seletor
          // antigo fica de queda, para host antigo/DOM inesperado.
          var el = document.querySelector('[data-dark][data-dir]')
                || document.querySelector('[style*="--accent"]') || document.documentElement;
          var s = getComputedStyle(el);
          function g(n){ return (s.getPropertyValue(n)||'').trim(); }
          // CLARO/ESCURO PELA MESMA FONTE DAS CORES. Antes vinha de localStorage
          // ('catedra:dark'), que pode divergir do que está PINTADO na tela — a nuvem
          // sincroniza essa chave e sobrescreve sem repintar. Quando divergia, o LEGIS
          // recebia isDark=true junto com os tokens CLAROS: superfícies brancas e
          // Color.primary branco. Título e referência de cada norma sumiam — texto
          // branco no cartão branco. A luminância do --bg que está valendo agora não
          // tem como discordar das cores que vêm com ela.
          function _lum(v){
            v=(v||'').trim(); var r,gg,b, h;
            if(v.charAt(0)==='#'){
              h=v.slice(1);
              if(h.length===3) h=h.charAt(0)+h.charAt(0)+h.charAt(1)+h.charAt(1)+h.charAt(2)+h.charAt(2);
              if(h.length<6) return null;
              r=parseInt(h.substr(0,2),16); gg=parseInt(h.substr(2,2),16); b=parseInt(h.substr(4,2),16);
            } else if(v.indexOf('rgb')===0){
              var p=v.slice(v.indexOf('(')+1).split(')')[0].replace(/,/g,' ').replace(/[/]/g,' ').split(' ').filter(Boolean);
              r=parseFloat(p[0]); gg=parseFloat(p[1]); b=parseFloat(p[2]);
            } else return null;
            if(isNaN(r)||isNaN(gg)||isNaN(b)) return null;
            if(p && p.length>3 && parseFloat(p[3])===0) return null;   // transparente não diz nada
            return (0.2126*r + 0.7152*gg + 0.0722*b)/255;
          }
          function _dk(){
            // Cai para o fundo REALMENTE pintado antes de cogitar o localStorage: o
            // navegador resolve backgroundColor sempre em rgb(), então isto sobrevive a
            // uma mudança no seletor dos tokens. O localStorage é o ÚLTIMO recurso de
            // propósito — é a fonte que mente (o auth.js sincroniza 'catedra:dark' e
            // escreve direto, sem o app repintar), e foi ela que sumiu com o texto.
            var L=_lum(g('--bg'));
            if(L===null) L=_lum(g('--surface'));
            if(L===null){ try{ L=_lum(getComputedStyle(el).backgroundColor); }catch(_){} }
            if(L===null){ try{ L=_lum(getComputedStyle(document.body).backgroundColor); }catch(_){} }
            if(L!==null && L===L) return L<0.5 ? '1' : '0';
            return localStorage.getItem('catedra:dark')||'';
          }
          return JSON.stringify({
            bg:g('--bg'), surface:g('--surface'), surface2:g('--surface2'), border:g('--border'),
            ink:g('--ink'), text2:g('--text2'), text3:g('--text3'),
            accent:g('--accent'), accentD:g('--accentD'),
            accentSoft:g('--accentSoft'), accentRing:g('--accentRing'), onAccent:g('--onAccent'),
            // o PAR que pinta texto sobre o destaque: --accentSolid (fundo) + --onAccent (texto),
            // calculado no app para dar 4,5:1; o --accent cru segue como identidade (tint)
            accentSolid:g('--accentSolid'),
            ok:g('--ok'), warn:g('--warn'), danger:g('--danger'),
            radius:g('--radius'), display:g('--display'), body:g('--body'), mono:g('--mono'),
            sbg:g('--sbg'), stext:g('--stext'), sactbg:g('--sactbg'), sacttext:g('--sacttext'),
            heroGrad:g('--heroGrad'), dark:_dk(),
            // Baixa estimulação (P16): a preferência mora em prefs, não em CSS var. Vai no
            // MESMO JSON de propósito — a chave de "tema mudou" é o JSON inteiro, então
            // ligar o interruptor reconstrói os hosts do LEGIS/JURIS como uma troca de tema.
            // Mesma lógica do claro/escuro: vale o que está PINTADO (data-baixa na div raiz,
            // espelhado no <html> por _baixaRaiz). O localStorage é só a queda para host
            // antigo sem o atributo — é a fonte que a nuvem reescreve sem repintar.
            baixa:(function(){
              var a = el.getAttribute('data-baixa');
              if (a === null) a = document.documentElement.getAttribute('data-baixa');
              if (a !== null) return a === '1';
              try { return JSON.parse(localStorage.getItem('catedra:prefs')||'{}').baixaEstimulacao===true } catch(e){ return false }
            })()
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
        if let h = (d["surface"] as? String).flatMap(Color.hexDe(css:)) { t.surfaceHex = h }
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
            if let fam = DS.familiaDisplay(css: disp) { t.displayFamilia = fam }
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
        // Baixa estimulação: some gamificação e desliga animação nos módulos nativos.
        t.baixaEstimulacao = (d["baixa"] as? Bool) ?? false
        // Texto sobre o acento (--onAccent): a struct do tema não tem esse campo, então a
        // casca guarda aqui para o segmento selecionado; vazio → o contraste decide.
        corSobreAcento = col("onAccent").map { UIColor($0) }
        // O fundo da pílula é o --accentSolid, o mesmo dos botões do app: o --onAccent foi
        // medido contra ELE. Pintar a pílula com o --accent cru (Aurora, Solar, Holo, #0d9488,
        // #d6457f) deixava o texto abaixo de 4,5:1. App antigo sem o token → volta ao --accent.
        corPilula = col("accentSolid").map { UIColor($0) }
        ThemeState.t = t
        // As duas chaves existem porque LEGIS e JURIS guardam o modo com vocabulários
        // diferentes ("light"/"dark" e "claro"/"escuro"); trocá-las colidiria.
        UserDefaults.standard.set(t.isDark ? "dark" : "light", forKey: "appearance")
        UserDefaults.standard.set(t.isDark ? "escuro" : "claro", forKey: "jurisAppearance")
        // O JSON traz também `baixa` (baixa estimulação): mudar só o interruptor já conta
        // como tema novo e remonta os hosts, que leem ThemeState.t no build.
        let mudou = (json != ultimoTema)
        ultimoTema = json
        if mudou { aplicarAparenciaHost() }
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
        apresentarSobreOTopo(a)
    }

    /// Alertas do JS (alert/confirm/prompt) sobem sobre o que estiver na tela. Apresentar no
    /// controlador raiz com outro modal aberto falha EM SILÊNCIO — e o JS fica preso à espera
    /// do confirm(): era o que travava "Restaurar backup" logo depois de escolher o arquivo
    /// (o seletor ainda estava sendo dispensado). Se o modal de cima está saindo ou é outro
    /// alerta, espera a vez.
    func apresentarSobreOTopo(_ vc: UIViewController, tentativa: Int = 0) {
        var topo: UIViewController = self
        while let p = topo.presentedViewController { topo = p }
        let ocupado = topo.isBeingDismissed || topo.isBeingPresented || (topo !== self && topo is UIAlertController)
        if ocupado, tentativa < 40 {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
                self?.apresentarSobreOTopo(vc, tentativa: tentativa + 1)
            }
            return
        }
        topo.present(vc, animated: !ThemeState.t.baixaEstimulacao)
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
      function satelitePodeAbrirAcervo(e) {
        if (!e || !e.source) return false;
        // A revisão do app pede o acervo à própria janela (e.source === window).
        if (e.source === window) return true;
        var frames = document.querySelectorAll('iframe[data-ct-view][data-ct-frame]');
        for (var i = 0; i < frames.length; i++) {
          if (frames[i].contentWindow !== e.source) continue;
          var view = frames[i].getAttribute('data-ct-view') || '';
          var src = frames[i].getAttribute('src') || '';
          if (src.indexOf('http:') === 0 || src.indexOf('https:') === 0 || src.indexOf('//') === 0) return false;
          var arquivo = src.split('?')[0].split('#')[0];
          arquivo = arquivo.slice(arquivo.lastIndexOf('/') + 1);
          if (view === 'areamod' && arquivo !== 'ritos-web.html') return false;
          if (view === 'roteiros' && arquivo !== 'pecas-web.html') return false;
          if (view === 'prioridade' && arquivo !== 'prioridade-web.html') return false;
          if (view === 'segundafase' && arquivo !== 'segunda-fase-web.html') return false;
          if (view === 'legis' && arquivo !== 'legis-web.html') return false;
          return view === 'areamod' || view === 'roteiros' || view === 'prioridade'
            || view === 'segundafase' || view === 'legis';
        }
        return false;
      }
      // Contrato da volta: a origem ('de', ou 'origem' no formato antigo) leva a view do host
      // de onde a pessoa saiu, e a casca a devolve inteira em window.catedraVoltarAcervo.
      // Só a mensagem do próprio host (e.source === window) repassa o 'de' que trouxe. A de um
      // frame NUNCA passa crua: frame legis/juris -> a origem que o host guardou ao entrar no
      // acervo (window.__catedraOrigemAcervo); demais frames -> a régua do host para mensagem de
      // satélite (window.__catedraOrigemDoFrame, a mesma _normalizarDe da web), com a view do
      // data-ct-view do iframe que falou. Frame desconhecido ou régua ausente -> null (sem volta).
      function origemComView(e) {
        var d = e.data.de, o = e.data.origem;
        var de = (d && typeof d === 'object') ? d : ((o && typeof o === 'object') ? o : null);
        if (e.source === window) return (de && !Array.isArray(de)) ? de : null;
        var fs = document.querySelectorAll('iframe[data-ct-view][data-ct-frame]');
        for (var j = 0; j < fs.length; j++) {
          if (fs[j].contentWindow !== e.source) continue;
          var fv = fs[j].getAttribute('data-ct-view') || '';
          var r = null;
          try {
            if (fv === 'legis' || fv === 'juris') {
              r = (typeof window.__catedraOrigemAcervo === 'function') ? window.__catedraOrigemAcervo() : null;
            } else if (typeof window.__catedraOrigemDoFrame === 'function') {
              r = window.__catedraOrigemDoFrame(de, fv);
            }
          } catch (err) { r = null; }
          return (r && typeof r === 'object' && !Array.isArray(r)) ? r : null;
        }
        return null;
      }
      window.addEventListener('message', function (e) {
        try {
          if (!e || !e.data || e.data.type !== 'ctAbrirAcervo') return;
          if (!satelitePodeAbrirAcervo(e)) return;
          // Item 5: o termo e o ponto de origem viajam junto (antes ia só a aba).
          window.webkit.messageHandlers.catedraAcervo.postMessage({
            alvo: String(e.data.alvo || ''), termo: String(e.data.termo || ''),
            de: origemComView(e)
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
        if let url = action.request.url, let scheme = url.scheme?.lowercased() {
            if (scheme == "http" || scheme == "https"), action.navigationType == .linkActivated {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            // mailto:, tel:, sms:… não abrem dentro do WKWebView (o toque morria em silêncio):
            // vão para o app do sistema, como no Safari.
            if !["http", "https", "file", "about", "blob", "data", "javascript"].contains(scheme) {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
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

    private func mensagemDaPaginaLocal(_ message: WKScriptMessage) -> Bool {
        guard message.frameInfo.isMainFrame,
              let origem = message.frameInfo.request.url,
              origem.isFileURL,
              let raizWeb = Bundle.main.url(forResource: "web", withExtension: nil)
        else { return false }
        let raiz = raizWeb.standardizedFileURL.path
        let caminho = origem.standardizedFileURL.path
        return caminho == raiz || caminho.hasPrefix(raiz + "/")
    }

    func userContentController(_ ucc: WKUserContentController,
                               didReceive message: WKScriptMessage,
                               replyHandler respostaBruta: @escaping (Any?, String?) -> Void) {
        // As permissões e a IA respondem de threads de fundo; a resposta ao JS é da main.
        let replyHandler: (Any?, String?) -> Void = { v, e in DispatchQueue.main.async { respostaBruta(v, e) } }
        guard mensagemDaPaginaLocal(message) else {
            replyHandler(nil, "origem não autorizada")
            return
        }
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
        case "catedraNav":
            // "Abrir CátedraLEGIS/JURIS" e o "Abrir" das revisões nativas: String ou
            // dicionário {alvo, termo, de}, como no Mac.
            let corpo = message.body
            DispatchQueue.main.async { self.navegarPara(corpo) }
            replyHandler(nil, nil)
        case "catedraAcervo":    abrirAcervoNativo(message); replyHandler(nil, nil)
        case "catedraPlano":
            // Checkbox de uma leitura da tabela-dia (key "di_li_dyi") no ciclo semanal da web.
            // A web NÃO grava quando a ponte existe — se o host não fizer, o check nunca marca.
            let k = (message.body as? String) ?? ""
            DispatchQueue.main.async { self.togglePlanoLeitura(k) }
            replyHandler(nil, nil)
        case "catedraPrint":
            // Relatório → Imprimir/Salvar PDF: window.print() é mudo no WKWebView.
            DispatchQueue.main.async { self.exportarPDF() }
            replyHandler(nil, nil)
        case "catedraWidget":
            // {saiu:true} = a conta saiu (auth.js, antes do reload): o widget esquece passe e resumo.
            // Outro corpo = o payload/resumo mudou: a casca relê o tema e o widget é regravado.
            let saiu = ((message.body as? [String: Any])?["saiu"] as? Bool) ?? false
            DispatchQueue.main.async {
                if saiu { self.apagarWidgetAoSair(); return }
                self.espelharTema { [weak self] mudou in if mudou { self?.temaPendenteNativo = true } }
                self.gravarResumoWidget()
            }
            replyHandler(nil, nil)
        case "catedraBackup":    handleBackup(message, replyHandler)
        default:                 replyHandler(nil, nil)
        }
    }

    /// O mapa de Processo e peças pediu um instituto no acervo. No iPad temos as abas
    /// NATIVAS ao lado — abrir o LEGIS/JURIS web dentro da aba Cátedra deixaria duas
    /// portas para o mesmo acervo. Então a mensagem troca de aba em vez de trocar a
    /// página. (O termo ainda não vai para dentro da busca nativa; isso pede um ponto de
    /// entrada no módulo, e sem ele eu abriria a aba fingindo que buscou.)
    private func abrirAcervoNativo(_ message: WKScriptMessage) {
        let corpo = message.body as? [String: Any] ?? [:]
        let alvo = (corpo["alvo"] as? String) ?? ""
        let termo = (corpo["termo"] as? String) ?? ""
        let origem = AcervoEntrada.origem(de: corpo["de"] as? [String: Any])
        DispatchQueue.main.async { self.irParaAcervo(alvo: alvo, termo: termo, origem: origem) }
    }

    /// A volta ao ponto do processo é o botão de VOLTAR do sistema: com origem viva, um item
    /// com o rótulo dela entra por baixo do item do topo e o UIKit desenha o chevron com o
    /// rótulo (encurtado quando não cabe); sem origem, a pilha volta a ter só o item do topo.
    /// Em largura compacta o rótulo é omitido (só o chevron) para o seletor de produto não
    /// ser espremido; o VoiceOver continua lendo o rótulo inteiro, que é o título do item.
    func atualizarBotaoVoltarAcervo() {
        guard navBar != nil else { return }
        let temOrigem = AcervoEntrada.shared.origem != nil && segmento.selectedSegmentIndex != 0
        if temOrigem, let o = AcervoEntrada.shared.origem {
            let origem = UINavigationItem(title: o.rotulo)
            origem.backButtonDisplayMode = ehCompacto ? .minimal : .default
            navBar.setItems([origem, itemTopo], animated: false)
        } else if (navBar.items?.count ?? 0) != 1 {
            navBar.setItems([itemTopo], animated: false)
        }
    }

    // MARK: - UINavigationBarDelegate

    /// O fundo da barra se estende para cima e cobre a status bar com a cor do tema.
    func position(for bar: UIBarPositioning) -> UIBarPosition { .topAttached }

    /// O toque no botão de voltar do sistema NÃO desempilha a barra (a pilha é montada por
    /// atualizarBotaoVoltarAcervo): ele devolve a pessoa ao ponto do processo, no app web.
    /// Fora do ciclo do toque, para o UIKit terminar de tratar o botão antes da troca.
    func navigationBar(_ navigationBar: UINavigationBar, shouldPop item: UINavigationItem) -> Bool {
        DispatchQueue.main.async { [weak self] in self?.voltarAoProcesso() }
        return false
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
        apresentarSobreOTopo(a)
    }

    func webView(_ w: WKWebView, runJavaScriptConfirmPanelWithMessage m: String,
                 initiatedByFrame f: WKFrameInfo, completionHandler done: @escaping (Bool) -> Void) {
        let a = UIAlertController(title: "Cátedra", message: m, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "Cancelar", style: .cancel) { _ in done(false) })
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in done(true) })
        apresentarSobreOTopo(a)
    }

    func webView(_ w: WKWebView, runJavaScriptTextInputPanelWithPrompt m: String, defaultText d: String?,
                 initiatedByFrame f: WKFrameInfo, completionHandler done: @escaping (String?) -> Void) {
        let a = UIAlertController(title: "Cátedra", message: m, preferredStyle: .alert)
        a.addTextField { $0.text = d }
        a.addAction(UIAlertAction(title: "Cancelar", style: .cancel) { _ in done(nil) })
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in done(a.textFields?.first?.text) })
        apresentarSobreOTopo(a)
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

// MARK: - Paridade com o host do Mac
// O bundle web é o MESMO do Mac e conversa com a casca por pontes. No iPad várias delas eram
// registradas e caíam no vazio: "Abrir CátedraLEGIS" não abria nada, o check do plano de
// leitura nunca marcava, "Salvar PDF" não fazia nada, o tempo estudado no LEGIS/JURIS não
// virava sessão no Cátedra, a agenda única de revisões ficava vazia. Tudo abaixo espelha
// mac/Sources/main.swift, adaptado ao UIKit.
extension RootViewController {

    // ===== Ciclo de vida do app =====
    // Os relógios de estudo pausam quando o app perde o foco. Em segundo plano o iPadOS pode
    // encerrar o app sem avisar: a rajada é fechada AGORA e guardada em disco; o registro
    // chega ao Cátedra na volta (ou na próxima abertura).
    func instalarCicloDeVida() {
        let nc = NotificationCenter.default
        nc.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated {
                StudyClock.shared.setAppActive(true)
                JurisClock.shared.setAppActive(true)
                guard let self else { return }
                self.entregarEstudosPendentesSePossivel()
                self.pushNativeReviews()
                self.gravarResumoWidget()
            }
        }
        nc.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) { _ in
            MainActor.assumeIsolated {
                StudyClock.shared.setAppActive(false)
                JurisClock.shared.setAppActive(false)
            }
        }
        nc.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.flushLegisStudy(); self?.flushJurisStudy(); self?.gravarResumoWidgetNoFundo() }
        }
        nc.addObserver(forName: UIApplication.willTerminateNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.flushLegisStudy(); self?.flushJurisStudy() }
        }
    }

    // Check de leitura nos apps NATIVOS (plano do LEGIS/JURIS) → volta para a aba Cátedra e
    // abre o registro de atividades. A troca de aba já dispara o flush do cronômetro (se
    // houve ≥ 1 min de estudo, o registro abre com o TEMPO real rateado); senão abrimos com o
    // prefill da leitura marcada — a chamada é "auto": nunca atropela um modal aberto.
    func instalarObservadoresNativos() {
        let nc = NotificationCenter.default
        nc.addObserver(forName: Notification.Name("catedraPlanoLegisMarcado"), object: nil, queue: .main) { [weak self] n in
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
        nc.addObserver(forName: Notification.Name("catedraPlanoJurisMarcado"), object: nil, queue: .main) { [weak self] n in
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
        // Item do checklist de leitura (LEGIS/JURIS) marcado como feito → marca a tarefa
        // correspondente do ciclo de estudos como concluída no Cátedra.
        nc.addObserver(forName: ChecklistSyncBridge.itemDone, object: nil, queue: .main) { [weak self] note in
            MainActor.assumeIsolated { self?.markCycleTaskDone(note.userInfo) }
        }
        // Engrenagem da barra lateral do JURIS (o embed não tem cena Settings).
        nc.addObserver(forName: JurisHostBridge.openSettings, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.abrirAjustes(aba: 2) }
        }
    }

    // ===== Ajustes dos módulos nativos =====
    @objc func abrirAjustesDoModulo() { abrirAjustes(aba: segmento.selectedSegmentIndex) }

    func abrirAjustes(aba: Int) {
        guard presentedViewController == nil else { return }
        let acento = ThemeState.t.accent
        let host: UIViewController
        if aba == 2 {
            // Garante store/updater mesmo se a aba nunca foi aberta nesta sessão.
            let store = jurisStore ?? LibraryStore()
            let updater = jurisUpdater ?? UpdateService()
            jurisStore = store; jurisUpdater = updater
            host = UIHostingController(rootView: AjustesEmbrulho(titulo: "Ajustes — CátedraJURIS", fechar: { [weak self] in self?.dismiss(animated: true) }) {
                JurisSettingsView().environment(store).environment(updater)
            }.tint(acento))
        } else if aba == 1 {
            host = UIHostingController(rootView: AjustesEmbrulho(titulo: "Ajustes — CátedraLEGIS", fechar: { [weak self] in self?.dismiss(animated: true) }) {
                SettingsView().environmentObject(AppStore.shared)
            }.tint(acento))
        } else { return }
        host.overrideUserInterfaceStyle = ThemeState.t.isDark ? .dark : .light
        host.modalPresentationStyle = .formSheet
        present(host, animated: !ThemeState.t.baixaEstimulacao)
    }

    // ===== Navegação pedida pela web =====
    /// `catedraNav`: "Abrir CátedraLEGIS/JURIS" do Cátedra e o "Abrir" das revisões nativas.
    /// String ("legis"/"juris") ou dicionário {alvo, termo, de} — os dois formatos do Mac.
    func navegarPara(_ corpo: Any?) {
        var alvo = "", termo = ""
        var origem: AcervoEntrada.Origem?
        if let str = corpo as? String {
            alvo = str
        } else if let d = corpo as? [String: Any] {
            alvo = (d["alvo"] as? String) ?? ""
            termo = (d["termo"] as? String) ?? ""
            origem = AcervoEntrada.origem(de: d["de"] as? [String: Any])
        }
        irParaAcervo(alvo: alvo, termo: termo, origem: origem)
    }

    /// Troca para a aba nativa pedida, levando o termo (JURIS busca direto) e o ponto de
    /// origem para a volta (o botão de voltar do sistema, com o rótulo da origem).
    func irParaAcervo(alvo: String, termo: String, origem: AcervoEntrada.Origem?) {
        guard alvo == "legis" || alvo == "juris" else { return }
        if alvo == "juris" && !jurisDisponivel { return }   // a área não oferece jurisprudência
        AcervoEntrada.shared.chegou(termo: termo, origem: origem)
        selecionarAba(alvo == "juris" ? 2 : 1)
        atualizarBotaoVoltarAcervo()
        if alvo == "juris", !termo.isEmpty {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
                guard let store = self?.jurisStore else { return }
                store.ir(.todos)          // ir() zera a busca: o termo entra DEPOIS
                store.searchText = termo
            }
        }
    }

    // ===== Agenda de revisão única, plano de leitura e catálogo (nativo → web) =====
    // O host lê os baralhos SRS dos dois módulos e injeta um resumo no WebView
    // ({legis:{due,deck}, juris:{due,deck}}); a view Revisões do Cátedra exibe e o botão
    // "Abrir" volta por catedraNav. Atualiza a cada 2 min, ao voltar à aba Cátedra e ao abrir.
    func startNativeReviewsSync() {
        let tm = Timer(timeInterval: 120.0, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.pushNativeReviews() }
        }
        RunLoop.main.add(tm, forMode: .common); nativeRevTimer = tm
        DispatchQueue.main.asyncAfter(deadline: .now() + 6) { [weak self] in
            guard let self else { return }
            // Instancia o store do JURIS cedo (é o mesmo objeto reaproveitado pela aba),
            // senão a contagem só existiria após a primeira visita à aba de jurisprudência.
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

    func abrirRegistroAuto(_ payload: [String: Any]) {
        selecionarAba(0)   // volta para o Cátedra — dispara o flush do tempo estudado
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
    // concluído, mesma ordem do PlanoLeituraView). JURIS: dias de súmulas (próximo = 1º
    // "dia" não lido). Lê os mesmos UserDefaults dos planos nativos.
    func nativePlanoPayload() -> String? {
        let ldone = PlanoStore.loadDone()
        var lTotal = 0
        // TODAS as leituras agrupadas por número da tabela-dia ("Dia 3" → CF, CC, CPC… + a
        // linha de súmulas), com estado feito/pendente por lei. O roteiro fixa seg→sex = os
        // 5 dias da SEMANA do plano em curso.
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

    /// Espelha as matérias do edital do Cátedra p/ o vínculo da checklist de leitura do LEGIS.
    func refreshEditalDisciplinas() {
        webView.evaluateJavaScript("window.catedraEditalDisciplinas && window.catedraEditalDisciplinas()") { result, _ in
            guard let s = result as? String, let data = s.data(using: .utf8),
                  let names = try? JSONDecoder().decode([String].self, from: data) else { return }
            AppStore.shared.setEditalDisciplinas(names)
        }
    }
    /// Mesma coisa, para a checklist de leitura PRÓPRIA do CátedraJURIS (dados separados).
    func refreshEditalDisciplinasJuris() {
        guard let store = jurisStore else { return }
        webView.evaluateJavaScript("window.catedraEditalDisciplinas && window.catedraEditalDisciplinas()") { result, _ in
            guard let s = result as? String, let data = s.data(using: .utf8),
                  let names = try? JSONDecoder().decode([String].self, from: data) else { return }
            store.setEditalDisciplinas(names)
        }
    }

    // ===== Ponte de estudo (CátedraLEGIS → Cátedra) =====
    // Registra as condições/baselines do cronômetro (chamado 1× no launch).
    func setupLegisClock() {
        StudyClock.shared.onBurstStart = { [weak self] in
            guard let self, self.legisReadsBaseline == nil else { return }
            self.legisReadsBaseline = AppStore.shared.readsToday
            self.legisReviewsBaseline = AppStore.shared.reviewedToday
        }
        // Cada segmento do cronômetro soma no tempo de estudo daquela norma.
        StudyClock.shared.onSegmentEnd = { law, secs in
            AppStore.shared.addStudyTime(law, secs)
        }
    }

    // Fecha a rajada: ABRE o registro do Cátedra pré-preenchido (a pessoa confere — não
    // grava sozinho). O tempo vem RATEADO POR MATÉRIA (o relógio fecha um segmento a cada
    // troca de norma): uma matéria → um registro; várias → FILA (um modal por matéria).
    // Sobras < 1 min fundem na dominante.
    func flushLegisStudy() {
        let (total, byLaw) = StudyClock.shared.takeAndResetBurst()
        defer { legisReadsBaseline = nil; legisReviewsBaseline = nil }
        guard Int((total / 60).rounded()) >= 1, legisVC != nil else { return }

        struct Acc { var secs: TimeInterval = 0; var topLaw: LawEntry?; var topSecs: TimeInterval = 0 }
        var porDisc: [String: Acc] = [:]
        for (id, s) in byLaw {
            guard let law = AppStore.shared.laws.first(where: { $0.id == id }) else { continue }
            let disc = law.customCategory ?? Self.catedraDisc(for: law.category)
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
        var partes: [String] = []
        if reads > 0 { partes.append("\(reads) artigo\(reads == 1 ? "" : "s") lido\(reads == 1 ? "" : "s")") }
        if reviews > 0 { partes.append("\(reviews) revisã\(reviews == 1 ? "o" : "es")") }
        if !partes.isEmpty, let nota0 = itens[0]["nota"] as? String {
            itens[0]["nota"] = partes.joined(separator: " · ") + " · " + nota0
        }
        let payload: [String: Any] = itens.count == 1 ? itens[0] : ["queue": itens, "origem": "CátedraLEGIS"]
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8) else { return }
        deliverStudyRegistration(json)
    }

    // ===== Ponte de estudo (CátedraJURIS → Cátedra) =====
    func setupJurisClock() {
        JurisClock.shared.onBurstStart = { [weak self] in
            guard let self, self.jurisLidosBaseline == nil else { return }
            self.jurisLidosBaseline = self.jurisStore?.lidosHoje ?? 0
        }
    }

    func flushJurisStudy() {
        var breakdown = JurisClock.shared.takeAndResetBreakdown()   // já vem por ordem de tempo
        defer { jurisLidosBaseline = nil }
        guard !breakdown.isEmpty, let store = jurisStore else { return }
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
        if lidos > 0, var nota0 = itens[0]["nota"] as? String {
            nota0 = "\(lidos) verbete\(lidos == 1 ? "" : "s") lido\(lidos == 1 ? "" : "s") · " + nota0
            itens[0]["nota"] = nota0
        }
        let payload: [String: Any] = itens.count == 1 ? itens[0] : ["queue": itens, "origem": "CátedraJURIS"]
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8) else { return }
        deliverStudyRegistration(json)
    }

    // Entrega o registro de estudo pré-preenchido ao app web. SEMPRE passa pelo disco: se a
    // página estiver morta, recarregando, ou o app for encerrado antes de a ponte responder,
    // o registro sobrevive e é entregue na próxima chance. Só sai do disco o que a web
    // confirmar que recebeu ('ok'/'queued').
    func deliverStudyRegistration(_ json: String) {
        var pend = UserDefaults.standard.stringArray(forKey: "catedraPendingStudyRegs") ?? []
        pend.append(json)
        UserDefaults.standard.set(pend, forKey: "catedraPendingStudyRegs")
        entregarEstudosPendentesSePossivel()
    }

    /// Entrega só numa página ESTÁVEL: já hidratada, ou entrada sem portão aberto (visitante /
    /// sem rede com sessão). Antes da hidratação o auth.js ainda dá location.reload(), e a
    /// injeção cairia numa página que está morrendo.
    func entregarEstudosPendentesSePossivel() {
        let pend = UserDefaults.standard.stringArray(forKey: "catedraPendingStudyRegs") ?? []
        guard !pend.isEmpty, let wv = webView else { return }
        let js = """
        (function(){ try {
          var g = document.getElementById('catedra-auth-gate');
          var aberto = !!(g && g.style.display !== 'none');
          var auth = localStorage.getItem('catedra:auth') === '1';
          var hid = sessionStorage.getItem('catedra:hydrated') === '1';
          return (hid || (auth && !aberto)) ? '1' : '0';
        } catch (e) { return '0'; } })()
        """
        wv.evaluateJavaScript(js) { [weak self] r, _ in
            guard let self, (r as? String) == "1" else { return }
            MainActor.assumeIsolated { self.entregarEstudosPendentes(pend) }
        }
    }

    /// Injeta os registros pendentes e remove do disco SÓ os confirmados.
    private func entregarEstudosPendentes(_ pend: [String]) {
        for (i, json) in pend.enumerated() {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0 + Double(i) * 0.6) { [weak self] in
                guard let self else { return }
                self.webView.evaluateJavaScript(
                    "window.catedraOpenStudyRegistration ? window.catedraOpenStudyRegistration(\(json)) : 'sem-ponte'"
                ) { r, _ in
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

    // Item de leitura marcado como feito no LEGIS/JURIS → tenta marcar como concluída a
    // tarefa correspondente de HOJE no ciclo de estudos (por matéria/categoria).
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
        let disc = law.customCategory ?? Self.catedraDisc(for: law.category)
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

    // ===== Imprimir / salvar PDF =====
    // No Mac é a NSPrintOperation da própria webview. Aqui a página inteira vira um PDF
    // paginado em A4 e vai para a folha de compartilhamento: Salvar em Arquivos, AirDrop,
    // Mail, Imprimir — o que a pessoa quiser fazer com ele.
    func exportarPDF() {
        let render = UIPrintPageRenderer()
        render.addPrintFormatter(webView.viewPrintFormatter(), startingAtPageAt: 0)
        let a4 = CGRect(x: 0, y: 0, width: 595.2, height: 841.8)
        render.setValue(NSValue(cgRect: a4), forKey: "paperRect")
        render.setValue(NSValue(cgRect: a4.insetBy(dx: 28, dy: 28)), forKey: "printableRect")
        let dados = NSMutableData()
        UIGraphicsBeginPDFContextToData(dados, a4, nil)
        let paginas = render.numberOfPages
        for i in 0..<paginas {
            UIGraphicsBeginPDFPage()
            render.drawPage(at: i, in: UIGraphicsGetPDFContextBounds())
        }
        UIGraphicsEndPDFContext()
        guard paginas > 0, dados.length > 0 else { mostrarErro("Não consegui montar o PDF desta tela."); return }
        var nome = (webView.title ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if nome.isEmpty { nome = "Cátedra" }
        nome = nome.replacingOccurrences(of: "[/:\\\\]", with: "-", options: .regularExpression)
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(nome + ".pdf")
        do { try dados.write(to: url, options: .atomic) } catch { mostrarErro("Não consegui gravar o PDF: \(error.localizedDescription)"); return }
        let folha = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        // No iPad a folha é um popover e PRECISA de âncora — sem ela o app cai.
        folha.popoverPresentationController?.sourceView = segmento
        folha.popoverPresentationController?.sourceRect = segmento.bounds
        present(folha, animated: !ThemeState.t.baixaEstimulacao)
    }

    // ===== A casca segue o tema do app =====
    // A barra e o fundo eram do sistema: com o Cátedra no escuro a faixa de cima ficava
    // branca (e vice-versa). Tudo aqui vem dos tokens já lidos pela ponte de tema — nada de
    // cor fixa. O status bar acompanha pelo overrideUserInterfaceStyle.
    func aplicarAparenciaHost() {
        let t = ThemeState.t
        overrideUserInterfaceStyle = t.isDark ? .dark : .light
        let acento = UIColor(t.accent)
        view.backgroundColor = UIColor(t.bg)
        // A barra do sistema pinta com a superfície do tema em TODOS os estados (parada, na
        // borda de rolagem, compacta em paisagem): sem a aparência explícita o iOS 26 a
        // deixaria translúcida, com o material do sistema por cima do conteúdo.
        let aparencia = UINavigationBarAppearance()
        aparencia.configureWithOpaqueBackground()
        aparencia.backgroundColor = UIColor(t.surface)
        aparencia.shadowColor = UIColor(t.border)
        aparencia.titleTextAttributes = [.foregroundColor: UIColor(t.ink)]
        navBar?.standardAppearance = aparencia
        navBar?.scrollEdgeAppearance = aparencia
        navBar?.compactAppearance = aparencia
        navBar?.compactScrollEdgeAppearance = aparencia
        navBar?.tintColor = acento          // chevron e rótulo do voltar, e a engrenagem
        // O seletor é desenhado pelo app (SeletorProduto), e não um UISegmentedControl: o iOS 27
        // ignora selectedSegmentTintColor e pinta a própria pílula clara, mas respeita a cor do
        // texto — o acento sumia e "JURIS" ficava branco sobre cinza. Desenhando, a pílula é
        // sempre o --accentSolid (o acento movido o mínimo para o texto passar de 4,5:1; sem ele,
        // o --accent) e o texto sobre ela é o --onAccent (sem ele, o contraste decide).
        let pilula = corPilula ?? acento
        let sobreAcento = corSobreAcento ?? (Self.luminancia(pilula) < 0.5 ? .white : .black)
        segmento?.aplicarCores(fundo: UIColor(t.surface2), acento: pilula,
                               sobreAcento: sobreAcento, texto: UIColor(t.ink))
        setNeedsStatusBarAppearanceUpdate()
    }

    private static func luminancia(_ c: UIColor) -> CGFloat {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        guard c.getRed(&r, green: &g, blue: &b, alpha: &a) else { return 1 }
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    /// O app não avisa a casca quando a pessoa troca cor/claro-escuro nos Ajustes; com a aba
    /// Cátedra na tela, o espelho relê os tokens a cada 2 s (leitura barata) e só age se mudou.
    func iniciarEspelhoDeTema() {
        let tm = Timer(timeInterval: 2.0, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self, self.abaAtual == 0, self.presentedViewController == nil else { return }
                self.espelharTema { mudou in if mudou { self.temaPendenteNativo = true } }
            }
        }
        RunLoop.main.add(tm, forMode: .common); temaTimer = tm
    }

    // ===== Notificações: aparecem com o app ABERTO; o toque navega =====
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list, .sound])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        if let view = response.notification.request.content.userInfo["view"] as? String, !view.isEmpty,
           let esc = view.addingPercentEncoding(withAllowedCharacters: .alphanumerics) {
            selecionarAba(0)   // a navegação da notificação é no app web (aba Cátedra)
            webView?.evaluateJavaScript("window.__catedraGoView && window.__catedraGoView('\(esc)')", completionHandler: nil)
        }
        completionHandler()
    }

    // ===== Navegação da WebView =====
    func webView(_ wv: WKWebView, didFinish navigation: WKNavigation!) {
        guard wv === webView else { return }
        // A casca segue o tema assim que a página pinta (o auth.js ainda recarrega uma vez).
        // Se um módulo nativo já está na tela (aberto por argumento de launch ou antes de a
        // página pintar), ele nasceu com o tema de fallback: remonta agora com o tema certo.
        espelharTema { [weak self] mudou in
            guard let self, mudou else { return }
            if self.abaAtual == 0 { self.temaPendenteNativo = true } else { self.montarAba(remontar: true) }
        }
        entregarEstudosPendentesSePossivel()
        DispatchQueue.main.asyncAfter(deadline: .now() + 6) { [weak self] in self?.pushNativeReviews() }
    }

    /// O iPadOS mata o processo de conteúdo do WKWebView em segundo plano quando falta memória.
    /// Sem isto a pessoa voltava para uma tela BRANCA e tinha de fechar o app à mão.
    func webViewWebContentProcessDidTerminate(_ wv: WKWebView) {
        guard wv === webView else { return }
        carregarApp()
    }
}

/// Embrulho dos Ajustes dos módulos numa folha do iPad: título e botão de fechar (no Mac
/// eram janelas com o próprio botão de fechar).
struct AjustesEmbrulho<Conteudo: View>: View {
    let titulo: String
    let fechar: () -> Void
    @ViewBuilder let conteudo: () -> Conteudo
    var body: some View {
        NavigationStack {
            conteudo()
                .navigationTitle(titulo)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Fechar", action: fechar) } }
        }
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
        // aberto a frio por um link catedra:// (toque no widget): o viewDidLoad já rodou no makeKeyAndVisible
        if let url = options.urlContexts.first?.url {
            DispatchQueue.main.async { (w.rootViewController as? RootViewController)?.abrirLinkWidget(url) }
        }
    }
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        (window?.rootViewController as? RootViewController)?.abrirLinkWidget(url)
    }
}

final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ app: UIApplication,
                     didFinishLaunchingWithOptions opts: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        DSFontes.registrar()       // fontes da casa (web/fonts) para o LEGIS/JURIS nativos
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
            // Baixa estimulação: desliga todo movimento do SwiftUI na raiz sem tocar nos
            // ~40 withAnimation/.animation dos vendors. `animation = nil` zera o explícito
            // (withAnimation); `disablesAnimations` impede que um .animation(_:value:) mais
            // abaixo reponha a animação. O .symbolEffect não passa por transação: esse é
            // gateado em cada tela. O host é remontado quando o interruptor muda, então ler
            // ThemeState aqui basta. O conteúdo de .sheet NÃO herda esta transação (fica num
            // controlador de apresentação à parte): a sheet que anima usa .semMovimentoSeBaixa().
            .transaction { tr in
                if ThemeState.t.baixaEstimulacao { tr.animation = nil; tr.disablesAnimations = true }
            }
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
            // Baixa estimulação: sem animação nas telas do JURIS (ver raiz do LEGIS). Conteúdo
            // de .sheet não herda esta transação: RevisaoView e RevisaoEspacadaView aplicam
            // .semMovimentoSeBaixa() (Theme.swift) no próprio corpo.
            .transaction { tr in
                if ThemeState.t.baixaEstimulacao { tr.animation = nil; tr.disablesAnimations = true }
            }
            .task {
                // load() só na 1ª vez: reconstruir por troca de tema não recarrega o acervo.
                if store.entries.isEmpty { await store.load() }
                updater.pedirPermissaoNotificacao()
                await updater.verificacaoAutomatica(store: store)
            }
    }
}

#if targetEnvironment(simulator)
extension RootViewController {
    /// Só no simulador e só com `-semPortao`: marca o aparelho como "entrado" ANTES de o app
    /// montar (o Catedra.dc.html lê catedra:auth no construtor) e fecha o portão de login pela
    /// ponte `__setGateOpen` que o auth.js expõe para os testes — o mesmo que tests/run.mjs faz.
    /// Sem sessão do Supabase nada sincroniza; serve para OLHAR e USAR as telas.
    static let scriptsSemPortao: [WKUserScript] = [
        WKUserScript(source: """
        (function(){ try { localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); } catch (e) {} })();
        """, injectionTime: .atDocumentStart, forMainFrameOnly: true),
        WKUserScript(source: """
        (function(){
          var n = 0;
          var t = setInterval(function () {
            n++;
            try {
              localStorage.setItem('catedra:auth', '1');
              var g = document.getElementById('catedra-auth-gate');
              if (g && g.__setGateOpen) g.__setGateOpen(false);
            } catch (e) {}
            if (n > 60) clearInterval(t);
          }, 200);
        })();
        """, injectionTime: .atDocumentEnd, forMainFrameOnly: true),
    ]
}
#endif
