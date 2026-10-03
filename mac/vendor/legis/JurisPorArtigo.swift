import SwiftUI

/// Jurisprudência do acervo do CátedraJURIS que cita ESTE artigo — automática, sem
/// vínculo manual. Vem de incidencia-verbetes.json (gerado por scripts/build-incidencia.mjs
/// junto do mapa de incidência): para cada diploma do catálogo e cada artigo, até 40
/// verbetes que o citam, os mais recentes primeiro, com id, título, tribunal, ramo, tema
/// e data. O texto do verbete fica no corpus do JURIS; daqui só se pede ao host para
/// abrir lá (Notification "catedraAbrirVerbeteJuris", userInfo["id"]).
///
/// Por que é do nosso acervo e não de índice comercial: os 25 mil verbetes são oficiais
/// (STF, STJ, TSE, TJRO, tribunais de contas) e a ligação artigo→julgado é calculada
/// pelo nosso próprio script a partir do texto do julgado. Nada é copiado de site de
/// curso — é a mesma regra do índice remissivo.
struct VerbeteCitante: Codable, Identifiable, Hashable {
    let id: String
    let t: String
    let trib: String
    let ramo: String
    let tema: String
    let data: String
}

enum JurisPorArtigo {
    struct Diploma: Codable { var nome: String; var artigos: [String: [VerbeteCitante]] }
    private struct Envelope: Codable { var diplomas: [String: Diploma] }
    private(set) static var diplomas: [String: Diploma] = [:]
    private static var carregou = false

    static func carregar() {
        guard !carregou else { return }
        carregou = true
        let candidatos: [URL?] = [
            Bundle.main.url(forResource: "incidencia-verbetes", withExtension: "json"),
            Bundle.main.bundleURL.appendingPathComponent("incidencia-verbetes.json"),
            Bundle.main.bundleURL.appendingPathComponent("Contents/Resources/incidencia-verbetes.json"),
        ]
        for c in candidatos {
            guard let u = c, let d = try? Data(contentsOf: u),
                  let env = try? JSONDecoder().decode(Envelope.self, from: d) else { continue }
            diplomas = env.diplomas
            return
        }
    }

    static let notificacaoAbrir = Notification.Name("catedraAbrirVerbeteJuris")

    /// Texto OFICIAL do verbete (enunciado/tese do tribunal), lido do acervo do JURIS pelo
    /// host (main.swift injeta). Sem host ou acervo ainda não carregado: nil — a gaveta
    /// mostra o título e "Abrir no JURIS", nunca um texto inventado.
    static var textoOficial: (String) -> String? = { _ in nil }

    private static var porVerbete: [String: [ArtigoCitado]]?

    /// Artigos do catálogo citados pelo verbete `id` (inverso do índice de incidência).
    static func artigosCitados(verbeteID id: String) -> [ArtigoCitado] {
        carregar()
        if porVerbete == nil {
            // Já ORDENADO na inversão: cada redesenho só lê (revisão final da entrega 3).
            porVerbete = CitacoesLogica.inverter(diplomas.values.reduce(into: [:]) { acc, d in
                acc[d.nome] = d.artigos.mapValues { $0.map(\.id) }
            }).mapValues(CitacoesLogica.ordenar)
        }
        return porVerbete?[id] ?? []
    }

    static let notificacaoAbrirLegis = Notification.Name("catedraAbrirArtigoLegis")
    /// Pedido pendente: o LEGIS pode não estar montado quando o JURIS pede — ContentView
    /// consome ao aparecer (e também ao receber a notificação).
    static var pedidoLegis: ArtigoCitado?
    /// Quando o pedido foi feito: passado de 30 s ele é descartado, para não jogar a pessoa
    /// num artigo antigo horas depois (revisão final da entrega 3).
    static var pedidoEm: Date?
    /// Modo de leitura só para ESTA abertura (o artigo abre no Estudar) — sem gravar a
    /// preferência global `readerMode` da pessoa.
    static var modoUmaVez: String?

    static func abrirNoLegis(_ a: ArtigoCitado) {
        // "1.015" → "1015": o mesmo formato de articleNumberKey (o widget e o JURIS podem mandar com ponto)
        pedidoLegis = ArtigoCitado(diploma: a.diploma, artigo: a.artigo.replacingOccurrences(of: ".", with: ""))
        pedidoEm = Date()
        NotificationCenter.default.post(name: notificacaoAbrirLegis, object: nil)
    }

    /// Diploma do índice → norma do catálogo (mesma normalização de `verbetes(lei:label:)`).
    static func lei(doDiploma nome: String, em leis: [LawEntry]) -> LawEntry? {
        // título exato; senão o apelido curto; senão o título que contém o nome — os mesmos recuos de
        // IncidenciaView.abrirNaLei, para o "Do dia" do widget (diplomas do incidencia.json) achar a norma
        let alvo = norm(nome)
        return leis.first { norm($0.title) == alvo }
            ?? leis.first { $0.isRegularLaw && norm(RemissiveIndex.shortName($0)) == alvo }
            ?? leis.first { $0.isRegularLaw && norm($0.title).contains(alvo) }
    }

    /// Número do artigo → quantos verbetes o citam, para o sinal na margem do leitor.
    static func contagens(lei: LawEntry) -> [String: Int] {
        carregar()
        let alvo = norm(lei.title)
        guard let d = diplomas.values.first(where: { norm($0.nome) == alvo }) else { return [:] }
        return d.artigos.mapValues(\.count).filter { $0.value > 0 }
    }

    /// Pede ao host para trocar para a aba JURIS já no verbete. Se não houver host
    /// (módulo rodando sozinho), nada acontece — a lista continua legível aqui.
    static func abrirNoJuris(_ id: String) {
        NotificationCenter.default.post(name: notificacaoAbrir, object: nil, userInfo: ["id": id])
    }

    private static func norm(_ s: String) -> String {
        s.folding(options: .diacriticInsensitive, locale: nil).lowercased()
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// "Art. 5º" / "Art. 1.015" / "Art. 121-A" → "5" / "1015" / "121-A" (o mesmo formato
    /// que o gerador grava: número sem ponto de milhar, letra com hífen).
    static func numeroDe(label: String) -> String? { LeitorLogica.numero(de: label) }

    /// Verbetes que citam o artigo `label` da lei `lei`. Casamento da lei pelo título do
    /// catálogo (o mesmo que o IncidenciaView usa); vazio quando não há.
    static func verbetes(lei: LawEntry, label: String) -> [VerbeteCitante] {
        carregar()
        guard let num = numeroDe(label: label) else { return [] }
        let alvo = norm(lei.title)
        guard let d = diplomas.values.first(where: { norm($0.nome) == alvo }) else { return [] }
        return d.artigos[num] ?? []
    }

    /// Busca de QUESTÕES sobre o artigo em banco externo, na sessão da própria pessoa.
    /// Regra da casa: automação ABRE, não grava — o Cátedra não copia questão de TEC nem
    /// de QConcursos; abre a busca lá e o desempenho fica lá (a pessoa registra aqui se
    /// quiser, pelo caderno de erros).
    static func urlQuestoes(lei: LawEntry, label: String, servico: ServicoQuestoes) -> URL? {
        let art = numeroDe(label: label) ?? label
        let termo = "art. \(art) \(RemissiveIndex.shortName(lei))"
        let q = termo.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? termo
        switch servico {
        case .qconcursos: return URL(string: "https://www.qconcursos.com/questoes-de-concursos/questoes?q=\(q)")
        case .tec:        return URL(string: "https://www.tecconcursos.com.br/questoes?texto=\(q)")
        }
    }
    enum ServicoQuestoes: String, CaseIterable { case qconcursos = "QConcursos", tec = "TEC Concursos" }
}

/// Lista compacta para o acordeão do artigo.
struct JurisPorArtigoView: View {
    let verbetes: [VerbeteCitante]
    var accent: Color = ThemeState.t.accent
    @State private var mostrarTodos = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(mostrarTodos ? verbetes : Array(verbetes.prefix(8))) { v in
                Button { JurisPorArtigo.abrirNoJuris(v.id) } label: {
                    HStack(alignment: .top, spacing: 8) {
                        Text(v.trib.isEmpty ? "—" : v.trib)
                            .font(.caption2.weight(.bold))
                            .padding(.horizontal, 6).padding(.vertical, 2)
                            .background(Capsule().fill(accent.opacity(0.16)))
                            .foregroundStyle(accent)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(v.t).font(.caption.weight(.semibold)).foregroundStyle(AppTheme.ink)
                            if !v.tema.isEmpty {
                                Text(v.tema).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                            }
                            HStack(spacing: 6) {
                                if !v.ramo.isEmpty { Text(v.ramo) }
                                if !v.data.isEmpty { Text("·"); Text(v.data) }
                            }.font(.caption2).foregroundStyle(.tertiary)
                        }
                        Spacer(minLength: 0)
                        Image(systemName: "arrow.up.right").font(.caption2).foregroundStyle(.tertiary)
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
            if verbetes.count > 8 {
                Button(mostrarTodos ? "Mostrar menos" : "Mostrar todos (\(verbetes.count))") {
                    withAnimation { mostrarTodos.toggle() }
                }
                .font(.caption).buttonStyle(.borderless)
            }
        }
    }
}
