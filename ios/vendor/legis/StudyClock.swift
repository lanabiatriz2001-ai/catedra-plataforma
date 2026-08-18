import SwiftUI
import Foundation

/// Cronômetro de estudo do CátedraLEGIS — só corre quando a usuária está DE FATO
/// dentro de uma norma (leitor aberto), com a aba ativa e o app em foco. Fonte única
/// compartilhada entre o host nativo (aba/foco + flush) e a UI SwiftUI (leitor + display).
@MainActor
final class StudyClock: ObservableObject {
    static let shared = StudyClock()

    @Published private(set) var seconds: TimeInterval = 0   // tempo da rajada atual (ao vivo)
    @Published private(set) var running = false             // true só enquanto conta

    private var accum: TimeInterval = 0
    private var segStart: Date?
    private var ticker: Timer?

    // Condições para o relógio correr (todas precisam ser verdadeiras):
    private var currentLawID: UUID?  // norma aberta no leitor (nil = nenhuma)
    private var appActive = true     // o app está em foco
    private var tabActive = false    // a aba CátedraLEGIS está selecionada (não gate mais o relógio — só rótulo)
    @Published private(set) var manualPlaying = false   // play/pause: o relógio NÃO é mais automático

    /// Disparado quando uma rajada NOVA começa (accum era 0) — o host captura os baselines.
    var onBurstStart: (() -> Void)?
    /// Disparado ao FECHAR cada segmento — atribui o tempo àquela norma (dashboard por norma).
    var onSegmentEnd: ((UUID, TimeInterval) -> Void)?

    // Sem depender da aba selecionada: dá pra apertar Play, ler a lei e ir pesquisar
    // no CátedraJURIS (ou vice-versa) sem o relógio parar sozinho.
    private var shouldRun: Bool { manualPlaying && currentLawID != nil && appActive }

    /// Play manual — só conta se houver uma norma aberta no leitor.
    func play() { manualPlaying = true; recompute() }
    /// Pause manual.
    func pause() { manualPlaying = false; recompute() }
    func togglePlay() { manualPlaying ? pause() : play() }

    /// Define qual norma está aberta (nil = saiu do leitor). Trocar de norma fecha o
    /// segmento atual (atribuindo o tempo à norma anterior) e começa outro.
    func setReader(_ lawID: UUID?) {
        if lawID != currentLawID {
            endSegment()
            currentLawID = lawID
        }
        recompute()
    }
    func setAppActive(_ v: Bool) { guard appActive != v else { return }; appActive = v; recompute() }
    func setTabActive(_ v: Bool) { tabActive = v }

    private func recompute() {
        if shouldRun {
            guard segStart == nil else { return }
            if accum == 0 { onBurstStart?() }   // início de uma rajada nova
            segStart = Date()
            running = true
            startTicker()
            tick()
        } else {
            endSegment()
        }
    }

    // Tempo por NORMA dentro da rajada atual — para o flush ratear os registros
    // por matéria quando a leitura cruzou normas de disciplinas diferentes.
    private(set) var burstByLaw: [UUID: TimeInterval] = [:]

    // Fecha o segmento em curso: soma no acumulado da rajada E atribui o tempo à norma.
    private func endSegment() {
        guard let s = segStart else { return }
        let dt = Date().timeIntervalSince(s)
        accum += dt
        if let law = currentLawID {
            onSegmentEnd?(law, dt)
            burstByLaw[law, default: 0] += dt
        }
        segStart = nil
        running = false
        stopTicker()
        seconds = accum
    }

    /// Fecha a rajada: devolve o total + o rateio por norma e zera tudo.
    func takeAndResetBurst() -> (total: TimeInterval, byLaw: [UUID: TimeInterval]) {
        endSegment()
        let total = accum
        let byLaw = burstByLaw
        accum = 0
        seconds = 0
        burstByLaw = [:]
        return (total, byLaw)
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
