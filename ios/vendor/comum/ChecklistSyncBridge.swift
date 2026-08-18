import Foundation

// Ponte compartilhada entre o CátedraLEGIS e o CátedraJURIS. No Mac ela mora dentro do
// módulo do JURIS (mac/vendor/juris/Views/SidebarView.swift) e o LEGIS a alcança porque
// o build compila os dois juntos. Aqui ela vive em vendor/comum, junto do AIService, pelo
// mesmo motivo — e para que portar o JURIS depois não crie um segundo dono do símbolo.
// (Ao portar o JURIS, remover a declaração da cópia do SidebarView.)

/// Ponte de sincronização: item do checklist de leitura (LEGIS ou JURIS) marcado
/// como feito → o host chama `window.catedraMarkChecklistDone` no Cátedra pra marcar
/// a tarefa correspondente do ciclo de estudos como concluída.
enum ChecklistSyncBridge {
    static let itemDone = Notification.Name("CatedraChecklistItemDone")
}

/// Payload da notificação `ChecklistSyncBridge.itemDone`.
struct ChecklistDonePayload {
    let origem: String              // "CátedraLEGIS" | "CátedraJURIS"
    let categoria: String?          // matéria — usado p/ casar com o bloco do ciclo
    let texto: String               // texto do item, fallback de correspondência
}
