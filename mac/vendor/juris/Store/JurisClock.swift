import SwiftUI
import Foundation

/// Cronômetro de estudo do CátedraJURIS — conta enquanto a aba está selecionada e
/// o app em foco (revisar jurisprudência acontece em listas, leitor, flashcards e
/// revisão espaçada — não há um "leitor único" para gatear como no LEGIS).
/// Mesmo contrato do StudyClock: o host controla as condições e faz o flush;
/// a sidebar exibe ao vivo.
@MainActor
final class JurisClock: ObservableObject {
    static let shared = JurisClock()

    @Published private(set) var seconds: TimeInterval = 0   // tempo da rajada atual (ao vivo)
    @Published private(set) var running = false

    private var accum: TimeInterval = 0
    private var segStart: Date?
    private var ticker: Timer?

    private var appActive = true     // o app está em foco
    private var tabActive = false    // a aba CátedraJURIS está selecionada (não gate mais o relógio — só rótulo)
    @Published private(set) var manualPlaying = false   // play/pause: o relógio NÃO é mais automático

    // RATEIO POR MATÉRIA: cada troca de verbete define o "contexto" (ramo do
    // Direito); o tempo entre trocas é atribuído ao contexto vigente — assim uma
    // rajada que cruza Penal e Civil vira registros separados, com os minutos certos.
    private var context = "Jurisprudência"                    // matéria corrente
    private var burstByContext: [String: TimeInterval] = [:]  // matéria → segundos na rajada
    private var lastTitulo: [String: String] = [:]            // matéria → último verbete visto

    /// Disparado quando uma rajada NOVA começa (accum era 0) — o host captura os baselines.
    var onBurstStart: (() -> Void)?

    // Sem depender da aba selecionada: dá pra apertar Play, pesquisar jurisprudência
    // e ir ler uma lei no CátedraLEGIS (ou vice-versa) sem o relógio parar sozinho.
    private var shouldRun: Bool { manualPlaying && appActive }

    /// Play manual — o relógio NÃO é mais automático.
    func play() { manualPlaying = true; recompute() }
    /// Pause manual.
    func pause() { manualPlaying = false; recompute() }
    func togglePlay() { manualPlaying ? pause() : play() }

    func setAppActive(_ v: Bool) { guard appActive != v else { return }; appActive = v; recompute() }
    func setTabActive(_ v: Bool) { tabActive = v }

    /// Chamado quando um verbete é aberto: fecha o segmento da matéria anterior e
    /// passa a atribuir o tempo à nova (pegajoso: listas herdam a última matéria).
    func setContext(_ ramo: String?, titulo: String) {
        let novo = (ramo?.isEmpty == false) ? ramo! : "Jurisprudência"
        if novo != context {
            endSegment()
            context = novo
            recompute()
        }
        lastTitulo[novo] = titulo
    }

    private func recompute() {
        if shouldRun {
            guard segStart == nil else { return }
            if accum == 0 { onBurstStart?() }
            segStart = Date()
            running = true
            startTicker()
            tick()
        } else {
            endSegment()
        }
    }

    private func endSegment() {
        guard let s = segStart else { return }
        let dt = Date().timeIntervalSince(s)
        accum += dt
        burstByContext[context, default: 0] += dt
        segStart = nil
        running = false
        stopTicker()
        seconds = accum
    }

    /// Fecha a rajada e devolve o RATEIO por matéria (segundos + último verbete),
    /// da maior para a menor; zera tudo (chamado no flush que registra as sessões).
    func takeAndResetBreakdown() -> [(disc: String, secs: TimeInterval, titulo: String?)] {
        endSegment()
        let out = burstByContext
            .sorted { $0.value > $1.value }
            .map { (disc: $0.key, secs: $0.value, titulo: lastTitulo[$0.key]) }
        accum = 0
        seconds = 0
        burstByContext = [:]
        lastTitulo = [:]
        return out
    }

    private func tick() {
        seconds = accum + (segStart.map { Date().timeIntervalSince($0) } ?? 0)
    }

    private func startTicker() {
        stopTicker()
        let t = Timer(timeInterval: 1, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.tick() }
        }
        RunLoop.main.add(t, forMode: .common)
        ticker = t
    }

    private func stopTicker() {
        ticker?.invalidate()
        ticker = nil
    }

    /// "MM:SS" (ou "H:MM:SS" quando passa de 1h) para exibição.
    var formatted: String {
        let total = Int(seconds)
        let h = total / 3600, m = (total % 3600) / 60, s = total % 60
        return h > 0
            ? String(format: "%d:%02d:%02d", h, m, s)
            : String(format: "%02d:%02d", m, s)
    }
}
