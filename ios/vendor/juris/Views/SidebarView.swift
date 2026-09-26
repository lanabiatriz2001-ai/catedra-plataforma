import SwiftUI

/// Aviso ao host (main.swift) para abrir a janela "Ajustes — CátedraJURIS"
/// (o embed AppKit não tem cena Settings, então o SettingsLink não funciona aqui).
enum JurisHostBridge {
    static let openSettings = Notification.Name("CatedraJurisOpenSettings")
}

/// Ponte de sincronização: item do checklist de leitura (LEGIS ou JURIS) marcado
/// como feito → o host (main.swift) chama `window.catedraMarkChecklistDone` no
/// Cátedra pra marcar a tarefa correspondente do ciclo de estudos como concluída.
// ChecklistSyncBridge e ChecklistDonePayload moram em ios/vendor/comum: o LEGIS
// tambem depende deles, e dois donos do mesmo simbolo nao compilam.


/// Barra lateral navy do CátedraJURIS — mesma família visual da sidebar do
/// Cátedra e do CátedraLEGIS (cores de --sbg/--stext/--sactbg espelhadas em
/// ThemeState.t). Menu limpo, SEM contagens (as contagens vivem nas páginas).
///
/// Organizada pela ROTINA de quem treina magistratura:
///   HOJE       — o que fazer agora (Início, Revisar hoje, Novidades)
///   TREINAR    — o que gera nota (Simulado, Prova oral, Oral das bancas, Plano, Mapas)
///   ACERVO     — por força vinculante (Todos, Ramos, Informativos, STF/STJ/TSE,
///                Tribunais, Contas, DOD)
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
            SeloLateral(nome: "CátedraJURIS", subtitulo: "Jurisprudência")
            .padding(.horizontal, 14).padding(.top, 18).padding(.bottom, 14)

            // Busca em destaque logo abaixo do logo — igual ao CátedraLEGIS.
            buscaRow
                .padding(.horizontal, 14).padding(.bottom, 12)

            ScrollView {
                VStack(alignment: .leading, spacing: 2) {
                    // Entrega 4: os MESMOS 4 destinos do LEGIS; o resto está na vitrine de cada destino
                    // (JurisDestinoHub). O JurisMenu segue servindo a lista "Seções" do iPhone.
                    linha(.inicio, .hoje, contagem: store.srsDueCount + store.checklistPendingCount)
                    linha(.destino(.acervo), .acervo, contagem: store.entries.count)
                    // Vitrine na lateral: com o Acervo aberto, os tribunais aparecem logo abaixo,
                    // cada um com o ponto na sua cor — um toque abre a central dele.
                    if ativa(.destino(.acervo)) {
                        ForEach(JurisSidebar.tribunais, id: \.0) { t in
                            SubLinhaLateral(titulo: t.0, cor: CorTribunal.identidade(t.1)) { store.ir(.central(t.2)) }
                        }
                    }
                    linha(.destino(.treinar), .treinar)
                    linha(.novidades, .novidades, contagem: store.novidadesNaoVistas)
                    secao("MEU MATERIAL")
                    LinhaLateral(titulo: "Anotações, mapas e apoio", simbolo: "folder", ativa: ativa(.meuMaterial)) { store.ir(.meuMaterial) }
                }
                .padding(.horizontal, 10).padding(.bottom, 14)
            }

            // Meta do dia (a mesma de Ajustes → Meta diária), no rodapé da lateral.
            MetaLateral(feito: store.lidosHoje, meta: max(store.metaDiaria, 1), unidade: "verbetes")
                .padding(.horizontal, 12).padding(.bottom, 8)

            // Rodapé: progresso da atualização automática (quando rodando)
            if case .executando(let msg) = updater.fase {
                HStack(spacing: 8) {
                    ProgressView().controlSize(.small)
                    Text(msg).font(Typo.ui(10))
                        .foregroundStyle(ThemeState.t.sidebarText.opacity(0.75)).lineLimit(2)
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 14).padding(.vertical, 10)
            }

            // Cronômetro de estudo AO VIVO + Ajustes (a busca vive nas páginas,
            // como no CátedraLEGIS; o strip do topo saiu).
            // Espaçamento de 6 e alvos que avançam sobre o respiro HORIZONTAL também: com os dois
            // botões a 44 pt de largura o rodapé não cabia em 210 pt e o "00:00" quebrava em duas linhas.
            HStack(spacing: 6) {
                Image(systemName: clock.running ? "clock.fill" : "clock")
                    .font(Typo.ui(15, .semibold))
                    .foregroundStyle(clock.running ? ThemeState.t.accent : ThemeState.t.sidebarText.opacity(0.7))
                VStack(alignment: .leading, spacing: 1) {
                    Text(clock.formatted)
                        .font(Typo.num(17, .semibold))
                        .foregroundStyle(.white)
                        .lineLimit(1).fixedSize(horizontal: true, vertical: false)
                    Text(clock.running ? "revisando · vai pro Cátedra" : "tempo de estudo · play manual")
                        .font(Typo.ui(8.5, .medium))
                        .foregroundStyle(ThemeState.t.sidebarText.opacity(0.62))
                        .lineLimit(1).minimumScaleFactor(0.75)
                }
                Spacer(minLength: 0)
                // Play e engrenagem: o círculo de 26 pt continua igual; o alvo passa a 44 pt
                // (o recuo negativo avança sobre o respiro vertical de 11 pt da linha).
                Button { clock.togglePlay() } label: {
                    Image(systemName: clock.manualPlaying ? "pause.fill" : "play.fill")
                        .font(Typo.ui(13, .bold))
                        .foregroundStyle(.white)
                        .frame(width: 26, height: 26)
                        .background(Circle().fill(clock.manualPlaying ? Color.white.opacity(0.16) : ThemeState.t.accent))
                        .jurisAlvoToque().padding(.vertical, -9).padding(.horizontal, -7)
                }
                .buttonStyle(.plain)
                .help(clock.manualPlaying ? "Pausar o relógio de estudo" : "Iniciar o relógio de estudo")
                Button {
                    NotificationCenter.default.post(name: JurisHostBridge.openSettings, object: nil)
                } label: {
                    Image(systemName: "gearshape")
                        .font(Typo.ui(13, .medium))
                        .foregroundStyle(ThemeState.t.sidebarText.opacity(0.8))
                        .frame(width: 26, height: 26)
                        .jurisAlvoToque().padding(.vertical, -9).padding(.horizontal, -7)
                }
                .buttonStyle(.plain)
                .help("Ajustes do CátedraJURIS (⌥⌘,)")
            }
            .padding(.horizontal, 14).padding(.vertical, 11)
        }
        .frame(width: 236)
        .frame(maxHeight: .infinity)
        .fundoLateral()
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
            Image(systemName: "magnifyingglass").font(Typo.ui(12, .medium))
                .foregroundStyle(ThemeState.t.sidebarText.opacity(0.8))
            TextField("Buscar em tudo…", text: bind)
                .textFieldStyle(.plain).font(Typo.ui(12.5))
                .foregroundStyle(.white)
            if !store.searchText.isEmpty {
                Button { store.searchText = "" } label: {
                    Image(systemName: "xmark.circle.fill").font(Typo.ui(11))
                        .foregroundStyle(ThemeState.t.sidebarText.opacity(0.7))
                        .jurisAlvoToque().padding(.vertical, -8)   // alvo de 44 pt sem engordar o campo
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

    static let tribunais: [(String, String, JurisCentral)] = [
        ("STF", "STF", .stf), ("STJ", "STJ", .stj), ("TSE", "TSE", .tse),
        ("Tribunais estaduais", "TJRO", .especificos), ("Cortes de contas", "TCU", .contas),
    ]

    private func linha(_ sel: Selecao, _ d: Destino, contagem: Int? = nil) -> some View {
        LinhaLateral(titulo: d.titulo, simbolo: d.simbolo, ativa: ativa(sel), contagem: contagem) { store.ir(sel) }
    }

    private func secao(_ t: String) -> some View {
        Text(t)
            .font(Typo.ui(9.5, .bold)).tracking(0.9)
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
                Image(systemName: icon).font(Typo.ui(13, .medium)).frame(width: 20)
                    .foregroundStyle(iconColor(sel, active: active) ??
                                     (active ? ThemeState.t.sidebarActiveText : ThemeState.t.sidebarText))
                Text(label).font(Typo.ui(13, active ? .semibold : .medium)).lineLimit(1)
                Spacer(minLength: 4)
                if badge > 0 {   // contagem só onde é fila de trabalho (revisar hoje / checklist)
                    Text("\(badge)").font(Typo.num(10, .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6).padding(.vertical, 1)
                        .background(Capsule().fill(ThemeState.t.accent.opacity(active ? 0.6 : 0.9)))
                }
                if ponto {   // pontinho discreto de novidades não vistas (sem número)
                    Circle().fill(ThemeState.t.accent).frame(width: 7, height: 7)
                }
                if chevron {
                    Image(systemName: "chevron.right").font(Typo.ui(9, .bold))
                        .foregroundStyle(ThemeState.t.sidebarText.opacity(0.55))
                }
            }
            .padding(.horizontal, 11).padding(.vertical, 6)
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)   // linha = alvo de 44 pt
            .background(RoundedRectangle(cornerRadius: Palette.rInner, style: .continuous)
                .fill(active ? ThemeState.t.sidebarActiveBg : Color.clear))
            .foregroundStyle(active ? ThemeState.t.sidebarActiveText : ThemeState.t.sidebarText)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
