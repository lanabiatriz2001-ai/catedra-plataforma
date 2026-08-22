import SwiftUI

// MARK: - Índice das normas (árvore CF/CC/CPC/CP/CPP → títulos → capítulos)

struct IndiceNormasView: View {
    @EnvironmentObject var store: AppStore
    let open: (UUID) -> Void

    @AppStorage("readerMode") private var readerMode = "estudo"
    @State private var query = ""
    @State private var codeId: String = ReadingData.indice.first?.id ?? "cf"
    @State private var collapsed: Set<String> = []   // títulos recolhidos (padrão = tudo aberto)

    private var code: IdxCode? {
        ReadingData.indice.first { $0.id == codeId } ?? ReadingData.indice.first
    }

    var body: some View {
        SectionShell(icon: "list.bullet.indent",
                     title: "Índice das normas",
                     subtitle: "Estrutura dos códigos por Livros, Títulos e Capítulos",
                     search: $query,
                     searchPrompt: "Buscar título ou capítulo…",
                     tintStops: code.flatMap { Color(css: $0.color) }.map { [$0, $0.opacity(0.7)] }) {
            VStack(spacing: 0) {
                tabs
                Divider().overlay(AppTheme.hairline)
                if let c = code { codeBody(c) } else { LegisEmpty(icon: "list.bullet.indent", title: "Sem dados", message: "O índice não carregou.") }
            }
        }
    }

    // MARK: code tabs

    private var tabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(ReadingData.indice, id: \.id) { c in
                    let col = Color(css: c.color) ?? ThemeState.t.accent
                    let on = c.id == codeId
                    Button { codeId = c.id; collapsed = [] } label: {
                        HStack(spacing: 7) {
                            Text(c.abbr).font(.system(size: 12, weight: .heavy))
                                .foregroundStyle(on ? .white : col)
                            Text(c.ct).font(Typo.num(10, .semibold))
                                .foregroundStyle(on ? Color.white.opacity(0.85) : AppTheme.secondaryInk)
                        }
                        .padding(.horizontal, 12).padding(.vertical, 8)
                        .background(Capsule().fill(on ? col : col.opacity(0.10)))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 20).padding(.vertical, 11)
        }
    }

    // MARK: code body (hero + tree)

    @ViewBuilder
    private func codeBody(_ c: IdxCode) -> some View {
        let col = Color(css: c.color) ?? ThemeState.t.accent
        let law0 = lawEntry(for: c.abbr)
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                hero(c, col, law0)
                ForEach(filteredTitulos(c), id: \.self) { t in   // num repete entre Livros; o struct inteiro é único
                    titRow(c, t, col, law0)
                }
                if filteredTitulos(c).isEmpty {
                    Text("Nada encontrado para a busca neste código.")
                        .font(.system(size: 12.5)).foregroundStyle(AppTheme.secondaryInk)
                        .frame(maxWidth: .infinity).padding(.vertical, 30)
                }
                Color.clear.frame(height: 30)
            }
            .padding(.horizontal, 18).padding(.top, 14)
        }
    }

    private func hero(_ c: IdxCode, _ col: Color, _ law0: LawEntry?) -> some View {
        HStack(alignment: .top, spacing: 14) {
            RoundedRectangle(cornerRadius: AppTheme.rCard, style: .continuous).fill(col)
                .frame(width: 52, height: 52)
                .overlay(Text(c.abbr).font(.system(size: 15, weight: .heavy)).foregroundStyle(.white))
            VStack(alignment: .leading, spacing: 5) {
                Text(c.name).font(AppTheme.displayFont(19, .heavy)).foregroundStyle(AppTheme.ink)
                Text(c.full).font(.system(size: 12)).foregroundStyle(AppTheme.secondaryInk)
                HStack(spacing: 6) {
                    ForEach(c.meta, id: \.self) { m in
                        LegisChip(m, tint: col, variant: .soft)
                    }
                }
                .padding(.top, 2)
            }
            Spacer(minLength: 8)
            if let law0 {
                Button { readerMode = "estudo"; open(law0.id) } label: {
                    Label("Abrir norma", systemImage: "book.fill").font(.system(size: 12, weight: .semibold))
                }
                .buttonStyle(.borderedProminent).tint(col).controlSize(.small)
            }
        }
        .padding(16)
        .background(LinearGradient(colors: [col.opacity(0.14), AppTheme.cardBackground], startPoint: .topLeading, endPoint: .bottomTrailing),
                    in: RoundedRectangle(cornerRadius: AppTheme.rHero, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: AppTheme.rHero, style: .continuous).strokeBorder(col.opacity(0.25), lineWidth: 1))
    }

    @ViewBuilder
    private func titRow(_ c: IdxCode, _ t: IdxTitulo, _ col: Color, _ law0: LawEntry?) -> some View {
        let key = c.id + "|" + t.num + "|" + t.name
        let hasCaps = !t.caps.isEmpty
        let isOpen = hasCaps && !collapsed.contains(key)
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Button {
                    if hasCaps { if collapsed.contains(key) { collapsed.remove(key) } else { collapsed.insert(key) } }
                } label: {
                    HStack(spacing: 10) {
                        LegisChip(t.num, tint: col, variant: .soft, size: 11)
                        Text(t.name).font(.system(size: 13.5, weight: .semibold)).foregroundStyle(AppTheme.ink)
                            .lineLimit(2)
                        Spacer(minLength: 6)
                        if !t.arts.isEmpty {
                            Text(t.arts).font(.system(size: 10.5)).foregroundStyle(AppTheme.secondaryInk)
                        }
                        if hasCaps {
                            Image(systemName: "chevron.right").font(.system(size: 10.5, weight: .semibold))
                                .foregroundStyle(AppTheme.secondaryInk.opacity(0.5))
                                .rotationEffect(.degrees(isOpen ? 90 : 0))
                        }
                    }
                }
                .buttonStyle(.plain)
                if let law0 {
                    Button { openArticle(law0, firstArt(t.arts)) } label: {
                        Image(systemName: "arrow.up.right.square").font(.system(size: 13)).foregroundStyle(col)
                    }
                    .buttonStyle(.plain).help("Abrir no leitor, no artigo")
                }
            }
            .padding(.horizontal, 14).padding(.vertical, 11)
            if isOpen {
                LazyVGrid(columns: [GridItem(.flexible(), alignment: .topLeading),
                                    GridItem(.flexible(), alignment: .topLeading)],
                          alignment: .leading, spacing: 4) {
                    ForEach(Array(t.caps.enumerated()), id: \.offset) { _, cap in   // capítulos não são filtrados
                        HStack(alignment: .firstTextBaseline, spacing: 8) {
                            Text(cap.k).font(.system(size: 10.5, weight: .heavy)).foregroundStyle(col)
                                .frame(minWidth: 44, alignment: .leading)
                            Text(cap.d).font(.system(size: 12)).foregroundStyle(AppTheme.secondaryInk)
                                .fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: 0)
                        }
                        .padding(.vertical, 3)
                    }
                }
                .padding(.horizontal, 16).padding(.bottom, 9).padding(.top, 2)
            }
        }
        .legisCard(tint: col, spine: true)
    }

    // MARK: helpers

    private func norm(_ s: String) -> String { s.lowercased().folding(options: .diacriticInsensitive, locale: nil) }
    private var terms: [String] { norm(query).split(separator: " ").map(String.init).filter { !$0.isEmpty } }

    private func filteredTitulos(_ c: IdxCode) -> [IdxTitulo] {
        if terms.isEmpty { return c.titulos }
        return c.titulos.filter { t in
            let caps = t.caps.map { $0.k + " " + $0.d }.joined(separator: " ")
            let hay = norm(t.num + " " + t.name + " " + t.arts + " " + caps)
            return terms.allSatisfy { hay.contains($0) }
        }
    }

    private func lawEntry(for abbr: String) -> LawEntry? {
        store.laws.first { $0.isRegularLaw && RemissiveIndex.shortName($0) == abbr }
    }
    private func firstArt(_ a: String) -> String? {
        let after = a.drop(while: { !$0.isNumber })
        let num = after.prefix(while: { $0.isNumber || $0 == "." })
        return num.isEmpty ? nil : String(num)
    }
    private func openArticle(_ law: LawEntry, _ artNum: String?) {
        if let n = artNum, let uid = store.articleUnitID(lawID: law.id, number: n) { store.setLastUnit(law.id, uid) }
        readerMode = "estudo"
        open(law.id)
    }
}
