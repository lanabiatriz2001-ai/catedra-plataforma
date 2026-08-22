import SwiftUI

// MARK: - Resumo semanal de informativos (IA)
// "O que saiu dos tribunais esta semana — e o que disso cai na SUA prova."
// Ancorado nas NOVIDADES reais (NovidadeEvent → verbetes), cruzado com as
// disciplinas do edital espelhadas do Cátedra. O resumo é cacheado (UserDefaults)
// e só se refaz quando chegam novidades novas ou a usuária pede.

/// Saída estruturada da IA — tolerante a campos faltando (decode manual).
struct ResumoSemanalIA: Codable {
    struct Destaque: Codable, Identifiable {
        var tribunal: String = ""
        var titulo: String = ""
        var porque: String = ""
        var id: String { tribunal + titulo }
    }
    struct EditalHit: Codable, Identifiable {
        var disciplina: String = ""
        var itens: [String] = []
        var id: String { disciplina }
    }
    var manchete: String = ""
    var destaques: [Destaque] = []
    var edital: [EditalHit] = []
    var alerta: String = ""

    private enum CodingKeys: String, CodingKey { case manchete, destaques, edital, alerta }
    init() {}
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        manchete = (try? c.decode(String.self, forKey: .manchete)) ?? ""
        destaques = (try? c.decode([Destaque].self, forKey: .destaques)) ?? []
        edital = (try? c.decode([EditalHit].self, forKey: .edital)) ?? []
        alerta = (try? c.decode(String.self, forKey: .alerta)) ?? ""
    }
}

/// Cache local do resumo (não sincroniza — é derivado, regenerável).
struct ResumoSemanalCache: Codable {
    var json: String
    var geradoEm: Date
    var chave: String     // muda quando chegam novidades novas → oferece "Atualizar"
}

struct ResumoSemanalCard: View {
    @Environment(LibraryStore.self) private var store
    @State private var busy = false
    @State private var erro: String?
    @State private var cache: ResumoSemanalCache? = Self.loadCache()

    private static let cacheKey = "jurisResumoSemanal"

    // Novidades da última semana; sem nenhuma, cai nos 3 lotes mais recentes
    // (o resumo continua útil mesmo numa semana parada dos tribunais).
    private var lotes: [NovidadeEvent] {
        let corte = Date().addingTimeInterval(-7 * 24 * 3600)
        let recentes = store.novidades.filter { $0.data > corte }
        return recentes.isEmpty ? Array(store.novidades.prefix(3)) : recentes
    }
    /// Identidade do conteúdo coberto — novidades novas mudam a chave.
    private var chaveAtual: String {
        lotes.map(\.id).sorted().joined(separator: "|") + "·ed\(store.editalDisciplinas.count)"
    }
    private var resumo: ResumoSemanalIA? {
        guard let c = cache, let data = c.json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(ResumoSemanalIA.self, from: data)
    }
    private var desatualizado: Bool { cache != nil && cache?.chave != chaveAtual }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            if let r = resumo {
                conteudo(r)
            } else {
                vazio
            }
        }
        .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: Palette.rHero, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Palette.rHero, style: .continuous).strokeBorder(Palette.hairline, lineWidth: 1))
        .shadow(color: Palette.accent.opacity(0.12), radius: 14, y: 6)
        .padding(.horizontal, 26)
    }

    // Faixa gradiente (vitrine) com título serifado + estado do cache.
    private var header: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous)
                .fill(LinearGradient(colors: [Palette.accent, Palette.accentSoft],
                                     startPoint: .topLeading, endPoint: .bottomTrailing))
                .frame(width: 38, height: 38)
                .overlay(Image(systemName: "newspaper.fill")
                    .font(.system(size: 16, weight: .semibold)).foregroundStyle(.white))
                .shadow(color: Palette.accent.opacity(0.4), radius: 7, y: 3)
            VStack(alignment: .leading, spacing: 1) {
                Text("Resumo da semana").font(Typo.serifTitle(18, .bold)).foregroundStyle(Palette.titleInk)
                Text(subtitulo).font(.system(size: 11.5)).foregroundStyle(Palette.secondaryInk).lineLimit(1)
            }
            Spacer()
            if busy {
                ProgressView().controlSize(.small)
            } else {
                Button {
                    Task { await gerar() }
                } label: {
                    Label(cache == nil ? "Gerar com IA" : (desatualizado ? "Atualizar" : "Regerar"),
                          systemImage: "sparkles")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 13).padding(.vertical, 7)
                        .background(Capsule().fill(LinearGradient(colors: [Palette.accent, Palette.accentSoft],
                                                                  startPoint: .leading, endPoint: .trailing)))
                        .shadow(color: Palette.accent.opacity(0.4), radius: 6, y: 3)
                }
                .buttonStyle(.plain)
                .disabled(lotes.isEmpty)
                .help(lotes.isEmpty ? "Sem novidades dos tribunais para resumir"
                                    : "Resume os julgados novos e cruza com o seu edital")
            }
        }
        .padding(.horizontal, 18).padding(.vertical, 14)
    }

    private var subtitulo: String {
        if lotes.isEmpty { return "sem novidades dos tribunais por enquanto" }
        let n = lotes.reduce(0) { $0 + $1.ids.count }
        let fontes = Array(Set(lotes.map { $0.fonteKind.nome })).sorted().prefix(3).joined(separator: " · ")
        if let c = cache, !desatualizado {
            return "gerado \(c.geradoEm.formatted(date: .abbreviated, time: .shortened)) · \(n) julgados"
        }
        return "\(n) julgado\(n == 1 ? "" : "s") novo\(n == 1 ? "" : "s") · \(fontes)\(desatualizado ? " · há novidades desde o último resumo" : "")"
    }

    @ViewBuilder private var vazio: some View {
        VStack(alignment: .leading, spacing: 6) {
            Rectangle().fill(Palette.hairline).frame(height: 1)
            Text(lotes.isEmpty
                 ? "Quando os tribunais publicarem informativos novos, o resumo da semana aparece aqui."
                 : "Toque em “Gerar com IA” para um apanhado dos julgados novos — com o que toca as matérias do seu edital e um alerta de prova.")
                .font(.system(size: 12.5)).foregroundStyle(Palette.secondaryInk)
                .lineSpacing(2.5)
                .padding(.horizontal, 18).padding(.vertical, 13)
            if let erro {
                Text(erro).font(.system(size: 11.5)).foregroundStyle(Palette.bad)
                    .padding(.horizontal, 18).padding(.bottom, 12)
            }
        }
    }

    @ViewBuilder private func conteudo(_ r: ResumoSemanalIA) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Rectangle().fill(Palette.hairline).frame(height: 1)
            VStack(alignment: .leading, spacing: 14) {
                if !r.manchete.isEmpty {
                    Text(r.manchete)
                        .font(Typo.serifBody(14.5, .medium)).italic()
                        .foregroundStyle(Palette.titleInk)
                        .lineSpacing(3)
                        .fixedSize(horizontal: false, vertical: true)
                }
                if !r.destaques.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        secTitulo("Destaques da semana", "star.fill")
                        ForEach(r.destaques) { d in
                            HStack(alignment: .top, spacing: 10) {
                                Text(d.tribunal)
                                    .font(.system(size: 9.5, weight: .heavy)).tracking(0.4)
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 7).padding(.vertical, 3)
                                    .background(RoundedRectangle(cornerRadius: 6).fill(Palette.accent))
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(d.titulo).font(.system(size: 13, weight: .semibold))
                                        .foregroundStyle(Palette.titleInk)
                                        .fixedSize(horizontal: false, vertical: true)
                                    Text(d.porque).font(.system(size: 12)).foregroundStyle(Palette.bodyInk)
                                        .lineSpacing(2).fixedSize(horizontal: false, vertical: true)
                                }
                            }
                        }
                    }
                }
                if !r.edital.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        secTitulo("No seu edital", "graduationcap.fill")
                        ForEach(r.edital) { hit in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(hit.disciplina)
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundStyle(RamoStyle.color(hit.disciplina))
                                ForEach(Array(hit.itens.enumerated()), id: \.offset) { _, item in
                                    Text("•  " + item).font(.system(size: 12)).foregroundStyle(Palette.bodyInk)
                                        .lineSpacing(2).fixedSize(horizontal: false, vertical: true)
                                }
                            }
                            .padding(10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous)
                                .fill(RamoStyle.color(hit.disciplina).opacity(0.06)))
                        }
                    }
                }
                if !r.alerta.isEmpty {
                    HStack(alignment: .top, spacing: 9) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 12)).foregroundStyle(Palette.warn)
                        Text(r.alerta).font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Palette.titleInk)
                            .lineSpacing(2).fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(11)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous).fill(Palette.warn.opacity(0.10)))
                }
                HStack {
                    Button { store.ir(.novidades) } label: {
                        Label("Ver os julgados", systemImage: "arrow.right")
                            .font(.system(size: 11.5, weight: .semibold))
                            .foregroundStyle(Palette.accent)
                    }
                    .buttonStyle(.plain)
                    Spacer()
                    if let erro {
                        Text(erro).font(.system(size: 11)).foregroundStyle(Palette.bad)
                    }
                }
            }
            .padding(.horizontal, 18).padding(.bottom, 15)
        }
    }

    private func secTitulo(_ t: String, _ icon: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon).font(.system(size: 10, weight: .bold)).foregroundStyle(Palette.accent)
            Text(t.uppercased()).font(.system(size: 10.5, weight: .bold)).tracking(1)
                .foregroundStyle(Palette.accent)
        }
    }

    // MARK: - Geração

    private func gerar() async {
        let key = UserDefaults.standard.string(forKey: "anthropicKey") ?? ""
        guard !key.trimmingCharacters(in: .whitespaces).isEmpty else {
            erro = "Configure sua chave da API em Ajustes ▸ Inteligência Artificial."; return
        }
        busy = true; erro = nil
        defer { busy = false }

        // Junta os verbetes das novidades (dedup por id, teto de 40 p/ caber no prompt).
        var vistos = Set<String>()
        var verbetes: [JurisEntry] = []
        for lote in lotes {
            for v in store.verbetes(de: lote) where !vistos.contains(v.id) {
                vistos.insert(v.id); verbetes.append(v)
                if verbetes.count >= 40 { break }
            }
            if verbetes.count >= 40 { break }
        }
        guard !verbetes.isEmpty else { erro = "Não encontrei os julgados das novidades."; return }

        let disciplinas = store.editalDisciplinas
        let listaEdital = disciplinas.isEmpty
            ? "(sem edital cadastrado — considere as matérias clássicas de magistratura estadual)"
            : disciplinas.joined(separator: ", ")
        let corpo = verbetes.map { v -> String in
            let enun = String(v.enunciado.prefix(220))
            let ramo = v.ramoDireito.map { " [\($0)]" } ?? ""
            return "- (\(v.fonteKind.nome))\(ramo) \(v.titulo): \(enun)"
        }.joined(separator: "\n")

        let system = "Você é um professor de concursos de magistratura no Brasil, especialista em jurisprudência. Resuma APENAS com base nos julgados fornecidos — nunca invente número, tese ou tribunal."
        let prompt = """
        Matérias do edital da aluna: \(listaEdital)

        Julgados novos da semana:
        \(corpo)

        Responda APENAS um JSON válido, sem markdown e sem texto fora do JSON, neste formato exato:
        {"manchete":"1 frase com o panorama da semana","destaques":[{"tribunal":"STJ","titulo":"tese/tema em poucas palavras","porque":"por que importa para a prova"}],"edital":[{"disciplina":"nome exatamente como listado no edital","itens":["o que estudar/atualizar"]}],"alerta":"1 pegadinha ou ponto de atenção de prova desta semana"}
        - destaques: os 3 a 6 julgados MAIS relevantes para prova de magistratura.
        - edital: SÓ as disciplinas do edital tocadas por algum julgado desta semana (se nenhuma, use lista vazia).
        - Seja específico (cite a tese), mas conciso.
        """
        do {
            let txt = try await AIService.gerar(system: system, prompt: prompt, apiKey: key, maxTokens: 2400)
            let clean = txt.replacingOccurrences(of: "```json", with: "")
                           .replacingOccurrences(of: "```", with: "")
                           .trimmingCharacters(in: .whitespacesAndNewlines)
            guard let data = clean.data(using: .utf8),
                  (try? JSONDecoder().decode(ResumoSemanalIA.self, from: data)) != nil else {
                erro = "A IA respondeu num formato inesperado. Tente de novo."; return
            }
            let novo = ResumoSemanalCache(json: clean, geradoEm: Date(), chave: chaveAtual)
            cache = novo
            Self.saveCache(novo)
        } catch {
            erro = (error as? AIService.AIError)?.errorDescription ?? error.localizedDescription
        }
    }

    // MARK: - Cache (UserDefaults — derivado, não sincroniza)

    private static func loadCache() -> ResumoSemanalCache? {
        guard let data = UserDefaults.standard.data(forKey: cacheKey) else { return nil }
        return try? JSONDecoder().decode(ResumoSemanalCache.self, from: data)
    }
    private static func saveCache(_ c: ResumoSemanalCache) {
        if let data = try? JSONEncoder().encode(c) {
            UserDefaults.standard.set(data, forKey: cacheKey)
        }
    }
}
