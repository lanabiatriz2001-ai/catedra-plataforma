import SwiftUI
import AppKit
import UniformTypeIdentifiers

/// Cartão claro e limpo para exportar um verbete como PDF/imagem (independe do tema).
struct CartaoExport: View {
    let entry: JurisEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Text(entry.fonteKind.nome.uppercased())
                    .font(.system(size: 10, weight: .bold)).tracking(0.6)
                    .foregroundStyle(Color(hex: "#4F46E5"))
                if let s = entry.situacao {
                    Text(s.uppercased()).font(.system(size: 9, weight: .bold))
                        .foregroundStyle(Color(hex: "#1F7A5A"))
                }
                Spacer()
            }
            Text(entry.titulo)
                .font(.system(size: 26, weight: .bold, design: .serif))
                .foregroundStyle(Color(hex: "#0F1B2D"))
            if let t = entry.tema, t != entry.titulo {
                Text(t).font(.system(size: 13, design: .serif)).italic()
                    .foregroundStyle(Color(hex: "#6B7488"))
            }
            Rectangle().fill(Color(hex: "#4F46E5")).frame(width: 46, height: 2)
            Text(entry.enunciado)
                .font(.system(size: 15, design: .serif))
                .foregroundStyle(Color(hex: "#14233A"))
                .lineSpacing(6)
                .fixedSize(horizontal: false, vertical: true)
            if let p = entry.precedentes, !p.isEmpty {
                Text(p).font(.system(size: 11)).foregroundStyle(Color(hex: "#6B7488"))
                    .lineLimit(3).fixedSize(horizontal: false, vertical: true)
            }
            HStack {
                Text("Vade Mecum de Jurisprudência")
                    .font(.system(size: 9, weight: .semibold)).foregroundStyle(Color(hex: "#4F46E5"))
                Spacer()
                if let d = entry.data { Text(d).font(.system(size: 9)).foregroundStyle(Color(hex: "#6B7488")) }
            }
            .padding(.top, 4)
        }
        .padding(28)
        .frame(width: 640, alignment: .leading)
        .background(Color.white)
    }
}

/// Tipos de card gerados para o Anki — casam com os modelos de nota da usuária
/// (nomes e campos lidos da coleção real: Basic[Front,Back], Aulão[Frente,Verso],
/// Basic - Certo e Errado[Front,Gabarito,Back], Cloze[Text,Back Extra],
/// Cloze - Digite a Resposta[Text,Back Extra]).
enum AnkiTipo: String, CaseIterable, Identifiable {
    case basic, aulao, certoErrado, cloze, clozeDigite, leiJuris
    var id: String { rawValue }
    var nome: String {
        switch self {
        case .basic: return "Basic (pergunta → resposta)"
        case .aulao: return "Aulão (card completo de estudo)"
        case .certoErrado: return "Basic – Certo e Errado"
        case .cloze: return "Cloze (omissão de palavras)"
        case .clozeDigite: return "Cloze – Digite a Resposta"
        case .leiJuris: return "Lei & Jurisprudência (modelo rico)"
        }
    }
    var descricao: String {
        switch self {
        case .basic: return "Frente com a pergunta; verso com o enunciado e a fonte."
        case .aulao: return "Frente com a identificação; verso com enunciado, referências e precedentes."
        case .certoErrado: return "Afirmação + gabarito Certo/Errado. Os cards ERRADO são gerados automaticamente invertendo a tese."
        case .cloze: return "Oculta os termos-chave do enunciado ({{c1::…}}). Só para textos curtos."
        case .clozeDigite: return "Uma lacuna única para você digitar a resposta. Só para textos curtos."
        case .leiJuris: return "Mesmo modelo do seu vade de leis: campos Súmula/Jurisprudência/Tese com status."
        }
    }
    /// Nome EXATO do modelo de nota no Anki (usado no cabeçalho #notetype).
    var notetype: String {
        switch self {
        case .basic: return "Basic"
        case .aulao: return "Aulão"
        case .certoErrado: return "Basic - Certo e Errado"
        case .cloze: return "Cloze"
        case .clozeDigite: return "Cloze - Digite a Resposta"
        case .leiJuris: return "Lei & Jurisprudência"
        }
    }
    var ehCloze: Bool { self == .cloze || self == .clozeDigite }
    /// nº de campos de conteúdo (a coluna de tags vem logo depois).
    var nCampos: Int {
        switch self {
        case .certoErrado: return 3
        case .leiJuris: return 12
        default: return 2
        }
    }
    var arquivo: String {
        switch self {
        case .basic: return "basic"
        case .aulao: return "aulao"
        case .certoErrado: return "certo-errado"
        case .cloze: return "cloze"
        case .clozeDigite: return "cloze-digite"
        case .leiJuris: return "lei-jurisprudencia"
        }
    }
}

@MainActor
enum Exporter {
    // MARK: Anki — múltiplos tipos de card

    private static func limpa(_ s: String) -> String {
        s.replacingOccurrences(of: "\t", with: " ")
         .replacingOccurrences(of: "\r", with: " ")
         .replacingOccurrences(of: "\n", with: "<br>")
    }

    private static func tags(_ e: JurisEntry) -> String {
        func slug(_ s: String) -> String {
            s.replacingOccurrences(of: "/", with: "-")
             .replacingOccurrences(of: " ", with: "_")
             .replacingOccurrences(of: "\"", with: "")
        }
        return [e.fonteKind.nomeCurto, e.ramoDireito ?? "", e.situacao ?? ""]
            .filter { !$0.isEmpty }
            .map { "Juris::" + slug($0) }
            .joined(separator: " ")
    }

    /// Pista curta para a frente do card (evita despejar questões longas de IRDR/IAC).
    private static func pista(_ e: JurisEntry, limite: Int) -> String {
        if let t = e.tema, !t.isEmpty, t != e.titulo, t.count <= limite {
            return "<br><i>\(t)</i>"
        }
        return ""
    }

    private static func perguntaBasico(_ e: JurisEntry) -> String {
        switch e.fonteKind {
        case .sumulaSTF, .sumulaSTJ, .sumulaTSE:
            return "O que enuncia a \(e.titulo) do \(e.tribunal)?"
        case .repercussaoGeral, .repetitivo, .tjroPrec:
            let trib = e.titulo.contains(e.tribunal) ? "" : " — \(e.tribunal)"
            return "\(e.titulo)\(trib): qual a tese/entendimento fixado?" + pista(e, limite: 160)
        default:
            // tema curto vira a pista; tema longo cai para o título (não despeja o texto inteiro)
            let base = (e.tema.flatMap { $0.count <= 140 && $0 != e.titulo ? $0 : nil }) ?? e.titulo
            return "\(base) (\(e.tribunal)): qual o entendimento?"
        }
    }

    private static func versoBasico(_ e: JurisEntry) -> String {
        var v = e.enunciado
        if let p = e.precedentes, !p.isEmpty {
            let curto = p.count > 320 ? String(p.prefix(320)) + "…" : p
            v += "<br><br><span style=\"color:#8a8a8a;font-size:11px\">\(curto)</span>"
        }
        v += "<br><br><b>\(e.titulo)</b> · \(e.tribunal)"
        if let d = e.data { v += " · \(d)" }
        return v
    }

    /// Monta as 12 colunas do modelo "Lei & Jurisprudência" na ordem exata dos campos:
    /// Referência, Frente, Verso, LeiSeca, LiteralidadeLei, Jurisprudência, Súmula, Tese,
    /// _LeiHash, _LeiData, _StatusLei, _StatusSúmula. Roteia o enunciado p/ Súmula (se for
    /// súmula) ou Jurisprudência, e a situação p/ _StatusSúmula (badge de status no template).
    private static func linhaLeiJuris(_ e: JurisEntry) -> String {
        let ehSumula = [Fonte.sumulaSTF, .sumulaSTJ, .sumulaTSE, .tjro].contains(e.fonteKind)
        let ehTese = [Fonte.repercussaoGeral, .repetitivo, .jurisEmTeses, .tjroPrec].contains(e.fonteKind)
        var ref = "\(e.titulo) · \(e.tribunal)"
        if let d = e.data { ref += " · \(d)" }
        let sumula = ehSumula ? e.enunciado : ""
        let juris  = ehSumula ? "" : e.enunciado
        let tese   = ehTese ? e.enunciado : ""
        let verso  = (e.observacao?.isEmpty == false ? e.observacao! :
                        (e.precedentes?.isEmpty == false ? e.precedentes! : ""))
        let statusSum = ehSumula ? (e.situacao ?? "") : (e.situacao ?? "")
        // ordem dos 12 campos:
        let campos = [ref, perguntaBasico(e), verso, "", "", juris, sumula, tese, "", "", "", statusSum]
        return campos.map(limpa).joined(separator: "\t")
    }

    /// Frente do "Aulão": identificação do julgado + tema (curto).
    private static func frenteAulao(_ e: JurisEntry) -> String {
        var f = "<b>\(e.titulo)</b> · \(e.tribunal)"
        if let t = e.tema, !t.isEmpty, t != e.titulo {
            let curto = t.count > 200 ? String(t.prefix(200)) + "…" : t
            f += "<br><i>\(curto)</i>"
        }
        return f
    }

    /// Verso do "Aulão": enunciado + referências + precedentes + situação.
    private static func versoAulao(_ e: JurisEntry) -> String {
        var v = e.enunciado
        if let r = e.referencias, !r.isEmpty { v += "<br><br><b>Refs.:</b> \(r)" }
        if let p = e.precedentes, !p.isEmpty {
            let curto = p.count > 320 ? String(p.prefix(320)) + "…" : p
            v += "<br><br><span style=\"color:#8a8a8a;font-size:11px\">\(curto)</span>"
        }
        if let s = e.situacao, !s.isEmpty { v += "<br><br><i>\(s)</i>" }
        return v
    }

    /// Envolve até `maxClozes` termos-chave do enunciado como {{c1::…}}. nil se nenhum.
    static func clozeDoEnunciado(_ e: JurisEntry, maxClozes: Int = 4) -> String? {
        let ns = e.enunciado as NSString
        var achados: [NSRange] = []
        for t in TermIndex.termos where t.count >= 4 {
            let r = ns.range(of: t, options: [.caseInsensitive, .diacriticInsensitive])
            if r.location != NSNotFound { achados.append(r) }
        }
        achados.sort { $0.location < $1.location }
        var selec: [NSRange] = []
        for r in achados where selec.allSatisfy({ NSIntersectionRange($0, r).length == 0 }) {
            selec.append(r); if selec.count >= maxClozes { break }
        }
        guard !selec.isEmpty else { return nil }
        var out = ""; var idx = 0; var c = 0
        for r in selec {
            out += ns.substring(with: NSRange(location: idx, length: r.location - idx))
            c += 1
            out += "{{c\(c)::\(ns.substring(with: r))}}"
            idx = r.location + r.length
        }
        out += ns.substring(from: idx)
        return out
    }

    /// Gera um arquivo TSV por tipo de card selecionado.
    /// `falsas` = afirmações erradas escritas pela usuária (id → texto), para gerar cards "ERRADO".
    /// Constrói o texto Cloze do Anki a partir das lacunas marcadas no enunciado.
    /// `agrupado`: todas as lacunas viram c1 (um card só, p/ "Digite a Resposta");
    /// senão c1, c2, c3… (um card por lacuna). Retorna nil se não houver lacuna.
    static func clozeDeMarcas(_ enunciado: String, _ marcas: [TextMark]?, agrupado: Bool) -> String? {
        guard let marcas, !marcas.isEmpty else { return nil }
        let ns = enunciado as NSString
        // só lacunas dentro do texto, ordenadas, sem sobreposição
        var rs = marcas.map(\.range)
            .filter { $0.length > 0 && $0.location >= 0 && $0.location + $0.length <= ns.length }
            .sorted { $0.location < $1.location }
        guard !rs.isEmpty else { return nil }
        var limpo: [NSRange] = []
        for r in rs where (limpo.last.map { NSMaxRange($0) <= r.location } ?? true) { limpo.append(r) }
        rs = limpo
        var resultado = ""; var cursor = 0; var n = 1
        for r in rs {
            if r.location > cursor { resultado += ns.substring(with: NSRange(location: cursor, length: r.location - cursor)) }
            let trecho = ns.substring(with: r)
            resultado += "{{c\(agrupado ? 1 : n)::\(trecho)}}"
            cursor = NSMaxRange(r); n += 1
        }
        if cursor < ns.length { resultado += ns.substring(with: NSRange(location: cursor, length: ns.length - cursor)) }
        return resultado
    }

    static func gerarAnkiArquivos(_ entries: [JurisEntry], tipos: Set<AnkiTipo>,
                                  falsas: [String: String] = [:],
                                  autoErrado: Bool = false,
                                  clozes: [String: [TextMark]] = [:],
                                  nomes: [AnkiTipo: String] = [:]) -> [(nome: String, conteudo: String)] {
        // A coluna de tags vem sempre depois dos campos de conteúdo.
        func cabecalho(_ t: AnkiTipo) -> [String] {
            let nt = nomes[t]?.trimmingCharacters(in: .whitespaces)
            let notetype = (nt?.isEmpty == false) ? nt! : t.notetype
            return ["#separator:tab", "#html:true", "#notetype:\(notetype)",
                    "#deck:Jurisprudência", "#tags column:\(t.nCampos + 1)"]
        }
        func fonteLbl(_ e: JurisEntry) -> String {
            var s = "\(e.titulo) · \(e.tribunal)"
            if let d = e.data { s += " · \(d)" }
            return limpa(s)
        }
        var out: [(String, String)] = []

        for t in AnkiTipo.allCases where tipos.contains(t) {
            var l = cabecalho(t)
            for e in entries {
                switch t {
                case .basic:   // Front, Back
                    l.append("\(limpa(perguntaBasico(e)))\t\(limpa(versoBasico(e)))\t\(tags(e))")
                case .aulao:   // Frente, Verso
                    l.append("\(limpa(frenteAulao(e)))\t\(limpa(versoAulao(e)))\t\(tags(e))")
                case .certoErrado:   // Front, Gabarito, Back
                    // CERTO: enunciado verdadeiro.
                    l.append("\(limpa(e.enunciado))\tCerto\t\(fonteLbl(e))\t\(tags(e))")
                    // ERRADO: versão manual (se houver) ou gerada automaticamente.
                    let manual = falsas[e.id]?.trimmingCharacters(in: .whitespacesAndNewlines)
                    let fake = (manual?.isEmpty == false) ? manual : (autoErrado ? afirmacaoFalsaAuto(e.enunciado) : nil)
                    if let fake, !fake.isEmpty {
                        let back = "Correto: " + limpa(e.enunciado) + "<br><br>" + fonteLbl(e)
                        l.append("\(limpa(fake))\tErrado\t\(back)\t\(tags(e)) Juris::Certo-Errado")
                    }
                case .cloze:   // Text, Back Extra — lacunas do usuário ou automáticas
                    // Prioriza as lacunas que a usuária marcou no enunciado (seleção → card).
                    if let cz = clozeDeMarcas(e.enunciado, clozes[e.id], agrupado: false) {
                        l.append("\(limpa(cz))\t\(fonteLbl(e))\t\(tags(e))")
                    } else if e.enunciado.count <= 500, let cz = clozeDoEnunciado(e) {
                        l.append("\(limpa(cz))\t\(fonteLbl(e))\t\(tags(e))")
                    }
                case .clozeDigite:   // Text, Back Extra — lacuna única (você digita)
                    if let cz = clozeDeMarcas(e.enunciado, clozes[e.id], agrupado: true) {
                        l.append("\(limpa(cz))\t\(fonteLbl(e))\t\(tags(e))")
                    } else if e.enunciado.count <= 500, let cz = clozeDoEnunciado(e, maxClozes: 1) {
                        l.append("\(limpa(cz))\t\(fonteLbl(e))\t\(tags(e))")
                    }
                case .leiJuris:   // 12 campos do modelo rico
                    l.append("\(linhaLeiJuris(e))\t\(tags(e))")
                }
            }
            out.append(("\(t.arquivo).txt", l.joined(separator: "\n")))
        }
        return out
    }

    /// Pares de inversão de tese (de → para). A ordem importa: formas negadas e
    /// "inconstitucional" vêm antes das afirmativas para não serem mascaradas.
    private static let paresFalsa: [(String, String)] = [
        ("é inconstitucional", "é constitucional"),
        ("são inconstitucionais", "são constitucionais"),
        ("é constitucional", "é inconstitucional"),
        ("são constitucionais", "são inconstitucionais"),
        ("é indevido", "é devido"), ("é devido", "é indevido"),
        ("não incide", "incide"), ("incide", "não incide"),
        ("não é possível", "é possível"), ("é possível", "não é possível"),
        ("não é cabível", "é cabível"), ("é cabível", "não é cabível"),
        ("é ilícito", "é lícito"), ("é lícito", "é ilícito"),
        ("é ilegítima", "é legítima"), ("é legítima", "é ilegítima"),
        ("é ilegítimo", "é legítimo"), ("é legítimo", "é ilegítimo"),
        ("é inválida", "é válida"), ("é válida", "é inválida"),
        ("é imprescritível", "é prescritível"), ("é prescritível", "é imprescritível"),
        ("não se aplica", "aplica-se"), ("aplica-se", "não se aplica"),
        ("não se admite", "admite-se"), ("admite-se", "não se admite"),
        ("Justiça Estadual", "Justiça Federal"), ("Justiça Federal", "Justiça Estadual"),
        ("não pode", "pode"), ("pode", "não pode"),
    ]

    /// Gera automaticamente uma versão FALSA da afirmação, invertendo um operador
    /// de tese (constitucional↔inconstitucional, incide↔não incide, pode↔não pode…).
    /// Retorna nil quando nenhum operator confiável é encontrado (não força card).
    static func afirmacaoFalsaAuto(_ texto: String) -> String? {
        // usa só a 1ª frase/linha — suficiente para um card Certo/Errado.
        let base = texto.split(whereSeparator: { $0 == "\n" }).first.map(String.init) ?? texto
        let ns = base as NSString
        for (de, para) in paresFalsa {
            let pat = "(?i)(?<![\\p{L}])" + NSRegularExpression.escapedPattern(for: de) + "(?![\\p{L}])"
            guard let re = try? NSRegularExpression(pattern: pat) else { continue }
            guard let m = re.firstMatch(in: base, range: NSRange(location: 0, length: ns.length)) else { continue }
            var rep = para
            let orig = ns.substring(with: m.range)
            if let f = orig.first, f.isUppercase, let pf = rep.first {
                rep = String(pf).uppercased() + rep.dropFirst()
            }
            return ns.replacingCharacters(in: m.range, with: rep)
        }
        return nil
    }

    /// Alvos "operativos" — o que as bancas mais cobram: valor, percentual, fração/
    /// quórum, número + unidade jurídica (prazo/pena), e número por extenso + unidade.
    private static let regexOperativo = try! NSRegularExpression(pattern:
        "R\\$\\s?[\\d.]+(?:,\\d{2})?" +
        "|\\b\\d{1,3}(?:\\.\\d{3})*(?:,\\d+)?\\s?%" +
        "|(?<![\\d.])\\d{1,2}/\\d{1,3}(?![\\d/])" +
        "|\\b\\d{1,3}(?:\\.\\d{3})*\\s+(?:dias?|anos?|m[êe]s(?:es)?|horas?|sal[áa]rios?[- ]m[íi]nimos?)\\b" +
        "|\\b(?:um|dois|tr[êe]s|quatro|cinco|seis|sete|oito|nove|dez|quinze|vinte|trinta|sessenta|noventa)\\s+(?:dias?|anos?|m[êe]s(?:es)?|horas?)\\b",
        options: [.caseInsensitive])

    /// Termos de competência/tribunal — 2º alvo mais cobrado em jurisprudência.
    private static let alvosCompetencia = [
        "Justiça Estadual", "Justiça Federal", "Justiça do Trabalho", "Justiça Eleitoral",
        "competência da União", "competência dos Estados", "competência do Município",
        "Supremo Tribunal Federal", "Superior Tribunal de Justiça", "STF", "STJ",
    ]

    /// Escolhe a MELHOR lacuna do enunciado (o trecho mais cobrado), ignorando os
    /// intervalos já usados. Ordem: número/prazo/valor → competência → operador de
    /// tese → palavra-chave mais longa do índice. Retorna nil se não achar nada bom.
    static func melhorLacuna(_ enunciado: String, evitando usados: [NSRange] = []) -> NSRange? {
        let ns = enunciado as NSString
        let full = NSRange(location: 0, length: ns.length)
        func livre(_ r: NSRange) -> Bool { usados.allSatisfy { NSIntersectionRange($0, r).length == 0 } }
        // 1) número/prazo/valor/percentual/fração
        for m in regexOperativo.matches(in: enunciado, range: full) where livre(m.range) { return m.range }
        // 2) competência / tribunal (frase inteira)
        for termo in alvosCompetencia {
            let r = ns.range(of: termo)
            if r.location != NSNotFound, livre(r) { return r }
        }
        // 3) operador de tese (constitucional, incide, vedado…)
        for termo in ["inconstitucional", "constitucional", "imprescritível", "prescritível",
                      "não incide", "incide", "vedada", "vedado", "cabível", "legítima", "válida"] {
            let pat = "(?i)(?<![\\p{L}])" + NSRegularExpression.escapedPattern(for: termo) + "(?![\\p{L}])"
            if let re = try? NSRegularExpression(pattern: pat),
               let m = re.firstMatch(in: enunciado, range: full), livre(m.range) { return m.range }
        }
        // 4) palavra-chave mais longa do índice presente no texto
        var melhor: NSRange? = nil
        for t in TermIndex.termos where t.count >= 5 {
            let r = ns.range(of: t, options: [.caseInsensitive, .diacriticInsensitive])
            if r.location != NSNotFound, livre(r), r.length > (melhor?.length ?? 0) { melhor = r }
        }
        return melhor
    }

    /// Salva os arquivos do Anki (um save-panel se for um só; senão pede uma pasta).
    static func salvarAnki(_ arquivos: [(nome: String, conteudo: String)], prefixo: String) {
        guard !arquivos.isEmpty else { return }
        if arquivos.count == 1 {
            salvar(nome: "\(prefixo)-\(arquivos[0].nome)", tipo: .plainText, dados: Data(arquivos[0].conteudo.utf8))
            return
        }
        let panel = NSOpenPanel()
        panel.canChooseDirectories = true; panel.canChooseFiles = false; panel.canCreateDirectories = true
        panel.prompt = "Salvar aqui"; panel.message = "Escolha a pasta para salvar os arquivos do Anki"
        if panel.runModal() == .OK, let dir = panel.url {
            for a in arquivos {
                try? Data(a.conteudo.utf8).write(to: dir.appendingPathComponent("\(prefixo)-\(a.nome)"))
            }
        }
    }

    // MARK: Imagem / PDF de um verbete

    static func nsImage(_ entry: JurisEntry) -> NSImage? {
        let r = ImageRenderer(content: CartaoExport(entry: entry))
        r.scale = 2
        return r.nsImage
    }

    static func png(_ entry: JurisEntry) -> Data? {
        guard let img = nsImage(entry) else { return nil }
        return pngData(img)
    }

    // MARK: Mapa mental / fluxograma

    static func mapaNSImage(_ entry: JurisEntry, _ nota: NotaEstudo) -> NSImage? {
        let r = ImageRenderer(content: MapaMentalView(entry: entry, nota: nota).environment(\.colorScheme, .light))
        r.scale = 2
        return r.nsImage
    }
    static func mapaPNG(_ entry: JurisEntry, _ nota: NotaEstudo) -> Data? {
        guard let img = mapaNSImage(entry, nota) else { return nil }
        return pngData(img)
    }
    static func mapaPDF(_ entry: JurisEntry, _ nota: NotaEstudo) -> Data? {
        guard let img = mapaNSImage(entry, nota) else { return nil }
        return pdfData(img)
    }

    static func pngData(_ img: NSImage) -> Data? {
        guard let tiff = img.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff) else { return nil }
        return rep.representation(using: .png, properties: [:])
    }
    static func pdfData(_ img: NSImage) -> Data? {
        guard let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return nil }
        let data = NSMutableData()
        guard let consumer = CGDataConsumer(data: data as CFMutableData) else { return nil }
        var box = CGRect(x: 0, y: 0, width: CGFloat(cg.width) / 2, height: CGFloat(cg.height) / 2)
        guard let ctx = CGContext(consumer: consumer, mediaBox: &box, nil) else { return nil }
        ctx.beginPDFPage(nil); ctx.draw(cg, in: box); ctx.endPDFPage(); ctx.closePDF()
        return data as Data
    }

    static func pdf(_ entry: JurisEntry) -> Data? {
        guard let img = nsImage(entry),
              let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return nil }
        let data = NSMutableData()
        guard let consumer = CGDataConsumer(data: data as CFMutableData) else { return nil }
        var box = CGRect(x: 0, y: 0, width: CGFloat(cg.width) / 2, height: CGFloat(cg.height) / 2)
        guard let ctx = CGContext(consumer: consumer, mediaBox: &box, nil) else { return nil }
        ctx.beginPDFPage(nil)
        ctx.draw(cg, in: box)
        ctx.endPDFPage(); ctx.closePDF()
        return data as Data
    }

    // MARK: Painéis de arquivo

    static func salvar(nome: String, tipo: UTType, dados: Data) {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = nome
        panel.allowedContentTypes = [tipo]
        panel.canCreateDirectories = true
        if panel.runModal() == .OK, let url = panel.url { try? dados.write(to: url) }
    }

    static func abrir(tipos: [UTType]) -> Data? {
        let panel = NSOpenPanel()
        panel.allowedContentTypes = tipos
        panel.allowsMultipleSelection = false
        guard panel.runModal() == .OK, let url = panel.url else { return nil }
        return try? Data(contentsOf: url)
    }
}

/// Painel para escolher os tipos de card e exportar para o Anki.
struct ExportAnkiSheet: View {
    let entries: [JurisEntry]
    let titulo: String
    @Environment(\.dismiss) private var dismiss
    @Environment(LibraryStore.self) private var store
    @State private var tipos: Set<AnkiTipo> = [.basic, .cloze]
    @State private var autoErrado = true
    // Nomes EXATOS dos note types no Anki da usuária (editáveis, casam por nome ao importar).
    @AppStorage("ntBasic") private var ntBasic = "Basic"
    @AppStorage("ntAulao") private var ntAulao = "Aulão"
    @AppStorage("ntCertoErrado") private var ntCertoErrado = "Basic - Certo e Errado"
    @AppStorage("ntCloze") private var ntCloze = "Cloze"
    @AppStorage("ntClozeDigite") private var ntClozeDigite = "Cloze - Digite a Resposta"
    @AppStorage("ntLeiJuris") private var ntLeiJuris = "Lei & Jurisprudência"
    @State private var mostrarNomes = false

    private var nomes: [AnkiTipo: String] {
        [.basic: ntBasic, .aulao: ntAulao, .certoErrado: ntCertoErrado,
         .cloze: ntCloze, .clozeDigite: ntClozeDigite, .leiJuris: ntLeiJuris]
    }
    private func nomeBinding(_ t: AnkiTipo) -> Binding<String> {
        switch t {
        case .basic: return $ntBasic; case .aulao: return $ntAulao
        case .certoErrado: return $ntCertoErrado; case .cloze: return $ntCloze
        case .clozeDigite: return $ntClozeDigite; case .leiJuris: return $ntLeiJuris
        }
    }

    /// Quantos verbetes desta seleção têm uma afirmação falsa cadastrada.
    private var comFalsa: Int { entries.filter { store.afirmacoesFalsas[$0.id]?.isEmpty == false }.count }
    /// Quantos cards ERRADO o gerador automático produziria (sem os manuais).
    private var comAuto: Int {
        entries.filter {
            store.afirmacoesFalsas[$0.id]?.isEmpty != false && Exporter.afirmacaoFalsaAuto($0.enunciado) != nil
        }.count
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 8) {
                Image(systemName: "rectangle.on.rectangle.angled").foregroundStyle(Palette.accent)
                Text("Exportar para o Anki").font(.system(size: 17, weight: .bold))
            }
            Text("\(entries.count) verbete\(entries.count == 1 ? "" : "s") · \(titulo)")
                .font(.caption).foregroundStyle(.secondary)

            VStack(alignment: .leading, spacing: 10) {
                ForEach(AnkiTipo.allCases) { t in
                    Toggle(isOn: Binding(
                        get: { tipos.contains(t) },
                        set: { on in if on { tipos.insert(t) } else { tipos.remove(t) } })) {
                        VStack(alignment: .leading, spacing: 1) {
                            Text(t.nome).font(.system(size: 13, weight: .medium))
                            Text(t.descricao).font(.system(size: 11)).foregroundStyle(.secondary)
                        }
                    }
                    .toggleStyle(.checkbox)
                }
            }
            .padding(12)
            .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Palette.hairline, lineWidth: 1))

            Text("Um arquivo .txt por tipo, já apontando para os SEUS modelos de nota (Basic, Aulão, Basic - Certo e Errado, Cloze, Cloze - Digite a Resposta). No Anki: Arquivo ▸ Importar — o modelo, o baralho \"Jurisprudência\" e as etiquetas já vêm no arquivo. O Cloze só é gerado para textos curtos (súmulas/teses); enunciados longos, como IRDR/repetitivos, saem como Basic/Aulão/Certo-Errado.")
                .font(.system(size: 11)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)

            if tipos.contains(.certoErrado) {
                VStack(alignment: .leading, spacing: 6) {
                    Toggle(isOn: $autoErrado) {
                        VStack(alignment: .leading, spacing: 1) {
                            Text("Gerar afirmação ERRADO automaticamente").font(.system(size: 12, weight: .medium))
                            Text("Inverte o operador da tese (constitucional↔inconstitucional, incide↔não incide, pode↔não pode, Justiça Estadual↔Federal…). O verso mostra sempre a versão correta.")
                                .font(.system(size: 10.5)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    .toggleStyle(.checkbox)
                    let total = comFalsa + (autoErrado ? comAuto : 0)
                    Label(total == 0
                        ? "Sem cards ERRADO nesta seleção (nenhum operador reconhecido)."
                        : "\(total) card\(total == 1 ? "" : "s") ERRADO: \(comFalsa) manua\(comFalsa == 1 ? "l" : "is")\(autoErrado ? " + \(comAuto) automático\(comAuto == 1 ? "" : "s")" : "").",
                        systemImage: total == 0 ? "info.circle" : "checkmark.circle.fill")
                        .font(.system(size: 11))
                        .foregroundStyle(total == 0 ? Color.secondary : Palette.fonteSTJ)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(10)
                .background(Color.red.opacity(0.05), in: RoundedRectangle(cornerRadius: 9))
            }

            DisclosureGroup(isExpanded: $mostrarNomes) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Confirme os nomes EXATOS dos seus modelos no Anki (acentos e maiúsculas). O Anki casa por nome ao importar.")
                        .font(.system(size: 10.5)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                    ForEach(AnkiTipo.allCases.filter { tipos.contains($0) }) { t in
                        HStack(spacing: 8) {
                            Text(t.nome).font(.system(size: 11)).frame(width: 150, alignment: .leading)
                            TextField("", text: nomeBinding(t)).textFieldStyle(.roundedBorder).font(.system(size: 11))
                        }
                    }
                }
                .padding(.top, 6)
            } label: {
                Label("Nomes dos modelos de nota", systemImage: "tag").font(.system(size: 12, weight: .medium))
            }
            .padding(10)
            .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 9))
            .overlay(RoundedRectangle(cornerRadius: 9).strokeBorder(Palette.hairline, lineWidth: 1))

            HStack {
                Spacer()
                Button("Cancelar") { dismiss() }
                Button("Exportar") {
                    let arqs = Exporter.gerarAnkiArquivos(entries, tipos: tipos,
                                                          falsas: store.afirmacoesFalsas, autoErrado: autoErrado,
                                                          clozes: store.clozesPorId, nomes: nomes)
                    Exporter.salvarAnki(arqs, prefixo: "anki-juris")
                    dismiss()
                }
                .buttonStyle(.borderedProminent).tint(Palette.accent).disabled(tipos.isEmpty)
            }
        }
        .padding(20).frame(width: 440)
        .background(Palette.detailBackground)
    }
}
