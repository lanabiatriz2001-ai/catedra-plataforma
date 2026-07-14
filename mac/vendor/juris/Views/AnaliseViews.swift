import SwiftUI

// MARK: - Comparador STF × STJ

/// Mostra, lado a lado, os julgados de STF e STJ que tratam do mesmo assunto do verbete.
/// NÃO detecta divergência jurídica automaticamente — isso fica a cargo da leitura da usuária;
/// apenas sinaliza quando as SITUAÇÕES (vigente/superada/cancelada) diferem entre as colunas.
struct ComparadorView: View {
    let entry: JurisEntry
    @Environment(LibraryStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @AppStorage("anthropicKey") private var apiKey = ""
    @AppStorage("aiModel") private var aiModel = AIService.defaultModel
    @State private var iaTexto = ""
    @State private var iaCarregando = false
    @State private var iaErro: String?
    // Colunas calculadas UMA vez (comparaveis é O(n) — evita recomputar a cada render).
    @State private var stf: [JurisEntry] = []
    @State private var stj: [JurisEntry] = []

    private var situacoesDivergem: Bool {
        let a = Set(stf.map { $0.situacaoKind })
        let b = Set(stj.map { $0.situacaoKind })
        return !stf.isEmpty && !stj.isEmpty && a != b
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            cabecalho
            if situacoesDivergem {
                Label("Atenção: a situação (vigente/superada) difere entre STF e STJ — leia com cuidado.",
                      systemImage: "exclamationmark.triangle.fill")
                    .font(.system(size: 11.5, weight: .semibold)).foregroundStyle(.orange)
                    .padding(.horizontal, 20).padding(.bottom, 8)
            }
            iaPainel
            if stf.isEmpty && stj.isEmpty {
                vazio
            } else {
                HStack(alignment: .top, spacing: 14) {
                    coluna("STF", Palette.fonteSTF, stf)
                    Divider()
                    coluna("STJ", Palette.fonteSTJ, stj)
                }
                .padding(20)
            }
        }
        .frame(width: 900, height: 680)
        .background(Palette.appBackground)
        .task(id: entry.id) {
            stf = store.comparaveis(entry, tribunal: "STF")
            stj = store.comparaveis(entry, tribunal: "STJ")
        }
    }

    // MARK: - Análise por IA (fiel ao texto oficial)

    @ViewBuilder private var iaPainel: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "sparkles").foregroundStyle(Palette.accent)
                Text("ANÁLISE POR IA").font(.system(size: 10, weight: .bold)).tracking(1).foregroundStyle(Palette.accent)
                Spacer()
                if iaCarregando {
                    ProgressView().controlSize(.small)
                } else {
                    Button {
                        Task { await analisarIA() }
                    } label: {
                        Label(iaTexto.isEmpty ? "Comparar com IA" : "Refazer análise", systemImage: "sparkles")
                    }
                    .buttonStyle(.borderedProminent).tint(Palette.accent).controlSize(.small)
                    .disabled(stf.isEmpty && stj.isEmpty)
                }
            }
            if let iaErro {
                Label(iaErro, systemImage: "exclamationmark.triangle.fill")
                    .font(.system(size: 11)).foregroundStyle(.orange).fixedSize(horizontal: false, vertical: true)
            }
            if !iaTexto.isEmpty {
                Text(.init(iaTexto))
                    .font(.system(size: 12.5)).foregroundStyle(Palette.bodyInk)
                    .textSelection(.enabled).fixedSize(horizontal: false, vertical: true)
                Text("Gerado por IA a partir dos enunciados oficiais — confira sempre a fonte antes de usar em prova.")
                    .font(.system(size: 9.5)).foregroundStyle(Palette.secondaryInk)
            } else if iaErro == nil && !iaCarregando {
                Text("A IA compara os entendimentos usando SOMENTE os enunciados oficiais abaixo, para não inventar teses.")
                    .font(.system(size: 10.5)).foregroundStyle(Palette.secondaryInk)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.accent.opacity(0.06), in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Palette.accent.opacity(0.22), lineWidth: 1))
        .padding(.horizontal, 20).padding(.top, 12)
    }

    /// Serializa um verbete com NATUREZA (força vinculante) + SITUAÇÃO — para a IA não
    /// apresentar enunciado superado/cancelado como vigente nem confundir o peso do precedente.
    private func serializar(_ e: JurisEntry) -> String {
        let nat = e.fonteKind.nome
        let sit = (e.situacao?.isEmpty == false) ? " [\(e.situacao!.uppercased())]" : ""
        return "[\(nat)] \(e.titulo)\(sit): \(store.textoEnunciado(for: e))"
    }

    private func analisarIA() async {
        iaErro = nil; iaCarregando = true
        defer { iaCarregando = false }
        let textosSTF = stf.map(serializar)
        let textosSTJ = stj.map(serializar)
        let nota = notaComoTexto(store.notaApp(for: entry.id))
        do {
            iaTexto = try await AIService.compararSTFxSTJ(
                assunto: entry.tema ?? entry.titulo,
                verbete: serializar(entry),
                tribunalVerbete: entry.tribunal,
                nota: nota, stf: textosSTF, stj: textosSTJ,
                apiKey: apiKey, model: aiModel)
        } catch {
            iaErro = (error as? AIService.AIError)?.errorDescription ?? error.localizedDescription
        }
    }

    /// Serializa a nota de estudo curada (tese + ramos) para dar à IA como base confiável.
    private func notaComoTexto(_ nota: NotaEstudo?) -> String? {
        guard let nota else { return nil }
        var linhas: [String] = []
        if let t = nota.tese { linhas.append("Tese: \(t)") }
        for r in nota.ramos ?? [] {
            linhas.append("\(r.titulo): " + r.itens.joined(separator: "; "))
        }
        let s = linhas.joined(separator: "\n")
        return s.isEmpty ? nil : s
    }

    private var cabecalho: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Label("Comparar STF × STJ", systemImage: "arrow.left.arrow.right.square")
                    .font(.system(size: 16, weight: .bold)).foregroundStyle(Palette.titleInk)
                Spacer()
                Button("Fechar") { dismiss() }
            }
            Text("Mesmo assunto de: \(entry.titulo). A comparação é para você julgar — não afirmo divergência automaticamente.")
                .font(.system(size: 11.5)).foregroundStyle(Palette.secondaryInk)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(20)
        .background(Palette.sidebarBackground)
        .overlay(alignment: .bottom) { Rectangle().fill(Palette.hairline).frame(height: 1) }
    }

    private func coluna(_ titulo: String, _ cor: Color, _ itens: [JurisEntry]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 7) {
                Image(systemName: "building.columns.fill").foregroundStyle(cor)
                Text(titulo).font(Typo.serifTitle(16, .bold)).foregroundStyle(Palette.titleInk)
                Text("\(itens.count)").font(.system(size: 11, weight: .bold))
                    .padding(.horizontal, 7).padding(.vertical, 1)
                    .background(cor.opacity(0.16), in: Capsule()).foregroundStyle(cor)
            }
            if itens.isEmpty {
                Text("Nada encontrado deste tribunal para o assunto.")
                    .font(.system(size: 12)).foregroundStyle(Palette.secondaryInk).padding(.top, 4)
            }
            ScrollView {
                VStack(spacing: 9) { ForEach(itens) { cartao($0, cor) } }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func cartao(_ e: JurisEntry, _ cor: Color) -> some View {
        Button { dismiss(); store.lerCheio(e.id) } label: {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Text(e.fonteKind.nomeCurto).font(.system(size: 9, weight: .bold)).tracking(0.4)
                        .foregroundStyle(cor)
                    if let s = e.situacao { SituacaoPill(texto: s) }
                    Spacer()
                    if let d = e.data { Text(d).font(.system(size: 9)).foregroundStyle(Palette.secondaryInk) }
                }
                Text(e.titulo).font(Typo.serifTitle(13.5, .semibold)).foregroundStyle(Palette.titleInk).lineLimit(1)
                Text(e.enunciado).font(Typo.serifBody(11.5)).foregroundStyle(Palette.bodyInk.opacity(0.85))
                    .lineLimit(4).lineSpacing(1.5).fixedSize(horizontal: false, vertical: true)
            }
            .padding(11)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 10))
            .overlay(alignment: .leading) { RoundedRectangle(cornerRadius: 2).fill(cor).frame(width: 3).padding(.vertical, 10) }
            .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Palette.hairline, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private var vazio: some View {
        VStack(spacing: 8) {
            Image(systemName: "text.magnifyingglass").font(.system(size: 30)).foregroundStyle(Palette.secondaryInk)
            Text("Não encontrei julgados de STF e STJ sobre este assunto no acervo.")
                .font(.system(size: 13)).foregroundStyle(Palette.secondaryInk)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Linha do tempo de um tema

/// Verbetes do mesmo assunto em ordem cronológica, destacando o que foi superado/cancelado.
struct LinhaTempoView: View {
    let entry: JurisEntry
    @Environment(LibraryStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    private var itens: [JurisEntry] { store.linhaDoTempo(entry) }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Label("Linha do tempo do tema", systemImage: "clock.arrow.circlepath")
                    .font(.system(size: 16, weight: .bold)).foregroundStyle(Palette.titleInk)
                Spacer()
                Button("Fechar") { dismiss() }
            }
            .padding(20)
            .background(Palette.sidebarBackground)
            .overlay(alignment: .bottom) { Rectangle().fill(Palette.hairline).frame(height: 1) }

            Text("Assunto de “\(entry.titulo)” — do mais antigo ao mais recente. Sem data aparecem ao fim.")
                .font(.system(size: 11.5)).foregroundStyle(Palette.secondaryInk)
                .padding(.horizontal, 20).padding(.vertical, 10)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(itens.enumerated()), id: \.element.id) { idx, e in
                        linha(e, primeiro: idx == 0, ultimo: idx == itens.count - 1)
                    }
                }
                .padding(.horizontal, 20).padding(.bottom, 20)
            }
        }
        .frame(width: 720, height: 640)
        .background(Palette.appBackground)
    }

    private func linha(_ e: JurisEntry, primeiro: Bool, ultimo: Bool) -> some View {
        let invalida = e.situacaoKind == .cancelada || e.situacaoKind == .superada
        let cor = invalida ? Color.orange : e.fonteKind.cor
        return HStack(alignment: .top, spacing: 12) {
            VStack(spacing: 0) {
                Rectangle().fill(primeiro ? .clear : Palette.hairline).frame(width: 2, height: 10)
                Circle().fill(cor).frame(width: 11, height: 11)
                Rectangle().fill(ultimo ? .clear : Palette.hairline).frame(width: 2).frame(maxHeight: .infinity)
            }
            Button { dismiss(); store.lerCheio(e.id) } label: {
                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 7) {
                        Text(e.data ?? "sem data").font(.system(size: 11, weight: .bold)).foregroundStyle(cor)
                        Text(e.fonteKind.nomeCurto).font(.system(size: 9.5, weight: .semibold)).foregroundStyle(Palette.secondaryInk)
                        if let s = e.situacao { SituacaoPill(texto: s) }
                        Spacer()
                    }
                    Text(e.titulo).font(Typo.serifTitle(13.5, .semibold))
                        .foregroundStyle(Palette.titleInk)
                        .strikethrough(invalida, color: .orange).lineLimit(1)
                    Text(e.enunciado).font(Typo.serifBody(11.5)).foregroundStyle(Palette.bodyInk.opacity(0.8))
                        .lineLimit(2).fixedSize(horizontal: false, vertical: true)
                }
                .padding(11)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Palette.hairline, lineWidth: 1))
            }
            .buttonStyle(.plain)
            .padding(.bottom, 10)
        }
    }
}
