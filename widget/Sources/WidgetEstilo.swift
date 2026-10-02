import SwiftUI
import WidgetKit

extension Color { init(_ c: WidgetRGB) { self.init(red: c.r, green: c.g, blue: c.b) } }

enum Estilo {
    static func numero(_ tamanho: CGFloat) -> Font { .system(size: tamanho, weight: .heavy, design: .rounded) }
    /// "Direito Constitucional" → "Constitucional"; "Direito do Trabalho" → "Do Trabalho".
    static func curto(_ disc: String) -> String {
        var s = disc.trimmingCharacters(in: .whitespaces)
        if s.lowercased().hasPrefix("direito ") { s = String(s.dropFirst(8)) }
        guard let f = s.first else { return disc }
        return f.uppercased() + s.dropFirst()
    }
    static let meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
    /// "2026-10-31" → "31 out 2026".
    static func dataCurta(_ ymd: String) -> String {
        let p = ymd.split(separator: "-").compactMap { Int($0) }
        guard p.count == 3, (1...12).contains(p[1]) else { return ymd }
        return "\(p[2]) \(meses[p[1] - 1]) \(p[0])"
    }
    /// 45 → "45 min"; 60 → "1h"; 390 → "6h30".
    static func horas(_ min: Int) -> String {
        if min < 60 { return "\(min) min" }
        let h = min / 60, m = min % 60
        return m == 0 ? "\(h)h" : "\(h)h" + String(format: "%02d", m)
    }
    static func revisoes(_ n: Int) -> String { n == 1 ? "1 revisão" : "\(n) revisões" }
}

func ehAcessorio(_ f: WidgetFamily) -> Bool {
    #if os(iOS)
    return f == .accessoryCircular || f == .accessoryRectangular || f == .accessoryInline
    #else
    return false
    #endif
}

/// Rótulo pequeno em caixa alta (o "eyebrow" das telas do app).
struct Eyebrow: View {
    let texto: String
    var body: some View { Text(texto.uppercased()).font(.system(size: 10, weight: .heavy)).kerning(1.4).lineLimit(1) }
}

/// Gradiente com as duas pontas já escurecidas até o branco passar 4,5:1 (WidgetCores). Na baixa estimulação vira
/// o fundo do sistema e o texto vira `.primary`.
struct FundoGradiente: View {
    let paradas: [WidgetRGB]
    let baixa: Bool
    var body: some View {
        if baixa { Rectangle().fill(.background) }
        else { LinearGradient(colors: paradas.map { Color($0) }, startPoint: .topLeading, endPoint: .bottomTrailing) }
    }
}

/// Fundo do "estudar agora": gradiente da matéria do bloco do ponteiro.
struct FundoAgora: View {
    let e: EntradaCatedra
    @Environment(\.widgetFamily) var familia
    var body: some View {
        if ehAcessorio(familia) { Color.clear }
        else if let r = e.resumo {
            FundoGradiente(paradas: WidgetCores.gradienteMateria(e.hoje?.proximo?.cor ?? r.prefs.tema.accent), baixa: r.prefs.baixa)
        } else { Rectangle().fill(.background) }
    }
}

/// Fundo de prova e semana: gradiente do tema escolhido no app.
struct FundoTema: View {
    let e: EntradaCatedra
    @Environment(\.widgetFamily) var familia
    var body: some View {
        if ehAcessorio(familia) { Color.clear }
        else if let r = e.resumo {
            FundoGradiente(paradas: WidgetCores.gradienteTema(r.prefs.tema.grad, accent: r.prefs.tema.accent), baixa: r.prefs.baixa)
        } else { Rectangle().fill(.background) }
    }
}

/// Nome da matéria como TEXTO sobre o fundo do sistema: escurecido no claro, clareado no escuro, sempre ≥ 4,5:1.
struct TextoMateria: View {
    let texto: String; let cor: String; let corD: String; let fonte: Font; var linhas = 1
    @Environment(\.colorScheme) var esquema
    var body: some View {
        Text(texto).font(fonte).lineLimit(linhas).minimumScaleFactor(0.7)
            .foregroundStyle(Color(esquema == .dark ? WidgetCores.textoSobreEscuro(corD) : WidgetCores.textoSobreClaro(cor)))
            .widgetAccentable()
    }
}

struct BarraProgresso: View {
    let pct: Int; let tinta: Color; let rotulo: String
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(tinta.opacity(0.25))
                Capsule().fill(tinta).frame(width: max(6, g.size.width * CGFloat(min(100, max(0, pct))) / 100))
            }
        }
        .frame(height: 6)
        .accessibilityElement().accessibilityLabel(rotulo).accessibilityValue("\(pct) por cento")
    }
}

/// "atualizado há X", só quando o resumo passou de 12 h.
struct RotuloVelho: View {
    let h: WidgetHoje; let tinta: Color
    var body: some View {
        if let s = h.envelhecidoHa {
            Label(WidgetHoje.rotuloEnvelhecido(s), systemImage: "clock.arrow.circlepath")
                .font(.system(size: 10, weight: .semibold)).foregroundStyle(tinta).lineLimit(1)
        }
    }
}

/// Estado sem dado: ícone, título e frase, no fundo do sistema.
struct EstadoTexto: View {
    let icone: String; let titulo: String; let texto: String
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: icone).font(.system(size: 22, weight: .semibold)).accessibilityHidden(true)
            Text(titulo).font(.system(size: 16, weight: .heavy, design: .rounded)).lineLimit(2).minimumScaleFactor(0.8)
            Text(texto).font(.system(size: 12)).lineLimit(3)
        }
        .foregroundStyle(.primary)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

struct EstadoEntrar: View {
    var body: some View { EstadoTexto(icone: "person.crop.circle.badge.plus", titulo: "Entre no Cátedra", texto: "Abra o app uma vez para o widget começar.") }
}

private struct ChaveCaptura: EnvironmentKey { static let defaultValue = false }
extension EnvironmentValues {
    /// Verdadeiro só no renderizador de capturas: o `ImageRenderer` não desenha `Link` (sai um quadro de "proibido").
    var capturando: Bool { get { self[ChaveCaptura.self] } set { self[ChaveCaptura.self] = newValue } }
}

/// `Link` do widget; nas capturas, só o conteúdo.
struct LinkWidget<Conteudo: View>: View {
    let destino: URL
    @ViewBuilder let conteudo: () -> Conteudo
    @Environment(\.capturando) var capturando
    var body: some View {
        if capturando { conteudo() } else { Link(destination: destino, label: conteudo) }
    }
}
