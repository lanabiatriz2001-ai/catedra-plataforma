import SwiftUI
import CoreText
#if os(iOS)
import UIKit
#endif

/// As fontes da casa no NATIVO. Elas já vão no bundle, em web/fonts (woff2), para o
/// WebView; o CoreText registra woff2 direto (conferido em 25/09/2026 no macOS 27).
/// Registro por processo, no início do app. Se falhar, a tipografia cai para a fonte do
/// sistema — nunca tela em branco.
enum DSFontes {
    static let familiasDaCasa = ["Spectral", "Inter", "Inter Tight", "Space Grotesk", "JetBrains Mono"]
    private(set) static var registradas: Set<String> = []

    /// Nome CSS → nome de família que o CoreText devolve, quando diferem. Os woff2 da
    /// Space Grotesk são fonte VARIÁVEL cuja instância padrão se chama "Space Grotesk Light"
    /// (conferido em 25/09/2026); é por esse nome que o Font.custom a encontra.
    static let nomeNoCoreText = ["Space Grotesk": "Space Grotesk Light"]
    static func nomeReal(_ familia: String) -> String { nomeNoCoreText[familia] ?? familia }

    /// web/fonts dentro do bundle: Contents/Resources/web/fonts no Mac, <app>/web/fonts no iPad.
    static func pastaDoApp() -> URL? {
        Bundle.main.resourceURL?.appendingPathComponent("web/fonts", isDirectory: true)
    }

    @discardableResult
    static func registrar(pasta: URL? = pastaDoApp()) -> Set<String> {
        guard let pasta,
              let itens = try? FileManager.default.contentsOfDirectory(at: pasta, includingPropertiesForKeys: nil)
        else { return registradas }
        for url in itens where url.pathExtension == "woff2" {
            var erro: Unmanaged<CFError>?
            let ok = CTFontManagerRegisterFontsForURL(url as CFURL, .process, &erro)
            let jaEstava = erro.map {
                CFErrorGetCode($0.takeRetainedValue()) == CTFontManagerError.alreadyRegistered.rawValue
            } ?? false
            guard ok || jaEstava else { continue }
            guard let descs = CTFontManagerCreateFontDescriptorsFromURL(url as CFURL) as? [CTFontDescriptor]
            else { continue }
            for d in descs {
                if let fam = CTFontDescriptorCopyAttribute(d, kCTFontFamilyNameAttribute) as? String {
                    registradas.insert(fam)
                    for (css, real) in nomeNoCoreText where real == fam { registradas.insert(css) }
                }
            }
        }
        return registradas
    }

    static func disponivel(_ familia: String) -> Bool { registradas.contains(familia) }
}

/// Os quatro degraus da interface (spec §4.2). O tamanho de LEITURA é escolha da pessoa.
enum DSTipo: CGFloat { case micro = 12, corpo = 15, titulo = 19, display = 26 }

extension DS {
    /// Piso de 11 pt e, no iPad, Dynamic Type pela métrica do corpo. É aplicada UMA vez:
    /// as fontes abaixo usam `fixedSize`, para o SwiftUI não escalar de novo.
    static func escala(_ size: CGFloat) -> CGFloat {
        #if os(iOS)
        return UIFontMetrics(forTextStyle: .body).scaledValue(for: max(11, size))
        #else
        return max(11, size)
        #endif
    }

    /// Interface (rótulos, listas, botões): Inter.
    static func interface(_ size: CGFloat, _ peso: Font.Weight = .regular) -> Font {
        familia("Inter", size, peso, queda: .default)
    }
    /// Títulos e números grandes: a família de display da direção ativa.
    static func display(_ size: CGFloat, _ peso: Font.Weight = .bold) -> Font {
        familia(ThemeState.t.displayFamilia, size, peso,
                queda: ThemeState.t.displaySerif ? .serif : .default)
    }
    /// Só onde há medida: número de dispositivo, contagem, data.
    static func mono(_ size: CGFloat, _ peso: Font.Weight = .medium) -> Font {
        familia("JetBrains Mono", size, peso, queda: .monospaced)
    }
    static func tipo(_ t: DSTipo, _ peso: Font.Weight = .regular) -> Font {
        (t == .titulo || t == .display) ? display(t.rawValue, peso) : interface(t.rawValue, peso)
    }

    /// Primeira família de um valor CSS de `--display`, se for uma das da casa.
    static func familiaDisplay(css: String) -> String? {
        guard let primeira = css.split(separator: ",").first else { return nil }
        let nome = primeira.trimmingCharacters(in: CharacterSet(charactersIn: " '\""))
        return DSFontes.familiasDaCasa.contains(nome) ? nome : nil
    }

    private static func familia(_ nome: String, _ size: CGFloat, _ peso: Font.Weight,
                                queda: Font.Design) -> Font {
        let s = escala(size)
        guard DSFontes.disponivel(nome) else { return .system(size: s, weight: peso, design: queda) }
        return Font.custom(DSFontes.nomeReal(nome), fixedSize: s).weight(peso)
    }
}
