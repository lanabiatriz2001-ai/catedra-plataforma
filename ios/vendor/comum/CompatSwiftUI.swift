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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers do app UNIVERSAL (F0 do plano do iPhone). Ninguém os usa ainda: F1–F5 é que
// vão chamá-los. Tudo aqui compila para iOS 17 (MIN_IOS do build-ipad.sh); o que só existe
// em versão mais nova entra atrás de #available e vira "não faz nada" no iOS 17.
// LEGIS e JURIS compilam num módulo só, por isso os nomes têm prefixo em português e não
// colidem com nada da Apple.
// ─────────────────────────────────────────────────────────────────────────────

extension EnvironmentValues {
    /// Verdadeiro quando a largura disponível é COMPACTA (iPhone em retrato, iPhone menor
    /// em paisagem, Slide Over de 320 pt no iPad). É por AQUI que toda adaptação liga —
    /// nunca por `UIDevice.current.userInterfaceIdiom`, que erra no Slide Over e no iPhone
    /// Pro Max deitado (regular). Leia com `@Environment(\.ehCompacto) private var ehCompacto`.
    var ehCompacto: Bool { horizontalSizeClass == .compact }
}

extension View {
    /// Alvo de toque mínimo (44 × 44 pt, regra da HIG e da casa) sem mudar o desenho do
    /// controle: o frame cresce só se for menor, e o contentShape faz a área inteira
    /// responder ao toque — não só o ícone de 16 pt no meio.
    func alvoToque() -> some View {
        self.frame(minWidth: 44, minHeight: 44).contentShape(Rectangle())
    }

    /// Folha (.sheet) que se adapta ao aparelho: o conteúdo preenche o tamanho que o
    /// sistema der (no iPhone, a tela inteira; no iPad, a folha). `larga` pede o formato
    /// .page do iOS 18 (Mapa mental, Análise, Comparação de redações, Histórico — folhas
    /// que precisam de largura); as demais ficam no .form. No iOS 17 o sizing não existe:
    /// a folha fica com o tamanho padrão do sistema. `temRascunho` impede o fechar por
    /// gesto enquanto há texto não salvo, para o arrastão não apagar o que a pessoa escreveu.
    @ViewBuilder
    func folhaAdaptavel(larga: Bool = false, temRascunho: Bool = false) -> some View {
        let base = self.frame(maxWidth: .infinity, maxHeight: .infinity)
            .interactiveDismissDisabled(temRascunho)
        // .page e .form são TIPOS diferentes (PagePresentationSizing / FormPresentationSizing),
        // então não cabem num mesmo operador ternário: um ramo por formato.
        if #available(iOS 18.0, *) {
            if larga { base.presentationSizing(.page) } else { base.presentationSizing(.form) }
        } else {
            base
        }
    }

    /// Teclado com saída: no iPhone não há Esc nem ⌘. Põe um "Concluir" na barra do
    /// teclado, que zera o foco, e deixa o teclado ir embora acompanhando o dedo na rolagem.
    /// O `foco` é o `$foco` de um `@FocusState private var foco: Bool` da folha.
    func tecladoConcluir(foco: FocusState<Bool>.Binding) -> some View {
        self.toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Concluir") { foco.wrappedValue = false }
            }
        }
        .scrollDismissesKeyboard(.interactively)
    }
}
