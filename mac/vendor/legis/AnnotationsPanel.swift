import SwiftUI
import AppKit

/// Painel lateral (inspector) com a nota geral da norma e as anotações do texto.
struct AnnotationsPanel: View {
    @EnvironmentObject var store: AppStore
    let lawID: UUID
    @Binding var focusedAnnotationID: UUID?
    let controller: ReaderController

    @State private var generalNote: String = ""

    private var law: LawEntry? { store.laws.first { $0.id == lawID } }
    private var items: [TextAnnotation] { store.annotations(for: lawID) }

    var body: some View {
        ScrollViewReader { proxy in
            List {
                Section {
                    TextEditor(text: $generalNote)
                        .font(.body)
                        .frame(minHeight: 64)
                        .scrollContentBackground(.hidden)
                        .padding(6)
                        .background(RoundedRectangle(cornerRadius: 8).fill(.quaternary.opacity(0.4)))
                        .onChange(of: generalNote) { _, newValue in
                            // setGeneralNote tem guarda de igualdade + save adiado.
                            store.setGeneralNote(lawID, newValue)
                        }
                } header: {
                    Label("Nota geral", systemImage: "note.text")
                }

                Section {
                    if items.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Nenhuma marcação ainda.")
                                .foregroundStyle(.secondary)
                            Text("Selecione um trecho do texto e use o botão direito (ou a barra de ferramentas) para grifar, sublinhar, tachar ou anotar.")
                                .font(.caption)
                                .foregroundStyle(.tertiary)
                        }
                        .padding(.vertical, 4)
                    }
                    ForEach(items) { annotation in
                        AnnotationCard(annotation: annotation,
                                       isFocused: focusedAnnotationID == annotation.id,
                                       onJump: {
                                           focusedAnnotationID = annotation.id
                                           if !annotation.isOrphaned {
                                               controller.scroll(to: annotation.range)
                                           }
                                       })
                            .id(annotation.id)
                    }
                } header: {
                    Label("Marcações e anotações (\(items.count))", systemImage: "highlighter")
                }
            }
            .listStyle(.sidebar)
            .onChange(of: focusedAnnotationID) { _, id in
                if let id { withAnimation { proxy.scrollTo(id, anchor: .center) } }
            }
        }
        .onAppear { generalNote = law?.generalNote ?? "" }
        .onChange(of: lawID) { _, _ in generalNote = law?.generalNote ?? "" }
    }
}

// MARK: - Cartão de anotação

private struct AnnotationCard: View {
    @EnvironmentObject var store: AppStore
    let annotation: TextAnnotation
    let isFocused: Bool
    let onJump: () -> Void

    @State private var note: String = ""
    @State private var showFontPicker = false

    private var color: Color { Color(hexRGBA: annotation.colorHex) }
    private var noteFont: Font {
        let size = annotation.noteFontSize ?? 13
        switch annotation.noteFontFamily {
        case nil, "Sistema": return .system(size: size)
        case "Sistema (Serifa)": return .system(size: size, design: .default)
        case let family?: return .custom(family, size: size)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Trecho marcado
            Button(action: onJump) {
                HStack(alignment: .top, spacing: 8) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(color)
                        .frame(width: 4)
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 6) {
                            Image(systemName: annotation.style.symbol)
                                .font(.caption)
                                .foregroundStyle(color)
                            Text(annotation.style.label)
                                .font(.caption2.weight(.semibold))
                                .foregroundStyle(.secondary)
                            if annotation.isOrphaned {
                                Text("trecho não encontrado no texto atual")
                                    .font(.caption2)
                                    .padding(.horizontal, 5).padding(.vertical, 1)
                                    .background(Capsule().fill(.orange.opacity(0.2)))
                                    .foregroundStyle(.orange)
                            }
                            Spacer()
                        }
                        Text("“\(annotation.selectedText)”")
                            .font(.callout.italic())
                            .lineLimit(3)
                            .foregroundStyle(.primary)
                    }
                }
            }
            .buttonStyle(.plain)

            // Nota
            TextField("Escrever anotação…", text: $note, axis: .vertical)
                .textFieldStyle(.plain)
                .font(noteFont)
                .lineLimit(1...8)
                .padding(6)
                .background(RoundedRectangle(cornerRadius: 6).fill(.quaternary.opacity(0.4)))
                .onChange(of: note) { _, newValue in
                    guard newValue != annotation.note else { return }
                    store.updateAnnotation(annotation.id, debounced: true) { $0.note = newValue }
                }

            // Controles
            HStack(spacing: 10) {
                ColorPicker("", selection: Binding(
                    get: { color },
                    set: { newColor in
                        // O painel de cores dispara continuamente durante o arraste.
                        store.updateAnnotation(annotation.id, debounced: true) { $0.colorHex = newColor.hexRGBA }
                    }
                ))
                .labelsHidden()
                .controlSize(.small)
                .help("Cor da marcação")

                Menu {
                    ForEach(AnnotationStyle.allCases) { style in
                        Button {
                            store.updateAnnotation(annotation.id) { $0.style = style }
                        } label: {
                            Label(style.label, systemImage: style.symbol)
                        }
                    }
                } label: {
                    Image(systemName: annotation.style.symbol)
                }
                .menuStyle(.borderlessButton)
                .frame(width: 34)
                .help("Estilo da marcação")

                Button {
                    showFontPicker = true
                } label: {
                    HStack(spacing: 3) {
                        Image(systemName: "textformat")
                        Text(annotation.noteFontFamily ?? "Fonte")
                            .font(.caption)
                            .lineLimit(1)
                    }
                }
                .buttonStyle(.borderless)
                .help("Fonte da anotação (fontes instaladas no Mac)")
                .popover(isPresented: $showFontPicker) {
                    FontPickerView(selectedFamily: annotation.noteFontFamily ?? "Sistema",
                                   selectedSize: annotation.noteFontSize ?? 13) { family, size in
                        store.updateAnnotation(annotation.id) {
                            $0.noteFontFamily = family == "Sistema" ? nil : family
                            $0.noteFontSize = size
                        }
                    }
                }

                Spacer()

                Text(annotation.createdAt.formatted(date: .numeric, time: .omitted))
                    .font(.caption2)
                    .foregroundStyle(.tertiary)

                Button(role: .destructive) {
                    store.removeAnnotation(annotation.id)
                } label: {
                    Image(systemName: "trash")
                }
                .buttonStyle(.borderless)
                .help("Excluir anotação")
            }
        }
        .padding(10)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(isFocused ? color.opacity(0.10) : Color.clear)
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(isFocused ? color.opacity(0.6) : Color.gray.opacity(0.2), lineWidth: 1)
                )
        )
        .onAppear { note = annotation.note }
    }
}

// MARK: - Seletor de fontes do macOS

/// Lista pesquisável de todas as famílias de fontes instaladas no Mac,
/// cada uma exibida na própria fonte.
struct FontPickerView: View {
    @State var selectedFamily: String
    @State var selectedSize: Double
    let onSelect: (String, Double) -> Void

    @State private var filter = ""
    @Environment(\.dismiss) private var dismiss

    private static let families: [String] = {
        ["Sistema", "Sistema (Serifa)"] + NSFontManager.shared.availableFontFamilies.sorted()
    }()

    private var filtered: [String] {
        guard !filter.isEmpty else { return Self.families }
        return Self.families.filter { $0.localizedCaseInsensitiveContains(filter) }
    }

    var body: some View {
        VStack(spacing: 8) {
            TextField("Buscar fonte…", text: $filter)
                .textFieldStyle(.roundedBorder)
            HStack {
                Text("Tamanho")
                Slider(value: $selectedSize, in: 9...28, step: 1)
                Text("\(Int(selectedSize)) pt").monospacedDigit()
                    .frame(width: 44, alignment: .trailing)
            }
            .font(.caption)
            List(filtered, id: \.self, selection: Binding(
                get: { selectedFamily },
                set: { newValue in
                    if let newValue {
                        selectedFamily = newValue
                        onSelect(newValue, selectedSize)
                    }
                }
            )) { family in
                Text(family)
                    .font(family.hasPrefix("Sistema") ? .system(size: 13) : .custom(family, size: 13))
                    .tag(family)
            }
            .frame(minHeight: 260)
            HStack {
                Spacer()
                Button("Aplicar") {
                    onSelect(selectedFamily, selectedSize)
                    dismiss()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding(12)
        .frame(width: 300, height: 400)
        // Sem onChange no slider: aplicar tamanho a cada tick reconstruiria o
        // documento inteiro no leitor. O valor é aplicado ao escolher a fonte
        // ou no botão "Aplicar".
    }
}
