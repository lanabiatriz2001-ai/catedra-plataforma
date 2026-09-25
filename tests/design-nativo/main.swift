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

// ── Tabela única de ramos e tribunais ──────────────────────────────────────
confere(Ramo.allCases.count == 13, "13 ramos na tabela (12 famílias da web + Leis Especiais)")
confere(Ramo.constitucional.identidade == 0x2563EB && Ramo.penal.identidade == 0xE11D48
        && Ramo.civil.identidade == 0x0D9488 && Ramo.internacional.identidade == 0x0284C7,
        "valores da tabela iguais aos que o LEGIS e o JURIS usavam")
for r in Ramo.allCases {
    let claro = DSCor.texto(identidade: r.identidade, superficie: 0xFFFDF8, escuro: false)
    let escuro = DSCor.texto(identidade: r.identidade, superficie: 0x201D17, escuro: true)
    confere(DSCor.contraste(claro, 0xFFFDF8) >= 4.5 && DSCor.contraste(escuro, 0x201D17) >= 4.5,
            "\(r.rawValue): cor-texto ≥ 4,5:1 no claro e no escuro")
}
confere(Ramo.deNome("Direito Constitucional") == .constitucional, "deNome: Constitucional")
confere(Ramo.deNome("Direito Processual Penal") == .penal, "deNome: Processual Penal é penal")
confere(Ramo.deNome("Direito Processual Civil") == .civil, "deNome: Processual Civil é civil")
confere(Ramo.deNome("Direito Previdenciário") == .previdenciario, "deNome ignora acento")
confere(Ramo.deNome("Direito Eleitoral") == .administrativo, "deNome: Eleitoral cai em administrativo (como antes)")
confere(Ramo.deNome("Direitos Humanos") == .internacional, "deNome: Direitos Humanos cai em internacional")
confere(Ramo.deNome(nil) == nil && Ramo.deNome("Direito Canônico") == nil, "deNome: nil ou desconhecido devolve nil")
confere(CorTribunal.identidade("STF") == 0x1D4ED8 && CorTribunal.identidade("STJ") == 0x0D9488
        && CorTribunal.identidade("XYZ") == nil, "cores de tribunal e ausência para tribunal desconhecido")

// ── Fontes e escala ─────────────────────────────────────────────────────────
confere(DSFontes.registrar(pasta: URL(fileURLWithPath: "/nao/existe")).isEmpty
        && !DSFontes.disponivel("Spectral"),
        "registrar pasta inexistente não quebra e nada fica disponível")
let reg = DSFontes.registrar(pasta: URL(fileURLWithPath: pastaFontes, isDirectory: true))
for f in DSFontes.familiasDaCasa {
    confere(reg.contains(f) && DSFontes.disponivel(f), "fonte da casa registrada a partir do woff2: \(f)")
}
confere(DSFontes.registrar(pasta: URL(fileURLWithPath: pastaFontes, isDirectory: true)) == reg,
        "registrar de novo (já registradas) não perde nenhuma família")
confere(!DSFontes.disponivel("Comic Sans MS"), "família de fora da casa não conta como disponível")
confere(DS.familiaDisplay(css: "'Spectral', Georgia, serif") == "Spectral", "display da Planilha/Tribunal")
confere(DS.familiaDisplay(css: "'Inter Tight', 'Inter', sans-serif") == "Inter Tight", "display do Neon/Aurora")
confere(DS.familiaDisplay(css: "'Space Grotesk', sans-serif") == "Space Grotesk", "display do Fibra/Solar")
confere(DS.familiaDisplay(css: "'JetBrains Mono', monospace") == "JetBrains Mono", "display do Terminal")
confere(DS.familiaDisplay(css: "") == nil && DS.familiaDisplay(css: "Comic Sans") == nil,
        "display vazio ou desconhecido devolve nil (a ponte mantém o anterior)")
confere(DS.escala(8) == 11 && DS.escala(15) == 15, "escala: piso de 11 e tamanho normal intacto (Mac)")
confere(DSTipo.micro.rawValue == 12 && DSTipo.corpo.rawValue == 15
        && DSTipo.titulo.rawValue == 19 && DSTipo.display.rawValue == 26, "escala de 4 degraus da interface")
ThemeState.t.radius = 12
confere(DSRaio.card == 12 && DSRaio.interno == 9 && DSRaio.hero == 18, "raios derivados de --radius")
ThemeState.t.radius = 6
confere(DSRaio.interno == 6, "raio interno nunca abaixo de 6")

// (Tasks 2 e 3 acrescentam blocos aqui, antes do fechamento.)

print(falhas == 0 ? "\nbase visual: tudo certo" : "\nbase visual: \(falhas) falha(s)")
exit(falhas == 0 ? 0 : 1)
