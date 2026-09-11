// icone.swift — gera o ícone do app de iPad (1024×1024, PNG opaco).
//
// Por que não reaproveitar o ícone do Mac: lá o desenho é um quadrado ARREDONDADO
// flutuando, com margem transparente — é a convenção do macOS. O iOS é o oposto: o
// ícone precisa PREENCHER o quadrado inteiro (o próprio sistema aplica a máscara
// arredondada) e a App Store REJEITA qualquer canal alfa. Reaproveitar produziria um
// quadradinho verde no meio de um fundo preto, arredondado duas vezes.
//
// Mesmas cores e mesma letra do ícone do Mac (mac/Sources/icon.swift), para a marca
// não divergir entre as plataformas.
//
// Feito em CoreGraphics + CoreText, NÃO em AppKit: desenho offscreen com AppKit num
// script de linha de comando (sem NSApplication) sai PRETO — perdi uma rodada assim.
//
//   swift ios/Sources/icone.swift <saida.png>

import CoreGraphics
import CoreText
import Foundation
import ImageIO
import UniformTypeIdentifiers

let lado = 1024
let saida = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "icone-ipad.png"

let espaco = CGColorSpaceCreateDeviceRGB()
// noneSkipLast = sem canal alfa. É o que a App Store exige no ícone.
guard let ctx = CGContext(data: nil, width: lado, height: lado,
                          bitsPerComponent: 8, bytesPerRow: 0, space: espaco,
                          bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else {
    fatalError("não consegui criar o contexto")
}

func cor(_ r: Int, _ g: Int, _ b: Int, _ a: CGFloat = 1) -> CGColor {
    CGColor(colorSpace: espaco, components: [CGFloat(r)/255, CGFloat(g)/255, CGFloat(b)/255, a])!
}

let L = CGFloat(lado)
let quadro = CGRect(x: 0, y: 0, width: L, height: L)

// Fundo verde vivo em 3 tons, canto a canto — versão "Acento" aprovada pela dona
// (2026-09-11), mesma arte do ícone do Mac (mac/Sources/icon.swift), sem a margem
// flutuante (aqui a máscara arredondada é aplicada pelo próprio iOS).
let grad = CGGradient(colorsSpace: espaco,
                      colors: [cor(0x14, 0xb8, 0x7a), cor(0x0b, 0x7a, 0x52), cor(0x05, 0x3d, 0x2c)] as CFArray,
                      locations: [0, 0.55, 1])!
ctx.drawLinearGradient(grad, start: CGPoint(x: 0, y: L), end: CGPoint(x: L, y: 0), options: [])

// dois círculos decorativos translúcidos
ctx.setFillColor(cor(255, 255, 255, 0.07))
ctx.fillEllipse(in: CGRect(x: L - L * 0.62, y: L - L * 0.56, width: L * 0.64, height: L * 0.64))
ctx.setFillColor(cor(0x5e, 0xea, 0xd4, 0.10))
ctx.fillEllipse(in: CGRect(x: -L * 0.14, y: -L * 0.16, width: L * 0.5, height: L * 0.5))

// A letra, deslocada para baixo-esquerda para abrir espaço ao acento dourado.
// 0.56 (e não 0.60 do Mac) porque aqui não há a margem do quadrado flutuante: o "C"
// precisa respirar dentro da máscara que o iOS aplica por cima.
let corpo = L * 0.56
let fonte = CTFontCreateWithName("Georgia-Bold" as CFString, corpo, nil)
// Chaves do CoreText (kCTFont…), não as do AppKit (.font/.foregroundColor): sem AppKit
// importado elas não existem.
let atributos: [NSAttributedString.Key: Any] = [
    NSAttributedString.Key(kCTFontAttributeName as String): fonte,
    NSAttributedString.Key(kCTForegroundColorAttributeName as String): cor(255, 255, 255),
]
let texto = NSAttributedString(string: "C", attributes: atributos)
let linha = CTLineCreateWithAttributedString(texto)
// Centraliza pela caixa REAL do glifo (bounds tipográficos), não pela métrica da linha —
// pela métrica o "C" fica visivelmente deslocado para baixo.
let caixa = CTLineGetBoundsWithOptions(linha, .useGlyphPathBounds)
ctx.textPosition = CGPoint(x: (L - caixa.width) / 2 - caixa.minX - L * 0.035,
                           y: (L - caixa.height) / 2 - caixa.minY - L * 0.065)
CTLineDraw(linha, ctx)

// acento dourado: paralelogramo no canto superior direito
if let ouro = CGGradient(colorsSpace: espaco,
                         colors: [cor(0xf5, 0x9e, 0x0b), cor(0xfd, 0xe6, 0x8a)] as CFArray,
                         locations: [0, 1]) {
    ctx.saveGState()
    let acento = CGMutablePath()
    acento.move(to: CGPoint(x: L * 0.586, y: L * 0.688))
    acento.addLine(to: CGPoint(x: L * 0.684, y: L * 0.688))
    acento.addLine(to: CGPoint(x: L * 0.822, y: L * 0.906))
    acento.addLine(to: CGPoint(x: L * 0.723, y: L * 0.906))
    acento.closeSubpath()
    ctx.addPath(acento)
    ctx.clip()
    ctx.drawLinearGradient(ouro, start: CGPoint(x: L * 0.586, y: L * 0.688),
                           end: CGPoint(x: L * 0.822, y: L * 0.906), options: [])
    ctx.restoreGState()
}

guard let img = ctx.makeImage() else { fatalError("não consegui gerar a imagem") }
let url = URL(fileURLWithPath: saida) as CFURL
guard let dest = CGImageDestinationCreateWithURL(url, UTType.png.identifier as CFString, 1, nil) else {
    fatalError("não consegui criar o arquivo")
}
CGImageDestinationAddImage(dest, img, nil)
guard CGImageDestinationFinalize(dest) else { fatalError("falha ao escrever o PNG") }
print("ícone gerado: \(saida) (\(lado)×\(lado), sem alfa)")
