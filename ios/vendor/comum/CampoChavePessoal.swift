import SwiftUI

struct CampoChavePessoal: View {
    let perfil: PerfilLeitor
    @State private var entrada = ""
    @State private var configurada = false
    @State private var erro = false

    var body: some View {
        if perfil.autenticado {
            SecureField(configurada ? "Nova chave da Anthropic" : "Chave da Anthropic", text: $entrada)
                .textFieldStyle(.roundedBorder)
            HStack {
                Button("Salvar chave") { salvar(entrada) }
                    .disabled(entrada.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                if configurada { Button("Remover chave", role: .destructive) { salvar("") } }
            }
            if erro { Text("Não foi possível alterar a chave no Chaveiro. Tente novamente.") }
            else if configurada { Text("Chave desta conta salva no Chaveiro.").font(.caption) }
            else { Text("Se já usava uma chave neste aparelho, informe-a de novo para vinculá-la à sua conta.").font(.caption) }
        } else {
            Text("Entre na sua conta Cátedra para configurar a chave pessoal.")
        }
    }

    private func salvar(_ valor: String) {
        erro = !perfil.guardarChave(valor)
        if !erro { entrada = ""; configurada = perfil.chaveAtual() != nil }
    }

    init(perfil: PerfilLeitor) {
        self.perfil = perfil
        _configurada = State(initialValue: perfil.chaveAtual() != nil)
    }
}

struct AcervoAnteriorDoLeitor: View {
    let perfil: PerfilLeitor
    @State private var confirmar = false
    @State private var erro = false

    var body: some View {
        if perfil.autenticado && (perfil.temAcervoRecuperado || perfil.podeRecuperar) {
            Section("Acervo anterior deste aparelho") {
                if perfil.temAcervoRecuperado {
                    Button(perfil.usaLegado ? "Voltar ao acervo atual" : "Abrir acervo anterior") { perfil.alternarAcervo() }
                } else {
                    Button("Vincular acervo anterior à minha conta") { confirmar = true }
                }
                if erro { Text("A recuperação não terminou. O acervo foi preservado para tentar novamente.") }
            }
            .confirmationDialog("Vincular os estudos anteriores a esta conta?", isPresented: $confirmar, titleVisibility: .visible) {
                Button("Confirmo que estes estudos são meus") {
                    do { try perfil.recuperarAcervoConfirmado() } catch { erro = true }
                }
                Button("Cancelar", role: .cancel) {}
            } message: {
                Text("O LEGIS e o JURIS deste aparelho têm estudos antigos sem titular identificado. Ao confirmar, somente sua conta poderá abrir a cópia recuperada. Seus estudos atuais continuam em um acervo separado.")
            }
        }
    }
}
