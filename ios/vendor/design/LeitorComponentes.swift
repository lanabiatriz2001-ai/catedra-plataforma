import SwiftUI

/// Os dois modos do leitor da norma. Os valores são os de `@AppStorage("readerMode")`, que já
/// existia ("corrido"/"estudo"): nada novo é persistido.
enum ModoLeitor: String { case ler = "corrido", estudar = "estudo" }

/// Barra do leitor (spec §5): no MÁXIMO 5 controles, por construção — voltar · onde estou ·
/// Ler/Estudar · Aa · ⋯. Tudo o que é raro vai para `mais`.
struct BarraLeitor<Aa: View, Mais: View>: View {
    let ramo: String
    let corRamo: UInt32?
    let titulo: String
    var modo: Binding<ModoLeitor>?
    var aoVoltar: (() -> Void)?
    @ViewBuilder var aa: () -> Aa
    @ViewBuilder var mais: () -> Mais

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: DSEspaco.e3) {
                voltar
                identificacao.frame(minWidth: 160, idealWidth: 200, maxWidth: .infinity, alignment: .leading)
                ferramentas
            }
            VStack(alignment: .leading, spacing: DSEspaco.e1) {
                HStack(spacing: DSEspaco.e2) { voltar; identificacao }
                HStack(spacing: DSEspaco.e2) { ferramentas }
            }
        }
        .padding(.horizontal, DSEspaco.e4)
        .padding(.vertical, DSEspaco.e2)
        .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
        .background(ThemeState.t.surface)
        .overlay(Rectangle().fill(ThemeState.t.border).frame(height: 1), alignment: .bottom)
    }

    @ViewBuilder private var voltar: some View {
        if let aoVoltar {
            Button(action: aoVoltar) {
                Image(systemName: "chevron.left").font(DS.tipo(.corpo, .semibold))
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Voltar")
        }
    }

    private var identificacao: some View {
        VStack(alignment: .leading, spacing: DSEspaco.e1) {
            if !ramo.isEmpty {
                HStack(spacing: DSEspaco.e2) {
                    if let corRamo {
                        Circle().fill(DS.cor(corRamo)).frame(width: DSEspaco.e2, height: DSEspaco.e2)
                            .accessibilityHidden(true)
                    }
                    Text(ramo).font(DS.tipo(.micro, .semibold))
                        .foregroundStyle(corRamo.map { DS.corTexto($0) } ?? ThemeState.t.text2)
                        .lineLimit(1)
                }
            }
            Text(titulo).font(DS.tipo(.titulo, .bold))
                .foregroundStyle(ThemeState.t.ink)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isHeader)
    }

    @ViewBuilder private var ferramentas: some View {
        if let modo {
            Picker("Modo", selection: modo) {
                Text("Ler").tag(ModoLeitor.ler)
                Text("Estudar").tag(ModoLeitor.estudar)
            }
            .pickerStyle(.segmented).labelsHidden().frame(idealWidth: 150, maxWidth: 170)
                .fixedSize(horizontal: true, vertical: false)
        }
        aa()
        mais()
    }
}

/// Gaveta de contexto que sobe de baixo (spec §5, opção C). Três alturas (`AlturaGaveta`),
/// arrasto pelo puxador, Esc fecha. Só FONTE PRIMÁRIA entra no conteúdo — quem monta decide.
struct GavetaContexto<Conteudo: View>: View {
    @Binding var altura: AlturaGaveta
    let titulo: String
    let subtitulo: String
    let abas: [String]
    @Binding var aba: Int
    let compacto: Bool
    @ViewBuilder var conteudo: () -> Conteudo
    @Environment(\.accessibilityReduceMotion) private var reduzirMovimento
    @GestureState private var arrasto: CGFloat = 0

    var body: some View {
        GeometryReader { geo in
            let alvo = geo.size.height * altura.fracao(compacto: compacto)
            VStack(spacing: 0) {
                Capsule().fill(ThemeState.t.border).frame(width: 44, height: 5)
                    .padding(.top, DSEspaco.e2).padding(.bottom, DSEspaco.e3)
                    .frame(maxWidth: .infinity).frame(minHeight: 44).contentShape(Rectangle())
                    .gesture(DragGesture()
                        .updating($arrasto) { v, s, _ in s = v.translation.height }
                        .onEnded { v in altura = altura.apos(arrasto: v.translation.height) })
                    .accessibilityElement()
                    .accessibilityLabel("Altura da gaveta")
                    .accessibilityValue(altura == .cheia || compacto ? "Tela inteira" : "Meia tela")
                    .accessibilityAdjustableAction { direcao in
                        switch direcao {
                        case .increment: altura = .cheia
                        case .decrement: altura = compacto || altura == .meia ? .fechada : .meia
                        @unknown default: break
                        }
                    }
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(subtitulo.uppercased()).font(DS.interface(11, .semibold)).tracking(0.8)
                            .foregroundStyle(ThemeState.t.text3)
                        Text(titulo).font(DS.display(19, .bold)).foregroundStyle(ThemeState.t.ink)
                    }
                    Spacer()
                    Button { altura = .fechada } label: {
                        Image(systemName: "xmark").font(DS.tipo(.corpo, .semibold))
                            .frame(minWidth: 44, minHeight: 44)
                            .background(Circle().fill(ThemeState.t.surface2))
                            .contentShape(Rectangle())
                    }
                        .buttonStyle(.plain)
                        .keyboardShortcut(.escape, modifiers: [])
                        .accessibilityLabel("Fechar")
                }
                .padding(.horizontal, DSEspaco.e5)
                if abas.count > 1 {
                    Picker("Aba", selection: $aba) {
                        ForEach(abas.indices, id: \.self) { i in Text(abas[i]).tag(i) }
                    }
                    .pickerStyle(.segmented).labelsHidden()
                    .padding(.horizontal, DSEspaco.e5).padding(.vertical, DSEspaco.e3)
                }
                ScrollView { conteudo().padding(.horizontal, DSEspaco.e5).padding(.bottom, DSEspaco.e5) }
            }
            .frame(maxWidth: compacto ? .infinity : 760)
            .frame(height: max(0, alvo - arrasto))
            .background(
                UnevenRoundedRectangle(topLeadingRadius: DSRaio.hero, topTrailingRadius: DSRaio.hero)
                    .fill(ThemeState.t.surface)
                    .shadow(color: ThemeState.t.ink.opacity(0.18), radius: 20, y: -6)
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
            .animation((reduzirMovimento || ThemeState.t.baixaEstimulacao) ? nil : .spring(duration: 0.28), value: altura)
        }
        .allowsHitTesting(altura != .fechada)
    }
}
