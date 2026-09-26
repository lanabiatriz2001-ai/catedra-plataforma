# Reformulação LEGIS/JURIS nativos — Entrega 3: leitor de verbete do JURIS na mesma casca — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** O verbete do JURIS passa a abrir na mesma casca do leitor do LEGIS. A barra (`BarraLeitor`) tem até 5 controles: onde estou · Ler/Estudar · Aa · ⋯. O modo **Ler** mostra só a fonte primária: enunciado ou tese, situação, ficha, precedentes e referências oficiais. O modo **Estudar** mostra o roteiro, a nota de estudo e as suas anotações. A **gaveta** traz *Artigos citados · Relacionados*, e "Abrir no LEGIS" leva direto ao artigo.

**Architecture:**
- **Artigos citados.** Vêm do **índice de incidência já embarcado** (`incidencia-verbetes.json`), invertido: verbete → (diploma, artigo). O mesmo dado liga o LEGIS ao JURIS, então os dois sentidos concordam.
- **Abrir no LEGIS.** Uma notificação nova, `catedraAbrirArtigoLegis`, faz o host trocar para a aba LEGIS. O `ContentView` do LEGIS abre a norma no artigo (modo Estudar), usando o padrão que já existe (`setLastUnit` + `openLaw`). Um "pedido pendente" estático cobre o caso de o LEGIS ainda não estar montado.
- **Lógica pura.** Inversão e ordenação dos artigos ficam na base e são testadas no harness.

**Spec:** `docs/superpowers/specs/2026-09-25-redesenho-legis-juris-nativo-design.md` §5 e §8 (entrega 3). Base: branch `redesenho-nativo-2-leitor-legis` (PR #146).

## Global Constraints
- Valem todas as da entrega 2: pt-BR; só fonte primária no leitor e na gaveta; barra com no máximo 5 controles; código novo com `DS.*` e catraca sem aumento; as duas árvores; builds um de cada vez; instalação no Mac e no iPad.
- **Nenhum estado persistido novo.** O modo Ler/Estudar do verbete é estado de tela (`@State`, começa em Ler).
- Os blocos secundários (Comentário, Observação, nota de estudo do app, roteiro e anotações) **não somem**. Os dois primeiros ficam no ⋯ ("Comentário e observação"), e os três últimos ficam no modo Estudar.

## Onde este plano ajusta a spec
- **Artigos citados vêm do índice de incidência, não do campo `referencias`.** Esse campo só existe em 9,7% dos verbetes, quase todos súmulas, e metade está num código legado do STJ ("LEG:FED LEI:008078 …"). O índice de incidência cobre todas as fontes e é o mesmo dado que o LEGIS usa, então os dois lados concordam. O texto de `referencias` continua visível no modo Ler, como bloco "Referências legislativas".
- **"Abrir no LEGIS" abre o artigo no modo Estudar.** É o único caminho que já posiciona um artigo específico (`setLastUnit`).

## Review Focus
1. **Verbete sem artigo citado:** a aba mostra "Nenhum artigo de lei do catálogo é citado por este verbete.", sem quebrar. Teste: Task 1 (inversão vazia).
2. **Diploma citado que não está baixado ou não está no catálogo:** a linha aparece sem "Abrir no LEGIS", ou o LEGIS abre a norma para baixar. Não trava. Teste: Task 2 (manual).
3. **Ordem dos artigos:** "2" < "10" < "10-A" < "100", e não a ordem alfabética. Teste: Task 1.
4. **Abrir no LEGIS com o LEGIS nunca aberto na sessão:** o pedido pendente é consumido quando o LEGIS monta. Teste: manual na Task 4.
5. **Verbete sem enunciado ou só com tese:** o modo Ler não fica vazio (mantém cabeçalho, ficha e precedentes). Teste: captura.

---

### Task 1: Inversão artigo→verbete (base, testada)

**Files:** Create `ios/vendor/design/CitacoesLogica.swift`; Modify `{mac,ios}/vendor/legis/JurisPorArtigo.swift`; Test `tests/design-nativo/main.swift`.

**Produces:**
- `struct ArtigoCitado: Equatable, Hashable { let diploma: String; let artigo: String }`
- `enum CitacoesLogica { static func inverter(_ d: [String: [String: [String]]]) -> [String: [ArtigoCitado]]; static func ordenar(_ xs: [ArtigoCitado]) -> [ArtigoCitado]; static func chaveArtigo(_ a: String) -> (Int, String) }`
- `JurisPorArtigo.artigosCitados(verbeteID: String) -> [ArtigoCitado]` (índice invertido, montado uma vez)

- [ ] **Step 1: teste que falha** (antes do marcador do harness):
```swift
// ── Artigos citados (entrega 3) ─────────────────────────────────────────────
let invertido = CitacoesLogica.inverter([
    "Constituição Federal": ["5": ["v1", "v2"], "10-A": ["v1"], "100": ["v1"], "2": ["v1"]],
    "Código Civil": ["186": ["v1"]]])
confere(CitacoesLogica.ordenar(invertido["v1"] ?? []).map { "\($0.diploma)|\($0.artigo)" }
        == ["Código Civil|186", "Constituição Federal|2", "Constituição Federal|5", "Constituição Federal|10-A", "Constituição Federal|100"],
        "artigos citados: por diploma e em ordem numérica (2 < 5 < 10-A < 100)")
confere(invertido["v2"] == [ArtigoCitado(diploma: "Constituição Federal", artigo: "5")] && invertido["vX"] == nil,
        "inversão: verbete com um artigo e verbete sem nenhum")
confere(CitacoesLogica.inverter([:]).isEmpty, "índice vazio: nada")
```
- [ ] **Step 2:** `bash scripts/testar-design-nativo.sh`. Esperado: FAIL "cannot find 'CitacoesLogica'".
- [ ] **Step 3: implementar** `ios/vendor/design/CitacoesLogica.swift`:
```swift
import Foundation

/// Artigo de lei citado por um verbete do JURIS — o inverso do índice de incidência
/// (incidencia-verbetes.json liga artigo → verbetes; aqui, verbete → artigos).
struct ArtigoCitado: Equatable, Hashable {
    let diploma: String
    let artigo: String
}

enum CitacoesLogica {
    /// [diploma: [artigo: [ids de verbete]]] → [id: [ArtigoCitado]] (sem ordem garantida).
    static func inverter(_ d: [String: [String: [String]]]) -> [String: [ArtigoCitado]] {
        var saida: [String: [ArtigoCitado]] = [:]
        for (diploma, artigos) in d {
            for (artigo, ids) in artigos {
                for id in ids { saida[id, default: []].append(ArtigoCitado(diploma: diploma, artigo: artigo)) }
            }
        }
        return saida
    }

    /// "10-A" → (10, "A"): ordem numérica, com a letra desempatando.
    static func chaveArtigo(_ a: String) -> (Int, String) {
        let partes = a.split(separator: "-", maxSplits: 1).map(String.init)
        return (Int(partes.first ?? "") ?? Int.max, partes.count > 1 ? partes[1] : "")
    }

    static func ordenar(_ xs: [ArtigoCitado]) -> [ArtigoCitado] {
        xs.sorted {
            if $0.diploma != $1.diploma { return $0.diploma.localizedCompare($1.diploma) == .orderedAscending }
            let a = chaveArtigo($0.artigo), b = chaveArtigo($1.artigo)
            return a.0 != b.0 ? a.0 < b.0 : a.1 < b.1
        }
    }
}
```
- [ ] **Step 4: `JurisPorArtigo` (nas duas árvores)**:
```swift
    private static var porVerbete: [String: [ArtigoCitado]]?

    /// Artigos do catálogo citados pelo verbete `id` (inverso do índice de incidência).
    static func artigosCitados(verbeteID id: String) -> [ArtigoCitado] {
        carregar()
        if porVerbete == nil {
            porVerbete = CitacoesLogica.inverter(diplomas.values.reduce(into: [:]) { acc, d in
                acc[d.nome] = d.artigos.mapValues { $0.map(\.id) }
            })
        }
        return CitacoesLogica.ordenar(porVerbete?[id] ?? [])
    }
```
- [ ] **Step 5:** harness `tudo certo`. Builds do Mac e do iPad sem erro. Commit: "O JURIS passa a saber quais artigos de lei cada verbete cita, pelo mesmo índice que o LEGIS usa".

### Task 2: "Abrir no LEGIS" (notificação + host + ContentView)

**Files:** `{mac,ios}/vendor/legis/JurisPorArtigo.swift`, `{mac,ios}/vendor/legis/ContentView.swift`, `{mac,ios}/Sources/main.swift`.

- [ ] **Step 1: em `JurisPorArtigo`**:
```swift
    static let notificacaoAbrirLegis = Notification.Name("catedraAbrirArtigoLegis")
    /// Pedido pendente: o LEGIS pode não estar montado quando o JURIS pede — ContentView
    /// consome ao aparecer (e também ao receber a notificação).
    static var pedidoLegis: ArtigoCitado?

    static func abrirNoLegis(_ a: ArtigoCitado) {
        pedidoLegis = a
        NotificationCenter.default.post(name: notificacaoAbrirLegis, object: nil)
    }

    /// Diploma do índice → norma do catálogo (mesma normalização de `verbetes(lei:label:)`).
    static func lei(doDiploma nome: String, em leis: [LawEntry]) -> LawEntry? {
        let alvo = norm(nome)
        return leis.first { norm($0.title) == alvo }
    }
```
- [ ] **Step 2: host.**
  - Mac (`main.swift`, ao lado do observer de `notificacaoAbrir`): observer de `notificacaoAbrirLegis` → `self.switchTo(1)`.
  - iPad: o mesmo, com `self.selecionarAba(1)`.
- [ ] **Step 3: `ContentView` do LEGIS (nas duas árvores).** Função e ganchos:
```swift
    private func consumirPedidoLegis() {
        guard let p = JurisPorArtigo.pedidoLegis,
              let law = JurisPorArtigo.lei(doDiploma: p.diploma, em: store.laws) else { return }
        JurisPorArtigo.pedidoLegis = nil
        if let idx = store.articleUnitID(lawID: law.id, number: p.artigo) { store.setLastUnit(law.id, idx) }
        readerMode = "estudo"
        openLaw(law.id)
    }
```
  Na raiz, ao lado do `.onReceive(... AcervoEntrada.notificacaoBuscar)`:
```swift
        .onReceive(NotificationCenter.default.publisher(for: JurisPorArtigo.notificacaoAbrirLegis)) { _ in consumirPedidoLegis() }
        .onAppear { consumirPedidoLegis() }
```
  (Use os nomes `readerMode` e `openLaw` que o `ContentView` já tem. No iPad, confira se `openLaw` também existe no ramo compacto.)
- [ ] **Step 4:** builds do Mac e do iPad. Commit: "Do JURIS dá para abrir no LEGIS o artigo citado por um verbete".

### Task 3: `EntryDetailView` na casca do leitor (nas duas árvores)

**Files:** `{mac,ios}/vendor/juris/Views/EntryDetailView.swift`.

- [ ] **Step 1: estado de tela.**
```swift
    @State private var modoVerbete: ModoLeitor = .ler
    @State private var gaveta: AlturaGaveta = .fechada
    @State private var abaGaveta = 0
    @State private var mostrarSecundario = false
```
- [ ] **Step 2: corpo.** No `VStack` do `body`, troque a sequência de blocos por:
```swift
                header
                alertaSituacao
                enunciadoCard
                if modoVerbete == .ler {
                    ligacoesVerbete
                    metadata
                    if let p = entry.precedentes, !p.isEmpty { disclosure("Precedentes / Julgados", "text.quote", p) }
                    if let r = entry.referencias, !r.isEmpty { disclosure("Referências legislativas", "book.closed", r) }
                    footer
                } else {
                    RoteiroEstudoView(entry: entry, autoGerar: true, vizinhosAbaixo: true,
                                      aoMudarQuadro: { vizinhos = $0 })
                    anotacaoCard
                    notaAppCard
                    relacionadosSection
                }
```
  (Comentário e Observação saem do corpo e vão para a folha `mostrarSecundario`.)
- [ ] **Step 3: barra.** Troque `entryToolbar` por `BarraLeitor` no `safeAreaInset(.top)`. No iPad, faça isso só fora do compacto; o compacto mantém `entryToolbarCompacta`.
```swift
        .safeAreaInset(edge: .top, spacing: 0) {
            BarraLeitor(ramo: [entry.tribunal, entry.ramoDireito ?? ""].filter { !$0.isEmpty }.joined(separator: " · "),
                        corRamo: CorTribunal.identidade(entry.tribunal) ?? Ramo.deNome(entry.ramoDireito)?.identidade,
                        titulo: entry.titulo,
                        modo: $modoVerbete, aoVoltar: nil,
                        aa: { tamanhoMenu }, mais: { maisVerbete })
        }
```
  - `tamanhoMenu` é o menu "Tamanho do texto" que já existia (Aumentar, Diminuir, Padrão), com label `Image(systemName: "textformat.size").font(DS.interface(17))` e área de toque de 44 pt.
  - `maisVerbete` é um `Menu` com os mesmos itens de hoje, organizados em seções:
    - "Marcar": favoritar, importante, lido;
    - "Estudar": coleções (submenu), flashcard (submenu);
    - "Ferramentas": comparar, mapa, linha do tempo;
    - "Compartilhar": copiar, PDF, imagem, Anki;
    - "Minhas anotações" (inspector);
    - "Comentário e observação": `mostrarSecundario = true`, só se algum dos dois existir.

    Label `Image(systemName: "ellipsis.circle")` com 44 pt e `.accessibilityLabel("Mais")`. As ações que a barra antiga tinha passam a morar aqui, sem mudar de comportamento. Depois apague `entryToolbar`/`capsIcon`, se ficarem sem uso. No iPad, `acoesVerbete` continua existindo para o compacto.
- [ ] **Step 4: ligações e gaveta.**
```swift
    private var ligacoesVerbete: some View {
        let n = JurisPorArtigo.artigosCitados(verbeteID: entry.id).count
        return HStack(spacing: DSEspaco.e3) {
            Button { abaGaveta = 0; gaveta = .meia } label: {
                Label(n == 0 ? "Artigos citados" : "Artigos citados · \(n)", systemImage: "book.closed")
            }
            Button { abaGaveta = 1; gaveta = .meia } label: { Label("Relacionados", systemImage: "square.stack") }
        }
        .buttonStyle(.bordered).font(DS.interface(14, .semibold)).frame(minHeight: 44)
    }
```
  Gaveta sobre o `ScrollViewReader` (em `ZStack(alignment: .bottom)` ou `.overlay(alignment: .bottom)`):
```swift
        .overlay(alignment: .bottom) {
            if gaveta != .fechada {
                GavetaContexto(altura: $gaveta, titulo: entry.titulo, subtitulo: entry.tribunal,
                               abas: ["Artigos citados", "Relacionados"], aba: $abaGaveta,
                               compacto: ehCompactoOuFalso) { conteudoGavetaVerbete }
            }
        }
```
  `ehCompactoOuFalso`: `false` no Mac, `ehCompacto` no iPad.
```swift
    @ViewBuilder
    private var conteudoGavetaVerbete: some View {
        if abaGaveta == 0 {
            let arts = JurisPorArtigo.artigosCitados(verbeteID: entry.id)
            if arts.isEmpty {
                Text("Nenhum artigo de lei do catálogo é citado por este verbete.")
                    .font(DS.interface(15)).foregroundStyle(ThemeState.t.text2)
            }
            VStack(alignment: .leading, spacing: DSEspaco.e2) {
                ForEach(arts, id: \.self) { a in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Art. \(a.artigo)").font(DS.display(17, .bold)).foregroundStyle(ThemeState.t.ink)
                            Text(a.diploma).font(DS.interface(13)).foregroundStyle(ThemeState.t.text2)
                        }
                        Spacer()
                        Button("Abrir no LEGIS") { JurisPorArtigo.abrirNoLegis(a) }
                            .font(DS.interface(13, .semibold)).frame(minHeight: 44)
                    }
                    .padding(DSEspaco.e3)
                    .background(RoundedRectangle(cornerRadius: DSRaio.card, style: .continuous).strokeBorder(ThemeState.t.border))
                }
            }
        } else {
            let rel = store.relacionados(entry, limite: 12)
            if rel.isEmpty {
                Text("Nenhum julgado relacionado no acervo.").font(DS.interface(15)).foregroundStyle(ThemeState.t.text2)
            }
            VStack(alignment: .leading, spacing: DSEspaco.e2) {
                ForEach(rel) { r in
                    Button { gaveta = .fechada; store.lerCheio(r.id) } label: {
                        VStack(alignment: .leading, spacing: DSEspaco.e1) {
                            Text("\(r.tribunal) · \(r.titulo)").font(DS.interface(14, .semibold)).foregroundStyle(ThemeState.t.ink)
                            Text(r.enunciado).font(DS.display(15, .regular)).foregroundStyle(ThemeState.t.text2).lineLimit(3)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading).padding(DSEspaco.e3)
                        .background(RoundedRectangle(cornerRadius: DSRaio.card, style: .continuous).strokeBorder(ThemeState.t.border))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
```
  Folha secundária:
```swift
        .sheet(isPresented: $mostrarSecundario) {
            ScrollView {
                VStack(alignment: .leading, spacing: DSEspaco.e4) {
                    Text("Comentário e observação").font(DS.display(19, .bold))
                    Text("Material de apoio, não é o texto do tribunal.").font(DS.interface(13)).foregroundStyle(ThemeState.t.text3)
                    if let c = entry.comentario, !c.isEmpty { Text(c).font(DS.display(16, .regular)).textSelection(.enabled) }
                    if let o = entry.observacao, !o.isEmpty { Text(o).font(DS.display(16, .regular)).textSelection(.enabled) }
                }.padding(DSEspaco.e5)
            }.frame(minWidth: 420, minHeight: 320)
        }
```
- [ ] **Step 5:** catraca sem aumento (se a contagem descer, rode `--atualizar`). Builds do Mac e do iPad. Commit: "O verbete do JURIS abre em foco: barra com cinco controles, Ler só com o texto do tribunal e gaveta com os artigos citados e os relacionados".

### Task 4: Verificação, revisão, instalação e PR
- [ ] Rodar as suítes (`npm test`, `test:webkit`).
- [ ] No simulador: abrir um verbete do JURIS e conferir:
  - o modo Ler;
  - a gaveta nas duas abas;
  - o "Abrir no LEGIS", que deve cair no artigo;
  - o modo Estudar, com roteiro e anotações;
  - a folha secundária, aberta pelo ⋯.

  Olhar cada captura.
- [ ] Revisor independente da branch, depois correções dos achados Critical e Important com teste.
- [ ] Instalação no Mac e no iPad.
- [ ] PR com base `redesenho-nativo-2-leitor-legis`.
