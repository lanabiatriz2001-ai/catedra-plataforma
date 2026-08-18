import SwiftUI
import UniformTypeIdentifiers

/// Painel: prévia do mapa mental + botões de exportação (PNG/PDF).
struct MapaMentalSheet: View {
    let entry: JurisEntry
    @Environment(LibraryStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    private var nota: NotaEstudo { MapaMentalView.notaEfetiva(entry, curada: store.notaApp(for: entry.id)) }
    private var temNotaCurada: Bool { store.notaApp(for: entry.id) != nil }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Label("Mapa mental", systemImage: "brain.head.profile")
                    .font(.system(size: 16, weight: .bold)).foregroundStyle(Palette.titleInk)
                if !temNotaCurada {
                    Text("gerado do enunciado").font(.system(size: 10)).foregroundStyle(Palette.secondaryInk)
                        .padding(.horizontal, 6).padding(.vertical, 1)
                        .background(Palette.secondaryInk.opacity(0.12), in: Capsule())
                }
                Spacer()
                Button { exportar(.png) } label: { Label("PNG", systemImage: "photo") }
                Button { exportar(.pdf) } label: { Label("PDF", systemImage: "doc.richtext") }
                    .buttonStyle(.borderedProminent).tint(Palette.accent)
                Button("Fechar") { dismiss() }
            }
            .padding(16)
            .background(Palette.sidebarBackground)
            .overlay(alignment: .bottom) { Rectangle().fill(Palette.hairline).frame(height: 1) }

            ScrollView([.horizontal, .vertical]) {
                MapaMentalView(entry: entry, nota: nota)
                    .environment(\.colorScheme, .light)
                    .padding(24)
            }
            .background(Palette.appBackground)
        }
        .frame(width: 940, height: 700)
        // Todo mapa aberto entra na galeria "Mapas mentais" (persistido).
        .onAppear { store.registrarMapa(entry.id) }
    }

    private func exportar(_ tipo: UTType) {
        let dados = tipo == .png ? Exporter.mapaPNG(entry, nota) : Exporter.mapaPDF(entry, nota)
        guard let dados else { return }
        let ext = tipo == .png ? "png" : "pdf"
        let nome = "mapa-\(entry.titulo.replacingOccurrences(of: " ", with: "-")).\(ext)"
        Exporter.salvar(nome: nome, tipo: tipo, dados: dados)
    }
}

/// Canvas de MAPA MENTAL / FLUXOGRAMA de um verbete, feito para exportar (PNG/PDF).
/// Usa a nota de estudo estruturada quando existe; senão, monta um mapa a partir
/// dos campos oficiais do verbete (enunciado, referências, precedentes, tema).
struct MapaMentalView: View {
    let entry: JurisEntry
    let nota: NotaEstudo

    /// Monta uma NotaEstudo a partir do verbete quando não há nota curada.
    static func notaEfetiva(_ e: JurisEntry, curada: NotaEstudo?) -> NotaEstudo {
        if let n = curada { return n }
        var ramos: [RamoNota] = []
        let linhas = e.enunciado.split(separator: "\n")
            .map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        ramos.append(RamoNota(tipo: "regra", itens: linhas.isEmpty ? [e.enunciado] : linhas))
        if let r = e.referencias, !r.isEmpty { ramos.append(RamoNota(tipo: "fundamento", itens: [r])) }
        if let t = e.tema, !t.isEmpty, t != e.titulo { ramos.append(RamoNota(tipo: "relacionada", itens: [t])) }
        if let p = e.precedentes, !p.isEmpty {
            let curto = p.count > 260 ? String(p.prefix(260)) + "…" : p
            ramos.append(RamoNota(tipo: "cuidado", itens: [curto]))
        }
        return NotaEstudo(tese: e.titulo, fluxo: nil, ramos: ramos, texto: nil)
    }

    private var acento: Color { entry.fonteKind.cor }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            cabecalho
            corpo
            rodape
        }
        .frame(width: 1040)
        .background(Color.white)
    }

    // MARK: Cabeçalho

    private var cabecalho: some View {
        HStack(alignment: .top, spacing: 10) {
            VStack(alignment: .leading, spacing: 3) {
                Text(entry.fonteKind.nome.uppercased())
                    .font(.system(size: 11, weight: .bold)).tracking(0.8)
                    .foregroundStyle(Color(hex: "#4F46E5"))
                Text(entry.titulo)
                    .font(.system(size: 22, weight: .bold, design: .serif))
                    .foregroundStyle(Color(hex: "#0F1B2D"))
                if let t = entry.tema, t != entry.titulo {
                    Text(t).font(.system(size: 12.5, design: .serif)).italic()
                        .foregroundStyle(Color(hex: "#6B7488")).lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Spacer(minLength: 0)
            HStack(spacing: 6) {
                Image(systemName: "brain.head.profile").font(.system(size: 13))
                Text("MAPA MENTAL").font(.system(size: 11, weight: .bold)).tracking(0.8)
            }
            .foregroundStyle(Color(hex: "#4F46E5"))
        }
        .padding(.horizontal, 30).padding(.top, 26).padding(.bottom, 16)
    }

    // MARK: Corpo (nó central + fluxo + ramos)

    private var corpo: some View {
        HStack(alignment: .center, spacing: 0) {
            noCentral
            Rectangle().fill(acento).frame(width: 28, height: 3)   // conector
            VStack(alignment: .leading, spacing: 12) {
                if let fluxo = nota.fluxo, !fluxo.isEmpty { fluxoCard(fluxo) }
                ForEach(Array((nota.ramos ?? []).enumerated()), id: \.offset) { _, r in
                    ramoCard(r)
                }
            }
        }
        .padding(.horizontal, 30).padding(.vertical, 6)
    }

    private var noCentral: some View {
        VStack(spacing: 6) {
            Text("TESE").font(.system(size: 9, weight: .bold)).tracking(1).foregroundStyle(.white.opacity(0.85))
            Text(nota.tese ?? entry.titulo)
                .font(.system(size: 15, weight: .semibold, design: .serif))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
        .frame(width: 260)
        .background(
            LinearGradient(colors: [acento, acento.opacity(0.82)], startPoint: .topLeading, endPoint: .bottomTrailing),
            in: RoundedRectangle(cornerRadius: 16))
        .shadow(color: acento.opacity(0.35), radius: 8, y: 3)
    }

    private func fluxoCard(_ passos: [String]) -> some View {
        VStack(spacing: 4) {
            ForEach(Array(passos.enumerated()), id: \.offset) { i, passo in
                Text(passo)
                    .font(.system(size: 12, weight: i == 0 ? .semibold : .regular))
                    .foregroundStyle(Color(hex: "#14233A"))
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 12).padding(.vertical, 7)
                    .frame(maxWidth: .infinity)
                    .background(Color(hex: "#EEF0FB"), in: RoundedRectangle(cornerRadius: 9))
                    .overlay(RoundedRectangle(cornerRadius: 9).strokeBorder(Color(hex: "#4F46E5").opacity(0.35), lineWidth: 1))
                if i < passos.count - 1 {
                    Image(systemName: "arrow.down").font(.system(size: 11, weight: .bold)).foregroundStyle(Color(hex: "#4F46E5"))
                }
            }
        }
        .padding(11)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: "#F7F8FE"), in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Color(hex: "#E3E6F5"), lineWidth: 1))
    }

    private func ramoCard(_ r: RamoNota) -> some View {
        HStack(alignment: .top, spacing: 0) {
            Rectangle().fill(r.cor).frame(width: 5)
            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 6) {
                    Image(systemName: r.simbolo).font(.system(size: 11)).foregroundStyle(r.cor)
                    Text(r.titulo.uppercased()).font(.system(size: 10, weight: .bold)).tracking(0.6).foregroundStyle(r.cor)
                }
                ForEach(Array(r.itens.enumerated()), id: \.offset) { _, item in
                    HStack(alignment: .top, spacing: 6) {
                        Text("•").font(.system(size: 12)).foregroundStyle(r.cor.opacity(0.7))
                        Text(item).font(.system(size: 12.5)).foregroundStyle(Color(hex: "#1F2A3D"))
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            .padding(.horizontal, 12).padding(.vertical, 10)
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(r.cor.opacity(0.07), in: RoundedRectangle(cornerRadius: 11))
        .overlay(RoundedRectangle(cornerRadius: 11).strokeBorder(r.cor.opacity(0.3), lineWidth: 1))
    }

    private var rodape: some View {
        HStack {
            Text("Vade Mecum de Jurisprudência").font(.system(size: 9.5, weight: .semibold))
                .foregroundStyle(Color(hex: "#4F46E5"))
            Text("· mapa de estudo (não oficial)").font(.system(size: 9.5)).foregroundStyle(Color(hex: "#8A8FA3"))
            Spacer()
            if let d = entry.data { Text(d).font(.system(size: 9.5)).foregroundStyle(Color(hex: "#8A8FA3")) }
        }
        .padding(.horizontal, 30).padding(.top, 14).padding(.bottom, 22)
    }
}
