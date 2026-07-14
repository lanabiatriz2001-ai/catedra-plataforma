import Foundation

/// Redação antiga/revogada CURADA de fontes oficiais (Planalto/Congresso), que o
/// texto consolidado baixado NÃO preserva (o Planalto guarda só o marcador
/// "(Revogado/Redação dada por…)"). Entra nas TABELAS COMPARATIVAS do artigo,
/// sempre marcada como NÃO VIGENTE e TACHADA — nunca como norma própria vigente.
///
/// ⚠️ Conjunto INICIAL para a discursiva (revisar/expandir). Textos de estatutos
/// (domínio público) transcritos das versões oficiais. Comece pelos clássicos de
/// prova: a evolução da NATUREZA DA AÇÃO PENAL nos crimes contra a dignidade sexual.
struct SeededRedaction: Hashable {
    let sourceLabel: String   // "Redação original (1940)", "Lei nº 12.015/2009"
    let date: String?         // entrada em vigor (DD/MM/AAAA), se conhecida
    let revoked: Bool         // sempre exibida tachada; true destaca "revogada"
    let lines: [String]       // corpo da redação (1ª linha traz o rótulo "Art. N.")
}

enum RedactionSeed {
    /// Redações anteriores curadas de um artigo (ordem: mais ANTIGA → mais nova).
    /// Chaveia por sigla canônica ("CP|225", "CPP|28") OU por número da norma
    /// ("lei-11343|28"), para funcionar em qualquer diploma da biblioteca.
    static func history(for law: LawEntry, article: String) -> [SeededRedaction] {
        for k in keys(for: law) {
            if let v = data["\(k)|\(article)"] { return v }
        }
        return []
    }
    private static func keys(for law: LawEntry) -> [String] {
        var out: [String] = [RemissiveIndex.shortName(law)]
        if let ref = LegislativeNote.reference(in: law.reference) {
            out.append("\(LegislativeNote.canonicalType(ref.type))-\(ref.number)")
        }
        return out
    }

    // Reforma dos crimes contra a dignidade sexual — Lei 12.015/2009 (em vigor
    // 10/08/2009), que substituiu "Dos Crimes Contra os Costumes". Textos ANTERIORES
    // transcritos do Quadro Comparativo do MPPR (site.mppr.mp.br). É o tema mais
    // cobrado em discursiva de penal e o que aparece nas imagens da usuária.
    private static let data: [String: [SeededRedaction]] = [
        // LEI DE DROGAS (Lei 11.343/2006, em vigor 08/10/2006) — DESPENALIZAÇÃO DO USO.
        // A lei antiga (Lei 6.368/1976) punia o USUÁRIO com DETENÇÃO de 6 meses a 2 anos;
        // a nova (art. 28) só admite advertência, prestação de serviços e medida educativa.
        // Textos VERIFICADOS verbatim no Planalto + Câmara/legin (o art. 16 traz mesmo
        // "(vinte)" sem o numeral, quirk do original de 1976).
        "lei-11343|28": [
            SeededRedaction(
                sourceLabel: "Lei nº 6.368/1976, art. 16 — uso punido com DETENÇÃO (revogada pela Lei 11.343/2006, 08/10/2006)",
                date: nil, revoked: true,
                lines: [
                    "Art. 16. Adquirir, guardar ou trazer consigo, para o uso próprio, substância entorpecente ou que determine dependência física ou psíquica, sem autorização ou em desacordo com determinação legal ou regulamentar:",
                    "Pena - Detenção, de 6 (seis) meses a 2 (dois) anos, e pagamento de (vinte) a 50 (cinqüenta) dias-multa.",
                ]),
        ],
        "lei-11343|33": [
            SeededRedaction(
                sourceLabel: "Lei nº 6.368/1976, art. 12 — tráfico, reclusão de 3 a 15 anos (revogada pela Lei 11.343/2006, 08/10/2006)",
                date: nil, revoked: true,
                lines: [
                    "Art. 12. Importar ou exportar, remeter, preparar, produzir, fabricar, adquirir, vender, expor à venda ou oferecer, fornecer ainda que gratuitamente, ter em depósito, transportar, trazer consigo, guardar, prescrever, ministrar ou entregar, de qualquer forma, a consumo substância entorpecente ou que determine dependência física ou psíquica, sem autorização ou em desacordo com determinação legal ou regulamentar;",
                    "Pena - Reclusão, de 3 (três) a 15 (quinze) anos, e pagamento de 50 (cinqüenta) a 360 (trezentos e sessenta) dias-multa.",
                ]),
        ],
        // PACOTE ANTICRIME (Lei 13.964/2019, em vigor 23/01/2020) no CPP. Redações
        // ANTERIORES verificadas verbatim. (Juiz das garantias e cadeia de custódia
        // foram CRIADOS por essa lei — não têm redação anterior, logo não entram aqui.)
        "CPP|28": [
            SeededRedaction(
                sourceLabel: "Redação anterior — o JUIZ controlava o arquivamento e remetia ao Procurador-Geral (até a Lei 13.964/2019, 23/01/2020)",
                date: nil, revoked: false,
                lines: [
                    "Art. 28. Se o órgão do Ministério Público, ao invés de apresentar a denúncia, requerer o arquivamento do inquérito policial ou de quaisquer peças de informação, o juiz, no caso de considerar improcedentes as razões invocadas, fará remessa do inquérito ou peças de informação ao procurador-geral, e este oferecerá a denúncia, designará outro órgão do Ministério Público para oferecê-la, ou insistirá no pedido de arquivamento, ao qual só então estará o juiz obrigado a atender.",
                ]),
        ],
        "CPP|316": [
            SeededRedaction(
                sourceLabel: "Redação anterior — sem a revisão obrigatória da preventiva a cada 90 dias (até a Lei 13.964/2019, 23/01/2020)",
                date: nil, revoked: false,
                lines: [
                    "Art. 316. O juiz poderá revogar a prisão preventiva se, no correr do processo, verificar a falta de motivo para que subsista, bem como de novo decretá-la, se sobrevierem razões que a justifiquem.",
                ]),
        ],
        // Estupro: só MULHER + conjunção carnal → qualquer pessoa + qualquer ato
        // libidinoso (unificou o atentado violento ao pudor do antigo art. 214).
        "CP|213": [
            SeededRedaction(
                sourceLabel: "Redação anterior — só mulher e conjunção carnal (até a Lei 12.015/2009, 10/08/2009)",
                date: nil, revoked: false,
                lines: [
                    "Art. 213. Constranger mulher à conjunção carnal, mediante violência ou grave ameaça:",
                    "Pena - reclusão, de 6 (seis) a 10 (dez) anos.",
                ]),
        ],
        // Atentado violento ao pudor — REVOGADO pela Lei 12.015/2009 (a conduta
        // migrou para o art. 213: não houve abolitio criminis).
        "CP|214": [
            SeededRedaction(
                sourceLabel: "Atentado violento ao pudor — revogado pela Lei 12.015/2009 (10/08/2009)",
                date: nil, revoked: true,
                lines: [
                    "Art. 214. Constranger alguém, mediante violência ou grave ameaça, a praticar ou permitir que com ele se pratique ato libidinoso diverso da conjunção carnal:",
                    "Pena - reclusão, de 6 (seis) a 10 (dez) anos.",
                ]),
        ],
        // Violação sexual mediante fraude (antiga "posse sexual mediante fraude").
        "CP|215": [
            SeededRedaction(
                sourceLabel: "Posse sexual mediante fraude — só mulher (até a Lei 12.015/2009, 10/08/2009)",
                date: nil, revoked: false,
                lines: [
                    "Art. 215. Ter conjunção carnal com mulher, mediante fraude:",
                    "Pena - reclusão, de 1 (um) a 3 (três) anos.",
                    "Parágrafo único - Se o crime é praticado contra mulher virgem, menor de 18 (dezoito) e maior de 14 (catorze) anos:",
                    "Pena - reclusão, de 2 (dois) a 6 (seis) anos.",
                ]),
        ],
        // Atentado ao pudor mediante fraude — REVOGADO pela Lei 12.015/2009
        // (conduta absorvida pelo novo art. 215).
        "CP|216": [
            SeededRedaction(
                sourceLabel: "Atentado ao pudor mediante fraude — revogado pela Lei 12.015/2009 (10/08/2009)",
                date: nil, revoked: true,
                lines: [
                    "Art. 216. Induzir alguém, mediante fraude, a praticar ou submeter-se à prática de ato libidinoso diverso da conjunção carnal:",
                    "Pena - reclusão, de um a dois anos.",
                    "Parágrafo único. Se a vítima é menor de 18 (dezoito) e maior de 14 (quatorze) anos:",
                    "Pena - reclusão, de 2 (dois) a 4 (quatro) anos.",
                ]),
        ],
        // Formas qualificadas — REVOGADO pela Lei 12.015/2009 (as qualificadoras
        // passaram para os §§ dos próprios tipos, ex.: art. 213, §§ 1º e 2º).
        "CP|223": [
            SeededRedaction(
                sourceLabel: "Formas qualificadas — revogado pela Lei 12.015/2009 (10/08/2009)",
                date: nil, revoked: true,
                lines: [
                    "Art. 223. Se da violência resulta lesão corporal de natureza grave:",
                    "Pena - reclusão, de 8 (oito) a 12 (doze) anos.",
                    "Parágrafo único - Se do fato resulta a morte:",
                    "Pena - reclusão, de 12 (doze) a 25 (vinte e cinco) anos.",
                ]),
        ],
        // Presunção de violência — REVOGADO pela Lei 12.015/2009 (substituída pelo
        // conceito de VULNERÁVEL, art. 217-A).
        "CP|224": [
            SeededRedaction(
                sourceLabel: "Presunção de violência — revogado pela Lei 12.015/2009 (10/08/2009)",
                date: nil, revoked: true,
                lines: [
                    "Art. 224. Presume-se a violência, se a vítima:",
                    "a) não é maior de catorze anos;",
                    "b) é alienada ou débil mental, e o agente conhecia esta circunstância;",
                    "c) não pode, por qualquer outra causa, oferecer resistência.",
                ]),
        ],
        // PRESCRIÇÃO — Lei 12.234/2010 (em vigor 06/05/2010). Aboliu a prescrição
        // retroativa com termo inicial ANTERIOR à denúncia/queixa (a "virtual"/
        // antecipada na fase pré-processual) e elevou o menor prazo de 2 p/ 3 anos.
        "CP|110": [
            SeededRedaction(
                sourceLabel: "Redação anterior — admitia prescrição retroativa antes da denúncia (até a Lei 12.234/2010, 06/05/2010)",
                date: nil, revoked: false,
                lines: [
                    "Art. 110. A prescrição depois de transitar em julgado a sentença condenatória regula-se pela pena aplicada e verifica-se nos prazos fixados no artigo anterior, os quais se aumentam de um terço, se o condenado é reincidente.",
                    "§ 1º - A prescrição, depois da sentença condenatória com trânsito em julgado para a acusação ou depois de improvido seu recurso, regula-se pela pena aplicada.",
                    "§ 2º - A prescrição, de que trata o parágrafo anterior, pode ter por termo inicial data anterior à do recebimento da denúncia ou da queixa.",
                ]),
        ],
        "CP|109": [
            SeededRedaction(
                sourceLabel: "Redação anterior — menor prazo de 2 anos e sem a ressalva do art. 110, § 1º (até a Lei 12.234/2010, 06/05/2010)",
                date: nil, revoked: false,
                lines: [
                    "Art. 109. A prescrição, antes de transitar em julgado a sentença final, regula-se pelo máximo da pena privativa de liberdade cominada ao crime, verificando-se:",
                    "I - em 20 (vinte) anos, se o máximo da pena é superior a 12 (doze);",
                    "II - em 16 (dezesseis) anos, se o máximo da pena é superior a 8 (oito) anos e não excede a 12 (doze);",
                    "III - em 12 (doze) anos, se o máximo da pena é superior a 4 (quatro) anos e não excede a 8 (oito);",
                    "IV - em 8 (oito) anos, se o máximo da pena é superior a 2 (dois) anos e não excede a 4 (quatro);",
                    "V - em 4 (quatro) anos, se o máximo da pena é igual a 1 (um) ano ou, sendo superior, não excede a 2 (dois);",
                    "VI - em 2 (dois) anos, se o máximo da pena é inferior a 1 (um) ano.",
                ]),
        ],
        // ROUBO — Lei 13.654/2018 (em vigor 24/04/2018): REVOGOU a majorante do
        // emprego de ARMA em geral (antigo § 2º, I) e criou a do emprego de ARMA DE
        // FOGO (§ 2º-A, I, aumento de 2/3). Entre 2018 e 2019 a arma branca deixou
        // de majorar o roubo — tema clássico de discursiva.
        "CP|157": [
            SeededRedaction(
                sourceLabel: "Redação anterior — arma EM GERAL majorava o roubo (§ 2º, I; até a Lei 13.654/2018, 24/04/2018)",
                date: nil, revoked: false,
                lines: [
                    "Art. 157. Subtrair coisa móvel alheia, para si ou para outrem, mediante grave ameaça ou violência a pessoa, ou depois de havê-la, por qualquer meio, reduzido à impossibilidade de resistência:",
                    "Pena - reclusão, de quatro a dez anos, e multa.",
                    "§ 2º A pena aumenta-se de um terço até metade:",
                    "I - se a violência ou ameaça é exercida com emprego de arma;",
                    "II - se há o concurso de duas ou mais pessoas;",
                    "III - se a vítima está em serviço de transporte de valores e o agente conhece tal circunstância;",
                    "IV - se a subtração for de veículo automotor que venha a ser transportado para outro Estado ou para o exterior;",
                    "V - se o agente mantém a vítima em seu poder, restringindo sua liberdade.",
                ]),
        ],
        // TRÁFICO INTERNO/INTERNACIONAL de pessoa p/ exploração sexual (arts. 231 e
        // 231-A) — REVOGADOS pela Lei 13.344/2016 (que criou o crime único de
        // TRÁFICO DE PESSOAS, art. 149-A). Última redação (Lei 12.015/2009).
        "CP|231": [
            SeededRedaction(
                sourceLabel: "Tráfico internacional de pessoa p/ exploração sexual — revogado pela Lei 13.344/2016 (migrou p/ o art. 149-A)",
                date: nil, revoked: true,
                lines: [
                    "Art. 231. Promover ou facilitar a entrada, no território nacional, de alguém que nele venha a exercer a prostituição ou outra forma de exploração sexual, ou a saída de alguém que vá exercê-la no estrangeiro:",
                    "Pena - reclusão, de 3 (três) a 8 (oito) anos.",
                ]),
        ],
        "CP|231-A": [
            SeededRedaction(
                sourceLabel: "Tráfico interno de pessoa p/ exploração sexual — revogado pela Lei 13.344/2016 (migrou p/ o art. 149-A)",
                date: nil, revoked: true,
                lines: [
                    "Art. 231-A. Promover ou facilitar o deslocamento de alguém dentro do território nacional para o exercício da prostituição ou outra forma de exploração sexual:",
                    "Pena - reclusão, de 2 (dois) a 6 (seis) anos.",
                ]),
        ],
        // Natureza da ação penal nos crimes sexuais (o exemplo pedido):
        // privada (1940) → pública CONDICIONADA (Lei 12.015/2009) → pública
        // INCONDICIONADA (Lei 13.718/2018, texto vigente já na base).
        "CP|225": [
            SeededRedaction(
                sourceLabel: "Redação original (1940) — ação penal privada",
                date: "01/01/1942", revoked: false,
                lines: [
                    "Art. 225. Nos crimes definidos nos capítulos anteriores, somente se procede mediante queixa.",
                    "§ 1º Procede-se, entretanto, mediante ação pública:",
                    "I - se a vítima ou seus pais não podem prover às despesas do processo, sem privar-se de recursos indispensáveis à manutenção própria ou da família;",
                    "II - se o crime é cometido com abuso do pátrio poder, ou da qualidade de padrasto, tutor ou curador.",
                    "§ 2º No caso do nº I do parágrafo anterior, a ação do Ministério Público depende de representação.",
                ]),
            SeededRedaction(
                sourceLabel: "Lei nº 12.015/2009 — ação pública condicionada",
                date: "10/08/2009", revoked: false,
                lines: [
                    "Art. 225. Nos crimes definidos nos Capítulos I e II deste Título, procede-se mediante ação penal pública condicionada à representação.",
                    "Parágrafo único. Procede-se, entretanto, mediante ação penal pública incondicionada se a vítima é menor de 18 (dezoito) anos ou pessoa vulnerável.",
                ]),
        ],
        // INJÚRIA RACIAL — redação anterior do §3º, antes da Lei 14.532/2023 (que a
        // equiparou ao crime de racismo, art. 2º-A da Lei 7.716/89). Texto verbatim
        // da tabela comparativa do vade mecum Coordenado.
        "CP|140": [
            SeededRedaction(
                sourceLabel: "Redação anterior do § 3º — injúria racial no CP (antes da Lei 14.532/2023)",
                date: nil, revoked: true,
                lines: [
                    "Art. 140, § 3º. Se a injúria consiste na utilização de elementos referentes a raça, cor, etnia, religião, origem ou a condição de pessoa idosa ou portadora de deficiência:",
                    "Pena – reclusão, de 1 (um) a 3 (três) anos, e multa.",
                ]),
        ],
        // INTERVALO DA MULHER antes da hora extra — REVOGADO pela Reforma Trabalhista
        // (Lei 13.467/2017). Era proteção exclusiva da mulher; deixou de existir.
        "CLT|384": [
            SeededRedaction(
                sourceLabel: "Redação anterior — descanso obrigatório de 15 min antes da prorrogação, exclusivo da mulher (revogado pela Lei 13.467/2017)",
                date: nil, revoked: true,
                lines: [
                    "Art. 384. Em caso de prorrogação do horário normal, será obrigatório um descanso de 15 (quinze) minutos no mínimo, antes do início do período extraordinário do trabalho.",
                ]),
        ],
    ]
}
