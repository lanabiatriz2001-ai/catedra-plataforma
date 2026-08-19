import SwiftUI

// =====================================================================================
//  CátedraLEGIS — MAPA DE INCIDÊNCIA POR ARTIGO e PROVA ORAL, nativos.
//
//  Incidência: quantas vezes CADA artigo de cada lei é citado nos ~25 mil verbetes de
//  jurisprudência do app. Vem de incidencia.json (gerado por scripts/build-incidencia.mjs
//  e embarcado no bundle). É incidência em JULGADO, não frequência em prova — a tela diz
//  isso com todas as letras, porque são sinais diferentes.
//
//  Prova oral: a IA do app (CatedraIA — mesmo /api/complete do Cátedra) formula uma
//  pergunta sobre um artigo, você responde, ela corrige contra o texto da lei.
// =====================================================================================

// MARK: - Dados

struct IncidenciaDiploma: Codable, Identifiable {
    var id: String { nome }
    var nome: String
    var total: Int
    var artigos: Int
    var corte: [Int]              // [alta, media] — número de citações a partir do qual…
    var lista: [[IncidenciaValor]] // [[artigo, n]] — vem misto (string, int) do JSON

    enum IncidenciaValor: Codable, Hashable {
        case s(String), i(Int)
        init(from d: Decoder) throws {
            let c = try d.singleValueContainer()
            if let i = try? c.decode(Int.self) { self = .i(i) }
            else { self = .s(try c.decode(String.self)) }
        }
        func encode(to e: Encoder) throws {
            var c = e.singleValueContainer()
            switch self { case .s(let s): try c.encode(s); case .i(let i): try c.encode(i) }
        }
        var texto: String { switch self { case .s(let s): return s; case .i(let i): return String(i) } }
        var inteiro: Int { switch self { case .i(let i): return i; case .s(let s): return Int(s) ?? 0 } }
    }

    struct Artigo: Identifiable { var id: String { numero }; let numero: String; let n: Int }
    var artigosOrdenados: [Artigo] {
        // ordem de LEITURA (número do artigo), não de ranking — é assim que se lê a lei
        lista.compactMap { par -> Artigo? in
            guard par.count >= 2 else { return nil }
            return Artigo(numero: par[0].texto, n: par[1].inteiro)
        }.sorted { a, b in
            let na = Int(a.numero.replacingOccurrences(of: ".", with: "").prefix { $0.isNumber }) ?? 0
            let nb = Int(b.numero.replacingOccurrences(of: ".", with: "").prefix { $0.isNumber }) ?? 0
            return na != nb ? na < nb : a.numero < b.numero
        }
    }
    enum Faixa { case alta, media, baixa }
    func faixa(_ n: Int) -> Faixa {
        let a = corte.first ?? 1, m = corte.count > 1 ? corte[1] : 1
        return n >= a ? .alta : (n >= m ? .media : .baixa)
    }
}

@MainActor
enum IncidenciaDados {
    private(set) static var diplomas: [IncidenciaDiploma] = []
    private static var carregou = false
    struct Envelope: Codable { var diplomas: [String: IncidenciaDiploma] }

    static func carregar() {
        guard !carregou else { return }
        carregou = true
        // Mesma busca do corpus do JURIS: recurso do bundle, ou raiz do .app (iOS é plano).
        let candidatos: [URL?] = [
            Bundle.main.url(forResource: "incidencia", withExtension: "json"),
            Bundle.main.bundleURL.appendingPathComponent("incidencia.json"),
            Bundle.main.bundleURL.appendingPathComponent("Contents/Resources/incidencia.json"),
        ]
        for c in candidatos {
            guard let u = c, let d = try? Data(contentsOf: u),
                  let env = try? JSONDecoder().decode(Envelope.self, from: d) else { continue }
            diplomas = env.diplomas.values.sorted { $0.total > $1.total }
            return
        }
    }
}

// MARK: - Tela

struct IncidenciaView: View {
    @EnvironmentObject var store: AppStore
    var abrirLei: ((UUID) -> Void)? = nil
    @State private var busca = ""
    @State private var sel: IncidenciaDiploma?

    private let cAlta = Color(hex: "#DC2626"), cMedia = Color(hex: "#D97706"), cBaixa = Color(hex: "#3B82F6")

    var body: some View {
        SectionShell(icon: "target", title: "Incidência",
                     subtitle: "Quantas vezes cada artigo é citado na jurisprudência do acervo",
                     count: IncidenciaDados.diplomas.count,
                     search: sel == nil ? $busca : nil, searchPrompt: "Buscar diploma") {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if let d = sel { detalhe(d) } else { lista }
                }
                .padding(22)
            }
        }
        .onAppear { IncidenciaDados.carregar() }
    }

    private var lista: some View {
        let q = busca.trimmingCharacters(in: .whitespaces).lowercased()
        let itens = IncidenciaDados.diplomas.filter { q.isEmpty || $0.nome.lowercased().contains(q) }
        let max = itens.first?.total ?? 1
        return VStack(alignment: .leading, spacing: 8) {
            if itens.isEmpty {
                Text(IncidenciaDados.diplomas.isEmpty
                     ? "incidencia.json não está no bundle deste app."
                     : "Nenhum diploma com esse nome.")
                    .foregroundStyle(AppTheme.secondaryInk)
            }
            ForEach(itens) { d in
                Button { sel = d } label: {
                    HStack(spacing: 12) {
                        Text(d.nome).font(.system(size: 13.5, weight: .semibold)).foregroundStyle(AppTheme.ink)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Text("\(d.artigos) artigos").font(.system(size: 11.5, design: .monospaced)).foregroundStyle(AppTheme.secondaryInk)
                        GeometryReader { g in
                            ZStack(alignment: .leading) {
                                Capsule().fill(AppTheme.hairline)
                                Capsule().fill(ThemeState.t.accent).frame(width: g.size.width * CGFloat(d.total) / CGFloat(max))
                            }
                        }.frame(width: 110, height: 6)
                        Text("\(d.total)").font(.system(size: 12, weight: .bold, design: .monospaced)).foregroundStyle(AppTheme.ink)
                            .frame(width: 48, alignment: .trailing)
                    }
                    .padding(.horizontal, 15).padding(.vertical, 11)
                    .background(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).fill(AppTheme.surface))
                    .overlay(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).strokeBorder(AppTheme.hairline))
                }.buttonStyle(.plain)
            }
            nota
        }
    }

    private func detalhe(_ d: IncidenciaDiploma) -> some View {
        let arts = d.artigosOrdenados
        let alta = arts.filter { d.faixa($0.n) == .alta }.count
        let media = arts.filter { d.faixa($0.n) == .media }.count
        return VStack(alignment: .leading, spacing: 12) {
            Button { sel = nil } label: { Label("todos os diplomas", systemImage: "chevron.left") }
                .buttonStyle(.bordered)
            Text(d.nome).font(.system(size: 24, weight: .heavy)).tracking(-0.4).foregroundStyle(AppTheme.ink)
            HStack(spacing: 6) {
                Text("\(d.artigos) artigos citados · \(d.total) citações no acervo ·")
                Text("\(alta) alta").foregroundStyle(cAlta).bold()
                Text("· \(media) média").foregroundStyle(cMedia).bold()
                Text("· \(d.artigos - alta - media) baixa")
            }.font(.system(size: 12.5)).foregroundStyle(AppTheme.secondaryInk)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 58), spacing: 6)], spacing: 6) {
                ForEach(arts) { a in
                    let f = d.faixa(a.n)
                    let cor = f == .alta ? cAlta : f == .media ? cMedia : cBaixa
                    Button { abrirNaLei(d, artigo: a.numero) } label: {
                        VStack(spacing: 1) {
                            Text(a.numero).font(.system(size: 12.5, weight: .heavy, design: .monospaced))
                            Text("\(a.n)").font(.system(size: 9, weight: .bold)).opacity(0.75)
                        }
                        .frame(maxWidth: .infinity, minHeight: 50)
                        .foregroundStyle(cor)
                        .background(RoundedRectangle(cornerRadius: 9, style: .continuous).fill(cor.opacity(0.13)))
                        .overlay(RoundedRectangle(cornerRadius: 9, style: .continuous).strokeBorder(cor, lineWidth: 1.5))
                    }
                    .buttonStyle(.plain)
                    .help("art. \(a.numero) — \(a.n) citação(ões) no acervo")
                }
            }
            nota
        }
    }

    private var nota: some View {
        Text("Cada quadradinho é um artigo; o número pequeno é quantas vezes ele aparece citado nos verbetes de jurisprudência do app. Isto NÃO é frequência em prova — é incidência em julgado, que é outro sinal. Serve para atacar a lei pelos artigos que os tribunais realmente usam, em vez de ler do art. 1º ao fim.")
            .font(.system(size: 11.5)).foregroundStyle(AppTheme.secondaryInk).lineSpacing(3)
            .padding(.top, 8)
    }

    /// Clicar num artigo abre a LEI no leitor. Casamos pelo nome do catálogo (é o mesmo
    /// nome que o gerador leu do CátedraLEGIS web) — quando bate, abre; quando não, fica.
    private func abrirNaLei(_ d: IncidenciaDiploma, artigo: String) {
        guard let abrirLei else { return }
        let alvo = d.nome.folding(options: .diacriticInsensitive, locale: nil).lowercased()
        if let lei = store.laws.first(where: {
            $0.title.folding(options: .diacriticInsensitive, locale: nil).lowercased() == alvo
        }) { abrirLei(lei.id) }
    }
}

// MARK: - Prova oral sobre artigo de lei

struct ProvaOralLegisView: View {
    @EnvironmentObject var store: AppStore
    @State private var lei: LawEntry?
    @State private var busca = ""
    @State private var artigo = ""
    @State private var pergunta: String?
    @State private var resposta = ""
    @State private var carregando = false
    @State private var correcao: Correcao?
    @State private var erro: String?

    struct Correcao: Codable { var nota: String?; var acertou: [String]?; var faltou: [String]?; var modelo: String? }

    var body: some View {
        SectionShell(icon: "mic.fill", title: "Prova oral",
                     subtitle: "A IA pergunta sobre um artigo, você responde como na banca, ela corrige contra a lei",
                     search: lei == nil ? $busca : nil, searchPrompt: "Escolha a lei") {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if !CatedraIA.disponivel {
                        Text(CatedraIA.semIA).foregroundStyle(AppTheme.secondaryInk)
                    } else if let l = lei { sessao(l) } else { escolha }
                }.padding(22)
            }
        }
    }

    private var escolha: some View {
        let q = busca.lowercased()
        let leis = store.laws.filter { $0.isRegularLaw && (q.isEmpty || $0.title.lowercased().contains(q) || $0.reference.lowercased().contains(q)) }.prefix(60)
        return VStack(alignment: .leading, spacing: 8) {
            ForEach(Array(leis)) { l in
                Button { lei = l } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(l.title).font(.system(size: 13.5, weight: .semibold)).foregroundStyle(AppTheme.ink)
                        Text(l.reference).font(.system(size: 11.5)).foregroundStyle(AppTheme.secondaryInk)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 15).padding(.vertical, 10)
                    .background(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).fill(AppTheme.surface))
                    .overlay(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).strokeBorder(AppTheme.hairline))
                }.buttonStyle(.plain)
            }
        }
    }

    private func sessao(_ l: LawEntry) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Button { lei = nil; pergunta = nil; correcao = nil } label: { Label("outra lei", systemImage: "chevron.left") }.buttonStyle(.bordered)
                Text(l.title).font(.system(size: 17, weight: .bold)).foregroundStyle(AppTheme.ink)
            }
            HStack(spacing: 8) {
                TextField("Artigo (ex.: 489) — ou deixe em branco para a IA escolher", text: $artigo)
                    .textFieldStyle(.roundedBorder).frame(maxWidth: 380)
                Button(carregando ? "Formulando…" : "Perguntar") { Task { await perguntar(l) } }
                    .buttonStyle(.borderedProminent).tint(ThemeState.t.accent).disabled(carregando)
            }
            if let p = pergunta {
                Text(p).font(.system(size: 15.5, weight: .semibold)).lineSpacing(3).foregroundStyle(AppTheme.ink)
                    .padding(14).frame(maxWidth: .infinity, alignment: .leading)
                    .background(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).fill(ThemeState.t.accent.opacity(0.08)))
                TextEditor(text: $resposta).font(.system(size: 14)).frame(minHeight: 120)
                    .padding(8)
                    .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(AppTheme.surface))
                    .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(AppTheme.hairline))
                Button("Corrigir") { Task { await corrigir(l) } }
                    .buttonStyle(.borderedProminent).tint(ThemeState.t.accent)
                    .disabled(resposta.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                if let c = correcao { resultado(c) }
            }
            if let erro { Text(erro).font(.system(size: 12)).foregroundStyle(Color(hex: "#DC2626")) }
        }
    }

    private func textoDaLei(_ l: LawEntry) -> String {
        // O leitor guarda o texto baixado; para a IA basta um recorte generoso.
        String((store.loadText(for: l) ?? "").prefix(12000))
    }

    private func perguntar(_ l: LawEntry) async {
        carregando = true; erro = nil; correcao = nil; resposta = ""
        defer { carregando = false }
        let art = artigo.trimmingCharacters(in: .whitespaces)
        let prompt = """
        Você é examinador de prova oral de concurso da magistratura brasileira. Formule UMA pergunta de arguição sobre \(art.isEmpty ? "um artigo importante" : "o art. \(art)") da lei abaixo — direta, de uma ou duas frases, do jeito que um examinador pergunta em banca. Não dê a resposta. Não use markdown. Responda SOMENTE com a pergunta.

        LEI: \(l.title) — \(l.reference)
        TEXTO (recorte):
        \(textoDaLei(l))
        """
        do { pergunta = try await CatedraIA.texto(prompt) } catch { erro = error.localizedDescription }
    }
    private func corrigir(_ l: LawEntry) async {
        erro = nil
        let prompt = """
        Você é examinador de prova oral de concurso da magistratura brasileira. Corrija a resposta do candidato COMPARANDO com o texto da lei. Seja exigente e específico. Devolva SOMENTE um objeto JSON, sem cercas de código:
        {"nota": "boa" | "media" | "fraca", "acertou": ["…"], "faltou": ["…"], "modelo": "a resposta que a banca esperaria, em no máximo 5 linhas"}

        LEI: \(l.title) — \(l.reference)
        PERGUNTA: \(pergunta ?? "")
        TEXTO DA LEI (recorte):
        \(textoDaLei(l))

        RESPOSTA DO CANDIDATO:
        \(resposta)
        """
        do { correcao = try await CatedraIA.json(prompt, como: Correcao.self) } catch { erro = error.localizedDescription }
    }

    @ViewBuilder private func resultado(_ c: Correcao) -> some View {
        let nota = c.nota ?? ""
        let cor = nota == "boa" ? Color(hex: "#16A34A") : nota == "media" ? Color(hex: "#D97706") : Color(hex: "#DC2626")
        Text((nota == "boa" ? "Boa" : nota == "media" ? "Mediana" : "Fraca").uppercased())
            .font(.system(size: 11, weight: .heavy)).tracking(0.6)
            .padding(.horizontal, 10).padding(.vertical, 4)
            .background(Capsule().fill(cor.opacity(0.15))).foregroundStyle(cor)
        if let a = c.acertou, !a.isEmpty { bloco("Acertou", a.map { "• " + $0 }.joined(separator: "\n"), Color(hex: "#16A34A")) }
        if let f = c.faltou, !f.isEmpty { bloco("Faltou / saiu errado", f.map { "• " + $0 }.joined(separator: "\n"), Color(hex: "#DC2626")) }
        if let m = c.modelo, !m.isEmpty { bloco("O que a banca esperaria", m, AppTheme.secondaryInk) }
    }
    private func bloco(_ rot: String, _ txt: String, _ cor: Color) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(rot.uppercased()).font(.system(size: 10.5, weight: .bold)).tracking(1.4).foregroundStyle(AppTheme.secondaryInk)
            HStack(alignment: .top, spacing: 0) {
                RoundedRectangle(cornerRadius: 2).fill(cor).frame(width: 3)
                Text(txt).font(.system(size: 14)).lineSpacing(3).foregroundStyle(AppTheme.ink)
                    .padding(.horizontal, 13).padding(.vertical, 10)
                Spacer(minLength: 0)
            }
            .background(RoundedRectangle(cornerRadius: max(6, ThemeState.t.radius - 4), style: .continuous).fill(cor.opacity(0.09)))
        }
    }
}
