import Foundation
import AppKit

/// Sincronização sem interface: `VadeMecum --sync` baixa todas as normas com URL
/// e atualiza a biblioteca em disco. Recusa rodar com o app aberto (os dois
/// processos gravariam o mesmo library.json e um sobrescreveria o outro) e
/// re-verifica isso a cada norma — a checagem única do início deixava uma janela
/// de minutos em que abrir o app causava perda silenciosa de dados (last-writer-wins).
enum HeadlessSync {
    private static func appIsRunning() -> Bool {
        !NSRunningApplication.runningApplications(withBundleIdentifier: "br.com.lana.vademecum").isEmpty
    }

    static func run() async {
        guard !appIsRunning() else {
            print("O Vade Mecum está aberto. Feche o app antes de rodar --sync (use ⌘R dentro do app para verificar com ele aberto).")
            return
        }

        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        let baseDir = appSupport.appendingPathComponent("VadeMecum", isDirectory: true)
        let textsDir = baseDir.appendingPathComponent("textos", isDirectory: true)
        let libraryFile = baseDir.appendingPathComponent("library.json")
        try? FileManager.default.createDirectory(at: textsDir, withIntermediateDirectories: true)

        guard let data = try? Data(contentsOf: libraryFile),
              var persisted = try? JSONDecoder().decode(LibraryFile.self, from: data) else {
            print("Biblioteca não encontrada ou ilegível. Abra o app uma vez antes de usar --sync.")
            return
        }

        // Grava a biblioteca em disco (atômico). Chamada após CADA norma: se a
        // sincronização for interrompida (Ctrl-C, queda), o hash salvo não
        // desalinha do texto já gravado — desalinhado, a rodada seguinte veria
        // "mudança" com diff vazio e destruiria o .anterior.txt real.
        func persist() {
            let encoder = JSONEncoder()
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
            if let out = try? encoder.encode(persisted) {
                try? out.write(to: libraryFile, options: .atomic)
            }
        }

        // Mesma migração da carga do app (v10): purga fontes de jurisprudência
        // antigas antes de sincronizar, preservando o arquivo original ao lado.
        let purgedIDs = persisted.purgeJurisEntries()
        if !purgedIDs.isEmpty {
            let backup = baseDir.appendingPathComponent("library.pre-v10-jurisprudencia.bak.json")
            if !FileManager.default.fileExists(atPath: backup.path) {
                do { try data.write(to: backup) } catch {
                    print("Aviso: não foi possível criar o backup pré-remoção (\(error.localizedDescription)).")
                }
            }
            for id in purgedIDs {
                try? FileManager.default.removeItem(at: textsDir.appendingPathComponent("\(id.uuidString).txt"))
                try? FileManager.default.removeItem(at: textsDir.appendingPathComponent("\(id.uuidString).anterior.txt"))
            }
            persist() // a purga vale mesmo que a rodada de rede seja interrompida
            print("Removidas \(purgedIDs.count) fontes de jurisprudência antigas (backup em \(backup.lastPathComponent)).")
        }

        var ok = 0, failed = 0, skipped = 0
        for i in persisted.laws.indices {
            guard persisted.laws[i].sourceURL != nil else { continue }
            // Respeita o monitoramento desligado (mas ainda faz o download inicial).
            guard persisted.laws[i].monitored || !persisted.laws[i].isDownloaded else {
                skipped += 1
                continue
            }
            if appIsRunning() {
                print("O Vade Mecum foi aberto durante a sincronização — parando aqui para não competir pela biblioteca. O que já foi processado está salvo.")
                return
            }
            let title = persisted.laws[i].title
            let law = persisted.laws[i]
            do {
                let text = try await Planalto.fetchText(for: law)
                let hash = Planalto.contentHash(of: text)
                if let oldHash = persisted.laws[i].contentHash, oldHash != hash {
                    // Dupla busca de confirmação com intervalo (mesma proteção do app).
                    try await Task.sleep(nanoseconds: 2_000_000_000)
                    let confirm = try await Planalto.fetchText(for: law)
                    guard Planalto.contentHash(of: confirm) == hash else {
                        failed += 1
                        print("~ instável (ignorada nesta rodada): \(title)")
                        continue
                    }
                }
                let textURL = textsDir.appendingPathComponent("\(persisted.laws[i].id.uuidString).txt")
                if let oldHash = persisted.laws[i].contentHash, oldHash != hash {
                    // .txt anterior ausente vira texto vazio (o diff lista tudo como
                    // novo), como no app — antes a mudança era aplicada SEM registro.
                    let oldText = (try? String(contentsOf: textURL, encoding: .utf8)) ?? ""
                    let diff = Planalto.paragraphDiff(old: oldText, new: text)
                    persisted.updates.insert(UpdateEvent(lawID: persisted.laws[i].id,
                                                         lawTitle: title,
                                                         date: Date(),
                                                         addedParagraphs: diff.added,
                                                         removedParagraphs: diff.removed), at: 0)
                    persisted.laws[i].lastChanged = Date()
                    persisted.laws[i].hasUnreadUpdate = true
                    persisted.annotations = Annotations.reanchor(persisted.annotations ?? [],
                                                                 lawID: persisted.laws[i].id,
                                                                 newText: text)
                    print("≠ ALTERADA: \(title)")
                }
                try text.write(to: textURL, atomically: true, encoding: .utf8)
                persisted.laws[i].contentHash = hash
                persisted.laws[i].isDownloaded = true
                persisted.laws[i].lastFetched = Date()
                persisted.laws[i].checkFailures = nil
                ok += 1
                print("✓ \(title) (\(text.count) caracteres)")
            } catch {
                failed += 1
                print("✗ \(title): \(error.localizedDescription)")
            }
            persist()
        }
        persisted.lastCheckDate = Date()

        if appIsRunning() {
            print("O Vade Mecum foi aberto durante a sincronização — o registro final não foi gravado para não sobrescrever o app.")
        } else {
            persist()
        }
        print("Concluído: \(ok) baixadas, \(failed) falhas\(skipped > 0 ? ", \(skipped) não monitoradas" : "").")
    }
}
