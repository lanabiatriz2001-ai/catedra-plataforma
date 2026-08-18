import SwiftUI
import UniformTypeIdentifiers
import PDFKit

struct AddLawSheet: View {
    @EnvironmentObject var store: AppStore
    @Environment(\.dismiss) private var dismiss

    private enum Mode: Int { case url = 0, pdf = 1, texto = 2 }
    private static let personalizadaTag = "__personalizada"

    @State private var title = ""
    @State private var reference = ""
    @State private var sourceURL = ""
    @State private var pastedText = ""
    @State private var mode = 0
    @State private var materiaTag = AddLawSheet.personalizadaTag
    @State private var newMateria = ""
    @State private var showPDFImporter = false
    @State private var pdfText: String?
    @State private var pdfName: String?
    @State private var pdfError: String?
    @State private var importingPDF = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Cadastrar norma").font(.title3.bold())
            Form {
                TextField("Título (ex.: Lei do Marco Civil da Internet)", text: $title)
                TextField("Referência (ex.: Lei nº 12.965, de 23 de abril de 2014)", text: $reference)
                Picker("Matéria", selection: $materiaTag) {
                    Text("Minhas Normas").tag(Self.personalizadaTag)
                    Divider()
                    ForEach(LawCategory.allCases.filter { $0 != .personalizada }) { category in
                        Text(category.rawValue).tag("cat:\(category.rawValue)")
                    }
                    if !store.customCategories.isEmpty {
                        Divider()
                        ForEach(store.customCategories, id: \.self) { name in
                            Text(name).tag("custom:\(name)")
                        }
                    }
                }
                TextField("Ou crie uma matéria nova (ex.: Ambiental)", text: $newMateria)
            }

            Picker("Origem do texto", selection: $mode) {
                Text("Link (Planalto ou PDF na web)").tag(Mode.url.rawValue)
                Text("Arquivo PDF do Mac").tag(Mode.pdf.rawValue)
                Text("Texto colado").tag(Mode.texto.rawValue)
            }
            .pickerStyle(.segmented)

            switch Mode(rawValue: mode) ?? .url {
            case .url:
                TextField("URL da norma (página HTML ou PDF)", text: $sourceURL)
                    .textFieldStyle(.roundedBorder)
                if !sourceURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !urlIsValid {
                    Text("Endereço inválido — precisa começar com http:// ou https://")
                        .font(.caption)
                        .foregroundStyle(.red)
                }
                Text("Dica: no Planalto, prefira a versão “texto compilado”, que já incorpora as alterações. Normas com URL são verificadas automaticamente e você é avisada quando mudarem. PDFs na web também funcionam.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            case .pdf:
                HStack(spacing: 10) {
                    Button {
                        showPDFImporter = true
                    } label: {
                        Label(pdfName ?? "Escolher PDF…", systemImage: "doc.badge.plus")
                    }
                    .disabled(importingPDF)
                    if importingPDF {
                        ProgressView().controlSize(.small)
                        Text("Extraindo texto…").font(.caption).foregroundStyle(.secondary)
                    } else if let pdfText {
                        Label("\(pdfText.count) caracteres extraídos", systemImage: "checkmark.circle")
                            .font(.caption)
                            .foregroundStyle(.green)
                    }
                }
                if let pdfError {
                    Text(pdfError).font(.caption).foregroundStyle(.red)
                }
                Text("O texto é extraído do PDF e guardado na biblioteca (pesquisável e anotável). PDFs locais não são monitorados — não há fonte para comparar.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            case .texto:
                Text("Texto integral").font(.headline)
                TextEditor(text: $pastedText)
                    .font(.body)
                    .frame(minHeight: 160)
                    .overlay(RoundedRectangle(cornerRadius: 6).stroke(.quaternary))
                Text("Textos colados não são monitorados (não há fonte para comparar).")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack {
                Spacer()
                Button("Cancelar") { dismiss() }
                Button("Salvar") { saveAndClose() }
                    .buttonStyle(.borderedProminent)
                    .disabled(!canSave)
            }
        }
        .padding(20)
        .frame(minWidth: 580, minHeight: mode == Mode.texto.rawValue ? 520 : 400)
        .fileImporter(isPresented: $showPDFImporter, allowedContentTypes: [.pdf]) { result in
            switch result {
            case .success(let url):
                importPDF(from: url)
            case .failure(let error):
                pdfError = error.localizedDescription
            }
        }
    }

    private var urlIsValid: Bool {
        guard let url = URL(string: sourceURL.trimmingCharacters(in: .whitespacesAndNewlines)),
              let scheme = url.scheme?.lowercased(),
              ["http", "https"].contains(scheme),
              url.host?.isEmpty == false else { return false }
        return true
    }

    private var canSave: Bool {
        guard !title.trimmingCharacters(in: .whitespaces).isEmpty else { return false }
        switch Mode(rawValue: mode) ?? .url {
        case .url: return urlIsValid
        case .pdf: return pdfText?.isEmpty == false && !importingPDF
        case .texto: return !pastedText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
    }

    private func importPDF(from url: URL) {
        // Zera o resultado anterior — sem isso, uma segunda importação que falha
        // manteria o texto do PDF anterior e salvaria conteúdo errado.
        pdfError = nil
        pdfText = nil
        pdfName = nil
        importingPDF = true
        let filename = url.lastPathComponent
        let baseName = url.deletingPathExtension().lastPathComponent
        Task.detached {
            let accessing = url.startAccessingSecurityScopedResource()
            defer { if accessing { url.stopAccessingSecurityScopedResource() } }
            var text: String?
            var failure: String?
            if let data = try? Data(contentsOf: url) {
                if let document = PDFDocument(data: data) {
                    if document.isLocked {
                        failure = "O PDF está protegido por senha. Desbloqueie-o (abra no Preview e exporte um novo PDF) e importe de novo."
                    } else if let raw = document.string {
                        let normalized = Planalto.normalizeLines(raw)
                        if normalized.count > 50 {
                            text = normalized
                        } else {
                            failure = "O PDF não contém texto extraível (pode ser digitalização sem OCR)."
                        }
                    } else {
                        failure = "O PDF não contém texto extraível (pode ser digitalização sem OCR)."
                    }
                } else {
                    failure = "O arquivo não é um PDF válido."
                }
            } else {
                failure = "Não foi possível ler o arquivo."
            }
            let finalText = text
            let finalFailure = failure
            await MainActor.run {
                importingPDF = false
                if let finalText {
                    pdfText = finalText
                    pdfName = filename
                    if title.isEmpty { title = baseName }
                } else {
                    pdfError = finalFailure
                }
            }
        }
    }

    private func saveAndClose() {
        // A matéria de origem vem do Picker; o campo "nova" aplica um rótulo por
        // cima, sem descartar a origem — se a matéria nova for excluída um dia,
        // a norma volta para onde a usuária escolheu.
        var category = LawCategory.personalizada
        var customCategory: String? = nil
        if materiaTag.hasPrefix("cat:"),
           let builtin = LawCategory(rawValue: String(materiaTag.dropFirst(4))) {
            category = builtin
        } else if materiaTag.hasPrefix("custom:") {
            customCategory = String(materiaTag.dropFirst(7))
        }
        let newName = newMateria.trimmingCharacters(in: .whitespaces)
        if !newName.isEmpty {
            if let builtin = LawCategory.allCases.first(where: {
                $0.rawValue.localizedCaseInsensitiveCompare(newName) == .orderedSame
            }) {
                category = builtin
                customCategory = nil
            } else {
                customCategory = newName // grafia canonicalizada no Store
            }
        }

        let url: String? = mode == Mode.url.rawValue
            ? sourceURL.trimmingCharacters(in: .whitespacesAndNewlines) : nil
        let text: String?
        switch Mode(rawValue: mode) ?? .url {
        case .url: text = nil
        case .pdf: text = pdfText
        case .texto: text = pastedText
        }
        Task {
            await store.addCustomLaw(title: title.trimmingCharacters(in: .whitespaces),
                                     reference: reference.trimmingCharacters(in: .whitespaces),
                                     sourceURL: url,
                                     pastedText: text,
                                     category: category,
                                     customCategory: customCategory)
        }
        dismiss()
    }
}
