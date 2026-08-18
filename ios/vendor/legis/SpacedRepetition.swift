import Foundation
import SwiftUI

/// Estado de um artigo no baralho de revisão espaçada (algoritmo SM-2, estilo Anki).
/// Persistido no library.json, indexado por "uuidDaNorma|chaveDoArtigo".
struct SRSCard: Codable, Hashable {
    var ease: Double = 2.5      // fator de facilidade (SM-2); mínimo 1.3
    var intervalDays: Int = 0   // intervalo atual, em dias
    var reps: Int = 0           // acertos consecutivos (0 = cartão novo/reaprendendo)
    var lapses: Int = 0         // quantas vezes a usuária errou
    var due: Date               // próxima revisão (início do dia)
    var added: Date             // quando entrou no baralho
    var lastReviewed: Date?
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
        cardKind = try c.decodeIfPresent(String.self, forKey: .cardKind)
        prompt = try c.decodeIfPresent(String.self, forKey: .prompt)
        answer = try c.decodeIfPresent(String.self, forKey: .answer)
    }
}

/// As quatro respostas da revisão (como no Anki).
enum SRSGrade: String, CaseIterable, Identifiable {
    case again, hard, good, easy
    var id: String { rawValue }

    /// Qualidade SM-2 (0–5); < 3 = erro (reinicia o intervalo).
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
        case .again: return .red
        case .hard: return .orange
        case .good: return .green
        case .easy: return .blue
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
    static func nextInterval(_ card: SRSCard, _ grade: SRSGrade) -> Int {
        guard grade.quality >= 3 else { return 0 }   // errou: reaprende hoje
        var iv: Int
        switch card.reps {
        case 0: iv = 1
        case 1: iv = 6
        default: iv = max(1, Int((Double(card.intervalDays) * card.ease).rounded()))
        }
        if grade == .hard { iv = max(1, Int((Double(iv) * 0.8).rounded())) }
        if grade == .easy { iv = Int((Double(iv) * 1.3).rounded()) }
        return iv
    }

    /// Aplica a resposta e devolve o cartão atualizado (SM-2).
    static func schedule(_ card: SRSCard, grade: SRSGrade, today: Date, calendar: Calendar) -> SRSCard {
        var c = card
        let q = grade.quality
        let iv = nextInterval(card, grade)
        if q < 3 {
            c.reps = 0
            c.lapses += 1
        } else {
            c.reps += 1
        }
        c.intervalDays = iv
        // Ajuste do fator de facilidade (fórmula clássica do SM-2), piso 1.3.
        c.ease = max(1.3, c.ease + (0.1 - Double(5 - q) * (0.08 + Double(5 - q) * 0.02)))
        let base = calendar.startOfDay(for: today)
        c.due = calendar.date(byAdding: .day, value: iv, to: base) ?? base
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
