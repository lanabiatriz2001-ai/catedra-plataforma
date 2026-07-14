import SwiftUI

/// Ajustes: atualização online a partir dos sites oficiais do STF e do STJ.
struct JurisSettingsView: View {
    @Environment(LibraryStore.self) private var store
    @Environment(UpdateService.self) private var updater
    @AppStorage("autoAtualizar") private var autoAtualizar = true
    @AppStorage("jurisAppearance") private var appearanceRaw = Appearance.claro.rawValue
    @AppStorage("readingFontFamily") private var readingFontFamily = ""
    @AppStorage("anthropicKey") private var anthropicKey = ""
    @AppStorage("aiModel") private var aiModel = AIService.defaultModel

    private var familiasInstaladas: [String] {
        NSFontManager.shared.availableFontFamilies.sorted()
    }

    var body: some View {
        Form {
            Section {
                SecureField("sk-ant-…", text: $anthropicKey)
                    .textFieldStyle(.roundedBorder)
                Picker("Modelo", selection: $aiModel) {
                    Text("Claude Sonnet 5 (equilíbrio)").tag("claude-sonnet-5")
                    Text("Claude Opus 4.8 (máxima precisão)").tag("claude-opus-4-8")
                    Text("Claude Haiku 4.5 (rápido/barato)").tag("claude-haiku-4-5-20251001")
                }
                Text("Sua chave da API da Anthropic fica só neste Mac e é usada para a análise por IA (ex.: Comparar STF × STJ). A IA trabalha apenas com o texto oficial dos enunciados, para ser fiel. Obtenha a chave em console.anthropic.com.")
                    .font(.caption).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            } header: {
                Label("Inteligência Artificial", systemImage: "sparkles")
            }

            Section {
                Picker(selection: $appearanceRaw) {
                    ForEach(Appearance.allCases) { ap in
                        Label(ap.nome, systemImage: ap.simbolo).tag(ap.rawValue)
                    }
                } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Tema")
                        Text("Escuro = azul-marinho; Claro = marfim/pergaminho.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
                .pickerStyle(.inline)
            } header: {
                Label("Aparência", systemImage: "paintbrush")
            }

            Section {
                Picker(selection: $readingFontFamily) {
                    Text("Sistema (padrão)").tag("")
                    Divider()
                    ForEach(familiasInstaladas, id: \.self) { fam in
                        Text(fam).font(.custom(fam, size: 13)).tag(fam)
                    }
                } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Fonte de leitura")
                        Text("Aplica-se ao texto das jurisprudências, títulos e notas. A interface segue o sistema.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
                if !readingFontFamily.isEmpty {
                    Text("Prévia: Compete à Justiça do Trabalho julgar as ações de indenização por acidente.")
                        .font(.custom(readingFontFamily, size: 14)).foregroundStyle(.secondary)
                }
            } header: {
                Label("Fonte do app", systemImage: "textformat")
            }

            Section {
                Toggle(isOn: $autoAtualizar) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Atualização automática")
                        Text("Ao abrir o app (no máximo 1× por dia), busca novos informativos nos sites oficiais do STF e do STJ.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            } header: {
                Label("Atualização online", systemImage: "arrow.triangle.2.circlepath")
            }

            Section {
                HStack {
                    Button {
                        Task { await updater.atualizar(store: store) }
                    } label: {
                        Label("Atualizar agora", systemImage: "arrow.down.circle")
                    }
                    .disabled(estaExecutando)

                    Spacer()

                    if let d = updater.ultimaVerificacao {
                        Text("Última verificação: \(d.formatted(date: .abbreviated, time: .shortened))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                statusView
            }

            Section {
                LabeledContent("Fontes consultadas") {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("STJ — processo.stj.jus.br (informativos)")
                        Text("STF — stf.jus.br/arquivo/informativo")
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
                LabeledContent("Verbetes no corpus") {
                    Text("\(store.totalCount)")
                }
                LabeledContent("Informativo STJ mais recente") {
                    Text(store.maxInformativo(.informativoSTJ) > 0
                         ? "nº \(store.maxInformativo(.informativoSTJ))" : "—")
                }
                LabeledContent("Informativo STF mais recente") {
                    Text(store.maxInformativo(.informativoSTF) > 0
                         ? "nº \(store.maxInformativo(.informativoSTF))" : "—")
                }
            } header: {
                Label("Estado", systemImage: "info.circle")
            }

            Section {
                HStack {
                    Button {
                        if let d = store.exportarBackup() {
                            Exporter.salvar(nome: "vademecum-backup.json", tipo: .json, dados: d)
                        }
                    } label: { Label("Exportar backup", systemImage: "square.and.arrow.up") }
                    Button {
                        if let d = Exporter.abrir(tipos: [.json]) { _ = store.importarBackup(d) }
                    } label: { Label("Importar backup", systemImage: "square.and.arrow.down") }
                    Spacer()
                }
                LabeledContent("Sincronização") {
                    Text("Favoritos, coleções e marcações sincronizam via iCloud quando o app é assinado com iCloud; enquanto isso, use backup/restauração.")
                        .font(.caption).foregroundStyle(.secondary).multilineTextAlignment(.trailing)
                }
            } header: {
                Label("Backup e sincronização", systemImage: "arrow.triangle.2.circlepath.icloud")
            }
        }
        .formStyle(.grouped)
        .frame(width: 540, height: 520)
    }

    private var estaExecutando: Bool {
        if case .executando = updater.fase { return true }
        return false
    }

    @ViewBuilder
    private var statusView: some View {
        switch updater.fase {
        case .ociosa:
            EmptyView()
        case .executando(let msg):
            HStack(spacing: 8) {
                ProgressView().controlSize(.small)
                Text(msg).font(.caption).foregroundStyle(.secondary)
            }
        case .concluida(let msg):
            Label(msg, systemImage: "checkmark.circle.fill")
                .font(.caption)
                .foregroundStyle(Palette.fonteSTJ)
        case .falhou(let msg):
            Label(msg, systemImage: "exclamationmark.triangle.fill")
                .font(.caption)
                .foregroundStyle(.orange)
        }
    }
}
