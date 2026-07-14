import Foundation

/// Dados CURADOS de fontes oficiais (Planalto/Congresso) que NÃO estão no texto
/// consolidado que baixamos: datas de ENTRADA EM VIGOR de diplomas penais mais
/// citados (o texto só traz o ano) e siglas p/ exibição.
///
/// ⚠️ Conjunto INICIAL para revisão/expansão da usuária. Datas conferidas nas
/// imagens do Vade Mecum de referência e/ou na data de publicação no DOU. Para
/// a tipificação correta na discursiva, o que importa é a lei em vigor na DATA
/// DO FATO — por isso a entrada em vigor (não só o ano) é destacada.
enum LawSeed {

    /// Sigla curta a partir do tipo textual da norma.
    static func sigla(for type: String) -> String {
        let t = type.lowercased().folding(options: .diacriticInsensitive, locale: nil)
        if t.contains("complementar") { return "LC" }
        if t.contains("delegada") { return "LD" }
        if t.contains("decreto-lei") || t.contains("decreto lei") { return "DL" }
        if t.contains("medida provis") { return "MP" }
        if t.contains("emenda") { return "EC" }
        if t.contains("decreto") { return "Dec." }
        return "Lei"
    }

    /// Data de entrada em vigor (DD/MM/AAAA) de um diploma penal, se curada.
    /// `number` sem ponto de milhar (ex.: "12015"). Só "Lei" comum por ora.
    static func vigencia(type: String, number: String) -> String? {
        guard sigla(for: type) == "Lei" else { return nil }
        return penalLawVigencia[number]
    }

    // Lei nº (sem milhar) → entrada em vigor. Fonte: DOU / Vade Mecum de referência.
    private static let penalLawVigencia: [String: String] = [
        "7209":  "13/01/1985",  // Reforma da Parte Geral do CP (vacatio de 6 meses)
        "8072":  "26/07/1990",  // Crimes Hediondos
        "9268":  "01/04/1996",
        "9426":  "24/12/1996",
        "10695": "01/07/2003",
        "11106": "29/03/2005",
        "11343": "08/10/2006",  // Lei de Drogas (vacatio de 45 dias)
        "12015": "10/08/2009",  // Crimes contra a dignidade sexual
        "12234": "06/05/2010",
        "13330": "03/08/2016",
        "13344": "06/11/2016",  // Tráfico de pessoas (vacatio de 30 dias)
        "13654": "24/04/2018",  // Roubo
        "13718": "25/09/2018",  // Importunação sexual / ação penal pública incondicionada
        "13869": "03/01/2020",  // Abuso de autoridade
        "13964": "23/01/2020",  // Pacote Anticrime (vacatio de 30 dias)
        "14155": "28/05/2021",  // Crimes patrimoniais praticados por meio eletrônico
        "14994": "09/10/2024",  // Feminicídio
    ]
}
