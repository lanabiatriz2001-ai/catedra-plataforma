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

    private func cor(_ trilha: String) -> Color {
        switch trilha {
        case "STJ": return Color(red: 0.05, green: 0.58, blue: 0.53)   // teal
        case "TSE": return Color(red: 0.49, green: 0.36, blue: 0.86)   // roxo
        default:    return Color(red: 0.28, green: 0.42, blue: 0.92)   // azul (STF / SV)
        }
    }
    private var frac: Double {
        JurisPlano.totalDias == 0 ? 0 : Double(lidos.count) / Double(JurisPlano.totalDias)
    }

    var body: some View {
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
        .background(Palette.appBackground)
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text("PLANO DE LEITURA").font(.system(size: 11, weight: .heavy)).tracking(1.5)
                    .foregroundStyle(Palette.accent)
                Text("Súmulas — STF, STJ e TSE").font(Typo.serifTitle(24)).foregroundStyle(Palette.titleInk)
                Text("\(JurisPlano.totalDias) dias · \(JurisPlano.totalSumulas) súmulas · no seu roteiro")
                    .font(.system(size: 12)).foregroundStyle(Palette.secondaryInk)
            }
            Spacer(minLength: 12)
            ZStack {
                Circle().stroke(Palette.hairline, lineWidth: 7).frame(width: 66, height: 66)
                Circle().trim(from: 0, to: frac)
                    .stroke(Palette.accent, style: StrokeStyle(lineWidth: 7, lineCap: .round))
                    .rotationEffect(.degrees(-90)).frame(width: 66, height: 66)
                VStack(spacing: 0) {
                    Text("\(lidos.count)").font(.system(size: 18, weight: .heavy)).foregroundStyle(Palette.titleInk)
                    Text("/\(JurisPlano.totalDias)").font(.system(size: 9)).foregroundStyle(Palette.secondaryInk)
                }
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Palette.hairline, lineWidth: 1))
    }

    private func trilhaBloco(_ trilha: String, _ dias: [JurisPlanoDia]) -> some View {
        let c = cor(trilha)
        let feitos = dias.filter { lidos.contains($0.dia) }.count
        return VStack(alignment: .leading, spacing: 7) {
            HStack(spacing: 10) {
                RoundedRectangle(cornerRadius: 3).fill(c).frame(width: 5, height: 20)
                Text("Súmulas \(trilha)").font(Typo.serifTitle(17)).foregroundStyle(Palette.titleInk)
                Text("\(feitos)/\(dias.count) dias").font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Palette.secondaryInk)
                Spacer(minLength: 0)
            }
            .padding(.top, 6)
            ForEach(dias) { d in diaRow(d, c) }
        }
    }

    private func diaRow(_ d: JurisPlanoDia, _ c: Color) -> some View {
        let lido = lidos.contains(d.dia)
        return HStack(spacing: 12) {
            Button {
                if lido { lidos.remove(d.dia); JurisPlanoStore.setLido(d.dia, false) }
                else { lidos.insert(d.dia); JurisPlanoStore.setLido(d.dia, true) }
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
        .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 11))
        .overlay(RoundedRectangle(cornerRadius: 11).strokeBorder(Palette.hairline, lineWidth: 1))
    }
}
