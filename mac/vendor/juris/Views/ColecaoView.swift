import SwiftUI
import UniformTypeIdentifiers

/// Uma coleção "Meu edital": lista com progresso, revisão e exportação.
struct ColecaoView: View {
    let colecaoID: String
    @Environment(LibraryStore.self) private var store
    @State private var renomear = false
    @State private var novoNome = ""
    @State private var revisar = false
    @State private var exportarAnkiSheet = false

    private var colecao: Colecao? { store.colecoes.first { $0.id == colecaoID } }

    private var selection: Binding<String?> {
        Binding(get: { store.selectedID }, set: { store.selectedID = $0 })
    }

    var body: some View {
        Group {
            if let c = colecao {
                let verbetes = store.verbetes(colecao: c)
                VStack(spacing: 0) {
                    cabecalho(c, total: verbetes.count)
                    Divider().overlay(Palette.hairline)
                    if verbetes.isEmpty {
                        ContentUnavailableView {
                            Label("Coleção vazia", systemImage: "folder")
                        } description: {
                            Text("Abra um verbete e use o botão de pasta para adicioná-lo aqui.")
                        }
                    } else {
                        List(verbetes, selection: selection) { entry in
                            EntryRow(entry: entry, query: "",
                                     isFavorite: store.isFavorite(entry.id),
                                     isImportante: store.isImportante(entry),
                                     hasNote: store.hasAnnotation(entry.id))
                                .listRowSeparatorTint(Palette.hairline)
                                .tag(entry.id)
                        }
                        .listStyle(.inset)
                        .scrollContentBackground(.hidden)
                        .background(Palette.appBackground)
                    }
                }
            } else {
                ContentUnavailableView("Coleção não encontrada", systemImage: "folder.badge.questionmark")
            }
        }
        .background(Palette.appBackground)
        .sheet(isPresented: $revisar) {
            if let c = colecao { RevisaoView(deck: store.verbetes(colecao: c)) }
        }
        .sheet(isPresented: $exportarAnkiSheet) {
            if let c = colecao {
                ExportAnkiSheet(entries: store.verbetes(colecao: c), titulo: c.nome)
            }
        }
        .alert("Renomear coleção", isPresented: $renomear) {
            TextField("Nome", text: $novoNome)
            Button("Salvar") { store.renomearColecao(colecaoID, para: novoNome) }
            Button("Cancelar", role: .cancel) {}
        }
    }

    private func cabecalho(_ c: Colecao, total: Int) -> some View {
        let lidos = store.lidosNa(c)
        let frac = total == 0 ? 0 : Double(lidos) / Double(total)
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "folder.fill").foregroundStyle(Palette.accent)
                Text(c.nome).font(Typo.serifTitle(17, .bold)).foregroundStyle(Palette.titleInk)
                Spacer()
                Button { revisar = true } label: {
                    Label("Revisar", systemImage: "rectangle.on.rectangle.angled")
                        .font(.system(size: 12, weight: .semibold))
                }
                .buttonStyle(.borderedProminent).tint(Palette.accent)
                .disabled(total == 0)
                Menu {
                    Button { exportarAnkiSheet = true } label: { Label("Exportar para Anki…", systemImage: "rectangle.on.rectangle") }
                    Button { novoNome = c.nome; renomear = true } label: { Label("Renomear", systemImage: "pencil") }
                    Divider()
                    Button(role: .destructive) {
                        store.excluirColecao(colecaoID); store.selecao = .todos
                    } label: { Label("Excluir coleção", systemImage: "trash") }
                } label: { Image(systemName: "ellipsis.circle") }
                .menuIndicator(.hidden).frame(width: 28)
            }
            HStack(spacing: 8) {
                ProgressView(value: frac).tint(Palette.accent).frame(maxWidth: 220)
                Text("\(lidos)/\(total) lidos").font(.system(size: 11)).foregroundStyle(Palette.secondaryInk)
            }
        }
        .padding(.horizontal, 14).padding(.vertical, 10)
        .background(Palette.sidebarBackground)
    }

}

/// Sessão de flashcards: esconde o enunciado; "Sei" remove, "Revisar" recoloca ao fim.
struct RevisaoView: View {
    let deck: [JurisEntry]
    @Environment(LibraryStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var fila: [JurisEntry] = []
    @State private var revelado = false
    @State private var acertos = 0
    @State private var total = 0

    var body: some View {
        VStack(spacing: 0) {
            barra
            Divider().overlay(Palette.hairline)
            if let atual = fila.first {
                cartao(atual)
            } else {
                fim
            }
        }
        .frame(width: 620, height: 520)
        .background(Palette.detailBackground)
        .onAppear { fila = deck; total = deck.count; acertos = 0; revelado = false }
    }

    private var barra: some View {
        HStack {
            Button { dismiss() } label: { Image(systemName: "xmark") }.buttonStyle(.plain)
            Spacer()
            Text("Revisão · \(total - fila.count + (fila.isEmpty ? 0 : 1))/\(max(total,1))")
                .font(.system(size: 12, weight: .semibold)).foregroundStyle(Palette.secondaryInk)
            Spacer()
            Text("\(acertos) ✓").font(.system(size: 12, weight: .semibold)).foregroundStyle(Palette.fonteSTJ)
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
    }

    private func cartao(_ e: JurisEntry) -> some View {
        VStack(spacing: 18) {
            Spacer(minLength: 8)
            VStack(spacing: 12) {
                FonteBadge(fonte: e.fonteKind)
                Text(e.titulo).font(Typo.serifTitle(24)).foregroundStyle(Palette.titleInk)
                    .multilineTextAlignment(.center)
                if let t = e.tema, t != e.titulo {
                    Text(t).font(Typo.serifBody(14, .medium)).italic()
                        .foregroundStyle(Palette.secondaryInk).multilineTextAlignment(.center)
                }
            }
            .padding(.horizontal, 24)

            if revelado {
                ScrollView {
                    Text(e.enunciado)
                        .font(Typo.serifBody(15)).foregroundStyle(Palette.readingInk)
                        .lineSpacing(6).multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(16)
                }
                .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Palette.hairline, lineWidth: 1))
                .padding(.horizontal, 20)
            } else {
                Spacer()
                Text("Tente lembrar o enunciado…")
                    .font(.system(size: 12)).foregroundStyle(Palette.secondaryInk)
            }
            Spacer(minLength: 8)
            if revelado {
                HStack(spacing: 12) {
                    Button { responder(.revisar, e) } label: {
                        Label("Revisar depois", systemImage: "arrow.uturn.left")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered).tint(.orange).controlSize(.large)
                    Button { responder(.sei, e) } label: {
                        Label("Já sei", systemImage: "checkmark").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent).tint(Palette.fonteSTJ).controlSize(.large)
                }
                .padding(.horizontal, 20).padding(.bottom, 18)
            } else {
                Button { withAnimation(.easeOut(duration: 0.15)) { revelado = true } } label: {
                    Label("Mostrar enunciado", systemImage: "eye").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent).tint(Palette.accent).controlSize(.large)
                .keyboardShortcut(.space, modifiers: [])
                .padding(.horizontal, 20).padding(.bottom, 18)
            }
        }
    }

    private func responder(_ r: RevisaoResposta, _ e: JurisEntry) {
        store.responderRevisao(e.id, r)
        var f = fila
        f.removeFirst()
        if r == .sei { acertos += 1 } else { f.append(e) }
        withAnimation(.easeInOut(duration: 0.12)) { fila = f; revelado = false }
    }

    private var fim: some View {
        VStack(spacing: 14) {
            Image(systemName: "checkmark.seal.fill").font(.system(size: 44))
                .foregroundStyle(Palette.fonteSTJ)
            Text("Revisão concluída!").font(Typo.serifTitle(20, .semibold)).foregroundStyle(Palette.titleInk)
            Text("\(acertos) de \(total) marcados como \"já sei\".")
                .font(.system(size: 13)).foregroundStyle(Palette.secondaryInk)
            Button("Fechar") { dismiss() }.buttonStyle(.borderedProminent).tint(Palette.accent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
