import SwiftUI

// =====================================================================================
//  "Não confunda com" — o quadro comparativo dos julgados vizinhos (CátedraJURIS)
//
//  Antes, "Relacionados" era uma lista de rótulos opacos: RoteiroLocal achatava o
//  JurisEntry inteiro em "tribunal · titulo" e jogava fora ramo, tema, data, situação e
//  id. Para um tema de repercussão geral o `titulo` é literalmente "Tema 1282 (RG)",
//  então a lista não dizia nada. Pior: o pareamento casava palavra de TÍTULO, e por isso
//  88% dos vizinhos eram do MESMO tribunal, muitos quase-duplicatas (Tema 494 e Tema 495
//  têm enunciado praticamente igual) — e o Tema 1282, que está duplicado no acervo,
//  chegava a aparecer como vizinho de si mesmo. Repetir a mesma tese cinco vezes ensina
//  que os temas são iguais, que é o oposto do que foi pedido.
//
//  Aqui cada vizinho vira COLUNA, com as células que o dado sustenta — e só elas. O que
//  o acervo não tem (quando incide, quem alcança, efeito prático) fica AUSENTE: omitir
//  vence preencher, e um "—" seria mentira educada.
//
//  ESTE É O ESPELHO DO MAC. mac/vendor/juris não é gerado de ios/vendor/juris: as duas
//  árvores são portadas à mão. O que muda aqui é só o que não existe do lado do Mac — o
//  alvo de toque de 44 pt e o Typo.ui do iPad (a tipografia de interface sai em
//  DS.interface(), como no resto do módulo daqui). A montagem, o pareamento, as regras
//  do quadro e a grade (QuadroGrade, pela largura) são IDÊNTICOS aos do iOS, de
//  propósito: se divergirem, o mesmo verbete passa a ensinar coisas diferentes em cada
//  aparelho.
//
//  HONESTIDADE: este quadro NÃO afirma divergência de mérito. Sem IA, o quadro só vale
//  quando há SINAL de que os verbetes podem ser trocados um pelo outro — nota de estudo,
//  mesmo assunto, mesmo dispositivo ou enunciado parecido (o piso de confundibilidade,
//  em colunasConfundiveis) —, e a etiqueta de cada coluna diz qual foi. Sem sinal, só a
//  lista "Do mesmo assunto". O único eixo e a única trava que o dado sustenta são a
//  situação registrada (cancelada, superada, revogada); tribunal e espécie já estão no
//  cabeçalho de cada coluna. O rodapé diz isso na tela, no mesmo espírito do Comparador
//  STF × STJ (AnaliseViews.swift:5-7).
//
//  POR QUE ARQUIVO PRÓPRIO: o corpo de RoteiroEstudoView já é um @ViewBuilder com ~12
//  ramos, e foi escrever muitos filhos literais dentro de um container que estourou a
//  pilha do iPhone no PR #83 (EntryDetailView.marcacaoToolbar, comentário em :524). Cada
//  `struct X: View` nomeado corta a cadeia de tipos genéricos; as células e as colunas
//  entram por ForEach sobre dados, nunca escritas uma a uma.
// =====================================================================================

// MARK: - Modelo (Codable + Hashable — mora dentro do RoteiroEstudo, no cache em disco)

/// As linhas do quadro, na ORDEM CANÔNICA: a ordem de declaração é a ordem na tela, e o
/// teto de 6 linhas corta pelo fim. A identidade é o `rawValue` — chave estável, nunca o
/// texto da célula: duas linhas com o mesmo texto colidiriam no ForEach e sumiriam.
enum LinhaQuadro: String, Codable, Hashable, CaseIterable, Identifiable {
    case quandoIncide, quemAlcanca, teseFixada, efeitoPratico
    case excecoes, desdeQuando, situacaoHoje, fundamento, separa

    var id: String { rawValue }

    var rotulo: String {
        switch self {
        case .quandoIncide:  return "Quando incide"
        case .quemAlcanca:   return "Quem alcança"
        case .teseFixada:    return "Tese fixada"
        case .efeitoPratico: return "Efeito prático"
        case .excecoes:      return "Exceções"
        case .desdeQuando:   return "Desde quando"
        case .situacaoHoje:  return "Situação hoje"
        case .fundamento:    return "Fundamento"
        // Não "O que separa": esse nome é o do EIXO no cabeçalho do quadro, e a célula é só
        // a lista de palavras do título e do tema que o verbete aberto não tem. Chamar isso de
        // "o que separa" prometia apontar a diferença de mérito e entregava "artigos ·
        // consonância" ao lado de uma tese que dizia a diferença real.
        case .separa:        return "Termos próprios"
        }
    }
}

/// As células de UMA coluna. Todas opcionais de propósito: chave ausente quer dizer "não
/// sei", e some da tela. Nada de "", "—" ou "não informado" — quem renderiza trata string
/// vazia como ausente também, por garantia.
struct CelulasQuadro: Codable, Hashable {
    var quandoIncide: String?
    var quemAlcanca: String?
    var teseFixada: String?
    var efeitoPratico: String?
    var excecoes: String?
    var desdeQuando: String?
    var situacaoHoje: String?
    var fundamento: String?
    var separa: String?

    func valor(_ linha: LinhaQuadro) -> String? {
        let bruto: String?
        switch linha {
        case .quandoIncide:  bruto = quandoIncide
        case .quemAlcanca:   bruto = quemAlcanca
        case .teseFixada:    bruto = teseFixada
        case .efeitoPratico: bruto = efeitoPratico
        case .excecoes:      bruto = excecoes
        case .desdeQuando:   bruto = desdeQuando
        case .situacaoHoje:  bruto = situacaoHoje
        case .fundamento:    bruto = fundamento
        case .separa:        bruto = separa
        }
        guard let t = bruto?.trimmingCharacters(in: .whitespacesAndNewlines), !t.isEmpty else { return nil }
        return t
    }
}

/// Uma coluna do quadro. Fora do `id` — que é a identidade e sem ele a coluna não
/// significa nada — TUDO é opcional: o cache dos roteiros é decodificado num bloco só
/// (`[String: RoteiroEstudo]`), e uma única chave faltando lançaria e apagaria em
/// silêncio os 400 roteiros gravados.
struct ColunaQuadro: Codable, Hashable, Identifiable {
    /// O id do verbete no acervo — nunca identidade derivada do texto. É ele que abre o
    /// verbete no toque e que impede a mesma coluna de aparecer duas vezes.
    let id: String
    var ref: String?
    var tribunal: String?
    var especie: String?
    var numero: Int?
    var data: String?
    var aberto: Bool?
    /// true quando o vizinho veio do ramo "relacionada" da nota de estudo — divergência
    /// escrita à mão pela curadoria, que entra antes de qualquer vizinho calculado.
    var curada: Bool?
    /// Por que este vizinho é coluna ("Mesmo assunto", "Mesmo dispositivo", "Citado na nota
    /// de estudo"…) — sai na etiqueta do cabeçalho. É o que o quadro sabe de fato sobre o
    /// par: proximidade, nunca juízo de que as teses divergem.
    var motivo: String?
    var celulas: CelulasQuadro?

    var ehAberta: Bool { aberto == true }
    var ehCurada: Bool { curada == true }
    var celulasOuVazio: CelulasQuadro { celulas ?? CelulasQuadro() }
    var rotulo: String { ref ?? id }
}

/// Um vizinho que ficou de fora do quadro ("Do mesmo assunto"). `id` é o id do verbete:
/// a linha é clicável e abre o verbete, como qualquer outro caminho do módulo.
struct RefQuadro: Codable, Hashable, Identifiable {
    let id: String
    var ref: String?
    var rotulo: String { ref ?? id }
}

/// O quadro inteiro, do jeito que vai para o cache e para a tela.
struct QuadroRelacionados: Codable, Hashable {
    /// "O que se discute" — o objeto comum, ≤ 12 palavras. É o título do quadro, não uma
    /// linha: é ele que torna os temas vizinhos, então não separa nada.
    var objeto: String?
    /// A variável que separa as colunas, 2 a 6 palavras.
    var eixo: String?
    var colunas: [ColunaQuadro]?
    var naoConfunda: [String]?
    var mesmoAssunto: [RefQuadro]?
    /// Cada item começa por "Confira: " — é o sinal visível da omissão.
    var semCerteza: [String]?
    /// Quem montou: no nativo é sempre "acervo" (sem IA). Muda o rodapé na tela.
    var fonte: String?

    var colunasOuVazio: [ColunaQuadro] { colunas ?? [] }
    var mesmoAssuntoItens: [RefQuadro] { mesmoAssunto ?? [] }

    /// Um quadro só existe com 2 colunas E 2 linhas que discriminem — um quadro de uma
    /// coluna é pior que a lista.
    var temQuadro: Bool { colunasOuVazio.count >= 2 && linhasVisiveis.count >= 2 }

    /// Nada a mostrar: nem quadro, nem lista — e nesses o bloco não é montado. Acontece
    /// pouco agora: os 1.070 verbetes de base de termos vazia (todas as súmulas do STF, as
    /// vinculantes, 179 temas de RG) devolviam SEMPRE lista vazia em relacionados(), que
    /// casa palavra de TÍTULO, e passam a ter vizinhos por comparaveis(), que lê o
    /// enunciado. Medido em amostra de 395 verbetes: 3 ficam sem bloco.
    var vazio: Bool { colunasOuVazio.isEmpty && mesmoAssuntoItens.isEmpty }

    /// LINHA CONSTANTE NÃO ENTRA: uma linha só aparece se pelo menos duas colunas TIVEREM
    /// valor nela e esses valores forem DIFERENTES (comparação por texto normalizado). Célula
    /// ausente não conta como valor: antes ["Cancelada", "", ""] passava como "dois valores
    /// distintos" e a linha pintava com uma célula só — não comparava nada e, com duas
    /// dessas, um par sem comparação nenhuma virava quadro. É a mesma régua da web (qdLinhas).
    var linhasVisiveis: [LinhaQuadro] {
        let cols = colunasOuVazio
        guard cols.count >= 2 else { return [] }
        var out: [LinhaQuadro] = []
        for linha in LinhaQuadro.allCases {
            let cheios = cols.compactMap { $0.celulasOuVazio.valor(linha) }
                .map(Self.normalizar).filter { !$0.isEmpty }
            guard cheios.count >= 2, Set(cheios).count >= 2 else { continue }
            out.append(linha)
            if out.count == 6 { break }   // teto duro; a ordem canônica decide quem fica
        }
        return out
    }

    /// Minúsculas, sem acento, sem pontuação, espaços colapsados. Duas colunas que dizem a
    /// mesma coisa com vírgula diferente não podem virar uma linha "que discrimina".
    static func normalizar(_ s: String) -> String {
        let f = s.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
        return String(f.map { ($0.isLetter || $0.isNumber) ? $0 : " " })
            .split(separator: " ").joined(separator: " ")
    }
}

// MARK: - Montagem (local, determinística, sem IA)

/// Sem @MainActor, de propósito: a montagem varre o acervo (curadoria, mesmo tema, dois
/// tribunais de contraste, relacionados) e roda numa tarefa destacada, sobre um retrato
/// por valor do acervo (AcervoQuadro). Na main ela congelava a abertura do verbete — e
/// rodava duas vezes, uma no detalhe e outra no roteiro.
enum QuadroRelacionadosCalc {

    /// Teto ÚNICO de vizinhos da página: o quadro leva até 2 e "Do mesmo assunto" fica com
    /// o resto. Antes o roteiro pedia 5 e o relacionadosSection pedia 6 — dois conjuntos
    /// diferentes do mesmo verbete na mesma rolagem.
    static let tetoVizinhos = 6
    /// 3 colunas no total, teto duro: o verbete aberto + 2 confundíveis.
    static let tetoColunas = 2
    static let tetoTexto = 220

    /// Por que o vizinho pode ser TROCADO pelo verbete aberto numa prova — o sinal que o faz
    /// coluna, e não só item da lista. A ordem é a força: quando há mais candidatos que
    /// vagas, o sinal mais forte fica com a vaga. O texto vai para a etiqueta da coluna, na
    /// tela: quem estuda vê por que aquele verbete está ali, em vez de supor divergência.
    enum Motivo: Int {
        case vocabulario = 1, dispositivo = 2, assunto = 3, curadoria = 4

        var texto: String {
            switch self {
            case .curadoria:   return "Citado na nota de estudo"
            case .assunto:     return "Mesmo assunto"
            case .dispositivo: return "Mesmo dispositivo"
            case .vocabulario: return "Enunciado parecido"
            }
        }
    }

    /// Piso ABSOLUTO do sinal de vocabulário (Jaccard ponderado por IDF, LibraryStore.
    /// similaridade). Medido nas colunas que a amostra de 406 verbetes aceitaria: abaixo de
    /// 0,14 cerca de metade dos pares é vocabulário genérico (edital de concurso × treinador
    /// de tênis, MP × exoneração de servidor; algemas × Marco Civil ficava em 0,01); de 0,14
    /// a 0,18, oito em dez são o mesmo instituto; acima, quase todos. O custo é conhecido: o
    /// par Tema 246 × Tema 1.118 (0,12) deixa de ser coluna e fica no topo de "Do mesmo
    /// assunto" — perder um par bom custa menos que imprimir um falso sob "Não confunda com".
    static let pisoSemelhanca = 0.15
    /// Piso RELATIVO: o vizinho por vocabulário precisa chegar a 60% do mais parecido do
    /// mesmo verbete. Entre 0,10 e 0,18 a precisão depende do verbete — a Súmula 435 (ITCMD)
    /// tem a Súmula 112 a 0,34 e o IRRF do Info 821 a 0,11; um corte fixo aceitaria os dois.
    static let fracaoDoMelhor = 0.6

    static func montar(_ e: JurisEntry, acervo: AcervoQuadro) -> QuadroRelacionados {
        var q = QuadroRelacionados()
        q.fonte = "acervo"
        let pool = candidatos(e, acervo: acervo)
        let lista = pool.map { RefQuadro(id: $0.entry.id, ref: rotulo($0.entry)) }
        guard !pool.isEmpty else { q.mesmoAssunto = []; return q }

        let escolhidos = colunasConfundiveis(e, pool, acervo: acervo)
        guard !escolhidos.isEmpty else { q.mesmoAssunto = lista; return q }

        let colunas = [coluna(e, aberto: true, motivo: nil, base: e, acervo: acervo)]
            + escolhidos.map { coluna($0.0.entry, aberto: false, motivo: $0.1, base: e, acervo: acervo) }
        q.colunas = colunas

        let entradas = [e] + escolhidos.map { $0.0.entry }
        q.objeto = objeto(e, das: entradas, acervo: acervo)
        q.eixo = eixo(colunas)
        q.naoConfunda = naoConfunda(colunas)
        q.semCerteza = semCerteza(colunas, entradas: entradas)

        // Menos de 2 linhas que discriminem: o quadro não se sustenta e os candidatos voltam
        // INTEIROS para a lista.
        if q.temQuadro {
            let usados = Set(colunas.map { $0.id })
            q.mesmoAssunto = lista.filter { !usados.contains($0.id) }
        } else {
            q.colunas = nil; q.objeto = nil; q.eixo = nil; q.naoConfunda = nil; q.semCerteza = nil
            q.mesmoAssunto = lista
        }
        return q
    }

    // MARK: Pareamento

    /// Um vizinho do pool, com o que se sabe dele para decidir se vira coluna.
    private struct Candidato {
        let entry: JurisEntry
        /// O sinal forte, quando há: curadoria, mesmo assunto, mesmo dispositivo.
        let motivoForte: Motivo?
        /// Semelhança de vocabulário com o verbete aberto (0 a 1).
        let semelhanca: Double
        /// true quando o vizinho NUNCA vira coluna, qualquer que seja o sinal: é a mesma
        /// tese (conversão, quase-duplicata, texto repetido, o mesmo julgado com outro
        /// cabeçalho), ou não tem cabeçalho citável.
        let soLista: Bool
    }

    /// PISO DE CONFUNDIBILIDADE. Vizinhança de vocabulário não é risco de troca: medido sobre
    /// o acervo, o quadro nascia em 403 de 406 verbetes, com algemas ao lado do Marco Civil
    /// da Internet e medicamento do SUS ao lado de penduricalho de magistrado. Só vira COLUNA
    /// quem tem um `Motivo`; o resto fica em "Do mesmo assunto", que é lista e não afirma
    /// nada. Sem nenhum vizinho com motivo, não há quadro.
    private static func colunasConfundiveis(_ e: JurisEntry, _ pool: [Candidato],
                                            acervo: AcervoQuadro) -> [(Candidato, Motivo)] {
        let melhor = pool.filter { $0.motivoForte == nil && !$0.soLista }.map(\.semelhanca).max() ?? 0
        let corte = max(pisoSemelhanca, melhor * fracaoDoMelhor)
        var aptos: [(Int, Candidato, Motivo)] = []
        for (i, c) in pool.enumerated() where !c.soLista {
            if let m = c.motivoForte { aptos.append((i, c, m)) }
            else if c.semelhanca >= corte { aptos.append((i, c, .vocabulario)) }
        }
        // O sinal mais forte primeiro. Dentro do vocabulário, o mais parecido; nos outros, a
        // ordem do pool — que, na curadoria, é a ordem em que a nota escreveu.
        aptos.sort { a, b in
            if a.2 != b.2 { return a.2.rawValue > b.2.rawValue }
            if a.2 == .vocabulario, a.1.semelhanca != b.1.semelhanca { return a.1.semelhanca > b.1.semelhanca }
            return a.0 < b.0
        }
        // Coluna precisa de cabeçalho que não colida com outro: três colunas escritas "STJ ·
        // Edição 54" não diziam qual era qual, e cada uma abria um verbete diferente no toque.
        var rotulos: Set<String> = [QuadroRelacionados.normalizar(rotulo(e))]
        var teses: [String?] = [tese(e, acervo: acervo)]
        var out: [(Candidato, Motivo)] = []
        for (_, c, m) in aptos {
            guard out.count < tetoColunas else { break }
            let rot = QuadroRelacionados.normalizar(rotulo(c.entry))
            guard !rotulos.contains(rot) else { continue }
            // Dois vizinhos que são o mesmo julgado também não viram duas colunas.
            guard !out.contains(where: { mesmoConteudo($0.0.entry, c.entry) || repeteATese($0.0.entry, c.entry) }) else { continue }
            let t = tese(c.entry, acervo: acervo)
            guard !teses.contains(where: { mesmaTeseNaTela($0, t) }) else { continue }
            rotulos.insert(rot); teses.append(t)
            out.append((c, m))
        }
        return out
    }

    /// Itens de nota curada cujo VERBO diz que os dois são a mesma tese. "Converteu a Súmula
    /// 722 do STF" não é divergência: é identidade, e o quadro chegava a ensinar a distinguir
    /// uma súmula da sua própria conversão em vinculante (medido: 27 pares). "Mesma lógica"
    /// e "mesmo sentido" são identidade só no MESMO tribunal: entre tribunais são o paralelo
    /// que a prova cobra — a Súmula 7 do STJ (recurso especial) e a Súmula 279 do STF
    /// (recurso extraordinário) dizem o mesmo sobre recursos diferentes, e trocar uma pela
    /// outra é o erro clássico. "Precedente" (de origem, representativo, "-base") é o
    /// julgado que DEU ORIGEM à súmula: a Súmula Vinculante 37 e o Tema 315 pintavam a mesma
    /// tese lado a lado (medido: 10 itens, todos nesse sentido).
    private static let marcasDeIdentidade = ["convert", "substitu", "precedente"]
    private static let verbosDeParalelo = ["mesma logica", "mesmo sentido", "reafirm"]

    private static func dizIdentidade(_ texto: String, mesmoTribunal: Bool) -> Bool {
        let f = dobrar(texto)
        if marcasDeIdentidade.contains(where: { f.contains($0) }) { return true }
        return mesmoTribunal && verbosDeParalelo.contains(where: { f.contains($0) })
    }

    private static func candidatos(_ e: JurisEntry, acervo: AcervoQuadro) -> [Candidato] {
        var out: [Candidato] = []
        var idsVistos: Set<String> = [e.id]
        var chavesVistas: Set<String> = []
        if let k = chaveCitavel(e) { chavesVistas.insert(k) }
        let base = acervo.termosChave(e)
        let dispBase = dispositivos(e)

        func aceitar(_ c: JurisEntry, curada: Bool, item: String) {
            guard out.count < tetoVizinhos, !idsVistos.contains(c.id) else { return }
            // Duplicata real do acervo: "…-1234" e "…-1234-2" são o MESMO tema, e o segundo
            // chegava a entrar como vizinho do primeiro (medido: 84 chaves repetidas, 182
            // verbetes). A chave é a de CITAÇÃO — número que identifica o verbete, nunca a
            // edição de um informativo, senão dois julgados do mesmo Info virariam um só.
            if let k = chaveCitavel(c), chavesVistas.contains(k) { return }
            let termos = acervo.termosChave(c)
            let comum = base.intersection(termos).count
            // A MESMA tese com outro cabeçalho: enunciado quase igual (Jaccard ≥ 0,8), ou o
            // texto de um repete o começo do outro — a Jurisprudência em Teses que transcreve
            // a Súmula 466, o informativo que noticia o Tema 1.262 com as mesmas palavras.
            // Ensinar a separar os dois é ensinar que são coisas diferentes.
            let mesmaTese = quaseIgual(base, termos) || repeteATese(e, c)
                || out.contains { quaseIgual(acervo.termosChave($0.entry), termos) }
            if curada {
                // A curadoria escolhe o ASSUNTO; ela não certifica que a citação foi resolvida
                // para o verbete certo — o resolvedor é heurística de texto. Sem UM termo em
                // comum, a resolução errou (era assim que a Súmula 331 do STF, sobre ITCMD,
                // entrava pela nota que citava a Súmula 331 do TST): nem coluna, nem lista.
                guard comum >= 1 else { return }
            } else {
                // Quase-duplicata calculada sai de vez (contrato §6.2); a curada fica na lista.
                if mesmaTese { return }
                // Ramo NORMALIZADO: `disciplina` resolve "Direito Tributário, Financeiro e
                // Empresarial" e "Direito Tributário" no mesmo ramo, que a comparação de
                // string crua de relacionados() trata como ramos diferentes.
                if c.ramoDireito != nil, e.ramoDireito != nil, c.disciplina != e.disciplina { return }
                guard comum >= 2 else { return }
            }

            // ── Os sinais fortes, cada um MEDIDO como risco de troca.
            var forte: Motivo?
            if curada {
                // Preferir a curadoria é regra de ORDEM, não dispensa de filtro: a mesma tese
                // (Súmula Vinculante 46 × Súmula 722) desce para a lista, onde ajuda sem
                // ensinar a separar uma coisa dela mesma. Um termo só em comum também desce:
                // o corte dos vizinhos calculados é 2, e a curadoria não o dispensa.
                if comum >= 2, !mesmaTese, !dizIdentidade(item, mesmoTribunal: c.tribunal == e.tribunal) {
                    forte = .curadoria
                }
            } else if acervo.mesmoTemaEspecifico(e, c) {
                forte = .assunto
            } else if !dispBase.isEmpty, !dispBase.isDisjoint(with: dispositivos(c)) {
                forte = .dispositivo
            }
            // O mesmo julgado com outro cabeçalho: o Info 1004 do STF começa transcrevendo a
            // Súmula 644 do STJ, e as duas viravam colunas rivais. É a regra "nunca duas
            // colunas do mesmo verbete" aplicada ao número que o TEXTO cita, e não só ao do
            // cabeçalho. E coluna sem designação citável ("Tema s/n (RG)") não dá para
            // procurar no tribunal: fica na lista, que mostra o título.
            let soLista = (curada && forte == nil) || mesmaTese || mesmoConteudo(e, c) || designacao(c) == nil

            idsVistos.insert(c.id)
            if let k = chaveCitavel(c) { chavesVistas.insert(k) }
            out.append(Candidato(entry: c, motivoForte: soLista ? nil : forte,
                                 semelhanca: acervo.similaridade(e, c), soLista: soLista))
        }

        // 1º o que a curadoria escreveu à mão (ramo "relacionada" da nota de estudo).
        for c in curados(e, acervo: acervo) { aceitar(c.entry, curada: true, item: c.item) }
        // 2º o MESMO assunto específico: é o sinal mais forte depois da curadoria, e a busca
        // por vocabulário nem sempre o alcança antes de o teto de vizinhos encher.
        for c in acervo.mesmoTema(e, limite: 4) { aceitar(c, curada: false, item: "") }
        // 3º o CONTRASTE entre tribunais: comparaveis pontua por termos RAROS do enunciado
        // (IDF, com cache). relacionados() casa palavra de título e devolve 88% do mesmo
        // tribunal, quase sempre o tema de número vizinho.
        for t in tribunaisDeContraste(e) {
            for c in acervo.comparaveis(e, tribunal: t, limite: 4) { aceitar(c, curada: false, item: "") }
        }
        // 4º relacionados(), só se ainda faltar gente: varre o ramo inteiro (com os termos
        // de assunto do índice, sem redobrar texto), mas é a única busca que enxerga TSE,
        // TJRO e a Central de Contas — comparaveis exclui essas fontes de propósito.
        if out.count < 4 {
            for c in acervo.relacionados(e, limite: tetoVizinhos) { aceitar(c, curada: false, item: "") }
        }
        return out
    }

    /// true quando o texto de um dos dois REPETE o começo do outro: a mesma tese reescrita
    /// sob outro cabeçalho. Medido: é o que sobra acima de 0,7 de semelhança (Súmula 466 ×
    /// Ed. 103 · Tese 11, Súmula 610 × Ed. 95 · Tese 3, Tema 157 × Ed. 174 · Tese 9), e o
    /// Jaccard sem peso deixava passar porque título e tema diferem.
    private static func repeteATese(_ a: JurisEntry, _ b: JurisEntry) -> Bool {
        func inicio(_ e: JurisEntry) -> String {
            QuadroRelacionados.normalizar(String(RoteiroLocal.limpar(e.enunciado).prefix(600)))
        }
        let na = inicio(a), nb = inicio(b)
        let ca = String(na.prefix(90)), cb = String(nb.prefix(90))
        guard ca.count >= 60, cb.count >= 60 else { return false }
        return nb.contains(ca) || na.contains(cb)
    }

    /// Os dispositivos citados no verbete, dobrados para comparar — SÓ os que dizem de qual
    /// diploma são. Dois julgados que aplicam o mesmo artigo da mesma lei são candidatos de
    /// verdade a serem trocados um pelo outro; "art. 22, I" sem diploma casava a CF com o CPC.
    private static let reDiploma = try! NSRegularExpression(
        pattern: "\\b(cf|cr|crfb|cpc|cpp|cp|cc|cdc|ctn|clt|eca|lep|lia|lindb|lrf|lei|lc|decreto)\\b")

    private static func dispositivos(_ e: JurisEntry) -> Set<String> {
        let fonte = RoteiroLocal.limpar(e.enunciado) + " " + (e.referencias ?? "")
        var out = Set<String>()
        for d in RoteiroLocal.fundamentos(fonte) {
            let f = dobrar(d)
            guard f.hasPrefix("art") else { continue }
            let ns = f as NSString
            guard reDiploma.firstMatch(in: f, range: NSRange(location: 0, length: ns.length)) != nil else { continue }
            out.insert(String(f.filter { $0.isLetter || $0.isNumber }))
        }
        return out
    }

    /// true quando o COMEÇO do texto de um dos dois transcreve o outro ("Súmula 644 (STJ):
    /// O núcleo de prática jurídica…" dentro do Info 1004 do STF): o mesmo julgado com dois
    /// cabeçalhos, que não pode virar duas colunas.
    private static func mesmoConteudo(_ a: JurisEntry, _ b: JurisEntry) -> Bool {
        func abre(_ x: JurisEntry, citando y: JurisEntry) -> Bool {
            guard let k = chaveCitavel(y), chaveCitavel(x) != k else { return false }
            let cabeca = String(RoteiroLocal.limpar(x.enunciado).prefix(140))
            return chavesCitadas(cabeca, tribunalPadrao: x.tribunal).first == k
        }
        return abre(a, citando: b) || abre(b, citando: a)
    }

    /// O outro tribunal primeiro (é dele que vem o contraste), o próprio depois.
    private static func tribunaisDeContraste(_ e: JurisEntry) -> [String] {
        switch e.tribunal {
        case "STF": return ["STJ", "STF"]
        case "STJ": return ["STF", "STJ"]
        default:    return ["STF", "STJ"]
        }
    }

    /// Jaccard dos termos-chave. Conjunto pequeno dá índice instável, então abaixo de 4
    /// termos ninguém é considerado quase-duplicata.
    private static func quaseIgual(_ a: Set<String>, _ b: Set<String>) -> Bool {
        guard a.count >= 4, b.count >= 4 else { return false }
        let uniao = a.union(b).count
        guard uniao > 0 else { return false }
        return Double(a.intersection(b).count) / Double(uniao) >= 0.8
    }

    // MARK: Curadoria — o ramo "relacionada" da nota de estudo

    /// Os itens do tipo "relacionada" são divergência escrita à mão ("Súmula 279 do STF —
    /// mesma lógica no recurso extraordinário"). Aqui eles são resolvidos para verbetes
    /// REAIS do acervo; o que não casa com nada continua aparecendo na nota de estudo, na
    /// mesma página, e não é repetido aqui.
    ///
    /// O par (verbete, texto do item que o citou): o TEXTO precisa sobreviver até o piso.
    /// "Converteu a Súmula 722" diz que os dois são a mesma coisa (dizIdentidade), e é por
    /// item, não por ramo — testar o ramo inteiro derrubaria 56 vizinhos curados legítimos,
    /// cujo ramo tem um item de conversão e outros de contraste bom.
    private struct Curado { let entry: JurisEntry; let item: String }

    private static func curados(_ e: JurisEntry, acervo: AcervoQuadro) -> [Curado] {
        let itens = (acervo.notaApp(for: e.id)?.ramos ?? [])
            .filter { $0.tipo == "relacionada" }.flatMap { $0.itens }
        guard !itens.isEmpty else { return [] }
        var querido: [String] = []
        var textoDa: [String: String] = [:]
        for t in itens {
            for k in chavesCitadas(t, tribunalPadrao: e.tribunal) where !querido.contains(k) {
                querido.append(k); textoDa[k] = t
            }
        }
        guard !querido.isEmpty else { return [] }
        let alvo = Set(querido)
        // Duas passadas: primeiro pela chave PRÓPRIA (o número do registro), e só o que
        // sobrar pela citação do título. Sem a ordem, a nota que cita "Tema 1.234" podia
        // cair num dos nove eixos do Precedente Obrigatório em vez do próprio tema.
        var achado: [String: JurisEntry] = [:]
        for c in acervo.entries where c.id != e.id {
            guard let k = chavePropria(c), alvo.contains(k), achado[k] == nil else { continue }
            achado[k] = c
        }
        if achado.count < alvo.count {
            for c in acervo.entries where c.id != e.id && chavePropria(c) == nil {
                guard let k = chaveDoTitulo(c), alvo.contains(k), achado[k] == nil else { continue }
                achado[k] = c
            }
        }
        var out: [Curado] = []
        for k in querido {                       // na ordem em que a curadoria escreveu
            guard let c = achado[k], !out.contains(where: { $0.entry.id == c.id }) else { continue }
            out.append(Curado(entry: c, item: textoDa[k] ?? ""))
        }
        return out
    }

    /// Como este verbete seria CITADO numa nota ("sv:11", "sum:STJ:362", "tema:STF:941").
    /// Serve de dois jeitos: acha o verbete que a curadoria citou e, por ser a identidade
    /// oficial, descarta o registro duplicado. Repercussão geral e repetitivo compartilham a
    /// chave "tema:": o acervo classifica 36 registros na espécie errada, e o mesmo tema não
    /// pode virar duas colunas.
    private static func chaveCitavel(_ e: JurisEntry) -> String? {
        chavePropria(e) ?? chaveDoTitulo(e)
    }

    /// A chave que o NÚMERO do registro dá. Nil de propósito em informativo e em
    /// Jurisprudência em Teses, onde `numero` é a EDIÇÃO e não identifica o verbete.
    private static func chavePropria(_ e: JurisEntry) -> String? {
        guard let n = e.numero else { return nil }
        switch e.fonteKind {
        case .sumulaVinculante: return "sv:\(n)"
        case .sumulaSTF:        return "sum:STF:\(n)"
        case .sumulaSTJ:        return "sum:STJ:\(n)"
        case .sumulaTSE:        return "sum:TSE:\(n)"
        case .tjro:             return "sum:TJRO:\(n)"
        case .repercussaoGeral, .repetitivo: return "tema:\(e.tribunal):\(n)"
        default: return nil
        }
    }

    /// As fontes sem número próprio (Precedentes Obrigatórios, seleções de TJ) escrevem a
    /// citação no TÍTULO: "Tema 1.234 · Eixo I", "RECURSOS REPETITIVOS (Tema 1178)". Sem ler
    /// dali, os 9 eixos do Tema 1.234 eram nove verbetes distintos para a guarda de
    /// duplicata, e o quadro ensinava a não confundir o Tema 1.234 com ele mesmo.
    private static func chaveDoTitulo(_ e: JurisEntry) -> String? {
        guard chavePropria(e) == nil else { return nil }
        let t = e.titulo
        // Só quem nomeia súmula ou tema no título paga as expressões regulares.
        guard t.range(of: "tema", options: [.caseInsensitive, .diacriticInsensitive]) != nil
            || t.range(of: "sumula", options: [.caseInsensitive, .diacriticInsensitive]) != nil
            || t.range(of: "SV", options: []) != nil else { return nil }
        return chavesCitadas(t, tribunalPadrao: e.tribunal).first
    }

    private static let reSV = try! NSRegularExpression(
        pattern: "\\bS[úu]mula\\s+Vinculante\\s+n?[ºo.]?\\s*(\\d+)|\\bSV\\s*n?[ºo.]?\\s*(\\d+)\\b",
        options: [.caseInsensitive])
    private static let reSumula = try! NSRegularExpression(
        pattern: "\\bS[úu]mula\\s+n?[ºo.]?\\s*(\\d+)", options: [.caseInsensitive])
    private static let reTema = try! NSRegularExpression(
        pattern: "\\bTema\\s+n?[ºo.]?\\s*(\\d[\\d.]*)", options: [.caseInsensitive])

    /// Siglas que aparecem nas notas. As que NÃO são `comCorpus` existem no texto da
    /// curadoria mas não no acervo: "Súmula 331 do TST" não tem verbete para virar coluna, e
    /// emitir chave para ela fazia o resolvedor entregar a Súmula 331 do STF — sobre ITCMD
    /// em morte presumida — com o selo da nota de estudo em cima.
    private static let tribunaisCitaveis = "STF|STJ|TSE|TJRO|TST|TNU|CNJ|TCU|STM|TRF\\d?|TRT\\d*|TRE[A-Z]{2}|TJ[A-Z]{2}"
    private static let comCorpus: Set<String> = ["STF", "STJ", "TSE", "TJRO"]
    // Sem .caseInsensitive: a sigla vem em caixa alta nas notas, e ignorar a caixa fazia
    // "treze" casar com "TRE" + UF.
    private static let reTribDepois = try! NSRegularExpression(
        pattern: "^[^.;]{0,12}?\\b(" + tribunaisCitaveis + ")\\b")
    private static let reTribAntes = try! NSRegularExpression(
        pattern: "\\b(" + tribunaisCitaveis + ")\\b[^.;]{0,8}$")

    /// O tribunal escrito ao redor do número, ANTES ou DEPOIS, com ou sem conector. A forma
    /// mais comum nas notas é justamente a que o padrão antigo não via: "STJ Sumula 203",
    /// "Súmula 419 STJ", "Sumula 331, V, do TST" — e as três caíam no tribunal do próprio
    /// verbete aberto (medido: 47 citações resolvidas para o tribunal errado).
    private static func tribunalPerto(_ ns: NSString, _ r: NSRange) -> String? {
        let fimNum = r.location + r.length
        if fimNum < ns.length {
            let depois = ns.substring(with: NSRange(location: fimNum, length: min(20, ns.length - fimNum)))
            let nd = depois as NSString
            if let m = reTribDepois.firstMatch(in: depois, range: NSRange(location: 0, length: nd.length)),
               let t = grupo(m, 1, nd) { return t }
        }
        let ini = max(0, r.location - 18)
        if r.location > ini {
            let antes = ns.substring(with: NSRange(location: ini, length: r.location - ini))
            let na = antes as NSString
            if let m = reTribAntes.firstMatch(in: antes, range: NSRange(location: 0, length: na.length)),
               let t = grupo(m, 1, na) { return t }
        }
        return nil
    }

    /// As citações do texto, na ordem em que APARECEM. A ordem por posição importa: o título
    /// "Tema 1.234 · Eixo VIII — Proposta de Súmula Vinculante nº 60" identifica o Tema
    /// 1.234, não a SV 60, e é a primeira citação que serve de identidade do registro.
    static func chavesCitadas(_ texto: String, tribunalPadrao: String) -> [String] {
        var achados: [(Int, String)] = []
        // Vinculante PRIMEIRO, e o trecho sai do texto: sem isso "Súmula Vinculante 11"
        // casaria de novo como "Súmula 11" e traria a súmula errada para dentro do quadro.
        var limpo = texto
        let ns0 = texto as NSString
        for m in reSV.matches(in: texto, range: NSRange(location: 0, length: ns0.length)).reversed() {
            if let n = grupo(m, 1, ns0) ?? grupo(m, 2, ns0) { achados.append((m.range.location, "sv:\(n)")) }
            limpo = (limpo as NSString).replacingCharacters(in: m.range, with: " ")
        }
        let ns = limpo as NSString
        let faixa = NSRange(location: 0, length: ns.length)
        for m in reSumula.matches(in: limpo, range: faixa) {
            guard let n = grupo(m, 1, ns) else { continue }
            let trib = tribunalPerto(ns, m.range)
            // Tribunal reconhecido e sem acervo: a citação é DESCARTADA. Só quem não nomeia
            // tribunal nenhum cai no tribunal do verbete aberto.
            if let t = trib, !comCorpus.contains(t) { continue }
            achados.append((m.range.location, "sum:\(trib ?? tribunalPadrao):\(n)"))
        }
        let tribTema = tribunalDoTema(texto, padrao: tribunalPadrao)
        for m in reTema.matches(in: limpo, range: faixa) {
            guard let bruto = grupo(m, 1, ns) else { continue }
            let n = bruto.replacingOccurrences(of: ".", with: "")
            guard !n.isEmpty else { continue }
            achados.append((m.range.location, "tema:\(tribTema):\(n)"))
        }
        achados.sort { $0.0 < $1.0 }
        var out: [String] = []
        for (_, k) in achados where !out.contains(k) { out.append(k) }
        return Array(out.prefix(6))
    }

    private static func grupo(_ m: NSTextCheckingResult, _ i: Int, _ ns: NSString) -> String? {
        guard i < m.numberOfRanges, m.range(at: i).location != NSNotFound else { return nil }
        return ns.substring(with: m.range(at: i))
    }

    /// O número do tema não identifica nada sozinho — 624 números existem nos dois
    /// tribunais. A nota costuma dizer qual é ("Tema 941 RG", "STJ, Tema 566"); quando não
    /// diz, o tema citado é do tribunal do próprio verbete.
    private static func tribunalDoTema(_ texto: String, padrao: String) -> String {
        let f = dobrar(texto)
        let ehSTF = f.contains("stf") || f.contains(" rg") || f.contains("(rg") || f.contains("repercuss")
        let ehSTJ = f.contains("stj") || f.contains("repetitiv") || f.contains("resp ")
        if ehSTF && !ehSTJ { return "STF" }
        if ehSTJ && !ehSTF { return "STJ" }
        return padrao
    }

    // MARK: Células — só o que o dado sustenta

    private static func coluna(_ c: JurisEntry, aberto: Bool, motivo: Motivo?,
                               base: JurisEntry, acervo: AcervoQuadro) -> ColunaQuadro {
        var cel = CelulasQuadro()
        let nota = acervo.notaApp(for: c.id)
        let en = RoteiroLocal.limpar(c.enunciado)

        cel.teseFixada = tese(c, acervo: acervo)

        // Exceções: só quando a curadoria escreveu uma. Deduzir a ressalva do enunciado
        // seria inventar exceção onde o tribunal não pôs.
        let excecoes = (nota?.ramos ?? []).filter { $0.tipo == "excecao" }.flatMap { $0.itens }
        if !excecoes.isEmpty { cel.excecoes = cortar(excecoes.joined(separator: " "), tetoTexto) }

        let fund = RoteiroLocal.fundamentos(en + " " + (c.referencias ?? ""))
        if !fund.isEmpty { cel.fundamento = fund.prefix(4).joined(separator: "; ") }

        // Data ROTULADA: o acervo guarda uma data só, que é a do julgamento no julgado, a da
        // aprovação na súmula e a da EDIÇÃO na compilação (as 3.443 teses de Jurisprudência
        // em Teses herdam a data da edição — JT-ED001-01, -02 e -03 dizem todas 13/11/2013,
        // e nenhuma foi julgada nesse dia). Data incompleta ("2019", nos boletins do TCU)
        // não vira célula: "Julgada em 2019" afirmaria um dia que o acervo não tem.
        if let d = c.data?.trimmingCharacters(in: .whitespaces), dataCompleta(d) {
            cel.desdeQuando = verboDaData(c) + d
        }
        if let s = c.situacao.map(RoteiroLocal.limpar), !s.isEmpty { cel.situacaoHoje = cortar(s, 60) }

        if !aberto {
            // "Termos próprios": as palavras do TÍTULO e do TEMA do vizinho que não aparecem
            // no verbete aberto, da mais rara para a mais comum. Do enunciado não: os termos
            // mais raros da prosa são verbo e advérbio de redação ("esmorecer", "Falcão").
            // É vocabulário, não juízo de mérito — o rodapé diz isso na tela. Um termo só não
            // diz nada: abaixo de dois, a célula some.
            let termos = acervo.termosExclusivos(c, fora: base, limite: 10)
                .map { formaOriginal($0, em: c) }
            if termos.count >= 2 { cel.separa = termos.prefix(4).joined(separator: " · ") }
        }

        return ColunaQuadro(id: c.id, ref: rotulo(c), tribunal: c.tribunal,
                            especie: c.fonteKind.nomeCurto, numero: c.numero, data: c.data,
                            aberto: aberto, curada: motivo == .curadoria, motivo: motivo?.texto,
                            celulas: cel)
    }

    /// Tese: a síntese curada quando existe; senão a 1ª sentença APROVEITÁVEL do enunciado,
    /// entre as três primeiras. O acervo NÃO traz a tese separada — o enunciado é bloco
    /// único e só 9,6% marcam "Tese:" no meio do texto —, então o teto de caracteres evita
    /// despejar o enunciado inteiro dentro de uma célula. Nenhuma aproveitável: a célula
    /// fica AUSENTE, que é melhor que meia tese sob o rótulo mais autoritativo do quadro.
    private static func tese(_ c: JurisEntry, acervo: AcervoQuadro) -> String? {
        if let curada = acervo.notaApp(for: c.id)?.tese.map(RoteiroLocal.limpar), !curada.isEmpty {
            return cortar(curada, tetoTexto)
        }
        let en = RoteiroLocal.limpar(c.enunciado)
        return RoteiroLocal.sentencas(en).prefix(3).map(semEnumeracao).first(where: teseAproveitavel)
            .map { cortar($0, tetoTexto) }
    }

    /// As palavras de conteúdo de uma tese (4 letras ou mais, dobradas), para comparar teses.
    private static func palavrasDaTese(_ t: String) -> Set<String> {
        Set(QuadroRelacionados.normalizar(t).split(separator: " ").map(String.init).filter { $0.count >= 4 })
    }

    /// true quando as duas teses que iriam lado a lado dizem a MESMA coisa: a Súmula
    /// Vinculante 37 e o Tema 315 pintavam "Não cabe ao Judiciário, que não tem função
    /// legislativa, aumentar vencimentos…" nas duas colunas — a nota de estudo parafraseia
    /// cada uma, então nem o enunciado nem o Jaccard dos termos denunciavam. Uma coluna
    /// que repete a tese da outra não separa nada.
    private static func mesmaTeseNaTela(_ a: String?, _ b: String?) -> Bool {
        guard let a, let b else { return false }
        let pa = palavrasDaTese(a), pb = palavrasDaTese(b)
        guard pa.count >= 4, pb.count >= 4 else { return false }
        return Double(pa.intersection(pb).count) / Double(pa.union(pb).count) >= 0.6
    }

    /// Numeração de lista no começo da frase ("1) Para fins de…", "II - …") não é parte da
    /// tese: sai antes do teste de aproveitamento, senão a tese do Tema 1.234 seria recusada
    /// por começar com dígito.
    private static let reEnumeracao = try! NSRegularExpression(
        pattern: "^(?:\\(?\\d{1,2}[).]|[IVX]{1,4}\\s*[-–)]|[a-z]\\))\\s+")

    private static func semEnumeracao(_ s: String) -> String {
        let ns = s as NSString
        guard let m = reEnumeracao.firstMatch(in: s, range: NSRange(location: 0, length: ns.length)) else { return s }
        return ns.substring(from: m.range.length)
    }

    /// Abertura de caso ou de notícia não é tese: "Caso concreto: Allan foi vice-prefeito…",
    /// "Em, 25/04/2018, o STJ, ao julgar…" (esta, sob o cabeçalho do Tema 500 do STF).
    private static let reNarrativa = try! NSRegularExpression(
        pattern: "^(?:caso concreto|caso hipotetico|situacao hipotetica|imagine|exemplo\\s*:|em,?\\s+(?:\\d{1,2}/\\d{1,2}/\\d{2,4}|\\d{4}\\b))")

    /// Três testes baratos e determinísticos, porque o rótulo "Tese fixada" é o mais
    /// autoritativo do quadro e não pode carregar meia frase: começa por letra (senão sai
    /// ") 3) existência de registro"), não termina em dígito (o corte no meio de "REsp
    /// 1.657.156" — a raiz foi consertada em RoteiroLocal.sentencas, isto é a rede) e não é
    /// abertura narrativa. Heurística de "ter verbo" ficou de fora de propósito: derrubaria
    /// tese legítima em silêncio.
    private static func teseAproveitavel(_ s: String) -> Bool {
        // Aspas de abertura não contam: “É constitucional…” é tese que começa por letra.
        let corpo = s.drop(while: { "\"“«'‘".contains($0) })
        guard let p = corpo.first, p.isLetter, let u = s.last, !u.isNumber else { return false }
        let f = dobrar(s)
        return reNarrativa.firstMatch(in: f, range: NSRange(location: 0, length: (f as NSString).length)) == nil
    }

    private static func dataCompleta(_ d: String?) -> Bool {
        guard let d, d.count == 10 else { return false }
        return d.range(of: "^\\d{2}/\\d{2}/\\d{4}$", options: .regularExpression) != nil
    }

    /// O verbo certo para a ÚNICA data que o acervo guarda de cada fonte.
    private static func verboDaData(_ e: JurisEntry) -> String {
        if ehSumula(e) { return "Aprovada em " }
        if e.fonteKind == .jurisEmTeses { return "Edição de " }
        return "Julgada em "
    }

    private static func ehSumula(_ e: JurisEntry) -> Bool {
        switch e.fonteKind {
        case .sumulaVinculante, .sumulaSTF, .sumulaSTJ, .sumulaTSE, .tjro, .sumulaTCU, .sumulaTCE: return true
        default: return false
        }
    }

    // MARK: Cabeçalho da coluna

    /// "STF · Tema 1282", "STJ · Súmula 362", "STF · ADI 4.017". Quando o acervo não traz
    /// nada citável, o título cortado por PALAVRA — só serve à lista, que não vira coluna.
    static func rotulo(_ e: JurisEntry) -> String {
        let d = designacao(e) ?? primeiras(tituloSemTribunal(e), palavras: 8)
        return e.tribunal.isEmpty ? d : e.tribunal + " · " + d
    }

    /// Como a coluna se identifica: algo que dê para procurar no tribunal. nil quando o
    /// acervo não traz nada citável — "Tema s/n (RG)" não identifica nada (125 registros),
    /// e um título que é frase cortada ("Impõe-se analisar, preliminarmente, se se m…")
    /// também não. Sem designação, o verbete não vira coluna.
    static func designacao(_ e: JurisEntry) -> String? {
        if let n = e.numero {
            switch e.fonteKind {
            case .repercussaoGeral, .repetitivo: return "Tema \(n)"
            case .sumulaVinculante:              return "Súmula Vinculante \(n)"
            case .sumulaSTF, .sumulaSTJ, .sumulaTSE, .tjro, .sumulaTCU, .sumulaTCE: return "Súmula \(n)"
            case .informativoSTF, .informativoSTJ, .informativoTSE: return "Info \(n)"
            default: break
            }
        }
        let titulo = tituloSemTribunal(e)
        switch e.fonteKind {
        case .jurisEmTeses, .precedentesObrig, .tjroPrec, .boletimJurisTCU, .boletimPessoalTCU, .infoLicTCU:
            // Aqui o título É o identificador: "Ed. 54 · Tese 8" (e não "Edição 54", igual
            // nas 12 teses da edição), "Tema 1.234 · Eixo I", "Acórdão 7125/2019 Plenário".
            return curtoCitavel(titulo)
        default:
            // Julgado sem número próprio: o processo que o acervo registra ("ADI 4.017",
            // "REsp 1.700.197/SP") é o que se procura no tribunal.
            return processo(e.precedentes ?? "") ?? processo(titulo)
        }
    }

    private static func tituloSemTribunal(_ e: JurisEntry) -> String {
        var t = RoteiroLocal.limpar(e.titulo)
        guard !e.tribunal.isEmpty else { return t }
        let prefixo = e.tribunal + " · "
        if t.hasPrefix(prefixo) { t.removeFirst(prefixo.count) }
        return t.replacingOccurrences(of: " (\(e.tribunal))", with: "")
    }

    /// O título inteiro se for curto; senão a parte antes do travessão ("Tema 1.234 · Eixo I
    /// — Competência…" → "Tema 1.234 · Eixo I"). Nada de corte no meio da frase.
    private static func curtoCitavel(_ t: String) -> String? {
        var s = t
        if s.count > 44, let r = s.range(of: " — ") { s = String(s[..<r.lowerBound]) }
        guard !s.isEmpty, s.count <= 44, !s.contains("s/n"), !s.hasSuffix("…"),
              s.filter({ $0 == "(" }).count == s.filter({ $0 == ")" }).count else { return nil }
        return s
    }

    private static let reProcesso = try! NSRegularExpression(pattern:
        "\\b(ADI|ADC|ADO|ADPF|RE|ARE|HC|RHC|MS|RMS|Rcl|AI|MI|Inq|AP|SL|STA|SS|REsp|AREsp|EREsp|CC|IAC|IRDR)" +
        "\\s*(?:n[ºo.]?\\s*)?(\\d[\\d.]*\\d|\\d)(?:\\s*[/-]\\s*([A-Z]{2})\\b)?")

    private static func processo(_ s: String) -> String? {
        let ns = s as NSString
        guard let m = reProcesso.firstMatch(in: s, range: NSRange(location: 0, length: ns.length)),
              let classe = grupo(m, 1, ns), let n = grupo(m, 2, ns) else { return nil }
        return classe + " " + n + (grupo(m, 3, ns).map { "/" + $0 } ?? "")
    }

    // MARK: Cabeçalho do quadro

    private static func objeto(_ e: JurisEntry, das entradas: [JurisEntry], acervo: AcervoQuadro) -> String? {
        if let t = e.tema.map(RoteiroLocal.limpar), !t.isEmpty {
            // Assunto em caixa alta ("MEDIDAS SOCIOEDUCATIVAS") vira frase: o quadro não grita.
            let frase = (t == t.uppercased()) ? t.lowercased().prefix(1).uppercased() + t.lowercased().dropFirst() : t
            return primeiras(frase, palavras: 12)
        }
        // Nenhuma das 736 súmulas do STF tem `tema`. Em vez de repetir o título ("Súmula
        // 279"), que não diz o assunto, o objeto vira o vocabulário COMUM às colunas — com
        // o teto de frequência de termosComuns, que tira "contra" e "decisão" (e com eles o
        // "defere · contra" que a Súmula 735 anunciava como assunto). Menos de duas palavras
        // de sobra: sem objeto, que é melhor que um objeto inventado.
        let comuns = acervo.termosComuns(entradas, limite: 10).map { formaOriginal($0, em: e) }
        guard comuns.count >= 2 else { return nil }
        return comuns.prefix(5).joined(separator: " · ")
    }

    /// O eixo é a ÚNICA variável que distingue TODAS as colunas — e no nativo só pode ser
    /// uma que o dado sustente e que o cabeçalho ainda não diga. Tribunal e espécie saíram:
    /// já estão no cabeçalho de cada coluna, e anunciá-los como "o que separa" era simetria
    /// vazia (80% dos quadros, inclusive com duas colunas do MESMO tribunal) — insinuava
    /// divergência entre cortes onde só havia assuntos diferentes. Sobra a situação, e só
    /// quando todas as colunas a têm, todas diferentes, e alguma é ressalva.
    private static func eixo(_ colunas: [ColunaQuadro]) -> String? {
        let sit = colunas.compactMap { $0.celulasOuVazio.situacaoHoje.map(QuadroRelacionados.normalizar) }
        guard sit.count == colunas.count, Set(sit).count == colunas.count,
              colunas.contains(where: { ressalva($0) != nil }) else { return nil }
        return "A situação de cada tese"
    }

    /// Uma frase trava UM ponto por UMA variável, e só a variável que o dado sustenta: a
    /// RESSALVA registrada no acervo (cancelada, superada, revogada…). As frases de tribunal
    /// e de espécie saíram — eram 98% da trava e bibliográficas: "se a tese é do STF, é X;
    /// se é do STJ, é Y" chegou a apresentar o IAC 14, REVOGADO, como a resposta viva do STJ,
    /// e a transformar um erro de atribuição do acervo (o Tema 500 com texto do STJ) em regra
    /// de decisão. A frase fala SÓ da coluna que tem a ressalva: sobre a outra o acervo
    /// costuma calar (situação vazia em 100% de repercussão geral e repetitivo), e calar não
    /// é dizer que ela vale.
    private static func naoConfunda(_ colunas: [ColunaQuadro]) -> [String]? {
        let comRessalva = colunas.compactMap { c in ressalva(c).map { (c, $0) } }
        guard !comRessalva.isEmpty else { return nil }
        // Todas com a MESMA ressalva: a situação não separa ninguém.
        if comRessalva.count == colunas.count,
           Set(comRessalva.map { QuadroRelacionados.normalizar($0.1) }).count == 1 { return nil }
        return comRessalva.prefix(2).map { c, s in
            let quem = c.ehAberta ? "\(c.rotulo), o verbete aberto" : c.rotulo
            return "Se a pergunta é sobre o que vale hoje, não responda com \(quem): o acervo registra esse verbete como “\(s)”. O que decide é a situação da tese, não o texto parecido."
        }
    }

    /// A situação só interessa quando ela RESSALVA a tese.
    private static func ressalva(_ c: ColunaQuadro) -> String? {
        guard let s = c.celulasOuVazio.situacaoHoje else { return nil }
        let f = dobrar(s)
        let marcas = ["cancel", "super", "revog", "altera", "suspens", "afastad", "prejudicad"]
        return marcas.contains(where: { f.contains($0) }) ? s : nil
    }

    /// O começo do texto da coluna diz que quem decidiu foi o OUTRO tribunal ("Em,
    /// 25/04/2018, o STJ, ao julgar o REsp…" sob o cabeçalho do Tema 500 do STF; "Súmula 644
    /// (STJ): …" sob o do Info 1004 do STF). O cabeçalho vem do acervo e o acervo erra: o
    /// quadro não pode estampar o número como autoridade sem avisar.
    private static let reFalaSTJ = try! NSRegularExpression(
        pattern: "\\b(?:o|pelo|do|no)\\s+STJ\\b|\\(STJ\\)|\\bSTJ\\s*:|\\bA?REsp\\b")
    private static let reFalaSTF = try! NSRegularExpression(
        pattern: "\\b(?:o|pelo|do|no)\\s+STF\\b|\\(STF\\)|\\bSTF\\s*:|\\bRE\\s+\\d")

    private static func outroTribunalNoTexto(_ e: JurisEntry) -> String? {
        let cabeca = String(RoteiroLocal.limpar(e.enunciado).prefix(160))
        let faixa = NSRange(location: 0, length: (cabeca as NSString).length)
        switch e.tribunal {
        case "STF": return reFalaSTJ.firstMatch(in: cabeca, range: faixa) != nil ? "STJ" : nil
        case "STJ": return reFalaSTF.firstMatch(in: cabeca, range: faixa) != nil ? "STF" : nil
        default:    return nil
        }
    }

    private static func semCerteza(_ colunas: [ColunaQuadro], entradas: [JurisEntry]) -> [String]? {
        var out: [String] = []
        for e in entradas {
            guard let outro = outroTribunalNoTexto(e) else { continue }
            // Descreve o que o texto FAZ, sem acusar erro: às vezes é o STJ aplicando tese do
            // STF (Tema 505), às vezes é o registro trocado (o Tema 500 com texto do STJ). Nos
            // dois casos quem estuda precisa saber que a atribuição não foi conferida.
            out.append("Confira: o texto de \(rotulo(e)) começa citando decisão do \(outro); o tribunal da tese e o número do cabeçalho vêm do acervo do app e não foram conferidos no tribunal.")
        }
        let semData = colunas.filter { !dataCompleta($0.data) }.map { $0.rotulo }
        if !semData.isEmpty {
            out.append("Confira: o acervo não traz a data completa de \(semData.joined(separator: ", ")).")
        }
        // Situação é campo de SÚMULA: em repercussão geral e em repetitivo ele está vazio
        // em 100% do acervo. Ausência aqui não é prova de que a tese continua valendo.
        let temTema = entradas.contains { $0.fonteKind == .repercussaoGeral || $0.fonteKind == .repetitivo }
        let semSituacao = colunas.contains { $0.celulasOuVazio.situacaoHoje == nil }
        if temTema && semSituacao {
            out.append("Confira: o acervo não registra situação de tema de repercussão geral nem de repetitivo — a ausência não quer dizer que a tese siga íntegra.")
        }
        return out.isEmpty ? nil : Array(out.prefix(3))
    }

    // MARK: Texto

    private static func dobrar(_ s: String) -> String {
        s.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
    }

    /// A palavra como ela está escrita no verbete, com acento e com a caixa que tem lá. Os
    /// termos do índice vêm dobrados (sem acento, minúsculos) — escrever "pensao" na tela
    /// seria escrever errado em português.
    private static func formaOriginal(_ termo: String, em e: JurisEntry) -> String {
        let texto = [e.titulo, e.tema ?? "", e.enunciado].joined(separator: " ")
        for p in texto.split(whereSeparator: { !$0.isLetter && !$0.isNumber }) {
            let s = String(p)
            guard dobrar(s) == termo else { continue }
            // Assunto em caixa alta ("SERVIÇOS DE ÁGUA E ESGOTO") vira caixa baixa: o
            // quadro não grita.
            return (s.count > 1 && s == s.uppercased()) ? s.lowercased() : s
        }
        return termo
    }

    private static func cortar(_ s: String, _ teto: Int) -> String {
        let t = RoteiroLocal.limpar(s)
        guard t.count > teto else { return t }
        let corte = t.prefix(teto)
        if let i = corte.lastIndex(of: " ") { return String(corte[..<i]) + "…" }
        return String(corte) + "…"
    }

    private static func primeiras(_ s: String, palavras n: Int) -> String {
        let p = RoteiroLocal.limpar(s).split(separator: " ")
        guard p.count > n else { return p.joined(separator: " ") }
        return p.prefix(n).joined(separator: " ") + "…"
    }
}

// MARK: - Tela

/// O bloco "Não confunda com" do roteiro de estudo.
struct QuadroRelacionadosView: View {
    let quadro: QuadroRelacionados
    /// true quando a lista "Do mesmo assunto" pertence a ESTE bloco. No detalhe do verbete
    /// ela vive mais abaixo, na seção própria (uma lista só na rolagem); no card do Julgado
    /// do dia, que não tem essa seção, ela vem junto.
    var listaAqui: Bool = true

    @Environment(LibraryStore.self) private var store

    private var mostrarLista: Bool { listaAqui && !quadro.mesmoAssuntoItens.isEmpty }

    var body: some View {
        // As linhas saem do quadro A CADA corpo, nunca de um @State: semeado no init, o
        // estado sobrevivia à troca de verbete no iPad e no Mac (o leitor reaproveita a
        // view), e o primeiro desenho do verbete B saía com as linhas do A — inclusive uma
        // linha constante, que a regra nº 1 proíbe. O cálculo é O(colunas × 9).
        let linhas = quadro.linhasVisiveis
        // Sem quadro E sem lista, o bloco não existe — nem o rodapé. Nada de cartão vazio
        // dizendo que não há nada.
        if quadro.temQuadro || mostrarLista {
            VStack(alignment: .leading, spacing: 12) {
                if quadro.temQuadro {
                    QuadroCabecalho(objeto: quadro.objeto, eixo: quadro.eixo)
                    QuadroGrade(minimo: 260, espacamento: 10) {
                        ForEach(quadro.colunasOuVazio) { col in
                            // O selo da fonte sai do acervo, não do texto gravado: é a
                            // mesma peça (e a mesma cor) do resto do módulo.
                            QuadroColuna(coluna: col, fonte: store.byId[col.id]?.fonteKind,
                                         linhas: linhas, abrir: abrir)
                        }
                    }
                    if let travas = quadro.naoConfunda, !travas.isEmpty {
                        BlocoEstudo(rotulo: "Não confunda", cor: Palette.warn) {
                            VStack(alignment: .leading, spacing: 6) {
                                ForEach(travas.indices, id: \.self) { i in Text(travas[i]) }
                            }
                        }
                    }
                }
                if mostrarLista {
                    VStack(alignment: .leading, spacing: 8) {
                        RotuloEstudo(texto: "Do mesmo assunto")
                        ForEach(quadro.mesmoAssuntoItens) { item in
                            if let e = store.byId[item.id] {
                                JurisVizinhoLinha(entry: e) { abrir(item.id) }
                            }
                        }
                    }
                }
                QuadroRodape(fonte: quadro.fonte, temQuadro: quadro.temQuadro,
                             semCerteza: quadro.semCerteza ?? [])
            }
        }
    }

    /// O mesmo caminho dos julgados relacionados: em leitura cheia troca o verbete lido; na
    /// lista, muda a seleção.
    private func abrir(_ id: String) {
        if store.leituraID != nil { store.lerCheio(id) } else { store.selectedID = id }
    }
}

/// Título do bloco + o objeto comum + o eixo. O objeto NÃO é linha do quadro: é ele que
/// torna os temas vizinhos, então não separa nada.
private struct QuadroCabecalho: View {
    let objeto: String?
    let eixo: String?
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Image(systemName: "tablecells").font(DS.interface(11)).foregroundStyle(Palette.accent)
                    .accessibilityHidden(true)
                RotuloEstudo(texto: "Não confunda com")
            }
            if let objeto, !objeto.isEmpty {
                QuadroContexto(rotulo: "O que se discute", valor: objeto)
            }
            if let eixo, !eixo.isEmpty {
                QuadroContexto(rotulo: "O que separa", valor: eixo)
            }
        }
    }
}

private struct QuadroContexto: View {
    let rotulo: String
    let valor: String
    var body: some View {
        (Text(rotulo + ": ").font(DS.interface(12, .semibold)).foregroundStyle(Palette.secondaryInk)
         + Text(valor).font(DS.interface(12)).foregroundStyle(Palette.bodyInk))
            .fixedSize(horizontal: false, vertical: true)
    }
}

/// As colunas do quadro, LADO A LADO quando cada uma recebe pelo menos `minimo` pt, e
/// EMPILHADAS quando não. O critério é a largura que o quadro recebe de fato, e não o size
/// class: um iPad em Split View 2/3 continua "regular" com ~416 pt úteis, e a fileira que o
/// iOS usava ali espremia três colunas em ~108 pt de texto — enquanto o Mac, na mesma
/// largura, já empilhava. Agora as duas árvores decidem igual. Tudo ou nada: nunca 2 + 1,
/// porque a coluna órfã numa segunda linha parece outro bloco e a comparação se perde.
/// Lado a lado, as colunas têm a mesma altura, para as bordas de baixo alinharem.
private struct QuadroGrade: Layout {
    var minimo: CGFloat
    var espacamento: CGFloat

    private func larguraDaColuna(_ largura: CGFloat?, _ n: Int) -> CGFloat? {
        guard n > 1, let largura, largura.isFinite else { return nil }
        let w = (largura - espacamento * CGFloat(n - 1)) / CGFloat(n)
        return w >= minimo ? w : nil
    }

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        guard !subviews.isEmpty else { return .zero }
        if let w = larguraDaColuna(proposal.width, subviews.count), let largura = proposal.width {
            let h = subviews.map { $0.sizeThatFits(ProposedViewSize(width: w, height: nil)).height }.max() ?? 0
            return CGSize(width: largura, height: h)
        }
        let largura = proposal.width ?? subviews.map { $0.sizeThatFits(.unspecified).width }.max() ?? 0
        let alturas = subviews.map { $0.sizeThatFits(ProposedViewSize(width: largura, height: nil)).height }
        return CGSize(width: largura, height: alturas.reduce(0, +) + espacamento * CGFloat(subviews.count - 1))
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        if let w = larguraDaColuna(bounds.width, subviews.count) {
            var x = bounds.minX
            for s in subviews {
                s.place(at: CGPoint(x: x, y: bounds.minY), proposal: ProposedViewSize(width: w, height: bounds.height))
                x += w + espacamento
            }
            return
        }
        var y = bounds.minY
        for s in subviews {
            let h = s.sizeThatFits(ProposedViewSize(width: bounds.width, height: nil)).height
            s.place(at: CGPoint(x: bounds.minX, y: y), proposal: ProposedViewSize(width: bounds.width, height: h))
            y += h + espacamento
        }
    }
}

/// UMA coluna: cabeçalho clicável + as células que sobraram do filtro, na ordem canônica.
/// A coluna do verbete aberto se distingue por borda inteira tingida e fundo lavado —
/// nunca por faixa lateral colorida, que a casa proíbe.
private struct QuadroColuna: View {
    let coluna: ColunaQuadro
    let fonte: Fonte?
    let linhas: [LinhaQuadro]
    let abrir: (String) -> Void

    private var cor: Color { coluna.ehAberta ? Palette.accent : Palette.hairline }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            cabecalho
            ForEach(linhas) { linha in
                if let v = coluna.celulasOuVazio.valor(linha) {
                    QuadroCelula(rotulo: linha.rotulo, valor: v)
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous)
            .fill(coluna.ehAberta
                  ? Palette.accent.opacity(ThemeState.t.isDark ? 0.14 : 0.07)
                  : Palette.cardBackground))
        .overlay(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous)
            .strokeBorder(coluna.ehAberta ? cor.opacity(0.55) : cor, lineWidth: coluna.ehAberta ? 1.5 : 1))
    }

    @ViewBuilder private var cabecalho: some View {
        if coluna.ehAberta {
            identificacao
        } else {
            Button { abrir(coluna.id) } label: {
                HStack(alignment: .top, spacing: 6) {
                    identificacao
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.right").font(DS.interface(9, .semibold))
                        .foregroundStyle(.tertiary)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Abrir \(coluna.rotulo)")
        }
    }

    private var identificacao: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(coluna.rotulo).font(DS.interface(13, .bold))
                .foregroundStyle(Palette.titleInk)
                .fixedSize(horizontal: false, vertical: true)
            Flow(espacamento: 5) {
                if coluna.ehAberta { EtiquetaEstudo(texto: "Verbete aberto") }
                // Por que a coluna está aqui ("Mesmo assunto", "Citado na nota de estudo"…).
                // Antes a curada levava "Nota de estudo", o selo de maior credibilidade do
                // bloco — mas o que a nota garante é o ASSUNTO, e a coluna sai de um
                // resolvedor de citação, que é heurística de texto: a etiqueta diz o que se
                // sabe, e não mais.
                if let m = coluna.motivo, !m.isEmpty {
                    EtiquetaEstudo(texto: m, cor: Palette.secondaryInk)
                } else if coluna.ehCurada {
                    EtiquetaEstudo(texto: "Citado na nota de estudo", cor: Palette.secondaryInk)
                }
                if let fonte {
                    FonteBadge(fonte: fonte, compact: true)
                } else if let esp = coluna.especie, !esp.isEmpty {
                    JurisChip(texto: esp)
                }
                if let d = coluna.data, !d.isEmpty {
                    Text(d).font(Typo.num(10.5)).foregroundStyle(Palette.secondaryInk)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Rótulo em cima, valor embaixo: com três colunas numa tela de 390 pt não há largura para
/// o rótulo de 132 pt do MetaRow.
private struct QuadroCelula: View {
    let rotulo: String
    let valor: String
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(rotulo.uppercased()).font(DS.interface(9.5, .bold)).tracking(0.8)
                .foregroundStyle(Palette.secondaryInk)
            Text(valor).font(DS.interface(12.5)).lineSpacing(2)
                .foregroundStyle(Palette.bodyInk)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// De onde o quadro veio e o que não foi conferido — a omissão precisa de sinal visível.
/// Diz também o que o quadro NÃO afirma: a escolha das colunas é proximidade medida, não
/// juízo de que as teses divergem, e "Tese fixada" é a síntese da nota ou a 1ª frase do
/// enunciado, não a tese que o tribunal destacou. Sem quadro, diz por que só há a lista —
/// sem inventar comparação.
private struct QuadroRodape: View {
    let fonte: String?
    let temQuadro: Bool
    let semCerteza: [String]

    private var texto: String {
        if fonte == "ia" { return "Quadro montado por IA a partir do acervo — confira os números antes de decorar." }
        if !temQuadro {
            return "Nenhum destes tem sinal forte de ser trocado pelo verbete aberto (nota de estudo, mesmo assunto, mesmo dispositivo ou enunciado parecido), então não há quadro: são leituras do mesmo assunto, escolhidas pelo vocabulário."
        }
        return "Quadro montado do acervo, sem IA. Cada coluna é um verbete real, e a etiqueta dela diz por que está aqui: proximidade, não juízo de que as teses divergem. “Tese fixada” é a síntese da nota de estudo ou a primeira frase do enunciado; “Termos próprios” são palavras do título e do assunto que o verbete aberto não tem. Confira os números no tribunal."
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(texto)
                .font(DS.interface(11)).italic().foregroundStyle(Palette.secondaryInk)
                .fixedSize(horizontal: false, vertical: true)
            ForEach(semCerteza.indices, id: \.self) { i in
                Text(semCerteza[i]).font(DS.interface(11)).foregroundStyle(Palette.secondaryInk)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

/// A linha de um verbete vizinho — a MESMA peça no bloco "Do mesmo assunto" do roteiro e
/// na seção de mesmo nome que fecha o detalhe, para as duas listas não divergirem no desenho.
/// Sem o filete vertical colorido de antes: faixa lateral é proibida na casa; a cor da
/// fonte já vem no selo.
struct JurisVizinhoLinha: View {
    let entry: JurisEntry
    let abrir: () -> Void

    var body: some View {
        Button(action: abrir) {
            HStack(alignment: .top, spacing: 10) {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        FonteBadge(fonte: entry.fonteKind, compact: true)
                        Text(entry.titulo).font(DS.interface(12.5, .semibold))
                            .foregroundStyle(Palette.titleInk).lineLimit(1)
                    }
                    Text(entry.enunciado).font(Typo.serifBody(11.5))
                        .foregroundStyle(Palette.bodyInk)
                        .lineLimit(2).fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right").font(DS.interface(9, .semibold))
                    .foregroundStyle(.tertiary)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Abrir \(entry.titulo)")
    }
}
