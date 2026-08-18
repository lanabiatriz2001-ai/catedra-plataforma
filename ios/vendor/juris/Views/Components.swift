import SwiftUI

/// Selo colorido identificando a fonte (estilo premium: filete + versalete).
struct FonteBadge: View {
    let fonte: Fonte
    var compact: Bool = false
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: fonte.simbolo).font(.system(size: compact ? 8.5 : 9.5, weight: .semibold))
            Text((compact ? fonte.nomeCurto : fonte.nome).uppercased())
                .font(.system(size: compact ? 9.5 : 10, weight: .bold))
                .tracking(0.6)
                .lineLimit(1)
        }
        .padding(.horizontal, compact ? 6 : 8)
        .padding(.vertical, compact ? 2.5 : 3.5)
        .foregroundStyle(fonte.cor)
        .background(fonte.cor.opacity(0.12), in: Capsule())
        .overlay(Capsule().strokeBorder(fonte.cor.opacity(0.30), lineWidth: 0.6))
    }
}

/// Etiqueta neutra (ramo, tema…).
struct JurisChip: View {
    let texto: String
    var simbolo: String? = nil
    var cor: Color = Palette.secondaryInk
    var body: some View {
        HStack(spacing: 4) {
            if let s = simbolo { Image(systemName: s).font(.system(size: 8.5, weight: .medium)) }
            Text(texto).font(.system(size: 10.5, weight: .medium)).lineLimit(1)
        }
        .padding(.horizontal, 7).padding(.vertical, 2.5)
        .foregroundStyle(cor)
        .background(cor.opacity(0.10), in: Capsule())
    }
}

/// Pílula de situação (Aprovada/Superada/Cancelada).
struct SituacaoPill: View {
    let texto: String
    private var cor: Color {
        let t = texto.lowercased()
        if t.contains("cancel") { return .red }
        if t.contains("super") || t.contains("revog") || t.contains("altera") { return .orange }
        return Palette.fonteSTJ
    }
    var body: some View {
        Text(texto.uppercased())
            .font(.system(size: 9, weight: .bold))
            .tracking(0.5)
            .padding(.horizontal, 7).padding(.vertical, 2.5)
            .foregroundStyle(cor)
            .background(cor.opacity(0.14), in: Capsule())
    }
}

/// Selo de "importante" (dourado).
struct ImportantePill: View {
    var body: some View {
        HStack(spacing: 3) {
            Image(systemName: "bolt.fill").font(.system(size: 8.5))
            Text("IMPORTANTE").font(.system(size: 9, weight: .bold)).tracking(0.5)
        }
        .padding(.horizontal, 7).padding(.vertical, 2.5)
        .foregroundStyle(Palette.accent)
        .background(Palette.accent.opacity(0.14), in: Capsule())
        .overlay(Capsule().strokeBorder(Palette.accent.opacity(0.3), lineWidth: 0.6))
    }
}

/// Linha de metadado no detalhe.
struct MetaRow: View {
    let icone: String
    let rotulo: String
    let valor: String
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Image(systemName: icone)
                .font(.system(size: 11))
                .foregroundStyle(Palette.accent)
                .frame(width: 16)
            Text(rotulo.uppercased())
                .font(.system(size: 10, weight: .bold))
                .tracking(0.4)
                .foregroundStyle(Palette.secondaryInk)
                .frame(width: 132, alignment: .leading)
            Text(valor)
                .font(.system(size: 12.5))
                .foregroundStyle(Palette.bodyInk)
                .textSelection(.enabled)
            Spacer(minLength: 0)
        }
    }
}

/// Cabeçalho de seção dourado com filetes (estilo revista).
struct SectionRule: View {
    let titulo: String
    var body: some View {
        HStack(spacing: 8) {
            Rectangle().fill(Palette.accent.opacity(0.5)).frame(width: 18, height: 1)
            Text(titulo.uppercased())
                .font(.system(size: 10, weight: .bold))
                .tracking(1.2)
                .foregroundStyle(Palette.accent)
            Rectangle().fill(Palette.hairline).frame(height: 1)
        }
    }
}
