import SwiftUI

/// Uma remissão (referência cruzada) extraída do TEXTO do artigo — o "índice
/// remissivo" (as setas ▸) de um Vade Mecum. Gerado dos NOSSOS textos oficiais,
/// não copiado de índice comercial autoral.
struct Remission: Identifiable, Hashable {
    let id: String          // chave de dedup (baseada no alvo)
    let display: String     // "Art. 155" · "CF, art. 5º" · "Súmula 608 do STF" · "Lei 8.072/1990"
    let target: Target

    enum Target: Hashable {
        case sameArticle(String)        // número do artigo NO MESMO diploma (pulo interno)
        case otherLaw(UUID, String?)    // outra norma da biblioteca (+ nº do artigo, se houver)
        case sumula(String, String)     // (tribunal, número) — sem navegação por ora
        case citedLaw(String)           // lei citada fora da biblioteca (só exibe + data)
    }

    var isNavigable: Bool {
        switch target { case .sumula, .citedLaw: return false; default: return true }
    }
    var symbol: String {
        switch target {
        case .sameArticle: return "arrow.turn.down.right"
        case .otherLaw: return "arrow.up.forward.square"
        case .sumula: return "checkmark.seal"
        case .citedLaw: return "doc.text"
        }
    }
}

enum RemissiveIndex {
    /// Normaliza um número de artigo p/ casar com `articleNumberKey` dos rótulos:
    /// tira ordinal e espaços, mantém dígitos, pontos de milhar e sufixo -A.
    static func normalizeNumber(_ s: String) -> String {
        s.replacingOccurrences(of: "[ºo°]", with: "", options: .regularExpression)
         .replacingOccurrences(of: "\\s+", with: "", options: .regularExpression)
    }

    // Nomes de códigos → parte que deve aparecer no título da norma na biblioteca.
    private static let namedNorms: [(pattern: String, needle: String)] = [
        ("Constitui[çc][ãa]o(?:\\s+Federal)?|\\bCF\\b", "constituicao"),
        ("C[óo]digo\\s+de\\s+Processo\\s+Civil|\\bCPC\\b", "codigo de processo civil"),
        ("C[óo]digo\\s+de\\s+Processo\\s+Penal|\\bCPP\\b", "codigo de processo penal"),
        ("C[óo]digo\\s+Tribut[áa]rio(?:\\s+Nacional)?|\\bCTN\\b", "codigo tributario"),
        ("C[óo]digo\\s+de\\s+Defesa\\s+do\\s+Consumidor|\\bCDC\\b", "defesa do consumidor"),
        ("Consolida[çc][ãa]o\\s+das\\s+Leis\\s+do\\s+Trabalho|\\bCLT\\b", "consolidacao das leis do trabalho"),
        ("C[óo]digo\\s+Civil|\\bCC\\b", "codigo civil"),
        ("C[óo]digo\\s+Penal|\\bCP\\b", "codigo penal"),
    ]

    private static func law(named raw: String, in laws: [LawEntry]) -> LawEntry? {
        let n = raw.lowercased().folding(options: .diacriticInsensitive, locale: nil)
        for nn in namedNorms {
            if let re = try? NSRegularExpression(pattern: "^(?:" + nn.pattern + ")$", options: [.caseInsensitive]),
               re.firstMatch(in: raw, range: NSRange(location: 0, length: (raw as NSString).length)) != nil {
                return laws.first {
                    $0.isRegularLaw &&
                    $0.title.lowercased().folding(options: .diacriticInsensitive, locale: nil).contains(nn.needle)
                }
            }
            _ = n
        }
        return nil
    }

    private static func regex(_ p: String) -> NSRegularExpression {
        try! NSRegularExpression(pattern: p, options: [.caseInsensitive])
    }

    // Vários números numa citação ("arts. 155 e 157" / "5º, 6º e 7º") → tokens.
    // Tira ponto final ("122." → "122") p/ não confundir com milhar nem auto-referência.
    private static func numbers(in group: String) -> [String] {
        let ns = group as NSString
        let re = regex("[0-9][0-9.]*[ºo°]?")
        var out: [String] = []
        re.enumerateMatches(in: group, range: NSRange(location: 0, length: ns.length)) { m, _, _ in
            guard let m else { return }
            let t = ns.substring(with: m.range).replacingOccurrences(of: "[.]+$", with: "", options: .regularExpression)
            if !t.isEmpty { out.append(t) }
        }
        return out
    }

    /// Extrai as remissões do corpo do artigo.
    /// - currentLawID/currentNumber: p/ tratar auto-referência como pulo interno e não repetir o próprio artigo.
    /// - resolveNumbered: `store.findLaw` (tipo+número → LawEntry).
    static func build(for unit: LawUnit, currentLawID: UUID, currentNumber: String,
                      laws: [LawEntry], resolveNumbered: (String, String) -> LawEntry?) -> [Remission] {
        let text = unit.lines.joined(separator: " ")
        let ns = text as NSString
        let whole = NSRange(location: 0, length: ns.length)
        var out: [Remission] = []
        var seen = Set<String>()
        var consumed: [NSRange] = []   // spans de refs qualificadas (p/ o passe "art. N" cru não duplicar)
        // Notas de alteração do próprio artigo (Redação/Incluído/Revogado…) já aparecem
        // em "Remissões e alterações"; o índice remissivo as ignora p/ não duplicar.
        let amend = LegislativeNote.amendmentNoteRanges(in: text)
        func inAmend(_ r: NSRange) -> Bool { amend.contains { NSIntersectionRange($0, r).length > 0 } }
        func add(_ r: Remission) { if seen.insert(r.id).inserted { out.append(r) } }
        func numGroup(_ m: NSTextCheckingResult) -> String { m.range(at: 1).location == NSNotFound ? "" : ns.substring(with: m.range(at: 1)) }

        // 1) Refs a artigos de OUTRO diploma nomeado: "art(s). N … da Constituição/CC/CP…"
        let normAlt = namedNorms.map { $0.pattern }.joined(separator: "|")
        let qualified = regex("\\barts?\\.?\\s*([0-9][0-9.]*[ºo°]?(?:\\s*(?:,|e)\\s*[0-9][0-9.]*[ºo°]?)*)[^.;\\n]{0,28}?(?:d[aeo]s?\\s+)?(" + normAlt + ")\\b")
        qualified.enumerateMatches(in: text, range: whole) { m, _, _ in
            guard let m, !inAmend(m.range) else { return }
            consumed.append(m.range)
            let normName = ns.substring(with: m.range(at: 2))
            let nums = numbers(in: numGroup(m))
            guard let target = law(named: normName, in: laws) else {
                // norma não instalada: mostra como referência de texto (não navega)
                for num in nums { add(Remission(id: "cited-\(normName)-\(num)", display: "\(normName), art. \(num)", target: .citedLaw("\(normName) art. \(num)"))) }
                return
            }
            for num in nums {
                let norm = normalizeNumber(num)
                if target.id == currentLawID {
                    if norm != currentNumber { add(Remission(id: "self-\(norm)", display: "Art. \(num)", target: .sameArticle(norm))) }
                } else {
                    add(Remission(id: "law-\(target.id)-\(norm)", display: "\(shortName(target)), art. \(num)", target: .otherLaw(target.id, norm)))
                }
            }
        }

        // 2) Refs internas explícitas: "art(s). N … deste Código / desta Lei / deste Decreto"
        let internalRe = regex("\\barts?\\.?\\s*([0-9][0-9.]*[ºo°]?(?:\\s*(?:,|e)\\s*[0-9][0-9.]*[ºo°]?)*)[^.;\\n]{0,28}?\\b(?:deste\\s+C[óo]digo|desta\\s+Lei|deste\\s+Decreto(?:-Lei)?)\\b")
        internalRe.enumerateMatches(in: text, range: whole) { m, _, _ in
            guard let m, !inAmend(m.range) else { return }
            consumed.append(m.range)
            for num in numbers(in: numGroup(m)) {
                let norm = normalizeNumber(num)
                if norm != currentNumber { add(Remission(id: "self-\(norm)", display: "Art. \(num)", target: .sameArticle(norm))) }
            }
        }

        // 3) Súmulas (STF/STJ/TST…)
        let sumRe = regex("S[úu]mula(\\s+Vinculante)?\\s*(?:n[º°o.]?\\s*)?(\\d+)\\s+d[oe]\\s+(STF|STJ|TST|TSE|TCU|TNU)")
        sumRe.enumerateMatches(in: text, range: whole) { m, _, _ in
            guard let m else { return }
            let vinc = m.range(at: 1).location != NSNotFound
            let num = ns.substring(with: m.range(at: 2))
            let court = ns.substring(with: m.range(at: 3)).uppercased()
            let label = "Súmula\(vinc ? " Vinculante" : "") \(num) do \(court)"
            add(Remission(id: "sum-\(court)-\(num)", display: label, target: .sumula(court, num)))
        }

        // 4) Leis citadas (Lei/LC/DL/Decreto/MP/EC nº N) → link se instalada, senão texto (+ data via seed).
        let lawRe = regex("(Lei\\s+Complementar|Lei\\s+Delegada|Lei|Decreto-Lei|Decreto|Medida\\s+Provis[óo]ria|Emenda\\s+Constitucional)\\s*n?[º°o.\\s]*([0-9][0-9.]*)(?:[^\\n]{0,18}?\\bde\\s+(\\d{4}))?")
        lawRe.enumerateMatches(in: text, range: whole) { m, _, _ in
            guard let m, !inAmend(m.range) else { return }
            let type = ns.substring(with: m.range(at: 1))
            let numRaw = ns.substring(with: m.range(at: 2)).replacingOccurrences(of: "[.]+$", with: "", options: .regularExpression)
            let year = m.range(at: 3).location == NSNotFound ? "" : ns.substring(with: m.range(at: 3))
            let numClean = numRaw.replacingOccurrences(of: ".", with: "")
            let sigla = LawSeed.sigla(for: type)
            let disp = "\(sigla) \(numRaw)\(year.isEmpty ? "" : "/\(year)")"
            if let target = resolveNumbered(type, numClean), target.id != currentLawID {
                add(Remission(id: "law-\(target.id)-", display: disp, target: .otherLaw(target.id, nil)))
            } else if resolveNumbered(type, numClean) == nil {
                let vig = LawSeed.vigencia(type: type, number: numClean)
                let suffix = vig.map { " · em vigor \($0)" } ?? ""
                add(Remission(id: "cited-\(sigla)-\(numClean)", display: disp + suffix, target: .citedLaw("\(sigla) \(numClean)")))
            }
        }

        // 5) "art. N" CRU sem qualificador → pulo interno (mesmo diploma), FORA dos spans
        //    já consumidos. Pula quando o número é seguido de "da lei/decreto/constituição/
        //    código…" (é ref a OUTRA norma que não reconhecemos — não é o próprio código).
        let otherNorm = regex("^\\s{0,4}d[aeo]s?\\s+(lei|decreto|constitui|c[óo]digo|medida|emenda|resolu|ato\\b|estatuto|consolida|conven|s[úu]mula)")
        let bareRe = regex("\\barts?\\.?\\s*([0-9][0-9.]*[ºo°]?(?:\\s*(?:,|e)\\s*[0-9][0-9.]*[ºo°]?)*)")
        bareRe.enumerateMatches(in: text, range: whole) { m, _, _ in
            guard let m, !inAmend(m.range) else { return }
            if consumed.contains(where: { NSIntersectionRange($0, m.range).length > 0 }) { return }
            let tailStart = NSMaxRange(m.range)
            let tailStr = ns.substring(with: NSRange(location: tailStart, length: min(40, ns.length - tailStart)))
            if otherNorm.firstMatch(in: tailStr, range: NSRange(location: 0, length: (tailStr as NSString).length)) != nil { return }
            for num in numbers(in: numGroup(m)) {
                let norm = normalizeNumber(num)
                if norm != currentNumber { add(Remission(id: "self-\(norm)", display: "Art. \(num)", target: .sameArticle(norm))) }
            }
        }

        // Ordena: internas (mesmo diploma) → outras normas → súmulas → citadas.
        func rank(_ r: Remission) -> Int {
            switch r.target { case .sameArticle: return 0; case .otherLaw: return 1; case .sumula: return 2; case .citedLaw: return 3 }
        }
        return out.sorted { a, b in
            let (ra, rb) = (rank(a), rank(b))
            if ra != rb { return ra < rb }
            return a.display.localizedStandardCompare(b.display) == .orderedAscending
        }
    }

    // Sigla curta p/ exibir a norma da biblioteca ("Código Penal" → "CP", senão o título).
    static func shortName(_ law: LawEntry) -> String {
        let t = law.title.lowercased().folding(options: .diacriticInsensitive, locale: nil)
        if t.contains("constituicao") { return "CF" }
        if t.contains("codigo de processo civil") { return "CPC" }
        if t.contains("codigo de processo penal") { return "CPP" }
        if t.contains("codigo tributario") { return "CTN" }
        if t.contains("codigo de defesa do consumidor") { return "CDC" }
        if t.contains("consolidacao das leis do trabalho") { return "CLT" }
        if t.contains("codigo civil") { return "CC" }
        if t.contains("codigo penal") { return "CP" }
        return law.title
    }
}

/// Bloco "Índice remissivo" (setas ▸) abaixo do artigo — como um Vade impresso.
struct RemissiveIndexView: View {
    let remissions: [Remission]
    let accent: Color
    var onSameArticle: (String) -> Void = { _ in }
    var onOpenLaw: (UUID, String?) -> Void = { _, _ in }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Índice remissivo", systemImage: "arrow.triangle.branch")
                .font(.caption.weight(.semibold)).foregroundStyle(.secondary)
            FlowRemissions(remissions: remissions, accent: accent,
                           onSameArticle: onSameArticle, onOpenLaw: onOpenLaw)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 10).fill(.background.secondary))
    }
}

/// Chips de remissão que quebram linha (as setas ▸). Clicáveis quando navegáveis.
private struct FlowRemissions: View {
    let remissions: [Remission]
    let accent: Color
    let onSameArticle: (String) -> Void
    let onOpenLaw: (UUID, String?) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            ForEach(remissions) { r in
                Button {
                    switch r.target {
                    case .sameArticle(let n): onSameArticle(n)
                    case .otherLaw(let id, let art): onOpenLaw(id, art)
                    case .sumula, .citedLaw: break
                    }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "arrowtriangle.right.fill")
                            .font(.system(size: 7)).foregroundStyle(accent.opacity(0.7))
                        Text(r.display).font(.caption)
                            .foregroundStyle(r.isNavigable ? AppTheme.ink : AppTheme.secondaryInk)
                        if r.isNavigable {
                            Image(systemName: r.symbol).font(.system(size: 8)).foregroundStyle(.tertiary)
                        }
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .disabled(!r.isNavigable)
            }
        }
    }
}
