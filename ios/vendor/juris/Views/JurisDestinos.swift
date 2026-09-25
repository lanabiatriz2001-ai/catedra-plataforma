import SwiftUI

/// A que destino cada página do JURIS pertence (entrega 4) — a linha do destino acende nas
/// páginas-filhas. nil = "Meu material" (anotações e precedentes: o que é seu ou de apoio).
enum JurisDestinos {
    static func pai(_ s: Selecao) -> Destino? {
        if ehMeuMaterial(s) { return nil }
        switch s {
        case .inicio, .hoje: return .hoje
        case .novidades: return .novidades
        case .destino(let d): return d
        case .simulado, .provaOral, .oralBancas, .julgadoDoDia, .plano, .checklist: return .treinar
        default: return .acervo
        }
    }
    static func ehMeuMaterial(_ s: Selecao) -> Bool {
        switch s {
        case .meuMaterial, .anotacoes: return true
        case .central(let c): return c == .outros
        default: return false
        }
    }
}

/// Vitrine de um destino do JURIS (Acervo, Treinar) ou de "Meu material" (destino nil).
struct JurisDestinoHub: View {
    let destino: Destino?
    @Environment(LibraryStore.self) private var store
    @State private var novaColecao = false
    @State private var nomeColecao = ""

    private func item(_ id: String, _ titulo: String, _ detalhe: String?, _ simbolo: String,
                      _ sel: Selecao, cor: UInt32? = nil, n: Int? = nil) -> ItemHub {
        ItemHub(id: id, titulo: titulo, detalhe: detalhe, simbolo: simbolo, cor: cor, contagem: n,
                acao: { store.ir(sel) })
    }

    var body: some View {
        conteudo
            .alert("Nova coleção", isPresented: $novaColecao) {
                TextField("Nome (ex.: Meu edital)", text: $nomeColecao)
                Button("Criar") {
                    let nome = nomeColecao.trimmingCharacters(in: .whitespaces)
                    let c = store.criarColecao(nome.isEmpty ? "Nova coleção" : nome)
                    store.ir(.colecao(c.id))
                }
                Button("Cancelar", role: .cancel) {}
            }
    }

    @ViewBuilder
    private var conteudo: some View {
        switch destino {
        case .acervo?:
            DestinoHub(titulo: "Acervo", subtitulo: "\(store.entries.count) verbetes", secoes: [
                SecaoHub(titulo: "Tribunais", itens: [
                    item("stf", "STF", "Súmulas, vinculantes, repercussão geral", "building.columns", .central(.stf), cor: CorTribunal.identidade("STF")),
                    item("stj", "STJ", "Súmulas, repetitivos, teses", "building.columns", .central(.stj), cor: CorTribunal.identidade("STJ")),
                    item("tse", "TSE", nil, "building.columns", .central(.tse), cor: CorTribunal.identidade("TSE")),
                    item("tribunais", "Tribunais estaduais", "TJRO, TJGO…", "building.2", .central(.especificos), cor: CorTribunal.identidade("TJRO")),
                    item("contas", "Cortes de contas", "TCU e tribunais de contas", "banknote", .central(.contas), cor: CorTribunal.identidade("TCU")),
                ]),
                SecaoHub(titulo: "Percorrer", itens: [
                    item("todos", "Todos os verbetes", nil, "square.stack.3d.up", .todos, n: store.entries.count),
                    item("informativos", "Informativos", "Uma edição por quadro", "square.grid.3x3", .gradeInformativos),
                    item("ramos", "Ramos do Direito", nil, "books.vertical", .ramosHub),
                    item("indice", "Índice alfabético", nil, "textformat.abc", .indice),
                    item("favoritos", "Favoritos", nil, "star", .favoritos),
                ]),
                SecaoHub(titulo: "Coleções (Meu edital)",
                         itens: store.colecoes.map { c in item("col-\(c.id)", c.nome, nil, "folder", .colecao(c.id)) }
                         + [ItemHub(id: "nova-colecao", titulo: "Nova coleção", detalhe: nil, simbolo: "plus", cor: nil, contagem: nil,
                                    acao: { nomeColecao = ""; novaColecao = true })]),
            ])
        case .treinar?:
            DestinoHub(titulo: "Treinar", subtitulo: "", secoes: [
                SecaoHub(titulo: "", itens: [
                    item("revisar", "Revisar hoje", "Revisão espaçada e checklist", "sun.horizon", .hoje,
                         n: store.srsDueCount + store.checklistPendingCount),
                    item("simulado", "Simulado", "C/E e discursivas do acervo", "list.bullet.clipboard", .simulado),
                    item("oral", "Prova oral", nil, "mic", .provaOral),
                    item("oral-bancas", "Prova oral das bancas", "Pontos e padrão de resposta oficiais", "person.wave.2", .oralBancas),
                    item("julgado", "Julgado do dia", nil, "sun.max", .julgadoDoDia),
                    item("plano", "Plano de leitura", "Súmulas por dia", "calendar", .plano),
                    item("checklist", "Checklist de leitura", nil, "checklist", .checklist, n: store.checklistPendingCount),
                ]),
            ])
        default:
            DestinoHub(titulo: "Meu material", subtitulo: "O que é seu ou de apoio — fora do texto dos tribunais", secoes: [
                SecaoHub(titulo: "", itens: [
                    item("anotacoes", "Minhas anotações", nil, "square.and.pencil", .anotacoes),
                    item("dod", "Precedentes", "Precedentes obrigatórios e demais fontes", "text.book.closed", .central(.outros), cor: CorTribunal.dod),
                ]),
            ])
        }
    }
}
