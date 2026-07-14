import Foundation
import SwiftUI

/// Estado de um verbete no baralho de revisão espaçada (algoritmo SM-2, estilo
/// Anki). Persistido no estado do app, indexado pelo id do verbete.
/// Portado do "Vade Mecum de Leis" para manter os dois apps no mesmo padrão.
struct JurisSRSCard: Codable, Hashable {
    var ease: Double = 2.5      // fator de facilidade (SM-2); mínimo 1.3
    var intervalDays: Int = 0   // intervalo atual, em dias
    var reps: Int = 0           // acertos consecutivos (0 = novo/reaprendendo)
    var lapses: Int = 0         // quantas vezes errou
    var due: Date               // próxima revisão (início do dia)
    var added: Date             // quando entrou no baralho
    var lastReviewed: Date?
    // Conteúdo do flashcard gerado a partir do verbete.
    var cardKind: String?       // "cloze" | "cloze_type" | "certo_errado" | "direta"
    var prompt: String?         // frente (com "______" no cloze, ou a pergunta/afirmação)
    var answer: String?         // resposta (termo escondido, gabarito, etc.)

    init(due: Date, added: Date, cardKind: String? = nil, prompt: String? = nil, answer: String? = nil) {
        self.due = due; self.added = added
        self.cardKind = cardKind; self.prompt = prompt; self.answer = answer
    }

    // Decodificação tolerante — nunca derrubar a biblioteca por um cartão ruim.
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
enum JurisSRSGrade: String, CaseIterable, Identifiable {
    case again, hard, good, easy
    var id: String { rawValue }

    /// Qualidade SM-2 (0–5); < 3 = erro (reinicia o intervalo).
    var quality: Int {
        switch self {
        case .again: return 1; case .hard: return 3
        case .good: return 4; case .easy: return 5
        }
    }
    var label: String {
        switch self {
        case .again: return "Errei"; case .hard: return "Difícil"
        case .good: return "Bom"; case .easy: return "Fácil"
        }
    }
    var cor: Color {
        switch self {
        case .again: return .red; case .hard: return .orange
        case .good: return Palette.fonteSTJ; case .easy: return .blue
        }
    }
    var simbolo: String {
        switch self {
        case .again: return "arrow.counterclockwise"; case .hard: return "tortoise"
        case .good: return "checkmark"; case .easy: return "hare"
        }
    }
}

enum JurisSpacedRepetition {
    /// Próximo intervalo (em dias) que uma resposta produziria — 0 = "hoje de novo".
    static func nextInterval(_ card: JurisSRSCard, _ grade: JurisSRSGrade) -> Int {
        guard grade.quality >= 3 else { return 0 }
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
    static func schedule(_ card: JurisSRSCard, grade: JurisSRSGrade, today: Date, calendar: Calendar) -> JurisSRSCard {
        var c = card
        let q = grade.quality
        let iv = nextInterval(card, grade)
        if q < 3 { c.reps = 0; c.lapses += 1 } else { c.reps += 1 }
        c.intervalDays = iv
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

/// Estilos de flashcard oferecidos (as "20 regras" de Wozniak: um cartão testa UM
/// fato). Portado do app de Leis, adaptado para jurisprudência.
enum JurisFlashKind {
    static let cloze = "cloze"
    static let clozeType = "cloze_type"
    static let certoErrado = "certo_errado"
    static let direta = "direta"
}

enum FlashStyle: String, CaseIterable, Identifiable {
    case cloze, clozeDigite, certoErrado, direta
    var id: String { rawValue }
    var label: String {
        switch self {
        case .cloze: return "Lacuna — revelar"
        case .clozeDigite: return "Lacuna — escrever a resposta"
        case .certoErrado: return "Certo ou errado"
        case .direta: return "Pergunta direta"
        }
    }
    var simbolo: String {
        switch self {
        case .cloze: return "rectangle.dashed"
        case .clozeDigite: return "square.and.pencil"
        case .certoErrado: return "checkmark.circle"
        case .direta: return "questionmark.circle"
        }
    }
    var kind: String {
        switch self {
        case .cloze: return JurisFlashKind.cloze
        case .clozeDigite: return JurisFlashKind.clozeType
        case .certoErrado: return JurisFlashKind.certoErrado
        case .direta: return JurisFlashKind.direta
        }
    }
}

/// Gera um flashcard atômico a partir de um verbete — nunca "decore o verbete
/// inteiro". Reaproveita os motores do Exporter (melhor lacuna + inversão de tese).
@MainActor
enum JurisFlashcards {
    /// (kind, frente, resposta). `style` nil = automático (melhor lacuna).
    static func make(for e: JurisEntry, style: FlashStyle? = nil) -> (kind: String, prompt: String, answer: String?) {
        switch style {
        case .cloze:       if let c = cloze(e) { return c }
        case .clozeDigite: if let c = cloze(e) { return (JurisFlashKind.clozeType, c.prompt, c.answer) }
        case .certoErrado: if let c = certoErrado(e) { return c }
        case .direta:      if let c = direta(e) { return c }
        case nil: break
        }
        if let c = cloze(e) { return c }
        return (JurisFlashKind.direta, "Qual é a tese central de \(e.titulo)?", limparTese(e))
    }

    private static func base(_ e: JurisEntry) -> String {
        (e.enunciado.split(whereSeparator: { $0 == "\n" }).first.map(String.init) ?? e.enunciado)
            .trimmingCharacters(in: .whitespaces)
    }
    private static func limparTese(_ e: JurisEntry) -> String { base(e) }

    /// Cloze na melhor lacuna operativa (número/prazo/competência/tese).
    static func cloze(_ e: JurisEntry) -> (kind: String, prompt: String, answer: String?)? {
        let texto = base(e)
        guard let r = Exporter.melhorLacuna(texto) else { return nil }
        let ns = texto as NSString
        let termo = ns.substring(with: r)
        let prompt = ns.replacingCharacters(in: r, with: "______")
        return (JurisFlashKind.cloze, prompt, termo)
    }

    /// Certo/Errado: metade das vezes apresenta a versão FALSA (inversão de tese).
    static func certoErrado(_ e: JurisEntry) -> (kind: String, prompt: String, answer: String?)? {
        let texto = base(e)
        let querFalso = abs(e.id.hashValue) % 2 == 0
        if querFalso, let falso = Exporter.afirmacaoFalsaAuto(texto) {
            return (JurisFlashKind.certoErrado, falso, "Errado — correto: “\(texto)”.")
        }
        return (JurisFlashKind.certoErrado, texto, "Certo — reproduz a tese firmada.")
    }

    /// Pergunta direta a partir da lacuna operativa.
    static func direta(_ e: JurisEntry) -> (kind: String, prompt: String, answer: String?)? {
        let texto = base(e)
        guard let r = Exporter.melhorLacuna(texto) else { return nil }
        let ns = texto as NSString
        let termo = ns.substring(with: r)
        let clause = ns.replacingCharacters(in: r, with: "…")
        return (JurisFlashKind.direta, "Complete a tese:\n\n« \(clause) »", termo)
    }
}
