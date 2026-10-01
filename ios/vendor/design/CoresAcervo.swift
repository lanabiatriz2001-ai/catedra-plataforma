import Foundation

/// A tabela ÚNICA de cor por ramo do direito — a paleta "vitrine" (DESIGN.md). Antes ela
/// vivia duas vezes em cada alvo (LawCategory.color no LEGIS, RamoStyle.stops no JURIS),
/// quatro cópias que o scripts/verificar-cores-ramo.mjs precisava vigiar. Agora LEGIS e
/// JURIS, Mac e iPad leem daqui; a checagem compara só esta tabela com CT_CORES_RAMO da web.
/// `identidade` pinta preenchimento/borda; como TEXTO use `DS.corTexto(ramo.identidade)`.
enum Ramo: String, CaseIterable {
    case constitucional, civil, penal, trabalho, previdenciario, tributario, empresarial,
         administrativo, consumidor, ambiental, digital, internacional, especial

    var identidade: UInt32 {
        switch self {
        case .constitucional: return 0x2563EB   // azul royal
        case .civil:          return 0x0D9488   // teal
        case .penal:          return 0xE11D48   // rosé
        case .trabalho:       return 0xD97706   // âmbar
        case .previdenciario: return 0xDB2777   // rosa
        case .tributario:     return 0x7C3AED   // roxo
        case .empresarial:    return 0x65A30D   // lima
        case .administrativo: return 0x4F46E5   // índigo
        case .consumidor:     return 0xEA580C   // laranja
        case .ambiental:      return 0x16A34A   // verde
        case .digital:        return 0xC026D3   // fúcsia
        case .internacional:  return 0x0284C7   // azul-céu (escurecido p/ contraste AA — igual à web)
        case .especial:       return 0x64748B   // grafite
        }
    }

    /// Segunda parada do gradiente da matéria (tom mais claro).
    var clara: UInt32 {
        switch self {
        case .constitucional: return 0x38BDF8
        case .civil:          return 0x2DD4BF
        case .penal:          return 0xFB7185
        case .trabalho:       return 0xFBBF24
        case .previdenciario: return 0xF472B6
        case .tributario:     return 0xA78BFA
        case .empresarial:    return 0xA3E635
        case .administrativo: return 0x818CF8
        case .consumidor:     return 0xFB923C
        case .ambiental:      return 0x4ADE80
        case .digital:        return 0xE879F9
        case .internacional:  return 0x7DD3FC
        case .especial:       return 0x94A3B8
        }
    }

    /// Ramo a partir do nome livre que vem do acervo ("Direito Processual Penal"…). A ordem
    /// é a do antigo RamoStyle.stops e importa: "Processual Civil" não pode cair em penal,
    /// e "civil" fica por último. "Leis Especiais" não tem gatilho de nome (só o LEGIS a usa).
    static func deNome(_ nome: String?) -> Ramo? {
        let n = (nome ?? "")
            .folding(options: .diacriticInsensitive, locale: Locale(identifier: "pt_BR"))
            .lowercased()
        if n.isEmpty { return nil }
        func tem(_ partes: String...) -> Bool { partes.contains { n.contains($0) } }
        if tem("constituc")                          { return .constitucional }
        if tem("penal", "criminal")                  { return .penal }
        if tem("trabalh")                            { return .trabalho }
        if tem("previden")                           { return .previdenciario }
        if tem("tribut")                             { return .tributario }
        if tem("empresar", "econom")                 { return .empresarial }
        if tem("administr", "eleitor")               { return .administrativo }
        if tem("consum")                             { return .consumidor }
        if tem("ambient")                            { return .ambiental }
        if tem("digital", "propriedade intelectual") { return .digital }
        if tem("internacional", "humanos")           { return .internacional }
        if tem("civil")                              { return .civil }
        return nil
    }
}

/// Cor de identidade por tribunal — a mesma do CátedraJURIS da web (TRIBC). Fixa: a
/// identidade do tribunal não muda com o tema. `clara` é a variante para ícone sobre o
/// navy da lateral. DOD não é tribunal, mas tem identidade própria (âmbar).
enum CorTribunal {
    static func identidade(_ nome: String) -> UInt32? {
        switch nome {
        case "STF":  return 0x1D4ED8   // azul
        case "STJ":  return 0x0D9488   // teal
        case "TSE":  return 0x7C3AED   // roxo
        case "TJRO": return 0x64748B   // ardósia
        case "TCU":  return 0x0F7A57   // verde-cofre
        default:     return nil
        }
    }
    static func clara(_ nome: String) -> UInt32? {
        switch nome {
        case "STF":  return 0x739EFA
        case "STJ":  return 0x47CCB3
        case "TSE":  return 0xA98CFA
        case "TJRO": return 0x9EADC7
        case "TCU":  return 0x3DB88C
        default:     return nil
        }
    }
    static let dod: UInt32 = 0xC2790C
    static let dodClara: UInt32 = 0xF2B859
}
