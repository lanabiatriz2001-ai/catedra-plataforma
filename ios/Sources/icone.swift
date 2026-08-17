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

// Fundo verde de canto a canto — preenche tudo, sem borda e sem raio.
let grad = CGGradient(colorsSpace: espaco,
                      colors: [cor(0x0c, 0x8a, 0x5b), cor(0x08, 0x60, 0x38)] as CFArray,
                      locations: [0, 1])!
ctx.drawLinearGradient(grad, start: CGPoint(x: 0, y: L), end: CGPoint(x: L, y: 0), options: [])

// Brilho sutil no alto à esquerda, como no ícone do Mac.
if let brilho = CGGradient(colorsSpace: espaco,
                           colors: [cor(255, 255, 255, 0.16), cor(255, 255, 255, 0)] as CFArray,
                           locations: [0, 1]) {
    ctx.drawRadialGradient(brilho,
                           startCenter: CGPoint(x: L * 0.28, y: L * 0.78), startRadius: 0,
                           endCenter: CGPoint(x: L * 0.28, y: L * 0.78), endRadius: L * 0.72,
                           options: [])
}

// A letra. 0.62 (e não 0.66 do Mac) porque aqui não há a margem do quadrado flutuante:
// o "C" precisa respirar dentro da máscara que o iOS aplica por cima.
let corpo = L * 0.62
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
ctx.textPosition = CGPoint(x: (L - caixa.width) / 2 - caixa.minX,
                           y: (L - caixa.height) / 2 - caixa.minY)
CTLineDraw(linha, ctx)

guard let img = ctx.makeImage() else { fatalError("não consegui gerar a imagem") }
let url = URL(fileURLWithPath: saida) as CFURL
guard let dest = CGImageDestinationCreateWithURL(url, UTType.png.identifier as CFString, 1, nil) else {
    fatalError("não consegui criar o arquivo")
}
CGImageDestinationAddImage(dest, img, nil)
guard CGImageDestinationFinalize(dest) else { fatalError("falha ao escrever o PNG") }
print("ícone gerado: \(saida) (\(lado)×\(lado), sem alfa)")
