import SwiftUI

/// Estado do editor de comentário (novo trecho ou edição de um existente) — espelha o LEGIS.
struct EditingMarkComment: Identifiable {
    let id = UUID()
    var markID: String?   // nil = novo (cria a marcação ao salvar)
    var range: NSRange
    var text: String
}

/// Balão de comentário na margem, alinhado verticalmente ao trecho do enunciado.
struct MarkCommentBalloon: View {
    let note: String
    let color: Color
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(alignment: .top, spacing: 8) {
                RoundedRectangle(cornerRadius: 2, style: .continuous).fill(color).frame(width: 3)
                VStack(alignment: .leading, spacing: 3) {
                    Label("Comentário", systemImage: "text.bubble")
                        .font(Typo.ui(9, .bold)).tracking(0.3)
                        .foregroundStyle(color)
                        .labelStyle(.titleAndIcon)
                    Text(note.isEmpty ? "—" : note)
                        .font(Typo.ui(11.5)).foregroundStyle(Palette.bodyInk)
                        .lineLimit(5).multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 9).padding(.vertical, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous).fill(Palette.cardBackground))
            .overlay(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous).strokeBorder(Palette.hairline, lineWidth: 1))
            .shadow(color: Color.black.opacity(0.06), radius: 4, y: 1)
        }
        .buttonStyle(.plain)
        .help("Toque para editar o comentário")
        .accessibilityHint("Toque para editar o comentário")
    }
}

/// Folha para escrever/editar o comentário do trecho selecionado.
struct MarkCommentEditorSheet: View {
    let initial: String
    let isEditing: Bool
    let onSave: (String) -> Void
    let onDelete: (() -> Void)?
    let onCancel: () -> Void
    @State private var text: String = ""
    @State private var confirmarDescarte = false
    @FocusState private var foco: Bool
    @Environment(\.ehCompacto) private var ehCompacto

    /// Há texto que ainda não foi salvo (diferente do que a folha abriu mostrando).
    private var temRascunho: Bool {
        text.trimmingCharacters(in: .whitespacesAndNewlines) != initial.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        Group {
            // iPhone: o teclado cobre quase metade da folha; o corpo rola (o TextEditor
            // guarda 150 pt de altura mínima e cresce com o texto).
            if ehCompacto { ScrollView { corpo } } else { corpo }
        }
        // Sem 440 pt fixos: a folha do sistema decide o tamanho (meia altura quando o
        // sistema permitir — é uma caixa de comentário, não uma página). Com rascunho, o
        // arrastão NÃO fecha; o Cancelar pergunta antes de descartar.
        .folhaAdaptavel(temRascunho: temRascunho)
        .presentationDetents([.medium, .large])
        .tecladoConcluir(foco: $foco)
        .confirmationDialog("Descartar o que você escreveu?", isPresented: $confirmarDescarte, titleVisibility: .visible) {
            Button("Descartar", role: .destructive) { onCancel() }
            Button("Continuar escrevendo", role: .cancel) {}
        }
        .onAppear { text = initial }
    }

    private var corpo: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Label(isEditing ? "Editar comentário" : "Comentar trecho", systemImage: "text.bubble")
                    .font(.headline)
                Spacer()
                if isEditing, let onDelete {
                    Button(role: .destructive) { onDelete() } label: { Label("Excluir", systemImage: "trash").jurisAlvoToque() }
                        .buttonStyle(.borderless)
                }
            }
            .padding(.horizontal, 14).padding(.vertical, 6)
            Divider()
            TextEditor(text: $text)
                .font(Typo.ui(13.5)).scrollContentBackground(.hidden)
                .focused($foco)
                .padding(10).frame(maxWidth: .infinity, minHeight: 150)
            Divider()
            HStack {
                Button { if temRascunho { confirmarDescarte = true } else { onCancel() } } label: { Text("Cancelar").jurisAlvoToque() }
                    .keyboardShortcut(.cancelAction)
                Spacer()
                Button { onSave(text) } label: { Text(isEditing ? "Salvar" : "Comentar").frame(minHeight: 30) }
                    .buttonStyle(.borderedProminent)
                    .keyboardShortcut(.defaultAction)
                    .disabled(text.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding(.horizontal, 14).padding(.vertical, 6)
        }
    }
}
