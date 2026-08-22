import SwiftUI

/// Persistência dos dias lidos do Plano de leitura de súmulas.
enum JurisPlanoStore {
    static let key = "juris.plano.done.v1"
    static func lidos() -> Set<Int> {
        Set((UserDefaults.standard.array(forKey: key) as? [Int]) ?? [])
    }
    static func setLido(_ dia: Int, _ on: Bool) {
        var s = lidos(); if on { s.insert(dia) } else { s.remove(dia) }
        UserDefaults.standard.set(Array(s), forKey: key)
    }
}

/// Plano de leitura de súmulas do JURIS — mesma experiência do "Plano de leitura"
/// do CátedraLEGIS, mas de súmulas (STF Vinculantes → TSE → STJ → STF), no roteiro
/// da usuária. Marca dia como lido + progresso.
struct PlanoLeituraJurisView: View {
    @State private var lidos: Set<Int> = JurisPlanoStore.lidos()

    /// Cor da trilha = cor do TRIBUNAL (Palette), não um RGB próprio.
    private func cor(_ trilha: String) -> Color {
        Palette.corDeTribunal(trilha == "STJ" || trilha == "TSE" ? trilha : "STF")
    }
    private var frac: Double {
        JurisPlano.totalDias == 0 ? 0 : Double(lidos.count) / Double(JurisPlano.totalDias)
    }

    var body: some View {
        SectionShell(icon: Selecao.plano.simbolo, title: Selecao.plano.titulo,
                     subtitle: "Súmulas — STF, STJ e TSE · \(JurisPlano.totalDias) dias · \(JurisPlano.totalSumulas) súmulas no seu roteiro",
                     count: JurisPlano.totalDias) {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    header
                    ForEach(Array(JurisPlano.porTrilha.enumerated()), id: \.offset) { _, g in
                        trilhaBloco(g.trilha, g.dias)
                    }
                    Color.clear.frame(height: 28)
                }
                .padding(24)
                .frame(maxWidth: 900, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        // Relê ao voltar: se o dia foi marcado em outro aparelho/pela web, reflete sem reabrir o app.
        .onAppear { lidos = JurisPlanoStore.lidos() }
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 16) {
            ChecklistRing(frac: frac, stops: [Palette.accent, Palette.accentSoft], size: 66, line: 8,
                          center: "\(Int((frac * 100).rounded()))%")
            VStack(alignment: .leading, spacing: 4) {
                Text("\(lidos.count) de \(JurisPlano.totalDias) dias lidos")
                    .font(.system(size: 15, weight: .bold)).foregroundStyle(Palette.titleInk)
                Text("Marque o dia ao terminar a faixa — o registro vai para o Cátedra.")
                    .font(.system(size: 12)).foregroundStyle(Palette.secondaryInk)
            }
            Spacer(minLength: 12)
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).strokeBorder(Palette.hairline, lineWidth: 1))
    }

    private func trilhaBloco(_ trilha: String, _ dias: [JurisPlanoDia]) -> some View {
        let c = cor(trilha)
        let feitos = dias.filter { lidos.contains($0.dia) }.count
        return VStack(alignment: .leading, spacing: 7) {
            JurisSecaoTitulo(titulo: "Súmulas \(trilha)", simbolo: "building.columns.fill", cor: c, count: feitos)
                .padding(.top, 6)
            ForEach(dias) { d in diaRow(d, c) }
        }
    }

    private func diaRow(_ d: JurisPlanoDia, _ c: Color) -> some View {
        let lido = lidos.contains(d.dia)
        return HStack(spacing: 12) {
            Button {
                if lido { lidos.remove(d.dia); JurisPlanoStore.setLido(d.dia, false) }
                else {
                    lidos.insert(d.dia); JurisPlanoStore.setLido(d.dia, true)
                    // Concluiu o dia → o host abre o registro do Cátedra pré-preenchido.
                    NotificationCenter.default.post(name: Notification.Name("catedraPlanoJurisMarcado"), object: nil,
                                                    userInfo: ["dia": d.dia, "faixa": d.faixa, "trilha": d.trilha])
                }
            } label: {
                Image(systemName: lido ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 18)).foregroundStyle(lido ? c : Palette.secondaryInk.opacity(0.55))
            }
            .buttonStyle(.plain)
            Text("Dia \(d.dia)").font(.system(size: 11, weight: .bold)).foregroundStyle(c)
                .padding(.horizontal, 9).padding(.vertical, 3)
                .background(Capsule().fill(c.opacity(0.14)))
            Text("Súmulas \(d.faixa)").font(.system(size: 13.5))
                .foregroundStyle(lido ? Palette.secondaryInk : Palette.bodyInk)
                .strikethrough(lido, color: Palette.secondaryInk)
            Spacer(minLength: 8)
            Text("\(d.qtd)").font(.system(size: 11, weight: .semibold).monospacedDigit())
                .foregroundStyle(Palette.secondaryInk)
                .help("\(d.qtd) súmulas")
        }
        .padding(.horizontal, 13).padding(.vertical, 9)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous).strokeBorder(Palette.hairline, lineWidth: 1))
    }
}
