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
///
/// Organizada pela ROTINA de quem treina magistratura:
///   HOJE       — o que fazer agora (Início, Revisar hoje, Novidades)
///   TREINAR    — o que gera nota (Simulado, Prova oral, Oral das bancas, Plano, Mapas)
///   ACERVO     — por força vinculante (Todos, Ramos, Informativos, STF/STJ/TSE,
///                Tribunais, Contas, Precedentes)
///   MEU ESTUDO — biblioteca pessoal (Favoritos, Anotações, Checklist, Coleções, Índice)
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

    private func ativa(_ s: Selecao) -> Bool {
        guard store.leituraID == nil else { return false }
        switch s {
        case .destino(let d): return JurisDestinos.pai(selecaoAtual) == d
        case .meuMaterial: return JurisDestinos.ehMeuMaterial(selecaoAtual)
        default: return selecaoAtual == s
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Logo — mesmo bloco do CátedraLEGIS
            HStack(spacing: 10) {
                RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous)
                    .fill(ThemeState.t.accent).frame(width: 34, height: 34)
                    .overlay(Image(systemName: "building.columns.fill")
                        .font(DS.interface(15, .bold)).foregroundStyle(.white))
                VStack(alignment: .leading, spacing: 0) {
                    Text("CátedraJURIS").font(DS.interface(14.5, .bold)).foregroundStyle(.white)
                    Text("Vade Mecum de jurisprudência").font(DS.interface(10))
                        .foregroundStyle(ThemeState.t.sidebarText.opacity(0.85))
                        .lineLimit(1).minimumScaleFactor(0.8)
                }
            }
            .padding(.horizontal, 14).padding(.top, 16).padding(.bottom, 10)

            // Busca em destaque logo abaixo do logo — igual ao CátedraLEGIS.
            buscaRow
                .padding(.horizontal, 14).padding(.bottom, 12)

            ScrollView {
                VStack(alignment: .leading, spacing: 2) {
                    // Entrega 4: os MESMOS 4 destinos do LEGIS. Tudo o que era linha solta está na
                    // vitrine do destino (JurisDestinoHub) — tabela de rastreio no PR.
                    row(.inicio, Destino.hoje.titulo, Destino.hoje.simbolo, badge: store.srsDueCount + store.checklistPendingCount)
                    row(.destino(.acervo), Destino.acervo.titulo, Destino.acervo.simbolo)
                    row(.destino(.treinar), Destino.treinar.titulo, Destino.treinar.simbolo)
                    row(.novidades, Destino.novidades.titulo, Destino.novidades.simbolo, ponto: store.novidadesNaoVistas > 0)
                    secao("MEU MATERIAL")
                    row(.meuMaterial, "Anotações, mapas e apoio", "folder")
                }
                .padding(.horizontal, 8).padding(.bottom, 14)
            }

            // Rodapé: progresso da atualização automática (quando rodando)
            if case .executando(let msg) = updater.fase {
                HStack(spacing: 8) {
                    ProgressView().controlSize(.small)
                    Text(msg).font(DS.interface(10))
                        .foregroundStyle(ThemeState.t.sidebarText.opacity(0.75)).lineLimit(2)
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 14).padding(.vertical, 10)
            }

            // Cronômetro de estudo AO VIVO + Ajustes (a busca vive nas páginas,
            // como no CátedraLEGIS; o strip do topo saiu).
            HStack(spacing: 10) {
                Image(systemName: clock.running ? "clock.fill" : "clock")
                    .font(DS.interface(15, .semibold))
                    .foregroundStyle(clock.running ? ThemeState.t.accent : ThemeState.t.sidebarText.opacity(0.7))
                VStack(alignment: .leading, spacing: 1) {
                    Text(clock.formatted)
                        .font(DS.interface(17, .semibold).monospacedDigit())
                        .foregroundStyle(.white)
                    Text(clock.running ? "revisando · vai pro Cátedra" : "tempo de estudo · play manual")
                        .font(DS.interface(8.5, .medium))
                        .foregroundStyle(ThemeState.t.sidebarText.opacity(0.62))
                        .lineLimit(1).minimumScaleFactor(0.75)
                }
                Spacer(minLength: 0)
                Button { clock.togglePlay() } label: {
                    Image(systemName: clock.manualPlaying ? "pause.fill" : "play.fill")
                        .font(DS.interface(13, .bold))
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
                        .font(DS.interface(13, .medium))
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
                store.ir(.colecao(c.id))
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
            Image(systemName: "magnifyingglass").font(DS.interface(12, .medium))
                .foregroundStyle(ThemeState.t.sidebarText.opacity(0.8))
            TextField("Buscar em tudo…", text: bind)
                .textFieldStyle(.plain).font(DS.interface(12.5))
                .foregroundStyle(.white)
            if !store.searchText.isEmpty {
                Button { store.searchText = "" } label: {
                    Image(systemName: "xmark.circle.fill").font(DS.interface(11))
                        .foregroundStyle(ThemeState.t.sidebarText.opacity(0.7))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 10).padding(.vertical, 7)
        .background(RoundedRectangle(cornerRadius: Palette.rInner).fill(Color.white.opacity(0.08)))
        .overlay(RoundedRectangle(cornerRadius: Palette.rInner).strokeBorder(Color.white.opacity(0.10), lineWidth: 1))
    }

    /// Já estamos em "Todos os verbetes" (sem leitura aberta)? Aí não precisa saltar.
    private var ehEscopoTodos: Bool {
        if case .todos = store.selecao { return store.leituraID == nil }
        return false
    }

    private func secao(_ t: String) -> some View {
        Text(t)
            .font(DS.interface(9.5, .bold)).tracking(0.9)
            .foregroundStyle(ThemeState.t.sidebarText.opacity(0.55))
            .padding(.horizontal, 12).padding(.top, 16).padding(.bottom, 5)
    }

    /// Cor de identidade do ícone (como o LEGIS colore as matérias): Centrais na cor do
    /// TRIBUNAL (Palette.corDeCentral, a mesma do FonteBadge) + Ramos. Clareadas para
    /// ler sobre o navy. Nulo quando ativo (aí o ícone acompanha o texto de seleção).
    private func iconColor(_ sel: Selecao, active: Bool) -> Color? {
        guard !active else { return nil }
        switch sel {
        case .central(let c): return Palette.corDeCentral(c, clara: true)
        case .ramosHub, .ramo, .ramoDetalhe: return Color(hex: "#80D19E")   // verde (ramo) clareado p/ navy
        default: return nil
        }
    }

    @ViewBuilder
    private func row(_ sel: Selecao, _ label: String, _ icon: String,
                     chevron: Bool = false, ponto: Bool = false, badge: Int = 0) -> some View {
        let active = ativa(sel)
        Button { store.ir(sel) } label: {
            HStack(spacing: 11) {
                Image(systemName: icon).font(DS.interface(13, .medium)).frame(width: 20)
                    .foregroundStyle(iconColor(sel, active: active) ??
                                     (active ? ThemeState.t.sidebarActiveText : ThemeState.t.sidebarText))
                Text(label).font(DS.interface(13, active ? .semibold : .medium)).lineLimit(1)
                Spacer(minLength: 4)
                if badge > 0 {   // contagem só onde é fila de trabalho (revisar hoje / checklist)
                    Text("\(badge)").font(DS.interface(10, .bold).monospacedDigit())
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6).padding(.vertical, 1)
                        .background(Capsule().fill(ThemeState.t.accent.opacity(active ? 0.6 : 0.9)))
                }
                if ponto {   // pontinho discreto de novidades não vistas (sem número)
                    Circle().fill(ThemeState.t.accent).frame(width: 7, height: 7)
                }
                if chevron {
                    Image(systemName: "chevron.right").font(DS.interface(9, .bold))
                        .foregroundStyle(ThemeState.t.sidebarText.opacity(0.55))
                }
            }
            .padding(.horizontal, 11).padding(.vertical, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous)
                .fill(active ? ThemeState.t.sidebarActiveBg : Color.clear))
            .foregroundStyle(active ? ThemeState.t.sidebarActiveText : ThemeState.t.sidebarText)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
