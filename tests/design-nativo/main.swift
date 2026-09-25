// Testes da base visual nativa (ios/vendor/design). Compilados só com a base, no Mac,
// por scripts/testar-design-nativo.sh — o projeto não tem XCTest. Saída: uma linha ✓/✗
// por conferência; código de saída 1 se alguma falhar.
import Foundation
import SwiftUI

var falhas = 0
func confere(_ c: Bool, _ rotulo: String) {
    print((c ? "✓ " : "✗ ") + rotulo)
    if !c { falhas += 1 }
}
let pastaFontes = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : ""

// ── Tema e cor ──────────────────────────────────────────────────────────────
confere(Color.hexDe(css: "#fffdf8") == 0xFFFDF8, "hexDe lê #rrggbb")
confere(Color.hexDe(css: "#abc") == 0xAABBCC, "hexDe expande #rgb")
confere(Color.hexDe(css: " rgb(32, 29, 23) ") == 0x201D17, "hexDe lê rgb() com espaços")
confere(Color.hexDe(css: "rgba(0, 0, 0, 0)") == nil, "hexDe ignora cor transparente")
confere(Color.hexDe(css: "") == nil && Color.hexDe(css: "lixo") == nil, "hexDe ignora vazio e lixo")
confere(Color(css: "lixo") == nil, "Color(css:) devolve nil para lixo")
confere(abs(DSCor.contraste(0x000000, 0xFFFFFF) - 21) < 0.01, "contraste preto × branco = 21:1")
confere(abs(DSCor.contraste(0xFFFDF8, 0xFFFDF8) - 1) < 0.001, "contraste de uma cor com ela mesma = 1:1")
let tx = DSCor.texto(identidade: 0x65A30D, superficie: 0xFFFDF8, escuro: false)
confere(DSCor.contraste(tx, 0xFFFDF8) >= 4.5, "cor-texto do lima escurece até 4,5:1 no claro")
confere(ThemeState.t.surfaceHex == 0xFFFDF8 && ThemeState.t.displayFamilia == "Spectral",
        "tema de partida é a Planilha (superfície #fffdf8, display Spectral)")

// (Tasks 2 e 3 acrescentam blocos aqui, antes do fechamento.)

print(falhas == 0 ? "\nbase visual: tudo certo" : "\nbase visual: \(falhas) falha(s)")
exit(falhas == 0 ? 0 : 1)
