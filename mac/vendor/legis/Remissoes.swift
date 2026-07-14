import SwiftUI
import Foundation

/// Uma nota legislativa que o Planalto insere no próprio texto: alteração ou
/// remissão de um dispositivo — "(Revogado pela Lei X)", "(Redação dada pela
/// Lei X)", "(Vide Y)", "(Incluído por Z)", "(Vigência)". O app já baixa esse
/// texto; ao virar texto puro o Planalto perde o link, mas o rótulo textual
/// permanece e é o que extraímos aqui.
struct LegislativeNote: Hashable {
    enum Kind {
        case revogado, redacao, incluido, vide, vigencia, regulamento, renumerado, outro

        var label: String {
            switch self {
            case .revogado: return "Revogado"
            case .redacao: return "Nova redação"
            case .incluido: return "Incluído"
            case .vide: return "Vide"
            case .vigencia: return "Vigência"
            case .regulamento: return "Regulamento"
            case .renumerado: return "Renumerado"
            case .outro: return "Nota"
            }
        }
        var symbol: String {
            switch self {
            case .revogado: return "trash.slash"
            case .redacao: return "pencil.line"
            case .incluido: return "plus.circle"
            case .vide: return "arrow.triangle.branch"
            case .vigencia: return "calendar.badge.clock"
            case .regulamento: return "doc.badge.gearshape"
            case .renumerado: return "number"
            case .outro: return "info.circle"
            }
        }
        var color: Color {
            switch self {
            case .revogado: return .red
            case .redacao: return .orange
            case .incluido: return .green
            case .vide: return .blue
            case .vigencia: return .purple
            case .regulamento: return .teal
            case .renumerado: return .brown
            case .outro: return .gray
            }
        }
    }

    let kind: Kind
    let text: String        // texto completo sem parênteses ("Revogado pela Lei nº 9.279, de 1996")
    let refType: String?    // "Lei", "Decreto-Lei", "Decreto", "Medida Provisória"…
    let refNumber: String?  // número normalizado sem ponto de milhar ("9279") p/ casar com a biblioteca

    // Um parêntese de nota do Planalto. Duas formas: o verbo logo após "(" ("(Vide…)",
    // "(Redação dada…)") OU um DISPOSITIVO antes do verbo ("(Parágrafo incluído…)",
    // "(Inciso incluído…)", "(Artigo vetado…)"). O prefixo de dispositivo é um conjunto
    // FECHADO — assim não confundimos com texto de lei que só contém a palavra ("(placa
    // - Estacionamento Regulamentado)" no CTB) nem com citações ("(art. 61 da Lei…)",
    // "(art. 273… com a redação dada pela Lei…)", que começam por "art." minúsculo).
    // Corpo da nota: `(?:[^()\n]|\([^)\n]*\))*` tolera UM nível de parênteses
    // aninhados — notas reais os têm: "(Redação dada pela MP nº 841 (Vigência
    // encerrada))", "(Renumerado para parágrafo único (abaixo) pela Lei nº 4.961…)".
    // Exclui `\n`: a nota nunca atravessa parágrafo — sem isso um `(` sem fecho
    // (o Planalto tem alguns) engolia as linhas seguintes. Fecho `\)?` opcional:
    // captura a nota até o fim da linha mesmo quando o ")" veio malformado.
    private static let noteRegex = try! NSRegularExpression(
        pattern: "\\(\\s*(?:(?:Par[áa]grafos?(?:\\s+[úu]nico)?|Artigos?|Incisos?|Al[íi]neas?|[IÍ]tens?|Item|Anexos?|Caput|Tabela|Nova)\\s+)?(Vide|Revog\\w*|Reda[çc][ãa]o|Inclu[íi]d\\w*|Acrescentad\\w*|Renumerad\\w*|Vig[êe]ncia|Regulament\\w*|Produ[çc][ãa]o\\s+de\\s+efeito|Vetad\\w*|Revigorad\\w*|Suprimid\\w*)(?:[^()\\n]|\\([^)\\n]*\\))*\\)?",
        options: [.caseInsensitive])

    // Tipo + número da norma referida, dentro do texto da nota.
    private static let refRegex = try! NSRegularExpression(
        pattern: "(Lei Complementar|Lei Delegada|Lei|Decreto-Lei|Decreto-lei|Decreto|Medida Provis[óo]ria|Emenda Constitucional|Constitui[çc][ãa]o|Resolu[çc][ãa]o|Ato)\\s*n?[º°o.\\s]*([0-9][0-9.]*)",
        options: [.caseInsensitive])

    // Cache do parse por texto do artigo: o corpo das Views (UnitFocusView e cada
    // UnitCard) chama parse a cada render — sem cache, uma tecla no filtro dos
    // Cartões refazia dezenas de varreduras de regex. NSCache é thread-safe e
    // esvazia sob pressão de memória; a chave é o próprio texto (sem colisão).
    private final class NotesBox { let notes: [LegislativeNote]; init(_ n: [LegislativeNote]) { notes = n } }
    private static let cache = NSCache<NSString, NotesBox>()

    /// Extrai as notas legislativas de um artigo (linhas do corpo), na ordem,
    /// sem repetir a mesma nota (o Planalto reimprime "(Vide …)" em vários incisos).
    static func parse(from lines: [String]) -> [LegislativeNote] {
        let text = lines.joined(separator: "\n")
        let key = text as NSString
        if let hit = cache.object(forKey: key) { return hit.notes }
        let ns = text as NSString
        var out: [LegislativeNote] = []
        var seen = Set<String>()
        noteRegex.enumerateMatches(in: text, range: NSRange(location: 0, length: ns.length)) { m, _, _ in
            guard let m, m.range.length >= 2 else { return }
            let keyword = ns.substring(with: m.range(at: 1))
            // Tira o "(" inicial e o ")" final SE houver (o fecho é opcional no
            // regex, então nem toda match termina em ")").
            var inner = ns.substring(with: m.range)
            if inner.hasPrefix("(") { inner.removeFirst() }
            if inner.hasSuffix(")") { inner.removeLast() }
            inner = inner.trimmingCharacters(in: .whitespacesAndNewlines)
            let dedupKey = inner.lowercased()
            guard !inner.isEmpty, seen.insert(dedupKey).inserted else { return }
            let ref = reference(in: inner)
            out.append(LegislativeNote(kind: classify(keyword), text: inner,
                                       refType: ref?.type, refNumber: ref?.number))
        }
        cache.setObject(NotesBox(out), forKey: key)
        return out
    }

    /// Faixas (NSRange) das notas dentro de um texto — para o leitor esmaecer as
    /// notas inline sem alterar o texto (só atributos, offsets intactos).
    static func noteRanges(in text: String) -> [NSRange] {
        let ns = text as NSString
        var ranges: [NSRange] = []
        noteRegex.enumerateMatches(in: text, range: NSRange(location: 0, length: ns.length)) { m, _, _ in
            if let m { ranges.append(m.range) }
        }
        return ranges
    }

    /// Faixas das notas de ALTERAÇÃO do próprio dispositivo (histórico de edição:
    /// Redação/Incluído/Revogado/Renumerado/Vigência) — usadas pelo índice remissivo
    /// para NÃO repetir o que já aparece em "Remissões e alterações". Notas "Vide"
    /// (remissão de verdade) ficam de fora daqui, então seguem no índice.
    static func amendmentNoteRanges(in text: String) -> [NSRange] {
        let ns = text as NSString
        var out: [NSRange] = []
        noteRegex.enumerateMatches(in: text, range: NSRange(location: 0, length: ns.length)) { m, _, _ in
            guard let m, m.range.length >= 2 else { return }
            switch classify(ns.substring(with: m.range(at: 1))) {
            case .redacao, .incluido, .revogado, .renumerado, .vigencia: out.append(m.range)
            default: break
            }
        }
        return out
    }

    /// Tipo + número (sem milhar) da norma referida num texto qualquer — usado
    /// também para ler a `reference` de uma LawEntry e casar remissão × biblioteca.
    static func reference(in text: String) -> (type: String, number: String)? {
        let ns = text as NSString
        guard let m = refRegex.firstMatch(in: text, range: NSRange(location: 0, length: ns.length)) else { return nil }
        let type = ns.substring(with: m.range(at: 1))
        let number = ns.substring(with: m.range(at: 2)).replacingOccurrences(of: ".", with: "")
        return (type, number)
    }

    /// Normaliza o tipo da norma para casar remissão × biblioteca com segurança
    /// (Lei ≠ Lei Complementar ≠ Decreto-Lei ≠ Decreto — números colidem entre eles).
    static func canonicalType(_ raw: String) -> String {
        let s = raw.lowercased().folding(options: .diacriticInsensitive, locale: nil)
        if s.contains("complementar") { return "lc" }
        if s.contains("delegada") { return "ld" }
        if s.contains("decreto-lei") || s.contains("decreto lei") { return "dl" }
        if s.contains("medida provis") { return "mp" }
        if s.contains("emenda") { return "ec" }
        if s.contains("constitui") { return "cf" }
        if s.contains("resolu") { return "res" }
        if s.contains("decreto") { return "decreto" }
        if s.contains("lei") { return "lei" }
        return s
    }

    private static func classify(_ keyword: String) -> Kind {
        let k = keyword.lowercased().folding(options: .diacriticInsensitive, locale: nil)
        if k.hasPrefix("revog") { return .revogado }
        if k.hasPrefix("reda") || k.hasPrefix("nova") { return .redacao }
        if k.hasPrefix("inclu") || k.hasPrefix("acresc") { return .incluido }
        if k.hasPrefix("vide") { return .vide }
        if k.hasPrefix("vig") { return .vigencia }
        if k.hasPrefix("regulament") { return .regulamento }
        if k.hasPrefix("renumer") { return .renumerado }
        return .outro
    }
}

/// Bloco "Remissões e alterações" mostrado abaixo do artigo no modo Estudo.
struct RemissoesView: View {
    let notes: [LegislativeNote]
    /// Resolve a norma referida para um id da biblioteca (nil = não está instalada).
    var resolve: (LegislativeNote) -> UUID? = { _ in nil }
    var onOpen: (UUID) -> Void = { _ in }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Remissões e alterações", systemImage: "arrow.triangle.branch")
                .font(.caption.weight(.semibold)).foregroundStyle(.secondary)
            ForEach(Array(notes.enumerated()), id: \.offset) { _, note in
                HStack(alignment: .top, spacing: 8) {
                    Label(note.kind.label, systemImage: note.kind.symbol)
                        .font(.caption2.weight(.bold))
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(Capsule().fill(note.kind.color.opacity(0.16)))
                        .foregroundStyle(note.kind.color)
                        .fixedSize()
                    Text(note.text)
                        .font(.caption).foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                    if let target = resolve(note) {
                        Button { onOpen(target) } label: {
                            Image(systemName: "arrow.up.right.square")
                        }
                        .buttonStyle(.borderless)
                        .help("Abrir a norma referida (está na sua biblioteca)")
                    }
                }
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 10).fill(.background.secondary))
    }
}
