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
    static func numeroDe(label: String) -> String? {
        let s = label.replacingOccurrences(of: ".", with: "")
        guard let r = s.range(of: #"\d+(?:-[A-Za-z])?"#, options: .regularExpression) else { return nil }
        return String(s[r]).uppercased()
    }

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
    var accent: Color = .accentColor
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
