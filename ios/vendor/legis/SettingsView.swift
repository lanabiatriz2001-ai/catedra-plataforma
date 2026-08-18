import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var store: AppStore
    @AppStorage("updateIntervalHours") private var updateIntervalHours = 24
    @AppStorage("srsEnabled") private var srsEnabled = false
    @State private var showRestoreConfirm = false
    @State private var backupFeedback: String?

    private var downloadedCount: Int { store.laws.filter { $0.isRegularLaw && $0.isDownloaded }.count }
    private var regularCount: Int { store.laws.filter(\.isRegularLaw).count }

    var body: some View {
        Form {
            Section("Revisão espaçada") {
                Toggle("Ativar revisão espaçada (estilo Anki)", isOn: $srsEnabled)
                LabeledContent("Artigos no baralho", value: "\(store.srsDeckCount)")
                LabeledContent("Para revisar hoje", value: "\(store.srsDueCount())")
                Text("Quando ligada, cada artigo no modo Estudo ganha os botões Errei / Difícil / Bom / Fácil. O app agenda a próxima revisão conforme a sua resposta (algoritmo SM-2): quanto melhor você lembra, mais espaçadas ficam as revisões. As revisões do dia aparecem no Início. Você também liga/desliga pelo botão “Revisão espaçada” no topo do modo Estudo.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Section("Verificação automática") {
                Picker("Consultar as fontes a cada", selection: $updateIntervalHours) {
                    Text("6 horas").tag(6)
                    Text("12 horas").tag(12)
                    Text("24 horas").tag(24)
                    Text("2 dias").tag(48)
                    Text("7 dias").tag(168)
                }
                LabeledContent("Última verificação",
                               value: store.lastCheckDate?.formatted(date: .abbreviated, time: .shortened) ?? "ainda não realizada")
                Button("Verificar agora") {
                    Task { await store.checkAllUpdates(manual: true) }
                }
                .disabled(store.isChecking)
                Text("A verificação acontece enquanto o app estiver aberto (pode ficar em segundo plano). Quando uma lei mudar no Planalto ou um ato novo for publicado, você recebe uma notificação do macOS e a alteração fica registrada na aba Atualizações. Uma mudança só é anunciada depois de confirmada por uma segunda consulta, para evitar alarmes falsos.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Section("Modo offline") {
                LabeledContent("Conexão") {
                    Label(store.isOnline ? "Online" : "Offline",
                          systemImage: store.isOnline ? "wifi" : "wifi.slash")
                        .foregroundStyle(store.isOnline ? .green : .orange)
                }
                LabeledContent("Leis salvas para uso offline", value: "\(downloadedCount) de \(regularCount)")
                Button {
                    Task { await store.downloadAllMissing() }
                } label: {
                    Label("Baixar todas as normas para uso offline", systemImage: "arrow.down.circle")
                }
                .disabled(!store.isOnline || store.isChecking || downloadedCount == regularCount)
                if !store.checkProgress.isEmpty {
                    Text(store.checkProgress).font(.caption).foregroundStyle(.secondary)
                }
                Text("O Vade Mecum funciona sem internet: o texto de cada norma que você abre fica salvo em disco, e as suas anotações, favoritos e progresso ficam sempre no seu Mac. Baixe todas as normas de uma vez para tê-las à mão mesmo offline. Enquanto você estiver sem conexão, as verificações de atualização pausam e retomam sozinhas quando a conexão voltar.")
                    .font(.caption).foregroundStyle(.secondary)
            }

            Section("Backup automático") {
                LabeledContent("Último backup",
                               value: store.lastBackupDate?.formatted(date: .abbreviated, time: .shortened) ?? "ainda não realizado")
                LabeledContent("Backups guardados", value: "\(store.backupFiles().count) (mantém os 10 mais recentes)")
                HStack {
                    Button {
                        if store.backupNow() != nil { backupFeedback = "Backup criado agora." }
                        else { backupFeedback = "Não foi possível criar o backup." }
                    } label: {
                        Label("Fazer backup agora", systemImage: "externaldrive.badge.plus")
                    }
                    Button {
                        store.revealBackupsInFinder()
                    } label: {
                        Label("Abrir pasta no Finder", systemImage: "folder")
                    }
                    Button(role: .destructive) {
                        showRestoreConfirm = true
                    } label: {
                        Label("Restaurar backup mais recente", systemImage: "arrow.uturn.backward")
                    }
                    .disabled(store.backupFiles().isEmpty)
                }
                if let backupFeedback {
                    Text(backupFeedback).font(.caption).foregroundStyle(.secondary)
                }
                Text("Uma cópia de segurança da sua biblioteca (favoritos, anotações, progresso, jurisprudência e revisão espaçada) é criada automaticamente a cada dia de uso. Os textos das leis não entram no backup porque podem ser rebaixados do Planalto.")
                    .font(.caption).foregroundStyle(.secondary)
            }

            Section("Biblioteca") {
                LabeledContent("Normas", value: "\(store.laws.filter(\.isRegularLaw).count)")
                LabeledContent("Índices de novidades 2026",
                               value: "\(store.laws.filter(\.isNovidades).count)")
                LabeledContent("Matérias personalizadas", value: "\(store.customCategories.count)")
                LabeledContent("Monitoradas",
                               value: "\(store.laws.filter { $0.monitored && $0.sourceURL != nil }.count)")
                LabeledContent("Marcações e anotações", value: "\(store.annotations.count)")
                LabeledContent("Jurisprudências vinculadas", value: "\(store.precedents.count)")
            }
        }
        .formStyle(.grouped)
        .frame(width: 500)
        .padding()
        .confirmationDialog("Restaurar o backup mais recente?",
                            isPresented: $showRestoreConfirm, titleVisibility: .visible) {
            Button("Restaurar", role: .destructive) {
                if let latest = store.backupFiles().first {
                    store.restoreBackup(latest)
                    backupFeedback = "Biblioteca restaurada do backup mais recente."
                }
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("A biblioteca atual será substituída pela do último backup. O estado atual é salvo automaticamente em backups/ antes, por segurança.")
        }
    }
}
