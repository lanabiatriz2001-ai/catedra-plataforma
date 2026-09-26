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
        HStack(spacing: DSEspaco.e3) {
            if let aoVoltar {
                Button(action: aoVoltar) { Image(systemName: "chevron.left").font(DS.interface(15, .semibold)) }
                    .buttonStyle(.plain).frame(minWidth: 44, minHeight: 44).contentShape(Rectangle())
                    .accessibilityLabel("Voltar")
            }
            VStack(alignment: .leading, spacing: 1) {
                if !ramo.isEmpty {
                    Text(ramo.uppercased()).font(DS.interface(11, .semibold)).tracking(0.8)
                        .foregroundStyle(corRamo.map { DS.corTexto($0) } ?? ThemeState.t.text3)
                        .lineLimit(1)
                }
                Text(titulo).font(DS.display(19, .bold)).foregroundStyle(ThemeState.t.ink).lineLimit(1)
            }
            Spacer(minLength: DSEspaco.e2)
            if let modo {
                Picker("Modo", selection: modo) {
                    Text("Ler").tag(ModoLeitor.ler)
                    Text("Estudar").tag(ModoLeitor.estudar)
                }
                .pickerStyle(.segmented).labelsHidden().frame(width: 170)
            }
            aa()
            mais()
        }
        .padding(.horizontal, DSEspaco.e4)
        .frame(minHeight: 56)
        .background(ThemeState.t.surface)
        .overlay(Rectangle().fill(ThemeState.t.border).frame(height: 1), alignment: .bottom)
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
    @GestureState private var arrasto: CGFloat = 0

    var body: some View {
        GeometryReader { geo in
            let alvo = geo.size.height * altura.fracao(compacto: compacto)
            VStack(spacing: 0) {
                Capsule().fill(ThemeState.t.border).frame(width: 44, height: 5)
                    .padding(.top, DSEspaco.e2).padding(.bottom, DSEspaco.e3)
                    .frame(maxWidth: .infinity).frame(minHeight: 28).contentShape(Rectangle())
                    .gesture(DragGesture()
                        .updating($arrasto) { v, s, _ in s = v.translation.height }
                        .onEnded { v in altura = altura.apos(arrasto: v.translation.height) })
                    .accessibilityLabel("Puxador da gaveta")
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(subtitulo.uppercased()).font(DS.interface(11, .semibold)).tracking(0.8)
                            .foregroundStyle(ThemeState.t.text3)
                        Text(titulo).font(DS.display(19, .bold)).foregroundStyle(ThemeState.t.ink)
                    }
                    Spacer()
                    Button { altura = .fechada } label: { Image(systemName: "xmark").font(DS.interface(13, .semibold)) }
                        .buttonStyle(.plain).frame(minWidth: 44, minHeight: 44)
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
            .animation(ThemeState.t.baixaEstimulacao ? nil : .spring(duration: 0.28), value: altura)
        }
        .allowsHitTesting(altura != .fechada)
    }
}
