import Foundation
import CoreGraphics

/// Cabeçalho "Art. N" no início de uma linha do texto da norma. `intervalo` aponta para o
/// RÓTULO no texto original — o leitor nunca insere nem remove caracteres, porque os grifos
/// salvos são intervalos sobre esse mesmo texto.
struct CabecalhoArtigo: Equatable {
    let rotulo: String
    let numero: String
    let intervalo: NSRange
}

/// Lógica pura do leitor de lei (base visual, testável sem tela).
enum LeitorLogica {
    /// "Art. 5º" / "Art. 1.015" / "Art. 121-A" → "5" / "1015" / "121-A" — o formato que
    /// scripts/build-incidencia.mjs grava em incidencia-verbetes.json (era JurisPorArtigo.numeroDe).
    static func numero(de rotulo: String) -> String? {
        let s = rotulo.replacingOccurrences(of: ".", with: "")
        guard let r = s.range(of: #"\d+(?:-[A-Za-z])?"#, options: .regularExpression) else { return nil }
        return String(s[r]).uppercased()
    }

    private static let regexCabecalho = try! NSRegularExpression(
        pattern: #"(?m)^Art\.?\s*\d[\d.]*(?:\s*[ºo°])?(?:\s*-\s*[A-Za-z](?![a-z]))?"#)

    static func cabecalhos(em texto: String) -> [CabecalhoArtigo] {
        let ns = texto as NSString
        return regexCabecalho.matches(in: texto, range: NSRange(location: 0, length: ns.length)).compactMap { m in
            let rotulo = ns.substring(with: m.range)
            guard let n = numero(de: rotulo) else { return nil }
            return CabecalhoArtigo(rotulo: rotulo, numero: n, intervalo: m.range)
        }
    }

    /// Linhas do artigo `c`: do cabeçalho até antes do próximo (ou o fim do texto).
    static func trecho(de c: CabecalhoArtigo, em texto: String, cabecalhos: [CabecalhoArtigo]) -> [String] {
        let ns = texto as NSString
        let inicio = c.intervalo.location
        let fim = cabecalhos.first { $0.intervalo.location > inicio }?.intervalo.location ?? ns.length
        return ns.substring(with: NSRange(location: inicio, length: fim - inicio))
            .components(separatedBy: "\n")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
    }
}

/// As três alturas da gaveta de contexto. Nunca fica no meio do caminho: um arrasto maior
/// que 80 pt sobe (dy < 0) ou desce (dy > 0) UM degrau.
enum AlturaGaveta: Equatable {
    case fechada, meia, cheia

    func apos(arrasto dy: CGFloat) -> AlturaGaveta {
        let limiar: CGFloat = 80
        if dy <= -limiar { return self == .fechada ? .meia : .cheia }
        if dy >= limiar { return self == .cheia ? .meia : .fechada }
        return self
    }

    /// Fração da altura disponível. No compacto (iPhone, Slide Over) abre direto cheia.
    func fracao(compacto: Bool) -> CGFloat {
        switch self {
        case .fechada: return 0
        case .meia:    return compacto ? 1 : 0.5
        case .cheia:   return 1
        }
    }
}
