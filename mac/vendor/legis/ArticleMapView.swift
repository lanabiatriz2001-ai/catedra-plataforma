import SwiftUI
import AppKit
import UniformTypeIdentifiers

// MARK: - Árvore estrutural do artigo

/// Nó do mapa/esquema de um artigo. A hierarquia é montada a partir do parser
/// que o app já usa (`LawParser.classify`): caput → incisos → alíneas, e os
/// parágrafos como ramos próprios (que também podem ter incisos).
final class ArtNode: Identifiable {
    enum Kind { case root, paragrafo, inciso, alinea, plain }
    let id = UUID()
    let kind: Kind
    let label: String?      // "I", "a)", "§ 1º"… (nil no root)
    var text: String
    var children: [ArtNode] = []
    init(kind: Kind, label: String?, text: String) {
        self.kind = kind; self.label = label; self.text = text
    }

    /// Constrói a árvore de um artigo. Determinístico e offline — reflete a
    /// ESTRUTURA do texto (não interpreta a lógica).
    static func build(from unit: LawUnit) -> ArtNode {
        let root = ArtNode(kind: .root, label: unit.label, text: "")
        var branch: ArtNode = root      // onde os incisos entram (caput, ou um parágrafo)
        var inciso: ArtNode? = nil       // inciso atual (para pendurar alíneas)
        var last: ArtNode = root         // último nó criado (para juntar continuações)
        for line in LawParser.classify(unit) {
            switch line {
            case .caput(let t):
                root.text = t; branch = root; inciso = nil; last = root
            case .paragrafo(let label, let t):
                let n = ArtNode(kind: .paragrafo, label: label, text: t)
                root.children.append(n); branch = n; inciso = nil; last = n
            case .inciso(let num, let t):
                let n = ArtNode(kind: .inciso, label: num, text: t)
                branch.children.append(n); inciso = n; last = n
            case .alinea(let letra, let t):
                let n = ArtNode(kind: .alinea, label: letra.hasSuffix(")") ? letra : letra + ")", text: t)
                (inciso ?? branch).children.append(n); last = n
            case .plain(let t):
                // Continuação da linha anterior — junta ao texto do último nó.
                last.text = last.text.isEmpty ? t : last.text + " " + t
            }
        }
        return root
    }

    var totalNodes: Int { 1 + children.reduce(0) { $0 + $1.totalNodes } }
}

// MARK: - Mapa renderizado (desenho estável para exportar como imagem)

/// Esquema visual do artigo. Design próprio, CLARO e fixo (independente do tema
/// do app) para a imagem exportada ficar boa colada em qualquer lugar (Anki,
/// Notion, impressão).
struct ArticleMapView: View {
    let root: ArtNode
    let lawTitle: String
    let accent: Color

    private let ink = Color(red: 0.13, green: 0.14, blue: 0.17)
    private let sub = Color(red: 0.42, green: 0.45, blue: 0.50)
    private let page = Color(red: 0.975, green: 0.977, blue: 0.985)

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            header
            if root.children.isEmpty {
                Text("Artigo sem incisos, alíneas ou parágrafos — apenas o caput.")
                    .font(.system(size: 12)).foregroundColor(sub)
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    ForEach(root.children) { child in
                        MapBranch(node: child, accent: accent, ink: ink)
                    }
                }
            }
            Text("CátedraLEGIS · esquema estrutural do artigo")
                .font(.system(size: 9, weight: .medium)).foregroundColor(sub)
                .padding(.top, 2)
        }
        .padding(22)
        .frame(width: 620, alignment: .leading)
        .background(page)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            if !lawTitle.isEmpty {
                Text(lawTitle.uppercased())
                    .font(.system(size: 11, weight: .heavy))
                    .foregroundColor(.white.opacity(0.9)).lineLimit(2)
            }
            Text(root.label ?? "Artigo")
                .font(.system(size: 26, weight: .bold, design: .default))
                .foregroundColor(.white)
            if !root.text.isEmpty {
                Text(root.text)
                    .font(.system(size: 13)).foregroundColor(.white.opacity(0.94))
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 16).fill(accent.gradient))
    }
}

/// Um ramo (recursivo) com trilho colorido à esquerda + chip do rótulo + texto.
private struct MapBranch: View {
    let node: ArtNode
    let accent: Color
    let ink: Color

    private var color: Color {
        switch node.kind {
        case .paragrafo: return accent
        case .inciso:    return accent.opacity(0.82)
        case .alinea:    return Color(red: 0.48, green: 0.51, blue: 0.57)
        default:         return accent
        }
    }

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            RoundedRectangle(cornerRadius: 1.5).fill(color.opacity(0.45)).frame(width: 3)
            VStack(alignment: .leading, spacing: 9) {
                HStack(alignment: .top, spacing: 8) {
                    if let label = node.label, !label.isEmpty {
                        Text(label)
                            .font(.system(size: 12, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                            .padding(.horizontal, 8).padding(.vertical, 3)
                            .background(Capsule().fill(color))
                            .fixedSize()
                    }
                    Text(node.text)
                        .font(.system(size: 14)).foregroundColor(ink)
                        .fixedSize(horizontal: false, vertical: true)
                }
                ForEach(node.children) { child in
                    MapBranch(node: child, accent: accent, ink: ink)
                }
            }
        }
    }
}

// MARK: - Folha: pré-visualização + exportar/copiar

struct ArticleMapSheet: View {
    let unit: LawUnit
    let lawTitle: String
    let accent: Color
    @Environment(\.dismiss) private var dismiss
    @State private var message = ""

    private var root: ArtNode { ArtNode.build(from: unit) }
    private var map: ArticleMapView { ArticleMapView(root: root, lawTitle: lawTitle, accent: accent) }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 1) {
                    Text("Mapa do artigo").font(.headline)
                    Text(unit.label).font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                Button { copyImage() } label: { Label("Copiar imagem", systemImage: "doc.on.doc") }
                Button { savePNG() } label: { Label("Salvar PNG", systemImage: "square.and.arrow.down") }
                    .buttonStyle(.borderedProminent).tint(accent)
                Button("Fechar") { dismiss() }
            }
            .padding(14)
            Divider()
            ScrollView([.vertical, .horizontal]) {
                map.padding(20)
            }
            .background(Color(white: 0.88))
            if !message.isEmpty {
                Divider()
                Text(message).font(.caption).foregroundStyle(.secondary)
                    .padding(.vertical, 7).frame(maxWidth: .infinity)
            }
        }
        .frame(width: 760, height: 760)
    }

    @MainActor private func makeRenderer() -> ImageRenderer<ArticleMapView> {
        let r = ImageRenderer(content: map)
        r.scale = max(2, NSScreen.main?.backingScaleFactor ?? 2)   // nitidez de tela retina
        return r
    }

    private func copyImage() {
        guard let img = makeRenderer().nsImage else { message = "Não consegui gerar a imagem."; return }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.writeObjects([img])
        message = "Imagem copiada — cole no Anki/Notion com ⌘V."
    }

    private func savePNG() {
        guard let img = makeRenderer().nsImage, let tiff = img.tiffRepresentation,
              let rep = NSBitmapImageRep(data: tiff),
              let png = rep.representation(using: .png, properties: [:]) else {
            message = "Não consegui gerar a imagem."; return
        }
        let panel = NSSavePanel()
        panel.allowedContentTypes = [.png]
        panel.nameFieldStringValue = "mapa-\(safeName).png"
        panel.canCreateDirectories = true
        guard panel.runModal() == .OK, let url = panel.url else { return }
        do { try png.write(to: url); message = "Salvo: \(url.lastPathComponent)." }
        catch { message = "Falha ao salvar: \(error.localizedDescription)" }
    }

    private var safeName: String {
        let base = unit.label.folding(options: .diacriticInsensitive, locale: nil)
            .replacingOccurrences(of: "[^A-Za-z0-9]+", with: "-", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: "-")).lowercased()
        return base.isEmpty ? "artigo" : base
    }
}
