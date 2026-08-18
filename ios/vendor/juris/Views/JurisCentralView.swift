import SwiftUI

/// Página-hub de uma Central (tribunal/grupo): tudo que é julgado por aquele
/// tribunal, com um botão por fonte E navegação por disciplina/assunto.
/// A Central de Tribunais Específicos mostra UMA central por tribunal (TJRO,
/// TJGO, TJRJ, TJPR + as que a usuária cadastrar).
struct JurisCentralView: View {
    let central: JurisCentral
    @Environment(LibraryStore.self) private var store
    @State private var novoTribunal = false
    @State private var nomeTribunal = ""
    @State private var siglaTribunal = ""

    private var doCentral: [JurisEntry] {
        entriesDaCentral
    }
    private var entriesDaCentral: [JurisEntry] {
        store.entries.filter { $0.fonteKind.central == central }
    }
    private var total: Int {
        central.fontes.reduce(0) { $0 + (store.fonteCounts[$1] ?? 0) }
    }
    private var recentes: [JurisEntry] {
        Array(store.entries.lazy.filter { $0.fonteKind.central == central }.prefix(14))
    }

    private func ir(_ s: Selecao) {
        store.searchText = ""
        store.leituraID = nil
        store.selecao = s
        store.selectedID = nil
    }

    private let grid = [GridItem(.adaptive(minimum: 240, maximum: 320), spacing: 12)]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Hero da Central — mesma assinatura visual da casa (gradiente + branco)
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 10) {
                        Image(systemName: central.simbolo).font(.system(size: 22, weight: .semibold))
                            .foregroundStyle(.white.opacity(0.9))
                        Text(central.nome).font(.system(size: 26, weight: .bold)).foregroundStyle(.white)
                        Spacer()
                        Text("\(total) verbetes")
                            .font(.system(size: 11.5, weight: .semibold)).monospacedDigit()
                            .padding(.horizontal, 10).padding(.vertical, 4)
                            .background(Color.white.opacity(0.16), in: Capsule())
                            .foregroundStyle(.white)
                    }
                    Text(central.subtitulo)
                        .font(.system(size: 12.5)).foregroundStyle(.white.opacity(0.85))
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(22)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    LinearGradient(colors: ThemeState.t.heroStops,
                                   startPoint: .topLeading, endPoint: .bottomTrailing),
                    in: RoundedRectangle(cornerRadius: max(6, ThemeState.t.radius)))

                if central == .especificos {
                    // UMA central por tribunal + cadastrar novas
                    tituloSecao("Centrais de tribunal", "building.2")
                    LazyVGrid(columns: grid, alignment: .leading, spacing: 12) {
                        ForEach(store.tribunais) { t in
                            botaoTribunal(t)
                        }
                        botaoCadastrarTribunal
                    }
                } else {
                    // Botões por tipo de jurisprudência (fonte)
                    tituloSecao("Por tipo de jurisprudência", "tray.2")
                    LazyVGrid(columns: grid, alignment: .leading, spacing: 12) {
                        ForEach(central.fontes) { f in
                            botaoFonte(f)
                        }
                    }

                    // Navegação por disciplina (dentro dela: assuntos + tipos)
                    let discs = store.disciplinasEm(doCentral)
                    if !discs.isEmpty {
                        tituloSecao("Por disciplina", "books.vertical")
                        LazyVGrid(columns: grid, alignment: .leading, spacing: 12) {
                            ForEach(discs, id: \.nome) { d in
                                botaoDisciplina(d.nome, d.count)
                            }
                        }
                    }
                }

                if !recentes.isEmpty {
                    VStack(alignment: .leading, spacing: 11) {
                        HStack(spacing: 7) {
                            Image(systemName: "clock").font(.system(size: 12)).foregroundStyle(Palette.accent)
                            Text("Desta central").font(Typo.serifTitle(17, .bold)).foregroundStyle(Palette.titleInk)
                        }
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(recentes) { CartaoJuris(entry: $0) }
                            }
                        }
                    }
                }
                Color.clear.frame(height: 20)
            }
            .padding(.horizontal, 26).padding(.top, 22)
        }
        .background(Palette.appBackground)
        .alert("Nova central de tribunal", isPresented: $novoTribunal) {
            TextField("Sigla (ex.: TJSP)", text: $siglaTribunal)
            TextField("Nome do tribunal (ex.: Tribunal de Justiça de São Paulo)", text: $nomeTribunal)
            Button("Criar") {
                let sigla = siglaTribunal.trimmingCharacters(in: .whitespaces)
                guard !sigla.isEmpty else { return }
                let nome = nomeTribunal.trimmingCharacters(in: .whitespaces)
                let t = store.criarTribunal(nome: nome.isEmpty ? sigla.uppercased() : nome, sigla: sigla)
                ir(.tribunal(t.id))
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("A central reúne tudo que cita a sigla no acervo — e você pode favoritar e colecionar a partir dela.")
        }
    }

    private func tituloSecao(_ t: String, _ icone: String) -> some View {
        HStack(spacing: 7) {
            Image(systemName: icone).font(.system(size: 12)).foregroundStyle(Palette.accent)
            Text(t).font(Typo.serifTitle(17, .bold)).foregroundStyle(Palette.titleInk)
        }
    }

    // Cartão-botão de uma fonte (com contagem; 0 = ainda não baixada → dica de atualizar).
    private func botaoFonte(_ f: Fonte) -> some View {
        let count = store.fonteCounts[f] ?? 0
        return Button { if count > 0 { ir(.fonte(f)) } } label: {
            HStack(spacing: 10) {
                Image(systemName: f.simbolo)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Palette.accent)
                    .frame(width: 34, height: 34)
                    .background(Palette.accent.opacity(0.12), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                VStack(alignment: .leading, spacing: 1) {
                    Text(f.nome).font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(Palette.titleInk)
                        .lineLimit(2).multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(count > 0 ? "\(count) verbete\(count == 1 ? "" : "s")"
                                   : "use Atualizar em Novidades para buscar no site oficial")
                        .font(.system(size: 10)).foregroundStyle(Palette.secondaryInk)
                        .lineLimit(1).minimumScaleFactor(0.8)
                }
                Spacer(minLength: 4)
                if count > 0 {
                    Image(systemName: "chevron.right").font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(Palette.secondaryInk)
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: max(6, ThemeState.t.radius)))
            .overlay(RoundedRectangle(cornerRadius: max(6, ThemeState.t.radius)).strokeBorder(Palette.hairline, lineWidth: 1))
            .opacity(count > 0 ? 1 : 0.65)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .help(count > 0 ? f.nome : "\(f.nome) — sem verbetes baixados; rode Atualizar em Novidades")
    }

    // Cartão-botão de uma disciplina desta central → página com assuntos e tipos.
    private func botaoDisciplina(_ nome: String, _ count: Int) -> some View {
        Button { ir(.ramoDetalhe(EscopoFiltrado(central: central, ramo: nome))) } label: {
            HStack(spacing: 10) {
                Image(systemName: "bookmark")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Palette.accent)
                    .frame(width: 34, height: 34)
                    .background(Palette.accent.opacity(0.12), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                VStack(alignment: .leading, spacing: 1) {
                    Text(nome).font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(Palette.titleInk)
                        .lineLimit(2).multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("\(count) verbete\(count == 1 ? "" : "s") · assuntos e tipos")
                        .font(.system(size: 10)).foregroundStyle(Palette.secondaryInk)
                        .lineLimit(1).minimumScaleFactor(0.8)
                }
                Spacer(minLength: 4)
                Image(systemName: "chevron.right").font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Palette.secondaryInk)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: max(6, ThemeState.t.radius)))
            .overlay(RoundedRectangle(cornerRadius: max(6, ThemeState.t.radius)).strokeBorder(Palette.hairline, lineWidth: 1))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    // Cartão-botão de UMA central de tribunal (TJRO, TJGO… ou cadastrada).
    private func botaoTribunal(_ t: TribunalEspecifico) -> some View {
        let count = store.entriesDoTribunal(t.id).count
        return Button { ir(.tribunal(t.id)) } label: {
            HStack(spacing: 10) {
                Text(t.sigla)
                    .font(.system(size: 11, weight: .bold))
                    .minimumScaleFactor(0.6).lineLimit(1)
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 34)
                    .background(Palette.accent, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                VStack(alignment: .leading, spacing: 1) {
                    Text(t.nome).font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(Palette.titleInk).lineLimit(1)
                    Text(count > 0 ? "\(count) verbete\(count == 1 ? "" : "s")"
                                   : "sem verbetes no acervo ainda")
                        .font(.system(size: 10)).foregroundStyle(Palette.secondaryInk)
                        .lineLimit(1).minimumScaleFactor(0.8)
                }
                Spacer(minLength: 4)
                if t.aoVivo {
                    Image(systemName: "antenna.radiowaves.left.and.right")
                        .font(.system(size: 10, weight: .semibold)).foregroundStyle(Palette.accent)
                        .help("Tem busca ao vivo no site do tribunal")
                }
                Image(systemName: "chevron.right").font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Palette.secondaryInk)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: max(6, ThemeState.t.radius)))
            .overlay(RoundedRectangle(cornerRadius: max(6, ThemeState.t.radius)).strokeBorder(Palette.hairline, lineWidth: 1))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .contextMenu {
            if t.custom {
                Button(role: .destructive) { store.excluirTribunal(t.id) } label: {
                    Label("Excluir esta central", systemImage: "trash")
                }
            }
        }
    }

    // Cartão "Cadastrar tribunal" — a usuária cria a central que quiser.
    private var botaoCadastrarTribunal: some View {
        Button { nomeTribunal = ""; siglaTribunal = ""; novoTribunal = true } label: {
            HStack(spacing: 10) {
                Image(systemName: "plus")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Palette.accent)
                    .frame(width: 34, height: 34)
                    .background(Palette.accent.opacity(0.12), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                VStack(alignment: .leading, spacing: 1) {
                    Text("Nova central de tribunal").font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(Palette.titleInk)
                    Text("cadastre o tribunal que você quiser (ex.: TJSP)")
                        .font(.system(size: 10)).foregroundStyle(Palette.secondaryInk)
                        .lineLimit(1).minimumScaleFactor(0.8)
                }
                Spacer(minLength: 4)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: max(6, ThemeState.t.radius)))
            .overlay(RoundedRectangle(cornerRadius: max(6, ThemeState.t.radius))
                .strokeBorder(Palette.accent.opacity(0.5), style: StrokeStyle(lineWidth: 1, dash: [5, 4])))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
