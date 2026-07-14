import SwiftUI

/// Sessão de revisão espaçada (SM-2, estilo Anki): percorre os cartões vencidos do
/// baralho, revela a resposta e agenda a próxima revisão conforme Errei/Difícil/Bom/Fácil.
/// Portado do "Vade Mecum de Leis" para manter os dois apps no mesmo padrão.
struct RevisaoEspacadaView: View {
    @Environment(LibraryStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    /// Escopo opcional: nil = todos os vencidos do baralho; senão só estes ids.
    var escopo: [String]? = nil

    @State private var fila: [String] = []
    @State private var revelado = false
    @State private var revisados: Set<String> = []
    @State private var total = 0
    @State private var incluiuTodos = false

    var body: some View {
        VStack(spacing: 0) {
            barra
            Divider().overlay(Palette.hairline)
            conteudo
        }
        .frame(width: 680, height: 640)
        .background(Palette.detailBackground)
        .onAppear(perform: montar)
    }

    private func montar() {
        let vencidos = store.srsDueIds().filter { store.byId[$0] != nil }
        let base = escopo?.filter { store.byId[$0] != nil && store.srsHasCard($0) } ?? vencidos
        fila = base.filter { id in store.srsCard(id).map { store.srsIsDue($0) } ?? false }
        if fila.isEmpty, let esc = escopo { fila = esc.filter { store.byId[$0] != nil } }  // escopo manual: revisa mesmo
        total = fila.count
    }

    private var barra: some View {
        HStack {
            Button { dismiss() } label: { Image(systemName: "xmark") }.buttonStyle(.plain)
            Spacer()
            VStack(spacing: 1) {
                Label("Revisão espaçada", systemImage: "brain.head.profile")
                    .font(.system(size: 13, weight: .bold)).foregroundStyle(Palette.accent)
                if !fila.isEmpty {
                    Text("Restam \(fila.count) · \(revisados.count) revisados")
                        .font(.system(size: 10.5)).foregroundStyle(Palette.secondaryInk)
                }
            }
            Spacer()
            Image(systemName: "xmark").opacity(0)   // simetria
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
    }

    @ViewBuilder private var conteudo: some View {
        if let id = fila.first, let e = store.byId[id], let card = store.srsCard(id) {
            cartao(id, e, card)
        } else {
            fim
        }
    }

    private func cartao(_ id: String, _ e: JurisEntry, _ card: JurisSRSCard) -> some View {
        VStack(spacing: 0) {
            HStack {
                FonteBadge(fonte: e.fonteKind)
                Spacer()
                Text(e.titulo).font(.system(size: 11, weight: .semibold)).foregroundStyle(Palette.secondaryInk).lineLimit(1)
            }
            .padding(.horizontal, 20).padding(.top, 14).padding(.bottom, 8)
            Divider().overlay(Palette.hairline)

            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text(rotuloPergunta(card.cardKind)).font(.system(size: 11, weight: .bold)).tracking(0.5)
                        .foregroundStyle(Palette.accent)
                    Text(card.prompt ?? e.titulo)
                        .font(Typo.serifBody(19)).lineSpacing(5).foregroundStyle(Palette.readingInk)
                        .fixedSize(horizontal: false, vertical: true).textSelection(.enabled)

                    if revelado {
                        Divider().overlay(Palette.hairline)
                        respostaView(card)
                        // Conferência: enunciado integral (sem virar "decore tudo").
                        Text(store.textoEnunciado(for: e))
                            .font(Typo.serifBody(13)).foregroundStyle(Palette.secondaryInk)
                            .lineSpacing(4).fixedSize(horizontal: false, vertical: true)
                            .padding(.top, 4)
                    }
                }
                .padding(20).frame(maxWidth: .infinity, alignment: .leading)
            }

            if revelado {
                gradeBar(id)
            } else {
                Divider().overlay(Palette.hairline)
                Button { withAnimation(.easeOut(duration: 0.15)) { revelado = true } } label: {
                    Label("Revelar a resposta", systemImage: "eye").frame(maxWidth: .infinity).padding(.vertical, 6)
                }
                .buttonStyle(.borderedProminent).tint(Palette.accent)
                .keyboardShortcut(.space, modifiers: [])
                .padding(16)
            }
        }
    }

    private func rotuloPergunta(_ kind: String?) -> String {
        switch kind {
        case JurisFlashKind.cloze, JurisFlashKind.clozeType: return "COMPLETE A LACUNA"
        case JurisFlashKind.certoErrado: return "CERTO OU ERRADO?"
        case JurisFlashKind.direta: return "RESPONDA"
        default: return "LEMBRE A TESE"
        }
    }

    @ViewBuilder private func respostaView(_ card: JurisSRSCard) -> some View {
        if card.cardKind == JurisFlashKind.certoErrado {
            let certo = card.answer?.hasPrefix("Certo") ?? false
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: certo ? "checkmark.seal.fill" : "xmark.seal.fill")
                    .foregroundStyle(certo ? Palette.fonteSTJ : .red)
                Text(card.answer ?? "").font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(certo ? Palette.fonteSTJ : .red)
                    .fixedSize(horizontal: false, vertical: true).textSelection(.enabled)
            }
        } else if let a = card.answer {
            HStack(spacing: 8) {
                Image(systemName: "key.fill").foregroundStyle(Palette.accent)
                Text(a).font(.system(size: 16, weight: .bold)).foregroundStyle(Palette.accent).textSelection(.enabled)
            }
        }
    }

    private func gradeBar(_ id: String) -> some View {
        VStack(spacing: 6) {
            Divider().overlay(Palette.hairline)
            Text("Como foi lembrar?").font(.system(size: 11)).foregroundStyle(Palette.secondaryInk)
            HStack(spacing: 8) {
                ForEach(JurisSRSGrade.allCases) { grade in
                    Button { aplicar(id, grade) } label: {
                        VStack(spacing: 2) {
                            Text(grade.label).font(.system(size: 12, weight: .semibold))
                            Text(JurisSpacedRepetition.intervalLabel(store.srsPreview(id, grade)))
                                .font(.system(size: 9).monospacedDigit()).foregroundStyle(Palette.secondaryInk)
                        }
                        .frame(maxWidth: .infinity).padding(.vertical, 6)
                    }
                    .buttonStyle(.bordered).tint(grade.cor)
                }
            }
            .padding(.horizontal, 16).padding(.bottom, 14)
        }
    }

    private func aplicar(_ id: String, _ grade: JurisSRSGrade) {
        store.srsGrade(id, grade: grade)
        revisados.insert(id)
        var f = fila
        f.removeFirst()
        if grade == .again { f.append(id) }   // "Errei" reapresenta ao fim
        withAnimation(.easeInOut(duration: 0.12)) { fila = f; revelado = false }
    }

    private var fim: some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.seal.fill").font(.system(size: 44)).foregroundStyle(Palette.fonteSTJ)
            Text(total == 0 ? "Nada para revisar agora" : "Revisão concluída!")
                .font(.system(size: 18, weight: .bold)).foregroundStyle(Palette.titleInk)
            Text(total == 0
                 ? "Seu baralho está em dia. Crie flashcards nos verbetes para revisar aqui."
                 : "\(revisados.count) cartão\(revisados.count == 1 ? "" : "s") revisado\(revisados.count == 1 ? "" : "s") nesta sessão.")
                .font(.system(size: 12)).foregroundStyle(Palette.secondaryInk).multilineTextAlignment(.center)
            Button("Fechar") { dismiss() }.buttonStyle(.borderedProminent).tint(Palette.accent)
        }
        .padding(40).frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// Gerenciador do baralho: ver, apagar cartões e exportar para o Anki.
struct BaralhoView: View {
    @Environment(LibraryStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var mostrarAnki = false
    @State private var confirmarLimpar = false

    private struct Item: Identifiable { let id: String; let entry: JurisEntry; let card: JurisSRSCard }
    private var itens: [Item] {
        store.srs.compactMap { (id, card) in store.byId[id].map { Item(id: id, entry: $0, card: card) } }
            .sorted { $0.entry.titulo.localizedCompare($1.entry.titulo) == .orderedAscending }
    }
    private var deckEntries: [JurisEntry] { itens.map(\.entry) }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Label("Baralho · \(itens.count) cartõe\(itens.count == 1 ? "" : "s")", systemImage: "rectangle.stack")
                    .font(.system(size: 14, weight: .bold)).foregroundStyle(Palette.titleInk)
                Spacer()
                let due = store.srsDueCount
                if due > 0 {
                    Text("\(due) vencido\(due == 1 ? "" : "s")").font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.white).padding(.horizontal, 7).padding(.vertical, 2)
                        .background(Palette.accent, in: Capsule())
                }
                Button { mostrarAnki = true } label: { Label("Exportar Anki", systemImage: "square.and.arrow.up") }
                    .disabled(itens.isEmpty)
                Button("Fechar") { dismiss() }
            }
            .padding(16)
            .background(Palette.sidebarBackground)
            .overlay(alignment: .bottom) { Rectangle().fill(Palette.hairline).frame(height: 1) }

            if itens.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "rectangle.stack.badge.plus").font(.system(size: 40)).foregroundStyle(Palette.secondaryInk)
                    Text("Baralho vazio").font(.system(size: 15, weight: .semibold)).foregroundStyle(Palette.titleInk)
                    Text("Abra um verbete e use “Criar flashcard” para adicioná-lo ao baralho.")
                        .font(.system(size: 12)).foregroundStyle(Palette.secondaryInk).multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity).padding(30)
            } else {
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(itens) { it in linha(it) }
                    }
                    .padding(14)
                }
                HStack {
                    Button(role: .destructive) { confirmarLimpar = true } label: { Label("Esvaziar baralho", systemImage: "trash") }
                    Spacer()
                }
                .padding(.horizontal, 16).padding(.vertical, 10)
                .background(Palette.sidebarBackground)
                .overlay(alignment: .top) { Rectangle().fill(Palette.hairline).frame(height: 1) }
            }
        }
        .frame(width: 640, height: 620)
        .background(Palette.detailBackground)
        .sheet(isPresented: $mostrarAnki) { ExportAnkiSheet(entries: deckEntries, titulo: "Baralho de flashcards") }
        .confirmationDialog("Esvaziar o baralho? Os cartões e o agendamento serão apagados.",
                            isPresented: $confirmarLimpar, titleVisibility: .visible) {
            Button("Esvaziar", role: .destructive) { store.srsClearAll() }
            Button("Cancelar", role: .cancel) {}
        }
    }

    private func linha(_ it: Item) -> some View {
        let venc = store.srsIsDue(it.card)
        return HStack(alignment: .top, spacing: 10) {
            Image(systemName: estiloSimbolo(it.card.cardKind)).font(.system(size: 13)).foregroundStyle(it.entry.fonteKind.cor)
                .frame(width: 18)
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(it.entry.titulo).font(.system(size: 12, weight: .bold)).foregroundStyle(Palette.titleInk)
                    Text(venc ? "vencido" : JurisSpacedRepetition.intervalLabel(store.srsDaysUntilDue(it.card)))
                        .font(.system(size: 9.5, weight: .semibold))
                        .foregroundStyle(venc ? .white : Palette.secondaryInk)
                        .padding(.horizontal, 6).padding(.vertical, 1)
                        .background(venc ? Palette.accent : Palette.hairline, in: Capsule())
                }
                Text(it.card.prompt ?? it.entry.enunciado).font(.system(size: 11.5))
                    .foregroundStyle(Palette.bodyInk).lineLimit(2).fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
            Button { store.srsRemove(it.id) } label: { Image(systemName: "trash").foregroundStyle(.red.opacity(0.75)) }
                .buttonStyle(.plain)
        }
        .padding(10)
        .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Palette.hairline, lineWidth: 1))
    }

    private func estiloSimbolo(_ kind: String?) -> String {
        switch kind {
        case JurisFlashKind.cloze: return "rectangle.dashed"
        case JurisFlashKind.clozeType: return "square.and.pencil"
        case JurisFlashKind.certoErrado: return "checkmark.circle"
        case JurisFlashKind.direta: return "questionmark.circle"
        default: return "rectangle.on.rectangle"
        }
    }
}
