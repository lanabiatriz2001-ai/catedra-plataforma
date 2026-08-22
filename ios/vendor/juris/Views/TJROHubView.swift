import SwiftUI

/// Central do TJRO: súmulas + IRDR/IAC + enunciados num lugar só, com verificação
/// AO VIVO no sistema LIAME do próprio tribunal para achar precedentes novos.
struct TJROHubView: View {
    @Environment(LibraryStore.self) private var store
    @State private var buscando = false
    @State private var resultado: String?
    @State private var novos: [NovoPrecedente] = []
    @State private var jaChecou = false

    struct NovoPrecedente: Identifiable { let id = UUID(); let tipo: String; let num: Int; let texto: String }

    private var sumulas: [JurisEntry] {
        store.entries.filter { $0.fonte == "tjro" }.sorted { ($0.numero ?? 0) < ($1.numero ?? 0) }
    }
    private var precedentes: [JurisEntry] {
        store.entries.filter { $0.fonte == "tjro_prec" }
    }

    var body: some View {
        VStack(spacing: 0) {
            HubBackBar(rotulo: "Tribunais Específicos") { store.ir(.central(.especificos)) }
            SectionShell(icon: Selecao.tjroHub.simbolo, title: Selecao.tjroHub.titulo,
                         subtitle: "Seu tribunal, num lugar só — súmulas, IRDR/IAC e enunciados, com verificação ao vivo no LIAME.",
                         count: sumulas.count + precedentes.count,
                         trailing: AnyView(botaoLiame),
                         tintStops: [Palette.fonteTJRO, Palette.fonteTJRO.opacity(0.7)]) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 22) {
                        if buscando { checando }
                        if let r = resultado { resultadoCard(r) }
                        secao("Súmulas do TJRO", "building.2.fill", Palette.fonteTJRO, sumulas)
                        secao("IRDR, IAC e Enunciados", "signpost.right.fill", Palette.fonteTJROprec, precedentes)
                        Color.clear.frame(height: 20)
                    }
                    .padding(26)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .task {
            if !jaChecou { jaChecou = true; await fetchLiame() }
        }
    }

    // MARK: Ação ao vivo

    private var botaoLiame: some View {
        Button { Task { await fetchLiame() } } label: {
            HStack(spacing: 6) {
                Image(systemName: "arrow.triangle.2.circlepath")
                Text("Buscar novidades").font(.system(size: 12.5, weight: .semibold))
            }
            .foregroundStyle(.white).padding(.horizontal, 14).padding(.vertical, 9)
            .background(Palette.fonteTJRO, in: Capsule())
        }
        .buttonStyle(.plain).disabled(buscando)
    }

    private var checando: some View {
        HStack(spacing: 8) {
            ProgressView().controlSize(.small)
            Text("Consultando o LIAME (tjro.jus.br)…").font(.system(size: 12)).foregroundStyle(Palette.secondaryInk)
        }
    }

    private func resultadoCard(_ texto: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Label(texto, systemImage: novos.isEmpty ? "checkmark.seal.fill" : "sparkles")
                .font(.system(size: 12.5, weight: .semibold))
                .foregroundStyle(novos.isEmpty ? Palette.fonteSTJ : Palette.accent)
                .fixedSize(horizontal: false, vertical: true)
            ForEach(novos) { n in
                VStack(alignment: .leading, spacing: 3) {
                    Text("\(n.tipo) nº \(n.num)").font(.system(size: 12.5, weight: .bold)).foregroundStyle(Palette.titleInk)
                    Text(n.texto).font(.system(size: 11.5)).foregroundStyle(Palette.bodyInk)
                        .lineLimit(3).fixedSize(horizontal: false, vertical: true)
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Palette.accent.opacity(0.06), in: RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous))
            }
            if !novos.isEmpty {
                Text("Esses ainda não estão no acervo do app — entram numa próxima atualização do acervo (com tese, ramo e link oficial).")
                    .font(.system(size: 11)).foregroundStyle(Palette.secondaryInk)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Palette.rCard, style: .continuous).strokeBorder(Palette.hairline, lineWidth: 1))
    }

    // MARK: Listas — CartaoJuris(.row): lombada na cor do RAMO, tribunal no badge.

    private func secao(_ titulo: String, _ simbolo: String, _ cor: Color, _ itens: [JurisEntry]) -> some View {
        VStack(alignment: .leading, spacing: 11) {
            JurisSecaoTitulo(titulo: titulo, simbolo: simbolo, cor: cor, count: itens.count)
            VStack(spacing: 8) { ForEach(itens) { CartaoJuris(entry: $0, estilo: .row) } }
        }
    }

    // MARK: Busca ao vivo no LIAME

    @MainActor
    private func fetchLiame() async {
        buscando = true; resultado = nil; novos = []
        defer { buscando = false }
        guard let url = URL(string: "https://liame.tjro.jus.br/api/pesquisa/precedentes/") else { return }
        var req = URLRequest(url: url, timeoutInterval: 20)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("https://liame.tjro.jus.br/", forHTTPHeaderField: "Referer")
        req.setValue("https://liame.tjro.jus.br", forHTTPHeaderField: "Origin")
        let corpo: [String: Any] = ["siglas": ["TJRO"],
                                    "especies": ["incidente_assuncao_competencia", "incidente_demanda_repetitiva"],
                                    "ordenacao": "dataAtualizacao_desc", "page": 1, "page_size": 60]
        req.httpBody = try? JSONSerialization.data(withJSONObject: corpo)
        do {
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse, http.statusCode == 200,
                  let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let d = json["data"] as? [String: Any],
                  let results = d["results"] as? [[String: Any]] else {
                resultado = "Não consegui ler a resposta do LIAME agora."; return
            }
            var achados: [NovoPrecedente] = []
            for r in results {
                guard let reg = r["registro"] as? [String: Any] else { continue }
                let esp = r["especie"] as? String ?? ""
                let tipo = esp.contains("assuncao") ? "IAC" : "IRDR"
                let numStr = "\(reg["numero"] ?? "")".filter { $0.isNumber }
                guard let num = Int(numStr) else { continue }
                if store.byId["TJRO-\(tipo)-\(num)"] == nil {
                    let tese = (reg["tese"] as? String).flatMap { $0.isEmpty ? nil : $0 }
                    let questao = reg["questao"] as? String ?? ""
                    let texto = String((tese ?? questao).replacingOccurrences(of: "¿", with: "\"").prefix(220))
                    achados.append(NovoPrecedente(tipo: tipo, num: num, texto: texto))
                }
            }
            let total = d["total"] as? Int ?? results.count
            novos = achados.sorted { $0.num > $1.num }
            resultado = achados.isEmpty
                ? "Tudo em dia — o LIAME retornou \(total) precedentes e todos já estão no seu acervo."
                : "\(achados.count) \(achados.count == 1 ? "precedente" : "precedentes") do TJRO no LIAME ainda fora do app:"
        } catch {
            resultado = "Não foi possível consultar o LIAME agora (sem internet ou site fora do ar). Suas listas abaixo continuam disponíveis."
        }
    }
}
