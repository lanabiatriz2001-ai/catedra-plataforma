import SwiftUI
import AppKit

/// Painel lateral com as marcações comentadas do verbete — espelha o `AnnotationsPanel` do LEGIS.
struct JurisAnnotationsPanel: View {
    @Environment(LibraryStore.self) private var store
    let entryID: String
    @Binding var focusedMarkID: String?
    let markController: MarkController

    private var items: [TextMark] { store.commentedMarks(for: entryID) }

    var body: some View {
        ScrollViewReader { proxy in
            List {
                Section("Comentários (\(items.count))") {
                    if items.isEmpty {
                        Text("Selecione um trecho e toque em “Comentar” para anotar a margem.")
                            .font(.system(size: 12)).foregroundStyle(Palette.secondaryInk)
                            .padding(.vertical, 6)
                    }
                    ForEach(items) { mark in
                        JurisAnnotationCard(mark: mark, entryID: entryID,
                                            onJump: {
                                                focusedMarkID = mark.id
                                                jump(to: mark.range)
                                            })
                            .id(mark.id)
                    }
                }
            }
            .listStyle(.sidebar)
            .onChange(of: focusedMarkID) { _, id in
                guard let id else { return }
                withAnimation { proxy.scrollTo(id, anchor: .center) }
            }
        }
        .navigationTitle("Anotações")
    }

    private func jump(to range: NSRange) {
        guard let tv = markController.textView else { return }
        tv.scrollRangeToVisible(range)
        tv.showFindIndicator(for: range)
    }
}

private struct JurisAnnotationCard: View {
    @Environment(LibraryStore.self) private var store
    let mark: TextMark
    let entryID: String
    let onJump: () -> Void
    @State private var note: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button(action: onJump) {
                HStack(alignment: .top, spacing: 8) {
                    RoundedRectangle(cornerRadius: 2).fill(Color(hex: mark.colorHex ?? "#8FBEF0")).frame(width: 3)
                    Label(mark.kind.nome, systemImage: mark.kind.simbolo)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Palette.secondaryInk)
                    Spacer(minLength: 0)
                }
            }
            .buttonStyle(.plain)

            TextField("Escrever anotação…", text: $note, axis: .vertical)
                .font(.system(size: 12.5))
                .textFieldStyle(.plain)
                .lineLimit(1...6)
                .onChange(of: note) { _, newValue in
                    store.setComment(newValue, markID: mark.id, range: mark.range, for: entryID)
                }

            HStack {
                Spacer()
                Button(role: .destructive) { store.removeComment(markID: mark.id, for: entryID) } label: {
                    Image(systemName: "trash")
                }
                .buttonStyle(.borderless)
            }
        }
        .padding(.vertical, 6)
        .onAppear { note = mark.note ?? "" }
    }
}
