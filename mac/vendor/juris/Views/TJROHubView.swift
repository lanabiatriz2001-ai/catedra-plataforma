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
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                cabecalho
                if buscando { checando }
                if let r = resultado { resultadoCard(r) }
                secao("Súmulas do TJRO", "building.2.fill", Palette.fonteTJRO, sumulas)
                secao("IRDR, IAC e Enunciados", "signpost.right.fill", Palette.fonteTJROprec, precedentes)
                Color.clear.frame(height: 20)
            }
            .padding(26)
        }
        .background(Palette.appBackground)
        .task {
            if !jaChecou { jaChecou = true; await fetchLiame() }
        }
    }

    // MARK: Cabeçalho + ação ao vivo

    private var cabecalho: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 14) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Central do TJRO").font(Typo.serifTitle(28, .bold)).foregroundStyle(Palette.titleInk)
                    Text("Seu tribunal, num lugar só — súmulas, IRDR/IAC e enunciados.")
                        .font(Typo.serifBody(13.5)).foregroundStyle(Palette.secondaryInk)
                }
                Spacer(minLength: 0)
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
        }
        .padding(22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(colors: [Palette.fonteTJRO.opacity(0.16), Palette.cardBackground],
                           startPoint: .topLeading, endPoint: .bottomTrailing),
            in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(Palette.hairline, lineWidth: 1))
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
                .background(Palette.accent.opacity(0.06), in: RoundedRectangle(cornerRadius: 9))
            }
            if !novos.isEmpty {
                Text("Esses ainda não estão no acervo do app — me avise para eu incorporá-los pelo pipeline (com tese, ramo e link oficial).")
                    .font(.system(size: 11)).foregroundStyle(Palette.secondaryInk)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Palette.hairline, lineWidth: 1))
    }

    // MARK: Listas

    private func secao(_ titulo: String, _ simbolo: String, _ cor: Color, _ itens: [JurisEntry]) -> some View {
        VStack(alignment: .leading, spacing: 11) {
            HStack(spacing: 7) {
                Image(systemName: simbolo).font(.system(size: 13)).foregroundStyle(cor)
                Text(titulo).font(Typo.serifTitle(17, .bold)).foregroundStyle(Palette.titleInk)
                Text("\(itens.count)").font(.system(size: 11, weight: .bold))
                    .padding(.horizontal, 7).padding(.vertical, 1)
                    .background(cor.opacity(0.16), in: Capsule()).foregroundStyle(cor)
            }
            VStack(spacing: 8) { ForEach(itens) { linha($0, cor) } }
        }
    }

    private func linha(_ e: JurisEntry, _ cor: Color) -> some View {
        Button { store.lerCheio(e.id) } label: {
            HStack(alignment: .top, spacing: 10) {
                if store.isLido(e.id) {
                    Image(systemName: "checkmark.circle.fill").font(.system(size: 13)).foregroundStyle(Palette.fonteSTJ)
                } else {
                    Image(systemName: "circle").font(.system(size: 13)).foregroundStyle(Palette.secondaryInk.opacity(0.4))
                }
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 7) {
                        Text(e.titulo).font(Typo.serifTitle(13.5, .semibold)).foregroundStyle(Palette.titleInk).lineLimit(1)
                        if let s = e.situacao { SituacaoPill(texto: s) }
                        Spacer(minLength: 0)
                    }
                    Text(e.enunciado).font(Typo.serifBody(12)).foregroundStyle(Palette.bodyInk.opacity(0.85))
                        .lineLimit(2).fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(11)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.cardBackground, in: RoundedRectangle(cornerRadius: 10))
            .overlay(alignment: .leading) { RoundedRectangle(cornerRadius: 2).fill(cor).frame(width: 3).padding(.vertical, 10) }
            .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Palette.hairline, lineWidth: 1))
        }
        .buttonStyle(.plain)
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
                : "\(achados.count) precedente(s) do TJRO no LIAME ainda fora do app:"
        } catch {
            resultado = "Não foi possível consultar o LIAME agora (sem internet ou site fora do ar). Suas listas abaixo continuam disponíveis."
        }
    }
}
