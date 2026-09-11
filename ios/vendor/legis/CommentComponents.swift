import SwiftUI

/// Estado do editor de comentário (novo trecho ou edição de um existente).
struct EditingComment: Identifiable {
    let id = UUID()
    var annotationID: UUID?   // nil = novo (cria a anotação ao salvar)
    var range: NSRange        // faixa global (para o novo)
    var text: String
}

/// Balão de comentário na margem, alinhado verticalmente ao trecho da lei.
struct CommentBalloon: View {
    let note: String
    let color: Color
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(alignment: .top, spacing: 8) {
                RoundedRectangle(cornerRadius: 2, style: .continuous).fill(color).frame(width: 3)
                VStack(alignment: .leading, spacing: 3) {
                    Label("Comentário", systemImage: "text.bubble")
                        .font(AppTheme.ui(9, .bold)).tracking(0.3)
                        .foregroundStyle(color)
                        .labelStyle(.titleAndIcon)
                    Text(note.isEmpty ? "—" : note)
                        .font(AppTheme.ui(11.5)).foregroundStyle(AppTheme.ink)
                        .lineLimit(5).multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 9).padding(.vertical, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: AppTheme.rInner, style: .continuous).fill(AppTheme.cardBackground))
            .overlay(RoundedRectangle(cornerRadius: AppTheme.rInner, style: .continuous).strokeBorder(AppTheme.hairline, lineWidth: 1))
            .shadow(color: Color.black.opacity(0.06), radius: 4, y: 1)
        }
        .buttonStyle(.plain)
        .help("Toque para editar o comentário")
    }
}

/// Folha para escrever/editar o comentário do trecho selecionado.
struct CommentEditorSheet: View {
    let initial: String
    let isEditing: Bool
    let onSave: (String) -> Void
    let onDelete: (() -> Void)?
    let onCancel: () -> Void
    @State private var text: String = ""
    @FocusState private var foco: Bool
    @State private var confirmarDescarte = false

    /// Texto novo (diferente do que veio) que se perderia ao fechar.
    private var temRascunho: Bool {
        text != initial && !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Label(isEditing ? "Editar comentário" : "Comentar trecho", systemImage: "text.bubble")
                    .font(.headline)
                Spacer()
                if isEditing, let onDelete {
                    Button(role: .destructive) { onDelete() } label: {
                        Label("Excluir", systemImage: "trash").alvoToque()
                    }
                    .buttonStyle(.borderless)
                }
            }
            .padding(14)
            Divider()
            TextEditor(text: $text)
                .font(AppTheme.ui(13.5)).scrollContentBackground(.hidden)
                .padding(10).frame(maxWidth: .infinity, minHeight: 150)
                .background(AppTheme.softStroke)
                .focused($foco)
            Divider()
            HStack {
                Button("Cancelar") { if temRascunho { confirmarDescarte = true } else { onCancel() } }
                    .keyboardShortcut(.cancelAction)
                    .alvoToque()
                Spacer()
                Button(isEditing ? "Salvar" : "Comentar") { onSave(text) }
                    .buttonStyle(.borderedProminent)
                    .keyboardShortcut(.defaultAction)
                    .disabled(text.trimmingCharacters(in: .whitespaces).isEmpty)
                    .alvoToque()
            }
            .padding(14)
        }
        // iPad: folha .form do sistema; iPhone: meia altura (150 pt de editor não pedem a
        // tela inteira), travada contra o arrastão enquanto há texto novo.
        .folhaAdaptavel(temRascunho: temRascunho)
        .legisDetentesSeCompacto([.medium, .large])
        .tecladoConcluir(foco: $foco)
        .legisDescartarRascunho(isPresented: $confirmarDescarte) { onCancel() }
        .onAppear { text = initial; foco = true }
    }
}
