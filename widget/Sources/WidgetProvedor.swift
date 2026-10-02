import WidgetKit
import SwiftUI

/// Uma entrada da linha do tempo: o resumo escolhido (nuvem × cópia do app), as contas do dia na DATA da entrada
/// e o item da lei/súmula do dia.
struct EntradaCatedra: TimelineEntry {
    let date: Date
    let resumo: WidgetResumo?
    let hoje: WidgetHoje?
    let item: WidgetItemDoDia?
}

struct ProvedorCatedra: TimelineProvider {
    static let itensDoDia: [WidgetItemDoDia] = {
        guard let u = Bundle.main.url(forResource: "dodia", withExtension: "json"), let d = try? Data(contentsOf: u) else { return [] }
        return WidgetDoDia.carregar(d)
    }()

    static func entrada(_ resumo: WidgetResumo?, em data: Date) -> EntradaCatedra {
        EntradaCatedra(date: data, resumo: resumo,
                       hoje: resumo.map { WidgetHoje.calcular($0, agora: data) },
                       item: WidgetDoDia.item(itensDoDia, em: data, calendario: .current))
    }

    func placeholder(in context: Context) -> EntradaCatedra { Self.entrada(.exemplo(Date()), em: Date()) }

    func getSnapshot(in context: Context, completion: @escaping (EntradaCatedra) -> Void) {
        Task {
            let e = await Self.montar(agora: Date(), comNuvem: false)
            // a galeria, antes de o app gravar qualquer coisa, mostra o exemplo e não um widget vazio
            completion(context.isPreview && e.resumo == nil ? Self.entrada(.exemplo(Date()), em: Date()) : e)
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<EntradaCatedra>) -> Void) {
        Task {
            let agora = Date()
            let base = await Self.montar(agora: agora, comNuvem: true)
            let cal = Calendar.current
            let amanha = cal.startOfDay(for: cal.date(byAdding: .day, value: 1, to: agora) ?? agora)
            let virada = Self.entrada(base.resumo, em: amanha.addingTimeInterval(60))   // as contas do dia refeitas à meia-noite
            completion(Timeline(entries: [base, virada], policy: .after(agora.addingTimeInterval(30 * 60))))
        }
    }

    /// Lê a cópia do app e o cache da nuvem no grupo; com `comNuvem`, pergunta à nuvem pelo passe. Passe recusado
    /// deixa o marcador para o app pedir outro; falha de rede não mexe em nada.
    static func montar(agora: Date, comNuvem: Bool) async -> EntradaCatedra {
        let local = WidgetGrupo.ler(WidgetGrupo.resumo).flatMap(WidgetResumo.ler)
        let passe = WidgetGrupo.ler(WidgetGrupo.passe).flatMap { try? JSONDecoder().decode(WidgetPasse.self, from: $0) }
        var nuvem = WidgetGrupo.ler(WidgetGrupo.resumoNuvem).flatMap(WidgetResumo.ler)
        if comNuvem, let p = passe, let cfg = WidgetNuvem.config(Bundle.main.infoDictionary) {
            switch await WidgetNuvem.ler(passe: p.passe, config: cfg) {
            case .ok(let r):
                if let r {
                    nuvem = r
                    if let d = try? JSONEncoder().encode(r) { WidgetGrupo.gravar(d, WidgetGrupo.resumoNuvem) }
                }
            case .invalido:
                WidgetGrupo.gravar(Data("1".utf8), WidgetGrupo.passeInvalido)
                WidgetGrupo.apagar(WidgetGrupo.resumoNuvem)
                nuvem = nil
            case .falha:
                break
            }
        }
        return entrada(WidgetSelecao.escolher(local: local, nuvem: nuvem, contaDoPasse: passe?.conta), em: agora)
    }
}
