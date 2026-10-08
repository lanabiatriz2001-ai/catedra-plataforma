import SwiftUI
import AppKit
import WidgetKit

// Capturas dos widgets para revisão (tests/widget-capturas.mjs): as telas-folha, sem o WidgetKit em volta, no
// tamanho de cada família, no claro, no escuro e na baixa estimulação, com nomes de matéria e concurso longos.
// Uso: capturas <pasta de saída> <widget/dodia.json>

let tamanhos: [String: CGSize] = ["pequeno": CGSize(width: 170, height: 170), "medio": CGSize(width: 364, height: 170),
                                  "grande": CGSize(width: 364, height: 382), "xl": CGSize(width: 715, height: 338)]

@MainActor func salvar(_ v: AnyView, _ tam: CGSize, escuro: Bool, _ url: URL) -> Bool {
    let r = ImageRenderer(content: v.frame(width: tam.width, height: tam.height).environment(\.colorScheme, escuro ? .dark : .light).environment(\.capturando, true))
    r.scale = 2
    guard let cg = r.cgImage, let png = NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:]) else { return false }
    return (try? png.write(to: url)) != nil
}
func comFundo<V: View>(_ v: V, _ paradas: [WidgetRGB], baixa: Bool) -> AnyView {
    AnyView(ZStack { FundoGradiente(paradas: paradas, baixa: baixa); v.padding(16) })
}
func noSistema<V: View>(_ v: V) -> AnyView { AnyView(ZStack { Rectangle().fill(.background); v.padding(16) }) }

@MainActor func gerar(_ saida: URL, _ dodia: URL) -> Bool {
    let agora = Date()
    var normal = WidgetResumo.exemplo(agora)
    normal.revisoes.atrasadas = 12
    var longo = normal
    longo.ciclo.proximos = [
        .init(disc: "Direito da Criança e do Adolescente", min: 120, cor: "#db2777", corD: "#f8a5cf"),
        .init(disc: "Direito Processual Civil", min: 50, cor: "#0d9488", corD: "#2dd4bf"),
        .init(disc: "Direito do Trabalho", min: 40, cor: "#d97706", corD: "#fbbf24")]
    longo.prova = .init(data: normal.prova!.data, nome: "Tribunal de Justiça do Estado de São Paulo — Juiz Substituto")
    var baixa = normal; baixa.prefs.baixa = true
    var vazio = WidgetResumo(); vazio.geradoEm = agora.timeIntervalSince1970 * 1000
    let itens = (try? Data(contentsOf: dodia)).map(WidgetDoDia.carregar) ?? []
    var casos: [(String, AnyView, CGSize, Bool)] = []
    for (nome, r) in [("normal", normal), ("longo", longo), ("baixa", baixa), ("vazio", vazio)] {
        let h = WidgetHoje.calcular(r, agora: agora)
        let mat = WidgetCores.gradienteMateria(h.proximo?.cor ?? r.prefs.tema.accent)
        let tema = WidgetCores.gradienteTema(r.prefs.tema.grad, accent: r.prefs.tema.accent)
        for escuro in [false, true] {
            let sx = escuro ? "-escuro" : ""
            casos.append(("agora-pequeno-\(nome)\(sx)", comFundo(AgoraPequeno(h: h), mat, baixa: h.baixa), tamanhos["pequeno"]!, escuro))
            casos.append(("agora-medio-\(nome)\(sx)", comFundo(AgoraMedio(h: h), mat, baixa: h.baixa), tamanhos["medio"]!, escuro))
            casos.append(("agora-grande-\(nome)\(sx)", comFundo(AgoraGrande(h: h), mat, baixa: h.baixa), tamanhos["grande"]!, escuro))
            casos.append(("prova-pequeno-\(nome)\(sx)", comFundo(ProvaPequeno(h: h), tema, baixa: h.baixa), tamanhos["pequeno"]!, escuro))
            casos.append(("prova-medio-\(nome)\(sx)", comFundo(ProvaAmpla(h: h, grande: false), tema, baixa: h.baixa), tamanhos["medio"]!, escuro))
            casos.append(("prova-grande-\(nome)\(sx)", comFundo(ProvaAmpla(h: h, grande: true), tema, baixa: h.baixa), tamanhos["grande"]!, escuro))
            casos.append(("semana-grande-\(nome)\(sx)", comFundo(SemanaGrande(h: h), tema, baixa: h.baixa), tamanhos["grande"]!, escuro))
            casos.append(("ritmo-pequeno-\(nome)\(sx)", comFundo(RitmoCartao(h: h, medio: false), tema, baixa: h.baixa), tamanhos["pequeno"]!, escuro))
            casos.append(("ritmo-medio-\(nome)\(sx)", comFundo(RitmoCartao(h: h, medio: true), tema, baixa: h.baixa), tamanhos["medio"]!, escuro))
            for (tam, familia) in [("pequeno", WidgetKit.WidgetFamily.systemSmall), ("medio", .systemMedium), ("grande", .systemLarge)] {
                casos.append(("revisoes-\(tam)-\(nome)\(sx)", comFundo(RevisoesCartao(h: h, r: r, familia: familia), tema, baixa: h.baixa), tamanhos[tam]!, escuro))
            }
            casos.append(("semana-pequeno-\(nome)\(sx)", comFundo(SemanaPequeno(h: h), tema, baixa: h.baixa), tamanhos["pequeno"]!, escuro))
            casos.append(("semana-medio-\(nome)\(sx)", comFundo(SemanaMedio(h: h), tema, baixa: h.baixa), tamanhos["medio"]!, escuro))
            casos.append(("painel-xl-\(nome)\(sx)", noSistema(PainelConteudo(h: h, r: r, item: itens.first)), tamanhos["xl"]!, escuro))
        }
    }
    let longoItem = itens.max { $0.texto.count < $1.texto.count }
    for (nome, item) in [("primeiro", itens.first), ("mais-longo", longoItem)] {
        guard let i = item else { continue }
        for escuro in [false, true] {
            let sx = escuro ? "-escuro" : ""
            casos.append(("dodia-pequeno-\(nome)\(sx)", noSistema(DoDiaPequeno(i: i)), tamanhos["pequeno"]!, escuro))
            casos.append(("dodia-medio-\(nome)\(sx)", noSistema(DoDiaCartao(i: i, grande: false)), tamanhos["medio"]!, escuro))
            casos.append(("dodia-grande-\(nome)\(sx)", noSistema(DoDiaCartao(i: i, grande: true)), tamanhos["grande"]!, escuro))
        }
    }
    var indice: [[String: Any]] = []
    var tudoOk = true
    for (nome, vista, tam, escuro) in casos {
        let arq = nome + ".png"
        if salvar(vista, tam, escuro: escuro, saida.appendingPathComponent(arq)) {
            print("ok " + arq)
            indice.append(["arquivo": arq, "largura": Int(tam.width * 2), "altura": Int(tam.height * 2)])
        } else { print("FALHA " + arq); tudoOk = false }
    }
    if let d = try? JSONSerialization.data(withJSONObject: indice, options: [.prettyPrinted]) {
        try? d.write(to: saida.appendingPathComponent("indice.json"))
    }
    return tudoOk
}

@main enum Capturas {
    static func main() {
        let args = CommandLine.arguments
        guard args.count >= 3 else { print("uso: capturas <saída> <dodia.json>"); exit(2) }
        let saida = URL(fileURLWithPath: args[1])
        try? FileManager.default.createDirectory(at: saida, withIntermediateDirectories: true)
        let deuCerto = MainActor.assumeIsolated { gerar(saida, URL(fileURLWithPath: args[2])) }
        exit(deuCerto ? 0 : 1)
    }
}
