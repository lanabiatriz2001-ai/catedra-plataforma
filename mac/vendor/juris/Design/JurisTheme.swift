import SwiftUI
import AppKit

extension Color {
    /// Cor a partir de hex "#RRGGBB".
    init(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespaces)
        if s.hasPrefix("#") { s.removeFirst() }
        var v: UInt64 = 0
        Scanner(string: s).scanHexInt64(&v)
        let r = Double((v & 0xFF0000) >> 16) / 255
        let g = Double((v & 0x00FF00) >> 8) / 255
        let b = Double(v & 0x0000FF) / 255
        self = Color(.sRGB, red: r, green: g, blue: b, opacity: 1)
    }

    /// Representação "#RRGGBB" da cor (para persistir grifos personalizados).
    var hexString: String {
        let ns = NSColor(self).usingColorSpace(.sRGB) ?? NSColor(self)
        let r = Int((ns.redComponent * 255).rounded())
        let g = Int((ns.greenComponent * 255).rounded())
        let b = Int((ns.blueComponent * 255).rounded())
        return String(format: "#%02X%02X%02X", r, g, b)
    }

    /// Cor dinâmica que se adapta a claro/escuro.
    static func dynamic(light: String, dark: String) -> Color {
        Color(nsColor: NSColor(name: nil) { appearance in
            let isDark = appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
            return NSColor(Color(hex: isDark ? dark : light))
        })
    }
}

/// Identidade de COR por RAMO do direito — a MESMA paleta por matéria do
/// CátedraLEGIS (linguagem "vitrine"), casada pelo nome do ramo. Assim Penal é
/// rosé nos dois apps, Civil é teal, Constitucional é azul etc.
enum RamoStyle {
    static func stops(_ ramo: String?) -> [Color] {
        let n = (ramo ?? "")
            .folding(options: .diacriticInsensitive, locale: Locale(identifier: "pt_BR"))
            .lowercased()
        func hit(_ parts: String...) -> Bool { parts.contains { n.contains($0) } }
        if hit("constituc")                { return [Color(hex: "#2563EB"), Color(hex: "#38BDF8")] }
        if hit("penal", "criminal")        { return [Color(hex: "#E11D48"), Color(hex: "#FB7185")] }
        if hit("trabalh")                  { return [Color(hex: "#D97706"), Color(hex: "#FBBF24")] }
        if hit("previden")                 { return [Color(hex: "#DB2777"), Color(hex: "#F472B6")] }
        if hit("tribut")                   { return [Color(hex: "#7C3AED"), Color(hex: "#A78BFA")] }
        if hit("empresar", "econom")       { return [Color(hex: "#65A30D"), Color(hex: "#A3E635")] }
        if hit("administr", "eleitor")     { return [Color(hex: "#4F46E5"), Color(hex: "#818CF8")] }
        if hit("consum")                   { return [Color(hex: "#EA580C"), Color(hex: "#FB923C")] }
        if hit("ambient")                  { return [Color(hex: "#16A34A"), Color(hex: "#4ADE80")] }
        if hit("digital", "propriedade intelectual") { return [Color(hex: "#C026D3"), Color(hex: "#E879F9")] }
        if hit("internacional", "humanos") { return [Color(hex: "#0EA5E9"), Color(hex: "#7DD3FC")] }
        if hit("civil")                    { return [Color(hex: "#0D9488"), Color(hex: "#2DD4BF")] }
        return [Palette.accent, Palette.accentSoft]
    }
    static func color(_ ramo: String?) -> Color { stops(ramo)[0] }
    static func gradient(_ ramo: String?) -> LinearGradient {
        LinearGradient(colors: stops(ramo), startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}

/// Paleta do app — "Jurídico premium": azul-marinho + dourado.
/// Escuro = marinho profundo; Claro = marfim/pergaminho (revista jurídica).
enum Palette {
    // ESPELHO do Cátedra: os tokens vêm de ThemeState.t (CSS vars computadas do web
    // app, importadas pelo host em applyCatedraTheme) — igual ao CátedraLEGIS. Mudar
    // a identidade visual no Ajustes do Cátedra reflete aqui.
    static var accent: Color          { ThemeState.t.accent }
    static var accentSoft: Color      { ThemeState.t.accentD }
    static let importante             = Color.dynamic(light: "#E0A400", dark: "#F5C542") // âmbar = destaque

    // Superfícies — tokens do Cátedra
    static var appBackground: Color    { ThemeState.t.bg }
    static var sidebarBackground: Color { ThemeState.t.surface }   // barras/painéis claros
    static var cardBackground: Color   { ThemeState.t.surface }
    static var detailBackground: Color { ThemeState.t.bg }
    static var elevated: Color         { ThemeState.t.surface2 }
    static var hairline: Color         { ThemeState.t.border }

    // Tinta
    static var readingInk: Color       { ThemeState.t.ink }
    static var titleInk: Color         { ThemeState.t.ink }
    static var bodyInk: Color          { ThemeState.t.text2 }
    static var secondaryInk: Color     { ThemeState.t.text3 }

    static let highlight        = Color.dynamic(light: "#FCE7A1", dark: "#5A4A12")
    static var selection: Color        { ThemeState.t.accent.opacity(0.12) }

    // Fontes seguem o ACENTO (monocromático, como as matérias no CátedraLEGIS).
    static var fonteSV: Color          { ThemeState.t.accent }
    static var fonteSTF: Color         { ThemeState.t.accent }
    static var fonteSTJ: Color         { ThemeState.t.accent }
    static var fonteTSE: Color         { ThemeState.t.accent }
    static var fonteRG: Color          { ThemeState.t.accent }
    static var fonteRepetitivo: Color  { ThemeState.t.accent }
    static var fonteJT: Color          { ThemeState.t.accent }
    static var fonteInfoSTF: Color     { ThemeState.t.accent }
    static var fonteInfoSTJ: Color     { ThemeState.t.accent }
    static var fonteInfoTSE: Color     { ThemeState.t.accent }
    static var fonteDOD: Color         { ThemeState.t.accent }
    static var fonteTJRO: Color        { ThemeState.t.accent }
    static var fonteTJROprec: Color    { ThemeState.t.accent }
}

/// Tipografia moderna (sans). Os nomes "serif*" são mantidos por compatibilidade
/// das chamadas, mas agora usam a fonte de sistema (SF Pro) — visual limpo e atual.
enum Typo {
    /// Família de fonte de leitura escolhida pela usuária (nil = fonte do sistema).
    static var readingFamily: String? {
        let f = UserDefaults.standard.string(forKey: "readingFontFamily")
        return (f?.isEmpty == false) ? f : nil
    }
    static func serifTitle(_ size: CGFloat, _ weight: Font.Weight = .bold) -> Font {
        if let fam = readingFamily { return Font.custom(fam, size: size).weight(weight) }
        return .system(size: size, weight: weight, design: .default)
    }
    static func serifBody(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        if let fam = readingFamily { return Font.custom(fam, size: size).weight(weight) }
        return .system(size: size, weight: weight, design: .default)
    }
    /// Fonte da interface (chrome) — sempre o sistema, para manter a legibilidade.
    static func ui(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .default)
    }
}

/// Recorte combinado de verbetes: central OU tribunal específico, refinado por
/// disciplina, tipo de jurisprudência (fonte) e/ou assunto (tema). É o "endereço"
/// das páginas de navegação Central → Disciplina → Tipo/Assunto.
struct EscopoFiltrado: Hashable {
    var central: JurisCentral? = nil
    var tribunal: String? = nil    // id de um TribunalEspecifico
    var ramo: String? = nil        // disciplina canônica
    var fonte: Fonte? = nil        // tipo de jurisprudência
    var tema: String? = nil        // assunto
}

/// Escopo do que está sendo exibido na lista central.
enum Selecao: Hashable {
    case inicio
    case todos
    case favoritos
    case anotacoes            // verbetes com anotação pessoal
    case novidades            // atualizações vindas dos sites oficiais
    case indice               // índice alfabético de assuntos
    case tjroHub              // central do TJRO (súmulas + IRDR/IAC + busca ao vivo)
    case fonte(Fonte)
    case ramo(String)
    case tema(String)         // um assunto do índice
    case edicao(Int)          // uma edição do Juris em Teses
    case infoEdicao(Fonte, Int)  // um informativo (STF/STJ/TSE)
    case colecao(String)      // uma coleção "Meu edital"
    case mapas                // galeria de mapas mentais feitos
    case checklist             // checklist de leitura PRÓPRIA do JURIS (metas livres)
    case central(JurisCentral) // página-hub de um tribunal (Central STF, STJ…)
    case tribunal(String)     // central de UM tribunal específico (TJRO, TJGO… ou cadastrado)
    case ramosHub             // página "Ramos do Direito" (todas as disciplinas)
    case ramoDetalhe(EscopoFiltrado)  // página de uma disciplina (assuntos + tipos), escopada ou não
    case filtro(EscopoFiltrado)       // lista final de um recorte combinado

    var titulo: String {
        switch self {
        case .inicio: return "Início"
        case .todos: return "Todos os verbetes"
        case .favoritos: return "Favoritos"
        case .anotacoes: return "Minhas anotações"
        case .novidades: return "Novidades"
        case .indice: return "Índice alfabético"
        case .tjroHub: return "Central do TJRO"
        case .fonte(let f): return f.nome
        case .ramo(let r): return r
        case .tema(let t): return t
        case .edicao(let n): return "Edição \(n)"
        case .infoEdicao(let f, let n): return "Info \(n) · \(f.nomeCurto.replacingOccurrences(of: "Info ", with: ""))"
        case .colecao: return "Coleção"
        case .mapas: return "Mapas mentais"
        case .checklist: return "Checklist de leitura"
        case .central(let c): return c.nome
        case .tribunal: return "Central do tribunal"
        case .ramosHub: return "Ramos do Direito"
        case .ramoDetalhe(let f): return f.ramo ?? "Disciplina"
        case .filtro(let f): return f.fonte?.nome ?? f.tema ?? f.ramo ?? "Verbetes"
        }
    }

    var simbolo: String {
        switch self {
        case .inicio: return "house.fill"
        case .todos: return "square.stack.3d.up.fill"
        case .favoritos: return "star.fill"
        case .anotacoes: return "square.and.pencil"
        case .novidades: return "sparkles"
        case .indice: return "textformat.abc.dottedunderline"
        case .tjroHub: return "building.2.fill"
        case .fonte(let f): return f.simbolo
        case .ramo: return "books.vertical.fill"
        case .tema: return "number"
        case .edicao: return "text.book.closed.fill"
        case .infoEdicao: return "newspaper"
        case .colecao: return "folder.fill"
        case .mapas: return "brain.head.profile"
        case .checklist: return "checklist"
        case .central(let c): return c.simbolo
        case .tribunal: return "building.2.fill"
        case .ramosHub: return "books.vertical.fill"
        case .ramoDetalhe: return "bookmark.fill"
        case .filtro(let f): return f.fonte?.simbolo ?? (f.tema != nil ? "number" : "books.vertical.fill")
        }
    }
}

/// Preferência de aparência do app.
enum Appearance: String, CaseIterable, Identifiable {
    case sistema, claro, escuro
    var id: String { rawValue }
    var nome: String {
        switch self {
        case .sistema: return "Sistema"
        case .claro: return "Claro"
        case .escuro: return "Escuro"
        }
    }
    var simbolo: String {
        switch self {
        case .sistema: return "circle.lefthalf.filled"
        case .claro: return "sun.max.fill"
        case .escuro: return "moon.fill"
        }
    }
    var colorScheme: ColorScheme? {
        switch self {
        case .sistema: return nil
        case .claro: return .light
        case .escuro: return .dark
        }
    }
}

/// Filtro por situação/importância aplicado sobre o escopo atual.
enum Filtro: String, CaseIterable, Identifiable {
    case todos = "Todos"
    case naoLidos = "Não lidos"
    case vigentes = "Vigentes"
    case canceladas = "Canceladas"
    case superadas = "Superadas"
    case importantes = "Importantes"
    var id: String { rawValue }

    var simbolo: String {
        switch self {
        case .todos: return "line.3.horizontal.decrease.circle"
        case .naoLidos: return "circle"
        case .vigentes: return "checkmark.seal"
        case .canceladas: return "xmark.seal"
        case .superadas: return "clock.arrow.circlepath"
        case .importantes: return "bolt.fill"
        }
    }

    var cor: Color {
        switch self {
        case .todos: return .secondary
        case .naoLidos: return Palette.accent
        case .vigentes: return Palette.fonteSTJ
        case .canceladas: return .red
        case .superadas: return .orange
        case .importantes: return Palette.importante
        }
    }
}

enum Ordenacao: String, CaseIterable, Identifiable {
    case relevancia = "Relevância"
    case numeroDesc = "Número (maior)"
    case numeroAsc  = "Número (menor)"
    case fonte      = "Fonte"
    var id: String { rawValue }
    var simbolo: String {
        switch self {
        case .relevancia: return "sparkles"
        case .numeroDesc: return "arrow.down"
        case .numeroAsc: return "arrow.up"
        case .fonte: return "tray.2"
        }
    }
}
