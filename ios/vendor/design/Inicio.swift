import SwiftUI

/// Peças do Início do Cátedra (host web, família `.cth-*`) portadas para o LEGIS/JURIS
/// nativos: a mesma composição da página inicial do app principal — próxima ação, hero
/// com saudação e chips, painel de vidro, números sobrepostos e o estudo semanal.

/// "Continuar …" — faixa da próxima ação (`[data-proxima-acao]` no host): borda tingida
/// da cor de destaque, título em serifa, pílula de meta e botão cheio.
struct FaixaProximaAcao: View {
    let titulo: String
    let motivo: String
    var meta: String? = nil
    let botao: String
    let acao: () -> Void
    var body: some View {
        let acc = ThemeState.t.accent
        ViewThatFits(in: .horizontal) {
            HStack(spacing: DSEspaco.e4) { textos; Spacer(minLength: DSEspaco.e3); pilula; botaoView }
            VStack(alignment: .leading, spacing: DSEspaco.e3) { textos; HStack { pilula; Spacer(); botaoView } }
        }
        .padding(.horizontal, DSEspaco.e5).padding(.vertical, DSEspaco.e4)
        .background(RoundedRectangle(cornerRadius: DSRaio.card, style: .continuous)
            .fill(LinearGradient(colors: [acc.opacity(0.07), ThemeState.t.surface], startPoint: .leading, endPoint: .trailing)))
        .overlay(RoundedRectangle(cornerRadius: DSRaio.card, style: .continuous).strokeBorder(acc.opacity(0.38), lineWidth: 1))
    }
    private var textos: some View {
        VStack(alignment: .leading, spacing: DSEspaco.e1) {
            Text(titulo).font(DS.display(26, .bold)).foregroundStyle(ThemeState.t.ink).lineLimit(2)
            Text(motivo).font(DS.interface(13)).foregroundStyle(ThemeState.t.text2).lineLimit(2)
        }
    }
    @ViewBuilder private var pilula: some View {
        if let m = meta, !m.isEmpty {
            Text(m).font(DS.interface(12, .bold)).foregroundStyle(ThemeState.t.text2)
                .padding(.horizontal, DSEspaco.e3).padding(.vertical, 5)
                .background(Capsule().fill(ThemeState.t.surface2))
                .overlay(Capsule().strokeBorder(ThemeState.t.border, lineWidth: 1))
        }
    }
    private var botaoView: some View {
        Button(action: acao) {
            Text(botao).font(DS.interface(14, .bold)).foregroundStyle(DS.sobreCor)
                .padding(.horizontal, DSEspaco.e5).frame(minHeight: 44)
                .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(ThemeState.t.accent))
        }
        .buttonStyle(.plain)
    }
}

/// Um chip do hero (`.cth-chip`): fundo escuro translúcido, ícone, número em mono.
struct ChipHero: Identifiable {
    let id = UUID()
    let simbolo: String
    let valor: String
    let rotulo: String
}

/// O hero do Início (`.cth-hero`): gradiente do tema com os dois círculos de luz, saudação
/// enorme em serifa, data, chips — e um painel de vidro escuro à direita.
struct HeroInicio<Painel: View>: View {
    let saudacao: String
    let subtitulo: String
    let chips: [ChipHero]
    @ViewBuilder let painel: () -> Painel

    static func saudacao(_ d: Date = Date()) -> String {
        let h = Calendar.current.component(.hour, from: d)
        return h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"
    }
    static func dataLonga(_ d: Date = Date()) -> String {
        let f = DateFormatter(); f.locale = Locale(identifier: "pt_BR"); f.dateFormat = "EEEE, d 'de' MMMM"
        let s = f.string(from: d); return s.prefix(1).uppercased() + s.dropFirst()
    }

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(alignment: .center, spacing: DSEspaco.e6) {
                manchete.frame(maxWidth: .infinity, alignment: .leading)
                vidro.frame(width: 360)
            }
            VStack(alignment: .leading, spacing: DSEspaco.e5) { manchete; vidro }
        }
        .padding(.horizontal, DSEspaco.e6).padding(.top, DSEspaco.e6).padding(.bottom, 64)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            ZStack(alignment: .topTrailing) {
                LinearGradient(colors: ThemeState.t.heroStops, startPoint: .topLeading, endPoint: .bottomTrailing)
                Circle().fill(DS.sobreCor.opacity(0.09)).frame(width: 230, height: 230).offset(x: 70, y: -70)
                Circle().fill(DS.sobreCor.opacity(0.05)).frame(width: 170, height: 170).offset(x: -70, y: 200)
            }
            .accessibilityHidden(true)
        )
        .clipShape(RoundedRectangle(cornerRadius: DSRaio.hero, style: .continuous))
        .shadow(color: ThemeState.t.accent.opacity(0.22), radius: 18, x: 0, y: 8)
    }

    private var manchete: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(saudacao).font(DS.display(50, .heavy)).tracking(-0.8).foregroundStyle(DS.sobreCor)
                .lineLimit(2).minimumScaleFactor(0.6)
            Text(subtitulo).font(DS.interface(15.5, .medium)).foregroundStyle(DS.sobreCor.opacity(0.88))
                .padding(.top, 9).lineLimit(2)
            HStack(spacing: 9) {
                ForEach(chips) { c in
                    HStack(spacing: 7) {
                        Image(systemName: c.simbolo).font(DS.interface(13, .semibold)).accessibilityHidden(true)
                        Text(c.valor).font(DS.mono(13, .bold))
                        Text(c.rotulo).font(DS.interface(13, .medium))
                    }
                    .foregroundStyle(DS.sobreCor)
                    .padding(.horizontal, 12).frame(minHeight: 34)
                    .background(Capsule().fill(Color.black.opacity(0.34)))
                    .overlay(Capsule().strokeBorder(DS.sobreCor.opacity(0.14), lineWidth: 1))
                    .accessibilityElement(children: .combine)
                }
            }
            .padding(.top, 16)
        }
    }

    private var vidro: some View {
        painel()
            .padding(DSEspaco.e5)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: DSRaio.card, style: .continuous).fill(Color.black.opacity(0.42)))
            .overlay(RoundedRectangle(cornerRadius: DSRaio.card, style: .continuous).strokeBorder(DS.sobreCor.opacity(0.14), lineWidth: 1))
    }
}

/// Rótulo + número grande do painel de vidro (`.cth-timer`), em branco.
struct PainelVidroNumero: View {
    let rotulo: String
    let valor: String
    let detalhe: String
    var body: some View {
        VStack(alignment: .leading, spacing: DSEspaco.e1) {
            Text(rotulo.uppercased()).font(DS.interface(11, .bold)).tracking(1.4).foregroundStyle(DS.sobreCor.opacity(0.75))
            Text(valor).font(DS.mono(44, .bold)).foregroundStyle(DS.sobreCor).lineLimit(1).minimumScaleFactor(0.6)
            Text(detalhe).font(DS.interface(13, .medium)).foregroundStyle(DS.sobreCor.opacity(0.8)).lineLimit(2)
        }
    }
}

/// Botão do painel de vidro: cheio em branco (`.cth-bstrong`) ou fantasma (`.cth-bghost`).
struct BotaoVidro: View {
    let titulo: String
    var forte: Bool = true
    let acao: () -> Void
    var body: some View {
        Button(action: acao) {
            Text(titulo).font(DS.interface(13.5, .bold))
                .foregroundStyle(forte ? Color.black.opacity(0.85) : DS.sobreCor)
                .padding(.horizontal, DSEspaco.e4).frame(minHeight: 44)
                .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(forte ? DS.sobreCor : Color.clear))
                .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(forte ? Color.clear : DS.sobreCor.opacity(0.32), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

/// Cartão de número sobreposto ao pé do hero (`.cth-kpi`): rótulo em versalete, valor em
/// mono grande, linha de apoio e barra no gradiente do tema.
struct CartaoNumeroInicio: View {
    let rotulo: String
    let valor: String
    var unidade: String = ""
    let apoio: String
    var fracao: Double? = nil
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(rotulo.uppercased()).font(DS.interface(11, .bold)).tracking(1.6).foregroundStyle(ThemeState.t.text3)
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(valor).font(DS.mono(34, .bold)).foregroundStyle(ThemeState.t.ink)
                if !unidade.isEmpty { Text(unidade).font(DS.mono(17, .semibold)).foregroundStyle(ThemeState.t.text2) }
            }
            .padding(.top, 7)
            Text(apoio).font(DS.interface(12.5)).foregroundStyle(ThemeState.t.text2).padding(.top, 8).lineLimit(2)
            if let f = fracao {
                GeometryReader { g in
                    ZStack(alignment: .leading) {
                        Capsule().fill(ThemeState.t.surface2)
                        Capsule().fill(LinearGradient(colors: ThemeState.t.heroStops, startPoint: .leading, endPoint: .trailing))
                            .frame(width: g.size.width * max(0, min(1, f)))
                    }
                }
                .frame(height: 7).padding(.top, 11)
            }
        }
        .padding(.horizontal, 20).padding(.top, 18).padding(.bottom, 16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: DSRaio.card, style: .continuous).fill(ThemeState.t.surface))
        .overlay(RoundedRectangle(cornerRadius: DSRaio.card, style: .continuous).strokeBorder(ThemeState.t.border, lineWidth: 1))
        .shadow(color: Color.black.opacity(0.08), radius: 14, x: 0, y: 8)
        .accessibilityElement(children: .combine)
    }
}

/// Título de seção do Início (`.cth-sec`): serifa, fio que some à direita e meta.
struct SecaoInicio: View {
    let titulo: String
    var meta: String = ""
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 14) {
            Text(titulo).font(DS.display(23, .bold)).foregroundStyle(ThemeState.t.ink)
                .accessibilityAddTraits(.isHeader)
            Rectangle().fill(LinearGradient(colors: [ThemeState.t.border, .clear], startPoint: .leading, endPoint: .trailing))
                .frame(height: 1).alignmentGuide(.firstTextBaseline) { d in d[.bottom] + 6 }
            if !meta.isEmpty { Text(meta).font(DS.interface(13)).foregroundStyle(ThemeState.t.text3).layoutPriority(1) }
        }
        .padding(.top, DSEspaco.e3)
    }
}

/// Estudo semanal (`.cth-bars`): os últimos 7 dias em barras, hoje na cor de destaque.
struct BarrasSemana: View {
    /// "aaaa-mm-dd" → quantidade (o formato de `activity` no LEGIS e `leiturasPorDia` no JURIS).
    let atividade: [String: Int]
    var agora: Date = Date()

    static func dias(_ a: [String: Int], agora: Date = Date()) -> [(rotulo: String, valor: Int, hoje: Bool)] {
        let cal = Calendar.current
        let fk = DateFormatter(); fk.locale = Locale(identifier: "en_US_POSIX"); fk.dateFormat = "yyyy-MM-dd"
        let nomes = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]
        return (0..<7).reversed().compactMap { i in
            guard let d = cal.date(byAdding: .day, value: -i, to: agora) else { return nil }
            return (nomes[cal.component(.weekday, from: d) - 1] + (i == 0 ? " · HOJE" : ""), a[fk.string(from: d)] ?? 0, i == 0)
        }
    }

    var body: some View {
        let d = Self.dias(atividade, agora: agora)
        let maximo = max(1, d.map(\.valor).max() ?? 1)
        HStack(alignment: .bottom, spacing: DSEspaco.e3) {
            ForEach(Array(d.enumerated()), id: \.offset) { _, x in
                VStack(spacing: DSEspaco.e2) {
                    Text(x.valor > 0 ? "\(x.valor)" : "–").font(DS.mono(12, .semibold))
                        .foregroundStyle(x.hoje ? ThemeState.t.accent : ThemeState.t.text2)
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .fill(x.hoje ? AnyShapeStyle(LinearGradient(colors: ThemeState.t.heroStops, startPoint: .top, endPoint: .bottom))
                                     : AnyShapeStyle(x.valor > 0 ? ThemeState.t.accent.opacity(0.35) : ThemeState.t.surface2))
                        .frame(height: max(6, 110 * CGFloat(x.valor) / CGFloat(maximo)))
                    Text(x.rotulo).font(DS.interface(10.5, .bold)).tracking(0.8)
                        .foregroundStyle(x.hoje ? ThemeState.t.accent : ThemeState.t.text3).lineLimit(1).minimumScaleFactor(0.7)
                }
                .frame(maxWidth: .infinity)
                .accessibilityElement(children: .combine)
            }
        }
        .frame(height: 160, alignment: .bottom)
        .padding(.horizontal, 22).padding(.vertical, 20)
        .background(RoundedRectangle(cornerRadius: DSRaio.card, style: .continuous).fill(ThemeState.t.surface))
        .overlay(RoundedRectangle(cornerRadius: DSRaio.card, style: .continuous).strokeBorder(ThemeState.t.border, lineWidth: 1))
    }
}
