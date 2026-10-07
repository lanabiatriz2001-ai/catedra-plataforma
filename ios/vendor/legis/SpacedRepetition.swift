import Foundation
import SwiftUI

/// Estado de um artigo no baralho de revisão espaçada (algoritmo FSRS, estilo Anki).
/// Persistido no library.json, indexado por "uuidDaNorma|chaveDoArtigo".
struct SRSCard: Codable, Hashable {
    var ease: Double = 2.5      // legado preservado; FSRS usa estabilidade e dificuldade
    var intervalDays: Int = 0   // intervalo atual, em dias
    var reps: Int = 0           // respostas acumuladas, preservadas na migração
    var lapses: Int = 0         // quantas vezes a usuária errou
    var due: Date               // próxima revisão (início do dia)
    var added: Date             // quando entrou no baralho
    var lastReviewed: Date?
    var fsrs: FSRSEstado? // nil nos cartões anteriores: migra ao responder
    // Conteúdo do flashcard gerado a partir do artigo (Optional = cartões antigos
    // decodificam como recordação simples).
    var cardKind: String?       // "cloze" | "recall"
    var prompt: String?         // frente: texto com "______" (cloze) ou a pergunta (recall)
    var answer: String?         // cloze: o termo escondido; recall: nil (resposta = o artigo)

    init(due: Date, added: Date, cardKind: String? = nil, prompt: String? = nil, answer: String? = nil) {
        self.due = due; self.added = added
        self.cardKind = cardKind; self.prompt = prompt; self.answer = answer
    }

    // Decodificação tolerante (nunca derrubar a biblioteca inteira por um cartão ruim).
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        ease = try c.decodeIfPresent(Double.self, forKey: .ease) ?? 2.5
        intervalDays = try c.decodeIfPresent(Int.self, forKey: .intervalDays) ?? 0
        reps = try c.decodeIfPresent(Int.self, forKey: .reps) ?? 0
        lapses = try c.decodeIfPresent(Int.self, forKey: .lapses) ?? 0
        due = try c.decodeIfPresent(Date.self, forKey: .due) ?? Date(timeIntervalSince1970: 0)
        added = try c.decodeIfPresent(Date.self, forKey: .added) ?? Date(timeIntervalSince1970: 0)
        lastReviewed = try c.decodeIfPresent(Date.self, forKey: .lastReviewed)
        fsrs = try? c.decodeIfPresent(FSRSEstado.self, forKey: .fsrs)
        cardKind = try c.decodeIfPresent(String.self, forKey: .cardKind)
        prompt = try c.decodeIfPresent(String.self, forKey: .prompt)
        answer = try c.decodeIfPresent(String.self, forKey: .answer)
    }
}

/// As quatro respostas da revisão (como no Anki).
enum SRSGrade: String, CaseIterable, Identifiable {
    case again, hard, good, easy
    var id: String { rawValue }

    /// Compatibilidade das notas da interface: Errei/Difícil/Bom/Fácil.
    var quality: Int {
        switch self {
        case .again: return 1
        case .hard: return 3
        case .good: return 4
        case .easy: return 5
        }
    }
    var label: String {
        switch self {
        case .again: return "Errei"
        case .hard: return "Difícil"
        case .good: return "Bom"
        case .easy: return "Fácil"
        }
    }
    var color: Color {
        switch self {
        case .again: return AppTheme.danger
        case .hard: return AppTheme.warn
        case .good: return AppTheme.ok
        case .easy: return AppTheme.info
        }
    }
    var symbol: String {
        switch self {
        case .again: return "arrow.counterclockwise"
        case .hard: return "tortoise"
        case .good: return "checkmark"
        case .easy: return "hare"
        }
    }
}

enum SpacedRepetition {
    /// Próximo intervalo (em dias) que uma resposta produziria — 0 = "hoje de novo".
    static func nextInterval(_ card: SRSCard, _ grade: SRSGrade, now: Date = Date()) -> Int {
        CatedraFSRS.responder(card.fsrs, intervalo: card.intervalDays, reps: card.reps, ultima: card.lastReviewed, q: grade.quality, agora: now).intervalo
    }

    /// Responder preserva conteúdo, identidade, datas anteriores e histórico de falhas.
    static func schedule(_ card: SRSCard, grade: SRSGrade, today: Date, calendar: Calendar) -> SRSCard {
        var c = card
        let r = CatedraFSRS.responder(card.fsrs, intervalo: card.intervalDays, reps: card.reps, ultima: card.lastReviewed, q: grade.quality, agora: today)
        c.fsrs = r.estado
        c.reps = grade == .again ? 0 : c.reps + 1
        if grade == .again { c.lapses += 1 }
        c.intervalDays = r.intervalo
        let base = calendar.startOfDay(for: today)
        c.due = calendar.date(byAdding: .day, value: r.intervalo, to: base) ?? base
        c.lastReviewed = today
        return c
    }

    /// Rótulo curto de um intervalo em dias ("hoje", "1 d", "3 sem", "2 mês").
    static func intervalLabel(_ days: Int) -> String {
        if days <= 0 { return "hoje" }
        if days == 1 { return "1 d" }
        if days < 21 { return "\(days) d" }
        if days < 60 { return "\(Int((Double(days) / 7).rounded())) sem" }
        return "\(Int((Double(days) / 30).rounded())) mês"
    }
}
