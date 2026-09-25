import SwiftUI

/// O topo do destino Hoje (spec §7): "Continuar: <norma ou verbete>, <dispositivo>" em
/// display — um toque volta exatamente para onde a pessoa parou.
struct CartaoContinuar: View {
    let titulo: String
    let detalhe: String?
    /// Cor de identidade do ramo/tribunal; nil = acento do tema.
    let cor: UInt32?
    let acao: () -> Void

    var body: some View {
        let tinta = cor.map { DS.cor($0) } ?? ThemeState.t.accent
        Button(action: acao) {
            HStack(alignment: .center, spacing: DSEspaco.e4) {
                VStack(alignment: .leading, spacing: DSEspaco.e1) {
                    Text("CONTINUAR").font(DS.interface(12, .semibold)).tracking(1)
                        .foregroundStyle(cor.map { DS.corTexto($0) } ?? ThemeState.t.accent)
                    Text(titulo).font(DS.display(DSTipo.display.rawValue, .bold)).foregroundStyle(ThemeState.t.ink)
                        .lineLimit(2).multilineTextAlignment(.leading)
                    if let d = detalhe, !d.isEmpty {
                        Text(d).font(DS.display(19, .regular)).foregroundStyle(ThemeState.t.text2).lineLimit(1)
                    }
                }
                Spacer(minLength: DSEspaco.e3)
                Image(systemName: "arrow.right.circle.fill").font(DS.interface(34)).foregroundStyle(tinta)
            }
            .padding(DSEspaco.e5)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: DSRaio.hero, style: .continuous)
                    .fill(LinearGradient(colors: [tinta.opacity(0.18), ThemeState.t.surface],
                                         startPoint: .leading, endPoint: .trailing))
            )
            .overlay(RoundedRectangle(cornerRadius: DSRaio.hero, style: .continuous)
                .strokeBorder(tinta.opacity(0.38), lineWidth: 1))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Continuar: \(titulo)\(detalhe.map { ", \($0)" } ?? "")")
    }
}

/// Ordem de AUTORIDADE das fontes do JURIS (spec §7): vinculante → controle concentrado →
/// precedente qualificado → súmulas → teses/informativos → estaduais → contas → apoio.
/// Recebe o rawValue de `Fonte` (JurisEntry) — mora na base para ser testável.
enum OrdemAutoridade {
    static let ordem: [String] = [
        "sumula_vinculante",
        "stf_adi", "stf_adc", "stf_ado", "stf_adpf", "controle_const",
        "repercussao_geral", "repetitivo", "precedentes_obrig",
        "sumula_stf", "sumula_stj", "sumula_tse",
        "juris_em_teses", "informativo_stf", "informativo_stj", "informativo_tse",
        "tjro", "tjro_prec", "sel_tjgo", "sel_tjrj", "sel_tjpr",
        "sumula_tcu", "sumula_tce", "boletim_juris_tcu", "boletim_pessoal_tcu", "info_lic_tcu",
        "vademecum_dod",
    ]
    static func posicao(_ fonteRaw: String) -> Int { ordem.firstIndex(of: fonteRaw) ?? ordem.count }
}
