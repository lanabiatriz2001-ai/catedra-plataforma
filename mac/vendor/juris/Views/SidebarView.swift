import SwiftUI

/// Aviso ao host (main.swift) para abrir a janela "Ajustes — CátedraJURIS"
/// (o embed AppKit não tem cena Settings, então o SettingsLink não funciona aqui).
enum JurisHostBridge {
    static let openSettings = Notification.Name("CatedraJurisOpenSettings")
}

/// Ponte de sincronização: item do checklist de leitura (LEGIS ou JURIS) marcado
/// como feito → o host (main.swift) chama `window.catedraMarkChecklistDone` no
/// Cátedra pra marcar a tarefa correspondente do ciclo de estudos como concluída.
enum ChecklistSyncBridge {
    static let itemDone = Notification.Name("CatedraChecklistItemDone")
}

/// Payload da notificação `ChecklistSyncBridge.itemDone`.
struct ChecklistDonePayload {
    let origem: String              // "CátedraLEGIS" | "CátedraJURIS"
    let categoria: String?          // linkedCategoryLabel (matéria) — usado p/ casar com o bloco do ciclo
    let texto: String               // texto do item, fallback de correspondência
}

/// Barra lateral navy do CátedraJURIS — mesma família visual da sidebar do
/// Cátedra e do CátedraLEGIS (cores de --sbg/--stext/--sactbg espelhadas em
/// ThemeState.t). Menu limpo, SEM contagens (as contagens vivem nas páginas).
struct JurisSidebar: View {
    @Environment(LibraryStore.self) private var store
    @Environment(UpdateService.self) private var updater
    @ObservedObject private var clock = JurisClock.shared
    @State private var novaColecao = false
    @State private var nomeColecao = ""

    // A seleção "efetiva": páginas-filhas acendem a linha da sua seção.
    private var selecaoAtual: Selecao {
        switch store.selecao {
        case .edicao: return .central(.stj)                       // Juris em Teses
        case .infoEdicao(let f, _): return .central(f.central)
        case .fonte(let f): return .central(f.central)
        case .tjroHub, .tribunal: return .central(.especificos)
        case .tema: return .indice
        case .ramo, .ramosHub: return .ramosHub
        case .ramoDetalhe(let f), .filtro(let f):
            if f.tribunal != nil { return .central(.especificos) }
            if let c = f.central { return .central(c) }
            if f.ramo != nil { return .ramosHub }
            return .todos
        default: return store.selecao
        }
    }

    private func ativa(_ s: Selecao) -> Bool { store.leituraID == nil && selecaoAtual == s }
    private func ir(_ s: Selecao) {
        store.searchText = ""        // navegar por uma linha zera a busca (escopo limpo)
        store.leituraID = nil
        store.selecao = s
        store.selectedID = nil
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Logo — mesmo bloco do CátedraLEGIS
            HStack(spacing: 10) {
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .fill(ThemeState.t.accent).frame(width: 34, height: 34)
                    .overlay(Image(systemName: "building.columns.fill")
                        .font(.system(size: 15, weight: .bold)).foregroundStyle(.white))
                VStack(alignment: .leading, spacing: 0) {
                    Text("CátedraJURIS").font(.system(size: 14.5, weight: .bold)).foregroundStyle(.white)
                    Text("Vade Mecum de jurisprudência").font(.system(size: 10))
                        .foregroundStyle(ThemeState.t.sidebarText.opacity(0.85))
                        .lineLimit(1).minimumScaleFactor(0.8)
                }
            }
            .padding(.horizontal, 14).padding(.top, 16).padding(.bottom, 14)

            ScrollView {
                VStack(alignment: .leading, spacing: 2) {
                    row(.inicio, "Início", "house")
                    buscaRow
                    row(.todos, "Todos os verbetes", "square.stack.3d.up")
                    row(.favoritos, "Favoritos", "star")
                    row(.anotacoes, "Minhas anotações", "square.and.pencil")
                    row(.novidades, "Novidades", "sparkles", ponto: store.novidadesNaoVistas > 0)
                    row(.mapas, "Mapas mentais", "brain.head.profile")
                    row(.checklist, "Checklist de leitura", "checklist", ponto: store.checklistPendingCount > 0)
                    row(.indice, "Índice alfabético", "textformat.abc")

                    // As CENTRAIS: uma página-hub por tribunal (os botões dentro
                    // abrem as páginas de cada fonte — ex.: Súmulas Vinculantes).
                    secao("CENTRAIS")
                    ForEach(JurisCentral.allCases) { c in
                        row(.central(c), c.nome, c.simbolo)
                    }

                    // Ramos do Direito: BOTÃO que abre a página das disciplinas
                    // (dentro dela, assuntos e tipos de jurisprudência).
                    secao("NAVEGAR")
                    row(.ramosHub, "Ramos do Direito", "books.vertical", chevron: true)

                    secao("COLEÇÕES")
                    ForEach(store.colecoes) { c in
                        row(.colecao(c.id), c.nome, "folder")
                    }
                    Button { nomeColecao = ""; novaColecao = true } label: {
                        HStack(spacing: 11) {
                            Image(systemName: "plus").font(.system(size: 12, weight: .semibold)).frame(width: 20)
                            Text("Nova coleção").font(.system(size: 13, weight: .medium))
                            Spacer(minLength: 0)
                        }
                        .padding(.horizontal, 11).padding(.vertical, 8)
                        .foregroundStyle(ThemeState.t.sidebarText.opacity(0.8))
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 8).padding(.bottom, 14)
            }

            // Rodapé: progresso da atualização automática (quando rodando)
            if case .executando(let msg) = updater.fase {
                HStack(spacing: 8) {
                    ProgressView().controlSize(.small)
                    Text(msg).font(.system(size: 10))
                        .foregroundStyle(ThemeState.t.sidebarText.opacity(0.75)).lineLimit(2)
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 14).padding(.vertical, 10)
            }

            // Cronômetro de estudo AO VIVO + Ajustes (a busca vive nas páginas,
            // como no CátedraLEGIS; o strip do topo saiu).
            HStack(spacing: 10) {
                Image(systemName: clock.running ? "clock.fill" : "clock")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(clock.running ? ThemeState.t.accent : ThemeState.t.sidebarText.opacity(0.7))
                VStack(alignment: .leading, spacing: 1) {
                    Text(clock.formatted)
                        .font(.system(size: 17, weight: .semibold).monospacedDigit())
                        .foregroundStyle(.white)
                    Text(clock.running ? "revisando · vai pro Cátedra" : "tempo de estudo · play manual")
                        .font(.system(size: 8.5, weight: .medium))
                        .foregroundStyle(ThemeState.t.sidebarText.opacity(0.62))
                        .lineLimit(1).minimumScaleFactor(0.75)
                }
                Spacer(minLength: 0)
                Button { clock.togglePlay() } label: {
                    Image(systemName: clock.manualPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 26, height: 26)
                        .background(Circle().fill(clock.manualPlaying ? Color.white.opacity(0.16) : ThemeState.t.accent))
                }
                .buttonStyle(.plain)
                .help(clock.manualPlaying ? "Pausar o relógio de estudo" : "Iniciar o relógio de estudo")
                Button {
                    NotificationCenter.default.post(name: JurisHostBridge.openSettings, object: nil)
                } label: {
                    Image(systemName: "gearshape")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(ThemeState.t.sidebarText.opacity(0.8))
                        .frame(width: 26, height: 26)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .help("Ajustes do CátedraJURIS (⌥⌘,)")
            }
            .padding(.horizontal, 14).padding(.vertical, 11)
        }
        .frame(width: 210)
        .frame(maxHeight: .infinity)
        .background(ThemeState.t.sidebarBg)
        .alert("Nova coleção", isPresented: $novaColecao) {
            TextField("Nome (ex.: Meu edital)", text: $nomeColecao)
            Button("Criar") {
                let nome = nomeColecao.trimmingCharacters(in: .whitespaces)
                let c = store.criarColecao(nome.isEmpty ? "Nova coleção" : nome)
                ir(.colecao(c.id))
            }
            Button("Cancelar", role: .cancel) {}
        }
    }

    /// Busca global PERSISTENTE na sidebar (nunca desmonta → foco estável).
    /// "Buscar em tudo" = SEMPRE global: digitar leva a "Todos os verbetes" com o
    /// termo aplicado ao vivo (o filtro por escopo é a busca inline de cada página).
    private var buscaRow: some View {
        let bind = Binding(
            get: { store.searchText },
            set: { novo in
                store.searchText = novo
                if !novo.isEmpty {
                    store.leituraID = nil
                    store.selectedID = nil
                    if !ehEscopoTodos { store.selecao = .todos }
                }
            })
        return HStack(spacing: 8) {
            Image(systemName: "magnifyingglass").font(.system(size: 12, weight: .medium))
                .foregroundStyle(ThemeState.t.sidebarText.opacity(0.8))
            TextField("Buscar em tudo…", text: bind)
                .textFieldStyle(.plain).font(.system(size: 12.5))
                .foregroundStyle(.white)
            if !store.searchText.isEmpty {
                Button { store.searchText = "" } label: {
                    Image(systemName: "xmark.circle.fill").font(.system(size: 11))
                        .foregroundStyle(ThemeState.t.sidebarText.opacity(0.7))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 10).padding(.vertical, 7)
        .background(Color.white.opacity(0.10), in: Capsule())
        .overlay(Capsule().strokeBorder(Color.white.opacity(0.14), lineWidth: 1))
        .padding(.horizontal, 3).padding(.vertical, 3)
    }

    /// Já estamos em "Todos os verbetes" (sem leitura aberta)? Aí não precisa saltar.
    private var ehEscopoTodos: Bool {
        if case .todos = store.selecao { return store.leituraID == nil }
        return false
    }

    private func secao(_ t: String) -> some View {
        Text(t)
            .font(.system(size: 9.5, weight: .bold)).tracking(0.9)
            .foregroundStyle(ThemeState.t.sidebarText.opacity(0.55))
            .padding(.horizontal, 12).padding(.top, 16).padding(.bottom, 5)
    }

    @ViewBuilder
    private func row(_ sel: Selecao, _ label: String, _ icon: String,
                     chevron: Bool = false, ponto: Bool = false) -> some View {
        let active = ativa(sel)
        Button { ir(sel) } label: {
            HStack(spacing: 11) {
                Image(systemName: icon).font(.system(size: 13, weight: .medium)).frame(width: 20)
                Text(label).font(.system(size: 13, weight: active ? .semibold : .medium)).lineLimit(1)
                Spacer(minLength: 4)
                if ponto {   // pontinho discreto de novidades não vistas (sem número)
                    Circle().fill(ThemeState.t.accent).frame(width: 7, height: 7)
                }
                if chevron {
                    Image(systemName: "chevron.right").font(.system(size: 9, weight: .bold))
                        .foregroundStyle(ThemeState.t.sidebarText.opacity(0.55))
                }
            }
            .padding(.horizontal, 11).padding(.vertical, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: 9, style: .continuous)
                .fill(active ? ThemeState.t.sidebarActiveBg : Color.clear))
            .foregroundStyle(active ? ThemeState.t.sidebarActiveText : ThemeState.t.sidebarText)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
