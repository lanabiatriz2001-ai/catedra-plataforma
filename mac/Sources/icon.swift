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

    // fundo: gradiente verde (topo-esquerda → base-direita), como o <linearGradient>
    let grad = NSGradient(starting: hex(0x0c, 0x8a, 0x5b), ending: hex(0x08, 0x60, 0x38))!
    grad.draw(in: rect, angle: -45)

    // brilho radial sutil no canto superior esquerdo (como o <radialGradient>)
    let hl = NSGradient(colors: [NSColor(white: 1, alpha: 0.18), NSColor(white: 1, alpha: 0)])!
    let hlCenter = NSPoint(x: rect.minX + rect.width * 0.22, y: rect.maxY - rect.height * 0.12)
    hl.draw(fromCenter: hlCenter, radius: 0, toCenter: hlCenter, radius: rect.width * 0.95, options: [])

    // a letra "C" branca, serifada e bold
    let letter = "C" as NSString
    let fontSize = rect.width * 0.66
    let font = NSFont(name: "Georgia-Bold", size: fontSize)
        ?? NSFont(name: "Georgia", size: fontSize)
        ?? NSFont.boldSystemFont(ofSize: fontSize)
    let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: NSColor.white]
    let ts = letter.size(withAttributes: attrs)
    // pequeno ajuste ótico: sobe levemente para compensar a descida da fonte
    let origin = NSPoint(x: rect.midX - ts.width / 2, y: rect.midY - ts.height / 2 + rect.height * 0.01)
    letter.draw(at: origin, withAttributes: attrs)

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
