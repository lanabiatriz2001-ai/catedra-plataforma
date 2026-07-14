import SwiftUI

/// Feed de atualizações vindas dos sites oficiais (estilo "novidades").
struct NovidadesView: View {
    @Environment(LibraryStore.self) private var store
    @Environment(UpdateService.self) private var updater

    private static let rel: RelativeDateTimeFormatter = {
        let f = RelativeDateTimeFormatter()
        f.locale = Locale(identifier: "pt_BR")
        f.unitsStyle = .full
        return f
    }()

    var body: some View {
        Group {
            if store.novidades.isEmpty {
                vazio
            } else {
                List {
                    ForEach(store.novidades) { ev in
                        Section {
                            ForEach(store.julgadosAgrupados(ev), id: \.disciplina) { grupo in
                                disciplinaLinha(grupo.disciplina, grupo.itens.count)
                                ForEach(grupo.itens) { entry in
                                    Button {
                                        store.selectedID = entry.id
                                    } label: {
                                        EntryRow(entry: entry, query: "",
                                                 isFavorite: store.isFavorite(entry.id),
                                                 isImportante: store.isImportante(entry),
                                                 hasNote: store.hasAnnotation(entry.id),
                                                 mostrarLido: false)
                                            .contentShape(Rectangle())
                                    }
                                    .buttonStyle(.plain)
                                    .listRowBackground(store.selectedID == entry.id ? Palette.selection : Color.clear)
                                }
                            }
                        } header: { header(ev) }
                    }
                }
                .listStyle(.inset)
                .scrollContentBackground(.hidden)
                .background(Palette.appBackground)
            }
        }
        .background(Palette.appBackground)
        .navigationSubtitle(store.novidades.isEmpty ? "" :
            "\(store.novidades.count) atualização\(store.novidades.count == 1 ? "" : "ões")")
        .onAppear { store.marcarNovidadesVistas() }
        .onDisappear { store.marcarNovidadesVistas() }
    }

    private var estaExecutando: Bool {
        if case .executando = updater.fase { return true }
        return false
    }

    private func header(_ ev: NovidadeEvent) -> some View {
        HStack(spacing: 8) {
            if store.novidadeNaoVista(ev) {
                Circle().fill(Palette.accent).frame(width: 7, height: 7)
            }
            Image(systemName: ev.fonteKind.simbolo)
                .font(.system(size: 11)).foregroundStyle(ev.fonteKind.cor)
            VStack(alignment: .leading, spacing: 1) {
                Text(ev.titulo)
                    .font(Typo.serifTitle(13, .semibold))
                    .foregroundStyle(Palette.titleInk)
                Text("\(ev.detalhe) · \(Self.rel.localizedString(for: ev.data, relativeTo: Date()))")
                    .font(.system(size: 10.5))
                    .foregroundStyle(Palette.secondaryInk)
            }
            Spacer()
        }
        .textCase(nil)
        .padding(.vertical, 3)
    }

    /// Sub-cabeçalho de disciplina dentro de um informativo.
    private func disciplinaLinha(_ disciplina: String, _ n: Int) -> some View {
        HStack(spacing: 7) {
            Image(systemName: "bookmark.fill").font(.system(size: 9)).foregroundStyle(Palette.accent)
            Text(disciplina.uppercased())
                .font(.system(size: 10, weight: .bold)).tracking(0.8)
                .foregroundStyle(Palette.accent)
            Text("\(n)").font(.system(size: 9, weight: .bold))
                .padding(.horizontal, 5).padding(.vertical, 0.5)
                .background(Palette.accent.opacity(0.14), in: Capsule())
                .foregroundStyle(Palette.accent)
            Spacer()
        }
        .padding(.top, 6).padding(.bottom, 1)
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
    }

    private var vazio: some View {
        VStack(spacing: 14) {
            Image(systemName: "sparkles")
                .font(.system(size: 38, weight: .thin))
                .foregroundStyle(Palette.accent.opacity(0.7))
            Text("Sem novidades ainda")
                .font(Typo.serifTitle(17, .semibold))
                .foregroundStyle(Palette.titleInk)
            Text("Quando o STF, o STJ ou o TSE publicarem novos informativos ou súmulas,\neles aparecem aqui automaticamente.")
                .font(.system(size: 12))
                .multilineTextAlignment(.center)
                .foregroundStyle(Palette.secondaryInk)
            Button {
                Task { await updater.atualizar(store: store) }
            } label: {
                Label(estaExecutando ? "Verificando…" : "Verificar agora", systemImage: "arrow.triangle.2.circlepath")
                    .font(.system(size: 12, weight: .semibold))
            }
            .buttonStyle(.borderedProminent)
            .tint(Palette.accent)
            .disabled(estaExecutando)
            if let d = updater.ultimaVerificacao {
                Text("Última verificação: \(d.formatted(date: .abbreviated, time: .shortened))")
                    .font(.system(size: 10.5)).foregroundStyle(Palette.secondaryInk)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(40)
    }
}
