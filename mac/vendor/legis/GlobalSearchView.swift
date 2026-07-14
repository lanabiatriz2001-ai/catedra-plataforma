import SwiftUI

/// Pesquisa global: busca o termo no texto de TODAS as normas baixadas e leva
/// direto ao artigo, com o trecho em destaque.
struct GlobalSearchView: View {
    @EnvironmentObject var store: AppStore
    let openAt: (UUID, Int) -> Void   // (norma, índice do artigo)

    @State private var query = ""
    @State private var hits: [LawSearchHit] = []
    @State private var searching = false
    @State private var searchedQuery = ""
    @State private var truncated = false
    // Cada busca ganha um número; só a mais recente pode escrever os resultados,
    // senão uma busca lenta anterior sobrescreveria uma mais nova.
    @State private var searchGeneration = 0

    private var lawCount: Int { store.laws.filter { $0.isRegularLaw && $0.isDownloaded }.count }

    var body: some View {
        VStack(spacing: 0) {
            header
            searchBar
            Rectangle().fill(AppTheme.hairline).frame(height: 1)
            content
        }
        .background(AppTheme.pageBackground)
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 13) {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(ThemeState.t.accent.opacity(0.14)).frame(width: 40, height: 40)
                .overlay(Image(systemName: "sparkle.magnifyingglass").font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(ThemeState.t.accent))
            VStack(alignment: .leading, spacing: 2) {
                Text("Buscar em tudo").font(.system(size: 20, weight: .bold)).foregroundStyle(AppTheme.ink)
                Text("Pesquisa o texto de todas as \(lawCount) normas e leva você direto ao artigo, com o trecho destacado.")
                    .font(.system(size: 12.5)).foregroundStyle(AppTheme.secondaryInk)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 8)
        }
        .padding(.horizontal, 22).padding(.top, 20).padding(.bottom, 12)
    }

    private var searchBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
            TextField("Buscar em todas as \(lawCount) normas…", text: $query)
                .textFieldStyle(.plain)
                .font(.title3)
                .onSubmit(runSearch)
            if !query.isEmpty {
                Button {
                    // Bumpar a geração invalida a Task de busca em voo (o guard
                    // gen == searchGeneration passa a falhar) e searching=false tira já o spinner.
                    searchGeneration += 1; searching = false
                    query = ""; hits = []; searchedQuery = ""; truncated = false
                } label: {
                    Image(systemName: "xmark.circle.fill")
                }
                .buttonStyle(.plain).foregroundStyle(.secondary)
            }
            Button("Buscar", action: runSearch)
                .buttonStyle(.borderedProminent)
                .disabled(query.trimmingCharacters(in: .whitespaces).count < 2)
        }
        .padding(.horizontal, 14).padding(.vertical, 12)
        .background(AppTheme.elevatedSurface)
    }

    @ViewBuilder
    private var content: some View {
        if searching {
            VStack { Spacer(); ProgressView("Buscando em \(lawCount) normas…"); Spacer() }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if searchedQuery.isEmpty {
            LegisEmpty(icon: "sparkle.magnifyingglass", title: "Pesquisa global inteligente",
                       message: "Digite um termo (ex.: “prescrição”, “boa-fé”, “dano moral”) e pressione Enter. A busca varre o texto de todas as normas e leva você direto ao artigo.")
        } else if hits.isEmpty {
            LegisEmpty(icon: "text.magnifyingglass", title: "Nada encontrado para “\(searchedQuery)”",
                       message: "Tente outro termo ou confira se as normas já foram baixadas.")
        } else {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 0) {
                    Text("\(hits.count) resultado\(hits.count == 1 ? "" : "s") para “\(searchedQuery)”")
                        .font(.caption).foregroundStyle(.secondary)
                        .padding(.horizontal, 16).padding(.top, 12).padding(.bottom, 4)
                    if truncated {
                        Text("Mostrando os primeiros resultados (até 6 por norma, 400 no total). Refine o termo para ver o restante.")
                            .font(.caption2).foregroundStyle(.tertiary)
                            .padding(.horizontal, 16).padding(.bottom, 6)
                    }
                    LazyVStack(spacing: 8) {
                        ForEach(hits) { hit in
                            Button { openAt(hit.lawID, hit.unitIndex) } label: { row(hit) }
                                .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.bottom, 12)
                }
            }
        }
    }

    private func row(_ hit: LawSearchHit) -> some View {
        HStack(alignment: .top, spacing: 10) {
            IconBubble(symbol: "doc.text.magnifyingglass", color: hit.accent, size: 28)
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(hit.unitLabel).font(.callout.weight(.semibold)).foregroundStyle(hit.accent)
                    Text("· \(hit.lawTitle)").font(.caption).foregroundStyle(.secondary).lineLimit(1)
                }
                if let c = hit.context {
                    Text(c).font(.caption2).foregroundStyle(.tertiary).lineLimit(1)
                }
                Text(highlighted(hit.snippet, hit.term))
                    .font(.callout).foregroundStyle(.secondary)
                    .lineLimit(3).fixedSize(horizontal: false, vertical: true)
            }
            Spacer()
            Image(systemName: "chevron.right").foregroundStyle(.tertiary).font(.caption)
        }
        .padding(12)
        .appSurface(accent: hit.accent)
        .contentShape(Rectangle())
    }

    private func highlighted(_ text: String, _ term: String) -> AttributedString {
        var attr = AttributedString(text)
        if let r = text.range(of: term, options: [.caseInsensitive, .diacriticInsensitive]),
           let lo = AttributedString.Index(r.lowerBound, within: attr),
           let hi = AttributedString.Index(r.upperBound, within: attr) {
            attr[lo..<hi].font = .callout.bold()
            attr[lo..<hi].foregroundColor = .primary
        }
        return attr
    }

    private func accent(for law: LawEntry) -> Color {
        if law.isNovidades { return .orange }
        if let custom = law.customCategory { return CustomCategoryStyle.color(for: custom) }
        return law.category.color
    }

    private func runSearch() {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard q.count >= 2 else { return }
        searching = true
        searchedQuery = q
        truncated = false
        searchGeneration += 1
        let gen = searchGeneration
        // Snapshot LEVE na MainActor: só id/título/cor + a URL do texto. A leitura
        // dos arquivos (até 250, dezenas de MB) e a varredura rodam na Task.detached,
        // fora da MainActor — o handler do botão não pode ler o disco em laço.
        let corpus: [(UUID, String, Color, URL)] = store.laws
            .filter { $0.isRegularLaw && $0.isDownloaded }
            .sorted { $0.title.localizedCompare($1.title) == .orderedAscending }
            .map { ($0.id, $0.title, accent(for: $0), store.textURL(for: $0.id)) }
        Task.detached(priority: .userInitiated) {
            let result = LawSearch.run(term: q, corpus: corpus)
            await MainActor.run {
                guard gen == self.searchGeneration else { return } // busca já substituída
                self.hits = result.hits
                self.truncated = result.truncated
                self.searching = false
            }
        }
    }
}
