import Foundation

/// Rascunhos de texto que NÃO podem sumir ao trocar de aba ou de verbete: a resposta
/// da prova oral (por verbete) e as anotações da arguição em Oral·bancas (por concurso).
/// Vive em Application Support, no mesmo molde de RoteiroCache/SimuladoCache — não
/// sobe para a nuvem (é rascunho de treino, não acervo pessoal).
///
/// Chave = "\(namespace)/\(id)". Teto de 400 rascunhos; os mais antigos caem primeiro.
@MainActor
enum JurisRascunhoCache {
    private struct Item: Codable { var texto: String; var em: Date }
    private static var mem: [String: Item] = [:]
    private static var carregado = false
    private static var gravacao: Task<Void, Never>?

    private static var url: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("VadeMecumJuris", isDirectory: true)
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        return base.appendingPathComponent("rascunhos.json")
    }
    private static func carregar() {
        guard !carregado else { return }
        carregado = true
        if let d = try? Data(contentsOf: url),
           let m = try? JSONDecoder().decode([String: Item].self, from: d) { mem = m }
    }
    static func get(_ namespace: String, _ id: String) -> String? {
        carregar()
        return mem["\(namespace)/\(id)"]?.texto
    }
    /// nil ou texto vazio apaga o rascunho. A gravação em disco é adiada ~400 ms
    /// (digitação) e sempre termina gravada: o último `set` vence.
    static func set(_ namespace: String, _ id: String, _ texto: String?) {
        carregar()
        let k = "\(namespace)/\(id)"
        if let t = texto, !t.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            mem[k] = Item(texto: t, em: Date())
        } else {
            mem.removeValue(forKey: k)
        }
        if mem.count > 400 {
            let ordem = mem.sorted { $0.value.em < $1.value.em }
            for (k, _) in ordem.prefix(mem.count - 400) { mem.removeValue(forKey: k) }
        }
        gravacao?.cancel()
        gravacao = Task { @MainActor in
            try? await Task.sleep(nanoseconds: 400_000_000)
            guard !Task.isCancelled else { return }
            gravarAgora()
        }
    }
    static func gravarAgora() {
        if let d = try? JSONEncoder().encode(mem) { try? d.write(to: url, options: .atomic) }
    }
}
