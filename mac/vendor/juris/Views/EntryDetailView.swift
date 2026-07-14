import SwiftUI
import AppKit
import UniformTypeIdentifiers

struct EntryDetailView: View {
    let entry: JurisEntry
    @Environment(LibraryStore.self) private var store
    @AppStorage("readingScale") private var readingScale: Double = 1.0
    @AppStorage("markColor") private var markColorHex: String = MarkColor.amarelo.rawValue
    @AppStorage("defaultAlign") private var defaultAlign: String = "justify"   // alinhamento global padrão
    @AppStorage("readingFontFamily") private var readingFontFamily: String = ""   // fonte de leitura global
    @State private var copiado = false
    @State private var enunHeight: CGFloat = 60
    @State private var markController = MarkController()
    @State private var rtController = RichTextController()
    @State private var mostrarNovaColecao = false
    @State private var novaColecaoNome = ""
    @State private var mostrarAnki = false
    @State private var mostrarComparador = false
    @State private var mostrarLinhaTempo = false
    @State private var mostrarMapa = false
    @State private var mostrarRevisao = false
    @State private var notaEmTexto = false   // alterna a nota entre esquema e prosa
    @State private var editandoEnunciado = false
    @State private var rascunhoEnunciado = ""
    @State private var corPersonalizada = Color(hex: MarkColor.amarelo.rawValue)
    @State private var corTextoAnot = Color(hex: "#1F2A3D")
    @State private var corRealceAnot = Color(hex: MarkColor.amarelo.rawValue)
    @State private var corTextoVerbete = Color(hex: "#4F46E5")
    @State private var commentAnchors: [MarkCommentAnchor] = []
    @State private var editingMarkComment: EditingMarkComment?
    @State private var focusedMarkID: String?
    @State private var showAnnotationsPanel = false

    private var baseSize: CGFloat { 16.5 * readingScale }
    private var markColor: MarkColor { MarkColor(rawValue: markColorHex) ?? .amarelo }

    var body: some View {
        ScrollViewReader { proxy in
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                Color.clear.frame(height: 0).id("topo")
                header
                alertaSituacao
                enunciadoCard
                notaAppCard
                anotacaoCard
                metadata
                if let p = entry.precedentes, !p.isEmpty {
                    disclosure("Precedentes / Julgados", "text.quote", p)
                }
                if let c = entry.comentario, !c.isEmpty {
                    disclosure("Comentário", "text.bubble", c)
                }
                if let o = entry.observacao, !o.isEmpty {
                    disclosure("Observação", "exclamationmark.bubble", o)
                }
                if let r = entry.referencias, !r.isEmpty {
                    disclosure("Referências legislativas", "book.closed", r)
                }
                relacionadosSection
                footer
            }
            .padding(.horizontal, 34)
            .padding(.vertical, 30)
            .frame(maxWidth: 780, alignment: .leading)
            .frame(maxWidth: .infinity, alignment: .center)
        }
        .background(Palette.detailBackground)
        .navigationTitle(entry.titulo)
        // No embed a toolbar da JANELA pertence ao host (seletor de abas) — os botões
        // do verbete viram uma barra própria acima do conteúdo (estilo Books).
        .safeAreaInset(edge: .top, spacing: 0) { entryToolbar }
        .onAppear {
            store.markRecent(entry.id)
            // Rateio do relógio: o tempo passa a contar para a matéria deste verbete.
            JurisClock.shared.setContext(entry.ramoDireito, titulo: entry.titulo)
        }
        .alert("Nova coleção", isPresented: $mostrarNovaColecao) {
            TextField("Nome (ex.: Meu edital)", text: $novaColecaoNome)
            Button("Criar") {
                let nome = novaColecaoNome.trimmingCharacters(in: .whitespaces)
                let c = store.criarColecao(nome.isEmpty ? "Nova coleção" : nome)
                store.toggleNaColecao(entry.id, c.id)
                novaColecaoNome = ""
            }
            Button("Cancelar", role: .cancel) { novaColecaoNome = "" }
        } message: {
            Text("O verbete atual será adicionado à nova coleção.")
        }
        .sheet(isPresented: $mostrarAnki) {
            ExportAnkiSheet(entries: [entry], titulo: entry.titulo)
        }
        .sheet(isPresented: $mostrarComparador) { ComparadorView(entry: entry) }
        .sheet(isPresented: $mostrarLinhaTempo) { LinhaTempoView(entry: entry) }
        .sheet(isPresented: $mostrarMapa) { MapaMentalSheet(entry: entry) }
        .sheet(isPresented: $mostrarRevisao) { RevisaoEspacadaView(escopo: [entry.id]) }
        .sheet(item: $editingMarkComment) { ec in
            MarkCommentEditorSheet(initial: ec.text, isEditing: ec.markID != nil,
                                   onSave: { text in var e = ec; e.text = text; saveComment(e) },
                                   onDelete: ec.markID != nil ? { deleteComment(ec.markID!) } : nil,
                                   onCancel: { editingMarkComment = nil })
        }
        .onAppear {
            proxy.scrollTo("topo", anchor: .top)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) { proxy.scrollTo("topo", anchor: .top) }
        }
        }
        .inspector(isPresented: $showAnnotationsPanel) {
            JurisAnnotationsPanel(entryID: entry.id, focusedMarkID: $focusedMarkID, markController: markController)
                .inspectorColumnWidth(min: 260, ideal: 320, max: 420)
        }
        .id(entry.id)
    }

    // MARK: - Cabeçalho

    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                FonteBadge(fonte: entry.fonteKind)
                if let s = entry.situacao { SituacaoPill(texto: s) }
                if store.isImportante(entry) { ImportantePill() }
                if let d = entry.data { dataPill(d) }
                Spacer()
                lidoBotao
            }
            Text(entry.titulo)
                .font(Typo.serifTitle(30))
                .foregroundStyle(Palette.titleInk)
                .textSelection(.enabled)
                .fixedSize(horizontal: false, vertical: true)
            if let t = entry.tema, t != entry.titulo {
                Text(t)
                    .font(Typo.serifBody(15, .medium)).italic()
                    .foregroundStyle(Palette.secondaryInk)
                    .textSelection(.enabled)
                    .fixedSize(horizontal: false, vertical: true)
            }
            HStack(spacing: 0) {
                Rectangle().fill(Palette.accent).frame(width: 44, height: 2)
                Rectangle().fill(Palette.hairline).frame(height: 1)
            }
            .padding(.top, 2)
        }
    }

    /// Nota de estudo ORIGINAL (não oficial) — esquema/mapa mental do que a corte quis dizer.
    @ViewBuilder private var notaAppCard: some View {
        if let nota = store.notaApp(for: entry.id) {
            // mostra prosa se a usuária alternou E há texto; senão, o esquema (se houver)
            let mostraTexto = (notaEmTexto && nota.texto != nil) || !nota.temEsquema
            VStack(alignment: .leading, spacing: 13) {
                HStack(spacing: 7) {
                    Image(systemName: "brain.head.profile").font(.system(size: 12)).foregroundStyle(Palette.importante)
                    Text("NOTA DE ESTUDO").font(.system(size: 10.5, weight: .bold)).tracking(1)
                        .foregroundStyle(Palette.importante)
                    Text("não oficial").font(.system(size: 9.5)).foregroundStyle(Palette.secondaryInk)
                        .padding(.horizontal, 6).padding(.vertical, 1)
                        .background(Palette.secondaryInk.opacity(0.12), in: Capsule())
                    Spacer()
                    if nota.temEsquema && nota.texto != nil {
                        HStack(spacing: 2) {
                            modoNotaBtn("Esquema", ativo: !notaEmTexto) { notaEmTexto = false }
                            modoNotaBtn("Texto", ativo: notaEmTexto) { notaEmTexto = true }
                        }
                    }
                }
                if let t = nota.tese {
                    Text(t).font(Typo.serifTitle(15.5, .bold)).foregroundStyle(Palette.titleInk)
                        .fixedSize(horizontal: false, vertical: true)
                }
                if mostraTexto {
                    if let txt = nota.texto {
                        Text(txt).font(Typo.serifBody(baseSize * 0.9)).foregroundStyle(Palette.bodyInk)
                            .lineSpacing(5).textSelection(.enabled).fixedSize(horizontal: false, vertical: true)
                    }
                } else {
                    if let fluxo = nota.fluxo, !fluxo.isEmpty { fluxoView(fluxo) }
                    if let ramos = nota.ramos {
                        VStack(alignment: .leading, spacing: 9) {
                            ForEach(Array(ramos.enumerated()), id: \.offset) { _, r in ramoView(r) }
                        }
                    }
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.importante.opacity(0.06), in: RoundedRectangle(cornerRadius: 14))
            .overlay(alignment: .leading) {
                RoundedRectangle(cornerRadius: 2).fill(Palette.importante).frame(width: 3.5).padding(.vertical, 14)
            }
            .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Palette.importante.opacity(0.22), lineWidth: 1))
        }
    }

    private func modoNotaBtn(_ titulo: String, ativo: Bool, _ acao: @escaping () -> Void) -> some View {
        Button(action: acao) {
            Text(titulo).font(.system(size: 10, weight: .semibold))
                .foregroundStyle(ativo ? .white : Palette.secondaryInk)
                .padding(.horizontal, 9).padding(.vertical, 3)
                .background(ativo ? Palette.importante : Color.clear, in: Capsule())
        }
        .buttonStyle(.plain)
    }

    private func fluxoView(_ passos: [String]) -> some View {
        VStack(spacing: 4) {
            ForEach(Array(passos.enumerated()), id: \.offset) { i, passo in
                Text(passo)
                    .font(.system(size: 12.5, weight: i == 0 ? .semibold : .regular))
                    .foregroundStyle(Palette.bodyInk)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 12).padding(.vertical, 8)
                    .frame(maxWidth: .infinity)
                    .background(Palette.accent.opacity(i == 0 ? 0.14 : 0.07), in: RoundedRectangle(cornerRadius: 9))
                    .overlay(RoundedRectangle(cornerRadius: 9).strokeBorder(Palette.accent.opacity(0.25), lineWidth: 1))
                if i < passos.count - 1 {
                    Image(systemName: "arrow.down").font(.system(size: 11, weight: .bold)).foregroundStyle(Palette.accent)
                }
            }
        }
    }

    private func corRamo(_ tipo: String) -> Color {
        switch tipo {
        case "regra": return Palette.fonteSTJ          // verde
        case "fundamento": return Palette.fonteSTF      // azul
        case "excecao": return Palette.fonteRG          // roxo
        case "pegadinha": return Palette.fonteRepetitivo // laranja
        case "cuidado": return Palette.fonteRepetitivo   // laranja
        case "vedacao": return .red                      // vermelho
        case "relacionada": return Palette.fonteTSE      // ciano/teal (destaque neutro)
        default: return Palette.secondaryInk
        }
    }

    private func ramoView(_ r: RamoNota) -> some View {
        let cor = corRamo(r.tipo)
        return HStack(alignment: .top, spacing: 10) {
            Image(systemName: r.simbolo).font(.system(size: 12)).foregroundStyle(cor).frame(width: 18)
            VStack(alignment: .leading, spacing: 4) {
                Text(r.titulo.uppercased()).font(.system(size: 10, weight: .bold)).tracking(0.6).foregroundStyle(cor)
                ForEach(Array(r.itens.enumerated()), id: \.offset) { _, item in
                    HStack(alignment: .top, spacing: 6) {
                        Text("•").font(.system(size: 12)).foregroundStyle(cor.opacity(0.7))
                        Text(item).font(.system(size: 12.5)).foregroundStyle(Palette.bodyInk)
                            .textSelection(.enabled).fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 8).padding(.horizontal, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(cor.opacity(0.06), in: RoundedRectangle(cornerRadius: 9))
        .overlay(alignment: .leading) { RoundedRectangle(cornerRadius: 1.5).fill(cor).frame(width: 2.5).padding(.vertical, 8) }
    }

    /// Alerta forte quando a súmula/tese perdeu validade (cancelada ou superada).
    @ViewBuilder private var alertaSituacao: some View {
        let k = entry.situacaoKind
        if k == .cancelada || k == .superada {
            let cancelada = k == .cancelada
            let cor: Color = cancelada ? .red : .orange
            HStack(alignment: .top, spacing: 11) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 18)).foregroundStyle(cor)
                VStack(alignment: .leading, spacing: 3) {
                    Text(cancelada ? "SÚMULA / TESE CANCELADA" : "ENTENDIMENTO SUPERADO")
                        .font(.system(size: 12.5, weight: .bold)).tracking(0.5).foregroundStyle(cor)
                    Text(entry.situacao ?? (cancelada
                            ? "Não utilize como fundamento — este enunciado foi cancelado."
                            : "Verifique o entendimento atual — esta tese foi superada."))
                        .font(.system(size: 12)).foregroundStyle(Palette.bodyInk)
                        .fixedSize(horizontal: false, vertical: true)
                    if !store.relacionados(entry).isEmpty {
                        Text("Veja os julgados relacionados abaixo para o entendimento vigente.")
                            .font(.system(size: 11)).foregroundStyle(Palette.secondaryInk)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(cor.opacity(0.10), in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(cor.opacity(0.35), lineWidth: 1))
        }
    }

    /// Data do julgado/súmula, visível no topo (calendário + data).
    private func dataPill(_ d: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: "calendar").font(.system(size: 10, weight: .semibold))
            Text(d).font(.system(size: 11, weight: .semibold))
        }
        .foregroundStyle(Palette.secondaryInk)
        .padding(.horizontal, 9).padding(.vertical, 4)
        .background(Palette.appBackground, in: Capsule())
        .overlay(Capsule().strokeBorder(Palette.hairline, lineWidth: 1))
        .help("Data do julgamento/aprovação")
    }

    /// Botão destacado para marcar/desmarcar como lido.
    private var lidoBotao: some View {
        let lido = store.isLido(entry.id)
        return Button { store.toggleLido(entry.id) } label: {
            HStack(spacing: 5) {
                Image(systemName: lido ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 12, weight: .semibold))
                Text(lido ? "Lido" : "Marcar como lido")
                    .font(.system(size: 12, weight: .semibold))
            }
            .foregroundStyle(lido ? .white : Palette.bodyInk)
            .padding(.horizontal, 12).padding(.vertical, 6)
            .background(lido ? Palette.fonteSTJ : Palette.appBackground, in: Capsule())
            .overlay(Capsule().strokeBorder(lido ? Color.clear : Palette.hairline, lineWidth: 1))
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .help(lido ? "Marcar como não lido" : "Marcar como lido")
    }

    // MARK: - Enunciado com marcações

    /// Alinhamento efetivo: override do verbete, ou o padrão global do app.
    private var alinhamentoEfetivo: String {
        let escolha = store.alinhamento(for: entry.id)
        return escolha == "natural" ? defaultAlign : escolha
    }
    private var alinhamentoNS: NSTextAlignment {
        switch alinhamentoEfetivo {
        case "center": return .center
        case "right": return .right
        case "justify": return .justified
        case "left": return .left
        default: return .natural
        }
    }

    private var hasComments: Bool { !commentAnchors.isEmpty }

    private var enunciadoCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            marcacaoToolbar
            Divider().overlay(Palette.hairline)
            HStack(alignment: .top, spacing: 12) {
                MarkableText(text: editandoEnunciado ? rascunhoEnunciado : store.textoEnunciado(for: entry),
                             marks: store.marks(for: entry.id),
                             query: editandoEnunciado ? "" : store.searchText,
                             baseFont: .serif(baseSize),
                             inkColor: NSColor(Palette.readingInk),
                             controller: markController,
                             height: $enunHeight,
                             alignment: alinhamentoNS,
                             editable: editandoEnunciado,
                             onCommit: { rascunhoEnunciado = $0 },
                             commentAnchors: $commentAnchors)
                    .frame(height: max(enunHeight, 24))
                    .padding(.top, 14)
                    .overlay(alignment: .topLeading) {
                        if editandoEnunciado {
                            RoundedRectangle(cornerRadius: 6)
                                .strokeBorder(Palette.accent.opacity(0.5), style: StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
                                .padding(.top, 8).allowsHitTesting(false)
                        }
                    }
                if hasComments && !editandoEnunciado { commentsMargin }
            }
            if editandoEnunciado { edicaoBar }
        }
        .padding(.vertical, 18)
        .padding(.horizontal, 22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 14))
        .overlay(alignment: .leading) {
            RoundedRectangle(cornerRadius: 2).fill(entry.fonteKind.cor)
                .frame(width: 3.5).padding(.vertical, 16).padding(.leading, 1.5)
        }
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Palette.hairline, lineWidth: 1))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 3)
    }

    /// Coluna de balões de comentário, alinhada ao trecho comentado — estilo Google Docs (espelha o LEGIS).
    private var commentsMargin: some View {
        ZStack(alignment: .topLeading) {
            Color.clear
            ForEach(laidOutBalloons()) { item in
                MarkCommentBalloon(note: item.note, color: Color(hex: item.colorHex),
                                   onTap: {
                                       editingMarkComment = EditingMarkComment(markID: item.id, range: NSRange(location: 0, length: 0), text: item.note)
                                   })
                    .frame(width: 208, alignment: .topLeading)
                    .offset(y: item.y + 14)
            }
        }
        .frame(width: 208)
    }

    /// Anti-colisão vertical dos balões (empurra os sobrepostos para baixo).
    private func laidOutBalloons() -> [MarkCommentAnchor] {
        var out: [MarkCommentAnchor] = []
        var cursor: CGFloat = -.greatestFiniteMagnitude
        for item in commentAnchors {
            var it = item
            if it.y < cursor { it.y = cursor }
            cursor = it.y + 66
            out.append(it)
        }
        return out
    }

    private var marcacaoToolbar: some View {
        HStack(spacing: 4) {
            Text("MARCAR")
                .font(.system(size: 9, weight: .bold)).tracking(1)
                .foregroundStyle(Palette.secondaryInk)

            toolBtn("arrow.uturn.backward") { store.undoMarks(entry.id) }
                .disabled(!store.canUndoMarks(entry.id)).help("Desfazer marcação")
            toolBtn("arrow.uturn.forward") { store.redoMarks(entry.id) }
                .disabled(!store.canRedoMarks(entry.id)).help("Refazer marcação")
            divisor

            grifoMenu
            toolBtn("bold") { aplicar(.negrito) }.help("Negrito no trecho")
            toolBtn("italic") { aplicar(.italico) }.help("Itálico no trecho")
            toolBtn("underline") { aplicar(.sublinhar) }.help("Sublinhar o trecho")
            toolBtn("strikethrough") { aplicar(.tachar) }.help("Tachar o trecho")
            corTextoMenu

            divisor
            gerarCardMenu
            alinhamentoMenu
            divisor
            toolBtn("text.bubble") { comment() }
                .disabled(markController.selecao.length == 0 && !hasComments)
                .help("Comentar o trecho selecionado")
            toolBtn("sidebar.right") { showAnnotationsPanel.toggle() }
                .foregroundStyle(showAnnotationsPanel ? Palette.accent : Palette.bodyInk)
                .help("Painel de anotações")
            divisor
            toolBtn("doc.on.doc") { copiarSelecao() }.help("Copiar o trecho selecionado")
            toolBtn("pencil") { iniciarEdicao() }
                .foregroundStyle(store.enunciadoFoiEditado(entry.id) ? Palette.accent : Palette.bodyInk)
                .help(store.enunciadoFoiEditado(entry.id) ? "Editar o texto (editado)" : "Editar o texto do verbete")

            Spacer()

            // Tamanho da fonte de leitura
            toolBtn("textformat.size.smaller") { readingScale = max(readingScale - 0.1, 0.8) }
                .help("Diminuir a fonte")
            Text("\(Int(readingScale * 100))%")
                .font(.system(size: 9.5, weight: .medium).monospacedDigit())
                .foregroundStyle(Palette.secondaryInk).frame(width: 30)
            toolBtn("textformat.size.larger") { readingScale = min(readingScale + 0.1, 1.8) }
                .help("Aumentar a fonte")

            divisor
            toolBtn("eraser") { limparMarca() }.help("Remover marcação do trecho selecionado")
        }
        .buttonStyle(.plain)
        .font(.system(size: 13))
        .disabled(editandoEnunciado)
        .opacity(editandoEnunciado ? 0.4 : 1)
    }

    /// Quadradinho da cor (NSImage não-template) para aparecer colorido nos menus.
    private func corSwatch(_ hex: String, size: CGFloat = 11) -> Image {
        let ns = NSImage(size: NSSize(width: size, height: size))
        ns.lockFocus()
        let rect = NSRect(x: 0.5, y: 0.5, width: size - 1, height: size - 1)
        let path = NSBezierPath(roundedRect: rect, xRadius: size / 2, yRadius: size / 2)
        NSColor(Color(hex: hex)).setFill(); path.fill()
        NSColor.separatorColor.setStroke(); path.lineWidth = 0.5; path.stroke()
        ns.unlockFocus()
        ns.isTemplate = false
        return Image(nsImage: ns)
    }

    // Menu de grifo: cores favoritas + seletor livre + gerenciar paleta
    private var grifoMenu: some View {
        Menu {
            Section("Cores favoritas") {
                ForEach(store.coresFavoritas, id: \.self) { hex in
                    Button { markColorHex = hex; aplicarHex(hex) } label: {
                        Label { Text(hex.uppercased() + (markColorHex.uppercased() == hex.uppercased() ? "  ✓" : "")) }
                            icon: { corSwatch(hex) }
                    }
                }
            }
            Divider()
            Button { adicionarCorAtualAosFavoritos() } label: {
                Label("Salvar cor atual nos favoritos", systemImage: "plus.circle")
            }
            if store.coresFavoritas.count > 1 {
                Menu {
                    ForEach(store.coresFavoritas, id: \.self) { hex in
                        Button(role: .destructive) { store.removerCorFavorita(hex) } label: {
                            Label("Remover \(hex.uppercased())", systemImage: "trash")
                        }
                    }
                } label: { Label("Remover cor…", systemImage: "minus.circle") }
            }
        } label: {
            HStack(spacing: 3) {
                Image(systemName: "highlighter").foregroundStyle(markColor.color)
                // seletor de cor livre (infinitas cores) embutido
                ColorPicker("", selection: $corPersonalizada, supportsOpacity: false)
                    .labelsHidden().frame(width: 16, height: 16).scaleEffect(0.7)
            }
        }
        .menuIndicator(.hidden)
        .frame(width: 44)
        .help("Grifar — cores favoritas ou escolher qualquer cor")
        .onChange(of: corPersonalizada) { _, nova in
            let hex = nova.hexString
            markColorHex = hex
            aplicarHex(hex)
        }
    }

    // Selecionar → gerar card: a seleção vira lacuna (cloze) do flashcard.
    private var gerarCardMenu: some View {
        let n = store.clozes(for: entry.id).count
        return Menu {
            Button { aplicar(.cloze) } label: { Label("Transformar seleção em lacuna", systemImage: "rectangle.dashed.badge.record") }
            Button { sugerirLacuna() } label: { Label("Sugerir lacuna automática (o que mais cai)", systemImage: "wand.and.stars") }
            Button { copiarCloze() } label: { Label("Copiar card cloze (para o Anki)", systemImage: "doc.on.clipboard") }
                .disabled(n == 0)
            if n > 0 {
                Divider()
                Text("\(n) lacuna\(n == 1 ? "" : "s") neste verbete")
                Button(role: .destructive) { removerClozes() } label: { Label("Remover todas as lacunas", systemImage: "trash") }
            }
            Divider()
            Text("Selecione um trecho e crie a lacuna. Na exportação, vira card Cloze / Digite a Resposta nos seus modelos.")
        } label: {
            Image(systemName: "rectangle.dashed.badge.record")
                .foregroundStyle(n > 0 ? Palette.accent : Palette.bodyInk)
        }
        .menuIndicator(.hidden).frame(width: 26)
        .help("Gerar card: transformar a seleção em lacuna (cloze)")
    }

    // Cor do texto do trecho selecionado (paridade com a paleta das anotações).
    private var corTextoMenu: some View {
        Menu {
            Section("Cor do texto") {
                ForEach(store.coresFavoritas, id: \.self) { hex in
                    Button { aplicarCorTexto(hex) } label: { Label { Text(hex.uppercased()) } icon: { corSwatch(hex) } }
                }
                ColorPicker("Cor personalizada…", selection: $corTextoVerbete, supportsOpacity: false)
                Button { store.adicionarCorFavorita(corTextoVerbete.hexString) } label: {
                    Label("Salvar cor nos favoritos", systemImage: "plus.circle")
                }
            }
        } label: {
            Image(systemName: "a.square.fill").foregroundStyle(corTextoVerbete)
        }
        .menuIndicator(.hidden).frame(width: 26)
        .help("Cor da letra do trecho")
        .onChange(of: corTextoVerbete) { _, nova in aplicarCorTexto(nova.hexString) }
    }

    private var alinhamentoMenu: some View {
        Menu {
            Section("Este verbete") {
                Button { store.setAlinhamento("left", for: entry.id) } label: { Label("À esquerda", systemImage: "text.alignleft") }
                Button { store.setAlinhamento("center", for: entry.id) } label: { Label("Centralizado", systemImage: "text.aligncenter") }
                Button { store.setAlinhamento("right", for: entry.id) } label: { Label("À direita", systemImage: "text.alignright") }
                Button { store.setAlinhamento("justify", for: entry.id) } label: { Label("Justificado", systemImage: "text.justify") }
                Button { store.setAlinhamento("natural", for: entry.id) } label: { Label("Usar padrão do app", systemImage: "arrow.uturn.backward") }
            }
            Divider()
            Menu {
                Button { defaultAlign = "justify" } label: { Label("Justificado", systemImage: defaultAlign == "justify" ? "checkmark" : "text.justify") }
                Button { defaultAlign = "left" } label: { Label("À esquerda", systemImage: defaultAlign == "left" ? "checkmark" : "text.alignleft") }
                Button { defaultAlign = "center" } label: { Label("Centralizado", systemImage: defaultAlign == "center" ? "checkmark" : "text.aligncenter") }
            } label: { Label("Padrão de todo o app…", systemImage: "textformat") }
        } label: {
            Image(systemName: iconeAlinhamento).foregroundStyle(Palette.bodyInk)
        }
        .menuIndicator(.hidden).frame(width: 26)
        .help("Alinhamento do texto")
    }

    private var iconeAlinhamento: String {
        switch alinhamentoEfetivo {
        case "center": return "text.aligncenter"
        case "right": return "text.alignright"
        case "justify": return "text.justify"
        default: return "text.alignleft"
        }
    }

    // Barra que aparece durante a edição do texto — com ferramentas de texto livre.
    private var edicaoBar: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Ferramentas que só fazem sentido em texto editável (inserção/estrutura).
            HStack(spacing: 5) {
                Image(systemName: "pencil.and.outline").font(.system(size: 11))
                Text("EDITANDO O TEXTO").font(.system(size: 9, weight: .bold)).tracking(1)
                divisor
                edicaoBtn("list.bullet") { bulletNoVerbete() }.help("Lista com marcador")
                // Emoji / ícones de estudo
                Menu {
                    ForEach(gruposSimbolos.first!.1, id: \.self) { s in Button(s) { inserirNoVerbete(s) } }
                } label: { Image(systemName: "face.smiling") }
                .menuIndicator(.hidden).frame(width: 22).help("Inserir ícone de estudo")
                // Símbolos jurídicos
                Menu {
                    ForEach(gruposSimbolos.dropFirst(), id: \.0) { grupo in
                        Section(grupo.0) { ForEach(grupo.1, id: \.self) { s in Button(s) { inserirNoVerbete(s) } } }
                    }
                } label: { Image(systemName: "number.square") }
                .menuIndicator(.hidden).frame(width: 22).help("Inserir símbolo jurídico")
                // Fonte de leitura (global)
                Menu {
                    Section("Fonte de leitura") {
                        Button { readingFontFamily = "" } label: { Label("Padrão do app", systemImage: readingFontFamily.isEmpty ? "checkmark" : "textformat") }
                        Menu("Todas as fontes instaladas…") {
                            ForEach(familiasInstaladas, id: \.self) { fam in
                                Button { readingFontFamily = fam } label: { Label(fam, systemImage: readingFontFamily == fam ? "checkmark" : "") }
                            }
                        }
                    }
                } label: { Image(systemName: "textformat") }
                .menuIndicator(.hidden).frame(width: 22).help("Fonte de leitura do app")
                Spacer()
            }
            .buttonStyle(.plain).font(.system(size: 12)).foregroundStyle(Palette.accent)

            HStack(spacing: 8) {
                Text("O texto oficial nunca é perdido — “Restaurar original” volta a qualquer momento.")
                    .font(.system(size: 10)).foregroundStyle(Palette.secondaryInk)
                Spacer()
                if store.enunciadoFoiEditado(entry.id) {
                    Button("Restaurar original") {
                        store.restaurarEnunciadoOriginal(entry.id)
                        editandoEnunciado = false
                    }.font(.system(size: 11))
                }
                Button("Cancelar") { editandoEnunciado = false }.font(.system(size: 11))
                Button("Salvar") {
                    store.setTextoEditado(rascunhoEnunciado, entry: entry)
                    editandoEnunciado = false
                }
                .font(.system(size: 11, weight: .semibold))
                .buttonStyle(.borderedProminent).tint(Palette.accent)
            }
        }
        .foregroundStyle(Palette.accent)
        .padding(.top, 12)
    }

    private func edicaoBtn(_ icon: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon).frame(width: 22, height: 20).contentShape(Rectangle())
        }
    }

    // Inserção/estrutura no NSTextView editável do enunciado (modo edição).
    private func inserirNoVerbete(_ s: String) {
        guard editandoEnunciado, let tv = markController.textView else { return }
        let sel = tv.selectedRange()
        if tv.shouldChangeText(in: sel, replacementString: s) {
            tv.textStorage?.replaceCharacters(in: sel, with: s)
            tv.didChangeText()
            tv.setSelectedRange(NSRange(location: sel.location + (s as NSString).length, length: 0))
            rascunhoEnunciado = tv.string
        }
    }
    private func bulletNoVerbete() {
        guard editandoEnunciado, let tv = markController.textView, let ts = tv.textStorage else { return }
        let ns = ts.string as NSString
        let lineRange = ns.lineRange(for: tv.selectedRange())
        let linhas = ns.substring(with: lineRange).components(separatedBy: "\n")
        let tem = linhas.first(where: { !$0.isEmpty })?.hasPrefix("• ") ?? false
        let novas = linhas.map { l -> String in
            if l.isEmpty { return l }
            if tem { return l.hasPrefix("• ") ? String(l.dropFirst(2)) : l }
            return "• " + l
        }
        let novo = novas.joined(separator: "\n")
        if tv.shouldChangeText(in: lineRange, replacementString: novo) {
            ts.replaceCharacters(in: lineRange, with: novo)
            tv.didChangeText()
            rascunhoEnunciado = tv.string
        }
    }

    private var divisor: some View {
        Rectangle().fill(Palette.hairline).frame(width: 1, height: 16).padding(.horizontal, 2)
    }

    private func toolBtn(_ icon: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .foregroundStyle(Palette.bodyInk)
                .frame(width: 24, height: 22)
                .contentShape(Rectangle())
        }
    }

    private func aplicar(_ kind: MarkKind, cor: MarkColor? = nil) {
        let sel = markController.selecao
        guard sel.length > 0 else { return }
        store.addMark(TextMark(start: sel.location, length: sel.length,
                               kind: kind, colorHex: cor?.rawValue), for: entry.id)
    }
    private func aplicarHex(_ hex: String) {
        let sel = markController.selecao
        guard sel.length > 0 else { return }
        store.addMark(TextMark(start: sel.location, length: sel.length,
                               kind: .grifar, colorHex: hex), for: entry.id)
    }
    private func adicionarCorAtualAosFavoritos() {
        store.adicionarCorFavorita(markColorHex)
    }
    private func aplicarCorTexto(_ hex: String) {
        let sel = markController.selecao
        guard sel.length > 0 else { return }
        store.addMark(TextMark(start: sel.location, length: sel.length, kind: .corTexto, colorHex: hex), for: entry.id)
    }
    private func iniciarEdicao() {
        rascunhoEnunciado = store.textoEnunciado(for: entry)
        editandoEnunciado = true
    }
    private func limparMarca() {
        let sel = markController.selecao
        let alvo = sel.length > 0 ? sel : NSRange(location: 0, length: (store.textoEnunciado(for: entry) as NSString).length)
        store.removeMarks(in: alvo, for: entry.id)
    }
    private func copiarCloze() {
        let base = store.textoEnunciado(for: entry)
        guard let cz = Exporter.clozeDeMarcas(base, store.clozes(for: entry.id), agrupado: false) else { return }
        copiar(cz)
    }
    private func removerClozes() { store.removeClozes(for: entry.id) }
    /// Aplica a melhor lacuna automática (número/prazo/competência/tese), evitando as já existentes.
    private func sugerirLacuna() {
        let base = store.textoEnunciado(for: entry)
        let usados = store.clozes(for: entry.id).map(\.range)
        guard let r = Exporter.melhorLacuna(base, evitando: usados) else { return }
        store.addMark(TextMark(start: r.location, length: r.length, kind: .cloze, colorHex: nil), for: entry.id)
    }
    /// Abre o editor de comentário: reaproveita a marcação comentada que já cobre a
    /// seleção, senão prepara um comentário novo — espelha o LEGIS.
    private func comment() {
        let sel = markController.selecao
        if sel.length > 0, let existing = store.marks(for: entry.id).first(where: {
            !($0.note ?? "").isEmpty && NSIntersectionRange($0.range, sel).length > 0
        }) {
            editingMarkComment = EditingMarkComment(markID: existing.id, range: sel, text: existing.note ?? "")
        } else if sel.length > 0 {
            editingMarkComment = EditingMarkComment(markID: nil, range: sel, text: "")
        }
    }
    private func saveComment(_ ec: EditingMarkComment) {
        store.setComment(ec.text, markID: ec.markID, range: ec.range, for: entry.id)
        editingMarkComment = nil
    }
    private func deleteComment(_ markID: String) {
        store.removeComment(markID: markID, for: entry.id)
        editingMarkComment = nil
    }
    private func copiarSelecao() {
        let sel = markController.selecao
        let texto = store.textoEnunciado(for: entry)
        let ns = texto as NSString
        let alvo: String
        if sel.length > 0, sel.location + sel.length <= ns.length {
            alvo = ns.substring(with: sel)
        } else {
            alvo = texto
        }
        copiar(alvo)
    }
    private func nomeCor(_ c: MarkColor) -> String {
        switch c {
        case .amarelo: return "Amarelo"; case .verde: return "Verde"; case .rosa: return "Rosa"
        case .azul: return "Azul"; case .laranja: return "Laranja"
        }
    }

    // MARK: - Anotações (texto rico)

    private var anotacaoCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "square.and.pencil").font(.system(size: 11, weight: .semibold))
                Text("MINHAS ANOTAÇÕES").font(.system(size: 10.5, weight: .bold)).tracking(1)
                Spacer()
                formatToolbar
            }
            .foregroundStyle(Palette.accent)

            RichTextEditor(initialData: store.note(for: entry.id),
                           controller: rtController,
                           baseFont: .serif(baseSize * 0.86),
                           textColor: NSColor(Palette.readingInk),
                           onChange: { data, empty in store.setNote(data, isEmpty: empty, for: entry.id) })
                .frame(minHeight: 108)
                .padding(4)
                .background(Palette.appBackground, in: RoundedRectangle(cornerRadius: 9))
                .overlay(RoundedRectangle(cornerRadius: 9).strokeBorder(Palette.accent.opacity(0.35), lineWidth: 1))
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.accent.opacity(0.06), in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Palette.accent.opacity(0.22), lineWidth: 1))
    }

    private var familiasInstaladas: [String] { NSFontManager.shared.availableFontFamilies.sorted() }

    private struct FonteOpc: Hashable { let nome: String; let familia: String? }
    private let fontesAnotacao: [FonteOpc] = [
        .init(nome: "Sistema", familia: nil),
        .init(nome: "Serifa (Georgia)", familia: "Georgia"),
        .init(nome: "Palatino", familia: "Palatino"),
        .init(nome: "Sans (Helvetica)", familia: "Helvetica Neue"),
        .init(nome: "Manuscrita", familia: "Noteworthy"),
        .init(nome: "Máquina de escrever", familia: "American Typewriter"),
        .init(nome: "Monoespaçada", familia: "Menlo"),
    ]
    private let gruposSimbolos: [(String, [String])] = [
        ("Ícones de estudo", ["📌", "⭐️", "❗️", "✅", "❌", "⚖️", "📖", "🔖", "💡", "📝", "🧠", "🔥", "⏰", "🔴", "🟡", "🟢"]),
        ("Jurídicos", ["§", "§§", "¶", "nº", "art.", "inc.", "alínea", "c/c", "⚖"]),
        ("Setas", ["→", "⇒", "↔", "⬅", "↳", "»"]),
        ("Marcadores", ["✓", "✗", "★", "⚠", "⚡", "•", "‣", "☞", "✎"]),
        ("Pontuação", ["—", "–", "«", "»", "“", "”", "…", "º", "ª"]),
    ]

    private var formatToolbar: some View {
        HStack(spacing: 3) {
            fmtBtn("arrow.uturn.backward") { rtController.desfazer() }
            fmtBtn("arrow.uturn.forward") { rtController.refazer() }
            Divider().frame(height: 14)
            fmtBtn("bold") { rtController.toggleTrait(.boldFontMask, symbolic: .bold) }
            fmtBtn("italic") { rtController.toggleTrait(.italicFontMask, symbolic: .italic) }
            fmtBtn("underline") { rtController.toggleLineAttr(.underlineStyle) }
            fmtBtn("strikethrough") { rtController.toggleLineAttr(.strikethroughStyle) }
            fmtBtn("list.bullet") { rtController.toggleBullet() }

            // Alinhamento (paridade com a caixa do verbete)
            Menu {
                Button { rtController.setAlignment(.left) } label: { Label("À esquerda", systemImage: "text.alignleft") }
                Button { rtController.setAlignment(.center) } label: { Label("Centralizado", systemImage: "text.aligncenter") }
                Button { rtController.setAlignment(.right) } label: { Label("À direita", systemImage: "text.alignright") }
                Button { rtController.setAlignment(.justified) } label: { Label("Justificado", systemImage: "text.justify") }
            } label: { Image(systemName: "text.alignleft") }
            .menuIndicator(.hidden).frame(width: 22)
            .help("Alinhamento do parágrafo")

            // Fonte de letra + tamanho
            Menu {
                Section("Fonte de letra") {
                    ForEach(fontesAnotacao, id: \.self) { f in
                        Button(f.nome) { rtController.setFontFamily(f.familia) }
                    }
                    Menu("Todas as fontes instaladas…") {
                        ForEach(familiasInstaladas, id: \.self) { fam in
                            Button(fam) { rtController.setFontFamily(fam) }
                        }
                    }
                }
                Section("Tamanho") {
                    Button { rtController.mudarTamanho(2) } label: { Label("Aumentar", systemImage: "textformat.size.larger") }
                    Button { rtController.mudarTamanho(-2) } label: { Label("Diminuir", systemImage: "textformat.size.smaller") }
                }
                Divider()
                Button {
                    rtController.limparFormatacao(baseFont: .serif(baseSize * 0.86), cor: NSColor(Palette.readingInk))
                } label: { Label("Limpar formatação", systemImage: "eraser") }
            } label: { Image(systemName: "textformat") }
            .menuIndicator(.hidden).frame(width: 22)
            .help("Fonte e tamanho")

            // Cores: texto + marca-texto — infinitas + favoritas (paridade com o verbete)
            Menu {
                Section("Cor do texto") {
                    ForEach(store.coresFavoritas, id: \.self) { hex in
                        Button { rtController.setForeground(NSColor(Color(hex: hex))) } label: { Label { Text(hex.uppercased()) } icon: { corSwatch(hex) } }
                    }
                    Button { rtController.setForeground(NSColor(Palette.readingInk)) } label: { Label("Padrão", systemImage: "circle") }
                    ColorPicker("Cor personalizada…", selection: $corTextoAnot, supportsOpacity: false)
                    Button { store.adicionarCorFavorita(corTextoAnot.hexString) } label: { Label("Salvar cor nos favoritos", systemImage: "plus.circle") }
                }
                Section("Marca-texto") {
                    ForEach(store.coresFavoritas, id: \.self) { hex in
                        Button { rtController.setHighlight(NSColor(Color(hex: hex)).withAlphaComponent(0.45)) } label: { Label { Text(hex.uppercased()) } icon: { corSwatch(hex) } }
                    }
                    Button { rtController.setHighlight(nil) } label: { Label("Remover realce", systemImage: "xmark") }
                    ColorPicker("Realce personalizado…", selection: $corRealceAnot, supportsOpacity: false)
                    Button { store.adicionarCorFavorita(corRealceAnot.hexString) } label: { Label("Salvar cor nos favoritos", systemImage: "plus.circle") }
                }
            } label: { Image(systemName: "paintpalette") }
            .menuIndicator(.hidden).frame(width: 22)
            .help("Cor do texto e marca-texto (cores infinitas + favoritas)")
            .onChange(of: corTextoAnot) { _, nova in rtController.setForeground(NSColor(nova)) }
            .onChange(of: corRealceAnot) { _, nova in rtController.setHighlight(NSColor(nova).withAlphaComponent(0.45)) }

            // Ícones de estudo (emoji) — atalho dedicado e visível
            Menu {
                ForEach(gruposSimbolos.first!.1, id: \.self) { s in
                    Button(s) { rtController.inserir(s) }
                }
            } label: { Image(systemName: "face.smiling") }
            .menuIndicator(.hidden).frame(width: 22)
            .help("Inserir ícone de estudo")

            // Símbolos jurídicos e pontuação
            Menu {
                ForEach(gruposSimbolos.dropFirst(), id: \.0) { grupo in
                    Section(grupo.0) {
                        ForEach(grupo.1, id: \.self) { s in
                            Button(s) { rtController.inserir(s) }
                        }
                    }
                }
            } label: { Image(systemName: "number.square") }
            .menuIndicator(.hidden).frame(width: 22)
            .help("Inserir símbolo jurídico")

            // Grifador dedicado (paridade com a caixa do verbete)
            Menu {
                ForEach(store.coresFavoritas, id: \.self) { hex in
                    Button { rtController.setHighlight(NSColor(Color(hex: hex)).withAlphaComponent(0.45)) } label: {
                        Label { Text(hex.uppercased()) } icon: { corSwatch(hex) }
                    }
                }
                ColorPicker("Cor personalizada…", selection: $corRealceAnot, supportsOpacity: false)
                Button { store.adicionarCorFavorita(corRealceAnot.hexString) } label: { Label("Salvar cor nos favoritos", systemImage: "plus.circle") }
                Divider()
                Button { rtController.setHighlight(nil) } label: { Label("Remover realce", systemImage: "xmark") }
            } label: { Image(systemName: "highlighter") }
            .menuIndicator(.hidden).frame(width: 22)
            .help("Grifar (cores infinitas + favoritas)")

            // Borracha: limpa a formatação do trecho (paridade com o verbete)
            fmtBtn("eraser") {
                rtController.limparFormatacao(baseFont: .serif(baseSize * 0.86), cor: NSColor(Palette.readingInk))
            }
        }
        .buttonStyle(.plain)
        .font(.system(size: 12))
        .foregroundStyle(Palette.accent)
    }

    private func fmtBtn(_ icon: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon).frame(width: 22, height: 20).contentShape(Rectangle())
        }
    }

    // MARK: - Metadados

    @ViewBuilder
    private var metadata: some View {
        let rows = metaRows
        if !rows.isEmpty {
            VStack(alignment: .leading, spacing: 11) {
                SectionRule(titulo: "Ficha")
                ForEach(rows, id: \.rotulo) { r in
                    MetaRow(icone: r.icone, rotulo: r.rotulo, valor: r.valor)
                }
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.cardBackground.opacity(0.55), in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Palette.hairline, lineWidth: 1))
        }
    }

    private struct Meta { let icone, rotulo, valor: String }
    private var metaRows: [Meta] {
        var r: [Meta] = []
        if let v = entry.ramoDireito { r.append(.init(icone: "bookmark.fill", rotulo: "Ramo do Direito", valor: v)) }
        r.append(.init(icone: "building.columns", rotulo: "Tribunal", valor: entry.tribunal))
        if let v = entry.orgaoJulgador { r.append(.init(icone: "person.3", rotulo: "Órgão julgador", valor: v)) }
        if let v = entry.data { r.append(.init(icone: "calendar", rotulo: "Data", valor: v)) }
        if let v = entry.fontePublicacao { r.append(.init(icone: "doc.text", rotulo: "Publicação", valor: v)) }
        return r
    }

    private func disclosure(_ titulo: String, _ icone: String, _ texto: String) -> some View {
        DisclosureGroup {
            Text(texto)
                .font(Typo.serifBody(baseSize * 0.85))
                .foregroundStyle(Palette.bodyInk)
                .lineSpacing(baseSize * 0.28)
                .textSelection(.enabled)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.top, 10)
        } label: {
            Label(titulo, systemImage: icone)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Palette.accent)
        }
        .tint(Palette.accent)
        .padding(16)
        .background(Palette.cardBackground.opacity(0.45), in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Palette.hairline, lineWidth: 1))
    }

    @ViewBuilder
    private var relacionadosSection: some View {
        let rel = store.relacionados(entry)
        if !rel.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                SectionRule(titulo: "Julgados relacionados")
                ForEach(rel) { r in
                    Button { if store.leituraID != nil { store.lerCheio(r.id) } else { store.selectedID = r.id } } label: {
                        HStack(alignment: .top, spacing: 10) {
                            RoundedRectangle(cornerRadius: 2).fill(r.fonteKind.cor).frame(width: 3)
                            VStack(alignment: .leading, spacing: 3) {
                                HStack(spacing: 6) {
                                    FonteBadge(fonte: r.fonteKind, compact: true)
                                    Text(r.titulo).font(.system(size: 12.5, weight: .semibold))
                                        .foregroundStyle(Palette.titleInk).lineLimit(1)
                                }
                                Text(r.enunciado).font(Typo.serifBody(11.5))
                                    .foregroundStyle(Palette.bodyInk.opacity(0.85))
                                    .lineLimit(2).fixedSize(horizontal: false, vertical: true)
                            }
                            Spacer(minLength: 0)
                            Image(systemName: "chevron.right").font(.system(size: 9, weight: .semibold))
                                .foregroundStyle(.tertiary)
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    if r.id != rel.last?.id { Divider().overlay(Palette.hairline) }
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.cardBackground.opacity(0.45), in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Palette.hairline, lineWidth: 1))
        }
    }

    @ViewBuilder
    private var footer: some View {
        if let url = entry.fonteOficialURL {
            Link(destination: url) {
                Label(entry.fonteOficialLabel, systemImage: "arrow.up.forward.square")
                    .font(.system(size: 12, weight: .semibold))
            }
            .buttonStyle(.plain)
            .foregroundStyle(Palette.accent)
            .help(url.absoluteString)
        }
    }

    // MARK: - Barra de ferramentas do verbete (estilo Books: cápsulas de ícone)

    // Cápsula de ícone da barra (com chevron opcional para os menus).
    private func capsIcon(_ icone: String, tint: Color = Palette.secondaryInk, chevron: Bool = false) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icone).font(.system(size: 12.5, weight: .medium))
            if chevron { Image(systemName: "chevron.down").font(.system(size: 7, weight: .bold)) }
        }
        .foregroundStyle(tint)
        .padding(.horizontal, 11).padding(.vertical, 7)
        .background(Palette.elevated, in: Capsule())
        .overlay(Capsule().strokeBorder(Palette.hairline, lineWidth: 1))
    }

    private var entryToolbar: some View {
        HStack(spacing: 6) {
            Spacer(minLength: 0)

            // ── Marcar: favoritar / importante / lido ──
            Button { store.toggleFavorite(entry.id) } label: {
                capsIcon(store.isFavorite(entry.id) ? "star.fill" : "star",
                         tint: store.isFavorite(entry.id) ? .yellow : Palette.secondaryInk)
            }
            .buttonStyle(.plain)
            .help(store.isFavorite(entry.id) ? "Nos favoritos" : "Favoritar")

            Button { store.toggleImportante(entry) } label: {
                capsIcon((store.isImportante(entry) || entry.importante) ? "flag.fill" : "flag",
                         tint: (store.isImportante(entry) || entry.importante) ? .orange : Palette.secondaryInk)
            }
            .buttonStyle(.plain)
            .disabled(entry.importante)
            .help(entry.importante ? "Marcado como importante pelo material" : "Marcar como importante")

            Button { store.toggleLido(entry.id) } label: {
                capsIcon(store.isLido(entry.id) ? "checkmark.circle.fill" : "checkmark.circle",
                         tint: store.isLido(entry.id) ? Palette.accent : Palette.secondaryInk)
            }
            .buttonStyle(.plain)
            .help(store.isLido(entry.id) ? "Lido — clique para desmarcar" : "Marcar como lido")

            // ── Estudar: coleções / flashcard ──
            Menu {
                Section("Coleções (Meu edital)") {
                    ForEach(store.colecoes) { c in
                        Button { store.toggleNaColecao(entry.id, c.id) } label: {
                            Label(c.nome, systemImage: store.estaNaColecao(entry.id, c.id) ? "checkmark" : "")
                        }
                    }
                }
                Button { mostrarNovaColecao = true } label: { Label("Nova coleção…", systemImage: "folder.badge.plus") }
            } label: {
                capsIcon(store.colecoesDe(entry.id).isEmpty ? "folder.badge.plus" : "folder.fill",
                         tint: store.colecoesDe(entry.id).isEmpty ? Palette.secondaryInk : Palette.accent,
                         chevron: true)
            }
            .menuStyle(.borderlessButton).menuIndicator(.hidden).fixedSize()
            .help("Adicionar a uma coleção (Meu edital)")

            Menu {
                if store.srsHasCard(entry.id) {
                    Label("No baralho de revisão", systemImage: "checkmark.seal.fill")
                    Button { mostrarRevisao = true } label: { Label("Revisar agora", systemImage: "brain.head.profile") }
                    Button(role: .destructive) { store.srsRemove(entry.id) } label: { Label("Remover do baralho", systemImage: "trash") }
                } else {
                    Button { store.srsAddCard(entry) } label: { Label("Automático (melhor lacuna)", systemImage: "wand.and.stars") }
                    Divider()
                    ForEach(FlashStyle.allCases) { s in
                        Button { store.srsAddCard(entry, style: s) } label: { Label(s.label, systemImage: s.simbolo) }
                    }
                }
            } label: {
                capsIcon(store.srsHasCard(entry.id) ? "menucard.fill" : "menucard",
                         tint: store.srsHasCard(entry.id) ? Palette.accent : Palette.secondaryInk,
                         chevron: true)
            }
            .menuStyle(.borderlessButton).menuIndicator(.hidden).fixedSize()
            .help(store.srsHasCard(entry.id) ? "Já está no baralho de revisão" : "Criar flashcard deste verbete")

            // ── Ferramentas: analisar com IA / compartilhar ──
            Menu {
                Button { mostrarComparador = true } label: { Label("Comparar STF × STJ (com IA)", systemImage: "sparkles") }
                Button { mostrarMapa = true } label: { Label("Mapa mental / fluxograma…", systemImage: "brain.head.profile") }
                Button { mostrarLinhaTempo = true } label: { Label("Linha do tempo do tema", systemImage: "clock.arrow.circlepath") }
            } label: { capsIcon("rectangle.split.2x1", chevron: true) }
            .menuStyle(.borderlessButton).menuIndicator(.hidden).fixedSize()
            .help("Comparar STF × STJ (com IA), mapa mental e linha do tempo")

            Menu {
                Button { copiar(entry.enunciado) } label: { Label("Copiar enunciado", systemImage: "doc.on.doc") }
                Button { copiar(entry.citacao) } label: { Label("Copiar citação", systemImage: "quote.opening") }
                Divider()
                Button { exportar(.pdf) } label: { Label("Exportar como PDF", systemImage: "doc.richtext") }
                Button { exportar(.png) } label: { Label("Exportar como imagem", systemImage: "photo") }
                Button { mostrarAnki = true } label: { Label("Exportar para o Anki…", systemImage: "rectangle.on.rectangle") }
            } label: { capsIcon(copiado ? "checkmark" : "square.and.arrow.up", chevron: true) }
            .menuStyle(.borderlessButton).menuIndicator(.hidden).fixedSize()
            .help("Copiar, exportar em PDF/imagem ou para o Anki")

            // ── Leitura: tamanho do texto ──
            Menu {
                Button { readingScale = min(readingScale + 0.1, 1.8) } label: { Label("Aumentar texto", systemImage: "textformat.size.larger") }
                Button { readingScale = max(readingScale - 0.1, 0.8) } label: { Label("Diminuir texto", systemImage: "textformat.size.smaller") }
                Button { readingScale = 1.0 } label: { Label("Tamanho padrão", systemImage: "arrow.counterclockwise") }
            } label: { capsIcon("textformat.size", chevron: true) }
            .menuStyle(.borderlessButton).menuIndicator(.hidden).fixedSize()
            .help("Tamanho do texto de leitura")
        }
        .padding(.horizontal, 14).padding(.vertical, 7)
        .background(Palette.sidebarBackground)
        .overlay(alignment: .bottom) { Rectangle().fill(Palette.hairline).frame(height: 1) }
    }

    private func copiar(_ s: String) {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(s, forType: .string)
        copiado = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { copiado = false }
    }

    private enum ExportTipo { case pdf, png }
    private func exportar(_ t: ExportTipo) {
        let base = entry.titulo.replacingOccurrences(of: " ", with: "_")
            .replacingOccurrences(of: "/", with: "-")
        switch t {
        case .pdf:
            if let d = Exporter.pdf(entry) { Exporter.salvar(nome: "\(base).pdf", tipo: .pdf, dados: d) }
        case .png:
            if let d = Exporter.png(entry) { Exporter.salvar(nome: "\(base).png", tipo: .png, dados: d) }
        }
    }
}

/// Estado vazio do painel de detalhe — brasão premium.
struct DetailPlaceholder: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "books.vertical")
                .font(.system(size: 42, weight: .thin))
                .foregroundStyle(Palette.accent.opacity(0.7))
            VStack(spacing: 5) {
                Text("Vade Mecum de Jurisprudência")
                    .font(Typo.serifTitle(19, .semibold))
                    .foregroundStyle(Palette.titleInk)
                Text("Escolha uma súmula, tese, informativo ou repercussão geral\npara ler o inteiro teor.")
                    .font(.system(size: 12.5))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Palette.secondaryInk)
            }
            Rectangle().fill(Palette.accent).frame(width: 40, height: 2).padding(.top, 4)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.detailBackground)
    }
}
