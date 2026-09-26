import CoreGraphics

/// Escala de espaço da casa (DESIGN.md): grupo apertado, separação generosa.
enum DSEspaco {
    static let e1: CGFloat = 4, e2: CGFloat = 8, e3: CGFloat = 12, e4: CGFloat = 16
    static let e5: CGFloat = 24, e6: CGFloat = 32, e7: CGFloat = 48
}

/// Três raios, todos derivados do --radius da direção ativa — os MESMOS no LEGIS e no
/// JURIS (antes o JURIS usava −4/+4 e o LEGIS −3/+6).
enum DSRaio {
    static var card: CGFloat    { ThemeState.t.radius }
    static var interno: CGFloat { max(6, ThemeState.t.radius - 3) }
    static var hero: CGFloat    { ThemeState.t.radius + 6 }
}
