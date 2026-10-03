import Foundation

/// Qual resumo o widget mostra: o de carimbo maior entre a cópia do app e a da nuvem (empate → o gerado por último,
/// que é a cópia do app com o que ainda não subiu), e SÓ da conta do aparelho. Resumo de outra conta (troca 2001 ×
/// pessoal antes de o passe novo chegar) nunca aparece. A cópia de sessão "local" (sem conta) só vale sem passe.
enum WidgetSelecao {
    static func escolher(local: WidgetResumo?, nuvem: WidgetResumo?, contaDoPasse: String?) -> WidgetResumo? {
        let conta = contaDoPasse ?? local?.conta ?? ""
        let candidatos = [local, nuvem].compactMap { $0 }.filter { r in
            if r.sessao == "local" { return contaDoPasse == nil }
            return !conta.isEmpty && r.conta == conta
        }
        return candidatos.max { a, b in a.carimbo != b.carimbo ? a.carimbo < b.carimbo : a.geradoEm < b.geradoEm }
    }
}
