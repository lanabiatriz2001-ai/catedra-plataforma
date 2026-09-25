# Reformulação LEGIS/JURIS nativos — Entrega 2: leitor do LEGIS em foco, com gaveta — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o modo "Leitura corrida" do LEGIS no modo **Ler** da spec: a norma inteira numa coluna de leitura em Spectral, uma barra com no máximo 5 controles, e um toque no cabeçalho de um artigo que abre, de baixo, a **gaveta de contexto** com *Jurisprudência · Remissões*. A jurisprudência traz só o texto oficial, e "Abrir no JURIS" leva ao verbete.

**Architecture:** A lógica pura fica na base (`ios/vendor/design/LeitorLogica.swift`) e é testada pelo harness Swift da entrega 1: achar cabeçalhos "Art. N", recortar o trecho do artigo e calcular a altura da gaveta. Os componentes visuais também ficam na base: `BarraLeitor` e `GavetaContexto`. O leitor corrido (`AnnotatedTextView`, Mac e iPad) ganha três coisas: o toque no cabeçalho do artigo (atributo `.link`), a contagem de julgados desenhada **na margem** pelo gerenciador de layout (sem inserir caracteres, porque os grifos salvos são intervalos sobre o texto) e a entrelinha da preferência. O `LawReaderView` troca o cabeçalho e a barra antiga pela `BarraLeitor` e reúne tudo o que é raro no ⋯. O host injeta em `JurisPorArtigo` o resolvedor do texto oficial, que vem do acervo do JURIS.

**Tech Stack:** SwiftUI + AppKit (`NSTextView`) / UIKit (`UITextView`), CoreText; `swiftc` direto; Node 24 (suíte e catraca).

**Spec:** `docs/superpowers/specs/2026-09-25-redesenho-legis-juris-nativo-design.md` (§5 leitor; §8 entrega 2; §9 como provar). Base: branch `redesenho-nativo-1-base` (entrega 1, PR #143 ainda aberto). Esta entrega sai numa branch nova a partir dela.

## Global Constraints

- Português do Brasil com acentuação completa. Commits numa frase que diz o que mudou para a pessoa, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Leitor e gaveta **só com fonte primária**: nada de notas próprias, IA ou comentário de terceiros por padrão. As notas continuam acessíveis pelo ⋯ ("Minhas notas") e **nenhum dado é apagado** (spec §5).
- Barra do leitor com **no máximo 5 controles**: voltar · onde estou · Ler/Estudar · Aa · ⋯ (spec §5).
- Tipografia pela base (`DS.*`): código novo em `vendor/legis` **não** usa `.system(size:)`, hex nem `.white/.black`. A catraca (`scripts/verificar-design-nativo.mjs`) barra aumento e exige `--atualizar` quando a contagem desce.
- Texto de leitura: família e tamanho escolhidos pela pessoa. Os **padrões** passam a ser Spectral, 18 pt, entrelinha "Padrão" (7). A coluna tem no máximo ~680 pt.
- Nenhum estado persistente novo. As chaves `@AppStorage` existentes (`readerMode`, `readerFontFamily`, `readerFontSize`, `readerLineSpacing`, `markerColorHex`, `cleanReading`) mantêm nome e significado. Só mudam os valores padrão das duas de fonte.
- Mac e iPad são cópias divergentes: **toda edição em `vendor/legis` vale para as duas árvores**, e as duas compilam. O iPad compacto (`ehCompacto`) continua com o menu próprio da barra do sistema e ganha a gaveta em tela cheia.
- Cada tarefa fecha com os builds do Mac e do iPad, UM de cada vez. A entrega fecha instalada no Mac e no iPad.

## Onde este plano ajusta a spec (e por quê)

- **Artigo, não inciso.** A spec pede toque "no dispositivo". Os dados de `incidencia-verbetes.json` ligam julgado a **artigo**. Por isso a gaveta e o sinal são por artigo, e o toque é no cabeçalho "Art. N". Inventar uma ligação por inciso violaria o princípio "o acervo é o produto".
- **Sinal na margem.** A spec pede "um número pequeno ao lado". Inserir texto deslocaria os intervalos dos grifos salvos, então o número é desenhado na margem esquerda, alinhado ao cabeçalho, pelo `RoundedBackgroundLayoutManager`.
- **Texto oficial.** `VerbeteCitante` não traz o enunciado. O host injeta `JurisPorArtigo.textoOficial`, que lê o `enunciado` no `LibraryStore` do JURIS. Enquanto o acervo não tiver carregado, a gaveta mostra o título e "Abrir no JURIS". Não inventa texto.
- **Índice por ⌘J.** Nesta entrega o índice é o "Ir para artigo" já existente, que passa para ⌘J e para o ⋯. O índice estrutural (Título/Capítulo) não existe nos dados de hoje e fica fora do escopo.
- **Estudar** continua sendo o `ArticleStudyView` de hoje, com a barra própria abaixo da `BarraLeitor`. A migração dele é a entrega 6.

## Review Focus

1. **Norma sem nenhum julgado ligado** (lei nova, Novidades, lei não casada em `incidencia-verbetes.json`). Esperado: nenhum sinal na margem, o toque no cabeçalho não faz nada e nada quebra. Teste: Task 1 (`cabecalhos` + contagem vazia) e captura na Task 5.
2. **Cabeçalhos atípicos** ("Art. 1.045", "Art. 121-A", "Art. 5º", "Art 7", "Artigo 3", texto com "art. 5º" no meio do parágrafo). Esperado: só os cabeçalhos no início de linha contam, e a chave é a mesma do `JurisPorArtigo.numeroDe`. Teste: Task 1.
3. **Grifos salvos continuam no lugar** depois da mudança (o texto não pode ganhar nem perder caracteres). Esperado: os mesmos intervalos pintam os mesmos trechos. Teste: Task 1 ("cabeçalhos não alteram o texto") e captura com grifo na Task 5.
4. **Arrasto da gaveta em alturas extremas** (tela baixa em paisagem, arrasto pequeno ou gigante). Esperado: a gaveta só assume fechada, meia ou cheia, nunca fica no meio do caminho. Teste: Task 1 (`AlturaGaveta.apos`).
5. **Acervo do JURIS ainda não carregado** quando a gaveta abre. Esperado: título, tribunal e data aparecem, junto com "Abrir no JURIS", sem texto inventado e sem travar. Teste: Task 1 (resolvedor ausente devolve nil) e captura na Task 5.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `ios/vendor/design/LeitorLogica.swift` (novo) | `CabecalhoArtigo`, `LeitorLogica.cabecalhos(em:)`, `LeitorLogica.numero(de:)`, `LeitorLogica.trecho(de:em:)` e `AlturaGaveta`. Tudo puro, testável. |
| `ios/vendor/design/LeitorComponentes.swift` (novo) | `BarraLeitor` (5 slots fixos) e `GavetaContexto` (altura, abas, arrasto). |
| `tests/design-nativo/main.swift` | + testes da lógica do leitor. |
| `{mac,ios}/vendor/legis/JurisPorArtigo.swift` | `numeroDe` delega a `LeitorLogica.numero`; + `textoOficial` injetável; + `contagens(lei:)`. |
| `{mac,ios}/vendor/legis/RoundedBackgroundLayoutManager.swift` | Desenha a contagem na margem para o atributo `.catedraContagem`. |
| `{mac,ios}/vendor/legis/AnnotatedTextView.swift` | Toque no cabeçalho (`.link` `catedra-art:N`), contagem na margem, entrelinha da preferência e coluna de ~680 pt. |
| `{mac,ios}/vendor/legis/LawReaderView.swift` | `BarraLeitor` no lugar do cabeçalho e da barra antiga; ⋯ com o resto; ⌘J; paleta de grifo na seleção; gaveta. |
| `{mac,ios}/Sources/main.swift` | Injeta `JurisPorArtigo.textoOficial` a partir do `jurisStore`. |

---

### Task 0: Branch

- [ ] **Step 1**

```bash
cd /Users/lanab/catedra-plataforma-main/.claude/worktrees/redesenho-legis-juris
git checkout -b redesenho-nativo-2-leitor-legis && git branch --show-current
```
Expected: `redesenho-nativo-2-leitor-legis`

---

### Task 1: Lógica pura do leitor (na base, testada)

**Files:**
- Create: `ios/vendor/design/LeitorLogica.swift`
- Modify: `{mac,ios}/vendor/legis/JurisPorArtigo.swift` (`numeroDe` delega)
- Test: `tests/design-nativo/main.swift`

**Interfaces:**
- Produces:
  - `struct CabecalhoArtigo: Equatable { let rotulo: String; let numero: String; let intervalo: NSRange }`
  - `enum LeitorLogica { static func numero(de rotulo: String) -> String?; static func cabecalhos(em texto: String) -> [CabecalhoArtigo]; static func trecho(de c: CabecalhoArtigo, em texto: String, cabecalhos: [CabecalhoArtigo]) -> [String] }`
  - `enum AlturaGaveta: Equatable { case fechada, meia, cheia; func apos(arrasto dy: CGFloat) -> AlturaGaveta; func fracao(compacto: Bool) -> CGFloat }`

- [ ] **Step 1: Teste que falha.** Em `tests/design-nativo/main.swift`, antes de `// (Tasks 2 e 3 acrescentam blocos aqui, antes do fechamento.)`:

```swift
// ── Lógica do leitor (entrega 2) ────────────────────────────────────────────
confere(LeitorLogica.numero(de: "Art. 5º") == "5" && LeitorLogica.numero(de: "Art. 1.015") == "1015"
        && LeitorLogica.numero(de: "Art. 121-A") == "121-A" && LeitorLogica.numero(de: "sem número") == nil,
        "numero(de:) no mesmo formato do incidencia-verbetes.json")
let lei = """
TÍTULO II
Art. 5º Todos são iguais perante a lei, nos termos do art. 3º e seguintes:
I - homens e mulheres são iguais;
Art. 6º São direitos sociais a educação.
Art 7 texto sem ponto.
Art. 1.045 texto com milhar.
Art. 121-A texto com letra.
"""
let cabs = LeitorLogica.cabecalhos(em: lei)
confere(cabs.map(\.numero) == ["5", "6", "7", "1045", "121-A"],
        "cabeçalhos: só início de linha; 'art. 3º' no meio do parágrafo não conta")
let ns = lei as NSString
confere(cabs.allSatisfy { ns.substring(with: $0.intervalo) == $0.rotulo } && cabs.first?.rotulo == "Art. 5º",
        "intervalo de cada cabeçalho aponta exatamente para o rótulo no texto (o texto não muda)")
confere(LeitorLogica.trecho(de: cabs[0], em: lei, cabecalhos: cabs)
        == ["Art. 5º Todos são iguais perante a lei, nos termos do art. 3º e seguintes:", "I - homens e mulheres são iguais;"],
        "trecho do artigo vai até o próximo cabeçalho")
confere(LeitorLogica.trecho(de: cabs[4], em: lei, cabecalhos: cabs) == ["Art. 121-A texto com letra."],
        "trecho do último artigo vai até o fim")
confere(LeitorLogica.cabecalhos(em: "").isEmpty && LeitorLogica.cabecalhos(em: "Sem artigos aqui.").isEmpty,
        "texto sem artigos: nenhum cabeçalho")
confere(AlturaGaveta.fechada.apos(arrasto: -120) == .meia && AlturaGaveta.meia.apos(arrasto: -120) == .cheia
        && AlturaGaveta.cheia.apos(arrasto: -500) == .cheia, "arrastar para cima sobe um degrau (e para no topo)")
confere(AlturaGaveta.cheia.apos(arrasto: 120) == .meia && AlturaGaveta.meia.apos(arrasto: 120) == .fechada
        && AlturaGaveta.meia.apos(arrasto: 900) == .fechada, "arrastar para baixo desce um degrau (e fecha)")
confere(AlturaGaveta.meia.apos(arrasto: 30) == .meia && AlturaGaveta.meia.apos(arrasto: -30) == .meia,
        "arrasto pequeno (< 80 pt) não muda a altura")
confere(AlturaGaveta.meia.fracao(compacto: true) == 1 && AlturaGaveta.meia.fracao(compacto: false) == 0.5
        && AlturaGaveta.fechada.fracao(compacto: false) == 0, "no compacto a gaveta abre em tela cheia")

```

- [ ] **Step 2: Rodar e ver falhar.** `bash scripts/testar-design-nativo.sh`. Expected: "cannot find 'LeitorLogica' in scope".

- [ ] **Step 3: Implementar `ios/vendor/design/LeitorLogica.swift`**

```swift
import Foundation
import CoreGraphics

/// Cabeçalho "Art. N" no início de uma linha do texto da norma. `intervalo` aponta para o
/// RÓTULO no texto original — o leitor nunca insere nem remove caracteres, porque os grifos
/// salvos são intervalos sobre esse mesmo texto.
struct CabecalhoArtigo: Equatable {
    let rotulo: String
    let numero: String
    let intervalo: NSRange
}

/// Lógica pura do leitor de lei (base visual, testável sem tela).
enum LeitorLogica {
    /// "Art. 5º" / "Art. 1.015" / "Art. 121-A" → "5" / "1015" / "121-A" — o formato que
    /// scripts/build-incidencia.mjs grava em incidencia-verbetes.json (era JurisPorArtigo.numeroDe).
    static func numero(de rotulo: String) -> String? {
        let s = rotulo.replacingOccurrences(of: ".", with: "")
        guard let r = s.range(of: #"\d+(?:-[A-Za-z])?"#, options: .regularExpression) else { return nil }
        return String(s[r]).uppercased()
    }

    private static let regexCabecalho = try! NSRegularExpression(
        pattern: #"(?m)^Art\.?\s*\d[\d.]*(?:\s*[ºo°])?(?:\s*-\s*[A-Za-z](?![a-z]))?"#)

    static func cabecalhos(em texto: String) -> [CabecalhoArtigo] {
        let ns = texto as NSString
        return regexCabecalho.matches(in: texto, range: NSRange(location: 0, length: ns.length)).compactMap { m in
            let rotulo = ns.substring(with: m.range)
            guard let n = numero(de: rotulo) else { return nil }
            return CabecalhoArtigo(rotulo: rotulo, numero: n, intervalo: m.range)
        }
    }

    /// Linhas do artigo `c`: do cabeçalho até antes do próximo (ou o fim do texto).
    static func trecho(de c: CabecalhoArtigo, em texto: String, cabecalhos: [CabecalhoArtigo]) -> [String] {
        let ns = texto as NSString
        let inicio = c.intervalo.location
        let fim = cabecalhos.first { $0.intervalo.location > inicio }?.intervalo.location ?? ns.length
        return ns.substring(with: NSRange(location: inicio, length: fim - inicio))
            .components(separatedBy: "\n")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
    }
}

/// As três alturas da gaveta de contexto. Nunca fica no meio do caminho: um arrasto maior
/// que 80 pt sobe (dy < 0) ou desce (dy > 0) UM degrau.
enum AlturaGaveta: Equatable {
    case fechada, meia, cheia

    func apos(arrasto dy: CGFloat) -> AlturaGaveta {
        let limiar: CGFloat = 80
        if dy <= -limiar { return self == .fechada ? .meia : .cheia }
        if dy >= limiar { return self == .cheia ? .meia : .fechada }
        return self
    }

    /// Fração da altura disponível. No compacto (iPhone, Slide Over) abre direto cheia.
    func fracao(compacto: Bool) -> CGFloat {
        switch self {
        case .fechada: return 0
        case .meia:    return compacto ? 1 : 0.5
        case .cheia:   return 1
        }
    }
}
```

Atenção: a regex tem o sufixo de letra com `(?![a-z])` para que "Art 7 texto" não vire "7-t". Se o teste "cabeçalhos: só início de linha" falhar em "7", confira isso primeiro.

- [ ] **Step 4: `JurisPorArtigo.numeroDe` delega (nas duas árvores).** Substitua o corpo por:

```swift
    static func numeroDe(label: String) -> String? { LeitorLogica.numero(de: label) }
```

- [ ] **Step 5: Rodar e ver passar.** `bash scripts/testar-design-nativo.sh`. Expected: `base visual: tudo certo`.

- [ ] **Step 6: Builds (um de cada vez).** Rode `bash mac/build-app.sh` e depois `bash ios/build-ipad.sh`. Expected: nenhum `error:`.

- [ ] **Step 7: Commit**

```bash
git add ios/vendor/design/LeitorLogica.swift tests/design-nativo/main.swift mac/vendor/legis/JurisPorArtigo.swift ios/vendor/legis/JurisPorArtigo.swift
git commit -m "O leitor do LEGIS ganha a lógica que acha cada artigo no texto e a altura da gaveta de contexto, testadas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Componentes `BarraLeitor` e `GavetaContexto` (na base)

**Files:**
- Create: `ios/vendor/design/LeitorComponentes.swift`
- Test: `tests/design-nativo/main.swift` (compila e instancia)

**Interfaces:**
- Consumes: `DS.display/interface/mono`, `DSRaio`, `DSEspaco`, `DS.corTexto`, `AlturaGaveta`
- Produces:
  - `enum ModoLeitor: String { case ler = "corrido", estudar = "estudo" }` (os valores são os mesmos de `@AppStorage("readerMode")`)
  - `struct BarraLeitor<Aa: View, Mais: View>: View { init(ramo: String, corRamo: UInt32?, titulo: String, modo: Binding<ModoLeitor>?, aoVoltar: (() -> Void)?, @ViewBuilder aa: () -> Aa, @ViewBuilder mais: () -> Mais) }`
  - `struct GavetaContexto<Conteudo: View>: View { init(altura: Binding<AlturaGaveta>, titulo: String, subtitulo: String, abas: [String], aba: Binding<Int>, compacto: Bool, @ViewBuilder conteudo: () -> Conteudo) }`

- [ ] **Step 1: Teste que falha**

Acrescente, depois do bloco da Task 1:
```swift
var modoTeste = ModoLeitor.ler
let barra = BarraLeitor(ramo: "Constitucional", corRamo: Ramo.constitucional.identidade, titulo: "Constituição Federal",
                        modo: Binding(get: { modoTeste }, set: { modoTeste = $0 }), aoVoltar: {},
                        aa: { EmptyView() }, mais: { EmptyView() })
confere(ModoLeitor.ler.rawValue == "corrido" && ModoLeitor.estudar.rawValue == "estudo"
        && String(describing: type(of: barra)).hasPrefix("BarraLeitor"),
        "BarraLeitor existe e o modo usa os mesmos valores de readerMode")
var alturaTeste = AlturaGaveta.meia, abaTeste = 0
let gaveta = GavetaContexto(altura: Binding(get: { alturaTeste }, set: { alturaTeste = $0 }),
                            titulo: "Art. 5º", subtitulo: "3 julgados", abas: ["Jurisprudência", "Remissões"],
                            aba: Binding(get: { abaTeste }, set: { abaTeste = $0 }), compacto: false) { EmptyView() }
confere(String(describing: type(of: gaveta)).hasPrefix("GavetaContexto"), "GavetaContexto existe")
```

- [ ] **Step 2: Rodar e ver falhar.** Expected: "cannot find 'ModoLeitor' in scope".

- [ ] **Step 3: Implementar `ios/vendor/design/LeitorComponentes.swift`**

```swift
import SwiftUI

/// Os dois modos do leitor da norma. Os valores são os de `@AppStorage("readerMode")`, que já
/// existia ("corrido"/"estudo"): nada novo é persistido.
enum ModoLeitor: String { case ler = "corrido", estudar = "estudo" }

/// Barra do leitor (spec §5): no MÁXIMO 5 controles, por construção — voltar · onde estou ·
/// Ler/Estudar · Aa · ⋯. Tudo o que é raro vai para `mais`.
struct BarraLeitor<Aa: View, Mais: View>: View {
    let ramo: String
    let corRamo: UInt32?
    let titulo: String
    var modo: Binding<ModoLeitor>?
    var aoVoltar: (() -> Void)?
    @ViewBuilder var aa: () -> Aa
    @ViewBuilder var mais: () -> Mais

    var body: some View {
        HStack(spacing: DSEspaco.e3) {
            if let aoVoltar {
                Button(action: aoVoltar) { Image(systemName: "chevron.left").font(DS.interface(15, .semibold)) }
                    .buttonStyle(.plain).frame(minWidth: 44, minHeight: 44).contentShape(Rectangle())
                    .accessibilityLabel("Voltar")
            }
            VStack(alignment: .leading, spacing: 1) {
                if !ramo.isEmpty {
                    Text(ramo.uppercased()).font(DS.interface(11, .semibold)).tracking(0.8)
                        .foregroundStyle(corRamo.map { DS.corTexto($0) } ?? ThemeState.t.text3)
                        .lineLimit(1)
                }
                Text(titulo).font(DS.display(19, .bold)).foregroundStyle(ThemeState.t.ink).lineLimit(1)
            }
            Spacer(minLength: DSEspaco.e2)
            if let modo {
                Picker("Modo", selection: modo) {
                    Text("Ler").tag(ModoLeitor.ler)
                    Text("Estudar").tag(ModoLeitor.estudar)
                }
                .pickerStyle(.segmented).labelsHidden().frame(width: 170)
            }
            aa()
            mais()
        }
        .padding(.horizontal, DSEspaco.e4)
        .frame(minHeight: 56)
        .background(ThemeState.t.surface)
        .overlay(Rectangle().fill(ThemeState.t.border).frame(height: 1), alignment: .bottom)
    }
}

/// Gaveta de contexto que sobe de baixo (spec §5, opção C). Três alturas (`AlturaGaveta`),
/// arrasto pelo puxador, Esc fecha. Só FONTE PRIMÁRIA entra no conteúdo — quem monta decide.
struct GavetaContexto<Conteudo: View>: View {
    @Binding var altura: AlturaGaveta
    let titulo: String
    let subtitulo: String
    let abas: [String]
    @Binding var aba: Int
    let compacto: Bool
    @ViewBuilder var conteudo: () -> Conteudo
    @GestureState private var arrasto: CGFloat = 0

    var body: some View {
        GeometryReader { geo in
            let alvo = geo.size.height * altura.fracao(compacto: compacto)
            VStack(spacing: 0) {
                Capsule().fill(ThemeState.t.border).frame(width: 44, height: 5)
                    .padding(.top, DSEspaco.e2).padding(.bottom, DSEspaco.e3)
                    .frame(maxWidth: .infinity).frame(minHeight: 28).contentShape(Rectangle())
                    .gesture(DragGesture()
                        .updating($arrasto) { v, s, _ in s = v.translation.height }
                        .onEnded { v in altura = altura.apos(arrasto: v.translation.height) })
                    .accessibilityLabel("Puxador da gaveta")
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(subtitulo.uppercased()).font(DS.interface(11, .semibold)).tracking(0.8)
                            .foregroundStyle(ThemeState.t.text3)
                        Text(titulo).font(DS.display(19, .bold)).foregroundStyle(ThemeState.t.ink)
                    }
                    Spacer()
                    Button { altura = .fechada } label: { Image(systemName: "xmark").font(DS.interface(13, .semibold)) }
                        .buttonStyle(.plain).frame(minWidth: 44, minHeight: 44)
                        .keyboardShortcut(.escape, modifiers: [])
                        .accessibilityLabel("Fechar")
                }
                .padding(.horizontal, DSEspaco.e5)
                if abas.count > 1 {
                    Picker("Aba", selection: $aba) {
                        ForEach(abas.indices, id: \.self) { i in Text(abas[i]).tag(i) }
                    }
                    .pickerStyle(.segmented).labelsHidden()
                    .padding(.horizontal, DSEspaco.e5).padding(.vertical, DSEspaco.e3)
                }
                ScrollView { conteudo().padding(.horizontal, DSEspaco.e5).padding(.bottom, DSEspaco.e5) }
            }
            .frame(maxWidth: compacto ? .infinity : 760)
            .frame(height: max(0, alvo - arrasto))
            .background(
                UnevenRoundedRectangle(topLeadingRadius: DSRaio.hero, topTrailingRadius: DSRaio.hero)
                    .fill(ThemeState.t.surface)
                    .shadow(color: ThemeState.t.ink.opacity(0.18), radius: 20, y: -6)
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
            .animation(ThemeState.t.baixaEstimulacao ? nil : .spring(duration: 0.28), value: altura)
        }
        .allowsHitTesting(altura != .fechada)
    }
}
```

- [ ] **Step 4: Rodar e ver passar.** `bash scripts/testar-design-nativo.sh`. Expected: `base visual: tudo certo`.
- [ ] **Step 5: Builds (um de cada vez).** Mac, depois iPad, sem `error:`.
- [ ] **Step 6: Commit** (`ios/vendor/design/LeitorComponentes.swift tests/design-nativo/main.swift`). Mensagem: "O leitor ganha a barra enxuta e a gaveta de contexto como componentes da base visual".

---

### Task 3: Leitor corrido — toque no artigo, contagem na margem e entrelinha

**Files:**
- Modify: `{mac,ios}/vendor/legis/RoundedBackgroundLayoutManager.swift`
- Modify: `{mac,ios}/vendor/legis/AnnotatedTextView.swift`
- Modify: `{mac,ios}/vendor/legis/JurisPorArtigo.swift` (`contagens(lei:)`, `textoOficial`)

**Interfaces:**
- Consumes: `LeitorLogica.cabecalhos(em:)`, `CabecalhoArtigo`, `DS.mono`, `DSCor`
- Produces:
  - `extension NSAttributedString.Key { static let catedraContagem: NSAttributedString.Key }` (valor `Int`)
  - `AnnotatedTextView` ganha `contagens: [String: Int] = [:]`, `entrelinha: Double = 7`, `onToqueArtigo: (CabecalhoArtigo) -> Void = { _ in }`
  - `JurisPorArtigo.contagens(lei: LawEntry) -> [String: Int]`; `static var textoOficial: (String) -> String? = { _ in nil }`

- [ ] **Step 1: `JurisPorArtigo` (duas árvores).** Acrescente em `enum JurisPorArtigo`:

```swift
    /// Número do artigo → quantos verbetes o citam, para o sinal na margem do leitor.
    static func contagens(lei: LawEntry) -> [String: Int] {
        carregar()
        let alvo = norm(lei.title)
        guard let d = diplomas.values.first(where: { norm($0.nome) == alvo }) else { return [:] }
        return d.artigos.mapValues(\.count).filter { $0.value > 0 }
    }

    /// Texto OFICIAL do verbete (enunciado/tese do tribunal), lido do acervo do JURIS pelo
    /// host (main.swift injeta). Sem host ou acervo ainda não carregado: nil — a gaveta
    /// mostra o título e "Abrir no JURIS", nunca um texto inventado.
    static var textoOficial: (String) -> String? = { _ in nil }
```

- [ ] **Step 2: Contagem na margem (duas árvores).** Em `RoundedBackgroundLayoutManager.swift`, antes da classe:

```swift
extension NSAttributedString.Key {
    /// Quantidade de julgados ligados ao artigo cujo cabeçalho carrega este atributo. O
    /// número é DESENHADO na margem esquerda — nunca inserido no texto, que é a base dos grifos.
    static let catedraContagem = NSAttributedString.Key("catedraContagem")
}
```

E, dentro da classe, sobrescreva `drawGlyphs(forGlyphRange:at:)`. **Mac:**

```swift
    override func drawGlyphs(forGlyphRange glyphsToShow: NSRange, at origin: NSPoint) {
        super.drawGlyphs(forGlyphRange: glyphsToShow, at: origin)
        guard let storage = textStorage, let container = textContainers.first else { return }
        let chars = characterRange(forGlyphRange: glyphsToShow, actualGlyphRange: nil)
        storage.enumerateAttribute(.catedraContagem, in: chars) { valor, faixa, _ in
            guard let n = valor as? Int, n > 0 else { return }
            let glifo = glyphIndexForCharacter(at: faixa.location)
            let linha = lineFragmentRect(forGlyphAt: glifo, effectiveRange: nil)
            let fonte = NSFont(name: "JetBrains Mono", size: 11) ?? .monospacedDigitSystemFont(ofSize: 11, weight: .medium)
            let cor = NSColor(Color(hex: DSCor.texto(identidade: DSCor.sinalMargem,
                                                     superficie: ThemeState.t.surfaceHex, escuro: ThemeState.t.isDark)))
            let rotulo = NSAttributedString(string: "\(n)", attributes: [.font: fonte, .foregroundColor: cor])
            let tam = rotulo.size()
            let x = origin.x - tam.width - 14
            let y = origin.y + linha.minY + (linha.height - tam.height) / 2
            _ = container
            rotulo.draw(at: NSPoint(x: max(4, x), y: y))
        }
    }
```

**iPad:** o mesmo corpo, com `UIFont(name: "JetBrains Mono", size: 11) ?? .monospacedDigitSystemFont(ofSize: 11, weight: .medium)`, `UIColor(...)` e `CGPoint`. Antes, acrescente a `DSCor` (em `ios/vendor/design/Cor.swift`) `static let sinalMargem: UInt32 = 0x6F695F`, o `text3` da Planilha, que é passado por `DSCor.texto`. Assim a cor fica legível em qualquer tema e nenhum hex entra em `vendor/legis`.

- [ ] **Step 3: `AnnotatedTextView` (duas árvores).**
  - Novos parâmetros: `var contagens: [String: Int] = [:]`, `var entrelinha: Double = 7`, `var onToqueArtigo: (CabecalhoArtigo) -> Void = { _ in }`.
  - `fontKey` passa a incluir a entrelinha e um hash das contagens: `"\(fontFamily)|\(fontSize)|\(textAlignment.rawValue)|\(entrelinha)|\(contagens.count)"`.
  - Em `applyFullText`: `paragraphStyle.lineSpacing = CGFloat(entrelinha)` (antes era 7 fixo) e `paragraphSpacing = max(12, CGFloat(entrelinha) + 9)`. Depois de montar `attributed`, marque os cabeçalhos:

```swift
        let cabs = LeitorLogica.cabecalhos(em: text)
        coordinator.cabecalhos = cabs
        for c in cabs {
            guard let n = contagens[c.numero], n > 0 else { continue }
            attributed.addAttribute(.catedraContagem, value: n, range: c.intervalo)
            attributed.addAttribute(.link, value: "catedra-art:\(c.numero)", range: c.intervalo)
        }
```
  - Coluna: `let hInset = max(56, (width - 680) / 2)` (antes 760 e 40). A margem mínima de 56 pt é a que abriga o número.
  - Aparência do link, neutra (sem azul nem sublinhado): Mac `textView.linkTextAttributes = [.foregroundColor: NSColor(AppTheme.ink), .cursor: NSCursor.pointingHand]`; iPad `textView.linkTextAttributes = [.foregroundColor: UIColor(AppTheme.ink)]`.
  - Toque. Mac, no `Coordinator: NSTextViewDelegate`:
```swift
        func textView(_ textView: NSTextView, clickedOnLink link: Any, at charIndex: Int) -> Bool {
            guard let s = link as? String, s.hasPrefix("catedra-art:"),
                  let c = cabecalhos.first(where: { NSLocationInRange(charIndex, $0.intervalo) }) else { return false }
            parent.onToqueArtigo(c)
            return true
        }
```
    iPad, no `Coordinator: UITextViewDelegate`:
```swift
        func textView(_ textView: UITextView, primaryActionFor textItem: UITextItem, defaultAction: UIAction) -> UIAction? {
            guard case .link(let url) = textItem.content, url.scheme == "catedra-art",
                  let c = cabecalhos.first(where: { NSLocationInRange(textItem.range.location, $0.intervalo) }) else { return defaultAction }
            return UIAction { [weak self] _ in self?.parent.onToqueArtigo(c) }
        }
```
    Em ambos, `var cabecalhos: [CabecalhoArtigo] = []` no Coordinator. No iPad o valor do `.link` precisa ser `URL(string: "catedra-art:\(c.numero)")!`, porque o UIKit só entrega `URL`. Use `URL` nas duas árvores e, no Mac, compare `(link as? URL)?.scheme == "catedra-art"`.

- [ ] **Step 4: Builds (um de cada vez) e catraca.** Rode os builds do Mac e do iPad e depois `node scripts/verificar-design-nativo.mjs`. Expected: sem `error:`, e a catraca sem aumento. Se a contagem **desceu**, rode `--atualizar`. Se **subiu**, algum código novo usou `.system(size:)` ou uma cor fixa: troque por `DS.*`/`DSCor`.

- [ ] **Step 5: Commit** (todos os arquivos tocados; a base também, se `DSCor` mudou). Mensagem: "Na leitura da lei, o cabeçalho de cada artigo com jurisprudência mostra na margem quantos julgados o citam e abre com um toque; a entrelinha escolhida passa a valer".

---

### Task 4: `LawReaderView` com a `BarraLeitor`, o ⋯ e a gaveta

**Files:**
- Modify: `{mac,ios}/vendor/legis/LawReaderView.swift`
- Modify: `{mac,ios}/Sources/main.swift` (resolvedor do texto oficial)

**Interfaces:**
- Consumes: `BarraLeitor`, `GavetaContexto`, `AlturaGaveta`, `ModoLeitor`, `LeitorLogica`, `JurisPorArtigo.contagens/verbetes/textoOficial/abrirNoJuris`, `LegislativeNote.parse(from:)`, `RemissoesView`, `AnnotatedTextView(contagens:entrelinha:onToqueArtigo:)`

- [ ] **Step 1: Estado novo (só de tela, nada persistido).**

```swift
    @AppStorage("readerLineSpacing") private var entrelinha = 7.0
    @State private var gaveta: AlturaGaveta = .fechada
    @State private var abaGaveta = 0
    @State private var artigoAberto: CabecalhoArtigo?
    @State private var mostrarIrPara = false
```
  Troque os padrões `@AppStorage("readerFontSize") … = 16.0` por `18.0` e `@AppStorage("readerFontFamily") … = "Sistema (Serifa)"` por `"Spectral"`. Isso só vale para quem nunca escolheu; quem escolheu mantém.
  Acrescente `"Spectral"` à lista de famílias do `FontPickerView` (em `AnnotationsPanel.swift`, duas árvores), se ela não estiver lá.

- [ ] **Step 2: Cabeçalho e barra.**
  - Apague o uso de `header(for:)` em `reader(for:)` (o `if !cleanReading { header(for: law); Divider() }`). As funções `header`/`headerControls` ficam sem chamada: apague-as também. A situação da norma (verificada/alterada/monitoramento/falhas) passa a ser uma seção de texto no topo do ⋯ (Step 3).
  - Troque `.safeAreaInset(edge: .top, spacing: 0) { readerBar }` por (iPad: dentro de `if !ehCompacto`):

```swift
        .safeAreaInset(edge: .top, spacing: 0) {
            if cleanReading {
                HStack { Button { cleanReading = false } label: { Label("Sair da imersão", systemImage: "arrow.down.right.and.arrow.up.left") }
                    .keyboardShortcut("i", modifiers: [.command, .shift]); Spacer() }
                    .padding(.horizontal, DSEspaco.e4).frame(minHeight: 44).background(ThemeState.t.surface)
            } else if let law {
                BarraLeitor(ramo: law.customCategory ?? law.category.rawValue,
                            corRamo: law.category.ramo?.identidade,
                            titulo: law.title,
                            modo: isNovidades ? nil : Binding(get: { ModoLeitor(rawValue: readerMode) ?? .ler },
                                                             set: { readerMode = $0.rawValue }),
                            aoVoltar: nil,
                            aa: { tipografiaMenu }, mais: { maisMenu })
            }
        }
```
  `aoVoltar: nil`: a volta à lista já existe na navegação (NavigationStack) do `ContentView`, e a barra não duplica o botão.
  - Apague `readerBar`, `barraCompleta`, `modoPicker`, `favoritarBotao`, `anotacoesBotao` e `barraDoEstudoVisivel`. Tudo o que eles faziam vai para o ⋯ (Step 3) ou para a seleção (Step 5).

- [ ] **Step 3: ⋯ com o que é raro.** No começo do `Menu` de `maisMenu`, acrescente (nesta ordem):

```swift
                Section("Situação") {
                    if let f = law.lastFetched { Text("Verificada \(f.formatted(date: .abbreviated, time: .shortened))") }
                    if let c = law.lastChanged { Text("Alterada \(c.formatted(date: .abbreviated, time: .omitted))") }
                    if (law.checkFailures ?? 0) >= 3 { Text("Verificação falhando há \(law.checkFailures ?? 0) tentativas") }
                }
                if effectiveMode == "corrido" && !isNovidades {
                    Button { mostrarIrPara = true } label: { Label("Ir para artigo…", systemImage: "number") }
                        .keyboardShortcut("j", modifiers: .command)
                    Button { controller.showFindBar() } label: { Label("Buscar no texto", systemImage: "magnifyingglass") }
                        .keyboardShortcut("f", modifiers: .command)
                    Menu { /* os 5 botões de alinhamento que estavam em barraCompleta, sem mudança */ } label: {
                        Label("Alinhamento", systemImage: "text.alignleft")
                    }
                }
                if law.isRegularLaw {
                    Button { store.toggleFavorite(law.id) } label: {
                        Label(law.favorite == true ? "Remover dos favoritos" : "Favoritar", systemImage: law.favorite == true ? "star.fill" : "star")
                    }
                }
                Button { showInspector.toggle() } label: { Label("Minhas notas", systemImage: "note.text") }
                Button { cleanReading = true } label: { Label("Imersão", systemImage: "book.closed") }
                    .keyboardShortcut("i", modifiers: [.command, .shift])
                Divider()
```
  O restante do `maisMenu` (Histórico, Jurisprudência vinculada, Monitorar, Atualizar, Abrir fonte, Mover, Excluir) fica como está. A label do botão do menu vira `Image(systemName: "ellipsis.circle").font(DS.interface(17))` com `.accessibilityLabel("Mais")` e alvo `frame(minWidth: 44, minHeight: 44)`.
  `mostrarIrPara` abre um `.popover` (Mac) ou `.sheet` com `.presentationDetents([.height(160)])` (iPad) contendo o `TextField("Número do artigo", text: $articleQuery)` com `.onSubmit { controller.jump(toArticle: articleQuery); mostrarIrPara = false }`.

- [ ] **Step 4: Leitor corrido com contagens e gaveta.** Em `reader(for:)`, troque a chamada de `AnnotatedTextView(...)` por:

```swift
                    ZStack(alignment: .bottom) {
                        AnnotatedTextView(text: text,
                                          annotations: store.annotations(for: lawID),
                                          fontFamily: fontFamily, fontSize: fontSize,
                                          controller: controller,
                                          focusedAnnotationID: $focusedAnnotationID,
                                          onCommand: handle,
                                          textAlignment: store.alinhamentoNS(lawID: lawID, unitKey: "full"),
                                          contagens: isNovidades ? [:] : JurisPorArtigo.contagens(lei: law),
                                          entrelinha: entrelinha,
                                          onToqueArtigo: { c in artigoAberto = c; abaGaveta = 0; gaveta = .meia })
                        if controller.selectionLength > 0 { paletaSelecao.padding(.bottom, DSEspaco.e5) }
                        if let c = artigoAberto {
                            GavetaContexto(altura: $gaveta, titulo: c.rotulo,
                                           subtitulo: "\(JurisPorArtigo.verbetes(lei: law, label: c.rotulo).count) julgados",
                                           abas: ["Jurisprudência", "Remissões"], aba: $abaGaveta,
                                           compacto: ehCompactoOuFalso) {
                                conteudoGaveta(law: law, artigo: c, texto: text)
                            }
                        }
                    }
```
  `ehCompactoOuFalso` é `ehCompacto` no iPad e `false` no Mac: declare no Mac `private let ehCompactoOuFalso = false`, e no iPad `private var ehCompactoOuFalso: Bool { ehCompacto }`.

  E a função:

```swift
    @ViewBuilder
    private func conteudoGaveta(law: LawEntry, artigo c: CabecalhoArtigo, texto: String) -> some View {
        if abaGaveta == 0 {
            let vs = JurisPorArtigo.verbetes(lei: law, label: c.rotulo)
            if vs.isEmpty {
                Text("Nenhum julgado do acervo cita este artigo.").font(DS.interface(15)).foregroundStyle(ThemeState.t.text2)
            }
            VStack(alignment: .leading, spacing: DSEspaco.e3) {
                ForEach(vs) { v in
                    VStack(alignment: .leading, spacing: DSEspaco.e2) {
                        HStack(spacing: DSEspaco.e2) {
                            Text(v.trib).font(DS.interface(11, .bold))
                                .padding(.horizontal, 7).padding(.vertical, 2)
                                .background(Capsule().fill((CorTribunal.identidade(v.trib).map { Color(hex: $0) } ?? ThemeState.t.accent).opacity(0.16)))
                                .foregroundStyle(CorTribunal.identidade(v.trib).map { DS.corTexto($0) } ?? ThemeState.t.accent)
                            Text(v.t).font(DS.interface(14, .semibold)).foregroundStyle(ThemeState.t.ink)
                        }
                        if let oficial = JurisPorArtigo.textoOficial(v.id) {
                            Text(oficial).font(DS.display(16, .regular)).foregroundStyle(ThemeState.t.ink)
                                .lineSpacing(3).textSelection(.enabled)
                        }
                        HStack {
                            Text([v.ramo, v.data].filter { !$0.isEmpty }.joined(separator: " · "))
                                .font(DS.mono(11)).foregroundStyle(ThemeState.t.text3)
                            Spacer()
                            Button("Abrir no JURIS") { JurisPorArtigo.abrirNoJuris(v.id) }
                                .font(DS.interface(13, .semibold)).frame(minHeight: 44)
                        }
                    }
                    .padding(DSEspaco.e4)
                    .background(RoundedRectangle(cornerRadius: DSRaio.card).strokeBorder(ThemeState.t.border))
                }
            }
        } else {
            let notas = LegislativeNote.parse(from: LeitorLogica.trecho(de: c, em: texto, cabecalhos: LeitorLogica.cabecalhos(em: texto)))
            if notas.isEmpty {
                Text("Nenhuma remissão no texto deste artigo.").font(DS.interface(15)).foregroundStyle(ThemeState.t.text2)
            } else {
                RemissoesView(notes: notas,
                              resolve: { note in
                                  guard let id = store.findLaw(refType: note.refType, refNumber: note.refNumber)?.id,
                                        id != lawID else { return nil }
                                  return id
                              },
                              onOpen: onOpenLaw, embedded: true)
            }
        }
    }
```

- [ ] **Step 5: Paleta de grifo na seleção** (substitui o menu "Marcar" que saiu da barra):

```swift
    private var paletaSelecao: some View {
        HStack(spacing: DSEspaco.e2) {
            ForEach(store.coresFavoritas.prefix(5), id: \.self) { hex in
                Button { markerColorHex = hex; handle(.apply(.highlight)) } label: {
                    Circle().fill(Color(hexRGBA: hex)).frame(width: 22, height: 22)
                        .overlay(Circle().strokeBorder(ThemeState.t.ink.opacity(markerColorHex == hex ? 0.6 : 0.15), lineWidth: 2))
                }
                .buttonStyle(.plain).frame(minWidth: 44, minHeight: 44).accessibilityLabel("Grifar com a cor \(hex)")
            }
            ColorPicker("", selection: Binding(get: { Color(hexRGBA: markerColorHex) }, set: { markerColorHex = $0.hexRGBA }))
                .labelsHidden().frame(minWidth: 44, minHeight: 44)
            Divider().frame(height: 22)
            Button { handle(.apply(.underline)) } label: { Image(systemName: "underline") }.frame(minWidth: 44, minHeight: 44)
            Button { handle(.annotate) } label: { Image(systemName: "note.text.badge.plus") }.frame(minWidth: 44, minHeight: 44)
                .accessibilityLabel("Anotar")
            Button(role: .destructive) { handle(.removeInSelection) } label: { Image(systemName: "eraser") }
                .frame(minWidth: 44, minHeight: 44).accessibilityLabel("Apagar marcação")
        }
        .buttonStyle(.plain)
        .font(DS.interface(15))
        .padding(.horizontal, DSEspaco.e3)
        .background(Capsule().fill(ThemeState.t.surface).shadow(color: ThemeState.t.ink.opacity(0.16), radius: 12, y: 4))
        .overlay(Capsule().strokeBorder(ThemeState.t.border))
    }
```

- [ ] **Step 6: Resolvedor do texto oficial (duas árvores de `main.swift`).** Logo depois de `DSFontes.registrar()`:

```swift
        // Gaveta do leitor do LEGIS: texto OFICIAL do verbete lido do acervo do JURIS.
        JurisPorArtigo.textoOficial = { [weak self] id in
            self?.jurisStore?.entries.first { $0.id == id }?.enunciado
        }
```
  No iPad, o `self` do `didFinishLaunching` é o `AppDelegate`, e o `jurisStore` mora no `SceneDelegate`/controlador (`ios/Sources/main.swift:49`). Coloque o bloco onde o `jurisStore` é criado (perto de `:305` e `:327`), capturando o dono dele com `[weak self]`.

- [ ] **Step 7: iPad compacto.** O `maisMenuCompacto` ganha "Ir para artigo…" (já existe no rodapé), "Minhas notas" e "Imersão". A gaveta aparece com `compacto: true`, ou seja, em tela cheia. Não mude mais nada do caminho compacto.

- [ ] **Step 8: Builds (um de cada vez), catraca e suíte do design.** Rode `bash mac/build-app.sh`, depois `bash ios/build-ipad.sh`, depois `node scripts/verificar-design-nativo.mjs` (rode `--atualizar` se desceu) e `node tests/design-nativo.mjs`. Expected: sem `error:` e DN1–DN6 `✓`.

- [ ] **Step 9: Commit** (duas árvores + main.swift + base/catraca se mudaram). Mensagem: "A leitura da lei no LEGIS fica em foco: barra com cinco controles, grifo na seleção e gaveta com a jurisprudência oficial e as remissões de cada artigo".

---

### Task 5: Suíte, capturas, instalação e PR

- [ ] **Step 1: Suítes.** `CT_CHROME=… npm test` e depois `npm run test:webkit`. Expected: as duas verdes.
- [ ] **Step 2: Capturas do simulador** (`-abaLegis`, abrindo a CF em "Ler"). Use o controle do Simulador: tocar numa norma, trocar para Ler, tocar no cabeçalho do art. 5º. Capture:
  - (a) o leitor com o número na margem;
  - (b) a gaveta aberta na aba Jurisprudência;
  - (c) a aba Remissões;
  - (d) um trecho grifado antes e depois (os grifos continuam no lugar);
  - (e) uma norma sem julgados (sem número na margem).

  **Olhe cada captura.** Confira que a barra tem no máximo 5 controles.
- [ ] **Step 3: Mac.** Instale (`ditto --norsrc --noextattr --noacl`), abra o LEGIS pelo menu Visualizar e capture o mesmo leitor e a mesma gaveta.
- [ ] **Step 4: iPad da dona.** `bash ios/build-ipad.sh device` e `xcrun devicectl device install app --device 00008103-000148403AE3401E "ios/build/Cátedra.app"`. O perfil `ios/embedded.mobileprovision` precisa existir no worktree (copiado da pasta principal).
- [ ] **Step 5: Push e PR** com base `redesenho-nativo-1-base` (`gh pr create --base redesenho-nativo-1-base`), título "Leitura da lei no LEGIS em foco, com gaveta de jurisprudência e remissões (entrega 2)". O corpo segue o modelo do PR #143 (o que muda para a pessoa, por dentro, testes, conferido na tela, decisões).
- [ ] **Step 6: Relatório à dona.** Arquivos, testes novos, pendências e decisões.
