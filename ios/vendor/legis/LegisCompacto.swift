import SwiftUI
import UIKit

// =====================================================================================
//  CátedraLEGIS COMPACTO (F2 do plano do iPhone, docs/plans/iphone-nativo-2026-09-11.md).
//
//  Tudo aqui só entra em cena quando a largura é COMPACTA (`@Environment(\.ehCompacto)`,
//  helper comum de ios/vendor/comum/CompatSwiftUI.swift): iPhone em retrato, Slide Over.
//  No iPad em tela cheia (regular) nada disto é montado — a barra lateral de 210 pt e o
//  leitor continuam como estavam. Nomes com prefixo `legis` porque LEGIS e JURIS compilam
//  no MESMO módulo e um helper homônimo do JURIS colidiria.
// =====================================================================================

extension View {
    /// `alvoToque()` condicional: em compacto o frame cresce até 44 × 44 pt e a área toda
    /// responde ao toque; em regular devolve a view intocada (pixel a pixel igual).
    @ViewBuilder
    func legisAlvoToque(_ ativo: Bool) -> some View {
        if ativo { self.alvoToque() } else { self }
    }

    /// Alturas (detents) de uma folha SÓ em compacto: no iPhone uma folha de meia altura
    /// para um editor de 150 pt; no iPad a folha do sistema segue intacta.
    @ViewBuilder
    func legisDetentesSeCompacto(_ detents: Set<PresentationDetent>) -> some View {
        LegisDetentesSeCompacto(detents: detents) { self }
    }

    /// Pergunta antes de jogar fora um rascunho ("Descartar o que você escreveu?").
    /// `descartar` roda só se a pessoa confirmar; "Continuar escrevendo" fecha o diálogo.
    func legisDescartarRascunho(isPresented: Binding<Bool>, descartar: @escaping () -> Void) -> some View {
        confirmationDialog("Descartar o que você escreveu?", isPresented: isPresented, titleVisibility: .visible) {
            Button("Descartar", role: .destructive, action: descartar)
            Button("Continuar escrevendo", role: .cancel) {}
        }
    }
}

/// Lê o size class DA FOLHA (o conteúdo de .sheet tem ambiente próprio) e aplica os
/// detents só quando ela é compacta; em regular devolve o conteúdo como está.
private struct LegisDetentesSeCompacto<Conteudo: View>: View {
    let detents: Set<PresentationDetent>
    @ViewBuilder let conteudo: () -> Conteudo
    @Environment(\.ehCompacto) private var ehCompacto

    var body: some View {
        if ehCompacto {
            conteudo().presentationDetents(detents).presentationDragIndicator(.visible)
        } else {
            conteudo()
        }
    }
}

/// Barra "Concluir" acima do teclado para UITextView hospedadas em UIViewRepresentable
/// (o `.tecladoConcluir(foco:)` do SwiftUI só alcança campos com FocusState). Devolve
/// uma UIToolbar pronta para `inputAccessoryView`; o botão tira o foco da própria view.
@MainActor
func legisBarraConcluir(para textView: UITextView) -> UIToolbar {
    let barra = UIToolbar(frame: CGRect(x: 0, y: 0, width: 320, height: 44))
    barra.sizeToFit()
    let concluir = UIBarButtonItem(title: "Concluir", primaryAction: UIAction { [weak textView] _ in
        textView?.resignFirstResponder()
    })
    concluir.style = .done
    barra.items = [UIBarButtonItem.flexibleSpace(), concluir]
    return barra
}

// MARK: - "Seções": a lista da barra lateral como TELA (compacto)

/// No iPhone a barra lateral não cabe ao lado do conteúdo. Esta tela é a MESMA lista que
/// `LegisSidebar` monta (Início, listas, TREINO, MATÉRIAS, Nova matéria), em List inset
/// grouped, empurrada na mesma `path` do NavigationStack pelo botão "Seções" do Início.
/// Cada linha faz o que a linha da barra lateral faz hoje: abre a seção na pilha.
struct LegisSecoesScreen: View {
    @EnvironmentObject var store: AppStore
    @Binding var path: [NavRoute]
    @Binding var showNewCategory: Bool
    var openPalette: () -> Void = {}

    private var lawCount: Int { store.laws.filter(\.isRegularLaw).count }
    private var novidadesCount: Int { store.laws.filter(\.isNovidades).count }
    private var pendingChecklist: Int { store.readingChecklist.filter { !$0.done }.count }
    private func categoryCount(_ c: LawCategory) -> Int {
        store.laws.filter { $0.isRegularLaw && $0.customCategory == nil && $0.category == c }.count
    }
    private func customCategoryCount(_ name: String) -> Int {
        store.laws.filter { $0.isRegularLaw && $0.customCategory == name }.count
    }

    private func abrir(_ item: SidebarItem) {
        // Início = volta à raiz; seção = empilha sobre "Seções" (o gesto de voltar traz
        // a lista de novo, como um menu).
        if item == .home { path = [] } else { path.append(.section(item)) }
    }

    var body: some View {
        List {
            Section {
                linha(.home, "Início", "house")
                linha(.all, "Todas as normas", "books.vertical", badge: lawCount)
                linha(.favorites, "Favoritos", "star", badge: store.favoriteCount)
                linha(.indiceEstrutural, "Índice das normas", "list.bullet.indent")
                linha(.subjects, "Assuntos", "tag")
                linha(.globalSearch, "Buscar em tudo", "magnifyingglass")
                linha(.novidades, "Novidades", "sparkles", badge: novidadesCount)
                linha(.dou, "Diário Oficial", "newspaper")
                linha(.updates, "Atualizações", "bell.badge", badge: store.unreadCount)
            }
            Section("Treino") {
                linha(.planoLeitura, "Plano de leitura", "calendar")
                linha(.checklist, "Checklist", "checklist", badge: pendingChecklist)
                linha(.incidencia, "Incidência", "target")
                linha(.simuladoLegis, "Simulado de lei seca", "checkmark.seal")
                linha(.provaOral, "Prova oral", "mic")
            }
            Section("Matérias") {
                ForEach(LawCategory.allCases.filter { categoryCount($0) > 0 }) { cat in
                    linha(.category(cat), cat.rawValue, cat.symbol, badge: categoryCount(cat), cor: cat.color)
                }
                ForEach(store.customCategories, id: \.self) { name in
                    linha(.customCategory(name), name, "tag.fill", badge: customCategoryCount(name))
                }
                Button { showNewCategory = true } label: {
                    Label("Nova matéria", systemImage: "plus")
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(AppTheme.pageBackground)
        .navigationTitle("Seções")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: openPalette) {
                    Image(systemName: "magnifyingglass").alvoToque()
                }
                .accessibilityLabel("Buscar norma, matéria ou ação")
            }
        }
    }

    @ViewBuilder
    private func linha(_ item: SidebarItem, _ rotulo: String, _ icone: String,
                       badge: Int? = nil, cor: Color? = nil) -> some View {
        Button { abrir(item) } label: {
            HStack(spacing: 12) {
                Image(systemName: icone)
                    .font(AppTheme.ui(15, .medium))
                    .foregroundStyle(cor ?? ThemeState.t.accent)
                    .frame(width: 24)
                Text(rotulo).foregroundStyle(AppTheme.ink)
                Spacer(minLength: 4)
                if let badge, badge > 0 {
                    Text("\(badge)").font(Typo.num(12, .medium)).foregroundStyle(AppTheme.secondaryInk)
                }
                Image(systemName: "chevron.right").font(AppTheme.ui(12, .semibold))
                    .foregroundStyle(AppTheme.secondaryInk.opacity(0.6))
            }
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
