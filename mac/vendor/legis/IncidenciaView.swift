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
    struct Envelope: Codable { var diplomas: [String: IncidenciaDiploma]; var provas: [String: DiplomaProva]? }

    /// Incidência em PROVA (2ª fase): dos espelhos oficiais do banco de discursivas — quantas
    /// vezes cada artigo foi EXIGIDO por uma banca, por carreira e tribunal, com a prova de
    /// onde veio. Fonte pequena e verificável; não é estatística de objetivas.
    struct DiplomaProva: Codable, Identifiable {
        var id: String { nome }
        var nome: String
        var artigos: [String: ArtigoProva]
        struct ArtigoProva: Codable {
            var total: Int
            var carreiras: [String: Int]
            var orgaos: [String: Int]
            var provas: [Prova]
            struct Prova: Codable, Hashable { var id: String; var orgao: String; var ano: Int?; var carreira: String; var banca: String? }
        }
        var total: Int { artigos.values.reduce(0) { $0 + $1.total } }
        func total(carreira: String?) -> Int {
            guard let c = carreira else { return total }
            return artigos.values.reduce(0) { $0 + ($1.carreiras[c] ?? 0) }
        }
        func artigos(carreira: String?) -> [(numero: String, n: Int, a: ArtigoProva)] {
            artigos.compactMap { k, v in
                let n = carreira == nil ? v.total : (v.carreiras[carreira!] ?? 0)
                return n > 0 ? (k, n, v) : nil
            }.sorted { $0.n != $1.n ? $0.n > $1.n : ($0.numero.compare($1.numero, options: .numeric) == .orderedAscending) }
        }
    }
    private(set) static var provas: [DiplomaProva] = []
    static var carreiras: [String] {
        var c = Set<String>(); for d in provas { for a in d.artigos.values { c.formUnion(a.carreiras.keys) } }
        return c.sorted()
    }

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
            provas = (env.provas ?? [:]).values.sorted { $0.total > $1.total }
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
    @State private var modo: Modo = .julgados
    @State private var carreira: String? = nil
    @State private var selProva: IncidenciaDados.DiplomaProva?
    enum Modo: String, CaseIterable { case julgados = "Julgados", provas = "Provas (2ª fase)" }

    private let cAlta = Color(hex: "#DC2626"), cMedia = Color(hex: "#D97706"), cBaixa = Color(hex: "#3B82F6")

    var body: some View {
        SectionShell(icon: "target", title: "Incidência",
                     subtitle: "Por artigo: citações na jurisprudência do acervo e exigências em provas de 2ª fase, por carreira",
                     count: IncidenciaDados.diplomas.count,
                     search: sel == nil ? $busca : nil, searchPrompt: "Buscar diploma") {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    // Duas medidas, dois sinais: citação em JULGADO (acervo do JURIS) e
                    // exigência em PROVA (espelhos oficiais de 2ª fase, por carreira).
                    HStack(spacing: 10) {
                        Picker("", selection: $modo) { ForEach(Modo.allCases, id: \.self) { Text($0.rawValue).tag($0) } }
                            .pickerStyle(.segmented).frame(maxWidth: 320)
                        if modo == .provas {
                            Picker("Carreira", selection: $carreira) {
                                Text("Todas as carreiras").tag(String?.none)
                                ForEach(IncidenciaDados.carreiras, id: \.self) { Text($0).tag(String?.some($0)) }
                            }.pickerStyle(.menu)
                        }
                        Spacer()
                    }
                    .onChange(of: modo) { _, _ in sel = nil; selProva = nil }
                    if modo == .provas {
                        if let d = selProva { detalheProva(d) } else { listaProvas }
                    } else if let d = sel { detalhe(d) } else { lista }
                }
                .frame(maxWidth: .infinity, alignment: .leading)   // largura total, alinhado à esquerda
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
            LegisFlow(espacamento: 5) {
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

    private var listaProvas: some View {
        let q = busca.trimmingCharacters(in: .whitespaces).lowercased()
        let itens = IncidenciaDados.provas.filter { (q.isEmpty || $0.nome.lowercased().contains(q)) && $0.total(carreira: carreira) > 0 }
            .sorted { $0.total(carreira: carreira) > $1.total(carreira: carreira) }
        let max = itens.first.map { $0.total(carreira: carreira) } ?? 1
        return VStack(alignment: .leading, spacing: 8) {
            if itens.isEmpty {
                Text(IncidenciaDados.provas.isEmpty ? "Sem dados de prova no bundle (incidencia.json sem 'provas')." : "Nenhum diploma exigido nessa carreira.")
                    .foregroundStyle(AppTheme.secondaryInk)
            }
            ForEach(itens) { d in
                let t = d.total(carreira: carreira)
                Button { selProva = d } label: {
                    HStack(spacing: 12) {
                        Text(d.nome).font(.system(size: 13.5, weight: .semibold)).foregroundStyle(AppTheme.ink)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Text("\(d.artigos(carreira: carreira).count) artigos").font(.system(size: 11.5, design: .monospaced)).foregroundStyle(AppTheme.secondaryInk)
                        GeometryReader { g in
                            ZStack(alignment: .leading) {
                                Capsule().fill(AppTheme.hairline)
                                Capsule().fill(ThemeState.t.accent).frame(width: g.size.width * CGFloat(t) / CGFloat(max))
                            }
                        }.frame(width: 110, height: 6)
                        Text("\(t)").font(.system(size: 12, weight: .bold, design: .monospaced)).foregroundStyle(AppTheme.ink)
                            .frame(width: 48, alignment: .trailing)
                    }
                    .padding(.horizontal, 15).padding(.vertical, 11)
                    .background(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).fill(AppTheme.surface))
                    .overlay(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).strokeBorder(AppTheme.hairline))
                }.buttonStyle(.plain)
            }
            notaProva
        }
    }

    private func detalheProva(_ d: IncidenciaDados.DiplomaProva) -> some View {
        let arts = d.artigos(carreira: carreira)
        return VStack(alignment: .leading, spacing: 12) {
            Button { selProva = nil } label: { Label("todos os diplomas", systemImage: "chevron.left") }.buttonStyle(.bordered)
            Text(d.nome).font(.system(size: 24, weight: .heavy)).tracking(-0.4).foregroundStyle(AppTheme.ink)
            Text("\(arts.count) artigos exigidos · \(d.total(carreira: carreira)) exigências em espelhos oficiais" + (carreira.map { " · \($0)" } ?? ""))
                .font(.system(size: 12.5)).foregroundStyle(AppTheme.secondaryInk)
            ForEach(arts, id: \.numero) { a in
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Art. \(a.numero)").font(.system(size: 14, weight: .heavy, design: .monospaced)).foregroundStyle(AppTheme.ink)
                        Text("\(a.n)× em prova").font(.system(size: 11.5, weight: .bold)).foregroundStyle(ThemeState.t.accent)
                            .padding(.horizontal, 7).padding(.vertical, 2).background(Capsule().fill(ThemeState.t.accent.opacity(0.12)))
                        Spacer()
                        Button("Abrir na lei") { abrirNaLeiProva(d, artigo: a.numero) }.buttonStyle(.borderless).font(.caption)
                    }
                    LegisFlow(espacamento: 5) {
                        ForEach(a.a.carreiras.sorted { $0.value > $1.value }, id: \.key) { k, v in
                            Text("\(k): \(v)").font(.system(size: 11)).padding(.horizontal, 7).padding(.vertical, 2)
                                .background(Capsule().fill(AppTheme.hairline.opacity(0.5)))
                        }
                    }
                    Text(a.a.provas.filter { carreira == nil || $0.carreira == carreira! }
                            .map { "\($0.orgao) \($0.ano.map(String.init) ?? "")" + (($0.banca ?? "").isEmpty ? "" : " (\($0.banca!))") }
                            .joined(separator: " · "))
                        .font(.system(size: 11.5)).foregroundStyle(AppTheme.secondaryInk)
                }
                .padding(12)
                .background(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).fill(AppTheme.surface))
                .overlay(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).strokeBorder(AppTheme.hairline))
            }
            notaProva
        }
    }

    private var notaProva: some View {
        Text("Fonte: espelhos de correção OFICIAIS das provas de 2ª fase do banco do Cátedra (magistratura estadual e federal, por tribunal e banca). Conta quantas vezes a banca EXIGIU o dispositivo num quesito — cada número aponta para uma prova real. Não é estatística de questões objetivas: para isso, abra o artigo e use \"Questões de concurso\", que busca na sua conta do TEC/QConcursos.")
            .font(.system(size: 11.5)).foregroundStyle(AppTheme.secondaryInk).lineSpacing(3).padding(.top, 8)
    }

    private func abrirNaLeiProva(_ d: IncidenciaDados.DiplomaProva, artigo: String) {
        guard let abrirLei else { return }
        let alvo = d.nome.folding(options: .diacriticInsensitive, locale: nil).lowercased()
        if let lei = store.laws.first(where: { $0.title.folding(options: .diacriticInsensitive, locale: nil).lowercased() == alvo }) { abrirLei(lei.id) }
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

// MARK: - Prova oral sobre artigo de lei — formato de ARGUIÇÃO de banca

/// Fluxo: matéria → norma → (artigo específico ou sorteio) → o ARTIGO APARECE na tela →
/// pergunta no tom do examinador (caso hipotético com o núcleo trocado, fundamento e
/// ratio, "complete e explique", exceções, aplicação a caso) → resposta → correção
/// estruturada contra o texto oficial, com auditoria dos dispositivos citados. Sem IA.
struct ProvaOralLegisView: View {
    @EnvironmentObject var store: AppStore
    @State private var categoria: LawCategory? = nil
    @State private var lei: LawEntry?
    @State private var busca = ""
    @State private var artigo = ""
    @State private var unidade: LawUnit?
    @State private var variante = 0
    @State private var pergunta: String = ""
    @State private var resposta = ""
    @State private var correcao: Correcao?
    @State private var erro: String?
    @State private var historico: [(artigo: String, nota: String)] = []

    struct Correcao: Codable { var nota: String?; var acertou: [String]?; var faltou: [String]?; var modelo: String? }

    private var leis: [LawEntry] {
        let q = busca.folding(options: .diacriticInsensitive, locale: nil).lowercased()
        return store.laws.filter { $0.isRegularLaw && (categoria == nil || $0.category == categoria!) &&
            (q.isEmpty || $0.title.folding(options: .diacriticInsensitive, locale: nil).lowercased().contains(q) || $0.reference.lowercased().contains(q)) }
    }

    var body: some View {
        SectionShell(icon: "mic.fill", title: "Prova oral",
                     subtitle: "Arguição sobre a lei seca: o examinador aponta o dispositivo, faz a pergunta como na banca e corrige contra o texto oficial — sem IA",
                     search: lei == nil ? $busca : nil, searchPrompt: "Buscar norma") {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if let l = lei { sessao(l) } else { escolha }
                }.padding(22).frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    // MARK: escolha da norma
    private var escolha: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Matéria").font(.system(size: 11, weight: .heavy)).tracking(1).foregroundStyle(AppTheme.secondaryInk)
            LegisFlow {
                chip("Todas", on: categoria == nil) { categoria = nil }
                ForEach(LawCategory.allCases) { c in chip(c.rawValue, on: categoria == c) { categoria = c } }
            }
            Text("Norma").font(.system(size: 11, weight: .heavy)).tracking(1).foregroundStyle(AppTheme.secondaryInk)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 240), spacing: 10)], spacing: 10) {
                ForEach(leis.prefix(80)) { l in
                    Button { lei = l; sortear(l) } label: {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(l.title).font(.system(size: 13.5, weight: .bold)).foregroundStyle(AppTheme.ink).lineLimit(2)
                            Text(l.reference).font(.system(size: 11)).foregroundStyle(AppTheme.secondaryInk).lineLimit(1)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading).padding(13)
                        .background(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).fill(AppTheme.surface))
                        .overlay(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).strokeBorder(AppTheme.hairline))
                    }.buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: sessão de arguição
    private func sessao(_ l: LawEntry) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Button { lei = nil; unidade = nil; pergunta = ""; correcao = nil } label: { Label("outra norma", systemImage: "chevron.left") }.buttonStyle(.bordered)
                Text(l.title).font(.system(size: 20, weight: .heavy)).tracking(-0.3).foregroundStyle(AppTheme.ink)
                Spacer()
            }
            HStack(spacing: 8) {
                TextField("Artigo (ex.: 489)", text: $artigo).textFieldStyle(.roundedBorder).frame(maxWidth: 180)
                Button("Arguir este artigo") { escolher(l, numero: artigo) }.buttonStyle(.bordered).disabled(artigo.trimmingCharacters(in: .whitespaces).isEmpty)
                Button { sortear(l) } label: { Label("Sortear artigo", systemImage: "dice") }.buttonStyle(.borderedProminent).tint(ThemeState.t.accent)
                if !historico.isEmpty {
                    Text("Nesta sessão: " + historico.map { "\($0.artigo) \($0.nota == "boa" ? "✓" : $0.nota == "media" ? "~" : "✗")" }.joined(separator: "  "))
                        .font(.system(size: 11.5)).foregroundStyle(AppTheme.secondaryInk)
                }
            }
            if let erro { Text(erro).font(.system(size: 12.5)).foregroundStyle(Color(hex: "#DC2626")) }
            if let u = unidade {
                // O DISPOSITIVO — o examinador aponta, a pessoa vê.
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Dispositivo apontado pela banca").font(.system(size: 10.5, weight: .heavy)).tracking(1.2).foregroundStyle(AppTheme.secondaryInk)
                        Spacer()
                        if let c = u.context, !c.isEmpty { Text(c).font(.system(size: 10.5)).foregroundStyle(AppTheme.secondaryInk).lineLimit(1) }
                    }
                    Text(u.label).font(.system(size: 18, weight: .heavy, design: .serif)).foregroundStyle(ThemeState.t.accent)
                    Text(u.lines.joined(separator: "\n")).font(.system(size: 14.5, design: .serif)).lineSpacing(4).foregroundStyle(AppTheme.ink).textSelection(.enabled)
                }
                .padding(16)
                .background(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).fill(AppTheme.surface))
                .overlay(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).strokeBorder(ThemeState.t.accent.opacity(0.35), lineWidth: 1.5))

                // A PERGUNTA, no tom da banca
                VStack(alignment: .leading, spacing: 8) {
                    Text("Examinador").font(.system(size: 10.5, weight: .heavy)).tracking(1.2).foregroundStyle(ThemeState.t.accent)
                    Text(pergunta).font(.system(size: 16, weight: .semibold)).lineSpacing(4).foregroundStyle(AppTheme.ink)
                    Text("Responda como responderia à banca: posição, fundamento (artigo/§/inciso), exceções e um exemplo. 2 a 3 minutos.")
                        .font(.system(size: 12)).foregroundStyle(AppTheme.secondaryInk)
                }
                .padding(16).frame(maxWidth: .infinity, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: ThemeState.t.radius, style: .continuous).fill(ThemeState.t.accent.opacity(0.08)))

                TextEditor(text: $resposta).font(.system(size: 14.5)).frame(minHeight: 150)
                    .padding(10)
                    .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(AppTheme.surface))
                    .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(AppTheme.hairline))
                HStack(spacing: 10) {
                    Button("Corrigir") { corrigir(l, u) }
                        .buttonStyle(.borderedProminent).tint(ThemeState.t.accent)
                        .disabled(resposta.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    Button("Outra pergunta sobre este artigo") { variante += 1; pergunta = LegisOralLocal.perguntaBanca(lei: l, unit: u, variante: variante); correcao = nil }.buttonStyle(.bordered)
                    Button("Próximo artigo") { sortear(l) }.buttonStyle(.bordered)
                }
                if let c = correcao { resultado(c) }
            }
        }
    }

    private func unidades(_ l: LawEntry) -> [LawUnit] {
        guard let t = store.loadText(for: l) else { return [] }
        return ArticleStudyView.collapseRedactions(LawParser.parse(t)).units.filter { $0.label.lowercased().hasPrefix("art") }
    }
    private func sortear(_ l: LawEntry) {
        erro = nil; correcao = nil; resposta = ""; variante = 0
        let us = unidades(l).filter { $0.lines.joined().count >= 80 }
        guard let u = us.randomElement() else { erro = "O texto desta norma ainda não foi baixado — abra-a no leitor primeiro."; unidade = nil; return }
        unidade = u; pergunta = LegisOralLocal.perguntaBanca(lei: l, unit: u, variante: 0)
    }
    private func escolher(_ l: LawEntry, numero: String) {
        erro = nil; correcao = nil; resposta = ""; variante = 0
        let n = numero.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: ".", with: "").uppercased()
        guard let u = unidades(l).first(where: { ArticleStudyView.articleNumberKey($0.label).uppercased() == n }) else {
            erro = "Não achei o art. \(numero) nesta norma."; return
        }
        unidade = u; pergunta = LegisOralLocal.perguntaBanca(lei: l, unit: u, variante: 0)
    }
    private func corrigir(_ l: LawEntry, _ u: LawUnit) {
        let c = LegisOralLocal.corrigir(base: u.lines.joined(separator: "\n"), resposta: resposta, lei: l, unit: u)
        correcao = c
        historico.append((u.label, c.nota ?? "fraca"))
    }

    @ViewBuilder private func resultado(_ c: Correcao) -> some View {
        let nota = c.nota ?? ""
        let cor = nota == "boa" ? Color(hex: "#16A34A") : nota == "media" ? Color(hex: "#D97706") : Color(hex: "#DC2626")
        Text((nota == "boa" ? "Resposta consistente" : nota == "media" ? "Resposta parcial" : "Resposta insuficiente").uppercased())
            .font(.system(size: 11, weight: .heavy)).tracking(0.6)
            .padding(.horizontal, 10).padding(.vertical, 4)
            .background(Capsule().fill(cor.opacity(0.15))).foregroundStyle(cor)
        if let a = c.acertou, !a.isEmpty { bloco("O que você acertou", a.map { "• " + $0 }.joined(separator: "\n"), Color(hex: "#16A34A")) }
        if let f = c.faltou, !f.isEmpty { bloco("O que faltou ou saiu errado", f.map { "• " + $0 }.joined(separator: "\n"), Color(hex: "#DC2626")) }
        if let m = c.modelo, !m.isEmpty { bloco("O que a banca esperaria ouvir (texto oficial)", m, AppTheme.secondaryInk) }
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
    private func chip(_ t: String, on: Bool, _ act: @escaping () -> Void) -> some View {
        Button(action: act) {
            Text(t).font(.system(size: 12, weight: .semibold)).padding(.horizontal, 10).padding(.vertical, 5)
                .background(Capsule().fill(on ? ThemeState.t.accent : AppTheme.hairline.opacity(0.35)))
                .foregroundStyle(on ? Color.white : AppTheme.ink)
        }.buttonStyle(.plain)
    }
}

// MARK: - Prova oral LOCAL do LEGIS — sem IA, sem custo, sem depender de rede.
// Acha o trecho do artigo pedido no PRÓPRIO texto baixado da lei e corrige por
// cobertura de termos-chave contra esse trecho. Mesma ideia do motor do JURIS
// (ProvaOralLocal), mas independente — LEGIS e JURIS são módulos separados.
@MainActor
enum LegisOralLocal {
    private static let stop: Set<String> = ["de","do","da","dos","das","e","em","a","o","os","as",
        "no","na","nos","nas","ao","à","com","por","para","que","não","um","uma","art","artigo",
        "lei","sobre","entre","ser","é","se","direito","seu","sua","seus","suas","ou","mais",
        "inciso","paragrafo","paragrafos","caput"]

    private static func normaliza(_ s: String) -> String {
        s.folding(options: .diacriticInsensitive, locale: Locale(identifier: "pt_BR")).lowercased()
    }
    /// Tira marcação HTML (o texto baixado do leitor guarda tags) e reduz espaços.
    private static func textoLimpo(_ html: String) -> String {
        var s = html.replacingOccurrences(of: "<[^>]+>", with: " ", options: .regularExpression)
        s = s.replacingOccurrences(of: "&nbsp;", with: " ")
            .replacingOccurrences(of: "&amp;", with: "&")
        s = s.replacingOccurrences(of: "[ \\t]+", with: " ", options: .regularExpression)
        return s.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Acha o trecho do artigo pedido (ou, sem artigo, um trecho qualquer com tamanho
    /// razoável, escolhido de forma determinística pelo id da lei + dia — muda todo dia,
    /// mas não a cada toque). Devolve a pergunta pronta e o trecho usado na correção.
    static func pergunta(lei: LawEntry, texto bruto: String, artigo: String) -> (pergunta: String, trecho: String) {
        let texto = textoLimpo(bruto)
        let art = artigo.trimmingCharacters(in: .whitespaces)

        if !art.isEmpty {
            let padrao = "[Aa]rt(?:igo)?\\.?\\s*\(NSRegularExpression.escapedPattern(for: art))\\b"
            if let re = try? NSRegularExpression(pattern: padrao),
               let m = re.firstMatch(in: texto, range: NSRange(texto.startIndex..., in: texto)),
               let r = Range(m.range, in: texto) {
                let ini = r.lowerBound
                // corta no PRÓXIMO "Art." depois deste, ou em ~700 caracteres — o que vier antes
                let restante = texto[ini...]
                var fim = texto.index(ini, offsetBy: min(700, texto.distance(from: ini, to: texto.endIndex)))
                if let re2 = try? NSRegularExpression(pattern: "[Aa]rt(?:igo)?\\.?\\s*\\d"),
                   let depois = texto.index(ini, offsetBy: 6, limitedBy: texto.endIndex),
                   let m2 = re2.firstMatch(in: String(texto[depois...]), range: NSRange(String(texto[depois...]).startIndex..., in: String(texto[depois...]))),
                   let r2 = Range(m2.range, in: String(texto[depois...])) {
                    let cand = texto.index(depois, offsetBy: String(texto[depois...]).distance(from: String(texto[depois...]).startIndex, to: r2.lowerBound))
                    if cand < fim { fim = cand }
                }
                let trecho = String(texto[ini..<fim]).trimmingCharacters(in: .whitespacesAndNewlines)
                _ = restante
                return ("O que dispõe o art. \(art) da \(lei.title)? Explique com suas palavras — o essencial, não decoreba.", trecho)
            }
            return ("Não achei o art. \(art) no texto baixado desta lei — tente outro número, ou deixe em branco para a plataforma escolher.", "")
        }

        // Sem artigo: um trecho determinístico (muda por dia, não a cada abertura).
        let paragrafos = texto.components(separatedBy: "\n").map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { $0.count >= 120 && $0.count <= 900 }
        guard !paragrafos.isEmpty else {
            return ("O texto desta lei ainda não foi baixado — abra-a no leitor primeiro.", "")
        }
        let df = DateFormatter(); df.dateFormat = "yyyy-MM-dd"
        var h: UInt32 = 2166136261
        for b in (lei.id.uuidString + df.string(from: Date())).utf8 { h ^= UInt32(b); h = h &* 16777619 }
        let trecho = paragrafos[Int(h) % paragrafos.count]
        return ("Sobre este trecho de \(lei.title), explique o que ele dispõe e por quê.", trecho)
    }

    /// Pergunta no tom da banca sobre UM artigo (LawUnit), com variantes:
    ///   0 caso hipotético — o examinador apresenta o texto com o NÚCLEO TROCADO como tese
    ///     da parte e pergunta se procede (a inversão é a mesma do simulado/baralho);
    ///   1 fundamento e ratio; 2 lacuna ("complete e explique"); 3 exceções/aplicação;
    ///   4 abertura. Nada inventado: só o texto oficial no molde.
    static func perguntaBanca(lei: LawEntry, unit u: LawUnit, variante: Int) -> String {
        let props = SimuladoLegisLocal.proposicoes(u)
        let base = props.first?.texto ?? textoLimpo(u.lines.joined(separator: " "))
        let nome = RemissiveIndex.shortName(lei)
        var f: [String] = []
        if let falsa = Exporter.afirmacaoFalsaAuto(base), falsa != base {
            let papel = ["a defesa, em sustentação oral,", "o recorrente", "a parte autora", "o Ministério Público, em parecer,", "o juízo de primeiro grau"][abs(u.key.hashValue) % 5]
            f.append("Candidato(a), um caso chega ao seu gabinete. \(papel.prefix(1).uppercased() + papel.dropFirst()) sustenta que \(falsa.prefix(1).lowercased() + falsa.dropFirst()) A tese encontra amparo no \(u.label) da \(nome)? Decida e fundamente.")
        }
        f.append("Qual é a regra do \(u.label) da \(nome), qual a razão de ser dela e onde ela se encaixa no sistema da norma? Cite os dispositivos correlatos.")
        if let lac = Exporter.melhorLacuna(base) {
            let ns = base as NSString
            let oculta = ns.replacingCharacters(in: lac, with: "_______")
            f.append("Complete e explique: “\(oculta)” — e diga por que o legislador fixou exatamente isso.")
        }
        f.append("O \(u.label) da \(nome) comporta exceção? Em que hipóteses ele não se aplica, e como o(a) senhor(a) o aplicaria a um caso concreto?")
        if props.count > 1 {
            f.append("O \(u.label) traz um rol. Esse rol é taxativo ou exemplificativo? Enumere os itens que o(a) senhor(a) lembra e explique o critério que os une.")
        }
        return f[((variante % f.count) + f.count) % f.count]
    }

    /// Correção estruturada: cobertura de termos-chave + auditoria dos dispositivos citados
    /// (o que a resposta cita que o artigo não traz; o que o artigo traz e a resposta omitiu).
    static func corrigir(base texto: String, resposta: String, lei: LawEntry, unit u: LawUnit) -> ProvaOralLegisView.Correcao {
        var c = corrigir(base: texto, resposta: resposta)
        let citados = RoteiroLocal.fundamentos(resposta)
        let numero = ArticleStudyView.articleNumberKey(u.label)
        let nome = RemissiveIndex.shortName(lei).lowercased()
        let proprios = citados.filter { $0.lowercased().contains("art") && $0.replacingOccurrences(of: ".", with: "").contains(numero) }
        let outros = citados.filter { !proprios.contains($0) }
        if !proprios.isEmpty { c.acertou = (c.acertou ?? []) + ["Citou o dispositivo certo: " + proprios.joined(separator: "; ")] }
        else { c.faltou = (c.faltou ?? []) + ["Não citou o \(u.label) da \(nome.uppercased()) — na oral, o número do dispositivo é o que ancora a resposta."] }
        if !outros.isEmpty { c.acertou = (c.acertou ?? []) + ["Também citou: " + outros.joined(separator: "; ") + " — confira se dialogam com o artigo (o verbete não os traz)."] }
        return c
    }

    /// Corrige por cobertura de termos-chave do trecho contra a resposta do candidato.
    static func corrigir(base texto: String, resposta: String) -> ProvaOralLegisView.Correcao {
        guard !texto.isEmpty else {
            return ProvaOralLegisView.Correcao(nota: "fraca", acertou: nil,
                faltou: ["Não achei o trecho da lei para comparar — tente outro artigo."], modelo: nil)
        }
        let brutos = texto.split(whereSeparator: { !$0.isLetter && !$0.isNumber })
            .map { normaliza(String($0)) }
            .filter { $0.count >= 5 && !stop.contains($0) }
        var vistos = Set<String>(), chave: [String] = []
        for t in brutos where !vistos.contains(t) { vistos.insert(t); chave.append(t); if chave.count >= 14 { break } }
        let respN = normaliza(resposta)
        let acertou = chave.filter { respN.contains($0) }
        let faltou = chave.filter { !respN.contains($0) }
        let cobertura = chave.isEmpty ? 0 : Double(acertou.count) / Double(chave.count)
        let nota = cobertura >= 0.6 ? "boa" : (cobertura >= 0.3 ? "media" : "fraca")
        return ProvaOralLegisView.Correcao(
            nota: nota,
            acertou: acertou.isEmpty ? nil : ["Mencionou: " + acertou.prefix(6).joined(separator: ", ")],
            faltou: faltou.isEmpty ? nil : ["Não apareceu na resposta: " + faltou.prefix(6).joined(separator: ", ")],
            modelo: texto
        )
    }
}

// MARK: - Flow (fileira que QUEBRA de linha) — corrige o estouro de largura no iPad.
// Fileiras de etiquetas/KPIs eram HStack rígido: cabiam no Mac (janela larga) e
// ultrapassavam a borda no iPad, sobretudo em retrato ou com a barra lateral aberta,
// porque HStack nunca quebra linha sozinho. Layout protocol (iOS 16+) resolve sem
// depender de largura fixa nem de ScrollView horizontal escondendo conteúdo.
struct LegisFlow: Layout {
    var espacamento: CGFloat = 6
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let largura = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, alturaLinha: CGFloat = 0
        for v in subviews {
            let t = v.sizeThatFits(.unspecified)
            if x > 0 && x + t.width > largura { x = 0; y += alturaLinha + espacamento; alturaLinha = 0 }
            x += t.width + espacamento
            alturaLinha = max(alturaLinha, t.height)
        }
        return CGSize(width: largura, height: y + alturaLinha)
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x: CGFloat = bounds.minX, y: CGFloat = bounds.minY, alturaLinha: CGFloat = 0
        for v in subviews {
            let t = v.sizeThatFits(.unspecified)
            if x > bounds.minX && x + t.width > bounds.maxX { x = bounds.minX; y += alturaLinha + espacamento; alturaLinha = 0 }
            v.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(t))
            x += t.width + espacamento
            alturaLinha = max(alturaLinha, t.height)
        }
    }
}
