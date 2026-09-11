// icon.swift — gera os PNGs do .iconset do Cátedra reproduzindo o icon.svg
// (quadrado com gradiente verde + "C" branca serifada), nítido em cada tamanho.
// Uso: makeicon <caminho-do-Catedra.iconset>  (a pasta deve existir)

import AppKit

func hex(_ r: Int, _ g: Int, _ b: Int) -> NSColor {
    NSColor(srgbRed: CGFloat(r) / 255, green: CGFloat(g) / 255, blue: CGFloat(b) / 255, alpha: 1)
}

func makeIcon(size px: Int, to path: String) {
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil, pixelsWide: px, pixelsHigh: px,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
    ) else { return }
    rep.size = NSSize(width: px, height: px)

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

    let s = CGFloat(px)
    // margem no estilo dos ícones macOS (Big Sur+): a arte ocupa ~82% do quadro.
    let inset = s * 0.09
    let rect = NSRect(x: inset, y: inset, width: s - 2 * inset, height: s - 2 * inset)
    let radius = rect.width * 0.2237  // razão de canto do "squircle" macOS

    let shape = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
    shape.addClip()  // tudo a seguir fica dentro do quadrado arredondado

    // fundo: gradiente verde vivo em 3 tons (topo-esquerda clara → base-direita escura),
    // versão "Acento" aprovada pela dona (2026-09-11) — mais vibrante que o anterior.
    let grad = NSGradient(colors: [hex(0x14, 0xb8, 0x7a), hex(0x0b, 0x7a, 0x52), hex(0x05, 0x3d, 0x2c)],
                          atLocations: [0, 0.55, 1], colorSpace: .deviceRGB)!
    grad.draw(in: rect, angle: -45)

    // dois círculos decorativos translúcidos (canto superior direito e inferior esquerdo)
    let circAlto = NSBezierPath(ovalIn: NSRect(x: rect.maxX - rect.width * 0.62, y: rect.maxY - rect.height * 0.56,
                                                width: rect.width * 0.64, height: rect.width * 0.64))
    NSColor(white: 1, alpha: 0.07).setFill(); circAlto.fill()
    let circBaixo = NSBezierPath(ovalIn: NSRect(x: rect.minX - rect.width * 0.14, y: rect.minY - rect.height * 0.16,
                                                 width: rect.width * 0.5, height: rect.width * 0.5))
    hex(0x5e, 0xea, 0xd4).withAlphaComponent(0.10).setFill(); circBaixo.fill()

    // a letra "C" branca, serifada e bold — deslocada um pouco para baixo-esquerda para
    // abrir espaço ao acento dourado no canto superior direito
    let letter = "C" as NSString
    let fontSize = rect.width * 0.56
    let font = NSFont(name: "Georgia-Bold", size: fontSize)
        ?? NSFont(name: "Georgia", size: fontSize)
        ?? NSFont.boldSystemFont(ofSize: fontSize)
    let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: NSColor.white]
    let ts = letter.size(withAttributes: attrs)
    let origin = NSPoint(x: rect.midX - ts.width / 2 - rect.width * 0.11,
                          y: rect.midY - ts.height / 2 - rect.height * 0.05)
    letter.draw(at: origin, withAttributes: attrs)

    // acento dourado: paralelogramo isolado no canto superior direito, longe da letra
    let ouro = NSGradient(starting: hex(0xf5, 0x9e, 0x0b), ending: hex(0xfd, 0xe6, 0x8a))!
    let ax = rect.minX, aw = rect.width
    let acento = NSBezierPath()
    acento.move(to: NSPoint(x: ax + aw * 0.640, y: rect.minY + rect.height * 0.735))
    acento.line(to: NSPoint(x: ax + aw * 0.730, y: rect.minY + rect.height * 0.735))
    acento.line(to: NSPoint(x: ax + aw * 0.855, y: rect.minY + rect.height * 0.918))
    acento.line(to: NSPoint(x: ax + aw * 0.765, y: rect.minY + rect.height * 0.918))
    acento.close()
    NSGraphicsContext.saveGraphicsState()
    acento.addClip()
    ouro.draw(in: rect, angle: 45)
    NSGraphicsContext.restoreGraphicsState()

    NSGraphicsContext.restoreGraphicsState()

    if let data = rep.representation(using: .png, properties: [:]) {
        try? data.write(to: URL(fileURLWithPath: path))
    }
}

guard CommandLine.arguments.count >= 2 else {
    FileHandle.standardError.write("uso: makeicon <Catedra.iconset>\n".data(using: .utf8)!)
    exit(1)
}
let dir = CommandLine.arguments[1]

// nomes exigidos pelo iconutil
let specs: [(Int, String)] = [
    (16, "icon_16x16.png"),   (32, "icon_16x16@2x.png"),
    (32, "icon_32x32.png"),   (64, "icon_32x32@2x.png"),
    (128, "icon_128x128.png"), (256, "icon_128x128@2x.png"),
    (256, "icon_256x256.png"), (512, "icon_256x256@2x.png"),
    (512, "icon_512x512.png"), (1024, "icon_512x512@2x.png"),
]
for (sz, name) in specs { makeIcon(size: sz, to: dir + "/" + name) }
