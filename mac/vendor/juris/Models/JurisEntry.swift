import Foundation
import SwiftUI

/// Nota de estudo ORIGINAL (não oficial): esquema/mapa mental de um julgado.
/// `tese` = síntese; `fluxo` = passos de uma decisão (fluxograma); `ramos` = ramos temáticos.
struct NotaEstudo: Codable, Hashable {
    var tese: String?
    var fluxo: [String]?
    var ramos: [RamoNota]?
    var texto: String?      // versão em prosa explicativa (alternativa ao esquema)

    var temEsquema: Bool { (fluxo?.isEmpty == false) || (ramos?.isEmpty == false) }
}

struct RamoNota: Codable, Hashable {
    var tipo: String        // regra | fundamento | excecao | pegadinha | cuidado | vedacao | relacionada
    var itens: [String]

    var titulo: String {
        switch tipo {
        case "regra": return "Regra"
        case "fundamento": return "Fundamento"
        case "excecao": return "Exceção"
        case "pegadinha": return "Pegadinha"
        case "cuidado": return "Cuidado"
        case "vedacao": return "Vedação"
        case "relacionada": return "Súmula/tese relacionada"
        default: return tipo.capitalized
        }
    }
    var simbolo: String {
        switch tipo {
        case "regra": return "checkmark.seal.fill"
        case "fundamento": return "text.book.closed.fill"
        case "excecao": return "arrow.triangle.branch"
        case "pegadinha": return "exclamationmark.triangle.fill"
        case "cuidado": return "clock.badge.exclamationmark.fill"
        case "vedacao": return "nosign"
        case "relacionada": return "link"
        default: return "circle.fill"
        }
    }
    var cor: Color {
        switch tipo {
        case "regra": return Palette.fonteSTJ           // verde
        case "fundamento": return Palette.fonteSTF       // azul
        case "excecao": return Palette.fonteRG           // roxo
        case "pegadinha": return Palette.fonteRepetitivo // laranja
        case "cuidado": return Palette.fonteRepetitivo   // laranja
        case "vedacao": return .red                      // vermelho
        case "relacionada": return Palette.fonteTSE      // ciano
        default: return Palette.secondaryInk
        }
    }
}

/// Um registro de jurisprudência normalizado (súmula, tese de repercussão geral,
/// recurso repetitivo, tese de "Jurisprudência em Teses" ou julgado de informativo).
struct JurisEntry: Identifiable, Codable, Hashable {
    let id: String
    let tribunal: String
    let fonte: String
    let numero: Int?
    let titulo: String
    let enunciado: String
    let ramoDireito: String?
    let tema: String?
    let orgaoJulgador: String?
    let data: String?
    let situacao: String?
    let fontePublicacao: String?
    let referencias: String?
    let precedentes: String?
    let observacao: String?
    let url: String?
    let comentario: String?
    let importante: Bool

    enum CodingKeys: String, CodingKey {
        case id, tribunal, fonte, numero, titulo, enunciado, ramoDireito, tema
        case orgaoJulgador, data, situacao, fontePublicacao, referencias
        case precedentes, observacao, url, comentario, importante
    }

    init(id: String, tribunal: String, fonte: String, numero: Int?, titulo: String,
         enunciado: String, ramoDireito: String?, tema: String?, orgaoJulgador: String?,
         data: String?, situacao: String?, fontePublicacao: String?, referencias: String?,
         precedentes: String?, observacao: String?, url: String?, comentario: String?,
         importante: Bool = false) {
        self.id = id; self.tribunal = tribunal; self.fonte = fonte; self.numero = numero
        self.titulo = titulo; self.enunciado = enunciado; self.ramoDireito = ramoDireito
        self.tema = tema; self.orgaoJulgador = orgaoJulgador; self.data = data
        self.situacao = situacao; self.fontePublicacao = fontePublicacao
        self.referencias = referencias; self.precedentes = precedentes
        self.observacao = observacao; self.url = url; self.comentario = comentario
        self.importante = importante
    }

    /// Decodificação tolerante: campos ausentes viram `nil`/`false`.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        tribunal = (try? c.decode(String.self, forKey: .tribunal)) ?? ""
        fonte = (try? c.decode(String.self, forKey: .fonte)) ?? ""
        numero = try? c.decodeIfPresent(Int.self, forKey: .numero)
        titulo = (try? c.decode(String.self, forKey: .titulo)) ?? ""
        enunciado = (try? c.decode(String.self, forKey: .enunciado)) ?? ""
        ramoDireito = try? c.decodeIfPresent(String.self, forKey: .ramoDireito)
        tema = try? c.decodeIfPresent(String.self, forKey: .tema)
        orgaoJulgador = try? c.decodeIfPresent(String.self, forKey: .orgaoJulgador)
        data = try? c.decodeIfPresent(String.self, forKey: .data)
        situacao = try? c.decodeIfPresent(String.self, forKey: .situacao)
        fontePublicacao = try? c.decodeIfPresent(String.self, forKey: .fontePublicacao)
        referencias = try? c.decodeIfPresent(String.self, forKey: .referencias)
        precedentes = try? c.decodeIfPresent(String.self, forKey: .precedentes)
        observacao = try? c.decodeIfPresent(String.self, forKey: .observacao)
        url = try? c.decodeIfPresent(String.self, forKey: .url)
        comentario = try? c.decodeIfPresent(String.self, forKey: .comentario)
        importante = (try? c.decodeIfPresent(Bool.self, forKey: .importante)) ?? false
    }

    var fonteKind: Fonte { Fonte(rawValue: fonte) ?? .outro }

    /// Disciplina canônica (para navegação por Ramos do Direito). Resolve os compostos
    /// (ex.: "Direito Penal e Processual Penal" → "Direito Penal").
    var disciplina: String {
        guard let r = ramoDireito?.folding(options: .diacriticInsensitive, locale: .current).lowercased(),
              !r.isEmpty else { return "Outros" }
        // ordem importa: casos específicos antes dos genéricos
        let mapa: [(String, String)] = [
            ("processual civil", "Direito Processual Civil"),
            ("processual penal", "Direito Processual Penal"),
            ("processual do trabalho", "Direito Processual do Trabalho"),
            ("constitucional", "Direito Constitucional"),
            ("administrativo militar", "Direito Militar"),
            ("administrativo", "Direito Administrativo"),
            ("tributario", "Direito Tributário"),
            ("financeiro", "Direito Financeiro"),
            ("consumidor", "Direito do Consumidor"),
            ("empresarial", "Direito Empresarial"),
            ("bancario", "Direito Bancário"),
            ("ambiental", "Direito Ambiental"),
            ("eleitoral", "Direito Eleitoral"),
            ("previdenciario", "Direito Previdenciário"),
            ("crianca", "Direito da Criança e do Adolescente"),
            ("humanos", "Direitos Humanos"),
            ("internacional", "Direito Internacional"),
            ("registral", "Direito Registral"),
            ("notarial", "Direito Registral"),
            ("militar", "Direito Militar"),
            ("trabalh", "Direito do Trabalho"),
            ("penal", "Direito Penal"),
            ("civil", "Direito Civil"),
        ]
        for (chave, disc) in mapa where r.contains(chave) { return disc }
        return ramoDireito ?? "Outros"
    }

    /// Classificação canônica da situação para filtros.
    var situacaoKind: SituacaoKind {
        guard let s = situacao?.lowercased() else { return .vigente }
        if s.contains("cancel") { return .cancelada }
        if s.contains("super") || s.contains("revog") { return .superada }
        return .vigente   // "Aprovada", "Alterada" etc. continuam vigentes
    }

    /// Nº da edição (Juris em Teses) — alias semântico de `numero`.
    var edicaoJT: Int? { fonteKind == .jurisEmTeses ? numero : nil }

    /// Texto único, sem acentos e minúsculo, para busca rápida.
    var searchBlob: String {
        var parts = [titulo, enunciado]
        if let t = tema { parts.append(t) }
        if let r = ramoDireito { parts.append(r) }
        if let n = numero { parts.append(String(n)) }
        parts.append(tribunal)
        return parts.joined(separator: " ")
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
    }

    /// Classe + número do processo extraídos dos precedentes (p/ busca oficial).
    var processoBusca: (classe: String, numero: String)? {
        let p = precedentes ?? enunciado
        let pattern = #"\b(RE|ARE|RHC|HC|MS|MI|Rcl|ADI|ADC|ADPF|ADO|AO|AP|Pet|Inq|REsp|AREsp|RMS|EREsp|CC|MC|SS|SL|STA)\s*n?º?\s*(\d[\d.\-]{2,})"#
        guard let re = try? NSRegularExpression(pattern: pattern),
              let m = re.firstMatch(in: p, range: NSRange(p.startIndex..., in: p)),
              let cr = Range(m.range(at: 1), in: p), let nr = Range(m.range(at: 2), in: p) else { return nil }
        let num = String(p[nr]).replacingOccurrences(of: ".", with: "")
            .split(separator: "-").first.map(String.init) ?? String(p[nr])
        return (classe: String(p[cr]), numero: num)
    }

    /// URL da página oficial do julgado/súmula no site do STF, STJ ou TSE.
    var fonteOficialURL: URL? {
        func q(_ s: String) -> String { s.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? s }
        // 1) usa a url armazenada se já for de domínio oficial (.jus.br, exceto buscadores)
        if let u = url, let parsed = URL(string: u), let h = parsed.host,
           h.hasSuffix("jus.br"), !h.contains("buscador") {
            return parsed
        }
        switch fonteKind {
        case .sumulaVinculante:
            guard let n = numero else { break }
            return URL(string: "https://jurisprudencia.stf.jus.br/pages/search?base=sumulas&sinonimo=true&plural=true&queryString=\(q("Súmula Vinculante \(n)"))")
        case .sumulaSTF:
            guard let n = numero else { break }
            if titulo.localizedCaseInsensitiveContains("vinculante") {
                return URL(string: "https://jurisprudencia.stf.jus.br/pages/search?base=sumulas&sinonimo=true&plural=true&queryString=\(q("Súmula Vinculante \(n)"))")
            }
            return URL(string: "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula\(n)/false")
        case .sumulaSTJ:
            guard let n = numero else { break }
            return URL(string: "https://scon.stj.jus.br/SCON/pesquisar.jsp?b=SUMU&livre=\(q("\(n).NUM."))")
        case .sumulaTSE:
            return URL(string: "https://www.tse.jus.br/legislacao/codigo-eleitoral/sumulas/sumulas-do-tse")
        case .repercussaoGeral:
            if let n = numero {
                return URL(string: "https://portal.stf.jus.br/jurisprudenciaRepercussaoGeral/verProcessoDetalhe.asp?numeroTema=\(n)")
            }
        case .repetitivo:
            if let n = numero {
                return URL(string: "https://processo.stj.jus.br/repetitivos/temas_repetitivos/pesquisa.jsp?novaConsulta=true&tipo_pesquisa=T&cod_tema_inicial=\(n)&cod_tema_final=\(n)")
            }
        case .informativoSTF:
            if let pr = processoBusca {
                return URL(string: "https://jurisprudencia.stf.jus.br/pages/search?base=acordaos&pesquisa_inteiro_teor=false&sinonimo=true&plural=true&queryString=\(q("\(pr.classe) \(pr.numero)"))")
            }
            return URL(string: "https://portal.stf.jus.br/servicos/informativos/")
        case .informativoSTJ:
            if let pr = processoBusca {
                return URL(string: "https://scon.stj.jus.br/SCON/pesquisar.jsp?livre=\(q("\(pr.classe) \(pr.numero)"))")
            }
            return URL(string: "https://scon.stj.jus.br/SCON/")
        case .informativoTSE:
            return URL(string: "https://www.tse.jus.br/jurisprudencia/informativos-tse")
        case .jurisEmTeses:
            return URL(string: "https://scon.stj.jus.br/SCON/jt/")
        default: break
        }
        // fallback: busca pelo processo no tribunal correspondente
        if let pr = processoBusca {
            if tribunal == "STJ" {
                return URL(string: "https://scon.stj.jus.br/SCON/pesquisar.jsp?livre=\(q("\(pr.classe) \(pr.numero)"))")
            }
            return URL(string: "https://jurisprudencia.stf.jus.br/pages/search?base=acordaos&queryString=\(q("\(pr.classe) \(pr.numero)"))")
        }
        return url.flatMap { URL(string: $0) }
    }

    /// Rótulo do link oficial (com o nome do tribunal).
    var fonteOficialLabel: String {
        switch tribunal {
        case "STF": return "Abrir no site do STF"
        case "STJ": return "Abrir no site do STJ"
        case "TSE": return "Abrir no site do TSE"
        case "TJRO": return "Abrir no site do TJRO"
        default: return "Abrir fonte oficial"
        }
    }

    /// Citação pronta para copiar.
    var citacao: String {
        var s = "\(titulo)"
        if fonteKind == .sumulaSTF || fonteKind == .sumulaSTJ { s = "\(tribunal), \(titulo)" }
        s += ": \(enunciado)"
        if let d = data { s += " (\(d))" }
        return s
    }
}

/// Situação canônica para filtragem.
enum SituacaoKind: String, CaseIterable, Identifiable {
    case vigente = "Vigente"
    case cancelada = "Cancelada"
    case superada = "Superada"
    var id: String { rawValue }

    var cor: Color {
        switch self {
        case .vigente: return Palette.fonteSTJ
        case .cancelada: return .red
        case .superada: return .orange
        }
    }
    var simbolo: String {
        switch self {
        case .vigente: return "checkmark.seal"
        case .cancelada: return "xmark.seal"
        case .superada: return "clock.arrow.circlepath"
        }
    }
}

/// Fontes de jurisprudência com metadados de exibição.
enum Fonte: String, CaseIterable, Identifiable {
    case sumulaVinculante = "sumula_vinculante"
    case sumulaSTF = "sumula_stf"
    case sumulaSTJ = "sumula_stj"
    case sumulaTSE = "sumula_tse"
    case tjro = "tjro"
    case tjroPrec = "tjro_prec"
    case repercussaoGeral = "repercussao_geral"
    case repetitivo = "repetitivo"
    case jurisEmTeses = "juris_em_teses"
    case informativoSTF = "informativo_stf"
    case informativoSTJ = "informativo_stj"
    case informativoTSE = "informativo_tse"
    case vadeMecumDOD = "vademecum_dod"
    case precedentesObrig = "precedentes_obrig"
    case controleConst = "controle_const"
    case adi = "stf_adi"
    case adc = "stf_adc"
    case ado = "stf_ado"
    case adpf = "stf_adpf"
    case selTJGO = "sel_tjgo"
    case selTJRJ = "sel_tjrj"
    case selTJPR = "sel_tjpr"
    case outro = "outro"

    var id: String { rawValue }

    var nome: String {
        switch self {
        case .sumulaVinculante: return "Súmulas Vinculantes"
        case .sumulaSTF: return "Súmulas do STF"
        case .sumulaSTJ: return "Súmulas do STJ"
        case .sumulaTSE: return "Súmulas do TSE"
        case .tjro: return "Súmulas do TJRO"
        case .tjroPrec: return "Precedentes do TJRO (IRDR/IAC)"
        case .repercussaoGeral: return "Repercussão Geral"
        case .repetitivo: return "Recursos Repetitivos"
        case .jurisEmTeses: return "Jurisprudência em Teses"
        case .informativoSTF: return "Informativos STF"
        case .informativoSTJ: return "Informativos STJ"
        case .informativoTSE: return "Informativos TSE"
        case .vadeMecumDOD: return "Vade Mecum DOD"
        case .precedentesObrig: return "Precedentes Obrigatórios"
        case .controleConst: return "Controle de Constitucionalidade (teses)"
        case .adi: return "ADI — Ação Direta de Inconstitucionalidade"
        case .adc: return "ADC — Ação Declaratória de Constitucionalidade"
        case .ado: return "ADO — Inconstitucionalidade por Omissão"
        case .adpf: return "ADPF — Descumprimento de Preceito Fundamental"
        case .selTJGO: return "Seleção TJGO"
        case .selTJRJ: return "Seleção TJRJ"
        case .selTJPR: return "Seleção TJPR / MPSC"
        case .outro: return "Outros"
        }
    }

    var nomeCurto: String {
        switch self {
        case .sumulaVinculante: return "Vinculante"
        case .sumulaSTF: return "Súmula STF"
        case .sumulaSTJ: return "Súmula STJ"
        case .sumulaTSE: return "Súmula TSE"
        case .tjro: return "Súmula TJRO"
        case .tjroPrec: return "IRDR/IAC TJRO"
        case .repercussaoGeral: return "Rep. Geral"
        case .repetitivo: return "Repetitivo"
        case .jurisEmTeses: return "Juris em Teses"
        case .informativoSTF: return "Info STF"
        case .informativoSTJ: return "Info STJ"
        case .informativoTSE: return "Info TSE"
        case .vadeMecumDOD: return "VM DOD"
        case .precedentesObrig: return "Prec. Obrig."
        case .controleConst: return "Controle Const."
        case .adi: return "ADI"
        case .adc: return "ADC"
        case .ado: return "ADO"
        case .adpf: return "ADPF"
        case .selTJGO: return "Sel. TJGO"
        case .selTJRJ: return "Sel. TJRJ"
        case .selTJPR: return "Sel. TJPR"
        case .outro: return "Outro"
        }
    }

    var simbolo: String {
        switch self {
        case .sumulaVinculante: return "checkmark.seal.fill"
        case .sumulaSTF: return "building.columns.fill"
        case .sumulaSTJ: return "building.columns"
        case .sumulaTSE: return "seal"
        case .tjro: return "building.2.fill"
        case .tjroPrec: return "signpost.right.fill"
        case .repercussaoGeral: return "arrow.triangle.branch"
        case .repetitivo: return "arrow.trianglehead.2.clockwise.rotate.90"
        case .jurisEmTeses: return "text.book.closed.fill"
        case .informativoSTF: return "newspaper.fill"
        case .informativoSTJ: return "newspaper"
        case .informativoTSE: return "envelope.open.badge.clock"
        case .vadeMecumDOD: return "book.fill"
        case .precedentesObrig: return "exclamationmark.octagon.fill"
        case .controleConst: return "shield.lefthalf.filled"
        case .adi: return "shield.fill"
        case .adc: return "checkmark.shield.fill"
        case .ado: return "shield.slash.fill"
        case .adpf: return "exclamationmark.shield.fill"
        case .selTJGO, .selTJRJ, .selTJPR: return "graduationcap.fill"
        case .outro: return "doc.text"
        }
    }

    var cor: Color {
        switch self {
        case .sumulaVinculante: return Palette.fonteSV
        case .sumulaSTF: return Palette.fonteSTF
        case .sumulaSTJ: return Palette.fonteSTJ
        case .sumulaTSE: return Palette.fonteTSE
        case .tjro: return Palette.fonteTJRO
        case .tjroPrec: return Palette.fonteTJROprec
        case .repercussaoGeral: return Palette.fonteRG
        case .repetitivo: return Palette.fonteRepetitivo
        case .jurisEmTeses: return Palette.fonteJT
        case .informativoSTF: return Palette.fonteInfoSTF
        case .informativoSTJ: return Palette.fonteInfoSTJ
        case .informativoTSE: return Palette.fonteInfoTSE
        case .vadeMecumDOD: return Palette.fonteDOD
        case .precedentesObrig: return Palette.fonteRG
        case .controleConst: return Palette.fonteSTF
        case .adi, .adc, .ado, .adpf: return Palette.fonteSV
        case .selTJGO: return Palette.fonteRepetitivo
        case .selTJRJ: return Palette.fonteJT
        case .selTJPR: return Palette.fonteInfoSTJ
        case .outro: return .secondary
        }
    }

    /// Fontes que navegam por edição (mostram a lista de edições e, dentro, os verbetes).
    var navegaPorEdicao: Bool {
        switch self {
        case .jurisEmTeses, .informativoSTF, .informativoSTJ, .informativoTSE: return true
        default: return false
        }
    }

    /// Ordem de exibição na barra lateral.
    static var ordem: [Fonte] {
        [.tjro, .tjroPrec, .sumulaVinculante, .sumulaSTF, .sumulaSTJ, .sumulaTSE, .repercussaoGeral, .repetitivo,
         .adi, .adc, .ado, .adpf, .jurisEmTeses,
         .informativoSTF, .informativoSTJ, .informativoTSE,
         .precedentesObrig, .controleConst, .selTJGO, .selTJRJ, .selTJPR, .vadeMecumDOD]
    }

    /// A Central (tribunal/grupo) a que esta fonte pertence na barra lateral.
    var central: JurisCentral {
        switch self {
        case .sumulaVinculante, .sumulaSTF, .informativoSTF, .repercussaoGeral,
             .adi, .adc, .ado, .adpf, .controleConst:
            return .stf
        case .sumulaSTJ, .informativoSTJ, .repetitivo, .jurisEmTeses:
            return .stj
        case .sumulaTSE, .informativoTSE:
            return .tse
        case .tjro, .tjroPrec, .selTJGO, .selTJRJ, .selTJPR:
            return .especificos
        case .vadeMecumDOD, .precedentesObrig, .outro:
            return .outros
        }
    }
}

/// As Centrais da barra lateral: uma página-hub por tribunal/grupo, com botões
/// que abrem as páginas de cada fonte (ex.: Central STF → Súmulas Vinculantes).
enum JurisCentral: String, CaseIterable, Identifiable {
    case stf, stj, tse, especificos, outros
    var id: String { rawValue }

    var nome: String {
        switch self {
        case .stf: return "Central STF"
        case .stj: return "Central STJ"
        case .tse: return "Central TSE"
        case .especificos: return "Tribunais Específicos"
        case .outros: return "DOD & Precedentes"
        }
    }
    var subtitulo: String {
        switch self {
        case .stf: return "Supremo Tribunal Federal — súmulas, informativos, repercussão geral e controle concentrado"
        case .stj: return "Superior Tribunal de Justiça — súmulas, informativos, repetitivos e Juris em Teses"
        case .tse: return "Tribunal Superior Eleitoral — súmulas e informativos"
        case .especificos: return "Uma central para cada tribunal — TJRO, TJGO, TJRJ, TJPR e os que você cadastrar"
        case .outros: return "Vade Mecum DOD, precedentes obrigatórios e demais fontes"
        }
    }
    var simbolo: String {
        switch self {
        case .stf: return "building.columns.fill"
        case .stj: return "building.columns"
        case .tse: return "checkmark.seal"
        case .especificos: return "building.2.fill"
        case .outros: return "book.fill"
        }
    }
    /// Fontes exibidas como botões dentro da Central, nesta ordem.
    var fontes: [Fonte] { Fonte.ordem.filter { $0.central == self } }
}

/// Central cadastrada PELO USUÁRIO para um tribunal qualquer (ex.: TJSP).
/// Persiste no state.json; os verbetes vêm de busca no acervo pela sigla.
struct TribunalCustom: Codable, Hashable, Identifiable {
    var id: String = UUID().uuidString
    var nome: String       // nome por extenso ("Tribunal de Justiça de São Paulo")
    var sigla: String      // "TJSP"
}

/// Uma central de tribunal específico (embutida ou cadastrada pela usuária) —
/// vive dentro da Central de Tribunais Específicos, UMA por tribunal.
struct TribunalEspecifico: Identifiable, Hashable {
    let id: String
    let nome: String        // "Central TJRO"
    let sigla: String
    let detalhe: String     // subtítulo por extenso
    let fontes: [Fonte]     // fontes do corpus (vazio = central cadastrada, casa por sigla)
    let aoVivo: Bool        // tem busca ao vivo no site do tribunal (TJRO/LIAME)
    let custom: Bool

    static let embutidos: [TribunalEspecifico] = [
        .init(id: "tjro", nome: "Central TJRO", sigla: "TJRO",
              detalhe: "Tribunal de Justiça de Rondônia — súmulas, IRDR/IAC e busca ao vivo",
              fontes: [.tjro, .tjroPrec], aoVivo: true, custom: false),
        .init(id: "tjgo", nome: "Central TJGO", sigla: "TJGO",
              detalhe: "Tribunal de Justiça de Goiás — seleção de jurisprudência",
              fontes: [.selTJGO], aoVivo: false, custom: false),
        .init(id: "tjrj", nome: "Central TJRJ", sigla: "TJRJ",
              detalhe: "Tribunal de Justiça do Rio de Janeiro — seleção de jurisprudência",
              fontes: [.selTJRJ], aoVivo: false, custom: false),
        .init(id: "tjpr", nome: "Central TJPR / MPSC", sigla: "TJPR",
              detalhe: "Tribunal de Justiça do Paraná e MP/SC — seleção de jurisprudência",
              fontes: [.selTJPR], aoVivo: false, custom: false),
    ]
}
