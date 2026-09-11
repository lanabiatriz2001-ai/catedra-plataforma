import SwiftUI
import UIKit

/// Tipos de jurisprudência que a usuária pode vincular a uma norma.
enum PrecedentKind {
    static let all = ["Súmula", "Súmula Vinculante", "Tese (Repetitivo/RG)",
                      "Acórdão", "Informativo", "Decisão", "Outro"]

    static func color(_ kind: String) -> Color {
        switch kind {
        case "Súmula", "Súmula Vinculante": return AppTheme.srs
        case "Tese (Repetitivo/RG)": return AppTheme.srs
        case "Acórdão": return AppTheme.info
        case "Informativo": return AppTheme.ok
        case "Decisão": return AppTheme.warn
        default: return .gray
        }
    }
}

/// Painel (folha) com a jurisprudência que a usuária vinculou a uma norma:
/// súmulas, teses, acórdãos, informativos e decisões — cadastradas por ela,
/// pesquisáveis e editáveis. Nada é baixado nem monitorado.
struct LawPrecedentsView: View {
    @EnvironmentObject var store: AppStore
    @Environment(\.dismiss) private var dismiss
    let lawID: UUID
    let lawTitle: String
    let accent: Color

    @State private var query = ""
    @State private var editing: LawPrecedent?
    @State private var showNew = false
    @State private var pendingDelete: LawPrecedent?

    private var items: [LawPrecedent] {
        let all = store.precedents(for: lawID)
        let q = query.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return all }
        return all.filter {
            $0.court.localizedCaseInsensitiveContains(q) ||
            $0.identifier.localizedCaseInsensitiveContains(q) ||
            $0.kind.localizedCaseInsensitiveContains(q) ||
            $0.summary.localizedCaseInsensitiveContains(q) ||
            $0.articleRef.localizedCaseInsensitiveContains(q) ||
            $0.notes.localizedCaseInsensitiveContains(q) ||
            $0.tags.contains { $0.localizedCaseInsensitiveContains(q) }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider()
            if store.precedentCount(for: lawID) == 0 {
                emptyState
            } else {
                controls
                Divider()
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(items) { precedent in
                            PrecedentCard(precedent: precedent, accent: accent,
                                          onEdit: { editing = precedent },
                                          onDelete: { pendingDelete = precedent })
                        }
                        if items.isEmpty {
                            Text("Nenhuma jurisprudência corresponde à busca.")
                                .font(.callout).foregroundStyle(.secondary)
                                .padding(.top, 40)
                        }
                    }
                    .padding(16)
                }
            }
        }
        .folhaAdaptavel(larga: true)   // iPad: folha .page (lista larga); iPhone: tela inteira
        .sheet(item: $editing) { PrecedentEditView(lawID: lawID, accent: accent, existing: $0) }
        .sheet(isPresented: $showNew) { PrecedentEditView(lawID: lawID, accent: accent, existing: nil) }
        .confirmationDialog("Excluir esta jurisprudência?",
                            isPresented: Binding(get: { pendingDelete != nil },
                                                 set: { if !$0 { pendingDelete = nil } }),
                            titleVisibility: .visible) {
            Button("Excluir", role: .destructive) {
                if let p = pendingDelete { store.deletePrecedent(p.id) }
                pendingDelete = nil
            }
            Button("Cancelar", role: .cancel) { pendingDelete = nil }
        }
    }

    private var header: some View {
        HStack(alignment: .top, spacing: 12) {
            IconBubble(symbol: "text.book.closed", color: accent, size: 36)
            VStack(alignment: .leading, spacing: 2) {
                Text("Jurisprudência").font(AppTheme.displayFont(18, .bold))
                Text(lawTitle).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
            }
            Spacer()
            Button("Fechar") { dismiss() }.alvoToque()
        }
        .padding(16)
    }

    private var controls: some View {
        HStack(spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
                TextField("Buscar por tribunal, número, tese, artigo…", text: $query)
                    .textFieldStyle(.plain)
            }
            .padding(.horizontal, 10).padding(.vertical, 6)
            .background(RoundedRectangle(cornerRadius: AppTheme.rInner).fill(.quaternary.opacity(0.4)))
            Spacer()
            Button {
                showNew = true
            } label: {
                Label("Adicionar", systemImage: "plus").alvoToque()
            }
            .buttonStyle(.borderedProminent)
            .tint(accent)
        }
        .padding(.horizontal, 16).padding(.vertical, 10)
    }

    private var emptyState: some View {
        ContentUnavailableView {
            Label("Nenhuma jurisprudência ainda", systemImage: "text.book.closed")
        } description: {
            Text("Vincule súmulas, teses, acórdãos, informativos e decisões a esta norma para tê-los à mão ao estudar.")
        } actions: {
            Button {
                showNew = true
            } label: {
                Label("Adicionar jurisprudência", systemImage: "plus")
            }
            .buttonStyle(.borderedProminent)
            .tint(accent)
        }
    }
}

/// Cartão de uma jurisprudência na lista.
private struct PrecedentCard: View {
    let precedent: LawPrecedent
    let accent: Color
    let onEdit: () -> Void
    let onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(precedent.kind)
                    .font(.caption2.weight(.bold))
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(Capsule().fill(PrecedentKind.color(precedent.kind).opacity(0.16)))
                    .foregroundStyle(PrecedentKind.color(precedent.kind))
                Text(precedent.displayTitle)
                    .font(.headline)
                Spacer()
                if !precedent.date.isEmpty {
                    Text(precedent.date).font(.caption).foregroundStyle(.secondary)
                }
            }
            if !precedent.articleRef.isEmpty {
                Label(precedent.articleRef, systemImage: "text.justify.left")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(accent)
            }
            if !precedent.summary.isEmpty {
                Text(precedent.summary)
                    .font(.callout)
                    .textSelection(.enabled)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if !precedent.notes.isEmpty {
                Text(precedent.notes)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .italic()
                    .fixedSize(horizontal: false, vertical: true)
            }
            if !precedent.tags.isEmpty {
                Text(precedent.tags.map { "#\($0)" }.joined(separator: "  "))
                    .font(.caption2).foregroundStyle(AppTheme.info)
            }
            HStack(spacing: 8) {
                if let url = URL(string: precedent.url), !precedent.url.isEmpty {
                    Button {
                        UIApplication.shared.open(url)
                    } label: { Label("Abrir íntegra", systemImage: "safari") }
                        .buttonStyle(.borderless)
                }
                Spacer()
                Button { onEdit() } label: { Label("Editar", systemImage: "pencil") }
                    .buttonStyle(.borderless)
                Button(role: .destructive) { onDelete() } label: { Label("Excluir", systemImage: "trash") }
                    .buttonStyle(.borderless)
            }
            .font(.caption)
            .controlSize(.small)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .legisCard(tint: PrecedentKind.color(precedent.kind), spine: true, hover: true)
    }
}

/// Formulário de cadastro/edição de uma jurisprudência.
struct PrecedentEditView: View {
    @EnvironmentObject var store: AppStore
    @Environment(\.dismiss) private var dismiss
    let lawID: UUID
    let accent: Color
    let existing: LawPrecedent?
    var prefillArticle: String = ""   // pré-preenche o "artigo relacionado" ao vincular pelo Estudo

    @State private var court = ""
    @State private var kind = "Súmula"
    @State private var identifier = ""
    @State private var articleRef = ""
    @State private var date = ""
    @State private var summary = ""
    @State private var notes = ""
    @State private var url = ""
    @State private var tags = ""
    @FocusState private var foco: Bool
    @State private var confirmarDescarte = false

    private var canSave: Bool {
        !identifier.trimmingCharacters(in: .whitespaces).isEmpty ||
        !summary.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    /// Há texto digitado que se perderia ao fechar? Trava o fechar por gesto e faz o
    /// Cancelar perguntar antes.
    private var temRascunho: Bool {
        guard let e = existing else {
            return !court.isEmpty || !identifier.isEmpty || !date.isEmpty || !summary.isEmpty
                || !notes.isEmpty || !url.isEmpty || !tags.isEmpty || articleRef != prefillArticle
        }
        return court != e.court || kind != e.kind || identifier != e.identifier || articleRef != e.articleRef
            || date != e.date || summary != e.summary || notes != e.notes || url != e.url
            || tags != e.tags.joined(separator: ", ")
    }

    var body: some View {
        // Form nativo em seções, com Cancelar/Salvar na barra de uma NavigationStack
        // interna: o Form de 190 pt que rolava dentro da folha (que também rolava) e os
        // botões no rodapé saíam da tela no iPhone; aqui tudo rola junto e o teclado
        // empurra o conteúdo.
        NavigationStack {
            Form {
                Section {
                    Picker("Tipo", selection: $kind) {
                        ForEach(PrecedentKind.all, id: \.self) { Text($0).tag($0) }
                    }
                    TextField("Tribunal (ex.: STF, STJ, TJSP, TRF-1)", text: $court).focused($foco)
                    TextField("Número / identificação (ex.: Súmula 231, REsp 1.657.156, Tema 69)", text: $identifier).focused($foco)
                    TextField("Artigo relacionado (ex.: Art. 5º, XII) — opcional", text: $articleRef).focused($foco)
                    TextField("Data do julgamento/publicação — opcional", text: $date).focused($foco)
                    TextField("Link para a íntegra — opcional", text: $url).focused($foco)
                        .keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                    TextField("Tags separadas por vírgula — opcional", text: $tags).focused($foco)
                }
                Section("Ementa / enunciado / tese") {
                    TextEditor(text: $summary).font(.body).frame(minHeight: 120).focused($foco)
                }
                Section("Anotações (opcional)") {
                    TextEditor(text: $notes).font(.body).frame(minHeight: 70).focused($foco)
                }
            }
            .formStyle(.grouped)
            .scrollContentBackground(.hidden)
            .background(AppTheme.pageBackground)
            .navigationTitle(existing == nil ? "Nova jurisprudência" : "Editar jurisprudência")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { if temRascunho { confirmarDescarte = true } else { dismiss() } }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Salvar") { save() }.disabled(!canSave)
                }
            }
            .tecladoConcluir(foco: $foco)
            .legisDescartarRascunho(isPresented: $confirmarDescarte) { dismiss() }
        }
        .folhaAdaptavel(temRascunho: temRascunho)
        .onAppear {
            guard let e = existing else {
                if articleRef.isEmpty { articleRef = prefillArticle }   // novo, vindo do Estudo
                return
            }
            court = e.court; kind = e.kind; identifier = e.identifier; articleRef = e.articleRef
            date = e.date; summary = e.summary; notes = e.notes; url = e.url
            tags = e.tags.joined(separator: ", ")
        }
    }

    private func save() {
        var entry = existing ?? LawPrecedent(lawID: lawID)
        entry.court = court.trimmingCharacters(in: .whitespaces)
        entry.kind = kind
        entry.identifier = identifier.trimmingCharacters(in: .whitespaces)
        entry.articleRef = articleRef.trimmingCharacters(in: .whitespaces)
        entry.date = date.trimmingCharacters(in: .whitespaces)
        entry.summary = summary.trimmingCharacters(in: .whitespacesAndNewlines)
        entry.notes = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        entry.url = url.trimmingCharacters(in: .whitespaces)
        entry.tags = tags.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        if existing == nil { store.addPrecedent(entry) } else { store.updatePrecedent(entry) }
        dismiss()
    }
}
