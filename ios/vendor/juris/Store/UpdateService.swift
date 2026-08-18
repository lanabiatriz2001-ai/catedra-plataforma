import Foundation
import Observation
import UserNotifications

/// Atualização online: busca novos informativos diretamente dos sites oficiais
/// do STJ (processo.stj.jus.br) e do STF (stf.jus.br) e acrescenta os julgados
/// ao corpus local (overlay em Application Support).
@Observable
@MainActor
final class UpdateService {
    enum Fase: Equatable {
        case ociosa
        case executando(String)
        case concluida(String)
        case falhou(String)
    }

    var fase: Fase = .ociosa
    var ultimaVerificacao: Date? {
        get { UserDefaults.standard.object(forKey: "ultimaVerificacao") as? Date }
        set { UserDefaults.standard.set(newValue, forKey: "ultimaVerificacao") }
    }

    private static let userAgent =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 VadeMecumJuris/2.0"

    /// Limite de edições novas por execução (não sobrecarregar os sites).
    private let maxEdicoesPorExecucao = 12

    // MARK: - Orquestração

    func atualizar(store: LibraryStore) async {
        guard fase != .executando("") else { return }
        var novos: [JurisEntry] = []
        var notas: [String] = []
        var eventos: [NovidadeEvent] = []

        // STJ
        fase = .executando("Consultando informativos do STJ…")
        do {
            let maxSTJ = store.maxInformativo(.informativoSTJ)
            let novosSTJ = try await novasEdicoesSTJ(desde: maxSTJ)
            novos += novosSTJ.flatMap(\.entradas)
            eventos += novosSTJ.map { evento(.informativoSTJ, numero: $0.numero, edicao: $0) }
            if novosSTJ.isEmpty {
                notas.append("STJ: nenhum informativo novo")
            } else {
                notas.append("STJ: \(novosSTJ.count) informativo(s) novo(s), \(novosSTJ.map(\.entradas.count).reduce(0,+)) julgados")
            }
        } catch {
            notas.append("STJ indisponível (\(error.localizedDescription))")
        }

        // STF — informativos
        fase = .executando("Consultando informativos do STF…")
        do {
            let maxSTF = store.maxInformativo(.informativoSTF)
            let novosSTF = try await novasEdicoesSTF(desde: maxSTF)
            novos += novosSTF.flatMap(\.entradas)
            eventos += novosSTF.map { evento(.informativoSTF, numero: $0.numero, edicao: $0) }
            if novosSTF.isEmpty {
                notas.append("STF: nenhum informativo novo")
            } else {
                notas.append("STF: \(novosSTF.count) informativo(s) novo(s), \(novosSTF.map(\.entradas.count).reduce(0,+)) julgados")
            }
        } catch {
            notas.append("STF indisponível (\(error.localizedDescription))")
        }

        // STF — súmulas novas (API oficial via página, por causa do WAF)
        fase = .executando("Consultando súmulas do STF…")
        do {
            let novasSum = try await novasSumulasSTF(store: store)
            novos += novasSum
            if !novasSum.isEmpty {
                let ts = Date().timeIntervalSince1970
                eventos.append(NovidadeEvent(
                    id: "nov-sumula_stf-\(Int(ts))",
                    timestamp: ts, fonte: Fonte.sumulaSTF.rawValue,
                    titulo: novasSum.count == 1 ? "Nova súmula do STF" : "\(novasSum.count) novas súmulas do STF",
                    detalhe: novasSum.map(\.titulo).prefix(3).joined(separator: " · "),
                    ids: novasSum.map(\.id)))
            }
            notas.append(novasSum.isEmpty ? "Súmulas STF em dia"
                                          : "Súmulas STF: +\(novasSum.count) nova(s)")
        } catch {
            notas.append("Súmulas STF: indisponível")
        }

        // STF — controle concentrado (ADI/ADC/ADO/ADPF, API oficial via página)
        fase = .executando("Consultando ADI/ADC/ADO/ADPF no STF…")
        do {
            let novosCC = try await novoControleConcentradoSTF(store: store)
            novos += novosCC
            if !novosCC.isEmpty {
                let ts = Date().timeIntervalSince1970
                eventos.append(NovidadeEvent(
                    id: "nov-stf_cc-\(Int(ts))",
                    timestamp: ts, fonte: Fonte.adi.rawValue,
                    titulo: "Controle concentrado do STF: +\(novosCC.count) decisõe\(novosCC.count == 1 ? "" : "s")",
                    detalhe: novosCC.map(\.titulo).prefix(3).joined(separator: " · "),
                    ids: novosCC.map(\.id)))
            }
            notas.append(novosCC.isEmpty ? "ADI/ADC/ADO/ADPF em dia"
                                         : "Controle concentrado: +\(novosCC.count)")
        } catch {
            notas.append("Controle concentrado STF: indisponível")
        }

        // Persistir overlay e recarregar
        if !novos.isEmpty {
            do {
                try salvarOverlay(novos, em: store.onlineCorpusURL)
                await store.reload()
                store.registrarNovidades(eventos)
                notificar(eventos)
            } catch {
                notas.append("erro ao salvar: \(error.localizedDescription)")
            }
        }
        ultimaVerificacao = Date()
        let resumo = notas.joined(separator: " · ")
        fase = novos.isEmpty ? .concluida(resumo) : .concluida("+\(novos.count) verbetes — " + resumo)
    }

    /// Pede permissão de notificação (idempotente).
    func pedirPermissaoNotificacao() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in }
    }

    /// Notificação local resumindo as novidades encontradas.
    private func notificar(_ eventos: [NovidadeEvent]) {
        guard !eventos.isEmpty else { return }
        let center = UNUserNotificationCenter.current()
        center.getNotificationSettings { settings in
            guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }
            let content = UNMutableNotificationContent()
            let total = eventos.reduce(0) { $0 + $1.ids.count }
            content.title = "Jurisprudência atualizada"
            if eventos.count == 1 {
                content.body = "\(eventos[0].titulo) — \(eventos[0].detalhe)"
            } else {
                content.body = "\(eventos.count) atualizações · \(total) verbetes novos dos tribunais"
            }
            content.sound = .default
            let req = UNNotificationRequest(identifier: "novidades-\(Int(Date().timeIntervalSince1970))",
                                            content: content, trigger: nil)
            center.add(req)
        }
    }

    /// Monta um evento de novidade a partir de uma edição de informativo baixada.
    private func evento(_ fonte: Fonte, numero: Int, edicao: EdicaoBaixada) -> NovidadeEvent {
        let ts = Date().timeIntervalSince1970
        var detalhe = "\(edicao.entradas.count) julgado\(edicao.entradas.count == 1 ? "" : "s") novo\(edicao.entradas.count == 1 ? "" : "s")"
        if let p = edicao.pub, !p.isEmpty { detalhe += " · \(p)" }
        return NovidadeEvent(
            id: "nov-\(fonte.rawValue)-\(numero)",
            timestamp: ts, fonte: fonte.rawValue,
            titulo: "Informativo \(fonte == .informativoSTF ? "STF" : "STJ") nº \(numero)",
            detalhe: detalhe, ids: edicao.entradas.map(\.id))
    }

    /// Executa a verificação automática se estiver habilitada e fizer >20h da última.
    func verificacaoAutomatica(store: LibraryStore) async {
        // padrão: ligado (chave ainda não definida = true)
        let auto = UserDefaults.standard.object(forKey: "autoAtualizar") as? Bool ?? true
        guard auto else { return }
        if let ultima = ultimaVerificacao, Date().timeIntervalSince(ultima) < 20 * 3600 { return }
        await atualizar(store: store)
    }

    private func salvarOverlay(_ novos: [JurisEntry], em url: URL) throws {
        var existentes: [JurisEntry] = []
        if let d = try? Data(contentsOf: url),
           let cur = try? JSONDecoder().decode([JurisEntry].self, from: d) {
            existentes = cur
        }
        var vistos = Set(existentes.map(\.id))
        for e in novos where !vistos.contains(e.id) {
            existentes.append(e); vistos.insert(e.id)
        }
        let enc = JSONEncoder()
        enc.outputFormatting = [.withoutEscapingSlashes]
        try enc.encode(existentes).write(to: url, options: .atomic)
    }

    // MARK: - Rede

    private func fetch(_ urlString: String) async throws -> String {
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        var req = URLRequest(url: url)
        req.setValue(Self.userAgent, forHTTPHeaderField: "User-Agent")
        req.timeoutInterval = 30
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        return String(data: data, encoding: .utf8)
            ?? String(data: data, encoding: .isoLatin1)
            ?? ""
    }

    // MARK: - STJ

    struct EdicaoBaixada { let numero: Int; let entradas: [JurisEntry]; var pub: String? = nil }

    /// Lê o combo de edições da página-base e baixa as edições novas.
    private func novasEdicoesSTJ(desde maxConhecido: Int) async throws -> [EdicaoBaixada] {
        let base = try await fetch("https://processo.stj.jus.br/jurisprudencia/externo/informativo/")
        // <option value="0894">Nº 894 Publicação 30 de junho de 2026.</option>
        var edicoes: [(cod: String, numero: Int, pub: String)] = []
        for m in matches(#"<option value="(\d{4})">Nº\s*(\d+)[^<]*?Publicação\s*([^<.]+)"#, base) {
            if let n = Int(m[2]) {
                edicoes.append((cod: m[1], numero: n, pub: m[3].trimmingCharacters(in: .whitespaces)))
            }
        }
        let novas = edicoes.filter { $0.numero > maxConhecido }
            .sorted { $0.numero < $1.numero }
            .prefix(maxEdicoesPorExecucao)

        var out: [EdicaoBaixada] = []
        for ed in novas {
            fase = .executando("Baixando Informativo STJ nº \(ed.numero)…")
            let url = "https://processo.stj.jus.br/jurisprudencia/externo/informativo/?acao=pesquisarumaedicao&livre=%27\(ed.cod)%27.cod."
            let html = try await fetch(url)
            let entradas = parseJulgadosSTJ(html, edicao: ed.numero, publicacao: ed.pub, urlEdicao: url)
            if !entradas.isEmpty { out.append(EdicaoBaixada(numero: ed.numero, entradas: entradas, pub: ed.pub)) }
            try? await Task.sleep(nanoseconds: 700_000_000)   // cortesia com o servidor
        }
        return out
    }

    /// Extrai os julgados de uma edição HTML do informativo do STJ.
    /// Estrutura: sequência de células rotuladas — Processo / Ramo do Direito /
    /// Tema / Destaque / Informações do Inteiro Teor.
    func parseJulgadosSTJ(_ html: String, edicao: Int, publicacao: String, urlEdicao: String) -> [JurisEntry] {
        // Varredura sequencial: cada rótulo (clsInformativoLabel) é seguido da
        // célula de valor (clsInformativoTexto*); o valor termina na próxima
        // linha estrutural (divLinha / próximo rótulo / rodapé).
        var pares: [(label: String, text: String)] = []
        var cursor = html.startIndex
        while let lr = html.range(of: "clsInformativoLabel", range: cursor..<html.endIndex) {
            guard let vm = html.range(of: "clsInformativoTexto", range: lr.upperBound..<html.endIndex) else { break }
            let labelHTML = String(html[lr.upperBound..<vm.lowerBound])
            guard let gt = html.range(of: ">", range: vm.upperBound..<html.endIndex) else { break }
            let fins = ["divLinha", "clsInformativoLabel", "clsInformativoOrgaojulgador", "id=\"rodape", "<footer"]
                .compactMap { html.range(of: $0, range: gt.upperBound..<html.endIndex)?.lowerBound }
            var fim = fins.min() ?? html.endIndex
            // o marcador está dentro de uma tag de abertura: recua até o '<' anterior
            if fim < html.endIndex,
               let abre = html.range(of: "<", options: .backwards, range: gt.upperBound..<fim)?.lowerBound {
                fim = abre
            }
            let valorHTML = String(html[gt.upperBound..<fim])

            // rótulo = primeira linha de texto após remover tags
            let labelLimpo = limparHTML(labelHTML)
                .trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
            let label = labelLimpo.components(separatedBy: "\n").first?
                .trimmingCharacters(in: .whitespaces) ?? ""
            pares.append((label: label, text: limparHTML(valorHTML)))
            cursor = fim
        }

        var out: [JurisEntry] = []
        var atual: [String: String] = [:]
        var seq = 0
        func flush() {
            guard let destaque = atual["Destaque"] ?? atual["Tema"], !destaque.isEmpty else { atual = [:]; return }
            seq += 1
            let processo = atual["Processo"]
            let dataJulg = processo.flatMap { p -> String? in
                matches(#"julgad[oa] em (\d{1,2}/\d{1,2}/\d{4})"#, p).first?[1]
            }
            out.append(JurisEntry(
                id: String(format: "INFSTJ-%04d-%02d", edicao, seq),
                tribunal: "STJ", fonte: Fonte.informativoSTJ.rawValue, numero: edicao,
                titulo: "Info \(edicao) · STJ",
                enunciado: destaque,
                ramoDireito: normalizarRamo(atual["Ramo do Direito"]),
                tema: atual["Tema"].map { String($0.prefix(300)) },
                orgaoJulgador: nil,
                data: dataJulg ?? publicacao,
                situacao: nil, fontePublicacao: "Informativo de Jurisprudência STJ n. \(edicao)",
                referencias: nil,
                precedentes: processo,
                observacao: nil, url: urlEdicao,
                comentario: atual["Informações do Inteiro Teor"]))
            atual = [:]
        }
        for (label, text) in pares {
            if label.hasPrefix("Processo") && atual["Processo"] != nil { flush() }
            switch label {
            case let l where l.hasPrefix("Processo"): atual["Processo", default: ""] += (atual["Processo"] == nil ? "" : " ") + text
            case let l where l.hasPrefix("Ramo"): atual["Ramo do Direito"] = text
            case "Tema": atual["Tema"] = text
            case "Destaque": atual["Destaque"] = text
            case let l where l.hasPrefix("Informações do Inteiro"): atual["Informações do Inteiro Teor"] = text
            default: break
            }
        }
        flush()
        return out
    }

    // MARK: - STF

    /// Tenta baixar informativos sequenciais informativoN.htm a partir do último conhecido.
    private func novasEdicoesSTF(desde maxConhecido: Int) async throws -> [EdicaoBaixada] {
        guard maxConhecido > 0 else { return [] }   // sem base local, não adivinhar
        var out: [EdicaoBaixada] = []
        var n = maxConhecido + 1
        var falhas = 0
        while out.count < maxEdicoesPorExecucao && falhas < 2 {
            fase = .executando("Verificando Informativo STF nº \(n)…")
            let url = "https://www.stf.jus.br/arquivo/informativo/documento/informativo\(n).htm"
            do {
                let html = try await fetch(url)
                guard html.count > 20_000 else { falhas += 1; n += 1; continue }
                let entradas = parseInformativoSTF(html, numero: n, urlEdicao: url)
                if !entradas.isEmpty { out.append(EdicaoBaixada(numero: n, entradas: entradas)) }
                falhas = 0
            } catch {
                falhas += 1
            }
            n += 1
            try? await Task.sleep(nanoseconds: 700_000_000)
        }
        return out
    }

    /// Extrai os julgados de um informativo do STF (HTM estilo Word).
    /// Padrão do corpo: DIREITO X (ramo) → TEMA EM CAPS → título → "- ADI 5.662/AC" → "Resumo: ..."
    func parseInformativoSTF(_ html: String, numero: Int, urlEdicao: String) -> [JurisEntry] {
        let inicio: String.Index = html.range(of: "<body")?.lowerBound ?? html.startIndex
        let corpo = String(html[inicio...])
        let texto = limparHTML(corpo)
        let linhas: [String] = texto.components(separatedBy: "\n")
            .map { (l: String) in l.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }

        var out: [JurisEntry] = []
        var ramo: String?
        var tema: String?
        var janela: [String] = []   // últimas linhas antes do Resumo (título + processo)
        var resumo: [String] = []
        var lendoResumo = false
        var seq = 0

        func isCaps(_ s: String) -> Bool {
            let letters = s.filter(\.isLetter)
            guard letters.count > 3 else { return false }
            return letters.allSatisfy { !$0.isLowercase }
        }
        let processoRe = #"((?:ADI|ADC|ADPF|ADO|RE|ARE|RHC|HC|MS|MI|Rcl|AO|AP|Pet|Inq|EXT|RvC|SL|STA|SS)(?:\s+[\d.]+)[\w./ -]{0,20})"#

        func flush() {
            let enun = resumo.joined(separator: " ").trimmingCharacters(in: .whitespaces)
            if !enun.isEmpty {
                seq += 1
                let contexto = janela.joined(separator: " ")
                let processo = matches(processoRe, contexto).last?[1]
                    .trimmingCharacters(in: .whitespaces)
                // título do julgado: linhas em minúsculas da janela, sem a referência do processo
                var titLines = janela.filter { !isCaps($0) && $0.count > 10 }
                if titLines.count > 3 { titLines = Array(titLines.suffix(3)) }
                var titulo = titLines.joined(separator: " ")
                if let p = processo, let r = titulo.range(of: p) { titulo.removeSubrange(r) }
                titulo = titulo.replacingOccurrences(of: #"\s*-\s*$"#, with: "", options: .regularExpression)
                    .trimmingCharacters(in: .whitespaces)
                out.append(JurisEntry(
                    id: String(format: "INFSTF-%04d-%02d", numero, seq),
                    tribunal: "STF", fonte: Fonte.informativoSTF.rawValue, numero: numero,
                    titulo: "Info \(numero) · STF",
                    enunciado: enun,
                    ramoDireito: normalizarRamo(ramo),
                    tema: titulo.isEmpty ? tema : String(titulo.prefix(300)),
                    orgaoJulgador: nil, data: nil, situacao: nil,
                    fontePublicacao: "Informativo STF n. \(numero)",
                    referencias: nil, precedentes: processo,
                    observacao: nil, url: urlEdicao, comentario: nil))
            }
            janela = []; resumo = []; lendoResumo = false
        }

        for linha in linhas {
            if linha.hasPrefix("Resumo:") {
                lendoResumo = true
                let r = String(linha.dropFirst("Resumo:".count)).trimmingCharacters(in: .whitespaces)
                if !r.isEmpty { resumo.append(r) }
                continue
            }
            if lendoResumo {
                // um novo cabeçalho em CAPS ou "DIREITO X" encerra o resumo corrente
                if isCaps(linha) || linha.hasPrefix("Inovações Normativas") {
                    flush()
                    if linha.uppercased().hasPrefix("DIREITO ") { ramo = linha } else { tema = linha }
                } else {
                    resumo.append(linha)
                }
                continue
            }
            if linha.uppercased().hasPrefix("DIREITO ") && isCaps(linha) {
                ramo = linha; janela = []; continue
            }
            if isCaps(linha) { tema = linha; janela = []; continue }
            janela.append(linha)
            if janela.count > 8 { janela.removeFirst() }
        }
        flush()
        return out
    }

    // MARK: - STF Súmulas (API oficial)

    /// Busca as súmulas mais recentes na base oficial do STF e devolve as que
    /// ainda não existem no corpus local.
    private func novasSumulasSTF(store: LibraryStore) async throws -> [JurisEntry] {
        let fetcher = WebAPIFetcher()
        let script = """
        const r = await fetch("https://jurisprudencia.stf.jus.br/api/search/search", {
          method: "POST", headers: {"Content-Type": "application/json"},
          body: JSON.stringify({size: 40, sort: [{"julgamento_data": "desc"}],
            query: {bool: {filter: [{term: {base: "sumulas"}}]}},
            _source: ["titulo","sumula_numero","is_vinculante","sumula_texto","situacao_sumula",
                      "ramo_direito","julgamento_data","orgao_julgador","processo_precedente_texto"]})
        });
        return await r.text();
        """
        let jsonText = try await fetcher.fetchViaPage(
            pageURL: URL(string: "https://jurisprudencia.stf.jus.br/pages/search?base=sumulas")!,
            script: script)

        struct APIResp: Decodable {
            struct Result: Decodable { let hits: Hits }
            struct Hits: Decodable { let hits: [Hit] }
            struct Hit: Decodable { let _source: Source }
            struct Source: Decodable {
                let titulo: String?
                let sumula_numero: Int?
                let is_vinculante: Bool?
                let sumula_texto: String?
                let situacao_sumula: String?
                let ramo_direito: String?
                let julgamento_data: String?
                let orgao_julgador: String?
                let processo_precedente_texto: String?
            }
            let result: Result
        }
        guard let data = jsonText.data(using: .utf8),
              let resp = try? JSONDecoder().decode(APIResp.self, from: data) else {
            throw WebAPIFetcher.FetchError.badResult
        }

        var out: [JurisEntry] = []
        for s in resp.result.hits.hits.map(\._source) {
            guard let n = s.sumula_numero, let texto = s.sumula_texto, !texto.isEmpty else { continue }
            let vinc = s.is_vinculante ?? false
            let id = vinc ? "STF-SV-\(n)" : "STF-SUM-\(n)"
            guard store.byId[id] == nil else { continue }
            var dataBR: String? = nil
            if let d = s.julgamento_data, let m = matches(#"(\d{4})-(\d{2})-(\d{2})"#, d).first {
                dataBR = "\(m[3])/\(m[2])/\(m[1])"
            }
            out.append(JurisEntry(
                id: id, tribunal: "STF", fonte: Fonte.sumulaSTF.rawValue, numero: n,
                titulo: s.titulo?.replacingOccurrences(of: "Súmula vinculante", with: "Súmula Vinculante")
                    ?? (vinc ? "Súmula Vinculante \(n)" : "Súmula \(n)"),
                enunciado: texto.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression),
                ramoDireito: normalizarRamo(s.ramo_direito),
                tema: nil, orgaoJulgador: s.orgao_julgador, data: dataBR,
                situacao: s.situacao_sumula, fontePublicacao: nil, referencias: nil,
                precedentes: s.processo_precedente_texto,
                observacao: nil, url: nil, comentario: nil, importante: vinc))
        }
        return out
    }

    // MARK: - STF Controle concentrado (ADI/ADC/ADO/ADPF — API oficial)

    /// Busca os acórdãos mais recentes de ADI/ADC/ADO/ADPF na base oficial de
    /// jurisprudência do STF (mesma API das súmulas, via página por causa do WAF)
    /// e devolve os que ainda não existem no corpus local. A classe é confirmada
    /// NO CLIENTE pelo título do acórdão ("ADI 5529", "ADPF 54 MC"…), então um
    /// eventual ruído da busca não contamina as fontes.
    private func novoControleConcentradoSTF(store: LibraryStore) async throws -> [JurisEntry] {
        let fetcher = WebAPIFetcher()
        let script = """
        const r = await fetch("https://jurisprudencia.stf.jus.br/api/search/search", {
          method: "POST", headers: {"Content-Type": "application/json"},
          body: JSON.stringify({size: 150, sort: [{"julgamento_data": "desc"}],
            query: {bool: {filter: [{term: {base: "acordaos"}}],
                           should: [{match_phrase_prefix: {titulo: "ADI"}},
                                    {match_phrase_prefix: {titulo: "ADC"}},
                                    {match_phrase_prefix: {titulo: "ADO"}},
                                    {match_phrase_prefix: {titulo: "ADPF"}}],
                           minimum_should_match: 1}},
            _source: ["titulo","ementa_texto","ementa","julgamento_data","dje_data",
                      "relator_processo_nome","orgao_julgador","ramo_direito"]})
        });
        return await r.text();
        """
        let jsonText = try await fetcher.fetchViaPage(
            pageURL: URL(string: "https://jurisprudencia.stf.jus.br/pages/search?base=acordaos")!,
            script: script)

        struct APIResp: Decodable {
            struct Result: Decodable { let hits: Hits }
            struct Hits: Decodable { let hits: [Hit] }
            struct Hit: Decodable { let _source: Source }
            struct Source: Decodable {
                let titulo: String?
                let ementa_texto: String?
                let ementa: String?
                let julgamento_data: String?
                let dje_data: String?
                let relator_processo_nome: String?
                let orgao_julgador: String?
                let ramo_direito: String?
            }
            let result: Result
        }
        guard let data = jsonText.data(using: .utf8),
              let resp = try? JSONDecoder().decode(APIResp.self, from: data) else {
            throw WebAPIFetcher.FetchError.badResult
        }

        let classes: [String: Fonte] = ["ADI": .adi, "ADC": .adc, "ADO": .ado, "ADPF": .adpf]
        var out: [JurisEntry] = []
        for s in resp.result.hits.hits.map(\._source) {
            guard let tituloBruto = s.titulo?.trimmingCharacters(in: .whitespacesAndNewlines),
                  !tituloBruto.isEmpty else { continue }
            // Confirma a classe pelo título ("ADPF 54 MC" → ADPF + "54" + "MC").
            guard let m = matches(#"^(ADI|ADC|ADO|ADPF)[\s-]+([\d.]+)(.*)$"#, tituloBruto).first,
                  let fonte = classes[m[1].uppercased()] else { continue }
            let numero = Int(m[2].replacingOccurrences(of: ".", with: ""))
            let sufixo = m[3].trimmingCharacters(in: .whitespaces)
            let ementaBruta = s.ementa_texto ?? s.ementa ?? ""
            let ementa = limparHTML(ementaBruta).trimmingCharacters(in: .whitespacesAndNewlines)
            guard !ementa.isEmpty else { continue }
            // Id estável a partir do título (o mesmo acórdão volta com o mesmo título).
            let slug = tituloBruto.uppercased()
                .replacingOccurrences(of: #"[^A-Z0-9]+"#, with: "-", options: .regularExpression)
                .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
            let id = "STF-CC-\(slug)"
            guard store.byId[id] == nil else { continue }
            var dataBR: String? = nil
            if let d = s.julgamento_data ?? s.dje_data,
               let dm = matches(#"(\d{4})-(\d{2})-(\d{2})"#, d).first {
                dataBR = "\(dm[3])/\(dm[2])/\(dm[1])"
            }
            var obs: [String] = []
            if let r = s.relator_processo_nome, !r.isEmpty { obs.append("Relator(a): \(r)") }
            if !sufixo.isEmpty { obs.append("Incidente: \(sufixo)") }
            out.append(JurisEntry(
                id: id, tribunal: "STF", fonte: fonte.rawValue, numero: numero,
                titulo: tituloBruto,
                enunciado: String(ementa.prefix(6000)),
                ramoDireito: normalizarRamo(s.ramo_direito) ?? "Direito Constitucional",
                tema: nil, orgaoJulgador: s.orgao_julgador ?? "Tribunal Pleno", data: dataBR,
                situacao: nil, fontePublicacao: "Portal de Jurisprudência do STF", referencias: nil,
                precedentes: nil, observacao: obs.isEmpty ? nil : obs.joined(separator: " · "),
                url: nil, comentario: nil, importante: false))
        }
        return out
    }

    // MARK: - Utilidades

    /// Remove tags/entidades HTML preservando quebras significativas.
    nonisolated func limparHTML(_ s: String) -> String {
        var t = s
        for (a, b) in [("<br>", "\n"), ("<br/>", "\n"), ("<br />", "\n"), ("</p>", "\n"), ("</div>", "\n")] {
            t = t.replacingOccurrences(of: a, with: b, options: .caseInsensitive)
        }
        // remove blocos de tooltip ODS (ruído da agenda 2030 nas células "Tema")
        t = t.replacingOccurrences(of: #"<a href="https://brasil\.un\.org[\s\S]*?</a>"#,
                                   with: "", options: .regularExpression)
        t = t.replacingOccurrences(of: "<[^>]+>", with: " ", options: .regularExpression)
        for (a, b) in [("\u{00A0}", " "), ("&nbsp;", " "), ("&amp;", "&"), ("&quot;", "\""), ("&#8220;", "\u{201C}"),
                       ("&#8221;", "\u{201D}"), ("&#8211;", "–"), ("&#8212;", "—"), ("&lt;", "<"),
                       ("&gt;", ">"), ("&eacute;", "é"), ("&atilde;", "ã"), ("&ccedil;", "ç")] {
            t = t.replacingOccurrences(of: a, with: b)
        }
        // ruído residual dos tooltips ODS
        t = t.replacingOccurrences(of: #"Objetivo \d+\.[^\n]*"#, with: "", options: .regularExpression)
        t = t.replacingOccurrences(of: #"target="new">"#, with: "")
        t = t.replacingOccurrences(of: #"[ \t]+"#, with: " ", options: .regularExpression)
        t = t.replacingOccurrences(of: #"\n\s*\n+"#, with: "\n", options: .regularExpression)
        return t.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    nonisolated func normalizarRamo(_ v: String?) -> String? {
        guard var s = v?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty else { return nil }
        s = s.replacingOccurrences(of: #"[\s\r\n]+"#, with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
        // corta qualquer resíduo após o nome do ramo (fragmentos de marcação)
        if let r = s.range(of: #"[<>"=]"#, options: .regularExpression) {
            s = String(s[..<r.lowerBound])
        }
        // apara qualquer caractere não-letra nas pontas (inclui espaços invisíveis)
        while let f = s.first, !f.isLetter { s.removeFirst() }
        while let l = s.last, !l.isLetter { s.removeLast() }
        guard !s.isEmpty else { return nil }
        let menores: Set<String> = ["de", "do", "da", "dos", "das", "e", "em", "a", "à", "o", "com", "para", "no", "na"]
        let palavras = s.lowercased().split(separator: " ").enumerated().map { i, p -> String in
            let w = String(p)
            if i > 0 && menores.contains(w) { return w }
            return w.prefix(1).uppercased() + w.dropFirst()
        }
        var r = palavras.joined(separator: " ")
        if !r.lowercased().hasPrefix("direito") { r = "Direito " + r }
        return r
    }

    /// Regex helper: retorna lista de matches; cada match é [full, g1, g2, ...].
    nonisolated func matches(_ pattern: String, _ text: String) -> [[String]] {
        guard let re = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else { return [] }
        let ns = text as NSString
        return re.matches(in: text, range: NSRange(location: 0, length: ns.length)).map { m in
            (0..<m.numberOfRanges).map { i in
                m.range(at: i).location == NSNotFound ? "" : ns.substring(with: m.range(at: i))
            }
        }
    }
}
