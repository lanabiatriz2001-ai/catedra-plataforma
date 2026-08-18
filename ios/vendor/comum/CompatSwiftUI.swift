import SwiftUI

// navigationSubtitle só existe do iOS 26 para cima, e o app tem alvo 17. Apagar as
// chamadas perderia o subtítulo em quem TEM iOS 26; então o modificador vira condicional:
// aplica quando existe, não faz nada quando não existe. Nome próprio para não colidir com
// o da Apple no iOS 26.
extension View {
    @ViewBuilder
    func subtituloNav(_ texto: String) -> some View {
        if #available(iOS 26.0, *) { self.navigationSubtitle(texto) } else { self }
    }
}
